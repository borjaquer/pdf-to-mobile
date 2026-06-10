# Fuentes Documentadas — Refactorización ChatPanel a Agente Conversacional

**Fecha:** 6 de junio de 2026  
**Total fuentes:** 9  

---

## Investigación Web #1: Arquitectura de Agentes Conversacionales

### Fuente 1: Andy Peatling — Architecting AI Agents with TypeScript (Apr 2025)
- **URL:** `https://andypeatling.com/architecting-ai-agents-with-typescript/`
- **Tipo:** Artículo técnico — Blog personal
- **Contenido extraído:** Implementación funcional TypeScript del patrón Agent Orchestrator con 4 componentes: Agent, ToolExecutor, MemorySystem, LanguageModelInterface. Factory pattern para múltiples proveedores LLM. State management con inmutabilidad.
- **Relevancia: ★★★★★** — Arquitectura de referencia para la refactorización

### Fuente 2: Tetrate — Building AI Agents: A Comprehensive Guide to Modern Agentic Systems (2025)
- **URL:** `https://tetrate.com/blog/building-ai-agents/`
- **Tipo:** Guía técnica corporativa
- **Contenido extraído:** Cobertura completa de patrones ReAct, Plan-and-Execute, Reflection. Sistemas de memoria (episódica, semántica, corto/largo plazo). Error handling con circuit breakers, rate limiting, retry logic. Safety guardrails y sandboxing.
- **Relevancia: ★★★★☆** — Complementa con patrones operativos (error handling, safety)

---

## Investigación Web #2: Inferencia Semántica y System Prompts Dinámicos

### Fuente 3: Anthropic — Effective context engineering for AI agents (Sep 2025)
- **URL:** `https://docs.anthropic.com/en/docs/build-with-claude/context-engineering`
- **Tipo:** Documentación oficial — Anthropic
- **Contenido extraído:** Context engineering vs prompt engineering. Compactación de prompts. Structured note-taking (extraer claims/facts vs resumir). Sub-agent architectures. Attention budget. Just-in-time context retrieval.
- **Relevancia: ★★★★★** — Base teórica para el diseño de system prompt dinámico

### Fuente 4: Abovo/Symphony42 — Static vs Dynamic System Prompts (May 2025)
- **URL:** `https://abovoblog.com/static-vs-dynamic-system-prompts/`
- **Tipo:** Artículo técnico — Blog
- **Contenido extraído:** Taxonomía 4-niveles de complejidad de agentes (L1 Stateless → L4 Autonomous). Transition triggers: prompt overflow, hallucinations, multi-turn degradation. Modular patterns. Case studies: Intercom Fin, AutoGPT, LangChain, CrewAI, DSPy.
- **Relevancia: ★★★★★** — Marco de evaluación del nivel actual y target del chat

---

## Investigación Web #3: Memoria Persistente para Chat LLM

### Fuente 5: OpenAI Community — Best Practices for Context Management in Long AI Chats (Feb 2026)
- **URL:** `https://community.openai.com/t/best-practices-for-cost-efficient-high-quality-context-management-in-long-ai-chats/1373996`
- **Tipo:** Hilo de discusión — OpenAI Developer Community
- **Contenido extraído:** Discusión sobre claim extraction vs summarization. Referencia al cookbook de OpenAI Agents SDK. Análisis del patrón de compactación de Codex (OpenAI): auto-compactación al ~90% del contexto, truncamiento de tool outputs, budget de tokens por tipo de contenido.
- **Relevancia: ★★★★☆** — Patrón de compactación de Codex como referencia práctica

### Fuente 6: Mem0 — LLM Chat History Summarization Guide (Oct 2025)
- **URL:** `https://mem0.ai/blog/llm-chat-history-summarization-guide-2025`
- **Tipo:** Guía técnica — Blog corporativo
- **Contenido extraído:** Memory formation vs summarization. 80-90% reducción de tokens. Jerarquía de memoria: working memory, episodic memory, semantic memory. Threshold-based summarization. Importance scoring. Decay mechanisms. Conflict resolution.
- **Relevancia: ★★★★☆** — Benchmarking y métricas de eficiencia de memoria

### Fuente 7: AWS in Plain English — Taming the Token Limit (Sep 2025)
- **URL:** `https://aws.plainenglish.io/taming-the-token-limit-smart-ways-to-manage-conversation-history-in-llms-and-agentic-ai-ae6a4a55323c`
- **Tipo:** Artículo — Medium (parcialmente paywall)
- **Contenido extraído:** Introducción a la problemática de límites de contexto en chatbots. Estrategias básicas: sliding window, truncación por token count. Contexto parcialmente extraído por paywall.
- **Relevancia: ★★☆☆☆** — Solo introductorio, confirmación de la problemática

### Fuente 8: RxDB — Local JavaScript Vector Database (2025)
- **URL:** `https://rxdb.info/articles/javascript-vector-database.html`
- **Tipo:** Guía técnica detallada — Documentación RxDB
- **Contenido extraído:** Implementación completa de vector DB en navegador con transformers.js + IndexedDB. Benchmarks de modelos de embedding (MiniLM: 173ms, 384d). Indexación con Distance to Samples. Full table scan vs indexed search. WebWorkers para paralelización. Migración de esquemas.
- **Relevancia: ★★★★☆** — Referencia técnica para implementar vector store ligero

### Fuente 9: OpenAI — Context Engineering for Personalization (Jan 2026)
- **URL:** `https://developers.openai.com/cookbook/examples/agents_sdk/context_personalization`
- **Tipo:** Cookbook oficial — OpenAI Developers
- **Contenido extraído:** Implementación completa del ciclo inject→distill→consolidate con OpenAI Agents SDK. RunContextWrapper para estado persistente. Memory notes con keywords y timestamps. Consolidación asíncrona con deduplicación y resolución de conflictos. Memory guardrails. Evals de memoria.
- **Relevancia: ★★★★★** — Referencia principal para el diseño del sistema de memoria persistente

---

## Fuentes del Proyecto (Código Fuente Analizado)

| Archivo | Propósito | Líneas |
|---|---|---|
| [`src/components/ChatPanel.tsx`](../src/components/ChatPanel.tsx) | Componente React del chat actual | 204 |
| [`src/hooks/usePdfConversion.ts`](../src/hooks/usePdfConversion.ts) | Hook que orquesta la conversión PDF | 260 |
| [`src/services/chatInterpreter.ts`](../src/services/chatInterpreter.ts) | Intérprete de instrucciones de chat | 293 |
| [`src/services/deepseekApi.ts`](../src/services/deepseekApi.ts) | API DeepSeek con timeout corregido | 241 |
| [`src/services/openRouterApi.ts`](../src/services/openRouterApi.ts) | API OpenRouter (fallback) | 122 |
| [`src/prompts/chatDesignInterpreter.ts`](../src/prompts/chatDesignInterpreter.ts) | Prompt de interpretación de diseño | 115 |
| [`src/types/index.ts`](../src/types/index.ts) | Tipos (ChatResponse, ChatMessage, etc.) | 185 |

---

## Correcciones Realizadas Durante la Investigación

### `src/services/deepseekApi.ts`
- **Línea 41:** `getClient()` ahora acepta `timeoutMs` (default 60000ms)
- **Línea 47:** `maxRetries` incrementado de 1 a 2

### `src/services/openRouterApi.ts`
- **Línea 30:** `getClient()` ahora acepta `timeoutMs` (default 30000ms)
