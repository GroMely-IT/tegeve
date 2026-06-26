const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

const burger = document.getElementById('burger'), navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => { const show = navLinks.classList.toggle('show'); burger.setAttribute('aria-expanded', String(show)); });
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('show')));
document.getElementById('year').textContent = new Date().getFullYear();

/* Efecto imán: el botón/icono se atrae suavemente hacia el cursor */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.nav-cta, .nav-li').forEach(function(el){
    var s = el.classList.contains('nav-li') ? 0.5 : 0.35;
    el.addEventListener('pointermove', function(e){
      var r = el.getBoundingClientRect();
      var mx = e.clientX - (r.left + r.width / 2);
      var my = e.clientY - (r.top + r.height / 2);
      el.style.transform = 'translate(' + (mx * s).toFixed(1) + 'px,' + (my * s).toFixed(1) + 'px)';
    });
    el.addEventListener('pointerleave', function(){ el.style.transform = ''; });
  });
})();
(function(){var i=document.getElementById('intro');if(!i)return;var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;if(sessionStorage.getItem('tgvIntro')||rm){i.remove();return;}sessionStorage.setItem('tgvIntro','1');var c=function(){i.classList.add('out');setTimeout(function(){i.remove();},700);};setTimeout(c,1500);i.addEventListener('click',c);})();

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
}, {threshold:.14, rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* Línea de tiempo "La Columna": relleno del eje + año activo en el riel */
(function(){
  var tl = document.querySelector('.ns-tl');
  if(!tl) return;
  var fill = document.querySelector('.ns-tl-fill');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ if(fill) fill.style.height='100%'; }
  else if(fill){
    var ticking=false;
    function updateFill(){
      var r=tl.getBoundingClientRect();
      var p=(window.innerHeight*0.55 - r.top)/r.height;
      p=Math.max(0,Math.min(1,p));
      fill.style.height=(p*100)+'%';
    }
    window.addEventListener('scroll',function(){ if(ticking)return; ticking=true; requestAnimationFrame(function(){updateFill();ticking=false;}); },{passive:true});
    window.addEventListener('resize',updateFill,{passive:true});
    updateFill();
  }
  var rail=document.querySelector('.ns-tl-rail');
  if(rail){
    var items=rail.querySelectorAll('[data-year]');
    var rio=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting)return;
        var y=e.target.dataset.year;
        items.forEach(function(s){ s.classList.toggle('is-active', s.dataset.year===y); });
      });
    },{rootMargin:'-45% 0px -45% 0px',threshold:0});
    document.querySelectorAll('.ns-tl-row').forEach(function(r){ rio.observe(r); });
  }
})();

const cio = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count, suffix = el.dataset.suffix || '';
    let cur = 0; const step = Math.max(1, Math.ceil(target/40));
    const tick = () => { cur = Math.min(target, cur+step); el.textContent = cur+suffix; if (cur<target) requestAnimationFrame(tick); };
    tick(); cio.unobserve(el);
  });
}, {threshold:.6});
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

const blobs = document.querySelectorAll('.blob');
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    if (y < window.innerHeight) blobs.forEach(b => { b.style.transform = `translateY(${y * (+b.dataset.speed||0.1)}px)`; });
    ticking = false;
  });
}, {passive:true});

const pinTrack = document.getElementById('pinTrack');
const steps = [...document.querySelectorAll('.pin-step')];
const pinNum = document.getElementById('pinNum');
const pinBars = [...document.querySelectorAll('#pinProgress i')];
let lastStep = -1, pinTO;
function updatePin(){
  if(!pinTrack) return;
  const r = pinTrack.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  const p = Math.min(1, Math.max(0, -r.top / total));
  const idx = Math.min(steps.length-1, Math.floor(p * steps.length));
  if (idx !== lastStep){
    lastStep = idx;
    steps.forEach((s,i)=>s.classList.toggle('active', i===idx));
    pinBars.forEach((b,i)=>b.classList.toggle('on', i<=idx));
    pinNum.style.opacity = 0;
    clearTimeout(pinTO);
    pinTO = setTimeout(()=>{ pinNum.textContent = '0'+(idx+1); pinNum.style.opacity = 1; }, 180);
  }
}
window.addEventListener('scroll', updatePin, {passive:true});
updatePin();

const mq = document.getElementById('marquee');
if(mq) mq.innerHTML += mq.innerHTML;

const faqItems = [...document.querySelectorAll('.faq-item')];
faqItems.forEach(item => {
  const q = item.querySelector('.faq-q'), a = item.querySelector('.faq-a');
  q.setAttribute('aria-expanded', 'false');
  q.addEventListener('click', () => {
    const open = item.classList.contains('open');
    faqItems.forEach(o => { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null; o.querySelector('.faq-q').setAttribute('aria-expanded','false'); });
    if (!open){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; q.setAttribute('aria-expanded','true'); }
  });
});
let faqRT;
window.addEventListener('resize', () => { clearTimeout(faqRT); faqRT = setTimeout(() => { const o = document.querySelector('.faq-item.open .faq-a'); if (o) o.style.maxHeight = o.scrollHeight + 'px'; }, 150); }, {passive:true});
document.querySelectorAll('.faq-cat').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.faq-cat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    faqItems.forEach(item => {
      const show = cat === 'all' || item.dataset.cat === cat;
      item.style.display = show ? '' : 'none';
      item.classList.remove('open'); item.querySelector('.faq-a').style.maxHeight = null;
    });
  });
});

/* Asistente IA — base de conocimiento construida desde el FAQ (fuente única de verdad) */
/* IA generativa GRATIS: pega aquí la URL del Cloudflare Worker (ver carpeta /worker) para
   activarla. Si queda vacío o falla, el asistente responde con búsqueda local sobre el FAQ. */
// En el Worker unificado (*.workers.dev) la IA va en el mismo origen → sin CORS.
// En cualquier otro sitio (github.io, localhost) usamos el Worker independiente.
const AI_ENDPOINT = (typeof location !== 'undefined' && location.hostname.endsWith('.workers.dev'))
  ? '/api/tevi'
  : 'https://tegeve-asistente.gabrielgrosso.workers.dev';
function buildKB(){ return faqItems.map(item => ({
  q: item.querySelector('.faq-q').textContent.replace('+','').trim(),
  a: item.querySelector('.faq-a-inner').innerHTML.trim(),
  kw: (item.dataset.keywords || '') + ' ' + item.querySelector('.faq-q').textContent.toLowerCase()
})); }
let KB = buildKB();
document.addEventListener('langchange', function(){ KB = buildKB(); });
function tlang(){ return (window.__lang === 'en') ? 'en' : 'es'; }
function stripHtml(h){ var d=document.createElement('div'); d.innerHTML=h; return (d.textContent||'').replace(/\s+/g,' ').trim(); }
function ctxClean(t){ return (t||'').replace(/\s+/g,' ').trim(); }
function ctxSection(sel){ var el=document.querySelector(sel); return el ? ctxClean(el.textContent) : ''; }
function ctxCases(){
  return [].slice.call(document.querySelectorAll('#casos .case')).map(function(c){
    var g=function(s){ return ctxClean((c.querySelector(s)||{}).textContent); };
    var reto=ctxClean((c.querySelector('.case-detail p')||{}).textContent);
    if(reto.length>160) reto=reto.slice(0,160)+'…';
    return '- ['+g('.case-svc')+' · '+g('.case-sector')+'] '+g('h3')+' — '+g('.case-client')+(g('.case-metric')?' ('+g('.case-metric')+')':'')+'. '+reto;
  }).join('\n');
}
// Base de conocimiento CANÓNICA: se envía SIEMPRE, esté el usuario en la
// página que esté (la web es multipágina y cada página solo ve su propio
// DOM). Incluye al equipo para responder "¿quién es X?".
var TEVI_KB = [
'# TeGeVe — datos de empresa',
'TeGeVe (también TGV) es una consultora tecnológica con más de 30 años de trayectoria. Eslogan: "Transformamos los proyectos tecnológicos más desafiantes en soluciones innovadoras". Opera desde España (Málaga), Argentina (Buenos Aires) y Estados Unidos; contacto comercial también en México. Proyectos en más de 16 países. Modalidad nearshore o en las oficinas del cliente. Equipo cualificado y multidisciplinar.',
'# Equipo de TeGeVe',
'Dirección: Osvaldo Tessio (Director, cofundador), Ernesto Galindez (Director, cofundador), Marta Vicena (Directora, cofundadora) y Gabriel Grosso (Director de TeGeVe).',
'Responsables de área: Fernando García (SAP), Julieta Vegas (Oracle ERPs), Fernando Baztarrica (Web Business Solutions), Jose Jaliff (IA Empresarial), Jorge Bessone (Desarrollo para Servicios Financieros), María Amelia Rojas (Recursos Humanos), José Luis Cárcamo (Calidad y Procesos), Mariano Attanasio (Administración y Finanzas), Carlos Rasch (Ventas y Marketing) y Gustavo Palmieri (IT).',
'Mercados: Fernando García (TGV Argentina), Adriana Barbera (TGV México) y Hugo Rabinovich (TGV Americas).',
'# Servicios',
'(1) Desarrollo de software a medida e integración; (2) Consultoría SAP, incluido el salto a SAP S/4HANA (BTP, Fiori, HANA, ABAP, CPI); (3) Oracle JD Edwards (EnterpriseOne y World): implementación, upgrades, Orchestrator y soporte; (4) IA Empresarial y BI: agentes de IA, RPA, automatización y analítica (caso real: conciliación de fondos de inversión, de 4 días a horas); (5) Assessment: evaluaciones y auditorías para optimizar costes; (6) Industria financiera y modernización de legacy (COBOL, AS/400, DB2).',
'Modelos de servicio: implementación a medida, AMS (soporte evolutivo), Software Factory, Testing Factory, Staff Augmentation, Assessment y nearshore.',
'# Reconocimientos y alianzas',
'CMMI Nivel 3, firmantes del Pacto Global de la ONU, miembros de Polo IT Buenos Aires y de CESSI. Partner de SAP, Oracle e IBM. Referencias: Motta Internacional, Weatherford, Abertis/Autopistas del Oeste, Banco Itaú, Banco Comafi, Kimberly-Clark, Nutrien, First Data.',
'# Historia e hitos de TeGeVe',
'TeGeVe (TGV) fue FUNDADA en 1992 en Argentina por Osvaldo Tessio, Ernesto Galindez y Marta Vicena. Hitos: 1992 fundación en Argentina; 2002 primer contacto internacional (Phillip Morris, México); 2004 primer Service Partner de SAP; 2006 inicio de la adhesión al estándar CMMI; 2010 primera oficina internacional en Monterrey, México (con el nombre Soinf); 2014 oficina en Florida, EE. UU. (TGVAmericas); 2021 llegada a Málaga, España, como TeGeVe —comienza el capítulo español del Grupo TGV—; 2022 30 años y 6.ª evaluación del modelo CMMI; 2024 programa Horizonte (empoderamiento del equipo directivo, multiculturalidad y evolución tecnológica); 2025 nivel de madurez 3 en el CMMI DEV Benchmark Appraisal; 2026 paso firme en el mercado internacional.',
'# Dónde ampliar la información en la web',
'Historia, equipo, valores y reconocimientos: página Nosotros, en /nosotros/. Servicios: el resumen en /servicios/ y cada servicio con su detalle en /servicios/sap/, /servicios/oracle-jd-edwards/, /servicios/ia-empresarial/ y /servicios/desarrollo-a-medida/. Casos de éxito, sectores y clientes: /casos/. Contacto y oficinas: /contacto/. Preguntas frecuentes: la página de inicio.',
'# Contacto',
'Datos de contacto públicos por país (facilítalos directamente cuando los pidan):',
'- España: teléfono +34 952 569 582, correo info@tegeve.es (oficina en Málaga).',
'- Argentina: teléfono +54 11 5767-7477, correo info@tgv.com.ar (oficina en Buenos Aires).',
'- México: teléfono +52 81 2092 2323, correo info@tgv-group.com.',
'- Estados Unidos: teléfono +1 561 306-5121, correo info@tgvamericas.net (Florida).',
'Correo general del grupo: info@tegeve.es. La página de contacto y las oficinas están en /contacto/.'
].join('\n');

function siteContext(){
  var faq = KB.map(function(k){ return 'P: '+k.q+'\nR: '+stripHtml(k.a); }).join('\n\n');
  var blocks = [
    TEVI_KB,
    '# Preguntas frecuentes\n'+faq,
    '# Contacto (web)\n'+ctxSection('#contacto'),
    '# Sobre TeGeVe y su equipo\n'+ctxSection('#nosotros'),
    '# Servicios (detalle)\n'+[ctxSection('#servicios'),ctxSection('#sap'),ctxSection('#jde'),ctxSection('#ia'),ctxSection('#desarrollo')].filter(Boolean).join('\n'),
    '# Modelos de servicio\n'+ctxSection('#modelos'),
    '# Cómo trabajamos\n'+ctxSection('#metodo'),
    '# Sectores\n'+ctxSection('#sectores'),
    '# Por qué elegirnos\n'+ctxSection('#porque'),
    '# Reconocimientos y certificaciones\n'+ctxSection('#premios'),
    '# Casos de éxito\n'+ctxCases(),
    '# Testimonios\n'+ctxSection('#testimonios')
  ].filter(function(b){ return b.split('\n').slice(1).join('').trim().length>0; });
  return blocks.join('\n\n').slice(0, 22000);
}

// KB COMPLETA del sitio (todas las páginas) en assets/tevi-kb.txt: así a
// Tevi le llega TODO el contenido, esté el usuario en la página que esté.
// Regenerar con /tmp/build_kb.py cuando cambie el contenido del sitio.
var _kbText, _kbLoaded = false, _kbP = null;
function _kbUrl(){
  var s = (document.querySelector('script[src*="app.js"]') || {}).src || '';
  return s ? s.replace(/app\.js.*$/, 'tevi-kb.txt') : null;
}
async function fullContext(){
  if(!_kbLoaded){
    if(!_kbP){
      var u = _kbUrl();
      _kbP = u ? fetch(u).then(function(r){ return r.ok ? r.text() : ''; }).catch(function(){ return ''; })
               : Promise.resolve('');
    }
    var t = await _kbP;
    _kbText = (t && t.length > 500) ? t : '';
    _kbLoaded = true;
  }
  // TEVI_KB (resumen canónico con el equipo) primero, para que sobreviva
  // aunque el Worker recorte; luego la KB completa de todas las páginas.
  return _kbText ? (TEVI_KB + "\n\n" + _kbText).slice(0, 60000) : siteContext();
}
const TEVI = {
  es: {
    greet: '👋 Hola, soy <b>Tevi</b>, el asistente de TeGeVe. Puedo explicarte qué hacemos (SAP, JD&nbsp;Edwards, IA, desarrollo a medida…) y también conceptos como “¿qué es un ERP?”. ¿En qué te ayudo?',
    chips: ['¿Qué servicios ofrecen?', '¿Qué es SAP?', '¿Qué es la modalidad nearshore?', '¿Qué hace diferente a TeGeVe?'],
    noans: 'No tengo una respuesta exacta para eso, pero el equipo de TeGeVe sí. Escríbenos a <a href="mailto:info@tegeve.es">info@tegeve.es</a> y te ayudamos. Mientras tanto, ¿te interesa alguna de estas?',
    noansChips: ['¿Qué servicios ofrecen?', '¿Cómo empezamos a trabajar juntos?', '¿Cómo puedo contactar con TeGeVe?']
  },
  en: {
    greet: '👋 Hi, I am <b>Tevi</b>, the TeGeVe assistant. I can explain what we do (SAP, JD&nbsp;Edwards, AI, custom development…) and concepts like “what is an ERP?”. How can I help?',
    chips: ['What services do you offer?', 'What is SAP?', 'What is the nearshore model?', 'What makes TeGeVe different?'],
    noans: 'I do not have an exact answer for that, but the TeGeVe team does. Write to <a href="mailto:info@tegeve.es">info@tegeve.es</a> and we will help. In the meantime, are any of these useful?',
    noansChips: ['What services do you offer?', 'How do we get started?', 'How can I contact TeGeVe?']
  }
};
const SYN = {
  'precio':'coste costo cuanto vale tarifa presupuesto','sap':'erp s4hana hana de primer nivel',
  'ia':'inteligencia artificial agente rpa automatizacion','jde':'jd edwards oracle enterpriseone',
  'donde':'paises ubicacion oficinas pais','contacto':'telefono email correo escribir',
  'legacy':'cobol as400 mainframe antiguo',
  'empezar':'comenzar contratar primer paso iniciar','assessment':'auditoria evaluacion diagnostico'
};
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9ñ\s]/g,' ');
const STOP = new Set('de la el en y a los las un una que es para con por su tu mi se lo del al como mas o e'.split(' '));
function expand(q){
  let toks = norm(q).split(/\s+/).filter(t => t.length>1 && !STOP.has(t));
  let extra = [];
  toks.forEach(t => { if (SYN[t]) extra.push(...norm(SYN[t]).split(/\s+/)); });
  return [...toks, ...extra];
}
function search(q){
  const toks = expand(q);
  if (!toks.length) return null;
  let best = null, bestScore = 0;
  KB.forEach(item => {
    const hay = norm(item.kw + ' ' + item.q);
    let score = 0;
    toks.forEach(t => { if (hay.includes(t)) score += (item.q.toLowerCase().includes(t) ? 2 : 1); });
    score = score / Math.sqrt(toks.length);
    if (score > bestScore){ bestScore = score; best = item; }
  });
  return bestScore >= 1 ? best : null;
}
// Botón flotante de Tevi (creado por JS para que esté en TODAS las páginas).
// Solo se ve en móvil (CSS); en escritorio se usa el botón del nav.
(function(){
  if(document.getElementById('aiFab') || !document.body) return;
  var f=document.createElement('button');
  f.id='aiFab'; f.type='button'; f.className='ai-fab';
  f.setAttribute('aria-label','Abrir asistente Tevi');
  f.innerHTML='<span class="av"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.5 3.5Q9.5 10.5 16.5 10.5Q9.5 10.5 9.5 17.5Q9.5 10.5 2.5 10.5Q9.5 10.5 9.5 3.5ZM17.5 13Q17.5 17 21.5 17Q17.5 17 17.5 21Q17.5 17 13.5 17Q17.5 17 17.5 13Z"/></svg></span><span class="txt">Tevi</span><span class="spark" aria-hidden="true"></span>';
  document.body.appendChild(f);
})();
const aiFab = document.getElementById('aiFab'), aiPanel = document.getElementById('aiPanel'),
      aiClose = document.getElementById('aiClose'), aiBody = document.getElementById('aiBody'),
      aiInput = document.getElementById('aiInput'), aiSend = document.getElementById('aiSend');
let aiStarted = false;
function openAI(){ aiPanel.classList.add('open'); if(aiFab) aiFab.classList.add('is-hidden'); if(!aiStarted){aiStarted=true;greet();} setTimeout(()=>aiInput.focus(),350); }
function closeAI(){ aiPanel.classList.remove('open'); if(aiFab) aiFab.classList.remove('is-hidden'); var nb=document.querySelector('.nav-ai'); if(nb) nb.focus(); }
if(aiFab) aiFab.addEventListener('click', openAI);
aiClose.addEventListener('click', closeAI);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && aiPanel.classList.contains('open')) closeAI(); });
document.querySelectorAll('.ai-open-link').forEach(b => b.addEventListener('click', openAI));
function addMsg(html, who){ const m=document.createElement('div'); m.className='msg '+who; m.innerHTML=html; aiBody.appendChild(m); aiBody.scrollTop=aiBody.scrollHeight; return m; }
function addChips(items){ const c=document.createElement('div'); c.className='chips'; items.forEach(t=>{const b=document.createElement('button');b.className='chip';b.textContent=t;b.addEventListener('click',()=>ask(t));c.appendChild(b);}); aiBody.appendChild(c); aiBody.scrollTop=aiBody.scrollHeight; }
function typing(){ const t=document.createElement('div'); t.className='typing'; t.innerHTML='<i></i><i></i><i></i>'; aiBody.appendChild(t); aiBody.scrollTop=aiBody.scrollHeight; return t; }
function greet(){
  var L = TEVI[tlang()];
  addMsg(L.greet, 'bot');
  addChips(L.chips);
}
const escapeHtml = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const suggest = (exclude) => KB.filter(k => k !== exclude).sort(()=>0.5-Math.random()).slice(0,3).map(k=>k.q);
var SITE_ROOT = (function(){ var s=(document.querySelector('script[src*="app.js"]')||{}).src||''; return s ? s.replace(/assets\/app\.js.*$/, '') : ''; })();
var PAGE_LABELS = {nosotros:'Nosotros', servicios:'Servicios', casos:'Casos de éxito', contacto:'Contacto'};
var SVC_LABELS = {'sap':'SAP','oracle-jd-edwards':'Oracle JD Edwards','ia-empresarial':'IA Empresarial','desarrollo-a-medida':'Desarrollo a medida'};
var LINK_STYLE = ' style="color:var(--red);font-weight:600;text-decoration:underline"';
function formatAI(text){
  return escapeHtml(text)
    .replace(/(info@[a-z0-9.\-]+\.[a-z]{2,})/gi, '<a href="mailto:$1">$1</a>')
    // UNA sola pasada (sub-ruta de servicio primero en la alternancia) para no
    // reprocesar los <a> ya creados y evitar enlaces anidados.
    .replace(/\/servicios\/(sap|oracle-jd-edwards|ia-empresarial|desarrollo-a-medida)\/|\/(nosotros|servicios|casos|contacto)\//g, function(m, sub, base){
      if(sub) return '<a href="'+SITE_ROOT+'servicios/'+sub+'/"'+LINK_STYLE+'>'+SVC_LABELS[sub]+'</a>';
      return '<a href="'+SITE_ROOT+base+'/"'+LINK_STYLE+'>'+PAGE_LABELS[base]+'</a>';
    })
    .replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
}
function localAnswer(q){
  const hit = search(q);
  if (hit){ addMsg(hit.a, 'bot'); addChips(suggest(hit)); }
  else {
    var L = TEVI[tlang()];
    addMsg(L.noans, 'bot');
    addChips(L.noansChips);
  }
}
// Historial de la conversación: se envía al Worker para que Tevi mantenga el
// hilo (memoria de los turnos previos) y deje de sonar a robot sin contexto.
var teviHistory = [];
async function ask(q){
  addMsg(escapeHtml(q), 'user'); aiInput.value='';
  const t = typing();
  if (AI_ENDPOINT){
    try {
      const res = await fetch(AI_ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ question: q, lang: tlang(), context: await fullContext(), history: teviHistory.slice(-8) }) });
      const data = await res.json().catch(()=>({}));
      t.remove();
      if (res.ok && data.answer){
        addMsg(formatAI(data.answer), 'bot'); addChips(suggest());
        teviHistory.push({ role:'user', content:q }, { role:'assistant', content:data.answer });
        if (teviHistory.length > 16) teviHistory = teviHistory.slice(-16);
      }
      else localAnswer(q);
    } catch (e){ t.remove(); localAnswer(q); }
    return;
  }
  setTimeout(() => { t.remove(); localAnswer(q); }, 480 + Math.random()*420);
}
aiSend.addEventListener('click', () => { const v = aiInput.value.trim(); if (v) ask(v); });

/* Carrusel de portada */
(function(){
  var car = document.getElementById('top');
  if(!car || !car.classList.contains('hero-carousel')) return;
  var slides = [].slice.call(car.querySelectorAll('.hc-slide'));
  var dots = [].slice.call(car.querySelectorAll('.hc-dot'));
  if(slides.length < 2) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var i = 0, timer = null, paused = false, rt = null;
  function schedule(){
    if(timer){ clearTimeout(timer); timer = null; }
    if(reduce || paused || document.hidden) return;
    timer = setTimeout(function(){ go(i+1); }, i===0 ? 9000 : (slides[i] && slides[i].classList.contains('hc-tevi') ? 12000 : 7000));
  }
  function go(n){
    i = (n + slides.length) % slides.length;
    slides.forEach(function(s,k){ s.classList.toggle('is-active', k===i); });
    dots.forEach(function(d,k){ d.classList.toggle('on', k===i); });
    var dk=slides[i].classList.contains('hc-msg');
    var nv=document.getElementById('nav'); if(nv) nv.classList.toggle('nav-dark', dk);
    car.classList.toggle('hc-dark', dk);
    schedule();
  }
  dots.forEach(function(d,k){ d.addEventListener('click', function(){ paused=false; go(k); }); });
  car.addEventListener('pointerdown', function(){ paused = true; if(timer){ clearTimeout(timer); timer=null; } });
  car.addEventListener('pointerup', function(){ if(rt) clearTimeout(rt); rt = setTimeout(function(){ paused=false; schedule(); }, 3500); });
  car.addEventListener('focusin', function(){ paused = true; if(timer){ clearTimeout(timer); timer=null; } });
  car.addEventListener('focusout', function(){ paused = false; schedule(); });
  document.addEventListener('visibilitychange', function(){ if(document.hidden){ if(timer){clearTimeout(timer);timer=null;} } else { schedule(); } });
  schedule();
})();

/* Sección "Habla con Tevi": tarjetas que abren el asistente con la consulta sembrada */
document.querySelectorAll('.tv-chip').forEach(function(c){
  c.addEventListener('click', function(){
    if(typeof openAI==='function') openAI();
    var q = (window.__lang==='en' && c.dataset.qen) ? c.dataset.qen : c.dataset.q;
    setTimeout(function(){ if(typeof ask==='function') ask(q); }, 420);
  });
});
/* Placeholder autoescrito (typewriter) en la barra de Tevi */
(function(){
  var el=document.querySelector('.tv-typed-text'); if(!el) return;
  var rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var L={es:["¿Qué es la IA Empresarial de TeGeVe?","¿Tenéis experiencia en Oracle JD Edwards?","¿Cómo empezamos un proyecto?","¿Qué certificaciones tenéis?","¿Desde qué países dais servicio?"],
         en:["What is TeGeVe's Enterprise AI?","Do you have Oracle JD Edwards experience?","How do we start a project?","What certifications do you hold?","From which countries do you operate?"]};
  var arr=L[(window.__lang==='en')?'en':'es'];
  if(rm){ el.textContent=arr[0]; return; }
  var i=0,j=0,del=false,to;
  function loop(){ var w=arr[i]; el.textContent=del?w.slice(0,j--):w.slice(0,j++); var t=del?40:75;
    if(!del&&j===w.length+1){del=true;t=1600;} else if(del&&j===0){del=false;i=(i+1)%arr.length;t=300;}
    to=setTimeout(loop,t); }
  loop();
  document.addEventListener('langchange',function(e){ arr=L[(e.detail&&e.detail.lang==='en')?'en':'es']; i=0;j=0;del=false; });
})();

/* Fondo de red neuronal animada en la diapositiva de Tevi */
(function(){
  var slide=document.querySelector('.hc-tevi');
  if(!slide) return;
  var canvas=slide.querySelector('.tv-net');
  if(!canvas || !canvas.getContext) return;
  var ctx=canvas.getContext('2d');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w=0,h=0,dpr=1,parts=[],raf=null,running=false;
  function size(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    w=slide.clientWidth||window.innerWidth; h=slide.clientHeight||window.innerHeight;
    canvas.width=w*dpr; canvas.height=h*dpr;
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var n=Math.max(24,Math.round(Math.min(74, w*h/20000)));
    parts=[];
    for(var i=0;i<n;i++){ parts.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.34,vy:(Math.random()-.5)*.34,r:Math.random()*1.7+.7}); }
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    var i,j,p,q,dx,dy,d,a,MAX=15000;
    for(i=0;i<parts.length;i++){
      p=parts[i];
      for(j=i+1;j<parts.length;j++){
        q=parts[j]; dx=p.x-q.x; dy=p.y-q.y; d=dx*dx+dy*dy;
        if(d<MAX){ a=(1-d/MAX)*.52; ctx.strokeStyle='rgba(231,55,67,'+a.toFixed(3)+')'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); }
      }
    }
    ctx.shadowBlur=8; ctx.shadowColor='rgba(231,55,67,.9)';
    for(i=0;i<parts.length;i++){ p=parts[i]; ctx.fillStyle='rgba(255,120,128,.95)'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.2832); ctx.fill(); }
    ctx.shadowBlur=0;
  }
  function move(){
    for(var i=0;i<parts.length;i++){ var p=parts[i]; p.x+=p.vx; p.y+=p.vy;
      if(p.x<-12)p.x=w+12; else if(p.x>w+12)p.x=-12;
      if(p.y<-12)p.y=h+12; else if(p.y>h+12)p.y=-12; }
  }
  function step(){ move(); draw(); raf=requestAnimationFrame(step); }
  function start(){ if(running)return; running=true; if(!parts.length||!w)size(); step(); }
  function stop(){ running=false; if(raf){cancelAnimationFrame(raf); raf=null;} }
  size();
  if(reduce){ draw(); return; }
  var rsz; window.addEventListener('resize',function(){ clearTimeout(rsz); rsz=setTimeout(function(){ size(); if(!running) draw(); },200); },{passive:true});
  function update(){ if(slide.classList.contains('is-active') && !document.hidden) start(); else stop(); }
  new MutationObserver(update).observe(slide,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',update);
  update();
})();

/* Filtro de casos de éxito */
(function(){
  var grid = document.getElementById('casesGrid');
  if(!grid) return;
  var search = document.getElementById('caseSearch');
  var chipsBox = document.getElementById('caseChips');
  var empty = document.getElementById('casesEmpty');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.case'));
  var activeSvc = '';
  function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  function apply(){
    var q = norm(search.value.trim());
    var toks = q ? q.split(/\s+/) : [];
    var shown = 0;
    cards.forEach(function(c){
      var okSvc = !activeSvc || c.getAttribute('data-svc') === activeSvc;
      var txt = c.textContent || '';
      var okTxt = toks.every(function(t){ return txt.indexOf(t) !== -1; });
      var ok = okSvc && okTxt;
      c.style.display = ok ? '' : 'none';
      if(ok) shown++;
    });
    empty.style.display = shown ? 'none' : 'block';
  }
  search.addEventListener('input', apply);
  chipsBox.addEventListener('click', function(e){
    var b = e.target.closest('.cf-chip'); if(!b) return;
    chipsBox.querySelectorAll('.cf-chip').forEach(function(x){ x.classList.remove('on'); });
    b.classList.add('on');
    activeSvc = b.getAttribute('data-f') || '';
    apply();
  });
})();
aiInput.addEventListener('keydown', e => { if (e.key === 'Enter'){ const v = aiInput.value.trim(); if (v) ask(v); } });


/* === i18n ES/EN (cliente, sin build) === */
(function(){
  var DICT = {"Nombre": "Name", "Cuéntanos tu reto": "Tell us your challenge", "Enviar mensaje": "Send message", "Treinta y cuatro años, cuatro países, una misma vocación.": "Thirty-four years, four countries, one shared purpose.", "Nace TGV. Osvaldo Tessio, Ernesto Galindez y Marta Vicena lo fundan en Argentina: un espacio donde las personas apasionadas por la excelencia pueden desarrollarse.": "TGV is born. Osvaldo Tessio, Ernesto Galindez and Marta Vicena found it in Argentina: a place where people passionate about excellence can grow.", "Damos nuestro primer paso internacional con Phillip Morris México. El mundo entra en los planes de la compañía.": "We take our first international step with Phillip Morris Mexico. The world enters the company's plans.", "SAP se convierte en nuestro primer Service Partner en el ámbito comercial.": "SAP becomes our first commercial Service Partner.", "Iniciamos la adhesión al estándar de calidad de la industria: CMMI.": "We begin adopting the industry's quality standard: CMMI.", "Inauguramos nuestra primera oficina internacional, en Monterrey, bajo el nombre de Soinf.": "We open our first international office, in Monterrey, under the name Soinf.", "Abrimos oficina en Florida como TGVAmericas, dentro de la expansión regional del Grupo TGV.": "We open an office in Florida as TGVAmericas, part of the TGV Group's regional expansion.", "Llegamos a Málaga y abrimos oficinas como TeGeVe: comienza el capítulo español del Grupo TGV.": "We arrive in Málaga and open offices as TeGeVe: the TGV Group's Spanish chapter begins.", "Cumplimos 30 años y superamos la 6.ª evaluación del modelo de calidad CMMI.": "We turn 30 and pass our 6th CMMI quality-model appraisal.", "Avanzamos con Horizonte: empoderamiento del equipo directivo, multiculturalidad y evolución tecnológica.": "We move forward with Horizonte: empowering the leadership team, multiculturalism and technological evolution.", "Obtenemos el nivel de madurez 3 en el CMMI DEV Benchmark Appraisal.": "We achieve maturity level 3 in the CMMI DEV Benchmark Appraisal.", "Paso firme en el mercado internacional: cientos de proyectos exitosos y decenas de clientes satisfechos.": "A firm step in the international market: hundreds of successful projects and dozens of satisfied clients.", "Monterrey, México": "Monterrey, Mexico", "Florida, EE. UU.": "Florida, USA", "Málaga, España": "Málaga, Spain", "Tus objetivos guían cada decisión: entendemos el negocio antes que la tecnología.": "Your goals guide every decision: we understand the business before the technology.", "Revisamos, medimos y refinamos. Cada proyecto nos deja mejores que el anterior.": "We review, measure and refine. Every project leaves us better than the last.", "Preguntamos y escuchamos de verdad para resolver el problema real, no el aparente.": "We ask and truly listen, to solve the real problem, not the apparent one.", "Equipos diversos en tres continentes que suman miradas y enriquecen cada solución.": "Diverse teams across three continents that add perspectives and enrich every solution.", "Personas con autonomía y criterio para decidir y llevar las ideas a producción.": "People with the autonomy and judgment to decide and take ideas to production.", "Relaciones duraderas dentro y fuera: cuidamos al equipo y a cada cliente.": "Lasting relationships inside and out: we care for the team and for every client.", "Experiencia profunda con la cercanía de un socio.": "Deep expertise with the closeness of a partner.", "Porque transformamos los proyectos tecnológicos más desafiantes en soluciones innovadoras. Esto es lo que nos define.": "Because we turn the most challenging technology projects into innovative solutions. This is what defines us.", "Nos integramos a equipos multiculturales con flexibilidad y eficiencia, optimizando costes con un modelo de entrega ágil.": "We join multicultural teams with flexibility and efficiency, optimizing costs with an agile delivery model.", "¿Qué hace diferente a TeGeVe?": "What makes TeGeVe different?", "eficiente en costes y": "that is cost-efficient, and", "de especialización técnica real. Cercanía, foco y flexibilidad,": "of real technical specialization. Closeness, focus and flexibility,", "eficiente en costes": "cost-efficient", ". Lo definimos tras un primer diagnóstico sin compromiso.": ". We define it after an initial assessment with no obligation.", "Nosotros": "About us", "Quiénes somos": "Who we are", "La pasión por lo que hacemos, el": "The passion for what we do, the", "compromiso absoluto": "absolute commitment", "con el éxito de nuestros clientes y la vocación por la mejor calidad.": "to our clients' success and the dedication to the highest quality.", "Son los cimientos sobre los que se fundó TeGeVe: una consultora tecnológica con más de 30 años transformando los proyectos más desafiantes en soluciones innovadoras.": "These are the foundations on which TeGeVe was built: a technology consultancy with over 30 years turning the most challenging projects into innovative solutions.", "Nivel de madurez acreditado": "Accredited maturity level", "Nuestra visión": "Our vision", "«Ser una compañía líder en tecnología a nivel global, estableciendo alianzas sólidas con nuestros clientes para acompañarlos en sus procesos de transformación digital y de negocios.»": "«To be a leading global technology company, forging strong partnerships with our clients to support them through their digital and business transformation.»", "Nuestra historia": "Our history", "Una trayectoria marcada por la calidad.": "A track record defined by quality.", "Acreditación CMMI Nivel de Madurez 2.": "CMMI Maturity Level 2 accreditation.", "Finalistas del Premio Sadosky a la mejor empresa IT.": "Finalists for the Sadosky Award for best IT company.", "Acreditación CMMI Nivel de Madurez 3.": "CMMI Maturity Level 3 accreditation.", "Distinción Premio Fundación Exportar: consolidación y permanencia en mercados externos.": "Fundación Exportar Award: consolidation and permanence in foreign markets.", "Entre las 3 mejores consultoras IT del país (revista Information Technology).": "Among the country's top 3 IT consultancies (Information Technology magazine).", "Premio «Customer Focus» del Oracle JD Edwards Summit, dos años consecutivos.": "«Customer Focus» Award at the Oracle JD Edwards Summit, two years running.", "Finalistas en «Compromiso con la Calidad» de los Premios Sadosky.": "Finalists in «Commitment to Quality» at the Sadosky Awards.", "Lo que nos define": "What defines us", "Seis valores, una forma de trabajar.": "Six values, one way of working.", "Nuestro equipo": "Our team", "Personas expertas detrás de cada proyecto.": "Expert people behind every project.", "Dirección": "Leadership", "Director · Cofundador": "Director · Co-founder", "Directora · Cofundadora": "Director · Co-founder", "Director TeGeVe": "TeGeVe Director", "Áreas de Operaciones": "Operations", "Desarrollo para Servicios Financieros": "Development for Financial Services", "Áreas de Soporte": "Support", "Recursos Humanos": "Human Resources", "Calidad y Procesos": "Quality & Processes", "Administración y Finanzas": "Administration & Finance", "Ventas y Marketing": "Sales & Marketing", "Mercados": "Markets", "Asistente con IA · Tevi": "AI Assistant · Tevi", "Pregunta lo que": "Ask whatever you", "necesites": "need", "saber.": "to know.", "Tevi responde al instante sobre SAP, Oracle JD Edwards, IA Empresarial, nuestros casos de éxito y cómo trabajamos. Sin formularios, sin esperas.": "Tevi answers instantly about SAP, Oracle JD Edwards, Enterprise AI, our success stories and how we work. No forms, no waiting.", "Abrir el asistente Tevi y preguntar": "Open the Tevi assistant and ask", "Preguntar": "Ask", "«¿Qué hacéis con SAP?»": "«What do you do with SAP?»", "Implantación, soporte AMS y evolutivo sobre SAP, con migración a S/4HANA.": "Implementation, AMS and evolutionary support on SAP, with migration to S/4HANA.", "Preguntar a Tevi →": "Ask Tevi →", "«¿Cómo es el nearshore?»": "«How does nearshore work?»", "Misma franja horaria, equipo senior estable y costes optimizados.": "Same time zone, a stable senior team and optimized costs.", "Casos": "Cases", "«Casos en banca»": "«Cases in banking»", "Proyectos críticos reales en servicios financieros y legacy.": "Real mission-critical projects in financial services and legacy.", "Método": "Method", "«¿Qué es el assessment?»": "«What is the assessment?»", "Evaluamos el negocio antes de que inviertas, sin compromiso.": "We assess your business before you invest, with no commitment.", "«IA en producción»": "«AI in production»", "Automatización que escala, como la conciliación de FCI. Nada de pilotos.": "Automation that scales, like the reconciliation of mutual funds (FCI). No pilots.", "Visión general": "Overview", "Casos de éxito": "Success stories", "Clientes": "Clients", "Presentación de TeGeVe": "TeGeVe overview", "IA Empresarial": "Enterprise AI", "2 de 4: Partner tecnológico": "2 of 4: Technology partner", "SAP · Migración a S/4HANA": "SAP · Migration to S/4HANA", "IA Empresarial · Automatización": "Enterprise AI · Automation", "Diapositiva 1": "Slide 1", "Integración": "Integration", "Soporte": "Support", "Automatización": "Automation", "Industria Financiera & Legacy": "Financial Industry & Legacy", "Finanzas, Operaciones y RR. HH.": "Finance, Operations and HR", "Hablar de tu proyecto SAP": "Discuss your SAP project", "Ver casos JDE": "View JDE cases", "Asistentes y chatbots": "Assistants and chatbots", "Plataformas: Power Platform · OpenAI · Google Cloud · UiPath · SAP Joule": "Platforms: Power Platform · OpenAI · Google Cloud · UiPath · SAP Joule", "Diseñamos aplicaciones web y móviles modernas, integramos sistemas y gestionamos grandes volúmenes de datos. Nos integramos a tu metodología con foco en la usabilidad, el rendimiento y la escalabilidad.": "We design modern web and mobile applications, integrate systems and manage large volumes of data. We integrate with your methodology with a focus on usability, performance and scalability.", "Ver casos": "View cases", "Sumamos perfiles senior a tu equipo, integrados a tu cultura y a tu forma de trabajar.": "We add senior profiles to your team, integrated into your culture and your way of working.", "Empezamos por un assessment honesto. Nuestra experiencia de +30 años nos permite entender el negocio para generar una propuesta de valor y optimizar costes.": "We start with an honest assessment. Our 30+ years of experience allow us to understand the business in order to generate a value proposition and optimize costs.", "Nuestra trayectoria internacional nos permite integrarnos con flexibilidad y eficiencia a equipos multiculturales, en la modalidad que mejor se adapte a cada proyecto.": "Our international track record allows us to integrate with flexibility and efficiency into multicultural teams, in the model that best suits each project.", "Desarrollamos proyectos en más de 16 países, con empresas y organismos gubernamentales. Entre nuestras referencias: una auditoría para Motta Internacional, Weatherford, Abertis/Autopistas del Oeste y Banco Itaú.": "We have delivered projects in more than 16 countries, with companies and government agencies. Among our references: an audit for Motta Internacional, Weatherford, Abertis/Autopistas del Oeste and Banco Itaú.", "Proyectos para compañías globales del sector, como Weatherford.": "Projects for global companies in the sector, such as Weatherford.", "Automatización inteligente de procesos, como la conciliación de fondos de inversión.": "Intelligent process automation, such as the reconciliation of investment funds.", "Todos": "All", "Ver caso": "View case", "La solución reduce el procesamiento de cuatro días a cuestión de horas, minimiza los errores y ofrece resultados inmediatos. Simplifica la gestión de grandes volúmenes de información y es escalable a nuevos fondos y bancos.": "The solution reduces processing from four days to a matter of hours, minimizes errors and delivers immediate results. It simplifies the management of large volumes of information and is scalable to new funds and banks.", "IA que automatiza la planificación logística diaria y reemplaza el Excel manual": "AI that automates daily logistics planning and replaces manual Excel", "logistica": "logistics", "Una multinacional productora de equipamiento agrícola necesitaba un ERP robusto, capaz de adaptar con rapidez sus procesos ante los cambios de coyuntura y lo suficientemente escalable para acompañar su crecimiento. El desafío incluía ajustar el sistema a la realidad local sin desviarse de los estándares regionales.": "A multinational manufacturer of agricultural equipment needed a robust ERP, capable of quickly adapting its processes to changing circumstances and scalable enough to support its growth. The challenge included tailoring the system to the local reality without deviating from regional standards.", "escalabilidad": "scalability", "TeGeVe llevó a cabo una evaluación integral del ERP Oracle JD Edwards E1 9.2: diagnosticó el estado actual (As Is) del modelo de seguridad, definió el modelo objetivo (To Be) y especificó las estrategias de adecuación, con documentación completa y recomendaciones para su implementación.": "TeGeVe carried out a comprehensive assessment of the Oracle JD Edwards E1 9.2 ERP: it diagnosed the current state (As Is) of the security model, defined the target model (To Be) and specified the adaptation strategies, with complete documentation and recommendations for its implementation.", "8 profesionales · 17.379 h": "8 professionals · 17,379 h", "monitorizacion": "monitoring", "TeGeVe diseñó un modelo de soporte basado en la cercanía, la colaboración y la eficiencia. El equipo puso en marcha una mesa de ayuda funcional de niveles 1 y 2, con herramientas flexibles de gestión de tickets y una base de conocimiento compartida que permitió escalar las soluciones de forma ágil.": "TeGeVe designed a support model based on closeness, collaboration and efficiency. The team set up a functional L1 and L2 help desk, with flexible ticket management tools and a shared knowledge base that made it possible to scale solutions in an agile way.", "Gran consumo": "Consumer goods", "calificacion crediticia": "credit rating", "Una aseguradora de referencia necesitaba adaptar su plataforma de gestión a los cambios constantes de la operativa del negocio, sin renunciar a calidad, estabilidad ni a tiempos de respuesta ágiles.": "A leading insurer needed to adapt its management platform to the constant changes in the business operations, without compromising quality, stability or agile response times.", "First Data, proveedor global de soluciones de pagos, necesitaba adaptar sus procesos para habilitar la operatividad de tarjetas con chip (EMV). El objetivo era actualizar su tecnología para dar soporte simultáneo a tarjetas con chip y de banda magnética.": "First Data, a global provider of payment solutions, needed to adapt its processes to enable chip card (EMV) operations. The goal was to update its technology to provide simultaneous support for chip and magnetic stripe cards.", "Sistemas legacy al servicio de nuevas estrategias de negocio en medios de pago": "Legacy systems serving new business strategies in payment methods", "sistemas legacy": "legacy systems", "No hay casos que coincidan con tu búsqueda. Prueba con otra palabra clave o quita los filtros.": "There are no cases matching your search. Try another keyword or remove the filters.", "Relaciones de confianza que se sostienen durante años, en banca, energía e infraestructuras.": "Trusted relationships sustained over years, in banking, energy and infrastructure.", "Director General de Sistemas y TI · Dirección Nacional de Migraciones": "General Director of Systems and IT · Dirección Nacional de Migraciones", "Modalidad nearshore eficiente": "Efficient nearshore model", "IA que llega a producción": "AI that reaches production", "Orientación al cliente": "Client focus", "Certificaciones y membresías": "Certifications and memberships", "Miembros fundadores del clúster tecnológico.": "Founding members of the technology cluster.", "Preguntas frecuentes": "Frequently asked questions", "Empresa": "Company", "TeGeVe —también conocida como": "TeGeVe —also known as", "con la implementación de paquetes de primer nivel como": "with the implementation of top-tier packages such as", ". Nuestra trayectoria internacional —proyectos en": ". Our international track record —projects in", "¿Cuántos años de experiencia tiene TeGeVe?": "How many years of experience does TeGeVe have?", "¿A qué sectores presta servicio TeGeVe?": "Which sectors does TeGeVe serve?", "sector público": "public sector", "Somos expertos en el": "We are experts in the", "modernización de sistemas legacy": "legacy systems modernization", "integrar sistemas de múltiple envergadura": "integrating systems of varying scale", "para conocer las": "to learn about the", "Sí. Modernizamos sistemas legacy construidos sobre": "Yes. We modernize legacy systems built on", "evolución funcional": "functional evolution", "Sí.": "Yes.", "Implementamos, actualizamos (": "We implement, upgrade (", "Ayudamos a": "We help", ". Llevamos la IA a producción —no nos quedamos en pilotos— con casos reales como la": ". We bring AI into production —we do not stop at pilots— with real cases such as the", "para automatizar procesos repetitivos (conciliaciones, altas de datos, informes), pasando por": "to automate repetitive processes (reconciliations, data entry, reports), through to", "es uno de los sistemas": "is one of the systems", "es un sistema": "is a system", "(Enterprise Resource Planning) es un sistema que integra y centraliza los procesos clave de una empresa —finanzas, compras, inventario, ventas, producción— en una": "(Enterprise Resource Planning) is a system that integrates and centralizes a company's key processes —finance, procurement, inventory, sales, production— in a", ", que permite procesar grandes volúmenes de información en tiempo real. Muchas empresas con versiones anteriores de SAP están": ", which makes it possible to process large volumes of information in real time. Many companies with earlier versions of SAP are", "es la aplicación de la inteligencia artificial a los procesos de una organización con criterios de": "is the application of artificial intelligence to an organization's processes with criteria of", "¿Qué es el modelo nearshore?": "What is the nearshore model?", ", además de en las oficinas del cliente.": ", as well as at the client's offices.", ". Es habitual en banca y finanzas, donde TeGeVe tiene amplia experiencia.": ". It is common in banking and finance, where TeGeVe has extensive experience.", "modelo nearshore": "nearshore model", "Trabajamos por": "We work for", "o desde la": "or from the", "Pregúntale a la IA": "Ask the AI", "España · Argentina · México · USA": "Spain · Argentina · Mexico · USA", "Escribe tu pregunta…": "Type your question…", "Saltar al contenido": "Skip to content", "Compañía": "Company", "Reconocimientos": "Recognitions", "1 de 4: Soluciones innovadoras": "1 of 4: Innovative solutions", "Oracle JD Edwards": "Oracle JD Edwards", "Partner tecnológico": "Technology partner", "El salto a SAP S/4HANA, sin sobresaltos.": "The move to SAP S/4HANA, without surprises.", "Cuando la automatización transforma el proceso.": "When automation transforms the process.", "Diapositiva 2": "Slide 2", "Implementación, upgrades y soporte de JD Edwards EnterpriseOne y World. Proyectos de misión crítica como partner del ecosistema Oracle/IBM.": "Implementation, upgrades, and support for JD Edwards EnterpriseOne and World. Mission-critical projects as a partner in the Oracle/IBM ecosystem.", "Assessment y Auditorías": "Assessment and Audits", "Desarrollo crítico para banca y finanzas y modernización de sistemas legacy (COBOL, AS/400, DB2), donde la fiabilidad y la continuidad del negocio son innegociables.": "Critical development for banking and finance and modernization of legacy systems (COBOL, AS/400, DB2), where reliability and business continuity are non-negotiable.", "Cómo lo hacemos": "How we do it", "Ver casos SAP": "View SAP cases", "IA Empresarial & Business Intelligence": "Enterprise AI & Business Intelligence", "BI y analítica": "BI and analytics", "Consultoría en automatización": "Automation consulting", "Apps web y móviles": "Web and mobile apps", "La forma de colaborar que tu proyecto necesita.": "The way of collaborating your project needs.", "Evaluamos procesos, tecnología y madurez para decidir con datos antes de invertir.": "We assess processes, technology, and maturity to decide with data before investing.", "Cómo trabajamos · 02": "How we work · 02", "Cómo trabajamos · 04": "How we work · 04", "Banca & Finanzas": "Banking & Finance", "Infraestructuras": "Infrastructure", "Resultados reales, en producción.": "Real results, in production.", "Reto.": "Challenge.", "ia empresarial": "enterprise ai", "automatizacion": "automation", "Empresa del sector Oil & Gas": "Oil & Gas sector company", "planificacion logistica": "logistics planning", "TeGeVe fue seleccionada en 2010 para apoyar la implementación de JD Edwards EnterpriseOne en Argentina, abarcando la migración de datos y la instalación, sobre un modelo definido a partir del diseño adoptado en Brasil. Desde 2012, el equipo brinda un acompañamiento continuo, adaptando funcionalidades ante nuevos negocios como los derivados de la adquisición de Precision Planting.": "TeGeVe was selected in 2010 to support the implementation of JD Edwards EnterpriseOne in Argentina, covering data migration and installation, based on a model defined from the design adopted in Brazil. Since 2012, the team has provided continuous support, adapting functionalities to new businesses such as those derived from the acquisition of Precision Planting.", "agro": "agribusiness", "soporte continuo": "continuous support", "La seguridad pasó a formar parte del enfoque estratégico de la compañía. Se optimizaron las protecciones del ERP, se formalizaron los procesos sensibles de gestión de usuarios y se estableció un plan de mantenimiento con objetivos medibles, reforzando las prácticas de seguridad mediante una colaboración conjunta.": "Security became part of the company's strategic approach. ERP protections were optimized, sensitive user management processes were formalized, and a maintenance plan with measurable objectives was established, reinforcing security practices through joint collaboration.", "Los equipos de soporte afrontaban errores de integración entre sistemas, sobre todo con los datos de empleados repartidos entre servidores propios y plataformas en la nube, lo que generaba inconsistencias en los estados de actualización. Un equipo dedicado debía revisar, clasificar y abrir tickets de error de forma manual varias veces al día.": "The support teams faced integration errors between systems, especially with employee data spread across in-house servers and cloud platforms, which generated inconsistencies in update statuses. A dedicated team had to review, classify, and open error tickets manually several times a day.", "Agroindustria": "Agribusiness", "El servicio remoto redujo los costes operativos sin comprometer la calidad y evitó los impactos derivados de la rotación de personal. La asignación flexible de recursos permitió ajustar los costes a las necesidades del negocio, con una valoración del cliente de 5 sobre 5.": "The remote service reduced operating costs without compromising quality and avoided the impacts arising from staff turnover. Flexible resource allocation made it possible to align costs with business needs, with a client rating of 5 out of 5.", "Decisiones basadas en datos para anticipar tendencias de consumo": "Data-driven decisions to anticipate consumption trends", "analitica en la nube": "cloud analytics", "El banco necesitaba actualizar su aplicativo de cálculo del rating, la calificación crediticia para personas físicas y jurídicas, junto con la interfaz de carga de información asociada.": "The bank needed to update its rating calculation application, the credit rating for individuals and legal entities, along with the associated information loading interface.", "desarrollo a medida": "custom development", "usabilidad": "usability", "TeGeVe puso en marcha una Software Factory con un equipo de analistas, desarrolladores y testers que da soporte a todo el ciclo de vida de las herramientas, actualizando la plataforma de forma continua.": "TeGeVe set up a Software Factory with a team of analysts, developers, and testers that supports the entire lifecycle of the tools, continuously updating the platform.", "TeGeVe ofreció servicios de integración, soporte, implementación y testing sobre el entorno de pagos del cliente. El equipo adaptó el modelo de datos para diferenciar las tarjetas con chip de las de banda magnética y trabajó sobre los sistemas de autorización y pagos internacionales.": "TeGeVe provided integration, support, implementation, and testing services on the client's payment environment. The team adapted the data model to differentiate chip cards from magnetic stripe cards and worked on authorization and international payment systems.", "First Data (licenciataria de MasterCard en Argentina)": "First Data (MasterCard licensee in Argentina)", "finanzas": "finance", "14 profesionales · ≈1.600 h": "14 professionals · ≈1,600 work-hours", "distribucion": "distribution", "Nuestros clientes": "Our clients", "TGV nos ha permitido convertirnos en una alternativa a medida, ágil y viable, sin la cual no hubiéramos podido alcanzar nuestro objetivo. El impacto positivo en nuestro departamento ha sido muy sólido, gracias a la voluntad y la flexibilidad de TGV para discutir, proponer y acordar una alternativa viable para nuestra situación.": "TGV has enabled us to become a tailored, agile, and viable alternative, without which we could not have achieved our goal. The positive impact on our department has been very solid, thanks to TGV's willingness and flexibility to discuss, propose, and agree on a viable alternative for our situation.", "Han demostrado ser un proveedor confiable, y los servicios que nos brindan nos ayudan a cumplir con nuestros proyectos. Sin dudas, podemos recomendarlos como una empresa a la cual contratar.": "They have proven to be a reliable provider, and the services they offer us help us meet our project goals. We can certainly recommend them as a company to hire.", "¿Por qué elegirnos?": "Why choose us?", "Automatización inteligente con casos reales, como la conciliación de Fondos Comunes de Inversión. Nada de pilotos que no escalan.": "Intelligent automation with real cases, such as the reconciliation of Mutual Funds. No pilots that fail to scale.", "Mejora continua": "Continuous improvement", "CMMI Nivel 3": "CMMI Level 3", "Todo lo que hace TeGeVe, respondido.": "Everything TeGeVe does, answered.", ", y sumamos": ", and we add", "más de 16 países": "more than 16 countries", "Más de": "More than", "Tenemos experiencia en": "We have experience in", ". Entre nuestras referencias: una auditoría para": ". Among our references: an audit for", "y en la implementación de paquetes de primer nivel como": "and in the implementation of top-tier packages such as", "para la industria financiera.": "for the financial industry.", "sobre diferentes plataformas tecnológicas, para que la información fluya de extremo a extremo y elimines silos.": "across different technology platforms, so that information flows end to end and you eliminate silos.", "necesidades reales": "real needs", ", y desarrollamos para la": ", and we develop for the", "mantenimiento": "maintenance", "Implementamos, evolucionamos y damos soporte a SAP": "We implement, evolve, and support SAP", "incorporar la inteligencia artificial": "incorporating artificial intelligence", "conciliación de fondos de inversión": "investment fund reconciliation", "copilotos": "copilots", "de Oracle muy implantado en industria, distribución y manufactura. Sus líneas principales son": "by Oracle, widely deployed in industry, distribution, and manufacturing. Its main lines are", "única plataforma": "single platform", "migrando a S/4HANA": "migrating to S/4HANA", ". Incluye agentes de IA, automatización inteligente y RPA. En TeGeVe la llevamos a producción, integrada con tus sistemas.": ". It includes AI agents, intelligent automation, and RPA. At TeGeVe we take it to production, integrated with your systems.", "¿Qué es la modernización de sistemas legacy?": "What is legacy system modernization?", "proyecto cerrado": "fixed-scope project", "¿Cómo empezamos a trabajar juntos?": "How do we start working together?", "sección de contacto": "contact section", "Transformamos los proyectos tecnológicos más desafiantes en soluciones innovadoras. Consultoría y servicios de software con +30 años.": "We transform the most challenging technology projects into innovative solutions. Consulting and software services with 30+ years.", "Asistente con IA de TeGeVe": "TeGeVe AI Assistant", "Tu pregunta": "Your question", "TeGeVe inicio": "TeGeVe home", "Cómo trabajamos": "How we work", "Consultoría y servicios de software · +30 años": "Software consulting and services · +30 years", ". Un equipo cualificado y multidisciplinar que trabaja en modalidad nearshore o en las oficinas de nuestros clientes.": ". A qualified, multidisciplinary team working in nearshore mode or at our clients' offices.", "Soluciones inteligentes para tu empresa.": "Intelligent solutions for your company.", "Te acompañamos en cada paso de la migración —del análisis a producción— con un plan claro y experiencia real.": "We support you at every step of the migration —from analysis to production— with a clear plan and real experience.", "Reducimos tiempos y costes con IA y RPA: de una conciliación de cuatro días a cuestión de horas.": "We reduce time and costs with AI and RPA: from a four-day reconciliation to a matter of hours.", "Diapositiva 3": "Slide 3", "Años de trayectoria": "Years of experience", "Integración de aplicaciones": "Application integration", "Software de primer nivel, a la medida de tu negocio.": "Top-tier software, tailored to your business.", "Consultoría SAP": "SAP Consulting", "Evaluaciones y auditorías para conocer las necesidades reales de tu empresa, generar una propuesta de valor y optimizar costes antes de invertir.": "Assessments and audits to understand your company's real needs, build a value proposition and optimize costs before investing.", "Banca": "Banking", "Implementación a medida": "Custom implementation", "Tu ERP de clase mundial, en las mejores manos.": "Your world-class ERP, in the best hands.", "De los datos a la decisión. De la decisión a la acción.": "From data to decision. From decision to action.", "Integración y gestión de datos": "Data integration and management", "Explorar IA y datos": "Explore AI and data", "Integración de sistemas": "Systems integration", "Nos adaptamos a tu realidad: desde un proyecto llave en mano hasta sumar talento senior a tu equipo. Siempre con calidad asegurada y cercanía.": "We adapt to your reality: from a turnkey project to adding senior talent to your team. Always with assured quality and close collaboration.", "Diseñamos con un equipo cualificado y multidisciplinar.": "We design with a qualified, multidisciplinary team.", "Acompañamos la adopción y la transformación.": "We support adoption and transformation.", "Desarrollo crítico, modernización de legacy y proyectos para la industria financiera, como Banco Itaú.": "Critical development, legacy modernization and projects for the financial industry, such as Banco Itaú.", "Soluciones para operadores de infraestructuras y concesiones, como Abertis/Autopistas del Oeste.": "Solutions for infrastructure operators and concession holders, such as Abertis/Autopistas del Oeste.", "Proyectos de SAP, Oracle JD Edwards, IA Empresarial, desarrollo a medida e integración para líderes de banca, agro, gran consumo, energía y medios de pago. Filtra por servicio o busca por palabra clave.": "Projects in SAP, Oracle JD Edwards, Enterprise AI, custom development and integration for leaders in banking, agribusiness, consumer goods, energy and payment methods. Filter by service or search by keyword.", "Servicios financieros": "Financial services", "El equipo de finanzas necesitaba agilizar la consolidación de sus distintos fondos comunes de inversión (FCI) para el cálculo de impuestos y su imputación en SAP. El procesamiento manual consumía varios días de trabajo de una persona, con alto coste operativo y elevado riesgo de errores.": "The finance team needed to streamline the consolidation of its various mutual investment funds (FCI) for tax calculation and posting in SAP. Manual processing consumed several days of one person's work, with high operational cost and elevated risk of errors.", "servicios financieros": "financial services", "Valoración del cliente: 5/5": "Client rating: 5/5", "ruteo de vehiculos": "vehicle routing", "Industria / Agro": "Industry / Agribusiness", "El cliente gestiona de forma centralizada la producción, la venta y la exportación, junto con la administración integral de cobranzas, pagos y facturas, y dispone de información en tiempo real de múltiples sectores. La compañía ganó eficiencia y calidad en sus procesos de fabricación gracias a una solución escalable que evoluciona con el negocio.": "The client centrally manages production, sales and export, together with the comprehensive administration of collections, payments and invoices, and has real-time information across multiple areas. The company gained efficiency and quality in its manufacturing processes thanks to a scalable solution that evolves with the business.", "industria": "industry", "Agro (insumos y servicios)": "Agribusiness (inputs and services)", "TeGeVe desarrolló un monitor de errores de integración en SAP Fiori, dentro de la plataforma SAP BTP del cliente, que se conecta con HCM (OnPremise) y SuccessFactors a través de CPI para consolidar la información en un único punto y mostrarla en línea.": "TeGeVe developed an integration error monitor in SAP Fiori, within the client's SAP BTP platform, that connects with HCM (OnPremise) and SuccessFactors through CPI to consolidate the information in a single point and display it online.", "Soporte SAP continuo que reduce costes y blinda la operación frente a la rotación": "Continuous SAP support that reduces costs and shields operations against turnover", "soporte": "support", "gran consumo": "consumer goods", "TeGeVe realizó la parametrización del cálculo del rating, centralizó la funcionalidad en una única aplicación y migró la herramienta a un portal web diseñado con foco en la usabilidad.": "TeGeVe configured the rating calculation, centralized the functionality in a single application and migrated the tool to a web portal designed with a focus on usability.", "portal web": "web portal", "Seguros": "Insurance", "El cliente logró adaptar su sistema a la evolución de la operativa con calidad y rapidez, lo que le permite sostener su posición como uno de los líderes más relevantes de su industria.": "The client managed to adapt its system to the evolution of operations with quality and speed, allowing it to maintain its position as one of the most relevant leaders in its industry.", "mantenimiento evolutivo": "evolutionary maintenance", "Se mejoró la seguridad de las transacciones y se redujo el fraude, habilitando la operatividad tanto con banda magnética como con chip. Además, se logró la certificación de tarjetas IC y mejoras en los sistemas de autorización y de pagos internacionales.": "Transaction security was improved and fraud was reduced, enabling operation with both magnetic stripe and chip. In addition, IC card certification was achieved, along with improvements in authorization and international payment systems.", "16 profesionales · 21.600 h": "16 professionals · 21,600 work-hours", "Motta Internacional operaba con múltiples sistemas ERP antiguos e independientes que ya no respondían a las necesidades cambiantes del grupo. La compañía necesitaba unificar su infraestructura tecnológica y tomar una decisión de inversión fundamentada sobre qué plataforma adoptar.": "Motta Internacional operated with multiple old, independent ERP systems that no longer met the group's changing needs. The company needed to unify its technology infrastructure and make an informed investment decision on which platform to adopt.", "modernizacion tecnologica": "technology modernization", "Grandes organizaciones confían en TeGeVe.": "Large organizations trust TeGeVe.", "+30 años de oficio real": "+30 years of real craftsmanship", "Propuesta de valor y costes": "Value proposition and costs", "Escucha activa": "Active listening", "Madurez certificada en desarrollo de software.": "Certified maturity in software development.", "Participación en la comisión directiva del sector.": "Participation in the sector's steering committee.", "¿Tienes una pregunta que no está aquí? Pregúntale a": "Have a question that isn't here? Ask", "IA": "AI", "— es una consultora tecnológica con": "— is a technology consultancy with", ". Contamos con un equipo cualificado y multidisciplinar, prestamos servicios desde España, Argentina, México y USA, y hemos desarrollado proyectos en más de 16 países.": ". We have a qualified, multidisciplinary team, provide services from Spain, Argentina, Mexico and USA, and have delivered projects in more than 16 countries.", "(Buenos Aires) y": "(Buenos Aires) and", ", con empresas y organismos gubernamentales— nos permite atender con cercanía a clientes de toda": ", with companies and government agencies— allows us to serve clients across all of", "30 años": "30 years", "banca y finanzas": "banking and finance", ". También nos especializamos en": ". We also specialize in", "¿Desarrollan software a medida e integraciones?": "Do you develop custom software and integrations?", "¿Qué es el Assessment de TeGeVe?": "What is the TeGeVe Assessment?", "de tu empresa, generar una propuesta de valor y": "of your company, build a value proposition and", "industria financiera": "financial industry", "de las soluciones, y medimos el valor entregado. Buscamos": "of the solutions, and we measure the value delivered. We seek", ", y acompañamos a las empresas en su": ", and we support companies in their", ") y damos soporte a": ") and we provide support for", "al negocio con foco en casos de uso concretos,": "to the business with a focus on concrete use cases,", "¿Qué tipo de soluciones de IA pueden implementar?": "What type of AI solutions can you implement?", "internos y automatización inteligente sobre tus sistemas": "internal and intelligent automation on your systems", "líderes del mundo: un software empresarial que integra en una sola plataforma procesos como finanzas, compras, ventas, producción, logística y recursos humanos. Su generación actual es": "world leaders: enterprise software that integrates processes such as finance, procurement, sales, production, logistics and human resources into a single platform. Its current generation is", ", evitando silos de información.": ", avoiding information silos.", "; en TeGeVe acompañamos ese camino.": "; at TeGeVe we support that journey.", "¿Qué es RPA?": "What is RPA?", "es un modelo de servicios en el que el proveedor trabaja desde un país cercano en": "is a service model in which the provider works from a nearby country in", "modernización de legacy": "legacy modernization", "Aportamos": "We bring", "más de 30 años": "more than 30 years", "o por": "or by", "Empezamos con una": "We start with an", "¿Cómo puedo contactar con TeGeVe?": "How can I contact TeGeVe?", "¿Tienes un reto tecnológico?": "Have a technology challenge?", "TGV Intel (herramienta)": "TGV Intel (tool)", "Tevi · Asistente IA": "Tevi · AI Assistant", "Enviar": "Send", "IA Empresarial & BI": "Enterprise AI & BI", "Sectores": "Sectors", "Abrir asistente con IA Tevi": "Open AI assistant Tevi", "Transformamos los proyectos tecnológicos más desafiantes en": "We turn the most challenging technology projects into", "Iniciar un proyecto": "Start a project", "Nos implicamos como partners estratégicos: alineamos tecnología y negocio para que crezcas con solidez.": "We engage as strategic partners: we align technology and business so you grow on solid ground.", "Conocer SAP": "Discover SAP", "Ver caso de éxito": "View success story", "Diapositiva 4": "Slide 4", "Países con proyectos": "Countries with projects", "Somos expertos en el desarrollo de software a medida y en la implementación de paquetes de primer nivel como SAP y Oracle JD Edwards. También nos especializamos en IA Empresarial, integración de aplicaciones, evaluaciones y auditorías.": "We are experts in custom software development and in the implementation of top-tier packages such as SAP and Oracle JD Edwards. We also specialize in Enterprise AI, application integration, assessments and audits.", "Implementación, evolución y soporte de SAP, incluido el camino hacia S/4HANA. Paquetes de primer nivel respaldados por más de 30 años de experiencia.": "Implementation, evolution and support of SAP, including the journey to S/4HANA. Top-tier packages backed by more than 30 years of experience.", "Evaluaciones": "Assessments", "Optimiza la gestión de tu empresa con SAP.": "Optimize the management of your company with SAP.", "AMS · soporte evolutivo": "AMS · evolutionary support", "Un aliado de confianza en Oracle JD Edwards. Implementamos, evolucionamos y damos soporte a EnterpriseOne y World con soluciones a medida que se adaptan a las necesidades reales de cada negocio, con más de una década acompañando operaciones críticas.": "A trusted ally in Oracle JD Edwards. We implement, evolve and support EnterpriseOne and World with custom solutions that adapt to the real needs of each business, with more than a decade supporting critical operations.", "Integramos Business Intelligence, Inteligencia Artificial y automatización (RPA) en una misma estrategia para que tu organización decida mejor y opere con más eficiencia. Llevamos la IA a producción con casos reales.": "We integrate Business Intelligence, Artificial Intelligence and automation (RPA) into a single strategy so your organization decides better and operates more efficiently. We bring AI into production with real cases.", "Ver casos de IA": "View AI cases", "Proyectos llave en mano, del análisis a producción, con un plan claro y entregables medibles.": "Turnkey projects, from analysis to production, with a clear plan and measurable deliverables.", "Misma franja horaria, cultura cercana y costes optimizados: colaboración en tiempo real desde España y Latinoamérica.": "Same time zone, close culture and optimized costs: real-time collaboration from Spain and Latin America.", "Combinamos desarrollo a medida con el dominio de software empresarial de primer nivel para integrar sistemas de múltiple envergadura.": "We combine custom development with mastery of top-tier enterprise software to integrate systems of multiple scales.", "Acompañamos a nuestros clientes en la adopción de la solución digital oportuna y adecuada para cada negocio, sector y cultura, estableciendo relaciones duraderas.": "We support our clients in adopting the timely and appropriate digital solution for each business, sector and culture, building lasting relationships.", "Retail & Distribución": "Retail & Distribution", "Sector Público": "Public Sector", "Busca por cliente, tecnología o sector: SAP, IA, banca, ruteo, EMV…": "Search by client, technology or sector: SAP, AI, banking, routing, EMV…", "IA que convierte cuatro días de conciliación de FCI en cuestión de horas": "AI that turns four days of FCI reconciliation into a matter of hours", "Solución.": "Solution.", "La empresa planificaba su operación logística diaria de forma manual con hojas de Excel: procesaba pedidos, completaba datos faltantes y definía recorridos según la flota disponible. Era un proceso complejo y exigente, con alto riesgo de error y fuerte dependencia del conocimiento del programador logístico, que debía gestionar a mano múltiples restricciones (carga correcta de cisternas, estabilidad de los camiones, separación de combustibles y eficiencia de las rutas).": "The company planned its daily logistics operation manually with Excel spreadsheets: it processed orders, filled in missing data and defined routes according to the available fleet. It was a complex and demanding process, with high risk of error and strong dependence on the knowledge of the logistics planner, who had to manually manage multiple constraints (correct tanker loading, truck stability, fuel separation and route efficiency).", "optimizacion de flota": "fleet optimization", "Doce años de acompañamiento sobre JD Edwards: un ERP que crece con el negocio agroindustrial": "Twelve years supporting JD Edwards: an ERP that grows with the agro-industrial business", "equipamiento agricola": "agricultural equipment", "Seguridad robusta en Oracle JD Edwards: un modelo de acceso confiable para un líder del agro": "Robust security in Oracle JD Edwards: a reliable access model for an agribusiness leader", "seguridad": "security", "Consumo masivo": "Consumer goods", "El personal administrativo accede a la información en tiempo real y el equipo antes dedicado a la revisión manual quedó liberado para otras tareas. La parametrización de tendencias reduce el volumen de tickets y aligera la carga de los equipos de soporte. El trabajo conjunto con el cliente permitió incorporar funcionalidades adicionales no previstas inicialmente, como una pantalla de errores frecuentes con navegación hacia sus soluciones.": "Administrative staff access information in real time and the team previously dedicated to manual review was freed up for other tasks. Configuring trends reduces the volume of tickets and lightens the load on support teams. Working together with the client made it possible to incorporate additional features not initially planned, such as a frequent errors screen with navigation to their solutions.", "integracion": "integration", "Empresa agroindustrial líder en Argentina": "Leading agro-industrial company in Argentina", "mesa de ayuda": "help desk", "agroindustria": "agro-industry", "Como líder mundial en productos de higiene, Kimberly-Clark necesitaba detectar tendencias de consumo y anticipar distintos escenarios para definir estrategias seguras. Para ello requería acceso a información actualizada en tiempo real desde sus filiales, con la flexibilidad y escalabilidad necesarias para sostener el crecimiento del análisis.": "As a world leader in hygiene products, Kimberly-Clark needed to detect consumption trends and anticipate different scenarios to define safe strategies. To do so, it required access to real-time updated information from its subsidiaries, with the flexibility and scalability needed to sustain the growth of the analysis.", "tendencias de consumo": "consumption trends", "El nuevo desarrollo aporta mayor trazabilidad del funcionamiento y un soporte evolutivo de calidad que facilita la adaptación a futuros requerimientos. Al unificar la solución en una sola aplicación, se redujeron los costes de mantenimiento y mejoró la experiencia de usuario.": "The new development provides greater traceability of operation and quality evolutionary support that facilitates adaptation to future requirements. By unifying the solution into a single application, maintenance costs were reduced and the user experience improved.", "Una Software Factory que mantiene a una aseguradora líder al ritmo de su negocio": "A Software Factory that keeps a leading insurer at the pace of its business", "seguros": "insurance", "ciclo de vida": "life cycle", "antifraude": "anti-fraud", "First Data, entidad financiera licenciataria de MasterCard, necesitaba incorporar a sus sistemas nuevas prestaciones que acompañaran sus estrategias de marketing y elevaran la calidad de servicios como MasterAssist, los préstamos en línea y los resúmenes de gastos con información más detallada.": "First Data, a financial institution licensed by MasterCard, needed to add new features to its systems to support its marketing strategies and raise the quality of services such as MasterAssist, online loans and expense statements with more detailed information.", "El equipo de TeGeVe llevó a cabo un Business Value Assessment: mapeó los procesos y el ecosistema tecnológico para construir un modelo As Is, diseñó un modelo multidimensional de evaluación a medida y, sobre esa base, realizó un análisis comparativo de dos opciones de ERP world-class.": "The TeGeVe team carried out a Business Value Assessment: it mapped the processes and the technology ecosystem to build an As Is model, designed a custom multidimensional evaluation model and, on that basis, performed a comparative analysis of two world-class ERP options.", "seleccion de erp": "erp selection", "Hemos acompañado a líderes de banca, telecomunicaciones, gran consumo, energía e industria en Europa y América.": "We have supported leaders in banking, telecommunications, mass consumption, energy and industry across Europe and the Americas.", "IT Region Manager, Latinoamérica · Weatherford": "IT Region Manager, Latin America · Weatherford", "Gerente de Desarrollo Core · Banco Comafi": "Core Development Manager · Banco Comafi", "Experiencia profunda en desarrollo a medida, SAP, JD Edwards, IA y modernización de legacy. Hemos visto —y resuelto— casi todo.": "Deep experience in custom development, SAP, JD Edwards, AI and legacy modernization. We have seen —and solved— almost everything.", "Entendemos las necesidades reales del negocio para generar una propuesta de valor y optimizar costes antes de invertir.": "We understand the real needs of the business to generate a value proposition and optimize costs before investing.", "Diversidad y multiculturalidad": "Diversity and multiculturalism", "Pacto Global ONU": "UN Global Compact", "Finalistas de los Premios Sadosky, reconocimiento": "Finalists of the Sadosky Awards, recognition", "nuestro asistente con IA": "our AI assistant", "Conceptos": "Concepts", "más de 30 años de trayectoria": "more than 30 years of track record", "¿Desde qué países presta servicio TeGeVe?": "From which countries does TeGeVe provide service?", "Estados Unidos": "United States", "Europa": "Europe", ". Esa trayectoria nos permite entender el negocio de cada cliente, anticipar riesgos y generar una propuesta de valor que": ". That track record allows us to understand each client's business, anticipate risks and generate a value proposition that", "energía y oil&gas": "energy and oil&gas", "(agentes, RPA y automatización),": "(agents, RPA and automation),", "Sí. Nuestra capacidad de": "Yes. Our capacity for", "El": "The", "optimizar costes": "optimize costs", ", donde la fiabilidad y la continuidad del negocio son críticas. Evolucionamos lo crítico sin poner en riesgo la operación.": ", where reliability and business continuity are critical. We evolve the critical without putting operations at risk.", "relaciones duraderas": "lasting relationships", "camino hacia SAP S/4HANA": "journey to SAP S/4HANA", "Oracle JD Edwards EnterpriseOne y World": "Oracle JD Edwards EnterpriseOne and World", "gobernanza": "governance", "Desde": "From", "JD Edwards": "JD Edwards", ". En TeGeVe lo implementamos, evolucionamos y damos soporte.": ". At TeGeVe we implement, evolve and support it.", ". En TeGeVe lo implementamos, actualizamos y damos soporte.": ". At TeGeVe we implement, update and support it.", "son dos de los ERP más utilizados.": "are two of the most widely used ERPs.", "¿Qué es la IA empresarial?": "What is enterprise AI?", "(Robotic Process Automation) es la automatización de tareas repetitivas y basadas en reglas mediante": "(Robotic Process Automation) is the automation of repetitive, rule-based tasks through", "zona horaria e idioma": "time zone and language", "consiste en evolucionar sistemas antiguos pero críticos (por ejemplo en": "consists of evolving old but critical systems (for example in", "equipos senior cualificados y estables": "qualified and stable senior teams", "equipo dedicado": "dedicated team", "conversación de diagnóstico": "diagnostic conversation", "Según tu región:": "Based on your region:", "Démosle forma.": "Let's shape it.", "Contacto": "Contact", "En línea · te ayuda sobre TeGeVe": "Online · helps you about TeGeVe", "Abrir menú": "Open menu", "Desarrollo a medida": "Custom development", "Por qué elegirnos": "Why choose us", "soluciones innovadoras": "innovative solutions", "Ver servicios": "View services", "Hablar con un experto": "Talk to an expert", "Iniciar diagnóstico": "Start diagnosis", "Explorar IA": "Explore AI", "Nuestras alianzas": "Our partnerships", "Oficinas: España · Argentina · México · USA": "Offices: Spain · Argentina · Mexico · USA", "Java J2EE": "Java J2EE", "Software a medida e integración de sistemas de múltiple envergadura sobre diferentes plataformas tecnológicas. Conectamos tus aplicaciones para que la información fluya end-to-end.": "Custom software and large-scale systems integration across different technology platforms. We connect your applications so information flows end-to-end.", "Incorporamos la inteligencia artificial al negocio: agentes de IA, RPA y automatización inteligente de procesos. Llevamos la IA a producción, con casos reales como la conciliación de fondos de inversión.": "We bring artificial intelligence into the business: AI agents, RPA and intelligent process automation. We take AI to production, with real-world cases such as investment fund reconciliation.", "Auditorías": "Audits", "Conocemos el mundo SAP y sabemos cómo hacer que se integre, evolucione y escale: desde migraciones a SAP S/4HANA hasta desarrollos a medida. Aceleramos los flujos de trabajo, mejoramos la eficiencia operativa y maximizamos el retorno de la inversión.": "We know the SAP world and how to make it integrate, evolve and scale: from migrations to SAP S/4HANA to custom development. We accelerate workflows, improve operational efficiency and maximize return on investment.", "Automatización (RPA + IA)": "Automation (RPA + AI)", "IA agéntica": "Agentic AI", "Desarrollo de software a medida": "Custom software development", "Mantenemos y hacemos evolucionar tus sistemas con niveles de servicio y mejora continua.": "We maintain and evolve your systems with service levels and continuous improvement.", "Cómo trabajamos · 01": "How we work · 01", "Cómo trabajamos · 03": "How we work · 03", "Experiencia": "Experience", "Proyectos para grupos de distribución y retail, como la auditoría a Motta Internacional.": "Projects for distribution and retail groups, such as the audit for Motta Internacional.", "Proyectos con organismos gubernamentales en distintos países de nuestra trayectoria internacional.": "Projects with government agencies in various countries throughout our international track record.", "Buscar casos de éxito": "Browse success stories", "Operadora de la mayor red de gasoductos de Argentina": "Operator of the largest gas pipeline network in Argentina", "TeGeVe desarrolló una aplicación sobre la plataforma de Microsoft con inteligencia artificial que lee e interpreta automáticamente los documentos PDF de los bancos, vuelca los datos en Excel estructurado por FCI y consolida los resultados. El sistema calcula saldos e impuestos, notifica por Outlook y alerta sobre cualquier incidencia.": "TeGeVe developed an application on the Microsoft platform with artificial intelligence that automatically reads and interprets the banks' PDF documents, exports the data into structured Excel by FCI and consolidates the results. The system calculates balances and taxes, sends notifications via Outlook and alerts on any incident.", "TeGeVe desarrolló una aplicación con IA que automatiza la planificación logística replicando la lógica del programador. La solución integra los pedidos de distintas fuentes, completa automáticamente los datos faltantes, optimiza la carga de las cisternas y resuelve el problema de ruteo de vehículos respetando todas las reglas del negocio, generando los recorridos diarios y la documentación de envío de forma automática.": "TeGeVe developed an AI-powered application that automates logistics planning by replicating the planner's logic. The solution integrates orders from different sources, automatically fills in missing data, optimizes tanker loading and solves the vehicle routing problem while respecting all business rules, automatically generating daily routes and shipping documentation.", "Fabricante multinacional de equipamiento agrícola": "Multinational manufacturer of agricultural equipment", "manufactura": "manufacturing", "insumos agricolas": "agricultural inputs", "Monitor de integraciones SAP: datos de empleados unificados y en tiempo real": "SAP integrations monitor: unified, real-time employee data", "rrhh": "hr", "5/5 · Soporte N1 y N2": "5/5 · L1 & L2 support", "soporte remoto": "remote support", "TeGeVe acompañó la evolución de la plataforma analítica del cliente, migrando primero de SAP BW a SAP HANA y Tableau, y posteriormente adoptando Snowflake (Data Cloud) y Power BI en la nube. El equipo habilitó así un entorno escalable que consolida información de las distintas filiales y la pone a disposición de forma actualizada.": "TeGeVe supported the evolution of the client's analytics platform, first migrating from SAP BW to SAP HANA and Tableau, and later adopting Snowflake (Data Cloud) and Power BI in the cloud. The team thus enabled a scalable environment that consolidates information from the different subsidiaries and makes it available in an up-to-date manner.", "toma de decisiones": "decision-making", "banca": "banking", "Aseguradora líder del sector": "Leading insurer in the sector", "Migración a tarjetas con chip EMV: transacciones más seguras y menos fraude": "Migration to EMV chip cards: more secure transactions and less fraud", "tarjetas con chip": "chip cards", "certificacion ic": "ic certification", "TeGeVe integró los sistemas legacy con nuevas funcionalidades y modificaciones para ampliar y mejorar las plataformas de MasterAssist, préstamos, el programa de fidelización, las campañas y las cuentas corrientes, sobre un entorno mainframe.": "TeGeVe integrated legacy systems with new features and modifications to expand and improve the MasterAssist platforms, loans, the loyalty program, campaigns and current accounts, on a mainframe environment.", "Distribución, retail y logística": "Distribution, retail and logistics", "Motta Internacional obtuvo información objetiva y fundada para seleccionar el ERP más conveniente para el grupo, junto con un roadmap de acciones concretas a ejecutar antes de la implementación. La decisión de inversión dejó de basarse en percepciones para apoyarse en evidencia estructurada.": "Motta Internacional obtained objective, well-founded information to select the most suitable ERP for the group, along with a roadmap of concrete actions to execute before implementation. The investment decision stopped relying on perceptions and was instead based on structured evidence.", "Logos de clientes de TeGeVe": "TeGeVe client logos", "Con la ayuda de TGV como socio tecnológico genuino, logramos desarrollar un sistema de control de permanencia que gestiona más de 400 dispositivos móviles distribuidos en todo el país.": "With the help of TGV as a genuine technology partner, we managed to develop an attendance control system that manages more than 400 mobile devices distributed across the country.", "TGV es nuestro proveedor desde 2011. No dudamos en recomendarlos como una empresa a la cual contratar.": "TGV has been our provider since 2011. We have no hesitation in recommending them as a company to hire.", "Equipo cualificado y estable": "Qualified and stable team", "Trato directo, sin capas": "Direct dealing, no layers", "Valores y reconocimientos que respaldan cada proyecto.": "Values and recognitions that back every project.", "Empoderamiento": "Empowerment", "Firmantes del UN Global Compact.": "Signatories of the UN Global Compact.", "abajo a la derecha.": "bottom right.", "Modelo": "Model", "que transforma los proyectos tecnológicos más desafiantes en soluciones innovadoras. Combinamos el": "that transforms the most challenging technology projects into innovative solutions. We combine the", "Prestamos servicios desde": "We provide services from", ", con contacto comercial también en": ", with commercial contact also in", "América": "the Americas", "optimiza costes": "optimizes costs", "infraestructuras": "infrastructures", "integración de aplicaciones": "application integration", "desarrollar software a medida": "developing custom software", "es una práctica de": "is a practice of", "antes de invertir. Un ejemplo es la auditoría que realizamos para": "before investing. One example is the audit we carried out for", "¿Dan soporte y mantenimiento tras la puesta en marcha?": "Do you provide support and maintenance after go-live?", ", no proyectos de usar y tirar.": ", not throwaway projects.", ". Aportamos consultores senior con experiencia en proyectos ERP de gran envergadura y misión crítica.": ". We bring senior consultants with experience in large-scale, mission-critical ERP projects.", ", como partner del ecosistema Oracle/IBM. Trabajamos módulos financieros, de distribución, manufactura y logística en proyectos de misión crítica.": ", as a partner of the Oracle/IBM ecosystem. We work on financial, distribution, manufacturing and logistics modules in mission-critical projects.", ", seguridad del dato y": ", data security and", "agentes de IA": "AI agents", "o aplicaciones a medida.": "or custom applications.", "¿Qué es Oracle JD Edwards?": "What is Oracle JD Edwards?", "¿Qué es un ERP?": "What is an ERP?", "¿Qué es SAP S/4HANA?": "What is SAP S/4HANA?", "La": "The", "“robots” de software": "software “robots”", ", en lugar de deslocalizar a destinos lejanos (offshore). Aporta cercanía cultural, comunicación fluida y costes eficientes. TeGeVe opera en nearshore entre": ", instead of offshoring to distant destinations (offshore). It brings cultural proximity, smooth communication and efficient costs. TeGeVe operates in nearshore between", ") hacia tecnologías y arquitecturas actuales,": ") toward current technologies and architectures,", "trato directo": "direct dealing", "sin perder profundidad técnica": "without losing technical depth", "(nearshore / staff augmentation), según lo que mejor encaje contigo. El precio depende del alcance, pero nuestro modelo nearshore suele ser": "(nearshore / staff augmentation), depending on what best fits you. The price depends on the scope, but our nearshore model is usually", "para entender tu reto y tus necesidades reales. A partir de ahí proponemos un enfoque (assessment, prueba de concepto o proyecto) con un alcance claro. Escríbenos a": "to understand your challenge and your real needs. From there we propose an approach (assessment, proof of concept or project) with a clear scope. Write to us at", "Cuéntanos tu reto y te propondremos un enfoque con un alcance claro, centrado en el valor de negocio y la optimización de costes.": "Tell us your challenge and we will propose an approach with a clear scope, focused on business value and cost optimization.", "Cerrar": "Close", "Servicios": "Services", "Modelos de servicio": "Service models", "Testimonios": "Testimonials", "Contáctanos": "Contact us", "Desarrollo de software a medida,": "Custom software development,", "3 de 4: Migración a SAP S/4HANA": "3 of 4: Migration to SAP S/4HANA", "4 de 4: Automatización con IA": "4 of 4: Automation with AI", "Diapositivas": "Slides", "Nuestras alianzas · partner de ecosistemas de primer nivel": "Our partnerships · top-tier ecosystem partner", "Áreas de especialización": "Areas of expertise", "A medida": "Custom", "Implantación": "Implementation", "Agentes IA": "AI agents", "Qué hacemos": "What we do", "Hablar de JD Edwards": "Talk about JD Edwards", "Agentes de IA": "AI agents", "Evaluación de madurez de IA": "AI maturity assessment", "Simplificamos la complejidad tecnológica.": "We simplify technological complexity.", "Construyamos tu software": "Let's build your software", "Una fábrica de software dedicada que escala tu capacidad de entrega con calidad asegurada.": "A dedicated software factory that scales your delivery capacity with assured quality.", "Entendemos las necesidades reales de tu negocio.": "We understand the real needs of your business.", "Entregamos en modalidad nearshore o en tus oficinas.": "We deliver in nearshore mode or at your offices.", "Proyectos donde el error cuesta caro.": "Projects where mistakes are costly.", "Energía & Oil/Gas": "Energy & Oil/Gas", "Servicios Financieros": "Financial Services", "Filtrar por servicio": "Filter by service", "De 4 días a horas": "From 4 days to hours", "Resultado.": "Result.", "conciliacion": "reconciliation", "Logística (Oil & Gas)": "Logistics (Oil & Gas)", "El equipo automatizó la planificación logística, redujo los tiempos del proceso y eliminó los errores manuales. La solución optimiza el uso de la flota, mejora la eficiencia de los recorridos y estandariza la operación, además de sentar una base sólida para escalar capacidades de IA más avanzadas. El cliente valoró el proyecto con la máxima puntuación (5/5).": "The team automated logistics planning, reduced process times, and eliminated manual errors. The solution optimizes fleet usage, improves route efficiency, and standardizes operations, while laying a solid foundation to scale more advanced AI capabilities. The client rated the project with the highest score (5/5).", "+12 años · 92.000 h/hombre": "+12 years · 92,000 work-hours", "Tras un assessment interno en el área de IT, Nutrien, el mayor proveedor de insumos y servicios para cultivos de la región, identificó la necesidad de revisar el modelo de seguridad de su ERP y formalizar los niveles de acceso de los usuarios en sus operaciones de Chile, Uruguay y Argentina.": "After an internal assessment in the IT area, Nutrien, the region's largest provider of crop inputs and services, identified the need to review its ERP security model and formalize user access levels across its operations in Chile, Uruguay, and Argentina.", "control de accesos": "access control", "Empresa de consumo masivo": "Consumer goods company", "consumo masivo": "consumer goods", "Una de las principales empresas agroindustriales de Argentina necesitaba soporte funcional continuo sobre su sistema SAP, abarcando la resolución de incidencias, la atención de consultas de los usuarios y la capacitación permanente de los nuevos integrantes del equipo.": "One of Argentina's leading agro-industrial companies needed continuous functional support for its SAP system, covering incident resolution, handling user inquiries, and ongoing training for new team members.", "reduccion de costes": "cost reduction", "El seguimiento estadístico de indicadores propios y de mercado a nivel local, regional y global permite optimizar las acciones de producción, logística y exhibición en góndola. Además, la generación de informes facilita redefinir objetivos estratégicos y tomar decisiones fundamentadas a partir de múltiples variables.": "Statistical tracking of proprietary and market indicators at the local, regional, and global level enables optimization of production, logistics, and shelf-display actions. In addition, report generation makes it easier to redefine strategic objectives and make informed decisions based on multiple variables.", "Un sistema de rating crediticio unificado y web que reduce costes de mantenimiento": "A unified, web-based credit rating system that reduces maintenance costs", "rating crediticio": "credit rating", "22 expertos · 32.000 h/año": "22 experts · 32,000 hours/year", "First Data (soluciones globales de pagos)": "First Data (global payment solutions)", "medios de pago": "payment methods", "Finanzas / Medios de pago": "Finance / Payment methods", "La entidad amplió y mejoró su oferta de servicios, reforzando su posicionamiento de mercado. Se incorporaron datos al servicio de asistencia médica, se habilitó una nueva interfaz web en la plataforma de Call Center y se unificó la presentación de bonificaciones en los resúmenes de cuenta.": "The entity expanded and improved its service offering, strengthening its market positioning. Data was added to the medical assistance service, a new web interface was enabled on the Call Center platform, and the presentation of rebates in account statements was unified.", "Business Value Assessment: la decisión de ERP de Motta Internacional, basada en datos": "Business Value Assessment: Motta Internacional's ERP decision, based on data", "Lo que dicen quienes ya trabajan con nosotros.": "What those who already work with us have to say.", "Un equipo multidisciplinar y senior con el que estableces relaciones duraderas. El conocimiento de tu proyecto se queda en casa.": "A multidisciplinary, senior team with whom you build lasting relationships. The knowledge of your project stays in-house.", "Orientación al cliente y escucha activa: trato directo con quien diseña y ejecuta. Decisiones rápidas y foco en el resultado.": "Client focus and active listening: direct dealings with those who design and execute. Fast decisions and a focus on results.", "Una cultura de personas, calidad certificada y compromiso con el sector tecnológico.": "A people-first culture, certified quality, and commitment to the technology sector.", "Compromiso con las personas": "Commitment to people", "en el Oracle JD Edwards Summit y distinción como uno de los mejores empleadores del sector tecnológico durante años consecutivos.": "at the Oracle JD Edwards Summit and recognition as one of the best employers in the technology sector for consecutive years.", "Todas": "All", "¿Qué es TeGeVe?": "What is TeGeVe?", "desarrollo de software a medida": "custom software development", "España": "Spain", "México": "Mexico", ", en modalidad nearshore o en las oficinas del cliente.": ", in nearshore mode or at the client's offices.", ". Hemos acompañado proyectos de misión crítica en banca, energía, infraestructuras y gran consumo.": ". We have supported mission-critical projects in banking, energy, infrastructure, and consumer goods.", "retail y distribución": "retail and distribution", "¿Qué servicios ofrece TeGeVe?": "What services does TeGeVe offer?", "evaluaciones y auditorías (Assessment)": "assessments and audits (Assessment)", ", sumada al conocimiento de software empresarial de primer nivel, nos permite": ", together with top-tier enterprise software expertise, allows us to", "evaluaciones y auditorías": "assessments and audits", "¿Modernizan sistemas legacy y trabajan para banca?": "Do you modernize legacy systems and work for banking?", "Sí. No desaparecemos tras el go-live: ofrecemos": "Yes. We don't disappear after go-live: we offer", "¿Trabaja TeGeVe con SAP y S/4HANA?": "Does TeGeVe work with SAP and S/4HANA?", "¿Qué hacen con Oracle JD Edwards?": "What do you do with Oracle JD Edwards?", "¿Cómo aborda TeGeVe la inteligencia artificial?": "How does TeGeVe approach artificial intelligence?", "retorno medible": "measurable return", "que atienden consultas y ejecutan tareas, hasta": "that handle inquiries and execute tasks, through to", "¿Qué es SAP?": "What is SAP?", "Oracle JD Edwards (JDE)": "Oracle JD Edwards (JDE)", "Un": "A", "es la generación actual del ERP de SAP, construida sobre la base de datos en memoria": "is the current generation of SAP's ERP, built on the in-memory database", "IA empresarial": "enterprise AI", "—por ejemplo conciliaciones, altas de datos o generación de informes—. Libera a los equipos del trabajo manual y reduce errores. En TeGeVe la combinamos con IA para una automatización inteligente.": "—for example reconciliations, data entry, or report generation—. It frees teams from manual work and reduces errors. At TeGeVe we combine it with AI for intelligent automation.", "España y Latinoamérica": "Spain and Latin America", "sin poner en riesgo la continuidad del negocio": "without putting business continuity at risk", "con quien diseña y ejecuta, un": "with those who design and execute, a", "¿Cómo es el modelo de contratación y precio?": "What is the engagement and pricing model?", "Escríbenos": "Write to us", "TeGeVe · TGV Group. Todos los derechos reservados.": "TeGeVe · TGV Group. All rights reserved.", "Asistente basado en la información pública de TeGeVe.": "Assistant based on TeGeVe's public information."};
  var META = {"es": {"title": "TeGeVe — Consultoría y servicios de software | SAP, JD Edwards, IA y desarrollo a medida", "desc": "TeGeVe (TGV) es una consultora tecnológica con más de 30 años de trayectoria. Desarrollo de software a medida, IA Empresarial, SAP y Oracle JD Edwards. Equipo cualificado y multidisciplinar, modalidad nearshore. España, Argentina, México y USA, con proyectos en más de 16 países.", "ogt": "TeGeVe — Transformamos los proyectos tecnológicos más desafiantes en soluciones innovadoras", "ogd": "Consultora tecnológica con +30 años. Desarrollo a medida, IA Empresarial, SAP y Oracle JD Edwards. Modalidad nearshore. España · Argentina · México · USA.", "twt": "TeGeVe — Consultoría y servicios de software", "twd": "+30 años. Desarrollo a medida, IA Empresarial, SAP y Oracle JD Edwards. Nearshore. España · Argentina · México · USA."}, "en": {"title": "TeGeVe — Software consulting & services | SAP, JD Edwards, AI & custom development", "desc": "TeGeVe (TGV) is a technology consultancy with over 30 years of experience. Custom software development, Enterprise AI, SAP and Oracle JD Edwards. A qualified, multidisciplinary team working nearshore. Spain, Argentina and the USA, with projects in more than 16 countries.", "ogt": "TeGeVe — We turn the most challenging technology projects into innovative solutions", "ogd": "Technology consultancy with 30+ years. Custom development, Enterprise AI, SAP and Oracle JD Edwards. Nearshore. Spain · Argentina · Mexico · USA.", "twt": "TeGeVe — Software consulting & services", "twd": "30+ years. Custom development, Enterprise AI, SAP and Oracle JD Edwards. Nearshore. Spain · Argentina · Mexico · USA."}};
  var ATTRS = ['placeholder','aria-label','alt','title'];
  var hasLetter = function(s){ return /[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(s); };
  var tNodes = [], aTargets = [];
  function collect(){
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode:function(n){
      var p=n.parentNode; if(!p) return NodeFilter.FILTER_REJECT;
      var tn=p.nodeName; if(tn==='SCRIPT'||tn==='STYLE'||tn==='NOSCRIPT') return NodeFilter.FILTER_REJECT;
      var t=n.nodeValue.trim(); if(t.length<2||!hasLetter(t)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT; } });
    var n; while(n=w.nextNode()){ tNodes.push({node:n, raw:n.nodeValue}); }
    ATTRS.forEach(function(a){ document.querySelectorAll('['+a+']').forEach(function(el){ var v=el.getAttribute(a); if(v&&v.trim().length>1&&hasLetter(v)) aTargets.push({el:el,attr:a,raw:v}); }); });
  }
  function tr(raw, lang){ var t=raw.trim(); if(lang==='en' && DICT[t]) return raw.replace(t, function(){ return DICT[t]; }); return raw; }
  function setName(name, val){ var m=document.querySelector('meta[name="'+name+'"]'); if(m) m.setAttribute('content', val); }
  function setProp(prop, val){ var m=document.querySelector('meta[property="'+prop+'"]'); if(m) m.setAttribute('content', val); }
  function applyLang(lang){
    if(lang!=='en') lang='es';
    window.__lang = lang;
    tNodes.forEach(function(it){ it.node.nodeValue = tr(it.raw, lang); });
    aTargets.forEach(function(it){ it.el.setAttribute(it.attr, tr(it.raw, lang)); });
    document.documentElement.lang = lang;
    var m = META[lang];
    if(m){ document.title=m.title; setName('description',m.desc); setName('twitter:title',m.twt); setName('twitter:description',m.twd); setProp('og:title',m.ogt); setProp('og:description',m.ogd); setProp('og:locale', lang==='en'?'en_US':'es_ES'); }
    document.querySelectorAll('.lang-opt').forEach(function(b){ var on=b.getAttribute('data-lang')===lang; b.classList.toggle('on',on); b.setAttribute('aria-pressed', on?'true':'false'); });
    try{ localStorage.setItem('tgvLang', lang); }catch(e){}
    document.dispatchEvent(new CustomEvent('langchange',{detail:{lang:lang}}));
  }
  collect();
  document.addEventListener('click', function(e){ var b=e.target.closest ? e.target.closest('.lang-opt') : null; if(b){ e.preventDefault(); applyLang(b.getAttribute('data-lang')); } });
  var saved=null; try{ saved=localStorage.getItem('tgvLang'); }catch(e){}
  var qp=null; try{ qp=new URLSearchParams(location.search).get('lang'); }catch(e){}
  var init = (qp==='en'||qp==='es') ? qp : (saved||'es');
  applyLang(init);
  window.tgvSetLang = applyLang;
})();


/* Formulario de contacto -> FormSubmit (entrega directa a info@tegeve.es, gratis) */
(function(){
  var form=document.getElementById('cform');
  if(!form) return;
  var CONTACT_ENDPOINT='https://formsubmit.co/ajax/info@tegeve.es';
  var msg=document.getElementById('cformMsg');
  var EN=function(){ return window.__lang==='en'; };
  var EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var data={ nombre:form.nombre.value.trim(), empresa:form.empresa.value.trim(),
      email:form.email.value.trim(), reto:form.reto.value.trim(), _gotcha:form._gotcha.value };
    if(!data.nombre||!EMAIL.test(data.email)||!data.reto){
      msg.className='cform-msg err';
      msg.textContent=EN()?'Please fill in your name, a valid email and your message.':'Rellena tu nombre, un email válido y tu mensaje.';
      return;
    }
    if(data._gotcha){ form.reset(); msg.className='cform-msg ok'; msg.textContent=EN()?'Thanks!':'¡Gracias!'; return; }
    form.classList.add('sending');
    msg.className='cform-msg'; msg.textContent=EN()?'Sending…':'Enviando…';
    var payload={ nombre:data.nombre, empresa:data.empresa||'—', email:data.email, reto:data.reto,
      _subject:'Nuevo contacto web — '+data.nombre, _template:'table', _captcha:'false' };
    fetch(CONTACT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)})
      .then(function(r){ return r.json().catch(function(){return{};}).then(function(j){ return {ok:r.ok && String(j&&j.success)==='true', msg:(j&&j.message)||''}; }); })
      .then(function(res){
        form.classList.remove('sending');
        if(res.ok){
          form.reset();
          msg.className='cform-msg ok';
          msg.textContent=EN()?'Thanks — we got your message and will reply shortly.':'¡Gracias! Hemos recibido tu mensaje y te responderemos en breve.';
          return;
        }
        if(/activ/i.test(res.msg)){
          msg.className='cform-msg';
          msg.innerHTML=EN()
            ? 'Almost there — this form needs a one-time activation. Check the inbox <b>info@tegeve.es</b> and click “Activate Form”. After that it just works.'
            : 'Casi listo: el formulario necesita una activación única. Revisa la bandeja de <b>info@tegeve.es</b> y pulsa “Activate Form”. Después funcionará siempre.';
          return;
        }
        throw new Error('fail');
      })
      .catch(function(){
        form.classList.remove('sending');
        msg.className='cform-msg err';
        msg.innerHTML=(EN()?'Could not send right now. Email us at ':'No se ha podido enviar ahora. Escríbenos a ')+'<a href="mailto:info@tegeve.es" style="color:#ff8088;text-decoration:underline">info@tegeve.es</a>.';
      });
  });
})();
