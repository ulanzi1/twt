---
baseline_commit: 2059482b
---

<!--
BASELINE — `2059482b` on `main` (`story(6.19d): code review round 3 … ci:local 34/34 green`), in step with `origin/main` (fetched
2026-10-04). Every code claim below was traced on this SHA on 2026-10-04. ⭐ Two facts are kept apart, as they must be: "the pin is
an ancestor of HEAD" (durable) and "the code claims were re-derived at `2059482b`" (perishable). Before Task 1 run
`git diff --name-only 2059482b..HEAD -- packages apps scripts docs` and re-read anything it lists that this file cites.

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / don't); `⭐` = key
fact or action; `⚠` = hazard. Doubling is volume only. ⭐ Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
⭐ The ONE exception: a `⛔` inside a verbatim quotation from another file (`epics.md` Story 6.20's AC3, quoted in AC0) belongs to the quote.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every
prepend rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code, as of
`2059482b` — function names are the stable handle.
LETTERS: `NW1`…`NW12` are THIS story's author decisions (⏳ PROPOSED — committed by ONE author-commit in Task 0). `Q1`…`Q3` are the three
confirms owed to the Panel's next note (⛔ none blocks the build). Rulings are cited by decision id + item: `-261` D1, `-262` FQ1 / FQ2 /
FQ8 A, `-264` FQ12. Other stories' letters are qualified (`6.20 D6`, `6.21a D7`, `6.19a D14`).
-->

# Story 6.23: The Post-Death and Recent Nominee-Change Warnings, the Correction Label, and One Rule for Approving Over a Warning `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** On the District Admin's console the system now **shows a warning** on any nominee
> version dated **on or after the death** (`-261` D1 B) and on any nominee change made **within 90 days before the claim was filed**,
> whatever the certificate says (`-262` FQ8 A). An approved **correction** is ⛔ never warned — it carries its own plain label,
> *"corrected after the death — approved by [District Admin] and [Pariwar Admin]"* (`-262` FQ1 B). And there is **ONE rule for every
> warning**: the District Admin may still approve the claim while a warning shows, but **only by choosing a reason and writing a note**
> (`-262` FQ2 A, `-264` FQ12). ⭐ **The system still refuses nothing, marks nothing and changes nobody's payment** — the refusal stays
> the District Admin's (`-239`, `-261` D1), and the determination form still pre-selects nothing (6.20 AC4).

> ⚠⚠ **STOP — v1.2 (2026-10-04): THE PANEL RULED Q1–Q3 (`2026-10-04-277`, DR + KB): Q1 A · Q2 C · Q3 B.** Q1 A is what this file
> builds (NW3). ⚠ **Q2 C and Q3 B are ⛔ not yet designed here:** Q2 C — **every approver** (the trustee resolving an escalation, the
> Pariwar Admin's final vote, each R9 vote, 6.19c's Super Admin and "no correction needed" approvals) gives a reason and a note while a
> warning shows; Q3 B — a warning that appears after the District Admin approved makes the final approval **wait** for the District Admin's
> reason and note. ⇒ NW6, NW7, AC3–AC5, AC7 and Tasks 3, 5, 6 below still describe v1.1's *"meanwhile"* A — do ⛔ not build them as
> written. ⭐ The design is re-derived (v2.0) **before** Task 0's author-commit, which is now **`-278`** (`-277` is the Panel's ruling).

> ⭐ **Not in `epics.md`'s story list.** Minted by Trustee rulings `-261` / `-262` (row added 2026-09-28; ⛔ no story file until this one).
> Like 6.20 it needs a `### Story 6.23` section with a `> ⚠ Minted by…` header in `epics.md` (Task 0). `epic-6-retrospective` stays `done`.
> ⭐ **Owner of the ONE approval rule** (`-264` Consequence 2): rows **`6-26`** (FQ8 C — the date and time of death at the inspection) and
> **`6-27`** (FQ8 E, FQ10 — the neighbours) **produce** warnings into it. 6.23 lands first and builds the rule so those rows add a
> warning **kind**, ⛔ never a second rule (NW1).

> ⚠⚠ **FOUR FACTS THIS PASS FOUND THAT THE RULINGS' TEXT DOES ⛔ NOT SAY — read before anything else.**
> 1. ⚠ **What the Panel was told about FQ2 is wrong in part.** The routing note said *"The system already requires a reason in one similar
>    case: approving a claim that carries a concealment flag."* Traced at `2059482b`: the verifier code `concealment_flag_override` is only
>    **permitted** on an approve (`REASON_CODE_OUTCOME_COMPAT`, `claim/verifier-decision.ts:64-72`); ⛔ nothing requires it when a flag is
>    present (`adjudicateClaim` checks only outcome compatibility, `verifier-decision-persist.ts:319-321`). The State Trustee's
>    `concealment_override` is likewise *"merely PERMITTED on an approve"* (`state-trustee-decision.ts:111-116`); the only enforced
>    concealment rule runs the **other** way — a concealment code needs a flagged signal (`resolveConcealmentSnapshot`,
>    `state-trustee-decision-persist.ts:449-474`). ⇒ **6.23 builds the FIRST "a warning present ⇒ a reason required" rule in the stack.**
>    ⭐ The ruling stands — FQ2 A is a requirement in its own right, ⛔ not an extension of a precedent. Recorded in Task 0's author-commit
>    and disclosed in the next Panel note ([[feedback_record_unattested_no_backfill]]; the `-263` correction is the model).
> 2. ⚠ **FQ12 binds "the District Admin" — and two shipped paths approve a claim without one.** A **State Trustee resolving an escalation**
>    approves to `verifier_approved` with ⛔ no reason code required (`resolveEscalation`, `state-trustee-decision-persist.ts:1026-1040`;
>    `trusteeReasonCodeRequiredForOutcome('approved')` is false). An **appeal reversal** goes `reversed → state_trustee_freeze` and on to the
>    Pariwar Admin's final approval with ⛔ no District Admin approval at all (`claim/state.ts:257-259, 363, 385-390`) — and a `-239` refusal,
>    which is the commonest claim to carry a warning, is exactly what gets appealed. (A third path — the **R9 panel** — also bypasses the
>    District Admin, but every vote already requires a written rationale, `packages/contracts/src/claims/r9-voting.ts`; so does every appeal
>    stage, `appeal.ts`. ⇒ the escalation resolution is the ONLY one with ⛔ no written reason at all.) ⇒ 6.23 builds the rule **where it
>    was ruled** (the District Admin's approval) and carries the other approvers as **Q2** (⛔ not blocking).
> 3. ⭐ **The approval rule needs ⛔ no decrypt.** The certificate date is Tier-1 ciphertext. But once `assertClaimApprovable` has passed, the
>    live determination is **current against the accepted certificate** (6.21a D7) and **every one of its marks agrees with the date**
>    (6.20 D6 — the writer refuses any other, `nominee-determination-persist.ts` header). ⇒ at the gate, *"a version dated on or after the
>    death"* is **exactly** *"a member-source version the live determination marks `discarded`"* — the same fact `-239`'s refusal is grounded
>    on (`assertPostDeathRefusalGrounded`, `verifier-decision-persist.ts:124-138`). The timeline, which already decrypts the accepted date on
>    its audited read (`claims.nominee-declaration.handlers.ts:227-238`), shows the warning **by date** — including before any determination.
>    ⚠ The equivalence holds **only after the gate** — the call ORDER is load-bearing (NW2, Trap 2).
> 4. ⚠ **Two shipped tests pin the rule `-261` D1 superseded, and every approve-path fixture is one date away from the 90-day warning.**
>    `apps/admin/tests/nominee-declaration-panel.test.tsx:159-169` asserts the timeline never says *"after death"*;
>    `apps/api/tests/integration/claims/nominee-declaration.spec.ts:328-345` forbids `post_death` in the timeline body. Both are **amended,
>    ⛔ never deleted** (AC9). And the fixture declaration date `SEEDED_NOMINEES_DECLARED_AT = 2026-01-05` is what keeps every seeded claim
>    outside the 90-day window — a fixture dated within 90 days of the **test run** would flip behaviour as the calendar moves (Trap 5).

## Story

As the **District Admin** checking a family's death claim,
I want **the system to warn me when the member's nominee was changed on or after the date of death, or named or changed in the 90 days
before the claim was filed — and to label a genuine correction plainly instead of warning on it**,
so that **I can never approve such a claim without first saying, in a reason and a note, why I am approving it** — while the refusal,
and every mark on the declaration, stays my own judgement.

## The rulings this story builds — verbatim keys, and what is still OUR reading

⚠ Verbatim text lives in `.decision-log.md`; the reading column is ours and is ⛔ **not ratified** — each reading this story BUILDS on is
committed by Task 0's author-commit, and the three that change what staff see or must do are put to the Panel as Q1–Q3.

| Decision | The Panel said (verbatim, as relayed) | Our reading (⛔ not ratified) |
|---|---|---|
| `-261` D1 | *"D1 - B"* — *"THE SYSTEM SHOWS A WARNING ON ANY NOMINEE VERSION DATED ON OR AFTER THE DEATH. The system **still refuses nothing** — the refusal stays the District Admin's."* | *"Dated"* = the version's `effective_at` against the claim's **current, accepted** certificate date — the comparison the marking already makes (6.20 D6). ⇒ ⛔ no accepted certificate, ⛔ no warning; the console says the date is not yet known. (`-261`'s own reading.) |
| `-262` FQ1 | *"FQ1-D1 - B"* — *"AN APPROVED CORRECTION IS ⛔ NOT WARNED; IT CARRIES ITS OWN PLAIN LABEL — 'corrected after the death — approved by [District Admin] and [Pariwar Admin]'."* | A `source = 'correction'` version is ⛔ never warned (its target is, if dated so). The names are the correction row's snapshotted `da_display` / `pa_display` (NW4). |
| `-262` FQ2 | *"FQ2-D1 - A"* — *"A CLAIM MAY BE APPROVED WHILE THE WARNING SHOWS, BUT THE DISTRICT ADMIN MUST CHOOSE A REASON AND WRITE A NOTE."* | *"A reason"* = a new approve-only reason code; *"a note"* = the existing rationale, made required (`-262`'s reading). |
| `-262` FQ8 A | *"FQ8 A (within 90 days)"* — *"any nominee change made **within 90 days before the claim was filed** gets a warning, **whatever the certificate says**."* (⚠ the Panel **amended** our 30 to 90.) | IST calendar days between a version's `effective_at` and the **first** claim's filing for that death; **every** version, before or after the death; a correction is labelled, ⛔ not warned twice (`-262`'s reading). ⚠ Whether a member's **first** naming of a nominee is a "change" — **Q1**. |
| `-264` FQ12 | *"1 - yes"* — *"A claim may be approved while **any** warning shows … **only if the District Admin chooses a reason and writes a note**."* | ONE reason-and-note per approval, ⛔ not one per warning; the reason names that warnings were present; a correction's label is ⛔ not a warning; a **refusal** is ⛔ never gated (`-264`'s reading). ⚠ Approvals made by **someone other than** the District Admin — **Q2**; a warning that appears **after** the District Admin approved — **Q3**. |
| `-264` not-cover | *"The wording of the reasons (the reason codes are 6.20's family — an author-commit at the row's Task 0)."* | ⭐ The Panel **delegated** the reason code and its words to this story's Task 0 (NW5) — which satisfies UX-DR43's *"categories agreed upfront by Trustee Panel"*. |

## ⭐ THE INVARIANTS — every AC below serves one of them

1. **The system refuses nothing, marks nothing and pays no one differently.** A warning is information on the District Admin's console and a
   condition on the **form** of their approval — ⛔ never a refusal, ⛔ never a wait, ⛔ never a determination mark, ⛔ never a change to
   the effective declaration, the name check or the split (`-261` D1; 6.20 invariant 1 **as narrowed by D1**).
2. **One rule, every warning, one place.** The rule is ONE assertion at the District Admin's approval (`adjudicateClaim`, approve) over ONE
   set of warning kinds; 6-26 and 6-27 add **kinds**, ⛔ never a second rule (`-264` Consequence 2; NW1).
3. **A correction is ⛔ never a warning.** It carries the FQ1 label and ⛔ never triggers the rule (`-262` FQ1, `-264`'s reading).
4. **A refusal is ⛔ never gated** — nor an escalation. The rule binds an approval only (`-264`'s reading; the 6.18 asymmetry, `-226` cl.6-7).
5. **The determination form still pre-selects nothing.** `-261` D1 superseded *"highlights nothing / labels nothing"* — ⛔ not *"pre-selects
   nothing"* or *"decides nothing"* (6.20 AC4). ⛔ No version is pre-marked, sorted or filtered by its warning.
6. **⛔ No name is compared** — the warnings read ranks, version ids, instants and marks only (6.18 Trap 1 / Trap 4; the no-comparison fence).
7. **⛔ No new decrypt on the console or at the gate** (fact 3). The only date-decrypt stays where it already is: the audited timeline read.

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS A CONJUNCT to a predicate that gates a member's death benefit:** the District Admin's approval of a claim now requires,
whenever a warning shows, the reason *"warnings reviewed — approved despite them"* and a written note. It adds ⛔ no ground to refuse, ⛔ no
wait and ⛔ no change to who is paid.

**The sentence, in the member's terms (ours, for the Panel to correct):** *"If your nominee is changed on or after the day you die, or
named or changed in the 90 days before your family's claim is filed, your family's claim can still be approved — but only after the
District Admin has written down why they are approving it."*

**Checked against the Niyamavali? ⭐ Yes — and it is silent.** `docs/legal/niyamavali.md` (present locally; an agent-drafted, **unratified**
design reference that binds nothing — [[feedback_niyamavali_rulebook_not_spec]]) says only that *"the Trust verifies the qualifying event,
the claimant's entitlement, and document authenticity"* (§6.2) and that disbursement follows the declared nominees and the 75/25 split
(§2.4, §6.4). It says ⛔ nothing on nominee-change warnings, approval reasons or notes. The sentence is **consistent with §6.2** (a recorded
reason is part of verifying entitlement). ⭐ **Checked against `-261` D1, `-262` FQ1 / FQ2 / FQ8 A and `-264` FQ12: it matches them as
ruled.** ⚠ Three places it could be read more widely are **Q1–Q3** — the sentence above holds under the built default of each.

## ⚖️ The Panel's questions — three confirms owed to the next note (⛔ none blocks the build)

⭐ The §0 gate (`trustee-panel-routing-note-TEMPLATE.md`) was applied to every open point. Everything that is *"which code is correct"* is
an author decision (NW1–NW12). Three points survive the gate because each would **extend or narrow a ratified clause** (§0: *"a ratified
clause that must be SUPERSEDED, narrowed or extended"*) or decide **what staff are warned of** — the very category the Panel ruled in FQ8.
Each is built at the default below; a ruling the other way is an **additive** follow-up. ⭐ Write them into ONE note from the template
(plain-English question first, the one deciding fact, options with an honest cost on each, evidence last), together with fact 1's
correction in its *"How much to trust this note"* section — Task 0.4.

| | Plain-English question | Built default | Why it is the Panel's |
|---|---|---|---|
| **Q1** | When a member names their **first** nominee within 90 days before the claim (a member who joined recently), is that a "change" that gets the 90-day warning? | **Yes — warned** (`-262`'s own reading: *"it applies to **every** version"*); the words say *"named or changed"* | What staff are warned of (FQ8's category). ⚠ Cost of yes: every claim for a recently joined member needs a reason + note. Cost of no: a nominee named for the first time days before a death is ⛔ never flagged. |
| **Q2** | When someone **other than the District Admin** approves while a warning shows — a State Trustee approving an escalated claim, the R9 panel, or the Pariwar Admin's final approval after an appeal **reversed** a refusal — must they also give a reason and a note? | **No — not built.** FQ12 as worded binds the District Admin's approval; the R9 votes and the appeal stages already carry **required** written rationales (`r9-voting.ts`; `appeal.ts:90-97, 225-231`). ⭐ The note suggests **B**: only the escalation approval — the one path with ⛔ no written reason — gains a reason + note | Extending a ratified obligation to other actors (§0). ⚠ Cost of no: an escalated claim can be approved over a warning with ⛔ no recorded reason. Cost of B: one required reason + note on the escalation decision. |
| **Q3** | A warning that **first appears after the District Admin approved** — a replaced certificate moves the date of death earlier — must anyone record a reason before the claim goes on? | **No — not built.** The re-review stales the determination; the District Admin must redetermine and the name check must pass again before the Pariwar Admin's approval (6.21a D7) — but ⛔ no reason is asked. ⭐ The note suggests **B**: the final approval waits until the District Admin (already redetermining) records a reason + note | The same extension, in time rather than actor. ⚠ Cost of no: the redetermined claim proceeds with ⛔ no recorded reason for the new warning. Cost of B: a short wait at final approval, and NW7's *"⛔ never revise INTO `warning_override`"* would need a grounded exception. |

⭐ **✅ RULED 2026-10-04 — `2026-10-04-277` (DR + KB): Q1 A (our reading, as built) · Q2 C (our reading B ⛔ NOT taken — every approver)
· Q3 B (our reading).** The table above is kept as the questions were put; ⛔ no confirm is still owed. Q2 C / Q3 B: see the v1.2 STOP.

⭐ **The correction (fact 1) is ⛔ not a question** — the answer to FQ2 is unchanged by it. It is recorded, and disclosed, so the Panel
can weigh the evidence over our earlier words (the `-263` precedent).

## ⚠ THE TRAPS

**Trap 1 — there are TWO derivations of "dated on or after the death", and ONE definition.** The definition is `-261`'s reading: a
`source = 'member'` version (declared **or** vacated) whose `effective_at` is ≥ the IST start of the claim's current accepted certificate
date — i.e. `!versionStandsAt(effectiveAt, acceptedDate)` (`nominee-effective.ts:112-114`). The **timeline** evaluates it by date (it holds
the decrypted date). The **gate and the console** evaluate it from the live determination's `discarded` member-source items (⛔ no decrypt).
⭐ Both derivations live in ONE module, the equivalence is stated in its doc-block, and a test proves they agree on a seeded post-death
claim (AC10). ⛔ Never add a third derivation; ⛔ never decrypt the date on the console packet (6.21a T10: *"the accepted DATE stays on the
audited history read"*).

**Trap 2 — the gate's derivation is exact ONLY after `assertClaimApprovable`.** Before it, the determination may be absent, stale (a
re-reviewed certificate — 6.21a D7's `determination_stale`) or superseded by a correction (6.20 D7). ⇒ in `adjudicateClaim` the warnings
are read **after** `assertClaimApprovable` and `assertClaimContactRecorded` (`verifier-decision-persist.ts:374-386`), so every existing
refusal keeps its code and order (the 6.19a D14 precedent). ⚠ The console has no such guarantee: it reports `post_death_version` only
when a live determination exists, and says *"awaiting the determination"* otherwise (NW8) — approval is blocked in that state anyway.

**Trap 3 — the anchor of the 90 days is the FIRST claim for the death, and a stray claim is ⛔ not one.** `-262`'s reading anchors on
*"the **first** claim's filing for that death"* — so the true nominee's refile (row 6-24) does ⛔ not move the window. But a claim filed
against a **living** member that an innocence finding released (6.20 AC2, `claim_nominee_findings.kind = 'member_found_innocent'`) was ⛔
not for a death. ⇒ the anchor is the earliest `claims.created_at` among the deceased's claims in this Pariwar **that no innocence finding
released** — the SAME predicate `isNomineeDeclarationLocked` uses (`claim/nominee-lock.ts`) — falling back to this claim's own
`created_at` when every claim is released. ⚠ The release has ⛔ no production caller until row `6-22`; the arm is test-seeded.
⚠ Raw SQL with explicit aliases — ⛔ never a Drizzle correlated subquery ([[project_epic6_drizzle_correlated_subquery_bug]]).

**Trap 4 — ⛔ no upper bound on the 90-day window.** A version can be recorded a few milliseconds **after** `claims.created_at`: intake
mints the claim with `now()` (transaction START, `schema/claims.ts:152-154`), while a nominee edit that held the intake advisory lock first
stamps `clock_timestamp()` (6.20 D2). ⇒ the predicate is `istDateOf(effectiveAt) >= addCalendarDays(istDateOf(anchor), -90)` — **one-sided**.
⛔ Never add `effectiveAt <= anchor`. (Calendar strings compare lexicographically: `CalendarDateString` is `YYYY-MM-DD`.)

**Trap 5 — the 90-day window is measured against the REAL clock, so fixture dates are a date-bomb class.** `claims.created_at` is the DB
`now()` of the test run. Every shipped fixture declaration is dated ≤ `2026-06-10` (`SEEDED_NOMINEES_DECLARED_AT = 2026-01-05`,
`_helpers.ts:761`; the API twin's literal `2026-01-05`, `_nominee-name-check-fixture.ts:407`) — already > 90 days old at `2026-10-04` and
only getting older ⇒ ⛔ no default fixture is warned. ⚠ A NEW spec that needs a recent change must date it **relative to now**
(`new Date(Date.now() - 30 * DAY)`) and one that needs an old change **≥ 200 days** back; the **exact** 90 / 91-day IST boundary is tested
in the PURE unit test with an injected anchor, ⛔ never live. ⛔ Never move `SEEDED_NOMINEES_DECLARED_AT` forward.

**Trap 6 — the expected red set after the rule lands is EMPTY — so a red approve-path spec is a FINDING, ⛔ not a fixture to patch.**
Traced at `2059482b`: the only specs that both seed a `discarded` version and call an approve are
`apps/api/tests/integration/claims/nominee-declaration.spec.ts:618` (an UNDETERMINED claim — it 409s at the determination gate, before
the warnings are read) and `packages/domain/tests/integration/claim/nominee-refusal-inheritance.spec.ts` (it **denies** with `-239`'s
code — ⛔ never gated). ⛔ No spec that declares through the **real** route also approves (`claim-contact`, `nominee-bank`, `claims-intake`,
`dpdpa-consent`), and every fixed fixture date is > 90 days before any run from 2026-09-08 on (Trap 5). ⇒ if an existing approve-path spec
turns red, **read why**: either it genuinely approves over a warning (then approve with `warning_override` + a rationale — that IS the
rule) or the reader is wrong. ⛔ Never by bypassing the reader, ⛔ never by an opt-out flag on the rule, ⛔ never by moving a fixture date
into the window.

**Trap 7 — the four enum edits, and the two exact lists.** A new `verifier_reason_code` value is: the migration (`ALTER TYPE … ADD VALUE`
in its OWN file — a new value cannot be used in the transaction that added it, the 0120 header), the domain tuple +
`REASON_CODE_OUTCOME_COMPAT` (`claim/verifier-decision.ts:38-72`), the contracts mirror + its compat map (`verification-decision.ts:35-65`),
and the lockstep tests — ⚠ which pin **exact** lists: `packages/contracts/tests/claims-verifier-decision.test.ts:44-67` (per-outcome
sorted lists + the key list) and `packages/domain/tests/claim/verifier-decision.test.ts:26-44` (*"the matrix is exact"*)
([[feedback_story_validate_footguns]] #29(b)). ⚠ `t.reasonCodes` (`i18n-en.ts:502-511`) is indexed by `VerifierReasonCode` in
`ReasonCodeDropdown.tsx` and `AuditTrailEntry.tsx` — a missing label is a **typecheck** error, which is the point.

**Trap 8 — revise can silently undo the rule.** `reviseDecision` (`verifier-decision-persist.ts:497`) re-records an approved decision's
reason and rationale in the post-verdict window, and **carries the old rationale forward when none is sent**. Left alone, a District
Admin could approve with `warning_override` and then revise to `r8_90pct_met`, erasing the record that the approval was made over a
warning. ⇒ NW7 fixes the `warning_override`-ness of an approval at the moment it is made.

**Trap 9 — the console packet is PARSED and STRICT, and four test files build it by hand.** `VerifierConsolePacket` is `.strict()`
(`packages/contracts/src/claims/verifier-console.ts:340-361`) and response schemas are parsed (`serializerCompiler`). A new section must
be added to the contract AND to every hand-built packet fixture — `apps/admin/tests/{verifier-console,death-certificate-review,
nominee-declaration-route}.test.tsx`, `packages/contracts/tests/claims-verifier-console.test.ts` — and the API shape spec
`apps/api/tests/integration/claims/verifier-console-shape.spec.ts` — or they fail; ⚠ contracts tests sit
outside `tsc`, so **run vitest**, ⛔ never trust typecheck alone ([[project_contracts_tests_outside_tsc]]).

**Trap 10 — the read ceiling.** `VERIFIER_CONSOLE_MAX_READS` is **18** (`claims.verifier-console.handlers.ts:150`), ⛔ not the 14 6.20's
story carried. The new section is ONE counted read (18 → 19) with a written explanation in the ledger form above the constant — the
doc-block says *"Any FURTHER increase requires an explanation at review, not a casual bump"*, and `verifier-console.spec.ts` measures real
statements so an uncounted read is caught.

**Trap 11 — admin copy is scanned.** `microcopy.yaml` scans `apps/admin/src/**/*.{ts,tsx}` (`code_globs`) for the active vocabulary
terms — `report`, `receipt`, `invoice`, `passbook` must ⛔ not appear in any new string. ⛔ No string says a version *"is suspicious"*
or *"should be discarded"* (the warning informs; the District Admin judges).

**Trap 12 — the FQ1 label's words are ratified copy.** Render them **verbatim**: `corrected after the death — approved by {districtAdmin}
and {pariwarAdmin}` (lower-case first word as ruled; an em dash). ⛔ Never paraphrase, ⛔ never re-case. The names are the correction
row's `da_display` / `pa_display` (`schema/nominee_corrections.ts`), ⛔ never re-resolved.

## ⚖️ Decisions — the AUTHOR's (⏳ PROPOSED; committed by ONE author-commit in Task 0, before any code)

⛔ None is the Panel's — each is *"the code should do X"* (the §0 gate) — except where marked Q1–Q3, which are built at their default.

- **NW1 — ONE module, ONE rule, a list of KINDS.** NEW `packages/domain/src/claim/approval-warnings.ts`:
  `APPROVAL_WARNING_KINDS = ['post_death_version', 'recent_nominee_change'] as const` and its type; the pure per-version classifier (NW2–NW4);
  the claim-level read `readClaimApprovalWarnings(db, pariwarId, claimCaseId)` → `{ kinds, postDeath, anchorFiledAt }` (ONE statement); and the assertion
  `assertApprovalReasonCoversWarnings(claimCaseId, kinds, reasonCode, rationaleCiphertext)` (NW6). ⭐ Rows `6-26` / `6-27` add a kind to the
  tuple and a producer to the read — the assertion is ⛔ never edited. ⛔ No future kind is pre-minted (an inert kind is a second source —
  [[feedback_no_premature_package]]). It must ⛔ never import `claim/events.ts` (6.20 T5(b): the TDZ cycle typecheck cannot see).
- **NW2 — `post_death_version` (`-261` D1).** Per version: `source = 'member'` (kind `declared` **or** `vacated` — removing a nominee is a
  change) and `!versionStandsAt(effectiveAt, acceptedDate)` when the accepted date is **known**; unknown ⇒ ⛔ no flag and the timeline
  says the date is not known (no accepted certificate, or its date `unreadable` / `anonymized`). Claim-level, at the gate and on the
  console: present ⇔ the **live** determination has a `discarded` item whose version is `source = 'member'`; ⛔ no live determination ⇒
  `awaiting_determination` (console) — the gate never sees that state (Trap 2). ⭐ Doc-block the equivalence (Trap 1) and that it is the
  same ground `-239`'s refusal stands on.
- **NW3 — `recent_nominee_change` (`-262` FQ8 A).** Per version: `source = 'member'` and
  `istDateOf(effectiveAt) >= addCalendarDays(istDateOf(anchor), -RECENT_NOMINEE_CHANGE_WINDOW_DAYS)` with
  `RECENT_NOMINEE_CHANGE_WINDOW_DAYS = 90` (a named, exported constant citing `-262` FQ8 A *"amended by the Panel from 30"*) — one-sided
  (Trap 4); the anchor per Trap 3. **Every** version, the member's first declaration included (**Q1**, built default: warned). Reuse
  `istDateOf` / `addCalendarDays` (`cycle-calendar/holiday-resolver.ts:178, 187`) — ⛔ no new IST offset (6.20 found six copies).
- **NW4 — the FQ1 label.** A `source = 'correction'` version carries `correction_label = { district_admin_display, pariwar_admin_display }`
  from the APPLIED correction whose `applied_version_id` is that version — read across **all** the deceased's corrections (a correction
  applied under one claim shows on every claim for that death). ⭐ Both names are guaranteed present: 0119's step-coherence CHECK requires
  `da_display` AND `pa_display` NOT NULL when `step = 'applied'` — ⛔ never re-resolve them, ⛔ never invent a fallback. It is ⛔ never a warning kind and ⛔ never triggers NW6. ⚠ The words say
  *"after the death"* even for the (6-22-gated, test-only) living-member release case — recorded in Interactions, ⛔ not reworded.
- **NW5 — the reason: a new verifier reason code `warning_override`.** Approve-only; label *"Warnings reviewed — approved despite them"*;
  a rationale is **REQUIRED** with it (the contract `superRefine`, beside `other`, for BOTH the decision and the revise request) with a
  domain backstop (`rationaleCiphertext === null` ⇒ typed refusal). Migration **0142** (`ALTER TYPE "verifier_reason_code" ADD VALUE IF NOT
  EXISTS 'warning_override'`, its own file, the 0120 header as model; journal idx **142** — ⛔ never renumber the reverted-0140 gap; `when`
  **> `1792899600000`**, the house step +86 400 000 ⇒ `1792986000000`). ⭐ ONE code, ⛔ not a family: the Panel ruled ⛔ no criteria for
  what the District Admin weighs (`-262` not-cover), so the WHY lives in the note, ⛔ not in a code list we would be inventing.
- **NW6 — the rule (`-262` FQ2, `-264` FQ12) at the District Admin's approval.** In `adjudicateClaim`, approve only, **after**
  `assertClaimApprovable` and `assertClaimContactRecorded`, under the claim lock: read the kinds; kinds non-empty and reason ≠
  `warning_override` ⇒ `ApprovalWarningReasonRequiredError` (409 `verifier_decision.warning_reason_required`, details `{ kinds }`); reason =
  `warning_override` and kinds empty ⇒ `WarningOverrideUngroundedError` (409 `verifier_decision.warning_override_ungrounded` — the
  `PostDeathRefusalUngroundedError` precedent: a code that names a ground must be grounded); `warning_override` with a NULL
  `rationaleCiphertext` ⇒ `ApprovalWarningReasonRequiredError` with `missing: 'note'` (the domain backstop — the contract's 400 is the real
  enforcement; `details` carries `{ kinds, missing: 'reason' | 'note' }`). A deny and an escalate are ⛔ never gated.
  ONE reason + ONE note per approval, ⛔ not per warning. The result carries `approvalWarningKinds` so the handler can audit them.
- **NW7 — revise fixes the warning-ness of an approval when it was made (Trap 8).** In `reviseDecision`, outcome `approved`: a live
  `warning_override` decision may be revised ONLY to `warning_override` (its note may change); a revise INTO `warning_override` from another
  code is refused. Both ⇒ `ClaimDecisionNotRevisableError` with a NEW reason `'warning_reason_fixed'` (→ the existing 409
  `verifier_decision.not_revisable`, `details.reason`). The kinds are ⛔ not re-read at revise (the determination may be stale there —
  Trap 2); a warning that appears after the approval is **Q3**.
- **NW8 — the console: a non-PII `approvalWarnings` section.** `{ available, kinds, postDeath: 'evaluated' | 'awaiting_determination' }`
  (camelCase — the packet's convention), assembled fail-soft like `nomineeNameCheck`: a throw ⇒ `available: false`, and the console then
  **disables Approve** with its own words (⛔ never "no warnings" on an unknown — the 6.18 posture). ONE counted read (18 → 19), explained.
  ⛔ No name, ⛔ no date, ⛔ no decrypt.
- **NW9 — the decision strip.** When `kinds` is non-empty, Approve's reason dropdown offers **only** `warning_override`, the note is
  mandatory (asterisk + validation) and one line names the warnings and the rule; when empty, `warning_override` is ⛔ not offered. Deny and
  Escalate are unchanged. The confirmation modal restates the warnings (the attestation is what the District Admin saw).
- **NW10 — the timeline (on demand, the audited read it already is).** Each version gains `warnings: ApprovalWarningKind[]` and
  `correction_label`; the response gains `warning_basis: { death_date_known: boolean, first_filed_at: string }`. The panel renders a warning
  line on each flagged row (status ⛔ never colour alone) and the label on each correction row. The marks stay unselected; ⛔ no sort,
  filter or pre-mark by warning (invariant 5).
- **NW11 — what the superseded and ratified texts become (annotate, ⛔ never delete the record).** `-261` D1 supersedes 6.20's *"⛔ no
  version is highlighted, labelled 'after death'"* — amend, at each site, to say the warning is now shown **by `-261` D1** and that
  pre-select / pre-mark / sort / decide stay banned: `NomineeDeclarationPanel.tsx:11-17`; `i18n-en.ts:228-229`; contracts
  `nominee-declaration.ts:13-15`; `nominee-effective.ts`'s `versionStandsAt` doc (*"⛔ never to pre-select, highlight, label or
  auto-mark"* → highlight/label now via `approval-warnings.ts`); the two tests of fact 4. And `-261` C1 **ratified** 6.20's proposed-side
  `other` refusal (`-261` Consequence 2: *"corrected by the next row that touches those files (6-23)"*): every *"ENGINEERING READING … ⛔
  not a ratified rule"* site becomes *"ratified by `-261` C1"* — `nominee-correction-persist.ts:21-26, 164-166` (incl. the refusal detail
  string), contracts `nominee-declaration.ts:207-215`, `NomineeDeclarationPanel.tsx:642-646`, and the test titles/comments at
  `apps/admin/tests/nominee-declaration-panel.test.tsx:12, 571`, `apps/mobile/tests/unit/nominee-history-copy.test.ts:197`,
  `packages/domain/tests/integration/claim/nominee-correction.spec.ts:135`,
  `packages/domain/tests/integration/rls/nominee-declaration-history-policy-regression.spec.ts:17, 674`. Migration 0119's comment is
  ⛔ not edited (applied). `nominee-refusal-read.ts`'s D2 / T17 sentences are rows 6-25's / 6-24's (⛔ not edited here).
- **NW12 — audit.** The decision audit context (`auditDecision`, `claims.verification-decision.handlers.ts:196-212`) gains
  `approval_warning_kinds` (codes only) on an approve — on success **and** on a `warning_reason_required` refusal; the timeline read's
  audit context gains `warning_count` (a number). ⛔ No name, ⛔ no date.

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Given** this story is about to be built **Then** ONE author-commit decision records **NW1–NW12**, stating: the readings of `-261` D1,
`-262` FQ1 / FQ2 / FQ8 A and `-264` FQ12 it builds (each as a reading, ⛔ not as Panel words); that `-264`'s not-cover delegated the reason
code to this Task 0 (NW5); **fact 1's correction** of what the Panel was told about FQ2 (*"the system already requires a reason … concealment
flag"* — it does ⛔ not; 6.23 builds the first such rule; the ruling is unchanged); NW11's supersession record (`-261` D1 over 6.20's
no-highlight text; `-261` C1 over the *"engineering reading"* text); that Q1–Q3 are built at their defaults and owed to the Panel's next
note; and that ⛔ no Trustee-ratified clause moves — **inserted by BigDev** ([[project_decision_log_writes_user_inserted]]: draft it in the
scratchpad, hold every code edit until it is on disk, verify `git diff --numstat` is additive-only and equals the draft) and committed
`governance(6.23): …` **alone, first** ([[feedback_governance_commits_precede_implementation]]) **and** `epics.md` gains `### Story 6.23`
with a `> ⚠ Minted by…` header citing `-261` / `-262` / `-264`, after `### Story 6.19d`, **and** `epics.md` Story 6.20's AC3 (*"⛔ The system
pre-selects nothing, highlights nothing and decides nothing"*) carries an appended annotation — *"highlights nothing" superseded by `-261` D1
(built by 6.23); pre-selects nothing and decides nothing stand* — ⛔ never rewritten **and** the routing note for Q1–Q3 is drafted from
the template (§0 first) **and** ⛔ no 6.20 Change Log row is rewritten.

### AC1 — The warnings, defined once (NW1–NW3)
**Given** a claim **Then** `approval-warnings.ts`'s pure classifier flags a `source = 'member'` version `post_death_version` iff the accepted
date is known and `!versionStandsAt(effectiveAt, acceptedDate)` (a 23:59 IST change the day before ⇒ ⛔ no flag; 00:00 IST on the day ⇒
flagged; a `vacated` tombstone on the day ⇒ flagged), and `recent_nominee_change` iff its IST date is ≥ the anchor's IST date − 90 days
(90 days before ⇒ flagged; 91 ⇒ ⛔ not; after the anchor ⇒ flagged; the member's first declaration ⇒ flagged — Q1's default); **and** a
`source = 'correction'` version is ⛔ never flagged either way **and** the anchor is the earliest unreleased claim's `created_at` (a released
earlier claim moves ⛔ nothing; all released ⇒ this claim's own) **and** `readClaimApprovalWarnings` returns the claim-level kinds in ONE
statement with `post_death_version` from the live determination's `discarded` member-source items (`awaiting_determination` with none) —
**and** on a seeded post-death claim with an accepted certificate and a current determination, the date derivation and the determination
derivation flag the **same** versions (Trap 1) and `-239`'s grounding query (`assertPostDeathRefusalGrounded`) also passes; on a seeded
pre-death claim neither derivation flags anything and the grounding query refuses.

### AC2 — The reason code (NW5)
**Given** the four edits **Then** `warning_override` exists in the pgEnum (migration 0142), the domain tuple and compat map (`['approved']`),
the contracts mirror and its compat map, `reasonCodesForOutcome('approved')` returns it, and the lockstep tests pass with their exact lists
updated **and** `VerifierDecisionRequest` and `VerifierDecisionReviseRequest` refuse `warning_override` without a non-blank rationale (400)
**and** the label *"Warnings reviewed — approved despite them"* is in `t.reasonCodes`.

### AC3 — The rule at the District Admin's approval (NW6; `-262` FQ2, `-264` FQ12)
**Given** a claim that passes `assertClaimApprovable` and the contact check **When** the District Admin approves **Then** with any warning
present and a reason other than `warning_override` ⇒ **409 `verifier_decision.warning_reason_required`** with `details.kinds`, ⛔ nothing
written; with `warning_override` and ⛔ no warning ⇒ **409 `verifier_decision.warning_override_ungrounded`**, ⛔ nothing written; with a
warning, `warning_override` and a rationale ⇒ approved, the decision row carrying `warning_override` **and** every earlier refusal keeps
its code and order (a claim missing its certificate still answers `death_certificate_acceptance_required` first) **and** a **deny** (incl.
`post_death_nominee_change`) and an **escalate** on a warned claim are unchanged **and** two warnings need ONE reason and ONE note
**and** the decision audit line carries `approval_warning_kinds` (codes only) on the approval and on a `warning_reason_required` refusal (NW12).

### AC4 — Revise cannot undo it (NW7)
**Given** an approved decision **Then** revising a live `warning_override` decision to any other code ⇒ 409 `verifier_decision.not_revisable`
(`details.reason: 'warning_reason_fixed'`); revising it to `warning_override` with a new note ⇒ ok; revising an `r8_90pct_met` approval INTO
`warning_override` ⇒ the same 409 **and** a denied decision's revise is unchanged.

### AC5 — The console says it before the button does (NW8, NW9)
**Given** the verifier console **Then** the packet carries `approvalWarnings` — the kinds from `readClaimApprovalWarnings`, `postDeath`
`awaiting_determination` while ⛔ no live determination exists, and `available: false` (with Approve disabled and its own message) when the
section could not be read **and** `VERIFIER_CONSOLE_MAX_READS` is **19** with the written explanation **and** with kinds present the strip's
Approve dropdown offers ONLY `warning_override`, the note is required before submit, a line names each warning and the rule, and the
confirmation restates them; with none, `warning_override` is ⛔ not offered **and** `decisionErrorMessage` maps the two new 409 codes (and
`not_revisable` / `warning_reason_fixed`) to their own words — ⛔ never *"try again"*.

### AC6 — The timeline shows the warnings and the label (NW2–NW4, NW10)
**Given** the on-demand timeline **Then** each version carries `warnings` and `correction_label`, the response carries `warning_basis`
**and** the panel shows a warning line on each flagged row — *"dated on or after the date of death on the accepted certificate"* /
*"named or changed within 90 days before the first claim for this death was filed ({date})"* (words the developer's; ⛔ never "suspicious",
"should be discarded", or any microcopy vocabulary term) — and the FQ1 words **verbatim** on each correction row (Trap 12) **and** ⛔ no
accepted certificate (or an unreadable / erased date) ⇒ ⛔ no `post_death_version` flag and a line that the date of death is not known yet
**and** the marks stay **unselected** and the rows keep their order **and** each warning is announced in words (status ⛔ never colour alone) **and** the timeline-read audit line gains `warning_count` (a number —
⛔ no name, ⛔ no date; NW12).

### AC7 — Nothing else moves
**Then** `assertClaimApprovable`, `voteOnFrozenClaim`, `finalizeR9Outcome`, `resolveEscalation`, 6.19c's writers and the appeal flow are
untouched (Q2); the determination writer, the effective accessor's SQL and token, the name check and `member_nominees` are untouched;
⛔ no new claim event (`CLAIM_EVENT_TYPES` stays **35**, `dpdpa-consent-events.test.ts`); ⛔ no new permission key (catalog **50 / 64**);
⛔ no new route (the human-actor gate and its `COVERAGE_FLOOR` are unchanged); ⛔ no new PII table (the RTBF statement count unchanged);
⛔ no member-app or i18n-locale change; `openapi/v1.yaml` byte-identical (these schemas are ⛔ not registered — `contracts:check-openapi-determinism`
must stay green).

### AC8 — The fences
**Then** the no-comparison fence (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`) lists
`packages/domain/src/claim/approval-warnings.ts` and its exact count goes **34 → 35** with the reason in the trailing comment; the new module
trips ⛔ none of `FORBIDDEN_PATTERNS` **and** `pnpm microcopy:test && pnpm microcopy:check` exit 0 over the new admin strings.

### AC9 — The superseded and ratified texts (NW11)
**Then** every site NW11 lists is amended in place to cite `-261` D1 / `-261` C1, keeping the record of what it said **and** the admin
panel test's *"⛔ nothing says after death"* becomes: a pre-death version shows ⛔ no warning; a post-death version shows the D1 line; ⛔
nothing says *"suspicious"* or *"should be discarded"*; ⛔ no radio is checked **and** the API AC3 test keeps forbidding names, mobiles,
`highlight` and `suggested`, drops `post_death` from that list **with a comment citing `-261` D1**, and positively asserts the new fields.

### AC10 — The proof
**Then** the suites in *Testing* exist and each new test was shown to fail before its code; live-DB specs carry `{ timeout: 20000 }`, own-commit,
assert **membership**, ⛔ not counts ([[project_live_db_test_gotchas]]); the red set of Trap 6 is fixed per Trap 6, ⛔ never by an opt-out;
and `pnpm -w typecheck`, lint, the domain / contracts / api / admin / mobile suites and `ci:local` are run (a known flake is named, ⛔ never
silently re-run — [[project_known_livedb_test_failures]]) **and** `deferred-work.md` carries Task 9's records.

## Tasks / Subtasks

- [ ] **Task 0 — Governance first (AC0).** ⛔ No code before 0.2 lands.
  - [ ] 0.1 `git diff --name-only 2059482b..HEAD -- packages apps scripts docs`; re-read anything cited here that moved. `git log 2059482b..HEAD -- .decision-log.md` — read any new entry for `6-23`, `warning`, `FQ12`, `reason code`, `verifier_reason_code`; grep any routing note dated after 2026-10-04 for the same. ⚠ If 6-26 or 6-27 landed first, they carry the rule (`-264` Consequence 2) — re-plan NW1 before coding.
  - [ ] 0.2 ⛔ **Not before the v2.0 re-derivation absorbs `-277` Q2 C / Q3 B.** Draft the author-commit (next free id — **`-278`**; `-277` is the Panel's ruling; **author-commit (BigDev)**; §0: the author's; everything AC0 lists; Consequences: 6.23 may build; the routing note for Q1–Q3; the code comments of NW11; ⛔ no status flip) to the scratchpad; BigDev inserts it above the newest `### Decision`; verify additive-only and byte-equal; commit `governance(6.23): …` **alone**, first.
  - [ ] 0.3 `epics.md`: `### Story 6.23` (Minted-by header, the story statement, AC1–AC7 in brief, a pointer to this file) after `### Story 6.19d`; the appended annotation on Story 6.20's AC3. ⛔ Nothing rewritten.
  - [ ] 0.4 ✅ **DRAFTED, SENT AND RULED 2026-10-04 (`-277`):** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-04-6-23-warnings-confirms.md` (⏳ awaiting the Panel; its E4 commands run). Drafted from the TEMPLATE (§0 first; Q1–Q3 in plain English; the one deciding fact each; options with an honest cost on every one; *"How much to trust this note"* carrying fact 1's correction; evidence last with re-run commands). Sending it is BigDev's; the build does ⛔ not wait for it.
- [ ] **Task 1 — Migration (AC2).** `packages/domain/migrations/0142_verifier-reason-code-warning-override.sql` (header on the 0120 model: the ruling, why a dedicated code, approve-only, its own file); `meta/_journal.json` idx 142, `when` 1792986000000 (> 0141's). ⛔ Never edit 0001–0141; ⛔ never regenerate.
- [ ] **Task 2 — Domain: the warnings (AC1).** NEW `packages/domain/src/claim/approval-warnings.ts` per NW1–NW4: the kinds tuple; `RECENT_NOMINEE_CHANGE_WINDOW_DAYS`; pure `classifyNomineeVersionWarnings({ versions, acceptedDate: string | null, anchor: Date })` → per-version `{ warnings, isCorrection }`; pure `isRecentNomineeChange(effectiveAt, anchor)`; `readClaimApprovalWarnings` → `{ kinds, postDeath, anchorFiledAt }` (ONE raw-SQL statement: the anchor per Trap 3, the member-source versions' `version_id` / `effective_at`, the live determination's `discarded` member-source version ids; ⛔ no ciphertext column selected — the timeline reuses `anchorFiledAt`, ⛔ never a second anchor query); the two typed errors (in `claim/errors.ts` or the module — the errors-file convention); `assertApprovalReasonCoversWarnings`. Export from `packages/domain/src/claim/index.ts`. Amend `versionStandsAt`'s doc (NW11).
- [ ] **Task 3 — Domain: the rule (AC2–AC4).** `verifier-decision.ts`: `warning_override` in the tuple + compat (`['approved']`) with a comment citing `-262` FQ2 / `-264` FQ12 / NW5. `verifier-decision-persist.ts`: in `adjudicateClaim`, approve branch, after `assertClaimContactRecorded` — read the kinds, assert (NW6), carry `approvalWarningKinds` on `VerifierDecisionResult` (optional field); in `reviseDecision`, outcome `approved` — NW7 after the existing window / live / same-outcome guards (so a revision that cannot happen is refused for its real reason, the `-239` grounding precedent); `DecisionNotRevisableReason` gains `'warning_reason_fixed'`.
- [ ] **Task 4 — Contracts (AC2, AC5, AC6).** `verification-decision.ts`: the enum + compat + the `superRefine` rationale rule for `warning_override` (one condition beside `other`), and its comment. `verifier-console.ts`: NEW `ApprovalWarningsStatus` (`.strict()`, camelCase) on `VerifierConsolePacket`. `nominee-declaration.ts`: `warnings` + `correction_label` on `NomineeDeclarationVersionView`, `warning_basis` on the timeline response; the header (NW11) and the `:207-215` C1 text. ⛔ Never import `@twt/domain` ([[project_contracts_domain_bundle_boundary]]) — the kind list is re-declared with a lockstep test against the domain tuple.
- [ ] **Task 5 — API (AC3–AC6, NW12).** `claims.verification-decision.handlers.ts`: map the two new errors in `translateDecisionError` (stable messages that say the claim is ⛔ not refused — *"choose the reason … and write a note"*; *"there is no warning on this claim"*), the `warning_reason_fixed` message on the `not_revisable` arm, and `approval_warning_kinds` in `auditDecision`'s context. `claims.verifier-console.handlers.ts`: `assembleApprovalWarnings` (fail-soft, ONE `reads.bump()`), the packet field, the ceiling 18 → 19 with its ledger line and explanation block. `claims.nominee-declaration.handlers.ts` `getTimeline`: `readClaimApprovalWarnings` (for `anchorFiledAt`), the applied corrections' displays for the deceased (one read; ⛔ no decrypt), the pure classifier over the versions with the already-decrypted accepted date (`readable` ⇒ known; `unreadable` / `anonymized` / ⛔ none ⇒ not known), the new fields, `warning_count` in its audit context.
- [ ] **Task 6 — Admin (AC5, AC6, AC9).** `i18n-en.ts`: the reason label; the warning lines, the date-not-known line, the FQ1 label template, the strip's warning line and the two refusal messages; the header (NW11). `ReasonCodeDropdown.tsx`: an `approvalWarningsPresent` prop filtering per NW9. `VerificationDecisionStrip.tsx`: the prop(s), `rationaleRequired` includes `warning_override`, the warning line, the confirmation's restatement. `routes/VerifierConsoleRoute.tsx`: pass the section; `canApprove` also needs `approvalWarnings.available`; `approveBlockedReason` gains the unavailable message; `decisionErrorMessage` maps the new codes. `NomineeDeclarationPanel.tsx`: the warning lines, the label, the date-not-known line, the header and `:642-646` (NW11). ⚠ The strip's `key` already remounts per claim and state — keep it.
- [ ] **Task 7 — Fences and superseded tests (AC8, AC9).** Add `approval-warnings.ts` to `FENCED_FILES`, count 34 → 35 (append to the trailing comment: *"Story 6.23 FROM 34 (+1)"*). Amend the two tests of fact 4 and the C1 test titles/comments (NW11). Run the microcopy gate.
- [ ] **Task 8 — Tests (AC1–AC10, incl. AC7's unchanged suites)** — see *Testing*. Then run the approve-path suites and fix Trap 6's red set per its rule.
- [ ] **Task 9 — Records (AC10).** `deferred-work.md` (a new "Recorded during Story 6.23" section): ~~Q1–Q3 as carried~~ ⭐ DISCHARGED by `-277` (2026-10-04) — ⛔ nothing to carry; the raw `verifier_reason_code` the Pariwar Admin sees on `PendingCaseCard.tsx:216` (pre-existing — now it can read `warning_override`; trigger: a label pass on that card); the FQ1 words on the 6-22-gated living-member release case; ⚠ a concealment-flagged claim can be approved today with ⛔ no reason (fact 1 — pre-existing; the routing note offers the Panel to look at it; trigger: the Panel's answer). `sprint-status.yaml`: ⛔ no other row moves.

## Dev Notes

### What already EXISTS — traced at `2059482b` (rebuild ⛔ none of it)

| Thing | Where | Use |
|---|---|---|
| The approval gate | `assertClaimApprovable` (`claim/nominee-name-check.ts:383-402`) — certificate (6.21a) → accounts → effective determination → name check; `ClaimApprovalGateOptions` (6.19c's seam) | ⛔ never edited — NW6 runs AFTER it |
| P1, the District Admin's verdict | `adjudicateClaim` (`claim/verifier-decision-persist.ts:315-419`): reason↔outcome compat `:319`, live-decision guard `:330`, `-239` grounding `:336-338`, the gate + contact check `:374-386` | NW6's insertion point (after `:385`) |
| The `-239` ground | `assertPostDeathRefusalGrounded` (`:124-138`) — *a live determination with a `discarded` item* | NW2's claim-level twin; AC1's agreement test |
| Revise | `reviseDecision` (`:497`); `DecisionNotRevisableReason` (`:82`); carry-forward of the old rationale | NW7 |
| The reason vocabulary | domain `VERIFIER_REASON_CODES` / `REASON_CODE_OUTCOME_COMPAT` (`claim/verifier-decision.ts:38-72`); contracts mirror + `applyDecisionRefinements` (`packages/contracts/src/claims/verification-decision.ts:35-111`) | NW5 |
| The cutoff | `versionStandsAt` (`claim/nominee-effective.ts:112-114`) over `istMidnightAt` | NW2 — reuse, amend its doc |
| IST calendar | `istDateOf`, `addCalendarDays`, `istMidnightAt` (`cycle-calendar/holiday-resolver.ts:178, 187, 206`) | NW3 |
| The versions | `member_nominee_versions` (`schema/member_nominee_versions.ts`: `kind` declared/vacated, `source` member/correction, `effective_at`, `corrects_version_id`); `listNomineeDeclarationVersions` (`nominee/declaration-history.ts:91`) | NW2–NW4 (select ⛔ no ciphertext in the new read) |
| The determination | `nominee_determinations` + `_items` (`mark` stands/discarded; live = `superseded_at IS NULL`); the writer validates every mark against D6 (`claim/nominee-determination-persist.ts` header) | NW2's gate derivation |
| The lock / release predicate | `isNomineeDeclarationLocked` (`claim/nominee-lock.ts`) — `NOT EXISTS (… claim_nominee_findings … 'member_found_innocent')` | Trap 3's anchor (same predicate) |
| The corrections | `nominee_corrections` (`schema/nominee_corrections.ts`: `member_id`, `da_display`, `pa_display`, `applied_version_id`, `step`) | NW4 |
| The timeline route | `getTimeline` (`apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts:212-301`) — already decrypts the accepted date (`:227-238`) and audits `admin_nominee_declaration.timeline_read` | NW10 |
| The console | `assembleVerifierConsole` / `assembleNomineeNameCheckStatus` (`claims.verifier-console.handlers.ts:284, 324-394`); the ceiling ledger + `VERIFIER_CONSOLE_MAX_READS = 18` (`:68-150`) | NW8 — the fail-soft model |
| The decision route | `translateDecisionError` (`claims.verification-decision.handlers.ts:48-…`), `auditDecision` (`:196-212`) | NW6, NW12 |
| The admin surfaces | `VerificationDecisionStrip.tsx` (props `:41-66`, `rationaleRequired` `:166-167`), `ReasonCodeDropdown.tsx:37`, `VerifierConsoleRoute.tsx` (`decisionErrorMessage` `:110-127`; the strip mount `:387-424`), `NomineeDeclarationPanel.tsx` (header `:11-17`, the timeline table `:216-274`), `i18n-en.ts` (`nomineeDeclaration` `:227-…`, `reasonCodes` `:502-511`) | NW9, NW10 |
| The flag-banner precedent | `ConcealmentFlaggedBanner` (`SignalsPanel.tsx:185`) — a flag in words, ⛔ never colour alone | NW10's visual model |

### What moves (the *UPDATE* list), and what must be preserved
- **NEW:** `packages/domain/migrations/0142_verifier-reason-code-warning-override.sql`; `packages/domain/src/claim/approval-warnings.ts`;
  `packages/domain/tests/claim/approval-warnings.test.ts`; `packages/domain/tests/integration/claim/approval-warnings.spec.ts`;
  `apps/api/tests/integration/claims/approval-warnings.spec.ts`; `apps/admin/tests/approval-warnings-strip.test.tsx` (names the developer's);
  the routing note (Task 0.4).
- **UPDATE:** `packages/domain/migrations/meta/_journal.json`; `packages/domain/src/claim/{verifier-decision,verifier-decision-persist,
  nominee-effective (doc only),nominee-correction-persist (comments + one detail string),index}.ts` (+ `errors.ts` if the errors live there);
  `packages/contracts/src/claims/{verification-decision,verifier-console,nominee-declaration}.ts`;
  `apps/api/src/modules/claims/{claims.verification-decision.handlers,claims.verifier-console.handlers,claims.nominee-declaration.handlers}.ts`;
  `apps/admin/src/modules/claim-verification/{i18n-en.ts,ReasonCodeDropdown.tsx,VerificationDecisionStrip.tsx,NomineeDeclarationPanel.tsx}`;
  `apps/admin/src/routes/VerifierConsoleRoute.tsx`; the tests of Trap 7, Trap 9, fact 4, NW11 and Trap 6's red set; the fence;
  `.decision-log.md` (via BigDev); `epics.md`; `deferred-work.md`; `sprint-status.yaml`.
- **⛔ NEVER edit:** `assertClaimApprovable` / `assertNomineeNameCheckForApproval`; `recordNomineeDetermination`; the effective accessor's SQL
  and token; `voteOnFrozenClaim`, `finalizeR9Outcome`, `resolveEscalation`, `correction-closure.ts`; the appeal modules; any migration ≤ 0141;
  `nominee-refusal-read.ts` (6-24's / 6-25's text); the member app and the i18n locales.
- **Preserve:** every refusal code and its order at P1; the 6.18 / 6.20 / 6.21a / 6.19a / 6.19c behaviour; the determination form's
  unselected marks; the strip's per-claim `key`.

### Testing
- **Unit (pure, DB-free):** `packages/domain/tests/claim/approval-warnings.test.ts` — the classifier at the IST edges (23:59 / 00:00 on the
  certificate day; 90 / 91 days from an INJECTED anchor; after the anchor), `vacated` flagged, `correction` never flagged, accepted date
  unknown ⇒ ⛔ no `post_death_version`; first declaration flagged (Q1 default); `assertApprovalReasonCoversWarnings` over the full kinds ×
  reason matrix (+ `warning_override` with a null rationale); the anchor picker (earliest unreleased; released excluded; fallback).
  `packages/domain/tests/claim/verifier-decision.test.ts` (*"the matrix is exact"* +1 row); `packages/contracts/tests/claims-verifier-decision.test.ts`
  (the sorted lists; the `superRefine` on both requests); a contracts lockstep for the kind list.
- **Live-DB (`twt-test-pg :5433`, own-committing, `{ timeout: 20000 }`):** `packages/domain/tests/integration/claim/approval-warnings.spec.ts` —
  every AC3 / AC4 arm on real rows (seed post-death with an explicit earlier certificate date + a determination that discards it; recent
  with `declaredAt = now − 30 days`; old with `now − 200 days` — Trap 5); deny + escalate on a warned claim unchanged; the `-239` /
  `post_death_version` agreement; the date-vs-determination agreement (AC1); a refile's anchor = the first claim; a test-seeded
  `member_found_innocent` claim excluded from the anchor. `apps/api/tests/integration/claims/approval-warnings.spec.ts` — the two 409 codes
  with `details`; the console `approvalWarnings` (present / absent / `awaiting_determination`); the timeline fields (accepted certificate
  vs none ⇒ `death_date_known`); the audit contexts (codes only). `verifier-console.spec.ts` — the ceiling 19 and the real-statement test.
- **Admin (RTL):** the strip (only `warning_override` offered with warnings; note required; hidden without; Approve disabled + words when
  `available: false`); `decisionErrorMessage` for the new codes; `NomineeDeclarationPanel` (warning lines, the FQ1 words verbatim, the
  date-not-known line, ⛔ no checked radio, ⛔ "suspicious" / "should be discarded").
- **Regression:** the approve-path suites once after Task 3, before new specs — the expected red set is EMPTY (Trap 6).
- **AC7 (unchanged, run unmodified):** `packages/domain/tests/rbac/permissions.test.ts` (50 / 64), `dpdpa-consent-events.test.ts` (35
  claim events), the human-actor gate (`pnpm claim-adjudication-human-actor:test && …:check`), the RTBF statement-count spec, and
  `pnpm turbo run contracts:check-openapi-determinism`.
- ⚠ [[project_fk_truncate_cascade_deadlock]] — no new FK here; ⚠ assert membership, ⛔ not counts, on shared `PARIWAR_A`.

### Previous-story intelligence
- **6.20** — the module-cycle trap (T5(b): ⛔ never import `claim/events.ts` from a module `nominee-name-check.ts` reaches); D6's marks
  are mechanical once the date is entered (the basis of fact 3); the fixture convention `certificateDateAfterEverything()` (tomorrow) +
  `SEEDED_NOMINEES_DECLARED_AT` (Trap 5); the review's `certificate_date` plausibility defer (⛔ not this story's); the D16 projection
  lag (irrelevant here — the warnings read the versions, ⛔ never `member_nominees`).
- **6.18** — the fail-soft console section that says `available: false` instead of lying (NW8); response schemas are PARSED; a new
  approval precondition needs the console to say it before the button 409s (the ceiling's own rule).
- **6.19a / 6.19c** — a new conjunct at P1 goes AFTER the gate so every existing refusal keeps its code; `adjudicateClaim` is the ONE P1
  site; 6.19c's seam (`ClaimApprovalGateOptions`) is ⛔ not the place for a reason rule.
- **6.19d** — a "sibling just adds X" sentence is a claim — trace it (fact 2 is that lesson applied to FQ12's actor).
- ⚠ Inherited and ⛔ not fixed here: `PendingCaseCard` shows raw reason codes; the `certificate_date` plausibility bound (6.20 defer).

### Interactions to state, ⛔ not prevent
- The true nominee's refile (row 6-24) shows the **same** warnings as the refused claim — the versions belong to the deceased, ⛔ not the claim —
  so approving it needs `warning_override` and a note (e.g. *"the post-death change was refused on claim X"*). Expected, ⛔ not a defect.
- A claim can carry `post_death_version` on the timeline **before** its determination while the console says `awaiting_determination` —
  approval is blocked there anyway (the determination gate).
- A State Trustee can approve an escalated, warned claim with ⛔ no reason (Q2); a reversed refusal reaches the Pariwar Admin's approval
  with ⛔ no District Admin reason (Q2); a warning born after approval asks nobody for a reason (Q3).
- The FQ1 words say *"after the death"* on a correction made under a claim later released as filed against a living member (6-22-gated).

### Latest technical notes
⛔ No new library. Postgres: `ALTER TYPE … ADD VALUE` cannot be used in the transaction that adds it ⇒ its own migration file (already the
house rule, 0120 / 0040). Zod 3 `superRefine` as shipped; React 19 / TanStack Query as shipped in `apps/admin` — ⛔ no version change.

### References
- `.decision-log.md` — ⭐ `-261` D1, C1, Consequence 2 · `-262` FQ1, FQ2, FQ8 A (and its reading + not-cover) · `-264` FQ12, Consequence 2 ·
  `-263` (the correction precedent; FQ9 / FQ10 for 6-26 / 6-27) · `-239` · `-241` (6.20's author-commit) · `-226` cl.6-7 (the asymmetry).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ1–FQ13; round 1's FQ2 text = fact 1);
  `trustee-panel-routing-note-TEMPLATE.md` (Task 0.4).
- Stories `6-20-…` (D4–D7, D14, D16, T5, T7, T16, AC3, AC4), `6-21a` (D7, T10), `6-19a` (D14; its row-6-23 dev note), `6-19c` (T10 seam).
- `epics.md` Story 6.20 (AC3 — annotated by Task 0.3), Story 6.11 (UX-DR40 / 43 / 54); `ux-design-specification.md` (*"free-text note
  mandatory on Approve-with-note"*); `docs/legal/niyamavali.md` §6.2 (unratified reference).
- `microcopy.yaml` (`code_globs`, vocabulary); the no-comparison fence; `scripts/claim-adjudication-human-actor-invariant/check.ts` (unchanged).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- (create-story, 2026-10-04) Ultimate context engine analysis completed — comprehensive developer guide created. ⛔ No code written; Task 0 (the author-commit, BigDev inserts) precedes any.

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-04 | **Created (`bmad-create-story`)** from `-261` D1, `-262` FQ1 / FQ2 / FQ8 A and `-264` FQ12, traced at `2059482b`. Found: the FQ2 precedent the Panel was told of does ⛔ not exist (fact 1 — recorded, ⛔ not re-asked); FQ12's actor leaves two shipped approval paths uncovered (fact 2 ⇒ Q2, with Q1 / Q3 — confirms, ⛔ not blocking); the gate needs ⛔ no decrypt (fact 3); two tests pin the superseded rule and the 90-day window is date-sensitive (fact 4, Trap 5). Decisions NW1–NW12 ⏳ PROPOSED (Task 0's author-commit). Status `backlog` → **`ready-for-dev`**; code gated on Task 0. |
| v1.1 | 2026-10-04 | **The Q1–Q3 routing note drafted** (`trustee-panel-routing-note-2026-10-04-6-23-warnings-confirms.md`, from the TEMPLATE; E4 commands run at `2059482b`). Tracing for it found a **third** non-District-Admin approval — the R9 panel — which, like an appeal reversal, already requires written reasons ⇒ fact 2 and Q2 amended; the escalation resolution is the only path with ⛔ no written reason. The note suggests Q1 A, Q2 B, Q3 B; the build stays at A for all three until the Panel answers. Task 9 gains the concealment-approval item. ⛔ No AC, Task or NW changed. |
| v1.2 | 2026-10-04 | **APPENDED — the Panel ruled Q1–Q3: `2026-10-04-277`** (DR + KB, *"Q1 - A · Q2 - C · Q3 - B"*; staged for BigDev's insert). Q1 A = as built. ⚠ **Q2 C (our reading B ⛔ not taken) and Q3 B differ from v1.1's meanwhile A** ⇒ a STOP banner fences NW6, NW7, AC3–AC5, AC7 and Tasks 3, 5, 6 until the v2.0 re-derivation; Task 0's author-commit moves to **`-278`**; Task 9's Q1–Q3 entry DISCHARGED. ⛔ Nothing above rewritten. |
