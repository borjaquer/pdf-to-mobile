import { useState, useCallback, useRef } from 'react';
import { useLoading } from '../context/LoadingContext';
import type { PdfConversionState, MobileContent, PdfStyles, ChatMessage } from '../types';
import { extractPdfText } from '../services/pdfExtractor';
import { reformatWithDeepSeek } from '../services/deepseekApi';
import { reformatWithOpenRouter } from '../services/openRouterApi';
import { generatePdf } from '../services/pdfGenerator';
import { interpretChatInstruction } from '../services/chatInterpreter';
import { DEFAULT_PDF_STYLES } from '../utils/defaultPdfStyles';
import { isPrimaryAICircuitOpen, recordPrimaryAIFailure } from '../services/circuitBreaker';
import type { TokenSelection } from '../prompts/designTokens';

/**
 * Tokens de diseño iniciales. Se aplican sobre DEFAULT_PDF_STYLES
 * para derivar los estilos visuales por defecto.
 *
 * navy_gold + classic_editorial = premium por defecto, coherente
 * con el diseño "agency-grade" que ya usamos.
 */
const INITIAL_TOKENS: TokenSelection = {
  paletteId: 'navy_gold',
  typographyId: 'classic_editorial',
};

/**
 * Hook principal que orquesta el pipeline completo de conversión:
 * PDF → extract text → AI reformat → generate mobile PDF
 *
 * Máquina de estados: idle → extracting → reformatting → generating → done
 * En cualquier paso puede transicionar a: → error
 *
 * Fallback chain en reformatting: DeepSeek V3 → OpenRouter :free
 *
 * Chat de diseño: sistema UNIFICADO de edición — el LLM recibe
 * el estado completo (content + designTokens) y devuelve el estado
 * completo modificado según la instrucción del usuario.
 * Solo cambia lo que el usuario pide; el resto se mantiene inmutable.
 */
export function usePdfConversion() {
  const [state, setState] = useState<PdfConversionState>({ step: 'idle' });
  const [mobileContent, setMobileContent] = useState<MobileContent | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfStyles, setPdfStyles] = useState<PdfStyles>({ ...DEFAULT_PDF_STYLES });
  const [designTokens, setDesignTokens] = useState<TokenSelection>({ ...INITIAL_TOKENS });
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [agentDataMissing, setAgentDataMissing] = useState(false);

  // LoadingContext — al nivel superior del hook (Rules of Hooks)
  const { setLoading, setStep } = useLoading();

  // Refs para acceder al estado actual sin dependencias de closure (evita stale closure)
  const contentRef = useRef<MobileContent | null>(null);
  const stylesRef = useRef<PdfStyles>(DEFAULT_PDF_STYLES);
  const tokensRef = useRef<TokenSelection>({ ...INITIAL_TOKENS });

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
    setLoading(true, 'Extrayendo texto del PDF...');
    setMobileContent(null);
    setPdfBlob(null);
    setPdfStyles({ ...DEFAULT_PDF_STYLES });
    setDesignTokens({ ...INITIAL_TOKENS });
    contentRef.current = null;
    stylesRef.current = { ...DEFAULT_PDF_STYLES };
    tokensRef.current = { ...INITIAL_TOKENS };

    let extractedText = '';

    // ================================================================
    // STEP 1: EXTRACCIÓN
    // ================================================================
    try {
      extractedText = await extractPdfText(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al extraer texto del PDF';
      setState({ step: 'error', error: message, errorStep: 'extract' });
      setLoading(false);
      return;
    }

    // ================================================================
    // STEP 2: REFORMATEO CON IA (con rate limiting + fallback)
    // ================================================================
    setState({ step: 'reformatting' });
    setStep('Consultando con la IA...');

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
      setLoading(false);
      return;
    }

    // ================================================================
    // STEP 3: GENERACIÓN PDF
    // ================================================================
    setStep('Maquetando el itinerario final...');
    setState(prev => ({ step: 'generating', rateLimitWaitMs: prev.rateLimitWaitMs }));

    try {
      const blob = await generatePdf(reformattedContent, stylesRef.current);
      setPdfBlob(blob);
      setState({ step: 'done' });
      setLoading(false);

    } catch (err) {
      setLoading(false);
      console.error('[usePdfConversion] Error en generación:', err);
      const message = err instanceof Error ? err.message : 'Error al generar el PDF';
      setState({ step: 'error', error: message, errorStep: 'generate' });
    }
  }, [setLoading, setStep]);

  /**
   * Inicia la conversión desde texto plano (no PDF).
   * Bypass completo de la extracción: el texto se envía directamente
   * al LLM para reformateo, exactamente igual que si viniera de un PDF.
   *
   * El estado resultante (mobileContent, pdfBlob, pdfStyles) es
   * indistinguible del generado por startConversion(file).
   */
  const startTextConversion = useCallback(async (rawText: string) => {
    // --- RESET ---
    setState({ step: 'reformatting' }); // saltamos 'extracting'
    setLoading(true, 'Consultando con la IA...');
    setMobileContent(null);
    setPdfBlob(null);
    setPdfStyles({ ...DEFAULT_PDF_STYLES });
    setDesignTokens({ ...INITIAL_TOKENS });
    contentRef.current = null;
    stylesRef.current = { ...DEFAULT_PDF_STYLES };
    tokensRef.current = { ...INITIAL_TOKENS };

    let reformattedContent: MobileContent;

    try {
      // ── Circuit breaker: saltar DeepSeek si está en cooldown ──
      if (isPrimaryAICircuitOpen()) {
        console.log('[usePdfConversion] Circuit breaker abierto — usando OpenRouter directamente');
        reformattedContent = await reformatWithOpenRouter(rawText);
      } else {
        try {
          // Intentar con DeepSeek V4 primero
          reformattedContent = await reformatWithDeepSeek(rawText);
        } catch (dsErr) {
          recordPrimaryAIFailure();
          console.warn('[usePdfConversion] DeepSeek falló, intentando OpenRouter fallback...', dsErr);
          // Fallback automático a OpenRouter
          reformattedContent = await reformatWithOpenRouter(rawText);
        }
      }

      contentRef.current = reformattedContent;
      setMobileContent(reformattedContent);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al reformatear con IA. Revisa tus API keys.';
      setState({ step: 'error', error: message, errorStep: 'reformat' });
      setLoading(false);
      return;
    }

    // ================================================================
    // STEP 3: GENERACIÓN PDF
    // ================================================================
    setStep('Maquetando el itinerario final...');
    setState(prev => ({ step: 'generating', rateLimitWaitMs: prev.rateLimitWaitMs }));

    try {
      const blob = await generatePdf(reformattedContent, stylesRef.current);
      setPdfBlob(blob);
      setState({ step: 'done' });
      setLoading(false);

    } catch (err) {
      setLoading(false);
      console.error('[usePdfConversion] Error en generación:', err);
      const message = err instanceof Error ? err.message : 'Error al generar el PDF';
      setState({ step: 'error', error: message, errorStep: 'generate' });
    }
  }, [setLoading, setStep]);


  /**
   * Regenera el PDF usando el MobileContent y PdfStyles actuales (refs).
   * No vuelve a llamar a la IA — usa los datos ya extraídos y editados.
   * Transiciona brevemente a 'generating' → 'done'.
   */
  const regeneratePdf = useCallback(async () => {
    const currentContent = contentRef.current;
    if (!currentContent) return;

    setLoading(true, 'Maquetando el itinerario final...');
    setState(prev => ({ step: 'generating', rateLimitWaitMs: prev.rateLimitWaitMs }));

    try {
      const blob = await generatePdf(currentContent, stylesRef.current);
      setPdfBlob(blob);
      setState({ step: 'done' });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('[usePdfConversion] Error al regenerar PDF:', err);
      const message = err instanceof Error ? err.message : 'Error al regenerar el PDF';
      setState({ step: 'error', error: message, errorStep: 'generate' });
    }
  }, [setLoading, setStep]);

  /**
   * Interpreta una instrucción de chat en lenguaje natural usando el
   * sistema UNIFICADO de edición.
   *
   * El LLM recibe el estado completo (content + designTokens) y devuelve
   * el estado completo modificado según la instrucción del usuario.
   *
   * ARQUITECTURA DE INMUTABILIDAD SELECTIVA:
   * - Cambios de texto → modifica solo "content", "designTokens" intacto.
   * - Cambios visuales → modifica solo "designTokens", "content" intacto.
   */
  const applyChatChanges = useCallback(async (userMessage: string, history?: ChatMessage[]): Promise<string> => {
    const currentContent = contentRef.current;
    if (!currentContent) {
      setChatError('No hay contenido que editar. Sube un PDF primero.');
      return 'No hay contenido que editar. Sube un PDF primero.';
    }

    setIsProcessing(true);
    setChatError(null);
    setLoading(true, 'Aplicando cambios de diseño...');

    try {
      const result = await interpretChatInstruction(
        userMessage,
        currentContent,
        stylesRef.current,
        tokensRef.current,
        history,
      );

      // Actualizar estado de contenido
      contentRef.current = result.content;
      setMobileContent(result.content);

      // Actualizar estado de estilos
      stylesRef.current = result.styles;
      setPdfStyles(result.styles);

      // Actualizar estado de tokens de diseño
      tokensRef.current = result.tokens;
      setDesignTokens(result.tokens);

      // ═══════════════════════════════════════════════════════════════
      // SAFETY NET — PROTOCOLO DE PERSONALIZACIÓN AUTOMÁTICA
      // ═══════════════════════════════════════════════════════════════
      // Si faltan agentName o agentPhone en el contenido resultante,
      // NO se regenera el PDF. El usuario debe proporcionar estos datos
      // antes de que el flujo pueda completarse. El mensaje del asistente
      // (generado por el LLM) ya contendrá la solicitud si corresponde.
      // ═══════════════════════════════════════════════════════════════
      const agentNameMissing = !result.content.agentName?.trim();
      const agentPhoneMissing = !result.content.agentPhone?.trim();

      if (agentNameMissing || agentPhoneMissing) {
        setAgentDataMissing(true);
        setLoading(false);
        // NO se setea state a 'done' — así PdfDownload NO se renderiza
        // y el botón de descarga permanece oculto hasta que el usuario
        // proporcione los datos.
        return result.message;
      }

      // Si llegamos aquí, los datos del agente están completos
      setAgentDataMissing(false);

      setStep('Maquetando el itinerario final...');
      setState(prev => ({ step: 'generating', rateLimitWaitMs: prev.rateLimitWaitMs }));

      try {
        const blob = await generatePdf(result.content, result.styles);
        setPdfBlob(blob);
        setState({ step: 'done' });
        setLoading(false);
        return result.message;
      } catch (pdfErr) {
        console.error('[usePdfConversion] Error al regenerar PDF tras chat:', pdfErr);
        const msg = pdfErr instanceof Error ? pdfErr.message : 'Error al regenerar el PDF';
        setState({ step: 'error', error: msg, errorStep: 'generate' });
        setChatError(msg);
        setLoading(false);
        return `Cambios aplicados, pero falló la regeneración del PDF: ${msg}`;
      }
    } catch (err) {
      console.error('[usePdfConversion] Error en applyChatChanges:', err);
      const msg = err instanceof Error ? err.message : 'Error al interpretar la instrucción';
      setChatError(msg);
      setIsProcessing(false);
      setLoading(false);
      setState(prev => prev.step === 'generating' ? { step: 'done' } : prev);
      return `Error: ${msg}`;
    } finally {
      setIsProcessing(false);
    }
  }, [setLoading, setStep]);

  const reset = useCallback(() => {
    setState({ step: 'idle' });
    setMobileContent(null);
    setPdfBlob(null);
    setPdfStyles({ ...DEFAULT_PDF_STYLES });
    setDesignTokens({ ...INITIAL_TOKENS });
    setIsProcessing(false);
    setChatError(null);
    setAgentDataMissing(false);
    setLoading(false);
    contentRef.current = null;
    stylesRef.current = { ...DEFAULT_PDF_STYLES };
    tokensRef.current = { ...INITIAL_TOKENS };
  }, [setLoading]);

  return {
    state,
    mobileContent,
    pdfBlob,
    pdfStyles,
    designTokens,
    isProcessing,
    chatError,
    agentDataMissing,
    startConversion,
    startTextConversion,
    regeneratePdf,
    applyChatChanges,
    setMobileContent: updateContent,
    setStyles: updateStyles,
    reset,
  };
}

export default usePdfConversion;
