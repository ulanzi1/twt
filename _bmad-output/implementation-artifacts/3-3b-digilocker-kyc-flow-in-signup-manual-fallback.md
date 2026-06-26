# Story 3.3b: DigiLocker KYC Flow in Signup + Manual Fallback `[SURFACE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Sushil-class teacher signing up,
I want to complete KYC via DigiLocker (automatic Aadhaar profile pull) OR fall back to manual entry creating a later-trustee-verifiable record,
so that I can complete signup even if DigiLocker is unavailable or I prefer manual entry.

This is the **KYC SURFACE** for Epic 3 — the first surface that actually *drives* the Story 3.1 member lifecycle (emits `member.kyc_completed` / `member.kyc_manual_fallback` and calls the projector) and the first consumer of the Story 3.3a `KycProvider` seam. It builds: the signup KYC-step API (`initiate` → DigiLocker `callback` → `confirm`, plus `manual` fallback + `status`), the **member KYC profile persistence** (a net-new encrypted PII table — the first member-PII table after 3.2's `member_identities`), the **daily cert-refresh cron** in `apps/jobs` + the within-budget staleness alarm, the **HTTP route registration** in `server.ts` (3.3a deliberately shipped no surface), and the **mobile KYC screens** (DigiLocker / manual / failure-empathy / hard-mandatory copy block) with the P0-2c accessibility gate.

**It REUSES the entire Story 3.3a provider seam unchanged** — the `KycProvider` port, `getActiveKycProvider(ctx)` registry, the DigiLocker provider (OAuth+PKCE, XMLDSig verify, mapper, error normalization), the `kyc_transactions` substrate, and `refreshDigiLockerCerts()`. It does NOT touch the DigiLocker transport (the `kyc-provider-boundary` CI gate forbids it) and does NOT re-author the `member.*` event vocabulary (Story 3.1 froze it). It does NOT create the member row or assemble the full signup wizard (**Story 3.6** owns member creation from `signup_continuation` + wizard assembly — see Dev Notes §"Who creates the member"). It does NOT build the FR-58C feature-flag infrastructure (not built; wire the documented hard-mandatory seam with a safe default).

## Acceptance Criteria

> Lifted from epics.md §Story 3.3b (lines 1665–1681). FR/AR provenance: PRD FR-2 (DigiLocker KYC + manual fallback + future hard-mandatory flag), NFR-27 (8s p95 / 12s manual CTA), AR-43 (provider interface — freeze row 13), AR-24 (DigiLocker re-link is step-up-gated — **relink is out of scope**, see R5). Canonical mechanism: architecture §2.8 + §3.8 (signature/staleness/key-compromise) + Story 3.3a's shipped seam. **Reconciliations R1–R6 (Dev Notes) resolve every spec tension — read them before coding.**

**AC1 — Signup KYC step: DigiLocker pull OR manual fallback.**
**Given** FR-2 + Story 3.3a's `KycProvider` interface (already on `main`)
**When** the signup KYC step is implemented
**Then** the member chooses either: **(a) DigiLocker pull** → consent flow → `verifyAndPullProfile` returns a `KycProfile` → member **confirms** the shown profile → KYC complete (**emits `member.kyc_completed`**; lifecycle `pending-kyc → pending-fee`); or **(b) Manual fallback** → member enters Aadhaar photo + name + DoB → submits → a self-declared KYC record is stored awaiting trustee verification (**emits `member.kyc_manual_fallback`**; lifecycle `pending-kyc → pending-fee` — the epic's "`pending-valid`" is reconciled in **R1**: manual KYC reaches `pending-valid` later at lock-in expiry, not now).

**AC2 — DigiLocker failure auto-offers manual fallback with empathy copy.**
**Given** a DigiLocker failure (`provider_unavailable`, `user_consent_denied`, `verification_failed`, `signature_invalid`, `certificate_stale`, `transaction_expired`)
**When** the member hits the failure during the DigiLocker path
**Then** the UI **automatically offers the manual fallback** with Pattern-4 dignified empathy copy ("DigiLocker is unavailable — you can enter your details manually and we'll verify them"), in Hindi-default + English; the failure never dead-ends and the member's progress is preserved.

**AC3 — Future hard-mandatory DigiLocker flip is FR-58C-gated.**
**Given** the future hard-mandatory switch (FR-2 + FR-58C)
**When** the flag is flipped (a future event)
**Then** the manual fallback is **hidden** and a copy block explains why DigiLocker is required. The FR-58C flag *infrastructure* is not built — wire a **documented seam** with a safe default (manual ALWAYS available today), mirroring the 3.3a provider-registry seam. No invented flag store.

**AC4 — Inherited accessibility gate (Story 0.10 P0-2c).**
**Given** the inherited accessibility gate from Story 0.10 P0-2c field work
**When** a VI/low-vision member uses the KYC flow with assistive tech
**Then** the **entire flow is screen-reader-accessible** (TalkBack/VoiceOver, Devanagari output); manual-fallback fields have proper ARIA / `accessibilityLabel` + per-field guidance; validation messages are programmatically associated (Pattern 4); touch targets meet UX-DR65 (44pt default, 56pt critical). NFR-20 WCAG 2.1 AA is a launch-blocker for member-app primary flows.

**AC5 — Cross-cutting deliverables this surface owns (from the 3.3a scope handoff).**
1. **Member KYC profile persistence** — a net-new `member_kyc_profiles` table storing the verified/declared profile (name, DoB, photo Tier-1 encrypted; masked-Aadhaar Tier-3; `verification_strength`; `source`; verified flag) so DigiLocker results persist and manual entries are trustee-verifiable later.
2. **Daily cert-refresh cron** registered in `apps/jobs` invoking `refreshDigiLockerCerts()`, + the **within-budget staleness alarm** wired (ADR-0026 Category-5 ops obligation). The daily refresh **bumps `fetched_at` on success** so the staleness budget means something.
3. **HTTP route registration** — `registerKycModule(app, deps)` wired into `server.ts` (3.3a shipped importable units only).

## Tasks / Subtasks

> **DRY-first:** the 3.3a seam is COMPLETE — read it before writing. The provider (`createDigiLockerProvider`), registry (`getActiveKycProvider`), `kyc_transactions` accessors (`@twt/domain` `kyc.*`), `refreshDigiLockerCerts()`, and the `KycProvider`/`KycProfile`/`KycError` contracts are all on `main`. Your job is to CONSUME them through a surface — do not reimplement any of it. Mirror the 3.2 SURFACE patterns (route module layout, scoped-tx writes, audit emission, OpenAPI registration, mobile screen + SDK).

- [x] **Task 1 — `member_kyc_profiles` table + RLS + accessors + migration 0024** (AC: #1, #5.1)
  - [x] `packages/domain/src/schema/member_kyc_profiles.ts` — **tenant-isolated** (mirror `member_identities.ts`, NOT the global identity-auth carve-out: a KYC profile belongs to one member in one Pariwar). Columns: `member_id` (PK, FK → `members.member_id` `onDelete: 'cascade'`), `pariwar_id` (RLS predicate), `name_ciphertext` (Tier-1 envelope), `dob_ciphertext` (Tier-1 envelope), `photo_ciphertext` (Tier-1 envelope — the base64 `data:image/jpeg;base64,…` the mapper returns; nullable when absent), `aadhaar_masked_id` (Tier-3 plaintext — already masked to last 4 at the provider boundary), `verification_strength` pgEnum (`aadhaar_kyc` | `self_declared` | `unverified`), `source` pgEnum (`digilocker` | `manual`), `trustee_verified` boolean default false (manual records await trustee verification — Epic 4/trustee surface flips it later), `kyc_transaction_id` uuid nullable (the DigiLocker `kyc_transactions` row this profile came from; null for manual), `created_at`, `updated_at`. **Mark every PII column with `piiColumn()`** tier annotations (the Story 1.16b PII-shielding gate reads them — Tier-1 for name/dob/photo, Tier-3 for masked-Aadhaar).
  - [x] RLS policy `packages/domain/src/policies/member-kyc-profiles-rls.ts` (tenant-isolated `USING`/`withCheck` on `app.pariwar_id`; ENABLE + FORCE) + register in the policies barrel. Mirror `members-rls` / `member-identities` RLS exactly.
  - [x] Accessors `packages/domain/src/kyc/profile-read.ts` + `profile-write.ts` (extend the existing `kyc/` namespace from 3.3a — add to `kyc/index.ts`): `upsertMemberKycProfile(db, input)` (the confirm/manual write; one profile per member — upsert on `member_id`) + `getMemberKycProfile(db, pariwarId, memberId)`. **NO HTTP / audit / event emission in the accessor** (the route orchestrates those — the consent/3.3a accessor discipline). Tenant-scoped: runs on the caller's scoped `db`.
  - [x] **Encryption:** Tier-1 fields use `encryption.encryptTier1(Buffer.from(value,'utf-8'), ENC_CONTEXT, enc.kms, enc.kekRef)` + `serializeEnvelope` — mirror `apps/api/src/modules/auth/shared/email-index.ts`. Define a `MEMBER_KYC_FIELD_CLASS` field-class; the `ENC_CONTEXT` keys on the member's **real `pariwarId`** (a tenant table, unlike the global admin-email namespace). Encryption is an **app-layer** concern → encrypt in the route/handler, pass ciphertext to the accessor (the accessor takes already-serialized ciphertext, like the 3.2 identity write).
  - [x] **Migration:** **hand-author `0024_member-kyc-profiles.sql`** (NOT `db:generate` — the meta snapshots stop at 0020; a generate would re-emit applied 0021–0023 → `42P07`; this is the locked 3.1/3.2/3.3a precedent [[project_live_db_test_gotchas]]). Follow the `0023_kyc-digilocker.sql` shape: `CREATE TYPE` enums, `CREATE TABLE`, `ALTER TABLE … ENABLE/FORCE ROW LEVEL SECURITY`, `CREATE POLICY`, `GRANT … TO twt_app`. Add the journal entry (idx 24). Apply to :5433, `db:check` "Everything's fine", verify `relrowsecurity`/`relforcerowsecurity` = t/t + policies + grants.

- [x] **Task 2 — KYC signup transport contracts + OpenAPI registration** (AC: #1, #2)
  - [x] Add the signup-step DTOs to `packages/contracts/src/kyc/` (the barrel exists from 3.3a; add `signup.ts` and `export * from './signup.js'` in `kyc/index.ts`). All `.strict()`; mirror `packages/contracts/src/members/auth.ts` shapes. **Contracts MUST NOT import `@twt/domain`** (the browser-bundle rule — see `rules/clause.ts`; the 3.3a kyc contracts obey it). Use `_common` primitives (`UuidString`, `Iso8601Datetime`) + plain `string`.
    - `KycInitiateResponse { transactionId, authorizationUrl, expiresAt }`
    - `KycCallbackRequest { state, code }` (the OAuth callback inputs)
    - `KycConfirmRequest { transactionId }`
    - `KycManualSubmitRequest { name, dob, photo? }` (photo = base64 data-URI string; **keep it OUT of any logged/public schema** — pii-scrape gate)
    - `KycProfileSummaryResponse` — the member-facing confirmation view: `{ name, dob, aadhaarMaskedId, verificationStrength, photoPresent: boolean }` (**never echo the raw photo bytes back** — a presence flag; the masked id; never the full Aadhaar)
    - `KycStatusResponse { transactionStatus?: 'pending'|'verified'|'failed'|'expired', memberKycState: 'none'|'digilocker_verified'|'manual_pending', lifecycleState }`
  - [x] **OpenAPI:** 3.3b adds the FIRST KYC HTTP endpoints → register the route schemas as OpenAPI paths (mirror `packages/contracts/src/auth/index.ts` `.openapi()` registration + the route `schema:` wiring). 3.3a kept `openapi/v1.yaml` byte-identical; **3.3b regenerates it** — run the OpenAPI generation and commit the updated `openapi/v1.yaml`. The `contracts:check-openapi-determinism` gate verifies regeneration is deterministic (byte-identical on re-run), NOT unchanged — so a changed-but-deterministic spec passes.

- [x] **Task 3 — KYC HTTP routes + handlers + `registerKycModule` + server.ts wiring** (AC: #1, #2, #5.3)
  - [x] New `apps/api/src/modules/kyc/kyc.routes.ts` + `kyc.handlers.ts` (+ `kyc.repo.ts` if helpful) and export `registerKycModule(app, deps)` from the existing `apps/api/src/modules/kyc/index.ts` (3.3a left it transport-only). Wire `registerKycModule(app, deps)` into `apps/api/src/server.ts` alongside `registerMemberAuthModule` (member-surface ordering). Routes:
    - `POST /api/v1/member/kyc/initiate` — `requireMemberSession`. Resolve `ctx = { db: scopeTx.tx, pariwarId }`, `provider = deps.kycProviders.getActiveKycProvider(ctx)`, `await provider.initiate(memberId, 'signup')` → return `KycInitiateResponse`. **Guard:** the member must be `pending-kyc` (`member.getMemberStateAt(db, memberId, now)`); reject otherwise (already-KYC'd → `409`/idempotent).
    - `POST /api/v1/kyc/callback` — **PUBLIC** (state-correlated, NOT bearer-authenticated — DigiLocker redirects the browser here with `?state&code`; it carries no member JWT). Validate `state` → `provider.verifyAndPullProfile({ state, code })` resolves the `kyc_transactions` row (which holds `member_id` + `pariwar_id`) → on success persist the `KycProfile` to `member_kyc_profiles` (status awaiting-confirm; **do NOT emit `member.kyc_completed` yet** — the member must confirm, per AC1). **Open a scope tx for the transaction's `pariwar_id`** (`openScopeTx(deps, txn.pariwarId)` — the callback is unauthenticated so it can't reuse a member-session scope; see R3). **Add this route to the login-wall PUBLIC allowlist** (`login-wall.spec.ts`) — like the OTP routes — or CI fails. On provider failure, normalize via `KycProviderError.toErrorResponse(requestId)` → the member app surfaces the AC2 empathy/manual-fallback path.
    - `POST /api/v1/member/kyc/confirm` — `requireMemberSession`. `{ transactionId }` → verify the txn is `verified` (`provider.getStatus`) + a stored profile exists → **emit `member.kyc_completed`** via the projector (`pending-kyc → pending-fee`) + audit. Idempotent (re-confirm → no second event; the projector's stream-version guard + a state check).
    - `POST /api/v1/member/kyc/manual` — `requireMemberSession`. `{ name, dob, photo? }` → encrypt + `upsertMemberKycProfile` (`source: 'manual'`, `verification_strength: 'self_declared'`, `trustee_verified: false`) + **emit `member.kyc_manual_fallback`** (`pending-kyc → pending-fee`; payload `reason` REQUIRED by the schema, e.g. `'manual_fallback'` or the originating DigiLocker failure code) + audit. This is the AC2 fallback target.
    - `GET /api/v1/member/kyc/status` — `requireMemberSession`. Return `KycStatusResponse`.
  - [x] **Event emission via the projector (the load-bearing pattern):** call `member.projectMemberState(scopeTx.client, { memberId, pariwarId, eventType, payload, actorId })` — it is the SOLE legitimate writer to `members.state` and needs a raw `pg.PoolClient` (it does `SET LOCAL app.member_state_writer='on'`). Build the payload with the §1.14 audit shape: `{ from_state: <getMemberStateAt result>, to_state: 'pending-fee', trigger: 'kyc_digilocker'|'kyc_manual', actor: 'member', …event-specific }`. **`member.kyc_completed`** payload may carry optional `kyc_reference`; **`member.kyc_manual_fallback`** payload REQUIRES `reason` (`KycManualFallbackPayloadSchema`). Do everything (profile write + event append + state projection) **inside ONE scope tx** so a torn view never exists.
  - [x] **Scope-tx for member routes (R3):** `requireMemberSession` sets `request.requestContext.pariwarId` from the access-token JWT but does **not** open a scope tx (the scope-resolution middleware is admin-oriented). The KYC handlers must open their own: `const scopeTx = await openScopeTx(deps, request.requestContext.pariwarId)` (the `multi-tenant/scope-tx.ts` helper — BEGIN + `SET LOCAL ROLE twt_app` + `setPariwarScope` + `assertPariwarScopeSet`) and `closeScopeTx(scopeTx, ok)` on the way out (COMMIT on success). **Confirm** whether a member-scope helper already exists before hand-rolling; if not, this is the pattern.
  - [x] **Audit:** extend the `AuthAuditEventType` closed union in `apps/api/src/audit/audit-sink.ts` with KYC events (e.g. `member_kyc.initiate` / `member_kyc.verified` / `member_kyc.manual` / `member_kyc.failure`) and emit via `emitAuthAudit(deps, request, type, {...})`. **No PII** — masked Aadhaar / `transactionId` only; never name/dob/photo/raw Aadhaar; never the OAuth code or `code_verifier`.

- [x] **Task 4 — Failure→manual empathy path + FR-58C hard-mandatory seam** (AC: #2, #3)
  - [x] Server: the `callback` (and `initiate`) failure responses carry the normalized `KycErrorCode` + `retriable` so the client can branch to the manual-fallback offer (AC2). Map `KycProviderError` → HTTP status at the boundary (reuse the 3.3a `toErrorResponse` projector + the app's error-mapping middleware).
  - [x] FR-58C **documented seam** (AC3): a single config-read point (mirror the 3.3a `provider-registry` `activeProviderKey` seam) — e.g. a `kyc.manualFallbackEnabled` resolved from config, defaulting to `true` (manual always available). The `status`/`initiate` response exposes whether manual is permitted; the mobile UI hides the manual CTA + shows the copy block when it is `false`. State plainly in Completion Notes that the flag read is a DOCUMENTED seam — FR-58C infra is not built. Do NOT build a flag store.

- [x] **Task 5 — Daily cert-refresh cron + staleness alarm + ADR-0026 ops obligations** (AC: #5.2)
  - [x] Register a **daily pg-boss cron** in `apps/jobs/src/boot.ts` (mirror the `IDEMPOTENCY_VACUUM` cron: `createQueue` → `work` → `schedule` in IST `Asia/Kolkata`; add a `QUEUE_NAMES.DIGILOCKER_CERT_REFRESH` to `@twt/queue`). The worker invokes `refreshDigiLockerCerts()` (3.3a's shipped function) with a `DigiLockerCertFetcher` + the jobs DB pool; on success the upsert **bumps `fetched_at`** (the staleness clock the budget reads). **Not fail-closed on refresh failure** (§2.8) — log + alarm; last-good cert is used within budget.
  - [x] **Boundary caveat (resolve explicitly — R6):** `apps/jobs` depends on `@twt/domain` + `@twt/queue`, **not** `apps/api`, and the `kyc-provider-boundary` gate (scans `apps/api/src` + `packages/*/src`, allowlist `apps/api/src/modules/kyc/providers/digilocker/**`) does NOT scan `apps/jobs/src`. The cert-refresh path uses `node:crypto` X.509 parsing (NOT the banned XML libs `xml-crypto`/`@xmldom/xmldom`/`xpath`) so importing `refreshDigiLockerCerts` is **gate-safe**. **Recommended:** add `@twt/api` as a workspace dep of `apps/jobs` and import `refreshDigiLockerCerts` + `createHttpDigiLockerTransport`/the cert fetcher from the kyc module's PUBLIC API; **do NOT copy the DigiLocker transport into `apps/jobs`** (it would spread the transport and defeat freeze row 13). If the cross-app import is undesirable, the alternative is a service-authenticated internal endpoint on `apps/api` the cron calls — pick one + record it. (If you DO extend the gate to scan `apps/jobs/src`, add the allowlist entry too.)
  - [x] **Within-budget staleness alarm (ADR-0026 Category-5):** the provider already fires `onStalenessAlarm` on within-budget verifications (7–30 days since refresh). Wire a real alarm sink (log/metric stub is acceptable — the observability transport is a later epic) where `buildKycProviderRegistry` constructs the provider in `apps/api/src/deps.ts`. Record intent; no external alerting transport built.
  - [x] **Ops obligations recorded (NOT code):** append a `## Story 3.3b deferred` section to `_bmad-output/implementation-artifacts/deferred-work.md` (the working sprint deferred-work document — **not** a root-level file) capturing the ADR-0026 Category-5 obligations that are runbook/process, not code: the **quarterly key-compromise rehearsal** and the **annual trust-anchor review** (the `deactivateDigiLockerCert(keyId)` accessor + KEK-rotation + FR-2 re-verification queue are the levers). Give each a re-trigger. Discharge the 3.3a deferred item DW-`assertRedirectUriAllowed` if `initiate` now passes a caller-controlled redirect (it does not in signup — note it stays vacuous; the guard fires in a future caller-supplied-redirect surface).

- [x] **Task 6 — Mobile KYC screens + api-client SDK + i18n + P0-2c accessibility** (AC: #1, #2, #3, #4)
  - [x] `packages/api-client/src/index.ts` — add the KYC SDK methods (`kycInitiate`, `kycConfirm`, `kycManualSubmit`, `kycStatus`) typed against `@twt/contracts`, mirroring the 3.2 member-auth SDK methods (bearer-token auth, error convention).
  - [x] Mobile screens (`apps/mobile`, Expo Router + Tamagui — the 3.2 precedent shipped `app/(auth)/login.tsx`/`otp.tsx`). Add a KYC step (e.g. `app/(signup)/kyc.tsx` or a `components/kyc/` set): **method choice** (DigiLocker vs manual) → DigiLocker opens `authorizationUrl` in an in-app browser, then **polls `kycStatus`** (recommended over deep-link handling for v1 — R4) until `verified`, shows the `KycProfileSummary` for **confirm**; **manual** form (name/dob/photo) with Pattern-6 bilingual input + Pattern-4 dignified validation. On any DigiLocker failure → AC2 auto-offer manual with the empathy copy. Hide manual + show the copy block when the hard-mandatory seam reports manual disabled (AC3).
  - [x] **i18n (Hindi-default — Epic 3 intro):** use the `@twt/i18n` utility (Story 2.1) + a `kyc` namespace. Keys: `kyc.choose_method`, `kyc.digilocker_cta`, `kyc.manual_cta`, `kyc.consent_explainer`, `kyc.confirm_prompt`, `kyc.manual_name`, `kyc.manual_dob`, `kyc.manual_photo`, `kyc.fallback_empathy` ("DigiLocker is unavailable — you can enter your details manually and we'll verify them"), `kyc.hard_mandatory_block`, `kyc.error_*` (one per `KycErrorCode`). Provide HI + EN.
  - [x] **Accessibility (AC4 / P0-2c):** every input/button gets `accessibilityLabel` + `accessibilityHint`; validation programmatically associated + announced (Pattern 4); touch targets 44pt default / 56pt critical (UX-DR65); Devanagari `lang`/pronunciation correct (Pattern 6); flow fully operable with TalkBack/VoiceOver. Mobile `build`/`test` are no-ops by repo design → verified by `typecheck` + `lint` (3.2 precedent); record the a11y discipline in Completion Notes. The signup wizard chrome itself is Story 3.6 — ship the KYC step as a reachable component/screen (a placeholder host is acceptable, mirroring 3.2's deferred wizard wiring).
  - [x] **Friction-budget ledger:** the manual-KYC fallback is a NAMED friction surface (UX Stance #2, UX line 269: "manual KYC fallback (relative pays to protect 'facilitator' posture)"). Declare it in `friction-budget.yaml`/`friction-budget.md` (payer = the relative/facilitator; protects = the facilitator-not-intermediary trust posture). The page-weight friction-budget CI gate covers the PUBLIC Astro surface, not the authenticated mobile app — adding the mobile KYC step does not move that baseline ([[project_friction_budget_baseline_ratchet]]).

- [x] **Task 7 — Tests + ci:local green merge gate** (AC: all)
  - [x] **Unit (DB-free):** profile encrypt/decrypt round-trip (Tier-1 envelope under the member field-class); the manual-submit payload validation; the FR-58C manual-enabled seam; the KYC-error → empathy mapping; the projector payload builder (correct `from_state`/`to_state`/`reason`). Reuse the 3.3a fixture signer for any DigiLocker-path unit (the fixture provider seam — never the live API).
  - [x] **Integration (:5433):** full signup KYC E2E with the **fixture provider** — initiate → callback → confirm emits `member.kyc_completed` and `members.state` projects `pending-kyc → pending-fee`; manual submit emits `member.kyc_manual_fallback` → `pending-fee` and writes an encrypted `member_kyc_profiles` row with `verification_strength: self_declared`, `trustee_verified: false`; cross-tenant RLS on `member_kyc_profiles` (`SET LOCAL ROLE twt_app` before asserting); `getMemberStateAt` guard rejects a non-`pending-kyc` member; **`login-wall.spec.ts` passes WITH the new routes** (member guard + the public `callback` allowlist); idempotent re-confirm emits no second event. **Seed a `pending-kyc` member + a member session** in the harness (member creation is Story 3.6 — see R2; `apps/api/tests/integration/_setup.ts` already builds the kyc fixture registry).
  - [x] **Cert-refresh cron** test: the daily worker invokes `refreshDigiLockerCerts` + bumps `fetched_at` (use the 3.3a cert-refresh integration precedent in `apps/jobs/tests/`).
  - [x] **Merge gate:** `pnpm ci:local` GREEN on :5433 ([[project_ci_actions_suspension_local_mirror]]) — incl. `kyc-provider-boundary` (must STAY green — you import the provider's public API, never the transport), `schema-diff` (additive `member_kyc_profiles`), `contracts-determinism` (the regenerated `openapi/v1.yaml` is deterministic), `pii-scrape` (no plaintext name/dob/photo/Aadhaar reaches a scanned public surface), and live-DB `integration-tests`. **Re-run after the FINAL code state** (the 3.2/3.3a lesson: a recorded-green can predate later patches).

### Review Findings

Code review conducted 2026-06-26 (Blind Hunter + Edge Case Hunter + Acceptance Auditor). 10 patches, 0 decision-needed, 2 deferred, 2 dismissed.

- [x] [Review][Patch] P1 — Confirm screen shows no DigiLocker profile data — member can't review what they're confirming (AC1 blocker): the mobile polls `/status` which carries no profile fields; the `KycProfileSummaryResponse` from the callback is never received by the app; the confirm screen renders only the generic prompt. Fix: add `GET /api/v1/member/kyc/profile-summary` (requireMemberSession) decrypting name/dob/aadhaarMaskedId + photoPresent; call it from the confirm step in `kyc.tsx` before rendering. [`apps/mobile/app/(signup)/kyc.tsx:204-224`; missing profile-summary endpoint in `kyc.handlers.ts`]
- [x] [Review][Patch] P2 — Callback handler doesn't check transaction status or expiry before calling `verifyAndPullProfile` — expired/replayed/already-verified transactions pass through, causing spurious provider calls, stuck-pending rows, and false `member_kyc.failure` audit events. Fix: after `resolveKycTransactionByState`, reject if `txn.status !== 'pending'` (404) or `txn.expiresAt <= deps.clock()` (409) before opening the scope tx. [`apps/api/src/modules/kyc/kyc.handlers.ts:callback`; `apps/api/src/modules/kyc/kyc.repo.ts`]
- [x] [Review][Patch] P3 — Confirm handler doesn't bind `body.transactionId` to the authenticated member — any verified transaction in the same Pariwar can be supplied, causing a member to advance their own lifecycle using another member's transaction (broken audit trail). Fix: after the scope tx is open, verify that the `kyc_transaction.member_id` matches the authenticated `memberId` (via `profile.kycTransactionId === body.transactionId` check on the stored profile, or a direct transaction lookup). [`apps/api/src/modules/kyc/kyc.handlers.ts:confirm:214-217`]
- [x] [Review][Patch] P4 — Manual handler overwrites an existing `digilocker`-verified profile without a source guard — a member who completed the DigiLocker callback (profile stored as `aadhaar_kyc / digilocker`) but hasn't yet confirmed can call `POST /kyc/manual` while still `pending-kyc`, silently downgrading their cryptographically-verified record to `self_declared`. Fix: in the manual handler, before upsert, check if an existing profile with `source='digilocker'` exists and reject with 409 if so. [`apps/api/src/modules/kyc/kyc.handlers.ts:manual:268-269`; `packages/domain/src/kyc/profile-write.ts`]
- [x] [Review][Patch] P5 — Backend `POST /member/kyc/manual` does not enforce the FR-58C `manualFallbackEnabled` flag server-side — a caller bypassing the UI can write a `self_declared` profile even when the flag is `false`. Fix: call `isManualFallbackEnabled(deps)` at the top of the manual handler and throw `ConflictError` (or 403) if `false`. [`apps/api/src/modules/kyc/kyc.handlers.ts:manual`]
- [x] [Review][Patch] P6 — `member_kyc.verified` audit event emitted for two semantically distinct actions (callback profile-persistence and confirm state-transition) — audit queries cannot distinguish the two checkpoints. Fix: add `member_kyc.confirmed` to `AuthAuditEventType` and use it in the confirm handler instead of reusing `member_kyc.verified`. [`apps/api/src/audit/audit-sink.ts`; `apps/api/src/modules/kyc/kyc.handlers.ts:confirm:239`]
- [x] [Review][Patch] P7 — Polling-detected `expired` transaction routes to `t('kyc.error_verification_failed')` instead of `t('kyc.error_transaction_expired')` — wrong empathy copy ("We couldn't verify those details") for a timeout case. Fix: replace `t('kyc.error_verification_failed')` in the `transactionStatus === 'expired'` branch with `t('kyc.error_transaction_expired')`. [`apps/mobile/app/(signup)/kyc.tsx:107-110`]
- [x] [Review][Patch] P8 — Cert-refresh Phase 2 writes are NOT in a DB transaction — a mid-loop failure (transient DB error on cert N+1) leaves cert N committed and cert N+2..N written nowhere, producing a partial cache update. Fix: wrap the Phase 2 `for` loop in `db.transaction(async (tx) => { ... })` so either all certs write or none do. [`packages/domain/src/kyc/cert-refresh.ts:69-80`]
- [x] [Review][Patch] P9 — Cert fetcher `DIGILOCKER_ISSUER_CERT_URL` response has no size cap — a very large response is fully buffered before parsing. Fix: check the `Content-Length` response header or read with a byte cap and throw if exceeded. [`apps/jobs/src/digilocker-cert-refresh.ts:createEnvCertFetcher:92-97`]
- [x] [Review][Patch] P10 — Manual CTA `height={48}` is below the 56pt critical-CTA floor when it is the sole viable KYC action for a member who cannot complete DigiLocker. Fix: raise to `height={56}`. [`apps/mobile/app/(signup)/kyc.tsx:284`]
- [x] [Review][Defer] W1 — Photo field validates only data-URI prefix; arbitrary bytes stored encrypted. Spec doesn't require image decoding; future hardening. [`packages/contracts/src/kyc/signup.ts:94-98`] — deferred, pre-existing design constraint
- [x] [Review][Defer] W2 — `dob` field has no format constraint. Trustee does visual verification; spec is silent on format. [`packages/contracts/src/kyc/signup.ts`] — deferred, pre-existing design constraint

## Dev Notes

### Reuse map — consume the 3.3a seam; do NOT reinvent

| Need | Existing anchor (REUSE) | Net-new for 3.3b |
|---|---|---|
| `KycProvider` port + `KycProfile`/`KycError`/`KycProviderError` | `@twt/contracts` (top barrel) | signup transport DTOs (`kyc/signup.ts`) |
| DigiLocker provider (OAuth+PKCE, XMLDSig verify, mapper, error norm) | `apps/api/src/modules/kyc/providers/digilocker/` | nothing — call it via the registry |
| Provider selection (FR-58C seam) | `getActiveKycProvider(ctx)` + `deps.kycProviders` | manual-enabled seam (AC3) |
| `kyc_transactions` substrate + accessors | `@twt/domain` `kyc.insertKycTransaction`/`getKycTransactionByState`/`updateKycTransactionStatus` | `member_kyc_profiles` table + accessors |
| Lifecycle transition + event append | `member.projectMemberState(client, …)` + `member.getMemberStateAt(db, …)` + the frozen `member.kyc_completed`/`member.kyc_manual_fallback` events | the route that emits them (the FIRST emitter) |
| Tier-1 PII encrypt + tenant table | `auth/shared/email-index.ts` (`encryptTier1`+`serializeEnvelope`) + `member_identities.ts` (tenant RLS) | `member_kyc_profiles` field-class |
| Scoped transactional write | `multi-tenant/scope-tx.ts` (`openScopeTx`/`closeScopeTx`) | member-route scope tx (R3) |
| Audit emit | `emitAuthAudit` + the `AuthAuditEventType` closed union | KYC event variants |
| Daily cron substrate | `apps/jobs/src/boot.ts` (the `IDEMPOTENCY_VACUUM` cron) + `refreshDigiLockerCerts()` | cert-refresh queue + worker |
| Member SURFACE (routes, SDK, mobile screen, OpenAPI, login-wall) | Story 3.2 (`auth/member/`, api-client, `app/(auth)/`, `auth/index.ts`) | the KYC equivalents |

### R1 — Manual fallback → `pending-fee` now, `pending-valid` later (the load-bearing reconciliation)
The epic AC reads "Manual fallback → state advances to `pending-valid`." **The Story 3.1 reducer does NOT do that** — `member.kyc_manual_fallback` maps `pending-kyc → pending-fee` (`packages/domain/src/member/state.ts:74-76`), identical to `member.kyc_completed`. The implemented design (3.1, locked + tested): a manual-KYC member proceeds through signup normally (pays the fee → `lock-in`), and the **unverified** outcome resolves at **lock-in expiry** — `member.lock_in_expired` branches on `payload.kyc_verified`: `true → active`, `false → pending-valid` (`state.ts:89-94`). So `pending-valid` is reached by an *unverified* member at the END of lock-in, NOT at the KYC step. **3.3b MUST emit `member.kyc_manual_fallback` (→ pending-fee) and MUST NOT force a `pending-valid` transition** — doing so would corrupt the lifecycle and break the lock-in flow. The distinction between verified/unverified is carried by **which event was emitted** (`kyc_completed` vs `kyc_manual_fallback`) — Story 3.7's SIE scheduler derives `kyc_verified` from the stream to populate `member.lock_in_expired`. Emitting the correct event in 3.3b is therefore what makes 3.7's branch correct. Also fold the naming reconciliation: the epic writes `kyc.completed`/`kyc.manual-fallback`; the frozen event types are `member.kyc_completed`/`member.kyc_manual_fallback`.

### R2 / "Who creates the member" — Story 3.6 owns member creation; 3.3b assumes a `pending-kyc` member
The lifecycle requires the member to exist in `pending-kyc` (i.e. `member.signup_initiated` already appended) BEFORE the KYC transition. Three source documents agree this is **Story 3.6's** job: `members.ts` ("`member_id` minted by the signup flow (Story 3.6)"), `member_identities.ts` ("Mobile is written by the signup flow (Story 3.6)"), and Story 3.2 R5 ("Story 3.6 consumes the `signup_continuation` token to create the member + upgrade to a full session"). **No production code emits `member.signup_initiated` or calls `projectMemberState` yet — 3.3b is the first surface to drive the lifecycle, but it does NOT create the member.** 3.3b builds the KYC step operating on an authenticated member already in `pending-kyc`; tests seed that member + session. This mirrors exactly how 3.2 shipped the auth seam + SDK and **deferred the signup-wizard wiring to 3.6** (3.2 W4-3.2: the OTP screen shows a placeholder for `signup_continuation`). Consequence (state it in Completion Notes): a real first-signup user cannot reach the KYC step E2E until 3.6 wires member-creation-from-continuation + the wizard chrome — 3.3b ships the fully-working API + cron + SDK + screen, reachability completes in 3.6. **Do NOT move member creation into 3.3b** (the confirmed scope decision).

### R3 — Member routes must open their own scope tx; the OAuth callback is unauthenticated
`requireMemberSession` (`auth/shared/member-session-guard.ts`) only verifies the access-token JWT and sets `request.requestContext.actorId`/`.pariwarId` — it does **not** open a `SET LOCAL app.pariwar_id` transaction (the scope-resolution middleware that does is admin/role-grant oriented). The projector + the tenant accessors need an active scoped tx, so each member KYC handler opens one via `openScopeTx(deps, request.requestContext.pariwarId)` and closes it with `closeScopeTx(scopeTx, ok)`. The projector specifically needs the raw `scopeTx.client` (`pg.PoolClient`) because it issues `SET LOCAL app.member_state_writer='on'`. **The `POST /api/v1/kyc/callback` route is the exception:** DigiLocker redirects the *browser* there with `?state&code` and no member JWT, so it cannot use `requireMemberSession`. It is correlated by the unguessable OAuth `state`: `verifyAndPullProfile` resolves the `kyc_transactions` row (which carries `member_id` + `pariwar_id`); the handler opens a scope tx for **that** `pariwar_id` to persist the profile. Put the callback on the `login-wall.spec.ts` PUBLIC allowlist (it is an authenticated-equivalent via state, like the OTP request/verify routes). The §2.8 redirect_uri allowlist + state validation are the callback's defenses.

### R4 — Mobile DigiLocker redirect: poll `getStatus`, don't hand-roll deep-link OAuth
DigiLocker's OAuth redirect lands on the backend `callback` route (the configured `DIGILOCKER_REDIRECT_URI` = `/api/v1/kyc/callback`). For the Expo mobile app, the simplest robust v1 pattern: open `authorizationUrl` in an in-app browser (`expo-web-browser`), let the backend `callback` finalize verify+pull server-side, and have the app **poll `GET /api/v1/member/kyc/status`** (or the `getStatus` SDK) until `transactionStatus: 'verified'`, then render the `KycProfileSummary` for confirm. This avoids fragile mobile deep-link/redirect interception. Record it as the chosen mechanism; a deep-link finalize is a later optimization.

### R5 — Signup intent only; `relink` (step-up-gated) is out of scope
`KycIntent` is `'signup' | 'relink'`. 3.3b wires **`'signup'`** only. AR-24 lists "DigiLocker re-link" as a step-up-OTP-gated action — the `relink` flow (re-running KYC from a Life-Events/profile surface behind `requireMemberStepUp`, which 3.2 shipped) is a future surface. Note `relink` is supported by the port but deferred; do not build the step-up-gated relink route here.

### R6 — Cert-refresh cron crosses the `apps/jobs` ↔ `apps/api` boundary (resolve it)
The canonical cron home is `apps/jobs/boot.ts`, but the cert-refresh function lives in the gate-fenced `apps/api` kyc module, and `apps/jobs` does not currently depend on `apps/api`. The refresh path uses `node:crypto` X.509 parsing (NOT the banned XML libs), so importing `refreshDigiLockerCerts` is gate-safe. Recommended: add `@twt/api` as a workspace dep of `apps/jobs` and import the public `refreshDigiLockerCerts` + transport/fetcher factory; alternatively a service-authenticated internal `apps/api` endpoint the cron calls. **Never copy the DigiLocker transport into `apps/jobs`** (freeze row 13). Pick + record. (See Task 5.)

### Member KYC profile — PII discipline (confirmed: new encrypted table, photo as Tier-1 text)
`members` is the lifecycle anchor and stays PII-free (3.1) — the KYC profile lands in a net-new `member_kyc_profiles` (tenant-isolated, like `member_identities`). Name/DoB/photo are **Tier-1** (envelope-encrypted; the photo is the mapper's `data:image/jpeg;base64,…` string stored as Tier-1 ciphertext — no object/blob storage exists in the stack, and building one is out of scope; storing the base64 Tier-1-encrypted is the confirmed v1 path). Masked-Aadhaar is already last-4 at the provider boundary → **Tier-3** (plaintext is acceptable; it carries no full identifier). NEVER log the profile; NEVER echo the raw photo back (the summary uses a `photoPresent` flag); keep all of it off any public/scanned surface (the `pii-scrape` gate). The manual path stores the same shape with `verification_strength: 'self_declared'` + `trustee_verified: false`; a later trustee surface (Epic 4) flips `trustee_verified` and emits `member.kyc_completed` from `pending-valid → active` (the reducer already supports `pending-valid + kyc_completed → active`, `state.ts:70`).

### DigiLocker signature/staleness/key-compromise (ADR-0026 — values already committed)
The provider already enforces the AC7 policy (verify vs cached cert pinned; X.509 `notAfter` gate; two-window staleness `within-budget → trust+alarm` / `past-hard-limit → fail closed`). The ADR-0026 values (drafted, un-attested-pending): within-budget **7 days**, hard-limit **30 days**, **daily** refresh + **annual** trust-anchor review, key-compromise = `deactivateDigiLockerCert(keyId)` → rotate KEK + reissue cache → FR-2 re-verification queue → **quarterly** rehearsal. 3.3b's job is the OPS wiring (daily cron bumping `fetched_at`; within-budget alarm sink) + recording the quarterly-rehearsal / annual-review obligations in deferred-work — NOT re-deciding the numbers. When the hard-limit fail-closed fires during a real pull, the caller routes the member to manual fallback (AC2) — the same `pending-valid` outcome arrives later at lock-in expiry (R1).

### Project Structure Notes
- **New files:**
  - `packages/domain/src/schema/member_kyc_profiles.ts`; `packages/domain/src/policies/member-kyc-profiles-rls.ts`; `packages/domain/src/kyc/{profile-read.ts, profile-write.ts}` (extend the 3.3a `kyc/` namespace + barrel); `packages/domain/migrations/0024_member-kyc-profiles.sql` (+ journal idx 24).
  - `packages/contracts/src/kyc/signup.ts` (+ barrel re-export + OpenAPI paths).
  - `apps/api/src/modules/kyc/{kyc.routes.ts, kyc.handlers.ts}` (+ `kyc.repo.ts` optional); `registerKycModule` added to `apps/api/src/modules/kyc/index.ts`.
  - api-client KYC methods; mobile KYC screen/components (`apps/mobile/app/(signup)/kyc.tsx` or `components/kyc/`) + `kyc` i18n namespace.
  - `apps/jobs` cert-refresh queue/worker (+ `@twt/queue` `QUEUE_NAMES.DIGILOCKER_CERT_REFRESH`).
- **Edited files:** `packages/domain/src/{index.ts (kyc namespace add), schema/index.ts, policies/index.ts}`; `packages/contracts/src/kyc/index.ts` (+ `openapi/v1.yaml` regenerated); `apps/api/src/server.ts` (`registerKycModule`); `apps/api/src/audit/audit-sink.ts` (KYC event union); `apps/api/src/deps.ts` (staleness-alarm sink + manual-enabled seam); `apps/api/tests/integration/login-wall.spec.ts` (callback allowlist); `apps/jobs/src/boot.ts` (+ `apps/jobs/package.json` dep, R6); `friction-budget.yaml`/`.md`; `_bmad-output/implementation-artifacts/deferred-work.md`; `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **Module shape:** mirror `auth/member/` (routes/handlers/repo split + `registerXModule`), `member_identities.ts` (tenant table + RLS), `email-index.ts` (Tier-1 encrypt), `boot.ts` (cron). Contracts dir like `members/auth.ts` (`.strict()`, no domain import, ESM `.js` specifiers, OpenAPI registration).
- **Variances to record:** (1) member creation stays in 3.6 — 3.3b assumes a seeded `pending-kyc` member (R2); (2) manual KYC → `pending-fee` not `pending-valid` (R1); (3) photo stored as Tier-1 base64 text, no blob storage (confirmed); (4) the OAuth callback is public/state-correlated (R3); (5) cron crosses the jobs↔api boundary via the gate-safe public API (R6).

### Testing standards summary
Vitest. Unit DB-free + pure (encryption round-trip, payload builders, seam logic, error→empathy mapping). Integration on **:5433** (`twt-test-pg`) per [[project_live_db_test_gotchas]] — never regenerate an applied migration; never `DROP SCHEMA`; assert membership not exact counts; `SET LOCAL ROLE twt_app` before asserting RLS. Use the **fixture KYC provider** for all DigiLocker-path tests (never the live government API). Mobile UI verified by `typecheck`+`lint` only (build/test are no-ops by repo design). Merge gate = `pnpm ci:local` (18+ jobs) [[project_ci_actions_suspension_local_mirror]]; re-run after the final code state.

### References
- [Source: epics.md#Story 3.3b (lines 1665-1681)] — ACs verbatim + `[SURFACE]` label + accessibility AC.
- [Source: epics.md#Story 3.3a (lines 1646-1663) + the 3.3a story scope table] — the seam 3.3b consumes; the explicit 3.3a→3.3b scope handoff (cron, route registration, Category-5 ops).
- [Source: epics.md#Epic 3 (lines 1567-1591)] — Hindi-default, demoable first-signup, P0-2c inheritance, FR-2 + NFR-27.
- [Source: epics.md#Story 3.6 (lines 1717-1737)] — the wizard assembler + member creation + the 5-condition lock-in gate (KYC = condition (a)).
- [Source: architecture.md#2.8 (lines 1602-1634) + #3.8 (lines 2310-2331)] — signature policy, staleness budget, key-compromise, redirect_uri allowlist, aggregator path.
- [Source: packages/domain/src/member/{state.ts, events.ts, project.ts, read.ts}] — the reducer (R1), the frozen event vocabulary + payload schemas, the projector (sole `members.state` writer), `getMemberStateAt`.
- [Source: packages/domain/src/schema/{members.ts, member_identities.ts}] — members is PII-free; the tenant-PII-table + Tier-1 pattern to mirror.
- [Source: apps/api/src/modules/kyc/** (Story 3.3a)] — provider, registry, context, fixture; `refreshDigiLockerCerts`, `evaluateCertStaleness`, `onStalenessAlarm`.
- [Source: packages/domain/src/kyc/{read.ts, write.ts}] — the `kyc.*` transaction/cert accessors to extend with the profile accessors.
- [Source: apps/api/src/modules/multi-tenant/scope-tx.ts] — `openScopeTx`/`closeScopeTx` (R3).
- [Source: apps/api/src/modules/auth/member/** + auth/shared/{member-session-guard.ts, email-index.ts} (Story 3.2)] — the member-SURFACE precedent (routes, guard, Tier-1 encrypt, SDK, login-wall, audit, signup_continuation seam).
- [Source: apps/jobs/src/boot.ts (Story 1.12)] — the pg-boss cron registration pattern (R6).
- [Source: docs/adr/ADR-0026-digilocker-signature-policy.md + adr-index L82/L84] — the staleness/rotation/compromise values (drafted) the ops wiring serves.
- [Source: ux-design-specification.md §12 Pattern 4 (lines 2334-2360) + Pattern 6 (2372-2379) + line 269 (named friction)] — dignified validation grammar, bilingual input, the manual-KYC named friction surface.
- [Source: _bmad-output/implementation-artifacts/0-10-...md (P0-2c)] — the inherited accessibility gate (WCAG 2.1 AA / Devanagari screen-reader / touch-target categories).
- [Source: friction-budget.yaml + friction-budget.md] — the ledger to declare the manual-KYC friction surface in.

## Previous Story Intelligence

From Story 3.3a (the seam, done — uncommitted on `main`) + Story 3.2 (member SURFACE, merged #46) + Story 3.1 (lifecycle, merged #45):
- **The seam is COMPLETE and tested** — consume it; the import-boundary gate makes any transport leak a CI failure. The provider, registry, accessors, contracts, cert-refresh, and ADR-0026 are all present.
- **3.2 is the SURFACE template.** Route module = `routes/handlers/repo` + `registerXModule` in `server.ts`; Tier-1 PII = `encryptTier1`+blind-index on a tenant table; new authenticated routes MUST be guarded + taught to `login-wall.spec.ts` (and public ones allowlisted) or CI fails; member routes are bearer-token (no `@fastify/session`); SURFACE auth stories ship the mobile screen + api-client SDK; mobile UI is typecheck/lint-verified only.
- **3.2 deferred the signup wizard + `signup_continuation` consumption to 3.6** (W4-3.2). 3.3b follows the same posture for member creation (R2) — build the full API/cron/SDK/screen, defer E2E reachability to 3.6.
- **Migration discipline (locked):** hand-author the SQL (snapshots stop at 0020; a `db:generate` re-emits applied 0021–0023 → 42P07); apply :5433; `db:check`; verify FORCE-RLS. Re-run `ci:local` after the FINAL code state (3.2 burned a re-review on a recorded-green that predated patches).
- **Invariant ⇒ machine guard (AI-2-2 lesson):** load-bearing invariants get a gate, not a comment. The relevant gates here already exist (`kyc-provider-boundary`, `login-wall`, `member-state-invariant`, `pii-scrape`, `schema-diff`, `contracts-determinism`) — keep them green; you should not need a NEW gate, but if you find a new load-bearing invariant, add one.

## Git Intelligence Summary

Last commits: `01097f5` Story 3.2 member mobile+OTP [SURFACE] (#46) · `8a741d1` Story 3.1 member lifecycle [PRIMITIVE] (#45) · `f974689` AI-2-3 test-quality · `56fff0e` AI-2-2 domain-accessor gate · `aa34a08` Epic 2 retro. Story 3.3a is implemented + reviewed but **uncommitted on `main`** (its files show as untracked/modified in `git status`) — 3.3b builds directly on that working tree. Signal: Epic 3 is mid-flight; 3.1 (lifecycle) + 3.2 (auth) merged, 3.3a (seam) present locally, and 3.3b is the SURFACE that finally lights up the lifecycle. The recent SURFACE commit (3.2) is the precise template for routes/SDK/mobile/login-wall/audit.

## Latest Tech Information

- **DigiLocker transport is already built + pinned** (3.3a): `xml-crypto@6.1.2` (exact), `@xmldom/xmldom`/`xpath`, Node-22 global `fetch`, OAuth2 authorization-code + PKCE via Meri Pehchaan (`/oauth2/1/authorize` → `/oauth2/1/token` → `/oauth2/3/xml/eaadhaar`). 3.3b adds NO new DigiLocker dependency — it consumes the provider.
- **Likely new deps:** `expo-web-browser` (in-app OAuth browser) in `apps/mobile`; `@twt/api` workspace dep added to `apps/jobs` (R6, for the gate-safe cert-refresh import). The eAadhaar photo arrives inline as a base64 `data:` URI from the 3.3a mapper — no image-upload/storage library is needed (stored Tier-1-encrypted as text).
- **Supply-chain:** no auto-update of the pinned DigiLocker libs (§2.8) — you are not changing them.

## Project Context Reference

No `project-context.md` present. Cross-cutting facts from auto-memory: [[project_live_db_test_gotchas]] (test DB :5433; migration/reset gotchas), [[project_ci_actions_suspension_local_mirror]] (`pnpm ci:local` merge gate; Actions suspended), [[project_member_lifecycle_domain_substrate]] (lifecycle in `@twt/domain`; projector-only state; events on `main`), [[feedback_architecture_vs_prd_boundary]] (architecture commits structural location/state — the epic's `pending-valid` is reconciled to the implemented reducer, R1), [[feedback_record_unattested_no_backfill]] (ADR-0026 values are authored truth, not back-fill — don't re-invent them), [[project_eslint_config_per_package_cwd]] (cwd-relative role globs if adding any eslint carve-out), [[project_friction_budget_baseline_ratchet]] (the page-weight baseline covers the public surface, not the mobile app).

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Ready for `dev-story`.

**Decisions locked by the user (2026-06-26, during creation):**
1. **KYC profile persistence = new `member_kyc_profiles` table, photo as Tier-1 encrypted text.** Migration 0024; mirrors `member_identities`; manual path stores the same shape `self_declared` + `trustee_verified=false`. No object/blob storage built.
2. **Cron + alarm code in 3.3b; rehearsal in the runbook.** 3.3b registers the daily cert-refresh pg-boss cron (apps/jobs) + wires the within-budget staleness alarm; the quarterly key-compromise rehearsal + annual trust-anchor review are recorded as ops/runbook obligations (deferred-work), not code.
3. **Member creation stays in Story 3.6; 3.3b assumes an existing `pending-kyc` member.** 3.3b builds the KYC step on a seeded member + session (KYC routes use `requireMemberSession`); member-creation-from-`signup_continuation` + wizard assembly + E2E reachability complete in 3.6 (mirrors how 3.2 deferred wizard wiring).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) via bmad-dev-story.

### Debug Log References

- One transient integration failure during the FIRST `ci:local` run: the `apps/jobs` cert-refresh DB test COMMITTED a cert into the GLOBAL `digilocker_public_certs` cache (auto-commit via the pool), which `listActiveCerts(limit:1)` then returned as the newest active cert — breaking the 3.3a `certificate_stale` test ([[project_live_db_test_gotchas]]: own-committing writers pollute other suites). Fixed by rewriting the jobs DB test to run inside a `BEGIN/ROLLBACK` (the `withProvider`-rollback discipline) and cleaning the leaked row. Re-ran `ci:local` → 18 jobs green.
- Integration seeding: a pending-kyc member needs BOTH the `events_log` stream AND the `members` row (the `member_kyc_profiles` FK → `members`). Seeding only `events_log` raised a 23503 FK violation; switched the harness to seed via `projectMemberState(member.signup_initiated)` (how Story 3.6 will create the member).

### Completion Notes List

✅ All 7 tasks + AC1–AC5 complete. **`pnpm ci:local` — 18/18 jobs GREEN** on :5433 (incl. integration-tests, kyc-provider-boundary, schema-diff [additive `member_kyc_profiles`], contracts-determinism [regenerated `openapi/v1.yaml`], pii-scrape, member-state-invariant, i18n-parity, friction-budget). Re-ran after the FINAL code state.

**What shipped:** the signup KYC surface (`initiate` → PUBLIC `callback` → `confirm` + `manual` + `status`) driving the Story 3.1 lifecycle (FIRST emitter of `member.kyc_completed` / `member.kyc_manual_fallback` via the projector, pending-kyc → pending-fee); the net-new tenant-isolated `member_kyc_profiles` table (Tier-1 name/dob/photo, Tier-3 masked-Aadhaar) + migration 0024; the contracts + OpenAPI paths; `registerKycModule` wired into `server.ts`; the daily cert-refresh pg-boss cron in `apps/jobs`; the api-client KYC SDK + the mobile `(signup)/kyc.tsx` screen + the `kyc.*` i18n namespace (HI+EN).

**Reconciliations as-built:**
- **R1 (load-bearing):** manual fallback emits `member.kyc_manual_fallback` → **pending-fee** (NOT pending-valid). The verified/unverified distinction is carried by WHICH event was emitted; pending-valid is reached LATER at lock-in expiry (Story 3.7). Integration test asserts the emitted event + payload `to_state: pending-fee` + the required `reason`.
- **R2:** member creation stays in Story 3.6 — 3.3b assumes a seeded `pending-kyc` member + session (routes use `requireMemberSession`). A real first-signup user cannot reach the KYC step E2E until 3.6 wires member-creation-from-`signup_continuation` + the wizard chrome; 3.3b ships the fully-working API/cron/SDK/screen, reachability completes in 3.6.
- **R3:** member handlers open their OWN scope tx (`openScopeTx`); the projector gets the raw `scopeTx.client`. The `POST /api/v1/kyc/callback` route is PUBLIC/state-correlated — it resolves the transaction's `pariwar_id` PRE-SCOPE via the BYPASSRLS `servicePool` (`kyc.repo.ts`), then opens a scope tx for that pariwar. Added to the `login-wall.spec.ts` PUBLIC allowlist.
- **R4:** mobile polls `kycStatus` (keys on `memberKycState`) after opening the authorization URL in `expo-web-browser` — no fragile deep-link OAuth.
- **R5:** signup intent only; `relink` deferred (note in deferred-work DW-3.3b-4 — the `assertRedirectUriAllowed` guard stays vacuous here since `initiate` passes no caller-supplied redirect).
- **R6 (resolved with a VARIANCE from the story's "recommended" path):** the recommended cross-app import (`apps/jobs` → `@twt/api`) is **INFEASIBLE** — `apps/api` already depends on `@twt/jobs` (`verifyAuditChain`), so a reverse edge would CYCLE the turbo build graph. **Resolution:** `refreshDigiLockerCerts` + its `DigiLockerCertFetcher`/`FetchedIssuerCert`/`RefreshCertsResult` types were **RELOCATED to `@twt/domain`** (they only ever used `@twt/domain` + `node:crypto` — never the gate-fenced DigiLocker transport), so BOTH `apps/api` (the provider) and `apps/jobs` (the cron) reuse the SAME function with no cycle and no transport spread (freeze row 13 honored; `kyc-provider-boundary` stays green). The 3.3a `digilocker-provider.spec.ts` was updated to import it via the `kyc.*` namespace.

**FR-58C seam (AC3):** `config.digilocker.manualFallbackEnabled` (default `true`) read through the single `isManualFallbackEnabled(deps)` point; surfaced on `KycStatusResponse.manualFallbackEnabled`; the mobile screen hides the manual CTA + shows the `kyc.hard_mandatory_block` copy when `false`. No flag store built. Variance: the flag rides on `/status` (the entry-point read) rather than `/initiate`, which keeps `KycInitiateResponse` at its exact named `{transactionId, authorizationUrl, expiresAt}` shape.

**Staleness alarm (AC5.2):** already wired in `apps/api/src/deps.ts` (a `console.warn` sink) from 3.3a; the cron additionally alarms an empty/failed refresh. The real alerting transport is deferred (DW-3.3b-3). ADR-0026 Category-5 ops obligations (quarterly key-compromise rehearsal, annual trust-anchor review) recorded in `deferred-work.md` with re-triggers (NOT code).

**PII discipline:** name/dob/photo are Tier-1 envelope-encrypted in the route (member field-class, keyed on the real `pariwarId`) before the accessor sees ciphertext; masked-Aadhaar is Tier-3; the summary view uses a `photoPresent` flag (never echoes the photo); audit carries masked-Aadhaar / transaction_id only. The photo is stored as Tier-1 base64 text (no blob store — confirmed scope). **Variance:** the mobile Aadhaar-photo CAPTURE control is deferred (needs an image-picker dep) — the manual API + encryption already accept an optional base64 photo (noted in `kyc.tsx`).

### File List

**New:**
- `packages/domain/src/schema/member_kyc_profiles.ts`
- `packages/domain/src/policies/member-kyc-profiles-rls.ts`
- `packages/domain/src/kyc/profile-read.ts`
- `packages/domain/src/kyc/profile-write.ts`
- `packages/domain/src/kyc/cert-refresh.ts` (relocated from apps/api — R6)
- `packages/domain/migrations/0024_member-kyc-profiles.sql`
- `packages/contracts/src/kyc/signup.ts`
- `apps/api/src/modules/kyc/kyc.routes.ts`
- `apps/api/src/modules/kyc/kyc.handlers.ts`
- `apps/api/src/modules/kyc/kyc.repo.ts`
- `apps/api/src/modules/kyc/kyc-crypto.ts`
- `apps/api/src/modules/kyc/manual-fallback-seam.ts`
- `apps/jobs/src/digilocker-cert-refresh.ts`
- `apps/mobile/app/(signup)/_layout.tsx`
- `apps/mobile/app/(signup)/kyc.tsx`
- `apps/api/tests/unit/kyc-signup.test.ts`
- `apps/api/tests/integration/kyc/kyc-signup.spec.ts`
- `apps/jobs/tests/digilocker-cert-refresh.test.ts`

**Modified:**
- `packages/domain/src/kyc/index.ts`, `packages/domain/src/kyc/read.ts` (+`getLatestKycTransactionForMember`)
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`, `packages/domain/migrations/meta/_journal.json` (idx 24)
- `packages/contracts/src/kyc/index.ts`, `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml` (regenerated)
- `apps/api/src/server.ts`, `apps/api/src/config.ts`, `apps/api/src/context.ts`
- `apps/api/src/audit/audit-sink.ts`, `apps/api/src/middleware/error-mapping/index.ts`
- `apps/api/src/modules/kyc/index.ts`, `apps/api/src/modules/kyc/providers/digilocker/index.ts`
- `apps/api/tests/integration/login-wall.spec.ts`, `apps/api/tests/integration/kyc/digilocker-provider.spec.ts`
- `packages/api-client/src/index.ts`, `packages/queue/src/index.ts`, `apps/jobs/src/boot.ts`
- `packages/i18n/locales/en/common.json`, `packages/i18n/locales/hi/common.json`
- `friction-budget.md`, `_bmad-output/implementation-artifacts/deferred-work.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Deleted:**
- `apps/api/src/modules/kyc/providers/digilocker/cert-refresh.ts` (relocated to `@twt/domain` — R6)

## Change Log

| Date | Change |
|---|---|
| 2026-06-26 | Story created via bmad-create-story. Resolved 3 scope decisions with the user: (1) new `member_kyc_profiles` table with photo as Tier-1 text; (2) cron+alarm code in 3.3b, rehearsal in runbook; (3) member creation stays in 3.6 (3.3b assumes a seeded pending-kyc member). Folded 6 reconciliations (R1–R6) incl. the load-bearing manual-fallback → pending-fee (not pending-valid) lifecycle reconciliation. Status → ready-for-dev. |
| 2026-06-26 | Implemented all 7 tasks via bmad-dev-story (Opus 4.8). Surface: `member_kyc_profiles` table + RLS + accessors + migration 0024; signup KYC contracts + OpenAPI paths; KYC routes/handlers/module + `server.ts` wiring (initiate/public-callback/confirm/manual/status); FR-58C manual-fallback seam; daily cert-refresh cron in `apps/jobs`; api-client KYC SDK + mobile `(signup)/kyc.tsx` + `kyc.*` i18n (HI+EN); unit + integration (:5433) + cron tests. **R6 variance:** relocated `refreshDigiLockerCerts` to `@twt/domain` (the recommended `apps/jobs`→`@twt/api` import would cycle the build graph). `pnpm ci:local` 18/18 green. Status → review. |
