/// <reference types="vite/client" />

export interface PdfConversionState {
  /** Current step in the pipeline */
  step: 'idle' | 'extracting' | 'reformatting' | 'generating' | 'done' | 'error';
  /** Error message if step === 'error' */
  error?: string;
  /** Which step failed (if any) */
  errorStep?: 'extract' | 'reformat' | 'generate';
  /** Estimated wait time in ms due to rate limiting (shown during reformatting) */
  rateLimitWaitMs?: number;
}

export interface ConversionStep {
  id: 'extract' | 'reformat' | 'generate';
  label: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  progress?: number; // 0-100
}

export interface MobileDay {
  emoji: string;
  title: string;
  summary: string;
  bullets: string[];
}

export interface MobileAccommodation {
  name: string;
  nights: string;
  board: string;
  location: string;
}

export interface MobileService {
  category: 'included' | 'not_included' | 'optional';
  items: string[];
}

export interface MobileContent {
  title: string;
  subtitle?: string;
  days: MobileDay[];
  accommodations?: MobileAccommodation[];
  services?: MobileService[];
  notes?: string[];
  pageNumber?: number;
}

/**
 * Estilos editables para el PDF final.
 * Se pasan opcionalmente a renderMobileTemplate() y generatePdf().
 * Si no se especifican, se usan los defaults del template.
 */
export interface PdfStyles {
  /** Color del título principal */
  titleColor: string;
  /** Color de encabezados de sección */
  headingColor: string;
  /** Color base del texto */
  textColor: string;
  /** Color de acento (bordes, bullets, badges) */
  accentColor: string;
  /** Fondo general del documento */
  backgroundColor: string;
  /** Familia tipográfica para cuerpo de texto (system-ui por defecto) */
  fontFamily: string;
  /** Tamaño base de fuente en px */
  fontSize: number;
  /** Color del badge de precio */
  priceColor?: string;
  /** Color del subtítulo */
  subtitleColor?: string;
  /** Color de separadores entre secciones */
  dividerColor?: string;
  /** Fondo de cards de día/alojamiento */
  cardBackground?: string;
  /** Gradiente de fondo del header (opcional) */
  headerGradient?: string;
  /** Color del texto en el header */
  headerTextColor?: string;
  /** Color de fondo de los bullets */
  bulletColor?: string;
  /** Color de texto secundario (metadatos, fechas) */
  mutedColor?: string;
  /** Radio de borde de las cards (px) */
  cardRadius?: number;
  /** [TOKEN] Familia tipográfica para headings (h1, section headers) */
  headingFontFamily?: string;
  /** [TOKEN] Peso tipográfico para headings (ej. "700", "800") */
  headingFontWeight?: string;
}

export interface GeminiResponse {
  content: MobileContent;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface RateLimitState {
  remainingRequests: number;
  resetTime: Date | null;
  estimatedWaitMs: number;
  isLimited: boolean;
}
