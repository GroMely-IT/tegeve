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
worker/               Cloudflare Worker (IA generativa de Tevi)
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
- ✅ **Formulario de contacto funcional** en `/contacto/` (nombre, empresa, email, reto) con validación, honeypot anti-spam, estados de envío/éxito/error e i18n. Envía por el **Worker `/contact` → Resend** (gratis). Degrada con elegancia a `mailto` si el Worker aún no está desplegado.

**Decisión de diseño (importante):** revisamos el documento externo `MEJORA-TEGEVE.md` (de "Claude Design"). Se **descartó** su rediseño "editorial / Big Four" porque choca con la norma de no comparar/parecerse a las Big Four y arrancaría el "wow" actual. Se eligió **híbrido**: conservar diseño + wow y, como mucho, tomar prestadas ideas editoriales puntuales.

---

## 4. Pendientes (por prioridad)

| # | Pendiente | Quién | Notas |
|---|-----------|-------|-------|
| 1 | **Desplegar el Worker** (Tevi IA + formulario) | **Tú** | `cd worker && wrangler deploy`. Activa el modelo nuevo de Tevi (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), el guardrail anti-comparativas y el endpoint `/contact`. **Para el formulario:** crea una cuenta gratis en Resend y `wrangler secret put RESEND_API_KEY` (pasos en `worker/README.md`). Sin esto, Tevi cae al buscador de FAQ y el formulario degrada a `mailto`. |
| ~~2~~ | ~~Formulario de contacto~~ ✅ HECHO | — | Construido en `/contacto/` (Worker `/contact` + Resend). Solo falta el paso #1. |
| 3 | **Toques "híbridos" editoriales** | Claude | Cifras gigantes en serif, alguna franja sobria — sin perder el wow. |
| 4 | **Páginas por servicio individuales** | Claude | Separar SAP/JDE/IA/Desarrollo en `/servicios/<slug>/` (más profundidad para SEO/GEO). |
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
