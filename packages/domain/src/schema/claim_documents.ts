// `claim_documents` — the claim-document OCR + parity metadata table (Story 6.5, Task 2).
//
// The FIRST consumer of object storage in the stack (Decision D1). A death certificate is a
// multi-MB PDF/scan; the KYC base64-in-Postgres path does not scale to it, so the BYTES live
// in Google Cloud Storage (`ClaimDocumentStorage` port) and THIS table persists only:
//   · the opaque GCS object key (non-PII; namespaced by pariwar/claim),
//   · the extracted identity fields as Tier-1 envelope ciphertext (PII),
//   · the NON-PII parity outcome + per-field flags + confidence + the verifier-review flag.
// NEVER the document bytes, NEVER a plaintext extracted field.
//
// TENANT-ISOLATED (mirrors `member_kyc_profiles` / `claims`): a claim document belongs to
// exactly one claim in exactly one Pariwar. RLS in policies/claim-documents-rls.ts.
//
// ── PII discipline (AR-12 / Story 1.5 / 1.16b gate) ───────────────────────────────────
//   · deceased name / DoB / date-of-death / issuing authority / certificate number →
//     Tier-1 envelope ciphertext (`piiColumn(1, 'claim_document')`). NEVER logged / echoed.
//     Encryption is APP-LAYER (the route/job encrypts before insert; the accessor returns
//     ciphertext AS STORED — the `member_kyc_profiles` / `kyc-crypto` precedent).
//   · parity_outcome / parity_flags / ocr_confidence / verifier_review_required → NON-PII
//     metadata (safe to surface to the verifier console).
//
// ── One writer, one row per (claim, document_type) ────────────────────────────────────
// The OCR parity job (apps/jobs) is the SOLE writer (keeps encryption + persistence in one
// place). Idempotency (AC4): a UNIQUE index on (claim_case_id, document_type) makes a retried
// OCR job upsert the SAME row rather than accumulating duplicates.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase, table
// snake_case-plural. Header style mirrors member_kyc_profiles.ts.

import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimDocumentId, ClaimId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

/**
 * The uploaded document's type — drives OCR parser selection (AC3). v1 ships the
 * `death_certificate` parser only; the other labels exist so 6.7 (ground-inspection photo)
 * and later doc types plug in without a schema migration. Value-aligned with the contracts
 * `OcrDocumentType` enum. The ONE spelling authority → the pgEnum + the TS union both derive.
 */
export const CLAIM_DOCUMENT_TYPES = [
  'death_certificate',
  'ground_inspection_photo',
  'hospital_record',
] as const;
export const claimDocumentTypeEnum = pgEnum('claim_document_type', CLAIM_DOCUMENT_TYPES);
export type ClaimDocumentType = (typeof CLAIM_DOCUMENT_TYPES)[number];

/**
 * The parity verdict (AC2) — a NON-PII metadata outcome. `match`: OCR agrees with the member
 * record; `mismatch`: a discrepancy beyond tolerance (flags a human review — 6.5 NEVER
 * auto-rejects); `ambiguous`: OCR failed / low confidence / no comparison source (AR-61 →
 * manual review). Value-aligned with the contracts `ClaimDocumentParityOutcome`.
 */
export const CLAIM_DOCUMENT_PARITY_OUTCOMES = ['match', 'mismatch', 'ambiguous'] as const;
export const claimDocumentParityOutcomeEnum = pgEnum(
  'claim_document_parity_outcome',
  CLAIM_DOCUMENT_PARITY_OUTCOMES,
);
export type ClaimDocumentParityOutcome = (typeof CLAIM_DOCUMENT_PARITY_OUTCOMES)[number];

export const claimDocuments = pgTable(
  'claim_documents',
  {
    // Per-row address + the caller-facing upload handle (the GCS object key is NEVER exposed
    // to the client — this id is). Caller-supplied (the upload endpoint mints it); branded.
    claimDocumentId: uuid('claim_document_id').primaryKey().$type<ClaimDocumentId>(),

    // The claim this document is filed against (FK → claims; branded ClaimId == the
    // events_log stream_id). ON DELETE CASCADE mirrors member_kyc_profiles' member FK.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The document type — drives parser selection (AC3). v1: death_certificate.
    documentType: claimDocumentTypeEnum('document_type').notNull(),

    // The GCS object key (non-PII opaque path, namespaced by pariwar/claim). NOT the bytes.
    // Access is a short-lived signed URL minted from this key (Decision D1) — never public.
    storageObjectKey: text('storage_object_key').notNull(),

    // Non-PII object metadata.
    contentType: text('content_type').notNull(),
    byteSize: integer('byte_size').notNull(),

    // ── Extracted identity fields — Tier-1 envelope ciphertext (PII) ─────────────────
    // NULLABLE: an OCR failure / ambiguous parse persists the row with null fields + an
    // `ambiguous` outcome (AC6 — non-blocking). NEVER logged / echoed.
    deceasedNameCiphertext: piiColumn(1, 'claim_document')('deceased_name_ciphertext'),
    dobCiphertext: piiColumn(1, 'claim_document')('dob_ciphertext'),
    dateOfDeathCiphertext: piiColumn(1, 'claim_document')('date_of_death_ciphertext'),
    issuingAuthorityCiphertext: piiColumn(1, 'claim_document')('issuing_authority_ciphertext'),
    certificateNumberCiphertext: piiColumn(1, 'claim_document')('certificate_number_ciphertext'),

    // ── Parity metadata (NON-PII — safe for the verifier console) ────────────────────
    parityOutcome: claimDocumentParityOutcomeEnum('parity_outcome').notNull(),

    // Per-field mismatch reasons (non-PII flags — e.g. { name: 'beyond_tolerance', dob:
    // 'mismatch' }). A JSONB object, never the compared plaintext values.
    parityFlags: jsonb('parity_flags').notNull(),

    // The OCR confidence score in [0,1] (double precision — the provider's `confidence`).
    ocrConfidence: doublePrecision('ocr_confidence').notNull(),

    // Set on any mismatch OR ambiguous outcome — the verifier (6.10/6.11) makes the final
    // call. 6.5 NEVER auto-rejects (AC5/AC6).
    verifierReviewRequired: boolean('verifier_review_required').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_documents_pariwar_id_idx').on(t.pariwarId),
    // The verifier read model + the job's idempotency upsert filter by claim.
    index('claim_documents_claim_case_id_idx').on(t.claimCaseId),
    // Idempotency (AC4): one document row per (claim, document_type). A retried OCR job
    // upserts THIS row rather than accumulating a duplicate.
    unique('claim_documents_claim_case_id_document_type_uq').on(t.claimCaseId, t.documentType),
  ],
);

export type ClaimDocumentRow = typeof claimDocuments.$inferSelect;
export type ClaimDocumentInsert = typeof claimDocuments.$inferInsert;
