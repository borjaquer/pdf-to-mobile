# FUENTES DE INVESTIGACIÓN: PDF-to-Mobile Web App

> **Fecha:** 29 de Mayo de 2026  
> **Archivos locales analizados:**
> - [`Folleto-KNA10055-KANNAKEM-20260522153019-0-395.pdf`](Folleto-KNA10055-KANNAKEM-20260522153019-0-395.pdf) (PDF original, 4 páginas)
> - [`ejemplo_como_debe_quedar_la_version_adatada_a_moviles.pdf`](ejemplo_como_debe_quedar_la_version_adatada_a_moviles.pdf) (PDF ejemplo móvil, 3 páginas)

---

## FUENTES PRIMARIAS

### 1. Render Free Tier - Documentación Oficial

**URL:** [https://render.com/docs/free](https://render.com/docs/free)  
**Fecha de consulta:** 29/05/2026  
**Tipo:** Documentación oficial de plataforma

**Puntos clave extraídos:**
- 750 horas de instancia gratuita por workspace al mes
- Hasta 25 servicios gratuitos
- Web services, Static Sites, Postgres y Key Value disponibles en free tier
- Spin down tras 15 minutos sin tráfico entrante (cold start ~1 minuto)
- Filesystem efímero: cambios se pierden al redeploy o spin down
- Free Postgres expira a los 30 días
- Static Sites siempre gratis
- Sin soporte para persistent disks en free tier
- Sin SSH/shell access en free tier
- Hasta 100 GB de bandwidth outbound incluido

---

### 2. Supabase Pricing - Página Oficial

**URL:** [https://supabase.com/pricing](https://supabase.com/pricing)  
**Fecha de consulta:** 29/05/2026  
**Tipo:** Página oficial de precios

**Puntos clave extraídos (Free Tier):**
- $0/mes
- 500 MB de base de datos
- 50,000 Monthly Active Users
- 1 GB de file storage
- 5 GB de egress
- 5 GB de cached egress
- 500,000 invocaciones de Edge Functions
- Subida máxima de archivo: 50 MB
- Proyectos se pausan tras 1 semana de inactividad
- Límite de 2 proyectos activos simultáneos
- CDN básico incluido
- Sin backups automáticos
- Log retention: 1 día

---

### 3. Awesome Free LLM APIs - Repositorio GitHub

**URL:** [https://github.com/mnfst/awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis)  
**Fecha de consulta:** 29/05/2026  
**Tipo:** Awesome list mantenida por la comunidad (4.6K ⭐, última actualización: 27/05/2026)  
**Licencia:** CC0-1.0

**APIs gratuitas recomendadas para este proyecto:**

#### 3a. Groq (Recomendación Primaria)
- **URL:** [https://console.groq.com/keys](https://console.groq.com/keys)
- **Base URL:** `https://api.groq.com/openai/v1`
- **Coste:** $0 (sin tarjeta de crédito)
- **Límites:** 14,400 req/día, 30 RPM
- **Modelo recomendado:** `llama-3.3-70b-versatile`
  - Contexto: 131K tokens
  - Output: 32K tokens
- **Modelo alternativo:** `qwen3-32b` (131K contexto, 131K output)
- **Ventaja:** Ultra-rápido (LPU inference), OpenAI SDK compatible
- **Inconveniente:** Límite de 500 RPD para Llama 4 Maverick

#### 3b. OpenRouter (Recomendación Secundaria/Fallback)
- **URL:** [https://openrouter.ai/keys](https://openrouter.ai/keys)
- **Base URL:** `https://openrouter.ai/api/v1`
- **Coste:** $0 (modelos `:free`)
- **Límites:** 50 req/día por modelo free, 20 RPM
- **Modelos recomendados:**
  - `deepseek/deepseek-chat-v3.1:free` (163K contexto, 163K output)
  - `qwen/qwen3-235b-a22b:free` (128K contexto, ~32K output)
  - `meta-llama/llama-3.3-70b-instruct:free` (65K contexto, ~16K output)
- **Ventaja:** ~28 modelos free disponibles
- **Inconveniente:** 50 req/día puede ser limitado

#### 3c. DeepSeek (Alternativa con créditos)
- **URL:** [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
- **Base URL:** `https://api.deepseek.com/v1`
- **Coste:** $0 (5M tokens gratis al registrarse, caducan en 30 días)
- **Modelos:** `deepseek-chat` (V3.2, 128K), `deepseek-reasoner` (R1, 128K)
- **Inconveniente:** Créditos expiran, luego es de pago

#### 3d. Mistral AI (Alternativa Europea)
- **URL:** [https://console.mistral.ai/api-keys](https://console.mistral.ai/api-keys)
- **Base URL:** `https://api.mistral.ai/v1`
- **Coste:** $0 (plan "Experiment", sin tarjeta)
- **Límites:** ~1B tokens/mes, ~1 RPS
- **Modelo recomendado:** `Mistral Small 4` (256K contexto, 256K output)
- **Ventaja:** Empresa europea (GDPR-friendly), límites muy generosos
- **Inconveniente:** Prompts pueden usarse para mejorar modelos

#### 3e. APIs Descartadas
| API | Motivo del descarte |
|-----|---------------------|
| Google Gemini | ❌ No disponible en EU/UK/Switzerland |
| GitHub Models | ❌ Solo para prototipado, límites muy bajos (50 RPD) |
| Cloudflare Workers AI | ❌ API no OpenAI-compatible, requiere account_id |
| Ollama Cloud | ❌ API propietaria, no OpenAI SDK-compatible |
| OVHcloud AI Endpoints | ✅ Viable pero solo 2 RPM en modo anónimo |

---

### 4. 5 Useful NPM Packages for PDF Processing in Node.js

**URL:** [https://medium.com/deno-the-complete-reference/5-useful-npm-packages-for-pdf-processing-in-node-js-c573cee51804](https://medium.com/deno-the-complete-reference/5-useful-npm-packages-for-pdf-processing-in-node-js-c573cee51804)  
**Autor:** Mayank C  
**Fecha:** 8 Diciembre 2024  
**Tipo:** Artículo técnico Medium

**Resumen de librerías analizadas:**

| Librería | Función | Recomendación del autor |
|----------|---------|------------------------|
| `pdf-lib` | Crear/modificar PDFs, parseo, validación | Grandes flujos de generación |
| `jspdf` | Crear PDFs simples | PDFs sencillos con mínima personalización |
| `pdfkit` | Crear PDFs complejos con control preciso | Layouts complejos y personalización |
| `pdf-parse` | Extraer texto y metadata de PDFs | Extracción de texto y análisis |
| `pdfmake` | PDFs con templates JSON personalizables | Templates y layouts de alta calidad |

---

### 5. Best JavaScript PDF Libraries 2025 - Nutrient.io

**URL:** [https://www.nutrient.io/blog/javascript-pdf-libraries/](https://www.nutrient.io/blog/javascript-pdf-libraries/)  
**Tipo:** Comparativa técnica  
**Hallazgo:** Confirma el ecosistema de librerías JavaScript para PDF. La mayoría son comerciales (Nutrient/PSPDFKit) o requieren licencia para producción.

---

## FUENTES SECUNDARIAS

### 6. Render Free Tier Web Hosting Status Report 2025
**URL:** [https://www.linkedin.com/pulse/free-tier-web-hosting-status-report-2025-opportunity-hack-ik7fc](https://www.linkedin.com/pulse/free-tier-web-hosting-status-report-2025-opportunity-hack-ik7fc)  
**Tipo:** Análisis de mercado  
**Hallazgo:** Confirma que Render sigue siendo una de las mejores opciones gratuitas en 2025-2026.

### 7. Reddit: Is render.com free?
**URL:** [https://www.reddit.com/r/rails/comments/13oqeet/is_rendercom_free/](https://www.reddit.com/r/rails/comments/13oqeet/is_rendercom_free/)  
**Tipo:** Discusión comunitaria  
**Hallazgo:** Usuarios confirman que 750h alcanzan justo para 1 servicio 24/7 (720h/mes). Si hay 2 servicios gratuitos, se reparten las horas.

### 8. Reddit: How much can the free supabase tier handle?
**URL:** [https://www.reddit.com/r/Supabase/comments/1jk8s07/how_much_can_the_free_supabase_tier_handle/](https://www.reddit.com/r/Supabase/comments/1jk8s07/how_much_can_the_free_supabase_tier_handle/)  
**Tipo:** Discusión comunitaria  
**Hallazgo:** El cuello de botella principal en Supabase Free es el egress (5 GB). Para PDFs pequeños no debería ser problema.

---

## ANÁLISIS DE PDFs LOCALES

### PDF Original - Extracción de Texto
**Herramienta:** pdfplumber (Python 3.13)  
**Fecha:** 29/05/2026

**Contenido extraído (4 páginas):**
- Página 1: Título, precio (1.332€), días 1-3 del itinerario
- Página 2: Días 4-6 del itinerario (Selva Negra, Heidelberg, Ruta de Cuentos)
- Página 3: Días 7-9 + tabla de alojamientos + opciones
- Página 4: Servicios incluidos detallados

**Problema detectado:** Encoding corrupto en caracteres acentuados (ej: "Z�rich", "presentaci�n"). Se deberá implementar detección y corrección de charset.

### PDF Ejemplo Móvil - Extracción de Texto
**Herramienta:** pdfplumber (Python 3.13)  
**Páginas:** 3

**Transformaciones observadas:**
- Título con jerarquía: "ALSACIA Y PERLAS DE ALEMANIA" → "Dossier Exclusivo de Itinerario • 9 Días y 8 Noches"
- Días resumidos a 2-3 líneas con bullets implícitos
- Secciones con emojis: 🗺️ ITINERARIO, ✅ SERVICIOS INCLUIDOS, 🏨 ALOJAMIENTOS, 🍽️ OPCIÓN COMIDAS PLUS
- Alojamientos en formato "Ciudad: Hotel1, Hotel2, Hotel3" (línea única)
- Servicios en bullets con "•"
- Numeración de página (1, 2, 3) al final de cada página

---

## TECNOLOGÍAS ESPECÍFICAS RECOMENDADAS

### pdf-parse
- **npm:** [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- **Función:** Extraer texto de PDFs en Node.js
- **Ventaja:** Sin dependencias nativas, ligero

### pdfmake
- **npm:** [pdfmake](https://www.npmjs.com/package/pdfmake)
- **Función:** Generar PDFs desde definiciones JSON
- **Ventaja:** Soporta fuentes personalizadas (necesario para emojis), layouts flexibles

### Noto Color Emoji (fuente para emojis en PDF)
- **URL:** [https://fonts.google.com/noto/specimen/Noto+Color+Emoji](https://fonts.google.com/noto/specimen/Noto+Color+Emoji)
- **Uso:** Embebida en pdfmake para renderizar emojis correctamente en PDFs generados

### Express.js
- **npm:** [express](https://www.npmjs.com/package/express)
- **Función:** Servidor HTTP para el backend
- **Ventaja:** Mínimo, rápido, ideal para Render Free

### multer
- **npm:** [multer](https://www.npmjs.com/package/multer)
- **Función:** Manejo de upload de archivos en Express
- **Nota:** Usar con `memoryStorage` (no guardar en disco por filesystem efímero de Render)

---

> **Total fuentes consultadas:** 10+ (entre documentación oficial, artículos técnicos, repositorios y discusiones comunitarias)
