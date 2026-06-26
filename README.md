# TEGEVE — Sitio web corporativo

Web corporativa de **TEGEVE (TGV)**, consultora tecnológica con +30 años en SAP, Oracle JD Edwards, IA Empresarial, desarrollo a medida y modernización de legacy.

🔗 **En vivo:** https://gagrosso.github.io/tegeve/ (y, cuando se configure el dominio, https://www.tegeve.es/)

## Contenido del repositorio

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Sitio corporativo (single-file, sin build): hero animado, servicios, método sticky estilo Apple, sectores, FAQ y asistente IA. |
| `intel.html` | Herramienta interna **TGV Intel** (generador de prompts de prospección B2B). |
| `llms.txt` | Resumen estructurado para motores de IA (GEO). |
| `robots.txt` | Permite rastreadores de buscadores y de IA. |
| `sitemap.xml` | Mapa del sitio. |
| `og.svg` | Imagen de previsualización social. |
| `PLAN-DE-MEJORA.md` | Investigación (Big Four, Globant, GEO) y plan estratégico. |
| `worker/` | Cloudflare Worker (Workers AI) para activar la IA generativa gratis del chatbot. Opcional: ver `worker/README.md`. |

## Características

- **Animaciones tipo Apple**: parallax, *reveal on scroll* (IntersectionObserver), contadores y escena fijada (sticky pinned).
- **FAQ grande** filtrable que cubre todos los servicios.
- **Asistente con IA** que responde sobre TEGEVE usando el FAQ como base de conocimiento (100% cliente, sin claves).
- **GEO**: datos estructurados JSON-LD (Organization, FAQPage, Service), `llms.txt`, `sitemap.xml`.
- **Responsive** y accesible (`prefers-reduced-motion`, skip link, menú móvil).

## Desarrollo

No requiere build ni dependencias. Para previsualizar en local:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Despliegue

Publicado gratis con **GitHub Pages** desde la rama `main`. Cualquier cambio en `main` se publica automáticamente.

---
© TEGEVE · TGV — Soluciones inteligentes para tu empresa.
