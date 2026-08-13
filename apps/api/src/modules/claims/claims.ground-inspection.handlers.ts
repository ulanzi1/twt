// Ground-inspection admin handlers — Story 6.7 (Task 5; AC1–AC6).
//
// The admin surface for the ground-inspection ASSIGNMENT (schedule/reschedule/findings/complete/
// refusal/photos/read). Consumes the Story 6.5 ClaimDocumentStorage PORT for photo bytes (Decision
// D2 — NOT the claim_documents row). Per-endpoint hook chains differ (AC6): all writes share the
// district-gated conduct permission (resolveValue = body district for schedule, the assignment
// row's district otherwise), and the evidence-authoring verbs (complete/refusal/findings/photos)
// ADD the inspector-identity guard (acting actor === inspector, or a checked
// claim.override_ground_inspection).
//
// ── Two concerns this file owns that differ from 6.5 ──────────────────────────
// (1) AUDIT IS A POST-COMMIT SINK (#10). schedule/reschedule/complete perform real in-tx DB work
//     (events_log append + row writes), so — unlike 6.5, whose audit fires before commit and makes
//     no synchronous DB write — each write handler opens its OWN scope-tx, COMMITS it, and only
//     THEN calls emitAuthAudit. The durable record is the events_log event / the row state, never
//     the audit line. (The scope-resolution middleware's request.scopeTx is used ONLY by the
//     permission preHandlers; the mutation rides a dedicated committed tx.)
// (2) PII IS ENCRYPTED BEFORE INSERT under the request encryption context; the read path decrypts +
//     mints short-lived signed URLs (never bytes, never a public URL).

import { randomUUID } from 'node:crypto';

import { CLAIM_DOCUMENT_MAX_BYTES } from '@twt/contracts';
import { claim, ids, rbac, schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { auditAuthorizationDenied } from '../rbac/index.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  decryptGroundInspectionField,
  encryptGroundInspectionField,
  encryptOptionalGroundInspectionField,
} from './ground-inspection-crypto.js';

/** Images-only MIME allowlist (NOT the death-cert PDF list) — checked before the storage `put`. */
const PHOTO_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Per-file byte cap (reuses the object-store's 10 MiB ceiling — within the multipart plugin limit). */
const PHOTO_MAX_BYTES = CLAIM_DOCUMENT_MAX_BYTES;
/** Signed-URL TTL for a photo read (short-lived — the 6.5 access pattern). */
const PHOTO_SIGNED_URL_TTL_SECONDS = 300;

/** The D6 supervisor-override key (catalog v9) — the conduct key is gated by the route preHandlers. */
const OVERRIDE_KEY = 'claim.override_ground_inspection';

/** Translate a ground-inspection domain error to its stable HTTP shape (the backstop mapping; the
 *  route also pre-checks the common cases for a clean early signal). Rethrows anything unknown. */
function translateGroundInspectionError(err: unknown): never {
  if (err instanceof claim.GroundInspectionClaimNotInVerificationError) {
    throw new ConflictError(
      'Ground inspection is not allowed for the claim in its current state',
      'ground_inspection.not_allowed',
      { state: err.currentState },
    );
  }
  if (err instanceof claim.GroundInspectionNotActiveError) {
    throw new ConflictError(
      'The ground-inspection assignment is not active',
      'ground_inspection.not_active',
      { status: err.status },
    );
  }
  if (err instanceof claim.GroundInspectionPhotoRequiredError) {
    throw new ConflictError(
      'At least one photo is required to complete the inspection',
      'ground_inspection.photo_required',
    );
  }
  if (err instanceof claim.GroundInspectionPhotoLimitError) {
    throw new ConflictError(
      'The assignment already holds the maximum number of photos',
      'ground_inspection.photo_limit',
      { max: err.max },
    );
  }
  if (err instanceof claim.GroundInspectionNotFoundError) {
    throw new NotFoundError('Ground inspection not found', 'ground_inspection.not_found');
  }
  if (err instanceof claim.GroundInspectionSiteDetailRequiredError) {
    throw new BadRequestError(
      "A location description is required when the site type is 'other'",
      'ground_inspection.site_detail_required',
    );
  }
  if (err instanceof claim.GroundInspectionRefusalReasonError) {
    throw new BadRequestError(err.detail, 'ground_inspection.invalid_refusal');
  }
  if (err instanceof claim.GroundInspectionDistrictImmutableError) {
    throw new ConflictError(
      'A reschedule cannot move the assignment to a different district',
      'ground_inspection.district_immutable',
      { district: err.currentDistrict },
    );
  }
  if (err instanceof claim.GroundInspectionBlockImmutableError) {
    // Story 6.17 (D3) — the SIBLING of district_immutable, with its own stable code. ⛔ Not folded
    // into the district mapping: `ground_inspection.district_immutable` is an asserted contract.
    throw new ConflictError(
      'A reschedule cannot move the assignment to a different block',
      'ground_inspection.block_immutable',
      { block: err.currentBlock },
    );
  }
  if (err instanceof claim.GroundInspectionIdempotencyMismatchError) {
    throw new ConflictError(
      'The Idempotency-Key was already used for a different request',
      'ground_inspection.idempotency_mismatch',
      { field: err.field },
    );
  }
  if (err instanceof claim.GroundInspectionInspectorMismatchError) {
    // Backstop for the inspector-identity guard (the route pre-checks the override for a clean 403;
    // this maps the writer's guard so a future divergence surfaces a 403, not an unclassified 500).
    throw new ForbiddenError(
      'Only the assigned inspector may author this evidence',
      'ground_inspection.inspector_mismatch',
    );
  }
  throw err;
}

interface AdminCtx {
  actorId: string;
  pariwarId: string;
}

export function createGroundInspectionHandlers(deps: AppDeps) {
  /** The acting admin id + active pariwar (both set by requireAdminSession + scope-resolution). */
  function adminCtx(request: FastifyRequest): AdminCtx {
    const actorId = request.requestContext.actorId;
    const pariwarId = request.scopeTx?.pariwarId;
    if (!actorId || !pariwarId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { actorId, pariwarId };
  }

  /**
   * Resolve the inspector-identity guard (D6). Returns `undefined` when the acting actor IS the
   * assigned inspector (no override needed); otherwise requires `claim.override_ground_inspection`
   * at the assignment's district — throwing the structured 403 (with the authz.denied audit) if
   * absent — and returns the recorded override marker.
   */
  function resolveInspectorOverride(
    request: FastifyRequest,
    ctx: AdminCtx,
    assignment: schema.ClaimGroundInspectionRow,
  ): claim.GroundInspectionOverride | undefined {
    if (ctx.actorId === assignment.inspectorActorId) return undefined;
    const grants = request.scopeGrants ?? [];
    const result = rbac.checkPermission(
      {
        actorId: ctx.actorId,
        grants,
        key: OVERRIDE_KEY,
        resource: { dimension: 'district', value: assignment.district, pariwarId: ctx.pariwarId },
      },
      { onAuthorizationDenied: auditAuthorizationDenied(deps, request, ctx.actorId, ctx.pariwarId) },
    );
    if (!result.ok) throw result.error; // AuthorizationDeniedError → structured 403
    return { byActorId: ctx.actorId };
  }

  /** The assignment the `resolveGroundInspectionAssignment` preHandler already loaded + stashed
   *  (for the district permission gate). Reused here so the handler does not re-read the row. */
  function loadAssignment(
    request: FastifyRequest,
    _ctx: AdminCtx,
    groundInspectionIdStr: string,
  ): schema.ClaimGroundInspectionRow {
    const stashed = request.groundInspection;
    if (!stashed || stashed.groundInspectionId !== groundInspectionIdStr) {
      // Programming error — the route omitted the resolve-assignment preHandler.
      throw new Error('[ground-inspection] handler ran without resolveGroundInspectionAssignment preHandler');
    }
    return stashed;
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError('An Idempotency-Key header is required', 'ground_inspection.idempotency_key_required');
    }
    return key.trim();
  }

  return {
    /** POST …/admin/claims/:claimCaseId/ground-inspection — schedule an assignment (AC1). */
    async schedule(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as ScheduleBody;
      const idempotencyKey = requireIdempotencyKey(request);

      // (D3) claim-state guard FIRST — a clean 409 before any write (the domain re-guards inside the tx).
      const claimRow = await claim.getClaimCase(
        request.scopeTx!.tx,
        ids.pariwarId(ctx.pariwarId),
        ids.claimId(claimCaseId),
      );
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
      if (claimRow.currentState !== 'verification_in_progress') {
        throw new ConflictError(
          'Ground inspection is not allowed for the claim in its current state',
          'ground_inspection.not_allowed',
          { state: claimRow.currentState },
        );
      }

      // Encrypt PII BEFORE insert (under the request encryption context).
      const locationCiphertext = await encryptOptionalGroundInspectionField(body.locationDetail, ctx.pariwarId, deps.encryption);
      const familyContactCiphertext = await encryptOptionalGroundInspectionField(body.familyContact, ctx.pariwarId, deps.encryption);
      const notesCiphertext = await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.scheduleGroundInspection(scopeTx.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: ids.pariwarId(ctx.pariwarId),
          district: body.district,
          block: body.block ?? null,
          inspectionStage: body.inspectionStage,
          inspectionSiteType: body.inspectionSiteType,
          inspectorActorId: body.inspectorActorId,
          scheduledAt: new Date(body.scheduledAt),
          locationCiphertext,
          familyContactCiphertext,
          notesCiphertext,
          structuredFindings: body.structuredFindings ?? null,
          scheduledByActor: ctx.actorId,
          idempotencyKey,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // POST-COMMIT audit (#10) — only after the tx committed.
      if (result!.created) {
        emitAuthAudit(deps, request, 'admin_ground_inspection.scheduled', {
          actorId: ctx.actorId,
          pariwarId: ctx.pariwarId,
          context: {
            claim_case_id: claimCaseId,
            ground_inspection_id: result!.groundInspection.groundInspectionId,
            district: body.district,
            // Story 6.17 — non-PII, same class as `district` (the schema's PII discipline note).
            block: body.block ?? null,
            inspector_actor_id: body.inspectorActorId,
            inspection_stage: body.inspectionStage,
            inspection_site_type: body.inspectionSiteType,
          },
        });
      }
      void reply.status(result!.created ? 201 : 200);
      return { groundInspectionId: result!.groundInspection.groundInspectionId, status: result!.groundInspection.status, created: result!.created };
    },

    /** POST …/ground-inspection/:ground_inspection_id/reschedule — supersede + replace (AC1/D5). */
    async reschedule(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = request.body as ScheduleBody;
      const idempotencyKey = requireIdempotencyKey(request);
      const target = loadAssignment(request, ctx, ground_inspection_id);

      // (review 1a) Fail fast — a reschedule cannot change district (the district gate resolved from
      // the target row, so a different district was never authorization-checked). The writer
      // re-asserts this under the row lock as the backstop.
      if (body.district !== target.district) {
        throw new ConflictError(
          'A reschedule cannot move the assignment to a different district',
          'ground_inspection.district_immutable',
          { district: target.district },
        );
      }
      // (Story 6.17, D3) The same fail-fast one level down. ⚠ Compares null↔non-null too: adding a
      // block would move the row from the district gate to the block gate and clearing one would move
      // it back — a silent re-gating in either direction. The writer re-asserts under the row lock.
      if ((body.block ?? null) !== target.block) {
        throw new ConflictError(
          'A reschedule cannot move the assignment to a different block',
          'ground_inspection.block_immutable',
          { block: target.block },
        );
      }

      const locationCiphertext = await encryptOptionalGroundInspectionField(body.locationDetail, ctx.pariwarId, deps.encryption);
      const familyContactCiphertext = await encryptOptionalGroundInspectionField(body.familyContact, ctx.pariwarId, deps.encryption);
      const notesCiphertext = await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.rescheduleGroundInspection(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          idempotencyKey,
          district: body.district,
          block: body.block ?? null,
          inspectionStage: body.inspectionStage,
          inspectionSiteType: body.inspectionSiteType,
          inspectorActorId: body.inspectorActorId,
          scheduledAt: new Date(body.scheduledAt),
          locationCiphertext,
          familyContactCiphertext,
          notesCiphertext,
          structuredFindings: body.structuredFindings ?? null,
          scheduledByActor: ctx.actorId,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      if (result!.created) {
        emitAuthAudit(deps, request, 'admin_ground_inspection.rescheduled', {
          actorId: ctx.actorId,
          pariwarId: ctx.pariwarId,
          context: {
            supersedes_ground_inspection_id: ground_inspection_id,
            ground_inspection_id: result!.groundInspection.groundInspectionId,
            district: body.district,
            block: body.block ?? null,
            inspector_actor_id: body.inspectorActorId,
            // Forensic trail (review #10): the superseded assignment's inspector, so a reassignment
            // is legible. District is immutable across a reschedule (1a), so it is not duplicated.
            supersedes_inspector_actor_id: target.inspectorActorId,
          },
        });
      }
      void reply.status(result!.created ? 201 : 200);
      return { groundInspectionId: result!.groundInspection.groundInspectionId, status: result!.groundInspection.status, created: result!.created };
    },

    /** PATCH …/ground-inspection/:ground_inspection_id — record findings (AC2). */
    async recordFindings(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = request.body as FindingsBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);

      const notesCiphertext =
        body.notes !== undefined
          ? await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption)
          : undefined;

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      try {
        await claim.recordGroundInspectionFindings(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          ...(body.structuredFindings !== undefined ? { structuredFindings: body.structuredFindings } : {}),
          ...(notesCiphertext !== undefined ? { notesCiphertext } : {}),
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.findings_recorded', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(200);
      return { groundInspectionId: ground_inspection_id, status: 'scheduled' };
    },

    /** POST …/ground-inspection/:ground_inspection_id/photos — upload one photo (AC3). */
    async uploadPhoto(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);

      // Cheap pre-check: reject a terminal assignment BEFORE reading/putting bytes (the writer
      // re-asserts under the row lock as the backstop).
      if (assignment.status !== 'scheduled') {
        throw new ConflictError('The ground-inspection assignment is not active', 'ground_inspection.not_active', {
          status: assignment.status,
        });
      }

      const data = await request.file();
      if (!data) throw new BadRequestError('No photo file in the upload', 'ground_inspection.no_file');
      if (!PHOTO_ALLOWED_MIME_TYPES.includes(data.mimetype as (typeof PHOTO_ALLOWED_MIME_TYPES)[number])) {
        throw new UnsupportedMediaTypeError(
          'Unsupported photo type — upload a JPEG, PNG, or WebP',
          'ground_inspection.unsupported_media_type',
          { allowed: PHOTO_ALLOWED_MIME_TYPES },
        );
      }
      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'FST_REQ_FILE_TOO_LARGE' || code === 'FST_FILES_LIMIT') {
          throw new PayloadTooLargeError('Photo exceeds the size limit', 'ground_inspection.too_large', {
            maxBytes: PHOTO_MAX_BYTES,
          });
        }
        throw err;
      }
      if (data.file.truncated || buffer.byteLength > PHOTO_MAX_BYTES) {
        throw new PayloadTooLargeError('Photo exceeds the size limit', 'ground_inspection.too_large', {
          maxBytes: PHOTO_MAX_BYTES,
        });
      }
      if (buffer.byteLength === 0) throw new BadRequestError('The uploaded photo is empty', 'ground_inspection.empty');

      // Optional caption (PII) — read AFTER draining the file stream so a `caption` field that
      // arrives in EITHER multipart position (before or after the file part) is captured, not
      // silently dropped (review #8). `data.fields` accumulates parts as the stream is consumed.
      const captionField = (data.fields as Record<string, { value?: unknown } | undefined> | undefined)?.caption;
      const captionPlain = captionField && typeof captionField.value === 'string' ? captionField.value : undefined;

      const captionCiphertext = await encryptOptionalGroundInspectionField(captionPlain, ctx.pariwarId, deps.encryption);

      // put-then-persist: store bytes first, then insert the row. Orphan-safe — a DB failure after a
      // successful put best-effort-deletes the object before rethrowing (AC3).
      const photoId = randomUUID();
      const storageObjectKey = `pariwar/${ctx.pariwarId}/claim/${assignment.claimCaseId}/inspection/${ground_inspection_id}/photo/${photoId}`;
      await deps.claimDocumentStorage.put(storageObjectKey, new Uint8Array(buffer), { contentType: data.mimetype });

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let photoRow;
      try {
        photoRow = await claim.addGroundInspectionPhoto(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          storageObjectKey,
          contentType: data.mimetype,
          byteSize: buffer.byteLength,
          captionCiphertext,
        });
        ok = true;
      } catch (err) {
        // Compensate the orphan object (best-effort) before surfacing the error (review #6). `delete`
        // is optional on the port (Decision D2) — LOG rather than silently swallow, so a failed or
        // impossible cleanup is observable instead of accumulating invisible orphaned blobs.
        if (typeof deps.claimDocumentStorage.delete === 'function') {
          await deps.claimDocumentStorage
            .delete(storageObjectKey)
            .catch((delErr: unknown) =>
              request.log.warn({ err: delErr, storageObjectKey }, 'ground-inspection photo orphan cleanup failed'),
            );
        } else {
          request.log.warn({ storageObjectKey }, 'ground-inspection photo orphaned: storage port has no delete()');
        }
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.photo_uploaded', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          photo_id: photoRow!.photoId,
          byte_size: buffer.byteLength,
          content_type: data.mimetype,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(201);
      return { photoId: photoRow!.photoId };
    },

    /** POST …/ground-inspection/:ground_inspection_id/complete — complete (AC4). */
    async complete(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = (request.body ?? {}) as CompleteBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);

      const notesCiphertext =
        body.notes !== undefined
          ? await encryptOptionalGroundInspectionField(body.notes, ctx.pariwarId, deps.encryption)
          : undefined;

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.completeGroundInspection(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          ...(body.structuredFindings !== undefined ? { structuredFindings: body.structuredFindings } : {}),
          ...(notesCiphertext !== undefined ? { notesCiphertext } : {}),
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.completed', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          photo_count: result!.photoCount,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(200);
      return { groundInspectionId: ground_inspection_id, status: result!.groundInspection.status, photoCount: result!.photoCount };
    },

    /** POST …/ground-inspection/:ground_inspection_id/refusal — refusal disposition (AC4a). */
    async refuse(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { ground_inspection_id } = request.params as { ground_inspection_id: string };
      const body = request.body as RefusalBody;
      const assignment = loadAssignment(request, ctx, ground_inspection_id);
      const override = resolveInspectorOverride(request, ctx, assignment);

      // The mandatory reason note is PII — encrypt before insert (non-empty enforced in the writer).
      const notesCiphertext = await encryptGroundInspectionField(body.reasonNote, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result;
      try {
        result = await claim.recordGroundInspectionRefusal(scopeTx.client, {
          pariwarId: ids.pariwarId(ctx.pariwarId),
          groundInspectionId: ids.groundInspectionId(ground_inspection_id),
          actingActorId: ctx.actorId,
          override,
          disposition: body.disposition,
          refusalReason: body.refusalReason,
          notesCiphertext,
        });
        ok = true;
      } catch (err) {
        translateGroundInspectionError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      emitAuthAudit(deps, request, 'admin_ground_inspection.refused', {
        actorId: ctx.actorId,
        pariwarId: ctx.pariwarId,
        context: {
          ground_inspection_id,
          district: assignment.district,
          disposition: body.disposition,
          refusal_reason: body.refusalReason,
          ...(override ? { override_actor_id: override.byActorId } : {}),
        },
      });
      void reply.status(200);
      return { groundInspectionId: ground_inspection_id, status: result!.status };
    },

    /**
     * GET …/ground-inspection?district=… | ?block=… — read the claim's assignments under ONE
     * locator (AC5; Story 6.17 D4 added the block arm, with EXACTLY-ONE-OF enforced by the zod
     * schema, so this handler never has to pick a precedence). The conduct gate has already resolved
     * its dimension from the SAME locator, so the filter below and the authorization agree by
     * construction — ⛔ do not filter on a different field than the gate checked.
     *
     * A claim may hold assignments across districts/blocks (the unified multi-jurisdiction console
     * view is 6.10's, which calls the accessor server-side). Decrypts PII + mints short-lived signed
     * URLs (never bytes). No assignment under the locator → `[]` (the absence-is-a-signal read).
     */
    async read(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
      const ctx = adminCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const { district, block } = request.query as { district?: string; block?: string };
      const scopeTx = request.scopeTx!;

      const all = await claim.getClaimGroundInspection(
        scopeTx.tx,
        ids.pariwarId(ctx.pariwarId),
        ids.claimId(claimCaseId),
      );
      // Exactly one of the two is defined (the zod `.refine`), so this is a total choice, not a
      // precedence rule. A block query matches only block-TAGGED rows; a district query matches
      // every row in the district, block-tagged or not — the district IS still populated on both.
      const inScope =
        block !== undefined
          ? all.filter((r) => r.inspection.block === block)
          : all.filter((r) => r.inspection.district === district);

      const assignments = await Promise.all(
        inScope.map(async (r) => {
          // (review #4) Per-field fail-soft: a single corrupt/rotated/wrong-context envelope must
          // yield `null` for THAT field, not reject the whole read (which would blind the verifier
          // to every healthy assignment in the district — the opposite of the absence-is-a-signal
          // read). Log the failure so the corruption is observable.
          const decrypt = async (ct: string | null) => {
            if (ct == null) return null;
            try {
              return await decryptGroundInspectionField(ct, ctx.pariwarId, deps.encryption);
            } catch (decErr) {
              request.log.warn(
                { err: decErr, groundInspectionId: r.inspection.groundInspectionId },
                'ground-inspection field decrypt failed; returning null',
              );
              return null;
            }
          };
          const photos = await Promise.all(
            r.photos.map(async (p) => ({
              photoId: p.photoId,
              contentType: p.contentType,
              byteSize: p.byteSize,
              caption: await decrypt(p.captionCiphertext),
              signedUrl: await deps.claimDocumentStorage.signedReadUrl(p.storageObjectKey, PHOTO_SIGNED_URL_TTL_SECONDS),
            })),
          );
          return {
            groundInspectionId: r.inspection.groundInspectionId,
            district: r.inspection.district,
            block: r.inspection.block,
            inspectionStage: r.inspection.inspectionStage,
            inspectionSiteType: r.inspection.inspectionSiteType,
            inspectorActorId: r.inspection.inspectorActorId,
            scheduledAt: r.inspection.scheduledAt,
            status: r.inspection.status,
            refusalReason: r.inspection.refusalReason,
            supersedesGroundInspectionId: r.inspection.supersedesGroundInspectionId,
            completedAt: r.inspection.completedAt,
            structuredFindings: r.inspection.structuredFindings,
            locationDetail: await decrypt(r.inspection.locationCiphertext),
            familyContact: await decrypt(r.inspection.familyContactCiphertext),
            notes: await decrypt(r.inspection.notesCiphertext),
            photos,
          };
        }),
      );

      void reply.status(200);
      return { assignments };
    },
  };
}

// ── Request body shapes (the routes validate these via Zod; these mirror the parsed types) ──

interface ScheduleBody {
  district: string;
  /** Story 6.17 — optional block-level jurisdiction; present ⇒ the row is gated at `dimension: 'block'`. */
  block?: string;
  inspectionStage: schema.ClaimGroundInspectionRow['inspectionStage'];
  inspectionSiteType: schema.ClaimGroundInspectionRow['inspectionSiteType'];
  inspectorActorId: string;
  scheduledAt: string;
  locationDetail?: string | null;
  familyContact?: string | null;
  notes?: string | null;
  structuredFindings?: unknown;
}

interface FindingsBody {
  structuredFindings?: unknown;
  notes?: string | null;
}

interface CompleteBody {
  structuredFindings?: unknown;
  notes?: string | null;
}

interface RefusalBody {
  disposition: 'photo_refused' | 'evidence_unavailable';
  refusalReason: schema.ClaimGroundInspectionRow['refusalReason'] & string;
  reasonNote: string;
}
