# Trustee Panel Routing Note — WHERE the ruled walk executes, and what actually gates it

**Status:** ✅ **RULED 2026-08-18.** **Q1(a) production only · Q2(a) global route, cohort-narrowed ·
Q3(a) `super_admin`-only is sufficient · Q4(b) staging rehearsal required.** ⛔ A rehearsal is **never a
rung**. ⚠ The rehearsal's **cohort is NOT named** and cannot be named from source — carried as an open
operational item bounded by three rules (entry clause 5). ✅ **ATTESTED** by Decision `2026-08-18-131`:
**Dhiraj Rahul and Kalpana Bharti, 2026-08-18**. *(Superseded, retained: ⚠ the attestation is
UN-ATTESTED — not supplied, ⛔ not reconstructed.)* Recorded as Decision `2026-08-18-130` (`.decision-log.md:37`). See
*"The ruling as given"* at the foot; it is authoritative where it differs from the option and
recommendation text above, which is **retained, not edited**.
*(Superseded status line, retained: ⏳ Open — four questions, awaiting ruling. Q1 and Q2 are ⛔ BLOCKING
— rung 1 cannot be published until both are ruled. Q3 and Q4 are ⚠ DIRECTIVE.)*
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-18, against `main` @ `7fd5496` (clean, fetched, `== origin/main`).
**Scope:** ⛔ **Attached to no story.** It supplies what Decision `2026-08-18-128` did not reach.
**Decision-log head, verified live at authoring:** `2026-08-18-129` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **131** headings, of which one is the **template**, leaving **130**
numbered headings over **129** distinct numbers (`+1` = `2026-06-01-012-amend-1`). No gaps in
`001…129`.
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-18-130`** from the
current head. ⚠ **Two open notes now nominate `-130`** — this one and
`trustee-panel-routing-note-2026-08-18-escrow-host-key-pinning.md`. Whichever is ruled first takes it;
⛔ **re-verify the head at ruling time** and number from whatever is then head.

> ⚠ **Every recommendation in this note is NON-BINDING.**

> ⛔ **This note does NOT re-open Decision `2026-08-18-128`.** The walk, its three rungs, their cohorts
> and the general ladder ruling all stand. This note asks **where** the walk runs and **which write
> path** it uses — two things `128` did not reach ([[feedback_supersede_never_reinterpret]]).

---

## Why this note exists

Decision `2026-08-18-128` clause 2 ruled the walk precisely: `canary` → Shikshak Pariwar; `rollout` →
Shikshak + Rail + Banker; `full` → all Pariwars. **It never says which environment.**

Flag state is not code — it is rows in `feature_flag_versions`, a database table. **Each deployed
environment has its own flag state, independently.** So "execute rung 1" is under-specified in a way
that is invisible until someone runs it: publishing `canary` to staging and publishing `canary` to
production are two different acts, and only one of them touches real members.

⚠ Raised **before** any publish, deliberately. There is no ambiguity to discover afterwards.

---

## Findings

*(Re-verified from source at `7fd5496`.)*

### F-1 — the environments exist, and they are two

| Environment | Evidence |
|---|---|
| **staging** | `.github/workflows/deploy-staging.yml` — GitHub environment `staging`, `GCP_PROJECT: twt-staging` |
| **production** | `.github/workflows/deploy-prod.yml` — GitHub environment `production` |

The pipeline's own comment states the promotion order: *"STAGING is the dev→staging→prod promotion
gate's first live rung; prod (`deploy-prod.yml`) runs after staging is confirmed green."*

### F-2 ⭐ THERE ARE TWO LADDERS, AND THEY ARE EASILY CONFUSED

| Ladder | Rungs | What it moves |
|---|---|---|
| **Deployment promotion** | dev → **staging** → **prod** | which *environment* runs the code |
| **AC7 flag ladder** (`128`) | `canary` → `rollout` → `full` | which *Pariwars* a flag applies to, **within one environment** |

⛔ **`canary` is NOT staging.** It is a cohort tier inside whichever environment the version is
published to. A reader who conflates them would believe rung 1 means "publish to staging" — which
would satisfy neither `128` cl. 2 (whose cohort is a named production Pariwar) nor the deploy gate.

⇒ The two ladders are **orthogonal**, and `128` ruled only the second.

### F-3 ⭐ THE WRITE PATH IS AMBIGUOUS — two routes, two tiers, different blast radii

`apps/api/src/modules/feature-flags/routes.ts` exposes **two** flip routes:

- **Global** — `POST /api/v1/global/feature-flags/:flagKey/versions`, writes `pariwar_id: null`, the
  *"one row governs every Pariwar"* tier. **`super_admin`-only** (`requireGlobalPermission`), because
  *"a write with this blast radius is a strictly higher-privilege action."*
- **Per-Pariwar** — `POST /api/v1/p/:pariwarId/feature-flags/:flagKey/versions`, a tenant override.
  Resolution order is **override ≻ global ≻ default**.

`128` cl. 2 expresses each rung as a **cohort clause** (`dimension: pariwar_id, op: in`). A cohort is a
property of a **global** version — so the ruled walk reads as the **global** route, narrowed by cohort.
⚠ **But `128` does not say so**, and the same intent could be mis-implemented as three per-Pariwar
overrides, which is a **different row, a different tier, and a different revocation story**.

⇒ ⭐ The distinction matters at rung 3: `full` on a global version governs every Pariwar including ones
created later. Per-Pariwar overrides would not, and would silently under-apply.

### F-4 ⭐ THE GATE IS WEAKER THAN THE ONE ON THE DEPLOY PIPELINE — and weaker than reading an export

`deploy-prod.yml:38-40` records that *"the `production` environment carries the **≥2-reviewer
protection rule**."*

⛔ **That rule does not cover this flip.** The flip is a **runtime API call**, not a deployment — it
never passes through the deploy workflow, so the ≥2-reviewer protection is simply not in the path.

And the route's own chain is `[adminSession, requireGlobalPermission(FEATURE_FLAG_FLIP_KEY)]`.
⛔ **No step-up. No dual control.**

⚠ **The comparison that makes this sharp:** every route in
`apps/api/src/modules/member-data-rights/routes.ts` requires `requireStepUp` on a *distinct* context —
so **reading one member's export requires a step-up, while ending portal access for every terminated
member across all Pariwars does not.**

⇒ ⛔ **Recorded as an observation, not a defect claim.** The design is coherent: `super_admin`-only is
a real control, and `128`'s Panel authorisation is the governance gate. But the Panel should know that
**the technical gate on the act it authorised is one admin session**, and decide whether that is what
it intended.

### F-5 — the cohort names must resolve in the environment actually targeted

`128` cl. 6 binds: the three names resolve to `pariwar_id` **at publish time**, and *"if a name does
not resolve to exactly one live Pariwar, the walk STOPS."*

⚠ **Pariwars are per-environment rows.** Staging may hold different Pariwars, differently named, or
none — the repository carries **no seeded Pariwars** (`packages/domain/seed/{dev,staging}` hold only
READMEs), so this is unverifiable from source in either environment.

⇒ A staging rehearsal cannot assume the ruled cohorts exist there. Under Q4(b) that is a reason to
rule the rehearsal's cohorts separately rather than reuse `128` cl. 2's.

---

## The four questions

### Q1 — WHICH environment does the ruled walk execute in? ⛔ BLOCKING

⭐ **Recommendation: (a) production, and production only.** `128` cl. 2's cohorts are **named real
Pariwars**, and rung 3 is *"all Pariwars"* — a scope that is only meaningful where the members are.
⚠ **Recorded as inference, not as the Panel's stated intent** — which is precisely why it is asked
rather than assumed.

### Q2 — Which WRITE PATH: a global cohorted version, or per-Pariwar overrides? ⛔ BLOCKING

⭐ **Recommendation: (a) the global route, narrowed by cohort.** It is what a cohort clause *is*, it
matches `128` cl. 2's shape, and it is the only reading under which rung 3's `full` governs Pariwars
created after the walk. ⛔ Under (b) the walk would need re-authorising every time a Pariwar is added.

### Q3 — Does this flip warrant DUAL CONTROL or step-up? ⚠ DIRECTIVE

⭐ **No recommendation offered.** The Panel authorised the act; whether the *technical* path to it
should require a second human is a governance judgement, not an engineering one. Options: (a) accept
`super_admin`-only as sufficient given the Panel authorisation; (b) require a step-up context on the
flip route; (c) require two named admins for flags whose `owner` is `trustee-panel`.
⚠ ⛔ **(b) and (c) are code changes** and would need their own story; neither is in scope here.

### Q4 — Is a STAGING REHEARSAL required before rung 1 in production? ⚠ DIRECTIVE

⭐ **Recommendation: (b) yes, a rehearsal — recorded as a rehearsal and NOT as a rung.** The mechanism
has never been exercised once: no Panel-owned flag has ever been flipped, and the ladder's 409 was
discovered by reading code rather than by running it. ⚠ Per F-5 a rehearsal needs **its own cohort**,
since `128` cl. 2's names may not exist in staging.
⛔ **A rehearsal must never be recorded as satisfying a rung** — that would make register row (vii)
appear discharged by an act that touched no member.

---

## What non-answer would mean

| Q | Consequence of no answer |
|---|---|
| **Q1** ⛔ | Whoever runs the publish picks the environment. ⚠ **The failure mode is asymmetric:** picking staging wastes a walk; picking production ends portal access for real terminated members on an unruled assumption. |
| **Q2** ⛔ | The same intent lands as either one global row or three tenant overrides. **They differ at rung 3**, and the difference is invisible until a Pariwar is created afterwards. |
| **Q3** ⚠ | The flip stays one-admin-session. ⛔ No change from today, and today is not unsafe — it is simply unruled. |
| **Q4** ⚠ | The first-ever execution of this mechanism happens in production. |

⛔ **Nothing is unsafe while this is unruled.** Both Panel-owned flags remain `off` and
`termination_access_block` **fails open**; register row (vii) is correctly still open.

---

## What this note does NOT ask, and what a ruling would NOT mean

**Not asked:**
- ⛔ **Whether the control should be enabled** — ruled at `2026-08-17-127` cl. 6.
- ⛔ **The rungs, states or cohorts** — ruled at `128` cl. 2 and untouched.
- ⛔ **Whether the AC7 ladder applies** — ruled general at `128` cl. 3.
- ⛔ **Any change to the deploy pipeline**, its promotion order, or its ≥2-reviewer rule.
- ⛔ **Whether `restoration_discipline_imposition` may move** — it may not; Escalation 6 and the Q1
  sentinel both hold it.

**A ruling would NOT mean:**
- ⚠ that **rung 1 has executed.** This supplies the target; the publish is a separate logged act.
- ⚠ that **register row (vii) is discharged.** ⛔ That happens when the flag reaches `full` **in the
  environment Q1 names**, and ⛔ never by a rehearsal.
- ⚠ that **the flip gate has changed.** Q3 may leave it exactly as it is.
- ⚠ that **the cohort names resolve.** `128` cl. 6's stop-condition still governs, per environment.

---

## Ruling template

Per Decision `2026-08-09-095`, per-clause provenance is mandatory.

| Q | Ruling | Notes |
|---|---|---|
| **Q1** ⛔ | (a) production only / (b) staging then production / (c) other: ______ | ⛔ The entry must name the environment **in terms** |
| **Q2** ⛔ | (a) global route, cohort-narrowed / (b) per-Pariwar overrides | ⛔ Under (b), rung 3 does not reach later-created Pariwars — say so if chosen |
| **Q3** ⚠ | (a) `super_admin`-only is sufficient / (b) require step-up / (c) two named admins for `trustee-panel`-owned flags | ⛔ (b)/(c) are code changes needing their own story |
| **Q4** ⚠ | (a) no rehearsal / (b) rehearsal first, its cohort: ______ | ⛔ A rehearsal is **never** a rung |

---

## Disposition

On ruling: **one** `.decision-log.md` entry, numbered from the **then-live head**, per-clause
provenance labelled, committed under a `governance(flags):` prefix **before** any publish
([[feedback_governance_commits_precede_implementation]]).

**On execution:** each publish is a separate logged act recording the resolved `pariwar_id` per `128`
cl. 6 **and** the environment per Q1.
⭐ **The record has a home: `docs/feature-flags/panel-flag-flip-ledger.md`** — created 2026-08-18 as the
mechanism for `130` clause 4's *"recorded as a rehearsal"*, which until then had no artifact, no shape
and no location. A **production** rung is self-recording (immutable version + §1.5 audit line in the
production DB); a **staging rehearsal is not** — its audit line lands in a disposable environment that is
nobody's governance record. The ledger closes that asymmetry, and makes *"never a rung"* structural: a
`rehearsal` row cannot carry a rung number, cannot carry `production`, and cannot carry a `discharges`
value other than `nothing`. ⇒ Register row **(vii)** discharges **iff** the ledger holds a row with
`kind = rung ∧ rung = 3 ∧ state = full ∧ environment = production` — a checkable predicate rather than a
remembered one. Register row **(vii)** is marked discharged only when the flag
reaches `full` in that environment.

⛔ Decisions `2026-08-09-093`, `2026-08-09-094`, `2026-08-17-127`, `2026-08-18-128` and
`2026-08-18-129` are **not edited** by any of this.


# The ruling as given — 2026-08-18

**Ratifying trustees:** ✅ **Dhiraj Rahul and Kalpana Bharti**, ruling date **2026-08-18** — attested
by Decision `2026-08-18-131`. **Recorded as Decision `2026-08-18-130`.**
⚠ **Superseded line retained, never overwritten:** *"un-attested-pending — not supplied, not
reconstructed, and not carried over from `2026-08-18-129`."* ⚠ **This time the check CONFIRMED rather
than corrected** — the attestation matched. ⛔ Not evidence that carrying over is safe: at `129` the
same check caught a **date** divergence from `127`.

This section is authoritative where it differs from the text above. ⛔ That text is **retained, never
overwritten** — including recommendations the Panel did not follow.

## The ruling, question by question

| Q | Ruled | Effect |
|---|---|---|
| **Q1** | **(a)** production, and production only | Staging is ⛔ not a rung of the ruled walk |
| **Q2** | **(a)** global route, narrowed by the ruled cohort | ⭐ Load-bearing at rung 3: `full` on a global version governs Pariwars created **after** the walk; overrides would silently under-apply |
| **Q3** | **(a)** `super_admin`-only is sufficient | ⛔ **A ruling, not an omission.** No code change follows |
| **Q4** | **(b)** staging rehearsal required first | ⛔ **Never a rung.** Discharges nothing |

## ⚠ What the Panel ruled on Q3 while knowing

The flip is a **runtime API call** and never passes through the deploy workflow, so the **≥2-reviewer
protection on the `production` environment does not cover it**. The route chain is `[adminSession,
requireGlobalPermission(FEATURE_FLAG_FLIP_KEY)]` — **no step-up, no dual control** — while every
`member-data-rights` route requires a step-up. ⇒ **Reading one member's export is gated harder than
ending portal access for every terminated member across all Pariwars.** Accepted **with that comparison
in view**; the governance gate is the Panel's own authorisation at `2026-08-17-127` cl. 6.

## ⚠ The rehearsal cohort is open, and bounded

The ruling supplied *"(b) yes"* without a staging cohort. It is ⛔ **not** defaulted to `128` cl. 2's
names — Pariwars are per-environment rows, the repo seeds none, and Shikshak / Rail / Banker may not
exist in staging at all. It is resolved against staging's **actual** Pariwars at rehearsal time and
recorded then, and `128` cl. 6's **stop-condition governs the rehearsal too**.

⚠ Because a rehearsal is not an enabling act, `2026-08-09-093` cl. 6's cohort-verbatim requirement is
**not engaged** by it — stated so this absence is never read as the vacuous authorisation cl. 6 forbids.

## What the ruling deliberately did NOT do

- ⛔ **Published nothing.** Both Panel-owned flags remain `off`; `termination_access_block` **fails
  open**, so terminated members retain portal access exactly as §8.4a discloses.
- ⛔ **Discharged no register row.** Row **(vii)** discharges when the flag reaches `full` **in
  production** — ⛔ never by a rehearsal, ⛔ never by naming a target.
- ⛔ **Changed no code and no route gate** (Q3(a)).
- ⛔ **Re-opened nothing** in `2026-08-17-127` or `2026-08-18-128`.

## Disposition, as executed

Decision `2026-08-18-130` recorded at `.decision-log.md:37`, per-clause provenance labelled
(`[Trustee-ratified]` 1–4, `[Author-committed]` 5–8), committed under `governance(flags):` **before**
any publish.

✅ **The attestation field is CLOSED** — by Decision `2026-08-18-131`, the successor-entry path `130`
clause 7 mandated. ⛔ `130`'s fields were **not** edited; clause 7 carries an appended attestation marker.
⚠ **Still open, and deliberately:** the **rehearsal cohort** (`130` cl. 5), which cannot be named from
source and resolves against staging's actual Pariwars at rehearsal time.
*(Superseded, retained: ⚠ one field open — the attestation (entry clause 7), closed by a successor entry,
⛔ never by an edit to `130`'s fields.)*
