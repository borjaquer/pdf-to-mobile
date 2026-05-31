# Plan de Corrección: `Cannot read properties of undefined (reading 'length')`

**Fecha:** 2026-05-30  
**Bug:** `TypeError: Cannot read properties of undefined (reading 'length')` en generación de PDF  
**Severidad:** Crítica — rompe toda la app tras el reformateo de IA  
**Archivos afectados:** 3 archivos, 5 puntos de quiebre

---

## 1. Diagnóstico

El error ocurre en [`renderMobileTemplate()`](src/templates/mobilePdfTemplate.ts:66):

```typescript
const daysHtml = content.days.length ? `...` : '';
```

`content.days` es `undefined` porque la IA devuelve JSON sin ese campo y no hay validación en runtime tras el `JSON.parse()`. El cast `as MobileContent` es puro TypeScript — no protege en runtime.

### Traza completa del fallo

```
usePdfConversion.startConversion()
  → reformatWithDeepSeek() o reformatWithOpenRouter()
    → JSON.parse(rawJson) as MobileContent   ← sin validación
  → generatePdf(content, styles)
    → renderMobileTemplate(content, styles)
      → content.days.length                  ← 💥 CRASH
```

---

## 2. Solución: 3 capas de defensa

Aplicar **defense in depth**: template defensivo (capa 1), validación post-parseo (capa 2), schema tipado al modelo (capa 3). Las 3 deben implementarse juntas.

### Capa 1: Template defensivo (BLOCKER)

**Archivo:** [`src/templates/mobilePdfTemplate.ts`](src/templates/mobilePdfTemplate.ts)  
**Prioridad:** P0 — evita el crash incluso si las otras capas fallan

```diff
- const daysHtml = content.days.length ? `
+ const daysHtml = (content.days ?? []).length ? `
    ...
- ${content.days.map((d, i) => `
+ ${(content.days ?? []).map((d, i) => `
```

Aplicar `?? []` en los 2 accesos a `content.days` (líneas 66 y 73).

### Capa 2: Validación post-parseo (SAFETY NET)

**Archivos:** [`src/services/deepseekApi.ts`](src/services/deepseekApi.ts) y [`src/services/openRouterApi.ts`](src/services/openRouterApi.ts)  
**Prioridad:** P1 — previene que datos corruptos lleguen al template

Crear una función `validateMobileContent(raw: unknown): MobileContent` en un nuevo archivo `src/utils/validateContent.ts`:

```typescript
import type { MobileContent } from '../types';

export function validateMobileContent(raw: unknown): MobileContent {
  if (!raw || typeof raw !== 'object') {
    throw new Error('IA devolvió respuesta no válida (no es un objeto)');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    throw new Error('IA devolvió respuesta sin título válido');
  }

  return {
    title: obj.title as string,
    subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : undefined,
    days: Array.isArray(obj.days) ? obj.days.map(validateDay) : [],
    accommodations: Array.isArray(obj.accommodations) ? obj.accommodations.map(validateAccommodation) : undefined,
    services: Array.isArray(obj.services) ? obj.services.map(validateService) : undefined,
    notes: Array.isArray(obj.notes) ? obj.notes.filter(n => typeof n === 'string') : undefined,
    pageNumber: typeof obj.pageNumber === 'number' ? obj.pageNumber : undefined,
  };
}
```

Luego en `deepseekApi.ts:72` y `openRouterApi.ts:103`:
```diff
- const parsed = JSON.parse(rawJson) as MobileContent;
+ const parsed = validateMobileContent(JSON.parse(rawJson));
```

### Capa 3: Schema tipado a la IA (PREVENTION)

**Archivos:** [`src/services/deepseekApi.ts`](src/services/deepseekApi.ts), [`src/services/openRouterApi.ts`](src/services/openRouterApi.ts)  
**Prioridad:** P2 — reduce la probabilidad de que la IA omita campos

DeepSeek soporta `response_format` con `json_schema` explícito. Cambiar:

```diff
- response_format: { type: 'json_object' },
+ response_format: {
+   type: 'json_schema',
+   json_schema: {
+     name: 'mobile_content',
+     schema: MOBILE_REFORMAT_SCHEMA,
+     strict: true,
+   },
+ },
```

Para OpenRouter, verificar si el modelo en uso soporta `json_schema`. Si no, mantener `json_object` + la validación de capa 2.

---

## 3. Orden de implementación

| # | Archivo | Cambio | Prioridad |
|---|---------|--------|-----------|
| 1 | `src/utils/validateContent.ts` | **CREAR** — función de validación | P1 |
| 2 | `src/templates/mobilePdfTemplate.ts:66,73` | `content.days` → `(content.days ?? [])` | P0 |
| 3 | `src/services/deepseekApi.ts:72` | `as MobileContent` → `validateMobileContent()` | P1 |
| 4 | `src/services/openRouterApi.ts:103` | `as MobileContent` → `validateMobileContent()` | P1 |
| 5 | `src/services/deepseekApi.ts:66` | `json_object` → `json_schema` con schema | P2 |
| 6 | `src/services/openRouterApi.ts:53` | `json_object` → `json_schema` (si compatible) | P2 |

---

## 4. Verificación post-fix

Tras aplicar los cambios, testear estos escenarios:

| Escenario | Resultado esperado |
|-----------|-------------------|
| IA devuelve `{ title: "x" }` sin `days` | PDF generado con header y sin itinerario (no crashea) |
| IA devuelve `{ title: "x", days: [] }` | PDF generado sin sección de itinerario |
| IA devuelve JSON completo y correcto | PDF generado normalmente |
| IA devuelve string no-JSON | Error controlado en `validateMobileContent` con mensaje claro |
| IA devuelve `null` | Error controlado en `validateMobileContent` |

---

## 5. Notas adicionales

- La validación en capa 2 también debe aplicarse en [`chatInterpreter.ts`](src/services/chatInterpreter.ts) si este también parsea `MobileContent`.
- La capa 3 (`json_schema` + `strict: true`) es la más efectiva para prevenir el problema de raíz, pero depende del soporte del proveedor. DeepSeek lo soporta; OpenRouter depende del modelo subyacente.
- El template ya usa `?.` para `services`, `accommodations` y `notes` — solo `days` quedó sin protección por ser `required` en el tipo TypeScript. La capa 1 cierra esa brecha.

---

**Tiempo estimado de implementación:** 30-45 minutos  
**Riesgo de regresión:** Bajo — son cambios puramente defensivos que no alteran el comportamiento cuando los datos son correctos.
