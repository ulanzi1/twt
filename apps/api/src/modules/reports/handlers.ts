// Reports-&-exports library handlers — Story 10.7 (Task 6; AC2/AC3/AC5).
//
// Three routes under one module (routes.ts), ALL admin-session + scope-resolution gated:
//   · POST   …/p/:pariwarId/admin/reports        — request a report export. Authorizes the actor against
//     the SELECTED template's OWN permission key at their resolved scope (Decision 6 — the key is
//     dynamic per report_type, so the check is HERE, not a static preHandler). Idempotent per
//     (requested_by_actor_id, report_type, params_hash). Inserts a `pending` row + enqueues the build.
//   · GET    …/p/:pariwarId/admin/reports/:id     — poll status (owned-by-actor 404 discipline).
//   · GET    …/p/:pariwarId/admin/reports/:id/download — the one-time, 24h, authenticated stream.
//
// ── Own scope-tx discipline (the 3.11 pattern) ──────────────────────────────────────────────────────
// The insert opens its OWN scope-tx and COMMITs before the enqueue (so the worker sees the committed
// `pending` row); the download opens its own scope-tx and COMMITs the `consumed` stamp BEFORE streaming
// (so a crash mid-stream never un-consumes). The assembly + PII masking happen in the WORKER, never here
// (this admin request path carries admin-identity keys — the 10.4 crypto-boundary lesson).

import { createHash } from 'node:crypto';

import type {
  ReportExportListResponse,
  ReportRequest,
  ReportRequestResponse,
  ReportStatusResponse,
} from '@twt/contracts';
import { AuthorizationDeniedError, audit, ids, reports } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  BadRequestError,
  ConflictError,
  GoneError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptReportArtifact } from './reports-crypto.js';

/** Stable sha256 of the request params (canonical key order) — the idempotency key + audit digest. */
function paramsDigest(params: Readonly<Record<string, unknown>> | undefined): string {
  const canonical = JSON.stringify(params ?? {}, Object.keys(params ?? {}).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

/** Project a `report_exports` row into the wire status shape — shared by `status()` and `list()`. */
function toStatusResponse(row: reports.ReportExportRow): ReportStatusResponse {
  return {
    report_export_id: row.reportExportId,
    status: row.status as ReportStatusResponse['status'],
    report_type: row.reportType,
    format: row.format as ReportStatusResponse['format'],
    requested_at: row.requestedAt.toISOString(),
    ...(row.readyAt ? { ready_at: row.readyAt.toISOString() } : {}),
    ...(row.expiresAt ? { expires_at: row.expiresAt.toISOString() } : {}),
    ...(row.rowCount != null ? { row_count: row.rowCount } : {}),
    ...(row.failedReason ? { failed_reason: row.failedReason as ReportStatusResponse['failed_reason'] } : {}),
  };
}

export function createReportsHandlers(deps: AppDeps) {
  const registry = reports.createDefaultReportRegistry();
  const enc = deps.encryption;

  interface AdminCtx {
    actorId: string;
    pariwarId: string;
    traceId: string;
    grants: readonly import('@twt/domain').rbac.EffectiveGrant[];
  }

  function adminCtx(request: FastifyRequest): AdminCtx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return {
      actorId,
      pariwarId: scopeTx.pariwarId,
      traceId: request.requestContext.traceId,
      grants: request.scopeGrants ?? [],
    };
  }

  return {
    /**
     * POST — request a report export. Resolves the template (400 on unknown), authorizes the actor
     * against the template's OWN key at their resolved scope (403 fail-closed), idempotently inserts a
     * `pending` row, and enqueues the build AFTER commit (compensate + 503 on enqueue failure).
     */
    async request(request: FastifyRequest): Promise<ReportRequestResponse> {
      const { actorId, pariwarId, traceId, grants } = adminCtx(request);
      const body = request.body as ReportRequest;

      const template = registry.get(body.report_type);
      if (!template) {
        throw new BadRequestError(`Unknown report type '${body.report_type}'`, 'reports.unknown_type');
      }

      // Authorization (Decision 6): the actor must hold the template's OWN key at some scope. A null
      // resolved scope means they hold it at none → fail-closed 403 (the structured RBAC denial).
      const resolvedScope = reports.resolveActorReportScope(grants, template.permissionKey, pariwarId);
      if (!resolvedScope) {
        throw new AuthorizationDeniedError({
          actorId,
          permissionKey: template.permissionKey,
          requiredScope: template.scopeDimension,
          targetLocator: { dimension: template.scopeDimension, value: null },
        });
      }

      const now = deps.clock();
      const paramsHash = paramsDigest(body.params);

      let concurrent = false;
      let response: ReportRequestResponse;
      let toEnqueue: string | null = null;
      const scopeTx = await openScopeTx(deps, pariwarId);
      let ok = false;
      try {
        const active = await reports.findActiveReportExport(
          scopeTx.tx,
          actorId,
          body.report_type,
          body.format,
          paramsHash,
          now,
        );
        if (active) {
          response = {
            report_export_id: active.reportExportId,
            status: active.status as ReportRequestResponse['status'],
          };
          ok = true;
          return response;
        }
        const row = await reports.insertReportExport(scopeTx.tx, {
          pariwarId: ids.pariwarId(pariwarId),
          requestedByActorId: actorId,
          reportType: body.report_type,
          format: body.format,
          paramsHash,
          requestedAt: now,
        });
        toEnqueue = row.reportExportId;
        response = { report_export_id: row.reportExportId, status: 'pending' };
        ok = true;
      } catch (err) {
        if ((err as { code?: string }).code !== '23505') throw err;
        concurrent = true; // partial-unique race — tx aborted; re-read the winner below
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      if (concurrent) {
        const retryTx = await openScopeTx(deps, pariwarId);
        let retryOk = false;
        try {
          const winner = await reports.findActiveReportExport(
            retryTx.tx,
            actorId,
            body.report_type,
            body.format,
            paramsHash,
            now,
          );
          if (winner) {
            response = {
              report_export_id: winner.reportExportId,
              status: winner.status as ReportRequestResponse['status'],
            };
          } else {
            // The unique index blocked us but NO fresh active row exists — the blocker is a stale,
            // past-window `ready` row the hourly vacuum has not yet reaped (its `expires_at <= now`, so
            // findActiveReportExport's live-window ready branch cannot see it). Expire it in place, then
            // insert, so the actor is never locked out of re-running a report by an un-vacuumed artifact
            // (review finding — this replaced a raw `throw` that surfaced as an uncaught 500).
            await reports.expireStaleReadyReportExport(
              retryTx.tx,
              actorId,
              body.report_type,
              body.format,
              paramsHash,
              now,
            );
            const row = await reports.insertReportExport(retryTx.tx, {
              pariwarId: ids.pariwarId(pariwarId),
              requestedByActorId: actorId,
              reportType: body.report_type,
              format: body.format,
              paramsHash,
              requestedAt: now,
            });
            toEnqueue = row.reportExportId;
            response = { report_export_id: row.reportExportId, status: 'pending' };
          }
          retryOk = true;
        } finally {
          await closeScopeTx(retryTx, retryOk);
        }
        // Fall through to the enqueue block: it enqueues only when `toEnqueue` was set (a fresh insert
        // above), and is a no-op when we returned an existing winner.
      }

      // Enqueue AFTER commit so the worker sees the committed `pending` row. On failure compensate
      // (mark `failed`) so no `pending` row orphans, and surface a retryable 503 (the 3.11 pattern).
      if (toEnqueue !== null) {
        const idToEnqueue = toEnqueue;
        try {
          await deps.reportExportQueue.enqueueBuild({
            requestId: traceId,
            pariwarId,
            actorId,
            traceId,
            payload: { reportExportId: idToEnqueue },
          });
        } catch {
          try {
            const stx = await openScopeTx(deps, pariwarId);
            let ok2 = false;
            try {
              await reports.markReportExportFailed(
                stx.tx,
                ids.reportExportId(idToEnqueue),
                actorId,
                'enqueue_failed',
              );
              ok2 = true;
            } finally {
              await closeScopeTx(stx, ok2);
            }
          } catch (compErr: unknown) {
            console.error('[api] reports: enqueue+compensate both failed for', idToEnqueue, compErr);
          }
          throw new ServiceUnavailableError(
            'Report could not be queued — please try again',
            'reports.enqueue_failed',
          );
        }
      }

      return response!;
    },

    /** GET :id — poll status (404 when not this actor's export). */
    async status(request: FastifyRequest): Promise<ReportStatusResponse> {
      const { actorId, pariwarId } = adminCtx(request);
      const reportExportId = ids.reportExportId((request.params as { id: string }).id);

      const scopeTx = await openScopeTx(deps, pariwarId);
      let ok = false;
      try {
        const row = await reports.getReportExportForActor(scopeTx.tx, reportExportId, actorId);
        if (!row) throw new NotFoundError('Report export not found', 'reports.not_found');
        const result = toStatusResponse(row);
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET — list THIS actor's own report exports, newest-first, bounded (review finding: Task 7's
     * "requestor's export list" needs a backend source of truth, or a page refresh loses all knowledge
     * of in-flight/ready exports — the console previously tracked this purely in React state).
     */
    async list(request: FastifyRequest): Promise<ReportExportListResponse> {
      const { actorId, pariwarId } = adminCtx(request);

      const scopeTx = await openScopeTx(deps, pariwarId);
      let ok = false;
      try {
        const rows = await reports.listReportExportsForActor(scopeTx.tx, actorId);
        ok = true;
        return { exports: rows.map(toStatusResponse) };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET :id/download — the one-time, 24h, authenticated stream (AC5). Guards in order: owned →
     * not-consumed (410) → not-expired-status (410) → ready (409) → window/ciphertext (410). Decrypt
     * inside the scope, stamp `consumed_at` conditionally BEFORE streaming (lost race → 410), COMMIT,
     * then stream with the format's content-type. Audit `report.downloaded` AFTER (NON-PII).
     */
    async download(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
      const { actorId, pariwarId, traceId, grants } = adminCtx(request);
      const reportExportId = ids.reportExportId((request.params as { id: string }).id);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarId);
      let ok = false;
      let artifact: Buffer;
      let format = 'csv';
      let reportType = 'unknown';
      try {
        const row = await reports.getReportExportForActor(scopeTx.tx, reportExportId, actorId);
        if (!row) throw new NotFoundError('Report export not found', 'reports.not_found');
        if (row.consumedAt !== null || row.status === 'consumed') {
          throw new GoneError('Report export has already been downloaded', 'reports.consumed');
        }
        if (row.status === 'expired') {
          throw new GoneError('Report export download window has expired', 'reports.expired');
        }
        // Distinct machine-readable code from the generic "still building" conflict (review finding):
        // a `failed` export will NEVER become downloadable, so the client must not keep polling/retrying
        // it the way it would a transient `pending` build.
        if (row.status === 'failed') {
          throw new ConflictError('Report export failed to generate', 'reports.build_failed');
        }
        if (row.status !== 'ready') {
          throw new ConflictError('Report export is not ready', 'reports.not_ready');
        }
        if (!row.expiresAt || row.expiresAt <= now || !row.artifactCiphertext) {
          throw new GoneError('Report export download window has expired', 'reports.expired');
        }
        format = row.format;
        reportType = row.reportType;

        artifact = await decryptReportArtifact(row.artifactCiphertext, pariwarId, enc);
        const won = await reports.markReportExportConsumed(scopeTx.tx, reportExportId, actorId, now);
        if (!won) {
          throw new GoneError('Report export has already been downloaded', 'reports.consumed');
        }
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      const ext = format === 'json' ? 'json' : 'csv';
      reply.header('content-type', contentType);
      reply.header('content-disposition', `attachment; filename="twt-report-${reportExportId}.${ext}"`);

      // Audit AFTER — NON-PII context only. The actor's role is resolved via the SAME
      // (permissionKey → resolved scope → matching grant) chain the build worker uses (review finding:
      // picking "the first grant matching global/this Pariwar" could record the WRONG role for an actor
      // holding multiple roles in one Pariwar — this instead records the grant that actually authorized
      // the report).
      const downloadTemplate = registry.get(reportType);
      const downloadResolvedScope = downloadTemplate
        ? reports.resolveActorReportScope(grants, downloadTemplate.permissionKey, pariwarId)
        : null;
      // ⭐ Story 10.28 (D4) — the resolved scope carries N nodes, so the match is set MEMBERSHIP and
      // the FIRST hit is recorded. ⚠ [Review fix] `resolveActorReportScope` sorting `values` does NOT
      // order `grants` — `role_grants` is loaded with no `ORDER BY`, so Postgres row order is
      // unspecified. Sort `grants` locally (same key as D1(ii): `scopeValue`, then `role` as a full
      // tiebreak) so "first hit" is actually deterministic, not merely labelled so. ⚠ RESIDUAL,
      // STATED RATHER THAN SOLVED: an actor holding DIFFERENT roles at DIFFERENT nodes has ONE of
      // those roles recorded. That is not a regression — today's code has the same ambiguity with
      // LESS determinism — and it is recorded in `deferred-work.md` with no successor. ⛔ No audit
      // column, no array field, no second line.
      // ⛔ `global` carries the EMPTY set (D1(i)), and its grants carry a null `scopeValue` — so the
      // empty set matches the null-valued grant, exactly as the pre-10.28 equality did. Dropping
      // that arm would silently un-attribute every super_admin download.
      const actorRole = downloadResolvedScope
        ? ([...grants]
            .sort((a, b) =>
              (a.scopeValue ?? '') === (b.scopeValue ?? '')
                ? a.role.localeCompare(b.role)
                : (a.scopeValue ?? '').localeCompare(b.scopeValue ?? ''),
            )
            .find((g) => {
              if (g.scopeDimension !== downloadResolvedScope.dimension) return false;
              return downloadResolvedScope.values.length > 0
                ? g.scopeValue != null && downloadResolvedScope.values.includes(g.scopeValue)
                : g.scopeValue == null;
            })?.role ?? null)
        : null;
      try {
        await audit.writeAuditEntry(deps.servicePool, {
          pariwarId,
          actorId,
          actorRole,
          action: 'report.downloaded',
          resourceLocator: `report_export:${reportExportId}`,
          requestPayloadHash: createHash('sha256')
            .update(
              JSON.stringify({
                report_export_id: reportExportId,
                report_type: reportType,
                artifact_bytes: artifact.length,
              }),
            )
            .digest('hex'),
          responseStatus: 200,
          traceId: traceId || null,
        });
      } catch (auditErr) {
        console.error('[api] reports: download audit failed for', reportExportId, auditErr);
      }

      return reply.send(artifact);
    },
  };
}
