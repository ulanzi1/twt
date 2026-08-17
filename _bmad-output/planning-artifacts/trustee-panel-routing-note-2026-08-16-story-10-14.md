# Trustee Panel Routing Note — Story 10.14, Permission Delegation (FR-48)

**Status:** ⏳ **Open — six questions, awaiting ruling. All six are ⛔ BLOCKING.**
Q1 is blocking in a way the others are not: **it asks whether the feature belongs in v1 at all**, and
every remaining question is moot if it rules otherwise.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-17, against
`_bmad-output/implementation-artifacts/10-14-permission-delegation.md` at its baseline `main` @
`f225a76` (clean, fetched, `== origin/main`). **No code has been written.** The story is `in-progress`
at its governance half and stops at Task 2 until this note is ruled.
**Story state:** `in-progress`, governance half only. ⛔ **Zero `packages/` and `apps/` files are
touched by the commit carrying this note.**
**Decision-log head, verified live at authoring:** `2026-08-16-125` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **127** headings, of which one is the `YYYY-MM-DD-NNN` **template**,
leaving **126** numbered headings over **125 distinct numbers** — the `+1` is the legitimate amendment
suffix `2026-06-01-012-amend-1` alongside `2026-06-01-012`, not a duplicate. No gaps in `001…125`.
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-16-126`** from the
current head — *(if the ruling lands on a later date the entry takes that date, and the `-126` sequence
holds only while `-125` remains the head; ⚠ **re-verify the head at ruling time** and number from
whatever is then head)*. Per Decision `2026-08-09-095` the entry must **label per-clause provenance** —
`[Trustee-ratified]`, `[Author-committed]`, or author finding.

⛔ **If the ruling amends the Niyamavali or the Deed, the amended text must be reproduced VERBATIM IN
BOTH LOCALES inside that entry.** `docs/legal/` is gitignored (`.gitignore:68`; verified live:
`git check-ignore -v docs/legal/niyamavali.md` → `docs/legal/`), so the decision entry is the **only
durable copy** of the instrument.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each ⭐ is a suggestion the Panel may reject,
> not a default the Panel is assumed to accept by silence. Where silence carries a consequence, that
> consequence is stated per question and again in *"What non-answer would mean"*
> ([[feedback_record_unattested_no_backfill]]).

> ⚠ **Nothing in this note re-interprets a ratified instrument or a ratified ruling**
> ([[feedback_supersede_never_reinterpret]]). Niyamavali §8.7, Deed Cl. 20(h), and Decisions
> `2026-08-10-096`, `2026-08-07-089` and `2026-08-16-123` mean what they say and ⛔ **are never edited
> in place**. This note **asks**; the ruling **amends or supersedes**; Story 10.14 **applies**. Where a
> ruling here would contradict `2026-08-16-123` clause 2 — Q5 is the live case — it is a
> **supersession**, and the entry must say so in terms rather than absorb it as though it were
> consistent.

---

## Why this note exists

Story 10.14 is named after a surface. The surface is the smallest part of it.

FR-48 is **two sentences long** (`prd.md:783`, verbatim):

> *"A trustee can delegate a permission to another user for a date range. Delegation is audit-logged.
> Revocable."*

Everything else the epic asserts — `permission_keys[]`, the scope-subset rule, the 90-day cap,
"configurable", the effective-permissions union — is **epic authorship, not PRD text and not a Panel
ruling**. Meanwhile the substrate FR-48 names is **frozen** (freeze row 9), has **no production write
path at all**, **cannot represent a key-subset grant**, is read directly by **eleven** production call
sites of which **five decide governance-panel membership**, and carries **two standing re-examination
triggers whose named firing condition is precisely "the first story that builds a `role_grants` write
path"**.

So the Panel is not being asked to approve a screen. It is being asked six questions about
**authority**, and the first of them is whether this should be built in v1 at all.

---

## Nine findings the Panel should see before ruling anything

*(Every citation below was re-verified from source at `f225a76` during Task 0. Where the story file's
own citation drifted, that is recorded in F-9 rather than silently corrected.)*

### F-1 ⭐ THE ONE THAT MAY END THE STORY — the PRD does not put FR-48 in v1

Two lines, both verified live:

- `prd.md:1325` enumerates the §4.7 v1 scope as *"(§4.7, FRs 44–47, **49**–57, 58A, 58B, 58C)"*.
  **FR-48 is the single §4.7 FR omitted from that list.** The sequence steps 47 → 49 over it.
- `prd.md:1350`, under **§6.2 Out of scope / may slip**: *"**Permission delegation with date range** —
  `[v1-S]` (FR-48); may slip to v2 depending on cadence."*

The FR itself is still tagged `[v1-S]` at `prd.md:781`. ⇒ The PRD carries **an internal
inconsistency**, not a clear inclusion: the FR header says v1-small, the scope roll-up omits it, and
§6.2 lists it as cuttable. ⛔ **No author may resolve that by choosing.** Q1 asks it.

⚠ **Why this comes first and not last.** Q2–Q6 are each expensive — a denylist over four ratified
rulings, a supersession decision on a clause ratified nine days ago, an ADR against a freeze row. Ruling
Q1 **(b)** costs one decision entry and closes all of them. Ruling Q1 **(a)** and *then* discovering Q5
is unrulable costs the entire governance surface twice.

### F-2 ⭐ THE SHARP ONE — three sources name three different delegating authorities

| Source | Who may delegate | Force |
|---|---|---|
| `prd.md:783` (FR-48) | *"A **trustee** can delegate a permission…"* | PRD requirement |
| `epics.md:3936` | *"As a **Pariwar admin** delegating limited authority…"* | epic authorship |
| `architecture.md:1510-1511` | *"**No silent role escalation.** Role changes go through a dedicated audit-logged endpoint; **role modification requires Super Admin scope**; trustee discretion logged."* | architectural property |

And Decision `2026-08-16-123` clause 1 (`.decision-log.md:260`, `[Trustee-ratified]`) says, in terms:
**"A `pariwar_admin` is not the Board."**

Three sources, three authorities, plus a ratified ruling that a `pariwar_admin` is not the body the
Deed vests power in. ⛔ **The dev agent cannot pick one — picking is a governance act.** Q4 routes it.

### F-3 — `role_grants` has ZERO production write paths. The grant admin surface was never built.

Verified exhaustively at `f225a76`: every `INSERT INTO role_grants` / `insert(roleGrants)` /
`DELETE FROM role_grants` / `UPDATE role_grants` in the entire tree — **43 sites across 43 files** — is
in a `tests/` directory. **Not one is production code.**

Corroborating, each verified:
- `apps/api/src/modules/rbac/` is **one file** (`index.ts`, 318 lines) with **zero** route registrations.
- `openapi/v1.yaml` has **zero** rbac paths (its two "RBAC" hits are prose inside unrelated endpoint
  descriptions).
- There is **no production caller of `seedRoles()`**.
- `AuthzContext.bundles` — the FR-44 *"bundles editable by Super Admin"* seam at `check.ts:84-89` — is
  **never passed anything but `defaultRoleBundles`** anywhere in production.

The code says so about itself, twice, unprompted:
- `apps/api/src/modules/rbac/index.ts:274`: *"…and **NO `role_grants` revocation path at all**."*
- `packages/domain/tests/rbac/roles.test.ts:533-534`: *"There is NO SQL seed inserting role_grants rows,
  NO production caller of seedRoles(), and NO admin route that writes role_grants — **the Story-1.9+
  role-admin surface was never built**."*

⇒ Story 10.14 would ship the **first production write into the authorization substrate**, and it would
be a **delegation** write on a substrate with no **grant** write. **You could lend a permission you
hold; nothing in the product could give you one.** Q3 routes the ordering.

⚠ This finding also contains the *alternative reading of the whole story*: if the real operational pain
is "we cannot administer grants," then the correct v1 story is a **role-grant admin surface**, not a
delegation surface — and it would discharge both standing triggers with far less governance surface.

### F-4 — Two standing re-examination triggers fire on THIS story, by name

Neither is optional and neither is this story's to defer. Both verified verbatim.

**Trigger A — `apps/api/src/modules/rbac/index.ts:273-283`:**

> *"there is currently **NO** Pariwar deactivation or suspension concept anywhere in the codebase, and
> **NO `role_grants` revocation path at all**. So 'a stale grant in a dead tenant' is not a reachable
> state… ⚠ **RE-EXAMINE THIS GATE BEFORE SHIPPING EITHER OF THESE:** … 2. A `role_grants` revocation
> path, or any flow that leaves grants behind on offboarding. In either case this gate needs a
> liveness/membership predicate **before** the feature ships, not after."*

The gate is `requireGlobalOrAnyPariwarPermission` (`:285`), which reads `loadGlobalActorGrants` (`:185`)
— a bare `SELECT … FROM role_grants WHERE user_id = $1` on the **BYPASSRLS service pool, every tenant,
no expiry predicate**. An expired delegation reaching it would silently retain cross-tenant catalog
access.

**Trigger B — `packages/domain/tests/rbac/roles.test.ts:532-536`:**

> *"⚠ THIS GATE'S REACH IS THE DECLARATIVE BUNDLES ONLY. It inspects `defaultRoleBundles`… A grant
> written directly to the `role_grants` TABLE would NOT be caught here. **Re-trigger: the first story
> that builds a `role_grants` write path must extend this assertion.**"*

The frozen holder set it pins is `member.suspend`'s:
`['block_admin','district_admin','pariwar_admin','state_trustee','super_admin']`.

⚠ **The consequence is precise:** a delegation able to convey `member.suspend` would defeat a Story
10.18 gate **by data rather than by code** — exactly the reach the gate's own text admits it does not
have.

⭐ **These fire on whichever story writes `role_grants` first.** If Q1 rules defer, they are not
discharged here — they simply **wait, still armed**, for that story. That is a legitimate outcome and
must be recorded in those words, not as "closed."

### F-5 — Ratified non-delegability already exists, in four places, and the epic AC has no denylist

Verified verbatim, each from source:

- **Niyamavali §8.7** (`niyamavali.md:266`): the Trustee Panel is *"**the Board of Trustees acting in a
  moderation capacity**, and **not a delegate committee**."*
- **Decision `2026-08-10-096` Q1** (`.decision-log.md:2609`, `[Trustee-ratified]`): *"moderation is
  **not delegable to a subset of the Board** without a further governance act, because **option (b) —
  the shape that would have permitted a smaller sitting — was considered and not taken**."*
- **Decision `2026-08-07-089`** (`.decision-log.md:2982`): the Panel *"exclusively owns authorization to
  activate Story 10.23's imposition flag. No other role holds it, and **it is not delegable** by the
  holder of any adjacent responsibility."*
- **Deed Cl. 20(h)** (`trust-deed.md:251`) is the **only** delegation power in the Deed, and it is
  *organisational*: *"delegate administrative and operational functions (including operation of the
  platform) to committees, office-bearers, employees, or agents, **while retaining ultimate
  responsibility**"* — **not per-permission, and not time-boxed.**

Plus two panel-exclusive keys whose own comments say why they exist:
`member.restore_terminated` (`permissions.ts:526-530`) and `member.decide_moderation_appeal`
(`permissions.ts:543-547`), the latter warning that reusing an adjacent key *"would reopen [the
indistinguishability] **at the one call site where the separation is the entire mechanism**."*

And `epics.md:3780` (the FR-58C capability bar) already prohibits *"(d) escalating actor permissions
beyond RBAC scope (Story 1.8)"* for feature flags. **A delegation surface is precisely that vector by
another route.**

⇒ Q6 must produce a **ratified** denylist. ⛔ An author-invented denylist over ratified non-delegability
is exactly the overreach [[feedback_supersede_never_reinterpret]] forbids.

### F-6 ⭐ THE UNRESOLVABLE-BY-ENGINEERING ONE — eleven readers, five of which decide panel membership

The epic's *"permission checks (Story 1.8) read both"* reaches **one** of eleven. `role_grants` is read
directly at these production sites, all re-verified at `f225a76`:

| # | Reader | What it decides |
|---|---|---|
| 1 | `apps/api/src/middleware/scope-resolution/index.ts:58` | ⭐ the request path — sets `request.scopeGrants`; **0 grants ⇒ 404 "Pariwar not found"** (`:59-61`) |
| 2 | `apps/api/src/modules/rbac/index.ts:41` (`loadActorGrants`) | the per-gate fallback when `scopeGrants` is absent |
| 3 | `apps/api/src/modules/rbac/index.ts:191` (`loadGlobalActorGrants`) | ⛔ **BYPASSRLS, all tenants** — Trigger A's gate |
| 4 | `apps/api/src/modules/auth/admin/admin-session.handler.ts:53` | the session's advisory role list |
| 5 | `apps/jobs/src/reports-export.ts:101` | ⛔ the BYPASSRLS worker's scope re-resolution |
| 6 | `packages/domain/src/pool/fixed-amount-panel.ts:159` | ⛔ who may attest an **immutable Emergency Adjustment Record** |
| 7 | `packages/domain/src/pool/fixed-amount-panel.ts:217` | the attestor picker's directory |
| 8 | `packages/domain/src/claim/r9-voting-persist.ts:332` | ⛔ **R9 panel membership** |
| 9 | `packages/domain/src/claim/appeal-panel-persist.ts:260` | ⛔ **appeal panel membership** |
| 10 | `packages/domain/src/claim/appeal-panel-persist.ts:283` | the single-actor appeal read |
| 11 | `packages/domain/src/claim/shepherd-assign-persist.ts:215,289` | shepherd eligibility |

*(`apps/api/src/modules/reports/handlers.ts:349` consumes `request.scopeGrants` rather than reading the
table, so it is a downstream consumer of #1, not a twelfth reader. Verified.)*

**Rows 6–10 are the key-as-credential sites, and they make the split unresolvable by engineering
judgement.** Decision `2026-08-16-123` clause 2 (`.decision-log.md:270`, `[Trustee-ratified]`, ruled
**nine days ago**) *defines*:

> *"**Clause 2 — Q2.1: the key IS the panel-membership credential.** An eligible emergency attestor is
> exactly *an actor holding `pool.fixed_amount_emergency` at this Pariwar* (`dimension: 'pariwar'`),
> resolved from `role_grants` **inside the request's scope transaction** and evaluated by the **pure**
> `hasPermission` predicate over the seeded bundles."*

Two arms, both bad without a ruling:

- **If a delegation satisfies that read:** a delegating authority **manufactures a quorum-eligible
  emergency attestor for the delegation's whole span by writing one row**, and a definition ratified
  nine days ago has been **re-read rather than superseded**.
- **If it does not:** the epic's *"effective permissions = own + active delegations; permission checks
  read both"* is **false** for the three governance panels that matter most, and the system carries a
  permanent split-brain about what an actor's permissions are.

⇒ **Q5 routes this. ⛔ Do not resolve it in code.**

### F-7 — The AC's `permission_keys[]` is inexpressible in the current grant shape

`EffectiveGrant` (`check.ts:59-64`) is exactly `{ pariwarId, role, scopeDimension, scopeValue }`. **A
permission key appears nowhere in it.** A key is reached only via `bundle.permissions.includes(key)`
(`check.ts:184`) after `lookup(grant.role)` (`:176`), and `role_grants.role` is plain `text` storing
**roles, never keys**. FR-44 agrees (`prd.md:749`): *"Roles are bundles of permission keys. Members are
granted **roles** with scopes."*

⇒ The epic's `permission_keys[]` **cannot be stored in `role_grants`** and **cannot be expressed as an
`EffectiveGrant`**. Any implementation must either amend the frozen model — ⛔ freeze row 9 — or compose
around it.

⭐ **The legal seam already exists and requires zero bytes of change under freeze row 9:**
`AuthzContext.bundles` (`check.ts:83-89`) is documented as *"the admin path (Story 1.9+) passes the
Super-Admin-edited set (FR-44) so the check honours edits without code change"*, and `bundleLookup`
(`:121`) already handles arbitrary bundle sets. A delegation becomes a **synthetic single-use bundle**
plus a synthetic `EffectiveGrant` naming it. This is the **compose-don't-amend** precedent already in
the tree at `apps/api/src/modules/rbac/index.ts:253-259`:

> *"This does NOT widen that rule or touch `packages/domain/src/rbac` (freeze row 9) — it **composes**
> the existing PURE `rbac.hasPermission` predicate twice at the HTTP-adapter layer."*

⚠ **This is a design finding, not a question.** It is recorded so the Panel knows a compliant shape
exists — the Panel is not being asked to choose between "delegation" and "freeze row 9." **But an ADR
is owed either way**, per `epics.md:519`: *"Any change to a Frozen item requires an ADR or
trustee-ratified Sprint Change Proposal."*

### F-8 — Delegation defeats every separation-of-duties check in the system

**Because they all compare identities, and delegation moves authority without moving identity.**

There is **no delegator ≠ delegatee rule anywhere in the corpus**, and the epic AC does not state one.
Live checks that would each pass on identity while the authority behind them has moved:

- author ≠ reviewer (`prd.md:812`, FR-51);
- Stage-1 reviewer ≠ decision-maker (`prd.md:727`, FR-43A);
- Niyamavali §8.8 — the appeal is heard by *"a member of the Panel who did not take part in the act
  appealed against"*;
- **SA-5** (`trustee-credential-loss-succession.md:18`): *"**Three-way separation of duties**… These
  three roles are held by **three distinct individuals**, named in the recovery log, for **every**
  change to the Super-Admin holder set."*

⚠ And the runbook is stricter than this story in general, not only at SA-5. Verified verbatim:
**SA-1** *"an ordinary admin never self-elevates"*; **SA-2** *"Super-Admin assignment requires
**trustee approval**… never an operator acting alone"*; **SA-3** the continuity invariant; **SA-4** the
anti-capture invariant.

⇒ **As the epic writes it, 10.14 is a self-service bypass of that runbook for every key below Super
Admin.** Q6's denylist and Q4's authority together decide how much of that survives.

⭐ The architecture's own posture for temporary authority is the **break-glass rule**
(`architecture.md:3292-3295`), and it is the shape to copy:

> *"**Break-glass access must be time-bounded and audit-logged** — activation requires explicit operator
> action with a stated expiry; every direct-ingress request emits an audit line; **auto-revert at expiry
> unless explicitly renewed with re-justification**."*

Note that **renewal there is a new record with fresh justification, never an extension of the old one.**

### F-9 ⚠ ADDITIONAL — citation drift found during Task 0 re-derivation, recorded rather than dropped

Every load-bearing anchor in the story file re-derived clean. **Three citation-level drifts** and **two
imprecise-but-true sweeps** were found. None changes a requirement; all are recorded because
"the named citation is not the live citation" is the class the 10.21 review caught nine times.

| Item | Story says | Live at `f225a76` |
|---|---|---|
| freeze row 9 | References cite `epics.md:538` | **`:533`** (`:538` is row 14). The story's own Dev Notes cite `:533` correctly — self-inconsistent, same class as the two the validation pass already fixed |
| freeze preamble | References cite `epics.md:520` | **`:519`** (`:520` is blank). The banner cites `:519` correctly |
| reader #11 | `shepherd-assign-persist.ts:215,290` | `:215` ✓ and **`:289`** |
| the 10.14 sweep | *"`grep -rn "10\.14\|10-14\|FR-48" apps packages docs` → **ZERO hits**"* | **zero in `apps` and `packages`**; **5 in `docs/`**, every one unrelated (`Days 10-14`, `A-epic-10-14-story-breakdown`, an ADR index row). The substantive claim — *nothing points at this story* — **holds** |
| the delegation sweep | *"two unrelated test files"* | the only `delegatee\|delegator` hits are **two `apps/admin/dist/*.js.map` build artifacts**; **zero in source**. Substantively **stronger** than claimed |

⭐ **ZERO DRIFT** on every governance citation, both trigger texts, all eleven reader identities, the
four non-delegability rulings, SA-1…SA-5, `PERMISSION_CATALOG_VERSION = 35`, key count `43`, next
migration `0109`, and the decision-log head `2026-08-16-125`.

---

## The six questions

### Q1 — Is FR-48 in v1 at all? ⛔ BLOCKING · *Feeds AC1, AC2, and the existence of Tasks 3–12*

Per **F-1**: `prd.md:1325` omits FR-48 from the §4.7 v1 roll-up; `prd.md:1350` lists it under §6.2 as
may-slip; the FR header still carries `[v1-S]`.

| Option | What it means |
|---|---|
| **(a)** | **Confirm v1 as written** — implement the full epic AC. Q2–Q6 must all then be ruled, including a supersession decision on `2026-08-16-123` clause 2 |
| **(b)** | ⭐ **Defer to v2** — recorded as *"Resolved via explicit deferral"*, the story closes, and the two standing triggers **stay armed** for whichever story next writes `role_grants` |
| **(c)** | ⭐ **Confirm v1 but NARROWED** — the smallest shape that satisfies the stated *why* without the escalation surface: e.g. **single-key, single-scope, short-span (14 days), denylisted keys excluded, request-path readers only** |
| **(d)** | **Redirect** — rule that the real v1 need is the missing **role-grant admin surface** (F-3), and that 10.14's successor is that story |

⭐ **Non-binding recommendation: (b) or (c).**

The reasoning is cost, not distaste. Option **(a)** requires the Panel to supersede a clause it ratified
nine days ago (Q5), ratify a denylist over four prior non-delegability rulings (Q6), reconcile three
conflicting authority sources (Q4), and accept an ADR against a freeze row — to build a feature the PRD
itself flagged as cuttable. Option **(c)** buys most of the stated *why* (vacation cover) for a fraction
of that: a single-key, 14-day, denylist-bounded delegation **cannot** manufacture a panel quorum,
because the panel keys are exactly what the denylist excludes.

⚠ **(d) is not a rejection of FR-48** — it is a claim that the *ordering* is wrong, and F-3 is the
evidence for it. If the operational pain is real, it is at least as likely to be "we cannot administer
grants" as "we cannot lend one."

⚠ **(b) is a success, not a failure.** ⛔ It must be recorded as *"Resolved via explicit deferral"* and
never reworded into a partial build ([[feedback_closure_language_precision]]).

**⛔ Non-answer:** the story cannot start. Every question below is moot, and the dev agent would be
choosing v1 scope by proceeding — which is a governance act, not an engineering one. **The story stops.**

### Q2 — Is `[SURFACE]` the right label? ⛔ BLOCKING *(cheaply)* · *Feeds AC9, Task 12*

`[SURFACE]` means *"don't stand up a new primitive."* But **no prior Epic 10 `[SURFACE]` story has ever
created an authority-bearing table** — 10.5, 10.9, 10.11 and 10.13 wrote *content* or *config*; this
writes **authorization**.

| Option | What it means |
|---|---|
| **(a)** | ⭐ Correct `epics.md:3934` to **`[PRIMITIVE]`** — the label matches what the story does |
| **(b)** | Keep `[SURFACE]`, recorded with the reason |

⭐ **Non-binding recommendation: (a).** Cheap, and the label is read by future story authors as a scope
statement.

⚠ Moot if Q1 rules **(b)** or **(d)** — in which case the epic entry is annotated with the deferral
instead.

**⛔ Non-answer:** the label keeps signalling *"no new primitive"* over a story that creates an
authority-bearing table — a reader-facing misstatement in the epic that future stories will inherit.
**The story continues, carrying a known-wrong label.**

### Q3 — May a delegation surface ship before a role-grant surface exists? ⛔ BLOCKING · *Feeds the story's disposition*

Per **F-3**: there is no production way to *confer* a grant. This story would build a way to *lend* one.

| Option | What it means |
|---|---|
| **(a)** | **Yes** — delegation ships first; the role-grant gap is recorded and carried |
| **(b)** | ⭐ **No** — a grant surface must land first; 10.14 becomes `blocked` with that story as its named predecessor |
| **(c)** | ⭐ **Conditionally yes** — only under Q1 **(c)**'s narrowed shape, where the lent authority is too small to substitute for the missing grant surface |

⭐ **Non-binding recommendation: (b) in principle, (c) in practice** — *only* if Q1 lands on (c).

⚠ The asymmetry matters: today, grants are created by hand at the database. A delegation surface would
be the **only** self-service authorization write in the product, sitting on top of a substrate whose
grants nobody can administer. That is an odd first thing to automate.

**⛔ Non-answer:** the system ships a way to lend authority before a way to confer it, and the
disposition of the role-grant gap goes unrecorded for a third story running. **The story stops** — AC1's
Boundary table cannot state its ruling either way.

### Q4 — Who may delegate? ⛔ BLOCKING · *Feeds AC4, Task 6, Task 7*

Per **F-2**: FR-48 says **trustee**; the epic says **Pariwar admin**; `architecture.md:1510-1511` says
**role modification requires Super Admin scope**; and `2026-08-16-123` cl. 1 says **a `pariwar_admin` is
not the Board**.

| Option | What it means |
|---|---|
| **(a)** | **Trustee** (FR-48's literal word) — the key sits on `trustee_panel` and/or `state_trustee` |
| **(b)** | **Pariwar admin** (the epic) — ⚠ requires reconciling `architecture.md:1510` **in terms** |
| **(c)** | **Super Admin only** — matches `architecture.md:1510` exactly; ⚠ collapses most of the stated *why* (vacation cover is a Pariwar-level need) |
| **(d)** | ⭐ **A named authority plus an explicit reconciliation** of `architecture.md:1510` — either by amending it, or by **holding that a time-boxed, revocable delegation is categorically NOT a "role modification"** |

⭐ **Non-binding recommendation: (d), with the underlying authority ruled explicitly.** The reconciliation
is the part that cannot be skipped: `architecture.md:1510` is a committed architectural property, and
leaving three sources standing means the next reader picks one.

⛔ **Whichever is chosen, note the scope trap:** the key must **not** be placed on `state_trustee` or
`district_admin`. A state- or district-ceiling grant **can never satisfy a `pariwar`-dimension check**
— rank order, not a missing resolver — so it would be **INERT ON ARRIVAL**. This is recorded at
`.decision-log.md:266` and was the live finding in Story 10.3.

**⛔ Non-answer:** the dev agent picks one of three, and **picking is a governance act**. **The story
stops.**

### Q5 — Which of the eleven readers must see delegations? ⛔ BLOCKING · *Feeds AC5, AC6, Task 8, E1*

Per **F-6**. This is the question the Panel most needs to answer itself, because clause 2 of
`2026-08-16-123` is **its own ruling from nine days ago**.

| Option | What it means |
|---|---|
| **(a)** | ⭐ **Request path yes; the five key-as-credential readers (rows 6–10) NO** — a delegation confers *operational* permission, never *panel eligibility*. The asymmetry is stated in the ruling |
| **(b)** | **All eleven** — ⛔ then clause 2 of `2026-08-16-123` **must be superseded in terms**, and the Panel accepts that a delegating authority can manufacture a quorum-eligible attestor for the delegation's span |
| **(c)** | **Request path only, and the epic's "read both" is corrected** to say so — the honest minimum |

⭐ **Non-binding recommendation: (a), with the asymmetry stated in the ruling itself.**

The reasoning, offered for the Panel to accept or reject: **eligibility to sit on a governance panel is
a standing capacity, not a lent one.** A person is on the R9 panel, the appeal panel, or the emergency
attestor set because of who they are and what office they hold — not because someone lent them a key
for a fortnight. Clause 2 defined that eligibility **against `role_grants`**, deliberately.

⚠ **Option (a) is not free.** It means the epic's *"the delegatee's effective permissions at any moment
= their own + active delegations; permission checks (Story 1.8) read both"* is **not true system-wide**,
and that must be written down as a **named, accepted limit** rather than left as epic prose that the
code silently contradicts ([[feedback_mechanization_split_commitment]]).

⚠ **E1 rides on this:** `apps/jobs/src/reports-export.ts:101` re-resolves scope on the **BYPASSRLS
worker pool**. If (b), that reader needs the same expiry predicate as Trigger A's. If (a) or (c), the
call site must **say so explicitly**. ⛔ Neither answer may be left implicit.

**⛔ Non-answer:** the epic's *"read both"* ships as a half-truth, the split-brain becomes permanent, and
a clause ratified nine days ago is **re-read by implementation** rather than superseded by ruling.
**The story stops.**

### Q6 — The ratified non-delegable denylist ⛔ BLOCKING · *Feeds AC4, Task 7*

Per **F-5**: four ratified sources already declare specific authority non-delegable. The epic AC
contains **no denylist at all**.

⭐ **Non-binding recommended minimum** — the Panel may add, remove, or reject any row:

| Key | Why | Source |
|---|---|---|
| `member.restore_terminated` | Panel-exclusive by design | `permissions.ts:526-530` |
| `member.decide_moderation_appeal` | Panel-exclusive; the separation **is** the mechanism | `permissions.ts:543-547` |
| `member.moderate` | moderation not delegable to a subset of the Board | §8.7; `2026-08-10-096` |
| `member.suspend` | same, **and** its holder set is frozen by Trigger B | `roles.test.ts:532-536` |
| `claim.r9_vote` | panel-membership credential | `roles.ts:113-114` |
| `claim.appeal_vote` | panel-membership credential | `roles.ts:313-316` |
| `pool.fixed_amount_emergency` | panel-membership credential | `2026-08-16-123` cl. 2 |
| the 10.23 imposition-flag key | *"not delegable"*, in terms | `2026-08-07-089` |
| the delegation key itself | ⛔ otherwise delegation is self-amplifying | author finding |

⭐ **Also recommended: the denylist is DATA with a golden-set test, not scattered `if`s** — so a future
key added to a panel-exclusive role fails a test rather than silently becoming lendable.

⚠ **The last row is the one to look at hardest.** If the delegation key is itself delegable, a single
delegation seeds an unbounded chain, and every bound the Panel sets above becomes advisory.

**⛔ Non-answer: the story STOPS — and this is the one place where proceeding would be worst.** An
author-invented denylist over **ratified** non-delegability is precisely the overreach
[[feedback_supersede_never_reinterpret]] forbids. ⛔ The dev agent may not draft this list into code on
the strength of a recommendation in a routing note.

---

## What non-answer would mean

| Q | Consequence of no answer |
|---|---|
| **Q1** ⛔ | v1 scope is decided by an agent proceeding. Every question below is moot. **The story stops.** |
| **Q2** ⛔ | The epic keeps a label that tells future authors "no new primitive" over an authority-bearing table. **The story continues, carrying a known-wrong label.** |
| **Q3** ⛔ | A way to *lend* authority ships before a way to *confer* it, and the role-grant gap goes unrecorded a third time. **The story stops.** |
| **Q4** ⛔ | The agent picks between trustee / Pariwar admin / Super Admin. Picking is a governance act. **The story stops.** |
| **Q5** ⛔ | The epic's *"read both"* ships as a half-truth and clause 2 of `2026-08-16-123` is re-read by implementation rather than superseded by ruling. **The story stops.** |
| **Q6** ⛔ | An author-invented denylist would sit over four ratified non-delegability rulings. **The story stops — and this is the worst one to proceed past.** |

**A blocked ruling stops the story at its governance half, recorded as such** — not worked around, not
partially built. **Five of the six stop it.** Only Q2 lets it continue, and only in a degraded state.

---

## What this note does NOT ask, and what a ruling would NOT mean

**Not asked:**
- ⛔ **Super-Admin delegation.** Out of scope by SA-1…SA-5. The succession runbook governs it and this
  story does not touch it. Named here so the exclusion is **ruled, not assumed**.
- ⛔ **Any change to `packages/domain/src/rbac/{check,scope}.ts` semantics.** Freeze row 9;
  `scope.ts:123-125` forbids re-ranking `pariwar`/`state` by name. F-7 exists to show a compliant shape,
  not to request an exception.
- ⛔ **A general role-grant admin surface.** Q3 asks about *ordering*, not about building it here.
- ⛔ **Runtime role-bundle editing** (FR-44's *"editable by Super Admin"*). Resolved via explicit
  deferral; the `bundles` seam would be used **only** for delegations.
- ⛔ **Member-side delegation.** Not applicable — members hold no `role_grants` rows.
- ⛔ **An `on_behalf_of` / `via_delegation_id` column on the FR-47 hash-chained audit line.** That is a
  `[PRIMITIVE]`-weight change to Story 1.10's substrate and gets its **own** story, not a rider here.
- ⛔ **Whether the underlying operational pain is real.** The note assumes it is; it asks only how
  authority should answer it.

**A ruling would NOT mean:**
- ⚠ that **Trigger A or Trigger B is discharged**. They fire on whichever story writes `role_grants`
  first. If Q1 defers, they **stay armed** — and must be recorded in those words, never as "closed."
- ⚠ that **the audit chain can distinguish a delegated act from a native one**. It cannot today
  (FR-47's line schema carries one `actor_id`), and no option here changes that. It is a **named,
  accepted limit** wherever delegation ships.
- ⚠ that **`architecture.md:1510` has been re-read**. Under Q4 it is amended, or held inapplicable in
  terms — never reinterpreted.
- ⚠ that **the UX exists.** The UX specification contains **no** delegation surface, no multi-select
  grammar, and no "effective permissions" viewer; its only "on behalf of" grammar is
  `<ClaimProxyFlowShell>`'s *"Filing on behalf of…"* banner (`ux-design-specification.md:1961`). Any
  build ships the **minimum the AC compels** and records the owed UX pass as an escalation.

---

## Ruling template

The Panel may rule by completing this table. Per Decision `2026-08-09-095`, the recorded entry must
carry **per-clause provenance** — `[Trustee-ratified]`, `[Author-committed]`, or author finding.

⛔ **Rule Q1 first.** If Q1 rules (b) or (d), Q3–Q6 need not be ruled at all, and the entry records them
as *"not reached"* — which is different from *"not answered"* and must be written in those words.

| Q | Ruling | Notes |
|---|---|---|
| **Q1** ⛔ | (a) v1 as written / (b) **defer to v2** / (c) **v1 narrowed** — shape: ______ / (d) redirect to a role-grant surface | ⛔ If (b): recorded as *"Resolved via explicit deferral"*, and the two triggers recorded as **still armed** |
| **Q2** ⛔ | (a) correct to `[PRIMITIVE]` / (b) keep `[SURFACE]`, with reason | Moot under Q1 (b)/(d) — annotate the epic with the deferral instead |
| **Q3** ⛔ | (a) yes / (b) no — predecessor story: ______ / (c) only under Q1(c) | ⛔ If (b): 10.14 becomes `blocked`, recorded with its named predecessor |
| **Q4** ⛔ | authority: ______ · and `architecture.md:1510` is: (i) amended — text: ______ / (ii) held inapplicable because a delegation is not a role modification | ⛔ Not `state_trustee` / `district_admin` — INERT ON ARRIVAL |
| **Q5** ⛔ | (a) request path only, panels NO / (b) all eleven / (c) request path only + epic corrected | ⛔ If (b): the entry must say **in terms** that it **supersedes clause 2** of `2026-08-16-123`. If (a)/(c): E1's worker call site must say so explicitly |
| **Q6** ⛔ | the denylist, as a list: ______ · mechanism: data + golden-set test — yes / no | ⛔ The list is ratified here or the story stops. Rule explicitly on the delegation key itself |
| **F-9** | noted | Three citation drifts + two imprecise sweeps; none changes a requirement |

---

## Disposition

On ruling: **one** `.decision-log.md` entry, numbered from the **then-live head** (**`2026-08-16-126`**
at authoring), per-clause provenance labelled, committed under a `governance(10.14):` prefix **before**
any implementation commit ([[feedback_governance_commits_precede_implementation]]).

This note's status line is then updated to `✅ RULED <date>` with the superseded `⏳ Open` line
**retained, never overwritten**, and the ruling as given appended at the foot — the 10.13 and 7.11 shape.

⛔ Decisions `2026-08-16-123`, `2026-08-10-096` and `2026-08-07-089` are **not edited** by any of this.
They stand as recorded; this entry is the **next** one, not a correction of any of them.

**If Q1 rules (b) or (d):** the entry records the deferral, `development_status[10-14-permission-delegation]`
flips to a deferred state, `deferred-work.md` records the disposition in the exact vocabulary of
[[feedback_closure_language_precision]], and **Tasks 3–12 do not run.** That is a complete and
successful outcome for this story, and ⛔ must not be reworded into a partial build.
