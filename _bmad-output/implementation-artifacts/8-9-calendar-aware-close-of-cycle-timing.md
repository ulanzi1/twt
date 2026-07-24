---
baseline_commit: 1e8a89a4b938404453a8c5ed12e1dde91015ef1a
---
<!-- Powered by BMAD-CORE™ -->

Status: done

# Story 8.9: Calendar-Aware Close-of-Cycle Timing (UX-DR77 — Bihar Holiday Windows) `[CONSUMER / SUBSTRATE]`

## ⚠️ Read this first — the epics AC contradicts its own anchor; BigDev RATIFIED the resolution

The Story 8.9 acceptance-criterion prose in `epics.md:3022` says the **contribution close is extended** past holiday windows ("only the time-window when contributions are accepted"). **That sentence is a drafting error.** It contradicts every higher-authority source:

| Source | What it says | Ref |
| --- | --- | --- |
| **FR-22 (PRD — the alert state machine)** | `live → closed`: **hard close at Day 15**. | `prds/prd-TWT-2026-05-22/prd.md:524,531` |
| **UX-DR77 anchor (the DR this story realizes)** | **"Day 15 mechanical close;** reconciliation tail 1-2 days normal, 5-7 days on Bihar holiday windows … Sahyog Vivran auto-publish waits for matching to settle. Per-Pariwar holiday windows configurable." | `epics.md:477` |
| **UX spec — Sushil journey** | "Day 15 (alert close) is **mechanically hard per FR-22**, but reconciliation tail extends a calendar-aware window beyond it." | `ux-design-specification.md:995-1003` |
| **Story 8.1 (shipped)** | Alert lifecycle already implements `live → closed` as a hard transition. | `packages/domain/src/alert/`, `apps/jobs/src/scheduler/` |

**RATIFIED SCOPE — BigDev, 2026-07-24 (option 1, recorded in `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-24.md`; `epics.md:3011-3023` carries the matching correction note):** The Day-15 hard contribution close is **PRESERVED**. Calendar-awareness governs the **reconciliation TAIL** (Epic 9 matcher-tail scheduler + Epic 11b Story 11b.3 Sahyog Vivran auto-publish gate — two separate future consumers), **NOT** the contribution window. Story 8.9 ships the **substrate**:

1. the per-Pariwar effective-dated **holiday-calendar registry** (trustee-curated, annually updatable);
2. a **PURE holiday resolver** (`@twt/domain`) — is-holiday / next-non-holiday-day / reconciliation-tail-window;
3. the **reconciliation-tail-window SEAM contract** (`@twt/contracts`) Epic 9 (matcher-tail scheduler) and Epic 11b Story 11b.3 (Sahyog Vivran auto-publish gate) will consume — **no live caller yet** (the Epic-8 "declared seam" convention);
4. the **member-facing empathy COPY seam** (i18n `contribution`, en+hi) for holiday-aware close-of-cycle framing — consumed by Epic 9's FR-19 surface.

**The alert lifecycle (8.1), FR-22, and the D5 contribution-window seam are UNCHANGED. Do not touch `live → closed` timing.**

---

## Story

As a member during a cycle whose reconciliation lands on a major Bihar holiday window,
I want close-of-cycle **reconciliation timing** to be calendar-aware — so matching-delay during Chhath Puja, Holi, or other locally-significant holidays is honored as lived reality, not treated as a failure, and the close-of-cycle framing I eventually see acknowledges it with dignity,
So that a holiday-delayed match never reads as "you missed" or "the pool failed," and the trust honors Bihar's calendar rather than a mechanical clock.

> Note: the contribution window itself stays a **hard Day-15 close** (FR-22). This story does **not** move the deadline a member contributes against — it makes the **reconciliation tail** and its member-facing framing calendar-aware, and lays the per-Pariwar registry every Pariwar's own calendar will use.

## Acceptance Criteria

Reframed to the RATIFIED scope. Each AC cites the authority it honors.

**AC1 — Per-Pariwar holiday-calendar registry (the configurable substrate).**
**Given** UX-DR77 ("Per-Pariwar holiday windows configurable"; "Other Pariwars will have their own holiday windows per their region" — `ux-design-specification.md:1003`)
**When** the registry is authored
**Then** a per-Pariwar, effective-dated `pariwar_holiday_calendar` table stores holiday **windows** as IST calendar date-ranges (`window_start_date`, `window_end_date`, `holiday_label`, `effective_year`), modeled 1:1 on the Story 7.5 `pool_fixed_amount_schedule` precedent (per-Pariwar, RLS tenant-isolated, GRANT-scoped, hand-authored migration, no snapshot regen)
**And** the calendar is **trustee-curated and updated annually** — the seed carries the six named windows (Chhath Puja, Holi, Diwali, Eid, Republic Day, Independence Day; `epics.md:477`) for the canonical validation Pariwar; the table is **region-neutral** (name `pariwar_holiday_calendar`, NOT `bihar_holiday_calendar` — the UX spec makes the principle Pariwar-local, not Bihar-specific; deviation from the epics literal name is deliberate, see Dev Notes)
**And** read + write accessors run on the caller's transaction (RLS is `SET LOCAL`-scoped; the 7.5 transaction contract).

**AC2 — Pure, replay-safe holiday resolver (`@twt/domain`).**
> **Correction note (BigDev, 2026-07-24 — code review):** "extended so the tail clears the holiday window" below is bounded by the `maxTailDays` policy ceiling, which wins over fully clearing an implausibly long window — `reconciliationTailDeadline`'s `clampedToMaxTail` case can leave the deadline inside the window rather than past it. **Ratified as intentional**, same posture as the AC3 `epics.md:3022` correction: an unbounded tail would leave a family's Sahyog Vivran unpublished indefinitely, so the policy bound is deliberately the harder constraint. Unreachable with the seeded windows (all ≤4 days, under the 7-day bound).
**Given** the D5 "one helper, cannot drift" discipline (`contribution-loop-templates.ts:44-59`)
**When** the resolver is authored
**Then** it is a **PURE, DB-free, unit-testable** module (boundary behavior IS the contract, per the 7.5 `selectEffectiveWindow` precedent): given a set of holiday windows + an instant, it exposes `isHolidayDate`, `nextNonHolidayDate`, and `reconciliationTailDeadline(closeInstant, windows)` → the calendar-aware tail deadline (Day-15 close + the normal 1–2-day tail, **extended** so the tail clears the holiday window, up to the 5–7-day bound; `epics.md:477`, `ux-design-specification.md:995-1001`)
**And** all window membership is computed in **IST (Asia/Kolkata, fixed UTC+5:30, no DST)** via fixed-ms offset arithmetic — never `setDate`/`getDate` (which read the process's local TZ), matching the UTC-safe fixed-ms house pattern (`contribution-loop-templates.ts:44-48`); replay is a pure function of the immutable window rows + the explicit instant, never a SQL/wall clock read.

**AC3 — The hard Day-15 contribution close is PRESERVED (regression fence).**
**Given** FR-22 (`live → closed` hard at Day 15) + the shipped 8.1 alert lifecycle + the D5 contribution-window seam
**When** this story lands
**Then** the alert lifecycle `live → closed` transition, `CYCLE_WINDOW_DAYS = 15`, `computeDaysRemaining`, the My Pool card window (`handlers.ts:459-461`), and the deadline-reminder sweep window (`contribution-notify-triggers.ts:845-850`) are **byte-unchanged** — a revert-sanity test proves 8.9 adds only the tail/registry surface
**And** the now-stale "Story 8.9 … REPLACES this fixed window" comments (`contribution-loop-templates.ts:34-37,48-49`; `contribution-notify-triggers.ts:810-811`) are **corrected** to: "Story 8.9 adds a reconciliation-TAIL window; the contribution close stays a hard Day-15 close (FR-22) — the tail is post-close reconciliation timing only."

**AC4 — Reconciliation-tail-window SEAM contract (`@twt/contracts`) — declared, no live caller yet.**
**Given** Epic 9 owns the matcher-tail scheduler and Epic 11b (`epics.md:3808,3855`, Story 11b.3) owns the Sahyog Vivran auto-publish gate — two separate future consumers, neither built yet
**When** the seam is authored
**Then** `@twt/contracts` exports the tail-window contract type (the shape Epic 9's matcher-tail scheduler AND Epic 11b's Sahyog-Vivran-publish gate each consume: `close_at`, `tail_deadline_at`, `extended_by_holiday: boolean`, `holiday_label | null`) with **NO live caller** — the file carries the explicit "no live consumer yet; Epic 9 Story 9.x (matcher tail) and Epic 11b Story 11b.3 (Sahyog Vivran publish gate) are the first callers" comment (the Epic-8 declared-seam convention, e.g. the 8.4 nominee-VPA `{available:false}` seam)
**And** the contract is internal-queue posture: **NO `.openapi()` registration** → `openapi/v1.yaml` stays byte-identical (the `alerts/`-directory posture, `contribution-loop-templates.ts:25-27`).

**AC5 — Member-facing empathy COPY seam (i18n `contribution`, en + hi).**
**Given** UX-DR77's "member notification reflects [the calendar reality] with empathy copy" + FR-19 close-of-cycle celebration framing (never "shortfall", never "you missed"; `epics.md:477`, PRD FR-19)
**When** the copy is authored
**Then** new keys under the `contribution` namespace (both `en` and `hi` locales) express holiday-aware close-of-cycle framing — the tone-review rules apply: **no** scarcity/panic language, **no** "irregular/incomplete/failed" framing, dignified acknowledgment of the holiday
**And** all standalone counts/amounts/dates render in **Latin numerals** per the §8 v4 operational-surface rule (`ux-design-specification.md:1122-1127`) — Devanagari prose is permitted, Hindi numerals are NOT (this is an operational close-of-cycle surface, not a memorial one)
**And** the copy is a **seam** (keys added; the live FR-19/close-of-cycle consumer is Epic 9) — do NOT wire a new live dispatch here.

**AC6 — Governance, invariants, and the drafting-error correction of record.**
**Given** the ratified scope
**When** verification runs
**Then** the story records the `epics.md:3022` drafting-error correction explicitly (this file's banner plus `epics.md:3011-3023`'s correction note plus `sprint-change-proposal-2026-07-24.md` are the artifact chain — not just this file in isolation); the new domain module lives OUTSIDE `packages/domain/src/pool/` so the pool **support-category** invariant gate's `pool/`-scoped walk (`scripts/pool-support-category-invariant/check.ts`, `SCAN_DIRS: ['packages/domain/src/pool', ...]`) does not false-scan a non-pool module (the pool **state** invariant gate scans all of `packages/domain/src` regardless of directory — it's a non-issue here because the module has no `pools.current_state` write pattern, not because of placement); and `pnpm ci:local` (DATABASE_URL on :5433) is green.

## Tasks / Subtasks

### Task 0 — Recon (do this first; do NOT skip)
- [x] Read the 7.5 analog end-to-end: `packages/domain/migrations/0075_pool-fixed-amount-schedule.sql`, `packages/domain/src/pool/fixed-amount.ts` (the PURE `selectEffectiveWindow` + DB-authoritative `now()` + caller-tx pattern), `packages/domain/src/schema/pool_fixed_amount_schedule.ts`.
- [x] Read the D5 seam + its two consumers: `packages/contracts/src/alerts/contribution-loop-templates.ts:31-135`, `apps/api/src/modules/member-pool/handlers.ts:57-91,459-461`, `apps/jobs/src/scheduler/contribution-notify-triggers.ts:801-899`. Confirm you will NOT modify their window math (only the stale comments per AC3).
- [x] Read the copy namespace shape: `packages/i18n/locales/en/contribution.json` + `hi/contribution.json` (note the `notify.*` and `active_contribution.tone.*` key families; your keys join them).
- [x] Confirm the latest migration is `0081` → yours is **`0082`**.

### Task 1 — The registry: migration `0082` + schema + RLS (AC1)
- [x] Hand-author `packages/domain/migrations/0082_pariwar-holiday-calendar.sql` (⚠ do NOT `db:generate`; carry ONLY this DDL; mirror 0075's GRANT + ENABLE/FORCE RLS + tenant-isolation policies; no snapshot file — baseline frozen at 0020; `pariwar_id` unFK'd per the pre-Epic-3 substrate posture).
  - Columns: `id uuid pk`, `pariwar_id uuid not null`, `holiday_label text not null`, `window_start_date date not null`, `window_end_date date not null`, `effective_year integer not null`, `created_by_actor text not null`, `created_at timestamptz default now() not null`, `audit_id uuid`. CHECKs: `window_end_date >= window_start_date`, `effective_year >= 2000`.
  - Indexes: `(pariwar_id, effective_year)`; `(pariwar_id, window_start_date)`.
  - GRANT `SELECT, INSERT, UPDATE, DELETE` (trustee re-curates annually — rows are replaceable, unlike the append-only attestation table) TO `twt_app`; `ENABLE`/`FORCE ROW LEVEL SECURITY`; SELECT + ALL tenant-isolation policies keyed on `current_setting('app.pariwar_id')`.
- [x] Add `packages/domain/src/schema/pariwar_holiday_calendar.ts` (drizzle `pgTable`, mirror `pool_fixed_amount_schedule.ts`) and register it in `packages/domain/src/schema/index.ts`.
- [x] Add the RLS policy source `packages/domain/src/policies/pariwar-holiday-calendar-rls.ts` (the 0075 policy-source precedent) so the migration's CREATE POLICY lines have a code home.

### Task 2 — The pure resolver (`@twt/domain`, OUTSIDE `pool/`) (AC2, AC6)
- [x] Create a NEW namespace `packages/domain/src/cycle-calendar/` (NOT under `pool/` — avoids the pool **support-category** invariant gate false-scan specifically; the pool state-invariant gate is unaffected by placement, see AC6). Files: `holiday-resolver.ts` (pure), `read.ts` (DB read of windows for a Pariwar/year on the caller's tx), `index.ts`.
- [x] `holiday-resolver.ts` — PURE, DB-free, no clock: `istCalendarDate(instant: Date): {y,m,d}` via fixed `+19_800_000` ms offset; `isHolidayDate(date, windows)`; `nextNonHolidayDate(date, windows)`; `reconciliationTailDeadline(closeInstant, windows, { normalTailDays, maxTailDays })` returning `{ tailDeadlineAt: Date, extendedByHoliday: boolean, holidayLabel: string | null }`. Bound the extension to `maxTailDays` (5–7d per `epics.md:477`); document the boundary vectors as the contract.
- [x] Unit tests with seeded frozen vectors: close-not-in-window (normal 1–2d tail), close-in-window (extended, clears window), window-straddling-tail, back-to-back windows, IST-boundary instants (a UTC instant that is a different IST calendar day), empty-calendar (fail-safe → normal tail).

### Task 3 — The tail-window SEAM contract (`@twt/contracts`) (AC4)
- [x] Add `packages/contracts/src/alerts/reconciliation-tail.ts`: the zod contract type (`close_at`, `tail_deadline_at`, `extended_by_holiday`, `holiday_label`) + the explicit "NO live consumer yet — Epic 9 Story 9.x (matcher tail) and Epic 11b Story 11b.3 (Sahyog Vivran auto-publish gate) are the first callers" comment. NO `.openapi()`. Re-export from the contracts alerts barrel.
- [x] Cross-package lockstep note only — do NOT import `@twt/domain` into contracts ([[project_contracts_domain_bundle_boundary]]); the resolver stays in domain, the contract shape stays in contracts.

### Task 4 — Preserve the hard close + correct the stale comments (AC3)
- [x] Do NOT change any window math. Update ONLY the comments: `contribution-loop-templates.ts:34-37,48-49` and `contribution-notify-triggers.ts:810-811` → "8.9 adds a reconciliation-TAIL window; the contribution close stays a hard Day-15 close (FR-22)."
- [x] Add a revert-sanity test asserting `CYCLE_WINDOW_DAYS === 15`, `computeDaysRemaining` behavior at the {0,15} boundaries, and that the card/sweep still read the un-extended window (regression fence).

### Task 5 — Member empathy copy seam (i18n) (AC5)
- [x] Add holiday-aware close-of-cycle keys to `packages/i18n/locales/en/contribution.json` + `hi/contribution.json` (e.g. `close_of_cycle.holiday_aware.title/body` + `_a11y`). Dignified, no scarcity/panic/"missed"; Latin numerals for counts/amounts/dates (§8 v4). Keep parity across both locales.
- [x] If the repo has an i18n key-parity / microcopy lint (FM-1..FM-14, tone-review), run it; add the five-ish new keys to any planted-violation test surface as real teeth (the 8.8 precedent) — do NOT extend copy-scan globs (the namespace is already in scope).

### Task 6 — Tests + governance verification (AC6)
- [x] Live-DB test for the registry: seed windows under a Pariwar scope, read them back within `withPariwarScope`; assert RLS isolation (a second Pariwar cannot read row 1). Follow the live-DB gotchas ([[project_live_db_test_gotchas]]): never regenerate 0082; never `DROP SCHEMA`; assert membership not counts.
- [x] End-to-end pure path: registry read → resolver → tail contract shape, with the seeded holiday vectors.
- [x] `pnpm ci:local` with DATABASE_URL on :5433 green (mirror all jobs); `--concurrency=4` already in `ci-local.sh` ([[project_ci_local_concurrency_oversubscription]]).

### Review Findings

- [x] [Review][Patch] Record AC2's policy-bound-wins interpretation as ratified (BigDev, 2026-07-24, same treatment as the AC3 `epics.md:3022` correction) — `reconciliationTailDeadline` (`packages/domain/src/cycle-calendar/holiday-resolver.ts:109-111`) clamps at `maxTailDays` and may leave the deadline inside a holiday window rather than always clearing it, diverging from AC2's literal "extended so the tail clears the holiday window" wording. Decided: ratify as-is, no code change — add an explicit ratification note to AC2 (mirroring the AC3 banner) so this is recorded as an intentional interpretation, not an open gap, before Epic 9/11b inherit the contract. Currently unreachable with the seeded windows (all ≤4 days).

- [x] [Review][Patch] `extendedByHoliday`/`holidayLabel` silently report `false`/`null` when `maxTailDays === normalTailDays` and a holiday consumes a tail day [packages/domain/src/cycle-calendar/holiday-resolver.ts:339-352] — traced the loop: when a caller tunes `maxTailDays` equal to `normalTailDays` (allowed; validation only requires `maxTailDays >= normalTailDays`) and a holiday intervenes, `offset` caps out exactly at `normalTailDays`, so `extendedByHoliday = offset > normalTailDays` evaluates `false` even though `clampedToMaxTail` is `true` and a holiday genuinely consumed a day. The copy layer and Epic 9/11b consumers get no signal a holiday caused the short tail. Fix: derive `extendedByHoliday` from `firstHolidayHit !== null` instead of the `offset` comparison. Not reachable with today's defaults (`DEFAULT_NORMAL_TAIL_DAYS=2`, `DEFAULT_MAX_TAIL_DAYS=7`), only under equal-days tuning.

- [x] [Review][Patch] `calendarDateToUtcMs` silently rolls over invalid day-of-month dates instead of throwing, contradicting its own doc comment [packages/domain/src/cycle-calendar/holiday-resolver.ts:126-137] — verified directly: `Date.parse('2026-02-30T00:00:00Z')` resolves to `2026-03-02` (rolls over) rather than `NaN`; only month overflow (`'2026-13-01'`) and day>31 (`'2026-01-32'`) actually produce `NaN` and get caught. The function's comment claims it rejects "impossible dates," which is only true for some invalid dates, not day-of-month-in-another-month cases. Not reachable via DB-sourced windows (Postgres `date` columns reject invalid calendar dates at INSERT), but reachable via any hand-constructed `HolidayWindow` (e.g. a test fixture or a future non-DB caller) bypassing DB validation, silently defeating the module's stated "fail loud on a curation defect" contract. Fix: after computing `ms`, reconstruct the calendar parts and compare against the input, throwing on mismatch.

- [x] [Review][Patch] Misleading `holidayLabel` doc comment [packages/domain/src/cycle-calendar/holiday-resolver.ts:106-108] — the comment reads "the FIRST window that consumed a tail day," but the algorithm's own stated rule two paragraphs above is that a holiday day consumes NO work/tail day. Reword to "the first holiday window encountered" (or similar) to stop contradicting the module's own rule.

- [x] [Review][Patch] No test asserts `nextNonHolidayDate` and `reconciliationTailDeadline`'s internal holiday-walk agree [packages/domain/src/cycle-calendar/holiday-resolver.ts] — `nextNonHolidayDate` is exported and unit-tested as a general "skip past holiday windows" primitive, but `reconciliationTailDeadline` reimplements its own day-stepping/holiday-check loop rather than composing on it. A future change to `holidayWindowFor`'s tie-break rule could silently diverge the two paths since nothing cross-checks them. Add one test asserting the two agree on holiday-membership walks.

- [x] [Review][Dismiss] ~~No DB uniqueness constraint backing `holidayWindowFor`'s determinism claim~~ — retracted on closer trace: `holidayWindowFor` checks every window's coverage of a day independently (`if (d < start || d > end) continue`), so day-membership is always the true union across windows regardless of tie-break; the tie-break only selects which *label* to report when genuinely different-named windows overlap the same day — an inherent, already-correctly-documented ambiguity (see the schema's own rejection note at `packages/domain/src/schema/pariwar_holiday_calendar.ts:102-106`), not a determinism gap. No fix needed.

- [x] [Review][Patch] `effective_year` CHECK has a floor (`>= 2000`) but no ceiling [packages/domain/migrations/0082_pariwar-holiday-calendar.sql; packages/domain/src/schema/pariwar_holiday_calendar.ts] — nothing stops an implausible future year (e.g. `9999`) from being curated. Low severity; add an upper-bound CHECK (e.g. a reasonable rolling ceiling) for symmetry with the floor.

- [x] [Review][Patch] Regex-based comment stripping in the fence test doesn't understand string/template literals [packages/contracts/tests/contribution-window-fence.test.ts:37] — `readCode()`'s two comment-stripping regexes would misfire if any of the three scanned files ever contained a string literal shaped like a comment. The fence is billed as "mechanized, not prose" in the Dev Agent Record; this is the one part of it that is itself regex-heuristic. Low priority — correctly detects the real files today — but worth a follow-up (tokenizer-based stripping, or scope the check to AST) if the fence is extended to more files.

Findings dismissed as noise or already-covered by established convention (verified against the codebase, not taken on faith): the RLS `select`+`all` policy pair byte-matches the 0075 precedent this migration explicitly mirrors, not new redundancy; `listHolidayWindowsForTail` reading only the close year and the next is the documented, correct handling of the actual Dec→Jan rollover risk (a "year-1" read isn't a real gap given how `effective_year` curation works); `replaceHolidayCalendarYear`'s delete-then-insert atomicity is explicitly the caller's-transaction contract, matching the 7.5 precedent; the unFK'd `pariwar_id` is the established pre-Epic-3 substrate posture used throughout the domain package, not a new gap; the copy-seam-to-contract-seam field mapping and the "three-deep deferred consumer stack" are both the story's own explicitly ratified declared-seam scope (Epic 9/11b do the wiring), not missing work; the repeated rationale comments across files match this codebase's established heavy-documentation house style; and the "BigDev self-ratifies" observation reflects this project's standing single-decision-maker workflow visible across many prior stories, not a process gap specific to 8.9.

## Dev Notes

### Substrate map — what already exists (reuse it; do NOT reinvent)

| Need | Shipped at | Location |
| --- | --- | --- |
| Effective-dated per-Pariwar registry (table + PURE window selector + DB-`now()` + caller-tx + RLS) | 7.5 | `packages/domain/migrations/0075_pool-fixed-amount-schedule.sql`, `packages/domain/src/pool/fixed-amount.ts`, `packages/domain/src/schema/pool_fixed_amount_schedule.ts` |
| RLS policy-source file → migration CREATE POLICY | 7.5 | `packages/domain/src/policies/pool-fixed-amount-schedule-rls.ts` |
| D5 contribution-window seam (`CYCLE_WINDOW_DAYS`, `computeDaysRemaining`, cycle-day, tone gradient) | 8.2/8.8 | `packages/contracts/src/alerts/contribution-loop-templates.ts` |
| My Pool card days-remaining consumer (do NOT touch) | 8.2/8.8 | `apps/api/src/modules/member-pool/handlers.ts:459-461` |
| Deadline-reminder sweep window consumer (do NOT touch) | 8.8 | `apps/jobs/src/scheduler/contribution-notify-triggers.ts:801-899` |
| Cycle-freeze `committed_at` accessor (the close-of-cycle anchor instant) | 7.3 | `poolDomain.getCycleFreezeCommittedAt` (used at `contribution-notify-triggers.ts:836`) |
| Contribution copy namespace (`notify.*`, `active_contribution.tone.*`) | 8.2/8.8 | `packages/i18n/locales/{en,hi}/contribution.json` |
| Declared-seam convention ("no live caller yet"; `{available:false}` first-class) | 8.4 | [[project_nominee_vpa_deferred_seam]] |
| Live `dispatch()` call site (do NOT add a second one here) | 8.8 | `apps/jobs/src/scheduler/contribution-notify.ts` — [[project_channels_no_live_dispatch_yet]] |

### Load-bearing invariants this story must NOT break
- **FR-22 hard Day-15 close.** `live → closed` is mechanical and firm. This story never moves it. The contribution window (`CYCLE_WINDOW_DAYS`, `computeDaysRemaining`) is byte-unchanged (AC3 revert-sanity fence).
- **The D5 "one helper, cannot drift" invariant.** The card and the deadline sweep read ONE window helper. You add a SEPARATE tail helper; you do not fork the contribution-window helper.
- **Determinism / replay.** The resolver is a pure function of immutable window rows + an explicit instant. No wall/SQL clock inside it (mirror 7.5's `asOf`-parameterized selector). IST via fixed +5:30 ms offset — India has no DST, so this is exact and calendar-equivalent.
- **Tenant isolation.** New table is RLS `ENABLE`+`FORCE`, tenant-isolation policies on `app.pariwar_id`; accessors run inside `withPariwarScope`.
- **Bundle boundary.** `@twt/contracts` imports nothing pg-touching; the resolver stays in `@twt/domain` ([[project_contracts_domain_bundle_boundary]]).
- **Gate hygiene.** New domain module lives OUTSIDE `packages/domain/src/pool/` so the pool **support-category** gate's `pool/`-scoped walk does not false-scan it; the pool state-invariant gate is unaffected either way (no `pools.current_state` write pattern) ([[project_access_wrapper_gate_pending_scope]], [[feedback_gate_scope_semantic_coverage]]).

### Decisions — ratified defaults, build to these
1. **Scope = substrate, not window-extension (BigDev, 2026-07-24).** See the banner. Day-15 close preserved; calendar-awareness is the reconciliation tail + Sahyog-Vivran-publish + member framing. `epics.md:3022` is a recorded drafting error.
2. **Region-neutral name `pariwar_holiday_calendar`** (not `bihar_holiday_calendar`) — CONFIRMED, BigDev, 2026-07-24. Deviation from epics wording: although the original epic text referred to `bihar_holiday_calendar`, the canonical schema uses `pariwar_holiday_calendar` because the holiday registry is **owned by a Pariwar, not a geographic region**. Bihar is the launch **seed** dataset; the schema remains region-neutral to honor the UX requirement that different Pariwars may maintain different holiday calendars (`ux-design-specification.md:1003` — "Rail Parivar's calendar … will differ; Bank Parivar's … will differ").
3. **Tail bounds:** normal 1–2 days, holiday-extended up to 5–7 days (`epics.md:477`). Encode as `{normalTailDays, maxTailDays}` params (defaulted), not magic numbers — annual/regional tuning is DATA, not code.
4. **Live wiring is Epic 9 / Epic 11b.** The tail contract (AC4) and the empathy copy (AC5) are SEAMS. No new `dispatch()` caller, no live matcher-tail scheduler here — the matcher-tail wiring is Epic 9 Story 9.x, the Sahyog Vivran auto-publish wiring is Epic 11b Story 11b.3.
5. **IST offset as a fixed constant** (`+19_800_000` ms), not `Intl.DateTimeFormat` — deterministic, dependency-free, replay-safe, and exact for India (no DST).

### Anti-patterns — do NOT do these
- ❌ Extending `CYCLE_WINDOW_DAYS` or the `live → closed` timing (that is the drafting error; it violates FR-22).
- ❌ Putting the resolver under `packages/domain/src/pool/` (pool-gate false-scan).
- ❌ Importing `@twt/domain` into `@twt/contracts` (Metro bundle `pg` leak).
- ❌ Reading the clock inside the resolver, or using `setDate`/`getDate` (local-TZ drift).
- ❌ Adding a live notification dispatch (this is a copy/contract seam; Epic 9 wires it).
- ❌ Regenerating migration 0082 with `db:generate`, or resetting via `DROP SCHEMA` ([[project_live_db_test_gotchas]]).
- ❌ Hindi numerals in the close-of-cycle copy (operational surface → Latin numerals, §8 v4).

### Testing standards
- Pure-resolver unit tests are the primary teeth: seeded frozen vectors, boundary instants (IST vs UTC day flip), empty-calendar fail-safe. Boundary behavior IS the contract.
- Live-DB registry test under `withPariwarScope` with RLS-isolation assertion; test DB = `twt-test-pg` Docker on :5433; assert membership not counts; never regenerate the migration ([[project_live_db_test_gotchas]]).
- Revert-sanity fence proves the contribution window is untouched (AC3).
- Merge gate = `pnpm ci:local` green with DATABASE_URL on :5433 ([[project_ci_actions_suspension_local_mirror]]).

### Project Structure Notes
- Migration: `packages/domain/migrations/0082_pariwar-holiday-calendar.sql` (hand-authored, mirrors 0075).
- Schema: `packages/domain/src/schema/pariwar_holiday_calendar.ts` (+ register in `schema/index.ts`).
- RLS source: `packages/domain/src/policies/pariwar-holiday-calendar-rls.ts`.
- Resolver namespace: `packages/domain/src/cycle-calendar/{holiday-resolver.ts,read.ts,index.ts}` (NEW; outside `pool/`).
- Contract seam: `packages/contracts/src/alerts/reconciliation-tail.ts` (+ barrel re-export; NO openapi).
- Comment corrections: `packages/contracts/src/alerts/contribution-loop-templates.ts`, `apps/jobs/src/scheduler/contribution-notify-triggers.ts`.
- Copy: `packages/i18n/locales/{en,hi}/contribution.json`.
- No `apps/mobile` change — the card reads server-authoritative days-remaining and never re-derives the window (`handlers.ts:459-460`); the tail is server/Epic-9 only.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.9 (L3011-3023) — reframed per ratified scope]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR77 anchor (L477) — "Day 15 mechanical close … reconciliation tail … per-Pariwar configurable"]
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-22 (L524,531) — live→closed HARD at Day 15]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Calendar-aware close-of-cycle (L995-1003)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Numerals §8 v4 (L1122-1127) — operational surfaces = Latin numerals]
- [Source: packages/domain/migrations/0075_pool-fixed-amount-schedule.sql — the effective-dated per-Pariwar registry + RLS pattern]
- [Source: packages/domain/src/pool/fixed-amount.ts — PURE window selector + caller-tx + DB-authoritative now precedent]
- [Source: packages/contracts/src/alerts/contribution-loop-templates.ts:31-59 — the D5 contribution-window seam (preserved; comment corrected)]
- [Source: apps/jobs/src/scheduler/contribution-notify-triggers.ts:801-899 — deadline sweep window consumer (preserved)]
- [Source: apps/api/src/modules/member-pool/handlers.ts:459-461 — My Pool card window consumer (preserved)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / bmad-dev-story)

### Debug Log References

- `pnpm --filter @twt/domain vitest run tests/cycle-calendar/holiday-resolver.test.ts` → 45/45.
- `DATABASE_URL=…:5433 pnpm --filter @twt/domain vitest run tests/integration/cycle-calendar/holiday-calendar.spec.ts` → 10/10.
- `pnpm --filter @twt/contracts vitest run tests/reconciliation-tail.test.ts` → 15/15; `…/contribution-window-fence.test.ts` → 11/11.
- `pnpm vitest run scripts/microcopy/contribution.test.ts` → 27/27 (20 pre-existing + 7 new Story-8.9 teeth).
- Gate runs: `pnpm microcopy:check` ✓, `pnpm --filter @twt/i18n i18n:check-parity` ✓, `contracts:emit-openapi` → `openapi/v1.yaml` byte-identical (`git diff` empty).
- **Planted-violation teeth check (AC3 fence).** Injected `const planted = { tailDeadline: 1 };` into `contribution-loop-templates.ts` → the structural fence FAILED (`"tailDeadline" appeared in …`), 1 failed / 10 passed. Reverted → 11/11. The fence bites; it is not a vacuous green.
- **ci:local flake, then clean.** First full `pnpm ci:local` run: 27/28 jobs green, `test (unit)` red — but my invocation piped through `tail -60`, truncating the log, so the failing suite was never identified. Re-running the identical unit job standalone (`pnpm turbo run test --concurrency=4`, same DATABASE_URL) exited 0 with every package passing, and the second full `ci:local` was green — consistent with the known contention flake class ([[project_ci_local_concurrency_oversubscription]]), not a regression from this story. Recorded openly rather than silently re-run.

### Completion Notes List

**What shipped — the substrate, not a live feature.** Story 8.9 lands four seams and zero live callers, exactly as the ratified scope requires:

1. **The registry (AC1).** Migration `0082_pariwar-holiday-calendar.sql`, hand-authored on the 0075 pattern: per-Pariwar, RLS `ENABLE`+`FORCE` with tenant-isolation policies on `app.pariwar_id`, `pariwar_id` unFK'd, no snapshot regen, journal entry appended by hand (`idx 82`, additive-only diff verified). One deliberate divergence from 0075: the GRANT includes **DELETE**, because the calendar is *re-curated annually* — its rows are replaceable curated data, not an append-only attestation record. `window_start_date`/`window_end_date` are `date` columns (drizzle `mode: 'string'`) rather than instants, so a holiday window is a run of IST *calendar* days and can never be compared through a shifted timezone; both bounds INCLUSIVE, with a `window_end_date >= window_start_date` CHECK.
2. **The pure resolver (AC2).** New `packages/domain/src/cycle-calendar/` namespace (`holiday-resolver.ts` pure, `read.ts` DB shell, `seed.ts`, `index.ts`), exported as the `cycleCalendar` namespace. IST via the fixed `+19_800_000` ms offset — exact, because India has no DST — never `setDate`/`getDate`/`Intl`. Every entry point is a total function of its arguments with the close instant passed explicitly, so a historical tail replays identically forever.
3. **The tail contract (AC4).** `packages/contracts/src/alerts/reconciliation-tail.ts`, no `.openapi()`, no live caller, both future consumers named in-file. `@twt/contracts` does **not** import `@twt/domain` at source level ([[project_contracts_domain_bundle_boundary]]); the two tail-band constants are a deliberate duplication guarded by a *test-only* cross-package assertion (the `claims-appeal.test.ts` precedent).
4. **The copy seam (AC5).** Six keys per locale under `contribution.close_of_cycle.*`, en + hi parity, Latin numerals throughout (all dates arrive as interpolated `{date}`/`{expected}` tokens), no scarcity/panic/shortfall framing. No new dispatch call site — `apps/jobs/src/scheduler/contribution-notify.ts` remains the stack's only live `dispatch()` caller.

**Three design decisions worth review attention:**

- **The tail counts NON-HOLIDAY days, it does not merely dodge windows.** The rule is: the tail is `normalTailDays` days of *actual reconciliation work* after the close; a holiday day inside the tail consumes none (banks and volunteers observing Chhath are not matching statements); the whole extension is then bounded by `maxTailDays` calendar days. This was chosen over the simpler "push the deadline out of whatever window it lands in" because the UX-DR77 bands then *fall out of the data* instead of being hardcoded: a close on day 1 of the four-day Chhath window yields a 5-day tail, squarely inside the decision record's "5-7 days on Bihar holiday windows". The alternative rule would leave a tail that lost a work day to a mid-tail holiday silently short.
- **`tail_deadline_at` is an EXCLUSIVE bound** (IST midnight opening the day after the deadline day), mirroring `pool_fixed_amount_schedule.effective_until`. A consumer asks `now < tail_deadline_at`; there is no end-of-day-minus-one-millisecond to get wrong.
- **`listHolidayWindowsForTail` reads the close's year AND the next.** A cycle closing in late December has a tail running into January, whose observances live in the *next* curation year's row set. Reading only the close year would silently drop them — the exact "mechanical clock over lived calendar" failure UX-DR77 exists to prevent. Covered by a live-DB test.

**The AC3 fence is the story's real deliverable.** The negative requirement (the Day-15 close must survive untouched) is mechanized, not asserted in prose: `packages/contracts/tests/contribution-window-fence.test.ts` pins `CYCLE_WINDOW_DAYS === 15`, pins `computeDaysRemaining.length === 2` (a holiday-aware variant would *have* to accept the windows — arity is the cheapest structural proof the tail's inputs never reached it), walks the {0,15} boundaries including a cycle whose window ends inside Chhath Puja, and scans the D5 seam plus both live consumers (`handlers.ts`, `contribution-notify-triggers.ts`) for tail vocabulary in *executable* code (comments stripped first, since those files now legitimately *discuss* the tail per the AC3 correction). That structural half is what makes it a revert-sanity check rather than a restatement of existing D5 tests: a tail-aware branch taken only when a Pariwar has curated windows would pass every behavioural test written before 8.9 and be caught here.

**Deliberate deviations / assumptions BigDev should confirm:**

- **The seed dates are indicative, not authoritative.** `BIHAR_LAUNCH_HOLIDAY_WINDOWS` carries the six named 2026 windows, but the lunar observances (Chhath, Holi, Diwali, Eid) shift annually and their locally-observed *span* is a Pariwar decision, not an astronomical fact. They are flagged in-file as requiring trustee verification against the published Bihar government holiday list before the year opens. Nothing in the resolver depends on them — the code is tested against its own frozen vectors.
- **The seed is NOT wired into Pariwar provisioning.** `seedHolidayCalendarYear` exists and is idempotent (it refuses to overwrite an existing curation — a trustee's hand-correction is never reverted by a re-run), but no story task asked for the provisioning call site and adding one would put unverified dates into every new tenant. Wiring it is a one-line addition in `apps/api/src/modules/pariwar-provisioning/index.ts` alongside `seedGenesisFixedAmount` whenever the curated dataset is signed off.
- **A neutral `close_of_cycle.settling.*` copy arm was added alongside the holiday arm.** The tail contract carries a `boolean`, so a copy seam covering only the `true` branch would be half a seam and Epic 9 would have to invent the other half. Two arms, six keys.
- **`istCalendarDate` returns `{ year, month, day }`** (1-based month) rather than the story's shorthand `{y,m,d}` — cosmetic naming only, matching house readability.
- **No unique index on `(pariwar_id, effective_year, holiday_label)`**, deliberately: some observances legitimately recur as several disjoint windows in one year (two Eids; a split regional observance), and uniqueness would force curators to invent distinguishing labels. Overlaps are harmless — membership is a union and `holidayWindowFor` resolves them deterministically (earliest start, label as tie-break) so row order out of the DB never changes an answer.

**Gate hygiene (AC6).** The new module lives outside `packages/domain/src/pool/`, so the pool **support-category** gate's recursive `pool/` walk does not false-scan a non-pool module — and, per [[feedback_gate_scope_semantic_coverage]], **no gate scope was extended**: the `contribution` i18n namespace was already in `microcopy.yaml` `copy_globs` (Story 8.2), so the honest deliverable there is *teeth*, not scope — seven planted-violation tests over real `close_of_cycle.*` keys (scarcity, panic, pool-reality comparison in both locales, Devanagari operational digits), plus a clean-phrasing revert-sanity case. The pool **state**-invariant gate scans all of `packages/domain/src` regardless of directory and is a non-issue here because the module has no `pools.current_state` write pattern — placement has nothing to do with that one.

### File List

**New**
- `packages/domain/migrations/0082_pariwar-holiday-calendar.sql`
- `packages/domain/src/schema/pariwar_holiday_calendar.ts`
- `packages/domain/src/policies/pariwar-holiday-calendar-rls.ts`
- `packages/domain/src/cycle-calendar/holiday-resolver.ts`
- `packages/domain/src/cycle-calendar/read.ts`
- `packages/domain/src/cycle-calendar/seed.ts`
- `packages/domain/src/cycle-calendar/index.ts`
- `packages/domain/tests/cycle-calendar/holiday-resolver.test.ts`
- `packages/domain/tests/integration/cycle-calendar/holiday-calendar.spec.ts`
- `packages/contracts/src/alerts/reconciliation-tail.ts`
- `packages/contracts/tests/reconciliation-tail.test.ts`
- `packages/contracts/tests/contribution-window-fence.test.ts`

**Modified**
- `packages/domain/migrations/meta/_journal.json` (append-only: `idx 82`)
- `packages/domain/src/schema/index.ts` (barrel registration)
- `packages/domain/src/policies/index.ts` (barrel registration)
- `packages/domain/src/index.ts` (`cycleCalendar` namespace export)
- `packages/contracts/src/alerts/index.ts` (barrel re-export)
- `packages/contracts/src/alerts/contribution-loop-templates.ts` (AC3 comment corrections ONLY — window math byte-unchanged)
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts` (AC3 comment correction ONLY — sweep logic byte-unchanged)
- `packages/i18n/locales/en/contribution.json` (+6 keys)
- `packages/i18n/locales/hi/contribution.json` (+6 keys)
- `scripts/microcopy/contribution.test.ts` (+7 Story-8.9 planted-violation teeth)
- `_bmad-output/implementation-artifacts/8-9-calendar-aware-close-of-cycle-timing.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Date | Change |
| --- | --- |
| 2026-07-24 | Story 8.9 implemented — per-Pariwar holiday-calendar registry (migration 0082), the PURE IST holiday/reconciliation-tail resolver (`@twt/domain` `cycleCalendar`), the `ReconciliationTailWindow` seam contract (`@twt/contracts`, no live caller), and the bilingual holiday-aware close-of-cycle copy seam. FR-22's hard Day-15 contribution close preserved byte-unchanged and fenced by a planted-violation-proven revert-sanity test; the `epics.md:3022` window-extension prose recorded as a ratified drafting error in the three stale in-code comments. |
