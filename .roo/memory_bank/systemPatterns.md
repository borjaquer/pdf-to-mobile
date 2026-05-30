# System Patterns - Belen1

## Arquitectura (por definir)
```
[Usuario] → [Frontend Render Static] → [Backend Render API]
                                          ↓
                                     [Supabase Storage + DB]
                                          ↓
                                     [PDF Processing Engine]
```

## Flujo de Usuario
1. Usuario sube PDF original (formato ordenador/desktop)
2. Opcionalmente escribe instrucciones/prompt en un textarea
3. Backend procesa el PDF: reflow, adaptar columnas, agrandar texto
4. Usuario descarga PDF versión móvil

## Patrones
- Single Page Application (sin frameworks, vanilla JS)
- API REST simple (un endpoint POST /convert)
- Procesamiento asíncrono (polling o webhook simple)
