# Trustee Panel routing note — which District Admin a field worker reports to and who may change it, the same worker in two Pariwars, and whether the Pariwar Admin's fill-in is enforced, and who approves a registered field worker (four questions, all non-blocking)

> **Status: DRAFTED 2026-11-03 for BigDev to send — ⛔ NOT yet sent.** Nothing here is recorded as asked of, or shown to, the Panel until
> BigDev sends it ([[feedback_shown_to_panel_means_sent]]). Written by Story 13.1 (`13-1-field-worker-identity-lifecycle-state-machine`)
> as the follow-up to your ruling [`2026-11-03-441`](../../.decision-log.md#decision-2026-11-03-441) and to BigDev's account of how field
> workers actually work. **All four questions are non-blocking:** the build goes ahead on our suggestions, and no screen or route for any of
> them exists yet.

## §0 — the gate

**It is the Panel's.** In your last ruling you said the District Admin will manage field workers and the Pariwar Admin fills in. Since then
BigDev has told us how the work really runs: **a field worker is not restricted to one district — a school may sit near a boundary, and visiting it
again would cost money and time — so a code works anywhere in the Pariwar; what a district decides is which District Admin the worker
reports to. A worker stays with one District Admin for a few months, until the work there is complete, then reports to the next, rather
than the Trust hiring and training someone new; and workers will also move between Pariwars.** That raises three questions about who the
Trust trusts with whom, which only you can answer: *who* may change the District Admin a worker reports to (it changes which of your
officers is responsible for them); whether a worker who moves to another Pariwar is *the same person*
to the Trust (it decides what the Trust holds about a person, and what it may later owe them); and how to read your own "fill-in". A fourth question comes from BigDev's account of how workers are taken on: who *approves* a
registered field worker, which is what makes them creditable.

Everything else is ours and is ⛔ in this note: how a move is recorded, the screens, and the names of the permissions. One thing you have
already decided and we have not reopened: **the District Admin is the intended manager, the Pariwar Admin fills in, and the full log is
kept** (`-441`).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. ⭐ Everything below is then kept **unedited** as the question **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# Question 1 — who may change the District Admin a field worker reports to?

**In one sentence:** a field worker reports to the District Admin of one district, but is free to recruit anywhere in the Pariwar. Now and
then the District Admin they report to has to change — the worker asks, or the Trust needs them elsewhere. Who may make that change?

**Why it cannot be decided without you:** it changes which of your officers is responsible for a worker, so it is a decision about
authority between them, not about software.

**What this does not change:** where a worker recruits. A code works anywhere in the Pariwar and a sign-up is credited whichever district
the member is in, so a school near a district boundary needs no change and no second trip (BigDev: workers should not be restricted to a
district for that reason). What the district decides is who *manages* the worker: who can suspend them, end them and see them.

## The one fact that decides it

**Whether the District Admin at the other end of the change must agree.** If they must, a change needs two officers — one asks, the
other accepts or refuses; if they need not, one officer can make it alone.

## What you are choosing between (Question 1)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **By consent.** When a worker asks to report elsewhere, the District Admin of the district they are leaving **or** the one they are joining opens a request; the other **accepts or refuses it, giving a reason from a fixed list**. The worker stays where they are until it is accepted. A request left unanswered for 7 days goes to the Pariwar Admin and is **never accepted by default**. The Pariwar Admin may also move a worker directly, for either reason, and settles a refused or unanswered request. Both District Admins are told by email and in the admin console, including when the Pariwar Admin moves a worker. *Our suggestion; BigDev's rule.* | No District Admin gains or loses a worker without having agreed. The Pariwar Admin is involved only in disputes and when the Trust itself needs the change. | Two actions for every move, and a refusal leaves the worker where they were. "At the worker's request" is the officer's word — the system cannot see that the worker asked. A District Admin who keeps refusing sends the dispute to the Pariwar Admin. |
| **B** | **Only the Pariwar Admin changes it, whatever the reason**; District Admins ask. | A worker reports elsewhere when the Pariwar Admin says so. | Every change waits on the Pariwar Admin, who then carries all the routine ones; the District Admin "manages" workers but cannot move them. |
| **C** | **Either District Admin may record the change alone**, at the worker's request. | One officer moves a worker at once. | One District Admin can send a worker to, or take one from, another without agreement; the other is only told afterwards. |

**Our reading:** A — **because** it keeps each District Admin in control of who they are responsible for, keeps the Pariwar Admin out of
routine moves, and leaves a record of who asked, who agreed or refused, and why. You can reject this reading and still use the note: B
and C are costed above on the same terms.

---

# Question 2 — a worker who moves to another Pariwar: the same worker, or a new one?

**In one sentence:** a field worker who has worked for one Pariwar moves to another — is that the same worker, with the same code and the
same history, or a new registration in the new Pariwar?

**Why it cannot be decided without you:** whether the Trust treats the person as one across Pariwars decides whether one Pariwar's record
of them can be seen from another's — and whether they hold one code or one for each Pariwar.

## The one fact that decides it

**Whether the Trust wants to see a worker as one person across Pariwars.** Each Pariwar is kept separate from the others in the system;
a worker's code works only in the Pariwar that issued it.

## What you are choosing between (Question 2)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **A new registration in the new Pariwar.** *Built this way; our suggestion.* | The worker gets a new code in the new Pariwar; the old record stays as it is. Two records, no link between them. | One person, two records: their work is split, and a single view of them — or one commission statement across Pariwars — needs a link added later. |
| **B** | **One worker across Pariwars.** | One person, one history, a code that works wherever they serve. | A new capability that changes work already built and the wall between Pariwars: a worker's record would have to be visible to more than one Pariwar. |
| **C** | **A new registration now, plus a link between a person's records later.** | As A today; a Trust-level view of one person when the link exists. | A later piece of work and a later decision about what may be shared between Pariwars. |

**Our reading:** A — **because** it is how the system is built and how members' postings already work (a member who changes district stays
in their Pariwar; moving them between Pariwars is left out as a much larger piece of work), and C stays open without any cost to
choosing A now. You can reject this reading and still use the note.

---

# Question 3 — is the Pariwar Admin's fill-in enforced?

**In one sentence:** you said the Pariwar Admin fills in when the District Admin cannot do the job, for any reason, including one who has
not yet joined — should the system *stop* a Pariwar Admin from adding or managing field workers while a District Admin is in post, or trust
them and record who did what?

**Why it cannot be decided without you:** it is how to read your own ruling, and the two readings give the Pariwar Admin different powers.

## The one fact that decides it

**The system cannot know that a District Admin is "unable".** It can know only one thing: that no District Admin has joined for a district.
Illness, leave, or a District Admin who simply is not acting cannot be seen by the system.

## What you are choosing between (Question 3)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Both can always act, and the log records which authorisation allowed each act.** *Our suggestion.* | A Pariwar Admin can add or manage a field worker at any time; the full log keeps, for each act, a snapshot of the authorisation the system checked — which role and which district or Pariwar it covered — taken from the check itself, so a fill-in by a Pariwar Admin is visible afterwards. | Nothing stops a Pariwar Admin acting when the District Admin is perfectly able; it is visible afterwards, not prevented. |
| **B** | **A Pariwar Admin may act only where no District Admin holds the district.** | While a district has a District Admin, only they act. | Only "not yet joined" is detectable, so a District Admin on leave would block the Pariwar Admin until the Super Admin steps in. |
| **C** | **A Pariwar Admin acts after recording a reason**, and the log keeps it. | A Pariwar Admin states why a District Admin cannot act. | Friction, and the reason is only the Pariwar Admin's own word. |

**Our reading:** A — **because** the system cannot test "unable for any reason", so B would be wrong in the cases you named, and C adds a
step that proves nothing the log does not already show. You can reject this reading and still use the note.

---

# Question 4 — who approves a registered field worker?

**In one sentence:** a field worker applies on a form, is interviewed (their identity is checked there) and is recruited; then someone
registers them in the system, and then someone approves them — after which sign-ups under their code are credited to them. BigDev's
process is: the **District Admin registers and the Pariwar Admin approves**, and if the District Admin is not available the **Pariwar
Admin does both**. Is that who should approve?

**Why it cannot be decided without you:** your last ruling made the District Admin the manager of field workers and the Pariwar Admin the
fill-in; a Pariwar Admin who *approves* the District Admin's registrations is a different role — a check on them — and approval decides
who the Trust credits and so, later, may owe.

## The one fact that decides it

**Whether the person who recruits a worker should also be the person who makes them creditable.** If a second officer must approve,
nobody credits their own recruit alone — except in the case where the Pariwar Admin does both.

## What you are choosing between (Question 4)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The District Admin registers; the Pariwar Admin approves; if there is no District Admin, the Pariwar Admin does both.** *BigDev's process; our suggestion.* | A worker is creditable only after a second officer approves. | Two steps. When the Pariwar Admin does both there is no second pair of eyes, and the system does not stop the same person registering and approving. |
| **B** | **The District Admin registers and approves.** | A worker is creditable as soon as their own District Admin has registered them. | No second officer, and no check by someone with a wider view. Fastest. |
| **C** | **Only the Pariwar Admin registers and approves.** | District Admins can only recommend. | It takes away what you ruled in `-441` — that the District Admin manages field workers. |

**Our reading:** A — **because** approval decides who is credited and later paid, so a second officer is worth the extra step; and it is
how BigDev describes the Trust already working. You can reject this reading and still use the note.

---

# What is at stake right now

- **Live today:** nothing. No field worker can be added, moved or credited through the system yet.
- **Blocked:** nothing. The build is on option A for all four questions (for Question 4, approval is a separate step by a Pariwar Admin); there is no route to move a worker until a
  separate piece of work builds it, so nothing goes live unruled.
- **If nothing is decided:** a worker's reporting District Admin cannot be changed in the system until a route is built (it waits for your answer to Question 1, or is built on option A); a move to another
  Pariwar is a new registration (Question 2 A); and both roles can always act, with the log recording who did what (Question 3 A).

---

# How much to trust this note

- **Earlier versions of this question:** the build was first planned on the assumption that a field worker belongs to one district for
  life, so a move would have meant ending the worker and registering a new one — a new code every few months. BigDev corrected that the
  same day (workers rotate between districts and move between Pariwars). Questions 1 and 2 exist because of that correction.
  BigDev then corrected Question 1 itself the same day: a worker must not be restricted to a district (a school near a boundary would
  cost a second trip), so the district is who the worker *reports to*, it changes only when the worker asks or the Pariwar Admin needs it,
  and the Pariwar Admin should not carry the routine moves. This note puts that version of the question.
- **Corrected in this note:** none beyond the above.
- **Decided by BigDev, not by us:** a Pariwar Admin is not blocked from recording "at the worker's request" (they may record either
  reason); a request may be opened by either District Admin; a refusal's reason comes from a fixed list; an unanswered request goes to
  the Pariwar Admin after 7 days; and both District Admins are told, by email and in the admin console.
- **Still uncertain:** whether the Pariwar Admin who registers a worker when there is no District Admin may also approve them (BigDev's
  process says yes; the system will not stop it); whether a worker who moves to another Pariwar fills in a new form and is interviewed again (BigDev's account is
  that workers are recruited by a physical form, an interview and acceptance of the organization's terms; we do not know whether that is
  done afresh per Pariwar); what "a district" is in a Pariwar that has no published geography (we use the districts the Pariwar lists);
  and the log's record of the authorisation that passed (Question 3 A) is BigDev's decision, approved on 2026-11-03, on two conditions: that it comes from the check itself, and that it is a snapshot of the moment. It records the role and the grant that passed, not the role's permission list then in force.

---

# In plain English

Field workers do not stay in one place. They report to a district's District Admin for a few months until the work is done, then to the next
(they may still visit a school across a boundary — a code works anywhere in the Pariwar), so the Trust does not have to hire and train someone
new each time; some will move between Pariwars as well. We built the system to follow your last
ruling — the District Admin manages field workers, the Pariwar Admin fills in — and we need three things from you. First, who may change the
District Admin a worker reports to — a worker is free to recruit anywhere in the Pariwar, so this only decides who manages them: we suggest
that when the worker asks, one District Admin opens a request and the other accepts or refuses it with a reason, with the Pariwar Admin
able to move a worker directly and to settle a dispute, so the Pariwar Admin is not loaded with routine changes. Second, when a worker moves to another Pariwar: we suggest it is a new registration there, with a new code
and the old record left alone, because each Pariwar is kept separate in the system — the catch is that one person then has two records, and
joining them up would be a later decision. Third, your "fill-in": we suggest the Pariwar Admin can act whenever needed and the log shows
who acted, because the system has no way to tell that a District Admin is unable; the alternative is to stop the Pariwar Admin when a
District Admin is in post, which would also stop them when that District Admin is on leave. Fourth, how a worker is taken on: they apply on a form and are interviewed, with their identity checked there; we suggest the District
Admin registers them and the Pariwar Admin approves — and approval is what makes sign-ups under their code count — with the Pariwar
Admin doing both when there is no District Admin. Nothing is blocked on any of these.

⇒ If this section and the evidence below ever disagree, the **evidence is the record**.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

*Traced at commit `268d86b5`, 2026-11-03. The decision log is cited by decision id + clause (never by line).*

## E1 — What is already ratified, verbatim

**[`2026-11-03-441`](../../.decision-log.md#decision-2026-11-03-441)** — Trustee-ratified (DR and KB, relayed by BigDev):

> *"by DR and KB*
> *Q1 - Go with option A and also  District Admin may add a field worker. The goal is District Admin will manage field workers, however if District Admin is unable to discharge his duties for any reason, including District Admin is yet to Join, Pariwar Admin will fill in. Keep the full log of field worker.*
> *Q2 A"*

Nothing else is ratified about moving a field worker, about a worker across Pariwars, or about how the fill-in is applied.

## E2 — What is NOT ratified

- Who may change the District Admin a worker reports to (Question 1) — `-441` names the District Admin as the manager and says nothing about a change.
- Whether a field worker is one person across Pariwars (Question 2) — never asked before. (The earlier draft of Story 13.1 recorded "a
  cross-Pariwar block is a trustee decision" in passing; no ruling exists.)
- Whether the fill-in is enforced (Question 3) — `-441`'s own "does not cover" list names it.
- What a worker's move does to money already earned or to credit already given — carried to the commission story, ⛔ asked here.

## E3 — What the code actually does

*(A code comment is a claim; the constraints below are traced to the migration, not to comments.)*

- The code registry (Story 13.2, merged): `UNIQUE (field_worker_id)` — **one** code per worker; `UNIQUE (pariwar_id, code)` — a code is
  unique only **within** a Pariwar; row-level security restricts every row to its own Pariwar. So a worker's code works in one Pariwar.
- A member who enters a code is looked up **in their own Pariwar** only.
- *Inference, labelled:* the worker's mobile-number index takes the Pariwar as one of its inputs, so two Pariwars cannot match the same
  person by it. The call that builds it takes a Pariwar argument; we have not traced that it changes the result.
- Members' postings (a change of district) add a row and do **not** move the member to another Pariwar; the file's own header says a move
  between Pariwars "is a distinct, much larger capability" and is out of scope. That is a code comment — a statement of intent, not proof.
- `field_worker.posted`, the move command, the request flow and any screen to move a worker **do not exist yet.**

## E4 — Commands to re-verify every claim

```
grep -nE '^### Decision 20[0-9-]+-441\b' .decision-log.md                           # the ruling quoted in E1
grep -nE 'UNIQUE|pariwar_id' packages/domain/migrations/0199_field-worker-attribution-codes.sql   # the registry constraints
grep -n 'cross-Pariwar migration\|across tenants' packages/domain/src/schema/member_postings.ts   # the members' precedent (a comment)
grep -rn 'field_worker.posted\|postFieldWorker' packages apps --include='*.ts'         # EMPTY expected: not built
git log --oneline -1 268d86b5                                                       # the commit these claims were traced at
```

*Run on 2026-11-03 before drafting: the decision resolved; the registry constraints were as stated; the "not built" grep was empty.*
