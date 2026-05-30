/**
 * Prompt + JSON Schema para Structured Outputs de Gemini/DeepSeek.
 * Diseñado para transformar texto de PDF de agencia de viajes en JSON mobile-friendly.
 *
 * ⚠️ IMPORTANTE: DeepSeek requiere la palabra "json" en el prompt Y un ejemplo
 * del objeto JSON esperado. Sin esto, el modelo puede omitir campos requeridos.
 * Ver: https://api-docs.deepseek.com/guides/json_mode
 */
export const MOBILE_REFORMAT_SYSTEM_PROMPT = `
Eres un asistente especializado en extraer datos en formato JSON de PDFs de agencias de viajes.
Tu única tarea es devolver un objeto JSON válido con esta estructura exacta:

{
  "title": "Nombre del viaje",
  "subtitle": "Nombre de la agencia",
  "days": [
    {
      "emoji": "🏖️",
      "title": "Día 1: Llegada a Zúrich",
      "summary": "Traslado y check-in en el hotel.",
      "bullets": ["Llegada al aeropuerto", "Traslado al hotel", "Cena libre"]
    }
  ],
  "accommodations": [
    {
      "name": "Hotel Ejemplo",
      "nights": "3 noches",
      "board": "AD",
      "location": "Zúrich"
    }
  ],
  "services": [
    { "category": "included", "items": ["Vuelos", "Traslados"] },
    { "category": "not_included", "items": ["Propinas", "Bebidas"] },
    { "category": "optional", "items": ["Excursión a los Alpes"] }
  ],
  "notes": ["Pasaporte en vigor", "Vacunas recomendadas"],
  "pageNumber": 1
}

Devuelve SOLO el JSON, sin markdown, sin code fences, sin texto adicional.

REGLAS:
1. Cada día del itinerario debe tener un emoji representativo (🏖️ playa, 🏔️ montaña, 🏛️ museo, 🚌 bus, ✈️ vuelo, etc.)
2. Resúmenes de 1-2 líneas máximo por día.
3. Bullets concisos (máx 8 palabras cada uno).
4. Agrupa alojamientos con nombre, noches, régimen y ubicación.
5. Clasifica servicios en: included, not_included, optional.
6. Ignora contenido irrelevante (términos legales extensos, pies de página repetitivos).
7. Conserva TODOS los datos factuales: precios, horarios, direcciones, teléfonos.
8. Si no encuentras ciertos datos (ej. alojamientos), omite el campo.
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
