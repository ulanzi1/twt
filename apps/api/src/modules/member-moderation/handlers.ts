// Member-moderation handlers — Story 10.10 (Task 5; AC2, AC3, AC4, AC6, AC7, AC8, AC9).
//
// The trustee/admin moderation surface: three step-up-gated actions (suspend / terminate / restore)
// plus two reads (a member's history + the Pariwar-wide moderated-members list).
//
// ── The 6.11 attributed-decision template (cloned, as 9.8 did) ──────────────────────────────────
// (1) ACTOR-DISPLAY (R5) resolves FIRST, before any write — server-side from `users.display_name`;
//     missing → `AdminDisplayNameMissingError` fail-closed, no event, no audit, no action. There is
//     NO email-derived fallback ([[project_admin_display_name_attribution]]): an unattributable
//     suspension is worse than a refused one.
// (2) The RATIONALE is encrypted BEFORE `openScopeTx` (the `claims.verification-decision` placement)
//     so no KMS round-trip is held inside an open tenant transaction.
// (3) AUDIT IS A POST-COMMIT SINK — NON-PII (action + member id only, via a locator+action digest);
//     the rationale is NEVER audited (the `banners/handlers.ts:104-120` pattern verbatim).
// (4) The member NOTIFICATION is BEST-EFFORT and post-commit (AC8): a dispatch failure never fails
//     the moderation action or rolls back the event.
//
// ── What runs inside the ONE scope transaction ──────────────────────────────────────────────────
// The event append + the `member_moderation_actions` decision row + (on suspend/terminate) the
// session cascade. All three commit or roll back together — so a rolled-back moderation can never
// leave a member logged out, and a committed one can never leave the two records disagreeing.

import { createHash } from 'node:crypto';

import {
  type ModerateMemberRequest,
  type ModeratedMembersListResponse,
  type ModerationActionResponse,
  type ModerationHistoryResponse,
} from '@twt/contracts';
import { audit, ids, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { revokeAllMemberSessions } from '../auth/member/member-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { encryptModerationRationale } from './moderation-crypto.js';

type ModerationAction = memberDomain.moderation.ModerationAction;

/** The Story 1.10 audit action per moderation action (AC4). */
const AUDIT_ACTIONS = {
  suspend: 'member_moderation.suspended',
  terminate: 'member_moderation.terminated',
  restore: 'member_moderation.restored',
} as const satisfies Record<ModerationAction, string>;

/** FR-56 → FR-6: the rejoin lock lifts 12 months after a termination. */
function addTwelveMonths(from: Date): Date {
  const at = new Date(from.getTime());
  at.setUTCMonth(at.getUTCMonth() + 12);
  return at;
}

interface ActorContext {
  actorId: string;
  pariwarId: ids.PariwarId;
  memberId: ids.MemberId;
  actorDisplay: string;
  traceId: string;
}

export function createMemberModerationHandlers(deps: AppDeps) {
  /** Resolve actor + tenant + target member. Used by the READ routes (no display-name requirement). */
  function readContextOf(request: FastifyRequest): Omit<ActorContext, 'actorDisplay'> {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    const params = request.params as { memberId?: string };
    return {
      actorId,
      pariwarId: ids.pariwarId(scopeTx.pariwarId),
      // `memberId` is absent on the Pariwar-wide list route; a sentinel is never used because that
      // route reads `pariwarId` only. The branded cast is safe — the route schema pins it as a uuid.
      memberId: ids.memberId(params.memberId ?? '00000000-0000-4000-8000-000000000000'),
      traceId: request.requestContext.traceId,
    };
  }

  /** The WRITE context: additionally resolves the R5 display snapshot, fail-closed on absence. */
  async function writeContextOf(request: FastifyRequest): Promise<ActorContext> {
    const base = readContextOf(request);
    const actorDisplay = await getDisplayName(deps.pool, base.actorId);
    // ⚠ NO fallback. A missing display name BLOCKS the action (AC4).
    if (actorDisplay === null) throw new AdminDisplayNameMissingError(base.actorId);
    return { ...base, actorDisplay };
  }

  /** Fire-and-forget action audit (Story 1.10 global chain) — never throws into the request path. */
  function emitAudit(ctx: ActorContext, action: ModerationAction, status: number): void {
    const input: audit.AuditEntryInput = {
      pariwarId: ctx.pariwarId,
      actorId: ctx.actorId,
      actorRole: null,
      action: AUDIT_ACTIONS[action],
      resourceLocator: memberDomain.moderation.moderationResourceLocator(ctx.memberId),
      // ⚠ The RATIONALE is NEVER audited (AC4). Digest the non-secret action + member id only.
      requestPayloadHash: auditPayloadHash(action, ctx.memberId),
      responseStatus: status,
      traceId: ctx.traceId,
    };
    void audit.writeAuditEntry(deps.servicePool, input).catch((err: unknown) => {
      console.error(
        '[member-moderation-audit] failed to persist action audit line',
        JSON.stringify({ action, error: String(err) }),
      );
    });
  }

  /**
   * Best-effort post-commit member notice (AC8). apps/api ENQUEUES; the apps/jobs worker owns the
   * fan-out — apps/api must NEVER call `fanOutAlertToMembers` (the 10.4 crypto boundary: the
   * fan-out needs MEMBER Tier-1 crypto, this request path carries ADMIN-identity keys).
   * A failed enqueue LOGS and heals; it never fails the committed action.
   */
  function enqueueNotice(
    request: FastifyRequest,
    ctx: ActorContext,
    input: { moderationActionId: string; action: ModerationAction; reasonCode: string },
  ): void {
    const queue = deps.moderationNotifyQueue;
    if (!queue) {
      request.log.info(
        { member_id: ctx.memberId, action: input.action },
        'member-moderation: notify queue not wired; notice skipped',
      );
      return;
    }
    void queue
      .enqueueModerationNotice({
        moderationActionId: input.moderationActionId,
        memberId: ctx.memberId,
        pariwarId: ctx.pariwarId,
        action: input.action,
        reasonCode: input.reasonCode,
        requestId: ctx.traceId,
        actorId: ctx.actorId,
        traceId: ctx.traceId,
      })
      .catch((err: unknown) => {
        request.log.warn({ err }, 'member-moderation: notice enqueue failed (action stands)');
      });
  }

  /**
   * The ONE moderation write path, parameterized by action. Every action shares it, so the legality
   * check, the attribution, the encryption placement, the cascade, the audit and the notice can
   * never drift between suspend, terminate and restore.
   */
  async function performAction(
    request: FastifyRequest,
    action: ModerationAction,
  ): Promise<ModerationActionResponse> {
    const ctx = await writeContextOf(request);
    const body = request.body as ModerateMemberRequest;
    const now = deps.clock();

    // (a) The mandatory-rationale guard runs on the PLAINTEXT, before encrypting — a request that
    //     was always going to 422 must not spend a KMS round-trip. (The Zod schema already trims +
    //     rejects empty; this is the defence-in-depth backstop for a non-HTTP caller.)
    const rationale = memberDomain.moderation.assertRationalePresent(body.rationale, action);

    // (b) Encrypt BEFORE opening the scope tx (the verification-decision placement) so no KMS
    //     network call is made while holding a pooled connection inside an open transaction.
    const rationaleCiphertext = await encryptModerationRationale(
      rationale,
      ctx.pariwarId,
      deps.encryption,
    );

    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    let result: memberDomain.moderation.ModerateMemberResult;
    try {
      result = await memberDomain.moderation.moderateMember(scopeTx.client, {
        memberId: ctx.memberId,
        pariwarId: ctx.pariwarId,
        action,
        reasonCode: body.reason_code,
        rationaleCiphertext,
        actorId: ctx.actorId,
        actorDisplay: ctx.actorDisplay,
        now,
        rejoinPermittedAt: action === 'terminate' ? addTwelveMonths(now) : null,
      });

      // (c) The suspension cascade (AC6) — architecture.md:1433-1434. Runs on the SCOPE TX CLIENT,
      //     so it commits with the moderation record: a rolled-back action can never leave the
      //     member logged out. Suspend AND terminate cascade; a RESTORE does NOT re-mint sessions —
      //     the member simply logs in normally.
      //     ⚠ This is NOT a login block. `member-auth.handlers.ts`'s gate stays `withdrawn ||
      //     anonymized` — a moderated member MUST be able to sign back in to read the dignified
      //     explanation and reach the appeal CTA (Decision 6). Enforcement is `is_valid`.
      if (action === 'suspend' || action === 'terminate') {
        await revokeAllMemberSessions(scopeTx.client, ctx.memberId);
      }
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }

    // (d) Post-commit sinks. Both are best-effort and neither can fail the committed action.
    emitAudit(ctx, action, 200);
    enqueueNotice(request, ctx, {
      moderationActionId: result.moderationActionId,
      action,
      reasonCode: result.reasonCode,
    });

    return {
      moderation_action_id: result.moderationActionId,
      member_id: ctx.memberId,
      action,
      reason_code: result.reasonCode,
      from_status: result.fromStatus,
      to_status: result.toStatus,
      actor_display: ctx.actorDisplay,
      rejoin_permitted_at: result.rejoinPermittedAt ? result.rejoinPermittedAt.toISOString() : null,
      acted_at: result.actedAt.toISOString(),
    };
  }

  return {
    /** POST …/members/:memberId/moderation/suspend — `none → suspended`. */
    async suspend(request: FastifyRequest): Promise<ModerationActionResponse> {
      return performAction(request, 'suspend');
    },

    /**
     * POST …/members/:memberId/moderation/terminate — `suspended → terminated` ONLY.
     * A member who is not already suspended gets a typed 409 (Decision 2): FR-56 routes termination
     * THROUGH suspension, so the rejoin-locking action can never be a single click.
     */
    async terminate(request: FastifyRequest): Promise<ModerationActionResponse> {
      return performAction(request, 'terminate');
    },

    /** POST …/members/:memberId/moderation/restore — `suspended | terminated → none`. */
    async restore(request: FastifyRequest): Promise<ModerationActionResponse> {
      return performAction(request, 'restore');
    },

    /**
     * GET …/members/:memberId/moderation — the member's CURRENT standing + full history (AC9).
     *
     * `legal_actions` is derived SERVER-side from the same `nextModerationStatus` reducer the write
     * path uses, so the console's button enablement can never disagree with what the server will
     * accept — the client re-implements no legality rules.
     * ⚠ The response carries NO rationale and NO ciphertext.
     */
    async history(request: FastifyRequest): Promise<ModerationHistoryResponse> {
      const ctx = readContextOf(request);
      const tx = request.scopeTx!.tx;
      const now = deps.clock();

      // A member that does not exist in this Pariwar is a 404 — NOT an empty history (which would
      // be an existence oracle answering "no moderation" for a member of another tenant).
      const exists = await memberDomain.memberExists(tx, ctx.pariwarId, ctx.memberId);
      if (!exists) throw new NotFoundError('Member not found', 'member.not_found');

      const overlay = await memberDomain.moderation.getMemberModerationOverlay(tx, ctx.memberId, now);
      const entries = await memberDomain.moderation.listModerationHistoryForMember(
        tx,
        ctx.pariwarId,
        ctx.memberId,
      );

      const legalActions = memberDomain.moderation.MODERATION_ACTIONS.filter((a) =>
        memberDomain.moderation.isLegalModerationTransition(overlay.status, a),
      );

      return {
        member_id: ctx.memberId,
        current_status: overlay.status,
        current_reason_code:
          overlay.reasonCode as ModerationHistoryResponse['current_reason_code'],
        since: overlay.since ? overlay.since.toISOString() : null,
        legal_actions: [...legalActions],
        entries: entries.map((e) => ({
          moderation_action_id: e.moderationActionId,
          action: e.action as ModerationAction,
          reason_code: e.reasonCode as ModerationHistoryResponse['entries'][number]['reason_code'],
          actor_id: e.actorId,
          actor_display: e.actorDisplay,
          rejoin_permitted_at: e.rejoinPermittedAt ? e.rejoinPermittedAt.toISOString() : null,
          acted_at: e.actedAt.toISOString(),
        })),
      };
    },

    /**
     * GET …/moderation/members — the Pariwar's currently-moderated members (Decision 9).
     * The read Story 10.11's Trustee-Lite view consumes. ⚠ Carries no rationale, ever.
     */
    async listModerated(request: FastifyRequest): Promise<ModeratedMembersListResponse> {
      const ctx = readContextOf(request);
      const tx = request.scopeTx!.tx;
      const q = request.query as { limit?: number; offset?: number };
      // Capped at 199, one below the domain accessor's `clampLimit` ceiling (200) — the fetch-one-
      // extra `hasMore` trick asks for `limit + 1`, and a request that itself hit 201 would be
      // re-clamped to 200, making `has_more` always false at the boundary (the 10.5 news-list
      // finding, applied here rather than repeated).
      const limit = Math.min(Math.max(1, Number(q.limit ?? 50) || 50), 199);
      const offset = Math.max(0, Number(q.offset ?? 0) || 0);

      const rows = await memberDomain.moderation.listModeratedMembersForPariwar(tx, ctx.pariwarId, {
        limit: limit + 1,
        offset,
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      return {
        items: page.map((r) => ({
          member_id: r.memberId,
          status: r.status,
          reason_code: r.reasonCode as ModeratedMembersListResponse['items'][number]['reason_code'],
          actor_id: r.actorId,
          actor_display: r.actorDisplay,
          since: r.since.toISOString(),
          rejoin_permitted_at: r.rejoinPermittedAt ? r.rejoinPermittedAt.toISOString() : null,
        })),
        has_more: hasMore,
      };
    },
  };
}

/**
 * The Story 1.10 `request_payload_hash` for a moderation action — `sha256(action:memberId)`, the
 * `banners/handlers.ts:277` helper verbatim.
 *
 * ⚠ The RATIONALE is deliberately NOT an input. Hashing it would put a (weakly) member-identifying
 * digest of Tier-1 free text into the audit chain, which AC4 forbids: "the rationale is NEVER
 * audited". The action + member id are the non-secret facts an auditor needs.
 */
function auditPayloadHash(action: string, memberId: string): string {
  return createHash('sha256').update(`${action}:${memberId}`, 'utf8').digest('hex');
}
