import OpenAI from 'openai';
import type { MobileContent, PdfStyles } from '../types';
import { CHAT_DESIGN_SYSTEM_PROMPT, buildChatPrompt } from '../prompts/chatDesignInterpreter';
import { isPrimaryAICircuitOpen, recordPrimaryAIFailure, recordPrimaryAISuccess } from './circuitBreaker';
import { validateMobileContent } from '../utils/validateContent';

/**
 * Servicio que interpreta instrucciones de diseño en lenguaje natural
 * y las traduce a mutaciones sobre MobileContent + PdfStyles.
 *
 * Usa DeepSeek V3 como primario, con fallback automático a OpenRouter :free
 * con cadena multi-modelo (prueba varios hasta encontrar uno disponible).
 */

interface ChatInterpretation {
  content: MobileContent;
  styles: PdfStyles;
  message: string;
}

// ── DeepSeek (primario) ──────────────────────────────────────
const DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const DEEPSEEK_BASE = 'https://api.deepseek.com';

async function interpretWithDeepSeek(
  userMessage: string,
  currentContent: MobileContent,
  currentStyles: PdfStyles,
  searchContext?: string,
): Promise<ChatInterpretation> {
  if (!DEEPSEEK_KEY) throw new Error('VITE_DEEPSEEK_API_KEY no configurada');

  const openai = new OpenAI({
    baseURL: DEEPSEEK_BASE,
    apiKey: DEEPSEEK_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });

  const prompt = buildChatPrompt(
    userMessage,
    JSON.stringify(currentContent, null, 2),
    JSON.stringify(currentStyles, null, 2),
    searchContext,
  );

  const result = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: CHAT_DESIGN_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });

  const rawJson = result.choices[0]?.message?.content;
  if (!rawJson) throw new Error('DeepSeek devolvió respuesta vacía');

  const parsed = JSON.parse(rawJson) as ChatInterpretation;
  validateInterpretation(parsed);
  return parsed;
}

// ── OpenRouter fallback (cadena multi-modelo) ────────────────
const OR_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;

/** Modelos :free en orden de preferencia. openrouter/free primero: máxima disponibilidad. */
const OR_FALLBACK_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

function isRateLimitError(err: unknown): boolean {
  const msg = String(err);
  return msg.includes('429') || msg.includes('rate') || msg.includes('quota');
}

async function interpretWithOpenRouter(
  userMessage: string,
  currentContent: MobileContent,
  currentStyles: PdfStyles,
  searchContext?: string,
): Promise<ChatInterpretation> {
  if (!OR_KEY) throw new Error('VITE_OPENROUTER_API_KEY no configurada');

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OR_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
  });

  const prompt = buildChatPrompt(
    userMessage,
    JSON.stringify(currentContent, null, 2),
    JSON.stringify(currentStyles, null, 2),
    searchContext,
  );

  let lastError: unknown;

  for (const model of OR_FALLBACK_MODELS) {
    try {
      console.log(`[chatInterpreter] OpenRouter intentando: ${model}`);
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: CHAT_DESIGN_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
      });

      const rawJson = completion.choices[0]?.message?.content;
      if (!rawJson) throw new Error(`OpenRouter (${model}) devolvió respuesta vacía`);

      const parsed = JSON.parse(rawJson) as ChatInterpretation;
      validateInterpretation(parsed);
      console.log(`[chatInterpreter] OpenRouter éxito con: ${model}`);
      return parsed;
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        console.warn(`[chatInterpreter] ${model} rate-limited, probando siguiente...`);
        continue;
      }
      console.warn(`[chatInterpreter] ${model} falló:`, String(err).slice(0, 120));
    }
  }

  throw lastError ?? new Error('OpenRouter: todos los modelos fallaron');
}

// ── Validación ──────────────────────────────────────────────
function validateInterpretation(result: ChatInterpretation): void {
  // Delegar en validateMobileContent para validación completa de content
  result.content = validateMobileContent(result.content);

  if (!result.styles || typeof result.styles !== 'object') {
    throw new Error('Respuesta inválida: falta "styles"');
  }
  if (typeof result.styles.fontSize !== 'number') {
    throw new Error('Respuesta inválida: "styles.fontSize" no es número');
  }
}

// ── API pública ─────────────────────────────────────────────

/**
 * Interpreta una instrucción de diseño en lenguaje natural.
 * Intenta con DeepSeek primero; si falla, usa OpenRouter con cadena multi-modelo.
 *
 * @param searchContext - Opcional: resultados de búsqueda web para enriquecer la interpretación
 * @returns Nuevo contenido, nuevos estilos y mensaje explicativo
 */
export async function interpretChatInstruction(
  userMessage: string,
  currentContent: MobileContent,
  currentStyles: PdfStyles,
  searchContext?: string,
): Promise<ChatInterpretation> {
  // ── Circuit breaker: saltar DeepSeek si el circuito está abierto ──
  if (isPrimaryAICircuitOpen()) {
    console.log('[chatInterpreter] Circuit breaker abierto — saltando DeepSeek');
    return await interpretWithOpenRouter(userMessage, currentContent, currentStyles, searchContext);
  }

  try {
    const result = await interpretWithDeepSeek(userMessage, currentContent, currentStyles, searchContext);
    recordPrimaryAISuccess();
    return result;
  } catch (deepseekErr) {
    recordPrimaryAIFailure();
    console.warn('[chatInterpreter] DeepSeek falló, intentando OpenRouter...', String(deepseekErr).slice(0, 150));
    return await interpretWithOpenRouter(userMessage, currentContent, currentStyles, searchContext);
  }
}
