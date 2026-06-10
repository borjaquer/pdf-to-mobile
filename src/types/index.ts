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

export interface BottomBanner {
  /** Título opcional del banner (ej. "PRECIO TOTAL") */
  title?: string;
  /** Texto principal del banner (ej. "1500€") */
  text: string;
  /** Tipo visual: price (recuadro destacado), warning (alerta), info (informativo) */
  type: 'price' | 'warning' | 'info';
}

export interface MobileContent {
  title: string;
  subtitle?: string;
  days: MobileDay[];
  accommodations?: MobileAccommodation[];
  services?: MobileService[];
  notes?: string[];
  pageNumber?: number;
  /**
   * Banner opcional que se renderiza al final del PDF.
   * El LLM lo rellena cuando el usuario pide añadir un precio,
   * una advertencia o una nota final que no encaja en la estructura normal.
   */
  bottomBanner?: BottomBanner;
  /**
   * Nota opcional que se renderiza al inicio del PDF (tras el header).
   * Texto libre que el LLM puede usar para añadir información contextual.
   */
  topNote?: string;
  /**
   * Recuadro de precio simple (string) que se renderiza al final del PDF.
   * Aparece cuando el usuario pide añadir un precio destacado.
   * Más simple que bottomBanner — solo texto plano con fondo de acento.
   */
  priceBanner?: string;
  /**
   * Nombre del agente de viajes para el pie de página.
   * El LLM lo rellena cuando el usuario proporciona su nombre.
   */
  agentName?: string;
  /**
   * Teléfono del agente de viajes para el pie de página.
   * El LLM lo rellena cuando el usuario proporciona su número.
   */
  agentPhone?: string;
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

/**
 * Respuesta del chat de edición usando ARQUITECTURA DE PARCHES (Deltas).
 *
 * El LLM ya NO devuelve el contenido completo del itinerario.
 * En su lugar, devuelve ÚNICAMENTE los campos que han cambiado
 * mediante contentPatch, más los designTokens si hay cambios visuales.
 *
 * Esto elimina los errores de JSON corrompido que ocurrían al regenerar
 * el contenido completo, y reduce drásticamente el token usage.
 */
/**
 * Parche para modificar un día específico del itinerario.
 * El index es 0-based: 0 = Día 1, 1 = Día 2, etc.
 * Solo se incluyen los campos que el usuario quiere cambiar.
 */
export interface ContentPatchDay {
  /** Índice 0-based del día a modificar (0 = Día 1, 1 = Día 2, etc.) */
  index: number;
  /** Nuevo título del día (opcional) */
  title?: string;
  /** Nuevo resumen del día (opcional) */
  summary?: string;
  /** Nuevos bullets del día (opcional — reemplaza el array completo) */
  bullets?: string[];
}

export interface ChatResponse {
  /** OBLIGATORIO: Mensaje natural del asistente para el usuario.
   *  El LLM DEBE generar un mensaje conversacional que confirme la acción
   *  realizada, explique lo que ha cambiado, o pida aclaración si falta información.
   *  Nunca debe estar vacío. */
  assistantMessage: string;
  /** Tokens de diseño (solo si el usuario pide cambios visuales). */
  designTokens?: { paletteId: string; typographyId: string };
  /** Parche delta con los campos de texto modificados. */
  contentPatch?: {
    title?: string;
    subtitle?: string;
    priceBanner?: string;
    topNote?: string;
    /**
     * Edición profunda de días específicos del itinerario.
     * Cada entrada debe incluir el index del día y SOLO los campos a modificar.
     * La fusión se hace por índice para no alterar el resto del array.
     */
    days?: ContentPatchDay[];
    /**
     * Edición profunda de alojamientos (hoteles) por índice.
     * Cada entrada debe incluir el index (0-based dentro del array accommodations)
     * y SOLO los campos a modificar.
     */
    accommodations?: Array<{
      /** Índice 0-based del alojamiento a modificar. */
      index: number;
      /** Nuevo nombre del hotel (opcional). */
      name?: string;
      /** Nuevas noches (opcional). */
      nights?: string;
      /** Nueva régimen (opcional). */
      board?: string;
      /** Nueva ubicación (opcional). */
      location?: string;
    }>;
    /**
     * Edición profunda de servicios por índice de categoría.
     * index: 0 = included, 1 = not_included, 2 = optional.
     * Si se incluye items, se sobrescribe la lista completa de esa categoría.
     */
    services?: Array<{
      /** 0 = included, 1 = not_included, 2 = optional */
      index: number;
      /** Items que sobrescriben la lista completa de esa categoría (opcional). */
      items?: string[];
    }>;
    /**
     * Sobrescribe completamente el array de notas (notes).
     */
    notes?: string[];
    /**
     * Nombre del agente de viajes. El LLM lo captura cuando el usuario
     * proporciona su nombre completo en el chat.
     */
    agentName?: string;
    /**
     * Teléfono del agente de viajes. El LLM lo captura cuando el usuario
     * proporciona su número de teléfono en el chat.
     */
    agentPhone?: string;
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
