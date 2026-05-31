import type { PdfStyles } from '../types';

/**
 * Default styles reutilizables para el PDF mobile.
 *
 * Extraídos de MobileItineraryPDF.tsx para evitar que usePdfConversion.ts
 * arrastre estáticamente @react-pdf/renderer al bundle principal.
 *
 * Valores de diseño "agency-grade":
 * - Navy sólido en header con badge de precio dorado
 * - Timeline visual para itinerario
 * - Sistema de color semántico para servicios
 */
export const DEFAULT_PDF_STYLES: PdfStyles = {
  titleColor: '#ffffff',
  headingColor: '#0f172a',
  textColor: '#334155',
  accentColor: '#3b82f6',
  backgroundColor: '#ffffff',
  fontFamily: 'Helvetica',
  headingFontFamily: 'Helvetica',
  headingFontWeight: '700',
  fontSize: 14,
  priceColor: '#f59e0b',
  subtitleColor: '#cbd5e1',
  dividerColor: '#e2e8f0',
  cardBackground: '#f8fafc',
  headerGradient: '#1e293b',
  headerTextColor: '#f1f5f9',
  bulletColor: '#3b82f6',
  mutedColor: '#94a3b8',
  cardRadius: 8,
};
