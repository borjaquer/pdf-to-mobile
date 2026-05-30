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
  titleColor: string;
  headingColor: string;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number; // px base
  /** Color del badge de precio (si content.subtitle incluye precio) */
  priceColor?: string;
  /** Color del subtítulo */
  subtitleColor?: string;
  /** Color de separadores entre secciones */
  dividerColor?: string;
  /** Fondo de cards de día/alojamiento */
  cardBackground?: string;
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
