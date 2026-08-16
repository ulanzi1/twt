# Trustee Panel Routing Note — Story 7.11, Fixed-Amount Notice Period + Fixed-Period Reconciliation

**Status:** ✅ **RULED 2026-08-16.** Q6 **(d)** — ⛔ **the floor moves 60 → 90, superseding clause 6 of
Decision `2026-08-16-123`**; Q1 **(b)**; Q2 **ratified with the drafted *"normally for periods of about
12 months"* clause STRUCK**, so §4.2 drops the twelve-month period entirely; Q3 **(a)** — Deed Cl. 10(b)
recorded as already consistent, unamended; Q4 **include**; Q5 **confirmed**. ⚠ **F-5 was NOT ruled** and
is carried as `[Author-committed]` — *raised and left, a second time*. Recorded as **Decision
`2026-08-16-124`** (`.decision-log.md:37`). See *"The ruling as given"* at the foot of this note; it is
authoritative where it differs from the option and draft text above, which is **retained, not edited**.
*(Superseded status line, retained: ⏳ Open — six questions, awaiting ruling. **Q1, Q2, Q3 and Q6 are ⛔
BLOCKING**; Q4 and Q5 are answerable but each carries a stated non-answer consequence.)*
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-16, against
`_bmad-output/implementation-artifacts/7-11-fixed-amount-notice-period-and-fixed-period-reconciliation.md`
at its baseline `main` @ `d6de145` (clean, fetched, `== origin/main`). *(Superseded status, retained:
**no code has been written**; the story is `in-progress` at its governance half and stops at Task 2
until this note is ruled — true AT AUTHORING, before Q1/Q2/Q3/Q6 were ruled. Story 7.11 review P3:
this line was left unrevised after ruling landed, contradicting the `✅ RULED` status above; corrected
here the same way line 10's superseded status was already marked, not silently rewritten.)* As of the
ruling recorded above, the story has proceeded past Task 2 and code has landed.
**Story state:** *(superseded, retained: `in-progress`, governance half only, true AT AUTHORING)* — as
of the ruling, 7.11 has proceeded past Task 2. Its dependencies Story 7.5 and Story 10.13 are both
`done`. ⛔ **This story has no `epics.md` entry** — it was minted by Decision
`2026-08-16-123` clause 9 into `sprint-status.yaml:7268` and nowhere else; its AC8 creates the missing
entry.
**Decision-log head, verified live at authoring:** `2026-08-16-123` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **125** headings, of which one is the `YYYY-MM-DD-NNN` **template** at
`:7182`, leaving **124** numbered headings over **123 distinct numbers** — the `+1` is the legitimate
amendment suffix `2026-06-01-012-amend-1` (`:6330`) sitting alongside `2026-06-01-012` (`:6373`), not a
duplicate. No gaps in `001…123`.
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-16-124`** from the
current head `2026-08-16-123` — *(if the ruling lands on a later date the entry takes that date, and
the `-124` sequence holds only while `-123` remains the head; ⚠ **re-verify the head at ruling time**
and number from whatever is then head)*. Per Decision `2026-08-09-095` the entry must **label
per-clause provenance** — `[Trustee-ratified]`, `[Author-committed]`, or author finding.

⛔ **If the ruling amends Niyamavali §4.2, Deed Cl. 10(b) or T&C §4.2, the amended text must be
reproduced VERBATIM IN BOTH LOCALES inside that entry.** `docs/legal/` is gitignored (`.gitignore:68`;
verified live: `git check-ignore -v docs/legal/niyamavali.md` → `docs/legal/`), so the decision entry is
the **only durable copy** of the instrument. A working-tree loss otherwise loses the amendment.
§4.2 is `niyamavali.md:101-104` / `niyamavali.hi.md:99-102`; Deed Cl. 10(b) is `trust-deed.md:147`;
T&C §4.2 is `terms-and-conditions.md:49` / `terms-and-conditions.hi.md:52`.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each ⭐ is a suggestion the Panel may reject,
> not a default the Panel is assumed to accept by silence. Where silence *does* carry a consequence,
> that consequence is stated per question and again in *"What non-answer would mean"*
> ([[feedback_record_unattested_no_backfill]]).

> ⚠ **Nothing in this note re-interprets a ratified instrument or a ratified ruling**
> ([[feedback_supersede_never_reinterpret]]). Deed Clause 10(b), Niyamavali §4.2 and T&C §4.2 mean what
> they say. Decision `2026-08-16-123` means what it says and ⛔ **is never edited in place**. This note
> **asks**; the ruling **amends**; Story 7.11 **applies**. Where a ruling here would contradict
> `2026-08-16-123` — Q6 option (d) is the live case — it is a **supersession**, and the entry must say
> so in terms rather than absorb it as though it were consistent.

---

## Why this note exists

Decision `2026-08-16-123` clauses 6–9 (`[Trustee-ratified]`) ruled the **policy**:

> *"The normal notice period should be 60 days, not 365 days. The emergency mechanism remains necessary
> and may bypass the 60-day notice requirement. There is no mandatory requirement that the fixed amount
> remain unchanged for 12 months. Twelve months is the normal/planned period, not an absolute lock.
> Therefore the successor governance story must address both the 60-day notice rule and the 12-month
> wording in the governing documents so that the legal text, PRD, architecture, and implementation all
> agree. Do not remove the emergency mechanism from Story 10.13. It remains meaningful because it
> bypasses the normal 60-day notice. Do not implement either the 60-day change or the removal of the
> 12-month lock inside 10.13; create/assign the successor story to own those changes."*

**It did not rule the text.** Three things the successor cannot proceed without were expressly left open:

1. **The amended §4.2 wording, in both locales.** The ruling says twelve months is not a lock. §4.2
   today says *"not less than 12 months"* — the opposite. Somebody must write the replacement sentence,
   and that somebody is the Board under Deed Cl. 20(a), not the author of a story file.
2. **Whether Deed Cl. 10(b) needs amending at all.** ⚠ An author *reading* exists (F-2) and is
   deliberately **not** acted on — deciding it here would be re-reading a ratified instrument.
3. **Q5.1's emergency-backdating lower bound**, routed here verbatim by clause 11 as
   `[Author-committed]` — *"the emergency-backdating lower bound is routed to the same successor"*.

**And it did not reach one consequence of its own ruling.** The notice floor is not only a
hostile-trustee cooling-off control; it is also **how much warning a member gets**. UX-DR25 commits a
four-stage My Pool card transition premised in terms on *"per FR-15, 12+ month notice"*. At a 60-day
floor its first stage cannot fire. The Panel ruled the period without that in front of it, so it is put
back (Q6, promoted from finding F-4 at BigDev's direction).

**And the register set is larger than the ruling's list.** The ruling named *"legal text, PRD,
architecture, and implementation"* — four. Verified live at `d6de145`, the twelve-month claim also sits
in the **member-facing Terms & Conditions** and in **`epics.md`**. Neither was named. They are raised
here (Q4, F-3) rather than swept in silently or left silently.

---

## Nine findings the Panel should see before ruling anything

*(F-1…F-7 are the seven the story's AC1 requires. ⚠ **F-8 and F-9 are additional**, surfaced during the
pre-commit re-verification of every citation from source and beyond the story's list — recorded rather
than dropped, because "the named registers are not all the registers" is the exact failure this story
exists to end, and it turned out to be true **inside** two registers the ruling did name.)*

### F-1 ⭐ THE ONE THAT DE-RISKS THE WHOLE INSTRUMENT HALF — the Deed amendment is not a registered-deed act

`trust-deed.md:7`, verbatim: *"**⚠️ DRAFT — NOT YET EXECUTED. NOT LEGAL ADVICE.**"*

Clause 22(b) (`:273`) — *"a resolution passed by not less than **two-thirds** of the Trustees then in
office, shall be **reduced to a supplementary registered deed**, and, where the amendment affects
tax-exemption registration, shall be intimated to the jurisdictional income-tax authority"* — governs
amending an **executed** deed. An unexecuted working draft is edited directly.

Clause 22(c) (`:275`) closes it further: *"The *Niyamavali* is amendable by the Board under Clause 20(a)
**without** amending this Deed, subject to the consistency requirement therein."* And Cl. 20(a) (`:237`)
vests in the Board the power to *"frame, publish, and **amend the *Niyamavali***, including … the fixed
per-Pool contribution amount **and the periods for which it is fixed**"* — the §4.2 amendment is
squarely inside a power the Board already holds.

⇒ **Element (ii) of this story's mandate is a markdown edit plus a ratified record, not an external
legal act.** Recorded so the dev agent does not park the work as `_AWAITING EXTERNAL ACTION_`, and so
the Panel is not asked to authorise a registration it does not need.

### F-2 ⭐ THE SHARP ONE — the three texts differ in FORCE, not merely in wording

Verified live, all three:

| Register | Line | Text | Force |
|---|---|---|---|
| **Trust Deed Cl. 10(b)** | `trust-deed.md:147` | *"a fixed per-Pool amount determined by the Board (**which the Board may fix** for stated periods of not less than twelve months)"* | ⭐ **PERMISSIVE** — *may* |
| **Niyamavali §4.2** | `niyamavali.md:102` | *"set by the Board for stated periods of **not less than 12 months**"* | ⛔ **CONSTRAINT** |
| **T&C §4.2** | `terms-and-conditions.md:49` | *"(set by the Trustees for periods of **at least 12 months**)"* | ⛔ **CONSTRAINT**, and member-facing |

On its face **Cl. 10(b) already agrees with the ruling** — it *permits* twelve-month-plus fixings
without *requiring* them, which is exactly *"the normal/planned period, not an absolute lock"*. §4.2 and
T&C §4.2 have no such permissive verb and say the opposite of the ruling.

⛔ **This is put as Q3, not resolved here.** It is precisely the kind of reading the Panel, not the
author, must make; author-defaulting it would be re-reading a ratified instrument
([[feedback_supersede_never_reinterpret]]). Any ruling that edits one text and not the others must say
**which reading now governs**.

### F-3 — The Terms & Conditions is a SIXTH register, and it is the one with a member on the other side of it

`terms-and-conditions.md:49` / `.hi.md:52` tells the member, in the second person, that the amount is
*"set by the Trustees for periods of at least 12 months"*. It is the only one of the six registers a
member **accepts**. The ruling did not name it.

⚠ **Verified live, the mitigation that makes this cheap today:** the T&C body seeded into
`terms_and_conditions_versions` is the **placeholder** from `scripts/seed-placeholder-tc.ts` — whose own
header states *"Lawyer-reviewed final T&C copy lands later per Story 0.13 (external dependency)"* and
that `legal_review_status` stays `pending`. ⇒ Editing this markdown triggers **no version bump and no
re-acceptance surfacing now**. It will, once Story 0.13's counsel-reviewed body is seeded. **The cheap
moment is now.**

### F-4 ⭐ PROMOTED TO Q6 — a 60-day floor makes UX-DR25's Month−3 stage unreachable

⚠ Raised as a **question as well as** a finding, at BigDev's direction — the 10.13 `F-2 → Q2.2`
precedent, where the finding states the fact and the question asks the decision.

`ux-design-specification.md:987` commits, verbatim: *"When the Trustee Panel announces a fixed-amount
change (**per FR-15, 12+ month notice**), the My Pool card adapts gradually rather than via a sudden
banner"* — then a four-stage pattern: *"Month -3 onwards"*, *"Month -1"*, *"Month 0 (new amount's first
cycle)"*, *"Subsequent cycles"*. `epics.md:404` restates it as *"(-3mo → -1mo → first cycle → normal)"*.

⚠ **The floor moved, not the practice.** At a 60-day floor a **minimum-notice** change never has a
Month−3 (60 days ≈ 2 months); Month−1 and Month 0 still fire. So stage 1 stops being **guaranteed by
policy** and becomes **a matter of trustee practice**.

⚠ The staged pattern is **Story 8.2's** surface and 10.13 already recorded it as unbuilt. ⚠ **Re-verified
live, with the citation corrected:** the surface is
`apps/mobile/components/active-contribution/ActiveContributionCard.tsx:211-222` — a **single un-staged
line** rendered whenever `data.upcomingAmountChange` is present, with **no Month−3 / Month−1 staging of
any kind**. *(It is conditional on an upcoming change, not "always-on"; and the path is
`apps/mobile/components/…`, not `apps/mobile/src/components/…`.)*. ⛔ **Nothing is built here either way.** This
finding records that the **spec's own premise** moved, so a future reader does not implement a stage
that cannot fire.

### F-5 — This story is the SCHEDULED re-trigger for the submitter-distinctness observation

`deferred-work.md:4495-4503` names the re-trigger in terms: *"the next Panel ruling that touches the
emergency attesting panel's composition — **Story 7.11 is the first scheduled occasion**, since it
re-opens the emergency path's notice semantics."*

The observation: Q2.1 option (c) — *attestors must be distinct from the submitting actor* — was put to
the Panel at 10.13 and **not taken** (Decision `2026-08-16-123` clause 3). ⇒ a submitting trustee **may**
list themselves among the attestors and count toward the ≥ 2 floor.

⚠ **Re-verified live at `d6de145`, still reachable:** `attestedByActor` is recorded as its own field
(`fixed-amount.ts:391`, written at `:442` / `:456`) and **nothing compares it against `input.panel`**.
The panel guards are arithmetic only — non-empty, ≥ 2, no duplicates.

⛔ Surfaced **as scheduled**; built only if ruled; and ⛔ **not silently re-deferred a second time**. If
the answer is *"raised and left"*, that is a legitimate answer and it is recorded in those words.

### F-6 — §4.2 is not in the clause registry, so this is a markdown-plus-record act

`packages/domain/seed/niyamavali-v1-clauses.sql` seeds **23 distinct `niy.*` clause ids** (verified
live): `niy.contribution-discipline.r7-a…g`, `niy.ninety-percent-rule.r8`/`r8-a`/`r8-b`,
`niy.special-death.r5-c-2`/`r5-d`/`r5-e`/`r5-f`/`r9`/`r9-a`/`r9-suicide-murder`, `niy.lock-in.policy`,
`niy.moderation.dwell`, `niy.restoration-discipline.policy`, `niy.retirement-coverage.r12`,
`niy.concealment.r14`, `niy.medical.ima-list`. ⛔ **None of them is §4.2.**

The public render (`apps/public/src/lib/niyamavali-render.ts`) projects `clause_versions` rows — it is a
PURE display contract over `schema.ClauseVersionRow` (`:17-21`), fed by its `.astro` wrapper — so a
clause with **no registry id has no way to reach it**. ⇒ §4.2 is **not publicly rendered**, and amending it involves ⛔ **no** seed, ⛔ **no** migration, ⛔ **no**
`niyamavali_amendments` edge and ⛔ **no** diff view. The dev agent cannot invent a `clause_versions` row
for it.

### F-7 — No DB constraint governs `effective_from`; the notice floor is one app-level constant

Verified live. Migration `0075_pool-fixed-amount-schedule.sql` CHECKs only
`"version" >= 1` (`:45`) and `"fixed_amount" > 0` (`:46`); `0077_pool-fixed-amount-max-check.sql` adds
`"fixed_amount" <= 10000000` (`:14`). **Nothing constrains `effective_from` at the database.**

⇒ The notice floor lives entirely in `FIXED_AMOUNT_NOTICE_DAYS` (`fixed-amount.ts:63`) and the pure
`meetsNoticeFloor` predicate (`:145-147`). `pnpm schema:check` has nothing to see under any ruling on
Q1–Q6 except a bound built under Q1, which would also be app-level.

### F-8 ⚠ ADDITIONAL — the PRD carries the claim in NINE places; the story's AC6 names FOUR

The ruling named the PRD. AC6 enumerates `prd.md:463`, `:465`, `:469`, `:849` — all four verified exact.
⚠ **Five more live PRD lines say the same thing and are named by neither the ruling nor the story:**

| Line | Text | Kind |
|---|---|---|
| `:67` | *"set the per-pool fixed amount (₹310–400) **for 12+ month periods**"* | live — trustee-role description |
| `:144` | *"set by trustees **for 12+ month periods** … **Announced 12+ months in advance** of any change."* | live — **glossary definition of "Fixed amount"** |
| `:442` | *"Fixed per-pool amount (₹310–400) is trustee-set **for 12+ months**, loaded from config."* | live — §4.3 Pool Engine narrative |
| `:1321` | *"fixed-amount **over 12+ months**"* | live — Pool Engine capability summary |
| `:1372` | *"(Adjustments must be **on the 12+ month cycle per FR-15**.)"* | live — **SM-C4 counter-metric** |

⛔ **`:144` and `:1372` are the two that matter most.** `:144` is the **glossary** — the definition every
other PRD sentence points at; leaving it makes FR-15 contradict its own vocabulary. `:1372` is a
**counter-metric guard-rail** (*"Do not raise the per-pool amount reactively"*) whose stated cadence
would silently become a twelve-month rule the policy no longer has.

⇒ **The Panel is asked to note, not to rule:** the reconciliation of "the PRD" means **nine** lines, not
four. Story 7.11's AC6 is extended accordingly at implementation time. *(⚠ Deliberately **not** folded
into a question — reconciling a named register more completely is applying the ruling, not extending
it.)*

### F-9 ⚠ ADDITIONAL — `epics.md:3526` is a LIVE line, not a historical AC body

AC8 splits `epics.md` deliberately: **live** FR-summary lines (`:56`, `:109`, `:2774` — all verified
exact) get the edit; **historical** story-AC bodies (`:2884`, `:2891`, `:3806`, `:3813`, `:3058`, `:404`
— all verified exact) get an appended dated note and are ⛔ never rewritten in place.

⚠ Two live-vs-historical placements the story's list does not cover, found on re-verification:

- **`epics.md:3526`** — Epic 10's opening narrative: *"…moderate members, **set the fixed-amount with
  12-month notice**."* This is a **live** epic description, not a record of a shipped story. It belongs
  with `:56`/`:109`/`:2774`, edited — not annotated.
- **`epics.md:2897`** — a Story 7.5 AC body: *"emergency overrides bypass the **12-month notice**"*.
  **Historical**, so annotated with `:2884`/`:2891`, not rewritten. ⚠ Flagged because its *substance*
  survives the ruling (the emergency path still bypasses the notice, clause 8) while its *number* does
  not — a reader skimming for "still true?" will mis-file it.

⛔ **And the noise this grep produces, recorded so the dev agent does not over-edit:** `epics.md` uses
"12 months" for a **completely different rule** — the FR-6 / FR-96 **rejoin lock** (`:40`, `:110`,
`:174`, `:1685`, `:1687`, `:1697`, `:1917`, `:1924`, `:1926`, `:1969`, `:1971`). ⛔ **None of those is
touched by anything in this story.** A blind `12 month` search-and-replace across `epics.md` would
silently rewrite the withdrawal rejoin lock.

---

## The six questions

### Q1 — How far back may an emergency `effective_from` reach? ⛔ BLOCKING · *Feeds AC3, Task 3*

Routed here verbatim by Decision `2026-08-16-123` clause 11 (`[Author-committed]`), which recorded that
Q5 was **not ruled** at 10.13 and that no bound was added there.

**The gap, verified live.** `ApplyEmergencyOverrideInput.effectiveFrom` (`fixed-amount.ts:380`) is
documented *"MAY be `<= now()` (the 365-day floor does NOT apply)"* with **no lower bound of any kind**.
An emergency `effective_from` may be set to any past instant whatsoever.

⚠ **Why it is not merely untidy** (`deferred-work.md:4505-4524`): non-retroactivity for already-spawned
pools is architectural — pools snapshot at cycle-freeze `committed_at` (7.5's D5) — but a backdated
emergency landing **between** a committed freeze and its **retried** spawn resolution changes what that
retry resolves.

*(⚠ Citation-drift note for whoever closes this marker: the `deferred-work.md` entry cites the comment
at `fixed-amount.ts:351`; it is live at **`:380`**. The entry is otherwise exact.)*

| Option | What it means |
|---|---|
| **(a)** | **No bound, recorded deliberately** — in those words, with the reason |
| **(b)** | Not earlier than **the current open head's `effective_from`** |
| **(c)** | A **symmetric lookback** — e.g. the same number of days as the notice floor, mirrored backwards |
| **(d)** | Not earlier than the **latest `cycle_freeze_commits.committed_at`** |

⭐ **Non-binding recommendation: (b).** It is the only bound expressible from data the write path
**already reads**; it cannot invert a window (`closeOpenHead` already clamps at
`max(newEffectiveFrom, openHead.effectiveFrom)` — documented `fixed-amount.ts:279-288`, implemented as the
ternary at `:304-305`); and it directly addresses
7.5's replay concern — a backdated emergency can no longer reach **behind a head** that a committed
freeze may already have resolved against.
⚠ **(d)** is *tighter and more correct in intent*, but requires the pool schedule write path to read
**cycle-freeze state** — a new coupling this story should not introduce unilaterally.
⚠ **(a)** is legitimate, and must then be recorded in those words: *"no bound, deliberately"* ≠
*"nobody looked"* ([[feedback_record_unattested_no_backfill]]).

**⛔ Non-answer:** the bound stays unstated for a second story running, and `deferred-work.md:4505-4524`
— an entry that exists **only because Story 7.5's review claimed to have written a record it did not** —
is carried forward a second time. **The story stops:** AC3 has no input and its marker closure cannot
state an outcome.

### Q2 — The amended Niyamavali §4.2 wording, in both locales ⛔ BLOCKING · *Feeds AC4* · ⛔ **DO NOT RULE BEFORE Q6**

**Today, verified live:**
- EN `niyamavali.md:102`: *"Each open Pool invites a **fixed per-Pool contribution of ₹[[310]] (range
  ₹[[310–400]])**, set by the Board for stated periods of **not less than 12 months**."*
- HI `niyamavali.hi.md:100`: *"प्रत्येक खुला पूल **₹[[310]] (सीमा ₹[[310–400]])** के निश्चित प्रति-पूल सहयोग हेतु
  आमंत्रित करता है, जो बोर्ड द्वारा **कम-से-कम 12 माह** की अवधि हेतु निर्धारित होता है।"*

The Panel ruled twelve months is *"the normal/planned period, not an absolute lock"*. **The current
wording says the opposite.** What exactly replaces it?

⭐ **Non-binding starting draft only — the Panel writes the instrument:**
- EN: *"…set by the Board, normally for periods of about 12 months, and changed on not less than
  **[60/90]** days' notice save under a recorded emergency adjustment."*
- HI: *"…जो बोर्ड द्वारा सामान्यतः लगभग 12 माह की अवधि हेतु निर्धारित होता है, और जिसमें परिवर्तन कम-से-कम **[60/90]**
  दिन की सूचना पर किया जाता है, सिवाय अभिलिखित आपातकालीन समायोजन के।"*

⛔ **The `[[310]]` / `[[310–400]]` bracket placeholders are untouched** under every option.
⛔ **Both locales are ratified TOGETHER.** The Hindi is not a later translation chore.
⛔ **And they are reproduced verbatim in the decision entry** — `docs/legal/` is gitignored; the entry is
the only durable copy.

⛔ **WHY THIS MUST NOT BE RATIFIED BEFORE Q6.** The §4.2 sentence names the notice period **in the
instrument**. Ratifying wording that says *"60 days"* and then ruling Q6(d) would put a **freshly
ratified instrument out of date on the day it was written**, and correcting it costs a **second**
amendment in both locales. ⇒ Either **rule Q6 first**, or **ratify §4.2 with the number left open and
close it in the same entry**.

⛔ **The one ruling that would be a supersession, not an application.** If the replacement wording
re-instates twelve months as a **minimum period**, that contradicts Decision `2026-08-16-123` clause 7
(*"there is no mandatory requirement that the fixed amount remain unchanged for 12 months"*,
`[Trustee-ratified]`). The entry must then say **in terms** that it supersedes clause 7 — and Story
7.11's code half changes shape with it. ⛔ Never absorbed as though consistent.

**⛔ Non-answer:** §4.2 keeps asserting a mandatory twelve-month floor the Panel has ruled does not
exist, and the instrument contradicts the code in the register that governs the code. **The story
stops:** AC4 has no text to write.

### Q3 — Does Trust Deed Clause 10(b) need amending at all? ⛔ BLOCKING · *Feeds AC5*

See **F-2**. `trust-deed.md:147`'s operative verb is ***may***.

| Option | What it means |
|---|---|
| **(a)** | **Record Cl. 10(b) as already consistent** and leave it unamended, quoting the *"may"* |
| **(b)** | **Amend it** to match whatever Q2 ratifies |

⭐ **Non-binding recommendation: (a)** — the smallest true act. The permissive verb already carries the
ruling's meaning, and an unnecessary amendment to a Deed is a cost with no gain.
⚠ **This is exactly the kind of reading the Panel, not the author, must make.** It is blocking
precisely because author-defaulting it would be re-reading a ratified instrument.
⭐ If the Panel prefers an edit anyway, ⛔ note **F-1**: no registered supplementary deed is required,
because the Deed is an unexecuted draft.

**⛔ Non-answer:** AC5 cannot state which register governs, and the *force* divergence F-2 identifies
stays unresolved — the Deed permits, the Niyamavali constrains, and no record says which one a reader
should follow. **The story stops.**

### Q4 — The Terms & Conditions is a SIXTH register, and the ruling did not name it · *Feeds AC5, AC9*

See **F-3**. `terms-and-conditions.md:49` / `.hi.md:52`.

⭐ **Non-binding recommendation: include it**, edited to match whatever Q2 ratifies — and **now**, while
F-3's placeholder-seed mitigation makes it free of a version bump and re-acceptance surfacing.

**⚠ Non-answer:** the **member-facing** text keeps promising twelve months' notice while the code gives
sixty (or ninety). ⛔ Not neutral — an un-owned divergence in the one document a member **accepts** is
precisely what [[feedback_record_unattested_no_backfill]] says decays. If the answer is *exclude*, the
divergence is recorded in `deferred-work.md` with a named owner and a concrete re-trigger, not left
silent. **The story continues either way.**

### Q5 — Confirm that minimum DURATION is not enforced, as a recorded closure · *Feeds AC3 note, AC9*

The divergence 10.13 raised (`deferred-work.md:4534-4562`) was: *the code enforces minimum **notice** and
**never** minimum **duration***. `closeOpenHead` closes the prior head at
`max(newEffectiveFrom, openHead.effectiveFrom)`, so two **conforming** standard writes a day apart leave
an entry in force for **one day** — both passed the notice floor; neither stood for twelve months.

The ruling's answer is that there is **no** twelve-month lock — i.e. **the absence is correct, not a
gap**.

⭐ **Non-binding recommendation: record it in those words** at `closeOpenHead`'s doc comment and in
`deferred-work.md`, and ⛔ **build nothing**.
⛔ **Building a duration floor would contradict the ruling that minted this story** (clause 7).

**⚠ Non-answer:** the next reader re-raises a closed question — the exact failure mode Story 10.13's own
Q3 existed to end. **The story continues.**

### Q6 — The notice floor is also how much warning a MEMBER gets ⛔ BLOCKING *(because of option (d) alone)* · *Feeds AC1, AC2, AC6, AC7, AC9, AC10*

See **F-4**. `ux-design-specification.md:987-993`; `epics.md:404`, `:3058`.

| Option | What it means | Touches code? |
|---|---|---|
| **(a)** | **Accept** the three-stage degradation for minimum-notice changes | No |
| **(b)** | Commit that **ordinary/planned** changes still carry enough notice for the four-stage pattern — a **practice expectation**, ⛔ not a code floor | No |
| **(c)** | A **separate, longer floor for non-emergency planned changes**, keeping 60 days as the hard minimum | ⛔ Yes — a second floor |
| **(d)** | **Move the floor itself from 60 days to 90** | ⛔ Yes — ⛔ **a SUPERSESSION of clause 6** |

⭐ **Non-binding recommendation: (d), 90 days** — ⚠ **the arithmetic is the argument, so it is given
rather than asserted.** Stage 1 is anchored at **three months**, and three calendar months is 90–92
days. At a **90-day** floor a minimum-notice change fires stage 1 **on the day it is announced** and
dwells there ~60 days before Month−1 — the four-stage pattern works **by policy**, at its natural size,
for **every** conforming change. At **60** it cannot fire at all. ⇒ **90 is the smallest floor that
restores the guarantee, and it costs exactly one constant.**

⚠ **The price, stated plainly: (d) supersedes clause 6 of Decision `2026-08-16-123`, which is
`[Trustee-ratified]` and was ratified the SAME DAY.** That is legitimate — ratified policy is
*superseded*, never re-read ([[feedback_supersede_never_reinterpret]]) — but the entry must **say so in
terms**, and ⛔ clause 6 is **never edited in place**.

⭐ **(b)** is the alternative that supersedes nothing: the floor stays 60 and the guarantee becomes a
**practice expectation** — ⚠ which ⛔ **nothing enforces**, and the record must say that too.
⚠ **(a)** is legitimate, and must then be recorded, because the UX spec's premise becomes false and
Story 8.2 would build a stage that rarely fires.
⛔ **(c)** is a **second floor** — real code in `scheduleStandardChange`, two numbers where the system
has always had one, and it reopens semantics just settled. Offered for completeness, **not
recommended**.

⛔ **WHY THIS BLOCKS, AND WHY IT DID NOT BEFORE.** (a) and (b) touch no code; (c) adds a second floor
**above an unchanged 60**. **(d) moves `FIXED_AMOUNT_NOTICE_DAYS` itself** — so AC2's constant, AC6's
nine PRD sentences, AC7's threat-model row, AC10's boundary tests **and Q2's ratified §4.2 wording** all
resolve to a **different number** under it. ⚠ Q6 was **non-blocking until option (d) existed**;
recording *why* it moved matters more than the fact that it did.

**⛔ Non-answer:** the UX spec keeps asserting a 12-month premise the policy no longer supports, and
Story 8.2 inherits it unflagged. **The story stops** — every downstream register would have to guess a
number.

---

## What non-answer would mean

| Q | Consequence of no answer |
|---|---|
| **Q1** ⛔ | AC3 has no input; the marker at `deferred-work.md:4505-4524` cannot state an outcome, and an entry that exists only because a prior record was falsely claimed is carried forward a second time. **The story stops.** |
| **Q2** ⛔ | §4.2 keeps asserting a mandatory twelve-month floor the Panel has ruled does not exist. AC4 has no text to write. **The story stops.** |
| **Q3** ⛔ | AC5 cannot say which of two conflicting *forces* governs — the Deed permits, the Niyamavali constrains. **The story stops.** |
| **Q4** | The **member-facing** T&C keeps promising twelve months while the code gives sixty. ⚠ Not neutral: an un-owned divergence in the one document a member accepts. **The story continues.** |
| **Q5** | The next reader re-raises a question the ruling already closed. **The story continues.** |
| **Q6** ⛔ | The number itself is unsettled, so **no register can be edited** — a diff that lands 60 in one and 90 in another is the exact failure this story exists to end. **The story stops.** |

**A blocked ruling stops the story at its governance half, recorded as such** — not worked around, not
partially built. Q1, Q2, Q3 and Q6 are the four that stop it.

---

## What this note does NOT ask, and what a ruling would NOT mean

**Not asked:**
- ⛔ **Any change to `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE`.** `epics.md:3830`, `deferred-work.md:4468`, and
  Decision `2026-08-16-123` clause 5 — it is a **floor that is not the Deed Cl. 19(b) quorum**, and it
  does not move.
- ⛔ **Removing or weakening the emergency path.** Express direction, clause 8: *"Do not remove the
  emergency mechanism… It remains meaningful because it bypasses the normal 60-day notice."* The
  emergency path keeps **no floor at all**.
- ⛔ **A minimum-DURATION predicate.** The Panel ruled the opposite in terms (clause 7). Q5 asks only
  that the absence be **recorded as correct**.
- ⛔ **A `trustee_directory`, or any change to eligibility enforcement.** Closed by Story 10.13
  *"by [edit]"*. Nothing here re-opens it.
- ⛔ **Renaming the wire code `pool.fixed_amount_notice_too_short`.** It is a shipped, client-observable
  contract string and it names the **condition**, not the number. It survives every ruling.
- ⛔ **Whether the fixed amount itself should change.** This note is about *when*, never *how much*.
- ⛔ **Building the UX-DR25 staged transition.** That is Story 8.2's surface under every Q6 option.

**A ruling would NOT mean:**
- ⚠ that **F-1 of Decision `2026-08-16-123` is closed** — clause 13 records that the eligible-attestor
  population still includes the `pariwar_admin` population `architecture.md:1324` names as the hostile
  actor. ⛔ A tidier threat-model row must not imply a stronger control than exists.
- ⚠ that **FR-15's *"multi-trustee approval"* is enforced** — clause 14 records it stays **partially**
  implemented, and this story does not change that either way.
- ⚠ that Deed Cl. 10(b), §4.2 or T&C §4.2 have been **re-read**. They are amended, or recorded as
  already consistent — never reinterpreted.

---

## Ruling template

The Panel may rule by completing this table. Per Decision `2026-08-09-095`, the recorded entry must
carry **per-clause provenance** — `[Trustee-ratified]`, `[Author-committed]`, or author finding.

⛔ **Rule Q6 before Q2**, or ratify §4.2 with the number left open and close it in the same entry.

| Q | Ruling | Notes |
|---|---|---|
| **Q6** ⛔ | (a) accept 3-stage / (b) practice expectation / (c) second floor / (d) **60 → 90** | ⛔ If (d): the entry must say **in terms** that it **supersedes clause 6** of `2026-08-16-123`. If (b): the entry must say **nothing enforces it** |
| **Q1** ⛔ | (a) no bound, deliberately / (b) ≥ open head's `effective_from` / (c) symmetric lookback = ____ days / (d) ≥ latest freeze `committed_at` | If (a): recorded in those words, with the reason |
| **Q2** ⛔ | §4.2 replacement text — **EN:** ______  **HI:** ______ | ⛔ Both locales, verbatim in the entry. ⛔ `[[310]]` / `[[310–400]]` untouched. ⛔ If it re-instates a minimum period: say it **supersedes clause 7** |
| **Q3** ⛔ | (a) already consistent, unamended / (b) amend — text: ______ | ⛔ Either way it appears in the entry, not only in a commit message |
| **Q4** | include / exclude | If exclude: `deferred-work.md` entry, named owner, concrete re-trigger |
| **Q5** | confirm: duration is deliberately NOT enforced — yes / no | ⛔ Build nothing either way |
| **F-5** | submitter-distinctness: build / raised and left | ⛔ "Raised and left" is a legitimate answer and is recorded in those words |
| **F-8** | noted | The PRD reconciliation covers **nine** lines, not four |
| **F-9** | noted | `epics.md:3526` is **live** (edit); `:2897` is **historical** (annotate) |

---

## Disposition

On ruling: **one** `.decision-log.md` entry, numbered from the **then-live head** (**`2026-08-16-124`**
at authoring), per-clause provenance labelled, with every amended instrument sentence reproduced
**verbatim in both locales**, committed under a `governance(7.11):` prefix **before** any implementation
commit ([[feedback_governance_commits_precede_implementation]]).

This note's status line is then updated to `✅ RULED <date>` with the superseded `⏳ Open` line
**retained, never overwritten**, and the ruling as given appended at the foot — the 10.13 shape.

⛔ Decision `2026-08-16-123` is **not edited** by any of this. It stands as recorded; this entry is the
**next** one, not a correction of it.


---

# The ruling as given — 2026-08-16

Recorded as **Decision `2026-08-16-124`**, `.decision-log.md:37`, numbered from the then-live head
`2026-08-16-123` exactly as this note's Disposition anticipated. Per-clause provenance labelled per
Decision `2026-08-09-095`. ⛔ Decision `2026-08-16-123` was **not** edited.

## The ruling, question by question

| Q | Ruled | Provenance |
|---|---|---|
| **Q6** ⛔ | **(d) — the floor moves 60 → 90 days** | `[Trustee-ratified]` — ⛔ **a SUPERSESSION of clause 6 of `2026-08-16-123`**, given as such |
| **Q1** ⛔ | **(b)** — an emergency `effective_from` may not precede the **current open head's `effective_from`** | `[Trustee-ratified]` |
| **Q2** ⛔ | **Ratified, and AMENDED by the Panel** — the offered draft's *"normally for periods of about 12 months"* was **struck** | `[Trustee-ratified]` |
| **Q3** ⛔ | **(a)** — Cl. 10(b) is already consistent; **not amended** | `[Trustee-ratified]` |
| **Q4** | **Include** — T&C §4.2 amended in both locales | `[Trustee-ratified]` |
| **Q5** | **Confirmed** — minimum duration deliberately not enforced; build nothing | `[Trustee-ratified]` |
| **F-5** | ⚠ **NOT RULED** | `[Author-committed]` — *raised and left*, per this note's stated non-answer consequence |
| **F-8 / F-9** | Noted | Author findings, recorded and accepted |

## Q6 — the supersession, recorded rather than softened

Option (d) was taken on the arithmetic this note gave: stage 1 of the UX-DR25 pattern is anchored at
three months, three calendar months is 90–92 days, and **90 is the smallest floor at which a
minimum-notice change can fire stage 1 at all**. At 60 it cannot.

⛔ **The price was paid explicitly.** Clause 6 of Decision `2026-08-16-123` was `[Trustee-ratified]` on
**2026-08-16** and is superseded **the same day**. Decision `2026-08-16-124` says so in terms and ⛔
**does not edit clause 6** ([[feedback_supersede_never_reinterpret]]). ⚠ Nothing was ever written under
clause 6 — it was superseded before a single line of implementation landed — which is why the
supersession costs one constant rather than a migration.

## Q2 — the Panel amended the draft, and the amendment matters

The draft offered here retained a normal period (*"normally for periods of about 12 months"*). The
Panel **struck it**. §4.2 now states the **notice** and the **emergency carve-out** and says **nothing
at all** about the period for which an amount is fixed.

⚠ **A consequence this note did not anticipate, recorded as clause 12 of the entry:** the Deed
(Cl. 10(b), unamended under Q3) still *permits* fixing *"for stated periods of not less than twelve
months"*, while the Niyamavali is now **silent** on periods. **Silence is not inconsistency** —
Cl. 20(a) expressly vests the power to amend *"the periods for which it is fixed"*, and a permissive
Deed clause is not contradicted by an instrument that declines to exercise it. Recorded so a future
reader does not re-raise it as a defect. It is the same **force** asymmetry finding F-2 identified: the
Deed permits; the instruments no longer constrain.

The amended text, both locales for §4.2 and both locales for T&C §4.2, is reproduced **verbatim** in
clauses 3 and 5 of the entry — ⛔ the only durable copy, since `docs/legal/` is gitignored.

## F-5 — raised as scheduled, left a second time

This note surfaced submitter-distinctness **as `deferred-work.md:4495-4503` scheduled it**, having
re-verified live that it remains reachable. It was **not ruled**. ⇒ It is carried as
`[Author-committed]` under this note's stated non-answer consequence, and the marker must record **that
it has now been carried twice** — ⛔ not silently re-deferred a third time.

## What the ruling does NOT do

Unchanged from *"What this note does NOT ask"* above, and re-stated as clause 13 of the entry: F-1 of
`2026-08-16-123` stays open (the attesting population and the hostile population still coincide, so a
shortened threat-model row ⛔ must not imply a stronger control); FR-15's *"multi-trustee approval"*
stays partially implemented; `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE` does not move; the wire code
`pool.fixed_amount_notice_too_short` is not renamed; no DB migration arises; and the UX-DR25 staged card
remains **Story 8.2's** to build.

## Disposition

Story 7.11 proceeds **from Task 2**, with the notice period at **90 days** across every register.
AC6 is extended to the **nine** PRD lines of clause 10; AC8 to `epics.md:3526` per clause 11.
