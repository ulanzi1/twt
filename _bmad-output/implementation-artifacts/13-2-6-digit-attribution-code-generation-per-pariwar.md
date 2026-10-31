---
baseline_commit: 3d6b46c5
---

<!--
PINNED: `3d6b46c5` = `origin/main` (ledger 2026-11-01a — Story 12.1 landed). The story lives on branch
`story/13-2-6-digit-attribution-code-generation-per-pariwar` in its OWN worktree
(`.claude/worktrees/13-2-6-digit-attribution-code-generation-per-pariwar`, fast-forwarded `4e57fa42` → `beae5116` →
`3d6b46c5`). Every `apps/` / `packages/` / `scripts/` claim was traced at `beae5116` and the 12.1 delta
(`beae5116..3d6b46c5`, the module-marketplace primitive) touches none of them. Perishable — re-check at Task 0.1.
Re-locate by FUNCTION, ⛔ by line.

STATUS: ready-for-dev (v1.4 — created v1.0 by `bmad-create-story 13.2`, validated v1.1 by one fresh-context checker; v1.2 records Q-S5; v1.3 records AT1–AT10 and PROPOSES AT8 v2 + AT4 (c); v1.4 applies a second fresh-context validation of v1.3).

§0 GATE (whose decision each edge is): every build decision below (AT1–AT10) is the AUTHOR's — none changes what a
member sees, a disclosure, or a consent basis; none supersedes a ratified clause. ⇒ ⛔ nothing routes to the Trustee
Panel. The ONE premise that was conditional — AT4 (never allocate a code a member already typed) costs a field worker
nothing ONLY IF no code was handed out outside this registry before 13.1 ships — is now ESTABLISHED: Q-S5 ANSWERED
2026-11-01, BigDev: *"Answer is no to both"* (⛔ code has been or will be handed out by hand before 13.1; member signup
will ⛔ go live before 13.1). ⇒ every `member_attribution` code is one no field worker holds, and AT4 forfeits nothing.
⚠ If either fact changes before 13.1 ships, AT4 and this gate are re-decided (STOP S5). v1.3's AT4 (c) (the as-of
rule) removes the dependence on the SECOND fact entirely — signup going live first can then credit no one wrongly; the
first (no hand-issued codes) is carried to 13.1 as C6. AT4 (c) is author-level: it credits a field worker only for
signups made after their code existed, which under Q-S5 are the only signups their code can have reached.
The edge that WOULD be the Panel's — a NEW RBAC permission key for field-worker features (`2026-06-21-059` amendment
B(3)) — this story does ⛔ not touch: it adds ⛔ no endpoint and ⛔ no key (AT8).

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes · ⭐ = action / emphasis · ⚠ = hazard.
ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md`, `epics.md` or `sprint-status.yaml` —
cite by decision id / heading / row block. Code is cited by path + FUNCTION.

NUMBERS (traced 2026-11-01 across main + every worktree + every branch — RE-GREP at Task 0.1 AND again at the
rebase-before-push):
- Migrations: main's highest is `0193_marketplace-modules` (12.1, LANDED; journal `when` 1796269200038);
  `0194_memorial-kinship` is TAKEN on story/11b-5a (`when` 1796355600039). ⚠ `0195` is CONTENDED: ready-for-dev
  siblings `14-3` (plans `0195_breach-incidents`) and `6-22` (plans "≥ 0195") want it too. ⇒ this story's migration is
  written below as `NNNN_field-worker-attribution-codes.sql` — take the next free number at Task 0.1, re-check at
  rebase, and set its journal `when` ABOVE every sibling's (a lower `when` behind a higher one is skipped by drizzle on
  a shared DB).
- Decisions: main holds up to `2026-10-31-430`; `-431`/`-432` exist on story/11b-5a. ⇒ this story needs ⛔ no decision
  entry (Task 0.3); if one becomes necessary, take ≥ `-433` and re-grep.
- RBAC: `PERMISSION_CATALOG_VERSION = 56` — ⛔ unchanged by this story.
- Ledger: main's newest is `2026-11-01a`; story/6-22 is at `2026-11-01b` ⇒ take the next free `2026-11-01` letter at each
  commit (re-grep every worktree).
- Roster / ADR: none.

LETTERS: G = found facts · AT = build decisions · I = invariants · TR = traps · C = carried to a sibling story.
-->

# Story 13.2: 6-Digit Attribution Code Generation Per Pariwar — Pariwar-Scoped Uniqueness Invariant `[PRIMITIVE]`

Status: ready-for-dev

## What this story is, in one paragraph

A field worker (Vikram) recruits teachers. Each field worker gets a **6-digit code**; a teacher who signs up types it,
and the signup is credited to that field worker (FR-81 / FR-82 — the commission that hangs off it is Story 13.5). This
story builds **only the code registry**: a table that holds one permanent code per field worker, unique **inside a
Pariwar** (two Pariwars may hand out the same digits), an allocator that draws a random code and retries on a clash, a
durable flag when it cannot find a free one, and the ONE lookup — `resolveAttribution(code, pariwarId)` — that turns a
code back into a field worker and **cannot be called without a Pariwar**. There is ⛔ no field-worker table yet (Story
13.1), ⛔ no endpoint, ⛔ no screen, ⛔ no signup wiring, ⛔ no commission. ⭐ This story settles the link between the
two stories: **the codes table carries the field worker's id; 13.1's table carries ⛔ no code column; 13.1 adds the
foreign key** (AT2).

## Names at a glance

| Thing | Name |
|---|---|
| Domain module | `packages/domain/src/attribution-code/` (namespace export `attributionCode`) |
| Codes table | `field_worker_attribution_codes` (Drizzle `fieldWorkerAttributionCodes`) |
| Flag table | `attribution_code_allocation_flags` (Drizzle `attributionCodeAllocationFlags`) |
| Migration | `NNNN_field-worker-attribution-codes.sql` (next free number ≥ `0195`, taken at Task 0.1 — NUMBERS) |
| New brands | `FieldWorkerId`, `AttributionCodeId`, `AttributionCodeFlagId` (`packages/domain/src/ids/index.ts`) |
| Generator | `generateAttributionCode()` |
| Allocator | `allocateAttributionCode(db, { pariwarId, fieldWorkerId }, opts?)` |
| Lookup | `resolveAttribution(db, { code, pariwarId, asOf }) → FieldWorkerId \| null` (AT4 (c)) |
| API door (the ONLY `apps/*` user of the module) | `apps/api/src/modules/field-worker/attribution-code-access.ts` (AT8 v2) |
| Holder read | `readAttributionCodeForFieldWorker(db, { pariwarId, fieldWorkerId })` |
| Flag write / read | `flagAllocationExhausted(db, …)` / `listAllocationFlags(db, { pariwarId })` |
| Retry default | `ATTRIBUTION_CODE_MAX_ATTEMPTS = 8` |

## Story

As the Solo Builder authoring the attribution-code allocation system,
I want a random 6-digit code generator with **Pariwar-scoped uniqueness** (not global uniqueness) and a lookup that
always needs the Pariwar,
so that code allocation scales with multi-Pariwar growth without artificial collision pressure, while attribution always
resolves via Pariwar context.

## 📜 Policy meaning (AI-10-1)

**13.2 introduces NO predicate that gates a member's access to a benefit, and changes none.** The one predicate it adds —
*"this code, in this Pariwar, belongs to this field worker"* — decides **which field worker a signup is credited to**,
and a field worker is ⛔ not a member: no member's cover, claim, drive, refund or standing reads it. In the member's
terms: *"the code you type at signup only says who introduced you; it never changes what you are covered for."* Checked
against the Niyamavali (2026-10-31, `docs/legal/niyamavali.md` + `niyamavali.hi.md` — the private corpus copy in the
main checkout, git-ignored; grep `field worker|commission|referr|attribution|प्रेरक|कमीशन`): **zero hits** — the
rulebook says nothing on field workers or referral credit, so nothing conflicts. ⇒ **No conflict for 13.2; nothing to
route.** ⚠ Story 13.5 (commission gated on KYC + ₹110 + first confirmed contribution) is where money first hangs off this
predicate; its own Policy-meaning note must re-ask — for the field worker's pay, ⛔ not the member's benefit.

## The rulings and sources this story builds on (quoted, never paraphrased)

- **epics.md, Story 13.2 AC1:** *"the code allocator generates a random 6-digit code on field-worker registration;
  uniqueness is checked against existing active codes **within the same Pariwar only**; collisions retry up to a
  configurable threshold; permanent unallocation flagged for trustee review"*. ⚠ "active codes" is NARROWED by AT3 —
  this story checks against **every code ever allocated** in the Pariwar (stricter; reason in AT3).
- **epics.md, Story 13.2 AC2 ("per user direction"):** *"attribution-code uniqueness is enforced within a Pariwar
  namespace rather than globally"* · *"cross-Pariwar collisions are permissible provided attribution resolution always
  includes Pariwar context"* · *"`resolveAttribution(code, pariwar_id) → field_worker_id` — takes BOTH the code AND the
  Pariwar context; never accepts a code lookup without Pariwar context"* · *"a CI test asserts: no API endpoint allows
  attribution-code lookup without Pariwar context; same `(code, pariwar_id)` pair always resolves to the same field
  worker; same code across different Pariwars resolves to different field workers"*. ⚠ NARROWED by AT4 (c): the lookup
  also takes a required `asOf`, and the same `(code, pariwar_id)` resolves to the same field worker for every `asOf` at
  or after the code's allocation — and to `null` before it.
- **epics.md, Story 13.1 AC:** `attribution_code` *"(Pariwar-scoped 6-digit; FK to Story 13.2 codes table)"* — ⚠ the
  FK DIRECTION is reversed by AT2 (and a dated note is added under 13.1 in `epics.md`, Task 0.4).
- **PRD FR-81:** *"Code generated on admin 'Add Field Worker.' Unique per Pariwar."* · **FR-82:** *"Accepts: 6-digit
  numeric (field worker), member username/eHRMS (adopter), empty (organic). Parsed and stored as `attribution_source`."*
  · **FR-85:** *"Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code
  rejected."* · **FR-53:** a field worker *"sees only their own attribution code"* (RBAC scope `field_worker_self`).
- **Story 3.6b (done), D2:** the Reference Code is a **capture-and-defer port seam** — *"NO validation against an
  allocation registry (none exists), NO `attributed_to_fieldworker_id` resolution, and NO rejection of 'unknown'
  codes … Epic 13 backfill/consume `attribution_source` when that epic activates"* (header of
  `packages/domain/src/schema/member_attribution.ts`).
- **Decision `2026-06-21-059` amendment B(3):** *"Future permission additions for … Field Worker … are to be ratified
  when their feature sets ship."* ⇒ ⛔ this story adds no key (AT8).

## ⭐ Found facts (G), traced at the pin

- **G1 — the member-side capture already exists and already carries the Pariwar.** `POST /api/v1/member/vyawastha-shulk/confirm`
  accepts `referenceCode: z.string().regex(/^\d{6}$/…).optional()` (`packages/contracts/src/payments/vyawastha-shulk.ts`,
  `VyawasthaShulkConfirmRequest`). ⚠ `POST /api/v1/member/vyawastha-shulk/renew/confirm` REUSES the same body schema
  (`apps/api/src/modules/vyawastha-shulk/routes.ts`; the contract says `referenceCode` is "signup-only and simply unused
  on renewal") ⇒ TWO routes carry the key today. The handler (`apps/api/src/modules/vyawastha-shulk/handlers.ts`, the confirm handler)
  writes it under `SAVEPOINT attr_capture` via `paymentDomain.insertMemberAttribution` with `pariwarId` from the member
  session's `requestContext`; any failure is swallowed so the receipt commits (AR-67); an audit line
  `member_attribution.captured` follows. ⇒ the epic's *"Story 3.6 signup must capture the Pariwar context alongside the
  Reference Code"* is **already true** of every captured row. ⛔ This story does ⛔ not touch that path.
- **G2 — `member_attribution` holds UNVALIDATED 6-digit strings.** `packages/domain/src/schema/member_attribution.ts` —
  `attribution_source text NOT NULL`, `pariwar_id`, `captured_at`, `UNIQUE(member_id)`, ⛔ no FK on the code; migration
  `0027_vyawastha-shulk-receipts.sql` grants `SELECT, INSERT` with RLS ENABLE + FORCE and a SELECT policy on `pariwar_id`
  (so the AT4 read is permitted under `twt_app`). Every row captured before this registry exists names a code that no
  field worker held — ⛔ code was handed out by hand outside this system (Q-S5, BigDev 2026-11-01: *"Answer is no to
  both"*; §0). Nothing is live (member signup has ⛔ gone live), so today the table holds no production rows.
- **G3 — there is no field-worker table, package, permission key or endpoint.** The RBAC role exists with nothing in it:
  `packages/domain/src/rbac/roles.ts` (`field_worker`: `permissions: []`, `scopeCeiling: 'self'`, comment *"Dispatch keys
  land Epic 12"*) and `packages/contracts/src/rbac/roles.ts`. ⚠ That "Epic 12" (and the `permissions.ts` catalog
  doc-block's *"`field_worker` is likewise DEFERRED to Epic 12"*) records Decision `2026-08-13-104`'s open follow-up —
  *"`field_worker` ground inspection remains deferred to Epic 12"* — a deferral of ground-inspection DISPATCH, ⛔ of
  Epic 13's attribution. ⛔ Rewrite either comment ([[feedback_supersede_never_reinterpret]]). No `field-worker*` package
  exists.
- **G4 — there is no `pariwars` table.** `pariwar_id` is an unconstrained uuid everywhere; scope is `SET LOCAL
  app.pariwar_id` (`setPariwarScope` / `assertPariwarScopeSet` in `packages/domain/src/db.ts`; `openScopeTx` in
  `apps/api/src/modules/multi-tenant/scope-tx.ts`). v1 launches with ONE Pariwar (`DEFAULT_SIGNUP_PARIWAR_ID`,
  `apps/api/src/config.ts`), but the model and the test fixtures (`PARIWAR_A/B`, `packages/domain/tests/integration/_helpers.ts`)
  are multi-Pariwar.
- **G5 — the collision-retry precedent.** `packages/domain/src/telegram-opt-in/write.ts` (`createPendingOptIn`):
  `MAX_CODE_RETRIES = 5`; per attempt `SAVEPOINT` → insert → `RELEASE`, on error `ROLLBACK TO SAVEPOINT`, read the
  violated constraint via `uniqueViolationConstraint(err)` (walks drizzle's `.cause` chain), regenerate **only** on the
  code's own unique constraint, rethrow anything else; raw SAVEPOINT SQL because a nested `db.transaction()` commits the
  caller's tx early. ⚠ Match the **constraint name**, never any 23505 (review RP11, `questionnaire-versions/write.ts`
  `isUniqueViolation` comment).
- **G6 — the randomness precedents.** `apps/api/src/modules/auth/shared/otp.ts` (`generateOtp`):
  `String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0')` — leading zeros kept. Domain generators use
  `node:crypto` (`randomBytes` + rejection sampling, `telegram-opt-in/code.ts`); ⛔ `Math.random` anywhere.
- **G7 — no generic "flag for trustee review" primitive exists.** `packages/domain/src/alert/` is the donation-alert
  lifecycle (cycle-bound); helpdesk tickets can be system-origin (`helpdesk/project.ts`, `projectTicketGenesis`, `actor:
  'system'`) but need a subject, a category and a routing-policy version; audit lines are counters, ⛔ a queue.
  Purpose-built review queues are the house pattern (`reconciliation/reconciliation-review-read.ts`, `memorial/review.ts`).
- **G8 — no generic config store.** Thresholds are domain constants (`WA_OPT_IN_CODE_MAX_SENDS`, `MAX_CODE_RETRIES`) or
  API env via `intEnv` (`apps/api/src/config.ts`) passed through `deps.config`.
- **G9 — the route-scan precedent (HISTORICAL since v1.3 — AT8 v2 does ⛔ use it; kept so the reasoning in AT8 v2's "why
  v1.2's rule was replaced" can be checked).** `apps/api/src/route-registry.ts` (`collectRoutes` / `getCollectedRoutes` — each
  entry exposes the raw Zod `schema`, so a key-walk is feasible) + `apps/api/tests/integration/login-wall.spec.ts` (every
  collected route, skips HEAD, an allowlist, guard symbols `ADMIN_SESSION_GUARD` / `MEMBER_SESSION_GUARD`, and a
  **non-vacuity floor** `guarded >= 6`).
- **G9a — WHERE THE PARIWAR COMES FROM, per actor.** A MEMBER route gets it from the session (`requestContext.pariwarId`,
  G1). An ADMIN route does ⛔ not: the admin session guard (`apps/api/src/modules/auth/shared/session-guard.ts`) sets only
  `requestContext.actorId`; the Pariwar is the PATH param of `/api/v1/p/:pariwarId/…`, checked against `role_grants` and
  set into `requestContext.pariwarId` by `scopeResolutionHook` (`apps/api/src/middleware/scope-resolution/index.ts`),
  which also opens the request's scoped tx and attaches it as `request.scopeTx` (closed by the multi-tenant lifecycle
  hook). ⚠ A MEMBER route has ⛔ such hook: `requireMemberSession` (`apps/api/src/modules/auth/shared/member-session-guard.ts`)
  only copies the verified JWT's `pariwar_id` into `requestContext.pariwarId`, and the HANDLER then opens its own
  `openScopeTx(deps, <string it chooses>)` (e.g. the confirm handler's `memberCtx` → `openScopeTx(deps, pariwarIdStr)`).
  ⇒ for a member route, NOTHING ties the tx's Pariwar to the session's — a handler could scope from config
  (`DEFAULT_SIGNUP_PARIWAR_ID`), a header or a literal and no route-shape check would see it.
- **G9b — exactly TWO code sites write `requestContext.pariwarId`:** `requireMemberSession` (from the verified JWT) and
  `scopeResolutionHook` (after the `role_grants` check). `requestContextHook` (`apps/api/src/middleware/request-context/index.ts`)
  initialises the context as `{ traceId }` — ⛔ Pariwar. (grep of `apps/api/src` at `3d6b46c5`.) ⇒ `requestContext.pariwarId`,
  when set, is ALWAYS an authenticated Pariwar — the fact AT8 v2 builds on.
- **G10 — the migration house style.** STATEMENT ORDER from `0178_member-wa-opt-in-codes.sql`: header "never
  regenerate"; referenced-UNIQUE → CREATE → FK → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger; every
  statement ends `--> statement-breakpoint`; `DEFAULT clock_timestamp()`; per-command policies `TO "twt_app"` with
  `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`, ⛔ `FOR ALL`; ⛔ DELETE granted. ⚠ 0178's guard
  is `BEFORE UPDATE` only (it grants a column UPDATE) — the APPEND-ONLY precedent is
  `0192_questionnaire-versions.sql` (`questionnaire_chain_reject_mutation()`, `BEFORE UPDATE OR DELETE … FOR EACH ROW`
  **plus** a `BEFORE TRUNCATE` statement trigger; also `0188_degraded-bridge-sms.sql`). Drizzle policies in `packages/domain/src/policies/<table>-rls.ts`
  (`pgPolicy(...).link(table)`, `to: appRole`); both exported from `schema/index.ts` / `policies/index.ts`. Journal:
  `packages/domain/migrations/meta/_journal.json` (idx 140 is a pre-existing gap).
- **G11 — the cross-Pariwar leak suite.** `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` has
  a block per tenant table (e.g. `member_wa_opt_in_codes`); a new tenant table adds a block.

## ⚖️ Build decisions AT1–AT10 (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

- **AT1 — Home.** ⭐ `packages/domain/src/attribution-code/` (`index.ts`, `code.ts`, `allocate.ts`, `resolve.ts`,
  `flags.ts`, `errors.ts`), re-exported as `export * as attributionCode` from `packages/domain/src/index.ts`.
  - ⛔ (b) a new `packages/attribution-code` / `packages/field-worker-lifecycle` — no second consumer exists today
    ([[feedback_no_premature_package]]); architecture places the API surface at `apps/api/src/modules/field-worker/`,
    which is 13.3's, ⛔ this story's.
- **AT2 — Which way the link runs (THE seam with 13.1).** ⭐ (a) the codes table carries `field_worker_id uuid NOT NULL`
  with ⛔ **no FK yet**; 13.1's migration adds `FOREIGN KEY ("pariwar_id","field_worker_id") REFERENCES
  "field_workers" ("pariwar_id","field_worker_id")` (composite, because a single-column FK check bypasses RLS — 0178
  precedent); 13.1's `field_workers` row carries ⛔ **no** `attribution_code` column (it reads the code through
  `readAttributionCodeForFieldWorker`). One direction, no cycle, and `resolveAttribution → field_worker_id` ships and is
  tested **here**. Precedent for an un-FK'd id awaiting its owner: the pool primitive's `cycle_id` (Story 7.1).
  - ⛔ (b) the epic's literal shape (`field_workers.attribution_code` → codes table): 13.2 could not deliver
    `resolveAttribution` (no holder to return) — half its ACs would defer to 13.1, the circular-deferral shape
    ([[feedback_circular_deferral_between_sibling_stories]]).
  - ⛔ (c) both directions — two sources of truth for one 1:1 link.
- **AT3 — What "unique" is checked against.** ⭐ (a) **every code ever allocated in the Pariwar** — a code is ⛔ never
  freed, ⛔ never reused, ⛔ never reassigned: `UNIQUE ("pariwar_id","code")` over all rows, table append-only. Why: FR-85
  keeps a deactivated worker's existing attributions; a reissued code would make one code mean two workers across time,
  and every historic signup row (G2) would become ambiguous. Cost: a 10⁶ code space per Pariwar is consumed
  permanently — immaterial at Phase A (0→1L members/Pariwar).
  - ⛔ (b) the epic's "active codes" (reuse after termination) — needs a lifecycle state 13.2 does not own and breaks
    FR-85's preservation.
- **AT4 — Never hand out a code someone already typed.** ⭐ (a) the allocator **also rejects any candidate equal to an
  `attribution_source` already captured in `member_attribution` for the same Pariwar** (one `EXISTS` read under the
  caller's scope, before the insert). Why: those strings were typed before any field worker held them (G2); if the
  registry later drew the same digits, every pre-registry signup that typed them would silently credit the new worker.
  - ⛔ (b) no check — a backfill (C4) would then need a temporal rule to undo the false matches.
  - ✅ Premise ESTABLISHED by Q-S5 (BigDev 2026-11-01: *"Answer is no to both"*, §0): ⛔ code was or will be handed out
    by hand before 13.1, and signup will ⛔ go live before it — so AT4 forfeits no one's credit. Had either been yes,
    AT4 would have needed an import path (13.1's); STOP S5 re-opens it if either fact changes.
  - ⚠ Not index-enforceable (different table). There is ⛔ `(pariwar_id, attribution_source)` index on
    `member_attribution`, so each candidate scans the Pariwar's rows — fine at admin "Add Field Worker" rate; ⛔ add an
    index (AC9). The race: a capture whose tx is concurrent with the allocation may commit AFTER it yet carry an EARLIER
    `captured_at` (`defaultNow()` = its tx start) — AT4 (c) makes that case deterministic.
  - **AT4 (c) — the ROLLOUT SEQUENCING GUARANTEE (v1.3, PROPOSED — BigDev asked for one).** AT4 (a) alone rests on a
    promise about ORDER (signup ⛔ live before 13.1; Q-S5). ⭐ Make correctness independent of rollout order: **a code
    credits its holder only for a capture made AT OR AFTER the code was allocated.** `resolveAttribution` takes a
    REQUIRED `asOf: Date` and returns the holder only if `date_trunc('milliseconds', allocated_at) <= asOf`; otherwise
    `null`. ⚠ MILLISECOND granularity, on purpose: `allocated_at` is `clock_timestamp()` (µs) but a JS `Date` holds ms
    (`new Date('… 12:00:00.123999+00')` → `.123Z`), so a µs comparison would make `asOf = <the allocator's returned
    allocatedAt>` resolve to `null`. `asOf` is a DB instant, ⛔ an app-clock value (`new Date()`, `deps.clock()`): the
    capture's own `member_attribution.captured_at`, or — for a lookup tied to no capture (an admin "who holds code X
    now?") — `clock_timestamp()` read in the same tx (AC5). Consequences:
    - signup going live before 13.1 becomes HARMLESS — every pre-registry capture predates every allocation, so it
      credits ⛔ one, whatever the order of deploys, and whether or not AT4 (a) caught it;
    - the concurrent-capture race mostly resolves the right way — a capture whose tx began before the code's INSERT
      could not have been typed from that worker. ⚠ RESIDUAL: `allocated_at` is the insert-time clock, ⛔ the commit
      time, so a capture whose tx starts between the allocator's INSERT and the registration COMMIT is credited though
      the code was visible to no one yet (and AT4 (a)'s `EXISTS` missed it too) — odds ≈ 10⁻⁶ per capture × a
      milliseconds-wide window; accepted, ⛔ engineered away;
    - the live path (13.8: capture, then resolve in the same tx with the row's `captured_at`) is unaffected;
    - a backfill (C4) needs ⛔ temporal rule of its own — it is in the only door, and no caller can forget it because
      `asOf` is required.
    - What it does ⛔ cover: a code handed out by hand OUTSIDE the registry (Q-S5's first half). No software can see a
      code that was never issued; that premise is carried to 13.1, whose registration flow is the only issuer (C6).
    - ⛔ (d) a per-Pariwar "registry opened at" marker — the same rule with one more table and a write to keep in step.
    - ⛔ (e) a launch-roster row — the roster's rows need ≥ 2-trustee ratification (`docs/launch-gate-inventory/`) for
      what (c) makes mechanical; C6 carries the one human premise left.
- **AT5 — Format.** ⭐ (a) exactly six ASCII digits `000000`–`999999`, stored as `text` (⛔ integer — leading zeros),
  DB `CHECK ("code" ~ '^[0-9]{6}$')`, drawn by `crypto.randomInt(0, 1_000_000)` + `padStart(6, '0')` (unbiased —
  Node's `randomInt` rejection-samples), **excluding a small deny-list of guessable codes**: the ten repdigits
  (`000000`, `111111`, …) and the straight runs (`012345`, `123456`, `234567`, `345678`, `456789`, and their reverses
  `543210`, `654321`, `765432`, `876543`, `987654`). Why: a teacher who types `123456` as a placeholder must ⛔ credit a
  real worker. The deny-list is a domain constant, unit-tested, and **also** a DB CHECK (so a hand-seeded row cannot
  hold one).
  - ⛔ (b) no deny-list — trivially guessable codes become live.
  - ⛔ (c) a letters/Crockford alphabet — FR-82 and the shipped contract (G1) say *6-digit numeric*.
- **AT6 — "Configurable threshold".** ⭐ (a) exported default `ATTRIBUTION_CODE_MAX_ATTEMPTS = 8` with an optional
  `opts.maxAttempts` override, validated as an integer in `1..32` (else `RangeError`); the future caller (13.1's
  registration handler) may wire it from `deps.config` via `intEnv` — ⛔ this story adds no env var. Arithmetic: with *N*
  codes in a Pariwar a draw clashes with probability ≈ *N*/10⁶; at *N* = 10,000 eight straight clashes ≈ 10⁻¹⁶. ⇒
  "permanent unallocation" is reachable only by a broken generator or an exhausted space — exactly what a flag is for.
  - ⛔ (b) a per-Pariwar config table — a store with no second key in it.
- **AT7 — "Flagged for trustee review".** ⭐ (a) exhaustion throws `AttributionCodeAllocationExhaustedError { pariwarId,
  attempts }`, and a **durable, append-only flag row** in `attribution_code_allocation_flags` (`flag_id`, `pariwar_id`,
  `attempts`, `actor_id` — the admin who pressed "Add Field Worker" — and `flagged_at`) is written by
  `flagAllocationExhausted(db, …)`. A flag written inside the failing tx would roll back with it, and on an admin
  `/p/:pariwarId` route the handler does ⛔ own that tx (G9a) ⇒ the flag is written in a SEPARATE
  `openScopeTx(deps, pariwarId)` that commits independently — built into the API door's
  `flagAllocationExhaustedForRequest` (AT8 v2 iii); the caller calls it in its catch, then rethrows (C1). `listAllocationFlags(db, { pariwarId, limit? })` is the read the trustee surface renders (C3). ⛔ No `field_worker_id` on the flag: the registration that failed rolled back,
  so that id names nothing.
  - ⛔ (b) a system-origin helpdesk ticket — needs a subject, a new category and a routing-policy version bump (G7) for
    a ~10⁻¹⁶ event.
  - ⛔ (c) an audit line only — a counter, ⛔ a review item: it does not meet "flagged for trustee review".
- **AT8 v2 — "No API endpoint allows attribution-code lookup without Pariwar context" (v1.3, PROPOSED — BigDev:
  *"AT1-AT10 as recommended, except AT8. I want you to come up with better proposal for AT8"*).**
  - **Why v1.2's rule was replaced.** It inspected route SHAPES — key names in the request schema plus which guards a
    route carries — and both of BigDev's findings hold:
    - *Member rule ⟂ G9a.* Rule (a) passed any route that has `MEMBER_SESSION_GUARD` and no `pariwarId` key, on the
      ground that "the Pariwar is the session's". G9a shows a member handler opens its OWN scoped tx from whatever
      string it passes, so a route could pass rule (a) while looking the code up under a config, header or literal
      Pariwar. The guard tells you a Pariwar was AUTHENTICATED; it does not tell you the lookup USED it.
    - *Name matching misses future lookups.* A lookup route with `:code`, `{ code }`, `{ ref }`, a deep-link token, a
      job, or any lookup reached through a helper never matches a `referenceCode|attributionCode|attribution_code`
      key list — and the pin can only catch keys it already knows.
  - ⭐ **(a) Gate the CALL, not the route shape (v1.4 — hardened after the v1.3 validation).** Every lookup, from any
    endpoint, page or job present or future, must go through one door that takes the Pariwar ONLY from the
    authenticated request — and the domain refuses any tx that is not scoped to that same Pariwar. Four links, each
    enforced, each non-vacuous today:
    - **(i) the domain door** (unchanged): `resolveAttribution` is the only export keyed by `code`; it filters
      `WHERE "pariwar_id" = $1 AND "code" = $2` explicitly and asserts `current_setting('app.pariwar_id', true)` =
      `pariwarId` (unset ⇒ `PariwarScopeMissingError`; non-UUID ⇒ `InvalidPariwarScopeError`; different ⇒
      `AttributionPariwarScopeMismatchError`). Pinned export list.
    - **(ii) ONE REACH FENCE over the whole repo** (replaces v1.3's separate domain boundary scan and door-only scan —
      both were too narrow: v1.3 missed `apps/public`, an UNAUTHENTICATED server that sets its scope from config
      (`apps/public/src/lib/db.server.ts` `withPublicScope` → `setPariwarScope(client, ACTIVE_PARIWAR_ID)`, importing
      `@twt/domain` from `.ts` and `.astro` files), and could be bypassed through `schema.fieldWorkerAttributionCodes`,
      raw SQL, or a wrapper in another package / domain module). House precedent: `apps/api/tests/unit/family-account-reach-fence.test.ts`
      (one REACH pattern, scanned TREES, an EXACT allow-list, comments stripped, a planted-importer positive control —
      its header records the same lesson: *"the first version scanned `apps/api/src` alone"*).
      - **REACH:** the `attributionCode` export of `@twt/domain` (matched by the EXPORTED name, so an alias counts; also
        `domain.attributionCode` after `import * as domain`, and re-exports); any import path containing
        `attribution-code`; `fieldWorkerAttributionCodes`; `attributionCodeAllocationFlags`;
        `field_worker_attribution_codes`; `attribution_code_allocation_flags`; and the domain function names
        `resolveAttribution`, `allocateAttributionCode`, `readAttributionCodeForFieldWorker`, `flagAllocationExhausted`,
        `listAllocationFlags`.
      - **TREES:** every `apps/*/src` and every `packages/*/src` — enumerated from the workspace directories at run time
        (⛔ a hard-coded list), files `.ts`, `.tsx`, `.mts`, `.js`, `.astro`.
      - **ALLOWED (exact):** the module's own files `packages/domain/src/attribution-code/*.ts`; the two schema files and
        `schema/index.ts`; the two policy files and `policies/index.ts`; `packages/domain/src/index.ts` (the namespace
        export); and the API door `apps/api/src/modules/field-worker/attribution-code-access.ts`. Inside
        `packages/domain/src`, ⛔ other module may import `../attribution-code/` (that would be a second door).
      - **Positive controls:** a planted importer in `apps/public/src/pages/*.astro`, in `packages/validity-service/src`,
        a `schema.fieldWorkerAttributionCodes` read, a raw-SQL `field_worker_attribution_codes`, and a `../attribution-code/`
        import from another domain module — each caught; a COMMENTED mention ⛔.
      - **Floor:** every ALLOWED file exists and matches REACH (an allow-list entry that no longer reaches is stale and
        fails); ≥ 500 files scanned.
      - The AT9 rule rides here too: ⛔ file outside `packages/domain/src/attribution-code/` and test trees passes `generate`.
    - **(iii) the API door** — `apps/api/src/modules/field-worker/attribution-code-access.ts`, exporting EXACTLY these five
      wrappers with EXACTLY these option keys (pinned by name and key):
      `resolveAttributionForRequest(request, tx, { code, asOf })`, `readAttributionCodeForRequest(request, tx,
      { fieldWorkerId })`, `allocateAttributionCodeForRequest(request, tx, { fieldWorkerId }, opts?: { maxAttempts?:
      number })` (⛔ `generate` — AT9), `listAllocationFlagsForRequest(request, tx, { limit? })`, and
      `flagAllocationExhaustedForRequest(deps, request, { attempts })` (opens and commits its OWN
      `openScopeTx(deps, <request's Pariwar>)` — the C1 separate-tx rule, built in).
      - **POSITIVE shape rule** (⛔ a deny-list): the `request` parameter is used ONLY by passing it to ONE private helper,
        `authenticatedScope(request)`, which reads `request.requestContext.pariwarId` and `request.requestContext.actorId`
        and nothing else; ⛔ other property access on `request`, ⛔ element access, ⛔ destructuring, ⛔ passing `request`
        to any other function, ⛔ `getRequestContext()`. An unset Pariwar — or, for the flag wrapper, an unset actor —
        ⇒ a loud 500 (`Error('[attribution-code-access] no authenticated Pariwar')` / `… actor`), matching
        `scopeResolutionHook`'s own loud-500-on-misuse. ⛔ exported wrapper has any parameter or option key other than
        those pinned above (so ⛔ `pariwarId`, `pariwar`, `tenantId` …).
    - **(iv) the authenticated-Pariwar writer pin** (`apps/api/src`): the set of files containing ANY assignment or
      compound assignment (`=`, `??=`, `||=`, `&&=`) whose target is a property access OR element access named
      `pariwarId` — on ANY receiver (`request.requestContext`, an alias `ctx`, `getRequestContext()!`, `x['pariwarId']`)
      — or a destructuring assignment that writes a `pariwarId` property, is EXACTLY
      `{ modules/auth/shared/member-session-guard.ts, middleware/scope-resolution/index.ts }` (G9b; two today, so the pin
      is non-vacuous, and ⛔ fewer than two passes). Also: ⛔ `Object.assign` / `Reflect.set` / `Object.defineProperty`
      whose target is `requestContext`, `request.requestContext` or `getRequestContext()`, anywhere in `apps/api/src`;
      and assignment TO a `.requestContext` property only in `middleware/request-context/index.ts`.
  - **What the four links prove together, for ANY endpoint, page or job and ANY key name:** the module and its tables
    are reachable only through (iii) (ii); (iii) takes the Pariwar only from `requestContext.pariwarId`; (iv) makes that
    an authenticated Pariwar (a verified member JWT, or a `role_grants`-checked admin scope); (i) refuses unless the
    transaction is scoped to that same Pariwar, and filters on it. ⇒ a lookup without Pariwar context THROWS; under the
    wrong Pariwar THROWS — including the member handler that opened its tx from config or a header (G9a closes at (i)),
    and ⛔ public page can reach it at all ((ii)).
  - **Where the gates live.** (ii) and (iv) and the (iii) shape rule: `apps/api/tests/unit/attribution-code-reach-fence.test.ts`,
    TypeScript-AST via the `typescript` devDependency of `apps/api` (for `.astro`, scan the frontmatter / script text
    with the same REACH regex after comment-stripping — the precedent's approach). ⚠ Like the precedent, it reads other
    workspaces, so a LOCAL `ci:local` re-run is skipped by turbo's cache when only another workspace changed (`@twt/api#test`
    uses default inputs); GitHub CI has no turbo cache and is the backstop. ⛔ add turbo `inputs` in this story.
  - **Bite tests** (synthetic sources, unit): for (ii) — each positive control above, an alias import, `domain.attributionCode`,
    a re-export, a path import; for (iii) — a `pariwarId` param, a `pariwar` option key, a `request.body` read, a
    `request['body']` read, `const { body } = request`, `request` passed to a helper, `getRequestContext()`, a forwarded
    `generate`; for (iv) — a third writer via `ctx.pariwarId = …`, `getRequestContext()!.pariwarId = …`,
    `x['pariwarId'] = …`, `??=`, `Object.assign(request.requestContext, { pariwarId })`, `({ pariwarId: ctx.pariwarId } = o)`,
    and `request.requestContext = { …ctx, pariwarId }` outside `request-context/index.ts`.
  - **The runtime proof (live-DB, `apps/api/tests/integration/attribution-code-access.spec.ts`):** a fake request with
    `requestContext.pariwarId = A` and a tx scoped to A resolves A's holder; the same request with a tx scoped to B ⇒
    `AttributionPariwarScopeMismatchError` (the G9a gap, caught); `requestContext` without `pariwarId` ⇒ the loud 500;
    the flag wrapper without `actorId` ⇒ the loud 500; the flag wrapper's row survives the caller's rollback.
  - **Cost:** one small API file with no route caller yet (13.1 / 13.3 / 13.8 are its callers — C1, C5, C2) and one
    static test file. ⛔ Middleware change, ⛔ route scan, ⛔ Zod walker, ⛔ pinned route list. A future request-less
    caller (C4's backfill job) is a REVIEWED addition to the fence's ALLOWED list, with its own named Pariwar source.
  - ⛔ (b) v1.2's route-shape scan — fails both findings above.
  - ⛔ (c) a full route→call-graph AST (find every route whose handler transitively reaches `resolveAttribution`) — the
    same guarantee as (a) at many times the code, and brittle across dependency injection (`createXHandlers(deps)`).
  - ⛔ (d) take the Pariwar off the domain signature (read it from the tx scope only) — the epic names
    `resolveAttribution(code, pariwar_id)`, and (i)'s equality check is what catches a mis-scoped tx.
- **AT9 — Test seam for clashes.** ⭐ `allocateAttributionCode(db, input, opts?)` where `opts = { maxAttempts?,
  generate? }`; `generate` defaults to `generateAttributionCode` and exists for tests to force collisions. The reach
  fence (AT8 v2 ii) fails any non-test file outside the module that passes `generate`, and the API door's `opts` is
  typed `{ maxAttempts?: number }` only (AT8 v2 iii).
- **AT10 — No event.** ⭐ (a) allocation emits ⛔ no `events_log` event: the append-only codes row IS the record (the
  `member_attribution` precedent); 13.1's `field_worker.registered` payload may carry `attributionCodeId` (C1).
  - ⛔ (b) an `attribution_code.allocated` event — a second record of the same fact with no reader.

## ⭐ The invariants (I)

- **I1** — A code is unique **within** a Pariwar and ⛔ across Pariwars: `UNIQUE ("pariwar_id","code")`, ⛔ `UNIQUE ("code")`.
- **I2** — One field worker holds **at most one** code, ever: `UNIQUE ("field_worker_id")`.
- **I3** — A code row is **never** updated, deleted, truncated, freed or reassigned (GRANT `SELECT, INSERT` only + a
  `BEFORE UPDATE OR DELETE … FOR EACH ROW` guard trigger + a `BEFORE TRUNCATE` statement trigger — the `0192` shape — so
  it holds whatever the role).
- **I4** — Every lookup by code names the Pariwar; that Pariwar is the REQUEST's authenticated one (AT8 v2 iii–iv) and
  must equal the transaction's own scope (AT8 v2 i).
- **I5** — The allocator never issues a deny-listed code (AT5) or a code already captured in `member_attribution` for the
  Pariwar (AT4).
- **I6** — `resolveAttribution` returns the code's **holder**, ⛔ the holder's eligibility. Whether a holder who is
  suspended or terminated may receive NEW attributions (FR-85) is 13.1's state, applied by the caller (C2).
- **I7** — A code credits its holder only for a capture at or after its allocation: `resolveAttribution` returns the
  holder iff `date_trunc('milliseconds', allocated_at) <= asOf` (AT4 (c)). Correctness ⛔ depends on the order in which
  signup and the registry go live.

## Acceptance Criteria

0. **AC0 — governance first.** Task 0 is done and its greps are in the Debug Log before any code: the NUMBERS re-grepped
   (migration, decision id, `PERMISSION_CATALOG_VERSION`, ledger letter), BigDev's answers on AT1–AT10 and Q-S5 recorded
   verbatim, the INHERITED blocks in `epics.md` and the carried items in `deferred-work.md` written (Task 0.4).
1. **AC1 — the codes table.** **Given** `NNNN_field-worker-attribution-codes.sql` is applied, **then** table
   `field_worker_attribution_codes` exists with `attribution_code_id uuid PK DEFAULT gen_random_uuid()`, `pariwar_id uuid
   NOT NULL`, `field_worker_id uuid NOT NULL` (⛔ FK — AT2), `code text NOT NULL`, `allocation_attempts smallint NOT NULL`,
   `allocated_at timestamptz NOT NULL DEFAULT clock_timestamp()`; **and** `UNIQUE ("pariwar_id","code")` named
   `field_worker_attribution_codes_pariwar_code_uq`, `UNIQUE ("field_worker_id")` named
   `field_worker_attribution_codes_field_worker_uq` (⛔ a composite `(pariwar_id, field_worker_id)` unique here — 13.1's
   composite FK REFERENCES `field_workers`, so the unique it needs lives on 13.1's table) **and** CHECKs: `code ~ '^[0-9]{6}$'`; `code` ⛔ in the AT5 deny-list;
   `allocation_attempts BETWEEN 1 AND 32`; **and** `GRANT SELECT, INSERT … TO twt_app` only; RLS ENABLE + FORCE;
   per-command `SELECT` and `INSERT` policies on `pariwar_id` (G10 shape); **and** a `BEFORE UPDATE OR DELETE … FOR EACH
   ROW` guard trigger plus a `BEFORE TRUNCATE` statement trigger, both raising `integrity_constraint_violation` (I3; the
   `0192` shape).
2. **AC2 — the flag table.** **Given** the same migration, **then** `attribution_code_allocation_flags` exists with
   `flag_id uuid PK DEFAULT gen_random_uuid()`, `pariwar_id uuid NOT NULL`, `attempts smallint NOT NULL CHECK (attempts BETWEEN 1 AND 32)`,
   `actor_id uuid NOT NULL`, `flagged_at timestamptz NOT NULL DEFAULT clock_timestamp()`; same grant / RLS / guard-trigger
   posture as AC1; an index on `("pariwar_id","flagged_at")`.
3. **AC3 — the generator.** `generateAttributionCode()` returns a string matching `^[0-9]{6}$`, drawn with
   `node:crypto` `randomInt`, never a deny-listed value; ⛔ `Math.random` anywhere in the module (a unit test greps the
   module source). A unit test over 20,000 draws asserts: every draw matches the format, none is deny-listed, and at least
   one draw starts with `0` (leading zeros are reachable).
4. **AC4 — the allocator.** `allocateAttributionCode(db, { pariwarId, fieldWorkerId }, opts?)` runs in the caller's
   scoped transaction (⛔ opens none) and returns `{ attributionCodeId, code, allocatedAt, attempts }`. **And** per attempt
   it draws a candidate; a candidate failing the format or the deny-list (possible only from an injected `generate`) ⇒
   `InvalidAttributionCodeError` (⛔ surfaced as a raw 23514); it skips the candidate (counting the attempt) if it equals
   an `attribution_source` in `member_attribution` for the Pariwar (AT4), else inserts under a raw `SAVEPOINT`; a 23505 on
   `field_worker_attribution_codes_pariwar_code_uq` ⇒ `ROLLBACK TO SAVEPOINT` and redraw; a 23505 on
   `field_worker_attribution_codes_field_worker_uq` ⇒ `FieldWorkerAlreadyHasAttributionCodeError` (⛔ retry); any other
   error ⇒ rethrown. **And** after `maxAttempts` (default 8, override `1..32` else `RangeError`) without success ⇒
   `AttributionCodeAllocationExhaustedError { pariwarId, attempts }`. **And** it first asserts the scope equals
   `pariwarId` (as AC5).
5. **AC5 — the lookup.** `resolveAttribution(db, { code, pariwarId, asOf })` returns the holder's `FieldWorkerId` when
   the code is held in the Pariwar AND `date_trunc('milliseconds', allocated_at) <= asOf`; otherwise `null`. `asOf: Date`
   is REQUIRED (a missing or
   invalid `Date` ⇒ `TypeError`) and is documented as a DB instant — the capture's `member_attribution.captured_at`, or `clock_timestamp()` read in
   the same tx for a lookup tied to no capture — ⛔ an app-clock value (AT4 (c), I7).
   **And** a `code` not matching `^[0-9]{6}$` ⇒ `InvalidAttributionCodeError` (⛔ a query). **And** unset scope ⇒
   `PariwarScopeMissingError`; a non-UUID scope ⇒ `InvalidPariwarScopeError`; scope ≠ `pariwarId` ⇒
   `AttributionPariwarScopeMismatchError`. **And** the SQL filters on
   BOTH `pariwar_id` and `code`. **And** there is ⛔ any other exported function that reads by `code`.
6. **AC6 — the holder read.** `readAttributionCodeForFieldWorker(db, { pariwarId, fieldWorkerId })` returns `{ code,
   allocatedAt } | null` with the same scope assertion — the read 13.3's "my code" screen and 13.1 use instead of a
   column (AT2).
7. **AC7 — the flag.** `flagAllocationExhausted(db, { pariwarId, attempts, actorId })` inserts one flag row and returns
   its id; `listAllocationFlags(db, { pariwarId, limit? })` returns them ordered `flagged_at DESC, flag_id DESC`, the
   limit clamped with `clampLimit({ default, cap })` (the domain-accessor gate) — both with the scope assertion.
8. **AC8 — the CI proof the epic asks for** (live-DB, `packages/domain/tests/integration/attribution-code/*.spec.ts`):
   - same `(code, pariwarId)` resolves to the same field worker on every call (for any `asOf` ≥ its allocation);
   - **AT4 (c):** `asOf` = the allocator's RETURNED `allocatedAt` ⇒ the holder; `allocatedAt − 1 ms` ⇒ `null`; a
     `member_attribution` row seeded with a `captured_at` BEFORE the allocation, resolved with that `captured_at`, ⇒
     `null` (the sequencing guarantee, with no reliance on AT4 (a)); ⭐ and the POSITIVE leg — a row whose `captured_at`
     is set EXPLICITLY after the allocation (`clock_timestamp()`, ⛔ the column default — TR10), resolved with it, ⇒ the
     holder;
   - the SAME code seeded in `PARIWAR_A` (worker W1) and `PARIWAR_B` (worker W2) resolves to W1 under A and to W2 under
     B — and both INSERTs succeed (cross-Pariwar collision permitted, I1);
   - resolving A's code with `pariwarId = PARIWAR_B` while scoped to A ⇒ `AttributionPariwarScopeMismatchError`;
   - ⭐ **as the owner/superuser role (RLS BYPASSED)**, scope = A, the same code seeded in A (W1) and B (W2):
     `resolveAttribution(code, A)` returns W1, and the AT4 skip ignores B's `member_attribution` capture — the only test
     that fails if the explicit `pariwar_id` predicate is dropped (as `twt_app`, FORCE RLS hides B's row anyway);
   - a forced clash (`opts.generate` returns a held code, then a fresh one) ⇒ success on attempt 2, `attempts = 2`;
   - a generator that always returns a held code ⇒ `AttributionCodeAllocationExhaustedError` after exactly `maxAttempts`
     draws, and **the caller's transaction is still usable** afterwards (savepoints rolled back cleanly);
   - a candidate equal to a seeded `member_attribution.attribution_source` in the Pariwar is skipped (AT4); the same
     string seeded in ANOTHER Pariwar is ⛔ skipped;
   - a second allocation for the same worker ⇒ `FieldWorkerAlreadyHasAttributionCodeError`;
   - as `twt_app`: `UPDATE` and `DELETE` on both tables are refused; as the owner role the guard triggers refuse
     `UPDATE`, `DELETE` and `TRUNCATE`; a hand INSERT of `'123456'` or `'12345'` fails its CHECK;
   - the reach fence and the door are AC10;
   - **plus** a block in `cross-pariwar-leak.spec.ts` for each new table (G11) and an RLS policy-regression spec per
     table under `tests/integration/rls/`.
9. **AC9 — nothing else moves.** ⛔ No endpoint, ⛔ permission key, ⛔ `PERMISSION_CATALOG_VERSION` bump, ⛔ change to
   `member_attribution` (columns, grants, policies, ⛔ even an index) or the vyawastha-shulk confirm path, ⛔ event type,
   ⛔ env var, ⛔ mobile/admin UI, ⛔ edit to the `rbac/roles.ts` / `permissions.ts` "Epic 12" comments (G3), ⛔ change to
   `requireMemberSession`, `scopeResolutionHook` or `requestContextHook`. The ONE production file outside `packages/domain`:
   the API door `apps/api/src/modules/field-worker/attribution-code-access.ts` (AT8 v2 iii) — no route uses it yet.
   `pnpm ci:local` passes with `DATABASE_URL` set to the story's own DB port.
10. **AC10 — the API door and its gates (AT8 v2 iii–iv).** **Given** `attribution-code-access.ts`, **then** it exports
   EXACTLY the five request-bound wrappers and option keys pinned in AT8 v2 (iii), each reaching `request` only through
   the private `authenticatedScope(request)` (unset Pariwar — or unset actor for the flag wrapper — ⇒ loud 500), and
   ⛔ `generate` through the door; **and** `apps/api/tests/unit/attribution-code-reach-fence.test.ts` enforces (ii) the
   repo-wide reach fence (every `apps/*/src` + `packages/*/src`, incl. `.astro`; exact allow-list; floors), (iii) the
   positive door shape and (iv) the writer pin (exactly the two G9b sites, any receiver, plus the
   `Object.assign` / `.requestContext =` rules), TypeScript-AST, with every bite test listed in AT8 v2; **and**
   `apps/api/tests/integration/attribution-code-access.spec.ts` proves: A-request + A-tx ⇒ resolves; A-request + B-tx ⇒
   `AttributionPariwarScopeMismatchError`; no `requestContext.pariwarId` ⇒ 500; flag wrapper without `actorId` ⇒ 500; the
   flag wrapper's row survives the caller's rollback.

## Tasks / Subtasks

- [ ] **Task 0 — governance first (AC0).** ⭐ **0.1 runs FIRST in `bmad-dev-story`. Do NOT write code before 0.1 is done
  and its greps are in the Debug Log.**
  - [ ] 0.1 `git fetch origin`; rebase onto `origin/main` if it moved. Re-grep NUMBERS across main, every worktree and
    every branch (`git for-each-ref` + `git ls-tree … packages/domain/migrations/`): highest migration + journal `when`
    (take the next free number ≥ `0195`; ⚠ a later `when` on a sibling's migration makes drizzle skip the other on a
    shared DB — set this migration's `when` above every sibling's); newest decision id; `PERMISSION_CATALOG_VERSION`;
    newest ledger letter. **STOP** and report if: (S1) a `field_workers` table or `field-worker*` package has landed
    (AT2's FK may then be added here instead); (S2) `member_attribution` changed shape; (S3) any branch references `attributionCode` under
    `apps/*/src` or adds a third `requestContext.pariwarId` writer (the AT8 v2 gates would fail on rebase); (S4) a decision mentioning field workers or attribution has
    landed; (S5) member signup has gone live, or any record shows attribution codes handed out outside this registry.
  - [ ] 0.2 BigDev answers AT1–AT10 **and Q-S5** — *"Has any field-worker code been, or will any be, handed out by
    hand before Story 13.1 ships, and will member signup go live before 13.1?"* — verbatim into Debug Log (a).
    ✅ **Q-S5 ANSWERED 2026-11-01 (create-story pass), BigDev: *"Answer is no to both"*** — AT4 stands; dev re-confirms
    S5 at 0.1 only. ✅ **AT1–AT7, AT9, AT10 ANSWERED 2026-11-01, BigDev: *"AT1-AT10 as recommended, except AT8"*.**
    ⏳ **AT8 v2 and AT4 (c) — PROPOSED v1.3, awaiting BigDev** (both written in response to that same message). If any answer departs from ⭐, update the ACs and Tasks
    BEFORE coding ([[feedback_spec_edits_must_propagate_to_tasks]]).
  - [ ] 0.3 ⛔ No decision entry is needed (all AT decisions are author-level, §0). If BigDev asks for one, stage it in the
    scratchpad, insert above the newest `### Decision`, verify additive-only, and commit it ALONE before code
    ([[feedback_governance_commits_precede_implementation]]).
  - [ ] 0.4 Carry the seam where each sibling's author will read it (C1–C6) — BEFORE code:
    - `epics.md`: a dated block *"⭐ INHERITED FROM 13.2 (2026-11-01)"* directly under the AC of Story 13.1 (C1 + C2 in
      full, plus C6), 13.3 (C5), 13.4 (C3), 13.5 and 13.8 (C4). ⛔ Edit any epic's original AC text — the block sits under it
      ([[feedback_supersede_never_reinterpret]]). Each block says the obligation is HOMED there, ⛔ closed.
    - `deferred-work.md`: a `## Deferred from: story 13-2-6-digit-attribution-code-generation-per-pariwar` section
      carrying C1–C6, each with its trigger story.
    - ⭐ v1.1 note: the create-story pass has ALREADY written both (see the File List of that commit); 0.4 re-reads them
      against BigDev's 0.2 answers and amends if any answer moved a C item.
- [ ] **Task 1 — brands + errors (AC4, AC5).**
  - [ ] 1.1 `packages/domain/src/ids/index.ts`: `fieldWorkerId = uuidBrand('FieldWorkerId')`, `attributionCodeId`,
    `attributionCodeFlagId` (+ types), following the `MemberAttributionId` / `PariwarId` entries. ⚠ Branded ids are
    lower-case.
  - [ ] 1.2 `attribution-code/errors.ts`: `InvalidAttributionCodeError`, `AttributionPariwarScopeMismatchError`,
    `FieldWorkerAlreadyHasAttributionCodeError`, `AttributionCodeAllocationExhaustedError` (carries `pariwarId`,
    `attempts`). Reuse `PariwarScopeMissingError` and `InvalidPariwarScopeError` from `packages/domain/src/errors.ts`
    (⛔ `db.ts`; `assertPariwarScopeSet` takes a `pg.PoolClient`, so it is ⛔ usable on a `Db` — hence Task 5's helper).
- [ ] **Task 2 — schema + migration + RLS + guard (AC1, AC2).**
  - [ ] 2.1 `schema/field_worker_attribution_codes.ts`, `schema/attribution_code_allocation_flags.ts`; export from
    `schema/index.ts`.
  - [ ] 2.2 `policies/field-worker-attribution-codes-rls.ts`, `policies/attribution-code-allocation-flags-rls.ts`
    (SELECT + INSERT, `to: appRole`); export from `policies/index.ts`.
  - [ ] 2.3 Hand-write `NNNN_field-worker-attribution-codes.sql` in the 0178 statement order, with the 0192 guard +
    TRUNCATE triggers (G10); ⛔ `db:generate`. Header comment: the AT2 seam (*"13.1 adds the composite FK; ⛔ add a code
    column to field_workers"*). Deny-list
    CHECK as `code NOT IN (…)` with the 20 literals, in LOCKSTEP with the TS constant (a unit test compares them by
    reading the migration file).
  - [ ] 2.4 Journal entry; `pnpm db:check` / schema-diff green.
- [ ] **Task 3 — generator (AC3).** `attribution-code/code.ts`: `ATTRIBUTION_CODE_LENGTH = 6`,
  `ATTRIBUTION_CODE_PATTERN`, `ATTRIBUTION_CODE_DENYLIST` (frozen, 20 entries), `isDenylistedAttributionCode`,
  `generateAttributionCode()` (redraw while deny-listed). Unit tests in `packages/domain/tests/attribution-code/code.test.ts`.
- [ ] **Task 4 — allocator (AC4).** `attribution-code/allocate.ts`, shape of `telegram-opt-in/write.ts`
  `createPendingOptIn` (G5): raw `SAVEPOINT allocate_attribution_code`, constraint-name matching, `uniqueViolationConstraint`
  copied locally or lifted (⛔ match any 23505). The AT4 `EXISTS` read on `member_attribution` (`pariwar_id` + 
  `attribution_source`) per candidate. `ATTRIBUTION_CODE_MAX_ATTEMPTS = 8`; `opts.maxAttempts` range check.
- [ ] **Task 5 — lookup, holder read, flags (AC5, AC6, AC7).** `resolve.ts` (`resolveAttribution` with the required
  `asOf: Date` — invalid ⇒ `TypeError` — and the `date_trunc('milliseconds', allocated_at) <= $asOf` predicate in SQL,
  `readAttributionCodeForFieldWorker`), `flags.ts` (`flagAllocationExhausted`, `listAllocationFlags` with `clampLimit`).
  One private `assertScopeIs(db, pariwarId)` (reads `current_setting('app.pariwar_id', true)` via `db.execute`; empty ⇒
  `PariwarScopeMissingError`, non-UUID ⇒ `InvalidPariwarScopeError`, different ⇒ `AttributionPariwarScopeMismatchError`)
  used by every exported DB function. `index.ts` + `export * as attributionCode` in `packages/domain/src/index.ts`.
- [ ] **Task 6 — the proofs (AC8).**
  - [ ] 6.1 Live-DB specs (`tests/integration/attribution-code/allocate.spec.ts`, `resolve.spec.ts`, `flags.spec.ts`)
    with `setupLiveDb` / `getTx` / `enterAppScope`, `PARIWAR_A/B`. ⚠ Seed `member_attribution` rows with a real member
    (FK) — reuse an existing member-seed helper.
  - [ ] 6.2 `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` blocks + `tests/integration/rls/` regression
    specs for both tables.
  - [ ] 6.3 Unit: `tests/attribution-code/exports.test.ts` (pinned export list), deny-list ↔ migration lockstep test.
    (The v1.3 domain-only `boundary.test.ts` is FOLDED into the repo-wide reach fence, 6.4.)
  - [ ] 6.4 **The API door (AC10).** `apps/api/src/modules/field-worker/attribution-code-access.ts` (the five wrappers);
    `apps/api/tests/unit/attribution-code-reach-fence.test.ts` — modelled on `family-account-reach-fence.test.ts` (REACH /
    TREES / exact ALLOWED / comment-stripping / positive control), with TypeScript-AST for the door shape and the writer
    pin (reuse the parsing approach of `scripts/access-wrapper-invariants/lib.ts`, ⛔ import from `scripts/`); every bite
    test in AT8 v2; `apps/api/tests/integration/attribution-code-access.spec.ts` (live DB).
  - [ ] 6.5 RED proofs into Debug Log (b): break each guard once and record the failing test — drop the `pariwar_id`
    predicate (⇒ the owner-role AC8 leg fails); drop the as-of predicate (⇒ the AT4 (c) legs fail);
    remove the scope assertion (⇒ the A-request + B-tx leg fails); add a `UNIQUE("code")`; remove the TRUNCATE trigger;
    plant an importer in `apps/public/src/pages/*.astro` and a `schema.fieldWorkerAttributionCodes` read in `apps/api/src`;
    add a third `pariwarId` writer via an alias (`ctx.pariwarId = …`); forward `generate` through the door.
- [ ] **Task 7 — close.** `pnpm ci:local` with `DATABASE_URL` = the story DB port (⚠ the shell's `DATABASE_URL` points at
  `:5432`); File List; Change Log; row `ready-for-dev → in-progress → review` in `sprint-status.yaml` via the SAFE
  prepend.

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- **`member_attribution` + the confirm handler (G1, G2)** — READ-ONLY to this story. AT4 reads it; ⛔ change its
  columns, grants, RLS, or the SAVEPOINT capture. Its RTBF behaviour (kept on erasure, `member/anonymize.ts`) and the
  data-export section (`data-export/assemble.ts`) are untouched — ⚠ the export sections are strict-parsed: ⛔ add a key.
- **`rbac/roles.ts` `field_worker`** — stays `permissions: []`; its comments stay as they are (G3, AC9).
- **`requireMemberSession` / `scopeResolutionHook` / `requestContextHook`** — UNCHANGED; the writer pin (AT8 v2 iv) only
  reads them. A future change that adds a third `requestContext.pariwarId` writer fails CI by design and must be reviewed.
- **`apps/api/src/modules/field-worker/`** — NEW directory (architecture's home for the field-worker API), holding only the
  door file; 13.1 / 13.3 add their routes beside it.
- **`packages/domain/src/index.ts`** — gains one namespace export; existing exports unchanged.
- **Migrations** — one new file + journal line; ⛔ regenerate or edit an applied migration (42P07 on the shared DB).

### ⚠ Traps (TR)

- **TR1 — a nested `db.transaction()` inside the allocator commits the caller's tx early.** Use raw `SAVEPOINT` SQL (G5).
- **TR2 — "unique against active codes" read literally reopens reuse.** AT3: all codes, ever.
- **TR3 — RLS is not the Pariwar filter.** The owner/superuser role bypasses RLS, and a future `twt_service` grant (C4)
  would too; the explicit `pariwar_id` predicate and the scope assertion are what make I4 hold (AT8 v2 i) — and only the
  owner-role AC8 leg proves the predicate.
- **TR4 — a guard proves a Pariwar was AUTHENTICATED, ⛔ that the lookup USED it.** Member handlers open their own
  scoped tx (G9a); only the domain's scope-equality check (AT8 v2 i) ties the two. ⛔ "simplify" it away.
- **TR4a — a key-name list cannot find a lookup it has never seen.** Gate the call (the door), ⛔ the request shape.
- **TR4b — the door must not grow a `pariwarId` parameter "for jobs".** A request-less caller is a reviewed addition to
  the reach fence's ALLOWED list with its own named Pariwar source (C4), ⛔ an optional argument on the request door.
- **TR4c — the unauthenticated public server is a DB client too.** `apps/public` opens its own `twt_app` scope from config
  (`withPublicScope`). Any fence that skips `apps/public` — or `.astro` files — is not a fence (AT8 v2 ii).
- **TR5 — `\d` vs `[0-9]`.** JS `\d` without the `u` flag is ASCII; Postgres `~ '\d'` can match other digits under some
  locales — use `[0-9]` in SQL.
- **TR6 — the deny-list lives in two places (TS constant + SQL CHECK).** The lockstep test is the only thing keeping them
  equal.
- **TR7 — local superuser bypasses RLS.** Integration tests `SET LOCAL ROLE twt_app` (`enterAppScope`) before asserting
  policy behaviour; the guard-trigger test runs as the owner role on purpose.
- **TR8 — `pariwar_id` has no FK target** (G4) — ⛔ invent a `pariwars` table.
- **TR9 — the shell's `DATABASE_URL` is `:5432`.** Prefix every `ci:local` and `git push` with the story port.
- **TR10 — inside one transaction every default-seeded capture PREDATES every allocation.** `member_attribution.captured_at`
  is `DEFAULT now()` (tx start — schema `.defaultNow()`, migration 0027), and `setupLiveDb` runs each test in ONE
  rolled-back tx, so a capture seeded with the default always sorts before an allocation's `clock_timestamp()` and
  resolves to `null`. Set `captured_at` EXPLICITLY (`clock_timestamp()`) for the positive leg (AC8); 13.8's same-tx
  capture-then-resolve has the same trap.

### Carried to sibling stories (C) — HOMED (⛔ closed) in `deferred-work.md` and under each sibling in `epics.md` (Task 0.4)

- **C1 → 13.1.** `field_workers` carries ⛔ no code column; 13.1's migration adds the composite FK
  `(pariwar_id, field_worker_id)` on `field_worker_attribution_codes` (needs a `UNIQUE (pariwar_id, field_worker_id)` on
  `field_workers`), `ON DELETE NO ACTION` — a field worker is ⛔ never deleted while holding a code: erasure ANONYMIZES
  the `field_workers` row, and a `TRUNCATE field_workers CASCADE` will hit this story's TRUNCATE trigger. Registration
  calls `allocateAttributionCodeForRequest` (the API door) in the SAME tx as the worker insert; on
  `AttributionCodeAllocationExhaustedError` its catch calls `flagAllocationExhaustedForRequest` (which writes the flag in
  its own committed scope tx) and rethrows (the request tx belongs to `scopeResolutionHook`, G9a). The flag's `actor_id` is NOT NULL ⇒ a system / bulk registration
  path (none planned) would need a decision on whose id it records. The `field_worker.registered` payload may carry
  `attributionCodeId`. 13.1's `packages/field-worker-lifecycle` home should be re-weighed against
  [[feedback_no_premature_package]] (13.1's call).
- **C2 → 13.1 + the first attribution consumer (13.8 / signup wiring).** `resolveAttribution` returns the HOLDER (I6).
  FR-85 — *"new attributions on deactivated code rejected"* — is a check on 13.1's lifecycle state, made by whoever
  records an attribution, ⛔ by this lookup.
- **C3 → 13.4 (attribution analytics / trustee surface).** Render `listAllocationFlags` to trustees; until then a flag is
  recorded but ⛔ seen (expected frequency ≈ 0, AT6).
- **C4 → 13.5 / 13.8 (backfill of 3.6b captures).** A backfill resolves each `member_attribution` row with
  `asOf = captured_at` — the as-of rule (AT4 (c), I7) then credits ⛔ capture that predates its code, whatever the rollout
  order (with the AT4 (c) insert-vs-commit residual). A backfill JOB has no request: it needs (1) a `twt_service` grant
  on the codes table (none today) — under which the explicit `pariwar_id` predicate is the only Pariwar filter (TR3) —
  and (2) a REVIEWED entry in the reach fence's ALLOWED list naming its own Pariwar source (TR4b).
- **C5 → 13.3 (field-worker app).** FR-53's "my own code" reads `readAttributionCodeForRequest` (the API door) under
  `field_worker_self` scope; the permission key it needs is the Panel's to ratify (`-059` B(3)). Every route that touches a
  code — any shape, any key name — goes through the door (AT8 v2).
- **C6 → 13.1 (the one human premise left).** AT4 (c) makes signup-before-registry harmless; it cannot see a code handed
  out OUTSIDE the registry. 13.1's "Add Field Worker" is the ONLY issuer of codes: 13.1's Task 0 re-asks Q-S5's first
  half (*"has any code been handed out by hand?"*) before its registration flow goes live, and its runbook / UI copy
  never tells a field worker a code before the allocation commits.

### Testing standards

- Unit: `packages/domain/tests/**/*.test.ts`; live-DB: `packages/domain/tests/integration/**/*.spec.ts`, self-skipping on
  `!hasDatabase`, per-test rolled-back tx (`setupLiveDb`); API integration: `apps/api/tests/integration/`.
- Every guard gets a RED proof (Task 6.5). Every scan gets a non-vacuity floor.
- `pnpm ci:local` (`scripts/ci-local.sh`) with `DATABASE_URL` set; integration tests only run when it is.

### Project Structure Notes

- New: `packages/domain/src/attribution-code/{index,code,allocate,resolve,flags,errors}.ts`;
  `packages/domain/src/schema/{field_worker_attribution_codes,attribution_code_allocation_flags}.ts`;
  `packages/domain/src/policies/{field-worker-attribution-codes-rls,attribution-code-allocation-flags-rls}.ts`;
  `packages/domain/migrations/NNNN_field-worker-attribution-codes.sql`;
  `apps/api/src/modules/field-worker/attribution-code-access.ts`; tests as in Task 6.
- Modified: `packages/domain/src/{index,ids/index,schema/index,policies/index}.ts`; `migrations/meta/_journal.json`;
  `cross-pariwar-leak.spec.ts`;
  `sprint-status.yaml`. (`epics.md` and `deferred-work.md` were written by the create-story pass — Task 0.4.)
- Variance from the epic, with reason: link direction (AT2), uniqueness over all codes (AT3), no package (AT1), the
  required `asOf` on `resolveAttribution` (AT4 (c)), and the CI proof as a call gate rather than a route scan (AT8 v2).

### Latest tech information

- `crypto.randomInt([min, ]max)` (Node ≥ 14.10): uniform integer in `[min, max)`, `max - min < 2⁴⁸`, rejection-sampled —
  no modulo bias. ⛔ `Math.random`.
- PostgreSQL: a UNIQUE violation inside a savepoint leaves the outer tx usable after `ROLLBACK TO SAVEPOINT`; without the
  savepoint the whole tx is aborted (25P02 on the next statement).

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 13 (summary + body), Stories 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.8;
  Story 3.6.
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — §4.12; FR-53, FR-81–FR-87; glossary "attribution code".
- `_bmad-output/planning-artifacts/architecture.md` — §1.2 RLS; naming conventions; event naming; `apps/api/src/modules/field-worker/`.
- `_bmad-output/implementation-artifacts/3-6b-*.md` — D2 (Reference Code port seam).
- `.decision-log.md` — `2026-06-21-059` amendment B(3).
- Code: `packages/domain/src/schema/member_attribution.ts`; `packages/domain/src/payment/attribution-write.ts`;
  `apps/api/src/modules/vyawastha-shulk/handlers.ts` (confirm handler); `packages/contracts/src/payments/vyawastha-shulk.ts`;
  `packages/domain/src/telegram-opt-in/{code,write}.ts`; `apps/api/src/modules/auth/shared/otp.ts`;
  `packages/domain/src/db.ts`; `packages/domain/migrations/0178_member-wa-opt-in-codes.sql`;
  `packages/domain/src/policies/member-wa-opt-in-codes-rls.ts`; `apps/api/tests/unit/family-account-reach-fence.test.ts`
  (the reach-fence precedent, AT8 v2 ii); `apps/api/src/modules/auth/shared/member-session-guard.ts`;
  `apps/api/src/middleware/{scope-resolution,request-context}/index.ts`; `apps/public/src/lib/db.server.ts`;
  `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`;
  `packages/domain/src/rbac/roles.ts`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

(a) Task 0.2 answers, verbatim — **Q-S5** (2026-11-01, during create-story, asked as *"Has any field-worker code been, or
will any be, handed out by hand before Story 13.1 ships? Will member signup go live before 13.1?"*): BigDev — *"Answer
is no to both"*. **AT1–AT10** (2026-11-01): BigDev — *"AT1-AT10 as recommended, except AT8. I want you to come up with
better proposal for AT8. Also I want you to look into these / AT8 member-route rule contradicts G9a / AT8 route matching
can miss future lookup routes / AT4 needs a rollout sequencing guarantee"*. ⇒ AT1–AT7, AT9, AT10 ANSWERED as ⭐; AT8 v2
and AT4 (c) written in v1.3, ⏳ awaiting BigDev.

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-01 | 1.4 | Second fresh-context validation (of v1.3): 1 critical / 3 high / 4 medium / 6 low, all applied. AT8 v2 HARDENED — (ii) is now ONE repo-wide reach fence (every `apps/*/src` + `packages/*/src`, incl. `.astro`; REACH covers the namespace, paths, schema symbols, SQL table names and the domain function names; exact allow-list; precedent `family-account-reach-fence.test.ts`) — v1.3 missed the unauthenticated `apps/public` server and schema / raw-SQL / wrapper bypasses; (iii) door shape is POSITIVE (request reached only through `authenticatedScope`), names + option keys pinned, `opts` without `generate`, unset actor ⇒ 500; (iv) writer pin covers any receiver / element access / compound / destructuring, plus `Object.assign` and `.requestContext =` rules. AT4 (c) at MILLISECOND granularity (`date_trunc`), `asOf` is a DB instant (incl. `clock_timestamp()` for capture-less lookups), positive leg + TR10, insert-vs-commit residual stated. AC2 NARROWED note; I6/I7 order; AC9 wording; G9 marked historical; TR4c; carried blocks show `asOf`. Turbo-cache local-rerun limit noted. AT8 v2 and AT4 (c) still PROPOSED. |
| 2026-11-01 | 1.3 | BigDev: AT1–AT10 as recommended EXCEPT AT8, plus three findings. Both AT8 findings CONFIRMED in the code (G9a extended: member handlers open their own scoped tx; G9b added: exactly two `requestContext.pariwarId` writers). AT8 REPLACED by v2 — gate the call, not the route shape: domain door + domain boundary scan + ONE API door (`attribution-code-access.ts`) + a pin on the two authenticated-Pariwar writers; the route scan, Zod walker, pinned route list and `SCOPE_RESOLUTION_HOOK` marker are DROPPED. AT4 (c) ADDED — the rollout sequencing guarantee: required `asOf`, a code credits only captures at/after its allocation (I7). New AC10; AC5 / AC8 / AC9 / Tasks 5–6 / TR4–TR4b / C1 / C4 / C5 updated; C6 added. AT8 v2 and AT4 (c) PROPOSED. |
| 2026-11-01 | 1.2 | Q-S5 ANSWERED — BigDev: *"Answer is no to both"* (no hand-issued codes before 13.1; signup not live before 13.1). AT4's premise and the §0 gate now ESTABLISHED, ⛔ conditional; G2 and Task 0.2 updated; Debug Log (a) started. AT1–AT10 still pending. |
| 2026-11-01 | 1.1 | Fast-forwarded to `3d6b46c5` (12.1 landed). One fresh-context checker: 1 critical / 2 high / 7 medium / 11 low, all applied — AT8 (iii) route rule rewritten for admin `/p/:pariwarId` routes + `SCOPE_RESOLUTION_HOOK` marker + throwing walker + exact pin (two routes); Q-S5 / S5 and the §0 premise made conditional; owner-role leg that proves the `pariwar_id` predicate; 0192 append-only + TRUNCATE triggers; migration number left `NNNN` (0195 contended by 14-3 / 6-22); flag-in-a-separate-`openScopeTx`; the "Epic 12" comment edit DROPPED (Decision `2026-08-13-104`); C3–C5 also homed under 13.3 / 13.4 / 13.5 / 13.8; carried-item writes moved into Task 0.4; L-1…L-11. |
| 2026-11-01 | 1.0 | Created by `bmad-create-story 13.2` at `beae5116`; row backlog → ready-for-dev; AT1–AT10 PROPOSED. |
