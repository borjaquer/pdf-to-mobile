# Active Context - Belen1 (PDF to Mobile Converter)

## Current Mission
✅ **IMPLEMENTACIÓN COMPLETA.** Las 8 fases del plan `plan_implementacion_pdf_to_mobile.md` han sido ejecutadas.
🆕 **Chat de Diseño** reemplaza ContentEditor form-based por interfaz conversacional con LLM.
🆕 **Búsqueda Web** integrada en el chat para inspirar decisiones de diseño con datos reales.

## Stack Confirmado (Todo Gratis, 100% Client-Side)
- **Frontend:** React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4
- **Hosting:** Render Static Site ($0/mes)
- **LLM Primario:** Gemini 2.5 Flash API (Structured Outputs, 10 RPM/250 RPD)
- **LLM Fallback:** OpenRouter multi-modelo (google/gemma-4-31b-it:free -> qwen/qwen3-next-80b-a3b-instruct:free -> meta-llama/llama-3.3-70b-instruct:free -> openrouter/free router)
- **Web Search:** Firecrawl Search API (500 créditos/mes gratis)
- **PDF Extract:** react-pdftotext (pdf.js wrapper) + charset fixer
- **PDF Generate:** html2pdf.js (rasterizado A5, texto no seleccionable — limitación conocida)

## Estrategia de Conversión
Extraer texto → LLM reformatea a JSON estructurado → html2pdf.js genera PDF A5
Pipeline: idle → extracting → reformatting → generating → done
Fallback chain: Gemini 2.5 Flash (con circuit breaker) → OpenRouter multi-modelo (openrouter/free router primero)

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
- `.github/workflows/health-check.yml`: ELIMINADO (token sin scope workflow)
- Repo GitHub: `https://github.com/borjaquer/pdf-to-mobile`
- URL esperada: `https://pdf-to-mobile.onrender.com`
- ✅ Repo creado y pusheado a GitHub (commit `112001a`)
- 📋 Pendiente conectar en Render: `dashboard.render.com` → Blueprint → seleccionar repo
- 🔑 Configurar `VITE_GEMINI_API_KEY` y `VITE_OPENROUTER_API_KEY` en Render Environment

## 🆕 Optimización de Latencia (Commit: `56fd370`)
- **Circuit Breaker:** [`circuitBreaker.ts`](src/services/circuitBreaker.ts) — tras 3 fallos 429 de Gemini, salta Gemini durante 5 minutos
- **`maxRetries: 0`** en ambos clientes OpenAI (OpenRouter) — elimina los 3 auto-reintentos del SDK por modelo
- **`openrouter/free` como primer modelo** en ambas cadenas — el router automático selecciona el mejor modelo :free sin iterar
- **Resultado esperado:** de ~15-20s a ~3-5s en condiciones de rate-limit

## 🆕 Rediseño Profesional del PDF Móvil (Commit: `66c3c5f`)
- **Header con gradiente:** fondo `headerGradient` (navy degradado), título blanco, badge dorado
- **Timeline visual:** cada día tiene un `day-marker` circular numerado (reemplaza borde izquierdo)
- **Servicios semánticos:** fondos verde (incluido), rojo (excluido), azul (opcional) + labels coloreados
- **Alojamientos con pin:** icono 📍 + ciudad/hotel en dos líneas con metadatos
- **Notas con borde izquierdo:** borde de acento + fondo suave + itálica
- **Tipografía:** Inter como primera opción, fallback a Segoe UI/system-ui
- **Nuevas propiedades en PdfStyles:** `headerGradient`, `headerTextColor`, `bulletColor`, `mutedColor`, `cardRadius`
- **Prompt del chat actualizado** para que el LLM conozca las nuevas propiedades

## 🆕 Unificación Preview/PDF vía iframe (Commit: `17584bf`)
- **Problema:** [`MobilePreview.tsx`](src/components/MobilePreview.tsx) duplicaba la lógica de renderizado con React + inline styles, produciendo una vista diferente al PDF generado por [`pdfGenerator.ts`](src/services/pdfGenerator.ts)
- **Solución:** [`MobilePreview.tsx`](src/components/MobilePreview.tsx) ahora renderiza vía `<iframe srcDoc={renderMobileTemplate(content, styles)}>`, usando exactamente el mismo HTML/CSS que el PDF
- **Resultado:** Preview y PDF son **pixel-idénticos** — mismo gradiente, timeline markers, colores semánticos de servicios, pins de alojamiento, bordes de notas

## 🆕 CSS compatible con html2pdf.js (Commit pendiente)
- **Problema:** `html2pdf.js`/`html2canvas` no soporta: `linear-gradient`, `box-shadow`, `::before`/`::after`, `gap` en flexbox, `flex-wrap`
- **Correcciones en [`mobilePdfTemplate.ts`](src/templates/mobilePdfTemplate.ts):**
  - `headerGradient` default ahora es sólido `#1e293b` (no `linear-gradient(...)`)
  - `box-shadow` eliminado del `.price-badge`
  - Pseudo-elemento `::before` para bullets reemplazado por `<span class="bullet-dot">` real
  - `gap` en flexbox reemplazado por `margin-bottom` + `:last-child`
  - `display: flex` reemplazado por `display: table`/`table-cell` con `vertical-align`
  - `flex-wrap` reemplazado por `white-space: nowrap` con `display: inline`
  - `body` ancho fijo `559px` (A5 a 96dpi) para evitar reflow en canvas
- **[`chatDesignInterpreter.ts`](src/prompts/chatDesignInterpreter.ts) actualizado:** el prompt prohíbe al LLM usar gradientes ni box-shadow

## Próximo Paso
1. Conectar repo a Render (el usuario debe hacerlo manualmente en dashboard.render.com)
2. Añadir las API Keys en Render Environment > Variables
3. Compartir URL pública con usuarios
