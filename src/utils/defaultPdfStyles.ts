import type { PdfStyles } from '../types';

/**
 * Estilos por defecto para el dossier móvil v3.
 *
 * Réplica exacta de la paleta del PDF objetivo:
 *   - Fondo crema #FDFBF9
 *   - Navy #0F2C3D para headers y banda hero
 *   - Dorado #C5A880 para acentos, filetes y subrayados
 *   - Texto #4A5568 gris pizarra
 *   - Cards beige #F4EFEA
 *
 * Fuentes: Tinos (≈ Liberation Serif) para títulos, Arimo (≈ Nimbus Sans) para cuerpo.
 * Se registran via Font.register en MobileItineraryPDF.tsx.
 */
export const DEFAULT_PDF_STYLES: PdfStyles = {
  titleColor: '#FFFFFF',
  headingColor: '#0F2C3D',
  textColor: '#4A5568',
  accentColor: '#C5A880',
  backgroundColor: '#FDFBF9',
  fontFamily: 'Arimo',
  headingFontFamily: 'Tinos',
  headingFontWeight: '700',
  fontSize: 9,
  priceColor: '#C5A880',
  subtitleColor: '#C5A880',
  dividerColor: '#C5A880',
  cardBackground: '#F4EFEA',
  headerGradient: '#0F2C3D',
  headerTextColor: '#FFFFFF',
  bulletColor: '#C5A880',
  mutedColor: '#A0AEC0',
  cardRadius: 2,
};
