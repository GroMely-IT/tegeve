#!/usr/bin/env node
/* ============================================================
   astro-report.mjs — reporta al ticket el resultado de un deploy.
   Lo usa el workflow de CI (no Claudia). Si el reporte falla, sale
   con código 1 para que el run lo muestre (el deploy en sí ya pasó).
     node agent-kit/astro-report.mjs preview <ticketId> <url> [channel]
     node agent-kit/astro-report.mjs prod    <ticketId> <live|failed|conflict> [runUrl]
     node agent-kit/astro-report.mjs files   <ticketId> <rama> <a.js,b.css> [sha]
     node agent-kit/astro-report.mjs queue-done <ticketId>
     node agent-kit/astro-report.mjs cost    <ticketId> <usd> <turnos> <tokens> <ms> <loc> [modelo] [in] [out] [cacheR] [cacheW]
     node agent-kit/astro-report.mjs heartbeat <ticketId> <fase> <tokens>
     node agent-kit/astro-report.mjs note    <ticketId> <texto>
     node agent-kit/astro-report.mjs suite   <ticketId> <ok|failed> <report|enforce> [comando]
     node agent-kit/astro-report.mjs checklist <ticketId>            (R2.3c: escribe el markdown en $RUNNER_TEMP/checklist.md)
     node agent-kit/astro-report.mjs pr      <ticketId> <url> <numero>  (R2.3c)
     node agent-kit/astro-report.mjs transcript <ticketId> <runUrl>     (R2.3c)
     node agent-kit/astro-report.mjs specs   <ticketId>                (SDD-2: escribe specs/<ticketId>/*.md en el cwd)
   ============================================================ */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fromEnv, renderChecklist, renderSpecMd, renderPlanMd, renderDecisionsMd } from './astro-agent.mjs';

const [kind, ticketId, a, b, c, d, e, f, g, h, i, j] = process.argv.slice(2);
if (!kind || !ticketId) {
  console.error('uso: astro-report.mjs <preview|prod> <ticketId> ...');
  process.exit(0);
}

try {
  const astro = fromEnv();
  if (kind === 'preview') {
    await astro.setPreview(ticketId, { url: a, channel: b || '' });
  } else if (kind === 'prod') {
    await astro.setProdDeploy(ticketId, { status: a || 'live', runUrl: b || '' });
  } else if (kind === 'files') {
    // a = rama, b = lista de archivos separada por comas, c = HEAD sha (SHA-gate del deploy)
    await astro.setQueueFiles(ticketId, { branch: a || '', files: (b || '').split(',').filter(Boolean), sha: c || '' });
  } else if (kind === 'queue-done') {
    await astro.setQueueDone(ticketId);
  } else if (kind === 'cost') {
    // a=usd, b=turnos, c=tokens, d=tiempo del agente (ms), e=líneas tocadas (LOC),
    // f=modelo usado (R1.5 — trazabilidad de costo por modelo/rol).
    // g/h/i/j=desglose de tokens input/output/cacheRead/cacheWrite (R2.5) —
    // OPCIONALES al final (default 0): retrocompat con workflows sin reinstalar el kit.
    // El nombre 'cost' queda por compat; ahora reporta todas las métricas del run.
    await astro.setRunMetrics(ticketId, {
      usd: Number(a) || 0, turns: Number(b) || 0,
      tokens: Number(c) || 0, agentMs: Number(d) || 0, linesChanged: Number(e) || 0,
      model: f || '',
      tokensBreakdown: {
        input: Number(g) || 0, output: Number(h) || 0, cacheRead: Number(i) || 0, cacheWrite: Number(j) || 0,
      },
      // Con qué credencial corrió: el workflow setea ASTRO_AUTH_MODE=apikey cuando
      // el repo tiene cargado el secret ANTHROPIC_API_KEY (facturás por token);
      // si no, oauth (token de tu suscripción, cubierto por el plan). Para el panel de costos.
      authMode: process.env.ASTRO_AUTH_MODE === 'apikey' ? 'apikey' : 'oauth',
    });
  } else if (kind === 'note') {
    // a = texto libre. R2.5 (AC4): lo usa el workflow cuando el REPORTE de costo
    // falla, para dejar rastro visible SIN reutilizar run-failed (que prepende
    // "❌ Ejecución fallida" — dispatch.js lo lee para decidir si el DISPATCH
    // completo falló; un fallo del reporte de costo no es eso, y reusar esa nota
    // marcaría un run exitoso como fallido por error ajeno al agente).
    await astro.addNote(ticketId, a || '⚙️ evento sin detalle');
  } else if (kind === 'heartbeat') {
    // a=fase (último tool visto por el hook PostToolUse), b=tokens aprox.
    // R2.3a: un latido perdido NO debe tumbar el step de CI ni el run — se
    // aísla en su propio try/catch (no reusa el catch general, que sale con
    // código 1) y solo deja constancia en stderr.
    try {
      await astro.sendHeartbeat(ticketId, { fase: a || '', tokens: Number(b) || 0 });
    } catch (e) {
      console.error(`[astro-report] heartbeat falló (no rompe el run): ${e.message}`);
    }
  } else if (kind === 'run-failed') {
    // a = motivo. Deja la nota ❌ con el porqué; la transición del dispatch a
    // 'error' la hace la Function al ver el queue-done con el ticket quieto.
    await astro.addNote(ticketId, `❌ Ejecución fallida: ${a || 'el run de GitHub Actions terminó con error'} — revisá el log del run. Para reintentar, aprobá la ejecución de nuevo desde el board.`);
  } else if (kind === 'build-failed') {
    // a = motivo. La suite del proyecto es COMPUERTA (E5/T5.1): si el ticket YA está en
    // en-test (el agente entregó) pero el build/suite determinista falló, lo bajamos a
    // 'pendiente' para que un build roto NO quede esperando revisión humana. Si el agente
    // murió antes de entregar (no está en en-test), solo dejamos la nota.
    const t = await astro.getTicket(ticketId);
    const motivo = a || 'el build/suite del proyecto falló (ver el log del run)';
    if (t && t.state === 'en-test') {
      await astro.setState(ticketId, 'pendiente');
      await astro.addNote(ticketId, `❌ El build/suite del proyecto FALLÓ tras la entrega — vuelve a desarrollo (la suite es compuerta): ${motivo}`);
    } else {
      await astro.addNote(ticketId, `❌ Falla del run: ${motivo} — revisá el log. Para reintentar, aprobá la ejecución de nuevo.`);
    }
  } else if (kind === 'qa-eval') {
    // a = score, b = max (default 100), c = criteria JSON [{name,pass,note}]
    let criteria = [];
    try { criteria = c ? JSON.parse(c) : []; } catch (_) { criteria = []; }
    await astro.setQualityEval(ticketId, { score: Number(a) || 0, max: Number(b) || 100, criteria });
  } else if (kind === 'qa') {
    // a = ok|failed · b = detalle
    await astro.addNote(ticketId, a === 'ok'
      ? `🧪 Olivia (QA automática): lint OK${b ? ` — ${b}` : ''}`
      : `🧪 Olivia (QA automática): el lint FALLÓ — revisar antes de aprobar.${b ? `
${b}` : ''}`);
  } else if (kind === 'suite') {
    // a = ok|failed · b = report|enforce · c = comando que corrió
    // La nota es lo que LEE EL HUMANO al firmar G2: tiene que decir sin ambigüedad
    // si la suite pasó, y si un rojo bloqueó o no. Nunca "verde" por omisión.
    const cmd = c ? ` (\`${c}\`)` : '';
    await astro.addNote(ticketId, a === 'ok'
      ? `🧪 Suite de tests: VERDE${cmd}`
      : b === 'enforce'
        ? `❌ Suite de tests: ROJA${cmd} — compuerta activa: el ticket vuelve a desarrollo. Revisá el log del run.`
        : `⚠️ Suite de tests: ROJA${cmd} — este proyecto está en modo \`report\`, así que NO bloquea. Esto NO es verde: no lo apruebes sin mirar el log.`);
  } else if (kind === 'checklist') {
    // R2.3c: SIN args extra — lee acceptanceCriteria del ticket y escribe el
    // markdown en $RUNNER_TEMP/checklist.md (NO por stdout, para no mezclarlo con
    // la línea "[astro-report] OK" que este mismo script imprime al final).
    const t = await astro.getTicket(ticketId);
    const md = renderChecklist(t?.acceptanceCriteria);
    const out = `${process.env.RUNNER_TEMP || '.'}/checklist.md`;
    writeFileSync(out, md);
    console.error(`[astro-report] checklist escrito en ${out}`);
  } else if (kind === 'pr') {
    // a = url del draft PR, b = número
    await astro.setPullRequest(ticketId, { url: a || '', number: Number(b) || 0 });
  } else if (kind === 'transcript') {
    // a = runUrl del job de Actions (donde quedó el artifact de la transcripción)
    await astro.setTranscript(ticketId, { runUrl: a || '' });
  } else if (kind === 'specs') {
    // SDD-2: sync UNIDIRECCIONAL Firestore→repo de los artefactos del plan —
    // Firestore sigue siendo la fuente operativa (UI/gates/cuadrilla); esto es
    // la copia durable versionada. Escribe en el CWD (el checkout de la rama
    // del ticket), no en $RUNNER_TEMP — el workflow los commitea después. Sin
    // args extra: mismo criterio que 'checklist'.
    // R3.1b-review (hallazgo real): si getTicket() falla acá (Firestore caído
    // un instante), este step no escribe NADA — y si el ticket luego reintenta
    // (session-limit/529 de Claude en el MISMO run, o el reconciler/botón
    // "Reintentar" en un run posterior), el commit de specs podría terminar
    // aterrizando DESPUÉS de commits de código ya pusheados por Claudia en el
    // intento fallido, violando el orden que garantiza este diseño. Un blip
    // transitorio de Firestore es el caso más probable y el más barato de
    // blindar — 2 reintentos cortos angostan la ventana de forma significativa
    // (no la eliminan del todo: si Firestore está caído el step ENTERO, sigue
    // degradando best-effort, documentado como limitación aceptada del ADR).
    let t;
    for (let attempt = 1; ; attempt++) {
      try { t = await astro.getTicket(ticketId); break; }
      catch (e) {
        if (attempt >= 3) throw e;
        console.error(`[astro-report] specs: getTicket falló (intento ${attempt}/3, reintentando): ${e.message}`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    const dir = `specs/${ticketId}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/spec.md`, renderSpecMd(ticketId, t?.acceptanceCriteria));
    writeFileSync(`${dir}/plan.md`, renderPlanMd(t?.planSpec, t?.uiSpec));
    writeFileSync(`${dir}/decisions.md`, renderDecisionsMd(t?.adr));
    console.error(`[astro-report] specs escritos en ${dir}/`);
  } else {
    console.error(`tipo desconocido: ${kind}`);
    process.exit(0);
  }
  console.log(`[astro-report] ${kind} OK para ${ticketId}`);
} catch (e) {
  console.error(`[astro-report] FALLÓ: ${e.message} — el ticket quedó sin este dato (el deploy en sí no se afecta)`);
  process.exit(1);
}
