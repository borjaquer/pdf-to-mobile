import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import type { MobileContent, PdfStyles } from '../types';
import { CHAT_DESIGN_SYSTEM_PROMPT, buildChatPrompt } from '../prompts/chatDesignInterpreter';
import { isGeminiCircuitOpen, recordGeminiFailure, recordGeminiSuccess } from './circuitBreaker';

/**
 * Servicio que interpreta instrucciones de diseño en lenguaje natural
 * y las traduce a mutaciones sobre MobileContent + PdfStyles.
 *
 * Usa Gemini 2.5 Flash como primario, con fallback automático a OpenRouter :free
 * con cadena multi-modelo (prueba varios hasta encontrar uno disponible).
 */

interface ChatInterpretation {
  content: MobileContent;
  styles: PdfStyles;
  message: string;
}

// ── Gemini ──────────────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

async function interpretWithGemini(
  userMessage: string,
  currentContent: MobileContent,
  currentStyles: PdfStyles,
  searchContext?: string,
): Promise<ChatInterpretation> {
  if (!GEMINI_KEY) throw new Error('VITE_GEMINI_API_KEY no configurada');

  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildChatPrompt(
    userMessage,
    JSON.stringify(currentContent, null, 2),
    JSON.stringify(currentStyles, null, 2),
    searchContext,
  );

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `${CHAT_DESIGN_SYSTEM_PROMPT}\n\n${prompt}` }] }],
  });

  const text = result.response.text();
  if (!text) throw new Error('Gemini devolvió respuesta vacía');

  const parsed = JSON.parse(text) as ChatInterpretation;
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
    maxRetries: 0, // sin auto-reintentos — la cadena de fallback ya itera
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
  if (!result.content || typeof result.content !== 'object') {
    throw new Error('Respuesta inválida: falta "content"');
  }
  if (!result.content.title || !Array.isArray(result.content.days)) {
    throw new Error('Respuesta inválida: "content" no tiene title/days');
  }
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
 * Intenta con Gemini primero; si falla, usa OpenRouter con cadena multi-modelo.
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
  // ── Circuit breaker: saltar Gemini si el circuito está abierto ──
  if (isGeminiCircuitOpen()) {
    console.log('[chatInterpreter] Circuit breaker abierto — saltando Gemini');
    return await interpretWithOpenRouter(userMessage, currentContent, currentStyles, searchContext);
  }

  try {
    const result = await interpretWithGemini(userMessage, currentContent, currentStyles, searchContext);
    recordGeminiSuccess();
    return result;
  } catch (geminiErr) {
    recordGeminiFailure();
    console.warn('[chatInterpreter] Gemini falló, intentando OpenRouter...', String(geminiErr).slice(0, 150));
    return await interpretWithOpenRouter(userMessage, currentContent, currentStyles, searchContext);
  }
}
