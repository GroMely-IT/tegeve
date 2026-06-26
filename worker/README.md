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
- **Modelo:** se puede cambiar en `src/index.js` (`MODEL`). Otros modelos disponibles:
  `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, etc.
- **Anclaje (grounding):** el sitio envía el FAQ como `context` en cada consulta, así que
  para mantener la IA al día basta con editar el FAQ del `index.html`. La constante
  `FALLBACK_KB` en `src/index.js` solo se usa si no llega `context`.
