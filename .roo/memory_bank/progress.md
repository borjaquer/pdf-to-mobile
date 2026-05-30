# Progress Log — PDF-to-Mobile

## 2026-05-30 — Búsqueda Web en el Chat

### Commits
1. `d4fe313` — Fase 0: Setup del Proyecto (React 19 + Vite 8 + TS 6 + Tailwind v4)
2. `e16382e` — Fase 1: Extracción PDF con react-pdftotext + charset fixer + text chunker
3. `c7a199b` — Fase 2: Módulo IA (Gemini Structured Outputs + OpenRouter fallback + rate limiter)
4. `99d8c1d` — Fase 3+4: Generación PDF real (html2pdf.js) + Integración completa del pipeline
5. `5ab6ed1` — Fase 5: UI/UX (SVG spinners, phone mockup con notch, animaciones fade-in)
6. `0290de8` — Fase 6: Despliegue en Render Static Site (render.yaml, code splitting, health-check)
7. `6759b01` — Fase 9: Editor de Contenido + Estilos con formulario (REEMPLAZADO por chat)
8. `db6cfef` — Fase 10: Chat de Diseño NL (ChatPanel + chatInterpreter + chatDesignInterpreter + template refactor)

### Pendiente
- [ ] Probar con PDFs reales (`npm run dev`)
- [ ] Configurar `.env` con API keys reales (Gemini, OpenRouter, Firecrawl)
- [ ] Conectar repo con Render Dashboard
- [ ] Test end-to-end en producción
- [ ] Migrar a pdfmake en v2 si el texto rasterizado es inaceptable
