---
baseline_commit: b883dc15
---

# Story 8.15: Fixed-Amount Transition — the Staged My Pool Card (UX-DR25) `[SURFACE]`

Status: review

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
> ⭐ *Review note 2026-10-22 (D1, Option A) — the AC is not edited:* the `next_cycle` row above is now decided from
> the amount **in force at `now`** (`resolveEffectiveFixedAmountRow` at `now`), not from `R`: it fires iff that
> amount differs from `P.fixedAmount`, and names THAT amount. `C < R ≤ now` stays the common case; the rule also
> covers two changes inside one window (the LATER wins), a reversion (silent), and a backdated emergency
> (`effective_from ≤ C`). The card's CURRENT amount is unchanged: still `P.fixedAmount` in every stage.
> ⭐ *Review note 2026-10-23 (rounds 2–3; the AC is not edited):* (a) "Qualifying `R`" is now read after
> `max(C, now)`, not after `C` (RD1 — anchored at C, a row already in force was returned by the LIMIT-1 read and
> hid the future row behind it). (b) When the member is already ASSIGNED in a later live cycle, `next_cycle`
> names THAT pool's amount, iff it differs from `P.fixedAmount`, instead of the in-force amount (RD2/RD3, BigDev
> "RD2: A" then "RD3: A"); an unreadable later binding gives no `next_cycle` (dated stages stand). See D3, D7.

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
> ⭐ *Review note 2026-10-22 (P4) — the AC is not edited:* the literal "zero hits" is **not met, by design**.
> Four hits remain — a provenance comment, the contracts test that asserts the retired field is **rejected**
> (2 lines), and the mobile fence that asserts the card no longer references it. None is a consumer, and AC7's
> fence needs the string, so AC3 and AC7 cannot both hold literally. See Debug Log "AC3 `git grep`".

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
> ⭐ *Review note 2026-10-22 (P4) — the AC is not edited:* the `useLocale()` call is **KEPT** — the new date
> formatter still needs `locale` (Debug Log Deviation 3). `formatDate` was deleted as specified.
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
  ⭐ *Review note 2026-10-23 (round 2 RD1; the AC is not edited):* "called with **`committedAt`**, ⛔ not `now`" is
  superseded — the upcoming AND in-force reads are called with `max(C, now)`; the API legs "RD1: BOTH reads are
  anchored at max(C, now)" and "RD1: an app clock BEHIND the DB commit…" pin it. The first-cycle read keeps `C`.
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
  ⭐ *Review note 2026-10-22 (P4):* the input was built as `isFirstCycle: boolean`, not `firstCycle: {isFirst,
  changeType}` — the change type is not needed once PQ1 = B (Debug Log Deviation 2). Review D1 then added `inForceNow`
  (the amount in force at `now`), which decides `next_cycle`.
- **D2 — Calendar months in IST, and the far stage is dated (Trap 2).** `monthDistance = (y_eff*12+m_eff) −
  (y_now*12+m_now)` on `istCalendarDate(...)` parts. `1` → `next_month`. Otherwise (`0` or `≥2`) →
  `scheduled`, with the date. At a 90-day minimum notice a change is ≥ 2 IST months away on the day it is
  scheduled, so **Month−3 fires on announcement**, as `-124` cl.1 intends. ⚠ **Recorded deviation from UX
  spec sample copy:** *"3 चक्र बाद"* is replaced by the dated line, because no honest cycle count exists.
- **D3 — Upcoming is read as of the live pool's `committedAt`; the stage label uses `now`.** This closes Trap 4.
  `resolveUpcomingFixedAmountChange(tx, pariwarId, committedAt, { excludeAmount: pool.fixedAmount })` (D6).
  ⭐ *Review note 2026-10-22 (D1):* the as-of-`committedAt` read now feeds only the DATED stages (`scheduled` /
  `next_month`; a row at or before `now` is never announced from it). `next_cycle` no longer reads the nearest
  row — `LIMIT 1` returned the EARLIER of two in-window changes and could not see a backdated emergency. Trap 4
  stays closed, by a different read.
  ⭐ *Review note 2026-10-23 (round 2 RD1, BigDev "RD1: A") — the as-of-`committedAt` anchor is SUPERSEDED, and
  with it Option A's "D3's as-of-C anchor … unchanged":* both reads (upcoming, in-force) are anchored at
  `max(C, now)`. Kept at C, the `LIMIT 1` read could return a row already in force, which the selector then drops
  as past — HIDING the real future change behind it (a reverted in-window change followed by a scheduled one). The
  `max` also keeps an app clock behind the DB's `committed_at` from resolving the PREVIOUS row. The first-cycle
  read (D5) keeps C.
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
  ⭐ *Review note 2026-10-22 (P2) — the sentence above is superseded, not corrected:* "reachable only for
  emergency `F`" is **false** — two STANDARD rows with no pool between them reach it (see the 2026-10-22 note
  under "Two residues of the 8.15 stage reads" in `deferred-work.md`). Condition 3 also gained
  `pools.fixed_amount = P.fixedAmount` (Review P1): a backdated emergency otherwise let an old-amount pool
  suppress the note on the first pool really at the new amount.
- **D6 — A "change" to the same amount is not a change.** `R.fixedAmount === P.fixedAmount` → no stage (e.g. an
  emergency later reverted by a standard change to the original amount). Nothing changes for the member.
  ⚠ The existing read is `LIMIT 1`, so a post-filter would let a nearer same-amount row **hide** a later real
  change and suppress its notice. ⇒ `resolveUpcomingFixedAmountChange` gains an optional options bag,
  `{ excludeAmount?: number; standardOnly?: boolean }`, applied **in the WHERE clause** alongside the AC2
  moot-row conjunct, so the filter lives in one place. The admin view calls it without options (unchanged).
  `standardOnly` exists for PQ1 = A.
- **D7 — Precedence:** `next_cycle` > `next_month` > `scheduled` > `first_cycle` > `null`. One line only.
  ⭐ *Review note 2026-10-22 (D1/P3):* unchanged, now with two homes — `selectUpcomingStage` holds every stage
  except `first_cycle`, and the handler skips the first-cycle read whenever it returns non-null (that read is
  dead work in that case).
  ⭐ *Review note 2026-10-23 (round 2 RD2, BigDev "RD2: A"):* `next_cycle` is suppressed while the member is
  ASSIGNED in a LATER live cycle — that cycle IS their next one, already at its own snapshot, so the line could
  name an amount it does not carry. "Later" is the D7 order (`committed_at`, then `cycle_id`), so a cycle committed
  at the same instant that sorts after counts. A later cycle the member is NOT in does not suppress it: it is not
  their next cycle, and suppressing would leave them never told (no card after this pool closes, and D5's
  first-cycle note counts other members' pools). Only `next_cycle` is suppressed: a dated stage or the first-cycle
  note still shows. `resolveMemberLivePool` returns the later cycle ids (`ChosenLivePool.laterLiveCycleIds`, no
  query); the card reads the member's assignment in them (`resolveAssignedPoolWithRosterForMember`, one read per
  later live cycle, almost always zero) ONLY when the in-force amount differs from the pool's. ⚠ The accepted cost
  of Option A: a member who IS in the later cycle hears of the change one window later, even when the later cycle
  already carries the new amount (the line would then have been true).
  ⭐ *Review note 2026-10-23 (round 3 RD3, BigDev "RD3: A") — the RD2 rule above is SUPERSEDED, not re-read:* that
  "accepted cost" was not a delay — a member could be NEVER told: in a later pool already at the new amount, their
  later card has no change to show, and D5's first-cycle note fails when a cycle they are not in committed at the
  new amount first. Now, when the member is ASSIGNED in a later live cycle, that pool IS their next cycle:
  `next_cycle` fires iff ITS snapshot amount differs from this pool's, and names IT (never the in-force amount,
  which it may not carry — this also covers a reverted change after the next pool was committed). Only when they
  are in no later live cycle does `next_cycle` follow the in-force amount (Review D1). If a later cycle's binding
  cannot be read, its answer is UNRESOLVED: no `next_cycle`; dated stages and the first-cycle note stand. The
  assignment reads run whenever a later live cycle exists (selector input `memberNextLivePool`).
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
  ⭐ *Review note 2026-10-22 (D1/P3) on D8:* the transition reads are now three — upcoming (as of C), the amount in
  force at `now`, and the first-cycle read (skipped when an upcoming stage wins). All three sit in the same single
  `try`/`catch`, still the LAST statements in the transaction; the source scan and the call-order leg (which now
  includes the in-force read) are unchanged in kind.
  ⭐ *Review note 2026-10-23 (round 2 RD1/RD2) on D8:* the upcoming and in-force reads are now both anchored at
  `max(C, now)` (not "as of C" / "at `now`" as written above), and RD2 adds the member's assignment in each later
  live cycle — read only when the in-force amount differs from the pool's. All inside the same single `try`/`catch`,
  still the LAST statements in the transaction; a throw from any of them → no line, card intact.
  ⭐ *Review note 2026-10-23 (round 3 RD3):* the later-cycle assignment reads now run whenever a later live cycle
  exists (not only when the in-force amount differs), and each is caught ON ITS OWN: a binding-integrity throw
  for one later cycle makes the answer unresolved (no `next_cycle`, a warn naming the `cycleId`) and leaves dated
  stages and the first-cycle note standing — ⛔ no longer a blank line. A SQL error still aborts the transaction;
  the next read then fails and the outer catch drops the line (card intact).
- **D9 — Clock.** `deps.clock()` stays the instant for the stage label, consistent with `daysRemaining` on the
  same card and the unit-test clock. ⛔ No `readDbNow` here: the admin view needs one instant across two
  partitioning reads (`pool-fixed-amount/handlers.ts:213`), and the card's reads are anchored at `C`, a
  stored instant.
  ⭐ *Review note 2026-10-23 (round 2 RP3) — the premise above no longer holds, the decision stands:* since Review
  D1 the in-force read is anchored at the request clock, and since RD1 both reads are anchored at `max(C, now)`, so
  `now` is a DATA anchor, not only a label. `deps.clock()` is kept: both READS share one instant (the anchor), and
  when `now ≥ C` the selector's `> now` split uses that same instant (the 10.13 consistency point); when the app
  clock is BEHIND the DB's `committed_at` the anchor is `C`, and the SQL's `> C` subsumes the `> now` guard. The
  `max` bounds only that behind-skew. ⚠ The opposite skew is NOT bounded: an app clock AHEAD of the DB treats a row
  whose `effective_from` falls in (DB now, app now] as already in force — a window of the skew's size (seconds),
  accepted. `readDbNow` was not adopted.
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
  ⭐ *Review note 2026-10-23 (round 2 RP4) — an ENGINEERING widening of `-383`'s ruled words, recorded so the code
  does not read as an unexplained divergence:* `-383` ruling 1 bullet 2 says *"landing inside an open pool (after
  the pool's cycle was committed, on or before today)"*, and Consequence 1 maps `C < R.effectiveFrom ≤ now` →
  `next_cycle`. Since Review D1 (BigDev "D1: A") `next_cycle` ALSO fires for an emergency with `effective_from ≤ C`
  written after the pool spawned (the amount in force now differs from the pool's). §0 gate: ⛔ not the Panel's —
  it discloses nothing new, owes nothing new, and fits ruling 1's headline (plain facts, never a warning).
  `-383` is unedited. *(Placed after the question as put, which stays unedited above.)*
  ⭐ *Review note 2026-10-23 (round 3, F1 / RD3) — and an engineering NARROWING of the same words:* for a member
  already ASSIGNED in a later live cycle, an emergency landing inside the open pool no longer gives this pool
  "from the next cycle" when their next pool was committed at THIS pool's amount (that line would be false —
  their next cycle asks the old amount), and when their next pool differs the line names THAT pool's amount
  rather than "the new amount". Each case says only what the member's next cycle actually asks, and the member
  is still told: their later card shows `next_cycle` once this pool closes. §0 gate: ⛔ not the Panel's —
  it removes only a line that would be false and adds no disclosure and no obligation. `-383` is unedited.

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

- [x] **Task 0 — Governance first (AC0, PQ1). ⛔ STOP GATE for the emergency branch only.**
  - [x] BigDev applies the routing template's §0 gate to PQ1 (author's view: the Panel's).
  - [x] If it is the Panel's: the note is **drafted** at
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
  - [x] If BigDev rules it is theirs: record it as a BigDev author-commit in this file's Decisions section.
  - [x] The `governance(8.15):` commits: Decision `-383` alone (`81407920`); then the `epics.md` 8.15 entry (between
        8.13 and 8.16, `### Story 8.15:`) + both Epic 8 counts corrected to **16** with the 8.14 observation
        (AC0.1–2), 2026-10-22. The routing note landed with the records (`e5604441`).
        ⛔ No code.
  - [x] Tasks 1–6 for **standard** changes may proceed in parallel. ⛔ The emergency legs of Task 2 and Task 6
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
- [x] **Task 1 — Moot-row fix (AC2).**
  - [x] `resolveUpcomingFixedAmountChange`: add the `effective_until IS NULL OR effective_until > effective_from`
        conjunct, and the optional `{ excludeAmount, standardOnly }` options bag (D6), both in the WHERE clause.
        Update its doc-block (it now names both consumers, the moot-row exclusion and the options).
        ⭐ *Review note 2026-10-22 (P4):* built as `{ excludeAmount }` only — `standardOnly` existed for PQ1 = A and
        Decision `-383` chose B (Debug Log Deviation 1); the `standardOnly` leg was therefore not written.
  - [x] Extend test (g) of `pool-fixed-amount.spec.ts` (`:263-343`) per AC2: the case (2) leg read at an `asOf`
        ≥ the test's JS `now`, and the case (1) same-`effective_from` leg. Add a D6 leg (a nearer same-amount
        row doesn't hide a later differing one) and a `standardOnly` leg. Revert-sanity, with observed counts.
  - [x] Check that `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts:466-490` (admin
        `upcoming`) stays green. Add one admin leg showing that the moot row is absent from `upcoming` and
        present in `schedule`.
- [x] **Task 2 — The pure selector + first-cycle read (AC1, D1–D7).**
  - [x] `packages/domain/src/pool/fixed-amount-transition.ts` with `selectFixedAmountTransition`; IST parts via
        `istCalendarDate` and `istDateOf`, imported from `../cycle-calendar/holiday-resolver.js` (verified: no
        runtime cycle, since `cycle-calendar/` imports nothing from `pool/`; this is the first `pool/` → `cycle-calendar/`
        import, see [[project_type_only_import_cycle_trap]]). Export via `pool/index.ts`
        (`export * from './fixed-amount-transition.js'`; the root exposes it as `pool.*`).
  - [x] `resolveFirstCycleUnderAmount(tx, pariwarId, { committedAt, poolFixedAmount })` in `fixed-amount.ts` per
        D5: the snapshot guard, the predecessor read, and the **pool-backed** range check (`pools` ⋈
        `cycle_freeze_commits` on `cycle_id = commit_id`, `committed_at` in `[F.effectiveFrom, C)`; `pools_pariwar_id_idx`
        and `cycle_freeze_commits_committed_at_idx` exist; RLS scopes both tables).
  - [x] DB-free unit file per AC7 (standard legs now; emergency legs after PQ1).
- [x] **Task 3 — Contract (AC3).**
  - [x] `AmountTransition` union + `CalendarDate` (regex + `isRealCalendarDate`, AC3); replace the field; header +
        field-list comments; the `api-client` comment at `packages/api-client/src/index.ts:578`.
        (`contributions/README.md` describes the read model in prose and lists no fields: no edit.)
  - [x] `contributions.test.ts` fixtures (`:63`, `:158`) + decoy legs, plus an impossible-date leg
        (`effectiveOn: '2027-02-30'` rejected). Run `pnpm --filter @twt/contracts test`
        ([[project_contracts_tests_outside_tsc]]: fixtures are outside `tsc`, so the test run is the check).
  - [x] `pnpm contracts:check-openapi-determinism`. `openapi/v1.yaml` does not carry the member route today, so
        expect it **byte-identical**; record that, or regenerate and commit if it does change.
- [x] **Task 4 — Handler (AC1, D3, D8, D9).**
  - [x] **Remove** step (9) from `handlers.ts:1500-1502` and re-add it **after the self-verify `try`/`catch`
        (`:1531-1539`), as the last DB reads before the `return`** (D8): upcoming at `committedAt` with
        `excludeAmount` (D3/D6); first-cycle read; the selector; explicit map to the contract (must satisfy
        `.strict()` exactly, AC3). Both reads inside **one** fail-soft `try`/`catch` per D8.
  - [x] Update the file header line `:16` (*"upcoming amount"*) and the step comments (renumber; say why it is last).
  - [x] `active-contribution-card.test.ts` legs per AC7: add `resolveFirstCycleUnderAmount` to the `pool:` mock
        override; one non-null leg per stage; the `committedAt` + `excludeAmount` argument assertion; the
        fail-soft leg; the read-order assertion. Add the same mock to `contribution-history.test.ts`.
        ⭐ *Review note 2026-10-23 (rounds 2–3):* "upcoming at `committedAt`" and "the `committedAt` +
        `excludeAmount` argument assertion" are superseded by RD1 (`max(C, now)`, asserted by the RD1 legs); the
        handler also reads the in-force amount (Review D1) and, when a later live cycle exists, the member's
        assignment in it (RD2/RD3). The checkbox records what Task 4 delivered then, not these orders as written.
- [x] **Task 5 — Mobile (AC4).**
  - [x] `amountTransitionCopy.ts` (pure) + an `effectiveOn` formatter (local `Date(y, m-1, d)`).
  - [x] Replace `:215-227` in the card. Delete `formatDate` (`:63-75`) and the `useLocale()` call (`:79`): both
        become dead (AC4). Keep `formatInr`. Add the `accessibilityLabel` from the `_a11y` key (new; the old line
        had none). Update the header comment block (`:18-21` numeral discipline mentions the upcoming-change date).
        ⭐ *Review note 2026-10-22 (P4):* `useLocale()` was **kept**, not deleted (Debug Log Deviation 3).
  - [x] `api-client` types follow the contract automatically. Confirm `pnpm --filter @twt/mobile typecheck`
        ([[project_mobile_typed_routes_worktree]]: in a worktree without `.expo/types`, `tsc` skips `Href`,
        so this does not prove routes).
- [x] **Task 6 — Copy + gates (AC5, AC6).**
  - [x] 8 new keys en + hi, sorted. Remove `upcoming_amount` from both.
  - [x] `amount-transition-copy.test.ts` (real `t()`); the microcopy 8.15 block with teeth.
  - [x] Request the non-author tone review. Record the outcome or "outstanding" (AC6).
        ⭐ *Review note 2026-10-22 (P6):* `[x]` records that it was REQUESTED of BigDev in chat at the end of the
        dev run — ⛔ not that an artifact exists. The review is **outstanding**; owner and re-trigger are now in
        `deferred-work.md` ("Story 8.15 AC6 — the non-author human tone review … OUTSTANDING").
- [x] **Task 7 — Records.**
  - [x] `deferred-work.md`: close the "⭐ Story 7.11 — UX-DR25 …" entry **in its own vocabulary**: "Closed by
        [implementation]" for the standard stages, naming D2's dated-copy deviation, and the emergency half per
        PQ1. Fix its heading's stale *"OWNED BY STORY 8.2"* with an appended dated note, ⛔ not a rewrite. Append
        the Trap 1 moot-row finding as "Closed by [edit]". Add the PRD UJ-6 observation (owner + re-trigger).
  - [x] `ux-design-specification.md:987-995`: append a dated note (built by 8.15; stages anchored to IST months;
        "3 चक्र बाद" replaced by a date and why; the `next_cycle` addition; the emergency ruling). ⛔ No rewrite.
  - [x] `epics.md` UX-DR25 (`:425-432`) and Story 8.2's AC (`:4129-4136`): an appended dated note pointing at 8.15.
  - [x] Friction budget: run `pnpm friction:check` and record the disposition (the 8.17 Task 6 shape)
        ([[project_friction_budget_baseline_ratchet]]).
- [x] **Task 8 — Verify.**
  - [x] `npx turbo run typecheck lint --filter=@twt/domain --filter=@twt/contracts --filter=@twt/api --filter=@twt/mobile`
  - [x] DB-free: domain pure, api unit, contracts, mobile unit, `pnpm i18n:check`, `pnpm microcopy:check`,
        `pnpm microcopy:test`.
  - [x] Live DB on **:5433**: `DATABASE_URL=postgres://…:5433/… pnpm turbo run test --concurrency=1
        --filter=@twt/domain --filter=@twt/api`. ⚠ A green run without `DATABASE_URL` **skips** integration;
        record pass counts, naming `pool-fixed-amount.spec.ts`, `active-contribution-read.spec.ts`, the admin
        `fixed-amount.spec.ts` and `member-name-form-parity.spec.ts` (the live route, AC7).
  - [x] `pnpm ci:local` before push. Push with `DATABASE_URL` set to :5433 explicitly
        ([[project_prepush_hook_inherits_5432]]). Known reds: [[project_known_livedb_test_failures]].

### Review Findings

#### Round 1 — `bmad-code-review` 2026-10-22 against `git diff b883dc15..d6368a5d`

Blind Hunter (code slice only: `apps/ packages/ scripts/`, 1715 diff lines; the records were withheld so it stayed
blind) + Edge Case Hunter + Acceptance Auditor, parallel, all read-only. 1 `decision-needed`, 7 `patch`,
0 `defer`, 16 dismissed — enumerated at the end (a bare count is unauditable). `git status --porcelain` was
empty after all three layers returned (HEAD `d6368a5d`). ⚠ **What was and was not verified:** the reviewer READ
and TRACED the code behind D1, P1 and P2 (the SQL, the selector, the write path); **no gate was run** by this
review, and the author's mutant and revert-sanity counts in the Debug Log are the author's claims, not
reproduced. Panel-routing gate (§0) applied to every finding: none is the Panel's — each is "the code should do X"
(or a record that should say what is true) with no change to what the Trust owes beyond what `-383` already ruled.

**`decision-needed`**

- [x] [Review][Patch] **D1 — RESOLVED 2026-10-22, BigDev: "D1: A" — now a patch. `next_cycle` can name an amount that is not the next cycle's; and an old-amount pool
  gets no line after a backdated emergency. The residue entry that routed this to BigDev rests on a false
  premise.** [`apps/api/src/modules/member-pool/handlers.ts:1400-1425`,
  `packages/domain/src/pool/fixed-amount-transition.ts:62-74`, `packages/domain/src/pool/fixed-amount.ts:292-320`] —
  *source: blind + edge + auditor.* ⭐ **TRACED.** The upcoming read is `effective_from ASC LIMIT 1` as of the
  pool's `committed_at` (C), with `excludeAmount` = the pool's own amount. (i) **Two changes inside one live
  window** (C < R2 < R3 ≤ now): the read returns R2, the selector says `next_cycle` with R2's amount, but the next
  cycle snapshots whatever is in force at ITS commit (R3). R3 = 700 → card says ₹600, next cycle asks ₹700. R3
  reverting to the pool's amount → `excludeAmount` drops R3, the card announces a change that is already undone.
  (ii) **A backdated emergency E with `effective_from ≤ C`** written after the pool spawned (legal: the bound is the
  in-force row's `effective_from`, `fixed-amount.ts:157-185`, and option (d) "bound at the latest commit" was
  "deliberately NOT taken"): `gt(effective_from, C)` misses E and the D5 snapshot guard returns false, so the
  old-amount pool shows nothing at all although the next cycle will carry E's amount.
  ⚠ **The record is wrong about when this fires.** `deferred-work.md:12277` and Completion Notes `:679` say
  *"Both need an emergency inside a 15-day window"*. `scheduleStandardChange` enforces only the 90-day notice floor
  (no spacing rule in the domain write path — the route layer was not checked), so TWO STANDARD changes scheduled
  less than a live window apart reach (i) with no emergency at all (a trustee correcting a mis-set change is the
  obvious road). BigDev's "accept, or patch" call was reserved on that premise.
  **Options:** **A (recommended) — patch to one rule:** one extra O(1) read of the amount in force at `now`
  (`resolveEffectiveFixedAmountRow(tx, pariwarId, now)`, still in the LAST-reads block, still fail-soft);
  `next_cycle` names THAT amount and fires iff it differs from the pool's snapshot. Closes (i) and (ii); D3's
  as-of-C anchor and the future stages stay. *Cost:* a dated note on D3/D7, a new selector input, ≥ 4 test legs
  (two-row increase, two-row revert, backdated-emergency old-amount pool, both with revert-sanity). **B — narrow
  patch:** only stop the wrong amount (when the nearest post-C change is already in force, name the amount in
  force at `now`, suppress when it equals the pool's). *Cost:* (ii) stays silent for the old-amount pool — the
  rare case `-383` already accepted and recorded; smaller test surface. **C — accept, correct the record:** no
  code; replace the false premise with the true one. *Cost:* in that rare sequence a member is told a wrong
  amount "from the next cycle" until the pool closes — on a money notice, which is exactly what this story exists
  to prevent.
  **DECIDED — Option A (BigDev, 2026-10-22, reply "D1: A").** ⭐ The patch is Option A as written: one extra read of
  the amount in force at `now`, still in the LAST-reads block and still fail-soft; `next_cycle` names that amount
  and fires iff it differs from the pool's snapshot; D3's as-of-C anchor and the future stages unchanged. Owes: a
  dated note on D3/D7, the new selector input, ≥ 4 legs with revert-sanity (two-row increase, two-row revert,
  backdated-emergency old-amount pool, and the unchanged-amount negative), and P2's record correction re-worded to
  "(b) closed by D1" ([[feedback_closure_language_precision]] — "closed" only once built and tested).

**`patch`**

- [x] [Review][Patch] **P1 — The first pool at the new amount gets NO note after a backdated emergency (violates
  `-383` ruling 1, third bullet; AC1 `first_cycle`).** [`packages/domain/src/pool/fixed-amount.ts:354-366`] —
  *source: edge + auditor + blind.* ⭐ **TRACED.** D5 condition 3 counts ANY pool of the Pariwar committed in
  `[F.effectiveFrom, C)` with no amount condition. Emergency E (600) backdated to 04-01, written after pool P (500)
  spawned 04-10: P is correctly `false` (snapshot guard), but the NEXT pool P2 (600, 04-25) finds P inside
  `[04-01, 04-25)` and is also `false` — the member goes ₹500 → ₹600 with no word on the card. `-383`'s told cost
  was "the case-3 note could compare against the wrong earlier amount; we would guard against it" — a missing
  note is a different outcome from the one the Panel was told about. **Fix (unambiguous):** add
  `eq(pools.fixedAmount, input.poolFixedAmount)` to the earlier-pools predicate (in the ordinary case every pool in
  that range already holds F's amount, so nothing else moves). **Tests:** a P2 leg in
  `active-contribution-read.spec.ts` (today only P's leg exists, `:213`), with revert-sanity.
- [x] [Review][Patch] **P2 — Correct the residue records' false premises (closure honesty, checklist family 10).**
  [`_bmad-output/implementation-artifacts/deferred-work.md:12277`, story `:400-402` and `:679`] — *source: auditor +
  edge.* (a) *"reachable only for an emergency in force at `committed_at`"* is false: two STANDARD rows with no
  pool between them (v2 700 from Jan 1, v3 500 from Jan 10, next pool Jan 15 at 500) make the schedule predecessor
  differ from what the member last paid → `first_cycle` says "the new contribution starts with this cycle" for an
  unchanged amount. Also reachable for the Pariwar's first-ever pool after a change (spec-conformant by D5, so
  recorded, not patched). (b) per D1. **Append-only:** a dated note under each, ⛔ no rewrite of the sentences
  ([[feedback_closure_language_precision]]). Re-word per D1's outcome.
- [x] [Review][Patch] **P3 — The first-cycle read runs even when its result is discarded.**
  [`apps/api/src/modules/member-pool/handlers.ts:1409`] — *source: blind.* When the upcoming read returns a row
  the selector's D7 precedence always wins, and the SQL guarantees such a row passes the selector's own guard
  (`effective_from > C`, amount ≠ pool's), so `resolveFirstCycleUnderAmount` (up to 3 sequential queries) is dead
  work on the topmost home card for the whole announce window. Call it only when `upcoming === null`. LOW; fold
  into D1 if D1 = A.
- [x] [Review][Patch] **P4 — AC/Task text not annotated for the three recorded deviations.** [story `:261`,
  `:277`, `:506-510`, `:545`] — *source: auditor.* Disclosed in Debug Log (Deviation 1–3, the AC3 grep note) but the
  AC3 "zero `git grep upcomingAmountChange`" and AC4 "delete the `useLocale()` call" still read as orders, and
  Task 1 / Task 5 are `[x]` as written (`standardOnly` not built, `useLocale()` kept, `isFirstCycle: boolean`).
  AC3 and AC7's fence cannot both hold literally (the fence needs the string). Dated notes under AC3, AC4 and the
  two Tasks pointing at the Debug Log; ⛔ no rewrite. LOW.
- [x] [Review][Patch] **P5 — The sprint-status machine ledger does not carry 8.15's ledger letters.**
  [`_bmad-output/implementation-artifacts/sprint-status.yaml:20364-20365`] — *source: auditor (PLAUSIBLE → read
  and CONFIRMED by the reviewer).* The `last_updated: >-` block's newest 8.15 line is "created: backlog →
  ready-for-dev"; aa–ad exist only as header comments while the row says `review`; the 6.37e precedent mirrors
  each letter into the block (`:20366-20371`). Add one dated line. ⚠ Use the safe-prepend recipe — a naive rewrite
  truncates ([[project_sprint_status_safe_prepend]]). LOW.
- [x] [Review][Patch] **P6 — AC6's outstanding tone review has no owner, re-trigger, or hold on `done`.**
  [story `:554`, `deferred-work.md` 8.15 section] — *source: auditor.* Task 6 is `[x]` on "requested of BigDev at
  the end of this run" with no artifact; the Epic 8 retro W-5/H-3 held 8.2 from `done` for the same gap. Nothing
  claims the review done, so AC6 itself is honest — what is missing is who owns it and what re-opens it. Record
  both. ⭐ **The review itself is BigDev's (en + hi copy, non-author).** LOW.
- [x] [Review][Patch] **P7 — Two assertions that would let a defect through.**
  [`apps/api/tests/unit/active-contribution-card.test.ts:311`, `scripts/microcopy/contribution.test.ts`,
  `apps/mobile/tests/unit/amount-transition-copy.test.ts`] — *source: auditor.* (i) `expect(c.fixedAmount)
  .toBe(310)` ("the current amount stays the snapshot in every stage") is in the `first_cycle` leg only; the
  `scheduled`, `next_month`, `next_cycle` legs, which carry a ₹400 upcoming amount, do not assert it. (ii) "Never
  *from next month* for an emergency" is pinned at STAGE level only: no leg asserts the `scheduled` line (en or hi)
  lacks "next month" / "अगले महीने", so a copy edit passes every gate and AC6 is the only backstop. Both are
  one-line legs with revert-sanity. LOW.

**`defer`** — none. (Everything real was caused by this change; nothing here is pre-existing.)

**Dismissed (16)** — each with its reason, so the count can be audited:

1. *blind #1 (HIGH)* — the transition read's safety rests on call order, not a savepoint. **Designed and pinned:**
   D8 names it, names `underSavepoint` as the alternative, and the order is held by a mock-call-order test AND a
   source scan; the auditor confirmed `closeScopeTx(commit)` after an aborted tx is safe (PG turns COMMIT into
   ROLLBACK). Revisit if a later story adds a DB read after step (10).
2. *blind #2 + edge #8* — `upcomingAmountChange` removed from a `.strict()` contract (deploy skew). **AC3 orders
   exactly this**; not in production, merge ≠ go-live ([[project_not_in_production_merge_is_not_golive]]).
3. *blind #3 + edge #7* — contract violation (bad `effectiveOn`/`newAmount`) 500s outside the fail-soft. The map
   is explicit per stage; `istDateOf` yields a valid date for every realistic instant; the year-9999 shape is
   UNPROVEN and pathological.
4. *blind #7* — the moot-row filter changes a shared reader; the removed `upcoming_amount` key may have other
   consumers. **AC2 orders it** (admin leg asserts `upcoming` null, `schedule` list still shows it); `git grep`
   finds the key only in the new fence test.
5. *blind #8* — handler wiring tested only against mocks. The domain reads have live-DB specs
   (`active-contribution-read.spec.ts`, `pool-fixed-amount.spec.ts`); the mock-spread trap is named and guarded
   (every stage leg asserts non-null).
6. *blind #9* — the "last read" source scan is brittle. The project's established pattern, one of two pins
   (see #1).
7. *blind #10* — TZ-independence tests may pass vacuously. The `2027-02-28T18:40Z` leg bites any UTC/process-TZ
   month read under a UTC CI regardless of `process.env.TZ` mutation; the author reports mutant-RED (not
   reproduced here). The mobile test title's "far WEST" wording is cosmetic.
8. *blind #11 + edge #5* — "from next month" is shown for a change effective late next month. **The stage is
   ratified (`-124` cl.1) and D2 anchors it to the IST calendar month**; the amount the member is asked to pay is
   always the pool's snapshot, so no wrong payment follows. (`next_month` carrying an unrendered `effectiveOn` on
   the wire is by design: AC3 keeps one shape per dated stage.)
9. *blind #12* — render-time `throw` on an unknown stage. Unreachable past the strict contract; a server newer than
   the client is the deploy-skew case of #2.
10. *blind #13* — `isRealCalendarDate` imported from `claims/contact-ladder.js`; `IsoDate` regex duplicated.
    **The validated story orders the reuse** (v1.1: "reuse `istDateOf` + `isRealCalendarDate`").
11. *blind #14* — one `try` covers both reads, so a bug becomes `null` + a warn. That IS D8 (fail-soft for the
    `amountTransition` field); the log line is the signal.
12. *blind #15* — ms vs µs precision at the C/R boundary. Needs a schedule row and a commit within the same
    millisecond; not constructible in practice.
13. *blind #16* — a11y copy duplicates the visible copy; `$colorPress` for static text; hard-coded
    `toHaveLength(8)`; Hindi scarcity gap. `$colorPress` is what the replaced line used (baseline `:217`) and what
    its siblings use; the Hindi gap is pre-existing and acknowledged; the count assertion is the project's
    key-set pin.
14. *blind #17* — renumbered step comments, overlong comment lines, decision ids in comments. Hygiene.
15. *edge #6* — a swallowed self-verify SQL error aborts the tx before the new reads. **UNPROVEN** (needs a
    SQL-level error in `resolveMemberSelfVerifyState`); the outcome is `null` + a warn — the designed degrade.
16. *auditor F9* — `-383` says "SHOWN to the Panel" beside a Status line saying full-vs-summary is unrecorded; the
    story/deferred-work `.decision-log.md:NNNN` cites have drifted by +33. The uncertainty is disclosed in the same
    entry, a ratified entry is superseded never edited, and a stale line cite is cosmetic
    ([[feedback_shown_to_panel_means_sent]]).

**Applied — 2026-10-22.** BigDev: "D1: A", then "1" (apply every patch). 8 of 8 patches applied, none skipped.

- **D1 (Option A)** — `selectUpcomingStage` (every stage but `first_cycle`) + a new `inForceNow` input decide
  `next_cycle` from the amount in force at `now`; the handler reads it (`resolveEffectiveFixedAmountRow` at `now`),
  last-reads block, same `try`. **P3** folded in: the first-cycle read runs only when `selectUpcomingStage` is null.
- **P1** — `eq(pools.fixedAmount, input.poolFixedAmount)` in `resolveFirstCycleUnderAmount`'s earlier-pools check.
- **P2 / P4 / P6** — appended dated notes (deferred-work residue entry, D5, Completion Notes, AC3, AC4, Tasks 1/5/6, D1,
  D3, D7, D8, the AC1 table); the AC6 owner + re-trigger entry is in `deferred-work.md`. ⛔ No sentence rewritten.
- **P5** — ledger `2026-10-22ae` + one block line, safe-prepend (parses, 290 rows, 8-15 = `review`, +7 lines).
- **P7** — `fixedAmount` stays 310 asserted in the `scheduled` / `next_month` / `next_cycle` legs; a real-`t()` leg
  asserts the emergency-reachable stages never say "next month" / "अगले महीने" (en + hi, line + a11y), with a control
  that the regex bites on `next_month`.

**Evidence — what was run and what it showed** (the reviewer's runs, this tree):

- **Revert-sanity, each mutant restored byte-identical afterwards:** P1 — without the amount condition the live-DB
  spec goes **12 → exactly 1 red** (the new P1 leg). D1/P3 — M-a (next_cycle rule off): 7 domain + 4 API legs red;
  M-b (names the nearest row): 2 domain + 1 API; M-c (first-cycle read never skipped): 1 API; M-d (in-force read as of
  C, not now): 1 API; M-e (drop the "row is in the future" guard): 2 domain + 1 API. P7(ii) — M-f (en `scheduled`
  says "next month") and M-g (hi `first_cycle_a11y` says "अगले महीने"): 1 red each.
- **Final code, targeted:** domain selector (34) + live-DB read spec (12) = 46 passed; API unit
  (`active-contribution-card` + `contribution-history`) 40 passed; mobile copy test 20 passed.
- **`pnpm ci:local` on :5433, run twice.** Run 1: 34/36 — `lint` red (⚠ MY mistake: an unused `R3` const in the new
  test block, fixed) and `integration-tests` red. Run 2: **35/36** — `lint` green; the one red is
  `apps/jobs/tests/audit/integrity-check.test.ts`, chunk-boundary leg, 20 s timeout. In run 2 the domain integration
  set was 6111 passed | 1 skipped (6112), contracts 1425, mobile 1295, every gate script green.
- ⚠ **`ci:local` is NOT green, and this story does not claim it is.** The jobs red is not diagnosed (see the
  deferred-work entry): it fails in whole-file and turbo runs, passes single-test and in the direct whole-jobs run
  (1382/1382). No file on this branch is under `apps/jobs` or audit-named — but the author's earlier "36/36" cannot
  be reproduced on this machine today. ⚠ Because turbo stops at the first failing package, **`@twt/api` integration
  did not run inside `ci:local`**; it was run separately, whole, against :5433: **2057 passed | 1 skipped | 1 failed**,
  including `pool-fixed-amount/fixed-amount.spec.ts` (16) and `member-name-form-parity.spec.ts` (14). The one failure,
  `member-drive-detail.spec.ts` AC4, is a random-token false positive ("vpa" inside `kozeb2jahavpacbvlwer_g`); it
  passes alone, 13/13. Both are in `deferred-work.md` under "Deferred from: code review of
  8-15-fixed-amount-transition-staged-card.md (2026-10-22)".

**Not done, deliberately:** Status stays **`review`**, ⛔ not `done`. AC6's non-author tone review is outstanding, the
Epic 8 retro W-5/H-3 precedent held 8.2 for the same gap, and `deferred-work.md` commits to putting that call to
BigDev. Nothing is committed or pushed.

#### Round 2 — `bmad-code-review` 2026-10-23 against `git diff b883dc15..b7f56276` (code slice), focus `d6368a5d..b7f56276`

Blind Hunter (code diff only) + Edge Case Hunter + Acceptance Auditor, parallel, read-only; round 1's 16 dismissed
items handed to the two sighted layers so they were not re-raised. `git status --porcelain` empty before and after
(HEAD `b7f56276`). 2 `decision-needed`, 5 `patch`, 0 `defer`, 4 dismissed (enumerated below). ⚠ **What was and was not
verified:** the reviewer READ the SQL of `resolveUpcomingFixedAmountChange` (`fixed-amount.ts:292-317`) and the live-pool
tie-break (`handlers.ts:1353-1386`) and confirmed RD1 and RD2's mechanism in code; the Auditor re-ran the DB-free
suites (selector 34, API unit 40, mobile copy 20 — all green, matching the records). **No live-DB spec and no mutant
was run in this round.** Panel-routing gate (§0) applied: none is the Panel's — each is "the code should do X" or a
record that should say what is true; RD1/RD2 are BigDev's because they touch a decision BigDev made (D1 = A) or pick
between two engineering behaviours.

**`decision-needed`**

- [x] [Review][Patch] **RD1 — RESOLVED 2026-10-23, BigDev: "RD1: A" — now a patch. The round-1 patch lets a past row HIDE a real future change (regression of AC1's
  "a nearer non-qualifying row never hides a later qualifying one").** [`apps/api/src/modules/member-pool/handlers.ts:1408`,
  `packages/domain/src/pool/fixed-amount-transition.ts:86-91`] — *source: blind + edge + auditor (all three, independently).*
  ⭐ **TRACED.** The upcoming read is still `effective_from > C … ORDER BY effective_from ASC LIMIT 1` (Option A kept "D3's
  as-of-C anchor"); the patch's new `effectiveFrom > now` check then drops that ONE row in JS — a post-filter on a
  LIMIT-1 read, the exact trap D6 moved `excludeAmount` into SQL to avoid. Pool ₹500 committed Jan 10; standard ₹600
  from Jan 12, standard ₹500 from Jan 14 (a trustee correcting a mis-set change — no spacing rule in
  `scheduleStandardChange` or the route, verified); standard ₹700 from Apr 20. At now = Jan 15: the read returns the
  Jan-12 row, `inForceNow` = ₹500 = the pool → no `next_cycle`, the row is ≤ now → dropped ⇒ `null` (and P3 then runs
  the first-cycle read, which can yield `first_cycle`). The ₹700 change is never announced while this pool is live;
  the policy-meaning sentence ("told … from the day it is scheduled") is breached. The selector JSDoc ("a row at or
  before `now` is already accounted for by `inForceNow`") is false here. No test sees it (each leg feeds one row).
  **Options:** **A (recommended)** — read the dated stages as of `max(C, now)` instead of C; after D1 the C anchor
  served only Trap 4, which `inForceNow` now covers. Also read `inForceNow` at `max(C, now)`, which closes the
  clock-skew case (edge F3 / blind #5: a JS clock behind the DB's `committed_at` can make `inForceNow` resolve the
  PREVIOUS row and announce the old amount "from the next cycle"). *Cost:* amends Option A's "D3's as-of-C anchor …
  unchanged" (a dated note on D1/D3), updates the D3/D6 call-argument assertions, and owes a revert-plus-future leg
  at selector-input AND live-DB level with revert-sanity. **B** — keep the C anchor and add `gt(effective_from, now)`
  in SQL as a second conjunct. *Cost:* same behaviour as A with two anchors to explain; does not close the skew case.
  **C** — accept and record. *Cost:* a member is not told of a scheduled change for up to a live window, in a sequence
  that needs a reverted change — rare, but the exact silence this story exists to end.
  **DECIDED — Option A (BigDev, 2026-10-23, reply "RD1: A, RD2: A").** Now a patch: both reads (`upcoming` and
  `inForceNow`) anchored at `max(C, now)`; dated note on D1/D3 recording that this supersedes Option A's "as-of-C
  anchor unchanged"; revert-plus-future legs at selector-input, API and live-DB level, with revert-sanity.
- [x] [Review][Patch] **RD2 — RESOLVED 2026-10-23, BigDev: "RD2: A" — now a patch. With two cycles live at once, the older pool's `next_cycle` names an amount the next
  cycle does not carry.** [`apps/api/src/modules/member-pool/handlers.ts:1353-1386`,
  `packages/domain/src/pool/fixed-amount-transition.ts:81-83`] — *source: edge.* ⭐ **TRACED** (the tie-break is
  confirmed: the card shows the SOONEST-CLOSING live cycle). C1 committed Jul 1 at ₹500, C2 committed Jul 5 at ₹500,
  both live (cycles have no cadence; the D7 tie-break exists because overlap happens); a change to ₹600 takes effect
  Jul 6. The card shows the C1 pool and says "from the next cycle ₹600" — but the next cycle is C2, already live at
  ₹500. No wrong payment (the ask is the snapshot); the notice is false. Not introduced by the round-1 patch: the
  pre-patch selector behaved the same; round 1 did not see it. **Options:** **A (recommended)** — when a LATER cycle
  of the Pariwar is already committed (the handler already holds the live candidates), suppress `next_cycle` on the
  older pool: silence over a line that may be false; the member's C2 card tells them once C1 closes. *Cost:* in the
  overlap, a member hears of the change one window later; one handler input + ≥ 2 legs. **B** — compare against the
  newest committed cycle's snapshot and name THAT when it differs from this pool's. *Cost:* the line's meaning shifts
  per case; more legs; a third "which amount" rule to explain. **C** — accept and record as residue. *Cost:* a false
  money notice in an overlap that a large Pariwar will meet.
  **DECIDED — Option A (BigDev, 2026-10-23, reply "RD1: A, RD2: A").** Now a patch: when a later cycle of the Pariwar
  is already committed, the older pool's card carries no `next_cycle` line; ≥ 2 legs (overlap → suppressed; no later
  cycle → unchanged), with revert-sanity.
  ⭐ *Dated pointer 2026-10-23:* as built, this rule was revised twice — first to count only a later cycle the
  member is ASSIGNED in (the adversarial review of the fix; BigDev "1"), then, in round 3, to name the member's
  next pool's amount instead of suppressing (RD3; BigDev "RD3: A"). See D7's notes and Round 3 below.

**`patch`**

- [x] [Review][Patch] **RP1 — Two test gaps in the round-1 patch.** [`apps/api/tests/unit/active-contribution-card.test.ts`,
  `packages/domain/tests/pool/fixed-amount-transition.test.ts:82-85`] — *source: blind.* (i) No leg makes the NEW read
  (`resolveEffectiveFixedAmountRow`) throw; the only D8 throw leg rejects `resolveFirstCycleUnderAmount`. Add one:
  throw → `amountTransition: null`, card still `assigned: true`. (ii) The "effective EXACTLY at now" leg now supplies
  `inForceNow: inForce(600)`, so `next_cycle` comes from the first branch whatever `upcoming` is — it no longer tests the
  boundary; the opposite boundary (row exactly at `now`, in-force = pool → `null`) is untested. Add it. Each with
  revert-sanity.
- [x] [Review][Patch] **RP2 — Comments that the round-1 patch made false.** [`apps/api/src/modules/member-pool/handlers.ts:1399`,
  `packages/contracts/src/contributions/active-contribution-card.ts:73`, `packages/domain/src/pool/fixed-amount-transition.ts:5`]
  — *source: blind + edge + auditor.* "`now` … only LABELS the stage" — it is now a data anchor (`inForceNow` and the
  `> now` filter). The contract's `next_cycle` ("already in force but this pool was spawned before it") and the file
  header ("if the change lands inside an open pool") omit the backdated-emergency path, where the change took effect
  BEFORE C. Correct the code comments.
- [x] [Review][Patch] **RP3 — D9's premise no longer holds and has no dated note.** [story D9] — *source: auditor.* D9
  rejects `readDbNow` because "the card's reads are anchored at `C`, a stored instant"; `inForceNow` is now anchored at
  `deps.clock()`. The two "in force yet?" checks still share one instant, so the 10.13 consistency point stands — the
  rationale needs a dated note (and RD1-A's `max(C, now)` changes it again). Append-only.
- [x] [Review][Patch] **RP4 — D1 widens `-383`'s ruled words to the backdated emergency, unrecorded.** [UX-spec 8.15 note
  item (3), `deferred-work.md` 7.11 closure, story PQ1 build mapping] — *source: auditor.* `-383` ruling 1 bullet 2 reads
  *"landing inside an open pool (after the pool's cycle was committed, on or before today)"*; Consequence 1 maps
  `C < R ≤ now` → `next_cycle`. D1 also emits `next_cycle` for an emergency with `effective_from ≤ C` written after the
  spawn. Gate: ⛔ not the Panel's (it discloses nothing new, owes nothing new, and fits ruling 1's headline "plain
  facts, never a warning"); already decided by BigDev (D1 = A). Owed: a dated note in each record naming it as an
  engineering widening of bullet 2 / Consequence 1, so the code does not read as an unexplained divergence. Append-only.
- [x] [Review][Patch] **RP5 — Two records that are no longer true.** [story `:802` + Change Log 1.6, `sprint-status.yaml`
  ledger `2026-10-22ae` (header + block line), `_bmad-output/planning-artifacts/epics.md:653`] — *source: auditor.*
  (a) "Nothing is committed or pushed" / "not committed, not pushed" sit INSIDE commit `b7f56276`, describing code in
  `d3bfbcfd`. (b) `epics.md`'s Epic 8 line had "14 stories" replaced in place by "16", but the appended recount note
  still says *"The "14" … above were stale"* — there is no "14" above any more. A dated note under each; ⛔ no rewrite.
  ⚠ sprint-status via the safe-prepend recipe.

**`defer`** — none.

**Dismissed (4)** — each with its reason:

1. *blind #2* — `next_cycle` names the amount in force at `now`, and D7 lets it outrank a dated change landing before
   the next commit. Inherent to cycles having no cadence (D2): which amount the next commit carries cannot be known
   today. The line self-corrects the day the later change takes effect; the ask is always the snapshot. Same shape as
   round-1 dismissal #8.
2. *blind #3* — wire compatibility of the `.strict()` rename and the client `throw`: round-1 dismissals #2 and #9; the
   patch changed none of their facts.
3. *blind #6* — the P3 skip depends on the precedence staying `upcoming ?? first_cycle`. Today the output never changes
   (edge traced it); the domain leg "selectUpcomingStage never returns first_cycle" pins the coupling.
4. *blind #9* — after P1, a pool that really was first at an amount loses its `first_cycle` note once a backdated
   emergency moves F. That pool then shows `next_cycle` with the emergency's amount, which outranks the note under D7
   anyway — a true, higher-precedence line, not silence.

**Applied — 2026-10-23.** BigDev: "RD1: A, RD2: A", then "1" (apply every patch). 7 of 7 applied, none skipped.

- **RD1 (Option A)** — `resolveAmountTransition` anchors BOTH reads at `anchor = max(C, now)`
  (`handlers.ts`); the selector keeps its `> now` / `> C` input guards. Dated note on D3 (supersedes Option A's
  "as-of-C anchor unchanged"). Tests: API — a revert-plus-future leg (`next_month` ₹700), both reads called at
  `now`, and an app clock 5 s behind the commit → both reads at C; live-DB — `active-contribution-read.spec.ts`
  seeds ₹500 / ₹600 Jan 12 / ₹500 Jan 14 / ₹700 Apr 20 and shows the read at C returns the past ₹600 row (selector
  → `null`, the hazard, in-test) while the read at `now` returns ₹700 (selector → `scheduled` 2027-04-20). The
  existing API legs no longer mock past rows as "upcoming" (blind #8: combinations the anchored read cannot return).
- **RD2 (Option A)** — *(as revised after the adversarial pass below)* `ChosenLivePool.laterLiveCycleIds` (the live
  cycles sorting after the chosen one in the D7 order; pure, no query) → `resolveAmountTransition`, which — only
  when the in-force amount differs from the pool's — reads the member's assignment in each
  (`resolveAssignedPoolWithRosterForMember`) and sets the selector input `laterLiveCycle` iff they are in one;
  `selectUpcomingStage` returns `next_cycle` only when it is false. Dated notes on D7 and D8. Tests: selector
  (suppressed; a dated stage and the first-cycle note survive; control) and API, with a DISTINCT pool per cycle —
  in both cycles → `null` and the card is the earlier pool, with a one-cycle control; NOT in the later cycle →
  `next_cycle` shown; only in the later cycle → that pool is the card, line shown; two cycles at the same instant →
  the one sorting after counts; a future change still `scheduled`; the assignment read runs only when a
  `next_cycle` line is in play.
- **RP1** — API: the in-force read throws → `amountTransition: null`, `assigned: true`, a warn. Selector: a row
  EXACTLY at `now` with in-force = pool → `null`; 1 ms later → dated.
- **RP2** — handler JSDoc (`now` is a data anchor), contract `next_cycle` comment, selector file header and input docs.
- **RP3 / RP4** — dated notes on D9 and PQ1; the `-383` widening also noted in `ux-design-specification.md` (under
  the 8.15 note) and the 7.11 closure in `deferred-work.md`. ⛔ No sentence rewritten; `-383` unedited.
- **RP5** — (a) ⚠ *Correction, dated 2026-10-23:* round 1's *"Nothing is committed or pushed"* above, Change Log 1.6
  and ledger `2026-10-22ae` were written INSIDE commit `b7f56276` (the code they describe is `d3bfbcfd`); they
  described the tree at writing time. Kept as written. (b) `epics.md`: a dated note as its OWN paragraph after the
  Epic 8 paragraph (whose line is unchanged) says the "14" it refers to was replaced in place. Ledger `2026-10-23a`
  + one block line (safe-prepend: parses, 290 rows, 8-15 = `review`, +7 lines).

**Adversarial review of the fix — 2026-10-23** (BigDev asked for it; then "1"). Two read-only layers on the
uncommitted fix diff — one blind (code diff only), one sighted (code + records). Both found that RD2 as first built
(`laterLiveCycle` = any live candidate committed strictly later) counted cycles the member is NOT in: such a member
lost a true "from the next cycle" line and, since D5's first-cycle note counts other members' pools, was never told.
Option A's stated cost ("hears one window later") had assumed they were in it. **Fixed** as above (assignment read,
D7 order — which also covers a same-instant tie and a later cycle with no pools). Also fixed: the RD1 API leg passed
against the bug (its mock ignored the anchor — now anchor-sensitive); the "soonest-closing pool" assertion proved
nothing (one pool id for both cycles — now distinct); stale comments at `fixed-amount.ts` (the upcoming reader's
JSDoc) and the selector's `next_cycle` doc; a D8 note; my D9 note over-claimed (corrected: the `max` bounds the
behind-skew only; the ahead-skew window is accepted); my edits had split two existing lines (PQ1's lead-in and the
`epics.md` paragraph) — both restored to their HEAD text, the notes placed after them. The RD2 bullet above, the
D7/D9 notes, this Evidence block and the RD2 sentences in `deferred-work.md`, `ux-design-specification.md` and
ledger `2026-10-23a` were revised in place — all uncommitted text written this session. **Dismissed:** RD2 also
withholds a TRUE line when the later cycle already carries the new amount, and a backdated emergency then gets no
line on the older pool — Option A's accepted delay (the member's later card speaks); with RD2 active, a future change
back to the pool's own amount is omitted on the older pool (`excludeAmount`) — an omission, never a false line.

**Evidence — what was run and what it showed** (this tree, final code):

- **Targeted:** selector 36 passed (was 34); API unit `active-contribution-card` + `contribution-history` 49 passed
  (was 40); live-DB `active-contribution-read.spec.ts` 13 passed on :5433 (was 12). Whole suites: API unit 589 passed
  | 1 skipped; domain `tests/pool` 348 passed. Typecheck green for `@twt/domain`, `@twt/api`, `@twt/contracts`;
  ESLint clean on the seven changed code files (`handlers.ts`, `active-contribution-card.test.ts`, contract
  `active-contribution-card.ts`, `fixed-amount-transition.ts`, `fixed-amount.ts`, `fixed-amount-transition.test.ts`,
  `active-contribution-read.spec.ts`).
- **Mutants, each file restored byte-identical afterwards (`cmp`):** M1 anchor = C → 2 API red (the anchor leg and
  the now anchor-sensitive revert-plus-future leg); M2 anchor = `now` without the `max` → 1 API red (clock skew);
  M3 handler never sets `laterLiveCycle` → 3 API red; M4 selector ignores `laterLiveCycle` → 1 domain + 3 API red;
  M5 selector drops the `> now` guard → 3 domain red; M7 "later" = strictly later `committed_at` (ties not counted)
  → 1 API red (the tie leg); M8 assignment ignored (any later cycle suppresses) → 1 API red (the not-in-it leg); M9
  assignment read always runs → 1 API red. ⚠ **M6** ("later" = every other candidate, earlier ones included)
  **survives — an equivalent mutant**: the card is the FIRST cycle the member is assigned in, so every earlier
  candidate is one they are not in (or whose binding errored), and it cannot suppress. The RP1(i) throw leg was not
  mutated.
- ⚠ **Not run this round:** `pnpm ci:local`, the mobile suite (no mobile file changed), the API integration suite.

**Not done, deliberately:** Status stays **`review`** — AC6's non-author tone review is still outstanding (round 1's
reason, unchanged). Not committed, not pushed.

#### Round 3 — `bmad-code-review` 2026-10-23 against `git diff b883dc15` (final tree before commit; round-2 fix as focus)

Blind Hunter (code diff only) + Edge Case Hunter + Acceptance Auditor, parallel, read-only; rounds 1–2 and their
dismissals handed to the sighted layers. `git status` unchanged by all three. 1 `decision-needed`, 6 `patch`,
1 `defer`, 2 dismissed. The Auditor re-ran the DB-free counts (36 / 49 / 589+1 / 348 — all matched the round-2
records); no layer ran a DB test or a mutant. Panel-routing gate (§0): none is the Panel's.

**`decision-needed`**

- [x] [Review][Patch] **RD3 — RESOLVED 2026-10-23, BigDev: "A" — now a patch. RD2 could leave a member NEVER told
  of a change.** [`apps/api/src/modules/member-pool/handlers.ts` (`resolveAmountTransition`),
  `packages/domain/src/pool/fixed-amount-transition.ts` (`selectUpcomingStage`)] — *source: blind (HIGH); the
  reviewer traced it in code.* Member in pool A at ₹310; ₹400 takes effect; cycle X (member NOT in it) commits at
  ₹400; cycle B (member in it) commits at ₹400. Card A: suppressed (they are in a later cycle). Card B: in force =
  its ₹400 → no `next_cycle`; first-cycle note → false (X's ₹400 pools sit in `[F, C_B)`). ₹310 → ₹400 with no
  notice anywhere — for an emergency, against `-383` ruling 1. RD2's suppression ignored what the member's next
  pool actually asks. The Auditor's "the later pool's card still tells them" holds only without such an X.
  **Options:** **A (chosen)** — when the member is in a later live cycle, that pool is their next cycle: `next_cycle`
  iff its amount differs from this pool's, naming IT; with no later pool, the in-force rule. **B** — keep RD2,
  make D5's earlier-pools check member-scoped. **C** — accept and record.

**`patch`**

- [x] [Review][Patch] **RP6 — One later cycle's binding error blanked the whole line, dated stages included.**
  [`handlers.ts`, the later-cycle loop] — *source: blind + edge.* Each later read is now caught on its own:
  unresolved → no `next_cycle`, a warn with the `cycleId`; dated stages and the first-cycle note stand.
- [x] [Review][Patch] **RP7 — RD2 is also a NARROWING of `-383`'s words, recorded only as a widening.** [story
  PQ1; `deferred-work.md` 7.11 closure; `ux-design-specification.md` 8.15 note] — *source: auditor.* Dated notes.
- [x] [Review][Patch] **RP8 — AC1, AC7 and Task 4 still read as orders the code now breaks** ("called with
  `committedAt`", "upcoming at `committedAt`"). [story AC1, AC7, Task 4] — *source: auditor.* Dated pointers.
- [x] [Review][Patch] **RP9 — The RD2 "DECIDED" block did not point at its revision.** [story RD2] — *source:
  auditor.* Dated pointer (the revision rested on BigDev's "1" on the adversarial findings, then on "RD3: A").
- [x] [Review][Patch] **RP10 — Round 2's "M6 is an equivalent mutant" is FALSE.** [story, Round 2 Evidence] —
  *source: auditor.* An EARLIER live cycle whose binding throws (step 5 skips it) + the member in a later cycle +
  an in-force change distinguishes M6 (the re-read throws). ⚠ *Correction, dated 2026-10-23:* the Round 2 Evidence
  sentence is wrong as written and kept as written. After RD3 the M6 re-read would be caught per cycle and yield
  `unresolved` (no `next_cycle`) — still observable; no leg pins it (recorded, not built).
- [x] [Review][Patch] **RP11 — RD1's promised selector-level leg was missing, and the live-DB leg cannot catch a
  reverted handler anchor.** [`fixed-amount-transition.test.ts`] — *source: auditor.* Added the selector leg ("RD1:
  the row a read at C returns (past) says nothing; the row a read at max(C, now) returns (future) is dated").
  ⚠ Recorded, not built: the live-DB leg calls the domain read with explicit `asOf` values and the selector — it
  proves WHY the anchor matters, not that the handler uses it; the handler's anchor is pinned only by the API legs
  (M1/M2 below).

**`defer`**

- [x] [Review][Defer] **With the member's next pool at THIS pool's amount, a scheduled row equal to the amount
  already in force can show as a dated line** (e.g. "from 5 October, ₹400" while ₹400 is already in force) —
  deferred, needs a trustee to schedule a change to the current amount. [`fixed-amount-transition.ts`
  `selectUpcomingStage`; `excludeAmount` = the pool's amount] — *source: blind.* Recorded in `deferred-work.md`.

**Dismissed (2):** *blind #4* — one roster-loading read per later live cycle: runs only during an overlap, stops at
the first assigned cycle, live cycles are few. *blind #5* — mock leakage across legs: `wire()` re-sets every mock the
RD2/RD3 helpers replace (`mockResolvedValue` overrides `mockImplementation`); the edge layer confirmed it.

**Applied — 2026-10-23.** BigDev: "A" (RD3), after "3 then 2 then open pr".

- **RD3** — selector input `laterLiveCycle: boolean` → `memberNextLivePool: { fixedAmount } | 'unresolved' | null`;
  `selectUpcomingStage`: `null` → the in-force rule; `{ fixedAmount }` → `next_cycle` iff it differs from the pool's,
  naming it; `'unresolved'` → no `next_cycle`. Handler: for each later live cycle (D7 order), the member's assignment
  (`resolveAssignedPoolWithRosterForMember`), first assigned wins; read whenever a later live cycle exists. Contract,
  handler and selector docs updated; D7, D8, PQ1 notes. Tests — selector: next pool at a new amount (incl. the
  reverse case), at this pool's amount (only `next_cycle` goes; control), unresolved; API: next pool at ₹400 → named,
  next pool's amount over the in-force one (and the reverted case), next pool at ₹310 → none (control), NOT in the
  later cycle → in-force rule, only in the later cycle, same-instant tie, dated line survives, a throwing later
  binding (dated line stands, warn with `cycleId`; nothing dated → no line), reads only when a later cycle exists.
- **RP6–RP11** — as listed above.

**Evidence — what was run and what it showed** (this tree, final code):

- **Targeted:** selector 39 passed; API unit `active-contribution-card` + `contribution-history` 52 passed; live-DB
  `active-contribution-read.spec.ts` 13 passed on :5433. Whole suites: API unit 592 passed | 1 skipped; domain
  `tests/pool` 351 passed. Typecheck 0 errors in `@twt/domain`, `@twt/api`, `@twt/contracts`; ESLint clean on the
  seven changed code files.
- **Mutants, each file restored byte-identical (`cmp`):** R1 next pool's amount ignored (RD2's suppression back) →
  2 API red; R2 selector names the in-force amount over the next pool's → 1 domain + 1 API red; R3 no per-cycle catch
  → 1 API red; R4 a throw treated as "not in it" → 1 API red; R5 `'unresolved'` treated as no later pool → 1 domain
  red; R6 an unassigned later cycle counts → 1 API red; M1 anchor = C → 2 API red; M2 anchor = `now` → 1 API red; M5
  drop the `> now` guard → 4 domain red; M7 ties not "later" → 1 API red.
- **`pnpm ci:local` on :5433 (final code): 35/36.** Every gate script, lint, typecheck, build, unit and db-check
  green; the one red is `integration-tests`, and inside it only `apps/jobs/tests/audit/integrity-check.test.ts` >
  chunk-boundary deletion, *"Test timed out in 20000ms"* — the SAME leg round 1 recorded (`deferred-work.md`,
  "Deferred from: code review of 8-15 … (2026-10-22)"); no file on this branch is under `apps/jobs` or audit-named.
  Integration totals that ran: domain 6117 passed | 1 skipped; jobs 1381 | 1 failed; queue 4; niyamavali-engine 144;
  events 36; channels 446; validity-service 284. ⚠ turbo stopped at the jobs failure, so **`@twt/api` integration
  did not run inside `ci:local`**; run separately, whole, against :5433: **2070 passed | 1 skipped, 0 failed**
  (176 files). The mobile suite was not run (no mobile file changed).

**Not done, deliberately:** Status stays **`review`** — AC6's non-author tone review is still outstanding.

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

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 8.15`, 2026-10-22, in the story worktree.

### Debug Log References

- **Preflight.** `git fetch origin`; `git log HEAD..origin/main` empty (origin/main still `b883dc15`), so nothing under the four watched paths moved. The main checkout was on `main`; all work ran in `.claude/worktrees/8-15-fixed-amount-transition-staged-card`, branch checked before every commit.
- **Task 0.** Already discharged before this run (v1.3/v1.4: `-383` committed alone in `81407920`, the routing note ruled B, the `epics.md` entry + both counts in `e019024d`). Its remaining boxes are checked on that record: the §0 gate went to the Panel (so the "BigDev rules it is theirs" branch never applied), and Tasks 1–6 ran after the ruling, so no interim emergency behaviour shipped.
- **Deviation 1 (Task 1, D6): `standardOnly` NOT added.** Task 1 lists `{ excludeAmount, standardOnly }` and a `standardOnly` leg. That option existed only for PQ1 = A; the ruling (B) says *"keep it out of the options bag unless a test needs it, ⛔ no dead option"*. No caller needs it, so the bag is `{ excludeAmount }` only and there is no `standardOnly` leg.
- **Deviation 2 (D1): the selector input is `isFirstCycle: boolean`**, not `firstCycle: { isFirst, changeType } | null`. Under B the first-cycle note is change-type-blind, so a `changeType` there would be a field nothing reads.
- **Deviation 3 (AC4): `useLocale()` is KEPT.** AC4 says to delete it because it was "used only by the old line". The new date formatter still needs the locale, so the card calls `useLocale()` once and passes `locale` into `amountTransitionCopy(…)`. `formatDate` is deleted as specified; no dead helper remains.
- **AC3 `git grep upcomingAmountChange`** outside `_bmad-output/`: **not zero, by design.** Four hits remain, none a consumer: the contract's provenance comment (`active-contribution-card.ts`: "Replaces the Story 8.2 `upcomingAmountChange` …"), the contracts test that asserts the retired field is **rejected** (2 lines), and the mobile fence that asserts the card **no longer references** it. `upcoming_amount` survives only in that fence.
- **Revert-sanity / mutants (observed counts).**
  - `pool-fixed-amount.spec.ts` with the moot conjunct removed: **2 red / 18 green**, exactly (g) and (8.15-b). Restored: 20/20.
  - Admin `fixed-amount.spec.ts` with it removed: **1 red / 15** (the 8.15 leg). Restored: 16/16.
  - `active-contribution-read.spec.ts`: snapshot guard removed → **1 red** (backdated emergency); commits counted instead of pools → **1 red** (zero-claim commit). Restored: 11/11.
  - `fixed-amount-transition.test.ts` (26): change-type guard dropped → 1 red; UTC months instead of IST → 5 red; D6 amount guard dropped → 3 red; C guard dropped → 1 red.
  - `active-contribution-card.test.ts` (17): upcoming read at `now` → 1 red; transition reads moved before the attested read → 2 red (call order + source scan).
  - `amount-transition-copy.test.ts` (19): planted `{{amount}}` (en next_cycle) → 1 red; planted missing `{date}` (hi next_month) → 1 red; a pre-formatted `₹` param → 5 red. All restored.
- **Task 8 verification.** `turbo run typecheck lint` (domain, contracts, api, mobile): 36/36 tasks. `pnpm ci:local` with `DATABASE_URL` set explicitly to **:5433**: **36/36 jobs green**, exit 0, including `integration-tests` (`@twt/domain` 6102 passed / 1 skipped; `@twt/api` 2053 passed / 1 skipped). That run includes `pool-fixed-amount.spec.ts`, `active-contribution-read.spec.ts`, the admin `fixed-amount.spec.ts` and `member-name-form-parity.spec.ts` (the live route). The same four specs were also run on their own against :5433 before the commits: 20/20, 11/11, and 30/30 for the admin + live-route pair. The unit job reported contracts 1425/1425, mobile 1294/1294 (79 files), api-client 35/35; `i18n:check` (forced, uncached), `microcopy:check`, `microcopy:test` 378/378, `friction-budget` and `contracts-determinism` all green. ⚠ **Not pushed**: pushing is the landing step, and it is BigDev's call. If pushed, set `DATABASE_URL` to :5433 explicitly ([[project_prepush_hook_inherits_5432]]).
- **Friction gate** failed first (AC-4 diffs committed history), then passed once the 8.15 disposition block was committed.

- **Review round 1 apply-all (2026-10-22).** Mutants, targeted counts, the two `ci:local` runs (34/36 then 35/36), the
  separate live API run (2057 / 1 skipped / 1 failed) and the two unrelated reds are enumerated in the Review
  Findings "Applied" block above — ⛔ not repeated here. One of the two first-run reds was the author's-side fault of
  this round (an unused const), caught by `lint`, fixed, re-run.

### Completion Notes List

- Context engine analysis completed. This is a comprehensive developer guide, created 2026-10-22 by bmad-create-story off `b883dc15`.
- **Implemented (AC1–AC5, AC7, AC8).** A pure `selectFixedAmountTransition` (`packages/domain/src/pool/fixed-amount-transition.ts`): IST calendar months of `effective_from` (D2), `next_cycle` for a change inside the live window (Trap 4), D6/D7, and emergency changes dated and ⛔ never `next_month` (PQ1 = B, `-383`). `resolveFirstCycleUnderAmount` (D5): snapshot guard, predecessor via the in-force resolver, pool-backed range check. `resolveUpcomingFixedAmountChange`: moot-row conjunct + `{ excludeAmount }` in SQL. Handler: the transition reads moved to the end of the scope transaction, inside one fail-soft `try`/`catch`, with an explicit per-stage map. Contract: `upcomingAmountChange` replaced by `amountTransition` (`.strict()` union; `effectiveOn` is an IST calendar date). Mobile: a pure `amountTransitionCopy.ts`, the line under the amount with a new `accessibilityLabel`, ⛔ not a live region. 8 new copy keys en + hi; `upcoming_amount` removed.
- **AC2 — intended behaviour change on a second surface.** The trustee setter view's `upcoming` no longer shows a change superseded before it took effect. Its `schedule` list still does (history). Pinned by the admin `fixed-amount.spec.ts` 8.15 leg.
- **AC3 consequences, understood rather than discovered.** (a) The route serialises through the Zod type provider, so a stray key in the explicit map is a 500, ⛔ not the D8 fail-soft. The API unit legs parse every response with `ActiveContributionCardResponse.parse`. (b) `api-client` parses with `schema.parse`, so an older app build rejects the new shape and its card self-suppresses. Nothing is in production; accepted. `openapi/v1.yaml` is **byte-identical** (`contracts:check-openapi-determinism` clean; the member route is not in it).
- **D8 narrows today's behaviour, deliberately.** A throw in the transition reads used to blank the whole card. It now drops only the line. A decorative line must not hide the contribute CTA.
- **AC6 — the non-author human tone review is OUTSTANDING.** Nobody other than the author has reviewed the final en + hi transition copy. It was requested of BigDev at the end of this run (2026-10-22); ⛔ the author does not self-attest. The copy under review is the eight `active_contribution.transition.*` keys in both `contribution.json` files.
- **Residues, routed (not fixed):** see the `deferred-work.md` 8.15 section. (a) D5: when a backdated emergency matches the snapshot, the predecessor comes from the schedule, not the member's previous pool. (b) `next_cycle` names the nearest change after C; two changes inside one live window would name the first. Both need an emergency inside a 15-day window. Owner: this story's code review.
- ⭐ **Residues — code review 2026-10-22 (appended; the bullet above is unedited).** "Both need an emergency inside a 15-day window" is **false**: two standard changes suffice (`scheduleStandardChange` enforces only the 90-day floor). **(b) is closed** by Review D1 (Option A, BigDev: `next_cycle` names the amount in force at `now`). **(a) is NOT addressed** — it stays an open, accepted residue, reachable with standard rows too; owner BigDev (see `deferred-work.md`).
- **Records (Task 7).** `deferred-work.md` (the 7.11 entry closed in its own vocabulary, the stale heading noted, Trap 1 "Closed by [edit]", PRD UJ-6 observed with owner + re-trigger); `ux-design-specification.md`, `epics.md` UX-DR25 and Story 8.2's AC: appended dated notes only. `friction-budget.md`: disposition, no new row.

### File List

New:
- `packages/domain/src/pool/fixed-amount-transition.ts`
- `packages/domain/tests/pool/fixed-amount-transition.test.ts`
- `apps/mobile/components/active-contribution/amountTransitionCopy.ts`
- `apps/mobile/tests/unit/amount-transition-copy.test.ts`

Modified (code + tests):
- `packages/domain/src/pool/fixed-amount.ts`
- `packages/domain/src/pool/index.ts`
- `packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts`
- `packages/domain/tests/integration/pool/active-contribution-read.spec.ts`
- `packages/contracts/src/contributions/active-contribution-card.ts`
- `packages/contracts/tests/contributions.test.ts`
- `packages/api-client/src/index.ts` (comment only)
- `apps/api/src/modules/member-pool/handlers.ts`
- `apps/api/tests/unit/active-contribution-card.test.ts`
- `apps/api/tests/unit/contribution-history.test.ts` (mock only)
- `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts`
- `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`
- `packages/i18n/locales/en/contribution.json`
- `packages/i18n/locales/hi/contribution.json`
- `scripts/microcopy/contribution.test.ts`

Modified (records):
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/epics.md`
- `friction-budget.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/8-15-fixed-amount-transition-staged-card.md`

## Change Log

| Date | Version | Description |
|---|---|---|
| 2026-10-22 | 1.0 | Created by `bmad-create-story 8-15` in its worktree, off `b883dc15` (== origin/main). Status backlog → ready-for-dev. Found and scoped a reachable pre-existing defect (Trap 1: a superseded change still shows as "upcoming" on the member card and the admin view). Anchored the stages to IST calendar months, because cycles cannot be counted (Trap 2). Added a `next_cycle` stage for the in-window gap (Trap 4). Routed the emergency reading as PQ1 (Trap 5). Authoring only: no code, no gate run. |
| 2026-10-22 | 1.1 | Validated against the code and the governance record (`checklist.md`, four read-only checkers in parallel). Status stays ready-for-dev. D8 now places the transition reads last (a SQL error aborts the scope tx, so a wrap alone cannot fail soft). D5 adds the snapshot guard and counts pools, not commits. D6 moves the same-amount filter into SQL. AC5 assertions are per stage, with hi teeth on existing patterns. AC0's count is the `epics.md` entries (8.14 has none). PQ1 adds case (iii), the provenance caveat and the routing note's "Our reading". Reuses `istDateOf` and `isRealCalendarDate`. The API test mocks are named, including `contribution-history.test.ts`. Line references corrected. Authoring only: no code, no gate run. |
| 2026-10-22 | 1.2 | Task 0: no interim emergency behaviour (the story stays `in-progress` until the PQ1 ruling; neither default is neutral). PQ1 routing note drafted (`trustee-panel-routing-note-2026-10-22-8-15-emergency-card-copy.md`, options A / B / C, "Our reading" B; E4 commands run, every quoted line found). ⛔ Not sent; BigDev's §0 check outstanding. Authoring only. |
| 2026-10-22 | 1.3 | PQ1 RULED **B** by the Panel (Dhiraj Rahul + Kalpana Bharti, relayed by BigDev): Decision `2026-10-22-383`, committed alone (`81407920`). PQ1 marked ruled with the build mapping; Task 0's hold discharged; the note's ruling block filled. Still to land in Task 0's governance commit: the `epics.md` 8.15 entry and both Epic 8 counts (AC0.1–2). Authoring only. |
| 2026-10-22 | 1.4 | AC0.1–2 done: the `epics.md` `### Story 8.15:` entry (author mint, ⛔ not Panel direction; cites the 7.11 mint, `deferred-work.md`'s 7.11 entry, `-124` cl.1–2; PQ1 ruled table → `-383`), and both Epic 8 counts corrected 12/14 → **16** with the 8.14-has-no-entry observation (17 sprint keys). Task 0 complete. Status stays ready-for-dev. No code. |
| 2026-10-22 | 1.5 | `bmad-dev-story 8.15`: Tasks 0–8 complete. Status ready-for-dev → in-progress → **review**. Moot-row fix (AC2, admin `upcoming` changes too); pure stage selector + first-cycle read (IST months, `next_cycle`, PQ1 B emergency = dated, never `next_month`); `amountTransition` replaces `upcomingAmountChange`; handler reads last and fail-soft per field; card line through a pure copy module, 8 keys en + hi. Records + friction disposition. `ci:local` 36/36 on :5433. Deviations: no `standardOnly` (PQ1 B), `isFirstCycle: boolean`, `useLocale()` kept. ⚠ AC6 tone review OUTSTANDING. Not pushed. |
| 2026-10-22 | 1.6 | `bmad-code-review 8-15` round 1 + apply-all: 1 decision (D1, BigDev: Option A) / 7 patch / 0 defer / 16 dismissed. `next_cycle` now names the amount in force at `now` (two in-window changes, a reversion, a backdated emergency); the first pool at a new amount keeps its note after a backdated emergency; the residue premises corrected (append-only); AC6's owner/re-trigger recorded; two test legs. Status stays **review**. `ci:local` 35/36 (one undiagnosed unrelated jobs red), API integration run separately 2057 / 1 skipped / 1 failed (unrelated). Not committed, not pushed. |
| 2026-10-23 | 1.7 | `bmad-code-review 8-15` round 2 + apply-all: 2 decision (RD1, RD2 — BigDev: Option A each) / 5 patch / 0 defer / 4 dismissed. Both transition reads anchored at `max(C, now)` — a reverted in-window change no longer hides a future change (supersedes Option A's "as-of-C anchor unchanged"); no `next_cycle` while the member is assigned in a later live cycle (an adversarial review of the fix caught the first build counting cycles the member is not in — fixed); a throw leg for the in-force read and the exact-at-now boundary; comments and dated notes (D3, D7, D9, PQ1; the `-383` widening also in the UX spec and deferred-work); epics.md's dangling "14"; round 1's "not committed" records corrected by note. Selector 36, API unit 49, live-DB read spec 13; eight mutants RED, one equivalent (recorded). Status stays **review**. `ci:local` not re-run. Not committed, not pushed. |
| 2026-10-23 | 1.8 | `bmad-code-review 8-15` round 3 (final tree) + apply-all: 1 decision (RD3 — BigDev: A) / 6 patch / 1 defer / 2 dismissed. RD2's suppression could leave a member never told (their later card had no change; D5's note counts other members' pools) — now, when the member is in a later live cycle, `next_cycle` names that pool's amount iff it differs; an unreadable later binding drops only `next_cycle`; RD2 also recorded as a narrowing of `-383`; AC1/AC7/Task 4 and the RD2 decision pointed at their revisions; round 2's "M6 equivalent" corrected; the RD1 selector leg added; a no-op dated row deferred. Selector 39, API unit 52 (whole 592 + 1 skipped), domain pool 351, live-DB read spec 13; ten mutants RED; `ci:local` 35/36 (the known jobs timeout), API integration 2070 | 1 skipped. Status stays **review**. Not committed, not pushed. |
