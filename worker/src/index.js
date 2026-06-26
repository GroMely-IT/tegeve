// ════════════════════════════════════════════════════════════════
//  TeGeVe — Asistente IA "Tevi" (Cloudflare Worker + Workers AI)
//  IA generativa GRATIS: usa los modelos de Cloudflare Workers AI
//  (cuota diaria gratuita, sin clave de API externa).
//  - Bilingüe (ES/EN): responde en el idioma activo del sitio.
//  - Anclado ("grounded"): responde SOLO con el contenido del sitio.
//    El cliente envía { question, lang, context }, donde `context`
//    es la base de conocimiento (FAQ) del propio sitio en ese idioma.
//  Despliegue: ver worker/README.md  →  `wrangler deploy`
// ════════════════════════════════════════════════════════════════

// Modelo actual de Workers AI (el anterior llama-3.1-8b-instruct fue retirado el 2026-05-30).
// Alternativa más ligera/económica en Neurons: "@cf/meta/llama-3.1-8b-instruct-fast".
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Conocimiento de respaldo (si el cliente no envía `context`).
// Mantener sincronizado con el FAQ del sitio.
const FALLBACK_KB = `
TeGeVe (también conocida como TGV) es una consultora tecnológica con más de 30 años de trayectoria.
Eslogan: "Transformamos los proyectos tecnológicos más desafiantes en soluciones innovadoras".
Presta servicios desde España (Málaga), Argentina (Buenos Aires) y Estados Unidos; contacto comercial también en México. Proyectos en más de 16 países, con empresas y organismos gubernamentales. Modalidad nearshore y en las oficinas del cliente. Equipo cualificado y multidisciplinar.
Equipo: Dirección — Osvaldo Tessio, Ernesto Galindez y Marta Vicena (cofundadores) y Gabriel Grosso (Director de TeGeVe). Responsables de área: Fernando García (SAP), Julieta Vegas (Oracle ERPs), Fernando Baztarrica (Web Business Solutions), Jose Jaliff (IA Empresarial), Jorge Bessone (Desarrollo para Servicios Financieros), María Amelia Rojas (RRHH), José Luis Cárcamo (Calidad y Procesos), Mariano Attanasio (Administración y Finanzas), Carlos Rasch (Ventas y Marketing), Gustavo Palmieri (IT). Mercados: Fernando García (TGV Argentina), Adriana Barbera (TGV México), Hugo Rabinovich (TGV Americas).
Servicios: (1) Desarrollo de software a medida e integración de aplicaciones; (2) Consultoría SAP, incluido el camino a SAP S/4HANA (BTP, Fiori, HANA, ABAP, CPI); (3) Oracle JD Edwards (EnterpriseOne y World): implementación, upgrades, Orchestrator/IoT y soporte; (4) IA Empresarial y Business Intelligence: agentes de IA, RPA, automatización, BI y analítica (caso real: conciliación de fondos de inversión, de 4 días a horas); (5) Assessment: evaluaciones y auditorías para optimizar costes (caso: Business Value Assessment para Motta Internacional); (6) Industria financiera y modernización de sistemas legacy (COBOL, AS/400, DB2).
Historia: TeGeVe (TGV) fue fundada en 1992 en Argentina por Osvaldo Tessio, Ernesto Galindez y Marta Vicena. Hitos: 2002 primer contacto internacional (México); 2004 primer Service Partner de SAP; 2006 inicio de CMMI; 2010 primera oficina internacional en Monterrey (Soinf); 2014 oficina en Florida, EE. UU. (TGVAmericas); 2021 llegada a Málaga, España (TeGeVe); 2022 30 años; 2025 nivel de madurez 3 en CMMI DEV.
Modelos de servicio: implementación a medida, AMS (soporte evolutivo), Software Factory, Testing Factory, Staff Augmentation, Assessment y nearshore.
Reconocimientos: CMMI Nivel 3, firmantes del Pacto Global de la ONU, miembros de Polo IT Buenos Aires y de CESSI.
Alianzas: partner de SAP, Oracle e IBM. Clientes/Referencias: Motta Internacional, Weatherford, Abertis/Autopistas del Oeste, Banco Itaú, Banco Comafi, Kimberly-Clark, Nutrien, First Data.
Fortalezas: equipos senior estables, trato directo, modalidad nearshore eficiente en costes y más de 30 años de especialización técnica.
Contacto: España info@tegeve.es / +34 952 569 582; Argentina info@tgv.com.ar / +54 11 5767-7477; México info@tgv-group.com / +52 81 2092 2323; USA info@tgvamericas.net / +1 561 306-5121.
`;

function systemPrompt(lang, kb) {
  if (lang === "en") {
    return `You are "Tevi", the virtual assistant of TeGeVe (TGV), a technology consultancy.
Always answer in clear, neutral, professional English. Be concise: 2 to 4 sentences. Avoid exclamations and slang.
Answer ONLY about TeGeVe and its services, strictly grounded in the CONTEXT below. Do NOT invent data, figures or clients.
If the question cannot be answered from the CONTEXT, or asks for a specific quote/price, politely invite the user to write to info@tegeve.es.
Do not discuss topics unrelated to TeGeVe. Do not compare TeGeVe with other consultancies or mention competitors; focus only on TeGeVe's strengths.
When the answer is expanded on a section of the website, point to it with its exact path: history and team at /nosotros/, services at /servicios/, success stories at /casos/, contact at /contacto/.

CONTEXT ABOUT TEGEVE:
${kb}`;
  }
  return `Eres "Tevi", el asistente virtual de TeGeVe (TGV), una consultora tecnológica.
Responde SIEMPRE en español de España, con léxico peninsular ("costes" y no "costos", "cualificado", "multidisciplinar"), en un tono profesional, sobrio e institucional.
Sé conciso: entre 2 y 4 frases. Evita exclamaciones y lenguaje coloquial.
Responde ÚNICAMENTE sobre TeGeVe y sus servicios, basándote ESTRICTAMENTE en el CONOCIMIENTO de abajo. No inventes datos, cifras ni clientes.
Si la pregunta no se puede responder con ese conocimiento, o si piden un presupuesto concreto, invita amablemente a escribir a info@tegeve.es.
No trates temas ajenos a TeGeVe. No compares a TeGeVe con otras consultoras ni menciones a la competencia; céntrate solo en las fortalezas de TeGeVe.
Cuando la respuesta se amplíe en una sección de la web, indícala con su ruta exacta: la historia y el equipo en /nosotros/, los servicios en /servicios/, los casos de éxito en /casos/, el contacto en /contacto/.

CONOCIMIENTO SOBRE TEGEVE:
${kb}`;
}

// Orígenes permitidos (CORS)
const ALLOW = [
  "https://gagrosso.github.io",
  "https://tegeve.es",
  "https://www.tegeve.es",
  "https://tegeve.gabrielgrosso.workers.dev",
  "http://localhost:4178",
  "http://localhost:8000",
];

// Permite además cualquier subdominio propio: *.gabrielgrosso.workers.dev y *.pages.dev
// (así no se rompe si cambias el nombre del Worker/Pages o usas una URL de preview).
function isAllowedOrigin(origin) {
  if (ALLOW.includes(origin)) return true;
  return (
    /^https:\/\/[a-z0-9-]+\.gabrielgrosso\.workers\.dev$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(origin)
  );
}

function corsHeaders(origin) {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOW[0];
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
    if (request.method !== "POST") return json({ error: "Use POST." }, 405, h);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400, h);
    }

    const question = String(body.question || "").trim().slice(0, 600);
    if (!question) return json({ error: "Empty question." }, 400, h);

    const lang = body.lang === "en" ? "en" : "es";
    // El contexto lo provee el cliente desde el propio sitio (en el idioma activo).
    // Se limita su tamaño y se usa el respaldo si no llega.
    const ctx = String(body.context || "").trim().slice(0, 56000) || FALLBACK_KB;

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: systemPrompt(lang, ctx) },
          { role: "user", content: question },
        ],
        max_tokens: 400,
        temperature: 0.2,
      });
      return json({ answer: (result.response || "").trim() }, 200, h);
    } catch (err) {
      return json(
        { error: "AI service unavailable.", detail: String(err) },
        502,
        h
      );
    }
  },
};
