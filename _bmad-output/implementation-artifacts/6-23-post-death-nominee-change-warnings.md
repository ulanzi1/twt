---
baseline_commit: 2059482b
---

<!--
⭐⭐ MERGED 2026-10-04 as PR #253 (REBASE-merge) — THE SHA MAP. Every SHA this file (and `sprint-status.yaml`) cites for
Story 6.23's own commits is a BRANCH SHA (`story/6-23-post-death-nominee-change-warnings`), ⛔ NOT reachable from `main`
after the rebase-merge. The baseline pin `2059482b` IS on `main` and is unaffected. The citations are kept AS WRITTEN (the
record); this is the map to their `main` twins, PROVED ⛔ not assumed: each pair has an IDENTICAL `git patch-id --stable`,
and the merged tree (`c8632117`) is byte-identical to the branch head (`629aab2e`) — `main` had not moved (the merge-base
was `2059482b`), so the rebase rewrote SHAs only.
  · `6ab1d8d9` → `a21d69e7`  story: created (v1.0)                                        (⛔ not cited)
  · `55f5be9a` → `15efa63d`  governance: the Q1–Q3 routing note                           (⛔ not cited)
  · `1b38be9e` → `1ed071dd`  governance: `-277` (the Panel's Q1 A · Q2 C · Q3 B)
  · `a55480a8` → `fb1f6a49`  story: the split into 6.23a / 6.23b (v2.1 / v1.1)
  · `07dd88b0` → `e8930a40`  story: the first validate's fixes (v2.2 / v1.2)               (⛔ not cited)
  · `a125a59d` → `a785eb0a`  governance: `-278` (NW1–NW18, EA1–EA9)
  · `29d35996` → `6a54a174`  story: `-278` recorded (v2.3 / v1.3)
  · `e2bcd2c3` → `73cf1358`  governance: `-279` (A1–A12)
  · `66ad3f75` → `efb21a3f`  governance: `-280` (NW14's fourth state)
  · `f17f4fab` → `52584c55`  story: the second validate (v2.4 / v1.4)                     (⛔ not cited)
  · `629aab2e` → `c8632117`  story: the round-4 fixes (the merge head)                    (⛔ not cited)
Re-verify (bash — zsh does not word-split `$p`): `for p in "a125a59d a785eb0a" …; do set -- $p; diff <(git show $1 | git patch-id --stable | cut -d' ' -f1) <(git show $2 | git patch-id --stable | cut -d' ' -f1); done`
— ⚠ needs the branch SHAs, which survive only while the branch (local or `origin/story/6-23-post-death-nominee-change-warnings`) does.
-->

<!--
BASELINE — `2059482b` on `main` (`story(6.19d): code review round 3 … ci:local 34/34 green`). Every code claim below was traced on this
SHA on 2026-10-04 and RE-VERIFIED by a fresh-context validator at `a55480a8` (only `_bmad-output/` and `.decision-log.md` had moved). ⭐ Two
facts are kept apart: "the pin is an ancestor of HEAD" (durable) and "the code claims were re-derived at `2059482b`" (perishable). Before
Task 1 run `git diff --name-only 2059482b..HEAD -- packages apps scripts docs` and re-read anything it lists that this file cites.

⭐ v2.x IS A DERIVATION, ⛔ NOT AN APPEND. v1.0–v1.2 (one story, Q1–Q3 built at "meanwhile" A) are kept in git on this branch. The Panel
ruled Q1–Q3 (`2026-10-04-277`: Q1 A · Q2 C · Q3 B) and BigDev split the row (*"ok, split it"*, 2026-10-04): THIS file is Story **6.23a**
(it KEEPS the key `6-23-post-death-nominee-change-warnings` because `-261`, `-262`, `-264` and `-277` cite it — the 6.21a precedent);
the later approvers are Story **6.23b** (`6-23b-every-approver-gives-a-warning-reason.md`). v2.1 added BigDev's REASON LIST; v2.2 applies a
fresh-context validate (2 HIGH, 8 MEDIUM, 13 LOW — see the Change Log); v2.4 applies a SECOND (three verifiers — 3 HIGH, 9 MEDIUM, ~25 LOW),
whose decision changes are author-commit `-279` (A1–A12, amending `-278`).

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / don't / nowhere); `⭐` =
key fact or action; `⚠` = hazard. Doubling is volume only. ⭐ Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
⭐ The exceptions: a `⛔` inside a verbatim quotation from another file (`epics.md` Story 6.20's AC3, quoted in AC0; `roles.ts`'s doc-block,
quoted in NW17) belongs to the quote.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every
prepend rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code, as of `2059482b`.
LETTERS: `NW1`…`NW18` are 6.23a's author decisions; `EA1`…`EA10` are 6.23b's (in its own file). Both sets are committed by ONE author-commit,
`-278`, in Task 0 here (the 6.19 / 6.21 precedent: one decision for a split set), as amended by `-279` (`A1`…`A12` — cited as `-279` A3 etc.) and `-280` (NW14's fourth state).
`Q1`…`Q3` are the confirms ✅ RULED by `-277`.
-->

# Story 6.23a: The Post-Death and Recent Nominee-Change Warnings, the Correction Label, the Reason List, and the District Admin's Reason and Note — Including for a Warning That Appears After Approval `[SURFACE]`

Status: review

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** On the District Admin's console the system **shows a warning** on any nominee version
> dated **on or after the death** (`-261` D1 B) and on any nominee naming or change made **within 90 days before the first claim was
> filed** — a member's first nominee included (`-262` FQ8 A, `-277` Q1 A). An approved **correction** is ⛔ never warned — it carries
> the ratified label *"corrected after the death — approved by [District Admin] and [Pariwar Admin]"* (`-262` FQ1 B). The District Admin
> may approve while a warning shows **only by choosing a warning reason from the Pariwar's reason list and writing a note** (`-262` FQ2 A,
> `-264` FQ12) — alongside the approval reason they give today — and the system **records the reason chosen and which warnings that
> approval covered**. If a warning **appears after** they approved (a re-reviewed certificate moves the date of death), the District Admin
> records a reason and a note for it too (`-277` Q3 B) — at any point up to the final approval. ⭐ **The system still refuses nothing, marks
> nothing and pays no one differently.**

> ⭐⭐ **THE REASON LIST (BigDev, 2026-10-04 — NW16–NW18).** Every Pariwar starts with **one built-in generic reason** — *"Warnings reviewed —
> approved despite them"*. The **Super Admin adds reasons in the UI**, each with a short **"when to use this reason" note**; a reason can
> only be **replaced by a newer one** — ⛔ never edited, ⛔ never deleted — and the old one stays in the history, so every past approval
> still shows the words that were chosen. **Every approver sees, beside each reason, who added it, when, and its note** — so the list
> teaches (BigDev: *"this will also help other approver learn sth from super admin"*). ⭐ **A written note is ⛔ never replaced**: the
> reason list can change; a note — a reason's, or an approver's — is audit evidence, written once (BigDev: *"Written note also serve the
> later audit therefore replacing is no good"*). ⇒ an approval on a claim that shows a warning can ⛔ never be revised (NW7).

> ⭐ **THE SPLIT (`-277`; BigDev 2026-10-04).** **6.23a (this file) is everything the District Admin does and sees, plus the reason list.**
> **6.23b** is every LATER approver (`-277` Q2 C): the trustee resolving an escalation, the Pariwar Admin's final vote, each R9 vote, 6.19c's
> Super Admin and "no correction needed" approvals — each picks from the SAME list and writes a note while a warning shows — **and Q3 B's
> WAIT** at the final approval (a conjunct in `assertClaimApprovable` that reads the District Admin's coverage this story records).
> ⇒ 6.23b starts only when 6.23a is `done`. ⚠ **Go-live coupling (1) of 6.23a: Story 6.23b** — `-277` Q2 C and Q3 B are ⛔ not in force until
> it ships. Merging 6.23a alone is fine ([[project_not_in_production_merge_is_not_golive]]); going live with it alone would let the later
> approvers approve over a warning with ⛔ no reason, and let a late warning go unanswered.

> ⭐ **Not in `epics.md`'s story list.** Minted by Trustee rulings `-261` / `-262` / `-264` / `-277`. Task 0 adds `### Story 6.23a` and
> `### Story 6.23b` with `> ⚠ Minted by…` headers. `epic-6-retrospective` stays `done`.
> ⭐ **Owner of the ONE approval rule** (`-264` Consequence 2): rows **`6-26`** (FQ8 C) and **`6-27`** (FQ8 E, FQ10) **produce** warnings
> into it ⇒ they add a warning **kind** (with its key, NW1), ⛔ never a second rule.
> ⭐ **No Panel note is owed for the reason list** (§0 gate, 2026-10-04): `-264` left the reasons' wording to the author (*"an author-commit
> at the row's Task 0"*); the author now RE-DELEGATES that wording to a runtime Super Admin authority (NW17) — a staff pick-list, changing
> ⛔ nothing a family sees or is owed. `-278` records the re-delegation and that this family departs from BOTH halves of UX-DR43's planning
> wording (*"categories agreed upfront by Trustee Panel, not free text"*): the Panel does ⛔ not agree the entries, and the entries' WORDS
> are typed by the Super Admin (approvers still pick a structured entry, ⛔ never type a reason). An FYI to the Panel is BigDev's option.

> ⚠⚠ **FIVE FACTS THE RULINGS' TEXT DOES ⛔ NOT SAY — read before anything else.**
> 1. ⚠ **What the Panel was told about FQ2 was wrong in part — and they ruled with the correction in front of them.** The 2026-09-28 note
>    said *"The system already requires a reason … approving a claim that carries a concealment flag."* Traced: `concealment_flag_override`
>    is only **permitted** on an approve (`REASON_CODE_OUTCOME_COMPAT`, `claim/verifier-decision.ts:64-72`; `adjudicateClaim` checks only
>    outcome compatibility, `verifier-decision-persist.ts:319-321`); the trustee `concealment_override` is *"merely PERMITTED"*
>    (`state-trustee-decision.ts:111-116`). ⇒ **6.23a builds the FIRST "a warning present ⇒ a reason required" rule.** `-277` acknowledges
>    the correction; `-262` FQ2 stands. ⚠ A concealment-flagged claim can still be approved with ⛔ no reason (⛔ not this story's — the
>    Panel did ⛔ not take up the offer).
> 2. ⭐ **The approval rule needs ⛔ no decrypt.** Once `assertClaimApprovable` has passed, the live determination is **current against the
>    accepted certificate** (6.21a D7) and **every mark agrees with the date** (6.20 D6 — the writer refuses any other,
>    `nominee-determination-persist.ts` header) ⇒ at the gate, *"a version dated on or after the death"* is **exactly** *"a member-source
>    version the live determination marks `discarded`"* — the ground `-239`'s refusal stands on (`assertPostDeathRefusalGrounded`,
>    `verifier-decision-persist.ts:124-138`). The timeline, which already decrypts the accepted date (`claims.nominee-declaration.handlers.ts:227-238`),
>    shows the warning **by date**, before any determination. ⚠ The equivalence holds **only after the gate** (Trap 2). ⚠ Outside the gate a
>    live determination can be **out of date** — a re-review leaves it live (`superseded_at IS NULL`) but made against ANOTHER review
>    (`isDeathCertificateDeterminationStale`, `death-certificate-approval.ts:419`) ⇒ `postDeath` is `awaiting_determination` when the live
>    determination is absent **or** stale, ⛔ never derived from the old date (`-279` A3). ⚠ `assertPostDeathRefusalGrounded` accepts ANY
>    `discarded` item (⛔ no `source` filter); the two agree at claim level only because a correction inherits its target's `effective_at`
>    (`nominee-effective.ts:110`) — say so in the module's doc-block.
> 3. ⚠ **Q3 B cannot ride `reviseDecision` — and the late warning's real home is `reversed`.** `state_trustee_freeze` is ⛔ never a resting
>    state: the freeze is opened and voted in ONE transaction (`TRUSTEE_VOTABLE_STATES`' own doc-block, `state-trustee-decision-persist.ts:82-88`;
>    6.19c's `openFreezeIfNeeded` likewise). But this path IS real: the District Admin **approves** → the final vote **denies** → the family
>    **appeals** → the appeal **reverses** (`state.ts:385-390`); appeals ⛔ never touch `claim_verifier_decisions`, so the District Admin's
>    `approved` decision is still live; and a certificate can be re-reviewed in `reversed` (`CLAIM_REVIEW_WINDOW_STATES`). `reversed` is outside
>    `reviseDecision`'s window (`VERIFIER_DECISION_REVISABLE_STATES` = `verifier_approved`, `denied`, `:51`), a warned approval is ⛔ never revised
>    (NW7), and a note is ⛔ never replaced (NW18). ⇒ **the late reason is its own record** (NW14), recordable in `verifier_approved`, `reversed`,
>    (defensively) `state_trustee_freeze` and `state_trustee_approved` (`-280`, below). ⚠ Without `reversed`, 6.23b's wait would hold such a claim FOREVER. ⭐ A NEW key can arise
>    after approval ONLY through a new determination: nominee versions are locked once a claim is filed, a correction is ⛔ never warned,
>    the anchor can only move LATER (row 6-22's release), which only REMOVES 90-day keys, and determinations / certificate reviews are
>    confined to the review window ⇒ ⛔ no late key can ARISE in `state_trustee_approved` (`-279` A7). ⚠ But under `-279` A1 a key covered
>    ONLY by an approver's own late reason is uncovered FOR THAT APPROVER — and an R9 session can be routed from `state_trustee_approved`, where
>    its voters (Pariwar Admins / the Super Admin) are the very people who record late reasons ⇒ NW14 ALSO records in `state_trustee_approved`
>    (`-280`, superseding A7's withdrawal reason), or such an R9 approval stalls with ⛔ no one able to answer.
> 4. ⚠ **"Which warnings the approval covered" must be SNAPSHOTTED at approval.** The warnings move with the certificate date, so they ⛔
>    cannot be recomputed later as "what the District Admin saw". ⇒ each District Admin approval over a warning writes a **record** of the
>    warning KEYS and the reason chosen (NW13), and Q3 B's question becomes *"is every current key covered?"* — per warning, ⛔ not per kind.
> 5. ⚠ **Two shipped tests pin the rule `-261` D1 superseded, and the approve-path fixtures sit one date away from the 90-day warning.**
>    `apps/admin/tests/nominee-declaration-panel.test.tsx:159-169` asserts the timeline never says *"after death"*;
>    `apps/api/tests/integration/claims/nominee-declaration.spec.ts:328-345` forbids `post_death` in the timeline body. Both are **amended,
>    ⛔ never deleted** (AC11). The fixture date `SEEDED_NOMINEES_DECLARED_AT = 2026-01-05` keeps every approve-path claim outside the window (Trap 5).

## Story

As the **District Admin** checking a family's death claim,
I want **the system to warn me when the member's nominee was changed on or after the date of death, or named or changed in the 90 days
before the claim was filed — to label a genuine correction plainly instead — to pick my warning reason from a list whose entries tell me who
wrote them and when to use them — and to answer a warning that appears after I approved**,
so that **I never approve such a claim, and it never goes on after my approval, without my reason and an unalterable note on record** —
while the refusal, and every mark on the declaration, stays my own judgement.

As the **Super Admin**, I want **to add a reason to my Pariwar's list, or replace one with a newer one, each with a note saying when to use
it**, so that **approvers choose from words the Trust stands behind — and ⛔ no reason anyone ever chose can disappear**.

## The rulings this story builds — verbatim keys, and what is still OUR reading

⚠ Verbatim text lives in `.decision-log.md`; the reading column is ours and is ⛔ **not ratified** unless a later ruling says so (each row
says which). Task 0's author-commit (`-278`) records every reading this story builds on — and **supersedes three earlier readings** (marked ⚠).

| Decision | The Panel said (verbatim, as relayed) | Our reading |
|---|---|---|
| `-261` D1 | *"THE SYSTEM SHOWS A WARNING ON ANY NOMINEE VERSION DATED ON OR AFTER THE DEATH. The system **still refuses nothing** — the refusal stays the District Admin's."* | *"Dated"* = `effective_at` against the claim's **current, accepted** certificate date (6.20 D6) ⇒ ⛔ no accepted certificate, ⛔ no warning; the console says the date is not yet known (`-261`'s reading). |
| `-262` FQ1 | *"AN APPROVED CORRECTION IS ⛔ NOT WARNED; IT CARRIES ITS OWN PLAIN LABEL — 'corrected after the death — approved by [District Admin] and [Pariwar Admin]'."* | A `source = 'correction'` version is ⛔ never warned (its target is, if dated so). The names are the correction row's snapshotted `da_display` / `pa_display` (NW4). |
| `-262` FQ2 | *"A CLAIM MAY BE APPROVED WHILE THE WARNING SHOWS, BUT THE DISTRICT ADMIN MUST CHOOSE A REASON AND WRITE A NOTE."* | *"A reason"* = an entry from the Pariwar's reason list, in its own field (NW5, NW16); *"a note"* = the rationale, made required and ⛔ never replaced (NW7, NW18). ⚠ **SUPERSEDES `-262`'s reading** *"FQ2's 'reason' = a new approve-only reason code, as `concealment_flag_override` already is"* (`-278`). |
| `-262` FQ8 A | *"any nominee change made **within 90 days before the claim was filed** gets a warning, **whatever the certificate says**."* (Panel-amended from 30.) | IST calendar days between a version's `effective_at` and the **first** claim's filing for that death; **every** version, before or after the death; a correction is labelled, ⛔ not warned twice (`-262`'s reading). |
| `-264` FQ12 | *"A claim may be approved while **any** warning shows … **only if the District Admin chooses a reason and writes a note**."* | ONE reason + ONE note per approval, ⛔ not per warning; a correction's label is ⛔ not a warning; a **refusal** is ⛔ never gated (`-264`'s reading). |
| `-264` not-cover | *"The wording of the reasons (the reason codes are 6.20's family — an author-commit at the row's Task 0)."* | ⭐ The reasons are the author's; the author RE-DELEGATES their wording to the Super Admin at runtime (BigDev, 2026-10-04 — NW16, NW17). Entries the Super Admin types later are runtime data governed by NW17, ⛔ not author-commits. `-278` records it, with the UX-DR43 departure. |
| ⭐ `-277` Q1 | *"Q1 - A"* — a member's **first** naming of a nominee within 90 days before filing is warned too. | ✅ **Ratified** — `-262`'s *"every version"* reading is now the Panel's rule. |
| ⭐ `-277` Q2 | *"Q2 - C"* — *"Yes, every approver — also after an appeal and in the R9 vote … Every approval made while a warning shows records a reason and a note, even where written reasons already exist."* | ⭐ **6.23b's**, from the SAME list. The District Admin's approval (`-264`) is this story's. ⚠ `-277`'s reading said *"where a note is already required (R9 votes; 6.19c's approvals), only the reason is new"* — ⛔ not so for the "no correction needed" approve (⛔ no note today, 6.23b Trap 4); **corrected by `-278`**. |
| ⭐ `-277` Q3 | *"Q3 - B"* — the final approval waits until the District Admin records a reason and a note for the new warning; *"The claim is ⛔ never refused for it."* | ⭐ **Split:** the District Admin's late reason and the coverage are **this story's** (NW13, NW14); the **wait** is **6.23b's** (EA2). Per warning, ⛔ not per kind. ⚠ **SUPERSEDES `-277`'s reading** *"the District Admin re-records their approval (a revision) with the warning reason and a new note"* — the late reason is its OWN record and a warned approval is ⛔ never revised (fact 3; `-278`). ⚠ **And** its clause *"a claim approved through an escalation, R9 or an appeal reversal has none"* — ⛔ not true for R9 run after the District Admin's approval and for a reversed final-vote denial (`-279` A5). |

## ⭐ THE INVARIANTS — every AC below serves one of them

1. **The system refuses nothing, marks nothing and pays no one differently.** A warning is information on the console and a condition on the
   **form** of an approval — ⛔ never a refusal, ⛔ never a determination mark, ⛔ never a change to the effective declaration, the name check or
   the split (`-261` D1; 6.20 invariant 1 **as narrowed by D1**).
2. **One rule, every warning, one place.** ONE assertion over ONE set of warning kinds and keys and ONE reason list; 6-26 / 6-27 add **kinds**,
   ⛔ never a second rule; 6.23b calls the SAME assertion at every later approver (`-264` Consequence 2; NW1).
3. **A correction is ⛔ never a warning.** It carries the FQ1 label and ⛔ never triggers the rule (`-262` FQ1, `-264`'s reading).
4. **A refusal is ⛔ never gated** — nor an escalation. The rule binds an approval only (`-264`'s reading; the 6.18 asymmetry, `-226` cl.6-7).
5. **The determination form still pre-selects nothing.** `-261` D1 superseded *"highlights nothing / labels nothing"* — ⛔ not *"pre-selects
   nothing"* or *"decides nothing"* (6.20 AC4). ⛔ No version is pre-marked, sorted or filtered by its warning; ⛔ no reason is pre-selected.
6. **⛔ No name is compared** — the warnings read ranks, version ids, instants and marks only (6.18 Trap 1 / Trap 4; the no-comparison fence).
7. **⛔ No new decrypt on the console or at the gate** (fact 2). The only date-decrypt stays where it already is: the audited timeline read.
8. **What an approval covered is a RECORD, ⛔ never a recomputation** (fact 4). The record is append-only; a late reason adds to it.
9. ⭐ **A written note is ⛔ never replaced** (NW18). Every note — an approver's, a late reason's, a reason's "when to use" — is written once;
   ⛔ no route edits or replaces one. The ONE exception is legal erasure (RTBF), which overwrites a member's note text with the erased marker —
   the house rule, ⛔ never a staff act.
10. ⭐ **A reason is ⛔ never deleted** (NW16). It can be replaced by a newer one; the old one stays, and every approval keeps pointing at the
    exact words it chose.
11. ⭐ **The approval reason stays real.** The warning reason is its OWN field — the District Admin still records why the claim is eligible
    (`r5_d_natural_death`, `r8_90pct_met`, `concealment_flag_override` …); ⛔ no marker code overwrites it (NW5; the 6.23b shape).

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS A CONJUNCT to a predicate that gates a member's death benefit:** the District Admin's approval of a claim requires,
whenever a warning shows, a warning reason chosen from the Pariwar's reason list and a written note. It adds ⛔ no ground to refuse, ⛔ no wait
(the wait is 6.23b's — its own note) and ⛔ no change to who is paid. The late-warning reason (NW14) is a **record**, ⛔ not a predicate on its
own; it becomes one only through 6.23b's wait. The reason list (NW16, NW17) is staff tooling — ⛔ not a predicate.

**The sentence, in the member's terms (ours, for the Panel to correct):** *"If your nominee is changed on or after the day you die, or
named or changed in the 90 days before your family's claim is filed, your family's claim can still be approved — but only after the
District Admin has written down why they are approving it."*

**Checked against the Niyamavali? ⭐ Yes — and it is silent.** `docs/legal/niyamavali.md` (present locally; an agent-drafted, **unratified**
design reference that binds nothing — [[feedback_niyamavali_rulebook_not_spec]]) says only that *"the Trust verifies the qualifying event,
the claimant's entitlement, and document authenticity"* (§6.2) and that disbursement follows the declared nominees and the 75/25 split
(§2.4, §6.4); it says ⛔ nothing on nominee-change warnings, approval reasons or notes. The sentence is **consistent with §6.2**. ⭐ **Checked
against `-261` D1, `-262` FQ1 / FQ2 / FQ8 A, `-264` FQ12 and `-277` Q1 / Q3: it matches them as ruled** — the first naming is included
(`-277` Q1, ratified), which is why the sentence says *"named or changed"*.

## ⚖️ The Panel's questions — ✅ ALL RULED (`2026-10-04-277`); ⛔ none is owed

The routing note `trustee-panel-routing-note-2026-10-04-6-23-warnings-confirms.md` (its ruling block filled) put three confirms; the Panel
(DR + KB) answered **Q1 A · Q2 C · Q3 B**. ⚠ **Q2: our reading B was ⛔ NOT taken** — C (every approver) is 6.23b. ⭐ The FQ2-precedent
correction (fact 1) was before the Panel; `-262` FQ2 stands.

| | Question as put | Ruled | Where it is built |
|---|---|---|---|
| **Q1** | Is a member's first naming of a nominee within 90 days a "change"? | **A — yes, warned** | NW3, this story |
| **Q2** | Must approvers other than the District Admin also give a reason and a note? | **C — every approver** | 6.23b (EA1, EA3–EA6) |
| **Q3** | A warning that first appears after the District Admin approved? | **B — the District Admin records a reason and a note; the final approval waits** | the record: NW13 / NW14 here · the wait: 6.23b EA2 |

⭐ **An offer the Panel did ⛔ not take up** (recorded in `-277` "does NOT cover"): whether a **concealment-flagged** approval should also
need a reason. ⛔ Not built; ⛔ not owed. ⭐ **The reason list needs ⛔ no Panel note** (the §0 box above).

## ⚠ THE TRAPS

**Trap 1 — there are TWO derivations of "dated on or after the death", and ONE definition.** The definition is `-261`'s reading: a
`source = 'member'` version (declared **or** vacated) whose `effective_at` is ≥ the IST start of the claim's current accepted certificate
date — i.e. `!versionStandsAt(effectiveAt, acceptedDate)` (`nominee-effective.ts:112-114`). The **timeline** evaluates it by date (it holds
the decrypted date). The **gate and the console** evaluate it from the live determination's `discarded` member-source items (⛔ no decrypt).
⭐ Both derivations live in ONE module, the equivalence is stated in its doc-block, and a test proves they agree on a seeded post-death
claim (AC1). ⛔ Never add a third derivation; ⛔ never decrypt the date on the console packet (6.21a T10: *"the accepted DATE stays on the
audited history read"*).

**Trap 2 — the gate's derivation is exact ONLY after `assertClaimApprovable`.** Before it, the determination may be absent, stale (a
re-reviewed certificate — 6.21a D7's `determination_stale`) or superseded by a correction (6.20 D7). ⇒ in `adjudicateClaim` the warnings
are read **after** `assertClaimApprovable` and `assertClaimContactRecorded` (`verifier-decision-persist.ts:374-386`), so every existing
refusal keeps its code and order (the 6.19a D14 precedent). ⚠ The console has no such guarantee: it reports `post_death_version` only
when a live determination exists **and was made against the current accepted review**, and says *"awaiting the determination"* otherwise
(NW2, NW8; `-279` A3). ⚠ **The late-reason writer (NW14) has none
either, and `assertDeathCertificateAcceptedForApproval` alone is ⛔ not enough**: *"With ⛔ NO live determination it PASSES"*
(`death-certificate-approval.ts:381-383`) — e.g. right after an applied correction superseded the determination. ⇒ NW14 also refuses while
`postDeath` is `awaiting_determination` (`determination_required`) — ⛔ never a reason over warnings nobody can see.

**Trap 3 — the anchor of the 90 days is the FIRST claim for the death, and a stray claim is ⛔ not one.** `-262`'s reading anchors on
*"the **first** claim's filing for that death"* — so the true nominee's refile (row 6-24) does ⛔ not move the window. But a claim filed
against a **living** member that an innocence finding released (6.20 AC2, `claim_nominee_findings.kind = 'member_found_innocent'`) was ⛔
not for a death. ⇒ the anchor is the earliest `claims.created_at` among the deceased's claims in this Pariwar **that no innocence finding
released** — the SAME predicate `isNomineeDeclarationLocked` uses (`claim/nominee-lock.ts`) — falling back to this claim's own
`created_at` when every claim is released. ⚠ The release has ⛔ no production caller until row `6-22`; the arm is test-seeded.
⚠⚠ **COPY the predicate's SQL — ⛔ never import `nominee-lock.ts`.** It imports `project.ts` → `events.ts` → `nominee-name-check.ts`, which
6.23b makes import THIS module: a runtime cycle typecheck cannot see (NW1; `-279` A12).
⚠ Raw SQL with explicit aliases — ⛔ never a Drizzle correlated subquery ([[project_epic6_drizzle_correlated_subquery_bug]]).

**Trap 4 — ⛔ no upper bound on the 90-day window.** A version can be recorded a few milliseconds **after** `claims.created_at`: intake
mints the claim with `now()` (transaction START, `schema/claims.ts:152-154`), while a nominee edit that held the intake advisory lock first
stamps `clock_timestamp()` (6.20 D2). ⇒ the predicate is `istDateOf(effectiveAt) >= addCalendarDays(istDateOf(anchor), -90)` — **one-sided**.
⛔ Never add `effectiveAt <= anchor`. (Calendar strings compare lexicographically: `CalendarDateString` is `YYYY-MM-DD`.)

**Trap 5 — the 90-day window is measured against the REAL clock, so fixture dates are a date-bomb class.** `claims.created_at` is the DB
`now()` of the test run. Every approve-path fixture declaration is dated ≤ `2026-06-10` (`SEEDED_NOMINEES_DECLARED_AT = 2026-01-05`,
`_helpers.ts:761`; the API twin's literal `2026-01-05`, `_nominee-name-check-fixture.ts:407`) — already > 90 days old at `2026-10-04` and
only getting older ⇒ ⛔ no default approve-path fixture is warned. (⚠ `packages/domain/tests/integration/claim/nominee-declaration-shape.spec.ts:176`
declares at `2026-07-01` — within 90 days of a run before 2026-09-29 — but it ⛔ never approves, so it is harmless; ⛔ never make it approve.)
⚠ A NEW spec that needs a recent change must date it **relative to now** (`new Date(Date.now() - 30 * DAY)`) and one that needs an old change
**≥ 200 days** back; the **exact** 90 / 91-day IST boundary is tested in the PURE unit test with an injected anchor, ⛔ never live. ⛔ Never move
`SEEDED_NOMINEES_DECLARED_AT` forward.

**Trap 6 — the expected red set after the rule lands is EMPTY — so a red approve-path spec is a FINDING, ⛔ not a fixture to patch.**
Traced at `2059482b` and re-verified: the only specs that both seed a `discarded` version and call an approve are
`apps/api/tests/integration/claims/nominee-declaration.spec.ts:618` (an UNDETERMINED claim — it 409s at the determination gate, before
the warnings are read) and `packages/domain/tests/integration/claim/nominee-refusal-inheritance.spec.ts` (it **denies** with `-239`'s
code — ⛔ never gated). ⛔ No spec that declares through the **real** route also approves (`claim-contact`, `nominee-bank`, `claims-intake`,
`dpdpa-consent`). ⇒ if an existing approve-path spec turns red, **read why**: either it genuinely approves over a warning (then send a listed
warning reason and a rationale — that IS the rule) or the reader is wrong. ⛔ Never by bypassing the reader, ⛔ never by an opt-out flag on the
rule, ⛔ never by moving a fixture date into the window. ⚠ NW7 changes one shipped behaviour (⛔ no revise on a warned claim) — ⛔ no shipped
spec revises a warned claim.

**Trap 7 — ⛔ no enum edit at all.** The warning reason is its OWN request field and record column (NW5) — ⛔ never a `verifier_reason_code`
value. ⇒ the verifier vocabulary, `REASON_CODE_OUTCOME_COMPAT`, its contracts mirror, the exact-list tests
(`packages/contracts/tests/claims-verifier-decision.test.ts:44-67`, `packages/domain/tests/claim/verifier-decision.test.ts:26-44`),
`t.reasonCodes` and `ReasonCodeDropdown.tsx` are all UNCHANGED. ⭐ The Super Admin's reasons are DATA (NW16) — that is why the list survives
the Super Admin's edits without a migration, and why the approval's REAL reason (invariant 11) is kept.

**Trap 8 — revise could silently re-record an approval over a warning, or replace a note.** `reviseDecision` (`verifier-decision-persist.ts:497`)
re-records an approved decision's reason and rationale in the post-verdict window, and **carries the old rationale forward when none is sent**.
⇒ NW7: an approved decision is ⛔ never revised when the claim's record holds ANY `district_admin_*` row (`-279` A8 — a late reason is ⛔
never left pointing at a re-worded approval) OR the claim shows any warning now (a revise would be an approval over a warning with ⛔ no reason
channel) OR the warnings are ⛔ not current (`postDeath` = `awaiting_determination` — fail closed, `-279` A3). ⚠ A **late** warning is answered
by NW14's record, ⛔ never by a revise (fact 3).

**Trap 9 — the console packet is PARSED and STRICT, and FIVE test files build it by hand.** `VerifierConsolePacket` is `.strict()`
(`packages/contracts/src/claims/verifier-console.ts:340-361`) and response schemas are parsed (`serializerCompiler`). A new section must
be added to the contract AND to every hand-built packet fixture — `apps/admin/tests/{verifier-console,death-certificate-review,
nominee-declaration-route,verifier-console-route-name-check}.test.tsx`, `packages/contracts/tests/claims-verifier-console.test.ts` — and the
API shape spec `apps/api/tests/integration/claims/verifier-console-shape.spec.ts` (which assembles a REAL packet, `:277` — it gains
assertions, ⛔ no fixture). ⚠ THREE admin fixtures build their packet with `}) as VerifierConsolePacket` and mount `VerifierConsoleRoute` —
`death-certificate-review.test.tsx:82-98`, `nominee-declaration-route.test.tsx:70-86`, `verifier-console-route-name-check.test.tsx:53-95` — the
cast HIDES the missing field from typecheck, and the route then throws reading `packet.approvalWarnings.available`. ⚠ Contracts tests sit outside `tsc` — **run vitest**, ⛔ never trust typecheck alone
([[project_contracts_tests_outside_tsc]]).

**Trap 10 — the read ceiling, and an honest test of it.** `VERIFIER_CONSOLE_MAX_READS` is **18** (`claims.verifier-console.handlers.ts:150`).
The new section is ONE counted read (18 → 19) — the coverage AND the Pariwar's active reasons ride the SAME statement (`json_agg` subqueries) —
with a written explanation in the ledger form above the constant. ⚠ The shipped tests do ⛔ not catch a forgotten `reads.bump()`: the
real-statement test asserts only no-growth-with-rows and `reported <= actual` (`verifier-console.spec.ts:745-757`), the ceiling checks
`readCount <= MAX` (`:787`, `:820`, `:859`, `:866`). ⇒ add an EXACT assertion: assembling with the section raises `readCount` by exactly 1, and
raises the real statement count by exactly 1 — the model is 6.20 AC13's inheritance test (`:1085-1086`, `readCount - baseline.readCount === 2`
with an equal `actual` delta).

**Trap 11 — admin copy is scanned; the Super Admin's words are ⛔ not.** `microcopy.yaml` scans `apps/admin/src/**/*.{ts,tsx}` (`code_globs`)
for the active vocabulary terms — `report`, `receipt`, `invoice`, `passbook` must ⛔ not appear in any new string — **and** for its `tone`
regexes (e.g. `\baction\s+(is\s+)?required\b`, `(requires?|needs?)\s+…action`, `final\s+(reminder|notice)`, `\bact\s+now\b`) — word the
refusal and "waits" lines accordingly; ⛔ no string says a version *"is suspicious"* or *"should be discarded"*. ⚠ A reason's label and note typed by the Super Admin are DATA — the static gate never sees them.
⇒ the API validates them on write against the gate's vocabulary terms (a tiny server-side deny-list mirroring `microcopy.yaml`'s active
`vocabulary` entries, with a lockstep test against the yaml) and lengths; anything subtler is the Super Admin's judgement, as for the
Niyamavali display fields. Recorded as an accepted limit (Task 10's deferred item).

**Trap 12 — the FQ1 label's words are ratified copy.** Render them **verbatim**: `corrected after the death — approved by {districtAdmin}
and {pariwarAdmin}` (lower-case first word as ruled; an em dash). ⛔ Never paraphrase, ⛔ never re-case. The names are the correction
row's `da_display` / `pa_display` (`schema/nominee_corrections.ts`), ⛔ never re-resolved — 0119's step-coherence CHECK guarantees both
are NOT NULL on `step = 'applied'`.

**Trap 13 — the "live approval" is a decision ROW, ⛔ not a state.** Coverage is keyed to the **claim** and read as *"every District Admin
record row for this claim, while its live verifier decision is an approval"* — `verifier_decision_id` is provenance, ⛔ not the key. A claim
whose live verifier decision is ⛔ not `approved` — escalated and resolved (the trustee row supersedes it), or **refused by the District Admin
and then reversed on appeal** — has ⛔ no District Admin approval to cover anything: NW14 refuses there, and 6.23b's Q2 C covers those
approvers. ⚠ A claim the District Admin APPROVED, denied at the final vote and then reversed on appeal STILL has its live approval — it is
NW14's (fact 3).

**Trap 14 — erasure.** The late reason's note is Tier-1 staff text about the deceased's claim. ⚠ The 6.20 / 6.21a precedent scrubs such notes
(`nominee_determinations`, `nominee_corrections`, `claim_death_certificate_reviews` — `member/anonymize.ts`), and a Tier-1 column that is ⛔ not
in the anonymizer **survives erasure** (the 10.10 lesson, in that file's own words). ⇒ the record table carries `deceased_member_id` (the
`nominee_determinations` shape — the anonymizer filters on it directly, ⛔ never a subquery inside its UPDATE), a column-level UPDATE grant on
the note, and the RTBF pin moves **17 → 18 tables / 20 → 21 statements** with its TITLE (`packages/domain/tests/member/rtbf-anonymize.test.ts:98,
159, 191`). ⭐ The reason list's labels and notes are staff policy text, ⛔ not member data — ⛔ not in the anonymizer (the form says so). ⚠
Recorded, ⛔ not fixed here: `claim_verifier_decisions.rationale_ciphertext` — where the at-approval note lives — is ⛔ not in the anonymizer
today (Task 10's deferred item).

**Trap 15 — every business table here is per-Pariwar; the reason list is too.** At `2059482b` the only tables without `pariwar_id` are auth
infrastructure (`admin_credentials`, `admin_sessions`, `webauthn_credentials`, the OTP / rate buckets …). ⇒ `approval_warning_reasons` carries
`pariwar_id` with RLS + FORCE, and the Super Admin manages it from a Pariwar context — the precedent is a Super-Admin-only key on a
`/api/v1/p/:pariwarId/admin/…` route (`apps/api/src/modules/drive-target/routes.ts:113-124` and the route after it). ⚠ Two departures from
that precedent, stated: it registers its routes in `openapi/v1.yaml` (`routes.ts:23`) — this story does ⛔ not (AC9 keeps the yaml
byte-identical; ⛔ nothing enforces registration, and the claims routes are ⛔ not registered either); and it has ⛔ no nav link (this story
adds one, gated as in Task 11). The **built-in generic** is a code constant, ⛔ not a row — so every Pariwar has it on day one with ⛔ no
per-Pariwar seeding and ⛔ no provisioning hook, and it can ⛔ never be replaced or lost. (Considered: `feature_flag_versions` — a nullable
`pariwar_id` with global rows + a code-owned default. ⛔ Not taken: a reason is chosen per Pariwar by that Pariwar's Super Admin, and a global
row would let one Pariwar's words reach another's approvers.)

**Trap 16 — a reason can be replaced between the page load and the submit.** The picker shows the active list; a Super Admin may replace an
entry meanwhile. ⇒ every writer re-validates the chosen code against the ACTIVE list in its own transaction — reading the chosen reason row
`FOR SHARE` (so a replacement cannot commit between the check and the insert): a replaced or unknown code ⇒ 409 `…warning_reason_unavailable`
(*"that reason was replaced — please choose again"*), ⛔ never silently mapped to its replacement (the approver chose the words, and the new
words may say something else).

**Trap 17 — append-only, mostly the way this repo does it.** (a) "Refuses every DELETE" must keep the CASCADE exception — `IF TG_OP = 'DELETE' AND
pg_trigger_depth() > 1 THEN RETURN OLD` (`0119:118`, `0122:70`): `claim_warning_approvals` cascades from `claims`, and specs clean up with
`DELETE FROM claims` (e.g. `death-certificate-concurrency.spec.ts:171`). ⚠ Its `verifier_decision_id` FK is `ON DELETE CASCADE` (the decision
row cascades from `claims` in the same statement) — ⛔ never `set null` (the repo's usual idiom for a nullable pointer: here it is an UPDATE the
guard refuses, and it would break the step ⇔ decision CHECK) and ⛔ never `restrict`. (b) ⚠ **A deliberate departure:** the column-aware
UPDATE guard compares `to_jsonb(NEW) - 'note_ciphertext'` with `to_jsonb(OLD) - 'note_ciphertext'` — ⛔ no migration uses this yet (0119:96-111
lists the columns), but 6.23b adds columns, and an explicit list would let them escape.
(c) A TRUNCATE proof follows the rewritten precedent — a trigger-binding check + a temp twin table
(`nominee-declaration-history-policy-regression.spec.ts:508-535`); ⚠ `approval_warning_reasons` is FK-referenced, so a plain TRUNCATE fails
`0A000` BEFORE any trigger runs — test the trigger binding, ⛔ not the TRUNCATE.

**Trap 18 — reason rows can ⛔ never be deleted, so test data accumulates.** With own-committing specs on shared `PARIWAR_A`, *"a Pariwar with ⛔
no rows ⇒ exactly the generic"* fails on the second run. ⇒ every spec that adds or reads reasons uses a FRESH Pariwar id
(`randomUUID()`, the `verifier-console.spec.ts` pattern) and asserts membership, ⛔ never counts.

## ⚖️ Decisions — the AUTHOR's (✅ COMMITTED with 6.23b's EA1–EA9 by ONE author-commit, `-278` — `a125a59d`, 2026-10-04, before any code)

⛔ None is the Panel's — each is *"the code should do X"* (the §0 gate). NW16–NW18 are BigDev's calls of 2026-10-04.

- **NW1 — ONE module; KINDS and KEYS.** NEW `packages/domain/src/claim/approval-warnings.ts`: `APPROVAL_WARNING_KINDS = ['post_death_version',
  'recent_nominee_change'] as const`; a warning **key** = `` `${kind}:${subjectId}` `` (6.23a's subjects are `version_id`s; 6-26 / 6-27 use
  their own subject ids); the pure per-version classifier (NW2–NW4); the claim-level read `readClaimApprovalWarnings(db, pariwarId,
  claimCaseId)` → `{ kinds, keys, postDeath: 'evaluated' | 'awaiting_determination', anchorFiledAt, coverage: { districtAdminApproved,
  coveredKeys }, reasonOptions }` in **ONE** statement; `uncoveredKeys(warnings)`; and `assertApprovalReasonCoversWarnings(…)` — the ONE rule
  every approver calls. ⭐ 6-26 / 6-27 add a kind, its key and a producer — the assertion is ⛔ never edited. ⛔ No future kind is pre-minted
  ([[feedback_no_premature_package]]). ⚠⚠ **Import discipline:** it must ⛔ never import `claim/events.ts` (6.20 T5(b)) **nor
  `nominee-name-check.ts` or anything that imports it** — 6.23b makes `nominee-name-check.ts` import THIS module (EA2), and a cycle would be a
  runtime TDZ that typecheck cannot see ([[project_type_only_import_cycle_trap]]). ⚠ **TRANSITIVELY** — `nominee-lock.ts` reaches
  `nominee-name-check.ts` through `project.ts` → `events.ts`; the source-scan test follows relative imports to a fixpoint (`-279` A12). Safe
  leaves: `death-certificate-approval.ts`, `nominee-effective.ts`, `review-window.ts`, `errors.ts`, `cycle-calendar/holiday-resolver.ts`.
  ⭐ 6.23b adds the bulk form `readClaimApprovalWarningsBulk` here. ⭐ **`APPROVAL_WARNING_KINDS` is pinned by a test** whose failure message
  reads *"a new kind enters 6.23b's wait (`-277` Q3 B) — its producer row decides or routes that before extending this list"* (`-279` A6).
- **NW2 — `post_death_version` (`-261` D1).** Per version: `source = 'member'` (`declared` **or** `vacated`) and `!versionStandsAt(effectiveAt,
  acceptedDate)` when the accepted date is **known**; unknown ⇒ ⛔ no flag, and the timeline says the date is not known. Claim-level (gate,
  console, NW14): present ⇔ the **live, current** determination has a `discarded` item whose version is `source = 'member'`; ⛔ no live
  determination, **or** one whose `death_certificate_review_id` is NULL or ⛔ not the claim's current accepted review (the comparison
  `isDeathCertificateDeterminationStale` makes, done inside the ONE statement) ⇒ `awaiting_determination` (`-279` A3). Doc-block the
  equivalence (Trap 1, fact 2 — incl. why ⛔ no `source` filter is needed on `-239`'s side) and that it is `-239`'s refusal ground.
- **NW3 — `recent_nominee_change` (`-262` FQ8 A; `-277` Q1 A).** Per version: `source = 'member'` and `istDateOf(effectiveAt) >=
  addCalendarDays(istDateOf(anchor), -RECENT_NOMINEE_CHANGE_WINDOW_DAYS)` with `RECENT_NOMINEE_CHANGE_WINDOW_DAYS = 90` (exported, citing
  `-262` FQ8 A *"amended by the Panel from 30"*); one-sided (Trap 4); the anchor per Trap 3; **every** version — the member's first declaration
  included (✅ `-277` Q1, ratified). Reuse `istDateOf` / `addCalendarDays` (`cycle-calendar/holiday-resolver.ts:178, 187`) — ⛔ no new IST offset.
- **NW4 — the FQ1 label.** A `source = 'correction'` version carries `correction_label = { district_admin_display, pariwar_admin_display }`
  from the APPLIED correction whose `applied_version_id` is that version — across **all** the deceased's corrections. ⛔ Never a warning kind;
  ⛔ never triggers the rule. ⚠ The words say *"after the death"* even for the 6-22-gated living-member release case — ⛔ not reworded.
- **NW5 — the warning reason is its OWN field; the approval reason stays real (invariant 11; Trap 7).** `VerifierDecisionRequest` (the
  decision request ONLY — ⛔ not the revise request, which cannot touch a warned claim, NW7) gains an optional `warning_reason_code`; its
  `superRefine`: allowed only with `outcome: 'approved'`, and when present a non-blank rationale is required. The server checks the code
  against the Pariwar's ACTIVE list (NW16) at write time (Trap 16). The decision's `reason_code` stays the District Admin's real approval reason
  (`r5_d_natural_death`, `r8_90pct_met`, `concealment_flag_override`, `other`). ⛔ No enum value, ⛔ no migration for this (the validator's
  MEDIUM #4: a marker would have discarded the real reason and diverged from 6.23b).
- **NW6 — the rule at the District Admin's approval (`-262` FQ2, `-264` FQ12).** In `adjudicateClaim`, approve only, **after**
  `assertClaimApprovable` and `assertClaimContactRecorded`, under the claim lock, IN THIS ORDER: (1) kinds empty and a `warning_reason_code`
  sent ⇒ `WarningReasonUngroundedError` (409 `verifier_decision.warning_reason_ungrounded`); (2) kinds non-empty and ⛔ no `warning_reason_code`
  ⇒ `ApprovalWarningReasonRequiredError` (409 `verifier_decision.warning_reason_required`, details `{ kinds, missing: 'reason' }`); (3) the code
  ⛔ not active ⇒ `WarningReasonUnavailableError` (409 `…warning_reason_unavailable`); (4) a NULL rationale ⇒ the second error with `missing:
  'note'` (the backstop — the contract's 400 is the real enforcement). ⭐ When kinds are non-empty, the SAME transaction writes a
  `district_admin_approval` record row — the chosen reason (code + id, or the generic) and the current keys (NW13). A deny and an escalate are
  ⛔ never gated. ONE reason + ONE note per approval.
- **NW7 — an approval on a warned claim is FINAL in its words (Trap 8; NW18).** In `reviseDecision`, outcome `approved`, AFTER the existing
  window / live / same-outcome guards: refused when the claim has ANY `district_admin_*` record row (`-279` A8), OR the claim shows any
  warning now — `ClaimDecisionNotRevisableError` with a NEW reason `'warning_approval_final'`; OR `postDeath` is `awaiting_determination`
  (absent or stale — `-279` A3, fail closed) — a SECOND new reason `'warnings_not_current'` (*"re-record the nominee determination first — once the death certificate is
  accepted"*: while a re-reviewed certificate awaits review or is rejected, ⛔ no determination can be recorded).
  Both → 409 `verifier_decision.not_revisable`, `details.reason`. ⭐ Every other revise is unchanged (6.11 D-E). Something new about a warned
  claim is ADDED (NW14), ⛔ never written over.
- **NW8 — the console: a non-PII `approvalWarnings` section.** `{ available, kinds, postDeath, uncoveredSinceApproval, reviseBlocked,
  viewerCanRecordLateReason, lateKeysUncoveredForViewer, reasonOptions }` (camelCase — the packet's convention): `uncoveredSinceApproval` = the number of current keys ⛔
  not in the District Admin's coverage, only when the live verifier decision is `approved` (else 0); `reviseBlocked` = `null` |
  `'warning_approval_final'` | `'warnings_not_current'` — NW7's predicate with its reason (the strip REPLACES its revise affordance with
  words when non-null — ⛔ never a dead control; *"final"* says the approval's words are fixed, *"not current"* says revise returns once
  the determination is re-recorded against the accepted certificate); `viewerCanRecordLateReason` = server-computed
  (the 6.21a D10 `viewer.canReview` shape, `claims.verifier-console.handlers.ts:496-506`: `rbac.hasPermission(ctx.grants, 'claim.approve',
  { dimension: 'district', value: ctx.district, pariwarId: ctx.pariwarId }, ctx.geoResolver ? { resolver: ctx.geoResolver } : undefined)`
  AND NW14's WHOLE refusal predicate passes for THIS viewer (live approval, the state set, `postDeath = 'evaluated'`, and ⛔ not
  `nothing_uncovered` as judged for this viewer) — so the console ⛔ never offers a panel that would 409; `-279` A1, A12);
  `lateKeysUncoveredForViewer` = the number of current late keys ⛔ not covered by this viewer's own `district_admin_*` rows — the panel
  shows it, and says *"a late reason recorded by the approver cannot clear their own approval"* when `uncoveredSinceApproval` is 0 (another
  person's reason covers it for everyone but them); `reasonOptions` = the active list (NW16 — each `{ code, label, whenToUse, addedByDisplay |
  null, addedAt | null, replacesLabel | null }`; `null`s mark the built-in generic). Fail-soft like `nomineeNameCheck`: a throw ⇒ `available:
  false`, Approve disabled with its own words (⛔ never "no warnings" on an unknown). ⚠ The assembler has ⛔ no SAVEPOINT, so a SQL throw aborts
  the scope transaction for every later read ⇒ run `assembleApprovalWarnings` LAST (after `nomineeNameCheck`), or inside a SAVEPOINT. ONE
  counted read (18 → 19), explained (Trap 10). ⛔ No name of a member, ⛔ no date of death or of a nominee version (the reasons' `addedAt` is
  staff metadata), ⛔ no decrypt.
- **NW9 — the decision strip and the picker.** When `kinds` is non-empty, the strip shows — BESIDE the unchanged approval-reason dropdown — a
  **warning-reason picker** listing `reasonOptions`, each with its label, its "when to use" note and *"added by {name} on {date}"* (or *"built
  in"*) — ⭐ BigDev's (b): approvers learn from the list. ⛔ Nothing is pre-selected; the note is mandatory; one line names the warnings; the
  confirmation restates the warnings and the chosen warning reason. When kinds are empty, ⛔ no picker. Deny / Escalate unchanged. ⭐ The picker
  is ONE shared component (`ApprovalWarningReasonPicker`) — 6.23b mounts the same one on every later surface.
- **NW10 — the timeline (the audited on-demand read it already is).** Each version gains `warnings: ApprovalWarningKind[]` and
  `correction_label`; the response gains `warning_basis: { death_date_known, first_filed_at }`. The panel shows a warning line per flagged
  row (⛔ never colour alone) and the label per correction row. Marks stay unselected; ⛔ no sort / filter / pre-mark by warning.
- **NW11 — the superseded and ratified texts (annotate, ⛔ never delete the record).** `-261` D1 supersedes 6.20's *"⛔ no version is
  highlighted, labelled 'after death'"* — amend, citing `-261` D1, that the warning is now shown and pre-select / pre-mark / sort / decide stay
  banned: `NomineeDeclarationPanel.tsx:11-17`; `i18n-en.ts:228-229`; contracts `nominee-declaration.ts:13-15`; `versionStandsAt`'s doc; the two
  tests of fact 5. `-261` C1 **ratified** 6.20's proposed-side `other` refusal (`-261` Consequence 2 names row 6-23): every *"ENGINEERING
  READING … ⛔ not a ratified rule"* site becomes *"ratified by `-261` C1"* — `nominee-correction-persist.ts:21-26, 164-166` (incl. the
  refusal detail string), contracts `nominee-declaration.ts:207-215`, `NomineeDeclarationPanel.tsx:642-646`, and the test titles / comments
  at `apps/admin/tests/nominee-declaration-panel.test.tsx:12, 571`, `apps/mobile/tests/unit/nominee-history-copy.test.ts:197` (a test TITLE
  only), `packages/domain/tests/integration/claim/nominee-correction.spec.ts:135`,
  `packages/domain/tests/integration/rls/nominee-declaration-history-policy-regression.spec.ts:17, 674`. ⭐ Three more `-261` D1 sites:
  `apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts:13-14` (*"nothing here computes "this changed after the death",
  highlights, pre-selects…"* — the very file NW10 changes), `apps/api/tests/integration/claims/nominee-declaration.spec.ts:7` (*"⛔ no
  highlight"*) and `apps/admin/tests/nominee-declaration-panel.test.tsx:6` (header *"⛔ nothing says "after death""*). Migration 0119's comment is ⛔ not
  edited (applied). `nominee-refusal-read.ts`'s D2 / T17 sentences are rows 6-25's / 6-24's (⛔ not edited here).
- **NW12 — audit.** The decision audit context (`auditDecision`, `claims.verification-decision.handlers.ts:196-212`) gains
  `approval_warning_kinds` and `warning_reason_code` on an approve and on a `warning_reason_required` refusal; the timeline read gains
  `warning_count`; the late reason audits `admin_claim.late_warning_reason_recorded` / `…_rejected` (`covered_key_count`, kinds, the code);
  the Super Admin's acts audit `admin_approval_warning_reason.added` / `.replaced` / `.rejected` (ids, codes). ⛔ No member name, ⛔ no date,
  ⛔ no note text.
- **NW13 — the approval-over-warning RECORD (fact 4).** Migration **0143** (after NW16's table — its FK): NEW table `claim_warning_approvals` —
  `record_id`, `pariwar_id`, `claim_case_id` (FK `claims`, cascade), `deceased_member_id` (Trap 14), `step` (CHECK — 6.23a's two:
  `district_admin_approval`, `district_admin_late_reason`; 6.23b widens it), `verifier_decision_id` (FK `claim_verifier_decisions`, **nullable**,
  with a step-coherence CHECK: NOT NULL ⇔ a `district_admin_*` step — so 6.23b's steps need ⛔ no `DROP NOT NULL`), `reason_code` (text — the
  chosen code, snapshotted), `reason_id` (NULL ⇔ the built-in generic — a CHECK; a COMPOSITE FK `(pariwar_id, reason_id)` →
  `approval_warning_reasons (pariwar_id, reason_id)`, so a row can ⛔ never point at another Pariwar's reason), `covered_keys text[]` (CHECK
  `cardinality >= 1`), `note_ciphertext` (Tier-1, `piiColumn(1, 'claim_warning_approval')`; CHECK NOT NULL ⇔ `step = 'district_admin_late_reason'`
  — every other step's note lives on its own decision row), `recorded_by_actor`, `recorded_by_display` (snapshotted —
  [[project_admin_display_name_attribution]]), `recorded_at` (`clock_timestamp()`). `verifier_decision_id` is `ON DELETE CASCADE` (Trap 17).
  Append-only by grant (`SELECT, INSERT` + column UPDATE on `note_ciphertext` for RTBF ONLY) **and** by trigger (Trap 17: the cascade
  exception; the jsonb compare) — ⛔ no route edits a row (NW18); RLS + FORCE in the order `GRANT` → `ENABLE` → `FORCE` → `POLICY`
  (`packages/domain/src/policies/`, the `claim-certificate-reminder-rls.ts` model) with **per-command** policies `…_tenant_isolation_select`,
  `…_insert` and `…_update` (the UPDATE narrowed by the column grant — the 0119 / 0122 / 0139 pairing; ⛔ no DELETE policy, ⛔ no `FOR ALL`).
  ⚠ Without the UPDATE policy the RTBF scrub silently updates 0 rows under FORCE (`-279` A12);
  a policy-regression spec with a DB ↔ TS lockstep on `step`. NEW field class `claim_warning_approval` in `apps/api/src/context.ts` and the
  anonymizer (Trap 14). **Coverage** (Q3 B) = the union of `covered_keys` over the claim's `district_admin_*` rows (Trap 13) — 6.23b's rows
  ⛔ never count toward it.
- **NW14 — the District Admin's reason for a LATE warning (`-277` Q3 B, the District Admin's half; fact 3).** NEW
  `claim/approval-warnings-persist.ts`: `recordLateWarningReason(client, { claimCaseId, pariwarId, warningReasonCode, noteCiphertext, actorId,
  actorDisplay })` — under the verifier advisory lock + the claim row lock (the `adjudicateClaim` order — ⚠ `acquireDecisionLock` (`:198`),
  `lockClaim` (`:209`) and `getLiveDecision` (`:263`) are module-PRIVATE in `verifier-decision-persist.ts`: export them, ⛔ never copy them;
  only `verifierDecisionAdvisoryLockKey` is exported today): refused (typed, → 409) when the live
  verifier decision is ⛔ not `approved` (`no_district_admin_approval`); the state is ⛔ not in `{verifier_approved, reversed,
  state_trustee_freeze, state_trustee_approved}` (`not_recordable_state`; the fourth by `-280`); the certificate / determination is ⛔ not current
  (`assertDeathCertificateAcceptedForApproval`'s own 409 — amend its doc-block's *"Called ONLY by `assertClaimApprovable`"*, `:388`, to name
  this second caller); `postDeath` is `awaiting_determination` (`determination_required` — Trap 2); the reason is ⛔ not active (Trap 16); or `nothing_uncovered` —
  ⭐ judged FOR THIS RECORDER (`-279` A1): ⛔ no current key is LATE (every current key is in the `district_admin_approval` row's keys — at most one such
  row per claim), OR every current key is already covered by `district_admin_*` rows THIS actor recorded (⛔ never their 6.23b
  later-step rows, e.g. an `r9_vote` row). ⇒ a second person can ALWAYS answer a late warning that only the
  approver's own row covers (else a self-recorded reason would stall the claim with ⛔ no surface showing it). ⚠ ACCEPTED RESIDUAL
  (round 4): NW14 knows ⛔ nothing of R9, so a live R9 approve voter is still offered the panel and may record — but their reason ⛔ never
  counts at finalize; in the degenerate Pariwar where EVERY `claim.approve` holder at the district (incl. the Super Admin) is a live
  approve voter or the finalizer, ⛔ nobody can answer and the exit is a voter changing their vote or the session being re-run — recorded
  in 6.23b's deferred item, ⛔ not built around; a duplicate answer from a
  third person is harmless (append-only, each with its own note); else it inserts a `district_admin_late_reason` row — the chosen reason, ALL current keys, the
  note. ⛔ No event, ⛔ no state change, ⛔ no decision row (the `return_to_district_admin` metadata-only shape). Route `POST
  /api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-decision/late-warning-reason` in `claims.verification-decision.routes.ts` (`claim.approve`,
  district dimension, a plain string-literal path, and ⛔ no step-up — the decision route's posture, `claims.verification-decision.routes.ts:100`;
  only revise is step-up-gated, `:116`); the human-actor gate entry's `expectedMethods` `['post','post']` → `['post','post','post']`. Contract
  `LateWarningReasonRequest { warning_reason_code, note }` (`.strict()`, both required; note ≤ 500) and a non-PII response. The console offers it
  (NW8's `viewerCanRecordLateReason` ALONE — ⛔ never also `uncoveredSinceApproval > 0`, which is 0 exactly when an approver's own
  reason is the only cover and someone else must answer) as a small panel with the SAME picker — ⛔ not inside the strip. ⭐ Each
  late reason is a NEW row — the earlier ones and their notes stay (NW18). ⚠ Any `claim.approve` holder at the district may record it (a
  Pariwar Admin too — a pariwar grant covers every district — and the Super Admin, who holds every key globally); 6.23b's wait does ⛔ not
  count a late reason for an approval its own recorder makes (`-279` A1). ⚠ A late-reason recorder is ⛔ not excluded from reviewing the family's appeal — a record, ⛔ not a decision (`-279` A11, the
  6.20 T6 precedent).
- **NW15 — what 6.23b inherits.** The module (NW1), its rule, the keys, the record (NW13) and the reason list (NW16) are the CONTRACT 6.23b
  builds on: the wait (EA2) reads coverage exactly as NW8 counts it — `uncoveredKeys`, ONE copy.
- **NW16 — the REASON LIST (BigDev 2026-10-04).** Migration **0142**: NEW table `approval_warning_reasons` (per Pariwar — Trap 15): `reason_id`,
  `pariwar_id` (`UNIQUE (pariwar_id, reason_id)` — the composite FK's target), `code` (server-generated, immutable, `UNIQUE (pariwar_id, code)`, ⛔
  never reused — `awr_` + 8 hex; a 23505 on it is retried with a fresh code under a raw SAVEPOINT —
  [[project_domain_limit_clamp_and_savepoint_retry]]), `label_en` (1–120 chars), `when_to_use` (1–1000 chars — the Super Admin's note, Tier-3
  staff policy text, ⛔ not member data; the form says so), `replaces_reason_id` (a COMPOSITE self-FK `(pariwar_id, replaces_reason_id)` →
  `(pariwar_id, reason_id)` — FK checks bypass RLS, so a single-column FK could point across Pariwars (`-279` A9); `UNIQUE` — a reason is
  replaced at most once), `replaced_at` (NULL while active;
  set ONCE), `created_by_actor`, `created_by_display` (snapshotted), `created_at` (`clock_timestamp()`). Append-only: `GRANT SELECT, INSERT` + a
  column UPDATE on `replaced_at` ONLY; a trigger that refuses every other UPDATE, any `replaced_at` change once set (one-way — the 0121 one-way
  `superseded_at` trigger on `nominee_determinations` is the model) and every DELETE (with Trap 17's cascade exception); ⭐ and a DEFERRABLE
  INITIALLY DEFERRED constraint trigger that, at commit, refuses a `replaced_at` with ⛔ no row whose `replaces_reason_id` is this reason — so
  "replaced" can ⛔ never be a disguised delete — **and** refuses a row whose `replaces_reason_id` target still has `replaced_at IS NULL` (⛔ never two
  active rows, one claiming to replace the other — `-279` A9). RLS + FORCE with per-command SELECT / INSERT / UPDATE policies (as NW13 —
  ⚠ Trap 16's `SELECT … FOR SHARE` needs the UPDATE policy AND UPDATE privilege; without them every chosen reason reads as "unavailable");
  policy-regression spec (Traps 17, 18). ⭐ **The built-in generic** —
  `APPROVAL_WARNING_GENERIC_REASON = { code: 'warnings_reviewed', label: 'Warnings reviewed — approved despite them', whenToUse: 'Use when you have
  read every warning shown and still approve. Your note must say why.' }` — is a constant in domain + contracts (lockstep test), offered first in
  every Pariwar, ⛔ never stored, ⛔ never replaceable. **Active list** = the generic + rows with `replaced_at IS NULL`, oldest first. Domain:
  `claim/approval-warning-reasons.ts` — `listApprovalWarningReasons(db, pariwarId, { history })`, `lockActiveApprovalWarningReason` (`FOR
  SHARE` — Trap 16), and the two writers of NW17.
- **NW17 — the Super Admin adds or REPLACES; ⛔ never edits, ⛔ never deletes.** Permission key **`approval_warning_reason.manage`** (pariwar
  dimension; `super_admin` only — it AUTO-DERIVES every catalog key, so `roles.ts` gets ⛔ no const (*⛔ Do not "complete the pair"*,
  `roles.ts:292-298`; a comment at most); catalog **50 → 51**, keys **64 → 65**; `permissions.test.ts`; its doc-block's reuse-check: ⛔ no existing
  key fits — `niyamavali.*` is the member-visible rulebook's review workflow, `pariwar.amend_rule` amends rule clauses; minted by `-278`). NEW
  module `apps/api/src/modules/approval-warning-reasons/` — `GET …/admin/approval-warning-reasons` (active + history, the key),
  `POST …/admin/approval-warning-reasons` (add — `{ label, when_to_use }`), `POST …/admin/approval-warning-reasons/:reasonId/replace` (`{ label,
  when_to_use }` — a conditional `UPDATE … SET replaced_at WHERE reason_id AND replaced_at IS NULL`, 0 rows ⇒ 409 `already_replaced`, + the new
  row with `replaces_reason_id`, ONE transaction); both POSTs need a fresh step-up; ⛔ no PUT, ⛔ no DELETE, ⛔ no route that touches a label or a
  note. Server validation: lengths, non-blank, the vocabulary deny-list (Trap 11). Audit per NW12 via `emitAuthAudit`. Admin: NEW
  `apps/admin/src/modules/approval-warning-reasons/` page (its own `i18n-en.ts`) under the Pariwar context — the active list (label, when to use,
  added by / on, *"replaces …"*), the history (each replaced reason with *"replaced by … on …"*), an Add form and a Replace action (both require a
  label and a "when to use" note; the screen says plainly that a reason can be replaced but ⛔ never edited or deleted); a nav link for
  `super_admin` only — the page is per-Pariwar, so the link combines two `RootLayout.tsx` precedents: it appears only inside a Pariwar
  context (10.11's `useParams({ strict: false })`, `:34`) AND only on the national grant (6.19c's `:27` —
  `session.data?.nationalGrants.includes('approval_warning_reason.manage')`, which works because `admin-session.handler.ts:57-68` unions
  global-scope bundles; advisory — the server's key check is the boundary). Register the API module where the others are
  (`apps/api/src/server.ts`; the module's own `index.ts`, the `drive-target/index.ts:35-38` shape). ⭐ Built so it can ship as its own pull request.
- **NW18 — a written note is ⛔ never replaced (BigDev 2026-10-04).** Across this story: an approval on a warned claim is ⛔ never revised (NW7); a
  late reason is a new row (NW14); a reason's "when to use" note is fixed with the reason, and a replacement brings its OWN note while the old stays
  (NW16, NW17); every table here is append-only by grant and trigger; ⛔ no route edits a note. ⭐ The ONE exception is legal erasure (Trap 14):
  `anonymizeMember` overwrites a member's note text with the erased marker — the house rule, ⛔ never a staff act. ⚠ R9 votes are 6.23b's
  (EA5): a panel member may change a vote before the panel finalizes (6.14), and every earlier vote and note is already kept as history — BigDev
  accepted that (2026-10-04).

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Given** this story is about to be built **Then** `2026-10-04-277` is in `.decision-log.md` (✅ committed `1b38be9e`) **and** ONE author-commit
**`-278`** records **NW1–NW18 and 6.23b's EA1–EA9**, stating: the readings of `-261` D1, `-262` FQ1 / FQ8 A, `-264` FQ12 and `-277` Q2 / Q3 it
builds (as readings); that it **SUPERSEDES three earlier readings**, each quoted — `-262`'s FQ2 reading (*"a new approve-only reason code, as
`concealment_flag_override` already is"* → a list entry in its own field), `-277`'s Q3 B reading (*"the District Admin re-records their approval
(a revision)"* → NW14's own record), and `-277`'s Q2 reading on notes (*"where a note is already required (R9 votes; 6.19c's approvals), only the
reason is new"* → ⛔ not so for the "no correction needed" approve); that `-264`'s not-cover delegated the reasons to the author and the author
RE-DELEGATES their wording to the Super Admin at runtime (Super-Admin-typed entries are runtime data, ⛔ not author-commits), departing from BOTH
halves of UX-DR43 (*"agreed upfront by Trustee Panel"*, *"not free text"*) and why that passes §0; BigDev's words for NW16–NW18; the new
permission key (NW17); fact 1's correction (acknowledged by `-277`); fact 3; NW11's supersession record; the split and its go-live coupling; and
that ⛔ no Trustee-ratified clause moves — staged in the scratchpad and inserted (verified additive-only and byte-equal —
[[project_decision_log_writes_user_inserted]]), committed `governance(6.23): …` **alone, first** **and** `epics.md` gains `### Story 6.23a`
(naming *"6.23a go-live coupling (1): Story 6.23b"*) and `### Story 6.23b` (each `> ⚠ Minted by…`, citing `-261` / `-262` / `-264` / `-277`)
after `### Story 6.19d`, **and** Story 6.20's AC3 (*"⛔ The system pre-selects nothing, highlights nothing and decides nothing"*) carries an
appended annotation — *"highlights nothing" superseded by `-261` D1 (built by 6.23a); pre-selects nothing and decides nothing stand* — never
rewritten **and** ⛔ no 6.20 Change Log row is rewritten **and** author-commit **`-279`** (A1–A12, amending `-278` after the second validate;
BigDev's two choices quoted) is in `.decision-log.md` above `-278`, committed `governance(6.23): …` alone, before any code **and** so is
author-commit **`-280`** (NW14 also records in `state_trustee_approved`, superseding `-279` A7's withdrawal reason).

### AC1 — The warnings, defined once (NW1–NW3)
**Given** a claim **Then** the pure classifier flags a `source = 'member'` version `post_death_version` iff the accepted date is known and
`!versionStandsAt(effectiveAt, acceptedDate)` (23:59 IST the day before ⇒ ⛔ no flag; 00:00 IST on the day ⇒ flagged; a `vacated` tombstone
on the day ⇒ flagged), and `recent_nominee_change` iff its IST date is ≥ the anchor's IST date − 90 days (90 days before ⇒ flagged; 91 ⇒ ⛔
not; after the anchor ⇒ flagged; the member's first declaration ⇒ flagged — `-277` Q1) **and** a `source = 'correction'` version is ⛔ never
flagged **and** each warning has its key **and** the anchor is the earliest unreleased claim's `created_at` (a released earlier claim moves
⛔ nothing; all released ⇒ this claim's own) **and** `readClaimApprovalWarnings` returns kinds, keys, `postDeath`, the anchor, the coverage and
the active reasons in ONE statement **and** on a seeded post-death claim with a current determination the date derivation and the
determination derivation flag the **same** versions and `assertPostDeathRefusalGrounded` passes; on a pre-death claim neither flags and the
grounding refuses **and** with a live determination made against an EARLIER review (a re-reviewed certificate, ⛔ not yet redetermined)
`postDeath` is `awaiting_determination` and ⛔ no `post_death_version` key is derived (`-279` A3) **and** the module reaches ⛔ neither
`claim/events.ts` nor `nominee-name-check.ts` through ANY chain of relative imports (a transitive source-scan test; it fails on a seeded
`import … from './nominee-lock.js'`) **and** a test pins `APPROVAL_WARNING_KINDS` to the two kinds with A6's failure message.

### AC2 — The warning reason, in its own field (NW5)
**Given** the decision request **Then** `warning_reason_code` is accepted only with `outcome: 'approved'` (400 otherwise) and, when present,
requires a non-blank rationale (400) **and** `VerifierDecisionReviseRequest` is unchanged **and** the verifier reason vocabulary, its compat
map, its exact-list tests and `t.reasonCodes` are byte-for-byte unchanged (⛔ no enum edit — Trap 7) **and** the generic reason constant is in
lockstep between domain and contracts.

### AC3 — The rule at the District Admin's approval, and its record (NW6, NW13)
**Given** a claim passing `assertClaimApprovable` and the contact check **When** the District Admin approves **Then**, in NW6's order: a
`warning_reason_code` with ⛔ no warning ⇒ **409 `…warning_reason_ungrounded`**; a warning + ⛔ no `warning_reason_code` ⇒ **409
`verifier_decision.warning_reason_required`** (`details.kinds`, `missing: 'reason'`); a replaced or unknown code ⇒ **409
`…warning_reason_unavailable`**; each with ⛔ nothing written; a warning + an active reason (the generic, or a Super Admin's) + a rationale ⇒
approved, the decision row keeping its REAL `reason_code`, **and** ONE `district_admin_approval` record row with that reason (code + id, or the
generic's code and a NULL id) and exactly the current keys, in the same transaction (a forced failure after it leaves neither) **and** ⛔ no
record row when there is no warning **and** every earlier refusal keeps its code and order **and** a deny (incl. `post_death_nominee_change`)
and an escalate on a warned claim are unchanged **and** two warnings need ONE reason and ONE note **and** the audit line carries
`approval_warning_kinds` and the code.

### AC4 — An approval on a warned claim is never revised (NW7, NW18)
**Given** an approved decision **Then** a revise — any reason, any note — is refused with 409 `verifier_decision.not_revisable`
(`details.reason: 'warning_approval_final'`), ⛔ nothing written, when the claim has ANY `district_admin_*` record row (incl. a late reason
whose warning has since gone — `-279` A8) **or** the claim shows a warning now (e.g. a late warning after an un-warned approval) **and** with
`details.reason: 'warnings_not_current'` while the live determination is absent or stale (`-279` A3) **and** every other revise (a claim with ⛔
no warning, ⛔ no record row and a current determination; a denied decision) is unchanged.

### AC5 — The console says it before the button does (NW8, NW9)
**Given** the verifier console **Then** the packet carries `approvalWarnings` — the kinds, `postDeath` (`awaiting_determination` with ⛔ no live
determination or a stale one), `uncoveredSinceApproval`, `reviseBlocked`, `viewerCanRecordLateReason` (false for a viewer without
`claim.approve` at the district, outside NW14's states, while awaiting, or when NW14 would answer `nothing_uncovered` for them — the
late-reason panel is then ⛔ not mounted), the `reasonOptions` (each with its label, "when to use", added by / on, or the built-in
markers) and `available: false` (Approve disabled, its own message) when the section could not be read **and** `VERIFIER_CONSOLE_MAX_READS` is
**19** with the written explanation and Trap 10's EXACT +1 test **and** with kinds present the strip shows the shared picker beside the
unchanged approval-reason dropdown — every option with its label, its "when to use" note and *"added by {name} on {date}"* / *"built in"*, ⛔
nothing pre-selected — the note is required, a line names each warning, the confirmation restates the warnings and the chosen warning reason;
with none, ⛔ no picker **and** with `reviseBlocked` non-null the revise affordance is replaced by a line saying why — its own words per reason (⛔ never a dead control) **and**
`decisionErrorMessage` maps every new 409 code (and both `not_revisable` reasons, `warning_approval_final` and `warnings_not_current`) to its own words — ⛔ never *"try again"*.

### AC6 — The timeline shows the warnings and the label (NW2–NW4, NW10)
**Given** the on-demand timeline **Then** each version carries `warnings` and `correction_label`, the response carries `warning_basis` **and** the
panel shows a warning line per flagged row — *"dated on or after the date of death on the accepted certificate"* / *"named or changed within
90 days before the first claim for this death was filed ({date})"* (words the developer's; ⛔ never "suspicious", "should be discarded" or a
microcopy vocabulary term) — and the FQ1 words **verbatim** per correction row (Trap 12) **and** ⛔ no accepted certificate (or an unreadable /
erased date) ⇒ ⛔ no `post_death_version` flag and a line that the date is not known yet **and** marks stay **unselected**, rows keep their
order **and** each warning is announced in words **and** the timeline audit gains `warning_count`.

### AC7 — The District Admin answers a late warning (NW14; `-277` Q3 B; fact 3)
**Given** a claim the District Admin approved, in `verifier_approved`, `reversed` or `state_trustee_approved` (`-280` — seeded: a late key covered only by an R9 voter's own reason) (the `reversed` path: District Admin approved → final vote denied →
appeal reversed → certificate re-reviewed and redetermined — fact 3), with a current certificate and determination, some of whose current keys
are ⛔ not covered **When** the District Admin picks an active reason and writes a note **Then** ONE `district_admin_late_reason` row covers
**all** current keys, with the reason, the note and the snapshotted display name, ⛔ no event and ⛔ no state change **and** the console's
`uncoveredSinceApproval` returns to 0 **and** a second late warning later adds a SECOND row (the first and its note untouched) **and** each
refusal answers its own 409 — ⛔ no District Admin approval (escalated-and-resolved; refused-then-reversed), a state outside NW14's four, a stale
determination (the certificate gate's own code), ⛔ no live determination (`determination_required` — e.g. just after an applied correction), an
inactive reason, nothing uncovered (judged for the recorder: a late key covered ONLY by another actor's late reason is ⛔ not
"nothing uncovered" for a third person; a key covered by the recorder's OWN earlier `district_admin_*` row is — `-279` A1) **and** after a Pariwar Admin records the only late
reason, the District Admin's console STILL mounts the panel (`viewerCanRecordLateReason` true, `uncoveredSinceApproval` 0,
`lateKeysUncoveredForViewer` > 0, with its words) and their NW14 succeeds — and a missing note or reason is a 400 **and** a non-district viewer, a cross-Pariwar claim and a system
actor are refused **and** the audit lines carry codes and counts only.

### AC8 — The record's policy, PII and erasure (NW13; Traps 14, 17)
**Then** migration 0143 creates `claim_warning_approvals` with every CHECK, FK, grant, trigger and RLS + FORCE of NW13, and the policy-regression
spec proves: cross-Pariwar read / insert refused; the composite FK refuses another Pariwar's `reason_id`; ⛔ no direct DELETE (a cascade from
`claims` still passes, through both the `claim_case_id` and the `verifier_decision_id` FK); the TRUNCATE trigger binding (Trap 17(c)); IN
SCOPE, the note's UPDATE succeeds (1 row — the per-command UPDATE policy exists); an UPDATE of any column but the note refused (via the jsonb compare); the step
⇔ note CHECK; the step ⇔ `verifier_decision_id` CHECK; the generic ⇔ NULL `reason_id` CHECK; the `cardinality >= 1` CHECK; the DB ↔ TS `step`
lockstep **and** `anonymizeMember` sentinels the note where present (a NULL note stays NULL — the coherence CHECK), with the RTBF pin moved
**17 → 18 tables / 20 → 21 statements** and its title **and** the field class is registered in `context.ts` and the anonymizer.

### AC9 — Nothing else moves
**Then** `assertClaimApprovable` and every later approver (`resolveEscalation`, `voteOnFrozenClaim`, `castR9Vote` / `finalizeR9Outcome`,
6.19c's writers) are untouched — they are 6.23b's; the determination writer, the effective accessor's SQL and token, the name check and
`member_nominees` are untouched; ⛔ no enum value anywhere (Trap 7); ⛔ no new claim event (`CLAIM_EVENT_TYPES` stays **35**); the permission
catalog moves by **exactly ONE key** (**51 / 65** — NW17) and ⛔ no new role and ⛔ no `roles.ts` const; the new routes are NW14's (human-actor
gate entry updated; `COVERAGE_FLOOR` unchanged at 16 — ⛔ no new `claims.*.routes.ts` file) and NW17's (in their own module, outside the gate's
scan); ⛔ no member-app change except NW11's test TITLE in `apps/mobile/tests/unit/nominee-history-copy.test.ts`; ⛔ no i18n-locale change;
`openapi/v1.yaml` byte-identical (`contracts:check-openapi-determinism` green).

### AC10 — The fences
**Then** the no-comparison fence lists `packages/domain/src/claim/approval-warnings.ts` and `…/approval-warnings-persist.ts` (6.21a T9's
precedent: every NEW domain module on the approval path) and its exact count goes **34 → 36** (reason in the trailing comment); ⛔ none of
`FORBIDDEN_PATTERNS` trips **and** the fence's "never decrypt" test (6.20 / 6.21a's, fence test `:279-322`) covers both new files —
invariant 7 made mechanical **and** `pnpm microcopy:test && pnpm microcopy:check` exit 0 **and** the access-wrapper gate passes with NW14's
mutation + audit through `withCompensatingAudit` / `emitAuthAudit` (`pnpm access-wrapper:test && …:check`) **and** `pnpm friction:test &&
pnpm friction:check` exits 0 — the mobile test-title edit (NW11) is an `apps/mobile/` path, so `friction-budget.md` gains a **`Story 6.23a
disposition (declaration affirmed — ⛔ no new row: a test title only, ⛔ no member-facing change)`** block (`scripts/friction-budget/lib.ts:453`,
`evaluateDeclaration`; `ci-local.sh:68`, `ci.yml`'s `friction-budget` job).

### AC11 — The superseded and ratified texts (NW11)
**Then** every site NW11 lists — incl. its three late-found `-261` D1 sites (the timeline handler's header, the API spec's `:7`, the panel
test's `:6`) — is amended in place to cite `-261` D1 / `-261` C1, keeping the record of what it said **and** the admin panel
test's *"⛔ nothing says after death"* becomes: a pre-death version shows ⛔ no warning; a post-death version shows the D1 line; ⛔ nothing says
*"suspicious"* or *"should be discarded"*; ⛔ no radio is checked **and** the API AC3 test keeps forbidding names, mobiles, `highlight` and
`suggested`, drops `post_death` with a comment citing `-261` D1, and positively asserts the new fields.

### AC12 — The reason list and the Super Admin's screen (NW16, NW17, NW18)
**Given** a FRESH Pariwar (Trap 18) **Then** its active list is exactly the built-in generic **and** the Super Admin adds a reason (label +
"when to use") ⇒ a new row with a server-generated code, their snapshotted name and the time, active at once **and** replaces it ⇒ the old row
gains `replaced_at` (once), a new row with its own label and note carries `replaces_reason_id`; the old row, its note and every approval that
chose it are unchanged; a second replace of the same row ⇒ 409 `already_replaced`; two Super Admins replacing it at once (two connections) ⇒
exactly one wins **and** ⛔ no route can edit or delete a reason — the policy spec proves `twt_app` cannot DELETE, cannot UPDATE any column but
`replaced_at`, cannot set `replaced_at` twice or back to NULL, and cannot COMMIT a `replaced_at` with ⛔ no replacement row (the deferred
constraint trigger), and cannot COMMIT a new row whose `replaces_reason_id` target is still active, nor one pointing at another Pariwar's
reason (the composite self-FK — `-279` A9); IN SCOPE, `SELECT … FOR SHARE` on an active reason returns it (the UPDATE policy exists — Trap
16); the TRUNCATE trigger binding (Trap 17(c)); the generic can ⛔ never be replaced **and** only `super_admin` holds
`approval_warning_reason.manage`; a fresh step-up is required; a cross-Pariwar write is refused **and** a label or note carrying a microcopy
vocabulary term, blank, or too long ⇒ 400 **and** the screen shows the active list, the history and the "can be replaced, ⛔ never edited or
deleted" line; the nav link shows for `super_admin` only.

### AC13 — The proof
**Then** the suites in *Testing* exist and each new test was shown to fail before its code; live-DB specs carry `{ timeout: 20000 }`, own-commit,
assert **membership**, ⛔ not counts ([[project_live_db_test_gotchas]]); the red set of Trap 6 is read per Trap 6; `pnpm -w typecheck`, lint, the
domain / contracts / api / admin / mobile suites and `ci:local` are run (a known flake is named, ⛔ never silently re-run —
[[project_known_livedb_test_failures]]) **and** `deferred-work.md` carries Task 10's records **and** `friction-budget.md` carries the AC10
disposition block.

## Tasks / Subtasks

- [x] **Task 0 — Governance first (AC0).** ⛔ No code before 0.6 lands.
  - [x] 0.1 `git diff --name-only 2059482b..HEAD -- packages apps scripts docs`; re-read anything cited here that moved. `git log 2059482b..HEAD -- .decision-log.md` — read any entry after `-278` for `6-23`, `warning`, `reason`, `coverage`. ⚠ If 6-26 or 6-27 landed first, re-plan NW1 before coding. Read the live permission catalog numbers (50 / 64 at `2059482b`).
  - [x] 0.2 ✅ **`-278`** (author-commit (BigDev); NW1–NW18 + 6.23b's EA1–EA9 and everything AC0 lists — incl. the three supersessions and the re-delegation) — inserted above `-277` 2026-10-04 (60 lines added, 0 removed, byte-equal to the staged text), committed **alone** as `a125a59d`. BigDev agreed the two validate-driven changes first (*"yes to change 1, option A for change 2"*).
  - [x] 0.3 `epics.md`: `### Story 6.23a` (naming *"6.23a go-live coupling (1): Story 6.23b"*) and `### Story 6.23b` (Minted-by headers, story statements, ACs in brief, pointers to the two files) after `### Story 6.19d`; the appended annotation on Story 6.20's AC3. ⛔ Nothing rewritten.
  - [x] 0.4 ✅ The Q1–Q3 routing note — drafted, sent and **RULED** (`-277`, 2026-10-04); its ruling block is filled. ⭐ The reason list needs ⛔ no note (§0, 2026-10-04).
  - [x] 0.5 ✅ **`-279`** (author-commit (BigDev); A1–A12, A7 withdrawn — the second validate's decision changes; BigDev's *"All"*, *"Not the final approver"*, *"Correction queue, in 6.23b"*, and — for the details added after those answers — *"Agree to all six"*) — inserted above `-278` 2026-10-04 (35 lines added, 0 removed, byte-equal to the staged text), committed **alone** as `e2bcd2c3`, after a fresh-context re-validate of its own text.
  - [x] 0.6 ✅ **`-280`** (author-commit (BigDev; *"Insert, then round 4"*)) — a third fresh-context round found an R9 approval from `state_trustee_approved` could stall under `-279` A1 ⇒ NW14 also records there, superseding A7's withdrawal reason — inserted above `-279` 2026-10-04 (19 lines added, 0 removed, byte-equal), committed **alone** as `66ad3f75`.
- [x] **Task 1 — Migrations (AC8, AC12).** `0142_approval-warning-reasons.sql` (NW16) and `0143_claim-warning-approvals.sql` (NW13) — the 0119 / 0122 / 0139 headers as models (what, why, every CHECK, the grants, the triggers incl. Trap 17, RLS order); `meta/_journal.json` idx 142 / 143 (⛔ never renumber the reverted-0140 gap), `when` 1792986000000 / 1793072400000. Per-command RLS policies
(SELECT / INSERT / UPDATE — NW13, NW16), the composite self-FK and both deferred checks (NW16), `verifier_decision_id … ON DELETE CASCADE`. Drizzle schemas `schema/approval_warning_reasons.ts` and `schema/claim_warning_approvals.ts` (TS mirrors of the CHECK lists in LOCKSTEP); RLS files `policies/approval-warning-reasons-rls.ts` and `policies/claim-warning-approvals-rls.ts`; register all in their indexes. ⛔ Never edit 0001–0141.
- [x] **Task 2 — Domain: the warnings (AC1).** NEW `claim/approval-warnings.ts` per NW1–NW4 (kinds, keys, `RECENT_NOMINEE_CHANGE_WINDOW_DAYS`, the pure classifier, `isRecentNomineeChange`, `readClaimApprovalWarnings` — ONE raw-SQL statement: the anchor per Trap 3, the member-source versions' ids / `effective_at`, the live determination's `discarded` member-source ids, the live verifier decision's id + outcome, the claim's `district_admin_*` record keys, the active reasons, and whether the live determination's review is the current accepted one (NW2 — stale ⇒ `awaiting_determination`); ⛔ no ciphertext selected — `uncoveredKeys`, `assertApprovalReasonCoversWarnings`); the anchor's SQL COPIED from `isNomineeDeclarationLocked`, ⛔ never imported (Trap 3); the typed errors (the `claim/errors.ts` convention); export from `claim/index.ts`; the TRANSITIVE import-discipline source-scan test and the `APPROVAL_WARNING_KINDS` pin (NW1). Amend `versionStandsAt`'s doc (NW11).
- [x] **Task 3 — Domain: the rule, its record, and the final words (AC3, AC4).** `verifier-decision-persist.ts`: in `adjudicateClaim` (approve, after `assertClaimContactRecorded`) read the warnings, lock + validate the reason (Trap 16), assert in NW6's order, and on a warned approval insert the `district_admin_approval` row after the decision row (its id is the FK) in the same tx; `approvalWarningKinds` on the result; `AdjudicateClaimInput` gains `warningReasonCode`; in `reviseDecision` NW7 after the existing guards (any `district_admin_*` row; a warning now; `awaiting_determination`); `DecisionNotRevisableReason` += `'warning_approval_final'`, `'warnings_not_current'`; EXPORT `acquireDecisionLock`, `lockClaim`, `getLiveDecision` for Task 4. ⛔ `claim/verifier-decision.ts` is untouched (Trap 7).
- [x] **Task 4 — Domain: the late reason (AC7).** NEW `claim/approval-warnings-persist.ts` — `recordLateWarningReason` per NW14 (lock order as `adjudicateClaim`, through Task 3's exported helpers; the four states (`state_trustee_approved` by `-280`); `nothing_uncovered` judged for the recorder over their `district_admin_*` rows (`-279` A1); `assertDeathCertificateAcceptedForApproval` — amend its *"Called ONLY by"* doc-block — and the `awaiting_determination` refusal before the read; the typed refusal `LateWarningReasonRefusedError` with a reason union and an exhaustive `never` switch at the route).
- [x] **Task 5 — Contracts (AC2, AC5–AC7, AC12).** `verification-decision.ts`: `warning_reason_code` on `VerifierDecisionRequest` ONLY, with its `superRefine` rules (⛔ no enum edit); NEW `LateWarningReasonRequest` / `…Response`; the generic-reason constant + an `ApprovalWarningReasonOption` DTO (shared by 6.23b). `verifier-console.ts`: `ApprovalWarningsStatus` on the packet. `nominee-declaration.ts`: `warnings`, `correction_label`, `warning_basis`; the header (NW11) and the `:207-215` C1 text. NEW `approval-warning-reasons.ts` (the list / add / replace DTOs, `.strict()`). ⛔ Never import `@twt/domain` — the kind list, the `step` values and the generic are re-declared with lockstep tests.
- [x] **Task 6 — API (AC3–AC7, NW12).** `claims.verification-decision.handlers.ts`: pass `warning_reason_code`; map the new errors (stable words that say the claim is ⛔ not refused), the `warning_approval_final` AND `warnings_not_current` messages (`details.reason` — today `not_revisable` falls to a generic message), the audit fields, and the NW14 handler (`emitAuthAudit` / `withCompensatingAudit`; encrypt the note under the new field class first). `claims.verification-decision.routes.ts`: the NW14 route. `claims.verifier-console.handlers.ts`: `assembleApprovalWarnings` (fail-soft, ONE `reads.bump()`, run LAST or in a SAVEPOINT; `viewerCanRecordLateReason` in the `viewer.canReview` shape), the packet field, the ceiling 18 → 19 with its ledger line. `claims.nominee-declaration.handlers.ts` `getTimeline`: `readClaimApprovalWarnings` (for the anchor), the applied corrections' displays (one read; ⛔ no decrypt), the pure classifier with the already-decrypted date, the new fields, `warning_count`. `apps/api/src/context.ts`: the field class. `apps/api/src/audit/audit-sink.ts`: the new audit types. `scripts/claim-adjudication-human-actor-invariant/check.ts`: the entry's `expectedMethods`.
- [x] **Task 7 — Admin: the District Admin's surfaces (AC5–AC7, AC11).** NEW shared `apps/admin/src/modules/claim-verification/ApprovalWarningReasonPicker.tsx` (NW9 — label, "when to use", added by / on; ⛔ nothing pre-selected; announced selection). `i18n-en.ts`: the warning lines, the date-not-known line, the FQ1 template, the strip's line, the final-approval line, the late-reason panel's words, the refusal messages; the header (NW11). `VerificationDecisionStrip.tsx`: with warnings, the picker beside the unchanged dropdown, `rationaleRequired`, the confirmation; with `reviseBlocked`, the revise affordance replaced by its line (one per reason). NEW `LateWarningReasonPanel.tsx` (the picker + a required note; announced outcome; say why when unavailable). `routes/VerifierConsoleRoute.tsx`: pass the section; `canApprove` also needs `approvalWarnings.available`; mount the panel when `viewerCanRecordLateReason` (ALONE — NW14); `decisionErrorMessage` maps BOTH `not_revisable` reasons (today it falls to *"Please try again"*, `i18n-en.ts:121`), plus every other new 409 code; client + hook in `apps/admin/src/api/{client,hooks}.ts`. `NomineeDeclarationPanel.tsx`: the warning lines, the label, the date-not-known line, the header and `:642-646` (NW11). The five hand-built packet fixtures of Trap 9. ⚠ The strip's per-claim `key` stays.
- [x] **Task 8 — Erasure (AC8).** `member/anonymize.ts`: the record's note (sentinel where present), the field class; `packages/domain/tests/member/rtbf-anonymize.test.ts`: 17 → 18 tables, 20 → 21 statements, the title; the live RTBF spec proves the note is gone. The reason list is ⛔ not erased (staff policy text — Trap 14).
- [x] **Task 9 — Fences and superseded tests (AC10, AC11).** `FENCED_FILES` += `approval-warnings.ts` and `approval-warnings-persist.ts`, 34 → 36 (*"Story 6.23a FROM 34 (+2)"*); extend the fence's "never decrypt" test to both. Amend the two tests of fact 5, NW11's three late-found D1 sites and the C1 titles / comments (NW11). `friction-budget.md`: the AC10 disposition block (the mobile test title). Run the microcopy, access-wrapper and friction-budget gates.
- [x] **Task 10 — Tests and records (AC1–AC13).** See *Testing*; then the approve-path suites (Trap 6). `deferred-work.md` ("Recorded during Story 6.23a"): the raw `verifier_reason_code` the Pariwar Admin sees on `PendingCaseCard.tsx:216` (6.23b reads it next); the FQ1 words on the 6-22-gated release case; ⚠ a concealment-flagged claim approvable with ⛔ no reason (fact 1; trigger: a Panel instruction); ⚠ `claim_verifier_decisions.rationale_ciphertext` ⛔ not in the anonymizer (Trap 14; trigger: the next RTBF pass); ⚠ the Super Admin's words are checked only against the vocabulary deny-list, ⛔ not the full microcopy gate (Trap 11; trigger: a microcopy runtime library). `sprint-status.yaml`: ⛔ no other row moves.
- [x] **Task 11 — The reason list and the Super Admin's screen (AC12).** Domain `claim/approval-warning-reasons.ts` (NW16 reads + `lockActiveApprovalWarningReason`; NW17's add / replace writers — the conditional UPDATE + insert in ONE tx, a 23505 on `replaces_reason_id` ⇒ `already_replaced`, a 23505 on `code` ⇒ a SAVEPOINT retry with a fresh code); the vocabulary deny-list + its lockstep test against `microcopy.yaml`; the key in `rbac/permissions.ts` + `permissions.test.ts` (51 / 65) — ⛔ no `roles.ts` const; the API module (`routes`, `handlers`, `index.ts`; registered in `apps/api/src/server.ts`); the admin module, its `/p/$pariwarId/…` route in `router.tsx`, the nav link in `RootLayout.tsx` (NW17's two gates), client + hooks. ⭐ May ship as its own pull request after Task 1.

### Review Findings

Code review (`bmad-code-review`, 2026-10-05) — three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) against the uncommitted Tasks 1–11 diff, triaged against this spec. 21 raw findings → 17 after dedup → 11 patch, 1 defer, 5 dismissed (verified against this file's own Traps/AC or `deferred-work.md` and found to be either already-recorded or by-design, not oversights).

- [x] [Review][Patch] `insertReasonRow`'s code-collision retry re-throws the raw Postgres `23505` on its 5th attempt instead of a typed `ApprovalWarningReasonWriteRefusedError` [packages/domain/src/claim/approval-warning-reasons.ts:275-279] — fixed: a new `'code_exhausted'` refusal (409), wired through `errors.ts`, the API's exhaustive switch, and the admin i18n map.
- [x] [Review][Patch] `claim_warning_approvals.claim_case_id` / `.verifier_decision_id` are plain single-column FKs, unlike the sibling `reason_fk` which is composite `(pariwar_id, …)` specifically because FK checks bypass RLS — nothing stops a cross-tenant row [packages/domain/migrations/0143_claim-warning-approvals.sql:46-48] — fixed (BigDev: *"add the composite FKs"*): both are now composite `(pariwar_id, …)`, backed by two NEW unique constraints added in 0143 on the pre-existing `claims` (`claims_pariwar_claim_case_uq`) and `claim_verifier_decisions` (`claim_verifier_decisions_pariwar_decision_uq`) tables — ⛔ 0001–0141 themselves untouched. Migrated + verified live; one RLS-regression test's hardcoded old constraint name updated.
- [x] [Review][Patch] `assembleApprovalWarnings` fails closed on `available` when the warnings read throws, but leaves `reviseBlocked: null` ("not blocked") on the same catch path — the revise control stays live and will 409 on submit instead of being shown as blocked upfront [apps/api/src/modules/claims/claims.verifier-console.handlers.ts:478-493; apps/admin/src/routes/VerifierConsoleRoute.tsx:450-453] — fixed: a new `'unavailable'` `reviseBlocked` value (console-only preview state, no matching `DecisionNotRevisableReason`), threaded through the contract enum, the strip's prop type, and i18n.
- [x] [Review][Patch] `getTimeline` calls `readClaimApprovalWarnings` with no try/catch, so a transient failure 500s the whole nominee-declaration-history endpoint, unlike the identical call in `claims.verifier-console.handlers.ts` which fails soft [apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts:249] — fixed: `.catch()` falls back to `{ anchorFiledAt: claimRow.createdAt }`, logged, mirroring the sibling's fail-soft pattern.
- [x] [Review][Patch] `ApprovalWarningReasonsPage`'s cancel / switch-target handlers never call `add.reset()` / `replace.reset()`, so a previous attempt's error or success banner can render under the wrong form [apps/admin/src/modules/approval-warning-reasons/ApprovalWarningReasonsPage.tsx:128-230] — fixed: a `startReplacing` helper resets both mutations before every transition.
- [x] [Review][Patch] `usePostLateWarningReason`'s `onSuccess` invalidates the verifier-console packet query; when the recorder's own reason happens to cover every remaining late key, the refetch flips `viewerCanRecordLateReason` to `false` and unmounts `LateWarningReasonPanel` — taking `t.late.recorded` with it, possibly before the approver reads it. No test exercises the live submit→invalidate→refetch sequence [apps/admin/src/api/hooks.ts (`usePostLateWarningReason`); apps/admin/src/routes/VerifierConsoleRoute.tsx] — fixed: the panel now also stays mounted while `lateReason.isSuccess`, independent of the server-recomputed flag; still dropped on a claim change via the existing `resetLateReason` effect.
- [x] [Review][Patch] `i18n-en.ts`'s `errors` record has no entry for the `missing_display` refusal the API can return — falls back to the generic "could not be saved" text [apps/admin/src/modules/approval-warning-reasons/i18n-en.ts:40-43] — fixed: entry added (plus `code_exhausted`, introduced by this same pass).
- [x] [Review][Patch] `deniedVocabularyTerm` builds `new RegExp(\`\\b${term}\\b\`, 'i')` with the term interpolated unescaped — a future `APPROVAL_WARNING_REASON_DENIED_TERMS` entry containing a regex metacharacter throws or silently mismatches [packages/domain/src/claim/approval-warning-reasons.ts:202-205] — fixed: a local `escapeRegExp` (mirrors the existing one in `packages/contracts/src/public-pages/gate.ts` — not extracted into a shared util for one more call site).
- [x] [Review][Patch] The rejected-decision audit call only attaches `{kinds, warningReasonCode}` when the error is `ApprovalWarningReasonRequiredError` — a `WarningReasonUnavailableError` rejection (reason replaced mid-flight) is audited with no `warningReasonCode`, though `body.warning_reason_code` is available at that point [apps/api/src/modules/claims/claims.verification-decision.handlers.ts:316-321] — fixed: the audit call now also attaches `{kinds: [], warningReasonCode}` for that error.
- [x] [Review][Patch] `getTimeline` runs the full multi-CTE `readClaimApprovalWarnings` statement only to read `anchorFiledAt`, discarding the kinds/keys/coverage/reasonOptions it also computes, since the handler separately re-derives per-version warnings via `classifyNomineeVersion` [apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts:249] — fixed (2026-10-05, re-review): new `getClaimWarningAnchor` in `approval-warnings.ts` — a THIRD copy of Trap 3's anchor predicate (same leaf, no new import edge; the transitive import-discipline source-scan test still passes), used by `getTimeline` instead of the full read.
- [x] [Review][Patch] `approval-warning-reasons/handlers.ts` retypes the same `{reasonId, code, labelEn, whenToUse, createdByDisplay, createdAt}` row shape inline in both `write()`'s `run` parameter and `rowDto`'s parameter instead of reusing one domain type [apps/api/src/modules/approval-warning-reasons/handlers.ts] — fixed: both now use `claim.ApprovalWarningReasonRow`, re-exported from `claim/approval-warning-reasons.ts`.
- [x] [Review][Defer] Both new append-only triggers' exception message says "...is never deleted; it can only be replaced" even on a `TRUNCATE` (only `UPDATE`/`DELETE` are special-cased) — correctly blocked either way; the wording mirrors `events_log_reject_mutation` (migration 0001), a codebase-wide convention predating this story [packages/domain/migrations/0142_approval-warning-reasons.sql:91; 0143_claim-warning-approvals.sql:88] — deferred, pre-existing

Verified after fixes: all four affected packages typecheck clean (`@twt/domain`, `@twt/contracts`, `@twt/api`, `@twt/admin`); the full `packages/domain` suite (322 files / 4458 tests), the touched `apps/api` integration specs (52 tests), the touched `apps/admin` component tests (146 tests), and the touched `packages/contracts` tests (38 tests) all pass against the re-migrated local dev DB. One pre-existing RLS-regression test hardcoded the old FK constraint name and was updated to match.

Dismissed (5, verified false-positive or already-handled, not written as action items):
- RTBF: `claim_verifier_decisions.rationale_ciphertext` not scrubbed for a warned approval — already openly recorded in `deferred-work.md` ("Recorded during Story 6.23a", Trap 14; the note is pre-existing from Story 6.11, not new in this diff).
- `isRecentNomineeChange` has no upper bound on the 90-day window — intentionally one-sided; named and ratified as this story's own **Trap 4** ("⛔ no upper bound on the 90-day window").
- `missing_display` refused with HTTP 409 — consistent with the codebase-wide `AdminDisplayNameMissingError` convention (409, fail-closed) used at every other "actor has no display name" site, not inconsistent with it.
- The domain-layer backstops (`assertApprovalReasonCoversWarnings`'s `note.trim() === ''` against ciphertext; `recordLateWarningReason`'s pre-lock blank-note check) only catch `null`, not blank-but-encrypted text — both are explicitly commented as a secondary backstop ("the contract's 400 is the real enforcement"), a documented, accepted design choice rather than a silent gap. Worth a line in `deferred-work.md` for visibility, but not a functional bug on any current call path.

### Review Findings — Round 2 (re-review, 2026-10-05)

A fresh 3-layer re-review of the diff after Round 1's 11 patches, requested to confirm they introduced nothing new. Found 5 genuinely new issues — 3 were gaps in Round 1's OWN fixes — all fixed; 1 pre-existing low-confidence finding verified as correct behavior (dismissed); 6 pre-existing, lower-severity findings from the ORIGINAL diff (not introduced by either review round) logged below as open action items, not yet applied pending a decision.

- [x] [Review][Patch] `VerificationDecisionStrip`'s `chooseOutcome` never reset `warningReasonCode` on an outcome switch — violated this story's own NW9 ("⛔ never pre-selected"): approve → deny → approve re-showed the earlier pick. Fixed: `chooseOutcome` now also clears it. [apps/admin/src/modules/claim-verification/VerificationDecisionStrip.tsx]
- [x] [Review][Patch] `ApprovalWarningReasonsPage`'s Add form never cleared `label`/`whenToUse` after a successful add, inviting an accidental duplicate. Fixed: the Add form now remounts (a bumped key) on success, mirroring the Replace form's own `key={replacing.code}` pattern. [apps/admin/src/modules/approval-warning-reasons/ApprovalWarningReasonsPage.tsx]
- [x] [Review][Patch] Round 1's own late-reason-panel fix had a gap: the mount condition (widened to also cover `lateReason.isSuccess`) could still unmount mid-submit if a second late-reason attempt started right after the first success flipped the server flag false — `isSuccess` itself flips to `false` the instant a new `mutate` begins, before `isPending` is visible. Fixed: the condition now reads `lateReason.status !== 'idle'`. [apps/admin/src/routes/VerifierConsoleRoute.tsx]
- [x] [Review][Patch] Same fix, a second gap: the widened mount condition could flash the PREVIOUS claim's stale `isSuccess`/`isPending` for one frame when switching claims, before the claim-keyed `resetLateReason` effect lands. Fixed WITHOUT `useLayoutEffect` (tried first; its synchronous flush changed effect-ordering for this large shared route component and broke 3 unrelated certificate-section tests — reverted) — instead, a ref-based "reset during render" check (`lateReasonIsStale`) that resolves in the SAME render as the claim change, with no intermediate frame to flash. [apps/admin/src/routes/VerifierConsoleRoute.tsx]
- [x] [Review][Patch] Round 1's new composite `claim_case_id`/`verifier_decision_id` FKs (its headline fix) had no dedicated regression test — only the sibling `reason_fk`'s cross-tenant case was tested. Fixed: two new test cases added, mirroring the existing one. [packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts]
- [x] [Review][Process] The sprint-status ledger's `2026-10-05b` entry recorded the `getTimeline` efficiency finding as "left unchecked, needs a design call" — true at the moment it was written, but the SAME re-review session then fixed it (`getClaimWarningAnchor`) without a follow-up ledger entry, leaving the ledger stale against the story file's own (correct) `[x]`. Fixed: see the new `2026-10-05c` entry in `sprint-status.yaml`.
- Dismissed: `reviseDecision`'s NW7 check order (`warning_approval_final` checked before `warnings_not_current`) can report `warning_approval_final` for a claim that ALSO has a stale/absent determination — verified NOT a bug: `recent_nominee_change` (which drives `warning_approval_final`) is determination-independent, so when it is genuinely present the claim truly IS final for that reason; `warnings_not_current` only matters when no determination-independent warning applies, in which case this branch is correctly unreachable.

Of the 6 pre-existing findings above, 5 were applied (BigDev: *"apply all 6"*, then *"leave as an action item"* once the 6th turned out to need its own design call):

- [x] [Review][Patch] `recordLateWarningReason`'s blank-display-name guard threw a raw untyped `Error`, unlike the sibling `assertWriter` guard in `approval-warning-reasons.ts` for the identical condition, which throws a typed, API-mapped refusal. Fixed: a new `'missing_display'` member on `LateWarningReasonRefusal`, mapped to a 409 in `translateLateWarningReasonError`'s exhaustive switch. Both remain unreachable via the only wired caller (the API resolves display name first, per `[[project_admin_display_name_attribution]]`) — a defense-in-depth consistency fix, not a live-bug fix. [packages/domain/src/claim/approval-warnings-persist.ts; packages/domain/src/claim/errors.ts; apps/api/src/modules/claims/claims.verification-decision.handlers.ts]
- [x] [Review][Patch] `i18n-en.ts`'s `kindLine` / `reviseBlocked` maps were typed `Record<string, string>` (cast), not keyed by the actual union. Fixed: retyped with `satisfies Record<ApprovalWarningKind, string>` / `satisfies Record<ReviseBlockedReason, string>` — a future kind or revise-blocked value added without a matching copy entry now fails typecheck. [apps/admin/src/modules/claim-verification/i18n-en.ts]
- [x] [Review][Patch] `useReplaceApprovalWarningReason`'s doc comment claimed it refetches "on success AND on a 409" but the code's `onSettled` also refetches on an unrelated network/500 error. Fixed: comment corrected to describe the actual (harmless, intentionally kept) broader behavior. [apps/admin/src/api/hooks.ts]
- [x] [Review][Patch] `assertApprovalWarningReasonText` checked length with JS `.length` (UTF-16 code units) against the DB's Postgres `char_length()` (codepoints) — disagreeing for astral characters (emoji). Fixed: `[...value].length` (codepoint count) matches the DB exactly. [packages/domain/src/claim/approval-warning-reasons.ts]
- [x] [Review][Patch] `approval-warning-reasons/handlers.ts`'s `add`/`replace` each called `ctxOf(request)` for their own closure AND `write()` called it again independently. Fixed: `write()` now takes the caller's already-resolved `{ actorId, pariwarId }` instead of re-deriving its own. [apps/api/src/modules/approval-warning-reasons/handlers.ts]
- [x] [Review][Action Item] `postLateWarningReason` encrypts the note (a Tier-1 KMS call) BEFORE any of `recordLateWarningReason`'s business-rule checks run (claim exists, live decision is an approval, recordable state, certificate/determination current, reason active) — every request headed for a clean 409 still pays for the encryption, and a transient KMS hiccup turns a clean 409 into an unrelated 500. **Left open on purpose** (BigDev: *"leave as an action item"*) — a real fix needs a design call between two options, neither mechanical: (a) a callback-injection signature change to `recordLateWarningReason` (accept `encryptNote: () => Promise<string>` instead of `noteCiphertext: string`, called only after its internal checks pass), or (b) duplicating the domain's cheap pre-checks at the API layer (risks drift between two copies of the same rule). [apps/api/src/modules/claims/claims.verification-decision.handlers.ts] — ⭐ **RESOLVED 2026-10-05: ⛔ no code change, DEFERRED** (BigDev chose *"Keep it, defer"* over (a) and (b)). Traced first: the ordering is the SAME FILE's convention, ⛔ not this handler's own — `postDecision` (`encryptOptionalVerifierRationale`, then `adjudicateClaim`'s 409s) and the revise handler do exactly the same, so fixing this one handler alone would leave it the odd one out. (a) has a precedent (`claim-contact-persist.ts`'s `crypto` port), but it would hold the decision advisory lock AND the claim row's `FOR UPDATE` lock across a KMS round trip, which costs every concurrent approve / revise / late reason on that claim more than the current cost does: one wasted encrypt on a rare District Admin action, plus a retryable 500 if KMS fails. Recorded in `deferred-work.md` ("Recorded during Story 6.23a") as a convention-wide item, with a trigger that can actually fire.

Verified after these 5 fixes: `@twt/domain`, `@twt/api`, `@twt/admin` typecheck clean; `packages/domain`'s touched suites (97 tests), `apps/api`'s touched suites (52 tests), and the FULL `apps/admin` suite (57 files / 844 tests) all pass.

Verified after Round 2's fixes: `@twt/domain` and `@twt/admin` typecheck clean; the full `apps/admin` suite (57 files / 844 tests) and the updated RLS regression spec (14 tests, incl. the 2 new composite-FK cases) pass.

## Dev Notes

### What already EXISTS — traced at `2059482b` (rebuild ⛔ none of it)

| Thing | Where | Use |
|---|---|---|
| The approval gate | `assertClaimApprovable` (`claim/nominee-name-check.ts:383-402`; six callers — `adjudicateClaim`, `voteOnFrozenClaim`, `finalizeR9Outcome`, `correction-closure.ts:1347/1357/1507`) | untouched here — 6.23b adds the wait |
| P1, the District Admin's verdict | `adjudicateClaim` (`claim/verifier-decision-persist.ts:315-419`): compat `:319`, live-decision guard `:330`, `-239` grounding `:336-338`, gate + contact `:374-386` | NW6 (after `:385`) |
| The `-239` ground | `assertPostDeathRefusalGrounded` (`:124-138`) | NW2's twin; AC1's agreement test |
| Revise | `reviseDecision` (`:497`); `DecisionNotRevisableReason` (`:82`); `VERIFIER_DECISION_REVISABLE_STATES` (`:51`); carry-forward of the old rationale | NW7; fact 3 |
| The verifier lock | `verifierDecisionAdvisoryLockKey` / `acquireDecisionLock` / `lockClaim` (`:191-216`) | NW14's lock order |
| The verifier vocabulary | `VERIFIER_REASON_CODES` / `REASON_CODE_OUTCOME_COMPAT` (`claim/verifier-decision.ts:38-72`); contracts `applyDecisionRefinements` (`verification-decision.ts:81-111`), shared by both requests | NW5 (vocabulary untouched; the request gains a field) |
| The freeze is never a resting state | `TRUSTEE_VOTABLE_STATES` doc-block (`state-trustee-decision-persist.ts:82-88`); appeals never write `claim_verifier_decisions` (`appeal-eligibility.ts` only reads it) | fact 3 |
| The cutoff and the calendar | `versionStandsAt` (`claim/nominee-effective.ts:112-114`); `istDateOf`, `addCalendarDays`, `istMidnightAt` (`cycle-calendar/holiday-resolver.ts:178, 187, 206`) | NW2, NW3 |
| The versions | `member_nominee_versions` (`kind`, `source`, `effective_at`, `corrects_version_id`); `listNomineeDeclarationVersions` (`nominee/declaration-history.ts:91`) | NW2–NW4 (select ⛔ no ciphertext in the new read) |
| The determination | `nominee_determinations` + `_items` (live = `superseded_at IS NULL`; the writer validates every mark; the 0121 one-way `superseded_at` trigger) | NW2; NW16's trigger model |
| The certificate gate | `assertDeathCertificateAcceptedForApproval` (`claim/death-certificate-approval.ts`; *"With ⛔ NO live determination it PASSES"* `:381-383`) | NW14 (Trap 2) |
| The review window | `CLAIM_REVIEW_WINDOW_STATES` (`claim/review-window.ts:15-21`) — `verifier_approved`, `reversed`, `state_trustee_freeze` … | NW14's states are three of the window's plus `state_trustee_approved` (`-280`); the window bounds where a late key can ARISE (fact 3) |
| The lock / release predicate | `isNomineeDeclarationLocked` (`claim/nominee-lock.ts`) | Trap 3 |
| The corrections | `nominee_corrections` (`member_id`, `da_display`, `pa_display`, `applied_version_id`, `step`; 0119's step-coherence CHECK) | NW4 |
| The timeline route | `getTimeline` (`claims.nominee-declaration.handlers.ts:212-301`) — already decrypts the accepted date (`:227-238`) | NW10 |
| The console | `assembleVerifierConsole` / `assembleNomineeNameCheckStatus` (`claims.verifier-console.handlers.ts:284, 324-394`); the ceiling ledger + `VERIFIER_CONSOLE_MAX_READS = 18` (`:68-150`); its tests (`verifier-console.spec.ts:745-757, 1057`) | NW8, Trap 10 |
| The decision route | `translateDecisionError` (`claims.verification-decision.handlers.ts:48-…`), `auditDecision` (`:196-212`); routes `:100` (decision, ⛔ no step-up), `:116` (revise, step-up); the human-actor gate entry (`expectedMethods: ['post','post']`, `scripts/claim-adjudication-human-actor-invariant/check.ts:61-64`; `COVERAGE_FLOOR` 16) | NW6, NW12, NW14 |
| The permission catalog | `PERMISSION_CATALOG_VERSION = 50` (`rbac/permissions.ts:748`), 64 keys (`tests/rbac/permissions.test.ts:229-231`); `super_admin` derives every catalog key (`rbac/roles.ts:292-298`) | NW17 |
| A Super-Admin-only Pariwar route | `apps/api/src/modules/drive-target/routes.ts:113-124` | NW17 (Trap 15) |
| The field classes | `apps/api/src/context.ts` (`CLAIM_VERIFIER_DECISION_FIELD_CLASS` `:216`, `NOMINEE_DETERMINATION_FIELD_CLASS` `:255`); the crypto helpers `apps/api/src/modules/claims/*-crypto.ts` | NW13 |
| Erasure | `member/anonymize.ts` (the determination / correction / review blocks; the 10.10 comment); `tests/member/rtbf-anonymize.test.ts:98, 159, 191` (17 tables / 20 statements) | Trap 14 |
| Append-only + RLS models | 0119 (`:90-118` — the column-aware trigger and the cascade exception), 0122 (`:70`), 0139 (the newest claim table), `policies/claim-certificate-reminder-rls.ts`, `tests/integration/rls/claim-certificate-reminder-policy-regression.spec.ts`, the TRUNCATE proof (`nominee-declaration-history-policy-regression.spec.ts:508-535`) | NW13, NW16, Trap 17 |
| Per-Pariwar tables | every business table carries `pariwar_id`; only auth infrastructure is global (`schema/admin_credentials.ts`, `admin_sessions.ts`, …) | Trap 15 |
| The microcopy gate | `microcopy.yaml` (`vocabulary` — `report`, `receipt`, `invoice`, `passbook` active; `code_globs` incl. `apps/admin/src/**`) | Trap 11 |
| The admin surfaces | `VerificationDecisionStrip.tsx` (props `:41-66`, `rationaleRequired` `:166-167`), `ReasonCodeDropdown.tsx` (unchanged), `VerifierConsoleRoute.tsx` (`decisionErrorMessage` `:110-127`; the strip mount `:387-424`), `NomineeDeclarationPanel.tsx` (header `:11-17`, the timeline table `:216-274`), `i18n-en.ts` (`nomineeDeclaration` `:227-…`); the flag-banner precedent `ConcealmentFlaggedBanner` (`SignalsPanel.tsx:185`) | NW9, NW10, NW14 |

### What moves (the *UPDATE* list), and what must be preserved
- **NEW:** migrations 0142, 0143; `schema/{approval_warning_reasons,claim_warning_approvals}.ts`; `policies/{approval-warning-reasons-rls,
  claim-warning-approvals-rls}.ts`; `claim/{approval-warnings,approval-warnings-persist,approval-warning-reasons}.ts`;
  `packages/contracts/src/claims/approval-warning-reasons.ts`; `apps/api/src/modules/approval-warning-reasons/**`;
  `apps/admin/src/modules/claim-verification/{ApprovalWarningReasonPicker,LateWarningReasonPanel}.tsx`;
  `apps/admin/src/modules/approval-warning-reasons/**` and its route; the tests in *Testing*.
- **UPDATE:** `migrations/meta/_journal.json`; `packages/domain/src/{schema,policies,claim}/index.ts`; `claim/{verifier-decision-persist
  (incl. three helpers exported),errors, nominee-effective (doc),nominee-correction-persist (comments + one detail string),
  death-certificate-approval (doc-block only)}.ts`; `friction-budget.md` (the disposition block); `apps/api/src/server.ts` (module registration);
  `apps/api/src/modules/claims/claims.nominee-declaration.handlers.ts`'s header (NW11); `rbac/permissions.ts`; `member/anonymize.ts`;
  `packages/contracts/src/claims/{verification-decision,verifier-console,nominee-declaration,index}.ts`; `apps/api/src/context.ts`;
  `apps/api/src/audit/audit-sink.ts`; the app's module registration; `apps/api/src/modules/claims/{claims.verification-decision.handlers,
  claims.verification-decision.routes,claims.verifier-console.handlers,claims.nominee-declaration.handlers}.ts`;
  `apps/admin/src/modules/claim-verification/{i18n-en.ts,VerificationDecisionStrip.tsx,NomineeDeclarationPanel.tsx}`;
  `apps/admin/src/routes/VerifierConsoleRoute.tsx`; `apps/admin/src/{router.tsx,routes/RootLayout.tsx,api/client.ts,api/hooks.ts}`;
  `scripts/claim-adjudication-human-actor-invariant/check.ts`; `packages/domain/tests/rbac/permissions.test.ts`; the tests of Traps 9, 14, fact 5
  and NW11 (incl. ONE mobile test title); the fence; `.decision-log.md`; `epics.md`; `deferred-work.md`; `sprint-status.yaml`.
- **⛔ NEVER edit here:** `claim/verifier-decision.ts`, `REASON_CODE_OUTCOME_COMPAT` and their exact-list tests (Trap 7); `ReasonCodeDropdown.tsx`;
  `rbac/roles.ts` (beyond a comment); `assertClaimApprovable` / `assertNomineeNameCheckForApproval`; `recordNomineeDetermination`; the effective
  accessor's SQL and token; `voteOnFrozenClaim`, `finalizeR9Outcome`, `castR9Vote`, `resolveEscalation`, `correction-closure.ts` (all 6.23b's);
  the appeal modules; any migration ≤ 0141; `nominee-refusal-read.ts`; member-app code and the i18n locales.
- **Preserve:** every refusal code and its order at P1; every revise on a claim with ⛔ no warning; the decision's REAL `reason_code`; 6.18 /
  6.20 / 6.21a / 6.19a / 6.19c behaviour; the determination form's unselected marks; the strip's per-claim `key`.

### Testing
- **Unit (pure):** `packages/domain/tests/claim/approval-warnings.test.ts` — the classifier at the IST edges (23:59 / 00:00; 90 / 91 days from
  an INJECTED anchor; after the anchor), `vacated` flagged, `correction` never, unknown date ⇒ ⛔ no `post_death_version`, the first declaration
  flagged; the keys; `uncoveredKeys`; `assertApprovalReasonCoversWarnings` over kinds × reason (active / replaced / unknown / generic / absent) ×
  note in NW6's order; the anchor picker; the import-discipline source scan; the vocabulary deny-list. `packages/contracts/tests/claims-verifier-decision.test.ts`
  — the new field's `superRefine` rules (the exact lists unchanged); contracts locksteps for the kind list, the `step` values and the generic reason.
- **Live-DB (`twt-test-pg :5433`, own-committing, `{ timeout: 20000 }`, a FRESH Pariwar where reasons are added — Trap 18):**
  `packages/domain/tests/integration/claim/approval-warnings.spec.ts` — every AC3 / AC4 / AC7 arm on real rows (post-death via an explicit earlier
  certificate date + a discarding determination; recent via `declaredAt = now − 30 days`; old via `now − 200 days` — Trap 5); the record row's
  atomicity; a reason replaced between read and write ⇒ 409 (Trap 16); a re-reviewed certificate making a new key uncovered, then NW14 covering
  it — in `verifier_approved`, in `reversed` via fact 3's path, **and** in `state_trustee_approved` (`-280` — a key covered only by an R9
  approve voter's own reason); the District Admin's panel MOUNTED with `uncoveredSinceApproval` 0 and `lateKeysUncoveredForViewer` > 0
  after a Pariwar Admin recorded the only late reason; `determination_required` after an applied correction; two late reasons ⇒
  two rows; NW7's three refusal arms (two reasons); deny / escalate unchanged; the `-239` agreement; a refile's anchor; a released claim excluded.
  `…/integration/claim/approval-warning-reasons.spec.ts` — add, replace, a double replace, two concurrent replaces (two connections — exactly one
  wins), the active list order. `…/rls/{claim-warning-approvals,approval-warning-reasons}-policy-regression.spec.ts` (AC8, AC12 — incl. the
  one-way and deferred triggers, the cascade exception, the TRUNCATE binding). `apps/api/tests/integration/claims/approval-warnings.spec.ts` — the
  409 codes with `details`; NW14's route; the console section incl. `uncoveredSinceApproval`, `reviseBlocked`, `viewerCanRecordLateReason` and `reasonOptions`; the timeline
  fields; the audit contexts. `apps/api/tests/integration/approval-warning-reasons/approval-warning-reasons.spec.ts` — the key (only
  `super_admin`), step-up, cross-Pariwar, validation (incl. a vocabulary term), ⛔ no DELETE / PUT route (a 404 / 405 proves absence).
  `verifier-console.spec.ts` — the ceiling 19 and Trap 10's EXACT +1 test. The RTBF live spec (AC8).
- **Admin (RTL):** the picker (each option's label, "when to use", added by / on, *"built in"*; ⛔ nothing pre-selected; announced); the strip
  (NW9; the final-approval line in place of revise); `available: false`; `decisionErrorMessage`; `NomineeDeclarationPanel` (warning lines, FQ1
  verbatim, date-not-known, ⛔ no checked radio); `LateWarningReasonPanel`; the Super Admin page (list, history, add, replace, the "never edited or
  deleted" line, the nav link's gate).
- **AC9 (run):** `permissions.test.ts` (51 / 65), `dpdpa-consent-events.test.ts` (35), the verifier vocabulary tests UNCHANGED, the human-actor
  gate (its entry edited, the floor unchanged), `contracts:check-openapi-determinism`.
- ⚠ ⛔ No spec here TRUNCATEs a parent whose cascade reaches the new tables (the only live CASCADE TRUNCATE is
  `claim-death-certificate-policy-regression.spec.ts:398-410`, and Trap 17(c) forbids a live TRUNCATE) — clean up with `DELETE FROM claims`
  and fresh Pariwars. If a later spec must TRUNCATE such a parent, use `lockTruncateSetNowait` ([[project_fk_truncate_cascade_deadlock]]).
  ⚠ Assert membership.
- **Extra arms (`-279`):** a re-reviewed certificate ⇒ `awaiting_determination` on the console and NW7's `warnings_not_current`; a revise
  refused after a late reason whose warning has gone; NW14's per-recorder `nothing_uncovered` (a Pariwar Admin's row does ⛔ not block a
  District Admin's answer; the recorder's OWN earlier row does); `viewerCanRecordLateReason` false for a viewer
  without the key / outside the states / while awaiting; the RLS UPDATE-policy arms (the note scrub, `FOR SHARE`); the composite self-FK
  and the reverse deferred check; the transitive import scan; the kinds pin.

### Previous-story intelligence
- **6.20** — T5(b)'s TDZ cycle; D6's mechanical marks (fact 2); the fixture convention (Trap 5); the 0121 one-way `superseded_at` trigger (NW16's
  model); the `certificate_date` plausibility defer (⛔ not this story's).
- **6.18** — the fail-soft console section; response schemas are PARSED; a precondition must show before the button 409s.
- **6.19a / 6.19c** — a new conjunct at P1 goes AFTER the gate; `adjudicateClaim` is the ONE P1 site; 6.19c's seam is ⛔ not the place for a
  reason rule.
- **6.19d** — a "the sibling just adds X" sentence is a claim — fact 3 is that lesson applied to *"the District Admin revises"* and *"the freeze"*.
- **2.4** — the Niyamavali amendment screen edits display fields only, ⛔ not structured payloads, and its content is member-facing ⇒ ⛔ not a home
  for the reason list (checked 2026-10-04).
- ⚠ Inherited, ⛔ not fixed: `PendingCaseCard` shows raw reason codes (6.23b); the `certificate_date` plausibility bound (6.20 defer).

### Interactions to state, ⛔ not prevent
- The true nominee's refile (row 6-24) shows the **same** warnings as the refused claim (the versions are the deceased's) ⇒ approving it needs a
  warning reason and a note (e.g. *"the post-death change was refused on claim X"*). Expected — the routing note said so and the Panel let it stand.
- A claim can show `post_death_version` on the timeline **before** its determination while the console says `awaiting_determination` — approval
  is blocked there anyway.
- **Until 6.23b ships:** the trustee, the final vote, R9 and 6.19c approve over a warning with ⛔ no reason, and a late warning, though
  recordable here, holds ⛔ nothing up — the go-live coupling above.
- The Super Admin who writes a reason may also approve with it (6.19c) — ⭐ answered by visibility (BigDev's (b)): every approver sees who
  added each reason; ⛔ no two-person rule.
- The FQ1 words say *"after the death"* on a correction made under a claim later released as filed against a living member (6-22-gated).

### Latest technical notes
⛔ No new library. Postgres: a DEFERRABLE INITIALLY DEFERRED constraint trigger (`CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED FOR
EACH ROW`) checks at commit; `to_jsonb(NEW) - 'col'` compares rows minus one column; `text[]` with a `cardinality()` CHECK; Drizzle
`text().array()`. Zod 3 `superRefine`, React 19 / TanStack Query as shipped — ⛔ no version change.

### References
- `.decision-log.md` — ⭐ `-280` (NW14 in `state_trustee_approved`) · ⭐ `-279` (A1–A12, amending `-278`) · ⭐ `-278` (NW1–NW18, EA1–EA9) · ⭐ `-277` (Q1–Q3, its readings — two
  superseded by `-278`, one more clause by `-279` A5; Consequences) · `-261` D1, C1, Consequence 2 · `-262` FQ1,
  FQ2, FQ8 A (readings — FQ2's superseded by `-278`; not-cover) · `-264` FQ12, Consequence 2, not-cover · `-263` (the correction precedent) ·
  `-239` · `-241` · `-226` cl.6-7.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-04-6-23-warnings-confirms.md` (✅ ruled);
  `…-2026-09-28-6-20-follow-ups.md` (FQ1–FQ13); `trustee-panel-routing-note-TEMPLATE.md` (its §0 gate — the reason list).
- `6-23b-every-approver-gives-a-warning-reason.md` (the sibling); stories `6-20-…` (D4–D7, D14, D16, T5, T7, T16), `6-21a` (D7, T9, T10), `6-19a`
  (D14), `6-19c` (T10 seam), `6-19d`, `2-4` (the Niyamavali amendment screen).
- `epics.md` Story 6.20 (AC3 — annotated by Task 0.3), Story 6.11 (UX-DR40 / 43 / 54); `docs/legal/niyamavali.md` §6.2 (unratified reference).
- `microcopy.yaml`; the no-comparison fence; `scripts/claim-adjudication-human-actor-invariant/check.ts`; `scripts/access-wrapper-invariants`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `/bmad-dev-story 6.23`, 2026-10-05, branch `story/6-23a-post-death-nominee-change-warnings` (cut
from `main` at `eb1c8620`; the merged `story/6-23-…` branch is kept untouched because the SHA map in this file's header needs its
branch SHAs).

### Debug Log References

- Task 0.1 — `git diff --name-only 2059482b..HEAD -- packages apps scripts docs` was EMPTY (⛔ no code moved since the pin);
  `.decision-log.md` after `-278` holds only `-279` and `-280` (both already built into this file); rows `6-26` / `6-27` still
  `backlog` (⛔ NW1 re-plan owed); live catalog 50 / 64 (as traced).
- `readClaimApprovalWarnings` first failed 42846 on every live test: `${array}::text[]` — Drizzle expands a JS array into one
  parameter PER element. Fixed with `IN (${sql.join(…)})`.
- Red shown by MUTATION, ⛔ not before every line was written: with the NW6 rule and NW7's revise guard disabled
  (`MUTANT=1`), exactly the 11 AC3 / AC4 live tests failed (14 others stayed green); restored, 0 mutant strings left. The RTBF
  pin (20 → 21) and the fence count (34 → 36) failed by construction until their code landed; the policy-regression specs
  were written after their migrations (⛔ a red run was ⛔ not captured for them — recorded, ⛔ not backfilled).
- Review continuation (2026-10-05) — the first full `ci:local` after both review rounds went 33 / 34: `integration-tests` had 3
  failures (4457 passed), all in `claim-warning-approvals-policy-regression.spec.ts` (the two composite-FK cases + the cascade
  test). ⛔ Not a code defect: round 1 edited 0143 IN PLACE after it was applied to `twt-test-pg` (`:5433`), and Drizzle never
  re-runs a recorded migration, so that DB kept the single-column FKs (journal hash `991fc9e5…` vs the file's `a9069912…`); the
  review had re-migrated only the native `:5432`, where the same spec passed 14 / 14. A `pg_dump --schema-only` diff of the four
  tables showed ONLY the round-1 delta (2 unique constraints + 2 FKs swapped); with BigDev's go-ahead it was applied to `:5433`
  in one transaction with the journal hash updated (schemas then identical). ⚠ Any other DB that applied the pre-review 0143
  needs the same delta (none in production — the branch is unmerged).

### Completion Notes List

- (create-story, 2026-10-04) Ultimate context engine analysis completed — comprehensive developer guide created. ⛔ No code written; Task 0 (the author-commit `-278`) precedes any.
- ⭐ **Task 0** — 0.1 traced (above). 0.3: `epics.md` gains `### Story 6.23a` (naming *"6.23a go-live coupling (1): Story 6.23b"*) and
  `### Story 6.23b` (Minted-by headers citing `-261` / `-262` / `-264` / `-277` / `-278` / `-279` / `-280`) after `### Story 6.19d`, and
  Story 6.20's AC3 carries an APPENDED annotation (*"highlights nothing" superseded by `-261` D1; pre-selects nothing and decides
  nothing stand*) — ⛔ nothing rewritten. Committed ALONE first as `aa4659cc` (`governance(6.23a): …`), before any code.
- **Task 1** — migrations 0142 (`approval_warning_reasons`: composite self-FK, UNIQUE replaces, one-way `replaced_at`, the jsonb
  UPDATE guard, a DEFERRABLE INITIALLY DEFERRED constraint trigger for both replacement halves) and 0143 (`claim_warning_approvals`:
  the step / step⇔decision / step⇔note / generic⇔NULL / ≥1-key CHECKs, the composite reason FK, `verifier_decision_id ON DELETE
  cascade`, the jsonb UPDATE guard with the cascade exception); per-command SELECT / INSERT / UPDATE policies on both; journal idx
  142 / 143 (`when` 1792986000000 / 1793072400000; the reverted-0140 gap kept). Applied to `twt-test-pg :5433`; `db:check`,
  `schema:test` / `schema:check` green.
- **Task 2** — `claim/approval-warnings.ts`: kinds + keys, `RECENT_NOMINEE_CHANGE_WINDOW_DAYS = 90`, the pure classifier, the anchor
  picker, `readClaimApprovalWarnings` (ONE statement — anchor (the lock predicate's SQL COPIED), member versions, the live
  determination's discarded member-source ids, its currency against the current ACCEPTED review, the live decision, the District
  Admin rows, the active reasons), `uncoveredKeys` (with 6.23b's `excludeLateReasonsRecordedBy`), `lateWarningKeys`,
  `lateKeysUncoveredFor`, `lateWarningNothingUncoveredFor` (judged per recorder, `-279` A1), THE ONE RULE
  `assertApprovalReasonCoversWarnings` (NW6's order), the record insert, and `listAppliedCorrectionLabels` (NW4). `versionStandsAt`'s
  doc amended (NW11). The TRANSITIVE import scan proves neither new module reaches `events.ts` / `nominee-name-check.ts` /
  `nominee-lock.ts` (and has teeth: `nominee-lock.ts` itself is shown to reach `events.ts`).
- **Task 3** — `adjudicateClaim`: the rule runs AFTER the gate and the contact check (every earlier refusal keeps its code and order),
  locks the chosen reason `FOR SHARE`, and writes ONE `district_admin_approval` row in the approve's own transaction (its FK the new
  decision row); the decision keeps its REAL reason code; `approvalWarningKinds` on the result. A warning reason on a deny is refused
  (the contract's 400 is the real enforcement). `reviseDecision` — NW7 after the existing guards: any District Admin row or a warning
  now ⇒ `warning_approval_final`; an absent / stale determination ⇒ `warnings_not_current`. `acquireDecisionLock`, `lockClaim`,
  `getLiveDecision` exported (⛔ copied nowhere). `claim/verifier-decision.ts` untouched (Trap 7).
- **Task 4** — `claim/approval-warnings-persist.ts` `recordLateWarningReason` (NW14): the verifier lock order, the four states
  (`state_trustee_approved` by `-280`), the certificate gate's own 409 then `determination_required`, the reason `FOR SHARE`,
  `nothing_uncovered` per recorder; ⛔ no event, ⛔ no state change, ⛔ no decision row. The certificate gate's *"Called ONLY by"*
  doc-block amended to name this second caller.
- **Task 5** — contracts: `warning_reason_code` on `VerifierDecisionRequest` ONLY (approve-only + a non-blank rationale), the kinds /
  steps / generic re-declared with lockstep tests, `ApprovalWarningReasonOption`, `LateWarningReasonRequest` / `…Response`,
  `ApprovalWarningsStatus` on the strict packet, the timeline's `warnings` / `correction_label` / `warning_basis`, and the
  Super Admin's list / write DTOs. ⛔ No enum edit; the verifier vocabulary's exact-list tests are byte-for-byte unchanged.
- **Task 6** — API: the new 409s mapped (each in words that say the claim is ⛔ not refused; both `not_revisable` reasons named);
  audit lines gain `approval_warning_kinds` / `warning_reason_code` (approve, and a `warning_reason_required` refusal) and
  `warning_count` (timeline) — ⛔ never a note, name or date; NW14's route (`claim.approve`, district, ⛔ no step-up) with an exhaustive
  refusal switch; the console's `approvalWarnings` section (fail-soft, run LAST, ONE counted read — ceiling 18 → 19 with its ledger
  line; `viewerCanRecordLateReason` in the `viewer.canReview` shape over NW14's whole predicate); the timeline's warnings BY DATE
  from the date it already decrypts (⛔ no new decrypt); the `claim_warning_approval` field class; the human-actor gate entry
  `['post','post','post']` (floor unchanged).
- **Task 7** — admin: the ONE shared `ApprovalWarningReasonPicker` (label, "when to use", added by / on or "built in"; ⛔ nothing
  pre-selected; announced); the strip shows it BESIDE the unchanged dropdown with a line per warning, a REQUIRED note and a
  confirmation that restates both; `reviseBlocked` REPLACES the revise control with its words; `LateWarningReasonPanel` mounted on
  `viewerCanRecordLateReason` ALONE; Approve also waits on `approvalWarnings.available` (its own words); `decisionErrorMessage`
  maps every new code; the timeline panel shows the warning lines, the FQ1 label VERBATIM and the date-not-known line; the five
  hand-built packet fixtures (Trap 9) and the timeline fixtures carry the new fields.
- **Task 8** — `anonymizeMember` sentinels the late-reason note where present (keyed on `deceased_member_id`); RTBF pin 17 → 18 tables
  / 20 → 21 statements (title too); a live spec proves the note gone AS `twt_app` (the UPDATE policy exercised) and the NULL kept.
- **Task 9** — the fence lists both new domain modules (34 → 36) and a never-decrypt test covers them; NW11's sites amended in place
  (the `-261` D1 sites incl. the three late-found ones; the `-261` C1 sites incl. the writer's refusal detail string and ONE mobile
  test TITLE); the admin panel test's *"nothing says after death"* and the API AC3 test amended per AC11 (⛔ never deleted);
  `friction-budget.md` gains the Story 6.23a disposition block. Microcopy, access-wrapper, friction-budget, human-actor gates green.
- **Task 10** — `ci:local` 34/34 green (with `DATABASE_URL`, the integration job included); tests per *Testing* (below); `deferred-work.md` "Recorded during Story 6.23a" carries the five records. ⛔ No other
  sprint row moves.
- **Task 11** — the reason list: domain add / replace writers (a code collision retried under a raw SAVEPOINT; a concurrent replace
  ⇒ exactly one wins), the vocabulary deny-list lockstep-tested against `microcopy.yaml`; catalog 50 → 51 / 64 → 65
  (`approval_warning_reason.manage`, super_admin ONLY, ⛔ no `roles.ts` const); the API module (GET / add / replace, step-up on both
  writes; ⛔ no PUT / PATCH / DELETE); the admin page (active list, history, add, replace, the "never edited or deleted" line, the
  step-up flow) and the nav link behind BOTH gates (a Pariwar context AND the national grant).
- ⭐ **Trap 6 — the approve-path red set was EMPTY, as traced:** ⛔ no shipped approve-path or revise spec turned red (the full domain
  live suite 4458 passed; api 1514; admin 844; contracts 1247; jobs 48 files).
- ⭐ **Review continuation (`/bmad-dev-story 6.23a`, 2026-10-05)** — the ONE open item (Round 2's encrypt-before-checks action
  item) RESOLVED as ⛔ no code change, DEFERRED (BigDev: *"Keep it, defer"*): the ordering is shared with `postDecision` and
  revise in the same handler file, and the callback fix would hold the decision + claim locks across a KMS call. Recorded
  in `deferred-work.md` with a trigger that can fire. Every task and review item is now `[x]`.
- **Tests added:** domain unit `approval-warnings.test.ts` (25); domain live `approval-warnings.spec.ts` (25),
  `approval-warning-reasons.spec.ts` (6, own-committing), `approval-warnings-rtbf.spec.ts` (1), the two policy-regression specs
  (17 + 12); contracts (+12); api `approval-warnings.spec.ts` (5), `approval-warning-reasons.spec.ts` (5), +1 exact ceiling test,
  +1 shape test; admin `approval-warnings.test.tsx` (18), `approval-warning-reasons-page.test.tsx` (6), +3 mounted-route tests.

### File List

- `friction-budget.md` (the Story 6.23a disposition block)
- `_bmad-output/planning-artifacts/epics.md` (governance commit `aa4659cc`)
- `_bmad-output/implementation-artifacts/6-23-post-death-nominee-change-warnings.md`, `deferred-work.md`, `sprint-status.yaml`
- NEW `packages/domain/migrations/0142_approval-warning-reasons.sql`, `0143_claim-warning-approvals.sql`; `migrations/meta/_journal.json`
- NEW `packages/domain/src/schema/approval_warning_reasons.ts`, `claim_warning_approvals.ts`; `schema/index.ts`
- NEW `packages/domain/src/policies/approval-warning-reasons-rls.ts`, `claim-warning-approvals-rls.ts`; `policies/index.ts`
- NEW `packages/domain/src/claim/approval-warnings.ts`, `approval-warnings-persist.ts`, `approval-warning-reasons.ts`
- `packages/domain/src/claim/{index,errors,verifier-decision-persist,death-certificate-approval,nominee-effective,nominee-correction-persist}.ts`
- `packages/domain/src/member/anonymize.ts`; `packages/domain/src/rbac/permissions.ts`
- NEW tests `packages/domain/tests/claim/approval-warnings.test.ts`; `tests/integration/claim/{approval-warnings,approval-warning-reasons,approval-warnings-rtbf}.spec.ts`;
  `tests/integration/rls/{approval-warning-reasons,claim-warning-approvals}-policy-regression.spec.ts`
- `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`, `tests/member/rtbf-anonymize.test.ts`, `tests/rbac/{permissions,roles}.test.ts`,
  `tests/integration/claim/nominee-correction.spec.ts`, `tests/integration/rls/nominee-declaration-history-policy-regression.spec.ts`
- NEW `packages/contracts/src/claims/approval-warning-reasons.ts`; `packages/contracts/src/claims/{index,verification-decision,verifier-console,nominee-declaration}.ts`;
  `packages/contracts/tests/{claims-verifier-decision,claims-verifier-console}.test.ts`
- NEW `apps/api/src/modules/approval-warning-reasons/{index,routes,handlers}.ts`, `apps/api/src/modules/claims/approval-warning-crypto.ts`
- `apps/api/src/{context,server}.ts`, `apps/api/src/audit/audit-sink.ts`,
  `apps/api/src/modules/claims/{claims.verification-decision.handlers,claims.verification-decision.routes,claims.verifier-console.handlers,claims.nominee-declaration.handlers}.ts`
- NEW `apps/api/tests/integration/claims/approval-warnings.spec.ts`, `apps/api/tests/integration/approval-warning-reasons/approval-warning-reasons.spec.ts`;
  `apps/api/tests/integration/claims/{nominee-declaration,verifier-console,verifier-console-shape}.spec.ts`
- NEW `apps/admin/src/modules/claim-verification/{ApprovalWarningReasonPicker,LateWarningReasonPanel}.tsx`, `apps/admin/src/modules/approval-warning-reasons/{index,i18n-en,ApprovalWarningReasonsPage}.ts(x)`,
  `apps/admin/src/routes/ApprovalWarningReasonsRoute.tsx`
- `apps/admin/src/modules/claim-verification/{i18n-en,index,VerificationDecisionStrip,NomineeDeclarationPanel}.ts(x)`, `apps/admin/src/routes/{VerifierConsoleRoute,RootLayout}.tsx`,
  `apps/admin/src/{router.tsx,api/client.ts,api/hooks.ts}`
- NEW `apps/admin/tests/{approval-warnings,approval-warning-reasons-page}.test.tsx`; `apps/admin/tests/{verifier-console,death-certificate-review,nominee-declaration-route,verifier-console-route-name-check,nominee-declaration-panel}.test.tsx`
- `apps/mobile/tests/unit/nominee-history-copy.test.ts` (a test TITLE only)
- `scripts/claim-adjudication-human-actor-invariant/check.ts`

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-04 | **Created (`bmad-create-story`)** from `-261` D1, `-262` FQ1 / FQ2 / FQ8 A and `-264` FQ12, traced at `2059482b`. Four findings (the FQ2 precedent; FQ12's actor; no decrypt at the gate; two tests pin the superseded rule). NW1–NW12 ⏳ PROPOSED; Q1–Q3 confirms. `backlog` → `ready-for-dev`. *(Kept in git.)* |
| v1.1 | 2026-10-04 | The Q1–Q3 routing note drafted; tracing found a third non-District-Admin approver (R9). *(Kept in git.)* |
| v1.2 | 2026-10-04 | The Panel ruled `-277` (Q1 A · Q2 C · Q3 B); a STOP banner fenced the "meanwhile" design; Task 0's author-commit moved to `-278`. *(Kept in git — commit `1b38be9e`.)* |
| v2.0 | 2026-10-04 | ⭐ **DERIVED — the SPLIT** (BigDev: *"ok, split it"*). This file became **Story 6.23a**; every later approver and Q3 B's wait became **6.23b**. *(Kept in git.)* |
| v2.1 | 2026-10-04 | ⭐ **THE REASON LIST** (BigDev's design — generic + Super Admin add / replace, ⛔ never delete; option (b); notes ⛔ never replaced). *(Kept in git — commit `a55480a8`.)* |
| **v2.2** | **2026-10-04** | ⭐ **A fresh-context validate (read-only, at `a55480a8`): ⛔ no BLOCKER; 2 HIGH, 8 MEDIUM, 13 LOW — every finding re-checked in the tree, all applied.** HIGH: (1) a District-Admin-approved claim denied at the final vote and reversed on appeal could ⛔ never answer a late warning — `state_trustee_freeze` is ⛔ never a resting state, `reversed` is the real home ⇒ fact 3 rewritten, NW14 adds `reversed` (+ an AC7 arm); (2) three earlier READINGS were departed from without supersession (`-262` FQ2's, `-277` Q3's, `-277` Q2's note claim) ⇒ AC0 / `-278` supersede them, quoted. MEDIUM: the re-delegation of the reasons to the Super Admin and BOTH halves of UX-DR43 recorded; ⭐ **the `warning_override` MARKER DROPPED** — the warning reason is its own field, the approval keeps its REAL reason (⛔ no enum edit, ⛔ no migration 0142 for it — migrations renumbered 0142 / 0143); revise refused on any warned claim (NW7 — closes "a revise re-approves over a late warning with no reason"); the console's `approvalFinal` replaces a dead revise control; the fifth hand-built packet fixture (Trap 9); Trap 10's false claim fixed with an exact +1 test; append-only details (Trap 17: the cascade exception, the jsonb compare, the TRUNCATE proof, a nullable `verifier_decision_id` + CHECK); NW14 refuses while the determination is awaited. LOW: NW6's check order; ⛔ no step-up on NW14 (the decision route's posture); ⛔ no `roles.ts` const; the mobile test-title carve-out; Trap 5's exception named; two quotes made verbatim; `FOR SHARE` (Trap 16); the composite FK and a deferred trigger so "replaced" ⛔ never disguises a delete; fresh Pariwars (Trap 18); the go-live coupling named for `epics.md`; NW1's import discipline; the fence 34 → 36; "the newest claim table" = 0139. Status stays **`ready-for-dev`**; code gated on `-278`. |
| **v2.3** | **2026-10-04** | ⭐ **`-278` COMMITTED** (`a125a59d`) after BigDev confirmed the validate's two adjacent changes — *"yes to change 1, option A for change 2"*: the warning reason in its own field (NW5), and ⛔ no revise once a claim shows any warning (NW7; options B and C ⛔ not taken). Task 0.2 ✅; 0.1 and 0.3 (`epics.md`) remain the developer's. ⛔ No design change. Status stays **`ready-for-dev`**. |
| **v2.4** | **2026-10-04** | ⭐ **A SECOND fresh-context validate** (three read-only verifiers at `29d35996` — code claims, design adversary, 6.23b + governance; no code moved since `2059482b`): ⛔ no BLOCKER; 3 HIGH, 9 MEDIUM, ~25 LOW, each re-checked in the tree; BigDev: *"All"*, *"Not the final approver"*, *"Correction queue, in 6.23b"*. Decision changes → author-commit **`-279`** (A1–A12; Task 0.5). **6.23a's share:** HIGH — the `friction-budget` gate fires on the mobile test-title edit (AC10 / AC13 disposition block); the RLS UPDATE policies were unnamed, without which erasure, `replaced_at` and `FOR SHARE` silently fail under FORCE (NW13, NW16). MEDIUM — an out-of-date determination is `awaiting_determination`, ⛔ never current (fact 2, NW2, NW8; NW7's `warnings_not_current`); NW11's three missed D1 sites; `viewerCanRecordLateReason`; the TRANSITIVE import scan (Trap 3: copy, ⛔ never import `nominee-lock.ts`); the `-277` Q3 reading clause superseded (A5); the kinds pin (A6). LOW — NW14 in `state_trustee_approved` (A7); NW7 on any `district_admin_*` row (A8); NW16's composite self-FK + reverse deferred check (A9); the late-reason recorder ⛔ not excluded from appeal review (A11); private helpers exported; the `"Called ONLY by"` doc-block; Trap 9's three casts; Trap 10's model `:1085-1086`; the drive-target cite `:113-124` + the openapi / nav departures; `feature_flag_versions` considered; Trap 17(b) a stated departure; `ON DELETE CASCADE`; the TRUNCATE bullet narrowed; Trap 11's tone regexes; NW8's "no date" made precise; the fail-soft section run last; the reason-code 23505 retry; the fact 2 `source`-filter note; the never-decrypt fence test. ⭐ **Then a fresh-context RE-VALIDATE of `-279` and these edits (before insertion)** found 1 HIGH in A1 itself: a self-recorded late reason made NW14 answer `nothing_uncovered` to everyone else, so the claim stalled with ⛔ no surface showing it ⇒ `nothing_uncovered` is judged FOR THE RECORDER and `viewerCanRecordLateReason` runs NW14's whole predicate; A7 withdrawn (⛔ no late key can arise in `state_trustee_approved` — a later anchor only REMOVES keys); `approvalFinal` became `reviseBlocked` (two reasons, two lines); the `warnings_not_current` words gained the certificate arm; NW7's arms counted as three. BigDev agreed the six post-answer details (*"Agree to all six"*); **`-279` COMMITTED** (`e2bcd2c3`, alone). ⭐ **A THIRD fresh-context round** (on the committed `-279` + these edits): ⛔ no BLOCKER, 2 HIGH — Task 7 still mounted the late-reason panel on `uncoveredSinceApproval > 0`, hiding it from exactly the person A1 says must answer (⇒ mount on `viewerCanRecordLateReason` ALONE; new `lateKeysUncoveredForViewer` with its words); and an R9 approval from `state_trustee_approved` could stall under A1 with NW14 refusing there (⇒ **`-280`**, Task 0.6: NW14's fourth state, superseding A7's withdrawal reason). ⭐ **Round 4** (on the committed text): **⛔ no BLOCKER or HIGH** — fixed: AC7's *"outside the three"* (now four), fact 3's first state list, the R9 residual (an approve voter's own late reason ⛔ never counts at finalize; the degenerate all-voters Pariwar recorded as an accepted residual), the two new Testing arms, a duplicate in Task 7. Also: a glyph inversion in Testing that reversed a test; both `not_revisable` reasons mapped (Tasks 6 / 7, AC5); NW14's own-rows test limited to `district_admin_*` rows. Status stays **`ready-for-dev`**. |
| **v2.5** | **2026-10-04** | **Merged as PR #253 (rebase), docs only; the `pre-push` `ci:local` passed.** Every branch SHA this file cites is mapped to its `main` twin in the header note (all 11 commits, each pair proved by identical `patch-id`; merged tree byte-identical to the branch head); ⛔ no citation rewritten. Status stays **`ready-for-dev`**. |
| **v2.6** | **2026-10-05** | ⭐ **BUILT (`/bmad-dev-story`)** on `story/6-23a-post-death-nominee-change-warnings` from `eb1c8620`. Task 0.3 committed ALONE first (`aa4659cc` — `epics.md` 6.23a / 6.23b + the 6.20 AC3 annotation); then Tasks 1–11: migrations 0142 / 0143, the warnings module and THE ONE RULE at the District Admin's approval with its record, NW7's final words, NW14's late reason, the contracts, the API (incl. the console section at 19 reads), the admin surfaces (the shared picker, the strip, the late panel, the timeline lines and the FQ1 label), erasure, the fence (36), NW11's annotations, the reason list end to end (catalog 51 / 65). ⭐ Trap 6's red set stayed EMPTY. ⛔ No design change. Status → **`review`**. |
| **v2.7** | **2026-10-05** | **Review continuation (`/bmad-dev-story 6.23a`).** The ONE open item — Round 2's encrypt-before-checks action item — RESOLVED as ⛔ no code change, DEFERRED (BigDev: *"Keep it, defer"*): the ordering is the handler file's shared convention (`postDecision` and revise do the same), and the callback fix would hold the decision + claim locks across a KMS call; `deferred-work.md` gains it for all three handlers with a trigger that can fire. The first full `ci:local` since both review rounds found `twt-test-pg` (`:5433`) still on the pre-review 0143 (edited in place; ⛔ not a code defect — see Debug Log); the delta applied with BigDev's go-ahead, then `ci:local` **34 / 34 green** with `DATABASE_URL` (domain 4460, api 1514, jobs 568). Every task and review item `[x]`. Status → **`review`**. |
