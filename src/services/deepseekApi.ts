import OpenAI from 'openai';
import type { MobileContent } from '../types';
import { MOBILE_REFORMAT_SYSTEM_PROMPT } from '../prompts/mobileReformat';
import { isPrimaryAICircuitOpen, recordPrimaryAISuccess } from './circuitBreaker';
import { validateMobileContent } from '../utils/validateContent';
import { stripMarkdownJson } from '../utils/stripMarkdown';

/**
 * Cliente DeepSeek API directa (OpenAI-compatible).
 *
 * DeepSeek V4 Flash como primario para reformateo PDF → JSON.
 * API endpoint: https://api.deepseek.com
 * Pricing: ~$0.27/M input tokens, ~$1.10/M output tokens (mucho más barato que GPT-4o).
 *
 * Pipeline: PDF text → DeepSeek V4 Flash → stripMarkdownJson → validateMobileContent
 * Fallback: OpenRouter (en usePdfConversion.ts)
 */

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const DEEPSEEK_BASE = 'https://api.deepseek.com';

function getClient(): OpenAI {
  if (!API_KEY) throw new Error('VITE_DEEPSEEK_API_KEY no configurada');
  return new OpenAI({
    baseURL: DEEPSEEK_BASE,
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
}

function buildPrompt(pdfText: string): string {
  return `Convierte el siguiente texto de PDF en el JSON estructurado descrito en el system prompt.

TEXTO DEL PDF A REFORMATEAR:
---
${pdfText}
---

Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.`;
}

/**
 * Reformatea texto de PDF usando DeepSeek V4 Flash.
 *
 * Pipeline: prompt con ejemplo → DeepSeek V4 Flash (thinking disabled) →
 * stripMarkdownJson() → validateMobileContent()
 *
 * Incluye retry con backoff (3 intentos) para empty content
 * (fallo documentado por DeepSeek como "ocasional").
 */
export async function reformatWithDeepSeek(pdfText: string): Promise<MobileContent> {
  if (isPrimaryAICircuitOpen()) {
    throw new Error('DeepSeek bloqueado por circuit breaker (demasiados fallos consecutivos)');
  }

  const openai = getClient();
  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await openai.chat.completions.create({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: MOBILE_REFORMAT_SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(pdfText) },
        ],
        temperature: 0.3,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        // DeepSeek-specific: deshabilitar thinking mode.
        // Se pasa como propiedad extra vía 'as any' porque el tipado
        // del SDK de OpenAI no conoce este campo, pero DeepSeek sí lo acepta.
        thinking: { type: 'disabled' },
      } as any);

      const finishReason = result.choices[0]?.finish_reason;
      const rawJson = result.choices[0]?.message?.content;

      console.log(
        `[DeepSeek] Intento ${attempt}: finish_reason=${finishReason}, content_length=${rawJson?.length ?? 0}`,
      );

      // Empty content: reintentar con backoff
      if (!rawJson) {
        console.warn(`[DeepSeek] Intento ${attempt}: respuesta vacía`);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw new Error('DeepSeek devolvió respuesta vacía tras 3 intentos');
      }

      // Limpiar markdown fences y BOM antes de parsear
      const cleaned = stripMarkdownJson(rawJson);
      console.log('[DeepSeek] JSON limpio (primeros 200 chars):', cleaned.substring(0, 200));

      const parsed = validateMobileContent(JSON.parse(cleaned));
      recordPrimaryAISuccess();
      return parsed;

    } catch (err) {
      lastError = err;
      // Error de validación: no reintentar (datos corruptos, no transitorio)
      if (err instanceof Error && err.message.includes('IA devolvió')) {
        throw err;
      }
      // Otros errores (red, rate-limit, etc.): reintentar
      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `[DeepSeek] Intento ${attempt} falló, reintentando en ${attempt}s...`,
          String(err).slice(0, 120),
        );
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

export default reformatWithDeepSeek;
