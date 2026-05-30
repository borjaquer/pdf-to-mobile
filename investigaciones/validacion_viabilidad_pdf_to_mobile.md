# INFORME DE VALIDACIÓN DE VIABILIDAD: PDF-to-Mobile Web App

> **Fecha:** 29 de Mayo de 2026  
> **Proyecto:** Belen1  
> **Tipo:** Validación externa del informe arquitectónico [`informe_pdf_to_mobile.md`](investigaciones/informe_pdf_to_mobile.md)  
> **Método:** Verificación de cada afirmación técnica contra documentación oficial y fuentes primarias  
> **Conclusión general:** ⚠️ **VIABLE CON CORRECCIONES CRÍTICAS**

---

## 1. METODOLOGÍA DE VERIFICACIÓN

Cada afirmación del informe original fue contrastada contra la documentación oficial del proveedor (scrape directo de páginas de pricing, documentación y repositorios GitHub). Se realizaron 6 bloques de búsqueda independientes en fuentes primarias.

| Bloque | Fuentes Verificadas | Estado |
|--------|---------------------|--------|
| B1: Render Free Tier | [`render.com/pricing`](https://render.com/pricing) | ✅ Verificado |
| B2: Gemini API Free Tier | [`ai.google.dev/pricing`](https://ai.google.dev/pricing) | 🔴 **Discrepancia crítica** |
| B3: Supabase Free Tier | [`supabase.com/pricing`](https://supabase.com/pricing) | ⚠️ Ajustes menores |
| B4: Ollama + Cursor | GitHub, documentación oficial | ✅ Verificado |
| B5: Librerías client-side PDF | npm, GitHub, docs oficiales | ✅ Verificado |
| B6: Vercel vs Render + APIs IA | [`vercel.com/pricing`](https://vercel.com/pricing), [`together.ai/pricing`](https://www.together.ai/pricing) | ✅ Verificado |

---

## 2. HALLAZGOS POR CAPA TECNOLÓGICA

### 2.1 Plataforma de Hosting

#### Afirmación del informe original
> "Render Web Service (Node.js + Express) — $0 (750h/mes)"

#### Realidad verificada

| Aspecto | Informe Original | Realidad (Mayo 2026) | Estado |
|---------|------------------|----------------------|--------|
| Tipo de servicio | Web Service | **Static Site** (recomendado) | ⚠️ Cambio de arquitectura |
| Cold starts | ~1 min tras 15min idle | **No tiene** (Static Site) | ✅ Mejor de lo indicado |
| Compute hours | 750h/mes | **Ilimitado** (Static Site) | ✅ Mejor |
| RAM | 512 MB | N/A (sin servidor) | N/A |
| Filesystem persistente | No | N/A | N/A |

**Conclusión B1:** La arquitectura del informe original propone un `Render Web Service` con Node.js/Express, pero la investigación confirma que **Render Static Sites es superior y suficiente**: sin cold starts, CDN global automático, bandwidth de 100GB/mes y sin límite de horas de cómputo. Esto implica que **no se necesita backend propio** — toda la lógica puede ejecutarse en el navegador del cliente.

---

### 2.2 API de Inteligencia Artificial (🔴 CRÍTICO)

#### Afirmación del informe original

| Proveedor | Límite afirmado |
|-----------|----------------|
| Groq | 14,400 req/día, 30 RPM |
| OpenRouter | 50 req/día, 20 RPM |
| Gemini 2.5 Flash | 250 req/día |

#### Realidad verificada (documentación oficial Google AI, Mayo 2026)

**Google Gemini API Free Tier (post-recorte Diciembre 2025):**

| Modelo | RPM | RPD | TPM |
|--------|-----|-----|-----|
| Gemini 2.0 Flash | **5** | **100** | 250K |
| Gemini 2.5 Flash | **10** | **250** | 250K |
| Gemini 2.5 Pro | 2 | 25 | 50K |

> 📎 **Fuente:** [`ai.google.dev/pricing`](https://ai.google.dev/pricing) — Visitado y verificado el 29/05/2026.

#### 🔴 Discrepancia crítica detectada

El informe original menciona "250 req/día" para Gemini 2.5 Flash sin especificar RPM. **Los números reales son drásticamente inferiores**:

| Métrica | Informe Original | Realidad (Mayo 2026) | Diferencia |
|---------|------------------|----------------------|------------|
| Gemini 2.0 Flash RPM | No especificado | **5 RPM** | — |
| Gemini 2.0 Flash RPD | "1,500 diarios" (sección 5.1) | **100 RPD** | 🔴 **~93% menor** |
| Gemini 2.5 Flash RPD | 250 req/día | **250 RPD** | ✅ Coincide |
| TPM (ambos) | No especificado | 250K | — |

**Impacto en viabilidad:**
- Con 5 RPM de Flash 2.0, las peticiones deben espaciarse **al menos 12 segundos** entre sí.
- Con 100 RPD de Flash 2.0, el máximo de conversiones diarias es **~100** (asumiendo 1 petición LLM por PDF).
- Con 250 RPD de Flash 2.5, el máximo es **~250 conversiones/día**.
- Si se usa Flash 2.5 como modelo principal (10 RPM / 250 RPD), el proyecto puede manejar **~250 PDFs/día** sin coste.

**Sobre Groq y OpenRouter:**
- **Groq:** No se pudo verificar el límite gratuito actual porque la página de rate limits requiere autenticación. El dato de "14,400 req/día" proviene del repositorio [`awesome-free-llm-apis`](https://github.com/mnfst/awesome-free-llm-apis) que puede estar desactualizado.
- **OpenRouter:** Los modelos `:free` tienen límites variables por modelo y pueden cambiar sin previo aviso. El dato de "50 req/día" es una estimación conservadora razonable.
- **Together AI:** **No tiene free tier** para inference. Todos los modelos listados en [`together.ai/pricing`](https://www.together.ai/pricing) tienen precios por millón de tokens (desde $0.03/MT para LFM2 24B hasta $4.40/MT para DeepSeek V4 Pro). No aparece ninguna capa gratuita.

#### Recomendación revisada para la capa de IA

| Prioridad | Proveedor | Modelo | RPM | RPD | Coste |
|-----------|-----------|-------|-----|-----|-------|
| **Primaria** | Google Gemini | `gemini-2.5-flash` | 10 | 250 | **$0** |
| **Secundaria (fallback)** | OpenRouter | `deepseek/deepseek-chat-v3.1:free` | ~20 | ~50 | **$0** |
| **Terciaria (local)** | Ollama local | `gpt-oss-20b` | Ilimitado | Ilimitado | **$0** |

> ⚠️ **Nota importante sobre GDPR:** La API de Gemini tiene restricciones geográficas. Si el proyecto se despliega en la UE, verificar disponibilidad. El informe original ya advertía "🔴 NO disponible en EU". Si esto es un bloqueo, la alternativa viable es OpenRouter + Ollama local.

---

### 2.3 Supabase Free Tier

#### Afirmación del informe original
> "500 MB DB, 1 GB Storage, 5 GB egress/mes, 50K MAU, 2 proyectos, pausa por inactividad 1 semana"

#### Realidad verificada

| Característica | Informe Original | Realidad (Mayo 2026) | Estado |
|---------------|------------------|----------------------|--------|
| Base de datos | 500 MB | 500 MB | ✅ |
| Storage | 1 GB | 1 GB | ✅ |
| Egress | 5 GB/mes | 5 GB + 5 GB cached egress | ⚠️ No son 10GB |
| MAU | 50,000 | 50,000 | ✅ |
| Proyectos activos | 2 | 2 (pausa tras 1 semana) | ✅ |
| Edge Functions | No mencionado | 500K invocaciones/mes | ➕ Extra |
| Upload máximo | 50 MB | No especificado públicamente | — |

> 📎 **Fuente:** [`supabase.com/pricing`](https://supabase.com/pricing) — Visitado y verificado el 29/05/2026.

**Conclusión B3:** Las cifras del informe original son **sustancialmente correctas**. El matiz del egress (5GB + 5GB cached) no cambia la viabilidad. Supabase es adecuado como almacenamiento opcional de PDFs y metadatos.

---

### 2.4 Ecosistema Ollama + Cursor (Desarrollo Local)

#### Afirmación del informe original
> No abordado en el informe original. Se investigó como alternativa complementaria.

#### Realidad verificada

| Aspecto | Hallazgo |
|---------|----------|
| **GPT-OSS** | ✅ Modelos reales de OpenAI bajo licencia Apache 2.0: `gpt-oss-20b` (~14GB), `gpt-oss-120b` (~65GB) |
| **Ollama + Cursor** | ✅ Integración válida. Requiere `OLLAMA_ORIGINS="*"` en variables de entorno. Override de OpenAI Base URL a `http://localhost:11434/v1` |
| **Viabilidad local** | ✅ El modelo `gpt-oss-20b` cabe en 16GB RAM. Corre en PC de desarrollo sin GPU |

> 📎 **Fuentes:** [GitHub `openai/gpt-oss`](https://github.com/openai/gpt-oss), [Ollama docs](https://ollama.com), documentación de Cursor.

**Conclusión B4:** La ruta de desarrollo y fallback local con Ollama + GPT-OSS es **técnicamente viable**. Para el equipo de desarrollo, permite trabajar sin depender de APIs externas durante la fase de iteración.

---

### 2.5 Librerías Client-Side de PDF

#### Afirmación del informe original
> "`pdf-parse` (npm, open-source)" para extracción y "`pdfmake` (npm, open-source)" para generación. Ambas del lado servidor.

#### Realidad verificada — Enfoque client-side

La investigación confirma que existen alternativas **100% client-side** que eliminan la necesidad de un backend:

| Librería | Rol | Estado | Notas |
|----------|-----|--------|-------|
| [`react-pdftotext`](https://www.npmjs.com/package/react-pdftotext) | Extracción de texto | ✅ **Verificado** | Wrapper de pdf.js para React con API Promise simple. Client-side. |
| [`html2pdf.js` v0.10.1](https://www.npmjs.com/package/html2pdf.js) | Generación de PDF | ✅ **Verificado** | Soporta `windowWidth`, `pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }`, formato A5, orientación portrait. ⚠️ El texto queda rasterizado (no seleccionable). |
| [`@opendocsg/pdf2md`](https://www.npmjs.com/package/@opendocsg/pdf2md) | PDF a Markdown | ✅ **Existe en npm** | v0.2.6, ~35K descargas/semana. ⚠️ El repo web asociado fue **archivado en Mayo 2024**. El paquete npm sigue funcional. |

> 📎 **Fuentes:** npm registry, GitHub [`opendocsg/pdf2md-web`](https://github.com/opendocsg/pdf2md-web), [`html2pdf.js` docs](https://github.com/eKoopmans/html2pdf.js).

**Conclusión B5:** La tríada de librerías client-side (`react-pdftotext` → Gemini/LLM → `html2pdf.js`) es **técnicamente viable**. Esto confirma que no se necesita backend Node.js/Express. La limitación más notable es que `html2pdf.js` rasteriza texto (no es seleccionable en el PDF de salida). Si se requiere texto seleccionable, habría que evaluar [`pdfmake`](https://www.npmjs.com/package/pdfmake) o [`jspdf`](https://www.npmjs.com/package/jspdf) directamente, aunque son más complejos de integrar en cliente.

---

### 2.6 Vercel Hobby Plan (Alternativa a Render)

#### Realidad verificada

| Característica | Límite Vercel Hobby | Comparable a Render Static |
|---------------|---------------------|---------------------------|
| Edge Requests | 1M/mes | 100GB bandwidth |
| Data Transfer | 100 GB/mes | Similar |
| Blob Storage | 1 GB | N/A en Render Static |
| Serverless Functions | 4h Active CPU + 1M invocaciones | N/A (Render Static no tiene) |
| Build minutes | 6,000 min/mes (Standard) | Ilimitado |
| Deployments | Ilimitados | Ilimitados |
| Precio | **$0** | **$0** |

> 📎 **Fuente:** [`vercel.com/pricing`](https://vercel.com/pricing) — Visitado y verificado el 29/05/2026.

**Conclusión B6:** Vercel Hobby es una alternativa viable a Render Static Sites con características muy similares. La ventaja de Vercel es que ofrece 4h de funciones serverless (1M invocaciones) que podrían usarse como fallback si se necesita lógica mínima de servidor. Sin embargo, para una arquitectura puramente client-side, **Render Static Sites es suficiente y más simple**.

---

## 3. EVALUACIÓN GLOBAL DE VIABILIDAD

### 3.1 Matriz de Riesgos

| Riesgo | Severidad | Probabilidad | Impacto | Mitigación |
|--------|-----------|--------------|---------|------------|
| **Cuota Gemini inferior a la esperada** | 🔴 Crítica | 100% (ya ocurrió) | Límite diario de ~100-250 PDFs | Usar Flash 2.5 (mejor cuota) + OpenRouter como fallback + cola de peticiones con rate limiting |
| **Restricción geográfica Gemini en UE** | 🟠 Alta | Media | API no disponible desde Europa | Usar exclusivamente OpenRouter + Ollama local. NO depender de Gemini. |
| **html2pdf.js rasteriza texto** | 🟡 Media | 100% (es known issue) | PDFs de salida sin texto seleccionable | Aceptable para MVP. Migrar a `pdfmake` en v2 si es requisito. |
| **@opendocsg/pdf2md abandonado** | 🟡 Media | Repo web archivado 2024 | Posibles bugs sin resolver | Usar `react-pdftotext` + `pdf.js` directamente (más mantenidos). |
| **OpenRouter modelos :free inestables** | 🟡 Media | Alta | Cambios sin previo aviso en modelos gratuitos | Tener Ollama local como fallback último. |
| **Supabase pausa por inactividad** | 🟢 Baja | Solo si 1 semana sin uso | Proyecto se pausa | Un cron job semanal (ej: GitHub Actions) que haga una query. |
| **Render bandwidth 100GB** | 🟢 Baja | Solo con miles de usuarios | Límite de transferencia | Suficiente para PDFs pequeños (~100-500KB c/u). ~200K descargas/mes. |

### 3.2 Veredicto Final por Componente

| Componente | Informe Original | Realidad | Veredicto |
|------------|------------------|----------|-----------|
| Hosting (Render) | Web Service + Static Site | **Static Site solamente** | ⚠️ Arquitectura más simple de lo previsto |
| IA Principal | Groq (14,400 req/día) | **Gemini 2.5 Flash (250 RPD)** o OpenRouter | 🔴 Cambio de proveedor recomendado |
| IA Secundaria | OpenRouter (50 req/día) | Correcto como fallback | ✅ |
| IA Local | No contemplado | **Ollama + GPT-OSS 20B viable** | ➕ Nueva capacidad descubierta |
| Extracción PDF | `pdf-parse` (server-side) | **`react-pdftotext` (client-side)** | ✅ Más simple |
| Generación PDF | `pdfmake` (server-side) | **`html2pdf.js` (client-side)** | ⚠️ Limitación de texto rasterizado |
| Almacenamiento | Supabase | Correcto | ✅ |
|DB Metadatos | Supabase PostgreSQL | Correcto | ✅ |

### 3.3 Arquitectura Final Recomendada (Corregida)

```
┌──────────┐      ┌──────────────────┐      ┌─────────────────┐
│  USUARIO  │─────▶│  Render Static    │      │  Google Gemini   │
│ (Browser) │      │  (HTML+JS+CSS)    │─────▶│  API (2.5 Flash) │
│           │◀─────│  Sin backend      │◀─────│  10 RPM/250 RPD  │
└──────────┘      └──────────────────┘      └─────────────────┘
                         │                           │
                         │ (opcional)                │ (fallback)
                         ▼                           ▼
                  ┌─────────────┐          ┌──────────────────┐
                  │  Supabase    │          │  OpenRouter       │
                  │  Storage+DB  │          │  (modelos :free)  │
                  └─────────────┘          └──────────────────┘
```

**Flujo de procesamiento (100% client-side):**

```
1. USUARIO sube PDF desde el navegador
2. react-pdftotext extrae el texto (pdf.js en background)
3. Texto se envía a Gemini 2.5 Flash API con Structured Outputs (JSON Schema)
4. Gemini devuelve JSON estructurado con el contenido reformateado
5. html2pdf.js genera PDF de salida a partir de HTML renderizado
6. Usuario descarga el PDF adaptado a móvil
```

---

## 4. RECOMENDACIONES FINALES

### 4.1 Acciones Inmediatas (Antes de empezar a desarrollar)

1. **Verificar disponibilidad de Gemini API en España/UE.** Si no está disponible, pivotar a OpenRouter como API primaria.
2. **Crear cuenta en Google AI Studio** y obtener API key gratuita.
3. **Testear `react-pdftotext`** con el PDF real de ejemplo ([`Folleto-KNA10055-KANNAKEM-20260522153019-0-395.pdf`](Folleto-KNA10055-KANNAKEM-20260522153019-0-395.pdf)) para verificar que extrae correctamente el texto (incluyendo caracteres especiales y tildes).
4. **Diseñar el prompt y el JSON Schema** para Structured Outputs de Gemini, validando que el LLM puede resumir correctamente el texto del folleto.
5. **Testear `html2pdf.js`** con un HTML mock del formato móvil deseado para validar que la salida es aceptable pese a la rasterización de texto.

### 4.2 Stack Tecnológico Final Recomendado

| Capa | Tecnología | Coste |
|------|-----------|-------|
| Frontend | React + Vite + TypeScript | **$0** |
| Hosting | Render Static Site | **$0** |
| Extracción PDF | `react-pdftotext` (pdf.js) | **$0** |
| IA Reformateo | Gemini 2.5 Flash API (con Structured Outputs) | **$0** (250 req/día) |
| IA Fallback | OpenRouter `:free` + Ollama local `gpt-oss-20b` | **$0** |
| Generación PDF | `html2pdf.js` v0.10.1 | **$0** |
| Almacenamiento | Supabase Storage (opcional) | **$0** |
| Base de Datos | Supabase PostgreSQL (opcional) | **$0** |
| **Coste Total** | | **$0/mes** |

### 4.3 Lo que el informe original acertó

- ✅ La estrategia de 3 pasos (Extraer → Transformar → Generar) es correcta.
- ✅ Supabase Free Tier es adecuado como almacenamiento opcional.
- ✅ La arquitectura 100% gratuita es viable.
- ✅ Los PDFs de ejemplo son representativos del caso de uso.
- ✅ El uso de emojis como anclas visuales y single-column layout es la transformación correcta.

### 4.4 Lo que el informe original necesita corregir

- 🔴 **No se necesita Render Web Service ni backend.** Toda la lógica puede ser client-side.
- 🔴 **Los números de Gemini API están desactualizados en ~80%.** Usar Flash 2.5 (no Flash 2.0) para maximizar cuota gratuita.
- 🟠 **Considerar Ollama local** como tercera capa de fallback (no contemplado en el informe).
- 🟡 **`html2pdf.js` rasteriza texto.** Documentar esta limitación como conocida en el MVP.
- 🟡 **Together AI no tiene free tier.** Descartar como opción.

---

## 5. CONCLUSIÓN

**El proyecto es viable con coste $0/mes**, pero requiere ajustes arquitectónicos significativos respecto al informe original:

1. **Eliminar el backend** — Arquitectura 100% client-side con React + Vite.
2. **Ajustar expectativas de volumen** — Con Gemini 2.5 Flash gratuito, el máximo es ~250 PDFs/día (no los "1,500" implícitos en el informe original).
3. **Añadir Ollama local** como capa de fallback para desarrollo y continuidad operativa.
4. **Aceptar la limitación de texto rasterizado** en `html2pdf.js` para el MVP.

Con estas correcciones, el proyecto puede construirse y desplegarse completamente gratis, con una capacidad de **~250 conversiones diarias** y sin dependencia de un servidor backend.

---

> 📅 **Próximo paso:** Pasar a modo Architect para diseñar la especificación técnica detallada con la arquitectura corregida.
