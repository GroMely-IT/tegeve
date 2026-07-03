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
    // Panel minimizado a BARRA horizontal inferior (mientras el agente enseña el
    // sitio: presentación, tour o foco de sección). Se restaura al tocarla.
    + "#taPanel.ta-hidden{display:none!important}"
    + "#taMini{position:fixed;z-index:119;display:none;flex-direction:column;gap:11px;background:#111114;color:#fff;padding:13px 14px;bottom:0;left:0;right:0;border-top:1px solid rgba(255,255,255,.15);animation:taMiniIn .3s ease-out}"
    + "#taMini.on{display:flex}"
    + "@media(min-width:720px){#taMini{left:auto;right:18px;bottom:18px;width:420px;max-width:calc(100vw - 36px);border:1px solid #111114}}"
    + "@keyframes taMiniIn{from{transform:translateY(110%)}to{transform:none}}"
    + "#taMini .ta-mini-head{display:flex;align-items:flex-start;gap:10px}"
    + "#taMini .ta-mini-av{width:34px;height:34px;border-radius:50%;background:var(--red,#E4010A);display:flex;align-items:center;justify-content:center;flex:0 0 auto;position:relative;color:#fff}"
    + "#taMini .ta-mini-av svg{width:17px;height:17px}"
    + "#taMini .ta-mini-av::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--red,#E4010A);opacity:0;animation:taRing 1.4s ease-out infinite}"
    + "#taMini .ta-mini-tx{flex:1;font-size:.9rem;line-height:1.5;color:#f2f0ea;text-align:left;max-height:32vh;overflow-y:auto;padding-top:5px}"
    + "#taMini .ta-mini-btns{display:flex;gap:9px}"
    + "#taMini .ta-mini-next,#taMini .ta-mini-up{border:0;cursor:pointer;font:600 .9rem/1 inherit;padding:12px 14px;display:flex;align-items:center;justify-content:center;white-space:nowrap}"
    + "#taMini .ta-mini-up{flex:1;background:rgba(255,255,255,.14);color:#fff}"
    + "#taMini .ta-mini-up:hover{background:rgba(255,255,255,.22)}"
    + "#taMini .ta-mini-next{flex:1.4;background:var(--red,#E4010A);color:#fff;display:none}"
    + "#taMini .ta-mini-next:hover{background:#B80008}"
    + "#taMini.tour .ta-mini-next{display:flex}"
    + "@media(prefers-reduced-motion:reduce){#taMini{animation:none}#taMini .ta-mini-av::after{animation:none}}"
    // Botón flotante (FAB) del agente: círculo rojo con latido + etiqueta «IA».
    + "#taFab{position:fixed;right:18px;bottom:18px;z-index:118;display:flex;align-items:center;gap:9px;background:none;border:0;cursor:pointer;padding:0}"
    + "#taFab .ta-fab-dot{width:56px;height:56px;border-radius:50%;background:var(--red,#E4010A);color:#fff;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 10px 26px -10px rgba(228,1,10,.55);animation:taBeat 2.4s ease-in-out infinite}"
    + "#taFab .ta-fab-dot svg{width:26px;height:26px}"
    + "#taFab .ta-fab-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--red,#E4010A);opacity:0;animation:taRing 2.4s ease-out infinite}"
    + "@keyframes taBeat{0%,50%,100%{transform:scale(1)}58%{transform:scale(1.08)}66%{transform:scale(1)}73%{transform:scale(1.05)}80%{transform:scale(1)}}"
    + "#taFab .ta-fab-tag{background:#111114;color:#fff;font-size:.72rem;font-weight:600;letter-spacing:.05em;padding:6px 10px;white-space:nowrap}"
    + "#taFab.ta-fab-hide{display:none}"
    + "#taFab:hover .ta-fab-dot{animation-play-state:paused;transform:scale(1.06)}"
    + "@media(prefers-reduced-motion:reduce){#taFab .ta-fab-dot,#taFab .ta-fab-dot::after{animation:none}}"
    // Ventana flotante: la cabecera arrastra el panel (doble clic = volver a su sitio).
    + "#taPanel .ai-head{cursor:grab;user-select:none;-webkit-user-select:none}"
    + "#taPanel.ta-dragging .ai-head{cursor:grabbing}"
    // Modo voz: avatar conversacional que cubre el cuerpo del panel.
    + "#taPanel .ta-voice{position:absolute;left:0;right:0;bottom:0;top:0;background:var(--paper,#FBFAF7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:7;text-align:center;padding:24px;overflow-y:auto;animation:taWel .3s ease}"
    + "#taPanel .ta-v-av{width:96px;height:96px;border-radius:50%;background:var(--red,#E4010A);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:transform .16s ease-out}"
    + "#taPanel .ta-v-av:active{transform:scale(.95)}"
    + "#taPanel .ta-v-av svg{width:42px;height:42px}"
    + "#taPanel .ta-v-av::before,#taPanel .ta-v-av::after{content:'';position:absolute;inset:-9px;border-radius:50%;border:2px solid var(--red,#E4010A);opacity:0;pointer-events:none}"
    + "#taPanel .ta-voice.listen .ta-v-av::before{animation:taRing 1.6s ease-out infinite}"
    + "#taPanel .ta-voice.speak .ta-v-av::before{animation:taRing 1.1s ease-out infinite}"
    + "#taPanel .ta-voice.speak .ta-v-av::after{animation:taRing 1.1s ease-out .55s infinite}"
    + "#taPanel .ta-voice.think .ta-v-av{animation:taThink 1.2s ease-in-out infinite}"
    + "@keyframes taRing{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.5);opacity:0}}"
    + "@keyframes taThink{50%{opacity:.55}}"
    + "#taPanel .ta-v-status{font-weight:600;font-size:.95rem;color:var(--ink,#111114)}"
    + "#taPanel .ta-v-tx{font-size:.88rem;color:#5f5b53;min-height:2.6em;max-width:92%;line-height:1.4}"
    + "#taPanel .ta-v-hint{font-size:.74rem;color:#8a857b}"
    + "#taPanel .ta-v-exit{border:1px solid var(--line,#dcd8cf);background:#fff;color:#5f5b53;padding:7px 14px;cursor:pointer;font-size:.8rem}"
    + "#taPanel .ta-v-exit:hover{border-color:var(--red,#E4010A);color:var(--red,#E4010A)}"
    + "#taPanel .ta-v-form{width:100%;max-width:300px;display:flex;flex-direction:column;gap:8px;margin-top:2px}"
    + "#taPanel .ta-v-form-t{font-size:.9rem;font-weight:600;color:var(--ink,#111114);line-height:1.35}"
    + "#taPanel .ta-v-form input{width:100%;border:1px solid var(--line,#dcd8cf);border-radius:0;background:#fff;color:var(--ink,#111114);padding:11px 12px;font:inherit;font-size:.92rem;box-sizing:border-box}"
    + "#taPanel .ta-v-form input:focus{outline:none;border-color:var(--red,#E4010A)}"
    + "#taPanel .ta-v-form input:disabled{background:#f3f1ec;color:#8a857c}"
    + "#taPanel .ta-v-send{background:var(--red,#E4010A);color:#fff;border:0;border-radius:0;padding:12px 14px;font:inherit;font-weight:700;font-size:.92rem;cursor:pointer;transition:transform .16s ease-out,opacity .2s}"
    + "#taPanel .ta-v-send:active{transform:scale(.97)}"
    + "#taPanel .ta-v-send:disabled{opacity:.6;cursor:default}"
    + "#taPanel .ta-v-form-msg{font-size:.82rem;min-height:1em;color:#5f5b53;line-height:1.35}"
    + "#taPanel .ta-v-form-msg.err{color:var(--red,#E4010A)}"
    + "#taPanel .ta-v-form-msg.ok{color:#127a3e;font-weight:600}"
    + "@media(prefers-reduced-motion:reduce){#taPanel .ta-voice.listen .ta-v-av::before,#taPanel .ta-voice.speak .ta-v-av::before,#taPanel .ta-voice.speak .ta-v-av::after,#taPanel .ta-voice.think .ta-v-av{animation:none;opacity:1}}"
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
      hi: "Hola, soy la agente de TeGeVe. Antes de proponerte nada, me gusta entender el contexto: ¿en qué estás trabajando ahora mismo y qué te trae por aquí?",
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
    es: { h: "Hola, soy la agente de TeGeVe", p: "¿Qué te trae por aquí? Elige una opción o escríbeme.",
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
  panel.innerHTML =
    '<div class="ai-head"><div class="av">' + AV + '</div>'
    + '<div><h4 class="ta-title"></h4><div class="st ta-sub"></div></div>'
    + '<button class="ai-close" id="taClose" type="button" aria-label="Cerrar">&times;</button></div>'
    + '<div class="ai-body" id="taBody"></div>'
    + '<div class="ai-disc ta-disc"></div>'
    + '<div class="ai-foot"><button class="ta-mic" id="taMic" type="button" aria-label="Hablar por voz">' + MIC + '</button>'
    + '<input class="" id="taInput" type="text" autocomplete="off" aria-label="Tu mensaje">'
    + '<button class="ai-send" id="taSend" type="button" aria-label="Enviar">' + SEND + '</button></div>';
  document.body.appendChild(panel);

  // ── BOTÓN FLOTANTE (FAB): entrada al agente siempre a la vista, sobre todo
  //    en móvil. Late como un corazón y la etiqueta deja claro que es una IA. ──
  var FAB_T = { es: "IA de TeGeVe", en: "TeGeVe AI", pt: "IA da TeGeVe", it: "IA di TeGeVe", fr: "IA TeGeVe", de: "TeGeVe-KI" };
  var fabBtn = document.createElement("button");
  fabBtn.type = "button"; fabBtn.id = "taFab";
  fabBtn.setAttribute("aria-label", "Tevi Agent");
  fabBtn.innerHTML = '<span class="ta-fab-tag"></span><span class="ta-fab-dot">' + AV + "</span>";
  document.body.appendChild(fabBtn);
  function fabTag() { fabBtn.querySelector(".ta-fab-tag").textContent = FAB_T[lang()] || FAB_T.es; }
  fabTag();
  function fabSync() { fabBtn.classList.toggle("ta-fab-hide", panel.classList.contains("open") || teviOpen()); }

  // ── PANEL MINIMIZADO: mientras el agente ENSEÑA el sitio (presentación, tour
  //    o foco de sección) el panel se pliega a una barra horizontal inferior para
  //    no tapar lo que está mostrando (clave en móvil). Tocarla lo restaura. ──
  var minOn = false, miniNextFn = null;
  var miniBar = document.createElement("div");
  miniBar.id = "taMini";
  miniBar.setAttribute("role", "button");
  miniBar.innerHTML = '<div class="ta-mini-head"><span class="ta-mini-av">' + AV + '</span><span class="ta-mini-tx"></span></div>'
    + '<div class="ta-mini-btns"><button type="button" class="ta-mini-up"></button><button type="button" class="ta-mini-next"></button></div>';
  document.body.appendChild(miniBar);
  function miniText(t2) { // el texto completo, siempre legible (la barra crece hacia arriba)
    var el2 = miniBar.querySelector(".ta-mini-tx");
    el2.textContent = String(t2 || "").slice(0, 800);
    el2.scrollTop = 0;
  }
  function miniLabels() { // etiquetas claras y en el idioma vigente
    miniBar.querySelector(".ta-mini-next").textContent = tourT().next;
    miniBar.querySelector(".ta-mini-up").textContent = tourT().back;
  }
  function minimize(txt) {
    if (voiceOn) return;                               // el modo voz tiene su propia pantalla
    if (!panel.classList.contains("open") || minOn) { if (txt != null) miniText(txt); return; }
    minOn = true;
    miniLabels();
    panel.classList.add("ta-hidden");
    miniBar.classList.add("on");
    if (txt != null) miniText(txt);
    else {
      var bs = elBody.querySelectorAll(".msg.bot");
      miniText(bs.length ? bs[bs.length - 1].textContent : "");
    }
  }
  function restore() {
    if (!minOn) return;
    minOn = false;
    miniBar.classList.remove("on", "tour");
    panel.classList.remove("ta-hidden");                // el panel vuelve (con su animación)
    elBody.scrollTop = elBody.scrollHeight;
  }
  function miniTour(fn) { miniNextFn = fn || null; miniBar.classList.toggle("tour", !!fn); }
  // «Volver al asistente»: termina la presentación/recorrido y muestra el chat.
  function exitGuided() {
    if (presOn) { presStopAudio(); presOn = false; } // corta la locución de la presentación
    miniTour(null);
    restore();
    setTimeout(function () { try { elIn.focus(); } catch (e) {} }, 250);
  }
  miniBar.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!b) return;                                    // el texto ya no restaura al tocarlo: botones claros
    if (b.classList.contains("ta-mini-next")) { if (miniNextFn) miniNextFn(); }
    else if (b.classList.contains("ta-mini-up")) { exitGuided(); }
  });

  var elBody = panel.querySelector("#taBody");
  var elIn = panel.querySelector("#taInput");
  var elSnd = panel.querySelector("#taSend");
  var started = false, busy = false, idleTimer = null;
  var IDLE_MS = 90000; // tras 90s sin actividad (y ≥2 mensajes), cerramos solos y enviamos el email
  var guided = false;  // navegación guiada en curso (tour/enlace del chat): NO es un abandono
  var tourOffered = false; // el tour se ofrece UNA vez, al principio de la conversación

  // (El WhatsApp de Gabriel lo ofrece el AGENTE dentro de la conversación cuando
  // detecta urgencia — el enlace fijo del pie se quitó porque no aportaba.)
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
    // Opciones de inicio: presentación con voz, tour guiado y los retos típicos.
    tourOffered = true;
    addChips([{ label: presT().chip, fn: startPres }, { label: tourT().start, fn: startTour }].concat(w.s));
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
      // hasOwnProperty: una clave tipo «constructor» no debe pintar basura del prototipo
      var c = Object.prototype.hasOwnProperty.call(cat, k) ? cat[k] : null;
      if (!c || n >= 3) return; n++;
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

  // Los marcadores internos ([[opc]]/[[cita]]/[[ui]]/[[score]]…) nunca deben verse,
  // ni a medio llegar, estén donde estén (se corta desde «[[» al final de la línea).
  function stripMk(s) { return s.replace(/[ \t]*\[\[.*$/gm, ""); }
  // Cierre común de una respuesta del agente: historial, chips, widget, tour/presentación, foco y voz.
  function addBotReply(reply, chips, el, ui, tour, pres) {
    if (el) el.innerHTML = rich(reply); else bubble(reply, "bot");
    state.msgs.push({ role: "assistant", content: reply }); save();
    renderUI(ui);
    if (pres) { setTimeout(startPres, 900); }          // el agente aceptó presentar: arranca con voz
    else if (tour) { setTimeout(startTour, 900); }     // el agente aceptó el tour: arranca solo
    // Los chips que muestre son SOLO los que proponga el agente para ESA respuesta.
    // (Ya NO se fuerza «preséntame TeGeVe / recorrido» encima de la respuesta: si
    // la persona ya está hablando de su reto, ofrecerle la presentación chirría.
    // La presentación se ofrece en la bienvenida, en el saludo proactivo o cuando
    // el propio agente lo cree oportuno.)
    else if (chips && chips.length) addChips(chips);
    // En chat NO se arrastra a la persona por el sitio: el agente enlaza la
    // sección como texto clicable y es ella quien decide ir (el chat sigue visible).
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
          addBotReply(ev.reply || stripMk(acc).trim(), ev.chips || [], el, ev.ui, ev.tour, ev.pres);
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
    if (presOn) { presStopAudio(); presOn = false; } // escribir corta la presentación
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
        addBotReply((d && d.reply) || t().err, (d && d.chips) || [], null, d && d.ui, d && d.tour, d && d.pres);
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
  // Interactuar con el panel (chips, tarjetas, deslizadores de la calculadora…)
  // también es actividad: reinicia el temporizador si estaba en marcha.
  function bumpIdle() { if (idleTimer) scheduleIdleEnd(); }
  elBody.addEventListener("click", bumpIdle);
  elBody.addEventListener("input", bumpIdle);

  // ── Exclusión mutua con Tevi (solo uno abierto) ──
  var teviPanel = document.getElementById("aiPanel");
  function teviOpen() { return teviPanel && teviPanel.classList.contains("open"); }
  function closeTevi() { if (teviOpen()) { var c = document.getElementById("aiClose"); if (c) c.click(); } } // siempre por el handler de Tevi (preserva su estado)
  if (teviPanel && "MutationObserver" in window) {
    new MutationObserver(function () {
      if (teviPanel.classList.contains("open") && panel.classList.contains("open")) close();
      fabSync(); // el FAB se esconde también cuando Tevi está abierto
    }).observe(teviPanel, { attributes: true, attributeFilter: ["class"] });
  }
  fabBtn.addEventListener("click", function () { open(); });
  fabSync();

  function open() {
    closeTevi();                                  // al abrir el Agente, se cierra Tevi
    applyText();
    panel.classList.add("open");
    var fab = document.getElementById("aiFab"); if (fab) fab.classList.add("is-hidden");
    fabSync();
    if (!started) { started = true; replay(); }
    setTimeout(function () { elIn.focus(); }, 250);
  }
  function close() {
    stopVoice(); // si estaba en modo voz, se apagan micro y locución
    if (presOn) { presStopAudio(); presOn = false; } // y la presentación también
    miniTour(null); restore(); // si estaba minimizado, se recoge la barra
    panel.classList.remove("open");
    var fab = document.getElementById("aiFab"); if (fab && !teviOpen()) fab.classList.remove("is-hidden");
    fabSync();
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

  // ── VENTANA FLOTANTE: la cabecera arrastra el panel como una ventana de Mac
  //    (para apartarlo si tapa algo del sitio); doble clic = volver a su esquina.
  //    Solo escritorio; siempre queda un borde visible para poder recuperarla. ──
  (function () {
    var head = panel.querySelector(".ai-head");
    if (!head || !("PointerEvent" in window)) return;
    var drag = null;
    head.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (e.target.closest && e.target.closest("button")) return; // los botones no arrastran
      if (window.innerWidth < 720) return;                         // en móvil no aplica
      var r = panel.getBoundingClientRect();
      drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
      panel.style.left = r.left + "px"; panel.style.top = r.top + "px";
      panel.style.right = "auto"; panel.style.bottom = "auto";
      panel.classList.add("ta-dragging");
      try { head.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    head.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var x = Math.max(60 - panel.offsetWidth, Math.min(e.clientX - drag.dx, window.innerWidth - 60));
      var y = Math.max(0, Math.min(e.clientY - drag.dy, window.innerHeight - 48));
      panel.style.left = x + "px"; panel.style.top = y + "px";
    });
    function endDrag(e) { if (drag && e.pointerId === drag.id) { drag = null; panel.classList.remove("ta-dragging"); } }
    head.addEventListener("pointerup", endDrag);
    head.addEventListener("pointercancel", endDrag);
    head.addEventListener("dblclick", function () { // doble clic: a su esquina de siempre
      panel.style.left = panel.style.top = panel.style.right = panel.style.bottom = "";
    });
  })();

  // ── Eventos ──
  panel.querySelector("#taClose").addEventListener("click", close);
  elSnd.addEventListener("click", send);
  elIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
  // Al salir de verdad de la página se cierra la sesión; las navegaciones GUIADAS
  // (tour, enlaces del chat) no cuentan: la conversación continúa en la otra página.
  window.addEventListener("pagehide", function () { if (!guided) endSession(); });
  // Ocultar la pestaña ya no cierra al instante (mirar el calendario en otra pestaña
  // es normal en plena conversación): solo si sigue oculta 2,5 minutos.
  var hiddenTimer = null;
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (!guided && !hiddenTimer) hiddenTimer = setTimeout(endSession, 150000);
    } else if (hiddenTimer) { clearTimeout(hiddenTimer); hiddenTimer = null; }
  });
  // Cambio de idioma del sitio (incluido el automático por IP): se refrescan los
  // textos del panel y, si la conversación aún no ha empezado (solo bienvenida),
  // se vuelve a pintar la bienvenida en el idioma nuevo.
  // OJO: app.js emite «langchange» en document SIN burbujeo — escuchar en window no sirve.
  function onLangChange() {
    applyText();
    fabTag();
    var hasUser = state.msgs.some(function (m) { return m.role === "user"; });
    if (hasUser || !started) return;               // conversación real en marcha: no se toca
    if (!elBody.querySelector(".ta-welcome")) return;
    state.msgs = []; save();
    elBody.innerHTML = "";
    renderWelcome();
  }
  document.addEventListener("langchange", onLangChange);
  window.addEventListener("languagechange", onLangChange);

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

  // ── MODO VOZ: pulsar el micrófono abre una conversación continua con avatar
  //    (escucha → piensa → habla → vuelve a escuchar). Tocar el avatar interrumpe
  //    al agente o pausa/reanuda la escucha; «Volver al chat» sale del modo voz. ──
  var VLANG = { es: "es-ES", en: "en-US", pt: "pt-BR", it: "it-IT", fr: "fr-FR", de: "de-DE" };
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var micBtn = panel.querySelector("#taMic");
  // El modo LIVE (WebSocket + micrófono) no necesita SpeechRecognition: el micro
  // se oculta solo si no hay NINGUNA vía de voz posible.
  var canLive = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.WebSocket && window.AudioContext);
  if (!SR && !canLive && micBtn) micBtn.style.display = "none";
  var VT = {
    es: { listen: "Te escucho…", think: "Pensando…", speak: "Hablando", pause: "En pausa", hint: "Toca el avatar para interrumpir, pausar o reanudar", exit: "Volver al chat", denied: "No tengo permiso para usar el micrófono. Actívalo en el navegador y vuelve a intentarlo.", formTitle: "Déjame tu nombre y tu email y un asesor de TeGeVe te contacta.", formName: "Tu nombre", formEmail: "Tu email", formSend: "Que me contacten", formSending: "Enviando…", formOk: "¡Gracias, {name}! Un asesor te escribirá muy pronto.", formOkNoName: "¡Gracias! Un asesor te escribirá muy pronto.", formErr: "Escribe un email válido." },
    en: { listen: "I'm listening…", think: "Thinking…", speak: "Speaking", pause: "Paused", hint: "Tap the avatar to interrupt, pause or resume", exit: "Back to chat", denied: "I don't have microphone permission. Enable it in your browser and try again.", formTitle: "Leave your name and email and a TeGeVe advisor will get in touch.", formName: "Your name", formEmail: "Your email", formSend: "Have an advisor contact me", formSending: "Sending…", formOk: "Thanks, {name}! An advisor will write to you very soon.", formOkNoName: "Thanks! An advisor will write to you very soon.", formErr: "Please enter a valid email." },
    pt: { listen: "Estou ouvindo…", think: "Pensando…", speak: "Falando", pause: "Em pausa", hint: "Toque no avatar para interromper, pausar ou retomar", exit: "Voltar ao chat", denied: "Não tenho permissão para usar o microfone. Ative no navegador e tente de novo.", formTitle: "Deixe seu nome e e-mail e um consultor da TeGeVe entra em contato.", formName: "Seu nome", formEmail: "Seu e-mail", formSend: "Quero ser contatado", formSending: "Enviando…", formOk: "Obrigada, {name}! Um consultor vai te escrever muito em breve.", formOkNoName: "Obrigada! Um consultor vai te escrever muito em breve.", formErr: "Digite um e-mail válido." },
    it: { listen: "Ti ascolto…", think: "Sto pensando…", speak: "Parlo", pause: "In pausa", hint: "Tocca l'avatar per interrompere, mettere in pausa o riprendere", exit: "Torna alla chat", denied: "Non ho il permesso di usare il microfono. Attivalo nel browser e riprova.", formTitle: "Lasciami il tuo nome e la tua email e un consulente di TeGeVe ti contatta.", formName: "Il tuo nome", formEmail: "La tua email", formSend: "Fatti contattare", formSending: "Invio…", formOk: "Grazie, {name}! Un consulente ti scriverà molto presto.", formOkNoName: "Grazie! Un consulente ti scriverà molto presto.", formErr: "Inserisci un'email valida." },
    fr: { listen: "Je vous écoute…", think: "Je réfléchis…", speak: "Je parle", pause: "En pause", hint: "Touchez l'avatar pour interrompre, mettre en pause ou reprendre", exit: "Retour au chat", denied: "Je n'ai pas la permission d'utiliser le micro. Activez-la dans le navigateur et réessayez.", formTitle: "Laissez-moi votre nom et votre email et un conseiller TeGeVe vous contacte.", formName: "Votre nom", formEmail: "Votre email", formSend: "Être recontacté", formSending: "Envoi…", formOk: "Merci, {name} ! Un conseiller vous écrira très bientôt.", formOkNoName: "Merci ! Un conseiller vous écrira très bientôt.", formErr: "Saisissez un email valide." },
    de: { listen: "Ich höre zu…", think: "Ich denke nach…", speak: "Ich spreche", pause: "Pausiert", hint: "Tippen Sie auf den Avatar zum Unterbrechen, Pausieren oder Fortsetzen", exit: "Zurück zum Chat", denied: "Ich habe keine Mikrofon-Berechtigung. Bitte im Browser aktivieren und erneut versuchen.", formTitle: "Hinterlassen Sie Name und E-Mail und ein TeGeVe-Berater meldet sich.", formName: "Ihr Name", formEmail: "Ihre E-Mail", formSend: "Kontaktiert werden", formSending: "Senden…", formOk: "Danke, {name}! Ein Berater schreibt Ihnen sehr bald.", formOkNoName: "Danke! Ein Berater schreibt Ihnen sehr bald.", formErr: "Bitte geben Sie eine gültige E-Mail ein." },
  };
  function vt() { return VT[lang()] || VT.es; }
  var voiceOn = false, vBox = null, vrec = null, vPaused = false;
  function vSet(state, status, tx) {
    if (!vBox) return;
    vBox.classList.remove("listen", "think", "speak");
    if (state) vBox.classList.add(state);
    if (status != null) vBox.querySelector(".ta-v-status").textContent = status;
    if (tx != null) vBox.querySelector(".ta-v-tx").textContent = tx;
  }
  function vrecStop() { try { if (vrec) { vrec.onend = null; vrec.stop(); } } catch (e) {} vrec = null; }
  function vListen() {
    if (!voiceOn || vPaused || vrec) return;
    if (idleTimer) scheduleIdleEnd();            // conversar por voz también es actividad
    vSet("listen", vt().listen, "");
    var rec2 = new SR();
    vrec = rec2;
    rec2.lang = VLANG[lang()] || "es-ES";
    rec2.interimResults = true;
    var finalTxt = "";
    rec2.onresult = function (e) {
      var s = "";
      for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      vSet("listen", vt().listen, s);
      if (e.results[e.results.length - 1].isFinal) finalTxt = s;
    };
    rec2.onend = function () {
      if (vrec === rec2) vrec = null;
      if (!voiceOn || vPaused) return;
      var q = finalTxt.trim();
      if (q) { vSet("think", vt().think, "«" + q + "»"); send(q); }
      else vListen();                            // silencio: seguimos escuchando
    };
    rec2.onerror = function (e) {
      if (e && (e.error === "not-allowed" || e.error === "service-not-allowed")) {
        vPaused = true;
        vSet("", vt().denied, "");
      }
    };
    try { rec2.start(); } catch (e) { /* arranque doble: lo reintenta el bucle */ }
  }
  // ── LIVE: conversación de voz en TIEMPO REAL (Gemini Live API por WebSocket).
  //    El worker entrega un token efímero (la clave nunca llega al navegador);
  //    micrófono → PCM 16 kHz → Gemini (audio nativo, misma voz) → 24 kHz al
  //    altavoz, con interrupción natural (barge-in) y transcripciones que entran
  //    al expediente del lead (informe, alertas y seguimiento intactos). ──
  // OJO: con token efímero el método es BidiGenerateContentConstrained (no el normal).
  var LIVE_WS = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";
  var live = null;
  function liveB64FromF32(f, inRate) { // Float32 (inRate) → PCM16 16kHz → base64
    var step = inRate / 16000, n = Math.floor(f.length / step);
    var out = new Uint8Array(n * 2);
    for (var i = 0; i < n; i++) {
      var v = f[Math.floor(i * step)];
      v = Math.max(-1, Math.min(1, v));
      var s2 = v < 0 ? v * 32768 : v * 32767;
      var u = s2 & 0xFFFF;
      out[2 * i] = u & 255; out[2 * i + 1] = (u >> 8) & 255;
    }
    var bin = "";
    for (var j = 0; j < out.length; j++) bin += String.fromCharCode(out[j]);
    return btoa(bin);
  }
  function livePlay(b64) {
    if (!live || !live.pc) return;
    try {
      var bin = atob(b64), n = bin.length >> 1, f = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        var v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
        if (v >= 32768) v -= 65536;
        f[i] = v / 32768;
      }
      var pc = live.pc;
      var buf = pc.createBuffer(1, n, 24000);
      buf.getChannelData(0).set(f);
      var s = pc.createBufferSource();
      s.buffer = buf; s.connect(pc.destination);
      var t0 = Math.max(pc.currentTime + 0.06, live.playT || 0);
      s.start(t0); live.playT = t0 + buf.duration;
      live.srcs.push(s);
      s.onended = function () {
        if (!live) return;
        var ix = live.srcs.indexOf(s); if (ix >= 0) live.srcs.splice(ix, 1);
        if (!live.srcs.length && voiceOn) vSet("listen", vt().listen, "");
      };
    } catch (e) {}
  }
  function liveStopPlayback() {
    if (!live) return;
    live.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} });
    live.srcs = []; live.playT = 0;
  }
  function liveLogTurn() { // fin de turno: transcripciones al chat y al servidor
    if (!live) return;
    var u = live.inTx.trim(), a = live.outTx.trim();
    live.inTx = ""; live.outTx = "";
    if (!u && !a) return;
    if (u) { bubble(u, "user"); state.msgs.push({ role: "user", content: u }); }
    if (a) { bubble(a, "bot"); state.msgs.push({ role: "assistant", content: a }); }
    save();
    // OBJETIVO COMERCIAL: tras pocos intercambios (o en cuanto la agente pide el
    // correo) aparece un recuadro para TECLEAR nombre+email —el email escrito no
    // tiene las erratas de la voz— y que un asesor le contacte.
    if (live && !live.formShown) {
      if (u) live.userTurns = (live.userTurns || 0) + 1;
      var askEmail = a && /\b(e-?mail|correo|mail|courriel|e-post)\b/i.test(a) && (live.userTurns || 0) >= 2;
      if (askEmail || (live.userTurns || 0) >= 3) { live.formShown = true; showLiveForm(); }
    }
    // SIEMPRE se arma el cierre por inactividad (sin esto, una conversación 100%
    // por voz jamás generaba el informe ni los emails al terminar).
    scheduleIdleEnd();
    try {
      fetch(EP, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.id, action: "log", user: u, agent: a, lang: lang() }) }).catch(function () {});
    } catch (e) {}
  }
  // Recuadro para TECLEAR los datos (nombre + email) en el modo voz: el correo
  // escrito evita las erratas de la transcripción. Al enviar, se avisa al comercial.
  function showLiveForm() {
    if (!vBox || vBox.querySelector(".ta-v-form")) return;
    var f = document.createElement("div");
    f.className = "ta-v-form";
    f.innerHTML = '<div class="ta-v-form-t"></div>'
      + '<input class="ta-v-name" type="text" autocomplete="name">'
      + '<input class="ta-v-email" type="email" inputmode="email" autocomplete="email">'
      + '<button type="button" class="ta-v-send"></button>'
      + '<div class="ta-v-form-msg" role="status" aria-live="polite"></div>';
    f.querySelector(".ta-v-form-t").textContent = vt().formTitle;
    f.querySelector(".ta-v-name").placeholder = vt().formName;
    var em = f.querySelector(".ta-v-email"); em.placeholder = vt().formEmail;
    f.querySelector(".ta-v-send").textContent = vt().formSend;
    var go = function () { liveFormSubmit(f); };
    f.querySelector(".ta-v-send").addEventListener("click", go);
    em.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
    var hint = vBox.querySelector(".ta-v-hint");
    if (hint) vBox.insertBefore(f, hint); else vBox.appendChild(f);
    setTimeout(function () { try { f.querySelector(".ta-v-name").focus(); } catch (e) {} }, 120);
  }
  function liveFormSubmit(f) {
    var nameEl = f.querySelector(".ta-v-name"), emEl = f.querySelector(".ta-v-email");
    var msg = f.querySelector(".ta-v-form-msg"), btn = f.querySelector(".ta-v-send");
    var nombre = nameEl.value.trim(), email = emEl.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = "ta-v-form-msg err"; msg.textContent = vt().formErr; try { emEl.focus(); } catch (e) {} return; }
    btn.disabled = true; msg.className = "ta-v-form-msg"; msg.textContent = vt().formSending;
    fetch(EP, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.id, action: "contact", nombre: nombre, email: email, lang: lang() }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function () {
        msg.className = "ta-v-form-msg ok";
        msg.textContent = nombre ? vt().formOk.replace("{name}", nombre) : vt().formOkNoName;
        nameEl.disabled = true; emEl.disabled = true; btn.style.display = "none";
        liveTellContact(nombre, email);   // que la agente lo agradezca y cierre por voz
      })
      .catch(function () { btn.disabled = false; msg.className = "ta-v-form-msg err"; msg.textContent = vt().formErr; });
  }
  function liveTellContact(nombre, email) {
    if (!live || !live.ws || live.ws.readyState !== 1) return;
    try {
      var t = "[SISTEMA] La persona ACABA de dejar sus datos en el formulario en pantalla — nombre: «" + (nombre || "(no lo puso)") + "», email: «" + email + "». Agradéceselo por su nombre en una frase corta y cálida, confírmale que un asesor de TeGeVe le escribirá muy pronto para agendar la reunión y despídete. No pidas más datos ni el email en voz.";
      live.ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: t }] }], turnComplete: true } }));
    } catch (e) {}
  }
  function liveMsg(o) {
    if (!live || !voiceOn) return;
    if (o.setupComplete) { try { console.log("[tevi-live] conectado (tiempo real)"); } catch (e) {} vSet("listen", vt().listen, ""); return; }
    var sc = o.serverContent;
    if (!sc) return;
    if (sc.interrupted) { liveStopPlayback(); liveLogTurn(); vSet("listen", vt().listen, ""); return; }
    if (sc.inputTranscription && sc.inputTranscription.text) { live.inTx += sc.inputTranscription.text; vSet(null, null, live.inTx.slice(-180)); }
    if (sc.outputTranscription && sc.outputTranscription.text) { live.outTx += sc.outputTranscription.text; }
    var parts = (sc.modelTurn && sc.modelTurn.parts) || [];
    var spoke2 = false;
    parts.forEach(function (p) { if (p.inlineData && p.inlineData.data) { livePlay(p.inlineData.data); spoke2 = true; } });
    if (spoke2) vSet("speak", vt().speak, live.outTx.slice(-180));
    if (sc.turnComplete) liveLogTurn();
  }
  function stopLive() {
    if (!live) return;
    var L2 = live; live = null;
    try { if (L2.ws) { L2.ws.onclose = null; L2.ws.close(); } } catch (e) {}
    L2.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} });
    try { if (L2.proc) L2.proc.disconnect(); } catch (e) {}
    try { if (L2.ac) L2.ac.close(); } catch (e) {}
    try { if (L2.pc) L2.pc.close(); } catch (e) {}
    try { if (L2.stream) L2.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
  }
  function startLive(cfg) {
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(function (stream) {
        if (!voiceOn) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        var ws = new WebSocket(LIVE_WS + "?access_token=" + encodeURIComponent(cfg.token));
        live = { ws: ws, stream: stream, inTx: "", outTx: "", playT: 0, srcs: [], muted: false, pc: null, ac: null, proc: null };
        ws.onopen = function () {
          ws.send(JSON.stringify({ setup: {
            model: "models/" + cfg.model,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice || "Kore" } } },
            },
            systemInstruction: { parts: [{ text: cfg.sys || "" }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          } }));
          try {
            var AC = window.AudioContext || window.webkitAudioContext;
            var ac; try { ac = new AC({ sampleRate: 16000 }); } catch (e2) { ac = new AC(); }
            var pc; try { pc = new AC({ sampleRate: 24000 }); } catch (e3) { pc = new AC(); }
            if (!live) return;
            live.ac = ac; live.pc = pc;
            var src = ac.createMediaStreamSource(stream);
            var proc = ac.createScriptProcessor(4096, 1, 1);
            var mute = ac.createGain(); mute.gain.value = 0;
            src.connect(proc); proc.connect(mute); mute.connect(ac.destination);
            live.proc = proc;
            proc.onaudioprocess = function (e) {
              if (!live || live.muted || live.ws.readyState !== 1) return;
              var b64 = liveB64FromF32(e.inputBuffer.getChannelData(0), ac.sampleRate);
              live.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64, mimeType: "audio/pcm;rate=16000" } } }));
            };
          } catch (e4) { stopLive(); if (SR) vListen(); }
        };
        ws.onmessage = function (ev) {
          if (typeof ev.data === "string") { try { liveMsg(JSON.parse(ev.data)); } catch (e) {} }
          else if (ev.data && ev.data.text) ev.data.text().then(function (t2) { try { liveMsg(JSON.parse(t2)); } catch (e) {} });
        };
        ws.onclose = function (ev2) { // fin de sesión Live (límite ~15 min o corte): al bucle clásico
          try { console.log("[tevi-live] cerrado", ev2 && ev2.code, (ev2 && ev2.reason || "").slice(0, 120)); } catch (e) {}
          if (!live) return;
          stopLive();
          if (voiceOn) { if (SR) { vPaused = false; vListen(); } else vSet("", vt().pause, ""); }
        };
        ws.onerror = function () { try { ws.close(); } catch (e) {} };
      })
      .catch(function () { if (voiceOn) { if (SR) vListen(); else vSet("", vt().denied, ""); } });
  }

  function vTap() { // tocar el avatar: interrumpe al agente, o pausa/reanuda la escucha
    if (!voiceOn) return;
    if (live) { // en LIVE: si habla, se le interrumpe; si no, silencia/reactiva el micro
      if (live.srcs.length) { liveStopPlayback(); liveLogTurn(); vSet("listen", vt().listen, ""); return; }
      live.muted = !live.muted;
      vSet(live.muted ? "" : "listen", live.muted ? vt().pause : vt().listen, "");
      return;
    }
    if (curAudio || ("speechSynthesis" in window && speechSynthesis.speaking)) {
      speakGen++; ttsStop(); vPaused = false; vListen(); return;
    }
    if (vrec) { vPaused = true; vrecStop(); vSet("", vt().pause, ""); }
    else { vPaused = false; vListen(); }
  }
  function stopVoice() {
    if (!voiceOn) return;
    voiceOn = false; vPaused = false;
    stopLive();
    speakGen++; ttsStop(); vrecStop();
    if (vBox) { vBox.remove(); vBox = null; }
    if (micBtn) micBtn.classList.remove("on");
    // Si hubo conversación, el cierre por inactividad queda armado (informe/email).
    if (state.msgs.some(function (m) { return m.role === "user"; })) scheduleIdleEnd();
  }
  function startVoice() {
    if (voiceOn || (!SR && !canLive)) return;
    if (presOn) { presStopAudio(); presOn = false; } // el micro releva a la presentación
    voiceOn = true; vPaused = false;
    if (!started) { started = true; replay(); }
    var head = panel.querySelector(".ai-head");
    vBox = document.createElement("div");
    vBox.className = "ta-voice";
    vBox.style.top = ((head && head.offsetHeight) || 56) + "px";
    vBox.innerHTML = '<div class="ta-v-av">' + AV + '</div><div class="ta-v-status"></div><div class="ta-v-tx"></div><div class="ta-v-hint"></div><button type="button" class="ta-v-exit"></button>';
    vBox.querySelector(".ta-v-hint").textContent = vt().hint;
    vBox.querySelector(".ta-v-exit").textContent = vt().exit;
    vBox.querySelector(".ta-v-av").addEventListener("click", vTap);
    vBox.querySelector(".ta-v-exit").addEventListener("click", stopVoice);
    panel.appendChild(vBox);
    if (micBtn) micBtn.classList.add("on");
    // Primero el modo LIVE (tiempo real, barge-in); si no está disponible o el
    // token falla, el bucle clásico escucha→piensa→habla de siempre.
    if (canLive) {
      vSet("think", vt().think, "");
      fetch(EP + "/live-token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.id, lang: lang() }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!voiceOn) return;
          if (d && d.ok && d.token) startLive(d);
          else if (SR) vListen();
          else vSet("", vt().denied, "");
        })
        .catch(function () { if (!voiceOn) return; if (SR) vListen(); else vSet("", vt().denied, ""); });
    } else vListen();
  }
  if (micBtn) micBtn.addEventListener("click", function () { if (voiceOn) stopVoice(); else startVoice(); });

  // ── VOZ DEL AGENTE (solo en modo voz): premium (ElevenLabs vía /tts) si el
  //    servidor la tiene; si no o si falla, la del navegador. Nunca lee URLs. ──
  var ttsPremium = true, curAudio = null; // premium hasta que el servidor diga que no (204)
  function ttsStop() {
    try { speechSynthesis.cancel(); } catch (e) {}
    if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
  }
  var speakGen = 0; // token de generación: una lectura nueva invalida las pendientes
  var speakCb = null; // callback de fin de locución (lo usa la presentación para auto-avanzar)
  function speakEnd(gen) {
    if (gen !== speakGen) return;
    curAudio = null;
    var cb = speakCb; speakCb = null;
    if (cb) { cb(); return; }
    if (voiceOn) { vPaused = false; vListen(); }   // fin de la locución: vuelve a escuchar
  }
  function speakLocal(clean, gen) {
    if (!("speechSynthesis" in window)) { speakEnd(gen); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(clean);
      u.lang = VLANG[lang()] || "es-ES";
      u.onend = u.onerror = function () { speakEnd(gen); };
      speechSynthesis.speak(u);
    } catch (e) { speakEnd(gen); }
  }
  // Fallback al fallar la voz premium. UNA ÚNICA VOZ: en la PRESENTACIÓN nunca se
  // usa la voz del navegador (evita la mezcla de voces); simplemente se avanza (el
  // texto ya está visible en la barra). Fuera de la presentación (modo voz clásico)
  // sí se usa la del navegador como último recurso.
  function speakFallback(clean, gen) { if (presOn) speakEnd(gen); else speakLocal(clean, gen); }
  // Sin voz premium DENTRO de la presentación no usamos la del navegador (evita la
  // mezcla de voces), pero TAMPOCO saltamos en seco: dejamos leer el paso y
  // avanzamos a ritmo de lectura. Así un fallo nunca convierte el recorrido en una
  // «carrera muda» entre secciones.
  function speakEndDwell(gen, clean) {
    if (gen !== speakGen) return;
    var ms = Math.max(5000, Math.min(14000, (clean ? clean.length : 60) * 55));
    setTimeout(function () { speakEnd(gen); }, ms);
  }
  // Locución RESILIENTE. En la presentación un fallo puntual de /tts (p. ej. un 503
  // transitorio del modelo de voz preview) NO debe cortar la narración ni disparar
  // el auto-avance: se reintenta un par de veces y solo entonces se cede.
  function speak(text, cb) {
    if (!voiceOn && !presOn) { if (cb) cb(); return; }
    var clean = String(text).replace(/https?:\/\/\S+/g, "").replace(/\/[a-z0-9\/_#-]{4,}/g, "").trim();
    var gen = ++speakGen;
    speakCb = cb || null;
    if (!clean) { speakEnd(gen); return; }
    vSet("speak", vt().speak, clean.slice(0, 150) + (clean.length > 150 ? "…" : ""));
    if (!ttsPremium) { speakFallback(clean, gen); return; }
    ttsStop();
    var tries = presOn ? 3 : 1; // en la presentación insistimos: un 503 puntual no enmudece el recorrido
    (function attempt() {
      if (gen !== speakGen) return;
      // El audio existe pero el navegador no lo reproduce (autoplay): reintentar la
      // RED no ayuda; cedemos ya (lectura en presentación, voz del navegador fuera).
      function noPlay() {
        if (gen !== speakGen) return;
        if (presOn) speakEndDwell(gen, clean); else speakFallback(clean, gen);
      }
      // Fallo de RED / servidor: reintenta (si procede) o cede con elegancia.
      function again(status) {
        if (gen !== speakGen) return;
        if (!presOn && status === 204) ttsPremium = false; // 204 = este servidor no da voz premium (definitivo)
        var transient = status !== 204;
        if (presOn && transient && tries > 1) { tries--; setTimeout(attempt, 700); return; }
        if (presOn) speakEndDwell(gen, clean); else speakFallback(clean, gen);
      }
      fetch(EP + "/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean.slice(0, 480), lang: lang(), sessionId: state.id }),
      })
        .then(function (r) {
          if (gen !== speakGen) return;
          if (!r.ok || r.status !== 200) { again(r.status); return; } // 204/5xx/4xx
          return r.blob().then(function (b) {
            if (gen !== speakGen) return;
            ttsStop();
            curAudio = new Audio(URL.createObjectURL(b));
            curAudio.onended = function () { speakEnd(gen); };
            curAudio.onerror = noPlay;
            curAudio.play().catch(noPlay);
          });
        })
        .catch(function () { again(0); }); // error de red: transitorio, reintenta
    })();
  }

  // ── TOUR GUIADO: recorrido demo por las secciones clave (multi-página) ──
  // Guion fijo con anclas REALES del sitio; la conversación viaja entre páginas
  // con el mecanismo de co-navegación (CARRY) y el índice del paso en TOUR_KEY.
  var TOUR_KEY = "tgv_agent_tour";
  var TOUR = [
    { u: "/#servicios-overview", x: {
      es: "Déjame contarte una historia. Hace más de treinta años, tres personas en Argentina decidieron que los proyectos tecnológicos más difíciles merecían soluciones de verdad. Hoy eso es TeGeVe: acompañamos a grandes empresas en SAP, Oracle JD Edwards, desarrollo a medida, inteligencia artificial y modernización de sistemas. Empecemos por aquí, y déjame enseñarte por qué encajaríamos contigo.",
      en: "Let me tell you a story. Over thirty years ago, three people in Argentina decided that the toughest technology projects deserved real solutions. Today that is TeGeVe: we support large companies in SAP, Oracle JD Edwards, custom development, artificial intelligence and system modernization. Let us start here, and let me show you why we would be a fit for you.",
      pt: "Deixa eu te contar uma história. Há mais de trinta anos, três pessoas na Argentina decidiram que os projetos de tecnologia mais difíceis mereciam soluções de verdade. Hoje isso é a TeGeVe: acompanhamos grandes empresas em SAP, Oracle JD Edwards, desenvolvimento sob medida, inteligência artificial e modernização de sistemas. Vamos começar por aqui.",
      it: "Lascia che ti racconti una storia. Oltre trent'anni fa, tre persone in Argentina decisero che i progetti tecnologici più difficili meritavano soluzioni vere. Oggi questo è TeGeVe: affianchiamo grandi aziende su SAP, Oracle JD Edwards, sviluppo su misura, intelligenza artificiale e modernizzazione dei sistemi. Partiamo da qui.",
      fr: "Laisse-moi te raconter une histoire. Il y a plus de trente ans, trois personnes en Argentine ont décidé que les projets technologiques les plus difficiles méritaient de vraies solutions. Aujourd'hui, c'est TeGeVe : nous accompagnons de grandes entreprises sur SAP, Oracle JD Edwards, le développement sur mesure, l'intelligence artificielle et la modernisation des systèmes.",
      de: "Lass mich dir eine Geschichte erzählen. Vor über dreißig Jahren entschieden drei Menschen in Argentinien, dass die schwierigsten Technologieprojekte echte Lösungen verdienen. Heute ist das TeGeVe: Wir begleiten große Unternehmen bei SAP, Oracle JD Edwards, Individualentwicklung, künstlicher Intelligenz und Systemmodernisierung. Fangen wir hier an." } },
    { u: "/#por-industria", x: {
      es: "No le hablamos igual a un banco que a una empresa de energía. Por eso trabajamos por sectores: banca y medios de pago, energía, sector público, retail y alimentación. De hecho, seis de las diez mayores compañías de alimentación del mundo confían en nosotros. Cada industria tiene su lenguaje, y nosotros lo hablamos.",
      en: "We do not speak to a bank the way we speak to an energy company. That is why we work by sector: banking and payments, energy, public sector, retail and food. In fact, six of the ten largest food companies in the world trust us. Every industry has its language, and we speak it.",
      pt: "Não falamos com um banco do mesmo jeito que com uma empresa de energia. Por isso trabalhamos por setores: bancos e meios de pagamento, energia, setor público, varejo e alimentos. Aliás, seis das dez maiores empresas de alimentos do mundo confiam em nós. Cada setor tem sua linguagem, e nós a falamos.",
      it: "Non parliamo a una banca come parliamo a un'azienda energetica. Per questo lavoriamo per settori: banche e pagamenti, energia, settore pubblico, retail e alimentare. Anzi, sei delle dieci maggiori aziende alimentari al mondo si affidano a noi. Ogni settore ha il suo linguaggio, e noi lo parliamo.",
      fr: "Nous ne parlons pas à une banque comme à une entreprise d'énergie. C'est pourquoi nous travaillons par secteur : banque et paiements, énergie, secteur public, retail et agroalimentaire. D'ailleurs, six des dix plus grandes entreprises alimentaires du monde nous font confiance. Chaque secteur a son langage, et nous le parlons.",
      de: "Wir sprechen mit einer Bank anders als mit einem Energieunternehmen. Deshalb arbeiten wir nach Branchen: Banken und Zahlungsverkehr, Energie, öffentlicher Sektor, Handel und Lebensmittel. Sechs der zehn größten Lebensmittelkonzerne der Welt vertrauen uns. Jede Branche hat ihre Sprache, und wir sprechen sie." } },
    { u: "/casos/#ia-conciliacion-fci", x: {
      es: "Te cuento un caso que me encanta. Un equipo financiero perdía cuatro días cada mes cuadrando la conciliación de sus fondos de inversión, a mano y con errores. Construimos una solución de inteligencia artificial dentro de su SAP, y ese proceso pasó de cuatro días a unas pocas horas, sin errores. Eso es lo que buscamos: devolverte tiempo y tranquilidad.",
      en: "Here is a case I love. A finance team was losing four days every month reconciling their investment funds by hand, with errors. We built an artificial-intelligence solution inside their SAP, and that process went from four days to a few hours, error-free. That is what we are after: giving you back time and peace of mind.",
      pt: "Vou te contar um caso que eu adoro. Uma equipe financeira perdia quatro dias por mês conciliando seus fundos de investimento na mão, com erros. Construímos uma solução de inteligência artificial dentro do SAP deles, e esse processo passou de quatro dias para poucas horas, sem erros. É isso que buscamos: te devolver tempo e tranquilidade.",
      it: "Ti racconto un caso che adoro. Un team finanziario perdeva quattro giorni al mese per riconciliare i propri fondi di investimento a mano, con errori. Abbiamo costruito una soluzione di intelligenza artificiale dentro il loro SAP, e quel processo è passato da quattro giorni a poche ore, senza errori. È questo che cerchiamo: ridarti tempo e serenità.",
      fr: "Voici un cas que j'adore. Une équipe financière perdait quatre jours par mois à rapprocher ses fonds d'investissement à la main, avec des erreurs. Nous avons construit une solution d'intelligence artificielle dans leur SAP, et ce processus est passé de quatre jours à quelques heures, sans erreurs. C'est ce que nous cherchons : vous rendre du temps et de la sérénité.",
      de: "Ein Fall, den ich liebe. Ein Finanzteam verlor jeden Monat vier Tage mit der manuellen Abstimmung seiner Investmentfonds, fehleranfällig. Wir bauten eine KI-Lösung direkt in ihr SAP, und dieser Prozess ging von vier Tagen auf wenige Stunden, fehlerfrei. Genau darum geht es uns: Ihnen Zeit und Ruhe zurückzugeben." } },
    { u: "/casos/#control-permanencia-offline", x: {
      es: "Y otra historia muy distinta. Inspectores que trabajaban a pie de campo, muchas veces sin cobertura. Les creamos una aplicación móvil que funciona sin conexión y se sincroniza sola al volver la señal. Con ella se completaron más de cuatro mil inspecciones. Da igual el reto: si tiene que ver con tecnología, lo resolvemos.",
      en: "And a very different story. Inspectors working out in the field, often with no signal. We built them a mobile app that works offline and syncs on its own when the signal returns. With it, over four thousand inspections were completed. Whatever the challenge: if it is about technology, we solve it.",
      pt: "E uma história bem diferente. Inspetores que trabalhavam em campo, muitas vezes sem sinal. Criamos para eles um aplicativo móvel que funciona sem conexão e sincroniza sozinho quando o sinal volta. Com ele foram feitas mais de quatro mil inspeções. Não importa o desafio: se é tecnologia, a gente resolve.",
      it: "E una storia molto diversa. Ispettori che lavoravano sul campo, spesso senza copertura. Abbiamo creato per loro un'app mobile che funziona offline e si sincronizza da sola quando torna il segnale. Con essa sono state completate oltre quattromila ispezioni. Qualunque sia la sfida: se riguarda la tecnologia, la risolviamo.",
      fr: "Et une histoire très différente. Des inspecteurs sur le terrain, souvent sans réseau. Nous leur avons créé une application mobile qui fonctionne hors ligne et se synchronise seule au retour du signal. Grâce à elle, plus de quatre mille inspections ont été réalisées. Quel que soit le défi : s'il touche à la technologie, nous le résolvons.",
      de: "Und eine ganz andere Geschichte. Prüfer im Außendienst, oft ohne Empfang. Wir bauten ihnen eine mobile App, die offline funktioniert und sich selbst synchronisiert, sobald das Signal zurück ist. Damit wurden über viertausend Inspektionen durchgeführt. Egal die Herausforderung: Wenn es um Technologie geht, lösen wir sie." } },
    { u: "/servicios/#modelos-de-servicio", x: {
      es: "¿Y cómo trabajaríamos contigo? Como te venga mejor. Podemos llevarte un proyecto llave en mano, montarte una fábrica de software dedicada, sumar perfiles senior a tu propio equipo, o encargarnos del soporte y la evolución de tus sistemas. Nos adaptamos a tu realidad, nunca al revés.",
      en: "And how would we work with you? Whatever suits you best. We can run a turnkey project, set up a dedicated software factory, add senior profiles to your own team, or take care of the support and evolution of your systems. We adapt to your reality, never the other way around.",
      pt: "E como trabalharíamos com você? Do jeito que for melhor pra você. Podemos tocar um projeto chave na mão, montar uma fábrica de software dedicada, somar perfis seniores ao seu time, ou cuidar do suporte e da evolução dos seus sistemas. Nos adaptamos à sua realidade, nunca o contrário.",
      it: "E come lavoreremmo con te? Come preferisci. Possiamo gestire un progetto chiavi in mano, allestire una software factory dedicata, aggiungere profili senior al tuo team, o occuparci del supporto e dell'evoluzione dei tuoi sistemi. Ci adattiamo alla tua realtà, mai il contrario.",
      fr: "Et comment travaillerions-nous avec vous ? Comme cela vous convient le mieux. Nous pouvons mener un projet clé en main, monter une software factory dédiée, ajouter des profils seniors à votre équipe, ou gérer le support et l'évolution de vos systèmes. Nous nous adaptons à votre réalité, jamais l'inverse.",
      de: "Und wie würden wir mit Ihnen arbeiten? Ganz wie es Ihnen passt. Wir übernehmen ein schlüsselfertiges Projekt, bauen eine dedizierte Software Factory auf, ergänzen Ihr Team um erfahrene Profile oder kümmern uns um Support und Weiterentwicklung Ihrer Systeme. Wir passen uns Ihrer Realität an, nie umgekehrt." } },
    { u: "/servicios/#nearshore", x: {
      es: "Y aquí está una de nuestras claves: trabajamos en modalidad nearshore. Equipos en tu misma franja horaria, que hablan tu idioma, con costes eficientes y trato directo, sin intermediarios. La cercanía de tener el equipo al lado, con la solidez de una consultora internacional.",
      en: "And here is one of our keys: we work nearshore. Teams in your own time zone, speaking your language, with efficient costs and direct contact, no middlemen. The closeness of having the team right beside you, with the solidity of an international consultancy.",
      pt: "E aqui está uma das nossas chaves: trabalhamos em modelo nearshore. Equipes no seu fuso horário, que falam a sua língua, com custos eficientes e contato direto, sem intermediários. A proximidade de ter o time do seu lado, com a solidez de uma consultoria internacional.",
      it: "Ed ecco una delle nostre chiavi: lavoriamo in modalità nearshore. Team nel tuo stesso fuso orario, che parlano la tua lingua, con costi efficienti e rapporto diretto, senza intermediari. La vicinanza di avere il team accanto, con la solidità di una società di consulenza internazionale.",
      fr: "Et voici l'une de nos clés : nous travaillons en nearshore. Des équipes sur votre fuseau horaire, qui parlent votre langue, avec des coûts maîtrisés et un contact direct, sans intermédiaires. La proximité d'avoir l'équipe à vos côtés, avec la solidité d'un cabinet international.",
      de: "Und hier ist einer unserer Schlüssel: Wir arbeiten nearshore. Teams in Ihrer Zeitzone, die Ihre Sprache sprechen, mit effizienten Kosten und direktem Kontakt, ohne Zwischenhändler. Die Nähe eines Teams an Ihrer Seite, mit der Solidität einer internationalen Beratung." } },
    { u: "/nosotros/#nuestra-historia", x: {
      es: "Detrás de todo esto hay más de treinta años de trayectoria, oficinas en cuatro países y equipos senior que se quedan. Somos partners de SAP, Oracle e IBM, con nivel tres de madurez CMMI. Más de ochenta clientes en dieciséis países ya nos han confiado sus proyectos más críticos.",
      en: "Behind all of this: over thirty years of track record, offices in four countries and senior teams that stay. We are partners of SAP, Oracle and IBM, with CMMI maturity level three. More than eighty clients in sixteen countries have already trusted us with their most critical projects.",
      pt: "Por trás de tudo isso: mais de trinta anos de trajetória, escritórios em quatro países e equipes seniores que ficam. Somos parceiros de SAP, Oracle e IBM, com nível três de maturidade CMMI. Mais de oitenta clientes em dezesseis países já nos confiaram seus projetos mais críticos.",
      it: "Dietro tutto questo: oltre trent'anni di percorso, uffici in quattro paesi e team senior che restano. Siamo partner di SAP, Oracle e IBM, con livello tre di maturità CMMI. Più di ottanta clienti in sedici paesi ci hanno già affidato i loro progetti più critici.",
      fr: "Derrière tout cela : plus de trente ans d'expérience, des bureaux dans quatre pays et des équipes seniors qui restent. Nous sommes partenaires de SAP, Oracle et IBM, avec le niveau trois de maturité CMMI. Plus de quatre-vingts clients dans seize pays nous ont déjà confié leurs projets les plus critiques.",
      de: "Hinter all dem: über dreißig Jahre Erfahrung, Büros in vier Ländern und erfahrene Teams, die bleiben. Wir sind Partner von SAP, Oracle und IBM, mit CMMI-Reifegrad drei. Mehr als achtzig Kunden in sechzehn Ländern haben uns bereits ihre kritischsten Projekte anvertraut." } },
    { u: "/nosotros/#testimonios-clientes", x: {
      es: "Pero no tienes que creerme solo a mí. Aquí puedes leer lo que cuentan quienes ya trabajan con nosotros: empresas que llegaron con un problema difícil y se quedaron porque cumplimos. Esa confianza, año tras año, es lo que mejor nos define.",
      en: "But you do not have to take just my word for it. Here you can read what those already working with us say: companies that came with a hard problem and stayed because we delivered. That trust, year after year, is what defines us best.",
      pt: "Mas você não precisa acreditar só em mim. Aqui você pode ler o que dizem quem já trabalha com a gente: empresas que chegaram com um problema difícil e ficaram porque cumprimos. Essa confiança, ano após ano, é o que melhor nos define.",
      it: "Ma non devi credere solo a me. Qui puoi leggere cosa raccontano quelli che già lavorano con noi: aziende arrivate con un problema difficile e rimaste perché abbiamo mantenuto le promesse. Questa fiducia, anno dopo anno, è ciò che ci definisce meglio.",
      fr: "Mais vous n'avez pas à me croire sur parole. Vous pouvez lire ici ce que disent ceux qui travaillent déjà avec nous : des entreprises arrivées avec un problème difficile et restées parce que nous avons tenu parole. Cette confiance, année après année, est ce qui nous définit le mieux.",
      de: "Aber Sie müssen nicht nur mir glauben. Hier lesen Sie, was jene sagen, die schon mit uns arbeiten: Unternehmen, die mit einem schwierigen Problem kamen und blieben, weil wir liefern. Dieses Vertrauen, Jahr für Jahr, definiert uns am besten." } },
    { u: "/#contacto-titulo", x: {
      es: "Y así llegamos al final del recorrido, aquí, justo en el punto de partida de tu propia historia con nosotros.",
      en: "And so we reach the end of the tour, right here, at the starting point of your own story with us.",
      pt: "E assim chegamos ao fim do passeio, bem aqui, no ponto de partida da sua própria história com a gente.",
      it: "E così arriviamo alla fine del percorso, proprio qui, al punto di partenza della tua storia con noi.",
      fr: "Et nous voici à la fin de la visite, ici même, au point de départ de votre propre histoire avec nous.",
      de: "Und so erreichen wir das Ende der Tour, genau hier, am Ausgangspunkt Ihrer eigenen Geschichte mit uns." } },
  ];
  var TOUR_T = {
    es: { start: "Recorrido rápido (sin voz)", next: "Siguiente →", stop: "Terminar", back: "Volver al asistente",
      end: "Después de todo lo que has visto, estoy convencido de que somos la consultora que puede ayudarte. Cuéntame tu reto y te propongo el mejor siguiente paso: una videollamada de 45 minutos con Gabriel, nuestro Director, para verlo sobre tu caso.",
      endChips: ["Te cuento mi reto", "Quiero una reunión con Gabriel"] },
    en: { start: "Quick tour (no audio)", next: "Next →", stop: "End", back: "Back to the assistant",
      end: "After everything you've seen, I'm convinced we're the consultancy that can help you. Tell me your challenge and I'll propose the best next step: a 45-minute video call with Gabriel, our Director, to look at your case.",
      endChips: ["Let me tell you my challenge", "I'd like a meeting with Gabriel"] },
    pt: { start: "Tour rápido (sem voz)", next: "Próximo →", stop: "Encerrar", back: "Voltar ao assistente",
      end: "Depois de tudo o que você viu, estou convencido de que somos a consultoria que pode te ajudar. Conte-me seu desafio e eu proponho o melhor próximo passo: uma videochamada de 45 minutos com o Gabriel, nosso Diretor, para ver o seu caso.",
      endChips: ["Vou contar meu desafio", "Quero uma reunião com o Gabriel"] },
    it: { start: "Tour rapido (senza voce)", next: "Avanti →", stop: "Termina", back: "Torna all\u2019assistente",
      end: "Dopo tutto quello che hai visto, sono convinto che siamo la società di consulenza che può aiutarti. Raccontami la tua sfida e ti propongo il miglior passo successivo: una videochiamata di 45 minuti con Gabriel, il nostro Direttore, per vedere il tuo caso.",
      endChips: ["Ti racconto la mia sfida", "Vorrei un incontro con Gabriel"] },
    fr: { start: "Visite rapide (sans voix)", next: "Suivant →", stop: "Terminer", back: "Revenir à l\u2019assistant",
      end: "Après tout ce que vous avez vu, je suis convaincu que nous sommes le cabinet qui peut vous aider. Décrivez-moi votre défi et je vous propose la meilleure étape suivante : un appel vidéo de 45 minutes avec Gabriel, notre Directeur, pour étudier votre cas.",
      endChips: ["Je vous décris mon défi", "Je veux une réunion avec Gabriel"] },
    de: { start: "Kurze Tour (ohne Ton)", next: "Weiter →", stop: "Beenden", back: "Zurück zum Assistenten",
      end: "Nach allem, was Sie gesehen haben, bin ich überzeugt, dass wir die Beratung sind, die Ihnen helfen kann. Schildern Sie mir Ihre Herausforderung und ich schlage den besten nächsten Schritt vor: einen 45-minütigen Videocall mit Gabriel, unserem Direktor, um Ihren Fall anzusehen.",
      endChips: ["Ich schildere meine Herausforderung", "Ich möchte ein Treffen mit Gabriel"] },
  };
  function tourT() { return TOUR_T[lang()] || TOUR_T.es; }
  function tourNarr(s) { return s.x[lang()] || s.x.es; }
  // MODO PRESENTACIÓN: el mismo recorrido, pero narrado EN VOZ con auto-avance
  // (como un comercial presentando la compañía); al final pregunta la necesidad
  // y propone la reunión (mensaje y chips de cierre del tour).
  var presOn = false;
  var PRES_T = {
    es: { chip: "Preséntame TeGeVe (con voz)", intro: "Encantada. Te presento TeGeVe en un par de minutos, como en una primera reunión: breve y al grano. Vamos allá." },
    en: { chip: "Introduce me to TeGeVe (with voice)", intro: "My pleasure. Let me introduce TeGeVe in a couple of minutes, like a first meeting: brief and to the point. Here we go." },
    pt: { chip: "Apresente-me a TeGeVe (com voz)", intro: "Com prazer. Vou apresentar a TeGeVe em alguns minutos, como numa primeira reunião: breve e direto ao ponto. Vamos lá." },
    it: { chip: "Presentami TeGeVe (con voce)", intro: "Con piacere. Ti presento TeGeVe in un paio di minuti, come in un primo incontro: breve e al punto. Cominciamo." },
    fr: { chip: "Présentez-moi TeGeVe (avec la voix)", intro: "Avec plaisir. Je vous présente TeGeVe en quelques minutes, comme lors d'un premier rendez-vous : bref et précis. C'est parti." },
    de: { chip: "Stellen Sie mir TeGeVe vor (mit Stimme)", intro: "Sehr gern. Ich stelle Ihnen TeGeVe in wenigen Minuten vor, wie in einem ersten Gespräch: kurz und auf den Punkt. Los geht's." },
  };
  function presT() { return PRES_T[lang()] || PRES_T.es; }
  function presStopAudio() { speakGen++; speakCb = null; ttsStop(); }
  // Precarga el audio de una frase (calienta la caché del edge): así el paso
  // siguiente suena al instante y siempre con la misma voz.
  function warmTts(text) {
    try {
      fetch(EP + "/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: String(text).replace(/https?:\/\/\S+/g, "").trim().slice(0, 480), lang: lang(), sessionId: state.id }),
      }).then(function (r) { try { if (r.body && r.body.cancel) r.body.cancel(); } catch (e) {} }).catch(function () {});
    } catch (e) {}
  }
  function tourShow(i) { // narración + foco + controles del paso i (ya en su página)
    var s = TOUR[i]; if (!s) return tourEnd();
    var hash = s.u.split("#")[1] || "";
    bubble(tourNarr(s), "bot");
    state.msgs.push({ role: "assistant", content: tourNarr(s) }); save();
    if (hash) setTimeout(function () { spotlight(hash, true); }, 400);
    var last = i === TOUR.length - 1;
    var advance = function () { if (presOn) presStopAudio(); if (last) tourEnd(); else tourStep(i + 1); };
    var chips = [{ label: last ? tourT().stop : tourT().next, fn: advance }];
    if (!last) chips.push({ label: tourT().stop, fn: function () { if (presOn) presStopAudio(); tourEnd(); } });
    addChips(chips);
    // Mientras se enseña el sitio, el panel va minimizado con la narración a la
    // vista y el botón de avanzar en la propia barra.
    minimize(tourNarr(s));
    miniTour(advance);
    // En presentación: se narra el paso y, al terminar la voz, avanza solo.
    // Mientras suena, se precarga el audio del paso siguiente (o del cierre).
    if (presOn) {
      speak(tourNarr(s), function () { setTimeout(function () { if (presOn) { if (last) tourEnd(); else tourStep(i + 1); } }, 700); });
      // La precarga del SIGUIENTE audio NO debe competir con la locución en curso:
      // dos /tts pesados a la vez cargaban el modelo de voz y provocaban 503. Se
      // lanza con la voz ya empezada (para el auto-avance da tiempo de sobra).
      var nextText = last ? tourT().end : tourNarr(TOUR[i + 1]);
      setTimeout(function () { if (presOn) warmTts(nextText); }, 1800);
    }
  }
  function tourStep(i) {
    var s = TOUR[i]; if (!s) return tourEnd();
    var path = s.u.split("#")[0] || "/";
    if (normPath(path) === normPath(location.pathname)) { tourShow(i); return; }
    var ok = false;
    try {
      sessionStorage.setItem(TOUR_KEY, JSON.stringify({ i: i, p: presOn ? 1 : 0 }));
      sessionStorage.setItem(CARRY, JSON.stringify({ state: state, hash: "" }));
      ok = true;
    } catch (e) {}
    if (ok) {
      guided = true;               // navegación guiada: no cierra la sesión
      setTimeout(function () { guided = false; }, 4000); // por si la navegación no llega a ocurrir
      location.href = s.u;         // otra página: la conversación y el tour/presentación viajan
    } else tourEnd();              // sin sessionStorage no podemos cruzar de página
  }
  function tourEnd() {
    clearChips();
    bubble(tourT().end, "bot");
    state.msgs.push({ role: "assistant", content: tourT().end }); save();
    addChips(tourT().endChips);
    // Fin del recorrido: el panel vuelve para el cierre (reto/cita a un clic).
    miniTour(null);
    restore();
    elBody.scrollTop = elBody.scrollHeight;
    // Cierre comercial hablado; al terminar, la presentación se apaga.
    if (presOn) speak(tourT().end, function () { presOn = false; });
  }
  function startTour() {
    if (presOn) { presStopAudio(); presOn = false; }
    clearChips();
    var w = elBody.querySelector(".ta-welcome"); if (w) w.remove();
    tourStep(0);
  }
  function startPres() {
    presStopAudio();
    presOn = true;
    clearChips();
    var w = elBody.querySelector(".ta-welcome"); if (w) w.remove();
    var intro = presT().intro;
    bubble(intro, "bot");
    state.msgs.push({ role: "assistant", content: intro }); save();
    minimize(intro); // desde la intro, el sitio queda a la vista
    // Al terminar la locución de apertura arranca el recorrido; si el audio no
    // llega a sonar (autoplay bloqueado), la red de seguridad avanza igual.
    var advanced = false;
    var go = function () { if (!advanced && presOn) { advanced = true; tourStep(0); } };
    // La voz premium (/tts) exige una sesión registrada en el servidor y la
    // presentación es 100% de cliente: se registra primero (barato, sin modelo)
    // y DESPUÉS se habla. Si el registro falla, se habla igual (voz del navegador).
    var spoke = false;
    var talk = function () { if (spoke || !presOn) return; spoke = true; speak(intro, go); setTimeout(function () { if (presOn) warmTts(tourNarr(TOUR[0])); }, 1800); };
    try {
      fetch(EP, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.id, action: "touch", seed: intro, lang: lang() }),
      }).then(talk, talk);
    } catch (e) { talk(); }
    setTimeout(talk, 2500);  // por si la red va lenta: nunca nos quedamos mudos
    setTimeout(go, 18000);   // y nunca clavados en la intro
  }

  // ── CO-NAVEGACIÓN: el agente te lleva a la sección exacta (scroll + foco) ──
  var CARRY = "tgv_agent_carry"; // traslada la conversación SOLO en navegaciones guiadas por el agente
  function normPath(p) {
    p = (p || "/").split("#")[0].split("?")[0];
    if (p.charAt(p.length - 1) !== "/") p += "/";
    return p.replace(/index\.html\/$/, "");
  }
  // spot(id, guiado): resalta una sección. Solo minimiza el chat cuando el
  // recorrido es GUIADO (presentación/tour). En una charla normal el chat SIEMPRE
  // queda a la vista: nunca se minimiza ni se arrastra a la persona por el sitio.
  function spotlight(id, guiado) {
    var el = id && document.getElementById(id);
    if (!el) return false;
    if (guiado) minimize(); // solo en presentación/tour se aparta el panel
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
      guided = true;                                   // navegación guiada: no cierra la sesión
      setTimeout(function () { guided = false; }, 4000);
      location.href = href;                            // otra página: la conversación viaja contigo
    }
  });
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
      var tj = null;
      if (ti != null) { try { tj = JSON.parse(ti); } catch (e3) { tj = { i: +ti || 0 }; } }
      setTimeout(function () {
        open();
        if (tj) {
          presOn = !!tj.p; // la presentación con voz continúa en la página nueva
          setTimeout(function () { tourShow(tj.i || 0); }, 450);
        } else if (c.hash) setTimeout(function () { spotlight(c.hash); }, 500);
      }, 350);
    } catch (e) {}
  })();

  // ── APERTURA PROACTIVA: Tevi Agent saluda solo, según la página. Puede
  //    saludar también al navegar a OTRAS páginas (una vez por página), con un
  //    tope de 3 aperturas por sesión de navegación para no resultar pesado. ──
  var PRO_KEY = "tgv_agent_pro2";
  var proState = { n: 0, pages: {} };
  try { var _ps = JSON.parse(sessionStorage.getItem(PRO_KEY) || "0"); if (_ps && _ps.pages) proState = _ps; } catch (e) {}
  var proDone = proState.n >= 3 || !!proState.pages[normPath(location.pathname)];
  function proactive() {
    if (proDone || busy || started || state.msgs.length) return;
    if (panel.classList.contains("open") || teviOpen()) return;
    proDone = true;
    proState.n++; proState.pages[normPath(location.pathname)] = 1;
    try { sessionStorage.setItem(PRO_KEY, JSON.stringify(proState)); } catch (e) {}
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
          // El saludo proactivo ofrece la presentación y el tour como primeras opciones.
          tourOffered = true;
          addChips([{ label: presT().chip, fn: startPres }, { label: tourT().start, fn: startTour }].concat((d.chips && d.chips.length) ? d.chips : wel().s));
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
