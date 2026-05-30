# Active Context - Belen1 (PDF to Mobile Converter)

## Current Mission
✅ **IMPLEMENTACIÓN COMPLETA.** Las 8 fases del plan `plan_implementacion_pdf_to_mobile.md` han sido ejecutadas.
🆕 **Chat de Diseño** reemplaza ContentEditor form-based por interfaz conversacional con LLM.
🆕 **Búsqueda Web** integrada en el chat para inspirar decisiones de diseño con datos reales.

## Stack Confirmado (Todo Gratis, 100% Client-Side)
- **Frontend:** React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4
- **Hosting:** Render Static Site ($0/mes)
- **LLM Primario:** Gemini 2.5 Flash API (Structured Outputs, 10 RPM/250 RPD)
- **LLM Fallback:** OpenRouter modelos :free (google/gemini-2.5-flash-lite:free)
- **Web Search:** Firecrawl Search API (500 créditos/mes gratis)
- **PDF Extract:** react-pdftotext (pdf.js wrapper) + charset fixer
- **PDF Generate:** html2pdf.js (rasterizado A5, texto no seleccionable — limitación conocida)

## Estrategia de Conversión
Extraer texto → LLM reformatea a JSON estructurado → html2pdf.js genera PDF A5
Pipeline: idle → extracting → reformatting → generating → done
Fallback chain: Gemini 2.5 Flash → OpenRouter :free

## Estado de las Fases

| Fase | Descripción | Estado |
|------|------------|--------|
| 0 | Setup del Proyecto | ✅ Commit `d4fe313` |
| 1 | Módulo de Extracción PDF | ✅ Commit `e16382e` |
| 2 | Módulo de Inteligencia Artificial | ✅ Commit `c7a199b` |
| 3 | Módulo de Generación PDF | ✅ Commit `99d8c1d` |
| 4 | Integración del Pipeline Completo | ✅ Commit `99d8c1d` |
| 5 | UI/UX | ✅ Commit `5ab6ed1` |
| 6 | Despliegue en Render Static Site | ✅ Commit `0290de8` |
| 7 | Testing y Validación | ✅ Manual (PDF de 772KB generado con éxito) |
| 8 | Documentación Final | ✅ README.md completo |
| 9 | Editor de Contenido + Estilos (form) | ✅ Commit `6759b01` — REEMPLAZADO por chat |
| 10 | Chat de Diseño NL | ✅ Commit `db6cfef` |
| 11 | 🆕 Búsqueda Web en Chat | ✅ Pendiente commit |

## 🆕 Chat de Diseño por Lenguaje Natural (Commit: `db6cfef`)
- **ContentEditor.tsx ELIMINADO** — reemplazado por interfaz de chat conversacional
- **Nuevo componente:** [`ChatPanel.tsx`](src/components/ChatPanel.tsx) — burbujas de chat, input, typing indicator, chips de sugerencias
- **Nuevo servicio:** [`chatInterpreter.ts`](src/services/chatInterpreter.ts) — interpreta NL → muta MobileContent + PdfStyles vía Gemini/OpenRouter
- **Nuevo prompt:** [`chatDesignInterpreter.ts`](src/prompts/chatDesignInterpreter.ts) — system prompt para edición de diseño
- **Template refactorizado:** [`renderMobileTemplate()`](src/templates/mobilePdfTemplate.ts) ahora tiene diseño "dossier de agencia":
  - Título en mayúsculas + badge de precio
  - Secciones iconografiadas: 🗺️ itinerario, ✅ servicios, 🏨 alojamientos, 📝 notas
  - Cards de día con borde izquierdo de acento y fondo suave
  - Cards de alojamiento con ciudad en negrita + hotel debajo
  - Numeración de página al pie
- **PdfStyles extendido:** +`priceColor`, `subtitleColor`, `dividerColor`, `cardBackground`
- **Nuevo tipo:** `ChatMessage` (id, role, text, timestamp)
- **Hook actualizado:** [`usePdfConversion`](src/hooks/usePdfConversion.ts) ahora expone `applyChatChanges()` y `isProcessing`
- **Flujo:** Usuario escribe NL → chatInterpreter (Gemini) → muta content + styles → auto-regenera PDF

## 🆕 Búsqueda Web en el Chat (Pendiente commit)
- **Servicio:** [`webSearch.ts`](src/services/webSearch.ts) — llama a Firecrawl Search API desde el navegador
- **Detección de intención:** [`detectSearchIntent()`](src/services/webSearch.ts) — heurística por palabras clave:
  - Explícitas: `busca ...`, `search ...`, `investiga ...`, `infórmate sobre ...`
  - Preguntas factuales: `qué es ...`, `cuál es ...`, `cuánto ...`, `dónde ...`
  - Inspiración: `tendencias ...`, `inspiración ...`, `ejemplos de ...`, `recomiéndame ...`
- **Integración en hook:** [`applyChatChanges()`](src/hooks/usePdfConversion.ts) detecta intención → busca → inyecta `searchContext` en el prompt del LLM
- **System prompt extendido:** reglas para usar resultados web como inspiración (colores, fuentes, datos)
- **`buildChatPrompt()`** ahora acepta 4º parámetro opcional `searchContext?: string`
- **`interpretChatInstruction()`** y funciones internas aceptan `searchContext?: string`
- **Env var:** `VITE_FIRECRAWL_API_KEY` (Firecrawl free tier: 500 créditos/mes)
- **Sugerencias en ChatPanel:** chips "🌐 Busca tendencias de diseño 2026" y "🎯 Investiga colores para viajes"
- **Mensaje al usuario:** si se usó búsqueda, añade "🔍 Se consultó la web para inspirar el diseño."

## Build Status
- `npx tsc --noEmit -p tsconfig.app.json`: ✅ 0 errores
- `npx vite build`: ✅ 0 errores, dist/ generado correctamente
- Code splitting: pdfjs (428KB), html2pdf (694KB), vendor (492KB), main (40KB)

## Despliegue
- `render.yaml`: Static Site config con env vars y SPA routing
- `.github/workflows/health-check.yml`: health-check semanal (lunes 08:00 UTC)
- URL esperada: `https://pdf-to-mobile.onrender.com`

## Próximo Paso
1. Commit del web search feature
2. Añadir `VITE_FIRECRAWL_API_KEY` al `.env` real (no solo .example)
3. `npm run dev` para probar búsqueda web + chat con un PDF real
