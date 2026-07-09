// Claim-document upload handlers — Story 6.5 (Task 5; AC1/AC3/AC8).
//
// Two authenticated upload surfaces that share ONE core (`uploadClaimDocument`):
//   · member-app (Ravi-mode session, `claim_handover` step-up) — /member/claims/:id/documents
//   · helpline operator (upload-on-behalf, `claim.file` permission) — the admin scope-tx path
//
// ── The upload lifecycle guard runs FIRST (AC1/AC5 — API-owned, not the reducer's job) ──
// After the tenant-scoped claim lookup, the upload is accepted ONLY when the claim is
// `intake_converged` (initial) or `documents_pending` (re-upload). Every other state is a
// stable `409 claim_document.upload_not_allowed` (the story's CLAIM_DOCUMENT_UPLOAD_NOT_ALLOWED)
// via ConflictError — checked BEFORE the MIME/size enforcement, the storage `put`, and the OCR
// job enqueue, so a rejected upload NEVER reaches storage or the queue. The reducer's
// identity-on-invalid-transition is defense-in-depth underneath, not a substitute.
//
// The document bytes are stored in object storage (Decision D1 — never Postgres) and an OCR +
// parity job is enqueued; extraction + the verdict complete asynchronously (HTTP 202). The
// `claim_documents` metadata row is written by the JOB (one writer), not here.

import { randomUUID } from 'node:crypto';

import {
  CLAIM_DOCUMENT_ALLOWED_MIME_TYPES,
  CLAIM_DOCUMENT_MAX_BYTES,
  type ClaimDocumentUploadResponse,
  type OcrDocumentType,
} from '@twt/contracts';
import { claim, ids } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';

/** The claim states from which a document upload is accepted (AC1/AC5). */
const UPLOADABLE_STATES = new Set(['intake_converged', 'documents_pending']);

interface UploadInput {
  claimCaseId: ids.ClaimId;
  pariwarId: ids.PariwarId;
  documentType: OcrDocumentType;
  actorId: string | null;
  /** Member-app authz: the claim's deceased member must equal the acting session member. */
  requireDeceasedMemberId?: ids.MemberId;
}

/**
 * The shared upload core. Runs the lifecycle guard FIRST (against the scoped tx), then reads +
 * validates the multipart file (MIME allowlist + exact byte cap), stores the bytes, and enqueues
 * the OCR + parity job. Returns the 202 body. A rejected guard throws BEFORE the file is read /
 * stored / enqueued.
 */
async function uploadClaimDocument(
  deps: AppDeps,
  request: FastifyRequest,
  tx: ScopeTx,
  input: UploadInput,
): Promise<ClaimDocumentUploadResponse> {
  // (1) Lifecycle guard FIRST — before MIME/size, storage, and the queue.
  const claimRow = await claim.getClaimCase(tx.tx, input.pariwarId, input.claimCaseId);
  if (!claimRow) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  // Member-app: the session member may only upload against their OWN claim (Ravi-mode session
  // IS the deceased). A mismatch is treated as not-found (no cross-claim existence oracle).
  if (input.requireDeceasedMemberId && claimRow.deceasedMemberId !== input.requireDeceasedMemberId) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (!UPLOADABLE_STATES.has(claimRow.currentState)) {
    throw new ConflictError(
      'Document upload is not allowed for the claim in its current state',
      'claim_document.upload_not_allowed',
      { state: claimRow.currentState },
    );
  }

  // (2) Read the multipart file (only AFTER the guard passes).
  const data = await request.file();
  if (!data) {
    throw new BadRequestError('No document file in the upload', 'claim_document.no_file');
  }
  if (!CLAIM_DOCUMENT_ALLOWED_MIME_TYPES.includes(data.mimetype)) {
    throw new UnsupportedMediaTypeError(
      'Unsupported document type — upload a JPEG, PNG, or PDF',
      'claim_document.unsupported_media_type',
      { allowed: CLAIM_DOCUMENT_ALLOWED_MIME_TYPES },
    );
  }
  let buffer: Buffer;
  try {
    buffer = await data.toBuffer();
  } catch (err) {
    // @fastify/multipart throws a TYPED error (`.code`) when the stream exceeds the plugin's
    // `fileSize` limit — only THAT case is genuinely "too large". Any other `toBuffer()`
    // failure (aborted connection, malformed multipart stream) is a different problem and
    // must not be mislabeled as a 413.
    const code = (err as { code?: string }).code;
    if (code === 'FST_REQ_FILE_TOO_LARGE' || code === 'FST_FILES_LIMIT') {
      throw new PayloadTooLargeError(
        'Document exceeds the size limit',
        'claim_document.too_large',
        { maxBytes: CLAIM_DOCUMENT_MAX_BYTES },
      );
    }
    throw err;
  }
  // (3) Exact byte-cap + emptiness enforcement (defense-in-depth beyond the plugin limit).
  if (data.file.truncated || buffer.byteLength > CLAIM_DOCUMENT_MAX_BYTES) {
    throw new PayloadTooLargeError(
      'Document exceeds the size limit',
      'claim_document.too_large',
      { maxBytes: CLAIM_DOCUMENT_MAX_BYTES },
    );
  }
  if (buffer.byteLength === 0) {
    throw new BadRequestError('The uploaded document is empty', 'claim_document.empty');
  }

  // (4) Store the bytes (Decision D1 — object storage, never Postgres) + enqueue the OCR job.
  // Reuse the existing row's id on a re-upload of the same (claim, document_type) — the job
  // upserts on that same unique index, so minting a fresh id here would return a `documentId`
  // that never matches the persisted row.
  const existing = await claim.getClaimDocumentByType(
    tx.tx,
    input.pariwarId,
    input.claimCaseId,
    input.documentType,
  );
  const claimDocumentId = existing?.claimDocumentId ?? randomUUID();
  // The object key is an opaque, non-PII path scoped by pariwar/claim (never exposed to the client).
  const storageObjectKey = `pariwar/${input.pariwarId}/claim/${input.claimCaseId}/${input.documentType}/${claimDocumentId}`;
  await deps.claimDocumentStorage.put(storageObjectKey, new Uint8Array(buffer), {
    contentType: data.mimetype,
  });

  const traceId = request.requestContext?.traceId ?? randomUUID();
  try {
    await deps.claimOcrParityQueue.enqueue({
      requestId: traceId,
      pariwarId: input.pariwarId,
      actorId: input.actorId,
      traceId,
      payload: {
        claimDocumentId,
        claimCaseId: input.claimCaseId,
        deceasedMemberId: claimRow.deceasedMemberId,
        documentType: input.documentType,
        storageObjectKey,
        contentType: data.mimetype,
        byteSize: buffer.byteLength,
      },
    });
  } catch (err) {
    // Compensate: the bytes are already durably stored but no job will ever process them.
    // Best-effort cleanup — an object-store delete failure must not mask the original error.
    await deps.claimDocumentStorage.delete?.(storageObjectKey).catch(() => undefined);
    throw err;
  }

  return { documentId: claimDocumentId, status: 'processing' };
}

export function createClaimDocumentHandlers(deps: AppDeps) {
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  return {
    /**
     * POST /api/v1/member/claims/:claimCaseId/documents?documentType=… — member-app (Ravi-mode)
     * death-certificate upload. Opens its own scope tx (the nominee/claims handler template).
     */
    async uploadMemberDocument(request: FastifyRequest, reply: FastifyReply): Promise<ClaimDocumentUploadResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const { documentType } = request.query as { documentType: OcrDocumentType };
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const body = await uploadClaimDocument(deps, request, scopeTx, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: ids.pariwarId(pariwarIdStr),
          documentType,
          actorId: memberIdStr,
          requireDeceasedMemberId: ids.memberId(memberIdStr),
        });
        ok = true;
        emitAuthAudit(deps, request, 'member_claim.document_uploaded', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: {
            claim_case_id: claimCaseId,
            claim_document_id: body.documentId,
            document_type: documentType,
            intake_channel: 'member_app',
          },
        });
        void reply.status(202);
        return body;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/documents?documentType=… — helpline
     * operator upload-on-behalf. Rides the scope-resolution middleware's scope tx (request.scopeTx).
     */
    async uploadHelplineDocument(request: FastifyRequest, reply: FastifyReply): Promise<ClaimDocumentUploadResponse> {
      const scopeTx = request.scopeTx;
      const operatorId = request.requestContext.actorId;
      if (!scopeTx || !operatorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { claimCaseId } = request.params as { claimCaseId: string };
      const { documentType } = request.query as { documentType: OcrDocumentType };
      const body = await uploadClaimDocument(deps, request, scopeTx, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(scopeTx.pariwarId),
        documentType,
        actorId: operatorId,
      });
      emitAuthAudit(deps, request, 'helpline_claim.document_uploaded', {
        actorId: operatorId,
        pariwarId: scopeTx.pariwarId,
        context: {
          claim_case_id: claimCaseId,
          claim_document_id: body.documentId,
          document_type: documentType,
          intake_channel: 'helpline',
        },
      });
      void reply.status(202);
      return body;
    },
  };
}
