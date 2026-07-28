---
baseline_commit: 939d67422ec13d1f8c6a4c558cc31f3964ca75cc
---

# Story 9.10: 4-Hour Retry Reminders (pending_match nudge)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member whose contribution is **stuck in `pending_match`** — I told the trust I paid (self-attested my UTR → the yellow pill), but the reconciliation matcher has not yet confirmed the money,
I want a **gentle reminder after ~4 hours** (and a **firmer one after ~24 hours**) that lets me re-check or re-attempt the payment,
so that a payment that quietly never landed (or a UTR I mistyped) does not silently sit unresolved until the cycle closes.

## Scope decisions (LOCKED by BigDev, 2026-07-28)

Story 9.10's two source documents **contradict each other** on the trigger precondition. These were resolved with BigDev before authoring; they are binding.

### Decision 1 — Precondition = **PRD FR-35 `pending_match > 4h`** (NOT the epic AC's "intent fired, no attestation")

- **PRD FR-35 (authoritative):** *"Members with `pending_match` after 4 hours get a soft reminder; after 24 hours, escalated."* (`prds/prd-TWT-2026-05-22/prd.md:635-637`). `pending_match` = a member who **HAS** self-attested a UTR (`contribution.utr-attested`, yellow) whose payment the matcher has **not yet resolved** (no `contribution.confirmed` green, no `contribution.reconciliation-mismatch` red).
- **epics.md:3320-3323 prose** says instead *"if a UPI Intent was fired but no UTR attestation arrived within ~4 hours."* This is the **opposite** precondition and is treated as a **ratified epic drafting divergence** from FR-35 — the same class as the corrected `epics.md:3022` (Story 8.9 tail) and `epics.md:3275` (`reconciliation-mismatch` name) drafting errors. **Follow the PRD.**
- **Why the PRD reading (and not the epic prose):** the epic prose is **both non-authoritative and un-buildable today**:
  - There is **no durable, queryable "UPI intent fired" signal.** The intent endpoint (`apps/api/src/modules/payment/handlers.ts` `intent()`) writes only a **PII-shielded audit line** (`member_contribution.intent`) that carries **no `alert_id`** — it cannot anchor a per-(member, cycle) 4-hour clock, and the audit log is not a read model.
  - The **UPI-intent flow is dark**: `resolveNomineeVpa` returns `{ available: false, reason: 'vpa_not_collected' }` for every claim until the deferred nominee-VPA-collection story lands (`[[project_nominee_vpa_deferred_seam]]`), so **no real intent fires** in v1.
  - The **`pending_match` reading is fully LIVE today**: the yellow-pill attestation half of Story 8.4 works (an out-of-band payer attests even with the intent flow dark — Story 8.10), `contribution.utr-attested` is a first-class event carrying `occurred_at` + payload `poolId`/member, and the Story 9.4/9.5 matcher emits the `contribution.confirmed` / `contribution.reconciliation-mismatch` resolving verdicts. "Attested & unresolved & older than N" is directly derivable — no new signal, no dark seam.

### Decision 2 — Ship **both FR-35 tiers**: `> 4h` soft + `> 24h` escalated

The epic AC mentions only the single 4h push; FR-35 defines two tiers. Ship both.

### Decision 3 — "Escalated" = a **firmer second member-facing push**, NOT a new staff surface

- `> 24h` fires **one additional member-facing reminder** with firmer/escalated copy, on a **distinct idempotency scope** (`pending_match_escalated`) + **distinct tone**, still `alert_category: 'deadline_reminder'`, still cost-optimized + rate-limited.
- **No new staff surface, no new events.** Staff already see attested-but-unresolved cases via the **Story 9.8 reconciliation review queue** (`listOpenReconciliationCases`, deadline-proximity ordered, no new table). 9.10 does **not** touch that queue, its ordering, or its schema.

> ⚠️ **9.10 is a notification-trigger story, not a state or read-model story.** It adds **no** `events_log` event type (`contribution.*` stays exactly three — the Story 8.10 fourth-type fence), **no** new alert category (`deadline_reminder` already exists from Story 8.8), touches **nothing** under `packages/channels/src/**` (frozen — `[[project_channels_no_live_dispatch_yet]]`), and **never** promotes/counts/displays a yellow attestation as confirmed (the load-bearing yellow-never-pollutes-the-meter invariant, epics.md:2939-2941 — same rule Story 8.8's nudge-suppression obeys).

## Acceptance Criteria

1. **A per-pool "pending-match members" read (the trigger's honest data source).** A new transport-free, decryption-free `@twt/domain` read (e.g. `listPendingMatchMembersForPool(db, { pariwarId, alertId, poolId })`) returns, for one pool, each member who has ≥1 `contribution.utr-attested` (yellow) that is **NOT resolved** — resolution meaning **either** a live `contribution.confirmed` (via the existing `hasLiveConfirmation` chain — confirmed event ids minus `reconciliation.confirmation-reversed`) **or** a `contribution.reconciliation-mismatch` (`CONTRIBUTION_MISMATCH_EVENT_TYPE`) for that (member, pool). Each returned entry carries the member's **oldest unresolved `attested_at`** (the `contribution.utr-attested` `occurred_at`) so the sweep can bucket it into a tier. **Each unresolved attestation independently progresses through the reminder cadence; when more than one unresolved attestation exists for the pool, the scheduler evaluates the tier thresholds against the OLDEST unresolved attestation — a newer attestation never restarts or resets an earlier one's cadence.** (In practice a member holds exactly one attestation per alert — see the idempotency-per-(member,alert) note in Dev Notes — so this is a deterministic tiebreak for defensive/edge data, not the common path.) Hard-scoped to `pariwar_id` + RLS; batched (a fixed number of queries regardless of roster size — mirror `listMemberContributionHistory` / `listActedMemberIdsForPool`, NOT a per-member query). A member with **no** attestation, or whose attestation is already confirmed/mismatched, is **structurally absent** from the result.

2. **A cadence sweep buckets pending-match members into two tiers by attestation age.** A pg-boss cron sweep (IST) scans **reconciling** alerts — `current_state IN ('live','closed')`, excluding `settled` (done) and pre-live (nothing to reconcile yet), matching the Story 9.8 review-read bound — and for each pool resolves AC-1's pending-match members. For each member it computes `age = now − oldest_unresolved_attested_at` and assigns:
   - **soft tier** when `age ≥ PENDING_MATCH_SOFT_REMINDER_AGE_MS` (**4h**),
   - **escalated tier** when `age ≥ PENDING_MATCH_ESCALATION_AGE_MS` (**24h**).
   A member ≥24h is eligible for the **escalated** tier (they will already have received the soft tier once). Thresholds are named consts, not inline magic numbers.

3. **Each tier sends AT MOST ONE push per member, EVER, for a given attestation (rate-limit).** Exactly-once per `(alert_id, member_id, tier)` rests on the Story 1.12 keyed store's `claim`/`recordResult`/`getResult` cycle, gated with a **long-lived TTL** (`PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS`, sized to outlive the full reconciliation window — see Dev Notes → *the once-ever nuance*) — **not** the 5-minute `DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS` the day-N deadline reminders use, which would let a completed record expire (and get vacuumed) between hourly sweep ticks and re-nudge the member every hour. The idempotency scope tokens are `pending_match` (soft) and `pending_match_escalated` (escalated). A member who was already sent tier T is skipped on every subsequent tick; a member who resolves (green/red) between ticks simply drops out of AC-1's result and is never (further) nudged.

4. **The reminder is delivered via the Story 5.1 dispatcher as a `deadline_reminder`, with NEW retry-flavored copy and a pool-scoped deep link.** The push runs through the **existing live fan-out** (`fanOutAlertToMembers`, `apps/jobs/src/scheduler/contribution-notify.ts` — CONSUMED unchanged) with `alert_category: 'deadline_reminder'` and `time_critical: false`. The **copy is new and distinct** from the day-5/10/13/14 deadline nudges: a `pending_match` member has already paid/attested, so the message is *"we're still confirming your payment — if it didn't go through, here's how to re-check/retry,"* soft for tier 1 and firmer for tier 2 — **never** "please contribute before day X." Today `deepLinkTargetForAlert`'s `deadline_reminder` case routes every `deadline_reminder` push to the generic `renewals` landing (`resourceId: null`) because the day-N payload carries no pool identity — correct for the day-N nudges, wrong for a `pending_match` retry, which must land on the member's own status/self-verify view for THAT pool, not a fresh pay prompt. This story's new payload carries `pool_id`; the `deadline_reminder` case is extended to route to `contributions/:pool_id` **when the payload carries a `pool_id`**, falling through to the existing `renewals` landing when it doesn't — the day-N reminders' current behavior is unchanged.

5. **Cost-optimization per Story 5.7 applies (suppress on recent in-app engagement).** Suppression is automatic via the fan-out's `evaluateCostOptimization`: `deadline_reminder`'s 30-minute per-category staleness window means a member who has opened the app within the window has the two **paid** channels (WA/SMS) omitted (push is never suppressed). This is the AC's *"suppressed if member has recent in-app engagement."* No new suppression logic is written — it is inherited by using the `deadline_reminder` category + the shared fan-out.

6. **Never time-critical, never a bulk-SMS bridge, never a group mirror.** `time_critical: false` — a retry reminder must never trip the AR-20 degraded-mode SMS bridge (that is the cycle-open AR-18 signal only). `deadline_reminder` is not Telegram-mirror-eligible, so no group channel receives it.

7. **The nudge is a courtesy about interruption ONLY — it touches no financial-truth surface.** Selecting/sending a pending-match reminder does **not**, and must not, promote, count, or display the member's yellow attestation as confirmed: nothing in this story touches `progress.confirmedCount`, the confirmed-contributor list, `listConfirmedContributorsForPool`, or any "raised so far" figure (the exact invariant Story 8.8's `resolveReminderSuppressions` obeys, epics.md:2939-2941).

8. **No regressions, no fences tripped.** `contribution.*` stays **exactly three** event types (8.10 fourth-type fence green); **no** new alert category; **nothing** under `packages/channels/src/**` modified; Story 8.8's cycle-open + deadline-reminder + confirmed + mismatch triggers stay green; Story 9.8's review queue untouched; `pnpm ci:local --concurrency=4` green with live-DB reads on `twt-test-pg` :5433.

## Tasks / Subtasks

- [x] **Task 1 — The pending-match members read (AC: 1, 7).**
  - [x] Add `listPendingMatchMembersForPool` to `@twt/domain` (co-locate with the reconciliation/contribution reads it reuses — likely `packages/domain/src/contribution/read.ts` alongside `listActedMemberIdsForPool`, or `reconciliation/read.ts`). Returns `{ memberId, oldestUnresolvedAttestedAt }[]` for one `(pariwarId, alertId, poolId)`.
  - [x] Source `contribution.utr-attested` rows (`occurred_at`, payload member + `poolId`) the same way `listMemberContributionHistory` selects them, but batched pool-wide the way `listActedMemberIdsForPool` batches its attested/confirmed sets (this is a per-pool multi-member read, not a per-member history read); batch the confirmed / reversed / mismatch lookups (reuse `hasLiveConfirmation`, `CONFIRMED_EVENT_TYPE`, `REVERSED_CONFIRMED_EVENT_ID_KEY`, `CONTRIBUTION_MISMATCH_EVENT_TYPE`, and the payload key consts already exported from `contribution/read.ts` + `contribution/history.ts`). Drop malformed attested rows (missing `poolId`/`utr`) like the history read does.
  - [x] Tenant-scope (`pariwar_id` predicate + RLS); NO `status`/`state` parameter that could admit a resolved row (structural, like the confirmed-only read). Unit + live-DB tests: attested-only → present; attested+confirmed → absent; attested+mismatch → absent; attested+confirmed-then-reversed → present again; cross-tenant → absent.

- [x] **Task 2 — Tier thresholds + retry copy + pool-scoped deep link (AC: 2, 3, 4).**
  - [x] Add named age-threshold consts (`PENDING_MATCH_SOFT_REMINDER_AGE_MS = 4 * 60 * 60 * 1000`, `PENDING_MATCH_ESCALATION_AGE_MS = 24 * 60 * 60 * 1000`) plus a dedicated idempotency-TTL const (`PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS`, weeks-scale — long enough to outlive the ~20-day reconciliation window, e.g. `30 * 24 * 60 * 60`) — the natural home is alongside the sweep in `contribution-notify-triggers.ts` (operational knobs). Do NOT reuse `DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS` (300s) for these two kinds — see Dev Notes → *the once-ever nuance*.
  - [x] Add the two new copy variants (soft + escalated) to `packages/i18n/locales/hi/contribution.json` + `.../en/contribution.json` under the `contribution` namespace, and register their template keys in `packages/contracts/src/alerts/contribution-loop-templates.ts` (sibling of `CONTRIBUTION_LOOP_TEMPLATE_KEYS` / `CYCLE_OPEN_TEMPLATE_KEYS`). Hindi-primary per architectural-freeze row 10; the English parity string is asserted by the coherence test. Copy register: dignified, non-accusatory (Story 2.2) — *"अभी आपका भुगतान जाँचा जा रहा है…"* not *"you missed…"*.
  - [x] Add a `buildPendingMatchRetryAlert(...)` builder (sibling of `buildDeadlineReminderAlert`) that emits `alert_category: 'deadline_reminder'`, `time_critical: false`, and a **new minimal payload shape** carrying `{ subject, poolId }` as a sibling type in `contribution-loop-templates.ts` (still `deadline_reminder` category — do NOT add a category). Do NOT reuse `buildDeadlineReminderPayloadData` — its `deadline_at` field is mandatory and the renderer prints "— due {date}", which is wrong copy for a retry nudge that has no deadline. Resolve the pool identity (family label + pool label) via the existing `notifications.resolvePoolIdentity` the child already loads once per pool. The `poolId` field is what the deep-link fix below keys off of.
  - [x] Extend `deepLinkTargetForAlert`'s `deadline_reminder` case (`packages/contracts/src/deep-links/deep-link.ts`) to return `{ resource: 'contributions', resourceId: poolId }` when the payload carries a `pool_id`, falling through to the existing `{ resource: 'renewals', resourceId: null }` when it doesn't. Add a regression test asserting the day-5/10/13/14 reminders (no `pool_id`) still resolve to `renewals` unchanged.

- [x] **Task 3 — The cadence sweep + child wiring (AC: 2, 3, 4, 5, 6).**
  - [x] Extend `ContributionNotifyKind` (`contribution-notify-triggers.ts`) with `'pending_match'` and `'pending_match_escalated'` so the **one** POOL_BATCH child fan-out path serves this trigger too (the 8.8 D6 "one fan-out path to reason about" principle). Wire `alertFor` + `idempotencyScope` + the singleton-key `scope` suffix for the two new kinds.
  - [x] Add `runPendingMatchRetrySweep(deps, boss)` modeled on `runDeadlineReminderSweep`: scan `current_state IN ('live','closed')` alerts (bounded, ordered by `cycle_id`, alarmed on full batch), and per pool call `listPendingMatchMembersForPool`, bucket members by tier (Task 2 thresholds), and `enqueuePoolBatch` **per (pool, tier)** with the member subset for that tier. `time_critical: false` always.
  - [x] **The once-ever guard (AC-3 — do not get this wrong):** `getResult(key)` only returns a completed record while `expires_at >= now()` — a completed row still expires on its original claim TTL — and the hourly `purgeExpiredKeys` vacuum (`apps/jobs/src/boot.ts`, `VACUUM_CRON`) deletes expired rows, completed or not, on the same schedule. Durability does NOT come from `recordResult` alone; it comes from **claiming with a long TTL in the first place**. For the two new kinds, `claim()` (and the subsequent `recordResult()`) must use `PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS` (Task 2), not `DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS` (300s) — the latter would let the record lapse and get vacuumed well before the next hourly tick, re-nudging the member every hour. This requires per-kind TTL plumbing: `runContributionNotifyChild`'s claim/record calls currently take one shared `ttl` per child run — extend it to select the TTL by `kind` (each child payload carries exactly one `kind`, so this is a lookup, not a structural change). The child must still check `getResult` before `claim` (skip an already-sent member) and `release` on failure, unchanged from the existing pattern.
  - [x] Add the queue name `CONTRIBUTION_PENDING_MATCH_RETRY_SWEEP` to `packages/queue/src/index.ts` (sibling of `CONTRIBUTION_DEADLINE_REMINDER_SWEEP`). Register the queue + worker + cron in `registerContributionNotifyWorkers`; default cron **hourly IST** (`'50 * * * *'`-style, offset from the existing sweeps so they don't all fire on the same minute) so the 4h/24h boundaries are caught within the hour. `tz: CONTRIBUTION_NOTIFY_TZ`.
  - [x] Confirm cost-optimization + non-time-critical + no-Telegram-mirror are inherited (no code — they come from `deadline_reminder` + the shared fan-out). Add an assertion/test that a `pending_match` alert is `time_critical: false`.

- [x] **Task 4 — Boot + no-regression (AC: 5, 6, 8).**
  - [x] `apps/jobs/src/boot.ts` already calls `registerContributionNotifyWorkers(boss, contributionNotifyDeps)` — the new sweep registers inside it, so boot needs **no** new call (verify the cron schedules on startup). Export any new public builders from the `@twt/jobs` barrel (`apps/jobs/src/index.ts`) only if a test needs them.
  - [x] Green: `apps/jobs/tests/contribution-notify.test.ts`, `contribution-notify-triggers.test.ts`, `contribution-notify-live.test.ts` (parent/child/deadline-sweep coverage), `packages/contracts` contribution-loop-templates + deep-link tests, the `contribution.*` fourth-type fence (`packages/domain/tests/contribution/no-ingest-path.test.ts`), `packages/channels/tests/freeze.test.ts` (frozen-surface guard, unchanged).
  - [x] Revert-sanity teeth (`[[feedback_gate_scope_semantic_coverage]]`): a test that FAILS if the pending-match read admits a confirmed/mismatched member (proves the resolution filter is real, not vacuous), and one asserting exactly-once-per-tier across two sweep ticks against a live DB.
  - [x] Merge gate `pnpm ci:local --concurrency=4` (`[[project_ci_actions_suspension_local_mirror]]`, `[[project_ci_local_concurrency_oversubscription]]`); integration on `twt-test-pg` :5433 (`[[project_live_db_test_gotchas]]` — own-committing writers accumulate rows: assert membership, not counts).

## Dev Notes

### Read Story 8.8 first — this is a fourth trigger in an existing family, not a greenfield

`apps/jobs/src/scheduler/contribution-notify-triggers.ts` (Story 8.8) already implements the exact machinery 9.10 needs, for four sibling triggers: **cycle-open**, **deadline reminders** (daily IST sweep, days 5/10/13/14), **contribution-confirmed** (Epic-9 seam), and **contribution-mismatch** (Story 9.7 seam). 9.10 adds a **fifth**: the pending-match retry sweep. **Reuse, do not reinvent:**

- **The fan-out is frozen and CONSUMED.** `fanOutAlertToMembers` / `fanOutAlert` (`contribution-notify.ts`) is the stack's one live `dispatch()` composition. It already owns bridge-vs-cost-opt ordering, the channel ladder, multi-device push, the independent Telegram mirror, and the honest PII-free outcome record. 9.10 writes **none** of that — it only builds the `Alert` and calls the fan-out. `packages/channels/src/**` stays untouched (`[[project_channels_no_live_dispatch_yet]]`).
- **The parent → per-pool child → member-chunk batching** and the singleton-keyed `enqueuePoolBatch` are reused verbatim. Note precisely which siblings share which queue: `cycle_open` and `deadline_reminder` ride the **same** `CONTRIBUTION_NOTIFY_POOL_BATCH` child queue via the `ContributionNotifyKind` union (today `'cycle_open' | 'deadline_reminder'`) — 9.10 extends this union with `'pending_match'` and `'pending_match_escalated'` (Task 3) to ride that same pool-batch path. `contribution_confirmed` and `contribution_mismatch` are separate, single-member queues with their own workers, entirely outside the `ContributionNotifyKind`/pool-batch mechanism — 9.10 does not touch them.
- **The daily deadline sweep (`runDeadlineReminderSweep`) is your template** for `runPendingMatchRetrySweep` — same cross-tenant BYPASSRLS scan, same `ORDER BY cycle_id`, same bounded limit + full-batch alarm, same per-pool try/catch so one pool's failure never costs its siblings.

### The `pending_match` derivation (AC-1) — reuse the resolution helpers, don't re-implement them

A member is **pending_match** iff they hold ≥1 `contribution.utr-attested` (yellow) for the pool with **no** resolving verdict. The resolution predicates already exist and MUST be reused (a second definition is a drift bug waiting to happen — see `[[project_epic6_drizzle_correlated_subquery_bug]]` for how a subtly-wrong reconciliation query passes DB-free tests):
- **Confirmed (green):** `hasLiveConfirmation(confirmedEventIds)` over `contribution.confirmed` events for (member, pool), backing out any `reconciliation.confirmation-reversed` (the monotonic-link chain in `contribution/read.ts`). A confirmation that was later **reversed** returns the member to pending — correct. **A confirmation reversal does NOT reset reminder history for an already-reminded attestation** — the soft/escalated `getResult` markers (kept alive for `PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS`, see *the once-ever nuance*) are keyed on `(alert_id, member_id, tier)` (the original attestation, unchanged by a reversal), so a tier that already fired never re-fires after a reversal; a tier that had NOT yet fired (e.g. the payment was confirmed before 4h, then reversed after) fires once against the original `attested_at` age. Reminder history would only start fresh if a genuinely new `contribution.utr-attested` event began a new pending-match lifecycle — which, per the idempotency-per-(member,alert) note above, does not occur for the same (member, alert) in practice.
- **Mismatch (red):** a `contribution.reconciliation-mismatch` (`CONTRIBUTION_MISMATCH_EVENT_TYPE`, `contribution/history.ts`) for (member, pool). A red member has a recovery path via Story 9.7's `<SelfVerifySurface>` and is **not** a pending-match nudge target (different story, different copy).
- The attestation clock is the `contribution.utr-attested` `occurred_at` (`eventsLog.occurredAt`), exactly the `attestedAt` `listMemberContributionHistory` already selects. Each unresolved attestation progresses through the two-tier cadence **independently** on its own long-lived soft/escalated markers; when a member has multiple unresolved attestations, evaluate thresholds against the **oldest** (the age that first crossed a threshold) — a later attestation never restarts the earlier one's cadence.
- **Idempotency is per (member, alert), so there is normally exactly one attestation per alert.** `contribution.utr-attested` is idempotent per (member, alert): `tr = deriveContributionReference({ memberId, alertId })` is deterministic and a UNIQUE `tr` constraint (`contribution_utr_attested_tr_uq`, migration 0079) collapses a re-attest into the SAME event (same `attested_at`). A member is also assigned to exactly one pool per cycle, and the alert is per-cycle. So the AC-3 idempotency key `(alert_id, member_id, tier)` is 1:1 with `(attestation, tier)`, and the "oldest unresolved" rule above is a defensive tiebreak, not a routine branch.

`listActedMemberIdsForPool` (`contribution/read.ts`) already returns `{ attested, confirmed }` sets per pool for 8.8's nudge-suppression — but it lacks the mismatch verdict and the per-member `attested_at`, so a **new** read is warranted (not an extension that would over-widen a load-bearing confirmed-only primitive). Model its batched 3-query shape and its structural (no `status` param) guard.

### The once-ever nuance (AC-3) — the tier reminders are once-per-attestation, NOT once-per-window, and durability comes from TTL length, not from `recordResult` alone

Story 8.8's `day_<n>` reminders exploit that a cron fires once/day and each cycle-day never recurs, so a **5-minute** claim TTL (`DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS`) suffices — the claim only needs to survive one fan-out, and nothing re-checks it a day later. **9.10 is different:** the sweep runs **hourly** and a `pending_match` can persist for the whole ~20-day reconciliation window, so the record has to survive re-checks for weeks, not minutes.

**This is NOT solved by `recordResult` alone.** `recordResult()` marks a row `completed` but does not extend `expires_at` past the value set at `claim()` time, and `getResult()` only returns a completed row while `expires_at >= now()` — a completed row reads back as "not sent" the moment its original TTL lapses. The hourly idempotency vacuum (`purgeExpiredKeys`, wired in `apps/jobs/src/boot.ts` on `VACUUM_CRON`) then deletes it outright on the same schedule, `status` notwithstanding. A 300s TTL gives roughly 300 seconds of once-ever protection, not "ever."

So:

- Claim (and record) the two new kinds with a **long TTL** — `PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS` (Task 2, weeks-scale, sized to outlive the reconciliation window) — NOT `DEFAULT_MEMBER_IDEMPOTENCY_TTL_SECONDS`. The soft and escalated tiers each fire **once ever** per `(alert_id, member_id)`, enforced by `getResult(key)` returning non-null (already sent ⇒ skip) for as long as that long TTL keeps the row alive and un-vacuumed.
- The `claim(ttl)` step still serves double duty: at-most-once-**concurrent** guard during a single fan-out AND the once-ever durability window — for these two kinds they're the same TTL, unlike the day-N reminders where they're decoupled (short claim TTL, no long-term re-check needed).
- Keyed-store API: `claim`, `recordResult`, `getResult`, `release` (`packages/domain/src/idempotency/keyed-store.ts`). `getResult` returns the recorded value or null/undefined, gated on `expires_at`.

### Why `deadline_reminder` category with new copy (AC-4/5/6)

The AC mandates the `deadline_reminder` **dispatch category** — and it is the right one for the *mechanics*: non-time-critical, push→WA→SMS ladder, the 30-min cost-optimization window (AC-5's engagement suppression), and **not** Telegram-mirror-eligible (AC-6). Reusing it also keeps the alert-category set stable (no fourth-type fence exposure). But the **copy is semantically different** from the day-N deadline nudges — a pending-match member has already paid/attested. Build new template keys; do **not** reuse the "please contribute before day X" strings. Firmer ≠ alarming: the escalated tier is *"it's been a day and we still can't see your payment — please re-check/retry or tap for help,"* never blame.

### Reconciliation window: scan `live` AND `closed` (not just `live`)

A payment attested on Day-14 can still be `pending_match` after the Day-15 hard close, during the reconciliation **tail** (Story 8.9 + the matcher runs on live+closed cycles). The 8.8 deadline sweep scans `live` only (its nudges are pre-close). 9.10 must include `closed` — matching the Story 9.8 review-read bound (`live`/`closed`, exclude `settled` done + pre-live). A member whose case is still open after close is exactly who a retry reminder should reach. This `current_state IN ('live','closed')` bound is intentionally duplicated as a literal in both 9.8's read and 9.10's sweep, not extracted to a shared const — each read owns its own tenant/state predicate by convention, so this is intentional parity, not drift a reviewer should flag.

### The matcher cadence is why 4h is the right first threshold

The Story 9.4 matcher runs every 4h IST (`DEFAULT_MATCHER_CRON = '0 */4 * * *'`) and reconciliation p95 < 4h. So a `pending_match` older than 4h means the matcher has run ≥once **without** finding a matching deposit — the payment is genuinely not-yet-seen (never landed, wrong pool, mistyped UTR), which is precisely when a member nudge earns its interruption. This is also why the soft reminder is *soft*: at 4h the likeliest cause is normal reconciliation lag, not a failed payment.

### Do NOT

- Do **not** add a `contribution.*` event type or any new alert category (8.10 fence; AC-8).
- Do **not** introduce a "UPI intent fired" signal / event / projection — that is the deferred nominee-VPA-story's world, and the epic prose that implies it is a ratified drafting divergence (Decision 1).
- Do **not** modify `packages/channels/src/**` or Story 9.8's review queue / ordering / schema.
- Do **not** let the nudge read or write `progress.confirmedCount` / `listConfirmedContributorsForPool` / any confirmed surface (AC-7).
- Do **not** make the reminder `time_critical` (AC-6) or rely on the transient claim TTL for once-ever (AC-3).

### Project Structure Notes

- **Domain read (new):** `packages/domain/src/contribution/read.ts` (or `reconciliation/read.ts`) — `listPendingMatchMembersForPool`. Barrel-export from the module index it lands in.
- **Trigger + sweep (edit):** `apps/jobs/src/scheduler/contribution-notify-triggers.ts` — extend `ContributionNotifyKind`, add `buildPendingMatchRetryAlert`, `runPendingMatchRetrySweep`, thresholds, and register the queue/worker/cron in `registerContributionNotifyWorkers`.
- **Fan-out (unchanged, consumed):** `apps/jobs/src/scheduler/contribution-notify.ts` — no edits expected.
- **Queue name (edit):** `packages/queue/src/index.ts` — `CONTRIBUTION_PENDING_MATCH_RETRY_SWEEP`.
- **Copy (edit):** `packages/contracts/src/alerts/contribution-loop-templates.ts` (template keys) + `packages/i18n/locales/{hi,en}/contribution.json` (strings).
- **Deep link (edit):** `packages/contracts/src/deep-links/deep-link.ts` — extend the `deadline_reminder` case to route to `contributions/:pool_id` when the payload carries a `pool_id` (AC-4), preserving the existing `renewals` fallback for the day-N reminders.
- **Boot (verify only):** `apps/jobs/src/boot.ts` already wires `registerContributionNotifyWorkers`.
- No mobile/apps-api/apps-admin change (this is a backend scheduler story; the member surface a tapped push lands on already exists via the `deadline_reminder` deep-link).

### References

- [Source: prds/prd-TWT-2026-05-22/prd.md#FR-35] — *authoritative* precondition: `pending_match > 4h → soft; > 24h → escalated`.
- [Source: epics.md#Story-9.10 (3312-3323)] — epic prose ("intent fired, no attestation") = ratified drafting divergence from FR-35 (Decision 1).
- [Source: epics.md#Story-9.10 (2939-2941)] — yellow-never-pollutes-the-meter invariant (AC-7).
- [Source: apps/jobs/src/scheduler/contribution-notify-triggers.ts] — the Story 8.8 trigger family (sweep/child/idempotency template); `runDeadlineReminderSweep`, `enqueuePoolBatch`, `ContributionNotifyKind`, `resolveReminderSuppressions`.
- [Source: apps/jobs/src/scheduler/contribution-notify.ts] — the frozen live `dispatch()` fan-out (`fanOutAlertToMembers`), cost-opt + bridge composition.
- [Source: packages/domain/src/contribution/read.ts] — `listActedMemberIdsForPool`, `hasLiveConfirmation`, `CONFIRMED_EVENT_TYPE`, `REVERSED_CONFIRMED_EVENT_ID_KEY`, payload key consts.
- [Source: packages/domain/src/contribution/history.ts] — `listMemberContributionHistory` (attested-row select + batched verdict lookups), `CONTRIBUTION_MISMATCH_EVENT_TYPE`, `deriveContributionStatus`.
- [Source: packages/domain/src/contribution/write.ts] — `CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE`, migration 0079 idempotency.
- [Source: packages/domain/src/idempotency/keyed-store.ts] — `claim` / `recordResult` / `getResult` / `release` (the once-ever guard rests on `getResult`).
- [Source: packages/channels/src/cost-optimization.ts] — `evaluateCostOptimization`, `STALENESS_WINDOW_BY_CATEGORY.deadline_reminder = 30min` (AC-5).
- [Source: packages/contracts/src/alerts/contribution-loop-templates.ts] — `CONTRIBUTION_LOOP_I18N_NAMESPACE`, template-key registry, tone selector.
- [Source: packages/contracts/src/deep-links/deep-link.ts:90-92] — `deepLinkTargetForAlert`'s `deadline_reminder` case; extended in this story to route to `contributions/:pool_id` when a `pool_id` is present, falling through to `renewals` otherwise (AC-4).
- [Source: packages/domain/src/reconciliation/reconciliation-review-read.ts] — Story 9.8 open-case bound (`live`/`closed`, exclude settled/pre-live) — the reconciling-window bound 9.10 mirrors; the staff surface 9.10 deliberately does NOT touch (Decision 3).
- [Source: apps/jobs/src/matcher/matcher-worker.ts:42] — `DEFAULT_MATCHER_CRON` every-4h cadence (the 4h-threshold rationale).
- Memory: `[[project_channels_no_live_dispatch_yet]]`, `[[project_contribution_event_name_contract]]`, `[[project_nominee_vpa_deferred_seam]]`, `[[project_yogdaan_status_derivation_convention]]`, `[[project_calendar_aware_tail_not_window_extension]]`, `[[feedback_architecture_vs_prd_boundary]]`, `[[feedback_gate_scope_semantic_coverage]]`, `[[project_live_db_test_gotchas]]`, `[[project_ci_actions_suspension_local_mirror]]`.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via `bmad-dev-story`.

### Debug Log References

None — no failing test required iterative debugging beyond two self-caught fixes: (1) a test-mock argument-position bug in `runPendingMatchRetrySweep`'s per-pool-failure test (destructured `db` instead of the options bag), (2) two unused imports in `contribution-notify-triggers.test.ts` (`PENDING_MATCH_SOFT_REMINDER_AGE_MS` / `PENDING_MATCH_ESCALATION_AGE_MS`) caught by `pnpm ci:local`'s `lint` job and removed.

### Completion Notes List

- **Task 1** — `listPendingMatchMembersForPool` added to `packages/domain/src/contribution/history.ts` (not `read.ts`): it needs `CONTRIBUTION_MISMATCH_EVENT_TYPE`, which lives in `history.ts` and imports FROM `read.ts` (the reverse import would cycle). Two batched queries (attested rows scoped to the alert stream + pool payload key; confirmed/mismatch/reversal verdicts scoped by pool), structural no-`status`-param guard mirroring `ListConfirmedContributorsParams`. 8 live-DB tests (attested-only, +confirmed, +mismatch, +confirmed-then-reversed, +re-confirmed-after-reversal, pool-scope leak, cross-tenant leak, empty) all green against `twt-test-pg` :5433.
- **Task 2** — Extended the `Alert` contract's `deadline_reminder` variant with an OPTIONAL `pool_id` (alert.ts) rather than adding a category. Added a SIBLING payload builder (`buildPendingMatchRetryPayloadData`/`PendingMatchRetryPayloadData`) instead of reusing `buildDeadlineReminderPayloadData` — the shared `deadline_at`/`deadline_display` fields stay structurally required (the frozen `packages/channels/src/render.ts` renderer is untouched and always prints `"{subject} — due {deadline_display}"`), so `deadline_display` is deliberately written as a short call-to-action continuation rather than a date, and `deadline_at` carries the send instant as a never-rendered machine placeholder. Extended `deepLinkTargetForAlert`'s `deadline_reminder` case to route to `contributions/:pool_id` when `pool_id` is present, with an explicit regression test that the day-N reminders (no `pool_id`) are unchanged. New copy added to both `en` and `hi` locale files.
- **Task 3** — `ContributionNotifyKind` gains `'pending_match'` / `'pending_match_escalated'`, riding the existing `CONTRIBUTION_NOTIFY_POOL_BATCH` child queue (no new queue for the child; one new queue for the sweep cron, `CONTRIBUTION_PENDING_MATCH_RETRY_SWEEP`, hourly at `:50` IST). `runContributionNotifyChild`'s idempotency TTL is now selected BY KIND — the two new kinds use `PENDING_MATCH_IDEMPOTENCY_TTL_SECONDS` (30 days), never the day-N reminders' 300s default. `runPendingMatchRetrySweep` scans `live`+`closed` alerts (the reconciliation-tail bound, unlike the deadline sweep's `live`-only), buckets each pool's pending-match members by tier off the OLDEST unresolved attestation, and enqueues per-(pool,tier) batches.
- **Task 4** — Boot required no code change (`registerContributionNotifyWorkers` already wired). Added a dedicated live-DB test (`apps/jobs/tests/pending-match-idempotency-live.test.ts`) proving the once-ever TTL mechanism end-to-end against real Postgres: a completed row survives past the point the 300s default would have lapsed, a short-TTL row does NOT (and is vacuumed, and a THIRD tick then genuinely re-sends) — the exact revert-sanity teeth the Dev Notes ask for. Full `pnpm ci:local --concurrency=4` run: **lint / typecheck / build / all 25 static gates / test (unit) all green** for every file this story touches.
- **Known pre-existing gap (NOT a regression of this story):** 4 live-DB tests fail on `twt-test-pg` :5433 in both the `test (unit)` and `integration-tests` `ci:local` jobs — `cross-pariwar-leak.spec.ts` (×2), `active-contribution-read.spec.ts` (×1), `rls/policy-regression.spec.ts` (×1) — all exact-row-COUNT assertions defeated by rows accumulated across many prior sessions' committed test data in the shared, persistent Docker container (`[[project_live_db_test_gotchas]]`: "own-committing writers accumulate rows, assert membership not counts"). Verified via `git stash` + isolated re-run that these SAME 4 tests fail identically on the pre-story baseline (`939d674`) — confirmed pre-existing, not caused by this story's changes. No fix attempted here (resetting the shared container's accumulated state is an environment-hygiene concern outside this story's scope, and the memory explicitly warns against a `DROP SCHEMA` reset). Every test this story ADDED is green, and every EXISTING test this story's code TOUCHES (`packages/channels/tests/freeze.test.ts`, `packages/domain/tests/contribution/no-ingest-path.test.ts`, `packages/contracts` full suite, `apps/jobs` full suite, `packages/domain/tests/contribution/*`) is green.

### File List

**New files:**
- `packages/domain/tests/integration/contribution/pending-match-members.spec.ts`
- `apps/jobs/tests/pending-match-idempotency-live.test.ts`

**Modified files:**
- `packages/domain/src/contribution/history.ts` — `listPendingMatchMembersForPool` + `PendingMatchMember` + `ListPendingMatchMembersParams`
- `packages/domain/tests/contribution/history.test.ts` — structural-guard unit test
- `packages/contracts/src/alerts/alert.ts` — optional `pool_id` on the `deadline_reminder` variant
- `packages/contracts/src/alerts/contribution-loop-templates.ts` — `PENDING_MATCH_RETRY_TEMPLATE_KEYS`, `PendingMatchRetryPayloadData`, `buildPendingMatchRetryPayloadData`
- `packages/contracts/src/deep-links/deep-link.ts` — `deadline_reminder` case routes to `contributions/:pool_id` when present
- `packages/contracts/tests/contribution-loop-templates.test.ts` — new payload/copy tests
- `packages/contracts/tests/deep-links.test.ts` — pool_id routing + regression tests
- `packages/i18n/locales/en/contribution.json`, `packages/i18n/locales/hi/contribution.json` — soft/escalated retry copy
- `packages/queue/src/index.ts` — `CONTRIBUTION_PENDING_MATCH_RETRY_SWEEP` queue name
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts` — thresholds/TTL consts, `buildPendingMatchRetryAlert`, `ContributionNotifyKind` extension, per-kind TTL selection, `runPendingMatchRetrySweep`, registration wiring
- `apps/jobs/tests/contribution-notify-triggers.test.ts` — sweep + child-kind + copy tests
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status flips

## Review Findings

_Adversarial code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor), 2026-07-28. Acceptance Auditor: **all 8 ACs PASS, no invariant-checklist gaps.** Both hunters' top "high" findings dissolved under codebase context (inherited sweep patterns / gate-mandated conventions)._

- [x] [Review][Decision → Accepted as-is] Escalated tier can fire without the soft tier ever firing — when the sweep first observes an attestation already ≥24h old (scheduler downtime spanning the 4h–24h window, first deploy against pre-existing pending attestations, or a >24h `confirmation-reversed` returning a member to pending on the original `attested_at`), the member is bucketed straight to `escalated` and never gets the `soft` nudge. Outcome is benign (one firmer nudge instead of soft-then-escalated) and arguably desirable; AC-2's "(they will already have received the soft tier once)" is a descriptive parenthetical, not structurally enforced. **Resolution (BigDev, 2026-07-28): accepted as-is** — escalated-only on first-sighting is fine (an already-stale payment gets the firmer message immediately). Not an AC violation. [apps/jobs/src/scheduler/contribution-notify-triggers.ts:~397-401]

- [x] [Review][Defer] Pending-match sweep 500-alert cap does not advance across ticks [apps/jobs/src/scheduler/contribution-notify-triggers.ts:~356-446] — deferred, pre-existing. Inherited verbatim from `runDeadlineReminderSweep` (identical `ORDER BY cycle_id ASC LIMIT $1`, the same "the next tick will pick them up" alarm text, the same `rows.length >= limit`). Story-specific amplifier: this sweep scans `current_state IN ('live','closed')` and `closed` alerts accumulate across the ~20-day reconciliation tail (vs the deadline sweep's `live`-only), so the 500 bound is materially more reachable — if reconciling alerts exceed 500, the highest-`cycle_id` alerts starve until the count drops (the alarm text's "next tick" reassurance is false for the overflow set). Fix is codebase-wide (keyset cursor across all three sweeps), not 9.10-local.

**Dismissed as noise (5):** (1) domain read's unordered `.limit(500)` — gate-mandated literal, consistent with every `history.ts` sibling (:229/:302/:348/:477/:511), roster-bounded ~50 ≪ 500; (2) `rows.length >= limit` false alarm at exactly 500 — inherited from the sibling sweeps; (3) duplicate per-tick structured logs — matches the deadline-sweep precedent; (4) `deadline_at` carrying the send-instant — documented/accepted in the contract comment, inert at render (`render.ts:88` never renders it); (5) Blind Hunter's "non-cycle alerts crash the scan" — false positive: `alerts.cycle_id` is `NOT NULL` and 1:1 with a cycle, no such rows exist.

## Change Log

- 2026-07-28: Implemented Story 9.10 end-to-end — the pending-match members read (Task 1), tier thresholds/copy/deep-link (Task 2), the hourly cadence sweep + per-kind idempotency TTL (Task 3), and full regression + revert-sanity coverage (Task 4). Status: ready-for-dev → in-progress → review.
