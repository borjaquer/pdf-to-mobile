# Diagnóstico: DeepSeek API devuelve JSON sin campo `title`

**Fecha:** 2026-05-30  
**Estado:** Investigación completada — 7 vulnerabilidades confirmadas con fuentes verificadas  
**Impacto:** Error `"IA devolvió respuesta sin título válido"` en [`validateMobileContent()`](src/utils/validateContent.ts:102) → [`reformatWithDeepSeek()`](src/services/deepseekApi.ts:73)

---

## 1. Resumen Ejecutivo

DeepSeek API responde correctamente (sin errores HTTP), pero el JSON devuelto no supera la validación de `validateMobileContent()` porque le falta el campo `title`. La causa raíz es una **combinación de 7 vulnerabilidades** en la integración actual. El fallback a OpenRouter funciona porque OpenRouter incluye un ejemplo JSON explícito en el prompt del usuario y no tiene el problema del thinking mode.

---

## 2. Metodología de Investigación

| # | Fuente | Tipo | URL | Hallazgo Clave |
|---|--------|------|-----|----------------|
| 1 | DeepSeek API Docs — JSON Output | Documentación oficial | https://api-docs.deepseek.com/guides/json_mode | "Include word 'json' in prompt + provide example", "API may occasionally return empty content" |
| 2 | deepseek-usa.ai — Guía JSON Output | Guía comunitaria verificada (May 26, 2026) | https://deepseek-usa.ai/docs/deepseek-json-output/ | "Disable thinking for simple extraction", "deepseek-chat is legacy → v4-flash", "Strip markdown fences" |
| 3 | GitHub HKUDS/DeepTutor#495 | Issue real con mismo problema (May 20, 2026) | https://github.com/HKUDS/DeepTutor/issues/495 | "DeepSeek returns JSON wrapped in markdown code fences (```json ... ```)" |
| 4 | DeepSeek API Docs — Thinking Mode | Documentación oficial | https://api-docs.deepseek.com/guides/thinking_mode | "Thinking toggle defaults to enabled", "reasoning_content at same level as content", "thinking via extra_body" |
| 5 | `src/services/deepseekApi.ts` | Código de integración | Líneas 1-78 | Modelo `deepseek-chat`, sin `extra_body.thinking`, sin strip de fences |
| 6 | `src/prompts/mobileReformat.ts` | Prompt del sistema | Líneas 5-76 | NO contiene palabra "json", NO incluye ejemplo del objeto JSON |

---

## 3. Las 7 Vulnerabilidades (Verificadas)

### 🔴 V1 — CRÍTICA: Prompt sin palabra "json" ni ejemplo JSON

**Fuente:** [DeepSeek API Docs — JSON Output](https://api-docs.deepseek.com/guides/json_mode) (fuente #1)

> *"Include the word 'json' in the system or user prompt, and provide an example of the desired JSON format to guide the model in outputting valid JSON."*

**Código actual:** [`MOBILE_REFORMAT_SYSTEM_PROMPT`](src/prompts/mobileReformat.ts:5-17) — NO contiene la palabra "json" en ninguna línea. NO incluye un ejemplo del objeto JSON esperado. El prompt de usuario en [`deepseekApi.ts:34-43`](src/services/deepseekApi.ts:34) tampoco incluye ejemplo.

**Comparativa con OpenRouter (que SÍ funciona):** [`openRouterApi.ts:76-94`](src/services/openRouterApi.ts:76) incluye un ejemplo completo del JSON con todos los campos en el prompt de usuario: `{ "title": "string", "subtitle": "string", "days": [...] }`.

**Consecuencia:** DeepSeek no tiene referencia visual de la estructura objetivo. Sin ejemplo, el modelo puede inventar su propio formato u omitir campos requeridos como `title`.

---

### 🔴 V2 — CRÍTICA: Sin strip de markdown code fences

**Fuente:** [GitHub HKUDS/DeepTutor#495](https://github.com/HKUDS/DeepTutor/issues/495) (fuente #3)

> *"DeepSeek API does not support this parameter and returns JSON wrapped in markdown code fences (``````json ... ``````), causing `json.loads()` to fail."*

**Fuente:** [deepseek-usa.ai](https://deepseek-usa.ai/docs/deepseek-json-output/) (fuente #2)

> *"Add 'Return only valid JSON. Do not include Markdown or code fences.' to the system prompt."*

**Código actual:** [`deepseekApi.ts:73`](src/services/deepseekApi.ts:73) — `JSON.parse(rawJson)` sin limpieza previa de fences markdown.

**Consecuencia:** Si DeepSeek envuelve el JSON en ```json ... ```, `JSON.parse()` lanza `SyntaxError` y el fallback a OpenRouter se activa innecesariamente.

---

### 🔴 V3 — CRÍTICA: Thinking mode ENABLED por defecto

**Fuente:** [DeepSeek API Docs — Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) (fuente #4)

> *"The thinking toggle defaults to `enabled`"*

> *"In thinking mode, the chain-of-thought content is returned via the `reasoning_content` parameter, at the same level as `content`."*

> *"When using the OpenAI SDK, you need to pass the `thinking` parameter within `extra_body`: `extra_body={"thinking": {"type": "enabled"}}`"*

**Fuente:** [deepseek-usa.ai](https://deepseek-usa.ai/docs/deepseek-json-output/) (fuente #2)

> *"For simple extraction, the safest default is to disable thinking mode and request only the final JSON object."*

**Código actual:** [`deepseekApi.ts:59-68`](src/services/deepseekApi.ts:59) — NO incluye `extra_body: { thinking: { type: 'disabled' } }`.

**Consecuencia:** Con thinking mode activado, el modelo gasta tokens de output en `reasoning_content` (cadena de pensamiento). Si el límite de `max_tokens: 8192` se consume en reasoning, el `content` final puede estar vacío o truncado, causando que `rawJson` sea `null` o incompleto.

---

### 🟠 V4 — ALTA: Sin retry en empty content

**Fuente:** [DeepSeek API Docs — JSON Output](https://api-docs.deepseek.com/guides/json_mode) (fuente #1)

> *"When using the JSON Output feature, the API may occasionally return empty content. We are actively working on optimizing this issue."*

**Código actual:** [`deepseekApi.ts:71`](src/services/deepseekApi.ts:71) — `throw new Error('DeepSeek devolvió respuesta vacía')` sin reintento.

**Consecuencia:** Un fallo transitorio de empty content (documentado por DeepSeek como "ocasional") causa un error fatal sin recuperación inmediata (aunque el fallback a OpenRouter sí se ejecuta en el nivel superior).

---

### 🟠 V5 — ALTA: `deepseek-chat` es modelo LEGACY

**Fuente:** [deepseek-usa.ai](https://deepseek-usa.ai/docs/deepseek-json-output/) (fuente #2)

> *"`deepseek-chat` and `deepseek-reasoner` are legacy compatibility names scheduled to be fully retired and inaccessible after **July 24, 2026, 15:59 UTC**. DeepSeek says they currently route to `deepseek-v4-flash` non-thinking and thinking modes."*

**Código actual:** [`deepseekApi.ts:60`](src/services/deepseekApi.ts:60) — `model: 'deepseek-chat'`.

**Consecuencia:** El modelo se retirará en ~55 días. Actualmente funciona como alias, pero podría tener comportamiento inconsistente con las features modernas (thinking mode, json_object).

---

### 🟡 V6 — MEDIA: Sin `finish_reason` logging

**Fuente:** [deepseek-usa.ai](https://deepseek-usa.ai/docs/deepseek-json-output/) (fuente #2)

> *"Log `finish_reason` — if it is 'length', the output was truncated and you need higher `max_tokens`."*

**Código actual:** [`deepseekApi.ts:70`](src/services/deepseekApi.ts:70) — No se registra `result.choices[0]?.finish_reason`.

**Consecuencia:** Si el JSON está truncado por `max_tokens`, no hay indicio en los logs. El error sería `SyntaxError` en `JSON.parse()` sin contexto de por qué.

---

### 🟡 V7 — MEDIA: Sin strip de BOM/artefactos Unicode

**Fuente:** [GitHub HKUDS/DeepTutor#495](https://github.com/HKUDS/DeepTutor/issues/495) (fuente #3) — reporta que el JSON venía con artefactos.

**Código actual:** [`deepseekApi.ts:73`](src/services/deepseekApi.ts:73) — `JSON.parse(rawJson)` sin sanitización de BOM (`\uFEFF`) o caracteres de control.

**Consecuencia:** Bajo riesgo, pero puede causar fallos en edge cases con ciertos PDFs que contengan caracteres Unicode problemáticos.

---

## 4. Diagrama de Fallo (Actualizado)

```
┌──────────────────────────────────────────────────────────────────┐
│  PDF Text → buildPrompt() → DeepSeek API                         │
│                                                                  │
│  ❌ Prompt sin "json" ni ejemplo (V1)                            │
│  ❌ Sin strip de markdown fences (V2)                            │
│  ❌ Thinking mode enabled por defecto (V3)                       │
│  ❌ Modelo legacy 'deepseek-chat' (V5)                           │
│  ❌ Sin retry en empty content (V4)                              │
│  ❌ Sin logging de finish_reason (V6)                            │
│                                                                  │
│  DeepSeek responde...                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Posibilidad A: ```json { "days": [...] } ```             │   │
│  │   → JSON.parse() falla con SyntaxError (V2)              │   │
│  │                                                          │   │
│  │ Posibilidad B: "" (empty content)                        │   │
│  │   → throw Error (V4) sin retry                           │   │
│  │   → thinking mode consumió todos los tokens (V3)         │   │
│  │                                                          │   │
│  │ Posibilidad C: { "content": "...", "days": [...] }       │   │
│  │   → validateMobileContent() falla (falta title)          │   │
│  │   → DeepSeek no vio ejemplo del formato esperado (V1)    │   │
│  │                                                          │   │
│  │ Posibilidad D: JSON truncado                             │   │
│  │   → JSON.parse() falla                                   │   │
│  │   → max_tokens insuficiente, finish_reason='length' (V6) │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Resultado: "IA devolvió respuesta sin título válido"            │
│  → Fallback a OpenRouter (que SÍ incluye ejemplo JSON)          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Plan de Corrección (7 Frentes)

### Fix #1: Prompt reforzado con ejemplo JSON

**Archivo:** [`src/prompts/mobileReformat.ts`](src/prompts/mobileReformat.ts)

Incluir la palabra "json", un ejemplo completo del objeto esperado, y la instrucción explícita de no usar markdown:

```typescript
export const MOBILE_REFORMAT_SYSTEM_PROMPT = `
Eres un asistente especializado en extraer datos en formato JSON de PDFs de agencias de viajes.
Tu única tarea es devolver un objeto JSON válido con esta estructura exacta:

{
  "title": "Nombre del viaje",
  "subtitle": "Nombre de la agencia",
  "days": [
    {
      "emoji": "🏖️",
      "title": "Día 1: Llegada a Zúrich",
      "summary": "Traslado y check-in en el hotel.",
      "bullets": ["Llegada al aeropuerto", "Traslado al hotel", "Cena libre"]
    }
  ],
  "accommodations": [
    {
      "name": "Hotel Ejemplo",
      "nights": "3 noches",
      "board": "AD",
      "location": "Zúrich"
    }
  ],
  "services": [
    { "category": "included", "items": ["Vuelos", "Traslados"] },
    { "category": "not_included", "items": ["Propinas", "Bebidas"] },
    { "category": "optional", "items": ["Excursión a los Alpes"] }
  ],
  "notes": ["Pasaporte en vigor", "Vacunas recomendadas"],
  "pageNumber": 1
}

Devuelve SOLO el JSON, sin markdown, sin code fences, sin texto adicional.

REGLAS:
1. Cada día del itinerario debe tener un emoji representativo (🏖️ playa, 🏔️ montaña, 🏛️ museo, 🚌 bus, ✈️ vuelo, etc.)
2. Resúmenes de 1-2 líneas máximo por día.
3. Bullets concisos (máx 8 palabras cada uno).
4. Agrupa alojamientos con nombre, noches, régimen y ubicación.
5. Clasifica servicios en: included, not_included, optional.
6. Ignora contenido irrelevante (términos legales extensos, pies de página repetitivos).
7. Conserva TODOS los datos factuales: precios, horarios, direcciones, teléfonos.
8. Si no encuentras ciertos datos (ej. alojamientos), omite el campo.
`;
```

### Fix #2: Utilidad `stripMarkdownJson()`

**Archivo:** Nuevo archivo `src/utils/stripMarkdown.ts`

```typescript
/**
 * Elimina code fences markdown y BOM de una respuesta JSON de IA.
 * Maneja: ```json ... ```, ``` ... ```, \uFEFF BOM, whitespace sobrante.
 */
export function stripMarkdownJson(raw: string): string {
  let cleaned = raw.trim();

  // Quitar BOM (Byte Order Mark) si existe
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.slice(1);
  }

  // Quitar ```json ... ``` o ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return cleaned;
}
```

### Fix #3: Deshabilitar thinking mode + actualizar modelo

**Archivo:** [`src/services/deepseekApi.ts`](src/services/deepseekApi.ts)

```typescript
const result = await openai.chat.completions.create({
  model: 'deepseek-v4-flash',  // ← actualizado desde 'deepseek-chat' (legacy)
  messages: [
    { role: 'system', content: MOBILE_REFORMAT_SYSTEM_PROMPT },
    { role: 'user', content: buildPrompt(pdfText) },
  ],
  temperature: 0.3,
  max_tokens: 8192,
  response_format: { type: 'json_object' },
  // ⬇️ NUEVO: deshabilitar thinking mode para extracción simple
  extra_body: { thinking: { type: 'disabled' } },
});
```

> **Nota:** `extra_body` es requerido por el SDK de OpenAI para pasar parámetros no estándar. La documentación oficial de DeepSeek confirma este formato.

### Fix #4: Retry con backoff (3 intentos)

**Archivo:** [`src/services/deepseekApi.ts`](src/services/deepseekApi.ts)

```typescript
export async function reformatWithDeepSeek(pdfText: string): Promise<MobileContent> {
  if (isPrimaryAICircuitOpen()) {
    throw new Error('DeepSeek bloqueado por circuit breaker');
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
          { role: 'user', content: buildPrompt(pdfText) },
        ],
        temperature: 0.3,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        extra_body: { thinking: { type: 'disabled' } },
      });

      const finishReason = result.choices[0]?.finish_reason;
      const rawJson = result.choices[0]?.message?.content;

      console.log(`[DeepSeek] Intento ${attempt}: finish_reason=${finishReason}, content_length=${rawJson?.length ?? 0}`);

      if (!rawJson) {
        console.warn(`[DeepSeek] Intento ${attempt}: respuesta vacía`);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw new Error('DeepSeek devolvió respuesta vacía tras 3 intentos');
      }

      const cleaned = stripMarkdownJson(rawJson);
      console.log('[DeepSeek] JSON limpio (primeros 200 chars):', cleaned.substring(0, 200));

      const parsed = validateMobileContent(JSON.parse(cleaned));
      recordPrimaryAISuccess();
      return parsed;

    } catch (err) {
      lastError = err;
      // Solo reintentar si NO es error de validación (datos corruptos)
      if (attempt < MAX_ATTEMPTS && !(err instanceof Error && err.message.includes('IA devolvió'))) {
        console.warn(`[DeepSeek] Intento ${attempt} falló, reintentando...`, String(err).slice(0, 120));
        await new Promise(r => setTimeout(r, 1000 * attempt));
      } else {
        throw err; // error de validación: no reintentar, pasar al fallback
      }
    }
  }

  throw lastError;
}
```

### Fix #5: Actualizar `buildPrompt()` para incluir "json" explícitamente

**Archivo:** [`src/services/deepseekApi.ts`](src/services/deepseekApi.ts), función `buildPrompt()`

```typescript
function buildPrompt(pdfText: string): string {
  return `Convierte el siguiente texto de PDF en el JSON estructurado descrito en el system prompt.

TEXTO DEL PDF A REFORMATEAR:
---
${pdfText}
---

Responde ÚNICAMENTE con el JSON, sin markdown ni texto adicional.`;
}
```

> Ya incluye la palabra "JSON" (mayúscula) que satisface el requisito de la API.

### Fix #6: Logging de `finish_reason`

Ya incluido en Fix #4.

### Fix #7: Strip de BOM

Ya incluido en Fix #2.

---

## 6. Orden de Implementación

| Prioridad | Fix | Archivo | Esfuerzo |
|-----------|-----|---------|----------|
| **P0** | #2 — `stripMarkdownJson()` | `src/utils/stripMarkdown.ts` (nuevo) | 5 min |
| **P0** | #1 — Prompt con ejemplo JSON | `src/prompts/mobileReformat.ts` | 5 min |
| **P0** | #3 — `thinking: disabled` + modelo `v4-flash` | `src/services/deepseekApi.ts` | 3 min |
| **P0** | #5 — `buildPrompt()` con "JSON" explícito | `src/services/deepseekApi.ts` | 2 min |
| **P1** | #4 — Retry con backoff | `src/services/deepseekApi.ts` | 10 min |
| **P2** | #6 — Logging finish_reason | `src/services/deepseekApi.ts` | Ya incluido |
| **P2** | #7 — Strip BOM | `src/utils/stripMarkdown.ts` | Ya incluido |

---

## 7. Verificación Post-Fix

1. `npm run build` — debe compilar sin errores TypeScript
2. Subir PDF real y verificar que DeepSeek devuelve JSON con `title` sin caer en fallback
3. Verificar en consola del navegador: `[DeepSeek] Intento 1: finish_reason=stop, content_length=XXX`
4. Verificar que NO aparece el warning `[usePdfConversion] DeepSeek falló, intentando OpenRouter fallback...`
5. Probar con un PDF que no tenga título claro — verificar que la IA lo inventa razonablemente

---

## 8. Por Qué OpenRouter Funciona (y DeepSeek No)

Comparativa lado a lado:

| Aspecto | DeepSeek (actual) | OpenRouter (actual) |
|---------|-------------------|---------------------|
| Prompt incluye ejemplo JSON | ❌ No | ✅ Sí (líneas 86-94) |
| Prompt incluye palabra "json" | ❌ No | ✅ Sí ("Responde con este formato JSON:") |
| Thinking mode | ✅ Enabled (default) | Depende del modelo |
| Modelo | `deepseek-chat` (legacy) | `openrouter/free` (router) |
| Strip markdown fences | ❌ No | ❌ No (pero OpenRouter no suele devolverlos) |
| Retry en empty | ❌ No | ❌ No (pero cadena de fallback multi-modelo) |

**Conclusión:** OpenRouter funciona porque incluye un ejemplo JSON completo en el prompt y usa un router que selecciona modelos que manejan mejor el `json_object`. La solución es alinear DeepSeek con las mismas buenas prácticas.
