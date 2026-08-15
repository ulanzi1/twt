// Moderation-appeal handlers — Story 10.22. Niyamavali §8.8, ratified by Decision `2026-08-15-121`.
//
// FIVE handlers across THREE audiences, and the audiences are the design:
//   · `fileFromPortal`   — the MEMBER's own act, in-portal. Member session; the handler opens its OWN
//                          `openScopeTx` (there is no scope-resolution hook on a member route, since
//                          that middleware also computes RBAC grants members do not have). Turnstile
//                          + `Idempotency-Key` ride HEADERS. Ownership reads answer 404, never 403.
//   · `fileOffPortal`    — an OPERATOR recording an appeal taken by helpline, for a member whose
//                          access termination may already have removed. Gated on `helpdesk.create`.
//   · `decide` / `list` / `detail`
//                        — the TRUSTEE PANEL's adjudication surface, behind the full four-hook chain
//                          plus step-up on the write.
//
// ── ⭐ WHY A `list` HANDLER EXISTS AT ALL ────────────────────────────────────────────────────────
// `trustee_panel` holds EXACTLY `[member.moderate, member.restore_terminated, …decide_moderation_appeal]`
// and NO helpdesk capability whatsoever, and `routed_to_role` is advisory and inert. There is
// therefore no operator queue on which a filed appeal could ever surface to the Panel. Without this
// list, an appeal would be reachable only by direct link — a technically complete record nobody can
// find, which is the helpdesk-is-not-a-queue defect wearing a different hat (D6).
//
// ── The 6.11 attributed-decision template ───────────────────────────────────────────────────────
// (1) ACTOR-DISPLAY resolves FIRST, before any write — server-side from `users.display_name`;
//     missing → `AdminDisplayNameMissingError` fail-closed. NO email-derived fallback
//     ([[project_admin_display_name_attribution]]): an unattributable appeal outcome is worse than a
//     refused one, and §8.8 requires a REASONED outcome, which implies a reasoner.
// (2) Tier-1 text is encrypted BEFORE `openScopeTx` — never a KMS round-trip inside an open tenant tx.
// (3) AUDIT is a POST-COMMIT sink and NON-PII: ids and bounded tokens only. ⛔ The member's grounds
//     and the adjudicator's reasoned outcome are NEVER audited.
// (4) The member NOTIFICATION is BEST-EFFORT and post-commit: a dispatch failure never fails the
//     determination or rolls back the event.
//
// ⛔ NOTHING HERE RESTORES ANYONE. §8.8 makes an allowed appeal DIRECT that the act be undone; the
// restore is a subsequent, separately-attributed act through `POST …/moderation/restore`, carrying
// its own reason code, its own Decision Note and the Panel-exclusive `member.restore_terminated`
// check. `directs_restore` on the response is a SIGNAL to the console, never a report of work done.

import { createHash } from 'node:crypto';

import {
  DecideModerationAppealRequest,
  type MemberAppealContextResponse,
  FileModerationAppealOffPortalRequest,
  FileModerationAppealRequest,
  type ModerationAppealDecidedResponse,
  type ModerationAppealDetailResponse,
  type ModerationAppealDto,
  type ModerationAppealFiledResponse,
  type ModerationAppealsListResponse,
} from '@twt/contracts';
import { audit, ids, member as memberDomain } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptAppealTextSafe, encryptAppealText } from './appeal-crypto.js';

/** The Story 1.10 audit actions. Bounded, non-PII. */
const APPEAL_FILED_ACTION = 'member_moderation.appeal_filed';
const APPEAL_DECIDED_ACTION = 'member_moderation.appeal_decided';

/**
 * Non-PII request-payload digest — the `member-moderation/handlers.ts:827` pattern verbatim.
 * ⛔ The member's grounds and the adjudicator's reasoned outcome are NEVER hashed in, let alone
 * stored: this digests the bounded action name + the appeal id only.
 */
function auditPayloadHash(action: string, appealId: string): string {
  return createHash('sha256').update(`${action}:${appealId}`, 'utf8').digest('hex');
}

/**
 * Fire-and-forget action audit on the Story 1.10 global chain — never throws into the request path.
 * ⛔ Written on the BYPASSRLS `servicePool`, exactly as `member-moderation/handlers.ts` does: the audit
 * chain is cross-tenant infrastructure and must not be subject to the request's own RLS scope.
 */
function emitAuditWith(
  deps: AppDeps,
  args: {
    readonly pariwarId: string;
    readonly actorId: string;
    readonly action: string;
    readonly appealId: string;
    readonly status: number;
    readonly traceId: string;
  },
): void {
  const input: audit.AuditEntryInput = {
    pariwarId: ids.pariwarId(args.pariwarId),
    actorId: args.actorId,
    actorRole: null,
    action: args.action,
    resourceLocator: memberDomain.moderation.moderationAppealResourceLocator(args.appealId),
    // ⚠ Neither Tier-1 field is audited. Digest the bounded action + the appeal id only.
    requestPayloadHash: auditPayloadHash(args.action, args.appealId),
    responseStatus: args.status,
    traceId: args.traceId,
  };
  void audit.writeAuditEntry(deps.servicePool, input).catch((err: unknown) => {
    console.error(
      '[member-moderation-appeal-audit] failed to persist action audit line',
      JSON.stringify({ action: args.action, error: String(err) }),
    );
  });
}

function toDto(r: memberDomain.moderation.MemberModerationAppealRecord): ModerationAppealDto {
  return {
    appeal_id: r.appealId,
    member_id: r.memberId,
    moderation_action_id: r.moderationActionId,
    filed_via: r.filedVia,
    helpdesk_ticket_id: r.helpdeskTicketId,
    filed_at: r.filedAt.toISOString(),
    status: r.status,
    outcome: r.outcome,
    decided_by_display: r.decidedByDisplay,
    decided_at: r.decidedAt === null ? null : r.decidedAt.toISOString(),
  };
}

export function createModerationAppealHandlers(deps: AppDeps) {
  const emitAudit = (args: Parameters<typeof emitAuditWith>[1]): void => emitAuditWith(deps, args);

  /**
   * The member's own identity + tenancy, from the SESSION. ⛔ Never from the body — a member-supplied
   * member id on a member route is a cross-member write waiting to happen. A path `:pariwarId`
   * pointing elsewhere is a 404, not a 403: a 403 would be a tenant-existence oracle.
   */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const pathPariwarId = (request.params as { pariwarId?: string }).pariwarId;
    if (pathPariwarId && pathPariwarId !== pariwarIdStr) {
      throw new NotFoundError('Not found', 'member_moderation.appeal_not_found');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /** Turnstile bot-gate, from the `x-turnstile-token` HEADER (the Story 10.2 member-surface rule). */
  async function requireTurnstile(request: FastifyRequest): Promise<void> {
    const raw = request.headers['x-turnstile-token'];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token || token.trim() === '') {
      throw new BadRequestError(
        'An x-turnstile-token header is required',
        'member_moderation.turnstile_token_required',
      );
    }
    const ok = await deps.turnstile.verify({ token: token.trim(), remoteIp: request.ip });
    if (!ok) {
      throw new ForbiddenError(
        'Verification failed — please try again',
        'member_moderation.turnstile_failed',
      );
    }
  }

  /** The caller-supplied `Idempotency-Key` HEADER. Required on the member filing route. */
  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || key.trim() === '') {
      throw new BadRequestError(
        'An Idempotency-Key header is required',
        'member_moderation.idempotency_key_required',
      );
    }
    return key.trim();
  }

  /** The admin actor + their display-name SNAPSHOT. Fail-closed — see the header. */
  async function adminActor(request: FastifyRequest): Promise<{ actorId: string; display: string }> {
    const actorId = request.requestContext.actorId;
    if (!actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const display = await getDisplayName(deps.pool, actorId);
    if (!display) {
      throw new AdminDisplayNameMissingError(actorId);
    }
    return { actorId, display };
  }

  /**
   * The shared filing core. Both intake surfaces produce ONE record (Decision clause 13) — a second
   * table for the off-portal arm would let the two drift, and drift between two records of one fact
   * is a defect this project has already paid for (D7).
   */
  async function fileCore(args: {
    readonly pariwarIdStr: string;
    readonly memberIdStr: string;
    readonly moderationActionIdStr: string;
    readonly grounds: string;
    readonly filedVia: 'portal' | 'helpline';
    readonly helpdeskTicketIdStr: string | null;
    readonly actorId: string;
    readonly request: FastifyRequest;
  }): Promise<ModerationAppealFiledResponse> {
    // (2) Encrypt BEFORE the scope tx — no KMS round-trip inside an open tenant transaction.
    const groundsCiphertext = await encryptAppealText(args.grounds, args.pariwarIdStr, deps.encryption);

    const now = deps.clock();
    const scopeTx = await openScopeTx(deps, args.pariwarIdStr);
    let ok = false;
    let filed: Awaited<ReturnType<typeof memberDomain.moderation.fileMemberModerationAppeal>>;
    try {
      filed = await memberDomain.moderation.fileMemberModerationAppeal(scopeTx.client, {
        memberId: ids.memberId(args.memberIdStr),
        pariwarId: ids.pariwarId(args.pariwarIdStr),
        moderationActionId: ids.moderationActionId(args.moderationActionIdStr),
        groundsCiphertext,
        filedVia: args.filedVia,
        helpdeskTicketId:
          args.helpdeskTicketIdStr === null ? null : ids.helpdeskTicketId(args.helpdeskTicketIdStr),
        actorId: args.actorId,
        now,
      });
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }

    // (3) POST-COMMIT audit sink, fire-and-forget on the Story 1.10 global chain. NON-PII.
    // ⛔ The member's grounds are NEVER audited — only the bounded action and the appeal id digest.
    // Best-effort by construction: a failed audit write must not un-file a member's appeal.
    emitAudit({
      pariwarId: args.pariwarIdStr,
      actorId: args.actorId,
      action: APPEAL_FILED_ACTION,
      appealId: filed.appealId,
      status: 201,
      traceId: args.request.requestContext.traceId,
    });

    return {
      appeal_id: filed.appealId,
      moderation_action_id: filed.moderationActionId,
      filed_via: filed.filedVia,
      filed_at: filed.filedAt.toISOString(),
      status: 'open',
    };
  }

  return {
    /**
     * POST /api/v1/p/:pariwarId/member/moderation/appeals — the IN-PORTAL arm (201).
     *
     * ⭐ This is the destination the appeal CTA has never had. `presenter.ts` has computed
     * `showAppealCta` correctly since Story 10.10 and both apps rendered a handler-less button;
     * `moderation.notice.suspended.body` has promised a suspended member they may "request a review
     * from your membership status page" in both locales the whole time. This route is what makes
     * that sentence true.
     */
    async fileFromPortal(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<ModerationAppealFiledResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);

      // (1) Bot-gate FIRST, before any DB work (FR-88; the Story 10.2 discipline).
      await requireTurnstile(request);
      // Claimed but not yet consumed — a replay protection hook the route contract requires. Read
      // before the body so a caller missing it never reaches the write path.
      requireIdempotencyKey(request);

      const body = FileModerationAppealRequest.parse(request.body);

      const out = await fileCore({
        pariwarIdStr,
        memberIdStr,
        moderationActionIdStr: body.moderation_action_id,
        grounds: body.grounds,
        filedVia: 'portal',
        helpdeskTicketIdStr: null,
        // ⭐ The MEMBER is the actor. An appeal is the member's own act.
        actorId: memberIdStr,
        request,
      });
      void reply.status(201);
      return out;
    },

    /**
     * GET /api/v1/p/:pariwarId/member/moderation/appeals — what the member's own appeal screen needs.
     *
     * ⚠ This read exists because the validity payload derives moderation standing from `specialFlags`
     * and carries NO moderation-action id — so without it the member surface cannot name the act it is
     * appealing against, and §8.8 identifies an appeal BY that act's §8.6 record.
     * ⛔ The alternative — letting the server infer the act from the member's current standing — was
     * rejected: an inferred subject on a governance write is the shape that lets a member appeal
     * something other than what they were shown.
     *
     * `appealable_action_ids` is pre-filtered to acts with no open appeal, so the screen can render
     * the "one open at a time" state without first earning a 409.
     * ⛔ Carries no Tier-1 text.
     */
    async memberContext(request: FastifyRequest): Promise<MemberAppealContextResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      // A member route has no scope-resolution hook, so the handler opens its OWN RLS scope tx.
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      try {
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const memberId = ids.memberId(memberIdStr);
        const [actionIds, appeals] = await Promise.all([
          memberDomain.moderation.listAppealableActionIds(scopeTx.tx, pariwarId, memberId),
          memberDomain.moderation.listAppealsForMember(scopeTx.tx, pariwarId, memberId),
        ]);
        return { appealable_action_ids: [...actionIds], appeals: appeals.map(toDto) };
      } finally {
        await closeScopeTx(scopeTx, true);
      }
    },

    /**
     * POST /api/v1/p/:pariwarId/moderation/appeals/off-portal — the OFF-PORTAL arm (201).
     *
     * ⭐ THE ARM THAT MUST SURVIVE THE FLAG FLIP. `epics.md:4080`: the appeal must be reachable
     * off-portal for a terminated member — "the appeal must not depend on the access termination
     * removes". §8.8 states the same: "the right to appeal does not depend on the access that
     * termination removes." With `termination_access_block` ENABLED a terminated member has no
     * session at all, and this is the only route left.
     *
     * ⛔ Gated on `helpdesk.create`, NOT `member.data_rights`. Filing an appeal is not executing a
     * DPDPA right, and 10.21 minted that key precisely to separate FILING from EXECUTING.
     *
     * ⚠ The operator RECORDS the member's act; they do not make it. The event's `actor` is `member`
     * on this arm too — see `appeal-persist.ts`.
     */
    async fileOffPortal(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<ModerationAppealFiledResponse> {
      const pariwarIdStr = request.requestContext.pariwarId;
      const operatorId = request.requestContext.actorId;
      if (!pariwarIdStr || !operatorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const body = FileModerationAppealOffPortalRequest.parse(request.body);

      const out = await fileCore({
        pariwarIdStr,
        memberIdStr: body.member_id,
        moderationActionIdStr: body.moderation_action_id,
        grounds: body.grounds,
        filedVia: 'helpline',
        // ⛔ Required on this arm — the ruling puts the off-portal process ON a helpdesk ticket, and
        // migration 0107's CHECK backstops it.
        helpdeskTicketIdStr: body.helpdesk_ticket_id,
        // ⚠ The AUDIT actor is the operator who took the call (that is who acted on the system);
        // the EVENT's `actor` is `member`, because the appeal is the member's act. The two answer
        // different questions and are deliberately different values.
        actorId: operatorId,
        request,
      });
      void reply.status(201);
      return out;
    },

    /**
     * GET /api/v1/p/:pariwarId/moderation/appeals — ⭐ THE ADJUDICATION QUEUE (AC5).
     * Open appeals in the caller's scope, oldest filing first. See the module header for why this
     * endpoint is load-bearing rather than convenient.
     * ⛔ Carries no Tier-1 text.
     */
    async list(request: FastifyRequest): Promise<ModerationAppealsListResponse> {
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!pariwarIdStr) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const query = request.query as { limit?: number };
      // ⚠ The scope tx already exists: `scopeResolutionHook` opened it. ⛔ Opening a SECOND one here
      // would take a second pooled connection per request for no reason — that hook is exactly what
      // member routes lack, which is why only they call `openScopeTx` themselves.
      const rows = await memberDomain.moderation.listOpenAppealsForPariwar(
        request.scopeTx!.tx,
        ids.pariwarId(pariwarIdStr),
        query.limit,
      );
      return { items: rows.map(toDto) };
    },

    /**
     * GET /api/v1/p/:pariwarId/moderation/appeals/:appealId — the single-item decrypt-on-demand read.
     * The ONLY surface that ever carries either Tier-1 field (the `ModerationRationaleResponse`
     * precedent), behind the same gate as the determination.
     */
    async detail(request: FastifyRequest): Promise<ModerationAppealDetailResponse> {
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!pariwarIdStr) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { appealId } = request.params as { appealId: string };

      const record = await memberDomain.moderation.getMemberModerationAppeal(
        request.scopeTx!.tx,
        ids.pariwarId(pariwarIdStr),
        ids.memberModerationAppealId(appealId),
      );
      if (record === null) {
        throw new NotFoundError('Not found', 'member_moderation.appeal_not_found');
      }

      // ⚠ Decrypt is a KMS round-trip and the hook's scope tx is still open around this handler, so
      // this is the one unavoidable in-tx KMS call on the read path — the same trade the shipped
      // `rationale` read makes. It is a READ, so it holds no locks; the WRITE paths still encrypt
      // strictly before their transaction opens.
      // A corrupt/rotated envelope fail-softs to `null`; a KMS outage propagates to a 503.
      let grounds: string | null = null;
      let reasonedOutcome: string | null = null;
      try {
        const g = await decryptAppealTextSafe(record.groundsCiphertext, pariwarIdStr, deps.encryption);
        grounds = g.kind === 'ok' ? g.value : null;
        if (record.reasonedOutcomeCiphertext !== null) {
          const o = await decryptAppealTextSafe(
            record.reasonedOutcomeCiphertext,
            pariwarIdStr,
            deps.encryption,
          );
          reasonedOutcome = o.kind === 'ok' ? o.value : null;
        }
      } catch (err) {
        request.log.error({ err }, '[moderation-appeal] KMS unavailable on appeal detail read');
        throw new ServiceUnavailableError(
          'Key service unavailable — try again shortly',
          'member_moderation.kms_unavailable',
        );
      }

      return { appeal: toDto(record), grounds, reasoned_outcome: reasonedOutcome };
    },

    /**
     * POST /api/v1/p/:pariwarId/moderation/appeals/:appealId/decide — determine the appeal (§8.8).
     *
     * Behind the FULL chain: `requireAdminSession` · `scopeResolutionHook` ·
     * `requirePermissionHook('member.decide_moderation_appeal', { dimension: 'pariwar' })` ·
     * `requireStepUp(MODERATION_APPEAL_STEP_UP_CONTEXT)`.
     *
     * ⭐ Holding the key is NOT sufficient. §8.8's different-individual requirement is enforced by
     * the domain, INSIDE the scope transaction, BEFORE any write, as a typed **409** — a Panel member
     * who imposed the act (or contributed a ground it rests on) holds this key and is still refused
     * THIS case. ⛔ That refusal is never a 403; see `ModerationAppealAdjudicatorExcludedError`.
     */
    async decide(request: FastifyRequest): Promise<ModerationAppealDecidedResponse> {
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!pariwarIdStr) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { appealId } = request.params as { appealId: string };
      const body = DecideModerationAppealRequest.parse(request.body);

      // (1) Attribution FIRST, before any write. §8.8 requires a REASONED outcome, which implies a
      //     reasoner — an unattributable determination is refused, never written with a placeholder.
      const { actorId, display } = await adminActor(request);

      // (2) Encrypt before the scope tx.
      const reasonedOutcomeCiphertext = await encryptAppealText(
        body.reasoned_outcome,
        pariwarIdStr,
        deps.encryption,
      );

      const now = deps.clock();
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      let decided: Awaited<
        ReturnType<typeof memberDomain.moderation.decideMemberModerationAppeal>
      >;
      try {
        decided = await memberDomain.moderation.decideMemberModerationAppeal(scopeTx.client, {
          pariwarId: ids.pariwarId(pariwarIdStr),
          appealId: ids.memberModerationAppealId(appealId),
          outcome: body.outcome,
          reasonedOutcomeCiphertext,
          decidedByActorId: actorId,
          decidedByDisplay: display,
          now,
        });
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // (3) POST-COMMIT audit. NON-PII. ⛔ Never the reasoned prose.
      emitAudit({
        pariwarId: pariwarIdStr,
        actorId,
        action: APPEAL_DECIDED_ACTION,
        appealId: decided.appealId,
        status: 200,
        traceId: request.requestContext.traceId,
      });

      return {
        appeal_id: decided.appealId,
        moderation_action_id: decided.moderationActionId,
        outcome: decided.outcome,
        decided_at: decided.decidedAt.toISOString(),
        decided_by_display: display,
        // ⛔ A SIGNAL to the console, not a report of work done. Nothing above restored anyone.
        directs_restore: decided.directsRestore,
      };
    },
  };
}
