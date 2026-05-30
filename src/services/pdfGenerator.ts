import html2pdf from 'html2pdf.js';
import type { MobileContent, PdfStyles } from '../types';
import { renderMobileTemplate } from '../templates/mobilePdfTemplate';

/**
 * Genera un PDF adaptado a móvil desde contenido estructurado MobileContent.
 *
 * Pipeline:
 * MobileContent → renderMobileTemplate() → HTML string → html2pdf.js → Blob PDF
 *
 * Configuración: A5 portrait, margen 8mm, texto rasterizado (no seleccionable).
 *
 * ⚠️ LIMITACIÓN: html2pdf.js + jspdf rasteriza el HTML a canvas, por lo que
 * el texto en el PDF final NO es seleccionable ni indexable. Esta es una
 * limitación aceptada del MVP. En v2 se puede migrar a pdfmake.
 *
 * @param content - Datos estructurados del documento
 * @param styles - Opcional. Estilos CSS personalizados para el PDF
 */
export async function generatePdf(content: MobileContent, styles?: PdfStyles): Promise<Blob> {
  const html = renderMobileTemplate(content, styles);

  // html2pdf.js acepta un string HTML directamente en .from().
  // Cuando recibe string, crea su propio elemento interno visible y lo captura
  // correctamente con html2canvas. Así evitamos problemas de visibilidad CSS
  // (opacity:0, visibility:hidden, left:-9999px — todos fallan con html2canvas).
  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number], // mm
    filename: 'pdf-adaptado-movil.pdf',
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: {
      scale: 2, // 2x para mejor legibilidad
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a5' as const,
      orientation: 'portrait' as const,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'] as string[],
    },
  };

  const pdfBlob = await html2pdf()
    .set(opt)
    .from(html) // <-- string HTML, html2pdf crea su propio elemento visible
    .toPdf()
    .output('blob');

  return pdfBlob as Blob;
}

export default generatePdf;
