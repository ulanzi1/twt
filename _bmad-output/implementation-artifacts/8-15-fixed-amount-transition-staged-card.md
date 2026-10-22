---
baseline_commit: b883dc15
---

# Story 8.15: Fixed-Amount Transition — the Staged My Pool Card (UX-DR25) `[SURFACE]`

Status: ready-for-dev

<!-- v1.0 2026-10-22 — created by bmad-create-story off `b883dc15` (== origin/main, fetched). Authoring
pass only: no code written, no gate run, nothing here attested by a test. -->

## ✅ PREFLIGHT

- **Branch / worktree:** `story/8-15-fixed-amount-transition-staged-card` in
  `.claude/worktrees/8-15-fixed-amount-transition-staged-card`. ⛔ Never commit on `main`. Other sessions
  share this machine — check `git branch --show-current` before every commit.
- **Baseline:** `b883dc15` (== `origin/main` at authoring). Run `git fetch origin` and re-check
  `git log HEAD..origin/main` before Task 1. If anything under `packages/domain/src/pool/`,
  `apps/api/src/modules/member-pool/`, `packages/contracts/src/contributions/` or
  `apps/mobile/components/active-contribution/` moved, re-read it before editing.
- **How this key came to exist.** Story 7.11 created it as an **author mint, not ratified by the Panel**
  (2026-08-16). AC9 of 7.11 named Story 8.2 as the owner of the staged card, but 8.2 is `done`, so its
  re-trigger could never fire. The record says BigDev or the Panel *"may rename, fold or decline it"*.
  Nobody has (verified: no decision entry since `-125` mentions 8.15). **There is no `### Story 8.15:`
  entry in `epics.md`**: `epics.md:648` says *"there is no 8.14 or 8.15"*. Task 0 adds it.
- **Re-trigger being discharged:** `deferred-work.md` (the "⭐ Story 7.11 — UX-DR25's four-stage My Pool
  card transition is now GUARANTEED BY POLICY, and it is still UNBUILT" entry): *"Story 8.15 entering
  `ready-for-dev`, or the first standard fixed-amount change actually scheduled in production"*. This
  story is the first of the two.

## Story

As **Sushil, a contributing member** who opens the My Pool card during a live cycle,
I want the card itself to tell me, calmly and in stages, that the per-pool contribution is going to
change: first the date and the new amount, then "from next month", then a short note on the first pool
that carries the new amount, and after that nothing,
so that **a changed amount never surprises me at the moment I pay**, and I never need a banner or an
announcement to learn about it.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces no predicate that gates a member's access to a benefit, and changes none.**
It changes only what the My Pool card **tells** a member about an amount the Trust has already set. The
amount a member is asked to pay stays the pool's snapshotted `pools.fixed_amount` (Story 8.2 D3), and
nothing here reads or writes eligibility, assignment, coverage or standing.

The one member-facing meaning the story carries is stated here so it is never left implicit: *"a
member is told about a standard fixed-amount change on the card from the day it is scheduled, and is
never told about a change that will not happen."* That sentence was checked against Niyamavali §4.2 as
reproduced in Decision `2026-08-16-124` clause 3 (*"changed on not less than 90 days' notice, save under
a recorded emergency adjustment"*). Result: **consistent**. §4.2 sets the notice; this story displays
it. **The emergency half is NOT settled by that check.** See PQ1 / Task 0.

## 🎯 What already EXISTS (reuse; ⛔ do not rebuild)

| Thing | Where | What it does today |
|---|---|---|
| The card | `apps/mobile/components/active-contribution/ActiveContributionCard.tsx:215-227` | Renders **one un-staged line**, `active_contribution.upcoming_amount` (*"From {date}, the contribution becomes ₹{amount}"*), whenever `data.upcomingAmountChange` is non-null. It shows no stages, no first-cycle note and no `change_type` awareness. |
| The contract | `packages/contracts/src/contributions/active-contribution-card.ts:61-67` (`UpcomingAmountChange`), `:143` (field) | `{ effectiveFrom: Iso8601Datetime, newAmount }`, `.nullable()`. |
| The server read | `apps/api/src/modules/member-pool/handlers.ts:1500-1502` (step 9), `:1567-1568` | `poolDomain.resolveUpcomingFixedAmountChange(tx, pariwarId, now)`, where `now` is `deps.clock()` (JS clock, `apps/api/src/deps.ts:639`). **The call is not wrapped:** a throw fails the whole card to `{assigned:false}`. |
| The domain read | `packages/domain/src/pool/fixed-amount.ts:277-294` | Returns the nearest row with `effective_from > asOf`, ordered `effective_from ASC, version ASC`, `LIMIT 1`. **Change-type-blind, and it does not exclude moot (zero-width) rows.** See Trap 1. |
| The schedule | `packages/domain/src/schema/pool_fixed_amount_schedule.ts`; migration `0075` | Per **Pariwar** (not per pool). Columns `version`, `fixed_amount`, `effective_from`, `effective_until` (NULL = open head), `change_type` (`standard`/`emergency`). RLS on `pariwar_id`. |
| The in-force resolver | `fixed-amount.ts:126` (pure `selectEffectiveFixedAmountRow`), `:226` (`resolveEffectiveFixedAmountRow(db, p, asOf)`) | The row in force at an instant: `from` inclusive, `until` exclusive. Deterministic for past instants. |
| The snapshot | `packages/domain/src/pool/spawn.ts:312` | `getEffectiveFixedAmount(tx, pariwarId, commit.committedAt)`, written into `pools.fixed_amount`. ⛔ **No FK or version id links a pool to its schedule row** (`pools.ts:188-193`). Recover the row by re-resolving at the cycle's `committed_at`. |
| The notice floor | `fixed-amount.ts:69` `FIXED_AMOUNT_NOTICE_DAYS = 90` | Its doc-block already says it is 90 *so that UX-DR25's Month-3 stage can fire*. ⛔ Not touched. |
| The emergency path | `fixed-amount.ts:508` `applyEmergencyOverride` | No notice floor. `effective_from` must be `>=` the in-force row's (`-125` cl.1). **A future-dated emergency is legal**, since only a lower bound exists, and so is an emergency superseding a pending standard change (`-125` cl.2). |
| Live pool + cycle | `handlers.ts:1391-1403` `resolveCard` → `resolveMemberLivePool` | Returns `{ pool, committedAt, poolCount, cycleId }` for the D7-chosen live pool. |
| IST calendar parts | `packages/domain/src/cycle-calendar/holiday-resolver.ts:164` `istCalendarDate(instant)` | A pure, process-timezone-independent `{year, month, day}` in IST. Reuse it for month arithmetic. ⛔ Never `getMonth()` and never `Intl` on the server. |
| Calendar-date wire shape | `packages/contracts/src/claims/appeal.ts:25-26` (`CalendarDate`, `YYYY-MM-DD`, IST) | The precedent for sending a date as an IST calendar date instead of an instant. |
| Copy catalog | `packages/i18n/locales/{en,hi}/contribution.json:17` | `contribution` namespace, flat sorted keys, `{param}` single braces, `_a11y` variants. hi uses **अंशदान** on this card (`:2`, `:17`). |
| Gates | `pnpm i18n:check` (parity), `pnpm microcopy:check` / `microcopy:test` (`microcopy.yaml:361-369` already globs `contribution.json`) | New keys are scanned automatically. Their teeth live in `scripts/microcopy/contribution.test.ts`. |
| Real-`t()` copy test pattern | `apps/mobile/tests/unit/closed-copy-resolves.test.ts` | A pure key table resolved through `import { t } from '@twt/i18n'` in both locales. |
| Pure-selector test pattern | `apps/mobile/tests/unit/tone-gradient.test.ts` | Table-driven boundaries, clamps, no RN imports. |

## ⛔ THE TRAPS

### Trap 1 — Today's read can announce an amount that will NEVER apply (REACHABLE, pre-existing)

`closeOpenHead` case (2) (`fixed-amount.ts:374-399`) closes a superseded **future** head at **its own**
`effective_from`, which leaves a zero-width window that can never be in force. `resolveUpcomingFixedAmountChange`
filters only `effective_from > asOf`, so **that moot row is still returned as "upcoming"**.

Path (all legal): a standard change to ₹900 is scheduled 400 days out, then an emergency to ₹750 is applied
effective now (`-125` cl.2: *"An emergency superseding a pending future standard change remains legal"*). The
₹900 row is now zero-width. The card says *"From [date], the contribution becomes ₹900"* to a member paying
₹750, about a change the trustees cancelled. The **admin** setter view
(`apps/api/src/modules/pool-fixed-amount/handlers.ts:219`) shows the same moot row as `upcoming`.

The state is built by `packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts:270-300`, which never
asserts on the upcoming read. ⇒ **AC2 fixes it in the domain function**, which fixes both consumers. The
admin `schedule` list keeps showing the moot row, which is history and correct.

### Trap 2 — "3 चक्र बाद" cannot be computed. Cycles are not counted, and are not calendar-scheduled.

The UX spec's Month−3 sample copy is *"3 चक्र बाद नया योगदान: ₹400"* ("in 3 cycles"). The PRD calls the
alert *"monthly"* (`prd.md:136`), but in code a cycle is a **trustee-committed `cycle_freeze_commits`
row** with no cadence enforced (schema header: *"NOT a cycle-scheduling object"*). Zero or several can fall
in a month, and several can be live at once (D7 tie-break, `handlers.ts:1352-1358`). ⇒ Any copy that counts
cycles would be a guess presented as a fact. The stages are anchored to **IST calendar months of
`effective_from`** (D2), and the far stage names the **date**. The spec copy is sample copy, and this
deviation is recorded (D2), ⛔ not silent.

### Trap 3 — The card exists only while an alert is `live`

`resolveMemberLivePool` returns `UNASSIGNED` when nothing is live (`handlers.ts:1340-1341`). A stage is
therefore only **seen** during a live window. Between cycles there is no card, so no stage. That is
expected and must not be "fixed" by adding a banner or a home-screen element outside the card. The UX spec
says *"no announcement banner; the My Pool card itself carries the news"*, and FR-55's broader-channel
announcement is Story 10.5's News/Blog console (`deferred-work.md`, 10.13 AC7(a): "Closed by [edit]").

### Trap 4 — The change can take effect DURING a live window, and today the line just vanishes

`upcoming` is read at request `now`. If `effective_from` falls inside a live 15-day window, the live pool
still carries the **old** snapshot (correct: the pool was spawned before the change), but `effective_from
> now` is now false, so the line disappears. The member sees the old amount with no note until the next
cycle. ⇒ D3 reads the upcoming change **as of the live pool's `committedAt`** and adds a `next_cycle`
stage for this gap.

### Trap 5 — "Emergency has no stages" has two readings, and choosing between them is not the developer's call

`-124` clause 2 / `:16784`: *"An emergency adjustment still has no stages, because it has no notice. That is
the point of it."* `deferred-work.md`: build the staged pattern *"for **standard** changes only and must
not imply a warning the emergency path cannot give."*

Two cases are reachable today:
- **(i)** a **future-dated** emergency, which has some lead time (only a lower bound exists). The current
  card shows it with the un-staged dated line.
- **(ii)** the first pool **after** an emergency took effect. The member's amount changed with no notice;
  a first-cycle note would explain it.

Reading A: "no stages" means **no transition copy at all** for an emergency. Reading B: "no stages" means
no **notice-implying** pre-stages (no "from next month"), but a plain dated fact for (i) and the
first-cycle note for (ii) are allowed, because neither implies a warning that was not given.

The 7.11 precedent applies verbatim: *"choosing between two readings of ratified words is not a developer's
call"* (Decision `2026-08-16-125` was the result). ⇒ **PQ1, Task 0.** ⛔ Do not resolve it in code by picking
one.

### Trap 6 — The shipped card's `formatDate` follows the DEVICE time zone

`formatDate(iso)` calls `toLocaleDateString` on an **instant** with no `timeZone`. A device outside IST
can render the day before. The new contract sends an **IST calendar date** (`effectiveOn: 'YYYY-MM-DD'`,
D4). The client builds a local `Date(y, m-1, d)` from those parts, so the printed day is always the IST
calendar day. ⛔ Don't send an instant and hope.

### Trap 7 — No render harness for this card; copy defects hide behind fixtures

Nothing mounts `ActiveContributionCard`. `apps/mobile/vitest.config.ts` runs node-only `tests/unit/**/*.test.ts`,
and importing tamagui or `@twt/i18n/react` failed in the harness (`apps/mobile/components/drive-list/format.ts:1-11`).
⇒ Put the stage→copy mapping in a **plain `.ts` module** and prove it through the **real `t()`** in both
locales ([[feedback_stub_must_call_not_transcribe]]). The ₹ sign already sits inside the copy string, so a
pre-formatted `₹` param would ship `₹₹`. `t()` throws on a missing param, and `{{x}}` is a known past defect.

### Trap 8 — Don't widen the confirmed-only progress presenter, and keep one live region

`derivePoolProgressCardViewModel` (`packages/ui/src/pool-progress/`) has an anti-widening test
(`packages/ui/tests/pool-progress/presenter.test.ts:151`). ⛔ Don't route transition data through it. The
tone-gradient `Paragraph` is the card's **single** polite live region (8.2 review). ⛔ The transition line
is **not** a live region.

## Acceptance Criteria

### AC0 — Governance first, in its own commit

**Given** 8.15 has no `epics.md` entry and Trap 5 is unruled
**When** the story starts
**Then** one `governance(8.15):` commit, with **no code**, lands **before** any implementation commit
([[feedback_governance_commits_precede_implementation]]). It carries:
1. A `### Story 8.15:` entry in `epics.md`, placed **between Story 8.13 and Story 8.16** in key order, with
   the 8.16/8.17 blockquote shape. ⚠ The blockquote must say it was **minted by Story 7.11's author, not by
   Panel direction** (unlike 8.16), cite `deferred-work.md`'s 7.11 entry and Decision `2026-08-16-124` cl.1–2,
   and say *"numbered 8.15 to match the `sprint-status.yaml` key"*.
2. The Epic 8 story count corrected at **both** places that carry it: `epics.md:648` (*"14 stories … there is
   no 8.14 or 8.15"*, now stale: 8.14, 8.15 and 8.17 exist) and the progress list (*"✅ Epic 8 — 12 stories"*,
   ~`:7325`). This follows 7.11's precedent of fixing both. ⚠ Recount from the live headings; ⛔ don't
   trust these numbers.
3. PQ1's disposition (Task 0).

### AC1 — The four stages, plus the gap stage, resolved SERVER-SIDE

**Given** a member whose card is assigned (live pool `P`, cycle committed at `C`, snapshot `P.fixedAmount`)
and the Pariwar's schedule
**When** `GET /api/v1/member/active-contribution` is served
**Then** the response carries `amountTransition`, resolved by one **pure** domain function (D1). It is
exactly one of:

| `stage` | When (all instants via `deps.clock()` as `now`; months in IST) | Card copy (en sample — final words per AC6) |
|---|---|---|
| `scheduled` | nearest qualifying change `R` with `R.effectiveFrom > now` and IST month distance ≥ 2, **or** = 0 (later this month) | *"From {date}, the contribution will be ₹{amount}"* (the Month−3-onwards line) |
| `next_month` | `R.effectiveFrom > now` and `R` falls in the **next IST calendar month** | *"From next month, the contribution will be ₹{amount}"* (the Month−1 line) |
| `next_cycle` | `C < R.effectiveFrom ≤ now` (in force already, but this pool predates it: Trap 4) | *"From the next cycle, the contribution will be ₹{amount}"* |
| `first_cycle` | `P` is the **first cycle** committed under a standard row whose amount differs from its predecessor's (D5) | *"The new contribution starts with this cycle"* (the Month 0 note) |
| `null` | anything else, including "subsequent cycles" | nothing (the normal card) |

"Qualifying" `R` = the nearest schedule row with `effective_from > C`, **not moot** (AC2), with
`R.fixedAmount !== P.fixedAmount` (D6). ⛔ Emergency rows: per PQ1.

**And** the card's **current amount stays `P.fixedAmount`** in every stage. ⛔ Never the in-force or the
upcoming amount (8.2 D3).
**And** at most **one** transition line renders. If an upcoming change exists while the pool is itself a
first cycle, the **upcoming** stage wins (D7).

### AC2 — The moot-row defect is fixed at its source (Trap 1)

**Given** a standard change superseded before it took effect (zero-width: `effective_until = effective_from`)
**When** `resolveUpcomingFixedAmountChange` runs (used by the member card **and** the admin setter view)
**Then** the row is **excluded**: the filter adds `effective_until IS NULL OR effective_until > effective_from`.
**And** a live-DB test extends `pool-fixed-amount.spec.ts`'s emergency-supersedes-pending case (`:270-300`),
asserting that the upcoming read returns `null` there (and returns the ₹900 row in the same setup **before**
the emergency). **Revert-sanity:** remove the filter → the new assertion goes **red**. Record the observed
count.
**And** the admin view's `upcoming` no longer shows the moot row. Its `schedule` list still does (history).
State this in the Completion Notes as an intended behaviour change on a second surface.

### AC3 — The contract carries a stage, not a date the client must interpret

**Given** Story 8.2 D2 (*"the client resolves nothing"*)
**When** the contract changes
**Then** `upcomingAmountChange` is **replaced** (the 8.16 precedent: one resolved field replacing what the client
used to assemble) by `amountTransition: AmountTransition.nullable()`, a `.strict()` discriminated union on `stage`:
`{stage:'scheduled'|'next_month', effectiveOn: CalendarDate, newAmount}` · `{stage:'next_cycle', newAmount}` ·
`{stage:'first_cycle'}`. `CalendarDate` is the `YYYY-MM-DD` IST regex from the `appeal.ts:25-26` precedent.
Reuse a shared one if `_common/primitives.ts` has gained one, ⛔ else declare it locally as `appeal.ts` does.
⛔ No instant crosses the wire for this field.
**And** the contract header and the `AssignedContributionCard` field list (`:86`) are updated, and
`packages/contracts/tests/contributions.test.ts` (`:63`, `:158`) is updated with a **decoy leg**: an object
carrying an extra key (e.g. `changeType`, or an `effectiveFrom` instant) is **rejected** by `.strict()`
(AI-6-3-carry).
**And** every consumer of the old field is migrated in the same commit. `git grep upcomingAmountChange`
returns **zero** hits outside the `_bmad-output/` history.

### AC4 — The card renders the stage, through the real `t()`, without a second live region

**Given** the resolved `amountTransition`
**When** the card renders
**Then** the single line at `ActiveContributionCard.tsx:215-227` is replaced by one line chosen by a **pure**
module `apps/mobile/components/active-contribution/amountTransitionCopy.ts`, which maps the stage to
`{ key, a11yKey, params }` and imports **no** RN, tamagui or `@twt/i18n/react`.
**And** `{date}` is formatted from `effectiveOn` parts (`new Date(y, m-1, d)`, `hi-IN-u-nu-latn` / `en-IN`,
day + long month + year: Trap 6). `{amount}` is `newAmount.toLocaleString('en-IN')`, **without** ₹ (the ₹
is in the copy). ⛔ No `toHindiNumeral`.
**And** the line is `$body`/`$2`/`$colorPress`, `accessibilityRole="text"` with the `_a11y` label. ⛔ **Not** a
live region, ⛔ no banner, ⛔ no new colour or accent. It sits where the current line sits, directly under
the amount.
**And** `first_cycle` renders the note under the amount. The amount itself renders **unchanged**
(`formatInr(data.fixedAmount)`).
**And** `t()` is always called with `NS` (`{ namespace: 'contribution' }`).

### AC5 — Copy: new keys, both locales, gates with teeth

**Given** the stages in AC1
**When** the copy lands
**Then** `contribution.json` (en + hi) gains `active_contribution.transition.{scheduled,next_month,next_cycle,first_cycle}`
and their `_a11y` variants (8 keys). The old `active_contribution.upcoming_amount` key is **removed** from
both locales (no orphan). The hi copy uses **अंशदान**, matching `:2` / `:17` on this card.
**And** `apps/mobile/tests/unit/amount-transition-copy.test.ts` resolves **every** stage's key and `a11yKey`
through the real `import { t } from '@twt/i18n'` in **both** locales. It asserts non-empty output, no
`{` or `}` left over, exactly one `₹`, and the amount and date params present. Teeth: plant a `{{amount}}`
or a missing param and confirm it goes red, then restore.
**And** `scripts/microcopy/contribution.test.ts` gets an 8.15 `describe` block (the 8.8 `:83-142` / 8.9
`:182-223` shape) with planted scarcity, panic and blame variants of the transition copy (e.g. *"Only 3 days
left at the old amount!"*, *"URGENT: amount rising"*, *"you should have paid"*) that `checkTone` flags.
⛔ A green scan proves nothing without teeth ([[feedback_gate_scope_semantic_coverage]]).
**And** `pnpm i18n:check` and `pnpm microcopy:check` exit 0.

### AC6 — The human tone review is RECORDED, not assumed

**Given** Epic 8 retro W-5 / H-3 / AI-8-2 (8.2 was held from `done` for a missing non-author tone review)
**When** the story reaches `review`
**Then** the Completion Notes record either the **non-author** human tone-review sign-off on the final en +
hi transition copy (who, when, what was reviewed), or say plainly that it is **outstanding**.
⛔ The author never self-attests ([[feedback_record_unattested_no_backfill]]).

### AC7 — Tests prove each stage and each boundary

**Then**:
- **Pure selector** (`packages/domain/tests/pool/fixed-amount-transition.test.ts`, DB-free, table-driven like
  `tone-gradient.test.ts`): every stage; the IST month boundary (an `effectiveFrom` of `2027-03-01T00:00+05:30`
  seen at `2027-02-28T23:59+05:30` → `next_month`, and at `2027-01-31T23:59+05:30` → `scheduled`); month
  distance 0 → `scheduled`; a year rollover (Dec → Jan = `next_month`); `R.fixedAmount === P.fixedAmount` →
  `null`; upcoming-and-first-cycle → the upcoming stage (D7); a process-TZ-independence leg
  (`TZ=America/Los_Angeles`-safe by construction, no `getMonth()`); emergency legs **per the PQ1 ruling**.
- **Domain live-DB** (extend `packages/domain/tests/integration/pool/active-contribution-read.spec.ts`):
  the `first_cycle` read. First cycle after a standard change → true. The second cycle under the same row →
  false. Genesis (v1, no predecessor) → false. Same amount as the predecessor → false. Two cycles committed in
  **separate transactions** (one transaction gives equal `now()`: [[project_db_clock_ordering_tests_tie]]).
  Plus the AC2 moot-row legs.
- **API unit** (`apps/api/tests/unit/active-contribution-card.test.ts`, fixed clock `2026-07-21`): one leg per
  stage, asserting the wire shape. The upcoming read is called with **`committedAt`**, ⛔ not `now` (D3). A
  throw in the new transition reads degrades to `amountTransition: null` with a `warn` log, ⛔ **not** to
  `{assigned:false}` (D8).
- **Mobile**: AC5's real-`t()` file, plus a source-scan fence in the `self-verify-surface-render.test.ts` style.
  The card no longer references `upcomingAmountChange` or `upcoming_amount`, does not set
  `accessibilityLiveRegion` on the transition line, and every labelled `<Button>` keeps `accessible={true}`
  (`pool-name-form.test.ts:94-110` stays green).

### AC8 — Nothing else on the card moves

**Then** the tone gradient, days-remaining, confirmed-only meter, amount-raised line, yellow/red self-state,
self-verify entry, helpline CTA, Sahyog Vivran token and name form (8.16) are unchanged. Their existing
tests stay green, ⛔ unedited except for the contract-fixture field rename.

## ⚖️ Decisions (author-made unless marked; recorded here, ⛔ not in `.decision-log.md`: they rule nothing the Panel owns)

- **D1 — Server resolves; one pure function.** `selectFixedAmountTransition(input)` in a new
  `packages/domain/src/pool/fixed-amount-transition.ts`, exported via `pool/index.ts`. Input:
  `{ poolFixedAmount, poolCommittedAt, now, upcoming: {effectiveFrom, fixedAmount, changeType} | null,
  firstCycle: {isFirst: boolean, changeType} | null }`. Output: the domain-side union. The handler maps it to the
  contract **explicitly** (footgun #1: domain/contract same-named shape drift). ⛔ Not in `@twt/contracts`:
  unlike the tone band, no push or notification mentions a transition (8.8's reason for moving `toneGradient`
  does not apply). If a later story puts a transition in a push, **that** story moves it.
- **D2 — Calendar months in IST, and the far stage is dated (Trap 2).** `monthDistance = (y_eff*12+m_eff) −
  (y_now*12+m_now)` on `istCalendarDate(...)` parts. `1` → `next_month`. Otherwise (`0` or `≥2`) →
  `scheduled`, with the date. At a 90-day minimum notice a change is ≥ 2 IST months away on the day it is
  scheduled, so **Month−3 fires on announcement**, as `-124` cl.1 intends. ⚠ **Recorded deviation from UX
  spec sample copy:** *"3 चक्र बाद"* is replaced by the dated line, because no honest cycle count exists.
- **D3 — Upcoming is read as of the live pool's `committedAt`; the stage label uses `now`.** This closes Trap 4.
  `resolveUpcomingFixedAmountChange(tx, pariwarId, committedAt)`.
- **D4 — `effectiveOn` is an IST calendar date on the wire** (`istDateOf(effectiveFrom)`), ⛔ never an instant
  (Trap 6).
- **D5 — "First cycle" definition.** Let `F` = `resolveEffectiveFixedAmountRow(tx, p, C)`. `isFirst` iff `F`
  exists **and** a predecessor exists (the row in force at `F.effectiveFrom − 1ms`, by the same resolver)
  **and** `predecessor.fixedAmount !== F.fixedAmount` **and** **no** `cycle_freeze_commits` row for the Pariwar
  has `committed_at` in `[F.effectiveFrom, C)`. The new read is
  `resolveFirstCycleUnderAmount(tx, pariwarId, committedAt)` in `fixed-amount.ts` (RLS-scoped; reuse the
  in-force resolver, ⛔ no second window predicate). Pools of the **same** cycle are all "first". That is
  correct: same commit, same amount.
- **D6 — A "change" to the same amount is not a change.** `R.fixedAmount === P.fixedAmount` → `null` (e.g. an
  emergency later reverted by a standard change to the original amount). Nothing changes for the member.
- **D7 — Precedence:** `next_cycle` > `next_month` > `scheduled` > `first_cycle` > `null`. One line only.
- **D8 — Fail-soft per field, not per card.** The new reads (upcoming + first-cycle) are wrapped. On a throw
  → `amountTransition: null` + `request.log.warn(...)`, the self-verify precedent at `handlers.ts:1531-1539`.
  ⚠ This **narrows** today's behaviour (today a throw in the upcoming read blanks the whole card). The story
  intends that narrowing: a decorative line must not hide the contribute CTA.
- **D9 — Clock.** `deps.clock()` stays the instant for the stage label, consistent with `daysRemaining` on the
  same card and the unit-test clock. ⛔ No `readDbNow` here: the admin view needs one instant across two
  partitioning reads (`pool-fixed-amount/handlers.ts:207-212`), and the card's reads are anchored at `C`, a
  stored instant.
- **PQ1 — the emergency reading (Trap 5). ⛔ OPEN; Task 0.** Author's view, per the routing template's §0
  gate: **it is the Panel's.** It is what the Trust **tells members** about a change made without notice, and it
  is a choice between two readings of ratified words (`-124` cl.2). Default if ruled **A**: the selector returns
  `null` whenever `R` or `F` is `emergency`. This **removes** today's dated line for a future-dated emergency,
  a deliberate narrowing that must be recorded as such (footgun #57), ⛔ not as a cleanup. If ruled **B**: an
  emergency `R` yields `scheduled` (dated; ⛔ never `next_month`, which implies notice), and an emergency `F`
  yields `first_cycle`.

## What this story does ⛔ NOT do

- ⛔ No announcement, banner, push, WhatsApp or SMS. FR-55's channel is Story 10.5's News/Blog console. ⛔ No
  live dispatch ([[project_channels_no_live_dispatch_yet]]).
- ⛔ No change to `FIXED_AMOUNT_NOTICE_DAYS`, the emergency path, the backdating bound, `closeOpenHead`, spawn
  snapshotting, or the admin setter UI.
- ⛔ No public-surface change. Sahyog Vivran never shows a per-member amount (`2026-09-07-204`).
- ⛔ No change to the Yogdaan Bahi, the Contribution Note PDF, or the push templates.
- ⛔ No edit to ratified decision text, `ux-design-specification.md`'s premise sentence, or historical
  `epics.md` ACs. Append dated notes only ([[feedback_supersede_never_reinterpret]]).
- ⛔ No FR-6/FR-96 "12 months" rejoin-lock line in `epics.md` is touched (`-124` cl.11's trap).
- ⛔ The stale PRD UJ-6 line (*"Sets effective date 12 months out"*, `prd.md:100`, not among `-124`'s nine) is
  **observed, not fixed here**. Record it in `deferred-work.md` with an owner and re-trigger (Task 7), ⛔ not
  silently.

## Tasks / Subtasks

- [ ] **Task 0 — Governance first (AC0, PQ1). ⛔ STOP GATE for the emergency branch only.**
  - [ ] BigDev applies the routing template's §0 gate to PQ1 (author's view: the Panel's).
  - [ ] If it is the Panel's: write `_bmad-output/planning-artifacts/trustee-panel-routing-note-YYYY-MM-DD-story-8-15.md`
        **from the template, in its order**: one plain-English question (*"When the trustees change the
        contribution in an emergency, should the member's card say anything about it — the date it changes, or
        a note on the first pool at the new amount — or nothing at all?"*), the one fact that decides it (the
        `-124` cl.2 sentence, with its two readings), options A/B with an honest cost on each (A: a member
        meets a changed amount with no in-app word; B: the card states a fact about a change made without
        notice, ⛔ never "from next month"), and evidence **last**. ⛔ Not "shown to the Panel" until it is
        sent ([[feedback_shown_to_panel_means_sent]]).
  - [ ] If BigDev rules it is theirs: record it as a BigDev author-commit in this file's Decisions section.
  - [ ] The `governance(8.15):` commit: the `epics.md` entry + both counts (AC0), the routing note if any.
        ⛔ No code.
  - [ ] Tasks 1–6 for **standard** changes may proceed in parallel. ⛔ The emergency legs of Task 2 and Task 6
        land only after the ruling is transcribed (into `.decision-log.md` as a new id if the Panel rules; the
        decision-log write is user-inserted if refused: [[project_decision_log_writes_user_inserted]]).
- [ ] **Task 1 — Moot-row fix (AC2).**
  - [ ] `resolveUpcomingFixedAmountChange`: add the `effective_until IS NULL OR effective_until > effective_from`
        conjunct. Update its doc-block (it now names both consumers and the moot-row exclusion).
  - [ ] Extend `pool-fixed-amount.spec.ts:270-300` per AC2. Revert-sanity, with observed counts.
  - [ ] Check that `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts:466-490` (admin
        `upcoming`) stays green. Add one admin leg showing that the moot row is absent from `upcoming` and
        present in `schedule`.
- [ ] **Task 2 — The pure selector + first-cycle read (AC1, D1–D7).**
  - [ ] `packages/domain/src/pool/fixed-amount-transition.ts` with `selectFixedAmountTransition`; IST parts via
        `istCalendarDate` (import from `cycle-calendar`; check `pool/` → `cycle-calendar/` imports for a cycle,
        [[project_type_only_import_cycle_trap]]). Export via `pool/index.ts`.
  - [ ] `resolveFirstCycleUnderAmount(tx, pariwarId, committedAt)` in `fixed-amount.ts` per D5. Query
        `cycle_freeze_commits` by `pariwar_id` + `committed_at` range (`cycle_freeze_commits_committed_at_idx` indexes `committed_at` alone; RLS scopes the Pariwar).
  - [ ] DB-free unit file per AC7 (standard legs now; emergency legs after PQ1).
- [ ] **Task 3 — Contract (AC3).**
  - [ ] `AmountTransition` union + `CalendarDate`; replace the field; header + field-list comments;
        `contributions/README.md` if it lists fields.
  - [ ] `contributions.test.ts` fixtures + decoy legs. Run `pnpm --filter @twt/contracts test`
        ([[project_contracts_tests_outside_tsc]]: fixtures are outside `tsc`, so the test run is the check).
  - [ ] `pnpm contracts:check-openapi-determinism`. If the member route is in `openapi/v1.yaml`, regenerate and
        commit; if not, record that it is byte-identical.
- [ ] **Task 4 — Handler (AC1, D3, D8, D9).**
  - [ ] Replace step (9) at `handlers.ts:1500-1502`: upcoming at `committedAt`; first-cycle read; the selector;
        explicit map to the contract. Wrapped fail-soft per D8.
  - [ ] Update the file header line `:16` (*"upcoming amount"*) and the step comment.
  - [ ] `active-contribution-card.test.ts` legs per AC7: mock the new domain read; the `committedAt` argument
        assertion; the fail-soft leg.
- [ ] **Task 5 — Mobile (AC4).**
  - [ ] `amountTransitionCopy.ts` (pure) + an `effectiveOn` formatter (local `Date(y, m-1, d)`).
  - [ ] Replace `:215-227` in the card. Keep `formatDate` only if something still uses it; ⛔ no dead helper.
        Update the header comment block (`:18-21` numeral discipline mentions the upcoming-change date).
  - [ ] `api-client` types follow the contract automatically. Confirm `pnpm --filter @twt/mobile typecheck`
        ([[project_mobile_typed_routes_worktree]]: in a worktree without `.expo/types`, `tsc` skips `Href`,
        so this does not prove routes).
- [ ] **Task 6 — Copy + gates (AC5, AC6).**
  - [ ] 8 new keys en + hi, sorted. Remove `upcoming_amount` from both.
  - [ ] `amount-transition-copy.test.ts` (real `t()`); the microcopy 8.15 block with teeth.
  - [ ] Request the non-author tone review. Record the outcome or "outstanding" (AC6).
- [ ] **Task 7 — Records.**
  - [ ] `deferred-work.md`: close the "⭐ Story 7.11 — UX-DR25 …" entry **in its own vocabulary**: "Closed by
        [implementation]" for the standard stages, naming D2's dated-copy deviation, and the emergency half per
        PQ1. Fix its heading's stale *"OWNED BY STORY 8.2"* with an appended dated note, ⛔ not a rewrite. Append
        the Trap 1 moot-row finding as "Closed by [edit]". Add the PRD UJ-6 observation (owner + re-trigger).
  - [ ] `ux-design-specification.md:987-995`: append a dated note (built by 8.15; stages anchored to IST months;
        "3 चक्र बाद" replaced by a date and why; the `next_cycle` addition; the emergency ruling). ⛔ No rewrite.
  - [ ] `epics.md` UX-DR25 (`:425-432`) and Story 8.2's AC (`:4129-4136`): an appended dated note pointing at 8.15.
  - [ ] Friction budget: run `pnpm friction:check` and record the disposition (the 8.17 Task 6 shape)
        ([[project_friction_budget_baseline_ratchet]]).
- [ ] **Task 8 — Verify.**
  - [ ] `npx turbo run typecheck lint --filter=@twt/domain --filter=@twt/contracts --filter=@twt/api --filter=@twt/mobile`
  - [ ] DB-free: domain pure, api unit, contracts, mobile unit, `pnpm i18n:check`, `pnpm microcopy:check`,
        `pnpm microcopy:test`.
  - [ ] Live DB on **:5433**: `DATABASE_URL=postgres://…:5433/… pnpm turbo run test --concurrency=1
        --filter=@twt/domain --filter=@twt/api`. ⚠ A green run without `DATABASE_URL` **skips** integration;
        record pass counts.
  - [ ] `pnpm ci:local` before push. Push with `DATABASE_URL` set to :5433 explicitly
        ([[project_prepush_hook_inherits_5432]]). Known reds: [[project_known_livedb_test_failures]].

### Review Findings

_(none yet)_

## Dev Notes

### Why each stage is the size it is (the arithmetic, so a reviewer need not re-derive it)

- At the 90-day floor, a change scheduled on day D lands ≥ 90 days out, which is ≥ 2 IST calendar months
  ahead (the smallest case: scheduled 31 Mar, effective 29 Jun → distance 3; scheduled 1 Dec, effective
  1 Mar → distance 3). ⇒ `scheduled` on announcement, then `next_month` for the whole calendar month before,
  then `next_cycle` only if a live window straddles `effective_from`, then `first_cycle` on the first pool
  committed under it.
- Distance `0` (effective later **this** month) happens only for a change already past `next_month`, i.e. the
  member is in the effective month but before the day. "From next month" would be false there, so it is
  dated.
- The card is only visible during live windows (Trap 3). The member sees whichever stage is true on the day
  they look.

### Current state of each file this story touches (read before editing)

- **`fixed-amount.ts`**: preserve the 90-day doc-block, `closeOpenHead`'s max-clamp semantics (7.5 review) and
  the advisory-lock order. Only `resolveUpcomingFixedAmountChange`'s WHERE clause and one new read change.
- **`handlers.ts` (member-pool)**: `resolveCard` is a long fail-soft pipeline. Preserve every other step's
  order and its `UNASSIGNED` returns. Step (9) is the only one replaced.
- **`active-contribution-card.ts`**: `.strict()` everywhere. The contract forbids widening `progress`.
  ⛔ Don't touch `progress`, `myContribution`, `mismatchReason`, `sahyogVivranToken`, `deceasedDisplayName`.
- **`ActiveContributionCard.tsx`**: one live region; `accessible={true}` on every labelled `<Button>`;
  `markLoopPhase('card_render')` effect keyed on `data?.assigned` (8.12). ⛔ Don't add deps that re-fire it.
  `useT()` is a fresh closure, so if anything is memoised, depend on `locale`, ⛔ not `t`
  ([[project_uset_fresh_closure_memo_trap]]).

### Testing standards

Vitest everywhere. Domain pure tests have no DB. Integration specs gate on `DATABASE_URL`, run on :5433, and
use transaction-rollback isolation. Mobile is node-only `tests/unit/**/*.test.ts`, with no `.tsx`, no RN
mount, mocks for `lib/mmkv` if imported, and an RTL `cleanup` if jsdom is opted into
([[project_mobile_vitest_and_expo_install_traps]]). Every new interpolated key gets a real-`t()` leg. Every
gate claim gets teeth (plant → red → restore), with the observed counts recorded.

### Project Structure Notes

- New: `packages/domain/src/pool/fixed-amount-transition.ts`; `packages/domain/tests/pool/fixed-amount-transition.test.ts`;
  `apps/mobile/components/active-contribution/amountTransitionCopy.ts`; `apps/mobile/tests/unit/amount-transition-copy.test.ts`.
- Modified: `packages/domain/src/pool/{fixed-amount.ts,index.ts}`; `packages/contracts/src/contributions/active-contribution-card.ts`;
  `packages/contracts/tests/contributions.test.ts`; `apps/api/src/modules/member-pool/handlers.ts`;
  `apps/api/tests/unit/active-contribution-card.test.ts`; `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`;
  `packages/i18n/locales/{en,hi}/contribution.json`; `scripts/microcopy/contribution.test.ts`; the two
  integration specs; `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts`; records per Task 7.
- ⛔ No migration. ⛔ No new package (a second consumer does not exist: [[feedback_no_premature_package]]).
- Prettier is not enforced; hand-format to the surrounding style ([[project_prettier_not_enforced]]).

### References

- `_bmad-output/planning-artifacts/ux-design-specification.md:985-997` (fixed-amount transition pattern + 2026-08-16 note)
- `_bmad-output/planning-artifacts/epics.md:425-432` (UX-DR25), `:4115-4136` (Story 8.2 AC + note), `:648` and ~`:7325` (Epic 8 counts), `:4395`/`:4456` (8.16/8.17 entry shape), `:4034-4076` (7.11 entry shape)
- `.decision-log.md` — `2026-08-16-124` (cl.1 floor 90 + UX-DR25 ground; cl.2 policy guarantee + "emergency has no stages"; cl.3 §4.2 text; cl.11 rejoin-lock trap; cl.13); `2026-08-16-125` (cl.1 in force; cl.2 emergency over pending standard is legal); `2026-08-16-123` (cl.7, cl.8, cl.9)
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — glossary `:144`; FR-15 `:474-482`; FR-55 `:874-876`; SM-C4 `:1405`; alert = monthly `:136`; UJ-6 `:100` (stale)
- `_bmad-output/implementation-artifacts/deferred-work.md` — the "⭐ Story 7.11 — UX-DR25 …" entry (owner = this story); 10.13 AC7(a) FR-55 closure
- `_bmad-output/implementation-artifacts/7-11-fixed-amount-notice-period-and-fixed-period-reconciliation.md` — Q6 `:169`, F-4 `:182-192`, AC9 `:321-340`, the mint `:765-781`
- `_bmad-output/implementation-artifacts/8-2-active-contribution-card-my-pool-card-progress-meter-15-day-tone-gradient.md` — AC6 `:85-89`, D2 `:160`, D3 `:162-163`, D9 tone review `:187`
- `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md`, `8-17-nominee-vpa-on-the-payment-screen.md` — structure, `accessible={true}`, NS-required `t()`, verification commands
- `_bmad-output/implementation-artifacts/epic-8-retro-2026-07-25.md` — W-5, H-3, AI-8-2, AI-6-3-carry
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` — §0 gate, order
- Code: `packages/domain/src/pool/fixed-amount.ts:69,126,226,277-294,341-400,508`; `packages/domain/src/pool/spawn.ts:312`; `packages/domain/src/schema/{pool_fixed_amount_schedule,cycle_freeze_commits,pools}.ts`; `packages/domain/src/cycle-calendar/holiday-resolver.ts:164`; `apps/api/src/modules/member-pool/handlers.ts:1330-1403,1500-1568`; `apps/api/src/modules/pool-fixed-amount/handlers.ts:200-235`; `packages/contracts/src/contributions/active-contribution-card.ts`; `packages/contracts/src/claims/appeal.ts:25-26`; `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`; `packages/i18n/locales/{en,hi}/contribution.json`; `microcopy.yaml:55-146,361-369`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Context engine analysis completed. This is a comprehensive developer guide, created 2026-10-22 by bmad-create-story off `b883dc15`.

### File List

## Change Log

| Date | Version | Description |
|---|---|---|
| 2026-10-22 | 1.0 | Created by `bmad-create-story 8-15` in its worktree, off `b883dc15` (== origin/main). Status backlog → ready-for-dev. Found and scoped a reachable pre-existing defect (Trap 1: a superseded change still shows as "upcoming" on the member card and the admin view). Anchored the stages to IST calendar months, because cycles cannot be counted (Trap 2). Added a `next_cycle` stage for the in-window gap (Trap 4). Routed the emergency reading as PQ1 (Trap 5). Authoring only: no code, no gate run. |
