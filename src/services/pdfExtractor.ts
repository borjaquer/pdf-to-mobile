import pdfToText from 'react-pdftotext';
import { fixCharset } from '../utils/charsetFixer';

/**
 * Extrae el texto de un archivo PDF usando react-pdftotext (pdf.js wrapper).
 * Aplica corrección de charset para manejar tildes, eñes, etc.
 *
 * @param file — Archivo PDF subido por el usuario
 * @returns Texto plano extraído con encoding corregido
 * @throws Error si el PDF está corrupto, protegido o es ilegible
 */
export async function extractPdfText(file: File): Promise<string> {
  const rawText = await pdfToText(file);

  if (!rawText || rawText.trim().length === 0) {
    throw new Error(
      'No se pudo extraer texto del PDF. Puede estar escaneado (imágenes), protegido o corrupto.',
    );
  }

  // Corregir encoding: tildes, eñes, caracteres mal codificados
  const cleanText = fixCharset(rawText);

  // Normalizar espacios excesivos y líneas vacías
  const normalized = cleanText
    .replace(/[ \t]{3,}/g, '  ')   // colapsar espacios múltiples
    .replace(/\n{3,}/g, '\n\n');    // colapsar líneas vacías múltiples

  return normalized.trim();
}

export default extractPdfText;
