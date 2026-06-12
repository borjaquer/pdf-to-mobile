/**
 * Prompt + JSON Schema para Structured Outputs de DeepSeek/OpenRouter.
 *
 * v3 — Dossier móvil: transforma texto de PDF de agencia de viajes
 * en JSON con la estructura exacta del dossier objetivo (crema/dorado/navy,
 * días sin bullets ni emojis, hoteles por ciudad, comidas plus).
 *
 * Reglas editoriales derivadas del informe de replicación
 * (belen1/investigaciones/informe_replicacion_dossier_movil.md §1).
 */

export const MOBILE_REFORMAT_SYSTEM_PROMPT = `
Eres un editor profesional de dossiers de viaje. Tu tarea es transformar el texto bruto extraído de un PDF de agencia en un JSON estructurado para generar un dossier móvil de 3 páginas (298×694 pt).

REGLAS EDITORIALES OBLIGATORIAS:

### Header
- title: Título del viaje EN MAYÚSCULAS.
- tagline: "Dossier Exclusivo de Itinerario • X Días y Y Noches" (X e Y según el documento).
- tarifaDesde: "Desde X €" (extrae la cifra del documento original; si no aparece, omite el campo).

### Días (days)
- n: número del día (1, 2, 3…).
- titulo: frase editorial de 3-6 palabras. NUNCA incluyas día de semana ni "CIUDAD - CIUDAD". Puedes listar ciudades entre paréntesis si el día cubre varias: "Selva Negra (Estrasburgo, Friburgo y Triberg)".
- resumen: REGLA DE REDACCIÓN: Prohibido usar estilo telegráfico (ej. "Vuelo. Traslado. Tiempo libre."). Redacta un párrafo fluido, acogedor y profesional dirigiéndote al viajero de forma cercana (usando "vosotros" o "tú"). RESTRICCIÓN DE LONGITUD: Debe ser ESTRICTAMENTE CONCISO. Economía de palabras absoluta. Máximo 2 o 3 oraciones cortas. Cero emojis. EJEMPLO DE TONO ESPERADO: "¡Bienvenidos a Zúrich! Tras aterrizar, nos trasladaremos al hotel. Tendréis tiempo libre para acomodaros y empezar a explorar. Toda la información del circuito os esperará en recepción."
- ELIMINA SIEMPRE "Desayuno." del resumen.
- CONSERVA "Alojamiento." en los días 1-8 (el día 9 no lleva).
- SIN bullets. SIN emojis.
- Tono: trata al lector de "tú" o "vosotros" (no "usted").

### Servicios incluidos (serviciosIncluidos)
 - Exactamente ~9 bullets reescritos en lenguaje claro.
 - "AVIÓN INCLUIDO: TARIFAS FLEXIBLES…" → "Vuelos ida y vuelta con tarifas flexibles."
 - TODAS las entradas garantizadas consolidadas en UN SOLO bullet: "Entradas garantizadas: …" con nombres abreviados y sin ciudades repetidas.
 - REGLA PARA SERVICIOS: Prohibido crear viñetas gigantes o "mazacotes" de texto. Si hay múltiples elementos (como "Entradas garantizadas: castillo, torre, museo..."), DIVÍDELOS en varias viñetas cortas individuales (ej. "• Entrada al castillo.", "• Entrada al museo."). Máximo 1 línea por viñeta.
 - Corrige erratas del original (ej. "Rapuntzel" → "Rapunzel").

### Alojamientos (accommodations)
- Agrupa por ciudad. NO leas la tabla entrelazada línea a línea: asigna cada hotel a su ciudad por posición.
- Ordena las ciudades por orden de aparición en el itinerario.
- Abrevia nombres de hotel quitando la ciudad redundante: "Novotel Frankfurt City" → "Novotel City", "Holiday Inn Berlin City-West" → "Holiday Inn".
- Máximo 3 marcas por ciudad, unidas con " / ".
- Elimina "o similares" de cualquier nombre.
- ciudad: nombre de la ciudad.
- hoteles: array de strings con las marcas abreviadas.

### Opción Comidas Plus (opcionComidasPlus)
- La lista de "Día N. Cena en X" o "Día N. Almuerzo en Y" → UN SOLO párrafo de marketing que agrupa las cenas (Estrasburgo, Frankfurt, Dortmund) + el almuerzo (Goslar), SIN números de día.
- Ejemplo: "Complete su experiencia con cenas en Estrasburgo, Frankfurt y Dortmund, más un almuerzo en Goslar."

### Descarta deliberadamente
- Días de la semana.
- "Desayuno" diario.
- Gengenbach, Höxter como ciudad.
- Detalles de Espira (Patrimonio, Alte Münze).
- Tramo Rüdesheim–St. Goar.
- Detalle interno del castillo de Heidelberg.
- Plaza Römerberg/chucrut.
- Isla de los museos/Reichstag en día 8.
- Dato UNESCO de Quedlinburg.
- Nota de ferias/congresos.
- Letra pequeña de tarifas aéreas.
- Línea "1 Almuerzo o Cena incluido en: Frankfurt".

### Checklist anti-pérdida (verifica antes de emitir el JSON)
- [ ] ¿Está la tarifa "Desde X €"?
- [ ] ¿Están TODAS las ciudades con sus hoteles correctos?
- [ ] ¿Están TODAS las entradas garantizadas en UN bullet de serviciosIncluidos?
- [ ] ¿Están las 3 cenas + 1 almuerzo en opcionComidasPlus?
- [ ] ¿He reescrito el estilo sin eliminar NINGÚN hecho relevante?

Responde ÚNICAMENTE con el JSON, sin markdown, sin code fences, sin texto adicional.
`;

export const MOBILE_REFORMAT_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string',
      description: 'Título principal del viaje en MAYÚSCULAS. Ej: "ALEMANIA Y SELVA NEGRA"',
    },
    tagline: {
      type: 'string',
      description: 'Tagline bajo el título. Ej: "Dossier Exclusivo de Itinerario • 9 Días y 8 Noches"',
    },
    tarifaDesde: {
      type: 'string',
      description: 'Tarifa "Desde X €". Solo si aparece en el documento original.',
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: {
            type: 'number',
            description: 'Número del día (1, 2, 3…)',
          },
          titulo: {
            type: 'string',
            description: 'Título editorial corto (3-6 palabras). Sin día de semana, sin "CIUDAD - CIUDAD". Puede incluir ciudades entre paréntesis.',
          },
          resumen: {
            type: 'string',
            description: 'Párrafo fluido y acogedor, sin estilo telegráfico. Máximo 2-3 oraciones cortas, estrictamente conciso. Dirigido al viajero con "vosotros" o "tú". Sin "Desayuno". Conserva "Alojamiento." en días 1-8. Cero emojis.',
          },
        },
        required: ['n', 'titulo', 'resumen'],
      },
      description: 'Días del itinerario (sin emojis, sin bullets).',
    },
    serviciosIncluidos: {
      type: 'array',
      items: { type: 'string' },
      description: 'Servicios incluidos como array de strings (~9 bullets reescritos). TODAS las entradas en UN solo bullet.',
    },
    accommodations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ciudad: {
            type: 'string',
            description: 'Nombre de la ciudad.',
          },
          hoteles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Hoteles en esa ciudad (máx 3, abreviados sin ciudad redundante, sin "o similares").',
          },
        },
        required: ['ciudad', 'hoteles'],
      },
      description: 'Alojamientos agrupados por ciudad, ordenados por aparición en el itinerario.',
    },
    opcionComidasPlus: {
      type: 'string',
      description: 'Párrafo único de marketing que agrupa cenas + almuerzo, sin números de día.',
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Notas importantes (documentación, visados, etc.). Solo si aparecen en el original.',
    },
    pageNumber: {
      type: 'number',
      description: 'Número de páginas del PDF original (para metadata).',
    },
  },
  required: ['title', 'days'],
};
