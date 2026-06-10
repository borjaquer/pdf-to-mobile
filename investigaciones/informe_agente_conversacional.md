# Informe Técnico: Refactorización del ChatPanel a Agente Conversacional Inteligente

**Fecha:** 6 de junio de 2026  
**Proyecto:** belen1 — PDF-to-Mobile App Converter  
**Objetivo:** Fundamentar la refactorización del módulo chat en un agente conversacional con memoria persistente, inferencia semántica y enrutamiento contextual.

---

## Resumen Ejecutivo

La investigación confirma que el patrón **"Agent Orchestrator" funcional** (Andy Peatling, abril 2025) es la referencia arquitectónica principal. Se debe migrar el chat actual de su estado **Level 2** (Guided Agent con RAG fijo) a **Level 3** (Conversational Agent con memoria y contexto dinámico), siguiendo la taxonomía de Abovo/Symphony42. El enfoque de **Context Engineering** de Anthropic (septiembre 2025) guiará el diseño de compactación de historial y structured note-taking. La memoria persistente se implementará con localStorage + vector store ligero en memoria, sin frameworks externos.

---

## 1. Arquitectura del Agente Conversacional

### 1.1 Patrón "Agent Orchestrator" (Andy Peatling)

El patrón funcional TypeScript propuesto por Peatling define cuatro componentes fundamentales:

| Componente | Responsabilidad | Implementación en belen1 |
|---|---|---|
| **Agent** | Orquestador central que decide flujo | `usePdfConversion` (refactorizado) |
| **ToolExecutor** | Ejecuta herramientas específicas | `chatInterpreter.ts` + `deepseekApi.ts` |
| **MemorySystem** | Gestiona historial y contexto | Nuevo hook `useChatMemory` |
| **LanguageModelInterface** | Abstracción del LLM | `deepseekApi.ts` / `openRouterApi.ts` |

**Principio clave:** State Freezing — tratar el estado del chat como una compilación, no como narrativa. Cada interacción es un delta inmutable que modifica el estado central.

### 1.2 Taxonomía de Niveles de Agente (Abovo/Symphony42)

| Nivel | Tipo | Estado actual belen1 |
|---|---|---|
| L1 | Stateless (sin memoria) | ✗ |
| L2 | Guided Agent (RAG fijo + reglas) | **Estado actual** |
| L3 | **Conversational Agent (memoria + contexto dinámico)** | **✓ Target** |
| L4 | Autonomous Agent (planificación + reflexión) | Futuro opcional |

**Transiciones detectadas en el chat actual que justifican el salto a L3:**
- **Prompt overflow:** El historial plano crece sin control, superando el contexto de DeepSeek
- **Multi-turn degradation:** La calidad de respuesta se degrada tras 3-5 intercambios
- **Falta de memoria entre sesiones:** No hay persistencia de preferencias del usuario

---

## 2. Arquitectura de Memoria

### 2.1 Patrón State-Based Memory (OpenAI Context Engineering Cookbook)

El cookbook de OpenAI (enero 2026) propone un ciclo de vida de memoria en 4 fases:

```
INJECT → REASON → DISTILL → CONSOLIDATE
```

**Estructura de estado propuesta para belen1:**

```typescript
interface ChatMemoryState {
  // Perfil estructurado del usuario (preferencias estables)
  profile: {
    pdfStyle: 'minimal' | 'detailed' | 'compact';
    outputFormat: 'mobile' | 'email' | 'both';
    language: string;
  };
  
  // Memoria global (persiste entre sesiones) — localStorage
  globalMemory: {
    notes: MemoryNote[];
    // timestamp, keywords
  };
  
  // Memoria de sesión (solo la sesión actual)
  sessionMemory: {
    notes: MemoryNote[];     // Notas capturadas durante la sesión
    recentMessages: ChatMessage[];  // Últimos N mensajes sin comprimir
  };
  
  // Historial comprimido (resúmenes de bloques anteriores)
  compressedHistory: string[];
  
  // Estado de compilación actual (el "state freeze")
  currentPdfState: MobileContent | null;
  
  // Métricas de uso de contexto
  contextMetrics: {
    totalTokens: number;
    windowUtilization: number;  // %
    lastCompaction: number;     // timestamp
  };
}
```

### 2.2 Ciclo de Vida de la Memoria

#### Fase 1: Inyección (al iniciar sesión)
- Cargar `profile` + `globalMemory` desde localStorage
- Inyectar en el system prompt como frontmatter YAML + notas Markdown
- Regla de precedencia: **mensaje actual > memoria de sesión > memoria global**

#### Fase 2: Distilación (durante la conversación)
- La herramienta (tool call) `saveMemoryNote()` captura preferencias explícitas del usuario
- Ejemplo: "Prefiero el formato compacto" → nota durable
- "Esta vez quiero los campos traducidos" → nota de sesión (no durable)

#### Fase 3: Consolidación (al finalizar sesión)
- Ejecutar asíncronamente al cerrar la sesión
- Fusionar notas de sesión en memoria global
- Desduplicar, resolver conflictos (recencia gana)
- Limpiar notas de sesión

#### Fase 4: Compactación (cuando se supera el límite de tokens)
- Basado en el patrón de **Codex (OpenAI)**: auto-compactación al ~90% del contexto
- Estrategia: keep N mensajes recientes + summary de bloques anteriores
- Umbral sugerido: 70% de la ventana de contexto de DeepSeek (≈28K tokens de 40K)

### 2.3 Patrón de Ventana Corrediza (Sliding Window)

```
[Historial completo]
├── [Resumen bloque 1] ← comprimido
├── [Resumen bloque 2] ← comprimido  
├── [Mensaje 8] ← sin comprimir
├── [Mensaje 9] ← sin comprimir
└── [Mensaje 10 actual] ← sin comprimir
```

**Recomendación:** Mantener los últimos **10 intercambios** (user + assistant) sin comprimir. Comprimir bloques de 5 intercambios anteriores en resúmenes cuando se exceda el 70% del contexto. Esta técnica reduce tokens en 80-90% (validado por Mem0 benchmarks) manteniendo calidad de respuesta.

---

## 3. Inferencia Semántica y System Prompt Dinámico

### 3.1 Arquitectura de Context Engineering (Anthropic)

El enfoque de Anthropic se centra en 3 conceptos clave:

1. **Compactación:** Reducir el ruido en el prompt manteniendo señales de alta calidad
2. **Structured Note-Taking:** Extraer claims/facts estructurados de la conversación (no resumir, sino extraer)
3. **Just-in-Time Retrieval:** Inyectar contexto solo cuando es relevante, no todo de golpe

### 3.2 System Prompt Modular Propuesto

En lugar del prompt estático actual, se propone un sistema de **módulos ensamblables**:

```typescript
// Módulos de system prompt
const MODULES = {
  base: `Eres un asistente experto en convertir PDFs a formato mobile...`,
  
  memory: (state: ChatMemoryState) => `
## MEMORIA DEL USUARIO
### Perfil
${renderProfile(state.profile)}

### Preferencias globales
${renderGlobalNotes(state.globalMemory.notes)}

### Contexto de sesión actual
${renderSessionNotes(state.sessionMemory.notes)}
  `,
  
  pdfState: (content: MobileContent) => `
## ESTADO ACTUAL DEL PDF
${renderCurrentPdfState(content)}
  `,
  
  tools: `
## HERRAMIENTAS DISPONIBLES
- applyChatChanges: Aplica cambios al PDF
- saveMemoryNote: Guarda una preferencia del usuario
- askClarification: Pide aclaración al usuario
  `,
  
  constraints: (contextUtilization: number) => `
## RESTRICCIONES DE CONTEXTO
Utilización actual: ${contextUtilization}%
${contextUtilization > 70 ? '⚠️ Acércate al límite. Sé conciso.' : '✅ Espacio disponible para respuestas detalladas.'}
  `
};
```

### 3.3 Ensamblaje Dinámico

```typescript
function buildSystemPrompt(state: ChatMemoryState): string {
  const modules = [MODULES.base];
  
  if (hasMemory(state)) modules.push(MODULES.memory(state));
  if (state.currentPdfState) modules.push(MODULES.pdfState(state.currentPdfState));
  
  modules.push(MODULES.tools);
  modules.push(MODULES.constraints(state.contextMetrics.windowUtilization));
  
  return modules.join('\n\n');
}
```

---

## 4. Memoria Persistente sin Framework Externo

### 4.1 Capas de Almacenamiento

| Capa | Tecnología | Propósito | Límite |
|---|---|---|---|
| **Capa 1: Historial plano** | `localStorage` key `belen1_chat_history` | Persistencia de mensajes raw entre sesiones | ~5MB (límite localStorage) |
| **Capa 2: Memoria semántica** | Vector store en memoria (cosine similarity) | Búsqueda semántica de notas de memoria | ~1000 vectores |
| **Capa 3: Estado comprimido** | `localStorage` key `belen1_chat_compressed` | Resúmenes de bloques de conversación | ~100KB |
| **Capa 4: Perfil/preferencias** | `localStorage` key `belen1_user_profile` | Preferencias estables del usuario | ~10KB |

### 4.2 Implementación de Vector Store Ligero

Sin usar RxDB ni transformers.js (para mantener bundle size pequeño), se implementa un vector store en memoria pura:

```typescript
// Memoria semántica — implementación propia sin dependencias
interface VectorStore {
  dimensions: number;  // 384 (MiniLM) o custom
  items: Array<{
    id: string;
    vector: number[];
    metadata: Record<string, unknown>;
    text: string;
  }>;
}

// Cosine similarity — ~0.5ms para 1000 vectores de 384 dimensiones
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

**Nota:** Para embedding generation, se recomienda usar la API de DeepSeek/OpenRouter como servicio (no local) para evitar aumentar el bundle con transformers.js. El endpoint de embeddings existe en la mayoría de providers de LLM.

### 4.3 Hook `useChatMemory`

```typescript
function useChatMemory(conversationId: string) {
  // Carga estado desde localStorage al montar
  const [state, dispatch] = useReducer(memoryReducer, initialState);
  
  // Persistencia automática en localStorage
  useEffect(() => {
    localStorage.setItem(`belen1_memory_${conversationId}`, JSON.stringify(state));
  }, [state]);
  
  // Operaciones de memoria
  return {
    // Añadir mensaje al historial
    addMessage: (msg: ChatMessage) => dispatch({ type: 'ADD_MESSAGE', msg }),
    
    // Guardar nota de memoria
    saveNote: (note: MemoryNote) => dispatch({ type: 'SAVE_NOTE', note }),
    
    // Compactar historial cuando sea necesario
    compactHistory: () => dispatch({ type: 'COMPACT_HISTORY' }),
    
    // Buscar notas relevantes para el contexto actual
    getRelevantContext: (query: string) => semanticSearch(query, state),
    
    // Obtener mensajes para enviar al LLM (con compactación automática)
    getContextMessages: () => buildContextMessages(state),
    
    // Consolidar memoria de sesión en global
    consolidateMemory: () => dispatch({ type: 'CONSOLIDATE_MEMORY' }),
  };
}
```

---

## 5. Estrategia de Enrutamiento en `usePdfConversion`

### 5.1 Flujo de Decisión

```
Mensaje del usuario
  │
  ▼
[¿Es una petición de cambio de diseño?]
  ├── Sí → applyChatChanges (flujo actual)
  └── No
       │
       ▼
[¿Es una pregunta sobre el contenido?]
  ├── Sí → Respuesta informativa (nuevo flujo)
  └── No
       │
       ▼
[¿Es una preferencia/instrucción general?]
  ├── Sí → saveMemoryNote + confirmación
  └── No → Respuesta conversacional genérica
```

### 5.2 Implementación del Router

```typescript
type MessageIntent = 'design_change' | 'content_query' | 'preference' | 'general';

function classifyIntent(message: string): MessageIntent {
  // Clasificación semántica ligera (regex + keywords, sin LLM)
  // Fallback a DeepSeek si no se puede clasificar localmente
}
```

---

## 6. Recomendaciones de Implementación por Fase

### Fase 1 (Corto plazo — 1 sprint)
- [ ] Implementar `useChatMemory` con localStorage plano
- [ ] Sistema de ventana corrediza (últimos 10 mensajes + resumen)
- [ ] Persistencia de perfil de usuario básico
- [ ] Integrar `saveMemoryNote` como tool en `chatInterpreter.ts`

### Fase 2 (Medio plazo — 2 sprints)
- [ ] Vector store en memoria para búsqueda semántica de notas
- [ ] System prompt modular con ensamblaje dinámico
- [ ] Auto-compactación al 70% de uso de contexto
- [ ] Consolidación de memoria al cerrar sesión

### Fase 3 (Largo plazo)
- [ ] Chat multi-sesión con memo cruzada entre conversaciones
- [ ] Fine-tuning de extracción de memoria (reducir ruido)
- [ ] Evaluación A/B de calidad vs coste de contexto

---

## 7. Referencias Clave

- **Andy Peatling** — *Architecting AI Agents with TypeScript* (abril 2025): Patrón Agent Orchestrator funcional
- **Tetrate** — *Building AI Agents* (2025): ReAct, Plan-and-Execute, sistemas de memoria
- **Anthropic** — *Effective context engineering for AI agents* (septiembre 2025): Compactación, structured note-taking
- **Abovo/Symphony42** — *Static vs Dynamic System Prompts* (mayo 2025): Taxonomía 4-niveles de agentes
- **OpenAI** — *Context Engineering for Personalization* (enero 2026): State-based long-term memory con ciclo inject→distill→consolidate
- **OpenAI Community (Codex)** — Patrón de auto-compactación al 90% del contexto
- **Mem0** — *LLM Chat History Summarization Guide* (octubre 2025): 80-90% reducción de tokens con memory formation
- **RxDB** — *Local JavaScript Vector Database*: Embeddings con transformers.js + IndexedDB en frontend
