// Death-certificate OCR + parity background job — Story 6.5 (Task 4; AC1/AC4/AC5/AC6).
//
// A Class-B (request-triggered) pg-boss worker. The API upload endpoint stores the document
// bytes in object storage and enqueues CLAIM_OCR_PARITY with the object KEY (never the bytes
// — a multi-MB payload does not belong in the Postgres-backed queue; Decision D1). This
// worker:
//   1. fetches the bytes from `ClaimDocumentStorage` by key,
//   2. runs the injected `OcrProvider` (v1 deterministic — Decision D3) → normalizes,
//   3. reads + DECRYPTS the deceased member's KYC record (name/DoB) and evaluates parity,
//   4. encrypts the extracted Tier-1 fields + upserts ONE `claim_documents` row per
//      (claim, document_type),
//   5. advances the claim `intake_converged → documents_pending` by appending
//      `claim.documents_received` via `claim.projectClaimState` — idempotently.
//
// ── Idempotency (AC4 — load-bearing) ──────────────────────────────────────────────────
// The doc row upserts on the `(claim_case_id, document_type)` unique index (one row, retried
// or not). The event append is SKIPPED once the claim is already `documents_pending` (read
// current_state first). A benign `(stream_id, event_version)` race with another writer
// (ClaimStreamConcurrencyError, SQLSTATE 23505) is caught + rolled back to a SAVEPOINT so the
// doc-row upsert in the same tx still commits (memory: raw SAVEPOINT — a 23505 poisons the
// whole tx otherwise).
//
// ── Non-blocking failure (AC6 / AR-61) ────────────────────────────────────────────────
// An OCR provider/parse/fetch failure NEVER fails the claim: it persists an `ambiguous`
// outcome + `verifier_review_required`, still advances to `documents_pending`, and writes a
// best-effort audit line. A low-confidence parse is likewise forced to `ambiguous`.
//
// ── Story 6.21a (D2, T1, T2) — EVERY death certificate is kept, and "current" only moves FORWARD ──
// `2026-09-25-243` (option C): every certificate is kept for as long as claim records are kept. The
// upload handler now mints an `uploadId` per death-certificate upload and writes the object at
// `…/death_certificate/{claimDocumentId}/{uploadId}` — its OWN object, so a replacement ⛔ never
// overwrites the certificate it replaces (T1). For such a payload this job, in ONE transaction:
//   1. `SELECT … FOR UPDATE` the claim row — serialising it with the District Admin's review writer
//      (which locks the same row first), so a review and a job commit never interleave;
//   2. moves `claim_documents` FORWARD ONLY: it upserts (key + OCR reading) only if there is no current
//      upload, or this upload's `uploaded_at` (the HANDLER's clock) is ≥ the current one's. A retried or
//      delayed job for an OLDER upload therefore ⛔ never makes it current again, and ⛔ never revives its
//      rejected review (T2). Otherwise the upload is KEPT (its row is written) but ⛔ not made current;
//   3. inserts the upload row (`ON CONFLICT (upload_id) DO NOTHING` — a retry writes exactly one), with its
//      `claim_document_id` from the upsert's `RETURNING`, ⛔ never from the payload (two handlers racing a
//      FIRST upload mint different ids; the upsert keeps the first).
// ⭐ The SOLE writer of `claim_death_certificate_uploads` (invariant 5). A REPLACEMENT in the review window
// appends ⛔ no `documents_received` (it only fires from `intake_converged`) and enqueues ⛔ no peer-mesh
// select (AC3: ⛔ no new selection, ⛔ no new event).
// ⚠ TOLERANCE: a payload with ⛔ no `uploadId` (enqueued before this deploy) writes ⛔ no upload row and keeps
// the pre-6.21a behaviour — overwrite included (T12 then applies to its row). Other document types are
// ⛔ unchanged.
// ⚠ A job that fails PERMANENTLY (DLQ) leaves an object with ⛔ no row — the pre-existing 6.5 class
// ("OCR job DB failure retries indefinitely"), which now also strands a REPLACEMENT. Annotated, ⛔ not fixed.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// Extracted identity fields are Tier-1 (`claim_document` field-class) — encrypted app-side
// before insert, NEVER logged. The audit line + logs carry only NON-PII metadata (outcome,
// confidence, ids). apps/jobs cannot import apps/api, so the `member_kyc` field-class + the
// decrypt helper are BY-VALUE parallels of apps/api (the data-export / WA-processor precedent).

import crypto from 'node:crypto';

import type {
  ClaimDocumentStorage,
  DeathCertificateFields,
  OcrProvider,
} from '@twt/contracts';
import { OcrProviderError } from '@twt/contracts';
import {
  audit,
  claim,
  encryption,
  ids,
  kyc,
  schema,
  withPariwarScope,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import { and, eq } from 'drizzle-orm';

/**
 * Field-class for the deceased member's KYC Tier-1 envelope. Duplicated BY VALUE from
 * apps/api/src/context.ts:MEMBER_KYC_FIELD_CLASS (apps cannot depend on apps) — the same
 * literal the api KYC route encrypts under. Matches `piiColumn(1, 'member_kyc')`.
 */
const MEMBER_KYC_FIELD_CLASS = 'member_kyc';

/**
 * Field-class for the claim-document extracted-field Tier-1 envelope. Matches
 * `piiColumn(1, 'claim_document')` on `claim_documents`.
 */
const CLAIM_DOCUMENT_FIELD_CLASS = 'claim_document';

/**
 * Below this OCR confidence a parse is forced to `ambiguous` → manual review (AC6). Provisional
 * operational default (not policy-derived); the empty-parse (confidence 0) is already ambiguous
 * via `evaluateParity` (unreadable), so this bites a readable-but-low-confidence vendor result.
 */
export const OCR_CONFIDENCE_THRESHOLD = 0.5;

const EMPTY_OCR_FIELDS: DeathCertificateFields = {
  deceasedName: null,
  dateOfBirth: null,
  dateOfDeath: null,
  issuingAuthority: null,
  certificateNumber: null,
  certificateIssueDate: null,
};

export interface ClaimOcrParityDeps {
  /** The domain-table pool. In prod the service login (BYPASSRLS); withPariwarScope sets scope. */
  readonly pool: import('pg').Pool;
  /** The object store the API `put` the bytes into (GCS in prod; in-memory fake in tests). */
  readonly storage: ClaimDocumentStorage;
  /** The OCR provider (v1 deterministic — Decision D3; a controllable double in tests). */
  readonly ocr: OcrProvider;
  /** KMS provider + the app KEK (member/claim-document Tier-1 envelopes wrap under it). */
  readonly kms: encryption.KmsProvider;
  readonly kekRef: encryption.KmsKeyRef;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
  /**
   * Story 6.6 trigger seam: enqueue the peer-mesh SELECT job after the claim reaches
   * `documents_pending` (the "auto-ping 5 nearest" trigger, epics.md:2260). Optional — when
   * unset (e.g. the OCR-only unit/integration tests) no peer-mesh job is enqueued. Wired in
   * boot.ts to `boss.send(CLAIM_PEER_MESH_SELECT, …, { singletonKey: claim_case_id })` so a
   * re-run of the OCR job does not double-select. Best-effort: a failure here NEVER fails the
   * OCR job (the document row + documents_received event already committed).
   */
  readonly enqueuePeerMeshSelect?: (input: {
    claimCaseId: string;
    deceasedMemberId: string;
    pariwarId: string;
    actorId: string | null;
    traceId: string;
  }) => Promise<void>;
}

/** The job payload (wrapped in a JobEnvelope by the API producer). All fields NON-PII.
 *  ⚠ DECLARED TWICE — `ClaimOcrParityJobPayload` in `apps/api/src/context.ts` is its producer-side twin
 *  (apps cannot import apps). Keep the two in lockstep. */
export interface ClaimOcrParityPayload {
  readonly claimDocumentId: string;
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly documentType: schema.ClaimDocumentType;
  readonly storageObjectKey: string;
  readonly contentType: string;
  readonly byteSize: number;
  /** Story 6.21a (D2) — `death_certificate` only: the upload the handler minted (its own object). ABSENT on
   *  a payload enqueued before 6.21a — the tolerance path. */
  readonly uploadId?: string;
  /** Story 6.21a (D2) — the HANDLER's clock (ISO-8601), ⛔ not the job's: it orders "current" forward-only. */
  readonly uploadedAt?: string;
  /** Story 6.21a (D2) — which upload route the certificate came through. */
  readonly channel?: schema.DeathCertificateUploadChannel;
}

/** SHA-256 hex of a NON-PII context object — the audit `requestPayloadHash` (never the payload). */
function contextHash(context: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

/**
 * The OCR + parity worker body. Drive it in isolation with a fake storage/OCR/KMS + a
 * controlled clock. Returns the parity outcome + the document id. NEVER throws for an OCR
 * failure (AC6) — it persists `ambiguous` + advances. It DOES throw on an unrecoverable
 * infrastructure error (e.g. the claim row is missing) so pg-boss retries.
 */
export async function runClaimOcrParity(
  deps: ClaimOcrParityDeps,
  envelope: JobEnvelope<ClaimOcrParityPayload>,
): Promise<{ outcome: claim.ParityOutcome; claimDocumentId: string }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const { pariwarId, actorId, traceId } = envelope;
  const p = envelope.payload;

  if (!pariwarId) {
    // Cannot scope a DB write without pariwarId — the enqueueing handler always sets it from
    // the authenticated session, so this is an invariant violation, not an OCR/parse failure.
    // THROW (not the AC6 ambiguous-and-advance path) so pg-boss retries/DLQs it instead of
    // silently dropping the document with no row ever written.
    alarm(`[jobs] claim-ocr-parity: missing pariwarId for document ${p.claimDocumentId}`);
    throw new Error(`[jobs] claim-ocr-parity: missing pariwarId for document ${p.claimDocumentId}`);
  }

  const brandedPariwarId = ids.pariwarId(pariwarId);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const claimDocumentId = ids.claimDocumentId(p.claimDocumentId);
  const deceasedMemberId = ids.memberId(p.deceasedMemberId);

  // ── (1) Fetch bytes + run OCR. NON-BLOCKING: any failure → empty fields + confidence 0
  //        (→ ambiguous at the parity step). Never let a provider/fetch error fail the claim.
  let ocrFields: DeathCertificateFields = EMPTY_OCR_FIELDS;
  let confidence = 0;
  try {
    const bytes = await deps.storage.getBytes(p.storageObjectKey);
    const result = await deps.ocr.extract({
      documentType: p.documentType,
      bytes,
      contentType: p.contentType,
    });
    ocrFields = result.fields;
    confidence = result.confidence;
  } catch (err) {
    if (OcrProviderError.is(err)) {
      alarm(`[jobs] claim-ocr-parity: OCR provider '${err.code}' for document ${claimDocumentId} → ambiguous`);
    } else {
      const e = err as Error & { code?: string };
      alarm(
        `[jobs] claim-ocr-parity: OCR/fetch failure for document ${claimDocumentId} → ambiguous — ` +
          `${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
      );
    }
    // ocrFields/confidence stay empty → ambiguous.
  }

  const normalized = claim.normalizeOcrFields(ocrFields);

  // ── (2) One scope-tx: decrypt member record → evaluate parity → encrypt + upsert row →
  //        advance the claim state idempotently.
  let finalOutcome: claim.ParityOutcome = 'ambiguous';
  let replacementInReviewWindow = false;
  await withPariwarScope(deps.pool, pariwarId, async (db, client) => {
    // Read + decrypt the deceased member's KYC record (plaintext handed to the pure parity fn).
    const profile = await kyc.getMemberKycProfile(db, brandedPariwarId, deceasedMemberId);
    let memberName: string | null = null;
    let memberDob: string | null = null;
    if (profile) {
      memberName = await decryptTier1Field(profile.nameCiphertext, pariwarId, deps, MEMBER_KYC_FIELD_CLASS);
      memberDob = await decryptTier1Field(profile.dobCiphertext, pariwarId, deps, MEMBER_KYC_FIELD_CLASS);
    }

    // `joinedAt` is deliberately NOT passed here — `evaluateParity`'s `death_before_member_joined`
    // rule stays INACTIVE in production. `members.createdAt` records row creation, not a
    // canonical membership-start fact (imported/backdated members would false-flag), and no
    // trustworthy membership-start/eligibility timestamp exists yet. Wire it once the member
    // lifecycle exposes one (see the domain member-lifecycle substrate) — do not approximate
    // with `createdAt` just to make this branch execute (review finding, 2026-07-09).
    let parity = claim.evaluateParity(normalized, { name: memberName, dateOfBirth: memberDob }, { now });
    // Low OCR confidence → force ambiguous (AC6), preserving the field flags for the verifier.
    if (confidence < OCR_CONFIDENCE_THRESHOLD && parity.outcome !== 'ambiguous') {
      parity = {
        outcome: 'ambiguous',
        flags: { ...parity.flags, ocr: 'low_confidence' },
        verifierReviewRequired: true,
      };
    }
    finalOutcome = parity.outcome;

    // Encrypt each extracted Tier-1 field ONCE (null → null column) — reused in both the
    // insert and the conflict-update branch below. Both branches are always constructed
    // (Drizzle needs both regardless of whether the conflict path fires), so calling `enc`
    // separately in each would double every KMS call on every job run.
    const enc = async (value: string | null): Promise<string | null> =>
      value == null ? null : encryptClaimDocField(value, pariwarId, deps);
    const deceasedNameCiphertext = await enc(ocrFields.deceasedName);
    const dobCiphertext = await enc(ocrFields.dateOfBirth);
    const dateOfDeathCiphertext = await enc(ocrFields.dateOfDeath);
    const issuingAuthorityCiphertext = await enc(ocrFields.issuingAuthority);
    const certificateNumberCiphertext = await enc(ocrFields.certificateNumber);

    // ── Story 6.21a (D2) — a death certificate WITH an upload id: lock, forward-only, keep every upload.
    const tracked =
      p.documentType === 'death_certificate' && p.uploadId !== undefined && p.uploadedAt !== undefined
        ? {
            uploadId: ids.deathCertificateUploadId(p.uploadId),
            uploadedAt: new Date(p.uploadedAt),
            channel: p.channel ?? ('member_app' as const),
          }
        : null;
    let makeCurrent = true;
    if (tracked) {
      // (1) The claim-row lock — the review writer takes it first too.
      const [locked] = await db
        .select({ claimCaseId: schema.claims.claimCaseId })
        .from(schema.claims)
        .where(and(eq(schema.claims.pariwarId, brandedPariwarId), eq(schema.claims.claimCaseId, claimCaseId)))
        .for('update');
      if (!locked) throw new Error(`[jobs] claim-ocr-parity: claim ${claimCaseId} not found in scope`);
      // (2) Forward-only: the CURRENT upload is the one whose key is the row's key.
      const current = await client.query<{ upload_id: string | null; uploaded_at: Date | null }>(
        `SELECT u.upload_id, u.uploaded_at
           FROM claim_documents cd
           LEFT JOIN claim_death_certificate_uploads u
             ON u.pariwar_id = cd.pariwar_id AND u.storage_object_key = cd.storage_object_key
          WHERE cd.pariwar_id = $1 AND cd.claim_case_id = $2 AND cd.document_type = 'death_certificate'`,
        [brandedPariwarId, claimCaseId],
      );
      const currentUploadedAt = current.rows[0]?.uploaded_at ?? null;
      // A retry of the SAME upload re-applies the same key regardless of clock: idempotent by IDENTITY, not
      // by timestamp comparison — `uploadedAt` is the HANDLER's wall clock, so two genuinely DIFFERENT
      // uploads can tie on it. Only a strictly LATER timestamp promotes a different upload to current; a
      // tie between two different uploads keeps the one already current (commit order must ⛔ never decide).
      const isRetryOfCurrent = current.rows[0]?.upload_id?.toLowerCase() === (tracked.uploadId as string).toLowerCase();
      makeCurrent =
        currentUploadedAt === null ||
        isRetryOfCurrent ||
        tracked.uploadedAt.getTime() > new Date(currentUploadedAt).getTime();
    }

    // Upsert ONE row per (claim, document_type) — idempotent (AC4). ⭐ Story 6.21a: SKIPPED for an OLDER
    // death-certificate upload (it is kept below, but ⛔ not made current, and its OCR reading ⛔ never
    // overwrites the current certificate's).
    let upsertedDocumentId: string | null = null;
    if (makeCurrent) {
    const [upserted] = await db
      .insert(schema.claimDocuments)
      .values({
        claimDocumentId,
        claimCaseId,
        pariwarId: brandedPariwarId,
        documentType: p.documentType,
        storageObjectKey: p.storageObjectKey,
        contentType: p.contentType,
        byteSize: p.byteSize,
        deceasedNameCiphertext,
        dobCiphertext,
        dateOfDeathCiphertext,
        issuingAuthorityCiphertext,
        certificateNumberCiphertext,
        parityOutcome: parity.outcome,
        parityFlags: parity.flags,
        ocrConfidence: confidence,
        verifierReviewRequired: parity.verifierReviewRequired,
      })
      .onConflictDoUpdate({
        target: [schema.claimDocuments.claimCaseId, schema.claimDocuments.documentType],
        set: {
          storageObjectKey: p.storageObjectKey,
          contentType: p.contentType,
          byteSize: p.byteSize,
          deceasedNameCiphertext,
          dobCiphertext,
          dateOfDeathCiphertext,
          issuingAuthorityCiphertext,
          certificateNumberCiphertext,
          parityOutcome: parity.outcome,
          parityFlags: parity.flags,
          ocrConfidence: confidence,
          verifierReviewRequired: parity.verifierReviewRequired,
          updatedAt: now,
        },
      })
      .returning({ claimDocumentId: schema.claimDocuments.claimDocumentId });
    upsertedDocumentId = upserted?.claimDocumentId ?? null;
    }

    if (tracked) {
      // (3) The upload row — the row's id from the upsert's RETURNING, or (not made current) the existing row.
      let documentId = upsertedDocumentId;
      if (documentId === null) {
        const [existing] = await db
          .select({ claimDocumentId: schema.claimDocuments.claimDocumentId })
          .from(schema.claimDocuments)
          .where(
            and(
              eq(schema.claimDocuments.pariwarId, brandedPariwarId),
              eq(schema.claimDocuments.claimCaseId, claimCaseId),
              eq(schema.claimDocuments.documentType, 'death_certificate'),
            ),
          );
        documentId = existing?.claimDocumentId ?? null;
      }
      if (documentId === null) {
        throw new Error(`[jobs] claim-ocr-parity: no death_certificate row for claim ${claimCaseId}`);
      }
      await db
        .insert(schema.claimDeathCertificateUploads)
        .values({
          uploadId: tracked.uploadId,
          claimCaseId,
          pariwarId: brandedPariwarId,
          deceasedMemberId,
          claimDocumentId: ids.claimDocumentId(documentId),
          storageObjectKey: p.storageObjectKey,
          contentType: p.contentType,
          byteSize: p.byteSize,
          channel: tracked.channel,
          uploadedByActorId: actorId ?? null,
          uploadedAt: tracked.uploadedAt,
        })
        .onConflictDoNothing({ target: schema.claimDeathCertificateUploads.uploadId });
    }

    // Advance the claim state — idempotently. The claim row must exist (FK guarantees it).
    const claimRow = await claim.getClaimCase(db, brandedPariwarId, claimCaseId);
    if (!claimRow) {
      throw new Error(`[jobs] claim-ocr-parity: claim ${claimCaseId} not found in scope`);
    }
    // Story 6.21a (AC3) — a death-certificate REPLACEMENT in the review window triggers ⛔ no peer-mesh
    // select: the selection was made long ago, and the select job's no-op branch still re-queues its
    // window and shepherd jobs.
    replacementInReviewWindow = tracked !== null && claim.isInDeathCertificateReviewWindow(claimRow.currentState as string);
    // Only append from `intake_converged` (AC4). Already `documents_pending` (or beyond) → the
    // event was already emitted (a retry / a sibling document) → skip (no second event row).
    if (claimRow.currentState === 'intake_converged') {
      await client.query('SAVEPOINT ocr_documents_received');
      try {
        await claim.projectClaimState(client, {
          claimCaseId,
          pariwarId: brandedPariwarId,
          deceasedMemberId,
          intakeChannels: claimRow.intakeChannels,
          claimantActorId: claimRow.claimantActorId,
          eventType: 'claim.documents_received',
          payload: {
            from_state: 'intake_converged',
            to_state: 'documents_pending',
            trigger: 'ocr_documents_received',
            actor: 'system',
          },
          actorId: null,
        });
        await client.query('RELEASE SAVEPOINT ocr_documents_received');
      } catch (err) {
        if (err instanceof claim.ClaimStreamConcurrencyError) {
          // Benign race — another writer appended the same version first. Roll the append back
          // to the savepoint (a 23505 poisons the tx) so the doc-row upsert still commits.
          await client.query('ROLLBACK TO SAVEPOINT ocr_documents_received');
          alarm(`[jobs] claim-ocr-parity: benign append race on claim ${claimCaseId} — event already emitted`);
        } else {
          throw err;
        }
      }
    }
  });

  // ── (2b) Story 6.6 trigger seam: the claim is now `documents_pending` (this run advanced it
  //        or a prior run did) → enqueue the peer-mesh SELECT job (the automatic "auto-ping 5
  //        nearest" trigger, epics.md:2260). singletonKey = claim_case_id (in boot.ts) so a
  //        re-run of the OCR job does not double-select; the select job is itself idempotent.
  //        Best-effort: an enqueue failure NEVER fails the OCR job (the doc row + the
  //        documents_received event already committed) — alarm only.
  if (deps.enqueuePeerMeshSelect && !replacementInReviewWindow) {
    try {
      await deps.enqueuePeerMeshSelect({
        claimCaseId: p.claimCaseId,
        deceasedMemberId: p.deceasedMemberId,
        pariwarId,
        actorId: actorId ?? null,
        traceId: traceId ?? crypto.randomUUID(),
      });
    } catch (err) {
      const e = err as Error & { code?: string };
      alarm(
        `[jobs] claim-ocr-parity: failed to enqueue peer-mesh select for claim ${p.claimCaseId} — ` +
          `${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
      );
    }
  }

  // ── (3) Best-effort audit (AC6 — logged, NON-PII, non-blocking).
  try {
    await audit.writeAuditEntry(deps.pool, {
      pariwarId,
      actorId: actorId ?? null,
      actorRole: 'system',
      action: 'claim_document.ocr_parity_evaluated',
      resourceLocator: `claim_document:${p.claimDocumentId}`,
      requestPayloadHash: contextHash({
        claim_case_id: p.claimCaseId,
        document_type: p.documentType,
        parity_outcome: finalOutcome,
        ocr_confidence: confidence,
      }),
      responseStatus: 200,
      traceId: traceId ?? null,
    });
  } catch (auditErr) {
    const e = auditErr as Error;
    alarm(`[jobs] claim-ocr-parity: audit write failed for ${claimDocumentId} — ${e?.message ?? String(auditErr)}`);
  }

  console.info(
    '[jobs] claim-ocr-parity',
    JSON.stringify({ claimDocumentId: p.claimDocumentId, outcome: finalOutcome, confidence }),
  );
  return { outcome: finalOutcome, claimDocumentId: p.claimDocumentId };
}

/** Decrypt a stored Tier-1 envelope to plaintext under (pariwarId, fieldClass). */
async function decryptTier1Field(
  serialized: string,
  pariwarId: string,
  deps: Pick<ClaimOcrParityDeps, 'kms' | 'kekRef'>,
  fieldClass: string,
): Promise<string> {
  const bytes = await encryption.decryptTier1(
    encryption.parseEnvelope(serialized),
    { pariwarId, fieldClass },
    deps.kms,
    deps.kekRef,
  );
  return Buffer.from(bytes).toString('utf-8');
}

/** Tier-1-encrypt a claim-document extracted field to a serialized envelope. */
async function encryptClaimDocField(
  value: string,
  pariwarId: string,
  deps: Pick<ClaimOcrParityDeps, 'kms' | 'kekRef'>,
): Promise<string> {
  const ct = await encryption.encryptTier1(
    Buffer.from(value, 'utf-8'),
    { pariwarId, fieldClass: CLAIM_DOCUMENT_FIELD_CLASS },
    deps.kms,
    deps.kekRef,
  );
  return encryption.serializeEnvelope(ct);
}

/**
 * Register the CLAIM_OCR_PARITY queue + worker (Class B — request-triggered). Mirrors
 * registerDataExportWorkers' build-queue shape (createQueue → work; v12 hands the handler an
 * ARRAY of jobs).
 */
export async function registerClaimOcrParityWorker(
  boss: QueueClient,
  deps: ClaimOcrParityDeps,
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_OCR_PARITY);
  await boss.work(QUEUE_NAMES.CLAIM_OCR_PARITY, async (jobs: Job[]) => {
    const results: { outcome: string; claimDocumentId: string }[] = [];
    for (const job of jobs) {
      const envelope = job.data as JobEnvelope<ClaimOcrParityPayload>;
      results.push(await runClaimOcrParity(deps, envelope));
    }
    return { processed: results.length, results };
  });
}
