# 📱 PDF-to-Mobile

[![Cost](https://img.shields.io/badge/cost-$0%2Fmonth-success)](https://render.com)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%208%20%2B%20TypeScript%206-blue)](https://vite.dev)
[![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash%20%2B%20OpenRouter%20fallback-purple)](https://aistudio.google.com)
[![Deploy](https://img.shields.io/badge/deploy-Render%20Static%20Site-4351e8)](https://render.com)

**Convierte PDFs de escritorio (folletos de viajes, itinerarios) en versiones optimizadas para lectura en móvil.** 100% procesado en tu navegador. Sin backend. Sin coste.

---

## ✨ Qué hace

1. **Extrae** el texto del PDF original (drag & drop)
2. **Reformatea** el contenido con IA (Gemini 2.5 Flash / OpenRouter) → JSON estructurado
3. **Genera** un PDF nuevo en formato A5 optimizado para pantallas pequeñas
4. **Descarga** el resultado con un solo click

Pipeline completo: `idle → extracting → reformatting → generating → done`

---

## 🚀 Stack Tecnológico (Todo Gratis)

| Capa | Tecnología | Coste |
|------|-----------|-------|
| **Frontend** | React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 | $0 |
| **Hosting** | Render Static Site | $0/mes |
| **IA Primaria** | Gemini 2.5 Flash API (Structured Outputs) | Free tier (10 RPM, 250 RPD) |
| **IA Fallback** | OpenRouter (`:free` models) | Free tier (20 RPM, 200 RPD) |
| **Extracción PDF** | react-pdftotext (pdf.js wrapper) | $0 |
| **Generación PDF** | html2pdf.js (html2canvas + jsPDF) | $0 |

---

## 📦 Setup Local

```bash
# 1. Clonar
git clone https://github.com/tu-usuario/pdf-to-mobile.git
cd pdf-to-mobile

# 2. Instalar dependencias
npm install

# 3. Configurar API keys
cp .env.example .env
# Editar .env y añadir:
#   VITE_GEMINI_API_KEY=...      (https://aistudio.google.com/apikey)
#   VITE_OPENROUTER_API_KEY=...  (https://openrouter.ai/keys) — opcional, fallback

# 4. Dev server
npm run dev          # → http://localhost:5173
```

---

## 🐧 Desarrollo Local con Ollama (sin APIs externas)

Si prefieres no usar APIs cloud, puedes ejecutar un LLM local:

```bash
# 1. Instalar Ollama
#    https://ollama.com/download

# 2. Descargar modelo compatible con Structured Outputs
ollama pull qwen3:8b
# o: ollama pull gemma3:12b
# o: ollama pull llama3.2:3b

# 3. Modificar src/services/geminiApi.ts para apuntar a Ollama:
#    - Cambiar baseURL a http://localhost:11434/v1
#    - Usar el modelo descargado
#    - Quitar responseSchema (Ollama no lo soporta nativamente)
```

---

## 📁 Estructura del Proyecto

```
pdf-to-mobile/
├── index.html                  # Entry HTML, meta tags, favicon
├── vite.config.ts              # Vite + React + Tailwind + code splitting
├── render.yaml                 # Render Static Site deploy config
├── .env.example                # Variables de entorno documentadas
├── src/
│   ├── main.tsx                # React 19 StrictMode entry
│   ├── App.tsx                 # Root component — pipeline wire-up
│   ├── index.css               # Tailwind v4 + animaciones globales
│   ├── components/
│   │   ├── PdfUploader.tsx     # Drag & drop zone
│   │   ├── ConversionProgress.tsx  # 3-step visual progress
│   │   ├── MobilePreview.tsx   # Phone mockup preview
│   │   ├── PdfDownload.tsx     # Download button
│   │   ├── ErrorBoundary.tsx   # Error catcher with reload
│   │   └── TextPreview.tsx     # Raw text debug view (DEV)
│   ├── hooks/
│   │   ├── usePdfConversion.ts # Pipeline orchestrator
│   │   └── useRateLimiter.ts   # Rate limit countdown
│   ├── services/
│   │   ├── pdfExtractor.ts     # react-pdftotext + charset fixer
│   │   ├── geminiApi.ts        # Gemini 2.5 Flash Structured Outputs
│   │   ├── openRouterApi.ts    # OpenRouter fallback (OpenAI SDK)
│   │   ├── pdfGenerator.ts     # html2pdf.js → A5 PDF
│   │   └── rateLimiter.ts      # 10 RPM / 250 RPD queue
│   ├── prompts/
│   │   └── mobileReformat.ts   # System prompt + JSON Schema (español)
│   ├── templates/
│   │   └── mobilePdfTemplate.ts # HTML/CSS template para el PDF
│   ├── types/
│   │   ├── index.ts            # TypeScript interfaces
│   │   └── html2pdf.d.ts       # html2pdf.js type declarations
│   └── utils/
│       ├── charsetFixer.ts      # Corrección UTF-8 para PDFs WinAnsi
│       └── textChunker.ts       # Chunking a 100K chars
└── public/
    └── favicon.svg              # App favicon
```

---

## ⚠️ Known Limitations

### Texto rasterizado (no seleccionable)
`html2pdf.js` renderiza el HTML a canvas y lo incrusta como imagen en el PDF. El texto en el PDF final **no es seleccionable ni indexable**. Esto es una limitación aceptada del MVP. Para v2 se recomienda migrar a [`pdfmake`](https://pdfmake.org).

### Chunk grande
pdf.js (~428 KB) y html2pdf.js (~694 KB) se cargan como chunks separados para no bloquear la carga inicial. La app principal pesa solo ~23 KB.

### Rate limiting
Gemini free tier: 10 RPM (1 petición cada 6s), 250 RPD. La app muestra un contador de espera. El fallback a OpenRouter es automático si Gemini falla.

---

## 🚢 Deploy en Render Static Site

1. Conecta el repositorio en [Render Dashboard](https://dashboard.render.com)
2. Render detecta `render.yaml` automáticamente
3. Añade las variables de entorno en Settings → Environment:
   - `VITE_GEMINI_API_KEY`
   - `VITE_OPENROUTER_API_KEY`
4. Deploy → URL pública lista en ~2 minutos

También puedes hacer deploy manual:

```bash
npm run build        # genera dist/
# Sube dist/ a cualquier hosting estático (Netlify, Vercel, GitHub Pages, etc.)
```

---

## 🧪 Health Check

GitHub Actions ejecuta un health-check semanal (lunes 08:00 UTC) contra la URL de producción. Ver `.github/workflows/health-check.yml`.

---

## 📝 Licencia

MIT — Úsalo, modifícalo, compártelo.
