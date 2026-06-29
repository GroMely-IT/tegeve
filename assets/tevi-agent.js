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
  panel.innerHTML =
    '<div class="ai-head"><div class="av">' + AV + '</div>'
    + '<div><h4 class="ta-title"></h4><div class="st ta-sub"></div></div>'
    + '<button class="ai-close" id="taClose" type="button" aria-label="Cerrar">&times;</button></div>'
    + '<div class="ai-body" id="taBody"></div>'
    + '<div class="ai-disc ta-disc"></div>'
    + '<div class="ai-foot"><input class="" id="taInput" type="text" autocomplete="off" aria-label="Tu mensaje">'
    + '<button class="ai-send" id="taSend" type="button" aria-label="Enviar">' + SEND + '</button></div>';
  document.body.appendChild(panel);

  var elBody = panel.querySelector("#taBody");
  var elIn = panel.querySelector("#taInput");
  var elSnd = panel.querySelector("#taSend");
  var started = false, busy = false, idleTimer = null;
  var IDLE_MS = 90000; // tras 90s sin escribir (y ≥2 mensajes), cerramos solos y enviamos el email

  function applyText() {
    var x = t();
    panel.querySelector(".ta-title").textContent = x.title;
    panel.querySelector(".ta-sub").textContent = x.sub;
    panel.querySelector(".ta-disc").textContent = x.disc;
    elIn.placeholder = x.ph;
    panel.querySelector("#taClose").setAttribute("aria-label", x.close);
    var b = document.querySelector(".nav-ai-agent");
    if (b) { b.setAttribute("aria-label", x.open); b.innerHTML = SPARK + x.btn; }
  }

  // ── Render seguro (escapa, enlaza urls/emails, respeta saltos) ──
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rich(s) {
    var h = esc(s);
    h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
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

  function replay() {
    elBody.innerHTML = "";
    if (!state.msgs.length) { bubble(t().hi, "bot"); state.msgs.push({ role: "assistant", content: t().hi }); save(); }
    else state.msgs.forEach(function (m) { bubble(m.content, m.role === "user" ? "user" : "bot"); });
  }

  // Respuestas rápidas (chips), con el MISMO diseño que Tevi (.chips/.chip).
  // Son opcionales: la persona puede pulsar una opción o escribir libremente.
  function clearChips() { var c = elBody.querySelector(".chips"); if (c) c.remove(); }
  function addChips(items) {
    clearChips();
    var c = document.createElement("div"); c.className = "chips";
    items.forEach(function (txt) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = txt;
      b.addEventListener("click", function () { send(txt); });
      c.appendChild(b);
    });
    elBody.appendChild(c); elBody.scrollTop = elBody.scrollHeight;
  }

  // `forced` (string) = texto de un chip pulsado; si no, se toma del input.
  async function send(forced) {
    var msg = (typeof forced === "string" ? forced : elIn.value).trim();
    if (!msg || busy) return;
    clearChips(); // al responder, se quitan las opciones anteriores
    if (typeof forced !== "string") elIn.value = "";
    bubble(msg, "user");
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } // hay actividad: cancela el cierre por inactividad
    var hist = state.msgs.slice(-12); // contexto previo (sin el mensaje actual, que va aparte)
    state.msgs.push({ role: "user", content: msg }); state.ended = false; save();
    busy = true; elSnd.disabled = true; typing(true);
    try {
      var r = await fetch(EP, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.id, message: msg, lang: lang(), history: hist }),
      });
      var d = await r.json(); typing(false);
      var reply = (d && d.reply) || t().err;
      bubble(reply, "bot");
      state.msgs.push({ role: "assistant", content: reply }); save();
      if (d && d.chips && d.chips.length) addChips(d.chips); // opciones para elegir con un clic
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
    var ref = document.querySelector(".nav-ai");           // el botón de Tevi
    if (!ref || !ref.parentNode) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "nav-ai nav-ai-agent";
    b.setAttribute("aria-label", t().open);
    b.innerHTML = SPARK + t().btn;
    b.addEventListener("click", open);
    ref.parentNode.insertBefore(b, ref.nextSibling);
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectButton);
  else injectButton();
})();
