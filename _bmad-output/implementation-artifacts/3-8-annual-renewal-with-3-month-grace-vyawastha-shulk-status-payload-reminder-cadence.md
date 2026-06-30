---
baseline_commit: e8edc7af117cfb44891a91594431543ab52c4442
---
# Story 3.8: Annual Renewal with 3-Month Grace + `vyawastha_shulk_status` Payload + Reminder Cadence

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member approaching the annual Vyawastha Shulk renewal date,
I want a reminder cadence (+30 / +60 / +75 / +89 days from renewal-due-date) and a renewal flow with a 3-month grace period — where during grace `is_active` is preserved and restoration after grace does NOT re-apply lock-in,
so that I'm not penalized for a brief lapse and my contribution discipline (R7) is preserved across the renewal boundary.

`[SURFACE]` story. Epic 3 (Member Lifecycle). Depends on: Story 3.1 (lifecycle state machine — the renewal/grace transitions are **already wired in the reducer**; see Dev Notes "What already exists"), Story 3.6b (the signup UPI Intent + receipt + `vyawastha_shulk_paid` emission this story mirrors for renewal), Story 1.12 (the pg-boss cron + worker substrate the reminder/grace scheduler runs on), Story 2.4/2.x niyamavali registry (lock-in policy resolution — unchanged here). **Forward-couples to** Epic 4 (Story 4-6 `FR-12A` Validity Service — the consumer of the `vyawastha_shulk_status` payload this story produces) and Epic 5 (Story 5-1 central dispatcher — the consumer of the reminder-nudge triggers this story emits). **Both Epic 4 and Epic 5 are `backlog` (not built).** This story is the *producer* on both seams; delivery/consumption is forward-compat (see Dev Notes "Forward-compat boundaries").

## Acceptance Criteria

From epics.md §"Story 3.8" (lines 1757-1777) — verbatim BDD, numbered for traceability. Source FRs: FR-1A (PRD §FR-1A, lines 240-256); FR-23 nudge seam; architectural transition table (architecture.md lines 1245-1262); FR-12A freshness invariant (architecture.md lines 1045-1050, "row 11" 60s TTL).

**AC1 — Reminder cadence fires at +30 / +60 / +75 / +89 past `valid_through` via the Epic 5 seam**
**Given** FR-1A + Story 3.1 lifecycle states (`active`, `active-in-grace`, `lapsed-unpaid`)
**When** the renewal cadence + flow are implemented
**Then** reminders fire at **+30, +60, +75, +89 days past `valid_through`** via the Epic 5 channel dispatcher (subscribed via `packages/contracts/` per FR-23 nudge seam — **Epic 5 owns delivery, Epic 3 owns the trigger schedule**).

**AC2 — Renewal flow mirrors signup payment + emits the renewal event**
**And** the renewal flow is **identical to signup payment (Story 3.6 UPI Intent)** but with `tn=renewal-shulk-{member_id}-{year}` and emits the `vyawastha_shulk.renewed` event. *(See Dev Notes "Decision 1: the renewal event" — the architecture-committed event vocabulary uses `member.vyawastha_shulk_paid` as the renewal transition trigger; resolve the epic's `vyawastha_shulk.renewed` naming there before coding.)*

**AC3 — Grace state transitions; renewal during grace does NOT re-apply lock-in**
**And** state transitions: `active` → `active-in-grace` at **+1 day past `valid_through`**; `active-in-grace` → `lapsed-unpaid` at **+91 days past `valid_through`**; renewal during grace returns state to `active` **WITHOUT re-applying lock-in**.

**AC4 — Canonical `vyawastha_shulk_status` payload (the FR-12A surface), ≤60s fresh**
**Given** Epic 4 Validity Service (FR-12A) needs renewal status
**When** it queries the lifecycle service
**Then** the canonical `vyawastha_shulk_status` payload returns `{ paid_through, days_until_lapse, in_renewal_grace, grace_remaining_days }` — **this is the surface FR-12A consumes**; freshness invariant **≤ 60s** per architectural-freeze row 11.

**AC5 — Death-during-grace eligibility holds; death-during-lapsed does not (R10)**
**Given** death-during-grace scenarios (R10)
**When** a claim is evaluated against a member who died during `active-in-grace`
**Then** eligibility holds per FR-1A; the `vyawastha_shulk_status` payload **at time-of-death** is what Epic 4 evaluates; death during `lapsed-unpaid` does **not** qualify. *(Epic 4/6 claim evaluation is not built — for THIS story AC5 is satisfied by the `getMemberStateAt(t)` + as-of `vyawastha_shulk_status(t)` read being correct at any historical timestamp, so the future evaluator has a truthful as-of read. See Dev Notes "AC5 scope".)*

## Tasks / Subtasks

> **Read Dev Notes "What already exists" and "Decision 1/2/3" BEFORE starting.** The lifecycle *reducer* already encodes every renewal/grace transition — the new work is the **emitter** (a scheduler), the **renewal payment surface**, the **status read**, and the **reminder-trigger seam**. There is **no reducer change** and (Decision 1 permitting) **no new event type**.

- [x] **Task 1 — `vyawastha_shulk_status` read accessor (the FR-12A surface)** (AC4, AC5)
  - [x] Add `getVyawasthaShulkStatus(db, pariwarId, memberId, atTimestamp)` to `packages/domain/src/member/read.ts` (or a sibling `member/renewal-read.ts`). It composes two reads already present: `getMemberStateAt(db, memberId, atTimestamp)` (`read.ts:61`) for the state — `getMemberStateAt` is NOT tenant-scoped (stream_id = member_id is globally unique); and `getLatestReceipt(db, pariwarId, memberId)` (`payment/receipt-read.ts:47`) for `validThrough` — `getLatestReceipt` IS tenant-scoped (3 args: db, pariwarId, memberId; the "TENANT-scoped: defense-in-depth" note in receipt-read.ts is load-bearing). **The accessor must accept `pariwarId`** — the API handler has it from `requireMemberSession`'s decoded token. Domain reads `events_log`/receipts directly (no `@twt/events` import — same precedent as `getMemberStateAt`/`getLockInClock`; see `read.ts` header).
  - [x] Return shape (camelCase domain type → wire snake_case in the contract): `{ paidThrough: Date | null, daysUntilGraceEnds: number | null, inRenewalGrace: boolean, graceRemainingDays: number | null }`. **Name the internal field `daysUntilGraceEnds`, not `daysUntilLapse`** — that is what the value actually represents (days to the `valid_through + 91d` boundary, the instant grace ends and `lapsed-unpaid` begins). The **wire** field stays `days_until_lapse` (Task 2 — the FR-12A payload vocabulary is fixed by PRD line 252); map the rename at the contract boundary. **Define the arithmetic precisely (Decision 2):** `paidThrough = latestReceipt.validThrough` (= `paid_at + 365d`, already stamped on the receipt — `vyawastha-shulk/handlers.ts:138-140`). The **grace-end / lapse boundary** is `validThrough + 91 days` (PRD line 249: "Day +91 onwards → `lapsed_unpaid`"). `daysUntilGraceEnds = ceil((graceEndBoundary − atTimestamp)/1 day)`, clamped ≥0, `null` when never paid. `inRenewalGrace = (state === 'active-in-grace')`. `graceRemainingDays = inRenewalGrace ? ceil((graceEndBoundary − atTimestamp)/1 day) : null`. Use leap-safe `setDate`/`setFullYear` date math (NOT fixed-ms — mirror the 3.6b P9 `validThrough` fix, `handlers.ts:138`).
  - [x] Factor a **pure** `deriveVyawasthaShulkStatus({ state, validThrough }, atTimestamp)` seam (DB-free, unit-testable with fixtures — mirror `deriveLockInClock`, `read.ts:93`). Export from `packages/domain/src/member/index.ts`.
  - [x] Unit test (DB-free) in `packages/domain/tests/member/`: active pre-grace (validThrough future → not in grace, daysUntilLapse > 90); active-in-grace at +30/+60/+89 (graceRemainingDays counts down); lapsed-unpaid at +91 (daysUntilLapse 0); never-paid (all `null`/false). **As-of correctness (AC5):** assert the status at a historical `atTimestamp` reflects what was true then.
- [x] **Task 2 — Transport contract for the status payload** (AC4)
  - [x] Add the `VyawasthaShulkRenewalStatusResponse` to `packages/contracts/src/payments/vyawastha-shulk.ts` (or a sibling) — `.strict()`. Wire shape (snake_case to match the FR-12A payload spec verbatim — PRD line 252 / architecture line 1255): `{ paid_through: Iso8601Datetime | null, days_until_lapse: z.number().int().nullable(), in_renewal_grace: z.boolean(), grace_remaining_days: z.number().int().nullable() }`. Use `_common` `Iso8601Datetime`; contracts MUST NOT import `@twt/domain` (browser-bundle rule). Barrel-export.
  - [x] **Do NOT fold this into `VyawasthaShulkStatusResponse`** (`vyawastha-shulk.ts:102`) — that is the signup paid/lock-in view (`{ paid, validThrough, lockInEntered, outstanding }`). This is the renewal/validity surface FR-12A consumes; keep them distinct (the 3.7 "don't overload /status" precedent).
- [x] **Task 3 — API read endpoint for the status payload** (AC4)
  - [x] Add `GET /api/v1/member/vyawastha-shulk/renewal-status` (member-session-gated — `requireMemberSession` preHandler; token-bearer) to the `vyawastha-shulk` module (`routes.ts`/`handlers.ts`). Handler opens its own scope-tx, calls `getVyawasthaShulkStatus(tx, pariwarId, memberId, deps.clock())` — both `pariwarId` and `memberId` come from the decoded session token. Maps result to the wire contract. Session-gated → automatically covered by the Story 1.14 login-wall gate (do NOT allowlist).
  - [x] **Freshness ≤60s (AC4 / freeze row 11):** the read is computed live from events+receipt per request (no stale cache) → trivially within the 60s budget. If you add any caching later it must carry a freshness timestamp (architecture line 1072); for v1 do not cache.
  - [x] Integration test (`:5433` live DB): seed members at each lifecycle position (active pre-grace, active-in-grace, lapsed-unpaid, never-renewed) and assert the payload; assert 401 without a session. Seed via the `seedMember`/`projectMemberState` pattern (`apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts:34-74`) extended through `grace_entered`/`grace_expired`.
- [x] **Task 4 — Renewal payment surface (UPI Intent + confirm)** (AC2, AC3)
  - [x] Add renewal intent + confirm to the `vyawastha-shulk` module. **Recommended (Decision 3):** new sub-routes `POST /api/v1/member/vyawastha-shulk/renew/intent` + `/renew/confirm`, OR a `mode: 'signup' | 'renewal'` discriminator on the existing routes. Mirror the signup intent (`handlers.ts:71-103`): server-authoritative VPA + amount from config (R4 — client never names amount), `tr` idempotency nonce, but `tn=renewal-shulk-${memberIdStr}-${year}` (the renewal `tn` grammar per AC2; `year` from `deps.clock()`).
  - [x] **Renewal confirm differs from signup confirm:** (a) **NO lock-in gate** — the 5-condition gate (`lock-in-gate.ts`) is signup-only; a renewing member is already post-lock-in. (b) Validate the UTR + write a new receipt (`receipt-write.ts` `insertVyawasthaShulkReceipt`, server-stamped `validThrough = now + 365d`, `tr`-idempotent via `isReceiptTrDuplicate`). (c) Emit the renewal event in the SAME scope-tx via `projectMemberState(..., eventType, payload, actorId=memberId)` — see **Decision 1** for which event. The reducer (`state.ts:80-83`) transitions `active-in-grace`/`lapsed-unpaid` → `active` and is **identity from `active`** (early renewal before grace just extends `validThrough` — correct, no spurious transition). **This satisfies AC3's "no re-lock-in" by construction**: `vyawastha_shulk_paid` from a post-lock-in state never routes through `pending-fee → lock-in`.
  - [x] Integration test: renew from `active-in-grace` → state returns to `active`, new receipt extends `validThrough`, NO `lock_in_entered` emitted, NO `lock_in_days_at_join` change; renew from `lapsed-unpaid` → `active`; renew early from `active` → stays `active`, `validThrough` extended; idempotent re-confirm on same `tr`.
- [x] **Task 5 — The renewal-lifecycle scheduler (grace transitions + reminder triggers)** (AC1, AC3)
  - [x] **This is the new emitter.** No scheduler currently emits `grace_entered`/`grace_expired` (or `lock_in_expired`) — the reducer handles them but nothing fires them (see Dev Notes "What already exists — the emitter gap"). Build a pg-boss cron in `apps/jobs` (mirror `digilocker-cert-refresh.ts` + the `boot.ts` registration: `createQueue` → `work` → `schedule(cron, {}, { tz: 'Asia/Kolkata' })`). Add a `MEMBER_RENEWAL_LIFECYCLE` (or `member.renewal_tick`) entry to `QUEUE_NAMES` (`packages/queue/src/index.ts:41`). Daily cadence (operations policy; overridable via env like `VACUUM_CRON`). **IST tz — do not repeat the UTC-cron foot-gun** (`boot.ts` VACUUM_TZ note).
  - [x] **Indexed candidate scan — NOT a daily replay of every member.** The tick handler (a domain accessor it calls — keep DB logic in `@twt/domain`, the job is a thin runtime) must select only the *candidate* members: those whose **latest receipt `valid_through` is on or before `today + 91 days`** (i.e. members at or approaching the grace-end boundary), via an **indexed receipt/date read**. The story does not prescribe the SQL, but it MUST be a bounded candidate query against an index on `valid_through` — never a full-table sweep that replays all 4L members every day. **This needs an additive index** on `vyawastha_shulk_receipts.valid_through` (or `(member_id, valid_through DESC)` for the latest-per-member read) — the receipt table today indexes only `(pariwar_id, member_id)` + unique `(tr)` (`schema/vyawastha_shulk_receipts.ts:76,79`). That additive index is the **one expected schema touch** (a non-destructive index-only migration; see CI gates note). **The candidate query must SELECT `(pariwar_id, member_id)` from `vyawastha_shulk_receipts`** — both are required because `projectMemberState({ memberId, pariwarId, ... })` requires `pariwarId` for tenant scope, and `getMemberStateAt(db, memberId, atTimestamp)` uses only `memberId`. `pariwarId` flows from the receipt row; do not attempt to look it up separately. Then, for each `(pariwarId, memberId)` candidate, replay state and emit inside a scope-tx via `projectMemberState(actorId=null)` (NULL actor = system/SIE, `project.ts:52`):
    - `member.valid_through_reached` when replayed `state === 'active'` AND `now >= validThrough`. Non-transition marker (identity in the reducer) — the Day 0 "renewal due" anchor for Epic 5's reminder chain. **Emit BEFORE `grace_entered` in the same tick.** (See Dev Notes "The `valid_through_reached` emitter.")
    - `member.grace_entered` when replayed `state === 'active'` AND `now ≥ validThrough + 1d`.
    - `member.grace_expired` when replayed `state === 'active-in-grace'` AND `now ≥ validThrough + 91d`.
  - [x] **The scheduler is monotonic (load-bearing invariant).** It emits the *single* transition the member's **current replayed state** warrants, stamped at the **actual emission time** — it never back-fills skipped/historical events with backdated timestamps, and never emits a "catch-up" event older than the transition already reflected in the stream. A member found long past +91d while still `active` (e.g. the cron was down) advances exactly one step (`active → active-in-grace`) on this tick and the next step on the next tick; it does NOT fabricate a backdated `grace_entered` followed by an immediate `grace_expired`. (Operational caveat — out of scope: a prolonged cron outage means `getMemberStateAt(t)` for a `t` inside the un-emitted window reads the *not-yet-transitioned* state; the daily cadence is the mitigation, and backfilling historical lifecycle is explicitly NOT this story's job. Append-only audit-reproducibility forbids backdated synthesis.)
  - [x] **Idempotency is load-bearing (Decision 4):** the cron MUST be safe to run repeatedly / after a missed day / after a replay. Guard each emit on the **current replayed state** (not a flag): grace_entered only fires from `active`, so once the member is `active-in-grace` a re-run is a no-op; grace_expired only from `active-in-grace`. The reducer's identity contract makes a double-append a no-op on state, but **do not append duplicate events** — check current state first and skip if already transitioned. (The reducer being total/identity is the safety net, not the primary guard.)
  - [x] **Reminder triggers (AC1) — the FR-23 seam (forward-compat, Epic 5 not built):** when `now` is day **+30/+60/+75/+89** past `validThrough` (and the member is `active`/`active-in-grace`, not yet renewed for this cycle), publish a **renewal-reminder nudge intent** to the FR-23 seam. Since Epic 5's dispatcher does not exist, **Decision 5** governs HOW: recommended — define a `RenewalReminderNudge` contract type in `packages/contracts/` (the seam) + publish to a reserved pg-boss queue (`QUEUE_NAMES` entry) with a **no-op/log sink** until Epic 5 subscribes; OR a `member.renewal_reminder_due` marker event on the stream. Do NOT build SMS/WA/push delivery here (that is Epic 5's Story 5-1..5-6). Make reminder emission **idempotent** (fire each of the 4 reminders at most once per renewal cycle — pg-boss `singletonKey` keyed on `{member_id}-{cycle}-{offset}`, or a sent-marker).
  - [x] Job test in `apps/jobs/tests/` (live DB `:5433`): seed a member with `validThrough` set so "today" is +1d → tick emits `grace_entered`, state → `active-in-grace`; advance to +91d → tick emits `grace_expired` → `lapsed-unpaid`; **re-run the tick → no duplicate events** (idempotency); reminder publish fires at the 4 offsets and not otherwise. Live-DB gotchas apply (own-committing writers accumulate → assert membership not counts; never regenerate an applied migration).
- [x] **Task 6 — api-client SDK + mobile surface (renewal status + renew CTA)** (AC2, AC4)
  - [x] Add `vyawasthaShulkRenewalStatus(): Promise<VyawasthaShulkRenewalStatusResponse>` (+ renewal intent/confirm methods) to `packages/api-client/src/index.ts`, response-validated against the contract (mirror `vyawasthaShulkStatus`).
  - [x] Mobile: a renewal status/CTA surface. **Scope check first** — the home screen currently renders the 3.7 `LockInClockWidget` (lock-in state) + the `YogdaanBahi` prototype. The renewal CTA is relevant only to `active`/`active-in-grace`/`lapsed-unpaid` members (post-lock-in). Mirror the 3.7 widget pattern (React Query hook `['member','renewal-status']`, self-suppress when not applicable, Tamagui + tokens, calm register — NO urgency theater per UX spec lines 973/977-979 even though this is a "renewal due" surface; FR-1A grace exists precisely to avoid penalizing a brief lapse, so the tone is "renew when ready," not "act now"). The renew CTA opens the UPI Intent (`Linking.openURL`, mirror `(signup)/payment.tsx`).
  - [x] **Mobile verification = `typecheck` + `lint`** (the mobile `build`/`test` scripts are intentional no-ops — see Dev Notes "Testing reality").
- [x] **Task 7 — i18n keys (bilingual, Hindi-first)** (AC1, AC2)
  - [x] Add flat dotted keys to BOTH `packages/i18n/locales/{en,hi}/common.json` (namespace `common`, key-for-key parity — Story 2.1 parity CI gate). Suggested: `renewal.status_*`, `renewal.grace_remaining` (count param), `renewal.lapsed`, `renewal.renew_cta`, `renewal.reminder_*` (if the reminder copy is authored here vs Epic 5). **Numeral discipline:** days-remaining / day-counts are **operational figures → Latin numerals even in Hindi** (do NOT call `toHindiNumeral`; same rule as the 3.7 lock-in counter — `i18n/src/number.ts:3-15`).
- [x] **Task 8 — Verify** (all)
  - [x] Backend: `pnpm --filter @twt/domain test`, `@twt/contracts`, the API integration suite + the new jobs suite with `DATABASE_URL` on `:5433`. Mobile: `pnpm --filter @twt/mobile typecheck` + `lint`.
  - [x] **Merge gate:** `pnpm ci:local` (mirrors all 14 ci.yml jobs — GitHub Actions are suspended; reconcile locally). Integration needs `DATABASE_URL` on `:5433`.

## Dev Notes

### What this story actually is

Three new surfaces over a lifecycle whose **state transitions already exist in code**:
1. A **renewal payment flow** (mirror of signup payment, minus the lock-in gate) — emits the renewal event the reducer already understands.
2. A **scheduler** (pg-boss cron) that is the **first emitter** of the grace transitions + the reminder triggers — the lifecycle reducer has had these transitions wired since 3.1 but nothing fires them yet.
3. A **read accessor + endpoint** producing the canonical `vyawastha_shulk_status` payload that Epic 4's Validity Service (FR-12A) will consume.

There is **no reducer change** and (Decision 1 permitting) **no new event type**. The only schema touch is an **additive `valid_through` index** for the scheduler's candidate scan (an index-only migration — Task 5 / CI gates note).

### What already exists — verify before building (load-bearing)

The Story 3.1 reducer (`packages/domain/src/member/state.ts`) **already encodes every renewal/grace transition** this story needs:
- `member.vyawastha_shulk_paid` → `active-in-grace`/`lapsed-unpaid` map to `active` (state.ts:80-83) — **renewal, with NO re-lock-in** (it never routes through `pending-fee → lock-in`). This is AC3's "renewal during grace returns to active without re-applying lock-in", already true.
- `member.grace_entered` → `active` → `active-in-grace` (state.ts:97-99).
- `member.grace_expired` → `active-in-grace` → `lapsed-unpaid` (state.ts:102-104).
- The architecture transition table commits the same (architecture.md lines 1245-1247), and the documentation-only `transitions` matrix lists them (state.ts:146-149).

**The emitter gap:** despite the reducer + the `member.grace_entered`/`grace_expired`/`valid_through_reached`/`lock_in_expired` event types being declared in the 14-event vocabulary (`events.ts:160-176`) with strict payload schemas (`events.ts:77-81`), **NO code emits any of them.** The "SIE scheduler in Story 3.7" referenced in `events.ts:71` / `state.ts:85` was never built — 3.7 shipped a read-only widget. **This story builds the first scheduler** (Task 5). `lock_in_expired` is a sibling concern (3.7's deferred half) and is **out of scope for 3.8** (the 3.8 ACs name only the renewal/grace transitions) — but note the scheduler you build is the natural future home for it; design the cron so a `lock_in_expired` sweep can be added without restructuring. `valid_through_reached` is a non-transition marker (identity reducer); see "The `valid_through_reached` emitter" below.

### Decision 1: the renewal event — `vyawastha_shulk_paid` vs `vyawastha_shulk.renewed` (resolve before coding)

AC2 (from the epic) says renewal "emits the `vyawastha_shulk.renewed` event." **But the architecture-committed event vocabulary and the reducer use `member.vyawastha_shulk_paid` as the renewal transition trigger** (state.ts:80-83; the 14-event vocabulary `events.ts:160-176` has NO `vyawastha_shulk_renewed`; the architecture transition table keys renewal off the same trigger). Per the project's architecture-vs-PRD boundary discipline ([[feedback_architecture_vs_prd_boundary]] — *architecture commits state/transitions/events; PRD/epics commit policy/cadence*), the **event vocabulary is the architecture's to commit**, and it has committed `vyawastha_shulk_paid`.

**Recommendation:** **Reuse `member.vyawastha_shulk_paid`** for the renewal transition (no 15th event, no reducer change, no vocabulary churn, no `EVENT_TYPE_REGISTRY`/projector edits in `packages/events`). Distinguish a renewal from a signup payment by **receipt context** — the `tn=renewal-shulk-...` grammar plus, if audit needs an explicit discriminator, widen `VyawasthaShulkPaidPayloadSchema` (`events.ts:63-65`) with an optional `kind: 'signup' | 'renewal'` (the marker-widening precedent: 3.4/3.5/3.6b widened marker payloads without changing reducer behavior). The epic's "`vyawastha_shulk.renewed`" is satisfied *semantically* — a `vyawastha_shulk_paid` event appended from a post-lock-in state IS a renewal.

**If a distinct audit event is judged necessary** (e.g., reporting wants a first-class `renewed` stream entry): add `member.vyawastha_shulk_renewed` as a **non-transition MARKER** (identity in the reducer, like `lock_in_entered`) emitted *alongside* `vyawastha_shulk_paid` — NOT as a replacement transition trigger. That keeps the committed transition table intact while giving audit a named event. This is the more invasive path (new schema + vocabulary entry + `EVENT_TYPE_REGISTRY` registration in `packages/events` + the "14-event vocabulary" comment becomes 15). **Prefer the recommendation unless the reviewer requires the distinct event.** Whichever you pick, document it in Completion Notes so the reviewer doesn't read AC2 as unmet.

### The `valid_through_reached` emitter (Task 5 — complete the vocabulary)

`member.valid_through_reached` is declared in the 14-event vocabulary as a **non-transition marker** with the description "the renewal-reminder anchor (the state moves to `active-in-grace` via `grace_entered`, fired at valid_through + 1 day)" (`events.ts`). Nothing currently emits it — it belongs to the same emitter gap as `grace_entered`/`grace_expired`, and the scheduler in Task 5 is the natural home.

**Emit it at Day 0:** when `state === 'active'` AND `now >= validThrough` (the renewal-due instant). It is identity in the reducer (no state change), so it is idempotent by the same state-guard as the transition events — BUT because the state stays `active` after emission, you cannot guard re-emission by checking state alone. Use the `eventId` idempotency-key on `projectMemberState` (the optional `eventId` field in `ProjectMemberStateInput` — `project.ts` AR-58 re-append path), keyed on `{memberId}-{validThrough.toISOString()}-valid_through_reached`, OR check the events_log for a matching `valid_through_reached` event at this `validThrough` before emitting. **Do not emit it more than once per `validThrough` cycle.**

**Ordering within a tick:** emit `valid_through_reached` first (Day 0 anchor), then `grace_entered` if the state warrants it (+1d), then `grace_expired` (+91d). A catch-up tick for a member whose cron was down may need to emit `valid_through_reached` then immediately advance to `grace_entered` in the same run — both are emitted sequentially (reply after each to get the next replayed state).

**Payload:** `GraceEnteredPayloadSchema` and `GraceExpiredPayloadSchema` are empty (only `...auditShape`); `ValidThroughReachedPayloadSchema` is the same shape — `z.object({ ...auditShape }).strict()`. No additional data required.

### Decision 2: `days_until_lapse` / `grace_remaining_days` arithmetic

PRD §FR-1A (lines 247-249) defines the boundaries: Day 0 = `valid_through` (status still `active`, a "renewal due" reminder); Day +1..+90 = `active_in_grace`; **Day +91 = `lapsed_unpaid`**. So the **grace-end / lapse boundary is `valid_through + 91 days`**. Recommended definitions (document the choice; mirror the 3.7 `ceil`-clamped, calm-time framing). **Internal naming:** call the field `daysUntilGraceEnds` in the domain accessor (it counts to the grace-end boundary, which is also the lapse instant — clearer than `daysUntilLapse`); expose it on the wire as `days_until_lapse` (FR-12A vocabulary, fixed by PRD line 252) and map at the contract boundary.
- `paid_through` = latest receipt `valid_through` (`paid_at + 365d`).
- `daysUntilGraceEnds` (wire `days_until_lapse`) = `ceil((valid_through + 91d − now)/1 day)`, clamped ≥0; `null` if never paid.
- `in_renewal_grace` = `state === 'active-in-grace'` (derive from `getMemberStateAt`, NOT from raw date math — the state is the authority; the scheduler is what moves it).
- `grace_remaining_days` = `in_renewal_grace ? ceil((valid_through + 91d − now)/1 day) : null` (coincides with `daysUntilGraceEnds` during grace; `null` outside grace).
Use leap-safe `setDate`/`setFullYear` (NOT 365×fixed-ms — the 3.6b P9 fix, `handlers.ts:138`). **As-of correctness (AC5):** the accessor takes `atTimestamp` and `getMemberStateAt` already replays up-to-and-not-exceeding that timestamp — so `vyawastha_shulk_status(t)` is a truthful historical read for the future claim evaluator.

### Decision 3: renewal route shape — new `/renew/*` sub-routes vs a `mode` param

**Recommend new sub-routes** `POST /vyawastha-shulk/renew/{intent,confirm}` — keeps the signup confirm's 5-condition lock-in gate cleanly separated from the renewal confirm (which has NO gate), avoids a branchy single handler, and reads clearly in the route table. The `GET /renewal-status` read is its own route regardless.

### Decision 4: scheduler idempotency (load-bearing — a cron re-run must not double-append)

Guard every emit on the **current replayed state**, not a side flag: `grace_entered` fires only from `active`, `grace_expired` only from `active-in-grace`. Once a member has transitioned, a re-run reads the new state and skips — so a missed day, a manual re-run, or a replay is safe. The reducer's total/identity contract (state.ts:14-21) is the safety net (a duplicate append is a no-op on *state*), but **do not rely on it to permit duplicate events** — check state first and skip. **Monotonic corollary (Task 5):** because the guard is the current replayed state, the scheduler only ever advances a member by the single step their state warrants, stamped at emission time — it cannot emit a historical/backdated catch-up event, and a member behind by several boundaries advances one step per tick. Never synthesize backdated lifecycle events (append-only audit-reproducibility). For reminders, fire each of the 4 offsets at most once per renewal cycle (pg-boss `singletonKey` keyed on `{member_id}-{validThrough-year}-{offset}`, or a sent-marker on the stream/a small table). This is exactly the kind of invariant the live-DB test must assert (Task 5 test: re-run the tick → row count unchanged).

### Decision 5: the FR-23 reminder seam (Epic 5 is `backlog` — forward-compat)

Epic 5 (Story 5-1 "structured alert payload + channel-provider abstraction + central dispatcher") owns reminder **delivery** (in-app push / WhatsApp / Telegram mirror / SMS — PRD line 250, FR-23). It does not exist yet. Epic 3 owns the **trigger schedule** only (epic line 1767: "Epic 5 owns delivery, Epic 3 owns trigger schedule"). So this story produces a *seam*, not a delivered SMS. **Recommend:** define a `RenewalReminderNudge` intent type in `packages/contracts/` (a notifications/nudge seam — there is none yet; create it minimal) carrying the non-PII facts a dispatcher needs (`member_id`, `pariwar_id`, `reminder_offset_days`, `valid_through`, `grace_remaining_days`); publish it to a **reserved pg-boss queue** (`QUEUE_NAMES` entry) consumed by a **no-op/log sink** until Epic 5 lands its worker. This mirrors 3.7's forward-compat discipline (build the producing half cleanly; the consuming half is the later epic's). Do NOT block on Epic 5; do NOT smuggle delivery here. Document the seam in the contract README so Epic 5 finds it. (Alternative: a `member.renewal_reminder_due` marker event on the stream — heavier, pollutes the lifecycle stream with notification concerns; prefer the contract+queue seam.)

### Forward-compat boundaries (do not let these read as unmet ACs)

- **AC1 reminders:** Epic 5 dispatcher absent → the trigger fires + publishes to the seam; **no channel delivery is built** (out of scope). The *implementable* half is the schedule + the published nudge intent.
- **AC4 `vyawastha_shulk_status`:** Epic 4 FR-12A Validity Service (Story 4-6) absent → this story **produces** the payload via the read endpoint; **consumption** (cache invalidation, the compound MemberStatusPanel) is Epic 4's. The ≤60s freshness is met trivially by computing live per-request (no cache to go stale).
- **AC5 death-during-grace:** Epic 6 claim evaluation absent → satisfied by the **as-of correctness** of `getMemberStateAt(t)` + `vyawastha_shulk_status(t)` (the future evaluator reads a truthful historical state). Add a domain unit test asserting a member who was `active-in-grace` at timestamp T reads `in_renewal_grace=true` at T even after later lapsing.

### Backend patterns to mirror (do not reinvent)

- **Event emission:** `projectMemberState(client, { memberId, pariwarId, eventType, payload, actorId })` (`project.ts:72`) — appends + replays + projects `members.state` atomically; validates payload against the strict schema. `actorId = null` for system/SIE emits (the scheduler); `actorId = memberId` for the renewal confirm.
- **Receipt write:** `insertVyawasthaShulkReceipt` (`payment/receipt-write.ts`) — server-stamps `amount`/`validThrough`; `tr`-unique idempotent (`isReceiptTrDuplicate`, :43). `getLatestReceipt` (`receipt-read.ts:47`) backs `paid_through`.
- **Payment surface:** `apps/api/src/modules/vyawastha-shulk/{routes,handlers}.ts` — the signup intent (`:71-103`, server-authoritative VPA/amount, `tr` nonce, `tn` grammar) + confirm (`:116+`, UTR self-attest, scope-tx) are the renewal mirror. Renewal confirm OMITS the lock-in gate.
- **pg-boss cron:** `apps/jobs/src/boot.ts` (registration: `createQueue` → `work` → `schedule(cron, {}, { tz })`) + `digilocker-cert-refresh.ts` (a `registerXCron(boss, deps, opts)` factory — copy this shape). `QUEUE_NAMES` in `packages/queue/src/index.ts:41`. IST tz (`Asia/Kolkata`) — never UTC for a daily cron. The job is a thin runtime; keep the DB/event logic in `@twt/domain` accessors it calls.
- **Session gate / scope-tx / contracts discipline:** identical to 3.7 (`requireMemberSession`; `openScopeTx`/`closeScopeTx`; `.strict()` contracts; `_common` primitives; contracts MUST NOT import `@twt/domain`).

### CI gates that will react to this change

- **Login-wall gate (Story 1.14):** the new `GET /renewal-status` + `POST /renew/*` routes are member-session-gated → compliant; do NOT allowlist.
- **i18n parity (Story 2.1):** add keys to BOTH `en`/`hi` `common.json` key-for-key, or parity fails. Numeral discipline: Latin digits for operational counts.
- **Schema-diff gate (Story 1.16c):** **one expected schema touch — the additive `valid_through` index** for the scheduler's indexed candidate scan (Task 5). That is a non-destructive index-only migration (hand-author it, mirror the 0027 cadence + journal `when` discipline — [[project_live_db_test_gotchas]]: never regenerate an applied migration); the schema-diff gate will flag the new index, which is expected — reconcile it. Beyond that index: **no table/column change expected.** If Decision 1 widens `VyawasthaShulkPaidPayloadSchema` with an optional `kind`, that is a JSONB-payload Zod change (NOT a DDL/migration) → no schema-diff impact. If you find yourself adding a *column* or a `vyawastha_shulk_renewed` event needing a new table/event migration, stop and reconsider Decision 1. A new `QUEUE_NAMES` entry + pg-boss queue is runtime, not a tracked-schema migration.
- **member-state-invariant gate (Story 3.1):** `members.state` is projector-only (DB trigger + CI gate). Both the renewal confirm and the scheduler MUST write state ONLY via `projectMemberState` (which the trigger permits) — never a direct `UPDATE members SET state`. The scheduler emitting from `actorId=null` is the sanctioned SIE path.
- **PII-scrape gate:** keep event/nudge payloads PII-free (member_id, dates, offsets, counts are non-PII — same discipline as the 3.4/3.5 marker payloads). The reminder nudge intent carries NO name/mobile.
- **Friction-budget gate (Story 1.16a):** mobile surface is a no-op until a bundle manifest exists (EAS build is a no-op) — adding the renewal widget does not trip it.

### Testing reality

- **Backend:** real unit tests for the pure `deriveVyawasthaShulkStatus` seam (DB-free fixtures); real integration tests for the API endpoints + the jobs scheduler against the Dockerized test DB `twt-test-pg` on `:5433` (set `DATABASE_URL`). **Live-DB gotchas** ([[project_live_db_test_gotchas]]): never regenerate an applied migration; own-committing writers accumulate rows → assert membership not counts; the scheduler-idempotency test asserts "re-run → no new events" which is a *count* assertion scoped to one seeded member's stream (use a fresh member per test to keep the count deterministic).
- **Mobile:** `apps/mobile` `build` is an EAS no-op and `test`/`test:web` are `true` (no-ops) — verification is `typecheck` + `lint` (the established 3.5/3.6/3.7 note).
- **Merge gate:** GitHub Actions suspended — `pnpm ci:local` (14 jobs) is the gate; integration needs `DATABASE_URL` on `:5433` ([[project_ci_actions_suspension_local_mirror]]).

### Tone / UX register (load-bearing)

This is a "renewal due / in grace" surface, but the UX spec's calm discipline still governs (lines 973, 977-979): **no urgency theater, no red countdown, no scarcity framing.** FR-1A's 3-month grace exists *precisely so a brief admin lapse doesn't penalize a long-tenure Reena-class member* (PRD line 256). The copy reads "your membership is due for renewal; you have N days of grace" — not "renew NOW or lose coverage." Passbook register (hairline strip), Latin numerals for the day counts.

### Project Structure Notes

- **New files (expected):** `packages/domain/src/member/renewal-read.ts` (or add to `read.ts`); `packages/contracts/src/payments/` renewal-status + `packages/contracts/src/notifications/` (or `nudges/`) reminder-seam type; `apps/jobs/src/member-renewal-lifecycle.ts` (the cron factory); `apps/jobs/tests/member-renewal-lifecycle.test.ts`; `apps/api/tests/integration/vyawastha-shulk/renewal-*.spec.ts`; a **hand-authored index-only migration** (additive `valid_through` index — mirror the 0027 cadence + journal `when`); mobile renewal widget + hook.
- **Edited files:** `packages/domain/src/member/index.ts` (export accessor); `packages/contracts/src/payments/index.ts` + a new notifications barrel; `apps/api/src/modules/vyawastha-shulk/{routes,handlers}.ts` (renewal + status routes); `packages/api-client/src/index.ts`; `packages/queue/src/index.ts` (`QUEUE_NAMES` entries); `apps/jobs/src/boot.ts` (register the new cron); `packages/i18n/locales/{en,hi}/common.json`; mobile home tab (mount the renewal surface). **Possibly** `packages/domain/src/member/events.ts` (Decision 1: optional `kind` on `VyawasthaShulkPaidPayloadSchema`).
- **No turbo cycle risk:** all domain reads are `@twt/domain`-internal (events_log + receipts directly); domain still must NOT import `@twt/events` (project.ts header). The contract mirrors snake_case wire shapes; it does not import domain.
- **Story size:** this is a large multi-surface story (payment flow + scheduler + read + seam). The natural seams if it must be staged: (a) status read accessor+endpoint, (b) renewal payment flow, (c) scheduler+reminder seam. Implement in that order — each is independently testable; the scheduler depends on nothing the other two add.

### Open decisions for the dev (recommendation in brackets)

1. **Renewal event:** reuse `member.vyawastha_shulk_paid` vs add `member.vyawastha_shulk_renewed`. [**Reuse `vyawastha_shulk_paid`** + optional `kind:'renewal'` payload discriminator — matches the committed transition table/vocabulary; no reducer/migration churn. Decision 1.]
2. **`days_until_lapse` boundary:** lapse at `valid_through + 91d`; `ceil`-clamped. [As specified, Decision 2 — mirrors PRD line 249 + 3.7's calm `ceil`.]
3. **Renewal route shape:** new `/renew/*` sub-routes vs a `mode` param. [**New sub-routes** — clean separation of the gated signup confirm from the un-gated renewal confirm. Decision 3.]
4. **Reminder seam:** contract type + reserved pg-boss queue (no-op sink) vs a `renewal_reminder_due` marker event. [**Contract + queue seam** — keeps notification concerns off the lifecycle stream; Epic 5 subscribes later. Decision 5.]
5. **Scheduler cadence/tz:** daily cron, IST, env-overridable. [Daily `Asia/Kolkata`, env knob like `VACUUM_CRON` — operations policy.]

### References

- Epic + ACs: `_bmad-output/planning-artifacts/epics.md` §"Story 3.8" (lines 1757-1777); Epic 3 framing (lines 1567-1591; renewal-with-grace demoable scenario line 1586).
- FR-1A policy (the source of truth for grace boundaries + the payload): `prds/prd-TWT-2026-05-22/prd.md` §FR-1A (lines 240-256, esp. 245-252); the FR-12A status-payload schema (lines 390-405).
- Architecture transition table + the validity-service `vyawastha_shulk_status` exposure + freshness: `architecture.md` (transition table lines 1245-1247; policy consumers 1254-1258; FR-12A 60s cache "row 11" 1045-1050; freshness-timestamp rule 1072).
- Reducer (transitions already wired): `packages/domain/src/member/state.ts` (renewal `vyawastha_shulk_paid` :80-83; `grace_entered` :97-99; `grace_expired` :102-104; identity/total contract :14-21; transitions matrix :139-155).
- Event vocabulary + payload schemas: `packages/domain/src/member/events.ts` (`VyawasthaShulkPaidPayloadSchema` :63-65; `GraceEntered/ExpiredPayloadSchema` :77-81; the 14-event list :160-176; the type→schema map :186-200; the "SIE scheduler" reference :71/97-98).
- Event emission API: `packages/domain/src/member/project.ts` (`projectMemberState` :72; `ProjectMemberStateInput` incl. `actorId:null` SIE note :43-56).
- Status reads to compose: `packages/domain/src/member/read.ts` (`getMemberStateAt(db, memberId, atTimestamp)` :61 — not tenant-scoped, stream_id is globally unique; `deriveLockInClock` pure-seam precedent :93); `packages/domain/src/payment/receipt-read.ts` (`getLatestReceipt(db, pariwarId, memberId)` :47 — tenant-scoped, 3 args).
- Renewal payment mirror: `apps/api/src/modules/vyawastha-shulk/handlers.ts` (intent/`tn`/`tr`/VPA :71-103; `validThrough` leap-safe :138-140; confirm + lock-in gate :116+); `routes.ts` (:30-57); receipt write `packages/domain/src/payment/receipt-write.ts` (idempotency :43); payment contract `packages/contracts/src/payments/vyawastha-shulk.ts` (status :102-110).
- Scheduler substrate: `apps/jobs/src/boot.ts` (cron registration pattern; IST tz); `apps/jobs/src/digilocker-cert-refresh.ts` (the `registerXCron` factory to copy); `packages/queue/src/index.ts` (`QUEUE_NAMES` :41).
- Forward-compat consumers (both `backlog`): Epic 4 `sprint-status.yaml:280-289` (Story 4-6 FR-12A validity service :286); Epic 5 `:294-304` (Story 5-1 dispatcher :295). FR-23 nudge channels: `prd.md:250,535`.
- Numeral/i18n + a11y discipline + the widget-mirror: Story 3.7 file `_bmad-output/implementation-artifacts/3-7-lock-in-clock-widget-on-home-screen.md` (numeral discipline; calm-tone; mobile patterns; CI gates); `packages/i18n/src/number.ts:3-15`.
- Boundary discipline: [[feedback_architecture_vs_prd_boundary]] (event vocabulary is architecture-committed → Decision 1); [[project_member_lifecycle_domain_substrate]] (lifecycle lives in `@twt/domain`; `members.state` projector-only); [[project_live_db_test_gotchas]]; [[project_ci_actions_suspension_local_mirror]].

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / bmad-dev-story)

### Debug Log References

- `pnpm ci:local` (DATABASE_URL on :5433): **18/18 jobs green**. One earlier run flagged `test (unit)` — confirmed innocent (the documented jobs `integrity-check` chunk-boundary suite-timeout under concurrent turbo load; the jobs suite passes in isolation at ~1.1s, and the re-run was clean — [[project_known_livedb_test_failures]]).
- New tests: domain `renewal-read.test.ts` (10), api `renewal.spec.ts` (11, :5433), jobs `member-renewal-lifecycle.test.ts` (2, :5433). Signup regression (`vyawastha-shulk.spec.ts` 15) green after the `kind` payload widening.

### Completion Notes List

- **Decision 1 (resolved → recommended path):** Reused the architecture-committed `member.vyawastha_shulk_paid` as the renewal transition trigger (NO new event type, NO reducer change, NO `packages/events` registry churn). Added an OPTIONAL `kind: 'signup' | 'renewal'` discriminator to `VyawasthaShulkPaidPayloadSchema` (JSONB-payload Zod widening — NOT DDL; the 3.4/3.5/3.6b marker-widening precedent). The renewal confirm sets `kind: 'renewal'`; the 3.6b signup path is unchanged (absent `kind` ≡ signup). AC2's "`vyawastha_shulk.renewed`" is satisfied semantically — a `vyawastha_shulk_paid` from a post-lock-in state IS a renewal.
- **Decision 2:** internal field `daysUntilGraceEnds` (counts to `validThrough + 91d`), mapped to the wire `days_until_lapse` at the contract boundary; `ceil`-clamped ≥0, leap-safe `setDate`. State (`active-in-grace`) is the authority for `inRenewalGrace`, not raw date math.
- **Decision 3:** new `/renew/intent` + `/renew/confirm` sub-routes (clean separation from the gated signup confirm). Renewal confirm has NO lock-in gate, accepts only renewable states (`active`/`active-in-grace`/`lapsed-unpaid` — a pre-active state would route the reducer through `pending-fee → lock-in`, re-applying lock-in; rejected 409 `vyawastha_shulk.not_renewable`), and commits the receipt + event in ONE scope-tx (idempotent on `tr` via a `getReceiptByTr` pre-check).
- **Decision 4 (scheduler):** the `runRenewalLifecycleTick` domain core is monotonic + idempotent — every transition emit is guarded on the CURRENT replayed state (one step per tick, no backdated catch-up); `valid_through_reached` (identity marker) is guarded by an events_log existence check scoped to the cycle (`occurred_at ≥ valid_through`). Emits via `projectMemberState(actorId = null)` (SIE). The candidate scan is an INDEXED `DISTINCT ON (member_id)` over the new `(member_id, valid_through DESC)` index, filtered `valid_through ≤ now + 91d` (excludes renewed members) — never a full-table sweep.
- **Decision 5 (reminder seam):** `RenewalReminderNudge` contract (`packages/contracts/src/notifications/`, NON-PII, no `.openapi()` → v1.yaml path-stable) published to a reserved `member.renewal_reminder` pg-boss queue with a no-op/log SINK until Epic 5 subscribes; per-cycle idempotency via `singletonKey = {member}-{validThrough-date}-{offset}`. Reminders surface at exactly +30/60/75/89.
- **Schema touch (expected, 1):** additive `vyawastha_shulk_receipts_member_valid_through_idx` — hand-authored migration `0028` (mirrors the 0027 cadence + journal `when`; snapshot-absent like 0021-0027). `schema-diff` gate green. No table/column change.
- **Forward-compat:** AC1 publishes the nudge intent (Epic 5 delivers); AC4 produces the FR-12A payload live per request (≤60s trivially; Epic 4 consumes); AC5 satisfied by `getMemberStateAt(t)` + `getVyawasthaShulkStatus(t)` as-of correctness (domain unit test asserts a member in grace at T reads `inRenewalGrace=true` at T).
- **Mobile:** renewal widget mirrors the 3.7 lock-in widget (React Query `['member','renewal-status']`, self-suppresses unless paid + renewal-due (`days_until_lapse ≤ 91`), calm register / no urgency theater, Latin numerals for day-counts, UPI-Intent renew CTA via `Linking.openURL`). Verified by `typecheck` + `lint` (mobile `build`/`test` are intentional no-ops).

### File List

**New:**
- `packages/domain/src/member/renewal-read.ts` — `getVyawasthaShulkStatus` + pure `deriveVyawasthaShulkStatus` seam.
- `packages/domain/src/member/renewal-scheduler.ts` — `runRenewalLifecycleTick` + `selectRenewalCandidates` + `RENEWAL_REMINDER_OFFSETS`.
- `packages/domain/tests/member/renewal-read.test.ts` — DB-free derive unit tests.
- `packages/domain/migrations/0028_renewal-valid-through-index.sql` — additive `(member_id, valid_through DESC)` index.
- `packages/contracts/src/notifications/{index,renewal-reminder}.ts` — `RenewalReminderNudge` seam.
- `apps/api/tests/integration/vyawastha-shulk/renewal.spec.ts` — renewal-status + renew intent/confirm E2E (:5433).
- `apps/jobs/src/member-renewal-lifecycle.ts` — the daily cron factory + reminder publish + no-op sink.
- `apps/jobs/tests/member-renewal-lifecycle.test.ts` — tick grace/idempotency/reminder job tests (:5433).
- `apps/mobile/components/renewal/{useRenewalStatusQuery.ts,RenewalStatusWidget.tsx}` — renewal home widget + hook.

**Edited:**
- `packages/domain/src/member/events.ts` — optional `kind` on `VyawasthaShulkPaidPayloadSchema` (Decision 1).
- `packages/domain/src/member/index.ts` — export renewal-read + renewal-scheduler.
- `packages/domain/src/schema/vyawastha_shulk_receipts.ts` — the new index (source parity); `packages/domain/migrations/meta/_journal.json` — 0028 entry.
- `packages/contracts/src/payments/vyawastha-shulk.ts` — `VyawasthaShulkRenewalStatusResponse` + `VyawasthaShulkRenewalConfirmResponse`; `packages/contracts/src/index.ts` — notifications barrel; `packages/contracts/scripts/emit-openapi.ts` + `openapi/v1.yaml` — renewal components + 3 paths.
- `apps/api/src/modules/vyawastha-shulk/{handlers,routes}.ts` — `renewalStatus` / `renewIntent` / `renewConfirm` + routes.
- `packages/api-client/src/index.ts` — `vyawasthaShulkRenewalStatus` / `vyawasthaShulkRenewIntent` / `vyawasthaShulkRenewConfirm`.
- `packages/queue/src/index.ts` — `MEMBER_RENEWAL_LIFECYCLE` + `RENEWAL_REMINDER` queue names.
- `apps/jobs/src/boot.ts` + `apps/jobs/package.json` — register the cron + add `@twt/contracts` dep; `pnpm-lock.yaml`.
- `packages/i18n/locales/{en,hi}/common.json` — `renewal.*` keys (parity).
- `apps/mobile/app/(tabs)/index.tsx` — mount `RenewalStatusWidget`.

### Review Findings

Code review run 2026-06-30 (3 layers: Blind Hunter · Edge Case Hunter · Acceptance Auditor). 2 decision-needed, 6 patch, 8 deferred, 0 dismissed.

**Decision-needed (resolve before patching):**
- [x] [Review][Decision] D1 — Mobile widget has no UTR-confirm step — `renew/confirm` unreachable from mobile surface — `onRenew` calls `vyawasthaShulkRenewIntent()` + `Linking.openURL`, discards `intent.tr`, never navigates to a UTR entry screen, and never calls `vyawasthaShulkRenewConfirm()`. The API endpoint + api-client method are built and tested server-side. A member who pays via the UPI app has no mobile path to register the payment; state never transitions. Options: (A) add a UTR entry modal/screen to this story; (B) scope to a follow-on story and call this AC2-mobile explicitly deferred; (C) link from the CTA to the existing signup `/payment.tsx` screen repurposed for renewal. **Resolved 2026-06-30: Option C — new `app/(renewal)/payment.tsx` screen (renewal-specific: no lock-in gate, no reference code); `RenewalStatusWidget.onRenew` now navigates via `router.push('/(renewal)/payment')`; `app/_layout.tsx` registers the `(renewal)` group.**
- [x] [Review][Decision] D2 — Insufficient renewal-receipt dedup beyond `tr`-idempotency — two concurrent `renewConfirm` calls with different `tr`s both pass the `RENEWABLE_STATES` check, both find their respective `tr` absent, and both insert receipts + emit events (no per-member-per-cycle mutex; `UNIQUE` is on `tr` only). A member with two open intents who pays once could confirm both, getting two year-extensions. Additionally, no `utr` uniqueness constraint prevents the same bank reference code from being registered on multiple `tr`s (deliberate or accidental). Options: (A) add a `UNIQUE (member_id, payment_year)` or advisory lock to limit one active receipt insert per cycle; (B) add a `utr` uniqueness constraint (migration); (C) accept the current `tr`-idempotency as sufficient and document the gap. **Resolved 2026-06-30: Option B (UTR uniqueness, scoped to pariwar_id for test isolation) — migration 0029 adds `UNIQUE (pariwar_id, utr)`; schema updated; `isReceiptPariwarUtrDuplicate` added; `renewConfirm` handler uses SAVEPOINT to catch both 23505 variants and raises 409 `vyawastha_shulk.utr_already_used` on the UTR constraint. Per-cycle domain-invariant dedup accepted as W7-adjacent risk at current scale.**

**Patch findings (fix without human input):**
- [x] [Review][Patch] P1 — `getVyawasthaShulkStatus` uses non-as-of `getLatestReceipt` — `paid_through`/`days_until_lapse` incorrect at historical `atTimestamp` (AC5 partial violation) [`packages/domain/src/member/renewal-read.ts:113-114`] **Fixed 2026-06-30: added `getLatestReceiptAt(db, pariwarId, memberId, atTimestamp)` to `receipt-read.ts` (adds `lte(paidAt, atTimestamp)` filter); `getVyawasthaShulkStatus` now calls `getLatestReceiptAt`.**
- [x] [Review][Patch] P2 — Same-`tr` concurrent `renewConfirm` → 23505 unique violation becomes 500 instead of idempotent 200 (catch block doesn't catch `23505`; second in-flight request crashes) [`apps/api/src/modules/vyawastha-shulk/handlers.ts` renewConfirm] **Fixed 2026-06-30: SAVEPOINT pattern wraps the insert; `ROLLBACK TO SAVEPOINT` on 23505; `isReceiptTrDuplicate` → re-read and continue idempotent path; `isReceiptPariwarUtrDuplicate` → 409. Outer tx stays clean.**
- [x] [Review][Patch] P3 — Concurrent cron ticks: TOCTOU on `hasValidThroughReachedSince` + `MemberStreamConcurrencyError` from optimistic lock aborts the entire tick; no `try/catch` per candidate inside the `for` loop [`packages/domain/src/member/renewal-scheduler.ts` runRenewalLifecycleTick] **Fixed 2026-06-30: wrapped each `withPariwarScope` call in `try/catch`; errors logged + skipped; tick continues to remaining candidates.**
- [x] [Review][Patch] P4 — `daysSince` uses fixed-ms arithmetic (`now - validThrough / DAY_MS`) while `graceStart`/`graceEnd` use calendar-day `setDate` — reminders fire off by up to ±1 calendar day for members whose receipts were stamped at IST-evening UTC times [`packages/domain/src/member/renewal-scheduler.ts:207`] **Fixed 2026-06-30: replaced `daysSince` with IST calendar-day string comparison (`toISTDateString = UTC+330min → YYYY-MM-DD`); iterates offsets and matches `toISTDateString(addDays(validThrough, offset)) === todayIST`.**
- [x] [Review][Patch] P5 — `deriveVyawasthaShulkStatus` computes `inRenewalGrace` before the `validThrough === null` guard → can return `{inRenewalGrace: true, graceRemainingDays: null}`, a semantically contradictory payload [`packages/domain/src/member/renewal-read.ts` deriveVyawasthaShulkStatus] **Fixed 2026-06-30: moved `inRenewalGrace` after the null guard; null-path returns `inRenewalGrace: false` explicitly.**
- [x] [Review][Patch] P6 — `days_until_lapse` contract field is `z.number().int().nullable()` with no `.min(0)` — spec (Decision 2) guarantees "clamped ≥0" but the contract doesn't enforce the floor [`packages/contracts/src/payments/vyawastha-shulk.ts:726`] **Fixed 2026-06-30: `z.number().int().min(0).nullable()`.**

**Deferred findings (pre-existing or out-of-scope):**
- [x] [Review][Defer] W1 — Reminder cadence has no catch-up: cron outage on exact offset day (+30/60/75/89) permanently silences that reminder for affected members — deferred, operational risk acknowledged in Dev Notes; daily cadence is the stated mitigation
- [x] [Review][Defer] W2 — `getLatestReceipt` (orders `paidAt DESC`) vs `selectRenewalCandidates` (orders `valid_through DESC`) disagree on "latest" receipt — deferred, theoretical (no current path produces out-of-order paidAt/validThrough); align if variable-term receipts ever land
- [x] [Review][Defer] W3 — `renewIntent` accepts non-renewable states (no state check in intent handler); a pre-active member can send a UPI payment the system permanently ignores — deferred, mobile UI self-suppresses CTA; consistent with signup intent pattern
- [x] [Review][Defer] W4 — `VyawasthaShulkConfirmRequest` reused for renewal confirm exposes `referenceCode` field (signup-only, silently ignored on renewal) — deferred, cosmetic; `.strict()` on response; dedicated renewal request schema is a nice-to-have
- [x] [Review][Defer] W5 — Candidate scan accumulates all `lapsed-unpaid` / terminal-state members indefinitely (no lower-bound date filter or state exclusion) — deferred, scalability concern; correctness preserved; add a state/date filter before member base exceeds ~50 k ex-members
- [x] [Review][Defer] W6 — `renewalStatus` returns a non-null `paid_through`/`days_until_lapse` for withdrawn members with recent receipts; the renewal widget can render a CTA that leads to 409 `not_renewable` silently — deferred, data integrity preserved; UX degradation only for an edge population
- [x] [Review][Defer] W7 — Stale `from_state` in `renewConfirm` event payload when grace-expiry cron races the confirm — deferred, audit log imprecision only; reducer ignores `from_state` for transitions; acceptable under READ COMMITTED isolation
- [x] [Review][Defer] W8 — `onRenew` swallows all errors silently (no toast/feedback on 503/401) — deferred, intentional fail-soft per mobile spec; revisit when Epic 5 adds a notification surface

## Change Log

| Date       | Change                                                                 |
| ---------- | --------------------------------------------------------------------- |
| 2026-06-29 | Created Story 3.8 — comprehensive context-engineered story (renewal payment flow + renewal-lifecycle scheduler/reminder seam + `vyawastha_shulk_status` FR-12A producer surface). |
| 2026-06-30 | Implemented Story 3.8 — FR-12A renewal-status read + endpoint; renewal UPI intent/confirm (no re-lock-in, `kind:'renewal'`); the FIRST renewal-lifecycle scheduler (indexed candidate scan, monotonic grace emits, reminder seam); api-client SDK + mobile renewal widget; i18n keys; additive `valid_through` index (0028). ci:local 18/18 green. Status → review. |
