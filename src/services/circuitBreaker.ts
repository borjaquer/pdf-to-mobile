/**
 * Circuit Breaker para la IA primaria (DeepSeek API directa, antes Gemini).
 *
 * Tras 3 fallos consecutivos, abre el circuito durante 5 minutos
 * para evitar perder tiempo en cada petición. Durante ese periodo
 * todas las llamadas a la IA primaria se saltan directamente al fallback.
 *
 * Se comparte entre deepseekApi.ts (pipeline de conversión) y
 * chatInterpreter.ts (chat de diseño).
 *
 * Compatibilidad hacia atrás: las funciones legacy (isGeminiCircuitOpen,
 * recordGeminiFailure, recordGeminiSuccess) redirigen a las nuevas.
 */

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

let consecutiveFailures = 0;
let openUntil = 0;

/** ¿Está el circuito abierto? (IA primaria en cooldown) */
export function isPrimaryAICircuitOpen(): boolean {
  if (Date.now() < openUntil) return true;

  // El cooldown expiró: resetear
  if (openUntil > 0 && Date.now() >= openUntil) {
    consecutiveFailures = 0;
    openUntil = 0;
    console.log('[circuitBreaker] Circuito CERRADO — IA primaria disponible de nuevo');
  }
  return false;
}

/** Registrar un fallo de la IA primaria. Si se alcanza el umbral, abre el circuito. */
export function recordPrimaryAIFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    openUntil = Date.now() + COOLDOWN_MS;
    console.warn(
      `[circuitBreaker] Circuito ABIERTO hasta ${new Date(openUntil).toLocaleTimeString()} (${consecutiveFailures} fallos consecutivos)`,
    );
  }
}

/** Registrar un éxito de la IA primaria. Resetea el contador. */
export function recordPrimaryAISuccess(): void {
  if (consecutiveFailures > 0 || openUntil > 0) {
    console.log('[circuitBreaker] IA primaria respondió OK — circuito reseteado');
  }
  consecutiveFailures = 0;
  openUntil = 0;
}

// ── Compatibilidad hacia atrás (legacy Gemini) ──────────────────
/** @deprecated Usar isPrimaryAICircuitOpen() */
export const isGeminiCircuitOpen = isPrimaryAICircuitOpen;
/** @deprecated Usar recordPrimaryAIFailure() */
export const recordGeminiFailure = recordPrimaryAIFailure;
/** @deprecated Usar recordPrimaryAISuccess() */
export const recordGeminiSuccess = recordPrimaryAISuccess;
