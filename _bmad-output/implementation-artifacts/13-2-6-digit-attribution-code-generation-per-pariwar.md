---
baseline_commit: b7b43c47
---

<!--
PINNED: `b7b43c47` = `origin/main` (ledger 2026-11-02b — Story 6.22 landed; 11b.5a and 12.2 landed between `3d6b46c5`
and it). The story lives on branch `story/13-2-6-digit-attribution-code-generation-per-pariwar` in its OWN worktree
(`.claude/worktrees/13-2-6-digit-attribution-code-generation-per-pariwar`; fast-forwarded `4e57fa42` → `beae5116` →
`3d6b46c5`, then REBASED onto `b7b43c47` on 2026-11-03 — backup `backup/13-2-pre-rebase-2026-11-03`). Every `apps/` /
`packages/` / `scripts/` claim was traced at `beae5116`/`3d6b46c5` and RE-VERIFIED at `b7b43c47` by the v1.6 validation:
the `3d6b46c5..b7b43c47` delta (94 commits) touches none of this story's touch-points except additive lines in
`ids/index.ts`, `schema/index.ts`, `policies/index.ts`, `rbac/roles.ts` and `rbac/permissions.ts`. Perishable — re-check
at Task 0.1. Re-locate by FUNCTION, ⛔ by line.

STATUS: ready-for-dev (v1.7 — ALL build decisions ANSWERED; v1.7 records BigDev's approval of AT8 v2 + AT4 (c) as written in v1.6; created v1.0 by `bmad-create-story 13.2`, validated v1.1 by one fresh-context checker; v1.2 records Q-S5; v1.3 records AT1–AT10 and PROPOSES AT8 v2 + AT4 (c); v1.4 applies a second fresh-context validation of v1.3; v1.5 applies BigDev's eight focused items; v1.6 applies a THIRD validation (four read-only verifiers at `b7b43c47`, BigDev: *"apply all findings"*) — ⛔ a redesign).

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

NUMBERS (re-traced 2026-11-03 at `b7b43c47` across main + all 352 refs + every worktree — RE-GREP at Task 0.1 AND
again at the rebase-before-push):
- Migrations: main's highest is `0198_claim-fraud-step-ties-its-finding` (Story 6.22, LANDED; journal idx 198, `when`
  1796701200043); `0194` (11b.5a), `0195` (12.2) and `0196`–`0198` (6.22) have all LANDED; idx 140 is still the only
  journal gap. No ref or worktree holds a migration above `0198`. ⚠ `0199` is CONTENDED: `story/6-22b-…` plans its
  certificate-guard migration as the next free number (`0199` in its G16), `14-3` holds a `<MIG>` placeholder, `6-39`
  plans three. ⇒ this story's migration is written below as `NNNN_field-worker-attribution-codes.sql` — take the next
  free number ≥ `0199` at Task 0.1, re-check at rebase, and set its journal `when` ABOVE every sibling's (house step
  +86400001 ⇒ `1796787600044` if `0199` is still free; a lower `when` behind a higher one is skipped by drizzle on a
  shared DB).
- Decisions: main holds up to `2026-11-02-439` (`-431`/`-432` 11b.5a, `-433`–`-437` 12.2, `-438`/`-439` 6.22, all
  landed); `-440` is minted on `story/6-22b-…` (⛔ landed). ⇒ this story needs ⛔ no decision entry (Task 0.3); if one
  becomes necessary, take ≥ `-441` and re-grep. ⛔ decision `-431`…`-440` mentions field workers or attribution (the only
  "commission" is `-433`'s marketplace-partner commission).
- RBAC: `PERMISSION_CATALOG_VERSION = 58` (77 keys at `b7b43c47`; 57 = `module.manage`, 58 = the two claim-fraud keys)
  — ⛔ changed by this story. The `field_worker` bundle is still `permissions: []`.
- Ledger: main's newest is `2026-11-02b`; `story/6-22b-…` holds `2026-11-02c`/`-02d` (⛔ landed); ⛔ `2026-11-03*` line on
  any ref ⇒ this story's next entry is `2026-11-03a` (re-grep every worktree at each commit). ⚠ This branch's
  `2026-11-01c` and `-01e` are ALSO held by `story/14-3-…` (different content) — whichever of 13.2 / 14.3 lands second
  relabels. This branch's former `-01d` was RELABELLED `-01ad` at the 2026-11-03 rebase (`main` holds `-01d`, Story 6.22).
- Roster / ADR: none.

LETTERS: G = found facts · AT = build decisions · I = invariants · TR = traps · C = carried to a sibling story.
-->

# Story 13.2: 6-Digit Attribution Code Generation Per Pariwar — Pariwar-Scoped Uniqueness Invariant `[PRIMITIVE]`

Status: in-progress

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
| Migration | `NNNN_field-worker-attribution-codes.sql` (next free number ≥ `0199`, taken at Task 0.1 — NUMBERS) |
| Transaction guard (module-private) | `assertTxBoundScope(client, pariwarId)` in `attribution-code/tx-guard.ts` (Task 3a) |
| New brands | `FieldWorkerId`, `AttributionCodeId`, `AttributionCodeFlagId` (`packages/domain/src/ids/index.ts`) |
| Generator | `generateAttributionCode()` |
| Allocator | `allocateAttributionCode(client, { pariwarId, fieldWorkerId }, opts?)` — `client: pg.PoolClient` in a tx (AT8 v2 i) |
| Lookup | `resolveAttribution(client, { code, pariwarId, asOf: { captureId } \| 'now' }) → FieldWorkerId \| null` (AT4 (c)) |
| API door (the ONLY `apps/*` user of the module) | `apps/api/src/modules/field-worker/attribution-code-access.ts` (AT8 v2) — five wrappers + the six error classes re-exported by name |
| Holder read | `readAttributionCodeForFieldWorker(client, { pariwarId, fieldWorkerId })` |
| Flag write / read | `flagAllocationExhausted(client, { pariwarId, attempts, actorId, actorDisplay })` / `listAllocationFlags(client, { pariwarId, limit? })` |
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
  `0027_vyawastha-shulk-receipts.sql` grants `SELECT, INSERT` with RLS ENABLE + FORCE, a SELECT policy on `pariwar_id`
  and a PERMISSIVE `FOR ALL` write policy (`member_attribution_tenant_isolation_write`) on the same predicate — ⛔
  RESTRICTIVE or member-scoped policy (verified live in `pg_policies`), so the AT4 read and the `{ captureId }` join are
  permitted to ANY `twt_app` tx scoped to the Pariwar, admin or member. The policies live in the migration only (⛔ policy
  file). Captured codes have ⛔ `(pariwar_id, attribution_source)` index (only `(pariwar_id, member_id)`).
  `captured_at` is `DEFAULT now()` (tx start — ⛔ `clock_timestamp()`; verified live). Every row captured before this registry exists names a code that no
  field worker held — ⛔ code was handed out by hand outside this system (Q-S5, BigDev 2026-11-01: *"Answer is no to
  both"*; §0). Nothing is live (member signup has ⛔ gone live), so today the table holds no production rows.
- **G3 — there is no field-worker table, package, permission key or endpoint.** The RBAC role exists with nothing in it:
  `packages/domain/src/rbac/roles.ts` (`field_worker`: `permissions: []`, `scopeCeiling: 'self'`, comment *"Dispatch keys
  land Epic 12"*) and `packages/contracts/src/rbac/roles.ts`. ⚠ That "Epic 12" (and the `permissions.ts` catalog
  doc-block's *"`field_worker` is likewise DEFERRED to Epic 12"*, and the second `permissions.ts` comment beside
  `PERMISSION_CATALOG_VERSION`, *"`field_worker` grant deferred to Epic 12."* — THREE comments in all) records Decision `2026-08-13-104`'s open follow-up —
  *"`field_worker` ground inspection remains deferred to Epic 12"* — a deferral of ground-inspection DISPATCH, ⛔ of
  Epic 13's attribution. ⛔ Rewrite either comment ([[feedback_supersede_never_reinterpret]]). No `field-worker*` package
  exists.
- **G4 — there is no `pariwars` table.** `pariwar_id` is an unconstrained uuid everywhere; scope is `SET LOCAL
  app.pariwar_id` (`setPariwarScope` / `assertPariwarScopeSet` in `packages/domain/src/db.ts`; `openScopeTx` in
  `apps/api/src/modules/multi-tenant/scope-tx.ts`). v1 launches with ONE Pariwar (the `DEFAULT_SIGNUP_PARIWAR_ID` ENV var,
  read as `config.defaultSignupPariwarId` in `apps/api/src/config.ts` — ⛔ a constant), but the model and the test fixtures (`PARIWAR_A/B`, `packages/domain/tests/integration/_helpers.ts`)
  are multi-Pariwar.
- **G5 — the collision-retry precedent.** `packages/domain/src/telegram-opt-in/write.ts` (`createPendingOptIn`):
  `MAX_CODE_RETRIES = 5`; per attempt `SAVEPOINT` → insert → `RELEASE`, on error `ROLLBACK TO SAVEPOINT`, read the
  violated constraint via `uniqueViolationConstraint(err)` (walks drizzle's `.cause` chain), regenerate **only** on the
  code's own unique constraint, rethrow anything else; raw SAVEPOINT SQL because a nested `db.transaction()` commits the
  caller's tx early. ⚠ Match the **constraint name**, never any 23505 (review RP11 — the comment on
  `questionnaire-versions/write.ts` `isNumberingCollision`). An EXPORTED `uniqueViolationConstraint` now exists in
  `packages/domain/src/marketplace/errors.ts` (private copies in `telegram-opt-in/write.ts`, `wa-opt-in/write.ts`,
  `contribution/write.ts`) — import it rather than copy a fifth.
- **G6 — the randomness precedents.** `apps/api/src/modules/auth/shared/otp.ts` (`generateOtp`):
  `String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0')` — leading zeros kept. Domain generators use
  `node:crypto` (`randomBytes` + rejection sampling, `telegram-opt-in/code.ts`); ⛔ `Math.random` anywhere.
- **G7 — no generic "flag for trustee review" primitive exists.** `packages/domain/src/alert/` is the donation-alert
  lifecycle (cycle-bound); helpdesk tickets can be system-origin (`helpdesk/project.ts`, `projectTicketGenesis`, `actor:
  'system'`) but need a subject, a category and a routing-policy version; audit lines are counters, ⛔ a queue.
  Purpose-built review queues are the house pattern (`reconciliation/reconciliation-review-read.ts`, `memorial/review.ts`).
- **G8 — no generic config store.** Thresholds are domain constants (`WA_OPT_IN_CODE_MAX_SENDS`, `MAX_CODE_RETRIES`) or
  API env via the private `intEnv` / `positiveIntEnv` helpers (`apps/api/src/config.ts`) passed through `deps.config`.
  ⚠ `intEnv` accepts 0 and fractions; `positiveIntEnv` is the one a retry count wants.
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
  initialises the context as `{ traceId }` — ⛔ Pariwar. (grep of `apps/api/src` at `3d6b46c5`, re-verified at
  `b7b43c47`: exactly `scope-resolution/index.ts` `request.requestContext.pariwarId = pariwarId` and
  `member-session-guard.ts`; ⛔ `Object.assign` / `Reflect.set` / `Object.defineProperty` / `enterWith` on a context;
  the ONLY `.requestContext =` is in `request-context/index.ts`; `getRequestContext()` exists there. The 72
  `{ … pariwarId … } =` patterns in 21 `apps/api/src` files are all `const`/`let` DECLARATIONS binding a local — ⛔ writers.) ⇒ `requestContext.pariwarId`,
  when set, is ALWAYS an authenticated Pariwar — the fact AT8 v2 builds on.
- **G10 — the migration house style.** STATEMENT ORDER from `0178_member-wa-opt-in-codes.sql`: header "never
  regenerate"; referenced-UNIQUE → CREATE → FK → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes → trigger; every
  statement ends `--> statement-breakpoint`; `DEFAULT clock_timestamp()`; per-command policies `TO "twt_app"` with
  `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`, ⛔ `FOR ALL`; ⛔ DELETE granted. ⚠ 0178's guard
  is `BEFORE UPDATE` only (it grants a column UPDATE) — the APPEND-ONLY precedent is
  `0192_questionnaire-versions.sql` (`questionnaire_chain_reject_mutation()`, `BEFORE UPDATE OR DELETE … FOR EACH ROW`
  **plus** a `BEFORE TRUNCATE` statement trigger; also `0188_degraded-bridge-sms.sql`, which ALSO carries a `BEFORE
  INSERT … _stamp` trigger setting `NEW.changed_at := clock_timestamp()` — *"the DB's clock, ⛔ the writer's"* — the
  precedent for AC1's stamp trigger, v1.6). Drizzle policies in `packages/domain/src/policies/<table>-rls.ts`
  (`pgPolicy(...).link(table)`, `to: appRole`); both exported from `schema/index.ts` / `policies/index.ts`. Journal:
  `packages/domain/migrations/meta/_journal.json` (idx 140 is a pre-existing gap).
- **G11 — the cross-Pariwar leak suite.** `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` has
  a block per tenant table (e.g. `member_wa_opt_in_codes`); a new tenant table adds a block.

## ⚖️ Build decisions AT1–AT10 (⭐ = recommended) — ALL ANSWERED (AT1–AT7, AT9, AT10 on 2026-11-01; AT8 v2 + AT4 (c) on 2026-11-03, as written in v1.6)

- **AT1 — Home.** ⭐ `packages/domain/src/attribution-code/` (`index.ts`, `code.ts`, `allocate.ts`, `resolve.ts`,
  `flags.ts`, `errors.ts`, `tx-guard.ts` — `assertTxBoundScope` is exported from `tx-guard.ts` for the module's own files
  and ⛔ re-exported from `index.ts`), re-exported as `export * as attributionCode` from `packages/domain/src/index.ts`.
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
  - **AT4 (c) — the ROLLOUT SEQUENCING GUARANTEE (v1.3; v1.5 — the comparison never leaves the database; ✅ APPROVED
    2026-11-03 as written in v1.6, BigDev: *"both design approved."*).** AT4 (a)
    alone rests on a promise about ORDER (signup ⛔ live before 13.1; Q-S5). ⭐ Make correctness independent of rollout
    order: **a code credits its holder only for a capture made AT OR AFTER the code was allocated.**
    - **The instant is named, ⛔ passed.** `resolveAttribution` takes a REQUIRED `asOf` that is one of exactly two forms:
      `{ captureId: MemberAttributionId }` — the comparison instant is that `member_attribution` row's persisted
      `captured_at`, read IN THE SAME SQL STATEMENT (the row must be in the same Pariwar and its `attribution_source`
      must equal `code`, else `AttributionCaptureMismatchError`) — or `'now'` — the comparison instant is
      `clock_timestamp()` evaluated in that statement (a lookup tied to no capture, e.g. an admin "who holds code X
      now?"). The predicate is `fwac.allocated_at <= ma.captured_at` (or `<= clock_timestamp()`), both `timestamptz`.
    - **Why (v1.5, BigDev item 5):** v1.4 truncated `allocated_at` to milliseconds to compare against a JS `Date`. That
      credited a capture made up to ~1 ms BEFORE the code existed — a false positive. Postgres stores both columns at
      MICROSECOND precision; a JS `Date` holds milliseconds (`new Date('… 12:00:00.123999+00')` → `.123Z`). ⇒ ⛔ JS
      timestamp is ever an input to the comparison: the instant stays in the database, and the comparison is exact at
      the precision Postgres keeps (I7). ⛔ `date_trunc`, ⛔ `asOf: Date`.
    - **Who stamps `allocated_at` (v1.6).** A `BEFORE INSERT` stamp trigger sets `NEW.allocated_at :=
      clock_timestamp()` whatever the writer supplied (the `0188` precedent, G10) — so ⛔ `twt_app` INSERT can BACKDATE a
      code and defeat this rule; the reach fence is ⛔ the only guard. (`captured_at` on `member_attribution` is 3.6b's,
      ⛔ touched — AC9.)
    - **Consumers (v1.5, BigDev item 6):** signup (13.8) INSERTs the `member_attribution` row, takes its returned
      `attributionId` (the `MemberAttributionRow` field; column `attribution_id`), and resolves with `{ captureId }` in the same tx; a backfill (C4) resolves each row with its own
      `{ captureId }`. Neither ever reads `captured_at` into JS. (The 3.6b capture write `insertMemberAttribution`
      already returns the row; 13.8 reads its id from it.)
    - signup going live before 13.1 becomes HARMLESS — every pre-registry capture predates every allocation, so it
      credits ⛔ one, whatever the order of deploys, and whether or not AT4 (a) caught it;
    - ⚠ RESIDUAL (unchanged): `allocated_at` is the insert-time clock, ⛔ the commit time, and `captured_at` is the
      capture tx's START (`DEFAULT now()`), so a capture whose tx starts between the allocator's INSERT and the
      registration COMMIT is credited though the code was visible to no one yet (and AT4 (a)'s `EXISTS` missed it too) —
      odds ≈ 10⁻⁶ per capture × a milliseconds-wide window; accepted, ⛔ engineered away;
    - What it does ⛔ cover: a code handed out by hand OUTSIDE the registry (Q-S5's first half). No software can see a
      code that was never issued; that premise is carried to 13.1, whose registration flow is the only issuer (C6).
    - ⛔ (d) a per-Pariwar "registry opened at" marker — the same rule with one more table and a write to keep in step.
    - ⛔ (e) a launch-roster row — the roster's rows need ≥ 2-trustee ratification (`docs/launch-gate-inventory/`) for
      what (c) makes mechanical; C6 carries the one human premise left.
    - ⛔ (f) `asOf` as a µs-precise timestamp STRING — works, but every consumer must remember to read `captured_at` as
      text and never through a `Date`; naming the capture removes the chance to get it wrong.
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
  registration handler) may wire it from `deps.config` via `positiveIntEnv` (⛔ `intEnv`, which accepts 0 and fractions; the
  domain's `1..32` check is the backstop) — ⛔ this story adds no env var. Arithmetic: with *N*
  codes in a Pariwar a draw clashes with probability ≈ *N*/10⁶; at *N* = 10,000 eight straight clashes ≈ 10⁻¹⁶. ⇒
  "permanent unallocation" is reachable only by a broken generator or an exhausted space — exactly what a flag is for.
  - ⛔ (b) a per-Pariwar config table — a store with no second key in it.
- **AT7 — "Flagged for trustee review".** ⭐ (a) exhaustion throws `AttributionCodeAllocationExhaustedError { pariwarId,
  attempts }`, and a **durable, append-only flag row** in `attribution_code_allocation_flags` (`flag_id`, `pariwar_id`,
  `attempts`, `actor_id` — the admin who pressed "Add Field Worker" — `actor_display` and `flagged_at`) is written by
  `flagAllocationExhausted(client, …)`. ⭐ `actor_display` (v1.6) is the Story 6.11 R5 snapshot of that admin's
  `users.display_name`, resolved SERVER-SIDE at write time by the door (`getDisplayName`,
  `apps/api/src/modules/auth/admin/admin-auth.repo.ts`) — the house rule for every admin-attribution surface (precedent
  `0192`'s `authored_by_display` / `actor_display`): a missing / empty name ⇒ `AdminDisplayNameMissingError`
  (`apps/api/src/http-errors.ts`, 409), ⛔ fallback to the email, the UUID, a role label or client input. The table is
  append-only, so a display column added later could never be backfilled — it is in from the start. C3's trustee
  surface renders `actor_display`, ⛔ a raw actor id. A flag written inside the failing tx would roll back with it, and on an admin
  `/p/:pariwarId` route the handler does ⛔ own that tx (G9a) ⇒ the flag is written in a SEPARATE
  `openScopeTx(deps, pariwarId)` that commits independently — built into the API door's
  `flagAllocationExhaustedForRequest` (AT8 v2 iii); the caller calls it in its catch, then rethrows (C1). `listAllocationFlags(client, { pariwarId, limit? })` is the read the trustee surface renders (C3). ⛔ No `field_worker_id` on the flag: the registration that failed rolled back,
  so that id names nothing.
  - ⛔ (b) a system-origin helpdesk ticket — needs a subject, a new category and a routing-policy version bump (G7) for
    a ~10⁻¹⁶ event.
  - ⛔ (c) an audit line only — a counter, ⛔ a review item: it does not meet "flagged for trustee review".
- **AT8 v2 — "No API endpoint allows attribution-code lookup without Pariwar context" (v1.3; ✅ APPROVED 2026-11-03 as written in v1.6 — BigDev:
  *"AT1-AT10 as recommended, except AT8. I want you to come up with better proposal for AT8"*; then *"both design approved."*).**
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
    - **(i) the domain door — on ONE transaction-bound connection (v1.5, BigDev item 1).** Every exported DB function
      of the module takes `client: pg.PoolClient` — a single checked-out connection — ⛔ a Drizzle `Db` (which may be
      pool-bound: `createDb().db` and `bindScopedDb(client)` are the same `Db` type, so the type cannot tell them apart,
      and on a pool each statement may run on a DIFFERENT connection — the scope assertion on one, the query on
      another). House precedent: `helpdesk/project.ts` `projectTicketGenesis(client: pg.PoolClient, …)`, which binds
      Drizzle internally with `bindScopedDb(client)`.
      **ORDER inside every exported function (v1.6):** (0) PURE argument checks, with ⛔ statement sent — `code` format ⇒
      `InvalidAttributionCodeError`; `asOf` shape ⇒ `TypeError`; `maxAttempts` ⇒ `RangeError`; then (1) the private
      `assertTxBoundScope(client, pariwarId)`; then (2) the module's own SQL. "⛔ a query" anywhere in this story means ⛔
      statement is sent at all. `assertTxBoundScope`:
      1. rejects a `pg.Pool` (or anything without a `release` function) ⇒ `AttributionCodeRequiresTransactionError` —
         the runtime backstop to the type. DUCK-TYPED: `typeof (client as { release?: unknown }).release !== 'function'`;
         ⛔ `instanceof pg.Pool` (a VALUE import of `pg` is lint-banned outside `**/db.ts`, test-utils and tests —
         `packages/eslint-config-twt/index.js`, `allowTypeImports: true`; `import type pg` is fine);
      2. proves the connection is INSIDE a transaction block: `SAVEPOINT attribution_code_tx_guard` then `RELEASE
         SAVEPOINT attribution_code_tx_guard` — outside a transaction Postgres raises `25P01` ("SAVEPOINT can only be
         used in transaction blocks", verified live) ⇒ `AttributionCodeRequiresTransactionError`. ONLY `25P01` is mapped;
         any other probe error (e.g. `25P02` — the caller's tx is already aborted) is RETHROWN unchanged. So a
         session-level `SET app.pariwar_id` on a pooled connection cannot satisfy the check OUTSIDE a transaction;
         inside one, the residual is a leaked session-level value under a `BEGIN` with no `SET LOCAL` — ⛔ writer of a
         session-level `app.pariwar_id` exists in `apps/*/src` or `packages/*/src` today (grep at `b7b43c47`);
      3. REUSES `assertPariwarScopeSet(client)` (`packages/domain/src/db.ts` — reads `current_setting('app.pariwar_id',
         true)` on THAT client: unset ⇒ `PariwarScopeMissingError`; non-UUID ⇒ `InvalidPariwarScopeError`; returns the
         value) — ⛔ re-implement it — then compares lower-cased: `scoped.toLowerCase() !== pariwarId.toLowerCase()` ⇒
         `AttributionPariwarScopeMismatchError` (`setPariwarScope` and `uuidBrand` lower-case, but a raw-string cast
         could differ).
      Every subsequent statement runs on the same `client` (Drizzle via `bindScopedDb(client)`, raw SQL via
      `client.query`). ⇒ the scope assertion and the query use the same connection BY CONSTRUCTION. The lookup
      filters `WHERE "pariwar_id" = $1 AND "code" = $2` explicitly. `resolveAttribution` is the only export keyed by
      `code`; pinned export list.
    - **(ii) ONE REACH FENCE over the whole repo** (replaces v1.3's separate domain boundary scan and door-only scan —
      both were too narrow: v1.3 missed `apps/public`, an UNAUTHENTICATED server that sets its scope from config
      (`apps/public/src/lib/db.server.ts` `withPublicScope` → `setPariwarScope(client, ACTIVE_PARIWAR_ID)`, importing
      `@twt/domain` from `.ts` and `.astro` files), and could be bypassed through `schema.fieldWorkerAttributionCodes`,
      raw SQL, or a wrapper in another package / domain module). House precedent: `apps/api/tests/unit/family-account-reach-fence.test.ts`
      (one REACH pattern, scanned TREES, an EXACT allow-list, comments stripped, a planted-importer positive control —
      its header records the same lesson: *"the first version scanned `apps/api/src` alone"*).
      - **REACH (v1.6 — matched on AST NODES and WHOLE identifiers, ⛔ substrings):**
        - any `Identifier` node whose text is EXACTLY `attributionCode`, wherever it appears — import / export
          specifier (name or `propertyName`), property access, `QualifiedName` (incl. an `ImportTypeNode` qualifier such
          as `import('@twt/domain').attributionCode.X`, and a `typeof` query), binding-element name or `propertyName`
          (`const { attributionCode } = await import(…)` / `= require(…)`), shorthand property;
        - any string-literal element-access argument `'attributionCode'` (`d['attributionCode']`);
        - an `export * from '@twt/domain'` / `export * as X from '@twt/domain'` in any file outside ALLOWED (a barrel
          that would re-export the namespace without naming it — ⛔ such file exists today);
        - any module-specifier string (static import / export, dynamic `import()`, `require()`) containing
          `attribution-code` — ⭐ EXCEPT one that resolves to the API door `apps/api/src/modules/field-worker/attribution-code-access.ts`:
          the door is the sanctioned entry, so ITS importers (13.1 / 13.3 / 13.8 routes) are ⛔ in REACH;
        - the WHOLE identifiers or string / template-literal text `fieldWorkerAttributionCodes`,
          `attributionCodeAllocationFlags`, `field_worker_attribution_codes`, `attribution_code_allocation_flags`, and
          the domain function names `resolveAttribution`, `allocateAttributionCode`, `readAttributionCodeForFieldWorker`,
          `flagAllocationExhausted`, `listAllocationFlags` — matched as `\b<name>\b`, so the door's
          `resolveAttributionForRequest` and `ids/index.ts`'s `attributionCodeId` do ⛔ match.
        - ⚠ Consequence for siblings: a wire / DTO field must ⛔ be named `attributionCode` (use `referenceCode` /
          `code`) — the fence fires on the NAME; renaming the field is cheaper than a reviewed fence edit (C2 / C5).
      - **TREES:** every `apps/*/src` and every `packages/*/src` — enumerated from the workspace directories at run time
        (⛔ a hard-coded list), files `.ts`, `.tsx`, `.mts`, `.js`, `.astro`, INCLUDING `.d.ts`. ⚠ The walker descends
        into DOT-directories — `apps/public/src/pages/.well-known/*.ts` are live UNAUTHENTICATED endpoints — and skips
        ONLY `node_modules`; ⛔ copy `scripts/access-wrapper-invariants/check.ts` `collectTsFiles`' dot-entry skip.
      - **ALLOWED — two lists (v1.6):** (a) `MODULE_DIR = 'packages/domain/src/attribution-code/'`, a PATH PREFIX exempt
        from the REACH scan AND from the staleness check (`code.ts`, `errors.ts`, `tx-guard.ts` name nothing in REACH, so
        an exact two-way `toEqual` over them — the precedent's assertion — would go red on write); (b) the EXACT files,
        each of which must exist and match REACH (a stale entry fails): the two schema files and `schema/index.ts`; the
        two policy files and `policies/index.ts`; `packages/domain/src/index.ts` (the namespace export); and the API door
        `apps/api/src/modules/field-worker/attribution-code-access.ts`. Inside `packages/domain/src`, ⛔ other module may
        import `../attribution-code/` (that would be a second door).
      - **Positive controls:** a planted importer in `apps/public/src/pages/*.astro`, one under
        `apps/public/src/pages/.well-known/` (v1.6), one in `packages/validity-service/src`, a
        `schema.fieldWorkerAttributionCodes` read, a raw-SQL `field_worker_attribution_codes`, a `../attribution-code/`
        import from another domain module, and a planted `instanceof attributionCode.AttributionCodeAllocationExhaustedError`
        in a non-door file — each caught; a COMMENTED mention ⛔. **Negative controls (v1.6):** a planted
        `apps/api/src/modules/field-worker/planted.routes.ts` importing `{ resolveAttributionForRequest,
        AttributionCodeAllocationExhaustedError } from './attribution-code-access.js'` ⛔ flagged; `ids/index.ts`'s
        `attributionCodeId` ⛔ flagged; `const { pariwarId } = request.requestContext` ⛔ flagged by (iv).
      - **Synthetic bite tests for the supported import forms (v1.5, BigDev item 4)** — each a planted source the fence
        must flag: `import { attributionCode as ac } from '@twt/domain'`; `import * as d from '@twt/domain'; d.attributionCode`;
        `d['attributionCode']`; `type T = import('@twt/domain').attributionCode.X` (the repo already uses
        `import('@twt/domain').<ns>` type expressions, e.g. `apps/api/src/types.ts`); `const { attributionCode } = await
        import('@twt/domain')`; `(await import('@twt/domain')).attributionCode`; `require('@twt/domain').attributionCode`;
        `const { attributionCode } = require('@twt/domain')`; `await import('../attribution-code/resolve.js')` and
        `require('…/attribution-code/…')`; an INTERMEDIATE re-export — file A `export { attributionCode as ac } from
        '@twt/domain'` (A flagged) and file B `export * from '@twt/domain'` (B flagged) and file C `import { attributionCode }
        from './b.js'` (C flagged); plus the earlier controls. Negative controls: a comment, a string in an unrelated
        error message that is ⛔ an import, and an ALLOWED file — ⛔ flagged.
      - **Floor and the RECORDED scan count (re-recorded v1.6):** at `b7b43c47` the TREES hold **1,829** files of the
        scanned extensions — `packages/domain/src` 743, `apps/api/src` 379, `apps/admin/src` 225, `packages/contracts/src`
        220, `apps/jobs/src` 72, `apps/public/src` 41, `packages/channels/src` 36, `packages/ui/src` 31,
        `packages/platform-adapters/src` 23, `packages/validity-service/src` 14, `packages/niyamavali-engine/src` 12,
        `packages/i18n/src` 8, `packages/bank-parsers/src` 6, `packages/measured-validation/src` 6, `packages/events/src` 5,
        `packages/tokens/src` 3, `packages/api-client/src` 2, `packages/edge/src` 2, `packages/queue/src` 1 — counted by
        `find apps/*/src packages/*/src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.mts' -o -name '*.js' -o -name
        '*.astro' \) -not -path '*/node_modules/*'`, ⛔ other exclusion (`apps/mobile` and `packages/eslint-config-twt` have
        ⛔ `src/`; mobile ships ⛔ `pg`, the existing Metro boundary). ⚠ v1.5's 1,785 at `3d6b46c5` had silently left out
        2 `.d.ts` files and the 2 `.well-known` routes (the literal count at that pin was 1,789) — the reason TREES now
        says "dot-directories included". The fence asserts ≥ **1,600** files scanned and ≥ **19** trees found, and prints
        the count; the dev re-records both numbers at Task 0.1 and in the Debug Log.
        Every ALLOWED file must exist and match REACH (a stale allow-list entry fails).
      - The AT9 rule rides here too: ⛔ file outside `packages/domain/src/attribution-code/` and test trees passes `generate`.
    - **(iii) the API door** — `apps/api/src/modules/field-worker/attribution-code-access.ts`, exporting EXACTLY these five
      wrappers with EXACTLY these option keys (pinned by name and key) **plus (v1.6) the module's six error classes
      re-exported BY NAME** — `InvalidAttributionCodeError`, `AttributionPariwarScopeMismatchError`,
      `FieldWorkerAlreadyHasAttributionCodeError`, `AttributionCodeAllocationExhaustedError`,
      `AttributionCodeRequiresTransactionError`, `AttributionCaptureMismatchError` — so a caller can `instanceof` them (the
      house pattern: 55 `instanceof <ns>.<X>Error` sites in `apps/api/src/modules/*/handlers.ts`), read `.attempts`, and
      map them to HTTP statuses WITHOUT naming `attributionCode` (which the fence forbids). The export pin is exactly
      those ELEVEN names; ⛔ other export:
      `resolveAttributionForRequest(request, scopeTx, { code, asOf })`, `readAttributionCodeForRequest(request, scopeTx,
      { fieldWorkerId })`, `allocateAttributionCodeForRequest(request, scopeTx, { fieldWorkerId }, opts?: { maxAttempts?:
      number })` (⛔ `generate` — AT9), `listAllocationFlagsForRequest(request, scopeTx, { limit? })`, and
      `flagAllocationExhaustedForRequest(deps, request, { attempts })` (opens and commits its OWN
      `openScopeTx(deps, <request's Pariwar>)` — the C1 separate-tx rule, built in — and resolves the actor's
      `actor_display` with `getDisplayName(deps.pool, actorId)` BEFORE opening it; ⛔ name ⇒ `AdminDisplayNameMissingError`,
      ⛔ fallback, ⛔ flag row (AT7, Story 6.11 R5)).
      - **Transaction-bound through every wrapper (v1.5, BigDev item 2).** The four wrappers that run in the caller's
        transaction take `scopeTx: ScopeTx` (the interface in `apps/api/src/types.ts` — `{ client, tx, pariwarId,
        scopeSet, closed? }`; ⚠ `scope-tx.ts` only `import type`s it and does ⛔ re-export it, so import the type from
        `types.ts`; opened by `openScopeTx(deps: AppDeps, pariwarId: string)` / closed by `closeScopeTx(scopeTx, commit:
        boolean)` in `apps/api/src/modules/multi-tenant/scope-tx.ts`: BEGIN → `SET LOCAL ROLE twt_app` → scope) — ⛔ a bare `Db`, ⛔ a `pg.Pool`, ⛔
        `deps.db` — and pass `scopeTx.client` to the domain. Admin routes pass `request.scopeTx` (opened by
        `scopeResolutionHook`); member handlers pass the `ScopeTx` they opened. Each wrapper first checks
        `scopeTx.pariwarId === <the authenticated Pariwar>` (else `AttributionPariwarScopeMismatchError`, before any SQL)
        and the domain re-proves it on the connection (AT8 v2 i). The fifth, `flagAllocationExhaustedForRequest`, owns
        its transaction end to end (open → write → `closeScopeTx(…, true)`; on error `closeScopeTx(…, false)`), so it
        takes no transaction from the caller. The door-shape gate pins these parameter types.
      - **Authorization is the CALLER's, ⛔ the door's (v1.5, BigDev item 3).** The door guarantees Pariwar CONTEXT — that
        a lookup or allocation is confined to the authenticated Pariwar — and nothing more: it checks ⛔ permission.
        ⇒ the future registration route (13.1, "Add Field Worker") owns authorization: `requireAdminSession` →
        `scopeResolutionHook` → `requirePermissionHook(<the field-worker key, Panel-ratified under `2026-06-21-059`
        amendment B(3)>)` BEFORE it calls `allocateAttributionCodeForRequest` or `flagAllocationExhaustedForRequest`;
        likewise 13.3 / 13.4 / 13.8 for their reads (C1, C3, C5, C2). The FLAG records ONLY the authenticated actor:
        `flagAllocationExhaustedForRequest` takes ⛔ actor option (the pinned option keys are `{ attempts }` only) and
        passes `requestContext.actorId` — set by `requireAdminSession` / `requireMemberSession` — as the domain's
        `actorId`; the domain function `flagAllocationExhausted` is reachable only through the door (the reach fence), so
        ⛔ caller can supply a different actor. Unset actor ⇒ the loud 500. The `actor_display` snapshot is resolved the
        same way, server-side from that actor id (⛔ caller input); an actor with no `users.display_name` (incl. a member
        id — the flag is an ADMIN path) ⇒ `AdminDisplayNameMissingError`.
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
      — or a destructuring assignment EXPRESSION whose target pattern writes a PROPERTY ACCESS named `pariwarId`
      (`({ pariwarId: ctx.pariwarId } = o)`), is EXACTLY
      `{ modules/auth/shared/member-session-guard.ts, middleware/scope-resolution/index.ts }` (G9b; two today, so the pin
      is non-vacuous, and ⛔ fewer than two passes). ⚠ Variable DECLARATIONS (`const { pariwarId } = …`) and a shorthand
      `({ pariwarId } = o)` write a LOCAL and do ⛔ count — `apps/api/src` holds 72 such declarations in 21 files today,
      so a rule that flags any binding pattern containing `pariwarId` is red on day one. Also: ⛔ `Object.assign` / `Reflect.set` / `Object.defineProperty`
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
    with the same REACH matching after comment-stripping — the precedent's approach). ⚠ Like the precedent, it reads other
    workspaces. `test` `dependsOn: ["^build"]` and `@twt/domain` / `@twt/contracts` have `build` scripts, so a change in an
    UPSTREAM dependency does re-run `@twt/api#test`; but a change ONLY in a non-dependency workspace (`apps/public`,
    `apps/admin`, `apps/jobs`, most `packages/*`) is skipped by turbo's local cache. GitHub CI has no turbo cache and is
    the backstop. ⛔ add turbo `inputs` in this story.
  - **Bite tests** (synthetic sources, unit): for (ii) — each positive control above, an alias import, `domain.attributionCode`,
    a re-export, a path import, a `.well-known` importer, the `ImportTypeNode` / binding-element forms (v1.6); for (iii)
    — an extra export beyond the eleven pinned names, a `pariwarId` param, a `pariwar` option key, a `request.body` read, a
    `request['body']` read, `const { body } = request`, `request` passed to a helper, `getRequestContext()`, a forwarded
    `generate`; for (iv) — a third writer via `ctx.pariwarId = …`, `getRequestContext()!.pariwarId = …`,
    `x['pariwarId'] = …`, `??=`, `Object.assign(request.requestContext, { pariwarId })`, `({ pariwarId: ctx.pariwarId } = o)`,
    and `request.requestContext = { …ctx, pariwarId }` outside `request-context/index.ts`.
  - **The runtime proof (live-DB, `apps/api/tests/integration/attribution-code-access.spec.ts`):** a fake request with
    `requestContext.pariwarId = A` and a tx scoped to A resolves A's holder; the same request with a tx scoped to B ⇒
    `AttributionPariwarScopeMismatchError` (the G9a gap, caught); `requestContext` without `pariwarId` ⇒ the loud 500;
    the flag wrapper without `actorId` ⇒ the loud 500; the flag wrapper for an admin with no display name ⇒
    `AdminDisplayNameMissingError` and ⛔ row; the flag wrapper's row survives the caller's rollback (⚠ a COMMITTED,
    append-only row on the shared DB — use a fresh `randomUUID()` Pariwar for that leg and assert by the returned
    `flag_id`, ⛔ by count; see Testing standards).
  - **Cost:** one small API file with no route caller yet (13.1 / 13.3 / 13.8 are its callers — C1, C5, C2) and one
    static test file. ⛔ Middleware change, ⛔ route scan, ⛔ Zod walker, ⛔ pinned route list. A future request-less
    caller (C4's backfill job) is a REVIEWED addition to the fence's ALLOWED list, with its own named Pariwar source.
  - ⛔ (b) v1.2's route-shape scan — fails both findings above.
  - ⛔ (c) a full route→call-graph AST (find every route whose handler transitively reaches `resolveAttribution`) — the
    same guarantee as (a) at many times the code, and brittle across dependency injection (`createXHandlers(deps)`).
  - ⛔ (d) take the Pariwar off the domain signature (read it from the tx scope only) — the epic names
    `resolveAttribution(code, pariwar_id)`, and (i)'s equality check is what catches a mis-scoped tx.
- **AT9 — Test seam for clashes.** ⭐ `allocateAttributionCode(client, input, opts?)` where `opts = { maxAttempts?,
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
- **I7** — A code credits its holder only for a capture at or after its allocation — STRICTLY: `resolveAttribution`
  returns the holder iff `allocated_at <= captured_at` (or `<= clock_timestamp()` for `'now'`), evaluated by Postgres on
  the two stored `timestamptz` values at the precision Postgres keeps them — MICROSECONDS — with ⛔ truncation and ⛔ JS
  `Date` in between (AT4 (c)). Two instants in the same microsecond count as "at" (credited). `allocated_at` is the
  DATABASE's clock, stamped by a `BEFORE INSERT` trigger (⛔ writer-supplied, v1.6). Correctness ⛔ depends on the order in
  which signup and the registry go live.

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
   `0192` shape); **and (v1.6)** a `BEFORE INSERT … FOR EACH ROW` stamp trigger setting `NEW.allocated_at :=
   clock_timestamp()` whatever the INSERT supplied (I7; the `0188` `_stamp` shape).
2. **AC2 — the flag table.** **Given** the same migration, **then** `attribution_code_allocation_flags` exists with
   `flag_id uuid PK DEFAULT gen_random_uuid()`, `pariwar_id uuid NOT NULL`, `attempts smallint NOT NULL CHECK (attempts BETWEEN 1 AND 32)`,
   `actor_id uuid NOT NULL`, `actor_display text NOT NULL CHECK (length(btrim(actor_display)) > 0)` (v1.6 — the 6.11 R5
   snapshot, AT7), `flagged_at timestamptz NOT NULL DEFAULT clock_timestamp()`; same grant / RLS / guard-trigger posture
   as AC1 (⛔ stamp trigger needed — nothing compares `flagged_at`); an index on `("pariwar_id","flagged_at")`.
3. **AC3 — the generator.** `generateAttributionCode()` returns a string matching `^[0-9]{6}$`, drawn with
   `node:crypto` `randomInt`, never a deny-listed value; ⛔ `Math.random` anywhere in the module (a unit test greps the
   module source). A unit test over 20,000 draws asserts: every draw matches the format, none is deny-listed, and at least
   one draw starts with `0` (leading zeros are reachable).
4. **AC4 — the allocator.** `allocateAttributionCode(client, { pariwarId, fieldWorkerId }, opts?)` runs in the caller's
   scoped transaction (⛔ opens none) and returns `{ attributionCodeId, code, allocatedAt, attempts }`. **And** per attempt
   it draws a candidate; a candidate failing the format or the deny-list (possible only from an injected `generate`) ⇒
   `InvalidAttributionCodeError` (⛔ surfaced as a raw 23514); it skips the candidate (counting the attempt) if it equals
   an `attribution_source` in `member_attribution` for the Pariwar (AT4), else inserts under a raw `SAVEPOINT`; a 23505 on
   `field_worker_attribution_codes_pariwar_code_uq` ⇒ `ROLLBACK TO SAVEPOINT` and redraw; a 23505 on
   `field_worker_attribution_codes_field_worker_uq` ⇒ `FieldWorkerAlreadyHasAttributionCodeError` (⛔ retry); any other
   error ⇒ rethrown. **And** after `maxAttempts` (default 8, override `1..32` else `RangeError`) without success ⇒
   `AttributionCodeAllocationExhaustedError { pariwarId, attempts }`. **And** it checks `maxAttempts` (pure, ⛔ SQL) and
   then asserts the scope equals `pariwarId` (as AC5) BEFORE any statement of its own (the AT8 v2 (i) ORDER).
5. **AC5 — the lookup.** `resolveAttribution(client, { code, pariwarId, asOf })` returns the holder's `FieldWorkerId` when
   the code is held in the Pariwar AND `allocated_at <= <the asOf instant>` compared IN SQL at full `timestamptz`
   precision; otherwise `null`. `asOf` is REQUIRED and is exactly `{ captureId: MemberAttributionId }` (the instant is
   that row's persisted `captured_at`, read in the same statement; the row must be in the Pariwar and its
   `attribution_source` must equal `code`, else `AttributionCaptureMismatchError`) or `'now'` (`clock_timestamp()` in
   the same statement); anything else ⇒ `TypeError`. ⛔ JS `Date` is an input to the comparison (AT4 (c), I7).
   **And** a `code` not matching `^[0-9]{6}$` ⇒ `InvalidAttributionCodeError` (⛔ statement sent — the pure checks run
   BEFORE `assertTxBoundScope`, AT8 v2 (i) ORDER; so a bad code on a `pg.Pool` throws `InvalidAttributionCodeError`).
   **And** for `{ captureId }`: no `member_attribution` row with that id IN the Pariwar, or one whose
   `attribution_source` ≠ `code` ⇒ `AttributionCaptureMismatchError`; a capture that matches but whose code is un-held
   or allocated AFTER it ⇒ `null` (the one-statement shape is in Task 5). **And** unset scope ⇒
   `PariwarScopeMissingError`; a non-UUID scope ⇒ `InvalidPariwarScopeError`; scope ≠ `pariwarId` ⇒
   `AttributionPariwarScopeMismatchError`. **And** the SQL filters on
   BOTH `pariwar_id` and `code`. **And** there is ⛔ any other exported function that reads by `code`.
6. **AC6 — the holder read.** `readAttributionCodeForFieldWorker(client, { pariwarId, fieldWorkerId })` returns `{ code,
   allocatedAt } | null` with the same scope assertion — the read 13.3's "my code" screen and 13.1 use instead of a
   column (AT2).
7. **AC7 — the flag.** `flagAllocationExhausted(client, { pariwarId, attempts, actorId, actorDisplay })` inserts one flag
   row and returns its id (an empty / blank `actorDisplay` ⇒ the DB CHECK; the door never passes one — AT7);
   `listAllocationFlags(client, { pariwarId, limit? })` returns them ordered `flagged_at DESC, flag_id DESC` through
   Drizzle (`bindScopedDb(client)`) with `.limit(clampLimit(opts.limit, { default: 50, cap: 200 }))` INLINE — the real
   signature is `clampLimit(limit, { default, cap })` (`packages/domain/src/pagination.ts`), and the domain-accessor gate
   (`scripts/domain-accessor-invariants/lib.ts`) accepts only an integer literal or an inline `clampLimit(...)` in a
   Drizzle `.limit()` — it cannot see a raw-SQL `LIMIT $n`, so ⛔ raw SQL for this read — both with the scope assertion.
   **And (AC4–AC7)** every exported DB function takes `client: pg.PoolClient` and runs `assertTxBoundScope` first (AT8 v2
   i): a `pg.Pool`, or a client outside a transaction block, ⇒ `AttributionCodeRequiresTransactionError`; every statement
   then runs on that same client.
8. **AC8 — the CI proof the epic asks for** (live-DB, `packages/domain/tests/integration/attribution-code/*.spec.ts`):
   - same `(code, pariwarId)` resolves to the same field worker on every call (for any `asOf` ≥ its allocation);
   - **AT4 (c), sub-millisecond (v1.5, BigDev item 7):** with a code row seeded at `allocated_at = '2026-11-01
     12:00:00.123456+00'` and three captures of that code seeded with EXPLICIT `captured_at` (⛔ the column default —
     TR10) all inside the SAME millisecond — `.123455` (BEFORE), `.123456` (EQUAL), `.123457` (AFTER) — resolving with
     `{ captureId }` gives `null`, the holder, the holder. (v1.4's `date_trunc` would have credited `.123455` — this leg
     fails on it.) Seed the `allocated_at` and `captured_at` values with `timestamptz` LITERALS in SQL, ⛔ through a JS
     `Date` (which would round them to the millisecond and make the three legs identical). ⚠ (v1.6) The AC1 stamp trigger
     overwrites a supplied `allocated_at`: seed the code row as the OWNER role inside the test tx under `SET LOCAL
     session_replication_role = 'replica'`, then `SET LOCAL session_replication_role = 'origin'` BEFORE `enterAppScope`
     (precedent `nominee/nominee-history-concurrency.spec.ts`; ⛔ `ALTER TABLE … DISABLE TRIGGER` on the shared table).
     ⚠ `member_attribution` is `UNIQUE (member_id)` ⇒ three captures need THREE members (`seedMember`, before
     `enterAppScope`), each capture inserted by raw `client.query` with its `captured_at` literal
     (`insertMemberAttribution` takes ⛔ `capturedAt`). **And** a leg proves the stamp: an INSERT as `twt_app` supplying
     `allocated_at = '2000-01-01'` stores the DB clock instead. Plus: a capture whose `attribution_source` ≠ `code` ⇒ `AttributionCaptureMismatchError`; a
     `captureId` from ANOTHER Pariwar ⇒ `AttributionCaptureMismatchError` (as the owner role too, so RLS is not what
     catches it); `'now'` ⇒ the holder for a code allocated earlier in the test;
   - **transaction-bound handle (v1.5, BigDev item 7):** for EACH exported DB function — passed a `pg.Pool` (cast past
     the type) ⇒ `AttributionCodeRequiresTransactionError`; passed a checked-out client with ⛔ `BEGIN`, even after a
     session-level `SET app.pariwar_id = '<A>'` on it, ⇒ `AttributionCodeRequiresTransactionError` (the SAVEPOINT probe);
     passed the scoped tx client (`getTx().client`) ⇒ succeeds. ⚠ (v1.6) `setupLiveDb` keeps its pool private: the spec
     creates its OWN `new pg.Pool({ connectionString: DATABASE_URL })` for the Pool and no-`BEGIN` legs, checks out a
     client for that leg only, and ends with `finally { await c.query('RESET app.pariwar_id'); c.release(true); }`
     (DESTROY, ⛔ return a connection with a leaked session GUC to a pool — `enterAppRoleNoScope` fail-closed probes
     expect an unset scope); `pool.end()` in `afterAll`. A type-level test (`// @ts-expect-error`) proves a
     `pg.Pool` and a Drizzle `Db` do ⛔ compile as the `client` argument;
   - the SAME code seeded in `PARIWAR_A` (worker W1) and `PARIWAR_B` (worker W2) resolves to W1 under A and to W2 under
     B — and both INSERTs succeed (cross-Pariwar collision permitted, I1);
   - resolving A's code with `pariwarId = PARIWAR_B` while scoped to A ⇒ `AttributionPariwarScopeMismatchError`;
   - ⭐ **as the owner/superuser role (RLS BYPASSED)**, scope = A, the same code seeded in A (W1) and B (W2):
     `resolveAttribution(code, A)` returns W1, and the AT4 skip ignores B's `member_attribution` capture — the only test
     that fails if the explicit `pariwar_id` predicate is dropped (as `twt_app`, FORCE RLS hides B's row anyway);
   - a forced clash (`opts.generate` returns a held code, then a fresh one) ⇒ success on attempt 2, `attempts = 2`;
   - a generator that always returns a held code ⇒ `AttributionCodeAllocationExhaustedError` after exactly `maxAttempts`
     draws, and **the caller's transaction is still usable** afterwards — proved by a CONTROL: `allocateAttributionCode`
     for a SECOND worker in the same tx succeeds (⛔ assert "no row survived" — vacuous after `ROLLBACK TO SAVEPOINT`);
   - a candidate equal to a seeded `member_attribution.attribution_source` in the Pariwar is skipped (AT4); the same
     string seeded in ANOTHER Pariwar is ⛔ skipped;
   - a second allocation for the same worker ⇒ `FieldWorkerAlreadyHasAttributionCodeError`;
   - as `twt_app`: `UPDATE` and `DELETE` on both tables are refused; as the owner role the guard triggers refuse
     `UPDATE`, `DELETE` and `TRUNCATE`; as the OWNER role (so RLS 42501 cannot fire first), a hand INSERT of `'12345'` ⇒
     23514 on the FORMAT check and of `'123456'` ⇒ 23514 on the DENY-LIST check — each assertion names its constraint;
   - the reach fence and the door are AC10;
   - **plus** a block in `cross-pariwar-leak.spec.ts` for each new table (G11) and an RLS policy-regression spec per
     table under `tests/integration/rls/`.
9. **AC9 — nothing else moves.** ⛔ No endpoint, ⛔ permission key, ⛔ `PERMISSION_CATALOG_VERSION` bump, ⛔ change to
   `member_attribution` (columns, grants, policies, ⛔ even an index) or the vyawastha-shulk confirm path, ⛔ event type,
   ⛔ env var, ⛔ mobile/admin UI, ⛔ edit to the three `rbac/roles.ts` / `permissions.ts` "Epic 12" comments (G3), ⛔ change
   to `requireMemberSession`, `scopeResolutionHook` or `requestContextHook`. ⭐ ONE comment-only exception (v1.6): the
   doc-blocks that become FALSE when this story lands — `packages/domain/src/schema/member_attribution.ts` (*"Epic 13's
   field-worker allocation registry is NOT built"*) and `packages/domain/src/payment/attribution-write.ts` (*"Epic 13 is
   not built"*) — are amended to point at `attribution-code/` (the registry and `resolveAttribution` now exist; the
   capture itself is STILL unvalidated, and resolution is wired by 13.8) — ⛔ code, column, grant or policy change.
   ⛔ access-wrapper gate extension (AI-6-1, `scripts/access-wrapper-invariants/README.md`): the surface has no audit write
   and no secret compare, so every invariant there would be vacuous for the wrong reason — the reach fence (AT8 v2) is
   this surface's gate; recorded here as the AI-6-1 decision. The ONE production file outside `packages/domain`:
   the API door `apps/api/src/modules/field-worker/attribution-code-access.ts` (AT8 v2 iii) — no route uses it yet.
   `pnpm ci:local` passes with `DATABASE_URL` set to the story's own DB port.
10. **AC10 — the API door and its gates (AT8 v2 iii–iv).** **Given** `attribution-code-access.ts`, **then** it exports
   EXACTLY the five request-bound wrappers and option keys pinned in AT8 v2 (iii) plus the six error classes re-exported
   by name (eleven exports, ⛔ other), each wrapper reaching `request` only through
   the private `authenticatedScope(request)` (unset Pariwar — or unset actor for the flag wrapper — ⇒ loud 500), and
   ⛔ `generate` through the door; **and** `apps/api/tests/unit/attribution-code-reach-fence.test.ts` enforces (ii) the
   repo-wide reach fence (every `apps/*/src` + `packages/*/src`, incl. `.astro`; exact allow-list; floors), (iii) the
   positive door shape and (iv) the writer pin (exactly the two G9b sites, any receiver, plus the
   `Object.assign` / `.requestContext =` rules), TypeScript-AST, with every bite test listed in AT8 v2; **and**
   `apps/api/tests/integration/attribution-code-access.spec.ts` proves: A-request + A-`ScopeTx` ⇒ resolves; A-request +
   B-`ScopeTx` ⇒ `AttributionPariwarScopeMismatchError` before any SQL; no `requestContext.pariwarId` ⇒ 500; flag wrapper
   without `actorId` ⇒ 500; the flag row's `actor_id` = `requestContext.actorId` (the authenticated actor, ⛔ a caller
   value) and its `actor_display` = that admin's `users.display_name`; an admin with ⛔ display name ⇒
   `AdminDisplayNameMissingError` and ⛔ row; the flag wrapper's row survives the caller's rollback (fresh `randomUUID()`
   Pariwar, asserted by `flag_id`). The door-shape gate pins `scopeTx: ScopeTx` as the
   second parameter of the four in-transaction wrappers (⛔ `Db`, ⛔ `pg.Pool`).

## Tasks / Subtasks

- [x] **Task 0 — governance first (AC0).** ⭐ **0.1 runs FIRST in `bmad-dev-story`. Do NOT write code before 0.1 is done
  and its greps are in the Debug Log.**
  - [x] 0.1 `git fetch origin`; rebase onto `origin/main` if it moved. Re-grep NUMBERS across main, every worktree and
    every branch (`git for-each-ref` + `git ls-tree … packages/domain/migrations/`): highest migration + journal `when`
    (take the next free number ≥ `0199`; ⚠ a later `when` on a sibling's migration makes drizzle skip the other on a
    shared DB — set this migration's `when` above every sibling's); newest decision id; `PERMISSION_CATALOG_VERSION`;
    newest ledger letter. **STOP** and report if: (S1) a `field_workers` table or `field-worker*` package has landed
    (AT2's FK may then be added here instead); (S2) `member_attribution` changed shape; (S3) any branch references `attributionCode` under
    `apps/*/src` or adds a third `requestContext.pariwarId` writer (the AT8 v2 gates would fail on rebase); (S4) a decision mentioning field workers or attribution has
    landed; (S5) member signup has gone live, or any record shows attribution codes handed out outside this registry.
  - [x] 0.2 BigDev answers AT1–AT10 **and Q-S5** — *"Has any field-worker code been, or will any be, handed out by
    hand before Story 13.1 ships, and will member signup go live before 13.1?"* — verbatim into Debug Log (a).
    ✅ **Q-S5 ANSWERED 2026-11-01 (create-story pass), BigDev: *"Answer is no to both"*** — AT4 stands; dev re-confirms
    S5 at 0.1 only. ✅ **AT1–AT7, AT9, AT10 ANSWERED 2026-11-01, BigDev: *"AT1-AT10 as recommended, except AT8"*.**
    ✅ **AT8 v2 and AT4 (c) ANSWERED 2026-11-03, BigDev: *"both design approved."*** — approved as written in v1.6 (proposed v1.3,
    hardened v1.4, amended v1.5 on BigDev's eight items, validated + amended v1.6). ⇒ 0.2 is COMPLETE: every AT is ⭐ as
    written; the dev copies these answers into Debug Log (a) only. If any later answer departs from ⭐, update the ACs and
    Tasks BEFORE coding ([[feedback_spec_edits_must_propagate_to_tasks]]).
  - [x] 0.3 ⛔ No decision entry is needed (all AT decisions are author-level, §0). If BigDev asks for one, stage it in the
    scratchpad, insert above the newest `### Decision`, verify additive-only, and commit it ALONE before code
    ([[feedback_governance_commits_precede_implementation]]).
  - [x] 0.4 Carry the seam where each sibling's author will read it (C1–C6) — BEFORE code:
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
    `attempts`), `AttributionCodeRequiresTransactionError`, `AttributionCaptureMismatchError`. Reuse
    `PariwarScopeMissingError` and `InvalidPariwarScopeError` from `packages/domain/src/errors.ts` (⛔ `db.ts`).
- [ ] **Task 2 — schema + migration + RLS + guard (AC1, AC2).**
  - [ ] 2.1 `schema/field_worker_attribution_codes.ts`, `schema/attribution_code_allocation_flags.ts` (incl.
    `actor_display` — AC2); export from `schema/index.ts`.
  - [ ] 2.2 `policies/field-worker-attribution-codes-rls.ts`, `policies/attribution-code-allocation-flags-rls.ts`
    (SELECT + INSERT, `to: appRole`); export from `policies/index.ts`.
  - [ ] 2.3 Hand-write `NNNN_field-worker-attribution-codes.sql` in the 0178 statement order, with the 0192 guard +
    TRUNCATE triggers and the 0188-shaped `BEFORE INSERT` stamp trigger on `allocated_at` (G10, AC1); ⛔ `db:generate`. Header comment: the AT2 seam (*"13.1 adds the composite FK; ⛔ add a code
    column to field_workers"*). Deny-list
    CHECK as `code NOT IN (…)` with the 20 literals, in LOCKSTEP with the TS constant (a unit test compares them by
    reading the migration file).
  - [ ] 2.4 Journal entry; `pnpm db:check` / schema-diff green.
- [ ] **Task 3 — generator (AC3).** `attribution-code/code.ts`: `ATTRIBUTION_CODE_LENGTH = 6`,
  `ATTRIBUTION_CODE_PATTERN`, `ATTRIBUTION_CODE_DENYLIST` (frozen, 20 entries), `isDenylistedAttributionCode`,
  `generateAttributionCode()` (redraw while deny-listed). Unit tests in `packages/domain/tests/attribution-code/code.test.ts`.
- [ ] **Task 3a — the transaction-bound guard (AC4–AC7, AT8 v2 i).** `attribution-code/tx-guard.ts` (module-private —
  ⛔ re-exported from `index.ts`): `assertTxBoundScope(client, pariwarId)` — DUCK-TYPED reject of anything without a
  `release` function (⛔ `instanceof pg.Pool`: a value import of `pg` is lint-banned here); `SAVEPOINT
  attribution_code_tx_guard` + `RELEASE` (map ONLY `25P01` to `AttributionCodeRequiresTransactionError`; rethrow
  anything else, e.g. `25P02`); then `const scoped = await assertPariwarScopeSet(client)` (REUSED from `db.ts` — missing /
  invalid errors) and a lower-cased comparison ⇒ `AttributionPariwarScopeMismatchError`. Every exported DB function runs
  its PURE argument checks first (code format, `asOf` shape, `maxAttempts` — ⛔ statement), THEN this guard, THEN binds
  Drizzle with `bindScopedDb(client)` (precedent `helpdesk/project.ts` `projectTicketGenesis`). ⛔ function accepts a `Db`.
- [ ] **Task 4 — allocator (AC4).** `attribution-code/allocate.ts` (takes `client`), shape of `telegram-opt-in/write.ts`
  `createPendingOptIn` (G5): raw `SAVEPOINT allocate_attribution_code`, constraint-name matching via the EXPORTED
  `uniqueViolationConstraint` in `packages/domain/src/marketplace/errors.ts` (⛔ a fifth private copy; ⛔ match any 23505). The AT4 `EXISTS` read on `member_attribution` (`pariwar_id` + 
  `attribution_source`) per candidate. `ATTRIBUTION_CODE_MAX_ATTEMPTS = 8`; `opts.maxAttempts` range check.
- [ ] **Task 5 — lookup, holder read, flags (AC5, AC6, AC7).** `resolve.ts`: `resolveAttribution(client, …)` with the
  required `asOf` union. ⭐ `{ captureId }` — ONE statement DRIVEN FROM `ma` (v1.6; an INNER JOIN with every predicate in
  `WHERE` returns zero rows for both "no capture" and "not held / held later", and so cannot tell mismatch from `null`):
  ```sql
  SELECT ma.attribution_source = $code AS code_match, fwac.field_worker_id
    FROM member_attribution ma
    LEFT JOIN field_worker_attribution_codes fwac
      ON fwac.pariwar_id = $pariwarId AND fwac.code = $code AND fwac.allocated_at <= ma.captured_at
   WHERE ma.attribution_id = $captureId AND ma.pariwar_id = $pariwarId
  ```
  0 rows ⇒ `AttributionCaptureMismatchError`; `code_match` false ⇒ `AttributionCaptureMismatchError`; else
  `field_worker_id` (null = not held, or held only from a later instant). `'now'` uses `fwac.allocated_at <=
  clock_timestamp()`; any other `asOf` ⇒ `TypeError`; ⛔ JS timestamp in the comparison, ⛔ `date_trunc`.
  `readAttributionCodeForFieldWorker(client, …)`. `flags.ts` (`flagAllocationExhausted(client, { …, actorDisplay })`,
  `listAllocationFlags(client, …)` via Drizzle with an INLINE `.limit(clampLimit(opts.limit, { default: 50, cap: 200 }))`
  — AC7). All via Task 3a's guard. `index.ts` + `export * as attributionCode` in `packages/domain/src/index.ts`.
- [ ] **Task 5a — the two stale doc-blocks (AC9 exception, comment only).** Amend the headers of
  `schema/member_attribution.ts` and `payment/attribution-write.ts` ("Epic 13 … NOT built") to say the registry and
  `resolveAttribution` now exist in `attribution-code/`, that the capture is still unvalidated, and that 13.8 wires the
  resolution. ⛔ other change to either file.
- [ ] **Task 6 — the proofs (AC8).**
  - [ ] 6.1 Live-DB specs (`tests/integration/attribution-code/allocate.spec.ts`, `resolve.spec.ts`, `flags.spec.ts`)
    with `setupLiveDb` / `getTx` (`packages/domain/src/test-utils/integration-setup.ts` — `getTx()` gives `{ tx: Db,
    client: pg.PoolClient }` already inside `BEGIN`; pass `client` to the domain) / `enterAppScope`, `PARIWAR_A/B`
    (`packages/domain/tests/integration/_helpers.ts`). ⚠ Seed `member_attribution` rows with real members (FK) via
    `seedMember(tx, PARIWAR_A, …)` BEFORE `enterAppScope` — one member per capture (`UNIQUE (member_id)`). Write EVERY
    AC8 leg, named in the spec titles: same-pair stability; the three sub-ms legs (BEFORE / EQUAL / AFTER, seeded as SQL
    literals under `session_replication_role = 'replica'` — AC8); the stamp leg (backdated INSERT is re-stamped); the two
    capture-mismatch legs (different code; other Pariwar as owner); `'now'`; the transaction-bound-handle legs (own pool,
    no-`BEGIN` + session `SET`, `release(true)`); the cross-Pariwar collision; the scope-mismatch leg; the owner-role
    predicate leg; forced clash; exhaustion + the second-worker CONTROL; AT4 skip in-Pariwar / ⛔ cross-Pariwar; second
    allocation; the grant / trigger legs; the two named-CHECK legs. Domain flag specs assert membership and relative
    order of THEIR OWN rows, ⛔ absolute counts (rows inside `setupLiveDb`'s tx roll back, but a sibling API spec's
    committed flags do not). The `@ts-expect-error` type test: `packages/domain/tests/attribution-code/types.test.ts`
    (domain `tsconfig` includes `tests/**`, so `typecheck` runs it).
  - [ ] 6.2 `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` blocks + `tests/integration/rls/` regression
    specs for both tables.
  - [ ] 6.3 Unit: `tests/attribution-code/exports.test.ts` — the namespace's EXACT export list: `generateAttributionCode`,
    `allocateAttributionCode`, `resolveAttribution`, `readAttributionCodeForFieldWorker`, `flagAllocationExhausted`,
    `listAllocationFlags`, `isDenylistedAttributionCode`, the constants `ATTRIBUTION_CODE_LENGTH`,
    `ATTRIBUTION_CODE_PATTERN`, `ATTRIBUTION_CODE_DENYLIST`, `ATTRIBUTION_CODE_MAX_ATTEMPTS`, and the six error classes
    (⛔ `assertTxBoundScope`); deny-list ↔ migration lockstep test.
    (The v1.3 domain-only `boundary.test.ts` is FOLDED into the repo-wide reach fence, 6.4.)
  - [ ] 6.4 **The API door (AC10).** `apps/api/src/modules/field-worker/attribution-code-access.ts` (the five wrappers +
    the six error classes re-exported by name; the flag wrapper resolves `actor_display` via `getDisplayName`);
    `apps/api/tests/unit/attribution-code-reach-fence.test.ts` — modelled on `family-account-reach-fence.test.ts` (REACH /
    TREES / exact ALLOWED / comment-stripping / positive control), with TypeScript-AST for the door shape and the writer
    pin (reuse the parsing approach of `scripts/access-wrapper-invariants/lib.ts`, ⛔ import from `scripts/`); every bite
    test in AT8 v2; `apps/api/tests/integration/attribution-code-access.spec.ts` (live DB).
  - [ ] 6.5 RED proofs into Debug Log (b): break each guard once and record the failing test — drop the `pariwar_id`
    predicate (⇒ the owner-role AC8 leg fails); drop the as-of predicate (⇒ the AT4 (c) legs fail);
    remove the scope assertion (⇒ the A-request + B-tx leg fails); add a `UNIQUE("code")`; remove the TRUNCATE trigger;
    plant an importer in `apps/public/src/pages/*.astro` and a `schema.fieldWorkerAttributionCodes` read in `apps/api/src`;
    add a third `pariwarId` writer via an alias (`ctx.pariwarId = …`); forward `generate` through the door; (v1.5) replace
    the SQL as-of predicate with `date_trunc('milliseconds', allocated_at) <= …` (⇒ the `.123455` BEFORE leg fails);
    delete the SAVEPOINT probe from `assertTxBoundScope` (⇒ the no-`BEGIN` + session-`SET` leg fails); widen a domain
    function's `client` parameter to `Db | pg.PoolClient` (⇒ the `@ts-expect-error` test fails); make a wrapper accept
    `tx: Db` (⇒ the door-shape pin fails); let the flag wrapper take an `actorId` option (⇒ the option-key pin fails).
    (v1.6) Remove `ROLLBACK TO SAVEPOINT allocate_attribution_code` (⇒ the second-worker CONTROL fails 25P02); drop the
    stamp trigger (⇒ the backdated-INSERT leg fails); add the dot-entry skip to the walker (⇒ the `.well-known` control
    fails); make the `{ captureId }` statement an INNER JOIN (⇒ the un-held-code leg throws instead of `null`); fall back
    to the actor id when the display name is missing (⇒ the `AdminDisplayNameMissingError` leg fails). Record the reach
    fence's printed scan count beside 1,829.
- [ ] **Task 7 — close.** `pnpm ci:local` with `DATABASE_URL` = the story DB port (⚠ the shell's `DATABASE_URL` points at
  `:5432`); File List; Change Log; row `ready-for-dev → in-progress → review` in `sprint-status.yaml` via the SAFE
  prepend.

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- **`member_attribution` + the confirm handler (G1, G2)** — READ-ONLY to this story. AT4 reads it; ⛔ change its
  columns, grants, RLS, or the SAVEPOINT capture. Its RTBF behaviour (kept on erasure, `member/anonymize.ts`) and the
  data-export section (`data-export/assemble.ts`) are untouched — ⚠ the export sections are strict-parsed: ⛔ add a key.
  ONLY the header doc-blocks of `schema/member_attribution.ts` and `payment/attribution-write.ts` change (Task 5a). The
  new tables hold ⛔ member data, so ⛔ `member/anonymize.ts` / `data-export/assemble.ts` change; field-worker erasure is
  13.1's (C1). The flag table's `actor_display` is controlled staff-attribution data (6.11 R5), plaintext by that rule.
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
- **TR5 — `\d` vs `[0-9]`.** JS `\d` is ASCII in every regex mode; Postgres `~ '\d'` can match other digits under some
  locales — use `[0-9]` in SQL.
- **TR6 — the deny-list lives in two places (TS constant + SQL CHECK).** The lockstep test is the only thing keeping them
  equal.
- **TR7 — local superuser bypasses RLS.** Integration tests `SET LOCAL ROLE twt_app` (`enterAppScope`) before asserting
  policy behaviour; the guard-trigger test runs as the owner role on purpose.
- **TR8 — `pariwar_id` has no FK target** (G4) — ⛔ invent a `pariwars` table.
- **TR9 — the shell's `DATABASE_URL` is `:5432`.** Prefix every `ci:local` and `git push` with the story port.
- **TR10 — inside one transaction every default-seeded capture PREDATES every allocation; and a JS `Date` erases the
  microseconds.** Seed `allocated_at` / `captured_at` as SQL `timestamptz` literals for the sub-ms legs. `member_attribution.captured_at`
  is `DEFAULT now()` (tx start — schema `.defaultNow()`, migration 0027), and `setupLiveDb` runs each test in ONE
  rolled-back tx, so a capture seeded with the default always sorts before an allocation's `clock_timestamp()` and
  resolves to `null`. Set `captured_at` EXPLICITLY (`clock_timestamp()`) for the positive leg (AC8); 13.8's same-tx
  capture-then-resolve has the same trap.
- **TR11 — the stamp trigger eats seeded `allocated_at` values (v1.6).** Seed sub-ms code rows as the owner under `SET
  LOCAL session_replication_role = 'replica'` and switch back to `'origin'` before `enterAppScope`; ⛔ `ALTER TABLE …
  DISABLE TRIGGER` on a shared table.
- **TR12 — committed, append-only rows never leave the shared DB (v1.6).** The flag wrapper commits its own tx and the
  table's guards block cleanup, so any spec leg that exercises it uses a fresh `randomUUID()` Pariwar and asserts by id,
  ⛔ by count (memory: shared-DB pollution, #18).
- **TR13 — the door's callers import a path containing `attribution-code` (v1.6).** REACH exempts specifiers that resolve
  to the door; a fence written without that exemption makes 13.1's first route red.
- **TR14 — the order of checks (v1.6).** Pure argument checks → `assertTxBoundScope` → SQL. A test that passes a bad code
  on a `pg.Pool` expects `InvalidAttributionCodeError`.

### Carried to sibling stories (C) — HOMED (⛔ closed) in `deferred-work.md` and under each sibling in `epics.md` (Task 0.4)

- **C1 → 13.1.** `field_workers` carries ⛔ no code column; 13.1's migration adds the composite FK
  `(pariwar_id, field_worker_id)` on `field_worker_attribution_codes` (needs a `UNIQUE (pariwar_id, field_worker_id)` on
  `field_workers`), `ON DELETE NO ACTION` — a field worker is ⛔ never deleted while holding a code: erasure ANONYMIZES
  the `field_workers` row, and a `TRUNCATE field_workers CASCADE` will hit this story's TRUNCATE trigger. Registration
  calls `allocateAttributionCodeForRequest` (the API door) in the SAME tx as the worker insert; on
  `AttributionCodeAllocationExhaustedError` its catch calls `flagAllocationExhaustedForRequest` (which writes the flag in
  its own committed scope tx) and rethrows (the request tx belongs to `scopeResolutionHook`, G9a). ⭐ AUTHORIZATION IS
  13.1's (v1.5): its route runs `requireAdminSession` → `scopeResolutionHook` → `requirePermissionHook(<the field-worker
  key, Panel-ratified under `-059` B(3)>)` BEFORE either call — the door enforces Pariwar context only. The flag's
  `actor_id` is ALWAYS the authenticated `requestContext.actorId` (the door takes no actor input). The flag's `actor_id` is NOT NULL ⇒ a system / bulk registration
  path (none planned) would need a decision on whose id it records. ⭐ (v1.6) 13.1 resolves the admin's
  `users.display_name` FIRST (it needs it for its own "added by" attribution under 6.11 R5), so the flag path is never the
  first to discover a missing name; the flag wrapper still re-resolves it server-side and throws
  `AdminDisplayNameMissingError` if absent. 13.1 catches the module's errors by `instanceof` on the classes the DOOR
  re-exports (`import { AttributionCodeAllocationExhaustedError, … } from './attribution-code-access.js'`) — ⛔ via
  `attributionCode.*` (the fence) — and reads `.attempts` from it. If it wires `maxAttempts` from env, use
  `positiveIntEnv`. The `field_worker.registered` payload may carry `attributionCodeId`. 13.1's `packages/field-worker-lifecycle` home should be re-weighed against
  [[feedback_no_premature_package]] (13.1's call).
- **C2 → 13.1 + the first attribution consumer (13.8 / signup wiring).** `resolveAttribution` returns the HOLDER (I6).
  FR-85 — *"new attributions on deactivated code rejected"* — is a check on 13.1's lifecycle state, made by whoever
  records an attribution, ⛔ by this lookup. The signup consumer INSERTs the `member_attribution` row, then calls
  `resolveAttributionForRequest(request, scopeTx, { code, asOf: { captureId: <the new row's attribution_id> } })` in the
  same `ScopeTx` — ⛔ it never reads `captured_at` into JS (AT4 (c)); the new row's id is `MemberAttributionRow.attributionId`.
  It owns its route's authorization (the member session) — the door checks ⛔ permission. ⚠ (v1.6) Call the door ONLY for
  a 6-digit `attribution_source`: FR-82's other forms (member username / eHRMS — the adopter chain) would throw
  `InvalidAttributionCodeError` and are ⛔ this lookup. A wire / DTO field is ⛔ named `attributionCode` (the fence fires on
  the name — use `referenceCode` / `code`).
- **C3 → 13.4 (attribution analytics / trustee surface).** Render the flags to trustees through the door's
  `listAllocationFlagsForRequest` (⛔ `attributionCode.listAllocationFlags` — the fence), showing `actor_display`, ⛔ a raw
  actor id (6.11 R5); until then a flag is recorded but ⛔ seen (expected frequency ≈ 0, AT6).
- **C4 → 13.5 / 13.8 (backfill of 3.6b captures).** A backfill resolves each `member_attribution` row with
  `asOf: { captureId: <that row's attribution_id> }` — the comparison runs in SQL on the persisted `captured_at` at full
  precision; ⛔ it reads `captured_at` into JS — the as-of rule (AT4 (c), I7) then credits ⛔ capture that predates its code, whatever the rollout
  order (with the AT4 (c) insert-vs-commit residual). A backfill JOB has no request: it needs (1) a `twt_service` grant
  on the codes table (none today) — under which the explicit `pariwar_id` predicate is the only Pariwar filter (TR3) —
  and (2) a REVIEWED entry in the reach fence's ALLOWED list naming its own Pariwar source (TR4b). It resolves ONLY rows
  whose `attribution_source` is 6-digit (other FR-82 forms are the adopter chain — v1.6).
- **C5 → 13.3 (field-worker app).** FR-53's "my own code" reads `readAttributionCodeForRequest` (the API door) under
  `field_worker_self` scope; the permission key it needs is the Panel's to ratify (`-059` B(3)). Every route that touches a
  code — any shape, any key name — goes through the door (AT8 v2). A response / DTO field is ⛔ named `attributionCode`
  (the fence fires on the name — v1.6).
- **C6 → 13.1 (the one human premise left).** AT4 (c) makes signup-before-registry harmless; it cannot see a code handed
  out OUTSIDE the registry. 13.1's "Add Field Worker" is the ONLY issuer of codes: 13.1's Task 0 re-asks Q-S5's first
  half (*"has any code been handed out by hand?"*) before its registration flow goes live, and its runbook / UI copy
  never tells a field worker a code before the allocation commits.

### Testing standards

- Unit: `packages/domain/tests/**/*.test.ts`; live-DB: `packages/domain/tests/integration/**/*.spec.ts`, self-skipping on
  `!hasDatabase`, per-test rolled-back tx (`setupLiveDb`); API integration: `apps/api/tests/integration/`.
- Every guard gets a RED proof (Task 6.5). Every scan gets a non-vacuity floor.
- COMMITTED rows (only the flag wrapper's API leg commits) live forever on the shared DB: fresh `randomUUID()` Pariwar,
  assert by `flag_id`, ⛔ counts (TR12). Every other leg runs inside `setupLiveDb`'s rolled-back tx.
- `pnpm ci:local` (`scripts/ci-local.sh`) with `DATABASE_URL` set; integration tests only run when it is.

### Project Structure Notes

- New: `packages/domain/src/attribution-code/{index,code,allocate,resolve,flags,errors,tx-guard}.ts`;
  `packages/domain/src/schema/{field_worker_attribution_codes,attribution_code_allocation_flags}.ts`;
  `packages/domain/src/policies/{field-worker-attribution-codes-rls,attribution-code-allocation-flags-rls}.ts`;
  `packages/domain/migrations/NNNN_field-worker-attribution-codes.sql`;
  `apps/api/src/modules/field-worker/attribution-code-access.ts`; tests as in Task 6.
- Modified: `packages/domain/src/{index,ids/index,schema/index,policies/index}.ts`; `migrations/meta/_journal.json`;
  `cross-pariwar-leak.spec.ts`; the header COMMENTS of `schema/member_attribution.ts` and `payment/attribution-write.ts`
  (Task 5a);
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
  `packages/domain/src/rbac/roles.ts`; (v1.6) `apps/api/src/types.ts` (`ScopeTx`); `packages/domain/src/pagination.ts`
  (`clampLimit`); `scripts/domain-accessor-invariants/lib.ts`; `packages/domain/src/marketplace/errors.ts`
  (`uniqueViolationConstraint`); `packages/domain/migrations/0188_degraded-bridge-sms.sql` (stamp trigger);
  `apps/api/src/modules/auth/admin/admin-auth.repo.ts` (`getDisplayName`); `apps/api/src/http-errors.ts`
  (`AdminDisplayNameMissingError`); `packages/domain/src/test-utils/integration-setup.ts`;
  `packages/domain/tests/integration/nominee/nominee-history-concurrency.spec.ts` (`session_replication_role` seeding);
  `packages/eslint-config-twt/index.js` (the `pg` value-import ban).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 13.2`, 2026-11-03.

### Debug Log References

(a) Task 0.2 answers, verbatim — **Q-S5** (2026-11-01, during create-story, asked as *"Has any field-worker code been, or
will any be, handed out by hand before Story 13.1 ships? Will member signup go live before 13.1?"*): BigDev — *"Answer
is no to both"*. **AT1–AT10** (2026-11-01): BigDev — *"AT1-AT10 as recommended, except AT8. I want you to come up with
better proposal for AT8. Also I want you to look into these / AT8 member-route rule contradicts G9a / AT8 route matching
can miss future lookup routes / AT4 needs a rollout sequencing guarantee"*. ⇒ AT1–AT7, AT9, AT10 ANSWERED as ⭐; AT8 v2
and AT4 (c) written in v1.3, ⏳ awaiting BigDev. **v1.5 request** (2026-11-01), BigDev, verbatim: *"I would request a
focused v1.5, not another redesign. 1. AT8 (i): require transaction-bound DB handles. The scope assertion and query must
use the same connection. 2. AT8 (iii): enforce the transaction-bound requirement through all five wrapper contracts
where applicable. 3. AT8 authorization: explicitly place authorization responsibility on the future registration
caller; the flag must record only the authenticated actor. 4. AT8 (ii): add synthetic tests for supported
dynamic/CommonJS import paths and intermediate re-exports; record the actual scan count. 5. AT4 (c): remove the
millisecond-truncation false-positive. Preserve timestamp precision through the comparison. 6. AT4 consumer: make the
signup and backfill consumers use the persisted captured_at at sufficient precision. 7. AC8: add the before/equal/after
sub-millisecond tests and a transaction-bound-handle test. 8. I7: retain the strict at-or-after invariant, but express
it in terms of the precision actually preserved by the implementation."* ⇒ all eight applied in v1.5 (Change Log).
**v1.6** (2026-11-03): BigDev invoked *"validate 13.2 and rebase"*; after the first verifier reports arrived, BigDev,
verbatim: *"apply all findings once the other verifiers report"* ⇒ every finding of the four verifiers applied in v1.6
(Change Log), incl. the two optional design points (the `allocated_at` stamp trigger; the `actor_display` snapshot,
decided per the ratified Story 6.11 R5 rule — block, ⛔ fallback). AT8 v2 and AT4 (c) remained ⏳ at v1.6.
**v1.7** (2026-11-03): BigDev, verbatim: *"both design approved."* ⇒ AT8 v2 and AT4 (c) APPROVED as written in v1.6; every AT is now answered.

(0) **Task 0.1 greps (2026-11-03, dev-story, before any code).** `git fetch origin`: `origin/main` = `b7b43c47` =
this branch's merge-base ⇒ ⛔ rebase needed. Across every `refs/heads` + `refs/remotes` ref and every worktree's working
copy: highest migration `0198_claim-fraud-step-ties-its-finding` (⛔ ref or worktree holds `0199`+); max journal `when`
on any ref `1796701200043` ⇒ this story takes **`0199_field-worker-attribution-codes.sql`**, `when` **`1796787600044`**
(re-check at the rebase-before-push). Newest decision: `2026-11-02-439` on main, `-440` on `story/6-22b-…` only (0 hits
for field worker / attribution in `-440`) ⇒ ⛔ decision entry (0.3). `PERMISSION_CATALOG_VERSION = 58` (unchanged).
Ledger: main `2026-11-02b`; `6-22b` `-02c`/`-02d`; this branch `-03a`/`-03b` ⇒ the completion entry is `2026-11-03c`.
STOPS: (S1) ⛔ `field_workers` table, `packages/field-worker*` or `modules/field-worker/` on any ref — clear; (S2)
`member_attribution.ts` / `0027` untouched `3d6b46c5..origin/main` — clear; (S3) ⛔ `\battributionCode\b` in any
branch's `apps/*/src`; `requestContext.pariwarId` writers in `apps/api/src` are exactly `scope-resolution/index.ts` +
`member-session-guard.ts`, ⛔ `Object.assign`/`Reflect.set`/`defineProperty` on a context, the only `.requestContext =`
is `request-context/index.ts` — clear; ⛔ session-level `SET app.pariwar_id` writer in `apps/*/src` / `packages/*/src`;
(S4) ⛔ new decision on field workers / attribution — clear; (S5) nothing is live; ⛔ record of hand-issued codes —
clear. Scan count re-recorded: **1,829** files in **19** trees (unchanged from v1.6). Task 0.4: the five `epics.md`
INHERITED blocks (13.1, 13.3, 13.4, 13.5, 13.8) and the `deferred-work.md` C1–C6 section exist as v1.6 wrote them; v1.7
moved no C item ⇒ ⛔ amendment.

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-03 | 1.7 | BigDev: *"both design approved."* ⇒ AT8 v2 (gate the call: domain door on a transaction-bound client + repo-wide reach fence + API door + authenticated-Pariwar writer pin) and AT4 (c) (a code credits only captures at or after its DB-stamped allocation, compared in SQL at µs precision) APPROVED as written in v1.6. Task 0.2 complete; §AT heading, AT8 v2, AT4 (c), Debug Log (a) updated. ⛔ change to any AC or Task. |
| 2026-11-03 | 1.6 | REBASED onto `b7b43c47` (94 commits: 11b.5a, 12.2, 6.22 landed; ledger `-01d` relabelled `-01ad`). THIRD validation — four read-only verifiers (main delta / code claims / adversarial / footguns + checklist); S1–S5 all clear; BigDev: *"apply all findings"*. **High:** REACH exempts the door's importers and matches WHOLE identifiers on AST nodes (incl. `ImportTypeNode` qualifiers and binding elements); the door re-exports the six error classes (eleven pinned exports) so 13.1 can `instanceof` them; ALLOWED split into a module PREFIX (exempt from must-match) + exact files. **Medium:** NUMBERS re-traced (migration ≥ `0199`, contended with 6-22b; decisions ≥ `-441`; catalog 58; ledger `2026-11-03a`); scan count 1,829 / 19 trees — dot-directories (`.well-known` public routes) and `.d.ts` now included, plus a positive control; check ORDER (pure → guard → SQL); the `{ captureId }` statement written out (LEFT JOIN from `ma`); writer-pin destructuring = assignment expressions only; `actor_display` snapshot on the flag table (6.11 R5; `AdminDisplayNameMissingError`, ⛔ fallback); `BEFORE INSERT` stamp trigger on `allocated_at` (⛔ backdating); test-handle, three-member, replica-role seeding and committed-row rules; sibling INHERITED blocks name the door's calls. **Low:** `ScopeTx` lives in `apps/api/src/types.ts`; `clampLimit(limit, opts)` inline in Drizzle; reuse `assertPariwarScopeSet` and the exported `uniqueViolationConstraint`; duck-typed Pool check (`pg` value import lint-banned); only `25P01` mapped; `createDb().db`; G2's `FOR ALL` policy; three "Epic 12" comments; `attributionId`; `positiveIntEnv`; turbo caveat; TR5; savepoint CONTROL; named CHECK legs; AI-6-1 recorded; the two stale doc-blocks amended (Task 5a); 6-digit-only consumers; DTO naming; Task 6.1 lists every AC8 leg; export pin enumerated. TR11–TR14. |
| 2026-11-01 | 1.5 | BigDev's focused v1.5 (eight items, ⛔ a redesign), all applied. (1) AT8 (i): every exported DB function takes `client: pg.PoolClient` (precedent `projectTicketGenesis`) and runs `assertTxBoundScope` first — rejects a `pg.Pool`, proves a transaction block with a SAVEPOINT probe (`25P01` ⇒ `AttributionCodeRequiresTransactionError`), reads the scope on THAT client — so assertion and query share one connection by construction; new Task 3a. (2) AT8 (iii): the four in-transaction wrappers take `scopeTx: ScopeTx` and pre-check its Pariwar; the flag wrapper owns its tx end to end; types pinned by the door-shape gate. (3) Authorization stated as the CALLER's (13.1's route: admin session → scope → the Panel-ratified field-worker key); the flag records only `requestContext.actorId`, ⛔ actor option. (4) AT8 (ii): REACH widened to the bare identifier from any source + `export *` from `@twt/domain`; synthetic tests for alias / namespace / element / type-level `import()` / dynamic `import()` / `require` / path forms / intermediate re-exports; scan count RECORDED (1,785 files in 19 trees at `3d6b46c5`; floor 1,600). (5)–(6) AT4 (c): `date_trunc` and `asOf: Date` REMOVED — `asOf` is `{ captureId }` (the persisted `captured_at`, joined in the same statement) or `'now'` (`clock_timestamp()`); ⛔ JS timestamp in the comparison; signup and backfill pass `{ captureId }`. (7) AC8: before / equal / after legs within one millisecond (`.123455` / `.123456` / `.123457`, seeded as SQL literals), capture-mismatch legs, and the transaction-bound-handle legs (Pool, no-`BEGIN` + session `SET`, `@ts-expect-error`). (8) I7: strict at-or-after, at Postgres's microsecond precision, same-µs counts as "at". Carried blocks updated (asOf form, ScopeTx, authorization). |
| 2026-11-01 | 1.4 | Second fresh-context validation (of v1.3): 1 critical / 3 high / 4 medium / 6 low, all applied. AT8 v2 HARDENED — (ii) is now ONE repo-wide reach fence (every `apps/*/src` + `packages/*/src`, incl. `.astro`; REACH covers the namespace, paths, schema symbols, SQL table names and the domain function names; exact allow-list; precedent `family-account-reach-fence.test.ts`) — v1.3 missed the unauthenticated `apps/public` server and schema / raw-SQL / wrapper bypasses; (iii) door shape is POSITIVE (request reached only through `authenticatedScope`), names + option keys pinned, `opts` without `generate`, unset actor ⇒ 500; (iv) writer pin covers any receiver / element access / compound / destructuring, plus `Object.assign` and `.requestContext =` rules. AT4 (c) at MILLISECOND granularity (`date_trunc`), `asOf` is a DB instant (incl. `clock_timestamp()` for capture-less lookups), positive leg + TR10, insert-vs-commit residual stated. AC2 NARROWED note; I6/I7 order; AC9 wording; G9 marked historical; TR4c; carried blocks show `asOf`. Turbo-cache local-rerun limit noted. AT8 v2 and AT4 (c) still PROPOSED. |
| 2026-11-01 | 1.3 | BigDev: AT1–AT10 as recommended EXCEPT AT8, plus three findings. Both AT8 findings CONFIRMED in the code (G9a extended: member handlers open their own scoped tx; G9b added: exactly two `requestContext.pariwarId` writers). AT8 REPLACED by v2 — gate the call, not the route shape: domain door + domain boundary scan + ONE API door (`attribution-code-access.ts`) + a pin on the two authenticated-Pariwar writers; the route scan, Zod walker, pinned route list and `SCOPE_RESOLUTION_HOOK` marker are DROPPED. AT4 (c) ADDED — the rollout sequencing guarantee: required `asOf`, a code credits only captures at/after its allocation (I7). New AC10; AC5 / AC8 / AC9 / Tasks 5–6 / TR4–TR4b / C1 / C4 / C5 updated; C6 added. AT8 v2 and AT4 (c) PROPOSED. |
| 2026-11-01 | 1.2 | Q-S5 ANSWERED — BigDev: *"Answer is no to both"* (no hand-issued codes before 13.1; signup not live before 13.1). AT4's premise and the §0 gate now ESTABLISHED, ⛔ conditional; G2 and Task 0.2 updated; Debug Log (a) started. AT1–AT10 still pending. |
| 2026-11-01 | 1.1 | Fast-forwarded to `3d6b46c5` (12.1 landed). One fresh-context checker: 1 critical / 2 high / 7 medium / 11 low, all applied — AT8 (iii) route rule rewritten for admin `/p/:pariwarId` routes + `SCOPE_RESOLUTION_HOOK` marker + throwing walker + exact pin (two routes); Q-S5 / S5 and the §0 premise made conditional; owner-role leg that proves the `pariwar_id` predicate; 0192 append-only + TRUNCATE triggers; migration number left `NNNN` (0195 contended by 14-3 / 6-22); flag-in-a-separate-`openScopeTx`; the "Epic 12" comment edit DROPPED (Decision `2026-08-13-104`); C3–C5 also homed under 13.3 / 13.4 / 13.5 / 13.8; carried-item writes moved into Task 0.4; L-1…L-11. |
| 2026-11-01 | 1.0 | Created by `bmad-create-story 13.2` at `beae5116`; row backlog → ready-for-dev; AT1–AT10 PROPOSED. |
