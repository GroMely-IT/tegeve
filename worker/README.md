# Asistente IA de TeGeVe — Cloudflare Worker (gratis)

IA **generativa y gratuita** para el chatbot del sitio, usando **Cloudflare Workers AI**
(modelo Llama 3.1). No necesita ninguna clave de API externa: la IA se ejecuta en la
red de Cloudflare con una **cuota diaria gratuita** (plan Workers Free).

## Qué hace
Recibe `POST { "question": "...", "lang": "es"|"en", "context": "..." }` y devuelve
`{ "answer": "..." }`. La IA responde **anclada estrictamente al contenido del sitio**
(no inventa datos) y en el **idioma activo** (español de España o inglés neutro):

- `lang`: idioma en el que debe responder (lo envía el sitio según el selector ES/EN).
- `context`: la base de conocimiento (FAQ del propio sitio) en ese idioma. La envía el
  cliente en cada consulta, así la IA siempre responde con lo que realmente dice la web.
  Si no llega `context`, el Worker usa un conocimiento de respaldo embebido (`FALLBACK_KB`).

Incluye CORS para `gagrosso.github.io` y `tegeve.es`.

## Despliegue en 4 pasos (gratis)

1. **Crea una cuenta gratuita** en https://dash.cloudflare.com (si no la tienes).
2. **Instala Wrangler** (CLI de Cloudflare) y entra:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. **Despliega** (desde esta carpeta `worker/`):
   ```bash
   cd worker
   wrangler deploy
   ```
   Al terminar te dará una URL del tipo:
   `https://tegeve-asistente.TU-CUENTA.workers.dev`
4. **Activa la IA en el sitio:** abre `index.html`, busca `const AI_ENDPOINT = ''`
   (en el bloque del asistente) y pega ahí esa URL:
   ```js
   const AI_ENDPOINT = 'https://tegeve-asistente.TU-CUENTA.workers.dev';
   ```
   Haz commit y push. ¡Listo! El chatbot pasará a usar IA generativa.

> Si `AI_ENDPOINT` queda vacío o el Worker falla, el asistente sigue funcionando
> con **búsqueda local** sobre el FAQ (sin coste y sin depender de nada).

## Probar en local
```bash
cd worker
wrangler dev
# luego: curl -X POST http://localhost:8787 -H "Content-Type: application/json" \
#   -d '{"question":"What services do you offer?","lang":"en"}'
```

## Notas
- **Coste:** Workers AI incluye una cuota diaria gratuita (Neurons) suficiente para
  un sitio de baja/media demanda. Revisa los límites actuales en el panel de Cloudflare.
- **Modelo:** usa `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (actual). El anterior
  `@cf/meta/llama-3.1-8b-instruct` fue **retirado el 2026-05-30**. Si quieres consumir
  menos Neurons (cuota gratuita), cambia `MODEL` en `src/index.js` por
  `@cf/meta/llama-3.1-8b-instruct-fast`. Tras cualquier cambio, vuelve a hacer `wrangler deploy`.
- **Anclaje (grounding):** el sitio envía el FAQ como `context` en cada consulta, así que
  para mantener la IA al día basta con editar el FAQ del `index.html`. La constante
  `FALLBACK_KB` en `src/index.js` solo se usa si no llega `context`.

---

## Formulario de contacto (endpoint `/contact`)

El mismo Worker ahora atiende también el formulario de `/contacto/`: recibe
`POST /contact` con `{nombre, empresa, email, reto, _gotcha}`, valida, descarta
spam (honeypot `_gotcha`) y **envía el mensaje por correo vía Resend** (gratis).

### Puesta en marcha (una vez)

1. Crea una cuenta gratis en **https://resend.com** (regístrate con el email donde
   quieres recibir los contactos, p. ej. tu Gmail).
2. En Resend → **API Keys** → crea una clave.
3. Guárdala como *secret* del Worker:
   ```bash
   cd worker
   wrangler secret put RESEND_API_KEY      # pega la clave cuando lo pida
   wrangler deploy
   ```
4. Listo. Los envíos llegan a tu bandeja.

### Notas
- **Destinatario:** por defecto `gabrielgrosso@gmail.com`. Para cambiarlo añade en
  `wrangler.toml` → `[vars]` la variable `CONTACT_TO = "tu@correo.com"`.
- **Remitente:** por defecto `onboarding@resend.dev` (dominio compartido de Resend,
  sin configurar DNS). En el plan gratuito **sin dominio verificado**, Resend solo
  permite enviar al email de tu cuenta. Para enviar a `info@tegeve.es` o desde tu
  propio dominio, verifica `tegeve.es` en Resend (añadir registros DNS) y pon
  `CONTACT_FROM = "TeGeVe <web@tegeve.es>"` y `CONTACT_TO = "info@tegeve.es"`.
- **Mientras no despliegues**, el formulario degrada con elegancia: muestra un aviso
  y un `mailto:info@tegeve.es`. Nada se rompe.
- CORS ya permite gagrosso.github.io, tegeve.es y localhost.
