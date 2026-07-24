---
baseline_commit: ba175f1f97f93813e9984ad00a1ae426c766bbad
---

# Story 8.8: Contribution Loop Notification Triggers — Cycle-Open + Deadline-Reminder + Contribution-Confirmed `[CONSUMER]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## ⚠️ Read this first — this story is the stack's FIRST LIVE `dispatch()` CALL SITE

Epic 5 shipped **nine stories of channel primitives with zero live `dispatch` call site**. Every later story
deliberately refused to become the first caller:

| Story | What it said |
|---|---|
| 5.2 / 5.3 / 5.4 / 5.6 / 5.7 / 5.8 | *"a composition seam exported for a live fan-out that does NOT exist yet"* — `apps/api/src/modules/channel-config/composition.ts:1-6`, `:127-134`, `:355-360` |
| 6.12 | *"⚠ This MUST NOT resolve targets or send bytes … 6.12 must NOT become its first live caller (R4)"* — `apps/jobs/src/shepherd-notification-hook.ts:8-11` |
| 7.5 | *"channels `dispatch()` still has NO live caller"* — `apps/api/src/modules/pool-fixed-amount/notification-hook.ts:6` |
| AI-5-2 | Composed the primitives in a **test-only prototype harness**; *"Epic 6 remains the first live caller"* — `packages/channels/tests/integration/live-dispatch-cascade.spec.ts` |
| 8.1 | *"This module does NOT send SMS (Story 5.8/8.8)"* — `apps/jobs/src/scheduler/cycle-open-alert.ts:23` |

Epic 6 **never** wired it. **Story 8.8 is where the deferral ends.** Treat every "frozen surface" note in
`packages/channels` as still binding: you **consume** those primitives, you do **not** modify them. The
memory note `[[project_channels_no_live_dispatch_yet]]` becomes stale when this story lands and must be
updated in the Dev Agent Record's forward-commitment list.

---

## Story

As Solo Builder authoring the trigger logic for the contribution loop notifications,
I want trigger logic that publishes alerts via the Story 5.1 channel dispatcher for cycle-open, the 15-day
deadline-reminder cadence, and contribution-confirmed events — with tone-graded copy templates that Epic 5
renders as a pure function of an immutable payload,
so that the FR-23 nudge seam is honored end-to-end: **Epic 8 owns triggers + copy, Epic 5 owns delivery**,
and Sushil's push actually lands.

## Acceptance Criteria

_Elaborated from `epics.md:2997-3009` (Story 8.8). The epics.md text is 3 dense bullets; expanded here with
the recipient/idempotency/scale model (AC1), the day-band reconciliation against Story 8.2's shipped tone
gradient (AC2), the Epic-9 seam posture (AC3), the copy-template + gate obligations (AC4), the payload
immutability + render-purity boundary (AC5), and the live-fan-out composition order (AC6). Not verbatim._

**AC1 — Cycle-open trigger**
**Given** FR-23 nudge seam (architectural-freeze row 15) + Story 5.1 dispatcher + Story 8.1 alert state machine
**When** the cycle-open notification trigger is implemented
**Then** observing Story 8.1's **`alert.published` lifecycle event** dispatches, per member assigned to a pool
in that cycle, an `Alert` with `alert_category: 'alert_published'`, `time_critical` **copied verbatim from the
`alert.published` payload** (never re-derived — Story 8.1 AC4 resolved the AR-18 degraded-mode signal at the
cycle-freeze instant), and `payload_data` carrying the member's **pool letter code + curated pool name +
deceased-family first-name + last-initial + fixed amount** rendered into the `{title, body}` announcement shape
**And** the fan-out is **idempotent per `(alert_id, member_id)`** — a redelivered job, a retried batch, or the
recovery sweep never produces a second send
**And** the fan-out is **batched**: a parent job pages the cycle's pools and enqueues one child job per pool;
each child chunks its roster. A cycle-open at TWT-Bihar scale (N≈50 pools × M≈4L members, the Story 7.9 gate
shape) must never be attempted as a single job or a single unbounded query

**AC2 — 15-day deadline-reminder cadence, tone-graded**
**And** a daily scheduled sweep fires deadline reminders on **cycle-day 5 / 10 / 13 / 14** for every `live`
alert, with `alert_category: 'deadline_reminder'` and per-send-day copy whose **tone band is derived from the
SAME selector Story 8.2's `<ActiveContributionCard>` uses** — so the push a member receives on day D can never
be more urgent than the card they open on day D (the coherence invariant; see D2)
**And** cycle-day is computed from the cycle-freeze `committed_at` + `CYCLE_WINDOW_DAYS`, the **same D5 seam**
`apps/api/src/modules/member-pool/handlers.ts:80-93` uses — Story 8.9 (calendar-aware close-of-cycle) replaces
both together. **No holiday/close-of-cycle policy is encoded here.**
**And** the sweep is idempotent per `(alert_id, member_id, cycle_day)` — a second tick on the same IST day, a
retry, or a restart never double-sends
**And** a member with **no open contribution action** for the pool is **suppressed** from the reminder, with a
recorded machine-readable suppression reason (see D3). Suppression is a *courtesy* decision about whether to
nudge — it **never** promotes, counts, or displays a yellow attestation as confirmed

**AC3 — Contribution-confirmed trigger (Epic 9 seam)**
**And** a `contribution_confirmed` trigger exists as an **exported enqueue seam Epic 9 calls** when it emits
`contribution.confirmed` — `payload_data` carries `{ pool_id, amount_paise, period_label }` per the shipped
contract. Because **Epic 9 owns that producer exclusively** and it is unbuilt, this story ships the trigger +
its queue + its worker + its tests against a synthesized event, and **deliberately ships NO recovery sweep and
NO cron** for it (a producer-less scheduled worker is the anti-pattern Story 5.6 named). The seam is proven by
a test that drives it with a hand-built `contribution.confirmed` event; when Epic 9 lands its producer, the
notification fires with **zero changes in this story's code**

**AC4 — Copy templates + the tone-review + microcopy gates**
**And** copy templates live in **`packages/contracts/src/alerts/contribution-loop-templates.ts`** (the epic's
`packages/contracts/alerts/contribution-loop-templates` home): the pure day→band map, the template-key
registry, and the pure payload builders. The **localized strings** live in the existing `contribution` i18n
namespace (`packages/i18n/locales/{hi,en}/contribution.json`) under a `notify.*` key prefix — a namespace that
is **already in `microcopy.yaml` `scope.copy_globs`** with proven teeth (`microcopy.yaml:141-149`), so the
scarcity/panic tone rules and the UX-DR73 numeral discipline bite this copy **without a gate-scope extension**
**And** the templates carry Hindi parity (the `i18n:check-parity` gate) and are Hindi-primary at send time
(`DEFAULT_LOCALE = 'hi'`, `packages/i18n/src/locale.ts:36`)
**And** the Story 2.2 **tone-review process** (`docs/tone-guide.md` + `docs/tone-review-checklist.md`) is
recorded as applied before these templates ship — a **non-author** human sign-off, recorded in the Dev Agent
Record. (The runtime `evaluateToneReviewGate` primitive gates *admin-authored persisted* copy, not
code-authored templates — do not wire a runtime gate here; record the process discharge honestly, or record it
un-attested per `[[feedback_record_unattested_no_backfill]]`.)

**AC5 — Payload immutability + render purity (the Story 5.1 boundary)**
**And** every dispatch respects the Story 5.1 alert-payload immutability invariant: the trigger builds a
complete `Alert`, `dispatch` deep-freezes it, and **all member-facing wording that varies by locale, clock, or
tone band is resolved by THIS story (the producer) into the payload** — the Epic 5 renderers stay pure
functions of the frozen payload with no clock read, no locale lookup, no template selection
**And** no file under `packages/channels/src/**` is modified: `dispatch`, `cascade`, `render`, `provider`,
`CANONICAL_CHANNEL_LADDER`, `DeliveryResolver`, `ChannelProvider`, and the audit port stay byte-identical

**AC6 — The live fan-out composes the shipped policy wrappers in the committed order**
**Given** Story 5.7 (`evaluateCostOptimization`) and Story 5.8 (`evaluateDegradedModeBridge`) are pure
decision primitives that **wrap** `dispatch` and explicitly leave their composition to "the site that first
drives a real dispatch fan-out" (`cost-optimization.ts:9-11`, `degraded-mode.ts:26-33`)
**When** this story wires the live fan-out
**Then** the composition order is: **degraded-mode bridge FIRST** → when `bridged: true` for a cycle-open
alert, force SMS and **bypass cost-optimization suppression** for that alert (`epics.md` AR-20 carve-out,
`degraded-mode.ts:26-30`); otherwise **cost-optimization** decides suppression of the two paid channels
(push is never suppressed)
**And** the per-member send strategy is **`runChannelCascade` — stop at the first `sent`** (ratified
Decision 3), so a member whose push lands is never additionally billed a WhatsApp or SMS send. The
`CascadeSender` seam drives **one `dispatch` call per rung** (a `DeliveryResolver` narrowed to that single
channel), so category eligibility, fcm-vs-apns provider selection, lifecycle suppression, the honest
outcome mapping, and both audit families all stay `dispatch`'s job — **the composition never re-implements
them** (see D9)
**And** the **Telegram side-channel is fired independently** of the ladder — fire-and-forget, only when
`isCategoryEligible('telegram', category)` (true for `alert_published`, false for `deadline_reminder` and
`contribution_confirmed`, `dispatch.ts:44-52`). A Telegram failure never affects the ladder or the outcome
**And** the fan-out writes the **two audit families** (`alert.dispatch` + per-channel `alert.channel_send`)
through the real `createAuditPort` + `createRenderedMessageHash` — the PII-safe keyed HMAC, never a raw
sha256 of member-facing content (AI-4-3(c))
**And** the per-channel `SendResult` mapping stays **honest**: never label a `rejected` / `not_implemented`
send as `sent`
**And** **no worker ever sleeps a backoff in-process**: the cascade runs with `backoffMs: []` and retry
durability is pg-boss's (D9). At 4L scale a worker held for the default 30s/5m/30m schedule is not viable

## Tasks / Subtasks

### Task 0 — Recon (do this first; do not skip)

- [x] Read, in full, before writing any code: `packages/channels/src/dispatch.ts`, `src/cascade.ts`,
      `src/render.ts`, `src/provider.ts`, `src/audit.ts`, `src/cost-optimization.ts`, `src/degraded-mode.ts`;
      `packages/contracts/src/alerts/alert.ts`; `packages/contracts/src/deep-links/deep-link.ts`;
      `apps/jobs/src/scheduler/cycle-open-alert.ts`; `apps/jobs/src/cycle-spawn.ts` (the parent→N-child
      pattern you will mirror); `apps/api/src/modules/channel-config/composition.ts`;
      `apps/api/src/modules/device-token/device-token.handlers.ts:148-190`;
      `apps/mobile/components/active-contribution/toneGradient.ts`;
      `apps/api/src/modules/member-pool/handlers.ts:74-95`;
      `packages/channels/tests/integration/live-dispatch-cascade.spec.ts` (AI-5-2 — the composition
      prototype this story productionizes).
- [x] Verify every file:line cite in this story against the live tree at `ba175f1` and correct any drift in
      the Dev Agent Record.

### Task 1 — Relocate the delivery-resolver composition so BOTH apps can reach it (AC6; D4)

> **Why this task exists:** all four delivery resolvers + the Tier-1 decrypt helpers live in `apps/api`
> (`device-token.handlers.ts:148`, `channel-config/composition.ts:127/355`), and **`apps/jobs` cannot import
> `apps/api`** — `apps/api` already depends on `@twt/jobs` (`apps/api/package.json`), so the reverse edge is a
> cycle. The triggers are cron/worker-driven, so they live in `apps/jobs` (architecture `:4322` scheduler
> home). Duplicating PII-decrypt composition by value is the wrong answer here (contrast `apps/jobs/src/deps.ts`,
> where a by-value parallel was genuinely forced) — this code is DB reads + `@twt/domain` encryption, which is
> exactly what `@twt/domain` is for.

- [x] Move the field-class/namespace constants the resolvers need (`MEMBER_DEVICE_TOKEN_FIELD_CLASS`,
      `MEMBER_MOBILE_FIELD_CLASS`, `MEMBER_IDENTITY_NAMESPACE` — today in `apps/api/src/context.ts`) into
      `@twt/domain`, and **re-export them from `apps/api/src/context.ts`** so every existing importer keeps
      working unchanged.
- [x] Move `decryptDeviceToken` / `deviceTokenBlindIndex` (`apps/api/src/modules/device-token/device-token-crypto.ts`)
      and `decryptMobile` / `normalizeMobile` / `maskMobile` / `mobileBlindIndex`
      (`apps/api/src/modules/auth/shared/mobile-index.ts`) into `@twt/domain`. `EncryptionDeps`
      (`apps/api/src/context.ts:257-261`) is **structurally identical** to `JobsEncryptionDeps`
      (`apps/jobs/src/deps.ts:26-30`) — both are `{ kms, kekRef, hmacKeyRef }` over `encryption.*` domain
      types — so the domain home needs no new abstraction. Re-export from the old apps/api paths.
- [x] Move the four delivery-resolver reads into `packages/domain/src/notifications/delivery.ts`:
      `resolvePushTargets` (drop the `AppDeps`/`ScopeTx` params → `(db, encryption, pariwarId, principalType,
      principalId)`), `resolveWaTarget`, `resolveSmsTarget`, `resolveTelegramTarget`. Their return type is the
      **structural shape** of `@twt/channels`' `SendTarget` (`provider.ts:56-72`) — a plain
      `{ channel, address, platform?, principalType?, principalId? }` interface — so `@twt/domain` does **not**
      import `@twt/channels` (that edge would be a cycle: channels→domain already exists,
      `cost-optimization.ts:43`). Declare the shape locally in domain and let structural typing do the rest.
- [x] Re-export every moved symbol from its original `apps/api` module so **no apps/api call site changes**.
      Confirm with `pnpm --filter @twt/api typecheck && pnpm --filter @twt/api lint`.
- [x] `pnpm --filter @twt/api test` + `pnpm --filter @twt/domain test` green — this task must be a pure
      relocation with **zero behavior change**. Verify by diffing the moved function bodies.

### Task 2 — Copy templates in `@twt/contracts` (AC4, AC5)

- [x] `packages/contracts/src/alerts/contribution-loop-templates.ts` — pure, `@twt/domain`-free
      (`[[project_contracts_domain_bundle_boundary]]`), `.strict()` on every object:
  - [x] `CYCLE_WINDOW_DAYS` + `ToneRangeKey` + `selectToneGradientKey(cycleDay)` + `cycleDayFromDaysRemaining`
        — **moved here from `apps/mobile/components/active-contribution/toneGradient.ts`**, verbatim
        (including the "`closing`, deliberately NOT `urgent`" comment: the microcopy panic rule
        `\bURGENT\b` scans this namespace). Mobile's `toneGradient.ts` becomes a **thin re-export** so
        `ActiveContributionCard.tsx:80-81` and the existing mobile unit tests are untouched. One authority,
        no sync guard needed (contracts is already a mobile dependency).
  - [x] `DEADLINE_REMINDER_SEND_DAYS = [5, 10, 13, 14] as const` + `CONTRIBUTION_LOOP_TEMPLATE_KEYS` —
        the per-send-day i18n key registry, `satisfies Record<…>` so a missing day is a compile error.
  - [x] Pure payload builders — `buildCycleOpenPayloadData(...)`, `buildDeadlineReminderPayloadData(...)`,
        `buildContributionConfirmedPayloadData(...)` — each taking already-resolved strings/numbers and
        returning the exact `payload_data` shape its `alertVariant` declares (`alerts/alert.ts:109-127`).
        No clock, no locale lookup, no I/O.
  - [x] Export from `packages/contracts/src/alerts/index.ts`. **No `.openapi()` registration** — internal
        queue seam, `openapi/v1.yaml` stays byte-identical (the `alerts/` directory posture,
        `alerts/index.ts:1-5`).
- [x] Update `packages/contracts/src/alerts/README.md` — the directory's "Landing Story" line still says
      contracts land at 8.1/8.2/8.3; add 8.8.

### Task 3 — Copy strings in the `contribution` i18n namespace (AC4)

- [x] Add `notify.*` keys to **both** `packages/i18n/locales/hi/contribution.json` and `.../en/contribution.json`:
      cycle-open title/body; four deadline-reminder subjects + four `deadline_display`-feeding day labels
      (bands: day 5 → `calm`, day 10 → `calm`, day 13 → `factual`, day 14 → `closing`, per D2);
      contribution-confirmed period label. Latin operational numerals only (amendment-A2).
- [x] `pnpm i18n:check` (parity) + `pnpm microcopy:check` green. **No `microcopy.yaml` change is needed or
      wanted** — the `contribution` namespace is already scanned with proven teeth (`microcopy.yaml:141-149`);
      extending gate scope where coverage already exists is the vacuous extension
      `[[feedback_gate_scope_semantic_coverage]]` / `[[project_access_wrapper_gate_pending_scope]]` warn
      against. **Do** add a planted-violation assertion to the existing `scripts/microcopy/contribution.test.ts`
      covering one new `notify.*` key, so the teeth are proven over the new copy specifically.

### Task 4 — The live fan-out composition (AC1, AC5, AC6)

- [x] `apps/jobs/src/scheduler/contribution-notify.ts` — the ONE definition of the live fan-out, taking an
      injectable deps bundle (pool, encryption, audit port, hashRendered, provider registry, the policy
      inputs) so it is unit-testable with fakes and DB-testable live.
  - [x] `fanOutAlert(deps, alert)` — the ratified Decision-3 shape:
        1. `evaluateDegradedModeBridge(...)`. If `bridged: true` (cycle-open under an active declaration):
           **skip the ladder entirely** and force-send SMS only (`DEGRADED_MODE_BRIDGE_CHANNELS`), bypassing
           cost-optimization (`degraded-mode.ts:17-24`). That is the AR-20 carve-out, not a ladder run.
        2. Otherwise `evaluateCostOptimization(...)`. Resolve the member's targets once (the Task-1 domain
           reads), then build the **suppressed-channel set** — the resolver **omits** those targets, which is
           the mechanism 5.7 specifies ("the future live fan-out drives it by omitting the suppressed cost-
           channels' targets", `cost-optimization.ts:10-11`). Push is never suppressed.
        3. `runChannelCascade(send, { backoffMs: [], sleep })` where `send(channel, attempt)` calls
           **`dispatch(alert, { ...deps, resolveDelivery: () => ({ [channel]: target }) })`** — one rung per
           call — and maps `outcome.attempts[0]` to a `ChannelSendOutcome`. A channel with no target yields
           `skipped_no_target`, which the cascade treats as non-retryable and advances past **without**
           burning a retry (`cascade.ts:47-52`) — exactly the desired behavior for a member with no WA opt-in.
        4. Fire the Telegram mirror **outside** the cascade, only when
           `isCategoryEligible('telegram', alert.alert_category)`; fire-and-forget, never affects the outcome.
        5. Record the `CascadeOutcome.trail` + `deliveredChannel` on the job result (NON-PII: channels +
           outcomes only, never an address).
  - [x] **Multi-push-target fan-out:** `resolvePushTargets` returns MANY targets (one per device) but the
        frozen `DeliveryResolver` returns ONE `SendTarget` per channel (`device-token.handlers.ts:142-147`
        names this exactly as the live-fan-out story's problem). Resolve it **in the composition, not in
        `dispatch`**: on the `push` rung, iterate the member's device targets and treat the rung as `sent` if
        **any** device accepted (a member with a dead old token and a live current one must not cascade to
        paid channels). Do **not** change `DeliveryResolver`.
  - [x] **Push-token invalidation:** a `rejected` push whose `SendResult.detail` classifies as an
        unrecoverable token rejection must feed the shipped invalidation seam —
        `invalidatePushTokenOnFailure` (`apps/api/src/modules/device-token/push-invalidation.ts`) using
        `isUnrecoverableTokenRejection` (defined in `packages/channels/src/providers/push-errors.ts:80`,
        re-imported into `push-invalidation.ts`) — reuse both, do not re-classify. `invalidatePushTokenOnFailure`
        moves to `@twt/domain` with the rest of Task 1 if it is not already reachable.
  - [x] Audit: `createAuditPort(pool)` + `createRenderedMessageHash({ kms, hmacKeyRef })` from the jobs
        encryption deps (`buildJobsEncryptionDeps`). Reuse `alertPayloadDigest`. Never log a raw address.
  - [x] `@twt/i18n` must be added to `apps/jobs/package.json` dependencies (it is server-safe at the root —
        `packages/i18n/src/index.ts:9-15`).
- [x] **Durable retry (D9):** a member whose whole ladder came back undelivered makes the job **throw**, so
      pg-boss retries it with its own bounded exponential backoff (`SendOptions` re-exported from
      `@twt/queue:26-33`; the `cycle-spawn.ts:169` "rely on pg-boss's own retryLimit + DLQ" precedent). A
      member who **did** deliver is recorded in the idempotency store, so a retried batch re-sends nothing.
      Configure `retryLimit` / `retryDelay` / `retryBackoff` explicitly at the enqueue site — do not inherit
      an unstated default.
- [x] Add `QUEUE_NAMES` entries in `packages/queue/src/index.ts` with the established doc-comment style +
      job class: `CONTRIBUTION_NOTIFY_CYCLE_OPEN` (parent), `CONTRIBUTION_NOTIFY_POOL_BATCH` (child),
      `CONTRIBUTION_DEADLINE_REMINDER_SWEEP` (cron), `CONTRIBUTION_NOTIFY_CONFIRMED` (Epic-9 seam).

### Task 5 — Cycle-open trigger (AC1)

- [x] Export the per-cycle roster read: promote `loadCycleBindingCandidates`
      (`packages/domain/src/pool/contribution-binding.ts:256-302`, currently module-private) to an exported
      `listCycleBindingCandidates` — it already returns exactly `{ poolId, poolIndex,
      poolCanonicalIdentifier, fixedAmount, claimCaseId, memberIds }` per pool from the **latest persisted
      snapshot**. **Reuse it; do not write a second "latest snapshot per pool" derivation** — that is the
      drift `contribution-binding.ts:327-328` explicitly guards against.
- [x] Extend `runCycleOpenAlert` (`apps/jobs/src/scheduler/cycle-open-alert.ts:98-140`) to enqueue the
      `CONTRIBUTION_NOTIFY_CYCLE_OPEN` parent **post-commit**, threading the `alert.published` payload's
      `time_critical` verbatim. Mirror the story-8.1 **D4 "enqueue is primary, sweep is recovery"** pattern
      (`cycle-open-alert.ts:14-25`) — including a bounded recovery sweep for a dropped enqueue.
- [x] Parent worker: page the cycle's pools → one `CONTRIBUTION_NOTIFY_POOL_BATCH` child per pool
      (`singletonKey = ${alertId}:${poolId}`). Child worker: chunk `memberIds`, build one `Alert` per member
      via the Task-2 builders, `fanOutAlert` each. Mirror `apps/jobs/src/cycle-spawn.ts`'s parent/child +
      bounded-concurrency shape.
- [x] Per-member idempotency: a keyed-store entry (Story 1.12 `idempotency` domain module — the same
      primitive `cycle-spawn.ts` uses) on `(alert_id, member_id, 'cycle_open')`. A retry/redelivery no-ops.

### Task 6 — Deadline-reminder cadence (AC2)

- [x] Extract the cycle-day computation into ONE shared pure helper so the card and the reminder cannot
      drift: reuse the D5 seam constant + arithmetic from
      `apps/api/src/modules/member-pool/handlers.ts:80-93` (`CYCLE_WINDOW_DAYS`, leap-safe `setDate`,
      `computeDaysRemaining`). Home it beside `selectToneGradientKey` in the Task-2 contracts module and
      have `handlers.ts` consume it (a pure move; behavior identical, existing tests must stay green).
      Keep the "**Story 8.9 replaces this with the authoritative close date**" note on it.
- [x] `CONTRIBUTION_DEADLINE_REMINDER_SWEEP` cron worker (daily, `tz: 'Asia/Kolkata'` — the established
      `CYCLE_OPEN_ALERT_SWEEP_TZ` convention): scan `alerts` where `current_state = 'live'`, join the
      cycle-freeze `committed_at`, compute cycle-day, and act only when it is in
      `DEADLINE_REMINDER_SEND_DAYS`. **Bounded batch limit** (mirror `DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT`)
      with a non-silent cap alarm; ordered scan for deterministic progress.
- [x] Per-member suppression (D3): skip a member who already has a `contribution.confirmed` (green) OR a
      `contribution.utr-attested` (yellow) for the pool. Record the reason
      (`already_confirmed` | `already_attested`). Add a test asserting the suppression is keyed on the
      member's own open action and that **no confirmed count, contributor list, or progress meter reads it** —
      this is a nudge decision, not a promotion (the `epics.md:2935-2941` invariant).
- [x] Idempotency key `(alert_id, member_id, cycle_day)` so a same-day re-tick, retry, or restart never
      double-sends.

### Task 7 — Contribution-confirmed seam (AC3)

- [x] Export `enqueueContributionConfirmedNotification(boss, { pariwarId, alertId, poolId, memberId,
      amountPaise, periodLabel, … })` from the `@twt/jobs` barrel (`apps/jobs/src/index.ts`) — the call
      Epic 9 makes post-commit when it emits `contribution.confirmed`.
- [x] Worker builds the `contribution_confirmed` `Alert` (`time_critical: false`) and calls `fanOutAlert`.
- [x] **No cron. No recovery sweep.** Document in-file why (producer-less scheduled worker = the Story 5.6
      anti-pattern; contrast 8.1's sweep, which had a real producer in `cycle.frozen`).
- [x] Test drives the seam with a hand-built `contribution.confirmed` event and asserts the dispatched
      payload shape + deep-link target (`contributions/:pool_id`, `deep-link.ts:93-98`).

### Task 8 — Tests

- [x] **Contracts unit** (`packages/contracts/tests/`): day→band map boundary-tested at
      `{0, 4, 5, 10, 11, 13, 14, 15}`; the **coherence invariant** — for every send day D,
      `templateBandFor(D) === selectToneGradientKey(D)` (the card's band); payload builders produce shapes
      that `Alert.parse()` accepts for their category and REJECT a wrong-category shape.
- [x] **Mobile unit**: the existing `toneGradient` tests still pass through the re-export (proves the move
      was behavior-preserving).
- [x] **Jobs orchestration** (`apps/jobs/tests/contribution-notify.test.ts`, fakes only, runs without
      `DATABASE_URL` — the AI-7-1 pattern): parent→child fan-out shape; per-member idempotency (a second run
      sends nothing); the cost-opt / degraded-bridge composition ORDER (bridged cycle-open bypasses
      suppression **and the ladder**, sending SMS only; non-bridged suppresses whatsapp+sms but never push);
      suppression reasons; honest outcome mapping; a failure for one member never aborts the batch.
- [x] **Cascade behavior (the Decision-3 teeth)** — reject/accept provider doubles per the AI-5-2 §3 pattern
      (the shipped `createFixture*Provider` **always** return `accepted`, so a cascade over them delivers on
      push and can never exercise the ladder; carry the same "WHY REJECT DOUBLES EXIST" rationale comment):
  - [x] **push accepts ⇒ WA and SMS are never sent** — the load-bearing cost property Decision 3 buys.
        Assert the WA and SMS provider doubles' `send` was called **zero** times.
  - [x] push rejects, WA rejects ⇒ delivers on SMS; the trail is push→whatsapp→sms with **one attempt per
        rung** (`backoffMs: []`, no retries burned); SMS `send` called exactly once; **no trail entry after
        the `sms:sent` entry** (the AI-5-2 item-3 "stop after SMS" property).
  - [x] a member with **no WA target** yields `skipped_no_target` and the ladder advances to SMS
        **without** burning a retry (`cascade.ts:47-52`).
  - [x] ladder fully exhausted ⇒ the job **throws** so pg-boss retries (D9); a member already recorded
        delivered in the idempotency store is **not** re-sent on that retry.
  - [x] **Telegram is independent**: eligible for `alert_published` and fired outside the ladder; **not**
        eligible for `deadline_reminder` / `contribution_confirmed`; a Telegram failure changes neither
        `delivered` nor `deliveredChannel`.
  - [x] a member with **two device tokens, one dead one live**, resolves the push rung as `sent` and does
        **not** cascade to paid channels.
- [x] **Live-DB integration** (`apps/jobs/tests/integration/contribution-notify.spec.ts`,
      `describe.skipIf(!hasDatabase)`, :5433): a real seeded cycle → `alert.published` → the fan-out writes
      one `alert.dispatch` line + per-channel `alert.channel_send` lines per member, with the HMAC computed
      through the **same `createRenderedMessageHash` helper** production uses (never a hand-inlined
      `blindIndex` — the AI-5-2 item-4 rule). **Assert membership by the unique per-alert `resourceLocator`,
      never absolute row counts** (`[[project_live_db_test_gotchas]]` — `writeAuditEntry` own-commits into the
      global hash chain).
- [x] **No real timers** anywhere: inject the cascade `sleep` seam + a trivial `backoffMs` (the
      `tests/cascade.test.ts` `sleepRecorder`). The 30s/5m/30m default must never run in CI.

### Task 9 — Governance + verification

- [x] `pnpm ci:local` with `DATABASE_URL` on :5433 — all jobs green
      (`[[project_ci_actions_suspension_local_mirror]]`). Expect the known concurrency-oversubscription
      flake class; confirm innocence by re-running the suspect spec in isolation
      (`[[project_ci_local_concurrency_oversubscription]]`, `[[project_known_livedb_test_failures]]`).
- [x] **Friction budget:** affirm the declaration, add **no new row**, do **not** ratchet the baseline —
      notifications are not a page-weight surface (the Story 8.7 disposition;
      `[[project_friction_budget_baseline_ratchet]]`). Record the reasoning.
- [x] **PII-scrape matrix:** no entry — `public-vs-private-matrix.yaml` governs PUBLIC surfaces and reserves
      population to Epic 11a. Record the PII shape in the Dev Agent Record instead (the 8.7 disposition).
- [x] **Determinism gate:** `render` is unchanged, so `channels-determinism` must stay green untouched. If
      it moves, you have modified a frozen surface — revert.
- [x] Record the tone-review sign-off (AC4) — or record it un-attested with the reason
      (`[[feedback_record_unattested_no_backfill]]`).
- [x] **Time-to-fan-out NFR (§5.12, `architecture.md:3479`):** the architecture commits "≥95% of cycle-open
      pushes delivered within 5 minutes of cycle freeze; graceful degradation extends window under quota
      strain" — this story's batched parent→child→chunk fan-out is exactly what that budget governs. This
      story does **not** add measurement/enforcement for it (no timing instrumentation is in scope). Record
      this disposition explicitly in the Dev Agent Record as an open risk, not a silent gap — do not let the
      SLA go unmentioned.

### Review Findings

**Scope note:** the full working-tree diff for this story (~6,860 lines / 54 files) exceeded the review
workflow's 3,000-line sanity threshold, so the review was chunked. This pass covers **Group 1 — trigger
core**: `apps/jobs/src/scheduler/contribution-notify.ts`, `contribution-notify-triggers.ts`, their tests,
and the wiring changes to `apps/jobs/src/boot.ts`, `index.ts`, `package.json`,
`apps/jobs/src/scheduler/cycle-open-alert.ts`, and `packages/queue/src/index.ts`. Three groups remain
un-reviewed and are tracked in `deferred-work.md`: copy/templates (`packages/contracts/src/alerts`,
i18n, mobile `toneGradient.ts`), the domain notifications + encryption/kyc refactor
(`packages/domain/src/notifications/*`, `encryption/*`, `kyc/*`), and the API call-site updates
(`apps/api/src/modules/{device-token,kyc,member-pool,auth,channel-config}/*`).

- [x] [Review][Patch] (resolved from decision-needed) Recovery sweep can permanently blind future healing for a partially-enqueued cycle — the `NOT EXISTS` probe in `runContributionNotifyRecoverySweep` treats the existence of ANY `contribution.notify:<alert_id>:%:cycle_open` key as proof the whole fan-out ran. If the parent enqueues children for some pools before failing on others, one pool's member claims permanently satisfy the probe and the pools that never got enqueued are never healed. Fix: probe per-pool — compare the pool count from `listCycleBindingCandidates` against the count of pools with at least one idempotency key, and re-enqueue only when they don't match. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `runContributionNotifyRecoverySweep`]
- [x] [Review][Patch] (resolved from decision-needed) No bounded concurrency anywhere in the per-member/per-device fan-out (`runContributionNotifyChild`'s chunk loop, `fanOutAlertToMembers`'s member loop, `sendPushRung`'s device loop are all fully sequential) — this directly bears on the story's own disclosed open risk (§5.12: "≥95% of cycle-open pushes delivered within 5 minutes"), and the Dev Notes substrate map cites "Parent→N-child saga + **bounded concurrency**" (7.3/`cycle-spawn.ts`) as the pattern to reuse, which was not applied inside the child fan-out. Fix: add a concurrency cap (matching the 7.3 precedent) to the member loop in `fanOutAlertToMembers` and/or the device loop in `sendPushRung`. [`apps/jobs/src/scheduler/contribution-notify.ts`, `contribution-notify-triggers.ts`]
- [x] [Review][Defer] Head-of-line blocking risk in both sweeps — `ORDER BY a.cycle_id ASC LIMIT $1` has no relation to alert age/urgency and no defense against a permanently-failing alert (e.g. unresolvable pool identity, which never produces an idempotency key) monopolizing scan slots every tick if live-alert volume ever exceeds the cap. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `runContributionNotifyRecoverySweep`, `runDeadlineReminderSweep`] — deferred: at current/near-term scale, live-alert volume is well under the 500-alert cap, so this can't actually trigger yet; re-trigger when live-alert volume approaches the cap.
- [x] [Review][Defer] Cross-app barrel export for a not-yet-existing consumer — `apps/jobs/src/index.ts` exports `enqueueContributionConfirmedNotification` specifically so "Epic 9's reconciliation matcher can call it," implying a future app imports from `apps/jobs`'s package entrypoint rather than a shared `packages/*` module. [`apps/jobs/src/index.ts`] — deferred: acceptable for now as a pure, dependency-free enqueue function with no real consumer built yet (per this project's no-premature-package convention); flagged for whichever story builds Epic 9's reconciliation matcher to revisit whether this should move to a shared package once the real consumer exists.
- [x] [Review][Patch] Local-time date arithmetic bug in the deadline computation — `runDeadlineReminderSweep` builds `deadlineAt` via `new Date(committedAt); deadlineAt.setDate(deadlineAt.getDate() + CYCLE_WINDOW_DAYS)`, which operates in the process's local timezone, contradicting the sibling `operationalDate()` helper's explicit UTC-only rationale ("deterministic and never drifts"). Fix: use UTC-based date arithmetic. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts`]
- [x] [Review][Patch] Missing explicit pg-boss retry policy on `enqueueContributionConfirmedNotification` — contradicts the worker's own "throwing so pg-boss retries" comment and the sibling child-enqueue's explicit D9 `retryLimit`/`retryDelay`/`retryBackoff`. Without it, pg-boss defaults to no retry, so a `contribution.confirmed` push that fails delivery is silently lost forever (AC3 deliberately has no recovery sweep to heal it). Fix: add the same explicit retry options used at the `CONTRIBUTION_NOTIFY_POOL_BATCH` enqueue site. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `enqueueContributionConfirmedNotification`]
- [x] [Review][Patch] `sendPushRung`'s per-device loop has no per-device try/catch — if `dispatchOneChannel` or the best-effort `invalidatePushToken` write throws for device 1, device 2..N are never attempted and the member is marked undelivered even though a later device might have succeeded. Fix: wrap each device attempt in try/catch so one device's failure doesn't skip the rest. [`apps/jobs/src/scheduler/contribution-notify.ts` — `sendPushRung`]
- [x] [Review][Patch] Three `Alert`-builder functions cast with `as Alert` and no runtime schema validation in production code, unlike test code which calls `Alert.parse(...)`. Fix: validate with `Alert.parse(...)` (or equivalent) before returning. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `buildCycleOpenAlert`, `buildDeadlineReminderAlert`, `buildContributionConfirmedAlert`]
- [x] [Review][Patch] Shared `sweepAlertLimit` config knob is documented as scoped to the deadline sweep ("Max `live` alerts one deadline sweep run considers") but is silently reused to bound the unrelated cycle-open recovery sweep, so an operator cannot tune one without affecting the other. Fix: split into two distinct config fields. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts`]
- [x] [Review][Patch] Deadline-sweep's per-pool `enqueuePoolBatch` failure inside the per-alert `try` silently drops only the failed pool(s) for that cycle-day with no way to retry just the missed pools before the next send-day. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `runDeadlineReminderSweep`]
- [x] [Review][Patch] `store.release(key)` failure in `runContributionConfirmedNotify` is caught but not alarmed, so a stuck idempotency claim silently delays retry until TTL expiry with no operator signal. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `runContributionConfirmedNotify`]
- [x] [Review][Patch] `deadlineAtIso` is not validated as a parseable date before `new Date(...)` — a malformed value would silently render "NaN-NaN-NaN" in member-facing reminder copy. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts`]
- [x] [Review][Patch] `deadline_reminder` payloads with a missing/undefined `cycleDay` are not validated at consumption — falls back silently to the day-5 message while the idempotency key becomes `day_undefined`. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts`]
- [x] [Review][Patch] Recovery-sweep re-enqueue's `requestId`/`traceId` are static per alert (`contribution.notify.sweep:<alert_id>`, no per-attempt component) — every hourly retry for the same stuck alert is indistinguishable in logs/tracing. [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `runContributionNotifyRecoverySweep`]
- [x] [Review][Patch] Minor observability inconsistency: the pre-existing `CYCLE_OPEN_ALERT_SWEEP` worker wraps its sweep call in try/catch + `console.error` before rethrowing; the new `CONTRIBUTION_NOTIFY_CYCLE_OPEN_SWEEP`/`CONTRIBUTION_DEADLINE_REMINDER_SWEEP` workers don't follow that precedent (pg-boss still marks the job failed either way — this is a log-line gap, not a correctness gap). [`apps/jobs/src/scheduler/contribution-notify-triggers.ts` — `registerContributionNotifyWorkers`]
- [x] [Review][Patch] Task 6 asked for a test asserting reminder suppression does not interfere with `progress.confirmedCount` / the confirmed contributor list / any "raised so far" figure — the invariant is structurally upheld (the code never reads those fields) but no test in this diff asserts it explicitly, per the story's own Task 6 test bullet. [`apps/jobs/tests/contribution-notify-triggers.test.ts`]
- [x] [Review][Defer] Claim-before-send is not strictly exactly-once — a crash between a provider accepting a send and `store.recordResult` completing leaves the claim outstanding; once the TTL (300s) lapses, a retry or the recovery sweep can re-claim and re-send. Inherent to the Story 1.12 keyed-store idempotency pattern already used elsewhere; not introduced or fixable within this diff alone. — deferred, pre-existing pattern
- [x] [Review][Defer] The recovery-sweep's "no trace = never ran" probe assumes `idempotency_keys` rows are effectively permanent for the lifetime a `live` alert could exist — depends on the external Story 1.12 primitive's own retention/TTL/pruning policy, which is not shown in this diff. — deferred, pre-existing external primitive
- [x] [Review][Defer] AR-18 SMS-bridge signal is lost on the recovery-sweep-repaired path (`timeCritical: false` fallback, since the sweep doesn't have access to the `alert.published` payload) — already explicitly documented and reasoned as an accepted trade-off in the code's own comments, and confirmed compliant with AC1/invariant 6 by the acceptance audit. Recorded here as a known limitation, not a defect. — deferred, documented accepted trade-off
- [x] [Review][Defer] Job-payload `as JobEnvelope<...>` casts with no runtime validation at the pg-boss trust boundary — this is the established pattern already used by the pre-existing `cycle-spawn.ts` and `cycle-open-alert.ts`, not something introduced by this story. — deferred, pre-existing convention
- [x] [Review][Defer] `boss.work` handlers iterate `jobs: Job[]` with no per-job try/catch (one job's throw can stop siblings in the same batch invocation from running) — same pre-existing convention already used by `cycle-spawn.ts` and `cycle-open-alert.ts`'s `CYCLE_OPEN_ALERT` worker; not a regression introduced here. — deferred, pre-existing convention

### Review Findings — Group 2 (copy/templates)

**Scope note:** Group 2 of the chunked review, covering `packages/contracts/src/alerts/{contribution-loop-templates.ts,README.md,index.ts}` + the new template test, the `apps/mobile/.../toneGradient.ts` relocation, `packages/i18n/locales/{en,hi}/contribution.json`, and `scripts/microcopy/contribution.test.ts` (794 lines, 8 files). Groups 3-4 (domain notifications + encryption/kyc refactor, API call-site updates) remain queued.

- [x] [Review][Defer] Three payload-data schemas in `contribution-loop-templates.ts` (`CycleOpenPayloadData`, `DeadlineReminderPayloadData`, `ContributionConfirmedPayloadData`) hand-redeclare the exact same shapes `alert.ts`'s `alertVariant(...)` already declares inline for those three categories, with no compile-time link between them — only the test suite's `Alert.parse()` round-trip catches drift. This is the same "guarded duplicate" pattern D1 explicitly rejected when it moved `toneGradient.ts` into contracts ("one authority beats a guarded duplicate"), reproduced here for the payload shapes instead. [`packages/contracts/src/alerts/contribution-loop-templates.ts`, `packages/contracts/src/alerts/alert.ts`] — deferred: `alert.ts` is shared by 6 other alert categories outside this story's scope; exporting named per-category schemas is a deliberate architectural change deserving its own review, not a same-pass patch. Test-time `Alert.parse()` round-trip already catches drift today.
- [x] [Review][Patch] (resolved from decision-needed) `ContributionConfirmedPayloadData.amount_paise` used `z.number().int().nonnegative()`, so a ₹0.00 "confirmed contribution" notification would validate and dispatch — nonsensical for a real product scenario. Fix: tighten to `.positive()` so a future Epic 9 bug can't slip a zero-amount confirmation push through. [`packages/contracts/src/alerts/contribution-loop-templates.ts`]
- [x] [Review][Patch] `computeDaysRemaining` — the canonical D5 seam feeding BOTH the My Pool card's days-remaining display AND (via `cycleDayFromCommittedAt`) the deadline-sweep's send-day gating — builds `windowEnd` via local-timezone `setDate`/`getDate`, the same bug class already fixed in Group 1's `runDeadlineReminderSweep`, but here it's the more load-bearing shared authority: a server not running in UTC could compute a different cycle-day than intended near midnight, breaking the card/reminder coherence invariant this exact function exists to guarantee. The doc comment's "leap-safe" justification for `setDate` over a fixed-ms add doesn't actually hold for UTC instants (no DST/leap-seconds in UTC, so a `+15×MS_PER_DAY` add is calendar-equivalent). Fix: UTC-safe fixed-ms arithmetic, mirroring the Group-1 fix. [`packages/contracts/src/alerts/contribution-loop-templates.ts` — `computeDaysRemaining`]
- [x] [Review][Patch] `computeDaysRemaining` clamps its result to a floor of 0 but has no ceiling clamp — if `now` precedes `committedAt` (clock skew, out-of-order call), it can return a days-remaining value greater than `CYCLE_WINDOW_DAYS`. Downstream `cycleDayFromDaysRemaining` clamps its own input, but any direct caller of `computeDaysRemaining` (e.g. the My Pool card) reading the raw value would not be protected. Fix: `Math.min(CYCLE_WINDOW_DAYS, ...)`. [`packages/contracts/src/alerts/contribution-loop-templates.ts` — `computeDaysRemaining`]
- [x] [Review][Patch] `band` in `CONTRIBUTION_LOOP_TEMPLATE_KEYS` is hand-typed as a literal per send-day rather than derived from `selectToneGradientKey(day)`, even though that exact function lives in the same file — the in-file comment concedes this is a manually-maintained invariant ("Do not hand-edit one without the other"), reconciled only by a runtime test. Fix: write `band: selectToneGradientKey(5)` etc. directly, eliminating the drift risk at zero cost. [`packages/contracts/src/alerts/contribution-loop-templates.ts` — `CONTRIBUTION_LOOP_TEMPLATE_KEYS`]
- [x] [Review][Patch] `templateBandFor` has no runtime guard against an out-of-registry cycle-day — `CONTRIBUTION_LOOP_TEMPLATE_KEYS[day]` would be `undefined` for a `day` outside `{5,10,13,14}` reaching this exported public function via an unsafe cast or unvalidated caller, producing a `TypeError` reading `.band` of `undefined` rather than a clear error. [`packages/contracts/src/alerts/contribution-loop-templates.ts` — `templateBandFor`]
- [x] [Review][Patch] Nothing cross-checks that the `notify.*` key strings referenced in `contribution-loop-templates.ts`'s registries actually exist in `packages/i18n/locales/{en,hi}/contribution.json` — a typo on either side (e.g. `day_10` vs `day10`) would silently fall through to i18n's missing-key fallback with no failing test anywhere in this diff. Fix: add a test asserting every referenced key resolves to a real, non-fallback string in both locales. [`packages/contracts/tests/contribution-loop-templates.test.ts`]
- [x] [Review][Patch] The new microcopy planted-violation tests (Story 8.8's own teeth for the `notify.*` surface) only exercise 4 of the 11 new keys (day_14 subject, cycle_open.title, day_13 subject, and — Hindi-only — day_13 display for numerals); `day_5`, `day_10`, `cycle_open.body`, and `confirmed.period_label` get zero adversarial coverage, and there is no `checkTone` assertion against the Hindi file at all. A scarcity/panic frame planted in any of those keys — especially any Hindi translation — would pass every test added here. Fix: extend coverage to the remaining keys and add at least one Hindi `checkTone` case. [`scripts/microcopy/contribution.test.ts`]
- [x] [Review][Patch] `DeadlineReminderPayloadData.deadline_at` uses `z.string().datetime({ offset: true })`, which accepts arbitrary `+HH:MM`-style offsets, but `buildDeadlineReminderPayloadData` only ever emits `.toISOString()` output (always `Z`-suffixed) — a hand-built payload bypassing the builder could carry a non-`Z` offset and still validate, inconsistent with this module's "producer resolves and freezes everything" posture. Fix: tighten to `z.string().datetime()` (UTC `Z` only, no `offset: true`). [`packages/contracts/src/alerts/contribution-loop-templates.ts`]
- [x] [Review][Defer] No `.max()` bound on member-facing strings (`title`, `body`, `subject`, `deadline_display`) — only `.min(1)`. The day-14 English subject already runs well past typical push-notification lock-screen truncation limits. Choosing a sensible cap is a UX/copy decision, not a mechanical fix. — deferred, needs a UX/copy-review call on acceptable length, not a code decision
- [x] [Review][Defer] Mobile re-export imports from the `@twt/contracts` package root (`from '@twt/contracts'`) rather than a scoped subpath — verified this is the ALREADY-ESTABLISHED pattern across 11 other `apps/mobile` files predating this story (e.g. `pay.tsx`, `session-context.tsx`), so it is not a new bundle-boundary risk introduced by Story 8.8. — deferred, pre-existing established pattern, not a regression

### Review Findings — Group 3 (domain notifications + encryption/kyc refactor)

**Scope note:** Group 3 of the chunked review, covering `packages/domain/src/notifications/{delivery,pool-identity,push-invalidation,index}.ts` + tests, `packages/domain/src/encryption/{field-classes,member-fields}.ts`, `packages/domain/src/kyc/name.ts`, and small wiring changes to `packages/domain/src/{encryption/index,kyc/index,index,contribution/read,pool/contribution-binding}.ts` (1,405 lines, 14 files). Group 4 (API call-site updates) remains queued.

- [x] [Review][Patch] (resolved from decision-needed) `ADMIN_GLOBAL_NAMESPACE` was relocated into `packages/domain/src/encryption/field-classes.ts` alongside the member PII constants, but nothing in `packages/domain/src/notifications/` or `apps/jobs/src/` actually consumes it, and the Dev Agent Record's "wider than Task 1's literal list" disclosure doesn't name it. Fix: accept the colocation (all identity-namespace sentinels living together is a defensible grouping) and update the Dev Agent Record disclosure to explicitly name `ADMIN_GLOBAL_NAMESPACE`, so the scope is honestly recorded rather than merely implied. [`packages/domain/src/encryption/field-classes.ts`, Dev Agent Record]
- [x] [Review][Defer] Logging strategy is inconsistent across the three new notification modules: `pool-identity.ts` deliberately accepts an injectable `PoolIdentityLogSink` so the domain layer stays console/Fastify-agnostic, but `delivery.ts` and `push-invalidation.ts` hardcode raw `console.error`/`console.warn` calls directly — contradicting the DI principle demonstrated in the very same diff and making a cron/worker fan-out's failures harder to correlate with request context. [`packages/domain/src/notifications/delivery.ts`, `packages/domain/src/notifications/push-invalidation.ts`] — deferred: real but cosmetic (console.error/warn work operationally today); retrofitting DI now risks touching Group 4's not-yet-reviewed apps/api call sites. Revisit as a dedicated pass once all 4 groups are reviewed.
- [x] [Review][Patch] `resolveWaTarget`/`resolveSmsTarget` don't isolate a `decryptMobile` failure the way `resolvePushTargets` does (`Promise.allSettled` per-device) — a thrown decrypt error propagates uncaught out of the resolver, and because `apps/jobs/src/scheduler/contribution-notify.ts`'s `resolveMemberDeliveryContext` gathers all four channel resolvers via `Promise.all`, ONE corrupt/context-mismatched WA or SMS mobile ciphertext fails the WHOLE `Promise.all` — denying the member push and Telegram delivery too, even though those channels were perfectly resolvable. Fix: wrap each `decryptMobile` call in try/catch, returning `null` (no target) + a log line on failure, matching push's per-row isolation philosophy. [`packages/domain/src/notifications/delivery.ts` — `resolveWaTarget`, `resolveSmsTarget`]
- [x] [Review][Patch] `resolvePoolIdentity` doesn't catch `poolDomain.poolLetterCode`'s possible `PoolLetterCodeRangeError` (thrown for a negative/non-integer `poolIndex`), contradicting its own docstring's "never propagate out" guarantee — every other unresolvable-input path in this function (KYC decrypt failure, curated-name registry exhaustion) degrades gracefully to `null`/letter-code fallback; this one call is the sole exception and would crash the caller's job instead of skipping one pool. Fix: wrap in try/catch like the KYC decrypt and `resolveCuratedPoolName` already are. [`packages/domain/src/notifications/pool-identity.ts` — `resolvePoolIdentity`]
- [x] [Review][Dismiss] ~~`invalidatePushToken`'s `PushInvalidationOutcome` type declares `'kept'` but no code path in `invalidatePushToken` itself ever returns it~~ — INVESTIGATED and retracted before applying: `'kept'` is not dead. `apps/api/src/modules/device-token/push-invalidation.ts:44` (the pre-classification wrapper both apps call before reaching `notifications.invalidatePushToken`) already returns `'kept'` for "the rejection was NOT unrecoverable, so the token needs no invalidation" — a distinct, real scenario from `invalidatePushToken`'s own missing-fields/exception cases. `PushInvalidationOutcome` correctly spans the whole call chain (wrapper + domain write), not just this one function. Collapsing "missing scoping fields" and "a thrown exception" into `'error'` inside `invalidatePushToken` is a defensible simplification (both ARE anomalies worth alarming on), not a bug. [`packages/domain/src/notifications/push-invalidation.ts`]
- [x] [Review][Patch] `listActedMemberIdsForPool` (Task 6/AC2/D3's new reminder-suppression read — raw SQL, JSON-path extraction, a dual-event-type `OR` query) ships with zero dedicated unit tests in this diff, unlike every other new function here (`delivery.ts`, `pool-identity.ts` both got test files). Fix: add tests covering the happy path, confirmed-wins-when-both-sets-present, no-match, and the attested branch's alert-stream scoping. [`packages/domain/src/contribution/read.ts` — `listActedMemberIdsForPool`]
- [x] [Review][Patch] `writeInvalidationAudit` string-interpolates an externally-sourced `facts.detail` (a provider rejection message) unsanitized into a `key=value;key=value`-style `resourceLocator` audit string — if a provider's error text ever contains `;` or `=`, the audit record becomes malformed or ambiguous. Fix: strip/escape those characters (or a stricter charset) before interpolating. [`packages/domain/src/notifications/push-invalidation.ts` — `writeInvalidationAudit`]
- [x] [Review][Patch] `resolvePushTargets`' decrypt-failure log omits `principalId` (arguably the single most useful field for tracing which device/principal failed) while logging the full raw `outcome.reason` error object. Fix: include `principalId` in the log line. [`packages/domain/src/notifications/delivery.ts` — `resolvePushTargets`]
- [x] [Review][Defer] `normalizeMobile` only strips a `91` prefix or a single leading `0`, with no handling for a `0091` international-dialing prefix or other real-world variants. — deferred: verbatim relocation from Story 3.2 (confirmed byte-identical by the acceptance audit), not introduced by this diff.
- [x] [Review][Defer] `maskMobile` assumes its input is always the canonical 13-character `+91XXXXXXXXXX` string with no runtime assertion. — deferred: verbatim relocation from Story 3.2, not introduced by this diff.
- [x] [Review][Defer] `encryptMobile`'s docstring claims it "throws on a bad number" but the function performs no validation and would silently encrypt any string. — deferred: verbatim relocation from Story 3.2, not introduced by this diff.
- [x] [Review][Defer] `resolveCuratedPoolName` always resolves the Hindi curated name regardless of member/channel locale. — deferred: already self-documented as a known seam in the original Story 8.6/8.7 code ("Locale note (documented seam, unchanged from 8.6)"), not a new gap.
- [x] [Review][Defer] `resolvePushTargets` takes a raw `pariwarIdStr: string` + an unchecked `as PariwarId` cast, while `resolveWaTarget`/`resolveSmsTarget`/`resolveTelegramTarget` take a properly branded `PariwarId` — a real signature inconsistency, but branding is compile-time-only in this codebase (no runtime risk) and touching the signature now risks conflicting with Group 4's not-yet-reviewed `apps/api` call sites. — deferred to a dedicated typing-consistency pass alongside or after Group 4.

### Review Findings — Group 4 (API call-site updates, final group)

**Scope note:** Group 4 of the chunked review — the last group — covering `apps/api/src/context.ts`, `apps/api/src/modules/{auth/shared/mobile-index,channel-config/composition,device-token/{device-token-crypto,device-token.handlers,push-invalidation},kyc/kyc-crypto,member-pool/{handlers,name,pool-identity}}.ts`, the new test double `apps/api/tests/unit/_pool-identity-fake.ts`, and six updated apps/api unit test files (1,355 lines, 17 files). Most raw findings from this pass turned out to be false positives on verification — either mismatched assumptions about what Group 3 actually relocated (e.g. `ADMIN_EMAIL_FIELD_CLASS`/`MEMBER_DATA_EXPORT_FIELD_CLASS` correctly staying apps/api-local since they were never part of the relocation scope; "apps/api already depends on `@twt/jobs`" verified true via `apps/api/package.json`), or already-settled Group 3 architecture decisions being re-litigated from the consumer side (the `notifications` namespace grouping, the `DeliveryTarget`/`SendTarget` structural typing). Three findings survived verification:

- [x] [Review][Patch] `apps/api/tests/unit/_pool-identity-fake.ts` — the shared test double three handler suites use to stand in for `notifications.resolvePoolIdentity` — does NOT mirror the `poolLetterCode` try/catch that Group 3's own code review added to the real `packages/domain/src/notifications/pool-identity.ts` (a fix for `PoolLetterCodeRangeError` propagating out and breaking the resolver's "never propagate out" contract). The fake's own header comment states it "must stay a faithful mirror of the domain implementation" — it currently isn't. Triple-corroborated (Blind Hunter, Edge Case Hunter, and the Acceptance Auditor all independently flagged this exact divergence). Fix: add the same try/catch to the fake, returning `null` on a `poolLetterCode` throw. [`apps/api/tests/unit/_pool-identity-fake.ts`]
- [x] [Review][Patch] The Dev Agent Record's "Test churn" narrative claims "Seven apps/api suites... the four handler suites keep every original expectation via a shared test double," but the actual diff (confirmed via `grep -c "diff --git a/apps/api/tests"` and a search for `_pool-identity-fake` consumers) shows only SIX suites touched — three delivery-resolver adapter suites (wa-target/telegram-target/sms-composition) and three handler suites using the fake (active-contribution-card/contribution-history/contribution-note), not four. Fix: correct "Seven" → "Six" and "four handler suites" → "three handler suites" in the Dev Agent Record. [Dev Agent Record — "Test churn the relocation caused" section]
- [x] [Review][Patch] `member-pool/handlers.ts` imports the whole `@twt/contracts` namespace (`import * as contributionLoop from '@twt/contracts'`) to reference a single function (`computeDaysRemaining`), inconsistent with the named-import style used for every other cross-package reference in this diff. Fix: `import { computeDaysRemaining } from '@twt/contracts'`. [`apps/api/src/modules/member-pool/handlers.ts`]

## Dev Notes

### Substrate map — what already exists (reuse it; do not reinvent)

| Need | Shipped at | Location |
|---|---|---|
| `Alert` payload (9-category discriminated union) | 5.1 | `packages/contracts/src/alerts/alert.ts` |
| Central dispatcher + canonical ladder + audit emission | 5.1 | `packages/channels/src/dispatch.ts` |
| Pure per-channel renderers | 5.1/5.2/5.3 | `packages/channels/src/render.ts` |
| AR-19 fallback cascade (push→WA→SMS, backoff) | 5.6 | `packages/channels/src/cascade.ts` |
| Cost-optimization decision primitive | 5.7 | `packages/channels/src/cost-optimization.ts` |
| Degraded-mode SMS bridge decision primitive | 5.8 | `packages/channels/src/degraded-mode.ts` |
| Audit port + PII-safe rendered-message HMAC | 5.1 | `packages/channels/src/audit.ts` |
| Push targets (multi-device) | 5.2 | `apps/api/src/modules/device-token/device-token.handlers.ts:148` |
| WA target (dual-gated) / SMS target / Telegram target | 5.3/5.4/5.6 | `apps/api/src/modules/channel-config/composition.ts` |
| Cost-opt policy inputs (engagement, toggle) | 5.7 | `apps/api/src/modules/channel-config/composition.ts:380+` |
| Deep-link targets per category | 5.2 | `packages/contracts/src/deep-links/deep-link.ts:73-110` |
| Alert lifecycle state machine + `alert.published` | 8.1 | `packages/domain/src/alert/`, `apps/jobs/src/scheduler/cycle-open-alert.ts` |
| Per-cycle pool roster (latest snapshot) | 7.4/8.2 | `packages/domain/src/pool/contribution-binding.ts:256` |
| 15-day tone gradient (bands + copy) | 8.2 | `apps/mobile/components/active-contribution/toneGradient.ts`, `i18n contribution.json` |
| Days-remaining / cycle-window seam | 8.2 | `apps/api/src/modules/member-pool/handlers.ts:80-93` |
| Yellow attestation event (`attestation_only: true`) | 8.4 | `packages/domain/src/contribution/events.ts` |
| Confirmed-only read (green) | 8.3 | `packages/domain/src/contribution/read.ts` |
| Parent→N-child saga + bounded concurrency | 7.3 | `apps/jobs/src/cycle-spawn.ts` |
| Enqueue-primary + recovery-sweep pattern | 8.1 | `apps/jobs/src/scheduler/cycle-open-alert.ts:14-25` |
| Composed cascade+audit prototype (the shape to productionize) | AI-5-2 | `packages/channels/tests/integration/live-dispatch-cascade.spec.ts` |

### Load-bearing invariants this story must not break

1. **Yellow is never green.** Suppressing a *reminder* for an attested member is a nudge decision. It must
   not touch `progress.confirmedCount`, the confirmed contributor list, or any "raised so far" number
   (`epics.md:2912`, `:2935-2941`; `contracts/.../active-contribution-card.ts:26-32`). Never emit a
   `contribution_confirmed` alert from a `contribution.utr-attested` event.
2. **`contribution.confirmed` is Epic 9's exclusive producer.** This story consumes it; it never emits it,
   never synthesizes it, never infers it (`contribution/events.ts:88-97`).
3. **Frozen channel surfaces.** `dispatch` / `cascade` / `render` / `provider` / `audit` /
   `CANONICAL_CHANNEL_LADDER` / `DeliveryResolver` / `ChannelProvider` are consumed, never edited
   (`[[project_channels_no_live_dispatch_yet]]`). Every composition problem is solved *in the composition*.
4. **Render purity.** No clock, no locale, no tone selection inside a renderer. The producer resolves them
   into the payload — the same reason `deadline_display` exists as a producer-formatted string alongside the
   machine `deadline_at` (`render.ts:83-89`).
5. **PII posture.** The alert payload carries IDs + producer-formatted display strings and — for this story —
   the deceased family's `firstName + lastInitial` only (the same shield 8.2 applies). Never a member mobile,
   address, device token, VPA, UTR, or full name. Addresses are resolved at the composition layer and never
   logged (`alert.ts:9-14`).
6. **`time_critical` is Story 8.1's to set.** Copy it from the `alert.published` payload; never re-read
   degraded-mode state at notify time (the signal was resolved at the cycle-freeze instant —
   `alert/events.ts` `AlertPublishedPayloadSchema`).
7. **Tenant scoping.** Every read runs under `withPariwarScope` on the BYPASSRLS service pool (the
   `cycle-open-alert.ts:118` pattern). The cross-tenant sweep scan is the one deliberate exception, exactly
   as 8.1 models it.
8. **Dynamic `.limit()` clamps.** The domain-invariants gate clamps every dynamic `.limit()`, worker drains
   included (`[[project_domain_limit_clamp_and_savepoint_retry]]`).

### Decisions — ratified defaults, build to these

**D1 — Tone-gradient authority moves to `@twt/contracts`; mobile re-exports.**
The band selector is currently in `apps/mobile`, which the server cannot import. Rather than duplicate it
with a sync-guard test, move it to `packages/contracts/src/alerts/contribution-loop-templates.ts` and make
`apps/mobile/components/active-contribution/toneGradient.ts` a thin re-export. Contracts is already a mobile
dependency, so no boundary is crossed and no `@twt/domain` leak occurs
(`[[project_contracts_domain_bundle_boundary]]`). One authority beats a guarded duplicate when there is no
boundary reason to duplicate.

**D2 — Send-day → tone band: derive from the card's selector; do NOT read the epic's four labels positionally.**
`epics.md:3006` lists "Day 5 / Day 10 / Day 13 / Day 14 with copy matching the UX-DR25 tone gradient (calm /
factual / gently urgent / last day)". Read positionally that gives day 10 → *factual* — but Story 8.2's
**shipped** gradient puts day 10 in the *calm* band (`toneGradient.ts:50-54` (shipped selector): 0–10 calm, 11–13 factual, 14+
closing). Positional reading would push a member a "days remaining" nudge on day 10 and then show them "Your
pool is open — contribute when you can" when they open the app: an incoherent, slightly alarming mismatch.

**Ratified:** the band is **derived** from `selectToneGradientKey(cycleDay)` — day 5 → `calm`, day 10 →
`calm`, day 13 → `factual`, day 14 → `closing`. The **copy still differs per send day** (four distinct
templates), so the epic's "four sends, four messages" intent holds; only the *tone escalation* is bound to the
one shipped authority. The testable form is the **coherence invariant** in Task 8: the notification's band at
day D must equal the card's band at day D. Record this reconciliation in the Dev Agent Record
(`[[feedback_closure_language_precision]]` — this is a reconciliation, not a silent deviation).

**D3 — Reminder suppression: skip both green and yellow, with distinct reasons.**
A member who has attested has *acted*; telling them "please contribute" is factually wrong and corrodes the
trust register. Suppressing a nudge is not a confirmation claim — the 8.4 prohibitions are about counting,
displaying, and implying payment success, none of which suppression does. Epic 9's `contribution_mismatch`
covers the case where a yellow later fails reconciliation, so the member is not stranded. Record
`already_confirmed` vs `already_attested` distinctly so the two are never conflated in analytics.
*(If BigDev prefers the stricter reading — remind everyone not green — see Open Decision 2.)*

**D4 — The fan-out lives in `apps/jobs`; the delivery resolvers move to `@twt/domain`.**
Triggers are cron/worker-driven (architecture `:4322`), and `apps/jobs` cannot import `apps/api`. The
resolvers are DB reads + `@twt/domain` encryption with no Fastify dependency, so `@twt/domain` is their
natural home; `apps/api` re-exports and no existing call site changes. `SendTarget` is a plain structural
interface, so domain returns the shape without importing `@twt/channels` (which would be a cycle). Rejected:
by-value duplication in `apps/jobs` (drift risk on PII decryption); an internal HTTP hop (absurd).

**D5 — Cycle-day arithmetic is ONE helper, shared with the card, and stays the 8.9 seam.**
`CYCLE_WINDOW_DAYS = 15` + leap-safe `setDate` (`handlers.ts:80-93`). Story 8.9 replaces the *authoritative
close date* for both consumers at once. **Do not** encode any holiday logic here — 8.9 owns it
(`epics.md:3011-3023`).

**D6 — Batching shape: parent → one child per pool → chunked roster inside the child.**
Mirrors `cycle-spawn.ts` (which the same operator already runs). N pools is bounded (~50 at the 7.9 gate
shape); a pool roster is the chunkable unit. A single job per member at 4L scale would swamp pg-boss; a
single job for the whole cycle would blow the visibility timeout.

**D7 — Copy strings live in the existing `contribution` i18n namespace, not a new one.**
`contribution.json` is already in `microcopy.yaml` `scope.copy_globs` with proven teeth
(`microcopy.yaml:141-149`). A new namespace would require a gate-scope extension whose *only* value is
re-proving coverage that already exists — the vacuous extension `[[feedback_gate_scope_semantic_coverage]]`
warns against. Prefix new keys `notify.*`. **Do** extend the existing
`scripts/microcopy/contribution.test.ts` with a planted violation on a `notify.*` key so the teeth are proven
over the *new* copy, not merely inherited.

**D9 — Cascade drives the ladder; pg-boss owns the backoff. State the AR-19 reconciliation, don't hide it.**
Ratified Decision 3 makes `runChannelCascade` the per-member strategy. Its default schedule
(`DEFAULT_SMS_BACKOFF_MS = [30s, 5m, 30m]`, `cascade.ts:42`) sleeps **in-process**: at 4L members that would
hold a worker for 35+ minutes per undelivered member. `cascade.ts:14-17` itself anticipates this — *"a plain
array so a later DURABLE (pg-boss) adapter is thin"*.

**Ratified split:**
- **In-process:** `runChannelCascade(send, { backoffMs: [] })` — one attempt per rung, stop at first `sent`,
  advance immediately on failure. This gives AR-19's **ladder order + stop-at-first-success** with zero
  sleeping. `dispatch` is called once per rung, so every reuse (eligibility, provider selection, suppression
  hook, honest outcome mapping, both audit families) is preserved and nothing is re-implemented.
- **Durable:** when the ladder is exhausted undelivered, the job throws → pg-boss retries with bounded
  exponential backoff. This supplies AR-19's **retry-with-backoff** half.

**The honest deviation, to be recorded in the Dev Agent Record** (`[[feedback_closure_language_precision]]`):
AR-19 literally reads "push (1 + up to 3 backoff-spaced retries) → WA → SMS", i.e. retries are *per rung*
before advancing. This design retries the *whole ladder*. Two consequences, both examined and accepted:
(a) a genuinely dead push reaches SMS **faster** (better for a time-critical cycle-open); (b) a retry pass
cannot duplicate a paid send, because any rung that had succeeded would have stopped the ladder — so a
re-run only re-attempts rungs that already failed. What is **lost** is the "give push three more chances
before spending money on WA" bias. If that bias matters, the durable per-rung adapter (a job carrying
`{ channel, attempt }` and re-enqueuing itself with `startAfter`) is the refinement — record it as a
deferred item in `deferred-work.md`, do **not** build it silently into v1.

**D8 — Deep-link landing is out of scope, and the demo still works.**
`deepLinkTargetForAlert` maps `alert_published` → `announcements/:alert_id`
(`deep-link.ts:86-89`), and `apps/mobile` has no announcements route or deep-link handler yet (5.2 explicitly
deferred the landing). **Do not** change the pure contracts mapping to point cycle-open at `contributions/` —
that arm is shared with `niyamavali_amended` and changing it would silently re-target a broadcast. A push with
an unhandled deep link still opens the app to the home tab, where the `<ActiveContributionCard>` is the
topmost element — so Story 8.12's B21 beat ("push lands → opens app → My Pool card") holds. Record the
deep-link handler as a forward commitment owed to 8.12.

### Anti-patterns — do NOT do these

- ❌ Adding a cascade path to `dispatch`, or an audit write to `cascade`. They are separate primitives by
  design; the composition is yours to build **outside** both (AI-5-2 §2).
- ❌ Widening the degraded-mode SMS bridge past `alert_published`. It is the narrow AR-20 cycle-open carve-out
  to RA-29's no-bulk-SMS rule (`degraded-mode.ts:17-24`).
- ❌ Suppressing push under cost-optimization. Push is free + universal and is never in
  `COST_OPTIMIZED_CHANNELS` (`cost-optimization.ts:25-27`, `:54`).
- ❌ Adding a per-Pariwar cost-optimization toggle column/migration/admin form. That persistence is FR-58C at
  Epic 10; the seam returns the fail-safe `false` today (`composition.ts` `resolveCostOptimizationToggle`).
- ❌ Formatting a date/number/locale string inside a renderer, or passing a raw ISO timestamp as
  member-facing copy. `deadline_display` exists precisely so the producer formats.
- ❌ Reading `alerts.current_state` as the source of truth for a *transition*. It is a projection; the event
  stream is truth (`schema/alerts.ts` header). Reading it as a *filter* for the sweep is fine.
- ❌ Writing a second "latest snapshot per pool" query. Reuse `listCycleBindingCandidates`
  (`contribution-binding.ts:327-328` — the guard against a drifted second derivation).
- ❌ Inventing a membership number or any new member-facing identifier
  (`[[project_membership_number_deferred_feature]]`).
- ❌ Asserting absolute `audit_log_entries` row counts in a live-DB test.

### Testing standards

- Vitest throughout. Jobs orchestration tests use fakes and must run **without** `DATABASE_URL` (the AI-7-1
  convention); live-DB specs go under `tests/integration/*.spec.ts` with `describe.skipIf(!hasDatabase)` and
  run against `twt-test-pg` on **:5433**.
- Never regenerate an applied migration; never reset via `DROP SCHEMA`; assert membership not counts
  (`[[project_live_db_test_gotchas]]`).
- Suite-level `{ timeout: 20000 }` for anything concurrency-shaped
  (`[[project_known_livedb_test_failures]]`).
- Gate `pnpm ci:local` is the merge gate; GitHub Actions remains suspended
  (`[[project_ci_actions_suspension_local_mirror]]`).

### Project Structure Notes

- **New:** `packages/contracts/src/alerts/contribution-loop-templates.ts`;
  `packages/domain/src/notifications/delivery.ts`; `apps/jobs/src/scheduler/contribution-notify.ts`;
  `apps/jobs/tests/contribution-notify.test.ts`;
  `apps/jobs/tests/integration/contribution-notify.spec.ts`.
- **Modified:** `packages/contracts/src/alerts/index.ts` + `README.md`; `packages/queue/src/index.ts`
  (`QUEUE_NAMES`); `apps/jobs/src/scheduler/cycle-open-alert.ts` (post-commit enqueue);
  `apps/jobs/src/boot.ts` (register the queues/crons); `apps/jobs/src/index.ts` (export the Epic-9 seam);
  `apps/jobs/package.json` (+`@twt/i18n`); `packages/i18n/locales/{hi,en}/contribution.json`;
  `packages/domain/src/pool/contribution-binding.ts` (export the roster read);
  `apps/api/src/modules/member-pool/handlers.ts` (consume the shared cycle-day helper);
  `apps/mobile/components/active-contribution/toneGradient.ts` (→ re-export);
  `scripts/microcopy/contribution.test.ts` (new planted violation).
- **Relocated (behavior-identical, re-exported from the old paths):** `apps/api/src/context.ts` field-class
  constants; `device-token-crypto.ts`; `auth/shared/mobile-index.ts`;
  `device-token.handlers.ts:resolvePushTargets`; `channel-config/composition.ts` target resolvers.
- **Untouched (verify with `git diff --stat`):** everything under `packages/channels/src/`.
- Architecture homes this at `apps/jobs/src/scheduler/` (`architecture.md:4320` — "SIE driver + alert state
  machine") and `apps/api/src/modules/alert/` + `channels/` (`:4522`). Story 8.1 already established the
  scheduler home; this story extends it rather than opening a new one.

### References

- `_bmad-output/planning-artifacts/epics.md:2997-3009` — Story 8.8 ACs; `:2839-2857` — Epic 8 preamble
  (FR-23 seam ownership split, demoable closure); `:2877-2894` — Story 8.2 tone gradient; `:2921-2946` —
  Story 8.4 yellow invariant; `:3011-3023` — Story 8.9 (owns close-of-cycle timing).
- `_bmad-output/planning-artifacts/architecture.md:1893-1899` — push triggers (alert published → assigned
  members; contribution confirmed → contributor); `:1913-1948` — §3.4 channel-provider abstraction;
  `:4322` — `apps/jobs/src/scheduler/` home; `:4522` — FR-21..26 → `modules/alert/` + `channels/`.
- `_bmad-output/implementation-artifacts/8-1-alert-state-machine-cycle-open-trigger.md` — D4 enqueue+sweep,
  D6 (lifecycle event ≠ notification payload), AC4 `time_critical`.
- `_bmad-output/implementation-artifacts/ai-5-2-live-dispatch-integration-test.md` — §2 (dispatch vs cascade
  do not compose today), §3 (reject doubles), §5 (live-DB harness + HMAC-via-production-helper rule).
- `_bmad-output/implementation-artifacts/epic-5-retro-2026-07-08.md` — H-7 (nine stories of primitives with
  no live caller).
- Memory: `[[project_channels_no_live_dispatch_yet]]`, `[[project_alert_primitive_substrate]]`,
  `[[project_yogdaan_status_derivation_convention]]`, `[[project_contracts_domain_bundle_boundary]]`,
  `[[feedback_gate_scope_semantic_coverage]]`, `[[project_access_wrapper_gate_pending_scope]]`,
  `[[project_live_db_test_gotchas]]`, `[[project_known_livedb_test_failures]]`,
  `[[project_ci_local_concurrency_oversubscription]]`, `[[project_ci_actions_suspension_local_mirror]]`,
  `[[project_friction_budget_baseline_ratchet]]`, `[[project_domain_limit_clamp_and_savepoint_retry]]`,
  `[[feedback_record_unattested_no_backfill]]`, `[[feedback_closure_language_precision]]`,
  `[[project_sprint_status_ledger]]`.

## Ratified decisions — BigDev, 2026-07-23

All four scoping decisions are **RATIFIED**. The intent block is frozen; build to these.

1. ✅ **Scope — ONE story.** No 8.8a/8.8b split. The Task-1 relocation has no independent demoable value, and
   splitting it would leave a live fan-out with no caller — the exact debt shape Epic 5 accumulated. The
   review surface is large by design; the story ships whole.
2. ✅ **Reminder suppression — suppress BOTH green and yellow, with distinct reasons.** `already_confirmed`
   (a `contribution.confirmed` exists) and `already_attested` (a `contribution.utr-attested` exists) are
   recorded as **separate** machine-readable reasons and must never be conflated in analytics or any read
   model. Suppressing a nudge is a courtesy decision about interruption; it is **not** a promotion of yellow
   to green, and nothing about it may touch `progress.confirmedCount`, the confirmed contributor list, or any
   "raised so far" figure (D3 above; `epics.md:2935-2941`).
3. ✅ **Per-member send strategy — `runChannelCascade`, stop at first `sent`.** Wired per D9: the cascade
   owns the ladder in-process with `backoffMs: []` (no worker ever sleeps a backoff); each rung is a single
   `dispatch` call with a single-channel `DeliveryResolver`, so eligibility / provider selection / suppression
   / honest outcome mapping / both audit families remain `dispatch`'s job and nothing is re-implemented;
   Telegram fires independently of the ladder; retry-with-backoff is pg-boss's. **The AR-19 reconciliation in
   D9 (whole-ladder retry vs per-rung retry) must be recorded in the Dev Agent Record and the per-rung durable
   adapter logged in `deferred-work.md` — not built silently into v1.**
4. ✅ **Tone-review sign-off — never block, never backfill.** If a non-author reviewer is not available in
   this window, implementation proceeds and the sign-off is recorded **un-attested** in the Dev Agent Record
   with the reason, and carried as an open risk. Do **not** hold the story for it, and do **not** reconstruct
   or self-certify approval afterwards (`[[feedback_record_unattested_no_backfill]]`). Give the
   re-commitment a gate: name what would close it and where it is tracked.

### Consequences of the ratification, already folded into the ACs/tasks above

- AC6 + Task 4 now specify the cascade-per-rung-over-`dispatch` composition, the independent Telegram mirror,
  the multi-device push resolution, and the push-token invalidation reuse.
- **New D9** records the in-process-ladder / durable-backoff split and the AR-19 deviation to disclose.
- Task 8 gains the **Decision-3 teeth**: the load-bearing "push accepts ⇒ WA and SMS are never sent"
  assertion, the stop-after-SMS trail property, `skipped_no_target` advancing without burning a retry, the
  exhausted-ladder throw + no-resend-on-retry property, and Telegram independence.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story

### Implementation Plan

**Task 0 recon complete.** Every frozen surface read in full. Citation drift found + corrected below
(Debug Log). The build order is: domain relocation → contracts templates → i18n copy → queue names →
the fan-out composition → the three triggers → tests → governance.

**The relocation is WIDER than Task 1's literal list — recorded, not smuggled.** AC1 requires the
cycle-open payload to carry *"pool letter code + curated pool name + deceased-family first-name +
last-initial + fixed amount"*. That identity resolution lives in `apps/api/src/modules/member-pool/
pool-identity.ts` and depends on `decryptKycField` (apps/api `kyc/kyc-crypto.ts`) +
`splitFirstNameLastInitial` (apps/api `member-pool/name.ts`) — both unreachable from `apps/jobs` for the
SAME reason Task 1 names (apps/api already depends on `@twt/jobs`, so the reverse edge is a turbo
cycle). So the relocation set is Task 1's list PLUS the KYC field-class + crypto + the name split + the
pool-identity core. Every one is a pure move with an `apps/api` re-export, so no apps/api call site
changes. The alternative — a by-value duplicate of a Tier-1 KYC decrypt in `apps/jobs` — is exactly the
drift risk D4 rejects.

**Composition shape (`fanOutAlert`, D9 / ratified Decision 3).** Per member: (1)
`evaluateDegradedModeBridge` — `bridged: true` ⇒ force SMS only, skip the ladder AND cost-opt (AR-20);
(2) else `evaluateCostOptimization` ⇒ omit the suppressed paid channels' targets; (3)
`runChannelCascade(send, { backoffMs: [], sleep })` where `send(channel)` is ONE `dispatch` call with a
single-channel `DeliveryResolver`; (4) Telegram fired outside the ladder under
`isCategoryEligible`; (5) trail recorded NON-PII. Ladder exhausted ⇒ throw ⇒ pg-boss retries.

**Batching (D6).** `CONTRIBUTION_NOTIFY_CYCLE_OPEN` parent pages the cycle's pools (via the promoted
`listCycleBindingCandidates`) → one `CONTRIBUTION_NOTIFY_POOL_BATCH` child per pool → the child chunks
its roster. The deadline sweep enqueues the SAME child queue with `kind: 'deadline_reminder'` + the
cycle-day, so there is ONE child worker and ONE fan-out definition, not two.

### Debug Log References

**Task 0 — citation verification against the live tree at `ba175f1`.** Every file:line cite in the story
was checked. All resolved as written except one, corrected here rather than left to mislead a reviewer:

- **Task 4 step 3 says to map `outcome.attempts[0]` to a `ChannelSendOutcome`. That is wrong and would
  have been a silent, load-bearing bug.** `dispatch` ALWAYS walks the full `CANONICAL_CHANNEL_LADDER`
  plus the Telegram side-channel (`dispatch.ts:249-252`), so `attempts[0]` is the **`push`** entry on
  every call — including the call that asked for the `sms` rung, where push comes back
  `skipped_no_target`. Reading `attempts[0]` would have reported every non-push rung as
  `skipped_no_target`, so the cascade would have "advanced past" SMS without noticing it had actually
  delivered. The implementation reads `attempts.find(a => a.channel === channel)` and treats a missing
  entry as `error` (never as success). See `outcomeForChannel` in `contribution-notify.ts`.

Other checks that came back clean: `cascade.ts:42` (`DEFAULT_SMS_BACKOFF_MS`), `cascade.ts:47-52`
(non-retryable → cascade without burning a retry), `cost-optimization.ts:10-11` (the omit-the-targets
mechanism) and `:25-27,:54` (push never in `COST_OPTIMIZED_CHANNELS`), `degraded-mode.ts:17-24`
(bridged channels = exactly `['sms']`), `dispatch.ts:44-52` (Telegram eligibility),
`device-token.handlers.ts:142-147` (the multi-target note naming this story's problem),
`toneGradient.ts:50-54`, `handlers.ts:80-93`, `contribution-binding.ts:256-302`,
`alerts/alert.ts:109-127`, `deep-link.ts:93-98`, `push-errors.ts:80`, `i18n/locale.ts:36`,
`cycle-spawn.ts:169`.

**Live-DB failure found and fixed during the gate run.** The first `pnpm ci:local` with
`DATABASE_URL` failed 2/178 jobs tests: the new live spec seeded `contribution.utr-attested` rows with a
hardcoded `tr`, which collides on the SECOND run against the same database — `events_log` carries a
UNIQUE index on `payload->>'tr'` and these rows own-commit. This is
`[[project_live_db_test_gotchas]]`'s accumulate-across-runs lesson applied to a unique KEY rather than a
row count. Fixed with a per-run `randomUUID()`-derived `tr`; re-ran green. **No other failures, and no
instances of the known concurrency-oversubscription flake class in either run.**

### Completion Notes List

#### What landed

Story 8.8 ends Epic 5's nine-story deferral: `apps/jobs/src/scheduler/contribution-notify.ts` is the
stack's **first live `dispatch()` call site**. Nothing under `packages/channels/src/**` changed —
verified with `git diff --stat -- packages/channels/src` (empty) and by `channels-determinism` staying
green untouched.

The three triggers, the composition, the copy contract and the relocation are all in place; all 28
`ci:local` jobs are green with `DATABASE_URL` on :5433.

#### D2 — the tone-band reconciliation (a RECONCILIATION, not a silent deviation)

`epics.md:3006` lists "Day 5 / Day 10 / Day 13 / Day 14 with copy matching the UX-DR25 tone gradient
(calm / factual / gently urgent / last day)". Read **positionally** that pairs day 10 with *factual* —
but Story 8.2's **shipped** gradient puts day 10 in the *calm* band. Positional reading would push a
member a "days remaining" nudge on day 10 and then show them "Your pool is open — contribute when you
can" when they open the app.

**Implemented as ratified:** the band is DERIVED from `selectToneGradientKey(cycleDay)` → **calm / calm
/ factual / closing**. The copy still differs per send day (four distinct templates), so the epic's
"four sends, four messages" intent holds. The testable form is the coherence invariant, asserted per
send day in `packages/contracts/tests/contribution-loop-templates.test.ts`, plus a guard test that
pins the mapping so a future "correction" back to the positional reading fails.

#### D9 — the AR-19 deviation, stated not hidden

AR-19 reads "push (1 + up to 3 backoff-spaced retries) → WA → SMS", i.e. retries are **per rung**. This
design retries the **whole ladder**: `runChannelCascade` runs with `backoffMs: []` and retry-with-backoff
is pg-boss's. Rationale, consequences, and what is lost are recorded in full in `deferred-work.md`
(the per-rung durable adapter is logged there as the refinement, deliberately not built into v1). The
"no worker ever sleeps a backoff" property is asserted directly — the injected sleep is a recorder and
the test requires zero recorded waits.

#### One genuine design decision the story left open: the degraded-mode bridge input

`evaluateDegradedModeBridge` needs `degradedModeActive`. Invariant 6 forbids re-reading degraded-mode
state at notify time. These reconcile exactly: Story 8.1's `openCycleAlert` sets `time_critical: true`
on the `alert.published` payload **iff** a `cycle_open_sms_bridge` declaration was active at the
cycle-freeze `committed_at` (`project.ts:447-449`), so for a cycle-open alert `time_critical` **IS** the
resolved bridge signal. The fan-out therefore derives the bridge input from the payload rather than
issuing a second DB read — which also removes a `now()`-read that would have broken replay determinism
and could have bridged/un-bridged a cycle mid-fan-out. Documented at `degradedModeActiveFor`.

#### The relocation was WIDER than Task 1's literal list — recorded, not smuggled

AC1 requires the cycle-open payload to carry the pool letter code + curated pool name + deceased-family
first-name + last-initial + fixed amount. That join lives in `apps/api` and depends on `decryptKycField`
and `splitFirstNameLastInitial`, both unreachable from `apps/jobs` for the same reason Task 1 names. So
the relocation set is Task 1's list **plus** the KYC field-class + crypto helpers, the name split, and
the pool-identity core. Every one is a pure move with an `apps/api` re-export; **no apps/api call site
changed**. The rejected alternative — a by-value duplicate of a Tier-1 KYC decrypt context in
`apps/jobs` — is exactly the drift risk D4 rejects.

`ADMIN_GLOBAL_NAMESPACE` also moved into `packages/domain/src/encryption/field-classes.ts` alongside
these member-PII constants — flagged during code review (2026-07-24) as having no actual `apps/jobs`
consumer (it stays admin-identity-only, RBAC/auth code). Kept rather than reverted: it is the sibling
sentinel to `MEMBER_IDENTITY_NAMESPACE` in the same identity-namespace family, and colocating all of a
family's sentinels beats splitting one constant across two packages by an artificial "does apps/jobs
literally read it today" line. Recorded here so the choice is explicit, not merely implied by the code.

**Test churn the relocation caused, and how it was handled honestly.** Six apps/api suites mocked the
`@twt/domain` BARREL per-namespace; the relocated code reaches its collaborators through domain-INTERNAL
paths those mocks cannot intercept. Rather than weaken assertions:
- the three delivery-resolver behavioural suites (WA dual gate / Telegram dual gate / SMS no-opt-in-gate)
  **moved with the implementation** to `packages/domain/tests/notifications/delivery-targets.test.ts`,
  assertions unchanged, plus new multi-device + per-row-decrypt-isolation coverage for `resolvePushTargets`;
- their apps/api files remain as **adapter** tests (same path, forwards to the one domain implementation);
- the three handler suites keep every original expectation via a shared, documented test double
  (`apps/api/tests/unit/_pool-identity-fake.ts`) that re-composes the join over the SAME mocked
  collaborators, while the real join gets its own suite at
  `packages/domain/tests/notifications/pool-identity.test.ts`.

_(Corrected during code review, 2026-07-24 — the count originally read "Seven... four handler suites";_
_the actual diff shows six suites: three adapter + three handler, confirmed via the Acceptance Auditor's_
_cross-check of `_pool-identity-fake.ts` consumers.)_

#### Deviations from the story's literal task text (all deliberate)

1. **Two files in `apps/jobs/src/scheduler/`, not one.** `contribution-notify.ts` is the fan-out
   composition (the ONE definition of "how a member is reached"); `contribution-notify-triggers.ts` is
   the pg-boss half (queues, batching saga, cadence sweep, copy assembly, idempotency). Splitting keeps
   the first-live-`dispatch` composition independently readable and independently testable.
2. **A FIFTH queue name.** Task 5 requires "a bounded recovery sweep for a dropped enqueue", which needs
   its own cron cadence (hourly — a cycle-open push is time-sensitive; the deadline sweep is daily). Added
   `CONTRIBUTION_NOTIFY_CYCLE_OPEN_SWEEP`. Its probe is the idempotency key itself
   (`LIKE 'contribution.notify:<alert_id>:%:cycle_open'` — a prefix match on the table's PRIMARY KEY),
   so it neither re-walks every member hourly nor invents a second source of truth for something the
   keyed store already records.
3. **`apps/jobs/tests/contribution-notify-live.test.ts`, not `tests/integration/*.spec.ts`.** The jobs
   package's vitest config includes only `tests/**/*.test.ts`, so a `.spec.ts` under `tests/integration/`
   would **never run**. Followed the jobs convention (`assignable-roster-live.test.ts`):
   `describe.skipIf(!hasDatabase)` in a `*-live.test.ts`. A spec that never executes is worse than one
   that does.
4. **`ATTESTED_EVENT_TYPE` is imported from `contribution/write.ts`, not re-spelled with a lockstep
   test.** `write.ts` does not import `read.ts`, so the edge is cycle-free and one authority beats a
   guarded duplicate.

#### Governance dispositions (Task 9)

- **`pnpm ci:local` with `DATABASE_URL` on :5433 — ALL 28 JOBS GREEN**, including `integration-tests`.
  No flakes from the known concurrency-oversubscription class in either run.
- **Frozen channel surfaces:** `git diff --stat -- packages/channels/src` is EMPTY. `channels-determinism`
  green untouched (the AC5 tripwire — if it had moved, a frozen surface had been modified).
- **Friction budget: no row added, no baseline ratcheted, nothing to affirm.** The gate reports
  "no member-facing surface touched — declaration facet dormant". The metric facet shows
  `member-public-web.page_weight_bytes: 5219 ≤ ceiling 512000 (Δ +1277 vs baseline 3942)` — that delta is
  **pre-existing** (the committed baseline comment attributes it to `/terms`), not attributable to this
  story, and per `[[project_friction_budget_baseline_ratchet]]` a measurement above the best-ever
  baseline but under the ceiling leaves the baseline PUT. Notifications are not a page-weight surface.
- **PII-scrape matrix: no entry** — `public-vs-private-matrix.yaml` governs PUBLIC surfaces and reserves
  population to Epic 11a. The PII shape is recorded here instead (next section).
- **Microcopy gate: NO scope extension** — the `contribution` namespace was already in `copy_globs`, so
  extending it would be the vacuous extension `[[feedback_gate_scope_semantic_coverage]]` warns against.
  What WAS added is **teeth over the new copy specifically**: five planted-violation assertions against
  real `notify.*` keys (scarcity on the day-14 subject, panic on the cycle-open title, a pool-reality
  comparison on the day-13 subject, the clean counterpart, and a Devanagari operational digit in the
  Hindi display). A notification is the highest-pressure surface in the product — it arrives uninvited —
  so the tone rules matter more here than on the card.
- **i18n:** `pnpm i18n:check` green (Hindi parity for all 22 new keys); Hindi-primary at send time
  (`DEFAULT_LOCALE = 'hi'`); Latin operational numerals throughout (amendment-A2), asserted in the copy
  tests.

#### PII shape of this story's new surfaces (in lieu of a PII-scrape entry)

- **In the alert payload:** ids + producer-formatted display strings + the deceased family's
  `firstName + lastInitial` only (the same shield 8.2 applies). Never a member mobile, address, device
  token, VPA, UTR, or full name. Asserted: the full surname does not survive the join
  (`pool-identity.test.ts`), and the built copy contains only first-name + initial.
- **Addresses** (device tokens, mobiles, chat ids) are resolved at the composition layer, never logged,
  never on a job result, never in an audit locator, and never in the idempotency store — asserted three
  ways (fan-out result, in-memory audit lines, and the persisted `audit_log_entries` rows in the live suite).
- **Audit hashes:** the per-channel line carries the keyed HMAC of the rendered message via the real
  `createRenderedMessageHash`; the live suite proves it equals the production helper's output AND is
  **not** the unkeyed sha256 of the same rendered message (the actual AI-4-3(c) property, not a
  "looks like 64 hex" check).

#### ⚠ UN-ATTESTED: the Story 2.2 tone-review sign-off (AC4)

**The non-author human tone review of the eleven new `notify.*` strings has NOT happened.** No non-author
reviewer was available in this implementation window. Per ratified Decision 4 this does **not** block the
story, and it is recorded openly rather than self-certified or reconstructed later
(`[[feedback_record_unattested_no_backfill]]`). The author reviewed the copy against
`docs/tone-guide.md` + `docs/tone-review-checklist.md` and the automated gates
(`microcopy:check` + the new planted-violation teeth + `i18n:check`) are green — **but an author's own
read is not the sign-off the process asks for, and the automated gates catch phrasings, not register.**

**The closure gate (the re-commitment is gated, not left to decay):** the sign-off is discharged when a
non-author reviewer records a pass over the eleven `notify.*` keys in
`packages/i18n/locales/{hi,en}/contribution.json`. Tracked as an open risk in this record and carried
into the Epic 8 retrospective. The runtime `evaluateToneReviewGate` primitive was deliberately NOT wired
here — it gates admin-authored *persisted* copy, not code-authored templates.

#### ⚠ OPEN RISK: the §5.12 time-to-fan-out NFR is un-measured

`architecture.md:3479` commits "≥95% of cycle-open pushes delivered within 5 minutes of cycle freeze;
graceful degradation extends window under quota strain". This story's batched parent→child→chunk fan-out
is **exactly** what that budget governs, and this story adds **no timing instrumentation and no
enforcement** for it. That is a deliberate scope boundary, recorded here as an open risk rather than
left as a silent gap: today there is no way to tell whether the shipped fan-out meets the committed SLA.
The measured-validation framework (AI-6-2) is the natural harness. Named so it cannot pass unnoticed.

#### Forward commitments owed (all four also logged in `deferred-work.md`)

1. **The per-rung durable retry adapter** (the AR-19 D9 refinement).
2. **REAL per-Pariwar provider wiring for `apps/jobs`.** `resolveProviders` is an injectable seam and
   `boot.ts` leaves it unwired, so `dispatch` resolves the shipped **log-only fixtures**. That IS Epic 5's
   committed opt-in-real posture, but it means a deployed worker today composes and audits the full
   ladder without delivering bytes. The real seams live in `apps/api` and import `@twt/channels` types, so
   they cannot follow the delivery resolvers into `@twt/domain` (channels→domain already exists — that
   edge would be a package cycle). The two honest options (home them in `@twt/channels`, a frozen-surface
   change; or accept a second by-value composition in `apps/jobs`) were **not** chosen unilaterally inside
   this story. Story 8.12's on-device demo is the likely forcing function.
3. **The mobile deep-link handler** (D8) — owed to Story 8.12.
4. **Epic 5 renderer localization.** `render.ts` wraps the `deadline_reminder` producer copy in
   hardcoded English scaffolding (`Deadline reminder` + `— due `), so a Hindi reminder renders as Hindi
   content inside an English frame. AC5 forbids touching `packages/channels/src/**`, and both strings are
   static template text the renderer owns, so this is a frozen-surface limitation rather than a defect
   here. The `alert_published` (cycle-open) arm is unaffected — its `{title, body}` are 100%
   producer-supplied.

#### Memory note that is now STALE

`[[project_channels_no_live_dispatch_yet]]` asserts there is no live `dispatch()` caller and names Story
8.8 as the designated first. **That is no longer true as of this story** — the note must be rewritten to
record that the first live caller is `apps/jobs/src/scheduler/contribution-notify.ts`, that the frozen
`ChannelProvider`/`DeliveryResolver`/`dispatch`/`cascade`/`CANONICAL_CHANNEL_LADDER` surfaces remain
untouched, and that the delivery resolvers now live in `@twt/domain`'s `notifications` namespace.

### File List

**New — `@twt/contracts`**
- `packages/contracts/src/alerts/contribution-loop-templates.ts`
- `packages/contracts/tests/contribution-loop-templates.test.ts`

**New — `@twt/domain`**
- `packages/domain/src/encryption/field-classes.ts`
- `packages/domain/src/encryption/member-fields.ts`
- `packages/domain/src/kyc/name.ts`
- `packages/domain/src/notifications/index.ts`
- `packages/domain/src/notifications/delivery.ts`
- `packages/domain/src/notifications/pool-identity.ts`
- `packages/domain/src/notifications/push-invalidation.ts`
- `packages/domain/tests/notifications/delivery-targets.test.ts`
- `packages/domain/tests/notifications/pool-identity.test.ts`

**New — `apps/jobs`**
- `apps/jobs/src/scheduler/contribution-notify.ts` (the live `dispatch()` fan-out)
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts` (queues / workers / crons / copy)
- `apps/jobs/tests/contribution-notify.test.ts`
- `apps/jobs/tests/contribution-notify-triggers.test.ts`
- `apps/jobs/tests/contribution-notify-live.test.ts`

**New — `apps/api` (test-only)**
- `apps/api/tests/unit/_pool-identity-fake.ts`

**Modified**
- `packages/contracts/src/alerts/index.ts`, `packages/contracts/src/alerts/README.md`
- `packages/domain/src/index.ts`, `packages/domain/src/encryption/index.ts`, `packages/domain/src/kyc/index.ts`
- `packages/domain/src/contribution/read.ts` (`listActedMemberIdsForPool` — the suppression read)
- `packages/domain/src/pool/contribution-binding.ts` (`listCycleBindingCandidates` promoted to an export)
- `packages/queue/src/index.ts` (5 `QUEUE_NAMES` entries)
- `packages/i18n/locales/hi/contribution.json`, `packages/i18n/locales/en/contribution.json` (11 `notify.*` keys each)
- `apps/jobs/package.json` (+`@twt/i18n`), `apps/jobs/src/boot.ts`, `apps/jobs/src/index.ts`
- `apps/jobs/src/scheduler/cycle-open-alert.ts` (post-commit notify enqueue seam)
- `apps/jobs/tests/cycle-open-alert.test.ts`
- `apps/mobile/components/active-contribution/toneGradient.ts` (→ thin re-export)
- `scripts/microcopy/contribution.test.ts` (planted violations over `notify.*`)
- `_bmad-output/implementation-artifacts/deferred-work.md`

**Relocated — behavior-identical, re-exported from the original paths (no apps/api call site changed)**
- `apps/api/src/context.ts` (5 field-class constants)
- `apps/api/src/modules/device-token/device-token-crypto.ts`
- `apps/api/src/modules/auth/shared/mobile-index.ts`
- `apps/api/src/modules/kyc/kyc-crypto.ts`
- `apps/api/src/modules/member-pool/name.ts`
- `apps/api/src/modules/member-pool/pool-identity.ts`
- `apps/api/src/modules/device-token/device-token.handlers.ts` (`resolvePushTargets`)
- `apps/api/src/modules/device-token/push-invalidation.ts` (classification kept, write delegated)
- `apps/api/src/modules/channel-config/composition.ts` (WA / SMS / Telegram target resolvers)
- `apps/api/src/modules/member-pool/handlers.ts` (`computeDaysRemaining`)
- `apps/api/tests/unit/{wa-target,telegram-target,sms-composition,active-contribution-card,contribution-history,contribution-note}.test.ts`

**Untouched (verified):** everything under `packages/channels/src/`.

### Change Log

- 2026-07-23 — Created Story 8.8 (bmad-create-story). Status: ready-for-dev.
- 2026-07-23 — BigDev **ratified all four** open decisions (one story · suppress green+yellow with distinct
  reasons · `runChannelCascade` per-member · un-attested-not-blocking tone review). Folded into the spec:
  AC6 rewritten around the cascade-per-rung-over-`dispatch` composition + independent Telegram mirror;
  Task 4 rewritten with the five-step `fanOutAlert` shape, multi-device push resolution, push-token
  invalidation reuse, and the D9 durable-retry wiring; **new D9** (in-process ladder with `backoffMs: []`,
  pg-boss owns the backoff, AR-19 whole-ladder-vs-per-rung deviation disclosed + deferred adapter);
  Task 8 gains the Decision-3 teeth (push-accepts ⇒ zero paid sends, stop-after-SMS, `skipped_no_target`
  advances without burning a retry, exhausted-ladder throw + no-resend-on-retry, Telegram independence).
  Intent block frozen. NEXT: `dev-story 8-8`.
- 2026-07-23 — Validated (bmad-create-story validate): three parallel verification passes (code citations vs
  live tree at `ba175f1`, epics.md/architecture.md cross-check, Story 8.7 continuity + git/sprint-status
  sanity) confirmed the story is structurally sound — no invented scope, no dropped requirements, both
  disclosed reconciliations (D2 tone-band derivation, D9 AR-19 retry deviation) verified genuine and honestly
  characterized. Fixed 6 drifted file:line citations (`i18n/locale.ts:36` not `resolver.ts:56`;
  `contribution-binding.ts:327-328` not `:340-345`; `cascade.ts:42` not `:39`; `cost-optimization.ts:43` not
  `:44`; `cycle-open-alert.ts:118` not `:115`; `architecture.md:4320` not `:4322`) and clarified
  `isUnrecoverableTokenRejection`'s true definition site (`packages/channels/src/providers/push-errors.ts:80`,
  re-imported into `push-invalidation.ts`). Added the uncited §5.12 time-to-fan-out NFR
  (architecture.md:3479, ≥95%/5min) as an explicit open-risk disposition in Task 9. Status remains
  ready-for-dev.
- 2026-07-23 — **IMPLEMENTED (bmad-dev-story). Epic 5's nine-story deferral ends: the stack now has a
  live `dispatch()` call site.** All 9 tasks + 53 subtasks complete; `pnpm ci:local` with `DATABASE_URL`
  on :5433 — **all 28 jobs green**, `packages/channels/src/` byte-identical.
  · **Task 1** relocated the four delivery resolvers + the member PII field crypto + the KYC name split +
  the pool-identity join into `@twt/domain` (`notifications` + `encryption` + `kyc` namespaces); every
  original apps/api module re-exports, so no apps/api call site changed. The relocation was WIDER than
  Task 1's literal list because AC1's payload needs the deceased-family name — recorded, not smuggled.
  · **Task 2** landed `contracts/alerts/contribution-loop-templates.ts` (cycle-day arithmetic + Story
  8.2's tone gradient moved from apps/mobile, which now re-exports and whose tests pass through unchanged,
  + the four-send-day registry + the pure payload builders). · **Task 3** added 11 `notify.*` keys per
  locale with NO microcopy scope extension but five new planted-violation teeth over the new keys.
  · **Tasks 4–7** built `fanOutAlert` (bridge → cost-opt → cascade-per-rung-over-`dispatch`, independent
  Telegram mirror, multi-device push, token-invalidation reuse), the parent→child batching saga, the
  hourly recovery sweep, the daily IST cadence sweep with distinct suppression reasons, and the Epic-9
  enqueue seam (no cron, no sweep). · **Task 8** added 84 tests across five suites including the
  Decision-3 teeth (push accepts ⇒ ZERO paid-provider `send` calls) and a live-DB audit-family suite
  that computes its expected HMAC through the production helper.
  **Disclosed in the Dev Agent Record:** the D2 tone-band reconciliation; the D9 AR-19 whole-ladder-vs-
  per-rung deviation; a story-text bug corrected during Task 0 (`attempts[0]` is always `push`, which
  would have made every non-push rung read as `skipped_no_target`); four deliberate deviations from the
  literal task text (two scheduler files, a fifth queue name for the recovery cron, `*-live.test.ts`
  over an un-runnable `tests/integration/*.spec.ts`, and importing the attested event type rather than
  re-spelling it); the tone-review sign-off recorded **UN-ATTESTED with a named closure gate**; the
  §5.12 five-minute fan-out NFR recorded as an **open risk** (no instrumentation in scope); and four
  forward commitments logged in `deferred-work.md` — chief among them that `resolveProviders` is left
  unwired, so a deployed worker composes and audits the full ladder through the shipped **log-only
  fixtures** rather than delivering real bytes. `[[project_channels_no_live_dispatch_yet]]` is now STALE.
  Status: ready-for-dev → in-progress → review.
