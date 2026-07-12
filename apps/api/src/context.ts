// Application dependency-injection seam.
//
// `AppDeps` is the single bundle the Fastify factory (`buildServer`) is bound to.
// Production wires it from config + Secret Manager + Cloud KMS; tests wire it with
// fakes (fake KMS, in-memory clock, capturing audit sink) so the whole surface is
// integration-testable via `fastify.inject` without external services. This is the
// §1.1 per-workspace pool-isolation contract made concrete: the pool lives in
// AppDeps, never as a module-global.

import type pg from 'pg';

import type { ClaimDocumentStorage } from '@twt/contracts';
import type { BankIfscLookup } from '@twt/platform-adapters';
import type { Db, encryption } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';

import type { AuthAuditSink } from './audit/audit-sink.js';
import type { ApiConfig } from './config.js';
import type { StepUpOtpDeliveryPort } from './modules/auth/shared/step-up-delivery.js';
import type { TurnstileVerifier } from './modules/auth/shared/turnstile.js';
import type { WebAuthnProvider } from './modules/auth/shared/webauthn.js';
import type { KycProviderRegistry } from './modules/kyc/index.js';
import type { DeployTrigger } from './modules/pariwar-provisioning/deploy-trigger.js';
import type { NiyamavaliAmendedHook } from './modules/rules/notification-hook.js';
import type { ToneReviewAuditSink } from './modules/tone-review/index.js';

/**
 * The fixed namespace the admin-identity blind index + Tier-1 encryption context
 * key on. Admin identity is GLOBAL, not Pariwar-scoped (Reconciliation R2) — login
 * runs before any `app.pariwar_id` is set — but the encryption substrate's
 * `blindIndex`/`EncryptionContext` require a `pariwarId` namespace. We bind the
 * admin family to the nil-UUID sentinel so admin blind indexes are stable + never
 * collide with a real tenant's. Recorded in ADR-0009.
 */
export const ADMIN_GLOBAL_NAMESPACE = '00000000-0000-0000-0000-000000000000';

/** Field-class namespace for the admin email blind index (HMAC input prefix). */
export const ADMIN_EMAIL_FIELD_CLASS = 'admin_email';

/**
 * The fixed namespace the member mobile-number blind index + Tier-1 encryption
 * context key on (Story 3.2, Task 1 + Reconciliation R2). Member login runs BEFORE
 * `app.pariwar_id` is known — the person types a mobile and we don't yet know which
 * Pariwar(s) they belong to — so (mirroring the admin-email pattern) the mobile
 * blind index is computed under this fixed nil-style sentinel, NOT a real tenant.
 * It MUST be distinct from `ADMIN_GLOBAL_NAMESPACE` (…000) so a numeric admin email
 * and a mobile can never collide on the same blind index. Recorded in Completion Notes.
 */
export const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

/** Field-class namespace for the member mobile blind index (HMAC input prefix). */
export const MEMBER_MOBILE_FIELD_CLASS = 'member_mobile';

/**
 * Field-class namespace for the member KYC-profile Tier-1 envelope (Story 3.3b). Unlike
 * the admin-email / member-mobile families (which key on a fixed global sentinel because
 * their lookup runs pre-scope), the KYC profile is a TENANT table — its encryption context
 * keys on the member's REAL `pariwarId`. Matches the `piiColumn(…, 'member_kyc')` field-class
 * annotation on the `member_kyc_profiles` Tier-1 columns.
 */
export const MEMBER_KYC_FIELD_CLASS = 'member_kyc';

/**
 * Field-class namespace for the member NOMINEE Tier-1 envelope (Story 3.4). Like the KYC
 * profile (and unlike the admin-email / member-mobile families that key on a fixed global
 * sentinel because their lookup runs pre-scope), `member_nominees` is a TENANT table — its
 * encryption context keys on the member's REAL `pariwarId`. Matches the
 * `piiColumn(1, 'member_nominee')` field-class annotation on the name/mobile/address columns.
 */
export const MEMBER_NOMINEE_FIELD_CLASS = 'member_nominee';

/**
 * Field-class namespace for the member MEDICAL-disclosure Tier-1 envelope (Story 3.5). Like the
 * KYC profile + nominee families (and unlike the admin-email / member-mobile families that key on
 * a fixed global sentinel because their lookup runs pre-scope), `member_medical_disclosures` is a
 * TENANT table — its encryption context keys on the member's REAL `pariwarId`. Matches the
 * `piiColumn(1, 'member_medical')` field-class annotation on the disclosed-conditions /
 * additional-context columns.
 */
export const MEMBER_MEDICAL_FIELD_CLASS = 'member_medical';

/**
 * Field-class namespace for the member ADDRESS Tier-1 envelope (Story 3.9 Life Events). Like the
 * KYC / nominee / medical families (and unlike the admin-email / member-mobile families that key on
 * a fixed global sentinel because their lookup runs pre-scope), `member_addresses` is a TENANT table
 * — its encryption context keys on the member's REAL `pariwarId`. Matches the
 * `piiColumn(1, 'member_address')` field-class annotation on the address-line column.
 */
export const MEMBER_ADDRESS_FIELD_CLASS = 'member_address';

/**
 * Field-class namespace for the member WITHDRAWAL free-text-reason Tier-1 envelope (Story 3.10). Like
 * the KYC / nominee / medical / address families (and unlike the admin-email / member-mobile families
 * that key on a fixed global sentinel because their lookup runs pre-scope), `member_withdrawals` is a
 * TENANT table — its encryption context keys on the member's REAL `pariwarId`. Matches the
 * `piiColumn(1, 'member_withdrawal')` field-class annotation on the reason_text_ciphertext column.
 */
export const MEMBER_WITHDRAWAL_FIELD_CLASS = 'member_withdrawal';

/**
 * Field-class namespace for the member DATA-EXPORT artifact Tier-1 envelope (Story 3.11). Like the
 * KYC / nominee / medical / address / withdrawal families (and unlike the admin-email / member-mobile
 * families that key on a fixed global sentinel because their lookup runs pre-scope), `data_exports` is
 * a TENANT table — its encryption context keys on the member's REAL `pariwarId`. Matches the
 * `piiColumn(1, 'data_export')` field-class annotation on the artifact_ciphertext column.
 *
 * NOTE: this value is intentionally duplicated by the parallel constant in `apps/jobs/src/data-export.ts`
 * (the build worker envelope-encrypts the artifact). `apps/jobs` MUST NOT import from here — apps cannot
 * depend on apps. The two declarations are kept in sync BY VALUE.
 */
export const MEMBER_DATA_EXPORT_FIELD_CLASS = 'data_export';

/**
 * Field-class namespace for the push DEVICE-TOKEN Tier-1 envelope + blind index (Story 5.2). Device tokens
 * are Tier-1 PII (architecture §3.4 L1937). Unlike the admin-email / member-mobile families (fixed global
 * sentinel because their lookup runs pre-scope), `member_device_tokens` is a TENANT table — its encryption
 * context keys on the owning principal's `pariwar_id` (a member's REAL Pariwar; for an ADMIN principal, the
 * `ADMIN_GLOBAL_NAMESPACE` nil-UUID sentinel, matching the admin-identity family). The write (registration
 * route) + the read (delivery resolver) MUST bind the SAME (pariwarId, fieldClass) — a mismatched context
 * throws at decrypt time rather than silently succeeding. Matches the `piiColumn(1, 'member_device_token')`
 * annotation on the `token_ciphertext` column + the `blindIndex('member_device_token', …)` on the token.
 */
export const MEMBER_DEVICE_TOKEN_FIELD_CLASS = 'member_device_token';

/**
 * The ground-inspection Tier-1 field class (Story 6.7). The admin route encrypts the assignment's
 * PII — the exact location/site detail (`location_ciphertext`), the family contact
 * (`family_contact_ciphertext`), the free-text findings / mandatory refusal note (`notes_ciphertext`),
 * and each photo's caption (`caption_ciphertext`) — before insert, and the read route decrypts under
 * the SAME (pariwarId, fieldClass). Matches the `piiColumn(1, 'ground_inspection')` column annotation.
 */
export const CLAIM_GROUND_INSPECTION_FIELD_CLASS = 'ground_inspection';

/**
 * The claim-nominee-bank Tier-1 field class (Story 6.8, D6). The member + helpline nominee-bank
 * routes encrypt each account's `account_holder_name`, `account_number`, and `ifsc` before insert,
 * and any read consumer decrypts under the SAME (pariwarId, fieldClass). Matches the
 * `piiColumn(1, 'claim_nominee_bank')` column annotation. `bank_name` / `branch` are Tier-3
 * plaintext (public, IFSC-derived) and are NOT encrypted.
 */
export const CLAIM_NOMINEE_BANK_FIELD_CLASS = 'claim_nominee_bank';

/**
 * The verifier-decision Tier-1 field class (Story 6.11, D-G). The adjudication route encrypts the brief
 * verifier rationale free-text (`rationale_ciphertext`) before the domain writer, and the verifier
 * console (the authorized READ) decrypts it under the SAME (pariwarId, fieldClass). Arbitrary verifier
 * free-text is PII-capable (it can reference member facts). Matches the `piiColumn(1, 'verifier_decision')`
 * column annotation on `claim_verifier_decisions`. NEVER in an event payload / audit line / index / filter.
 */
export const CLAIM_VERIFIER_DECISION_FIELD_CLASS = 'verifier_decision';

/**
 * The claim-document Tier-1 field class (Story 6.5). The OCR-parity job encrypts the extracted
 * death-certificate identity fields (`deceased_name_ciphertext`, `dob_ciphertext`,
 * `date_of_death_ciphertext`, `issuing_authority_ciphertext`, `certificate_number_ciphertext`)
 * before upsert; the Story 6.10 verifier console is the first READ consumer to decrypt them for
 * the authorized verifier's side-by-side parity view, under the SAME (pariwarId, fieldClass).
 * Matches the `piiColumn(1, 'claim_document')` column annotation on `claim_documents`.
 */
export const CLAIM_DOCUMENT_FIELD_CLASS = 'claim_document';

/**
 * The data-export build-job producer seam (Story 3.11). The API is the FIRST request-path queue
 * producer: it enqueues a `DATA_EXPORT_BUILD` job (send-only — the API produces, apps/jobs consumes;
 * NEVER `boss.work()`). Injectable like `auditSink` / `deployTrigger`: production wires a pg-boss-backed
 * enqueuer (deps.ts); tests inject a capturing fake. `close` (optional) drains the send-only client on
 * shutdown.
 */
export interface DataExportEnqueuer {
  enqueueBuild(envelope: JobEnvelope<{ exportId: string }>): Promise<void>;
  close?(): Promise<void>;
}

/**
 * The claim-document OCR + parity job producer seam (Story 6.5). The upload endpoint stores
 * the bytes in `claimDocumentStorage` and enqueues a `CLAIM_OCR_PARITY` job here (send-only —
 * the API produces, apps/jobs consumes; NEVER `boss.work()`). Injectable like `dataExportQueue`:
 * production wires a pg-boss-backed enqueuer; tests inject a capturing fake. The payload is the
 * NON-PII job metadata (structurally aligned with apps/jobs `ClaimOcrParityPayload` — apps
 * cannot depend on apps).
 */
export interface ClaimOcrParityJobPayload {
  claimDocumentId: string;
  claimCaseId: string;
  deceasedMemberId: string;
  documentType: string;
  storageObjectKey: string;
  contentType: string;
  byteSize: number;
}

export interface ClaimOcrParityEnqueuer {
  enqueue(envelope: JobEnvelope<ClaimOcrParityJobPayload>): Promise<void>;
  close?(): Promise<void>;
}

/** Envelope-encryption + blind-index key material for the admin-identity family. */
export interface EncryptionDeps {
  readonly kms: encryption.KmsProvider;
  readonly kekRef: encryption.KmsKeyRef;
  readonly hmacKeyRef: encryption.KmsKeyRef;
}

/**
 * Asymmetric keypair the member ACCESS token + signup-continuation JWTs are
 * signed/verified with (Story 3.2, Task 3 — §2.4 algorithm pinning line 1447:
 * asymmetric ES256/RS256 ONLY; `none` + symmetric rejected). The private key is
 * resolved via Secret Manager in prod (mirror the pepper path); dev/test/CI
 * generate an ephemeral ES256 keypair. The public key is derived from the private
 * key, never configured separately. Refresh tokens are NOT JWTs (opaque + hashed,
 * `member_refresh_tokens`) — only the short-lived access + continuation tokens.
 */
export interface MemberJwtKeys {
  readonly algorithm: 'ES256' | 'RS256';
  readonly privateKeyPem: string;
  readonly publicKeyPem: string;
}

export interface AppDeps {
  readonly config: ApiConfig;
  /** Drizzle handle bound to `pool` (§1.1 — per-workspace pool). */
  readonly db: Db;
  /** The node-postgres pool the session store + scope tx check out clients from. */
  readonly pool: pg.Pool;
  /**
   * The BYPASSRLS service-role pool for the audit-log writer (DD-3 / Story 1.10).
   * In production this is a SEPARATE pool bound to the `twt_service`-login
   * connection string (SERVICE_DATABASE_URL, from Secret Manager) so the
   * hash-chain writer can read the global tail across tenants; in dev/CI it
   * reuses `pool` (the superuser login already bypasses RLS). The audit sink +
   * KMS audit hook write through this pool, never the request's app pool.
   */
  readonly servicePool: pg.Pool;
  /**
   * Drizzle handle bound to `servicePool` (BYPASSRLS). Used for the rare PRE-SCOPE
   * cross-tenant domain-accessor read — e.g. Story 3.2's `getMemberStateAt` on a
   * member resolved by mobile BEFORE `app.pariwar_id` is set (the admin-session.handler
   * servicePool posture, R2). In dev/CI it equals `db` (the superuser bypasses RLS).
   */
  readonly serviceDb: Db;
  readonly encryption: EncryptionDeps;
  /** Resolved Argon2id pepper (Secret Manager in prod; env fallback in local dev). */
  readonly pepper: Buffer;
  readonly auditSink: AuthAuditSink;
  /**
   * Dedicated tone-review audit seam (Story 2.2). Records `tone_review.signoff` +
   * `tone_review.publish_blocked` through the Story 1.10 hash-chain writer — a SIBLING
   * of `auditSink`, deliberately NOT the auth-typed `AuthAuditSink` (tone-review is not
   * a security event; the auth taxonomy's SecurityAuditEventType rename is deferred).
   * Production wires the real `writeAuditEntry`-backed sink; tests inject a capturing fake.
   */
  readonly toneReviewAuditSink: ToneReviewAuditSink;
  /**
   * MEMBER step-up / login OTP delivery (Story 5.9). Env-gated: the REAL SMS-DLT adapter in prod
   * (`createSmsDltStepUpDelivery`), the reveal/log stub in dev/CI. Consumed by the two member call sites
   * (login-OTP send + step-up-request) ONLY — split from `adminStepUpDelivery` so wiring the real SMS
   * adapter in prod never routes the ADMIN call site (which has no mobile to resolve) through it.
   */
  readonly stepUpDelivery: StepUpOtpDeliveryPort;
  /**
   * ADMIN step-up OTP delivery (Story 5.9, R4). ALWAYS the reveal/log stub in every environment — admin
   * OTP-over-SMS is DEFERRED pending an admin-mobile substrate (admins carry email only, no mobile column).
   * A SEPARATE key from `stepUpDelivery` so the member env-gate can select the real SMS adapter without ever
   * constructing the admin call site with it.
   */
  readonly adminStepUpDelivery: StepUpOtpDeliveryPort;
  /**
   * Member access-token + signup-continuation JWT signing keypair (Story 3.2,
   * §2.4). Asymmetric (ES256/RS256). Resolved from Secret Manager in prod; an
   * ephemeral ES256 keypair in dev/test/CI. The `plugins/jwt` plugin registers
   * `@fastify/jwt` from this; the member-session guard verifies access tokens with it.
   */
  readonly memberJwt: MemberJwtKeys;
  readonly turnstile: TurnstileVerifier;
  /** WebAuthn ceremony provider (SimpleWebAuthn in prod; a fake in tests). */
  readonly webauthn: WebAuthnProvider;
  /**
   * Deploy seam (Story 1.15, AC-3) — env-resolved: the in-memory fake in dev/test/CI,
   * the live Dokploy-API client in staging/prod. Same seam pattern as `auditSink` /
   * `turnstile`.
   */
  readonly deployTrigger: DeployTrigger;
  /**
   * Member-notification scaffolding hook (Story 2.4, AC3) — fired on a successful
   * Niyamavali publish. A placeholder seam at 2.4 (console in prod/dev, a capturing
   * fake in tests); Epic 5 wires the real `niyamavali.amended` push fan-out. Same
   * injectable-seam pattern as `deployTrigger` / `toneReviewAuditSink`.
   */
  readonly niyamavaliAmendedHook: NiyamavaliAmendedHook;
  /**
   * KYC provider registry + FR-58C swap seam (Story 3.3a, AC2/AC6). The active provider
   * is DigiLocker when its secret-NAMEs are configured, else the `fixtureKycProvider`
   * (the Turnstile optional-seam pattern — the stack boots with ZERO live-govt config and
   * CI never calls the real DigiLocker API). NO route consumes it in 3.3a (PRIMITIVE);
   * the 3.3b signup route resolves a provider via `getActiveKycProvider(ctx)`.
   */
  readonly kycProviders: KycProviderRegistry;
  /**
   * Data-export build-job producer (Story 3.11) — the FIRST api-side queue producer (send-only). A
   * pg-boss-backed enqueuer in prod/dev; a capturing fake in tests. The request handler enqueues a
   * `DATA_EXPORT_BUILD` job here after inserting the `pending` row.
   */
  readonly dataExportQueue: DataExportEnqueuer;
  /**
   * Claim-document object store (Story 6.5, Decision D1) — the upload endpoint `put`s the
   * death-cert bytes here and `<DocumentPreview>` mints signed read URLs. The live GCS adapter
   * (`asia-south1`) when `CLAIM_DOCUMENT_BUCKET` is set; an in-memory fake in dev/CI + tests.
   */
  readonly claimDocumentStorage: ClaimDocumentStorage;
  /**
   * Claim-document OCR + parity job producer (Story 6.5) — the upload endpoint enqueues a
   * `CLAIM_OCR_PARITY` job here after storing the bytes. A pg-boss-backed enqueuer in prod/dev;
   * a capturing fake in tests.
   */
  readonly claimOcrParityQueue: ClaimOcrParityEnqueuer;
  /**
   * IFSC bank-lookup port (Story 6.8, D4) — the nominee-bank routes format-validate + resolve an
   * IFSC to its public `{ bankName, branch }` (cache-first) before persisting an account. The
   * in-memory stub in dev/CI + tests; a real-vendor adapter is a future seam (no CI boundary gate
   * yet — the 6.5 `OcrProvider` posture). Same injectable-seam pattern as `claimDocumentStorage`.
   */
  readonly bankIfscLookup: BankIfscLookup;
  /**
   * Channel Secret-Manager resolver (Story 5.4) — resolves a per-Pariwar Secret-Manager NAME (a pointer) to
   * its VALUE for the WhatsApp inbound-webhook signature/challenge (the app secret + the verify token). The
   * NAME comes from `pariwar_wa_config`; the resolved value NEVER leaves the handler (AI-4-3(c)). Prod wires
   * `resolveSecretValue`; tests inject a deterministic fake so the webhook signature round-trip is testable
   * without Secret Manager. Same injectable-seam pattern as `deployTrigger` / `turnstile`.
   */
  readonly resolveChannelSecret: (secretName: string) => Promise<string>;
  /** Injectable clock — tests freeze it to assert TTL / lockout / window expiry. */
  readonly clock: () => Date;
}
