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

  const lang = ({es:1,en:1,pt:1,it:1,fr:1,de:1})[body.lang] ? body.lang : "es";
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

// ════════════════════════════════════════════════════════════════
//  TEVI AGENT — agente comercial consultivo (Claude Sonnet)
//  Módulo INDEPENDIENTE: no comparte estado ni rutas con Tevi.
//   • Modelo de pago: Claude Sonnet (api.anthropic.com), secreto
//     ANTHROPIC_API_KEY. Si no está, degrada con un mensaje amable.
//   • Persistencia total en KV (binding TEVI_AGENT_KV): se guarda la
//     conversación íntegra (cada mensaje, fecha/hora, duración, idioma),
//     un resumen acumulado, los datos extraídos del lead y el informe.
//   • Optimización de tokens: prompt caching del bloque de sistema
//     (persona + conocimiento, estable) + ventana de historial acotada
//     + resumen rodante automático cuando la conversación se alarga.
//   • Leads anónimos: si nunca da datos, se guarda igual marcado ANÓNIMO.
//   • Arquitectura preparada (sin implementar) para CRM/HubSpot, email,
//     Google Calendar, Microsoft 365, WhatsApp y API de reuniones:
//     ver dispatchLead() al final de generateReport().
// ════════════════════════════════════════════════════════════════

const AGENT_MODEL = "claude-sonnet-4-6"; // Claude Sonnet (de pago, por decisión del cliente)
const AGENT_API = "https://api.anthropic.com/v1/messages";
const AGENT_MAXLEN = 1600;   // tope por mensaje recibido (caracteres)
const AGENT_WINDOW = 10;     // nº de turnos recientes que se envían al modelo
const AGENT_SUMMARIZE_AT = 16; // a partir de aquí, se resume lo más antiguo

// País del visitante (lo da Cloudflare en request.cf.country) → nombre legible,
// para que el agente adapte la variante del idioma y para el informe a Gabriel.
const COUNTRY_NAMES = {
  ES: "España", AR: "Argentina", UY: "Uruguay", MX: "México", CO: "Colombia", CL: "Chile",
  PE: "Perú", VE: "Venezuela", EC: "Ecuador", BO: "Bolivia", PY: "Paraguay", CR: "Costa Rica",
  PA: "Panamá", DO: "República Dominicana", GT: "Guatemala", HN: "Honduras", SV: "El Salvador",
  NI: "Nicaragua", PR: "Puerto Rico", CU: "Cuba", US: "Estados Unidos", BR: "Brasil",
  PT: "Portugal", IT: "Italia", FR: "Francia", DE: "Alemania", GB: "Reino Unido", IE: "Irlanda",
  CH: "Suiza", AT: "Austria", BE: "Bélgica", NL: "Países Bajos", CA: "Canadá",
};
const countryName = (c) => COUNTRY_NAMES[c] || c;

// Conocimiento de TGV, desde la óptica del agente comercial. Reutiliza el KB de
// Tevi (hechos verificados) y añade el vocabulario de cartera que maneja TGV.
const AGENT_KB = FALLBACK_KB + `
CARTERA DE SERVICIOS (vocabulario y capacidades reales de TeGeVe; no inventes nada fuera de esto):
- Staff Augmentation / Ampliación de equipos IT (perfiles senior, nearshore).
- SAP: consultoría, soporte (AMS) y el camino a SAP S/4HANA (BTP, Fiori, HANA, ABAP, CPI).
- Oracle JD Edwards (EnterpriseOne y World): implantación, upgrades, Orchestrator/IoT y soporte.
- Desarrollo de software a medida y Software Factory / Testing Factory.
- IA Empresarial: agentes de IA, automatización (RPA), integraciones entre sistemas.
- Business Intelligence y analítica: Power BI, BI, cuadros de mando, datos.
- Cloud (AWS, Azure), arquitectura empresarial y modernización tecnológica de sistemas legacy (COBOL, AS/400, DB2).
- Transformación digital, ciberseguridad, servicios gestionados (managed services) y consultoría tecnológica.
Persona de cierre: Gabriel Grosso, Director de TeGeVe (TGV). Cuando tenga sentido, el objetivo es coordinar con él una reunión o diagnóstico.`;

// Mapa del sitio (rutas públicas + anclas) verificado contra el HTML real, para
// que el agente lleve a la persona a la sección EXACTA cuando la respuesta esté ahí.
const SITE_MAP = `/ (Home):
  #servicios-overview — Visión general de servicios y capacidades
  #desarrollo-a-medida — Software a medida e integración de sistemas
  #consultoria-sap — Implantación, soporte y migración a S/4HANA
  #oracle-jd-edwards — Implementación, upgrades y soporte JDE EnterpriseOne
  #ia-empresarial — Agentes de IA, RPA y automatización inteligente
  #assessment-y-auditorias — Evaluaciones y auditorías para optimizar costes
  #industria-financiera-legacy — Banca y modernización de legacy COBOL AS/400
  #por-industria — Soluciones por sector y vertical de negocio
  #financiera-transacciones-seguras — Industria financiera, medios de pago y fraude
  #energia-conciliacion-horas — Energía: IA que automatiza conciliación de fondos
  #publico-inspecciones-offline — Sector público: app offline-first para inspecciones
  #retail-decisiones-datos — Retail y alimentación: business intelligence y datos
  #caso-bandera-migraciones — Caso destacado Migraciones: 4.000 inspecciones offline
  #por-que-elegirnos — Diferenciadores y razones para elegir TeGeVe
  #modalidad-nearshore-eficiente — Modelo nearshore eficiente en costes
  #faq-titulo — Preguntas frecuentes sobre servicios y conceptos
  #contacto-titulo — Contacto y agenda de diagnóstico
/casos/ (Casos de éxito):
  #control-permanencia-offline — app móvil offline para inspecciones de campo
  #ia-conciliacion-fci — IA que automatiza conciliación de fondos en SAP
  #ia-planificacion-logistica — IA de ruteo y planificación logística diaria
  #jd-edwards-agroindustrial — implantación y soporte ERP JD Edwards en agro
  #seguridad-jd-edwards-nutrien — assessment de seguridad y accesos en JD Edwards
  #monitor-integraciones-sap — monitor SAP Fiori de integraciones de RRHH
  #soporte-sap-continuo — mesa de ayuda y soporte SAP funcional remoto
  #bi-tendencias-consumo — business intelligence y analítica para gran consumo
  #rating-crediticio-web — desarrollo web de rating crediticio bancario
  #software-factory-aseguradora — software factory y mantenimiento evolutivo en seguros
  #migracion-emv-chip — migración a tarjetas EMV y antifraude en pagos
  #legacy-medios-de-pago — integración de sistemas legacy en medios de pago
  #bva-erp-motta — assessment y selección de ERP basada en datos
  #grandes-organizaciones-confian — clientes y organizaciones de referencia
/contacto/ (Contacto):
  #oficina-espana — contacto oficina de España (email y teléfono)
  #oficina-argentina — contacto oficina de Argentina
  #oficina-mexico — contacto oficina de México
  #oficina-estados-unidos — contacto oficina de Estados Unidos
/nosotros/ (Nosotros: equipo, historia, valores):
  #nuestra-historia — Historia y trayectoria (34 años, 4 países)
  #nuestros-valores — Valores corporativos y cultura de trabajo
  #nuestro-equipo — Equipo y profesionales
  #testimonios-clientes — Testimonios y opiniones de clientes
  #valores-reconocimientos — Certificaciones (CMMI), premios y reconocimientos
/servicios/ (Servicios: índice):
  #servicio-sap — Consultoría SAP: implantación, S/4HANA y AMS
  #servicio-oracle-jd-edwards — Oracle JD Edwards: implantación, upgrades y soporte
  #servicio-ia-empresarial-bi — IA empresarial, BI y automatización RPA
  #servicio-desarrollo-a-medida — Desarrollo a medida de apps e integraciones
  #servicio-modernizacion-legacy — Modernización de legacy COBOL, AS/400 y mainframe
  #servicio-assessment — Assessment y Business Value Assessment
  #modelos-de-servicio — Modelos de contratación y formas de colaborar
  #software-factory — Fábrica de software dedicada
  #staff-augmentation — Sumar perfiles senior al equipo del cliente
  #nearshore — Modalidad nearshore (misma franja horaria, costes)
/servicios/sap/ (Consultoría SAP):
  #que-hacemos — Tecnologías y módulos SAP (S/4HANA, BTP, Fiori, ABAP, CPI)
  #como-lo-hacemos — Modalidades de servicio SAP
  #cuando-nos-llaman — Problemas SAP típicos del cliente
  #nuestro-enfoque — Metodología en proyectos SAP
  #casos-relacionados — Casos de éxito SAP
  #preguntas-frecuentes-sap — Preguntas frecuentes sobre SAP
  #hablamos-proyecto-sap — Contacto para iniciar proyecto SAP
/servicios/oracle-jd-edwards/ (Oracle JD Edwards):
  #que-hacemos — Capacidades JD Edwards (EnterpriseOne, World, Orchestrator)
  #como-lo-hacemos — Modelos de entrega: implementación, AMS, factory
  #cuando-nos-llaman — Situaciones que motivan el contacto
  #nuestro-enfoque — Metodología integral en JDE
  #casos-relacionados — Casos de éxito en JDE
  #faq-oracle-jd-edwards — Preguntas frecuentes sobre JDE
  #hablamos-de-jde — Contacto JDE
/servicios/ia-empresarial/ (IA Empresarial y BI):
  #que-hacemos — Servicios de IA (agentes, RPA, BI, Power BI)
  #como-lo-hacemos — Modalidades de entrega
  #cuando-nos-llaman — Problemas que motivan el contacto
  #nuestro-enfoque — Metodología BI, IA y RPA a producción
  #casos-relacionados — Casos de éxito de IA y BI
  #preguntas-frecuentes — Preguntas frecuentes sobre IA y BI
  #hablamos-de-ia — Contacto y diagnóstico de IA
/servicios/desarrollo-a-medida/ (Desarrollo a medida):
  #que-hacemos — Tecnologías y servicios de desarrollo
  #como-lo-hacemos — Software factory, AMS, staff augmentation
  #cuando-nos-llaman — Señales que motivan desarrollo a medida
  #nuestro-enfoque — Método centrado en el proceso de negocio
  #casos-relacionados — Casos de éxito de desarrollo
  #faq-desarrollo-a-medida — Preguntas frecuentes
  #hablamos-de-tu-software — Contacto
/servicios/modernizacion-legacy/ (Modernización de legacy):
  #que-hacemos — Tecnologías legacy (COBOL, AS/400, DB2, mainframe)
  #como-lo-hacemos — Assessment, modernización gradual, integración, AMS
  #cuando-nos-llaman — Síntomas que motivan modernizar legacy
  #nuestro-enfoque — Modernización por fases, sin big bang
  #casos-relacionados — Casos de éxito de modernización legacy
  #preguntas-frecuentes — Preguntas frecuentes sobre legacy
  #hablamos-modernizar — Contacto para modernizar legacy
/servicios/assessment/ (Assessment / BVA):
  #que-hacemos — Alcance y entregables (BVA, As Is/To Be)
  #como-lo-hacemos — Metodología: mapeo As Is, comparación y roadmap
  #cuando-nos-llaman — Señales que justifican un assessment
  #nuestro-enfoque — Realidad antes que solución
  #casos-relacionados — Casos de éxito de assessment
  #que-es-business-value-assessment — Qué es un Business Value Assessment
  #cuanto-cuesta-y-dura — Coste y duración del assessment
  #hablamos-de-tu-decision — Contacto y agenda`;

// Persona del agente: el mejor comercial tecnológico / consultor senior de
// transformación digital. Habla como una persona, no como un bot.
function agentSystem(lang) {
  const L = {
    es: "español", en: "inglés", pt: "portugués de Brasil",
    it: "italiano", fr: "francés", de: "alemán",
  };
  const idioma = L[lang] || L.es;
  return `Eres el «Agente de TeGeVe», el agente comercial de TeGeVe (también conocida como TGV), una consultora tecnológica con más de 30 años de trayectoria. Te identificas SIEMPRE como «el Agente de TeGeVe» (nunca como «consultor de TGV»). Actúas con la experiencia del mejor comercial de tecnología del mundo y de un consultor senior de transformación digital: con calma, cercanía y escucha activa. NO eres un chatbot, ni un formulario, ni un sistema automático: eres una persona conversando.

IDIOMA Y VARIANTE: responde SIEMPRE en ${idioma}, con naturalidad y registro profesional pero humano. Por defecto, en español usa el español de España (peninsular, «tú/vosotros»). Si sabes de qué país se conecta la persona, adapta la VARIANTE a ese país de forma natural: Argentina o Uruguay → español rioplatense con voseo («vos tenés», «¿cómo andás?»); México → español de México; y de forma análoga para otros países e idiomas (p. ej. portugués de Brasil frente al de Portugal). REGLA QUE MANDA SOBRE TODO: si la persona te escribe en otra variante o te pide que le hables de otra forma, sigue SIEMPRE a la persona por encima del país.

CÓMO ERES:
- Hablas como una persona real, no como una IA. Cuando te presentes, di con naturalidad que eres el Agente de TeGeVe; no te describas como «consultor de TGV» ni recites que eres un sistema.
- Al hablar de la empresa, refiérete SIEMPRE a ella como «TeGeVe» (TGV es solo su nombre corto interno; no lo uses como nombre principal con la persona).
- Transmites experiencia, calma y profesionalidad. Eres cercano, empático y sientes curiosidad genuina por el negocio de quien te habla.
- Respuestas CORTAS y conversacionales: 2 a 4 frases. Nada de bloques largos, listas densas ni discursos de folleto. No uses emojis (el tono de TeGeVe es sobrio).
- Haces UNA pregunta cada vez, no un interrogatorio. Escuchas más de lo que hablas.
- Nunca presionas ni vendes de forma agresiva. Aconsejas; no empujas.

CÓMO LLEVAS LA CONVERSACIÓN (de forma fluida, sin guion rígido ni etiquetas):
1) Te presentas, rompes el hielo y generas confianza.
2) Entiendes el contexto: a qué se dedican, su rol, su día a día.
3) Descubres el problema con preguntas inteligentes y adaptadas a lo que cuentan.
4) Detectas oportunidades aunque no las mencionen.
5) Solo cuando entiendes de verdad, recomiendas una solución de TeGeVe, de forma consultiva.
6) Captas datos con naturalidad, sin presionar y sin pedir muchos a la vez.

CONOCIMIENTO Y LÍMITES:
- Conoces TeGeVe a fondo (ver CONOCIMIENTO abajo). Recomienda solo servicios reales de TeGeVe; nunca inventes servicios, cifras ni clientes.
- Si no sabes algo concreto, pregúntalo o di con naturalidad que lo confirmas con el equipo (info@tegeve.es). Nunca te lo inventes.
- No compares TeGeVe con otras consultoras ni menciones competidores.

DATOS DEL CLIENTE (captación natural):
- Antes de pedir un dato personal, explica brevemente para qué lo quieres (p. ej. "para que Gabriel pueda prepararte algo a medida").
- Nunca insistas si la persona no quiere darlos: sigue ayudando con normalidad igualmente.
- Pide un dato cada vez, cuando encaje en la conversación; nunca varios de golpe.

OBJETIVO:
- Tu meta no es responder preguntas: es entender a la persona, detectar oportunidades, asesorar, generar confianza y, CUANDO TENGA SENTIDO, conseguir una reunión o diagnóstico con Gabriel Grosso (Director de TeGeVe). No fuerces la reunión si aún no hay encaje.

MEMORIA: recuerda todo lo que ya te han contado en esta conversación; no repitas preguntas y construye una imagen clara del cliente.

RESPUESTAS RÁPIDAS: cuando hagas una pregunta con un conjunto pequeño y claro de respuestas posibles (p. ej. la versión de un ERP, sí/no, un sector, un rango de tamaño), ofrece esas opciones para que la persona elija con un clic. Para ello TERMINA el mensaje con una última línea EXACTAMENTE así:
[[opc]] Opción 1 | Opción 2 | Opción 3
Reglas: de 2 a 5 opciones, cada una de 1 a 4 palabras, separadas por « | ». No añadas una opción tipo «otra» (la persona siempre puede escribir libremente). No pongas esa línea si la pregunta es abierta (p. ej. «cuéntame tu reto»). Nunca menciones ni expliques este formato.

TARJETAS EN EL CHAT: puedes acompañar tu respuesta (nunca sustituirla) con tarjetas visuales o una calculadora interactiva dentro del chat. Para ello añade UNA línea propia EXACTAMENTE así:
[[ui]] servicios: clave | clave — tarjetas de servicios (2 o 3). Claves válidas: sap, jde, ia, desarrollo, legacy, assessment, staff, factory, nearshore.
[[ui]] casos: clave | clave — tarjetas de casos reales (2 o 3). Claves válidas: inspecciones, conciliacion, logistica, jde-agro, seguridad-jde, monitor-sap, soporte-sap, bi-consumo, rating, factory-seguros, emv, legacy-pagos, bva-motta.
[[ui]] roi — calculadora interactiva de ahorro por automatización (la persona mueve los controles y ve su número).
Cuándo usarlas: «servicios» si la persona explora qué hacemos o compara varias áreas; «casos» si un caso real refuerza tu recomendación (elige los más afines a su sector o problema); «roi» si hablan de costes, ahorro, productividad o el caso de negocio de automatizar. Máximo UNA línea [[ui]] por mensaje y solo cuando aporte de verdad: la mayoría de tus mensajes NO la llevan. Puede convivir con la línea [[opc]] (cada una en su propia línea). Puedes anunciarla con naturalidad («te dejo aquí dos casos reales»), pero nunca menciones ni expliques el formato.

GUÍA AL SITIO: cuando lo que pregunta la persona está desarrollado en una sección concreta del sitio, después de responder breve y útilmente puedes invitarla a verlo ahí. Escribe la RUTA RELATIVA tal cual, empezando por «/» y SIN el dominio ni formato markdown (correcto: «lo tienes con detalle en /servicios/sap/#casos-relacionados»; NO uses «https://...» ni «[texto](url)»). Usa SOLO rutas y anclas del MAPA DEL SITIO de abajo; nunca inventes una. No enlaces por enlazar: solo cuando aporte valor real y encaje con lo que pide. El enlace complementa tu respuesta, no la sustituye.

AGENDAR REUNIÓN: cuando una reunión con Gabriel Grosso (Director de TeGeVe) aporte valor, propónsela con naturalidad. Para prepararla, pídele su email y acorda con la persona una franja concreta (qué día y a qué hora le viene bien; futuros y laborables, usando la fecha de hoy del contexto). EN CUANTO tengas los tres datos —EMAIL + día + hora—, tu SIGUIENTE mensaje DEBE confirmar y enviar la invitación: confírmale con calidez (dile que incluye el enlace de videollamada) y TERMINA ese mismo mensaje con una última línea EXACTAMENTE así:
[[cita]] nombre=<nombre de la persona>; email=<su email>; dia=<lo que dijo la persona sobre el día, TAL CUAL: «el viernes», «mañana», «el 10 de julio»…>; hora=<HH:MM>
Reglas: en el campo «dia» pon LITERALMENTE la referencia de la persona; NO calcules tú la fecha del calendario (el sistema la calcula). Al confirmar en el texto, repite el día con las palabras de la persona (p. ej. «el viernes a las 12:00»), sin decir un número de día del mes. NO pospongas el envío para seguir preguntando otras cosas (empresa, sector…); pregúntalas DESPUÉS. El email es OBLIGATORIO; incluye el nombre si lo sabes; no inventes el email; no envíes la cita hasta tener email + día + hora. Emite esa línea UNA sola vez. Nunca menciones ni expliques ese formato; la persona no debe ver esa línea.

WHATSAPP: si la persona prefiere seguir por WhatsApp (o lo pide), dale el enlace directo del WhatsApp de Gabriel escribiéndolo tal cual, sin markdown: https://wa.me/34682255515 — no dictes el número suelto en el texto; da solo el enlace.

CONOCIMIENTO SOBRE TEGEVE:
${AGENT_KB}

MAPA DEL SITIO (rutas públicas + anclas para enlazar a la sección exacta):
${SITE_MAP}`;
}

// Llamada a Claude (Anthropic Messages API). `system` es un array de bloques
// (el primero lleva cache_control para abaratar los tokens en cada turno).
// Devuelve el texto, o "" si el modelo declina; lanza si la API falla.
async function callAnthropic(env, system, messages, maxTokens) {
  const body = JSON.stringify({ model: AGENT_MODEL, max_tokens: maxTokens || 1024, system, messages });
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(AGENT_API, {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body,
    });
    if (r.ok) {
      const d = await r.json();
      if (d.stop_reason === "refusal") return "";
      return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    }
    // 429 (rate limit) y 5xx (sobrecarga) son transitorios: reintenta una vez.
    if (attempt === 0 && (r.status === 429 || r.status >= 500)) { await new Promise((res) => setTimeout(res, 400)); continue; }
    throw new Error("anthropic " + r.status + " " + (await r.text()).slice(0, 300));
  }
}

// Igual que callAnthropic pero en STREAMING: entrega el texto por onDelta según
// llega (SSE de la API de Anthropic) y devuelve el texto completo al terminar.
async function callAnthropicStream(env, system, messages, maxTokens, onDelta) {
  const r = await fetch(AGENT_API, {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: AGENT_MODEL, max_tokens: maxTokens || 1024, system, messages, stream: true }),
  });
  if (!r.ok) throw new Error("anthropic " + r.status + " " + (await r.text()).slice(0, 300));
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const ev = JSON.parse(line.slice(5).trim());
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta" && ev.delta.text) {
          full += ev.delta.text;
          try { await onDelta(ev.delta.text); } catch (e) { /* el render nunca corta el stream */ }
        }
      } catch (e) { /* keep-alives y eventos no-JSON se ignoran */ }
    }
  }
  return full.trim();
}

// ---- Persistencia en KV (degrada a memoria nula si no hay binding) ----
const leadKey = (id) => "lead:" + id;
async function loadLead(env, id) {
  if (!env.TEVI_AGENT_KV) return null;
  try { return await env.TEVI_AGENT_KV.get(leadKey(id), "json"); } catch { return null; }
}
async function saveLead(env, id, rec) {
  if (!env.TEVI_AGENT_KV) return;
  try { await env.TEVI_AGENT_KV.put(leadKey(id), JSON.stringify(rec)); } catch { /* no romper la conversación */ }
}
function newLead(id, lang, now) {
  return {
    id, lang,
    fecha: new Date(now).toISOString().slice(0, 10),
    hora: new Date(now).toISOString().slice(11, 19),
    createdAt: now, updatedAt: now, durationMs: 0, geoCountry: "",
    status: "ANONIMO",                 // pasa a IDENTIFICADO al captar email/teléfono/nombre
    transcript: [],                    // TODO lo dicho: {role, content, ts}
    summary: "", summaryUpTo: 0,       // resumen rodante + índice ya resumido
    datos: { nombre: "", empresa: "", cargo: "", email: "", telefono: "", ciudad: "", pais: "", sector: "" },
    report: null, turns: 0, emailed: false, cita: null,
    alerted: false, geoOrg: "", page: "", followedUp: false,
  };
}

// Captura heurística barata (sin gastar tokens): email y teléfono del usuario.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
function captureContact(rec, text) {
  const em = text.match(EMAIL_RE); if (em && !rec.datos.email) rec.datos.email = em[0];
  const ph = text.match(PHONE_RE); if (ph && !rec.datos.telefono) rec.datos.telefono = ph[1].trim();
  if (rec.datos.email || rec.datos.telefono || rec.datos.nombre) rec.status = "IDENTIFICADO";
}

// Resumen rodante: si la conversación se alarga, comprime lo más antiguo en
// `summary` y deja solo los últimos turnos verbatim (acota los tokens enviados).
async function summarizeIfNeeded(env, rec) {
  const live = rec.transcript.length - rec.summaryUpTo;
  if (live <= AGENT_SUMMARIZE_AT) return;
  const cut = rec.transcript.length - 8; // conservamos los 8 últimos
  const chunk = rec.transcript.slice(rec.summaryUpTo, cut)
    .map((m) => (m.role === "user" ? "Cliente: " : "Yo: ") + m.content).join("\n");
  try {
    const sum = await callAnthropic(
      env,
      [{ type: "text", text: "Resume en español, en pocas frases y en tercera persona, los puntos clave de esta parte de una conversación comercial (contexto del cliente, problema, oportunidades, datos y compromisos). Conserva nombres, empresa, sector y cifras." }],
      [{ role: "user", content: (rec.summary ? "Resumen previo:\n" + rec.summary + "\n\n" : "") + "Conversación a integrar:\n" + chunk }],
      400
    );
    if (sum) { rec.summary = sum; rec.summaryUpTo = cut; }
  } catch { /* si falla, seguimos sin resumir */ }
}

// Construye los mensajes que se envían al modelo: ventana reciente, empezando
// siempre por un turno de usuario (la API lo exige).
function buildWindow(rec) {
  let win = rec.transcript.slice(rec.summaryUpTo).slice(-AGENT_WINDOW * 2)
    .map((m) => ({ role: m.role, content: m.content }));
  // La API exige empezar por un turno de usuario; si el primero es del agente
  // (p. ej. una apertura proactiva), se antepone un turno neutro en vez de perderlo.
  if (win.length && win[0].role !== "user") win.unshift({ role: "user", content: "(La persona está navegando por el sitio.)" });
  return win;
}

async function handleTeviAgent(request, env, ctx) {
  const origin = request.headers.get("Origin") || "";
  const h = corsHeaders(origin);
  if (request.method === "OPTIONS") return new Response(null, { headers: h });
  if (request.method !== "POST") return json({ error: "Use POST." }, 405, h);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400, h); }

  const sessionId = String(body.sessionId || "").trim().slice(0, 80) || "anon-" + Date.now();
  const lang = ({ es: 1, en: 1, pt: 1, it: 1, fr: 1, de: 1 })[body.lang] ? body.lang : "es";
  const action = body.action === "end" ? "end" : body.action === "opener" ? "opener" : "chat";
  const now = Date.now();
  // País del visitante por Cloudflare (XX = desconocido, T1 = Tor).
  const geoCountry = ((request.cf && request.cf.country) || request.headers.get("CF-IPCountry") || "").toUpperCase();

  // Carga o crea el registro (con respaldo del historial que envíe el cliente,
  // por si no hay KV: así el agente sigue teniendo memoria de la sesión).
  let rec = (await loadLead(env, sessionId)) || newLead(sessionId, lang, now);
  rec.lang = lang;
  if (geoCountry && geoCountry !== "XX" && geoCountry !== "T1") rec.geoCountry = geoCountry;
  // Organización de la IP (red corporativa): la da Cloudflare gratis en cada
  // petición; se descartan ISPs residenciales y nubes (mayormente bots/VPN).
  const asOrg = String((request.cf && request.cf.asOrganization) || "").trim();
  const ISP_RE = /telef[oó]nica|movistar|vodafone|orange|masm[oó]vil|digi|jazztel|euskaltel|yoigo|lowi|pepephone|adamo|avatel|finetwork|claro|telecom|telmex|tigo|entel|personal|comcast|verizon|at&t|t-mobile|telekom|bouygues|sfr|iliad|free|proximus|swisscom|telia|kpn|bt group|sky|virgin|liberty|charter|cox|spectrum|residential|wireless|mobile|broadband|communications|cable|cloudflare|google|amazon|aws|microsoft|azure|apple|icloud|akamai|fastly|ovh|hetzner|digitalocean|linode|vultr|oracle|m247|datacamp|vpn|hosting|server|proxy/i;
  if (asOrg && !ISP_RE.test(asOrg)) rec.geoOrg = asOrg;
  // Página del sitio en la que está la persona (la envía el cliente).
  const pageNow = String(body.page || "").slice(0, 300);
  if (pageNow) rec.page = pageNow;
  if (!rec.transcript.length && Array.isArray(body.history)) {
    rec.transcript = body.history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, AGENT_MAXLEN), ts: now }));
  }

  // Si no hay clave de Claude, degradamos con elegancia (nunca rompe el sitio).
  if (!env.ANTHROPIC_API_KEY) {
    const msg = {
      es: "Ahora mismo estoy poniéndome en marcha. Mientras tanto, cuéntame tu reto a info@tegeve.es y te respondemos enseguida.",
      en: "I'm just getting set up. In the meantime, tell us your challenge at info@tegeve.es and we'll get right back to you.",
      pt: "Estou a preparar tudo agora mesmo. Enquanto isso, conte-nos o seu desafio em info@tegeve.es e respondemos logo.",
      it: "Mi sto preparando proprio ora. Nel frattempo, scrivici la tua sfida a info@tegeve.es e ti rispondiamo subito.",
      fr: "Je suis en train de me préparer. En attendant, écrivez-nous votre défi à info@tegeve.es et nous revenons vers vous très vite.",
      de: "Ich werde gerade eingerichtet. Schreiben Sie uns in der Zwischenzeit Ihre Herausforderung an info@tegeve.es und wir melden uns umgehend.",
    };
    return json({ reply: msg[lang] || msg.es, sessionId, degraded: true }, 200, h);
  }

  try {
    if (action === "end") {
      const report = await generateReport(env, rec, now);
      return json({ ok: true, sessionId, report }, 200, h);
    }

    // Apertura proactiva: saludo breve y específico de la página actual (el
    // cliente la dispara una sola vez por sesión, tras un rato de navegación).
    if (action === "opener") {
      const sys = [
        { type: "text", text: agentSystem(lang), cache_control: { type: "ephemeral" } },
        { type: "text", text: "La persona lleva un rato mirando la página " + (rec.page || "/") + " del sitio y AÚN NO ha abierto el chat. Genera SOLO una apertura proactiva de 1-2 frases: saluda con naturalidad y engancha con algo específico del contenido de ESA página (usa el MAPA DEL SITIO para saber de qué trata), terminando con una pregunta ligera. No digas que la estás observando ni resultes intrusivo. Puedes añadir respuestas rápidas con la línea [[opc]]." },
      ];
      let opener = await callAnthropic(env, sys, [{ role: "user", content: "(genera la apertura proactiva)" }], 300) || "";
      let ochips = [];
      const oom = opener.match(/^[ \t]*\[\[opc\]\][ \t]*(.+?)[ \t]*$/im);
      if (oom) { ochips = oom[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 5); opener = opener.replace(oom[0], ""); }
      opener = opener.replace(/^[ \t]*\[\[(?:opc|cita|ui)\]\][^\n]*$/gim, "").replace(/\n{3,}/g, "\n\n").trim();
      if (!opener) return json({ reply: "", sessionId }, 200, h);
      rec.transcript.push({ role: "assistant", content: opener, ts: now });
      rec.updatedAt = Date.now();
      await saveLead(env, sessionId, rec);
      return json({ reply: opener, chips: ochips, sessionId, geo: rec.geoCountry }, 200, h);
    }

    const message = String(body.message || "").trim().slice(0, AGENT_MAXLEN);
    if (!message) return json({ error: "Empty message." }, 400, h);

    rec.transcript.push({ role: "user", content: message, ts: now });
    captureContact(rec, message);
    await summarizeIfNeeded(env, rec);

    // Bloque de sistema: persona+KB estable (cacheado) + contexto volátil aparte.
    const geoHint = rec.geoCountry
      ? "La persona parece conectarse desde " + countryName(rec.geoCountry) + " (" + rec.geoCountry + "). Adapta la variante del idioma a ese país de forma natural, salvo que la persona escriba o pida otra cosa.\n\n"
      : "";
    let dateHint;
    try {
      const _iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const _dow = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long" }).format(new Date());
      dateHint = "Hoy es " + _dow + " " + _iso + " (hora de España). Usa el día de la semana y esta fecha para convertir referencias como «el viernes» o «mañana» a una fecha AAAA-MM-DD concreta y futura, y para que el día que menciones coincida con la fecha.\n\n";
    } catch (e) {
      dateHint = "Hoy es " + new Date().toISOString().slice(0, 10) + " (úsalo para proponer días concretos y futuros).\n\n";
    }
    const pageHint = rec.page ? "La persona está ahora mismo en la página " + rec.page + " del sitio.\n\n" : "";
    const orgHint = rec.geoOrg
      ? "La conexión llega desde la red de «" + rec.geoOrg + "». Si claramente es una empresa (no un proveedor de internet), tenlo en cuenta con tacto y sin darlo por seguro: orienta ejemplos a su posible sector si encaja; no digas «veo que os conectáis desde…» salvo que la persona ya haya nombrado su empresa.\n\n"
      : "";
    const ctx = dateHint + pageHint + orgHint + geoHint + (rec.summary ? "Resumen de la conversación hasta ahora:\n" + rec.summary + "\n\n" : "") +
      "Datos del cliente conocidos: " + JSON.stringify(rec.datos) + ". No vuelvas a pedir los que ya tienes.";
    const system = [
      { type: "text", text: agentSystem(lang), cache_control: { type: "ephemeral" } },
      { type: "text", text: ctx },
    ];

    // Postprocesado común (con y sin streaming): marcadores, cita, persistencia y alerta.
    const doFinish = async (rawReply) => {
      let reply = (rawReply || "").trim() ||
        (lang === "es" ? "Perdona, ¿me lo cuentas con otras palabras?" : "Sorry, could you put that another way?");

      // Respuestas rápidas (chips): línea «[[opc]] a | b | c», esté donde esté.
      let chips = [];
      const om = reply.match(/^[ \t]*\[\[opc\]\][ \t]*(.+?)[ \t]*$/im);
      if (om) {
        chips = om[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 5);
        reply = reply.replace(om[0], "");
      }

      // Cita/reunión: línea «[[cita]] nombre=..; email=..; dia=..; hora=..», ídem.
      const cm = reply.match(/^[ \t]*\[\[cita\]\][ \t]*(.+?)[ \t]*$/im);
      if (cm) {
        const f = {};
        cm[1].split(";").forEach((p) => { const i = p.indexOf("="); if (i > 0) f[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim(); });
        reply = reply.replace(cm[0], "");
        if (f.email) {
          rec.datos.email = rec.datos.email || f.email;
          if (f.nombre) rec.datos.nombre = rec.datos.nombre || f.nombre;
          rec.status = "IDENTIFICADO";
        }
        await sendCita(env, rec, { nombre: f.nombre, email: f.email, dia: f.dia, fecha: f.fecha, hora: f.hora });
      }

      // UI generativa: línea «[[ui]] roi» o «[[ui]] servicios|casos: clave | clave»
      // → el cliente pinta tarjetas o la calculadora bajo el mensaje.
      let ui = null;
      const um = reply.match(/^[ \t]*\[\[ui\]\][ \t]*(.+?)[ \t]*$/im);
      if (um) {
        reply = reply.replace(um[0], "");
        const spec = um[1].trim();
        if (/^roi\b/i.test(spec)) ui = { type: "roi" };
        else {
          const mm = spec.match(/^(servicios|casos)\s*:\s*(.+)$/i);
          if (mm) {
            const keys = mm[2].split("|").map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 3);
            if (keys.length) ui = { type: mm[1].toLowerCase(), keys };
          }
        }
      }
      // Red de seguridad: si quedara algún marcador suelto, nunca debe verlo la persona.
      reply = reply.replace(/^[ \t]*\[\[(?:opc|cita|ui)\]\][^\n]*$/gim, "").replace(/\n{3,}/g, "\n\n").trim();

      rec.transcript.push({ role: "assistant", content: reply, ts: Date.now() });
      rec.turns = rec.transcript.filter((m) => m.role === "user").length;
      rec.updatedAt = Date.now();
      rec.durationMs = rec.updatedAt - rec.createdAt;
      // Alerta de lead caliente al identificarse (email/teléfono) o agendar reunión.
      if (rec.status === "IDENTIFICADO" && !rec.alerted) await sendHotAlert(env, rec);
      await saveLead(env, sessionId, rec);
      return { reply, chips, ui };
    };

    // STREAMING (SSE): el texto va llegando al navegador token a token; al final
    // se envía un evento `done` con la respuesta limpia y las respuestas rápidas.
    if (body.stream === true) {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const enc = new TextEncoder();
      const emit = (o) => writer.write(enc.encode("data: " + JSON.stringify(o) + "\n\n")).catch(() => {});
      const work = (async () => {
        try {
          const raw = await callAnthropicStream(env, system, buildWindow(rec), 1024, (t) => emit({ d: t }));
          const fin = await doFinish(raw);
          await emit({ done: true, reply: fin.reply, chips: fin.chips, ui: fin.ui, sessionId, geo: rec.geoCountry });
        } catch (err) {
          await emit({ error: "Agent unavailable.", detail: String(err).slice(0, 120) });
        }
        try { await writer.close(); } catch (e) { /* ya cerrado */ }
      })();
      if (ctx && ctx.waitUntil) ctx.waitUntil(work);
      return new Response(readable, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...h } });
    }

    const fin = await doFinish(await callAnthropic(env, system, buildWindow(rec), 1024));
    return json({ reply: fin.reply, chips: fin.chips, ui: fin.ui, sessionId, geo: rec.geoCountry }, 200, h);
  } catch (err) {
    return json({ error: "Agent unavailable.", detail: String(err).slice(0, 200) }, 502, h);
  }
}

// Genera el INFORME COMERCIAL para Gabriel al cerrar la conversación y lo guarda
// en KV. Devuelve el objeto del informe (o null si no hay material suficiente).
async function generateReport(env, rec, now) {
  if (rec.turns < 2 && rec.transcript.filter((m) => m.role === "user").length < 2) return null;
  const full = rec.transcript.map((m) => (m.role === "user" ? "Cliente: " : "Asesor: ") + m.content).join("\n");
  const schema = `Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin texto alrededor) con estas claves exactas, en español, usando "" o "sin dato" cuando no se sepa:
{"nombre":"","empresa":"","cargo":"","email":"","telefono":"","ciudad":"","pais":"","sector":"","dolorPrincipal":"","objetivo":"","tecnologiasMencionadas":"","erp":"","sistemas":"","servicioRecomendado":"","nivelOportunidad":"alto|medio|bajo","urgencia":"alta|media|baja","probabilidadCierre":"alta|media|baja","intencionDetectada":"","oportunidadesDetectadas":"","resumenEjecutivo":"","accionesRecomendadas":"","fechaPropuestaReunion":"","horarioPropuesto":"","observaciones":"","proximoPaso":""}`;
  let report = null;
  try {
    const out = await callAnthropic(
      env,
      [{ type: "text", text: "Eres un analista comercial de TeGeVe. A partir de la conversación, redacta el informe para Gabriel (Director de TeGeVe). Sé fiel a lo dicho; no inventes datos. " + schema }],
      [{ role: "user", content: (rec.summary ? "Resumen:\n" + rec.summary + "\n\n" : "") + "Conversación completa:\n" + full }],
      1200
    );
    const m = out && out.match(/\{[\s\S]*\}/);
    if (m) { try { report = JSON.parse(m[0]); } catch { report = { raw: out }; } }
    else report = { raw: out || "" };
  } catch (e) { report = { error: String(e).slice(0, 200) }; }

  // Mezcla los datos ya captados heurísticamente (no se pierden).
  if (report && typeof report === "object") {
    for (const k of ["nombre", "empresa", "cargo", "email", "telefono", "ciudad", "pais", "sector"]) {
      if (rec.datos[k] && (!report[k] || report[k] === "sin dato")) report[k] = rec.datos[k];
    }
  }
  rec.report = report;
  rec.status = (report && (report.email || report.telefono || report.nombre)) ? "IDENTIFICADO" : rec.status;
  rec.updatedAt = now; rec.durationMs = now - rec.createdAt;
  await saveLead(env, rec.id, rec);
  await dispatchLead(env, rec); // hook de integraciones (CRM/email/calendar...) — no-op por ahora
  return report;
}

// ---- Envío del lead por email (la conversación completa + el informe) ----
const LEAD_TO_DEFAULT = "ggrosso@tegeve.es";
const ESC = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const REPORT_LABELS = {
  nombre: "Nombre", empresa: "Empresa", cargo: "Cargo", email: "Email", telefono: "Teléfono",
  ciudad: "Ciudad", pais: "País", sector: "Sector", dolorPrincipal: "Dolor principal",
  objetivo: "Objetivo", tecnologiasMencionadas: "Tecnologías mencionadas", erp: "ERP", sistemas: "Sistemas",
  servicioRecomendado: "Servicio recomendado", nivelOportunidad: "Nivel de oportunidad", urgencia: "Urgencia",
  probabilidadCierre: "Probabilidad de cierre", intencionDetectada: "Intención detectada",
  oportunidadesDetectadas: "Oportunidades detectadas", resumenEjecutivo: "Resumen ejecutivo",
  accionesRecomendadas: "Acciones recomendadas", fechaPropuestaReunion: "Fecha propuesta de reunión",
  horarioPropuesto: "Horario propuesto", observaciones: "Observaciones", proximoPaso: "Próximo paso",
};
function emailHtml(rec) {
  const r = rec.report || {};
  const mins = Math.round((rec.durationMs || 0) / 60000);
  let rows = "";
  for (const k in REPORT_LABELS) if (r[k]) rows += `<tr><td style="padding:5px 10px;border:1px solid #eee;background:#fafafa;font-weight:bold;white-space:nowrap;vertical-align:top">${REPORT_LABELS[k]}</td><td style="padding:5px 10px;border:1px solid #eee">${ESC(r[k])}</td></tr>`;
  if (r.raw) rows += `<tr><td style="padding:5px 10px;border:1px solid #eee;font-weight:bold">Informe</td><td style="padding:5px 10px;border:1px solid #eee"><pre style="white-space:pre-wrap;font:inherit">${ESC(r.raw)}</pre></td></tr>`;
  const conv = rec.transcript.map((m) => `<p style="margin:4px 0"><b style="color:${m.role === "user" ? "#111" : "#E4010A"}">${m.role === "user" ? "Cliente" : "Agente"}:</b> ${ESC(m.content)}</p>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:680px">
  <h2 style="color:#E4010A;margin:0 0 4px">Tevi Agent — lead ${ESC(rec.status)}</h2>
  <p style="color:#555;margin:0 0 16px">Sesión <b>${ESC(rec.id)}</b> · ${ESC(rec.fecha)} ${ESC(rec.hora)} · ${mins} min · idioma ${ESC(rec.lang)}${rec.geoCountry ? " · IP " + ESC(countryName(rec.geoCountry)) : ""}</p>
  ${rec.cita && rec.cita.sent ? `<p style="margin:0 0 14px;color:#E4010A"><b>Reunión enviada:</b> ${ESC(rec.cita.summary)} — ${ESC(rec.cita.fecha)} ${ESC(rec.cita.hora)} (España) · ${ESC(rec.cita.email)}</p>` : ""}
  <h3 style="margin:16px 0 6px">Informe comercial</h3>
  <table style="border-collapse:collapse;width:100%;font-size:14px">${rows || "<tr><td>Sin datos suficientes</td></tr>"}</table>
  <h3 style="margin:20px 0 6px">Conversación completa</h3>
  <div style="font-size:14px;line-height:1.5">${conv}</div>
</div>`;
}
function emailText(rec) {
  const r = rec.report || {};
  let s = `TEVI AGENT — lead ${rec.status}\nSesión ${rec.id} · ${rec.fecha} ${rec.hora} · idioma ${rec.lang}${rec.geoCountry ? " · IP " + countryName(rec.geoCountry) : ""}\n\nINFORME COMERCIAL:\n`;
  for (const k in REPORT_LABELS) if (r[k]) s += `- ${REPORT_LABELS[k]}: ${r[k]}\n`;
  if (r.raw) s += r.raw + "\n";
  s += `\nCONVERSACIÓN COMPLETA:\n` + rec.transcript.map((m) => (m.role === "user" ? "Cliente: " : "Agente: ") + m.content).join("\n");
  return s;
}
// Manda el email. Usa Resend si hay RESEND_API_KEY; si no, FormSubmit (sin clave,
// requiere una activación única del correo). El fallo de email nunca rompe nada.
async function sendLeadEmail(env, rec) {
  if (rec.emailed) return;
  const to = env.LEAD_EMAIL || LEAD_TO_DEFAULT;
  const empresa = (rec.report && rec.report.empresa) || rec.datos.empresa || "lead";
  const subject = `Tevi Agent · ${rec.status} · ${empresa} · ${rec.fecha}`;
  try {
    if (env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.RESEND_FROM || "Tevi Agent <onboarding@resend.dev>", to: [to], subject, html: emailHtml(rec), text: emailText(rec) }),
      });
      if (r.ok) rec.emailed = true;
      else console.error("lead email (resend) failed", r.status, await r.text().catch(() => "")); // visible en `wrangler tail`
    } else {
      const r = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(to), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ _subject: subject, _template: "box", sesion: rec.id, estado: rec.status, fecha: rec.fecha + " " + rec.hora, informe_y_conversacion: emailText(rec) }),
      });
      // FormSubmit responde 200 aunque el buzón no esté activado: hay que mirar el flag success.
      const j = await r.json().catch(() => ({}));
      if (r.ok && (j.success === true || j.success === "true")) rec.emailed = true;
      else console.error("lead email (formsubmit) not delivered", r.status, JSON.stringify(j).slice(0, 200));
    }
  } catch (e) { console.error("lead email error", String(e).slice(0, 200)); /* el email nunca rompe la conversación */ }
}

// ---- Email de SEGUIMIENTO a la persona (resumen personalizado de su charla) ----
// Se envía UNA vez por sesión, al cerrar, solo si dejó su email y hubo conversación
// real. Lo redacta el modelo en el idioma de la persona; la firma la pone la plantilla.
const LANG_NAMES = { es: "español", en: "inglés", pt: "portugués de Brasil", it: "italiano", fr: "francés", de: "alemán" };
async function sendFollowUpEmail(env, rec) {
  if (rec.followedUp) return;
  const email = (rec.datos.email || "").trim();
  if (!email || !EMAIL_RE.test(email) || !env.RESEND_API_KEY) return;
  if (rec.transcript.filter((m) => m.role === "user").length < 2) return;
  const idioma = LANG_NAMES[rec.lang] || "español";
  const full = rec.transcript.map((m) => (m.role === "user" ? "Cliente: " : "Agente: ") + m.content).join("\n");
  const citaInfo = rec.cita && rec.cita.sent
    ? "Ya hay una reunión agendada y enviada por email: " + rec.cita.fecha + " a las " + rec.cita.hora + " (hora de España), con la invitación y el enlace de videollamada en su bandeja."
    : "No hay reunión agendada todavía.";
  const sys = "Escribe el email de seguimiento que el Agente de TeGeVe envía a la persona justo después de su conversación en la web de TeGeVe (consultora tecnológica). IDIOMA: " + idioma + ", en la variante que usó la persona. TONO: sobrio, cercano y profesional; sin emojis; en primera persona del plural («nosotros», TeGeVe). CONTENIDO: 1) agradece brevemente la conversación; 2) resume en 2 o 3 frases lo que nos contó y lo que le recomendamos; 3) si encaja, incluye 1 o 2 enlaces útiles del sitio escribiéndolos como https://tegevem.es + ruta del MAPA DEL SITIO (nunca inventes rutas); 4) cierra con el próximo paso: si ya hay reunión agendada, confírmala con su día y hora; si no, invita a responder a este email o a escribir por WhatsApp: https://wa.me/34682255515. REGLAS: sé fiel a la conversación; no inventes datos, precios ni plazos; no añadas despedida ni firma (se añaden solas); no digas que eres una IA. Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto alrededor: {\"asunto\":\"\",\"cuerpo\":\"\"} — el cuerpo en texto plano con saltos de línea entre párrafos.\n\nMAPA DEL SITIO:\n" + SITE_MAP;
  let mail = null;
  try {
    const out = await callAnthropic(env, [{ type: "text", text: sys }],
      [{ role: "user", content: "Datos de la persona: " + JSON.stringify(rec.datos) + "\n" + citaInfo + "\n\nConversación:\n" + full }], 700);
    const m = out && out.match(/\{[\s\S]*\}/);
    if (m) mail = JSON.parse(m[0]);
  } catch (e) { console.error("follow-up gen", String(e).slice(0, 160)); }
  if (!mail || !mail.asunto || !mail.cuerpo) return;
  const cuerpo = String(mail.cuerpo).trim();
  const bodyHtml = ESC(cuerpo)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#E4010A">$1</a>')
    .replace(/\n/g, "<br>");
  const firma = { es: "Director de TeGeVe", en: "Director, TeGeVe", pt: "Diretor da TeGeVe", it: "Direttore di TeGeVe", fr: "Directeur de TeGeVe", de: "Direktor von TeGeVe" };
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px;line-height:1.55;font-size:15px">'
    + "<p>" + bodyHtml + "</p>"
    + '<p style="margin:22px 0 0">Gabriel Grosso<br><span style="color:#555">' + (firma[rec.lang] || firma.es) + '</span> · <a href="https://tegevem.es" style="color:#E4010A">tegevem.es</a></p></div>';
  const text = cuerpo + "\n\nGabriel Grosso\n" + (firma[rec.lang] || firma.es) + " · https://tegevem.es";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RESEND_FROM || "Tevi Agent <onboarding@resend.dev>",
        to: [email], reply_to: "ggrosso@tegeve.es",
        subject: String(mail.asunto).slice(0, 150), html, text,
      }),
    });
    if (r.ok) rec.followedUp = true;
    else console.error("follow-up email failed", r.status, await r.text().catch(() => ""));
  } catch (e) { console.error("follow-up email", String(e).slice(0, 160)); }
}

// ---- Invitación de reunión (.ics) enviada a Gabriel y a la persona ----
// UTF-8 → base64 (btoa solo maneja Latin1; «Reunión» lleva acento).
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
const VTZ_MADRID = [
  "BEGIN:VTIMEZONE", "TZID:Europe/Madrid",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");
const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
function icsLocal(d) { return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + "T" + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + "00"; }
function icsEsc(s) { return String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n"); }
function buildIcs(summary, nombre, email, fecha, hora, sessionId, meetUrl) {
  const [Y, M, D] = fecha.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const start = new Date(Date.UTC(Y, M - 1, D, h, mi));      // aritmética en UTC, se emite como hora local Madrid
  const end = new Date(start.getTime() + 45 * 60000);        // reunión de 45 min
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TeGeVe//Tevi Agent//ES", "CALSCALE:GREGORIAN", "METHOD:REQUEST",
    VTZ_MADRID,
    "BEGIN:VEVENT",
    "UID:cita-" + sessionId + "-" + Date.now() + "@tegevem.es",
    "DTSTAMP:" + icsLocal(new Date()) + "Z",
    "DTSTART;TZID=Europe/Madrid:" + icsLocal(start),
    "DTEND;TZID=Europe/Madrid:" + icsLocal(end),
    "SUMMARY:" + icsEsc(summary),
    "LOCATION:" + icsEsc(meetUrl),
    "DESCRIPTION:" + icsEsc("Videollamada: " + meetUrl),
    "URL:" + meetUrl,
    "ORGANIZER;CN=Gabriel Grosso:mailto:ggrosso@tegeve.es",
    "ATTENDEE;CN=" + icsEsc(nombre || "Invitado") + ";ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:" + email,
    "ATTENDEE;CN=Gabriel Grosso;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:ggrosso@tegeve.es",
    "STATUS:CONFIRMED", "SEQUENCE:0", "TRANSP:OPAQUE",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
// Resolución FIABLE de la fecha (el modelo pasa lo que dijo la persona; el día
// exacto lo calcula el worker, que sí sabe la fecha de hoy en España).
function madridTodayParts() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(new Date());
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: +g("year"), m: +g("month"), d: +g("day"), dow: DOW[g("weekday")] };
}
function addDaysISO(y, m, d, n) { const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); }
const _WEEKDAYS = { domingo: 0, lunes: 1, martes: 2, "miércoles": 3, miercoles: 3, jueves: 4, viernes: 5, "sábado": 6, sabado: 6 };
const _MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
function _isoFuture(y, mo, d, t) {
  const cand = Date.UTC(y, mo - 1, d), today = Date.UTC(t.y, t.m - 1, t.d);
  return new Date(cand < today ? Date.UTC(y + 1, mo - 1, d) : cand).toISOString().slice(0, 10);
}
function resolveDate(raw) {
  let t; try { t = madridTodayParts(); } catch (e) { const n = new Date(); t = { y: n.getUTCFullYear(), m: n.getUTCMonth() + 1, d: n.getUTCDate(), dow: n.getUTCDay() }; }
  const s = String(raw || "").toLowerCase().trim();
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return _isoFuture(+m[1], +m[2], +m[3], t);
  m = s.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)/); if (m && _MONTHS[m[2]]) return _isoFuture(t.y, _MONTHS[m[2]], +m[1], t);
  m = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/); if (m) { let y = m[3] ? +m[3] : t.y; if (String(m[3] || "").length === 2) y = 2000 + +m[3]; return _isoFuture(y, +m[2], +m[1], t); }
  if (/pasado\s*mañana/.test(s)) return addDaysISO(t.y, t.m, t.d, 2);
  if (/\bmañana\b/.test(s)) return addDaysISO(t.y, t.m, t.d, 1);
  if (/\bhoy\b/.test(s)) return addDaysISO(t.y, t.m, t.d, 0);
  for (const k in _WEEKDAYS) { if (s.includes(k)) { let n = (_WEEKDAYS[k] - t.dow + 7) % 7; if (n === 0) n = 7; return addDaysISO(t.y, t.m, t.d, n); } }
  return addDaysISO(t.y, t.m, t.d, 2); // por defecto, hoy + 2 días
}

// Manda la invitación (a Gabriel y a la persona). Una sola vez por sesión.
async function sendCita(env, rec, cita) {
  if (rec.cita && rec.cita.sent) return;
  const email = String(cita.email || "").trim();
  if (!EMAIL_RE.test(email)) return;
  const nombre = String(cita.nombre || rec.datos.nombre || "").trim();
  const fecha = resolveDate(cita.dia || cita.fecha);   // el worker calcula el día exacto (el modelo no es fiable con fechas)
  let hora = cita.hora;
  if (!/^\d{1,2}:\d{2}$/.test(hora || "")) hora = "10:00";
  const summary = "Reunión con " + (nombre ? nombre + " y TeGeVe" : "TeGeVe");
  // Enlace de videollamada: sala fija de Gabriel (MEETING_URL) o una sala Jitsi única por reunión.
  const meetUrl = env.MEETING_URL || ("https://meet.jit.si/TeGeVe-" + String(rec.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) + "-" + Date.now().toString(36));
  const ics = buildIcs(summary, nombre, email, fecha, hora, rec.id, meetUrl);
  const to = env.LEAD_EMAIL || LEAD_TO_DEFAULT;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111"><p>Invitación de reunión:</p><h2 style="color:#E4010A;margin:4px 0">${ESC(summary)}</h2><p>${ESC(fecha)} · ${ESC(hora)} (hora de España) · 45 min.</p><p>Videollamada: <a href="${ESC(meetUrl)}">${ESC(meetUrl)}</a></p><p>Adjuntamos la cita (<b>reunion.ics</b>) para añadirla al calendario.</p></div>`;
  const text = summary + "\n" + fecha + " " + hora + " (hora de España) · 45 min\nVideollamada: " + meetUrl + "\nCita adjunta: reunion.ics";
  try {
    if (env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.RESEND_FROM || "Tevi Agent <onboarding@resend.dev>",
          to: [to, email], subject: summary, html, text,
          attachments: [{ filename: "reunion.ics", content: b64utf8(ics), content_type: "text/calendar; method=REQUEST; charset=utf-8" }],
        }),
      });
      if (r.ok) rec.cita = { sent: true, nombre, email, fecha, hora, summary, meetUrl };
      else console.error("cita (resend) failed", r.status, await r.text().catch(() => ""));
    } else {
      console.error("cita: sin RESEND_API_KEY, no se envía la invitación");
    }
  } catch (e) { console.error("cita error", String(e).slice(0, 200)); }
  await saveLead(env, rec.id, rec);
}

// ---- Alerta de LEAD CALIENTE en tiempo real (mientras la persona sigue en la web) ----
// Email inmediato a Gabriel vía Resend y, si está configurado el secreto
// TEAMS_WEBHOOK_URL (Workflows de Teams), tarjeta en el canal. Una vez por sesión.
async function sendHotAlert(env, rec) {
  if (rec.alerted) return;
  rec.alerted = true;
  const motivo = rec.cita && rec.cita.sent ? "reunión agendada" : "datos de contacto captados";
  const lastUser = [...rec.transcript].reverse().find((m) => m.role === "user");
  const quien = [rec.datos.nombre, rec.datos.empresa].filter(Boolean).join(" · ") || "Lead sin nombre todavía";
  const contacto = rec.datos.email || rec.datos.telefono || "sin contacto directo aún";
  const lineas = [
    quien + " — " + contacto,
    [rec.geoCountry ? "País: " + countryName(rec.geoCountry) : "", rec.geoOrg ? "Red: " + rec.geoOrg : ""].filter(Boolean).join(" · "),
    rec.page ? "Página: " + rec.page : "",
    lastUser ? "Último mensaje: «" + lastUser.content.slice(0, 180) + "»" : "",
    "Sesión " + rec.id + " · La persona sigue en la web AHORA.",
  ].filter(Boolean);
  const subject = "LEAD CALIENTE en tegevem.es — " + motivo;
  if (env.TEAMS_WEBHOOK_URL) {
    try {
      await fetch(env.TEAMS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "message",
          attachments: [{
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json", type: "AdaptiveCard", version: "1.4",
              body: [
                { type: "TextBlock", size: "Large", weight: "Bolder", color: "Attention", text: subject, wrap: true },
                ...lineas.map((l) => ({ type: "TextBlock", text: l, wrap: true })),
              ],
            },
          }],
        }),
      });
    } catch (e) { console.error("teams alert", String(e).slice(0, 120)); }
  }
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.RESEND_FROM || "Tevi Agent <onboarding@resend.dev>",
          to: [env.LEAD_EMAIL || LEAD_TO_DEFAULT], subject,
          html: '<div style="font-family:Arial,Helvetica,sans-serif;color:#111"><h2 style="color:#E4010A;margin:0 0 10px">' + ESC(subject) + "</h2>" +
            lineas.map((l) => '<p style="margin:4px 0">' + ESC(l) + "</p>").join("") + "</div>",
          text: subject + "\n" + lineas.join("\n"),
        }),
      });
      if (!r.ok) console.error("hot alert email failed", r.status, await r.text().catch(() => ""));
    } catch (e) { console.error("hot alert email", String(e).slice(0, 120)); }
  }
}

// Punto único de integraciones. Hoy: envía el lead por email a Gabriel y deja el
// registro completo en KV. Preparado para CRM/HubSpot/Calendar/WhatsApp (añadir aquí).
async function dispatchLead(env, rec) {
  await sendLeadEmail(env, rec);
  await sendFollowUpEmail(env, rec); // resumen personalizado a la persona (una vez)
  await saveLead(env, rec.id, rec);  // persiste los flags emailed/followedUp
}

// Endpoint de administración: lista los leads guardados (protegido por
// AGENT_ADMIN_KEY). GET /api/tevi-agent/leads?key=...  (&id=<sessionId> para uno).
async function handleAgentLeads(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!env.AGENT_ADMIN_KEY || key !== env.AGENT_ADMIN_KEY) return new Response("Not found", { status: 404 });
  if (!env.TEVI_AGENT_KV) return json({ error: "KV no configurado." }, 200, {});
  const id = url.searchParams.get("id");
  if (id) return json((await loadLead(env, id)) || { error: "no encontrado" }, 200, {});
  const list = await env.TEVI_AGENT_KV.list({ prefix: "lead:" });
  const rows = [];
  for (const k of list.keys) {
    const r = await env.TEVI_AGENT_KV.get(k.name, "json");
    if (r) rows.push({ id: r.id, fecha: r.fecha, hora: r.hora, status: r.status, geo: r.geoCountry || "", emailed: !!r.emailed, followedUp: !!r.followedUp, turns: r.turns, datos: r.datos, proximoPaso: r.report && r.report.proximoPaso });
  }
  return json({ total: rows.length, leads: rows }, 200, {});
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // API de Tevi (asistente informativo, modelos gratis) — sin tocar.
    if (url.pathname === "/api/tevi" || url.pathname === "/api/tevi/") {
      return handleTevi(request, env);
    }
    // API de Tevi Agent (agente comercial consultivo, Claude Sonnet).
    if (url.pathname === "/api/tevi-agent" || url.pathname === "/api/tevi-agent/") {
      return handleTeviAgent(request, env, ctx);
    }
    if (url.pathname === "/api/tevi-agent/leads") {
      return handleAgentLeads(request, env);
    }
    // Todo lo demás: el sitio estático (lo sirve el binding ASSETS).
    return env.ASSETS.fetch(request);
  },
};
