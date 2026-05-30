# Decision Log - Belen1

## 2026-05-29
- **Inicio:** Proyecto de conversión PDF para lectura móvil
- **Stack base:** Render + Supabase (gratis)
- **Estrategia de conversión:** Extraer → Transformar con LLM → Generar PDF nuevo (NO modificar el original)
- **Motor LLM principal:** Groq (14,400 req/día gratis, modelo llama-3.3-70b-versatile)
- **Motor LLM fallback:** OpenRouter (modelos `:free`, 50 req/día)
- **Parse PDF:** pdf-parse (npm)
- **Generar PDF:** pdfmake (npm)
- **Fuente emojis:** Noto Color Emoji (embebida en pdfmake)
- **Almacenamiento:** Supabase Storage (1 GB gratis)
- **Backend:** Node.js + Express en Render Web Service
- **Frontend:** HTML5 + CSS3 + Vanilla JS en Render Static Site
- **Coste total:** 0€/mes
- **Render PostgreSQL descartado:** Expira a 30 días en free tier, mejor Supabase
