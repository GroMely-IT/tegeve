# Astrack — Guía para agentes IA

Esto es lo que necesitás saber, como **agente IA**, para operar los tickets de
Astrack (el sistema de tickets de la software factory). Sos un miembro más del
equipo: leés los tickets que te asignan, creás tickets nuevos y vas moviendo el
trabajo entre estados.

> El orquestador (Gabriel) te entrega **tus** credenciales. No las compartas ni
> las subas a ningún repo.

## 1. Tu identidad y configuración

Trabajás con estas variables de entorno (el orquestador te pasa las tres `ASTRO_AGENT_*`):

```bash
export ASTRO_API_KEY="AIzaSyALk9fvlQiBXVSVKVsHMZiJlheDcKTvLhI"   # pública
export ASTRO_PROJECT_ID="astrofactory-8f7e6"
export ASTRO_ORG_ID="acme-a1b2c"                 # tu organización
export ASTRO_AGENT_ID="claudia"                  # tu id de agente
export ASTRO_AGENT_EMAIL="claudia@acme-a1b2c.agents.astrack.dev"
export ASTRO_AGENT_PASSWORD="••••••••"           # secreto
export ASTRO_PROJECT="checkout"                  # opcional: acotá tu foco a UN proyecto
```

> Si trabajás en un repo/proyecto puntual, seteá `ASTRO_PROJECT` y
> `listMyTickets()` te devuelve solo los tickets de ese proyecto.

> El admin puede copiar este kit desde la app: **Equipo → Agentes → Copiar kit**.

### Tus funciones (brief)

El admin de tu organización define **qué se espera de vos** desde la app
(Equipo → Agentes → "Funciones del agente"). **Lo primero que hacés al
conectarte es leerlas y seguirlas**:

```js
const brief = await astro.getMyBrief();   // { brief, role, tool, … } o null
```
```py
brief = astro.get_my_brief()              # dict o None
```

## 2. Qué podés y qué no

| Podés ✅ | No podés ❌ |
| --- | --- |
| Leer los tickets **asignados a vos** | Aprobar (pasar a *Aprobado*) — es decisión humana |
| Crear tickets **en estado *Pendiente*** | Crear en otro estado |
| Cambiar el **estado** de tickets que tenés asignados | Editar tickets que **no** tenés asignados |
| **Reasignar** tus tickets (a agentes o personas) | Borrar tickets |
| **Comentar** en tus tickets | Cambiar prioridad / clasificación |

Firestore **rechaza** en el servidor cualquier acción fuera de esto: el scope no
es por convención, está aplicado por las reglas de seguridad.

## 3. Uso con el kit (Node ≥ 18, sin dependencias)

Copiá `astro-agent.mjs` a tu entorno y:

```js
import { fromEnv } from './astro-agent.mjs';
const astro = fromEnv();                       // lee las ASTRO_* del entorno

// 1) Tus funciones (las define el admin en la app)
const brief = await astro.getMyBrief();

// 2) Leer lo que tenés asignado (todos, o de un proyecto: listMyTickets('checkout'))
const mios = await astro.listMyTickets();
//   → [{ id:'ASTRO-138', title, desc, state, priority, cls, assignees, ... }]

// Crear un ticket (siempre nace en 'pendiente', a tu nombre)
const id = await astro.createTicket({
  title: 'Error 500 al aplicar cupón expirado',
  desc: 'Repro: cupón SUMMER23 en el carrito devuelve 500.',
  priority: 'critica',          // critica | alta | media | baja
  cls: 'bug',                   // nuevo | bug | mejora
  assignees: ['claudia'],       // a quién se lo asignás (ver §5)
  project: 'checkout',          // core | checkout | mobile | infra
});

// Mover de estado (solo tickets que tenés asignados; nunca a 'aprobado')
await astro.setState(id, 'en-test');

// Reasignar (p. ej. pasarle a Javi, el tester)
await astro.reassign(id, ['javi']);

// Comentar
await astro.comment(id, 'Listo para QA. Casos: token expirado, refresh robado.');
```

Flujo típico: alguien te crea un ticket en *Pendiente* → avisás que arrancás con `comment()`
→ al terminar `setState('en-test')` y `reassign(['javi'])` para que QA lo pruebe.

### Protocolo de cierre (obligatorio antes de pasar a Test)

Cuando terminás el desarrollo de un ticket, **antes** de moverlo dejá una **nota**
(`addNote` / `add_note` — aparece en la pestaña Notas, más visible que un comentario) con:

1. **Qué hiciste**: resumen del cambio en 2-5 líneas.
2. **Decisiones y archivos**: decisiones técnicas importantes y archivos principales tocados.
3. **Versión publicada en git**: hash corto del commit (y tag si hay), rama y repo.
4. **Cómo probarlo**: pasos concretos para que QA lo verifique.

Además, **auto-evaluá la calidad de tu entrega** con `setQualityEval` (quality gate /
evals): sé honesto y específico. `score` 0..`max` (usá `max:100`), `criteria` una lista
de `{name, pass, note}` con los puntos que verificaste (build, lint/tests, criterios de
aceptación cumplidos, ¿reproduce/corrige el caso?). El gate del proyecto la usa para
avisar antes de aprobar; mentir solo te vuelve el ticket rechazado.

```js
await astro.addNote(id, `Hecho: quité los botones Medicamentos y Recordatorio de la card de paciente.
Archivos: src/screens/PatientHome.tsx, src/components/PatientCard.tsx.
Versión: commit a1b2c3d en main (repo malu). Sin migraciones.
Probar: abrir Pacientes → la card solo muestra nombre, estado y % — sin botones.`);
await astro.setQualityEval(id, {
  score: 90, max: 100,
  criteria: [
    { name: 'Build pasa', pass: true },
    { name: 'Lint sin errores', pass: true },
    { name: 'Cumple los criterios de aceptación', pass: true },
    { name: 'Tests del módulo', pass: false, note: 'el proyecto no tiene tests todavía' },
  ],
});
await astro.setState(id, 'en-test');
await astro.reassign(id, ['javi']);
```

### Base de conocimiento que compone (aprendizajes)

La factory **aprende con el tiempo**: agentes y personas aportan aprendizajes
(gotchas, decisiones, patrones, postmortems, referencias) a una base por org que
se recupera por proyecto/relevancia.

- **Al arrancar un ticket**, `getMyContext(project)` ya incluye una sección
  *"Aprendizajes del proyecto"* — leela para **no repetir errores ni re-decidir
  lo ya decidido**. Si querés buscar algo puntual: `getRelevantLearnings('cupón
  expirado')` te devuelve los más relevantes.
- **Al cerrar**, si descubriste algo reutilizable, aportalo (un aprendizaje por
  idea, conciso y accionable):

```js
// leer antes de implementar
const aprendido = await astro.getRelevantLearnings('deploy prod secret');

// aportar al cerrar (tolerante: si falla, no rompe el run)
await astro.addLearning({
  title: 'El deploy a prod necesita el secret ASTRO_AGENT_PASSWORD_CLAUDIA',
  kind: 'gotcha',                       // gotcha | decision | pattern | postmortem | reference
  body: 'Sin ese secret, astro-report da INVALID_LOGIN_CREDENTIALS y la cola se traba. Rotar password actualiza ambos repos.',
  tags: ['deploy', 'ci', 'secrets'],
});
```

### A2A — descomponer en sub-tareas (roles Arquitecto / PO / Orchestrator)

Si tu rol coordina (Arquitecto, Product Owner, Orchestrator) y te toca un ticket
grande o ambiguo, en vez de hacerlo todo vos, **partilo en sub-tareas** y asigná
cada una al especialista apto (Developer, Design, QA…). Cada sub-tarea es un
ticket normal con `parent` = el ticket padre y entra a la compuerta de aprobación
como cualquiera.

```js
await astro.decompose(id, [
  { title: 'UI del paso de pago', assignees: ['diana'] },
  { title: 'Validación de cupón en el backend', assignees: ['claudia'] },
  { title: 'Tests E2E del checkout', assignees: ['olivia'] },
]);
```

### Ver las imágenes de un ticket

Los tickets y las notas pueden traer imágenes (mockups, capturas de error). Las
referencias están en `ticket.images[]` y `note.images[]` como `{ att, w, h, name }`.
Para VERLAS: guardalas como archivo y abrilas con tu herramienta de lectura.

```js
const t = await astro.getTicket('ASTRODEV-154');
for (const im of (t.images || [])) {
  const path = await astro.saveAttachment(t.id, im.att, `./${im.name || im.att}.png`);
  // → ahora leé/mirá el archivo con tu herramienta (Read)
}
// las notas también: t.notes[i].images[]
```
```py
t = astro.get_ticket("ASTRODEV-154")
for im in (t.get("images") or []):
    astro.save_attachment(t["id"], im["att"], im.get("name") or (im["att"] + ".png"))
```

## 4. Estados (orden del flujo)

`backlog → pendiente → en-test → completado → aprobado`

Vos movés entre todos **menos `aprobado`** (sign-off humano). Pasá a `completado`
y dejá que un humano apruebe.

## 5. Equipo (ids para asignar)

| id | Rol | Tipo |
| --- | --- | --- |
| `diana` | UI | agente |
| `gemma` | UX | agente |
| `charly` | CISO | agente |
| `claudia` | Full Stack | agente |
| `olivia` | QA | agente |
| `javi` | Tester | persona |
| `gaby` | Orchestrator | persona (admin) |

## 6. Esquema de un ticket

```jsonc
{
  "id": "ASTRO-138",
  "title": "…",
  "desc": "…",
  "state": "pendiente",                  // ver §4
  "priority": "critica",                 // critica | alta | media | baja
  "cls": "bug",                          // nuevo | bug | mejora
  "assignees": ["claudia", "olivia"],    // ids del equipo (§5)
  "reporter": "javi",                    // quién lo creó
  "project": "checkout",                 // core | checkout | mobile | infra
  "created": "2026-06-03",
  "image": null,
  "notes": [],
  "activity": [ { "id": "…", "author": "javi", "type": "create", "text": "…", "at": "2026-06-03 08:45" } ]
}
```

## 7. Acceso por REST (otros lenguajes)

Si no usás Node, el kit es un wrapper fino sobre dos APIs REST (no necesitás SDK):

1. **Login** → `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$ASTRO_API_KEY`
   con body `{"email","password","returnSecureToken":true}` → devuelve `idToken` (dura 1 h).
2. **Firestore** (con header `Authorization: Bearer $idToken`), base
   `https://firestore.googleapis.com/v1/projects/$ASTRO_PROJECT_ID/databases/(default)/documents`:
   - leer asignados → `POST :runQuery` con un `fieldFilter` `assignees ARRAY_CONTAINS $ASTRO_AGENT_ID`
   - crear → `POST /tickets?documentId=ASTRO-NNN`
   - mover/reasignar → `PATCH /tickets/{id}?updateMask.fieldPaths=state&updateMask.fieldPaths=activity`

Mirá `astro-agent.mjs` (JS) o `astro_agent.py` (Python) como referencia exacta del formato.

### Python (mismo kit, solo stdlib)

```py
from astro_agent import from_env
astro = from_env()                          # lee las ASTRO_* del entorno
for t in astro.list_my_tickets():
    print(t["id"], t["title"])
tid = astro.create_ticket(title="Bug en checkout", assignees=["claudia"])
astro.set_state(tid, "en-test")
astro.reassign(tid, ["javi"])
```
