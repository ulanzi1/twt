// Ground-inspection admin routes — Story 6.7 (Task 5; AC1–AC6).
//
// Seven scope-gated admin routes under /api/v1/p/:pariwarId/admin/claims. Per-endpoint hook chains
// DIFFER (AC6 — NOT one uniform chain): all share [requireAdminSession, scopeResolutionHook,
// requirePermissionHook('claim.conduct_ground_inspection', { dimension: 'district', resolveValue })],
// but the DISTRICT RESOLVER SOURCE differs — `schedule` reads the district from the request BODY,
// `read` from the required `district` QUERY param, and every id-addressed verb from the assignment
// ROW (loaded + stashed by `resolveGroundInspectionAssignment` so the sync resolveValue can read it).
// The inspector-identity guard (D6) for complete/refusal/findings/photos is enforced IN the handler
// (it needs the assignment row + the override permission check), not as a separate chain link.

import { claim, schema as domainSchema, ids } from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createGroundInspectionHandlers } from './claims.ground-inspection.handlers.js';

const TAG = 'ground-inspection';
const CONDUCT_KEY = 'claim.conduct_ground_inspection';

// ── Zod request schemas (enum tuples derived from the ONE domain source — no drift) ──

const StageEnum = z.enum(domainSchema.GROUND_INSPECTION_STAGES);
const SiteTypeEnum = z.enum(domainSchema.GROUND_INSPECTION_SITE_TYPES);
const RefusalReasonEnum = z.enum(domainSchema.GROUND_INSPECTION_REFUSAL_REASONS);

// Structured findings are a BOUNDED, non-PII enum map (AC2 / Dev Notes "Notes model"): a fixed
// key set, each a `yes | no | unclear` verdict — NOT a free `record(string, unknown)` sink (that
// would let free-text PII into a plaintext jsonb column the console + logs treat as safe). Re-tune
// the SET by editing this DATA, never by branching logic on it.
const FINDING_KEYS = ['residence_confirmed', 'neighbours_confirmed', 'death_confirmed_visually', 'documents_seen'] as const;
const StructuredFindings = z.record(z.enum(FINDING_KEYS), z.enum(['yes', 'no', 'unclear'])).optional();

/** The scheduling attributes (shared by schedule + reschedule; the replacement's attrs on reschedule). */
const ScheduleBody = z
  .object({
    district: z.string().min(1),
    inspectionStage: StageEnum,
    inspectionSiteType: SiteTypeEnum,
    inspectorActorId: z.string().min(1),
    scheduledAt: z.string().datetime(),
    // Plaintext PII — the route encrypts before insert (never persisted/logged in the clear).
    locationDetail: z.string().min(1).nullish(),
    familyContact: z.string().min(1).nullish(),
    notes: z.string().min(1).nullish(),
    // Bounded non-PII findings map.
    structuredFindings: StructuredFindings,
  })
  .strict();

const FindingsBody = z
  .object({
    structuredFindings: StructuredFindings,
    notes: z.string().min(1).nullish(),
  })
  .strict();

const CompleteBody = z
  .object({
    structuredFindings: StructuredFindings,
    notes: z.string().min(1).nullish(),
  })
  .strict();

const RefusalBody = z
  .object({
    disposition: z.enum(['photo_refused', 'evidence_unavailable']),
    refusalReason: RefusalReasonEnum,
    // The mandatory encrypted reason note (PII) — the route encrypts before insert.
    reasonNote: z.string().min(1),
  })
  .strict();

const ClaimParam = z.object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid() }).strict();
/** Id-addressed verbs carry the pariwar + claim + assignment id in the path. */
const InspectionParam = z
  .object({ pariwarId: z.string().uuid(), claimCaseId: z.string().uuid(), ground_inspection_id: z.string().uuid() })
  .strict();
const ReadQuery = z.object({ district: z.string().min(1) }).strict();

/**
 * PreHandler: load the id-addressed assignment (tenant-scoped) + stash it on `request.groundInspection`
 * so `requirePermissionHook`'s (synchronous) resolveValue can read the assignment's OWN district (D6)
 * and the handler can reuse the row. Runs AFTER scope-resolution (needs request.scopeTx). A miss → 404.
 */
function resolveGroundInspectionAssignment(): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    if (!scopeTx) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { ground_inspection_id } = request.params as { ground_inspection_id: string };
    const found = await claim.getGroundInspectionById(
      scopeTx.tx,
      ids.pariwarId(scopeTx.pariwarId),
      ids.groundInspectionId(ground_inspection_id),
    );
    if (!found) throw new NotFoundError('Ground inspection not found', 'ground_inspection.not_found');
    request.groundInspection = found.inspection;
  };
}

export function registerGroundInspectionRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createGroundInspectionHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const resolveAssignment = resolveGroundInspectionAssignment();

  // district resolvers (synchronous — read the already-validated body / query / stashed row).
  const districtFromBody = (request: FastifyRequest): string | null =>
    (request.body as { district?: string } | undefined)?.district ?? null;
  const districtFromRow = (request: FastifyRequest): string | null => request.groundInspection?.district ?? null;
  const districtFromQuery = (request: FastifyRequest): string | null =>
    (request.query as { district?: string } | undefined)?.district ?? null;

  const conductFromBody = requirePermissionHook(deps, CONDUCT_KEY, { dimension: 'district', resolveValue: districtFromBody });
  const conductFromRow = requirePermissionHook(deps, CONDUCT_KEY, { dimension: 'district', resolveValue: districtFromRow });
  const conductFromQuery = requirePermissionHook(deps, CONDUCT_KEY, { dimension: 'district', resolveValue: districtFromQuery });

  // AC1 — schedule (district from the request body).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection',
    {
      schema: { params: ClaimParam, body: ScheduleBody, tags: [TAG] },
      preHandler: [adminSession, scope, conductFromBody],
    },
    h.schedule,
  );

  // AC1/D5 — reschedule (district from the target assignment row; district-authority op, no inspector guard).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection/:ground_inspection_id/reschedule',
    {
      schema: { params: InspectionParam, body: ScheduleBody, tags: [TAG] },
      preHandler: [adminSession, scope, resolveAssignment, conductFromRow],
    },
    h.reschedule,
  );

  // AC2 — record findings (district from row; + inspector guard in the handler).
  r.patch(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection/:ground_inspection_id',
    {
      schema: { params: InspectionParam, body: FindingsBody, tags: [TAG] },
      preHandler: [adminSession, scope, resolveAssignment, conductFromRow],
    },
    h.recordFindings,
  );

  // AC3 — upload one photo (multipart; district from row; + inspector guard in the handler).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection/:ground_inspection_id/photos',
    {
      schema: {
        params: InspectionParam,
        tags: [TAG],
        consumes: ['multipart/form-data'],
      },
      preHandler: [adminSession, scope, resolveAssignment, conductFromRow],
    },
    h.uploadPhoto,
  );

  // AC4 — complete (district from row; + inspector guard + mandatory-photo in the handler/writer).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection/:ground_inspection_id/complete',
    {
      schema: { params: InspectionParam, body: CompleteBody, tags: [TAG] },
      preHandler: [adminSession, scope, resolveAssignment, conductFromRow],
    },
    h.complete,
  );

  // AC4a — refusal disposition (district from row; + inspector guard in the handler).
  r.post(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection/:ground_inspection_id/refusal',
    {
      schema: { params: InspectionParam, body: RefusalBody, tags: [TAG] },
      preHandler: [adminSession, scope, resolveAssignment, conductFromRow],
    },
    h.refuse,
  );

  // AC5 — read the claim's assignments in one district (district from the required query param).
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection',
    {
      schema: { params: ClaimParam, querystring: ReadQuery, tags: [TAG] },
      preHandler: [adminSession, scope, conductFromQuery],
    },
    h.read,
  );
}
