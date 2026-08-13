// Ground-inspection admin routes — Story 6.7 (Task 5; AC1–AC6).
//
// Seven scope-gated admin routes under /api/v1/p/:pariwarId/admin/claims. Per-endpoint hook chains
// DIFFER (AC6 — NOT one uniform chain): all share [requireAdminSession, scopeResolutionHook,
// requirePermissionHook('claim.conduct_ground_inspection', { resolveDimension, resolveValue })],
// but the LOCATOR SOURCE differs — `schedule` reads it from the request BODY, `read` from the
// query, and every id-addressed verb from the assignment ROW (loaded + stashed by
// `resolveGroundInspectionAssignment` so the sync resolvers can read it).
// The inspector-identity guard (D6) for complete/refusal/findings/photos is enforced IN the handler
// (it needs the assignment row + the override permission check), not as a separate chain link.
//
// ── ⭐ STORY 6.17 — THE GATE DIMENSION IS A PROPERTY OF THE ROW, NOT OF THE ROUTE ───────────────
// Decision `2026-08-13-104`, D2. A locator carrying a `block` is checked at `dimension: 'block'`;
// one carrying none is checked at `dimension: 'district'`, byte-identically to Story 6.7. Both
// halves are resolved per request INSIDE the hook closure (`resolveDimension` + `resolveValue`),
// because `requirePermissionHook`'s plain `dimension` option is captured once at construction time
// and one route registration serves both row shapes.
//   ⛔ NOT an unconditional block gate — that would make every pre-6.17 row unreachable AND revoke
//      district_admin in every Pariwar with no published tree (i.e. every Pariwar: there is no
//      writer surface and no code default geography, ADR-0038). It would ship as a total outage.
//   ⛔ NOT an OR of two checks — strictly wider than either gate, and it would deliver the ancestry
//      outcome while deleting the ancestry mechanism.
//   ⛔ NO FALLBACK when the tree is absent (D6) — a block-tagged row in a treeless Pariwar DENIES
//      the district_admin ancestry path. Absence must DENY, never widen: a grant-on-absence rule
//      makes the absence of data widen authorization and makes publishing a tree narrow it. There
//      is deliberately no code below that inspects `request.geoTree` to decide a dimension.
//   ⛔ The resolvers stay SYNCHRONOUS and do NO I/O — `rbac.hasPermission` is a pure predicate
//      (ADR-0008 Decision 8), and the row is already stashed on `request.groundInspection`.

import { claim, schema as domainSchema, ids, type rbac } from '@twt/domain';
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
    // Story 6.17 — OPTIONAL. Present ⇒ the assignment is gated at `dimension: 'block'`; absent ⇒ at
    // `dimension: 'district'`, exactly as before. ⛔ Stored byte-as-supplied: no `.trim()`, no
    // case-folding — `geo-tree/resolver.ts` made that exact commitment for that exact reason, and a
    // route that case-folded while the tree did not would resolve `Bihar ⊇ patna` but not
    // `Patna ⊇ patna` within ONE request. ⛔ Immutable on reschedule (D3).
    block: z.string().min(1).optional(),
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
/**
 * AC5 read locator — Story 6.17 (D4): EXACTLY ONE of `district` / `block`.
 *
 * The route required `?district=` before this story, which a `block_admin` can never satisfy (its
 * `block` scopeCeiling cannot reach a district-dimension check). Now the gate resolves its dimension
 * from whichever locator the operator supplied.
 * ⛔ BOTH ⇒ 400, never a silent precedence rule — a request that names two jurisdictions has not
 *    said which one it is asking authorization for.
 * ⛔ NEITHER ⇒ 400 — it must never degrade into "return every assignment on the claim"; that is the
 *    6.10 console's cross-district view, reached through a different key.
 */
const ReadQuery = z
  .object({ district: z.string().min(1).optional(), block: z.string().min(1).optional() })
  .strict()
  .refine((q) => (q.district === undefined) !== (q.block === undefined), {
    message: 'Supply exactly one of `district` or `block`',
  });

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

  // ── The locator resolvers (synchronous — read the already-validated body / query / stashed row) ──
  //
  // ⭐ ONE RULE, APPLIED AT THREE SOURCES (Story 6.17, D2): a locator with a block is a BLOCK
  // locator; one without is a DISTRICT locator. `blockAware` turns any "{ district, block }" source
  // into the (dimension, value) pair the gate needs, so the rule is written ONCE and cannot drift
  // between the body, the row and the query.
  type Locator = { district?: string | null; block?: string | null };

  const blockAware = (from: (request: FastifyRequest) => Locator | undefined) => ({
    resolveDimension: (request: FastifyRequest): rbac.ScopeDimension =>
      from(request)?.block != null ? 'block' : 'district',
    resolveValue: (request: FastifyRequest): string | null => {
      const loc = from(request);
      // A null value fails closed in the domain predicate — an unresolved locator never allows.
      return (loc?.block != null ? loc.block : loc?.district) ?? null;
    },
  });

  const fromBody = (request: FastifyRequest): Locator | undefined => request.body as Locator | undefined;
  // The assignment ROW — the authoritative locator for every id-addressed verb. This is the row the
  // `resolveGroundInspectionAssignment` preHandler already loaded, so reading it costs no I/O.
  const fromRow = (request: FastifyRequest): Locator | undefined => request.groundInspection;
  const fromQuery = (request: FastifyRequest): Locator | undefined => request.query as Locator | undefined;

  const conductFromBody = requirePermissionHook(deps, CONDUCT_KEY, blockAware(fromBody));
  const conductFromRow = requirePermissionHook(deps, CONDUCT_KEY, blockAware(fromRow));
  const conductFromQuery = requirePermissionHook(deps, CONDUCT_KEY, blockAware(fromQuery));

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

  // AC5 — read the claim's assignments under ONE locator: `?district=` OR `?block=`, exactly one
  // (Story 6.17, D4). The gate resolves its dimension from whichever was supplied.
  r.get(
    '/api/v1/p/:pariwarId/admin/claims/:claimCaseId/ground-inspection',
    {
      schema: { params: ClaimParam, querystring: ReadQuery, tags: [TAG] },
      preHandler: [adminSession, scope, conductFromQuery],
    },
    h.read,
  );
}
