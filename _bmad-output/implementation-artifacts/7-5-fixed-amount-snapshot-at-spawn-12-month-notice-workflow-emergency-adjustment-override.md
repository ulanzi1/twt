---
baseline_commit: 05a8d500730c9cc7414b52c6ed1b03444433d598
---

# Story 7.5: Fixed-Amount Snapshot at Spawn + 12-Month Notice Workflow + Emergency Adjustment Override

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Trustee Panel setting the fixed contribution amount per pool,
I want each pool's `fixed_amount` snapshotted at spawn + future changes announced ≥ 12 months in advance, with a documented emergency adjustment override path,
so that members can plan contributions reliably while the trust retains capacity for genuine emergencies.

**This is the [CONSUMER] story that retires the last hardcoded pool-spawn input.** Today the amount
every pool snapshots is a single boot-time env constant (`POOL_SPAWN_FIXED_AMOUNT_INR`, default ₹500 —
`apps/jobs/src/boot.ts:139`), fed statically into the spawn saga. Story 7.5 replaces that constant with
a **per-Pariwar, effective-dated, trustee-governed schedule**: the saga reads the amount *effective at the
cycle-freeze `committed_at`*, so the snapshot each pool carries is the policy-correct amount at the moment
the cycle froze — deterministic, replay-reproducible, and immutable for the pool's life. The 12-month
notice and the emergency override are the two write-paths that fill that schedule; the snapshot-at-spawn
contract makes both **structurally non-retroactive** to already-spawned pools.

## Acceptance Criteria

Sourced verbatim-in-intent from `epics.md#Story 7.5` (lines 2712–2728). Refined with the resolved design
decisions (D1–D6) in Dev Notes.

1. **The effective-dated fixed-amount schedule + standard change workflow** (`FR-15`). A per-Pariwar
   `fixed_amount` schedule exists with **effective-window semantics** (mirroring
   `terms_and_conditions_versions`): each entry carries `effective_from`, a monotonic `version`, and an
   open-ended `effective_until` (NULL) superseded when a later entry takes effect. A trustee can **set or
   schedule** a `fixed_amount` change via the admin surface. **Standard changes require
   `effective_from >= (DB now() + 365 days)`** — the 12-month notice, enforced against **DB-authoritative
   time** (`now()`, §1.11), never an app-server clock. The change is **audit-logged** (non-PII) and fires
   the **member-notification scaffolding seam** (Story 5.1 dispatcher — a `console` placeholder hook per
   the `NiyamavaliAmendedHook`/`DeployTrigger` precedent; NO live fan-out — see D4).

2. **Snapshot at spawn (the load-bearing consumer wiring).** At cycle spawn (Story 7.3 parent →
   `planCycleSpawn`), each pool snapshots **the `fixed_amount` effective at the cycle-freeze date** —
   resolved from the schedule at the durable `cycle_freeze_commits.committed_at` (the same instant the
   name/identifier allocation already uses; **never the clock**). The snapshot is **immutable for the life
   of the pool** (it already rides the `pool.spawned` event payload + `pool_snapshots`, Story 7.1). The
   boot-time `POOL_SPAWN_FIXED_AMOUNT_INR` env path is retired from the live spawn wiring (see D2/D5 for
   its genesis-seed disposition).

3. **The emergency adjustment override.** An emergency override requires: **(a)** State-Trustee **panel
   attestation** captured as an **immutable Emergency Adjustment Record** — a first-class, append-only
   historical attestation that *references the schedule version it attests*, records the *panel composition*
   (roster of `{actor_id, actor_display}`), and records *attestation metadata* (attesting actor + resolved R5
   display + `attested_at`), all **step-up-gated** (governance posture equivalent to R9 — step-up, recorded
   trustee attestation, auditability — **without** the R9 voting lifecycle; see D3); **(b)** a **documented
   reason** constrained to *policy/operational* justification (reserve adequacy, inflation, regulatory
   change, actuarial review, financial sustainability) — **never member-specific** information; **(c)** an
   **audit log line carrying the full panel attestation** (roster + reason_code — non-PII); **(d)**
   **immediate member notification** via the Story 5.1 seam (bypassing the standard queued cadence).

4. **Emergency overrides bypass the 12-month notice, are unmistakable, and are NON-retroactive.** An
   emergency entry may take effect immediately (`effective_from` may be `<= now()` — the standard 365-day
   floor does NOT apply). The audit + attestation trail makes an emergency change **unmistakable to
   regulators / members / future trustees** (a distinct `change_type = 'emergency'` discriminator + the
   attestation record vs. `change_type = 'standard'`). The override **does NOT retroactively modify
   already-spawned pools** — it only affects **future spawns**. This is structurally guaranteed by AC #2's
   snapshot-at-spawn contract (an already-spawned pool's amount is frozen in its snapshot; a new schedule
   entry can never reach back into it) and MUST be asserted by a test (see AC #6).

5. **Standard vs. emergency are the same store, gated differently.** Both write-paths append to the one
   effective-dated schedule; they differ only in: the `effective_from` constraint (standard ≥ +365d;
   emergency none), the required attestation (emergency only), the `change_type` discriminator, and the
   notification cadence (standard queued-scaffold; emergency immediate-scaffold). The effective-amount
   resolver (`getEffectiveFixedAmount`) is **change_type-blind** — it just returns the entry whose window
   contains `asOf`.

6. **Tests + gates.** DB-free unit tests for the resolver window logic + the standard/emergency validation
   rules; a **DB-gated integration spec** asserting: (a) `planCycleSpawn` snapshots the effective amount at
   `committed_at`; (b) a schedule change with a *future* `effective_from` does NOT change an *already-spawned*
   pool's snapshot (the non-retroactivity invariant, AC #4); (c) the 365-day-floor rejection for standard,
   accepted for emergency. The new domain module lives under `packages/domain/src/pool/` so the
   `pool-support-category-invariant` gate scans it — it must be **death-token-free**. `pnpm ci:local` stays
   green.

## Tasks / Subtasks

- [x] **Task 1 — The effective-dated schedule store + the immutable attestation record (schema + migration)** (AC: #1, #3, #5)
  - [x] **Table A — `packages/domain/src/schema/pool_fixed_amount_schedule.ts`** (the effective-dated
        amount). Columns (snake_case DB / camelCase TS per architecture L3663-3677): `id` (uuid pk
        defaultRandom), `pariwar_id` (uuid, branded `PariwarId`, RLS predicate), `version` (integer,
        monotonic per Pariwar), `fixed_amount` (integer, strictly positive — INR rupees, same unit as
        `pools.fixed_amount`), `effective_from` (timestamptz), `effective_until` (timestamptz, nullable —
        open-ended head, set on supersede), `change_type` (enum `'standard' | 'emergency'`),
        `created_by_actor` (text), `created_at` (timestamptz default now()), `audit_id` (uuid/text). **NOTE:**
        the schedule row is NOT fully immutable — its `effective_until` is UPDATEd when a later change
        supersedes it — which is exactly why the attestation must NOT live here (see Table B).
  - [x] Indexes (Table A): `UNIQUE (pariwar_id, version)`; a **partial-unique** `(pariwar_id) WHERE
        effective_until IS NULL` (exactly one open-ended head per Pariwar — the
        `terms_and_conditions_versions` precedent); `(pariwar_id, effective_from)` for the window resolver.
  - [x] **Table B — `packages/domain/src/schema/pool_fixed_amount_emergency_attestations.ts`** (the immutable
        Emergency Adjustment Record). **APPEND-ONLY** — never UPDATEd or DELETEd after the emergency write;
        one row per emergency change. Columns: `id` (uuid pk), `pariwar_id` (uuid, branded, RLS predicate),
        `schedule_version` (integer — *references* the emergency schedule entry's `version`; logical FK to
        Table A's `(pariwar_id, version)`), `fixed_amount` (integer — denormalized snapshot of what was
        attested, so the record is audit-self-contained), `panel` (jsonb — the panel *composition*:
        `[{actor_id, actor_display}]`), `attested_by_actor` (text), `attested_display` (text — the resolved
        R5 snapshot), `documented_reason` (text — policy/operational justification ONLY, plaintext, see D3;
        **never member-specific**), `attested_at` (timestamptz), `audit_id` (uuid/text), `created_at`
        (timestamptz default now()). Index `UNIQUE (pariwar_id, schedule_version)` (one attestation per
        emergency entry).
  - [x] Tenant-isolated RLS on `pariwar_id` for BOTH tables (mirror `pariwar_appeal_config`; add
        `policies/pool-fixed-amount-schedule-rls.ts` + `policies/pool-fixed-amount-emergency-attestations-rls.ts`).
  - [x] Migration **0075** (next number on main — 0074 was 7.3's spawn-idempotency key): two tables + one
        `change_type` enum. Generate via `drizzle-kit`; **never hand-edit an applied migration**
        ([[project_live_db_test_gotchas]]). Register both tables in `packages/domain/src/schema/index.ts`.

- [x] **Task 2 — The effective-amount resolver + write paths (domain module)** (AC: #1, #3, #4, #5)
  - [x] Add `packages/domain/src/pool/fixed-amount.ts`. `getEffectiveFixedAmount(db, pariwarId, asOf):
        Promise<number>` — mirror `getEffectiveTc` (`read.ts:27`): the entry whose window contains `asOf`
        (`effective_from <= asOf AND (effective_until IS NULL OR asOf < effective_until)`), newest
        `effective_from` then highest `version`. **Throws `PoolFixedAmountNotConfiguredError`** when none is
        effective (a trustee config gap surfaced loudly, the `PoolNameListExhaustedError` philosophy — NOT a
        silent default). `asOf` is explicit (the saga passes `committed_at`); do not default to `now()` on
        the spawn path.
  - [x] `scheduleStandardChange(client, {pariwarId, fixedAmount, effectiveFrom, actorId, ...})` — validates
        `effectiveFrom >= now() + interval '365 days'` (DB-authoritative — SQL-side comparison, not JS
        `Date`), positive integer amount; allocates next `version` (`(latest?.version ?? 0) + 1`); closes the
        prior open-ended head (`effective_until = new effective_from`) and inserts the new head; `change_type
        = 'standard'`. Throws `PoolFixedAmountNoticeTooShortError` on the floor violation.
  - [x] `applyEmergencyOverride(client, {pariwarId, fixedAmount, effectiveFrom, documentedReason, panel,
        attestedByActor, attestedDisplay, ...})` — in ONE tx: (a) same head-supersede mechanics as the
        standard path but **no 365-day floor**, `change_type = 'emergency'`; (b) insert the **immutable
        Emergency Adjustment Record** (Table B) referencing the just-written schedule `version`, with the
        denormalized `fixed_amount`, the `panel` composition, attestation metadata, and `documented_reason`.
        The schedule entry and its attestation are written together or not at all (a `change_type:'emergency'`
        schedule row without an attestation record must be impossible). Requires a non-empty `documentedReason`
        + non-empty `panel`. Throws `PoolFixedAmountReasonRequiredError` /
        `PoolFixedAmountAttestationRequiredError`.
  - [x] The Emergency Adjustment Record is **write-once** — no read/update accessor mutates it; expose a
        read `getEmergencyAttestation(db, pariwarId, scheduleVersion)` + `listFixedAmountSchedule(...)` for
        the audit/admin surface.
  - [x] Errors in `packages/domain/src/pool/errors.ts` (sibling to the existing pool errors). Export the
        new surface from `packages/domain/src/pool/index.ts`.
  - [x] **Death-token-free** — the module is auto-scanned by `pool-support-category-invariant`'s recursive
        `pool/` walk ([[project_pool_primitive_substrate]]); no `'death'`/`'death_support'` string branches.

- [x] **Task 3 — Wire the resolver into the spawn saga (retire the env constant)** (AC: #2)
  - [x] In `packages/domain/src/pool/spawn.ts`: `planCycleSpawn` already reads `cycle_freeze_commits.committedAt`
        (lines 273–284). **Resolve `fixedAmount` internally** via `getEffectiveFixedAmount(tx, pariwarId,
        commit.committedAt)` and REMOVE `fixedAmount` from `PlanCycleSpawnInput`. Keep the positive-integer
        assert as a post-lookup invariant. This makes "effective at the cycle-freeze date" atomic + replay-safe
        (same `committed_at` → same amount on retry, because schedule rows are immutable historical). Preserve:
        the fast-path idempotency, `derivePoolId` identity, name/identifier allocation order, the `pool.spawned`
        payload shape (`fixed_amount` field unchanged).
  - [x] Ripple: `apps/jobs/src/cycle-spawn.ts` drops `fixedAmount` from its deps + the `planCycleSpawn` call
        (line 121–125); `apps/jobs/src/boot.ts` stops passing `fixedAmount: POOL_SPAWN_FIXED_AMOUNT_INR` (line
        486). See D5 for the env-constant disposition (genesis-seed vs. delete).
  - [x] Update the stale seam comment in `boot.ts` (lines 482–483: "the fixed amount is still config-backed
        pending Story 7.5") and the `spawn.ts` D2 note (line 200–202: "Story 7.5 (BACKLOG)…").

- [x] **Task 4 — API module (standard + emergency routes)** (AC: #1, #3)
  - [x] Add `apps/api/src/modules/pool-fixed-amount/` (routes + handlers + composition) mirroring
        `claims.r9-voting.*` / `claims.cycle-freeze.*`: `GET …/admin/pool-fixed-amount` (current schedule +
        effective amount), `POST …/admin/pool-fixed-amount/schedule` (standard), `POST
        …/admin/pool-fixed-amount/emergency` (override). Register in the route registry.
  - [x] **RBAC**: add `pool.fixed_amount_set` (standard) + `pool.fixed_amount_emergency` (override) to the
        `PERMISSION_CATALOG.keys` array in `packages/domain/src/rbac/permissions.ts` AND bump
        `PERMISSION_CATALOG_VERSION` (line 212) **19 → 21** (the versioned catalog counter — the 6.13/6.14/6.16
        precedent; the raw literal count is incidental). Both keys at `dimension: 'pariwar'` (value = `scopeTx.pariwarId` — the `cycle.freeze` /
        `claim.r9_vote` pariwar-wide-key precedent; v1 actor = `pariwar_admin`-as-Trustee-Lite, `state_trustee`
        cross-dimension resolution DEFERRED to the Epic-3 geo-tree resolver — the 6.13/6.14 posture). Grant to
        `pariwar_admin` (+ `super_admin`) in `rbac/roles.ts`.
  - [x] **Step-up** the emergency route (`requireStepUp`, added AFTER the permission hook — the R9-finalize /
        cycle-freeze-commit precedent). Resolve the **R5 actor display** (`getDisplayName`) FIRST, fail-closed
        on NULL → `AdminDisplayNameMissingError` (409), no row/event/audit (the 6.11/6.13/6.14 posture).
  - [x] **Comment-language discipline (do NOT invite subsystem reuse):** in code comments, describe the
        emergency posture as *"governance posture equivalent to R9 — step-up, recorded trustee attestation,
        auditability — **without** the R9 voting lifecycle."* Do **not** write "similar to Story 6.14 /
        reuse R9 voting" — that risks a future dev pulling in the R9 session/vote/quorum machinery. The
        boundary is explicit: this is a recorded sign-off, not a voting session.
  - [x] **Audit is a post-commit sink** (`emitAuthAudit`): non-PII — `change_type`, `version`, `fixed_amount`,
        `effective_from`, and (emergency) the panel roster ids + `reason_code`; rejected attempts audited too.
  - [x] Fire the **notification seam** post-commit from the handler (Task 5).
  - [x] Contracts: request/response Zod schemas in `packages/contracts/` (the `@twt/contracts` R9/appeal
        precedent).

- [x] **Task 5 — Member-notification scaffolding seam** (AC: #1, #3d, #4)
  - [x] Add a `PoolFixedAmountChangedHook` injectable seam (the `NiyamavaliAmendedHook` /
        `consoleNiyamavaliAmendedHook` precedent — `apps/api/src/modules/rules/notification-hook.ts`): a
        default inert `console.info` placeholder wired in production/boot; tests inject a capturing fake. It
        carries ONLY the change coordinates (`pariwarId`, `version`, `fixedAmount`, `effectiveFrom`,
        `changeType`) — it MUST NOT resolve scope→members or send anything (that is Epic 5 + Epic 4;
        [[project_channels_no_live_dispatch_yet]]). Standard = queued-cadence flag; emergency = immediate flag
        (both scaffold-only in v1). Never throws into the write path.

- [x] **Task 6 — Admin UI surface** (AC: #1, #3)
  - [x] Add `apps/admin/src/modules/pool-fixed-amount/` + a route (mirror `R9VotingRoute.tsx` /
        `CycleFreezeRoute.tsx` + the `apps/admin/src/api` client). Show current effective amount + schedule
        history; a standard-change form (date picker enforcing the +365d floor client-side, server is the
        real gate); an emergency-override form (documented-reason + panel roster + step-up prompt) with
        **helper text stating the reason must be policy/operational justification — NOT member-specific
        information** (reserve adequacy, inflation, regulatory change, actuarial review, financial
        sustainability). Show the immutable Emergency Adjustment Records read-only in the schedule history.
        Use the `@twt/api-client` + existing admin auth/session plumbing.

- [x] **Task 7 — Tests + gates** (AC: #6)
  - [x] DB-free unit tests (`packages/domain/tests/pool/fixed-amount.test.ts`): window-resolver correctness
        (boundary `asOf == effective_from` inclusive, `asOf == effective_until` exclusive — mirror
        `getEffectiveTc`), the 365-day-floor accept/reject, emergency-bypass, `PoolFixedAmountNotConfiguredError`
        on empty schedule, and the emergency-write validation (reason/panel required).
  - [x] DB-gated integration spec (`packages/domain/tests/integration/pool/…` or extend
        `pool-spawn-saga.spec.ts`) on `twt-test-pg` :5433: (a) seed a schedule row → `planCycleSpawn` snapshots
        the effective amount at `committed_at`; (b) insert a future-dated change → re-read the already-spawned
        pool's snapshot is **unchanged** (AC #4 non-retroactivity); (c) `applyEmergencyOverride` writes the
        schedule row **and** its immutable Emergency Adjustment Record atomically (assert both present, the
        record references the schedule `version`, and no `change_type:'emergency'` row can exist without its
        attestation). Heed [[project_live_db_test_gotchas]]: assert membership not counts; never regenerate an
        applied migration.
  - [x] `pnpm --filter @twt/domain lint && test`; `pnpm pool-support-category:check` green (new
        `fixed-amount.ts` auto-scanned); `pnpm ci:local` green (DATABASE_URL on :5433). The existing
        `pool-spawn-saga.spec.ts` now needs a seeded schedule row (previously relied on the env constant) —
        update it, don't let it silently break.

### Review Findings

- [x] [Review][Patch] Emergency-panel attestation: add a minimum panel size (>1) and reject duplicate `panel_actor_ids`. **Fixed**: `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE=2` + dup-check in `applyEmergencyOverride` (new errors `PoolFixedAmountPanelTooSmallError`/`PoolFixedAmountPanelDuplicateActorError`), mirrored in the zod contract (`.min(2)` + `.refine` dedupe) and the admin form. Full role/trustee-grant verification stays deferred (needs a trustee directory / RBAC geo-scope resolver not built until Epic 3).
- [x] [Review][Patch] Reinstate an upper-bound ceiling on `fixed_amount`. **Fixed**: `MAX_POOL_FIXED_AMOUNT_INR=10_000_000` in `assertPositiveAmount` (domain), `.max()` in both zod request schemas (contracts), and a new DB `CHECK` (migration `0077`).
- [x] [Review][Defer] `documented_reason` has no PII-scan/keyword-denylist enforcement beyond a length check [`apps/api/src/modules/pool-fixed-amount/handlers.ts`] — deferred, pre-existing pattern: consistent with how other free-text justification fields in the app are handled; a keyword denylist would be unreliable and a real PII scanner is out of scope for this story.
- [x] [Review][Patch] `pool_fixed_amount_schedule.auditId` / `pool_fixed_amount_emergency_attestations.auditId`: misleading doc comment. **Fixed**: both schema files' comments now correctly describe the post-commit `emitAuthAudit` pattern actually in use; the column stays reserved/unused-for-now (not dropped — a future route may adopt the pre-commit pattern).
- [x] [Review][Patch] Missing ordering/floor guard on `effective_from` allows window inversion and breaks D2's replay-safety guarantee. **Fixed**: `closeOpenHead` now closes the superseded head at `max(newEffectiveFrom, openHead.effectiveFrom)` instead of unconditionally at `newEffectiveFrom` — a head superseded before it ever took effect closes at its OWN `effective_from` (zero-width, permanently unreachable, never inverted) rather than corrupting its window. New regression test `(g)` in `pool-fixed-amount.spec.ts` pins this exact scenario (an immediate emergency preceding a pending future standard change). **Residual scope, logged to deferred-work.md**: the deeper replay-non-determinism question (a backdated emergency landing between an already-committed cycle-freeze and its retried spawn resolution) is a genuine policy question — how far back "may be <= now()" is meant to allow — not a mechanical fix; flagged for a future decision rather than silently resolved here.
- [x] [Review][Patch] D5's own fallback plan was not implemented for pre-existing Pariwars. **Fixed**: migration `0076` backfills a genesis schedule row for every `pariwar_passport` row with no existing `pool_fixed_amount_schedule` row, applied + verified against the local test DB.
- [x] [Review][Patch] `PoolFixedAmountNotConfiguredError` isn't distinguished as non-retryable in the spawn worker. **Fixed narrowly**: this codebase has no retryable/non-retryable error split anywhere (every worker relies on pg-boss's own retryLimit + DLQ) — introducing one just for this error would be a new, unprecedented pattern. Instead `runCycleSpawnParent`'s existing alarm (already fires + rethrows on any planning failure) now emits a distinguished, greppable "CONFIG GAP" message for this specific error so an operator can tell it apart from a transient failure. The backfill migration above closes the actual gap for existing Pariwars; this is defense-in-depth for any future Pariwar that somehow still lacks a schedule row.
- [x] [Review][Patch] Rejected emergency-override attempts skip the audit trail. **Fixed**: `contextOf()`'s actor-display fail-closed rejection and `postEmergency`'s per-panel-member display-resolution rejection now both emit `admin_pool_fixed_amount.rejected` before throwing.
- [x] [Review][Patch] `resolveEffectiveFixedAmountRow` fetches every schedule row with no `.limit()`. **Fixed properly** (not just a naive cap, which would have been an actual correctness risk for a historical `asOf`): the window predicate now filters in SQL (`effective_from <= asOf AND (effective_until IS NULL OR asOf < effective_until)`, `ORDER BY ... LIMIT 1`), so the resolver is O(1) rows regardless of a Pariwar's schedule history length. The pure `selectEffectiveFixedAmountRow` selector stays exported + unit-tested as the boundary-semantics contract.
- [x] [Review][Patch] `FixedAmountPage`: an emptied date field reaches `new Date('').toISOString()` uncaught. **Fixed**: both `submitStandard`/`runEmergency` now guard on an empty `effective_from` string before constructing the `Date`.
- [x] [Review][Patch] Schedule/emergency-attestation history list endpoints cap results with no `hasMore` signal. **Fixed**: `listFixedAmountSchedule`/`listEmergencyAttestations` now return `{rows, hasMore}` (N+1 over-fetch, gate-compliant via `clampLimit`), threaded into a new `schedule_has_more` contract field and surfaced in the admin UI.
- [x] [Review][Patch] `POOL_GENESIS_FIXED_AMOUNT_INR` has no boot-time range validation. **Fixed**: a module-load-time `RangeError` check in `pariwar-provisioning/index.ts` (positive integer, <= `MAX_POOL_FIXED_AMOUNT_INR`), mirroring the retired `boot.ts` guard.
- [x] [Review][Patch] RLS write policy on `pool_fixed_amount_emergency_attestations` is declared `for: 'all'` despite the append-only GRANT. **No change needed** — verified this is the established, repeated codebase-wide convention for every append-only table (`member-medical-disclosures-rls.ts` and 5+ others use the identical `for:'all'`-write-policy-plus-grant-enforces-append-only shape, with the same rationale documented inline). Applying a fix here would deviate from the convention, not follow it.
- [x] [Review][Patch] `GET …/admin/pool-fixed-amount` opens a full transaction for a pure read. **No change needed** — verified this is architecturally mandatory, not an inefficiency: RLS scoping (`SET LOCAL app.pariwar_id`) is transaction-scoped in this codebase (Story 1.9), so every scoped read — GET included — opens a scope tx. Confirmed the identical pattern on every other GET route checked (`vyawastha-shulk/handlers.ts` and others).
- [x] [Review][Patch] `seedGenesisFixedAmount`'s idempotency guard description mismatch. **Fixed**: doc comment now accurately describes "skip if ANY schedule row exists" rather than narrowly "the (pariwar_id, version) unique index."
- [x] [Review][Patch] Standard-change date picker missing a `min` attribute. **Fixed**: added `min={STANDARD_EFFECTIVE_FROM_MIN}` (365 days out) to the standard-change `datetime-local` input.
- [x] [Review][Patch] `translateFixedAmountError`'s bare-throw fallback has no exhaustiveness enforcement. **No change needed** — verified this matches the established codebase-wide convention (`translateR9Error` in `claims.r9-voting.handlers.ts` has the identical bare-throw shape, and the project's own deferred-work log already tracks the lack of exhaustiveness testing there as a known, accepted gap, not specific to this diff).
- [x] [Review][Patch] `dbNow()` duck-types the `SELECT now()` result via `instanceof Date`. **No change needed** — the comment already documents this as an intentional, accepted tradeoff (fails closed via `NaN` comparisons on an unrecognized shape), consistent with the same duck-typing pragmatism used elsewhere in the codebase (e.g. `claim/errors.ts extractPgError`).

## Dev Notes

### D1 — The store IS an effective-window schedule; `getEffectiveTc` is the exact precedent (DECIDED)

There is no generic per-Pariwar key-value config store in the substrate (confirmed — the
`pariwar_appeal_config` header says as much). The fixed-amount schedule is a **first-class effective-dated
table** modeled 1:1 on `terms_and_conditions_versions`:

- **Read** = `getEffectiveFixedAmount` mirrors `getEffectiveTc` (`terms-and-conditions/read.ts:27-60`):
  window predicate `effective_from <= asOf AND (effective_until IS NULL OR asOf < effective_until)`, ordered
  `desc(effective_from), desc(version)`, `limit(1)`. The boundary semantics are the contract:
  `effective_from` **inclusive**, `effective_until` **exclusive** — pin them in a unit test.
- **Write** = the `currentOpenTcVersion` → supersede-head → insert-new-head mechanic (`read.ts:113` +
  the T&C write path): close the prior open-ended row's `effective_until` to the new `effective_from`, insert
  the new open-ended head, bump `version` monotonically. The partial-unique `WHERE effective_until IS NULL`
  index guarantees exactly one head.
- **Amount unit** = INR rupees, positive integer — the SAME unit/validation as `pools.fixed_amount`
  (`pool/events.ts:95` `z.number().int().positive()`) and the retired env constant (default 500).

### D2 — The saga resolves the amount internally at `committed_at`; DROP `fixedAmount` from the input (DECIDED)

`planCycleSpawn` (`pool/spawn.ts:251`) already reads `cycle_freeze_commits.committedAt` in-tx (lines 273-284)
to derive the freeze month for name/identifier allocation. Resolving the effective amount **in that same
place, from that same `committedAt`**, is the cleanest realization of "each pool snapshots the `fixed_amount`
effective at the cycle-freeze date":

- It is **atomic** (one tx, one instant) and **replay-safe** — a parent retry re-reads the same
  `committed_at`, and schedule rows are immutable historical, so the resolved amount is byte-identical. This
  matches the story's determinism spirit exactly as `deriveFreezeMonth` does for names.
- Therefore **remove `fixedAmount` from `PlanCycleSpawnInput`** rather than threading a resolved value from
  the worker (the worker would have to double-read `committed_at`). The worker + boot wiring lose the
  `fixedAmount` dep entirely. This is a deliberate signature change — update 7.3's `planCycleSpawn` unit
  tests + the integration spec to seed a schedule row instead of passing an amount.
- **No-config = fail loud.** If no schedule entry is effective at `committed_at`, throw
  `PoolFixedAmountNotConfiguredError` — a P0 trustee-config gap surfaced (the `PoolNameListExhaustedError`
  philosophy), never a silent fallback to a magic number. See D5 for how genesis is seeded so this never
  fires in a correctly-provisioned Pariwar.

### D3 — Emergency attestation = an immutable Emergency Adjustment Record, NOT a full R9 voting session (DECIDED & CONFIRMED)

The governance posture is **equivalent to R9** — step-up, recorded trustee attestation, auditability — but
this story explicitly does **NOT** reuse the R9 voting *lifecycle* (Story 6.14's multi-round OPEN → VOTE →
FINALIZE session with quorum, encrypted per-vote rationale, and a claim lifecycle event). A fixed-amount
emergency override needs a **recorded, attestable sign-off**, not a vote. This matches Story 6.6/7.6's
"separate trustee-attestable correction event" pattern.

**The attestation is a first-class immutable record, not row metadata.** Conceptually:

```
Emergency Adjustment Record  (append-only, write-once)
  → references the schedule version it attests
  → records the panel composition (roster of {actor_id, actor_display})
  → records attestation metadata (attesting actor + R5 display + attested_at + documented_reason)
```

- It lives in its **own append-only table** (`pool_fixed_amount_emergency_attestations`, Table B), NOT as a
  JSONB blob on the schedule row. Reason it is separated: the schedule head row is itself *mutated later*
  (its `effective_until` is set when a subsequent change supersedes it), so an attestation on that row would
  not be truly immutable. A dedicated never-updated record makes future audit requirements trivial — the
  attestation is written once and never touched. (`panel` remains JSONB *inside* that immutable row — the
  composition list is naturally array-shaped — but the record as a whole is the immutable historical unit.)
- **`documented_reason` is policy/operational justification ONLY** — reserve adequacy, inflation, regulatory
  change, actuarial review, financial sustainability — and **never member-specific** information. Because it
  cannot contain member context, it is stored **plaintext** (safe in the audit line). This is fundamentally
  different from the R9 per-vote rationale (Tier-1, KMS-encrypted) *precisely because* R9 rationale may carry
  member-related context and this reason may not. The write path should treat "no member PII" as a stated
  constraint (documented at the column + in the admin form helper text), not silently rely on trustee
  discipline.
- **Comment-language discipline:** in code/comments, phrase it as "governance posture equivalent to R9
  (step-up, recorded trustee attestation, auditability), without the R9 voting lifecycle" — never "similar
  to Story 6.14 / reuse R9 voting" (which would invite a dev to pull in the session/vote/quorum subsystem).

### D4 — Notification is a SEAM, not live dispatch (DECIDED)

Both AC1 ("member-notification scaffolding emits via Story 5.1 dispatcher") and AC3d ("member notification
immediately via Story 5.1") are satisfied by an **injectable console-placeholder hook**, not live fan-out —
`packages/channels` `dispatch()` still has **no live call site** ([[project_channels_no_live_dispatch_yet]]),
and the `NiyamavaliAmendedHook`/`DeployTrigger` precedent (`rules/notification-hook.ts`) is exactly this: a
seam + call site, NOT delivery. Do NOT resolve `affected_member_scope` → member ids or call any provider
(that is Epic 5 + Epic 4). The seam carries only the change coordinates. "Immediate vs. queued" is a flag on
the seam payload in v1, both inert.

### D5 — Non-retroactivity is structural (snapshot-at-spawn), and the env constant becomes a genesis seed (DECIDED)

- **AC #4 non-retroactivity is FREE** given AC #2: an already-spawned pool's amount lives in its immutable
  `pool.spawned`/`pool_snapshots` snapshot; a new schedule entry (standard OR emergency) is only ever read by
  a *future* `planCycleSpawn` at a *future* `committed_at`. There is no code path that re-reads the schedule
  for an existing pool. **The integration test in Task 7 must prove this** (it is the AC's teeth) — but no
  guard code is needed; the invariant is architectural.
- **Env-constant disposition:** `POOL_SPAWN_FIXED_AMOUNT_INR` should NOT feed the live saga anymore. Convert
  it to a **genesis-seed** value used only at Pariwar provisioning (seed a `change_type: 'standard'` row with
  `effective_from = now()`, `version = 1`) so a freshly-provisioned Pariwar always has an effective amount and
  `PoolFixedAmountNotConfiguredError` never fires in practice. If provisioning-time seeding is out of this
  story's reach, the safe interim is a one-off migration/backfill seeding the genesis row per existing
  Pariwar, and the test fixtures seed explicitly. Record which path was taken in the Dev Agent Record.

### D6 — 12-month notice is DB-authoritative time (DECIDED)

The `effective_from >= today + 365 days` floor MUST be evaluated with DB `now()` (SQL-side:
`effective_from >= now() + interval '365 days'`), never a JS `new Date()` — the §1.11 DB-authoritative-time
discipline that `getEffectiveTc` follows (`now()` in-query). This is not merely a scheduling nicety:
`architecture.md:1311` names the 12-month notice as the mitigation for the **hostile-trustee threat actor**
("Niyamavali manipulation; fixed-amount change; rule registry tampering" → "cooling-off period via 12-month
notice (FR-15)"). A trustee-controllable app-server clock would let that same hostile trustee shrink the
notice window; the floor only holds as a security control if it is evaluated against DB-authoritative time.
Worked example that pins the intent (addendum §3.3, lines 89–97): trustee announces in month 36, effective
month 48 — a full year of warning; "SM-C4 counter-metric prevents knee-jerk hikes" (line 97). 365 days is the
calendar realization.

### Read-before-you-touch (mandatory)

- `packages/domain/src/terms-and-conditions/read.ts:27-129` — the effective-window resolver + open-head
  supersede pattern to mirror exactly (`getEffectiveTc`, `currentOpenTcVersion`, `latestTcVersion`).
- `packages/domain/src/schema/terms_and_conditions_versions.ts` + `pariwar_appeal_config.ts` — the
  effective-dated / per-Pariwar-config schema shapes + partial-unique-open-head index + RLS convention.
- `packages/domain/src/pool/spawn.ts:180-320` — `deriveFreezeMonth`, `PlanCycleSpawnInput` (where
  `fixedAmount` is removed), the in-tx `committedAt` read, the child-spec fan-out. **Preserve** idempotency
  fast-path, `derivePoolId` identity, allocation order, and the `pool.spawned` payload shape.
- `packages/domain/src/pool/events.ts:82-95` + `snapshot.ts` — the `fixed_amount` field in the spawned
  payload/snapshot (UNCHANGED — this story changes only where the value comes from, not its shape).
- `apps/api/src/modules/claims/claims.r9-voting.{routes,handlers}.ts` — the trustee-attestation surface
  template: R5-display-first fail-closed, permission hook + step-up ordering, post-commit non-PII audit,
  domain-error → HTTP translation.
- `apps/api/src/modules/rules/notification-hook.ts` — the notification-seam template (copy its structure).
- `packages/domain/src/rbac/permissions.ts:319-352` + `roles.ts` — the catalog-bump + pariwar-dimension key
  convention (catalog 19 → 21) and the v1 Trustee-Lite actor / deferred-geo-resolver note.
- `apps/jobs/src/{boot.ts:139-207,476-489, cycle-spawn.ts:40-141}` — the env constant + saga wiring to retire.

### Testing standards

- DB-free unit tests in `packages/domain/tests/pool/fixed-amount.test.ts` (vitest, `vitest run`).
- DB-gated specs run against `twt-test-pg` Docker on **:5433**; heed [[project_live_db_test_gotchas]] and
  [[project_known_livedb_test_failures]] — never regenerate an applied migration, don't `DROP SCHEMA`, assert
  membership not counts on own-committing writers, and prefer suite-level `{timeout: 20000}` if a
  concurrent-load spec flakes.
- The `pool-spawn-saga.spec.ts` (currently 5/5 green, relied on the env-supplied amount) MUST be updated to
  seed a schedule row — a green run after the change is part of this story's gate.

### Project Structure Notes

- Pool primitive is homed at `packages/domain/src/pool/` (ratified variance from the epic's
  `packages/pool-lifecycle` — [[project_pool_primitive_substrate]]); `fixed-amount.ts` belongs there with its
  siblings and is auto-covered by the death-branch gate's recursive `pool/` walk.
- `cycle_id` is `CycleFreezeCommitId` (unFK'd; no `cycles` table). Freeze-time evaluation uses
  `cycle_freeze_commits.committed_at` — never the clock.
- Next migration on main is **0075** (0074 = 7.3's `pools_pariwar_cycle_pool_index_uq`). Two new tables
  (`pool_fixed_amount_schedule` + the append-only `pool_fixed_amount_emergency_attestations`) + one new enum
  (`change_type`) — a single additive migration.
- Sprint-status ledger: flip `development_status[7-5-…]` and add the top-of-file reverse-chron COMMENT ledger
  entry at completion ([[project_sprint_status_ledger]]).

### References

- [Source: epics.md#Story 7.5 (lines 2712–2728)] — the ACs: fixed-amount workflow, 12-month notice, snapshot
  at spawn immutable-for-life, emergency override (panel attestation + documented reason + audit + immediate
  notification), non-retroactive to spawned pools.
- [Source: epics.md#Epic 7 (lines 2597–2616)] — FR-15; snapshot-at-spawn; `support_category` no-death-branch
  invariant; the [CONSUMER] label.
- [Source: prds/…/addendum.md §3.3 (lines 89–97)] — the ₹310→₹400 worked example; "announce month 36,
  effective month 48"; SM-C4 counter-metric (line 97).
- [Source: architecture.md L1311] — threat-actor inventory row: hostile trustee → "cooling-off period via
  12-month notice (FR-15)" as the mitigation; binds D6's DB-authoritative-time requirement to its security
  rationale.
- [Source: packages/domain/src/terms-and-conditions/read.ts:27-129] — the effective-window resolver +
  open-head supersede precedent.
- [Source: packages/domain/src/pool/spawn.ts:180-320] — `planCycleSpawn`, `deriveFreezeMonth`, the in-tx
  `committedAt` read, `PlanCycleSpawnInput.fixedAmount` (to be removed).
- [Source: apps/jobs/src/boot.ts:139-207,476-489] — `POOL_SPAWN_FIXED_AMOUNT_INR` + the saga wiring to retire.
- [Source: apps/api/src/modules/claims/claims.r9-voting.handlers.ts] — the trustee-attestation surface
  template (R5-display-first, permission+step-up, post-commit non-PII audit).
- [Source: apps/api/src/modules/rules/notification-hook.ts] — the injectable notification-seam precedent.
- [Source: packages/domain/src/rbac/permissions.ts:319-352] — catalog-bump + pariwar-dimension key convention.
- [Source: packages/domain/src/schema/pariwar_appeal_config.ts] — per-Pariwar config schema + RLS convention.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8)

### Debug Log References

- `db.execute(sql\`SELECT now()\`)` returns the timestamptz as an ISO **string**, not a `Date`, under
  drizzle node-postgres — `meetsNoticeFloor` blew up with `dbNow.getTime is not a function`. Fixed by
  coercing in `dbNow()` (`row.now instanceof Date ? row.now : new Date(row.now as string)`).
- `pool-support-category-invariant` gate is a naive substring scanner: it flagged the literal token
  `death` inside my *comments* explaining the module is free of it ("death-token-free", "no
  'death'/'death_support' branches"). Reworded the comments to "support-category-token-free" — the module
  never inspects `support_category` at all (the amount schedule is category-agnostic).
- The "no grant at all" authz case returns **404** (scope-resolution can't resolve the tenant — tenant
  isolation, don't reveal existence), not 403. A true 403 needs a role that resolves the scope but lacks
  the key (used `helpline_operator`).

### Completion Notes List

Implemented all 7 tasks; `pnpm ci:local` is **green (26 jobs)** incl. the full integration suite on :5433.

- **Task 1 (schema + migration 0075):** two tables — `pool_fixed_amount_schedule` (effective-window,
  modeled 1:1 on `terms_and_conditions_versions`: monotonic `version`, `effective_from`/`effective_until`
  with a partial-unique open-head, `change_type` enum, positive-amount + positive-version CHECKs) and the
  append-only `pool_fixed_amount_emergency_attestations` (the immutable Emergency Adjustment Record). RLS
  on both; the attestation table is APPEND-ONLY at the **grant level** (`GRANT SELECT, INSERT` only — no
  UPDATE/DELETE), verified against the live DB. Migration 0075 hand-authored (baseline frozen at 0020),
  journal entry appended.
- **Task 2 (resolver + write paths):** `pool/fixed-amount.ts` — refactored the resolver to a PURE core
  (`selectEffectiveFixedAmountRow` window selection + `meetsNoticeFloor`) over the small per-Pariwar row
  set, keeping DB-authoritative `now()` via `SELECT now()`, so the boundary semantics + the 365-day floor
  are DB-free unit-testable AND still §1.11-compliant. `getEffectiveFixedAmount` (spawn consumer, throws
  `PoolFixedAmountNotConfiguredError` — fail loud), `scheduleStandardChange` (+365d DB-authoritative floor),
  `applyEmergencyOverride` (no floor + atomic schedule-row + immutable attestation in the caller's tx),
  `seedGenesisFixedAmount` (D5), and the audit/admin reads. Typed errors on `pool/errors.ts`.
- **Task 3 (spawn wiring):** `planCycleSpawn` now resolves `fixedAmount` INTERNALLY via
  `getEffectiveFixedAmount(tx, pariwarId, commit.committedAt)` and `fixedAmount` was REMOVED from
  `PlanCycleSpawnInput`; ripples dropped it from `CycleSpawnDeps` + the worker call + `boot.ts` (the
  `POOL_SPAWN_FIXED_AMOUNT_INR` env constant + its validation are retired from the live saga). Stale
  7.5-BACKLOG comments updated.
- **D5 genesis-seed disposition (RECORDED):** wired `seedGenesisFixedAmount` into **Pariwar provisioning**
  (`apps/api/.../pariwar-provisioning`), seeded in the SAME self-scoped tx as the passport with a
  `POOL_GENESIS_FIXED_AMOUNT_INR` (default 500) genesis amount, so a freshly-provisioned Pariwar always has
  an effective amount and the spawn read never fails loud in practice. NO backfill migration was authored
  (there is no enumerable `pariwars` base table pre-Epic-3); existing test fixtures seed explicitly.
- **Task 4 (API):** `apps/api/.../pool-fixed-amount` — GET view + POST standard + POST emergency (step-up-
  gated), mirroring the R9/cycle-freeze surface: R5 display resolved FIRST fail-closed (incl. every panel
  member — the attestation record's attribution), pariwar-dimension permission hooks, post-commit non-PII
  audit, contracts Zod DTOs. RBAC: `pool.fixed_amount_set` + `pool.fixed_amount_emergency` added (catalog
  **19 → 21**), granted to `pariwar_admin` (+ `super_admin`); `state_trustee` DEFERRED to Epic 3.
- **Task 5 (notification seam):** `PoolFixedAmountChangedHook` injectable console-placeholder (the
  `NiyamavaliAmendedHook` precedent), wired through `context.ts`/`deps.ts`; carries only change coordinates
  + a `cadence` flag (standard=`queued` / emergency=`immediate`), both inert; never throws into the write.
- **Task 6 (admin UI):** `apps/admin/.../pool-fixed-amount` page + `/p/$pariwarId/pool-fixed-amount` route
  + api client/hooks — effective amount, schedule history (emergency records read-only), standard-change
  form (+365d client hint), emergency form with the policy/operational-reason helper text + step-up flow.
- **Task 7 (tests + gates):** DB-free unit suite (`tests/pool/fixed-amount.test.ts`, 15 tests — window
  boundaries inclusive/exclusive, the notice floor, the validation guards), DB-gated integration
  (`tests/integration/pool/pool-fixed-amount.spec.ts`, 5 tests — snapshot-at-committed_at, NON-retroactivity,
  emergency atomicity, floor reject/bypass, fail-loud), contracts lockstep + strict tests
  (`tests/pools-fixed-amount.test.ts`), API E2E (`tests/integration/pool-fixed-amount/fixed-amount.spec.ts`,
  7 tests — authz 401/403/404, standard+seam+audit, floor 400, emergency step-up + fail-closed-display +
  immutable record). Updated `pool-spawn-saga.spec.ts` + `cycle-spawn.test.ts` for the dropped `fixedAmount`
  (seed a schedule row / drop the dep). `pool-support-category:check` green.

### File List

**New — domain:**
- `packages/domain/src/schema/pool_fixed_amount_schedule.ts`
- `packages/domain/src/schema/pool_fixed_amount_emergency_attestations.ts`
- `packages/domain/src/policies/pool-fixed-amount-schedule-rls.ts`
- `packages/domain/src/policies/pool-fixed-amount-emergency-attestations-rls.ts`
- `packages/domain/src/pool/fixed-amount.ts`
- `packages/domain/migrations/0075_pool-fixed-amount-schedule.sql`
- `packages/domain/tests/pool/fixed-amount.test.ts`
- `packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts`

**New — contracts / api / admin:**
- `packages/contracts/src/pools/fixed-amount.ts`
- `packages/contracts/tests/pools-fixed-amount.test.ts`
- `apps/api/src/modules/pool-fixed-amount/notification-hook.ts`
- `apps/api/src/modules/pool-fixed-amount/handlers.ts`
- `apps/api/src/modules/pool-fixed-amount/index.ts`
- `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts`
- `apps/admin/src/modules/pool-fixed-amount/FixedAmountPage.tsx`
- `apps/admin/src/routes/FixedAmountRoute.tsx`

**Modified — domain:**
- `packages/domain/src/schema/index.ts` (register both tables)
- `packages/domain/src/policies/index.ts` (register both RLS policy sets)
- `packages/domain/src/pool/errors.ts` (fixed-amount typed errors)
- `packages/domain/src/pool/index.ts` (barrel export fixed-amount)
- `packages/domain/src/pool/spawn.ts` (resolve amount internally; drop `fixedAmount` from input)
- `packages/domain/src/rbac/permissions.ts` (catalog 19→21 + two keys)
- `packages/domain/src/rbac/roles.ts` (grant both keys to pariwar_admin)
- `packages/domain/migrations/meta/_journal.json` (0075 entry)
- `packages/domain/tests/rbac/permissions.test.ts` (catalog 21 / len 30 + key coverage)
- `packages/domain/tests/integration/pool/pool-spawn-saga.spec.ts` (seed schedule row; drop `fixedAmount`)

**Modified — jobs / api / admin:**
- `apps/jobs/src/boot.ts` (retire the env constant + saga wiring)
- `apps/jobs/src/cycle-spawn.ts` (drop `fixedAmount` dep)
- `apps/jobs/tests/cycle-spawn.test.ts` (drop `fixedAmount`)
- `apps/api/src/server.ts` (register the module)
- `apps/api/src/context.ts` + `apps/api/src/deps.ts` (wire the notification hook)
- `apps/api/src/audit/audit-sink.ts` (three new audit event types)
- `apps/api/src/modules/pariwar-provisioning/index.ts` (D5 genesis seed)
- `apps/api/tests/integration/_setup.ts` (capturing hook + deps)
- `packages/contracts/src/pools/index.ts` (export fixed-amount DTOs)
- `apps/admin/src/api/client.ts` + `apps/admin/src/api/hooks.ts` (client fns + hooks)
- `apps/admin/src/router.tsx` (register the route)

## Change Log

| Date       | Version | Description                                                                                   | Author |
| ---------- | ------- | --------------------------------------------------------------------------------------------- | ------ |
| 2026-07-18 | 1.0     | Story 7.5 implemented: per-Pariwar effective-dated fixed-amount schedule (retires the `POOL_SPAWN_FIXED_AMOUNT_INR` env constant) + 12-month-notice standard change + emergency adjustment override (immutable attestation, step-up-gated) + snapshot-at-spawn wiring + admin surface. All 7 tasks done; `pnpm ci:local` green (26 jobs). | Amelia (Dev) |
