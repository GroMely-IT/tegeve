// ════════════════════════════════════════════════════════════════
//  TeGeVe — Worker UNIFICADO: sirve el sitio estático Y la IA "Tevi"
//  en el MISMO origen → sin CORS.
//   • Estáticos: todo el sitio (raíz del repo) vía el binding ASSETS.
//   • IA: POST /api/tevi  (Workers AI, gratis, sin clave externa).
//  La lógica de IA es la misma que worker/src/index.js (el Worker
//  independiente que sigue sirviendo a gagrosso.github.io). Si tocas
//  el modelo o el prompt aquí, sincronízalo allí (o al revés).
//  Despliegue:  wrangler deploy   (desde la raíz del repo)
// ════════════════════════════════════════════════════════════════

// Modelo en Cloudflare Workers AI (último respaldo; cuota diaria gratuita).
const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// Proveedores compatibles con OpenAI (Llama 3.3 70B), por orden de preferencia.
// Groq: rápido y constante (~2 s). NVIDIA (build.nvidia.com): gratis pero con
// picos de cola. Claves como secretos del Worker (`wrangler secret put ...`).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

// Llama a un endpoint compatible con OpenAI (Groq/NVIDIA). Reintenta una vez
// ante un fallo transitorio. Devuelve el texto, o null si no hay respuesta útil.
async function callOpenAICompat(url, key, model, messages) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: 500, temperature: 0.35 }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (txt && txt.trim()) return txt.trim();
      }
    } catch (e) {
      // fallo transitorio: reintentamos una vez
    }
    if (attempt === 0) await new Promise((res) => setTimeout(res, 300));
  }
  return null;
}

// Genera la respuesta del asistente. Prioridad: 1) Groq (rápido) si hay clave;
// 2) NVIDIA si hay clave; 3) Cloudflare Workers AI (respaldo). Todas reciben el
// mismo array `messages` (system + historial + pregunta).
async function generate(env, messages) {
  if (env.GROQ_API_KEY) {
    const t = await callOpenAICompat(GROQ_URL, env.GROQ_API_KEY, GROQ_MODEL, messages);
    if (t) return t;
  }
  if (env.NVIDIA_API_KEY) {
    const t = await callOpenAICompat(NVIDIA_URL, env.NVIDIA_API_KEY, NVIDIA_MODEL, messages);
    if (t) return t;
  }
  const result = await env.AI.run(MODEL, { messages, max_tokens: 500, temperature: 0.35 });
  return (result.response || "").trim();
}

const FALLBACK_KB = `
TeGeVe (también conocida como TGV) es una consultora tecnológica con más de 30 años de trayectoria.
Cifras: más de 300 profesionales en el equipo (en TeGeVe trabajan más de 300 personas); más de 80 clientes en 16 países, entre ellos 6 de las 10 compañías de alimentos más grandes del mundo y 3 de las instituciones financieras líderes del mundo.
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
    return `You are "Tevi", the virtual assistant of TeGeVe (TGV), a technology consultancy. You speak like a warm, friendly receptionist or consultant on the team: natural, welcoming and professional, like a real person. You never sound like a brochure, a robot or a tech sheet.

How you reply:
- In clear, natural, conversational English, in the first person plural ("we", "at TeGeVe..."), as part of the team.
- SHORT: usually 2 or 3 sentences. Get to the point warmly; no long lists or dense paragraphs unless asked.
- Understand what is asked and answer that helpfully. If asked a concept ("what is SAP?"), explain it in a sentence or two and connect it to how we do it.
- If you DON'T have a specific detail (an exact figure, the fine detail of a case, a quote...), don't make it sound like a problem: offer it naturally, like a good receptionist — "our team can tell you more: write to info@tegeve.es", or "you'll find the full detail at /casos/". Never reply a flat "I don't have that information".
- Contact details (phone numbers, emails and offices for Spain, Argentina, Mexico and the USA) are public: give them directly when asked.
- Do not invent data, figures or clients (use only the KNOWLEDGE below). Do not compare TeGeVe with other consultancies or mention competitors.
- When relevant, invite the user to continue in the right section with its path: services at /servicios/ (SAP at /servicios/sap/, etc.), team and history at /nosotros/, success stories at /casos/, contact at /contacto/.

KNOWLEDGE ABOUT TEGEVE:
${kb}`;
  }
  const _NAMES = { pt: "Brazilian Portuguese (português do Brasil)", it: "Italian", fr: "French", de: "German" };
  if (_NAMES[lang]) {
    return `You are "Tevi", the virtual assistant of TeGeVe (TGV), a technology consultancy. You speak like a warm, friendly receptionist or consultant on the team. ALWAYS reply in ${_NAMES[lang]}.
- Natural, conversational and professional, in the first person plural ("we", "at TeGeVe..."), like a real person on the team. Never sound like a brochure or a robot.
- SHORT: usually 2-3 sentences. Warm and to the point; no long lists unless asked.
- If you DON'T have a specific detail, offer it naturally: "our team can tell you more - write to info@tegeve.es", or point to the right section (/casos/, /servicios/, /nosotros/, /contacto/). Never reply a flat "I don't have that information".
- Contact details for Spain, Argentina, Mexico and the USA are public; give them when asked.
- Do not invent data, figures or clients (use only the KNOWLEDGE below). Do not mention competitors.
The KNOWLEDGE below is written in Spanish; understand it and ALWAYS answer in ${_NAMES[lang]}.

KNOWLEDGE ABOUT TEGEVE:
${kb}`;
  }
  return `Eres «Tevi», la asistente virtual de TeGeVe (TGV), una consultora tecnológica. Hablas como una recepcionista o consultora cercana del equipo: cálida, natural y profesional, como una persona de verdad. Nunca suenas a folleto, a robot ni a ficha técnica.

Cómo respondes:
- En español de España, en un tono amable y conversacional, en primera persona del plural ("nosotros", "en TeGeVe..."), como parte del equipo.
- BREVE: normalmente 2 o 3 frases. Ve al grano con calidez; nada de listas largas ni párrafos densos salvo que te lo pidan.
- Entiende lo que te preguntan y responde a eso de forma útil. Si piden un concepto ("¿qué es SAP?"), explícalo en una o dos frases sencillas y conéctalo con cómo lo hacemos.
- Si NO tienes un dato concreto (una cifra exacta, el detalle fino de un caso, un presupuesto...), que no parezca un problema: ofrécelo con naturalidad, como una buena recepcionista — "eso te lo cuenta mejor nuestro equipo: escríbenos a info@tegeve.es", o "lo tienes con todo el detalle en /casos/". Nunca respondas "no tengo información" a secas.
- Los datos de contacto (teléfonos, correos y oficinas de España, Argentina, México y EE. UU.) son públicos: dalos directamente cuando los pidan.
- No inventes datos, cifras ni clientes (usa solo el CONOCIMIENTO de abajo). No compares a TeGeVe con otras consultoras ni menciones a la competencia.
- Cuando venga a cuento, invita a seguir en la sección adecuada con su ruta: los servicios en /servicios/ (SAP en /servicios/sap/, etc.), el equipo y la historia en /nosotros/, los casos en /casos/, el contacto en /contacto/.

CONOCIMIENTO SOBRE TEGEVE:
${kb}`;
}

// CORS: mismo origen no lo necesita, pero lo dejamos permisivo para
// los dominios propios (por si se llama desde otro origen del grupo).
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
function isAllowedOrigin(origin) {
  if (ALLOW.includes(origin)) return true;
  return (
    /^https:\/\/[a-z0-9-]+\.gabrielgrosso\.workers\.dev$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.pages\.dev$/.test(origin)
  );
}
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOW[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

async function handleTevi(request, env) {
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
  const ctx = String(body.context || "").trim().slice(0, 60000) || FALLBACK_KB;
  const history = Array.isArray(body.history)
    ? body.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }))
    : [];

  try {
    const answer = await generate(env, [
      { role: "system", content: systemPrompt(lang, ctx) },
      ...history,
      { role: "user", content: question },
    ]);
    return json({ answer }, 200, h);
  } catch (err) {
    return json({ error: "AI service unavailable.", detail: String(err) }, 502, h);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // API de Tevi (mismo origen → sin problemas de CORS)
    if (url.pathname === "/api/tevi" || url.pathname === "/api/tevi/") {
      return handleTevi(request, env);
    }
    // Todo lo demás: el sitio estático (lo sirve el binding ASSETS).
    return env.ASSETS.fetch(request);
  },
};
