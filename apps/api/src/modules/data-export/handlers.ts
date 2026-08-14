// Member data-export handlers — Story 3.11 (Task 5; AC1/AC3/AC4).
//
// Three routes behind one module (routes.ts):
//   · POST   /api/v1/member/data-export        — request an export (session only). Idempotent: an
//     active (`pending`/`ready`-unconsumed) export is returned rather than duplicated. Otherwise INSERT
//     a `pending` row + enqueue the DATA_EXPORT_BUILD job (the FIRST api-side producer).
//   · GET    /api/v1/member/data-export/:id     — poll status (session only, NO step-up).
//   · GET    /api/v1/member/data-export/:id/download — the one-time, 24h, step-up-gated ZIP stream.
//
// ── Scope-tx discipline (mirror withdrawal/life-events handlers) ────────────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but does NOT open a scope
// tx; each handler opens its own. The enqueue runs AFTER the scope-tx COMMITs (so the job sees the
// committed `pending` row); an enqueue failure compensates by marking the row `failed`.
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────────────
// The ZIP is streamed only — never JSON-embedded. Audit context is NON-PII (export_id, member_id via
// actorId, status, byte size) — NEVER any exported field value, NEVER the plaintext.

import type { DataExportRequestResponse, DataExportStatusResponse } from '@twt/contracts';
import { dataExport, ids, member as memberDomain } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  ConflictError,
  GoneError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptExportArtifact } from './data-export-crypto.js';

/**
 * Lifecycle states in which an export request is refused (Story 10.21, AC12).
 *
 * Follows the FIVE shipped `TERMINAL_STATES` guards — `nominee`, `member-terms`, `medical`,
 * `vyawastha-shulk`, `life-events` — each `new Set(['withdrawn', 'anonymized'])` returning a 409
 * `<module>.member_terminal`. ⛔ The error code is `data_export.member_terminal`, NOT an
 * `rtbf.already_anonymized`-shaped code: this is not an RTBF route and borrowing that code would tell
 * a client the wrong thing about what happened.
 */
const DATA_EXPORT_TERMINAL_STATES: ReadonlySet<string> = new Set(['withdrawn', 'anonymized']);

export function createDataExportHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
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
     * POST — request an export. Idempotent per AC1: an in-flight active export is returned (no
     * duplicate job). Otherwise INSERT `pending` + enqueue the build job AFTER commit; on enqueue
     * failure, compensate (mark `failed`) + surface a retryable 503.
     */
    async request(request: FastifyRequest): Promise<DataExportRequestResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const traceId = request.requestContext.traceId;
      const now = deps.clock();
      // Branded IDs declared before the scope-tx so the 23505 retry block can use them.
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // `concurrent` is set when two simultaneous POSTs both read "no active export" and both
      // attempt INSERT — the second hits the partial unique index (23505). We abort the tx and
      // re-read the winner's row in a fresh scope-tx to return idempotently.
      let concurrent = false;
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      let toEnqueue: string | null = null;
      let response: DataExportRequestResponse;
      try {
        // ── Story 10.21 (AC12) — TERMINAL GUARD. This closes a SHIPPED defect, not a new one ─────────
        // ⛔ This route was reachable by an ERASED member and created a fresh dossier row for them.
        // Three facts combine:
        //   · `requireMemberSession` is a STATELESS JWT verify — no DB read, no state check;
        //   · `anonymizeMember` revokes NOTHING (zero refresh-token/session writes), so an existing
        //     access token survives the erasure for the rest of its ~15-minute TTL; and
        //   · this handler had NO lifecycle check, and `assemble.ts` reads `members` by id with no
        //     state predicate.
        // So within their token window an erased member could enqueue a rebuild of the very dossier
        // the erasure had just zeroed. AC11 closes the artifact; without THIS, AC11 is re-openable.
        //
        // ⛔ The guard goes in the CALLER, never in `assemble.ts` — the assembler is shared and must
        // not learn lifecycle rules (the same WS-D shape that moved RTBF legality out of the reducer).
        // ⛔ And it goes on BOTH enqueue callers: guarding only the new off-portal route would leave
        // this older, already-reachable one open.
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, now);
        if (DATA_EXPORT_TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Data export is not available for a closed membership',
            'data_export.member_terminal',
          );
        }

        const active = await dataExport.findActiveExport(scopeTx.tx, memberId, now);
        if (active) {
          // Idempotent: return the existing in-flight export, no new job.
          response = {
            exportId: active.exportId,
            status: active.status as DataExportRequestResponse['status'],
          };
          ok = true;
          return response;
        }

        const row = await dataExport.insertDataExport(scopeTx.tx, {
          memberId,
          pariwarId,
          requestedAt: now,
        });
        toEnqueue = row.exportId;
        response = { exportId: row.exportId, status: 'pending' };
        ok = true;
      } catch (err) {
        if ((err as { code?: string }).code !== '23505') throw err;
        concurrent = true; // tx is aborted — finally will rollback; re-read below
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // Concurrent insert won: open a fresh scope-tx to return the winner's row idempotently.
      if (concurrent) {
        const retryTx = await openScopeTx(deps, pariwarIdStr);
        let retryOk = false;
        try {
          const winner = await dataExport.findActiveExport(retryTx.tx, memberId, now);
          if (!winner) throw new Error('[api] data-export: unique constraint but no active export found');
          response = {
            exportId: winner.exportId,
            status: winner.status as DataExportRequestResponse['status'],
          };
          retryOk = true;
        } finally {
          await closeScopeTx(retryTx, retryOk);
        }
        return response!;
      }

      // Enqueue AFTER commit so the worker sees the committed `pending` row. On failure, compensate
      // (mark `failed`) so no `pending` row orphans, and surface a retryable error (Dev Notes).
      if (toEnqueue !== null) {
        const exportIdToEnqueue = toEnqueue;
        try {
          await deps.dataExportQueue.enqueueBuild({
            requestId: traceId,
            pariwarId: pariwarIdStr,
            actorId: memberIdStr,
            traceId,
            payload: { exportId: exportIdToEnqueue },
          });
        } catch {
          // Compensation: mark the orphaned pending row `failed`. Wrap in try/catch so
          // ServiceUnavailableError is ALWAYS thrown — even if markExportFailed itself fails
          // (correlated failure: enqueue down + DB under pressure). Compensation failure is logged.
          try {
            const stx = await openScopeTx(deps, pariwarIdStr);
            let ok2 = false;
            try {
              await dataExport.markExportFailed(
                stx.tx,
                ids.dataExportId(exportIdToEnqueue),
                memberId,
                'enqueue_failed',
              );
              ok2 = true;
            } finally {
              await closeScopeTx(stx, ok2);
            }
          } catch (compErr: unknown) {
            console.error('[api] data-export: enqueue+compensate both failed for', exportIdToEnqueue, compErr);
          }
          throw new ServiceUnavailableError(
            'Export could not be queued — please try again',
            'data_export.enqueue_failed',
          );
        }
        emitAuthAudit(deps, request, 'member_data_export.requested', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { export_id: exportIdToEnqueue, status: 'pending' },
        });
      }

      return response!;
    },

    /** GET :id — poll status (session only, NO step-up). 404 when not this member's export. */
    async status(request: FastifyRequest): Promise<DataExportStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const exportId = ids.dataExportId((request.params as { id: string }).id);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const row = await dataExport.getExportForMember(
          scopeTx.tx,
          exportId,
          ids.memberId(memberIdStr),
        );
        if (!row) {
          throw new NotFoundError('Export not found', 'data_export.not_found');
        }
        const result: DataExportStatusResponse = {
          exportId: row.exportId,
          status: row.status as DataExportStatusResponse['status'],
          requestedAt: row.requestedAt.toISOString(),
          ...(row.readyAt ? { readyAt: row.readyAt.toISOString() } : {}),
          ...(row.expiresAt ? { expiresAt: row.expiresAt.toISOString() } : {}),
          ...(row.failedReason ? { failedReason: row.failedReason as DataExportStatusResponse['failedReason'] } : {}),
        };
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET :id/download — the one-time, 24h, step-up-gated ZIP stream (AC3/AC4). Guards in order:
     * exists+owned → not consumed (410) → ready (409 if not) → not expired (410). Check consumed
     * BEFORE the ready guard: after Group A patches markExportConsumed sets status='consumed' AND
     * consumedAt — the ready guard would fire first (409) masking the spec-required 410. Decrypt
     * inside the scope (a decrypt failure rolls back), then stamp `consumed_at` (conditional — a
     * lost race → 410 consumed), COMMIT, and stream `application/zip`. Audit AFTER (NON-PII only).
     */
    async download(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const exportId = ids.dataExportId((request.params as { id: string }).id);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      let zipBuffer: Buffer;
      try {
        const memberId = ids.memberId(memberIdStr);
        const row = await dataExport.getExportForMember(scopeTx.tx, exportId, memberId);
        if (!row) {
          throw new NotFoundError('Export not found', 'data_export.not_found');
        }
        if (row.consumedAt !== null || row.status === 'consumed') {
          throw new GoneError('Export has already been downloaded', 'data_export.consumed');
        }
        // The vacuum flips past-window rows → status='expired' and nulls the artifact. Check the
        // explicit status BEFORE the generic not-ready guard so the member gets 410 "expired"
        // rather than 409 "not_ready" once the vacuum has already processed the row.
        if (row.status === 'expired') {
          throw new GoneError('Export download window has expired', 'data_export.expired');
        }
        if (row.status !== 'ready') {
          throw new ConflictError('Export is not ready', 'data_export.not_ready');
        }
        if (!row.expiresAt || row.expiresAt <= now || !row.artifactCiphertext) {
          throw new GoneError('Export download window has expired', 'data_export.expired');
        }

        // Decrypt inside the scope so a decrypt failure rolls back (no phantom consume).
        zipBuffer = await decryptExportArtifact(row.artifactCiphertext, pariwarIdStr, enc);

        // Stamp consumed_at BEFORE streaming (conditional — a concurrent double-download loses).
        const won = await dataExport.markExportConsumed(scopeTx.tx, exportId, memberId, now);
        if (!won) {
          throw new GoneError('Export has already been downloaded', 'data_export.consumed');
        }
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // Body-independent headers set directly in the handler (NOT an async onSend — avoids the Fastify
      // double-send foot-gun). The buffer is streamed as the response body.
      reply.header('content-type', 'application/zip');
      reply.header(
        'content-disposition',
        `attachment; filename="twt-data-export-${exportId}.zip"`,
      );
      emitAuthAudit(deps, request, 'member_data_export.downloaded', {
        actorId: memberIdStr,
        pariwarId: pariwarIdStr,
        context: { export_id: exportId, artifact_bytes: zipBuffer.length },
      });
      return reply.send(zipBuffer);
    },
  };
}
