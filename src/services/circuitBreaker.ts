/**
 * Circuit Breaker para Gemini.
 *
 * Tras 3 fallos 429 consecutivos, abre el circuito durante 5 minutos
 * para evitar perder tiempo en cada petición. Durante ese periodo
 * todas las llamadas a Gemini se saltan directamente al fallback.
 *
 * Se comparte entre geminiApi.ts (pipeline de conversión) y
 * chatInterpreter.ts (chat de diseño).
 */

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

let consecutiveFailures = 0;
let openUntil = 0;

/** ¿Está el circuito abierto? (Gemini está en cooldown) */
export function isGeminiCircuitOpen(): boolean {
  if (Date.now() < openUntil) return true;

  // El cooldown expiró: resetear
  if (openUntil > 0 && Date.now() >= openUntil) {
    consecutiveFailures = 0;
    openUntil = 0;
    console.log('[circuitBreaker] Circuito CERRADO — Gemini disponible de nuevo');
  }
  return false;
}

/** Registrar un fallo 429 de Gemini. Si se alcanza el umbral, abre el circuito. */
export function recordGeminiFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    openUntil = Date.now() + COOLDOWN_MS;
    console.warn(
      `[circuitBreaker] Circuito ABIERTO hasta ${new Date(openUntil).toLocaleTimeString()} (${consecutiveFailures} fallos 429 consecutivos)`,
    );
  }
}

/** Registrar un éxito de Gemini. Resetea el contador. */
export function recordGeminiSuccess(): void {
  if (consecutiveFailures > 0 || openUntil > 0) {
    console.log('[circuitBreaker] Gemini respondió OK — circuito reseteado');
  }
  consecutiveFailures = 0;
  openUntil = 0;
}
