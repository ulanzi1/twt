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
  type AppendModerationGroundRequest,
  type AppendModerationGroundResponse,
  type ModerateMemberRequest,
  type ModeratedMembersListResponse,
  type ModerationActionResponse,
  type ModerationHistoryResponse,
  type ModerationRationaleResponse,
  type ReasonCodesListResponse,
} from '@twt/contracts';
import { audit, ids, member as memberDomain, rbac } from '@twt/domain';
import { produceContributionFacts } from '@twt/validity-service';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { revokeAllMemberSessions } from '../auth/member/member-auth.repo.js';
import { auditAuthorizationDenied } from '../rbac/index.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  decryptModerationRationaleSafe,
  encryptModerationRationale,
} from './moderation-crypto.js';

type ModerationAction = memberDomain.moderation.ModerationAction;

/** Story 10.19 — the Panel-exclusive key gating restore-FROM-terminated (Niyamavali §8.4). */
const MEMBER_RESTORE_TERMINATED_KEY = 'member.restore_terminated';

/** The Story 1.10 audit action per moderation action (AC4). */
const AUDIT_ACTIONS = {
  suspend: 'member_moderation.suspended',
  terminate: 'member_moderation.terminated',
  restore: 'member_moderation.restored',
} as const satisfies Record<ModerationAction, string>;

/**
 * FR-56 → FR-6: the rejoin lock lifts 12 months after a termination.
 *
 * `setUTCMonth` does not clamp the day-of-month, so adding 12 months to a Feb-29 termination
 * (a leap day) can overflow into March of a non-leap target year. Set the day to 1 before
 * shifting the month, then clamp back to the last valid day of the resulting month.
 */
export function addTwelveMonths(from: Date): Date {
  const day = from.getUTCDate();
  const at = new Date(from.getTime());
  at.setUTCDate(1);
  at.setUTCMonth(at.getUTCMonth() + 12);
  const lastDayOfTargetMonth = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
  at.setUTCDate(Math.min(day, lastDayOfTargetMonth));
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

    // (0) A member that does not exist in this Pariwar is a 404 — never a silently-fabricated
    //     `members` row. `moderateMember`'s overlay read answers `NO_MODERATION` for ANY memberId
    //     with zero events (it cannot distinguish "unmoderated" from "never existed"), and the
    //     projector's `onConflictDoUpdate` would otherwise INSERT a fresh `members` row for a
    //     syntactically-valid but nonexistent UUID. Same existence discipline as `history()` /
    //     `listModerated` below, and checked BEFORE the rationale guard / KMS encryption so a
    //     doomed request never spends either.
    const exists = await memberDomain.memberExists(request.scopeTx!.tx, ctx.pariwarId, ctx.memberId);
    if (!exists) throw new NotFoundError('Member not found', 'member.not_found');

    const body = request.body as ModerateMemberRequest;
    const now = deps.clock();

    // (a) The mandatory-rationale guard runs on the PLAINTEXT, before encrypting — a request that
    //     was always going to 422 must not spend a KMS round-trip. (The Zod schema already trims +
    //     rejects empty; this is the defence-in-depth backstop for a non-HTTP caller.)
    const rationale = memberDomain.moderation.assertRationalePresent(body.rationale, action);

    // ── ⭐ (a2) THE TWO-PART ESCALATION TEST — Story 10.20 (AC6), ON THE PLAINTEXT ────────────────
    //
    // Niyamavali §8.6 (Decision `2026-08-12-099`): *"Termination is an exceptional governance act,
    // not a stronger suspension."* A termination answers TWO separately-answerable questions —
    // (a) why SUSPENSION is inadequate, (b) why TERMINATION is proportionate — and part (a) is not
    // satisfied by restating part (b).
    //
    // ⛔ THIS CANNOT MOVE TO THE DATABASE, and the reason is structural rather than stylistic:
    // `encryptModerationRationale` is a NON-DETERMINISTIC Tier-1 envelope encrypt, so two identical
    // plaintexts produce two different ciphertexts and a `CHECK (a <> b)` would be satisfied by
    // exactly the case it was written to catch. What a CHECK *can* express is PRESENCE, and that is
    // what migration 0099's `escalation_iff_terminate` enforces — on every write path, raw SQL
    // included. Restatement and substance live here, at the `assertRationalePresent` placement, so
    // a doomed request never spends a KMS round-trip either.
    const escalation = memberDomain.moderation.assertEscalationJustification(action, {
      inadequacy: body.escalation_inadequacy,
      proportionality: body.escalation_proportionality,
    });

    // (a3) Evidence REFERENCES, never prose (AC4). The contracts DTO already 400s a prose `ref` at
    //      the boundary; this is the defence-in-depth pass for a non-HTTP caller, and the DB's
    //      `moderation_evidence_refs_valid` CHECK is the third layer that also binds raw SQL.
    const evidenceRefs = memberDomain.moderation.assertEvidenceRefs(body.evidence_refs);

    // (a4) AC8 (Q4.1) — the IMMEDIATE-TERMINATION EXCEPTION REASON. ⭐ Its presence is what selects
    //      the route: absent ⇒ the ordinary path (dwell-gated below, in the domain, inside the tx);
    //      present ⇒ the exception the Panel preserved. Validated on the plaintext here for the same
    //      reason as everything else in this block — a doomed request must not spend a KMS call.
    const immediateReason = memberDomain.moderation.assertImmediateTerminationReason(
      action,
      body.immediate_termination_reason,
    );

    // (b) Encrypt BEFORE opening the scope tx (the verification-decision placement) so no KMS
    //     network call is made while holding a pooled connection inside an open transaction.
    //     ⚠ On a `terminate` this is THREE round-trips, not one — all made here, together, for the
    //     same reason the first one is: none of them may happen inside an open tenant transaction.
    const decisionNoteCiphertext = await encryptModerationRationale(
      rationale,
      ctx.pariwarId,
      deps.encryption,
    );
    const escalationCiphertext = escalation
      ? {
          inadequacy: await encryptModerationRationale(
            escalation.inadequacy,
            ctx.pariwarId,
            deps.encryption,
          ),
          proportionality: await encryptModerationRationale(
            escalation.proportionality,
            ctx.pariwarId,
            deps.encryption,
          ),
        }
      : null;
    // Tier-1 too — it describes the case, so unlike the version pin and the fact snapshot it is
    // encrypted, granted UPDATE by name in 0099, and scrubbed under RTBF.
    const immediateReasonCiphertext =
      immediateReason === null
        ? null
        : await encryptModerationRationale(immediateReason, ctx.pariwarId, deps.encryption);

    const scopeTx = await openScopeTx(deps, ctx.pariwarId);
    let ok = false;
    let result: memberDomain.moderation.ModerateMemberResult;
    try {
      // ── ⭐ (b2) THE PANEL PRECONDITION — restore FROM terminated (Story 10.19, AC3) ─────────────
      //
      // Niyamavali §8.4, ratified 2026-08-10: *"Restoration from termination is an act of the
      // Trustee Panel […] not an exercise of the individual Trustee discretion by which a suspended
      // member is restored under §8.3."* Q1 option (a), Decision `2026-08-10-097` clause 1 — the
      // discharge of a question on its SECOND deposit, which is why it is an AC and not a note.
      //
      // ⚠ THE READ RUNS INSIDE THE SCOPE TX, ON THE SAME CLIENT AS THE WRITE, and that is
      // load-bearing rather than tidy. Checked outside, this is a TOCTOU: a concurrent `terminate`
      // committing between the check and `moderateMember` would let a non-Panel actor restore a
      // member who was terminated in the interval — the precondition would pass on a status that no
      // longer held. One transaction, one snapshot, no window.
      //
      // ⛔ SCOPED TO EXACTLY ONE TRANSITION. Restoring a SUSPENDED member is untouched and stays on
      // the single-actor `member.moderate` path (§8.3). Widening this to all restores — or to all
      // moderation — would convert Panel authority from CONCURRENT to EXCLUSIVE across Part 8,
      // contradicting Decision `2026-08-10-096` clause 3.
      //
      // ⛔ The `terminated --restore--> none` arm in `status.ts:47-48` is NOT removed. The
      // transition stays LEGAL; what changes is WHO may ask for it. Removing the arm would make a
      // terminated member unrestorable by anyone, which is the opposite of what §8.4 says.
      if (action === 'restore') {
        // `scopeTx.tx` — the drizzle handle BOUND TO THE SAME CLIENT as `scopeTx.client`
        // (`openScopeTx` returns `bindScopedDb(client)`), so this read and the write below sit in
        // the one transaction. Using `deps.serviceDb` here would silently reintroduce the TOCTOU.
        const overlay = await memberDomain.moderation.getCurrentMemberModerationOverlay(
          scopeTx.tx,
          ctx.memberId,
        );
        if (overlay.status === 'terminated') {
          rbac.requirePermission(
            {
              actorId: ctx.actorId,
              // Fail-closed: an absent `scopeGrants` resolves to NO grants, i.e. deny. It is
              // populated by the scope-resolution hook that every route here runs behind.
              grants: request.scopeGrants ?? [],
              key: MEMBER_RESTORE_TERMINATED_KEY,
              resource: { dimension: 'pariwar', value: ctx.pariwarId, pariwarId: ctx.pariwarId },
            },
            {
              onAuthorizationDenied: auditAuthorizationDenied(deps, request, ctx.actorId, ctx.pariwarId),
            },
          );
        }
      }

      // ── ⭐ (b3) AC7 — THE AS-OF-DECISION RESTORATION-EXHAUSTION SNAPSHOT (Q5 ruled (a)) ─────────
      //
      // `epics.md:3852` wants "terminating on a ground with an available restoration path" to be
      // CHECKABLE. Q5 ruled option (a): the fact is SNAPSHOTTED and justified against, in part (a)
      // of the escalation test. ⛔ It is NEVER a gate — Q5 option (b), the hard server-side block,
      // was PUT AND REJECTED (D6): `contribution.r7a_restorations_used` is a projection that can be
      // null, can lag, and is omitted rather than zeroed, so blocking on it would let an
      // unprovisioned registry refuse an authorised Panel decision — an availability failure
      // wearing a governance costume. It is not implemented here, not behind a flag, not for later.
      //
      // The snapshot is taken INSIDE the scope tx at the decision instant, so what is recorded is
      // what the data actually said THEN — the `actor_display` snapshot rationale, applied to a
      // fact. A later reviewer can test the assertion against that rather than re-deriving it
      // against a projection that has since moved.
      //
      // ⛔ `produceContributionFacts` — the DERIVED fact, NEVER `readContributionFactInputs`'s raw
      // `completedRestorationEpisodes`. The raw input is ALWAYS a number; the fact is `null`
      // whenever `consecutiveRequired` did not resolve (`producer.ts:550`). Snapshotting the input
      // would therefore record a confident count on exactly the Pariwars where the threshold was
      // never provisioned — the false-all-clear this AC exists to forbid. Only the producer knows
      // the difference between `0` and *unknown*, and `null` is carried through AS `null`.
      // ⛔ Never re-derive the count here ([[project_engine_never_infers_contribution_facts]]).
      let r7aRestorationsUsedSnapshot: number | null = null;
      if (action === 'terminate') {
        const facts = await produceContributionFacts(
          scopeTx.tx,
          { pariwarId: ctx.pariwarId, memberId: ctx.memberId },
          now,
        );
        // A `null` FACTS object (no contribution history to derive from) and a `null` FACT are the
        // same answer here — *unknown* — and both must record NULL rather than 0.
        r7aRestorationsUsedSnapshot = facts?.r7aRestorationsUsed ?? null;
      }

      result = await memberDomain.moderation.moderateMember(scopeTx.client, {
        memberId: ctx.memberId,
        pariwarId: ctx.pariwarId,
        action,
        reasonCode: body.reason_code,
        decisionNoteCiphertext,
        escalationInadequacyCiphertext: escalationCiphertext?.inadequacy ?? null,
        escalationProportionalityCiphertext: escalationCiphertext?.proportionality ?? null,
        immediateTerminationReasonCiphertext: immediateReasonCiphertext,
        evidenceRefs,
        r7aRestorationsUsedSnapshot,
        actorId: ctx.actorId,
        actorDisplay: ctx.actorDisplay,
        now,
        rejoinPermittedAt: action === 'terminate' ? addTwelveMonths(now) : null,
      });

      // (c) The suspension cascade (AC6) — architecture.md:1433-1434. Runs on the SCOPE TX CLIENT,
      //     so it commits with the moderation record: a rolled-back action can never leave the
      //     member logged out. Suspend AND terminate cascade; a RESTORE does NOT re-mint sessions —
      //     the member simply logs in normally.
      //     ⚠ The cascade is not itself an access gate — it clears sessions, it does not decide who
      //     may open a new one. That decision lives in `member-auth.handlers.ts`, and Story 10.19
      //     changed it:
      //       · SUSPENSION keeps access, unconditionally and permanently. A suspended member is
      //         CURING; they need the contribution surface, and Story 10.16's disclosure lives there.
      //       · TERMINATION ends it — session issuance is denied — but ONLY where the
      //         `termination_access_block` flag is enabled. That flag is DEFAULT OFF and its flip is
      //         gated on Story 10.21 (Decision `2026-08-10-097` clause 6, sub-choice (b-i)), so as
      //         SHIPPED a terminated member can still sign in today.
      //     ⛔ Decision 6 ("a moderated member must be able to sign back in to reach the appeal CTA")
      //     is SUPERSEDED, not reinterpreted — by Decision `2026-08-10-097` clause 8 and Niyamavali
      //     §8.4, which the Panel ratified on 2026-08-10. The original Decision-6 record stands
      //     unedited ([[feedback_supersede_never_reinterpret]]). Its justification was reaching an
      //     appeal CTA that does not exist: the CTA still has no moderation destination, which is
      //     Story 10.22's to build.
      //     Coverage enforcement is unchanged and orthogonal: the validity payload's moderation
      //     conjunction — `is_valid` (coverage) since 10.10, plus `is_assignable` (roster) since
      //     Story 10.17.
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
      const q = request.query as { limit?: number; offset?: number };

      // A member that does not exist in this Pariwar is a 404 — NOT an empty history (which would
      // be an existence oracle answering "no moderation" for a member of another tenant).
      const exists = await memberDomain.memberExists(tx, ctx.pariwarId, ctx.memberId);
      if (!exists) throw new NotFoundError('Member not found', 'member.not_found');

      // The CURRENT standing drives `legal_actions`, so it must not be bounded by the app clock —
      // same reason the write path uses the unbounded read (see `getCurrentMemberModerationOverlay`).
      // A stale-by-skew standing here would grey out a legal button, or offer an illegal one.
      const overlay = await memberDomain.moderation.getCurrentMemberModerationOverlay(
        tx,
        ctx.memberId,
      );

      // Capped at 199 for the same reason as `listModerated` below: the accessor fetches `limit + 1`
      // to compute `has_more`, and a request at 200 would be re-clamped, pinning `has_more` false.
      const limit = Math.min(Math.max(1, Number(q.limit ?? 50) || 50), 199);
      const offset = Math.max(0, Number(q.offset ?? 0) || 0);
      const page = await memberDomain.moderation.listModerationHistoryForMember(
        tx,
        ctx.pariwarId,
        ctx.memberId,
        { limit, offset },
      );

      // Story 10.20 (AC9) — the grounds behind each action on THIS page. One batched read keyed by
      // the page's action ids, so the query count does not grow with the page size.
      // ⚠ Carries `has_note`, never the note: the note is Tier-1 and stays decrypt-on-demand, per
      // action. ⛔ Three new Tier-1 fields must not become three new list columns (`dto.ts:9-16`).
      const groundsByAction = await memberDomain.moderation.listGroundsForActions(
        tx,
        ctx.pariwarId,
        page.entries.map((e) => e.moderationActionId),
      );

      // ⛔ `legal_actions` is NOT filtered by the dwell (Story 10.20, AC8). Legality and precondition
      // are different facts; collapsing them would make this pure reducer's output depend on a clock
      // and would fork the one place four call sites derive legality from (D5). ✅ The Panel ruled
      // this explicitly right (Q4.2): "legal_actions should not silently be rewritten merely because
      // the dwell exists."
      const legalActions = memberDomain.moderation.MODERATION_ACTIONS.filter((a) =>
        memberDomain.moderation.isLegalModerationTransition(overlay.status, a),
      );

      // ── ⭐ AC8 — `termination_available_at`, ADDITIVE alongside `legal_actions` ─────────────────
      // Leaving the dwell ONLY in the write path would make the console render an enabled Terminate
      // control that 409s — the same console/server disagreement D5 rejects, arriving from the other
      // side. This is the separate, additive fact that lets the console tell the trustee WHEN the
      // ordinary path opens (rendered in the re-confirmation dialog, which is where it is actually
      // decision-relevant).
      //
      // `null` covers three genuinely different situations, and none of them should read as "you may
      // terminate now": not suspended (terminate is not even legal), the dwell already elapsed
      // (nothing to wait for), and the policy unprovisioned (the write path 503s and no instant can
      // be computed). The console gates on the presence of an instant in the FUTURE, not on `null`.
      let terminationAvailableAt: string | null = null;
      if (overlay.status === 'suspended') {
        const dwellPolicy = await memberDomain.moderation.resolveModerationDwellPolicy(
          tx,
          ctx.pariwarId,
        );
        const suspendedAt = dwellPolicy
          ? await memberDomain.moderation.getProducingSuspensionActedAt(tx, ctx.memberId)
          : null;
        if (dwellPolicy && suspendedAt) {
          const at = memberDomain.moderation.terminationAvailableAt(
            suspendedAt,
            dwellPolicy.dwellDays,
          );
          // Only surfaced while it is still in the FUTURE — a past instant is not a precondition,
          // and rendering one would invite a console to display a stale "available at" forever.
          if (at.getTime() > deps.clock().getTime()) terminationAvailableAt = at.toISOString();
        }
      }

      return {
        member_id: ctx.memberId,
        current_status: overlay.status,
        current_reason_code:
          overlay.reasonCode as ModerationHistoryResponse['current_reason_code'],
        since: overlay.since ? overlay.since.toISOString() : null,
        legal_actions: [...legalActions],
        termination_available_at: terminationAvailableAt,
        entries: page.entries.map((e) => ({
          moderation_action_id: e.moderationActionId,
          action: e.action as ModerationAction,
          reason_code: e.reasonCode as ModerationHistoryResponse['entries'][number]['reason_code'],
          actor_id: e.actorId,
          actor_display: e.actorDisplay,
          rejoin_permitted_at: e.rejoinPermittedAt ? e.rejoinPermittedAt.toISOString() : null,
          acted_at: e.actedAt.toISOString(),
          // ⛔ SUPERSEDED grounds are RETAINED and flagged, never filtered — an audit trail that
          // hides what was superseded is not an audit trail, and on a contested member the
          // superseded ground is often precisely the one under dispute.
          grounds: (groundsByAction.get(e.moderationActionId) ?? []).map((g) => ({
            ground_id: g.groundId,
            code: g.code as ModerationHistoryResponse['entries'][number]['reason_code'],
            is_primary: g.isPrimary,
            has_note: g.hasNote,
            evidence_refs: g.evidenceRefs,
            supersedes_ground_id: g.supersedesGroundId,
            superseded: g.superseded,
            added_by: g.addedBy,
            added_by_display: g.addedByDisplay,
            added_at: g.addedAt.toISOString(),
          })),
          evidence_refs: e.evidenceRefs,
        })),
        // ⚠ An audit trail MUST NOT present a truncated page as the whole record (AC9). Without
        // this the console silently dropped everything past the newest 50 — typically the ORIGINAL
        // decision under dispute.
        has_more: page.hasMore,
      };
    },

    /**
     * GET …/moderation/:moderationActionId/rationale — decrypt ONE rationale on demand.
     *
     * The single exception to "the ciphertext never leaves the DB" (AC3): a gated, per-action read,
     * never a list. Fail-soft on a corrupt/rotated envelope (the `claims.verifier-console.handlers.
     * ts:115` `safeDecrypt` discipline verbatim) — a single bad envelope answers `null`, never a 500.
     */
    async rationale(request: FastifyRequest): Promise<ModerationRationaleResponse> {
      const ctx = readContextOf(request);
      const tx = request.scopeTx!.tx;
      const params = request.params as { moderationActionId: string };
      const moderationActionId = ids.moderationActionId(params.moderationActionId);

      const row = await memberDomain.moderation.getModerationActionRationale(
        tx,
        ctx.pariwarId,
        ctx.memberId,
        moderationActionId,
      );
      // 404-not-403 on a cross-tenant / cross-member / nonexistent id — RLS plus the explicit
      // pariwarId+memberId predicate in the accessor means a mismatched combination simply has no
      // row, never an existence oracle for another Pariwar's data.
      if (!row) throw new NotFoundError('Moderation action not found', 'member_moderation.action_not_found');

      // ⚠ A corrupt STORED envelope and an unreachable KMS are different facts and must not both
      // answer `null` — see `decryptModerationRationaleSafe`. Only the first is the documented
      // fail-soft case; the second is an operational incident and becomes a 503.
      let outcome;
      try {
        outcome = await decryptModerationRationaleSafe(
          row.decisionNoteCiphertext,
          ctx.pariwarId,
          deps.encryption,
        );
      } catch (err) {
        request.log.error(
          { err, moderationActionId },
          'member-moderation: rationale decrypt failed at the KMS; surfacing 503 (NOT a null rationale)',
        );
        throw new ServiceUnavailableError(
          'The rationale cannot be decrypted right now. This is a key-service problem, not a missing rationale — retry shortly.',
          'member_moderation.rationale_unavailable',
        );
      }

      if (outcome.kind === 'corrupt') {
        request.log.warn(
          { err: outcome.error, moderationActionId },
          'member-moderation: stored rationale envelope is unreadable; returning null (fail-soft, per-row)',
        );
        return { moderation_action_id: moderationActionId, rationale: null };
      }

      return { moderation_action_id: moderationActionId, rationale: outcome.rationale };
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

    /**
     * POST …/members/:memberId/moderation/:moderationActionId/grounds — append a SUPPORTING ground
     * to an existing decision (Story 10.20, AC9, WS-E).
     *
     * ⭐ A LATER FINDING ATTACHES; IT NEVER REWRITES. Before this route a finding that emerged after
     * a decision had nowhere to go: it either overwrote the original rationale — destroying the
     * record of what was known WHEN the decision was made — or it was not recorded at all.
     *
     * ⛔ THE PRIMARY GROUND IS NOT REACHABLE FROM HERE, by construction rather than by policy. It is
     * written in the action's own transaction, and the partial unique index plus the
     * `SELECT, INSERT`-only grant make it structurally unmovable thereafter.
     *
     * Gated on the existing `member.moderate` key with a FOURTH step-up context, so an elevation
     * minted for a restore can never be spent on a finding (the 10.10 three-context precedent).
     */
    async appendGround(request: FastifyRequest): Promise<AppendModerationGroundResponse> {
      const ctx = await writeContextOf(request);
      const params = request.params as { moderationActionId: string };
      const moderationActionId = ids.moderationActionId(params.moderationActionId);
      const body = request.body as AppendModerationGroundRequest;
      const now = deps.clock();

      // The note is Tier-1 and OPTIONAL — encrypted BEFORE `openScopeTx`, the same placement as
      // every other Tier-1 write on this surface, so no KMS round-trip is held inside an open
      // tenant transaction.
      const noteCiphertext =
        body.note === undefined
          ? null
          : await encryptModerationRationale(body.note, ctx.pariwarId, deps.encryption);

      const scopeTx = await openScopeTx(deps, ctx.pariwarId);
      let ok = false;
      let result: memberDomain.moderation.AppendGroundResult;
      try {
        // ⚠ The action-existence check, the `appliesTo` guard, the supersede-target check, the event
        // and the row ALL run inside this ONE transaction. Checked outside, the supersede target
        // could be superseded by a concurrent request between the check and the insert.
        result = await memberDomain.moderation.appendModerationGround(scopeTx.client, {
          moderationActionId,
          memberId: ctx.memberId,
          pariwarId: ctx.pariwarId,
          code: body.code,
          noteCiphertext,
          evidenceRefs: body.evidence_refs,
          supersedesGroundId: body.supersedes_ground_id
            ? ids.moderationGroundId(body.supersedes_ground_id)
            : null,
          addedBy: ctx.actorId,
          addedByDisplay: ctx.actorDisplay,
          now,
        });
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // Post-commit, best-effort — ⚠ the NOTE is never audited, exactly as the rationale is not:
      // the bounded code and the member id are the non-secret facts an auditor needs.
      const input: audit.AuditEntryInput = {
        pariwarId: ctx.pariwarId,
        actorId: ctx.actorId,
        actorRole: null,
        action: 'member_moderation.ground_appended',
        resourceLocator: memberDomain.moderation.moderationGroundResourceLocator(ctx.memberId),
        requestPayloadHash: auditPayloadHash('ground_appended', ctx.memberId),
        responseStatus: 200,
        traceId: ctx.traceId,
      };
      void audit.writeAuditEntry(deps.servicePool, input).catch((err: unknown) => {
        console.error(
          '[member-moderation-audit] failed to persist ground-append audit line',
          JSON.stringify({ error: String(err) }),
        );
      });

      return {
        ground_id: result.groundId,
        moderation_action_id: moderationActionId,
        code: result.code,
        supersedes_ground_id: result.supersedesGroundId,
        added_at: result.addedAt.toISOString(),
      };
    },

    /**
     * GET …/moderation/reason-codes — the full frozen registry (review follow-up).
     *
     * The ONE source both the server's `appliesTo` 422 and the admin dropdown now read — no DB, no
     * pagination (Decision 3: code-level and frozen, not a per-Pariwar-growing list). Gated the
     * same as every other read on this surface; there is no separate "view reason codes" capability.
     */
    async reasonCodes(): Promise<ReasonCodesListResponse> {
      return {
        items: memberDomain.moderation.listReasonCodeMeta().map((m) => ({
          code: m.code,
          applies_to: [...m.appliesTo] as ReasonCodesListResponse['items'][number]['applies_to'],
          niyamavali_ref: m.niyamavaliRef,
          label: m.label,
        })),
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
