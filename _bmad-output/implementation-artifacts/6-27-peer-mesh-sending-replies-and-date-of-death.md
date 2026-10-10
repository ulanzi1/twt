---
baseline_commit: fa2687ce
---

<!--
⭐ RE-PINNED 2026-10-10 (v2.0, after the fresh-context validate) to `fa2687ce` on `story/6-30-app-links-open-the-app-from-a-text`
(= `main` `5946e411` + the 6.27 / 6.30 story and governance commits, incl. `2026-10-10-303`, `-304`, `-305`). The CODE is identical to
`5946e411` (`git diff --stat 5946e411 fa2687ce -- packages apps scripts infra` is empty). Every `file:NNN` is AS OF that code, verified by
four read-only validators (consistency + split; code claims; governance trace; 6.30 + the interface) and the author.
⚠ Before Task 1: `git diff --name-only fa2687ce..HEAD -- packages apps scripts infra` — re-read any cited file in that list.
⚠ BRANCH: this file's history (v1.3–v2.0) and `-303` / `-304` / `-305` live on `story/6-30-…`, ⛔ not on `story/6-27-…` (whose tip
`a05ce150` holds v1.2). ⇒ Task 0.0: rebase / fast-forward the build branch onto the governance tip (or onto `main` once these merge) and
`git fetch`; ⛔ never build from a branch where this file reads below v2.5 (the round-6 fixes).

⭐ STORY 6.27 IS FOUR STORIES (`2026-10-10-305` §2 item 1; BigDev: *"Four parts (Recommended)"*):
  · **6.27a — THIS FILE** (keeps the row key `6-27-peer-mesh-sending-replies-and-date-of-death` — the rulings cite it): the neighbours can
    ANSWER (the versioned questionnaire, the app screens, the helpline) and the District Admin SEES the answers.
  · **6.27b** — `6-27b-peer-mesh-warnings-wait-and-approvers-view.md`: the two warnings, the late wait, the correction queue, and every
    approver at their step sees the answers.
  · **6.27d** — `6-27d-inspector-discrepancy-at-completion.md`: the inspector is shown only differences, after completing their own record.
  · **6.27c** — `6-27c-peer-mesh-sending-texts-and-links.md`: SENDING — the texts, the link, the language. LAST.
  ORDER: a → (b ∥ d) → c; c also needs row `6-30` `done` AND row `6-36-peer-mesh-school-wise-selection` `done` (`2026-10-10-306`: the five are
  chosen from the member's own school — ⛔ never texted on 6.6's district choice); ⚠ 6.27a's Task 5 (the mobile screens) ALSO needs 6.30's route shell
  (`apps/mobile/app/(peer-request)/peer-request.tsx`, 6.30 AL16) MERGED — the rest of 6.27a does ⛔ not. b, c, d stay `backlog` until their
  predecessors are `done` (the 6.21b / 6.23b / 6.24b / 6.26b precedent). ⭐ Sending last turns every go-live coupling into merge order: by the time a real text goes out, the warnings
  and the wait (b), the approvers' view (b) and the inspector's independence (d) already exist.
⭐ THE RECORD: this file holds the ONE shared decision block PM1–PM25, the rulings, the invariants, the FOUND facts and Task 0 (shared by all
four). Each PM is tagged **[a]**, **[b]**, **[c]**, **[d]** for the part that builds it. Where a summary in b / c / d and THIS file disagree,
THIS file is the record (the 6.26a / 6.26b precedent).

STATUS: `ready-for-dev` — ⛔⛔ NO CODE (in ANY part) until Task 0 is done: the Panel's rulings are transcribed ✅ (`-303`, `-304`), the
validate's corrections and BigDev's calls are recorded ✅ (`-305`, `fa2687ce`); OWED: BigDev's answers to PM1–PM25 (Task 0.3) and ONE
author-commit recording them, committed ALONE (Task 0.4 — the next id after `-305`) ([[feedback_governance_commits_precede_implementation]]).
The Panel confirm note (`…-6-27-confirms.md`, CF1–CF5) is ✅ RULED — `2026-10-10-310` (all five as suggested).

⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): the Panel's questions are RULED — Q1 / Q2 (`-303`), Q3–Q8 (`-304`); the
corrections and the CF1 narrowing are recorded (`-305`) and CONFIRMED by the Panel (`-310`: CF1 A, CF2, CF3 (a)–(d), CF4 A, CF5 A). Every PM strips to "the code should do X". ⚠ A PM BECOMES
the Panel's if the build (i) shows a neighbour's answer — or who answered — to the FAMILY or the PUBLIC, directly OR BY PARAPHRASE (the
inspector asks the family open-ended, ⛔ never *"a neighbour said …"* — `-305` §2 item 3; FR-39's *"verifier names are published"* stays
unruled, 11b.3b `verifierName`), (ii) says MORE in the text than the ruled wording (a claim, money, the family, the nominee, who reported
it, a deadline), (iii) lets a neighbour's answer REFUSE a claim or stand in for the ground inspection (FQ9 / FQ10 A), or (iv) lets a
question added through the `-304` chain become a warning or a flag, or adds an alcohol question (CF3 (b), (c)). Traps 1–3 fence all four.

GLYPH REGISTER, ADDRESSING RULE: as 6.24a / 6.24b / 6.25 / 6.29 — `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` =
hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite entry id + clause,
item heading, row key). `file:NNN` is used ONLY for code.
LETTERS: `PM` = this story's build decisions (the author's, PROPOSED — answered at Task 0.3, committed at Task 0.4); `F` = FOUND facts;
`Q1`–`Q8` = the two routing notes' Panel questions; `CF1`–`CF3` = the confirm note's. Foreign letters cited: `NW` / `EA` (6.23a/b,
`-278`), `GI` (6.26, `-282`), `RF` (6.24a, `-292`), `RB` (6.24b, `-295`), `RE` (6.25, `-299`), `RN` (6.29, `-302`), `AL` (6.30). `PM` is
used by ⛔ no earlier story (grepped 2026-10-10).
-->

# Story 6.27a: The Five Neighbours Can Answer — a Versioned Questionnaire in the App and by the Helpline, Saved as They Go, and the District Admin Sees Every Answer `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT STORY 6.27 IS, IN ONE PARAGRAPH.** Story 6.6 (`done`) chooses the five members nearest a member who has died and writes a
> request for each — and ⛔ nothing ever sends it, ⛔ nothing can answer it, so **every claim ends its 72 hours with zero answers**
> (`2026-09-28-263`'s FINDING). Story 6.27 makes the check with neighbours real: each of the five is **texted** with a link and the helpline
> (`-303` Q1 A — 6.27c), answers **a few short questions** in the app or by phoning the helpline, saved as they go (`-304` Q6 A — 6.27a),
> and the District Admin and every later approver **see the answers** (6.27a / 6.27b). Two answers become **warnings** under the ONE rule
> 6.23a built (`-264` FQ12): a neighbour saying the member **has not died**, and a date **more than a day** from the accepted
> certificate's (`-263` FQ10 A) — and one that arrives after the District Admin approved makes the final approval **wait** for the
> District Admin (`-303` Q2 A — 6.27b). The inspector, after completing their own record, is shown only where the family and the
> neighbours DIFFER (6.27d). ⭐ **A neighbour's answer never refuses a claim, and ⛔ never stands in for the ground inspection.**

> ⭐ **THIS PART (6.27a):** the neighbours can answer — the versioned questionnaire engine (v1 and the ruled v2), the database for replies
> and answers (and the ping columns 6.27c will write), the save / submit writer, the member screens and routes (DARK until 6.27c texts
> anyone — PM11), the helpline's recording for a neighbour who phones, and the District Admin's view in the verifier console. ⛔ No text
> is sent, ⛔ no warning is raised, ⛔ no inspector screen changes in this part.

> ⭐ **What already ships and 6.27 READS or EXTENDS — rebuild ⛔ none of it:**
> · **6.6's substrate** — `claim_peer_mesh_selections` / `claim_peer_mesh_pings` (0054), the pure `selectPeerMesh`, the SELECT / WINDOW
>   workers `apps/jobs/src/claim-peer-mesh.ts`, the writer `recordPeerMeshResponse` (`packages/domain/src/claim/peer-mesh-persist.ts:222`),
>   the reads `peer-mesh-read.ts`. The selection is ⛔ not changed (determinism, replay — Trap 8).
> · **6.24b / 6.29's SMS discipline** (6.27c) — `sendClaimDltSms` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:70`) UNCHANGED; 0151 /
>   0155, `packages/domain/src/claim/suspicion-notice.ts`, `apps/jobs/src/scheduler/claim-suspicion-notices.ts` as the DESIGN TEMPLATE.
> · **6.23a / 6.23b / 6.26b's warnings** (6.27b) — `packages/domain/src/claim/approval-warnings.ts`: TWO KINDS added, ⛔ never a rule.
> · **6.10's console** — `assemblePeerMesh` (`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:772-803`) and `PeerMeshView`
>   (`apps/admin/src/modules/claim-verification/SignalsPanel.tsx:158-192`).
> · **6.26a's inspection** (6.27d) — `completeGroundInspection` (`packages/domain/src/claim/ground-inspection-persist.ts:919-1044`), the
>   screen `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`.
> · **10.15's Polls** member route conventions (`apps/api/src/modules/surveys/member-routes.ts:67,83` — ⛔ never its engine: it forbids
>   conditions and locks at publish by design, its LBD-4 / LBD-5) and **6.3's helpline chain** (`apps/api/src/modules/claims/claims.helpline.routes.ts`).
> · **Row 6-30** (6.30) — the app-link plumbing 6.27c consumes: `APP_LINK_PATHS` (a JSON data file in `packages/contracts/src/app-links/`),
>   `buildAppLinkUrl`, the shared validator `resolveHttpsOrigin`, and a THIN ROUTE SHELL `apps/mobile/app/(peer-request)/peer-request.tsx`
>   that 6.27a FILLS (PM11).

> ⚠⚠ **SEVEN FACTS — read before anything else.**
> 1. ⭐ **Members cannot be notified in the app** — ⛔ no device token is ever registered (`apps/mobile/lib/push-notifications.ts` has
>    ⛔ no importer), ⛔ no member inbox; the app still carries the P0 prototype identity and reads ⛔ no incoming URL. ⇒ the five are
>    reached by a TEXT with a link (6.27c), the app shows requests by PULL, and the helpline is the second way in. Row 6-30 builds the
>    link plumbing; it does ⛔ not decide the app's production identity — that stays BigDev's decision (D-13 / PRD OQ-1, `-305` §2 item 5).
> 2. ⭐ **The Panel has ruled everything 6.27 asks of a person:** the text and its reminder (`-303` Q1 A), the language rider (`-303`;
>    narrowed for a time by `-305` §2 item 2 ⇒ CF1), the late wait (`-303` Q2 A), the questions (`-304` Q3–Q6), and who changes them
>    (`-304` Q7 / Q8 — the Panel's own chain).
> 3. ⚠⚠ **Today a reply is refused the moment it matters.** `recordPeerMeshResponse` throws `PeerMeshClaimNotInVerificationError` once
>    the claim leaves `verification_in_progress` and `PeerMeshWindowResolvedError` once the 72 hours resolve (`peer-mesh-persist.ts:222-279`)
>    ⇒ PM8 widens the acceptance to every state in which an approval is still to come.
> 4. ⚠⚠ **"More than a day" cannot be one index comparison.** The warning module never decrypts (fence:
>    `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts:345-353`); 6.26b compares dates as keyed-INDEX EQUALITY
>    (`deathDateComparison`, `approval-warnings.ts:204-223`). ⇒ PM7 stores the keyed indexes (`text`) of the neighbour's date AND the day
>    before AND the day after; 6.27b's key is present ⇔ the accepted certificate's index is none of the three.
> 5. ⚠ **The 6.6 reply vocabulary conflates two answers** (`response: confirmed | denied | unknown`, `packages/domain/src/claim/events.ts:157-161`)
>    ⇒ the questionnaire separates *"they have not died"* from *"I don't know"*, and maps onto the event so that `denied` ⇔ *"has not
>    died"* ONLY.
> 6. ⚠⚠ **`@twt/domain` cannot import `@twt/contracts`** (`packages/domain/package.json` has ⛔ no `@twt/contracts`; contracts depends on
>    domain; the RN bundle boundary, `packages/contracts/src/index.ts:164-165`) ⇒ the questionnaire ENGINE lives in a pure, pg-free DOMAIN
>    module; contracts mirrors only the wire shape, with a test-only lockstep (the `APPROVAL_WARNING_KINDS` pattern) — PM23.
> 7. ⚠ **The app has ⛔ no language setting** (`LocaleProvider`, `packages/i18n/src/react.ts:30-40`, an in-memory state mounted with ⛔ no
>    initial locale at `apps/mobile/app/_layout.tsx:92` ⇒ always `hi`; ⛔ no `setLocale` call anywhere in `apps/mobile`) ⇒ texts go in the
>    Pariwar's default language until row `6-35-in-app-language-switch` lands (`-305` §2 item 2; PM22).

## Story

As **one of the five members the Trust asks about a reported death** —
I want **to answer a few short questions in a minute, in the app or by phoning the helpline, with every answer saved as I go**,
so that **the Trust hears from people who knew the member before it pays a family —**

and as **the District Admin** —
I want **to see each neighbour's answers on the claim**,
so that **I can weigh them beside the ground inspection — ⛔ never as a reason to refuse a family on a neighbour's word alone.**

## The rulings 6.27 builds (shared by 6.27a–d)

| Ruling | Key (verbatim, abridged) | Status |
|---|---|---|
| `-263` FINDING + Consequence 2 | 6.6's requests are ⛔ never sent, ⛔ cannot be answered, staff ⛔ cannot see answers ⇒ row 6-27: *"send the five requests (the wording, en + hi), a reply screen for the five, record replies through `recordPeerMeshResponse`, show them to staff …, and FQ8 E, with FQ10's warnings"* | ⚠ a recorded FINDING and an author consequence INSIDE a Trustee-ratified entry — the Panel ruled FQ9–FQ11 |
| `-263` FQ10 A | the check with neighbours is a SIGNAL, ⛔ not a gate; *"a reply of 'they have not died', or a date that differs (FQ8 E), is shown to the District Admin as a warning"*; *"the neighbours can ⛔ never block a claim on their own"* | ⭐ Trustee-ratified |
| `-262` FQ8 E | the five are also asked *"If you know, on what date did they die?"*; the District Admin is shown answers that differ from the certificate by **more than a day** | ⭐ Trustee-ratified |
| `-264` FQ12 | ONE rule for every warning — incl. the neighbours' date and *"a neighbour saying the member has not died"* | ⭐ Trustee-ratified |
| `-277` Q2 C / Q3 B | every approver gives a reason and a note; a late warning makes the final approval wait for the District Admin | ⭐ Trustee-ratified |
| `-261` C3 | the true nominee's refile inherits the ground inspection — *"and nothing else carries over (… the checks with neighbours …)"* | ⭐ Trustee-ratified ⇒ ⛔ no inherited neighbour key (Trap 7) |
| `-279` A6 + Consequence 2 | a new warning kind enters the wait only by a decision; row 6-27 *"decides or routes that"* | author-commit ⇒ **DISCHARGED** by `-303` Q2 A (its Consequence 1) |
| **`2026-10-10-303`** Q1 A | each of the five is texted, naming the member, with a link and the helpline, ⭐ **plus one WhatsApp reminder after 48 hours** to those who have ⛔ not answered and chose WhatsApp (row 6-31); ⭐ **rider:** *"Send Text in Hindi to those whose preferred langauge is Hindi and in English to those whose preferred language in English"* | ⭐ Trustee-ratified |
| **`2026-10-10-303`** Q2 A | a neighbour's late warning makes the final approval wait for the District Admin's reason and note — ⛔ never a refusal; ⛔ no answer is taken once the final approval has been given | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q3 A | neighbours are asked *"How did they die?"* — *"shown to staff **as context only — ⛔ never a warning, ⛔ never a flag on its own**"*; *"the **inspector asks the family the same question**, so the inspector is shown only where the two differ"* | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q4 A | after *"illness"*, *"Do you know which illness?"* — *"**context only, ⛔ never compared automatically with the member's medical declaration; counsel confirms the legal basis before go-live**"*; the inspector asks the family the same | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q5 A · Q6 A | ⛔ no alcohol question · the text says *"a few short questions"* (amends `-303`'s "two"), three questions added, and the closing note as put | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q7 / Q8 | *"Pariwar Admin proposes, State Trustee proposes/approves with/without modification. Super Admin make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make it live. No additional Permission required for Superadmin."* — for the neighbours' AND the inspector's questions | ⭐ Trustee-ratified (the Panel's own chain — ⛔ not our reading) — row 6-33 builds it |
| `-303` reading (*"preferred language = the language chosen in the app … shown to the Panel"*) | — | ⚠ OVERTAKEN: never shown; the app has ⛔ no language choice (`-305` §1 (a), (b)); the "TWO questions" part overtaken by `-304` Q6 A |
| **`2026-10-10-305`** | corrections §1 (a)–(c); calls: the four-part split; texts in the Pariwar's default language until row 6-35 (⚠ a temporary narrowing ⇒ CF1); the inspector asks the family open-ended; the text goes while an answer can still be taken; rows 6-34 / 6-35; roster Rows 27 / 28 / 29 reserved | author-commit (BigDev) |
| `-304` readings (CF3) | EVERY ruled question (the seven v2 keys) is in every `peer_mesh` version from v2 onward (v1 exempt); a chain-added question is ⛔ never a warning or a flag; an alcohol question needs Q5 superseded first; every health question needs counsel's basis before it is shown — ⇒ the TEXTS themselves wait for Row 27 (f); a health question added LATER through the chain HOLDS that Pariwar's texts until its `counselBasis` is recorded (6.27c AC2b; ⚠ a cost row 6-33 must state) | ⭐ Trustee-ratified — `2026-10-10-310` CF3 (a)–(d); the VALIDATOR enforces them (PM23) |
| `-282` GI7 · `-281` Q1 B | the two precedents for a kind entering the wait | precedent |
| `-295` RB4 / RB5 / RB11 / RB12 / RB16 · `-302` RN2–RN8 | one send core, ⛔ never copied; the mode-resolved name or `no_target`; go-live rows; a held config never uses up the slot; the deadline-word deny-list; 0155's backstops | author-commit — the TEMPLATE (6.27c) |
| `-292` Consequence 4 · `-282` Consequence 4 | rows 6-24 / 6-25 / 6-27 share the gate and writers — *"whichever lands second rebases; ⛔ none drops another's check"* | ⭐ every sibling is `done` ⇒ 6.27 rebases onto all; row 6-28 (one payment per death) joins the list (Trap 5) |

**⛔ Not covered by any ruling (stays open, ⛔ not built here):** whether the family or the public ever sees who answered or what they said
(FR-39 / FR-77 — unruled, 11b.3b `verifierName`); FR-39's *"non-response after 72 hours → escalate to block admin"* (⛔ not built, ⛔ not
superseded — PM19); what an approver must weigh under a neighbour's warning; counsel's legal basis for health information from neighbours
(`-304` "does NOT cover" — Row 27 (f)) and from the family (row 6-32's own row); Meta's approval of the WhatsApp wording (`-303` — row 6-31);
the Hindi of staff-added questions (`-304` — our reading: a person reviews it before it goes live); whether a Pariwar's version may drop a
ruled question (`-304` — our reading ⛔ no, CF3 (a)); whose data an answer is on the RESPONDER's side, for erasure (PM17).

⚠ **HISTORICAL — the "Re-plan by answer" branches of v1.0–v1.9** (Q1 B/C/D, Q2 B/C) are ⛔ no longer live: the Panel took Q1 A and Q2 A.
They are kept only in the git history of this file.

## ⭐ THE INVARIANTS (shared)

1. **A neighbour's answer never refuses a claim and never replaces the inspection.** Each warning kind (6.27b) is a condition on the FORM
   of an approval (a reason + a note) or a WAIT; ⛔ never a denial, ⛔ never a gate conjunct, ⛔ never read by `assertGroundInspectionCompleteForApproval`.
2. **ONE rule, ONE derivation** — two kinds; the assertion is ⛔ never edited (NW1); both warning readers share the pure derivation and ONE
   SQL fragment that selects codes and indexes only.
3. **⛔ No decrypt in the warning module** — keyed indexes and plaintext codes only.
4. **The selection is ⛔ not changed.** A peer 6.27c will ⛔ not text is recorded as such on its ping, ⛔ never replaced.
5. **Texted at most once; ONE reply per ping; answers editable until Submit, then locked; every change kept.** At-least-once delivery is
   RECORDED, ⛔ not hidden (RB3); an edit appends a row and stamps the old one superseded.
6. **⛔ No PII in an event, a log, an alarm, an audit row or a `detail`** — the date, the cause and the illness are Tier-1; the link code is
   treated like a number; audit carries codes and counts only (NW12, GI14).
7. **Who sees the answers** (PM13, PM24, PM25; corrected by `-305` §1 (c), confirmed in CF2): the District Admin (and the district's
   verifiers) — every answer for their district; whoever approves the claim at a later step — in v1 a **Pariwar Admin acting as
   Trustee-Lite** (the final vote, an R9 vote, the escalation, the no-correction approval) or the **Super Admin** (G1) — every answer, for
   that claim at that step only; the INSPECTOR — ⛔ nothing before completing their own FULL visit's record, then only THAT the family and a neighbour differ, per question —
⛔ never the neighbour's answer itself, ⛔ never who (6.27d); the
   HELPLINE OPERATOR — only the answers of the neighbour on the phone, while recording. ⛔ NEVER the family (directly or by paraphrase),
   the claimant, the nominee, the other neighbours, any other member, or a public page (Trap 1).
8. **An unknown is ⛔ never shown as "no warning"** (6.18's fail-closed rule): a failed warnings read makes each answer's warning flag
   `null` (*"could not be checked just now"*), ⛔ never `false`; a failed decrypt shows *"could not be shown just now"*, ⛔ never a blank.
9. **Every lock is taken in ONE order: the claim row, then the ping row, then the reply row** (PM7 (b)) — the order 6.26a's writers use
   (assignment → claim → …) never meets it in reverse. ⭐ `recordPeerMeshResponse` takes the claim lock ITSELF (`lockClaimCase`) before its
   ping lock — STRUCTURAL, ⛔ never a caller convention. ⛔ No KMS inside any of these locks: every encrypt and keyed index is computed in
   the HANDLER first, and the domain writer receives ciphertext and indexes (Trap 9).

## 📜 Policy meaning (AI-10-1)

⭐ **Story 6.27 ADDS two conjuncts to an existing benefit-gating predicate** (the approval-warning rule — built by **6.27b**) — conjuncts
on the FORM an approval must take (a reason + a note) or a WAIT, ⛔ never a conjunct of the approval GATE (Invariant 1, Trap 3). In the
member's terms:
- **P1 (`peer_says_not_died`):** *"If one of the members the Trust asked about a death answers that the member has not died, anyone
  approving the family's claim must choose a reason and write a note; and if that answer arrives after the District Admin approved, the
  claim waits until the District Admin has done so — a neighbour's answer never refuses the claim."* — `-263` FQ10 A + `-264` FQ12 +
  `-303` Q2 A: ✅ consistent.
- **P2 (`peer_death_date_differs`):** *"If one of the members the Trust asked gives a date of death two or more days away from the date on
  the certificate the Trust accepted, anyone approving the family's claim must choose a reason and write a note, with the same wait —
  never a refusal."* — `-262` FQ8 E + FQ12: consistent; ⚠ *"two or more days"* is OUR reading of *"more than a day"* (disclosed to the
  Panel in the first routing note's "ours" list).
- **6.27a adds ⛔ no predicate:** it lets neighbours answer and lets the District Admin SEE; PM8 changes WHEN a neighbour may answer, ⛔ not
  who may be paid. **6.27c adds ⛔ no predicate** (who is texted changes ⛔ nothing about who may be paid). **6.27d adds ⛔ no predicate**
  (the inspector's discrepancy screen asks a question; it gates ⛔ nothing).
- **Q3 / Q4 (the cause of death, the illness) add ⛔ no predicate** — ✅ ruled A (`-304`), verbatim: Q3 *"shown to staff as context only —
  ⛔ never a warning, ⛔ never a flag on its own"*; Q4 *"context only, ⛔ never compared automatically with the member's medical declaration;
  counsel confirms the legal basis before go-live"* — ⚠ OUR reading adds that neither creates a WAIT; and a question added later through the chain is ⛔ never a warning or a flag either — the VALIDATOR refuses it (PM23 (a)), so the
  chain can ⛔ never create a benefit-gating predicate (CF3 (b)).
- **Niyamavali check:** §6.2 (*"The Trust verifies the qualifying event …"*) — consistent; ⛔ no clause mentions neighbours or the peer
  mesh (grepped `docs/legal/niyamavali.md` 2026-10-10); §5.1 / §5.5 / §5.6 (cause of death, suicide / murder, concealment) are ⛔ never read
  by any 6.27 comparison (PM25 fence); the Niyamavali is ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (shared; each ⇒ the PM it feeds; verified at `5946e411` code)

**6.6's substrate:**
- **F1 — the five are opaque member ids.** `selected_member_ids uuid[]` (CHECK `cardinality <= 5`); one `claim_peer_mesh_pings` row per
  (selection, member) — `ping_id`, `selection_id`, `pariwar_id`, `member_id`, `message_key` (default `'peer_mesh_verification_request_v1'` —
  the constant `schema/claim_peer_mesh_pings.ts:31`, the column default `:56`), `constructed_at`; `UNIQUE (selection_id, member_id)`; ⛔ no dispatch columns (0054 `:64-72`) ⇒ PM4.
- **F2 — the delivery columns are PRE-AUTHORISED here** (`schema/claim_peer_mesh_pings.ts:8-13`, D1); its *"There is still NO live
  `dispatch()` caller anywhere"* (`:9-10`) is STALE (`contribution-notify.ts:246`, `claim-correction-reminders.ts:597`) ⇒ PM4, PM18.
- **F3 — "nearest" = same latest posting district, then nearest `created_at`, then `member_id`** (`peer-mesh-metric-registry.ts:65,113`);
  candidates = every `members.state='active'` member except the deceased and the claimant (`peer-mesh-read.ts:77-105`; the
  correlated-subquery comment ~`:60-75` — ⛔ never "simplify" it, [[project_epic6_drizzle_correlated_subquery_bug]]). A suspended member CAN be
  chosen (`member/moderation/index.ts:22`); a member who has died stays `active` ([[project_death_is_an_overlay_not_a_state]]) ⇒ PM1.
- **F4 — the window runs from SELECTION** (`apps/jobs/src/claim-peer-mesh.ts:46,226`; `boot.ts:172-176`); the WINDOW worker resolves
  `sufficient` (≥ 3 distinct responders, `:49`) or `insufficient_responses_fallback` (monotonic), counting responders by the PAYLOAD's
  `responder_member_id` (`peer-mesh-read.ts:212-219`) — so a helpline-recorded answer counts the neighbour ⇒ PM6, PM12.
- **F5 — `claim.peer_mesh_pinged` is the ONLY edge into checking** (`state.ts:131-133`) and 6.19d's day-0 anchor (CR3,
  `certificate-reminder.ts:132-169`) ⇒ PM5, PM14 (⛔ never a second pinged event).
- **F6 — the SELECT worker takes injected hooks** — the 6.12 shepherd precedent: the call `claim-peer-mesh.ts:346-356` (also on the
  idempotent no-op branch, `:341-356`), boot wiring `boot.ts:483-505` (`enqueueShepherdAssign` at `:491`); the select result carries ⛔ no
  ping ids (`:310-319`) ⇒ PM5.
- **F7 — `recordPeerMeshResponse`** (`peer-mesh-persist.ts:222-279`): a raw `pg.PoolClient`; refuses ⛔ no selection, a non-selected
  responder, a resolved window, a claim ⛔ not in `verification_in_progress`, a second answer (`SELECT … FOR UPDATE` on the PING row only,
  `:245-253`); hard-codes `from_state` / `to_state` = `'verification_in_progress'` (`:262-263`) and `actor: 'member'`, `actorId` =
  responder (`:276`); then `projectClaimState` reads the stream head, inserts `eventVersion = head + 1` and UPDATEs `claims.current_state`
  ⇒ PM7, PM8 (⚠ the lock-order hazard — F31).
- **F8 — the event payload** `requireIdentityTransition({ ...auditShape, responder_member_id, response })` (`events.ts:157-161`; `auditShape`
  `:82-92`; `requireIdentityTransition` `:98-103` refines only `from_state === to_state`; `claimActorSchema` admits `'operator'`, `:61`) ⇒ PM7, PM12.
- **F9 — the operator affordances exist only as functions** (`claim-peer-mesh.ts:458-478`; `peer-mesh-persist.ts:325-375`) ⇒ PM19.
- **F10 — a refile gets a FRESH selection** — usually the SAME five ⇒ PM1, Trap 7.
- **F11 — the zero-candidate stall** (`claim-peer-mesh.ts:249-264`) ⇒ PM20.

**6.10's console:**
- **F12 — the transcript has ⛔ no outcome, window, skip reason, name, time or date** (`packages/contracts/src/claims/verifier-console.ts:150-187`);
  the UI prints raw UUIDs (`SignalsPanel.tsx:158-192`); `verifierAnnotations` hard-coded `not_available_yet` (handlers `:797`; a `present`
  variant REJECTED by `packages/contracts/tests/claims-verifier-console.test.ts:247`); `VERIFIER_CONSOLE_MAX_READS = 21` (handlers `:187`);
  `VerifierConsolePacket.peerMesh` is REQUIRED (`verifier-console.ts:475`, variants `present | empty | unavailable`) ⇒ PM13, PM25 (c).

**The warnings machinery (6.23a / 6.23b / 6.26b):**
- **F13 — the kinds list and its pin.** `APPROVAL_WARNING_KINDS` (`approval-warnings.ts:100-113`); pinned by
  `packages/domain/tests/claim/approval-warnings.test.ts:56-68` with a GENERIC message (`:59-60` — *"its producer row decides or routes that
  before extending this list"*; the row-6-27 mention is in the module header, `approval-warnings.ts:16-17`); contracts mirror
  `verification-decision.ts:128-137`, lockstep `packages/contracts/tests/claims-verifier-decision.test.ts:225-229` ⇒ PM9.
- **F14 — two readers, one pure derivation** (`:427`, `:567`, `:579`, `BULK_READ_SLICE` `:551`, `deriveClaimApprovalWarnings` `:737-806`;
  `deathFactColumnsSql()` `:372-418`; the pattern helper `deriveDeathFactWarningKeys` `:248`; `current_accepted_date_index` is `text` on
  `RawWarningsRow`) ⇒ PM9.
- **F15 — lateness is set membership, ⛔ never a timestamp** (`lateWarningKeys` `:930-933`): a key present at approval is covered for
  good ⇒ the SUBJECT is a ruling-sized choice (6.26b Trap 16) ⇒ PM9 keys each kind by the LIVE `answer_id` — a changed answer is a NEW key.
- **F16 — the wait has ⛔ no per-kind filter** (`:816-830`, `:893-903`) ⇒ a new kind enters the wait by construction (`-303` Q2 A rules it).
- **F17 — the correction queue's late arm** (`correction-queue-read.ts:155-187`; scan states `:53`; the R9 arm `:245`) ⇒ PM10.
- **F18 — the gate order** (`nominee-name-check.ts:403-435`, the wait at `:434`) ⇒ ⛔ no new conjunct.
- **F19 — the cycle-freeze commit ⛔ never re-reads warnings** (`commitCycleFreeze`, `state-trustee-decision-persist.ts:1244`, comment
  `:1325`) ⇒ PM8 closes acceptance at the final vote (`state_trustee_freeze → state_trustee_approved`, `:584,643`) — EXCEPT
  under a live R9 routing, where R9 finalize still runs the gate (PM8's answer window).
- **F20 — the revise lock** (`verifier-decision-persist.ts:668-673` — a revise is refused when `warnings.coverage.records.length > 0 ||
  warnings.kinds.length > 0`) ⇒ ANY current neighbour key (⛔ not only a late one) makes the District Admin's approval unrevisable —
  RECORDED, ⛔ not changed.
- **F21 — a late DATE key is reachable through a certificate re-review** (`-289` L5(f)); the queue's determination arm already fires (GI7).
- **F22 — the console's kind words are typed** (`apps/admin/src/modules/claim-verification/i18n-en.ts:138-150`; renderers
  `VerificationDecisionStrip.tsx:342,427`, `LaterApprovalWarnings.tsx:89`; `apps/admin/tests/verifier-console.test.tsx:396` forbids a date);
  the admin console is English-only ⇒ PM9, PM13.

**Sending, mobiles, the app, the API, the gates:**
- **F23 — the send core** (`claim-dlt-sms-send.ts:70`, classification `:110-125`; `INVALID_ARGUMENT` is final `error` + alarm since 6.29,
  `:85-91`) ⇒ PM2, PM16.
- **F24 — 0151 is the wrong home** ⇒ PM4 puts the record on the ping row.
- **F25 — a member's mobile:** `member_identities.mobile_ciphertext` (`schema/member_identities.ts:45`), `waOptIn.getMemberMobileCiphertext`
  (`wa-opt-in/read.ts:118`), `decryptMobile` (`encryption/member-fields.ts:137`), `normalizeMobile` (`:92`); erasure writes an ENCRYPTED
  sentinel (`member/anonymize.ts:77,156`); `resolveSmsTarget` (`notifications/delivery.ts:157-175`) does ⛔ not normalise; the number hash is
  `claim.correctionNumberHash` (`claim/correction-crypto.ts:58`) ⇒ PM1, PM13.
- **F26 — members have ⛔ no locale column**; 6.24b sends (a)/(b) in `hi` (`claim-suspicion-notices.ts:92-95`) ⇒ PM22.
- **F27 — member route conventions:** `requireMemberSession` (`auth/shared/member-session-guard.ts:25`), a `perMemberKey` budget
  (`helpdesk/member-routes.ts:50`), each handler opens its OWN `openScopeTx` (`modules/multi-tenant/scope-tx.ts:34`), a path `pariwarId`
  that is ⛔ not the session's ⇒ 404 (`helpdesk/member-handlers.ts:261-273`), writes inside `audit.withCompensatingAudit` ⇒ PM11.
- **F28 — the helpline chain** `[requireAdminSession, scopeResolutionHook, requirePermissionHook('claim.file'), requireStepUp('claim_file')]`
  (`claims.helpline.routes.ts:88-91,103`); every 6.3 helpline route is under `/api/v1/p/:pariwarId/admin/claims/…` ⇒ PM12.
- **F29 — the go-live roster ends at Row 26**; Rows 27 / 28 / 29 are RESERVED (`-305` §4); the DLT sheet carries templates 1–12 ⇒ PM16.
- **F30 — `@twt/domain` cannot import `@twt/contracts`** (SEVEN FACTS #6) ⇒ PM23.
- **F31 — the lock-order hazard.** Every approval writer locks the CLAIM row first, then appends; `recordPeerMeshResponse` locks the PING
  first, then appends (`project.ts` ~`:107-125`) ⇒ under PM8's widened window a reply racing an approval can (i) collide on `eventVersion`
  (`ClaimStreamConcurrencyError` — an approver told "already updated" because a neighbour answered), (ii) deadlock (`40P01`, unmapped ⇒ 500),
  (iii) commit after the approval read its warnings while `saved_at < v.decided_at` ⇒ late but ⛔ never listed by the queue. ⇒ PM7 (b) /
  PM8: CLAIM first, then ping, then reply.
- **F32 — the app has ⛔ no language setting** (SEVEN FACTS #7) ⇒ PM22.
- **F33 — who approves, by key** (corrects v1.6's FOUND — `-305` §1 (c)):

  | Approval | Step | Gate key |
  |---|---|---|
  | District Admin | `district_admin_approval` | `claim.approve`, district (`claims.verification-decision.routes.ts:92`) |
  | Final vote | `final_vote` | `cycle.freeze`, pariwar (`claims.cycle-freeze.routes.ts:36,55`) |
  | Escalation resolution | `escalation_resolution` | `cycle.freeze` (`resolveEscalation`, `claims.cycle-freeze.handlers.ts:513`) |
  | No-correction approval | `no_correction_approval` | `cycle.freeze` (`claims.correction-closure.routes.ts:184-188`) |
  | R9 vote / finalize | `r9_vote` | `claim.r9_vote`, pariwar (`claims.r9-voting.routes.ts:53`) |
  | Super Admin G1 | `super_admin_approval` | `claim.decide_escalated_closure`, pariwar (`claims.correction-escalation.routes.ts:61`) |

  `cycle.freeze` and `claim.r9_vote` are held by `pariwar_admin` (`packages/domain/src/rbac/roles.ts:386,395`); `state_trustee` holds
  neither (`:472-478`); `super_admin` holds every key ⇒ PM24.
- **F34 — the mobile Turnstile token is a placeholder** (`apps/mobile/lib/turnstile.ts:14-16`, *"a real production verifier rejects the
  placeholder"*) ⇒ PM11 drops Turnstile from the peer-request routes.
- **F35 — gates a new file trips:** the claims human-actor invariant (`scripts/claim-adjudication-human-actor-invariant/check.ts:276-290` —
  every `apps/api/src/modules/claims/*.routes.ts` in exactly one of `COVERAGE_SET` / `NON_ADJUDICATION_ROUTES` / `ENROLMENT_OWED`); forced
  pagination (`apps/api/tests/integration/forced-pagination.spec.ts` — every collection GET declares a bounded `limit`); the friction budget
  (`scripts/friction-budget/lib.ts:453`, `MEMBER_FACING_PREFIXES` incl. `apps/mobile/`); the microcopy scan scope (`microcopy.yaml`); the
  decrypt fence's `FENCED_FILES` pin `toBe(41)` (`nominee-name-no-comparison-fence.test.ts:174`) and the import-discipline entries
  (`approval-warnings.test.ts:358-365`); the rtbf completeness pin (`packages/domain/tests/member/rtbf-anonymize.test.ts:121` — *"exactly the
  NINETEEN member-PII tables"*) ⇒ Tasks.
- **F36 — 0054 grants `SELECT, INSERT, UPDATE` on `claim_peer_mesh_pings` table-wide** — a column-level GRANT cannot narrow it; nothing
  UPDATEs pings today (`persistPeerMeshPingIntents` uses `onConflictDoNothing`, `peer-mesh-persist.ts:117`) ⇒ PM4.
- **F37 — the erasure precedent** for a locked, Tier-1 claim column is **0143 + 0149** (6.23a NW13 / 6.26b): a column-level UPDATE grant,
  per-command policies (`0143:73-76`; `-279` A12: *"without the policy the scrub matches 0 rows under FORCE"*), and a mutation trigger in
  0143's form — `IF (to_jsonb(NEW) - '<the scrubbable column>') IS DISTINCT FROM (to_jsonb(OLD) - '<…>')` — that freezes every OTHER column;
  0149's own header records *"The trigger cannot tell the RTBF scrub from any other writer"* (the sentinel is a FRESH Tier-1 envelope each
  time — `encSentinel` → `encryptTier1`, `member/anonymize.ts:120-131` — so ⛔ no trigger can recognise it). ⚠ `member/anonymize.ts:255-292`
  (the `claim_ground_inspections` scrub, GI13) is the SCRUB statement's shape (`WHERE … IS NOT NULL`), ⛔ not a grant / policy / trigger
  triple — it rides 0055's table-wide grant and a `FOR ALL` policy ⇒ PM7 (a), PM17.
- **F38 — reuse, ⛔ never hand-roll:** `addCalendarDays` (`packages/domain/src/cycle-calendar/holiday-resolver.ts:187`) and
  `isRealCalendarDate` (`packages/domain/src/claim/nominee-determination-persist.ts:71`). ⚠⚠ The latter lives in a pg / event module
  (imports `drizzle-orm`, `../db.js`, `./events.js`, `./nominee-name-check.js`, `./project.js`) ⇒ importing it from the pure questionnaire
  module would break the NW1 transitive import test (`approval-warnings.test.ts:338-368` forbids reaching `claim/events.ts`,
  `claim/nominee-name-check.ts`, `claim/nominee-lock.ts`) and close a runtime cycle approval-warnings → questionnaires →
  nominee-determination-persist → nominee-name-check → approval-warnings ([[project_type_only_import_cycle_trap]]) ⇒ Task 1 EXTRACTS it into
  the import-free leaf `cycle-calendar/holiday-resolver.ts` (already on approval-warnings' safe-leaf list, beside `addCalendarDays` and
  `istDateOf`), re-exported from `nominee-determination-persist.ts` with the same identity ⇒ PM7 (b), PM23.
- **F39 — tests and callers PM7 / PM8 change:** `apps/jobs/tests/claim-peer-mesh.test.ts:586-620` asserts
  `rejects.toBeInstanceOf(claim.PeerMeshWindowResolvedError)` after the window resolves (and the `verification_in_progress` guard's error is
  asserted too) — PM8 INVERTS them; `recordPeerMeshResponse` is called without an `actor` by the jobs test (`:373+`) and by
  `apps/api/tests/integration/claims/verifier-console.spec.ts:194`, `verifier-console-shape.spec.ts:198` ⇒ `actor` DEFAULTS to `'member'`.
- **F40 — audit and list gates:** a staff READ is audited through `emitAuthAudit(deps, request, '<event>', …)` (the console's precedent,
  `claims.verifier-console.handlers.ts:1081`), and a new event must join the closed `AuthAuditEventType` union (`apps/api/src/audit/audit-sink.ts`);
  a direct `audit.writeAuditEntry` under `apps/api/src/modules/claims/` trips access-wrapper-invariants (3)
  (`scripts/access-wrapper-invariants/check.ts`, CLAIM_ROOTS); every new DOMAIN list read takes `clampLimit` (the domain-accessor-invariants
  gate — [[project_domain_limit_clamp_and_savepoint_retry]]) ⇒ PM11, PM12, PM13, PM24.
- **F41 — the optional console field breaks typed consumers:** `apps/admin/src/modules/claim-verification/SignalsPanel.tsx:269`
  (`packet.peerMesh.status`) and typed specs (`apps/api/tests/integration/claims/verifier-console-shape.spec.ts:425,488`) fail tsc once
  `peerMesh` is optional; the contracts tests (`claims-verifier-console.test.ts:143,236,242`) are outside tsc ⇒ PM25 (c), Task 7.

## ⚖️ Build decisions PM1–PM25 (shared record; PROPOSED — answered by BigDev at Task 0.3, committed by ONE author-commit at Task 0.4)

- **PM1 [c] — who is texted: the five chosen by row 6-36's rule (`2026-10-10-306`, `-307` — colleagues at the deceased member's WORKPLACE,
  school or office, and the previous one after a transfer within 90 days; otherwise the up-to-3 "people who know me" the member named and who
  accepted; otherwise ⛔ no one; ⛔ never the district; possibly fewer than five — `-310` CF4 A) through 6.6's engine, minus those the Trust must ⛔ not text — ⛔ never replaced.** At the child's locked
  re-check (PM5 (iv)) a ping is finished `no_target` with a fixed detail when its member: is ⛔ not `members.state = 'active'`
  (`no_target:peer_not_active`); has ANY claim filed naming them as the deceased (`no_target:peer_reported_deceased` — ⚠ includes a claim
  wrongly filed against a living member, who is locked by 6.20 until row 6-22's release (`-238`); the exclusion STAYS even after such a
  release — a known residual, with a pointer on row 6-22, Task 9.4); has an erased or unresolvable mobile after decrypt → `normalizeMobile`
  (`no_target:no_sendable_number`). The selection, its ping rows and FQ10's 3-reply count are ⛔ not changed; ⛔ no sixth member is chosen.
  ⚠ RECORDED: the deceased's family who are themselves members (other than the claimant) are ⛔ not excluded — the Trust has ⛔ no
  family-link data. ⚠ A refile texts the same five again for the same death (F10) — expected.
- **PM2 [c] — one DLT text per ping, through `sendClaimDltSms` UNCHANGED** (RB4), with a sibling registry
  `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts` (the `suspicion-notice-sms-templates.ts` shape); ⛔ not `SMS_DLT_TEMPLATE_REGISTRY`,
  ⛔ not `dispatch()`, ⛔ no `AlertCategory`. Config keys `sms.dlt.template_id.peer_mesh.request.<locale>` (⚠ dotted — PM16); the helpline
  slot is the per-Pariwar key the core already resolves (F23).
- **PM3 [c] — what the text says.** Copy key `peer_mesh_sms.request` in `packages/i18n/locales/{en,hi}/claim.json` (+ `$comment.peer_mesh_sms`
  in BOTH: NOT-YET-HUMAN-REVIEWED + *"must match the registered DLT content byte for byte"*, RB1's form). en, as ratified (`-303` Q1 A,
  amended by `-304` Q6 A): *"We have been told that {member} has died. If you knew them, please answer a few short questions: {link} — or
  call the helpline {helpline}."* — ⚠ the routing note's *"TWT:"* prefix is DROPPED (the DLT header names the sender): an AUTHOR reading,
  recorded in Task 0.4, ⛔ never more words. hi: agent-authored afresh for *"a few"* — ⛔ NEVER copied from the `-303` routing block's draft
  (its *"दो छोटे प्रश्नों"* says "two"); human review = Row 28. Typed DLT variables (row 6-34 retags every template; these two are
  registered typed from the start): `{member}` = `{#alphanumeric#}` (≤ 40 characters — ⚠ whether it accepts Devanagari with spaces is
  UNCONFIRMED: ask the provider at registration; a name that cannot fit ⇒ `no_target:name_too_long`, ⛔ never a truncated name — with a
  test; ⚠ an AUTHOR reading recorded at Task 0.4: it narrows `-303` Q1 A at the edge — a name the template cannot carry means that claim's
  five are ⛔ not texted — told to the Panel as an FYI in the confirm note; the provider's answer on Devanagari is a Row 27 evidence line), `{link}` = `{#url#}`, `{helpline}` = `{#cbn#}`. ⚠ Hindi is Unicode — likely THREE segments per text (the cost the Panel saw).
  `{member}` = the Pariwar's mode-resolved name (`-181`; `notifications.resolveMemberFacingDeceasedName`, `notifications/pool-identity.ts:141`),
  read once per child OUTSIDE the claiming transaction; erased / unresolvable / ⛔ no KYC name ⇒ `no_target:name_<reason>` (RB5). ⛔ No claim,
  money, family, nominee, claimant or reporter; ⛔ no deadline word (S4 / T6 — RB16). D33 carve-out recorded (this registry names the member
  because the ruled text does). The LANGUAGE: PM22.
- **PM4 [a: columns + structural CHECKs · c: the grammar CHECK, the builder and the writers] — the delivery record on
  `claim_peer_mesh_pings` (F2), adapted from 0151 / 0155** (⛔ never mirrored literally: 0151 INSERTs a row at begin; here the record lives on an
  EXISTING ping row whose `send_outcome IS NULL` means "⛔ not yet begun"). **6.27a's migration** adds `send_outcome text NULL` (else one of
  0138's values EXCEPT `recorded` — meaningless for a text; CHECK), `attempt_count INT NOT NULL DEFAULT 0` (0 until begin; ≥ 1 after — CHECK `(send_outcome IS NULL) = (attempt_count = 0)`), `claimed_at`,
  `claimed_by_job`, `aging_since`, `parked_at`, `detail`, `first_detail`, `provider_message_id`, `recipient_number_hash`, `send_updated_at`,
  `locale_source` (PM22 — `'pariwar_default'` today; CHECK), `link_code` (PM21 (a)); the STRUCTURAL CHECKs only — `detail` /
  `first_detail` ≤ 200; `attempting` ⇒ `claimed_at` and `claimed_by_job`; `claimed_by_job = 'sweep:held'` ⇔ `parked_at`; a finished-row
  trigger (a finished `send_outcome` is ⛔ never rewritten; `aging_since` forward-only; `link_code` written once); ⭐ **`REVOKE UPDATE ON
  claim_peer_mesh_pings FROM twt_app`, then `GRANT UPDATE (<exactly these columns>)`** (F36) with a policy-regression leg proving `UPDATE …
  SET message_key` is refused; the partial index `(aging_since, claimed_at) WHERE send_outcome = 'attempting'`. ⭐ **Once-ever is a CAS:**
  begin = `UPDATE … SET send_outcome = 'attempting', attempt_count = 1, … WHERE ping_id = $1 AND send_outcome IS NULL` (or a
  re-claim of a stale `attempting` row under RN7's lease rule); ⭐ a SKIP at the locked re-check (`no_target` / `skipped_superseded`) is the
  SAME CAS from `send_outcome IS NULL`, writing that outcome with `attempt_count = 1` (0151's `no_target` precedent); **the CAS finalise** = `UPDATE … WHERE send_outcome = 'attempting' AND claimed_by_job = $job`;
  **the transient note** = `detail` + `send_updated_at` only (6.29's `noteSuspicionNoticeTransient` shape). **6.27c's migration** adds the
  `detail` / `first_detail` GRAMMAR CHECK mirroring `PEER_MESH_REQUEST_DETAIL_PATTERN` (an ENUMERATED alternation, 0155's form, with the
  `(?!.*[0-9]{7})` lookahead) and 6.27c builds the ONE `detail` builder (pure, domain) that its writers assert (RN5 — a RAW gateway code is
  SANITISED before it is stored) — the vocabulary lives with its only writer, so a merged 6.27a can ⛔ never refuse a 6.27c detail.
- **PM5 [c] — when it is sent** (`-305` §2 item 4). (i) The SELECT worker, after its commit, enqueues ONE child per CLAIM through an
  INJECTED `enqueuePeerMeshRequestSend` dep (F6 — the select result carries ⛔ no ping ids; the child reads the pings and fans out); the hook
  fires on the idempotent no-op branch too, like the shepherd hook; ⛔ never a second `claim.peer_mesh_pinged`. (ii) A daily sweep
  (`'30 10 * * *'` IST) is the backstop, with 6.29's hold / park / give-up (RN2 / RN3 / RN7). (iii) **Quiet hours:** outside 09:00–20:00
  IST ⇒ re-enqueued with `startAfter` = the next 09:00 IST. (iv) **The locked re-check** (CLAIM row, then the ping — Invariant 9; then
  COMMIT; then decrypt — ⛔ no KMS under a lock): the claim is in PM8's ANSWER WINDOW — a text goes WHILE AN ANSWER CAN STILL BE TAKEN, and
  ⛔ never once a final approval is given or the claim is refused / closed ⇒ else `skipped_superseded` /
  `superseded:claim_decided`; then PM1's exclusions. (The proposal *"no text once the District Admin has decided"* is WITHDRAWN — it narrowed
  `-303` Q1 A; `-305` §2 item 4.)
- **PM6 [a] — the 72 hours are ⛔ not changed** (FQ10 A *"as built"*): still from selection; the label still `sufficient` /
  `insufficient_responses_fallback`, monotonic, counted from the payload responder (F4). ⚠ RECORDED: a held send shortens the time before
  the label resolves — harmless (the label gates ⛔ nothing; FQ9 requires the inspection anyway; PM8 keeps answers open past it).
- **PM7 [a] — the answers: a versioned questionnaire (PM23), saved as the member goes, locked at Submit** (BigDev 2026-10-10: *"ask few more
  but keep optional, with options. Ask 2 or 3 questions at a time on screen with auto save feature, A note at the end before Submit. Also,
  Submit button just redirect user to Thank You page, because answers were already saved"*; the questions ruled by `-304`).
  (a) **Storage** (6.27a's migration — next free number at build): `claim_peer_mesh_replies` — ONE per ping: `reply_id` PK, `pariwar_id`,
  `claim_case_id`, `selection_id`, `ping_id` UNIQUE (FK), `responder_member_id`, `questionnaire_version_id` (pinned at the first save),
  `started_at`, `submitted_at NULL` (forward-only — a replies trigger refuses clearing it), `UNIQUE (pariwar_id, reply_id)` (the composite FK's
  target); and `claim_peer_mesh_reply_answers` — APPEND-ONLY rows: `answer_id` PK (the 6.27b warning SUBJECT),
  `pariwar_id`, `claim_case_id`, `reply_id` (composite FK `(pariwar_id, reply_id)`), `question_key`, `value_codes text[]` (plaintext codes
  for NON-sensitive questions), `value_ciphertext` (Tier-1 `piiColumn` under a NEW field class `PEER_MESH_ANSWER_FIELD_CLASS` — wired in
  `member/anonymize.ts`'s literal and `apps/api/src/context.ts` — for a question the definition marks `sensitive`: the date, the cause, the
  illness), `death_date_window_indexes text[]` (only the date question; CHECK `IS NULL OR cardinality(…) = 3`), `saved_via text
  CHECK IN ('member_app','helpline')`, `saved_by_actor_id`, `saved_at timestamptz DEFAULT clock_timestamp()`, `superseded_at NULL` (the
  LIVE answer = `superseded_at IS NULL`; partial UNIQUE `(pariwar_id, reply_id, question_key) WHERE superseded_at IS NULL`). CHECKs:
  exactly one of `value_codes` / `value_ciphertext` (an erased row keeps a ciphertext — the sentinel); the indexes only with the date; ⭐ *"I
  don't know the date"* is stored as `value_codes = ['unknown']` (a plaintext code, ⛔ no ciphertext, ⛔ no indexes). Indexes: replies
  `(pariwar_id, claim_case_id)`; answers `(pariwar_id, reply_id) WHERE superseded_at IS NULL` (both warning readers run in the cycle-freeze
  bulk path). ⭐ **The answers trigger holds at ALL times** (⛔ not only after Submit): it admits ONLY (i) an INSERT, and an UPDATE of `superseded_at`
  from NULL to non-NULL with every other column unchanged, while the reply's `submitted_at` IS NULL AND the claim is in PM8's answer window;
  and (ii) the **erasure arm in 0143's form** (F37): an UPDATE admitted only when `(to_jsonb(NEW) - 'value_ciphertext' - 'death_date_window_indexes')
  IS NOT DISTINCT FROM (to_jsonb(OLD) - …)` AND `value_ciphertext` changes only where OLD is non-NULL and NEW is non-NULL AND
  `death_date_window_indexes` changes only to NULL. Every other write is ⛔ never admitted — a live answer's CODES are ⛔ never rewritten, its indexes ⛔ never set to a non-NULL value,
  and `superseded_at` is ⛔ never cleared or moved. ⚠ RECORDED, as 0149 does (⛔ never claimed refused): the erasure arm has ⛔ no state
  condition, so a ciphertext-only rewrite (non-NULL → non-NULL) or an indexes → NULL write of ANY row — an open one included — is ADMITTED;
  the trigger cannot tell the RTBF scrub from any other writer of those two columns (the sentinel is a fresh envelope). APPEND-ONLY is
  therefore enforced for the codes, the indexes' values and `superseded_at`; the ciphertext's append-only rests on the ONE writer (PM7 (b)). Its plpgsql window test (the state list + the live-R9 `EXISTS`) is parity-tested against the TS answer-window predicate (PM8 —
  `claim/answer-window.ts`) and `claim/review-window.ts:15`. RLS ENABLE + FORCE, four tenant
  policies on `pariwar_id` (plus the per-command UPDATE policy the scrub needs); grants `SELECT, INSERT` + `UPDATE (superseded_at)`,
  `UPDATE (submitted_at)` on replies, `UPDATE (value_ciphertext, death_date_window_indexes)` for erasure.
  (b) **Saving:** each answer is saved the moment it is chosen. ⭐ The HANDLER first encrypts the sensitive value and computes the date's three
  keyed indexes (⛔ no KMS under a lock — Trap 9); the domain writer receives ciphertext + indexes and then takes the lock order CLAIM row
  `FOR UPDATE`, then the PING row, then the REPLY row (Invariant 9; F31) — validated against the PINNED version by the domain validator (PM23 (a)): a known key, allowed codes, its
  `showIf` met, a date that is a real calendar date (`isRealCalendarDate`, from the import-free leaf after Task 1's extraction — F38), ⛔ never in the future (IST today), ⛔ never before 1900-01-01;
  the date's three window indexes computed by ONE shared helper (D, `addCalendarDays(D, ±1)`, each keyed by `deathDateBlindIndex` under
  `DEATH_DATE_INDEX_FIELD_CLASS`, `apps/api/src/modules/claims/ground-inspection-crypto.ts:63-65`) used by BOTH the member and the helpline
  handlers; an answer whose condition stops holding (e.g. *"died"* changed to *"not sure"*) has its dependants superseded in the same
  transaction; an edit stamps the old row's `superseded_at` FIRST, then inserts the NEW live row (the partial UNIQUE cannot be deferred).
  (c) **Counts when saved:** a saved answer is live; staff see *"⛔ not submitted yet"* until Submit.
  (d) **Submit** stamps `submitted_at` (locks the reply); the app shows the Thank-you page; ⛔ nothing else happens at Submit; a second
  Submit ⇒ 409 `peer_request.submitted`.
  (e) **The event** `claim.peer_mesh_responded` (payload shape ⛔ not changed) is written ONCE, at the FIRST save of `has_died` —
  `recordPeerMeshResponse` is called ONLY when ⛔ no prior `has_died` answer row exists (checked under the locks; the function takes the
  CLAIM lock itself — `lockClaimCase` — before its ping lock, Invariant 9), so 6.6's throwing
  already-answered guard is ⛔ never hit on an edit; mapped `died` ⇒ `confirmed`, `not_died` ⇒ `denied`, `not_sure` / `did_not_know` ⇒
  `unknown`; its `from_state` / `to_state` = the claim's CURRENT state and `actor` a parameter DEFAULTING to `'member'` (so the existing callers —
  F39 — keep working) (`'member'` | `'operator'`; `actorId` = the
  operator for a helpline save, `responder_member_id` = the neighbour). ⚠ RECORDED: the event carries the FIRST answer; the live answer is
  the table's.
  (f) **Mixed app + helpline:** ONE reply per ping; each answer row carries its own `saved_via` / `saved_by_actor_id`; either side may
  Submit; after Submit both are locked.
  (g) **For row 6-31:** ONE exported read `peerMeshReplyState(pingId) → 'none' | 'started' | 'submitted'` — the WhatsApp reminder's *"has
  ⛔ not answered"* reads it (⛔ never its own copy); and the reminder, like the text, goes ONLY while the claim is in PM8's answer window
  (`-305` §2 item 4).
- **PM8 [a] — when an answer is taken: while an approval is still to come.** `recordPeerMeshResponse` (and the save path) drop the
  `verification_in_progress` and `pending`-window guards and accept while the claim is in the ANSWER WINDOW =
  `CLAIM_REVIEW_WINDOW_STATES` (`verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed`, `state_trustee_freeze`), OR
  `state_trustee_approved` WHILE the claim carries a live R9 routing (the `-283` A1 precedent: R9 finalize still runs the gate there, so a
  final approval is still to come; 6.27b's queue already scans that case). ⭐ **ONE predicate, ⛔ never re-composed:** 6.26a's
  `isClaimInGroundInspectionWindow` (`ground-inspection-persist.ts:267-276` — `CLAIM_REVIEW_WINDOW_STATES` OR (`state_trustee_approved` AND
  `hasLiveRoutedRow`)) IS this window; Task 1 extracts it under a neutral name (`isClaimInAnswerWindow`) into a NEW module
  `claim/answer-window.ts` that imports `review-window.ts` + `r9-routing.ts` (⛔ never into `review-window.ts`, whose header requires it
  import-free), and `ground-inspection-persist.ts` re-exports it under its old name (same identity). It is reused by PM7 (b), PM8,
  PM5 (iv) and row 6-31's reminder; per-claim reads use `hasLiveRoutedRow`; ⭐ 6.27b's queue needs ⛔ no window term (its scan states + R9 arm already equal the window, and answers exist only in-window — PM10); ⭐ the module ALSO exports `answerWindowSql(claimRef)` (built from `CLAIM_REVIEW_WINDOW_STATES` +
  `liveRoutedToR9Exists`) — EVERY set-based reader (the member list's **Open**, the helpline list, the sweep) uses it, with a parity leg
  against `isClaimInAnswerWindow` over every state × routed / not routed (⛔ never a hand-composed SQL copy); keep the
  not-selected guard; ⛔ never accept in `state_trustee_approved` without a live R9 routing, or in any closed / refused state (F19). A refused save answers 409 `peer_request.no_longer_open`
  and the screen says *"Thank you — this request is no longer open."* (⛔ not why). The 72-hour label is ⛔ not recounted. ⭐ The existing jobs test that asserts `PeerMeshWindowResolvedError` after the window resolves (F39)
  is REWRITTEN as *"accepted after resolution, the label ⛔ not recounted"*; the two error classes stay exported only if another caller uses
  them (grep at build). ⭐ **Trap 13 (rewritten):** a save racing an approval is made SAFE by
  the lock order (claim first — Invariant 9): the save and the approval serialize on the claim row, so ⛔ no `eventVersion` collision, ⛔ no
  deadlock, and a save after the approval's warnings read commits with `saved_at > v.decided_at` (6.27b's queue arm sees it) — proven by a
  two-connection ordering test.
- **PM9 [b] — the two kinds** (appended to `APPROVAL_WARNING_KINDS` after `register_check_mismatch`; ⛔ not in `NOMINEE_VERSION_WARNING_KINDS`):
  - **`peer_says_not_died:<answer_id>`** — the LIVE `has_died` answer row of a reply of THIS claim has the code `not_died` (submitted or
    not). A changed answer is a NEW row ⇒ a NEW key (late if after approval — F15). It needs ⛔ no certificate.
  - **`peer_death_date_differs:<answer_id>`** — the LIVE `death_date` answer row's `death_date_window_indexes` is non-null AND the current
    accepted review's `accepted_date_index` (`text`) is non-null AND is ⛔ none of the three. ⛔ No accepted certificate, or a pre-6.26b
    review ⇒ ⛔ no key. *"More than a day"* = **two or more calendar days apart** (our reading). Re-evaluates by itself when a re-review
    moves the accepted date.
  - Both: own claim ONLY (⛔ never inherited — `-261` C3); derived OUTSIDE the `postDeath` block; ONE SQL fragment (`peerReplyColumnsSql()`)
    selected by BOTH readers, selecting codes and indexes ONLY (⛔ never `value_ciphertext` — a fence assertion); ONE exported pure helper
    (the `deriveDeathFactWarningKeys` pattern). ⛔ Never in `peer-mesh-persist.ts` (it imports `project.ts`; the import discipline forbids it).
  - **Enter the wait** (`-303` Q2 A) — ⛔ no edit to the assertion; the pin test's GENERIC message gains the discharge *"6.27b's two kinds
    enter by `2026-10-10-303` Q2 A (its Consequence 1)"*. ⚠ RECORDED: a late neighbour key also makes the District Admin's approval
    unrevisable (F20).
- **PM10 [b] — the correction queue's FOURTH source.** `lateArm` (`correction-queue-read.ts:155-187`) gains ONE hoisted disjunct: `EXISTS
  (SELECT 1 FROM claim_peer_mesh_reply_answers a WHERE a.pariwar_id = v.pariwar_id AND a.claim_case_id = v.claim_case_id AND a.question_key
  IN (<the two warning keys, from the domain list>) AND a.superseded_at IS NULL AND a.saved_at > v.decided_at)` — used by the column AND the
  WHERE (⛔ never two copies); the *"THREE sources"* comment amended, ⛔ never deleted. ⛔ No change to the scan states. F21 rides arm (1).
- **PM11 [a; the `?c=` half c] — the member's answer screens (pull) and routes.** Contracts `packages/contracts/src/claims/peer-request.ts`
  (the wire shape, mirroring PM23's domain shape — lockstep test); routes in a NEW `apps/api/src/modules/claims/claims.peer-request.member.routes.ts`
  (classified `NON_ADJUDICATION_ROUTES` — F35): `GET /api/v1/p/:pariwarId/member/peer-requests?limit=` (bounded, cap 5 — forced
  pagination) → the session member's OPEN requests `{ pingId, memberName (mode-resolved), askedOn (IST date) }`; `GET …/member/peer-requests/:pingId`
  → `{ memberName, questionnaire: <the PINNED version's definition WITH the question words resolved in en and hi on the server>, answers:
  <live>, submitted }`; `PUT …/member/peer-requests/:pingId/answers/:questionKey` `{ value }` → 200 (the auto-save; idempotent by value);
  `POST …/member/peer-requests/:pingId/submit` → 200. `requireMemberSession` + `perMemberKey` budget + `Idempotency-Key` on writes; ⛔ NO
  Turnstile (F34 — the session and the budget are the control; a neighbour is a selected, authenticated member). **404** for "⛔ not
  yours / unknown / another Pariwar" AND for a ping of yours that was ⛔ never texted (`send_outcome IS DISTINCT FROM 'accepted'`) — one
  indistinguishable answer on EVERY member route (the list omits it; detail, PUT, submit and 6.27c's by-link answer 404), so ⛔ no named
  death reaches a member the Trust has ⛔ not texted; **409** `peer_request.no_longer_open` / `peer_request.submitted` for "yours, texted, but
  closed or submitted". Every new domain list read takes `clampLimit` (F40). **Open** = ⛔ not submitted AND the claim is in PM8's window AND **`send_outcome = 'accepted'`** (the member
  WAS texted) ⇒ ⭐ the card and list are DARK until 6.27c texts anyone — ⛔ no named death is shown to a member the Trust has ⛔ not texted
  (and so ⛔ never before Row 27's counsel basis). Mobile (`apps/mobile`): a card on `app/(tabs)/index.tsx` while ≥ 1 request is open (*"The
  Trust has asked you about a member"*); 6.30's route shell `app/(peer-request)/peer-request.tsx` FILLED with the list (no `c`) and the
  questionnaire — its pages (2–3 questions each), the Saved / *"Not saved — retrying"* line, the closing note and the Thank-you page are
  IN-SCREEN STATE (⛔ never a new route file, ⛔ never a new root-level catch-all — 6.30 AL16); a GENERIC renderer per question `kind` driven
  by the server's definition; the question WORDS come from the server (so a new version needs ⛔ no app release) — ONLY the chrome (card,
  saved line, buttons, errors) is in `lib/claim-i18n.ts`. **The closing note and Thank-you, VERBATIM as put under `-304` Q6 A:** *"Your
  answers are saved as you go. Only the Trust's staff who check this claim will see them — never the family. Please answer only what you
  know. Press Submit when you are done."* and *"Thank you. Your answers have been sent to the Trust."* (en; hi agent-authored, Row 28). A
  request that cannot be opened (404) shows a dignified *"This request could not be opened"* + the shared `CallHelplineCTA` — ⛔ never a
  hard error; ⛔ no API call before the session has loaded. The screens show ⛔ no claim, ⛔ no family, ⛔ no amount — the name only. Empty /
  loading / error states OUTSIDE any list ([[project_fabric_flatlist_empty_populated_crash]]); depend on `locale`, ⛔ never `t`
  ([[project_uset_fresh_closure_memo_trap]]). **The `?c=` split (stated ONCE, here and in 6.30):** 6.30's shell PARSES `c` (`parseAppLinkCode`) and owns the
  login-return (AL6); **6.27a** fills the slot — the list, the questionnaire, the not-openable state and *"⛔ no call before the session"*;
  **[c]** wires the parsed `c` to the by-link resolver (route + call, PM21 (d)), and its 404 reuses 6.27a's not-openable state.
- **PM12 [a] — the helpline records the answers of a neighbour who phones.** A NEW `claims.peer-request.helpline.routes.ts` (ENROLLED in
  the human-actor invariant's `COVERAGE_SET` — it composes the full chain; ⛔ never a new `ENROLMENT_OWED` entry, which `check.ts:402-404`
  prints as debt — F35) on 6.3's chain (`claim.file` + step-up; ⛔ no new key — a reuse,
  6.21b D5's precedent): `GET /api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests?limit=` (the caller's requests —
  gated like the member list: ONLY pings with `send_outcome = 'accepted'` — before 6.27c texts anyone the panel is EMPTY, so the helpline
  can ⛔ never name a reported death to a member the Trust has ⛔ not texted; `clampLimit`), and the SAME save / submit shape as PM11 (`PUT …/admin/claims/helpline/peer-requests/:pingId/answers/:questionKey`,
  `POST …/submit`) — ⭐ BOTH refuse, with 404, a ping whose `send_outcome IS DISTINCT FROM 'accepted'` (as the member routes do); `saved_via = 'helpline'`, `saved_by_actor_id` = the operator; the event (first `has_died` save) `actor: 'operator'`;
  the shared date-window helper. Admin UI: a *"Requests to confirm a death"* panel on the helpline member-lookup screen, rendering the same
  definition (English). ⭐ The operator sees ONLY that neighbour's answers (PM25 (b)).
- **PM13 [a] — what the District Admin sees** (the verifier console's peer-mesh section through ONE actor-aware assembler
  `assemblePeerAnswers` — reused by 6.27b's PM24 read; English only, F22): the 72-hour line (*"Fewer than 3 answers in 72 hours — the
  ground inspection is the main check"* / *"3 or more answers"* / *"Still open until {date}"* / *"⛔ No neighbour could be chosen"*); per ping:
  the neighbour's NAME (decrypted in the HANDLER — ⛔ never the warning module), the send status for EVERY value of the column (6.27c writes it): `NULL` *"⛔ not
  sent yet"* · `attempting` *"sending"* · `accepted` *"text sent"* · `rejected_invalid_number` / `rejected_unreachable` *"text could ⛔ not be
  delivered"* · `no_target` *"⛔ not texted — {reason code}"* · `error` *"text failed"* · `skipped_superseded` *"⛔ not texted — the claim had
  moved on"* (`recorded` is excluded by the CHECK — PM4), EVERY live answer with its question's English words (the sensitive ones
  decrypted in the handler), *"submitted"* / *"⛔ not submitted yet"*, *"answered in the app"* / *"recorded by the helpline"* per answer, the
  last-saved IST time and *"changed N times"*; when `callback_consent = yes`, the neighbour's mobile (decrypted in the handler, normalised,
  each showing audited through `emitAuthAudit` with a new `AuthAuditEventType` member — actor, claim, ping; ⛔ never the number in the audit
  row; ⛔ never a direct `writeAuditEntry` — F40). ⚠ The per-answer warning flags (*"says the member has ⛔ not
  died"*, *"more than a day from the certificate"*) arrive with 6.27b — its AC and Task (from the warnings read; a failed read ⇒ `null`,
  Invariant 8). `VERIFIER_CONSOLE_MAX_READS` bumped to the exact new ceiling with a ledger line
  and a `toBe`. `verifierAnnotations` STAYS `not_available_yet` (staff NOTE capture is ⛔ not built). The family's app, the claim status page
  and every public page show ⛔ nothing new.
- **PM14 [c] — ⛔ no new events beyond the existing one.** Sending writes the ping row only; `claim.peer_mesh_pinged` stays the selection's.
- **PM15 [c] — alarms: ids only** — the end-of-run held-scope alarm, a final `error`, a re-claimed `attempting` that fails its re-check
  (`-297` §2), a `no_target` on a re-claimed row (`-298`); ⛔ no alarm for PM1's `no_target`s. ⚠ The named owner is Row 27 (d).
- **PM16 [a: Rows 27 / 28 · c: the DLT templates] — the go-live records** (decision-authored; numbers RESERVED by `-305` §4 — whichever
  story lands first writes its own row at its number). **Row 27 `peer-mesh-request-counsel-basis`** — closes on ALL of: (a) counsel's basis
  for telling five members of a reported death; (b) a privacy-policy revision naming the purpose; (c) **Closed by `2026-10-10-303`** (the
  Panel's Q1 A); (d) the alarms reaching a named owner through a real transport (Row 22 (d)'s bar); (e) Row 29 (`app-links-live`, 6.30)
  closed; (f) counsel's basis for HEALTH information from neighbours — `death_cause` and `death_illness` (`-304` Q4 A), closed only when v2's
  `counselBasis` for both is RECORDED in code (a reviewed edit citing counsel's recorded basis — a decision id — + its test); (f) closes on that edit —
  ⭐ ⇒ the TEXTS themselves wait for it (Row 27 stays ONE conjunction; ⛔ no "skip the health questions" interim — it would show the
  neighbours a list the Panel never ruled); (g) **Closed by `2026-10-10-310`** (the confirm note CF1–CF5 answered). Evidence lines: the provider confirms that
  `{#alphanumeric#}` carries Devanagari with spaces (PM3); the dotted-key defect (below). Note: row 6-31 built, or its absence at go-live
  recorded as a decision. ⭐ Rows 6-31 and 6-34 cite `-305` §4 for the reserved numbers, so ⛔ no third story takes Row 27 / 28 / 29. **Row 28 `peer-mesh-request-hindi-human-review`**
  — the Hindi of the texts, the questionnaire's question words, the screens, AND 6.30's fallback page, not-found screen and route-shell
  placeholder. **[c]:** DLT
  templates 13 (hi) / 14 (en) in the sheet (typed variables — 6.27c TYPES its two templates; row 6-34 VERIFIES them with every other), *"⛔ never provision the ids until Row 27 closes"*; unset ids ⇒ the sweep HOLDS
  (RB12). ⚠ The dotted Secret Manager names (`sms.dlt.template_id.peer_mesh.…`) inherit the recorded UNVERIFIED dotted-secret-id defect
  (deferred-work *"Dotted Secret Manager names"*) — since 6.29 an `INVALID_ARGUMENT` is a final `error` + alarm that uses up the slot (F23) —
  recorded on Row 27, ⛔ not fixed here. ⚠ Row 26 (`jobs-db-role`) applies to 6.27c's sweep. ⭐ Go-live gates ⛔ never block a merge.
- **PM17 [a; d's arm in d] — erasure.** On erasure of the DECEASED member (`member/anonymize.ts`, the GI13 shape — F37): EVERY answer row of
  their claims' replies — live AND superseded — is scrubbed by ONE statement `UPDATE … SET value_ciphertext = <sentinel>,
  death_date_window_indexes = NULL WHERE value_ciphertext IS NOT NULL AND …` (GI13's `IS NOT NULL` form — a non-sensitive row keeps its codes
  and the exactly-one CHECK holds); the trigger's 0143-form arm admits it. ⭐ The rtbf completeness pin counts the ANSWERS table (the replies
  table holds ⛔ no PII): NINETEEN → TWENTY (`rtbf-anonymize.test.ts:121`); the rtbf unit test's statement count `toHaveLength(22)` → 23
  (`:191`); the no-claims leg stays 21 (`:256`); 6.27d raises them again for its notes. On erasure of the RESPONDER: the reply holds ⛔ no identity beyond an id; the answers
  stay as claim evidence — ⚠ whose data an answer is stays OPEN (GI13's deferred item gains these tables).
- **PM18 [a] — stale text corrected in the files this story touches** (⛔ no standalone edits): `schema/claim_peer_mesh_pings.ts:9-10`;
  `apps/jobs/src/claim-peer-mesh.ts:22-23` and `packages/queue/src/index.ts:138`; `packages/contracts/src/claims/verifier-console.ts:160-162`;
  the deferred-work 6.10 item's stale `events.ts:125-134` cite (now `:157-161`).
- **PM19 [a] — ⛔ not built, recorded:** FR-39's escalation and 6.6 AC6's operator extend / skip — the console's 72-hour line is the
  signal. A deferred-work item, ⛔ never a supersession.
- **PM20 [a] — ⛔ not taken: the zero-candidate stall** — the console shows *"⛔ No neighbour could be chosen"* for a `skipped` selection.
- **PM21 [a: the column · c: the rest] — the link in the text.** (a) `link_code` (6.27a's migration): 12 characters base62 from a CSPRNG,
  `UNIQUE`, written ONCE by 6.27c's begin UPDATE, ⛔ never rewritten; it carries ⛔ no name, Pariwar, claim id or login — ⛔ not a
  credential. (b) `{link}` = 6.30's `buildAppLinkUrl(<base>, 'peerRequest', link_code)` = `<origin>/peer-request?c=<code>` (a QUERY string —
  operators refuse dynamic paths); the base is the env var `APP_LINKS_BASE_URL`, READ AT BOOT by 6.27c and validated every run by 6.30's
  `resolveHttpsOrigin` (⛔ not Secret Manager); invalid / unset ⇒ the sweep HOLDS (`config:app_links_base_url_invalid`) and alarms — ⛔ never a
  broken link. (c) 6.30's route shell PARSES `c` (`parseAppLinkCode`, from `useLocalSearchParams()`) and owns the login-return (AL6); 6.27c wires the
  parsed `c` to the resolver once the session has loaded, and opens 6.27a's questionnaire (PM11's `?c=` split). (d) The resolver `GET /api/v1/p/:pariwarId/member/peer-requests/by-link/:code` →
  `{ pingId }` ONLY when the code's ping belongs to the SESSION member in that Pariwar AND was texted (`send_outcome = 'accepted'`); else
  **404** (one indistinguishable answer, reusing 6.27a's not-openable state); a
  closed request resolves and the screen says it is no longer open. (e) The code is ⛔ never in a log, an alarm, an audit row or a `detail`.
  (f) Go-live: Row 27 (e).
- **PM22 [c] — the language** (`-305` §2 item 2; ✅ `-310` CF1 A — the interim ⛔ never applies if row 6-35 lands before go-live): each text goes in the Pariwar's `pariwar_passport.locale_default`
  (`schema/pariwar_passport.ts:86`, `NOT NULL` ⇒ always present; Hindi for Bihar) — the template of that locale, both registered; the
  sweep's config check needs that locale's id for each Pariwar it texts; the choice is recorded as a CODE (`locale_source: pariwar_default`).
  ⭐ **Boundary:** row `6-35-in-app-language-switch` adds the member's own choice (saved on the phone, recorded on the server on an explicit
  change — ⛔ never on first launch) and changes this ONE read to *member's choice, else the Pariwar's default*. Row 6-31's reminder reads the
  same. ⛔ No `member_language_preferences` table in 6.27. ⚠ RECORDED: the app always renders `hi` (F32) — a Pariwar whose default is `en`
  would send English texts that open Hindi screens; moot for Bihar (Hindi) in v1; row 6-35 fixes both halves.
- **PM23 [a] — the questionnaire is DATA, versioned, in a pure domain module** (BigDev: *"these questions are of evolving nature"*; F30).
  (a) **The engine:** `packages/domain/src/questionnaires/` — pg-free, ⛔ no `db` import: the definition shape (pages of 2–3 questions; a
  question = `key` stable across versions, `kind` `single` / `multi` / `date` / `yes_no`, option CODES, `optional` (all but `has_died`),
  `showIf`, `sensitive`, `warning`, copy keys (en + hi), `approvedBy`, ⭐ `health: boolean`, and ⭐ `counselBasis` — a STATE, ⛔ not a
  boolean: `'pending'` or a recorded basis id (counsel's recorded basis — a decision id; a later one recorded through row 6-33); the SERVED definition SKIPS
  any question whose `counselBasis` is `'pending'` (a test) — v2's ruled health questions — `death_cause` (whole question: its
  answers include illnesses) and `death_illness` are `health: true` — carry `'pending'` until Row 27 (f) closes; the TEXTS wait, and that is
  MECHANISED: a `'pending'` question in `resolveLiveVersion('peer_mesh', pariwarId)` is one of 6.27c's config GAPS, checked by BOTH the
  sweep (per Pariwar per run) AND the child's begin path (the RB12 race guard ⇒ `held_config`, ⛔ no ping begun) — 6.27c AC2b — so the skip
  can ⛔ never reach a texted neighbour; recording the basis is a reviewed code edit of v2 that cites COUNSEL'S RECORDED BASIS (a decision
  id), and Row 27 (f) closes on that edit (+ its test); a later health question (v3+, from the Panel or row 6-33) likewise HOLDS that
  Pariwar's texts until its basis is recorded — ⚠ a cost row 6-33 must state); the VALIDATOR (a definition is refused unless): ⭐ for the `peer_mesh` kind, in
  EVERY version from v2 onward, every question the Panel ruled is present — the seven v2 keys `has_died`, `death_date`, `how_known`, `relationship`, `death_cause`, `death_illness`, `callback_consent` (CF3 (a));
  `warning` is set ONLY on `has_died` and `death_date` (CF3 (b)); every question has `approvedBy` = a Trustee-ratified decision id — or, once row 6-33 lands, a chain record — ⛔ no v3 before
  6-33 except from a Panel decision id; ⛔ no alcohol question key or option (CF3 (c) — Q5 A); a `health: true` question carries a `counselBasis` (CF3 (d));
  ⭐ **v1 is EXEMPT** from the seven-key rule — registered and historical, ⛔ never CURRENT, ⛔ never returned by `resolveLiveVersion`
  (a test proves v1 is registered AND exempt); the `ground_inspection` kind (row 6-32) gets ITS OWN rule from its own story — ⛔ never
  these seven keys; `showIf` refers only to an earlier key; codes unique. The VERSION REGISTRY
  (`QUESTIONNAIRE_KINDS = ['peer_mesh', 'ground_inspection']`), `resolveLiveVersion(kind, pariwarId)` (a Pariwar's own live version, else
  the all-Pariwar one), `COMPARABLE_QUESTION_KEYS` (`has_died`, `death_date`, `death_cause`, `death_illness` — the SAME keys and codes wherever
  BOTH sides answer; ⚠ `has_died` (rule ①) is NEIGHBOUR-ONLY — the family has ⛔ no `has_died` answer, ① compares against the inspection
  having happened), and the warning-key list (read by 6.27b's SQL). Because the rules live in the VALIDATOR, row 6-33's
  database-backed versions inherit them. Contracts mirrors ONLY the zod wire shape the app renders, with a test-only lockstep. ⭐ The module imports ONLY import-free leaves (⛔ never
  `isRealCalendarDate` from `nominee-determination-persist.ts` — F38); the event-response MAPPING lives in `claim/peer-mesh-reply.ts`,
  ⛔ never in `questionnaires/` (a type import from `claim/events.ts` alone trips NW1); `questionnaires/index.ts` is ADDED as an NW1 entry
  (`approval-warnings.test.ts:358-365`) and a reachability test proves the module reaches ⛔ no `db.ts`, `pg` or `drizzle-orm` (AC2's
  "pg-free" made a check).
  (b) **Versions:** v1 = page 1 only (`has_died`; `death_date` after *"Yes"*) + the closing note, `approvedBy` `-262` FQ8 E / `-263` FQ10 /
  `-303`. **v2 = `2026-10-10-304`, exactly as ruled — CURRENT (all-Pariwar):** page 1 (`has_died` — *Yes, they have died · No, they have
  not died · I am not sure · I did not know them*; `death_date` after *"Yes"* — a date · *I don't know the date*); page 2 (`how_known` —
  *"How do you know they died?"*: I attended the last rites or visited the family · The family told me · I heard it from others · Other;
  `relationship` — *"How do you know [member]?"*: A relative · A neighbour · A colleague at the same school · Other); page 3 (`death_cause`
  after *"Yes"* — Q3's list: Illness over a long time · Sudden illness (heart attack, stroke) · Old age · Accident (road, drowning, electric
  shock, snake bite, fire, other) · Suicide · Killed by someone · Other · I don't know; `death_illness` after an illness cause, multi — Q4's
  list); page 4 (`callback_consent`
  — *"May the District Admin phone you about this?"*); the closing note. ⛔ No alcohol question (Q5 A). `death_date`, `death_cause` and
  `death_illness` are `sensitive`. ⭐ ⛔ No texted neighbour ever sees a ruled question skipped: the sweep and the child HOLD while any is `'pending'`
  (6.27c AC2b; PM16) — so the full ruled list is the only list a neighbour ever sees.
  (c) **Pinning:** a reply pins `resolveLiveVersion('peer_mesh', pariwarId)` at its first save; answers are validated against it; a newer
  version applies to new replies only.
  (d) **Who approves a version** (`-304` Q7): the Pariwar Admin proposes; a State Trustee proposes or approves, with or without changes; the
  Super Admin makes it live for one Pariwar or all, with or without changes, and may add a question directly — row 6-33 builds the chain;
  until then v1 / v2 are reviewed code.
- **PM24 [b] — every approver sees the answers for the claim in front of them** (BigDev: *"yes, make those changes"*; F33 — the v1 later
  approvers are Pariwar Admins as Trustee-Lite and the Super Admin). ONE read `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers`
  in a NEW `claims.peer-answers.routes.ts` (classified `COVERAGE_SET` with its `expectedMethods`), first hook `requirePermissionHook('cycle.freeze',
  pariwar)` (the coarse key every v1 later approver holds — `pariwar_admin` and `super_admin`), then an IN-HANDLER `rbac.hasPermission`
  disjunction keyed by the claim's PENDING step: `verifier_approved` / `reversed` / `state_trustee_freeze` → `cycle.freeze`; a live R9 routing
  row → `claim.r9_vote`; an open CORRECTION escalation awaiting the Super Admin's G1 decision → `claim.decide_escalated_closure` (the
  cycle-freeze escalation RESOLUTION is `cycle.freeze`'s — the first arm); any other claim state ⇒ 404. ⚠ RECORDED: in v1 everyone who passes
  the first hook also holds `claim.r9_vote` (`pariwar_admin`) or every key (`super_admin`), so the disjunction reduces to STATE gating; and in
  `state_trustee_freeze` with an open correction escalation, a Pariwar Admin may read at what is the Super Admin's step — accepted (both
  are approvers of that claim; Invariant 7's "at that step" is enforced per state, ⛔ not per actor). Built through PM13's
  `assemblePeerAnswers`; audited through `emitAuthAudit` with a new `AuthAuditEventType` member (actor, claim, time — ⛔ no answer content; F40). A *"Neighbours' answers"* panel beside the warning lines on
  `LaterApprovalWarnings.tsx`'s four hosts — `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx`,
  `apps/admin/src/modules/correction-closure/EscalationPanel.tsx`, `apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx`,
  `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`. ⛔ No new permission key.
- **PM25 [d: (a) · a: (b), (c) · b: the kinds filter] — the people who meet the family form their own view first** (BigDev 2026-10-10).
  (a) **[d] The inspector** (the actor named on an assignment — a District Admin or a Block Admin; `field_worker` holds ⛔ no key):
  · **Before completing:** shown ⛔ nothing about the neighbours — ⛔ no answers, ⛔ no counts, ⛔ no "hidden" line.
  · **At completion** (`completeGroundInspection`), the server compares against the neighbours' answers SAVED by then: ① any neighbour's
  live `has_died` = `not_died`; ② a neighbour's live `death_date` two or more calendar days from the FAMILY's date — ONLY when the
  completed row's `death_date_source = 'family_statement'` (a SOURCE value — `claim_ground_inspections.ts:116`, ⛔ not a completion kind; a
  `certificate_check` STAGE records the original's date), by index membership (the family's `death_date_index` against the neighbour's
  three window indexes — ⛔ no decrypt). ⭐ ③ (cause) and ④ (illness) are ⛔ NOT built:
  the family's answers come from row 6-32, and comparing ENCRYPTED codes needs a comparable form (a keyed blind index per option code) —
  a design OWED by row 6-32, recorded. ⛔ Never compared: *"how do you know"*, *"how do you know them"*, the call-back consent; ⛔ never
  `member_medical_disclosures` (a fence test — `-304` Q4 A).
  · **⛔ No difference (or ⛔ no answer yet)** ⇒ *"Thank you, your response has been recorded. No further action needed."*
  · **A difference** ⇒ *"Thank you, your response has been recorded. We found the family's answers don't match the neighbours'
  observations. Please ask the family again, in your own words, without mentioning anyone else's answer, and record their response in the
  note next to each question."* — each differing question shown to the INSPECTOR as — for ① *"The family reported that the member has died. A neighbour's answer
  differs."*; for ② *"The family said: [their date, as the inspector entered it — decrypted in the HANDLER after the completion commit, for
  display only]. A neighbour's answer differs."*
  (⭐ the inspector SEES the difference — `-304` Q3 / Q4 as put — but asks the family OPEN-ENDED, ⛔ never stating what any neighbour said
  and ⛔ never who: `-305` §2 item 3), ⛔ never a name, ⛔ never a count, and ONE note box per differing question.
  · **The notes and the showing** — 6.27d's migration: `claim_ground_inspection_discrepancy_notes` (Tier-1 note, `pariwar_id`,
  `ground_inspection_id`, `question_key`, `noted_at clock_timestamp()`; once per question; while the claim is in PM8's window; its own
  erasure arm in 0143's form) and a SEPARATE table `claim_ground_inspection_discrepancy_showings` (the result's question KEYS only, ⛔ no
  values, and `shown_at clock_timestamp()`), written in ITS OWN transaction AFTER the completion commits — ⛔ never columns on the assignment
  (whose row is frozen after completion) ⇒ `completed_at` < `shown_at`, provable by an ordering test. ⭐ The showing write is IDEMPOTENT
  (`UNIQUE` per assignment); if it is ABSENT (the post-commit write failed), the inspector's OWN re-read of their completed assignment
  RECOMPUTES the result against the answers live AS OF `completed_at` (`saved_at ≤ completed_at AND (superseded_at IS NULL OR
  superseded_at > completed_at)`) and writes it ⇒ a lost completion response or a failed showing write is ⛔ never lost for good.
  · **Answers arriving after completion** reach the District Admin, ⛔ never the inspector.
  (b) **[a] The helpline operator** sees ONLY the answers of the neighbour they are recording — ⛔ never another neighbour's, ⛔ never the
  warning lines, ⛔ never the counts.
  (c) **[a; the kinds half b] Enforced in the SERVER read** (`assemblePeerAnswers` takes the actor): for an actor who holds an
  UN-completed assignment on the claim and has completed ⛔ no FULL visit on it (a `certificate_check` alone does ⛔ not count — it records
  ⛔ no family account), the console's `peerMesh` is ABSENT — the contract field becomes OPTIONAL
  (⛔ never a new variant, which would itself be a "hidden" signal) and `SignalsPanel` renders ⛔ no peer-mesh section at all (⛔ never
  a title with nothing under it — F41); **[b]** and 6.27b filters the two peer kinds out of that actor's
  warnings summary and correction-queue row (approval is impossible before completion anyway — GI1).

## Acceptance Criteria (6.27a)

1. **AC1 — governance first (shared).** ⛔ No code in any part before Task 0.4's author-commit (PM1–PM25 as answered, incl. the author
   readings Task 0.4 lists) lands ALONE; the epics.md entries for 6.27a–d, Rows 27 / 28 and the deferred-work items follow it.
2. **AC2 — the engine** (PM23): the domain module exists and a REACHABILITY test proves it reaches ⛔ no `db.ts`, `pg` or `drizzle-orm`;
   `questionnaires/index.ts` is an NW1 entry and the NW1 test stays green; `isRealCalendarDate` is served from the import-free leaf (same
   identity re-exported); the validator refuses a `peer_mesh` definition (v2 onward) missing ANY of the seven ruled keys (v1 registered AND exempt — a test), a `warning` on any other key, a question
   without a valid `approvedBy` (⛔ no v3 before 6-33 except a Panel decision id), an alcohol key, a `health: true` question
   without a `counselBasis`; the served definition skips a question whose `counselBasis` is `'pending'` (a test); a forward `showIf`, a duplicate code; v1 and v2 are registered and v2 is CURRENT; v2's DEFINITION holds all seven keys, and the SERVED v2 skips `death_cause` and
   `death_illness` while their `counselBasis` is `'pending'` (a test) — and 6.27c's sweep AND child's begin path HOLD (`held_config`) while any question of the live version is
   `'pending'` (6.27c AC2b), so a neighbour is ⛔ never texted into a questionnaire with a ruled question hidden;
   `resolveLiveVersion` prefers a Pariwar version over the all-Pariwar one; the contracts wire shape is in lockstep with the domain shape
   (test-only).
3. **AC3 — the schema** (PM4 schema, PM7 (a), PM21 (a)): the migration applies from zero on :5432 AND :5433; the ping columns, `link_code`,
   the REVOKE + column GRANT (a leg proves `UPDATE … SET message_key` refused), both new tables with `pariwar_id`, the composite FK,
   `UNIQUE (pariwar_id, reply_id)`, the structural CHECKs (incl. `recorded` refused, `attempt_count` 0 before begin and `(send_outcome IS NULL) = (attempt_count = 0)`, `locale_source`),
   the ping finished-row trigger (a finished `send_outcome` refused a rewrite; `aging_since` forward-only; `link_code` written once — each a
   direct-SQL policy-spec leg), the indexes, RLS + policies; the answers' trigger holds at ALL times — it admits ONLY an INSERT and a `superseded_at` NULL → non-NULL
   while the reply is open AND in the window (a leg each: a write after Submit refused; outside the window refused; a live answer's
   CODES rewrite refused and its indexes set to a non-NULL value refused while OPEN; a ciphertext-only or indexes → NULL write ADMITTED by the
   erasure arm (a leg that RECORDS it — 0149's limit, ⛔ never claimed refused); `superseded_at` cleared or moved refused), plus the 0143-form erasure arm, which
   refuses ANY other column change and refuses `death_date_window_indexes` to non-NULL (⛔ never a "sentinel
   only" claim — F37); `submitted_at` cannot be cleared; the state list matches `review-window.ts:15` + the live-R9 case (parity test).
4. **AC4 — the writer** (PM7 (b)–(g), PM8): a save takes claim → ping → reply locks; validates against the pinned version; appends and
   supersedes (dependants too); the event is written exactly once at the first `has_died` save, with the CURRENT state and the right actor;
   a later edit writes ⛔ no event and ⛔ never throws the already-answered error; the handler encrypts and indexes BEFORE the locks (⛔ no KMS under a lock — a test asserts the writer receives ciphertext);
   `recordPeerMeshResponse` takes the claim lock itself and `actor` defaults to `'member'` (the existing callers unchanged); accepted in each of
   the five window states incl. after the 72 hours and after the District Admin approved, AND in `state_trustee_approved` with a live R9
   routing; refused (409) in `state_trustee_approved` without one and every closed / refused state; the inverted jobs test (F39) passes; Submit locks;
   a second Submit is 409; `peerMeshReplyState` answers `none` / `started` / `submitted`; a two-connection save-vs-approval ordering test
   shows ⛔ no collision, ⛔ no deadlock.
5. **AC5 — the member surface** (PM11; ⚠ Task 5 needs 6.30's route shell MERGED): the list is bounded (`clampLimit`) and returns ONLY
   requests whose ping `send_outcome = 'accepted'` (a fixture sets it — ⛔ none exists before 6.27c); detail, PUT and submit answer 404 for a
   ping that was ⛔ never texted exactly as for not-yours / unknown / another Pariwar (one indistinguishable answer — a test per route), and 409
   for closed / submitted;
   ⛔ no Turnstile; the definition carries resolved en + hi words; the screen fills 6.30's shell with the list and the in-screen pages,
   saves each answer with a saved / not-saved line (a failed save retries, ⛔ never lost silently), shows the closing note and the Thank-you
   VERBATIM, shows the dignified not-openable state with the helpline on a 404, makes ⛔ no API call before the session loads, and shows
   ⛔ no claim, family or amount.
6. **AC6 — the helpline** (PM12, PM25 (b)): on 6.3's chain with step-up (⛔ no step-up ⇒ refused); enrolled in `COVERAGE_SET`; the list
   returns ONLY `send_outcome = 'accepted'` pings (a test: a ping with `send_outcome` NULL is absent); the same save / submit shape, and the helpline PUT and submit answer 404
   for a ping whose `send_outcome IS DISTINCT FROM 'accepted'` (a leg each); `saved_via = 'helpline'` per answer; a mixed app + helpline reply works and locks for both at Submit; the operator's view carries only that
   neighbour's answers.
7. **AC7 — the District Admin sees** (PM13, PM25 (c)): the 72-hour line, each neighbour's name, the send status, every live answer with its
   words, submitted or not, how and when it was saved, *"changed N times"*, the call-back mobile when consented (audited, ⛔ no number in the
   audit); a failed decrypt shows *"could not be shown just now"*; the read ceiling is the exact bumped `toBe`; every `send_outcome` value has its
   words; the call-back reveal is audited via `emitAuthAudit`; for an actor holding an un-completed assignment with ⛔ no completed FULL visit,
   the `peerMesh` field is ABSENT (⛔ no variant) and `SignalsPanel` renders ⛔ no peer-mesh section; `SignalsPanel.tsx:269` and the typed specs
   compile with the optional field.
8. **AC8 — erasure** (PM17): erasing the deceased scrubs every SENSITIVE answer row of their claims (live and superseded; `WHERE
   value_ciphertext IS NOT NULL`) to the sentinel and NULLs the date indexes — after Submit and after the claim closed; a non-sensitive row
   keeps its codes; the rtbf completeness pin is TWENTY (the answers table) and the unit statement count 23.
9. **AC9 — ⛔ no PII escapes, and the gates hold:** ⛔ no date, cause, illness or code in an event, log, alarm, audit row or `detail`; the
   decrypt fence covers each new domain module (`FENCED_FILES` bumped); the new route files are classified in the human-actor invariant;
   the list GETs pass forced pagination; the friction-budget declaration and the microcopy scope cover the new mobile files; ⛔ no direct `writeAuditEntry` under
   `apps/api/src/modules/claims/` (access-wrapper-invariants (3)); every new domain list read takes `clampLimit`.
10. **AC10 — the records** (PM16 Rows, PM18, PM19, PM20): Rows 27 / 28 written at their reserved numbers with their conditions; the
    stale comments corrected; the deferred-work items; `pnpm ci:local` green.

## Tasks / Subtasks (6.27a — Task 0 is shared by 6.27a–d)

- [ ] **Task 0 — governance FIRST (AC1).** ⛔ No code in any part.
  - [x] 0.1 The Panel's rulings put and transcribed — `2026-10-10-303` (Q1, Q2), `2026-10-10-304` (Q3–Q8).
  - [x] 0.2 The validate's corrections and BigDev's calls recorded — `2026-10-10-305` (`fa2687ce`); the confirm note CF1–CF3 written
        (`trustee-panel-routing-note-2026-10-10-6-27-confirms.md` — owed before Row 27 closes, ⛔ not blocking).
  - [ ] 0.0 Branch: rebase / fast-forward the build branch onto the governance tip (or `main` once merged); verify this file reads v2.5 or later.
  - [ ] 0.3 Put PM1–PM25 to BigDev (short option summaries — the 6.24b / 6.29 form); record each answer here.
  - [ ] 0.4 ONE author-commit (the next id after `-305`) recording PM1–PM25 as answered AND these author readings: the *"TWT:"* prefix
        dropped (PM3); `no_target:name_too_long` and the unconfirmed Devanagari `{#alphanumeric#}` question — a narrowing of `-303` Q1 A at
        the edge (PM3; FYI in the confirm note; a Row 27 evidence line); *"two or more calendar days"* (PM9); the exclusions of PM1; the
        ANSWER WINDOW incl. `state_trustee_approved` under a live R9 routing (PM8, PM5 (iv)); ⛔ no texted neighbour ever sees a ruled
        question skipped — the sweep and the child hold while any is `'pending'` (PM16, PM23, 6.27c AC2b); every ruled question in every `peer_mesh` version from v2 onward, v1 exempt (PM23 — CF3 (a)); the hold on a `'pending'` question in BOTH the sweep and the child (PM23, 6.27c AC2b); the untexted-ping 404 and the helpline gate
        (PM11, PM12); the open-ended inspector wording and *"no FULL visit"* (PM25); PM24's state-gating coarseness; the `detail` grammar
        living in 6.27c (PM4); ⭐ v1 EXEMPT from the seven-key rule and the `ground_inspection` kind's rule left to 6-32 (PM23 (a)); the
        answer window extracted as ONE predicate (PM8); `counselBasis` as a state with the served-definition skip (PM23 (a)) — committed ALONE; stage in the scratchpad, try the insert first
        ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.5 epics.md entries `### Story 6.27a` … `6.27d` (after 6.26b; a dated source line, ⛔ never a merge fence); annotate Story 6.6's AC
        (*"pinged via Story 5.1 dispatcher"* → the ruled text) and Story 6.10's AC2(c) — ⛔ never rewrites. ⭐ 6.27a OWNS these annotations
        (6.27c only checks them).
  - [ ] 0.6 Roster Rows 27 / 28 at their reserved numbers (PM16); a line on Row 26 (jobs-db-role) and Row 22's precedent.
  - [ ] 0.7 Sprint ledger line ([[project_sprint_status_ledger]], [[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — the questionnaire engine (AC2).** FIRST extract `isRealCalendarDate` into `cycle-calendar/holiday-resolver.ts` (re-exported
      from `nominee-determination-persist.ts`, the same identity — F38), and extract the ANSWER WINDOW predicate into `claim/answer-window.ts`
      (`isClaimInAnswerWindow`; `ground-inspection-persist.ts` re-exports it as `isClaimInGroundInspectionWindow` — same identity; PM8) AND its
      set-based twin `answerWindowSql(claimRef)` (built from `CLAIM_REVIEW_WINDOW_STATES` + `liveRoutedToR9Exists`) with a parity leg over
      every state × routed / not routed. Then `packages/domain/src/questionnaires/` (shape, validator,
      registry, `resolveLiveVersion`, `COMPARABLE_QUESTION_KEYS`, the warning-key list, v1, v2) — pg-free, importing only import-free leaves;
      `questionnaires/index.ts` added as an NW1 entry; the reachability test; the copy keys en + hi in `packages/i18n` (server-resolved);
      the contracts wire mirror + lockstep test; unit tests for every validator rule (incl. v1 registered AND exempt; `health` + `counselBasis`; the served-definition skip). ⛔ Never in `packages/contracts` (F30).
- [ ] **Task 2 — the migration (AC3).** Next free number at build (`ls packages/domain/migrations | tail`); hand-authored; journal; applied to
      :5432 AND :5433 and proven from zero; Drizzle schema files (`schema/claim_peer_mesh_pings.ts`, NEW `schema/claim_peer_mesh_replies.ts`
      incl. the answers table); RLS policy files + policy-regression specs (incl. the REVOKE leg, the ping finished-row trigger legs, the
      0143-form erasure arm and its RECORDED admissions, the answers trigger's all-times legs, the plpgsql window parity test against
      `isClaimInAnswerWindow`, `submitted_at` forward-only, `UNIQUE (pariwar_id, reply_id)`); the new field class
      `PEER_MESH_ANSWER_FIELD_CLASS` (anonymize literal, `apps/api/src/context.ts`); ⛔ no `detail` grammar here (6.27c); ⛔ never regenerate an
      applied migration ([[project_live_db_test_gotchas]]).
- [ ] **Task 3 — the writer (AC4).** A NEW domain module (`packages/domain/src/claim/peer-mesh-reply.ts`) with the save and submit paths,
      `peerMeshReplyState` and the event-response MAPPING (⛔ never in `questionnaires/`); the handler-side encrypt + index helper (⛔ no KMS
      under a lock); `recordPeerMeshResponse` widened (the answer window incl. live R9, CURRENT state, `actor` defaulting to `'member'`, the
      claim lock taken inside) and called only on the first `has_died` save; the inverted jobs test (F39); the supersede write order; the lock order; the shared date-window helper (`addCalendarDays`, `isRealCalendarDate`); unit + integration tests
      incl. every state in / out of the window and the two-connection ordering test (separate committed transactions —
      [[project_db_clock_ordering_tests_tie]]).
- [ ] **Task 4 — the member API (AC5).** `claims.peer-request.member.routes.ts` + handlers + contracts + api-client factory
      (`createMemberPeerRequestClient`); 404 / 409 rules incl. the untexted-ping 404 on every route; `clampLimit`; bounded `limit`; `perMemberKey`; ⛔ no Turnstile; the human-actor classification;
      route tests incl. the three indistinguishable 404s.
- [ ] **Task 5 — the mobile screens (AC5).** Fill 6.30's shell `app/(peer-request)/peer-request.tsx`: the list, the generic renderer, the
      in-screen pages, the saved line, the closing note and the Thank-you, the not-openable state with `CallHelplineCTA`, ⛔ no call before
      the session; the home card on `app/(tabs)/index.tsx`; chrome strings in `lib/claim-i18n.ts` (en + hi, `$comment` marker); source-scan
      and pure-logic tests (the mobile harness renders ⛔ no screen); the friction-budget declaration; the microcopy scope.
      ⚠ Needs 6.30's route shell MERGED (header ORDER). If it has ⛔ not landed, STOP and ask — ⛔ never create a second route file
      ([[feedback_circular_deferral_between_sibling_stories]]).
- [ ] **Task 6 — the helpline (AC6).** `claims.peer-request.helpline.routes.ts` + handlers on 6.3's chain, enrolled in `COVERAGE_SET`; the
      list gated on `send_outcome = 'accepted'`; the PUT and submit 404 for an untexted ping; the admin panel on the member-lookup screen;
      tests incl. ⛔ no step-up ⇒ refused, the mixed reply, a NULL-outcome ping absent, and the PUT / submit 404 legs.
- [ ] **Task 7 — the District Admin's view (AC7).** `assemblePeerAnswers` (actor-aware); the console contract (`PeerMeshTranscript` gains
      `outcome`, `windowExpiresAt`, per-ping `sendStatus`, `responderName`, the answers, the call-back mobile; `peerMesh` OPTIONAL);
      `PeerMeshView` (⛔ no section rendered when `peerMesh` is absent); `SignalsPanel.tsx:269` and the typed specs
      (`verifier-console-shape.spec.ts:425,488`) updated for the optional field (F41); the call-back reveal audited via `emitAuthAudit` (a new
      `AuthAuditEventType` member); the read-ceiling bump with an exact `toBe`; `claims-verifier-console.test.ts:247` stays; contracts vitest
      ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 8 — erasure, fences, gates (AC8, AC9).** `member/anonymize.ts` (the scrub `WHERE value_ciphertext IS NOT NULL`) + the rtbf pin
      (TWENTY; the unit count 23; the no-claims leg 21); `FENCED_FILES` bumps + the decrypt-fence arm for
      `peer-mesh-reply.ts`; the human-actor classifications; forced pagination; ⛔ no PII in events / logs / audit (assertions).
- [ ] **Task 9 — records and close (AC10).** 9.1 the stale comments (PM18); 9.2 deferred-work: 6.10's item updated, GI13's erasure item gains
      the two tables, PM19's item, PM20 on the zero-candidate item, the family-member item (PM1); 9.3 Rows 27 / 28 (if Task 0.6 did ⛔ not);
      9.4 a pointer on row 6-22 for PM1's residual (6.27a OWNS it; 6.27c only checks it); 9.5 this file's Change Log + File List; 9.6 `pnpm ci:local` green — run it,
      paste the summary, ⛔ never claim it.

## Dev Notes (shared traps; each part adds its own)

### ⚠ TRAPS (each has bitten an earlier story)

1. **Showing an answer to the family or the public is a Panel question** (Invariant 7) — ⛔ never on the claim status page, the Sahyog
   Vivran shell, `verifierName`, any member-facing contract, or through the inspector's words to the family.
2. **The text says only the ruled words** — ⛔ never the claim, the family, the amount, *"within 72 hours"* or any deadline word (S4 / T6);
   a wording change is a re-registration AND a Panel matter.
3. **⛔ No conjunct in the gate**; ⛔ no question added through the chain becomes a warning or a flag (the validator refuses it).
4. **⛔ Never edit the assertion or the approver writers** (NW1); re-judge any exclusion at EVERY coverage reader (the queue, the gate,
   R9 finalize, the console) — 6.26b's lesson.
5. **Rebase onto every sibling** (`-292` / `-282` Consequence 4): the gate order (F18), RF5's required `step`, RF15, the NW1 transitive
   import scan, `FENCED_FILES`, the console read ceiling, 6.25's `standingSuspicionRefusalSql`; ⭐ AND row 6-28 (one payment per death —
   the same approval path; two claims for one death both produce neighbour keys).
6. **Both warning readers or neither** (6.27b) — the bulk reader is a separate statement; the parity test is the guard.
7. **⛔ Never inherit a neighbour key** (`-261` C3).
8. **⛔ Never touch the selection** (`peer-mesh-read.ts`; `member/moderation/index.ts:22`).
9. **⛔ No KMS under a lock — anywhere in 6.27** (the save path too: the handler encrypts and indexes FIRST, the writer takes the locks);
   ⛔ no number in a log.
10. **The erased sentinel is a "mobile"** — ALWAYS `normalizeMobile`; ⛔ never `resolveSmsTarget`.
11. **A RAW gateway code in `detail` breaks the CHECK after a successful send** (6.29 Trap 4) — sanitise through the ONE builder.
12. **`clock_timestamp()` for `saved_at` / `noted_at`**, ⛔ never `now()` ([[project_db_clock_ordering_tests_tie]]).
13. **Locks in ONE order — claim, then ping, then reply** (Invariant 9; F31) — `recordPeerMeshResponse` takes the claim lock ITSELF. A
    ping-first lock under PM8's window collides on `eventVersion`, deadlocks, or hides a late key from the queue.
14. **Markdown emphasis closes a JSDoc** — grep `\*\*/` after every doc-block edit ([[project_markdown_emphasis_closes_jsdoc]]).
15. **Contracts tests are outside tsc** — run vitest ([[project_contracts_tests_outside_tsc]]).
16. **Prettier is ⛔ not enforced** — hand-format ([[project_prettier_not_enforced]]).
17. **Leave room for row 6-31's reminder — ⛔ never build it here.** It reads `peerMeshReplyState` and the ping's send record; ⛔ never give
    the text's finished-row trigger a rule that would refuse a SEPARATE reminder record; it needs its own send path (the WA registry is
    keyed by `AlertCategory`, and `dispatch()`'s WA-undelivered SMS fallback would send a SECOND text); and it goes ONLY within PM8's answer
    window (`-305` §2 item 4).
18. **⛔ Never put the engine in `@twt/contracts`** (F30) — a domain → contracts import is a workspace cycle.
19. **⛔ Never copy the `-303` routing block's Hindi** — it says "two" (`दो`); the text says "a few" (`-304` Q6 A).
20. **⛔ Never import a pg / event module into `questionnaires/`** (F38) — `isRealCalendarDate` from `nominee-determination-persist.ts`
    alone breaks NW1 and closes a runtime cycle the typecheck cannot see.

### Reuse map (⛔ never reinvent)
| Need | Reuse |
|---|---|
| member route shape | `helpdesk/member-routes.ts:50` (`perMemberKey`), `member-handlers.ts:261-273` (404 rule), `scope-tx.ts:34` |
| helpline write | `claims.helpline.routes.ts:88-91,103` chain |
| date index | `deathDateBlindIndex` (`ground-inspection-crypto.ts:63-65`), `DEATH_DATE_INDEX_FIELD_CLASS` |
| calendar arithmetic | `addCalendarDays` (`cycle-calendar/holiday-resolver.ts:187`), `isRealCalendarDate` (moved there by Task 1 — today `nominee-determination-persist.ts:71`) |
| erasure arm | 0143's trigger form + 0149's header (F37); the scrub statement's shape: GI13 (`member/anonymize.ts:255-292`, `WHERE … IS NOT NULL`) |
| staff read audit | `emitAuthAudit` (`claims.verifier-console.handlers.ts:1081`) + the `AuthAuditEventType` union |
| member's name | `notifications.resolveMemberFacingDeceasedName` (`notifications/pool-identity.ts:141`) |
| member's mobile | `waOptIn.getMemberMobileCiphertext` → `decryptMobile` → `normalizeMobile` |
| warning kind threading (6.27b) | 6.26b's commit `bdb01014` (63 files) |
| send record / sweep (6.27c) | 0151 + 0155, `suspicion-notice.ts`, `claim-suspicion-notices.ts`, `sendClaimDltSms` |
| injected post-commit enqueue (6.27c) | `claim-peer-mesh.ts:346-356` + `boot.ts:483-505` |

### Testing standards
- Unit (vitest): every validator rule (the seven ruled keys; `warning` on two; `approvedBy`; ⛔ no alcohol; a new health question's flag); the
  reachability test; v1 / v2 registration; `resolveLiveVersion`; the window helper across month / year /
  leap boundaries (±1 inside, ±2 outside); the response mapping; the contracts lockstep.
- Integration (live DB, :5433): the migration from zero; RLS policy regressions incl. the REVOKE leg and the erasure arm; the writer in every
  state; the two-connection ordering test; erasure after Submit and after closure.
- API: the member routes (404 ×3 indistinguishable; 409 closed / submitted; idempotent replay; ⛔ no Turnstile); the helpline routes (step-up);
  the console shape + ceiling `toBe` + the absent field.
- Mobile: source-scan + pure-logic tests (the harness renders ⛔ no screen — `apps/mobile/vitest.config.ts`); a REAL `t()` leg for the chrome
  ([[feedback_stub_must_call_not_transcribe]]).
- Assert MEMBERSHIP, ⛔ never counts, on shared tables ([[project_live_db_test_gotchas]]); suite-level `{timeout:20000}` on live specs
  ([[project_known_livedb_test_failures]]). `pnpm ci:local` before review.

### Project structure notes (6.27a)
- NEW: `packages/domain/src/questionnaires/` (+ tests); `packages/domain/src/claim/peer-mesh-reply.ts`; `packages/domain/migrations/<next>_*.sql`;
  `packages/domain/src/schema/claim_peer_mesh_replies.ts`; `packages/contracts/src/claims/peer-request.ts`;
  `apps/api/src/modules/claims/claims.peer-request.member.routes.ts`, `claims.peer-request.helpline.routes.ts` (+ handlers);
  the api-client factory; the mobile home card and the filled shell.
- UPDATE: `packages/domain/src/claim/peer-mesh-persist.ts`, `packages/domain/src/schema/claim_peer_mesh_pings.ts`,
  `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`, `packages/contracts/src/claims/verifier-console.ts`,
  `apps/admin/src/modules/claim-verification/SignalsPanel.tsx`, `member/anonymize.ts`, the fence / rtbf / human-actor / pagination test
  lists, `microcopy.yaml`, `friction-budget.md`.
- ⚠ Do ⛔ not extract a shared "DLT notice" package ([[feedback_no_premature_package]]); the questionnaire engine IS shared (two consumers).

### Previous story intelligence
- **6.29**: the 0151 parity bar for any once-ever SMS record; raw gateway codes broke a CHECK after a successful send.
- **6.26b**: adding a kind touches ~60 files; derive ONLY in the shared helper; one hoisted queue fragment; fixture defaults raise ⛔ no
  warning; `null` is ⛔ never `false`; the key's stability is a ruling-sized choice; re-judge exclusions at every reader.
- **6.25**: `ADMIN_APP_ORIGIN` — the env + per-run validator + hold pattern (6.30 generalises it as `resolveHttpsOrigin`).
- **6.6**: the SELECT worker is "frozen" — extend through injected deps only.
- **This story's own validate (2026-10-10)**: nine revisions in a day left ACs, Tasks and Invariants behind the PMs — the split exists so each
  part stays in sync with itself ([[feedback_spec_edits_must_propagate_to_tasks]]).

### Git intelligence
`fa2687ce` `-305` (governance) · `877e5864` 6.27 v1.9 · `7f5603ff` `-304` · `d5789ffc` 6.27 v1.4 · `21715fcb` `-303` · `61fb4744` 6.30
created — the house order: decision entry → records → build → review; REBASE-merge, ⛔ never squash ([[project_story_automator_ops]]); commit
on the story branch ([[feedback_commit_on_story_branch]]).

### Latest tech information
⛔ No new library or version — read the neighbouring code, ⛔ never upgrade anything.

### References
- `.decision-log.md`: `-261` C3 · `-262` FQ8 E · `-263` FQ9 / FQ10 / FINDING / Consequences · `-264` FQ12 · `-277` Q2 C / Q3 B · `-278` NW1 /
  NW7 / NW12 / EA2 / EA10 · `-279` A6 · `-281` Q1 B · `-282` GI5–GI7 / GI13 · `-288` K3 · `-289` L4 / L5 · `-292` RF1 / RF5 / RF15 ·
  `-295` RB1–RB18 · `-297` §2 · `-298` · `-302` RN2–RN9 · `-303` · `-304` · `-305`.
- Routing notes `trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md`, `…-6-27-the-neighbours-questions.md`,
  `…-6-27-confirms.md`.
- Sibling files `6-27b-…`, `6-27c-…`, `6-27d-…`; `6-30-app-links-open-the-app-from-a-text.md`.
- PRD FR-39 / FR-40; architecture §3.4, §4.7; `epics.md` Stories 6.6, 6.7, 6.10; `docs/launch-gate-inventory/inventory-roster.md`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- 2026-10-10 — created by `bmad-create-story 6.27` (Opus 5.5); v2.0 after a four-reviewer fresh-context validate and `-305`: cut into
  6.27a (this file — the shared record) and 6.27b / c / d. ⛔ No code; Task 0.3 / 0.4 owed.

### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 2.8 | `2026-10-10-310` (the Panel: CF1 A, CF2, CF3 (a)–(d), CF4 A, CF5 A): the confirm statuses updated to RULED; Row 27 (g) closed by it; the CF3 readings now ratified. |
| 2026-10-10 | 2.7 | `2026-10-10-307`: PM1 reads row 6-36's full order — workplace colleagues → people the member named and who accepted → ⛔ no one. |
| 2026-10-10 | 2.6 | `2026-10-10-306` (BigDev): the five are chosen by school (row 6-36), ⛔ never the district; 6.27c also waits for row 6-36; PM1 updated; CF4 owed. |
| 2026-10-10 | 2.5 | Round 6 (0 BLOCKER / 0 HIGH — validate ends): Row 27 (f) and PM23's basis id cite counsel's recorded basis (⛔ no longer circular); AC2 names the sweep AND the child; 6.27b's queue needs ⛔ no window term (PM8 corrected); build floor v2.5. |
| 2026-10-10 | 2.4 | Round 5 (0 BLOCKER / 1 HIGH): the `'pending'`-question hold is a config gap checked by BOTH the sweep and the child's begin path (6.27c AC2b); the "no ruled question is ever skipped" passages reworded to "no TEXTED neighbour sees one skipped"; a later chain-added health question HOLDS that Pariwar's texts (a cost row 6-33 must state; CF3 (d) says so); the basis edit cites counsel's recorded basis, Row 27 (f) closes on it; `answerWindowSql` + parity leg in Task 1; build floor v2.4. |
| 2026-10-10 | 2.3 | Round 4 (0 BLOCKER / 2 HIGH, both introduced by round 3): the erasure arm's admissions RECORDED honestly (a ciphertext-only or indexes → NULL write is admitted, 0149's limit — the AC3 leg records it); the `'pending'` health questions MECHANISED — 6.27c's sweep holds while any is pending, Row 27 (f) closes only when v2's basis is recorded in code, AC2's "no question skipped" corrected; `answerWindowSql` for set-based readers with a parity leg; stale "every version" wording; build floor v2.3; Tasks 2 / 6 carry the round-3 legs. |
| 2026-10-10 | 2.2 | Round-3 validate (one narrow reviewer; 1 HIGH): the seven-key rule scoped to the `peer_mesh` kind from v2 onward, v1 registered AND exempt (a test), the `ground_inspection` kind left to 6-32; the helpline PUT / submit 404 an untexted ping; the answer window = ONE predicate extracted from 6.26a's `isClaimInGroundInspectionWindow` into `claim/answer-window.ts`; the answers trigger holds at ALL times (APPEND-ONLY enforced); `health` + `counselBasis` as a state with a served-definition skip; the build gate reads v2.1+; the showing write idempotent with an as-of-`completed_at` recompute; `attempt_count NOT NULL DEFAULT 0` + the skip CAS; F19 / parity mention live R9; NW1 lines `:358-365`; `has_died` neighbour-only in `COMPARABLE_QUESTION_KEYS`. |
| 2026-10-10 | 2.1 | Round-2 validate (three reviewers; ⛔ no BLOCKER): the `detail` grammar + builder MOVED to 6.27c (6.27a ships the columns + structural CHECKs, the CAS finalise and transient note now recorded in PM4); the texts WAIT for Row 27 (f) — ⛔ no ruled question skipped; the validator requires EVERY ruled key; the answer window adds `state_trustee_approved` under a live R9 routing (`-283` A1 precedent); `name_too_long` / Devanagari recorded as an author reading + Row 27 evidence + an FYI; every member route 404s an untexted ping and the helpline list is gated; Task 5 needs 6.30's shell merged; the `?c=` split stated once; `isRealCalendarDate` extracted into the import-free leaf, the mapping in `peer-mesh-reply.ts`, an NW1 entry and a reachability test; F37 corrected (0143 + 0149; the 0143-form arm; `WHERE value_ciphertext IS NOT NULL`); encrypt / index in the handler (⛔ no KMS under a lock — story-wide); the inverted jobs test, `actor` default, `emitAuthAudit`, `clampLimit`, the optional field's tsc fallout; ① / ② wording and source; a SEPARATE showings table; *"no FULL visit"*; PM24's coarseness and escalation named; F20, F1 lines; rtbf counts; `locale_source`; send-status words; `submitted_at` forward-only; `UNIQUE (pariwar_id, reply_id)`; *"I don't know the date"* storage; a new field class; F39–F41; Trap 20. |
| 2026-10-10 | 2.0 | ⭐ After the fresh-context validate (four read-only reviewers) and `2026-10-10-305`: SPLIT into 6.27a (this file, the shared record) / 6.27b / 6.27c / 6.27d. The engine moves to a pure DOMAIN module (contracts cannot be imported by domain); the validator (⛔ not only a test) enforces the ruled questions, warning keys, `approvedBy`, ⛔ no alcohol, the counsel flags (per question / option; Row 27 (f)); v2 CURRENT; locks claim → ping → reply (the race was ⛔ not benign); warning keys per LIVE `answer_id`; `pariwar_id` on the answers table; indexes `text[]`; the erasure arm; the REVOKE before the column GRANT; texts while an answer can still be taken (PM5 (iv) — `-305` §2 item 4); the Pariwar's default language (PM22 — the preference table moved to row 6-35); the member surface DARK until a text is accepted, ⛔ no Turnstile, 404 / 409 split, server-resolved words, in-screen pages in 6.30's shell; the helpline's same save / submit shape; F33's real approver keys (Pariwar Admins as Trustee-Lite, ⛔ not State Trustees); PM25: the inspector asks the family OPEN-ENDED (`-305` §2 item 3), ① / ② only (③ / ④ owed by 6-32), the console field OPTIONAL, the kinds filtered (6.27b); Rows 27 / 28 reserved, Row 27 (c) Closed by `-303`, (f) health counsel, (g) CF1–CF3; stale text from v1.0–v1.9 removed (Invariants 5 / 7, AC1, Task 0, "Re-plan by answer" marked historical). |
| 2026-10-10 | 1.9 | The Panel RULED the follow-up note (`-304`): Q3–Q6 A; Q7 / Q8 the Panel's own chain. v2 as ruled; versions per Pariwar / all. |
| 2026-10-10 | 1.8 | The engine shared with the inspector's questionnaire; rows 6-32 / 6-33; Panel Q8. |
| 2026-10-10 | 1.7 | The inspector shown only discrepancies after completing; a notes table. |
| 2026-10-10 | 1.6 | Who sees the answers — PM24 (every approver at their step), PM25 (the inspector and the operator). |
| 2026-10-10 | 1.5 | The questionnaire — versioned, optional, auto-saved, Submit → Thank you; PM23. |
| 2026-10-10 | 1.4 | The Panel RULED `-303`: Q1 A + the language rider, Q2 A; PM22. |
| 2026-10-10 | 1.3 | Aligned with 6.30: the query-string link, the env base URL, one route file, typed DLT variables. |
| 2026-10-10 | 1.2 | The WhatsApp reminder at 48 hours — row 6-31; Trap 17. |
| 2026-10-10 | 1.1 | The link in the text — PM21; row 6-30. |
| 2026-10-10 | 1.0 | Created (`bmad-create-story 6.27`); pinned `5946e411`; routing note Q1 / Q2; PM1–PM20 proposed. |
