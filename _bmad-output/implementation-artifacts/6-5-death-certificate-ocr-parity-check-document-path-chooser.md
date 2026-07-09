---
baseline_commit: b49ff66e7b296240dd65a60be396019c518b3cad
---

# Story 6.5: Death Certificate OCR Parity Check + Document Path Chooser

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As any claim-filing flow (Story 6.2 Ravi-mode or Story 6.3 helpline),
I want death-certificate OCR to extract identity fields and run a parity check against the deceased member's records,
so that mismatches are flagged for human review before verification proceeds and forgery / wrong-person submissions are caught early.

## Acceptance Criteria

1. **Upload → OCR extraction → normalization.** Given `<ClaimDocumentUpload>` (FR-38 / UX-DR33), when a death certificate is uploaded against a claim in `intake_converged`, OCR extracts: **deceased name, DoB, date of death, issuing authority, certificate number**; extracted values are **normalized** (trimmed, case-folded, whitespace-collapsed; dates parsed to a canonical form) before comparison.
2. **Parity check against the deceased member's TWT record.** The normalized OCR values are compared against the deceased member's stored identity (Story 3.1 anchor + Story 3.3b `member_kyc_profiles` name/dob). Discrepancies are flagged: **name mismatch beyond fuzzy tolerance**, **DoB mismatch**, **certificate/death date implausible** (e.g. death date after certificate issue date is impossible; death date before the member joined is implausible). The parity outcome is one of `match | mismatch | ambiguous`.
3. **`<DocumentTypeChooser>` selects the document type → the OCR engine selects the parser.** The operator/uploader chooses which document type is being uploaded (**death certificate** vs. ground-inspection photo vs. hospital record); the choice drives which OCR parser/profile the engine applies. v1 ships the **death-certificate** parser; the chooser + parser-selection seam is built so 6.7 (ground-inspection photo) and later doc types plug in without a new dispatch path. **The component is named `<DocumentTypeChooser>` (NOT `<DocPathChooser>`) — see Decision D2: `<DocPathChooser>` is reserved for UX-DR47's Email/SMS/Field-Visit dispatch picker.**
4. **Persistence + event emission.** OCR results (extracted fields) + the parity outcome + per-field flags are persisted (Tier-1 PII discipline — see Dev Notes). The claim advances `intake_converged → documents_pending` by appending **`claim.documents_received`** (single-dot snake — the pinned Story 6.1 event name; the epic's `claim.documents.received` is descriptive prose, NOT the wire name) via `claim.projectClaimState`. Emission is **idempotent** (a retried OCR job must not double-append or double-persist).
5. **OCR mismatch → verifier-review flag + side-by-side preview.** Given a parity `mismatch`, the claim still enters `documents_pending` (the lifecycle has no separate mismatch state — the mismatch is a **data flag** on the persisted record, not a distinct state); the record carries a `verifier_review_required` flag. `<DocumentPreview>` (UX-DR42) shows the original document alongside the OCR-extracted values **and** the deceased member's record for side-by-side comparison in the verifier console (Story 6.10 consumes it; 6.5 ships the component + the read model). The verifier (6.10/6.11) makes the final judgment — 6.5 **never auto-rejects**.
6. **AR-61 staff-fallback — OCR failure / ambiguity never blocks the claim.** When OCR fails to parse, or the parity check is ambiguous (e.g. no KYC profile on file to compare against, low OCR confidence, unreadable document), the case routes to **manual document review** with the same `verifier_review_required` flag and parity outcome `ambiguous`; the OCR failure is **logged (audit) but does not block** the claim advancing to `documents_pending`. Fallback is referenced from the Story 0.7 fallback-handler ledger, not re-implemented per-story.
7. **Bilingual member-facing surfaces.** The member-facing `<ClaimDocumentUpload>` states (upload / progress / uploaded / failed / deferred) and the save-and-resume/defer-7-days reminder copy carry Hindi parity (Story 2.1 surface contract). Admin-facing `<DocumentPreview>` / `<DocPathChooser>` may default English-primary.
8. **6.2 upload seam is preserved, not replaced wholesale.** The member-app `document.tsx` seam (marks `selected`/`deferred` locally, no time pressure, save-and-resume) keeps its grief-paced behavior; 6.5 wires the **real** native picker + capture + upload + OCR trigger behind it. The `deferred` ("I'll upload later", 7-day window as reassurance — never enforced client-side) path stays.

## Tasks / Subtasks

- [x] **Task 1 — `OcrProvider` port + neutral types + concrete provider module + boundary CI gate (AC1, AC3)**
  - [x] Define a FROZEN `OcrProvider` port in `packages/contracts/src/claims/` (new `ocr.ts`, re-exported from `claims/index.ts`), mirroring the `KycProvider` precedent (`packages/contracts/src/kyc/provider.ts`): a pure TS interface + `.strict()` Zod DTOs (`DeathCertificateOcrResult` with the five extracted fields as strings, a `confidence` score, a `documentType` enum) + `z.output` types. **No `@twt/domain` import** (contracts browser-bundle rule — re-declare any enums, value-aligned).
  - [x] Implement the concrete provider in ONE module (e.g. `apps/api/src/modules/claims/ocr/` or `apps/jobs/src/ocr/`), with the transport **injected** (mirror the DigiLocker `transport` injection). **v1 = a deterministic/manual-entry provider ONLY — NO live OCR vendor in 6.5** (Decision D3). The injected transport is the future swap seam; keep the module the sole intended holder of any future vendor transport so the boundary gate can be added later without moving code. Every failure normalizes to a provider error (KycProviderError taxonomy precedent) — never silently return a partial result.
  - [x] Parser selection: the provider picks the death-certificate parser from the `documentType`; the seam accepts future types (ground-inspection photo, hospital record) without a new call site.
  - [x] **DO NOT add an `ocr-provider-boundary` CI gate in 6.5** (Decision D3): with no real vendor transport to forbid, the gate would be vacuously green and misleading. Leave a code comment in the provider module marking it as the sole intended transport holder, so the gate lands cleanly with the vendor-wiring story. (Contrast: the `kyc-provider-boundary` gate exists because DigiLocker has a real `xml-crypto`/`xmldom` transport to fence off.)

- [x] **Task 2 — Claim-document storage port/adapter (Cloud Storage) + metadata persistence (AC4, AC5) — Decision D1**
  - [x] **Define a minimal reusable `ClaimDocumentStorage` port** (contracts or a small platform-adapter — a pure interface: `put(key, bytes, {contentType})`, `signedReadUrl(key, ttl)`, optionally `delete(key)`). Concrete adapter = **Google Cloud Storage** (`asia-south1` per arch §5.2; the audit `gcs-mirror-target.ts` in `apps/jobs/src/audit/` is a live GCS-usage precedent to mirror for client/credential wiring). Transport injected so tests use a fake/in-memory adapter. This port is deliberately reusable — KYC docs / Contribution Note PDFs / bank statements are future consumers (arch line 235). [Port in `@twt/contracts` (documents.ts, added `getBytes` so the job can fetch multi-MB bytes off the queue payload); GCS + in-memory adapters in `@twt/platform-adapters` — the shared home both apps import.]
  - [x] **Do NOT store the document bytes in Postgres.** `claim_documents` persists **only the object key + encrypted PII metadata**: `claim_case_id` (FK → claims, branded `ClaimId`), `pariwar_id` (RLS predicate, branded), `document_type` (pgEnum — `death_certificate` v1), `storage_object_key` (the GCS key; non-PII opaque path — but scope the key namespace by pariwar/claim), `content_type` + `byte_size` (non-PII), extracted-field ciphertext columns (`piiColumn(1, …)` — deceased name / DoB / date-of-death / issuing-authority / certificate-number are PII → Tier-1, **never logged / never echoed**), a non-PII `parity_outcome` enum (`match | mismatch | ambiguous`), a `verifier_review_required` boolean, a JSONB `parity_flags` (per-field mismatch reasons, non-PII), `ocr_confidence`, timestamps.
  - [x] **MIME + size enforcement** at the upload boundary (Task 5) AND defensively before the adapter `put`: allowlist `image/jpeg`, `image/png`, `application/pdf`; cap byte size (pick + document a concrete cap). Reject others with a dignified error, not a 500. [Constants `CLAIM_DOCUMENT_ALLOWED_MIME_TYPES` + `CLAIM_DOCUMENT_MAX_BYTES` (10 MiB) in contracts documents.ts; enforced in Task 5.]
  - [x] Access is **short-lived signed URL** only (`signedReadUrl` with a small TTL — arch line 1741 data-export precedent); the bucket is private; no public object ACLs.
  - [x] Add an RLS policy (`packages/domain/src/policies/…-rls.ts`) — tenant-isolated like `member_kyc_profiles` / `claims`.
  - [x] Add read accessor(s) in `packages/domain/src/claim/` (or a `claim-documents/` module): `getClaimDocuments(db, pariwarId, claimCaseId)` — transport-free PRIMITIVE, returns rows AS STORED (ciphertext columns; the route/job decrypts; the route mints the signed URL from `storage_object_key`). Mirror `getMemberKycProfile`'s "no decryption / no I/O in the accessor" discipline. [+ `getClaimDocumentById` + `getClaimDocumentByType` (idempotency probe).]
  - [x] Generate + apply the migration (drizzle) — **never regenerate an applied migration** (memory [[project_live_db_test_gotchas]]). [Hand-authored `0053_claim-documents.sql` per the 0051/0052 frozen-baseline discipline; deleted the bloated generated catch-up + its snapshot; fixed the journal `when` to follow the daily sequence; applied clean to twt-test-pg.]

- [x] **Task 3 — Parity-check logic (AC2, AC6) — pure + unit-tested**
  - [x] Pure function(s) in `packages/domain/src/claim/` (e.g. `parity.ts`): `evaluateParity(ocr: NormalizedOcrFields, member: DeceasedRecord): ParityResult`. Deterministic, no I/O, unit-testable DB-free (mirror the `claim/state.ts` reducer discipline). Name comparison = documented fuzzy tolerance (Levenshtein/normalized-edit-distance threshold — pick + document a concrete metric; transliteration-tolerant for Devanagari↔Latin is a noted consideration, not a v1 requirement unless D-confirmed). DoB exact-after-normalization. Cert/death-date plausibility rules explicit. [`NAME_MAX_NORMALIZED_DISTANCE = 0.2`; plausibility = death-before-birth / death-before-member-joined / death-in-future.]
  - [x] Missing comparison source (no `member_kyc_profiles` row, or Tier-1 fields RTBF-sentinel'd) → outcome `ambiguous`, NOT `mismatch` (AR-61 — route to manual review, never auto-reject on absent data).
  - [x] The route/job (NOT the pure fn) reads the deceased KYC profile via `kyc.getMemberKycProfile` and decrypts name/DoB via the app-layer `decryptKycField` (`apps/api/src/modules/kyc/kyc-crypto.ts`) under the request/job encryption context, then hands plaintext to the pure fn. [Wired in Task 4.]

- [x] **Task 4 — OCR parity background job (AC1, AC4, AC5, AC6) — idempotent**
  - [x] pg-boss job in `apps/jobs/src/` (precedents: `data-export.ts`, `digilocker-cert-refresh.ts`, `wa-webhook-processor.ts`; wiring in `boot.ts` + `index.ts` + `deps.ts`; queue via `packages/queue`). Enqueued on upload (Task 5) with the `storage_object_key`. The job: fetches the bytes from `ClaimDocumentStorage` by key → runs the `OcrProvider` → normalizes → reads+decrypts the deceased record → `evaluateParity` → upserts the `claim_documents` metadata row (Task 2) → emits `claim.documents_received` via `claim.projectClaimState` inside a scope tx (pariwar scope set; `from_state: 'intake_converged'`, `to_state: 'documents_pending'`, `actor: 'system'`, `trigger` e.g. `'ocr_documents_received'`). [`apps/jobs/src/claim-ocr-parity.ts`; QUEUE_NAMES.CLAIM_OCR_PARITY; env-gated GCS-vs-in-memory storage + deterministic provider wired in boot.ts. OCR provider RELOCATED to `apps/jobs/src/ocr/` — the job is the only `extract()` caller (the API just enqueues), so the D3 sole-transport-holder marker lives there.]
  - [x] **Idempotency (AC4 — load-bearing):** the projector's `(stream_id, event_version)` unique index + the reducer's identity-on-repeat protect state, but a naive retry still writes a second `claim_documents` row and a second event. Guard: one document row per (claim, document_type) upsert, and skip the `claim.documents_received` append when the claim is already `documents_pending` (read `getClaimCase` / current_state first, inside the tx). Catch `ClaimStreamConcurrencyError` and treat as a benign race (return the existing state — the `initiateIntake` precedent). Memory [[project_domain_limit_clamp_and_savepoint_retry]]: 23505 is on `err.cause.code`. [Upsert on the `(claim_case_id, document_type)` unique index; append wrapped in a raw `SAVEPOINT` so a caught `ClaimStreamConcurrencyError` rolls the append back without poisoning the doc-row upsert. Verified by the live-DB idempotency test: run twice → one row, one event, stable state.]
  - [x] OCR/provider failure → catch, persist an `ambiguous` outcome + `verifier_review_required`, emit `claim.documents_received` anyway (AC6 — non-blocking), write the audit line. Do NOT let a provider exception fail the claim. [Broad OCR/fetch catch → empty fields + confidence 0 → ambiguous; low-confidence (< 0.5) forced ambiguous; best-effort non-PII audit line `claim_document.ocr_parity_evaluated`. Live-DB test: provider throw → ambiguous + verifier review + claim STILL advances.]

- [x] **Task 5 — Upload endpoints + `<DocPathChooser>` + real `<ClaimDocumentUpload>` capture (AC1, AC3, AC7, AC8)**
  - [x] **Upload lifecycle guard (AC1, AC5 — API-owned, not the reducer's job).** After the tenant-scoped claim lookup (`getClaimCase(db, pariwarId, claimCaseId)` — `packages/domain/src/claim/read.ts:71`), accept the upload only when `current_state` is `intake_converged` (initial upload) or `documents_pending` (replacement/re-upload after an illegible document or a verifier request). Reject every other state with a stable **`409 CLAIM_DOCUMENT_UPLOAD_NOT_ALLOWED`** via `ConflictError`. **Run this check first — before the MIME/size enforcement, the `put` to `ClaimDocumentStorage`, and the Task 4 job enqueue.** [Code `claim_document.upload_not_allowed` (lowercase-dotted convention; the story's UPPER label is descriptive). Guard-first verified E2E: a rejected upload makes ZERO storage/queue calls.]
  - [x] API: an authenticated upload endpoint per channel — member-app (Ravi-mode session, reuses the `claim_handover` step-up posture) and helpline operator upload-on-behalf (`claim.file` permission). [Multipart via `@fastify/multipart` (registered in server.ts); `documentType` rides a validated querystring, the file rides the multipart body; shared `uploadClaimDocument` core in `claims.documents.handlers.ts`; `put` → enqueue `CLAIM_OCR_PARITY`; 202 `{documentId, status:'processing'}`. The `claim_documents` row is written by the job, keeping one writer.]
  - [x] Mobile: replace the `document.tsx` SEAM with the real `expo-image-picker` / `expo-document-picker` capture (added deps `~55.0.21` / `~55.0.14`, SDK-55-aligned). **Preserved** save-and-resume, the `deferred` 7-day path, and the no-countdown posture. Wire upload progress → the endpoint. [`claimApi.uploadClaimDocument` added to `@twt/api-client` (new `callMultipart`); claimCaseId comes from the draft (stamped at relationship.tsx intake). A no-claimCaseId resume falls back to the 6.2 local seam.]
  - [x] `<DocumentTypeChooser>` (admin/operator): the document-TYPE chooser driving parser selection (Decision D2). Ships in the new `apps/admin/src/modules/claim-verification/` module. Code comment records the epic↔UX `<DocPathChooser>` naming collision + the reservation.
  - [x] i18n (AC7): member-facing upload strings (uploading/uploaded/upload_failed/retry/permission_needed) added to `claim.json` en + hi; the parity gate passes. Reuses `useClaimT` on mobile.

- [x] **Task 6 — `<DocumentPreview>` + verifier-review read model (AC5)**
  - [x] `<DocumentPreview>` (UX-DR42): inline PDF/image viewer + zoom/pan + "request better doc" / "mark illegible" affordances. Admin surface (`apps/admin/src/modules/claim-verification/`). Renders the document via a **short-lived signed URL** minted from `storage_object_key` (Decision D1) — never a long-lived/public link. [Render-tested via RTL.]
  - [x] The side-by-side read model: OCR-extracted values + parity flags + the deceased member's record, one read for the verifier console (Story 6.10 consumes; 6.5 ships the component + the compound read). [`<VerifierReviewPanel>` (admin) + the domain compound read `claim.getClaimDocumentReview` (claim + documents + deceased KYC, no N+1 — the member is read once). Compound read exercised in the jobs live-DB test; panel render-tested. 6.5 provides the panel section + data only — the console + verdict actions are 6.10/6.11.]

- [x] **Task 7 — Tests (all ACs)** — **`pnpm ci:local` (DATABASE_URL on :5433): ALL 23 jobs green**, incl. integration-tests + every invariant gate (claim-state / claim-canonical-id / domain-invariants / pii-scrape / i18n-parity / schema-diff / kyc-provider-boundary). No `ocr-provider-boundary` gate (Decision D3).
  - [x] Unit: `evaluateParity` truth table (match / name-fuzzy-within-tol / name-beyond-tol / DoB-mismatch / implausible-date / missing-source→ambiguous). DB-free (reducer-test precedent).
  - [x] Integration (live DB on :5433): upload → job → `claim_documents` metadata persisted (object key + ciphertext, decrypts back) + `claim.documents_received` appended + state `documents_pending`; **idempotency** (run the job twice → one doc row, one event, state stable); OCR-failure → `ambiguous` + non-blocking advance (AC6); cross-tenant RLS isolation on `claim_documents`. Storage adapter is a fake/in-memory double. [`apps/jobs/tests/claim-ocr-parity.test.ts` — 5 tests.]
  - [x] **Upload lifecycle guard (Task 5):** assert `409 claim_document.upload_not_allowed` for a wrong state; assert `202`-path acceptance from `intake_converged`; assert a rejected upload never reaches `ClaimDocumentStorage.put` nor enqueues the Task 4 job (zero calls); assert a disallowed MIME → 415, no storage/queue calls. [`apps/api/tests/integration/claims/claim-document-upload.spec.ts` — 3 tests, full admin guard chain + hand-built multipart.] Plus admin component render tests (`apps/admin/tests/claim-verification.test.tsx` — 3 tests).
  - [x] Gate/regression: PII-scrape passes; `claim-state-invariant` still green (6.5 writes `current_state` ONLY via `projectClaimState`); `pnpm ci:local` is the merge gate. **No `ocr-provider-boundary` gate in 6.5** (Decision D3).

### Review Findings

- [x] [Review][Patch] AC2 "death after certificate issue date" rule was unimplemented — FIXED: added `certificateIssueDate` as a 6th extracted OCR field across `DeathCertificateFields` (contracts), `RawOcrFields`/`NormalizedOcrFields` (domain), normalization, the deterministic/manual-entry provider, and `evaluateParity` (new `death_after_certificate_issue` flag, absent/unreadable issue date never inferred as a mismatch — AR-61). AC1's extracted-field inventory updated to six fields. New unit tests added (`packages/domain/tests/claim/parity.test.ts`); domain + jobs typecheck clean; `claim/parity.test.ts` (19 tests), `ocr-provider.test.ts` (6 tests), and the live-DB `claim-ocr-parity.test.ts` (5 tests, incl. idempotency) all pass. [packages/domain/src/claim/parity.ts:217-224, packages/contracts/src/claims/ocr.ts:57-67]
- [x] [Review][Defer] AC2 "death before member joined" rule stays inactive in production — `evaluateParity`'s rule is fully implemented + unit-tested, but no canonical membership-start timestamp exists to pass as `member.joinedAt` (`members.createdAt` is row-creation, not membership start, and would false-flag imported/backdated members — decided NOT to approximate with it). Made explicit via code comments at both the `DeceasedRecord.joinedAt` declaration and the `claim-ocr-parity.ts` call site. [packages/domain/src/claim/parity.ts:53-60, apps/jobs/src/claim-ocr-parity.ts:182] — deferred; reason: no trustworthy membership-start/eligibility timestamp available yet — activate when the member lifecycle exposes a historically correct one (incl. imported/backdated-member semantics)
- [x] [Review][Defer] `<DocumentTypeChooser>` (AC3) is built and unit-tested but not wired into any live admin page/route (`apps/admin/src/modules/claim-verification/DocumentTypeChooser.tsx`). [apps/admin/src/modules/claim-verification/DocumentTypeChooser.tsx] — deferred; reason: no existing Story 6.3 helpline upload surface exists to mount it into; live operator-page composition is Story 6.10/6.11's job (same surface-assembly boundary as `<DocumentPreview>`/`<VerifierReviewPanel>`). Acceptance condition recorded in Dev Agent Record: the console story must wire the chooser's selected value into the existing upload request, not recreate document-type selection.
- [x] [Review][Patch] Re-upload of the same document type returns a mismatched `documentId` — FIXED: the handler now looks up an existing row via `claim.getClaimDocumentByType(pariwarId, claimCaseId, documentType)` and reuses its id on re-upload instead of always minting a fresh `randomUUID()`; a truly new upload still mints one. [apps/api/src/modules/claims/claims.documents.handlers.ts:150-155]
- [x] [Review][Patch] Every Tier-1 field was KMS-encrypted twice per job run — FIXED: each field is now encrypted ONCE into a local const, reused in both the `.values()` insert and the `.onConflictDoUpdate({set})` branch. [apps/jobs/src/claim-ocr-parity.ts:199-208]
- [x] [Review][Patch] `apps/api` and `apps/jobs` each constructed independent process-local in-memory `ClaimDocumentStorage` fakes — FIXED: added a new `createLocalFsClaimDocumentStorage` adapter (`@twt/platform-adapters`) backed by a shared OS-temp directory; both apps' `CLAIM_DOCUMENT_BUCKET`-unset fallback now uses it instead of the in-process `Map`, so a real local upload is visible across both processes. 5 new unit tests (`packages/platform-adapters/tests/claim-document-storage/local-fs.test.ts`), incl. a cross-instance round-trip proving the fix. [packages/platform-adapters/src/claim-document-storage/local-fs.ts, apps/api/src/deps.ts:316-325, apps/jobs/src/boot.ts:349-358]
- [x] [Review][Patch] `data.toBuffer()` failures of any kind were mapped to `413 Payload Too Large` — FIXED: only `@fastify/multipart`'s typed `FST_REQ_FILE_TOO_LARGE`/`FST_FILES_LIMIT` errors map to 413; any other `toBuffer()` failure now rethrows unmapped. [apps/api/src/modules/claims/claims.documents.handlers.ts:97-113]
- [x] [Review][Patch] Upload `put`-then-`enqueue` wasn't compensated — FIXED: `enqueue` is now wrapped in try/catch; on failure the just-stored object is best-effort deleted (`storage.delete?.(key).catch(() => undefined)`) before rethrowing the original error. [apps/api/src/modules/claims/claims.documents.handlers.ts:157-176]
- [x] [Review][Patch] Missing `pariwarId` returned as if successful — FIXED: now throws (rather than returning a fake `ambiguous` result), so pg-boss retries/DLQs it instead of silently dropping the job. [apps/jobs/src/claim-ocr-parity.ts:129-134]
- [x] [Review][Patch] Mobile "Try again" always reopened the file/document picker — FIXED: added `lastPicker` state set by `pickPhoto`/`pickFile`; the retry button now reopens whichever picker was actually used. [apps/mobile/app/(claim)/document.tsx]

**Verification (post-patch):** all touched packages (`@twt/domain`, `@twt/contracts`, `@twt/platform-adapters`, `api`, `jobs`, `mobile`) typecheck clean and lint clean; `pii-scrape`, `domain-invariants`, and `claim-state-invariant` gates all pass; full `jobs` test suite (46/46, live DB), `api` test suite (424/424, live DB), `admin` (81/81), `mobile` (10/10), and `@twt/platform-adapters` (6/6, incl. 5 new) all green.
- [x] [Review][Defer] MIME allowlist trusts client-declared Content-Type with no magic-byte verification — security hardening opportunity, not blocking. [apps/api/src/modules/claims/claims.documents.handlers.ts:90] — deferred, pre-existing scope of this diff's upload boundary
- [x] [Review][Defer] Three independent re-declarations of the document-type enum (contracts/domain/admin) — matches the codebase's established contracts/domain non-import convention (explicitly commented as intentional). [packages/contracts/src/claims/ocr.ts:42] — deferred, pre-existing architectural pattern
- [x] [Review][Defer] `normalizeDate` collapses "unparseable format" and "OCR failure" into the same `ambiguous` bucket — behaviorally correct per AR-61, just an observability nicety for the verifier queue. [packages/domain/src/claim/parity.ts:83] — deferred, not a correctness issue
- [x] [Review][Defer] Manual-entry OCR path returns confidence 1.0 from unverified operator-typed values — already called out in the story's own Completion Notes as unreachable in v1 (no `manualEntry` threaded through the queue yet). [apps/jobs/src/ocr/index.ts:95] — deferred, unreachable in v1, revisit when manual entry is wired
- [x] [Review][Defer] No status/polling endpoint for the async upload outcome — matches the same 6.10/6.11 console deferral as `<DocumentPreview>`/`<VerifierReviewPanel>`, explicitly stated in AC5/Dev Notes. [packages/contracts/src/claims/documents.ts:3042] — deferred, explicitly scoped to Story 6.10/6.11
- [x] [Review][Defer] Decrypt/DB failure inside the job's scope-tx is uncaught and retries indefinitely rather than degrading to `ambiguous` — by the code's own comment this is intentional (infra errors retry; only OCR/fetch failures degrade). [apps/jobs/src/claim-ocr-parity.ts:171] — deferred, intentional per existing design comment
- [x] [Review][Defer] One failing job aborts an entire pg-boss batch — identical to the pre-existing `registerDataExportWorkers` pattern in `apps/jobs/src/data-export.ts`; not a regression introduced by this diff. [apps/jobs/src/claim-ocr-parity.ts:345-352] — deferred, pre-existing codebase convention
- [x] [Review][Defer] No audit trail for rejected uploads (409/415/413/400) — minor observability gap. [apps/api/src/modules/claims/claims.documents.handlers.ts:77-117] — deferred, minor observability enhancement
- [x] [Review][Defer] Generic "upload failed" message doesn't distinguish retriable vs. terminal errors on mobile. [apps/mobile/app/(claim)/document.tsx:73-77] — deferred, UX polish
- [x] [Review][Defer] `uploadFile`'s no-`claimCaseId` fallback marks local success without a real upload — per the file's own header comment this is explicitly defensive dead code preserving the pre-existing 6.2 seam; the flow guarantees `claimCaseId` is set before this screen is reached. [apps/mobile/app/(claim)/document.tsx:57-63] — deferred, intentional defensive code, guaranteed unreachable by flow design

## Dev Notes

### What this story consumes (do NOT rebuild these)

- **`claim.documents_received` event + `documents_pending` transition ALREADY EXIST** (Story 6.1). `packages/domain/src/claim/events.ts:102` defines `ClaimDocumentsReceivedPayloadSchema` (= the strict `auditShape`: `from_state`, `to_state`, `trigger`, `actor` — nothing else). `claim/state.ts:104-107`: reducer maps `intake_converged --claim.documents_received--> documents_pending`. It is in `CLAIM_EVENT_TYPES` + `CLAIM_EVENT_PAYLOAD_SCHEMAS`. **6.5 emits it; it does not define it.** [Source: packages/domain/src/claim/events.ts, state.ts]
- **`claim.projectClaimState(client, input)`** is THE single legitimate writer to `claims.current_state`, atomic (append event + replay + cache write in one tx, under the `app.claim_state_writer` trigger guard). Emit through this — never `.update(claims).set({ current_state })` (the `claim-state-invariant` CI gate fails the build otherwise). Requires a raw `pg.PoolClient` in an open tx with `app.pariwar_id` set. [Source: packages/domain/src/claim/project.ts]
- **Precondition state is `intake_converged`, NOT `intake_pending`.** Story 6.4 changed a freshly-minted lone intake to persist `intake_converged` (claims.service.ts:236 note) precisely to unblock this documents chain. The reducer only advances to `documents_pending` **from `intake_converged`**; a `documents_received` in any other state is identity (no-op). [Source: apps/api/src/modules/claims/claims.service.ts:236-238, claim/state.ts:105-107]
- **Parity comparison source** = the deceased member's `member_kyc_profiles` row (`nameCiphertext`, `dobCiphertext` — Tier-1). Read via `kyc.getMemberKycProfile(db, pariwarId, memberId)` (returns ciphertext AS STORED, no decrypt), decrypt at the app layer via `decryptKycField` (`apps/api/src/modules/kyc/kyc-crypto.ts`). **A member may have no KYC profile** (manual path optional / not yet done) → parity `ambiguous` → manual review (AC6), NOT `mismatch`. [Source: packages/domain/src/kyc/profile-read.ts, schema/member_kyc_profiles.ts]
- **6.2 mobile upload seam**: `apps/mobile/app/(claim)/document.tsx` + `apps/mobile/lib/claim-draft.ts` (`ClaimDocumentStage = 'none' | 'selected' | 'deferred'`). The buttons currently mark local intent WITHOUT a native picker — flagged loudly as "Story 6.5 owns the real picker + OCR + storage." Wire the real capture behind this seam; keep save-and-resume + the `deferred` 7-day reassurance path. `expo-image-picker` / `expo-document-picker` are NOT yet deps (add them); `expo-file-system` IS present. [Source: apps/mobile/app/(claim)/document.tsx:1-9, lib/claim-draft.ts:24-25]

### Decisions (LOCKED by BigDev 2026-07-09)

- **Decision D1 — death-cert storage = Cloud Storage now, via a reusable port. LOCKED.** **Do NOT store multi-MB document base64 in Postgres.** Introduce a minimal reusable `ClaimDocumentStorage` port + a **Google Cloud Storage** adapter (`asia-south1`; the audit `gcs-mirror-target.ts` is a live GCS-wiring precedent). `claim_documents` persists **only the object key + encrypted/PII metadata** (extracted fields Tier-1; outcome/flags non-PII). Access via **short-lived signed URLs** (arch line 1741 precedent); private bucket; enforce a **MIME allowlist + size cap** at the upload boundary and before `put`. Rationale: death certs are multi-MB PDFs; the KYC base64-in-Postgres path does not scale to them, and object storage is an architecture must-have (line 235) whose first real consumer is this story. Port is reusable so KYC docs / Contribution-Note PDFs / bank statements adopt it later.
- **Decision D2 — component renamed to `<DocumentTypeChooser>`; `<DocPathChooser>` reserved. LOCKED.** Preserve the epic AC's document-type→OCR-parser **behavior**, but name the component **`<DocumentTypeChooser>`**. Reserve **`<DocPathChooser>`** exclusively for UX-DR47's Email/SMS/Field-Visit **dispatch-path** chooser (a separate helpline doc-*request* concern, not built here). **Record the epic↔UX naming conflict** in the component's code comment (epic line 2381 uses `<DocPathChooser>` for the type chooser; UX spec line 2105 uses the same name for the dispatch picker — 6.5 resolves it by renaming the type chooser).
- **Decision D3 — abstraction-first OcrProvider; NO live vendor; NO boundary gate yet. LOCKED.** Ship the `OcrProvider` port + a **deterministic/manual-entry** concrete provider (transport injected as the future swap seam). **No live OCR vendor is wired in 6.5.** **Do NOT add the `ocr-provider-boundary` CI gate now** — with no real vendor transport to forbid it would be vacuously green and misleading; it lands with the vendor-wiring story. Mark the provider module (code comment) as the sole intended future transport holder so the gate drops in without moving code. (Contrast the `kyc-provider-boundary` gate, which fences a real `xml-crypto`/`xmldom` transport.)

### Files to touch (source-tree map)

- `packages/contracts/src/claims/ocr.ts` (NEW) + `claims/index.ts` (export) — the `OcrProvider` port + DTOs.
- `packages/contracts/src/claims/documents.ts` (NEW) — the upload request/response wire DTOs + the `ClaimDocumentStorage` port (or place the port in `packages/platform-adapters/` if it needs a non-browser-safe type).
- `packages/domain/src/schema/claim_documents.ts` (NEW) + `schema/index.ts` (export) — metadata persistence (object key + PII ciphertext + outcome/flags; **no bytes**).
- `packages/domain/src/policies/claim-documents-rls.ts` (NEW) — RLS.
- `packages/domain/src/claim/parity.ts` (NEW) + `claim/read.ts` or a new accessor — pure parity + reads; export from `claim/index.ts`.
- The **GCS `ClaimDocumentStorage` adapter** — `apps/jobs/src/` and/or `apps/api/src/` (shared via a small module; mirror `apps/jobs/src/audit/gcs-mirror-target.ts` for client/credential wiring). Injected; fake adapter in tests.
- `apps/jobs/src/claim-ocr-parity.ts` (NEW) + `boot.ts` / `index.ts` / `deps.ts` — the pg-boss job.
- `apps/api/src/modules/claims/` — upload handler(s) + routes (`claims.handlers.ts` / `claims.routes.ts` / `claims.helpline.handlers.ts` patterns) + the OCR provider module (`claims/ocr/` — sole intended future-transport holder; deterministic provider only).
- `apps/mobile/app/(claim)/document.tsx` (UPDATE — real picker) + `lib/claim-draft.ts` (UPDATE if new draft fields) + `package.json` (add `expo-image-picker` + `expo-document-picker`).
- `apps/admin/src/modules/…` — `<DocumentTypeChooser>` (NOT `<DocPathChooser>`), `<DocumentPreview>`, verifier-review panel section (admin, English-primary OK).
- Migrations under the drizzle migrations dir (generate; never regenerate an applied one).
- **NOT in 6.5:** `scripts/ocr-provider-boundary/` — deferred to the vendor-wiring story (Decision D3).

### Architecture / cross-cutting constraints

- **PII discipline (AR-12 / Story 1.5 / 1.16b gate).** The death-cert blob AND every extracted identity field (name, DoB, date-of-death, issuing authority, cert number) are PII → **Tier-1** (`piiColumn(1, …)`). Never log/echo them (presence-flag summaries only — the KYC precedent). The parity **outcome** + per-field flag reasons are non-PII metadata (safe to surface to the verifier). Encryption is app-layer (the accessor stores/returns ciphertext; the route/job encrypts/decrypts under the pariwar-keyed context — the `nominee-crypto` / `kyc-crypto` precedent). [Source: schema/member_kyc_profiles.ts:14-22, apps/api/src/modules/kyc/kyc-crypto.ts]
- **`claims` is the lifecycle ANCHOR, not the dossier.** OCR/document columns are explicitly "downstream stories' to add (6.5–6.8)" — add them in a NEW `claim_documents` table, NOT as columns on `claims`. [Source: packages/domain/src/schema/claims.ts:1-9]
- **Naming discipline** (arch L3663-3677): DB columns snake_case, TS fields camelCase, tables snake_case-plural. Event names single-dot `resource.action` snake_case (the pinned 6.1 seam — the epic's double-dot `claim.documents.received` is prose, use `claim.documents_received`). [Source: packages/domain/src/claim/events.ts:16-25]
- **AR-61 staff-fallback at every node** — reference the Story 0.7 fallback-handler ledger; do not re-implement. The claim-flow stories carrying this are enumerated in the epic (6.2, 6.3, **6.5**, 6.6, 6.7, …). [Source: epics.md:2280]
- **Fastify `onSend` gotcha** (memory [[project_fastify_onsend_doublesend]]): if the upload handler sets body-independent headers, use `onRequest`, not an async `onSend` with `void reply…send()`.
- **Sprint ledger convention** (memory [[project_sprint_status_ledger]]): flip `development_status[6-5-…]`; `last_updated` is a top-of-file reverse-chron COMMENT ledger (one combined entry at completion).

### Previous-story intelligence (Story 6.4 — ICP, the immediate predecessor)

- 6.4 hardened the **canonical-identity invariant** (one death → one `claim_case_id`; merge/override cross-checks that a channel belongs to the SAME death before mutating). 6.5 operates on an already-converged single claim — no dedup logic here, but respect the invariant: the upload/job keys strictly on the resolved `claimCaseId` + `pariwarId`.
- 6.4 lessons that transfer: **advisory-lock + re-check-after-lock** discipline for concurrent mutations; **avoid N+1** (one LEFT JOIN, not per-row reads) in any list/read model; the AST-gate blind spots (snake_case keys, ids inside larger strings) if you add/extend a boundary gate. [Source: sprint-status.yaml last_updated ledger 2026-07-09; apps/api/src/modules/claims/claims.service.ts]
- 6.4 confirmed a lone intake now lands `intake_converged` — that IS 6.5's entry precondition (above).

### Testing standards

- Live-DB integration on the `twt-test-pg` Docker at :5433 (`DATABASE_URL`). Never regenerate an applied migration (42P07); never `DROP SCHEMA` to reset (42P01 — strips `twt_app` USAGE); own-committing writers accumulate rows → assert membership, not counts. [memory [[project_live_db_test_gotchas]]]
- Merge gate is `pnpm ci:local` (mirrors all ci.yml jobs; GitHub Actions suspended). Use `--concurrency=4` posture to avoid timeout flakes. [memory [[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]]
- Pure `evaluateParity` gets a DB-free unit truth-table (the `claim/state.ts` reducer-test precedent). The job gets a live-DB integration incl. the idempotency + non-blocking-failure paths.

### Project Structure Notes

- Monorepo: `@twt/contracts` (ports/DTOs, no domain import), `@twt/domain` (schema + pure logic + accessors; cannot import `@twt/events` — the turbo cycle), `apps/api` (routes/handlers/providers), `apps/jobs` (pg-boss workers), `apps/mobile` (expo), `apps/admin`. This story spans all five — normal for a `[CONSUMER]` that wires a full flow.
- No conflicts detected with the existing structure; the new `claim_documents` table + `OcrProvider` port slot into established precedents (KYC profile table + KycProvider port).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.5 (lines 2369-2390)] — the ACs.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6 (lines 2260-2280, 2317)] — demoable closure, OCR-as-background-job, AR-61 enumeration.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — `<ClaimDocumentUpload>` (1973), `<DocumentPreview>` (2059), `<DocPathChooser>` (2105 — the dispatch-picker; see Decision D2).
- [Source: _bmad-output/planning-artifacts/architecture.md] — object storage (235, 2953), signed URL (1741), per-Pariwar OCR provider (2031-2037), OCR risk (4886, 4958).
- [Source: packages/domain/src/claim/events.ts, state.ts, project.ts, read.ts; schema/claims.ts, member_kyc_profiles.ts; kyc/profile-read.ts] — the consumed primitives.
- [Source: packages/contracts/src/kyc/provider.ts; apps/api/src/modules/kyc/providers/digilocker/index.ts; scripts/kyc-provider-boundary/] — the provider-port + boundary-gate precedent to mirror for OCR.
- [Source: apps/mobile/app/(claim)/document.tsx, lib/claim-draft.ts] — the 6.2 upload seam 6.5 completes.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8) — BMAD dev-story workflow.

### Debug Log References

- Drizzle `db:generate` emitted a bloated catch-up migration (snapshot baseline frozen at 0020) + a stray `meta/0053_snapshot.json` + a journal entry with an out-of-sequence `when`. Reconciled per the 0051/0052 hand-authored discipline: deleted the generated SQL + snapshot, hand-authored `0053_claim-documents.sql` (net-new DDL only), and fixed the journal `when` to follow the daily sequence (else drizzle skips by `when`, not SQL hash). Applied clean to twt-test-pg.
- Jobs integration test initially failed at teardown: `events_log` is append-only (AR-8 trigger blocks DELETE). Cleanup now deletes only `claims` (cascades `claim_documents`) + `members`; event rows are left orphaned (fresh UUIDs per test).
- Mobile tamagui `XStack` typing rejected `alignItems`/`ai` in this config — used `YStack` instead.
- Admin `<DocumentTypeChooser>` onChange test: clicking an already-checked radio does not fire onChange — the test starts from a different value so the click is a real change.

### Completion Notes List

- **All 7 tasks complete; `pnpm ci:local` (DATABASE_URL on :5433) — 23/23 jobs green**, including the live-DB integration-tests job and every invariant gate.
- **Decisions honored:** D1 (GCS object storage via the reusable `ClaimDocumentStorage` port; only the object key + Tier-1 metadata in Postgres, never bytes); D2 (component named `<DocumentTypeChooser>`; `<DocPathChooser>` reserved, collision recorded in code comment); D3 (abstraction-first `OcrProvider` + deterministic/manual-entry provider, NO live vendor, NO `ocr-provider-boundary` gate — the provider module carries the sole-transport-holder marker).
- **Notable design choices (for review):**
  - The OCR provider was placed in `apps/jobs/src/ocr/` (not apps/api) — the OCR + parity JOB is the only `extract()` caller; the API upload endpoint only stores bytes + enqueues.
  - `ClaimDocumentStorage` port gained a `getBytes(key)` method (the job re-fetches multi-MB bytes from object storage by key — they must not ride the Postgres-backed pg-boss payload).
  - The shared GCS + in-memory adapters live in `@twt/platform-adapters` (both apps/api and apps/jobs import them; apps cannot depend on apps).
  - **v1 production behavior:** with no live OCR vendor and no manual-entry threaded through the queue (PII must not sit in the Postgres queue payload), a real upload's OCR yields an empty parse → `ambiguous` + `verifier_review_required` → the AR-61 staff-fallback (a human reviews). The full match/mismatch pipeline is wired + tested via an injected provider double; it activates the moment the vendor-wiring story lands (or manual entry is threaded).
  - Upload transport = `@fastify/multipart` (new dependency — user was consulted; proceeded on best judgment after no response). Mobile pickers = `expo-image-picker ~55.0.21` + `expo-document-picker ~55.0.14` (SDK-55-aligned; pre-approved by the 6.2 seam note).
  - 409 code is `claim_document.upload_not_allowed` (lowercase-dotted convention; the story's `CLAIM_DOCUMENT_UPLOAD_NOT_ALLOWED` is the descriptive label).
- **Mobile + admin surfaces are typecheck-clean + (admin) render-tested, but NOT exercised on a device/browser** (no native/browser runtime in this environment).
- Parity metric: normalized Levenshtein, name tolerance `NAME_MAX_NORMALIZED_DISTANCE = 0.2`; DoB exact-after-normalization; plausibility = death-before-birth / death-after-certificate-issue / death-before-member-joined / death-in-future. OCR confidence < 0.5 forces `ambiguous`.
- **Post-review addendum (code review, 2026-07-09):** added a 6th extracted OCR field `certificateIssueDate` (contracts + domain + provider) and the `death_after_certificate_issue` plausibility rule in `evaluateParity` — AC1's field inventory was internally inconsistent with AC2 (AC2 referenced comparing against an issue date that AC1 never listed as extracted). `death_before_member_joined` stays deliberately INACTIVE in production (see below) — its unit tests remain as the pipeline's readiness proof for when a real `joinedAt` source lands.
- **Surface-assembly boundary — `<DocumentTypeChooser>` (AC3) is NOT wired into any live operator page.** 6.5 owns the component (tested, reusable) and the end-to-end parser-selection CONTRACT — the upload API already accepts `documentType` and routes it to the correct OCR parser. But no existing Story 6.3 helpline document-upload surface exists to mount the chooser into; live operator-page composition is Story 6.10/6.11's job (the claim console assembly that first owns that workflow), same boundary as `<DocumentPreview>`/`<VerifierReviewPanel>`. Acceptance condition for whichever story closes this: wire the chooser's selected value into the EXISTING upload request — do not recreate document-type selection.
- **`death_before_member_joined` is deliberately inactive in production.** `evaluateParity` fully implements + unit-tests the rule, but no canonical membership-start timestamp exists yet to pass as `member.joinedAt` — `members.createdAt` is row-creation, not membership start, and would false-flag imported/backdated members. Decided NOT to approximate with `createdAt`. Activates the moment a caller supplies a trustworthy value (see code comments at `packages/domain/src/claim/parity.ts:53-60` and `apps/jobs/src/claim-ocr-parity.ts:182`).

### File List

**Contracts (`packages/contracts/src/claims/`)**
- `ocr.ts` (NEW) — the frozen `OcrProvider` port + DTOs + `OcrProviderError` taxonomy.
- `documents.ts` (NEW) — upload wire DTOs + `ClaimDocumentStorage` port (+`getBytes`) + MIME/size constants + `ClaimDocumentParityOutcome`.
- `index.ts` — export the two new modules.

**Domain (`packages/domain/src/`)**
- `schema/claim_documents.ts` (NEW) — the metadata table + 2 pgEnums (Tier-1 `piiColumn` fields; object key + non-PII outcome/flags).
- `schema/index.ts` — export claim_documents.
- `policies/claim-documents-rls.ts` (NEW) — tenant-isolation RLS.
- `claim/parity.ts` (NEW) — pure `evaluateParity` + normalization + Levenshtein.
- `claim/documents.ts` (NEW) — `getClaimDocuments` / `getClaimDocumentById` / `getClaimDocumentByType` / `getClaimDocumentReview` (compound read).
- `claim/index.ts` — export the two new modules.
- `ids/index.ts` — `ClaimDocumentId` brand + factory.
- `migrations/0053_claim-documents.sql` (NEW, hand-authored) + `migrations/meta/_journal.json` (entry).
- `tests/claim/parity.test.ts` (NEW).

**Platform adapters (`packages/platform-adapters/`)**
- `src/claim-document-storage/gcs.ts` (NEW) + `in-memory.ts` (NEW) + `src/index.ts` (export); `package.json` (+`@google-cloud/storage`, `@twt/contracts`).
- `src/claim-document-storage/local-fs.ts` (NEW, post-review) — shared-directory filesystem adapter replacing the in-memory fake as the dev/CI cross-process fallback; `tests/claim-document-storage/local-fs.test.ts` (NEW, 5 tests).

**Queue (`packages/queue/src/index.ts`)** — `QUEUE_NAMES.CLAIM_OCR_PARITY`.

**Jobs (`apps/jobs/src/`)**
- `claim-ocr-parity.ts` (NEW) — the OCR + parity worker + `registerClaimOcrParityWorker`.
- `ocr/index.ts` (NEW) — the deterministic `OcrProvider` (D3 sole-transport-holder).
- `boot.ts` — wire the worker (env-gated GCS/in-memory storage + deterministic provider).
- `package.json` (+`@twt/platform-adapters`).
- `tests/claim-ocr-parity.test.ts` (NEW) + `tests/ocr-provider.test.ts` (NEW).

**API (`apps/api/src/`)**
- `modules/claims/claims.documents.handlers.ts` (NEW) — the shared upload core + member/helpline handlers.
- `modules/claims/ocr-parity-queue.ts` (NEW) — the send-only enqueuer.
- `modules/claims/claims.routes.ts` + `claims.helpline.routes.ts` — the two upload routes.
- `plugins/multipart/index.ts` (NEW) + `server.ts` — register `@fastify/multipart`.
- `context.ts` — `claimDocumentStorage` + `claimOcrParityQueue` deps + `ClaimOcrParityEnqueuer` type.
- `deps.ts` — wire the two seams (env-gated storage + pg-boss enqueuer); `index.ts` — drain the enqueuer.
- `http-errors.ts` — `PayloadTooLargeError` (413) + `UnsupportedMediaTypeError` (415).
- `audit/audit-sink.ts` — `member_claim.document_uploaded` + `helpline_claim.document_uploaded` event types.
- `package.json` (+`@fastify/multipart`, `@twt/platform-adapters`).
- `tests/integration/_setup.ts` — `CapturingClaimOcrParityQueue` + in-memory storage fakes.
- `tests/integration/claims/claim-document-upload.spec.ts` (NEW).

**API client (`packages/api-client/src/index.ts`)** — `callMultipart` + `uploadClaimDocument`.

**Mobile (`apps/mobile/`)**
- `app/(claim)/document.tsx` — real expo picker + upload behind the 6.2 seam.
- `lib/claim-api.ts` (unchanged; uses the new client method).
- `package.json` (+`expo-image-picker`, `expo-document-picker`).

**Admin (`apps/admin/src/modules/claim-verification/`)** (NEW module)
- `DocumentTypeChooser.tsx` (AC3, D2) + `DocumentPreview.tsx` (AC5) + `VerifierReviewPanel.tsx` (AC5) + `index.ts`.
- `tests/claim-verification.test.tsx` (NEW).

**i18n (`packages/i18n/locales/{en,hi}/claim.json`)** — upload-state strings (en + hi parity).

### Change Log

- 2026-07-09 — Story 6.5 implemented (all 7 tasks). Death-cert OCR parity: frozen `OcrProvider` port + deterministic v1 provider (D3); reusable `ClaimDocumentStorage` port + GCS/in-memory adapters + `claim_documents` metadata table + RLS + migration 0053 (D1); pure `evaluateParity`; idempotent OCR + parity pg-boss job advancing `intake_converged → documents_pending`; member + helpline multipart upload endpoints with the lifecycle guard; real expo pickers on the mobile seam; `<DocumentTypeChooser>` (D2) + `<DocumentPreview>` + `<VerifierReviewPanel>` + the compound verifier read model. `pnpm ci:local` — 23/23 green (incl. live-DB integration). Status → review.
- 2026-07-09 — Code review pass (bmad-code-review): 3 `decision-needed` resolved (added `certificateIssueDate` 6th OCR field + `death_after_certificate_issue` plausibility rule — fixed now; `death_before_member_joined` confirmed intentionally inactive pending a canonical membership-start source — deferred; `<DocumentTypeChooser>` confirmed a Story 6.10/6.11 surface-assembly boundary — deferred), 7 `patch` findings fixed (re-upload documentId reuse, single-encrypt-per-field, shared local-fs storage adapter replacing the cross-process-invisible in-memory fake, narrowed 413 mapping, put/enqueue compensation, missing-pariwarId now throws for retry, mobile retry picker parity), 10 findings deferred with recorded rationale, 1 dismissed (working as designed). All touched packages typecheck/lint clean; full live-DB test suites green; `pii-scrape`/`domain-invariants`/`claim-state-invariant` gates green. Status → done.
