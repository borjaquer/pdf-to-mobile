import OpenAI from 'openai';
import type { MobileContent } from '../types';
import { MOBILE_REFORMAT_SYSTEM_PROMPT } from '../prompts/mobileReformat';

/**
 * Cliente OpenRouter como fallback automático para la IA.
 * Usa modelos :free (sin coste) con SDK OpenAI-compatible.
 */

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const FREE_MODEL = 'google/gemma-4-31b-it:free';
// Alternativas :free (si el primario no está disponible):
// - 'google/gemma-4-26b-a4b-it:free'
// - 'qwen/qwen3-next-80b-a3b-instruct:free'
// - 'meta-llama/llama-3.3-70b-instruct:free'

function getClient(): OpenAI {
  if (!API_KEY) throw new Error('VITE_OPENROUTER_API_KEY no configurada');
  return new OpenAI({
    baseURL: OPENROUTER_BASE,
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true, // client-side
  });
}

/**
 * Reformatea texto de PDF usando OpenRouter como fallback.
 */
export async function reformatWithOpenRouter(pdfText: string): Promise<MobileContent> {
  const openai = getClient();

  const completion = await openai.chat.completions.create({
    model: FREE_MODEL,
    messages: [
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
  "subtitle": "string (opcional)",
  "days": [{ "emoji": "string", "title": "string", "summary": "string", "bullets": ["string"] }],
  "accommodations": [{ "name": "string", "nights": "string", "board": "string", "location": "string" }],
  "services": [{ "category": "included|not_included|optional", "items": ["string"] }],
  "notes": ["string"],
  "pageNumber": number
}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });

  const rawJson = completion.choices[0]?.message?.content;
  if (!rawJson) throw new Error('OpenRouter devolvió respuesta vacía');

  const parsed = JSON.parse(rawJson) as MobileContent;
  return parsed;
}

export default reformatWithOpenRouter;
