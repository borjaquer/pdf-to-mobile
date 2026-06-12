import type { MobileContent, MobileDay, MobileAccommodation, BottomBanner } from '../types';

/**
 * Validación runtime post-JSON.parse() para MobileContent v3 (dossier móvil).
 *
 * La IA (DeepSeek/OpenRouter) puede devolver JSON malformado, incompleto o con
 * campos faltantes. El cast `as MobileContent` de TypeScript no protege en runtime.
 * Esta función actúa como safety net para garantizar que el template de PDF nunca
 * reciba datos corruptos.
 *
 * Estrategia: campos obligatorios lanzan Error, campos opcionales reciben defaults.
 */

// ── Sub-validators ──────────────────────────────────────────────

function validateDay(raw: unknown, index: number): MobileDay {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Día ${index + 1}: no es un objeto`);
  }

  const d = raw as Record<string, unknown>;

  if (typeof d.titulo !== 'string' || !d.titulo.trim()) {
    throw new Error(`Día ${index + 1}: falta "titulo" o no es string`);
  }

  return {
    n: typeof d.n === 'number' ? d.n : index + 1,
    titulo: d.titulo,
    resumen: typeof d.resumen === 'string' ? d.resumen : '',
  };
}

function validateAccommodation(raw: unknown, index: number): MobileAccommodation {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Alojamiento ${index + 1}: no es un objeto`);
  }

  const a = raw as Record<string, unknown>;

  if (typeof a.ciudad !== 'string' || !a.ciudad.trim()) {
    throw new Error(`Alojamiento ${index + 1}: falta "ciudad" o no es string`);
  }

  return {
    ciudad: a.ciudad,
    hoteles: Array.isArray(a.hoteles)
      ? a.hoteles.filter((h: unknown) => typeof h === 'string' && h.trim())
      : [],
  };
}

function validateBottomBanner(raw: unknown): BottomBanner | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const b = raw as Record<string, unknown>;

  const validTypes = ['price', 'warning', 'info'];
  const type = typeof b.type === 'string' && validTypes.includes(b.type)
    ? b.type as BottomBanner['type']
    : undefined;

  if (!type) return undefined;

  return {
    title: typeof b.title === 'string' && b.title.trim() ? b.title.trim() : undefined,
    text: typeof b.text === 'string' ? b.text.trim() : '',
    type,
  };
}

// ── Validator principal ─────────────────────────────────────────

/**
 * Valida y normaliza un objeto desconocido a MobileContent v3.
 *
 * @param raw - Resultado de JSON.parse() sobre la respuesta de la IA
 * @returns MobileContent validado y con defaults seguros
 * @throws Error si faltan campos obligatorios (title) o la estructura es inválida
 */
export function validateMobileContent(raw: unknown): MobileContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('IA devolvió respuesta no válida (no es un objeto JSON)');
  }

  const obj = raw as Record<string, unknown>;

  // ── Campo obligatorio: title ──
  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    throw new Error('IA devolvió respuesta sin título válido');
  }

  // ── Campo obligatorio: days (array, con fallback a []) ──
  const days: MobileDay[] = Array.isArray(obj.days)
    ? obj.days.map((d, i) => validateDay(d, i))
    : [];

  // ── Campos opcionales v3 ──
  const accommodations: MobileAccommodation[] | undefined = Array.isArray(obj.accommodations)
    ? obj.accommodations.map((a, i) => validateAccommodation(a, i))
    : undefined;

  const serviciosIncluidos: string[] | undefined = Array.isArray(obj.serviciosIncluidos)
    ? obj.serviciosIncluidos.filter((s: unknown) => typeof s === 'string' && s.trim())
    : undefined;

  const opcionComidasPlus: string | undefined =
    typeof obj.opcionComidasPlus === 'string' && obj.opcionComidasPlus.trim()
      ? obj.opcionComidasPlus.trim()
      : undefined;

  const notes: string[] | undefined = Array.isArray(obj.notes)
    ? obj.notes.filter((n: unknown) => typeof n === 'string')
    : undefined;

  const pageNumber: number | undefined = typeof obj.pageNumber === 'number'
    ? obj.pageNumber
    : undefined;

  // ── Campos compatibles con chat de edición ──
  const bottomBanner: BottomBanner | undefined = validateBottomBanner(obj.bottomBanner);
  const topNote: string | undefined = typeof obj.topNote === 'string' && obj.topNote.trim()
    ? obj.topNote.trim()
    : undefined;

  return {
    title: obj.title as string,
    tagline: typeof obj.tagline === 'string' ? obj.tagline : undefined,
    tarifaDesde: typeof obj.tarifaDesde === 'string' ? obj.tarifaDesde : undefined,
    days,
    accommodations: accommodations && accommodations.length > 0 ? accommodations : undefined,
    serviciosIncluidos: serviciosIncluidos && serviciosIncluidos.length > 0 ? serviciosIncluidos : undefined,
    opcionComidasPlus,
    notes: notes && notes.length > 0 ? notes : undefined,
    pageNumber,
    bottomBanner,
    topNote,
    priceBanner: typeof obj.priceBanner === 'string' ? obj.priceBanner : undefined,
    agentName: typeof obj.agentName === 'string' ? obj.agentName : undefined,
    agentPhone: typeof obj.agentPhone === 'string' ? obj.agentPhone : undefined,
  };
}

export default validateMobileContent;
