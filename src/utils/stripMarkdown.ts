/**
 * Utilidad para limpiar respuestas JSON de IA.
 *
 * DeepSeek API ocasionalmente envuelve el JSON en code fences markdown
 * (```json ... ```) o incluye BOM (\uFEFF) al inicio de la respuesta.
 * Esta función normaliza la respuesta antes del JSON.parse().
 */

export function stripMarkdownJson(raw: string): string {
  let cleaned = raw.trim();

  // Quitar BOM (Byte Order Mark) si existe — común en respuestas de IA
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1).trim();
  }

  // Quitar ```json ... ``` o ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return cleaned;
}

export default stripMarkdownJson;
