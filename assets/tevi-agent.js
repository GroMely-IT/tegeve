/* ════════════════════════════════════════════════════════════════
   TEVI AGENT — Agente comercial de TeGeVe (cliente)
   Módulo INDEPENDIENTE de Tevi (app.js / #aiPanel): no comparte estado.
   • Reutiliza las clases de Tevi (.ai-panel / .ai-head / .msg / .nav-ai…)
     para que el cuadro y los botones sean IDÉNTICOS a los de Tevi.
   • Exclusión mutua: si Tevi está abierto, al abrir el Agente se cierra
     Tevi, y viceversa (solo uno abierto a la vez).
   • Persistencia de sesión en localStorage; llamada a /api/tevi-agent
     (Claude Sonnet). El informe + la conversación se envían por email
     a Gabriel al cerrar (lo hace el Worker).
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__teviAgentLoaded) return;
  window.__teviAgentLoaded = true;

  // Estilos de la pantalla de bienvenida (el resto reutiliza las clases de Tevi).
  var STYLE = ".ta-welcome{text-align:center;padding:22px 12px 4px;animation:taWel .4s ease}"
    + "@keyframes taWel{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"
    + ".ta-welcome .ta-wel-av{width:56px;height:56px;margin:0 auto 12px;border-radius:50%;background:var(--red,#E4010A);display:flex;align-items:center;justify-content:center;color:#fff}"
    + ".ta-welcome .ta-wel-av svg{width:30px;height:30px}"
    + ".ta-welcome h3{margin:0 0 6px;font:600 1.14rem/1.3 inherit;color:var(--ink,#111114)}"
    + ".ta-welcome p{margin:0;font-size:.92rem;color:#5f5b53;line-height:1.5}"
    + ".ta-welcome + .chips{justify-content:center;margin-top:16px}"
    + "@media(prefers-reduced-motion:reduce){.ta-welcome{animation:none}}"
    // Spotlight de co-navegación: el agente lleva a una sección y la enfoca.
    + ".tgv-spot{position:relative!important;z-index:6!important;outline:3px solid var(--red,#E4010A);outline-offset:8px;"
    + "box-shadow:0 0 0 100vmax rgba(17,17,20,.38);border-radius:2px;transition:box-shadow .35s ease}"
    // Micrófono (dictado por voz) en el pie del chat.
    + "#taPanel .ta-mic{flex:0 0 auto;width:42px;border:1px solid var(--line,#dcd8cf);background:#fff;color:#5f5b53;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:0}"
    + "#taPanel .ta-mic.on{background:var(--red,#E4010A);border-color:var(--red,#E4010A);color:#fff;animation:taPulse 1.1s infinite}"
    + "@keyframes taPulse{0%,100%{opacity:1}50%{opacity:.6}}"
    // Lectura en voz alta (altavoz) en la cabecera.
    + "#taPanel .ta-tts{margin-left:auto;background:none;border:0;color:#fff;opacity:.55;cursor:pointer;padding:4px 6px;display:flex;align-items:center}"
    + "#taPanel .ta-tts.on{opacity:1;color:#86efac}"
    // Enlace de WhatsApp en la línea de aviso.
    + "#taPanel .ai-disc a{color:inherit;text-decoration:underline;font-weight:600}"
    // Entrada «genio de la lámpara»: el panel surge desde su esquina (transform-origin
    // bottom-right, heredado de .ai-panel) aplastado y se despliega con un rebote
    // sutil (curva con sobreimpulso). La salida usa la transición rápida existente.
    + "#taPanel.open{animation:taGenie .5s cubic-bezier(.26,1.32,.4,1) both}"
    + "@keyframes taGenie{0%{opacity:0;transform:translateY(46px) scale(.55,.28)}60%{opacity:1}100%{opacity:1;transform:none}}"
    + "@media(prefers-reduced-motion:reduce){#taPanel.open{animation:taFadeIn .2s ease both}}"
    + "@keyframes taFadeIn{from{opacity:0}to{opacity:1}}"
    // UI generativa: tarjetas (servicios/casos) y calculadora de ahorro en el chat.
    + "#taPanel .ta-cards{display:flex;flex-direction:column;gap:8px;margin:2px 0 6px;animation:taWel .4s ease}"
    + "#taPanel .ta-card{display:block;border:1px solid var(--line,#dcd8cf);background:#fff;padding:10px 12px;text-decoration:none;color:var(--ink,#111114)}"
    + "#taPanel .ta-card:hover{border-color:var(--red,#E4010A)}"
    + "#taPanel .ta-card b{display:block;font-size:.9rem}"
    + "#taPanel .ta-card span{display:block;font-size:.82rem;color:#5f5b53;margin:2px 0 4px;line-height:1.45}"
    + "#taPanel .ta-card i{font-style:normal;font-size:.78rem;color:var(--red,#E4010A);font-weight:600}"
    + "#taPanel .ta-roi{border:1px solid var(--line,#dcd8cf);background:#fff;padding:12px 14px;margin:2px 0 6px;animation:taWel .4s ease}"
    + "#taPanel .ta-roi h5{margin:0 0 4px;font-size:.92rem;color:var(--ink,#111114)}"
    + "#taPanel .ta-roi label{display:block;font-size:.78rem;color:#5f5b53;margin:9px 0 1px}"
    + "#taPanel .ta-roi label b{float:right;color:var(--ink,#111114)}"
    + "#taPanel .ta-roi input[type=range]{width:100%;margin:0;accent-color:var(--red,#E4010A)}"
    + "#taPanel .ta-roi .ta-roi-out{margin:12px 0 0;font-size:.78rem;color:#5f5b53}"
    + "#taPanel .ta-roi .ta-roi-out b{display:block;font-size:1.45rem;line-height:1.2;color:var(--red,#E4010A)}"
    + "#taPanel .ta-roi small{display:block;color:#8a857b;font-size:.72rem;line-height:1.45;margin:8px 0 10px}"
    + "#taPanel .ta-roi .chip{width:100%;text-align:center}";
  var stEl = document.createElement("style"); stEl.textContent = STYLE; document.head.appendChild(stEl);

  var NO_WORKER = /github\.io$/.test(location.hostname);
  var BASE = NO_WORKER ? "https://tegeve.gabrielgrosso.workers.dev" : "";
  var EP = BASE + "/api/tevi-agent";

  function lang() {
    var l = window.__lang || (document.documentElement.lang || "es").slice(0, 2);
    return ({ es: 1, en: 1, pt: 1, it: 1, fr: 1, de: 1 })[l] ? l : "es";
  }

  // ── Textos de interfaz por idioma (el Agente se identifica como «Agente de TeGeVe») ──
  var T = {
    es: { btn: "Tevi Agent", title: "Tevi Agent", sub: "En línea · Agente de TeGeVe",
      ph: "Escribe aquí…", open: "Abrir el Agente de TeGeVe", close: "Cerrar",
      disc: "Hablas con el Agente de TeGeVe. Guardamos la conversación para poder ayudarte mejor.",
      hi: "Hola, soy el Agente de TeGeVe. Antes de proponerte nada, me gusta entender el contexto: ¿en qué estás trabajando ahora mismo y qué te trae por aquí?",
      err: "Perdona, se me ha cruzado un cable. ¿Lo intentamos de nuevo en un momento?" },
    en: { btn: "Tevi Agent", title: "Tevi Agent", sub: "Online · TeGeVe Agent",
      ph: "Type here…", open: "Open the TeGeVe Agent", close: "Close",
      disc: "You're chatting with the TeGeVe Agent. We keep the conversation to help you better.",
      hi: "Hi, I'm the TeGeVe Agent. Before suggesting anything, I like to understand the context: what are you working on right now, and what brings you here?",
      err: "Sorry, something glitched on my end. Shall we try again in a moment?" },
    pt: { btn: "Tevi Agent", title: "Tevi Agent", sub: "Online · Agente da TeGeVe",
      ph: "Escreva aqui…", open: "Abrir o Agente da TeGeVe", close: "Fechar",
      disc: "Você fala com o Agente da TeGeVe. Guardamos a conversa para ajudar melhor.",
      hi: "Olá, sou o Agente da TeGeVe. Antes de propor qualquer coisa, gosto de entender o contexto: no que você está trabalhando agora e o que traz você aqui?",
      err: "Desculpe, deu um problema aqui. Tentamos de novo num instante?" },
    it: { btn: "Tevi Agent", title: "Tevi Agent", sub: "Online · Agente di TeGeVe",
      ph: "Scrivi qui…", open: "Apri l'Agente di TeGeVe", close: "Chiudi",
      disc: "Stai parlando con l'Agente di TeGeVe. Conserviamo la conversazione per aiutarti meglio.",
      hi: "Ciao, sono l'Agente di TeGeVe. Prima di proporti qualcosa, mi piace capire il contesto: a cosa stai lavorando in questo momento e cosa ti porta qui?",
      err: "Scusa, qui si è inceppato qualcosa. Riproviamo tra un attimo?" },
    fr: { btn: "Tevi Agent", title: "Tevi Agent", sub: "En ligne · Agent TeGeVe",
      ph: "Écrivez ici…", open: "Ouvrir l'Agent TeGeVe", close: "Fermer",
      disc: "Vous parlez à l'Agent TeGeVe. Nous conservons la conversation pour mieux vous aider.",
      hi: "Bonjour, je suis l'Agent TeGeVe. Avant de proposer quoi que ce soit, j'aime comprendre le contexte : sur quoi travaillez-vous en ce moment, et qu'est-ce qui vous amène ?",
      err: "Désolé, un petit bug de mon côté. On réessaie dans un instant ?" },
    de: { btn: "Tevi Agent", title: "Tevi Agent", sub: "Online · TeGeVe-Agent",
      ph: "Hier schreiben…", open: "Den TeGeVe-Agenten öffnen", close: "Schließen",
      disc: "Sie sprechen mit dem TeGeVe-Agenten. Wir speichern das Gespräch, um besser zu helfen.",
      hi: "Hallo, ich bin der TeGeVe-Agent. Bevor ich etwas vorschlage, möchte ich den Kontext verstehen: Woran arbeiten Sie gerade, und was führt Sie hierher?",
      err: "Entschuldigung, da hat etwas geklemmt. Versuchen wir es gleich noch einmal?" },
  };
  function t() { return T[lang()] || T.es; }

  // Pantalla de bienvenida: encabezado (h), invitación (p) y opciones de inicio (s).
  var WEL = {
    es: { h: "Hola, soy el Agente de TeGeVe", p: "¿Qué te trae por aquí? Elige una opción o escríbeme.",
      s: ["Tengo un reto con SAP", "Modernizar un sistema antiguo", "IA y automatización", "Desarrollo a medida", "Solo estoy explorando"] },
    en: { h: "Hi, I'm the TeGeVe Agent", p: "What brings you here? Pick an option or just type.",
      s: ["I have an SAP challenge", "Modernize a legacy system", "AI and automation", "Custom development", "Just exploring"] },
    pt: { h: "Olá, sou o Agente da TeGeVe", p: "O que traz você aqui? Escolha uma opção ou escreva.",
      s: ["Tenho um desafio com SAP", "Modernizar um sistema antigo", "IA e automação", "Desenvolvimento sob medida", "Só estou explorando"] },
    it: { h: "Ciao, sono l'Agente di TeGeVe", p: "Cosa ti porta qui? Scegli un'opzione o scrivimi.",
      s: ["Ho una sfida con SAP", "Modernizzare un sistema legacy", "IA e automazione", "Sviluppo su misura", "Sto solo esplorando"] },
    fr: { h: "Bonjour, je suis l'Agent TeGeVe", p: "Qu'est-ce qui vous amène ? Choisissez une option ou écrivez-moi.",
      s: ["J'ai un défi avec SAP", "Moderniser un système ancien", "IA et automatisation", "Développement sur mesure", "Je regarde juste"] },
    de: { h: "Hallo, ich bin der TeGeVe-Agent", p: "Was führt Sie her? Wählen Sie eine Option oder schreiben Sie einfach.",
      s: ["Ich habe eine SAP-Herausforderung", "Ein Altsystem modernisieren", "KI und Automatisierung", "Individuelle Entwicklung", "Ich schaue mich nur um"] },
  };
  function wel() { return WEL[lang()] || WEL.es; }

  // ── Sesión SOLO en memoria: cada carga de página (incluido un refresco)
  //    empieza limpia. El histórico completo se guarda igualmente en el
  //    servidor (KV) para el informe/email; en el cliente no persiste. ──
  function uid() { try { return crypto.randomUUID(); } catch (e) {} return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9); }
  function load() { return { id: uid(), msgs: [], ended: false }; }
  function save() {}
  try { localStorage.removeItem("tgv_agent_v1"); } catch (e) {} // purga conversaciones persistidas por versiones anteriores
  var state = load();

  // SVG idénticos a los de Tevi (chispa de cabecera/botón + avión de enviar).
  var SPARK = '<svg class="sp" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 3.5Q9.5 10.5 16.5 10.5Q9.5 10.5 9.5 17.5Q9.5 10.5 2.5 10.5Q9.5 10.5 9.5 3.5ZM17.5 13Q17.5 17 21.5 17Q17.5 17 17.5 21Q17.5 17 13.5 17Q17.5 17 17.5 13Z"/></svg>';
  var AV = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 3.5Q9.5 10.5 16.5 10.5Q9.5 10.5 9.5 17.5Q9.5 10.5 2.5 10.5Q9.5 10.5 9.5 3.5ZM17.5 13Q17.5 17 21.5 17Q17.5 17 17.5 21Q17.5 17 13.5 17Q17.5 17 17.5 13Z"/></svg>';
  var SEND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

  // ── Panel: MISMAS clases que Tevi (.ai-panel…), IDs propios (ta…) ──
  var panel = document.createElement("div");
  panel.className = "ai-panel"; panel.id = "taPanel";
  panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Tevi Agent");
  var MIC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>';
  var SPK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  panel.innerHTML =
    '<div class="ai-head"><div class="av">' + AV + '</div>'
    + '<div><h4 class="ta-title"></h4><div class="st ta-sub"></div></div>'
    + '<button class="ta-tts" id="taTts" type="button" aria-label="Leer las respuestas en voz alta">' + SPK + '</button>'
    + '<button class="ai-close" id="taClose" type="button" aria-label="Cerrar">&times;</button></div>'
    + '<div class="ai-body" id="taBody"></div>'
    + '<div class="ai-disc ta-disc"></div>'
    + '<div class="ai-foot"><button class="ta-mic" id="taMic" type="button" aria-label="Hablar por voz">' + MIC + '</button>'
    + '<input class="" id="taInput" type="text" autocomplete="off" aria-label="Tu mensaje">'
    + '<button class="ai-send" id="taSend" type="button" aria-label="Enviar">' + SEND + '</button></div>';
  document.body.appendChild(panel);

  var elBody = panel.querySelector("#taBody");
  var elIn = panel.querySelector("#taInput");
  var elSnd = panel.querySelector("#taSend");
  var started = false, busy = false, idleTimer = null;
  var IDLE_MS = 90000; // tras 90s sin escribir (y ≥2 mensajes), cerramos solos y enviamos el email

  // WhatsApp directo de Gabriel (mensaje prellenado por idioma).
  // NOTA: cuando Meta active la resolución web de usernames (wa.me/<usuario>,
  // hoy devuelve not_found para TODOS los usernames), cambiar WA_LINK a
  // "https://wa.me/gabrielgrosso" para ocultar el número.
  var WA_LINK = "https://wa.me/34682255515";
  var WAMSG = { es: "Hola Gabriel, vengo de la web de TeGeVe.", en: "Hi Gabriel, I'm coming from the TeGeVe website.", pt: "Olá Gabriel, venho do site da TeGeVe.", it: "Ciao Gabriel, arrivo dal sito TeGeVe.", fr: "Bonjour Gabriel, je viens du site TeGeVe.", de: "Hallo Gabriel, ich komme von der TeGeVe-Website." };
  function applyText() {
    var x = t();
    panel.querySelector(".ta-title").textContent = x.title;
    panel.querySelector(".ta-sub").textContent = x.sub;
    panel.querySelector(".ta-disc").innerHTML = esc(x.disc) +
      ' · <a href="' + WA_LINK + '?text=' + encodeURIComponent(WAMSG[lang()] || WAMSG.es) + '" target="_blank" rel="noopener">WhatsApp</a>';
    elIn.placeholder = x.ph;
    panel.querySelector("#taClose").setAttribute("aria-label", x.close);
    var b = document.querySelector(".nav-ai-agent");
    if (b) { b.setAttribute("aria-label", x.open); b.innerHTML = SPARK + x.btn; }
  }

  // ── Render seguro (escapa, enlaza urls/emails, respeta saltos) ──
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rich(s) {
    var h = esc(s);
    // Enlaces markdown [texto](url | /ruta) — red de seguridad si el modelo los usa.
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, function (m, text, href) {
      var ext = /^https?:/.test(href);
      return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + text + "</a>";
    });
    // URLs absolutas sueltas.
    h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    // Rutas RELATIVAS del propio sitio (/servicios/sap/#casos, /casos/, /#por-que-elegirnos) → mismo origen.
    h = h.replace(/(^|[\s(])(\/[a-z0-9][a-z0-9\/_-]*(?:#[a-z0-9-]+)?|\/#[a-z0-9-]+)/g, '$1<a href="$2">$2</a>');
    // Emails.
    h = h.replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1">$1</a>');
    return h.replace(/\n/g, "<br>");
  }
  function bubble(text, who) {
    var d = document.createElement("div");
    d.className = "msg " + who;              // .msg.bot / .msg.user (estilos de Tevi)
    d.innerHTML = rich(text); elBody.appendChild(d);
    elBody.scrollTop = elBody.scrollHeight; return d;
  }
  function typing(on) {
    var ex = elBody.querySelector(".typing");
    if (on && !ex) { var d = document.createElement("div"); d.className = "typing"; d.innerHTML = "<i></i><i></i><i></i>"; elBody.appendChild(d); elBody.scrollTop = elBody.scrollHeight; }
    else if (!on && ex) ex.remove();
  }

  function renderWelcome() {
    var w = wel();
    var box = document.createElement("div");
    box.className = "ta-welcome";
    box.innerHTML = '<div class="ta-wel-av">' + AV + "</div><h3></h3><p></p>";
    box.querySelector("h3").textContent = w.h;
    box.querySelector("p").textContent = w.p;
    elBody.appendChild(box);
    state.msgs.push({ role: "assistant", content: w.h + " " + w.p }); save(); // el saludo entra en el historial
    // Opciones de inicio: el tour guiado primero y luego los retos típicos.
    addChips([{ label: tourT().start, fn: startTour }].concat(w.s));
  }
  function replay() {
    elBody.innerHTML = "";
    if (!state.msgs.length) renderWelcome();
    else state.msgs.forEach(function (m) { bubble(m.content, m.role === "user" ? "user" : "bot"); });
  }

  // Respuestas rápidas (chips), con el MISMO diseño que Tevi (.chips/.chip).
  // Son opcionales: la persona puede pulsar una opción o escribir libremente.
  // Cada item puede ser un texto (se envía como mensaje) o {label, fn} (acción propia,
  // p. ej. los controles del tour guiado).
  function clearChips() { var c = elBody.querySelector(".chips"); if (c) c.remove(); }
  function addChips(items) {
    clearChips();
    var c = document.createElement("div"); c.className = "chips";
    items.forEach(function (it) {
      var isObj = it && typeof it === "object";
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = isObj ? it.label : it;
      b.addEventListener("click", function () { if (isObj) it.fn(); else send(it); });
      c.appendChild(b);
    });
    elBody.appendChild(c); elBody.scrollTop = elBody.scrollHeight;
  }

  // ── UI GENERATIVA: tarjetas de servicios/casos y calculadora de ahorro ──
  // Catálogo con datos REALES del sitio (títulos, resúmenes y anclas verificadas).
  // El agente solo elige CLAVES; el texto y el enlace salen de aquí (nada inventado).
  // Textos en es/en; el resto de idiomas usa en.
  var CARDS = {
    servicios: {
      sap:        { t: "Consultoría SAP",         u: "/servicios/sap/",                 es: "Implantación, S/4HANA, Fiori y soporte AMS.", en: "Implementation, S/4HANA, Fiori and AMS support." },
      jde:        { t: "Oracle JD Edwards",       u: "/servicios/oracle-jd-edwards/",   es: "Implantación, upgrades, Orchestrator y soporte.", en: "Implementation, upgrades, Orchestrator and support." },
      ia:         { t: "IA Empresarial y BI",     u: "/servicios/ia-empresarial/",      es: "Agentes de IA, RPA, automatización y analítica.", en: "AI agents, RPA, automation and analytics." },
      desarrollo: { t: "Desarrollo a medida",     u: "/servicios/desarrollo-a-medida/", es: "Aplicaciones e integraciones hechas para tu negocio.", en: "Applications and integrations built for your business." },
      legacy:     { t: "Modernización de legacy", u: "/servicios/modernizacion-legacy/", es: "COBOL, AS/400 y mainframe, por fases y sin big bang.", en: "COBOL, AS/400 and mainframe — phased, no big bang." },
      assessment: { t: "Assessment / BVA",        u: "/servicios/assessment/",          es: "Auditoría y hoja de ruta para decidir con datos.", en: "Audit and roadmap to decide with data." },
      staff:      { t: "Staff Augmentation",      u: "/servicios/#staff-augmentation",  es: "Perfiles senior que se suman a tu equipo.", en: "Senior profiles joining your team." },
      factory:    { t: "Software Factory",        u: "/servicios/#software-factory",    es: "Fábrica de software dedicada, con calidad CMMI 3.", en: "Dedicated software factory, CMMI level 3 quality." },
      nearshore:  { t: "Nearshore",               u: "/servicios/#nearshore",           es: "Misma franja horaria, costes eficientes.", en: "Same time zone, efficient costs." }
    },
    casos: {
      inspecciones:      { t: "Inspecciones offline",        u: "/casos/#control-permanencia-offline", es: "App móvil offline-first para 4.000 inspecciones de campo.", en: "Offline-first mobile app for 4,000 field inspections." },
      conciliacion:      { t: "Conciliación con IA",         u: "/casos/#ia-conciliacion-fci",         es: "Conciliación de fondos en SAP: de 4 días a horas.", en: "Fund reconciliation in SAP: from 4 days to hours." },
      logistica:         { t: "IA en logística",             u: "/casos/#ia-planificacion-logistica",  es: "Ruteo y planificación logística diaria con IA.", en: "Daily logistics routing and planning with AI." },
      "jde-agro":        { t: "JD Edwards en agro",          u: "/casos/#jd-edwards-agroindustrial",   es: "Implantación y soporte ERP JD Edwards en agroindustria.", en: "JD Edwards ERP implementation and support in agribusiness." },
      "seguridad-jde":   { t: "Seguridad en JD Edwards",     u: "/casos/#seguridad-jd-edwards-nutrien", es: "Assessment de seguridad y accesos en JD Edwards.", en: "Security and access assessment in JD Edwards." },
      "monitor-sap":     { t: "Monitor de integraciones",    u: "/casos/#monitor-integraciones-sap",   es: "Monitor SAP Fiori de integraciones de RRHH.", en: "SAP Fiori monitor for HR integrations." },
      "soporte-sap":     { t: "Soporte SAP continuo",        u: "/casos/#soporte-sap-continuo",        es: "Mesa de ayuda y soporte SAP funcional remoto.", en: "Remote SAP functional support and help desk." },
      "bi-consumo":      { t: "BI en gran consumo",          u: "/casos/#bi-tendencias-consumo",       es: "Business intelligence y analítica para gran consumo.", en: "Business intelligence and analytics for consumer goods." },
      rating:            { t: "Rating crediticio",           u: "/casos/#rating-crediticio-web",       es: "Desarrollo web de rating crediticio bancario.", en: "Web development of a banking credit-rating tool." },
      "factory-seguros": { t: "Factory en seguros",          u: "/casos/#software-factory-aseguradora", es: "Software factory y mantenimiento evolutivo en seguros.", en: "Software factory and evolutionary maintenance in insurance." },
      emv:               { t: "Migración EMV",               u: "/casos/#migracion-emv-chip",          es: "Migración a tarjetas EMV y antifraude en pagos.", en: "Migration to EMV cards and payment anti-fraud." },
      "legacy-pagos":    { t: "Legacy en medios de pago",    u: "/casos/#legacy-medios-de-pago",       es: "Integración de sistemas legacy en medios de pago.", en: "Legacy system integration in payments." },
      "bva-motta":       { t: "Selección de ERP con datos",  u: "/casos/#bva-erp-motta",               es: "Assessment y selección de ERP basada en datos.", en: "Data-driven ERP assessment and selection." }
    }
  };
  var CARD_CTA = { es: "Ver en el sitio →", en: "See on the site →" };
  function cardL() { return lang() === "es" ? "es" : "en"; }
  function renderCards(type, keys) {
    var cat = CARDS[type]; if (!cat || !keys) return null;
    var wrap = document.createElement("div"); wrap.className = "ta-cards";
    var n = 0;
    keys.forEach(function (k) {
      var c = cat[k]; if (!c || n >= 3) return; n++;
      var a = document.createElement("a");
      a.className = "ta-card"; a.href = c.u;
      a.innerHTML = "<b></b><span></span><i></i>";
      a.querySelector("b").textContent = c.t;
      a.querySelector("span").textContent = c[cardL()] || c.es;
      a.querySelector("i").textContent = CARD_CTA[cardL()];
      wrap.appendChild(a);
    });
    return n ? wrap : null;
  }
  // Calculadora de ahorro: la persona mueve los controles (los datos son suyos)
  // y puede devolver el resultado a la conversación con un clic.
  var ROI_T = {
    es: { t: "Calculadora rápida de ahorro", p: "Personas implicadas", c: "Coste por hora (€)", h: "Horas/semana en tareas repetitivas", a: "Parte automatizable", o: "Ahorro anual estimado", n: "Estimación orientativa sobre 46 semanas/año. Los datos los pones tú: mueve los controles.", b: "Comentar este cálculo",
      m: function (v) { return "Según la calculadora, saldría un ahorro estimado de " + v.out + " €/año (" + v.p + " personas, " + v.c + " €/hora, " + v.h + " h/semana, " + v.a + " % automatizable). ¿Lo vemos para nuestro caso?"; } },
    en: { t: "Quick savings calculator", p: "People involved", c: "Cost per hour (€)", h: "Hours/week on repetitive tasks", a: "Automatable share", o: "Estimated annual savings", n: "Rough estimate over 46 weeks/year. The numbers are yours: move the sliders.", b: "Discuss this estimate",
      m: function (v) { return "The calculator shows estimated savings of €" + v.out + "/year (" + v.p + " people, €" + v.c + "/hour, " + v.h + " h/week, " + v.a + "% automatable). Is that realistic in our case?"; } },
    pt: { t: "Calculadora rápida de economia", p: "Pessoas envolvidas", c: "Custo por hora (€)", h: "Horas/semana em tarefas repetitivas", a: "Parte automatizável", o: "Economia anual estimada", n: "Estimativa aproximada sobre 46 semanas/ano. Os números são seus: mova os controles.", b: "Comentar este cálculo",
      m: function (v) { return "Pela calculadora, a economia estimada seria de € " + v.out + "/ano (" + v.p + " pessoas, € " + v.c + "/hora, " + v.h + " h/semana, " + v.a + "% automatizável). Isso é realista no nosso caso?"; } },
    it: { t: "Calcolatore rapido di risparmio", p: "Persone coinvolte", c: "Costo orario (€)", h: "Ore/settimana su attività ripetitive", a: "Quota automatizzabile", o: "Risparmio annuo stimato", n: "Stima indicativa su 46 settimane/anno. I numeri sono tuoi: muovi i cursori.", b: "Parlarne insieme",
      m: function (v) { return "Il calcolatore stima un risparmio di " + v.out + " €/anno (" + v.p + " persone, " + v.c + " €/ora, " + v.h + " h/settimana, " + v.a + "% automatizzabile). È realistico nel nostro caso?"; } },
    fr: { t: "Calculateur rapide d'économies", p: "Personnes concernées", c: "Coût par heure (€)", h: "Heures/semaine sur tâches répétitives", a: "Part automatisable", o: "Économie annuelle estimée", n: "Estimation indicative sur 46 semaines/an. Les chiffres sont les vôtres : bougez les curseurs.", b: "En parler ensemble",
      m: function (v) { return "Le calculateur estime une économie de " + v.out + " €/an (" + v.p + " personnes, " + v.c + " €/heure, " + v.h + " h/semaine, " + v.a + " % automatisable). Est-ce réaliste dans notre cas ?"; } },
    de: { t: "Schneller Einspar-Rechner", p: "Beteiligte Personen", c: "Kosten pro Stunde (€)", h: "Stunden/Woche für repetitive Aufgaben", a: "Automatisierbarer Anteil", o: "Geschätzte jährliche Einsparung", n: "Grobe Schätzung über 46 Wochen/Jahr. Die Zahlen sind Ihre: bewegen Sie die Regler.", b: "Diese Rechnung besprechen",
      m: function (v) { return "Der Rechner zeigt eine geschätzte Einsparung von " + v.out + " €/Jahr (" + v.p + " Personen, " + v.c + " €/Stunde, " + v.h + " Std./Woche, " + v.a + " % automatisierbar). Ist das in unserem Fall realistisch?"; } },
  };
  function renderRoi() {
    var L = ROI_T[lang()] || ROI_T.es;
    var box = document.createElement("div"); box.className = "ta-roi";
    function row(label, id, min, max, step, val, unit) {
      return "<label>" + esc(label) + " <b><span id='" + id + "v'></span>" + unit + "</b></label>"
        + "<input type='range' id='" + id + "' min='" + min + "' max='" + max + "' step='" + step + "' value='" + val + "'>";
    }
    box.innerHTML = "<h5>" + esc(L.t) + "</h5>"
      + row(L.p, "taRoiP", 1, 50, 1, 3, "")
      + row(L.c, "taRoiC", 15, 120, 5, 35, " €")
      + row(L.h, "taRoiH", 1, 40, 1, 6, " h")
      + row(L.a, "taRoiA", 10, 90, 5, 60, " %")
      + "<div class='ta-roi-out'>" + esc(L.o) + "<b id='taRoiOut'></b></div>"
      + "<small>" + esc(L.n) + "</small>"
      + "<button type='button' class='chip' id='taRoiBtn'>" + esc(L.b) + "</button>";
    var get = function (id) { return +box.querySelector("#" + id).value; };
    function calc() {
      var p = get("taRoiP"), c = get("taRoiC"), h = get("taRoiH"), a = get("taRoiA");
      var out = Math.round(p * c * h * 46 * a / 100);
      box.querySelector("#taRoiPv").textContent = p;
      box.querySelector("#taRoiCv").textContent = c;
      box.querySelector("#taRoiHv").textContent = h;
      box.querySelector("#taRoiAv").textContent = a;
      box.querySelector("#taRoiOut").textContent = out.toLocaleString(lang() === "en" ? "en-GB" : "de-DE") + " €";
      return { p: p, c: c, h: h, a: a, out: out.toLocaleString(lang() === "en" ? "en-GB" : "de-DE") };
    }
    box.querySelectorAll("input[type=range]").forEach(function (r) { r.addEventListener("input", calc); });
    box.querySelector("#taRoiBtn").addEventListener("click", function () { send(L.m(calc())); });
    calc();
    return box;
  }
  // Pinta el widget que pida el servidor ({type:"roi"} o {type:"servicios|casos",keys:[…]}).
  function renderUI(ui) {
    if (!ui || !ui.type) return;
    var el = ui.type === "roi" ? renderRoi() : renderCards(ui.type, ui.keys);
    if (el) { elBody.appendChild(el); elBody.scrollTop = elBody.scrollHeight; }
  }

  // Los marcadores internos ([[opc]]/[[cita]]/[[ui]]) nunca deben verse, ni a medio llegar.
  function stripMk(s) { return s.replace(/^[ \t]*\[\[.*$/gm, ""); }
  // Cierre común de una respuesta del agente: historial, chips, widget, tour, foco y voz.
  function addBotReply(reply, chips, el, ui, tour) {
    if (el) el.innerHTML = rich(reply); else bubble(reply, "bot");
    state.msgs.push({ role: "assistant", content: reply }); save();
    renderUI(ui);
    if (tour) { setTimeout(startTour, 900); }          // el agente aceptó el tour: arranca solo
    else if (chips && chips.length) addChips(chips);
    autoSpot(reply);
    speak(reply);
    elBody.scrollTop = elBody.scrollHeight;
  }
  // Lee la respuesta en STREAMING (SSE): pinta el texto según llega, token a token.
  async function readStream(r) {
    var reader = r.body.getReader(), dec = new TextDecoder();
    var buf = "", acc = "", el = null, finished = false;
    for (;;) {
      var st = await reader.read();
      if (st.done) break;
      buf += dec.decode(st.value, { stream: true });
      var nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        var line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (line.indexOf("data:") !== 0) continue;
        var ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (ev.d) {
          acc += ev.d;
          if (!el) { typing(false); el = bubble("", "bot"); }
          el.innerHTML = rich(stripMk(acc).trim());
          elBody.scrollTop = elBody.scrollHeight;
        } else if (ev.done) {
          finished = true; typing(false);
          addBotReply(ev.reply || stripMk(acc).trim(), ev.chips || [], el, ev.ui, ev.tour);
        } else if (ev.error && !el) {
          typing(false); bubble(t().err, "bot");
          finished = true;
        }
      }
    }
    if (!finished) { // stream cortado: conserva lo recibido o avisa
      typing(false);
      var rest = stripMk(acc).trim();
      if (rest && el) { state.msgs.push({ role: "assistant", content: rest }); save(); }
      else if (!el) bubble(t().err, "bot");
    }
  }

  // `forced` (string) = texto de un chip pulsado; si no, se toma del input.
  async function send(forced) {
    var msg = (typeof forced === "string" ? forced : elIn.value).trim();
    if (!msg || busy) return;
    clearChips(); // al responder, se quitan las opciones anteriores
    var welBox = elBody.querySelector(".ta-welcome"); if (welBox) welBox.remove(); // sale de la pantalla de bienvenida
    if (typeof forced !== "string") elIn.value = "";
    bubble(msg, "user");
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } // hay actividad: cancela el cierre por inactividad
    var hist = state.msgs.slice(-12); // contexto previo (sin el mensaje actual, que va aparte)
    state.msgs.push({ role: "user", content: msg }); state.ended = false; save();
    busy = true; elSnd.disabled = true; typing(true);
    try {
      var r = await fetch(EP, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.id, message: msg, lang: lang(), history: hist, page: location.pathname, stream: true }),
      });
      if ((r.headers.get("content-type") || "").indexOf("text/event-stream") >= 0 && r.body) {
        await readStream(r); // respuesta en vivo, token a token
      } else {
        var d = await r.json(); typing(false);
        addBotReply((d && d.reply) || t().err, (d && d.chips) || [], null, d && d.ui, d && d.tour);
      }
    } catch (e) { typing(false); bubble(t().err, "bot"); }
    busy = false; elSnd.disabled = false; elIn.focus();
    scheduleIdleEnd(); // arranca el temporizador de inactividad tras cada intercambio
  }

  // Cierre: genera informe y lo envía por email (una vez por sesión con material).
  function endSession() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    var users = state.msgs.filter(function (m) { return m.role === "user"; }).length;
    if (state.ended || users < 2) return;
    state.ended = true; save();
    try {
      fetch(EP, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.id, action: "end", lang: lang() }) });
    } catch (e) {}
  }
  // Cierre automático por inactividad: si la persona deja de escribir, se envía
  // el informe + email sin necesidad de que cierre el panel ni salga de la página.
  function scheduleIdleEnd() { if (idleTimer) clearTimeout(idleTimer); idleTimer = setTimeout(endSession, IDLE_MS); }

  // ── Exclusión mutua con Tevi (solo uno abierto) ──
  var teviPanel = document.getElementById("aiPanel");
  function teviOpen() { return teviPanel && teviPanel.classList.contains("open"); }
  function closeTevi() { if (teviOpen()) { var c = document.getElementById("aiClose"); if (c) c.click(); } } // siempre por el handler de Tevi (preserva su estado)
  if (teviPanel && "MutationObserver" in window) {
    new MutationObserver(function () {
      if (teviPanel.classList.contains("open") && panel.classList.contains("open")) close();
    }).observe(teviPanel, { attributes: true, attributeFilter: ["class"] });
  }

  function open() {
    closeTevi();                                  // al abrir el Agente, se cierra Tevi
    applyText();
    panel.classList.add("open");
    var fab = document.getElementById("aiFab"); if (fab) fab.classList.add("is-hidden");
    if (!started) { started = true; replay(); }
    setTimeout(function () { elIn.focus(); }, 250);
  }
  function close() {
    panel.classList.remove("open");
    var fab = document.getElementById("aiFab"); if (fab && !teviOpen()) fab.classList.remove("is-hidden");
    endSession();
  }

  // ── Botón «Tevi Agent» junto al de Tevi, con su MISMO diseño (.nav-ai) ──
  function injectButton() {
    if (document.querySelector(".nav-ai-agent")) return;
    // Tevi ya no está en el menú: si existiera su .nav-ai vamos detrás; si no,
    // delante de LinkedIn (.nav-li) o, en su defecto, del CTA (.nav-cta).
    var ref = document.querySelector(".nav-ai") || document.querySelector(".nav-li") || document.querySelector(".nav-cta");
    if (!ref || !ref.parentNode) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "nav-ai nav-ai-agent";
    b.setAttribute("aria-label", t().open);
    b.innerHTML = SPARK + t().btn;
    b.addEventListener("click", open);
    if (ref.classList.contains("nav-ai")) ref.parentNode.insertBefore(b, ref.nextSibling);
    else ref.parentNode.insertBefore(b, ref);
  }

  // ── Eventos ──
  panel.querySelector("#taClose").addEventListener("click", close);
  elSnd.addEventListener("click", send);
  elIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
  window.addEventListener("pagehide", endSession);
  // Respaldo fiable en móvil/bfcache (pagehide no siempre se entrega): cierra la
  // sesión y dispara informe+email al ocultarse la pestaña. endSession es idempotente.
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") endSession(); });
  window.addEventListener("langchange", applyText);   // cambio de idioma del sitio
  window.addEventListener("languagechange", applyText);

  // Abrir Tevi Agent desde cualquier elemento con .agent-open-link (p. ej. el
  // botón del carrusel). data-aq opcional siembra el primer mensaje del usuario.
  function wireOpeners() {
    document.querySelectorAll(".agent-open-link").forEach(function (b) {
      if (b.__taWired) return; b.__taWired = true;
      b.addEventListener("click", function () {
        open();
        var q = b.getAttribute("data-aq") || b.getAttribute("data-q"); // reutiliza data-q de las tarjetas del carrusel
        if (q) setTimeout(function () { send(q); }, 350);
      });
    });
  }

  // ── VOZ: dictado con el micrófono (SpeechRecognition) y lectura en voz alta ──
  var VLANG = { es: "es-ES", en: "en-US", pt: "pt-BR", it: "it-IT", fr: "fr-FR", de: "de-DE" };
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var micBtn = panel.querySelector("#taMic"), srec = null, micOn = false;
  if (!SR && micBtn) micBtn.style.display = "none"; // sin soporte (Firefox): se oculta
  function micStop() { micOn = false; if (micBtn) micBtn.classList.remove("on"); try { if (srec) srec.stop(); } catch (e) {} srec = null; }
  if (SR && micBtn) micBtn.addEventListener("click", function () {
    if (micOn) { micStop(); return; }
    srec = new SR();
    srec.lang = VLANG[lang()] || "es-ES";
    srec.interimResults = true;
    micOn = true; micBtn.classList.add("on");
    var finalTxt = "";
    srec.onresult = function (e) {
      var s = "";
      for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      elIn.value = s; // transcripción en vivo en el input
      if (e.results[e.results.length - 1].isFinal) finalTxt = s;
    };
    srec.onend = function () { micStop(); var q = (finalTxt || elIn.value).trim(); elIn.value = ""; if (q) send(q); };
    srec.onerror = function () { micStop(); };
    try { srec.start(); } catch (e) { micStop(); }
  });
  var ttsOn = false, ttsBtn = panel.querySelector("#taTts");
  if (!("speechSynthesis" in window) && ttsBtn) ttsBtn.style.display = "none";
  if (ttsBtn) ttsBtn.addEventListener("click", function () {
    ttsOn = !ttsOn; ttsBtn.classList.toggle("on", ttsOn);
    if (!ttsOn) { try { speechSynthesis.cancel(); } catch (e) {} }
  });
  function speak(text) {
    if (!ttsOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      // No leemos URLs ni rutas en voz alta (suenan fatal).
      var u = new SpeechSynthesisUtterance(String(text).replace(/https?:\/\/\S+/g, "").replace(/\/[a-z0-9\/_#-]{4,}/g, ""));
      u.lang = VLANG[lang()] || "es-ES";
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ── TOUR GUIADO: recorrido demo por las secciones clave (multi-página) ──
  // Guion fijo con anclas REALES del sitio; la conversación viaja entre páginas
  // con el mecanismo de co-navegación (CARRY) y el índice del paso en TOUR_KEY.
  var TOUR_KEY = "tgv_agent_tour";
  var TOUR = [
    { u: "/#servicios-overview", x: {
      es: "Empezamos por lo esencial: estas son nuestras áreas de servicio, de SAP y Oracle JD Edwards a IA empresarial, desarrollo a medida y modernización de legacy.",
      en: "Let's start with the essentials: these are our service areas, from SAP and Oracle JD Edwards to enterprise AI, custom development and legacy modernization.",
      pt: "Começamos pelo essencial: estas são nossas áreas de serviço, de SAP e Oracle JD Edwards a IA empresarial, desenvolvimento sob medida e modernização de legado.",
      it: "Partiamo dall'essenziale: queste sono le nostre aree di servizio, da SAP e Oracle JD Edwards all'IA aziendale, sviluppo su misura e modernizzazione legacy.",
      fr: "Commençons par l'essentiel : voici nos domaines de service, de SAP et Oracle JD Edwards à l'IA d'entreprise, au développement sur mesure et à la modernisation legacy.",
      de: "Beginnen wir mit dem Wesentlichen: Das sind unsere Servicebereiche, von SAP und Oracle JD Edwards bis zu Unternehmens-KI, Individualentwicklung und Legacy-Modernisierung." } },
    { u: "/casos/#ia-conciliacion-fci", x: {
      es: "Un caso real que lo resume bien: automatizamos con IA la conciliación de fondos de inversión en SAP y el proceso pasó de 4 días a horas.",
      en: "A real case that sums it up: we automated investment-fund reconciliation in SAP with AI, and the process went from 4 days to hours.",
      pt: "Um caso real que resume bem: automatizamos com IA a conciliação de fundos de investimento no SAP e o processo passou de 4 dias para horas.",
      it: "Un caso reale che lo riassume bene: abbiamo automatizzato con l'IA la riconciliazione dei fondi in SAP e il processo è passato da 4 giorni a poche ore.",
      fr: "Un cas réel qui résume bien : nous avons automatisé avec l'IA le rapprochement des fonds dans SAP, et le processus est passé de 4 jours à quelques heures.",
      de: "Ein realer Fall, der es gut zusammenfasst: Wir haben die Fondsabstimmung in SAP mit KI automatisiert — von 4 Tagen auf wenige Stunden." } },
    { u: "/servicios/#modelos-de-servicio", x: {
      es: "Hay varias formas de trabajar con nosotros: proyecto a medida, software factory, staff augmentation o soporte AMS, siempre en modalidad nearshore eficiente.",
      en: "There are several ways to work with us: custom projects, software factory, staff augmentation or AMS support — always in an efficient nearshore model.",
      pt: "Há várias formas de trabalhar conosco: projeto sob medida, software factory, staff augmentation ou suporte AMS, sempre em modalidade nearshore eficiente.",
      it: "Ci sono vari modi di lavorare con noi: progetto su misura, software factory, staff augmentation o supporto AMS, sempre in modalità nearshore efficiente.",
      fr: "Il existe plusieurs façons de travailler avec nous : projet sur mesure, software factory, staff augmentation ou support AMS, toujours en mode nearshore efficace.",
      de: "Es gibt mehrere Wege, mit uns zu arbeiten: Individualprojekt, Software Factory, Staff Augmentation oder AMS-Support — immer im effizienten Nearshore-Modell." } },
    { u: "/nosotros/#nuestra-historia", x: {
      es: "Detrás hay más de 30 años de trayectoria, presencia en 4 países y nivel 3 de madurez CMMI: equipos senior y estables.",
      en: "Behind it all: over 30 years of track record, presence in 4 countries and CMMI maturity level 3 — senior, stable teams.",
      pt: "Por trás disso: mais de 30 anos de trajetória, presença em 4 países e nível 3 de maturidade CMMI — equipes seniores e estáveis.",
      it: "Dietro c'è una storia di oltre 30 anni, presenza in 4 paesi e livello 3 di maturità CMMI: team senior e stabili.",
      fr: "Derrière tout cela : plus de 30 ans d'expérience, une présence dans 4 pays et le niveau 3 de maturité CMMI — des équipes seniors et stables.",
      de: "Dahinter stehen über 30 Jahre Erfahrung, Präsenz in 4 Ländern und CMMI-Reifegrad 3: erfahrene, stabile Teams." } },
    { u: "/#contacto-titulo", x: {
      es: "Y este es el último paso del recorrido: desde aquí puedes contarnos tu reto o agendar un diagnóstico con Gabriel, nuestro Director.",
      en: "And this is the last stop: from here you can tell us your challenge or schedule a diagnosis with Gabriel, our Director.",
      pt: "E esta é a última parada: daqui você pode nos contar seu desafio ou agendar um diagnóstico com Gabriel, nosso Diretor.",
      it: "E questa è l'ultima tappa: da qui puoi raccontarci la tua sfida o fissare una diagnosi con Gabriel, il nostro Direttore.",
      fr: "Et voici la dernière étape : d'ici, vous pouvez nous décrire votre défi ou planifier un diagnostic avec Gabriel, notre Directeur.",
      de: "Und das ist die letzte Station: Von hier aus können Sie uns Ihre Herausforderung schildern oder eine Diagnose mit Gabriel, unserem Direktor, vereinbaren." } },
  ];
  var TOUR_T = {
    es: { start: "Enséñame el sitio en 1 minuto", next: "Siguiente →", stop: "Terminar el tour",
      end: "Hasta aquí el recorrido. Si quieres, cuéntame tu reto y vemos cómo ayudarte, o agendamos una reunión con Gabriel.",
      endChips: ["Te cuento mi reto", "Quiero una reunión con Gabriel"] },
    en: { start: "Show me the site in 1 minute", next: "Next →", stop: "End the tour",
      end: "That's the end of the tour. If you like, tell me your challenge and we'll see how to help, or we can schedule a meeting with Gabriel.",
      endChips: ["Let me tell you my challenge", "I'd like a meeting with Gabriel"] },
    pt: { start: "Mostre-me o site em 1 minuto", next: "Próximo →", stop: "Encerrar o tour",
      end: "Fim do tour. Se quiser, conte-me seu desafio e vemos como ajudar, ou agendamos uma reunião com o Gabriel.",
      endChips: ["Vou contar meu desafio", "Quero uma reunião com o Gabriel"] },
    it: { start: "Mostrami il sito in 1 minuto", next: "Avanti →", stop: "Termina il tour",
      end: "Il tour finisce qui. Se vuoi, raccontami la tua sfida e vediamo come aiutarti, oppure fissiamo un incontro con Gabriel.",
      endChips: ["Ti racconto la mia sfida", "Vorrei un incontro con Gabriel"] },
    fr: { start: "Montrez-moi le site en 1 minute", next: "Suivant →", stop: "Terminer la visite",
      end: "C'est la fin de la visite. Si vous voulez, décrivez-moi votre défi et voyons comment vous aider, ou planifions une réunion avec Gabriel.",
      endChips: ["Je vous décris mon défi", "Je veux une réunion avec Gabriel"] },
    de: { start: "Zeigen Sie mir die Website in 1 Minute", next: "Weiter →", stop: "Tour beenden",
      end: "Das war die Tour. Erzählen Sie mir gern Ihre Herausforderung, oder wir vereinbaren ein Treffen mit Gabriel.",
      endChips: ["Ich schildere meine Herausforderung", "Ich möchte ein Treffen mit Gabriel"] },
  };
  function tourT() { return TOUR_T[lang()] || TOUR_T.es; }
  function tourNarr(s) { return s.x[lang()] || s.x.es; }
  function tourShow(i) { // narración + foco + controles del paso i (ya en su página)
    var s = TOUR[i]; if (!s) return tourEnd();
    var hash = s.u.split("#")[1] || "";
    bubble(tourNarr(s), "bot");
    state.msgs.push({ role: "assistant", content: tourNarr(s) }); save();
    if (hash) setTimeout(function () { spotlight(hash); }, 400);
    var last = i === TOUR.length - 1;
    var chips = [{ label: last ? tourT().stop : tourT().next, fn: function () { if (last) tourEnd(); else tourStep(i + 1); } }];
    if (!last) chips.push({ label: tourT().stop, fn: tourEnd });
    addChips(chips);
  }
  function tourStep(i) {
    var s = TOUR[i]; if (!s) return tourEnd();
    var path = s.u.split("#")[0] || "/";
    if (normPath(path) === normPath(location.pathname)) { tourShow(i); return; }
    var ok = false;
    try {
      sessionStorage.setItem(TOUR_KEY, String(i));
      sessionStorage.setItem(CARRY, JSON.stringify({ state: state, hash: "" }));
      ok = true;
    } catch (e) {}
    if (ok) location.href = s.u;   // otra página: la conversación y el tour viajan
    else tourEnd();                // sin sessionStorage no podemos cruzar de página
  }
  function tourEnd() {
    clearChips();
    bubble(tourT().end, "bot");
    state.msgs.push({ role: "assistant", content: tourT().end }); save();
    addChips(tourT().endChips);
    elBody.scrollTop = elBody.scrollHeight;
  }
  function startTour() {
    clearChips();
    var w = elBody.querySelector(".ta-welcome"); if (w) w.remove();
    tourStep(0);
  }

  // ── CO-NAVEGACIÓN: el agente te lleva a la sección exacta (scroll + foco) ──
  var CARRY = "tgv_agent_carry"; // traslada la conversación SOLO en navegaciones guiadas por el agente
  function normPath(p) {
    p = (p || "/").split("#")[0].split("?")[0];
    if (p.charAt(p.length - 1) !== "/") p += "/";
    return p.replace(/index\.html\/$/, "");
  }
  function spotlight(id) {
    var el = id && document.getElementById(id);
    if (!el) return false;
    document.querySelectorAll(".tgv-spot").forEach(function (x) { x.classList.remove("tgv-spot"); });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("tgv-spot");
    setTimeout(function () { el.classList.remove("tgv-spot"); }, 3500);
    return true;
  }
  elBody.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a || !elBody.contains(a)) return;
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) !== "/") return;               // solo rutas internas del sitio
    var path = href.split("#")[0], hash = href.split("#")[1] || "";
    e.preventDefault();
    if (normPath(path) === normPath(location.pathname)) {
      if (hash) spotlight(hash);                       // misma página: te llevo hasta la sección
    } else {
      try { sessionStorage.setItem(CARRY, JSON.stringify({ state: state, hash: hash })); } catch (err) {}
      location.href = href;                            // otra página: la conversación viaja contigo
    }
  });
  // Si el agente cita una sección de ESTA página, la enfoca él solo mientras habla.
  function autoSpot(reply) {
    var m = (reply || "").match(/(^|[\s(])(\/[a-z0-9][a-z0-9\/_-]*|\/)#([a-z0-9-]+)/i);
    if (m && normPath(m[2]) === normPath(location.pathname)) setTimeout(function () { spotlight(m[3]); }, 600);
  }
  (function resumeCarry() { // reanudación tras una navegación guiada por el agente
    var raw = null;
    try { raw = sessionStorage.getItem(CARRY); if (raw) sessionStorage.removeItem(CARRY); } catch (e) {}
    if (!raw) return;
    try {
      var c = JSON.parse(raw);
      if (c.state && c.state.id) state = c.state;
      // Si hay un tour en marcha, este es su siguiente paso en la nueva página.
      var ti = null;
      try { ti = sessionStorage.getItem(TOUR_KEY); if (ti != null) sessionStorage.removeItem(TOUR_KEY); } catch (e2) {}
      setTimeout(function () {
        open();
        if (ti != null) setTimeout(function () { tourShow(+ti); }, 450);
        else if (c.hash) setTimeout(function () { spotlight(c.hash); }, 500);
      }, 350);
    } catch (e) {}
  })();

  // ── APERTURA PROACTIVA: Tevi Agent saluda solo, según la página (1 vez/sesión) ──
  var PRO_KEY = "tgv_agent_pro";
  var proDone = false; try { proDone = !!sessionStorage.getItem(PRO_KEY); } catch (e) {}
  function proactive() {
    if (proDone || busy || started || state.msgs.length) return;
    if (panel.classList.contains("open") || teviOpen()) return;
    proDone = true; try { sessionStorage.setItem(PRO_KEY, "1"); } catch (e) {}
    started = true;            // sin pantalla de bienvenida: el saludo ES la apertura
    open();
    elBody.innerHTML = "";
    typing(true);
    fetch(EP, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.id, action: "opener", lang: lang(), page: location.pathname + location.hash }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        typing(false);
        if (d && d.reply) {
          bubble(d.reply, "bot");
          state.msgs.push({ role: "assistant", content: d.reply }); save();
          addChips((d.chips && d.chips.length) ? d.chips : wel().s);
          speak(d.reply);
        } else { renderWelcome(); }
      })
      .catch(function () { typing(false); renderWelcome(); });
  }
  if (!proDone) {
    setTimeout(proactive, 20000);                                     // 20 s en la página
    var proScroll = function () {
      var doc = document.documentElement;
      if (doc.scrollHeight > 0 && (window.scrollY + window.innerHeight) / doc.scrollHeight > 0.6) {
        window.removeEventListener("scroll", proScroll); proactive();
      }
    };
    window.addEventListener("scroll", proScroll, { passive: true });  // 60 % de scroll
    document.addEventListener("mouseleave", function (e) { if (e.clientY <= 0) proactive(); }); // intención de salida
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { injectButton(); wireOpeners(); });
  else { injectButton(); wireOpeners(); }
})();
