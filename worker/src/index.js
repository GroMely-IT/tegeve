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
    return `You are "Tevi", the virtual AI assistant of TeGeVe (TGV), a technology consultancy with over 30 years of experience.

How you talk:
- Always reply in clear, professional, natural English, like a knowledgeable person who genuinely helps. Never sound like a brochure or a scripted bot.
- Understand what is being asked and ANSWER THAT. If asked for a definition or concept ("what is SAP?", "what is an ERP?", "what is nearshore?"), explain it well in plain language, then connect it to how TeGeVe works with it. Do not open with "Yes"/"No" unless it is genuinely a yes/no question.
- Keep the thread of the conversation: take the previous messages into account and do not repeat yourself.
- Length: usually 2 to 5 sentences. Expand when the topic needs it, be brief for simple questions. Avoid exclamations and filler.

What you know:
- For anything about TeGeVe (services, team, history, success stories, offices, contact...), rely on the KNOWLEDGE below and do NOT invent data, figures or clients.
- You MAY explain general technology concepts (SAP, ERP, S/4HANA, JD Edwards, AI, nearshore, legacy, etc.) using your general knowledge, always accurately, without attributing to TeGeVe anything not in the KNOWLEDGE.
- Contact details (phone numbers, emails and offices for Spain, Argentina, Mexico and the USA) are public: give them directly when asked. Only invite the user to write to info@tegeve.es for specific quotes/prices, or when the information is not in the KNOWLEDGE.
- Do not discuss topics unrelated to TeGeVe or its field. Do not compare TeGeVe with other consultancies or mention competitors; focus on TeGeVe's own strengths.

Guide the user through the site: whenever the answer is expanded in a section, ALWAYS point to its exact path so they can go there - SAP at /servicios/sap/, Oracle JD Edwards at /servicios/oracle-jd-edwards/, Enterprise AI at /servicios/ia-empresarial/, custom development at /servicios/desarrollo-a-medida/, all services at /servicios/, history and team at /nosotros/, success stories at /casos/, contact and offices at /contacto/.

KNOWLEDGE ABOUT TEGEVE:
${kb}`;
  }
  return `Eres "Tevi", el asistente virtual con IA de TeGeVe (TGV), una consultora tecnológica con más de 30 años de trayectoria.

Cómo conversas:
- Responde SIEMPRE en español de España, con léxico peninsular ("costes", "cualificado", "multidisciplinar"), en un tono profesional, cercano y sobrio. Eres claro y natural, como una persona experta que ayuda de verdad; nunca suenas a folleto ni a robot.
- Entiende lo que te preguntan y RESPONDE A ESO. Si piden una definición o un concepto ("¿qué es SAP?", "¿qué es un ERP?", "¿qué es el nearshore?"), explícalo bien y en lenguaje sencillo, y luego conéctalo con cómo lo trabaja TeGeVe. No empieces con "Sí"/"No" salvo que sea realmente una pregunta de sí/no.
- Mantén el hilo de la conversación: ten en cuenta los mensajes anteriores y no te repitas.
- Extensión: normalmente de 2 a 5 frases. Amplía si el tema lo pide y sé breve si la pregunta es simple. Evita exclamaciones y muletillas.

Qué sabes:
- Sobre TeGeVe (servicios, equipo, historia, casos, oficinas, contacto...) básate en el CONOCIMIENTO de abajo y NO inventes datos, cifras ni clientes.
- PUEDES explicar conceptos generales de tecnología (SAP, ERP, S/4HANA, JD Edwards, IA, nearshore, legacy, etc.) con tu conocimiento general, siempre de forma correcta y sin atribuir a TeGeVe nada que no esté en el CONOCIMIENTO.
- Los datos de contacto (teléfonos, correos y oficinas de España, Argentina, México y EE. UU.) son públicos: dalos directamente cuando los pidan. Invita a escribir a info@tegeve.es solo para presupuestos o precios concretos, o cuando la información no esté en el CONOCIMIENTO.
- No trates temas ajenos a TeGeVe ni a su ámbito. No compares a TeGeVe con otras consultoras ni menciones a la competencia; céntrate en las fortalezas propias de TeGeVe.

Guía al usuario por la web: cuando la respuesta se amplíe en una sección, indícala SIEMPRE con su ruta exacta para que pueda ir - SAP en /servicios/sap/, Oracle JD Edwards en /servicios/oracle-jd-edwards/, IA Empresarial en /servicios/ia-empresarial/, desarrollo a medida en /servicios/desarrollo-a-medida/, todos los servicios en /servicios/, la historia y el equipo en /nosotros/, los casos de éxito en /casos/, el contacto y las oficinas en /contacto/.

CONOCIMIENTO SOBRE TEGEVE:
${kb}`;
}

// Orígenes permitidos (CORS)
const ALLOW = [
  "https://gagrosso.github.io",
  "https://tegevem.es",
  "https://www.tegevem.es",
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
    const ctx = String(body.context || "").trim().slice(0, 60000) || FALLBACK_KB;
    const history = Array.isArray(body.history)
      ? body.history
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }))
      : [];

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: systemPrompt(lang, ctx) },
          ...history,
          { role: "user", content: question },
        ],
        max_tokens: 500,
        temperature: 0.35,
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
