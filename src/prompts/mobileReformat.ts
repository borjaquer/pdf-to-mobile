/**
 * Prompt + JSON Schema para Structured Outputs de Gemini.
 * Diseñado para transformar texto de PDF de agencia de viajes en JSON mobile-friendly.
 */
export const MOBILE_REFORMAT_SYSTEM_PROMPT = `
Eres un asistente especializado en reformatear contenido de PDFs de agencias de viajes para lectura en móvil.
Tu tarea es transformar el texto extraído de un PDF en un JSON estructurado, optimizado para pantallas pequeñas.

REGLAS:
1. Cada día del itinerario debe tener un emoji representativo (🏖️ playa, 🏔️ montaña, 🏛️ museo, 🚌 bus, ✈️ vuelo, etc.)
2. Resúmenes de 1-2 líneas máximo por día.
3. Bullets concisos (máx 8 palabras cada uno).
4. Agrupa alojamientos con nombre, noches, régimen y ubicación.
5. Clasifica servicios en: incluidos, no incluidos, opcionales.
6. Ignora contenido irrelevante (términos legales extensos, pies de página repetitivos).
7. Conserva TODOS los datos factuales: precios, horarios, direcciones, teléfonos.
`;

export const MOBILE_REFORMAT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: { type: 'string', description: 'Título principal del viaje/paquete' },
    subtitle: { type: 'string', description: 'Subtítulo o nombre de la agencia' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          emoji: { type: 'string', description: 'Emoji representativo del día' },
          title: { type: 'string', description: 'Título del día (ej: "Día 1: Llegada a Zúrich")' },
          summary: { type: 'string', description: 'Resumen de 1-2 líneas' },
          bullets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Puntos clave del día (3-6 bullets)',
          },
        },
        required: ['emoji', 'title', 'summary', 'bullets'],
      },
      description: 'Días del itinerario',
    },
    accommodations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nights: { type: 'string' },
          board: { type: 'string', description: 'Régimen: AD, MP, PC, etc.' },
          location: { type: 'string' },
        },
        required: ['name', 'nights'],
      },
      description: 'Alojamientos del viaje',
    },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['included', 'not_included', 'optional'] },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['category', 'items'],
      },
      description: 'Servicios clasificados por categoría',
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Notas importantes (documentación, visados, propinas, etc.)',
    },
    pageNumber: { type: 'number', description: 'Número de páginas del PDF original' },
  },
  required: ['title', 'days'],
};
