---
baseline_commit: 3311fc97
---

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

Status: ready-for-dev

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

**What the rulings do ⛔ NOT cover (each stays open — ⛔ not this story's to decide):** who may complete an inspection when the family refuses a
visit, and how long a claim may wait (⛔ no deadline was ruled — `-263`); who performs the office check and where (`-264` — operational);
which states' registers can be searched (`-262`); what any approver must weigh under a warning (`-262`); whether the **family** is told the
claim is waiting for an inspection (⛔ nothing was ruled ⇒ ⛔ no family message here). ⚠ One reading is ours and goes to the Panel as a
NON-blocking confirm (`-284` E5): that FQ9 also holds the final vote and R9 when the District Admin's approval did ⛔ not come first.

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
`⚠ AMENDED by -283` / `-284` line directly under the GI. The GI text
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
`ground_inspection.original_certificate_required` with the missing item; **when** the compared upload is ⛔ no longer the claim's current
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

- [ ] **Task 0 — Governance (AC0)** ⛔ no code before 0.3
  - [ ] 0.1 `git fetch origin`; `git diff --name-only 3311fc97..HEAD -- packages apps scripts docs`; re-read anything cited here that moved. Read every `.decision-log.md` entry after `-281` for `6-26`, `inspection`, `certificate`, `warning`. ⚠ If row 6-24 or 6-27 landed first, rebase onto their conjunct / kinds — ⛔ none drops another's check (`-277` Consequence 2).
  - [x] 0.2 `git switch -c story/6-26-ground-inspection-before-approval-and-death-facts` — ✅ 2026-10-06 (from `main` `3311fc97`); the story, note, `-281` and the split committed as `9282d108`.
  - [x] 0.3 Write the author-commit decision entry (GI1–GI18, verbatim from this file, each with its [a]/[b] owner; Status, §0 gate, Consequences — incl. the split and 6.26a's go-live coupling to 6.26b — References) and commit it ALONE. — ✅ `2026-10-06-282`, committed alone as `97403945`; every cited anchor resolves. ⚠ GI2's *"If the Panel answers Q2 B"* sentence is recorded there as MOOT (`-281` ruled Q2 A).
  - [x] 0.4 The Q1/Q2 routing note — ✅ written 2026-10-06 (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md`), its E4 commands run.
  - [x] 0.5 The ruling — ✅ `2026-10-06-281` (Q1 B · Q2 A), the note's block filled. Both match what v1.x was written for ⇒ ⛔ no re-derivation; the row split (v2.0).
  - [x] 0.6 `epics.md`: `### Story 6.26a` and `### Story 6.26b` after `### Story 6.23b`, each with a Minted-by header (`-262` FQ8 B/C, `-263` FQ9/FQ11, `-264` FQ12/FQ13, `-281`, the author-commit) and a brief. — ✅ 2026-10-06 (citing `-282`; every anchor resolves).
  - [x] 0.7 The first fresh-context validate (v2.3) — ✅ 2026-10-06: `2026-10-06-283` (A1–A8) committed alone as `e8200366`; this file and 6.26b rewritten to it. ⚠ A fresh-context RE-validate of `-283` and of this rewrite runs before Task 1 ([[feedback_story_validate_footguns]] #32 — a pass that writes a decision re-validates the decision).
  - [x] 0.8 Round 2 (v2.4) — ✅ 2026-10-06: `2026-10-06-284` (E1–E5) committed alone as `72afe24d`; both files rewritten to it. ✅ Round 3 (v2.5) found ⛔ no BLOCKER / HIGH ⇒ the rounds STOP; Task 1 may start.
- [ ] **Task 1 — Migrations (GI2–GI5, GI12)** — hand-authored, ⛔ never regenerated (the latest applied is `0145`)
  - [ ] 1.1 `0146_ground-inspection-enum-values.sql` — its OWN file (a value added to an enum cannot be USED in the adding transaction — the 0120 posture): `ALTER TYPE "ground_inspection_stage" ADD VALUE IF NOT EXISTS 'certificate_check'`; `ALTER TYPE "ground_inspection_refusal_reason" ADD VALUE IF NOT EXISTS 'original_certificate_not_produced'`.
  - [ ] 1.2 `0147_ground-inspection-death-facts.sql`: new enums `ground_inspection_photo_kind` (`site`, `original_certificate`), `ground_inspection_certificate_verdict` (`matches`, `does_not_match`), `ground_inspection_death_date_source` (`family_statement`, `original_certificate`); `claim_ground_inspection_photos.photo_kind NOT NULL DEFAULT 'site'`; `claim_ground_inspections` + `original_certificate_verdict`, `compared_certificate_upload_id uuid REFERENCES claim_death_certificate_uploads(upload_id) ON DELETE NO ACTION` (deliberately ⛔ not CASCADE — a deleted upload must ⛔ never silently delete an inspection; `-243` keeps every certificate and ⛔ nothing deletes an upload row except a claim's own cascade; a SINGLE-column FK — the table's PK is `upload_id` and it has ⛔ no `(pariwar_id, upload_id)` UNIQUE; the precedent is `0122` (reviews) and `0137` (reminder runs)), `death_date_ciphertext`, `death_time_ciphertext`, `death_date_source`, `death_date_index text`; the review-table columns are 6.26b's. CHECKs **`NOT VALID`**: a `completed` inspection carries `original_certificate_verdict` + `compared_certificate_upload_id` + `death_date_source` + `death_date_ciphertext` (⚠ ⛔ NOT `death_date_index` — GI13's erasure NULLs it, and Postgres re-checks a `NOT VALID` constraint on every UPDATE: requiring it would make every erasure of an inspected deceased fail 23514); its source matches its stage; a time only on `family_statement`. ⚠ A pre-6.26 completed row fails this CHECK on ANY update ⇒ GI13's scrub touches only rows whose `death_date_ciphertext IS NOT NULL` (AC11). The existing index is `(claim_case_id, status)` (`0055`) — add ⛔ none. Table grants (`0055`) already cover new columns.
  - [ ] 1.3 Drizzle schema files; `meta/_journal.json`. ⛔ No new field-class entry: `'ground_inspection'` already exists (`CLAIM_GROUND_INSPECTION_FIELD_CLASS`, `apps/api/src/context.ts:188`) for the two Tier-1 columns. `DEATH_DATE_INDEX_FIELD_CLASS = 'death_date'` is defined in `packages/domain/src/encryption/field-classes.ts` (beside `CLAIM_CONTACT_MOBILE_FIELD_CLASS`, `:81`) and added to the barrel `encryption/index.ts:49-60`; `apps/api` imports it from `@twt/domain` (`-283` A6, `-284` E2). Apply to :5432 AND :5433.
- [ ] **Task 2 — Domain: the writers (GI3–GI5, GI12)** (`claim/ground-inspection-persist.ts`)
  - [ ] 2.1 `assertClaimInVerification` → ONE exported predicate: `CLAIM_REVIEW_WINDOW_STATES` (imported) **or** `state_trustee_approved` with a live `routed_to_r9` routing row (`-283` A1). ⚠ The R9 queue predicate exists as THREE private copies (`r9-voting-persist.ts:276`, `state-trustee-decision-persist.ts:337`, `correction-closure.ts:189`) plus inline twins (`cycle-freeze-read.ts:223`, `r9-voting-read.ts:91` — the R9 queue read — and `state-trustee-decision-persist.ts:1300`, `commitCycleFreeze`'s exclusion; `r9-voting-persist.ts:741` is finalize's supersede UPDATE, ⛔ not a read twin) — all five semantically identical (pariwar + claim + `phase='routing'` + `outcome='routed_to_r9'` + `superseded_at IS NULL`; ⛔ none takes a lock) ⇒ move ONE into a NEW leaf module importing only `sql`, the db type and the schema — ⛔ never `review-window.ts` (`death-certificate-approval.ts` relies on it staying import-free). ⭐ The leaf exports TWO things built on ONE condition: a raw-SQL fragment `liveRoutedToR9Exists(claimRef)` (an `EXISTS (…)` with explicit `"claims".` qualifiers — 6.26b's queue needs it inside its raw-SQL WHERE, where a per-claim call would be an N+1) and the per-claim `hasLiveRoutedRow` built on it. Fold the three private copies onto it (or record the remaining ones in `deferred-work.md`); ⛔ never a fourth copy. ⚠ Import graph: `r9-voting-persist.ts` reaches `nominee-name-check.ts` ⇒ ⛔ never import it (or the window predicate, if it imports r9) from `ground-inspection-approval.ts` — that closes `nominee-name-check → gate → r9 → nominee-name-check` and fails NW1's scan. The WINDOW predicate (it needs `CLAIM_REVIEW_WINDOW_STATES` ⇒ ⛔ not the leaf) is exported from `ground-inspection-persist.ts`; the API pre-check imports it from `@twt/domain`. ⭐ Every EVENT-EMITTING writer evaluates it on the LOCKED claim row: `complete` and `reschedule` take the claim `FOR UPDATE` right after `lockActiveAssignment` (assignment → claim); `schedule` (⛔ no assignment to lock) takes the claim `FOR UPDATE` first. Today all three check on an UNLOCKED read (`:409`, `:535`, `:732`) — a 6.7 race the widening enlarges (an R9 deny or an adjudication landing in between leaves an assignment and an event with a stale `from_state` on a claim outside the window). `recordFindings` / `addPhoto` / `recordRefusal` emit ⛔ no event and touch ⛔ no claim row — they keep the unlocked check. The THREE `projectClaimState` payloads (`:437`, `:571`, `:756`) use `claimRow.currentState`; doc-blocks amended (GI3), incl. `state.ts:135-154`, `events.ts:163-215` and `packages/events/src/registry.ts:227`. The error class and `ground_inspection.not_allowed` are KEPT.
  - [ ] 2.2 `addGroundInspectionPhoto` takes `photoKind` (default `site`).
  - [ ] 2.3 `completeGroundInspection` takes `{ originalCertificateVerdict, comparedCertificateUploadId, deathDate: { plaintext, ciphertext, index, source }, deathTimeCiphertext, now? }` — the plaintext is for validation ONLY (`isRealCalendarDate`, `nominee-determination-persist.ts:71`; "⛔ never after the day of completion" = `istDateOf(now)`, `cycle-calendar/holiday-resolver.ts:178`), ⛔ never stored — 6.21a D4's own shape (`recordDeathCertificateReview`'s `acceptedDate` + `now`). ⚠ **LOCK ORDER: assignment → claim — the order EVERY inspection writer already uses** (`lockActiveAssignment` FOR UPDATE, then `projectClaimState`'s upsert takes the claim row). Here the order is: `lockActiveAssignment` FOR UPDATE → the claim row `SELECT … FOR UPDATE` → the WINDOW predicate (incl. the live R9 routing row) evaluated ON THE LOCKED ROW (today `assertClaimInVerification` runs at `:732` from an UNLOCKED `getClaimCase` — move it under the lock) → `readDeathCertificateSnapshot` → the event's `from_state`/`to_state` from the locked row. ⚠ Without this, an R9 finalize (or a vote moving `state_trustee_freeze` → `state_trustee_approved`) that commits while `complete` waits on the claim lock lets the completion land outside the window with a stale `from_state` (`projectClaimState` never checks it). ⛔ Never claim → assignment in this writer alone: `rescheduleGroundInspection` holds the assignment and then waits for the claim inside `projectClaimState` ⇒ a 40P01 deadlock (a 500). ⭐ Why this order is safe: the OCR job makes an upload current only under the claim-row lock (`apps/jobs/src/claim-ocr-parity.ts:316-321`, re-checking `mayDeathCertificateUploadBecomeCurrent` at `:349-351`), and the approval writers read inspections under their claim lock without locking assignments ⇒ ⛔ no cycle. Refuse a non-current compared upload (`certificate_changed`) and ⛔ no current upload at all (`no_current_certificate`); count `original_certificate` photos under the lock; validate source ⇔ stage; `HH:MM` = `^([01]\d|2[0-3]):[0-5]\d$` (⛔ no helper exists — define it once).
  - [ ] 2.4 `REFUSAL_REASONS_BY_DISPOSITION.evidence_unavailable` (`:180-189`) gains `original_certificate_not_produced`.
  - [ ] 2.5 New typed errors (`GroundInspectionOriginalCertificateRequiredError`, `GroundInspectionCertificateChangedError`, `GroundInspectionNoCurrentCertificateError`, `GroundInspectionDeathDateRequiredError` / `…InFutureError`) beside the existing ones.
- [ ] **Task 3 — Domain: the gate (GI1, GI2)**
  - [ ] 3.1 `claim/ground-inspection-approval.ts`: `readGroundInspectionApprovalFacts` — ONE raw-SQL statement: own assignments' `status`, `inspection_stage`, `compared_certificate_upload_id`; the current upload id; whether the claim inherits, through the ONE shared inheritance fragment (`-283` A2: extracted from `getInheritedGroundInspectionSource`, which then uses it too, WITH the new `inspection_stage <> 'certificate_check'` conjunct) — ⛔ never a second copy of the inheritance predicate or of the current-upload rule. + the pure `groundInspectionApprovalState` (null never matches — A7) + `assertGroundInspectionCompleteForApproval`. ⚠ Import discipline: `nominee-name-check.ts` will import this module ⇒ it must ⛔ never reach `claim/events.ts`, `claim/nominee-name-check.ts` or `claim/nominee-lock.ts` — add it to 6.23a NW1's transitive scan (`packages/domain/tests/claim/approval-warnings.test.ts:342`, the `forbidden` list's `for (const entry of [...])` loop).
  - [ ] 3.2 `assertClaimApprovable` calls it between the name-check helper and `assertLateWarningsCovered`; the `opts` comment's 6-26 note (`nominee-name-check.ts:403-405`) and the function doc-block (`:344-388`) updated — the note is deleted only once it is true, ⛔ never before.
  - [ ] 3.3 `GroundInspectionRequiredError` in `errors.ts`; re-export through `claim/index.ts`.
- [ ] **Task 4 — ➡ MOVED to 6.26b** (the warnings, the queue).
- [ ] **Task 5 — ➡ MOVED to 6.26b** (the register check).
- [ ] **Task 6 — Erasure (GI13 [a]; AC11)** — `member/anonymize.ts`: the inspection's date/time ciphertexts → sentinel ONLY where present, `death_date_index` → NULL, on the deceased's claims (read the claim ids first, as GI13 says); `packages/domain/tests/member/rtbf-anonymize.test.ts`: its `mockClient` records only `update(table)` ⇒ extend it to answer the claim-id read, and move the two pins (`toHaveLength(21)`, `18` tables) by exactly what this adds; the live RTBF spec (AC11); the `deferred-work.md` item for 6.7's columns.
- [ ] **Task 7 — API**
  - [ ] 7.1 `claims.ground-inspection.routes.ts` / `.handlers.ts`: the `schedule` handler's own state pre-check (`handlers.ts:216-222`) calls Task 2.1's predicate (`-283` A4); `CompleteBody` (camelCase, `.strict()`, routes `:88-93`) gains `originalCertificateVerdict`, `comparedCertificateToken` (= the current upload's id, the same uuid the console already calls `certificateToken` — compare lower-cased, [[project_branded_ids_lowercase]]), `deathDate`, `deathTime` (nullish); the handler encrypts both and computes the index under `DEATH_DATE_INDEX_FIELD_CLASS` (from `@twt/domain`); the photo upload takes a `photoKind` multipart field read AFTER the file stream is drained (the caption's pattern, `handlers.ts:446-450`); `RefusalReasonEnum` follows the domain tuple; the new GET `…/ground-inspection/:ground_inspection_id/certificate` (GI4 — `deps.claimDocumentStorage.signedReadUrl(key, 300)`, as the photo read does at `:688`; audited through `emitAuthAudit`, AC14); map every new typed error (409/400) beside the existing ones. ⚠ The routes file is on `claim-adjudication-human-actor`'s `ENROLMENT_OWED` list (`scripts/…/check.ts:266-268`) — a new route in it is fine; a NEW `claims.*.routes.ts` file would need classifying.
  - [ ] 7.2 ➡ MOVED to 6.26b (the register check on accept).
  - [ ] 7.3 `claims.verifier-console.handlers.ts`: the `groundInspectionGate` section (AC9 — one statement, SAVEPOINT, before `approvalWarnings`; `MAX_READS` 19 → 20 with a ledger line in its doc comment); GI10's [a] per-assignment fields + the inheritance condition (Fact 3).
  - [ ] 7.4 The four approval mappers (GI11) — `claims.verification-decision.handlers.ts:90-96`, `claims.cycle-freeze.handlers.ts:151`, `claims.r9-voting.handlers.ts:105`, `claims.correction-closure.handlers.ts:202` (which also serves `claims.correction-escalation.handlers.ts:290`).
  - [ ] 7.5 `apps/admin/src/api/client.ts`: the certificate read and the photo-kind / completion fields.
- [ ] **Task 8 — Contracts** (`packages/contracts/src/claims/verifier-console.ts` — `groundInspectionGate` and the per-assignment fields): new fields; ⚠ a new REQUIRED field breaks contracts / mobile fixtures outside `tsc` — run their vitest ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 9 — Admin**
  - [ ] 9.1 `GroundInspectionPage.tsx` (+ `i18n-en.ts`): its own copies of the stage list (`:18`, `STAGES`) and the refusal map (`:29-35`) gain `certificate_check` / `original_certificate_not_produced`; on an open assignment, *"Compare with the certificate we hold"* (the signed image) and the verdict radio; the photo-kind choice on upload; the completion form's family date (required) + time (optional, "not known") for a full visit, the printed date for a certificate check; every new 409 in words.
  - [ ] 9.2 ➡ MOVED to 6.26b (the register-check choice).
  - [ ] 9.3 `VerifierConsoleRoute.tsx` / `SignalsPanel.tsx` / the decision strip: the why-it-waits line, Approve disabled, GI10's facts, the inherited + own labels.
  - [ ] 9.4 GI11's [a] words on `CycleFreezePage.tsx` and `R9CasePanel.tsx` (the closure surfaces show the server's message — AC10). ⭐ `R9CasePanel.tsx` is touched ⇒ the `deferred-work.md` item *"A FAILED refetch after a 409 hides the whole approval surface"* fires (*"the next story touching either surface"*): render the refetch error as a banner while `data` exists, on `R9CasePanel.tsx` (the `EscalationPanel.tsx` half stays open — ⛔ not touched here), and append the outcome to the item.
  - [ ] 9.5 `microcopy.yaml` vocabulary check on every new string (the `ci:local` microcopy gate scans all of `apps/admin/src/**`; ⚠ `report` is banned — ⛔ no "inspection report").
- [ ] **Task 10 — Fixtures (GI15 [a]; AC13)** — both `seedNomineeNameCheck` copies (`packages/domain/tests/integration/_helpers.ts:1099`, `apps/api/tests/integration/_nominee-name-check-fixture.ts:141`): seed the inspection ONLY when `groundInspectionApprovalState` is not already complete (the certificate fixture's "kept if one already is" pattern — the fixture is called repeatedly in some specs and after certificate replacements, e.g. the domain `packages/domain/tests/integration/claim/death-certificate.spec.ts:446-466` — two files share that name), and seed ⛔ nothing when the claim has ⛔ no current upload (`certificate: 'skip'` callers — the certificate conjunct answers first). The family date EQUALS the accepted date, which defaults to TOMORROW (India time, `certificateDateAfterEverything()`) ⇒ the completion passes the same clock the review does — the domain copy's private `fixtureReviewNow(date)` (`_helpers.ts:913-916`), and the API copy's inline twin (`_nominee-name-check-fixture.ts:128`, `new Date(Math.max(Date.now(), …T12:00:00+05:30))`). ⚠ **These specs turn red BY DESIGN and are AMENDED to the new shape** (⛔ never a weakened assertion): raw completed-row INSERTs — `apps/api/tests/integration/claims/verifier-console.spec.ts:214`, `:1037`, `:1075`, `…/claims/verifier-console-shape.spec.ts:216`, `packages/domain/tests/integration/claim/nominee-refusal-inheritance.spec.ts:72`; real-writer completions without the new inputs (and with ⛔ no certificate upload) — domain `ground-inspection.spec.ts` (two completions), `ground-inspection-concurrency.spec.ts:217` (complete vs refusal), API `apps/api/tests/integration/claims/ground-inspection.spec.ts:378`, `:448` (`payload: {}`). And every direct `assembleVerifierConsole(deps, { db: … })` call in `claims/verifier-console.spec.ts` / `-shape.spec.ts` gains the `client` (AC9). Then run the WHOLE domain, API and admin suites before writing a new test; any OTHER red is a fixture gap.
- [ ] **Task 11 — Tests** — see **Testing**; red-check each load-bearing one (revert the line, watch it fail).
- [ ] **Task 12 — Records** — `sprint-status.yaml` row + a prepended ledger entry ([[project_sprint_status_safe_prepend]]); `deferred-work.md`: the 6.7-columns item (Task 6), the R9CasePanel outcome (9.4), and an append to the 6.20 CHUNK-1 inheritance item (*"`-239` inheritance source: an appeal-overturned refusal is never superseded …"*) that 6.26a made that read a GATE input (VISITED) — still accepted: ORIGINAL_SEEN still needs the claim's own certificate check; the File List; the Change Log. ⭐ (Already recorded by v2.5, ⛔ not at the build: the `deferred-work.md` item carrying `-284` E5's NON-blocking Panel confirm.)

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
- `.decision-log.md`: `2026-10-06-284` E1–E5 (amends `-283`) · `2026-10-06-283` A1–A8 (amends `-282`) · `2026-10-06-282` GI1–GI18 · `2026-10-06-281` Q1 B / Q2 A and its reading · `-280` (NW14 in `state_trustee_approved`) · `2026-09-28-262` FQ8 B/C and its reading · `-263` FQ9–FQ11, its reading, Consequences 1/4 · `-264` FQ12/FQ13, its reading · `-277` Q3 B · `-278` NW1, NW6, NW12, NW14 · `-279` A1, A6 · `-239` (b) · `-243` · `-226` cl.7 · `-251` · `-260` G1.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ8, FQ9, FQ11, FQ13 as put).
- `_bmad-output/planning-artifacts/epics.md` Story 6.7 (the 2026-09-28 annotation) · PRD `prds/prd-TWT-2026-05-22/prd.md` FR-40 (annotated).
- Stories: `6-7-ground-inspection-scheduling-notes-photos.md`, `6-17-block-dimension-ground-inspection-gate.md`, `6-20-…` (AC13), `6-21-death-certificate-clear-date-rule.md` (D4, D7, D12), `6-23-post-death-nominee-change-warnings.md` (NW1–NW18), `6-23b-every-approver-gives-a-warning-reason.md` (EA2, Trap 9).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-06-6-26-certificate-mismatch-and-replacement.md` (Q1/Q2 as put; ruled).
- The sibling story: `_bmad-output/implementation-artifacts/6-26b-death-facts-warnings-and-register-check.md`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

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
