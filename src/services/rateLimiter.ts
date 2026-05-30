import type { RateLimitState } from '../types';

/**
 * Rate limiter para Gemini free tier: 10 RPM = 1 petición cada 6 segundos.
 * Implementa una cola simple con timestamps para respetar el límite.
 */

const MIN_INTERVAL_MS = 6_000; // 6 segundos = 10 RPM
const MAX_RPD = 250;

let lastRequestTime = 0;
let requestsToday = 0;
let dayResetTime = new Date(new Date().toDateString()).getTime() + 24 * 60 * 60 * 1000;

function checkDayReset() {
  const now = Date.now();
  if (now >= dayResetTime) {
    requestsToday = 0;
    dayResetTime = new Date(new Date().toDateString()).getTime() + 24 * 60 * 60 * 1000;
  }
}

export function getRateLimitState(): RateLimitState {
  checkDayReset();

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const waitMs = Math.max(0, MIN_INTERVAL_MS - timeSinceLastRequest);
  const remainingRPM = Math.max(0, Math.floor((60_000 - (now - lastRequestTime)) / MIN_INTERVAL_MS));
  const remainingRPD = Math.max(0, MAX_RPD - requestsToday);

  return {
    remainingRequests: Math.min(remainingRPM, remainingRPD),
    resetTime: new Date(dayResetTime),
    estimatedWaitMs: waitMs,
    isLimited: remainingRPD <= 0 || (timeSinceLastRequest < MIN_INTERVAL_MS && remainingRPM <= 0),
  };
}

/**
 * Espera hasta que haya un slot disponible para hacer la petición.
 * Si se excede el RPD, lanza error.
 */
export async function waitForSlot(): Promise<void> {
  checkDayReset();

  if (requestsToday >= MAX_RPD) {
    throw new Error('Límite diario de peticiones alcanzado (250 RPD). Vuelve a intentarlo mañana o usa OpenRouter como fallback.');
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_INTERVAL_MS) {
    const waitMs = MIN_INTERVAL_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  lastRequestTime = Date.now();
  requestsToday++;
}

export default { getRateLimitState, waitForSlot };
