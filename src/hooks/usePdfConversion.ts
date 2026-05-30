import { useState, useCallback, useRef } from 'react';
import type { PdfConversionState, MobileContent, PdfStyles } from '../types';
import { extractPdfText } from '../services/pdfExtractor';
import { reformatWithDeepSeek } from '../services/deepseekApi';
import { reformatWithOpenRouter } from '../services/openRouterApi';
import { generatePdf } from '../services/pdfGenerator';
import { interpretChatInstruction } from '../services/chatInterpreter';
import { DEFAULT_PDF_STYLES } from '../templates/mobilePdfTemplate';
import { searchWeb, detectSearchIntent, formatSearchContext } from '../services/webSearch';
import { isPrimaryAICircuitOpen, recordPrimaryAIFailure } from '../services/circuitBreaker';

/**
 * Hook principal que orquesta el pipeline completo de conversión:
 * PDF → extract text → AI reformat → generate mobile PDF
 *
 * Máquina de estados: idle → extracting → reformatting → generating → done
 * En cualquier paso puede transicionar a: → error
 *
 * Fallback chain en reformatting: DeepSeek V3 → OpenRouter :free
 *
 * También expone regeneratePdf() para regenerar el PDF con contenido
 * y estilos editados sin volver a llamar a la IA.
 */
export function usePdfConversion() {
  const [state, setState] = useState<PdfConversionState>({ step: 'idle' });
  const [mobileContent, setMobileContent] = useState<MobileContent | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfStyles, setPdfStyles] = useState<PdfStyles>({ ...DEFAULT_PDF_STYLES });
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Ref para acceder al contenido actual sin dependencias de closure (evita stale closure en regeneratePdf)
  const contentRef = useRef<MobileContent | null>(null);
  const stylesRef = useRef<PdfStyles>(DEFAULT_PDF_STYLES);

  /**
   * Setter para que el editor pueda actualizar el contenido paso a paso.
   * También actualiza la ref interna para regeneratePdf.
   */
  const updateContent = useCallback((content: MobileContent) => {
    contentRef.current = content;
    setMobileContent(content);
  }, []);

  /**
   * Setter para que el editor de estilos pueda actualizar los estilos.
   */
  const updateStyles = useCallback((styles: PdfStyles) => {
    stylesRef.current = styles;
    setPdfStyles(styles);
  }, []);

  const startConversion = useCallback(async (file: File) => {
    // --- RESET ---
    setState({ step: 'extracting' });
    setMobileContent(null);
    setPdfBlob(null);
    setPdfStyles({ ...DEFAULT_PDF_STYLES });
    contentRef.current = null;
    stylesRef.current = { ...DEFAULT_PDF_STYLES };

    let extractedText = '';

    // ================================================================
    // STEP 1: EXTRACCIÓN
    // ================================================================
    try {
      extractedText = await extractPdfText(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al extraer texto del PDF';
      setState({ step: 'error', error: message, errorStep: 'extract' });
      return;
    }

    // ================================================================
    // STEP 2: REFORMATEO CON IA (con rate limiting + fallback)
    // ================================================================
    setState({ step: 'reformatting' });

    let reformattedContent: MobileContent;

    try {
      // ── Circuit breaker: saltar DeepSeek si está en cooldown ──
      if (isPrimaryAICircuitOpen()) {
        console.log('[usePdfConversion] Circuit breaker abierto — usando OpenRouter directamente');
        reformattedContent = await reformatWithOpenRouter(extractedText);
      } else {
        try {
          // Intentar con DeepSeek V3 primero
          reformattedContent = await reformatWithDeepSeek(extractedText);
        } catch (dsErr) {
          recordPrimaryAIFailure();
          console.warn('[usePdfConversion] DeepSeek falló, intentando OpenRouter fallback...', dsErr);
          // Fallback automático a OpenRouter
          reformattedContent = await reformatWithOpenRouter(extractedText);
        }
      }

      contentRef.current = reformattedContent;
      setMobileContent(reformattedContent);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al reformatear con IA. Revisa tus API keys.';
      setState({ step: 'error', error: message, errorStep: 'reformat' });
      return;
    }

    // ================================================================
    // STEP 3: GENERACIÓN PDF
    // ================================================================
    setState(prev => ({ step: 'generating', rateLimitWaitMs: prev.rateLimitWaitMs }));

    try {
      const blob = await generatePdf(reformattedContent, stylesRef.current);
      setPdfBlob(blob);
      setState({ step: 'done' });

    } catch (err) {
      console.error('[usePdfConversion] Error en generación:', err);
      const message = err instanceof Error ? err.message : 'Error al generar el PDF';
      setState({ step: 'error', error: message, errorStep: 'generate' });
    }
  }, []);

  /**
   * Regenera el PDF usando el MobileContent y PdfStyles actuales (refs).
   * No vuelve a llamar a la IA — usa los datos ya extraídos y editados.
   * Transiciona brevemente a 'generating' → 'done'.
   */
  const regeneratePdf = useCallback(async () => {
    const currentContent = contentRef.current;
    if (!currentContent) return;

    setState(prev => ({ step: 'generating', rateLimitWaitMs: prev.rateLimitWaitMs }));

    try {
      const blob = await generatePdf(currentContent, stylesRef.current);
      setPdfBlob(blob);
      setState({ step: 'done' });
    } catch (err) {
      console.error('[usePdfConversion] Error al regenerar PDF:', err);
      const message = err instanceof Error ? err.message : 'Error al regenerar el PDF';
      setState({ step: 'error', error: message, errorStep: 'generate' });
    }
  }, []);

  /**
   * Interpreta una instrucción de chat en lenguaje natural y aplica
   * los cambios al contenido y estilos. Después regenera el PDF automáticamente.
   */
  const applyChatChanges = useCallback(async (userMessage: string): Promise<string> => {
    const currentContent = contentRef.current;
    if (!currentContent) {
      setChatError('No hay contenido que editar. Sube un PDF primero.');
      return 'No hay contenido que editar. Sube un PDF primero.';
    }

    setIsProcessing(true);
    setChatError(null);

    try {
      // ── Detectar intención de búsqueda web ──────────────────
      let searchContext: string | undefined;
      const searchQuery = detectSearchIntent(userMessage);

      if (searchQuery) {
        console.log('[usePdfConversion] Detectada intención de búsqueda:', searchQuery);
        const results = await searchWeb(searchQuery, 5);
        if (results.length > 0) {
          searchContext = formatSearchContext(results);
          console.log('[usePdfConversion] Resultados web obtenidos:', results.length);
        } else {
          console.log('[usePdfConversion] Sin resultados web (o API key no configurada)');
        }
      }

      const result = await interpretChatInstruction(
        userMessage,
        currentContent,
        stylesRef.current,
        searchContext,
      );

      contentRef.current = result.content;
      setMobileContent(result.content);

      stylesRef.current = result.styles;
      setPdfStyles(result.styles);

      setState(prev => ({ step: 'generating', rateLimitWaitMs: prev.rateLimitWaitMs }));

      try {
        const blob = await generatePdf(result.content, result.styles);
        setPdfBlob(blob);
        setState({ step: 'done' });

        // ── Mensaje enriquecido si se usó búsqueda ────────────
        if (searchContext) {
          return `${result.message}\n\n🔍 Se consultó la web para inspirar el diseño.`;
        }
        return result.message;
      } catch (pdfErr) {
        console.error('[usePdfConversion] Error al regenerar PDF tras chat:', pdfErr);
        const msg = pdfErr instanceof Error ? pdfErr.message : 'Error al regenerar el PDF';
        setState({ step: 'error', error: msg, errorStep: 'generate' });
        setChatError(msg);
        return `Cambios aplicados, pero falló la regeneración del PDF: ${msg}`;
      }
    } catch (err) {
      console.error('[usePdfConversion] Error en applyChatChanges:', err);
      const msg = err instanceof Error ? err.message : 'Error al interpretar la instrucción';
      setChatError(msg);
      setIsProcessing(false);
      setState(prev => prev.step === 'generating' ? { step: 'done' } : prev);
      return `Error: ${msg}`;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ step: 'idle' });
    setMobileContent(null);
    setPdfBlob(null);
    setPdfStyles({ ...DEFAULT_PDF_STYLES });
    setIsProcessing(false);
    setChatError(null);
    contentRef.current = null;
    stylesRef.current = { ...DEFAULT_PDF_STYLES };
  }, []);

  return {
    state,
    mobileContent,
    pdfBlob,
    pdfStyles,
    isProcessing,
    chatError,
    startConversion,
    regeneratePdf,
    applyChatChanges,
    setMobileContent: updateContent,
    setStyles: updateStyles,
    reset,
  };
}

export default usePdfConversion;
