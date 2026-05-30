/**
 * Divide textos largos en chunks para respetar el contexto del LLM.
 * Gemini 2.5 Flash tiene 1M tokens de contexto (~4M caracteres).
 * Troceamos a 100K caracteres (~25K tokens) para mantener respuestas rápidas.
 */

const MAX_CHUNK_CHARS = 100_000; // ~25K tokens, bien por debajo del límite de 1M

/**
 * Divide un texto en chunks respetando límites de párrafo (saltos de línea dobles)
 * para no cortar frases a mitad.
 */
export function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_CHARS) {
      chunks.push(remaining);
      break;
    }

    // Buscar el último salto de línea doble antes del límite
    const slice = remaining.slice(0, MAX_CHUNK_CHARS);
    const lastDoubleNewline = slice.lastIndexOf('\n\n');

    let cutPoint: number;
    if (lastDoubleNewline > MAX_CHUNK_CHARS * 0.5) {
      // Cortar en párrafo si está en la segunda mitad del chunk
      cutPoint = lastDoubleNewline + 2;
    } else {
      // Fallback: cortar en el último salto de línea simple
      const lastNewline = slice.lastIndexOf('\n');
      cutPoint = lastNewline > 0 ? lastNewline + 1 : MAX_CHUNK_CHARS;
    }

    chunks.push(remaining.slice(0, cutPoint).trim());
    remaining = remaining.slice(cutPoint).trim();
  }

  return chunks;
}

export default chunkText;
