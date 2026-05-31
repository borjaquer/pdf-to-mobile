# Informe de Investigación: Mejora del Chat de Diseño PDF-to-Mobile

> **Fecha:** 2026-05-30  
> **Modo:** 🕵️ Investigador  
> **Objetivo:** Diagnosticar por qué el chat de diseño produce resultados mediocres y diseñar una solución basada en búsqueda web inteligente.

---

## 1. Resumen Ejecutivo

El chat de diseño del panel inferior de PDF-to-Mobile permite al usuario dar instrucciones en lenguaje natural como "cambiar colores" o "diseño elegante". Sin embargo, los resultados son deficientes porque **el LLM opera sin referencias externas de diseño**, adivinando qué significa "bonito" o "premium". De las 8 sugerencias predefinidas en [`ChatPanel.tsx`](src/components/ChatPanel.tsx:9), solo 2 disparan búsqueda web. Las otras 6 van directas al LLM sin contexto.

**Este informe propone una arquitectura de búsqueda web inteligente que convierte cada mensaje del usuario en referencias de diseño reales antes de enviarlas al LLM**, transformando al chat de un "adivinador ciego" a un "diseñador informado".

---

## 2. Diagnóstico del Sistema Actual

### 2.1 Arquitectura Actual

```
Usuario → ChatPanel.tsx → usePdfConversion.applyChatChanges()
                              ↓
                         detectSearchIntent(message)
                              ↓                    ↓
                         ¿Buscar web?         NO → LLM directo (ciego)
                              ↓
                         SÍ → searchWeb(query)
                              ↓
                         formatSearchContext(results)
                              ↓
                         interpretChatInstruction(msg, content, styles, searchContext?)
                              ↓
                         LLM (DeepSeek/OpenRouter) + CHAT_DESIGN_SYSTEM_PROMPT
                              ↓
                         {content, styles, message}
```

### 2.2 Problema #1: Detector de Intención Demasiado Restrictivo

Archivo: [`src/services/webSearch.ts`](src/services/webSearch.ts:88)

El `detectSearchIntent()` solo captura:
- Patrones explícitos: `"busca..."`, `"investiga..."`, `"infórmate sobre..."`
- Preguntas factuales: `"qué es..."`, `"cuál es..."`
- Patrones de inspiración: `"tendencias..."`, `"ejemplos de..."`, `"recomiéndame..."`

**Resultado:** De las 8 sugerencias del [`ChatPanel.tsx`](src/components/ChatPanel.tsx:9):
| Sugerencia | ¿Dispara búsqueda? |
|---|---|
| 🎨 Cambiar colores | ❌ NO |
| 🔤 Cambiar fuente | ❌ NO |
| 📝 Editar título | ❌ NO |
| 📱 Texto más grande | ❌ NO |
| 🌙 Fondo oscuro | ❌ NO |
| ✨ Diseño elegante | ❌ NO |
| 🌐 Busca tendencias de diseño 2026 | ✅ SÍ |
| 🎯 Investiga colores para viajes | ✅ SÍ |

### 2.3 Problema #2: El LLM Carece de Criterio Estético

El prompt del sistema actual ([`chatDesignInterpreter.ts`](src/prompts/chatDesignInterpreter.ts:6)) tiene reglas muy básicas:

```
- "azul" genérico → #2563eb
- "azul marino" → #1e3a5f
- "rojo" → #dc2626
```

Esto es un mapeo 1:1 simplista. El LLM no sabe:
- Qué colores son tendencia en 2026 para documentos de viaje
- Qué tipografías son "premium" para itinerarios
- Cómo se ve un diseño "elegante" en la práctica
- Qué combinaciones de color funcionan juntas (teoría del color)

### 2.4 Problema #3: Sin Transformación Mensaje→Query

Cuando SÍ se dispara una búsqueda, se usa el mensaje literal del usuario como query. Ejemplo:
- Usuario: `"Busca tendencias de diseño 2026"`
- Query usada: `"tendencias de diseño 2026"` ← demasiado genérica

Una query optimizada sería: `"best color palettes typography travel brochure design trends 2026"`

---

## 3. Investigación de Referencias de Diseño

Se realizaron 3 búsquedas en fuentes especializadas de diseño para recopilar referencias actualizadas que el LLM pueda usar.

### 3.1 Colores Tendencia 2026

**Fuente:** [Elle Decor - Pinterest 2026 Color Palette](https://www.elledecor.com/design-decorate/trends/a69936941/pinterest-2026-color-palette/)

Pinterest analizó 24 meses de datos (búsquedas y saves) para identificar 5 colores dominantes en 2026:

| Color | Hex | Crecimiento | Aplicación Viajes |
|---|---|---|---|
| **Persimmon** | `#FF5C34` | +100% búsquedas | Viajes de aventura, energía |
| **Cool Blue** | `#D7EFFF` | +85% búsquedas | Playas, relax, bienestar |
| **Jade** | `#AEB8A0` | +135% accesorios | Eco-turismo, naturaleza |
| **Plum Noir** | `#351E28` | +220% "dark plum" | Viajes de lujo, premium |
| **Wasabi** | `#E9F056` | +175% "chartreuse" | Viajes urbanos, moderno |

**Fuente adicional:** [VistaPrint - Color Trends 2026](https://www.vistaprint.com/hub/color-trends) — 8 tendencias: Mermaidcore, Banana Yellow, Tangerine Disco, Sunwashed Soft, Clubroom Contrast, Neon Shock.

### 3.2 Tipografías Populares 2026

**Fuente:** [Creative Boom - 50 fonts that will be popular with designers in 2026](https://www.creativeboom.com/resources/top-50-fonts-in-2026/)

Las 50 tipografías más relevantes para 2026, organizadas por categoría:

**Sans-serif (recomendadas para cuerpo de texto):**
- **Inter** (Rasmus Andersson) — Open source, optimizada para pantallas, 147 idiomas. Ideal para PDF mobile.
- **GT America** (Grilli Type) — 84 estilos, versátil para corporativo y editorial.
- **Söhne** (Klim) — Evoca Akzidenz-Grotesk, contemporánea.
- **Aeonik** (CoType) — Usada por Revolut, Eurosport, Alipay.
- **Neue Montreal** (Pangram Pangram) — Inspirada en diseño modernista canadiense.

**Serif (recomendadas para títulos y contraste):**
- **GT Sectra** (Grilli Type) — Caligrafía con precisión quirúrgica.
- **Lyon Text** (Commercial Type) — Del Renacimiento francés, usada en NYT Magazine.
- **Portrait** (Commercial Type) — Minimalista, interpretación de tipografía renacentista francesa.
- **Editorial New** (Pangram Pangram) — Estrecha, elegante, para long-form.

**Combinaciones recomendadas para travel PDF:**
- Inter (body) + Playfair Display (headings)
- GT America (body) + GT Sectra (headings)  
- Aeonik (body) + Editorial New (headings)

### 3.3 Patrones de Diseño para Travel Brochures

**Fuente:** [Design Shifu - Travel brochure examples to get inspired in 2026](https://www.designshifu.com/blog/creative-travel-brochure-examples-to-get-inspired)

Principios de diseño extraídos:
- **Paleta limitada:** 2-3 colores máximo, coherentes con el destino
- **Tema coherente:** playa=azules, montaña=verdes/tierra, ciudad=modernos/contraste
- **Jerarquía tipográfica:** 2-3 fuentes máximo, tamaños contrastados (headings 16px+, body 12-14px)
- **Oxígeno visual:** Whitespace generoso entre secciones, padding en cards
- **Premium = navy + gold/cream:** Combinación clásica de lujo
- **Moderno = contrastes extremos:** Tamaños grandes vs pequeños, pesos bold vs light
- **Elegante = serif + earth tones:** Colores tierra, navy con crema, serif para títulos

---

## 4. Solución Propuesta

### 4.1 Nueva Arquitectura

```
Usuario: "cambiar colores"
  ↓
detectDesignIntent(message) → { type: 'style_change', needsSearch: true }
  ↓
buildDesignSearchQueries(message, documentTopic) → [
  "best color palettes travel brochure design 2026 modern",
  "travel itinerary color combinations premium 2026"
]
  ↓
searchWeb() × 2-3 queries (paralelo, scraping top 3 resultados cada una)
  ↓
formatRichSearchContext(results) → contexto enriquecido con colores, fuentes, patrones
  ↓
LLM con CHAT_DESIGN_SYSTEM_PROMPT enriquecido + searchContext
  ↓
{content, styles, message} informado por referencias reales
```

### 4.2 Archivos a Modificar

| Archivo | Cambio |
|---|---|
| [`webSearch.ts`](src/services/webSearch.ts) | Expandir `detectSearchIntent()` → `detectDesignIntent()`. Añadir `buildDesignSearchQueries()`. |
| [`usePdfConversion.ts`](src/hooks/usePdfConversion.ts) | Modificar `applyChatChanges()` para ejecutar búsqueda contextual en TODOS los mensajes de estilo. |
| [`chatDesignInterpreter.ts`](src/prompts/chatDesignInterpreter.ts) | Enriquecer `CHAT_DESIGN_SYSTEM_PROMPT` con design tokens, paletas predefinidas, reglas de "buen gusto". |
| [`ChatPanel.tsx`](src/components/ChatPanel.tsx) | Añadir indicador visual "🔍 Buscando referencias de diseño..." durante la búsqueda. |

### 4.3 Archivos Nuevos a Crear

| Archivo | Propósito |
|---|---|
| [`designSearch.ts`](src/services/designSearch.ts) | Motor de búsqueda de diseño: clasificación de intención, construcción de queries optimizadas, búsqueda multicapa. |
| [`designTokens.ts`](src/prompts/designTokens.ts) | Sistema de design tokens: 5 paletas premium predefinidas, 5 combinaciones tipográficas, reglas de espaciado. |

### 4.4 Clasificador de Intención Mejorado

```typescript
type DesignIntent = 
  | 'content_edit'    // "cambia el título", "añade un día" → NO busca
  | 'style_change'    // "cambiar colores", "fuente más grande" → SÍ busca
  | 'design_intent'   // "diseño elegante", "hazlo premium" → SÍ busca (máxima)
  | 'explicit_search' // "busca tendencias" → SÍ busca (ya funciona)
  | 'factual_question' // "qué es..." → SÍ busca
```

**Palabras clave para detectar `style_change`:** colores, color, fuente, letra, tipografía, texto, tamaño, fondo, oscuro, claro, bonito, elegante, premium, moderno, diseño, visual, look, apariencia, estilo, paleta, branding, aesthetic, contraste, espaciado, padding, margen, blanco, negro, tono, sombra, redondo, cuadrado, border.

**Palabras clave para detectar `design_intent`:** premium, elegante, lujoso, sofisticado, minimalista, moderno, actual, contemporáneo, profesional, corporativo, creativo, artístico, vintage, retro, clásico.

### 4.5 Sistema de Design Tokens Predefinidos (Fallback sin Búsqueda Web)

**5 Paletas Premium para Travel PDFs:**

| Nombre | Header | Acento | Fondo | Cards | Texto |
|---|---|---|---|---|---|
| **Navy & Gold** | `#1a1a2e` | `#c9a96e` | `#ffffff` | `#faf8f5` | `#2c3e50` |
| **Ocean Calm** | `#0f4c5c` | `#3b82f6` | `#f8fafc` | `#f0f9ff` | `#1e3a5f` |
| **Earth Warm** | `#3e2c1c` | `#d4a373` | `#fef9f0` | `#faf3e6` | `#3e2c1c` |
| **Modern Slate** | `#2d3436` | `#6c5ce7` | `#ffffff` | `#f5f6fa` | `#2d3436` |
| **Forest Deep** | `#1b4332` | `#52b788` | `#f7faf7` | `#edf7ed` | `#1b4332` |

**5 Combinaciones Tipográficas:**

| Nombre | Headings | Body | Estilo |
|---|---|---|---|
| **Modern Professional** | `'Inter', sans-serif` (bold 800) | `'Inter', sans-serif` (regular 400) | Limpio, contemporáneo |
| **Classic Editorial** | `'Playfair Display', Georgia, serif` | `'Inter', 'Segoe UI', sans-serif` | Elegante, revista |
| **Swiss Clean** | `'Helvetica Neue', Helvetica, Arial` (bold) | `'Helvetica Neue', Helvetica, Arial` | Minimalista suizo |
| **Warm Humanist** | `'Lora', Georgia, serif` | `'System UI', -apple-system, sans-serif` | Cálido, accesible |
| **Geometric Modern** | `'Poppins', sans-serif` (semibold 600) | `'Inter', sans-serif` (regular) | Geométrico, moderno |

---

## 5. Plan de Implementación

### Fase 1: Mejora del Motor de Búsqueda (Prioridad ALTA)

1. Crear `src/services/designSearch.ts` con:
   - `detectDesignIntent(message)` — clasificador expandido
   - `buildDesignSearchQueries(message, documentTopic)` — transformación mensaje→queries
   - `searchDesignReferences(message, documentTopic)` — orquesta búsqueda + scraping + formateo

2. Modificar `src/services/webSearch.ts`:
   - Mantener funciones actuales (compatibilidad hacia atrás)
   - Añadir `searchAndScrape()` para scraping automático de resultados

### Fase 2: Mejora del System Prompt (Prioridad ALTA)

3. Crear `src/prompts/designTokens.ts` con paletas, tipografías y reglas

4. Modificar `src/prompts/chatDesignInterpreter.ts`:
   - Inyectar design tokens en el system prompt
   - Añadir sección "Cómo interpretar referencias web de diseño"
   - Añadir reglas de "buen gusto" traducidas a código

### Fase 3: Integración en el Hook (Prioridad ALTA)

5. Modificar `src/hooks/usePdfConversion.ts`:
   - En `applyChatChanges()`: siempre evaluar si el mensaje necesita búsqueda
   - Si necesita: ejecutar búsqueda → formatear → pasar al LLM
   - Si no: pasar directo al LLM (ej. "cambia el título a X")

### Fase 4: Mejora de UI (Prioridad MEDIA)

6. Modificar `src/components/ChatPanel.tsx`:
   - Añadir estado "buscando" con indicador visual "🔍 Buscando referencias de diseño..."
   - Añadir más sugerencias que disparen búsqueda

---

## 6. Métricas de Éxito

- **Cobertura de búsqueda:** 100% de los mensajes de estilo/diseno deben disparar búsqueda web (actualmente ~25%)
- **Calidad percibida:** El usuario debe notar que los cambios de diseño son más coherentes, modernos y con criterio estético
- **Fallback robusto:** Si la búsqueda web falla (sin API key, sin conexión), el sistema debe usar los design tokens predefinidos como fallback

---

## 7. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Firecrawl API Key no configurada | Fallback a design tokens predefinidos en `designTokens.ts` |
| Búsqueda lenta (>3 segundos) | Timeout de 5s, continuar con tokens predefinidos si tarda |
| Rate limiting de Firecrawl | Caché de resultados de búsqueda por 10 minutos |
| Resultados irrelevantes | Sistema de scoring: priorizar resultados de dominios de diseño (behance, dribbble, pinterest, creativeboom) |
| Coste de créditos Firecrawl | Limitar a 2 queries por mensaje (máx 10 créditos) |
