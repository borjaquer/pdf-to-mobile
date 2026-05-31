import type { MobileContent, PdfStyles } from '../types';

/**
 * Genera un PDF vectorial nativo a partir de MobileContent usando
 * @react-pdf/renderer con lazy loading dinámico.
 *
 * Pipeline v2 (vectorial):
 *   MobileContent → MobileItineraryPDF (React element) → pdf().toBlob()
 *
 * Lazy loading: el bundle de @react-pdf/renderer (~500KB gzip) se descarga
 * SOLO cuando el usuario solicita generar el PDF, sin bloquear el hilo
 * principal en la carga inicial de la app.
 *
 * @param content - Datos estructurados del documento
 * @param styles  - Opcional. Estilos visuales para el PDF
 */
export async function generatePdf(
  content: MobileContent,
  styles?: PdfStyles,
): Promise<Blob> {
  // ── Lazy import: @react-pdf/renderer se carga on-demand ──
  const [{ pdf }, { default: MobileItineraryPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/MobileItineraryPDF'),
  ]);

  const doc = pdf(
    <MobileItineraryPDF content={content} styles={styles} />,
  );
  const blob = await doc.toBlob();
  return blob;
}

export default generatePdf;
