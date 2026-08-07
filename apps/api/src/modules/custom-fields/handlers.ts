// Per-Pariwar custom-field admin handlers — Story 10.12 (Task 6; AC7).
//
// Four routes under one module (routes.ts), ALL admin-session + scope-resolution + permission gated:
//   · GET  …/p/:pariwarId/custom-fields/definitions                                  (view key)
//   · POST …/p/:pariwarId/custom-fields/definitions/:hostEntity/:fieldKey/versions   (manage key)
//   · GET  …/p/:pariwarId/custom-fields/members/:memberId/values                     (view key)
//   · PUT  …/p/:pariwarId/custom-fields/members/:memberId/values                     (manage key)
//
// ── ⭐ ONE POST FOR PUBLISH AND RETIRE, AND THAT IS DELIBERATE (AC7) ────────────────────────────────
// The publish route branches on a top-level `retired_at` in the request body: present ⇒
// `retireDefinition()` + audit action `custom_field.definition_retired`; absent ⇒
// `publishDefinitionVersion()` + `custom_field.definition_published`.
//
// A separate `/retire` route would be a SECOND write path for the frozen-governance fence to be
// forgotten on — and it is the path least likely to be re-reviewed, because "we're only turning it
// off" reads as safe. Retirement IS a version (it republishes the current body with `retired_at`
// set), so one endpoint matches what actually happens in the database.
//
// ── The narrow-write posture (ADR-0030) ────────────────────────────────────────────────────────────
// The domain writers take a PRE-GENERATED `auditId` anchor; writing the audit LINE is THIS layer's
// obligation. Both mutations run under `audit.withCompensatingAudit` — ADR-0030 makes this the SOLE
// sanctioned mutation+audit pairing and a direct `writeAuditEntry` here is gate-caught. The intent
// line commits first in its own tx (which is what produces the `auditId`), then the write runs with
// it threaded on; a failure fires a compensating line and rethrows the original error unmasked.
//
// ⚠ Payload hashes use `canonicalJsonStringify` (RFC 8785), NEVER bare `JSON.stringify`. The
// definition body is a CLIENT-SUPPLIED nested object whose key order the server does not control, so
// a plain stringify would make the digest a function of the client's serializer rather than of the
// definition's meaning — two byte-identical publishes could hash differently, defeating the point of
// a tamper-evident chain.
//
// ── ⚠ WHAT THE AUDIT CHAIN DOES AND DOES NOT CARRY (the 10.8 correction, applied up front) ─────────
// `AuditEntryInput` has NO context field — the §1.5 chain content is a fixed tuple, and widening it
// would change the hash content of every audit line in the system. So: `resourceLocator` is
// `custom_field/<host>/<key>` (no version — under ADR-0030 the intent line commits BEFORE the insert,
// so at hash time the version does not exist yet), and `requestPayloadHash` is a digest over the
// whole request including the definition body. The VERSION is recoverable only by following the
// `auditId` anchor to the row. That is a named limit, not an implied completeness.

import { createHash } from 'node:crypto';

import type {
  CustomFieldDefinitionsResponse,
  CustomFieldDefinitionVersion,
  MemberCustomFieldsResponse,
  PublishCustomFieldDefinitionRequest,
  PublishCustomFieldDefinitionResponse,
  SetMemberCustomFieldsRequest,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, customFields, idempotency, ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/** The RBAC keys this module's routes are gated on (Story 10.12 AC7). The read/write split is the
 *  point — see `packages/domain/src/rbac/roles.ts`. */
export const CUSTOM_FIELD_VIEW_KEY = 'pariwar.view_custom_fields';
export const CUSTOM_FIELD_MANAGE_KEY = 'pariwar.manage_custom_fields';

/** Idempotency-claim lifetime. Generous relative to the request: the window that matters is the
 *  client's retry horizon (a timed-out console request, a proxy retry), not execution time. */
const CUSTOM_FIELD_IDEMPOTENCY_TTL_SECONDS = 300;

/** The dotted audit actions (free-form lowercase per `audit/write.ts`; no central registry). */
const ACTION_DEFINITION_PUBLISHED = 'custom_field.definition_published';
const ACTION_DEFINITION_RETIRED = 'custom_field.definition_retired';
const ACTION_VALUES_SET = 'custom_field.values_set';

/** The history read bound. Above the cardinality ceiling × a reasonable version depth, so a normal
 *  Pariwar is never clipped — but `has_more` is surfaced when it is (the 10.8 Review-Pass-2 lesson:
 *  a silently truncated provenance list is indistinguishable from a complete one). */
const HISTORY_LIMIT = 500;

interface AdminCtx {
  actorId: string;
  pariwarId: ids.PariwarId;
  traceId: string;
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/** Project a definition row into the wire shape. */
function toVersionEntry(row: {
  id: string;
  hostEntity: string;
  fieldKey: string;
  version: number;
  definition: unknown;
  effectiveAt: Date;
  retiredAt: Date | null;
  authoredByActor: string | null;
  actorDisplay: string | null;
  supersededByVersion: number | null;
  createdAt: Date;
}): CustomFieldDefinitionVersion {
  return {
    id: row.id,
    host_entity: row.hostEntity as CustomFieldDefinitionVersion['host_entity'],
    field_key: row.fieldKey,
    // ⚠ Passed through UNCHANGED. The stored JSONB body and the wire body are the same shape by
    // design (see the contracts README) — there is deliberately no adapter here, because an adapter
    // is exactly where camelCase/snake_case drift would live.
    definition: row.definition as CustomFieldDefinitionVersion['definition'],
    version: row.version,
    effective_at: row.effectiveAt.toISOString(),
    retired_at: iso(row.retiredAt),
    authored_by_actor: row.authoredByActor,
    actor_display: row.actorDisplay,
    superseded_by_version: row.supersededByVersion,
    created_at: row.createdAt.toISOString(),
  };
}

/**
 * Map the domain's typed publish/retire errors to their HTTP seams.
 *
 * ⚠ EVERY TYPED DOMAIN ERROR GETS AN ARM. The Story 10.8 Review-Pass-3 lesson, applied up front
 * rather than after a review finds it: an unmapped typed error falls through to the app boundary's
 * catch-all and becomes `500 internal.error` with the message suppressed — discarding, at the last
 * step, the carefully-written operator guidance that is the whole reason these errors are typed.
 * Here that would be worse than usual, because the two most important refusals in this story (the
 * frozen-governance fence and the PII-tier deferral) are GOVERNANCE messages a Pariwar admin needs
 * to read at a form.
 */
export function mapPublishError(err: unknown): never {
  // ⭐ [Review][Patch] THE FENCE. ⚠ 400, not 422 — this comment previously claimed 422 ("the request is
  // well-formed... a 400 would read as 'you typed it wrong'"), but no 422/`Unprocessable` error class
  // exists in `http-errors.ts`, every branch below actually throws `BadRequestError` (400), and the E2E
  // spec asserts 400. The distinction the original comment wanted is real (a fence refusal is not a
  // syntax error), but it lives in the MESSAGE and CODE, not the status — the same posture the other
  // typed refusals below already take.
  if (err instanceof customFields.CustomFieldFrozenGovernanceKeyError) {
    throw new BadRequestError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldNakedPiiKeyError) {
    throw new BadRequestError(err.message, err.code);
  }
  // A DEFERRAL, not a prohibition. The message names the missing substrate; passing it through
  // verbatim is what keeps that distinction visible to the operator.
  if (err instanceof customFields.CustomFieldPiiTierUnsupportedError) {
    throw new BadRequestError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldLabelParityRequiredError) {
    throw new BadRequestError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldDefinitionInvalidError) {
    throw new BadRequestError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldIncompatibleRedefinitionError) {
    // 409: the request is well-formed, and whether it is legal depends on what is already published.
    throw new ConflictError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldCardinalityExceededError) {
    throw new ConflictError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldDefinitionConflictError) {
    // A CONCURRENT publish, not necessarily a duplicate submission — re-read and decide again.
    throw new ConflictError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldEffectiveAtOutOfOrderError) {
    throw new BadRequestError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldDefinitionNotFoundError) {
    throw new NotFoundError(err.message, err.code);
  }
  throw err;
}

/** Map the member value-write errors. Separate from `mapPublishError` because the two routes raise
 *  disjoint error sets and a shared mapper would imply reachable states that are not. */
export function mapSetValuesError(err: unknown): never {
  if (err instanceof customFields.CustomFieldValuesInvalidError) {
    throw new BadRequestError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldPayloadTooLargeError) {
    throw new BadRequestError(err.message, err.code);
  }
  if (err instanceof customFields.CustomFieldNestingTooDeepError) {
    throw new BadRequestError(err.message, err.code);
  }
  throw err;
}

export function createCustomFieldsHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /**
   * Wrap a mutation in the shared keyed idempotency store when the caller supplies `Idempotency-Key`.
   *
   * ⚠ WHY. The `(pariwar_id, host_entity, field_key, version)` unique constraint only catches a
   * CONCURRENT double-publish — the 409 seam. A SEQUENTIAL replay (a timed-out request the client
   * retries, a double-clicked console button) sees the winner already committed and creates the NEXT
   * version: two identical versions and two audit lines where there was one operator decision. On an
   * append-only registry whose entire purpose is provenance, that is a correctness problem.
   *
   * ⚠ OPT-IN. A caller that sends no header gets the plain behaviour. NAMESPACED by route + scope +
   * subject, so two fields, two tenants, or a publish and a value-write never collide on a client
   * that reuses one key per user action.
   */
  async function withIdempotency<T>(
    request: FastifyRequest,
    namespace: string,
    run: () => Promise<T>,
  ): Promise<T> {
    const headerKey = request.headers['idempotency-key'];
    const idemKey =
      typeof headerKey === 'string' && headerKey.trim() !== '' ? `${namespace}:${headerKey.trim()}` : null;
    if (idemKey === null) return run();

    const claimOutcome = await idempotencyStore.claim(idemKey, CUSTOM_FIELD_IDEMPOTENCY_TTL_SECONDS);
    if (claimOutcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      // Claimed but no result yet — the original attempt is still in flight. 409 rather than racing
      // it: two publishes landing would defeat the point of the key.
      throw new ConflictError(
        'A custom-field write with this Idempotency-Key is already in progress — wait and retry',
        'custom_field.idempotency_in_progress',
      );
    }

    try {
      const result = await run();
      // ⚠ Recorded BEFORE the caller's scope tx commits (the store runs on its own connection), so a
      // commit failure after this point leaves a recorded result for a write that never landed. That
      // window is inherited from the sibling create routes and is not introduced here; the replay is
      // a read of the recorded response, so the worst case is a client told about a version it then
      // fails to find — noisy, not corrupting. Called out rather than hidden.
      await idempotencyStore.recordResult(idemKey, result as never);
      return result;
    } catch (err: unknown) {
      // Release the claim so a genuinely failed attempt can be retried immediately rather than being
      // locked out for the whole TTL (the member-handlers precedent).
      await idempotencyStore.release(idemKey).catch(() => undefined);
      throw err;
    }
  }

  /** Copied verbatim from the feature-flags handler (AC7). */
  function ctxOf(request: FastifyRequest): AdminCtx {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return {
      actorId,
      pariwarId: ids.pariwarId(scopeTx.pariwarId),
      traceId: request.requestContext.traceId,
    };
  }

  /** sha256 over the canonical request — the audit `requestPayloadHash`. RFC 8785, never bare
   *  `JSON.stringify` (see the module header). */
  function publishPayloadHash(
    hostEntity: string,
    fieldKey: string,
    body: PublishCustomFieldDefinitionRequest,
  ): string {
    const canonical = canonicalJsonStringify({
      host_entity: hostEntity,
      field_key: fieldKey,
      definition: body.definition,
      effective_at: body.effective_at ?? null,
      retired_at: body.retired_at ?? null,
    } as never);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * sha256 over the canonical value-write request.
   *
   * ⚠ A DIGEST, NEVER THE RAW VALUES — the audit payload boundary (`audit/write.ts`). Custom-field
   * values are tenant-authored member data; even at `pii_tier: 3` they must not be copied into the
   * hash-chain, which is a different retention and access surface from the members table.
   */
  function valuesPayloadHash(memberId: string, body: SetMemberCustomFieldsRequest): string {
    const canonical = canonicalJsonStringify({ member_id: memberId, values: body.values } as never);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /** Resolve the acting admin's display name, fail-closed. A missing name BLOCKS the write rather
   *  than falling back to an email or an id ([[project_admin_display_name_attribution]]) — the
   *  attribution is part of a permanent, trigger-immutable record. */
  async function requireActorDisplay(actorId: string): Promise<string> {
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) throw new AdminDisplayNameMissingError(actorId);
    return actorDisplay;
  }

  return {
    CUSTOM_FIELD_VIEW_KEY,
    CUSTOM_FIELD_MANAGE_KEY,

    /**
     * GET …/p/:pariwarId/custom-fields/definitions — the in-force set AND the full history.
     *
     * Both in ONE response, deliberately: the admin surface renders in-force definitions as the
     * working list and history as provenance, and splitting them across two calls would let the two
     * views be read at different instants — so a field could appear retired in one panel and live in
     * the other.
     */
    async listDefinitions(request: FastifyRequest): Promise<CustomFieldDefinitionsResponse> {
      const ctx = ctxOf(request);
      const tx = request.scopeTx!.tx;
      const hostEntity = 'member' as const;
      const now = new Date();

      const inForce = await customFields.definitionsInForce(tx, ctx.pariwarId, hostEntity, now);
      const history = await customFields.listDefinitionVersions(tx, ctx.pariwarId, hostEntity, HISTORY_LIMIT);

      // ⭐ [Review][Patch] In-force rows carry only the fields the resolver needs, so the wire row is
      // rebuilt via a DIRECT lookup by id — bounded by the cardinality ceiling (≤32), not by
      // `history`'s HISTORY_LIMIT-capped page. The original shape reused `history` for this lookup,
      // which meant an in-force definition could silently disappear from `in_force` (not just from
      // provenance) once a Pariwar's total historical row count exceeded HISTORY_LIMIT.
      const inForceRows = await customFields.definitionRowsByIds(
        tx,
        ctx.pariwarId,
        hostEntity,
        inForce.map((d) => d.id),
      );
      const byId = new Map(inForceRows.map((r) => [r.id, r]));

      return {
        host_entity: hostEntity,
        definition_set_version: customFields.definitionSetVersion(inForce),
        in_force: inForce
          .map((d) => byId.get(d.id))
          .filter((r): r is NonNullable<typeof r> => r !== undefined)
          .map(toVersionEntry),
        history: history.map(toVersionEntry),
        // Surfaced rather than swallowed: a clipped provenance list must never be mistaken for a
        // complete one.
        has_more: history.length >= HISTORY_LIMIT,
      };
    },

    /**
     * POST …/custom-fields/definitions/:hostEntity/:fieldKey/versions — PUBLISH **or** RETIRE.
     *
     * A top-level `retired_at` in the body routes to `retireDefinition()`. See the module header for
     * why this is one endpoint and not two.
     */
    async publishDefinition(request: FastifyRequest): Promise<PublishCustomFieldDefinitionResponse> {
      const ctx = ctxOf(request);
      const { hostEntity, fieldKey } = request.params as { hostEntity: string; fieldKey: string };
      const body = request.body as PublishCustomFieldDefinitionRequest;

      // The path names the field; the body carries its shape. They MUST agree — a mismatch would
      // publish under one key a definition whose body claims another, and the 0095
      // `…_definition_shape_ck` would then reject it at the DB with a far less actionable message.
      if (body.definition.field_key !== fieldKey) {
        throw new BadRequestError(
          `definition.field_key '${body.definition.field_key}' does not match the path field key '${fieldKey}'`,
          'custom_field.definition_invalid',
        );
      }

      return withIdempotency(
        request,
        `custom_field.publish:${ctx.pariwarId}:${hostEntity}:${fieldKey}`,
        async () => {
          const actorDisplay = await requireActorDisplay(ctx.actorId);
          const isRetire = body.retired_at !== undefined;
          const action = isRetire ? ACTION_DEFINITION_RETIRED : ACTION_DEFINITION_PUBLISHED;

          const row = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: {
              pariwarId: ctx.pariwarId,
              actorId: ctx.actorId,
              actorRole: null,
              action,
              // No version in the locator: under ADR-0030 the intent line commits BEFORE the write,
              // so at hash time the version does not exist. The `auditId` anchor ties them together.
              resourceLocator: `custom_field/${hostEntity}/${fieldKey}`,
              requestPayloadHash: publishPayloadHash(hostEntity, fieldKey, body),
              traceId: ctx.traceId,
            },
            mutate: async ({ auditId }) => {
              try {
                const host = hostEntity as customFields.CustomFieldHostEntity;
                if (isRetire) {
                  return await customFields.retireDefinition(request.scopeTx!.tx, {
                    pariwarId: ctx.pariwarId,
                    hostEntity: host,
                    fieldKey,
                    retiredAt: new Date(body.retired_at!),
                    authoredByActor: ids.userId(ctx.actorId),
                    actorDisplay,
                    auditId,
                  });
                }
                return await customFields.publishDefinitionVersion(request.scopeTx!.tx, {
                  pariwarId: ctx.pariwarId,
                  hostEntity: host,
                  definition: body.definition,
                  effectiveAt: body.effective_at ? new Date(body.effective_at) : undefined,
                  authoredByActor: ids.userId(ctx.actorId),
                  actorDisplay,
                  auditId,
                });
              } catch (err: unknown) {
                mapPublishError(err);
              }
            },
          });

          return { version: toVersionEntry(row) };
        },
      );
    },

    /** GET …/custom-fields/members/:memberId/values — the stored envelope. */
    async readMemberValues(request: FastifyRequest): Promise<MemberCustomFieldsResponse> {
      const ctx = ctxOf(request);
      const { memberId } = request.params as { memberId: string };

      const envelope = await customFields.readMemberCustomFields(
        request.scopeTx!.tx,
        ctx.pariwarId,
        ids.memberId(memberId),
      );
      if (envelope === null) {
        // 404 rather than 403 for a member outside this Pariwar: RLS has already filtered the row
        // away, so the two are indistinguishable here — and reporting 403 would confirm the member
        // exists somewhere, which is the leak the 404-not-403 convention exists to prevent.
        throw new NotFoundError(`Member ${memberId} not found`, 'member.not_found');
      }
      return { member_id: memberId, custom_fields: envelope };
    },

    /** PUT …/custom-fields/members/:memberId/values — a WHOLE-SET replace (see the contract). */
    async setMemberValues(request: FastifyRequest): Promise<MemberCustomFieldsResponse> {
      const ctx = ctxOf(request);
      const { memberId } = request.params as { memberId: string };
      const body = request.body as SetMemberCustomFieldsRequest;

      return withIdempotency(
        request,
        `custom_field.set_values:${ctx.pariwarId}:${memberId}`,
        async () => {
          const envelope = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: {
              pariwarId: ctx.pariwarId,
              actorId: ctx.actorId,
              actorRole: null,
              action: ACTION_VALUES_SET,
              resourceLocator: `custom_field_values/member/${memberId}`,
              // A DIGEST, never the raw values — the audit payload boundary.
              requestPayloadHash: valuesPayloadHash(memberId, body),
              traceId: ctx.traceId,
            },
            mutate: async ({ auditId }) => {
              try {
                return await customFields.setMemberCustomFields(request.scopeTx!.tx, {
                  pariwarId: ctx.pariwarId,
                  memberId: ids.memberId(memberId),
                  values: body.values,
                  auditId,
                });
              } catch (err: unknown) {
                mapSetValuesError(err);
              }
            },
          });

          return { member_id: memberId, custom_fields: envelope };
        },
      );
    },
  };
}
