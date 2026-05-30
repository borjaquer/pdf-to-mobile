# Tech Context - Belen1

## Stack Tecnológico (Confirmado)
| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | HTML5 + CSS3 + Vanilla JS (Render Static Site) | - |
| Backend | Node.js + Express (Render Web Service Free) | 20.x LTS |
| DB | Supabase PostgreSQL Free | 500 MB |
| Storage | Supabase Storage Free | 1 GB |
| PDF Parse | pdf-parse (npm) | latest |
| PDF Generate | pdfmake (npm) | latest |
| LLM Primary | Groq API - llama-3.3-70b-versatile | OpenAI-compatible |
| LLM Fallback | OpenRouter - deepseek-chat-v3.1:free | OpenAI-compatible |
| Emoji Font | Noto Color Emoji | Embebida |
| Upload Handler | multer (memoryStorage) | latest |

## Restricciones
- Todo debe ser gratuito (free tiers) ✅ CONFIRMADO VIABLE
- Rápido de configurar (pocas dependencias)
- Sencillo de mantener
- Render: filesystem efímero → no guardar archivos en disco
- Render: cold start ~1 min tras 15 min idle
- Supabase: pausa tras 1 semana sin actividad
