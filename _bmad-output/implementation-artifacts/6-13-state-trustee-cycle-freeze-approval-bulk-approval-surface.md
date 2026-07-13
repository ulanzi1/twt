---
baseline_commit: dedd46d527a30c4806597643ecac08763c3f5d3b
---

# Story 6.13: State Trustee Cycle-Freeze Approval (Bulk-Approval Surface)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story Classification

`[SURFACE]` — a State-Trustee-facing admin UI + its API surface + the domain write-paths + the compound read-model that back it. **No new lifecycle states or events** — Story 6.1 already committed the full cycle-freeze vocabulary (`claim.state_trustee_frozen`, `claim.state_trustee_approved`, `claim.state_trustee_denied`, `claim.approved`) and the four states (`state_trustee_freeze`, `state_trustee_approved`, `approved`, plus `denied`). 6.13 is the FIRST live emitter of those events and the FIRST surface a `state_trustee` role authorizes against anywhere in the system.

It is also the FIRST contract to land in `packages/contracts/src/pools/` — the **pool-spawn trigger seam** that Epic 7's Pool Engine (Stories 7.1/7.2) will consume. Like the channels `dispatch()` seam, the trigger is authored + emitted here with NO live consumer yet ([[project_channels_no_live_dispatch_yet]]).

## Story

As a State Trustee performing the cycle-freeze bulk approval action,
I want a bulk-approval UI that lists all verifier-approved + verifier-flagged (escalated) cases pending the upcoming cycle with full provenance,
So that I can freeze the cycle (triggering the Epic 7 pool spawn) with a single trustee-attestable, step-up-gated action.

## Acceptance Criteria

> **Event-model note (authoritative over the epic's loose wording).** The epic AC says the bulk action "emits `claim.state-trustee.frozen`". The Story 6.1 event vocabulary (`packages/domain/src/claim/events.ts:313-333`) is the authority and is more precise — the freeze spans FOUR distinct events, and the ACs below map to them exactly:
> - `claim.state_trustee_frozen` — the freeze window OPENS for a claim (`verifier_approved | reversed` → `state_trustee_freeze`).
> - `claim.state_trustee_approved` — a per-claim trustee vote DURING the open freeze (`state_trustee_freeze` → `state_trustee_approved`; approved-in-principle, reversible).
> - `claim.state_trustee_denied` — a per-claim trustee deny during the freeze (`state_trustee_freeze` → `denied`).
> - `claim.approved` — the bulk-commit MILESTONE Epic 7 pool-binding + Epic 9 reconciliation key off (`state_trustee_approved` → `approved`). A DISTINCT event, not a roll-up of `state_trustee_approved`.

**AC0 — Two authorities for lifecycle-changing actions; routing writes metadata only (the 6.11/6.12 framing, narrowed).** Every LIFECYCLE-CHANGING trustee action (approve, deny, commit, and escalation-resolution) writes its `claim.state_trustee_*` / `claim.approved` / `claim.verifier_*` LIFECYCLE event (via `projectClaimState` — the sole `claims.current_state` writer, the LIFECYCLE authority) AND its `claim_state_trustee_decisions` DECISION-METADATA row atomically in ONE scope-tx, so the two can never diverge. ROUTING-ONLY actions (route-to-R9, AC4) write their routing metadata atomically and DO NOT invent a lifecycle event — there is no R9-routing event in the Story 6.1 vocabulary, and the reducer stays TOTAL (no business precondition is added to `state.ts`). Claim STATE is ALWAYS derived from event replay, NEVER from the decision row.

**AC1 — The bulk-approval LIST read model (compound, scope-safe, ~5s posture).**
**Given** the cycle-freeze workflow + AR-65 compound read models
**When** a State Trustee opens the bulk-approval surface for a Pariwar (`GET …/admin/cycle-freeze/pending`)
**Then** the surface lists, in two buckets: (a) claims in `verifier_approved` (or `reversed` — an appeal reversed a prior denial) that are READY to freeze; (b) ESCALATED claims (a live `claim_verifier_decisions` row with `outcome = 'escalated'`, still at `verifier_review`/`verification_in_progress`) awaiting State-Trustee resolution (the "verifier_flagged_for_state_trustee" set)
**And** per-case provenance is denormalized in one query: deceased member identity, the verifier's decision identity + `actor_display` + reason-code (from `claim_verifier_decisions`), a signals summary, and concealment flags (`special_flags: [concealment_review_required]` from Story 4.4) if any
**And** the read is scope-safe (RLS + explicit `pariwar_id`); rationale ciphertext is decrypted AFTER authorization at the route (the 6.10 ciphertext-as-stored rule), never in the accessor; every dynamic `.limit()` passes through `clampLimit` (the domain limit-clamp gate — [[project_domain_limit_clamp_and_savepoint_retry]]).

**AC2 — Per-claim trustee vote: approve (advance to `state_trustee_approved`).**
**Given** a candidate claim in `verifier_approved` or `reversed`
**When** the trustee approves it during the freeze
**Then** the write path emits `claim.state_trustee_frozen` (→ `state_trustee_freeze`) then `claim.state_trustee_approved` (→ `state_trustee_approved`) and inserts a `phase = 'frozen_vote'`, `outcome = 'approved'` metadata row, in one scope-tx
**And** the events carry `auditShape` ONLY (`from_state`/`to_state`/`trigger`/`actor: 'trustee'`); rationale + `actor_display` live in the metadata row (the 6.11 D-G posture)
**And** per D-F an approve carries NO required reason-code (optional/absent).

**AC3 — Per-claim trustee vote: deny (advance to `denied`; appeal eligibility).**
**Given** a candidate claim in the open freeze
**When** the trustee denies it
**Then** the write path emits `claim.state_trustee_frozen` then `claim.state_trustee_denied` (→ `denied`) + a `phase = 'frozen_vote'`, `outcome = 'denied'` metadata row
**And** per D-F a deny REQUIRES a trustee reason-code (the appeal record needs the ground; the write path + contract enforce required-on-deny)
**And** the resulting `denied` state makes the claim eligible for the Story 6.16 3-stage internal appeal (6.13 does NOT implement the appeal — it only lands the claim in `denied` from which `claim.appeal_stage1_initiated` is legal).

**AC4 — Route to R9 voting (Story 6.14) — a routing action, NOT a lifecycle change here.**
**Given** a candidate claim the trustee judges to be an R9 special case
**When** the trustee routes it to R9 voting
**Then** 6.13 writes a routing metadata row (`phase = 'routing'`, `outcome = 'routed_to_r9'`, reason-code REQUIRED per D-F) + an audit line — and NO lifecycle event (AC0); the claim's lifecycle state is unchanged
**And** the routing is DURABLE (other suggestion #4): the commit query (AC5) EXCLUDES any claim carrying a live `routed_to_r9` routing row, so the exclusion survives across requests/sessions — it is a persisted predicate, never an in-memory filter; the actual R9 panel voting + `claim.r9.outcome` is Story 6.14 (6.13 casts no R9 votes and emits no R9 events).

**AC4b — Escalation resolution: the escalated bucket is ACTIONABLE (D-C, ratified).**
**Given** an escalated claim (a live `claim_verifier_decisions` row `outcome = 'escalated'`, still at `verifier_review`/`verification_in_progress`) in bucket (b)
**When** the trustee resolves the escalation (approve or deny)
**Then** the write path ATOMICALLY supersedes the live `escalated` decision row (conditional `UPDATE … SET superseded_at = now() WHERE decision_id = $target AND superseded_at IS NULL RETURNING` — 0 rows ⇒ a concurrent resolve already won ⇒ 409, the 6.11 `reviseDecision` atomic-supersession precedent) and emits `claim.verifier_approved` (→ `verifier_approved`, joining the freeze-ready bucket (a)) or `claim.verifier_denied` (→ `denied`), plus a `claim_state_trustee_decisions` row at `phase = 'escalation_resolution'` (D-C's dedicated metadata phase) — all in one scope-tx
**And** an approved escalation then flows through the ordinary freeze/vote/commit path (AC2/AC5); a denied one lands in `denied` (appeal-eligible per AC3). R9-routing an escalated claim uses AC4 (routing metadata only).

**AC5 — Two distinct phases: a persisted freeze/vote phase, THEN a single step-up-gated COMMIT (D-D — do NOT collapse).**
**Given** the freeze/vote phase (AC2/AC3) has persisted per-claim `state_trustee_approved` / `denied` votes — a durable, reversible intermediate state, kept SEPARATE from the commit (D-D)
**When** the trustee commits the cycle freeze (`POST …/admin/cycle-freeze/commit`)
**Then** the commit requires a FRESH ~5-min step-up elevation bound to `cycle_freeze_commit` (Story 5.9 / 1.9 `requireStepUp`, added AFTER the permission hook so an unauthorized actor never reaches step-up)
**And** the commit writes a lightweight DURABLE COMMIT RECORD — a `cycle_freeze_commits` row (`commit_id`, `pariwar_id`, `actor_id`, `actor_display` snapshot, `committed_at`, the committed claim-id set, a `trigger_delivered` flag) — the audit + Epic-7-handoff anchor + the idempotency key (other suggestion #2)
**And** for each committed claim (state `state_trustee_approved`, NOT carrying a live `routed_to_r9` routing row) it emits `claim.approved` (→ `approved`) + a `phase = 'commit'` metadata row, atomically per claim
**And** the commit is idempotent: a claim already `approved` is a natural no-op (the write-path state guard); a re-submitted commit for an existing `commit_id` never double-advances a claim nor re-fires the trigger.

**AC6 — Pool-spawn trigger seam — fired AFTER the DB commit, NEVER inside the writer (other suggestion #1; the FIRST `packages/contracts/pools` contract).**
**Given** the committed set + the epic's `packages/contracts/pool-spawn-trigger` reference
**When** the AC5 commit transaction has COMMITTED successfully
**Then** the HANDLER (not the domain writer) invokes an injectable `PoolSpawnTrigger` port ONCE with the committed set (pariwar_id, `commit_id`, the frozen `{claim_case_id, deceased_member_id}` set, trustee attestation actor + timestamp) — a config-backed stub in v1 (Epic 7 Stories 7.1/7.2 are the live consumer), mirroring the `ShepherdAssignedNotificationHook` / `dispatch()` post-commit seam ([[project_channels_no_live_dispatch_yet]])
**And** the trigger runs OUTSIDE the DB transaction: a failed or slow trigger must NEVER roll back a durably-committed freeze; the `cycle_freeze_commits.trigger_delivered` flag makes the fire idempotent + redelivery safe (best-effort, non-blocking, self-healing)
**And** the trigger contract lives in `packages/contracts/src/pools/` with `.strict()` schemas; NO live Pool Engine, state machine, or snapshot surface is built or assumed here.

**AC7 — RBAC: the FIRST `state_trustee`-authorized surface (human-actor, scope-gated, audited).**
**Given** this is the first route any `state_trustee` grant authorizes against (grep-verified: `state_trustee` appears in NO `apps/api` authz today) + the geo-containment asymmetry ([[project_rbac_geo_scope_containment]])
**When** the cycle-freeze routes are gated
**Then** they require an authenticated HUMAN admin session + a scope-gated permission key (see D-B for the key + dimension decision) + tenant match — fail-closed, audited (`admin_cycle_freeze.*` audit actions)
**And** a CI test asserts no cycle-freeze adjudication endpoint can be invoked with a "system-decided" actor identity (the Story 6.10 AC5 human-attribution invariant extends to the trustee layer) — every approve/deny/commit requires an authenticated human actor with the permission.

**AC8 — R5 display-name attribution ([[project_admin_display_name_attribution]]).**
**Given** the controlled-staff display-name rule (`users.display_name`, snapshot server-side at action time, missing name BLOCKS the action with a typed error, no email-derived fallback)
**When** any trustee decision (approve/deny/route/commit) is recorded
**Then** the trustee's `display_name` is resolved server-side and snapshotted into the metadata row; a missing display name fails the action closed (no fallback) — binding this surface into the 6.11/6.12 attribution chain.

**AC9 — Concurrency + idempotency + determinism (the ₹50L discipline).**
**Given** the 6.11 concurrency posture (tx-scoped advisory lock per claim)
**When** concurrent trustee actions touch the same claim, or a commit is retried
**Then** each per-claim write takes a tx-scoped advisory lock on `(pariwarId, claimCaseId)` (the `verifierDecisionAdvisoryLockKey` precedent — a distinct namespace prefix) so concurrent votes serialize; the write-path state guard + the `events_log (stream_id, event_version)` unique index are the structural backstops; the commit is idempotent per AC5.

**AC10 — PII discipline.** Events (`events_log`) carry NON-PII `auditShape` only. Reason-code + rationale (ciphertext) + `actor_display` live in `claim_state_trustee_decisions`. The LIST read model surfaces the verifier's reason-code/display + a signals summary + concealment flags; rationale ciphertext is decrypted only AFTER authorization at the route. No deceased/nominee PII is added to `events_log`.

**AC11 — AR-61 scope note (narrowed, other suggestion #6).** 6.13 is a State-Trustee panel action, NOT a member-facing intake/verification node, and is DELIBERATELY ABSENT from the epics.md:2280 AR-61 cross-cutting list (6.2/6.3/6.5/6.6/6.7/6.10/6.11/6.12/6.14/6.16 — 6.13 is not listed). No member-facing staff-fallback path is added here; a trustee being unavailable is a cycle scheduling/quorum concern, NOT the Story 0.7 member-facing fallback-handler ledger. This AC records the omission as deliberate, not a gap — do not re-implement or reference the ledger.

## Tasks / Subtasks

- [x] **Task 1 — Contracts: cycle-freeze request/response + the pool-spawn trigger seam** (AC1/AC4/AC4b/AC5/AC6)
  - [x] `packages/contracts/src/claims/cycle-freeze.ts` — `CycleFreezePendingResponse` (the two-bucket list + per-case provenance), `CycleFreezeDecisionRequest` (`claim_case_id` is a BODY field, not a path param — unlike the 6.11 precedent's path-scoped route, this surface's RBAC is pariwar-dimension not claim-scoped, so there is no structural need for a `:claimCaseId` path segment; per-claim `approve | deny | route_to_r9 | resolve_escalation`; a `superRefine` enforces reason-code REQUIRED for `deny` + `route_to_r9`, OPTIONAL/ABSENT for `approve` — D-F; body-smuggled `actor_display` → 400, the 6.11 pattern), `CycleFreezeCommitRequest`/`Response` (`commit_id` is a CLIENT-GENERATED UUID submitted in the request and echoed in the response — the idempotency key that lets a client safely retry a commit call that failed or timed out before a response arrived, per AC5). All `.strict()`.
  - [x] `packages/contracts/src/pools/pool-spawn-trigger.ts` — the FIRST pools contract: `PoolSpawnTriggerPayload` (`pariwar_id`, `commit_id`, frozen claim set `{claim_case_id, deceased_member_id}`, trustee attestation `{actor_id, actor_display, committed_at}`). `.strict()`. New `packages/contracts/src/pools/index.ts` + wire into the top barrel (no type-shadowing in apps/api — consume via `@twt/contracts/pools`).
  - [x] Trustee reason-code vocabulary = a NEW trustee-scoped set (NOT the 6.11 `VerifierReasonCode` — D-F), kept in `@twt/domain` (the reducer/registry side, the 6.11 placement) with the contract superRefine pinned to it via a lockstep test (the 6.11 `REASON_CODE_OUTCOME_COMPAT` cross-package pin).
- [x] **Task 2 — Schema + migration `0062`: the trustee decision table (phase model) + the commit record table** (AC0/AC4/AC4b/AC5/AC8/AC10)
  - [x] `packages/domain/src/schema/claim_state_trustee_decisions.ts` mirroring `claim_verifier_decisions`, with the D-F PHASE model: `decision_id`, `claim_case_id`, `pariwar_id`, **`phase` pgEnum (`frozen_vote | commit | escalation_resolution | routing`)**, `outcome` (`approved | denied | routed_to_r9`), `reason_code` (nullable — required-per-phase enforced in the write-path/contract, not the column), `rationale_ciphertext` (nullable, `piiColumn` tier-1 the 6.11 way), `actor_id`, `actor_display` (NOT NULL — R5 snapshot), `decided_at`, `superseded_at` (nullable). FORCE RLS + tenant FK + **partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL`** (one live row per phase — D-F; NOT the 6.11 one-live-per-claim).
  - [x] `packages/domain/src/schema/cycle_freeze_commits.ts` (D-D/AC5 — the durable commit record): `commit_id`, `pariwar_id`, `actor_id`, `actor_display` (NOT NULL), `committed_at`, `committed_claim_ids` (the set), `trigger_delivered` (boolean, default false — flipped post-fire, AC6). FORCE RLS + tenant FK. This is the commit idempotency key + Epic-7 handoff anchor.
  - [x] Hand-author migration `0062_state-trustee-cycle-freeze.sql` (both tables + enums; NEVER regenerate an applied migration — [[project_live_db_test_gotchas]]); apply + verify live on `:5433`.
- [x] **Task 3 — Domain write-paths (transport-free; DB work ONLY — the trigger is the handler's job)** (AC0/AC2/AC3/AC4/AC4b/AC5/AC9)
  - [x] `packages/domain/src/claim/state-trustee-decision-persist.ts`, each advisory-locked per `(pariwarId, claimCaseId)` (distinct namespace prefix, the `verifierDecisionAdvisoryLockKey` precedent), each reusing `projectClaimState`, taking a raw `pg.PoolClient`, with typed guards → stable 4xx (the 6.11 `ClaimNotInVerifierReviewError` pattern):
    - `voteOnFrozenClaim(client, input)` — frozen→approved OR frozen→denied per claim + a `phase = 'frozen_vote'` metadata row (AC2/AC3).
    - `routeToR9(client, input)` — a DURABLE `phase = 'routing'`, `outcome = 'routed_to_r9'` metadata row (reason-code required) + audit; NO lifecycle event (AC0/AC4). The commit query filters on this live row (AC4's durable exclusion — other suggestion #4).
    - `resolveEscalation(client, input)` (D-C/AC4b) — atomically supersede the live `escalated` `claim_verifier_decisions` row (conditional UPDATE → 0 rows = 409) + emit `claim.verifier_approved`/`claim.verifier_denied` + a `phase = 'escalation_resolution'` metadata row.
    - `commitCycleFreeze(client, input)` — DB WORK ONLY: write the `cycle_freeze_commits` record, then per committed claim (state `state_trustee_approved`, no live `routed_to_r9` row) emit `claim.approved` + a `phase = 'commit'` row; idempotent on `commit_id`. **It does NOT invoke the pool-spawn trigger** (other suggestion #1 — that is the handler, post-commit, Task 6).
  - [x] Read-back helpers the commit + trigger need (the committed set, the `trigger_delivered` flip).
- [x] **Task 4 — Domain read-model** (AC1/AC10) — `packages/domain/src/claim/cycle-freeze-read.ts`: the compound pending-list query (two buckets, per-case provenance joining `claims` + `claim_verifier_decisions` + validity/concealment), scope-safe, ciphertext-as-stored, `clampLimit` on any dynamic limit.
- [x] **Task 5 — RBAC key** (AC7; D-B ratified) — add the single-dot `cycle.freeze` key to `SEED_PERMISSION_KEYS` (bump `PERMISSION_CATALOG_VERSION` 14→15 with a doc-comment rationale), grant it to **`pariwar_admin` + `super_admin`** in `roles.ts`, checked at `dimension: 'pariwar'` (value = `scopeTx.pariwarId`). The doc-comment MUST record EXPLICITLY that direct `state_trustee` authorization is DEFERRED to the Epic-3 geo-tree resolver (the 6.7/6.10 deferral precedent — so it never reads as an oversight). Update `tests/rbac.test.ts` byte-parity + the permissions test; verify per-package lint ([[project_eslint_config_per_package_cwd]]).
- [x] **Task 6 — apps/api routes + handlers** (AC1/AC4/AC4b/AC5/AC6/AC7/AC8/AC9) — `apps/api/src/modules/claims/claims.cycle-freeze.{routes,handlers}.ts`: `GET …/admin/cycle-freeze/pending`, `POST …/admin/cycle-freeze/decision` (per-claim: `approve | deny | route_to_r9 | resolve_escalation`), `POST …/admin/cycle-freeze/commit` (step-up-gated). All gated by `requirePermissionHook(deps, 'cycle.freeze', { dimension: 'pariwar', resolveValue: → scopeTx.pariwarId })` — the `member-validity`/`nominee-bank` pariwar-dimension precedent (NO server-derived-district preHandler; the target IS the tenant). `requireStepUp(deps, 'cycle_freeze_commit')` on the commit AFTER the permission hook. R5 display-name resolution + fail-closed; rationale crypto (`verifier-decision-crypto.ts` precedent); audit-or-throw (`admin_cycle_freeze.*`).
  - [x] **The commit handler fires the pool-spawn trigger AFTER the writer tx commits** (AC6/other suggestion #1): call `commitCycleFreeze` (owns BEGIN/COMMIT), and ONLY on a clean commit invoke the injected `PoolSpawnTrigger`, then flip `trigger_delivered` — best-effort, never inside the write tx, self-healing on redelivery. Register in `claims/index.ts`.
- [x] **Task 7 — Admin UI surface** (AC1/AC5) — `apps/admin/src/modules/cycle-freeze/` (the bulk-approval shell + per-case provenance rows + the step-up-gated commit action) + `apps/admin/src/routes/CycleFreezeRoute.tsx` + wire into `router.tsx` (the `/p/$pariwarId/...` pattern). Follow the `claim-verification` module patterns (VerificationDecisionStrip / ReasonCodeDropdown / AuditTrailEntry).
- [x] **Task 8 — friction-budget disposition** — add a "Story 6.13 disposition (declaration affirmed, no new row)" note to `friction-budget.md`: the surface is admin-only (State Trustee), introducing NO member-facing friction ([[project_friction_budget_baseline_ratchet]]; the 6.12 disposition precedent).
- [x] **Task 9 — Tests** (AC0–AC11) — domain live-DB: the four write-paths (vote / route-to-R9 / resolve-escalation / commit), the two-bucket read-model + scope isolation, **the durable R9 exclusion** (a `routed_to_r9` claim is absent from the commit set across a fresh query), **the phase-model uniqueness** (one live row per `(claim_case_id, phase)`), **commit idempotency on `commit_id`** (re-submit advances no claim twice), **escalation-resolution atomic supersession** (two-connection → exactly one wins / 409), and a genuine two-connection concurrency test on the vote path. apps/api integration: list authz (`cycle.freeze` @ pariwar, `pariwar_admin` passes / a district-only admin fails / cross-Pariwar 404), per-claim decision, commit step-up gate, **the post-commit trigger fires OUTSIDE the tx + a trigger failure does NOT roll back the commit + `trigger_delivered` idempotency** (AC6), human-actor gate. Contracts strict-schema + the reason-code required-on-deny/route superRefine + the cross-package lockstep pin. Migration-0062 policy-regression (RLS/FK/partial-unique on BOTH tables, mirroring `claim-shepherd-assignments-policy-regression.spec.ts`). Extend the claim-adjudication-human-actor-invariant CI gate to the cycle-freeze routes (AC7). Cover BOTH domain AND apps/api route level (the 6.12 review lesson — don't claim coverage without them).
- [x] **Task 10 — Sprint-status + ledger** — flip `development_status[6-13-…]` to `in-progress`/`review` at completion; add the `last_updated` reverse-chron COMMENT ledger entry ([[project_sprint_status_ledger]]).

### Review Findings

_bmad-code-review, 2026-07-13. Three parallel layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor) against the full uncommitted diff (4,820 lines). 17 findings survived triage, 2 dismissed as noise. Both decision-needed findings resolved and all 13 patches applied — typecheck/lint clean, all touched test suites green (domain 862/862 incl. cycle-freeze 9+2+12, contracts 334/334 incl. cycle-freeze 15, api 536/536 incl. cycle-freeze 5, admin 125/125, jobs 70/70), human-actor-invariant CI gate green._

**Addendum (same day, post-fix verification pass).** User-driven checklist walkthrough against the applied patches surfaced a NEW regression the trigger-redelivery fix (finding #1) introduced: removing the `!idempotentReplay` guard means the pre-fix code could never redeliver a failed trigger, but ALSO could never double-fire it (only a fresh, non-replay commit ever attempted delivery). The fix traded that safety for redelivery capability without closing the resulting race — two concurrent requests for the SAME `commit_id` (double-click, two tabs, a client retry racing a slow in-flight request) could both read `trigger_delivered = false` and both invoke the trigger. **Fixed**: `packages/domain/src/claim/state-trustee-decision-persist.ts` gained a SESSION-scoped advisory lock (`tryAcquireCommitTriggerLock`/`releaseCommitTriggerLock`/`getCycleFreezeCommitTriggerDelivered`, a distinct lock class from the per-claim tx-scoped locks elsewhere in the file, since this one must be held across the injected trigger's external call) — `claims.cycle-freeze.handlers.ts`'s `postCommit` now acquires it, re-checks `trigger_delivered` fresh under the lock, and only fires if still pending; a losing request never blocks, it just returns its own (possibly stale) snapshot. Verified with 2 new tests in `apps/api/tests/integration/claims/cycle-freeze.spec.ts`: a same-commit_id retry-after-failure DOES redeliver (proves the original fix works), and two genuinely concurrent same-commit_id requests (via an artificially slow trigger) fire the trigger EXACTLY ONCE with `maxConcurrentInFlight` asserted at 1 (proves the lock, not luck). All suites re-verified green post-fix (api 538/538, domain 862/862, typecheck/lint clean).

The same walkthrough also surfaced two further gaps, both now ALSO fixed (not deferred): (1) **idempotency ownership** — `commitCycleFreeze` now rejects (`CommitIdOwnershipConflictError` → 409) a `commit_id` replayed by a DIFFERENT `actorId` than the one who originally recorded it, both on the up-front replay check and on the loser side of a concurrent insert race; a defensive `CommitIdCollisionError` also replaces a raw non-null-assertion crash on the (astronomically unlikely, since `commit_id` is a client-generated global PK not composite with `pariwar_id`) case of a cross-Pariwar UUID collision. Verified with a new domain test (`packages/domain/tests/integration/claim/state-trustee-cycle-freeze.spec.ts`: a different actor reusing a commit_id is rejected, not silently handed the first actor's result). (2) **UI retry guidance** — `CycleFreezePage.tsx` now shows an explicit "trigger pending — click Commit again to retry" message when `trigger_delivered:false`, instead of just omitting the delivered clause. All suites re-verified green after both fixes (domain 863/863, api 538/538, admin 125/125, typecheck/lint clean, human-actor-invariant gate green).

**Third addendum (same day) — closing the remaining load-bearing-invariant checklist items.** Of the six items the user asked to close, four were real and addressable, closed here; one is not constructible in this system and is explained rather than faked:
1. **RBAC dimension truthfulness** — `apps/api/src/modules/claims/claims.cycle-freeze.routes.ts` now passes `{ dimension: 'pariwar' }` EXPLICITLY to `requirePermissionHook` instead of relying on the default (the behavior was already correct, but invisible at the call site). New test: a `pariwar_admin` grant (a role whose bundle DOES include `cycle.freeze`) recorded at `scope_dimension: 'district'` instead of `'pariwar'` is still denied 403 — proves a narrower/different-dimension grant can never satisfy the pariwar-wide gate ([[project_rbac_geo_scope_containment]]).
2. **Cross-Pariwar isolation** — new test covering all three routes (pending/decision/commit). Discovered along the way: the correct response is **404, not 403** — `scopeResolutionHook`'s pre-existing, deliberate "no enumeration oracle" posture (0 grants for the target Pariwar → 404, collapsing "doesn't exist" and "not a member") fires before the RBAC gate is ever reached, for an admin with ZERO grants in the target Pariwar. This matches the member-app cross-tenant precedent and is a MORE precise finding than my first draft's 403 assumption, corrected after the test failed and I read `scope-resolution/index.ts` to understand why.
3. **Runtime human-actor check beyond the CI gate** — investigated, NOT addressed with a new test, because there is nothing to test: `apps/api/src/context.ts`'s request context has no `actorType`/`actorKind` field at all; the only "system actor" concept in this codebase lives in domain event writers invoked directly by background workers (never reachable via an HTTP route). A request either has a valid human admin session (passes) or doesn't (401 — already covered by the existing `'AC7 — no session → 401'` test). There is no representable "authenticated but non-human" request to construct a test against; writing one would mean fabricating a fixture with no real analog in this system's auth model.
4. **Two-authority fault injection** — ported the `forceQueryFailure` pattern (monkey-patch `scopeTx.client.query` to reject one specific SQL statement by text, real connection otherwise) from `verifier-decision.spec.ts`'s AC0 precedent into `cycle-freeze.spec.ts`. Three new tests, one per lifecycle-changing writer: forcing the `claim_state_trustee_decisions` insert to fail on `voteOnFrozenClaim` (proves the freeze-open + approve-vote events both roll back), `routeToR9` (proves no partial routing row survives, then a clean retry succeeds), and `resolveEscalation` (proves the atomic supersession of the live `escalated` verifier decision itself rolls back — it's still LIVE after the forced failure — alongside the verdict event).

All suites re-verified green after this round: api 543/543 (+5: 2 RBAC/isolation + 3 fault-injection), domain 863/863, contracts 334/334, admin 125/125, typecheck/lint clean, human-actor-invariant gate green.

- [x] [Review][Patch] **(resolved decision)** Pool-spawn trigger redelivery is structurally impossible — contradicts AC6/D-E "self-healing" claim [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts:326-355]. Redelivery only fires when `!result.idempotentReplay && !triggerDelivered`, but resubmitting the SAME `commit_id` (the only retry path this code supports) is exactly what sets `idempotentReplay = true` — the one condition redelivery needs is the one condition that skips it. Decision: fire whenever `!triggerDelivered` regardless of `idempotentReplay` (drop the `!result.idempotentReplay` guard), so a resubmitted commit_id retries the trigger until it's delivered. Also fix `apps/admin/.../CycleFreezePage.tsx:52-57`, which regenerates a fresh `commit_id` on ANY 2xx response including `trigger_delivered:false` — only regenerate it when `trigger_delivered` is true.
- [x] [Review][Patch] **(resolved decision)** No third "voted, pending commit" bucket — trustee cannot review what Commit is about to act on [packages/domain/src/claim/cycle-freeze-read.ts]. Decision: extend the read model with a third bucket (`state_trustee_approved` claims not yet committed) alongside `ready_to_freeze`/`escalated`, and wire it into the admin surface, so the trustee sees the full set Commit is about to act on before pressing the button.

- [x] [Review][Patch] `commitCycleFreeze`'s bulk loop is all-or-nothing, not "atomically per claim" as the file header claims [packages/domain/src/claim/state-trustee-decision-persist.ts:576-589]. The whole candidate loop runs in one scope-tx; the `phase='commit'` decision-row insert (line 576) has no `isUniqueViolation` catch unlike its `voteOnFrozenClaim`/`routeToR9` siblings, so any stale conflicting row throws raw and rolls back every already-processed claim in the same commit.
- [x] [Review][Patch] Concurrent identical `commit_id` retries race past the idempotency check [packages/domain/src/claim/state-trustee-decision-persist.ts:513-522]. Check-then-insert on `commitId` is not atomic; two simultaneous retries of a failed/slow commit both pass `if (existing)` and both run the full write loop, then race uncaught on the final `cycleFreezeCommits` insert.
- [x] [Review][Patch] Route-to-R9 exclusion has gaps at both ends [packages/domain/src/claim/state-trustee-decision-persist.ts:526-558 (commit loop), voteOnFrozenClaim]. (a) The commit loop's per-claim re-check only re-reads `currentState`, not whether a routing row appeared since the initial SELECT — a claim routed to R9 mid-loop can still get committed. (b) `voteOnFrozenClaim` never checks for a live routing row, so a claim can be routed to R9 then still voted through to `state_trustee_approved`, leaving it silently stuck forever (excluded from commit, absent from both read-model buckets). (c) No writer ever supersedes a `phase='routing'` row — routing has no undo path at all.
- [x] [Review][Patch] Verifier rationale is fetched, decrypted, and shipped over the wire but never rendered [apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx, PendingCaseCard.tsx]. The backend decrypts `verifier_rationale` per-item after authorization (AC1 "full provenance"); neither admin component reads or displays the field, so the decryption cost is paid for nothing the trustee ever sees.
- [x] [Review][Patch] Reason-code dropdown is not action-aware and stale state leaks across actions [apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx:37-45,87]. Deny and route reason codes are merged into one unfiltered `<select>`; `reasonCode`/`rationale` aren't cleared before Approve/Resolve→Approve, so a leftover selection from a different action gets submitted and rejected by the backend's outcome-compat check as a confusing 400.
- [x] [Review][Patch] `commitCycleFreeze`'s candidate query has no row cap, unlike the read model's `PENDING_SCAN_CAP`/`clampLimit` [packages/domain/src/claim/state-trustee-decision-persist.ts:537-551].
- [x] [Review][Patch] No `ORDER BY` before per-claim advisory-lock acquisition in the commit loop — deadlock risk under concurrent commits [packages/domain/src/claim/state-trustee-decision-persist.ts:554-558].
- [x] [Review][Patch] `resolveEscalation`'s outcome relies on a non-null assertion with no handler-level runtime guard [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts:256-259]. `body.escalation_outcome!` trusts the contract superRefine with no defense-in-depth re-check, unlike the reason-code compat check which IS re-validated domain-side.
- [x] [Review][Patch] `postDecision`'s switch has no `default` branch [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts:245-261]. Currently type-safe only because the action union has exactly four members; an unmatched action throws a raw "used before assigned" error instead of a clean 400.
- [x] [Review][Patch] Fail-soft rationale decryption collapses "absent" and "failed to decrypt" into the same empty string [apps/api/src/modules/claims/claims.cycle-freeze.handlers.ts:174-185, state-trustee-decision-crypto.ts]. `null` (no rationale) and a decrypt failure (bad envelope/KMS issue) both render as `''` with no operator-visible signal, on a high-stakes financial-approval decrypt path.
- [x] [Review][Patch] `TRUSTEE_VOTABLE_STATES` includes an unreachable `state_trustee_freeze` branch with a misleading comment [packages/domain/src/claim/state-trustee-decision-persist.ts:64-67]. The comment claims the freeze is "already opened by a prior claim's vote in the same cycle," but the freeze is per-claim (D-A) and `voteOnFrozenClaim` always opens+casts atomically in one call — this branch is never the entry state for any call in this diff. Fix the comment (or confirm/remove the dead branch).

- [x] [Review][Defer] `cycle_freeze_commits` RLS coverage is asymmetric with its sibling table [packages/domain/tests/integration/rls/state-trustee-cycle-freeze-policy-regression.spec.ts] — deferred. `claim_state_trustee_decisions` gets a 42501-rejection test AND an indexes-exist test; `cycle_freeze_commits` gets neither (12 `it()` blocks total, correcting the "16" the earlier create-story/dev-story ledger entries claimed). The two SIBLING gaps in this original finding — cross-Pariwar isolation + explicit dimension testing — were CLOSED below, not deferred.
- [x] [Review][Defer] `cycle-freeze-read.ts`'s `readyRows` left-join doesn't distinguish `reversed`-state claims' live verifier-decision provenance [packages/domain/src/claim/cycle-freeze-read.ts:85-111] — deferred, pre-existing. Possible stale/contradictory "denied" provenance shown for a `reversed` (appeal-won) claim if the original denial decision isn't superseded by the appeals flow. Verifying requires the appeals module, outside this diff's scope.
- [x] [Review][Defer] Fixed 500-row `PENDING_SCAN_CAP` with no overflow signal [packages/domain/src/claim/cycle-freeze-read.ts:43] — deferred, pre-existing. Matches this codebase's established pattern (a deliberate defensive bound per the file's own comment); worth a backlog item once Pariwar claim volumes approach the cap.
- [x] [Review][Defer] `concealment_review_required` is computed from full decision history, not live state, with no documented handling of a reversed/overridden concealment review [packages/domain/src/claim/cycle-freeze-read.ts:150-163] — deferred, pre-existing. A concealment flag raised and later reversed/overridden still shows as `concealment_review_required`; plausible ("review occurred") but undocumented as a deliberate choice the way other historical-vs-live distinctions in this file are called out.
- [x] [Review][Patch] (addendum) The commit idempotency key (`commit_id`) wasn't bound to actor ownership — a replay by a DIFFERENT actor than the one who recorded it would have silently returned that actor's committed result [packages/domain/src/claim/state-trustee-decision-persist.ts:commitCycleFreeze]. Fixed: `CommitIdOwnershipConflictError` (→ 409) on an actor mismatch, checked both on the up-front replay lookup and on the loser side of a concurrent insert race; a `CommitIdCollisionError` also replaces a raw non-null-assertion crash on the (~impossible, but no longer uncaught) cross-Pariwar UUID-collision case. New domain test proves it.
- [x] [Review][Patch] (addendum) Admin UI didn't distinguish "committed, trigger still pending" from "committed, trigger delivered" beyond the trailing clause on the success line [apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx]. Fixed: an explicit "trigger pending — click Commit again to retry (safe, won't re-approve)" message now shows whenever `trigger_delivered:false`.

## Dev Notes

### The Epic-6 rhythm 6.13 slots into

6.1 committed the claim primitive (states + 28 events + the total reducer). 6.10 built the verifier console (read). 6.11 built the verifier decision strip (approve/deny/escalate write + two-authority pattern + `claim_verifier_decisions`). 6.12 built shepherd assignment (annotation + metadata table + R5 attribution). **6.13 is the State-Trustee layer above the verifier** — it consumes verifier-approved (and escalated) claims and drives them to the `approved` milestone that Epic 7's Pool Engine keys off. It reuses, almost verbatim, the 6.11 two-authority-in-one-tx + advisory-lock + typed-guard + server-derived-authz + R5-snapshot machinery.

### D-A — Events + states already exist; 6.13 is surface + write-path + read-model (FIRM)

`packages/domain/src/claim/state.ts:196-216` and `events.ts:313-333` already declare the whole cycle-freeze vocabulary. **Do NOT add states or events.** The reducer transitions are: `verifier_approved | reversed → (state_trustee_frozen) → state_trustee_freeze → (state_trustee_approved) → state_trustee_approved → (approved) → approved`, and `state_trustee_freeze → (state_trustee_denied) → denied`. The reducer stays TOTAL — all correctness lives in the write path (the ground-inspection/nominee-bank/verifier lesson), never in `state.ts`.

### D-B — RBAC: the FIRST `state_trustee` surface — RATIFIED 2026-07-13

Grep-verified facts: `state_trustee` has `scopeCeiling: 'state'` and holds `claim.approve` (`roles.ts:156`), but authorizes NO route in `apps/api` today — 6.13 is the first. The geo-containment reality ([[project_rbac_geo_scope_containment]], `scope.ts`): a `state`-ceiling role **cannot hold a `pariwar` grant** (`scopeWithinCeiling('pariwar','state')` is false) and a `state` grant **cannot satisfy a `pariwar`-dimension check** (target broader than grant → deny). Exact-node `state` matching WOULD work today — but there is **no Pariwar→state geo data** (no `pariwars` base table with a state column; the geo tree is Epic 3). The cycle-freeze targets the Pariwar (tenant), which is `pariwar`-dimension.

**RATIFIED (BigDev, 2026-07-13):** accept the Pariwar-scoped path. Add a new single-dot key `cycle.freeze` checked at `dimension: 'pariwar'` (value = `scopeTx.pariwarId`, resolvable TODAY — the `member-validity`/`nominee-bank` handler precedent), granted to **`pariwar_admin` + `super_admin`**. Direct `state_trustee` authorization is DEFERRED to the Epic-3 geo-tree resolver (the 6.7 block_admin + 6.10 state_trustee deferral precedent + the `validity.invalidate_cache`/`pariwar.configure_channels` pariwar-wide-key precedent) and documented in `permissions.ts`/`roles.ts`/this story. **v1 actor is `pariwar_admin` acting as Trustee-Lite** — the story keeps its "State Trustee" framing for the eventual Epic-3 grant, but v1 gates on `pariwar_admin`. Record the deferral EXPLICITLY (the 6.12 review lesson: a deliberate authz deferral must read as deliberate, not as an oversight).

### D-C — The escalated ("verifier_flagged_for_state_trustee") resolution seam — RATIFIED 2026-07-13

The epic lists escalated cases as actionable, but the machine does NOT admit `verifier_review`/`verification_in_progress` → `state_trustee_freeze` (only `verifier_approved | reversed`), and `adjudicateClaim` throws `ClaimDecisionConflictError` when a live `escalated` decision row exists (`verifier-decision-persist.ts:295-300`) — so there is currently **no path to resolve an escalated claim.** 6.13 owns that seam.

**RATIFIED (BigDev, 2026-07-13):** implement ACTIONABLE escalation resolution in a SEPARATE bucket (AC4b). A `resolveEscalation` writer ATOMICALLY supersedes the live `escalated` `claim_verifier_decisions` row (conditional `UPDATE … WHERE decision_id = $target AND superseded_at IS NULL RETURNING` — 0 rows ⇒ 409, the 6.11 `reviseDecision` precedent) and emits `claim.verifier_approved` (→ `verifier_approved`, joins the freeze-ready bucket) or `claim.verifier_denied` (→ `denied`), plus a DEDICATED trustee metadata row at `phase = 'escalation_resolution'`. Minimal by design — R9 routing stays Story 6.14; the escalation writer only moves the claim into a machine-legal state, from which the ordinary freeze/vote/commit flow (or the appeal) proceeds.

### D-D — Separate freeze/vote and commit phases; lightweight commit record required — RATIFIED 2026-07-13

Epic 7 owns pools/cycles; there is no cycle table. v1's "cycle" = the current set of pending candidates in the Pariwar. The **freeze-commit DEFINES the cycle boundary** by emitting `claim.approved` for the selected set. Do NOT invent a cycle-scheduling object here — that is Epic 7.

**RATIFIED (BigDev, 2026-07-13):** (1) PRESERVE the two phases — the freeze/vote phase (per-claim `state_trustee_frozen`→`state_trustee_approved`/`denied`, durable + reversible) is DISTINCT from the commit phase (`claim.approved` + step-up); do NOT collapse them into one action (overrides the create-time draft's collapse suggestion). (2) A lightweight DURABLE commit record is REQUIRED (not merely recommended): a `cycle_freeze_commits` row (`commit_id`, pariwar, actor + `actor_display`, `committed_at`, committed claim-id set, `trigger_delivered` flag) — it is the commit's idempotency key, the audit anchor, and the durable payload the post-commit pool-spawn trigger (D-E) reads. See Task 2.

### D-E — Pool-spawn trigger = the FIRST pools contract + a POST-COMMIT injectable seam ([[project_channels_no_live_dispatch_yet]])

`packages/contracts/src/pools/` is empty (README only; substantive contracts land at 7.1/7.2/7.3+). 6.13 authors ONLY the trigger contract + fires it through an injectable `PoolSpawnTrigger` port (config-backed stub in v1, exactly the `ShepherdAssignedNotificationHook` / `dispatch()` seam shape). NO live Pool Engine, state machine, or snapshot surface here — those are Epic 7.

**RATIFIED (BigDev, 2026-07-13, other suggestion #1):** the trigger MUST NOT run inside the database writer's transaction. The domain `commitCycleFreeze` writer does the DB work only (per-claim `claim.approved` + the `cycle_freeze_commits` record); the HANDLER fires the `PoolSpawnTrigger` AFTER that tx has COMMITTED (the `ShepherdAssignedNotificationHook` post-commit precedent). A failed/slow trigger must never roll back a durably-committed freeze; `cycle_freeze_commits.trigger_delivered` makes the fire idempotent + redelivery self-healing (best-effort, non-blocking). This mirrors the 6.12 rule that the notification hook fires post-commit, never inside the write tx.

### D-F — Two-authority write + the `claim_state_trustee_decisions` table + a PHASE model — RATIFIED 2026-07-13

Mirror 6.11/6.12: every lifecycle-changing trustee action = lifecycle event + metadata row in one scope-tx (AC0); routing writes metadata only. The metadata row carries the R5 `actor_display` snapshot (AC8) + reason-code/rationale — the events carry `auditShape` only.

**RATIFIED (BigDev, 2026-07-13):**
- **Phase model for uniqueness (other suggestion #5).** A claim legitimately accrues MULTIPLE rows across the flow, so the `claim_verifier_decisions` "one live per claim" partial-unique does NOT transfer. Add a `phase` discriminator column — `{ 'frozen_vote', 'commit', 'escalation_resolution', 'routing' }` — and make uniqueness PER-PHASE (partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL`, so a claim has at most one live row per phase). This gives the freeze/vote → commit progression + the escalation-resolution + the routing exclusion each their own clean, queryable, supersedable slot.
- **Trustee-specific reason codes (other suggestion / D-F).** Trustee decisions use their OWN reason-code vocabulary (a new domain pgEnum — NOT a reuse of the 6.11 `VerifierReasonCode` set), REQUIRED for `deny` and `routed_to_r9`, OPTIONAL/ABSENT for `approve`. Enforced in BOTH the contract (superRefine, the 6.11 pattern) AND the domain write-path (defense-in-depth). The `actor_display` snapshot is required by R5 on every phase regardless.

### D-G — Step-up gates the commit (the 6.11 revise precedent)

`requireStepUp(deps, 'cycle_freeze_commit')` on the commit route, added AFTER the permission hook (so an unauthorized actor never reaches step-up) — verbatim the `claims.verification-decision.routes.ts:116` revise pattern. The per-claim votes + freeze-open are NOT independently step-up-gated; the COMMIT is the single trustee attestation the epic calls "a single trustee-attestable action". `StepUpRequest`/`StepUpVerify` contracts already exist (`contracts/src/auth/step-up.ts`); the gate middleware is `apps/api/src/modules/step-up/gate.ts`.

### Prior-story intelligence (6.11/6.12 patterns to COPY, gotchas to AVOID)

- **Two-authority-in-one-scope-tx** + **tx-scoped advisory lock per claim** (`verifierDecisionAdvisoryLockKey`, distinct namespace prefix) + **typed write-path guards → stable 4xx** + **server-derived authz (never client-submitted; a preHandler stashes it, the sync `resolveValue` reads the stash)** + **R5 `actor_display` resolved server-side, missing-name fails closed** — all reusable near-verbatim.
- **The reducer stays TOTAL** — never encode "must be in `state_trustee_freeze`" in `state.ts`; it lives in the write-path guard.
- **6.12 review lessons (do NOT repeat):** (1) do NOT claim coverage without an `apps/api` route-level integration test (self/permission/cross-tenant/audit) AND a genuine two-connection concurrency test; (2) document any deliberate authz bypass/deferral explicitly rather than leaving it to read as an oversight; (3) add a migration-level policy-regression spec (RLS/FK/partial-unique) mirroring `claim-shepherd-assignments-policy-regression.spec.ts`.
- **Live-DB gotchas** ([[project_live_db_test_gotchas]]): never regenerate migration 0062; never reset via DROP SCHEMA; own-committing writers accumulate rows → assert membership not counts; test DB = `twt-test-pg` on `:5433`. Run the DB-gated suites via `pnpm ci:local` ([[project_ci_actions_suspension_local_mirror]], `--concurrency=4` [[project_ci_local_concurrency_oversubscription]]).
- **Savepoint retry** if any writer retries on 23505 inside a scope-tx ([[project_domain_limit_clamp_and_savepoint_retry]]); the domain-invariants gate clamps EVERY dynamic `.limit()`.

### Project Structure Notes

- Domain claim code: `packages/domain/src/claim/*` (write-paths transport-free; barrel is claim-namespaced — write-path guards are NOT surfaced at the top-level barrel, the route maps them to 4xx).
- Contracts: claims in `packages/contracts/src/claims/`, the new pools seam in `packages/contracts/src/pools/`. `.strict()` everywhere; no type-shadowing in apps/api (consume `import type … from '@twt/contracts/pools'`).
- API: `apps/api/src/modules/claims/claims.cycle-freeze.{routes,handlers}.ts`, registered in `claims/index.ts` next to `registerVerificationDecisionRoutes`.
- Admin: `apps/admin/src/modules/cycle-freeze/` + `routes/CycleFreezeRoute.tsx` + `router.tsx` (TanStack Router, `/p/$pariwarId/...`).
- RBAC: keys in `packages/domain/src/rbac/permissions.ts`, grants in `roles.ts`, byte-parity in `tests/rbac.test.ts` ([[project_eslint_config_per_package_cwd]] — verify per-package lint).

### Testing standards summary

Vitest live-DB (domain) against `twt-test-pg:5433`; apps/api integration against the same; contracts unit. Merge gate = `pnpm ci:local` (green locally, GitHub Actions suspended). Required new coverage: the three write-paths (approve/deny/route + commit + escalation-resolution), the compound read-model (two buckets + provenance + scope isolation), a genuine two-connection concurrency test, commit idempotency, the AC7 human-actor CI assertion, and the migration-0062 policy-regression spec. Watch Fastify `onSend` double-send if adding body-independent headers ([[project_fastify_onsend_doublesend]]).

### References

- Epic + story: `_bmad-output/planning-artifacts/epics.md#Story-6.13` (lines 2527-2539); Epic 6 overview (2258-2281).
- Claim state machine + events: `packages/domain/src/claim/state.ts:196-216`, `events.ts:313-333, 438-507`.
- Two-authority write precedent: `packages/domain/src/claim/verifier-decision-persist.ts` (Story 6.11).
- Read-model precedent: `packages/domain/src/claim/verifier-console-read.ts` (Story 6.10).
- Route + step-up precedent: `apps/api/src/modules/claims/claims.verification-decision.routes.ts`; step-up gate `apps/api/src/modules/step-up/gate.ts`; contracts `packages/contracts/src/auth/step-up.ts`.
- RBAC: `packages/domain/src/rbac/{permissions,roles,scope,check}.ts`; pools seam target `packages/contracts/src/pools/README.md`.
- Migration precedent: `packages/domain/migrations/0060_claim-shepherd-assignments.sql`, `0061_shepherd-contact-e164-check.sql` (next number: `0062`).
- Related memories: [[project_admin_display_name_attribution]] · [[project_rbac_geo_scope_containment]] · [[project_channels_no_live_dispatch_yet]] · [[project_domain_limit_clamp_and_savepoint_retry]] · [[project_live_db_test_gotchas]] · [[project_sprint_status_ledger]] · [[project_friction_budget_baseline_ratchet]].

### Ratified decisions (BigDev, 2026-07-13) — baked into the ACs/tasks above

1. **D-B (RBAC).** RATIFIED — Pariwar-scoped `cycle.freeze` key at `dimension: 'pariwar'`, granted to `pariwar_admin` + `super_admin`; direct `state_trustee` authorization DEFERRED to Epic 3 (documented explicitly). v1 actor = `pariwar_admin` acting as Trustee-Lite.
2. **D-C (escalated claims).** RATIFIED — ACTIONABLE escalation resolution in a SEPARATE bucket (AC4b), with atomic supersession of the live `escalated` decision + a dedicated `phase = 'escalation_resolution'` metadata row.
3. **D-F (trustee reason codes).** RATIFIED — trustee-SPECIFIC reason codes (new domain enum, not a 6.11 reuse); REQUIRED for `deny` and `route_to_r9`, OPTIONAL/ABSENT for `approve`.
4. **D-D (phasing).** RATIFIED — PRESERVE the separate freeze/vote and commit phases; do NOT collapse them (overrides the create-time draft's collapse suggestion).

Additional refinements ratified the same day (baked into AC0/AC4/AC5/AC6 + Tasks 2/3/6):
- **(#1) The pool-spawn trigger must NOT run inside the DB writer** — the handler fires it AFTER the commit tx, best-effort, self-healing (AC6, Task 3/6).
- **(#2) A lightweight durable commit record is required** — the `cycle_freeze_commits` table (AC5, Task 2).
- **(#3) AC0 narrowed** — lifecycle-changing actions write event + metadata atomically; routing-only actions write metadata and invent NO lifecycle event (resolves the prior AC0/AC4 contradiction).
- **(#4) "Route to R9 removes from the commit set" is now a DURABLE predicate** — the commit query excludes claims carrying a live `routed_to_r9` routing row (AC4, Task 2/3).
- **(#5) Decision-table uniqueness uses a PHASE model** — `phase` discriminator + partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL` (D-F, Task 2).
- **(#6) AC11 narrowed** — 6.13 is deliberately absent from the epics.md:2280 AR-61 list; no member-facing fallback path is added here.

## Change Log

| Date | Description |
| --- | --- |
| 2026-07-13 | **Story 6.13 IMPLEMENTED → review (bmad-dev-story).** All 10 tasks complete. Landed: the trustee decision vocabulary + the two-authority write-paths (voteOnFrozenClaim / routeToR9 / resolveEscalation / commitCycleFreeze) + the compound two-bucket read model in `@twt/domain`; the `claim_state_trustee_decisions` (phase model) + `cycle_freeze_commits` tables (migration 0062, applied+verified live on :5433); the FIRST `packages/contracts/pools` contract (PoolSpawnTriggerPayload) + the apps/jobs injectable `PoolSpawnTrigger` port (console stub, no live Epic-7 consumer); the cycle-freeze DTOs (superRefine, lockstep-pinned); the new `cycle.freeze` RBAC key (catalog 14→15, pariwar-dimension, granted pariwar_admin+super_admin, state_trustee DEFERRED to Epic 3); the apps/api routes/handlers (pending/decision/step-up-gated commit + the POST-COMMIT trigger seam); the apps/admin bulk-approval surface; the friction-budget disposition; the human-actor CI gate extension. Tests: domain live-DB 9 + concurrency 2 + policy-regression 16 + contracts 15 + apps/api integration 5 — all green; `pnpm ci:local` merge gate green. |
| 2026-07-13 | **All four residuals RATIFIED by BigDev + six refinements, baked into ACs/tasks; stays ready-for-dev.** D-B = Pariwar-scoped `cycle.freeze` @ `dimension:'pariwar'`, granted `pariwar_admin`+`super_admin`, direct `state_trustee` gating DEFERRED to Epic 3 (v1 actor = pariwar_admin-as-Trustee-Lite). D-C = actionable escalation resolution in a separate bucket (AC4b) with atomic supersession + a dedicated `escalation_resolution` metadata phase. D-F = trustee-specific reason codes, required for deny + route-to-R9, optional/absent for approve. D-D = KEEP the freeze/vote and commit phases separate (do NOT collapse). REFINEMENTS: (#1) the pool-spawn trigger fires from the HANDLER after the commit tx, never inside the DB writer; (#2) a durable `cycle_freeze_commits` record is required (idempotency key + Epic-7 handoff anchor); (#3) AC0 narrowed — lifecycle-changing actions write event+metadata atomically, routing-only actions write metadata + invent no lifecycle event (resolves the AC0/AC4 contradiction); (#4) route-to-R9 exclusion is a durable predicate the commit query filters on, not an in-memory removal; (#5) decision-table uniqueness uses a `phase` discriminator + partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL`; (#6) AC11 narrowed — 6.13 is deliberately absent from the epics.md:2280 AR-61 list, no member-facing fallback added. |
| 2026-07-13 | **Story 6.13 drafted via bmad-create-story → ready-for-dev.** State Trustee Cycle-Freeze Approval (Bulk-Approval Surface) `[SURFACE]`. Reuses the 6.1 vocabulary (no new states/events) + the 6.11/6.12 two-authority-in-one-tx + advisory-lock + typed-guard + server-derived-authz + R5-snapshot machinery. Lands: the `claim_state_trustee_decisions` metadata table (migration 0062); three domain write-paths (frozen→approved/denied vote, R9-routing, step-up-gated bulk `claim.approved` commit) + an escalation-resolution seam; the compound two-bucket pending read-model; the FIRST `packages/contracts/pools` contract (the injectable `PoolSpawnTrigger` seam, no live Epic-7 consumer); the FIRST `state_trustee`-authorized route + a new `cycle.freeze` key (catalog 14→15); the admin bulk-approval surface; a friction-budget disposition note. Four residuals surfaced with recommended defaults — the load-bearing one is the RBAC dimension for the first state_trustee surface (D-B), which may reframe the v1 actor to pariwar_admin. |

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- Migration 0062 applied + verified live on `:5433` (2 tables, 3 enums, FORCE RLS on both, per-phase partial-unique, 4 policies).
- Domain live-DB spec `state-trustee-cycle-freeze.spec.ts` — 9/9 pass; concurrency spec — 2/2; policy-regression — 16/16; contracts — 15/15; apps/api integration — 5/5.
- `claim-adjudication-human-actor-invariant` gate extended to the 3 cycle-freeze routes — passes (all compose `[requireAdminSession, scopeResolutionHook, requirePermissionHook(cycle.freeze)]`, no machine actor).
- `domain-invariants:check` initially flagged the two `.limit(cap)` scans in `cycle-freeze-read.ts` (a hoisted `clampLimit` var isn't recognised); fixed by inlining `clampLimit(PENDING_SCAN_CAP, capOpts)` in each `.limit()`.
- `pii:check` / `crypto:check` / `schema:check` / `claim-state:check` / `claim-canonical-id:check` / openapi-determinism — all green. openapi/v1.yaml byte-identical (admin claim routes are not registered there, consistent with 6.10/6.11/6.12).

### Completion Notes List

- **No new lifecycle states/events** — Story 6.1 already committed the full cycle-freeze vocabulary + total reducer; 6.13 is the FIRST live emitter (`claim.state_trustee_frozen` / `_approved` / `_denied` / `claim.approved`) and the FIRST `state_trustee`-authorized surface.
- **Two-authority-in-one-scope-tx (AC0)** near-verbatim from 6.11: every lifecycle-changing verb writes the event (via `projectClaimState`) + the `claim_state_trustee_decisions` metadata row atomically; routing writes metadata only and invents no lifecycle event; the reducer stays TOTAL.
- **PHASE model (D-F)** — `phase ∈ {frozen_vote, commit, escalation_resolution, routing}` with partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL` (one live row per phase, NOT the 6.11 one-live-per-claim).
- **Trustee-specific reason codes** (`state_trustee_reason_code` domain pgEnum: standing_not_met / documents_insufficient / concealment_upheld / r9_special_case / other) — a NEW set, NOT the 6.11 `VerifierReasonCode`; required for deny + route_to_r9, optional/absent for approve; enforced in BOTH the contract superRefine AND the domain write-path, cross-package lockstep-pinned.
- **Durable R9 exclusion (AC4)** — `routeToR9` writes a persisted `phase='routing'` row; `commitCycleFreeze` EXCLUDES claims carrying a live routing row via a `notInArray(subquery)` predicate (a persisted predicate, never an in-memory filter).
- **Commit + trigger seam (AC5/AC6)** — `commitCycleFreeze` is DB-only (writes `cycle_freeze_commits`, per-claim `claim.approved`, idempotent on the client-generated `commit_id`); the HANDLER fires the injectable `PoolSpawnTrigger` (first `packages/contracts/pools` contract + apps/jobs port + console stub) POST-COMMIT, best-effort, then flips `trigger_delivered` — a trigger failure never rolls back the freeze (proven by the throwing-trigger integration test).
- **RBAC (D-B)** — new single-dot `cycle.freeze` key (catalog 14→15) checked at `dimension:'pariwar'`, granted to `pariwar_admin` + `super_admin`; direct `state_trustee` authorization DEFERRED to the Epic-3 geo-tree resolver, documented explicitly in permissions.ts/roles.ts (the 6.7/6.10 deferral precedent). v1 actor = pariwar_admin-as-Trustee-Lite.
- **Concealment indicator** — the sibling 6.10 verifier console deliberately returns `not_evaluated` for concealment (won't infer from volatile/redacted validity). This read surfaces the DURABLE signal that ships — `concealment_review_required` when the claim's verifier-decision history carries a concealment reason-code — and DEFERS a validity-service-sourced member flag to the same integration the 6.10 tri-state awaits.
- **Deliberate convention deviation** — the story's Task-1 note says consume the pools contract via `@twt/contracts/pools`, but this package has NO subpath `exports` map (top-barrel-only, per the claims/index.ts convention). Followed the established convention: pools is exported through the TOP barrel and consumed via `@twt/contracts` (importing the type, no shadowing). openapi/v1.yaml unchanged (internal seam, no `.openapi()`).
- **Escalation resolution (AC4b)** — `resolveEscalation` atomically supersedes the live `escalated` `claim_verifier_decisions` row (0-row conditional UPDATE ⇒ 409), enters review first when still `verification_in_progress` (the reducer only advances `verifier_review → verifier_approved/denied`), then emits `claim.verifier_approved`/`_denied` + a `phase='escalation_resolution'` metadata row.

### File List

**New — packages/domain**
- `packages/domain/src/claim/state-trustee-decision.ts` — trustee decision vocabulary (phase/outcome/reason-code pgEnums + compat/required rules)
- `packages/domain/src/claim/state-trustee-decision-persist.ts` — the four write-paths + typed guards + read-back helpers
- `packages/domain/src/claim/cycle-freeze-read.ts` — the compound two-bucket pending read model
- `packages/domain/src/schema/claim_state_trustee_decisions.ts` — the DECISION-METADATA table (phase model)
- `packages/domain/src/schema/cycle_freeze_commits.ts` — the durable commit record table
- `packages/domain/src/policies/claim-state-trustee-decisions-rls.ts` — tenant-isolation RLS
- `packages/domain/src/policies/cycle-freeze-commits-rls.ts` — tenant-isolation RLS
- `packages/domain/migrations/0062_state-trustee-cycle-freeze.sql` — both tables + 3 enums + FKs + FORCE RLS + partial-unique + policies
- `packages/domain/tests/integration/claim/state-trustee-cycle-freeze.spec.ts` — live-DB write-paths + read-model + R9 exclusion + phase uniqueness + commit idempotency (9 tests)
- `packages/domain/tests/integration/claim/state-trustee-cycle-freeze-concurrency.spec.ts` — two-connection vote + escalation supersession races (2 tests)
- `packages/domain/tests/integration/rls/state-trustee-cycle-freeze-policy-regression.spec.ts` — migration/RLS/FK/per-phase partial-unique on both tables (16 tests)

**Modified — packages/domain**
- `packages/domain/src/ids/index.ts` — `TrusteeDecisionId` + `CycleFreezeCommitId` brands
- `packages/domain/src/schema/index.ts` — barrel the two new tables
- `packages/domain/src/policies/index.ts` — barrel the two new policies
- `packages/domain/src/claim/index.ts` — barrel the vocabulary + write-paths + read-model
- `packages/domain/src/rbac/permissions.ts` — `cycle.freeze` key + catalog 14→15 + D-B deferral note
- `packages/domain/src/rbac/roles.ts` — grant `cycle.freeze` to `pariwar_admin`
- `packages/domain/tests/rbac/permissions.test.ts` + `tests/rbac/roles.test.ts` — catalog/grant assertions
- `packages/domain/migrations/meta/_journal.json` — migration 0062 entry

**New/Modified — packages/contracts**
- `packages/contracts/src/pools/pool-spawn-trigger.ts` (new) + `pools/index.ts` (new) — the FIRST pools contract
- `packages/contracts/src/claims/cycle-freeze.ts` (new) — pending/decision/commit DTOs + superRefine
- `packages/contracts/src/index.ts` + `src/claims/index.ts` — barrel wiring
- `packages/contracts/tests/claims-cycle-freeze.test.ts` (new) — superRefine + lockstep pin (15 tests)

**New/Modified — apps/api**
- `apps/api/src/modules/claims/claims.cycle-freeze.{routes,handlers}.ts` (new) + `state-trustee-decision-crypto.ts` (new)
- `apps/api/src/modules/claims/index.ts` — register the routes
- `apps/api/src/context.ts` — `CLAIM_STATE_TRUSTEE_DECISION_FIELD_CLASS`
- `apps/api/src/audit/audit-sink.ts` — `admin_cycle_freeze.*` audit event types
- `apps/api/tests/integration/claims/cycle-freeze.spec.ts` (new) — authz + step-up + human-actor + trigger seam (5 tests)

**New/Modified — apps/jobs**
- `apps/jobs/src/pool-spawn-trigger.ts` (new) — the injectable `PoolSpawnTrigger` port + console stub + fakes
- `apps/jobs/src/index.ts` — barrel the port

**New/Modified — apps/admin**
- `apps/admin/src/modules/cycle-freeze/{CycleFreezePage,PendingCaseCard,index}.tsx` (new) + `routes/CycleFreezeRoute.tsx` (new)
- `apps/admin/src/router.tsx` — the `/p/$pariwarId/cycle-freeze` route
- `apps/admin/src/api/client.ts` + `api/hooks.ts` — the three cycle-freeze API methods + hooks

**Modified — repo-root**
- `scripts/claim-adjudication-human-actor-invariant/check.ts` — extend the coverage set to the cycle-freeze routes
- `friction-budget.md` — Story 6.13 disposition (admin-only, no new row)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 6-13 flip + ledger
