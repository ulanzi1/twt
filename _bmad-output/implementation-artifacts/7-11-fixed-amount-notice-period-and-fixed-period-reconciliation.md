---
baseline_commit: d6de14523173aed33ce8e045075d1c66002012e2
---

# Story 7.11: Fixed-Amount Notice Period + Fixed-Period Reconciliation `[GOVERNANCE]`

Status: done

Epic: 7 · Story: 11 · Key: `7-11-fixed-amount-notice-period-and-fixed-period-reconciliation`
Authored: 2026-08-16 · Baseline: `main` @ `d6de145` (clean, fetched, `== origin/main`)
**Depends on:** Story 7.5 (`done` — owns the write path this story edits), Story 10.13 (`done` — the ruling that minted this story). **Minted by:** Decision `2026-08-16-123`, clause 9.

---

> ⛔ **THIS STORY WAS MINTED BY A RULING, NOT BY THE EPIC. THERE IS NO `epics.md` ENTRY FOR IT.**
> Decision `2026-08-16-123` clause 9 directed that a successor story own the 60-day notice change and
> the twelve-month wording, and clause "The successor, minted here so it is not un-owned" named this
> exact key. `sprint-status.yaml:7268` carries it; `epics.md` does **not**. The ACs below are sourced
> from the **ruling**, `deferred-work.md:4534-4562`, and `deferred-work.md:4505-4524` — not from an
> epic. AC8 closes the `epics.md` gap as part of the work.
>
> ⛔ **THE PANEL RULED THE POLICY. IT DID NOT RULE THE TEXT, AND IT DID NOT RULE THE BOUND.**
> What is settled (`2026-08-16-123` clauses 6-9, `[Trustee-ratified]`): the normal notice period is
> **60 days, not 365**; twelve months is the **normal/planned period, not an absolute lock**; the
> **emergency mechanism remains** and bypasses the 60-day notice. What is **not** settled: the exact
> amended wording of Niyamavali §4.2 in both locales, whether Deed Cl. 10(b) needs amending at all,
> and **Q5.1's emergency-backdating lower bound** — which clause 11 routed here `[Author-committed]`
> and expressly did **not** rule. Those go to a routing note first (AC1). ⏸ **No implementation
> commit lands before Q1, Q2, Q3 and Q6 are ruled.** ⚠ **Q6 is blocking only because BigDev added a
> `90 days` option to it** — moving the floor itself, which is a **supersession** of clause 6 rather
> than an application of it.
>
> ⛔ **THE FOUR REGISTERS THE RULING NAMED ARE NOT THE ONLY REGISTERS THAT CARRY THE CLAIM.**
> The ruling named *"legal text, PRD, architecture, and implementation"*. Verified live at `d6de145`,
> the twelve-month claim also sits in the **member-facing Terms & Conditions** (`§4.2`,
> `terms-and-conditions.md:49`, hi `:52`) and in **`epics.md`** in seven places. Neither was named.
> They are raised (AC1/Q4) and dispositioned (AC8) rather than silently swept in or silently left.
>
> ⭐ **THE ONE PIECE OF GOOD NEWS, VERIFIED LIVE: THE DEED AMENDMENT IS NOT A REGISTERED-DEED ACT.**
> `trust-deed.md:7` — *"⚠️ **DRAFT — NOT YET EXECUTED.**"* Clause 22(b)'s *"two-thirds of the Trustees
> then in office … reduced to a supplementary registered deed"* (`trust-deed.md:273`) governs
> amending an **executed** deed. An unexecuted working draft is edited directly. ⇒ element (ii) of
> this story's mandate is a markdown edit plus a ratified record, **not** an external legal act. This
> is stated so the dev agent does not park the work as `_AWAITING EXTERNAL ACTION_`.

---

## Story

As the Trustee Panel that ruled the normal fixed-amount notice period down to 60 days,
I want the code, the governing instruments, the PRD and the architecture to say the same thing,
so that a member reading the rules, a trustee operating the setter, and a regulator reading the
record all find one answer instead of four.

---

## What this story is, in one paragraph

Story 7.5 built a fixed-amount schedule whose standard write path is gated by a **365-day
DB-authoritative notice floor** — one exported constant, one pure predicate, one typed error, one
wire code. Story 10.13 surfaced that the same "12 months" appears, differently worded and differently
binding, in six registers, and the Trustee Panel then **shortened the policy to 60 days** and
**disclaimed the twelve-month lock** without changing a line of code. This story is the
reconciliation: **one number in code**, **one bound the Panel has yet to set**, and **the same
sentence made true everywhere it appears**. It builds almost nothing. Its risk is not complexity —
it is *missing a register*, or *rewriting a historical record as though it had always said the new
thing*.

---

## ⛔ The governance half lands first

`git log` must read **governance → implementation**, with implementation cut from the ruling commit.
This is the 10.18 / 10.20 / 10.22 / 10.13 ritual, unchanged
([[feedback_governance_commits_precede_implementation]]):

1. `governance:`-prefixed commit — `trustee-panel-routing-note-2026-08-16-story-7-11.md`, authored,
   status `⏳ Open`.
2. Panel ruling recorded — a **single** `.decision-log.md` entry, numbered from the current head
   `2026-08-16-123` (verified live: `.decision-log.md:37`; `grep -c '^### Decision '` → **125**, of
   which one is the `YYYY-MM-DD-NNN` **template** heading at `:7182`, so **124** numbered entries).
   ⚠ Re-verify the head at ruling time; if a later entry has landed, number from **that** head.
   Per Decision `2026-08-09-095` the entry **must** label per-clause provenance —
   `[Trustee-ratified]` / `[Author-committed]` / author finding.
3. ⛔ **The amended §4.2 text must be reproduced verbatim in BOTH locales inside that entry.**
   `docs/legal/` is gitignored (`.gitignore:68`; verify live: `git check-ignore -v
   docs/legal/niyamavali.md` → `docs/legal/`), so the decision-log entry is the **only durable copy**.
   Same for any Deed Cl. 10(b) and T&C §4.2 edit the ruling authorises.
4. Only then: `story(7.11):` commits.

⚠ **Ratified policy is superseded, never re-read** ([[feedback_supersede_never_reinterpret]]). Nothing
here re-interprets Deed Cl. 10(b), §4.2 or T&C §4.2. The routing note **asks**; the ruling **amends**;
this story **applies**. ⛔ Decision `2026-08-16-123` is **never edited in place** — it stands as
recorded, and this story's entry is the next one, not a correction of it.

---

## Boundary

### In scope

- **The routing note + ruling** (AC1) — six questions, **four blocking**, every ⭐ marked
  NON-BINDING, seven author findings.
- **The 60-day notice in code** (AC2) — the constant, the predicate's name and comments, the error
  message, the wire-code semantics, the contracts DTO comments, the API copy, the admin picker `min`.
- **The emergency-backdating lower bound** (AC3) — built **or** recorded as deliberately absent,
  whichever Q1 rules. Either outcome is a discharge; silence is not.
- **Niyamavali §4.2, both locales** (AC4), **Deed Cl. 10(b)** and **T&C §4.2** (AC5), per the ruling.
- **PRD FR-15 + FR-55** (AC6) and **`architecture.md`** (AC7).
- **`epics.md`** (AC8) — the live FR-summary lines, **plus the missing Story 7.11 entry itself**.
- **Marker closure in four `deferred-work.md` entries** (AC9), recorded against the actual outcome.
- **Tests re-pinned with revert-sanity** (AC10).

### Out of scope — explicitly, with the disposition recorded

| Not built | Why | Recorded where |
|---|---|---|
| **A minimum-DURATION predicate** over `closeOpenHead` | ⛔ The Panel ruled the opposite in terms: *"There is no mandatory requirement that the fixed amount remain unchanged for 12 months. Twelve months is the normal/planned period, not an absolute lock."* Building a duration floor would contradict the ruling that minted this story. | AC1/Q5 — confirmed as a **recorded closure**, not silence |
| **Removing or weakening the emergency path** | ⛔ Express direction: *"Do not remove the emergency mechanism… It remains meaningful because it bypasses the normal 60-day notice."* Conflict C-1 was decisive. | AC2 note |
| Any change to `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE` | ⛔ `epics.md:3830`, `deferred-work.md:4468`, and Decision `2026-08-16-123` clause 5 — it is a floor, not the Deed Cl. 19(b) quorum, and it does not move. | AC1 preamble |
| Submitter-distinctness on the attesting panel | ⛔ Q2.1(c) was offered to the Panel and **not taken** (clause 3). It is an open, un-owned observation whose re-trigger is *"the next Panel ruling that touches the panel's composition"* — ⚠ **this story IS that occasion** (`deferred-work.md:4501-4503`), so it is **raised in the note** (F-5) and built only if ruled. | AC1/F-5 |
| A `trustee_directory`, or any change to eligibility enforcement | Closed by 10.13 *"by [edit]"*. Nothing here re-opens it. | — |
| A `clause_versions` migration for §4.2 | ⛔ §4.2 is **not** in the clause registry. `packages/domain/seed/niyamavali-v1-clauses.sql` seeds 23 `niy.*` clause ids (`niy.contribution-discipline.r7-*`, `niy.special-death.*`, `niy.lock-in.policy`, `niy.moderation.dwell`, …) — **none is §4.2**. The public render (`apps/public/src/lib/niyamavali-render.ts`) reads `clause_versions`, so §4.2 is not publicly rendered and no seed, migration or diff row is involved. | AC4 / F-6 |
| Any DB migration at all | ⛔ There is **no** DB constraint on `effective_from`. Migrations `0075`/`0077` CHECK only `version >= 1`, `fixed_amount > 0`, `fixed_amount <= 10000000`. The notice floor is **purely app-level**. `pnpm schema:check` has nothing to see. | AC2 / F-7 |
| The UX-DR25 Month−3 / Month−1 staged member-card transition | It is Story 8.2's surface, already recorded as such by 10.13 (AC7(c)). ⚠ At a 60-day floor its **Month−3 stage stops being guaranteed by policy** — ⛔ that is put to the Panel as **Q6** and the ruling is recorded; the **build** stays 8.2's either way. | AC1/Q6 + F-4 + AC9 |
| Re-writing Story 7.5's / 10.13's AC bodies in `epics.md` | They are **historical records of what was true when written**, not live trackers. Rewriting them would falsify the record. They get an **appended, dated note**; the live FR-summary lines get the edit. | AC8 |
| An audit of Story 7.5's other logging claims | ⛔ Offered to the Panel at 10.13's Q5.2(c) and **not taken**. | AC9 |

---

## Acceptance Criteria

### AC1 — The routing note is authored and RULED before any code `[GOVERNANCE, BLOCKING]`

**Given** Decision `2026-08-16-123` ruled the **policy** (60 days; no absolute twelve-month lock; the
emergency mechanism stays) but ruled **neither** the amended instrument text **nor** Q5.1's
backdating bound (clause 11, `[Author-committed]`, *"routed to the same successor"*)
**When** this story begins
**Then** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-7-11.md` is
authored and committed under a `governance:` prefix, carrying **six** questions each with a stated
non-answer consequence, and **seven author findings**
**And** ⛔ **Q1, Q2, Q3 and Q6 are BLOCKING** — no implementation commit lands before they are ruled
**And** ⛔ **Q6 BLOCKS BECAUSE OF OPTION (d) ALONE.** (a)/(b) touch no code and (c) adds a second floor
above an unchanged 60; **(d) moves `FIXED_AMOUNT_NOTICE_DAYS` itself**, so AC2's constant, AC6's PRD
sentences, AC7's threat-model row, AC10's boundary tests and Q2's ratified §4.2 wording all resolve to
a **different number** under it. ⚠ It was non-blocking until (d) existed; recording *why* it moved
matters more than the fact that it did
**And** ⛔ **Q2 MUST NOT BE RATIFIED BEFORE Q6.** The §4.2 draft names the notice period **in the
instrument**. Ratifying wording that says *"60 days"* and then ruling (d) would put a **freshly
ratified instrument out of date on the day it was written** — and correcting it costs a second
amendment in both locales. Either rule Q6 first, or ratify §4.2 with the number left open and close it
in the same entry
**And** the ruling is recorded as **one** `.decision-log.md` entry with per-clause provenance labels,
reproducing every amended instrument sentence **verbatim in both locales**
**And** ⚠ every recommendation is marked **NON-BINDING** — a ⭐ is a suggestion the Panel may reject,
never a default taken by silence ([[feedback_record_unattested_no_backfill]])
**And** the note states in terms that it **does not re-read** Deed Cl. 10(b), §4.2 or T&C §4.2
([[feedback_supersede_never_reinterpret]]).

**The six questions:**

| # | Question | Blocking | ⭐ Non-binding recommendation |
|---|---|---|---|
| **Q1** | **How far back may an emergency `effective_from` reach?** `fixed-amount.ts:380` says it *"MAY be `<= now()`"* with **no lower bound of any kind**. Options: (a) **no bound, recorded deliberately**; (b) **not earlier than the current open head's `effective_from`**; (c) a **symmetric lookback** (e.g. 60 days, mirroring the notice); (d) **not earlier than the latest `cycle_freeze_commits.committed_at`**. | ⛔ **YES** | ⭐ **(b)**. It is the only bound expressible from data the write path already reads, it cannot invert a window (`closeOpenHead` already clamps at `max(...)`), and it directly addresses 7.5's replay concern: a backdated emergency can no longer reach behind a head that a committed freeze may already have resolved against. ⚠ **(d)** is *tighter and more correct in intent* but requires the pool module to read cycle-freeze state from the schedule write path — a new coupling this story should not introduce unilaterally. ⚠ **(a)** is legitimate and must then be recorded in those words: *"no bound, deliberately"* ≠ *"nobody looked"*. |
| **Q2** | **The amended Niyamavali §4.2 wording, in both locales.** Today: *"set by the Board for stated periods of **not less than 12 months**"* (`niyamavali.md:102`) / *"जो बोर्ड द्वारा **कम-से-कम 12 माह** की अवधि हेतु निर्धारित होता है"* (`niyamavali.hi.md:100`). The Panel ruled twelve months is *"the normal/planned period, not an absolute lock"* — the current wording says the opposite. What exactly replaces it? | ⛔ **YES** | ⭐ Wording that states the **normal period** and the **notice**, and drops the mandatory floor — e.g. EN: *"…set by the Board, normally for periods of about 12 months, and changed on not less than 60 days' notice save under a recorded emergency adjustment."* ⚠ Offered as a **starting draft only**; the Panel writes the instrument. ⛔ The `[[310]]` / `[[310–400]]` placeholders are untouched. ⛔ Both locales are ratified **together** — the Hindi is not a later translation chore ([[project_missed_cycle_visibility_substrate]]'s both-locales discipline). |
| **Q3** | **Does Trust Deed Clause 10(b) need amending at all?** ⚠ **Author finding, put as a question, not resolved:** `trust-deed.md:147` reads *"a fixed per-Pool amount determined by the Board (**which the Board may fix** for stated periods of not less than twelve months)"* — the operative verb is **may**. On its face it **permits** twelve-month-plus fixings without **requiring** them, which is what the ruling says the policy is. §4.2 and T&C §4.2 have no such permissive verb. | ⛔ **YES** | ⭐ **Record Cl. 10(b) as already consistent and leave it unamended**, quoting the *"may"* — the smallest true act. ⚠ **This is exactly the kind of reading the Panel, not the author, must make**; it is put as a blocking question precisely because author-defaulting it would be re-reading a ratified instrument. ⭐ If the Panel prefers an edit anyway, ⛔ note that **no registered supplementary deed is required** — see F-1. |
| **Q4** | **The Terms & Conditions is a SIXTH register, and the ruling did not name it.** `terms-and-conditions.md:49` (hi `:52`) tells the **member**: *"(set by the Trustees for periods of at least 12 months)"*. It is the only one of the six a member actually accepts. Does the reconciliation include it? | No | ⭐ **Yes, include it**, edited to match whatever Q2 ratifies. ⚠ Verified live: the T&C body seeded into `terms_and_conditions_versions` today is the **placeholder** from `scripts/seed-placeholder-tc.ts`, not this markdown, so editing it needs **no version bump and no re-acceptance surfacing now** — but it will once the counsel-reviewed body (Story 0.13) is seeded. ⛔ Non-answer means the member-facing text keeps promising twelve months' notice while the code gives sixty. |
| **Q5** | **Confirm that minimum DURATION is not enforced, as a recorded closure.** The divergence 10.13 raised (`deferred-work.md:4534-4562`) was *"minimum notice is enforced, minimum duration never was"*. The ruling's answer is that there is **no** twelve-month lock — i.e. the absence is **correct**, not a gap. | No | ⭐ Record it in those words at `closeOpenHead`'s doc comment and in `deferred-work.md`, and ⛔ **build nothing**. ⚠ Non-answer means the next reader re-raises a closed question — the failure mode Q3 of Story 10.13 existed to end. |
| **Q6** | **The notice floor is also how much warning a MEMBER gets, and the ruling did not reach that.** UX-DR25 (`ux-design-specification.md:987-993`) commits a **four-stage** My Pool card transition — Month−3, Month−1, first cycle, normal — premised in terms on *"per FR-15, 12+ month notice"*. ⚠ **The floor, not the practice, is what moved.** At the new floor a minimum-notice change has no Month−3 (60 days ≈ 2 months); Month−1 and Month 0 still fire. So stage 1 stops being **guaranteed by policy** and becomes **a matter of trustee practice**. Does the Panel (a) **accept** the three-stage degradation for minimum-notice changes; (b) commit that **ordinary/planned** changes will still carry enough notice for the four-stage pattern, recorded as a practice expectation rather than a code floor; (c) set a **separate, longer floor for non-emergency planned changes**, keeping 60 days only as the hard minimum; or **(d) move the floor itself from 60 days to 90** — ⛔ a **supersession** of Decision `2026-08-16-123` clause 6, not an application of it? | ⛔ **YES** *(see the blocking note below)* | ⭐ **(d), 90 days** — ⚠ **the arithmetic is the argument, so it is given rather than asserted.** Stage 1 is anchored at three months; three calendar months is 90–92 days. At a **90-day** floor a minimum-notice change fires stage 1 **on the day it is announced** and dwells there ~60 days before Month−1 — the four-stage pattern works **by policy**, at its natural size, for every conforming change. At 60 it cannot fire at all. ⇒ 90 is the **smallest** floor that restores the guarantee, and it costs exactly one constant. ⚠ **The price, stated plainly: (d) supersedes a clause the Panel ratified on 2026-08-16.** That is legitimate — ratified policy is *superseded*, never re-read ([[feedback_supersede_never_reinterpret]]) — but the entry must **say so in terms**, and ⛔ clause 6 is never edited in place. ⭐ **(b)** remains the alternative that supersedes nothing: the floor stays 60 and the guarantee becomes a **practice expectation** — ⚠ which ⛔ **nothing enforces**, and the record must say that too. ⚠ **(a)** is legitimate and must then be recorded, because the UX spec's premise becomes false and Story 8.2 would build a stage that rarely fires. ⛔ **(c)** is a **second floor** — real code in `scheduleStandardChange`, two numbers where the system has always had one, and it reopens semantics just settled; offered for completeness, not recommended. ⛔ Non-answer means the UX spec keeps asserting a 12-month premise the policy no longer supports, and Story 8.2 inherits it unflagged. |

**The author findings the note must carry:**

- **F-1 ⭐ The Deed amendment is not a registered-deed act.** `trust-deed.md:7`: *"⚠️ **DRAFT — NOT YET
  EXECUTED. NOT LEGAL ADVICE.**"* Cl. 22(b)'s two-thirds-plus-supplementary-registered-deed mechanism
  (`:273`) governs amending an **executed** deed; Cl. 22(c) confirms the *Niyamavali* is amendable by
  the Board under Cl. 20(a) **without** amending the Deed. ⇒ Q3 is a drafting question, not a legal
  proceeding, and this story is **not** `_AWAITING EXTERNAL ACTION_`.
- **F-2 — The three texts differ in FORCE, not just in wording.** Deed Cl. 10(b) says the Board
  **may** fix for such periods; §4.2 and T&C §4.2 state it as a **constraint**. Any ruling that edits
  one and not the others must say which reading now governs.
- **F-3 — The T&C is the register with a member on the other side of it.** See Q4.
- **F-4 ⭐ PROMOTED TO Q6 — A 60-day floor makes UX-DR25's Month−3 stage unreachable.** ⚠ Raised as
  a **question**, not only a finding, at BigDev's direction: the Panel ruled the notice period without
  the member-communication consequence in front of it. Retained here as a finding **as well as** Q6 —
  the 10.13 `F-2 → Q2.2` precedent, where the finding states the fact and the question asks the
  decision.
  `ux-design-specification.md:987-993` (and `epics.md:404`) commit a four-stage member-card
  transition beginning *"Month -3 onwards"*, explicitly *"per FR-15, 12+ month notice"*. At a 60-day
  floor a minimum-notice change never has a Month−3. ⚠ The staged pattern is **Story 8.2's** surface
  and 10.13 already recorded it as unbuilt (a single always-on line at
  `ActiveContributionCard.tsx:211-218`); this finding records that the **spec's own premise** moved,
  so a future reader does not implement a stage that cannot fire. ⛔ Not a build here.
- **F-5 — This story is the scheduled re-trigger for the submitter-distinctness observation.**
  `deferred-work.md:4501-4503` names the re-trigger as *"the next Panel ruling that touches the
  emergency attesting panel's composition — Story 7.11 is the first scheduled occasion, since it
  re-opens the emergency path's notice semantics."* ⚠ Surfaced to the Panel **as scheduled**; ⛔ not
  built unless ruled, and ⛔ not silently re-deferred without saying so.
- **F-6 — §4.2 is not in the clause registry, so this is a markdown-plus-record act.** 23 seeded
  `niy.*` clause ids, none of them §4.2 (`packages/domain/seed/niyamavali-v1-clauses.sql`). No
  migration, no `niyamavali_amendments` row, no public-render change, no diff view.
- **F-7 — No DB constraint governs `effective_from`.** Migrations `0075`/`0077` constrain `version`
  and `fixed_amount` only. The 60-day change is one constant; `pnpm schema:check` sees nothing.

### AC2 — The ruled notice period in the code, said once and meant everywhere

**Given** Decision `2026-08-16-123` clause 6 (`[Trustee-ratified]`)
**When** the notice floor is changed
**Then** `FIXED_AMOUNT_NOTICE_DAYS` (`packages/domain/src/pool/fixed-amount.ts:63`) is **60** — or
**90** if Q6 rules (d) — and it remains the **single** source of the floor. ⛔ No second literal, no
per-caller override, and ⛔ **one number across all seven registers**: whatever Q6 leaves standing is
the number in the code, the error message, the admin `min`, the PRD, the threat-model row, the
instruments and the tests. ⚠ A diff that lands 60 in one register and 90 in another is the exact
failure this whole story exists to end
**And** every doc comment, error message, DTO comment, route comment, admin label and admin `min`
attribute that today says *"12 months"* / *"365 days"* about the **standard-change notice** says
sixty instead — enumerated exhaustively in *Dev Notes → The exact edit sites*
**And** `PoolFixedAmountNoticeTooShortError`'s message (`errors.ts:226-227`) states the new floor
**And** ⛔ the wire code `pool.fixed_amount_notice_too_short` (`errors.ts:214`) is **NOT renamed** — it
is a shipped, client-observable contract string and the code names the *condition*, not the number
**And** ⛔ the **emergency path keeps no floor at all** (`applyEmergencyOverride`), per clause 8; a
diff that touches the emergency notice semantics is out of scope by ruling
**And** `MAX_POOL_FIXED_AMOUNT_INR`, `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE`, `closeOpenHead`'s `max(...)`
clamp and every 10.13 eligibility guard are **untouched**.

⚠ **The naming trap.** `meetsNoticeFloor` is well named and stays. `STANDARD_EFFECTIVE_FROM_MIN` /
`defaultStandardEffectiveFrom` in `FixedAmountPage.tsx:44-52` hardcode `365` / `366` **in the admin
app**, which does **not** import the domain constant. Change both, and say in the comment that the
server is the real gate — the client `min` is convenience, never the boundary.

### AC3 — The emergency-backdating lower bound, built or recorded

**Given** Q1's ruling
**When** it is applied
**Then** **either** the bound is enforced in `applyEmergencyOverride` — a pure, DB-free predicate
alongside `meetsNoticeFloor`, a new typed `PoolFixedAmount…Error` with its own stable wire code, a
translated HTTP status in `handlers.ts`, unit tests at the boundary and a live-DB test — **or** the
decision *"no bound, deliberately"* is recorded at `ApplyEmergencyOverrideInput.effectiveFrom`'s doc
comment (`fixed-amount.ts:380`) in those words, with the reason
**And** whichever it is, `deferred-work.md:4505-4524` (*"the emergency-BACKDATING lower bound"*) is
closed against the **actual** outcome using the exact vocabulary — *"Closed by [edit]"* vs *"Resolved
via explicit deferral"* ([[feedback_closure_language_precision]]). ⛔ Never *"addressed"*.

### AC4 — Niyamavali §4.2, both locales, ratified verbatim

**Given** Q2's ruling
**When** §4.2 is amended
**Then** `docs/legal/niyamavali.md:101-104` and `docs/legal/niyamavali.hi.md:99-102` carry the
ratified text, **both locales changed in the same commit**
**And** ⛔ the amended text is reproduced **verbatim, in both locales, inside the `.decision-log.md`
entry** — `docs/legal/` is gitignored, so the entry is the only durable copy; a working-tree loss
otherwise loses the instrument
**And** ⛔ **no** `clause_versions` row, migration, `niyamavali_amendments` edge or public-render
change is created (F-6)
**And** the `[[310]]` / `[[310–400]]` bracket placeholders are preserved untouched.

⛔ **The one ruling that would be a supersession, not an application.** If the Panel's Q2 wording re-instates twelve months as a **minimum period**, that contradicts Decision `2026-08-16-123` clause 7 (*"there is no mandatory requirement that the fixed amount remain unchanged for 12 months"*, `[Trustee-ratified]`). The entry must then say **in terms** that it supersedes clause 7 — and this story's code half changes shape with it. ⛔ Never absorb such a ruling as though it were consistent with the one that minted this story ([[feedback_supersede_never_reinterpret]]).

### AC5 — Trust Deed Clause 10(b) and Terms & Conditions §4.2, per the ruling

**Given** Q3's and Q4's rulings
**When** they are applied
**Then** `trust-deed.md:147` is **either** amended **or** recorded as already consistent with the
*"may"* reading quoted — and whichever it is appears in the decision entry, not only in a commit
message
**And** if Q4 rules "include", `terms-and-conditions.md:49` and `terms-and-conditions.hi.md:52` carry
matching text, **both locales in the same commit**, reproduced verbatim in the entry
**And** if Q4 rules "exclude", the T&C's divergence from the code is recorded in `deferred-work.md`
with a named owner and a concrete re-trigger — ⛔ an un-owned divergence from a **member-facing**
document is precisely what [[feedback_record_unattested_no_backfill]] says decays.

### AC6 — PRD FR-15 and FR-55 say sixty days

**Given** Decision `2026-08-16-123` clause 9 names the **PRD** among the registers to reconcile
**When** the PRD is edited
**Then** `prd.md:463` (the FR-15 heading, *"over 12+ month periods"*), `:465` (*"changes announced
12+ months in advance"*) and `:469` (the **testable consequence** — *"requires a future
`effective_from` ≥ now + 12 months"*) state **the ruled notice period** (60 or 90, per Q6) and drop the
mandatory twelve-month period, retaining the emergency carve-out verbatim in force
**And** ⛔ `prd.md:849` — **FR-55**, *"Effective date ≥ now + 12 months (FR-15)"* — is edited too.
⚠ **It restates FR-15 and the ruling did not name it.** Leaving it is the classic half-reconciliation:
the register agrees with itself in one clause and contradicts itself two sections later
**And** FR-15's *"multi-trustee approval"* clause is **left exactly as it is** — Decision
`2026-08-16-123` clause 14 records that it stays **partially** implemented, and this story does not
change that either way.

### AC7 — `architecture.md`'s threat model reflects a shortened, not removed, control

**Given** clause 9 names **architecture**, and conflict C-3 recorded that the mitigation is
*"shortened, not removed — 60 days of cooling-off, not zero"*
**When** `architecture.md` is edited
**Then** `:1324`'s hostile-trustee row reads *"cooling-off period via 60-day notice (FR-15)"* — or
**90-day**, per Q6 — the control **survives**, at a shorter window
**And** `:73-74`'s Pool Engine summary (*"fixed-amount-over-12-months"*) is reconciled
**And** ⚠ the row's honesty is preserved: Decision `2026-08-16-123` clause 13 records that **F-1 is
not closed** — the eligible attestor set still includes the `pariwar_admin` population this row names
as the hostile actor. ⛔ Do not let a tidier row imply a stronger control than exists.

### AC8 — `epics.md`: the live lines follow the PRD, the historical bodies are annotated, and Story 7.11 gets an entry

**Given** `epics.md` carries the twelve-month claim in seven places and the ruling named **four**
registers, not this one
**When** `epics.md` is edited
**Then** the **live FR-summary lines** — `:56` (FR-15), `:109` (FR-55), `:2774` (Epic 7's FR list) —
follow the PRD, because they exist to restate it
**And** the **historical AC bodies** — `:2884` / `:2891` (Story 7.5, `done`), `:3806` / `:3813`
(Story 10.13, `done`), `:3058` (Story 8.2's card behaviour), `:404` (UX-DR25) — are **NOT rewritten
in place**. Each gets a short **appended, dated note** pointing at Decision `2026-08-16-123` and this
story. ⚠ Rewriting a shipped story's ACs would make the record claim the story built something it did
not; the same reason 10.13 deliberately left the 1.18 / 10.18 / 7.5 **story files** alone
**And** ⭐ a **`### Story 7.11:` entry is added to Epic 7**, after Story 7.10 (`:2985`), with the user
story, the ACs in epic form, and `**Depends on:** Story 7.5, Story 10.13`. ⛔ `sprint-status.yaml`
names this key and `epics.md` does not — the exact shape of un-owned drift the mint was designed to
prevent, one register down
**And** Epic 7's story count (*"**10 stories**"*, `:614`) is corrected to eleven — **and** the same
claim's **second** occurrence at `:5200` (`## Workflow Progress Tracker` → `Progress summary` → *"✅
Epic 7 — 10 stories (atomic cycle-freeze + facilitated-recovery)"*) is corrected too. ⚠ Verified live:
this second line was not named by Decision `2026-08-16-123` or found by a first pass — it is exactly
the kind of second, uncited register this story exists to catch in others; corrected here so it is not
left as an unnoticed count drift the moment Story 7.11 itself needs counting.

### AC9 — Four `deferred-work.md` markers closed against the actual outcome, either way

**Given** four entries name this story or fall due at it
**When** the work lands
**Then** each is closed with the outcome that actually occurred, in the vocabulary that fits it:

| Entry | Lines | What closure must say |
|---|---|---|
| *"minimum NOTICE is enforced, minimum DURATION never was — OWNED BY STORY 7.11"* | `:4534-4562` | ⭐ **"Closed by [edit]"** for the four named registers — ⚠ **and it must say that duration is deliberately NOT enforced**, per the ruling, rather than implying a duration predicate shipped. |
| *"the emergency-BACKDATING lower bound"* | `:4505-4524` | Per AC3 — *"Closed by [edit]"* if bounded, *"Resolved via explicit deferral"* if the Panel rules "no bound, deliberately". |
| *"a submitting trustee may list THEMSELVES among the attestors"* | `:4495-4503` | ⚠ This story **is** its named re-trigger. Record that it was **raised** to the Panel (AC1/F-5) and what was ruled — including *"raised and left"*, if that is the answer. ⛔ Not silently carried forward a second time. |
| *"`assertPanelAuthorized` now exists THREE times"* | `:4526-4532` | ⛔ **Untouched.** Its re-trigger is a fourth call site; this story adds none. |

**And** the UX-DR25 Month−3 question (Q6 / F-4) is recorded as a **new** entry owned by Story **8.2**
carrying **what the Panel actually ruled** — ⛔ if Q6 rules (b), the entry records a *practice
expectation* and says plainly that it is **not** a code invariant and nothing enforces it; if (a), it
records that stage 1 is expected to fire rarely, so 8.2 builds it knowing that. Named owner, concrete
re-trigger, and ⛔ a story key that exists in `sprint-status.yaml`, never an epic
([[project_r7_fact_producer_unbuilt]]).
**And** if Q6 rules (b), `ux-design-specification.md:987` — which premises the pattern on *"per FR-15,
12+ month notice"* — is annotated with the ruling, so the spec stops asserting a premise the policy no
longer guarantees. ⚠ This is a **seventh** register, surfaced by Q6 and named nowhere in Decision
`2026-08-16-123`.

### AC10 — The tests move with the number, and the move is proven

**Given** three suites pin `365` today
**When** they are updated
**Then** `packages/domain/tests/pool/fixed-amount.test.ts:90-111` — the `meetsNoticeFloor` describe
block, its title, and its four boundary cases — asserts the **60-day** boundary: one day short
rejects, **exactly at the floor** accepts (inclusive), well beyond accepts, past/now rejects. ⚠ Write
the cases against `FIXED_AMOUNT_NOTICE_DAYS`, never against a bare `60` — the existing suite already
does this and it is why a value change does not require re-deriving every case
**And** `packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts:175-200` (test `(d)`) keeps
its shape — a short-notice standard change **rejected**, a long-notice one **accepted**, an emergency
**bypassing** — with a rejection case that is short at the new floor but ⚠ **would have passed at 365**
inverted correctly: the accepted case must now be one the **old** floor would have **rejected**
(e.g. 90 days out), or the suite proves nothing about the change
**And** `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts:196-205` still returns
`400` + `pool.fixed_amount_notice_too_short` for a sub-floor date
**And** ⭐ **revert-sanity is RUN, not asserted** ([[feedback_gate_scope_semantic_coverage]]): with
`FIXED_AMOUNT_NOTICE_DAYS` put back to `365`, **at least one unit test AND at least one live-DB test
must fail**; restore and re-verify green. Record the observed counts. ⚠ A suite that passes at both
60 and 365 is not testing the floor
**And** if AC3 builds a bound, it carries its own boundary unit tests **and** a live-DB test
**And** `pnpm --filter @twt/domain test`, `--filter @twt/api test`, `--filter @twt/contracts test`,
`--filter admin test` are run; `pnpm ci:local` is run and **recorded AS OBSERVED**, never as green
([[feedback_record_unattested_no_backfill]], [[project_known_livedb_test_failures]] #14 —
`@twt/api` full-suite runs surface a different red spec each run; confirm innocence by running a
suspect spec in isolation).

---

## Tasks / Subtasks

- [x] **Task 1 — The routing note (AC1)** ⏸ **STOP AFTER THIS TASK UNTIL RULED** — ✅ **RULED, Decision `2026-08-16-124`**
  - [x] `git fetch origin`; confirm `main == origin/main`; cut
        `governance/7-11-fixed-amount-notice-period-and-fixed-period-reconciliation`
        ([[feedback_git_fetch_before_remote_reasoning]])
  - [x] ⛔ **Re-read every citation from SOURCE at the baseline commit.** Do not carry a line number
        from this story file. The 10.13 note found four line-number drifts and one quote
        mis-attribution in its own draft pre-commit; the 10.22 note shipped a wrong Deed clause
        ([[feedback_verify_before_committing_governance_claims]])
  - [x] Author `trustee-panel-routing-note-2026-08-16-story-7-11.md`: the six questions (Q1/Q2/Q3/Q6
        ⛔ BLOCKING), the seven findings F-1…F-7, a *"What non-answer would mean"* table, a *"What
        this note does NOT ask"* section, and a completable **Ruling template**
  - [x] Commit `governance(7.11): …`. ⏸ **HALT.** No code, no `.decision-log.md` entry, no test run
  - [x] On ruling: **one** `.decision-log.md` entry numbered from the live head, per-clause
        provenance labelled, amended instrument text verbatim in **both locales**; update the note's
        status line to `✅ RULED <date>` with the superseded `⏳ Open` line **retained**, never
        overwritten. Commit `governance(7.11): Decision <id> — …`

- [x] **Task 2 — The 60-day constant and its truthful surroundings (AC2)**
  - [x] `packages/domain/src/pool/fixed-amount.ts` — `:63` the constant; `:9-10`, `:70`, `:142-146`,
        `:282`, `:332`, `:341`, `:356`, `:404` the comments
  - [x] `packages/domain/src/pool/errors.ts:217`, `:226-227` — the message. ⛔ `:214`'s wire code
        string is untouched
  - [x] `packages/domain/src/pool/index.ts:38`; `schema/pool_fixed_amount_schedule.ts:14`, `:40-41`;
        `schema/pool_fixed_amount_emergency_attestations.ts:5`
  - [x] `packages/domain/src/rbac/permissions.ts:256`, `:708`; `rbac/roles.ts:125` — the key
        descriptions. ⛔ **No catalog version bump**: comment-only edits move no key and no bundle
        ([[project_fixed_amount_panel_eligibility_substrate]])
  - [x] `packages/contracts/src/pools/fixed-amount.ts:6`, `:168`, `:172`, `:182`;
        `contracts/src/pools/index.ts:17`. ⚠ Then `pnpm contracts:emit-openapi` +
        `pnpm contracts:check-openapi-determinism` — comment-only edits should leave the emitted
        OpenAPI byte-identical; if it moves, a **description** changed and the diff must be reviewed
  - [x] `apps/api/src/modules/pool-fixed-amount/handlers.ts:4`, `:56-59`, `:264`; `index.ts:6`,
        `:98`; `apps/api/src/server.ts:266`; `audit/audit-sink.ts:398`, `:403`;
        `modules/pariwar-provisioning/index.ts:54`
  - [x] `apps/admin/src/api/client.ts:1348`; `api/hooks.ts:732`, `:765`
  - [x] `apps/admin/src/modules/pool-fixed-amount/FixedAmountPage.tsx:5`, `:44-52` (`365` → 60,
        `366` → the default), `:210`, `:223`; `i18n-en.ts:22` (*"at least 12 months in advance"*)
  - [x] ⚠ Re-grep before declaring done:
        `grep -rn "12 month\|12-month\|twelve month\|365" packages apps --exclude-dir=node_modules
        --exclude-dir=dist | grep -i "fixed.amount\|notice"` must return **only** intentional
        historical references
  - [x] `pnpm microcopy:check` — `FixedAmountPage.tsx` is inside the gate's admin scope and its
        FM-14 magic-number check reads live React components

- [x] **Task 3 — The backdating bound, per Q1 (AC3)**
  - [x] If bounded: the pure predicate + typed error + wire code + `handlers.ts` translation + the
        contracts comment. Follow `meetsNoticeFloor`'s shape exactly — DB-free, unit-testable, the
        DB-authoritative instant supplied by the caller, never a JS `new Date()` (§1.11)
  - [x] If not: the recorded closure at `fixed-amount.ts:380`, in the Panel's own words

- [x] **Task 4 — The instruments (AC4, AC5)**
  - [x] §4.2 both locales; Deed Cl. 10(b) per Q3; T&C §4.2 both locales per Q4
  - [x] ⛔ Verify each edited file against the decision entry's verbatim block **after** editing —
        the entry is the durable copy and the two must agree character for character
  - [x] ⛔ No migration, no seed, no `clause_versions` row (F-6)

- [x] **Task 5 — PRD + architecture (AC6, AC7)**
  - [x] `prd.md:463`, `:465`, `:469`, `:849`
  - [x] `architecture.md:1324`, `:73-74`

- [x] **Task 6 — `epics.md` (AC8)**
  - [x] Live FR-summary lines `:56`, `:109`, `:2774`
  - [x] Appended dated notes at `:2884`/`:2891`, `:3806`/`:3813`, `:3058`, `:404` — ⛔ never an
        in-place rewrite of a shipped story's ACs
  - [x] The new `### Story 7.11:` entry after `:2985`; the Epic 7 count at **both** `:614` and `:5200`
        → eleven

- [x] **Task 7 — The markers (AC9)**
  - [x] The four `deferred-work.md` entries per AC9's table, each with the **precise** closure verb
  - [x] The new Story 8.2-owned UX-DR25 entry with a concrete re-trigger

- [x] **Task 8 — Tests, gates, revert-sanity (AC10)**
  - [x] Update the three suites; **run the revert-sanity both ways** and record observed counts
  - [x] `pnpm --filter @twt/domain lint && test`; `--filter @twt/api test`;
        `--filter @twt/contracts test`; `--filter admin test`; `pnpm typecheck`
  - [x] `pnpm pool-support-category:check`, `pnpm domain-invariants:check`, `pnpm microcopy:check`,
        `pnpm friction:check`, `pnpm schema:check` (expected: no schema delta — F-7),
        `pnpm i18n:check`
  - [x] `pnpm ci:local` — ⛔ **recorded AS OBSERVED**. If red, name the failing specs; if the log is
        truncated, say so and do **not** reconstruct
  - [x] Flip `development_status[7-11-…]` and append **one** combined `last_updated` ledger entry at
        the top of `sprint-status.yaml` ([[project_sprint_status_ledger]])

---

### Review Findings

- [x] [Review][Patch] **(resolved D1 — rewrite history)** Decision `2026-08-16-125` landed inside the `story(7.11):` implementation commit rather than as its own prior `governance(7.11):` commit — `git log d6de145..be5b19d` shows only `284df18` (governance, routing note) and `948468b` (governance, Decision 124) as governance-prefixed commits; Decision 125's +45-line `.decision-log.md` entry is added by `be5b19d` itself, alongside the code it authorizes. This violates the story's own "governance half lands first" ritual, and `be5b19d`'s commit message assertion that both Decisions 124 and 125 "landed before this commit" is false for 125. Decision 125's text claims to follow the `2026-08-16-122` append-only precedent, but that precedent was a standalone prior commit — this isn't. **Fix:** split `be5b19d` into a `governance(7.11):` commit (Decision 125's `.decision-log.md` hunk only) landing before the implementation commit, and correct the implementation commit's message to no longer claim Decision 125 landed before it.
- [x] [Review][Patch] **(resolved D2 — confirmed, recorded)** The story's own "Open questions for BigDev" §3 explicitly asks whether renaming `prd.md:463`'s FR-15 heading is acceptable, "or the PRD keeps a title that contradicts its own body" — the diff renames it anyway with no recorded answer anywhere in the diff, appearing to be exactly the "default taken by silence" this project's discipline forbids ([[feedback_record_unattested_no_backfill]]). **Resolution:** confirmed acceptable by the user (BigDev) on 2026-08-16 during code review; **fix:** append the confirmation to the "Open questions for BigDev" §3 entry so it is not a silent default.
- [x] [Review][Patch] **(resolved D3 — fix now)** A backdated emergency landing between the amount-in-force and a pending future standard change leaves the superseded "in force" row's `effective_until` pointing past the new emergency row's `effective_from` — an overlapping/stale window on the schedule record (`packages/domain/src/pool/fixed-amount.ts:326-352` `closeOpenHead` never re-touches the in-force row when the bound is checked against it instead of the open head). Point-in-time resolution self-heals via the `effective_from DESC` tie-break, but the audit trail (`listFixedAmountSchedule`) can show two overlapping-looking rows. Test `(g)` in `pool-fixed-amount.spec.ts` covers the resolution correctness but never asserts on the genesis row's `effective_until` or checks for overlap. **Fix:** extend the emergency-override write path to also re-clamp the in-force row's `effective_until` (mirroring `closeOpenHead`'s existing `max()`-clamp discipline), plus a regression test asserting no overlap.
- [x] [Review][Patch] **(resolved D4 — fix now)** TOCTOU: `applyEmergencyOverride`'s new backdating-bound check reads "amount in force" once (`fixed-amount.ts:477-491`), then `closeOpenHead` independently re-reads "current open head" later in the same transaction (`fixed-amount.ts:326-352`) under plain `BEGIN` / READ COMMITTED (`apps/api/src/modules/multi-tenant/scope-tx.ts:37`) — no re-validation ties the two reads together. Two concurrent emergency overrides can interleave so the second's bound check passes against a now-stale snapshot, then commits behind an amount a first, already-committed emergency put in force — the exact scenario the bound exists to prevent. **Fix:** re-validate `meetsEmergencyBackdatingFloor` against the same row/snapshot `closeOpenHead` reads, inside the same transaction, closing the window (e.g. re-read after acquiring the row lock `closeOpenHead` already needs).
- [x] [Review][Defer] **(resolved D5 — defer)** (minor) "Three calendar months is 90–92 days" is asserted as settled arithmetic across the decision-log entry, story file, sprint-status ledger, routing note, and UX-spec annotation to justify 90 as "the smallest floor that restores the guarantee... for every conforming change" — but a three-calendar-month span spanning February in a non-leap year can be as short as 89 days (e.g. Feb 1 → Apr 30). The universal claim is not accurate for all calendar alignments; low real-world impact, but the claim sits inside ratified decision text — deferred, pre-existing reasoning nit, no code impact. **Reason:** ratified decisions are never edited in place; a correction would need its own append-only clarifying entry, not warranted for a 1-day calendar-edge nit with no code impact.
- [x] [Review][Patch] `PoolFixedAmountEmergencyBackdatedBeforeHeadError`'s JSDoc, thrown `.message`, and public field name (`openHeadEffectiveFrom`) describe the bound as measured against "the current open head" — the exact reading Decision `2026-08-16-125` ruled OUT in favor of "the amount in force." [`packages/domain/src/pool/errors.ts:238,247,254,256-258`] Same stale wording duplicated in the DTO comment [`packages/contracts/src/pools/fixed-amount.ts:172`]. The runtime call (`fixed-amount.ts:484`, `resolveEffectiveFixedAmountRow`) and the predicate's own doc comment are already correct — only the error's docs/message/field name and the contracts comment are stale. The API's client-facing translation (`handlers.ts:65-69`) is correct, so this is confined to internal naming/docs.
- [x] [Review][Patch] `applyEmergencyOverride` reaches for `(inForce as { effectiveFrom: Date }).effectiveFrom.toISOString()` via an unchecked type assertion instead of a real `if (!inForce)` null-narrowing check — the "non-null: predicate only rejects when in-force exists" guarantee lives only in a comment, not the type system. [`packages/domain/src/pool/fixed-amount.ts`, `applyEmergencyOverride`]
- [x] [Review][Patch] The routing note file is internally self-contradictory: its header states "Status: ✅ RULED 2026-08-16" while body text still reads "No code has been written. The story is `in-progress` at its governance half and stops at Task 2 until this note is ruled" — stale pre-ruling boilerplate left unremoved after ruling landed. [`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-7-11.md`]
- [x] [Review][Patch] The "register count" narrative drifts across the story/routing note/sprint-status without reconciliation: four (ruling-named) → six (+ T&C, epics.md) → seven ("the seventh register," used consistently in the routing note and AC9) → nine (Dev Agent Record / deferred-work closure / sprint-status ledger, apparently folding in `deferred-work.md` itself as a "register"). The jump to nine is never reconciled against the "seven" the same document established earlier.
- [x] [Review][Patch] Decision `2026-08-16-123` clause 9 is cited as "precedent" for unilaterally minting Story `8-15-fixed-amount-transition-staged-card`, while the same passage concedes the mint is "an un-ratified author mint, not a Panel act" — clause 9's actual precedent was a Panel-ratified directive, so invoking it as precedent for an explicitly non-ratified act misapplies it.
- [x] [Review][Patch] `expect(FIXED_AMOUNT_NOTICE_DAYS).toBe(90)` is counted within AC10's revert-sanity pass/fail evidence (observed counts at 90/365/60) alongside genuinely behavioral tests — a direct equality pin on the constant trivially fails under any reversion regardless of whether `meetsNoticeFloor`'s actual wiring is correct, padding the failure count rather than independently confirming the boundary logic. The separately-cited "accepts 120 days out" test is the behaviorally meaningful case.
- [x] [Review][Patch] No E2E/HTTP-level test exercises the new `pool.fixed_amount_emergency_backdated_before_head` branch in `translateFixedAmountError` (`apps/api/src/modules/pool-fixed-amount/handlers.ts:65-71`) — every sibling error branch (`notice_too_short`, `reason_required`, `attestation_required`, `panel_too_small`, `panel_duplicate_actor`, `panel_member_unauthorized`, `invalid`, `version_conflict`) has a corresponding integration test in `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts`; this one has zero matches for `backdat`.
- [x] [Review][Defer] Every decision-log ruling (including this diff's Decisions 124 and 125) is authored, argued for, and "Ruled" by the same named party ("BigDev, Solo Builder") with no distinct Panel member, vote, or quorum recorded — a systemic pattern across the whole decision log, not introduced by this diff — deferred, pre-existing

## Dev Notes

### The one-paragraph mental model

There is exactly **one** number in the system (`FIXED_AMOUNT_NOTICE_DAYS`), exactly **one** predicate
that reads it (`meetsNoticeFloor`), and exactly **one** write path that calls it
(`scheduleStandardChange`). Everything else that mentions "12 months" is **prose about that number**
— comments, error text, DTO docs, admin labels, a PRD sentence, a threat-model row, two legal
sentences and a member-facing one. The code change is trivial. The story is the prose, and the prose
is spread over six registers in two languages, three of which the ruling did not name.

### Architecture compliance — the constraints that bind this work

- **§1.11 DB-authoritative time.** The floor is evaluated against `SELECT now()`, never a JS clock, so
  a trustee-controllable app-server clock cannot shrink the cooling-off window
  (`fixed-amount.ts:149-158`, `:356-361`). ⛔ Any bound AC3 adds obeys the same rule.
- **The transaction contract.** `packages/domain/src/pool/fixed-amount.ts` runs statements on the
  passed `db` and opens **no** transaction of its own — RLS scope (`SET LOCAL app.pariwar_id`) is
  transaction-scoped, so the caller is already inside one. ⛔ Do not add a transaction here.
- **Support-category-token-free.** The module is auto-scanned by
  `pool-support-category-invariant`'s recursive `pool/` walk. ⛔ No hardcoded category strings.
- **The domain limit-clamp gate** clamps every dynamic `.limit()`
  ([[project_domain_limit_clamp_and_savepoint_retry]]) — it caught a named-const `.limit()` during
  10.13. If Task 3 adds a query, expect it.
- **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces**
  ([[project_contracts_domain_bundle_boundary]]) — so the contracts DTO cannot import
  `FIXED_AMOUNT_NOTICE_DAYS`. Its comment restates the number; that duplication is **structural, not
  sloppiness**, and it is exactly why this reconciliation is needed at all.

### The exact edit sites, enumerated

**Code — the number and its prose** (verified live at `d6de145`):

| File | Lines | What |
|---|---|---|
| `packages/domain/src/pool/fixed-amount.ts` | `62-63` | **the constant** + its doc |
| | `9-10`, `70`, `142-146`, `282`, `332`, `341`, `356`, `404` | comments naming 365 / 12-month |
| `packages/domain/src/pool/errors.ts` | `217`, `226-227` | error doc + message. ⛔ `214` wire code stays |
| `packages/domain/src/pool/index.ts` | `38` | module header |
| `packages/domain/src/schema/pool_fixed_amount_schedule.ts` | `14`, `40-41` | column docs |
| `packages/domain/src/schema/pool_fixed_amount_emergency_attestations.ts` | `5` | header |
| `packages/domain/src/rbac/permissions.ts` | `256`, `708` | key descriptions |
| `packages/domain/src/rbac/roles.ts` | `125` | bundle comment |
| `packages/contracts/src/pools/fixed-amount.ts` | `6`, `168`, `172`, `182` | module + DTO docs |
| `packages/contracts/src/pools/index.ts` | `17` | header |
| `apps/api/src/modules/pool-fixed-amount/handlers.ts` | `4`, `56-59`, `264` | header, the **400 message**, route doc |
| `apps/api/src/modules/pool-fixed-amount/index.ts` | `6`, `98` | route docs |
| `apps/api/src/server.ts` | `266` | route registration comment |
| `apps/api/src/audit/audit-sink.ts` | `398`, `403` | audit-action docs |
| `apps/api/src/modules/pariwar-provisioning/index.ts` | `54` | genesis-seed comment |
| `apps/admin/src/api/client.ts` | `1348` | client doc |
| `apps/admin/src/api/hooks.ts` | `732`, `765` | hook docs |
| `apps/admin/src/modules/pool-fixed-amount/FixedAmountPage.tsx` | `5`, `44-52`, `210`, `223` | header, **`365`/`366` literals**, section heading, field label |
| `apps/admin/src/modules/pool-fixed-amount/i18n-en.ts` | `22` | `fixedAmount.header.subtitle` |

**Tests:** `packages/domain/tests/pool/fixed-amount.test.ts:90-111`;
`packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts:175-200`;
`apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts:196-205`.
⚠ `apps/admin/tests/fixed-amount-page.test.tsx` does **not** assert the notice window today — verified
live; do not go looking for an assertion that is not there.

**Registers:** `docs/legal/niyamavali.md:101-104` / `.hi.md:99-102`; `docs/legal/trust-deed.md:147`;
`docs/legal/terms-and-conditions.md:49` / `.hi.md:52`; `prd.md:463`, `:465`, `:469`, `:849`;
`architecture.md:73-74`, `:1324`; `epics.md:56`, `:109`, `:404`, `:614`, `:2774`, `:2884`, `:2891`,
`:2985`, `:3058`, `:3806`, `:3813`, `:5200`; `deferred-work.md:4495-4562`.

⚠ **Line numbers drift the moment the first edit lands.** They are a map, not an oracle — re-locate by
content, and re-verify before citing any of them in a governance commit.

### Previous-story intelligence — what Story 10.13 learned, one story ago

- **The register set is bigger than the ruling's list, every time.** 10.13 closed its marker in
  **three** live registers and deliberately left the **story files** alone. Copy that split: live
  registers get the edit, historical records get an appended note.
- **Ordering is load-bearing in ways typechecking cannot see.** 10.13's route had to open the scope
  tx *before* resolving displays or a refused actor got the **wrong error and the wrong audit
  reason**. Nothing here reorders a route — but the lesson generalises: when two failures are both
  reachable, which one the operator sees is a product decision.
- **A test can encode the defect.** 7.5's own E2E asserted "no grant is required" as correct, with a
  comment saying so deliberately. When updating the notice suites, ask of each assertion: *would this
  also pass under the old number?* If yes, it is not testing the change.
- **`ci:local` is oversubscribed and flakes a different package each run**
  ([[project_ci_local_concurrency_oversubscription]], [[project_known_livedb_test_failures]] #14).
  10.13 recorded two red runs with **different** failing sets, proved every named spec green in
  isolation, and shipped with the observation recorded rather than a green claim manufactured. Do the
  same. `member-moderation/` red is 10.19/10.20/10.22 territory, not this story's.
- **The friction budget's AC-4 diffs COMMITTED history** ([[project_friction_budget_baseline_ratchet]])
  — it passes vacuously until you commit, and `git push` runs the full `ci:local` via a pre-push hook
  (that is the "hang", not a failure). ⚠ This story **reduces** friction (a shorter notice) and adds
  no member-facing forced step, so it is not expected to add a row — but if AC3 builds a bound, that
  is a **trustee-facing** constraint and the 10.13 row's `payer: trustee` precedent shows such rows
  do exist here. Decide explicitly; do not let the gate decide by silence.

### Git intelligence (`d6de145`, and the four commits before it)

`d6de145` (Story 10.13, PR #192) is the direct parent of this work and touched every file this story
touches. Read its diff before planning. The Epic-10 branch pattern in `9fb88c3`…`0b49a61` shows the
ritual this story repeats: `governance:` commits first, then `story(N):` commits, then a `docs(N):`
status commit. `0b49a61` is instructive for a different reason — it is a **record correction** landed
append-only, without editing the entry it corrects.

### Testing standards

- **Unit** (`packages/domain/tests/pool/`) — DB-free, boundary-exact. `meetsNoticeFloor` is pure and
  its boundary **is** the contract: `>=` is inclusive, and the "exactly at the floor" case must stay.
- **Live-DB integration** (`packages/domain/tests/integration/`, `apps/api/tests/integration/`) —
  test DB `twt-test-pg` on **:5433**. ⛔ Never regenerate an applied migration (42P07); never
  `DROP SCHEMA` (42P01); assert **membership, not counts**, because own-committing writers run
  concurrently ([[project_live_db_test_gotchas]]).
- ⚠ **The date-bomb class** ([[project_known_livedb_test_failures]] #12): a pinned query instant read
  against a clock-defaulted seed fails on a *date*, not a diff. The notice suites use
  `new Date()` + day offsets — when you change the offsets, keep them **relative**, never absolute.
- **Revert-sanity is the only evidence that matters here.** The whole story is one number; a suite
  that does not fail when the number is restored proves nothing (AC10).

### Project structure — files this story touches

Three packages (`@twt/domain`, `@twt/contracts`) and two apps (`apps/api`, `apps/admin`) for code;
`docs/legal/` (gitignored — the decision entry is the durable copy) and
`_bmad-output/planning-artifacts/` + `_bmad-output/implementation-artifacts/` for registers. ⛔ No new
module, no new file in `packages/domain/src/pool/` unless AC3 builds a bound — and then it is a
predicate **inside** `fixed-amount.ts`, next to `meetsNoticeFloor`, not a new module.

### Library / framework notes

Nothing new is added. Node ≥ 22.12, pnpm 10.30.3, Drizzle ORM, Zod + OpenAPI emit, Vitest 2.1.8,
TypeScript ~5.9.2 — all unchanged. ⚠ If the OpenAPI determinism check moves after a comments-only
contracts edit, a Zod `.describe()` was touched, not a comment; review that diff rather than
regenerating past it.

---

## References

- Decision `2026-08-16-123` — `.decision-log.md:37-115` (clauses 6-9 = the ruling; clause 11 = Q5.1
  routed here; clause 12 = Q5.2 discharged by 10.13; clauses 13-14 = what it does **not** close)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-10-13.md` — Q4/Q5, the
  four conflicts C-1…C-4, and *"The ruling as given"*
- `_bmad-output/implementation-artifacts/deferred-work.md:4495-4562` — the four marker entries
- `_bmad-output/implementation-artifacts/10-13-fixed-amount-setter-admin-ui.md` — the immediate
  predecessor; its Boundary table and Review Findings
- `_bmad-output/implementation-artifacts/7-5-…-override.md` — D3 (attestation ≠ vote), D5
  (non-retroactivity), D6 (DB-authoritative floor); `:229`'s false logging claim
- `docs/legal/trust-deed.md:7` (DRAFT), `:147` (Cl. 10(b)), `:237` (Cl. 20(a)), `:241` (Cl. 20(c)),
  `:273` (Cl. 22(b)), `:275` (Cl. 22(c))
- `docs/legal/niyamavali.md:101-104` / `.hi.md:99-102` (§4.2); `:337-343` (Part 11 — amendment)
- `docs/legal/terms-and-conditions.md:49` / `.hi.md:52` (§4.2)
- `prd.md:463-471` (FR-15), `:847-849` (FR-55) · `architecture.md:73-74`, `:1324`
- `ux-design-specification.md:987-993` (UX-DR25 transition pattern)
- `epics.md:56`, `:109`, `:404`, `:614`, `:2766-2985` (Epic 7), `:3805-3860` (Story 10.13)

---

## Open questions for BigDev (raised at authoring; none blocks Task 1)

1. **Should the emergency path get a MAXIMUM forward reach too?** Q1 asks only about backdating. An
   emergency `effective_from` a year *ahead* is equally unbounded and is indistinguishable from a
   standard change that skipped the notice floor. Not raised as a sixth question — say if you want it
   folded into Q1.
2. **Does the 60-day notice change the member-notification cadence?** 7.5's D4 left the dispatch a
   console seam and 10.13 dispositioned FR-55's announcement half to Story 10.5. A 60-day window
   makes *when* members are told materially more important. No owner today.
3. **`prd.md:463`'s heading is FR-15's NAME** — *"Fixed-amount per pool over 12+ month periods"*. AC6
   edits it. Confirm that renaming an FR heading is acceptable in this project, or the PRD keeps a
   title that contradicts its own body.
   ⭐ **CONFIRMED by BigDev during code review, 2026-08-16 (Story 7.11 review D2):** renaming the FR
   heading is acceptable — a PRD heading that contradicts its own body is worse than a heading edit.
   Recorded here so the rename made in this diff is not a silent default
   ([[feedback_record_unattested_no_backfill]]).

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`), 2026-08-16.

### Debug Log References

Verification sweep run against `main` @ `d6de145` (`git fetch origin`; `main == origin/main`) before a
single line of the note was written. No code was run; no test suite, gate or build was invoked.

### Completion Notes List

**⏸ HALTED AT TASK 1 BY DESIGN — this is the story's own stop, not an incomplete session.**
Task 1 carries `⏸ STOP AFTER THIS TASK UNTIL RULED`, and AC1 states `⛔ Q1, Q2, Q3 and Q6 are
BLOCKING — no implementation commit lands before they are ruled`. Tasks 2–8 are therefore **not
started**, and nothing in `packages/`, `apps/`, `docs/legal/`, the PRD, `architecture.md`, `epics.md` or
`deferred-work.md` has been touched.

**What landed (Task 1, subtasks 1–4):**
- Branch `governance/7-11-fixed-amount-notice-period-and-fixed-period-reconciliation` cut off
  `d6de145`, verified `== origin/main`.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-7-11.md` authored —
  **six questions** (Q1/Q2/Q3/Q6 ⛔ BLOCKING, each with a stated non-answer consequence), **nine
  findings**, a *"What non-answer would mean"* table, a *"What this note does NOT ask"* section, and a
  completable **Ruling template**.
- Committed under a `governance(7.11):` prefix, **before** any implementation commit
  ([[feedback_governance_commits_precede_implementation]]).

**Subtask 5 (the `.decision-log.md` entry) is deliberately NOT done** — it records a ruling that does
not exist yet. Writing it now would fabricate ratification.

**Citations re-read from SOURCE, not carried from this story file.** ~40 live checks across
`.decision-log.md`, `sprint-status.yaml`, all four `docs/legal/` files in both locales, the PRD,
`architecture.md`, `epics.md`, `deferred-work.md`, `ux-design-specification.md`, the clause seed, two
migrations and 15 code/test files. **F-1 … F-7 all confirmed as written.** Corrections and additions:

| # | Found | Disposition |
|---|---|---|
| 1 | `prd.md` is at `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`, not `planning-artifacts/prd.md` | Path corrected; all four cited **line numbers exact** |
| 2 | `epics.md` is at `_bmad-output/planning-artifacts/`, not `implementation-artifacts/` | Path corrected; all twelve cited line numbers exact |
| 3 | ⭐ **The PRD carries the claim in NINE places; AC6 names FOUR.** `:67`, `:144` (**the glossary definition**), `:442`, `:1321`, `:1372` (**the SM-C4 counter-metric**) are live and unnamed by the ruling **or** the story | New finding **F-8**. AC6 is extended at implementation time — reconciling a named register more completely is *applying* the ruling, not extending it |
| 4 | ⭐ **`epics.md:3526` is a LIVE Epic-10 narrative line** (*"set the fixed-amount with 12-month notice"*), not a historical AC body; `:2897` **is** historical and its *substance* survives the ruling while its *number* does not | New finding **F-9**, with the live/historical split stated per line |
| 5 | ⛔ **`epics.md` uses "12 months" for an unrelated rule** — the FR-6/FR-96 **rejoin lock**, 11 lines | Recorded in F-9 as an explicit non-target. A blind `12 month` replace would rewrite the withdrawal lock |
| 6 | `deferred-work.md:4505-4524` cites the emergency comment at `fixed-amount.ts:351`; it is live at **`:380`** | Recorded in Q1 as a citation-drift note for whoever closes that marker |
| 7 | The staged-transition surface is `apps/mobile/components/active-contribution/ActiveContributionCard.tsx:211-222` and is **conditional on `upcomingAmountChange`**, not "always-on" | Corrected in F-4 |
| 8 | `.decision-log.md` shows 124 numbered headings over **123 distinct numbers** — the `+1` is the legitimate suffix `2026-06-01-012-amend-1` (`:6330`), **not** a duplicate; no gaps in `001…123` | Reconciled and recorded in the note header. Next entry = **`2026-08-16-124`** |

**⚠ A live finding that changes AC10's revert-sanity work.** All four `meetsNoticeFloor` unit cases are
written against `FIXED_AMOUNT_NOTICE_DAYS` (`fixed-amount.test.ts:93-111`), and both integration cases
use **10 days** (rejected) and **400 days** (accepted). Every one of those passes at **60 and at 365**.
⇒ Today's suites are **floor-agnostic**, and the AC10 revert-sanity would produce **no red**. The
inverted case AC10 demands must be **written**, not merely run — e.g. an accepted case ~90 days out,
which passes at 60 and fails at 365. Recorded now so Task 8 does not discover it as a "passing" revert.

**As of the Task 1 halt, nothing was attested by a test run.** Correct at that point — no code had
changed ([[feedback_record_unattested_no_backfill]]).

---

### Implementation half — Tasks 2–8, after the ruling

**⛔ THE NUMBER IS 90, NOT 60.** Q6 ruled option (d), which **supersedes clause 6** of Decision
`2026-08-16-123` — recorded in terms in `2026-08-16-124` clause 1, with clause 6 ⛔ never edited.
Because AC2/AC6/AC7/AC10 were authored to say *"the ruled notice period"* rather than a hardcoded 60,
the ruling landed without rewriting a single AC.

**⚠ THE ONE THING THAT DID NOT GO AS WRITTEN — and it needed a second ruling.** Clause 6's bound
(*"not earlier than the current open head's `effective_from`"*) has **two readings**, and implementing
the literal one turned Story 7.5's live-DB test `(g)` **red**. A scheduled future standard change **is**
the open head while the prior row is still in force ⇒ binding there would make the emergency path
**unavailable whenever a planned change pends**, gutting the mechanism clause 8 preserves and refusing
exactly the write `closeOpenHead`'s `max(...)` clamp was hardened for. ⛔ **Put back to the Panel rather
than resolved by the implementer** — choosing between two readings of ratified words is not a
developer's call. Ruled: bind to the amount **IN FORCE at DB `now()`**. Recorded **append-only** as
Decision `2026-08-16-125` (the `2026-08-16-122` precedent); ⛔ `2026-08-16-124` is not edited. The
distinction is pinned by a unit case that goes red if a later reader re-binds to the open head.

**⭐ AC10's revert-sanity was RUN, both ways, and it has real teeth.** Observed counts:

| `FIXED_AMOUNT_NOTICE_DAYS` | Unit (`fixed-amount.test.ts`) | Domain live-DB | API live-DB |
|---|---|---|---|
| **90** (ruled) | **29 passed** | **18 passed** | **14 passed** |
| **365** (superseded) | ⛔ **2 failed**, 27 passed | ⛔ **1 failed**, 17 passed | ⛔ **1 failed**, 13 passed |
| **60** (superseded clause 6) | ⛔ **1 failed**, 28 passed | — | — |

⚠ **Story 7.11 review P6 — the unit "2 failed" is not two independent proofs.** Of the two unit
failures at 365, ONE (`pins the RULED floor at 90 days`, a direct `expect(FIXED_AMOUNT_NOTICE_DAYS)
.toBe(90)`) is a mechanical value pin: it trivially fails under ANY reversion regardless of whether
`meetsNoticeFloor` is correctly WIRED to the constant, so it doesn't independently confirm the
boundary logic — it only confirms the constant itself didn't get reverted. The genuinely behavioral
proof is the OTHER failure (`accepts 120 days out`), which actually exercises `meetsNoticeFloor` and
would catch a wiring regression the value pin alone could not. Both are legitimate tests to keep — the
value pin is cheap insurance against exactly this kind of accidental revert — but the count "2 failed"
should not be read as "two behavioral confirmations": it is one behavioral confirmation plus one
constant guard.

⚠ **This required WRITING the distinguishing cases, not merely running the suites.** As flagged at the
Task 1 halt, every pre-existing case was floor-agnostic — the unit cases are written against the
constant, and the integration cases used 10 days (rejected at any floor) and 400 days (accepted at
any floor). The accepted cases were **inverted to 120 days**, which passes at 90 and **fails at 365**,
plus an explicit value pin. ⛔ A suite that passes at both numbers proves nothing about the change.

**Registers reconciled — nine, not the four the ruling named.** *(Story 7.11 review P4 — reconciling
the count against the earlier "seven" used in the story body/AC1/Q6/Dev Notes: "seven" counted only
the registers that CARRY the twelve-month **claim** and get edited to match the ruled number — the
four ruling-named plus T&C, `epics.md`, and `ux-design-specification.md`. "Nine" is the broader count
of ALL documentation surfaces this story's AC1–AC9 touch, adding two that do NOT carry the claim
themselves: Deed Cl. 10(b), touched only to RECORD it as already-consistent-and-unamended, and
`deferred-work.md`, touched only to close tracking markers, not to state a notice period. Both counts
are internally correct for what they're counting; they were never reconciled against each other in the
same document, which this note now does.)* Code (17 files), Niyamavali §4.2 **and**
member-facing T&C §4.2 **both locales** (verified **character-for-character against the durable copy**
in `2026-08-16-124`, since `docs/legal/` is gitignored), Deed Cl. 10(b) **left unamended by ruling**,
**nine** PRD lines (the four named + the five of clause 10, including the **glossary** and the **SM-C4
counter-metric**), `architecture.md` ×2 (the threat row **shortened, not removed**), `epics.md` (4 live
edits + 4 appended dated notes + the missing `### Story 7.11:` entry + the count at **both** `:614` and
`:5200`), `deferred-work.md` (4 markers + 1 new entry), and `ux-design-specification.md` — the
**seventh** claim-carrying register, named in no ruling.

**⛔ A SECOND OWNERSHIP TRAP CAUGHT, THIS ONE NOT ANTICIPATED BY THE STORY.** AC9 directs the new
UX-DR25 entry to be *"owned by Story **8.2**"*. Verified live: `8-2-active-contribution-card-…` is
**`done`** — and so is **every other story in Epic 8**. A re-trigger of *"Story 8.2 entering
`ready-for-dev`"* **could never fire**: the exact un-owned-decay shape
[[project_r7_fact_producer_unbuilt]] describes, one register further along. ⭐ A successor
`8-15-fixed-amount-transition-staged-card` was **minted `backlog`** so the observation has a live
owner, reusing the SHAPE of Decision `2026-08-16-123` clause 9 (mint a successor rather than leave an
observation un-owned). *(Story 7.11 review P5: clause 9's actual precedent was a Panel-ratified
directive — invoking it as "precedent" for THIS mint overstated what's happening here, since this mint
is explicitly not that. Corrected to "reusing the shape of," not "following the precedent of.")*
⚠ **Recorded as an un-ratified author mint, not a Panel act** — BigDev may rename, fold or decline it.

**Marker closures, each in its own vocabulary** ([[feedback_closure_language_precision]]) — ⛔ never
*"addressed"*: duration marker **"Closed by [edit]"** *and stating duration is deliberately NOT
enforced*; backdating marker **"Closed by [edit]"** (a bound was built); submitter-distinctness
**"raised and left, a SECOND time"**, still open, `[Author-committed]`, with the record saying it has
now been carried twice; `assertPanelAuthorized` ⛔ **untouched** (this story adds no fourth call site).

**Gates and suites — as observed.** `pnpm typecheck` 20/20 ✓ · lint ✓ (`@twt/domain`, `@twt/api`,
`@twt/contracts`, `admin`) · `@twt/domain` 1808 ✓ · `@twt/contracts` 921 ✓ · `admin` 321 ✓ · `@twt/api`
331 ✓ · live-DB fixed-amount specs 18 ✓ / 14 ✓ · `pool-support-category:check` ✓ ·
`domain-invariants:check` ✓ (493 files, every dynamic `.limit()` clamped) · `microcopy:check` ✓ ·
`schema:check` ✓ **no delta, exactly as F-7 predicted** · `i18n:check` ✓ · `friction:check` ✓ (AC-4
**dormant — no member-facing surface touched**; ⚠ it diffs COMMITTED history, so it re-evaluates after
commit) · `contracts:check-openapi-determinism` ✓ with `openapi/v1.yaml` **byte-identical**, confirming
the contracts edits touched only comments and no Zod `.describe()`.

**⚠ `pnpm ci:local` — RECORDED AS OBSERVED, NOT AS GREEN.** One run: **29 of 30 jobs ✓**, with
**`test (unit)` ✗**. ⛔ **The failing spec cannot be named: the captured log was TRUNCATED to its tail**
(48 lines retained), so the per-job output and its failure banner are gone. ⛔ **Not reconstructed**
([[feedback_record_unattested_no_backfill]]). What *was* established, by re-running the identical
command standalone: `pnpm turbo run test --concurrency=4` passed **37/37 twice**, the second time with
`--force` to bypass the turbo cache entirely (so it is a real run, not a cached echo). Every suite this
story touches was additionally proven green in isolation. This matches the known class —
[[project_ci_local_concurrency_oversubscription]] and [[project_known_livedb_test_failures]] #14, where
the unit job starves a *different* package per run. ⚠ **It is recorded as an unexplained single red,
not as a proven flake**: the evidence rules out a defect in this story's own suites, and does not
identify what went red.

### File List

- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-7-11.md` — **new**
- `_bmad-output/implementation-artifacts/7-11-fixed-amount-notice-period-and-fixed-period-reconciliation.md` — modified (Task 1 subtasks 1–4, Dev Agent Record, File List, Change Log)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (`development_status[7-11-…]` → `in-progress`; ⭐ `8-15-fixed-amount-transition-staged-card` **minted** `backlog`)
- `.decision-log.md` — modified (Decisions `2026-08-16-124` and `2026-08-16-125` appended; ⛔ no prior entry edited)

**Code — the number and its prose (Task 2), the bound (Task 3):**
- `packages/domain/src/pool/fixed-amount.ts` — the constant → **90**; `meetsEmergencyBackdatingFloor` (new pure predicate); the bound enforced in `applyEmergencyOverride`; comments
- `packages/domain/src/pool/errors.ts` — `PoolFixedAmountEmergencyBackdatedBeforeHeadError` + `pool.fixed_amount_emergency_backdated_before_head` (new); the notice message. ⛔ `pool.fixed_amount_notice_too_short` **not renamed**
- `packages/domain/src/pool/index.ts`, `packages/domain/src/schema/pool_fixed_amount_schedule.ts`, `packages/domain/src/schema/pool_fixed_amount_emergency_attestations.ts`
- `packages/domain/src/rbac/permissions.ts`, `packages/domain/src/rbac/roles.ts` — key descriptions only. ⛔ **no catalog version bump**
- `packages/contracts/src/pools/fixed-amount.ts`, `packages/contracts/src/pools/index.ts`
- `apps/api/src/modules/pool-fixed-amount/handlers.ts` (+ the new 400 translation), `.../index.ts`, `apps/api/src/server.ts`, `apps/api/src/audit/audit-sink.ts`, `apps/api/src/modules/pariwar-provisioning/index.ts`
- `apps/admin/src/api/client.ts`, `apps/admin/src/api/hooks.ts`, `apps/admin/src/modules/pool-fixed-amount/FixedAmountPage.tsx` (`365`/`366` → `90`/`91`), `.../i18n-en.ts`

**Tests (Task 8):**
- `packages/domain/tests/pool/fixed-amount.test.ts` — the floor block + the new `meetsEmergencyBackdatingFloor` block + the AC10 value pin
- `packages/domain/tests/integration/pool/pool-fixed-amount.spec.ts` — `(d)` inverted to 120 days; **new `(h)`** live-DB backdating case
- `apps/api/tests/integration/pool-fixed-amount/fixed-amount.spec.ts` — the accepted case inverted to +120d

**Instruments (Task 4) — gitignored; the decision entry is the durable copy:**
- `docs/legal/niyamavali.md`, `docs/legal/niyamavali.hi.md`, `docs/legal/terms-and-conditions.md`, `docs/legal/terms-and-conditions.hi.md`
- ⛔ `docs/legal/trust-deed.md` — **deliberately NOT modified** (Q3(a))

**Registers (Tasks 5–7):**
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — 9 lines
- `_bmad-output/planning-artifacts/architecture.md` — 2 sites
- `_bmad-output/planning-artifacts/epics.md` — live edits, appended notes, the new Story 7.11 entry, both counts
- `_bmad-output/planning-artifacts/ux-design-specification.md` — the seventh register, annotated
- `_bmad-output/implementation-artifacts/deferred-work.md` — 4 markers closed + 1 new entry
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-7-11.md` — status → `✅ RULED`, ruling appended

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-16 | Story authored via `bmad-create-story` off `main` @ `d6de145`. Sourced from Decision `2026-08-16-123` (no `epics.md` entry exists — AC8 creates one). Status → `ready-for-dev`. |
| 2026-08-16 | **Ruling recorded + implementation half (Tasks 2–8).** Six questions ruled: **Q6 (d) — the floor moves 60 → 90**, ⛔ **superseding clause 6 of Decision `2026-08-16-123`** (recorded in terms; clause 6 never edited); Q1 (b); Q2 ratified with *"about 12 months"* **struck**, so §4.2 drops the period entirely; Q3 (a) — Deed Cl. 10(b) already consistent, unamended; Q4 include; Q5 confirmed. Recorded as **Decision `2026-08-16-124`**. ⚠ **A second ruling was needed mid-implementation:** clause 6's *"current open head"* has two readings, and the literal one turned Story 7.5's live-DB test `(g)` red by making the emergency path unavailable whenever a planned change pends — put back to the Panel and ruled to bind to the amount **IN FORCE**, recorded **append-only** as **Decision `2026-08-16-125`**. Nine registers reconciled (four named by the ruling, five not), instruments amended in both locales and verified character-for-character against the durable copy, four markers closed in their own vocabulary, and ⭐ `8-15-fixed-amount-transition-staged-card` **minted** because AC9's named owner (Story 8.2) is `done` and its re-trigger could never have fired. AC10 revert-sanity **run both ways with observed counts** — 2 unit + 1 domain live-DB + 1 API live-DB go red at 365, and the value pin also catches 60. Status → `review`. |
| 2026-08-16 | **Task 1 (AC1) governance half — routing note authored and committed; story ⏸ HALTED pending the ruling.** Branch `governance/7-11-…` cut off `d6de145` (`== origin/main`). Note carries six questions (Q1/Q2/Q3/Q6 ⛔ BLOCKING) and **nine** findings — F-1…F-7 as specified, plus **F-8** (the PRD holds the claim in nine places, not the four AC6 names — including the glossary at `:144` and the SM-C4 counter-metric at `:1372`) and **F-9** (`epics.md:3526` is a **live** line, not a historical AC body; and the FR-6/FR-96 rejoin lock uses "12 months" for an unrelated rule that must not be swept in). Two register paths corrected (`prd.md`, `epics.md`), one predecessor citation drift recorded (`fixed-amount.ts:351` → `:380`), and the decision-log numbering reconciled (next entry `2026-08-16-124`). ⚠ Recorded for Task 8: today's notice suites pass at **both** 60 and 365, so AC10's revert-sanity red must be **written**, not merely run. No code, no gate, no test run. Status stays `in-progress`. |
| 2026-08-16 | `bmad-create-story validate` pass (fresh context): ~35 live citations re-verified across `.decision-log.md`, `sprint-status.yaml`, all four `docs/legal/` files (both locales), `prd.md`, `architecture.md`, `epics.md` (10 locations), `deferred-work.md`, `ux-design-specification.md`, and 15 code/test files — 33 exact, 2 corrected: `sprint-status.yaml:7178`→`:7268` (preamble citation drift), and AC8/Task 6/Dev Notes extended to cover `epics.md:5200`'s second, previously-uncited "10 stories" occurrence. Status unchanged (`ready-for-dev`). |
