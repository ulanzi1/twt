---
baseline_commit: a35af210
---

<!--
BASELINE — `a35af210`. The code claims below were re-derived there on 2026-09-25. ⚠ 6.21a lands FIRST and changes several
of the files cited here (the upload handler, the job, the console, `claims.death-certificate.routes.ts`). ⇒ before
Task 1, re-pin to 6.21a's merge commit and re-read every file this story touches.

⭐ SPLIT (BigDev, 2026-09-25): this is **6.21b** — what the FAMILY and the HELPLINE see and do when a death certificate
is rejected (or was never sent), plus the OCR flag for a missing date of death. The rule, its record and the District
Admin's console are **6.21a** (`6-21-death-certificate-clear-date-rule.md`, row `6-21-death-certificate-clear-date-rule`).

LETTERS: `D1`…`D8` are 6.21b's own author decisions (PROPOSED; recorded in `2026-09-25-244` with 6.21a's). 6.21a's are
written `6.21a D2`.

GLYPH REGISTER: `⛔` is ONLY a negation prefix.
ADDRESSING RULE: as 6.21a (no `file:NNN` into newest-first logs; function names are the stable handle).
-->

# Story 6.21b: A Rejected or Missing Death Certificate: the Family Is Asked in Their Own Words, and Can Send Another in the App or Through the Helpline `[SURFACE]`

Status: backlog

> ⚠ **`backlog` on purpose, although the file is complete.** 6.21b builds on 6.21a's tables, upload window, leaf
> module and status helper.
>
> ⭐ **THE FLIP CONDITION, all three required, in this order:**
> 1. the row `6-21-death-certificate-clear-date-rule` reads **`done`**. ⛔ Not `review`, ⛔ not merged-but-open;
> 2. this file is **re-pinned** to 6.21a's merge commit, and every cited 6.21a function name (`isDeathCertificateReplacementRequested`,
>    the D6 predicate, the leaf path, `claims.death-certificate.routes.ts`) is **re-verified** in the tree;
> 3. **then** `backlog → ready-for-dev`, in the same edit as a `sprint-status.yaml` ledger line.
>
> **Record ownership:** 6.21b's D1–D8 and BigDev's 6.21b calls (the helpline wording, the separate future-date
> message, `तिथि`, and `certificate.missing_body` for his yes) are recorded in **6.21a's** author-commit,
> `2026-09-25-244`. That is ONE commit for both stories. 6.21a's Task 0 names them explicitly (6.21a §*Where each
> 2026-09-25 decision is recorded*). ⛔ No second entry is written for 6.21b.
>
> **Rulings:** `-235` Y (a certificate with no clear date is rejected) and `-236` BB (*"family will be asked to produce
> certificate with clear date without the claim being denied"*). **BigDev, 2026-09-25:** a future date is rejected, and
> the family gets a **separate** message for it. For the verbatim text and our readings, see 6.21a §*The rulings*.

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
2. **⛔ No deadline, countdown or urgency** on any replacement surface (`-236` CC1's default: none). ⚠ The filing
   wizard's `document.help`, `document.defer` and `document.saved` say *"within 7 days"*. They must ⛔ not appear on
   the replacement screen.
3. **⛔ No note, date, reviewer or free text reaches the family.** They get a two-value **reason enum** and our copy.
4. **The helpline sees the same status the family sees**, from the same server read.
5. **The OCR flag shows; it never acts.** A missing date of death is **flagged** for the District Admin. It rejects
   ⛔ nothing, and gates ⛔ nothing.

## 📜 Policy meaning (AI-10-1)

**6.21b introduces ⛔ no predicate that gates a member's benefit.** It **surfaces** 6.21a's (see 6.21a §Policy
meaning). The upload window it relies on is 6.21a D6's. The OCR flag (D6 here) is display-only.

## 🎯 What already EXISTS (at `a35af210`; re-read after 6.21a)

- **Member app, post-filing:**
  - `apps/mobile/app/(claim)/shepherd.tsx` is opened from `components/claim/ClaimPointOfContactEntry.tsx` on the home
    tab. It reads the filed claim id from `lib/filed-claim.ts` (MMKV).
  - Upload exists **only** inside the filing wizard: `(claim)/document.tsx`, which uses the claim draft. The draft is
    cleared at acknowledgement.
  - `document.tsx`'s `uploadFile` **swallows every error** into one message. It uses hex literals `#1E8E3E` and
    `#B00020`.
- **The handover OTP:**
  - `(claim)/handover-otp.tsx` runs request → verify via `claimApi.requestHandoverOtp` / `verifyHandoverOtp`, then
    **hard-codes** `router.push('/(claim)/relationship')`. It carries one hex literal.
  - `relationship.tsx` and `consent.tsx` show the "403 → handover-otp" pattern.
  - ⚠ `useStepUpGate` (`components/life-events/useStepUpGate.ts`) is the **wrong tool**: `memberAuth.stepUpRequest`
    sends to the **session member's** phone, while the handover OTP goes to the **nominee's** (`claims.service.ts`
    `sendHandoverOtp`).
- **The member claim client:** `@twt/api-client` `createMemberClaimClient`, instantiated in `apps/mobile/lib/claim-api.ts`.
  That file only instantiates it.
- **Helpline:**
  - `apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx` has ⛔ **no** upload UI, and
    `apps/admin/src/api/client.ts` has ⛔ **no** document-upload function at all.
  - The pattern to copy is `HelplineNomineeCorrection.tsx`: the claim comes from the **selected, read-back member**.
  - The helpline read-out copy lives in `helpline-claims/i18n-en.ts`.
- **Copy:**
  - `packages/i18n/locales/{en,hi}/claim.json` holds flat keys bound by `useClaimT()`, and is in the microcopy
    `copy_globs`.
  - **Mobile CODE files are enumerated one by one** in `microcopy.yaml`'s `code_globs`. Adding a file there turns on
    **FM-14** (the hex-literal check), so 6.18 needed scoped exemptions (see `microcopy.yaml`'s entries for
    `nominee-review.tsx` / `NomineeForm.tsx`).
  - `scripts/microcopy/claim.test.ts` §(0) asserts its own scope list.
  - Hindi uses **`तिथि`** for "date" (`जन्म तिथि`, 17 uses across the locales). ⚠ The v0.1–v0.4 claim that `दिनांक` was
    the house word was **false**.
- **OCR:** `packages/domain/src/claim/parity.ts` → `evaluateParity`.
  - It **returns early** at *"missing member record"* and *"name and DoB both unreadable"*, **before** any date logic.
  - Its date checks run only when `ocr.dateOfDeath !== null` (the `if` guard). ⚠ The often-quoted *"missing evidence
    stays silent here"* comment is about the certificate **issue** date, not the date of death.
  - `VerifierReviewPanel.tsx`'s "Date of death" row shows `parityFlags['date']`.
- **Friction:** `friction-budget.md` `## The ledger` (`payer | protects | event_type`). ⚠ 6.18's row was once found in
  the wrong table and never counted.
- **Human-actor gate:** `claims.helpline.routes.ts` is `ENROLMENT_OWED` (not scanned). 6.21a's
  `claims.death-certificate.routes.ts` **is** enrolled.

## ⚖️ Decisions (the AUTHOR's; recorded in `-244`)

- **D1 — the member status read.**
  - **Route:** `GET /api/v1/member/claims/:claimCaseId/death-certificate`. `memberSession` only (⛔ no step-up:
    read-only, non-PII). Own claim only: a miss and a not-owned claim are both 404 (the 6.12 shepherd-read guard).
  - **Response:** `{ status, replacementReason, replacementAllowed }`.
    - `status`: `'not_needed' | 'missing' | 'awaiting_review' | 'accepted' | 'replacement_requested'`.
    - `replacementReason`: `'unclear_date' | 'future_date' | null`.
    - `replacementAllowed: boolean`.
  - **The state table.** The **server** computes this. Rows are evaluated **top to bottom, first match wins**:

    | # | Condition (server-side, at read time) | `status` | `replacementReason` | `replacementAllowed` | What the app shows (D3) |
    |---|---|---|---|---|---|
    | 1 | claim state **outside** 6.21a's D3 window (incl. `denied`, `approved`, `settled`, appeal states, pre-verification) | `not_needed` | `null` | `false` | nothing new |
    | 2 | in window, **no** `death_certificate` row | `missing` | `null` | `true` | `missing_body` + upload button + helpline line |
    | 3 | in window, current review **`rejected`**, reason `date_of_death_in_future` | `replacement_requested` | `future_date` | `true` | title + `replacement_body_future` + button + helpline line |
    | 4 | in window, current review **`rejected`**, reason `no_date_of_death` or `date_of_death_unclear` | `replacement_requested` | `unclear_date` | `true` | title + `replacement_body` + button + helpline line |
    | 5 | in window, a row exists, ⛔ **no** live current review | `awaiting_review` | `null` | `false` | `awaiting_review` line |
    | 6 | in window, current review **`accepted`** | `accepted` | `null` | `false` | `accepted` line |

    ⭐ `replacementAllowed` is `true` **exactly** where 6.21a D6's upload guard would accept a `death_certificate`
    upload. The resolver and the guard must share **one** predicate, so they cannot disagree; a test asserts it.
  - **Implementation, and who owns which function:** 6.21a **creates** the leaf module
    (`packages/domain/src/claim/death-certificate-approval.ts`) and **builds** `isDeathCertificateReplacementRequested`
    (6.21a D16, Task 2) and D6's upload predicate. **6.21b adds** `resolveDeathCertificateFamilyStatus` to that same
    leaf, built **on** those two. ⛔ No second definition of any condition in the table.
  - **In-flight: the server is AUTHORITATIVE, and the MMKV marker is a client-only DISPLAY OVERLAY.**
    - **Why it exists:** the job writes the upload row (6.21a D2), so between the 202 and the job's commit the server
      still answers `replacement_requested` (row 3/4) or `missing` (row 2).
    - **What it is:** `certificate-pending:{claimCaseId}` → `{ writtenAt, serverStatusAtWrite }`, written on the upload's
      **202** only, and never on an error.
    - ⛔ The marker is **never** sent to the server, **never** read by the helpline, **never** changes
      `replacementAllowed` for the server, and **never** turns a server status into anything **other than**
      `awaiting_review`.
    - **Precedence**, evaluated **in this order** on every render that has a fresh server read:
      1. **The server status is ⛔ not** `replacement_requested` or `missing` (rows 1, 5 or 6) ⇒ **the server wins.**
         Delete the marker and show the server's row. (The job has landed, the District Admin has acted, or the claim
         has left the window.)
      2. **The server status differs from `serverStatusAtWrite`** (e.g. `missing` → `replacement_requested`: the new
         certificate was reviewed and rejected) ⇒ **the server wins.** Delete the marker.
      3. **The marker is 24 hours old or more, or its age is negative** (the device clock moved backwards) ⇒
         **expired.** Delete it and show the server's row. A dead-lettered job therefore asks the family again, which
         is correct: nothing was received.
      4. **Otherwise** ⇒ show `awaiting_review`, with the upload button **hidden**, so the family does ⛔ not upload
         twice while the first is processing.
    - **With no fresh server read** (offline, or an error): show the last cached server status. Apply rule 3 only;
      ⛔ never let the marker alone decide beyond `awaiting_review`.
    - **Tests:** each precedence rule, plus the offline case, with an injected clock.
  - This **narrows** 6.5's deferral *"No status/polling endpoint for the async upload outcome"* for the death
    certificate. Annotate that item; do ⛔ not close it.
- **D2 — the replacement screen, `apps/mobile/app/(claim)/certificate-replacement.tsx`.**
  - **Upload logic:** extract the picker/upload logic from `document.tsx` into `lib/use-death-certificate-upload.ts`.
    Both screens use it; ⛔ never a second copy.
    - The hook **surfaces** `auth.step_up_required`, `claim_document.certificate_accepted` and
      `claim_document.certificate_awaiting_review` as distinct outcomes.
    - `document.tsx` keeps its current single message.
  - **Step-up:** the screen runs the **handover OTP** when the upload returns `auth.step_up_required`. Extract request →
    verify from `handover-otp.tsx` into `lib/use-handover-otp.ts`, used by both.
    - `handover-otp.tsx` keeps its wizard navigation.
    - ⛔ Never `useStepUpGate` (wrong phone).
    - ⛔ Never weaken the upload route's step-up.
  - **Copy:** ⛔ none of `document.help` / `document.defer` / `document.saved` (invariant 2).
  - **Accessibility:** announce the outcome on iOS **and** Android (`AccessibilityInfo.announceForAccessibility`).
    Status is ⛔ never conveyed by colour alone.
  - **Colour:** ⛔ no new hex literals. Use Tamagui tokens; where a literal must stay, add a scoped FM-14 exemption with
    a reason (the 6.18 form).
- **D3 — the post-filing notice.** `shepherd.tsx` reads D1 and renders:
  - for `replacement_requested`: the title, the body chosen by `replacementReason`, the upload button and the helpline
    line;
  - for `missing`: the missing-certificate copy and the button;
  - for `awaiting_review` and `accepted`: one line each;
  - for `not_needed`: nothing.
  - The claim id comes from `lib/filed-claim.ts`.
- **D4 — the copy** (an author-commit, the `-225` precedent; both locales; `claim` namespace).
  - ⭐ `certificate.replacement_helpline` is **BigDev's wording**, and ⛔ must not be reverted.
  - ⭐ `certificate.replacement_body_future` is the **separate** future-date message BigDev asked for.
  - ⭐ The Hindi uses **`तिथि`** (BigDev, 2026-09-25).

| key | en | hi |
|---|---|---|
| `certificate.replacement_title` | A new death certificate is needed | नया मृत्यु प्रमाणपत्र चाहिए |
| `certificate.replacement_body` | The death certificate we received does not show a clear date of death. Please upload one that does. Your claim is still open and has not been refused. | हमें मिले मृत्यु प्रमाणपत्र पर मृत्यु की तिथि स्पष्ट नहीं है। कृपया ऐसा प्रमाणपत्र अपलोड करें जिस पर तिथि स्पष्ट हो। आपका दावा अब भी खुला है और अस्वीकार नहीं हुआ है। |
| `certificate.replacement_body_future` | The date of death on the certificate we received is a future date. Please upload a certificate that shows the correct date of death. Your claim is still open and has not been refused. | हमें मिले मृत्यु प्रमाणपत्र पर मृत्यु की तिथि भविष्य की है। कृपया ऐसा प्रमाणपत्र अपलोड करें जिस पर मृत्यु की सही तिथि हो। आपका दावा अब भी खुला है और अस्वीकार नहीं हुआ है। |
| `certificate.missing_body` | We have not received the death certificate yet. Please upload it. Your claim is still open. | हमें अभी तक मृत्यु प्रमाणपत्र नहीं मिला है। कृपया इसे अपलोड करें। आपका दावा अब भी खुला है। |
| `certificate.replacement_upload` | Upload a new certificate | नया प्रमाणपत्र अपलोड करें |
| `certificate.replacement_helpline` | If you can't upload it, call the helpline and we will help you. | अगर आप इसे अपलोड नहीं कर पा रहे हैं, तो हेल्पलाइन पर कॉल करें — हम आपकी सहायता करेंगे। |
| `certificate.awaiting_review` | We have the death certificate and will review it. There's nothing more you need to do. | मृत्यु प्रमाणपत्र हमें मिल गया है और हम इसकी समीक्षा करेंगे। अभी आपको और कुछ करने की ज़रूरत नहीं है। |
| `certificate.accepted` | The death certificate has been accepted. | मृत्यु प्रमाणपत्र स्वीकार कर लिया गया है। |

  - ✅ `certificate.missing_body` is **new in v0.5**, written by the author for the `missing` state, and **approved by
    BigDev on 2026-09-25** (`-244` §3).
  - **Helpline read-out lines** (`helpline-claims/i18n-en.ts`, English):
    - unclear date: *"The certificate we have doesn't show a clear date of death — the family needs to send another. The claim is still open."*
    - future date: *"The date of death on the certificate we have is a future date — the family needs to send a certificate with the correct date. The claim is still open."*
    - missing: *"We haven't received the death certificate yet — the family needs to send it. The claim is still open."*
- **D5 — the helpline.**
  - **Route:** `GET /api/v1/p/:pariwarId/admin/members/:memberId/death-certificate/claims`, in **6.21a's
    `claims.death-certificate.routes.ts`** (an enrolled file; ⛔ not `claims.helpline.routes.ts`).
    - Gate: `claim.file` at the Pariwar.
    - It lists the member's live claims, each with the D1 status.
    - It writes one audit line, `admin_death_certificate.claims_read`, ids only. This closes the class of 6.20's
      deferral *"the helpline live-claims read writes no audit line"* for this route.
    - Update the gate entry's `expectedMethods` to include the new GET.
  - **Client:** a new **multipart** upload function in `apps/admin/src/api/client.ts` (see the existing multipart
    precedent in that file), plus a hook in `hooks.ts`, for the **existing** helpline documents route.
  - **Component:** `<HelplineCertificateReplacement>` on `HelplineClaimPage`.
    - It mounts only after the read-back is confirmed (the `HelplineNomineeCorrection` gate).
    - One claim is used as-is; with several, the operator picks; with none, it shows "no open claim".
    - It shows the D4 read-out line and the upload control **only** when `replacementAllowed`.
    - It uploads `death_certificate` only. There is ⛔ no type chooser.
  - **The 6.5 `DocumentTypeChooser` deferral:** its premise (*"no Story 6.3 helpline upload surface exists"*) becomes
    **partly false**, because a death-certificate surface now exists. Re-state it: the chooser is still unwired, and
    the other types still have no helpline surface. It stays **open**.
- **D6 — the OCR flag for a missing date of death (display only).** In `evaluateParity`:
  - compute the flag **before** the two early returns;
  - `flags.death_date = 'missing'` when the OCR date of death is null;
  - `flags.death_date = 'unreadable'` when a raw value was present but did not normalise (a new optional
    `rawDateOfDeathPresent` input, passed by the job);
  - either flag forces `ambiguous` + `verifierReviewRequired` (AR-61: absent data → ambiguous);
  - `flags.date` stays the plausibility key, unchanged;
  - `VerifierReviewPanel`'s Date-of-death row shows `death_date ?? date`.
  - ⛔ Nothing is rejected or gated.
- **D7 — gates and ledgers.**
  - `microcopy.yaml` `code_globs` gains every new or edited mobile file: `certificate-replacement.tsx`, `shepherd.tsx`,
    `document.tsx`, `handover-otp.tsx` and the two hooks.
    - Add scoped FM-14 exemptions for any hex literal that must stay (`document.tsx`'s two, `handover-otp.tsx`'s one),
      each with a reason.
    - `scripts/microcopy/claim.test.ts` gets a teeth case planting a violation in the new screen, and its §(0) scope
      list is updated.
  - The en/hi parity test passes for every new key.
  - A **row** in `friction-budget.md` `## The ledger`:
    `family (uploading a second death certificate when the first shows no clear or valid date of death) | the as-at-death rule's integrity (-235 Y) | forced`.
- **D8 — ⛔ no notification dispatch, ⛔ no reminder.** The same as 6.21a D15: the reminder is 6.19's (CC1).

## Acceptance Criteria

### AC1 — The status is true (D1)

**Then** the member read returns each status under its rule, and `not_needed` is returned outside the window.
**And** a **denied** claim with a rejected review returns `not_needed`, and the app shows ⛔ no *"has not been refused"*
line (invariant 1). A test proves it.
**And** a claim not owned by the member returns 404.
**And** a refetch after the 202 but before the job commits shows `awaiting_review` in the app, with the upload
button hidden (marker rule 4).
**And** each of the four precedence rules and the offline case is tested with an injected clock.
**And** `replacementAllowed` equals 6.21a D6's upload guard for every row of the state table (one shared predicate).

### AC2 — The family can send another (D2, D3)

**Given** `replacement_requested` or `missing`
**When** the member taps the button, runs the handover OTP (a **stale** elevation triggers it; a test proves it), and
uploads
**Then** the upload is accepted, the app shows `certificate.awaiting_review`, and the outcome is announced on both
platforms.
**And** `certificate_accepted` and `certificate_awaiting_review` are shown as their own messages, ⛔ never *"upload failed"*.
**And** ⛔ no `document.help`, `.defer` or `.saved` key renders on the replacement screen.

### AC3 — Their own words (D4)

**Then** a test renders every status × every reason × both locales.
**And** the `future_date` case ⛔ never shows `replacement_body`, and the `unclear_date` case ⛔ never shows `_body_future`.
**And** BigDev's `replacement_helpline` wording is unchanged.

### AC4 — The helpline (D5)

**Then**:
- after read-back, the operator sees the selected member's claims with the D1 status, and can upload a replacement
  when `replacementAllowed`;
- the list route writes its audit line;
- the list route and the upload deny a cross-Pariwar request;
- a tampered-session request gets **404**, with a positive control;
- the component is ⛔ not mounted before the read-back.

### AC5 — The OCR flag (D6)

**Then** the truth table covers:
- a null date of death;
- an unreadable raw date;
- **both early-return paths**, each with a missing date of death.

**And** the **real job** is run with dirty OCR input (a missing date, and an unparseable date).
**And** the panel shows the flag.

### AC6 — Gates (D7)

**Then** the microcopy gate scans every new or edited mobile file, and the planted violation goes red.
**And** the en/hi parity test passes, the friction row is in the ledger table, and the human-actor gate is green with
the new GET.

### AC7 — Nothing else moves

⛔ No new predicate, ⛔ no lifecycle state, ⛔ no `dispatch()`, ⛔ no reminder, ⛔ no deadline copy on replacement surfaces,
and ⛔ no document-type chooser.

### AC8 — The proof

**Then** everything above is **executed**, and every new guard is proven red by a plant.

## Tasks / Subtasks

- [ ] **Task 0** — (at the flip) confirm that `-244` carries 6.21b D1–D8, `certificate.missing_body` and the 6.21b
  calls. If any is missing, HALT: it is a record gap, ⛔ not the dev's to fill. Then apply the three-step flip condition
  above.
- [ ] **Task 1: API + domain** (AC1, AC4)
  - the member status route and handler (`claims.routes.ts` + a handler file);
  - the status function in 6.21a's leaf;
  - the helpline list route in `claims.death-certificate.routes.ts`, with its audit line and `audit-sink.ts` entry;
  - the gate entry's `expectedMethods`;
  - contracts in `packages/contracts/src/claims/death-certificate.ts`;
  - the member client in `@twt/api-client`.
- [ ] **Task 2: Mobile** (AC1–AC3)
  - the two hooks;
  - `certificate-replacement.tsx`;
  - the `shepherd.tsx` notice;
  - the MMKV in-flight marker (in `lib/filed-claim.ts`, or next to it);
  - the announcements.
- [ ] **Task 3: Copy** (AC3) — `claim.json` en + hi (D4); the `helpline-claims/i18n-en.ts` lines.
- [ ] **Task 4: Admin** (AC4) — the multipart client + hook, and `<HelplineCertificateReplacement>` on `HelplineClaimPage`.
- [ ] **Task 5: OCR** (AC5) — `parity.ts`, `claim-ocr-parity.ts` (the raw-presence input), and `VerifierReviewPanel.tsx`.
- [ ] **Task 6: Gates** (AC6) — microcopy (globs, exemptions, teeth, the scope list), the friction row, the parity test.
- [ ] **Task 7: Tests** (AC8)
- [ ] **Task 8: Records**
  - annotate 6.5's *"no status/polling endpoint"* (narrowed);
  - re-state 6.5's `DocumentTypeChooser` premise;
  - annotate 6.20's *"helpline live-claims read writes no audit line"* (this route has one);
  - prepend the ledger safely.

## Dev Notes

- **Dependency:** 6.21a must be `done`. Its D2 (the upload rows), D3 (the window), D6 (the upload guard) and D7 (the
  leaf) are consumed here.
- **Files — UPDATE (read each fully first):**
  - `apps/mobile/app/(claim)/{document,shepherd,handover-otp}.tsx`
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
  - Tone: `docs/tone-guide.md`.
- **Research:** `_bmad-output/research/p0-2b-bereaved-spouse.md` §3.2 carries the hypothesis
  `A-doc-death-certificate-hardest`, which is **pending interview**. It is ⛔ not evidence. It is the reason for the
  posture: one clear sentence of why, the helpline offered, and "has not been refused" always said (while true).
- **Previous story intelligence (6.18, 6.20):**
  - put a surface where its user is (the helpline raise that 403'd);
  - announce outcomes on both platforms;
  - ⛔ never *"has not been refused"* on a refused claim (`-242`);
  - tests must fail as titled;
  - pin tampered-session tests to 404.
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
