import { type FC, useEffect, useState } from 'react';
import type { MobileContent, PdfStyles } from '../types';
import { generatePdf } from '../services/pdfGenerator';

interface Props {
  content: MobileContent;
  styles: PdfStyles;
  fileName?: string;
  /** Si es true, genera el blob automáticamente al montarse o cambiar props */
  autoGenerate?: boolean;
  /** Indica si faltan datos del agente; deshabilita la descarga si es true */
  agentDataMissing?: boolean;
}

/**
 * Componente de descarga de PDF.
 *
 * v2: Genera el blob reactivamente a partir de `content` y `styles`,
 * garantizando que el PDF descargado sea un reflejo 1:1 de la vista previa.
 *
 * Cuando `autoGenerate` es true (default), mantiene un blob interno actualizado
 * mediante useEffect para descarga instantánea al hacer click.
 * Cuando es false, genera el blob bajo demanda al pulsar el botón.
 */
const PdfDownload: FC<Props> = ({
  content,
  styles,
  fileName = 'documento-adaptado',
  autoGenerate = true,
  agentDataMissing = false,
}) => {
  // ══════════════════════════════════════════════════════════
  // 1. TODOS los hooks SIEMPRE se declaran al nivel superior,
  //    antes de cualquier retorno condicional.
  // ══════════════════════════════════════════════════════════
  const [internalBlob, setInternalBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Generación automática: mantiene el blob sincronizado con content+styles ──
  useEffect(() => {
    if (!autoGenerate) return;

    let cancelled = false;
    setIsGenerating(true);
    setError(null);

    generatePdf(content, styles)
      .then((blob) => {
        if (!cancelled) {
          setInternalBlob(blob);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[PdfDownload] Error generating blob:', err);
          setError(err instanceof Error ? err.message : 'Error al generar PDF');
          setIsGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content, styles, autoGenerate]);

  // ══════════════════════════════════════════════════════════
  // 2. Lógica de validación POST-hooks
  // ══════════════════════════════════════════════════════════

  // ── Bloqueo si faltan datos del agente ──
  if (agentDataMissing) {
    return (
      <div className="text-center space-y-3 animate-fade-in">
        <button
          disabled
          className="inline-flex items-center gap-2 bg-blue-400 cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
        >
          <span>📥</span>
          Datos del agente requeridos
        </button>
        <p className="text-xs text-amber-600">
          ⚠️ Proporciona tu nombre y teléfono en el chat para habilitar la descarga
        </p>
        <p className="text-xs text-slate-400">
          Formato A5 · Optimizado para lectura en móvil
        </p>
      </div>
    );
  }

  // ── Generación bajo demanda (cuando autoGenerate=false) ──
  const handleDownloadClick = async () => {
    if (autoGenerate && internalBlob) {
      // Si autoGenerate está activo y ya tenemos blob, descarga directa
      triggerDownload(internalBlob, fileName);
      return;
    }

    // Generar bajo demanda
    setIsGenerating(true);
    setError(null);
    try {
      const blob = await generatePdf(content, styles);
      if (autoGenerate) {
        setInternalBlob(blob);
      }
      triggerDownload(blob, fileName);
      setIsGenerating(false);
    } catch (err) {
      console.error('[PdfDownload] Error generating blob on demand:', err);
      setError(err instanceof Error ? err.message : 'Error al generar PDF');
      setIsGenerating(false);
    }
  };

  return (
    <div className="text-center space-y-3 animate-fade-in">
      <button
        onClick={handleDownloadClick}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
      >
        {isGenerating ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Generando PDF…</span>
          </>
        ) : (
          <>
            <span>📥</span>
            Descargar PDF adaptado
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500">Error: {error}</p>
      )}

      <p className="text-xs text-slate-400">
        Formato A5 · Optimizado para lectura en móvil
      </p>
    </div>
  );
};

/**
 * Helper para disparar la descarga de un Blob.
 * Crea un enlace temporal y lo elimina tras la descarga.
 */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName}-mobile.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Liberar la URL tras un breve delay para asegurar que la descarga comience
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default PdfDownload;
