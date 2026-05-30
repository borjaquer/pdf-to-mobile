import type { MobileContent, MobileDay, MobileAccommodation, MobileService } from '../types';

/**
 * Validación runtime post-JSON.parse() para MobileContent.
 *
 * La IA (DeepSeek/OpenRouter) puede devolver JSON malformado, incompleto o con
 * campos faltantes. El cast `as MobileContent` de TypeScript no protege en runtime.
 * Esta función actúa como safety net para garantizar que el template de PDF nunca
 * reciba datos corruptos que provoquen crashes como:
 *   TypeError: Cannot read properties of undefined (reading 'length')
 *
 * Estrategia: campos obligatorios lanzan Error, campos opcionales reciben defaults.
 */

// ── Sub-validators ──────────────────────────────────────────────

function validateDay(raw: unknown, index: number): MobileDay {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Día ${index + 1}: no es un objeto`);
  }

  const d = raw as Record<string, unknown>;

  if (typeof d.emoji !== 'string' || !d.emoji.trim()) {
    throw new Error(`Día ${index + 1}: falta "emoji" o no es string`);
  }
  if (typeof d.title !== 'string' || !d.title.trim()) {
    throw new Error(`Día ${index + 1}: falta "title" o no es string`);
  }

  return {
    emoji: d.emoji,
    title: d.title,
    summary: typeof d.summary === 'string' ? d.summary : '',
    bullets: Array.isArray(d.bullets)
      ? d.bullets.filter((b: unknown) => typeof b === 'string')
      : [],
  };
}

function validateAccommodation(raw: unknown, index: number): MobileAccommodation {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Alojamiento ${index + 1}: no es un objeto`);
  }

  const a = raw as Record<string, unknown>;

  if (typeof a.name !== 'string' || !a.name.trim()) {
    throw new Error(`Alojamiento ${index + 1}: falta "name" o no es string`);
  }

  return {
    name: a.name,
    nights: typeof a.nights === 'string' ? a.nights : '',
    board: typeof a.board === 'string' ? a.board : '',
    location: typeof a.location === 'string' ? a.location : '',
  };
}

function validateService(raw: unknown, index: number): MobileService {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Servicio ${index + 1}: no es un objeto`);
  }

  const s = raw as Record<string, unknown>;

  const validCategories = ['included', 'not_included', 'optional'];
  const category = typeof s.category === 'string' ? s.category : '';

  if (!validCategories.includes(category)) {
    throw new Error(
      `Servicio ${index + 1}: "category" debe ser included|not_included|optional, recibido: "${category}"`,
    );
  }

  return {
    category: category as MobileService['category'],
    items: Array.isArray(s.items)
      ? s.items.filter((i: unknown) => typeof i === 'string')
      : [],
  };
}

// ── Validator principal ─────────────────────────────────────────

/**
 * Valida y normaliza un objeto desconocido a MobileContent.
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

  // ── Campos opcionales ──
  const accommodations: MobileAccommodation[] | undefined = Array.isArray(obj.accommodations)
    ? obj.accommodations.map((a, i) => validateAccommodation(a, i))
    : undefined;

  const services: MobileService[] | undefined = Array.isArray(obj.services)
    ? obj.services.map((s, i) => validateService(s, i))
    : undefined;

  const notes: string[] | undefined = Array.isArray(obj.notes)
    ? obj.notes.filter((n: unknown) => typeof n === 'string')
    : undefined;

  const pageNumber: number | undefined = typeof obj.pageNumber === 'number'
    ? obj.pageNumber
    : undefined;

  return {
    title: obj.title as string,
    subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : undefined,
    days,
    accommodations: accommodations && accommodations.length > 0 ? accommodations : undefined,
    services: services && services.length > 0 ? services : undefined,
    notes: notes && notes.length > 0 ? notes : undefined,
    pageNumber,
  };
}

export default validateMobileContent;
