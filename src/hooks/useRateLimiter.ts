import { useState, useCallback } from 'react';
import type { RateLimitState } from '../types';
import { getRateLimitState } from '../services/rateLimiter';

/**
 * Hook que informa al usuario del tiempo de espera restante por rate limiting.
 * Se actualiza cada segundo para mostrar cuenta atrás en tiempo real.
 */
export function useRateLimiter() {
  const [rateState, setRateState] = useState<RateLimitState>(getRateLimitState());

  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    const current = getRateLimitState();
    setRateState(current);

    if (current.isLimited || current.estimatedWaitMs > 0) {
      // Iniciar polling de cuenta atrás
      const interval = setInterval(() => {
        const updated = getRateLimitState();
        setRateState(updated);
        if (!updated.isLimited && updated.estimatedWaitMs === 0) {
          clearInterval(interval);
        }
      }, 1000);

      // Limpiar después de 30s máximo
      setTimeout(() => clearInterval(interval), 30_000);

      return false; // No se puede proceder aún
    }

    return true; // Puede proceder
  }, []);

  return { rateState, checkRateLimit };
}

export default useRateLimiter;
