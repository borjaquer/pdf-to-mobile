import OpenAI from 'openai';
import type { MobileContent } from '../types';
import { MOBILE_REFORMAT_SYSTEM_PROMPT } from '../prompts/mobileReformat';
import { isPrimaryAICircuitOpen, recordPrimaryAISuccess } from './circuitBreaker';

/**
 * Cliente DeepSeek API directa (OpenAI-compatible).
 *
 * DeepSeek V3 (modelo "deepseek-chat") como primario para reformateo PDF → JSON.
 * API endpoint: https://api.deepseek.com
 * Pricing: ~$0.27/M input tokens, ~$1.10/M output tokens (mucho más barato que GPT-4o).
 *
 * A diferencia de Gemini free tier, DeepSeek es API de pago sin rate limits tan
 * restrictivos. No necesitamos rate limiter agresivo ni circuit breaker por 429.
 *
 * Pipeline: PDF text → DeepSeek V3 → JSON estructurado (MobileContent)
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
  return `${MOBILE_REFORMAT_SYSTEM_PROMPT}

TEXTO DEL PDF A REFORMATEAR:
---
${pdfText}
---

Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.`;
}

/**
 * Reformatea texto de PDF usando DeepSeek V3.
 *
 * Si el texto es muy largo (>32K tokens), el propio modelo lo maneja
 * — DeepSeek V3 tiene 128K de contexto.
 */
export async function reformatWithDeepSeek(pdfText: string): Promise<MobileContent> {
  // Circuit breaker: rechazar si el circuito está abierto (raro con DeepSeek, pero por si acaso)
  if (isPrimaryAICircuitOpen()) {
    throw new Error('DeepSeek bloqueado por circuit breaker (demasiados fallos consecutivos)');
  }

  const openai = getClient();

  const result = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: MOBILE_REFORMAT_SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(pdfText) },
    ],
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });

  const rawJson = result.choices[0]?.message?.content;
  if (!rawJson) throw new Error('DeepSeek devolvió respuesta vacía');

  const parsed = JSON.parse(rawJson) as MobileContent;
  recordPrimaryAISuccess();
  return parsed;
}

export default reformatWithDeepSeek;
