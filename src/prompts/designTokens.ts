/**
 * ─── REPOSITORIO DE DESIGN TOKENS ─────────────────────────────
 *
 * Sistema CERRADO de diseño: el LLM NUNCA escribe CSS libre ni HTML.
 * Actúa únicamente como enrutador semántico hacia estilos predefinidos.
 *
 * v2 (vectorial): Con @react-pdf/renderer, las fuentes usadas son las
 * built-in del motor PDF: Helvetica, Times-Roman y Courier. Las tipografías
 * CSS del sistema se mapean automáticamente a la más cercana disponible
 * en el PDF generado con calidad vectorial nativa (texto seleccionable).
 *
 * Fuentes seguras disponibles:
 *   - Arial (Windows), Helvetica (macOS) → sans-serif genérico
 *   - Georgia (serif legible en pantalla)
 *   - Times New Roman (serif clásico)
 *   - Trebuchet MS (humanista sans-serif)
 *   - Courier New (monoespaciada, no recomendada para cuerpo)
 */

import type { PdfStyles } from '../types';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface PaletteToken {
  id: string;
  name: string;
  description: string;
  /** Color sólido del header */
  header: string;
  /** Color del texto en el header */
  headerText: string;
  /** Color de acento (bordes, bullets, badges) */
  accent: string;
  /** Fondo general de la página */
  background: string;
  /** Fondo de cards (días, alojamientos) */
  cardBackground: string;
  /** Color base del texto */
  text: string;
  /** Color de títulos y encabezados de sección */
  heading: string;
  /** Color de texto secundario (metadatos, fechas) */
  muted: string;
  /** Color de separadores */
  divider: string;
  /** Color del badge de precio (normalmente = accent) */
  price: string;
}

export interface TypographyToken {
  id: string;
  name: string;
  description: string;
  /** font-family CSS completo para headings (h1, section headers) */
  headingFont: string;
  /** font-weight para headings */
  headingWeight: string;
  /** font-family CSS completo para cuerpo de texto */
  bodyFont: string;
  /** font-size base en px */
  baseSize: number;
}

/** Lo que el LLM DEBE devolver como respuesta JSON */
export interface TokenSelection {
  paletteId: string;
  typographyId: string;
}

// ═══════════════════════════════════════════════════════════════
// 5 PALETAS DE COLOR PREMIUM
// ═══════════════════════════════════════════════════════════════

export const PALETTES: Record<string, PaletteToken> = {
  navy_gold: {
    id: 'navy_gold',
    name: 'Navy & Gold',
    description: 'Lujo clásico, premium, sofisticado. Ideal para viajes de lujo, escapadas románticas, hoteles 5 estrellas.',
    header: '#1a1a2e',
    headerText: '#f1f5f9',
    accent: '#c9a96e',
    background: '#ffffff',
    cardBackground: '#faf8f5',
    text: '#2c3e50',
    heading: '#16213e',
    muted: '#8b7d6b',
    divider: '#e8e0d5',
    price: '#c9a96e',
  },

  ocean_calm: {
    id: 'ocean_calm',
    name: 'Ocean Calm',
    description: 'Fresco, tranquilo, costero. Ideal para viajes de playa, cruceros, destinos tropicales, bienestar.',
    header: '#0f4c5c',
    headerText: '#e0f2fe',
    accent: '#3b82f6',
    background: '#f8fafc',
    cardBackground: '#f0f9ff',
    text: '#1e3a5f',
    heading: '#0c4a6e',
    muted: '#64748b',
    divider: '#e0f2fe',
    price: '#0ea5e9',
  },

  earth_warm: {
    id: 'earth_warm',
    name: 'Earth Warm',
    description: 'Cálido, natural, acogedor. Ideal para viajes rurales, enoturismo, escapadas de montaña, eco-turismo.',
    header: '#3e2c1c',
    headerText: '#fef3c7',
    accent: '#d4a373',
    background: '#fef9f0',
    cardBackground: '#faf3e6',
    text: '#3e2c1c',
    heading: '#2d1f14',
    muted: '#a68a6d',
    divider: '#e8d5c4',
    price: '#b8860b',
  },

  modern_slate: {
    id: 'modern_slate',
    name: 'Modern Slate',
    description: 'Urbano, contemporáneo, minimalista. Ideal para viajes de negocios, city breaks, tecnología, diseño.',
    header: '#2d3436',
    headerText: '#dfe6e9',
    accent: '#6c5ce7',
    background: '#ffffff',
    cardBackground: '#f5f6fa',
    text: '#2d3436',
    heading: '#1a1e20',
    muted: '#636e72',
    divider: '#dfe6e9',
    price: '#6c5ce7',
  },

  forest_deep: {
    id: 'forest_deep',
    name: 'Forest Deep',
    description: 'Verde, sereno, ecológico. Ideal para viajes de naturaleza, safaris, trekking, aventura al aire libre.',
    header: '#1b4332',
    headerText: '#d8f3dc',
    accent: '#52b788',
    background: '#f7faf7',
    cardBackground: '#edf7ed',
    text: '#1b4332',
    heading: '#081c15',
    muted: '#6b8f71',
    divider: '#d8f3dc',
    price: '#40916c',
  },
};

// ═══════════════════════════════════════════════════════════════
// 5 COMBINACIONES TIPOGRÁFICAS (SOLO SYSTEM FONTS)
// ═══════════════════════════════════════════════════════════════

export const TYPOGRAPHIES: Record<string, TypographyToken> = {
  classic_editorial: {
    id: 'classic_editorial',
    name: 'Classic Editorial',
    description: 'Elegante y tradicional. Georgia para títulos da un aire de revista impresa. Ideal para itinerarios detallados, viajes culturales.',
    headingFont: "Georgia, 'Times New Roman', serif",
    headingWeight: '700',
    bodyFont: "Georgia, 'Times New Roman', serif",
    baseSize: 14,
  },

  swiss_clean: {
    id: 'swiss_clean',
    name: 'Swiss Clean',
    description: 'Minimalista y funcional. Arial/Helvetica para todo. La elección segura cuando se busca claridad y profesionalidad.',
    headingFont: 'Arial, Helvetica, sans-serif',
    headingWeight: '700',
    bodyFont: 'Arial, Helvetica, sans-serif',
    baseSize: 14,
  },

  modern_humanist: {
    id: 'modern_humanist',
    name: 'Modern Humanist',
    description: 'Cálido y legible. Trebuchet MS tiene un toque humanista que lo hace más cercano. Bueno para viajes familiares.',
    headingFont: "Arial, Helvetica, sans-serif",
    headingWeight: '700',
    bodyFont: "'Trebuchet MS', Arial, sans-serif",
    baseSize: 14,
  },

  bold_impact: {
    id: 'bold_impact',
    name: 'Bold Impact',
    description: 'Alto contraste tipográfico. Arial Bold para títulos + Times New Roman para cuerpo. Ideal para presentaciones con carácter.',
    headingFont: 'Arial, Helvetica, sans-serif',
    headingWeight: '800',
    bodyFont: "'Times New Roman', Georgia, serif",
    baseSize: 14,
  },

  compact_professional: {
    id: 'compact_professional',
    name: 'Compact Professional',
    description: 'Denso y eficiente. Arial condensed visualmente con tamaño base 13px. Para itinerarios con mucha información.',
    headingFont: "Arial, Helvetica, sans-serif",
    headingWeight: '700',
    bodyFont: "Arial, Helvetica, sans-serif",
    baseSize: 13,
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS: convertir tokens → PdfStyles
// ═══════════════════════════════════════════════════════════════

/**
 * Aplica una selección de tokens (palette + typography) sobre un PdfStyles base,
 * devolviendo un PdfStyles completo con todos los campos requeridos.
 *
 * El LLM nunca toca los valores numéricos de PdfStyles directamente;
 * solo elige paletteId + typographyId y este helper los traduce.
 */
export function applyTokens(
  baseStyles: PdfStyles,
  palette: PaletteToken,
  typography: TypographyToken,
): PdfStyles {
  return {
    ...baseStyles,
    // ── Colores desde la paleta ──────────────────────────
    titleColor: palette.headerText,
    headingColor: palette.heading,
    textColor: palette.text,
    accentColor: palette.accent,
    backgroundColor: palette.background,
    cardBackground: palette.cardBackground,
    headerGradient: palette.header,
    headerTextColor: palette.headerText,
    bulletColor: palette.accent,
    mutedColor: palette.muted,
    dividerColor: palette.divider,
    priceColor: palette.price,
    subtitleColor: palette.muted,
    // ── Tipografía desde el token ────────────────────────
    fontFamily: typography.bodyFont,
    headingFontFamily: typography.headingFont,
    headingFontWeight: typography.headingWeight,
    fontSize: typography.baseSize,
    // ── Radio de borde se mantiene del base ──────────────
    cardRadius: baseStyles.cardRadius ?? 8,
  };
}

/**
 * Busca una paleta por su ID. Lanza error si no existe.
 */
export function getPalette(id: string): PaletteToken {
  const palette = PALETTES[id];
  if (!palette) {
    throw new Error(
      `Paleta "${id}" no encontrada. IDs válidos: ${Object.keys(PALETTES).join(', ')}`,
    );
  }
  return palette;
}

/**
 * Busca una tipografía por su ID. Lanza error si no existe.
 */
export function getTypography(id: string): TypographyToken {
  const typography = TYPOGRAPHIES[id];
  if (!typography) {
    throw new Error(
      `Tipografía "${id}" no encontrada. IDs válidos: ${Object.keys(TYPOGRAPHIES).join(', ')}`,
    );
  }
  return typography;
}

/**
 * Genera un resumen legible de los tokens disponibles para inyectar en el prompt del LLM.
 */
export function describeTokensForLLM(): string {
  const paletteList = Object.values(PALETTES)
    .map(p => `- "${p.id}" → ${p.name}: ${p.description}`)
    .join('\n');

  const typographyList = Object.values(TYPOGRAPHIES)
    .map(t => `- "${t.id}" → ${t.name}: ${t.description}`)
    .join('\n');

  return `PALETAS DISPONIBLES:\n${paletteList}\n\nTIPOGRAFÍAS DISPONIBLES:\n${typographyList}`;
}
