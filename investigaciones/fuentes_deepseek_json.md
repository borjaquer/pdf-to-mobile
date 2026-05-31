# Fuentes: Diagnóstico DeepSeek JSON — Fallos de Integración

**Fecha:** 2026-05-30  
**Investigación:** Por qué `reformatWithDeepSeek()` falla con "IA devolvió respuesta sin título válido"

---

## Fuente #1: DeepSeek API Docs — JSON Output (OFICIAL)

- **URL:** https://api-docs.deepseek.com/guides/json_mode
- **Tipo:** Documentación oficial de la API
- **Fecha de consulta:** 2026-05-30
- **Archivo local:** `.firecrawl/deepseek-json-mode-official.json`

### Citas textuales relevantes:

> "To enable JSON Output, users should: 1. Set the `response_format` parameter to `{'type': 'json_object'}`. 2. **Include the word 'json' in the system or user prompt, and provide an example of the desired JSON format** to guide the model in outputting valid JSON. 3. Set the `max_tokens` parameter reasonably to prevent the JSON string from being truncated midway. 4. **When using the JSON Output feature, the API may occasionally return empty content.** We are actively working on optimizing this issue. You can try modifying the prompt to mitigate such problems."

### Código de ejemplo oficial:

```python
system_prompt = """
The user will provide some exam text. Please parse the "question" and "answer" and output them in JSON format.

EXAMPLE INPUT:
Which is the highest mountain in the world? Mount Everest.

EXAMPLE JSON OUTPUT:
{
    "question": "Which is the highest mountain in the world?",
    "answer": "Mount Everest"
}
"""

response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=messages,
    response_format={
        'type': 'json_object'
    }
)
```

---

## Fuente #2: deepseek-usa.ai — Guía Completa JSON Output (COMUNITARIA VERIFICADA)

- **URL:** https://deepseek-usa.ai/docs/deepseek-json-output/
- **Tipo:** Guía técnica comunitaria (última verificación: May 26, 2026)
- **Fecha de consulta:** 2026-05-30
- **Archivo local:** `.firecrawl/deepseek-usa-json-guide.json`

### Citas textuales relevantes:

> "The core setup is simple: set `response_format` to `{"type":"json_object"}`, **explicitly ask for JSON in the prompt, include an example object**, and parse `response.choices[0].message.content`."

> "**`deepseek-chat` and `deepseek-reasoner` are legacy compatibility names scheduled to be fully retired and inaccessible after July 24, 2026, 15:59 UTC.** DeepSeek says they currently route to `deepseek-v4-flash` non-thinking and thinking modes."

> "**For simple extraction, the safest default is to disable thinking mode** and request only the final JSON object. DeepSeek's current docs say thinking mode defaults to enabled."

> "**Add 'Return only valid JSON. Do not include Markdown or code fences.'** to the system prompt."

> "Use limited retries. Do not retry forever. Strengthen the JSON prompt, **disable thinking for extraction**, retry, and log finish_reason."

---

## Fuente #3: GitHub HKUDS/DeepTutor Issue #495 (BUG IDÉNTICO)

- **URL:** https://github.com/HKUDS/DeepTutor/issues/495
- **Tipo:** Issue real de GitHub — mismo problema
- **Fecha:** Abierto May 20, 2026, cerrado May 28, 2026
- **Archivo local:** `.firecrawl/deeptutor-issue-495.json`

### Citas textuales relevantes:

> "**KnowledgeExtractorAgent** passes `response_format={"type": "json_object"}` to the LLM. **DeepSeek API does not support this parameter and returns JSON wrapped in markdown code fences (``````json ... ``````), causing `json.loads()` to fail.**"

### Solución aplicada en ese proyecto:

```python
cleaned = response.strip()
if cleaned.startswith("```"):
    first_newline = cleaned.find("\n")
    if first_newline != -1:
        cleaned = cleaned[first_newline + 1:]
    if cleaned.rstrip().endswith("```"):
        cleaned = cleaned.rstrip()[:-3].rstrip()
result = json.loads(cleaned)
```

---

## Fuente #4: DeepSeek API Docs — Thinking Mode (OFICIAL)

- **URL:** https://api-docs.deepseek.com/guides/thinking_mode
- **Tipo:** Documentación oficial de la API
- **Fecha de consulta:** 2026-05-30
- **Archivo local:** `.firecrawl/deepseek-thinking-mode.json`

### Citas textuales relevantes:

> "**The thinking toggle defaults to `enabled`**"

> "In thinking mode, the chain-of-thought content is returned via the **`reasoning_content` parameter, at the same level as `content`**."

> "When using the OpenAI SDK, you need to pass the `thinking` parameter within `extra_body`:
> ```python
> extra_body={"thinking": {"type": "enabled"}}
> ```"

---

## Fuente #5: Código fuente del proyecto (LOCAL)

### [`src/services/deepseekApi.ts`](src/services/deepseekApi.ts)

- Modelo usado: `deepseek-chat` (LEGACY, se retira Jul 24, 2026)
- Sin `extra_body: { thinking: { type: 'disabled' } }`
- Sin strip de markdown fences antes de `JSON.parse()`
- Sin retry en empty content
- Sin logging de `finish_reason`

### [`src/prompts/mobileReformat.ts`](src/prompts/mobileReformat.ts)

- `MOBILE_REFORMAT_SYSTEM_PROMPT` NO contiene la palabra "json"
- NO incluye ejemplo del objeto JSON esperado

### [`src/services/openRouterApi.ts`](src/services/openRouterApi.ts) (FUNCIONA)

- SÍ incluye ejemplo JSON explícito en el prompt de usuario (líneas 86-94)
- SÍ incluye la palabra "JSON" en mayúscula
- Cadena de fallback multi-modelo

### [`src/utils/validateContent.ts`](src/utils/validateContent.ts)

- Línea 101-102: `if (typeof obj.title !== 'string' || !obj.title.trim())` → lanza el error que vemos

---

## Resumen de Hallazgos Cruzados

| Vulnerabilidad | Fuente #1 | Fuente #2 | Fuente #3 | Fuente #4 | Fuente #5 |
|----------------|:---------:|:---------:|:---------:|:---------:|:---------:|
| V1: Prompt sin "json" ni ejemplo | ✅ | ✅ | — | — | ✅ |
| V2: Sin strip markdown fences | — | ✅ | ✅ | — | ✅ |
| V3: Thinking mode enabled | — | ✅ | — | ✅ | ✅ |
| V4: Sin retry empty content | ✅ | ✅ | — | — | ✅ |
| V5: Modelo legacy `deepseek-chat` | — | ✅ | — | — | ✅ |
| V6: Sin finish_reason logging | — | ✅ | — | — | ✅ |
| V7: Sin strip BOM | — | — | ✅ | — | ✅ |
