import OpenAI from 'openai';
import type { MobileContent, ChatResponse, ChatMessage } from '../types';
import type { TokenSelection } from '../prompts/designTokens';
import { MOBILE_REFORMAT_SYSTEM_PROMPT } from '../prompts/mobileReformat';
import { CHAT_DESIGN_SYSTEM_PROMPT, buildChatPrompt } from '../prompts/chatDesignInterpreter';
import { isPrimaryAICircuitOpen, recordPrimaryAISuccess } from './circuitBreaker';
import { validateMobileContent } from '../utils/validateContent';
import { stripMarkdownJson } from '../utils/stripMarkdown';

/**
 * Cliente DeepSeek API directa (OpenAI-compatible).
 *
 * DeepSeek V4 Flash como primario para:
 *   - Reformateo PDF → JSON (extractItineraryFromPdf)
 *   - Chat de diseño por parches (processChatInstruction)
 *
 * API endpoint: https://api.deepseek.com
 * Pricing: ~$0.27/M input tokens, ~$1.10/M output tokens.
 *
 * ═══════════════════════════════════════════════════════════════
 * ARQUITECTURA DE DOS FUNCIONES SEPARADAS
 * ═══════════════════════════════════════════════════════════════
 *
 * extractItineraryFromPdf:  Esquema de contenido COMPLETO (MobileContent).
 *                           Usado exclusivamente en la fase de extracción
 *                           inicial del PDF.
 *
 * processChatInstruction:   Esquema estricto de ChatResponse (deltas).
 *                           SOLO devuelve designTokens + contentPatch.
 *                           Usado desde chatInterpreter.ts para edición
 *                           conversacional.
 *
 * NUNCA mezclar ambas rutas. El enrutamiento se verifica con
 * post-parse validation que rechaza respuestas con el esquema
 * equivocado.
 */

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const DEEPSEEK_BASE = 'https://api.deepseek.com';

function getClient(timeoutMs = 60000): OpenAI {
  if (!API_KEY) throw new Error('VITE_DEEPSEEK_API_KEY no configurada');
  return new OpenAI({
    baseURL: DEEPSEEK_BASE,
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
    timeout: timeoutMs,
  });
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN A: EXTRACCIÓN PDF → MOBILECONTENT
// ═══════════════════════════════════════════════════════════════

function buildExtractPrompt(pdfText: string): string {
  return `Convierte el siguiente texto de PDF en el JSON estructurado descrito en el system prompt.

TEXTO DEL PDF A REFORMATEAR:
---
${pdfText}
---

Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.`;
}

/**
 * Reformatea texto de PDF usando DeepSeek V4 Flash.
 * Pipeline: prompt con ejemplo → DeepSeek V4 Flash (thinking disabled) →
 * stripMarkdownJson() → validateMobileContent()
 *
 * Incluye retry con backoff (3 intentos) para empty content.
 */
export async function extractItineraryFromPdf(pdfText: string): Promise<MobileContent> {
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
          { role: 'user', content: buildExtractPrompt(pdfText) },
        ],
        temperature: 0.3,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      } as any);

      const finishReason = result.choices[0]?.finish_reason;
      const rawJson = result.choices[0]?.message?.content;

      console.log(
        `[DeepSeek-Itinerary] Intento ${attempt}: finish_reason=${finishReason}, content_length=${rawJson?.length ?? 0}`,
      );

      if (!rawJson) {
        console.warn(`[DeepSeek-Itinerary] Intento ${attempt}: respuesta vacía`);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw new Error('DeepSeek devolvió respuesta vacía tras 3 intentos');
      }

      const cleaned = stripMarkdownJson(rawJson);
      console.log('[DeepSeek-Itinerary] JSON limpio (primeros 200 chars):', cleaned.substring(0, 200));

      const parsed = validateMobileContent(JSON.parse(cleaned));
      recordPrimaryAISuccess();
      return parsed;

    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.message.includes('IA devolvió')) {
        throw err;
      }
      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `[DeepSeek-Itinerary] Intento ${attempt} falló, reintentando...`,
          String(err).slice(0, 120),
        );
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN B: CHAT DE DISEÑO → CHATRESPONSE (PARCHES/DELTAS)
// ═══════════════════════════════════════════════════════════════

/**
 * Valida que un objeto parseado sea un ChatResponse válido.
 * Rechaza explícitamente objetos que contengan el esquema completo
 * de MobileContent (ej. con campo "days"), forzando al LLM a
 * respetar el esquema de parches.
 */
function isChatResponse(obj: unknown): obj is ChatResponse {
  if (!obj || typeof obj !== 'object') return false;

  // ── GUARD: Rechazar si contiene el esquema completo de itinerario ──
  // Estos checks miran a nivel RAÍZ del JSON. Si el LLM devuelve
  // contentPatch.days, el campo "days" está anidado y NO es bloqueado.
  // Esto es intencional — contentPatch.days es un array de parches,
  // no el array completo de itinerario.
  if ('days' in obj) return false;
  if ('accommodations' in obj) return false;
  if ('services' in obj) return false;

  const cr = obj as Record<string, unknown>;

  // ── REQUERIDO: assistantMessage debe ser un string no vacío ──
  if (typeof cr.assistantMessage !== 'string' || cr.assistantMessage.trim().length === 0) {
    return false;
  }

  // ── Caso válido: tiene designTokens o contentPatch ──
  if (cr.designTokens !== undefined || cr.contentPatch !== undefined) {
    return true;
  }

  // ── assistantMessage solo también es válido (p. ej. preguntas o aclaraciones) ──
  return Object.keys(cr).length === 1;
}

/**
 * Interpreta una instrucción de chat de diseño usando DeepSeek.
 *
 * A DIFERENCIA de extractItineraryFromPdf, esta función:
 * 1. Usa el System Prompt de chat (CHAT_DESIGN_SYSTEM_PROMPT)
 * 2. Envía el contenido actual + tokens actuales en el user prompt
 * 3. Espera SOLO un ChatResponse (designTokens + contentPatch)
 * 4. Valida post-call que NO sea el itinerario completo
 *
 * @param userMessage - Instrucción del usuario en lenguaje natural
 * @param currentContent - Contenido actual del itinerario
 * @param currentTokens - Tokens de diseño actuales
 * @returns ChatResponse con los parches (deltas) de texto y/o diseño
 */
export async function processChatInstruction(
  userMessage: string,
  currentContent: MobileContent,
  currentTokens: TokenSelection,
  history?: ChatMessage[],
): Promise<ChatResponse> {
  if (isPrimaryAICircuitOpen()) {
    throw new Error('DeepSeek bloqueado por circuit breaker');
  }

  const openai = getClient();
  const prompt = buildChatPrompt(userMessage, currentContent, currentTokens);

  // Construir array de mensajes: system + historial previo + instrucción actual
  const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    history && history.length > 0
      ? history.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.text }))
      : [];

  const result = await openai.chat.completions.create({
    model: 'deepseek-v4-flash',
    messages: [
      { role: 'system', content: CHAT_DESIGN_SYSTEM_PROMPT },
      ...historyMessages,
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: {
      type: 'json_object',
      schema: {
        type: 'object',
        properties: {
          assistantMessage: {
            type: 'string',
            description: 'OBLIGATORIO. Mensaje natural del asistente. Siempre debe informar al usuario de lo que se ha hecho o preguntar si falta información.',
          },
          designTokens: {
            type: 'object',
            properties: {
              paletteId: { type: 'string' },
              typographyId: { type: 'string' },
            },
            required: ['paletteId', 'typographyId'],
            additionalProperties: false,
          },
          contentPatch: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              subtitle: { type: 'string' },
              priceBanner: { type: 'string' },
              topNote: { type: 'string' },
              days: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'number' },
                    title: { type: 'string' },
                    summary: { type: 'string' },
                    bullets: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['index'],
                  additionalProperties: false,
                },
              },
              accommodations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'number' },
                    name: { type: 'string' },
                    nights: { type: 'string' },
                    board: { type: 'string' },
                    location: { type: 'string' },
                  },
                  required: ['index'],
                  additionalProperties: false,
                },
              },
              services: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'number' },
                    items: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['index'],
                  additionalProperties: false,
                },
              },
              notes: {
                type: 'array',
                items: { type: 'string' },
              },
              agentName: {
                type: 'string',
                description: 'Nombre del agente de viajes para el pie de página.',
              },
              agentPhone: {
                type: 'string',
                description: 'Teléfono del agente de viajes para el pie de página.',
              },
            },
            additionalProperties: false,
          },
        },
        required: ['assistantMessage'],
        additionalProperties: false,
      },
    },
    thinking: { type: 'disabled' },
  } as any);

  const rawJson = result.choices[0]?.message?.content;
  if (!rawJson) throw new Error('DeepSeek devolvió respuesta vacía en processChatInstruction');

  const cleaned = stripMarkdownJson(rawJson);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('El LLM devolvió JSON inválido en processChatInstruction');
  }

  // ── VALIDACIÓN ESTRICTA: Rechazar si es MobileContent completo ──
  if (!isChatResponse(parsed)) {
    throw new Error(
      'El LLM devolvió el itinerario completo en lugar del esquema de parches (ChatResponse). ' +
      'Esto indica que el modelo ignoró el system prompt de deltas. ' +
      'Reintenta con OpenRouter fallback.',
    );
  }

  return parsed as ChatResponse;
}

// ═══════════════════════════════════════════════════════════════
// ALIAS BACKWARD-COMPAT
// ═══════════════════════════════════════════════════════════════

/**
 * @deprecated Usa extractItineraryFromPdf() en su lugar.
 * Mantenido para backward compatibility durante la migración.
 */
export const reformatWithDeepSeek = extractItineraryFromPdf;

export default extractItineraryFromPdf;
