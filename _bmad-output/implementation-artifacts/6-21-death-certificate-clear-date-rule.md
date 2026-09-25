---
baseline_commit: a35af210
---

<!--
BASELINE — `a35af210` on `main`. Two facts, stated separately (footgun 24):
  · the pin is an ancestor of HEAD (durable);
  · every code claim below was re-derived at `a35af210` on 2026-09-25, when `a35af210` WAS HEAD (perishable).
Before Task 1, run TWO diffs, because a code-only diff misses governance (footgun 4):
  · CODE:       git diff --name-only a35af210..HEAD -- packages apps scripts
  · GOVERNANCE: git diff --name-only a35af210..HEAD -- .decision-log.md microcopy.yaml friction-budget.md friction-budget.yaml _bmad-output/planning-artifacts/epics.md _bmad-output/implementation-artifacts/deferred-work.md _bmad-output/implementation-artifacts/6-19-correction-return-reminders-and-closure.md _bmad-output/implementation-artifacts/6-20-nominee-declaration-history-and-as-at-death-rule.md
EXPECTED in the governance diff (this story's own Task 0, so no re-verification needed): `.decision-log.md` (`-243`, `-244`),
`epics.md` (§6.21a / §6.21b), the 6.19 file (the CC1 item), and this file and 6.21b's. Anything ELSE in either list — above
all any CODE path — must be re-read, and every claim in *What already EXISTS* that it touches must be re-derived.

⭐ SPLIT (BigDev, 2026-09-25). Story 6.21 was split in two after a fresh-context validate pass judged it about 6.20's
size. THIS file is **6.21a — the rule, its record and the District Admin's console**. It KEEPS the row key
`6-21-death-certificate-clear-date-rule`, because `2026-09-21-241` §4 cites that key. The family's and the helpline's
surfaces are **6.21b**: `6-21b-death-certificate-replacement-surfaces.md`, row `6-21b-death-certificate-replacement-surfaces`.

ADDRESSING RULE: no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (all are
newest-first, so every prepend rots every number). Cite decision ids + clauses, item headings and row keys. Code
`file:NNN` pointers rot too; the FUNCTION NAME is the stable handle.

LETTERS: `D1`…`D16` are 6.21a's own author decisions (PROPOSED here; committed in Task 0 as ONE author-commit,
`2026-09-25-244`). 6.21b's letters are written `6.21b D1`, and other stories' letters are qualified the same way
(`6.20 D4`).

GLYPH REGISTER: `⛔` is used ONLY as a negation prefix ("⛔ not", "⛔ never", "⛔ no"), never as emphasis on a positive
instruction.
-->

# Story 6.21a: The Death Certificate's Clear-Date Rule: the District Admin Accepts or Rejects It, and Only an Accepted Certificate Counts `[SURFACE]`

Status: ready-for-dev

> **Not in `epics.md`'s story list.** Commissioned by the Trustee Panel (Dhiraj Rahul + Kalpana Bharti) through
> `2026-09-20-235` Y and `2026-09-20-236` BB. BigDev placed it as a row on 2026-09-20 (`-236` consequence 3, row
> (b)); `-241` §4 discharged that consequence (*"both rows now exist"*). Like 6.17, 6.18 and 6.20, it needs a
> `> ⚠ Minted by…` section in `epics.md` (Task 0). `epic-6-retrospective` stays `done`: do ⛔ not "correct" the
> placement.
>
> ⭐⭐ **THIS STORY CLOSES A NAMED GO-LIVE COUPLING.** Story 6.20 takes the District Admin's typed certificate date **on
> trust** (the `nominee-determination-persist.ts` header: *"⚠ Until 6-21 lands the entered date is TAKEN ON TRUST (D4)
> — a named go-live coupling"*). `-235` Y makes that date a legitimate as-at-death cutoff **only** when it comes from a
> certificate with a clear date, and 6.21a is what accepts or rejects one.
>
> ⚠ **6.21a has three go-live couplings of its own. All are named; none blocks the build:**
> - **(1) 6.21b.** Until it ships, a family whose certificate is rejected has ⛔ no **screen** to send another. Only the
>   upload API from 6.21a would accept one.
> - **(2) 6.19's CC1 item.** Until it ships, ⛔ no reminder chases that family.
> - **(3′) Counsel's confirmation of the legal basis** for keeping certificates for the claim-record period, including
>   against an erasure request (`2026-09-25-243` consequence 2). ⭐ The original coupling (3), *"the Panel's answer on
>   retention"*, is **DISCHARGED** by `-243` (option C).
>
> Merging is not go-live ([[project_not_in_production_merge_is_not_golive]]).

## The rulings this story builds: the Panel's words, and OUR reading of them

⚠ The **reading** column is ours and is ⛔ **not ratified**. The verbatim text lives in `.decision-log.md`.

| Decision | The Panel said (verbatim) | Our reading |
|---|---|---|
| `-235` Y | *"District admin decides changed after death against death certificate date, **if no date is mentioned on death certificate then certificate is rejected, only certificate with clear date is acceptable.** A change done before a day of death will be assumed to be done by member, everything else will be discarded."* | A certificate with no date, or no clear date, is **rejected**. Only a certificate with a clear date is **accepted**, and only an accepted certificate's date may be 6.20's as-at-death cutoff. ⚠ *"The District Admin judges 'clear'"* is **our reading** (point (3) of `-235`'s own unratified reading). The Panel's words have the District Admin decide *"changed after death"*. We keep it as an author's call because the District Admin is the claim's verifier. |
| `-236` BB | *"Yes, family will be asked to produce certificate with clear date without the claim being denied."* | A rejection asks the family for another certificate. The claim is ⛔ **never** denied for it; it **waits**. |
| `-239` (b) | *"Member's true nominee has to start over and produce original death certificate. However ground inspection can be inherited. Innocent nominee pays nothing."* | A refiled claim is a **new** claim with its **own** certificate and its **own** review. A review is ⛔ never inherited across claims; only the ground inspection is (6.20 AC13). Nothing to build here. |
| `-240` cl.1 | *"RETENTION — only the guilty are kept. The claim form collects identity documents as it must in order to pay anyone; where a claim closes with ⛔ no finding of fraud they are **deleted**."* | ⭐ **Scope settled by `-243`:** a death certificate is ⛔ **not** an identity document, so this deletion does ⛔ not reach it. |
| `-243` (2026-09-25) | *"option C, death certificates are not valid identity documents."* | **Every** certificate (accepted, turned back, and any sent after) is kept **for as long as claim records are kept**; ⛔ nothing is deleted at closure. ⚠ The period is ⛔ not fixed, and the legal basis is **counsel's** (owed before go-live). We read erasure as following the same answer, which is ⛔ unratified. |
| `-238` (remark) | *"there could be cases of fraud by producing fake certificate and all."* | Context only; ⛔ not a ruling on this story. |

**Our default, ⛔ not the Panel's words: `-236` CC1.** Full text: *"A time limit for the replacement certificate. Our
default: **none** — the claim simply waits, chased by the reminders of Story 6.19 (a claim is never refused for a
missing certificate)."* Status: **our default, stands unless objected**. `-237` confirmed only CC2 and CC3; CC1 was
never put back to the Panel. `-241` §3 carries it on **6.19**.

**BigDev's own calls, 2026-09-25.** These are author decisions recorded in `-244`, ⛔ not Panel rulings:
- **(a)** *"keep both the certificates old one and new one, or even any certificate produced thereafter"*. Read as:
  every **uploaded** certificate is kept, and ⛔ nothing overwrites or deletes one **while the claim is open**. ⭐ The Panel then went further (`-243`, option C): kept **for as long as claim records are kept**.
  "Produced" is read as "uploaded" (D6: an accepted certificate still blocks further uploads).
- **(b)** *"future death certificate should be rejected"*. Read as: *"clear" means unambiguous **and possible**, and a
  date after the day of review cannot be a date of death.* This changes ⛔ nothing a family is owed: the family is
  asked again and the claim is ⛔ not denied.

## ⭐ Retention: what is BUILT here vs what must be true before GO-LIVE (`-243`)

| | Build (this story) | Go-live (⛔ not this story; owed before any real claim) |
|---|---|---|
| Keep every certificate | ✅ **Built:** a new object and upload row per upload, ⛔ no overwrite (D2) | — |
| Delete certificates (at closure or on any timer) | ⛔ **Never built.** `-243` option C forbids deletion at closure, and no period exists to enforce | A retention **period** for claim records, at the schedule's out-of-repo home (`-243` cons. 3) |
| Erase certificates on an RTBF request | ⛔ **Never built**; a code comment at the anonymizer names `-243` (D11) | **Counsel's** legal basis for keeping them against erasure and about non-members (`-243` cons. 2) |
| Does the build wait for counsel or the period? | ⛔ **No.** Nothing here deletes, so nothing here can be wrong about when | ⚠ **Go-live does wait.** Coupling (3′) |

## Story

As the **District Admin** verifying a claim,
I want to **accept a death certificate only when it shows a clear, possible date of death, which I enter myself, and
otherwise reject it so the family is asked for another**,
so that **the date that decides whose nominee is paid always comes from an admissible certificate, and no claim is
ever refused because the first certificate was unclear.**

## ⭐ THE INVARIANTS: every AC below serves one of them

1. **The system never accepts or rejects a certificate, and never supplies the date.** The District Admin decides.
   The system **shows** the certificate and the OCR reading, and **records** the verdict. The accept form's date field
   starts **empty** (6.20 invariant 1: *"the system ⛔ never SUPPLIES that date"*).
2. **A rejection never denies and never moves the lifecycle state.** There is ⛔ no edge to `denied`. The claim
   **waits** at the approval gate (a typed 409).
3. **⛔ No death certificate is ever overwritten or deleted** (`-243`, option C: kept for as long as claim records are
   kept). Each upload gets its own object and its own row. This story builds ⛔ no deletion, at closure or anywhere
   else. The retention **period** is unruled, and its enforcement is ⛔ not this story's.
4. **Only a CURRENT, ACCEPTED certificate can supply the as-at-death cutoff.** A 6.20 determination made against a
   certificate that has since been replaced or re-reviewed **stops counting**.
5. **One writer per table.** The OCR job writes `claim_documents` and the uploads table; the review writer writes the
   reviews. ⛔ No status column is added to `claim_documents`.
6. **A review is ⛔ never a row in `claim_verifier_decisions`**, nor in the trustee or R9 tables.
   `getOriginalDeciderActorIds` unions those three, so a row there bars the District Admin from appeal review (6.20 T6).
7. **⛔ No decryption in the domain gate or writer modules.** The no-comparison fence
   (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`) forbids `decrypt` in
   `nominee-determination-persist.ts` and `nominee-name-check.ts`. Any plaintext comparison happens in an **API handler**.

## 📜 Policy meaning (AI-10-1)

⭐ **This story adds benefit-gating predicates:**
- **(1)** A claim cannot be approved without a current, accepted death certificate. The check is a new outer approval
  helper, `assertClaimApprovable`, called at the three approval sites in place of the name-check helper.
- **(2)** 6.20's determination, which approval already requires, now also requires one, with an equal date.

**The sentence, in the member's terms (ours, for the Panel to correct):** *"Your family's claim can be approved only
after a death certificate showing a clear, real date of death has been accepted. If the date is missing, unclear, or
in the future, your family will be asked for another certificate; the claim stays open meanwhile and is never refused
for this."*

**Checked against the Niyamavali? Yes. It is silent on the date, and partly relevant on retention.**
`docs/legal/niyamavali.md` is present locally (git-ignored; the local copy may lag the private canonical one). It is an
**agent-drafted, unratified design reference, never a blocker** ([[feedback_niyamavali_rulebook_not_spec]]).
- §6.1: *"The claim requires the **death certificate**"*. §6.2: the Trust verifies *"document authenticity (including
  an OCR parity check…)"*. Neither mentions a date, a rejection or a replacement.
- §10: erasure is *"subject to lawful retention"*. Termination *"ends membership, not history … in accordance with its
  retention obligations"*. Both are consistent with `-243` (option C).
- ⇒ A §6.1 amendment is owed. It is **a draft for the Panel, ⛔ not committed by BigDev**, and is recorded in `-244`:
  *"…requires the death certificate, which must show a clear date of death. A certificate without one is not
  accepted; the family is asked for another, and the claim is not refused for it."*

**What the sentence leaves out, stated so it is not discovered later:**
- *"There is no deadline, and today no automatic reminder."* The reminder is 6.19's (CC1). Until it ships, a family
  nobody contacts can wait without end. This is named go-live coupling (2).
- *"The District Admin can change their decision while the claim is being reviewed."* A re-review supersedes the old
  one, only inside the D3 window.

## ⚖️ Panel routing: §0 was run on every open point, and ONE point is the Panel's

| The point | §0 verdict | Why |
|---|---|---|
| Must a certificate have a clear date; what if not; is the claim denied | **RULED** | `-235` Y, `-236` BB |
| A time limit for the replacement | **DEFAULT STANDS** (CC1, never explicitly confirmed); carried by **6.19** | `-236`, `-237`, `-241` §3 |
| Who judges "clear" | **the AUTHOR's reading**, consistent with the District Admin as verifier | point (3) of `-235`'s reading, unratified |
| A future date: accept it or not | **the AUTHOR's**: BigDev, 2026-09-25 (reading (b) above) | Changes nothing owed. It goes to the Panel only if BigDev will ⛔ not own the reading |
| Keep every certificate **while the claim is open** | **the AUTHOR's**: BigDev, 2026-09-25 | Integrity. ⭐ Overtaken by `-243`, which keeps them beyond closure |
| Does `-240` cl.1 reach death certificates; may certificates be kept **after closure** or **against an erasure request** | **PANEL — RULED `2026-09-25-243`** (option C). The **legal basis** stays **counsel's** | Routed 2026-09-25 and ruled the same day. Counsel's confirmation is owed **before go-live**, ⛔ not before build |
| Table shapes, currency, windows, key name, which states allow a review | **the AUTHOR's** | "the code should do X" ⇒ D1–D16 |

⇒ If implementation surfaces another question that changes what a family is **owed**, **HALT** and run §0. There is
one template; do ⛔ not invent a second note shape.

## 🎯 What already EXISTS: re-derived at `a35af210` (do ⛔ not rebuild any of it)

**The certificate pipeline (Story 6.5):**
- **`packages/domain/src/schema/claim_documents.ts`.**
  - One row per `(claim_case_id, document_type)`, enforced by the unique index
    `claim_documents_claim_case_id_document_type_uq`.
  - It holds the GCS `storage_object_key`, the Tier-1 OCR ciphertexts (`date_of_death_ciphertext` is the **raw** OCR
    string), `parity_outcome`, `parity_flags`, `ocr_confidence` and `verifier_review_required`.
  - There is ⛔ no "rejected" state.
- **`apps/api/src/modules/claims/claims.documents.handlers.ts` → `uploadClaimDocument`.**
  - The lifecycle guard runs first: `UPLOADABLE_STATES = {intake_converged, documents_pending}`; any other state gets
    409 `claim_document.upload_not_allowed`. MIME, byte cap, `put` and enqueue follow.
  - ⚠⚠ It **reuses** the existing row's `claimDocumentId`, and the key is `…/{documentType}/{claimDocumentId}`. **A
    re-upload therefore overwrites the previous certificate's bytes.**
  - Two routes call it:
    - member: `POST /api/v1/member/claims/:claimCaseId/documents` (`memberSession` + `requireMemberStepUp(claim_handover)`);
    - helpline: `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/documents` (`claim.file`, no step-up).
  - `documentType` is a **query parameter** accepting `death_certificate | ground_inspection_photo | hospital_record`
    (contracts `OcrDocumentType`).
- **The job payload type is declared TWICE:** `ClaimOcrParityJobPayload` in `apps/api/src/context.ts`, and
  `ClaimOcrParityPayload` in `apps/jobs/src/claim-ocr-parity.ts`. `JobEnvelope.actorId` is `string | null`.
- **`apps/jobs/src/claim-ocr-parity.ts` → `runClaimOcrParity`** is the SOLE writer of `claim_documents`.
  - Its `onConflictDoUpdate` overwrites `storage_object_key` and every OCR field **unconditionally**, and it takes ⛔ no
    claim-row lock.
  - It appends `claim.documents_received` from `intake_converged` for **any** document type.
  - It enqueues the peer-mesh SELECT. That job is idempotent on the selection, but on the no-op branch it still
    re-queues the window job and the shepherd-assign job.
- **`packages/domain/src/claim/parity.ts` → `evaluateParity`.** The date checks run only when
  `ocr.dateOfDeath !== null`, so a certificate with **no** date of death can come out `match`. `parity_outcome` gates
  nothing; it is display-only. ⇒ the missing-date **flag** is **6.21b**'s.
- **`packages/domain/src/claim/documents.ts`:** `getClaimDocuments`, `getClaimDocumentById`, `getClaimDocumentByType`
  and `getClaimDocumentReview`.

**The console (6.10 / 6.5):**
- **`claims.verifier-console.handlers.ts`:** `assembleDocumentReview` decrypts the OCR fields and signs the preview URLs.
  **`VERIFIER_CONSOLE_MAX_READS = 16`**, and its doc-block forbids silent "fixes".
- **Contract:** `packages/contracts/src/claims/verifier-console.ts` → `VerifierReviewItem` (`.strict()`, **camelCase**).
  ⚠ The claims contracts are ⛔ **not** registered in `packages/contracts/scripts/emit-openapi.ts`: running emit is a
  no-drift check only. Do ⛔ not register them.
- **Admin:**
  - `SignalsPanel.tsx` renders `<VerifierReviewPanel>`, which renders `<DocumentPreview>`. `DocumentPreview`'s
    `onRequestBetter` and `onMarkIllegible` are **never wired**.
  - `apps/admin/src/routes/VerifierConsoleRoute.tsx`:
    - mounts `NomineeDeclarationPanel` (the model for a District-Admin-only control);
    - gates Approve on `packet.nomineeNameCheck.currentAndPassing`, with an `approveBlockedReason`;
    - maps approve errors in `decisionErrorMessage`.
  - `CycleFreezePage.tsx` and `R9CasePanel.tsx` match `.endsWith('.nominee_determination_required')`.
  - Admin fetch functions live in `apps/admin/src/api/client.ts` (e.g. `postNomineeDetermination`). Hooks live in
    `apps/admin/src/api/hooks.ts` (`DETERMINATION_STALE_CODES`, `useForgetNomineeDeclarationDetails`).

**Story 6.20 (the coupling):**
- **`nominee-determination-persist.ts` → `recordNomineeDetermination`.**
  - It validates `certificateDate` with `isRealCalendarDate` only (exported).
  - It takes the **plaintext** date for validation and the **ciphertext** for storage.
  - Its window is `NOMINEE_DETERMINATION_RECORDABLE_STATES` (= `NOMINEE_NAME_CHECK_RECORDABLE_STATES`, 5 states).
  - Refusals are `NomineeDeterminationRefusedError`, with 14 reasons.
  - ⚠ It imports `./nominee-name-check.js`, and `NOMINEE_DETERMINATION_RECORDABLE_STATES` is evaluated at module load:
    an **import-cycle hazard** (D7).
- **The admin determination form** (`NomineeDeclarationPanel.tsx`):
  - It has a free-typed `certificate_date` (`data-testid="nominee-certificate-date"`).
  - It is fed by 6.20's on-demand **timeline** read (`claims.nominee-declaration.handlers.ts` `getTimeline`), which
    already decrypts the live determination's date and note.
  - Output is `ReadableName`; input is `CalendarDate`.
- **`nominee-name-check.ts` → `assertNomineeNameCheckForApproval`** has three **approval** callers:
  - P1 `adjudicateClaim` (`verifier-decision-persist.ts`);
  - P3 `voteOnFrozenClaim`;
  - P4 `finalizeR9Outcome`.
- ⚠⚠ **It also has a FOURTH, non-approval caller, `isReturnedClaimResubmitted`** (`state-trustee-decision-persist.ts`).
  - It swallows **only three** typed errors; anything else propagates.
  - It feeds `resolveClaimCorrectionState`, which drives the family's *"bank details need correcting"* banner, the bank
    writer and the helpline correction.
- **Wire codes for the determination 409:** `verifier_decision.nominee_determination_required`,
  `cycle_freeze.nominee_determination_required`, `r9_voting.nominee_determination_required`.
- **Fixtures:**
  - `packages/domain/tests/integration/_helpers.ts` has `certificateDateAfterEverything()` (tomorrow, IST),
    `seedNomineeDetermination`, and `seedNomineeNameCheck` with `determination: 'no_discards' | 'skip'`.
  - `apps/api/tests/integration/_nominee-name-check-fixture.ts` has a private copy (`seedDeclarationAndDetermination`,
    reached through `seedNomineeNameCheck`).
  - ⚠ **38 direct `recordNomineeDetermination` calls in tests bypass both helpers** (D12, Task 8).
- **The deferral this story narrows** (`deferred-work.md` §*…story-6-20… (2026-09-23)*, first bullet):
  *"`certificate_date` accepts any real calendar date with no plausibility bound (e.g. far future)"*.

**Gates and counts (read LIVE; read them again before bumping):**

| Thing | Where | Today | 6.21a |
|---|---|---|---|
| Next migration | `packages/domain/migrations/` | last `0121` (journal `when` `1791171600000`) | `0122`, `when` > that |
| Permission catalog | `rbac/permissions.ts`; `tests/rbac/permissions.test.ts` (`toBe(47)` + ledger comment) | **47 / 55 keys** | **48 / 56** (D13) |
| Claim events | `CLAIM_EVENT_TYPES`; pin `tests/claim/dpdpa-consent-events.test.ts`; frozen diff `tests/claim/nominee-name-check-events.test.ts`; `packages/events/src/registry.ts` + `packages/events/tests/claim-registry-coverage.test.ts` | **34** | **35** (D5) |
| Console read ceiling | `VERIFIER_CONSOLE_MAX_READS` | **16** | **17**, with a ledger line (D10) |
| Human-actor gate | `scripts/claim-adjudication-human-actor-invariant/check.ts` `COVERAGE_FLOOR` | **9** | **10** (D9) |
| RTBF anonymizer | `member/anonymize.ts`; `tests/member/rtbf-anonymize.test.ts` (title *"SIXTEEN … nineteen statements"*) | **16 / 19** | **17 / 20**, plus the title (D11) |
| No-comparison fence | `nominee-name-no-comparison-fence.test.ts` `FENCED_FILES` (floor 23) | 23 | amended, ⛔ never weakened (T9) |
| Audit actions | `apps/api/src/audit/audit-sink.ts` union + comment ledger | — | +3 (D9) |

## ⚠ THE TRAPS

**T1: the overwrite.** The upload key reuses `claimDocumentId`, so a second certificate destroys the first. D2 is the
**first** code change.

**T2: "current" must only move FORWARD.** The job's upsert sets the key unconditionally and takes ⛔ no lock. A retried
or delayed job for an **older** upload can make it current again and revive its rejected review. The family would be
asked to replace a certificate they already replaced. ⇒ D2's forward-only rule, under the **claim-row lock**.

**T3: the upload window is narrow, in two ways.**
- **(a)** A District Admin reviews in `verification_in_progress` or later, but uploads today stop at
  `documents_pending`. ⇒ D6 opens the window for a **rejected** certificate.
- **(b)** A claim can reach verification with **no** death certificate at all: another document type moves it forward,
  because the job appends `documents_received` for any type. The approval gate then answers `no_certificate`, and
  nothing could ever supply one. ⇒ D6 **also** opens the window when **no** certificate row exists.

**T4: the approval helper has a FOURTH caller.** If the certificate conjunct goes **inside**
`assertNomineeNameCheckForApproval`:
- **(a)** its new error propagates out of `isReturnedClaimResubmitted`, and the family's bank-status read, the bank
  writer and the helpline correction all answer **500**;
- **(b)** adding it to the swallow list instead keeps a bank-corrected claim *"under correction"*. The family is then
  told their **bank** needs fixing when the **certificate** does.
- ⇒ D7: a new outer helper, used at the three approval sites only.

**T5: ⛔ no decrypt in the domain, and ciphertext never compares equal.** Envelope ciphertext is non-deterministic, and
the fence forbids `decrypt` in the determination writer and in the gate module. ⇒ D8: the **handler** decrypts and
compares, and the writer re-asserts the review **id** under the lock.

**T6: the access-wrapper gate reads comparators as credentials.** In `scripts/access-wrapper-invariants/lib.ts`,
`isVerificationContext` makes a function a "verification context" if it calls `timingSafeEqual`,
`timingSafeEqualString` or `timingSafeHashCompare`. From then on, every runtime-vs-runtime `!==` or `.includes` in that
function is flagged.
- ⇒ The upload id is a **currency token, ⛔ not a credential**. Compare lower-cased ids with `===`, and call ⛔ no
  approved comparator in the writer (D14).
- Scan roots: `apps/api/src/modules/claims`, `apps/api/src/modules/nominee`, `packages/domain/src/claim`, plus the
  channel roots.

**T7: the appeal-conflict table.** See invariant 6.

**T8: import cycles the typecheck cannot see** ([[project_type_only_import_cycle_trap]]).
- `nominee-name-check.ts` will import the certificate conjunct.
- `nominee-determination-persist.ts` imports `nominee-name-check.ts` and evaluates a constant from it at load.
- So if the conjunct's module imports the determination window, or anything that does, you get a runtime init cycle.
- ⇒ D7 puts the conjunct in a **leaf** module.

**T9: the fence must be amended, ⛔ never weakened.** Add every new domain module on the approval or determination path
to `FENCED_FILES`, and raise the anti-vacuity floor to match: the leaf certificate module, the review writer and the
review read. Assert that `decrypt` is absent from the leaf and the writer.

**T10: PII.**
- The accepted date and the note are **Tier-1**. They ⛔ never go in an event, a log line or an audit context.
- The console packet carries ⛔ **no** decrypted date.
- The date is decrypted **on demand**, only in the history read and in 6.20's timeline read, each audited with ids
  only (6.20's decrypt-on-demand posture).

**T11: the fixtures are the blast radius, and it is bigger than the two helpers** (D12).

**T12: legacy rows.** A `death_certificate` row created before `0122` has **no** upload row. It therefore has no token
and can never be reviewed or approved.
- ⛔ Not in production ⇒ ⛔ no backfill.
- Dev and test databases are affected. Specs that seed `claim_documents` directly must seed the upload row too (D12).

**T13: the limit-clamp gate.** Every dynamic `.limit()` goes through `clampLimit`
([[project_domain_limit_clamp_and_savepoint_retry]]).

## 🗄️ Who writes what: one writer per table or column (invariant 5)

| Table / column | Production writer (the ONLY one) | What it may do | ⛔ Never written by |
|---|---|---|---|
| `claim_documents` | the OCR job, `runClaimOcrParity` | upsert the current certificate, forward-only (D2) | the upload handler, the review writer, any route |
| `claim_death_certificate_uploads` | the OCR job, same transaction as the upsert | INSERT only (`ON CONFLICT (upload_id) DO NOTHING`) | the upload handler (T2 race), the review writer, the anonymizer |
| `claim_death_certificate_reviews` | the review writer, `recordDeathCertificateReview` | INSERT; UPDATE of the two supersession columns (one-way) | the OCR job, the determination writer, any other route |
| `claim_death_certificate_reviews` Tier-1 columns | the anonymizer, `anonymizeMember` | UPDATE to the sentinel only (D11) | anything else after the INSERT |
| `nominee_determinations.death_certificate_review_id` | the determination writer, `recordNomineeDetermination` | set at INSERT | the review writer. The DB's ON DELETE SET NULL is the only other change |
| `events_log` (`claim.death_certificate_reviewed`) | the review writer, via `projectClaimState` | append | anything else |

⭐ **The one exception is test-only:** `seedDeathCertificate` (D12) raw-inserts `claim_documents` and upload rows, because
no domain writer exists for them. It lives under `tests/`, and ⛔ no production path may import it. ⛔ No migration
back-fills any of these tables (T12). ⚠ **What the DB enforces, and what it does ⛔ not:** `0122` grants `twt_app`
SELECT + INSERT, and column UPDATE only where the table above says so (the `0119` GRANT order). The append-only and
one-way triggers apply to **every** role. But the grants do ⛔ not tell one app-role caller from another: the review
writer and a stray route share `twt_app`. The jobs service login (BYPASSRLS, per `claim-ocr-parity.ts`'s deps) is
bounded by the triggers, ⛔ not by the grants. ⇒ writer ownership is enforced by **code review, the triggers and the
tests**, ⛔ by grants alone.

## ⚖️ Decisions: the AUTHOR's (⏳ PROPOSED; committed in Task 0 as ONE author-commit, `2026-09-25-244`)

⭐ The precedent is `-228` / `-241`. The key-minting discipline is `-195` cl.2: the key is minted **in** `-244`,
⛔ never inside the build.

- **D1: the reviews table, `claim_death_certificate_reviews`.**
  - **Columns:**
    - `review_id` (PK, branded `DeathCertificateReviewId`);
    - `claim_case_id` (FK to `claims`, **ON DELETE CASCADE**);
    - `pariwar_id`;
    - `deceased_member_id` (the `claims` cache, ⛔ no FK; the RTBF key);
    - `upload_id` (FK to `claim_death_certificate_uploads`, **ON DELETE CASCADE**: the certificate judged);
    - `verdict` (`accepted | rejected`);
    - `rejection_reason` (`no_date_of_death | date_of_death_unclear | date_of_death_in_future`; rejected only);
    - `accepted_date_ciphertext` (Tier-1 `YYYY-MM-DD`; accepted only);
    - `note_ciphertext` (Tier-1, **required**);
    - `decided_by_actor_id`;
    - `decided_by_display` (snapshotted via `getDisplayName`, ⛔ never email-derived);
    - `decided_at`;
    - `superseded_at`, `superseded_reason` (`re_reviewed | replaced`);
    - `supersedes_review_id` (self-FK).
  - **CHECK constraints:** `verdict='accepted'` ⇔ date not null ⇔ reason null. Supersession columns are set together.
  - **Index:** a partial unique index, one live review per claim, `WHERE superseded_at IS NULL`.
  - **Grants:** SELECT and INSERT, plus column UPDATE on the two supersession columns and the two ciphertexts only.
  - **Triggers:**
    - an append-only guard with 0119's cascade exemption (`pg_trigger_depth() > 1`), so spec cleanup by
      `DELETE FROM claims` works;
    - a **one-way supersession trigger**, copied from `0121_nominee-determination-supersession-one-way.sql`, so a
      superseded review can ⛔ never be revived.
  - **Who supersedes:** the **review writer**. It stamps `re_reviewed` when the live review's upload is the current one,
    and `replaced` when the live review judged an older upload.
- **D2: the uploads table, `claim_death_certificate_uploads`, and every certificate kept (`-243`, option C).**
  - **Columns:**
    - `upload_id` (PK, branded `DeathCertificateUploadId`);
    - `claim_case_id` (FK to `claims`, CASCADE);
    - `pariwar_id`;
    - `deceased_member_id`;
    - `claim_document_id` (FK to `claim_documents`, CASCADE);
    - `storage_object_key`;
    - `content_type`;
    - `byte_size`;
    - `channel` (`member_app | helpline`);
    - `uploaded_by_actor_id` (**nullable**: it is the envelope's `actorId`);
    - `uploaded_at` (**the handler's** clock, ⛔ not the job's).
  - **Protection:** ⛔ no PII column. Grants: SELECT and INSERT only (⛔ no UPDATE, ⛔ no DELETE). An append-only trigger
    with the cascade exemption.
  - **Handler (for `death_certificate` only):** it mints `uploadId` and `uploadedAt`. The key becomes
    `…/death_certificate/{claimDocumentId}/{uploadId}`. It adds `uploadId`, `uploadedAt` and `channel` to **both**
    payload types. Other document types are **unchanged**, overwrite behaviour included.
  - **Sole writer: the OCR job, in one transaction:**
    1. `SELECT … FOR UPDATE` the claim row. This serialises the job with the review writer; both lock the claim row
       first.
    2. Insert the upload row with `ON CONFLICT (upload_id) DO NOTHING`. Its `claim_document_id` comes from the
       **upserted** row via `.returning(...)`, ⛔ not from the payload: in a first-upload race, two handlers mint
       different ids and the upsert keeps the first.
    3. Move the `claim_documents` key **forward only**: upsert only if no current upload exists, or the incoming
       `uploaded_at` is ≥ the current upload's (looked up in the uploads table by the row's key). Otherwise the upload
       is **kept** (its row exists) but ⛔ not made current.
  - **Tolerance:** a job whose payload has **no** `uploadId` (enqueued before deploy) writes ⛔ no upload row and keeps
    today's behaviour. T12 applies to it.
  - **Current certificate** = the upload whose `storage_object_key` equals the row's current key. A review is
    **CURRENT** iff it is live **and** its `upload_id` is the current certificate's.
  - **Failures:**
    - An enqueue failure is unchanged: the handler's compensation deletes the object, and ⛔ no row was written.
    - ⚠ A job that fails permanently (DLQ) leaves an object with ⛔ no row. This is the pre-existing 6.5 class
      (*"OCR job DB failure retries indefinitely"*), and it now also strands a replacement. Annotated, ⛔ not fixed.
  - **Retention is RULED (`-243`, option C):** every certificate is kept for as long as claim records are kept. Build
    ⛔ no deletion and ⛔ no erasure of certificates. The period and counsel's basis are owed elsewhere (below).
- **D3: the review window reuses `NOMINEE_DETERMINATION_RECORDABLE_STATES`.** Import it **only** in the review writer
  and the API guard (T8). A review needs a current certificate that has an upload row. Outside the window, or with no
  upload row, the writer refuses (see the refusals list below).
- **D4: acceptance needs a date the District Admin enters that is real and ⛔ not in the future.**
  - Validate with `isRealCalendarDate`, and require the date to be ≤ `istDateOf(now)`. Reuse `cycle-calendar`; ⛔ never
    a seventh copy of the IST offset.
  - `now` is **injected**: the route passes none; the fixtures pass a future `now`.
  - Accepting a future date is refused (`accept_future_date`). The District Admin **rejects** with
    `date_of_death_in_future` instead. The system ⛔ never turns an accept into a reject.
  - This narrows the 6.20 deferral **for the upper bound only**. The lower bound (e.g. before the deceased's DoB) is
    **re-deferred** with the same trigger ([[feedback_closure_language_precision]]).
- **D5: ONE identity annotation event, `claim.death_certificate_reviewed`** (the 35th).
  - **Payload,** via `requireIdentityTransition({ ...auditShape, … })`:
    - `from_state` = `to_state` = the current state;
    - `trigger: 'death_certificate_review'`;
    - `actor`, `review_id`, `upload_id`, `verdict`, `rejection_reason | null`, `supersedes_review_id | null`;
    - ⛔ no date, ⛔ no note.
  - An **identity** reducer case in `claim/state.ts`, commented in the house style. ⛔ Not added to `member/overlay.ts`.
  - Bump the count pin. Add a 6.21a block to the frozen-vocabulary diff (⛔ never loosen 6.18's or 6.20's).
  - **Register it** in `packages/events/src/registry.ts`: *"the 35th claim event; identity transition; NO PII …"*.
- **D6: the upload window, for `death_certificate` only.** Enforced in `uploadClaimDocument`, before MIME, storage or
  the queue, in the same scope tx:
  - **Accepted in the D3 window** when the current live review is **`rejected`**, **or** no `death_certificate` row
    exists (T3(b)).
  - **Refused, 409 `claim_document.certificate_accepted`,** when the current review is **accepted** (BigDev 2026-09-25:
    an accepted certificate blocks further uploads). A re-review to `rejected` reopens the window.
  - **Refused, 409 `claim_document.certificate_awaiting_review`,** when a row exists but has no live current review
    (uploaded, not yet reviewed). ⛔ No silent pile-up of unreviewed replacements.
  - Every other state or type keeps today's 409.
- **D7: the approval conjunct, in a LEAF module.**
  - **The leaf:** `packages/domain/src/claim/death-certificate-approval.ts`, importing **only** schema tables, ids and
    `errors.ts`.
  - **Its conjunct,** `assertDeathCertificateAcceptedForApproval(db, pariwarId, claimCaseId)`, throws
    `DeathCertificateAcceptanceRequiredError` (→ 409) with one of these reasons:
    - `no_certificate`: no row;
    - `not_reviewed`: the current upload has no live current review;
    - `rejected`: the current review is rejected;
    - `determination_stale`: the live determination's `death_certificate_review_id` is ⛔ not the current accepted
      review, **including a null FK** (a 0119-era determination).
    - With **no** determination at all, it passes, and the inner helper's `NomineeDeterminationRequiredError` answers.
  - **The outer helper,** **`assertClaimApprovable`**, in `nominee-name-check.ts`:
    - It runs the conjunct first, then `assertNomineeNameCheckForApproval`.
    - P1, P3 and P4 switch to it.
    - `isReturnedClaimResubmitted` stays on the **inner** helper, unchanged (T4).
    - The *"ONE HELPER, THREE CALL SITES"* doc-block moves to the outer helper. The inner one names its two callers.
      ⛔ No rename.
  - **Wire codes,** in each handler that maps `NomineeDeterminationRequiredError`, each with `details.reason`:
    `verifier_decision.death_certificate_acceptance_required`,
    `cycle_freeze.death_certificate_acceptance_required`, `r9_voting.death_certificate_acceptance_required`.
- **D8: the 6.20 coupling. The HANDLER compares; the writer re-asserts the id.**
  - **In `claims.nominee-declaration.handlers.ts` `postDetermination`:**
    - Read the current accepted review and **decrypt** its date (the handler's field-class helper).
    - If the request's `certificate_date` differs, return 409 `nominee_determination.certificate_date_mismatch`.
    - If there is no current accepted review, return 409 `nominee_determination.certificate_not_accepted`.
    - Otherwise pass the writer the plaintext date (for 6.20's own D6 validation, as today), its ciphertext, and the
      `deathCertificateReviewId`.
  - **In `recordNomineeDetermination`:**
    - Add `deathCertificateReviewId` to the input.
    - **After all of 6.20's existing validations** (so its refusal tests keep their reasons), and under the claim-row
      lock, re-assert that this id is the current accepted review; otherwise refuse `certificate_not_accepted`.
    - Store it in `nominee_determinations.death_certificate_review_id`, a new nullable FK with **ON DELETE SET NULL**.
      It is nullable because 0119-era rows exist in dev and test databases.
    - ⛔ No `decrypt` in the writer (the fence). Add the two new reasons to `NomineeDeterminationRefusedError`.
  - **Admin:**
    - 6.20's **timeline read** (`getTimeline`, already on-demand and audited) gains
      `accepted_certificate: { review_id, accepted_date } | null`, decrypted there. Its output schema is
      `ReadableName`, ⛔ not `CalendarDate`: an RTBF sentinel or a failed decrypt must ⛔ not 500 the parse.
    - The determination form shows it **read-only**, sends it, and no longer asks for it to be typed.
    - Update `certificateDateHelp` and `incomplete` in `claim-verification/i18n-en.ts`.
    - Map both reasons in `nominee-errors.ts`, and add both to `DETERMINATION_STALE_CODES` (`hooks.ts`).
  - ⚠ A re-review or a replacement makes the determination `determination_stale`. The District Admin re-determines,
    which changes the declaration token, **so the 6.18 name check must be re-recorded too.** The admin copy must say so.
- **D9: the admin routes.** A new file, `apps/api/src/modules/claims/claims.death-certificate.routes.ts` (plus its
  handlers).
  - **Plumbing:**
    - Register it in `apps/api/src/modules/claims/index.ts`.
    - Enroll it in the human-actor gate: `COVERAGE_FLOOR` 9 → 10, `expectedMethods: ['post', 'get']`.
    - District: use the **exported** preHandler `resolveNomineeNameCheckDistrict()` (`claims.nominee-name-check.routes.ts`),
      then a **local** closure `(r) => r.nomineeNameCheckDistrict ?? null`. `districtFromStash` is a per-file local
      closure, ⛔ not a shared helper.
  - **`POST …/admin/claims/:claimCaseId/death-certificate/review`:** the D13 key, `district`.
    - Body: `{ verdict, certificate_token, accepted_date?, rejection_reason?, note, expected_live_review_id }`.
    - Encrypt, then call the writer, then `emitAuthAudit` with ids only: `admin_claim.death_certificate_reviewed` or
      `admin_claim.death_certificate_review_rejected`.
  - **`GET …/admin/claims/:claimCaseId/death-certificate/history`:** `claim.verify`, reused because the same holders
    already see the certificate and its OCR date.
    - It lists **every upload** for the claim, newest first, including never-reviewed ones.
    - Each carries its signed preview URL, channel and `uploaded_at`, plus its reviews: verdict, reason, who, when, and
      the decrypted date and note.
    - Decrypt after authorizing; clamp the limit; write one audit line, `admin_death_certificate.history_read`, ids
      only.
  - Add all three actions to the `audit-sink.ts` union and its comment ledger.
- **D10: the console item.**
  - **The `death_certificate` `VerifierReviewItem` gains an optional, camelCase `review`:**
    - `status: 'not_reviewed' | 'accepted' | 'rejected'`;
    - `rejectionReason`, `decidedByDisplay`, `decidedAt`, `liveReviewId`;
    - `certificateToken` (= the current `upload_id`, or `null`);
    - `viewer: { canReview }`, computed **server-side** at the deceased's district from the actor's grants (6.20's
      `viewer.can_determine` pattern);
    - ⛔ no decrypted date on the packet (T10).
  - **Read ceiling:** one new counted read (reviews ⋈ uploads for the current key). Raise `VERIFIER_CONSOLE_MAX_READS`
    16 → **17**, with a ledger line in the house form.
  - **Admin, `<DeathCertificateReviewControl>`:**
    - Mount it in **`VerifierConsoleRoute.tsx`** beside `NomineeDeclarationPanel`, **only when `viewer.canReview`**.
    - **Accept:** an empty date input, with the OCR reading beside it (labelled as the OCR's), and a note.
    - **Reject:** a radio of the three reasons, and a note.
    - Thread `onRequestBetter` through `SignalsPanel` → `VerifierReviewPanel` → `DocumentPreview`, **only** when
      `canReview`, to open the reject form. `onMarkIllegible` stays unwired: one verdict gets ⛔ no second button.
  - **The history:** on demand. It renders the notes, because Tier-1 shipped with ⛔ no reader is a defect. On close and
    on a claim change it calls `removeQueries` (the `useForgetNomineeDeclarationDetails` A→B→A pattern).
  - **Approve gating in `VerifierConsoleRoute.tsx`:**
    - `canApprove` also requires an accepted, current certificate;
    - `approveBlockedReason` names the certificate reason;
    - `decisionErrorMessage` maps the new code.
    - `CycleFreezePage.tsx` and `R9CasePanel.tsx` map `.death_certificate_acceptance_required`, in trustee wording.
  - **Accessibility:** status is ⛔ never conveyed by colour alone, and the accept and reject controls have distinct
    accessible names.
- **D11: RTBF.**
  - `anonymizeMember` gains one statement for the **reviews** table, keyed on `deceased_member_id`: both ciphertexts go
    to the sentinel.
    - Declare the field-class constant in `apps/api/src/context.ts`, and its by-value twin in `anonymize.ts`.
    - Test: 19 → 20 statements, 16 → 17 tables, **and the test title**.
  - The uploads table has ⛔ no PII column, so it needs no statement.
  - **The certificates themselves (OCR fields and objects) are ⛔ not erased — BY RULING** (`-243` option C; our
    unratified reading applies it to erasure too). Counsel's legal basis is owed before go-live. Write a code comment at
    the anonymizer naming `-243`, so a later reader does ⛔ not "fix" the absence.
  - DSAR is ⛔ not in scope (`claim_history` has *"NO source system"*).
  - Annotate 6.20's deferral *"Untraced: … whether RTBF can pass for a member with a live claim"*: it **can**, for a
    `terminated` member (`resolveRtbfLegality`).
- **D12: the fixtures.**
  - **(a) Two new helpers in `_helpers.ts`:**
    - `seedDeathCertificate(client, { pariwarId, claimCaseId, uploadedAt? })`: a **test-only** raw insert of the
      `claim_documents` row and its upload row. The job is the production writer; there is ⛔ no domain writer.
    - `seedAcceptedDeathCertificate(client, { …, date, now })`: seeds a certificate, then accepts it through the
      **real** review writer with the injected `now`.
  - **(b) A new option on the existing helpers:** `seedNomineeDetermination`, `seedNomineeNameCheck` (domain) and the
    api fixture gain `certificate: 'accepted' | 'skip'`, mirroring `determination: 'no_discards' | 'skip'`. The default
    is `'accepted'`, using the determination's own date.
  - **(c) Patch ONLY these direct callers,** each by calling the seeder once:
    - `packages/domain/tests/integration/claim/nominee-determination.spec.ts`: its local `base()` builder and `CERT`,
      about 32 calls. Seed once per claim.
    - `packages/domain/tests/integration/nominee/nominee-history-concurrency.spec.ts` (2 calls).
    - `apps/api/tests/integration/claims/nominee-name-check.spec.ts` (2 calls).
    - `apps/api/tests/integration/claims/nominee-declaration.spec.ts` (HTTP determinations).
    - `apps/api/tests/integration/claims/verifier-console.spec.ts` and `verifier-console-shape.spec.ts`. They raw-insert
      their own `death_certificate` rows after `seedNomineeNameCheck`, which would hit the unique index (23505). Pass
      `certificate: 'skip'` there, or use the seeded row. The shape spec pins the document list.
  - **(d)** Run the full suites. Fix each collateral red by **seeding**, ⛔ never by loosening a guard.
- **D13: the ONE permission key, `claim.review_death_certificate`.**
  - It records the District Admin's accept/reject verdict. Dimension `district`; holder `district_admin`. `super_admin`
    holds every key automatically, so write ⛔ no explicit grant. It matches `PERMISSION_KEY_REGEX`.
  - **Reuse-check:**
    - ⛔ not `claim.determine_nominee_declaration`: that judges which declaration governs, ⛔ not whether a document is
      admissible;
    - ⛔ not `claim.approve`: approving a claim ≠ admitting a document;
    - ⛔ not `claim.check_nominee_name`: that is a name verdict.
  - The history read reuses `claim.verify`.
- **D14: no constant-time compare.** The upload id is ⛔ not a secret (T6). Use `===` on lower-cased branded ids, and
  call ⛔ no approved comparator in the writer.
- **D15: ⛔ no lifecycle state and ⛔ no notification dispatch** ([[project_channels_no_live_dispatch_yet]]). The family
  learns through 6.21b's surfaces and the shepherd District Admin. The automatic reminder is 6.19's (CC1).
- **D16: CC1 gets a carrier that actually carries it.** Task 0 **appends** a CC1 item to
  `6-19-correction-return-reminders-and-closure.md`, stating verbatim:
  - *"a claim is never refused for a missing certificate"* (CC1's own words);
  - *"⛔ the `-229`…`-232` day-90 closure does NOT apply to a certificate wait"*: that loop ends in a non-appealable
    refusal, which would breach `-236` BB;
  - *"the certificate reminder's schedule and channels (incl. letters for a dead number) are UNRULED — 6.19 runs §0 on
    them"*;
  - its trigger: 6.21a's domain helper **`isDeathCertificateReplacementRequested`** (Task 2).

**The review writer's refusals** (`DeathCertificateReviewRefusedError`; wire code `death_certificate_review.<reason>`;
all 409 except `not_found` → 404):
- `not_found`
- `not_reviewable` (outside the window)
- `no_certificate` (no current upload row)
- `stale_certificate` (the token is ⛔ not the current upload)
- `stale_supersession` (the `expected_live_review_id` does not match)
- `missing_display`
- `missing_note`
- `invalid_date`
- `accept_future_date`
- `reason_on_accept`
- `missing_reason`
- `date_on_reject`

**Where each 2026-09-25 decision is recorded** (the owner of each record; verified 2026-09-25):

| # | BigDev's call (2026-09-25) | Owning story + section | Owning record |
|---|---|---|---|
| 1 | Keep every certificate, old and new and any after | 6.21a *BigDev's own calls* (a), D2 | `-244`; its scope was then **widened by the Panel** in `-243` |
| 2 | A future-dated certificate is rejected | 6.21a (b), D4 | `-244` |
| 3 | `certificate.replacement_helpline` wording | 6.21b D4 | `-244` |
| 4 | A separate future-date message | 6.21b D4 (`certificate.replacement_body_future`) | `-244` |
| 5 | Split 6.21 into 6.21a / 6.21b | both headers; `sprint-status.yaml` (the `6-21b` row + ledger `2026-09-25c`) | `-244` |
| 6 | Draft the routing note now | the routing note | ⭐ **`-243`** (the Panel's ruling), ⛔ not `-244` |
| 7 | Hindi uses `तिथि` | 6.21b D4 | `-244` |
| 8 | An accepted certificate blocks further uploads | 6.21a D6 | `-244` |
| — | `certificate.missing_body` (the author's copy, needs BigDev's yes) | 6.21b D4 | `-244` |
| — | 6.21b D1–D8 | 6.21b §Decisions | `-244`: **ONE author-commit covers both stories**, so 6.21b needs no second entry |

**Owed elsewhere, recorded in `-244` (⛔ not discharged by it):**
- **counsel's confirmation of the legal basis** for keeping death certificates and their OCR data for the claim-record
  period, including against an erasure request and about non-members (`-243` consequence 2);
- the **retention-schedule row** "claim records, incl. death certificates", with a period, at the schedule's own
  out-of-repo home (`-243` consequence 3);
- the **Niyamavali** drafts for the Panel: §6.1 (the clear date) and a note that certificates are kept with the claim
  record (`-243` consequence 4).

## Acceptance Criteria

### AC0: Governance first (Task 0)

**Then** BEFORE any code:
- **(a)** ONE author-commit, `2026-09-25-244`, records **6.21a D1–D16, 6.21b D1–D8, `certificate.missing_body`, and
  every BigDev call in the *Where each decision is recorded* table** (except #6, which is `-243`'s). Its §0 line reads
  *"the author's; retention after closure was the Panel's and is ruled at `-243`"*.
- **(b)** The D13 key is minted in it, with its reuse-check.
- **(c)** `epics.md` gains `### Story 6.21a` and `### Story 6.21b`, each with the `> ⚠ Minted by…` header.
- **(d)** 6.19's file gains the D16 item.
- **(e)** The routing note, now **RULED** (`-243`, its ruling block filled in and the rest unedited), is committed
  together with the `-243` entry.
- **(f)** The governance edits are committed alone, before any code.

**And** without BigDev's confirmation of (a), the dev agent **HALTs**. It ⛔ never self-authors an author-commit.

### AC1: Accept only with a real, non-future date the District Admin enters (`-235` Y; D1, D3, D4)

**Given** a claim in the D3 window with a current certificate (it has an upload row), and a District Admin holding D13
at the deceased's district
**When** they accept with a date, a note, the current `certificate_token` and the `expected_live_review_id`
**Then:**
- a review row is written (Tier-1 date and note, snapshotted display name);
- `claim.death_certificate_reviewed` is appended in the same transaction;
- the lifecycle state is unchanged;
- an audit line with ids only is written.

**And** every refusal in the list above returns its exact wire code and is audited as `_review_rejected`. That includes
`accept_future_date`, `missing_display` and the three shape refusals.
**And** the accept form's date input starts **empty**, with the OCR reading beside it and labelled as the OCR's.

### AC2: Reject, and the claim is ⛔ not denied (`-235` Y, `-236` BB; D5, D7, D15)

**When** the District Admin rejects with one of the three reasons and a note
**Then:**
- a rejected review row and the event are written;
- `replayClaimState` is identical before and after;
- ⛔ no row appears in `claim_verifier_decisions`, `claim_state_trustee_decisions` or the R9 tables;
- `getOriginalDeciderActorIds` does ⛔ not return the District Admin.

**And** P1 (`adjudicateClaim` approve), P3 (`voteOnFrozenClaim` approve) and P4 (`finalizeR9Outcome` approved) each
answer 409 `…death_certificate_acceptance_required` with `reason: 'rejected'`.
**And** the claim can still be `claim.verifier_denied` for other reasons.
**And** take a claim the Pariwar Admin **returned** for a bank correction, whose bank details were then corrected and
re-checked: a rejected certificate leaves `resolveClaimCorrectionState` **exactly** as it was without the rejection (T4).

### AC3: Every certificate is kept, a late or missing certificate can be sent, and "current" only moves forward (D2, D6)

**Then:**
- In the D3 window, a `death_certificate` upload is accepted (202) when the current review is `rejected` **or** no
  certificate row exists.
- It is refused with `certificate_accepted` or `certificate_awaiting_review` in the other two cases, before anything
  reaches storage or the queue.
- After the job:
  - a new upload row exists;
  - the **old object is still readable**;
  - the rejected review is no longer current;
  - ⛔ no `claim.documents_received` is appended;
  - peer mesh: ⛔ no new selection and ⛔ no new event.
- **Out of order:** when a job for upload A lands **after** upload B's job, A's row is kept but A is ⛔ not made
  current. This is proven by running two jobs in reverse order.
- A retried job writes **exactly one** upload row, and a first-upload race between two handlers breaks ⛔ no FK.
- A payload with no `uploadId` behaves as before (tolerance).
- Other document types keep an unchanged key and unchanged behaviour.

### AC4: Only an admissible certificate supplies the cutoff (6.20 coupling; D7, D8)

**Then:**
- A determination is refused without a current accepted certificate (`certificate_not_accepted`), or with a different
  date (`certificate_date_mismatch`).
- 6.20's existing refusal tests keep their reasons (the refusal order).
- The determination stores `death_certificate_review_id`.
- A re-review or replacement makes approval answer `determination_stale`, including for a null FK. A fresh
  determination plus a fresh name check clears it.
- The determination form shows the accepted date read-only.

**And** the go-live coupling is annotated **"closed by the build — discharges on the build, ⛔ not on the record"** (in
the form of `-241` §4(4)). Each note is appended, ⛔ never a rewrite, at **all four** sites:
- the `nominee-determination-persist.ts` header;
- the 6.20 story's header blockquote;
- the 6.20 Completion Notes residual;
- the closing blockquote of `epics.md` §Story 6.20.

**And** the 6.20 plausibility deferral is marked **"DISCHARGED for the upper bound (D4); the lower bound
re-deferred"**.

### AC5: The console (D9, D10)

**Then:**
- The death certificate's item shows the review status, reason, who and when.
- The control shows **only** for `viewer.canReview`: a verifier sees ⛔ no control, and a test proves it.
- "Request a better document" opens the reject form.
- Approve is disabled until the certificate is accepted, and names the certificate reason.
- The trustee surfaces word the new 409.
- The history lists every upload, including unreviewed ones, with previews and notes. It is forgotten on close and
  on a claim change.
- The console stays within 17 reads on its worst path, and the ceiling test proves it.

### AC6: Keys, gates, events, RTBF and the fence (D5, D9, D11, D13, T9)

**Then:**
- The catalog goes 47 → 48 and keys 55 → 56, with the ledger comment on the pin. `roles.test.ts` pins the single holder.
- `CLAIM_EVENT_TYPES` goes 34 → 35, with the pin, the frozen block and the registry entry; the registry-coverage test
  is green.
- `COVERAGE_FLOOR` goes 9 → 10.
- The anonymizer goes to 20 statements / 17 tables, plus its title. A live-DB RTBF spec proves both columns are
  scrubbed.
- The no-comparison fence is amended (new files + floor) and still goes red on a planted violation.
- The access-wrapper, domain-accessor, claim-state and claim-canonical-id gates are green. One planted violation in a
  new file is proven red, then reverted.
- `contracts:emit-openapi` runs with ⛔ no drift. The claims contracts are ⛔ not registered, and must ⛔ not be.

### AC7: Nothing else moves

- ⛔ No lifecycle state, ⛔ no `dispatch()`, ⛔ no reminder.
- ⛔ No certificate deletion or erasure (`-243`), and ⛔ no review inheritance.
- ⛔ No rename of `assertNomineeNameCheckForApproval`.
- ⛔ No change to `isReturnedClaimResubmitted` or `resolveClaimCorrectionState`.
- ⛔ No member or helpline surface; that is 6.21b.

### AC8: The proof

**Then** these tests are **executed** on `twt-test-pg :5433`:
- **(i)** accept, reject and every refusal, **each with its audit line**;
- **(ii)** AC2's no-denial, no-appeal-conflict and correction-state assertions;
- **(iii)** P1/P3/P4 × `no_certificate | not_reviewed | rejected | determination_stale` (including a null FK), then a
  pass;
- **(iv)** AC3 through the **real job**, with the in-memory storage and the OCR double, including the reverse-order and
  first-upload race cases;
- **(v)** the D8 refusals and the refusal order;
- **(vi)** the console item, the `viewer.canReview` split, and the history (forgotten on close);
- **(vii)** access:
  - **cross-Pariwar** denial on the review POST and the history GET;
  - a **tampered-session** test pinned to **404**, with a positive control (the 6.20 family-3 pattern,
    `verifier-decision.spec.ts`);
  - 403 without the key;
- **(viii)** concurrency, built as **holder/waiter** with `pg_blocking_pids` (`holderWaiter`,
  `nominee-history-concurrency.spec.ts`):
  - two reviews ⇒ one 409s;
  - a review against a job commit ⇒ they serialise on the claim row, and the second sees the first. Either the review
    409s `stale_certificate`, or the job's upload arrives after it and is `not_reviewed`.
- **(ix)** an **RLS / constraint regression spec**,
  `packages/domain/tests/integration/rls/claim-death-certificate-policy-regression.spec.ts`, for **both** tables:
  - positive, negative, fail-closed and FORCE RLS;
  - every FK raising 23503;
  - every CHECK, identified by `err.constraint`;
  - the partial unique index;
  - append-only;
  - one-way supersession;
  - the cascade exemption.

**And** every new guard is proven RED by a planted regression, which is reverted and recorded.
**And** the full domain, api, admin, contracts, events and jobs suites are run, and failures are reported as they are
([[project_known_livedb_test_failures]]: the 7 pre-existing domain failures are shared-`PARIWAR_A` pollution).

## Tasks / Subtasks

- [ ] **Task 0: Governance first** (AC0)
  - [x] Draft `2026-09-25-244` (author-commit) — ✅ CONFIRMED by BigDev 2026-09-25 (incl. `certificate.missing_body`):
    - a one-line table of 6.21a D1–D16 **and** 6.21b D1–D8 (the full text stays in the two story files; ⛔ no second copy);
    - `certificate.missing_body` for BigDev's yes;
    - every BigDev call in the *Where each decision is recorded* table, each marked with its owning story section;
    - the D13 key with its reuse-check;
    - the §0 line;
    - "owed elsewhere": counsel's legal basis, the retention-schedule row, and the two Niyamavali drafts for the Panel (all from `-243`'s consequences).
  - [x] Add `### Story 6.21a` and `### Story 6.21b` to `epics.md`, after 6.20. ✅ 2026-09-25
  - [x] Append the D16 item to 6.19's file (appended; ⛔ never a rewrite). ✅ 2026-09-25 — a section, AC12 and Task 11 (6.19 v0.3)
  - [x] **HALT for BigDev's confirmation.** ✅ Confirmed 2026-09-25. Then commit the governance edits alone: `-243` (already recorded), `-244`, the ruled routing note, `epics.md` and the 6.19 item.
- [ ] **Task 1: Migration `0122`** (AC3, AC4, AC6). Hand-authored; journal `when` > `1791171600000`; ⛔ never regenerate
  `0119`–`0121`.
  - [ ] Both tables: FKs with the stated ON DELETE, CHECKs, the partial unique index, grants, the append-only triggers
    with the cascade exemption, and the one-way supersession trigger (a copy of `0121`).
  - [ ] `nominee_determinations.death_certificate_review_id` (nullable, ON DELETE SET NULL).
  - [ ] One policy file for both tables, `packages/domain/src/policies/claim-death-certificate-rls.ts`, plus its
    `policies/index.ts` export.
  - [ ] The Drizzle schemas plus `schema/index.ts`; the two branded ids in `ids/index.ts`.
- [ ] **Task 2: Domain** (AC1–AC4)
  - [ ] `claim/death-certificate-approval.ts`, the LEAF: the conjunct, `isDeathCertificateReplacementRequested`, and the
    current-certificate read.
  - [ ] `claim/death-certificate-review-persist.ts`, `recordDeathCertificateReview`, in this order: claim-row
    `FOR UPDATE`, the window, the token, supersession (`re_reviewed` / `replaced`), D4 with injected `now`, and the
    event via `projectClaimState`.
  - [ ] `claim/death-certificate-review-read.ts`: the console read and the history (clamped).
  - [ ] `assertClaimApprovable` in `nominee-name-check.ts`. Switch P1/P3/P4 to it; leave `isReturnedClaimResubmitted`
    alone; move the doc-block.
  - [ ] D8 in `recordNomineeDetermination`. Add the two new reasons, `DeathCertificateAcceptanceRequiredError` and
    `DeathCertificateReviewRefusedError` in `errors.ts`.
  - [ ] The event schema, `CLAIM_EVENT_TYPES`, the identity reducer case, and the `packages/events/src/registry.ts`
    entry.
  - [ ] Exports in `claim/index.ts`.
- [ ] **Task 3: Upload + job** (AC3)
  - D2 and D6 in `claims.documents.handlers.ts`.
  - `uploadId`, `uploadedAt` and `channel` in **both** payload types (`apps/api/src/context.ts` and
    `apps/jobs/src/claim-ocr-parity.ts`).
  - In the job: the lock, the upload insert, `.returning`, the forward-only upsert and the tolerance.
  - Update both file headers.
- [ ] **Task 4: API** (AC1, AC2, AC4, AC5)
  - [ ] `claims.death-certificate.{routes,handlers}.ts` (D9); register them in `claims/index.ts`.
  - [ ] `death-certificate-crypto.ts`, plus the field class in `context.ts`.
  - [ ] The three wire-code mappings (D7); D8 in `postDetermination`; `accepted_certificate` in `getTimeline`; the
    console item and the ceiling (D10); the audit-sink union.
- [ ] **Task 5: Contracts** (AC5)
  - `packages/contracts/src/claims/death-certificate.ts`: the review request/response and the history.
  - The `VerifierReviewItem.review` extension.
  - The timeline's `accepted_certificate`, with a `ReadableName` output.
  - Run `contracts:emit-openapi` and expect ⛔ no drift.
- [ ] **Task 6: Admin** (AC4, AC5)
  - [ ] `api/client.ts` fetchers and `api/hooks.ts` hooks, including the forget-on-close hook and
    `DETERMINATION_STALE_CODES`.
  - [ ] `<DeathCertificateReviewControl>` and the history in `VerifierConsoleRoute.tsx`. Thread `onRequestBetter`
    through `SignalsPanel` and `VerifierReviewPanel`. Update `canApprove`, `approveBlockedReason` and
    `decisionErrorMessage`.
  - [ ] `CycleFreezePage.tsx`, `R9CasePanel.tsx`, `nominee-errors.ts`, the read-only date in `NomineeDeclarationPanel`,
    and `claim-verification/i18n-en.ts`.
- [ ] **Task 7: Keys, gates, RTBF and the fence** (AC6)
  - The catalog, `roles.ts` and both RBAC tests.
  - The human-actor gate entry and floor.
  - The anonymizer, its test and a live-DB spec.
  - The event pins.
  - `FENCED_FILES`, its floor, and the ⛔-decrypt assertions.
- [ ] **Task 8: Tests** (AC8). D12's fixture changes **first**, then the full suites, then (i)–(ix). Prove each guard red.
- [ ] **Task 9: Records**
  - [ ] Annotate the four coupling sites (AC4).
  - [ ] The 6.20 deferral: the upper bound DISCHARGED, the lower bound re-deferred.
  - [ ] 6.5's *"OCR job DB failure retries indefinitely"*: it now also strands a replacement.
  - [ ] 6.5's *"no audit trail for rejected uploads"*: the two new 409s join it.
  - [ ] 6.20's untraced-RTBF item: answered by D11's trace.
  - [ ] Prepend the `sprint-status.yaml` ledger safely ([[project_sprint_status_safe_prepend]]).

## Dev Notes

### Dependency and sequencing

- **6.20** is `done` (PR #239) and is the base.
- **6.21b** depends on 6.21a: the tables, the D6 window and the status helper.
- **6.19** (`backlog`) will consume `isDeathCertificateReplacementRequested` (D16).
- **6-22** (`backlog`, counsel-gated) is untouched. A suspected **fake** certificate is a 6-22 flag, ⛔ not a 6.21a
  verdict: these verdicts concern the **date** only.

### Files: UPDATE (read each COMPLETELY first) and NEW

**UPDATE:**
- **Domain:**
  - `packages/domain/src/claim/{nominee-name-check,nominee-determination-persist,verifier-decision-persist,state-trustee-decision-persist,r9-voting-persist,events,state,errors,index}.ts`
  - `packages/domain/src/member/anonymize.ts`
  - `packages/domain/src/rbac/{permissions,roles}.ts`
  - `packages/domain/src/schema/{nominee_determinations,index}.ts`
  - `packages/domain/src/ids/index.ts`
  - `packages/domain/src/policies/index.ts`
- **Events:** `packages/events/src/registry.ts`
- **API:**
  - `apps/api/src/modules/claims/{claims.documents.handlers,claims.nominee-declaration.handlers,claims.verifier-console.handlers,claims.verification-decision.handlers,claims.cycle-freeze.handlers,claims.r9-voting.handlers,index}.ts`
  - `apps/api/src/context.ts`
  - `apps/api/src/audit/audit-sink.ts`
- **Jobs:** `apps/jobs/src/claim-ocr-parity.ts`
- **Contracts:** `packages/contracts/src/claims/{verifier-console,nominee-declaration,index}.ts`
- **Admin:**
  - `apps/admin/src/api/{client,hooks}.ts`
  - `apps/admin/src/routes/VerifierConsoleRoute.tsx`
  - `apps/admin/src/modules/claim-verification/{SignalsPanel,VerifierReviewPanel,NomineeDeclarationPanel,nominee-errors,i18n-en,index}.ts(x)`
  - `apps/admin/src/modules/cycle-freeze/CycleFreezePage.tsx`
  - `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`
- **Scripts:** `scripts/claim-adjudication-human-actor-invariant/check.ts`
- **Tests:** the pins named in the Gates table; the D12 fixture and spec files; `nominee-name-no-comparison-fence.test.ts`

**NEW:**
- `0122_*.sql` plus the journal entry
- `schema/claim_death_certificate_{uploads,reviews}.ts`
- `policies/claim-death-certificate-rls.ts`
- `claim/death-certificate-{approval,review-persist,review-read}.ts`
- `claims.death-certificate.{routes,handlers}.ts`
- `death-certificate-crypto.ts`
- `packages/contracts/src/claims/death-certificate.ts`
- `DeathCertificateReviewControl.tsx`, plus the history panel
- the RLS regression spec and the other specs

### Conventions this story touches

- **Event-sourced claim:** every event goes through `projectClaimState` in the writer's transaction. The reducer stays
  total and pure.
- **Tenant isolation:** RLS **plus** an explicit `pariwar_id` predicate everywhere.
- **PII:** Tier-1, encrypted in the handler. Domain writers take ciphertext, plus plaintext **only** to validate it.
- **Attribution:** `getDisplayName`, snapshotted ([[project_admin_display_name_attribution]]).
- **Ids:** branded ids are lower-cased ([[project_branded_ids_lowercase]]).
- **Package boundaries:** domain ⛔ never imports `@twt/contracts`, and contracts ⛔ never import pg-touching domain
  namespaces ([[project_contracts_domain_bundle_boundary]]).
- **Doc-blocks:** grep for `\*\*/` after every edit ([[project_markdown_emphasis_closes_jsdoc]]).

### Testing standards

- Vitest. Live-DB specs run on `:5433`. Assert **membership**; ⛔ never `DROP SCHEMA` ([[project_live_db_test_gotchas]]).
- Run `ci:local` with `env -u DATABASE_URL` ([[project_ci_local_double_run_pollution]]).
- Suite-level `{ timeout: 20000 }`.
- **Parity = run DIRTY input:** AC3 runs the **real job**.

### Previous story intelligence (6.20)

- Governance first, and the record tells the truth.
- Fixtures are the blast radius.
- Surfaces go where the key-holder is: 6.20 shipped a form its viewers could not use, hence `viewer.canReview`.
- Tier-1 data ⛔ never ships without a reader.
- A test must be able to fail as titled; this was 6.20's most common review finding.
- Tampered-session tests pin 404, with a positive control.
- Races are built holder/waiter.
- Audit lines are asserted, including `_rejected` ones.
- Review layers run one at a time ([[feedback_review_layers_one_at_a_time]]).

### Git intelligence

- `HEAD` = `a35af210` (6.20 closure).
- Commit order: `governance(6.21a): …` first, then `feat` / `fix` / `test`.
- **Rebase-merge, ⛔ never squash** ([[project_story_automator_ops]]).
- Run `git fetch origin` before any claim about `origin/main`.

### Latest tech information

⛔ No new dependency: Drizzle, Fastify + zod, pg-boss and React are already in the tree.

### References

- **Decisions:** `2026-09-20-235` Y · `2026-09-20-236` BB, CC1, cons. 3 · `2026-09-21-239` (b) · `2026-09-21-240`
  cl.1 · `2026-09-21-238` · `2026-09-21-241` §3, §4, §6 · `2026-09-04-195` cl.2 · `2026-09-20-228`
- **Routing note:** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-25-6-21-keeping-death-certificates.md`
- **Related stories:** `6-21b-death-certificate-replacement-surfaces.md` · `6-20-…` · `6-19-…` · `6-5-…`
- **Planning:** `epics.md` §Epic 6 / §6.5 / §6.20 · `deferred-work.md` (6.20 2026-09-23, 6.20 chunk 1, 6.5
  2026-07-09)
- **Research:** `_bmad-output/research/p0-2b-bereaved-spouse.md` §3.2 (interviews pending: posture, ⛔ not evidence)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- 2026-09-25: the story was created, validated inline, then validated in a fresh context by three read-only agents.
  After BigDev's decisions it was split into 6.21a (this file) and 6.21b. §0 routed one point (retention after
  closure), and the Panel **ruled it the same day** (`-243`, option C).

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-25 | Created by `bmad-create-story`. |
| v0.2–v0.3 | 2026-09-25 | BigDev: keep every certificate; a future date is rejected; the helpline copy line; a separate future-date message. |
| v0.4 | 2026-09-25 | Inline validate: the fourth caller of the approval helper; the job writes the upload rows; the district stash; the registries; the glyph register. |
| v0.5 | 2026-09-25 | **Fresh-context validate (three read-only agents; every finding re-verified), and SPLIT (BigDev).** This file becomes **6.21a**. The member and helpline surfaces, the copy, the OCR missing-date flag and the helpline upload client move to **6.21b**. The corrections: **(1)** ⛔ no decrypt in the domain: the handler compares, the writer re-asserts the id (T5, D8). **(2)** No constant-time compare (T6, D14). **(3)** "Current" moves forward only, under the claim-row lock (T2, D2); `.returning` for the FK race; the handler's `uploadedAt`; both payload types; a nullable actor; tolerance of old payloads. **(4)** A missing certificate can be uploaded late (T3(b), D6), and uploads awaiting review are refused. **(5)** The old `stale` reason is split into `not_reviewed` / `determination_stale` (D7), with a leaf module against the import cycle (T8). **(6)** `viewer.canReview`; approve gating in `VerifierConsoleRoute`; the `CycleFreezePage` / `R9CasePanel` mappings. **(7)** The fixture blast radius, named file by file (D12). **(8)** 0121's one-way trigger, the cascade exemption, ON DELETE rules, the RLS regression spec, and one policy file for both tables. **(9)** The ⛔-decrypt fence amendment (T9). **(10)** `-240` cl.1 cited: retention after closure is **routed to the Panel** (a new routing note), and keeping every certificate is scoped to **while the claim is open**. **(11)** CC1 re-labelled "default stands", ⛔ not "ruled", and quoted in full; "who judges clear" labelled as our reading; the key given its own letter (D13); `super_admin` needs ⛔ no grant; all four coupling-closure sites listed; "DISCHARGED for the upper bound". **(12)** The 6.19 item now carries the three protections. |
| v0.6 | 2026-09-25 | **The Panel ruled the routing note: `2026-09-25-243`, option C** (*"death certificates are not valid identity documents"*). Every certificate is kept for as long as claim records are kept, and ⛔ nothing is deleted at closure. Invariant 3, D2, D11, the rulings table, §0, AC0(e), AC7 and "owed elsewhere" are updated. Go-live coupling (3) is DISCHARGED and replaced by (3′), counsel's legal basis. ⚠ The pending author-commit is **renumbered `-243` → `-244`** so the log stays in order (the ruling took `-243`). |
| v0.7 | 2026-09-25 | BigDev's pre-Task-0 review. **(1)** The baseline check is now TWO diffs, code and governance, with the expected governance paths listed. **(2)** A *Who writes what* table: one production writer per table/column, plus the test-only seeding exception. **(3)** A build-vs-go-live retention table (`-243`). **(4)** Record ownership verified, and a gap FOUND: 6.21b said its D1–D8 were "recorded in `-244`", but Task 0 / AC0(a) ordered only 6.21a's D1–D16 and two readings. ⇒ AC0(a) and Task 0 now name 6.21b's decisions, `certificate.missing_body` and all eight BigDev calls, and a table maps each call to its owning story and record (the routing-note call is `-243`'s). Status stays `ready-for-dev`. |
