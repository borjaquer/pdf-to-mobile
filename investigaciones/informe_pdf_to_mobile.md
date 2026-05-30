# INFORME DE INVESTIGACIÓN: PDF-to-Mobile Web App

> **Fecha:** 29 de Mayo de 2026  
> **Proyecto:** Belen1 - Conversor de PDFs de Escritorio a Formato Móvil  
> **Objetivo:** App web 100% gratuita (Render + Supabase) para transformar PDFs de agencia de viajes a versión mobile-friendly

---

## 1. RESUMEN EJECUTIVO

Se ha investigado la viabilidad de construir una aplicación web completamente gratuita que convierta folletos PDF diseñados para ordenador (multi-columna, texto denso, tamaño A4) en versiones optimizadas para lectura en móvil (single-column, bullets, emojis, tipografía grande). La investigación concluye que **es viable** usando la siguiente arquitectura:

| Capa | Tecnología | Coste |
|------|-----------|-------|
| Frontend | HTML5 + CSS3 + Vanilla JS (Render Static) | **$0** |
| Backend | Node.js + Express (Render Web Service) | **$0** (750h/mes) |
| Almacenamiento | Supabase Storage Free Tier | **$0** (1 GB) |
| Base de Datos | Supabase PostgreSQL Free | **$0** (500 MB) |
| IA (Reformateo) | OpenRouter / Groq Free Tier | **$0** (límites generosos) |
| PDF Parse | `pdf-parse` (npm, open-source) | **$0** |
| PDF Generate | `pdfmake` (npm, open-source) | **$0** |

**Coste total: 0€/mes.**

---

## 2. ANÁLISIS DE LOS PDFs DE REFERENCIA

### 2.1 PDF Original: [`Folleto-KNA10055-KANNAKEM-20260522153019-0-395.pdf`](Folleto-KNA10055-KANNAKEM-20260522153019-0-395.pdf)

- **Páginas:** 4
- **Formato:** Folleto de agencia de viajes "Alsacia y perlas de Alemania"
- **Características:**
  - Párrafos densos con itinerario detallado día a día
  - Formato multi-columna (nombre de agencia, precio, itinerario)
  - Texto con caracteres especiales y encoding legacy (tildes mal codificadas: "Z�rich")
  - Lista de alojamientos en tabla multi-columna
  - Desglose de servicios incluidos en prosa

### 2.2 PDF Ejemplo Móvil: [`ejemplo_como_debe_quedar_la_version_adatada_a_moviles.pdf`](ejemplo_como_debe_quedar_la_version_adatada_a_moviles.pdf)

- **Páginas:** 3 (25% más compacto)
- **Formato:** Versión mobile-first
- **Características clave de la transformación:**
  - ✅ Jerarquía visual clara con títulos grandes
  - ✅ Emojis como anclas visuales (🗺️, ✅, 🏨, 🍽️)
  - ✅ Texto condensado en bullets points
  - ✅ Cada día resumido a 2-3 líneas (de 6-8 líneas originales)
  - ✅ Secciones marcadas con iconos
  - ✅ Single-column layout (no tablas complejas)
  - ✅ Alojamientos agrupados por ciudad con formato simplificado
  - ✅ Numeración de página visible

### 2.3 Diferencias Clave Detectadas

| Aspecto | Original | Móvil |
|---------|----------|-------|
| Estructura | Párrafos narrativos | Bullet points |
| Columnas | Multi-columna | Single column |
| Extensión | 4 páginas A4 | 3 páginas (scroll vertical) |
| Iconografía | Ninguna | Emojis por sección |
| Alojamientos | Tabla compleja | Lista simple `Ciudad: Hotel` |
| Tonelada | Formal/descriptivo | Directo/resumido |

---

## 3. TECNOLOGÍAS DE PROCESAMIENTO PDF

### 3.1 Extracción de Texto (Parse)

| Librería | Ventajas | Desventajas | Veredicto |
|----------|----------|-------------|-----------|
| [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) | Ligero, simple, Node.js nativo | Sin tipado TS fuerte | ⭐ **RECOMENDADO** |
| `pdfplumber` (Python) | Muy preciso, extrae tablas | Requiere Python, más pesado | Alternativa |
| `pdf.js` (Mozilla) | Estándar del navegador | Overkill para servidor | No necesario |

### 3.2 Generación de PDF (Render)

| Librería | Ventajas | Desventajas | Veredicto |
|----------|----------|-------------|-----------|
| [`pdfmake`](https://www.npmjs.com/package/pdfmake) | Templates declarativos JSON, fácil de usar, soporta fuentes TTF y emojis | Rendimiento medio | ⭐ **RECOMENDADO** |
| [`pdfkit`](https://www.npmjs.com/package/pdfkit) | API fluida, control preciso de layout | Curva de aprendizaje mayor | Alternativa |
| [`pdf-lib`](https://www.npmjs.com/package/pdf-lib) | Ideal para modificar PDFs existentes | No pensado para crear desde cero | No para este caso |
| [`jspdf`](https://www.npmjs.com/package/jspdf) | Simple, ligero | Limitado en layouts complejos | No para este caso |

### 3.3 La Estrategia de Conversión

El proceso NO es "reformatear el PDF original" (eso es técnicamente muy complejo). La estrategia correcta es:

```
1. EXTRAER   → pdf-parse lee el texto del PDF original
2. TRANSFORMAR → LLM (OpenRouter/Groq) reformatea el texto a formato móvil
3. GENERAR   → pdfmake crea un PDF nuevo con el texto transformado
```

Este enfoque es lo que hace que el proyecto sea viable con herramientas gratuitas.

---

## 4. PLATAFORMAS DE HOSTING GRATUITAS

### 4.1 Render Free Tier

| Característica | Límite | Impacto en el proyecto |
|---------------|--------|----------------------|
| Horas de instancia | 750h/mes | ✅ Suficiente (1 servicio 24/7 = ~720h) |
| Servicios gratuitos | 25 | ✅ Solo necesitamos 1 Web Service + 1 Static Site |
| Static Sites | Ilimitados gratis | ✅ Frontend HTML+JS |
| Spin-down idle | 15 min sin tráfico | ⚠️ Primer request tras inactividad tarda ~1 min |
| Filesystem | Efímero | ⚠️ **Crítico**: no guardar PDFs en disco local |
| Persistent Disk | ❌ No en free tier | Obliga a usar Supabase Storage |
| RAM | 512 MB | ✅ Suficiente para procesar PDFs |
| Bandwidth | 100 GB outbound | ✅ Más que suficiente |

**⚠️ Puntos de atención:**
- El servicio se "duerme" tras 15 minutos sin requests → cold start de ~1 minuto
- NO se puede guardar archivos en el filesystem del servidor → usar Supabase Storage
- La BD PostgreSQL gratuita de Render expira a los 30 días → **mejor usar Supabase**

### 4.2 Supabase Free Tier

| Característica | Límite | Impacto en el proyecto |
|---------------|--------|----------------------|
| Base de datos | 500 MB | ✅ Solo guardamos metadatos de conversiones |
| Storage | 1 GB | ✅ Suficiente para PDFs (~100-500 KB c/u) |
| Egress | 5 GB/mes | ⚠️ Podría ser justo si hay muchas descargas |
| MAU | 50,000 | ✅ Más que suficiente |
| API Requests | Ilimitadas | ✅ Sin preocupaciones |
| Proyectos activos | 2 | ✅ Uno para prod |
| Pausa por inactividad | 1 semana | ⚠️ Si no se usa en 1 semana, se pausa |
| Upload máximo | 50 MB | ✅ PDFs típicos son < 2 MB |

---

## 5. APIs GRATUITAS DE LLM (Inteligencia Artificial)

Investigación realizada sobre el repositorio [`awesome-free-llm-apis`](https://github.com/mnfst/awesome-free-llm-apis) (4.6K estrellas, mayo 2026).

### 5.1 Mejores Opciones para Este Proyecto

| Proveedor | Modelo Recomendado | Límite Gratuito | Requiere Tarjeta | Base URL |
|-----------|-------------------|-----------------|------------------|----------|
| **OpenRouter** ⭐ | `deepseek/deepseek-chat-v3.1:free` | 50 req/día, 20 RPM | ❌ No | `https://openrouter.ai/api/v1` |
| **Groq** ⭐ | `llama-3.3-70b-versatile` | 14,400 req/día, 30 RPM | ❌ No | `https://api.groq.com/openai/v1` |
| **Cloudflare Workers AI** | `@cf/meta/llama-3.3-70b-instruct` | 10K neurons/día | ❌ No | API específica |
| **Mistral AI** | `Mistral Small 4` | ~1B tokens/mes | ❌ No | `https://api.mistral.ai/v1` |
| **DeepSeek** | `deepseek-chat (V3.2)` | 5M tokens (30 días) | ❌ No | `https://api.deepseek.com/v1` |
| **Google Gemini** | `Gemini 2.5 Flash` | 250 req/día | ❌ No | 🔴 NO disponible en EU |

### 5.2 Recomendación Final

**Opción Primaria: Groq** → 14,400 req/día, gratis, sin tarjeta, OpenAI-compatible, ultra-rápido (LPU). Con el modelo `llama-3.3-70b-versatile`.

**Opción Secundaria (fallback): OpenRouter** → Modelos `:free` con 50 req/día. Usar `deepseek/deepseek-chat-v3.1:free` o `meta-llama/llama-3.3-70b-instruct:free`.

### 5.3 Prompt de Transformación (Diseño Conceptual)

El prompt enviado al LLM debe indicar:

```
Eres un diseñador de contenidos. Convierte el siguiente extracto de un folleto de viajes
en una versión adaptada para lectura en móvil. Reglas:
1. Una sola columna, texto claro y directo
2. Usa emojis como anclas visuales (🗺️ ✅ 🏨 🍽️)
3. Resume a bullets, máximo 2-3 líneas por día
4. Agrupa alojamientos como "Ciudad: Hotel1, Hotel2"
5. Añade numeración de página al final
6. Mantén toda la información importante, elimina solo redundancias
```

---

## 6. ARQUITECTURA PROPUESTA

### 6.1 Diagrama de Flujo

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────┐
│  USUARIO  │────▶│  Render Static   │────▶│  Render Web       │
│  (Cliente)│◀────│  (Frontend)      │◀────│  Service (Backend)│
└──────────┘     └─────────────────┘     └────────┬─────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    │              │              │
                                    ▼              ▼              ▼
                             ┌──────────┐  ┌──────────┐  ┌──────────┐
                             │ Supabase │  │ pdf-parse│  │  Groq /  │
                             │ Storage  │  │   (npm)  │  │OpenRouter│
                             └──────────┘  └──────────┘  └──────────┘
```

### 6.2 Estructura del Proyecto

```
belen1/
├── frontend/                  # Render Static Site
│   ├── index.html             # SPA con upload y preview
│   ├── style.css              # Diseño moderno y limpio
│   └── app.js                 # Lógica de upload, llamadas API
├── backend/                   # Render Web Service
│   ├── server.js              # Express server
│   ├── convertPdf.js          # Lógica de conversión
│   └── package.json
├── investigaciones/           # Documentación de investigación
└── .roo/                      # Memory Bank
```

### 6.3 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/convert` | Sube PDF original + prompt opcional |
| `GET` | `/api/status/:jobId` | Consulta estado de conversión |
| `GET` | `/api/download/:fileId` | Descarga PDF convertido |

### 6.4 Flujo de Conversión

1. Usuario sube PDF + escribe prompt opcional en textarea
2. Frontend envía archivo a `/api/convert`
3. Backend guarda PDF original en Supabase Storage
4. Backend extrae texto con `pdf-parse`
5. Backend envía texto al LLM (Groq/OpenRouter) con prompt de transformación
6. Backend recibe texto reformateado del LLM
7. Backend genera nuevo PDF con `pdfmake` (usando fuente que soporte emojis, e.g. Noto Color Emoji)
8. Backend guarda PDF convertido en Supabase Storage
9. Backend devuelve URL de descarga al frontend

---

## 7. LIMITACIONES Y RIESGOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Cold start de Render (1 min) | Alta | Medio | Mostrar spinner/pantalla de carga al usuario |
| Rate limit de Groq excedido | Baja | Alto | Fallback automático a OpenRouter |
| Encoding corrupto en PDF original | Media | Medio | Pre-procesar texto, detectar charset |
| Supabase se pausa por inactividad | Media | Alto | Configurar un health-check (cron job gratuito) |
| Límite egress de Supabase (5 GB) | Baja | Bajo | Los PDFs son pequeños (< 500 KB) |
| Emojis no se renderizan en PDF | Media | Medio | Usar fuente Noto Color Emoji embebida en pdfmake |
| Calidad de reformateo del LLM | Media | Alto | Incluir campo de prompt para ajustes del usuario |

---

## 8. PLAN DE IMPLEMENTACIÓN RECOMENDADO

### Fase 1: MVP (1-2 días)
1. Backend Node.js con Express + endpoint `/api/convert`
2. Integración con `pdf-parse` + Groq API
3. Generación PDF con `pdfmake`
4. Frontend HTML simple con drag & drop + textarea

### Fase 2: Producción (1 día)
5. Configurar Supabase Storage
6. Configurar Render Static Site + Web Service
7. Variables de entorno (.env)
8. Sistema de fallback LLM

### Fase 3: Pulido (1 día)
9. Estilo moderno CSS
10. Preview antes de descargar
11. Manejo de errores y edge cases
12. Health-check anti-pausa

---

## 9. ALTERNATIVAS EVALUADAS Y DESCARTADAS

| Alternativa | Motivo del descarte |
|-------------|---------------------|
| Puppeteer / Headless Chrome en servidor | Demasiado pesado para Render Free (512MB RAM) |
| Modificar PDF original (pdf-lib) | El layout multi-columna no se puede "refluir" automáticamente sin IA |
| Solo Python (Flask) | Más pesado, cold starts más lentos |
| Vercel Free Tier | Límite de 10s por función serverless → no viable para procesar PDFs |
| Solo frontend (sin backend) | Necesitamos LLM y generación PDF → requiere servidor |
| APIs de pago (OpenAI, Anthropic) | Rompe el requisito "todo gratis" |

---

## 10. CONCLUSIÓN

El proyecto es **totalmente viable con coste 0€/mes**. La clave es usar la estrategia de "extraer → transformar con IA gratuita → generar PDF nuevo" en lugar de intentar modificar el PDF original. Las herramientas gratuitas disponibles en 2026 (Groq con 14K req/día, pdf-parse, pdfmake) son más que suficientes para este caso de uso.

**Próximo paso recomendado:** Pasar a modo Architect para diseñar en detalle la estructura de archivos y componentes, y luego a Code para implementar el MVP.

---

> **Investigación realizada por:** Borja Sanchez (modo Investigador)  
> **Fuentes detalladas:** Ver [`fuentes_pdf_to_mobile.md`](investigaciones/fuentes_pdf_to_mobile.md)
