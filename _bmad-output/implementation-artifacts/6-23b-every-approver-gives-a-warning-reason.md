---
baseline_commit: b41ea25f
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
⭐⭐ MERGED 2026-10-06 as PR #257 (REBASE-merge) — THE STORY-6.23b SHA MAP. The six commits of
`story/6-23b-every-approver-gives-a-warning-reason` (from `b41ea25f`) were rewritten by the rebase; the citations in this file
and in `sprint-status.yaml` are kept AS WRITTEN (the record) and this maps them to their `main` twins, PROVED ⛔ not assumed:
each pair has an IDENTICAL `git patch-id --stable`, and the merged tree (`bbde4a5f`) is byte-identical to the branch head
(`8770da31`) — tree `df26fdd7` both. `main` had not moved (the merge-base was `b41ea25f`), so the rebase rewrote SHAs only.
  · `9c3c6181` → `4f041f36`  story: created for dev (v2.0)                                      (cited)
  · `c07e8131` → `b8a4fb3b`  governance: `epics.md` Story 6.23b annotation                       (⛔ not cited)
  · `a7aaa0cb` → `272587ff`  story: validate v2.1                                                (⛔ not cited)
  · `a87c2311` → `69ead3ce`  story: code review round 1                                         (cited)
  · `50e3eef3` → `757b751b`  fix: the CI false-positive unhandled rejection                     (cited)
  · `8770da31` → `bbde4a5f`  story: code review rounds 2 and 3 (the merge head)                 (⛔ not cited)
Re-verify (bash — zsh does not word-split `$p`): `for p in "9c3c6181 4f041f36" "c07e8131 b8a4fb3b" "a7aaa0cb 272587ff" "a87c2311 69ead3ce" "50e3eef3 757b751b" "8770da31 bbde4a5f"; do set -- $p; diff <(git show $1 | git patch-id --stable | cut -d' ' -f1) <(git show $2 | git patch-id --stable | cut -d' ' -f1); done`
— ⚠ needs the branch SHAs, which survive only while the branch (local or `origin/story/6-23b-every-approver-gives-a-warning-reason`) does.
-->

<!--
BASELINE — RE-PINNED 2026-10-05 to `b41ea25f` on `main` (`bmad-create-story 6.23b`, after Story 6.23a went `done` and merged as PR #255).
The v1.x pin `2059482b` is an ancestor of `b41ea25f`; `git diff --name-only 2059482b..b41ea25f -- packages apps scripts` = 6.23a's build
ONLY (81 files) + `scripts/claim-adjudication-human-actor-invariant/check.ts`. Two facts kept apart, as always:
  · DURABLE — the pin `b41ea25f` is an ancestor of HEAD (`git merge-base --is-ancestor b41ea25f HEAD`).
  · PERISHABLE — every code claim below was RE-DERIVED against `b41ea25f` on 2026-10-05 (each function opened, each `file:NNN` read with
    `sed -n`). ⚠ Before Task 1, run `git diff --name-only b41ea25f..HEAD -- packages apps scripts`; any cited file in that list is re-read.
  · v2.1 (validate, 2026-10-05, at `9c3c6181` — ⛔ no code moved since `b41ea25f`): three fresh-context verifiers re-opened every code
    claim; RD17–RD21 and the fixes below were found in the code, ⛔ never decided.

STATUS: `ready-for-dev` (6.23a is `done` — the 6.21b precedent: the row flips when its sibling is `done`).

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / don't / nowhere); `⭐` =
key fact or action; `⚠` = hazard. Doubling is volume only. ⭐ Sweep: `grep -noE "⛔ \**[^ ]+"` (this line's own hit excepted) — every head-word a negation (a backticked
code word after `⛔` is a defect: write *"never `x`"*).
⭐ The ONE glyph exception: a `⛔` inside a verbatim quotation of code (a doc-block quoted in a Trap) belongs to the quote.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — every
prepend rots them). Cite decisions by id + item, `deferred-work.md` by its section heading, `sprint-status.yaml` by row key. `file:NNN` is
used ONLY for code, as of `b41ea25f`; function names are the stable handle.
LETTERS: `EA1`…`EA10` are THIS story's author decisions (`-278` EA1–EA9; `-279` amends EA1, EA2, EA5, reaches EA7 (A1, A3) and adds EA10; `-280` adds
`state_trustee_approved` to 6.23a NW14's states). `NW*` = Story 6.23a's. `RD1`…`RD21` (v2.0 / v2.1) are FOUND facts from re-deriving against
6.23a's shipped build — ⛔ none is a decision; each says what it changes in the build. Rulings are cited by id + item (`-277` Q2, Q3).
-->

# Story 6.23b: Every Approver Picks a Reason and Writes a Note While a Warning Shows — and a Late Warning Waits for the District Admin `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Trustee Panel ruled that **every approver** — not only the District Admin — gives a
> reason and a note while a nominee-change warning shows, *"also after an appeal and in the R9 vote … even where written reasons already
> exist"* (`2026-10-04-277` Q2 C; our reading B ⛔ not taken). And a warning that **appears after** the District Admin approved makes the
> **final approval wait** until the District Admin records a reason and a note for it (`-277` Q3 B) — ⛔ never a refusal. Story 6.23a
> (**`done`**, PR #255) built the warnings, the Pariwar's **reason list** (one built-in generic + the Super Admin's replace-only entries,
> each showing who added it and when to use it), the District Admin's rule, the **record** of every approval over a warning, and the District
> Admin's late reason. **This story makes every LATER approver pick from the SAME list, write a note, and leave a record — and makes the
> final approval wait.**
> ⭐ **The approvers** (`-277`'s reading, confirmed by BigDev in session): the State Trustee resolving an escalation (`resolveEscalation`;
> today the Pariwar Admin as Trustee-Lite), the **Pariwar Admin's final vote** — every one (`voteOnFrozenClaim`), **each R9 panel member's
> approving vote** (`castR9Vote`, re-checked at `finalizeR9Outcome`), the **Super Admin** approving a claim they hold
> (`decideEscalatedClosure`), and the **Pariwar Admin** approving a "no correction needed" claim (`approveNoCorrectionNeeded`). ⭐ An appeal
> **reversal** is ⛔ not an approval — it returns the claim to the final vote, which this story covers.
> ⭐ **The system still refuses nothing, marks nothing and pays no one differently.** A refusal, an escalation, a route to R9, a return for
> correction and every deny vote are ⛔ never gated. ⭐ **A written note is ⛔ never replaced** (6.23a NW18).
> ⭐ **The person the wait holds can ⛔ not clear it** (`-279` A1, BigDev: *"Not the final approver"*): a late reason recorded by the person
> now approving does ⛔ not count for that approval. ⭐ **The District Admin is told** — a waiting claim appears in their correction queue
> (EA10, `-279` A4).

> ✅ **6.23a is `done`** (row `6-23-post-death-nominee-change-warnings`; merged as PR #255). This story CALLS its module —
> `readClaimApprovalWarnings`, `assertApprovalReasonCoversWarnings`, `uncoveredKeys`, `lockActiveApprovalWarningReason`,
> `insertClaimWarningApprovalRecord`, `listApprovalWarningReasons` — writes rows into its record table (`claim_warning_approvals`) and mounts
> its shared picker (`ApprovalWarningReasonPicker`). Re-implement ⛔ none of it. ⭐ It ADDS `readClaimApprovalWarningsBulk`,
> `assertLateWarningsCovered` and `readR9VoteWarningCoverage` to `claim/approval-warnings.ts`, and WIDENS three things 6.23a left for it:
> the record's `step` CHECK (EA1), `insertClaimWarningApprovalRecord`'s input (RD2) and `uncoveredKeys`' actor exclusion (RD3).
> ⚠ **Go-live coupling (6.23a's):** `-277` Q2 C and Q3 B are in force only once THIS story ships.

## Story

As **any approver of a death claim after the District Admin** — the trustee resolving an escalation, the Pariwar Admin at the final vote,
an R9 panel member, the Super Admin —
I want **to see the nominee-change warnings on my own screen, to pick my reason from the Pariwar's list — seeing who added each reason and
when to use it — and to write my own note before I can approve; and to be told plainly when the claim is waiting for the District Admin to
answer a warning that appeared after their approval**,
so that **every approval of a claim over a warning carries a named person's chosen reason and unalterable note** — the Panel's rule for a
case that is most likely fraud.

## The rulings this story builds — verbatim keys, and what is still OUR reading

| Decision | The text ruled (`-277`: the relayed verbatim is *"Q2 - C"* / *"Q3 - B"*, quoted here as the option was put in the note; `-264`: its own text) | Our reading |
|---|---|---|
| `-277` Q2 | *"Q2 - C"* — *"Yes, every approver — also after an appeal and in the R9 vote … Every approval made while a warning shows records a reason and a note, even where written reasons already exist."* | Every writer that approves a claim, whenever any warning shows (the five above). ONE reason (from the list) + ONE note per approval (`-264`'s reading); where a note is already required (R9 votes, the Super Admin) only the reason is new. ⚠ The "no correction needed" approve has ⛔ no note today — it gains one (Trap 4); `-277`'s reading said *"6.19c's approvals"* already require one, and `-278` corrects that. ✅ BigDev confirmed the broad reading in session (`-277`). |
| `-277` Q3 | *"Q3 - B"* — *"The final approval waits until the District Admin … records a reason and a note for the new warning. The claim is ⛔ never refused for it."* | The wait = a conjunct of the ONE approval gate: where a District Admin approval exists, every current warning key must be covered by the District Admin's record rows (6.23a NW13–NW15) — else a typed 409 *"waits for the District Admin"*. Per warning, ⛔ not per kind. ⭐ A late reason recorded by the approving actor does ⛔ not count for that approval (`-279` A1). ⚠ `-277`'s clause *"a claim approved through an escalation, R9 or an appeal reversal has none"* is SUPERSEDED (`-279` A5), as was its *"the District Admin re-records their approval (a revision)"* (`-278` supersession 2 → NW14): R9 run after the District Admin's approval, and a reversed final-vote denial, KEEP the District Admin's live approval — the wait applies there. |
| `-264` FQ12 | *"APPROVING WHILE ANY WARNING SHOWS NEEDS A REASON AND A NOTE"* (its heading) | `-277` Q2 extends it to every approver; `-264` is ⛔ not edited. |
| `-264` not-cover | *"The wording of the reasons … an author-commit at the row's Task 0."* | The reasons are 6.23a's list (NW16–NW17, BigDev's design) — this story ⛔ never mints its own. |

## ⭐ THE INVARIANTS

1. **The system refuses nothing.** The reason rule changes the FORM of an approval; the wait holds a final approval until the District
   Admin answers — ⛔ never a denial, ⛔ never a state change, ⛔ never a change to who is paid.
2. **ONE rule, ONE list, ONE record.** Every approver calls 6.23a's `assertApprovalReasonCoversWarnings`, picks from 6.23a's list and writes a
   row into 6.23a's record — ⛔ never a second copy of the rule, ⛔ never a vocabulary of its own, ⛔ never a second derivation of the warnings
   (the bulk reader reuses 6.23a's pure `deriveClaimApprovalWarnings` — RD9).
3. **ONE gate for the wait.** The wait is a conjunct of `assertClaimApprovable`, so it reaches every final approval BY CONSTRUCTION — the
   gate's own doc-block: *"every OTHER conjunct here … and whatever conjunct is added later — still refuses it"* (the `-251` waiver covers the
   name check only — Trap 17).
4. **A refusal is ⛔ never gated** — nor an escalation, a route to R9, a return for correction, a Super Admin refusal or closure, or a deny vote.
   ⭐ That includes a warnings read that FAILS: it disables Approve only (Trap 15).
5. **Every approver SEES the warnings and the reasons (with who added each) before the approve control** — BigDev's (b): approvers learn from
   the list; and a reason demanded about something the screen does ⛔ not show is a 409 training staff to read governance as a glitch. ⭐ That
   includes an R9 vote that has fallen out of date (RD11).
6. **⛔ No name of a member is compared; ⛔ no new decrypt; a note is ⛔ never replaced** (6.23a invariants 6, 7, 9).
7. **An unknown is ⛔ never shown as "no warnings"** (6.23a's console precedent, `assembleApprovalWarnings`): a read that could ⛔ not be made
   says so, with Approve disabled in its own words.

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS conjuncts to every later approval of a death claim** — a listed reason and a note while a warning shows — **and a WAIT at
the final approval** while a warning that appeared after the District Admin's approval is unanswered.

**The sentence, in the member's terms (ours, for the Panel to correct):** *"If your nominee is changed on or after the day you die, or named
or changed in the 90 days before your family's claim is filed, every person who approves your family's claim must write down why. If such a
change only comes to light after the District Admin has approved, the claim waits until the District Admin has written down why too. Your
family's claim is never refused because of it."*

**Checked against the Niyamavali? ⭐ Yes — silent** (§6.2 *"the Trust verifies … the claimant's entitlement"*; nothing on approval notes;
the agent-drafted reference binds nothing — [[feedback_niyamavali_rulebook_not_spec]]). ⭐ **Checked against `-277` Q2 / Q3 and `-264` FQ12:
matches as ruled**; the scope of "every approver" is `-277`'s reading, confirmed by BigDev. ⭐ v2.0 re-checked: ⛔ no predicate is added or
changed beyond `-278` / `-279` / `-280` — RD1–RD21 (v2.0 / v2.1) change the build's mechanics, ⛔ never who may approve or when.

## ⭐ v2.0 / v2.1 — WHAT RE-DERIVING AGAINST 6.23a's SHIPPED BUILD CHANGED (RD1–RD16 v2.0, RD17–RD21 v2.1; FOUND, ⛔ not decided)

v1.4 was traced at `2059482b`, before 6.23a existed; 6.23a then went through four review rounds. Each item below is a fact in the code at
`b41ea25f` and what it changes here. ⛔ None moves a decision; each is threaded into the Traps, EAs, ACs and Tasks below.

- **RD1 — 0143's FKs are COMPOSITE `(pariwar_id, …)`** (6.23a code review round 1: a single-column FK bypasses RLS, so a row could point at
  another Pariwar's claim). 0143 added `claims_pariwar_claim_case_uq` and `claim_verifier_decisions_pariwar_decision_uq` as FK targets. ⇒
  EA1's three new FKs are composite too, and 0144 adds three UNIQUE targets: `(pariwar_id, decision_id)` on `claim_state_trustee_decisions`,
  `(pariwar_id, vote_id)` on `claim_r9_votes`, `(pariwar_id, closure_id)` on `claim_correction_closures` — each mirrored by a Drizzle
  `unique()` in its schema file (`schema/claim_state_trustee_decisions.ts`, `schema/claim_r9_votes.ts`, `schema/claim_correction_closure.ts`
  — ⚠ singular file name), as 0143 did in `schema/claims.ts` / `schema/claim_verifier_decisions.ts` (Trap 10).
- **RD2 — `insertClaimWarningApprovalRecord` REQUIRES `verifierDecisionId`** (`approval-warnings.ts`). ⇒ its input becomes a union
  discriminated by `step`: the `district_admin_*` arm keeps `verifierDecisionId` (both 6.23a callers compile unchanged); `escalation_resolution`
  / `final_vote` / `no_correction_approval` carry `trusteeDecisionId`; `r9_vote` carries `r9VoteId`; `super_admin_approval` carries
  `closureId` AND `trusteeDecisionId`. `noteCiphertext` stays `null` on every later step (0143's step ⇔ note CHECK).
- **RD3 — `uncoveredKeys`' exclusion is ONE actor** (`opts.excludeLateReasonsRecordedBy?: string` — built for this story). P4 excludes the
  finalizer AND every live approve voter ⇒ widen it to `string | readonly string[]` (the shipped tests pass a string —
  `tests/claim/approval-warnings.test.ts`, `tests/integration/claim/approval-warnings.spec.ts` — keep them green unmodified).
- **RD4 — the wire is snake_case; 6.23a's option DTO is camelCase.** `CycleFreezePendingItem`, `R9PanelResponse` / `R9PanelVote`,
  `PariwarClosureQueueItemDto`, `EscalatedClosureDetailResponse` and `ClaimUnderCorrectionItem` are all snake_case ⇒ the new fields are
  `approval_warnings` (with snake fields — EA7), `reason_options`, `covers_current_warnings`, `late_warning_awaiting_reason`,
  `late_warning_uncovered_count`. `ApprovalWarningReasonOption` (`contracts/src/claims/verification-decision.ts`) is camelCase
  (`reasonId`, `addedByDisplay`, `addedAt` — an ISO string) — reuse it UNCHANGED, ⛔ never a snake twin. The domain rows stay camelCase
  ([[feedback_story_validate_footguns]] #1).
- **RD5 — every R9 route code is `r9_voting.*`** (25 codes in `claims.r9-voting.handlers.ts`; ⛔ none is `r9.*`). `-279` A2 wrote the refusal
  as `r9.approve_votes_need_warning_reason` — a string slip against the live prefix ⇒ the code is **`r9_voting.approve_votes_need_warning_reason`**.
  ⛔ No design change (A2's substance stands). An erratum line in the log is BigDev's option, ⛔ not owed.
- **RD6 — `cycle-freeze/` and `r9-voting/` have ⛔ no `i18n-en.ts`.** Both import shared words from `claim-verification/` (`verifierConsoleEn`
  and the message helpers in `claim-verification/nominee-errors.ts`); the suffix MATCHERS live in each page's own `errorMessage`
  (`error.code.endsWith('.death_certificate_acceptance_required')` … — `CycleFreezePage.tsx:55`, `R9CasePanel.tsx:26`). ⇒ the shared warning
  words go into `verifierConsoleEn.approvalWarnings` (`claim-verification/i18n-en.ts` — 6.23a's block: `kindLine`, `pickerLabel`, `errors.*`
  …), one message helper per new suffix into `nominee-errors.ts`, and one `endsWith` arm per new suffix in each page's `errorMessage`; `correction-closure/` has its own `i18n-en.ts`
  for D27's note label, and its `closureErrorText` (`correction-closure/errors.ts`) already shows the server's words for any `closure.*` code.
- **RD7 — `correction-closure-shape.spec.ts` pins the EXACT keys** of `listPariwarClosureQueue` items, `listEscalatedClosures` items and
  `readEscalatedClosureDetail` (`Object.keys(...).sort()`); `getCycleFreezePending` is also read by the Trustee-Lite dashboard
  (`apps/api/src/modules/trustee-lite/handlers.ts` — a read-only summary; `TrusteeLitePage.tsx` has ⛔ no approve control). ⇒ the warnings
  attach at the API HANDLER, after the domain
  read, in the same request transaction — the domain readers, their shape pins and Trustee-Lite stay UNCHANGED (Trap 14).
- **RD8 — the R9 panel and the Super Admin's detail are ONE claim each** (`getR9Panel(db, pariwarId, claimCaseId)`,
  `readEscalatedClosureDetail(…, claimCaseId)`) ⇒ they use the per-claim `readClaimApprovalWarnings`; the BULK reader serves the three LISTS
  only — the cycle-freeze pending buckets, the "no correction needed" queue and the District Admin's correction queue (Trap 8).
- **RD9 — 6.23a left the bulk reader's half ready:** `deriveClaimApprovalWarnings` (module-private, *"The pure half of the read (6.23b's bulk
  form reuses it)"*). ⇒ `readClaimApprovalWarningsBulk` runs ONE statement returning one `RawWarningsRow` per claim (per-claim `LATERAL`
  subqueries over `claim_case_id = ANY($ids)`; raw SQL with explicit aliases — ⛔ never a Drizzle correlated subquery,
  [[project_epic6_drizzle_correlated_subquery_bug]]) and maps each through the SAME `deriveClaimApprovalWarnings`; the reasons are read ONCE
  for the response (the active list does ⛔ not vary by claim).
- **RD10 — the R9 per-vote coverage needs rows 6.23a's reader never selects.** `readClaimApprovalWarnings` aggregates
  `DISTRICT_ADMIN_WARNING_STEPS` rows only (correctly — Trap 13 of 6.23a). ⇒ NEW leaf read `readR9VoteWarningCoverage(db, pariwarId,
  voteIds)` → `Map<voteId, coveredKeys[]>` over `step = 'r9_vote'` rows, used by `finalizeR9Outcome` AND by the panel (RD11). The per-vote
  comparison is NEW pure `keysNotCoveredBy(keys, coveredKeys)` (a plain set difference) — ⛔ never `uncoveredKeys` (RD17).
- **RD11 — the R9 panel must show an out-of-date approve vote BEFORE finalize** (invariant 5; `-279` A2's 409 otherwise lands on a
  step-up-attested finalize with ⛔ nothing on screen to explain it). ⇒ `R9PanelVote` gains `covers_current_warnings: boolean | null`
  (`null` on a deny vote, or while ⛔ no warning shows), and the panel says which approve votes must be revised.
- **RD12 — 6.23a's fail-closed shape** (`assembleApprovalWarnings` in `claims.verifier-console.handlers.ts`): a throw ⇒ `available: false`,
  Approve disabled with its own words, ⛔ never "no warnings"; it runs LAST so a SQL throw cannot abort the scope transaction under a later read
  (or under a raw SAVEPOINT — the 6.23a timeline-anchor precedent in `claims.nominee-declaration.handlers.ts`). ⇒ every 6.23b surface carries
  `available` and fails the same way (Trap 15); the correction queue's late-warning arm runs under a raw SAVEPOINT (EA10).
- **RD13 — a `deferred-work.md` item names THIS story as its trigger** (section *"Recorded during Story 6.23a"*): *"The Pariwar Admin sees the
  raw `verifier_reason_code` on `PendingCaseCard.tsx:216` … Trigger: Story 6.23b, which mounts the warning-reason picker on that card and
  reads the reason next to it."* The words exist: `verifierConsoleEn.reasonCodes` (`claim-verification/i18n-en.ts`, used by
  `ReasonCodeDropdown.tsx`). ⇒ NEW AC11 / Task 8: render the label (falling back to the code for an unknown one) and close the item in place.
- **RD14 — another `deferred-work.md` trigger 0144 must ⛔ not fire:** *"`closeScopeTx` swallows every COMMIT error"* (section *"Deferred from:
  code review of 6-23-…, round 3 chunk 1"*) triggers on *"the next migration that adds a deferred constraint"*. ⇒ 0144 adds ⛔ no `DEFERRABLE`
  constraint or constraint trigger (Trap 10).
- **RD15 — 6.23a's audit convention** (code review round 3): `approval_warning_kinds` is OMITTED when the kinds are ⛔ not known at a refusal —
  ⛔ never `[]`, which reads as "no warning showed"; `warning_reason_code` is carried on the approve, on `…warning_reason_required`, and on
  `…warning_reason_unavailable` (the code the actor submitted). ⇒ EA9's audit lines follow it exactly.
- **RD16 — the `-251` waived approve is a seventh path through the wait**, ⛔ not an exception to it: `decideEscalatedClosure` calls
  `assertClaimApprovable(…, { nameCheck: 'waived_251' })`, which waives the name check ONLY ⇒ it waits too (Trap 17), and the rewritten T10
  seam test proves it.
- **RD17 (v2.1) — `uncoveredKeys` returns `[]` whenever the District Admin has ⛔ not approved** (`approval-warnings.ts:406`, its first line:
  `if (!warnings.coverage.districtAdminApproved) return [];`). That is right for the WAIT (EA2) and wrong for R9: `-279` A2's target case
  is R9 run from `verification_in_progress` / `verifier_review`, where ⛔ no District Admin approval exists — `uncoveredKeys` there passes
  EVERY vote. ⇒ the R9 per-vote check at finalize AND the panel's `covers_current_warnings` use `keysNotCoveredBy(w.keys, row.coveredKeys)`
  (RD10), ⛔ never `uncoveredKeys`. (`-279` A2's parenthetical *"`uncoveredKeys` against that row's `covered_keys`"* is a slip against the
  shipped function, as RD5's code string is — ⛔ no design change (A2's per-vote, per-key substance stands); an erratum line in the log is
  BigDev's option, ⛔ not owed.)
- **RD18 (v2.1) — the new domain inputs are OPTIONAL, as 6.23a's are.** `adjudicateClaim`'s input reads `warningReasonCode?: string | null`
  (`verifier-decision-persist.ts:263`). Typechecked tests call the later writers directly — `voteOnFrozenClaim` 37×, `castR9Vote` 36×,
  `resolveEscalation` 8×, `approveNoCorrectionNeeded` 5×, `decideEscalatedClosure` 2× (≈ 88 sites) ⇒ every new domain field is
  `warningReasonCode?: string | null`, read as `input.warningReasonCode ?? null`; ⛔ never required (or ≈ 88 sites break `pnpm -w typecheck`).
- **RD19 (v2.1) — the redetermination that creates a late key ALSO makes the recorded name check stale.** The effective declaration's
  token carries `d=${determinationId}` (`nominee-effective.ts:216`) ⇒ after the redetermination the gate refuses with the stale-name-check
  409 BEFORE its new last conjunct runs — at P3, R9 finalize, the full Super Admin approve and the "no correction needed" approve (its
  gate call, `correction-closure.ts:1507`; its earlier `check_required` at `:1500` compares the latest check with the no-correction record's
  `recorded_at`, which a redetermination does ⛔ not move). Only the `-251` waived arm reaches the wait directly. ⇒ every AC2 / Testing wait scenario re-records a PASSING name check after the redetermination (`seedNomineeNameCheck`,
  `tests/integration/_helpers.ts:1099`, or the console's record path) and only THEN expects `…late_warning_reason_required`. ⭐ On a live
  screen both can hold at once — the surface may show *"waits for the District Admin"* while the name check also blocks; that is correct.
- **RD20 (v2.1) — `PariwarClosureQueueItemDto` is ONE `.strict()` item for both kinds** (`contracts/src/claims/correction-closure.ts:231-244`,
  `kind: 'closure_request' | 'no_correction_needed'`). A closure request is a refusal path (Trap 12) ⇒ `approval_warnings:
  ApprovalWarningsSummary.nullable()`, `null` EXACTLY on `kind: 'closure_request'` (the bulk read covers only the `no_correction_needed`
  items' claims); AC7 pins both arms.
- **RD21 (v2.1) — two shipped tests go red BY DESIGN, and each is rewritten, ⛔ never deleted.** (a)
  `packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts:227` inserts `step: 'r9_vote'` expecting
  `claim_warning_approvals_step_check` — after 0144 `r9_vote` is valid (it would fail the new `…_later_step_fk_check` instead) ⇒ use a
  still-invalid value (e.g. `'not_a_step'`) for the step-CHECK assertion and move `r9_vote` into AC1's per-step FK-set cases. (b)
  `packages/contracts/tests/nominee-name-check-vocabulary-lockstep.test.ts:68-83` hand-builds a `CycleFreezePendingItem` and expects
  `success === true` ⇒ it gains `approval_warnings` (contracts tests sit outside `tsc` — only vitest sees it).

## ⚠ THE TRAPS

**Trap 1 — `resolveEscalation` runs ⛔ no approval gate,** so at an escalation's approval the `post_death_version` derivation is ⛔ not
guaranteed exact (6.23a Trap 2: it needs a current determination). ⇒ the rule there uses `readClaimApprovalWarnings` as it stands
(`post_death_version` only from a live, CURRENT determination — else `postDeath: 'awaiting_determination'` and only the 90-day keys) — safe,
because the claim **still goes to the final vote**, where the gate runs and EA4 asks again with exact warnings (Q2 C: *"even where written
reasons already exist"*). Do ⛔ not add the full gate to `resolveEscalation` — it would refuse an escalation for a claim whose accounts are not
yet collected, which `-226` cl.7 forbids (the gate's own doc-block, `nominee-name-check.ts:356`: *"⛔ `resolveEscalation` is NOT gated
separately"*). ⭐ `resolveEscalation` SUPERSEDES the live `escalated` verifier decision (`state-trustee-decision-persist.ts`, the
`liveEscalated` supersession) ⇒ after it there is ⛔ no live District Admin approval and EA2 is vacuous for that claim (AC2's never-waits arm).

**Trap 2 — the cycle-freeze card sends ⛔ no reason on Approve, by design — and the trustee presence rule must stay.** `PendingCaseCard.tsx`
builds the approve body *"WITHOUT"* a reason code or rationale (`:110-114`), and an ordinary trustee approve takes ⛔ no code
(`trusteeReasonCodeRequiredForOutcome('approved')` is false — `claim/state-trustee-decision.ts`). ⇒ the warning reason rides a SEPARATE
optional field, `warning_reason_code` — ⛔ never the trustee `reason_code` — and the rationale becomes required only when that field is sent;
⛔ never flip the presence rule, or every un-warned approve would 400. ⭐ The card's warned approve body is `{ claim_case_id, action,
[escalation_outcome], warning_reason_code, rationale }` — still ⛔ no `reason_code`; an un-warned approve body is byte-identical to today's.

**Trap 3 — the concealment override is ⛔ no longer in the way.** A concealment-flagged claim that also shows a warning can carry BOTH: the
trustee `reason_code` stays free for `concealment_override` (and its R14 snapshot, `resolveConcealmentSnapshot`), while the warning reason is
its own field and its own record row. ⭐ ONE rationale serves both (the contract already requires it for `concealment_override`). Do ⛔ not
merge the two fields. ⚠ The card never sends `concealment_override` on Approve (Trap 2) — this arm is API/domain-tested (AC4).

**Trap 4 — the "no correction needed" approve has ⛔ no note today.** `NoCorrectionNeededApproveRequest` is `z.object({}).strict()`
(`packages/contracts/src/claims/correction-closure.ts:178`) and the handler encrypts a FIXED constant (`NO_CORRECTION_NEEDED_DECISION_RATIONALE`,
`claims.correction-closure.handlers.ts:90`) BEFORE the transaction (`:528-532`) as the decision's rationale. ⇒ while a warning shows the
request must carry the Pariwar Admin's own `note` and `warning_reason_code`, and THAT note is encrypted instead (the same
`encryptTrusteeRationale`, the same field class); with ⛔ no warning the constant stays (⛔ never make the note required for every approve —
the Panel ruled only the warned case). ⚠ `NoCorrectionStrip` (`PariwarClosureStrip.tsx:152`) already has a note `<textarea>` — it belongs to
**Keep** (`no-correction-keep-note`); the approve's note is its OWN field, ⛔ never the keep note reused.

**Trap 5 — the Super Admin's closure reason is a 0131 CHECK; do ⛔ not widen it.** `CLOSURE_SUPER_ADMIN_REASONS.approved` is pinned by
`claim_correction_closures_super_admin_decision_check` (migration 0131), a state-coherence CHECK. ⇒ the warning reason rides the separate
`warning_reason_code` field and the record row — ⛔ never a new closure reason.

**Trap 6 — an R9 approve vote can be cast BEFORE a warning exists, and votes are revisable until finalize (6.14).** ⇒ the vote-time check is
best-effort (the reader's warnings, inexact like Trap 1; and `castR9Vote` takes ⛔ no claim-row lock, so a certificate re-review can commit
between the read and the vote) and the binding check is at `finalizeR9Outcome` (after its gate — exact): **each** LIVE approve vote's own
`r9_vote` record row must cover EVERY current key (RD10's `readR9VoteWarningCoverage`, then `keysNotCoveredBy` against that row's
`covered_keys` — ⛔ never `uncoveredKeys`, which returns `[]` without a District Admin approval, RD17) — ⛔ never merely "a row exists" — else a typed 409 naming the vote ids, and the voters revise (`-279` A2). ⚠ Why
per key: R9 can run from `verification_in_progress` / `verifier_review` (`R9_OUTCOME_FROM_STATES`, `state.ts:78-85`), where ⛔ no District
Admin approval exists and EA2 is vacuous — votes cast before the determination cover only the 90-day keys, and the post-death keys would
otherwise pass unanswered. ⚠ A panel member who cannot be reached holds the approval until the session is cancelled and reopened — stated,
⛔ not solved. ⚠ A revised vote is a NEW vote row with its OWN record row; the earlier vote, its note and its record row stay (history —
BigDev accepted R9's revisability, 2026-10-04). A deny vote ⛔ never needs a reason; a reason on a vote with ⛔ no warning is refused
(ungrounded — the 6.23a precedent).

**Trap 7 — the wait reaches SEVEN gate calls through ONE conjunct, and each caller maps its own errors.** `assertClaimApprovable`'s callers at
`b41ea25f`: `adjudicateClaim` (`verifier-decision-persist.ts:407`, P1 — vacuous: ⛔ no live approved decision exists while approving),
`voteOnFrozenClaim` (`state-trustee-decision-persist.ts:572`, P3), `finalizeR9Outcome` (`r9-voting-persist.ts:623`, P4) and 6.19c's three in
`correction-closure.ts` — `decideEscalatedClosure` `:1347` (the `-251` waived call — Trap 17) and `:1357`, `approveNoCorrectionNeeded` `:1507`.
⇒ map `LateWarningReasonRequiredError` in EVERY translator on a route that reaches them — FOUR translators across five handler files:
`translateDecisionError` (`claims.verification-decision.handlers.ts` — defensive, P1 is vacuous), `translateCycleFreezeError`
(`claims.cycle-freeze.handlers.ts:58`), the R9 translator (`claims.r9-voting.handlers.ts`), and `translateClosureError`
(`claims.correction-closure.handlers.ts:183`), which `claims.correction-escalation.handlers.ts` imports (`:43`) and calls — map it ONCE there.
Every translator ends `throw err`, so an unmapped typed error is a 500. Codes follow each route's prefix: `verifier_decision.`, `cycle_freeze.`,
`r9_voting.` (RD5), `closure.`. ⭐ Each caller passes its **approving actors** on the gate's options (EA2, `-279` A1). ⚠
`isReturnedClaimResubmitted` and `readNomineeNameCheckApprovalState` call the INNER helper — ⛔ never route them through the outer one (6.21a
T4). ⚠⚠ **The import direction:** EA2 makes `nominee-name-check.ts` import `approval-warnings.ts`; 6.23a NW1 forbids the reverse (and anything
that reaches `nominee-name-check.ts`, `events.ts` or `nominee-lock.ts`) — a cycle is a runtime TDZ that typecheck cannot see
([[project_type_only_import_cycle_trap]]). 6.23a's TRANSITIVE source-scan test must stay green: RD10's new read imports only `../schema/*`
and `../db.js`. ⚠ **Two error names one word apart:** 6.23a's `LateWarningReasonRefusedError` (NW14 — why a late reason cannot be RECORDED)
and this story's `LateWarningReasonRequiredError` (the WAIT — an approval held for one). ⛔ Never map one for the other.

**Trap 8 — the list surfaces are BULK; the single-claim surfaces are ⛔ not.** `getCycleFreezePending` (`claim/cycle-freeze-read.ts`) already
batches concealment and name-check flags (*"NO per-claim call in a loop"*); `listPariwarClosureQueue` (`claim/correction-closure-read.ts`) and
`listClaimsUnderCorrection` list many claims too. ⇒ `readClaimApprovalWarningsBulk` in ONE statement for those three, and the reason options
read ONCE per response — ⛔ never the per-claim reader in a loop. The R9 panel and the Super Admin's detail are one claim each (RD8) — the
per-claim reader, ⛔ not the bulk one.

**Trap 9 — sequencing.** Rows **6-24** (`-262` FQ5: the true nominee's claim waits at final approval for the appeal) and **6-26** (`-263`
FQ9: no approval before a completed inspection — a conjunct INSIDE `assertClaimApprovable`) touch the same gate and the same writers
(`-277` Consequence 2) — both `backlog` at `b41ea25f`. ⇒ whichever lands second rebases onto the other; ⛔ none drops another's check. Rows
`6-26` / `6-27` owe `-279` A6's decision before extending `APPROVAL_WARNING_KINDS` (6.23a's pin test says so). ⭐ Interaction to state, ⛔ not
prevent (the routing note's *"not asked because your words already decide it"*; 6.23a's *"Interactions to state"*): the true nominee's
refiled claim (row 6-24) shows the SAME warnings as the refused claim — the versions are the deceased's — so every later approver of it
picks a reason and writes a note too (e.g. *"the post-death change was refused on claim X"*). Expected; ⛔ no special case.

**Trap 10 — widening the record is a migration with THREE lockstep copies and composite FKs.** At `b41ea25f`: 0143's `step` CHECK lists two
values; `claim_warning_approvals_step_decision_check` is `(left(step, 15) = 'district_admin_') = (verifier_decision_id IS NOT NULL)` — it
ALREADY holds for every later step (⛔ not prefixed ⇒ `verifier_decision_id` NULL) and stays UNCHANGED; `…_step_note_check` likewise holds
(later steps carry ⛔ no note). ⇒ **0144** (next free; journal `idx` 144 after 0143's `when` `1793072400000`): (a) drop and re-add ONLY the
`step` CHECK with seven values; (b) three nullable columns `trustee_decision_id`, `r9_vote_id`, `closure_id`; (c) three UNIQUE targets (RD1)
and three COMPOSITE FKs `(pariwar_id, x)` → each parent, `ON DELETE CASCADE` (the 0143 reasoning: never `set null` — an UPDATE the trigger
refuses; never `restrict` — it breaks the `claims` cascade); (d) a NEW `claim_warning_approvals_later_step_fk_check` — exactly the step's own FK set
(`escalation_resolution` / `final_vote` / `no_correction_approval`: `trustee_decision_id` only; `r9_vote`: `r9_vote_id` only;
`super_admin_approval`: `closure_id` AND `trustee_decision_id`; the two `district_admin_*` steps: ⛔ none of the three); (e) an index per new
FK column. The THREE copies of the step list move in ONE commit: the migration CHECK, `CLAIM_WARNING_APPROVAL_STEPS` (+ the Drizzle `check()`)
in `schema/claim_warning_approvals.ts`, and the contracts mirror (`contracts/src/claims/verification-decision.ts`) — pinned by the DB ↔ TS
test (`tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts`, *"DB ↔ TS lockstep: the `step` values"*) and the contracts ↔
domain test (`contracts/tests/claims-verifier-decision.test.ts`, `CLAIM_WARNING_APPROVAL_STEPS`). `DISTRICT_ADMIN_WARNING_STEPS` is ⛔ never
widened (it is what keeps later rows out of the District Admin's coverage). ⚠ 6.23a's UPDATE guard compares `to_jsonb(NEW) - 'note_ciphertext'`,
so the new columns are append-only with ⛔ no trigger edit — prove it (AC1); the cascade exception (`pg_trigger_depth() > 1`) covers the new
parents too. ⚠ ⛔ No `DEFERRABLE` constraint (RD14). Hand-authored, statement order as 0143 (CREATE/ALTER → FKs → CHECKs → indexes); ⛔ never
regenerate an applied migration; apply it to BOTH :5432 and :5433 ([[project_live_db_test_gotchas]]).

**Trap 11 — a reason can be replaced between the page load and the submit** (6.23a Trap 16). Every later writer re-validates the chosen code
against the ACTIVE list in its own transaction through `lockActiveApprovalWarningReason` (`FOR SHARE`) ⇒ 409 `<prefix>.warning_reason_unavailable`,
⛔ never silently mapped to its replacement.

**Trap 12 — `PariwarClosureStrip.tsx` has TWO "approve"s, and only ONE is an approval of the claim.** `NoCorrectionStrip` (`:152`;
`useApproveNoCorrectionNeeded` `:153`, `data-testid="no-correction-approve"` `:204`) approves the claim — it gets the picker and the note.
`ClosureRequestStrip` (`:38`, `data-testid="closure-approve"` `:127`) decides a CLOSURE REQUEST — the 6.19c D1 closure, which ends the claim
in `denied_no_appeal` ⇒ a refusal path, and putting the picker on it would gate a refusal (invariant 4). ⛔ Never mount the picker there. ⚠
`ClosureColumn.tsx` makes ⛔ no decision at all (its header: *"⛔ No decision is made here"*) — ⛔ not an EA7 surface.

**Trap 13 — the bulk reader inherits 6.23a's out-of-date rule.** A re-reviewed certificate leaves the determination live but stale; 6.23a's
reader reports `awaiting_determination` then (6.23a NW2, `-279` A3) ⇒ the bulk form does the SAME comparison in its one statement (it reuses
`deriveClaimApprovalWarnings` — RD9), so the *"waits for the District Admin"* line and the vote-time R9 check ⛔ never use the old date. ⭐ A
parity test runs BOTH readers over DIRTY input (a stale determination, ⛔ no certificate, a released earlier claim, a vacated version) and
asserts equal results on every field EXCEPT `reasonOptions` — the bulk reader reads the list once per response, so its per-claim
`reasonOptions` is `[]` by design ([[feedback_story_validate_footguns]] #26).

**Trap 14 — shape pins and strict fixtures.** (a) `packages/domain/tests/integration/claim/correction-closure-shape.spec.ts` pins exact keys
⇒ attach at the handler (RD7) and leave it green UNMODIFIED. (b) The admin client PARSES every response (`apiFetch` → `schema.parse`,
`apps/admin/src/api/client.ts`) against `.strict()` DTOs ⇒ every hand-built fixture of a widened DTO must carry the new required fields:
`apps/admin/tests/cycle-freeze-page.test.tsx`, `pending-case-card-return.test.tsx`, `r9-case-panel.test.tsx`, `correction-closure.test.tsx`,
`correction-queue.test.tsx`, `correction-chase-forms.test.tsx` (the last two build `ClaimUnderCorrectionItem`s) — and the contracts test
`packages/contracts/tests/nominee-name-check-vocabulary-lockstep.test.ts:68-83` (a hand-built `CycleFreezePendingItem`, RD21(b)). The API
specs (`apps/api/tests/integration/claims/cycle-freeze.spec.ts`, `correction-closure.spec.ts`) do ⛔ not `.parse` — a missing field surfaces
there ONLY through the route's response serializer (a 500, caught by their `statusCode` assertions); their partial matchers cannot see it. `git grep` the field names again
before Task 8 ([[feedback_story_validate_footguns]] #31). ⛔ Never make a new field optional to dodge a fixture.

**Trap 15 — a failed warnings read disables APPROVE only, and says so.** RD12's shape on every surface: `approval_warnings.available: false`
⇒ the Approve / Resolve → Approve / approve-vote / approve-decision control is disabled with *"The nominee-change warnings could not be read,
so approval is unavailable until they load. Reload to try again."* (6.23a's `approvalWarnings.unavailable` words — reuse them); Deny, Route
to R9, Return, Refuse, Close, Keep and a deny vote stay EXACTLY as today (invariant 4). The read runs LAST in the handler (or under a raw
SAVEPOINT) so its SQL error cannot abort the transaction under another read (a 25P02 would 500 the whole list).

**Trap 16 — the expected APPROVE-PATH red set is EMPTY, so a red approve-path spec is a FINDING.** Re-verified at `b41ea25f`: the default seeded nominee
declaration is `SEEDED_NOMINEES_DECLARED_AT = 2026-01-05` (`packages/domain/tests/integration/_helpers.ts:761`; the API twin
`apps/api/tests/integration/_nominee-name-check-fixture.ts:407`), already > 90 days before any run ⇒ ⛔ no default final-vote / R9 / closure
fixture is warned, and ⛔ no shipped later-approver spec seeds a `discarded` version and approves. ⚠ Red BY DESIGN, and ⛔ not approve-path
findings: RD21's two (the policy spec's `step: 'r9_vote'` invalid-step assertion, the contracts lockstep fixture) and Trap 14's hand-built
fixtures of every widened DTO — each gains the new fields. ⇒ if any OTHER approve-path spec turns red, read why (6.23a Trap 6):
send a listed reason and a rationale if it genuinely approves over a warning — ⛔ never an opt-out flag, ⛔ never a fixture date moved into the
window. New specs date a recent change RELATIVE to now (`Date.now() - 30 * DAY`) and an old one ≥ 200 days back (6.23a Trap 5).

**Trap 17 — the `-251` waived approve waits too.** `ClaimApprovalGateOptions.nameCheck: 'waived_251'` returns from the INNER helper before the
name check (`nominee-name-check.ts`, *"the ONE waiver"*) — the wait is a conjunct of the OUTER gate, after the inner helper ⇒ the waived path
reaches it BY CONSTRUCTION (the seam's own words: *"whatever conjunct is added later — still refuses it"*). ⇒ the rewritten T10 test adds a
`waived_251` arm that STILL refuses with `LateWarningReasonRequiredError`.

## ⚖️ Decisions — the AUTHOR's (✅ COMMITTED by `-278` — `a125a59d` → `main` `a785eb0a`, 2026-10-04 — with 6.23a's NW1–NW18; EA1 / EA2 / EA5 amended and EA10 added by `-279`)

⭐ The decision CONTENT below is the committed record, except where a **(v2.0 build)** / **(v2.1 build)** marker says otherwise: those
restate HOW, after RD1–RD21 — ⛔ never what — and the one string they change is marked in place (EA5's refusal code, RD5).

- **EA1 — the record's LATER steps.** Migration **0144** (Trap 10): `claim_warning_approvals.step` gains `escalation_resolution`,
  `final_vote`, `r9_vote`, `super_admin_approval`, `no_correction_approval`; three nullable FKs — `trustee_decision_id`
  (→ `claim_state_trustee_decisions`; for `escalation_resolution`, `final_vote`, `no_correction_approval`), `r9_vote_id` (→ `claim_r9_votes`),
  `closure_id` (→ `claim_correction_closures`) — `super_admin_approval` carries BOTH `closure_id` AND `trustee_decision_id`
  (`writeApprovalChain` writes a trustee decision row for that approve too — `-279` A10; the handler also audits its `decision_id`, a
  found fact, ⛔ not A10's) — and a
  step ⇔ FK coherence CHECK (exactly the step's own FK set). Each new FK is `ON DELETE CASCADE`. Every later approval over a warning writes ONE
  row in its own transaction: the chosen reason (code + id, or the generic), ALL current keys, ⛔ no note (each step's note lives on its own
  decision row). These rows ⛔ never count toward the District Admin's coverage (6.23a NW13). ⛔ No trustee or R9 reason column, ⛔ no new enum
  value anywhere. **(v2.0 build)** the FKs are COMPOSITE `(pariwar_id, x)` with three new UNIQUE targets (RD1); `insertClaimWarningApprovalRecord`
  takes a step-discriminated input (RD2).
- **EA2 — the WAIT (`-277` Q3 B).** NEW `assertLateWarningsCovered(db, pariwarId, claimCaseId, approvingActorIds)` in 6.23a's module: where
  the claim's live verifier decision is `approved`, `uncoveredKeys(readClaimApprovalWarnings(…), { excludeLateReasonsRecordedBy:
  approvingActorIds })` must be empty, else `LateWarningReasonRequiredError` (in `claim/errors.ts`; → 409 `<prefix>.late_warning_reason_required`,
  `details: { kinds, uncovered_count, own_reason_excluded }`; words: *"This claim is waiting for the District Admin to record a reason for a
  warning that appeared after their approval. It is not refused."*). The **LAST** conjunct of `assertClaimApprovable` (after the name check —
  every refusal INSIDE the gate keeps its code and order; ⚠ `assertClaimContactRecorded` (D14) runs AFTER the gate at every writer, so a
  claim both missing its contact record and waiting now answers with the wait first — accepted: both are holds, ⛔ neither a refusal) ⇒ P3, P4 and 6.19c's approvals by construction (Trap 7), the `-251` waived one included
  (Trap 17). ⛔ Never a refusal. ⭐ It holds in `reversed` too: a District Admin approval survives a denied final vote and an appeal reversal
  (appeals ⛔ never write `claim_verifier_decisions` — 6.23a fact 3), and the District Admin answers there through 6.23a NW14.
  ⭐⭐ **The approving actors (`-279` A1).** Coverage, as judged for an approval, does ⛔ not count any `district_admin_late_reason` row whose
  `recorded_by_actor` is one of that approval's approving actors: the final voter (P3); the finalizer AND every live approve voter (P4); the
  Super Admin (`decideEscalatedClosure`, both calls); the Pariwar Admin (`approveNoCorrectionNeeded`); the District Admin at P1 (vacuous).
  They ride the gate's existing seam: `ClaimApprovalGateOptions` gains `approvingActorIds: readonly string[]` (actor ids are plain strings in
  these writers) — **required**, so typecheck finds all seven calls; `opts` loses its `= {}` default; amend the seam's doc-block (*"OMITTED by
  every existing caller"* is no longer true) and keep `nameCheck` optional; the INNER helper `assertNomineeNameCheckForApproval(…, opts:
  ClaimApprovalGateOptions = {})` (`nominee-name-check.ts:469`) takes `Pick<ClaimApprovalGateOptions, 'nameCheck'>` so it still typechecks;
  the shipped 6.19c T10 seam test (`packages/domain/tests/integration/claim/nominee-name-check.spec.ts:715-753` — it loops `[undefined, {},
  {nameCheck:'required'}]` and calls the gate with ⛔ no options at `:753`) is rewritten to pass `approvingActorIds` (domain tests ARE
  typechecked) — and gains Trap 17's arm. When a key is uncovered ONLY because an approver's own late reason was excluded, the 409 carries
  `details.own_reason_excluded: true` and says so — *"a late reason you recorded cannot clear your own approval — someone else who can approve
  claims here (the District Admin, another Pariwar Admin or the Super Admin) and who is ⛔ not approving it themselves must record theirs"*
  (at R9: ⛔ not a live approve voter or the finalizer) — and 6.23a's NW14 lets that other person record it (its `nothing_uncovered` is judged
  for the recorder). ⚠ `district_admin_approval` rows are ⛔ not excluded (one person at P1 and P3 is today's breadth, ⛔ not this story's).
  **(v2.0 build)** `own_reason_excluded` = `uncoveredKeys(w, { exclude… }).length > uncoveredKeys(w).length`; `kinds` = the kinds of the
  uncovered keys (the key's `kind:` prefix); RD3 widens the exclusion option.
- **EA3 — the escalation resolution.** `CycleFreezeDecisionRequest` gains optional `warning_reason_code` (its `superRefine`: only when
  `effectiveOutcome(action, escalation_outcome) === 'approved'` — `approve`, or `resolve_escalation` with `escalation_outcome: 'approved'`;
  requires a non-blank rationale). In `resolveEscalation`, outcome `approved`: kinds non-empty (Trap 1) ⇒ an active reason + a rationale,
  else `ApprovalWarningReasonRequiredError` (route code `cycle_freeze.warning_reason_required`); a reason with ⛔ no warning ⇒ ungrounded;
  then the `escalation_resolution` record row (its `trustee_decision_id` = the `escalation_resolution` decision row just inserted). A denying
  resolution is ⛔ never gated. **(v2.0 build)** the read and the rule run after `resolveConcealmentSnapshot` and BEFORE the supersession of
  the `escalated` verifier decision (⛔ nothing written before a refusal); the record row after `insertTrusteeDecisionRow`.
- **EA4 — the Pariwar Admin's final vote.** In `voteOnFrozenClaim`, outcome `approved`, **after** `assertClaimApprovable` (incl. EA2) and
  `assertClaimContactRecorded`: the same rule, then the `final_vote` record row. ⭐ EVERY final approval over a warning — after a District
  Admin approval (who already wrote one), after a reversal, after an escalation — *"even where written reasons already exist"* (`-277` Q2 C).
  The trustee `reason_code` is untouched (Trap 3). **(v2.0 build)** the rule (and its `FOR SHARE` reason lock) runs right after
  `assertClaimContactRecorded`, after every pre-gate write (the live-return supersession runs before the gate — leave it there; a refusal
  rolls the transaction back); the record row after `insertTrusteeDecisionRow` (its FK).
- **EA5 — the R9 vote.** `R9VoteRequest` gains optional `warning_reason_code`; `castR9Vote`: an approve vote while the reader shows warnings
  needs an active reason (the note — `rationale` — is already required), and writes the `r9_vote` record row in the vote's transaction; a
  reason with ⛔ no warning ⇒ ungrounded; `R9VoteRequest` (today `.strict()` with ⛔ no `superRefine`) gains one: `warning_reason_code` is
  refused on a `deny` vote. `finalizeR9Outcome` (approved outcome, after its gate): **each** LIVE approve vote's `r9_vote` row covers EVERY
  current key, else `R9ApproveVotesNeedWarningReasonError` → 409 **`r9_voting.approve_votes_need_warning_reason`** (**(v2.0 build — RD5)**: `-279`
  A2 wrote `r9.…`, a slip against the live prefix; `details: { vote_ids,
  uncovered_count }`) (Trap 6; `-279` A2). A deny vote and a denied outcome are ⛔ never gated. **(v2.0 build)** finalize's live-vote select
  (`r9-voting-persist.ts:599-604`, today `{ voteId, vote }`) gains `voterActorId` (A1's exclusion — the approving actors are known BEFORE the
  gate runs); the per-vote check uses RD10's `readR9VoteWarningCoverage` + `keysNotCoveredBy` (⛔ never `uncoveredKeys` — RD17) and runs after
  `assertClaimContactRecorded`, before the session UPDATE; the panel shows the same answer per vote (RD11). **(v2.1 build)** `castR9Vote`'s
  input gains `warningReasonCode?: string | null` (RD18).
- **EA6 — 6.19c's two approvals.** (a) **Super Admin** (`decideEscalatedClosure`, approve): `EscalatedClosureDecisionRequest` gains optional
  `warning_reason_code`, required on an approve while warnings show (the note is already `RequiredNote`); then the `super_admin_approval`
  record row (`closure_id` = the held row's `closureId`, `trustee_decision_id` = `chain.decisionId`). The closure reason and the 0131 CHECK
  are untouched (Trap 5). (b) **"No correction needed"** (`approveNoCorrectionNeeded`): `NoCorrectionNeededApproveRequest` gains optional
  `warning_reason_code` and `note` — both required while warnings show, and PAIRED by a `superRefine` (`note` ⇔ `warning_reason_code`): the
  handler encrypts the rationale BEFORE the transaction (`claims.correction-closure.handlers.ts:528-532`), so the domain cannot tell the
  Pariwar Admin's note from the constant — the code's presence is the signal, and a bare `note` on an unwarned claim must ⛔ never silently
  replace the constant. The handler encrypts THAT note as `decisionRationaleCiphertext` instead of the fixed constant (Trap 4); then the
  `no_correction_approval` record row (its `trustee_decision_id` is the chain's own row — `writeApprovalChain` ALREADY returns `{ claimState,
  decisionId, deniedNoAppeal }` (`ClosureChainResult`), `correction-closure.ts:667-678`; thread `decisionId`, ⛔ no signature change). Refusals, closures and keeps are ⛔ never gated. **(v2.0
  build)** the domain inputs gain `warningReasonCode?: string | null` (OPTIONAL — RD18); the rule's `note` argument is the rationale ciphertext WHEN a code was
  sent, else `null` (so a missing code is `missing: 'reason'` first). `refuse` / `close` with a `warning_reason_code` ⇒ 400 (the request
  `superRefine` — only `decision: 'approve'` carries it).
- **EA7 — every later surface SHOWS the warnings and the reasons.** NEW `readClaimApprovalWarningsBulk(db, pariwarId, claimCaseIds)` in
  6.23a's module (ONE statement — Trap 8; the out-of-date rule — Trap 13). Per claim, `waitingForDistrictAdmin` is judged for the VIEWER as a
  prospective approver (their own late-reason rows excluded — EA2's A1 rule, so the screen ⛔ never offers an approve that would 409; ON THE R9
  PANEL also every live approve voter's rows, matching what finalize excludes). Carried on: the cycle-freeze pending case (every bucket), the
  R9 panel, the Super Admin's detail and the "no correction needed" queue; each response carries the Pariwar's active `reason_options` ONCE
  (label, when to use, added by / on). UIs mount 6.23a's `ApprovalWarningReasonPicker`: `PendingCaseCard.tsx` (Approve `:263` and Resolve →
  Approve `:291`), `R9CasePanel.tsx` (an approve vote), `EscalationPanel.tsx` (approve), `PariwarClosureStrip.tsx` (`NoCorrectionStrip`'s
  approve ONLY, + its own note field — ⛔ never `ClosureRequestStrip`'s `closure-approve`, Trap 12). With warnings: the line, the picker (⛔
  nothing pre-selected), the note required; *"waits for the District Admin"* disables Approve with those words. ⛔ No member name, ⛔ no date.
  **(v2.0 build)** — the wire block, snake_case (RD4), `.strict()`, NEW `ApprovalWarningsSummary` in `contracts/src/claims/verification-decision.ts`
  beside 6.23a's DTOs:
  `{ available: boolean, kinds: ApprovalWarningKind[], post_death: 'evaluated' | 'awaiting_determination', waiting_for_district_admin: boolean,
  own_reason_excluded: boolean }` — on `CycleFreezePendingItem.approval_warnings`, `R9PanelResponse.approval_warnings`,
  `PariwarClosureQueueItemDto.approval_warnings` (`.nullable()` — `null` EXACTLY on `kind: 'closure_request'`, RD20) and
  `EscalatedClosureDetailResponse.approval_warnings`;
  `reason_options: ApprovalWarningReasonOption[]` at each RESPONSE's top level (`CycleFreezePendingResponse`, `R9PanelResponse`,
  `PariwarClosureQueueResponse`, `EscalatedClosureDetailResponse`); `R9PanelVote.covers_current_warnings` (RD11). Attached in the HANDLER
  after the domain read (RD7) — the per-claim reader for the R9 panel and the Super Admin's detail, the bulk reader for the two lists (RD8) —
  fail-closed (Trap 15). The shared words live in `verifierConsoleEn.approvalWarnings` (RD6).
- **EA8 — notes are ⛔ never replaced here either (6.23a NW18).** Traced at `2059482b` and re-traced at `b41ea25f`: ⛔ no revise path exists for
  a trustee decision or a 6.19c approval (only `superseded_at` writes for returns, escalations and routing rows); every new record row is
  append-only. ⚠ R9 votes stay revisable before finalize (Trap 6) — history kept.
- **EA9 — audit, and nothing else moves.** Each approve audit context gains `approval_warning_kinds` and `warning_reason_code` (RD15's
  convention: kinds OMITTED when unknown, ⛔ never `[]`); a `late_warning_reason_required` refusal's line carries `uncovered_count` and
  `own_reason_excluded`; ⛔ no new route (requests are widened only — the human-actor gate entries are unchanged, but RE-RUN it
  `scripts/claim-adjudication-human-actor-invariant/`); ⛔ no new claim event (35); ⛔ no new permission key (6.23a's 51 / 65 stands); ⛔ no
  member-app change (⇒ ⛔ no `friction-budget.md` block is owed; if any member-facing file is touched after all, one IS — AC-4 diffs committed
  history, [[project_friction_budget_baseline_ratchet]]).
- **EA10 — the District Admin is TOLD (`-279` A4; BigDev: *"Correction queue, in 6.23b"*).** Without it the wait is the 6.18 failure again
  (`correction-queue-read.ts`'s header: *"the District Admin could act on a return ONLY if somebody told them the claim id out of band"*).
  `listClaimsUnderCorrection` (`claim/correction-queue-read.ts`) also lists a claim whose live District Admin approval leaves a current
  warning key uncovered by any District Admin row. ⭐ TODAY a late key can arise ONLY through a determination recorded after the approval (6.23a
  fact 3; ⚠ until row 6-22 ships — Task 9's deferred item: once a member is found innocent, a member declare can add a
  `recent_nominee_change` key with ⛔ no new determination, which this arm would miss) ⇒ the SQL superset (`candidateBatch`'s `OR EXISTS …` block) gains the TIGHT arm *"a live `approved` verifier decision AND a live
  `nominee_determinations` row whose `decided_at` > that decision's `decided_at`"* (both `timestamptz`, compared in SQL) — ⛔ never "every
  approved claim" (that re-creates the crowding the 2026-09-23b review removed); ⚠ the post-filter in `qualifyingRows` (`if
  (!hasLiveUnresubmittedReturn && !sentBackByCheck) continue;`, `:285`) gains a THIRD arm (`lateWarningAwaitingReason`), or it drops every new
  row; the module header (*"'Under correction' is `resolveClaimCorrectionState`'s answer"*) is amended to name the third arm; a
  late-warning-only row has ⛔ no live return, so its chase summary carries `return_decision_id: null` (null fields —
  `CorrectionChaseSummaryDto` has ⛔ no `empty` state) and closure readiness `no_live_return` — the UI hides those actions for it. The arm is evaluated inside the existing `CORRECTABLE_SCAN_STATES` (`:47` — it covers `verifier_approved`, `reversed`,
  `state_trustee_freeze`, every state a late key can arise in, 6.23a fact 3), through `readClaimApprovalWarningsBulk` (⛔ no per-claim loop).
  Coverage here is the District Admin's own (⛔ no actor exclusion — the queue asks whether ANY District Admin answer exists). ⚠ Accepted gap,
  recorded (Task 9's deferred item): a key covered ONLY by a late reason whose recorder later approves is ⛔ not queued — the approver's 409
  (`own_reason_excluded`) tells them to ask, and NW14 lets the other person answer. **(v2.0 build)** the domain row gains
  `lateWarningAwaitingReason: boolean` and `lateWarningUncoveredCount: number`; the wire item (`ClaimUnderCorrectionItem`,
  `packages/contracts/src/claims/nominee-name-check.ts:380`) gains `late_warning_awaiting_reason` and `late_warning_uncovered_count` (RD4); the
  third arm's bulk read runs under a raw SAVEPOINT — on a throw the two existing arms still list, the late arm adds nothing, and the
  RESPONSE carries `late_warnings_unavailable: true`. **(v2.1 build) — the channel:** the bulk read sits in `qualifyingRows` (the `:285`
  post-filter would otherwise drop every late-only candidate); `listClaimsUnderCorrection` KEEPS its `Promise<ClaimUnderCorrectionRow[]>`
  return (three domain spec files call it — `nominee-name-check-return-loop.spec.ts`, `nominee-name-check-tenant-isolation.spec.ts`,
  `nominee-determination-bulk-path.spec.ts` — unchanged) and gains `opts.onLateWarningsUnavailable?: () => void`, which the handler passes
  to set the flag, so the queue says *"Late warnings could not be checked just now — reload to try again"*. The SAVEPOINT is
  ``db.execute(sql`SAVEPOINT late_warning_arm`)`` / `RELEASE` / `ROLLBACK TO` per batch — the in-package shape of
  `packages/domain/src/contribution/write.ts:226` (``db.execute(sql`SAVEPOINT attest_contribution_utr`)``)
  (invariant 7; RD12). `CorrectionQueueRoute.tsx` shows *"a late warning awaits your reason"* and links to the console. ⛔ No new route — the
  queue's existing one (`claims.nominee-name-check.handlers.ts`, the `listClaimsUnderCorrection` call).

## Acceptance Criteria

### AC0 — Governance and re-pin (Task 0)
**Given** this story is about to start **Then** 6.23a is `done` (✅ row `6-23-post-death-nominee-change-warnings`, PR #255); `-278` carries
EA1–EA9, `-279` carries A1, A2, A3, A4, A5, A6, A10, A11 as written here (EA1 / EA2 / EA5 amended, EA7 reached (A3), EA10 added; A6 → Trap 9,
A11 → *What moves*), and `-280` adds `state_trustee_approved`
to NW14 (✅ verified 2026-10-05: `-280` is the newest entry; ⛔ no later entry names `6-23`, `warning`, `reason` or `coverage`) — if a newer
entry exists at build time, read it first and STOP on any that moves an EA; the baseline `b41ea25f` is an ancestor of HEAD, and
`git diff --name-only b41ea25f..HEAD -- packages apps scripts` is re-read against every `file:NNN` below.

### AC1 — The record's later steps (EA1; Trap 10; RD1, RD2)
**Then** 0144 widens `step` (seven values), adds the three nullable columns, the three UNIQUE targets and the three COMPOSITE FKs with the
coherence CHECK, and an index per new column; the policy-regression spec proves each new step accepts exactly its own FK set
(`super_admin_approval`: `closure_id` AND `trustee_decision_id`) and refuses every other combination, that a row pointing at ANOTHER Pariwar's
trustee decision / vote / closure is refused by the composite FK (the 6.23a round-1 regression shape), and that the rows stay append-only (an
UPDATE of a new column refused; the cascade from `claims` still deletes); both lockstep tests pass (DB ↔ TS, contracts ↔ domain) **and** a
later step's row ⛔ never counts toward the District Admin's coverage (`readClaimApprovalWarnings` unchanged for a claim with only later rows)
**and** `insertClaimWarningApprovalRecord`'s two 6.23a callers compile unchanged **and** 0144 has ⛔ no `DEFERRABLE` constraint.

### AC2 — The wait (EA2; `-277` Q3 B; Traps 7, 17)
**Given** a claim the District Admin approved over a warning, whose certificate is then re-reviewed to an earlier date and redetermined, so a
NEW warning key is uncovered — ⭐ and a PASSING name check re-recorded after the redetermination (RD19: the new determination id makes the
old check stale, and the gate would 409 on THAT first; every arm below except the `-251` waived one needs this step) **Then** the final vote, an R9 approve outcome and 6.19c's approvals answer **409 `…late_warning_reason_required`**
(`cycle_freeze.` / `r9_voting.` / `closure.`; ⛔ nothing written; the claim is ⛔ not refused) **and** after the District Admin records a late
reason (6.23a NW14) the same approval proceeds **and** the same holds on 6.23a fact 3's path — District Admin approved → final vote denied →
appeal reversed → re-reviewed in `reversed` → the next final vote waits until NW14 **and** a claim with ⛔ no District Admin approval
(escalated-and-resolved; refused by the District Admin and then reversed on appeal) never waits on this conjunct **and** a claim with ⛔ no
warnings never waits **and** P1 is unaffected **and** (`-279` A1) a Pariwar Admin who records the late reason THEMSELVES and then votes
approve still gets the 409 — while the same late reason recorded by ANOTHER `claim.approve` holder lets that vote proceed; likewise an R9
finalize where the recorder is the finalizer or a live approve voter **and** that 409 carries `details.own_reason_excluded: true` with its
words, and a District Admin's or the Super Admin's NW14 then succeeds (⛔ not `nothing_uncovered`) and the vote proceeds **and** every one of
the seven gate calls passes `approvingActorIds` (typecheck: the field is required) and the rewritten T10 seam test passes — incl. a
`waived_251` arm that STILL waits (Trap 17) **and** (`-280`) a claim in `state_trustee_approved` routed to R9, whose only late-key cover is a
late reason recorded by an approve voter, 409s at finalize with `own_reason_excluded` — and after the District Admin (or the Super Admin)
records a late reason THERE (NW14 records in `state_trustee_approved`), finalize proceeds.

### AC3 — The escalation resolution (EA3)
**Given** an escalated claim showing a warning **Then** resolving it to approved without an active `warning_reason_code` + a rationale ⇒ 400
(the contract — code without rationale) / 409 `cycle_freeze.warning_reason_required` (⛔ no code); a replaced reason ⇒ 409
`cycle_freeze.warning_reason_unavailable`; with an active one ⇒ resolved and ONE `escalation_resolution` record row (its
`trustee_decision_id` the new decision row); a reason with ⛔ no warning ⇒ 409 `cycle_freeze.warning_reason_ungrounded`; a refusal leaves the
`escalated` verifier decision LIVE (⛔ nothing written); a denying resolution is unchanged; `warning_reason_code` with `action: 'deny'`,
`route_to_r9` or `return_to_district_admin` ⇒ 400.

### AC4 — The final vote (EA4)
**Given** a claim at the final vote showing a warning — after a District Admin approval over it, after a reversal, and after an escalation
**Then** approving without an active reason + a rationale ⇒ 409 (each origin tested); with them ⇒ approved and ONE `final_vote` record row; a
deny, a route to R9 and a return are unchanged; a concealment-flagged + warned claim approves with `concealment_override` AND a warning reason
— both recorded, the R14 snapshot kept (Trap 3); an un-warned approve with the card's existing body (⛔ no reason, ⛔ no rationale) still
succeeds.

### AC5 — The R9 vote (EA5; RD5, RD10, RD11)
**Then** an approve vote while warnings show without an active reason ⇒ 409 `r9_voting.warning_reason_required`; with one ⇒ the vote and its
`r9_vote` record row in one transaction; a deny vote is never gated; a reason with ⛔ no warning ⇒ 409 `r9_voting.warning_reason_ungrounded`;
a revised vote leaves the earlier vote, its note and its record row in place; finalize (approved) with any live approve vote whose record
row does ⛔ not cover every current key (or that has none) while warnings show ⇒ 409 `r9_voting.approve_votes_need_warning_reason` with
`vote_ids`, and after the voters revise ⇒ finalized **and** (`-279` A2) a session routed from `verification_in_progress` whose votes each
covered only the 90-day key, then a determination adds a post-death key ⇒ finalize 409s with those vote ids, and after each voter revises
with a reason covering every current key ⇒ finalized **and** a `warning_reason_code` on a deny vote ⇒ 400; a denied outcome is never gated
**and** for a claim whose determination is CURRENT, the panel's `covers_current_warnings` is `false` for exactly the vote ids that finalize
would name, `true` for the others, `null` for deny votes and when ⛔ no warning shows (with a stale determination the panel sees ⛔ no
post-death key and finalize refuses earlier, at the gate — ⛔ not compared) **and** both use `keysNotCoveredBy`, ⛔ never `uncoveredKeys`
(RD17) — a session routed from `verification_in_progress` with ⛔ no District Admin approval still names its uncovered votes.

### AC6 — 6.19c's approvals (EA6; Trap 17)
**Then** a Super Admin approve of a warned held claim without an active `warning_reason_code` ⇒ 409 `closure.warning_reason_required` (the
note already required); with it ⇒ approved and ONE `super_admin_approval` row (`closure_id` + `trustee_decision_id`), the closure reason and
0131 CHECK unchanged; the `-251` waived approve obeys the SAME rule **and** a "no correction needed" approve of a warned claim without
`warning_reason_code` + `note` ⇒ 409 `closure.warning_reason_required`; with them ⇒ approved, the Pariwar Admin's note encrypted as the
decision rationale (⛔ not the constant — decrypt the row and compare), ONE `no_correction_approval` row; an un-warned approve still sends `{}`
and stores the constant; a `note` without `warning_reason_code` (or the reverse) ⇒ 400; `warning_reason_code` on a `close` / `refuse` ⇒ 400
**and** closures, refusals and keeps are unchanged.

### AC7 — Every surface shows the warnings and the reasons (EA7; Traps 8, 14, 15; RD4, RD6–RD9, RD11)
**Then** `readClaimApprovalWarningsBulk` serves the two lists in ONE statement — a live statement-count test (the real-statement counter of
`apps/api/tests/integration/claims/verifier-console.spec.ts`, *"rows grew the REAL statement count"*): ⛔ no growth from 1 to 10 warned claims
— and returns, for every claim, exactly what `readClaimApprovalWarnings` returns on every field except `reasonOptions` (the dirty-input
parity test, Trap 13); the reason options
are read once per response; each of the four surfaces shows the warning line (`kindLine` per kind) and 6.23a's picker — every reason with its
label, "when to use" and *"added by {name} on {date}"* / *"built in"*, ⛔ nothing pre-selected — requires the note, and shows *"waits for the
District Admin"* (Approve disabled, with those words; with `own_reason_excluded`, the own-reason words) when a late warning is uncovered for
THIS viewer; `available: false` disables ONLY the approve control, with the unavailable words (Trap 15); every new 409 code maps to its own
words — ⛔ never *"try again"* or a raw code **and** on `PariwarClosureStrip.tsx` ONLY `NoCorrectionStrip`'s approve carries the picker — the
closure-request `closure-approve` has ⛔ none (Trap 12), and the queue's `approval_warnings` is `null` on every `closure_request` item and a
summary on every `no_correction_needed` item (RD20) **and** every fixture of a widened DTO carries the new fields (incl. the contracts lockstep fixture — RD21(b)) and
`correction-closure-shape.spec.ts` passes unmodified (Trap 14).

### AC8 — Nothing else moves (EA8, EA9)
**Then** ⛔ no new route, claim event, permission key, enum value or member-app change; every refusal / closure / keep / route / return / deny
vote is unchanged; ⛔ no route edits or replaces a note; the human-actor, access-wrapper and microcopy gates pass; 6.23a's transitive
import-scan test passes; `contracts:check-openapi-determinism` is green; the audit lines follow RD15.

### AC9 — The proof
**Then** the suites in *Testing* exist and each new test was shown to fail before its code; live-DB specs `{ timeout: 20000 }`, own-commit,
membership-not-counts; `pnpm -w typecheck`, lint, the domain / contracts / api / admin suites and `ci:local` (with `DATABASE_URL` → :5433) are
run (flakes named, ⛔ never silently re-run); 0144 applied to BOTH :5432 and :5433.

### AC10 — The District Admin is told (EA10; `-279` A4)
**Given** a claim the District Admin approved, with a current key now uncovered by any District Admin row **Then** it appears in the District
Admin's correction queue with `late_warning_awaiting_reason: true` (+ `late_warning_uncovered_count`) and *"a late warning awaits your
reason"*, linking to the console, with the chase-summary and closure actions HIDDEN on a late-warning-only row **and** after NW14 covers it,
it leaves the queue (unless under correction for another reason) **and** a claim that is BOTH returned and late-warned shows both **and** the
queue's read stays ONE bulk evaluation per batch (⛔ no per-claim loop) **and** a forced failure of the late arm still lists the returned
claims with `late_warnings_unavailable: true` **and** ⛔ no new route.

### AC11 — The deferred item routed here (RD13)
**Then** `PendingCaseCard.tsx` shows the verifier's reason as its words from `verifierConsoleEn.reasonCodes` (an unknown code falls back to
the code itself, ⛔ never blank) **and** `deferred-work.md`'s item (section *"Recorded during Story 6.23a"*, *"The Pariwar Admin sees the raw
`verifier_reason_code`…"*) carries an appended *"✅ Closed by Story 6.23b (AC11)"* line — the item text is ⛔ not deleted.

## Tasks / Subtasks

- [x] **Task 0 — Re-pin and governance check (AC0).** `git merge-base --is-ancestor b41ea25f HEAD`; `git diff --name-only b41ea25f..HEAD --
  packages apps scripts` — re-read any cited file in it; `grep -n "^### Decision" .decision-log.md | head -3` — `-280` must still be the newest,
  else read the newer ones for `6-23`, `warning`, `reason`, `coverage` (STOP on any that moves an EA).
- [x] **Task 1 — Migration 0144 + schema (AC1).** EA1 / Trap 10 / RD1: the step CHECK, three columns, three UNIQUE targets, three composite
  FKs, the later-step FK CHECK, three indexes; journal entry (`idx` 144); Drizzle: `schema/claim_warning_approvals.ts` (the columns, the
  `foreignKey()`s, the `check()`s, `CLAIM_WARNING_APPROVAL_STEPS`) and a `unique()` in each parent's schema file; the contracts step mirror;
  extend the policy-regression spec and REWRITE its `step: 'r9_vote'` invalid-step assertion (`:227`) to a still-invalid value (RD21(a));
  `db:check` / `schema:check` green.
- [x] **Task 2 — Domain: the wait, the readers, the record insert (AC1, AC2, AC5, AC7).** In `claim/approval-warnings.ts`:
  `readClaimApprovalWarningsBulk` (RD9 — ONE statement, reusing `deriveClaimApprovalWarnings`), `readR9VoteWarningCoverage` (RD10),
  `assertLateWarningsCovered` (EA2), the pure `keysNotCoveredBy(keys, coveredKeys)` (RD17 — R9's comparison, ⛔ never `uncoveredKeys`),
  RD3's exclusion widening, RD2's step-discriminated `insertClaimWarningApprovalRecord`. In
  `claim/errors.ts`: `LateWarningReasonRequiredError` (`kinds`, `uncoveredCount`, `ownReasonExcluded`) and
  `R9ApproveVotesNeedWarningReasonError` (`voteIds`, `uncoveredCount`). In `nominee-name-check.ts`: the LAST conjunct of `assertClaimApprovable`
  (and its doc-block's conjunct list + the seam doc-block), `ClaimApprovalGateOptions.approvingActorIds` (required; `opts` loses its default),
  the inner helper's `Pick<…,'nameCheck'>`; thread the actors at all seven gate calls; rewrite the T10 seam test
  (`nominee-name-check.spec.ts:715-753`) incl. Trap 17's arm. ⚠ Keep the import scan green (Trap 7).
- [x] **Task 3 — Domain: the final vote and the escalation (AC3, AC4).** `voteOnFrozenClaim` and `resolveEscalation` per EA3 / EA4 — input
  `warningReasonCode?: string | null`, read `?? null` (OPTIONAL — RD18; ≈ 45 typechecked test calls stay unchanged); `readClaimApprovalWarnings` → `lockActiveApprovalWarningReason` (only when kinds non-empty and a code
  was sent — the `adjudicateClaim` shape) → `assertApprovalReasonCoversWarnings` (note = the rationale ciphertext) → the record row after the
  decision row; `approvalWarningKinds` on `TrusteeDecisionResult`.
- [x] **Task 4 — Domain: R9 (AC5).** `castR9Vote` (input `warningReasonCode?: string | null` — RD18; best-effort rule + the `r9_vote` row,
  its `r9_vote_id` the new vote) and
  `finalizeR9Outcome` (binding, PER VOTE, PER KEY via `keysNotCoveredBy` — `-279` A2, RD17) per EA5; `voterActorId` on the live-vote select; the approving actors =
  finalizer + live approve voters; the per-vote check after `assertClaimContactRecorded`, before the session UPDATE; the typed error with
  `voteIds`.
- [x] **Task 5 — Domain: 6.19c (AC6).** `EscalatedClosureDecisionInput` (the `approve` arm) and `approveNoCorrectionNeeded`'s input gain
  `warningReasonCode?: string | null` (OPTIONAL — RD18); the rule after the gate + contact check; the record row after `writeApprovalChain` (its `decisionId`; the closure's
  `closureId` for the Super Admin) — both the `-251` and the full-gate approve.
- [x] **Task 6 — Contracts (AC3–AC7, AC10).** `warning_reason_code` on `CycleFreezeDecisionRequest` (its `superRefine` via `effectiveOutcome`
  — ONE flat `.strict()` object, ⛔ not a discriminated union), `R9VoteRequest` (its FIRST `superRefine` — ⛔ no code on a deny),
  `EscalatedClosureDecisionRequest` (approve only); `{ warning_reason_code, note }` on `NoCorrectionNeededApproveRequest` (paired); NEW
  `ApprovalWarningsSummary`; `approval_warnings` + `reason_options` on the four read DTOs (`.nullable()` on `PariwarClosureQueueItemDto`,
  `null` on `closure_request` — RD20); `R9PanelVote.covers_current_warnings`;
  `ClaimUnderCorrectionItem.late_warning_awaiting_reason` / `late_warning_uncovered_count` and the queue response's
  `late_warnings_unavailable`; the step mirror (Task 1). ⚠ ⛔ No contracts test pins these request shapes today (`claims-cycle-freeze.test.ts`,
  `r9-voting.test.ts`, `correction-closure-lockstep.test.ts` test `safeParse` behaviour and `.strict()` smuggling only;
  `NoCorrectionNeededApproveRequest` has ⛔ no test at all) — WRITE the new rules' tests; add `approval_warnings` to the hand-built
  `CycleFreezePendingItem` in `nominee-name-check-vocabulary-lockstep.test.ts:68-83` (RD21(b)); contracts tests sit outside `tsc` — run
  vitest ([[project_contracts_tests_outside_tsc]]).
- [x] **Task 7 — API (AC2–AC8, AC10).** Map `LateWarningReasonRequiredError`, `ApprovalWarningReasonRequiredError`,
  `WarningReasonUnavailableError`, `WarningReasonUngroundedError` and `R9ApproveVotesNeedWarningReasonError` in the FOUR translators of Trap 7
  (each in words that say the claim is ⛔ not refused; `details` codes and counts only); pass `body.warning_reason_code` to each writer;
  D27's note encryption (Trap 4); the read DTOs attached in the handlers, fail-closed (Trap 15 — `getCycleFreezePending` handler `:288`,
  `getR9Panel` handler `:276`, `listPariwarClosureQueue` handler `:449`, and `getEscalation` — the GET — at
  `claims.correction-escalation.handlers.ts:127`; ⛔ never the `:239` call, which is `decideEscalation`'s POST pre-check (`-274` 1a), whose
  response is `ClosureDecisionClaimResponse`); the correction queue's new fields; the audit contexts (RD15).
- [x] **Task 8 — Admin (AC7, AC10, AC11).** Mount 6.23a's picker on `PendingCaseCard.tsx` (Approve + Resolve → Approve; the warned body per
  Trap 2), `R9CasePanel.tsx` (an approve vote; the per-vote *"must be revised"* line from `covers_current_warnings`), `EscalationPanel.tsx`
  (approve), `PariwarClosureStrip.tsx` (`NoCorrectionStrip`'s approve ONLY + its OWN note field — Trap 4, Trap 12); `apps/admin/src/api/client.ts`
  — `approveNoCorrectionNeeded(pariwarId, claimCaseId)` posts `{}` today (`:1539-1541`) — and its hook (`hooks.ts:932`, `mutationFn` takes only
  `claimCaseId`) take the optional body; the R9-vote, cycle-freeze and escalated-closure payload types gain `warning_reason_code`; the shared
  words in `verifierConsoleEn.approvalWarnings` (a `later` block: the waits line, the own-reason line, the R9 *"vote must be revised"* line,
  the D27 note label/error) and one message helper per new code suffix in `claim-verification/nominee-errors.ts`, wired into
  `CycleFreezePage.tsx`'s (`:55`) and `R9CasePanel.tsx`'s (`:26`) `errorMessage` — one `endsWith` arm per new suffix (RD6); `CorrectionQueueRoute.tsx` (EA10); AC11's label. English-only staff
  copy (never `report` / `receipt` / `invoice` / `passbook` — the active microcopy terms). Family-13 accessibility as 6.23a: the selection
  announced, a missing reason or note SAID (`role="alert"`), ⛔ never a silently disabled button; a 409 refetches the list (6.23a round 4).
- [x] **Task 9 — Tests and records (AC8, AC9, AC11).** See *Testing*. `deferred-work.md` — a NEW section *"Recorded during Story 6.23b"*:
  R9 votes revisable before finalize — notes kept as history (BigDev accepted; trigger: a Panel instruction to lock them); a late key covered
  ONLY by a late reason whose recorder then approves is ⛔ not queued by EA10 (the 409's `own_reason_excluded` words carry it; trigger: a held
  claim reported); ⚠ the R9 residual — a live approve voter may still record a late reason (6.23a's NW14 knows ⛔ nothing of R9) that ⛔ never
  counts at finalize, and in a Pariwar where EVERY `claim.approve` holder at the district is a live approve voter or the finalizer, ⛔ nobody
  can answer (exit: a vote change, or the session re-run; trigger: a held R9 claim reported); ⚠ the later approvers' notes on
  `claim_state_trustee_decisions.rationale_ciphertext` / `claim_r9_votes.rationale_ciphertext` are ⛔ not in the anonymizer — the same class as
  6.23a's verifier-rationale item (cross-reference it, ⛔ not a duplicate; the Super Admin's note,
  `claim_correction_closures.super_admin_note_ciphertext`, is ALREADY the item *"No RTBF path reaches the 6.19c tables' Tier-1 columns"* —
  cross-reference that too; trigger: the next RTBF pass over the claim-adjudication tables); ⚠ EA10's late-warning arm keys on a NEW
  determination, and once row 6-22 lifts the declaration lock for a member found innocent, a member declare can add a
  `recent_nominee_change` key with ⛔ no new determination — ⛔ not queued (trigger: row 6-22 lands — add an arm on a member-source version
  recorded after the live approval). AC11's closure line on the RD13 item.
- [x] **Task 10 — The District Admin's queue (AC10).** EA10: the SQL superset arm + `readClaimApprovalWarningsBulk` under a raw SAVEPOINT
  inside `qualifyingRows`; the `opts.onLateWarningsUnavailable` callback (the return type stays an array — EA10's channel);
  `ClaimUnderCorrectionRow` / `ClaimUnderCorrectionItem` gain the two fields; the queue response gains `late_warnings_unavailable`;
  `claims.nominee-name-check.handlers.ts` maps them; the module header amended to name the third arm; `CorrectionQueueRoute.tsx` shows the
  line and the console link and HIDES the chase-summary and closure actions on a late-warning-only row (⛔ no live return); its tests.

### Review Findings

Code review (2026-10-06), chunked by layer (domain → contracts → api → admin), 3 layers per chunk (Blind Hunter, Edge Case Hunter,
Acceptance Auditor), run in parallel. 12 layer runs, ~86 raw findings → deduplicated and triaged. Every patch below was applied directly
against the code (not just proposed) and verified: `tsc --noEmit` clean and the full test suite green in all four packages after each
layer's changes (domain: 149 unit files / 2405 tests + 175 integration files / 2104 tests against :5433; contracts: 74 files / 1265 tests;
api: 25 integration files / 363 tests against :5433; admin: 58 files / 899 tests). Several findings that looked real on first read turned
out to be false positives once traced against the actual code or run against the real DB — see Dismissed, below — including a few found
only while implementing the patches around them (noted inline).

**Decision-needed — all 4 resolved (2 → Patch, 2 → Dismissed):** see below; the 2 resolved-to-patch are folded into the domain list.

**Patch — domain (11 applied, 1 skipped):**

- [x] EA10's "⛔ never none waiting" invariant silently broke on a fault [packages/domain/src/claim/correction-queue-read.ts] — `candidateBatch` now also SELECTs `lateWarningCandidate` (the same EXISTS the WHERE clause already tested, exposed as a column — no extra query cost); `qualifyingRows` no longer lets `lateWarnings === null` default a late-warning-only candidate's `lateWarningAwaitingReason` to `false` — it keeps the row with `lateWarningAwaitingReason: true` (count unknown, 0) instead of dropping it. Covered by the rewritten "ONE bulk evaluation per batch" domain test AND the API-layer Trap 15 test (both updated to assert the row now survives). *⚠ Appended — code review round 2 (decision B): the kept row's count is now `null` (uncounted), ⛔ not `0`; round 3: those rows count toward the page, so the banner says a full page may be incomplete.*
- [x] Non-deterministic `LIMIT 1` in the `cur` LATERAL join [packages/domain/src/claim/approval-warnings.ts] — added `ORDER BY r.decided_at DESC, r.review_id DESC`.
- [x] `readLateWarningArm`'s bare `catch` swallowed every exception with no logging [packages/domain/src/claim/correction-queue-read.ts] — now `console.warn`s the caught error before returning `null`.
- [x] `kindsOfKeys` truncated the last character of a malformed key [packages/domain/src/claim/approval-warnings.ts] — guards `indexOf(':') === -1` explicitly.
- [x] Unbounded `IN (...)` in both bulk readers [packages/domain/src/claim/approval-warnings.ts] — added a shared `MAX_BULK_READ_IDS = 500` cap, thrown past in both `readClaimApprovalWarningsBulk` and `readR9VoteWarningCoverage`. *⚠ Appended — code review round 2: the THROWN cap was wrong (the cycle-freeze page reads three 500-row buckets ⇒ every case failed closed); now `BULK_READ_SLICE` — read in ≤ 500-id slices, ⛔ never thrown.*
- [x] Hardcoded absolute dates in `seedLaterParents` [packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts] — now `(now() - interval '95 days')::date` / `now() - interval '5 days'`, preserving the original 90-day gap.
- [x] "Forced SQL failure" test didn't exercise the real failure mode [packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts] — now corrupts every UUID-shaped bound parameter of the REAL statement (a genuine `invalid input syntax for type uuid` from Postgres) instead of substituting `SELECT 1/0`. Test also rewritten for the EA10 fix above: `late.cid`/`second.cid` now correctly survive the forced fault.
- [x] Race test's comment overclaimed what it proves [packages/domain/tests/integration/claim/approval-warnings-every-approver-race.spec.ts] — corrected the comment to describe what's actually tested (the reason-lock held across commit) rather than seeding a full parent-decision chain just to validate an incidental claim (disproportionate for what this test's scope is).
- [x] `insertClaimWarningApprovalRecord`'s `in`-only narrowing [packages/domain/src/claim/approval-warnings.ts] — now also checks `!== undefined` on each of the four FK fields' VALUES, not just key presence.
- [x] Dead runtime code for a compile-time exhaustiveness check [packages/domain/src/claim/approval-warnings.ts] — replaced `const x: ... = true; void x;` with a type-only `AssertNever<T extends never>` pattern (erased entirely at compile time).
- [x] `summarizeApprovalWarningsFor` had zero test coverage [packages/domain/src/claim/approval-warnings.ts; packages/domain/tests/claim/approval-warnings.test.ts] — **correction to the original finding**: it is NOT dead code — `apps/api/src/modules/claims/later-approval-warnings.ts:120` calls it; Blind Hunter couldn't see this (domain-only diff, blind to the api chunk). Added 3 unit-test cases covering the no-warning / own-reason-excluded-wait / anyone-uncovered-wait branches.
- [ ] **SKIPPED** — Redundant duplicate reads of `readClaimApprovalWarnings` across 5 later-approver call sites [packages/domain/src/claim/{r9-voting-persist,state-trustee-decision-persist,correction-closure}.ts] — real, but the fix (thread one read through `assertLateWarningsCovered` → `assertClaimApprovable` → every caller, changing both functions' exported signatures) touches this story's own ~88 typechecked test call sites for a pure efficiency win with no correctness impact. Blast radius disproportionate to severity; left as a follow-up item, not applied.

**Patch — contracts (11 applied, 1 found-already-done):**

- [x] No cross-field validation between the two late-warning fields [packages/contracts/src/claims/nominee-name-check.ts] — `ClaimUnderCorrectionItem` gets a `superRefine`: a nonzero `late_warning_uncovered_count` now requires `late_warning_awaiting_reason: true` (one-directional, since the reverse can legitimately hold during a fault — see the EA10 fix above). *⚠ Appended — code review round 2: now a BICONDITIONAL — the flag ⇔ the count is `null` or nonzero (round 1's "the reverse can legitimately hold" `true` + `0` pair is gone); round 3 adds a response-level rule (`null` ⇒ `late_warnings_unavailable: true`).*
- [x] Weak blank-note test assertion [packages/contracts/tests/approval-warnings-later-approvers.test.ts] — now asserts the failure path (`'note'`) via `failsAt`, not just `success: false`.
- [x] "Warning code needs a non-blank note" implemented 3 ways [packages/contracts/src/_common/primitives.ts (new `isBlank` export); cycle-freeze.ts; correction-closure.ts] — both `CycleFreezeDecisionRequest`'s `superRefine` and `RequiredNote`'s field-level refine now call the SAME `isBlank` predicate.
- [x] `reason_options` empty strands the UI [apps/admin/src/modules/claim-verification/LaterApprovalWarnings.tsx; i18n-en.ts] — a `.min(1)` at the contract layer was considered and REJECTED (it would break the deliberate, tested Trap-15 `reason_options: []` fail-closed shape). Fixed in the picker instead: when a warning is active, not blocked, and `options.length === 0`, a new `t.later.noOptionsConfigured` message renders in place of an empty picker. *⚠ Appended — code review round 2: the state is UNREACHABLE (the built-in generic always heads the list, read under the same savepoint as the warnings), and the words told staff to "ask a Super Admin to add one" — kept as a DEFENSIVE branch, reworded to "could not be loaded … reload".*
- [x] `warning_reason_code` check sat behind `if (outcome === undefined) return` [packages/contracts/src/claims/cycle-freeze.ts] — the REAL fix was upstream: `effectiveOutcome`'s `switch` had no `default`, so a future unhandled `action` would silently skip the check with `tsc` unable to catch it (the code's own doc comment already flagged this exact risk). Added a `default: { const exhaustive: never = action; throw ...}` arm — a missing case for a new action now fails typecheck instead.
- [x] `R9PanelVote.covers_current_warnings` accepted non-null on deny [packages/contracts/src/claims/r9-voting.ts] — added a `superRefine` enforcing null-on-deny.
- [x] `ApprovalWarningsSummary.available === false` left `kinds`/`waiting`/`own_reason_excluded` unconstrained [packages/contracts/src/claims/verification-decision.ts] — added a `superRefine`; verified against the real `UNAVAILABLE_APPROVAL_WARNINGS` sentinel (api layer) to confirm it still parses.
- [x] `EscalatedClosureDetailResponse`/`R9PanelResponse` new fields untested [packages/contracts/tests/approval-warnings-later-approvers.test.ts] — added a full-fixture `R9PanelResponse` test and a required-field `.shape` test for `EscalatedClosureDetailResponse`.
- [x] `covers_current_warnings: true` untested [packages/contracts/tests/approval-warnings-later-approvers.test.ts] — added, alongside a deny-vote-with-`true` refusal case (covers the new `superRefine` above too).
- [x] `late_warnings_unavailable: true` untested [packages/contracts/tests/approval-warnings-later-approvers.test.ts] — added.
- [x] New late-warning fields never tested as part of the real, full `ClaimUnderCorrectionItem` [packages/contracts/tests/approval-warnings-later-approvers.test.ts] — added a full-fixture end-to-end test, plus cases for the new cross-field `superRefine` above (valid pair, the fault-shape pair, and the incoherent pair that must fail). *⚠ Appended — code review round 2: "the fault-shape pair" (`true` + `0`) is now UNPARSEABLE; the fault shape is `true` + `null`.*
- [x] **Found already satisfied while implementing the above** — `CLAIM_WARNING_APPROVAL_STEPS`'s "LOCKSTEP" claim: a pre-existing test (`packages/contracts/tests/claims-verifier-decision.test.ts:226-227`, from Story 6.11, untouched by this diff) already does `expect([...CLAIM_WARNING_APPROVAL_STEPS]).toEqual([...schema.CLAIM_WARNING_APPROVAL_STEPS])` — a dynamic comparison against the live domain export, so it already covers the widened 7-value list with zero new code. Confirmed passing. Blind Hunter couldn't see it (wrong file, not in the diff). Moved to Dismissed.

**Patch — api (9 applied, 1 moved to Dismissed on verification):**

- [x] `underSavepoint`'s claim-id mapping could throw before the fail-closed block ran [apps/api/src/modules/claims/claims.correction-closure.handlers.ts] — `ids.claimId()` moved inside the `underSavepoint` callback.
- [x] SAVEPOINT release/rollback errors could mask or override the real result [apps/api/src/modules/claims/later-approval-warnings.ts] — both wrapped in their own log-and-ignore `try/catch`.
- [x] Inconsistent audit-field contract in `refusedApprovalWarningAudit` [apps/api/src/modules/claims/later-approval-warnings.ts] — every branch now reports `submittedCode` (never a field read off the error), and the `R9ApproveVotesNeedWarningReasonError` branch no longer omits `warning_reason_code`.
- [x] SAVEPOINT name raw-interpolated with no runtime guard [apps/api/src/modules/claims/later-approval-warnings.ts] — added a `SAVEPOINT_NAME_RE` check, throws on anything that isn't a plain identifier.
- [x] New error paths (`WarningReasonUnavailableError`, `WarningReasonUngroundedError`) untested [apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts] — added one test driving both through the real `/cycle-freeze/decision` route (representative of all four prefixes, since they share one translator).
- [x] No partial-failure test for the correction queue [already covered] — the domain-layer "ONE bulk evaluation per batch" rewrite above (3 claims: 2 late-only, 1 returned, under a forced fault) already proves this: the returned claim is unaffected while the two late-only ones degrade. No separate api-layer test needed.
- [x] **Error detail stripped to `err.name`** — reconsidered: `err instanceof Error ? err.name : 'unknown'` is the PERVASIVE, pre-existing convention across ~15+ sites in `apps/api/src/modules/claims/*.handlers.ts` (claims.appeal, claims.death-certificate, claims.nominee-declaration, claims.verifier-console, etc. — none of them 6.23b). Changing only the 4 new 6.23b sites would make them the odd ones out, and this codebase's heavy Tier-1/PII encryption discipline makes "log the class, not the message" a plausible deliberate choice (error messages can echo bound values). Not changed — moved to Dismissed.
- [x] Type-unsafe `as string` on vote ids — **verified safe, moved to Dismissed** (see below).
- [x] Unguarded duplicate actor id — **verified harmless, moved to Dismissed** (see below).
- [x] Inconsistent HTTP status codes (409 vs 400) — **verified correct-by-design, moved to Dismissed** (see below).

**Patch — admin (14 applied, 3 found-false-positive during implementation):**

- [x] `NoCorrectionStrip.onApprove` error handling [apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx; PariwarClosureList; apps/admin/src/routes/CorrectionClosureRoutes.tsx] — **partly a false positive**: `approve.isError` already rendered `closureErrorText(approve.error)` (the "no error text shown" half of the claim was wrong). The real, narrower gap — no 409-specific refetch, unlike sibling surfaces — is fixed: added an `onConflict?: () => void` prop threaded from `ClosuresView`'s `q.refetch()` through `PariwarClosureList` into `NoCorrectionStrip`'s `onApprove`/`onKeep`. Note: `useApproveNoCorrectionNeeded`'s own `onSettled: invalidate` already marks the closure-queue query stale on ANY outcome (success or failure), so this explicit refetch is a deliberate immediate one for the conflict case specifically, layered on — not the only thing that refreshes the list, matching the SAME pre-existing redundancy `EscalationPanel`'s `onConflict` already has against its own `onSettled`.
- [x] `approveNote` textarea not disabled while pending [PariwarClosureStrip.tsx] — added `disabled={approve.isPending}`.
- [x] `aria-describedby` drops one of two disable-reasons [PariwarClosureStrip.tsx] — now joins both ids (space-separated) when both apply.
- [x] Hardcoded ARIA id [EscalationPanel.tsx] — extracted `pickerPrefix = 'escalation-decision'`, used by both the picker's `idPrefix` and the button's `aria-describedby`.
- [x] Missing `role="status"` on two dynamically-appearing messages [R9CasePanel.tsx; CorrectionQueueRoute.tsx] — added to the per-vote "must be revised" line and the queue's late-warning line. *⚠ Appended — code review round 2: a `role="status"` that MOUNTS holding its text is ⛔ not announced (this codebase's own rule, `CorrectionQueueRoute.tsx`'s persistent `queue-claim-status`); the role is harmless, the stated rationale does ⛔ not hold — the queue's banner is now persistent.*
- [x] Unchecked `as` casts in error-copy helpers [apps/admin/src/modules/claim-verification/nominee-errors.ts] — all three (`missing`, `own_reason_excluded`, `vote_ids`) now runtime-checked (`typeof`/`Array.isArray`) before use.
- [x] Silent undercount in `approveVotesNeedWarningReasonMessage` [nominee-errors.ts; i18n-en.ts] — an empty/malformed `vote_ids` now renders a new count-free `approveVotesNeedWarningReasonUnknownCount` message instead of confidently claiming "one".
- [x] New 409/conflict-refetch logic untested [apps/admin/tests/later-approval-warnings.test.tsx] — added one test for `EscalationDetail`'s `onConflict` and one for `R9CasePanel`'s vote 409 (finalize's identical pattern needs the step-up flow mocked too, not set up in this file — out of scope for this coverage patch; both exercise the same `ApiError 409` mechanism). **Found while writing these**: both surfaces' mutations ALREADY double-refetch today (an existing `onError`/`onSettled` hook-level invalidation, layered under the component's own explicit refetch) — pre-existing, harmless redundancy, not something this patch introduced. Tests assert `>= 2` calls (proving a refetch happens) rather than an exact count tied to that incidental mechanism. *⚠ Appended — code review round 2: the R9-vote and escalation tests pass with the component's handler DELETED (each hook already invalidates on error) — they prove "a 409 refetches", ⛔ not the component's own `onConflict` / 409 branch.*
- [x] Untested 3-way condition in the queue row-hide logic [apps/admin/tests/correction-queue.test.tsx] — added the missing `sent_back_by_check === true && returned_at === null` case.
- [x] "Still in the option list" guard duplicated 4× [apps/admin/src/modules/claim-verification/LaterApprovalWarnings.tsx (new `resolvedWarningReasonCode` export); EscalationPanel.tsx; PariwarClosureStrip.tsx; PendingCaseCard.tsx; R9CasePanel.tsx] — all 4 call sites now call the one shared function.
- [x] R9's `finalizeBlocked` could hide a second real blocker [R9CasePanel.tsx] — now joins the WAIT message and the "votes need revising" message when both apply, instead of showing only the first.
- [x] Stale approve-only validation error persists across an unrelated input change [R9CasePanel.tsx; EscalationPanel.tsx] — both vote-choice radios now clear `voteValidation`; the escalation decision `<select>`'s `onChange` now clears `warningMissing`.
- [x] No null-guard on `late_warning_uncovered_count` — **verified moot, moved to Dismissed** (see below).
- [x] Two independent sources compute the same count — **left as-is, mitigated, not restructured** (see below).
- [x] Approve-over-warning textarea no length cap — **verified intentional convention, moved to Dismissed** (see below).

**Dismissed as noise (20 — verified, not hand-waved; 13 found during triage, 7 more found while implementing patches):**

1. "SQL correlation bug: unaliased `\"claims\"` reference" — FALSE POSITIVE. `candidateBatch` consistently references the outer table as the literal `"claims"` (not a short alias) in every condition, old and new alike, per its own doc comment. The new line matches the established pattern exactly.
2. "`approvingActorIds` required only at the type level, no runtime guard" — consistent with this codebase's established trust-the-type-system convention for internal TS callers.
3. "`R9PanelVote.covers_current_warnings` has no backfill compat for old rows" — moot: the field is computed fresh per-request in the handler (`claims.r9-voting.handlers.ts:319-355`), never read from a stored column.
4. "Mixed key casing in one wire payload" — confirmed intentional per RD4 (verified by the Acceptance Auditor: "no camelCase wire-field slip... per RD4's explicit prohibition").
5. "`ApprovalWarningsSummary.post_death` has no 'not applicable' value" — confirmed exact match to spec's EA7 shape by the Acceptance Auditor; not a gap.
6. "EscalationPanel doesn't call the dedicated warning-error-message helper" — sanctioned by RD6 (closure.* surfaces are documented to use the generic `closureErrorText` passthrough instead).
7. "New copy only in `i18n-en.ts`, no other locale" — every module in `apps/admin` is English-only; no sibling locale file exists anywhere in the app.
8. "Breaking signature change to `useApproveNoCorrectionNeeded`, only one call site migrated" — verified moot: it is the only call site in the entire app.
9. "Backward-compat break from new required fields on `.strict()` schemas, no shim" — not applicable: internal monorepo contract shared only between `apps/api` and `apps/admin`, deployed together.
10. "AC2's 'seven gate calls' vs. six actual call sites" — the code's six call sites exactly match Trap 7's own prose enumeration (also six); very likely a pre-existing miscount in the spec text, not a code gap.
11. "Bulk reader's JSON field name (`actor`) possibly mismatching the derivation function's expected shape" — self-verifying: Trap 13's parity test asserts full deep equality (incl. `recordedByActor`) between the bulk and single-claim readers over dirty data.
12. "`decided_at` tie-break excludes a same-instant redetermination from the late-warning queue (strict `>`)" — already resolved during this story's own development: a 2026-10-05 project memory documents that same-transaction test fixtures stamp equal `decided_at` values (a test artifact — real approvals and redeterminations are always separate transactions), and the prescribed fix was to backdate the *test* fixture, not loosen the production predicate. Confirmed already applied: `apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts:329-331`'s `backdateApproval` helper does exactly `decided_at = decided_at - interval '1 minute'`. The strict `>` is correct as shipped.
13. "R9's binding warning-coverage check (EA5) is reachable-empty when `panelSize === 0` with `votingRequirement: 'supermajority'`" — traced and disproven: `r9-voting-persist.ts:445` throws `R9PanelEmptyError` before any session row is written if `panelActorIds.length === 0`, and no later path mutates `panelActorIds` downward (the dedup at `:472` runs after this guard and can only shrink toward a minimum of 1 from a non-empty input). `panelSize` can therefore never be `0` for any session that exists, so `computeR9Outcome`'s supermajority-threshold-zero path is unreachable. No guard added, per the project's convention against validating provably-unreachable states.
14. (contracts) "`CLAIM_WARNING_APPROVAL_STEPS` LOCKSTEP claim is comment-only, unenforced" — FALSE POSITIVE: `packages/contracts/tests/claims-verifier-decision.test.ts:226-227` (pre-existing, from Story 6.11, untouched by this diff) already does a live, dynamic `toEqual` comparison against `schema.CLAIM_WARNING_APPROVAL_STEPS` — confirmed passing with the widened 7-value list. Blind Hunter was looking at the wrong file.
15. (api) "Error detail stripped to `err.name`" — not fixed: this is the pervasive, pre-existing logging convention across ~15+ non-6.23b handler sites in `apps/api/src/modules/claims/`; changing only 4 of them would be the real inconsistency, and this codebase's PII/Tier-1 discipline makes "log the class, never the message" a plausible deliberate choice, not an oversight.
16. (api) "Type-unsafe `as string` cast on vote ids" — verified SAFE: `v.voteId` is a branded `R9VoteId` (nominal-only, structurally a string); narrowing a branded id to plain `string` via `as` is the standard, safe direction in this codebase's type system (the unsafe direction is the reverse). Not a type-safety hole.
17. (api) "Unguarded duplicate actor id in `[ctx.actorId, ...approveVoterIds]`" — verified HARMLESS: `uncoveredKeys`'s `excluded = new Set(raw ...)` immediately de-dupes the list before any membership test; a duplicate id in the source array has zero effect on behavior.
18. (api) "Inconsistent HTTP status codes (409 vs 400) for sibling validation failures" — verified CORRECT BY DESIGN: `NoCorrectionNeededApproveRequest`'s note⇔code pairing is checkable from the request body alone (contract-level, 400); `cycle_freeze.warning_reason_required` depends on the claim's CURRENT warning state, unknowable until the DB read happens (domain-level, 409). These are genuinely different failure moments, not an inconsistency — matches this codebase's contracts-validate-shape / domain-validates-state split everywhere else.
19. (admin) "No null-guard on `late_warning_uncovered_count`" — verified MOOT: `apps/admin/src/api/client.ts`'s generic fetch helper parses every response through its Zod schema (`ClaimsUnderCorrectionResponse`, whose `late_warning_uncovered_count` is `z.number().int().nonnegative()`, never nullable) before a component ever sees it — a server bug sending `null` would surface as a `.parse()` throw (a visible load-error state), never a silent "null" string in the rendered copy. *⚠ Appended — code review round 2: FALSE since round 2's decision B — the count is now `number | null` (`null` = could ⛔ not be counted, on the fault path only); the admin branches on it.*
20. (admin) "Approve-over-warning note textarea has no length cap" — verified INTENTIONAL: neither sibling textarea in the SAME component (`PariwarClosureStrip.tsx`'s decline-note at line 116, Keep-note at line 319) has a client-side `maxLength` either, despite being backed by the identical `CORRECTION_CLOSURE_NOTE_MAX_CHARS`-bounded contract type. This file's established convention is server-side-only length enforcement; adding `maxLength` only to the new field would be the inconsistent choice.

**Fresh-context re-validation (2026-10-06, before commit):** 4 parallel fresh-context agents (no memory of making the fixes) independently
re-verified every applied patch in their own layer against the actual current code — tracing logic by hand, diffing SQL predicates
character-by-character, hand-computing expected values against real implementations, and (contracts/domain/api) re-running the real test
suites. Result: **zero confirmed defects** across all 50 patches. Two small, cheap follow-ups surfaced and were applied:
1. The single-claim reader's structurally-identical `cur` CTE (in `readClaimApprovalWarnings`) didn't get the same deterministic
   `ORDER BY` the bulk reader's `cur` got — added for consistency, though a validator proved BOTH were already deterministic by
   construction (three UNIQUE constraints across the join chain compose to at most one row), so this is redundant defense, not a live
   bug fix either way.
2. `underSavepoint`'s doc comment now states explicitly that its swallow-RELEASE/ROLLBACK-error behavior is safe only because every
   current call site is read-only and runs before `closeScopeTx` — flagged by a validator as something a future write-then-read caller
   under this helper would need to re-examine.

**Left as-is, documented (not a patch, not dismissed):**

- "Two independent sources compute the 'N votes need revising' count" [R9CasePanel.tsx client-side filter vs. the server's 409 `vote_ids`] — `runFinalize`'s existing `onError` already does `void panel.refetch()` on a 409, which updates `model.votes` (and so the client-side count) shortly after any divergence; the discrepancy is a transient, self-correcting one-render-frame window inherent to any optimistic-then-server-validated flow, not a lasting bug. No structural change made.

#### Round 2 — chunk 1 (server: domain + contracts + api), 2026-10-06

`bmad-code-review 6.23b`, re-run over the whole story diff `b41ea25f..50e3eef3` (round 1's fixes included), chunked server → admin
(BigDev: *"Server, then admin"*), three layers in parallel, read-only (BigDev: *"Parallel, read-only"*). 28 raw findings (Blind Hunter 15,
Edge Case Hunter 8, Acceptance Auditor 5) → 1 decision, 9 patches, 1 defer, 11 dismissed. ⚠ TWO round-1 dispositions are wrong in the
code: the 500-id cap (patch A) and the shape of decision #1's fault path (decision B).

- [x] [Review][Decision] The queue's late-arm FAULT shape claims "0 warnings" — Round 1's decision #1 keeps a late-warning candidate on a
  fault with `late_warning_awaiting_reason: true` and `late_warning_uncovered_count: 0`; the admin then renders `lateWarningLine(0)` —
  *"0 nominee-change warnings appeared after your approval…"* — an UNKNOWN shown as a value (invariant 7, reversed). The candidate flag is
  the SQL superset, so on a fault a claim NW14 already answered is listed too. Three docs still describe the OLD drop-the-row behaviour
  (`correction-queue-read.ts:83-86` row doc; `:101-104` `onLateWarningsUnavailable`; `nominee-name-check.ts:447-450` the response's
  "may be missing"). Options: (1) `late_warning_uncovered_count` becomes nullable — `null` = could not be counted; the admin says the claim
  *may* await a reason; the `superRefine` becomes "null ⇒ flag true"; (2) keep `0`, and the admin branches on the response-level
  `late_warnings_unavailable` to say "may await" for a row with count 0. ⭐ **RESOLVED — BigDev *"1"* (2026-10-06) ⇒ Patch:** the count
  becomes nullable (`null` = could not be counted, set ONLY on the fault-candidate path); the contract's `superRefine` gains
  "`null` ⇒ the flag is `true`"; the admin row says the claim MAY await a reason; the three stale docs are corrected.
- [x] [Review][Patch] (from the decision above) `late_warning_uncovered_count: number | null` on the queue's fault path
  [packages/domain/src/claim/correction-queue-read.ts:347; packages/contracts/src/claims/nominee-name-check.ts:418;
  apps/admin/src/routes/CorrectionQueueRoute.tsx:240]
- [x] [Review][Patch] The 500-id cap disables Approve on the WHOLE cycle-freeze page past 500 pending cases — round 1's cap (its doc:
  *"every current caller is already page-sized"*) is false: `getPending` bulk-reads three buckets scanned at `PENDING_SCAN_CAP = 500` EACH
  (≤ 1,500 ids) ⇒ the throw fails closed for every case, and a reload never clears it. Read in ≤ 500-id slices instead of throwing (one
  statement per slice — AC7's 1-vs-10 count unchanged) [packages/domain/src/claim/approval-warnings.ts:328]
- [x] [Review][Patch] `readLateWarningArm`'s `ROLLBACK TO SAVEPOINT` is unguarded — if it throws, it REPLACES the original error and the
  queue 500s; the API twin `underSavepoint` guards both statements. Guard it and rethrow the ORIGINAL error (the transaction is unusable
  then — ⛔ not `null`) [packages/domain/src/claim/correction-queue-read.ts:381]
- [x] [Review][Patch] The R9 WAIT 409 tells a finalizer *"A late reason YOU recorded…"* when an APPROVE VOTER recorded it (the `byVoter`
  test: V2 records, V3 finalizes) — use the admin's accurate R9 wording (`ownReasonExcludedR9`) for the `r9_voting` prefix
  [apps/api/src/modules/claims/later-approval-warnings.ts:17]
- [x] [Review][Patch] `PariwarClosureQueueItemDto.approval_warnings` has no `superRefine` tying it to `kind` (RD20: `null` EXACTLY on a
  `closure_request`; a summary on every `no_correction_needed`) — a `no_correction_needed` with `null` (read as "no warning") parses
  [packages/contracts/src/claims/correction-closure.ts:277]
- [x] [Review][Patch] 0145's three UNIQUE constraints have ⛔ no policy-regression assertion (family 5 — REAL GAP): add a duplicate-insert
  per column expecting `23505` + the constraint name [packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts]
- [x] [Review][Patch] Spec-required test arms missing — *Testing* asks the Super Admin approve, "both the full and the `-251` waived", to 409
  on a late key: the FULL-gate arm never seeds one; and the WAIT 409 is driven over HTTP on `cycle_freeze.` only — add `closure.` (D27 / the
  escalation decision) and `r9_voting.` (finalize) route arms [packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts:819;
  apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts]
- [x] [Review][Patch] The second race test's `replacing` promise has ⛔ no early `.catch` — the exact shape `50e3eef3` fixed one test above
  (a `waitUntilBlocked` timeout leaves it unhandled ⇒ a false CI failure)
  [packages/domain/tests/integration/claim/approval-warnings-every-approver-race.spec.ts:123]
- [x] [Review][Patch] D27's warned note is encrypted UNTRIMMED as the decision rationale — the escalation decision encrypts `body.note.trim()`
  for the same trustee field class [apps/api/src/modules/claims/claims.correction-closure.handlers.ts:571]
- [x] [Review][Patch] Records (family 10): migration 0145 is in ⛔ neither round 1's Review Findings nor the File List (only commit
  `a87c2311`); round 1's SKIPPED follow-up (thread one `readClaimApprovalWarnings`) is in ⛔ no `deferred-work.md` section; the gate's
  doc-block says *"typecheck finds all seven calls"* while `git grep "assertClaimApprovable("` finds SIX production calls (round 1's
  dismissal #10 agreed) — correct the code comment; APPEND corrections to the record, ⛔ never rewrite it
  [packages/domain/src/claim/nominee-name-check.ts:396]
- [x] [Review][Defer] A late `recent_nominee_change` key can ALSO arise with ⛔ no new determination when an EARLIER claim gains a
  `member_found_innocent` finding — `first_filed_at` excludes that claim, the 90-day anchor moves later, and EA10's arm (keyed on a newer
  determination) never queues it (the wait still holds at the gate) [packages/domain/src/claim/approval-warnings.ts:263] — deferred,
  unreachable today: `recordMemberInnocenceFinding` has ⛔ no production caller until row `6-22` (`nominee-lock.ts:134`); a second mechanism
  under the SAME trigger as `deferred-work.md`'s existing row-`6-22` item, appended there.

**Applied 2026-10-06 (BigDev: *"1"* — apply every patch).** Notes per patch, where the build differed from the line above:
- A — `MAX_BULK_READ_IDS` (a throw) → `BULK_READ_SLICE` + `slicesOf`; both bulk readers read one statement per ≤ 500-id slice. The Trap 13
  parity test gains a 600-random-id + real-ids arm (the real claims in the SECOND slice) — red on the old throw by construction.
- B (the decision) — the domain row's `lateWarningUncoveredCount: number | null`; the contract's `superRefine` is now a BICONDITIONAL
  (the flag ⇔ the count is `null` or nonzero — round 1's `true` + `0` now fails to parse); the admin row: `badgeLateWarningUncounted`
  (*"a late warning may await your reason"*) and `lateWarningLine(null)`; the `lateWarningsUnavailable` banner no longer says "may be
  missing" (it now says a "may await" row may already be answered); the three stale docs rewritten. Domain, API and contracts tests
  moved from `0` to `null`; a new admin test (the uncounted row ⛔ never says "0 nominee-change").
- I — a failed `ROLLBACK TO` now logs and rethrows the ORIGINAL error.
- E — the `r9_voting` prefix returns the admin's `ownReasonExcludedR9` words. ⭐ RED-CHECKED: with the old branch restored, the new API
  test fails on `not.toMatch(/you recorded/)`.
- L — `PariwarClosureQueueItemDto` `.superRefine` (null ⇔ `closure_request`); both incoherent directions fail in the contracts test.
- O — a policy-regression test: a second row on the same trustee decision / R9 vote ⇒ `23505` naming each UNIQUE; all three in
  `pg_constraint` (the closure's by catalog — its only step also carries a trustee decision, so a duplicate trips either first).
  ⚠ ⛔ Not red-checked by dropping the constraints (a shared live DB); the catalog assertion fails by construction without 0145.
- Q — domain: the FULL-gate Super Admin arm (waits; own late reason ⛔ never clears it; the District Admin's does). API: `r9_voting.` at finalize
  (+ E's words; the District Admin's reason then finalizes) and `closure.` on the Super Admin's decision (a re-review to 45 days back makes
  the 30-day change post-death; `kinds` names only the UNCOVERED kind). These are coverage of shipped behaviour — green on first run.
- M — `replacing.catch(() => undefined)`. T — D27's note `.trim()`; the API test now sends it padded and decrypts the trimmed text.
- P — appended (⛔ never rewritten): the File List names 0145 and round 2's files; the Completion Notes' "seven calls" carries a correction; the
  code comment says SIX; `deferred-work.md` gains the round-1 skipped follow-up (one read threaded through), with round 2's trace that it
  is ⛔ not a correctness gap.

Verified: `pnpm -w typecheck` 20/20; contracts 74 files / 1265; admin 58 / 900; domain 324 / 4511 (+1 skipped) and api 148 / 1529
(+1 skipped), both with `DATABASE_URL` → :5433. ⛔ No migration changed (nothing to re-apply on :5432 / :5433).

**Dismissed (11, each traced):** (1) the queue misses a claim whose only cover is the approver's OWN late reason, and `state_trustee_approved`
is ⛔ not in `CORRECTABLE_SCAN_STATES` — the own-reason case is EA10's ACCEPTED, recorded gap (`deferred-work.md`); and a claim reaches
`state_trustee_approved` only through a final vote the wait already gated, so its keys were all covered then, and ⛔ no determination or
certificate review is recordable there; (2) a race between the wait's read and the rule's read — every binding approver takes the claim row
`FOR UPDATE` first (`lockForClosure`, `lockClaim` ×2), as do the determination and certificate-review writers, so nothing commits between;
(3) Drizzle snapshots missing for 0144 / 0145 — `meta/` stops at `0020_snapshot.json`: hand-authored migrations since 0021, by convention;
(4) a code on a DENY is reported as "no warning shows" — the contracts refuse it with 400 first (AC3 / AC5); the domain throw is defence only;
(5) the reason-option mapper can 500 on a non-`Date` `addedAt` — 6.23a's typed reader returns a `Date`, mapped the same way on 6.23a's
console; (6) D27 relies on the contract alone to keep the constant out of the note — the contract IS the route's validation (AC6's 400
tests); (7) refused 6.19c approvals carry ⛔ no warning audit — already recorded, pre-existing (`deferred-work.md`, *"the 6.19c D27 / Super
Admin routes have ⛔ no `rejected` audit line at all"*); (8) the statement counter stays on pooled clients — inert, since `counting` is true
only inside its own `measure`; (9) the composite FKs omit `claim_case_id` — RD1's design; every id is server-derived from the claim the
writer has locked (family 12 by construction); (10) the late arm has ⛔ no state filter — it sits inside `candidateBatch`'s
`CORRECTABLE_SCAN_STATES` filter (`:172`); (11) `underSavepoint` logs through `console.warn` — round 1's choice, harmless.


**`ci:local` after chunk 1's patches (2026-10-06, `DATABASE_URL` → :5433): 34 / 34 green** — ⛔ no flake, ⛔ no re-run.

#### Round 2 — chunk 2 (admin UI), 2026-10-06

The same three layers, parallel, read-only, over `git diff b41ea25f -- apps/admin` INCLUDING chunk 1's uncommitted admin edits. ⚠ The first
launch of all three died on an API session limit (⛔ no output) and was re-run whole. 37 raw findings (Blind Hunter 19, Edge Case
Hunter 9, Acceptance Auditor 9) → 0 decisions, 13 patches, 1 defer, 13 dismissed. ⚠ Round 1's "empty reason list" patch rests on a
state that cannot occur (patch 9).

- [x] [Review][Patch] A reason picked (and the note typed, and `decided`) on one escalated claim carries over to the next —
  `<EscalationDetail>` mounts with ⛔ no `key`, and a cached detail never unmounts `DecisionForm`; the pick still resolves against
  the same Pariwar list, so B shows A's reason CHOSEN (invariant 5: ⛔ nothing pre-selected) and one click submits it for B. R9 is safe
  (`R9VotingPage` keys by claim) [apps/admin/src/routes/CorrectionClosureRoutes.tsx:121]
- [x] [Review][Patch] One card's 409 shows on EVERY cycle-freeze card — the page's single `decision` mutation feeds
  `error={errorMessage(decision.error)}` to all three buckets; 6.23b's claim-specific words (*"waits for the District Admin"*) then
  sit as `role="alert"` on claims with ⛔ no warning. Show it only on the card that acted (`decision.variables`)
  [apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx:176]
- [x] [Review][Patch] Family 13(d) — REAL GAP: the queue's `late_warnings_unavailable` banner (its only invariant-7 signal) is a
  `role="status"` that MOUNTS already holding its text, so it is ⛔ not announced — the route's own rule (`:113-114`, why
  `queue-claim-status` is persistent). Keep the region mounted, swap the text
  [apps/admin/src/routes/CorrectionQueueRoute.tsx:126]
- [x] [Review][Patch] The R9 APPROVE vote stays submittable when the warnings read failed (Trap 15: the approve-vote control is
  disabled, in the unavailable words) — refused only after a click, the words then shown TWICE. Disable Submit for an approve vote
  only (a deny vote stays open), described by the blocked line [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:432]
- [x] [Review][Patch] The R9 panel shows the warning KINDS only while the Approve radio is selected — a member with Deny selected can
  still Finalize an APPROVED outcome with ⛔ no kind line on screen (invariant 5). Render the block always; the picker only for an
  approve vote [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:402]
- [x] [Review][Patch] R9 "Verify & finalize" stays enabled after `finalizeBlocked` turns non-null under an open step-up box — the
  OTP is spent on a finalize the screen already knows is held [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:494]
- [x] [Review][Patch] *"must be revised … before the outcome can be finalized"* still shows on a FINALIZED panel
  [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:348]
- [x] [Review][Patch] A `voted_pending_commit` card (Route-to-R9 ONLY) says *"approval is unavailable until they do"* — the WAIT's
  words on a card with ⛔ no approve control. `waitBlocksHere={hasApprove}` [apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx:320]
- [x] [Review][Patch] Round 1's *"No warning reasons are configured … ask a Super Admin to add one"* branch is UNREACHABLE and its
  words untrue: `activeReasonOptions` always prepends the built-in generic (a code constant, ⛔ never a row), and every handler reads
  the warnings and the options under ONE savepoint — `reason_options: []` comes only WITH `available: false`, which the block tests
  first. Keep a defensive branch, in true words (the list could ⛔ not be loaded — reload)
  [apps/admin/src/modules/claim-verification/LaterApprovalWarnings.tsx:103]
- [x] [Review][Patch] Queue: `late_warnings_unavailable` with ⛔ no items suppresses the empty state and renders a bare empty list —
  but on the fault path every candidate is KEPT (chunk 1, decision B), so an empty list there IS empty. Show the empty line
  [apps/admin/src/routes/CorrectionQueueRoute.tsx:150]
- [x] [Review][Patch] The *Testing* section's admin RTL list is unmet on three surfaces (AC9): R9 — ⛔ no `available: false` case,
  ⛔ no assertion on the vote-409 words or finalize's `approve_votes_need_warning_reason` words (incl. round 1's count-free
  fallback), and the two "denying outcome is ⛔ not held" tests never exercise a denied outcome; EscalationDetail — ⛔ no own-reason or
  409 words; NoCorrectionStrip — ⛔ no unavailable case, own-reason words, 409 words or kind line; round 1 P36's `noteRequiredError`
  untested; the REAL-`useQuery` 409 test never re-asserts the alert AFTER the refetch (the hazard the line names)
  [apps/admin/tests/later-approval-warnings.test.tsx]
- [x] [Review][Patch] Fixtures of the widened queue response omit the required `late_warnings_unavailable` (green only because the
  client is mocked — AC7 / Trap 14) [apps/admin/tests/correction-chase-forms.test.tsx:748]
- [x] [Review][Patch] Records (family 10), APPENDED: round 1's Dismissed #19 (*"never nullable"*) is false since chunk 1's decision B;
  round 1 P38's R9-vote and escalation 409 tests pass with the component's handler DELETED (each hook already invalidates on error) —
  they prove "a 409 refetches", ⛔ not the component's `onConflict`; round 1 P35's "announced" rationale for `role="status"` on
  mounted-with-text lines does ⛔ not hold; round 1's empty-list patch (patch 9 above); and the unscoped
  `no-correction-approve-note` test ids [apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx:281]
- [x] [Review][Defer] A FAILED refetch after a 409 hides the whole surface — `EscalationDetail` and `R9CasePanel` branch on
  `isError` before `data`, so the typed note and pick are lost [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:102] — deferred,
  pre-existing (`R9CasePanel`'s `if (panel.isError)` is at `b41ea25f:89`); this story's 409 refetches make it likelier.

**Dismissed (13, each traced):** (1) Approve silent with an empty reason list — unreachable (patch 9's trace); (2) a deny rationale
"leaks" into the approve note — the card has ONE rationale per decision, by design and on screen, its label switching to the note's;
(3) the escalation picker's fixed id prefix — one detail form per page; (4) N `role="status"` rows on the queue — list content, in
reading order; (5) the strip and the card report one missing field per click — both are SAID, in turn; (6) the card's pre-click
blocked check is dead — defensive, harmless; (7) an unknown warning kind renders an empty bullet — the client parses `kinds` through
the contract's enum first; (8) a `true` + `0` queue row prints "0 warnings" — chunk 1 made that pair unparseable; (9) *"Reload to try
again"* breaks the "⛔ never 'try again'" rule — that rule is for the 409 mappings; a failed READ's reload is 6.23a's own unavailable
wording; (10) the `{}`-body test cannot tell `{}` from none — identical on the wire through the hook's default; (11)
`data!.reason_options` unchecked — a required field of a zod-parsed response; (12) copy routed by string equality — correct today, a
refactor only; (13) ⛔ no `maxLength` on the approve note — round 1's Dismissed #20 convention (server-side only).

**Applied 2026-10-06 (BigDev: *"1"* — apply every patch).** Red-checked (each new test FAILS with its fix reverted, passes with it):
the escalation `key` (a NEW route test, `escalation-detail-claim-switch.test.tsx` — B cached, A picked, back to B ⇒ ⛔ not checked, note
empty); the per-card 409 (two cards, the words on the acting one only); the R9 approve-vote disable on a failed read (a deny vote still
posts); ⛔ no "must be revised" on a finalized panel; "Verify & finalize" disabled once held (the panel refetched by `useFinalizeR9`'s
`onError` — ⚠ round 3: the original "⛔ no `verifyStepUp` call" proof was hollow, nothing clicked Verify); the voted card's ⛔ no wait words; the queue banner's PERSISTENT live region (mounted empty after the
session gate, before the data; the same node gains the words). Also: the R9 kind lines with Deny selected; a DENIED outcome ⛔ never held, even
while waiting with an uncovered vote (the two misleading titles renamed); finalize's count-free words; the vote-409 and both closure
surfaces' 409 words; the own-reason words on the escalation (⛔ not the R9 variant) and the strip; the strip's kind line and unavailable
state; the cycle-freeze REAL-`useQuery` test re-asserts the alert AFTER the refetch; the empty queue line with the late arm unavailable
(the old test pinned the opposite and was rewritten). The dead branch's words reworded (DEFENSIVE); the `no-correction-approve-note`
test ids scoped by claim; the queue fixtures carry `late_warnings_unavailable`. Records: four round-1 items carry appended corrections
(Dismissed #19; the empty-list patch; P38's two tests; P35's rationale).
⚠ Recorded, ⛔ not explained: the strip's new 409 test failed ONLY with a persistent `mockRejectedValue` — an ApiError reported after the
test body had finished, with ⛔ no `unhandledRejection` event and ONE call to the mock; switching the component from `mutateAsync().then`
to `mutate` callbacks did ⛔ not change it (reverted). `mockRejectedValueOnce` (one click, one rejection) passes. Root cause ⛔ not found.

Verified: admin `tsc` clean; admin 59 files / 913 tests. `ci:local` (`DATABASE_URL` → :5433): run 1 **31 / 34** — `typecheck`, `build`
and `crypto-check` (which runs typecheck) all failed on ONE error of mine: the new route test's fixture cast the whole object (TS2352;
`tsc -p .` had been run BEFORE the file existed) — fixed by casting only `closure`, as the sibling fixture does; run 2 **34 / 34 green**.
⛔ Not committed.

#### Round 3 — a review of round 2's OWN patches, 2026-10-06

BigDev asked whether round 2's 24 patches had been reviewed — they had ⛔ not (tests, red-checks and `ci:local` only). The same three
layers, parallel, read-only, over `git diff HEAD -- packages apps` + the new test file (1,374 lines) and the records diff (288 lines).
37 raw (Blind Hunter 20, Edge Case Hunter 6, Acceptance Auditor 11) → 0 decisions, 15 patches, 12 dismissed. ⚠ Round 2 introduced ONE
regression (patch 1) and weakened one honest sentence (patch 2); the rest are gaps in its tests and records.

- [x] [Review][Patch] REGRESSION — a 409 whose refetch removes the acting claim from every bucket now shows on ⛔ no card at all (round 2
  scoped it to the acting card; before, every card showed it): `cycle_freeze.escalation_conflict`'s "Someone else resolved this…" is
  lost. Add a page-level `role="alert"` when the acting claim is in ⛔ no bucket [apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx:126]
- [x] [Review][Patch] Round 2 reworded the queue's unavailable banner and DROPPED "may be missing": on a fault every late CANDIDATE is
  kept (incl. ones already answered), and the reader fills the page in filing order and stops at `pageSize` with ⛔ no cursor — so answered
  candidates can push real returned claims OFF a full page. The banner must say the list may be incomplete; the response doc must say
  what IS true (an EMPTY list under the flag is empty; a full one may be incomplete)
  [apps/admin/src/modules/claim-verification/i18n-en.ts:337; packages/contracts/src/claims/nominee-name-check.ts:452]
- [x] [Review][Patch] The R9 vote-409 test mocks `r9_voting.late_warning_reason_required` — a code `castR9Vote` can ⛔ never return (the WAIT
  holds finalize, ⛔ not the vote). Drive a REAL vote code; assert finalize's WAIT words and the COUNTED `approve_votes_need_warning_reason`
  words too [apps/admin/tests/later-approval-warnings.test.tsx:389]
- [x] [Review][Patch] Round 2's chunk-2 AC9 bullet is ticked, but its "P36's `noteRequiredError` untested" item was ⛔ not done — the
  server-error `missing: 'note'` mapping still has ⛔ no test [apps/admin/src/modules/claim-verification/nominee-errors.ts:108]
- [x] [Review][Patch] Family 13(d) — the R9 `r9-finalize-blocked` line MOUNTS holding its text (the class round 2 fixed on the queue
  banner); on the step-up path (a 403 is excluded from the alert, then the refetch makes the claim wait) ⛔ no alert fires, so a
  screen-reader user is never told "Verify & finalize" went disabled. Make the region persistent
  [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:463]
- [x] [Review][Patch] "Send verification code" stays live once Finalize is held — the OTP is still spent (round 2 gated only Verify)
  [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:481]
- [x] [Review][Patch] Every un-warned R9 panel gains an EMPTY `<div className="mb-2">` (the block returns `null`) — a stray gap
  [apps/admin/src/modules/r9-voting/R9CasePanel.tsx:405]
- [x] [Review][Patch] The DEFENSIVE empty-options words ("approving is unavailable just now") contradict an Approve that stays enabled
  there — reword to what the branch knows (the reasons could ⛔ not be loaded — reload); the code comment had the glyph on "reachable" (inverted) [apps/admin/src/modules/claim-verification/i18n-en.ts:218; LaterApprovalWarnings.tsx:101]
- [x] [Review][Patch] The 600-id slice test cannot catch a dropped or replaced slice — every REAL claim is in slice 2. Put real claims
  on BOTH sides of the boundary [packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts:462]
- [x] [Review][Patch] Patch O's "the closure UNIQUE is catalog-only (a duplicate trips either first)" is FALSE — a second trustee
  decision on the claim gives two `super_admin_approval` rows sharing ONLY `closure_id` ⇒ `23505` naming `closure_uq` (family 5)
  [packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts:433]
- [x] [Review][Patch] Nothing ties an item's `null` count to the response's `late_warnings_unavailable: true` — a response-level
  `superRefine` [packages/contracts/src/claims/nominee-name-check.ts:458]
- [x] [Review][Patch] Past one slice the reads are separate statements (separate READ COMMITTED snapshots) — say so in the doc
  [packages/domain/src/claim/approval-warnings.ts:330]
- [x] [Review][Patch] Tests: the `aria-describedby` targets are asserted by attribute string only — assert the id EXISTS; the
  escalation route test resets its module-level `search` outside any `afterEach` (a failing assertion leaks it)
  [apps/admin/tests/later-approval-warnings.test.tsx; apps/admin/tests/escalation-detail-claim-switch.test.tsx:100]
- [x] [Review][Patch] Records (family 10) — APPEND corrections to round 1's four lines round 2 overturned (`:714` "(count unknown, 0)";
  `:718` the thrown cap; `:729` "one-directional"; `:739` the fault-shape pair, now unparseable); the File List misses round 1's
  `packages/contracts/src/_common/primitives.ts` and round 2's new `escalation-detail-claim-switch.test.tsx`; round 2's applied note
  cites the absence of a `verifyStepUp` call as proof (nothing clicks Verify — the red-check rests on `toBeDisabled`); "SIX — `git grep`" cites a
  command that returns 9 hits, and "seven" also stands in EA2, Trap 7, AC2 and Task 2 — ⛔ not RD16 alone
  [_bmad-output/implementation-artifacts/6-23b-every-approver-gives-a-warning-reason.md; packages/domain/src/claim/nominee-name-check.ts:396]
- [x] [Review][Patch] Round 2's records break the GLYPH REGISTER ~18 times, several INVERTING the meaning (the negation glyph sat on
  "announced", "found", "checked", "clears" and a code word) — round 2's OWN text, uncommitted: corrected in place, the round-1 text
  ⛔ never touched [this file; deferred-work.md]

**Dismissed (12, each traced):** (1) the closure item's new `superRefine` can fail the WHOLE queue — its only producer returns `null`
EXACTLY on `closure_request` and a summary (or UNAVAILABLE) otherwise, the fault path included; ⛔ no consumer uses `.shape`/`.extend`;
(2) the empty-options branch is reachable on the bulk surfaces — every handler reads the options in the SAME savepoint as the
warnings (Auditor and Edge Case Hunter both re-traced it); (3) the R9 own-reason words no longer name who can clear — they name who
CANNOT, then "someone else … must record theirs"; (4) the voted card no longer says "waits" — it has ⛔ no approve control, and a voted
claim passed the wait at its vote; (5) the domain full-gate test "disagrees" with its HTTP twin — the gate is timing-agnostic, the
same fixture as round 1's waived arm; (6) the D27 trim is untestable — the contract does ⛔ not trim, so the padded test fails without it;
`RequiredNote` refuses a blank note first; (7) AC6(a) lost its single-declaration approve — D27's test covers it; (8) "must be revised"
is silent on a background refetch — in reading order beside its vote; (9) Approve → Deny keeps the pick — `submitVote` sends a code
only on an approve vote; (10) the strip's approve/keep test ids stay global — pre-existing; (11) the first-textbox selector —
the file's existing pattern; (12) the "six/seven" doc goes stale — folded into the records patch.

**Applied 2026-10-06 (BigDev: *"1"* — apply every patch).** RED-CHECKED (each fails with its fix reverted): the page-level 409 when
the acting claim leaves every bucket (`cycle-freeze-decision-error`); "Send verification code" disabled once held (a click sends
⛔ no code); the 600-id slice test (now real claims on BOTH sides — a last-slice-only reader fails it). Driven, ⛔ not red-checked
(the constraint is live on the shared test DB): `closure_uq` — two `super_admin_approval` rows on their OWN (superseded) trustee
decisions sharing only the closure ⇒ `23505` naming it. Also: the banner says a full page "may not be complete"; the response doc says
what is true of an empty and a full page; a response-level `superRefine` (`null` ⇒ `late_warnings_unavailable: true`, tested both
ways); the R9 vote-409 test drives a REAL vote code (`warning_reason_unavailable`), and finalize's WAIT (with the R9 own-reason
words) and its COUNTED `approve_votes_need_warning_reason` words are tested; P36's server `missing: "note"` / `"reason"` mapping
tested on the cycle-freeze page; the R9 finalize-held words live in a PERSISTENT `role="status"` (`r9-finalize-status`, asserted
empty before and the same node after); "Verify & finalize" now proven by a click (the claim held AFTER the code was entered, via a
query invalidation); the empty R9 wrapper rendered only when a block shows; the defensive words no longer claim approving is
unavailable; the snapshot note on sliced reads; `aria-describedby` targets asserted to EXIST (`document.getElementById`); the route
test's `search` reset in `afterEach`; the R9 mocks reset per test. Records: four round-1 lines carry appended corrections; the File
List names `primitives.ts` and every round-2/3 file; "seven" traced to RD16, EA2, Trap 7, AC2 and Task 2; the "SIX" code comment
names the six callers instead of a count-returning command; ~30 glyphs in round 2/3's code comments, test titles and records moved
onto a negation word (sweep: 0 left in the added lines).

Verified: `ci:local` (`DATABASE_URL` → :5433) **34 / 34 green** on the first run — contracts 74 / 1265, admin 59 / 918, domain 324 /
4511 (+1 skipped), api 148 / 1529 (+1 skipped). ⛔ No migration changed. ⛔ Not committed.


## Dev Notes

### What already EXISTS — traced at `b41ea25f` (rebuild ⛔ none of it)

| Thing | Where | Use |
|---|---|---|
| 6.23a's module | `claim/approval-warnings.ts` — `APPROVAL_WARNING_KINDS`, `approvalWarningKey`, `readClaimApprovalWarnings` (ONE statement; `ClaimApprovalWarnings` with `kinds`, `keys`, `postDeath`, `liveDecision`, `coverage.{districtAdminApproved, coveredKeys, approvalKeys, records}`, `reasonOptions`), the private `deriveClaimApprovalWarnings`, `uncoveredKeys(w, { excludeLateReasonsRecordedBy? })`, `lateWarningKeys`, `lateKeysUncoveredFor`, `lateWarningNothingUncoveredFor`, `assertApprovalReasonCoversWarnings` (NW6's order), `insertClaimWarningApprovalRecord` | every EA — CALLED, ⛔ never copied; RD2, RD3, RD9 widen |
| The reason list | `claim/approval-warning-reasons.ts` — `APPROVAL_WARNING_GENERIC_REASON` (`warnings_reviewed`), `listApprovalWarningReasons`, `activeReasonOptions`, `lockActiveApprovalWarningReason` (`FOR SHARE`; the generic resolves with ⛔ no read) | Trap 11, EA7 |
| NW14 | `claim/approval-warnings-persist.ts` — `recordLateWarningReason`, `LATE_WARNING_REASON_RECORDABLE_STATES` (four, incl. `state_trustee_approved`) | AC2's unblock path |
| The errors | `claim/errors.ts` — `ApprovalWarningReasonRequiredError(claimCaseId, kinds, missing)`, `WarningReasonUngroundedError`, `WarningReasonUnavailableError`, `LateWarningReasonRefusedError` (NW14 — ⛔ not the wait's) | Trap 7 |
| The record | `claim_warning_approvals` (0143; `schema/claim_warning_approvals.ts`) — composite FKs, `DISTRICT_ADMIN_WARNING_STEPS`, the jsonb UPDATE guard + cascade exception | EA1, Trap 10 |
| The DA reference implementation | `adjudicateClaim` (`verifier-decision-persist.ts`) — step (a3): read → lock reason (kinds non-empty AND a code) → rule → record row after the decision | Tasks 3–5 copy its SHAPE |
| The ONE gate | `assertClaimApprovable` (`nominee-name-check.ts:383`); `ClaimApprovalGateOptions` (`:410`); the inner helper (`:463`, `opts` `:469`); `readNomineeNameCheckApprovalState` | EA2 |
| The final vote / escalation | `voteOnFrozenClaim` (`state-trustee-decision-persist.ts:504`), `resolveEscalation` (`:1036`), `insertTrusteeDecisionRow` (`:420`, returns the row), `resolveConcealmentSnapshot`, `assertReasonCode` | EA3, EA4, Traps 1–3 |
| R9 | `castR9Vote` (`r9-voting-persist.ts:494`), `finalizeR9Outcome` (`:569`; live votes `:599-604`, gate `:623`); `claim_r9_votes`; `R9VoteRequest` (`contracts/src/claims/r9-voting.ts:223`); `getR9Panel` (`claim/r9-voting-read.ts:131`); `R9_OUTCOME_FROM_STATES` (`state.ts:78-85`) | EA5 |
| 6.19c | `decideEscalatedClosure` (`correction-closure.ts:1261`), `approveNoCorrectionNeeded` (`:1488`), `writeApprovalChain` (`:667-678`, returns `{ claimState, decisionId, deniedNoAppeal }`); `CLOSURE_SUPER_ADMIN_REASONS` + 0131's CHECK; `EscalatedClosureDecisionRequest` (`contracts/…/correction-closure.ts:142`), `NoCorrectionNeededApproveRequest` (`:178`); `NO_CORRECTION_NEEDED_DECISION_RATIONALE` (`claims.correction-closure.handlers.ts:90`) | EA6, Traps 4–5 |
| The lists | `getCycleFreezePending` (`claim/cycle-freeze-read.ts`; handler `claims.cycle-freeze.handlers.ts:288`); `listPariwarClosureQueue` (handler `claims.correction-closure.handlers.ts:449`); `readEscalatedClosureDetail` (the GET `getEscalation`, `claims.correction-escalation.handlers.ts:127` — the `:239` call is the POST's pre-check, untouched) | EA7, RD7 |
| The fail-closed precedent | `assembleApprovalWarnings` (`claims.verifier-console.handlers.ts`); the raw SAVEPOINT in `claims.nominee-declaration.handlers.ts` (`timeline_warning_anchor`) | Trap 15, EA10 |
| The admin surfaces | `cycle-freeze/{PendingCaseCard,CycleFreezePage}.tsx`; `r9-voting/{R9CasePanel,R9VotingPage}.tsx`; `correction-closure/{EscalationPanel,PariwarClosureStrip}.tsx` (⛔ not `ClosureColumn.tsx`); the picker `claim-verification/ApprovalWarningReasonPicker.tsx` (props: `options`, `value`, `onChange`, `disabled`, `error`, `idPrefix`); words `claim-verification/i18n-en.ts` (`approvalWarnings`, `reasonCodes`); `claim-verification/nominee-errors.ts` | EA7, RD6, AC11 |
| The District Admin's queue | `listClaimsUnderCorrection` + `candidateBatch` + `qualifyingRows` + `CORRECTABLE_SCAN_STATES` (`claim/correction-queue-read.ts`); `ClaimUnderCorrectionItem` (`contracts/…/nominee-name-check.ts:380`); handler `claims.nominee-name-check.handlers.ts:462`; `apps/admin/src/routes/CorrectionQueueRoute.tsx` | EA10 |

### What moves, and what must be preserved
- **Moves:** the files named in Tasks 1–10. **Preserved, byte-for-byte in behaviour:** every un-warned approval on every path; every deny /
  route / return / refuse / close / keep; the trustee presence rule (Trap 2); the closure reasons + 0131 CHECK (Trap 5); the domain list
  readers' shapes (RD7); 6.23a's console section and its 19-read ceiling (this story adds ⛔ no console read); the RTBF pin (18 tables / 21
  statements — later rows carry ⛔ no note); the fence (36) unless a NEW module file is added (none is planned); the appeal-reviewer
  exclusion `getOriginalDeciderActorIds` (decisions and votes, ⛔ never records — `-279` A11, deliberate: do ⛔ not add
  `claim_warning_approvals` to it).

### Testing
- **Live-DB (domain):** `packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts` — AC2–AC6 on real rows (⚠ every
  wait scenario re-records a PASSING name check after its redetermination before expecting the wait — RD19): a District
  Admin approval over a warning, then the final vote (needs its own reason and row); a re-reviewed certificate making a key uncovered ⇒ the
  final vote, R9 finalize and the Super Admin approve (both the full and the `-251` waived) all 409; NW14 then unblocks them; 6.23a fact 3's
  path (approved → final vote denied → appeal reversed → re-reviewed in `reversed` → the next final vote waits); a reversed `-239` refusal
  reaching the final vote (never waits); an escalation resolved then voted (two rows); R9 votes cast before / after a warning appears, revised
  (history kept), finalized; D27 with and without warnings; a reason replaced between read and write (Trap 11 — the two-connection `FOR SHARE`
  race shape 6.23a round 3 added); concealment + warning at the final vote (Trap 3); ⭐ (`-279`) the Pariwar Admin's own late reason ⛔ not
  clearing their own vote, another holder's clearing it (A1); R9 from `verification_in_progress` — votes over the 90-day key only, then a
  post-death key ⇒ finalize 409 per vote, revise ⇒ finalized (A2); `state_trustee_approved` → R9 (`-280`); a stale determination ⇒ the bulk
  reader says awaiting (Trap 13) + the bulk ↔ per-claim parity over dirty input (every field but `reasonOptions`); the correction queue's late arm on / off / forced failure
  (EA10). Seed dates per Trap 16. ⚠ ⛔ No TRUNCATE of a parent reaching `claim_warning_approvals` (6.23a's Testing note); ⚠ ⛔ no `DROP SCHEMA`.
- **Policy:** the widened record table (AC1) — in `packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts`.
- **Unit (domain):** `uncoveredKeys` with a list exclusion; `keysNotCoveredBy` as a plain set difference (RD17's no-District-Admin red
  check is the live-DB R9 arm from `verification_in_progress`, AC5); `own_reason_excluded`'s arithmetic; the step-discriminated insert types.
- **API:** the 409 codes and `details` through each route that reaches a later writer (the cycle-freeze decision, the R9 vote, R9
  finalize, the escalation decision, the D27 approve); the D27 note encrypted (⛔ not the constant) when warned; the read
  DTOs incl. `available: false` (a fault seam on the reader, as 6.23a's console fail-closed test); the audit lines.
- **Bulk:** the statement-count test (AC7) on the cycle-freeze pending handler with 1 vs 10 warned claims.
- **Contracts:** the new optional fields' `superRefine` rules and the shape tests; the step lockstep.
- **Admin (RTL):** each surface — the line, the picker (label, when to use, added by / on), the note required, *"waits for the District
  Admin"* disabling Approve with words, the own-reason words, the unavailable words (Deny still enabled), the R9 per-vote line, the error words;
  `NoCorrectionStrip` vs `ClosureRequestStrip` (Trap 12); the queue's late row; AC11's label. A 409 test with a REAL `useQuery` where a reset
  is keyed on server state ([[project_tanstack_onsettled_before_success]]).
- **Unchanged (run unmodified):** every deny / route / return / closure / keep spec; `correction-closure-shape.spec.ts`; `permissions.test.ts`
  (51 / 65); `dpdpa-consent-events.test.ts` (35); `rtbf-anonymize.test.ts` (18 / 21); 6.23a's import-scan and kinds-pin tests.

### Previous-story intelligence
- **6.23a** (`done`) — the module, the keys, the record, the list, the picker, NW14, NW18; its Traps 2 (gate order), 5 (date-bomb fixtures),
  13 (coverage is the District Admin's rows only), 16 (a replaced reason). ⭐ Its FOUR review rounds' lessons, each relevant here: composite
  tenant FKs (RD1); fail closed on a warnings read, ⛔ never "no warnings" (RD12); a raw SAVEPOINT where a soft read cannot run last; kinds
  OMITTED when unknown in audit (RD15); code-point limits, never `.length`, on any new text bound; a step-up retry must ⛔ never resubmit a
  cancelled or edited reason (R9 finalize is step-up gated); `confirm()` re-checks the pick; a 409 refetches; focus moves to the result;
  every new string a family-13 announcement; mount conditions must survive their own success (round 2's `status !== 'idle'`).
- **6.18** — P3 is *"THE MOST LOAD-BEARING OF THE THREE GATES"* (its own comment): every reversal and post-approval correction passes it.
- **6.19c** — the T10 seam (`ClaimApprovalGateOptions`) waives the name check ONLY; the `-273` §10 closure reasons are a CHECK.
- **6.13 / 6.14** — the D-F presence rule; R9 votes are revisable until finalize; finalize locks live votes `FOR UPDATE` in `vote_id` order.

### Git intelligence (`2059482b..b41ea25f`)
17 commits: 6.23's governance (`-277`…`-280`, rebase-merged as PR #253), 6.23a's governance (`epics.md`), its build (`38a00962`), its
review rounds 1–4 (`1d11973f`, `b25b9f8e`) and its SHA map (`b41ea25f`, PR #255). ⛔ Nothing else touched `packages` / `apps`. House
patterns confirmed: hand-authored migrations with a journal entry; `story(…)` / `governance(…)` commit prefixes; governance commits FIRST;
REBASE-merge with a SHA map afterwards.

### Latest technical notes
⛔ No new dependency and ⛔ no version change: Zod v3 (`.strict()`, `superRefine`, `z.ZodIssueCode.custom` — as the touched contracts already
use), Drizzle (`foreignKey()`, `unique()`, `check()`, `.for('share')` — as 0143 / 6.23a use), TanStack Query (as the admin hooks). ⇒ ⛔ no
external research was needed; follow the patterns in the files named above.

### Project context
⛔ No `project-context.md` exists in the repo; the house rules are the story files, `.decision-log.md` and the memory index.

### References
- `.decision-log.md` — ⭐ `-280` · ⭐ `-279` A1–A6, A10, A11 (A2's code: RD5) · ⭐ `-278` EA1–EA9 (and its supersession 2) · ⭐ `-277` Q2, Q3
  (readings — two Q3 clauses superseded: *"re-records their approval (a revision)"* by `-278` supersession 2, *"R9 or an appeal reversal has
  none"* by `-279` A5; BigDev's confirmation; Consequences 1–2) · `-264` FQ12 (heading), not-cover · `-262` FQ5 (row 6-24's wait) · `-263` FQ9 (row
  6-26's gate) · `-226` cl.7 · `-251` · `-273` §10.
- `6-23-post-death-nominee-change-warnings.md` (Story 6.23a — NW1, NW5, NW13–NW18, Traps 2, 5, 13, 16; its Review Findings rounds 1–4).
- `deferred-work.md` — sections *"Recorded during Story 6.23a"* (RD13's item; the verifier-rationale RTBF item) and *"Deferred from: code
  review of 6-23-…, round 3 chunk 1"* (RD14).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-04-6-23-warnings-confirms.md` (✅ ruled).
- `epics.md` `### Story 6.23b` (Minted-by header; ACs in brief — a summary, ⛔ not the full statement: its header omits `-280` and the
  brief omits A1's own-reason exclusion and AC11, both noted in its appended 2026-10-05 annotation).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `/bmad-dev-story 6.23b`, 2026-10-05.

### Debug Log References

- Task 0: `b41ea25f` an ancestor of HEAD; `git diff --name-only b41ea25f..HEAD -- packages apps scripts` EMPTY; `-280` still the newest decision.
- 0144 applied to BOTH :5432 and :5433 (`db:migrate`; the new CHECK present on both). `db:check` / `schema:check` green.
- Found while testing (fixture facts, ⛔ code defects): (1) the policy spec's lockstep regex `[a-z_]+` could ⛔ not match `r9_vote` — widened to
  `[a-z0-9_]+`; (2) after a redetermination the fixture contact record's CLAIMANT is a discarded version, so the contact check (after the gate)
  answers `claimant_details_missing` once the wait clears — the specs re-point it (domain) / top it up (API, `ensureClaimContact`); (3) one
  test transaction stamps the approval and a later redetermination with the SAME `now()`, so EA10's tight `>` arm (correctly) does ⛔ not fire —
  the specs backdate the approval a minute (separate transactions in life); (4) the API `seedNomineeNameCheck` re-accepts the certificate at
  ITS default date and silently undid the redetermination — the API spec records the passing check through the real writer instead; (5) the
  first statement counter counted the auth layer's pool-level reads (cache-timing noise, 27 → 29) — it now counts in-transaction statements
  only (a planted per-claim loop then reads 22 → 31, red).
- Red-checked (each restored after): the gate's wait conjunct (Trap 17 arm), the trustee writers' rule (AC3/AC4 — 7 red), R9's vote rule +
  binding check (AC5 — 3 red), 6.19c's rule (AC6 — 4 red), EA10's post-filter arm (AC10 — 2 red), the API translator mapping (3 red), the
  bulk read (statement count red), the card's warning rule (2 red), the queue route's hide rule (1 red); every new contracts test red before
  its code (12 / 13).

### Completion Notes List

- (create-story, 2026-10-04) Written at the split of row `6-23` (BigDev: *"ok, split it"*), after `-277`. ⛔ No code; status `backlog` until 6.23a is `done` (the 6.21b precedent).
- (create-story, 2026-10-05) ⭐ Re-derived against 6.23a's shipped build at `b41ea25f` (v2.0): RD1–RD16 threaded; ⛔ no decision moved. Status `backlog` → `ready-for-dev`. Ultimate context engine analysis completed — comprehensive developer guide created.
- (validate, 2026-10-05) v2.1: three fresh-context read-only verifiers (code cites, design soundness, governance continuity); 23 findings, BigDev: *"all"*. ⛔ No decision moved; status stays `ready-for-dev`.
- (dev-story, 2026-10-05) ⭐ **Built — Tasks 0–10.** ⛔ No decision moved; every EA as written, every RD as found.
  - **Migration 0144** (EA1, Trap 10, RD1, RD14): the `step` CHECK widened to seven; `trustee_decision_id`, `r9_vote_id`, `closure_id` with
    three UNIQUE targets and three COMPOSITE `ON DELETE cascade` FKs; `claim_warning_approvals_later_step_fk_check` (exactly each step's FK
    set — `super_admin_approval` both); an index per column; ⛔ no trigger edit (the jsonb guard covers the new columns — proved), ⛔ no
    DEFERRABLE (proved). The three step copies moved together (migration, schema + Drizzle `check()`, contracts mirror).
  - **The module** (`approval-warnings.ts`): `readClaimApprovalWarningsBulk` (ONE statement, `LATERAL` per claim, the SAME pure derivation;
    per-claim `reasonOptions` `[]` by design — read once per response), `readR9VoteWarningCoverage`, the pure `keysNotCoveredBy` and
    `r9ApproveVotesMissingKeys` (ONE copy for finalize AND the panel), `lateWarningWait` / `assertLateWarningsCovered` (EA2), a viewer
    summary, the list exclusion (RD3), the step-discriminated insert (RD2 — 6.23a's two callers compile unchanged, plus a compile-time
    lockstep), and ONE helper for THE ONE RULE at every later writer (`checkLaterApprovalWarningReason` — `adjudicateClaim`'s (a3) shape).
  - **The WAIT** — the LAST conjunct of `assertClaimApprovable`; `approvingActorIds` REQUIRED (typecheck found exactly the seven calls — ⚠ *appended, code review round 2:* SIX production calls; "seven" is the spec's own count — RD16, EA2, Trap 7, AC2 and Task 2 all say it — and round 1's dismissal #10 already said six); the
    inner helper takes `Pick<…,'nameCheck'>`; the T10 seam test rewritten with Trap 17's `waived_251` arm.
  - **The writers**: `voteOnFrozenClaim`, `resolveEscalation` (before the supersession — ⛔ nothing written before a refusal), `castR9Vote`
    (best-effort) + `finalizeR9Outcome` (binding, per vote, per key; `voterActorId` on the live-vote select), `decideEscalatedClosure` (both
    arms), `approveNoCorrectionNeeded` (the note only when a code was sent). Every input `warningReasonCode?: string | null` (RD18).
  - **EA10**: the tight superset arm, the THIRD post-filter arm, the bulk read under a raw SAVEPOINT in `qualifyingRows`,
    `opts.onLateWarningsUnavailable` (the array return kept), the header amended; the response's `late_warnings_unavailable`.
  - **Contracts**: `ApprovalWarningsSummary`; the request fields and their `superRefine`s (R9's first; D27's pairing); the four read DTOs
    (`.nullable()` on the closure-queue item — RD20); `covers_current_warnings`; the queue fields; RD21(b)'s fixture.
  - **API**: ONE shared `later-approval-warnings.ts` (the error mapping per prefix — 6.23a's three inline mappings moved into it verbatim —,
    the summary / options DTOs, the SAVEPOINT); the four translators; every read DTO attached in the handler, fail-closed; D27's note
    encrypted instead of the constant; the RD15 audit fields.
  - **Admin**: ONE shared `LaterApprovalWarnings` block mounted on the cycle-freeze card (Approve + Resolve → Approve; the warned body with ⛔
    `reason_code`), the R9 panel (the approve vote; the per-vote "must be revised" line; Finalize held WITH words before the step-up — the
    WAIT holds Finalize, ⛔ the vote), the Super Admin's decision (approve only), `NoCorrectionStrip` (its OWN note — ⛔ the Keep note; ⛔ the
    closure-request strip); the error words per suffix; a 409 refetches; AC11's label; the correction queue's late row (chase + closure hidden
    on a late-only row) and the unavailable line.
  - **Records**: `deferred-work.md` — a new section *"Recorded during Story 6.23b"* (Task 9's five items + the pre-existing ⛔-rejected-line
    gap on the 6.19c routes) and AC11's closure line on the RD13 item (its text kept).
  - **Tests**: domain unit (32), the domain live-DB spec (28) + the two-connection race (2) + the policy spec (20, both DBs), contracts (13 +
    the lockstep fixture), API (9, incl. the HTTP statement count and the fault seam), admin RTL (20 + 3 queue). Suites: domain 323 files /
    4503 tests; contracts 74 / 1261; API 148 / 1527; admin 58 / 893 — all green with `DATABASE_URL` → :5433. Gates: human-actor,
    access-wrapper, microcopy, domain-invariants, claim-state, canonical-id, OpenAPI determinism — green.
  - **`ci:local` (with `DATABASE_URL` → :5433)** — run 1: 32 / 34; `lint` (two unused names in the new domain spec) and `microcopy` (the
    tone rule's *"does not count"* in two of my code comments) — both mine, both fixed (`lint` exit 0 repo-wide; the microcopy gate passed).
    Run 2: 33 / 34 — `test (unit)` failed ONLY on `@twt/channels`' 100-thread determinism test, a 90 s timeout under the job's
    `--concurrency=4` load (96 s there; 3.2 s alone; ⛔ a file this story touches — `packages/channels` has 0 changes; it passed in run 1).
    The job's exact command re-run alone: **37 / 37 green**. Named, ⛔ silently re-run ([[project_ci_local_concurrency_oversubscription]]).

### File List

**New**
- `packages/domain/migrations/0144_claim-warning-approvals-later-steps.sql`
- `packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts`
- `packages/domain/tests/integration/claim/approval-warnings-every-approver-race.spec.ts`
- `packages/contracts/tests/approval-warnings-later-approvers.test.ts`
- `apps/api/src/modules/claims/later-approval-warnings.ts`
- `apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts`
- `apps/admin/src/modules/claim-verification/LaterApprovalWarnings.tsx`
- `apps/admin/tests/later-approval-warnings.test.tsx`

**Modified — domain**
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/claim_warning_approvals.ts`, `claim_state_trustee_decisions.ts`, `claim_r9_votes.ts`, `claim_correction_closure.ts`
- `packages/domain/src/claim/approval-warnings.ts`, `errors.ts`, `nominee-name-check.ts`, `verifier-decision-persist.ts`,
  `state-trustee-decision-persist.ts`, `r9-voting-persist.ts`, `correction-closure.ts`, `correction-queue-read.ts`
- `packages/domain/tests/claim/approval-warnings.test.ts`
- `packages/domain/tests/integration/claim/nominee-name-check.spec.ts`
- `packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts`

**Modified — contracts**
- `packages/contracts/src/claims/verification-decision.ts`, `cycle-freeze.ts`, `r9-voting.ts`, `correction-closure.ts`, `nominee-name-check.ts`
- `packages/contracts/tests/nominee-name-check-vocabulary-lockstep.test.ts`

**Modified — API**
- `apps/api/src/modules/claims/claims.verification-decision.handlers.ts`, `claims.cycle-freeze.handlers.ts`, `claims.r9-voting.handlers.ts`,
  `claims.correction-closure.handlers.ts`, `claims.correction-escalation.handlers.ts`, `claims.nominee-name-check.handlers.ts`

**Modified — admin**
- `apps/admin/src/api/client.ts`, `apps/admin/src/api/hooks.ts`
- `apps/admin/src/modules/claim-verification/i18n-en.ts`, `index.ts`, `nominee-errors.ts`
- `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx`, `CycleFreezePage.tsx`
- `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`
- `apps/admin/src/modules/correction-closure/EscalationPanel.tsx`, `PariwarClosureStrip.tsx`
- `apps/admin/src/routes/CorrectionClosureRoutes.tsx`, `CorrectionQueueRoute.tsx`
- `apps/admin/tests/cycle-freeze-page.test.tsx`, `pending-case-card-return.test.tsx`, `r9-case-panel.test.tsx`, `correction-closure.test.tsx`,
  `correction-queue.test.tsx`, `correction-chase-forms.test.tsx`

**Modified — records**
- `_bmad-output/implementation-artifacts/6-23b-every-approver-gives-a-warning-reason.md` (this file), `deferred-work.md`, `sprint-status.yaml`

**Appended — code review round 2 (2026-10-06; family 10 — the list above is ⛔ not rewritten).** Round 1 (`a87c2311`) ADDED
`packages/domain/migrations/0145_claim-warning-approvals-event-uniqueness.sql` (+ its `_journal.json` entry) — the three UNIQUEs on
`trustee_decision_id` / `r9_vote_id` / `closure_id` (round 1's decision-needed #2) — and the list above never named it; it also touched
files the list does name. Round 2 modifies: `packages/domain/src/claim/approval-warnings.ts`, `correction-queue-read.ts`,
`nominee-name-check.ts` (a comment); `packages/contracts/src/claims/nominee-name-check.ts`, `correction-closure.ts`;
`apps/api/src/modules/claims/later-approval-warnings.ts`, `claims.correction-closure.handlers.ts`;
`apps/admin/src/modules/claim-verification/i18n-en.ts`, `apps/admin/src/routes/CorrectionQueueRoute.tsx`; and the tests
`packages/domain/tests/integration/claim/approval-warnings-every-approver.spec.ts`, `…-race.spec.ts`,
`packages/domain/tests/integration/rls/claim-warning-approvals-policy-regression.spec.ts`,
`packages/contracts/tests/approval-warnings-later-approvers.test.ts`,
`apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts`, `apps/admin/tests/correction-queue.test.tsx`. *⚠ Appended — code review round 3:* round 1 also touched `packages/contracts/src/_common/primitives.ts` (the shared `isBlank`),
named nowhere above. Beyond the chunk-1 list, chunk 2 and round 3 modify `apps/admin/src/modules/claim-verification/LaterApprovalWarnings.tsx`,
`apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx`, `PendingCaseCard.tsx`, `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`,
`apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx`, `apps/admin/src/routes/CorrectionClosureRoutes.tsx`, the tests
`apps/admin/tests/later-approval-warnings.test.tsx` and `correction-chase-forms.test.tsx`, and ADD
`apps/admin/tests/escalation-detail-claim-switch.test.tsx` (new). (`git diff --name-only HEAD -- apps packages` + the one untracked file.)

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-04 | **Created at the split** of row `6-23` from `-277` Q2 C and Q3 B (DR + KB; our reading B for Q2 ⛔ not taken; BigDev confirmed the broad "every approver" reading). Traced at `2059482b`: the five approver writers, the trustee presence rule (Trap 2), the D27 approve's empty request + fixed rationale (Trap 4), 0131's closure-reason CHECK (Trap 5), the bulk lists (Trap 8). EA1–EA9 ⏳ PROPOSED (committed by `-278` in 6.23a's Task 0). Status **`backlog`** until 6.23a is `done`. *(Kept in git.)* |
| v1.1 | 2026-10-04 | ⭐ **Follows 6.23a v2.1's REASON LIST** (BigDev, 2026-10-04): every later approver picks from the SAME Pariwar list (generic + the Super Admin's replace-only entries, each showing who added it and when to use it) and leaves a row in 6.23a's `claim_warning_approvals`. ⇒ EA1 is now the record's LATER steps (⛔ no trustee enum value, ⛔ no R9 reason column — v1.0's EA1 / EA5 migrations dropped); Trap 3's concealment clash dissolves (the trustee `reason_code` stays free); NEW EA8 (notes ⛔ never replaced — ⛔ no revise path exists for later approvers; R9's pre-finalize revisability kept, history intact, BigDev accepted); Traps 10 (the CHECK widening) and 11 (a replaced reason) new. Status stays **`backlog`**. |
| **v1.2** | **2026-10-04** | ⭐ **Follows 6.23a v2.2's validate** (fresh context, at `a55480a8`). The wait holds in `reversed` (6.23a fact 3 — a District Admin approval survives a denied final vote and an appeal reversal) — EA2 and an AC2 arm; *"reversed"* in AC2's never-waits list now reads *"refused by the District Admin and then reversed"*; the "no correction needed" note is new (the Q2 row — `-278` corrects `-277`'s reading); `castR9Vote` takes ⛔ no claim-row lock (Trap 6); the import direction (Trap 7); 6.23a's nullable `verifier_decision_id` and jsonb UPDATE guard (Trap 10); `writeApprovalChain` already returns its `decisionId` (EA6, Task 5); `r9-voting.test.ts` (Task 6); EA1's migration is **0144**; error / helper names follow 6.23a (`WarningReasonUngroundedError`, `lockActiveApprovalWarningReason`). Status stays **`backlog`**. |
| **v1.3** | **2026-10-04** | ⭐ **`-278` COMMITTED** (`a125a59d`) — EA1–EA9 as written in v1.2. ⛔ No design change. Status stays **`backlog`**. |
| **v1.4** | **2026-10-04** | ⭐ **Follows the second fresh-context validate of the set** (6.23a v2.4; three read-only verifiers; BigDev: *"All"*, *"Not the final approver"*, *"Correction queue, in 6.23b"*) — decision changes by author-commit **`-279`**. HIGH: R9 finalize checks each live approve vote's row covers EVERY current key, ⛔ not that a row exists (EA5, Trap 6, AC5 — `-279` A2; found by two verifiers independently). MEDIUM: the wait does ⛔ not count a late reason recorded by the approving actor — `approvingActorIds` on the gate's options seam (EA2, AC2 — A1); the District Admin's correction queue lists a waiting claim (NEW EA10, AC10, Task 10 — A4); `-277`'s *"R9 or an appeal reversal has none"* clause superseded (Q3 row — A5); `ClosureColumn.tsx` dropped and the closure-request `closure-approve` named as a refusal path that ⛔ never carries the picker (Trap 12, EA7, AC7); the bulk reader's out-of-date rule (Trap 13 — A3). LOW: `super_admin_approval` carries `trustee_decision_id` too (EA1 — A10); four translators, ⛔ not five (Trap 7, Task 7); ⛔ no contracts test pins the request shapes (Task 6); D27's `note` ⇔ code pairing and R9's first `superRefine` (EA5, EA6, AC5, AC6); the admin client + hooks (Task 8); the TRUNCATE note. ⭐ **Then the fresh-context RE-VALIDATE of `-279`** (before insertion): the 409 carries `own_reason_excluded` and names who can answer (6.23a's NW14 now judges `nothing_uncovered` for the recorder); the R9 panel's flag also excludes every live approve voter; EA10's TIGHT superset arm (a determination decided after the approval), the post-filter's THIRD arm and the module header; the inner helper's `Pick` and the T10 seam test; `voterActorId` on finalize's vote select; A7 withdrawn; AC5's first arm reworded. ⭐ **A third round** found an R9 approval from `state_trustee_approved` could stall under A1 (its voters are the late-reason recorders, and NW14 refused there) ⇒ `-280` adds that state to NW14 (AC2 arm); Task 10 names the header amendment and the hidden actions. ⭐ **Round 4: ⛔ no BLOCKER or HIGH** — the 409's words now exclude live R9 approve voters, and the all-voters R9 residual is recorded (Task 9); AC0's parenthetical placed after `-279`. Status stays **`backlog`**. |
| **v1.5** | **2026-10-04** | **Merged as PR #253 (rebase), docs only.** Every branch SHA this file cites is mapped to its `main` twin in the header note (all 11 commits, proved by identical `patch-id`); ⛔ no citation rewritten. Status stays **`backlog`**. |
| **v2.0** | **2026-10-05** | ⭐ **RE-DERIVED against 6.23a's SHIPPED build (`bmad-create-story 6.23b`) — re-pinned `2059482b` → `b41ea25f`; `backlog` → `ready-for-dev`.** 6.23a went `done` (PR #255) after four review rounds; every code claim here was re-opened at `b41ea25f`. ⛔ No decision moved — sixteen FOUND facts (RD1–RD16) change the build: the record's FKs are COMPOSITE with three new UNIQUE targets (RD1); the record insert takes a step-discriminated input (RD2); `uncoveredKeys`' exclusion widens to a list for P4 (RD3); the wire is snake_case while 6.23a's option DTO stays camelCase (RD4); every R9 code is `r9_voting.*`, so `-279` A2's `r9.` string is a slip (RD5); `cycle-freeze/` and `r9-voting/` have ⛔ no `i18n-en.ts` — shared words go to `claim-verification/` (RD6); `correction-closure-shape.spec.ts` pins exact keys ⇒ the warnings attach at the handler (RD7); the R9 panel and the Super Admin's detail are single-claim (RD8); the bulk reader reuses 6.23a's `deriveClaimApprovalWarnings` (RD9); per-vote coverage needs a new `r9_vote` read (RD10) and the panel shows out-of-date votes before finalize (RD11); 6.23a's fail-closed shape on every surface, a SAVEPOINT on the queue's arm (RD12); a `deferred-work.md` item routed here by name — the raw verifier reason code on the card (RD13, NEW AC11); 0144 adds ⛔ no deferred constraint (RD14); 6.23a's audit convention (RD15); the `-251` waived approve waits too — seven gate calls, ⛔ not six (RD16, NEW Trap 17). NEW Traps 14 (shape pins + strict fixtures), 15 (fail closed, Approve only), 16 (the red set is EMPTY — fixtures re-verified at 2026-01-05), 17; invariant 7; every `file:NNN` re-read (`client.ts` `:1534` → `:1539`; the rest held). |
| **v2.1** | **2026-10-05** | ⭐ **Validate (`bmad-create-story validate 6.23b`, at `9c3c6181`; ⛔ no code moved since `b41ea25f`) — three fresh-context read-only verifiers; 23 findings, all applied (BigDev: *"all"*); then a fresh-context RE-VALIDATE of this pass's own edits found 11 defects IN THEM (4 MEDIUM: a false *"first SAVEPOINT in `packages/domain`"* precedent — `contribution/write.ts:226` is one; RD19's D27 refusal mis-located at `:1500` — it is the gate's stale check at `:1507`; *"EA7 amended"* — `-279` A3 only reaches it; Trap 16's heading contradicting its new exceptions) — all fixed. ⛔ No decision moved; status stays `ready-for-dev`.** HIGH: R9's per-vote check must ⛔ never reuse `uncoveredKeys`, which returns `[]` without a District Admin approval — exactly `-279` A2's target case — ⇒ NEW pure `keysNotCoveredBy` (RD17; Trap 6, EA5, AC5, Tasks 2/4, unit test); the new domain inputs are OPTIONAL `?: string \| null` as 6.23a's are — ≈ 88 typechecked test calls (RD18; EA5/EA6, Tasks 3–5). MEDIUM: every wait scenario re-records a passing name check after the redetermination, else the stale-check 409 fires first (RD19; AC2, Testing); two shipped tests red BY DESIGN, rewritten — the policy spec's `r9_vote` invalid-step line and the contracts lockstep fixture (RD21; Traps 14/16, Tasks 1/6); `PariwarClosureQueueItemDto.approval_warnings` nullable, `null` on `closure_request` (RD20; EA7, AC7, Task 6); EA10's channel named — `opts.onLateWarningsUnavailable`, the array return kept, a raw SAVEPOINT in `qualifyingRows` (Task 10). SHOULD: the GET is `:127` only, `:239` is the POST pre-check (Task 7, Dev Notes); parity excludes `reasonOptions` (Trap 13, AC7); AC5's "exactly" scoped to a current determination; the 6-22 member-declare gap in EA10 recorded as a deferred item (Task 9); `-279` A6/A11 carried, EA7 among the amended (LETTERS, AC0, References, *What moves*); row 6-24's refile shows the same warnings (Trap 9); the contact-check order change stated (EA2); EA5's code change marked in place (RD5); `epics.md` annotated for `-280`, A1 and AC11 (⛔ not rewritten). CLEANUPS: RD6's matchers live in each page's `errorMessage`; the API specs do ⛔ not `.parse`; EA4's "first write"; `deniedNoAppeal` and the chase summary's null fields; Task 7 tagged AC8; two `-277` Q3 supersessions, the rulings column header, EA1's A10 attribution, the 6.19c RTBF cross-reference; four `⛔`-on-code-word glyphs and a widened sweep regex. |
| **v2.2** | **2026-10-05** | ⭐ **Built (`/bmad-dev-story 6.23b`) — Tasks 0–10; `ready-for-dev` → `in-progress` → `review`.** Migration 0144 (the later steps, composite FKs, the step ⇔ FK CHECK) on both DBs; the WAIT as the gate's last conjunct with REQUIRED `approvingActorIds` (seven calls); THE ONE RULE at every later writer through one helper; R9's binding per-vote, per-key check (`keysNotCoveredBy`); EA10's queue arm under a SAVEPOINT; the contracts, the API (one shared mapping; fail-closed reads; D27's note) and ONE shared admin block on the four surfaces; AC11's label; the `deferred-work.md` records. ⛔ No decision moved. See Completion Notes. |
| **v2.3** | **2026-10-06** | **Merged as PR #257 (rebase); the `pre-push` `ci:local` and all 34 GitHub checks passed.** The header gains the 6.23b SHA map (6 commits, each pair proved by identical `patch-id`; merged tree byte-identical). ⛔ No citation rewritten. |
