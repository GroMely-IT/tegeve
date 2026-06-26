// ════════════════════════════════════════════════════════════════
//  TeGeVe — Asistente IA (Cloudflare Worker + Workers AI)
//  IA generativa GRATIS: usa los modelos de Cloudflare Workers AI
//  (cuota diaria gratuita, sin clave de API externa).
//  Despliegue: ver worker/README.md  →  `wrangler deploy`
// ════════════════════════════════════════════════════════════════

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

// Conocimiento de TeGeVe (grounding). Mantener sincronizado con el FAQ del sitio.
const KB = `
TeGeVe (también conocida como TGV) es una consultora tecnológica con más de 30 años de trayectoria.
Eslogan: "Transformamos los proyectos tecnológicos más desafiantes en soluciones innovadoras".
Presta servicios desde España (Málaga), Argentina (Buenos Aires) y Estados Unidos; contacto comercial también en México. Ha desarrollado proyectos en más de 16 países, con empresas y organismos gubernamentales.
Trabaja en modalidad nearshore y en las oficinas del cliente. Equipo cualificado y multidisciplinar.
Servicios: (1) Desarrollo de software a medida e integración de sistemas de múltiple envergadura; (2) Consultoría SAP, incluido el camino hacia SAP S/4HANA; (3) Oracle JD Edwards (EnterpriseOne y World): implementación, upgrades y soporte; (4) IA Empresarial: agentes de IA, RPA y automatización inteligente de procesos (caso real: conciliación de fondos de inversión); (5) Assessment: evaluaciones y auditorías para conocer las necesidades reales y optimizar costes (caso: auditoría a Motta Internacional); (6) Industria financiera y modernización de sistemas legacy (COBOL, AS/400, DB2).
Alianzas: partner de SAP, Oracle e IBM. Referencias: Motta Internacional, Weatherford, Abertis/Autopistas del Oeste, Banco Itaú.
Diferenciación frente a las Big Four: equipos senior estables, trato directo, modalidad nearshore más eficiente en costes y más de 30 años de especialización técnica.
Contacto: España info@tegeve.es / +34 952 569 582; Argentina info@tgv.com.ar / +54 11 5767-7477; México info@tgv-group.com / +52 81 2092 2323; USA info@tgvamericas.net / +1 561 306-5121.
`;

const SYSTEM = `Eres el asistente virtual de TeGeVe (TGV), una consultora tecnológica.
Responde SIEMPRE en español de España, con léxico peninsular ("costes" y no "costos", "cualificado" y no "calificado", "multidisciplinar"), en un tono profesional, sobrio e institucional propio de una gran consultora.
Sé conciso: entre 2 y 4 frases. Evita las exclamaciones y el lenguaje coloquial.
Responde ÚNICAMENTE sobre TeGeVe y sus servicios, basándote en el CONOCIMIENTO de abajo. No inventes datos, cifras ni clientes.
Si la pregunta no se puede responder con ese conocimiento, o si piden un presupuesto concreto, invita amablemente a escribir a info@tegeve.es.
No trates temas ajenos a TeGeVe.

CONOCIMIENTO SOBRE TEGEVE:${KB}`;

// Orígenes permitidos (CORS)
const ALLOW = [
  "https://gagrosso.github.io",
  "https://www.tegeve.es",
  "https://tegeve.es",
  "http://localhost:4178",
  "http://localhost:8000",
];

function corsHeaders(origin) {
  const allowed = ALLOW.includes(origin) ? origin : ALLOW[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

const json = (data, status, headers) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const h = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: h });
    if (request.method !== "POST") return json({ error: "Usa POST." }, 405, h);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON inválido." }, 400, h);
    }

    const question = String(body.question || "").trim().slice(0, 600);
    if (!question) return json({ error: "La pregunta está vacía." }, 400, h);

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: question },
        ],
        max_tokens: 400,
        temperature: 0.3,
      });
      return json({ answer: (result.response || "").trim() }, 200, h);
    } catch (err) {
      return json({ error: "El servicio de IA no está disponible.", detail: String(err) }, 502, h);
    }
  },
};
