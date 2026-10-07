---
baseline_commit: 3311fc97
---

<!--
⭐⭐ MERGED 2026-10-07 as PR #259 (REBASE-merge) — THE STORY-6.26 SHA MAP (6.26a's branch carried the WHOLE of 6.26's
governance too: the story, the routing notes, `-281`…`-287`). The 20 commits of
`story/6-26-ground-inspection-before-approval-and-death-facts` (from `3311fc97`) were rewritten by the rebase; the citations in
this file, in `6-26b-death-facts-warnings-and-register-check.md`, in `sprint-status.yaml` and in `.decision-log.md` are kept AS
WRITTEN (the record — a decision entry is ⛔ never edited) and this maps them to their `main` twins, PROVED ⛔ not assumed: each
pair has an IDENTICAL `git patch-id --stable` and an identical subject, and the merged tree (`264c8e4e`) is byte-identical to the
branch head (`27c5f0ef`) — tree `fe7c91f4` both. `main` had not moved (the merge-base was `3311fc97`), so the rebase rewrote SHAs only.
  · `9282d108` → `d54cfaf2`  story created, the Q1/Q2 routing note, the Panel's r  (cited)
  · `97403945` → `23959044`  -282 — the author-commit for Story 6.26's eighteen b  (cited)
  · `d5099d59` → `cdf6c08d`  record -282 in Story 6.26a (v2.1) and 6.26b (v1.1) — Task  (⛔ not cited)
  · `e1907338` → `4e591523`  epics.md gains Story 6.26a and Story 6.26b (Minted-b  (cited)
  · `e8200366` → `42a0a2f0`  -283 — author-commit correcting -282 after the first  (cited)
  · `d7121017` → `ebca1e6e`  first fresh-context validate — Story 6.26a v2.3 and 6.26b  (cited)
  · `72afe24d` → `cb205e22`  -284 — erratum to -283 from its fresh-context re-val  (cited)
  · `e9df723e` → `4984a7a4`  validate round 2 — Story 6.26a v2.4 and 6.26b v1.3 rewrit  (⛔ not cited)
  · `24037f02` → `52670cb6`  validate round 3 — no blocker/high, rounds stop; Story 6.  (⛔ not cited)
  · `5fc25038` → `653623fe`  routing note — the -284 E5 Panel confirm: does FQ9 a  (⛔ not cited)
  · `dd65d701` → `4821134c`  routing note — say what the R9 panel is, in plain wo  (⛔ not cited)
  · `ea9b1c55` → `98e79a11`  -285 — Trustee-ratified (DR + KB, "A"): FQ9 holds ev  (cited)
  · `4bdb72ed` → `1ef99933`  record -285 (Panel ruled A) — routing note block filled,  (⛔ not cited)
  · `f4d533c3` → `6c83946b`  build — every approval waits for a complete ground inspe  (⛔ not cited)
  · `c855d651` → `0ffedf22`  code review (4 chunks: domain / api / admin / contracts+  (cited)
  · `1f45c6f5` → `ced2965d`  -286 — author-commit amending -282 GI4 from the sec  (cited)
  · `0ac5165c` → `d2248f87`  second code review (full diff, 3 layers in parallel) — 2  (cited)
  · `c1dda242` → `93bc0c93`  -287 — author-commit superseding -286 H1's stamp so  (cited)
  · `e23c3546` → `f6d81f79`  narrow round 3 (re-validate of -286 + review of the roun  (cited)
  · `27c5f0ef` → `264c8e4e`  round 4 — fresh check of -287 (stands; rounds stop); 1 m  (⛔ not cited)
Re-verify (bash — zsh does not word-split `$p`): `for p in "9282d108 d54cfaf2" "97403945 23959044" "d5099d59 cdf6c08d" "e1907338 4e591523" "e8200366 42a0a2f0" "d7121017 ebca1e6e" "72afe24d cb205e22" "e9df723e 4984a7a4" "24037f02 52670cb6" "5fc25038 653623fe" "dd65d701 4821134c" "ea9b1c55 98e79a11" "4bdb72ed 1ef99933" "f4d533c3 6c83946b" "c855d651 0ffedf22" "1f45c6f5 ced2965d" "0ac5165c d2248f87" "c1dda242 93bc0c93" "e23c3546 f6d81f79" "27c5f0ef 264c8e4e"; do set -- $p; diff <(git show $1 | git patch-id --stable | cut -d' ' -f1) <(git show $2 | git patch-id --stable | cut -d' ' -f1); done`
— ⚠ needs the branch SHAs, which survive only while the branch (local or `origin/story/6-26-ground-inspection-before-approval-and-death-facts`) does.
-->

<!--
BASELINE — `3311fc97` on `main` (`governance(6.23b): map the story's branch SHAs to their main twins after the PR #257 rebase-merge`).
Every code claim below was traced on this SHA on 2026-10-06. ⭐ Two facts are kept apart: "the pin is an ancestor of HEAD" (durable) and
"the code claims were re-derived at `3311fc97`" (perishable). Before Task 1 run `git diff --name-only 3311fc97..HEAD -- packages apps scripts docs`
and re-read anything it lists that this file cites.

GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / none / nobody / neither / cannot / nowhere); `⭐` = key fact or
action; `⚠` = hazard. Sweep on every pass: `grep -oE "⛔ \**[A-Za-z]+"` — every head-word a negation.
ADDRESSING RULE: ⛔ no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every prepend
rots every number). Cite decision ids + clauses, item headings and row keys. `file:NNN` is used ONLY for code, as of `3311fc97`.
LETTERS: `GI1`…`GI18` are Story 6.26's author decisions — BOTH halves' (6.26a here, 6.26b in its own file) — committed by ONE author-commit
in Task 0 here (the 6.23a/6.23b precedent: `-278` for a split set). Each GI is tagged with the half that BUILDS it.
`Q1`, `Q2` are ✅ RULED by `2026-10-06-281` (Q1 B · Q2 A).

⭐ v2.3 = THE FIRST FRESH-CONTEXT VALIDATE (2026-10-06, HEAD `e1907338` — ⛔ no code moved since `3311fc97`, so every code claim was
re-derived at code identical to the pin). It found 2 blockers and 6 high findings; `2026-10-06-283` (author-commit, `e8200366`, committed
alone) AMENDS `-282` GI2 / GI3 / GI5 / GI6 / GI16 — the GI block below stays `-282`'s verbatim text, and each amended GI carries a
`⚠ AMENDED by -283` line directly under it. ⭐ Where a GI's text and its `-283` line disagree, the `-283` line is the build.
⭐ (v2.9) GI4 is amended AFTER the build by `2026-10-07-286` (H1, H2) and `-287` (J1, superseding H1's stamp source) — its
`⚠ AMENDED by -286 / -287` line sits under GI4 like the others.

⭐ v2.4 = ROUND 2 (the fresh-context RE-validate of `-283` and v2.3): `2026-10-06-284` (`72afe24d`, alone) corrects `-283` — E1 the
correction queue lists an R9-routed late warning (6.26b), E2 the field-class constant's real home, E3/E4 two slips, E5 the `-263` reading
kept with a NON-blocking Panel confirm. The `⚠ AMENDED` lines below name `-284` where it applies.

⭐ v2.5 = ROUND 3 (fresh-context re-validate of `-284` and v2.4): ⛔ no BLOCKER, ⛔ no HIGH ⇒ the validate rounds STOP. Its 5 MEDIUM /
9 LOW are story text only (⛔ no new decision entry): the leaf predicate also exports a SQL fragment (6.26b's queue needs it in SQL), GI7's
`-284` E1 line, the window evaluated on the LOCKED claim row in every event-emitting writer, the console context's new client field, and
records.

⭐ v2.0 IS THE SPLIT (BigDev 2026-10-06: *"write the panel note then we get the answer and then we split"*; `-281` Consequence 2). THIS file is
Story **6.26a** — it KEEPS the key `6-26-ground-inspection-before-approval-and-death-facts` because `-262`, `-263`, `-264` and `-281` cite it
(the 6.21a / 6.23a precedent). The warnings, the register check and 6.23b's queue are Story **6.26b**
(`6-26b-death-facts-warnings-and-register-check.md`), `backlog` until this story is `done`. v1.x (one story) is kept in this file's history.
-->

# Story 6.26a: No Approval Before the Ground Inspection Is Complete — the Inspector Sees and Photographs the Original Certificate, Matches It to the Copy, and Records the Date and Time of Death `[SURFACE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Today a family's death claim can be approved with ⛔ no ground inspection at all
> (`-263`'s finding). After this story **every approval waits until the claim's ground inspection is complete** (`-263` FQ9 A) — through
> the ONE approval gate, so the District Admin's approval, the Pariwar Admin's final vote, R9, and 6.19c's two Super Admin / Pariwar Admin
> approvals all wait — while a **refusal never waits for it**, and a claim whose visit cannot happen **waits, ⛔ never refused for it**.
> At the inspection the inspector **sees the original death certificate, photographs it, and records whether it matches the uploaded
> copy** (FQ11 A), and **records the date — and, if known, the time — of death the family gives** (`-262` FQ8 C). When a true nominee
> files again after a `-239` refusal, the inherited inspection saw the OTHER certificate, so **an inspector also sees the fresh original**
> — a short visit or an office check limited to the certificate (`-264` FQ13); the same check serves a certificate replaced after the
> visit (`-281` Q2 A). ➡ The District Admin's government-register (CRS) check (`-262` FQ8 B) and every **warning** these facts raise
> (`-264` FQ12, `-281` Q1 B) are **Story 6.26b's**. ⭐ **The system still refuses nothing.**

> ⭐⭐ **THE SPLIT (`-281` Consequence 2).** **6.26a (this file) is the GATE and everything the INSPECTOR records:** FQ9's conjunct, the
> review-window widening that keeps "waits" from becoming "forever", FQ11's original-certificate record, FQ13's certificate check — which
> also serves a certificate replaced after the visit (`-281` Q2 A) — the family's date and time of death (stored, with its index), the
> console's "why it waits" line and the inspector's facts. **6.26b** is everything that turns those facts into **warnings**, plus the
> **District Admin's register check**: FQ8 C's date difference, `-281` Q1 B's two "does not match" warnings, the register check on the
> accept (FQ8 B), and 6.23b's correction queue learning the new late source.
> ⚠ **Go-live coupling of 6.26a: Story 6.26b** — until it ships, an inspector's *"does not match"* and the family's date are SHOWN, but
> ⛔ no difference from the certificate is flagged (FQ8 C's *"the system shows the District Admin any difference"* is 6.26b's GI10 [b] —
> `-283` A8), ⛔ nothing asks an approver for a reason (`-264` FQ12 and `-281` Q1 B are ⛔ not yet in force for them), and ⛔ no register
> check is recorded. Merging 6.26a alone is fine ([[project_not_in_production_merge_is_not_golive]]); going live with it alone is ⛔ not.

> ⭐ **Not in `epics.md`'s story list.** Minted by Trustee rulings `-262` FQ8 B/C, `-263` FQ9/FQ11 and `-264` FQ13 (row
> `6-26-ground-inspection-before-approval-and-death-facts`). ⭐ `epics.md` Story 6.7 and PRD FR-40 are **already annotated** (2026-09-28 —
> verified at `3311fc97`); Task 0.6 added `### Story 6.26a` and `### Story 6.26b` entries with `> ⚠ Minted by…` headers (`e1907338`).
> ⚠ Story 6.7's annotation names this row as owning FQ8 B — since the split it is `6-26b`'s; a dated line is appended there (v2.3); the
> annotation is ⛔ not rewritten. `epic-6-retrospective` stays `done`.

> ⚠⚠ **FIVE FACTS THE RULINGS' TEXT DOES ⛔ NOT SAY — read before anything else.**
> 1. ⚠⚠ **A gate alone would strand claims FOREVER.** Every inspection writer refuses unless the claim is `verification_in_progress`
>    (`assertClaimInVerification`, `ground-inspection-persist.ts:225-233`) — but a claim can reach the final approval with ⛔ no inspection:
>    (a) the District Admin **denies** before any inspection (a refusal never waits) → the family **appeals** → the appeal **reverses** →
>    `reversed`, then the final vote; (b) an **escalation resolved as approve** (`resolveEscalation`, `state-trustee-decision-persist.ts:1090-…`
>    — ⛔ not gated, by 6.18's design) → `verifier_approved`. In both, the new conjunct refuses the final approval AND ⛔ no inspection can be
>    written ⇒ the claim waits with ⛔ no way out but a denial — exactly what FQ9 forbids (*"⛔ not refused for that reason"*). ⇒ **GI3 widens
>    the inspection writers to the claim REVIEW WINDOW** (`CLAIM_REVIEW_WINDOW_STATES`, `review-window.ts:15-21` = `verification_in_progress`,
>    `verifier_review`, `verifier_approved`, `reversed`, `state_trustee_freeze`). [[feedback_trace_reachability_before_escalating]]
>    ⚠⚠ **Two more exits the v2.2 text missed (`-283` A1, A4):** (c) **R9 finalize runs the gate in `state_trustee_approved` too**
>    (`R9_OUTCOME_FROM_STATES`, `state.ts:78-85` — the window plus that state); a refile's VISITED-by-inheritance can VANISH there (the
>    source's `-239` denial is revisable while `denied` — `VERIFIER_DECISION_REVISABLE_STATES`, `verifier-decision-persist.ts:59` — and the
>    inheritance keys on the source's LIVE `-239` decision) ⇒ the writers also admit `state_trustee_approved` **while the claim carries a
>    live `routed_to_r9` routing row**; (d) **the API `schedule` handler pre-checks the state itself**
>    (`claims.ground-inspection.handlers.ts:216-222`, `currentState !== 'verification_in_progress'` → 409 `ground_inspection.not_allowed`)
>    BEFORE the domain writer runs ⇒ widening only the domain guard leaves every Fact-1 claim stranded AT THE API with every domain test green.
> 2. ⭐ **The gate has ONE composition seam, and it is already waiting for this story.** `assertClaimApprovable`'s `opts` parameter comment
>    (`nominee-name-check.ts:394-406`; the function's own doc-block is `:344-388`) says: *"`6-26` adds the ground-inspection conjunct HERE, ONCE, and the `-251` path inherits it without
>    an edit."* The `-251` waiver returns early INSIDE the inner helper (`nominee-name-check.ts:523`), so an OUTER conjunct reaches the waived
>    approve by construction (`-263` Consequence 4 — 6.19c landed first; this story carries FQ9 into both halves). ⭐ Six production call
>    sites in five writers: `adjudicateClaim` (`verifier-decision-persist.ts:408`), `voteOnFrozenClaim` (`state-trustee-decision-persist.ts:600`),
>    `finalizeR9Outcome` (`r9-voting-persist.ts:676`), `decideEscalatedClosure` — both arms (`correction-closure.ts:1364`, `:1375`),
>    `approveNoCorrectionNeeded` (`correction-closure.ts:1573`). ⛔ None is edited.
> 3. ⭐ **The refile's inheritance already exists — FQ13 is buildable now, ⛔ not after row 6-24.** 6.20 AC13 built
>    `getInheritedGroundInspectionSource` (`nominee-refusal-read.ts:97-129`): a distinct claim for the same death inherits the most recent
>    earlier `-239`-refused claim's COMPLETED inspection — ⚠ ANY completed assignment, ⛔ no stage filter (`:118-124`), so once GI12 mints
>    `certificate_check` an office check would pass as a visit ⇒ `-283` A2 adds `AND gi.inspection_stage <> 'certificate_check'`. Today a refile reaches a distinct claim through the convergence OVERRIDE (6.20 T17);
>    row 6-24 will keep it apart automatically. ⚠ The verifier console reads the inheritance ONLY when the claim has ⛔ no own assignment at all
>    (`claims.verifier-console.handlers.ts:691-704`, `if (own.length === 0)`) — the moment the refile gets its OWN certificate check, the
>    inherited inspection would vanish from the console. ⇒ GI10 fixes that read.
> 4. ⚠ **The warning module never decrypts — and the certificate's date is Tier-1.** 6.23a invariant 7: `approval-warnings.ts` selects ⛔ no
>    ciphertext and decrypts nothing; its derivation runs in ONE SQL statement (`readClaimApprovalWarnings`, `approval-warnings.ts:213-…`) and a
>    bulk twin. The accepted date is `accepted_date_ciphertext` (`claim_death_certificate_reviews.ts:88-89`). ⇒ a "date differs" key cannot be
>    derived by comparing plaintexts there. ⇒ **GI6: a keyed BLIND INDEX of the date** (`encryption/blind-index.ts` — the house HMAC primitive,
>    already used for the claim-contact mobile, `correction-crypto.ts:59`) on BOTH the accepted review and the inspection; the SQL compares
>    indexes. Always current (it compares against the claim's CURRENT accepted review), ⛔ no recompute writer, ⛔ no decrypt.
> 5. ⚠ **Every approval test in the repo turns red the moment the conjunct lands** — ⛔ no fixture seeds a completed inspection. The house
>    pattern (6.18 → 6.20 → 6.21a → 6.19a each added a conjunct) is ONE option on the shared fixture `seedNomineeNameCheck`, in BOTH copies
>    (`packages/domain/tests/integration/_helpers.ts:1099`, `apps/api/tests/integration/_nominee-name-check-fixture.ts:141`), default ON,
>    through the REAL writers. ⇒ GI15. ⚠ And ~ten specs that write a completed inspection WITHOUT the fixture turn red by design (raw
>    INSERTs and `/complete` with `{}`) — they are listed by name in Task 10 and AMENDED, ⛔ never treated as fixture gaps.

## Story

As the **District Admin** deciding a family's death claim — and every approver after me —
I want **the system to hold any approval until the claim's ground inspection is complete, with the inspector's photograph of the original
certificate, their record of whether it matches the copy we hold, and the date and time of death the family gave them — and to tell me
plainly why a claim is waiting** (my own government-register check is Story 6.26b's),
so that **a forged or altered certificate meets a person who has held the original before any member's money moves, while a refusal never
waits and a family whose visit cannot happen is kept waiting, ⛔ never refused for it.**

## The rulings this story builds — verbatim keys, and what is still OUR reading

| Ruling | Verbatim key | Status |
|---|---|---|
| `2026-09-28-263` FQ9 A | *"EVERY CLAIM'S GROUND INSPECTION MUST BE COMPLETE BEFORE THE CLAIM IS APPROVED … A refusal never waits for it. If the visit cannot happen … the claim waits and is ⛔ not refused for that reason."* | ⭐ Trustee-ratified |
| `-263` FQ11 A | *"AT THE INSPECTION THE INSPECTOR SEES THE ORIGINAL DEATH CERTIFICATE, PHOTOGRAPHS IT, AND RECORDS WHETHER IT MATCHES THE UPLOADED COPY."* | ⭐ Trustee-ratified |
| `-262` FQ8 B | *"the District Admin checks the certificate number on the government's online death register (CRS) and records that they did."* | ⭐ Trustee-ratified — **built in 6.26b** |
| `-262` FQ8 C | *"the inspector records the date and the time of death the family gives; the system shows the District Admin any difference from the certificate."* | ⭐ Trustee-ratified (widened by the Panel to date AND time) — the RECORD here; the *"shows … any difference"* in **6.26b** |
| `-264` FQ12 | approving while **any** warning shows — incl. *"a date of death that differs from the certificate (at the inspection, `-262` FQ8 C …)"* — needs a reason and a note | ⭐ Trustee-ratified — **built in 6.26b** |
| `-264` FQ13 | *"an inspector must also see the fresh original certificate — a short visit, or an office check, limited to the certificate (FQ11 A's see, photograph and match)."* | ⭐ Trustee-ratified |
| `-277` Q3 B | a warning that first appears after the District Admin approved waits for their reason and note | ⭐ Trustee-ratified — **built in 6.26b** |
| `2026-10-06-281` Q1 B | a "does not match" — the inspector's look at the original, or the government register — is a **warning** under the one rule; a late one waits for the District Admin; ⛔ never a refusal | ⭐ Trustee-ratified — **built in 6.26b** |
| `-281` Q2 A | a certificate replaced after the inspector's visit is seen, photographed and matched by an inspector before approval (the FQ13 check); the claim waits | ⭐ Trustee-ratified — **built HERE (GI2)** |
| `-263` reading | "Complete" = an inspection whose status is `completed` on this claim; an inherited one counts; FQ9 is a new condition in `assertClaimApprovable`; "waits" is `-226` cl.7's shape; FQ11's photo is a claim document kept as `-243` keeps certificates; until built, a **go-live** condition (⛔ not a merge fence). ⭐ `-263`'s "does NOT cover" list reads *"The **State Trustee** step — ⛔ untouched (FQ9 gates the District Admin's approval, which precedes it)."* — which assumed that approval always precedes the final vote; on Fact 1's paths it does ⛔ not, so the final vote and R9 meet the conjunct — FQ9's *"BEFORE THE CLAIM IS APPROVED"* governs; the vote waits, ⛔ never asked to inspect (`-283`'s reading, kept by `-284` E5 with a NON-blocking confirm to the Panel's next note — ⛔ nothing here waits on it) | ⚠ OUR reading — ⛔ not ratified (GI1–GI3, GI13 build on it) |
| `-262` reading | FQ8 C compares by **date**; the time is recorded and shown, compared with nothing. FQ8 B's record: *checked — matches / checked — does not match / could not be checked online* | ⚠ OUR reading (GI5, GI8) |
| `-264` reading | FQ13 is part of FQ9's gate on the refiled claim; it records the date on the fresh original against the accepted date | ⚠ OUR reading (GI2, GI5) |
| `2026-10-06-283` | A1–A8: the R9-routed window, the inherited visit must be a visit, a replaced original's printed date ⛔ no longer warns, five FOUND slips | ⚠ Author-commit (BigDev) — amends `-282` |
| `2026-10-06-284` | E1 the queue lists an R9-routed late warning (6.26b) · E2 the constant's home · E3/E4 slips · E5 the `-263` reading kept, a NON-blocking Panel confirm | ⚠ Author-commit (BigDev) — amends `-283` |
| `2026-10-06-285` | *"every claim's ground inspection must be complete before the claim is approved"* holds the FINAL approval too — the State Trustee's vote and the R9 panel's — where the District Admin never approved; `-263`'s *"State Trustee step — untouched"* superseded for those paths | ⭐ Trustee-ratified (DR + KB: *"A"*) — `-284` E5's reading, now RATIFIED |

**What the rulings do ⛔ NOT cover (each stays open — ⛔ not this story's to decide):** who may complete an inspection when the family refuses a
visit, and how long a claim may wait (⛔ no deadline was ruled — `-263`); who performs the office check and where (`-264` — operational);
which states' registers can be searched (`-262`); what any approver must weigh under a warning (`-262`); whether the **family** is told the
claim is waiting for an inspection (⛔ nothing was ruled ⇒ ⛔ no family message here). ⚠ One reading is ours and goes to the Panel as a
NON-blocking confirm (`-284` E5): that FQ9 also holds the final vote and R9 when the District Admin's approval did ⛔ not come first —
put in `trustee-panel-routing-note-2026-10-06-6-26-fq9-final-vote-confirm.md` — ✅ **RULED A by `2026-10-06-285`** (Trustee-ratified):
the final vote and R9 wait too; ⛔ no design change.

## ⭐ THE INVARIANTS

1. **The system refuses nothing.** Every new condition makes an approval WAIT (a typed 409); ⛔ nothing denies, closes or marks a claim. A
   refusal, an escalation, a route to R9 and a return for correction are ⛔ never gated (`-263` FQ9, `-264`'s reading).
2. **ONE gate, ONE conjunct, ONE definition of "complete".** The predicate is a pure function over ONE read; the gate, the console and every
   test call that same function. ⛔ No second copy of "is the inspection complete" anywhere.
3. **"Waits" always has a way out.** For every state in which the conjunct can refuse, an inspection (or certificate check) can be written
   (GI3 + `-283` A1): the five window states, and `state_trustee_approved` while R9-routed — the gate's six call sites run in exactly
   these states. ⛔ No other state needs it: `state_trustee_approved` outside R9 is reached only through a gated vote (already complete), and
   ⛔ no upload can become current there (`mayDeathCertificateUploadBecomeCurrent`). A test proves Fact 1's three paths end in an approval.
4. **6.26a stores the date only as ciphertext + a keyed index** (GI5), so 6.26b's warning module can compare dates without a decrypt
   (6.23a invariant 7; the comparison itself is 6.26b's GI6).
5. **6.26a adds ⛔ no warning kind** — `APPROVAL_WARNING_KINDS` does ⛔ not move here; 6.26b adds three, through the ONE rule
   (`-264` Consequence 2; 6.23a NW1).
6. **Staff-only.** ⛔ No member-facing string, ⛔ no SMS / DLT template, ⛔ no new permission key, ⛔ no new claim event (GI16).

## 📜 Policy meaning (AI-10-1)

⭐ This story **introduces predicates that gate a member's family's access to the benefit**, and ADDS kinds to an existing one. Each in the
member's terms, and what it was checked against:

- **P1 (GI1/GI2):** *"A family's death claim is never approved until someone from the Trust has visited — and, at that visit or at a later
  short check, has held and photographed the original death certificate for the certificate the claim now relies on. Refusing a claim never
  waits for this; a family whose visit cannot happen is kept waiting, never refused for it."* — ⭐ checked against `-263` FQ9 A / FQ11 A and
  `-264` FQ13 (ratified): **consistent**, and the *"for the certificate the claim now relies on"* half is **`-281` Q2 A — ratified
  2026-10-06**. Checked against the Niyamavali §6.2 (*"The Trust verifies the qualifying event, the claimant's entitlement, and document authenticity
  (including an OCR parity check on the death certificate)."*, `docs/legal/niyamavali.md:146` / `.hi.md` — local only, gitignored by design
  (`.gitignore:76`), [[project_legal_corpus_private_repo_split]]): **consistent** —
  ⛔ no clause on a ground inspection either way. ⭐ *"has visited"* holds by `-283` A2: an inherited visit must itself be a full visit. ⚠ The Niyamavali is a rulebook, ⛔ not ratified and ⛔ not binding
  ([[feedback_niyamavali_rulebook_not_spec]]).
- **P2 (GI8 — built in 6.26b):** *"A District Admin cannot accept a death certificate without recording whether they checked it on the government's death
  register — and 'could not be checked online' is always an allowed answer, so this never stops a family's claim on its own."* — checked
  against `-262` FQ8 B: **consistent** (it mechanizes the ruled duty *"records that they did"*). Niyamavali: ⛔ no clause.
- **P3 (GI6/GI7 + `-283` A3 — built in 6.26b):** *"If the date of death the family gave the inspector — or the date printed on the original
  certificate the inspector held, while that original is still the certificate the claim relies on — differs from the certificate the Trust
  accepted, anyone approving the claim must pick a reason and write a note; and if it appears after the District Admin approved, the claim
  waits for the District Admin's reason."* — checked against `-264` FQ12 (named verbatim), `-264`'s reading and `-277` Q3 B: **consistent**.
  Niyamavali: ⛔ no clause.
- **P4 (GI17/GI18 — built in 6.26b):** *"If the inspector finds the original does not match the copy the claim relies on, or the government
  register does not match the certificate the Trust accepted, anyone approving the claim must pick a reason and write a note; it never
  refuses the claim."* — checked against `-281` Q1 B
  (ratified): **consistent**. Niyamavali: ⛔ no clause.
- ⭐ **6.26a's own predicate is P1 alone.** It RECORDS the facts P3/P4 act on, but ⛔ nothing in 6.26a turns them into a condition.

## The two Panel questions — ✅ RULED `2026-10-06-281` (Q1 B · Q2 A), as put below (kept as written)

⭐ **§0 applied to every open item.** The rest are the author's (GI1–GI18: *"the code should do X"*). ⛔ Not routed: who completes a refused
visit / how long a claim waits / where an office check happens / which registers (each `-262`/`-263`/`-264` "does NOT cover", operational,
blocking ⛔ nothing here); the inspection-date warning entering 6.23b's wait (`-279` A6's obligation — `-277` Q3 B already rules it
generically and ⛔ no clause says otherwise for the inspection, unlike FQ10's *"the neighbours can ⛔ never block a claim on their own"* ⇒
GI7, an author-commit).

- **Q1 — when the inspector says the original does ⛔ not match the copy, or the District Admin says the government register does ⛔ not
  match, what happens?** Passes §0: it is what the Trust must check before paying a family. ⭐ **The one fact that decides it:** both rulings
  say only *"record"*; with ⛔ no consequence, a District Admin could record "does not match" and approve the next minute with ⛔ no reason,
  while a 1-day date difference (FQ8 C) demands one. Options for the note: **A** — shown only (the approver decides, ⛔ no reason needed);
  **B** — a **warning** under the one rule (a reason and a note to approve; a late one waits, `-277` Q3 B) *(our suggestion — the same
  treatment the Panel gave every other sign of a false date; cost: one more reason to give on a genuine clerical mismatch)*; **C** — approval
  waits until the certificate is re-reviewed or replaced *(cost: a new way for a family to wait, with ⛔ no exit if the register is simply
  wrong)*. ⇒ **AC8 was written for B** (✅ ruled B; AC8 now lives in 6.26b).
- **Q2 — when the family replaces the certificate AFTER the inspection (the District Admin turned the first back for an unclear date), must an
  inspector also see the new original?** Passes §0 (the FQ13 question, for a replacement inside one claim — ⛔ not ruled). ⭐ **The one fact
  that decides it:** a replacement after a rejection is exactly how a forged clear date can enter after an honest inspection saw a smudged
  real one. Options: **A** — yes, the same short certificate check as FQ13 *(our suggestion; cost: an extra check even for a plain rescan of
  the same paper)*; **B** — no, the inspection stands *(cost: the replacement is never seen by anyone)*. ⇒ **GI2 is written for A** and names
  exactly what B changes (one conjunct of the predicate). (✅ ruled A — that branch is MOOT.)

⭐ **Order (the template's §0–§E):** the note is written from `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` —
plain-English question, THE ONE FACT, options with an honest cost on every option, evidence LAST — into
`trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md` (✅ written 2026-10-06). ⛔ Never a second note shape.

## ⚖️ Decisions — the AUTHOR's (✅ COMMITTED by `2026-10-06-282` — `97403945`, 2026-10-06, on the story branch — BEFORE any code)

⭐ **Owner tags:** **[a]** = built in 6.26a (this file) · **[b]** = built in 6.26b · **[a+b]** = split as stated. 6.26b's file cites these
by number and ⛔ never restates a different version of one.

⭐ **`-283` amends five of these** (GI2, GI3, GI5, GI6, GI16) and **`-284` amends GI5 again (E2) and GI7 (E1)** — each by a
`⚠ AMENDED by -283` / `-284` line directly under the GI. ⭐ **`-286` / `-287` amend GI4** (the second and narrow code reviews,
2026-10-07 — after the build). The GI text
itself stays `-282`'s, verbatim. ⚠ GI4's *"(⛔ ⇒ 409 …)"* breaks the glyph register, but it is verbatim `-282` text and is left as written.

- **[a] GI1 — THE CONJUNCT, ONCE.** New `assertGroundInspectionCompleteForApproval(db, pariwarId, claimCaseId)` called by the OUTER
  `assertClaimApprovable` AFTER `assertNomineeNameCheckForApproval` and BEFORE `assertLateWarningsCovered` (6.23b EA2 stays LAST). It reaches
  all six call sites and the `-251` waived approve without editing them. ⛔ Never inside `assertNomineeNameCheckForApproval` (its fourth,
  non-approval caller `isReturnedClaimResubmitted` swallows exactly three typed errors — the 6.21a T4 reasoning). New typed error
  `GroundInspectionRequiredError(claimCaseId, reason)` in `claim/errors.ts`; every approval handler maps it to 409
  `<prefix>.ground_inspection_required` with `details.reason` — ⛔ never a 500. ⚠ At P1 the contact check (6.19a D14) still runs AFTER the
  gate: a claim missing both now answers the inspection 409 first — every existing refusal keeps its code whenever its own fixture is
  otherwise complete (GI15 seeds the inspection by default).
- **[a] GI2 — "COMPLETE", in ONE pure predicate** (`groundInspectionApprovalState`, new module `claim/ground-inspection-approval.ts`):
  `complete ⇔ VISITED ∧ ORIGINAL_SEEN`, where
  · **VISITED** ⇔ ≥1 OWN assignment with `status = 'completed'` AND `inspection_stage <> 'certificate_check'`, **or** the claim INHERITS
    (`getInheritedGroundInspectionSource ≠ null` — 6.20 AC13, ⛔ not changed);
  · **ORIGINAL_SEEN** ⇔ ≥1 OWN assignment (any stage) with `status = 'completed'` AND `compared_certificate_upload_id` = the claim's CURRENT
    certificate upload (`readDeathCertificateSnapshot(...).currentUploadId`).
  Wait reasons (in this order): `no_completed_inspection` (⛔ not VISITED) · `certificate_check_required` (VISITED, ⛔ not ORIGINAL_SEEN — the refile,
  FQ13; or a replaced certificate, Q2 A). ⭐ A refused / unavailable / superseded / still-scheduled assignment counts for ⛔ nothing — the claim
  waits (FQ9). ⚠ **If the Panel answers Q2 B:** ORIGINAL_SEEN becomes *"≥1 own completed assignment carries an FQ11 record"* (any upload),
  except on an inheriting claim, where it stays *"against the current upload"* (FQ13 is ruled) — one conjunct changes, nothing else.
  ⚠ A completed assignment from before this story has ⛔ no `compared_certificate_upload_id` ⇒ it can be VISITED but never ORIGINAL_SEEN ⇒
  such a claim needs a certificate check. ⛔ Never backfilled ([[feedback_record_unattested_no_backfill]]) — the system is ⛔ not in production.
  ⚠ **AMENDED by `-283` A2 / A7:** (A2) the inheritance counts only a source with a completed FULL assignment —
  `getInheritedGroundInspectionSource`'s EXISTS gains `AND gi.inspection_stage <> 'certificate_check'` (GI16's *"⛔ no change"* superseded for
  that one conjunct), and that predicate is ONE shared SQL fragment used by it AND by the gate's read; (A7) **null never matches** —
  ORIGINAL_SEEN needs a non-null `compared_certificate_upload_id` equal to a non-null `currentUploadId`. ⭐ The *"If the Panel answers Q2 B"*
  sentence above is MOOT (`-281` ruled Q2 A; recorded in `-282`).
- **[a] GI3 — THE WINDOW (Fact 1).** All six inspection writers (`schedule`, `reschedule`, `recordFindings`, `addPhoto`, `complete`,
  `recordRefusal`) accept a claim whose state is in `CLAIM_REVIEW_WINDOW_STATES` (⛔ never a copied tuple — import it). Both events stay IDENTITY
  annotations but carry the claim's ACTUAL state (`from_state === to_state === claimRow.currentState` — `requireIdentityTransition` already
  admits any state; the hard-coded `'verification_in_progress'` literals in the four `projectClaimState` payloads go). The error class and
  its wire code (`ground_inspection.claim_not_in_verification`, `claims.ground-inspection.handlers.ts:62`) are KEPT (the code literal is a
  contract); only its message and doc-comment say "outside the review window". `denied`, the appeal stages, `state_trustee_approved`,
  `approved`, `settled` stay refused. ⚠ `state.ts`'s identity comments (`:135-153`) and `events.ts`'s two payload doc-blocks (`:162-215`) are
  updated, ⛔ not deleted (a one-line "Story 6.26 GI3:" amendment each).
  ⚠ **AMENDED by `-283` A1 / A4 / A5:** (A1) the writers ALSO admit `state_trustee_approved` **while the claim carries a live `routed_to_r9`
  routing row** (the R9 queue predicate — `hasLiveRoutedRow`'s condition, which exists TODAY as THREE private copies:
  `r9-voting-persist.ts:275-291`, `state-trustee-decision-persist.ts:337`, `correction-closure.ts:189` — moved into ONE new leaf module, ⛔ never
  a fourth copy; Task 2.1) — ONE exported window predicate used by every writer AND the API pre-check; (A4) the API `schedule` handler's own
  pre-check (`claims.ground-inspection.handlers.ts:216-222`) calls that same predicate; (A5) the KEPT wire code is
  **`ground_inspection.not_allowed`** (`details.state`; mapped at `:61-66`, pre-check `:219`) — *"`…claim_not_in_verification`"* exists
  nowhere; and THREE writers emit an event (`ground-inspection-persist.ts` — `schedule` `:437`, `reschedule` `:571`, `complete` `:756`), ⛔ not
  four. Also amended: the completed event's registry description (`packages/events/src/registry.ts:227`, *"write-guarded to
  verification_in_progress (Story 6.7)"*) — check first that ⛔ no test pins registry descriptions verbatim.
- **[a] GI4 — THE FQ11 RECORD, on the assignment, required to complete.** Every completion (any stage) needs: (i) ≥1 photo of kind
  `original_certificate` (photos gain `photo_kind` — `site` (default) | `original_certificate`; the existing ≥1-photo rule and the cap of 20
  are unchanged); (ii) `original_certificate_verdict` ∈ `matches` | `does_not_match`; (iii) `compared_certificate_upload_id` — the upload the
  inspector was SHOWN, which the writer re-asserts is still the claim's CURRENT upload under the claim-row lock (⛔ ⇒ 409
  `ground_inspection.certificate_changed`). New typed refusals → 409 `ground_inspection.original_certificate_required` (`details.missing`:
  `photo` | `verdict` | `compared_certificate`). The inspector is SHOWN the copy through a new read (GET
  `…/ground-inspection/:ground_inspection_id/certificate` — the current upload's token, content type and a 300 s signed URL; gated exactly as
  the other id-addressed verbs, PLUS the D6 inspector guard: the assigned inspector or a `claim.override_ground_inspection` holder; audited
  `admin_ground_inspection.certificate_viewed`, ids only). ⭐ This lets a `block_admin` inspector see a claim's uploaded certificate image —
  necessary for the ruled comparison, and confined to an assignment they hold. **When the original is ⛔ not produced** the inspector records the
  existing refusal disposition with a NEW reason `original_certificate_not_produced` (paired with `evidence_unavailable`; its encrypted note
  stays mandatory); a family that refuses to let it be photographed is the existing `family_refused_photography`. Either way the claim WAITS.
  ⚠ **AMENDED by `2026-10-07-286` (H1, H2) and `-287` (J1, superseding H1's stamp source):** (i) counts only `original_certificate`
  photos STAMPED with the compared upload — a photo of the original is uploaded WITH the token of the certificate the inspector
  compared, the writer refuses it unless that token is still the claim's CURRENT upload (409 `certificate_changed` /
  `no_current_certificate`; ⛔ no token ⇒ 409 `original_certificate_required` `{ missing: 'compared_certificate' }`; a duplicate or
  malformed `comparedCertificateToken` multipart part ⇒ 400 `ground_inspection.invalid_compared_certificate`) and stamps the
  photo with it (migration `0148`, `claim_ground_inspection_photos.certificate_upload_id`); a `site` photo carries ⛔ no stamp. The
  cap of 20 keeps ONE reserved slot per compared certificate for the original's photo (the bound is 20 + one per distinct
  certificate compared during the assignment). The certificate read is confined to a `scheduled` assignment on a claim in the
  inspection window (GI4's *"an assignment they hold"*).
- **[a] GI5 — THE DATES (FQ8 C; `-264`'s reading).** At completion of a FULL assignment (stage ≠ `certificate_check`): the date of death the
  family gives (**required**, `YYYY-MM-DD`, a real calendar date, ⛔ never after the day of completion — the 6.21a D4 rule) and the time
  (**optional** — `HH:MM` 24h, or ⛔ none = "not known"). At completion of a `certificate_check`: the date printed on the original
  (**required**; ⛔ no time). Stored Tier-1 (`piiColumn(1, 'ground_inspection')`: `death_date_ciphertext`, `death_time_ciphertext`) with
  `death_date_source` ∈ `family_statement` | `original_certificate` (plaintext, by stage) and `death_date_index` (GI6). The time is compared
  with nothing; it is shown. ⭐ **6.26a computes and stores the index NOW** (in the completion handler), so 6.26b needs ⛔ no backfill: ONE
  exported field-class constant (`DEATH_DATE_INDEX_FIELD_CLASS = 'death_date'`, beside the API's other field-class constants) that 6.26b's
  review writer MUST reuse — ⛔ never a second literal (Trap 2).
  ⚠ **AMENDED by `-283` A6 + `-284` E2:** `DEATH_DATE_INDEX_FIELD_CLASS` is defined in `packages/domain/src/encryption/field-classes.ts`
  (*"the single authority; do not re-declare these values anywhere"* — where `CLAIM_CONTACT_MOBILE_FIELD_CLASS` is defined, `:81`) and
  added to the barrel's named export list (`packages/domain/src/encryption/index.ts:49-60`); `apps/api` imports it from `@twt/domain`
  (re-export it from `context.ts` only if the call site wants that name there) — domain code and fixtures cannot import `apps/api`. The completion writer also takes the plaintext date (validation ONLY, ⛔ never stored) and an
  injectable `now` (6.21a D4's shape) — "the day of completion" is India time (`istDateOf`).
- **[b] GI6 — THE KIND `inspection_death_date_differs` (FQ8 C; `-264` FQ12).** Key `inspection_death_date_differs:<ground_inspection_id>`. Derived
  in the SAME pure derivation both readers share (`readClaimApprovalWarnings` and `readClaimApprovalWarningsBulk`, ONE statement each): an OWN
  `completed` assignment whose `death_date_index` IS DISTINCT FROM the claim's CURRENT accepted review's `accepted_date_index`, both non-null.
  ⛔ No accepted certificate ⇒ ⛔ no key (the `post_death_version` posture). The index: `blindIndex('death_date', 'YYYY-MM-DD', { pariwarId },
  …)` — computed by the API HANDLER (it holds the plaintext; the domain writers take the index as input, the 6.21a "handler decrypts /
  encrypts" pattern), with ONE shared field-class constant for both tables (a different class would make every comparison "differs"). The
  review writer stores `accepted_date_index` on every ACCEPT (GI8's migration). ⚠ An inherited inspection produces ⛔ no key — its family
  statement was given on another claim; it is shown, labelled (GI10). ⚠ `-279` A6's pin test on `APPROVAL_WARNING_KINDS` is updated WITH a
  message citing this decision.
  ⚠ **AMENDED by `-283` A3 [b]:** a row with `death_date_source = 'original_certificate'` produces the key only when its
  `compared_certificate_upload_id` is the claim's CURRENT upload (GI17's currency); a `family_statement` row is ⛔ not filtered.
- **[b] GI7 — THE WAIT (`-279` A6's obligation, discharged).** `inspection_death_date_differs` ENTERS 6.23b's wait: `-277` Q3 B is generic
  (*"a warning that first appears after the District Admin approved waits"*) and ⛔ no ruling carves the inspection out (FQ10's carve-out is
  the neighbours'). A late key is reachable only under GI3 (an assignment completed after the District Admin's approval, or a re-review that
  moves the date). The District Admin answers it through 6.23a's NW14 late reason — ⛔ no new mechanism. ⚠⚠ **But 6.23b's correction
  queue must still FIND it (EA10, `-279` A4).** `listClaimsUnderCorrection`'s cheap candidate test assumes *"TODAY a late key can arise ONLY"*
  through a live determination decided after the live approval (`correction-queue-read.ts:162-173` — the `lateWarningCandidate` select —
  and `:196-209` — the SQL superset arm). An assignment COMPLETED after the approval is a second source ⇒ BOTH copies gain the disjunct
  *"or an own assignment of this claim with `status = 'completed'` AND `completed_at > v.decided_at`"*, and the *"ONLY that way"* comment is
  amended (⛔ not deleted). Without it the claim waits for the District Admin and ⛔ nobody tells them — the exact failure EA10 exists for.
  (A re-review that moves the date needs a new determination before the gate passes anyway, so the existing arm fires.)
  ⚠ **AMENDED by `-284` E1 [b]:** the queue's scan ALSO admits `state_trustee_approved` for the LATE-WARNING arm only, while the claim
  carries a live `routed_to_r9` routing row (`-283` A1 lets an inspection complete there) — through the leaf's SQL fragment (Task 2.1);
  every other arm keeps `CORRECTABLE_SCAN_STATES`. `-280`'s *"⛔ no late key arises there"* stops holding once 6.26b ships.
- **[b] GI8 — THE REGISTER CHECK (FQ8 B), on the ACCEPT.** The 6.21a review request gains `register_check` ∈ `matches` | `does_not_match` |
  `could_not_check` — **required** with `verdict: 'accepted'`, refused with `rejected` (409 `death_certificate_review.register_check_required`
  / `…register_check_not_allowed`, the writer's own guard; the contract stays loose, as today). Stored plaintext on the review row (non-PII), with
  `accepted_date_index` (GI6). ⇒ an approval needs it through the EXISTING certificate conjunct (the current accepted review always carries
  it) — ⛔ no new conjunct. The certificate number is ⛔ not stored (*"records that they did"*). Shown on the console's document section and
  in the review history.
- **[a] GI9 — "WHY IT WAITS" (`-263` Consequence 1).** The verifier console packet gains a NON-PII section `groundInspectionGate`
  `{ available, complete, waitReason: 'no_completed_inspection' | 'certificate_check_required' | null }` from the SAME read + predicate as the
  gate (ONE counted read: `VERIFIER_CONSOLE_MAX_READS` 19 → 20, with an exact test). Approve is disabled with its own words while
  `complete` is false; `available: false` ⇒ Approve disabled with *"could not be checked"* words, ⛔ never "complete" (6.18's fail-closed
  rule). Deny stays enabled.
- **[a+b] GI10 — WHAT THE CONSOLE SHOWS.** Per assignment: the certificate verdict, whether it was compared against the CURRENT certificate or an
  earlier one, the original-certificate photos (labelled apart from site photos), the family's date and time of death (decrypted by the
  console handler, as it already decrypts the notes — `safeDecrypt`) **[a]**; *"differs from the certificate"* where GI6's key exists, the
  mismatch warnings, and the register check on the document section **[b]**. ⭐ The inheritance read changes **[a]**: the inherited inspection is read when the claim has ⛔ no OWN
  completed FULL assignment (⛔ not "no assignment at all" — Fact 3), and shown beside the own certificate check, labelled.
- **[a+b] GI11 — EVERY LATER SURFACE.** The 409 `…ground_inspection_required` gets its own words at the four handler mappers
  (`claims.verification-decision.handlers.ts`, `claims.cycle-freeze.handlers.ts`, `claims.r9-voting.handlers.ts`,
  `claims.correction-closure.handlers.ts` — beside each `DeathCertificateAcceptanceRequiredError` arm) and at the admin surfaces that word the
  certificate 409 today (`VerifierConsoleRoute.tsx`, `CycleFreezePage.tsx`, `R9CasePanel.tsx`, the 6.19c closure surfaces) **[a]**. The new warning
  kinds get their words wherever 6.23a/6.23b render a kind **[b]** (every surface `ApprovalWarningKind` reaches). ⛔ No bulk inspection read on the
  later lists — P1 is gated, so a later approver meets this 409 only on the Fact-1 paths.
- **[a] GI12 — THE CERTIFICATE CHECK (FQ13; Q2).** A new `ground_inspection_stage` value `certificate_check` — an ordinary assignment (same
  routes, same gate dimension, same inspector guard), whose completion needs only GI4 + the printed date (GI5). ⛔ Never VISITED. Site type:
  any existing value (an office check is `school_or_office` or `other` + a location) — *"who and where"* is operational (`-264`).
- **[a+b] GI13 — RETENTION AND ERASURE.** The original-certificate photo is an inspection photo — kept as `-243` keeps every certificate (`-263`'s
  reading). On a member's erasure the anonymizer (`member/anonymize.ts`) scrubs the inspection's `death_date_ciphertext` /
  `death_time_ciphertext` to the sentinel and sets `death_date_index` NULL **[a]**, and sets the review's `accepted_date_index` NULL beside its
  existing `accepted_date_ciphertext` scrub (`anonymize.ts:239-244`) **[b]** — a blind index of a date of death is a correlatable token and must ⛔ not
  outlive the erasure. ⚠ `claim_ground_inspections` has ⛔ no `deceased_member_id`: read the deceased's claim ids first, then
  `UPDATE … WHERE claim_case_id = ANY(...)` — ⛔ never a Drizzle correlated subquery ([[project_epic6_drizzle_correlated_subquery_bug]]).
  ⚠ FOUND, ⛔ not fixed: 6.7's own Tier-1 inspection columns (`location`, `family_contact`, `notes`, photo `caption`) are ⛔ not in the
  anonymizer — whose data they are (the family's, ⛔ not the member's) is a question ⇒ a `deferred-work.md` item, ⛔ not a silent widening.
- **[a] GI14 — AUDIT.** Codes, ids and counts only — ⛔ never a date, a time, a verdict note or a name (6.23a NW12). New audit actions:
  `admin_ground_inspection.certificate_viewed`; the completion audit gains `photo_kind` counts, `original_certificate_verdict` and
  `death_date_source` (all non-PII).
- **[a+b] GI15 — FIXTURES (Fact 5).** `seedNomineeNameCheck` (BOTH copies) gains `inspection?: 'completed' | 'skip'` — default `'completed'`:
  an own FULL assignment scheduled, one `original_certificate` photo row, completed through the REAL writers against the current upload,
  with a family date EQUAL to the accepted date (⛔ no warning by default) **[a]**. The certificate fixtures (`seedAcceptedDeathCertificate`,
  `ensureAcceptedDeathCertificate`) pass `register_check: 'matches'` and the index **[b]**. ⚠ The default must run in a state the widened window
  admits (the specs seed after driving to `verifier_approved` — `r9-voting.spec.ts:133-138`) — which GI3 makes legal.
- **[a+b] GI16 — NOTHING ELSE MOVES.** ⛔ No new permission key (catalog stays **51** — re-read the live value; the certificate read rides
  `claim.conduct_ground_inspection`); ⛔ no new claim event and ⛔ no payload field; ⛔ no member-facing string or message; ⛔ no change to
  `getInheritedGroundInspectionSource`, to the `-251` waiver, to `resolveEscalation`'s ungated approve, or to `commitCycleFreeze`.
  ⚠ **AMENDED by `-283` A2:** ⭐ ONE change to `getInheritedGroundInspectionSource` — the stage conjunct (see GI2's line). ⚠ The catalog
  figure: `PERMISSION_CATALOG_VERSION` is **51** and the key COUNT is **65** (`permissions.test.ts`) — ⛔ neither moves.
- **[b] GI17 — THE KIND `original_certificate_mismatch` (`-281` Q1 B).** Key `original_certificate_mismatch:<ground_inspection_id>`: an OWN
  `completed` assignment (any stage) whose `original_certificate_verdict = 'does_not_match'` AND whose `compared_certificate_upload_id` is
  the claim's CURRENT upload (a verdict on a replaced certificate ⛔ no longer warns — `-281`'s reading; it stays shown). Same derivation,
  same readers, ⛔ no decrypt (the verdict is plaintext). Enters 6.23b's wait (`-281` Q1 B rules it). A late key arises only from an
  assignment completed after the approval — GI7's queue disjunct already covers it.
- **[b] GI18 — THE KIND `register_check_mismatch` (`-281` Q1 B).** Key `register_check_mismatch:<review_id>` of the claim's CURRENT accepted
  review when its `register_check = 'does_not_match'` (a superseded review's ⛔ no longer warns). `could_not_check` is ⛔ never a warning
  (`-281` *"does not cover"*). Enters the wait. A late key needs a re-review after approval, which needs a new determination before the gate
  passes — the queue's existing determination arm fires.

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Given** this story, **when** Task 0 runs, **then** BEFORE any code: the author-commit decision entry for GI1–GI18 (BOTH halves) is in
`.decision-log.md` (the next free id after `-281`, verified by `grep -n '^### Decision .*-28[0-9]' .decision-log.md`), citing `-281` as the
ruling it builds; `epics.md` gains `### Story 6.26a` and `### Story 6.26b` with Minted-by headers; work is on
`story/6-26-ground-inspection-before-approval-and-death-facts` ([[feedback_commit_on_story_branch]]). ⛔ No code before the decision entry
([[feedback_governance_commits_precede_implementation]]). ✅ Already done: the Q1/Q2 note and its ruling (`-281`).

### AC1 — The gate (GI1)
**Given** a claim that is otherwise approvable, **when** ANY of the six gate calls runs while `groundInspectionApprovalState` is not
complete, **then** it refuses with `GroundInspectionRequiredError` → 409 `<prefix>.ground_inspection_required` `{ reason }` and writes
NOTHING (⛔ no decision row, ⛔ no event, ⛔ no warning-record row); **and** the `-251` waived Super Admin approve refuses the same way;
**and** a DENY, an escalation, a route to R9 and a return for correction on that same claim SUCCEED; **and** the refusal order is: certificate
→ accounts / determination / name check (or the `-251` waiver) → inspection → the late-warning wait.

### AC2 — "Complete" (GI2 + `-283` A2 / A7) — one predicate, a scenario table in a pure unit test
| Own assignments | Inherits? | Current upload | Expected |
|---|---|---|---|
| none | no | U1 | `no_completed_inspection` |
| full `scheduled` / `photo_refused` / `evidence_unavailable` / `superseded` only | no | U1 | `no_completed_inspection` |
| full `completed`, compared U1 | no | U1 | complete |
| full `completed`, compared U1 | no | U2 (replaced after) | `certificate_check_required` (Q2 A) |
| full `completed` U1 + `certificate_check` `completed` U2 | no | U2 | complete |
| `certificate_check` `completed` U1 only | no | U1 | `no_completed_inspection` |
| none | yes | U1 | `certificate_check_required` (FQ13) |
| `certificate_check` `completed` U1 | yes | U1 | complete |
| none | ⛔ no — the only refused source's completed assignment is a `certificate_check` (`-283` A2) | U1 | `no_completed_inspection` |
| full `completed` with ⛔ no FQ11 record (pre-6.26 row, `compared = null`) | no | U1 | `certificate_check_required` |
| full `completed` with `compared = null` | no | ⛔ none (`currentUploadId = null`) | `certificate_check_required` — **null never matches** (`-283` A7) |
**And** a live-DB test proves the gate and the console's `groundInspectionGate` agree on every row (one function, two callers) — ⚠ except
the two `compared = null` rows: the new CHECK refuses to INSERT a completed row without its FQ11 record, so they are unit-only (the
predicate is pure — the unit table is their proof). **And** a live-DB test of the inheritance read itself: a refused source whose only
completed assignment is a `certificate_check` is ⛔ not returned; an older refused claim with a full visit is.

### AC3 — Reachability (GI3 + `-283` A1 / A4 / A5; invariant 3)
**Given** a claim the District Admin DENIED with ⛔ no inspection, **when** the family appeals and the appeal reverses it, **then** an
inspection can be scheduled, photographed and completed in `reversed` — **through the API** (`POST …/ground-inspection` → 201, ⛔ not
`not_allowed`) as well as the domain — and the final vote then approves. **Given** an escalation resolved as approve with ⛔ no inspection,
**then** the same holds in `verifier_approved`. **Given** a refile R9-routed from `state_trustee_approved` whose inheritance then vanishes
(the source's `-239` denial revised to another reason), **then** R9 finalize refuses `no_completed_inspection`, an inspection can be
written in `state_trustee_approved` while the routing row is live, and R9 then approves; **and** the same claim with ⛔ no live routing row is
refused. **And** every inspection writer — and the API pre-check — refuses in `denied`, `appeal_stage_1`, `state_trustee_approved` (⛔ not
R9-routed), `approved` and `settled` with the KEPT code **`ground_inspection.not_allowed`** (`details.state`); **and** the three events carry
`from_state === to_state ===` the claim's actual state. ⚠ The 6.7 test *"review 2a … LEFT verification_in_progress"*
(`ground-inspection.spec.ts:399-427`) drives to `verifier_review` — now INSIDE the window: it is AMENDED to drive on to `denied` (via
`claim.verifier_denied`) — ⛔ never deleted — with a comment citing GI3.

### AC4 — The original certificate (GI4, GI12)
**Given** an assignment, **when** it is completed without an `original_certificate` photo, a verdict or a compared upload, **then** 409
`ground_inspection.original_certificate_required` with the missing item — ⚠ (`-286` H1 / `-287` J1) the photo must be STAMPED with
the compared upload: a photo of an EARLIER certificate's original is `missing: 'photo'`, and an original's photo uploaded with a token
that is ⛔ no longer current is refused at the upload (409 `certificate_changed`; a duplicate/malformed token part is 400
`ground_inspection.invalid_compared_certificate`); **when** the compared upload is ⛔ no longer the claim's current
upload, **then** 409 `ground_inspection.certificate_changed`; **when** the claim has ⛔ no current certificate upload at all, **then** both the
completion and the certificate read answer 409 `ground_inspection.no_current_certificate` (⛔ never a 500, ⛔ never a 404 that hides the
assignment); **and** the inspector's certificate read returns the CURRENT upload to the assigned inspector (or an override holder) and 403 to
anyone else holding the conduct key; **and** `original_certificate_not_produced` records as an `evidence_unavailable` refusal with its
mandatory note, and the claim then WAITS (AC2 row 2). **And** a `certificate_check` assignment completes on GI4 + the printed date alone.

### AC5 — The dates (GI5 + `-283` A6)
A FULL completion without the family's date → 409 `ground_inspection.death_date_required`; a date after the day of completion (India time,
`istDateOf` of the writer's injected `now`) → 409 `ground_inspection.death_date_in_future`; an unreal date (`2026-02-30`) → 400
(`isRealCalendarDate`); the time is optional and, if sent, matches `^([01]\d|2[0-3]):[0-5]\d$` (else 400). A `certificate_check` completion
requires the printed date and REFUSES a time. Both dates are stored only as ciphertext + index (a test reads the raw row: ⛔ no plaintext
date in any column); the index is computed under `DEATH_DATE_INDEX_FIELD_CLASS`, imported from `@twt/domain`.

### AC6 — The refile (FQ13)
**Given** a claim that inherits a `-239`-refused claim's completed FULL inspection, **when** it is approved with ⛔ no own certificate check,
**then** 409 `…ground_inspection_required` `{ reason: 'certificate_check_required' }`; **after** an own `certificate_check` against its current
upload completes, the gate passes; **and** the console shows the inherited inspection AND the own check, each labelled (GI10).

### AC7 — ➡ MOVED to 6.26b (the register check, GI8)
### AC8 — ➡ MOVED to 6.26b (the warnings, GI6 / GI7 / GI17 / GI18)
⭐ The numbers are kept (⛔ never renumbered) so every citation above stays true. ⚠ What 6.26a still OWES them: GI4's verdict and compared
upload, GI5's `death_date_index` under the ONE shared field-class constant — 6.26b reads exactly these columns.

### AC9 — Why it waits (GI9, GI10)
The console shows the `groundInspectionGate` line in words for each reason, disables Approve (⛔ not Deny), fails closed on `available: false`,
and reads `VERIFIER_CONSOLE_MAX_READS = 20` — a NEW exact pin (`toBe(20)`; today every console test uses `toBeLessThanOrEqual`). The section
is ONE statement (own assignments + the shared inheritance fragment + the current upload), placed BEFORE `approvalWarnings` (which stays LAST),
inside the house helper `underSavepoint` (`apps/api/src/modules/claims/later-approval-warnings.ts:161` — 6.23b RD12 / Trap 15; already used by
the cycle-freeze, R9, closure and escalation handlers) so its SQL failure renders `available: false` and ⛔ never aborts the scope
transaction. ⚠ `VerifierConsoleContext` (`claims.verifier-console.handlers.ts:173-189`) carries only the Drizzle `db` — it gains a REQUIRED `client`
(`request.scopeTx.client`, as `claims.correction-escalation.handlers.ts:173` reads it) for `underSavepoint`'s `{ query(text) }`; the ~ten
direct `assembleVerifierConsole(deps, { db: scopeTx.tx, … })` calls in `claims/verifier-console.spec.ts` / `-shape.spec.ts` (e.g. `:581`)
pass it — they are red by design (Task 10). A test forces that failure through a fault seam on the reader (the precedent:
`apps/api/tests/integration/claims/approval-warnings-every-approver.spec.ts:886`) and sees `approvalWarnings` still answer. GI10's **[a]**
per-assignment facts render (an inspector's *"does not match"* is SHOWN, plainly — 6.26b makes it a warning); a date/time decrypt failure
shows *"could not be read"*, ⛔ never a blank.

### AC10 — Every later surface (GI11)
Each of the four API mappers answers 409 `…ground_inspection_required` with its reason — an HTTP test per ROUTE, FIVE routes (the four
mapper files, plus the correction-escalation route that reaches `decideEscalatedClosure` through `translateClosureError`,
`claims.correction-escalation.handlers.ts:290`) — ⛔ never a 500; the console, cycle-freeze and R9 surfaces show their own words; the 6.19c
closure surfaces show the server's message (they word ⛔ no certificate 409 themselves — `correction-closure/errors.ts`), so the API message
is written for a reader. (The new kinds' words are 6.26b's.)

### AC11 — Erasure (GI13)
The anonymizer scrubs the inspection's two date/time ciphertexts to the sentinel and sets `death_date_index` NULL **only on rows whose
`death_date_ciphertext IS NOT NULL`** — a `WHERE` filter, ⛔ not merely a `CASE WHEN` (6.21a D11's form): Postgres re-checks the CHECK on
every row an UPDATE rewrites, even when no value changes, and a pre-6.26 completed row FAILS the new CHECK; `death_time_ciphertext` keeps
the `CASE WHEN … IS NULL THEN NULL` form (it is optional). The new CHECK admits the erased row (Task 1.2). A live-DB RTBF
test erases a deceased member whose claim carries a COMPLETED inspection and succeeds (⛔ no 23514); the unit pins in
`packages/domain/tests/member/rtbf-anonymize.test.ts` (`toHaveLength(21)` statements, `18` tables) move by exactly what this adds. The
6.7-columns gap is a `deferred-work.md` item.

### AC12 — Nothing else moves (GI16; invariant 6)
`PERMISSION_CATALOG_VERSION` stays **51** and the key count **65**; the claim event vocabulary is unchanged; ⛔ no file under `apps/mobile`,
`apps/public` or `packages/i18n` changes.

### AC13 — The proof
Every test listed under **Testing** passes; GI15's fixture default is ON in both `seedNomineeNameCheck` copies and every approve-path spec is
green on it; `pnpm ci:local` is green with `DATABASE_URL` at :5433 (34 / 34); migrations applied to BOTH :5432 and :5433
([[project_live_db_test_gotchas]]).

### AC14 — The audit (GI14)
The certificate read writes `admin_ground_inspection.certificate_viewed` (ids only); the completion audit carries the `photo_kind` counts,
`original_certificate_verdict` and `death_date_source`; a test reads both audit rows and finds ⛔ no date, ⛔ no time, ⛔ no note and ⛔ no
name. Written through `emitAuthAudit` (the access-wrapper gate refuses a bare `audit.writeAuditEntry`).

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0)** ⛔ no code before 0.3
  - [x] 0.1 `git fetch origin`; `git diff --name-only 3311fc97..HEAD -- packages apps scripts docs`; re-read anything cited here that moved. Read every `.decision-log.md` entry after `-281` for `6-26`, `inspection`, `certificate`, `warning`. ⚠ If row 6-24 or 6-27 landed first, rebase onto their conjunct / kinds — ⛔ none drops another's check (`-277` Consequence 2).
  - [x] 0.2 `git switch -c story/6-26-ground-inspection-before-approval-and-death-facts` — ✅ 2026-10-06 (from `main` `3311fc97`); the story, note, `-281` and the split committed as `9282d108`.
  - [x] 0.3 Write the author-commit decision entry (GI1–GI18, verbatim from this file, each with its [a]/[b] owner; Status, §0 gate, Consequences — incl. the split and 6.26a's go-live coupling to 6.26b — References) and commit it ALONE. — ✅ `2026-10-06-282`, committed alone as `97403945`; every cited anchor resolves. ⚠ GI2's *"If the Panel answers Q2 B"* sentence is recorded there as MOOT (`-281` ruled Q2 A).
  - [x] 0.4 The Q1/Q2 routing note — ✅ written 2026-10-06 (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md`), its E4 commands run.
  - [x] 0.5 The ruling — ✅ `2026-10-06-281` (Q1 B · Q2 A), the note's block filled. Both match what v1.x was written for ⇒ ⛔ no re-derivation; the row split (v2.0).
  - [x] 0.6 `epics.md`: `### Story 6.26a` and `### Story 6.26b` after `### Story 6.23b`, each with a Minted-by header (`-262` FQ8 B/C, `-263` FQ9/FQ11, `-264` FQ12/FQ13, `-281`, the author-commit) and a brief. — ✅ 2026-10-06 (citing `-282`; every anchor resolves).
  - [x] 0.7 The first fresh-context validate (v2.3) — ✅ 2026-10-06: `2026-10-06-283` (A1–A8) committed alone as `e8200366`; this file and 6.26b rewritten to it. ⚠ A fresh-context RE-validate of `-283` and of this rewrite runs before Task 1 ([[feedback_story_validate_footguns]] #32 — a pass that writes a decision re-validates the decision).
  - [x] 0.8 Round 2 (v2.4) — ✅ 2026-10-06: `2026-10-06-284` (E1–E5) committed alone as `72afe24d`; both files rewritten to it. ✅ Round 3 (v2.5) found ⛔ no BLOCKER / HIGH ⇒ the rounds STOP; Task 1 may start.
- [x] **Task 1 — Migrations (GI2–GI5, GI12)** — hand-authored, ⛔ never regenerated (the latest applied is `0145`)
  - [x] 1.1 `0146_ground-inspection-enum-values.sql` — its OWN file (a value added to an enum cannot be USED in the adding transaction — the 0120 posture): `ALTER TYPE "ground_inspection_stage" ADD VALUE IF NOT EXISTS 'certificate_check'`; `ALTER TYPE "ground_inspection_refusal_reason" ADD VALUE IF NOT EXISTS 'original_certificate_not_produced'`.
  - [x] 1.2 `0147_ground-inspection-death-facts.sql`: new enums `ground_inspection_photo_kind` (`site`, `original_certificate`), `ground_inspection_certificate_verdict` (`matches`, `does_not_match`), `ground_inspection_death_date_source` (`family_statement`, `original_certificate`); `claim_ground_inspection_photos.photo_kind NOT NULL DEFAULT 'site'`; `claim_ground_inspections` + `original_certificate_verdict`, `compared_certificate_upload_id uuid REFERENCES claim_death_certificate_uploads(upload_id) ON DELETE NO ACTION` (deliberately ⛔ not CASCADE — a deleted upload must ⛔ never silently delete an inspection; `-243` keeps every certificate and ⛔ nothing deletes an upload row except a claim's own cascade; a SINGLE-column FK — the table's PK is `upload_id` and it has ⛔ no `(pariwar_id, upload_id)` UNIQUE; the precedent is `0122` (reviews) and `0137` (reminder runs)), `death_date_ciphertext`, `death_time_ciphertext`, `death_date_source`, `death_date_index text`; the review-table columns are 6.26b's. CHECKs **`NOT VALID`**: a `completed` inspection carries `original_certificate_verdict` + `compared_certificate_upload_id` + `death_date_source` + `death_date_ciphertext` (⚠ ⛔ NOT `death_date_index` — GI13's erasure NULLs it, and Postgres re-checks a `NOT VALID` constraint on every UPDATE: requiring it would make every erasure of an inspected deceased fail 23514); its source matches its stage; a time only on `family_statement`. ⚠ A pre-6.26 completed row fails this CHECK on ANY update ⇒ GI13's scrub touches only rows whose `death_date_ciphertext IS NOT NULL` (AC11). The existing index is `(claim_case_id, status)` (`0055`) — add ⛔ none. Table grants (`0055`) already cover new columns.
  - [x] 1.3 Drizzle schema files; `meta/_journal.json`. ⛔ No new field-class entry: `'ground_inspection'` already exists (`CLAIM_GROUND_INSPECTION_FIELD_CLASS`, `apps/api/src/context.ts:188`) for the two Tier-1 columns. `DEATH_DATE_INDEX_FIELD_CLASS = 'death_date'` is defined in `packages/domain/src/encryption/field-classes.ts` (beside `CLAIM_CONTACT_MOBILE_FIELD_CLASS`, `:81`) and added to the barrel `encryption/index.ts:49-60`; `apps/api` imports it from `@twt/domain` (`-283` A6, `-284` E2). Apply to :5432 AND :5433.
- [x] **Task 2 — Domain: the writers (GI3–GI5, GI12)** (`claim/ground-inspection-persist.ts`)
  - [x] 2.1 `assertClaimInVerification` → ONE exported predicate: `CLAIM_REVIEW_WINDOW_STATES` (imported) **or** `state_trustee_approved` with a live `routed_to_r9` routing row (`-283` A1). ⚠ The R9 queue predicate exists as THREE private copies (`r9-voting-persist.ts:276`, `state-trustee-decision-persist.ts:337`, `correction-closure.ts:189`) plus inline twins (`cycle-freeze-read.ts:223`, `r9-voting-read.ts:91` — the R9 queue read — and `state-trustee-decision-persist.ts:1300`, `commitCycleFreeze`'s exclusion; `r9-voting-persist.ts:741` is finalize's supersede UPDATE, ⛔ not a read twin) — all five semantically identical (pariwar + claim + `phase='routing'` + `outcome='routed_to_r9'` + `superseded_at IS NULL`; ⛔ none takes a lock) ⇒ move ONE into a NEW leaf module importing only `sql`, the db type and the schema — ⛔ never `review-window.ts` (`death-certificate-approval.ts` relies on it staying import-free). ⭐ The leaf exports TWO things built on ONE condition: a raw-SQL fragment `liveRoutedToR9Exists(claimRef)` (an `EXISTS (…)` with explicit `"claims".` qualifiers — 6.26b's queue needs it inside its raw-SQL WHERE, where a per-claim call would be an N+1) and the per-claim `hasLiveRoutedRow` built on it. Fold the three private copies onto it (or record the remaining ones in `deferred-work.md`); ⛔ never a fourth copy. ⚠ Import graph: `r9-voting-persist.ts` reaches `nominee-name-check.ts` ⇒ ⛔ never import it (or the window predicate, if it imports r9) from `ground-inspection-approval.ts` — that closes `nominee-name-check → gate → r9 → nominee-name-check` and fails NW1's scan. The WINDOW predicate (it needs `CLAIM_REVIEW_WINDOW_STATES` ⇒ ⛔ not the leaf) is exported from `ground-inspection-persist.ts`; the API pre-check imports it from `@twt/domain`. ⭐ Every EVENT-EMITTING writer evaluates it on the LOCKED claim row: `complete` and `reschedule` take the claim `FOR UPDATE` right after `lockActiveAssignment` (assignment → claim); `schedule` (⛔ no assignment to lock) takes the claim `FOR UPDATE` first. Today all three check on an UNLOCKED read (`:409`, `:535`, `:732`) — a 6.7 race the widening enlarges (an R9 deny or an adjudication landing in between leaves an assignment and an event with a stale `from_state` on a claim outside the window). `recordFindings` / `addPhoto` / `recordRefusal` emit ⛔ no event and touch ⛔ no claim row — they keep the unlocked check. The THREE `projectClaimState` payloads (`:437`, `:571`, `:756`) use `claimRow.currentState`; doc-blocks amended (GI3), incl. `state.ts:135-154`, `events.ts:163-215` and `packages/events/src/registry.ts:227`. The error class and `ground_inspection.not_allowed` are KEPT.
  - [x] 2.2 `addGroundInspectionPhoto` takes `photoKind` (default `site`).
  - [x] 2.3 `completeGroundInspection` takes `{ originalCertificateVerdict, comparedCertificateUploadId, deathDate: { plaintext, ciphertext, index, source }, deathTimeCiphertext, now? }` — the plaintext is for validation ONLY (`isRealCalendarDate`, `nominee-determination-persist.ts:71`; "⛔ never after the day of completion" = `istDateOf(now)`, `cycle-calendar/holiday-resolver.ts:178`), ⛔ never stored — 6.21a D4's own shape (`recordDeathCertificateReview`'s `acceptedDate` + `now`). ⚠ **LOCK ORDER: assignment → claim — the order EVERY inspection writer already uses** (`lockActiveAssignment` FOR UPDATE, then `projectClaimState`'s upsert takes the claim row). Here the order is: `lockActiveAssignment` FOR UPDATE → the claim row `SELECT … FOR UPDATE` → the WINDOW predicate (incl. the live R9 routing row) evaluated ON THE LOCKED ROW (today `assertClaimInVerification` runs at `:732` from an UNLOCKED `getClaimCase` — move it under the lock) → `readDeathCertificateSnapshot` → the event's `from_state`/`to_state` from the locked row. ⚠ Without this, an R9 finalize (or a vote moving `state_trustee_freeze` → `state_trustee_approved`) that commits while `complete` waits on the claim lock lets the completion land outside the window with a stale `from_state` (`projectClaimState` never checks it). ⛔ Never claim → assignment in this writer alone: `rescheduleGroundInspection` holds the assignment and then waits for the claim inside `projectClaimState` ⇒ a 40P01 deadlock (a 500). ⭐ Why this order is safe: the OCR job makes an upload current only under the claim-row lock (`apps/jobs/src/claim-ocr-parity.ts:316-321`, re-checking `mayDeathCertificateUploadBecomeCurrent` at `:349-351`), and the approval writers read inspections under their claim lock without locking assignments ⇒ ⛔ no cycle. Refuse a non-current compared upload (`certificate_changed`) and ⛔ no current upload at all (`no_current_certificate`); count `original_certificate` photos under the lock; validate source ⇔ stage; `HH:MM` = `^([01]\d|2[0-3]):[0-5]\d$` (⛔ no helper exists — define it once).
    - ⚠ (2026-10-07, `-286` / `-287`) `addGroundInspectionPhoto` takes `comparedCertificateUploadId` for an original's photo, refuses it unless current, and stamps it; `completeGroundInspection` also counts the originals stamped with the compared upload (`missing: 'photo'` when none) and returns that count for the GI14 audit (`original_certificate_for_compared`).
  - [x] 2.4 `REFUSAL_REASONS_BY_DISPOSITION.evidence_unavailable` (`:180-189`) gains `original_certificate_not_produced`.
  - [x] 2.5 New typed errors (`GroundInspectionOriginalCertificateRequiredError`, `GroundInspectionCertificateChangedError`, `GroundInspectionNoCurrentCertificateError`, `GroundInspectionDeathDateRequiredError` / `…InFutureError`) beside the existing ones.
- [x] **Task 3 — Domain: the gate (GI1, GI2)**
  - [x] 3.1 `claim/ground-inspection-approval.ts`: `readGroundInspectionApprovalFacts` — ONE raw-SQL statement: own assignments' `status`, `inspection_stage`, `compared_certificate_upload_id`; the current upload id; whether the claim inherits, through the ONE shared inheritance fragment (`-283` A2: extracted from `getInheritedGroundInspectionSource`, which then uses it too, WITH the new `inspection_stage <> 'certificate_check'` conjunct) — ⛔ never a second copy of the inheritance predicate or of the current-upload rule. + the pure `groundInspectionApprovalState` (null never matches — A7) + `assertGroundInspectionCompleteForApproval`. ⚠ Import discipline: `nominee-name-check.ts` will import this module ⇒ it must ⛔ never reach `claim/events.ts`, `claim/nominee-name-check.ts` or `claim/nominee-lock.ts` — add it to 6.23a NW1's transitive scan (`packages/domain/tests/claim/approval-warnings.test.ts:342`, the `forbidden` list's `for (const entry of [...])` loop).
  - [x] 3.2 `assertClaimApprovable` calls it between the name-check helper and `assertLateWarningsCovered`; the `opts` comment's 6-26 note (`nominee-name-check.ts:403-405`) and the function doc-block (`:344-388`) updated — the note is deleted only once it is true, ⛔ never before.
  - [x] 3.3 `GroundInspectionRequiredError` in `errors.ts`; re-export through `claim/index.ts`.
- [ ] **Task 4 — ➡ MOVED to 6.26b** (the warnings, the queue).
- [ ] **Task 5 — ➡ MOVED to 6.26b** (the register check).
- [x] **Task 6 — Erasure (GI13 [a]; AC11)** — `member/anonymize.ts`: the inspection's date/time ciphertexts → sentinel ONLY where present, `death_date_index` → NULL, on the deceased's claims (read the claim ids first, as GI13 says); `packages/domain/tests/member/rtbf-anonymize.test.ts`: its `mockClient` records only `update(table)` ⇒ extend it to answer the claim-id read, and move the two pins (`toHaveLength(21)`, `18` tables) by exactly what this adds; the live RTBF spec (AC11); the `deferred-work.md` item for 6.7's columns.
- [x] **Task 7 — API**
  - [x] 7.1 `claims.ground-inspection.routes.ts` / `.handlers.ts`: the `schedule` handler's own state pre-check (`handlers.ts:216-222`) calls Task 2.1's predicate (`-283` A4); `CompleteBody` (camelCase, `.strict()`, routes `:88-93`) gains `originalCertificateVerdict`, `comparedCertificateToken` (= the current upload's id, the same uuid the console already calls `certificateToken` — compare lower-cased, [[project_branded_ids_lowercase]]), `deathDate`, `deathTime` (nullish); the handler encrypts both and computes the index under `DEATH_DATE_INDEX_FIELD_CLASS` (from `@twt/domain`); the photo upload takes a `photoKind` multipart field read AFTER the file stream is drained (the caption's pattern, `handlers.ts:446-450`); `RefusalReasonEnum` follows the domain tuple; the new GET `…/ground-inspection/:ground_inspection_id/certificate` (GI4 — `deps.claimDocumentStorage.signedReadUrl(key, 300)`, as the photo read does at `:688`; audited through `emitAuthAudit`, AC14); map every new typed error (409/400) beside the existing ones. ⚠ The routes file is on `claim-adjudication-human-actor`'s `ENROLMENT_OWED` list (`scripts/…/check.ts:266-268`) — a new route in it is fine; a NEW `claims.*.routes.ts` file would need classifying.
  - [ ] 7.2 ➡ MOVED to 6.26b (the register check on accept).
  - [x] 7.3 `claims.verifier-console.handlers.ts`: the `groundInspectionGate` section (AC9 — one statement, SAVEPOINT, before `approvalWarnings`; `MAX_READS` 19 → 20 with a ledger line in its doc comment); GI10's [a] per-assignment fields + the inheritance condition (Fact 3).
  - [x] 7.4 The four approval mappers (GI11) — `claims.verification-decision.handlers.ts:90-96`, `claims.cycle-freeze.handlers.ts:151`, `claims.r9-voting.handlers.ts:105`, `claims.correction-closure.handlers.ts:202` (which also serves `claims.correction-escalation.handlers.ts:290`).
  - [x] 7.5 `apps/admin/src/api/client.ts`: the certificate read and the photo-kind / completion fields.
- [x] **Task 8 — Contracts** (`packages/contracts/src/claims/verifier-console.ts` — `groundInspectionGate` and the per-assignment fields): new fields; ⚠ a new REQUIRED field breaks contracts / mobile fixtures outside `tsc` — run their vitest ([[project_contracts_tests_outside_tsc]]).
- [x] **Task 9 — Admin**
  - [x] 9.1 `GroundInspectionPage.tsx` (+ `i18n-en.ts`): its own copies of the stage list (`:18`, `STAGES`) and the refusal map (`:29-35`) gain `certificate_check` / `original_certificate_not_produced`; on an open assignment, *"Compare with the certificate we hold"* (the signed image) and the verdict radio; the photo-kind choice on upload; the completion form's family date (required) + time (optional, "not known") for a full visit, the printed date for a certificate check; every new 409 in words.
  - [ ] 9.2 ➡ MOVED to 6.26b (the register-check choice).
  - [x] 9.3 `VerifierConsoleRoute.tsx` / `SignalsPanel.tsx` / the decision strip: the why-it-waits line, Approve disabled, GI10's facts, the inherited + own labels.
  - [x] 9.4 GI11's [a] words on `CycleFreezePage.tsx` and `R9CasePanel.tsx` (the closure surfaces show the server's message — AC10). ⭐ `R9CasePanel.tsx` is touched ⇒ the `deferred-work.md` item *"A FAILED refetch after a 409 hides the whole approval surface"* fires (*"the next story touching either surface"*): render the refetch error as a banner while `data` exists, on `R9CasePanel.tsx` (the `EscalationPanel.tsx` half stays open — ⛔ not touched here), and append the outcome to the item.
  - [x] 9.5 `microcopy.yaml` vocabulary check on every new string (the `ci:local` microcopy gate scans all of `apps/admin/src/**`; ⚠ `report` is banned — ⛔ no "inspection report").
- [x] **Task 10 — Fixtures (GI15 [a]; AC13)** — both `seedNomineeNameCheck` copies (`packages/domain/tests/integration/_helpers.ts:1099`, `apps/api/tests/integration/_nominee-name-check-fixture.ts:141`): seed the inspection ONLY when `groundInspectionApprovalState` is not already complete (the certificate fixture's "kept if one already is" pattern — the fixture is called repeatedly in some specs and after certificate replacements, e.g. the domain `packages/domain/tests/integration/claim/death-certificate.spec.ts:446-466` — two files share that name), and seed ⛔ nothing when the claim has ⛔ no current upload (`certificate: 'skip'` callers — the certificate conjunct answers first). The family date EQUALS the accepted date, which defaults to TOMORROW (India time, `certificateDateAfterEverything()`) ⇒ the completion passes the same clock the review does — the domain copy's private `fixtureReviewNow(date)` (`_helpers.ts:913-916`), and the API copy's inline twin (`_nominee-name-check-fixture.ts:128`, `new Date(Math.max(Date.now(), …T12:00:00+05:30))`). ⚠ **These specs turn red BY DESIGN and are AMENDED to the new shape** (⛔ never a weakened assertion): raw completed-row INSERTs — `apps/api/tests/integration/claims/verifier-console.spec.ts:214`, `:1037`, `:1075`, `…/claims/verifier-console-shape.spec.ts:216`, `packages/domain/tests/integration/claim/nominee-refusal-inheritance.spec.ts:72`; real-writer completions without the new inputs (and with ⛔ no certificate upload) — domain `ground-inspection.spec.ts` (two completions), `ground-inspection-concurrency.spec.ts:217` (complete vs refusal), API `apps/api/tests/integration/claims/ground-inspection.spec.ts:378`, `:448` (`payload: {}`). And every direct `assembleVerifierConsole(deps, { db: … })` call in `claims/verifier-console.spec.ts` / `-shape.spec.ts` gains the `client` (AC9). Then run the WHOLE domain, API and admin suites before writing a new test; any OTHER red is a fixture gap.
- [x] **Task 11 — Tests** — see **Testing**; red-check each load-bearing one (revert the line, watch it fail).
- [x] **Task 12 — Records** — `sprint-status.yaml` row + a prepended ledger entry ([[project_sprint_status_safe_prepend]]); `deferred-work.md`: the 6.7-columns item (Task 6), the R9CasePanel outcome (9.4), and an append to the 6.20 CHUNK-1 inheritance item (*"`-239` inheritance source: an appeal-overturned refusal is never superseded …"*) that 6.26a made that read a GATE input (VISITED) — still accepted: ORIGINAL_SEEN still needs the claim's own certificate check; the File List; the Change Log. ⭐ (Already recorded by v2.5, ⛔ not at the build: the `deferred-work.md` item carrying `-284` E5's NON-blocking Panel confirm.)

### Review Findings — bmad-code-review 2026-10-07 (chunked: all 4 chunks reviewed — `packages/domain`, `apps/api`, `apps/admin`, `packages/contracts`+`packages/events`)

#### `packages/domain` chunk

- [x] [Review][Patch] The 20-photo cap can permanently strand an assignment that can never satisfy the mandatory certificate-photo requirement — `MAX_GROUND_INSPECTION_PHOTOS` (`ground-inspection-persist.ts:752-754`) counts every photo kind together, and completion requires `originalCertificatePhotoCount >= 1` (`:858`). Resolved (BigDev, 2026-10-07): reserve a certificate slot — exempt the upload from the cap when `photoKind === 'original_certificate'` and the assignment holds none yet, so a certificate photo can always be added. FIXED (`ground-inspection-persist.ts`) + new regression test in `ground-inspection.spec.ts`.
- [x] [Review][Patch] `completedAt` is written from the DB wall clock (`sql` `now()`) while the "day of completion" future-check uses the injectable `input.now` [`ground-inspection-persist.ts:889,906`] — not reachable through the one production caller today (it never passes `now`), but `now` is a public documented injectable parameter (6.21a D4) and the two should share one time source for consistency. FIXED: `completedAt: input.now ?? sql\`now()\``.
- [x] [Review][Patch] `claim_ground_inspections_death_time_source_check` has a NULL-propagation hole: `death_time_ciphertext IS NULL OR death_date_source = 'family_statement'` passes when a row has a time but `death_date_source` is NULL [`packages/domain/migrations/0147_ground-inspection-death-facts.sql:49-51`] — unreachable through today's single writer (which sets both together), but a real gap in the CHECK itself. FIXED: migration file edited (pre-merge, not yet shared beyond this branch) and the corrected constraint applied by hand to both `:5432` and `:5433` to keep them in sync ([[project_live_db_test_gotchas]]).
- [x] [Review][Patch] `getDeathCertificateUpload` scopes only by `pariwarId`, not `claimCaseId` [`packages/domain/src/claim/death-certificate-review-read.ts:97-113`] — no live leak today (its one caller always passes a claim-derived upload id from `readDeathCertificateSnapshot`), but this new single-purpose accessor should match the rest of this diff's defense-in-depth scoping convention. FIXED: added a `claimCaseId` parameter and predicate; updated its one call site.
- [x] [Review][Defer] The findings/photo/refusal writers still check the claim window on an UNLOCKED read (`assertClaimInVerification`), and GI3 widened that window (the whole review window plus a conditional R9 state) — the pre-existing TOCTOU race's opportunity window is proportionally larger now [`ground-inspection-persist.ts:285-291`] — deferred, pre-existing (a documented architectural split between event-emitting and non-event-emitting writers, widened in scope by this story, not introduced by it; worst case is a stray photo/finding/refusal note, not a data-integrity or approval-correctness hazard).
- [x] [Review][Defer] The TRUNCATE-lock regression test's NOWAIT retry budget was bumped 60-to-300 attempts to absorb new FK contention from this diff's `compared_certificate_upload_id` FK, with no independent evidence the new ceiling holds under heavier CI load [`packages/domain/tests/integration/rls/claim-death-certificate-policy-regression.spec.ts:398-412`] — deferred, pre-existing pattern (matches this repo's known history of tuning lock-contention test retry budgets); worth monitoring for flakes.

#### `apps/api` chunk

- [x] [Review][Patch] `ground-inspection-required-message.ts`'s wait-reason-to-message mapping is a binary ternary (`reason === 'no_completed_inspection' ? A : B`), not an exhaustive map over `GroundInspectionWaitReason` [`apps/api/src/modules/claims/ground-inspection-required-message.ts:9-13`] — unlike its sibling `NOT_REVISABLE_MESSAGES: Record<...>` one file over, which forces a compile error on a new union member. A future third wait reason would silently show the wrong 409 message on all five approval routes with no compile error. FIXED: converted to an exhaustive `Record<claim.GroundInspectionWaitReason, string>`.
- [x] [Review][Patch] A malformed or duplicate multipart `photoKind` field (fastify-multipart delivers duplicates as an array) silently degrades to the `'site'` default instead of being rejected, bypassing the "unknown kind" 400 validation that an explicitly-unknown string value gets [`apps/api/src/modules/claims/claims.ground-inspection.handlers.ts:505-512`]. FIXED: a present-but-malformed (array or non-string) `photoKind` field is now rejected the same as an explicitly-unknown one.
- [x] [Review][Patch] AC4's `original_certificate_not_produced` / `evidence_unavailable` refusal path (GI4) has no HTTP-level integration test in `apps/api` — it's exercised at the domain layer (`packages/domain/tests/integration/claim/ground-inspection.spec.ts`), but not through the actual route/handler. Coverage gap, not a functional defect. FIXED: added an HTTP-level test in `ground-inspection.spec.ts`.
- [x] [Review][Defer] `comparedAgainst` in the verifier-console's per-assignment facts collapses "no current certificate exists at all" and "compared against a certificate that was later superseded" into the same `'earlier'` value [`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:818-827`] — could mislead a verifier into thinking a newer certificate exists when none does. Reachability is uncertain (requires a claim whose current-certificate pointer reverts to null after an inspection was already completed against a real one, which the `-243` "every certificate kept forever" posture makes unlikely) — deferred pending confirmation that this state is actually reachable, rather than fixed speculatively.
- [x] [Review][Defer] `photo_kind_counts`'s per-kind audit tally is computed by subtraction (`site: photoCount - originalCertificatePhotoCount`), which silently folds any future third photo kind into `site` [`apps/api/src/modules/claims/claims.ground-inspection.handlers.ts:242-248`] — correct today (exactly two kinds exist), a latent trap only once a third kind is minted. Fixing it now would be engineering against a hypothetical; deferred with a trigger note in `deferred-work.md` for whoever adds the next photo kind.

#### `apps/admin` chunk

- [x] [Review][Patch] `CompleteAction`'s completion mutation had no `onError`: after a 409 `certificate_changed` (the family replaced the certificate after the inspector opened it), nothing cleared the stale `certificate.data` token, `ready` stayed `true`, and the "Complete inspection" button stayed enabled with the exact same stale token — a resubmission loop if the inspector retries "Complete" instead of re-reading the error text and re-clicking "Compare" [`apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:463-473`]. FIXED: added `onError` to call `certificate.reset()` on `certificate_changed` / `no_current_certificate`, forcing a fresh compare before retry; extended the existing 409 test to assert the button is disabled and the "compare needed" prompt returns.
- [x] [Review][Defer] `GroundInspectionPage`'s own inspector record (`InspectorRecord`) collapses a genuine decrypt failure and "nothing recorded" into the same blank/"—" rendering, unlike the verifier-console's `SignalsPanel`/`InspectorRecordLines` in the same diff, which explicitly renders "could not be read" via `deathDateUnreadable`/`deathTimeUnreadable` flags that `GroundInspectionPage`'s own `GroundInspectionAssignment` schema doesn't carry [`apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:368-388` vs `apps/admin/src/modules/claim-verification/SignalsPanel.tsx:367-390`]. Traced to the root: this is a **pre-existing** architectural difference between two independently-built read paths — `GroundInspectionPage`'s backend read handler (`apps/api/.../claims.ground-inspection.handlers.ts:816-825`, a "review #4" fail-soft convention predating 6.26a) already collapses decrypt failures to `null` for `notes`/`locationDetail`/`familyContact` too, not just the new date/time fields; GI10's "never blank" rule is textually scoped to the verifier-console surface (AC9/GI10, Task 9.3), not Task 9.1's page. Retrofitting the distinction into `GroundInspectionPage` would mean touching every one of its decrypted fields, not just two — a cross-surface UX-consistency decision beyond this patch's scope. Deferred with a trigger note.
- [x] [Review][Defer] `SignalsPanel.tsx:250` and `VerifierConsoleRoute.tsx:509` index `approveBlocked[waitReason ?? 'no_completed_inspection']` with no `??` fallback for an unrecognized key, unlike the sibling message-helper functions in `nominee-errors.ts`, which both guard with `?? approveBlocked.no_completed_inspection!`. Verified NOT reachable today — `packages/contracts/src/claims/verifier-console.ts:409` closes `waitReason` to exactly two values via zod before either component ever renders — but a latent trap the moment that enum grows, given this codebase's own convention of minting enum values outside full review. Deferred with a trigger note.
- [x] [Review][Defer] The certificate-view signed URL's `expiresInSeconds` is parsed but never consumed on `GroundInspectionPage` — no countdown, re-fetch-on-expiry, or warning if the inspector fills the form slowly and then opens an already-expired link. Low-severity UX gap; deferred.
- [x] [Review][Defer] The same domain copy (e.g. "Date of death (the family's word)") is hand-duplicated across two independently-maintained per-module i18n files (`verifier-console/i18n-en.ts` and `ground-inspection/i18n-en.ts`) with no shared source — a drift risk if one is edited and the other isn't. Consolidating admin i18n across modules is a bigger architecture decision than this patch round; deferred.

**Dismissed this chunk (verified false positives):** `groundInspectionGate` "missing" from the admin client's schema (it's correctly defined in `packages/contracts/src/claims/verifier-console.ts:434`; `client.ts` deliberately imports the shared contracts schema rather than hand-maintaining a shadow type — confirmed by its own doc comment); a refetch-failure banner rendering blank for a plain (non-`ApiError`) network error on `R9CasePanel.tsx` (a deliberate, documented "controlled degradation over a crash" choice per the Task 9.4 comment; the core "may be out of date, reload" message still renders); `InspectorRecord`'s extra `status === 'completed'` gate vs `InspectorRecordLines`' lack of one (not reachable — the one writer always sets `originalCertificateVerdict` and `status: 'completed'` atomically in the same UPDATE; `SignalsPanel`'s ungated version is arguably the more robust of the two anyway); "inconsistent" i18n coverage on the stage/refusal-reason selects (checked via `git log -p`: the pre-existing values were ALREADY untranslated raw strings before this diff; the diff correctly translates only the ONE new value it introduces each time, not scope-creeping into retrofitting the others); `photoKind`'s `useState` default "going stale" if `inspectionStage` changes (not reachable — the parent list item is keyed by `groundInspectionId`, and a stage change can only happen via a NEW id through reschedule, which always forces a remount); a dead `null` branch on `CompleteGroundInspectionBody.deathTime`'s type (cosmetic type-looseness, zero behavioral impact); deeply-nested ternaries (style only); missing admin test coverage for "the closure surfaces" under AC10 (the story's own Task 9.4 defines those surfaces as exactly `CycleFreezePage.tsx` and `R9CasePanel.tsx` — both are touched and tested in this diff; there is no separate "correction-closure" admin page this story owns).

#### `packages/contracts` + `packages/events` chunk

- [x] [Review][Defer] `packages/contracts/src/claims/verifier-console.ts` (443 lines) uses zero `.refine()`/`.superRefine()` anywhere — confirmed this is the file's established, pre-existing convention, not something this diff deviates from — so several cross-field invariants the new fields imply are schema-legal to violate even though the one real producer never does: (a) `GroundInspectionGateStatus`'s `available`/`complete`/`waitReason` accepts all 12 combinations though the producer (`assembleGroundInspectionGate`) only ever emits 3 — the governance-sensitive one, since a future producer bug here would silently show the WRONG blocking reason to a District Admin on a death-claim approval gate with no crash; (b) a per-item `inherited: true` has no schema link to the section-level `inheritedFrom`, so a future regression could ship an inherited record with no source attribution and no parse error; (c) `inherited: true` + `comparedAgainst: 'current'` is schema-legal despite being impossible by the handler's own logic; (d) `deathDate`/`deathTime` are bare `z.string()` with no format constraint despite doc comments promising `YYYY-MM-DD`/`HH:MM`; (e) `deathDate`/`deathDateUnreadable` (and the time pair) have no mutual-exclusion refinement, though confirmed unreachable today — `decryptFact` (`claims.verifier-console.handlers.ts:776-780`) makes `unreadable` and a non-null `value` complementary by construction. All five are real schema-level permissiveness, all five are consistent with this file never having used refinements, and all five are proven not to manifest today via dedicated tests + the single producer's construction. Introducing refinements would be a new pattern for this file — a design decision broader than this patch round. Deferred with a trigger note.

**Dismissed this chunk (verified false positives):** a new required `photoKind` field with "no migration path" for pre-existing rows (the migration backfills `DEFAULT 'site' NOT NULL` for every existing row — `packages/domain/migrations/0147_ground-inspection-death-facts.sql:35`); an events-registry description "contradiction" claiming the payload now carries "the actual claim state" without updating the field list (`from_state`/`to_state` are pre-existing standard fields via `requireIdentityTransition`, already tested — `packages/domain/tests/claim/ground-inspection-events.test.ts:110` — the new clause documents the GI3 lock-order reliability fix, not a new field); a strictness test using `deathDate` — a real field name from a sibling schema — as its "unknown key" probe (works correctly, a naming nitpick with zero functional impact); a concern that the GI10 test's `present`-variant object might not satisfy the full union (independently ran `pnpm --filter @twt/contracts test` — 74 files, 1267 tests, all green); a test-coverage observation that no test asserts omitting a required field fails (zod rejects a missing required field by construction — a coverage nicety, not a risk); a "Story 6.26 GI3" vs "Story 6.26a" citation mismatch (consistent with the story's own citation convention — the GI items are numbered under the umbrella "Story 6.26" and tagged by which half builds them, so both forms refer to the same thing).

### Adversarial self-review of the 8 applied patches — 2026-10-07

After all four chunks were fixed and the story moved to `done`, ran a fresh, context-free adversarial pass over just the 8 patches themselves (not the whole diff) — the reviewer had no knowledge of my own reasoning, only the patch diff and what each patch claimed to fix. It found 8 real issues in my own fixes, 5 of which were genuine and worth fixing:

- [x] **FIXED (real, most severe):** the `certificate_changed` 409 fix cleared the stale certificate token but left `verdict`/`deathDate`/`deathTime` untouched — an inspector could re-"Compare" (new token) and immediately "Complete" without re-examining anything, resubmitting a verdict judged against the SUPERSEDED certificate. `GroundInspectionPage.tsx`'s `onError` now also resets `verdict`/`deathDate`/`deathTime`; the admin test extended to assert the radio is unchecked and the date field is empty after the reset.
- [x] **FIXED (real, consistency):** `getDeathCertificateUpload`'s sibling `captionField` parsing had the identical "duplicate field arrives as an array" shape but no matching guard — harmless in consequence (caption is optional freeform text with no business meaning, unlike `photoKind` which gates GI4's mandatory-photo requirement) but the code's own comment claimed they were "read the same way," which was no longer true. Comment corrected to state the asymmetry explicitly and why it's intentional; `captionField`'s read made explicitly array-aware instead of relying on incidental `undefined`-on-array behavior.
- [x] **FIXED (test gap):** fix #6 (reject malformed/duplicate `photoKind`) shipped with zero regression coverage. Added an HTTP-level test in `apps/api/tests/integration/claims/ground-inspection.spec.ts` constructing a raw duplicate-field multipart body and asserting 400 `ground_inspection.invalid_photo_kind`.
- [x] **FIXED (test gap):** fix #2 (`completedAt` shares the injected clock) also shipped untested. Extended the existing GI5 domain test (which already exercises the `now`-injection path) to assert `completedAt` equals the injected clock, not the wall clock.
- [x] **FIXED (test gap):** the admin regression test for the resubmission-loop fix only covered `certificate_changed`, not the second reset-triggering code, `no_current_certificate` — a typo in that string literal (not a compile-checked union, `ApiError.code` is a plain `string`) would ship silently. Added a second test exercising it.
- [x] **FIXED (doc accuracy):** `GroundInspectionPhotoLimitError`'s doc comment ("the 21st is rejected") was no longer universally true once the first `original_certificate` photo was exempted from the cap. Comment corrected.
- [x] **FIXED (type accuracy):** the `data.fields` type cast claimed a field is never an array even though the new `Array.isArray` guard proves the code knows it can be — a trap for a future reader who trusts the annotation over the runtime check. Widened the cast to admit the array shape explicitly.
- **Considered, not fixed:** the exhaustive `Record` lookup for wait-reason messages returns `undefined` (rather than a wrong-but-coherent fallback string) if `reason` is ever a value outside the 2-literal union at runtime. Checked: this exact pattern (`NOT_REVISABLE_MESSAGES[err.reason]`, no fallback) is the established, pre-existing sibling convention in `claims.verification-decision.handlers.ts:134`, and `GroundInspectionWaitReason` is a compile-time-checked union at its one call site — the scenario requires an actual type-system violation, not a reachable code path. Matches repo convention; adding defensive-fallback code for an unreachable case would be inconsistent with it. Not fixed.

Re-verified after these fixes: `tsc --noEmit` clean on `@twt/domain`/`@twt/api`/`@twt/admin`; ESLint clean on every touched file; the full domain (327 files/4560 tests), api (150 files/1547 tests) and admin (59 files/937 tests) suites all green on both `:5432` and `:5433` where DB-backed.

**Dismissed this chunk (verified false positives):** a certificate-token case-sensitivity asymmetry (the domain's own currency check already lower-cases both sides, `ground-inspection-persist.ts:872`); a suspected UTC/IST future-date bug surfaced by a test fixture comment (`istDateOf` is correctly IST-offset-based; the fixture's "date may be tomorrow IST" is the Task 10-documented intentional fixture pattern, not a workaround); the console's `currentCertificateToken` supposedly going stale when a certificate is uploaded-but-unreviewed (it's sourced from the true current-upload snapshot, independent of review status); a claimed missing audit trail for denied certificate views (already wired through the shared `auditAuthorizationDenied` callback in `resolveInspectorOverride`, same as every other handler in the file); reliance on a `never`-typed throw helper without an explicit `throw` keyword (TypeScript enforces the `never` return type at compile time; this is the file's own established, consistent pattern); a shared test fixture's new default blast radius (the full domain + API suites — 327 + 150 files, 6105 tests — pass clean, and Task 10 already documents the full-suite-run gate for exactly this); an error-detail-shape "inconsistency" among sibling 409s (several of those errors are genuinely single-variant and have nothing to put in `details`); a duplicate signed-URL TTL constant (two independently-named policies that happen to share a value today, not a bug); a 400-vs-409 "contradiction" for `GroundInspectionDeathFactsInvalidError` (the domain's own error-class docstring, `packages/domain/src/claim/errors.ts:239-240`, explicitly classifies `time_not_allowed` and `source_mismatch` as malformed → 400 — the API route's shorter JSDoc just didn't spell out every example).

### Review Findings — bmad-code-review SECOND PASS 2026-10-07 (full diff `3311fc97..c855d651`, one run; 3 layers in parallel, read-only)

- [x] [Review][Decision] **The original-certificate photo is not tied to the certificate it photographs** — ✅ RESOLVED (BigDev, 2026-10-07: **A** — stamp + migration `0148`; recorded in `2026-10-07-286`) ⇒ patch below. — `countPhotos(…, 'original_certificate')` counts every original photo on the assignment, whenever taken; photos carry ⛔ no upload id. REACHABLE: an unaccepted certificate may be replaced while the assignment is `scheduled` (`mayDeathCertificateUploadBecomeCurrent` — review window, status ≠ `accepted`); the inspector photographs v1's original, the family uploads v2, the inspector re-Compares (token v2) and completes — the v1 photo satisfies GI4 and the row stores `compared_certificate_upload_id = v2`. Violates P1 / `-281` Q2 A (*"held and photographed the original … for the certificate the claim now relies on"*). The 2026-10-07 `certificate_changed` patch resets the client form only — the server re-check is blind to the photo. Mechanism is the open question (⛔ not the Panel's — the policy is ratified): (A) stamp each photo at upload with the claim's current upload id (new migration `0148`, nullable column) and count at completion only `original_certificate` photos stamped with the compared upload — fail-safe; (B) no migration — count only original photos whose `created_at` ≥ the current upload's `uploaded_at` — a proxy, fails open in the OCR-lag window; (C) defer as a known gap [`packages/domain/src/claim/ground-inspection-persist.ts:316,863`] (source: edge)
- [x] [Review][Decision] **Review patch #1 (photo cap admits a 21st photo) contradicts GI4's text with ⛔ no decision entry** — ✅ RESOLVED (BigDev, 2026-10-07: **A** — record the amendment in `2026-10-07-286`; fix the schema doc) ⇒ patch below. — GI4 (`-282`): *"the existing ≥1-photo rule and the cap of 20 are unchanged"*; `addGroundInspectionPhoto` now admits a 21st when it is the first `original_certificate`, recorded only as "Resolved (BigDev)" in the first pass's findings; the schema doc (`claim_ground_inspection_photos.ts`) still says the cap of 20 counts every kind. Supersede, never reinterpret: (A) record an amendment entry to GI4 (the cap is 20 site-or-any photos plus one reserved original slot) and fix the doc comment; (B) re-patch so the cap stays 20 TOTAL — refuse the 20th non-original photo while the assignment holds no original — and GI4 stands as written [`packages/domain/src/claim/ground-inspection-persist.ts:755-763`] (source: auditor+blind)
- [x] [Review][Patch] **(from Decision 1) Stamp each photo with the claim's current upload; completion counts only `original_certificate` photos stamped with the compared upload** — migration `0148` (nullable `certificate_upload_id` on `claim_ground_inspection_photos`, FK to the uploads), `addGroundInspectionPhoto` stamps under the lock, `completeGroundInspection` counts by stamp; a pre-stamp photo (NULL) never counts [`packages/domain/src/claim/ground-inspection-persist.ts:755,863`]
- [x] [Review][Patch] **(from Decision 2) Decision entry `2026-10-07-286` amending GI4 (cap = 20 + one reserved original slot; the original photo must be of the compared certificate), committed ALONE first; fix the schema doc comment** [`.decision-log.md`, `packages/domain/src/schema/claim_ground_inspection_photos.ts`]
- [x] [Review][Patch] **The certificate read is ⛔ not confined to an assignment the inspector holds** — `certificate()` has ⛔ no `status !== 'scheduled'` check and ⛔ no window check; a superseded / completed / refused assignment, or a `denied` / `settled` claim, keeps minting 300 s signed URLs to the claim's CURRENT certificate (incl. later replacements). GI4: *"confined to an assignment they hold"*; author choice (3) widened it with ⛔ no decision entry (checklist family 9 + 12(c)). Fix: 409 `ground_inspection.not_active` unless `scheduled` (mirror `uploadPhoto`), and refuse outside `isClaimInGroundInspectionWindow`; correct author choice (3) in the Completion Notes [`apps/api/src/modules/claims/claims.ground-inspection.handlers.ts:678`] (source: blind+edge+auditor)
- [x] [Review][Patch] **A second "Compare" swaps the token under a verdict already recorded** — the verdict/date/time reset lives only in the completion's `onError`; clicking Compare again (the only way to re-open an expired 300 s link) after the family replaced the certificate silently puts token v2 under a verdict judged against v1, and the server accepts it. Fix: in the certificate mutation's `onSuccess`, when the new token differs from the previous one, clear verdict / date / time; admin test [`apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:460`] (source: blind+edge)
- [x] [Review][Patch] **Checklist family 5 REAL GAP — migration `0147`'s constraints have ⛔ no migration-level assertion** — `completed_death_facts_check`, `death_time_source_check` (rewritten by review patch #3 with ⛔ no regression test — reverting it turns nothing red), `death_date_source_stage_check` and the `compared_certificate_upload_id` FK (`ON DELETE NO ACTION`) are only inferred through fixtures; add direct refusals to the policy-regression spec [`packages/domain/migrations/0147_ground-inspection-death-facts.sql`] (source: auditor)
- [x] [Review][Patch] **The AC1 "writes NOTHING" proof cannot fail** — `refusesAndWritesNothing` counts rows AFTER `ROLLBACK TO SAVEPOINT`, so any write before the throw is undone before the comparison (and `adjudicateClaim` does emit `claim.verifier_reviewing` before the gate from `verification_in_progress`). Count before the rollback, from a fixture state where the gate is the first write-capable step [`packages/domain/tests/integration/claim/ground-inspection-approval.spec.ts:95`] (source: auditor)
- [x] [Review][Patch] **AC2's "gate and console agree on every row" covers 6 of the 9 constructible rows** — add row 2 (only scheduled / refused / superseded assignments), row 5 (full visit vs U1 + certificate check vs U2, U2 current), row 9 (inheritance blocked: the only refused source has a `certificate_check` only) [`apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts:143`] (source: auditor)
- [x] [Review][Patch] **The certificate read has ⛔ no cross-Pariwar test and ⛔ no override-holder 200** — checklist family 3; AC4's *"(or an override holder)"* is unproven [`apps/api/tests/integration/claims/ground-inspection.spec.ts:861`] (source: auditor)
- [x] [Review][Patch] **The R9 GI11 test never renders the panel** — it calls `trusteeGroundInspectionRequiredMessage` directly; deleting the `.ground_inspection_required` branch from `R9CasePanel`'s `errorMessage` stays green. Drive a 409 through the panel and assert the words [`apps/admin/tests/r9-case-panel.test.tsx:320`] (source: blind)
- [x] [Review][Patch] **AC13 is ⛔ not attested at HEAD** — ✅ FIXED: `pnpm ci:local` at :5433 after this pass's patches — run 1: 30 / 34 (a type error in the new GI11 test broke typecheck / build / crypto-check, + 3 pre-existing admin tests timed out at 5 s under load, each green in isolation); fixed; run 2: ⭐ **34 / 34 green** (domain 328 files / 4564 tests, api 150 / 1548, jobs 48 / 568). Originally: — the `ci:local` 34/34 run predates `c855d651`, which edited `0147`, domain/api/admin code and fixtures; only tsc, ESLint and four suites re-ran. Re-run `pnpm ci:local` at :5433 after this pass's patches; until then it is un-attested (checklist family 10) (source: auditor)
- [x] [Review][Defer] **An inherited visit that vanishes after the final vote is not re-checked at the cycle commit** [`packages/domain/src/claim/state-trustee-decision-persist.ts` `commitCycleFreeze`] — deferred: GI16 deliberately leaves `commitCycleFreeze` untouched and the gate held at the vote; reachability ⛔ not proven (the `-239` source must still be a revisable `denied` — pre-freeze — when its refile reaches the final vote; `reviseDecision` would then let the reason change and drop the inheritance). `-283` A1 closed the R9 twin only.
- [x] [Review][Defer] **The fixture's completion clock can be in the FUTURE** [`packages/domain/tests/integration/_helpers.ts:922` `fixtureReviewNow`, `apps/api/tests/integration/_nominee-name-check-fixture.ts:194`] — deferred to 6.26b Task 4 / 9: `max(now, date 12:00 IST)` lands `completed_at` after the review's `decided_at`, so 6.26b's GI7 arm (`completed_at > v.decided_at`) would flag every seeded claim as a late warning.
- [x] [Review][Defer] **The `NOT VALID` completed-row CHECK refuses ANY later UPDATE of a pre-6.26 completed row** [`packages/domain/migrations/0147_ground-inspection-death-facts.sql`] — deferred: documented in Task 1.2 / AC11 and no live writer updates a completed row, but the deferred 6.7-columns erasure item must carry it (a scrub of those columns on legacy completed rows fails 23514 unless the CHECK is validated or relaxed first).

**Dismissed (17, verified):** `does_not_match` satisfies the gate (by design — P4 is 6.26b's; 6.26a records only); completion not tied to an actual view of the image (GI4's token IS the upload id; no server can prove a human looked); console "compared against" derived from the document-review token (false positive — that token is `snap.currentUploadId`, set even when unreviewed, `claims.verifier-console.handlers.ts:628`); erasure keeps the original-certificate photos (GI13 — kept as `-243` keeps certificates; the 6.7 caption gap is already deferred); single-column FK (Task 1.2's stated choice); `resolveEscalation` ungated (GI16); throwing `decrypt` in the inspector list (the 6.7 fields beside it already do — pre-existing; display gap already deferred); no lower bound on the death date (AC5 states the rules exactly; 6.26b compares); encrypt-before-validate cost; blind-index entropy (GI5/GI6's design, per-Pariwar key); the R9 banner reason (falls back to `apiErrorMessage`); the narrow plaintext check (no writer puts the date in JSON); fixture default `inspection: 'completed'` (GI15); misspelled multipart field; hand-synced admin tuples (pre-existing convention); an RTBF-vs-completion race (unreachable as far as traced — RTBF is `withdrawn`-only); the API pre-check tested over HTTP for `denied` only (same predicate as the domain's five-state test).

### Review Findings — NARROW ROUND 3 2026-10-07 (the round-2 delta `1f45c6f5..0ac5165c` + a fresh re-validate of `-286`; two read-only reviewers in parallel)

⭐ ⛔ No blocker, ⛔ no high. `-286` stands in substance — every structural fact re-traced (⛔ no older entry edited; the stamp, the NULL rule, the locks, the FK, GI16 all confirmed).

- [x] [Review][Decision] **The stamp is the certificate current when the photo is UPLOADED, ⛔ not the one the inspector compared** — ✅ RESOLVED (BigDev, 2026-10-07: **1** — tie the stamp to the Compare; recorded in `2026-10-07-287` J1, committed alone `c1dda242`) ⇒ FIXED: an original's photo is uploaded with the compared token, refused unless current, stamped with it; the admin uploads an original's photo only after Compare (and a stale-token 409 clears the Compare). Originally: `addGroundInspectionPhoto` stamps from the server's current upload; the upload carries ⛔ no token. Inspector compares v1, photographs v1's original, the family uploads v2 (now current), the photo is uploaded later ⇒ stamped v2 ⇒ after a re-Compare it satisfies GI4 (i) for v2. ⛔ No race needed — `-286`'s "fails SAFE" covers only the lag direction, and its heading says "current when it was TAKEN" [`packages/domain/src/claim/ground-inspection-persist.ts:796`] (source: code reviewer + validator)
- [x] [Review][Patch] **Story text not propagated for `-286`** — GI4 has ⛔ no `⚠ AMENDED by -286` line; AC4 and Task 2.3 still say "≥1 `original_certificate` photo"; the header amendment lists name only `-283`/`-284` (source: validator)
- [x] [Review][Patch] **The round-2 edit spliced the first pass's dismissal line into the second pass's list** — FIXED: the first-pass line restored byte-for-byte from `c855d651`; the second-pass list ends at its 17th item (source: validator)
- [x] [Review][Patch] **6.26b's Task 4 / Task 9 do ⛔ not carry the fixture-clock item owed to them; its Task 1 still names `0148`** (now taken) [`6-26b-death-facts-warnings-and-register-check.md`] (source: validator)
- [x] [Review][Patch] **The new admin hint gives the wrong reason** when the photo is for a NEWER certificate than the one compared (the Compare is stale, ⛔ the photo) and when the stamp is NULL (⛔ no certificate then) — word it neutrally and point at Compare [`apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx:551`] (source: both)
- [x] [Review][Patch] **⛔ No API test that the list's `certificateToken` exists and equals the Compare token** — renaming the field passes every test and breaks the real page (the admin zod requires it) [`apps/api/tests/integration/claims/ground-inspection.spec.ts:448`] (source: both)
- [x] [Review][Patch] **Deploy skew — the admin zod REQUIRES `certificateToken`** — make it optional; a missing value never matches ⇒ Complete stays off (safe), the server decides [`apps/admin/src/api/client.ts:1200`] (source: code reviewer)
- [x] [Review][Patch] **The GI14 completion audit's original-photo count includes photos of earlier certificates** — add the for-compared count (non-PII) [`ground-inspection-persist.ts` completion; handler audit] (source: code reviewer)
- [x] [Review][Patch] **Checklist family 2 — ⛔ no live two-connection test of the H2 reserved slot** (two concurrent original photos at the cap ⇒ exactly one admitted) [`packages/domain/tests/integration/claim/ground-inspection-concurrency.spec.ts`] (source: code reviewer)
- [x] [Review][Patch] **Family 9 — "a completed assignment holds a photo stamped with its compared upload" is writer-only (⛔ no cross-row DB backstop)** — record it as DELIBERATE in the schema doc (0148 is applied; ⛔ never edited) (source: code reviewer)
- [x] [Review][Patch] **The hard bound is worded off by one** ("20 + one per certificate made current during the assignment" — the certificate current at scheduling also gets a slot) [`claim_ground_inspection_photos.ts:12`] (source: both)
- [x] [Review][Patch] **The certificate GET's unreachable `claimRow === null` answers 409 `{ state: null }`** — a 404 `claim.not_found`, as `schedule` does [`claims.ground-inspection.handlers.ts:695`] (source: code reviewer)
- [x] [Review][Defer] **The verifier console does ⛔ not say which certificate an original photo was taken for** [`claims.verifier-console.handlers.ts:783`] — deferred: display only (the gate reads `compared_certificate_upload_id`, which completion now ties to a stamped photo); a `forCompared` label is a GI10 extension for the next story touching the console.

**Erratum — ✅ RECORDED in `2026-10-07-287` J2 (a NEW entry — `-286` is ⛔ never edited):** `-286`'s Decision-type line reads *"H1 is a MECHANISM for `-281` Q2 A, ⛔ a change to it"* — the negation word is missing ("⛔ not a change"); Consequence 2's *"provably of the compared certificate"* overclaims; H2's bound is off by one; the §0 quote is P1's wording / `-281`'s recorded reading, the ratified words being *"sees, photographs and matches the **new** original"*.

**Dismissed (3):** the stamp FK is single-column (mirrors 0147's, already dismissed); a stamp race producing a false pass (traced: the OCR job is forward-only under the claim lock — a stamp can only LAG); the TRUNCATE CASCADE set growing (photos were already in it through 0147).

### Review Findings — ROUND 4 2026-10-07 (a fresh-context check of `-287` + the round-3 delta `c1dda242..e23c3546`; one read-only validator)

⭐ `-287` stands as written — ⛔ no blocker, ⛔ no high; every fact re-traced, J2 accurate, ⛔ no Panel question, ⛔ no path stamps a photo with a certificate the page did not compare. ⇒ **the rounds STOP here** (the one medium was a page bug, ⛔ a decision flaw).

- [x] [Review][Patch] **After a stale-Compare 409 the page kept the OLD image selected — one click after re-comparing stamped the old certificate's original with the new certificate** (medium; the exact case J1 closes, reachable by following the page's own message) — FIXED: the upload's 409 also clears the chosen file (the uncontrolled input remounts) and caption, with its own words (*"…this photo was not recorded. Compare again, then photograph the original the family now holds."*); the test now proves Upload stays disabled after the re-Compare until a NEW photo is chosen. Red-checked [`apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx` `PhotoUpload`]
- [x] [Review][Patch] **"The token the inspector was SHOWN" is enforced by the server only as "= the current upload"** (low, wording) — FIXED: a Completion Notes line says what the server enforces and what the page + audit hold (⛔ no new entry — inside `-287`'s carve-out)
- [x] [Review][Patch] **The upload's 400 `ground_inspection.invalid_compared_certificate` was unrecorded** (low) — FIXED: GI4's amended line and AC4
- [x] [Review][Patch] **Two tests weaker than their titles** (low) — FIXED: the "same certificate again ⇒ the record stays" test now DEFERS the third Compare so its pending render commits (it stayed green with the token comparison removed — now red); the live reserved-slot race gained a BARRIER (a third connection holds the photo table until BOTH contenders are blocked) — it stayed green with the assignment lock REMOVED, now red. Both red-checked
- [x] [Review][Patch] **The upload's `original_certificate_required` message said "To complete the inspection…"** (low) — FIXED: worded for both callers [`claims.ground-inspection.handlers.ts`]
- [x] [Review][Defer] **The 6.7 site-photo race test (`BONUS — concurrent photo uploads at the MAX boundary`) has the same overlap weakness** [`ground-inspection-concurrency.spec.ts`] — deferred: pre-existing (6.7), outside 6.26a's delta; the barrier pattern above is the fix.

## Dev Notes

### What already EXISTS — traced at `3311fc97`, re-derived at `e1907338` (identical code) by v2.3 (rebuild ⛔ none of it)
- **The gate and its seam:** `assertClaimApprovable` (`nominee-name-check.ts:389-414`), `ClaimApprovalGateOptions` (`:421-430`), the inner helper's `-251` early return (`:523`).
- **The certificate snapshot:** `DeathCertificateSnapshot` (`death-certificate-approval.ts:56`, `currentUploadId` `:61`) / `readDeathCertificateSnapshot` (`:83`, one statement); `mayDeathCertificateUploadBecomeCurrent` (`:210`, doc-block `:201-209`); `assertDeathCertificateAcceptedForApproval` (`:395-410`).
- **The inspection substrate:** writers (`ground-inspection-persist.ts` — schedule `:386`, reschedule `:493`, findings `:613`, photo `:661`, complete `:726`, refusal `:796`; ALL six call `assertClaimInVerification` `:224-233`; the API `schedule` handler ALSO pre-checks the state, `claims.ground-inspection.handlers.ts:216-222`), reads (`ground-inspection-read.ts`), schema (`schema/claim_ground_inspections.ts`, `…_photos.ts`), routes (`claims.ground-inspection.routes.ts` — seven, with 6.17's row-dimension gate), admin page (`GroundInspectionPage.tsx`).
- **The inheritance:** `getInheritedGroundInspectionSource` (`nominee-refusal-read.ts:97-129`; ⛔ no stage filter at `:118-124` — `-283` A2); the console's use (`claims.verifier-console.handlers.ts:680-…`, `if (own.length === 0)` at `:691`). ⚠ Known and accepted: `deferred-work.md`'s 6.20 CHUNK-1 item (*"`-239` inheritance source: an appeal-overturned refusal is never superseded …"*) — an overturned refusal still passes its inspection on. 6.26a makes this read a GATE input (VISITED); still accepted, because ORIGINAL_SEEN needs the claim's OWN certificate check either way (Task 12 appends this to the item).
- **The R9 queue predicate:** `hasLiveRoutedRow` — THREE private copies (`r9-voting-persist.ts:275-291`, `state-trustee-decision-persist.ts:337`, `correction-closure.ts:189`) + inline twins (`cycle-freeze-read.ts:223`, `r9-voting-persist.ts:741`); `-283` A1 needs it ⇒ ONE leaf (Task 2.1); `R9_OUTCOME_FROM_STATES` (`state.ts:78-85`).
- **6.21a D4's date shape:** `recordDeathCertificateReview` (plaintext `acceptedDate` + injected `now`), `isRealCalendarDate` (`nominee-determination-persist.ts:71`), `istDateOf` (`cycle-calendar/holiday-resolver.ts:178`); the fixtures' `fixtureReviewNow` (`_helpers.ts:913-916`) and `certificateDateAfterEverything` (`:1010-1012`, tomorrow in India time).
- **The warnings:** `approval-warnings.ts` (kinds `:86`, key `:93`, the ONE statement `:213`, the bulk twin), the late reason (`approval-warnings-persist.ts`, NW14), the wait (`assertLateWarningsCovered`).
- **The blind index:** `encryption/blind-index.ts` — `blindIndex(fieldClass, plaintext, { pariwarId }, kms, hmacKeyRef)`; the API's call shape `encryption.blindIndex(FIELD_CLASS, …, enc.kms, enc.hmacKeyRef)` (`modules/auth/shared/email-index.ts:32`); the field-class authority `packages/domain/src/encryption/field-classes.ts` (`CLAIM_CONTACT_MOBILE_FIELD_CLASS` defined `:81`, used at `claim/correction-crypto.ts:59`).
- **The 409 mapping precedent:** `claims.verification-decision.handlers.ts:90-96` (the certificate arm) and its three siblings (`claims.cycle-freeze.handlers.ts:151`, `claims.r9-voting.handlers.ts:105`, `claims.correction-closure.handlers.ts:202`); the admin precedent `nominee-errors.ts` (`deathCertificateAcceptanceRequiredMessage`).

### What moves, and what must be preserved
- ⭐ Preserve: every existing refusal's code and order; the `-251` waiver's reach (name check ONLY); 6.17's row-dimension gate and the block/district immutability on reschedule; the idempotency of schedule/reschedule; the ≥1-photo and 20-photo rules; the inspector guard (D6); `resolveEscalation`'s ungated approve; 6.23a/b's single rule and the late-reason mechanism; the console's fail-closed sections and `approvalWarnings` staying LAST; the lock order assignment → claim in every inspection writer.
- ⚠ Moves: the inspection write window (GI3 + `-283` A1 — 6.7 behaviour, deliberately) AND the API schedule pre-check (A4); `getInheritedGroundInspectionSource`'s stage conjunct (A2); the console's inheritance condition (GI10); the console read ceiling (19 → 20). `APPROVAL_WARNING_KINDS` does ⛔ not move here (6.26b: +3).

### ⚠ Traps
1. **Lock order** (Task 2.3) — **assignment → claim**: every inspection writer that takes both locks takes them in that order, and ⛔ none takes claim → assignment (`schedule` takes ⛔ no assignment lock; findings / photo / refusal ⛔ never touch the claim row). v2.2's *"claim → assignment, everywhere"* was wrong: it would deadlock `complete` against `reschedule`. ⭐ The window predicate runs on the LOCKED claim row in every event-emitting writer (Task 2.1).
2. **One field class for both indexes** — 6.26a mints the constant; 6.26b's review writer reuses it. Two classes ⇒ every comparison differs ⇒ every claim warned.
3. ➡ (the bulk-reader drift trap is 6.26b's.)
4. **The console's inheritance** (Fact 3) — a refile with its own certificate check must still show the inherited inspection.
5. **`NOT VALID` is not "no check"** — Postgres re-checks the row on EVERY UPDATE. ⚠ The anonymizer (GI13) DOES update completed rows (v2.2's *"⛔ nothing updates them"* was false) ⇒ the CHECK must ⛔ never require a column the erasure NULLs (`death_date_index`), and the scrub touches only rows whose ciphertext is present, so a pre-6.26 row (which fails the CHECK) is ⛔ never updated.
6. **Enum values in their own migration** (Task 1.1) — using a value in the adding transaction fails.
7. ➡ (the late-key traps are 6.26b's — but GI3 is what MAKES an inspection completable after approval; 6.26b depends on it.)
8. ➡ (the queue trap is 6.26b's.)
9. **The fixture default** must equal the accepted date, or every approve-path spec gains a warning (the 6.23a Trap-5 lesson) — and that date is TOMORROW, so the completion must take the fixture's `now`, or every spec answers `death_date_in_future`.
10. **A completed pre-6.26 row** has ⛔ no compared upload ⇒ ⛔ never ORIGINAL_SEEN — expected; backfill ⛔ nothing. Null never matches (`-283` A7).
11. **The API pre-check is a twin of the domain guard** (`-283` A4) — widen BOTH through ONE predicate; an AC3 test goes through HTTP.
12. **The R9 exception is scoped** (`-283` A1) — `state_trustee_approved` is admitted ONLY with a live routing row; a test proves the refusal without one.

### Testing
- **Domain unit (pure):** AC2's table over `groundInspectionApprovalState`; the date/time validators.
- **Domain live-DB:** `ground-inspection.spec.ts` (window widened: AC3's refuse list incl. `state_trustee_approved` with and without a live R9 routing row; events' actual state; the amended review-2a test; GI4/GI5 refusals incl. `no_current_certificate`); `ground-inspection-concurrency.spec.ts` (complete vs a concurrent upload made current; **complete vs reschedule of the same assignment — ⛔ no deadlock**; complete vs R9 finalize on an R9-routed claim — the completion refuses `not_allowed` once the routing row is superseded; complete vs schedule on the same claim); a new `ground-inspection-approval.spec.ts` (AC1 at every one of the six calls + the waived approve; AC3's three paths end in approval; AC6; the inheritance stage filter); the RTBF live spec (AC11) + `tests/member/rtbf-anonymize.test.ts` pins; `approval-warnings.test.ts`' NW1 import scan with the new module.
- **API live-DB:** `claims/ground-inspection.spec.ts` (schedule in `reversed` → 201 through HTTP; new body fields, photo kind, the certificate read's 200/403/409, every new code); `claims/verifier-console.spec.ts` + `-shape.spec.ts` (the new section, the read ceiling `toBe(20)`, the SAVEPOINT fail-closed case, GI10's fields, inheritance + own); one 409 test per approval ROUTE — five (`verifier-decision`, `cycle-freeze`, `r9-voting`, `correction-closure`, `correction-escalation`); AC14's audit rows.
- **Admin (vitest + RTL):** `ground-inspection-page.test.tsx` (compare panel, verdict, photo kind, dates, refusal reason, 409 words); `verifier-console.test.tsx` (why-it-waits per reason, Approve disabled / Deny enabled, fail-closed, facts); the cycle-freeze / R9 / closure tests (the 409 words).
- **Contracts:** the console packet schema.
- **Gate:** `pnpm ci:local` with `DATABASE_URL` (:5433) — see [[project_ci_local_concurrency_oversubscription]] and [[project_known_livedb_test_failures]] before calling a red a flake.

### Previous-story intelligence (6.23b, 6.23a, 6.21a, 6.19c)
- A new conjunct in the gate breaks every approval fixture: extend the shared fixture with a default-ON option through the real writers (6.21a D12, 6.19a D14).
- Every new typed error needs a mapping at EVERY approval handler, or it is a 500 (6.21a's four arms).
- Bulk readers must take slices, ⛔ never throw past a cap (6.23b round 2); the console's sections fail CLOSED (6.18).
- 6.23b's round 2 found two of round 1's dispositions wrong IN THE CODE — re-diff the code, trust ⛔ no "fixed" note ([[feedback_story_validate_footguns]]).
- `**…**` inside a JSDoc can close it ([[project_markdown_emphasis_closes_jsdoc]]) — grep `\*\*/` after every doc-block edit. Prettier is ⛔ not enforced — hand-format ([[project_prettier_not_enforced]]).

### Git intelligence (last five commits at `3311fc97`)
All 6.23b: the story's SHA map; review rounds 2–3 (bulk-read slicing, fail-closed counts, the R9 wait arms); a CI false-positive fix (an unhandled rejection in an integration test); the 6.23b code review; its validate. ⇒ the warning module, its bulk reader and every approval writer were touched days ago — re-read them at Task 0.1, ⛔ never from memory.

### Latest technical notes
⛔ No new library. Postgres: `ALTER TYPE … ADD VALUE` cannot be used in its adding transaction (Task 1.1); `CHECK … NOT VALID` skips existing rows until `VALIDATE CONSTRAINT`. Drizzle: hand-authored SQL; ⛔ never a correlated subquery through the builder ([[project_epic6_drizzle_correlated_subquery_bug]]).

### Project context
No `project-context.md` exists. The house rules this story leans on are in memory: [[feedback_governance_commits_precede_implementation]], [[feedback_supersede_never_reinterpret]], [[feedback_trace_reachability_before_escalating]], [[project_not_in_production_merge_is_not_golive]] (FQ9 is a GO-LIVE condition; merging is ⛔ not fenced), [[project_branded_ids_lowercase]], [[project_type_only_import_cycle_trap]].

### References
- `.decision-log.md`: `2026-10-06-285` (Trustee-ratified — FQ9 holds the final vote and R9) · `2026-10-06-284` E1–E5 (amends `-283`) · `2026-10-06-283` A1–A8 (amends `-282`) · `2026-10-06-282` GI1–GI18 · `2026-10-06-281` Q1 B / Q2 A and its reading · `-280` (NW14 in `state_trustee_approved`) · `2026-09-28-262` FQ8 B/C and its reading · `-263` FQ9–FQ11, its reading, Consequences 1/4 · `-264` FQ12/FQ13, its reading · `-277` Q3 B · `-278` NW1, NW6, NW12, NW14 · `-279` A1, A6 · `-239` (b) · `-243` · `-226` cl.7 · `-251` · `-260` G1.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ8, FQ9, FQ11, FQ13 as put).
- `_bmad-output/planning-artifacts/epics.md` Story 6.7 (the 2026-09-28 annotation) · PRD `prds/prd-TWT-2026-05-22/prd.md` FR-40 (annotated).
- Stories: `6-7-ground-inspection-scheduling-notes-photos.md`, `6-17-block-dimension-ground-inspection-gate.md`, `6-20-…` (AC13), `6-21-death-certificate-clear-date-rule.md` (D4, D7, D12), `6-23-post-death-nominee-change-warnings.md` (NW1–NW18), `6-23b-every-approver-gives-a-warning-reason.md` (EA2, Trap 9).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md` (Q1/Q2 as put; ruled).
- The sibling story: `_bmad-output/implementation-artifacts/6-26b-death-facts-warnings-and-register-check.md`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.26a`, 2026-10-06.

### Debug Log References

- Task 0.1 (2026-10-06): `git fetch origin` — `origin/main` = `3311fc97`, an ancestor of HEAD; `git diff --name-only 3311fc97..HEAD -- packages apps scripts docs` = ⛔ empty (⛔ no code moved since the pin). ⛔ No decision after `-285`; rows `6-24` / `6-27` still `backlog` ⇒ ⛔ no rebase onto another conjunct.
- Migrations 0146 / 0147 applied to BOTH :5432 and :5433 (`db:migrate`); the completed-row CHECK reads `convalidated = f` on both, the two coherence CHECKs `t`. Both dev DBs hold pre-6.26 completed rows (372 / 343) — exactly the rows the NOT VALID CHECK and the scrub's `WHERE` exist for.
- ⚠ drizzle's migrator applies every pending file in ONE transaction, so 0147's CHECK compares `inspection_stage::text = 'certificate_check'` — an enum literal of 0146's new value would be an unsafe use in the adding transaction.
- First full suites after the conjunct + the default-ON fixtures: domain 8 red (3 files), API 6 red (3 files), admin / contracts red only on the new required contract fields — ALL in the story's red-by-design list or the fixture default itself (Task 10). One more red-by-design spec the list missed: `ground-inspection-concurrency.spec.ts`'s complete-vs-refusal passed only because the refusal won the lock race (the completion leg failed its own new validation) — amended, ⛔ left flaky.
- A forced `claims.current_state` (the inheritance spec's `forceState`) does ⛔ not hold across a writer: `projectClaimState` replays the stream and writes the real state back on the next event — the window tests drive every state through real events instead.
- `ci:local` run 2 (2026-10-06, :5433, after the fix): ⭐ **34 / 34 green** — the integration leg: domain 327 files / 4559 tests, api 150 / 1545, jobs 48 / 568, events, channels, queue, niyamavali-engine, validity-service all green. Admin 59 files (incl. the new tests) and contracts 74 files green in `test (unit)`.
- `ci:local` run 1 (2026-10-06, :5433): 33 / 34 green; `integration-tests` red on ONE domain test — `claim-death-certificate-policy-regression.spec.ts` › *"TRUNCATE is refused on both tables"*: `lockTruncateSetNowait` gave up after 60 NOWAIT attempts on a 9-table CASCADE set. ⭐ Caused by THIS story, ⛔ a flake to dismiss: 0147's `compared_certificate_upload_id` FK adds `claim_ground_inspections` (+ photos) to the uploads' CASCADE set, and the default-ON fixture now writes those tables in nearly every parallel approve-path spec (each test holds its locks for its whole BEGIN/ROLLBACK). The same test had passed in the earlier full domain run — probabilistic. Fix: that ONE call's retry budget 60 → 300 (test timeout 60 s); the all-or-nothing NOWAIT posture unchanged. Turbo stopped at the domain failure, so the run's api/jobs legs never ran ⇒ re-run in full.
- Red-checks (each load-bearing line reverted, its test watched fail, restored): the conjunct in `assertClaimApprovable` (11/11 gate tests red); the inheritance stage filter (1 red); the R9 branch of the window (2 red); `complete` reading the claim UNLOCKED (2 concurrency tests red); the scrub's `WHERE` (1 red); the console SAVEPOINT (2 red); the API schedule pre-check (1 red); the R9 panel's `isError && !data` guard (1 red).

### Completion Notes List

- ⭐ **The gate (GI1 / GI2).** `claim/ground-inspection-approval.ts`: ONE pure predicate (`groundInspectionApprovalState`), ONE read (`readGroundInspectionApprovalFacts` — own assignments + the shared inheritance fragment + the shared current-upload rule, ONE statement), ONE conjunct (`assertGroundInspectionCompleteForApproval`) called by the outer `assertClaimApprovable` after the name check and before the late-warning wait — so the six call sites and the `-251` waived approve inherit it with ⛔ no edit. `GroundInspectionRequiredError` → 409 `<prefix>.ground_inspection_required` `{ reason }` at all four mappers (the fifth route via `translateClosureError`), words in ONE API helper. Added to NW1's transitive import scan.
- ⭐ **Two shared SQL fragments, ⛔ no copies.** `currentDeathCertificateUploadIdSql` (death-certificate-approval.ts — `readDeathCertificateSnapshot` now reads it too) and `inheritedGroundInspectionSourceSql` (nominee-refusal-read.ts — `getInheritedGroundInspectionSource` now reads it, WITH `-283` A2's `inspection_stage <> 'certificate_check'`). ⚠ Pre-existing copies of the current-upload JOIN remain in `approval-warnings.ts` (6.23a — 6.26b touches that module) and `apps/jobs/src/claim-ocr-parity.ts` (the OCR job's own lock-held read) — ⛔ not changed here.
- ⭐ **The window (GI3, `-283` A1 / A4 / A5).** `isClaimInGroundInspectionWindow` (exported from ground-inspection-persist.ts): `CLAIM_REVIEW_WINDOW_STATES` (imported) or `state_trustee_approved` while R9-routed; used by all six writers AND the API `schedule` pre-check. The R9 queue predicate moved to ONE leaf (`claim/r9-routing.ts` — `liveRoutedToR9Exists(claimRef)` SQL fragment + `hasLiveRoutedRow`); the three private copies fold onto it; the bulk inline twins are recorded in `deferred-work.md`. The three event-emitting writers take the claim `FOR UPDATE` (assignment → claim) and read the window on the LOCKED row; the events carry the actual state. The KEPT code `ground_inspection.not_allowed` and class are unchanged (message + doc-comments say "outside the review window"); `state.ts`, `events.ts` and the events registry description amended.
- ⭐ **The inspector's record (GI4 / GI5 / GI12).** 0146 (enum values, own file) + 0147 (photo kind, verdict, compared upload FK `ON DELETE NO ACTION`, Tier-1 date/time, source, index; CHECKs). The completion writer: ≥1 `original_certificate` photo, verdict, compared upload re-asserted CURRENT under the claim lock (`certificate_changed` / `no_current_certificate`), the date (`death_date_required`, `death_date_in_future` on `istDateOf(now)`, an unreal date / bad time / a time on a check / a source off its stage ⇒ `GroundInspectionDeathFactsInvalidError` → 400 `ground_inspection.invalid_death_facts`). The handler encrypts and indexes under `DEATH_DATE_INDEX_FIELD_CLASS` (`encryption/field-classes.ts`, barrel-exported). The certificate read (GET `…/:ground_inspection_id/certificate`) with the D6 inspector guard and `admin_ground_inspection.certificate_viewed` (ids only); the photo kind multipart field (read after the stream drains; an unknown kind → 400 `ground_inspection.invalid_photo_kind`); the read returns the record decrypted.
- ⭐ **The console (GI9 / GI10).** `groundInspectionGate` from the gate's own read + predicate, ONE counted read under `underSavepoint` (`VerifierConsoleContext` gained a required `client`), BEFORE `approvalWarnings`; `VERIFIER_CONSOLE_MAX_READS` 19 → 20 (ledger line + an exact `toBe(20)`). The inheritance read now runs whenever the claim has ⛔ no OWN completed FULL visit; each item carries `inherited`, the verdict, `comparedAgainst` (`current` / `earlier` / `unknown` — the current upload comes from the document-review section's snapshot, ⛔ a second read), the decrypted date/time and their `…Unreadable` flags. Admin: the why-it-waits line, Approve disabled (Deny enabled) with its own words, fail-closed words; GI10's lines in `SignalsPanel`.
- ⭐ **Erasure (GI13 [a]; AC11).** `anonymizeMember` reads the deceased's claim ids, then scrubs the date/time ciphertexts to the sentinel and NULLs the index — ONLY `WHERE death_date_ciphertext IS NOT NULL` (asserted in SQL by the unit test; a pre-6.26 completed row fails 0147's CHECK on any rewrite). Unit pins 21 → 22 statements, 18 → 19 tables; a live RTBF spec succeeds on a completed inspection.
- ⭐ **Fixtures (GI15 [a]).** `seedNomineeNameCheck` (both copies) gains `inspection?: 'completed' | 'skip'` (default `'completed'`) through the real writers, family date = the accepted date, on the review's clock; the domain copy indexes through ONE stand-in (`fixtureDeathDateIndex`, for 6.26b's review fixture to reuse); the API copy uses the real field class.
- **Admin (Task 9).** `GroundInspectionPage`: the stage/refusal tuples, the compare panel (the signed copy), the verdict radio, the photo kind, the family date + optional time (the printed date on a check), the new 409s in words, the completed record. `CycleFreezePage` / `R9CasePanel`: the trustee words. ⭐ Task 9.4's trigger fired: the R9 panel keeps its data on a failed refetch with a banner (the `EscalationPanel` half stays open). Microcopy checked (⛔ `report`, `receipt`, `invoice`, `passbook`).
- ⚠ **Author choices within the story (⛔ policy; recorded for review):** (1) the writer takes `deathTime: { plaintext, ciphertext }` (the date's validate-plaintext shape) instead of a bare `deathTimeCiphertext`, so the `HH:MM` rule is re-checked in the domain; (2) only the completed-row CHECK is `NOT VALID` — the two coherence CHECKs hold on every existing row (all NULL) and are validated; (3) the certificate read has ⛔ no assignment-status gate (an inspector may re-open the copy of an assignment they held); (4) `comparedAgainst: 'unknown'` when the document-review section failed (⛔ a guess); (5) a small `getDeathCertificateUpload` accessor (none existed).
- ⚠ **CORRECTED 2026-10-07 (second code review):** author choice (3) above widened GI4's *"confined to an assignment they hold"* with ⛔ no decision entry — ⛔ no longer true. The certificate read now answers 409 `ground_inspection.not_active` unless the assignment is `scheduled`, and 409 `ground_inspection.not_allowed` outside the inspection window (`claims.ground-inspection.handlers.ts` `certificate()`). And GI4 (i) is amended by `2026-10-07-286`: the photo of the original counts only when STAMPED with the compared upload (H1, migration `0148`); the cap keeps one reserved slot for it (H2).
- ⚠ **What the SERVER enforces for `-287` J1 (narrow review round 4, 2026-10-07):** the token sent with an original's photo must EQUAL the claim's current upload — ⛔ that this actor actually ran a Compare. The same uuid is visible elsewhere (the verifier console's `certificateToken`, the photo list's stamp), so an API client could stamp without opening the copy. *"The token the inspector was SHOWN"* is held by the shipped page (an original's upload needs a Compare first; a stale 409 clears the Compare AND the chosen image) and evidenced by the `certificate_viewed` audit — the same posture as completion's `comparedCertificateToken`, and inside `-287`'s own carve-out (a server ⛔ cannot see what an image shows).
- **AC12 holds:** `PERMISSION_CATALOG_VERSION` 51 and 65 keys unchanged (⛔ no key added); ⛔ no claim event or payload field added; ⛔ no file under `apps/mobile`, `apps/public` or `packages/i18n` changed.

### File List

**New**
- `packages/domain/migrations/0146_ground-inspection-enum-values.sql`
- `packages/domain/migrations/0147_ground-inspection-death-facts.sql`
- `packages/domain/migrations/0148_ground-inspection-photo-certificate-stamp.sql` (second code review 2026-10-07; `-286` H1)
- `packages/domain/tests/integration/rls/claim-ground-inspection-death-facts-policy-regression.spec.ts` (second code review; checklist family 5)
- `packages/domain/src/claim/ground-inspection-approval.ts`
- `packages/domain/src/claim/r9-routing.ts`
- `packages/domain/tests/claim/ground-inspection-approval.test.ts`
- `packages/domain/tests/integration/claim/ground-inspection-approval.spec.ts`
- `packages/domain/tests/integration/claim/ground-inspection-rtbf.spec.ts`
- `apps/api/src/modules/claims/ground-inspection-required-message.ts`
- `apps/api/tests/integration/claims/ground-inspection-required-routes.spec.ts`
- `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`

**Modified — domain / events / contracts**
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/claim_ground_inspections.ts`, `packages/domain/src/schema/claim_ground_inspection_photos.ts`
- `packages/domain/src/encryption/field-classes.ts`, `packages/domain/src/encryption/index.ts`
- `packages/domain/src/claim/ground-inspection-persist.ts`, `errors.ts`, `index.ts`, `nominee-name-check.ts`, `nominee-refusal-read.ts`, `death-certificate-approval.ts`, `death-certificate-review-read.ts`, `r9-voting-persist.ts`, `state-trustee-decision-persist.ts`, `correction-closure.ts`, `state.ts`, `events.ts` (all under `packages/domain/src/claim/`)
- `packages/domain/src/member/anonymize.ts`
- `packages/events/src/registry.ts`
- `packages/contracts/src/claims/verifier-console.ts`
- `packages/domain/tests/integration/_helpers.ts`
- `packages/domain/tests/claim/approval-warnings.test.ts`, `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/integration/claim/ground-inspection.spec.ts`, `ground-inspection-concurrency.spec.ts`, `nominee-name-check.spec.ts`, `nominee-refusal-inheritance.spec.ts`
- `packages/domain/tests/integration/rls/claim-death-certificate-policy-regression.spec.ts` (the TRUNCATE leg's lock retry budget — see the Debug Log)
- `packages/contracts/tests/claims-verifier-console.test.ts`

**Modified — API**
- `apps/api/src/audit/audit-sink.ts`
- `apps/api/src/modules/claims/claims.ground-inspection.routes.ts`, `claims.ground-inspection.handlers.ts`, `ground-inspection-crypto.ts`, `claims.verifier-console.handlers.ts`, `claims.verification-decision.handlers.ts`, `claims.cycle-freeze.handlers.ts`, `claims.r9-voting.handlers.ts`, `claims.correction-closure.handlers.ts`
- `apps/api/tests/integration/_nominee-name-check-fixture.ts`
- `apps/api/tests/integration/claims/ground-inspection.spec.ts`, `verifier-console.spec.ts`, `verifier-console-shape.spec.ts`

**Modified — admin**
- `apps/admin/src/api/client.ts`
- `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`, `apps/admin/src/modules/ground-inspection/i18n-en.ts`
- `apps/admin/src/modules/claim-verification/SignalsPanel.tsx`, `i18n-en.ts`, `nominee-errors.ts`
- `apps/admin/src/routes/VerifierConsoleRoute.tsx`
- `apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx`, `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`
- `apps/admin/tests/ground-inspection-page.test.tsx`, `verifier-console.test.tsx`, `verifier-console-route-name-check.test.tsx`, `cycle-freeze-page.test.tsx`, `r9-case-panel.test.tsx`, `death-certificate-review.test.tsx`, `nominee-declaration-route.test.tsx`

**Modified — records**
- `_bmad-output/implementation-artifacts/6-26-ground-inspection-before-approval-and-death-facts.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/deferred-work.md`

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-10-06 | Created (`bmad-create-story 6.26`) at `3311fc97`. ⛔ No decision recorded yet — GI1–GI16 commit in Task 0; Q1/Q2 are routed to the Panel in Task 0. Status `ready-for-dev` (Task 0 is governance-first). |
| v1.1 | 2026-10-06 | The Q1/Q2 routing note written (Task 0.4, ahead of 0.3 at BigDev's direction: note → ruling → split). Writing it narrowed Q2: a certificate can be replaced only BEFORE acceptance (`isDeathCertificateUploadAllowedInReviewWindow`, `mayDeathCertificateUploadBecomeCurrent`) — the replacement case is a turned-back or unreviewed certificate. ⛔ No decision moved. |
| v2.0 | 2026-10-06 | **THE SPLIT** (BigDev; `-281` Consequence 2), after the Panel ruled **Q1 B · Q2 A** (`2026-10-06-281` — both as written, ⛔ no design change). THIS file becomes **6.26a** (the gate, the window, the inspector's record, the certificate check, why-it-waits; keeps the key); **6.26b** gets the warnings (GI6, GI7, GI17, GI18), the register check (GI8) and the queue. GI17 / GI18 added (Q1 B's two kinds). Every GI tagged [a]/[b]; AC7/AC8 and Tasks 4/5/7.2/9.2 moved (numbers kept). New: GI5's index is stored NOW under ONE exported field-class constant (6.26b needs ⛔ no backfill); Task 2.3's upload-lock trace answered (the OCR job makes an upload current under the claim-row lock). ⛔ Not committed. |
| v2.1 | 2026-10-06 | Task 0.2 / 0.3 done: branch `story/6-26-ground-inspection-before-approval-and-death-facts`; governance commit `9282d108` (story, note, `-281`, split); the author-commit **`2026-10-06-282`** (GI1–GI18, verbatim, both halves) committed alone as `97403945`. ⛔ No GI changed. Remaining before code: Task 0.6 (`epics.md`) and Task 0.1's re-read at the build. ⚠ ⛔ No fresh-context validate has run (offered). |
| v2.2 | 2026-10-06 | Task 0.6 done: `epics.md` gains `### Story 6.26a` and `### Story 6.26b` (Minted-by headers citing `-262`/`-263`/`-264`/`-277`/`-281`/`-282`, briefs). Task 0 now complete except 0.1's re-read at the build. |
| v2.3 | 2026-10-06 | **The first fresh-context validate** (`bmad-create-story validate 6.26`, HEAD `e1907338`, ⛔ no code moved since `3311fc97`; three read-only verifiers — code cites, design/reachability, governance/split seams — every BLOCKER/HIGH re-checked against the code). **2 BLOCKER:** the `NOT VALID` CHECK required `death_date_index`, which GI13's erasure NULLs — every erasure of an inspected deceased would fail 23514 (Task 1.2, Trap 5, AC11 rewritten; 6.26b's twin too); the API `schedule` handler pre-checks `verification_in_progress` itself, so GI3 stranded every Fact-1 claim at the API (`-283` A4), and the "KEPT" code `…claim_not_in_verification` exists nowhere — it is `ground_inspection.not_allowed` (A5). **6 HIGH:** the lock order (assignment → claim, ⛔ not the reverse — reschedule would deadlock); R9 finalize in `state_trustee_approved` could strand a refile whose inheritance vanished (A1 — BigDev: *"Admit while R9-routed"*); an inherited `certificate_check` passed as a visit (A2 — BigDev: *"Add the stage filter"*); the date rule had ⛔ no plaintext and ⛔ no clock while the fixture's date is tomorrow (A6, Task 2.3, Trap 9); ~ten specs red by design, now listed (Task 10); the header/user story claimed 6.26b's work, GI14 had ⛔ no AC (AC14 added), and a `deferred-work.md` trigger fires on `R9CasePanel.tsx` (Task 9.4). Plus ~14 MEDIUM / ~30 LOW (one-statement console read in a SAVEPOINT, null never matches, the field-class constant's home, the NW1 scan list, the RTBF unit pins, the exact Niyamavali sentence, the go-live coupling (A8), the `-263` State-Trustee reading, single-column FK, existing index and field class, catalog 51 / 65 keys, five 409 routes, camelCase body, the admin page's own tuples, `report` banned, cite corrections). **`2026-10-06-283`** committed alone (`e8200366`); 6.26b → v1.2 (A3 — BigDev: *"Add currency filter"*). Status stays `ready-for-dev`. ⚠ A fresh-context RE-validate of `-283` and this rewrite is owed before Task 1 (Task 0.7). |
| v2.4 | 2026-10-06 | **Round 2 — the fresh-context RE-validate of `-283` and v2.3** (0 BLOCKER, 2 HIGH, 6 MEDIUM, ~10 LOW; the HIGHs and the constant's home re-checked against the code). **`2026-10-06-284`** committed alone (`72afe24d`): E1 the correction queue lists an R9-routed late warning (6.26b; BigDev: *"Scan it while R9-routed"*; `-280`'s *"⛔ no late key arises there"* stops holding once 6.26b ships); E2 `DEATH_DATE_INDEX_FIELD_CLASS` lives in `encryption/field-classes.ts`; E3/E4 slips; E5 the `-263` reading kept, its quote corrected, a NON-blocking Panel confirm (BigDev: *"Keep reading + Panel confirm"*). Story text: the window predicate runs on the LOCKED claim row in `complete` (an R9 finalize could otherwise land a completion outside the window); the R9 routing predicate (three private copies today) moves to ONE leaf, ⛔ never imported from the gate module (cycle via `nominee-name-check`); AC9 uses `underSavepoint`; P3/P4 aligned with 6.26b and carry A3's currency; FK `ON DELETE NO ACTION`; AC5's 409s; the API fixture's inline clock; two more concurrency tests. 6.26b → v1.3 (the review table's column GRANT — its erasure would otherwise fail 42501). ⛔ No row moves. ⚠ Round 3 owed before Task 1 (Task 0.8). |
| v2.5 | 2026-10-06 | **Round 3** — a fresh-context re-validate of `-284` and v2.4: ⛔ no BLOCKER, ⛔ no HIGH ⇒ the rounds STOP (Task 0.8). 5 MEDIUM / 9 LOW, all story text, ⛔ no new decision entry: the leaf exports a SQL fragment `liveRoutedToR9Exists` as well as `hasLiveRoutedRow` (6.26b's queue needs it in SQL); GI7's `⚠ AMENDED by -284 E1` line (6.26b reads 6.26a's GI text as the record); the window evaluated on the LOCKED claim row in `schedule` / `reschedule` / `complete`; the console context's required `client` + its ~ten red-by-design test calls; the twin list corrected (`r9-voting-read.ts:91`, `state-trustee-decision-persist.ts:1300`; `:741` is an UPDATE); the constant goes into the `encryption/index.ts` barrel (`context.ts` does ⛔ not re-export every constant); a `-284` row in the rulings table; `epics.md` 6.26a's header and the sprint-status row comment name `-284`; `deferred-work.md` carries E5's Panel confirm. ⚠ Recorded, ⛔ not editable: `-284`'s title counts FOUR found slips while its Status line names three (E2–E4) — the fourth is E5's quote splice. Status `ready-for-dev`. |
| v2.6 | 2026-10-06 | **`2026-10-06-285` — the Panel ruled the `-284` E5 confirm: A** (DR + KB). FQ9 holds every approval — the State Trustee's vote and the R9 panel's included — where the District Admin never approved; `-263`'s *"State Trustee step — untouched"* is superseded for those paths. Story built for A ⇒ ⛔ no design change; the `-263` reading row is now ratified (rulings table + the not-covered line); the routing note's block filled; the `deferred-work.md` item DISCHARGED. Status `ready-for-dev`. |
| v2.7 | 2026-10-06 | **BUILT** (`bmad-dev-story 6.26a`). Tasks 1–3 and 6–12 done (4, 5, 7.2, 9.2 are 6.26b's — left unchecked by design). The conjunct, the predicate, the window (+ the R9 leaf), migrations 0146 / 0147 (:5432 AND :5433), the certificate check, the certificate read + audit, the console section (reads 19 → 20) and GI10's facts, the erasure scrub, the default-ON fixtures, the admin surfaces, Task 9.4's R9 refetch fix. Red-by-design specs amended (plus one the list missed: the complete-vs-refusal race). 9 load-bearing lines red-checked. `ci:local` 34 / 34 green after one fix this story caused (a TRUNCATE lock-set retry budget — Debug Log). `deferred-work.md`: 3 new items, 2 appends. ⛔ No decision changed; author choices listed in the Completion Notes. Status → `review`. |
| v2.8 | 2026-10-07 | **Second-pass code review** (`bmad-code-review 6.26a`, full diff `3311fc97..c855d651`, three layers in parallel): 2 decisions, 10 patches, 3 deferred, 17 dismissed. **`2026-10-07-286`** committed alone (`1f45c6f5`) — GI4 amended: H1 the original's photo is stamped with the certificate current when it was taken (migration `0148`, :5432 AND :5433), H2 the cap's reserved slot. Patches: the certificate read confined to a `scheduled` assignment in the window; a second Compare clears the stale record; the page counts only photos of the compared certificate; `0147`/`0148` constraints asserted directly (new policy-regression spec); the AC1 proof counts before its rollback; AC2's parity rows 2/5/9; the certificate read's cross-Pariwar 404 and override-holder 200; GI11 driven through the R9 panel. Each load-bearing change red-checked. |
| v2.9 | 2026-10-07 | **Narrow round 3** — a fresh-context re-validate of `-286` and a fresh adversarial review of the round-2 delta (`1f45c6f5..0ac5165c`), in parallel: ⛔ no blocker, ⛔ no high; 1 decision, 11 patches, 1 deferred, 3 dismissed. **`2026-10-07-287`** committed alone (`c1dda242`): J1 the original's photo is stamped with the certificate the inspector COMPARED (the upload carries the Compare token; refused unless current) — superseding `-286` H1's "current at upload"; J2 four wording slips in `-286` corrected. Patches: GI4's `⚠ AMENDED by -286 / -287` line, AC4, Task 2.3, the header lists; the round-2 dismissal splice repaired; 6.26b Tasks 1/4/9; the admin hint reworded and a "Compare first" gate on an original's upload; `certificateToken` optional in the admin schema and asserted at the API; the completion audit's for-compared count; a live two-connection test of the reserved slot; the family-9 note; the bound wording; a 404 for the unreachable missing claim. J1 red-checked. `pnpm ci:local` :5433 — run 3: 33 / 34 (`cross-pariwar-leak.spec.ts` › COUNT aggregate, 2718 vs 2714: two `events_log` reads under the shared `PARIWAR_A` with concurrent own-committing specs between them — the known residual class; 19 / 19 in isolation); run 4: ⭐ **34 / 34 green** (domain 4565, api 1549, jobs 568). |
| v2.10 | 2026-10-07 | **Round 4** — a fresh-context check of `-287` and the round-3 delta: `-287` stands, ⛔ no blocker/high ⇒ the rounds STOP. 1 medium (the page kept the old image after a stale-Compare 409) + 4 low, all patched and the load-bearing ones red-checked; 1 deferred (the 6.7 site-photo race test's overlap weakness). `pnpm ci:local` :5433 ⭐ **34 / 34 green** (domain 4565, api 1549, jobs 568). |
| v2.11 | 2026-10-07 | **Merged as PR #259 (rebase); the `pre-push` `ci:local` and all 34 GitHub checks passed.** The header gains the Story 6.26 SHA map (20 commits — 6.26's governance and 6.26a's build and four review rounds — each pair proved by identical `patch-id`; merged tree byte-identical). ⛔ No citation rewritten. |
