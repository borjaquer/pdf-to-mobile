# 🧭 GUÍA PASO A PASO — PDF-to-Mobile

> **Para:** Personas sin experiencia técnica previa.
> **Tiempo estimado:** 15-20 minutos.
> **Qué conseguirás:** Tener la app funcionando en tu máquina y publicada en internet (gratis).

---

## ÍNDICE

| Paso | Qué vas a hacer | Tiempo |
|------|----------------|--------|
| [1](#1-instalar-nodejs) | Instalar Node.js (el motor que ejecuta la app) | 5 min |
| [2](#2-conseguir-las-api-keys) | Conseguir las claves de IA (Gemini + OpenRouter) | 5 min |
| [3](#3-crear-el-archivo-env) | Crear el archivo `.env` con tus claves | 2 min |
| [4](#4-probar-la-app-en-local) | Arrancar la app y probarla con un PDF real | 5 min |
| [5](#5-publicar-en-internet-gratis) | Publicar en internet (Render) | 10 min |

---

## 1. INSTALAR NODE.JS

Node.js es el programa que "entiende" el código JavaScript/TypeScript y lo ejecuta.

1. Abre tu navegador (Chrome, Edge, Firefox)
2. Ve a: **https://nodejs.org**
3. Haz clic en el botón verde grande que dice **"LTS"** (significa versión estable)
4. Se descargará un archivo `.msi`. Ábrelo.
5. Sigue el instalador: `Next → Next → Install → Finish`. No cambies ninguna opción.
6. **Verifica que funciona:** Abre el menú Inicio, escribe `cmd` y pulsa Enter. Se abre una ventana negra. Escribe:

   ```
   node --version
   ```

   Deberías ver algo como `v22.x.x`. Si ves un número, está bien.

---

## 2. CONSEGUIR LAS API KEYS

Las "API keys" son contraseñas que le dicen a Google y a OpenRouter que tienes permiso para usar su inteligencia artificial. Son gratis.

### 2.1 Gemini (Google) — PRIMARIA

1. Ve a: **https://aistudio.google.com/apikey**
2. Inicia sesión con tu cuenta de Google (la de Gmail te vale)
3. Haz clic en **"Create API Key"**
4. En el desplegable selecciona **"Generative Language API"**
5. Haz clic en **"Create API key in new project"**
6. **Copia la clave** que aparece. Es una cadena larga tipo `AIzaSy...`. Guárdala en un bloc de notas.

> ⚠️ Esta clave es personal. No la compartas con nadie.

### 2.2 OpenRouter — FALLBACK (plan B si Gemini falla)

1. Ve a: **https://openrouter.ai/keys**
2. Haz clic en **"Sign in"** (arriba a la derecha). Puedes usar tu cuenta de Google.
3. Una vez dentro, haz clic en **"Create Key"**
4. Dale un nombre (por ejemplo: `pdf-to-mobile`), deja el límite en `$0` (solo usarás modelos gratuitos), y haz clic en **"Create"**
5. **Copia la clave** que aparece (empieza por `sk-or-v1-...`). Guárdala también en el bloc de notas.

> ⚠️ Si no configuras crédito ($0), solo funcionan los modelos `:free`, que es justo lo que necesitas.

---

## 3. CREAR EL ARCHIVO `.env`

Ahora tienes que decirle a la app cuáles son tus claves.

1. En Visual Studio Code, en la barra de la izquierda, verás la lista de archivos del proyecto.
2. Busca el archivo [`.env.example`](.env.example) y haz clic derecho sobre él → **"Copy"**
3. Haz clic derecho en un espacio vacío de la lista → **"Paste"**
4. Renombra la copia: haz clic derecho sobre `env.example copy` → **"Rename"** → escribe `.env` (punto, e, ene, ve)
5. Abre el archivo `.env` haciendo doble clic.
6. Pega tus claves donde corresponda:

   ```
   VITE_GEMINI_API_KEY=AIzaSy...    ← pega aquí la clave de Gemini
   VITE_OPENROUTER_API_KEY=sk-or-v1-...  ← pega aquí la clave de OpenRouter
   ```

7. Guarda el archivo: `Ctrl + S`

> Las líneas de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` las puedes dejar vacías. No se usan por ahora.

---

## 4. PROBAR LA APP EN LOCAL

### 4.1 Instalar dependencias

Abre la terminal en VS Code: menú **Terminal → New Terminal**.

En la ventana que aparece abajo, escribe:

```
npm install
```

Esto descarga todas las librerías que necesita la app. Tarda ~30 segundos. Verás mucho texto y al final tu prompt de nuevo (`c:\dev\belen1>`).

### 4.2 Arrancar el servidor de desarrollo

En la misma terminal, escribe:

```
npm run dev
```

Verás algo como:

```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4.3 Probar con un PDF real

1. Abre tu navegador y ve a: **http://localhost:5173**
2. Verás una web con un recuadro punteado que dice "Arrastra tu PDF aquí"
3. Arrastra el archivo `Folleto-KNA10055-KANNAKEM-20260522153019-0-395.pdf` desde el explorador de Windows al recuadro
4. La app empezará a procesar:
   - 🔵 Extrayendo texto del PDF...
   - 🟡 Reformateando con IA... (puede tardar 10-30 segundos)
   - 🟢 Generando PDF móvil...
5. Cuando termine, verás una previsualización en una silueta de móvil y un botón verde de descarga.

### 4.4 Si algo falla

| Problema | Solución |
|----------|----------|
| "API key not valid" | Revisa que las claves en `.env` no tengan espacios ni comillas extra |
| "Rate limit" (límite de peticiones) | Espera 6 segundos y vuelve a intentarlo. Gemini free tier solo permite 10 peticiones por minuto |
| "Failed to extract text" | Algunos PDFs muy viejos (escaneados) no tienen texto extraíble. Prueba con otro PDF |
| Error de `DOMMatrix` en terminal | Ignóralo. Solo ocurre en la terminal, no en el navegador |

### 4.5 Parar el servidor

Cuando termines de probar, en la terminal donde está corriendo `npm run dev`, pulsa `Ctrl + C` y luego `S` (de "Sí") para pararlo.

---

## 5. PUBLICAR EN INTERNET (GRATIS)

Vamos a usar **Render.com** porque es gratis para sitios estáticos y se configura solo.

### 5.1 Subir el código a GitHub

Si tu proyecto ya está en GitHub, salta al paso 5.2. Si no:

1. Ve a: **https://github.com** y crea una cuenta (o inicia sesión)
2. Haz clic en el `+` verde arriba a la derecha → **"New repository"**
3. Nombre: `pdf-to-mobile` (sin espacios)
4. Deja todo como está (público) y haz clic en **"Create repository"**
5. GitHub te mostrará unos comandos. Vuelve a la terminal de VS Code y ejecuta estos comandos uno por uno:

   ```
   git remote add origin https://github.com/TU_USUARIO/pdf-to-mobile.git
   git branch -M main
   git push -u origin main
   ```

   (Cambia `TU_USUARIO` por tu nombre de usuario de GitHub)

### 5.2 Conectar con Render

1. Ve a: **https://dashboard.render.com**
2. Haz clic en **"Sign Up"** → puedes usar tu cuenta de GitHub directamente
3. Una vez dentro, haz clic en **"New +"** (arriba a la derecha) → **"Static Site"**
4. Conecta tu cuenta de GitHub si te lo pide
5. Selecciona el repositorio `pdf-to-mobile`
6. Render **leerá automáticamente el archivo `render.yaml`** y lo configurará todo. Verás:
   - **Name:** `pdf-to-mobile`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
7. Haz clic en **"Create Static Site"**

### 5.3 Añadir las variables de entorno en Render

Render no tiene acceso a tu archivo `.env` local. Tienes que darle las claves manualmente:

1. En el dashboard de Render, haz clic en tu sitio `pdf-to-mobile`
2. Ve a la pestaña **"Environment"** (en la barra izquierda)
3. En la sección **"Environment Variables"**, añade estas dos:

   | Key | Value |
   |-----|-------|
   | `VITE_GEMINI_API_KEY` | `AIzaSy...` (tu clave de Gemini) |
   | `VITE_OPENROUTER_API_KEY` | `sk-or-v1-...` (tu clave de OpenRouter) |

4. Haz clic en **"Save Changes"**
5. Render redeployará automáticamente. Espera ~2 minutos.

### 5.4 ¡Tu app está viva!

Cuando termine el deploy, verás un enlace verde en la parte superior:

```
https://pdf-to-mobile.onrender.com
```

Haz clic y pruébalo. Es tu app, pública en internet, para que cualquiera con el enlace la use.

---

## 📋 RESUMEN DE COMANDOS (chuleta)

```bash
# Arrancar en local
npm install        # Solo la primera vez
npm run dev        # Cada vez que quieras probar

# Construir para producción
npm run build      # Genera la carpeta dist/

# Subir cambios a GitHub
git add .
git commit -m "tu mensaje"
git push
```

---

## ❓ PREGUNTAS FRECUENTES

**¿Cuánto me va a costar esto?**
Nada. $0. Gemini y OpenRouter tienen planes gratuitos. Render tiene plan gratuito para sitios estáticos. GitHub es gratis.

**¿Qué pasa si me paso del límite gratuito de Gemini?**
La app cambia automáticamente a OpenRouter (plan B). El usuario ni se entera.

**¿Mis PDFs se suben a algún servidor?**
No. Todo el procesamiento ocurre dentro de tu navegador. Tus PDFs nunca salen de tu ordenador.

**¿Puedo usar esto sin internet?**
Necesitas internet para que la IA funcione (Gemini u OpenRouter). Si instalas Ollama (ver [README.md](README.md) sección "🐧 Desarrollo Local con Ollama"), puedes usar un modelo local sin internet.

**¿El texto del PDF final se puede seleccionar?**
En esta versión no. Es una imagen. La v2 usará otra librería para que el texto sea seleccionable.

---

✅ **Fin de la guía.** Si algo no funciona, revisa los errores en la terminal de VS Code y busca el mensaje en Google o pregunta a quien te pasó este proyecto.
