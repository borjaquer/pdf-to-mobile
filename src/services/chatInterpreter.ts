import OpenAI from 'openai';
import type { MobileContent, PdfStyles, ChatResponse, ChatMessage } from '../types';
import { CHAT_DESIGN_SYSTEM_PROMPT, buildChatPrompt } from '../prompts/chatDesignInterpreter';
import { applyTokens, getPalette, getTypography } from '../prompts/designTokens';
import type { TokenSelection } from '../prompts/designTokens';
import { isPrimaryAICircuitOpen, recordPrimaryAIFailure, recordPrimaryAISuccess } from './circuitBreaker';
import { processChatInstruction } from './deepseekApi';

/**
 * ─── SERVICIO DE CHAT CON ARQUITECTURA DE PARCHES (DELTAS) ──
 *
 * ENRUTAMIENTO:
 *   ChatPanel.onSendInstruction
 *     → usePdfConversion.applyChatChanges
 *       → chatInterpreter.interpretChatInstruction
 *         → deepseekApi.processChatInstruction (primario)
 *           → fallback OpenRouter
 *
 * El LLM ya NO devuelve el contenido completo del itinerario.
 * En su lugar, devuelve un ChatResponse con:
 *   - designTokens?: { paletteId, typographyId } (cambios visuales)
 *   - contentPatch?: { title?, priceBanner?, topNote? } (cambios de texto)
 *
 * El parseo fusiona el contentPatch con el contenido actual,
 * evitando errores de JSON corrompido al regenerar contenido completo.
 */

interface ChatInterpretation {
  content: MobileContent;
  styles: PdfStyles;
  tokens: TokenSelection;
  message: string;
  /**
   * Si es true, el intérprete ha detectado que faltan agentName o agentPhone
   * y el flujo DEBE pausarse para solicitarlos antes de continuar.
   */
  requiresAgentData?: boolean;
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

/**
 * Convierte historial de chat interno (ChatMessage[]) al formato
 * de mensajes de OpenAI para enviar a la API.
 */
function buildHistoryMessages(history?: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!history || history.length === 0) return [];
  return history.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.text,
  }));
}

async function callOpenRouter(
  userMessage: string,
  currentContent: MobileContent,
  currentTokens: TokenSelection,
  currentStyles: PdfStyles,
  history?: ChatMessage[],
): Promise<ChatInterpretation> {
  if (!OR_KEY) throw new Error('VITE_OPENROUTER_API_KEY no configurada');

  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OR_KEY,
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
  });

  const prompt = buildChatPrompt(userMessage, currentContent, currentTokens);
  const historyMessages = buildHistoryMessages(history);
  let lastError: unknown;

  for (const model of OR_FALLBACK_MODELS) {
    try {
      console.log(`[chatInterpreter] OpenRouter intentando: ${model}`);
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: CHAT_DESIGN_SYSTEM_PROMPT },
          ...historyMessages,
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const rawJson = completion.choices[0]?.message?.content;
      if (!rawJson) throw new Error(`OpenRouter (${model}) devolvió respuesta vacía`);

      console.log(`[chatInterpreter] OpenRouter éxito con: ${model}`);

      let parsed: ChatResponse;
      try {
        parsed = JSON.parse(rawJson) as ChatResponse;
      } catch {
        throw new Error(`OpenRouter (${model}) devolvió JSON inválido`);
      }

      const patchResult = parsePatchResponse(parsed, currentContent, currentTokens, currentStyles);
      return validateAgentData(patchResult);
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

// ── Parseo y validación de la respuesta por parches ──────────

function parsePatchResponse(
  parsed: ChatResponse,
  currentContent: MobileContent,
  currentTokens: TokenSelection,
  currentStyles: PdfStyles,
): ChatInterpretation {
  // assistantMessage siempre está presente (validado por isChatResponse)
  const message = parsed.assistantMessage || 'No se detectaron cambios.';

  // ── 1. Fusionar contentPatch con el contenido actual ──────────
  // Deep copy completo por JSON para evitar mutación por referencia.
  // Sin esto, mergedContent.days, mergedContent.accommodations, etc.
  // comparten la misma referencia que currentContent, y las mutaciones
  // no detectadas por React impiden la reactividad en el renderizado.
  let mergedContent: MobileContent = JSON.parse(JSON.stringify(currentContent));

  if (parsed.contentPatch && typeof parsed.contentPatch === 'object') {
    const patch = parsed.contentPatch;

    if (patch.title !== undefined && patch.title !== currentContent.title) {
      mergedContent.title = patch.title;
    }

    if (patch.agentName !== undefined) {
      mergedContent.agentName = patch.agentName;
    }

    if (patch.agentPhone !== undefined) {
      mergedContent.agentPhone = patch.agentPhone;
    }

    if (patch.priceBanner !== undefined) {
      mergedContent.priceBanner = patch.priceBanner;
    }

    if (patch.topNote !== undefined) {
      mergedContent.topNote = patch.topNote;
    }

    if (patch.subtitle !== undefined) {
      mergedContent.subtitle = patch.subtitle;
    }

    // ═══════════════════════════════════════════════════════════════
    // DEEP MERGE DE DÍAS POR ÍNDICE
    // ═══════════════════════════════════════════════════════════════
    if (patch.days && Array.isArray(patch.days) && patch.days.length > 0) {
      const mergedDays = currentContent.days ? [...currentContent.days] : [];

      for (const patchDay of patch.days) {
        const idx = patchDay.index;
        if (typeof idx !== 'number' || isNaN(idx) || idx < 0 || idx >= mergedDays.length) {
          console.warn(
            `[chatInterpreter] DeepMerge: índice de día inválido (${idx}). ` +
            `Array actual tiene ${mergedDays.length} días. Saltando...`,
          );
          continue;
        }

        const dayChanges: Record<string, unknown> = {};
        if (patchDay.title !== undefined) dayChanges.title = patchDay.title;
        if (patchDay.summary !== undefined) dayChanges.summary = patchDay.summary;
        if (patchDay.bullets !== undefined) dayChanges.bullets = patchDay.bullets;

        if (Object.keys(dayChanges).length === 0) continue;

        mergedDays[idx] = {
          ...mergedDays[idx],
          ...dayChanges,
        };
      }

      mergedContent.days = mergedDays;
    }

    // ═══════════════════════════════════════════════════════════════
    // DEEP MERGE DE ALOJAMIENTOS POR ÍNDICE
    // ═══════════════════════════════════════════════════════════════
    if (patch.accommodations && Array.isArray(patch.accommodations) && patch.accommodations.length > 0) {
      const mergedAccoms = currentContent.accommodations ? [...currentContent.accommodations] : [];

      for (const patchAccom of patch.accommodations) {
        const idx = patchAccom.index;
        if (typeof idx !== 'number' || isNaN(idx) || idx < 0 || idx >= mergedAccoms.length) {
          console.warn(
            `[chatInterpreter] DeepMerge: índice de alojamiento inválido (${idx}). ` +
            `Array actual tiene ${mergedAccoms.length} alojamientos. Saltando...`,
          );
          continue;
        }

        const accomChanges: Record<string, unknown> = {};
        if (patchAccom.name !== undefined) accomChanges.name = patchAccom.name;
        if (patchAccom.nights !== undefined) accomChanges.nights = patchAccom.nights;
        if (patchAccom.board !== undefined) accomChanges.board = patchAccom.board;
        if (patchAccom.location !== undefined) accomChanges.location = patchAccom.location;

        if (Object.keys(accomChanges).length === 0) continue;

        mergedAccoms[idx] = {
          ...mergedAccoms[idx],
          ...accomChanges,
        };
      }

      mergedContent.accommodations = mergedAccoms;
    }

    // ═══════════════════════════════════════════════════════════════
    // DEEP MERGE DE SERVICIOS POR ÍNDICE (0=included, 1=not_included, 2=optional)
    // ═══════════════════════════════════════════════════════════════
    if (patch.services && Array.isArray(patch.services) && patch.services.length > 0) {
      const mergedServices = currentContent.services ? [...currentContent.services] : [];

      for (const patchSvc of patch.services) {
        const idx = patchSvc.index;
        if (typeof idx !== 'number' || isNaN(idx) || idx < 0 || idx >= mergedServices.length) {
          console.warn(
            `[chatInterpreter] DeepMerge: índice de servicio inválido (${idx}). ` +
            `Array actual tiene ${mergedServices.length} categorías de servicio. Saltando...`,
          );
          continue;
        }

        const svcChanges: Record<string, unknown> = {};
        if (patchSvc.items !== undefined) svcChanges.items = patchSvc.items;

        if (Object.keys(svcChanges).length === 0) continue;

        mergedServices[idx] = {
          ...mergedServices[idx],
          ...svcChanges,
        };
      }

      mergedContent.services = mergedServices;
    }

    // ═══════════════════════════════════════════════════════════════
    // SOBRESCRITURA DIRECTA DE NOTES
    // ═══════════════════════════════════════════════════════════════
    if (patch.notes !== undefined && Array.isArray(patch.notes)) {
      mergedContent.notes = [...patch.notes];
    }
  }

  // ── 2. Aplicar designTokens (si vienen en la respuesta) ──────
  let resolvedTokens: TokenSelection = currentTokens;
  let resolvedStyles: PdfStyles = currentStyles;

  if (parsed.designTokens && typeof parsed.designTokens === 'object') {
    const dt = parsed.designTokens;
    if (typeof dt.paletteId === 'string' && typeof dt.typographyId === 'string') {
      const palette = getPalette(dt.paletteId);
      const typography = getTypography(dt.typographyId);

      resolvedTokens = { paletteId: dt.paletteId, typographyId: dt.typographyId };
      resolvedStyles = applyTokens(currentStyles, palette, typography);
    }
  }

  console.log('[DEBUG Interpreter] Patch aplicado al contenido:', JSON.stringify(mergedContent, null, 2));

  return {
    content: mergedContent,
    styles: resolvedStyles,
    tokens: resolvedTokens,
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
 * ENRUTAMIENTO:
 * 1. Intenta deepseekApi.processChatInstruction (primario)
 * 2. Si falla (circuit breaker, error, o respuesta FullItinerary),
 *    fallback a OpenRouter multi-modelo
 *
 * @param userMessage - Instrucción del usuario en lenguaje natural
 * @param currentContent - Contenido actual del itinerario
 * @param currentStyles - Estilos actuales (PdfStyles)
 * @param currentTokens - Tokens de diseño actuales (paletteId + typographyId)
 * @param history - Historial de conversación (opcional) para mantener contexto
 * @returns Nuevo contenido + nuevos estilos + nuevos tokens + mensaje
 */
// ═══════════════════════════════════════════════════════════════
// VALIDADOR DE REQUISITOS — INTERCEPTOR DE DATOS DEL AGENTE
// ═══════════════════════════════════════════════════════════════
// Se ejecuta ANTES de que el JSON final salga del servicio hacia
// el estado de la aplicación. Si faltan agentName o agentPhone,
// fuerza una pausa en el flujo para solicitarlos.
// ═══════════════════════════════════════════════════════════════

function validateAgentData(interpretation: ChatInterpretation): ChatInterpretation {
  if (!interpretation.content.agentName?.trim() || !interpretation.content.agentPhone?.trim()) {
    interpretation.message =
      'Para que tu itinerario luzca profesional y tus clientes sepan cómo contactarte, ' +
      'por favor indícame tu nombre completo y número de teléfono.';
    interpretation.requiresAgentData = true;
  }
  return interpretation;
}

export async function interpretChatInstruction(
  userMessage: string,
  currentContent: MobileContent,
  currentStyles: PdfStyles,
  currentTokens: TokenSelection,
  history?: ChatMessage[],
): Promise<ChatInterpretation> {
  // ── Circuit breaker: saltar DeepSeek si el circuito está abierto ──
  if (isPrimaryAICircuitOpen()) {
    console.log('[chatInterpreter] Circuit breaker abierto — usando OpenRouter directamente');
    const orResult = await callOpenRouter(userMessage, currentContent, currentTokens, currentStyles, history);
    return validateAgentData(orResult);
  }

  // ── Reintentos controlados de DeepSeek antes de delegar a OpenRouter ──
  const MAX_DEEPSEEK_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_DEEPSEEK_RETRIES; attempt++) {
    try {
      // Llamar a DeepSeek a través de processChatInstruction,
      // que ya valida que la respuesta sea ChatResponse y no el itinerario completo.
      const parsedResponse = await processChatInstruction(
        userMessage,
        currentContent,
        currentTokens,
        history,
      );
      recordPrimaryAISuccess();

      const patchResult = parsePatchResponse(parsedResponse, currentContent, currentTokens, currentStyles);
      return validateAgentData(patchResult);
    } catch (deepseekErr) {
      const errMsg = String(deepseekErr).slice(0, 200);

      if (attempt < MAX_DEEPSEEK_RETRIES) {
        const backoffMs = 1000 * attempt;
        console.warn(
          `[chatInterpreter] DeepSeek intento ${attempt}/${MAX_DEEPSEEK_RETRIES} falló, ` +
          `reintentando en ${backoffMs}ms...`,
          errMsg,
        );
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      console.warn(
        `[chatInterpreter] DeepSeek agotó ${MAX_DEEPSEEK_RETRIES} reintentos. ` +
        `Último error: ${errMsg}. Delegando a OpenRouter...`,
      );
    }
  }

  // ── Todos los reintentos de DeepSeek agotados → fallback a OpenRouter ──
  recordPrimaryAIFailure();
  const orResult = await callOpenRouter(userMessage, currentContent, currentTokens, currentStyles, history);
  return validateAgentData(orResult);
}
