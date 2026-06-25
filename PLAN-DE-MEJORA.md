# Plan de mejora web de TEGEVE — a la altura de las Big Four y Globant

> Investigación + estrategia + lo ya implementado en este repositorio.
> Fecha: 26 de junio de 2026.

---

## 1. Qué hacen las referencias (investigación)

**Big Four (Deloitte, PwC, EY, KPMG)** — qué les hace fuertes online:
- **Profundidad de contenido brutal.** Deloitte tiene ~512k páginas indexadas, EY ~304k, PwC ~214k, KPMG ~181k. Ganan por volumen + relevancia de *insights*.
- **Casos de éxito como prueba.** Cada servicio se respalda con resultados reales y datos.
- **Diseño limpio y profesional**, con descripciones de servicio concisas y visuales potentes (KPMG y EY destacan en UX).
- **Distribución social**: LinkedIn es su canal dominante (EY 87% del tráfico social), y Deloitte invierte fuerte en vídeo (YouTube).

**Globant** — qué copiamos del modelo:
- Home de **scroll vertical** con bloques alternados imagen/texto y **navegación sticky**.
- Servicios organizados como **"studios"** (tarjetas clicables por industria).
- **"Reinvention Stories"**: carrusel de casos de cliente como prueba social.
- **Múltiples CTAs** a lo largo de la página + formulario "Cuéntanos cómo podemos ayudarte".
- Posicionamiento claro en **IA** (AI Pods, agentes autónomos).

**Conclusión:** no necesitamos 500k páginas para competir. Necesitamos **una home excelente, profunda en lo que hacemos, con prueba social, orientada a IA y técnicamente impecable para GEO.**

---

## 2. Lo que YA se implementó en esta entrega

| # | Mejora | Estado |
|---|--------|--------|
| 1 | **Nueva home corporativa** estilo Apple/Globant (`index.html`) | ✅ Hecho |
| 2 | **Animaciones tipo Apple**: hero con gradiente animado, parallax, *reveal on scroll*, contadores, y una **escena fijada (sticky pinned)** con 4 pasos del método | ✅ Hecho |
| 3 | **FAQ grande** (18 preguntas, filtrable por categoría) cubriendo *todo* lo que hace TEGEVE | ✅ Hecho |
| 4 | **Asistente con IA** flotante que responde sobre el sitio usando el FAQ como base de conocimiento | ✅ Hecho |
| 5 | **GEO** (Generative Engine Optimization): JSON-LD (Organization, FAQPage, Service), `llms.txt`, `robots.txt` con bots de IA, `sitemap.xml`, meta/OG, imagen social | ✅ Hecho |
| 6 | **Sección "Por qué TEGEVE"** posicionando frente a las Big Four | ✅ Hecho |
| 7 | **Responsive + accesibilidad** (skip link, `prefers-reduced-motion`, menú móvil) | ✅ Hecho |
| 8 | Herramienta interna previa preservada en `intel.html` | ✅ Hecho |

---

## 3. Sobre el asistente de IA (importante)

GitHub Pages es **hosting estático**: no hay servidor donde guardar una API key de forma segura. Por eso el asistente entregado es un **asistente de recuperación** que:
- Lee el FAQ del propio sitio como **fuente única de verdad** (lo mismo que ven los buscadores → bueno para GEO).
- Empareja la pregunta del usuario con la respuesta más relevante (normalización, sinónimos, *scoring*).
- Funciona **100% gratis, sin claves, sin backend** y sin riesgo de fuga de credenciales.

**Para convertirlo en una IA generativa real** (que redacte respuestas nuevas, no solo recupere), hace falta un pequeño backend que guarde la clave. Opciones gratuitas:
- **Cloudflare Workers** (free tier) como proxy a la API de Claude/OpenAI.
- **Vercel / Netlify Functions**.
- El widget ya está preparado para apuntar a un endpoint cuando lo tengas.

---

## 4. Roadmap recomendado (siguientes pasos)

**Corto plazo (semanas 1–4)**
1. **Dominio propio**: apuntar `tegeve.es` a GitHub Pages (CNAME) para que las URLs canónicas y el GEO funcionen sobre el dominio real.
2. **Imagen social PNG** 1200×630 (ahora es SVG; LinkedIn/WhatsApp prefieren PNG/JPG).
3. Dar de alta el sitio en **Google Search Console** y **Bing Webmaster Tools** (ChatGPT usa el índice de Bing) y enviar el `sitemap.xml`.
4. **Backend de IA** (Cloudflare Worker) si se quiere chatbot generativo real.

**Medio plazo (1–3 meses) — para acercarse a las Big Four**
5. **Sección de casos de éxito** con datos reales y resultados (lo que más convierte).
6. **Blog / Insights** con artículos técnicos (SAP S/4HANA, IA con gobernanza, modernización de legacy). Es el motor del GEO y del SEO: cada artículo bien estructurado es citable por la IA.
7. **Páginas por servicio** (una por SAP, JDE, IA…) para profundidad de contenido.
8. **Presencia en LinkedIn** + *bylines* de los expertos en medios del sector (señal de marca para GEO).

**Métrica de éxito GEO:** preguntar mensualmente a ChatGPT, Perplexity, Gemini y Claude las 10–20 preguntas clave del sector y comprobar si aparece "TEGEVE". Perplexity suele reflejar cambios en 2–4 semanas; ChatGPT (vía Bing) en 6–12.

---

## 5. Fuentes de la investigación
- GEO 2026: aimagicx.com, mersel.ai, frase.io, gen-optima.com
- Animaciones Apple: css-tricks.com, medium.com (Ankit Trehan), brad-holmes.co.uk
- Big Four / Globant: consideredcontent.com, blog.hubspot.com, globant.com
- Contenido de TEGEVE: tegeve.es
