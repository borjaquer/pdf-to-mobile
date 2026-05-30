/**
 * Servicio de búsqueda web vía Firecrawl Search API.
 *
 * Llamada directa desde el navegador usando VITE_FIRECRAWL_API_KEY.
 * Firecrawl free tier: 500 créditos/mes (~50 búsquedas con extracción).
 *
 * Se usa para enriquecer las instrucciones del chat de diseño con
 * información actualizada de la web (tendencias, inspiración, datos).
 */

const FIRECRAWL_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY as string;

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Busca en la web usando Firecrawl Search API.
 *
 * @param query - Consulta de búsqueda en lenguaje natural
 * @param limit - Número máximo de resultados (default 5)
 * @returns Array de resultados con título, URL y snippet
 */
export async function searchWeb(
  query: string,
  limit: number = 5,
): Promise<SearchResult[]> {
  if (!FIRECRAWL_KEY) {
    console.warn('[webSearch] VITE_FIRECRAWL_API_KEY no configurada. Búsqueda deshabilitada.');
    return [];
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[webSearch] Firecrawl API error ${response.status}:`, errorText);
      return [];
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.data)) {
      console.warn('[webSearch] Respuesta inesperada de Firecrawl:', data);
      return [];
    }

    return data.data.map((item: Record<string, unknown>) => ({
      title: String(item.title ?? ''),
      url: String(item.url ?? ''),
      snippet: String(item.markdown ?? item.description ?? item.snippet ?? ''),
    }));
  } catch (err) {
    console.error('[webSearch] Error de red al buscar:', err);
    return [];
  }
}

/**
 * Detecta si un mensaje del usuario contiene intención de búsqueda web.
 *
 * Heurística simple basada en palabras clave sin necesidad de LLM.
 * Busca patrones como:
 * - "busca ..." / "search ..."
 * - "qué es ..." / "qué son ..." (preguntas factuales)
 * - "tendencias ..." / "inspiración ..."
 * - URLs mencionadas
 *
 * @returns La query de búsqueda extraída, o null si no hay intención.
 */
export function detectSearchIntent(message: string): string | null {
  const trimmed = message.trim();

  // Patrones explícitos de búsqueda
  const explicitPatterns = [
    /^busca\s+(.+)/i,
    /^busc(?:á|a)\s+(.+)/i,
    /^search\s+(.+)/i,
    /^investiga\s+(.+)/i,
    /^inf[óo]rmate\s+(?:sobre\s+)?(.+)/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  // Patrones de pregunta factual (necesitan datos externos)
  const factualPatterns = [
    /^qu[ée]\s+(?:es|son)\s+(.+?)\??$/i,
    /^cu[aá](?:l|les)\s+(?:es|son)\s+(.+?)\??$/i,
    /^cu[aá]nto\s+(.+?)\??$/i,
    /^d[óo]nde\s+(.+?)\??$/i,
    /^cu[áa]ndo\s+(.+?)\??$/i,
  ];

  for (const pattern of factualPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  // Patrones de inspiración / tendencias
  const inspirationPatterns = [
    /(?:tendencias?|inspiraci[oó]n|ideas?\s+(?:para|de))\s+(?:de\s+)?(.+)/i,
    /(?:ejemplos?\s+(?:de|sobre)|referencias?\s+(?:de|sobre))\s+(.+)/i,
    /(?:recomi[ée]ndame|sugiere|prop[oó]n)\s+(.+)/i,
  ];

  for (const pattern of inspirationPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

/**
 * Formatea resultados de búsqueda en un bloque de contexto para el LLM.
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const lines = results.map((r, i) =>
    `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet.slice(0, 500)}`,
  );

  return `RESULTADOS DE BÚSQUEDA WEB:\n${lines.join('\n\n')}`;
}
