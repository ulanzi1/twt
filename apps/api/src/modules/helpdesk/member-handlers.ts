// Member-facing helpdesk handlers — Story 10.2 (Task 3; AC1/AC2/AC3/AC5/AC6).
//
// The member app's ticket-filing surface, built on Story 10.1's substrate. The create route is a
// THIN auth-and-force wrapper around 10.1's create core (`resolveRoute` → `computeTicketSlaDueDates`
// → `withCompensatingAudit` → `projectTicketGenesis`): the ONLY new server logic is member-session
// gating, a Turnstile bot-gate, idempotency, `subject_member_id`/`created_via`-forcing,
// ownership-scoped reads, and the single-shot multipart attachment upload + signed-URL transport.
// It reuses 10.1's domain orchestration VERBATIM and adds NO new event type and NO migration
// (attachments ride the existing JSONB `attachments[]` column; object bytes live in the store,
// never Postgres).
//
// ── RLS ──────────────────────────────────────────────────────────────────────────────────────────
// There is NO scope-resolution HOOK on a member route (that middleware also computes RBAC grants,
// which members do not have) — so the handler opens its OWN RLS-scoped tx via `openScopeTx` (the
// member-pool precedent) and passes `scopeTx.client`/`scopeTx.tx` to the domain. It NEVER persists
// through an unscoped pool.
//
// ── Single-shot multipart create (Task 2 decision) ────────────────────────────────────────────────
// The create route accepts `multipart/form-data` (fields + files in ONE request). The Turnstile
// token rides an `x-turnstile-token` HEADER (never a multipart field) so it can be verified BEFORE
// the multipart body is touched at all — a caller that never passes the bot-gate never pays the
// cost of file buffering/validation (the review-hardening fix: the token used to be a multipart
// field, which meant it could only be checked AFTER the files ahead of it in the stream were
// already parsed). The idempotency key (`Idempotency-Key` header, review-hardening) is claimed
// right after Turnstile passes — still before any multipart parsing — via the shared keyed
// idempotency store (`@twt/domain` `idempotency.createKeyedStore`, the job-queue primitive; NOT a
// derived id, per 10.1's own Dev Notes). A replayed call with the SAME key returns the original
// ticket detail instead of creating a duplicate. Files are then validated (MIME allowlist / per-file
// + aggregate size / count / filename sanitize); the storage `put` happens AFTER validation +
// routing succeed and BEFORE the genesis persist; a persist failure best-effort-deletes the just-put
// objects AND releases the idempotency claim (so a genuinely failed attempt can be retried
// immediately, not after the TTL). The ticket row is the SOLE authority for what exists — an
// orphaned blob (put succeeded, persist failed) is unreferenced and unreachable, so the best-effort
// delete is storage hygiene, not a correctness dependency.

import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

import { audit, canonicalJsonStringify, cycleCalendar, helpdesk, ids, idempotency } from '@twt/domain';
import {
  HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES,
  HELPDESK_ATTACHMENT_MAX_BYTES,
  HELPDESK_ATTACHMENT_MAX_COUNT,
  MemberCreateTicketRequest,
  MemberTicketDetailResponse,
  sanitizeAttachmentFilename,
  type HelpdeskAttachmentContentType,
  type HelpdeskCategoryListResponse,
  type HelpdeskAttachmentUrlResponse,
  type MemberCreateTicketRequest as MemberCreateTicketRequestType,
  type MemberTicketListItem,
  type MemberTicketListResponse,
} from '@twt/contracts';
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
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** The dotted audit action for a member ticket create+route (mirrors the 10.1 primitive; AC1). */
const HELPDESK_MEMBER_TICKET_CREATED_ACTION = 'helpdesk.ticket_created';

/** The signed attachment-URL TTL (short-lived — AC6). */
const HELPDESK_ATTACHMENT_URL_TTL_SECONDS = 300;

/** The combined cap across ALL attachments on one create (review-hardening): the per-file cap alone
 *  (`HELPDESK_ATTACHMENT_MAX_BYTES` × `HELPDESK_ATTACHMENT_MAX_COUNT`) would let a single request
 *  buffer up to ~50 MiB into memory; this bounds the realistic "a few photos + a PDF" case tighter. */
const HELPDESK_ATTACHMENT_TOTAL_MAX_BYTES = 25 * 1024 * 1024;

/** How long a create's idempotency claim is held (review-hardening — closes the gap 10.1's own
 *  review deferred to "whichever of 10.2/10.3 first needs retry-safety"). Sized with headroom over
 *  the worst-case multipart-upload + routing + DB-write runtime (the keyed-store TTL-sizing
 *  contract) — the same 300s the parent-idempotency job-queue precedent uses. */
const HELPDESK_CREATE_IDEMPOTENCY_TTL_SECONDS = 300;

/** Local SHA-256 hex over a canonical string (the 10.1 handler idiom — importing a domain hash
 *  helper would cycle). */
function sha256Hex(canonicalInput: string): string {
  return createHash('sha256').update(canonicalInput, 'utf8').digest('hex');
}

// Row + attachment-ref types derived from the domain read (the 10.1 handler's `Awaited<ReturnType>`
// idiom — these are not re-exported at the @twt/domain root).
type HelpdeskTicketRow = NonNullable<Awaited<ReturnType<typeof helpdesk.getTicketForMember>>>;
type HelpdeskAttachmentRef = HelpdeskTicketRow['attachments'][number];

/** Map a persisted ticket row → the member inbox list item (AC3). Splits the stored body back into
 *  its subject + body (the member-app join, `splitMemberTicketSubjectBody`). */
function toMemberListItem(row: HelpdeskTicketRow): MemberTicketListItem {
  const { subject } = helpdesk.splitMemberTicketSubjectBody(row.body);
  return {
    ticket_id: row.ticketId,
    category: row.category,
    sub_category: row.subcategory,
    subject,
    current_state: row.currentState,
    routed_to_role: row.routedToRole,
    routed_to_scope: { dimension: row.routedToScopeDimension, value: row.routedToScopeValue },
    sla_first_response_due: row.slaFirstResponseDue.toISOString(),
    sla_resolution_due: row.slaResolutionDue.toISOString(),
    attachment_count: row.attachments.length,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** Map a persisted ticket row + its replayed thread → the member detail DTO (AC3). Attachment
 *  metadata is exposed WITHOUT the object_key — the member requests a signed URL by array index. */
function toMemberDetail(
  row: HelpdeskTicketRow,
  thread: ReturnType<typeof helpdesk.replayTicketThread>,
): MemberTicketDetailResponse {
  const listItem = toMemberListItem(row);
  const { body } = helpdesk.splitMemberTicketSubjectBody(row.body);
  return {
    ...listItem,
    body,
    attachments: row.attachments.map((a) => ({
      filename: a.filename,
      content_type: a.content_type,
      size_bytes: a.size_bytes,
    })),
    thread: thread.map((e) => ({
      kind: e.kind,
      author: e.author,
      body: e.body,
      occurred_at: e.occurredAt.toISOString(),
    })),
  };
}

/** A parsed + validated uploaded file (post MIME/size/filename checks). */
interface ParsedUpload {
  bytes: Buffer;
  contentType: HelpdeskAttachmentContentType;
  filename: string;
}

/**
 * Read the single-shot multipart body: collect the non-file fields into an object and buffer each
 * file with per-file MIME + size validation, plus a combined-size cap across all files
 * (`HELPDESK_ATTACHMENT_TOTAL_MAX_BYTES`, review-hardening). Bounded by a per-request limits
 * override (the global plugin cap is `files: 1` for the claim single-file route; helpdesk raises it
 * to HELPDESK_ATTACHMENT_MAX_COUNT for THIS request only).
 *
 * On any violation, the offending + every SUBSEQUENT part is still DRAINED (review-hardening — the
 * first violation used to throw immediately, leaving any later parts in the same multipart body
 * unconsumed) — `pendingError` records the first violation and the loop keeps consuming (without
 * buffering further file bytes) so the stream always finishes cleanly, then the recorded error is
 * thrown once the parser is done.
 */
async function readCreateMultipart(request: FastifyRequest): Promise<{ fields: Record<string, string>; files: ParsedUpload[] }> {
  if (!request.isMultipart()) {
    throw new BadRequestError('Expected a multipart/form-data upload', 'helpdesk.expected_multipart');
  }
  const fields: Record<string, string> = {};
  const files: ParsedUpload[] = [];
  let totalBytes = 0;
  let pendingError: Error | null = null;
  // Per-request limits override the plugin default (`files: 1`, the claim single-file route). The
  // helpdesk route allows up to HELPDESK_ATTACHMENT_MAX_COUNT files for THIS request only.
  const parts = request.parts({
    limits: {
      files: HELPDESK_ATTACHMENT_MAX_COUNT,
      // A little headroom over the documented cap so we return the dignified 413 rather than the
      // plugin's generic truncation error.
      fileSize: HELPDESK_ATTACHMENT_MAX_BYTES + 64 * 1024,
      fields: 12,
      fieldSize: 8192,
    },
  });
  try {
    for await (const part of parts) {
      if (part.type === 'file') {
        if (pendingError) {
          // Already failing — drain the remaining stream without buffering more bytes.
          part.file.resume();
          continue;
        }
        if (!(HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(part.mimetype)) {
          part.file.resume();
          pendingError = new UnsupportedMediaTypeError(
            'Unsupported attachment type — upload a JPEG, PNG, or PDF',
            'helpdesk.attachment_unsupported_media_type',
            { allowed: HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES },
          );
          continue;
        }
        const buffer = await part.toBuffer();
        if (part.file.truncated || buffer.byteLength > HELPDESK_ATTACHMENT_MAX_BYTES) {
          pendingError = new PayloadTooLargeError('Attachment exceeds the size limit', 'helpdesk.attachment_too_large', {
            maxBytes: HELPDESK_ATTACHMENT_MAX_BYTES,
          });
          continue;
        }
        if (buffer.byteLength === 0) {
          pendingError = new BadRequestError('An uploaded attachment is empty', 'helpdesk.attachment_empty');
          continue;
        }
        totalBytes += buffer.byteLength;
        if (totalBytes > HELPDESK_ATTACHMENT_TOTAL_MAX_BYTES) {
          pendingError = new PayloadTooLargeError(
            'Attachments exceed the combined size limit',
            'helpdesk.attachments_too_large',
            { maxTotalBytes: HELPDESK_ATTACHMENT_TOTAL_MAX_BYTES },
          );
          continue;
        }
        files.push({
          bytes: buffer,
          contentType: part.mimetype as HelpdeskAttachmentContentType,
          filename: sanitizeAttachmentFilename(part.filename ?? 'attachment'),
        });
      } else if (!pendingError) {
        // A field. `value` is a string for a normal form field.
        if (typeof part.value === 'string') fields[part.fieldname] = part.value;
      }
    }
  } catch (err) {
    // The multipart iterator (or toBuffer) throws typed plugin errors — map them to dignified 4xx.
    const code = (err as { code?: string }).code;
    if (code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new PayloadTooLargeError('Attachment exceeds the size limit', 'helpdesk.attachment_too_large', {
        maxBytes: HELPDESK_ATTACHMENT_MAX_BYTES,
      });
    }
    if (code === 'FST_FILES_LIMIT') {
      throw new BadRequestError('Too many attachments', 'helpdesk.too_many_attachments', {
        maxCount: HELPDESK_ATTACHMENT_MAX_COUNT,
      });
    }
    if (code === 'FST_FIELDS_LIMIT' || code === 'FST_FIELD_SIZE_LIMIT') {
      throw new BadRequestError('Invalid ticket request', 'helpdesk.invalid_request');
    }
    throw err;
  }
  if (pendingError) throw pendingError;
  return { fields, files };
}

export function createMemberHelpdeskHandlers(deps: AppDeps) {
  /** Read the authenticated member's (memberId, pariwarId) or fail 401; assert the path pariwarId
   *  matches the session's (a member JWT is the tenancy authority — a mismatched path is treated as
   *  not-found, no cross-tenant oracle). */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const pathPariwarId = (request.params as { pariwarId?: string }).pariwarId;
    if (pathPariwarId && pathPariwarId !== pariwarIdStr) {
      // The member's token scopes them to their own Pariwar; a path pointing elsewhere is a 404
      // (indistinguishable from a non-existent resource — no tenant-existence oracle).
      throw new NotFoundError('Not found', 'helpdesk.not_found');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /** Read + verify the Turnstile token from the `x-turnstile-token` header (review-hardening — a
   *  HEADER, not a multipart field, so it is checked before the multipart body is touched at all).
   *  Throws 400 if absent, 403 if the verifier rejects it. */
  async function requireTurnstile(request: FastifyRequest): Promise<void> {
    const raw = request.headers['x-turnstile-token'];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token || token.trim() === '') {
      throw new BadRequestError('An x-turnstile-token header is required', 'helpdesk.turnstile_token_required');
    }
    const ok = await deps.turnstile.verify({ token: token.trim(), remoteIp: request.ip });
    if (!ok) {
      throw new ForbiddenError('Verification failed — please try again', 'helpdesk.turnstile_failed');
    }
  }

  /** Read the caller-supplied `Idempotency-Key` header (required on create — review-hardening). */
  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError('An Idempotency-Key header is required', 'helpdesk.idempotency_key_required');
    }
    return key.trim();
  }

  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  return {
    /**
     * POST /api/v1/p/:pariwarId/member/helpdesk/tickets — file a ticket (201, or 200 on an
     * idempotent replay). Single-shot multipart; Turnstile- and Idempotency-Key-gated (both
     * HEADERS, verified/claimed before the multipart body is parsed at all); reuses the 10.1
     * create core with `created_via='member_app'` and `subject_member_id` forced to the session
     * member.
     */
    async create(request: FastifyRequest, reply: FastifyReply): Promise<MemberTicketDetailResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      // (1) Turnstile bot-gate — the FIRST thing, before any DB work and before the multipart body
      // is touched at all (FR-88 names helpdesk forms; the admin-auth AC-3 pattern).
      await requireTurnstile(request);

      // (2) Idempotency claim — the first DB touch, still before any multipart parsing. A replay
      // with the SAME Idempotency-Key returns the original ticket detail instead of double-creating
      // (review-hardening — closes the gap 10.1's own review deferred to this story).
      const idempotencyKey = requireIdempotencyKey(request);
      const idemKey = `helpdesk.member_ticket_create:${pariwarIdStr}:${memberIdStr}:${idempotencyKey}`;
      const claimOutcome = await idempotencyStore.claim(idemKey, HELPDESK_CREATE_IDEMPOTENCY_TTL_SECONDS);
      if (claimOutcome === 'already_claimed') {
        const stored = await idempotencyStore.getResult(idemKey);
        const replay = stored === null ? null : MemberTicketDetailResponse.safeParse(stored);
        if (replay?.success) {
          void reply.status(200);
          return replay.data;
        }
        // A live claim with no recorded result yet — the original attempt is still in flight.
        throw new ConflictError(
          'A request with this Idempotency-Key is already in progress — please wait and retry',
          'helpdesk.idempotency_in_progress',
        );
      }

      let claimSettled = false;
      try {
        // (3) Read the multipart body (fields + files) — only now, after both gates pass.
        const { fields, files } = await readCreateMultipart(request);

        // (4) Validate the non-file fields. An explicit empty-string `sub_category` is treated the
        // same as an absent field (review-hardening — it used to fail `.min(1)` and 400 the whole
        // request while an omitted field succeeded; the mobile client never sends it today, but any
        // other caller could).
        const rawSubCategory = fields['sub_category'];
        const parsed = MemberCreateTicketRequest.safeParse({
          category: fields['category'],
          sub_category: rawSubCategory === undefined || rawSubCategory === '' ? undefined : rawSubCategory,
          subject: fields['subject'],
          body: fields['body'],
        });
        if (!parsed.success) {
          throw new BadRequestError('Invalid ticket request', 'helpdesk.invalid_request', {
            issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          });
        }
        const input: MemberCreateTicketRequestType = parsed.data;

        const pariwarId = ids.pariwarId(pariwarIdStr);
        const memberId = ids.memberId(memberIdStr);
        const ticketId = ids.helpdeskTicketId(randomUUID());
        const createdAt = deps.clock();
        const subCategory = input.sub_category ?? null;
        const storedBody = helpdesk.joinMemberTicketSubjectBody(input.subject, input.body);

        // (5) member_scope_context — tenancy + subject; geo fields seamed (the 10.1 posture; the v1
        // default policy is pariwar-dimension throughout).
        const memberScopeContext = {
          pariwar_id: pariwarId,
          state: null,
          district: null,
          block: null,
          subject_member_id: memberId,
        };

        const scopeTx = await openScopeTx(deps, pariwarIdStr);
        let ok = false;
        // Object keys we `put` — deleted best-effort if the persist fails (orphan hygiene).
        const putKeys: string[] = [];
        let detail: MemberTicketDetailResponse;
        try {
          // (6) Snapshot the in-force policy version + resolve the route (PURE) — reused verbatim from 10.1.
          const inForce = await helpdesk.routingPolicyVersionInForce(scopeTx.tx, pariwarId, createdAt);
          let decision: ReturnType<typeof helpdesk.resolveRoute>;
          try {
            decision = helpdesk.resolveRoute({ category: input.category, subCategory, memberScopeContext }, inForce.document);
          } catch (err) {
            if (err instanceof helpdesk.RoutingUnresolvedError || err instanceof helpdesk.RoutingScopeUnresolvedError) {
              throw new ConflictError(err.message, 'helpdesk.routing_policy_misconfigured');
            }
            throw err;
          }

          // (7) Calendar-aware SLA due dates (reused verbatim from 10.1).
          const windows = await cycleCalendar.listHolidayWindowsForTail(scopeTx.tx, pariwarId, createdAt);
          const sla = helpdesk.computeTicketSlaDueDates(createdAt, decision, windows);

          // (8) Store the attachment bytes (AFTER validation + routing succeed, BEFORE the persist). The
          // object key is opaque, non-PII, and scoped by pariwar/ticket (never client-supplied).
          const attachments: HelpdeskAttachmentRef[] = [];
          for (const file of files) {
            const objectKey = `pariwar/${pariwarId}/helpdesk/${ticketId}/${randomUUID()}`;
            await deps.helpdeskAttachmentStorage.put(objectKey, new Uint8Array(file.bytes), {
              contentType: file.contentType,
            });
            putKeys.push(objectKey);
            attachments.push({
              object_key: objectKey,
              content_type: file.contentType,
              filename: file.filename,
              size_bytes: file.bytes.byteLength,
            });
          }

          // (9) The audit DIGEST — inputs + policy version + outputs (never the raw payload; AC1/AC5).
          const requestPayloadHash = sha256Hex(
            canonicalJsonStringify({
              ticket_id: ticketId,
              category: input.category,
              sub_category: subCategory,
              member_scope_context: memberScopeContext,
              routing_policy_version: decision.routingPolicyVersion,
              matched_rule_index: decision.matchedRuleIndex,
              target_role: decision.targetRole,
              target_scope: decision.targetScope,
              attachment_count: attachments.length,
              sla_first_response_due: sla.slaFirstResponseDue.toISOString(),
              sla_resolution_due: sla.slaResolutionDue.toISOString(),
            }),
          );

          // (10) Persist under a compensating audit (ADR-0030) — the intent line commits first (giving the
          // auditId threaded onto the ticket row), then the genesis projects on the request scope tx.
          const row = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: {
              pariwarId,
              actorId: memberIdStr,
              actorRole: null,
              action: HELPDESK_MEMBER_TICKET_CREATED_ACTION,
              resourceLocator: `ticket/${ticketId}`,
              requestPayloadHash,
              traceId: request.requestContext.traceId ?? null,
            },
            mutate: async ({ auditId }) => {
              try {
                await helpdesk.projectTicketGenesis(scopeTx.client, {
                  ticketId,
                  pariwarId,
                  subjectMemberId: memberId,
                  subjectActorId: null,
                  category: input.category,
                  subCategory,
                  body: storedBody,
                  attachments,
                  memberScopeContext,
                  routingPolicyVersion: decision.routingPolicyVersion,
                  targetRole: decision.targetRole,
                  targetScopeDimension: decision.targetScope.dimension,
                  targetScopeValue: decision.targetScope.value,
                  matchedRuleIndex: decision.matchedRuleIndex,
                  assignedAt: createdAt,
                  slaFirstResponseDue: sla.slaFirstResponseDue,
                  slaResolutionDue: sla.slaResolutionDue,
                  auditId,
                  createdVia: 'member_app',
                  operatorAttribution: null,
                  actor: 'member',
                  actorId: memberIdStr,
                  claimCaseId: null,
                  poolId: null,
                  moduleId: null,
                  validityLookupId: null,
                });
              } catch (err) {
                if (
                  err instanceof helpdesk.HelpdeskStreamConcurrencyError ||
                  err instanceof helpdesk.HelpdeskGenesisAlreadyExistsError ||
                  err instanceof helpdesk.HelpdeskTicketPersistError
                ) {
                  throw new ConflictError(err.message, 'helpdesk.ticket_create_conflict');
                }
                throw err;
              }
              const persisted = await helpdesk.getTicketForMember(scopeTx.tx, pariwarId, memberId, ticketId);
              if (!persisted) throw new Error('[helpdesk.member.create] ticket row missing after projection');
              return persisted;
            },
          });

          // (11) Build the create response = the detail DTO with the opening-entry thread.
          const events = await helpdesk.listTicketEvents(scopeTx.tx, ticketId);
          const thread = helpdesk.replayTicketThread(events);
          ok = true;
          detail = toMemberDetail(row, thread);
        } catch (err) {
          // Best-effort orphan cleanup: the bytes are already stored but no ticket references them.
          for (const key of putKeys) {
            await deps.helpdeskAttachmentStorage.delete?.(key).catch(() => undefined);
          }
          throw err;
        } finally {
          await closeScopeTx(scopeTx, ok);
        }

        // (12) Record the result under the idempotency key BEFORE returning — a retry with the SAME
        // key now replays this exact detail instead of creating a second ticket.
        await idempotencyStore.recordResult(idemKey, detail);
        claimSettled = true;
        void reply.status(201);
        return detail;
      } finally {
        // Any failure after the claim (validation, routing conflict, persist error, …) releases the
        // claim so the SAME key can be retried immediately, rather than waiting out the TTL.
        if (!claimSettled) await idempotencyStore.release(idemKey).catch(() => undefined);
      }
    },

    /** GET /api/v1/p/:pariwarId/member/helpdesk/tickets — the member's OWN tickets, newest-first (AC3). */
    async list(request: FastifyRequest): Promise<MemberTicketListResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberId = ids.memberId(memberIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const rows = await helpdesk.listTicketsForMember(scopeTx.tx, pariwarId, memberId);
        ok = true;
        return { tickets: rows.map(toMemberListItem) };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/p/:pariwarId/member/helpdesk/tickets/:ticketId — one owned ticket, or 404 (AC3). */
    async detail(request: FastifyRequest): Promise<MemberTicketDetailResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberId = ids.memberId(memberIdStr);
      const { ticketId: ticketIdStr } = request.params as { ticketId: string };
      const ticketId = ids.helpdeskTicketId(ticketIdStr);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const row = await helpdesk.getTicketForMember(scopeTx.tx, pariwarId, memberId, ticketId);
        if (!row) throw new NotFoundError('Ticket not found', 'helpdesk.not_found');
        const events = await helpdesk.listTicketEvents(scopeTx.tx, ticketId);
        const thread = helpdesk.replayTicketThread(events);
        ok = true;
        return toMemberDetail(row, thread);
      } catch (err) {
        // A NotFoundError is a clean read outcome — commit the (no-op) tx.
        if (err instanceof NotFoundError) ok = true;
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/p/:pariwarId/member/helpdesk/categories — the in-force policy's category set (AC5). */
    async categories(request: FastifyRequest): Promise<HelpdeskCategoryListResponse> {
      const { pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await helpdesk.categoriesForPariwar(scopeTx.tx, pariwarId, now);
        ok = true;
        return {
          policy_version: result.policyVersion,
          categories: result.categories.map((c) => ({ category: c.category, sub_categories: c.subCategories })),
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/p/:pariwarId/member/helpdesk/tickets/:ticketId/attachments/:attachmentIndex/url —
     * mint a short-lived signed URL for one of the member's OWN attachments (AC6). Ownership is
     * RE-CHECKED (`getTicketForMember`) before the URL is minted — a URL is NEVER issued for a ticket
     * the caller does not own (a not-owned ticket / out-of-range index → 404).
     */
    async attachmentUrl(request: FastifyRequest): Promise<HelpdeskAttachmentUrlResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const memberId = ids.memberId(memberIdStr);
      const { ticketId: ticketIdStr, attachmentIndex } = request.params as {
        ticketId: string;
        attachmentIndex: string;
      };
      const ticketId = ids.helpdeskTicketId(ticketIdStr);
      const index = Number.parseInt(attachmentIndex, 10);

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const row = await helpdesk.getTicketForMember(scopeTx.tx, pariwarId, memberId, ticketId);
        // A not-owned/absent ticket OR an out-of-range index → 404 (no oracle, no enumeration).
        if (!row || !Number.isInteger(index) || index < 0 || index >= row.attachments.length) {
          throw new NotFoundError('Attachment not found', 'helpdesk.attachment_not_found');
        }
        const attachment = row.attachments[index]!;
        const url = await deps.helpdeskAttachmentStorage.signedReadUrl(
          attachment.object_key,
          HELPDESK_ATTACHMENT_URL_TTL_SECONDS,
        );
        ok = true;
        return {
          url,
          expires_at: new Date(deps.clock().getTime() + HELPDESK_ATTACHMENT_URL_TTL_SECONDS * 1000).toISOString(),
        };
      } catch (err) {
        if (err instanceof NotFoundError) ok = true;
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
