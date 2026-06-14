// Audit-log route module (Story 1.11a, Task 7.2) — the on-demand integrity-
// verification endpoint (AC-2b).
//
// ── GLOBAL, not tenant-scoped ─────────────────────────────────────────────────
// POST /api/v1/audit/verify-integrity is GLOBAL — the audit chain is ONE global
// chain, so the route is NOT under /p/:pariwarId/. Placing it there would wrongly
// imply a per-tenant chain.
//
// ── Why requireAdminSession, NOT requirePermissionHook ────────────────────────
// requirePermissionHook (modules/rbac) requires `request.scopeTx`, which
// scopeResolutionHook sets from the `/:pariwarId/` path param. A GLOBAL route has
// no such param, so the RBAC hook would hard-throw 500. v1 therefore gates on an
// authenticated admin session ONLY (requireAdminSession). Recorded deferred work:
// upgrade to the full RBAC `audit.verify` gate when a global-scope preHandler
// exists. The permission-gated probe at /p/:pariwarId/audit/verify-probe stays in
// place (it exercises the scoped RBAC second-guard independently).
//
// ── URL convention ────────────────────────────────────────────────────────────
// Architecture §3.1 names /api/v1/global/<resource> for cross-Pariwar endpoints,
// but the auth module established the domain-prefix pattern (/api/v1/auth/...).
// This endpoint follows that (/api/v1/audit/...) — an intentional deviation from
// the /global/ prefix.
//
// ── Route code home ───────────────────────────────────────────────────────────
// Lives in modules/audit-log/ (route code). NOT in src/audit/, which holds Story
// 1.10's non-route writer utilities (audit-log-sink.ts / audit-sink.ts).
//
// The handler reuses deps.servicePool (the BYPASSRLS pool the 1.10 audit writer
// uses) to walk the GLOBAL chain, and calls the SAME `verifyAuditChain` @twt/jobs
// ships for the cron + post-mirror triggers — DD-4's "one function, three
// triggers".

import {
  AuditIntegrityAcknowledgeRequest,
  AuditIntegrityAcknowledgement,
  AuditIntegrityCheckList,
  AuditIntegrityCheckRequest,
  AuditIntegrityCheckResult,
} from '@twt/contracts';
import {
  resolveIntegrityAlerterFromEnv,
  resolveIntegritySinkFromEnv,
  verifyAuditChain,
} from '@twt/jobs';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';

const AUDIT_TAG = 'audit';

// ── Wire-mapping helpers (DB row → contract shape) ────────────────────────────
// These endpoints read through deps.servicePool with RAW SQL (no Drizzle handle),
// so the pg driver applies its DEFAULT type parsing: int8 (bigint) columns come
// back as STRINGS to avoid precision loss, int4 (`rows_verified`) as a number, and
// timestamptz as a JS Date. The `*_seq` values are chain sequence numbers well
// within Number.MAX_SAFE_INTEGER, so Number() is lossless here.

/** A raw `audit_integrity_checks` row as pg returns it (snake_case, bigint→string). */
interface CheckRow {
  check_id: string;
  verified_at: Date;
  chain_valid: boolean;
  start_seq: string | null;
  start_audit_id: string | null;
  end_seq: string | null;
  end_audit_id: string | null;
  first_broken_seq: string | null;
  first_broken_audit_id: string | null;
  rows_verified: number;
  verifier_actor: string;
  trigger_source: string;
}

/** A raw `audit_integrity_acknowledgements` row as pg returns it. */
interface AckRow {
  acknowledgement_id: string;
  check_id: string;
  acknowledged_at: Date;
  acknowledged_by: string;
  ticket_ref: string;
}

const seqToNumber = (v: string | null): number | null => (v === null ? null : Number(v));

function mapCheckRow(row: CheckRow): AuditIntegrityCheckResult {
  return {
    checkId: row.check_id,
    verifiedAt: row.verified_at.toISOString(),
    chainValid: row.chain_valid,
    startSeq: seqToNumber(row.start_seq),
    startAuditId: row.start_audit_id,
    endSeq: seqToNumber(row.end_seq),
    endAuditId: row.end_audit_id,
    firstBrokenSeq: seqToNumber(row.first_broken_seq),
    firstBrokenAuditId: row.first_broken_audit_id,
    rowsVerified: row.rows_verified,
    verifierActor: row.verifier_actor,
    triggerSource: row.trigger_source,
  };
}

function mapAckRow(row: AckRow): AuditIntegrityAcknowledgement {
  return {
    acknowledgementId: row.acknowledgement_id,
    checkId: row.check_id,
    acknowledgedAt: row.acknowledged_at.toISOString(),
    acknowledgedBy: row.acknowledged_by,
    ticketRef: row.ticket_ref,
  };
}

const CHECK_COLUMNS =
  'check_id, verified_at, chain_valid, start_seq, start_audit_id, end_seq, end_audit_id, ' +
  'first_broken_seq, first_broken_audit_id, rows_verified, verifier_actor, trigger_source';

/** Query schema for the history list (DD-3): bounded limit + optional trigger filter. */
const ListChecksQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(30),
    triggerSource: z.string().min(1).optional(),
  })
  .strict();

/** Path param schema for the acknowledge route. */
const AcknowledgeParams = z.object({ checkId: z.string().uuid() }).strict();

export function registerAuditLogModule(app: FastifyInstance, deps: AppDeps): void {
  const r = app.withTypeProvider<ZodTypeProvider>();
  // Resolve the observability seams once at registration (v1 = structured-log
  // fakes; the live Cloud Monitoring wiring is the Category-5 graduation, DD-5).
  const sink = resolveIntegritySinkFromEnv();
  const alerter = resolveIntegrityAlerterFromEnv();

  r.post(
    '/api/v1/audit/verify-integrity',
    {
      schema: {
        body: AuditIntegrityCheckRequest,
        response: { 200: AuditIntegrityCheckResult },
        tags: [AUDIT_TAG],
      },
      preHandler: [requireAdminSession(deps)],
    },
    async (request) => {
      // requireAdminSession guarantees userId; re-narrow for the type system.
      const userId = request.session.userId;
      if (!userId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }

      const verdict = await verifyAuditChain({
        servicePool: deps.servicePool,
        sink,
        alerter,
        verifierActor: `on-demand:${userId}`,
        triggerSource: 'on_demand',
      });

      // Map the Drizzle row → wire shape (verified_at Date → ISO-8601 string).
      return { ...verdict, verifiedAt: verdict.verifiedAt.toISOString() };
    },
  );

  // ── GET /api/v1/audit/integrity-checks — history + last-automated (Story 1.11b, DD-3) ─
  // The trustee UI's read path (AC-2): "last automated check" + "history of the
  // last 30 checks". GLOBAL, requireAdminSession-gated (NOT requirePermissionHook —
  // a global route has no request.scopeTx → the RBAC hook hard-throws 500; the
  // documented 1.11a landmine). Each item is the verdict PLUS its most-recent
  // acknowledgement (or null) so the client derives banner persistence in one read
  // (DD-5). Reads through deps.servicePool (same posture as the POST handler).
  r.get(
    '/api/v1/audit/integrity-checks',
    {
      schema: {
        querystring: ListChecksQuery,
        response: { 200: AuditIntegrityCheckList },
        tags: [AUDIT_TAG],
      },
      preHandler: [requireAdminSession(deps)],
    },
    async (request) => {
      const { limit, triggerSource } = request.query as z.infer<typeof ListChecksQuery>;

      // Recent-first, optionally filtered to one trigger source (e.g. `cron`).
      const params: unknown[] = [];
      let where = '';
      if (triggerSource) {
        params.push(triggerSource);
        where = `WHERE trigger_source = $${params.length}`;
      }
      params.push(limit);
      const checksResult = await deps.servicePool.query<CheckRow>(
        `SELECT ${CHECK_COLUMNS} FROM audit_integrity_checks ${where} ` +
          `ORDER BY verified_at DESC, check_id ASC LIMIT $${params.length}`,
        params,
      );

      const checkIds = checksResult.rows.map((row) => row.check_id);
      // Most-recent acknowledgement per check (for banner persistence). One round
      // trip for all the listed checks; grouped client-side.
      const latestAckByCheckId = new Map<string, AuditIntegrityAcknowledgement>();
      if (checkIds.length > 0) {
        const acksResult = await deps.servicePool.query<AckRow>(
          'SELECT acknowledgement_id, check_id, acknowledged_at, acknowledged_by, ticket_ref ' +
            'FROM audit_integrity_acknowledgements WHERE check_id = ANY($1) ' +
            'ORDER BY acknowledged_at DESC, acknowledgement_id ASC',
          [checkIds],
        );
        for (const ack of acksResult.rows) {
          // Rows are newest-first → keep the FIRST seen per check_id.
          if (!latestAckByCheckId.has(ack.check_id)) {
            latestAckByCheckId.set(ack.check_id, mapAckRow(ack));
          }
        }
      }

      return checksResult.rows.map((row) => ({
        ...mapCheckRow(row),
        acknowledgement: latestAckByCheckId.get(row.check_id) ?? null,
      }));
    },
  );

  // ── POST /api/v1/audit/integrity-checks/:checkId/acknowledge (Story 1.11b, DD-5) ─
  // Acknowledge a (failed) check + record the external investigation-ticket ref —
  // the v1 artifact that satisfies AC-5's "investigation ticket is opened". Writes
  // an append-only row to the SEPARATE audit_integrity_acknowledgements table
  // (audit_integrity_checks stays immutable). requireAdminSession ONLY — the global
  // originCheckHook + SameSite=Lax cookie is the CSRF baseline (ADR-0009);
  // `app.csrfProtection` double-submit is restricted to `logout` and is NOT added
  // to new write routes without an ADR amendment (1.11a review, Group 3).
  r.post(
    '/api/v1/audit/integrity-checks/:checkId/acknowledge',
    {
      schema: {
        params: AcknowledgeParams,
        body: AuditIntegrityAcknowledgeRequest,
        response: { 200: AuditIntegrityAcknowledgement },
        tags: [AUDIT_TAG],
      },
      preHandler: [requireAdminSession(deps)],
    },
    async (request) => {
      const userId = request.session.userId;
      if (!userId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { checkId } = request.params as z.infer<typeof AcknowledgeParams>;
      const { ticketRef } = request.body as AuditIntegrityAcknowledgeRequest;

      // Resolve a precise 404 rather than leaking the raw FK violation (23503) as a 500.
      const exists = await deps.servicePool.query(
        'SELECT 1 FROM audit_integrity_checks WHERE check_id = $1',
        [checkId],
      );
      if ((exists.rowCount ?? 0) === 0) {
        throw new NotFoundError('Integrity check not found', 'audit.check_not_found');
      }

      const inserted = await deps.servicePool.query<AckRow>(
        'INSERT INTO audit_integrity_acknowledgements (check_id, acknowledged_by, ticket_ref) ' +
          'VALUES ($1, $2, $3) ' +
          'RETURNING acknowledgement_id, check_id, acknowledged_at, acknowledged_by, ticket_ref',
        [checkId, userId, ticketRef],
      );

      return mapAckRow(inserted.rows[0]!);
    },
  );
}
