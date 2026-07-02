---
baseline_commit: 67d954dbea4f3d76157d8080d3c710c8b3f80376
---

# Story 3.11: Data Export ZIP (DPDPA Member Right)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member exercising my DPDPA data-portability right,
I want to download a ZIP containing all my data held by TWT (profile, contribution history, claim history, audit history of my actions, consent records, payment receipts, event stream),
so that I can take a complete, human-readable copy of my data with me whenever I want it — including up to the point I withdraw.

## Acceptance Criteria

**AC1 — Member-initiated async export request.** Given FR-95 + AR-12 PII tier model + the DPDPA data-portability commitment, when a member requests an export from the app, then: a `POST /api/v1/member/data-export` (authenticated member session) creates a `data_exports` record in `pending` and **enqueues a pg-boss job** (Story 1.12 substrate) to generate the ZIP off the request path; the endpoint returns `{ exportId, status: 'pending' }` immediately. Generation is asynchronous because it will grow to "several minutes for active members" once Epic 7/8 contribution history exists — the async pattern is committed now even though the Epic-3 payload is sub-second. **Only one active (`pending`/`ready`-unconsumed) export may exist per member at a time** — a second request while one is in flight returns the existing record (idempotent), not a duplicate job.

**AC2 — The ZIP contents (seven files, schema-stable).** Given the export job runs, when it assembles the archive, then the ZIP contains exactly these member-readable JSON files, each with a stable top-level shape:
- `profile.json` — member identity (name, mobile, DOB, address, KYC verification strength) **+ declared nominees (75/25 split) + medical disclosure + postings/attribution**. PII fields are **decrypted** (the member is the legitimate audience — Story 1.5 envelope `decryptTier1`). *(Note: email omitted — not part of the member data model; members authenticate by mobile only.)*
- `consent_records.json` — all consent grants/revocations (Story 2.7 `consent/read.ts`).
- `payment_receipts.json` — all Vyawastha Shulk receipts (Story 3.6b `vyawastha_shulk_receipts`); contribution payments are Epic 8 (not yet present).
- `event_stream.json` — the member's full `events_log` history (Story 3.1) — the canonical record.
- `audit_history.json` — audit lines where this member is the **actor** (Story 1.10 `audit_log_entries`). *(Note: `audit_log_entries` has no `subject_id` column; actor-only is the correct scope at this epic.)*
- `contribution_history.json` — **schema-stable EMPTY** at this epic (source system = Epic 8): `{ "records": [], "_status": "no_source_system_at_this_epic", "_wired_by": "Epic 8" }`.
- `claim_history.json` — **schema-stable EMPTY** at this epic (source system = Epic 6): `{ "records": [], "_status": "no_source_system_at_this_epic", "_wired_by": "Epic 6" }`.
All seven files are always present (the epic AC lists all seven); the two not-yet-sourced files carry documented empty placeholders wired to real reads when their epics land (see Dev Notes §"Content scope"). A top-level `manifest.json` records `{ exportId, memberId, pariwarId, generatedAt, schemaVersion, files: [...] }`.

**AC3 — One-time, 24h, session + step-up-gated download.** Given the ZIP is `ready`, when the member downloads it, then `GET /api/v1/member/data-export/:id/download` is gated by `[requireMemberSession, requireMemberStepUp(deps, 'data_export')]` (NEW distinct step-up context `'data_export'` — no other elevation satisfies it, and vice-versa) and enforces: (a) the export belongs to the authenticated member; (b) `status === 'ready'`; (c) `now < expires_at` (= `ready_at + 24h`); (d) `consumed_at IS NULL` (**one-time** — the first successful download sets `consumed_at`; subsequent attempts return `410 data_export.consumed`). The response streams `application/zip` with a `Content-Disposition` filename. A `GET /api/v1/member/data-export/:id` status route (session only, NO step-up) lets the client poll `pending → ready|failed` without an elevation.

**AC4 — PII discipline + encrypt-at-rest for the artifact.** Given the ZIP unavoidably contains **decrypted** Tier-1 PII (the member's own data), when the artifact is persisted between generation and download, then the ZIP bytes are stored **envelope-encrypted at rest** (`data_exports.artifact_ciphertext`, `piiColumn(1, 'data_export')`) and decrypted only inside the gated download handler — the plaintext ZIP never sits at rest (honors architecture §2.7 Tier-1 encrypt-at-rest; reconciles the "short-lived object" intent that the deferred signed-URL approach would have provided). Audit lines (`member_data_export.requested` / `.generated` / `.downloaded`) carry NON-PII context only (`export_id`, `member_id`, masked mobile, byte size, status) — NEVER any exported field value.

**AC5 — Artifact lifecycle hygiene (TTL purge) + RTBF interaction.** Given exports hold encrypted PII with a 24h access window, when an export is consumed OR expires, then its `artifact_ciphertext` is **purged** (zeroed) by a pg-boss cron (mirror the Story 1.12 idempotency-vacuum), leaving the metadata row for audit; and the `data_exports` table FK-cascades on member delete so Story 3.12 RTBF anonymization/deletion removes stale artifacts. Export is permitted regardless of lifecycle state — including `withdrawn` (the epic explicitly allows "data export downloadable up to the withdrawal point") — there is NO withdrawable-style state guard; the content simply reflects the member's current (possibly anonymized) projection.

## Tasks / Subtasks

> **Execution-order constraint (mirror 3.10):** Tasks 1–2 (domain: table/migration + section-assembly core) before Task 3 (contracts) before Tasks 4–5 (job worker + API routes). Tasks 6–7 (api-client, mobile) depend on the routes + contracts existing. Do NOT start Task 7 mobile before Task 5 routes exist. Task 5 (API) is the **first `apps/api` → `@twt/queue` producer** — read Dev Notes §"First API-side enqueue" before wiring it.

- [x] **Task 1 — `data_exports` storage table (domain).** (AC1, AC3, AC4, AC5)
  - [x] New schema `packages/domain/src/schema/data_exports.ts` — one row per export request (PK `export_id uuid` defaultRandom, branded `DataExportId`; mirror `vyawastha_shulk_receipts.ts` receipt-id posture). Columns: `member_id uuid` FK → `members.member_id` `onDelete: 'cascade'` (RTBF, Story 3.12); `pariwar_id uuid` (RLS predicate, branded); `status text NOT NULL` (`'pending' | 'ready' | 'failed' | 'consumed' | 'expired'` — validate the set in the contract enum, not a DB check-constraint, matching the project's app-layer-enum posture); `requested_at timestamptz NOT NULL`; `ready_at timestamptz` NULLABLE; `expires_at timestamptz` NULLABLE (set to `ready_at + 24h` at generation); `consumed_at timestamptz` NULLABLE (one-time flag); `failed_reason text` NULLABLE (NON-PII code); `artifact_ciphertext` NULLABLE `piiColumn(1, 'data_export')` (Tier-1 envelope of the ZIP bytes — the ONLY at-rest home of the decrypted export); `artifact_bytes integer` NULLABLE (plaintext size, non-PII, for observability); `created_at`.
  - [x] Add `MEMBER_DATA_EXPORT_FIELD_CLASS = 'data_export'` to `apps/api/src/context.ts` (mirror `MEMBER_WITHDRAWAL_FIELD_CLASS`) **and** define a parallel constant with the same string value locally in `apps/jobs/src/data-export.ts` (or a new `apps/jobs/src/context.ts`) — **do NOT import from `apps/api/src/context.ts`** (cross-app dependency; forbidden by the `apps cannot depend on apps` rule). The two declarations are intentionally kept in sync by value.
  - [x] RLS policy `packages/domain/src/policies/data-exports-rls.ts` (mirror `member-withdrawals-rls.ts`: tenant-isolated, FORCE RLS); register in `policies/index.ts`. GRANT SELECT + INSERT + **UPDATE** (status transitions + artifact write by the job + TTL purge zeroing).
  - [x] Add index on `member_id` (status/active-export lookup) and on `pariwar_id` (RLS scan) — mirror the P4 index lesson from 3.10 (`0032`).
  - [x] Migration `0033_data-exports.sql` (hand-authored; latest applied is `0032_member-withdrawals.sql` — confirm before numbering; mirror `0032`'s GRANT + FORCE RLS + POLICY + index structure). Add the matching `migrations/meta/_journal.json` `when` entry (drizzle skips by journal `when`, not SQL hash — [[project_live_db_test_gotchas]]). Never regenerate an applied migration; never `DROP SCHEMA`.
  - [x] Add `DataExportId` brand to `packages/domain/src/ids/index.ts` alongside `VyawasthaShulkReceiptId` (line 252+, NOT near the common brands at lines 86–115 — `VyawasthaShulkReceiptId` has its own explanatory comment block; add `DataExportId` immediately after it with the same pattern).

- [x] **Task 2 — Export section-assembly core (domain, DB-read + decrypt).** (AC2, AC4)
  - [x] New `packages/domain/src/data-export/assemble.ts`: `assembleMemberExport(client, kms, { memberId, pariwarId, now })` → returns a `Record<string, unknown>` keyed by the seven filenames + `manifest.json`. This is the **pure gathering core** (mirror the "domain owns the DB/decrypt logic, the job is thin glue" split from `member/renewal-scheduler.ts` ↔ `apps/jobs/member-renewal-lifecycle.ts`). It reads through the passed in-scope `client` (the caller opens the scope-tx) and decrypts Tier-1 fields via `decryptTier1` (`packages/domain/src/encryption/envelope.ts:81`).
  - [x] Gather each section via EXISTING accessors where they exist; add thin read accessors where they do not:
    - `profile.json` ← `members` + `member_identities` + `member_kyc_profiles` (decrypt name/DOB) + `member_addresses` (latest) + `member_nominees` + `member_medical_disclosures` + `member_postings` + `member_attribution`. Reuse `member/read.ts` accessors; add a thin `member/profile-read.ts` aggregate only if one does not already compose these.
    - `consent_records.json` ← `consent.listConsents(client, ...)` (`packages/domain/src/consent/read.ts:90`).
    - `payment_receipts.json` ← new thin accessor over `vyawastha_shulk_receipts` (SELECT by `member_id`, in-scope).
    - `event_stream.json` ← new thin `member/read.ts` accessor `listMemberEvents(client, memberId)` over `events_log` (ordered by `occurred_at`; the canonical record). If a raw-event lister does not exist, add one — do NOT reconstruct from the reducer.
    - `audit_history.json` ← new thin accessor `listAuditEntriesForSubject(client, memberId)` over `audit_log_entries` (Story 1.10) — lines where this member is the actor/subject. Read the audit schema (`packages/domain/src/schema/audit_log_entries.ts`) to confirm the subject/actor column before writing the predicate.
    - `contribution_history.json` / `claim_history.json` ← the schema-stable EMPTY placeholder objects (AC2). Emit a single well-known constant so the shape is identical everywhere and trivially swappable when Epics 8/6 wire real reads.
    - `manifest.json` ← `{ exportId, memberId, pariwarId, generatedAt: now, schemaVersion: 1, files: [...] }`.
  - [x] Every accessor runs under the caller's RLS scope (tenant-isolated). Export `assembleMemberExport` from a new `data-export/index.ts` barrel and re-export from `packages/domain/src/index.ts`.

- [x] **Task 3 — Contracts (`packages/contracts/src/data-export/`).** (AC1, AC2, AC3)
  - [x] `DataExportStatus` = `z.enum(['pending','ready','failed','consumed','expired'])`.
  - [x] `DataExportRequestResponse` = `{ exportId: string, status: DataExportStatus }` (the `POST` response).
  - [x] `DataExportStatusResponse` = `{ exportId, status, requestedAt, readyAt?: string, expiresAt?: string, failedReason?: string }` (the poll `GET :id` response). NO `artifact*` fields ever cross the contract — the ZIP is streamed, never JSON-embedded.
  - [x] Section-shape schemas (`profile.json`, `payment_receipts.json`, `event_stream.json`, `consent_records.json`, `audit_history.json`, the two empty placeholders, `manifest.json`) — define the JSON shapes so the job's assembled output is contract-validated before zipping (catch drift). Plain primitives, no `@twt/domain` import (browser-bundle rule). NO `.openapi()` unless the routes are added to `openapi/v1.yaml` — match the withdrawal/life-events posture (keep `v1.yaml` byte-stable + determinism gate green; verify before authoring). Barrel-export from `contracts/src/index.ts`.

- [x] **Task 4 — Export-generation pg-boss job (`apps/jobs`).** (AC1, AC2, AC4, AC5)
  - [x] Add `QUEUE_NAMES.DATA_EXPORT_BUILD = 'member.data_export.build'` (+ a one-line JSDoc, Job class B per architecture §1.4 "Data export (FR-95): pg-boss job (Class B priority)") and `QUEUE_NAMES.DATA_EXPORT_VACUUM = 'member.data_export.vacuum'` to `packages/queue/src/index.ts` (the registry — never inline a queue-name string).
  - [x] New `apps/jobs/src/data-export.ts` (mirror `member-renewal-lifecycle.ts` thin-runtime shape): a `runDataExportBuild(deps: DataExportBuildDeps, job)` worker body — where `DataExportBuildDeps` carries `{ pool: pg.Pool; kms: encryption.KmsProvider; kekRef: encryption.KmsKeyRef; now?: () => Date; onAlarm?: (m: string) => void }` (mirror `RenewalLifecycleDeps` + add `kms`/`kekRef`; this story is the **first `apps/jobs` consumer of KMS**) — that (1) rehydrates ALS from the `JobEnvelope` (`{ requestId, pariwarId, actorId, traceId }` — ALS does NOT cross pg-boss; `@twt/queue` §context-propagation); (2) opens a scope-tx as `pariwarId`; (3) calls `assembleMemberExport(client, kms, {...})`; (4) contract-validates each section; (5) builds the ZIP with **`jszip`** (`zip.file(name, JSON.stringify(section, null, 2))` per file → `generateAsync({ type: 'nodebuffer' })` → a `Buffer`; see Dev Notes §"ZIP library" — add `jszip` to `apps/jobs/package.json`); (6) **envelope-encrypts**: call `encryptTier1(zipBuffer, { pariwarId, fieldClass: MEMBER_DATA_EXPORT_FIELD_CLASS }, deps.kms, deps.kekRef)` then **`encryption.serializeEnvelope(ct)`** → the `"enc:v1:…"` string stored in `artifact_ciphertext` (see Dev Notes §"Persistence + crypto pattern" — the `serializeEnvelope` step is mandatory; storing the raw `Tier1Ciphertext` object would write `[object Object]` to the text column); (7) in one scope-tx UPDATEs the row → `status='ready'`, `artifact_ciphertext=<enc-v1-string>`, `artifact_bytes=<plainLen>`, `ready_at=now`, `expires_at=now+24h` (leap-safe date math — reuse the 3.10 P1 `addMonths`/`setDate` clamp seam, or `+24h` is plain ms since it is hours not months); (8) emits the `member_data_export.generated` audit line AFTER the UPDATE succeeds. On any failure: UPDATE → `status='failed'`, `failed_reason=<non-PII code>`; do NOT leave a phantom `ready`.
  - [x] Register the build worker + the vacuum cron in `apps/jobs/src/boot.ts` (mirror the vacuum/cert-refresh/renewal registration block: `createQueue` → `work` → `schedule` for the cron; IST tz; env-overridable cadence). The vacuum worker zeroes `artifact_ciphertext` (and flips `status` → `expired` where `now >= expires_at` and not yet consumed) for rows past their window — the PII-hygiene sweep (AC5). Add a `data-export` KMS dependency to the jobs runtime — `apps/jobs` currently has **zero** encryption code; this story is the first. Mirror `buildEncryptionDeps()` from **`apps/api/src/deps.ts`** (NOT `context.ts` — `deps.ts` has the construction code; `context.ts` has only the interface + constants). Create a parallel `buildJobsEncryptionDeps(pepper: string)` in a new `apps/jobs/src/deps.ts` using the same env vars: `KMS_TEST_MODE` / `ADMIN_KEK_RESOURCE_NAME` / `ADMIN_HMAC_RESOURCE_NAME` / `GOOGLE_CLOUD_PROJECT` / `ADMIN_KMS_LOCATION`. Call it in `boot.ts` `main()` and thread `{ kms, kekRef }` into `DataExportBuildDeps`.
  - [x] The build worker is the FIRST cross-app job that mutates member-scoped tenant data from `apps/jobs` under a rehydrated pariwar scope — assert the scope-tx opens with `app.pariwar_id` set from the envelope (RLS must see the tenant), mirroring how `member-renewal-lifecycle.ts` opens per-candidate scope txs.

- [x] **Task 5 — API data-export routes (`apps/api/src/modules/data-export/` — new module).** (AC1, AC3, AC4)
  - [x] `POST /api/v1/member/data-export` — preHandler `[requireMemberSession]` (session only; request is lower-risk than download — step-up gates the download, AC3; see Dev Notes §"Where step-up gates"). Handler: resolve `memberCtx` (`request.requestContext.actorId` + `.pariwarId` — mirror `member-home/handlers.ts:28`); check for an existing active (`pending`/`ready`-unconsumed-unexpired) export → return it (idempotent, AC1); else INSERT a `pending` row and **enqueue** `DATA_EXPORT_BUILD` with a `JobEnvelope` (`pariwarId`, `actorId=memberId`, `requestId`/`traceId` from ALS; payload `{ exportId }`). Emit `member_data_export.requested` audit line. Return `DataExportRequestResponse`.
  - [x] `GET /api/v1/member/data-export/:id` — `[requireMemberSession]` (NO step-up). Returns `DataExportStatusResponse` for THIS member's export (404 if not theirs). Poll target for the mobile client.
  - [x] `GET /api/v1/member/data-export/:id/download` — `[requireMemberSession, requireMemberStepUp(deps, 'data_export')]`. Guards in order: row exists + belongs to this member (else 404) → `status === 'ready'` (else `409 data_export.not_ready`) → `consumed_at IS NULL` (else `410 data_export.consumed`) → `now < expires_at` (else `410 data_export.expired`). Then: in one scope-tx, set `consumed_at = now` (one-time — do this BEFORE streaming so a concurrent double-download loses the race; translate a lost race to `410 data_export.consumed`), call `encryption.parseEnvelope(row.artifact_ciphertext)` then `decryptTier1(parsed, { pariwarId, fieldClass: MEMBER_DATA_EXPORT_FIELD_CLASS }, deps.encryption.kms, deps.encryption.kekRef)` → plaintext `Buffer`, and stream with `reply.header('content-type','application/zip')` + `content-disposition: attachment; filename="twt-data-export-<id>.zip"`. Emit `member_data_export.downloaded` audit AFTER the stream is dispatched. **Watch the Fastify onSend double-send foot-gun** ([[project_fastify_onsend_doublesend]]) — set body-independent headers in a preHandler/onRequest, not an async onSend, and return the buffer from the handler.
  - [x] Register `registerDataExportModule` in `apps/api/src/server.ts`. Confirm `login-wall.spec.ts` stays green — the spec auto-discovers all routes via `getCollectedRoutes(t.app)` and asserts every non-allowlisted route carries a session guard; **no manual update to the spec is needed**, just ensure all three routes are registered in `server.ts` with `requireMemberSession`.
  - [x] Add `@twt/queue` to `apps/api/package.json` (this is the **first api-side producer** — see Dev Notes §"First API-side enqueue"; use a send-only client construction, do NOT start workers in the API). Add audit action types `member_data_export.requested` / `.generated` / `.downloaded` to `apps/api/src/audit/audit-sink.ts` (mirror `member_withdrawal.*`).

- [x] **Task 6 — api-client SDK.** (AC1, AC3) Add to `packages/api-client/src/index.ts` (`DATA_EXPORT_BASE` const; mirror the `withdrawMember`/`lifeEvents*` methods): `requestDataExport()` → `DataExportRequestResponse`; `getDataExportStatus(id)` → `DataExportStatusResponse`; `downloadDataExport(id)` → returns the raw `Blob`/`ArrayBuffer` (NOT JSON-parsed — the client must handle the binary ZIP stream; verify the client's fetch wrapper can return a non-JSON body, extend it if it hard-assumes JSON). The download's `auth.step_up_required` must be a distinguishable `error.code` (client keys on `error.code`, not bare 403 — 3.9/3.10 step-up lesson).

- [x] **Task 7 — Mobile export flow (`apps/mobile`).** (AC1, AC3)
  - [x] New screen: a "Download my data" surface. There is **no profile/settings screen yet** (recorded in [[deferred-work]] W4 by 3.10) — place an understated `DataExportEntry` near `WithdrawalEntry` at the bottom of the home tab (`app/(tabs)/index.tsx`; mirror `components/withdrawal/WithdrawalEntry.tsx`). The flow: tap → request export (`requestDataExport`) → poll `getDataExportStatus` (show a calm "preparing your data…" state; sub-second at this epic but design for the wait) → when `ready`, a "Download" CTA that drives step-up (`useStepUpGate('data_export')` → request/verify → retry `downloadDataExport`) then hands the ZIP to the OS (Expo `FileSystem` + `Sharing`/save — the binary is written to app storage then shared; do NOT hold PII in MMKV/draft — [[project_mmkv_asyncstorage_equivalent]], the 3.9 PII-in-draft lesson).
  - [x] Reuse the 3.10 step-up UI precedent (`components/withdrawal` / `useStepUpGate`, 403-by-`error.code`). Wrap scrollable content in `ScrollView` (3.5 clipping lesson). Calm register; the export is a right, framed neutrally — no urgency.
  - [x] Verify mobile via `typecheck` + `lint` (build/test are intentional repo no-ops — 3.8/3.9/3.10 Dev Agent Record).

- [x] **Task 8 — i18n keys (en + hi parity).** (AC1, AC3) Add `dataExport.*` to `packages/i18n/locales/{en,hi}/common.json`: entry-point label, request/preparing/ready/failed states, download CTA, step-up prompt (reuse `withdrawal`/`lifeEvents` step-up strings if aligned), expiry/consumed copy, and a short DPDPA-right explanatory line. Calm/neutral register — run the Story 2.2 tone check. Keep en/hi parity (the i18n parity gate must stay green).

- [x] **Task 9 — Tests.** (all ACs)
  - [x] Domain unit (`packages/domain/tests/data-export/assemble.test.ts`, DB-free where possible with a fake KMS + fixture client, else :5433): the seven files + manifest are all present; the two placeholder files carry the empty-shape marker; decrypted PII appears in `profile.json` (fixture ciphertext → plaintext via fake KMS); section shapes pass their contract schemas.
  - [x] Domain integration (`tests/integration/data-export/data-exports.spec.ts`, :5433): row persists; `artifact_ciphertext` is ciphertext at rest (never a readable ZIP magic-number/plaintext); cross-tenant RLS invisibility (positive + negative); FK cascade (RTBF) deletes the row; a withdrawn member's assemble still produces a valid ZIP (AC5 "downloadable up to withdrawal point").
  - [x] Jobs test (`apps/jobs/…data-export.test.ts` or the domain assemble test if the job stays a thin wrapper): the build worker produces a valid ZIP buffer, envelope-encrypts it, and flips the row to `ready` with `expires_at = ready_at + 24h`; a section-assembly throw flips to `failed` (no phantom `ready`); the vacuum zeroes `artifact_ciphertext` past the window.
  - [x] API integration (`apps/api/tests/integration/data-export/data-export.spec.ts`, :5433): `POST` creates `pending` + enqueues (assert the job was sent — spy the queue client) + is idempotent (second POST returns the same `exportId`); `GET :id` needs session only; `GET :id/download` requires `data_export` step-up (403 `auth.step_up_required` without elevation; passes WITH matching-context elevation; a `withdrawal`/`nominee_change` elevation does NOT satisfy it — the cross-context assertion, 3.9 P8); download streams `application/zip`, sets `consumed_at`, and a SECOND download → `410 data_export.consumed`; an expired export → `410 data_export.expired`; audit lines carry NO exported PII (assert masked context only).
  - [x] `pnpm ci:local` (DATABASE_URL on :5433) is the merge gate — GitHub Actions suspended ([[project_ci_actions_suspension_local_mirror]]). Run it green before marking review. Confirm any suspect live-DB flake by isolating the spec ([[project_known_livedb_test_failures]]); the `@twt/jobs` member-renewal concurrent-load flake is a known-innocent (do not attribute it to this story unless your changes touch renewal).

### Review Findings (Group B — Contracts + Queue; 2026-07-02)

> Scope: `packages/contracts/src/data-export/`, `packages/contracts/src/index.ts`, `packages/queue/src/index.ts`. Three-layer parallel review. 7 dismissed, 5 deferred, 0 decision-needed, 5 patch (all applied).

**Patch findings (all applied):**

- [x] [Review][Patch] **Missing named exports `ContributionHistorySection` / `ClaimHistorySection`** — AC2 requires section-shape schemas for all 7 files; the "one-line swap-in" promise for Epics 8/6 requires stable anchor names. Added named exports extending `EmptyExportSection` with `_wired_by: z.literal('Epic 8')` / `z.literal('Epic 6')` respectively, so a wrong-file substitution fails contract-validation. [`packages/contracts/src/data-export/data-export.ts`]

- [x] [Review][Patch] **`ManifestSection.schemaVersion: z.number()` — too permissive** — accepts 0, -1, 1.5. Changed to `z.literal(1)` so any future accidental schema-version drift fails at validation rather than producing a silently wrong manifest. [`packages/contracts/src/data-export/data-export.ts`]

- [x] [Review][Patch] **Semantically integer fields using `z.number()` instead of `z.number().int()`** — `eventVersion`, `conditionCount`, `nominees[].rank`, `lockInDaysAtJoin`, `AuditHistorySection.responseStatus` all tightened to `.int()` (responseStatus also bounded `.min(100).max(599)`; conditionCount to `.nonnegative()`; rank to `.positive()`). [`packages/contracts/src/data-export/data-export.ts`]

- [x] [Review][Patch] **`nominees[].splitPct` no range constraint on a legally sensitive field** — `z.number()` accepted 200%, negatives. Changed to `z.number().int().min(0).max(100)`. [`packages/contracts/src/data-export/data-export.ts`]

- [x] [Review][Patch] **`PaymentReceiptsSection.amountInr` accepts negatives** — receipt amounts are always positive. Changed `z.number()` to `z.number().int().positive()`. [`packages/contracts/src/data-export/data-export.ts`]

**Deferred (pre-existing or out-of-scope):**

- [x] [Review][Defer] Discriminated union on `DataExportStatusResponse` — design improvement; spec defines flat optional shape. [`packages/contracts/src/data-export/data-export.ts`] — deferred, pre-existing pattern
- [x] [Review][Defer] Bare `z.string()` for ID fields — UUID validation at domain layer (branded types); contracts validate shape. — deferred, pre-existing pattern
- [x] [Review][Defer] `kyc.dob` format validation — pre-existing KYC posture; DOB is calendar date not datetime. — deferred, pre-existing
- [x] [Review][Defer] Bare `z.string()` for enum-like fields (`consentType`, `actorRole`, `verificationStrength`) — pre-existing contracts posture. — deferred, pre-existing
- [x] [Review][Defer] `consumedAt` absent from `DataExportStatusResponse` — not a spec violation; client detects via `status='consumed'`. — deferred, intentional

### Review Findings (Group A — Domain Layer; 2026-07-02)

> Scope: `packages/domain/src/data-export/`, `packages/domain/src/schema/data_exports.ts`, `packages/domain/src/policies/data-exports-rls.ts`, `packages/domain/migrations/0033_data-exports.sql`, `packages/domain/src/ids/index.ts`. Three-layer parallel review (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 7 dismissed, 5 deferred, 2 decision-needed, 5 patch.

**Decision-needed (resolve before patching):**

- [x] [Review][Decision] **Audit history scope: actor-only vs actor+subject** — `audit_log_entries` has no `subject_id` column; `assemble.ts:317` filters `actorId = memberId` only. **Resolved 2026-07-02: accept actor-only as correct.** The AC2 "actor/subject" wording conflates the two — in self-service flows the member IS always the actor; admin actions on the member are not in scope for portability exports at this epic. AC2 text updated below to read "actor" only. No code change.

- [x] [Review][Decision] **Email missing from `profile.json` identity** — `member_identities` has no `email` column. **Resolved 2026-07-02: spec text was wrong.** Email was never part of the member data model (members authenticate by mobile only; no email is collected). Removed "email" from AC2 below. No code change.

**Patch findings:**

- [x] [Review][Patch] **`markExportConsumed` never sets `status = 'consumed'`** — fixed: added `status: 'consumed'` to `.set({})` in `markExportConsumed`. Also switched to `.returning({ exportId })` + `rows.length === 1` (P5 combined). [`packages/domain/src/data-export/store.ts`]

- [x] [Review][Patch] **`markExportFailed` can overwrite `ready` or `consumed` status** — fixed: added `eq(dataExports.status, 'pending')` to WHERE predicate so only `pending` rows can transition to `failed`. [`packages/domain/src/data-export/store.ts`]

- [x] [Review][Patch] **Consent records silently truncated at 200 with no signal** — fixed: replaced `listConsents(..., { limit: 200 })` with a direct `consentRecords` query (no cap). Story 1.14 pagination ceiling applies to API surfaces, not portability exports. [`packages/domain/src/data-export/assemble.ts`]

- [x] [Review][Patch] **Concurrent POST race can create duplicate `pending` rows** — fixed: added `CREATE UNIQUE INDEX data_exports_one_pending_per_member ON data_exports (member_id) WHERE status = 'pending'` to migration 0033 and applied to test DB manually. [`packages/domain/migrations/0033_data-exports.sql`]

- [x] [Review][Patch] **`markExportConsumed` rowCount cast is fragile** — fixed: combined with P1 above; `.returning({ exportId })` + `rows.length === 1` replaces the `as unknown as` cast. [`packages/domain/src/data-export/store.ts`]

**Deferred (pre-existing or out-of-scope):**

- [x] [Review][Defer] 8 sequential profile DB queries in `assembleMemberExport` — performance optimization; background job; KB-scale at Epic 3. [`packages/domain/src/data-export/assemble.ts:126-172`] — deferred, pre-existing optimization opportunity
- [x] [Review][Defer] `pariwar_id` has no FK constraint in schema or migration — pre-existing pattern across domain tables. [`packages/domain/src/schema/data_exports.ts:54`] — deferred, pre-existing
- [x] [Review][Defer] `getExportForMember` no explicit pariwarId filter — RLS provides tenant isolation; explicit filter would be defense-in-depth only. [`packages/domain/src/data-export/store.ts:64`] — deferred, pre-existing pattern
- [x] [Review][Defer] NULL `expiresAt` row would escape both vacuum branches — hypothetical future scenario; current code sets `expiresAt` atomically in the same UPDATE as `status='ready'`. [`packages/domain/src/data-export/store.ts`] — deferred, not triggered by current code
- [x] [Review][Defer] `orderBy(sql\`${dataExports.createdAt} DESC\`)` cosmetic inconsistency vs `orderBy(desc(...))` elsewhere. [`packages/domain/src/data-export/store.ts:40`] — deferred, cosmetic

## Dev Notes

### Design decisions (READ FIRST — user-confirmed 2026-07-02; these shaped the story)

Two architecture-reconciliation choices were confirmed before authoring (mirroring the 3.10 rejoin-lock precedent of embedding user-confirmed decisions):

1. **Delivery = API-served one-time token; GCS signed URL DEFERRED.** Architecture §2.12 (line 1741) commits *"download via short-lived signed URL"*, but **no member-facing object-storage infra exists**: `apps/api` has no `@google-cloud/storage`, no signed-URL code exists anywhere, and the only GCS usage (`apps/jobs/src/audit/gcs-mirror-target.ts`) is a **write-only** audit mirror (`roles/storage.objectCreator`, no read/`signUrl`, a locked bucket in a separate project). Moreover the epic AC requires the download be *"accessible only via authenticated session + step-up OTP"* — a bare signed URL is **not** session-gated once issued, so it structurally cannot satisfy that AC. **v1 stores the ZIP as a DB artifact (`data_exports.artifact_ciphertext`) and serves it through a session + step-up-gated, one-time, 24h-TTL API endpoint.** The GCS-signed-URL delivery is recorded as an architecture-faithful DEFERRAL in [[deferred-work]] (it becomes worthwhile once Epic 7/8 make exports large enough that streaming multi-MB ZIPs through the API tier is a concern; at Epic 3 the payload is KB-scale). Do NOT claim the §2.12 signed-URL control is satisfied.

2. **Content scope = all seven files, with schema-stable EMPTY placeholders for the two not-yet-sourced.** `contribution_history` (Epic 8 pools/contributions) and `claim_history` (Epic 6 claims) have **no source system at Epic 3**. The epic AC lists all seven files, so v1 emits all seven; the two unsourced files carry a documented empty shape (`{ records: [], _status, _wired_by }`) so the ZIP literally matches the AC and the swap-in for real reads (when Epics 8/6 land) is a one-line change. Record the two seams in [[deferred-work]]. This is honest completeness, not a lie of omission ([[feedback_closure_language_precision]]).

### Honesty obligations (non-negotiable — [[feedback_record_unattested_no_backfill]], [[feedback_closure_language_precision]])

- The architecture §2.12 **signed-URL delivery is DEFERRED**, not satisfied — recorded in [[deferred-work]]; v1 uses an in-DB encrypted artifact + gated API stream.
- `contribution_history` + `claim_history` are **schema-stable empty placeholders**, not real data — recorded as seams in [[deferred-work]] with the wiring epic named.
- The "several minutes for active members" wording in the epic is **aspirational at this epic** (the Epic-3 payload is sub-second); the async pg-boss pattern is committed now precisely so that growth is free. State this in Completion Notes — do not claim a load characteristic you did not measure.

### First API-side enqueue (Task 5 — read before wiring)

`apps/api` currently has **no** `@twt/queue` / `pg-boss` dependency — all queue producers so far are cron-registered inside `apps/jobs`. This story is the **first request-path producer**: the API must enqueue a `DATA_EXPORT_BUILD` job when a member requests an export. Add `@twt/queue` to `apps/api/package.json` and construct a **send-only** client (call `createQueueClient(...)` + `boss.start()` once at app boot, held on `AppDeps`; do NOT call `boss.work()` in the API — the API produces, `apps/jobs` consumes). The `@twt/queue` package is explicitly the shared seam between the apps (`apps/api` and `apps/jobs` both import it independently; apps cannot depend on apps). Wrap the enqueue so a queue outage does not 500 the request path harder than necessary — but note: if the enqueue fails, the `pending` row would be orphaned; either enqueue inside the same tx-ish flow with a compensating status, or accept the vacuum will eventually expire an orphaned `pending`. Prefer: INSERT `pending` → enqueue → on enqueue failure, UPDATE → `failed` and surface a retryable error.

### Persistence + crypto pattern (mirror 3.10 withdrawal-crypto)

The artifact is envelope-encrypted on the jobs side via a module-local helper (e.g. `encryptExportArtifact(buf, pariwarId, kms, kekRef)`) that calls `encryptTier1(buf, { pariwarId, fieldClass: MEMBER_DATA_EXPORT_FIELD_CLASS }, kms, kekRef)` then **`encryption.serializeEnvelope(ct)`** — the resulting `"enc:v1:…"` string is what is stored in `artifact_ciphertext`. At download, the API handler calls **`encryption.parseEnvelope(row.artifact_ciphertext)`** to recover the `Tier1Ciphertext` struct, then `decryptTier1(parsed, encCtx, deps.encryption.kms, deps.encryption.kekRef)` → plaintext `Buffer` to stream. **`serializeEnvelope`** (line 107) and **`parseEnvelope`** (line 119) are both exported from `encryption.*` in `@twt/domain` (`packages/domain/src/encryption/envelope.ts`); omitting `serializeEnvelope` before the DB write would store `[object Object]` in the text column. Scope the `encCtx` to `pariwarId` (NOT `memberId`), matching `withdrawal-crypto.ts` / `address-crypto.ts` exactly. `piiColumn(1, 'data_export')` on `artifact_ciphertext` for the Story 1.16b PII-shielding CI gate. The job DECRYPTS the member's Tier-1 profile fields (`decryptTier1`, `packages/domain/src/encryption/envelope.ts:81`) to place plaintext into `profile.json` — the member is the legitimate audience per the epic AC — then RE-encrypts the whole ZIP for at-rest storage. Net: PII is only ever plaintext in-memory during generation and during the gated stream; never at rest.

### Where step-up gates (AC3)

The epic ties step-up to **access**: *"accessible only via authenticated session + step-up OTP."* Gate the **download** with `requireMemberStepUp(deps, 'data_export')` (`apps/api/src/modules/auth/member/member-step-up.gate.ts:21`) — the true exfiltration point. Leave the **request** (`POST`) and **status poll** (`GET :id`) at session-only: generating the artifact into an encrypted-at-rest row is not the access event, and forcing step-up before a possibly-minutes-long job would force a second step-up at download anyway (the elevation is a ~5-min window). Use the DISTINCT context `'data_export'` (existing contexts: `withdrawal`, `nominee_change`, `medical_change`, `member.login`, `member.demo`) so no other elevation satisfies it. Mobile: detect the 403 by `error.code === 'auth.step_up_required'`, not bare HTTP 403 (`apps/api/src/http-errors.ts`); drive `POST /member/auth/step-up/request` → `/verify` → retry the SAME download (`useStepUpGate`, 3.9/3.10).

### One-time semantics + the double-download race (AC3)

Set `consumed_at` BEFORE streaming, inside the scope-tx, with a conditional UPDATE (`SET consumed_at = now WHERE export_id = $1 AND consumed_at IS NULL` and check `rowCount === 1`). A concurrent second request that finds `rowCount === 0` lost the race → `410 data_export.consumed`. This closes the "download twice by racing two requests" hole without a lock. (Contrast the withdrawal PK-collision `23505 → ConflictError` translation, 3.10 P2 — same defensive posture, different mechanism.)

### Artifact hygiene + RTBF (AC5)

The encrypted artifact holds the member's full PII set — it must not linger. The `data_export.vacuum` cron (mirror `idempotency.vacuum` in `boot.ts` + `QUEUE_NAMES.IDEMPOTENCY_VACUUM`) sets **`artifact_ciphertext = NULL`** for rows where `consumed_at IS NOT NULL OR now >= expires_at`, keeping the metadata row (audit trail: an export happened) but dropping the PII payload. "Zeroes" = `NULL` here (the column is NULLABLE text); do not set it to `''` or `0`. The FK `onDelete: 'cascade'` means Story 3.12 RTBF (which cascade-deletes member-scoped rows) also removes `data_exports` rows — verify in the integration test. Export is allowed for `withdrawn`/`anonymized` members (a data-portability right; the epic explicitly allows export "up to the withdrawal point") — there is NO `assertWithdrawable`-style guard; the content reflects the current projection.

### ZIP library

No zip lib is present in the repo. Add **`jszip`** to `apps/jobs/package.json` — it produces a `Buffer` directly (`generateAsync({ type: 'nodebuffer' })`), which is exactly what `encryptTier1` needs (a byte buffer to envelope-encrypt), with no native deps and clean ESM/Node-20 support. (`archiver` streams to a sink, which is a worse fit for the "buffer → encrypt" step and unnecessary at KB scale.) Confirm the latest `jszip` version at implementation time; pin it. Write each section with `JSON.stringify(section, null, 2)` for human-readability (the epic AC: "contents are human-readable").

### Existing source map (files to read before editing)

- `apps/jobs/src/member-renewal-lifecycle.ts` + `apps/jobs/src/boot.ts` — the FRESHEST job precedent: thin runtime, ALS-from-envelope rehydrate, `createQueue → work → schedule` registration, per-candidate scope-tx, IST cron. Model the export build worker + vacuum on this.
- `packages/queue/src/index.ts` — `QUEUE_NAMES` registry (ADD entries; never inline a name), `JobEnvelope` (ALS does NOT cross pg-boss), `createQueueClient`. Read the §context-propagation comment.
- `apps/api/src/modules/withdrawal/{handlers.ts,routes.ts,index.ts,withdrawal-crypto.ts}` — the freshest module precedent: scope-tx ordering, Tier-1 crypto helper (`encContext` shape), audit-after-ok, step-up gate, error-code translation (P2/P3), module registration. Model the data-export module on this.
- `apps/api/src/modules/member-home/handlers.ts:28` — `memberCtx(request)` reading `requestContext.actorId`/`.pariwarId`; `openScopeTx`/`closeScopeTx` usage (`../multi-tenant/scope-tx.js`).
- `packages/domain/src/encryption/envelope.ts:81` — `decryptTier1` (profile decrypt) + `encryptTier1` (artifact encrypt). `packages/domain/src/encryption/column.ts:70` — `piiColumn`.
- `packages/domain/src/consent/read.ts:90` — `listConsents`. `packages/domain/src/member/read.ts` — member read accessors (add `listMemberEvents` if absent). `packages/domain/src/schema/{vyawastha_shulk_receipts.ts,audit_log_entries.ts,events_log.ts,consent_records.ts}` — the source tables.
- `packages/domain/src/schema/member_withdrawals.ts` + `policies/member-withdrawals-rls.ts` + `migrations/0032_member-withdrawals.sql` — the table + RLS + migration template (GRANT UPDATE, FORCE RLS, index).
- `apps/api/src/audit/audit-sink.ts` — the `member_withdrawal.*` action-type pattern to extend.
- `apps/mobile/app/(tabs)/index.tsx` + `components/withdrawal/{WithdrawalEntry.tsx,format-date.ts}` + `useStepUpGate` — the home-entry + step-up UI precedent.

### Previous story intelligence (3.10 — Voluntary Withdrawal)

- **Step-up 403 by error CODE, not status** (`auth.step_up_required`), retry the SAME mutation — the load-bearing mobile lesson (3.9→3.10). The download's step-up retry must re-issue the binary download call.
- **Leap-safe date math** (3.10 P1): `expires_at = ready_at + 24h` is hours (plain ms is safe); only month/year additions need the `setDate(0)` clamp. Do NOT copy the month-clamp where it does not apply.
- **Index the RLS/scan columns** (3.10 P4): `member_id` + `pariwar_id` indexes on `data_exports`.
- **Contract openapi posture:** match withdrawal/nominee/medical/life-events (no `.openapi()`) unless you deliberately add the routes to `v1.yaml` — keep the determinism + pii-scrape gates green.
- **ci:local is the merge gate**; integration suites need DATABASE_URL on :5433. Own-committing writers accumulate rows — assert membership, not counts ([[project_live_db_test_gotchas]]).
- **No profile/settings screen exists** ([[deferred-work]] W4) — the export entry point goes on the home tab near `WithdrawalEntry`, understated.
- **onSend double-send** ([[project_fastify_onsend_doublesend]]) — the binary download reply must not use an async onSend for headers; set them in onRequest/preHandler.

### PII discipline (R1) — non-negotiable

- The exported PII is plaintext ONLY in-memory (generation) and in the gated stream (download); at rest the whole ZIP is Tier-1 envelope-encrypted (`artifact_ciphertext`).
- Audit context for `member_data_export.requested`/`.generated`/`.downloaded` carries `export_id`, `member_id`, masked mobile, byte size, status — NEVER any exported field value, NEVER the plaintext.
- The `DataExportStatusResponse` NEVER contains `artifact*` — the ZIP is streamed only, never JSON-embedded or base64'd into a response body.
- `failed_reason` is a bounded NON-PII code (e.g. `assemble_error`, `enqueue_failed`), never an exception message that could leak a field value.

### Testing standards

- Domain assemble core DB-free where possible (fake KMS + fixture rows); the rest on `twt-test-pg` Docker :5433.
- Clock injection everywhere (`deps.clock()` / `now` param) — no raw `Date.now()` (architecture §1.12; 3.8/3.10 precedent). Unit-test `expires_at = ready_at + 24h` with an injected clock.
- API integration under `apps/api/tests/integration/data-export/`. Assert: enqueue happens (spy the send-only queue client), idempotent second request, step-up enforced + context-isolated on download, one-time consume + race, expiry, PII never in audit/response/at-rest-plaintext.
- Jobs: the build worker is testable in isolation (drive it with a controlled `now`, a fixture client, a fake KMS, capture the row transition) — mirror `runMemberRenewalLifecycleTick` isolation.

### Project Structure Notes

- New API module: `apps/api/src/modules/data-export/` (`index.ts`, `routes.ts`, `handlers.ts`, `data-export-crypto.ts` if the API also touches the artifact — but decryption at download uses the same helper; keep one crypto helper).
- New contracts dir: `packages/contracts/src/data-export/`.
- New domain: `packages/domain/src/schema/data_exports.ts` + RLS policy + `packages/domain/src/data-export/assemble.ts` (+ thin read accessors in `member/read.ts` / a `payment-read.ts` / an `audit` read as needed).
- New migration: `0033_data-exports.sql` (latest applied is `0032` — confirm before numbering).
- New job: `apps/jobs/src/data-export.ts` + registration in `boot.ts`; `QUEUE_NAMES` additions in `packages/queue/src/index.ts`.
- New mobile: `DataExportEntry` + the export flow screen (home-tab entry; no settings screen yet).
- Extends (not new): `apps/api/package.json` (+`@twt/queue` — first api producer), `apps/jobs/package.json` (+`jszip`), `audit-sink.ts`, `apps/api/src/context.ts` (field class constant), `api-client/src/index.ts` (+ binary-body support), `ids/index.ts` (`DataExportId` at line 252+), i18n locales, `server.ts`, `boot.ts`.
- New (jobs infra): `apps/jobs/src/deps.ts` (`buildJobsEncryptionDeps` — mirrors `apps/api/src/deps.ts:buildEncryptionDeps`; first KMS wiring in `apps/jobs`). Local `MEMBER_DATA_EXPORT_FIELD_CLASS` constant in `apps/jobs/src/data-export.ts` (not imported from `apps/api`).
- No conflicts with the unified structure — follows the per-surface module + per-table schema + `@twt/queue` producer/consumer seam + Expo-router conventions established in Epics 1/3.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.11 (lines 1822-1838)] — the seven files, async pg-boss generation, one-time 24h session+step-up-gated URL, human-readable decrypted JSON, audit the export action.
- [Source: _bmad-output/planning-artifacts/epics.md#FR-95 (line 1577) + Epic 3 outcome (lines 1575, 1587)] — DPDPA data-portability right; "data export downloadable up to the withdrawal point".
- [Source: _bmad-output/planning-artifacts/architecture.md#2.12 (line 1739-1741)] — "Data export (FR-95): pg-boss job (Class B priority); generates ZIP … download via short-lived signed URL" (the delivery mechanism reconciled — signed URL DEFERRED).
- [Source: _bmad-output/planning-artifacts/architecture.md#2.7 (Tier-1 encrypt-at-rest) + §1.5 envelope encryption] — why the artifact is envelope-encrypted at rest.
- [Source: _bmad-output/planning-artifacts/architecture.md#context-propagation (lines 3895-3899)] — ALS does not cross pg-boss; job payloads carry the envelope; workers rehydrate.
- [Source: apps/jobs/src/{boot.ts,member-renewal-lifecycle.ts}] — the pg-boss worker/cron registration + thin-runtime job precedent.
- [Source: packages/queue/src/index.ts] — `QUEUE_NAMES`, `JobEnvelope`, `createQueueClient` (the shared api↔jobs seam).
- [Source: apps/api/src/modules/withdrawal/*] — the freshest module + Tier-1 crypto + step-up + audit-after-ok precedent.
- [Source: apps/api/src/modules/auth/member/member-step-up.gate.ts:21] — `requireMemberStepUp(deps, actionContext)`.
- [Source: packages/domain/src/encryption/envelope.ts:48,81,107,119] — `encryptTier1` (line 48) / `decryptTier1` (line 81) / `serializeEnvelope` (line 107 — converts `Tier1Ciphertext` → `"enc:v1:…"` string for DB storage) / `parseEnvelope` (line 119 — inverse; call before `decryptTier1` at download).
- [Source: packages/domain/src/consent/read.ts:90] — `listConsents`.
- [Source: packages/domain/src/schema/{vyawastha_shulk_receipts.ts,events_log.ts,audit_log_entries.ts,consent_records.ts}] — the export source tables.
- [Source: _bmad-output/implementation-artifacts/3-10-voluntary-withdrawal-flow-with-110-forfeit-12-month-rejoin-lock.md#Dev Notes] — scope-tx ordering, Tier-1 crypto helper, step-up mobile wiring, migration/RLS template, index/date-math/onSend lessons, no-settings-screen entry-point.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-create-story workflow)

### Debug Log References

- `pnpm ci:local` (DATABASE_URL on :5433) — **18/18 jobs green** (lint, typecheck, build, unit tests, db-check, contracts-determinism, crypto-check, tokens-theme, i18n-parity, pii-scrape, friction-budget, schema-diff, benefit-mechanism, microcopy, domain-invariants, member-state-invariant, kyc-provider-boundary, integration-tests). Two pre-existing lint hits (unused `ids` import in the two new specs) fixed before the final green run.
- New live-DB (:5433) suites, all green: domain `tests/integration/data-export/data-export.spec.ts` (5), jobs `tests/data-export.test.ts` (3), api `tests/integration/data-export/data-export.spec.ts` (5). `login-wall.spec.ts` stays green (all 3 routes auto-discovered as session-guarded — no manual spec edit).
- Migration `0033_data-exports.sql` applied to the test DB via `pnpm --filter @twt/domain db:migrate` (journal `when` = 1783568400000, immediately after 0032).

### Completion Notes List

- **Design decisions honored (user-confirmed 2026-07-02).** (1) Delivery = API-served one-time token; the architecture §2.12 GCS **signed-URL delivery is DEFERRED, not satisfied** (recorded in deferred-work.md DX-1) — no member-facing object-storage/read-SA infra exists and a bare signed URL cannot be session+step-up gated. (2) All seven ZIP files are emitted; `contribution_history.json` (Epic 8) + `claim_history.json` (Epic 6) are **schema-stable EMPTY placeholders** (`{ records: [], _status, _wired_by }`) — recorded as seams DX-2/DX-3.
- **Honesty (per [[feedback_record_unattested_no_backfill]] / [[feedback_closure_language_precision]]).** The "several minutes for active members" generation time is **aspirational, not measured** — the Epic-3 payload is sub-second (KB-scale); the async pg-boss pattern is committed now so growth is free (recorded DX-4). Do not claim the §2.12 signed-URL control or a measured load characteristic.
- **Crypto round-trip.** The artifact is envelope-encrypted by the apps/jobs build worker and decrypted by the apps/api download handler. `apps/jobs/src/deps.ts:buildJobsEncryptionDeps` is a deliberate BY-VALUE parallel of `apps/api/src/deps.ts:buildEncryptionDeps` (apps cannot import apps) — same `KMS_TEST_MODE` convention, same env vars, same fake-key derivation label (`twt-admin-kek`) + kekRef resourceName, so the round-trip works. `serializeEnvelope`/`parseEnvelope` bracket the DB text column (storing the raw struct would write `[object Object]`).
- **Field-class duplication.** `MEMBER_DATA_EXPORT_FIELD_CLASS = 'data_export'` is declared in `apps/api/src/context.ts` and duplicated by value in `apps/jobs/src/data-export.ts` (both match the `piiColumn(1, 'data_export')` schema annotation). The member MOBILE decrypt in `assembleMemberExport` keys on the fixed `MEMBER_IDENTITY_NAMESPACE` sentinel (login runs pre-scope), NOT the real pariwarId — the one field-class that does not use the tenant scope.
- **First api-side producer.** `apps/api` gains a send-only `@twt/queue` client (`deps.dataExportQueue`, an injectable seam like `auditSink`; a `CapturingDataExportQueue` fake in tests). The API PRODUCES `DATA_EXPORT_BUILD`; it never `boss.work()`s. Enqueue happens AFTER the scope-tx commit (so the worker sees the committed `pending` row); an enqueue failure compensates (`markExportFailed`) and returns a retryable 503 (DX-7).
- **One-time race + TTL hygiene.** `markExportConsumed` is a conditional `UPDATE … WHERE consumed_at IS NULL` (a lost race → `410 data_export.consumed`); the download decrypts INSIDE the scope (a decrypt failure rolls back — no phantom consume). The `member.data_export.vacuum` cron (mirror `idempotency.vacuum`) NULLs `artifact_ciphertext` for consumed/expired rows + flips past-window rows → `expired` (AC5). FK `onDelete: 'cascade'` ties artifacts to RTBF (Story 3.12) — verified by the domain cascade test.
- **Mobile OS handoff.** `expo-file-system@^57` (`File`/`Paths` API) + `expo-sharing@^57` were added; `lib/save-export.ts` writes the downloaded ArrayBuffer to the cache dir + opens the share sheet — the plaintext never lands in MMKV/a draft ([[project_mmkv_asyncstorage_equivalent]] / the 3.9 PII-in-draft lesson). Mobile verified via `typecheck` + `lint` (build/test are intentional repo no-ops).
- **Deferred-work recorded:** DX-1 (signed-URL), DX-2/DX-3 (empty placeholders), DX-4 (aspirational load), DX-5 (no settings screen), DX-6 (no rate-limit), DX-7 (enqueue retry) in `deferred-work.md`.

### File List

**New — domain (`packages/domain`)**
- `src/schema/data_exports.ts` — the `data_exports` table (Tier-1 `artifact_ciphertext`, status/timestamps, indexes).
- `src/policies/data-exports-rls.ts` — tenant-isolation RLS (SELECT + FOR ALL write).
- `src/data-export/assemble.ts` — `assembleMemberExport` core (+ `listMemberEvents`, `emptySection`, filenames/version consts).
- `src/data-export/store.ts` — `findActiveExport` / `insertDataExport` / `getExportForMember` / `markExportConsumed` / `markExportFailed`.
- `src/data-export/index.ts` — barrel.
- `migrations/0033_data-exports.sql` — hand-authored migration.

**New — contracts / jobs / api / mobile**
- `packages/contracts/src/data-export/{data-export.ts,index.ts}` — request/status DTOs + the seven ZIP section-shape schemas + manifest.
- `apps/jobs/src/data-export.ts` — `runDataExportBuild` + `runDataExportVacuum` + `registerDataExportWorkers`.
- `apps/jobs/src/deps.ts` — `buildJobsEncryptionDeps` (first apps/jobs KMS wiring).
- `apps/api/src/modules/data-export/{handlers.ts,routes.ts,index.ts,queue.ts,data-export-crypto.ts}` — the request/status/download surface + send-only producer + artifact decrypt helper.
- `apps/mobile/lib/save-export.ts`, `apps/mobile/components/data-export/DataExportEntry.tsx`, `apps/mobile/app/(data-export)/{_layout.tsx,index.tsx}`.

**New — tests**
- `packages/domain/tests/integration/data-export/data-export.spec.ts` (5), `apps/jobs/tests/data-export.test.ts` (3), `apps/api/tests/integration/data-export/data-export.spec.ts` (5).

**Modified**
- `packages/domain/src/ids/index.ts` (`DataExportId` brand), `src/schema/index.ts`, `src/policies/index.ts`, `src/index.ts` (`dataExport` namespace), `migrations/meta/_journal.json` (0033 entry).
- `packages/contracts/src/index.ts` (barrel).
- `packages/queue/src/index.ts` (`DATA_EXPORT_BUILD` + `DATA_EXPORT_VACUUM` queue names).
- `packages/api-client/src/index.ts` (`requestDataExport` / `getDataExportStatus` / `downloadDataExport` + the `callBinary` helper).
- `apps/api/src/context.ts` (`MEMBER_DATA_EXPORT_FIELD_CLASS` + `DataExportEnqueuer` seam + AppDeps field), `src/deps.ts` (construct enqueuer), `src/index.ts` (close enqueuer), `src/server.ts` (register module), `src/http-errors.ts` (`GoneError` 410), `src/audit/audit-sink.ts` (`member_data_export.*` types), `package.json` (+`@twt/queue`).
- `apps/api/tests/integration/_setup.ts` (`CapturingDataExportQueue` fake).
- `apps/jobs/src/boot.ts` (register data-export workers + resolve pepper/KMS), `apps/jobs/package.json` (+`jszip`).
- `apps/mobile/app/_layout.tsx` (register `(data-export)` group), `app/(tabs)/index.tsx` (`DataExportEntry`), `package.json` (+`expo-file-system`/`expo-sharing`).
- `packages/i18n/locales/{en,hi}/common.json` (`dataExport.*`, en/hi parity).
- `_bmad-output/implementation-artifacts/{sprint-status.yaml,deferred-work.md}`.

## Change Log

| Date       | Change                                                                 |
| ---------- | --------------------------------------------------------------------- |
| 2026-07-02 | Created Story 3.11 — context-engineered DPDPA data-export ZIP. Async pg-boss `member.data_export.build` job (FIRST `apps/api`→`@twt/queue` producer) assembles a seven-file ZIP (profile+nominees+medical+postings, consent_records, payment_receipts=vyawastha, event_stream, audit_history — all real; contribution_history + claim_history = schema-stable EMPTY placeholders seamed for Epics 8/6) via a domain `assembleMemberExport` core that decrypts Tier-1 PII (member is the legitimate audience). ZIP stored envelope-encrypted at rest in a NEW `data_exports` table (migration 0033); served through a one-time, 24h-TTL, session+step-up-gated (`'data_export'` context) API download stream + a session-only status poll. `data_export.vacuum` cron zeroes expired/consumed artifacts (PII hygiene); FK cascade ties artifacts to RTBF (3.12). Design decisions (user-confirmed 2026-07-02): (1) API-served one-time token now, GCS signed-URL delivery (arch §2.12) DEFERRED — no member-facing object-storage/read-SA infra exists + a bare signed URL cannot be session+step-up gated; (2) all seven files emitted with schema-stable empty placeholders for the two not-yet-sourced. Both recorded in deferred-work.md. New: domain table+RLS+assemble core, contracts, jobs build+vacuum worker, api data-export module, api-client (+binary body), mobile home-entry export flow, i18n en/hi. Status → ready-for-dev. |
| 2026-07-02 | **Code review Group C (Jobs) — 5 patches applied.** (1) `SECTION_SCHEMAS` contribution/claim entries changed from base `EmptyExportSection` to `contracts.ContributionHistorySection` / `contracts.ClaimHistorySection` — Group B named types now enforcing `_wired_by` literal locks. (2) Success UPDATE → `ready` now guards `AND status='pending'` — prevents job retry from overwriting a consumed row. (3) Failure-path UPDATE replaced with `dataExport.markExportFailed` (inherits Group A `AND status='pending'` + `AND member_id` guards) when `memberId` captured before error; falls back to exportId+status guard only when error precedes row select. (4) Audit hash `member_id` changed from `actorId` to `resolvedMemberId ?? actorId` (DB-authoritative owner). (5) `runDataExportVacuum` converted from raw cross-tenant pool queries (would touch 0 rows under FORCE ROW LEVEL SECURITY) to per-pariwar `withPariwarScope` iteration using `pariwar_passport` (SELECT USING true) — both vacuum UPDATEs now atomic per tenant. Decision N1 (user): jobs connect as `twt_app` (RLS-enforced). Decision N2 (user): `KMS_TEST_MODE` default-fake unchanged; fail-close hardening deferred to joint API+jobs infra PR. 6 items added to deferred-work.md (CR-C-W1, W3–W7; W2 closed by vacuum patch). |
| 2026-07-02 | Implemented Story 3.11 (all 9 tasks). Domain: `data_exports` table + RLS + `0033` migration + `DataExportId` brand + `assembleMemberExport` core (decrypts KYC/nominee/medical/address/mobile Tier-1, mobile keyed on the fixed identity namespace) + store accessors. Contracts: request/status DTOs + seven section-shape schemas (job contract-validates each before zipping). Jobs: `runDataExportBuild` (assemble→validate→jszip→`encryptTier1`+`serializeEnvelope`→row `ready`, `expires_at=ready_at+24h`; failure→`failed`, no phantom `ready`) + `runDataExportVacuum` + `buildJobsEncryptionDeps` (first apps/jobs KMS; BY-VALUE parallel of api's, identical fake KEK). API: `data-export` module (POST session-only+idempotent+enqueue; GET :id session-only; GET :id/download `data_export` step-up, one-time conditional-consume race→410, expired→410, streams `application/zip` via handler-set headers — no onSend foot-gun) + send-only `@twt/queue` producer seam + `GoneError` 410 + `member_data_export.*` audit types. api-client: 3 methods + binary `callBinary`. Mobile: home-tab `DataExportEntry` + `(data-export)` request→poll→step-up→download flow + `saveAndShareExport` (expo-file-system/sharing; no MMKV). i18n: `dataExport.*` en/hi parity. Tests: 13 new live-DB (:5433) — domain(5)/jobs(3)/api(5). **`pnpm ci:local` 18/18 green.** Status → review. |
| 2026-07-02 | **Code review Group D (API module) — 5 patches applied.** (1) Download handler guard reordered: `consumedAt !== null \|\| status === 'consumed'` → 410 now evaluated BEFORE `status !== 'ready'` → 409, matching the spec-required status code for an already-consumed row (after `markExportConsumed` sets both fields atomically). (2) Request handler compensation block wrapped in `try/catch(compErr)` so `ServiceUnavailableError` is ALWAYS thrown — previously a correlated enqueue+DB failure let the raw DB error escape instead. (3) `runDataExportBuild` (jobs — retroactive) gained `skipBuild` sentinel: after reading the DB row, `status !== 'pending'` bails early (returns cleanly from the scope-tx) and the audit write is skipped — prevents false `member_data_export.generated` events on pg-boss retries against terminal-state rows. (4) POST request handler now catches `23505` unique-constraint violation (TOCTOU concurrent insert) and opens a fresh scope-tx to read the winner's row, returning idempotently instead of surfacing a 500. (5) `contracts/data-export.ts`: `failedReason` changed from `z.string().optional()` to `z.enum(['enqueue_failed', 'assemble_error']).optional()` — bounded NON-PII codes as required by AC4; status handler cast added (`row.failedReason as DataExportStatusResponse['failedReason']`). TypeScript clean post-patch (both `@twt/api` + `@twt/jobs`). 5 items added to deferred-work.md (CR-D-W1–W5). |
| 2026-07-02 | **Code review Group E (API client + Mobile + i18n) — 4 patches applied.** (1) Polling loop `consumed` branch: `startPolling` now stops and transitions to `failed` when `getDataExportStatus` returns `consumed` (e.g., concurrent two-device session) — previously infinite poll. `setError(t('dataExport.consumed'))` provides the specific copy. (2) Success state: after `saveAndShareExport` resolves, phase now transitions to `'saved'` (using the previously-dead `dataExport.saved` i18n key) showing a success paragraph + a low-prominence "prepare a fresh copy" button. Previously the screen stayed on `'ready'` with the Download button re-enabled — the first re-tap would 410-consumed with no escape path. (3) `onDownload` consumed/expired error guard: on `data_export.consumed` / `data_export.expired` from the download, phase now transitions to `'failed'` rather than staying on `'ready'`. (4) `onVerifyOtp` consumed/expired guard: on these codes after verify succeeded, phase transitions to `'failed'` instead of calling `stepUp.reset()` (which would have re-shown the Download button in a broken state). For other post-verify errors (save failure), `stepUp.reset()` is still called (elevation live, Download button restored). `'failed'` phase paragraph now suppressed when `error` is set (prevents generic + specific copy stacking). TypeScript clean post-patch. 3 items added to deferred-work.md (CR-E-W1–W3). |
| 2026-07-02 | **Code review Group F (Tests) — 4 patches applied.** (1) Download handler: added explicit `status === 'expired'` guard BETWEEN the consumed guard and the `status !== 'ready'` guard — after the vacuum cron flips a row to `status='expired'` and nulls `artifact_ciphertext`, the `not_ready` guard (409) was firing instead of the `expired` guard (410), giving the wrong HTTP semantics. (2) API integration test: added a new "vacuum-expired export → 410" case seeding `status='expired'` with no artifact_ciphertext to cover the post-vacuum path. (3) Domain spec: `claim_history.json` assertion changed from `toMatchObject` (partial — omitted `_status`) to `toEqual` (strict) to match the symmetrical `contribution_history.json` assertion and catch any `emptySection` shape drift. (4) Jobs vacuum test: replaced `new Date(Date.now() - 3_600_000)` / `runDataExportVacuum({ pool })` with a deterministic fixed-clock pair (`vacuumNow = new Date('2026-07-02T12:00:00Z')`, `past = new Date(vacuumNow - 1h)`, `now: () => vacuumNow`) — eliminates real-wall-clock dependency. All typechecks clean. Deferred: enqueue-failure compensation untested, cross-member API access test, envelope pariwarId/actorId assertion, vacuum pariwar_passport seeding for fresh-DB determinism. Status → done. |
