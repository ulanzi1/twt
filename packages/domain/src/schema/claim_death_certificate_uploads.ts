// `claim_death_certificate_uploads` — EVERY uploaded death certificate, each kept (Story 6.21a, Task 1;
// D2; AC3).
//
// `2026-09-25-243` (option C, Trustee-ratified): *"death certificates are not valid identity documents"* —
// so `-240` cl.1's closure-time deletion does ⛔ not reach them, and EVERY certificate (accepted, turned
// back, and any sent after) is kept for as long as claim records are kept. BigDev 2026-09-25: *"keep both
// the certificates old one and new one, or even any certificate produced thereafter"*.
//
// ── Why a table, and why the key changed ─────────────────────────────────────────────────────────
// `claim_documents` holds ONE row per (claim, document_type) — the CURRENT certificate and its OCR
// reading. Before 6.21a a re-upload reused that row's id in the object key and so OVERWROTE the previous
// certificate's bytes (T1). The upload handler now mints an `upload_id` per death-certificate upload and
// writes the object at `…/death_certificate/{claimDocumentId}/{uploadId}`; this table records each one.
//
// ── Current certificate (D2) ─────────────────────────────────────────────────────────────────────
// The upload whose `storage_object_key` equals `claim_documents.storage_object_key` (the unique index on
// the key makes that exact). The OCR job moves the row's key FORWARD ONLY (by `uploaded_at`), under the
// claim-row lock (T2), so a retried or delayed job for an OLDER upload can ⛔ never make it current again.
//
// ── One writer (invariant 5) ─────────────────────────────────────────────────────────────────────
// The OCR job, `runClaimOcrParity`, in the same transaction as its `claim_documents` upsert — INSERT only,
// `ON CONFLICT (upload_id) DO NOTHING`. ⛔ Never the upload handler (T2's first-upload race: two handlers
// mint different ids, the upsert keeps the first, so the FK must come from the upsert's `RETURNING`).
// The ONE exception is test-only: `seedDeathCertificate` (tests/integration/_helpers.ts).
//
// ── The parity VERDICT, per upload (`2026-09-26-245` §1, migration 0123) ─────────────────────────
// The outcome, flags and confidence the OCR job gave THIS certificate — written once at insert, so a
// replacement ⛔ never erases the verdict a verifier saw on the certificate it replaced. NULL (all three) on
// a row written before 0123.
//
// ⛔ No PII column (the OCR TEXT stays on `claim_documents` — the current certificate's; it is re-derivable
// from the kept object). ⛔ No UPDATE, ⛔ no DELETE: the 0122 grants
// and an append-only trigger for every role (only an `ON DELETE cascade` passes).

import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type {
  ClaimDocumentId,
  ClaimId,
  DeathCertificateUploadId,
  MemberId,
  PariwarId,
} from '../ids/index.js';
import { claimDocumentParityOutcomeEnum, claimDocuments } from './claim_documents.js';
import { claims } from './claims.js';

/** Which surface the certificate came through (the two upload routes).
 * ⚠ LOCKSTEP with the migration's `channel` CHECK (`0122_death-certificate-clear-date-rule.sql`) and
 * `@twt/contracts`'s `DeathCertificateHistoryUpload.channel` z.enum — contracts ⛔ never imports `@twt/domain`
 * (a turbo cycle), so this literal set is re-declared in three places; keep them in lockstep by hand. */
export const DEATH_CERTIFICATE_UPLOAD_CHANNELS = ['member_app', 'helpline'] as const;
export type DeathCertificateUploadChannel = (typeof DEATH_CERTIFICATE_UPLOAD_CHANNELS)[number];

export const claimDeathCertificateUploads = pgTable(
  'claim_death_certificate_uploads',
  {
    // Minted by the upload handler; it names the upload's OWN storage object.
    uploadId: uuid('upload_id').primaryKey().$type<DeathCertificateUploadId>(),

    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The deceased member (the `claims.deceased_member_id` cache — ⛔ no FK, like `claims`).
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The `claim_documents` row this upload belongs to — taken from the job's upsert `RETURNING`, ⛔ never
    // from the payload (T2).
    claimDocumentId: uuid('claim_document_id')
      .notNull()
      .$type<ClaimDocumentId>()
      .references(() => claimDocuments.claimDocumentId, { onDelete: 'cascade' }),

    // The object key (non-PII opaque path). Unique: each upload has its own object.
    storageObjectKey: text('storage_object_key').notNull(),
    contentType: text('content_type').notNull(),
    byteSize: integer('byte_size').notNull(),

    channel: text('channel').notNull().$type<DeathCertificateUploadChannel>(),

    // The job envelope's `actorId` — NULLABLE (`JobEnvelope.actorId` is `string | null`).
    uploadedByActorId: text('uploaded_by_actor_id'),

    // The HANDLER's clock (⛔ not the job's): it orders "current" forward-only (D2).
    uploadedAt: timestamp('uploaded_at', { withTimezone: true, mode: 'date' }).notNull(),

    // `2026-09-26-245` §1 (0123) — this upload's parity verdict, ⛔ no PII. All three or none (a CHECK).
    parityOutcome: claimDocumentParityOutcomeEnum('parity_outcome'),
    parityFlags: jsonb('parity_flags'),
    ocrConfidence: doublePrecision('ocr_confidence'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('claim_death_certificate_uploads_pariwar_id_idx').on(t.pariwarId),
    index('claim_death_certificate_uploads_claim_case_id_idx').on(t.claimCaseId, t.uploadedAt),
    index('claim_death_certificate_uploads_claim_document_id_idx').on(t.claimDocumentId),
    uniqueIndex('claim_death_certificate_uploads_storage_object_key_uq').on(t.storageObjectKey),
  ],
);

export type ClaimDeathCertificateUploadRow = typeof claimDeathCertificateUploads.$inferSelect;
export type ClaimDeathCertificateUploadInsert = typeof claimDeathCertificateUploads.$inferInsert;
