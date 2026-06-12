import OpenAI from 'openai';
import type { MobileContent } from '../types';
import { MOBILE_REFORMAT_SYSTEM_PROMPT } from '../prompts/mobileReformat';
import { validateMobileContent } from '../utils/validateContent';

/**
 * Cliente OpenRouter como fallback automático para la IA.
 * Cadena de fallback multi-modelo: prueba varios modelos :free
 * hasta encontrar uno disponible. El último eslabón es
 * openrouter/free — router automático que selecciona cualquier
 * modelo gratuito disponible.
 */

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * Modelos :free en orden de preferencia.
 * openrouter/free primero: el router automático selecciona el modelo
 * gratuito con mejor disponibilidad sin iterar por la cadena.
 * Los modelos explícitos son fallback si el router falla.
 */
const FALLBACK_MODELS = [
  'openrouter/free', // router automático — máxima disponibilidad
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

function getClient(timeoutMs = 30000): OpenAI {
  if (!API_KEY) throw new Error('VITE_OPENROUTER_API_KEY no configurada');
  return new OpenAI({
    baseURL: OPENROUTER_BASE,
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 0, // sin auto-reintentos — la cadena de fallback ya itera
    timeout: timeoutMs,
  });
}

/**
 * Intenta la llamada con un modelo. Si falla con 429 (rate-limit),
 * pasa al siguiente de la cadena.
 */
async function tryWithModel(
  openai: OpenAI,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });

  const rawJson = completion.choices[0]?.message?.content;
  if (!rawJson) throw new Error(`OpenRouter (${model}) devolvió respuesta vacía`);
  return rawJson;
}

function isRateLimitError(err: unknown): boolean {
  const msg = String(err);
  return msg.includes('429') || msg.includes('rate') || msg.includes('quota');
}

/**
 * Reformatea texto de PDF usando OpenRouter con cadena de fallback.
 * Prueba modelos en secuencia hasta que uno responda.
 */
export async function reformatWithOpenRouter(pdfText: string): Promise<MobileContent> {
  const openai = getClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: MOBILE_REFORMAT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Convierte el siguiente texto de PDF en un JSON estructurado siguiendo el formato indicado. Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.

TEXTO DEL PDF:
---
${pdfText}
---

Responde con este formato JSON:
{
  "title": "string",
  "tagline": "string (frase gancho bajo el título)",
  "subtitle": "string (opcional)",
  "tarifaDesde": "string (ej: '1.425€')",
  "days": [{ "n": number, "titulo": "string", "resumen": "string" }],
  "serviciosIncluidos": ["string"],
  "accommodations": [{ "ciudad": "string", "hoteles": ["string"] }],
  "opcionComidasPlus": "string (párrafo describiendo el upgrade de comidas)",
  "notes": ["string"],
  "pageNumber": number
}`,
    },
  ];

  let lastError: unknown;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`[openRouterApi] Intentando con modelo: ${model}`);
      const rawJson = await tryWithModel(openai, model, messages);
      const parsed = validateMobileContent(JSON.parse(rawJson));
      console.log(`[openRouterApi] Éxito con modelo: ${model}`);
      return parsed;
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        console.warn(`[openRouterApi] ${model} rate-limited, probando siguiente...`);
        continue;
      }
      // Error no-rate-limit (ej. 404 modelo no encontrado): seguir también
      console.warn(`[openRouterApi] ${model} falló:`, String(err).slice(0, 120));
    }
  }

  throw lastError ?? new Error('OpenRouter: todos los modelos fallaron');
}

export default reformatWithOpenRouter;
