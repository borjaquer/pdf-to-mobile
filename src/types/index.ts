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

/**
 * v3 — Dossier móvil (espejo del PDF objetivo).
 *
 * Cambios frente a v2:
 *  - MobileDay ya no usa emoji ni bullets por día.
 *  - MobileAccommodation ahora agrupa hoteles por ciudad.
 *  - MobileService desaparece; en su lugar serviciosIncluidos (string[]).
 *  - MobileContent gana tagline, tarifaDesde, opcionComidasPlus.
 *  - Se conservan campos de chat (agentName, agentPhone, priceBanner, topNote, bottomBanner)
 *    para mantener compatibilidad con el intérprete de edición.
 */

export interface MobileDay {
  /** Número del día (1-9). El LLM lo rellena explícitamente para poder ordenar. */
  n: number;
  /** Título corto editorial (3-6 palabras, puede incluir ciudades entre paréntesis). */
  titulo: string;
  /** Resumen de 1-3 frases telegráficas con hitos accionables. SIN bullets, SIN emojis, SIN "Desayuno". */
  resumen: string;
}

export interface MobileAccommodation {
  /** Ciudad (ordenada según aparición en el itinerario). */
  ciudad: string;
  /** Hoteles de esa ciudad (máx 3 marcas), unidos con " / ". SIN "o similares". */
  hoteles: string[];
}

export interface BottomBanner {
  title?: string;
  text: string;
  type: 'price' | 'warning' | 'info';
}

export interface MobileContent {
  /** Título principal del viaje (MAYÚSCULAS en el PDF). */
  title: string;
  /** Tagline bajo el título: "Dossier Exclusivo de Itinerario • 9 Días y 8 Noches". */
  tagline?: string;
  /** Tarifa "Desde X €". El LLM extrae la cifra del bruto; se renderiza como badge. */
  tarifaDesde?: string;
  /** Días del itinerario. Sin emoji, sin bullets. */
  days: MobileDay[];
  /** Alojamientos agrupados por ciudad. */
  accommodations?: MobileAccommodation[];
  /** Servicios incluidos como array de strings (≈9 bullets reescritos). */
  serviciosIncluidos?: string[];
  /** Párrafo único de marketing para la opción "Comidas Plus". */
  opcionComidasPlus?: string;
  /** Notas importantes (documentación, visados, etc.). */
  notes?: string[];
  /** Número de página del PDF original (para metadata, no se renderiza). */
  pageNumber?: number;
  /** Banner opcional al final del PDF (compatible con chat de edición). */
  bottomBanner?: BottomBanner;
  /** Nota opcional al inicio (compatible con chat de edición). */
  topNote?: string;
  /** Recuadro de precio simple (compatible con chat de edición). */
  priceBanner?: string;
  /** Nombre del agente (compatible con chat de edición). */
  agentName?: string;
  /** Teléfono del agente (compatible con chat de edición). */
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
  /** Nuevo título del día (opcional) — v3: sin emoji, MAYÚSCULAS */
  titulo?: string;
  /** Nuevo resumen del día (opcional) — v3: párrafo descriptivo sin bullets */
  resumen?: string;
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
    priceBanner?: string;
    topNote?: string;
    /**
     * Edición profunda de días específicos del itinerario.
     * Cada entrada debe incluir el index del día y SOLO los campos a modificar.
     * La fusión se hace por índice para no alterar el resto del array.
     */
    days?: ContentPatchDay[];
    /**
     * Edición profunda de alojamientos (hoteles agrupados por ciudad) — v3.
     * Cada entrada debe incluir el index (0-based dentro del array accommodations)
     * y SOLO los campos a modificar.
     */
    accommodations?: Array<{
      /** Índice 0-based del alojamiento a modificar. */
      index: number;
      /** Nueva ciudad (opcional). */
      ciudad?: string;
      /** Nuevos hoteles (opcional — reemplaza el array completo). */
      hoteles?: string[];
    }>;
    /**
     * Sobrescribe completamente el array de servicios incluidos — v3.
     */
    serviciosIncluidos?: string[];
    /**
     * Sobrescribe completamente el array de notas (notes).
     */
    notes?: string[];
    /**
     * Frase gancho bajo el título — v3.
     */
    tagline?: string;
    /**
     * Texto de tarifa desde — v3 (ej: "1.425€").
     */
    tarifaDesde?: string;
    /**
     * Párrafo describiendo el upgrade de comidas — v3.
     */
    opcionComidasPlus?: string;
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
