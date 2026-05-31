import OpenAI from 'openai';
import type { MobileContent, PdfStyles } from '../types';
import { CHAT_DESIGN_SYSTEM_PROMPT, buildChatPrompt } from '../prompts/chatDesignInterpreter';
import { applyTokens, getPalette, getTypography } from '../prompts/designTokens';
import type { TokenSelection } from '../prompts/designTokens';
import { isPrimaryAICircuitOpen, recordPrimaryAIFailure, recordPrimaryAISuccess } from './circuitBreaker';
import { validateMobileContent } from '../utils/validateContent';

/**
 * ─── SERVICIO UNIFICADO DE CHAT ──────────────────────────────
 *
 * El LLM recibe el estado completo (content + designTokens) y devuelve
 * el estado completo modificado según la instrucción del usuario.
 *
 * ARQUITECTURA DE INMUTABILIDAD SELECTIVA:
 * - Cambios de texto → modifica solo "content", "designTokens" intacto.
 * - Cambios visuales → modifica solo "designTokens", "content" intacto.
 * - Nunca adivina: lo no pedido se devuelve exactamente igual.
 */

// ── Respuesta unificada del LLM ─────────────────────────────
interface UnifiedChatResponse {
  content: MobileContent;
  designTokens: TokenSelection;
}

interface ChatInterpretation {
  content: MobileContent;
  styles: PdfStyles;
  tokens: TokenSelection;
  message: string;
}

// ── DeepSeek (primario) ──────────────────────────────────────
const DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const DEEPSEEK_BASE = 'https://api.deepseek.com';

async function callDeepSeek(
  userMessage: string,
  currentContent: MobileContent,
  currentTokens: TokenSelection,
  currentStyles: PdfStyles,
): Promise<ChatInterpretation> {
  if (!DEEPSEEK_KEY) throw new Error('VITE_DEEPSEEK_API_KEY no configurada');

  const openai = new OpenAI({
    baseURL: DEEPSEEK_BASE,
    apiKey: DEEPSEEK_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });

  const prompt = buildChatPrompt(userMessage, currentContent, currentTokens);

  const result = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: CHAT_DESIGN_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const rawJson = result.choices[0]?.message?.content;
  if (!rawJson) throw new Error('DeepSeek devolvió respuesta vacía');

  return parseUnifiedResponse(rawJson, currentContent, currentTokens, currentStyles);
}

// ── OpenRouter fallback (cadena multi-modelo) ────────────────
const OR_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;

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

async function callOpenRouter(
  userMessage: string,
  currentContent: MobileContent,
  currentTokens: TokenSelection,
  currentStyles: PdfStyles,
): Promise<ChatInterpretation> {
  if (!OR_KEY) throw new Error('VITE_OPENROUTER_API_KEY no configurada');

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OR_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
  });

  const prompt = buildChatPrompt(userMessage, currentContent, currentTokens);
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
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const rawJson = completion.choices[0]?.message?.content;
      if (!rawJson) throw new Error(`OpenRouter (${model}) devolvió respuesta vacía`);

      console.log(`[chatInterpreter] OpenRouter éxito con: ${model}`);
      return parseUnifiedResponse(rawJson, currentContent, currentTokens, currentStyles);
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

// ── Parseo y validación de la respuesta unificada ────────────

function parseUnifiedResponse(
  rawJson: string,
  currentContent: MobileContent,
  currentTokens: TokenSelection,
  currentStyles: PdfStyles,
): ChatInterpretation {
  let parsed: UnifiedChatResponse;

  try {
    parsed = JSON.parse(rawJson) as UnifiedChatResponse;
  } catch {
    throw new Error('El LLM devolvió JSON inválido');
  }

  // Validar que existe el objeto content
  if (!parsed.content || typeof parsed.content !== 'object') {
    throw new Error('Respuesta inválida: falta "content" o no es un objeto');
  }

  // Validar que existe designTokens con paletteId y typographyId
  if (!parsed.designTokens || typeof parsed.designTokens !== 'object') {
    throw new Error('Respuesta inválida: falta "designTokens" o no es un objeto');
  }
  if (typeof parsed.designTokens.paletteId !== 'string' || !parsed.designTokens.paletteId) {
    throw new Error('Respuesta inválida: falta "designTokens.paletteId" o no es string');
  }
  if (typeof parsed.designTokens.typographyId !== 'string' || !parsed.designTokens.typographyId) {
    throw new Error('Respuesta inválida: falta "designTokens.typographyId" o no es string');
  }

  // Validar que content cumple la estructura MobileContent
  const validatedContent = validateMobileContent(parsed.content);

  // Validar que los IDs de tokens existen en el catálogo
  const palette = getPalette(parsed.designTokens.paletteId);
  const typography = getTypography(parsed.designTokens.typographyId);

  // Detectar qué cambió para el mensaje al usuario
  const contentChanged = JSON.stringify(validatedContent) !== JSON.stringify(currentContent);
  const tokensChanged =
    parsed.designTokens.paletteId !== currentTokens.paletteId ||
    parsed.designTokens.typographyId !== currentTokens.typographyId;

  let message: string;
  if (contentChanged && !tokensChanged) {
    message = 'Contenido actualizado correctamente.';
  } else if (!contentChanged && tokensChanged) {
    message = `Diseño actualizado: paleta "${palette.name}" + tipografía "${typography.name}".`;
  } else if (contentChanged && tokensChanged) {
    message = `Contenido y diseño actualizados: paleta "${palette.name}" + tipografía "${typography.name}".`;
  } else {
    message = 'No se detectaron cambios. ¿Puedes ser más específico?';
  }

  return {
    content: validatedContent,
    styles: applyTokens(currentStyles, palette, typography),
    tokens: parsed.designTokens,
    message,
  };
}

// ═══════════════════════════════════════════════════════════════
// API PÚBLICA
// ═══════════════════════════════════════════════════════════════

/**
 * Interpreta una instrucción de chat en lenguaje natural usando el
 * sistema UNIFICADO de edición.
 *
 * El LLM recibe el estado completo (content + designTokens) y devuelve
 * el estado completo modificado. Solo cambia lo que el usuario pide;
 * el resto se mantiene inmutable.
 *
 * @param userMessage - Instrucción del usuario en lenguaje natural
 * @param currentContent - Contenido actual del itinerario
 * @param currentStyles - Estilos actuales (PdfStyles)
 * @param currentTokens - Tokens de diseño actuales (paletteId + typographyId)
 * @returns Nuevo contenido + nuevos estilos + nuevos tokens + mensaje
 */
export async function interpretChatInstruction(
  userMessage: string,
  currentContent: MobileContent,
  currentStyles: PdfStyles,
  currentTokens: TokenSelection,
): Promise<ChatInterpretation> {
  let interpretation: ChatInterpretation;

  // ── Circuit breaker: saltar DeepSeek si el circuito está abierto ──
  if (isPrimaryAICircuitOpen()) {
    console.log('[chatInterpreter] Circuit breaker abierto — saltando DeepSeek');
    interpretation = await callOpenRouter(userMessage, currentContent, currentTokens, currentStyles);
  } else {
    try {
      interpretation = await callDeepSeek(userMessage, currentContent, currentTokens, currentStyles);
      recordPrimaryAISuccess();
    } catch (deepseekErr) {
      recordPrimaryAIFailure();
      console.warn('[chatInterpreter] DeepSeek falló, intentando OpenRouter...', String(deepseekErr).slice(0, 150));
      interpretation = await callOpenRouter(userMessage, currentContent, currentTokens, currentStyles);
    }
  }

  return interpretation;
}
