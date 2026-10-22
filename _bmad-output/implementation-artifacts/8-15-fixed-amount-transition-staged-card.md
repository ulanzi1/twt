---
baseline_commit: b883dc15
---

# Story 8.15: Fixed-Amount Transition — the Staged My Pool Card (UX-DR25) `[SURFACE]`

Status: ready-for-dev

<!-- v1.0 2026-10-22 — created by bmad-create-story off `b883dc15` (== origin/main, fetched). Authoring
pass only: no code written, no gate run, nothing here attested by a test.
v1.1 2026-10-22 — validated against the code and the governance record (Change Log). Still authoring only. -->

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
  re-trigger could never fire. The two records name different actors: the 7.11 story (`:779`) says
  *"BigDev may rename, fold or decline it"*, and `deferred-work.md:9196` says *"The Panel may rename it, fold it
  into another story, or decline it"*. Neither has (verified: no decision entry since `-125` mentions 8.15). **There is no `### Story 8.15:`
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
| The server read | `apps/api/src/modules/member-pool/handlers.ts:1500-1502` (step 9), `:1567-1568` | `poolDomain.resolveUpcomingFixedAmountChange(tx, pariwarId, now)`, where `now` is `ctx.now` = `deps.clock()` (JS clock, `apps/api/src/deps.ts:639`). **The call is not wrapped:** a throw reaches the catch in `activeContribution` (`:146-151`), which returns `UNASSIGNED`. `tx` is a real Postgres transaction (`openScopeTx`: `BEGIN` + `SET LOCAL ROLE twt_app` + Pariwar scope). |
| The domain read | `packages/domain/src/pool/fixed-amount.ts:277-294` | Returns the **whole row** (so `changeType` is available) nearest with `effective_from > asOf`, ordered `effective_from ASC, version ASC`, `LIMIT 1`. **Change-type-blind, and it does not exclude moot (zero-width) rows.** See Trap 1. Callers: the member card and the admin setter view (`pool-fixed-amount/handlers.ts:219`), no others. |
| The schedule | `packages/domain/src/schema/pool_fixed_amount_schedule.ts`; migration `0075` | Per **Pariwar** (not per pool). Columns `version`, `fixed_amount`, `effective_from`, `effective_until` (NULL = open head), `change_type` (`standard`/`emergency`). RLS on `pariwar_id`. |
| The in-force resolver | `fixed-amount.ts:126` (pure `selectEffectiveFixedAmountRow`), `:226` (`resolveEffectiveFixedAmountRow(db, p, asOf)`) | The row in force at an instant: `from` inclusive, `until` exclusive. Deterministic for past instants. |
| The snapshot | `packages/domain/src/pool/spawn.ts:312` | `getEffectiveFixedAmount(tx, pariwarId, commit.committedAt)`, written into `pools.fixed_amount`. `committedAt` is the `cycle_freeze_commits.committed_at` column default, i.e. DB `now()` of the freeze transaction. ⛔ **No FK or version id links a pool to its schedule row** (`pools.ts:188-193`). Re-resolving at the cycle's `committed_at` recovers the row the pool was snapshotted under **only while no backdated emergency covers that instant**: an emergency with `effective_from ≤ committed_at` (legal under `-125` cl.1) makes the re-resolve return the emergency row while the pool still holds the old amount. `pools.fixed_amount` is the only fact; see D5. |
| The notice floor | `fixed-amount.ts:69` `FIXED_AMOUNT_NOTICE_DAYS = 90` | Its doc-block already says it is 90 *so that UX-DR25's Month-3 stage can fire*. ⛔ Not touched. |
| The emergency path | `fixed-amount.ts:508` `applyEmergencyOverride` | No notice floor. `effective_from` must be `>=` the in-force row's (`-125` cl.1). **A future-dated emergency is legal**, since only a lower bound exists, and so is an emergency superseding a pending standard change (`-125` cl.2). |
| Live pool + cycle | `handlers.ts:1328-1388` `resolveMemberLivePool`; `resolveCard` `:1391-1575` | `resolveMemberLivePool` returns `{ pool, committedAt, poolCount, cycleId, alertId }` (`:1378-1384`) for the D7-chosen live pool, or `null`; `resolveCard` destructures it at `:1403` and returns `UNASSIGNED` on `null` (`:1401`). |
| IST calendar parts | `packages/domain/src/cycle-calendar/holiday-resolver.ts:164` `istCalendarDate(instant)`; `:178` `istDateOf(instant)` | Pure, process-timezone-independent. `istCalendarDate` gives `{year, month, day}` in IST (use it for month arithmetic); **`istDateOf` already returns the `YYYY-MM-DD` IST string** (use it for D4). ⛔ Don't write another IST helper (there are already copies in `member/workplace.ts`, `contribution/facts.ts`, `pool/spawn.ts`). ⛔ Never `getMonth()` and never `Intl` on the server. Import via `../cycle-calendar/holiday-resolver.js`: no runtime cycle (`cycle-calendar/` imports nothing from `pool/`), precedent `helpdesk/routing.ts:18`. |
| Calendar-date wire shape | `packages/contracts/src/claims/contact-ladder.ts:15-26` (`isRealCalendarDate` exported, `IsoDate` local) | The precedent for sending a date as an IST calendar date instead of an instant. Use the **regex + `.refine(isRealCalendarDate)`** shape (it rejects `2026-02-30`); `members/known-people.ts:22` already imports `isRealCalendarDate` across directories. ⛔ Not `appeal.ts:25-26`'s regex-only `CalendarDate`, which accepts impossible dates. `_common/primitives.ts` has no shared date schema. |
| Copy catalog | `packages/i18n/locales/{en,hi}/contribution.json:17` | `contribution` namespace, flat dotted keys (the `active_contribution.*` block is sorted; `transition.*` sorts after `tone.*`, at today's `:17` slot), `{param}` single braces. ⚠ The old `upcoming_amount` key has **no** `_a11y` variant and the line has no `accessibilityLabel` today. hi uses **अंशदान** on this card's **amount lines** (`:2`, `:5`, `:8`, `:9`, `:17`); the CTA and tone copy use योगदान. |
| Gates | `pnpm i18n:check` (parity), `pnpm microcopy:check` / `microcopy:test` (`microcopy.yaml:361-369` already globs `contribution.json`) | New keys are scanned automatically. Their teeth live in `scripts/microcopy/contribution.test.ts`. |
| Real-`t()` copy test pattern | `apps/mobile/tests/unit/closed-copy-resolves.test.ts` | A pure key table resolved through `import { t } from '@twt/i18n'`, locale passed per call (`t(key, params, { locale, namespace })`). `t()` (`packages/i18n/src/resolver.ts:33-64`) throws on a missing param or key, but a planted `{{amount}}` does **not** throw: it renders `₹{600}`. Only a "no `{`/`}` left" assertion catches that. |
| Savepoint helper | `apps/api/src/modules/claims/later-approval-warnings.ts:181` `underSavepoint(client, name, read)` | Runs a read under a raw `SAVEPOINT` so a SQL error does not abort the scope tx. Only needed if a wrapped read cannot be placed last (D8). |
| Pure-selector test pattern | `apps/mobile/tests/unit/tone-gradient.test.ts` | Table-driven boundaries, clamps, no RN imports. |

## ⛔ THE TRAPS

### Trap 1 — Today's read can announce an amount that will NEVER apply (REACHABLE, pre-existing)

`closeOpenHead` case (2) (`fixed-amount.ts:374-399`) closes a superseded **future** head at **its own**
`effective_from`, which leaves a zero-width window that can never be in force. No CHECK forbids it (migrations
0075/0077 carry only `version >= 1` and the amount bounds). `resolveUpcomingFixedAmountChange` filters only
`effective_from > asOf`, so **that moot row is still returned as "upcoming"**. Case (1) (`:362-372`) can make a
zero-width row too: an emergency whose `effective_from` **equals** the in-force row's (legal: the bound is `>=`)
clamps that row to `[from, from)`. The AC2 filter covers both.

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

`resolveMemberLivePool` returns `null` when nothing is live (`handlers.ts:1340-1341`), and `resolveCard` turns
that into `UNASSIGNED` (`:1401`). A stage is
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

Three cases are reachable today:
- **(i)** a **future-dated** emergency, which has some lead time (only a lower bound exists). The current
  card shows it with the un-staged dated line.
- **(ii)** the first pool **after** an emergency took effect. The member's amount changed with no notice;
  a first-cycle note would explain it.
- **(iii)** an emergency that takes effect **inside a live window** (`C < E.effectiveFrom ≤ now`, the
  `next_cycle` situation of Trap 4). The live pool still carries the old snapshot.

Reading A: "no stages" means **no transition copy at all** for an emergency. Reading B: "no stages" means
no **notice-implying** pre-stages (no "from next month"), but a plain dated fact for (i), the
`next_cycle` fact for (iii) and the first-cycle note for (ii) are allowed, because none implies a warning
that was not given.

⚠ Provenance caveat for the note: the *"no stages"* sentence sits in the **body** of `-124` cl.2 (`:16784`),
but cl.2's provenance row (`:16756`) records only the four-stage guarantee. Whether the emergency sentence is
itself ratified wording is arguable, and the note says so.

Decision `2026-08-16-125` cl.3 (`:16721`) applies verbatim: *"choosing between two readings of ratified words
is not a developer's call"*. ⇒ **PQ1, Task 0.** ⛔ Do not resolve it in code by picking one.
✅ **Ruled 2026-10-22: B** (Decision `2026-10-22-383`). Build the mapping in PQ1.

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
tone-gradient `Paragraph` (`:249`) is the card's only `accessibilityLiveRegion="polite"` (8.2 review), but
`<StatusPill>` is also announced via its `live={!showSelfVerify}` prop in the red/yellow states (`:304`, `:327`;
documented at `:288-295`). ⛔ The transition line is **not** a live region, and ⛔ don't touch the pill's
`live`. A fence that counts `accessibilityLiveRegion` across the file cannot see the pill: scope it to the
transition line's element.

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
   no 8.14 or 8.15"*) and the progress list (*"✅ Epic 8 — 12 stories"*, `:7325`). This follows 7.11's
   precedent of fixing both. The count is the **`epics.md` entries**: 15 `### Story 8.N` headings today
   (8.1–8.13, 8.16, 8.17), so **16** once 8.15 lands. ⚠ 8.14 (*Close-of-Cycle Emitter*, `done`) has a story
   file and a sprint key but **no `epics.md` entry**, so sprint-status carries **17** Epic 8 keys. Both
   corrected lines say so in an appended dated note: *"16 entries; 8.14 has no `epics.md` entry (observed by
   8.15, not fixed here)"*. ⛔ Don't add an 8.14 entry in this story. ⚠ Re-count the headings before writing;
   ⛔ don't trust these numbers.
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
`R.fixedAmount !== P.fixedAmount` (D6), filtered **in SQL** so a nearer non-qualifying row never hides a later
qualifying one. ⛔ Emergency rows: per PQ1.

**And** the card's **current amount stays `P.fixedAmount`** in every stage. ⛔ Never the in-force or the
upcoming amount (8.2 D3).
**And** at most **one** transition line renders. If an upcoming change exists while the pool is itself a
first cycle, the **upcoming** stage wins (D7).

### AC2 — The moot-row defect is fixed at its source (Trap 1)

**Given** a standard change superseded before it took effect (zero-width: `effective_until = effective_from`)
**When** `resolveUpcomingFixedAmountChange` runs (used by the member card **and** the admin setter view)
**Then** the row is **excluded**: the filter adds `effective_until IS NULL OR effective_until > effective_from`.
**And** a live-DB test extends `pool-fixed-amount.spec.ts`'s emergency-supersedes-pending case (test (g),
`:263-343`), asserting that the upcoming read returns `null` there (and returns the ₹900 row in the same setup
**before** the emergency). ⚠ Test (g) applies the emergency at a **JS** `now = new Date()`. Read upcoming with
an `asOf` **≥ that `now`**: at the DB `now()` (the transaction start, which is earlier) the ₹750 emergency row
itself is still "upcoming" and the assertion fails for the wrong reason. A second leg covers case (1): an
emergency at the **same** `effective_from` as the in-force row leaves that row zero-width, and it is not
returned. **Revert-sanity:** remove the filter → both new assertions go **red**. Record the observed count.
**And** the admin view's `upcoming` no longer shows the moot row. Its `schedule` list still does (history).
State this in the Completion Notes as an intended behaviour change on a second surface.

### AC3 — The contract carries a stage, not a date the client must interpret

**Given** Story 8.2 D2 (*"the client resolves nothing"*)
**When** the contract changes
**Then** `upcomingAmountChange` is **replaced** (the 8.16 precedent: one resolved field replacing what the client
used to assemble) by `amountTransition: AmountTransition.nullable()`, a `.strict()` discriminated union on `stage`:
`{stage:'scheduled'|'next_month', effectiveOn: CalendarDate, newAmount}` · `{stage:'next_cycle', newAmount}` ·
`{stage:'first_cycle'}`. `CalendarDate` = `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isRealCalendarDate)`,
declared locally with `isRealCalendarDate` imported from `../claims/contact-ladder.js` (the `IsoDate` shape).
Reuse a shared one only if `_common/primitives.ts` has gained one since. ⛔ No instant crosses the wire for
this field. (Zod is v3, `^3.23.0`; `z.discriminatedUnion` + `.strict()` is the file's existing idiom, `:174`.)
**And** two consequences are understood, not discovered: (a) the route serialises through
`fastify-type-provider-zod` (`member-pool/routes.ts:52`), so a mapped object that fails `.strict()` is a **500**,
⛔ not the D8 fail-soft; the explicit map must be exact. (b) `api-client` parses the response with
`schema.parse` (`packages/api-client/src/index.ts:301`), so an older app build rejects the new shape and its
card self-suppresses. Nothing is in production, so this is accepted; record it in the Completion Notes.
**And** the contract header, the `AssignedContributionCard` field list (`:86`) and the `api-client` comment
(`packages/api-client/src/index.ts:578`, *"optional upcoming-amount line"*) are updated, and
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
**And** the line is `$body`/`$2`/`$colorPress`, `accessibilityRole="text"`, with a **new**
`accessibilityLabel` from the `_a11y` key (the current line has none). ⛔ **Not** a live region, ⛔ no banner,
⛔ no new colour or accent. It sits where the current line sits, directly under the amount.
**And** the card's local `formatDate` (`:63-75`) and the `useLocale()` call (`:79`) are **deleted**: both are
used only by the old line (`:221`), and the new formatter lives in `amountTransitionCopy.ts`. ⛔ No dead helper.
**And** `first_cycle` renders the note under the amount. The amount itself renders **unchanged**
(`formatInr(data.fixedAmount)`).
**And** `t()` is always called with `NS` (`{ namespace: 'contribution' }`).

### AC5 — Copy: new keys, both locales, gates with teeth

**Given** the stages in AC1
**When** the copy lands
**Then** `contribution.json` (en + hi) gains `active_contribution.transition.{scheduled,next_month,next_cycle,first_cycle}`
and their `_a11y` variants (8 keys). The old `active_contribution.upcoming_amount` key is **removed** from
both locales (no orphan). `pnpm i18n:check` is **parity only** (it never flags an unused or a missing-in-code
key), so "no orphan" is proven by the `git grep` in AC3 and the mobile fence in AC7, ⛔ not by the gate.
The hi copy uses **अंशदान**, matching the card's other amount lines (`:2`, `:17`).
**And** `apps/mobile/tests/unit/amount-transition-copy.test.ts` resolves **every** stage's key and `a11yKey`
through the real `import { t } from '@twt/i18n'` in **both** locales. Every output is non-empty with no `{`
or `}` left over. Then, **per stage**:

| stage | `₹` count | amount present | date present |
|---|---|---|---|
| `scheduled` | exactly 1 | yes | yes |
| `next_month` | exactly 1 | yes | no |
| `next_cycle` | exactly 1 | yes | no |
| `first_cycle` | 0 | no (the amount renders above it) | no |

Teeth: plant a `{{amount}}` (renders `₹{600}` without throwing; the brace assertion must catch it) and a
missing param (throws), confirm each goes red, then restore.
**And** `scripts/microcopy/contribution.test.ts` gets an 8.15 `describe` block (the 8.8 `:83-142` / 8.9
`:182-223` shape, `checkTone(FILE, '{ "k": "…" }', config)` from `scripts/microcopy/lib.ts:353`; findings carry
`kind`) with planted variants of the transition copy that `checkTone` flags. **en** (verified against today's
patterns): *"Only 3 days left at the old amount!"* (scarcity), *"URGENT: amount rising"* (panic), *"you should
have paid"* (out-of-band-blame). **hi**: there are **no** hi scarcity or panic patterns (*"केवल 3 दिन बचे"* is
not flagged), so the hi plants use the blame (`चाहिए था` near दान) or fursat-pressure (`जल्दी कर`, `अभी कर`)
arms. Also assert the final en + hi copy is clean.
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
- **Domain live-DB** (extend `packages/domain/tests/integration/pool/active-contribution-read.spec.ts`; it
  seeds no commits today and `_helpers.ts` has no commit seeder, so insert `schema.cycleFreezeCommits` and
  `schema.pools` rows raw with an **explicit `committedAt`**, the `pool-fixed-amount.spec.ts:63-69` shape. The
  suite is rollback-isolated, so "separate transactions" is not available; explicit, distinct `committedAt`
  values are the fix for [[project_db_clock_ordering_tests_tie]]). The `first_cycle` read (D5):
  - first cycle after a standard change → true; the second cycle under the same row → false;
  - genesis (v1, no predecessor) → false; same amount as the predecessor → false;
  - a **zero-claim** commit (no pools) between `F.effectiveFrom` and `C` does **not** suppress it → true;
  - a **backdated emergency** with `E.effectiveFrom ≤ C` while the pool holds the old amount →
    false (the `P.fixedAmount === F.fixedAmount` guard). Revert-sanity on each of these two guards.
  - Plus the AC2 moot-row legs, and the D6 leg: a nearer same-amount row does not hide a later differing one.
- **API unit** (`apps/api/tests/unit/active-contribution-card.test.ts`, clock `2026-07-21T00:00:00Z` at `:100`):
  ⚠ the `vi.mock('@twt/domain')` at `:33-71` spreads `...actual.pool`, so an **unmocked** new read runs for real
  against `tx: {}`, throws a TypeError, and D8 silently returns `null`: every stage leg would pass as `null`.
  Add `resolveFirstCycleUnderAmount` to the `pool:` override, and make each stage leg assert its **non-null**
  stage. One leg per stage, asserting the wire shape. The upcoming read is called with **`committedAt`**, ⛔ not
  `now` (D3). A throw in the transition reads degrades to `amountTransition: null` with a `warn` log, ⛔ **not**
  to `{assigned:false}` (D8). ⚠ This leg mocks `tx`, so it cannot prove the transaction-abort half of D8:
  that rests on the read **order** (assert it in a source-scan or by call-order on the mocks).
  `apps/api/tests/unit/contribution-history.test.ts` (`:31`, `:51`, `:472`) also drives `activeContribution`
  with a mocked `@twt/domain`: add the same mock there.
- **Mobile**: AC5's real-`t()` file, plus a source-scan fence in the `self-verify-surface-render.test.ts` style
  (comment-stripped `readFileSync`; it already scans the card at `:104`). The card no longer references
  `upcomingAmountChange`, `upcoming_amount` or `formatDate`; the transition line's element sets no
  `accessibilityLiveRegion` (scope the check to that element: Trap 8); and every labelled `<Button>` keeps
  `accessible={true}` (`pool-name-form.test.ts:94-110` stays green).
- **Live route**: `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts:56` calls
  `/api/v1/member/active-contribution` against the live DB, so it runs the new reads end to end. It needs no
  edit; it must stay green.

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
  `resolveUpcomingFixedAmountChange(tx, pariwarId, committedAt, { excludeAmount: pool.fixedAmount })` (D6).
- **D4 — `effectiveOn` is an IST calendar date on the wire**, via the **existing**
  `istDateOf(effectiveFrom)` (`holiday-resolver.ts:178`), ⛔ never an instant (Trap 6), ⛔ never a new helper.
- **D5 — "First cycle" definition.** Let `F` = `resolveEffectiveFixedAmountRow(tx, p, C)`. `isFirst` iff **all** of:
  1. `F` exists, and `P.fixedAmount === F.fixedAmount`. This guards the backdated emergency: an emergency `E`
     with `E.effectiveFrom ≤ C`, written after the pool was spawned, makes `F = E` while `P` still holds the old
     amount. Without the guard the card would tell a member on a ₹500 pool that "the new contribution starts
     with this cycle".
  2. A predecessor exists (the row in force at `F.effectiveFrom − 1ms`, by the same resolver; zero-width rows
     never match, so moot rows are skipped), and `predecessor.fixedAmount !== F.fixedAmount`.
  3. **No pool** of the Pariwar belongs to a cycle with `committed_at` in `[F.effectiveFrom, C)`: join `pools.cycle_id`
     → `cycle_freeze_commits.commit_id` (`pools.ts:134`). ⛔ Not a bare `cycle_freeze_commits` count: a commit
     with zero claims is writable (`state-trustee-decision-persist.ts:1398` has no emptiness guard) and spawns
     no pools, so counting commits would wrongly suppress the note.

  The new read is `resolveFirstCycleUnderAmount(tx, pariwarId, { committedAt, poolFixedAmount })` in
  `fixed-amount.ts` (RLS-scoped on both tables; reuse the in-force resolver, ⛔ no second window predicate).
  Pools of the **same** cycle are all "first". That is correct: same commit, same amount. ⚠ Known residue:
  if a backdated emergency **does** match the pool's snapshot, the predecessor is read from the schedule, not
  from the previous pool, and may not be the amount the member last paid. It is reachable only for emergency
  `F`, so it matters only if PQ1 is ruled B; record it there.
- **D6 — A "change" to the same amount is not a change.** `R.fixedAmount === P.fixedAmount` → no stage (e.g. an
  emergency later reverted by a standard change to the original amount). Nothing changes for the member.
  ⚠ The existing read is `LIMIT 1`, so a post-filter would let a nearer same-amount row **hide** a later real
  change and suppress its notice. ⇒ `resolveUpcomingFixedAmountChange` gains an optional options bag,
  `{ excludeAmount?: number; standardOnly?: boolean }`, applied **in the WHERE clause** alongside the AC2
  moot-row conjunct, so the filter lives in one place. The admin view calls it without options (unchanged).
  `standardOnly` exists for PQ1 = A.
- **D7 — Precedence:** `next_cycle` > `next_month` > `scheduled` > `first_cycle` > `null`. One line only.
- **D8 — Fail-soft per field, not per card, and placed LAST.** The two new reads (upcoming + first-cycle) are
  wrapped in one `try`/`catch`. On a throw → `amountTransition: null` + `request.log.warn(...)`, the
  self-verify precedent at `handlers.ts:1531-1539`. ⚠ **A wrap alone is not enough.** `tx` is a real Postgres
  transaction, so a SQL error aborts it and every later statement fails with `25P02`. Today step 10
  (`hasAttestedContribution`, `:1509`) is unwrapped and would then fail, sending the whole card to
  `{assigned:false}` anyway. The self-verify `try` is safe only because it is the **last** DB read before the
  return. ⇒ **Move step (9) to run after self-verify** (after `:1539`, before the `return`), so the transition
  reads are the last statements in the transaction. ⛔ Don't add a DB read after them. If a later story must
  read after them, wrap them in `underSavepoint` (`claims/later-approval-warnings.ts:181`, needs
  `scopeTx.client` passed into `resolveCard`). ⚠ This **narrows** today's behaviour (today a throw in the
  upcoming read blanks the whole card). The story intends that narrowing: a decorative line must not hide the
  contribute CTA.
- **D9 — Clock.** `deps.clock()` stays the instant for the stage label, consistent with `daysRemaining` on the
  same card and the unit-test clock. ⛔ No `readDbNow` here: the admin view needs one instant across two
  partitioning reads (`pool-fixed-amount/handlers.ts:213`), and the card's reads are anchored at `C`, a
  stored instant.
- **PQ1 — the emergency reading (Trap 5). ✅ RULED 2026-10-22: B** — Decision `2026-10-22-383`, trustee-ratified
  (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev: *"by DR and KB"* / *"go with option B."*). ⇒ **Build B as
  written below**: emergency `R` after `now` → `scheduled` (dated, ⛔ never `next_month`, whatever the month
  distance); emergency `R` with `C < R.effectiveFrom ≤ now` → `next_cycle`; emergency `F` → `first_cycle` under
  D5's guard. `standardOnly` (D6) is **not** used by the card (keep it out of the options bag unless a test needs
  it, ⛔ no dead option). The Task 0 hold is discharged. The question as it was put follows, unedited:
  Author's view, per the routing template's §0
  gate: **it is the Panel's.** It is what the Trust **tells members** about a change made without notice, and it
  is a choice between two readings of ratified words (`-124` cl.2). Default if ruled **A**: the selector returns
  `null` whenever `R` or `F` is `emergency`. This **removes** today's dated line for a future-dated emergency,
  a deliberate narrowing that must be recorded as such (footgun #57), ⛔ not as a cleanup. Under A the upcoming
  read passes `standardOnly: true` (D6), so a later **standard** change keeps its notice even when an emergency
  sits nearer. If ruled **B**: an emergency `R` with `R.effectiveFrom > now` yields `scheduled` (dated; ⛔ never
  `next_month`, which implies notice); an emergency `R` with `C < R.effectiveFrom ≤ now` (Trap 5 (iii)) yields
  `next_cycle`; an emergency `F` yields `first_cycle` (subject to D5's guard and its recorded residue).
  ⛔ Case (iii) is part of the question the note asks. Don't settle it by default. The note also offers **C**
  (only the after-the-fact `first_cycle` note; nothing for (i) or (iii)). ⛔ No interim emergency behaviour
  ships before the ruling (Task 0).

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
  - [ ] If it is the Panel's: the note is **drafted** at
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-22-8-15-emergency-card-copy.md`
        (2026-10-22, ⛔ not sent; its E4 commands were run and every quoted line was found). Re-run E4, adjust
        "Our reading" if BigDev wishes, then send. It was written **from the template, every section, in its order**. ⛔ The
        template is the only shape; read it, don't work from this list. Its content must include:
        - one plain-English question (*"When the trustees change the contribution in an emergency, should the
          member's card say anything about it — the date it changes, that it changes from the next cycle, or a
          note on the first pool at the new amount — or nothing at all?"*);
        - the one fact that decides it: the `-124` cl.2 sentence, its two readings, and the provenance caveat
          (Trap 5);
        - all three cases (i)–(iii) of Trap 5;
        - options A/B with an honest cost on each. A: a member meets a changed amount with no in-app word.
          B: the card states a fact about a change made without notice, ⛔ never "from next month".
        - **"Our reading"**, a recommendation with its *because* (the template: ⛔ a note that refuses to
          recommend pushes the analysis back onto the reader). Author's draft: **B**, because the staged card
          exists so that a changed amount never surprises a member at the moment they pay, and B's copy states
          only facts already true, never a notice that was not given. BigDev may replace it before the note goes.
        - "What is at stake right now", "How much to trust this note", "In plain English";
        - evidence **last**.

        ⛔ Not "shown to the Panel" until it is sent ([[feedback_shown_to_panel_means_sent]]).
  - [ ] If BigDev rules it is theirs: record it as a BigDev author-commit in this file's Decisions section.
  - [x] The `governance(8.15):` commits: Decision `-383` alone (`81407920`); then the `epics.md` 8.15 entry (between
        8.13 and 8.16, `### Story 8.15:`) + both Epic 8 counts corrected to **16** with the 8.14 observation
        (AC0.1–2), 2026-10-22. The routing note landed with the records (`e5604441`).
        ⛔ No code.
  - [ ] Tasks 1–6 for **standard** changes may proceed in parallel. ⛔ The emergency legs of Task 2 and Task 6
        land only after the ruling is transcribed (into `.decision-log.md` as a new id if the Panel rules; the
        decision-log write is user-inserted if refused: [[project_decision_log_writes_user_inserted]]).
  - [x] ✅ **PQ1 ruled B, 2026-10-22** (Decision `2026-10-22-383`, committed `81407920` alone, before its records).
        BigDev's §0 check: done (the question went to the Panel). The note's ruling block is filled. The hold below
        is **discharged**: the emergency legs of Tasks 2 and 6 may land, built per PQ1 B.
  - [x] ⛔ **No interim emergency behaviour** (discharged by `-383`). Until the ruling is transcribed, the story stays `in-progress`:
        ⛔ no move to `review`, ⛔ no push for review, ⛔ no merge. Neither default is neutral. "Show nothing"
        is option A, and it removes the dated line the card shows today for a future-dated emergency. "Keep
        today's line" is close to B. Either would pre-empt the Panel. ⇒ Write the selector's emergency
        branch **last**, after the ruling. If the standard work finishes first, record that in the Debug Log
        and wait; ⛔ never ship a placeholder.
- [ ] **Task 1 — Moot-row fix (AC2).**
  - [ ] `resolveUpcomingFixedAmountChange`: add the `effective_until IS NULL OR effective_until > effective_from`
        conjunct, and the optional `{ excludeAmount, standardOnly }` options bag (D6), both in the WHERE clause.
        Update its doc-block (it now names both consumers, the moot-row exclusion and the options).
  - [ ] Extend test (g) of `pool-fixed-amount.spec.ts` (`:263-343`) per AC2: the case (2) leg read at an `asOf`
        ≥ the test's JS `now`, and the case (1) same-`effective_from` leg. Add a D6 leg (a nearer same-amount
        row doesn't hide a later differing one) and a `standardOnly` leg. Revert-sanity, with observed counts.
  - [ ] Check that `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts:466-490` (admin
        `upcoming`) stays green. Add one admin leg showing that the moot row is absent from `upcoming` and
        present in `schedule`.
- [ ] **Task 2 — The pure selector + first-cycle read (AC1, D1–D7).**
  - [ ] `packages/domain/src/pool/fixed-amount-transition.ts` with `selectFixedAmountTransition`; IST parts via
        `istCalendarDate` and `istDateOf`, imported from `../cycle-calendar/holiday-resolver.js` (verified: no
        runtime cycle, since `cycle-calendar/` imports nothing from `pool/`; this is the first `pool/` → `cycle-calendar/`
        import, see [[project_type_only_import_cycle_trap]]). Export via `pool/index.ts`
        (`export * from './fixed-amount-transition.js'`; the root exposes it as `pool.*`).
  - [ ] `resolveFirstCycleUnderAmount(tx, pariwarId, { committedAt, poolFixedAmount })` in `fixed-amount.ts` per
        D5: the snapshot guard, the predecessor read, and the **pool-backed** range check (`pools` ⋈
        `cycle_freeze_commits` on `cycle_id = commit_id`, `committed_at` in `[F.effectiveFrom, C)`; `pools_pariwar_id_idx`
        and `cycle_freeze_commits_committed_at_idx` exist; RLS scopes both tables).
  - [ ] DB-free unit file per AC7 (standard legs now; emergency legs after PQ1).
- [ ] **Task 3 — Contract (AC3).**
  - [ ] `AmountTransition` union + `CalendarDate` (regex + `isRealCalendarDate`, AC3); replace the field; header +
        field-list comments; the `api-client` comment at `packages/api-client/src/index.ts:578`.
        (`contributions/README.md` describes the read model in prose and lists no fields: no edit.)
  - [ ] `contributions.test.ts` fixtures (`:63`, `:158`) + decoy legs, plus an impossible-date leg
        (`effectiveOn: '2027-02-30'` rejected). Run `pnpm --filter @twt/contracts test`
        ([[project_contracts_tests_outside_tsc]]: fixtures are outside `tsc`, so the test run is the check).
  - [ ] `pnpm contracts:check-openapi-determinism`. `openapi/v1.yaml` does not carry the member route today, so
        expect it **byte-identical**; record that, or regenerate and commit if it does change.
- [ ] **Task 4 — Handler (AC1, D3, D8, D9).**
  - [ ] **Remove** step (9) from `handlers.ts:1500-1502` and re-add it **after the self-verify `try`/`catch`
        (`:1531-1539`), as the last DB reads before the `return`** (D8): upcoming at `committedAt` with
        `excludeAmount` (D3/D6); first-cycle read; the selector; explicit map to the contract (must satisfy
        `.strict()` exactly, AC3). Both reads inside **one** fail-soft `try`/`catch` per D8.
  - [ ] Update the file header line `:16` (*"upcoming amount"*) and the step comments (renumber; say why it is last).
  - [ ] `active-contribution-card.test.ts` legs per AC7: add `resolveFirstCycleUnderAmount` to the `pool:` mock
        override; one non-null leg per stage; the `committedAt` + `excludeAmount` argument assertion; the
        fail-soft leg; the read-order assertion. Add the same mock to `contribution-history.test.ts`.
- [ ] **Task 5 — Mobile (AC4).**
  - [ ] `amountTransitionCopy.ts` (pure) + an `effectiveOn` formatter (local `Date(y, m-1, d)`).
  - [ ] Replace `:215-227` in the card. Delete `formatDate` (`:63-75`) and the `useLocale()` call (`:79`): both
        become dead (AC4). Keep `formatInr`. Add the `accessibilityLabel` from the `_a11y` key (new; the old line
        had none). Update the header comment block (`:18-21` numeral discipline mentions the upcoming-change date).
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
        record pass counts, naming `pool-fixed-amount.spec.ts`, `active-contribution-read.spec.ts`, the admin
        `fixed-amount.spec.ts` and `member-name-form-parity.spec.ts` (the live route, AC7).
  - [ ] `pnpm ci:local` before push. Push with `DATABASE_URL` set to :5433 explicitly
        ([[project_prepush_hook_inherits_5432]]). Known reds: [[project_known_livedb_test_failures]].

### Review Findings

_(none yet)_

## Dev Notes

### Why each stage is the size it is (the arithmetic, so a reviewer need not re-derive it)

- At the 90-day floor, a change scheduled on day D lands ≥ 90 days out, which is ≥ 2 IST calendar months
  ahead: no two consecutive months exceed 62 days. The smallest case is distance **2** (scheduled 1 Mar,
  effective 30 May); most land at 3 (scheduled 31 Mar, effective 29 Jun). ⇒ `scheduled` on announcement,
  then `next_month` for the whole calendar month before,
  then `next_cycle` only if a live window straddles `effective_from`, then `first_cycle` on the first pool
  committed under it.
- Distance `0` (effective later **this** month) happens only for a change already past `next_month`, i.e. the
  member is in the effective month but before the day. "From next month" would be false there, so it is
  dated.
- The card is only visible during live windows (Trap 3). The member sees whichever stage is true on the day
  they look.

### Current state of each file this story touches (read before editing)

- **`fixed-amount.ts`**: preserve the 90-day doc-block, `closeOpenHead`'s max-clamp semantics (7.5 review) and
  the advisory-lock order. Only `resolveUpcomingFixedAmountChange`'s WHERE clause + options bag and one new
  read change. ⚠ `spawn.ts:308`'s comment *"schedule rows are immutable historical"* is false (closeOpenHead
  rewrites `effective_until`); not this story's to fix, but don't rely on it.
- **`handlers.ts` (member-pool)**: `resolveCard` is a long pipeline inside one Postgres transaction. Preserve
  every other step's order and its `UNASSIGNED` returns. Step (9) is the only one **moved and replaced** (to
  after self-verify, D8). The catch-all at `:146-151` stays as it is.
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
  `packages/contracts/tests/contributions.test.ts`; `packages/api-client/src/index.ts` (comment only);
  `apps/api/src/modules/member-pool/handlers.ts`; `apps/api/tests/unit/active-contribution-card.test.ts`;
  `apps/api/tests/unit/contribution-history.test.ts` (mock only); `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`;
  `packages/i18n/locales/{en,hi}/contribution.json`; `scripts/microcopy/contribution.test.ts`; the two
  integration specs; `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts`; records per Task 7.
- ⛔ No migration. ⛔ No new package (a second consumer does not exist: [[feedback_no_premature_package]]).
- Prettier is not enforced; hand-format to the surrounding style ([[project_prettier_not_enforced]]).

### References

- `_bmad-output/planning-artifacts/ux-design-specification.md:985-997` (fixed-amount transition pattern + 2026-08-16 note)
- `_bmad-output/planning-artifacts/epics.md:425-432` (UX-DR25), `:4115-4136` (Story 8.2 AC + note), `:648` and `:7363` (Epic 8 counts, corrected 2026-10-22; `:7325` before the 8.15 entry shifted it), `### Story 8.15:` (this story's entry, `:4395`), `### Story 8.16:` / `### Story 8.17:` (entry shape), `:4034-4076` (7.11 entry shape)
- `.decision-log.md` — `2026-08-16-124` (cl.1 floor 90 + UX-DR25 ground; cl.2 policy guarantee + "emergency has no stages" `:16784`, provenance row `:16756`; cl.3 §4.2 text; cl.11 rejoin-lock trap; cl.13); `2026-08-16-125` (cl.1 in force; cl.2 emergency over pending standard is legal `:16719`; cl.3 "not a developer's call" `:16721`); `2026-08-16-123` (cl.7, cl.8, cl.9)
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — glossary `:144`; FR-15 `:474-482`; FR-55 `:874-876`; SM-C4 `:1405`; alert = monthly `:136`; UJ-6 `:100` (stale)
- `_bmad-output/implementation-artifacts/deferred-work.md` — the "⭐ Story 7.11 — UX-DR25 …" entry (owner = this story); 10.13 AC7(a) FR-55 closure
- `_bmad-output/implementation-artifacts/7-11-fixed-amount-notice-period-and-fixed-period-reconciliation.md` — Q6 `:169`, F-4 `:182-192`, AC9 `:321-340`, the mint `:765-781`
- `_bmad-output/implementation-artifacts/8-2-active-contribution-card-my-pool-card-progress-meter-15-day-tone-gradient.md` — AC6 `:85-89`, D2 `:160`, D3 `:162-163`, D9 tone review `:187`
- `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md`, `8-17-nominee-vpa-on-the-payment-screen.md` — structure, `accessible={true}`, NS-required `t()`, verification commands
- `_bmad-output/implementation-artifacts/epic-8-retro-2026-07-25.md` — W-5, H-3, AI-8-2, AI-6-3-carry
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` — §0 gate, order
- Code: `packages/domain/src/pool/fixed-amount.ts:69,126,226,277-294,341-400,508`; `packages/domain/src/pool/spawn.ts:292-312`; `packages/domain/src/schema/{pool_fixed_amount_schedule,cycle_freeze_commits,pools}.ts`; `packages/domain/src/claim/state-trustee-decision-persist.ts:1398-1408`; `packages/domain/src/cycle-calendar/holiday-resolver.ts:164,178`; `apps/api/src/modules/member-pool/handlers.ts:128-151,1328-1403,1500-1575`; `apps/api/src/modules/claims/later-approval-warnings.ts:181`; `apps/api/src/modules/pool-fixed-amount/handlers.ts:200-235`; `packages/contracts/src/contributions/active-contribution-card.ts`; `packages/contracts/src/claims/contact-ladder.ts:15-26`; `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`; `packages/i18n/locales/{en,hi}/contribution.json`; `microcopy.yaml:55-146,361-369`

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
| 2026-10-22 | 1.1 | Validated against the code and the governance record (`checklist.md`, four read-only checkers in parallel). Status stays ready-for-dev. D8 now places the transition reads last (a SQL error aborts the scope tx, so a wrap alone cannot fail soft). D5 adds the snapshot guard and counts pools, not commits. D6 moves the same-amount filter into SQL. AC5 assertions are per stage, with hi teeth on existing patterns. AC0's count is the `epics.md` entries (8.14 has none). PQ1 adds case (iii), the provenance caveat and the routing note's "Our reading". Reuses `istDateOf` and `isRealCalendarDate`. The API test mocks are named, including `contribution-history.test.ts`. Line references corrected. Authoring only: no code, no gate run. |
| 2026-10-22 | 1.2 | Task 0: no interim emergency behaviour (the story stays `in-progress` until the PQ1 ruling; neither default is neutral). PQ1 routing note drafted (`trustee-panel-routing-note-2026-10-22-8-15-emergency-card-copy.md`, options A / B / C, "Our reading" B; E4 commands run, every quoted line found). ⛔ Not sent; BigDev's §0 check outstanding. Authoring only. |
| 2026-10-22 | 1.3 | PQ1 RULED **B** by the Panel (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev): Decision `2026-10-22-383`, committed alone (`81407920`). PQ1 marked ruled with the build mapping; Task 0's hold discharged; the note's ruling block filled. Still to land in Task 0's governance commit: the `epics.md` 8.15 entry and both Epic 8 counts (AC0.1–2). Authoring only. |
| 2026-10-22 | 1.4 | AC0.1–2 done: the `epics.md` `### Story 8.15:` entry (author mint, ⛔ not Panel direction; cites the 7.11 mint, `deferred-work.md`'s 7.11 entry, `-124` cl.1–2; PQ1 ruled table → `-383`), and both Epic 8 counts corrected 12/14 → **16** with the 8.14-has-no-entry observation (17 sprint keys). Task 0 complete. Status stays ready-for-dev. No code. |
