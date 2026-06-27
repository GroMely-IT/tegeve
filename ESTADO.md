# Estado del sitio TeGeVe — bitácora y pendientes

> Documento vivo. Resume **qué hay hoy**, **qué hicimos** y **qué queda**. Última actualización: **26 jun 2026**.

---

## 1. Estado actual

- **En vivo:** https://gagrosso.github.io/tegeve/ (futuro dominio propio: `www.tegeve.es` vía CNAME).
- **Deploy:** automático en cada `push` a `main` (GitHub Actions → `.github/workflows/static.yml`). No requiere build. ✔️ Último deploy correcto: commit `b908dbb`.
- **Coste:** 0 € (GitHub Pages estático + Cloudflare Worker en plan gratuito para la IA).

---

## 2. Arquitectura (multipágina, sin build)

El sitio **ya no es one-page**. Es estático, sin framework ni paso de compilación, con **CSS y JS compartidos y cacheados**.

```
/                     Home: carrusel (globo 3D + Tevi + 3 diapositivas) · servicios (resumen) ·
                      por qué elegirnos · FAQ · CTA de contacto   → enlaza a las páginas profundas
/servicios/           SAP · Oracle JD Edwards · IA Empresarial · Desarrollo a medida · Modelos · Método
/casos/               12 casos de éxito (filtrables) · sectores · clientes
/nosotros/            Historia (línea de tiempo "La Columna") · equipo · testimonios · reconocimientos
/contacto/            CTA de contacto
assets/styles.css     TODO el CSS (compartido por todas las páginas)
assets/app.js         TODO el JS: nav, carrusel, reveal, Tevi, filtro de casos, i18n, red neuronal…
assets/*.jpg|png|mp4  imágenes/vídeo (fotos del equipo, fondos, logos)
sitemap.xml           5 URLs · robots.txt · llms.txt (GEO)
assets/tevi-kb.txt    base de conocimiento COMPLETA de Tevi (todas las páginas).
                      Regenerar con /tmp/build_kb.py al cambiar contenido del sitio.
wrangler.jsonc        Worker UNIFICADO "tegeve": sirve el sitio + IA en /api/tevi
worker-site/index.js  código de ese Worker (estáticos vía ASSETS + IA de Tevi)
.assetsignore         qué NO se sirve como estático (worker/, *.md, .github…)
worker/               Worker INDEPENDIENTE de Tevi (lo usa gagrosso.github.io)
intel.html            herramienta interna (no es parte de la web pública)
```

**Reglas técnicas que NO hay que romper:**
- **Rutas relativas**: la home usa `assets/…`; las páginas profundas usan `../assets/…`. Los enlaces del menú se reescriben por página (home → `servicios/#sap`; profunda → `../servicios/#sap`). Así funciona igual en `localhost`, en `/tegeve/` y en dominio propio.
- **El globo 3D (Three.js)** va inline **solo en la home** (es lo único que carga Three.js).
- **`assets/app.js` debe estar "blindado"**: cada bloque solo-home comprueba `if(!elemento) return`. Si se añade JS que dependa de un elemento que no está en todas las páginas, hay que guardarlo (si no, rompe la página entera). Ya pasó con `pinTrack` y `marquee`.

**Cómo editar / regenerar:** las páginas profundas se generaron con scripts en `/tmp` (`build_extract.py`, `build_pages.py`, `build_home.py`). Para cambios pequeños se editan los HTML/CSS/JS a mano. Para mover secciones entre páginas conviene rehacer/ajustar esos generadores.

---

## 3. Lo que hicimos (sesión jun 2026)

**Estructura y rendimiento**
- ✅ Paso de **one-page a multipágina** (sin build): home narrativa + 4 páginas profundas. `index.html` 320 KB → 74 KB. (`7e22589`, `95162f0`, `b908dbb`)
- ✅ CSS y JS extraídos a `assets/styles.css` + `assets/app.js` compartidos y cacheados.
- ✅ `sitemap.xml` + `robots.txt` con las nuevas URLs. Cada página con su `<title>`/meta/canonical/OG + JSON-LD BreadcrumbList.

**Asistente IA "Tevi"**
- ✅ Tevi pasa al **carrusel como 2.ª diapositiva** con barra de búsqueda (typewriter) + chips que abren al asistente con la pregunta sembrada. (`c4c4950`)
- ✅ **Fondo de red neuronal animada** (movimiento de IA) en esa diapositiva. (`150c185`)
- ✅ IA generativa **activada** (apunta al Worker) y anclada a TODO el sitio. (`0305d88`) · Icono de Tevi unificado (dos estrellas rojas). (`d0d136e`)

**Sección "Nosotros" / Compañía**
- ✅ Nueva **línea de tiempo "La Columna"** 1992→2026 (eje que se rellena, nodos que se encienden, iconos por hito, localizaciones con pin) + valores con iconos. (`6851da9`)
- ✅ **Equipo con fotos reales** de tegeve.es + **icono de LinkedIn por persona** (perfil real). (`934656b`, `b410678`)

**Cabecera y marca**
- ✅ "Contáctanos" **siempre en blanco** + icono LinkedIn de empresa + **efecto imán**. (`679ed92`)
- ✅ Menú legible sobre diapositivas oscuras; pista "Scroll" siempre visible. (`4d085ab`, `1ac777e`)
- ✅ Secciones de servicio con **foto anclada (pinned)** estilo Apple. (`22f6066`)
- ⛔ **Quitadas TODAS las referencias a las Big Four y comparativas** (norma permanente del cliente). (`803eb12`)

**Conversión**
- ✅ **Formulario de contacto funcional** en `/contacto/` (nombre, empresa, email, reto) con validación, honeypot anti-spam, estados de envío/éxito/error e i18n. **Entrega directa a `info@tegeve.es` vía FormSubmit** (gratis, sin cuenta ni DNS). Degrada con elegancia a `mailto` si el servicio falla.

**Ajustes finos (páginas profundas y casos)**
- ✅ Quitado el **encabezado duplicado** y el hueco grande en `/casos/`, `/servicios/`, `/nosotros/`, `/contacto/` (el page-hero repetía el título de la primera sección). Un solo `<h1>` por página.
- ✅ **Hero de servicio centrado en vertical** (`.svc-hero`): las 4 páginas de servicio caben en una pantalla, sin scroll ni hueco superior.
- ✅ **Rediseño "wow" de las fichas de casos**: barra de acento roja que se rellena, resplandor rojo en hover, título en Heebo que vira a rojo, métrica de impacto en píldora destacada, CTA "Ver caso" en versalitas; se conservan filtro y expansión. (`assets/styles.css`)

**Iconos, héroe y Tevi (datos de contacto)**
- ✅ **Tarjetas de "Certificaciones y membresías" con iconos + efecto wow** (`nosotros/index.html`, `styles.css`): badge de icono en círculo rojo, barra de acento que se rellena, resplandor y elevación en hover, y el trazo del icono que se redibuja. Iconos de línea propios: CMMI (niveles ascendentes + check), Pacto Global ONU (globo), Polo IT (clúster de nodos), CESSI (institución con columnas).
- ✅ **Héroe: el texto ya no tapa el globo 3D.** Las reglas `.hero h1`/`.hero .lede` eran *muertas* (el slide es `.hc-hero`, no `.hero`), por eso el texto iba a ancho completo. Se confina con `.hc-hero .hero-inner > *{max-width:min(540px,48%)}` (y ancho completo en ≤900px, donde el globo se oculta). No se toca el globo ni su efecto.
- ✅ **Tevi ya puede dar los datos de contacto públicos.** La causa del "no lo sé" NO era el conocimiento (el teléfono está en TEVI_KB, en tevi-kb.txt y en FALLBACK_KB) sino el *system prompt*, que empujaba a redirigir cualquier petición a info@tegeve.es. Se reescribe la regla (ES+EN, en `worker-site/index.js` y `worker/src/index.js`): los teléfonos/correos/oficinas por país son públicos y se facilitan directamente; la redirección queda solo para presupuestos o datos que no estén en el conocimiento. Se refuerza el bloque de contacto de `TEVI_KB` (país por país) y se sube el recorte de contexto de 56 000 a 60 000 caracteres (recupera el final de la KB, la página /contacto/).
- ⚠️ **Aviso operativo:** hoy Workers AI dio error 4006 — *cuota gratuita diaria agotada (10 000 neuronas)*. Mientras esté agotada, Tevi responde con el mensaje de error a CUALQUIER pregunta. Se resetea cada día; para fiabilidad continua haría falta el plan **Workers Paid** o un modelo más económico (p. ej. `@cf/meta/llama-3.1-8b-instruct-fast`, que consume muchas menos neuronas a cambio de algo menos de calidad). **El arreglo del prompt requiere volver a desplegar el Worker (`npx wrangler deploy`).**

**México en las enumeraciones + Tevi conversacional**
- ✅ **México añadido en todas partes** donde figuraba "España · Argentina · USA" (home, nosotros, servicios, casos, contacto + metas/og/JSON-LD) → "España · Argentina · México · USA". También en el diccionario i18n (clave ES y valor EN) para que el conmutador EN siga funcionando, y el contador de oficinas pasa de **3 a 4**.
- ✅ **Tevi conversa como un LLM de verdad.** Dos arreglos de fondo:
  1. **Memoria de conversación:** el cliente ahora envía el **historial** de los últimos turnos (`history`) y el Worker lo incluye en `messages` (antes solo mandaba la última pregunta, por eso no entendía el contexto). Verificado de extremo a extremo: el 2.º mensaje ya viaja con el turno anterior (user+assistant) y el `/servicios/sap/` de la respuesta se convierte en enlace clicable.
  2. **System prompt reescrito** (ES+EN, ambos workers): deja de sonar a folleto. Entiende la pregunta y **responde a eso** (p. ej. "¿qué es SAP?" → explica qué es SAP y luego lo conecta con TeGeVe), puede explicar conceptos generales, mantiene el hilo, y **siempre remite con la ruta de la sección** (que el cliente convierte en enlace). `max_tokens` 400→500, `temperature` 0.2→0.35. Voz sobria de España, sin inventar, sin comparativas.
- ℹ️ La respuesta mala que viste ("¿Qué es SAP?" → "Sí. Implementamos…") era la **respuesta enlatada de respaldo** que aparece cuando la IA está caída (cuota gratis agotada) y emparejaba mal la pregunta. Con la IA disponible + redeploy del Worker, ahora la contesta el modelo con el prompt nuevo.
- ✅ **IA de Tevi vía API gratuita de NVIDIA** (build.nvidia.com, `integrate.api.nvidia.com/v1`, compatible con OpenAI, modelo `meta/llama-3.3-70b-instruct`), para evitar la cuota diaria de "neuronas" de Cloudflare. Helper `generate(env, messages)` en ambos workers: usa NVIDIA si está el secreto `NVIDIA_API_KEY`; si falla o no hay clave, recurre a Cloudflare Workers AI. **Ambos workers ya desplegados** (`tegeve` y `tegeve-asistente`).
- ✅ **Clave NVIDIA puesta en `tegeve` (unificado).** Tevi PROBADO EN VIVO con NVIDIA: explica "¿qué es SAP?" y enlaza a /servicios/sap/, da el teléfono de España (+34 952 569 582) y mantiene el hilo (pregunta de seguimiento sobre oficinas), también con el contexto completo de 60 KB. Producción principal al 100%.
- ✅ **Latencia arreglada (lo que hacía que "no funcionara").** Mandábamos TODA la KB (~60 KB ≈ 15.000 tokens) en cada pregunta y el 70B gratis tardaba 30-45 s → la petición fallaba y salía la respuesta de respaldo. `fullContext()` ahora manda solo el resumen canónico (`TEVI_KB`) → respuestas típicas de **~2 s** (probado en vivo). El Worker además reintenta NVIDIA una vez ante un error transitorio. ⚠️ El tier gratis de NVIDIA tiene **picos ocasionales** (~30 s) por cola; si molesta, alternativa: **Groq** (gratis, API compatible con OpenAI, ~2 s constantes) como proveedor primario.
- ✅ **Dominio propio `tegevem.es`** (con "m") conectado al Worker unificado. Tevi llama a `/api/tevi` en el MISMO origen ahí (sin CORS); el `AI_ENDPOINT` usa ruta relativa salvo en github.io/localhost. `tegevem.es`/`www.tegevem.es` añadidos al allowlist CORS. Probado en vivo: responde.
- ✅ **Dominio definitivo `tegevem.es` (apex)** (decisión del dueño). Alineados `canonical`/`og:url`/`og:image`/`twitter`/`JSON-LD` de las 8 páginas profundas (`www.tegeve.es` → `tegevem.es`); home/sitemap/robots/llms ya estaban. `www.tegevem.es` NO resuelve → se usa el apex. El correo `info@tegeve.es` se mantiene.
- ✅ **Groq como proveedor primario de IA** (desplegado): `generate()` prioriza Groq (`llama-3.3-70b-versatile`, ~2 s constantes) → NVIDIA → Workers AI. Resuelve los picos de NVIDIA.
- ✅ **Clave `GROQ_API_KEY` puesta y PROBADA EN VIVO** en `tegevem.es`: 4 preguntas, todas **< 1 s** (0,38–0,98 s) y correctas. Groq es ya el motor primario. Tevi rápido y fiable.
- ✅ **Tevi persiste al navegar** (sessionStorage): al pulsar un enlace y cambiar de página, sigue abierto con todo el hilo (chips re-vinculados).
- ✅ **Auto-navegación + enfoque:** si Tevi recomienda UNA sección y no estás en ella, te lleva solo (cuenta atrás **10 s**, botón "Quedarme aquí", se cancela al escribir; guard contra recargas inútiles). Al llegar, **hace scroll hasta el contenido concreto** que preguntaste (p. ej. "Gabriel Grosso" en /nosotros/) y lo resalta. Usa `window.scrollTo` con posición medida (scrollIntoView fallaba por los transforms de `.reveal`). El targeting está verificado; el scroll en sí no se puede comprobar en el preview (no refleja desplazamiento) → confirmar en vivo. **Estado de Tevi: COMPLETO.**
- ✅ **Un solo backend de IA.** `AI_ENDPOINT` (app.js) ahora apunta al Worker unificado `tegeve` (`/api/tevi` en workers.dev; `https://tegeve.gabrielgrosso.workers.dev/api/tevi` de forma cruzada desde github.io o dominio propio — CORS verificado). Así GitHub Pages usa el mismo Worker con la clave, sin necesidad de una segunda clave. **El Worker `tegeve-asistente` queda en desuso** (se puede borrar más adelante; ya no lo llama nadie).

**Decisión de diseño (importante):** revisamos el documento externo `MEJORA-TEGEVE.md` (de "Claude Design"). Se **descartó** su rediseño "editorial / Big Four" porque choca con la norma de no comparar/parecerse a las Big Four y arrancaría el "wow" actual. Se eligió **híbrido**: conservar diseño + wow y, como mucho, tomar prestadas ideas editoriales puntuales.

---

## 4. Pendientes (por prioridad)

| # | Pendiente | Quién | Notas |
|---|-----------|-------|-------|
| 1 | **Desplegar el Worker UNIFICADO** (sitio + IA) | **Tú** | Desde la raíz del repo: `npx wrangler deploy`. Despliega el Worker `tegeve` (sirve el sitio estático + la IA de Tevi en `/api/tevi`, mismo origen → sin CORS). Si tu conexión Cloudflare↔GitHub ya hace build, debería detectar `wrangler.jsonc` y desplegarlo solo al hacer push; si no, usa el comando. Necesita Workers AI activado (gratis) en la cuenta. **Avísame al desplegar y lo verifico.** |
| 2 | **Activar el formulario** (1 clic, sin código) | **Tú** | El formulario de `/contacto/` usa **FormSubmit** y entrega a **info@tegeve.es**. La PRIMERA vez que alguien envíe, llegará un correo de *activación* a esa bandeja: ábrelo y pulsa el enlace una vez. Después funciona siempre. |
| 3 | **Toques "híbridos" editoriales** | Claude | Cifras gigantes en serif, alguna franja sobria — sin perder el wow. |
| ~~4~~ | ~~Páginas por servicio~~ ✅ HECHO | — | `/servicios/{sap,oracle-jd-edwards,ia-empresarial,desarrollo-a-medida}/` con reto/enfoque/casos/FAQ/CTA; hub = índice; nav y sitemap actualizados; Tevi las conoce. |
| 5 | **/insights (blog)** | Claude | Motor de citabilidad por IA: índice + artículos (S/4HANA, IA en producción, modernizar legacy). |
| 6 | **i18n de los nuevos textos** | Claude | Los `<h1>`/lede de las páginas profundas son nuevos: añadir su traducción EN al diccionario de `app.js`. |
| 7 | **Mover el JSON-LD de casos (ItemList) a `/casos/`** | Claude | Hoy sigue en la home; debería vivir en su página. |
| 8 | **`og.png` real (1200×630)** | Tú/Claude | La imagen social. Falta confirmar que existe en la raíz. |
| 9 | **Dominio propio** | Tú | CNAME `tegeve.es` → GitHub Pages; luego los canonical (`www.tegeve.es/…`) quedan correctos. |
| 10 | **Lighthouse / accesibilidad** | Claude | Pasada de rendimiento (imágenes con `srcset`/dimensiones, etc.) y axe. |

---

## 5. Notas de marca (recordatorio permanente)

- **Idioma:** español de España, voz corporativa sobria. **Sin emoji** en el sitio.
- **Marca:** rojo `#E30613`, fuentes Inter (cuerpo) + Heebo (display).
- ⛔ **Nunca** mencionar Big Four (Deloitte/PwC/EY/KPMG), Globant ni competidores, ni hacer comparativas. Solo fortalezas propias en positivo.
- **Datos reales**: nunca inventar cifras ni clientes.
