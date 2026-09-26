---
baseline_commit: eab7ba45
---

<!--
BASELINE — `eab7ba45` (`main`, 2026-09-26): 6.21a's PR #241 rebase-merged; its last CODE commit is `8e1432db`/`cb1298b3`/
`6f44f8f5`, and `eab7ba45` itself is governance-only. Every code claim below was RE-DERIVED at `eab7ba45` on 2026-09-26
(see §*Re-pin record*). The previous pin was `a35af210` (2026-09-25, before 6.21a landed) — ⛔ do not diff against it.

⭐ SPLIT (BigDev, 2026-09-25): this is **6.21b** — what the FAMILY and the HELPLINE see and do when a death certificate
is rejected (or was never sent), plus the OCR flag for a missing date of death. The rule, its record and the District
Admin's console are **6.21a** (`6-21-death-certificate-clear-date-rule.md`, row `6-21-death-certificate-clear-date-rule`).

LETTERS: `D1`…`D8` are 6.21b's own author decisions (committed in `2026-09-25-244`). 6.21a's are written `6.21a D2`.
Re-pin findings are `F1`…; questions for BigDev are `Q1`….

GLYPH REGISTER: `⛔` is ONLY a negation prefix.
ADDRESSING RULE: as 6.21a (no `file:NNN` into newest-first logs; function names are the stable handle).
-->

# Story 6.21b: A Rejected or Missing Death Certificate: the Family Is Asked in Their Own Words, and Can Send Another in the App or Through the Helpline `[SURFACE]`

Status: ready-for-dev

> ⭐ **FLIPPED `backlog → ready-for-dev` on 2026-09-26**, on the three-step condition this file set itself:
> 1. ✅ the row `6-21-death-certificate-clear-date-rule` reads **`done`** (PR #241 rebase-merged; the ledger's
>    `2026-09-26c` entry);
> 2. ✅ re-pinned to `eab7ba45`, and every cited 6.21a function name re-verified in the tree (§*Re-pin record*);
> 3. ✅ this flip and its `sprint-status.yaml` ledger line are one edit.
>
> ✅ **Both re-pin calls are ANSWERED — `2026-09-26-247`** (BigDev: *"F1 (a) and Q1 (a), supersede by author-commit"*):
> the status carries `certificate_token` (F1), and a certificate put off at filing can be sent later (Q1, via
> `upload_allowed`). Task 0 is closed.
>
> **Record ownership:** 6.21b's D1–D8 and BigDev's 6.21b calls (the helpline wording, the separate future-date
> message, `तिथि`, and `certificate.missing_body`) are recorded in **`2026-09-25-244`**, the ONE author-commit for both
> stories (its §1 table, §3 calls 3/4/7, and the `missing_body` approval). **`2026-09-26-247`** supersedes D1's
> response, its row 1 (for two states) and its marker rule 2, and fixes the wire spelling as snake_case;
> **`2026-09-26-248`** is an erratum to `-247` §3 (the api-client maps ⛔ no casing). **`2026-09-26-245` §3** had
> already corrected D1 rows 2 and 5 (a legacy row is `missing`). **`2026-09-26-249`** records the blind validate's
> four calls (B1–B4), a correction to `-247` §2's rationale, and the helpline operator lines. ⛔ No other entry exists for 6.21b ([[feedback_supersede_never_reinterpret]]).
>
> **Rulings:** `-235` Y (a certificate with no clear date is rejected) and `-236` BB (*"family will be asked to produce
> certificate with clear date without the claim being denied"*). **BigDev, 2026-09-25:** a future date is rejected, and
> the family gets a **separate** message for it. For the verbatim text and our readings, see 6.21a §*The rulings*.
>
> **Go-live:** 6.21b **discharges** 6.21a's go-live coupling (1) *on its build* (⛔ not on this record). Couplings (2)
> 6.19's CC1 reminder and (3′) counsel's basis under `-243` are ⛔ untouched. Merging is not go-live
> ([[project_not_in_production_merge_is_not_golive]]).

## Story

As **a bereaved family** (in the app, or through the helpline),
I want to **be told plainly when the death certificate we sent cannot be used, and why, and to send another without
starting over**,
so that **our claim keeps moving and we are never left thinking it was refused.**

## ⭐ THE INVARIANTS

1. **The family is told the truth about their claim's state.** *"Your claim is still open and has not been refused"*
   is shown **only** while that is true: inside 6.21a's review window (6.21a D3). Outside it, show nothing new. 6.18
   shipped exactly this defect, fixed by `-242` cl.2 (*"a DENIED claim … told the family their claim 'has not been
   refused'"*).
2. **⛔ No deadline, countdown or urgency** on any replacement surface (`-236` CC1's default: none — CC1 governs the
   **replacement** certificate; for a FIRST certificate put off at filing (row 1a), ⛔ no deadline is the AUTHOR's own
   call, the same posture, ⛔ not CC1's — BW10). ⚠ The filing
   wizard's `document.help`, `document.defer` and `document.saved` say *"within 7 days"*. They must ⛔ not appear on
   the replacement screen.
3. **⛔ No note, date, reviewer or free text reaches the family.** They get a two-value **reason enum** and our copy.
4. **The helpline sees the same SERVER status the family sees**, from the same server-side resolver. The app's
   in-flight marker and the helpline's "sent, being processed" line are each client-only overlays (BW-J5).
5. **The OCR flag shows; it never acts.** A missing date of death is **flagged** for the District Admin. It rejects
   ⛔ nothing, and gates ⛔ nothing. (Verified at `eab7ba45`: the only readers of `parity_outcome` /
   `verifier_review_required` are the console assembler and `VerifierReviewPanel` — display.)

## 📜 Policy meaning (AI-10-1)

**6.21b introduces ⛔ no predicate that gates a member's benefit, and changes ⛔ none.** It **surfaces** 6.21a's (see
6.21a §Policy meaning): `replacement_allowed` is 6.21a's in-window upload predicate read back to the family, ⛔ never a
second definition. The OCR flag (D6) is display-only. `upload_allowed` (`-247` §2) offers the family an upload in two
more states, `intake_converged` and `documents_pending`, where the handler **already** accepts one
(`isDeathCertificateUploadAllowed`). It widens what is **offered**, ⛔ never what is accepted, and adds ⛔ no gate. In
the member's terms: *"a family who put the certificate off at filing can still send it later."* Checked against the
Niyamavali: ⛔ no clause governs **when** a certificate may be sent (§6.1's clear-date draft is unadopted, `-244` §5).
No conflict.

## 🔁 Re-pin record (2026-09-26, at `eab7ba45`)

**What moved since `a35af210`:** 6.21a merged (code `67121138`, review patches `6f44f8f5` + `cb1298b3`), and three
decisions landed on top of the one this file was written under:
- `2026-09-26-245` superseded `-244` 6.21a D2 (tie-break), D6 (a legacy row is `missing`), D8 and D10. ⇒ D1's rows 2
  and 5 were **already** corrected in `c189cb27` and are unchanged here.
- `2026-09-26-246` §1 says there are **TWO** named predicates, ⛔ not one. The handler asks *"may this upload be taken
  in"* (`isDeathCertificateUploadAllowed`); the job asks *"may it become current"* (`mayDeathCertificateUploadBecomeCurrent`).
  ⇒ D1's *"one shared predicate"* sentence named the wrong function. **Corrected below (C1).**
- `-246` §2 (an erased date is `anonymized`) and §3–§5 touch ⛔ nothing 6.21b reads. The family status reads the
  verdict and the reason code, ⛔ never a Tier-1 column.

**Verified present, by name (`grep` at `eab7ba45`):**

| Name | Where | Used by 6.21b for |
|---|---|---|
| `readDeathCertificateSnapshot`, `deathCertificateStatus`, `DeathCertificateStatus` | `packages/domain/src/claim/death-certificate-approval.ts` | D1's rows 2–6 |
| `isInDeathCertificateReviewWindow` (over `CLAIM_REVIEW_WINDOW_STATES`, `claim/review-window.ts`) | same leaf | D1's row 1 |
| `isDeathCertificateUploadAllowedInReviewWindow` | same leaf — its doc-block: *"the ONE definition the upload guard and 6.21b's `replacementAllowed` share"* | `replacementAllowed` |
| `isDeathCertificateUploadAllowed` (handler intake) · `mayDeathCertificateUploadBecomeCurrent` (job) | same leaf | ⛔ neither is called by 6.21b's resolver (C1); the intake one is the oracle of the `upload_allowed` soundness test (`-247` §2) |
| `isDeathCertificateReplacementRequested` | same leaf (6.21a D16 — 6.19's CC1 trigger; ⛔ no caller yet) | an equality test (AC1) |
| `CLAIM_DOCUMENT_UPLOADABLE_STATES` = `intake_converged`, `documents_pending` | same leaf | D1's rows 1a/1b and `upload_allowed` (`-247` §2) |
| `claims.death-certificate.routes.ts` — POST `…/review`, GET `…/history`; gate entry `expectedMethods: ['post','get']`, `COVERAGE_FLOOR = 10` | `apps/api/src/modules/claims/`, `scripts/claim-adjudication-human-actor-invariant/check.ts` | D5 |
| `claim_document.certificate_accepted` / `claim_document.certificate_awaiting_review` (409) | `claims.documents.handlers.ts` `uploadClaimDocument` | D2, D5 |
| `listLiveClaimsForDeceasedMember` (non-terminal, newest first, `.limit(10)`) | `packages/domain/src/claim/read.ts` | D5 |

**Corrections made at the re-pin (the author's; each is a statement of the shipped code, ⛔ none changes a D):**
- **C1 — the shared predicate.** `replacementAllowed` = `isInDeathCertificateReviewWindow(state) &&
  isDeathCertificateUploadAllowedInReviewWindow(status)`. It is ⛔ **not** equal to the handler's full
  `isDeathCertificateUploadAllowed`, which also returns `true` in `intake_converged` / `documents_pending` (the filing
  wizard's states, row 1 = `not_needed`). The old AC1 wording (*"equals 6.21a D6's upload guard for every row"*) was
  false for those two states. It now reads *"for every in-window row"*, plus an explicit pre-verification case.
- **C2 — the claim id on the shepherd screen.** `shepherd.tsx` reads `claimCaseId` from its **route params**.
  `ClaimPointOfContactEntry` reads `lib/filed-claim.ts` and passes it. D3 said *"from `lib/filed-claim.ts`"*; the
  effect is the same, but the code path is the route param.
- **C3 — colour.** D2 said *"use Tamagui tokens"*. apps/mobile has ⛔ no semantic success/error colour role
  (`tamagui.config.ts` overrides only `fonts`; ⛔ no `@twt/tokens` dependency — `microcopy.yaml`'s 6.18 exemption note).
  ⇒ the new screen carries ⛔ **no** colour literal and ⛔ no status colour at all; status is text. `$colorPress` is the
  only theme token the claim screens use for secondary text.
- **C4 — `handover-otp.tsx`'s literal** is `#C0392B` (`document.tsx`'s are `#1E8E3E` and `#B00020`).
- **C5 — the helpline line is tappable.** `<CallHelplineCTA>` (`components/common/`, re-exported from
  `components/claim/`) exists exactly so a caller can pass a `label` ⛔ without re-implementing the `tel:` dial-out.
  The line renders as `<CallHelplineCTA label={t('certificate.replacement_helpline')} />`.
- **C6 — the two 409 codes have an owner now.** 6.21a deferred *"no i18n/error mapping"* for them to *"whichever
  surface actually uploads … 6.21b"* (`deferred-work.md`, 6.21a chunk 2). That is this story, in both the app (D2) and
  the helpline (D5).
- **C7 — the admin multipart precedent** is `uploadGroundInspectionPhoto` (`apps/admin/src/api/client.ts`). ⚠ It does
  ⛔ not parse its response with a schema. The new function **must** parse the 202 with `ClaimDocumentUploadResponse`
  (`@twt/contracts`), as `apiFetch` does. ⛔ Do not copy that gap.

**Findings for BigDev (the author's calls — §0 gate: ⛔ none is the Panel's; none changes what a family is owed):**

> ✅ **RESOLVED 2026-09-26 by `2026-09-26-247`: F1 → (a), Q1 → (a).** The text below is kept as the finding that was
> answered; the binding shape is in D1.

- **F1 — the marker can say "we have it" after the replacement was rejected.** D1's precedence rule 2 compares the
  server's **status** with `serverStatusAtWrite`. Consider a claim whose certificate A was rejected (`replacement_requested`).
  The family uploads B, and the marker is written. B's job lands, so the server says `awaiting_review`. But the app is
  closed and never reads it, so rule 1 never deletes the marker. The District Admin then rejects B, and the server says
  `replacement_requested` again. The family opens the app within 24 h: the status equals `serverStatusAtWrite`, so rule
  2 does ⛔ not fire and rule 3 has ⛔ not expired. ⇒ the app shows *"We have the death certificate … nothing more you
  need to do"* while the family is being asked for another. Invariant 1 is broken for up to 24 h. Uploading and closing
  the app is the common path, and a same-day review is plausible. ⇒ **realistic.** The response carries nothing that
  tells "A rejected" from "B rejected", so the fix changes a committed D1:
  - **(a) Recommended:** add `certificateToken: string | null` to the D1 response — the CURRENT upload's id (opaque,
    non-PII; the same token the console's review form already uses; ⛔ not a note, date, reviewer or free text, so
    invariant 3 holds). The marker stores `tokenAtWrite` from the last fresh read. Rule 2 becomes *"the server's token
    differs from `tokenAtWrite`, or its status differs from `serverStatusAtWrite` ⇒ the server wins"*. Cost: one field
    and one comparison, and a superseding author-commit.
  - **(b)** Shorten rule 3's expiry from 24 h to something like 30 min. Cost: the false window shrinks but is ⛔ not
    closed, and a slow job makes the app ask again (a second upload is harmless under `-246` §1 — the later one becomes
    current). This also supersedes BigDev's v0.6 call.
  - **(c)** Keep D1 as committed. Cost: the up-to-24-hour false message ships, recorded as a known limit in the
    Completion Notes.
- **Q1 — a certificate deferred at filing can never be sent afterwards.** ⚠ BLIND VALIDATE (BW-G5): the reason below is
  imprecise — the OCR job advances a claim out of `intake_converged` for **ANY** document type. The conclusion holds
  because the app only ever uploads a death certificate (and the helpline had ⛔ no upload UI). Only a received certificate advances a claim
  out of `intake_converged` (the OCR job appends `claim.documents_received`). A family who taps *"I'll upload later
  (within 7 days)"* is left in `intake_converged`. The draft that held the upload screen is cleared at acknowledgement,
  so there is ⛔ no screen. D1's row 1 answers `not_needed` there, so 6.21b adds none. The helpline has ⛔ no upload UI
  on `HelplineClaimPage`, and D5 shows its control only when `replacementAllowed` (false there). ⇒ the family was told
  *"within 7 days"* and has ⛔ no way to do it in the app or through the helpline. This is 6.5's gap, ⛔ not 6.21a's; it
  was ⛔ unowned until now.
  - **(a) Recommended:** in `intake_converged` / `documents_pending`, answer `missing` (with the upload button) when
    the snapshot status is `missing`, and `awaiting_review` when a current upload exists (⛔ no button — the wizard's
    replace-freely path is ⛔ not re-opened post-filing). This needs a separate field (e.g. `uploadAllowed`) or a
    row-1 split, because `replacementAllowed` stays tied to the in-window predicate (C1). The copy is fine as it stands:
    `missing_body` says *"still open"*, ⛔ not *"not refused"*, and carries ⛔ no deadline. Cost: a superseding
    author-commit, one table row, and two more tests.
  - **(b)** Leave it, and record the gap in `deferred-work.md` against 6.5 with 6.21b as the finder. Cost: the gap
    stays open.

## 🕶️ Blind validate record (2026-09-26, three fresh-context read-only verifiers, against v0.9 at `945f9969`)

Lenses: code claims · governance and sibling staleness · premise and end-to-end journeys. Every finding with a factual
claim was re-checked in the code before being accepted; ⛔ none was rejected. Tagged `BW-<lens><n>` in this file
(C = code, G = governance, J = journeys). **Applied (the author's):** C1 (⛔ no render harness ⇒ pure view/marker/
outcome/announcement functions tested in node — CRITICAL), C2 (the OCR-failure path DOES call `evaluateParity`), C3/G1
(AC1 contradicted row 1a), C4 (shepherd refetch on focus; the marker written from the wizard too), C5/J3
(`otp.no_nominee` says *"file"*), C6/J8 (operator lines for every status), C7/G3, C8, C9 (friction table placement;
6.18's row still uncounted), C10, C11, C12, G2, G4, G5 (story side), G6, G7, G8, G9, G10, J5, J6, J9, J10.
**Decided by BigDev (B1–B4) in `2026-09-26-249`:** J1 offline (CRITICAL), J2 wizard re-entry (narrowed for `-239` (b)),
C2/J4 the OCR-failure flag, J7 `reversed`.

## ✅ Validate record (2026-09-26, bmad-create-story validate, against v0.8 at `692a16de`)

Checked: the pin is an ancestor of HEAD, and nothing but governance moved since it; ⛔ no stray branch carries a
6.21b pass; every code routing note naming 6.21b was read; the `scripts/` gates that scan these files were probed
(microcopy with the real checks, human-actor, access-wrapper, friction-budget); `parityFlags` is
`z.record(z.string(), z.string())`, so `death_date` can ⛔ not 500 the console read. **Ten findings, V1–V10, all
applied** (V1's governance half by erratum `2026-09-26-248`):

| # | Finding | Where fixed |
|---|---|---|
| V1 | ⚠ `-247` §3 says *"The client maps them"*, and v0.8 said the api-client maps to camelCase *"as the other member methods do"*. **False**: every member method returns its contract type as-is. The *"member-response convention is snake_case"* premise is also overstated — `filing.ts` is camelCase, `shepherd`/`appeal` are snake_case. Snake_case remains the right choice for a post-filing read (the shepherd/appeal precedent). | D1 (story); `-247` §3 corrected by erratum **`2026-09-26-248`** (BigDev, *"(a) erratum"*) |
| V2 | *"Announce on iOS and Android"* taken literally makes TalkBack speak twice (6.18's review, 2026-09-23b) | D2, AC2 |
| V3 | The screen's chrome was unstated; `<ClaimProxyFlowShell>` would show the wizard's save-and-resume | D2 |
| V4 | A nominee with no reachable mobile makes the step-up impassable; unhandled | D2, AC2 |
| V5 | 6.19's CC1 item says `missing` is *"in the window"*; `-247` §2 widened it | Task 8 |
| V6 | `lib/filed-claim.ts` is edited but was missing from D7's glob list | D7 |
| V7 | friction AC-4 only sees committed work; access-wrapper (3) bans a direct `audit.writeAuditEntry` | D7 |
| V8 | Two code headers still describe the pre-`-246` single predicate / "no helpline surface here" | Task 8, D5 |
| V9 | `epics.md` §6.21b does ⛔ not point to `-247` | Task 8 |
| V10 | A helpline-filed (or other-phone) claim has ⛔ no app entry point — pre-existing 6.12 behaviour | Dev Notes |

## 🎯 What already EXISTS (verified at `eab7ba45`)

- **Member app, post-filing:**
  - `apps/mobile/app/(claim)/shepherd.tsx` takes `claimCaseId` from its route params (C2). It is opened from
    `components/claim/ClaimPointOfContactEntry.tsx` on the home tab, which reads `getFiledClaimCaseId` from
    `lib/filed-claim.ts` (MMKV) and renders only when a filed claim is on record. The screen renders
    `<ShepherdContactCard>`.
  - `ShepherdContactCard.tsx` is the fetch/offline precedent to copy: an injectable fetcher, a cache on success
    (`cacheShepherd`), the cache cleared on 401/403/404 (`isAuthOrNotFoundError` — ⛔ never serve a cached read the
    server has disowned), and the cache as fallback on a transient failure.
  - Upload exists **only** inside the filing wizard: `(claim)/document.tsx`, which uses the claim draft. The draft is
    cleared at acknowledgement.
  - `document.tsx`'s `uploadFile` **swallows every error** into `document.upload_failed`. It uses hex literals `#1E8E3E`
    and `#B00020`.
- **The handover OTP:**
  - `(claim)/handover-otp.tsx` sends on mount via `claimApi.requestHandoverOtp`, verifies via `verifyHandoverOtp`,
    then **hard-codes** `router.push('/(claim)/relationship')`. It carries one hex literal, `#C0392B` (C4).
  - The upload route is `[memberSession, requireMemberStepUp(deps, CLAIM_HANDOVER_ACTION_CONTEXT)]` (`claims.routes.ts`).
    A stale elevation ⇒ `403 auth.step_up_required`.
  - ⚠ `useStepUpGate` (`components/life-events/useStepUpGate.ts`) is the **wrong tool**: `memberAuth.stepUpRequest`
    sends to the **session member's** phone, while the handover OTP goes to the **nominee's** (`claims.service.ts`
    `sendHandoverOtp`).
- **The member claim client:** `createMemberClaimClient` (`packages/api-client/src/index.ts`) — `uploadClaimDocument`,
  `getShepherd` (the GET shape to mirror: `call(…, Schema, undefined, true, 'GET')`). `ApiError` carries `.status` and
  `.code`. `apps/mobile/lib/claim-api.ts` only instantiates it.
- **The member ownership guard:** `getShepherdMember` (`claims.shepherd.handlers.ts`) opens its own scope tx, reads
  `claim.getClaimCase`, and 404s when `deceasedMemberId !== session member` — ⛔ no cross-claim oracle. D1 copies it.
- **Helpline:**
  - `HelplineClaimPage.tsx` has ⛔ **no** upload UI. `apps/admin/src/api/client.ts` has ⛔ **no** document-upload
    function (the only multipart one is `uploadGroundInspectionPhoto`, C7).
  - The pattern to copy is `HelplineNomineeCorrection.tsx`: it mounts on `memberId !== null && identityConfirmed`; one
    claim ⇒ remembered as the pick; several ⇒ radio pick, locked while a send is in flight; none ⇒ "no claim"; results
    are tied to the claim they were sent for (`chosenRef`).
  - The helpline upload route is `POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/documents`, in
    `claims.helpline.routes.ts` (`[adminSession, scope, canFileClaim]`, ⛔ no step-up). That file is `ENROLMENT_OWED`
    in the human-actor gate; 6.21b does ⛔ not change it.
  - The helpline read-out copy lives in `helpline-claims/i18n-en.ts` (English chrome; only the identity read-back
    script is bilingual).
- **Copy:**
  - `packages/i18n/locales/{en,hi}/claim.json` hold flat keys bound by `useClaimT()` (108 each; ⛔ no `certificate.*`
    key yet), and both are in `microcopy.yaml`'s `copy_globs`.
  - Reusable on the replacement screen, and deadline-free (checked): `document.pick_photo`, `document.pick_file`,
    `document.uploading`, `document.retry`, `document.permission_needed`, `document.upload_failed`. ⛔ Never
    `document.help` / `.defer` / `.saved`.
  - **Mobile CODE files are enumerated one by one** in `microcopy.yaml`'s `code_globs` (today:
    `nominee-review.tsx`, `NomineeForm.tsx`). Adding a file turns on **FM-14** (the hex check). The scoped-exemption
    form is 6.18's entries for those two files.
  - `scripts/microcopy/claim.test.ts` §(0) asserts its own scope list (`REVIEW_TSX`, `FORM_TSX`).
  - Hindi uses **`तिथि`** for "date".
- **OCR:** `packages/domain/src/claim/parity.ts` → `evaluateParity`.
  - It **returns early** at `missing_member_record` and `ocr: 'unreadable'` (name and DoB both null), **before** any
    date logic.
  - Its date checks run only when `ocr.dateOfDeath !== null`. ⚠ The *"missing evidence stays silent here"* comment is
    about the certificate **issue** date.
  - The job (`apps/jobs/src/claim-ocr-parity.ts`) has both the raw `ocrFields` and `normalized`. ⚠ BLIND VALIDATE (BW-C2): the
    OCR/fetch-failure path does **CALL** `evaluateParity` — its `catch` leaves `EMPTY_OCR_FIELDS`, which then hits the
    `ocr: 'unreadable'` early return. Each tracked upload's verdict is written **once** onto its
    `claim_death_certificate_uploads` row (`-245` §1, `-246` §4).
  - `VerifierReviewPanel.tsx`'s "Date of death" row passes `flag={parityFlags['date']}`.
- **Friction:** `friction-budget.md` `## The ledger` (`payer | protects | forced/optional`). ⚠ The gate (`scripts/friction-budget/lib.ts`)
  reads ONLY the first contiguous `payer|protects|event_type` table and stops at the first non-`|` line. Append the
  new row INSIDE that table, with leading and trailing pipes. ⚠ 6.18's row still sits OUTSIDE it (appended to the
  `/members` bytes table under *"Story 10.15"*) and is still uncounted (BW-C9) — record it, ⛔ do not move it here.
- **Audit:** `apps/api/src/audit/audit-sink.ts` is a string union with a comment block per surface. 6.21a added
  `admin_death_certificate.history_read` there.

## ⚖️ Decisions (the AUTHOR's; recorded in `-244`, as corrected by `-245` §3 and the re-pin)

- **D1 — the member status read.**
  - **Route:** `GET /api/v1/member/claims/:claimCaseId/death-certificate` in `claims.routes.ts` (`NON_ADJUDICATION_ROUTES`
    in the human-actor gate — ⛔ no gate edit for it). `memberSession` only (⛔ no step-up: read-only, non-PII). Own
    claim only: a miss and a not-owned claim are both 404 `claim.not_found` (the `getShepherdMember` guard).
  - **Response** (⚠ SUPERSEDED by `-247` §1 and §3 — the token and the snake_case spelling; §2 — `upload_allowed`;
    and by `-249` §2 — `claim_live`, §4 — `reassurance`):
    `{ status, replacement_reason, replacement_allowed, upload_allowed, certificate_token, claim_live, reassurance }`.
    - `status`: `'not_needed' | 'missing' | 'awaiting_review' | 'accepted' | 'replacement_requested'`.
    - `replacement_reason`: `'unclear_date' | 'future_date' | null`.
    - `replacement_allowed: boolean` — the in-window predicate, ⛔ nothing else (C1).
    - `upload_allowed: boolean` — **what the surfaces offer** (`-247` §2). The app's and the helpline's upload control
      keys on this field, ⛔ never on `replacement_allowed`.
    - `certificate_token: string (uuid) | null` — the CURRENT upload's id (`snapshot.currentUploadId`). Used ⛔ only by
      the marker; ⛔ never shown (`-247` §1).
    - `claim_live: boolean` — `state ∉ CLAIM_TERMINAL_STATES` (`denied`, `settled`). Used ⛔ only by the filing-entry
      redirect (`-249` §2); ⛔ never shown.
    - `reassurance: 'not_refused' | 'still_open' | null` — for `replacement_requested`: `not_refused`, or `still_open`
      when the claim is `reversed`; `null` for every other status (`-249` §4). The app renders
      `certificate.not_refused` / `certificate.still_open` from it — ⛔ never decides it.
    - ⚠ VALIDATE 2026-09-26 (V1): the api-client does ⛔ **not** map casing — every member method returns its
      contract type as-is (`getShepherd` → `MemberShepherdResponse`, and `ShepherdContactCard` reads
      `data.display_name`). ⇒ the app reads these snake_case fields directly; ⛔ no mapping layer is written.
      (`-247` §3's *"The client maps them"* is false — corrected by erratum `2026-09-26-248`.)
  - **The state table.** The **server** computes this, from ONE scope tx: the claim row, then one
    `readDeathCertificateSnapshot`. Rows are evaluated **top to bottom, first match wins**:

    | # | Condition (server-side, at read time) | `status` | `replacement_reason` | `replacement_allowed` | `upload_allowed` | What the app shows (D3) |
    |---|---|---|---|---|---|---|
    | 1a | ⭐ `-247` §2: state ∈ `CLAIM_DOCUMENT_UPLOADABLE_STATES` (`intake_converged`, `documents_pending`) **and** `deathCertificateStatus(snapshot) === 'missing'` | `missing` | `null` | `false` | **`true`** | `missing_body` + upload button + helpline line |
    | 1b | ⭐ `-247` §2: state ∈ `CLAIM_DOCUMENT_UPLOADABLE_STATES`, any other status (a current upload exists) | `awaiting_review` | `null` | `false` | `false` | `awaiting_review` line |
    | 1 | `!isInDeathCertificateReviewWindow(state)` — the eight remaining states: `intake_pending`, `state_trustee_approved`, `approved`, `denied`, `appeal_stage_1/2/3`, `settled` | `not_needed` | `null` | `false` | `false` | nothing new |
    | 2 | in window, `deathCertificateStatus(snapshot) === 'missing'` — ⛔ no row, **or** a row with ⛔ no current upload (T12 legacy — `-245` §3) | `missing` | `null` | `true` | `true` | `missing_body` + upload button + helpline line |
    | 3 | in window, status `rejected`, `currentReview.rejectionReason === 'date_of_death_in_future'` | `replacement_requested` | `future_date` | `true` | `true` | title + `replacement_body_future` + the `reassurance` line + button + helpline line |
    | 4 | in window, status `rejected`, reason `no_date_of_death` or `date_of_death_unclear` | `replacement_requested` | `unclear_date` | `true` | `true` | title + `replacement_body` + the `reassurance` line + button + helpline line |
    | 5 | in window, status `awaiting_review` — a **current upload** exists, ⛔ no live current review | `awaiting_review` | `null` | `false` | `false` | `awaiting_review` line |
    | 6 | in window, status `accepted` | `accepted` | `null` | `false` | `false` | `accepted` line |

    ⚠ Row 1 (⚠ SUPERSEDED by `-247` §2 for the two pre-verification states) used to cover all ten out-of-window
    states. ⚠ `reversed` **is** in the window (`CLAIM_REVIEW_WINDOW_STATES`), so a reversed-on-appeal claim follows
    rows 2–6. The appeal stages are ⛔ not. ⚠ Rows 1a/1b carry ⛔ no *"has not been refused"* line; their copy is
    `missing_body` (*"still open"*) and `awaiting_review` (invariant 1). Pre-verification there can be ⛔ no review, so
    1a/1b are complete.
  - ⭐ **The shared predicate (C1, `-246` §1).** `replacement_allowed` is **computed by calling**
    `isInDeathCertificateReviewWindow(state) && isDeathCertificateUploadAllowedInReviewWindow(deathCertificateStatus(snapshot))`
    — ⛔ never re-derived from the table, and ⛔ never `isDeathCertificateUploadAllowed` (the handler's intake predicate,
    which also admits the two pre-verification states). ⇒ for every **in-window** state, `replacement_allowed` equals
    what the upload handler would decide.
  - ⭐ **`upload_allowed` (`-247` §2)** = `replacement_allowed || (state ∈ CLAIM_DOCUMENT_UPLOADABLE_STATES && status === 'missing')`,
    computed from those named functions and the constant, ⛔ never a hand-copied state list. Tests assert:
    **soundness** — for every state × status, `upload_allowed ⇒ isDeathCertificateUploadAllowed(state, status)` (a
    surface ⛔ never offers what the handler refuses); and the **one deliberate divergence** — pre-verification with a
    current upload, the handler accepts while `upload_allowed` is `false`.
  - ⭐ **`replacement_requested` ≡ `isDeathCertificateReplacementRequested`** (6.19's CC1 trigger). The resolver does
    ⛔ not call it (that would be a second claim read), but a test asserts they agree for every row, so 6.19's reminder
    and the family's screen can ⛔ never disagree about whether the family is being asked.
  - **Implementation, and who owns which function:** 6.21a **created** the leaf and every predicate above. **6.21b
    adds** one pure function to that leaf — `resolveDeathCertificateFamilyStatus(claimState, snapshot)` → the five
    fields (`-247`) — plus a thin async reader beside it if convenient. ⭐ The leaf rule still binds (T8): import ⛔ nothing
    beyond schema tables, id types, `errors.ts` and `review-window.ts`. ⛔ No second definition of any condition.
  - **In-flight: the server is AUTHORITATIVE, and the MMKV marker is a client-only DISPLAY OVERLAY.**
    - **Why it exists:** the job writes the upload row (6.21a D2), so between the 202 and the job's commit the server
      still answers `replacement_requested` (rows 3/4) or `missing` (row 2).
    - **What it is:** `certificate-pending:{claimCaseId}` → `{ writtenAt, serverStatusAtWrite, tokenAtWrite }`
      (`tokenAtWrite` added by `-247` §1). `serverStatusAtWrite` and `tokenAtWrite` come from the **fresh** read the
      screen made before it offered the upload (D2). Written on the upload's **202** only, and never on an error.
    - ⛔ The marker is **never** sent to the server, **never** read by the helpline, **never** changes
      `replacement_allowed` or `upload_allowed` for the server, and **never** turns a server status into anything **other than**
      `awaiting_review`.
    - **Precedence**, evaluated **in this order** on every render that has a fresh server read:
      1. **The server status is ⛔ not** `replacement_requested` or `missing` (rows 1, 1b, 5 or 6) ⇒ **the server wins.**
         Delete the marker and show the server's row.
      2. ⚠ SUPERSEDED by `-247` §1. **The server's `certificate_token` differs from `tokenAtWrite`, or its status
         differs from `serverStatusAtWrite`** ⇒ **the server wins.** Delete the marker. The token is what catches "B
         was rejected after A was": once B's job lands, the token is B's, whatever B's verdict. A kept-but-not-current
         upload leaves the token unchanged, so the marker holds until rule 3 and the family is asked again.
      3. **The marker is 24 hours old or more, or its age is negative** (the device clock moved backwards) ⇒
         **expired.** Delete it and show the server's row. A dead-lettered job therefore asks the family again. ⚠ The
         object **was** stored (6.21a's DLQ deferral), but ⛔ no upload row exists, so from the claim's side nothing
         was received and asking again is right.
      4. **Otherwise** ⇒ show `awaiting_review`, with the upload button **hidden**, so the family does ⛔ not upload
         twice while the first is processing.
    - **With no fresh server read** (offline, or an error) — ⚠ SUPERSEDED by `-249` §1 (was: *"show the last cached
      server status"*, which would say *"… has not been refused"* offline on a claim denied since — the `-242` defect,
      BW-J1): render ⛔ **no** certificate notice at all. The shepherd card's own offline line and helpline CTA
      remain. ⛔ No certificate status is cached; ⛔ no new copy. The marker is consulted only against a fresh read.
    - **Tests (BW-C1 — apps/mobile has ⛔ NO render harness: `vitest.config.ts` is `environment: 'node'`, `tests/unit/**/*.test.ts`;
      ⛔ no new dependency):** the marker precedence is a PURE function `(serverRead | null, marker | null, now) → view`,
      tested in node; each precedence rule, plus the offline case, with an injected clock, **and** the `-247` §1 case (A
      rejected → B uploaded, app closed → B's job lands → B rejected → reopened inside 24 h ⇒ the server's
      `replacement_requested` is shown, ⛔ never `awaiting_review`).
  - This **narrows** 6.5's deferral *"No status/polling endpoint for the async upload outcome"* for the death
    certificate. Annotate that item; do ⛔ not close it.
- **D2 — the replacement screen, `apps/mobile/app/(claim)/certificate-replacement.tsx`.**
  - **Upload logic:** extract the picker/upload logic from `document.tsx` into `lib/use-death-certificate-upload.ts`.
    Both screens use it; ⛔ never a second copy.
    - The hook **surfaces** these as distinct outcomes: `auth.step_up_required`, `claim_document.certificate_accepted`,
      `claim_document.certificate_awaiting_review`, `claim_document.upload_not_allowed` (the claim left the window
      between read and upload), and a generic failure.
    - `document.tsx` keeps its current single message (the 6.5 deferral *"Generic 'upload failed' message doesn't
      distinguish…"* is **narrowed** for the replacement screen only — annotate, ⛔ do not close).
  - **Outcome → what the screen shows:** `certificate_awaiting_review` ⇒ `certificate.awaiting_review`;
    `certificate_accepted` ⇒ `certificate.accepted`; `upload_not_allowed` ⇒ **refetch D1**; if
    `upload_allowed` is now false, `router.replace` back to the shepherd screen, which renders the server's row (for
    `not_needed`: nothing) — ⛔ never a blank screen, ⛔ never *"failed"*, ⛔ never a *"not refused"* line the server no
    longer supports (BW-J6); 413/415 ⇒
    `document.upload_failed` + `document.retry`, where retry REOPENS THE PICKER (⛔ never re-sends the same file, which
    would fail again — BW-J9); generic ⇒ `document.upload_failed` + `document.retry`. ⛔ Never *"upload failed"* for the two 409s (C6).
  - **Step-up:** the screen runs the **handover OTP** when the upload returns `auth.step_up_required`. Extract request →
    verify from `handover-otp.tsx` into `lib/use-handover-otp.ts`, used by both.
    - `handover-otp.tsx` keeps its wizard navigation.
    - After a successful verify, **retry the upload with the file already picked**; ⛔ never make the family pick again.
    - ⛔ Never `useStepUpGate` (wrong phone). ⛔ Never weaken the upload route's step-up.
  - **Entry:** the screen reads `claimCaseId` from its route params, and does a **fresh** D1 read before it shows the
    button. If `upload_allowed` is false, it shows the server's row and ⛔ no button.
  - **Chrome (V3):** a plain `YStack`, like `shepherd.tsx`. ⛔ **Not** `<ClaimProxyFlowShell>`: it renders
    `<SaveAndResumeAffordance>` (the filing draft, cleared at acknowledgement) and a `#1A1A1A` literal. ⛔ Do not add
    `certificate-replacement` to `CLAIM_STEPS` (`lib/claim-steps.ts`): the `(claim)` layout then correctly shows ⛔ no
    "Step N of M" header.
  - **No reachable nominee (V4):** `requestHandoverOtp` returns an EMPTY `nomineeMobileMasked` when the nominee has no
    reachable mobile. ⛔ Do **not** reuse `otp.no_nominee` — it says *"we'll help you **file**"* (hi: *"दावा दर्ज करने में"*),
    false on a filed claim (BW-J3). Render **only** `<CallHelplineCTA label={t('certificate.replacement_helpline')} />`:
    the step-up can ⛔ not be passed, so the helpline (D5, ⛔ no step-up) is the way out. ⛔ No new copy.
  - **Copy:** ⛔ none of `document.help` / `document.defer` / `document.saved` (invariant 2). The helpline line is
    `<CallHelplineCTA label={t('certificate.replacement_helpline')} />` (C5).
  - **Accessibility (V2 — the 6.18 review's pattern, ⛔ not a literal "call it on both"):** the outcome is spoken on
    both platforms. Android: the outcome `Text` carries `accessibilityLiveRegion="polite"`. iOS:
    `if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(…)` — ⛔ unguarded, TalkBack speaks it
    **twice** (`nominee-review.tsx`, code review 2026-09-23b). Hold on the screen long enough for the live region to
    be read before navigating (mirror `SAVED_ANNOUNCEMENT_DELAY_MS` = 1200 — it is module-local in `nominee-review.tsx`,
    ⛔ not exported), and key the effect on the outcome, ⛔ never on `t`.
    Status is ⛔ never conveyed by colour alone.
  - **Colour (C3):** ⛔ no colour literal and ⛔ no status colour in the new screen or the two hooks.
- **D3 — the post-filing notice.** `shepherd.tsx` takes `claimCaseId` from its route params (C2), reads D1, and renders
  a notice beside the existing `<ShepherdContactCard>`:
  - for `replacement_requested`: the title, the body chosen by `replacement_reason`, the upload button (→
    `/(claim)/certificate-replacement?claimCaseId=…`) and the helpline line;
  - for `missing`: `missing_body`, the button and the helpline line;
  - for `awaiting_review` and `accepted`: one line each;
  - for `not_needed`: nothing.
  - The notice's loading, error and empty states render ⛔ outside any list ([[project_fabric_flatlist_empty_populated_crash]]).
  - (BW-C4) It **refetches on focus** (`useFocusEffect`) — `shepherd.tsx` does ⛔ not remount after `router.back()`
    from the replacement screen — and it renders through the SAME pure view function as the replacement screen,
    marker included. The shared upload hook writes the marker on **every** death-certificate 202, the wizard's
    `document.tsx` included, so a family who just uploaded in the wizard is ⛔ not told *"not received yet"* (row 1a)
    before the job lands.
  - After a successful upload the replacement screen announces, holds, and `router.replace`s to the shepherd screen.
- **D4 — the copy** (an author-commit, the `-225` precedent; both locales; `claim` namespace).
  - ⭐ `certificate.replacement_helpline` is **BigDev's wording**, and ⛔ must not be reverted.
  - ⭐ `certificate.replacement_body_future` is the **separate** future-date message BigDev asked for.
  - ⭐ The Hindi uses **`तिथि`** (BigDev, 2026-09-25).

| key | en | hi |
|---|---|---|
| `certificate.replacement_title` | A new death certificate is needed | नया मृत्यु प्रमाणपत्र चाहिए |
| `certificate.replacement_body` ⚠ `-249` §4 | The death certificate we received does not show a clear date of death. Please upload one that does. | हमें मिले मृत्यु प्रमाणपत्र पर मृत्यु की तिथि स्पष्ट नहीं है। कृपया ऐसा प्रमाणपत्र अपलोड करें जिस पर तिथि स्पष्ट हो। |
| `certificate.replacement_body_future` ⚠ `-249` §4 | The date of death on the certificate we received is a future date. Please upload a certificate that shows the correct date of death. | हमें मिले मृत्यु प्रमाणपत्र पर मृत्यु की तिथि भविष्य की है। कृपया ऐसा प्रमाणपत्र अपलोड करें जिस पर मृत्यु की सही तिथि हो। |
| `certificate.not_refused` (new, `-249` §4) | Your claim is still open and has not been refused. | आपका दावा अब भी खुला है और अस्वीकार नहीं हुआ है। |
| `certificate.still_open` (new, `-249` §4) | Your claim is still open. | आपका दावा अब भी खुला है। |
| `certificate.missing_body` | We have not received the death certificate yet. Please upload it. Your claim is still open. | हमें अभी तक मृत्यु प्रमाणपत्र नहीं मिला है। कृपया इसे अपलोड करें। आपका दावा अब भी खुला है। |
| `certificate.replacement_upload` | Upload a new certificate | नया प्रमाणपत्र अपलोड करें |
| `certificate.replacement_helpline` | If you can't upload it, call the helpline and we will help you. | अगर आप इसे अपलोड नहीं कर पा रहे हैं, तो हेल्पलाइन पर कॉल करें — हम आपकी सहायता करेंगे। |
| `certificate.awaiting_review` | We have the death certificate and will review it. There's nothing more you need to do. | मृत्यु प्रमाणपत्र हमें मिल गया है और हम इसकी समीक्षा करेंगे। अभी आपको और कुछ करने की ज़रूरत नहीं है। |
| `certificate.accepted` | The death certificate has been accepted. | मृत्यु प्रमाणपत्र स्वीकार कर लिया गया है। |

  - ✅ `certificate.missing_body` was **approved by BigDev on 2026-09-25** (`-244` §3).
  - ⚠ SUPERSEDED by `-249` §4 (the split only): the two bodies lost their closing sentence, which is now its own key,
    chosen by the server's `reassurance` — so a `reversed` claim is told *"still open"*, ⛔ never *"not refused"*. ⛔ No
    word is new: every string is `-244` D4's.
  - **Helpline read-out lines** (`helpline-claims/i18n-en.ts`, English):
    - unclear date: *"The certificate we have doesn't show a clear date of death — the family needs to send another. The claim is still open."*
    - future date: *"The date of death on the certificate we have is a future date — the family needs to send a certificate with the correct date. The claim is still open."*
    - missing: *"We haven't received the death certificate yet — the family needs to send it. The claim is still open."*
  - **Every other operator line** (status lines, the "sent, being processed" line, refusals, 413/415) is recorded
    verbatim in **`-249` §6** — copy them from there. The refusal lines (C6), as recorded: for `certificate_accepted` — *"This claim's death
    certificate has already been accepted. Another one can't be sent."*; for `certificate_awaiting_review` — *"A death
    certificate is already waiting to be reviewed. Another one can't be sent until it has been."*; for
    `upload_not_allowed` — *"This claim can't take a new certificate in its current state."*
- **D5 — the helpline.**
  - **Route:** `GET /api/v1/p/:pariwarId/admin/members/:memberId/death-certificate/claims`, in **6.21a's
    `claims.death-certificate.routes.ts`** (an enrolled file; ⛔ not `claims.helpline.routes.ts`).
    - Chain: `[adminSession, scope, requirePermissionHook(deps, 'claim.file')]` — `claim.file` at the **Pariwar**
      (the helpline upload's own key; ⛔ no district resolver — the operator is ⛔ not district-scoped).
    - It lists the member's live claims via **`listLiveClaimsForDeceasedMember`** (⛔ a second query is not written),
      each with the D1 status from the same pure resolver. ⚠ COST: ≤ 10 claims ⇒ ≤ 10 snapshot reads, each one
      statement. Bounded by the domain's own `.limit(10)`.
    - It writes one audit line, `admin_death_certificate.claims_read` (a new member of the `audit-sink.ts` union, in
      6.21a's comment block), **ids and status codes only**. It does ⛔ **not** close 6.20's deferral *"the helpline live-claims read
      writes no audit line"* — that item is about 6.20's own route, which stays unaudited; annotate both of its sites
      (BW-G8).
    - Update the file header: it currently says *"Both gate at `dimension: 'district'`"* and *"⛔ No member or helpline
      surface here — those are Story 6.21b's"*. Both become false.
    - Update the gate entry's `expectedMethods` to `['post', 'get', 'get']` (the path contains `death-certificate`, so
      the existing `pathSubstrings` matches it).
  - **Client:** a new **multipart** function in `apps/admin/src/api/client.ts` for the **existing** helpline documents
    route (`?documentType=death_certificate`), shaped like `uploadGroundInspectionPhoto` but **parsing** the 202 (C7);
    a GET for the list; and hooks in `hooks.ts`.
  - **Component:** `<HelplineCertificateReplacement>` on `HelplineClaimPage`, beside `<HelplineNomineeCorrection>`.
    - It mounts only after the read-back is confirmed (the `HelplineNomineeCorrection` gate — ⚠ client-side only, as
      6.20's is; ⛔ no server-side read-back record exists).
    - One claim is used as-is (remembered as the pick); with several, the operator picks; with none, it shows "no open
      claim". Results are tied to the claim they were sent for.
    - It shows the D4 read-out line, and the upload control **only** when `upload_allowed` (`-247` §2 — so the
      operator can also send a certificate the family put off at filing). Each item carries the four status fields;
      ⛔ no `certificate_token` (⛔ no marker on the helpline).
    - It uploads `death_certificate` only. There is ⛔ no type chooser.
    - It maps every upload refusal to its own line (D4 refusal lines; 413/415 to plain operator text) — ⛔ never a raw code.
    - After a 202 (BW-J5): the job, ⛔ not the handler, writes the upload row, so a refetch still answers
      `replacement_requested` / `missing` until the job lands. ⇒ keep a per-claim "sent, being processed" state tied
      to `chosenRef`, show its own operator line (*"The certificate was sent and is being processed. Refresh in a
      minute."*), and hide the upload control until the server status or the claim changes. Then refetch.
    - Every status has an operator line (BW-J8/C6; English chrome, the author's): `awaiting_review` — *"We have the
      certificate; it is waiting for the District Admin's review. Nothing more is needed from the family."*;
      `accepted` — *"The death certificate has been accepted."*; `not_needed` — *"Nothing is needed about the death
      certificate on this claim right now."* ⛔ Never a raw status code.
  - **The 6.5 `DocumentTypeChooser` deferral:** its premise (*"no Story 6.3 helpline upload surface exists"*) becomes
    **partly false**, because a death-certificate surface now exists. Re-state it: the chooser is still unwired, and
    the other types still have no helpline surface. It stays **open**.
- **D6 — the OCR flag for a missing date of death (display only).** In `evaluateParity`:
  - compute the flag **before** the two early returns, and carry it into their `ambiguous(...)` flags;
  - `flags.death_date = 'missing'` when the OCR date of death is null **and** no raw value was present;
  - `flags.death_date = 'unreadable'` when a raw value was present but did not normalise — a new **optional**
    `rawDateOfDeathPresent` input (`opts`), which the job derives from the **raw** `ocrFields.dateOfDeath`
    (non-empty after trim);
  - either flag forces `ambiguous` + `verifierReviewRequired` (AR-61: absent data → ambiguous);
  - `flags.date` stays the plausibility key, unchanged;
  - `VerifierReviewPanel`'s Date-of-death row shows `death_date ?? date`.
  - The flag rides the verdict onto the upload row as well (`parity_flags`, written once — `-246` §4). ⛔ No migration.
  - ⚠ SUPERSEDED by `-249` §3 (D6's letter): the OCR/fetch-failure path **does** reach `evaluateParity` (with empty
    fields). The job passes a new optional **`ocrFailed: true`** on that path, and ⛔ no `death_date` flag is written;
    the existing `ocr` flag already says why. `missing` / `unreadable` apply only to a certificate that was read.
    ⛔ Nothing is rejected or gated.
  - `rawDateOfDeathPresent` absent (`undefined`) means ⛔ not present ⇒ `missing` (BW-C12).
- **D7 — gates and ledgers.**
  - `microcopy.yaml` `code_globs` gains every new or edited mobile file: `certificate-replacement.tsx`, `shepherd.tsx`,
    `document.tsx`, `handover-otp.tsx`, `lib/filed-claim.ts` (V6), `(claim)/index.tsx` and
    `components/claim/ClaimProxyFlowEntry.tsx` (`-249` §2; both probed clean), and the two hooks. ✅ Probed at validate with the
    real checks: the three existing files raise **exactly** the three literals below, and nothing else.
    - Add scoped FM-14 exemptions, in the 6.18 form, for the literals that must stay: `document.tsx`
      `'#(B00020|1E8E3E)\b'`, `handover-otp.tsx` `'#C0392B\b'`. ⛔ None for the new files (C3).
    - `scripts/microcopy/claim.test.ts` gets a teeth case planting a violation in the new screen, and its §(0) scope
      list is updated.
  - The en/hi parity test passes for every new key.
  - A **row** in `friction-budget.md` `## The ledger`:
    `family (uploading a second death certificate when the first shows no clear or valid date of death) | the as-at-death rule's integrity (-235 Y) | forced`.
    ⚠ (V7) AC-4 diffs **committed** history (`git diff <base>...HEAD`), so it passes vacuously on uncommitted work:
    **commit, then** run `pnpm friction:check` ([[project_friction_budget_baseline_ratchet]]).
  - (V7) `access-wrapper-invariants` scans `apps/api/src/modules/claims` and `packages/domain/src/claim`: the D5 audit
    goes through `emitAuthAudit`, ⛔ never a direct `audit.writeAuditEntry`.
- **D8 — ⛔ no notification dispatch, ⛔ no reminder.** The same as 6.21a D15: the reminder is 6.19's (CC1).

## Acceptance Criteria

### AC1 — The status is true (D1)

**Then** the member read returns each status under its rule, and `not_needed` is returned in each of the eight states
row 1 still covers (table-driven).
**And** a **denied** claim with a rejected review returns `not_needed`, and the app shows ⛔ no *"has not been refused"*
line (invariant 1). A test proves it.
**And** a `reversed` claim with a rejected review returns `replacement_requested` with `reassurance: 'still_open'`;
every other `replacement_requested` has `not_refused`; every other status has `null` (`-249` §4).
**And** `claim_live` is `false` exactly for `denied` and `settled` (`-249` §2).
**And** a legacy row with ⛔ no upload row returns `missing` with `replacement_allowed: true, upload_allowed: true` in
window, and (row 1a) `missing` with `replacement_allowed: false, upload_allowed: true` before verification.
**And** (BW-G5) a claim advanced to `documents_pending` / the window by a NON-certificate document, with ⛔ no
certificate, returns `missing` (row 1a / row 2).
**And** a claim not owned by the member returns 404, with a positive control.
**And** for **every in-window state × every status**, `replacement_allowed` equals the upload handler's decision (C1).
**And** (`-247` §2) a claim in `intake_converged` or `documents_pending` with ⛔ no certificate returns `missing` with
`upload_allowed: true` and `replacement_allowed: false`, and one with a current upload returns `awaiting_review` with
both `false`.
**And** for **every state × every status**, `upload_allowed ⇒ isDeathCertificateUploadAllowed(state, status)`, and the
one divergence (pre-verification with a current upload) is asserted.
**And** `certificate_token` equals the snapshot's current upload id, and is `null` with ⛔ no current upload.
**And** `status === 'replacement_requested'` iff `isDeathCertificateReplacementRequested` is true, for every row.
**And** a refetch after the 202 but before the job commits shows `awaiting_review` in the app, with the upload button
hidden (marker rule 4).
**And** each precedence rule and the offline case is tested with an injected clock, including the `-247` §1 "B
rejected after A" case.

### AC2 — The family can send another (D2, D3)

**Given** `replacement_requested` or `missing`
**When** the member taps the button, runs the handover OTP (a **stale** elevation ⇒ `403 auth.step_up_required` —
proved in an API integration spec), and uploads
**Then** the upload is accepted **without re-picking the file**, the app shows `certificate.awaiting_review`, and the
outcome is announced on both platforms.
**And** `certificate_accepted` and `certificate_awaiting_review` are shown as their own messages, ⛔ never *"upload
failed"*, and `upload_not_allowed` refetches and renders the server's row.
**And** ⛔ no `document.help`, `.defer` or `.saved` key renders on the replacement screen.
**And** with ⛔ no reachable nominee (an empty mask), the view shows **only** the helpline CTA — ⛔ never `otp.no_nominee` (V4, BW-J3).
**And** the outcome is spoken once per platform: a PURE announcement plan `(platform) → liveRegion | iosAnnounce` is
tested in node (V2, BW-C1).
**And** the outcome mapper (error code → outcome) is a pure function, tested in node for every code incl. 413/415.

### AC3 — Their own words (D4)

**Then** a node test drives the pure view function over every status × every reason × both locales and resolves every
returned key through the REAL `t()` (the `tests/unit/nominee-name-copy-resolves.test.ts` pattern — BW-C1: ⛔ no render
harness exists).
**And** the `future_date` case ⛔ never shows `replacement_body`, and the `unclear_date` case ⛔ never shows `_body_future`.
**And** a `reversed` claim ⛔ never shows `certificate.not_refused`, and no status but `replacement_requested` shows either
reassurance line (`-249` §4).
**And** BigDev's `replacement_helpline` wording is unchanged, and the view function places it as the `<CallHelplineCTA>`
label (asserted on the view, ⛔ not by rendering).

### AC4 — The helpline (D5)

**Then**:
- after read-back, the operator sees the selected member's claims with the D1 status, and can upload a replacement
  when `upload_allowed` — including a claim whose certificate was put off at filing (`-247` §2);
- each upload refusal shows its own line (C6);
- the list route writes its audit line, ids and codes only;
- the list route and the upload deny a cross-Pariwar request;
- a tampered-session request gets **404**, with a positive control;
- the component is ⛔ not mounted before the read-back;
- the human-actor gate is green with `expectedMethods: ['post', 'get', 'get']`.

### AC5 — The OCR flag (D6)

**Then** the truth table covers:
- a null date of death with no raw value (`missing`);
- an unreadable raw date (`unreadable`);
- **both early-return paths**, each with a missing date of death;
- a present, valid date (⛔ no `death_date` flag; `date` unchanged).

**And** (BW-C2, per B3) an OCR/fetch failure is a truth-table row too.
**And** the **real job** is run with dirty OCR input (a missing date, an unparseable date, and a fetch failure), and the flag lands on
both `claim_documents.parity_flags` and the upload row.
**And** the panel shows the flag.

### AC6 — Gates (D7)

**Then** the microcopy gate scans every new or edited mobile file, and the planted violation goes red.
**And** the en/hi parity test passes, and the friction row is in the ledger table.

### AC7 — Nothing else moves

⛔ No new predicate, ⛔ no lifecycle state, ⛔ no migration, ⛔ no `dispatch()`, ⛔ no reminder, ⛔ no deadline copy on
replacement surfaces, ⛔ no document-type chooser, and ⛔ no change to the upload handler's decision. The job changes ONLY by passing the
raw-presence input and the `ocrFailed` signal (`-249` §3). The filing entry changes ONLY as `-249` §2 says.

### AC8 — The proof

**Then** everything above is **executed**, and every new guard is proven red by a plant.

## Tasks / Subtasks

- [x] **Task 0 — BigDev's two calls, and the governance order** ✅ 2026-09-26
  - [x] **F1** → **(a)** `certificate_token` (BigDev). Recorded in `2026-09-26-247` §1, committed **ALONE**, before any
    code ([[feedback_governance_commits_precede_implementation]]).
  - [x] **Q1** → **(a)** extend (BigDev). Recorded in `2026-09-26-247` §2; D1's table gains rows 1a/1b and the field
    `upload_allowed`.
  - [x] The wire spelling is snake_case (`-247` §3).
- [x] **Task 0b — BigDev's calls from the BLIND validate (2026-09-26)** — ⛔ the dev does ⛔ not choose; ONE superseding
  author-commit (`2026-09-26-249`, or the next free number) is committed ALONE before the task it blocks:
  - [x] **B1** → no notice without a fresh read (`-249` §1);
  - [x] **B2** → a LIVE filed claim goes to the shepherd screen, **narrowed** so `-239` (b)'s refile stays reachable
    (`-249` §2 — the recommendation as first written would have blocked it);
  - [x] **B3** → `ocrFailed` suppresses `death_date` (`-249` §3);
  - [x] **B4** → the closing sentence split out; `reversed` gets `still_open` (`-249` §4);
  - [x] the `-247` §2 rationale correction (`-249` §5) and the operator lines (`-249` §6).
  ✅ 2026-09-26 — BigDev: *"B1–B4 recommended, correct the Q1 rationale in -247, and record the new helpline operator copy."*
- [ ] **Task 1: API + domain** (AC1, AC4)
  - [ ] `resolveDeathCertificateFamilyStatus` in the leaf (pure; calls the named predicates — C1);
  - [ ] `upload_allowed` and `certificate_token` in the resolver (`-247`);
  - [ ] the member route in `claims.routes.ts` + a handler (e.g. `claims.death-certificate-member.handlers.ts`, or in
    the existing member handler file) — own scope tx, the `getShepherdMember` ownership guard;
  - [ ] the helpline list route in `claims.death-certificate.routes.ts` (+ handler), its audit line and `audit-sink.ts`
    entry, the file header, the gate entry's `expectedMethods`;
  - [ ] contracts in `packages/contracts/src/claims/death-certificate.ts` — `MemberDeathCertificateStatusResponse`, a
    FIVE-value `DeathCertificateFamilyStatus` enum (⛔ never the domain's four-value `DeathCertificateStatus` name —
    BW-C11), and the helpline list response (`.strict()`, snake_case on the wire, ⛔ no
    `@twt/domain` import);
  - [ ] `getDeathCertificateStatus` on `createMemberClaimClient`.
- [ ] **Task 2: Mobile** (AC1–AC3)
  - [ ] the two hooks (extracted, both screens use them);
  - [ ] `certificate-replacement.tsx`;
  - [ ] the `shepherd.tsx` notice (refetch on focus; ⛔ nothing offline — `-249` §1);
  - [ ] the MMKV in-flight marker in `lib/filed-claim.ts` (with `tokenAtWrite`, `-247` §1; ⛔ no status cache, `-249` §1);
  - [ ] (`-249` §2) `ClaimProxyFlowEntry` and the `(claim)/index.tsx` gate: a filed claim on record whose fresh D1 read
    says `claim_live: true` ⇒ `router.replace('/(claim)/shepherd?claimCaseId=…')`; terminal, offline, error or 404 ⇒
    today's wizard entry, unchanged (the `-239` (b) refile). The decision is a pure function, tested in node for all
    five inputs;
  - [ ] the announcements.
- [ ] **Task 3: Copy** (AC3) — `claim.json` en + hi (D4 as split by `-249` §4, with the two new keys); the
  `helpline-claims/i18n-en.ts` read-out lines (D4) and every `-249` §6 line, verbatim.
- [ ] **Task 4: Admin** (AC4) — the multipart client (parsed, C7) + the list GET + hooks, and
  `<HelplineCertificateReplacement>` on `HelplineClaimPage`.
- [ ] **Task 5: OCR** (AC5) — `parity.ts`, `claim-ocr-parity.ts` (the raw-presence input), and `VerifierReviewPanel.tsx`.
- [ ] **Task 6: Gates** (AC6) — microcopy (globs, exemptions, teeth, the scope list), the friction row, the parity test.
- [ ] **Task 7: Tests** (AC8) — ci:local on `:5433` ([[project_live_db_test_gotchas]]: assert membership, never counts).
- [ ] **Task 8: Records** (each marked, ⛔ never deleted — [[feedback_closure_language_precision]])
  - [ ] 6.5 *"no status/polling endpoint"* — **narrowed** (the death certificate has one);
  - [ ] 6.5 `DocumentTypeChooser` — premise re-stated, still **open**;
  - [ ] 6.5 *"Generic 'upload failed' message"* — **narrowed** (the replacement screen distinguishes; `document.tsx`
    does not);
  - [ ] 6.21a chunk 2 *"two new document-upload conflict codes have no i18n/error mapping"* — **closed by 6.21b** (C6),
    once both surfaces map them — at BOTH sites: `deferred-work.md` **and** 6.21a's `[Review][Defer]` line (BW-G7);
  - [ ] 6.20 *"the helpline live-claims read writes no audit line"* — annotated at BOTH sites (`deferred-work.md`
    6-20 2026-09-24b and 6.20's `[Review][Defer]`): 6.21b's route has one; 6.20's still does ⛔ not — ⛔ not closed;
  - [ ] 6.21a's go-live coupling (1) — **discharged on the build**, at EVERY site (BW-G7): the 6.21a header, 6.21a's
    Completion Notes (*"Go-live couplings UNCHANGED: (1) …"*), the conflict-codes bullet, and the ledger;
  - [ ] (BW-G2) the 6.21a legacy-row deferral (*"can show 'No death certificate has been sent yet' for a certificate that
    WAS genuinely sent … needs a distinct 3rd wire reason/status"* — `deferred-work.md` and 6.21a `[Review][Defer]`):
    annotate both — 6.21b now shows `missing_body` in that state; unreachable in production (every handler-minted job
    carries an `uploadId`; only a pre-6.21a-deploy job reaches it, and the app is ⛔ not in production); the third
    status is still ⛔ not built;
  - [ ] (BW-G6) append (⛔ never rewrite) to the two stale *"`backlog` until 6.21a is `done`"* notes: the
    `sprint-status.yaml` row-block comment and the `epics.md` §6.21b header;
  - [ ] (BW-C9) record in `deferred-work.md` that 6.18's friction row sits outside the counted ledger table;
  - [ ] (V5) 6.19's CC1 item — append an annotation: `-247` §2 extends `missing` to `intake_converged` /
    `documents_pending`; whether THAT state is chased is part of protection 3's §0 too (6.19 is `backlog`; ⛔ no code);
  - [ ] (V8) the stale doc-comments, comment-only: `claims.documents.handlers.ts`'s header says the in-window predicate
    is *"the ONE definition … 6.21b's family status shares"* while the handler calls `isDeathCertificateUploadAllowed`
    (`-246` §1) — name both; `claims.death-certificate.routes.ts`'s header (D5 already orders it); and (BW-G9) the leaf's two doc-blocks —
    `isDeathCertificateReplacementRequested` (*"6.21b's family surfaces are built on"* — they are tied by a test, ⛔ not
    a call) and `isDeathCertificateUploadAllowedInReviewWindow` (*"6.21b's `replacementAllowed`"* → `replacement_allowed`;
    the surfaces key on `upload_allowed`);
  - [ ] (V9) `epics.md` §6.21b — one line under its header pointing to `-247` (AC2 now also covers a certificate put off
    at filing);
  - [ ] 6.5's deferred-upload gap (Q1) — recorded in `deferred-work.md` as **found and closed by 6.21b** (`-247` §2),
    on the build;
  - [ ] prepend the ledger safely ([[project_sprint_status_safe_prepend]]).

## Dev Notes

- **Dependency:** 6.21a is `done` (PR #241). Its D2 (the upload rows), D3 (the window), D6 (the in-window upload
  predicate) and D7 (the leaf) are consumed here, as they exist at `eab7ba45`.
- **The leaf stays a leaf** (6.21a T8, [[project_type_only_import_cycle_trap]]): `nominee-name-check.ts` imports it and
  `nominee-determination-persist.ts` evaluates a constant from that at module load. The new resolver imports ⛔ nothing
  new. Typecheck is blind to this; the import cycle would appear at runtime.
- **Two predicates, ⛔ never one** (`-246` §1). 6.21b reads the in-window intake predicate only. ⛔ Never call
  `mayDeathCertificateUploadBecomeCurrent` from a surface: it answers the job's question.
- **Files — UPDATE (read each fully first):**
  - `apps/mobile/app/(claim)/{document,shepherd,handover-otp,index}.tsx`
  - `apps/mobile/components/claim/ClaimProxyFlowEntry.tsx` (`-249` §2)
  - `apps/mobile/lib/filed-claim.ts`
  - `packages/api-client/src/index.ts`
  - `apps/api/src/modules/claims/{claims.routes,claims.death-certificate.routes,claims.death-certificate.handlers}.ts`
  - `apps/api/src/audit/audit-sink.ts`
  - `packages/contracts/src/claims/death-certificate.ts`
  - `packages/domain/src/claim/{parity,death-certificate-approval}.ts`
  - `apps/jobs/src/claim-ocr-parity.ts`
  - `apps/admin/src/api/{client,hooks}.ts`
  - `apps/admin/src/modules/helpline-claims/{HelplineClaimPage,i18n-en}.ts(x)`
  - `apps/admin/src/modules/claim-verification/VerifierReviewPanel.tsx`
  - `packages/i18n/locales/{en,hi}/claim.json`
  - `microcopy.yaml`, `scripts/microcopy/claim.test.ts`, `friction-budget.md`
  - `scripts/claim-adjudication-human-actor-invariant/check.ts`
- **Files — READ, reuse, ⛔ do not change:** `claims.shepherd.handlers.ts` (the ownership guard),
  `packages/domain/src/claim/read.ts` (`listLiveClaimsForDeceasedMember`), `components/common/CallHelplineCTA.tsx`,
  `components/claim/ShepherdContactCard.tsx` (the fetch/cache pattern), `HelplineNomineeCorrection.tsx` (the pick
  pattern). ⚠ `claims.documents.handlers.ts` is UPDATE, comment-only (V8) — its decision logic ⛔ never changes (BW-C8).
- **Files — NEW:**
  - `apps/mobile/app/(claim)/certificate-replacement.tsx`
  - `apps/mobile/lib/use-death-certificate-upload.ts`
  - `apps/mobile/lib/use-handover-otp.ts`
  - `apps/admin/src/modules/helpline-claims/HelplineCertificateReplacement.tsx`
  - specs
- **Conventions:**
  - `useT()` returns a fresh closure, so depend on `locale`, not `t` ([[project_uset_fresh_closure_memo_trap]]).
  - Render empty, loading and error states **outside** any FlatList ([[project_fabric_flatlist_empty_populated_crash]]).
  - MMKV is the storage seam ([[project_mmkv_asyncstorage_equivalent]]).
  - Branded ids are lower-case ([[project_branded_ids_lowercase]]).
  - Any doc-block that quotes `**cl.N**` must be grepped for `\*\*/` afterwards ([[project_markdown_emphasis_closes_jsdoc]]).
  - Prettier is ⛔ not enforced; hand-format, ⛔ never `prettier --write` a whole file ([[project_prettier_not_enforced]]).
  - Tone: `docs/tone-guide.md`.
- **Research:** `_bmad-output/research/p0-2b-bereaved-spouse.md` §3.2 carries the hypothesis
  `A-doc-death-certificate-hardest`, which is **pending interview**. It is ⛔ not evidence. It is the reason for the
  posture: one clear sentence of why, the helpline offered, and "has not been refused" always said (while true).
- **Previous story intelligence (6.18, 6.20, 6.21a):**
  - put a surface where its user is (the helpline raise that 403'd);
  - announce outcomes on both platforms;
  - ⛔ never *"has not been refused"* on a refused claim (`-242`);
  - tests must fail as titled; pin tampered-session tests to 404;
  - 6.21a's review found a legacy row misclassified in a way that blocked the only way out. Test the legacy row on
    the family's side too (AC1);
  - 6.21a's review found a note saying "one shared predicate" that was false. Name the function, and assert it by test;
  - the known pre-existing failures: domain has 7, which are ⛔ not this story's ([[project_known_livedb_test_failures]]).
- **Known limit (V10, pre-existing, ⛔ not changed here):** the app notice is reachable only through
  `ClaimPointOfContactEntry`, which needs the filed-claim pointer stamped at the APP's acknowledgement. A family whose
  claim was filed by the helpline, or on another phone, has ⛔ no entry in the app; their path is the helpline (D5).
- **Known limit (BW-J10, accepted at v0.6):** after a PERMANENT job failure (DLQ) the marker shows *"We have the death
  certificate … nothing more you need to do"* for up to 24 h, then the family is asked again. Record it in the
  Completion Notes.
- **Known limit (BW-G2):** the 6.21a legacy-row state shows `missing_body` for a certificate that was sent; unreachable
  in production (Task 8).
- ⛔ **No new dependency.**

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v0.5 | 2026-09-25 | Created by splitting Story 6.21 (BigDev, after a fresh-context validate). Carries 6.21 v0.4's D9/D12/D14 and the helpline half, with the validate's fixes: the status is true only inside the window (invariant 1, `-242`'s defect class); a `missing` state; the in-flight marker; the handover OTP extracted rather than `useStepUpGate`; the upload hook surfaces errors; deadline copy scoped; FM-14 exemptions; the helpline route moved into an enrolled file with an audit line; the admin multipart client; the Hindi word corrected to `तिथि`; the OCR flag computed before the early returns; the friction row format. |
| v0.6 | 2026-09-25 | BigDev's pre-Task-0 review. **(1)** The server is authoritative and the MMKV marker is a client-only display overlay; what it may and may ⛔ not do is stated. **(2)** Expiry and precedence: four ordered rules plus the offline case, incl. a negative age (the clock moved back) = expired, and the upload button hidden while pending. **(3)** A compact D1 state table: six rows, first match wins, with `replacementAllowed` tied to 6.21a D6's guard by one shared predicate. **(4)** Record ownership verified against 6.21a: the header and Task 0 now name `-244` as the ONE record for both stories, and 6.21a's AC0/Task 0 were fixed to actually carry 6.21b's decisions (they did ⛔ not before). Function ownership in the leaf is split explicitly (6.21a creates it; 6.21b adds `resolveDeathCertificateFamilyStatus`). **(5)** An explicit three-step flip condition. Status stays `backlog`. |
| v0.6.1 | 2026-09-26 | (6.21a code review, `c189cb27`) D1 rows 2 and 5 corrected to `-245` §3 (a legacy row is `missing`). |
| v0.7 | 2026-09-26 | **Re-pinned to `eab7ba45` and FLIPPED `backlog → ready-for-dev`** (bmad-create-story, after 6.21a went `done`). Every cited 6.21a name re-verified. Corrections C1–C7: **C1** `replacementAllowed` is the IN-WINDOW predicate `isDeathCertificateUploadAllowedInReviewWindow`, ⛔ not the handler's `isDeathCertificateUploadAllowed` (`-246` §1: two predicates) — AC1's *"every row"* was false for the two pre-verification states; **C2** the shepherd screen's claim id is a route param; **C3** apps/mobile has no colour token ⇒ ⛔ no status colour on the new screen; **C4** `handover-otp.tsx`'s literal is `#C0392B`; **C5** the helpline line reuses `<CallHelplineCTA label>`; **C6** 6.21b owns the two 409 codes' mapping, which 6.21a deferred to it; **C7** the admin multipart function parses its 202. Added: `upload_not_allowed` handling, retry without re-picking, the `≡ isDeathCertificateReplacementRequested` test, `listLiveClaimsForDeceasedMember` reuse and its read bound, the routes-file header update, `expectedMethods: ['post','get','get']`, and a present-date case in the OCR truth table. **Two open author calls:** F1 (the marker can show "we have it" for up to 24 h after a replacement is rejected — recommended: a `certificateToken` discriminator) and Q1 (a certificate deferred at filing has ⛔ no post-filing upload path in the app or through the helpline — recommended: extend). ⛔ No D changed by this edit; F1/Q1 would change D1 only by a superseding author-commit. |
| v0.8 | 2026-09-26 | **`2026-09-26-247` applied** (BigDev: *"F1 (a) and Q1 (a), supersede by author-commit"*). **F1:** the response carries `certificate_token` (the current upload's id — opaque, ⛔ not a credential, never shown); the marker stores `tokenAtWrite`; rule 2 is *"token OR status differs ⇒ the server wins"*, which catches "B rejected after A"; a test for it. **Q1:** D1 gains rows 1a/1b — in `intake_converged` / `documents_pending`, `missing` offers an upload and a current upload shows `awaiting_review`; a new field `upload_allowed` carries the offer (the app and helpline key on it), while `replacement_allowed` stays the in-window predicate; a soundness test (`upload_allowed ⇒ isDeathCertificateUploadAllowed`) plus the one asserted divergence. **Wire spelling** snake_case (`-247` §3). Superseded sites marked; Task 0 closed. ⛔ No new copy; ⛔ no other D changed. |
| v0.9 | 2026-09-26 | **Validate pass** (V1–V10, the table in §*Validate record*). The significant ones: V2 (the a11y announcement would double-speak on TalkBack), V4 (no reachable nominee ⇒ the step-up is impassable ⇒ helpline), V3 (⛔ not `<ClaimProxyFlowShell>`), V1 (the api-client does ⛔ not map casing — the story is fixed, and `-247` §3 is corrected by erratum `2026-09-26-248`). ⛔ No D changed. |
| v1.0 | 2026-09-26 | **Blind validate** (three fresh-context verifiers; §*Blind validate record*). Applied every author-level finding — the CRITICAL test-harness one (C1) among them. Four calls opened for BigDev as Task 0b (B1 offline — CRITICAL, B2 wizard re-entry, B3 OCR-failure flag, B4 `reversed` copy); they block Tasks 2, 3 and 5 only. ⛔ No D changed. |
| v1.1 | 2026-09-26 | **`2026-09-26-249` applied** (BigDev: *"B1–B4 recommended, correct the Q1 rationale in -247, and record the new helpline operator copy"*). B1 ⛔ no certificate notice offline (⛔ status cache); B2 a live filed claim opens the shepherd screen, **narrowed** for `-239` (b)'s refile (`claim_live`); B3 `ocrFailed` suppresses `death_date`; B4 the closing sentence split into `certificate.not_refused` / `certificate.still_open`, chosen by the server's `reassurance`; `-247` §2's rationale corrected in `-249` §5 (⛔ `-247` unedited); the operator lines live in `-249` §6. Task 0b closed. |
