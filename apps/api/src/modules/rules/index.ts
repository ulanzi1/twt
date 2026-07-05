// Niyamavali amendment-workflow route module — Story 2.4 (Task 4; AC1-AC5).
//
// The first `/p/:pariwarId/`-scoped admin surface. It turns the Story 2.3 registry
// PRIMITIVE (clause_versions + niyamavali.* accessors) into a trustee WORKFLOW:
// author → edit draft → preview diff → submit for review → non-author sign-off →
// audit-logged publish. It is the FIRST CONSUMER of Story 2.2's tone-review gate
// (mounted on the publish route) and the owner of the audit-or-throw publish path.
//
// Every route runs the established scoped chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook]; reads accept
// niyamavali.amend OR niyamavali.review (the non-author reviewer must load content),
// writes require niyamavali.amend, sign-off requires niyamavali.review.
//
// ── Publish sequencing (audit-or-throw, AC2/AC5) — ADR-0021 ───────────────────
// The amendment ledger is append-only (no audit_id back-fill), so the audit line is
// written FIRST and passed into createClause/amendClause, which insert the version
// (+ amendment) rows with audit_id NON-NULL at INSERT. The clause_version_id is
// PRE-GENERATED so the single audit line's provenance hash + resource locator carry
// it (AC2). If the audit write throws, it propagates → the scope tx rolls back → no
// published clause without an audit line (AC5).

import { createHash, randomUUID } from 'node:crypto';

import {
  AmendClauseDraftRequest as _AmendClauseDraftRequest,
  ClauseDraftResponse,
  ClauseDraftStatusSchema,
  ClauseIdSchema,
  ClauseVersionResponse,
  CreateDraftBody,
  DiffPreviewResponse,
  NiyamavaliAmendmentResponse,
  PublishClauseResponse,
  ToneReviewSignoffRequest,
  UpdateClauseDraftRequest,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  type Db,
  ids,
  niyamavali,
  rbac,
  type schema,
  validityCache,
} from '@twt/domain';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { ConflictError } from '../../http-errors.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { auditAuthorizationDenied, requirePermissionHook } from '../rbac/index.js';
import { recordToneReviewSignoff, requireToneReviewSignoff } from '../tone-review/index.js';
import { renderDisplayDiff } from './render-diff.js';
import {
  toAmendmentResponse,
  toClauseDraftResponse,
  toClauseVersionResponse,
} from './responses.js';

const NIY_TAG = 'niyamavali';
const AMEND_KEY = 'niyamavali.amend';
const REVIEW_KEY = 'niyamavali.review';

// Avoid an unused-import lint on the re-exported arm type (kept for documentation /
// future per-arm handler typing — the discriminated CreateDraftBody is the wire body).
void _AmendClauseDraftRequest;

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const ClauseParam = z.object({ pariwarId: z.string().uuid(), clauseId: ClauseIdSchema }).strict();
const DraftParam = z.object({ pariwarId: z.string().uuid(), draftId: z.string().uuid() }).strict();
const ListQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
const DraftListQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    status: ClauseDraftStatusSchema.optional(),
  })
  .strict();

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/**
 * Read-access gate: allow if the actor holds niyamavali.amend OR niyamavali.review at
 * the active Pariwar (the non-author reviewer needs read access to the draft + diff).
 * On deny it routes through `requirePermission` (keyed on amend) for the standard
 * audited 403 — the requirePermissionHook precedent.
 */
function requireNiyamavaliReadAccess(deps: AppDeps): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new Error('[rules] read gate ran without session + scope-resolution');
    }
    const grants = request.scopeGrants ?? [];
    const resource = {
      dimension: 'pariwar' as const,
      value: scopeTx.pariwarId,
      pariwarId: scopeTx.pariwarId,
    };
    if (
      rbac.hasPermission(grants, AMEND_KEY, resource) ||
      rbac.hasPermission(grants, REVIEW_KEY, resource)
    ) {
      return;
    }
    // Neither held → standard audited denial (keyed on amend for the 403 message).
    rbac.requirePermission(
      { actorId, grants, key: AMEND_KEY, resource },
      { onAuthorizationDenied: auditAuthorizationDenied(deps, request, actorId, scopeTx.pariwarId) },
    );
  };
}

// Per-request stash so the publish gate's SYNC resolveAuthoredBy + resolveSignoff and
// the handler all share the one draft load (no augmenting FastifyRequest globally).
const publishDraftStash = new WeakMap<FastifyRequest, schema.ClauseDraftRow>();

export function registerRulesModule(app: FastifyInstance, deps: AppDeps): void {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const named = namedRateLimits(deps);
  const session = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const amend = requirePermissionHook(deps, AMEND_KEY);
  const review = requirePermissionHook(deps, REVIEW_KEY);
  const read = requireNiyamavaliReadAccess(deps);

  const base = '/api/v1/p/:pariwarId/niyamavali';
  const pid = (request: FastifyRequest): ReturnType<typeof ids.pariwarId> =>
    ids.pariwarId(scopeTxPariwarId(request));
  const tx = (request: FastifyRequest): Db => scopeTxOf(request);

  // ── GET /clauses — list the registry (latest version per clause) ─────────────
  r.get(
    `${base}/clauses`,
    {
      schema: {
        params: PariwarParam,
        querystring: ListQuery,
        response: { 200: z.array(ClauseVersionResponse) },
        tags: [NIY_TAG],
      },
      preHandler: [session, scope, read],
      config: { rateLimit: named.read },
    },
    async (request) => {
      const { limit } = request.query as z.infer<typeof ListQuery>;
      const rows = await niyamavali.listClauses(tx(request), pid(request), { limit });
      return rows.map(toClauseVersionResponse);
    },
  );

  // ── GET /clauses/:clauseId/versions — version history (AC1a) ──────────────────
  r.get(
    `${base}/clauses/:clauseId/versions`,
    {
      schema: {
        params: ClauseParam,
        querystring: ListQuery,
        response: { 200: z.array(ClauseVersionResponse) },
        tags: [NIY_TAG],
      },
      preHandler: [session, scope, read],
      config: { rateLimit: named.read },
    },
    async (request) => {
      const { clauseId } = request.params as z.infer<typeof ClauseParam>;
      const { limit } = request.query as z.infer<typeof ListQuery>;
      const rows = await niyamavali.versionsOfClause(
        tx(request),
        pid(request),
        clauseId as unknown as ReturnType<typeof ids.clauseId>,
      );
      // Forced-pagination bound (Story 1.14): cap the most-recent `limit` versions
      // (history is small by construction — a clause has few versions).
      const bounded = rows.slice(Math.max(0, rows.length - limit));
      return bounded.map(toClauseVersionResponse);
    },
  );

  // ── GET /amendments — time-ordered ledger (De4 index) ────────────────────────
  r.get(
    `${base}/amendments`,
    {
      schema: {
        params: PariwarParam,
        querystring: ListQuery,
        response: { 200: z.array(NiyamavaliAmendmentResponse) },
        tags: [NIY_TAG],
      },
      preHandler: [session, scope, read],
      config: { rateLimit: named.read },
    },
    async (request) => {
      const { limit } = request.query as z.infer<typeof ListQuery>;
      const rows = await niyamavali.listAmendments(tx(request), pid(request), { limit });
      return rows.map(toAmendmentResponse);
    },
  );

  // ── GET /clauses/drafts — list drafts (optionally by status) ─────────────────
  r.get(
    `${base}/clauses/drafts`,
    {
      schema: {
        params: PariwarParam,
        querystring: DraftListQuery,
        response: { 200: z.array(ClauseDraftResponse) },
        tags: [NIY_TAG],
      },
      preHandler: [session, scope, read],
      config: { rateLimit: named.read },
    },
    async (request) => {
      const { limit, status } = request.query as z.infer<typeof DraftListQuery>;
      const rows = await niyamavali.listDrafts(tx(request), pid(request), { limit, status });
      return rows.map(toClauseDraftResponse);
    },
  );

  // ── POST /clauses/drafts — create a draft (create | amend) ───────────────────
  r.post(
    `${base}/clauses/drafts`,
    {
      schema: {
        params: PariwarParam,
        body: CreateDraftBody,
        response: { 200: ClauseDraftResponse },
        tags: [NIY_TAG],
      },
      preHandler: [session, scope, amend],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const body = request.body as z.infer<typeof CreateDraftBody>;
      const pariwarId = pid(request);
      const clauseId = body.clauseId as unknown as ReturnType<typeof ids.clauseId>;
      const actorId = request.requestContext.actorId as string;
      const handle = tx(request);

      try {
        if (body.operation === 'create') {
          // Surface a clause-id conflict early (publish re-checks authoritatively).
          const existing = await niyamavali.latestVersionRow(handle, pariwarId, clauseId);
          if (existing) throw new niyamavali.ClauseIdConflictError(pariwarId, clauseId);
          const draft = await niyamavali.createDraft(handle, {
            pariwarId,
            clauseId,
            operation: 'create',
            payload: body.payload,
            effectiveDate: new Date(body.effectiveDate),
            benefitMechanism: body.benefitMechanism,
            affectedMemberScope: null,
            authoredByActor: actorId,
          });
          return toClauseDraftResponse(draft);
        }
        // amend — pre-check existence + default the mechanism from the prior head.
        const prior = await niyamavali.latestVersionRow(handle, pariwarId, clauseId);
        if (!prior) throw new niyamavali.ClauseNotFoundError(pariwarId, clauseId);
        const draft = await niyamavali.createDraft(handle, {
          pariwarId,
          clauseId,
          operation: 'amend',
          payload: body.payload,
          effectiveDate: new Date(body.effectiveDate),
          benefitMechanism: body.benefitMechanism ?? prior.benefitMechanism,
          affectedMemberScope: body.affectedMemberScope as unknown as schema.AffectedMemberScope,
          authoredByActor: actorId,
        });
        return toClauseDraftResponse(draft);
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new ConflictError(
            'An open draft already exists for this clause',
            'niyamavali.draft_exists',
            { clause_id: clauseId },
          );
        }
        throw err;
      }
    },
  );

  // ── GET /clauses/drafts/:draftId — load a single draft (reviewer reads it) ───
  r.get(
    `${base}/clauses/drafts/:draftId`,
    {
      schema: { params: DraftParam, response: { 200: ClauseDraftResponse }, tags: [NIY_TAG] },
      preHandler: [session, scope, read],
      config: { rateLimit: named.read },
    },
    async (request) => {
      const { draftId } = request.params as z.infer<typeof DraftParam>;
      const draft = await niyamavali.getDraftOrThrow(
        tx(request),
        pid(request),
        ids.clauseDraftId(draftId),
      );
      return toClauseDraftResponse(draft);
    },
  );

  // ── PUT /clauses/drafts/:draftId — edit a draft (resets the sign-off) ────────
  r.put(
    `${base}/clauses/drafts/:draftId`,
    {
      schema: {
        params: DraftParam,
        body: UpdateClauseDraftRequest,
        response: { 200: ClauseDraftResponse },
        tags: [NIY_TAG],
      },
      preHandler: [session, scope, amend],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const { draftId } = request.params as z.infer<typeof DraftParam>;
      const body = request.body as z.infer<typeof UpdateClauseDraftRequest>;
      const draft = await niyamavali.updateDraft(
        tx(request),
        pid(request),
        ids.clauseDraftId(draftId),
        {
          ...(body.payload !== undefined ? { payload: body.payload } : {}),
          ...(body.effectiveDate !== undefined
            ? { effectiveDate: new Date(body.effectiveDate) }
            : {}),
          ...(body.benefitMechanism !== undefined
            ? { benefitMechanism: body.benefitMechanism }
            : {}),
          ...(body.affectedMemberScope !== undefined
            ? {
                affectedMemberScope:
                  body.affectedMemberScope as unknown as schema.AffectedMemberScope | null,
              }
            : {}),
        },
      );
      return toClauseDraftResponse(draft);
    },
  );

  // ── GET /clauses/drafts/:draftId/diff — structured + rendered diff (AC1c) ─────
  r.get(
    `${base}/clauses/drafts/:draftId/diff`,
    {
      schema: { params: DraftParam, response: { 200: DiffPreviewResponse }, tags: [NIY_TAG] },
      preHandler: [session, scope, read],
      config: { rateLimit: named.read },
    },
    async (request) => {
      const { draftId } = request.params as z.infer<typeof DraftParam>;
      const pariwarId = pid(request);
      const handle = tx(request);
      const draft = await niyamavali.getDraftOrThrow(handle, pariwarId, ids.clauseDraftId(draftId));

      let prevPayload: schema.ClausePayload = {};
      if (draft.operation === 'amend') {
        // asOf left to DB now() (DB-authoritative time, §1.11 — no app-server clock).
        const current = await niyamavali.resolveByClauseId(handle, pariwarId, draft.clauseId);
        prevPayload = current?.payload ?? {};
      }
      const structuredDiff = niyamavali.computePayloadDiff(prevPayload, draft.payload);
      const renderedDiff = renderDisplayDiff(prevPayload, draft.payload);
      return { structuredDiff, renderedDiff } satisfies z.infer<typeof DiffPreviewResponse>;
    },
  );

  // ── POST /clauses/drafts/:draftId/submit-for-review ──────────────────────────
  r.post(
    `${base}/clauses/drafts/:draftId/submit-for-review`,
    {
      schema: { params: DraftParam, response: { 200: ClauseDraftResponse }, tags: [NIY_TAG] },
      preHandler: [session, scope, amend],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const { draftId } = request.params as z.infer<typeof DraftParam>;
      const draft = await niyamavali.submitForReview(
        tx(request),
        pid(request),
        ids.clauseDraftId(draftId),
      );
      return toClauseDraftResponse(draft);
    },
  );

  // ── POST /clauses/drafts/:draftId/tone-review — non-author sign-off (AC4) ─────
  r.post(
    `${base}/clauses/drafts/:draftId/tone-review`,
    {
      schema: {
        params: DraftParam,
        body: ToneReviewSignoffRequest,
        response: { 200: ClauseDraftResponse },
        tags: [NIY_TAG],
      },
      preHandler: [session, scope, review],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const { draftId } = request.params as z.infer<typeof DraftParam>;
      const pariwarId = pid(request);
      const handle = tx(request);
      const reviewer = request.requestContext.actorId as string;
      const draftId_ = ids.clauseDraftId(draftId);

      // Load to compute the content hash + the resource locator for the audit emission.
      const before = await niyamavali.getDraftOrThrow(handle, pariwarId, draftId_);
      const contentHash = niyamavali.draftContentHash(before.payload);
      const draft = await niyamavali.recordDraftSignoff(handle, pariwarId, draftId_, {
        reviewedBy: reviewer,
        contentHash,
        reviewedAt: deps.clock(),
      });
      // Story 2.2 audit emission (tone_review.signoff) — the durable record is the
      // clause_drafts row; this is the tamper-evident audit line.
      recordToneReviewSignoff(deps, {
        reviewedBy: reviewer,
        resourceLocator: niyamavali.draftResourceLocator(draft.clauseId),
        contentHash,
        pariwarId,
        traceId: request.requestContext.traceId,
      });
      return toClauseDraftResponse(draft);
    },
  );

  // ── POST /clauses/drafts/:draftId/publish — audit-logged, tone-review-gated ───
  const loadDraftForPublish: preHandlerHookHandler = async (request) => {
    const { draftId } = request.params as z.infer<typeof DraftParam>;
    // FOR UPDATE: serializes concurrent publish requests for the same draft so a
    // second request re-reads post-commit state and fails the signed_off check
    // before any audit-or-throw write happens (closes the publish TOCTOU race).
    const draft = await niyamavali.getDraftForUpdateOrThrow(
      tx(request),
      pid(request),
      ids.clauseDraftId(draftId),
    );
    publishDraftStash.set(request, draft);
  };
  const publishGate = requireToneReviewSignoff(deps, {
    resolveAuthoredBy: (request) => stashedDraft(request).authoredByActor,
    resolveResourceLocator: (request) =>
      niyamavali.draftResourceLocator(stashedDraft(request).clauseId),
    resolveSignoff: (request) => niyamavali.signoffFromDraftRow(stashedDraft(request)),
  });

  r.post(
    `${base}/clauses/drafts/:draftId/publish`,
    {
      schema: { params: DraftParam, response: { 200: PublishClauseResponse }, tags: [NIY_TAG] },
      preHandler: [session, scope, amend, loadDraftForPublish, publishGate],
      config: { rateLimit: named.write },
    },
    async (request) => {
      const handle = tx(request);
      const pariwarId = pid(request);
      const draft = stashedDraft(request);
      const actorId = request.requestContext.actorId ?? null;
      const traceId = request.requestContext.traceId;

      // Compute the diff (prev published payload for amend; {} for create).
      let prevPayload: schema.ClausePayload = {};
      if (draft.operation === 'amend') {
        const current = await niyamavali.resolveByClauseId(handle, pariwarId, draft.clauseId);
        prevPayload = current?.payload ?? {};
      }
      const diff = niyamavali.computePayloadDiff(prevPayload, draft.payload);

      // Validate the amend-required field BEFORE the audit write — an audit line must
      // never be written for a publish attempt that is already certain to fail.
      const scopeDecl = draft.operation === 'amend' ? draft.affectedMemberScope : null;
      if (draft.operation === 'amend' && !scopeDecl) {
        throw new niyamavali.DraftStateError(
          draft.draftId,
          draft.status,
          'an amend draft must carry affected_member_scope',
        );
      }

      // Pre-generate the version id so the (audit-first) line references the exact cvid.
      const clauseVersionId = ids.clauseVersionId(randomUUID());

      // The single audit line's hash commits to the full provenance (AC2): diff +
      // clause_id + clause_version_id + tone-reviewer attribution — a digest, never raw copy.
      const provenance = {
        diff_document: diff,
        clause_id: draft.clauseId,
        clause_version_id: clauseVersionId,
        tone_reviewed_by: draft.toneReviewedBy,
        tone_reviewed_at: draft.toneReviewedAt ? draft.toneReviewedAt.toISOString() : null,
        operation: draft.operation,
      };
      const requestPayloadHash = createHash('sha256')
        .update(canonicalJsonStringify(provenance), 'utf8')
        .digest('hex');

      // (audit-or-throw) — a throw here propagates → scope tx rolls back → AC5 holds.
      const auditRow = await audit.writeAuditEntry(deps.servicePool, {
        pariwarId,
        actorId,
        actorRole: null,
        action: 'niyamavali.amended',
        resourceLocator: `niyamavali:clause:${draft.clauseId}:version:${clauseVersionId}`,
        requestPayloadHash,
        responseStatus: 200,
        traceId,
      });
      const auditId = auditRow.auditId;

      // Mint the immutable version (+ amendment row) — both carry audit_id at INSERT (AC5).
      let version: number;
      if (draft.operation === 'create') {
        const row = await niyamavali.createClause(handle, {
          pariwarId,
          clauseId: draft.clauseId,
          effectiveDate: draft.effectiveDate,
          payload: draft.payload,
          benefitMechanism: draft.benefitMechanism,
          authoredByActor: draft.authoredByActor,
          auditId,
          clauseVersionId,
        });
        version = row.version;
        // Story 4.8 (AC1a / D4-A) — a create publishes a new clause version that can become applicable to
        // existing members, so conservatively invalidate the whole cohort in the SAME publish tx. (The
        // amend branch bumps INSIDE amendClause, so it is NOT bumped here — no double-bump.)
        await validityCache.bumpCohortEpoch(handle, pariwarId);
      } else {
        const { version: row } = await niyamavali.amendClause(handle, {
          pariwarId,
          clauseId: draft.clauseId,
          payload: draft.payload,
          effectiveDate: draft.effectiveDate,
          // Validated non-null above (operation === 'amend').
          affectedMemberScope: scopeDecl as schema.AffectedMemberScope,
          benefitMechanism: draft.benefitMechanism,
          authoredByActor: draft.authoredByActor,
          auditId,
          clauseVersionId,
        });
        version = row.version;
      }

      // Consume the draft.
      await niyamavali.markDraftPublished(
        handle,
        pariwarId,
        draft.draftId,
        clauseVersionId,
        auditId,
      );

      // Fire the member-notification scaffolding hook (AC3 placeholder) — never break publish.
      try {
        deps.niyamavaliAmendedHook({
          pariwarId,
          clauseId: draft.clauseId,
          clauseVersionId,
          affectedMemberScope: draft.affectedMemberScope ?? null,
        });
      } catch (err) {
        request.log.error(
          { err },
          '[niyamavali] amended-hook threw (placeholder) — publish unaffected',
        );
      }

      return {
        clauseVersionId: clauseVersionId as unknown as z.infer<
          typeof PublishClauseResponse
        >['clauseVersionId'],
        clauseId: draft.clauseId as unknown as z.infer<typeof PublishClauseResponse>['clauseId'],
        version,
        auditId,
      } satisfies z.infer<typeof PublishClauseResponse>;
    },
  );
}

/** The scope-bound Drizzle handle for a scoped request (asserted present by the chain). */
function scopeTxOf(request: FastifyRequest): Db {
  const scopeTx = request.scopeTx;
  if (!scopeTx) throw new Error('[rules] handler ran without scope resolution');
  return scopeTx.tx;
}

/** The active Pariwar id of a scoped request (asserted present by the chain). */
function scopeTxPariwarId(request: FastifyRequest): string {
  const scopeTx = request.scopeTx;
  if (!scopeTx) throw new Error('[rules] handler ran without scope resolution');
  return scopeTx.pariwarId;
}

/** The publish draft loaded by `loadDraftForPublish` (asserted present by the chain). */
function stashedDraft(request: FastifyRequest): schema.ClauseDraftRow {
  const draft = publishDraftStash.get(request);
  if (!draft) throw new Error('[rules] publish ran without loadDraftForPublish');
  return draft;
}
