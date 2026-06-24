// T&C version-registry route module — Story 2.6 (Task 6; AC6, AC7).
//
// The trustee WRITE surface for the T&C registry: create a version-pinned T&C and
// approve it. Mirrors the Story 2.4 rules module: the `/p/:pariwarId/`-scoped chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook], audit-or-throw
// writes, and a responses mapper. Create gates on `tc.publish`; approve on
// `tc.approve`. No read endpoint ships in 2.6 (the story's "no admin UI" scope
// fence) — the public `/terms` page reads the registry directly via withPublicScope.
//
// ── Audit-or-throw (mirror the rules publish path) ───────────────────────────
// The audit ledger cannot back-fill audit_id, so the audit line is written FIRST
// (via the service pool), then the domain write runs in the request's scope tx. A
// throw anywhere propagates → the scope tx rolls back → no version/approval without
// an audit line. The tc_version_id is PRE-GENERATED so the audit provenance digest
// + resource locator reference the exact id.

import { createHash, randomUUID } from 'node:crypto';

import {
  ApproveTcVersionRequest,
  CreateTcVersionRequest,
  TcVersionResponse,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, type Db, ids, termsAndConditions } from '@twt/domain';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { toTcVersionResponse } from './responses.js';

const TC_TAG = 'terms-and-conditions';
const PUBLISH_KEY = 'tc.publish';
const APPROVE_KEY = 'tc.approve';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const VersionParam = z
  .object({ pariwarId: z.string().uuid(), tcVersionId: z.string().uuid() })
  .strict();

type ClauseVersionId = ReturnType<typeof ids.clauseVersionId>;

export function registerTermsModule(app: FastifyInstance, deps: AppDeps): void {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const named = namedRateLimits(deps);
  const session = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const publish = requirePermissionHook(deps, PUBLISH_KEY);
  const approve = requirePermissionHook(deps, APPROVE_KEY);

  const base = '/api/v1/p/:pariwarId/terms';
  const pid = (request: FastifyRequest): ReturnType<typeof ids.pariwarId> =>
    ids.pariwarId(scopeTxPariwarId(request));
  const tx = (request: FastifyRequest): Db => scopeTxOf(request);

  // ── POST /versions — create a version-pinned T&C (audit-or-throw) ────────────
  r.post(
    `${base}/versions`,
    {
      schema: {
        params: PariwarParam,
        body: CreateTcVersionRequest,
        response: { 200: TcVersionResponse },
        tags: [TC_TAG],
      },
      preHandler: [session, scope, publish],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const body = request.body as z.infer<typeof CreateTcVersionRequest>;
      const pariwarId = pid(request);
      const handle = tx(request);
      const actorId = request.requestContext.actorId ?? null;
      const traceId = request.requestContext.traceId;

      const pinned = body.pinnedToClauseVersionIds.map(
        (x) => x as unknown as ClauseVersionId,
      );

      // Pre-generate the id so the (audit-first) line references the exact tc_version_id.
      const tcVersionId = ids.tcVersionId(randomUUID());
      // The single audit line's hash commits to the provenance (pinned set +
      // tc_version_id + transition) — a digest, never raw copy. Version is excluded:
      // it is computed inside the domain write and can diverge under concurrent creates,
      // making it unstable to embed here.
      const provenance = {
        pinned_to_clause_version_ids: [...pinned].sort(),
        tc_version_id: tcVersionId,
        transition: 'create',
      };
      const requestPayloadHash = createHash('sha256')
        .update(canonicalJsonStringify(provenance), 'utf8')
        .digest('hex');

      // (audit-or-throw) — a throw propagates → scope tx rolls back → no version
      // without an audit line.
      const auditRow = await audit.writeAuditEntry(deps.servicePool, {
        pariwarId,
        actorId,
        actorRole: null,
        action: 'terms_and_conditions.version_created',
        resourceLocator: `tc:version:${tcVersionId}`,
        requestPayloadHash,
        responseStatus: 200,
        traceId,
      });

      const row = await termsAndConditions.createTcVersion(handle, {
        pariwarId,
        bodyMarkdown: body.bodyMarkdown,
        pinnedClauseVersionIds: pinned,
        effectiveFrom: new Date(body.effectiveFrom),
        authoredByActor: actorId,
        auditId: auditRow.auditId,
        tcVersionId,
      });

      const pins = await termsAndConditions.listPinnedClauses(handle, pariwarId, row.tcVersionId);
      return toTcVersionResponse(row, pins);
    },
  );

  // ── POST /versions/:tcVersionId/approve — approve + supersede prior ───────────
  r.post(
    `${base}/versions/:tcVersionId/approve`,
    {
      schema: {
        params: VersionParam,
        body: ApproveTcVersionRequest,
        response: { 200: TcVersionResponse },
        tags: [TC_TAG],
      },
      preHandler: [session, scope, approve],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const { tcVersionId: rawId } = request.params as z.infer<typeof VersionParam>;
      const pariwarId = pid(request);
      const handle = tx(request);
      const actorId = request.requestContext.actorId as string;
      const traceId = request.requestContext.traceId;
      const tcVersionId = ids.tcVersionId(rawId);

      // Pre-validate BEFORE the audit write — never write an audit line for a doomed
      // approve (absent version → 404; already approved/superseded → 409).
      const target = await termsAndConditions.resolveByTcVersionId(handle, pariwarId, tcVersionId);
      if (!target) throw new termsAndConditions.TcVersionNotFoundError(pariwarId, tcVersionId);
      if (
        target.legalReviewStatus === 'approved' ||
        target.legalReviewStatus === 'superseded'
      ) {
        throw new termsAndConditions.TcStateError(
          tcVersionId,
          target.legalReviewStatus,
          `cannot approve a ${target.legalReviewStatus} version`,
        );
      }

      // The prior currently-effective (open-ended) version to supersede, if a
      // DIFFERENT one exists (genesis approval has none — the target is already open).
      const prior = await termsAndConditions.currentOpenTcVersion(handle, pariwarId);
      const priorToSupersede =
        prior && prior.tcVersionId !== target.tcVersionId ? prior : null;

      const provenance = {
        tc_version_id: tcVersionId,
        prior_tc_version_id: priorToSupersede?.tcVersionId ?? null,
        transition: 'approve',
      };
      const requestPayloadHash = createHash('sha256')
        .update(canonicalJsonStringify(provenance), 'utf8')
        .digest('hex');

      // (audit-or-throw) — captured so the approve-event auditId threads to both
      // the superseded row and the newly-approved row (both carry the same audit ref).
      const auditRow = await audit.writeAuditEntry(deps.servicePool, {
        pariwarId,
        actorId,
        actorRole: null,
        action: 'terms_and_conditions.version_approved',
        resourceLocator: `tc:version:${tcVersionId}`,
        requestPayloadHash,
        responseStatus: 200,
        traceId,
      });

      // Close the prior FIRST (partial-unique safe), then open + approve the target.
      if (priorToSupersede) {
        await termsAndConditions.supersedeTcVersion(handle, {
          pariwarId,
          tcVersionId: priorToSupersede.tcVersionId,
          auditId: auditRow.auditId,
        });
      }
      const approved = await termsAndConditions.approveTcVersion(handle, {
        pariwarId,
        tcVersionId,
        legalReviewerActorId: actorId,
        auditId: auditRow.auditId,
      });

      const pins = await termsAndConditions.listPinnedClauses(
        handle,
        pariwarId,
        approved.tcVersionId,
      );
      return toTcVersionResponse(approved, pins);
    },
  );
}

/** The scope-bound Drizzle handle for a scoped request (asserted present by the chain). */
function scopeTxOf(request: FastifyRequest): Db {
  const scopeTx = request.scopeTx;
  if (!scopeTx) throw new Error('[terms] handler ran without scope resolution');
  return scopeTx.tx;
}

/** The active Pariwar id of a scoped request (asserted present by the chain). */
function scopeTxPariwarId(request: FastifyRequest): string {
  const scopeTx = request.scopeTx;
  if (!scopeTx) throw new Error('[terms] handler ran without scope resolution');
  return scopeTx.pariwarId;
}
