// First-signup member-creation handler — Story 3.6a (Task 3; AC1, AC2).
//
// THE load-bearing path the whole epic deferred: it consumes the Story 3.2 `signup_continuation`
// seam and finally CREATES the member in production — the FIRST production `projectMemberState`
// call (every prior caller was a test seed). In ONE member scope-tx it emits
// `member.signup_initiated` (→ `pending-kyc`, creating the `members` row + the event stream) AND
// inserts the Tier-1 `member_identities` row, then — after commit — upgrades to a full member
// session by REUSING `completeMemberLogin` (the exact returning-member single-membership path), so
// the wizard proceeds authenticated with no second OTP.
//
// ── The mobile-binding wrinkle (R2) ───────────────────────────────────────────────────────────
// The continuation token carries the mobile BLIND INDEX, not the plaintext; `member_identities`
// needs the plaintext to Tier-1-encrypt. The request re-sends `mobile`; the server re-derives the
// blind index and asserts it equals the token `sub` (a mismatch → 401) before encrypting. The
// plaintext is NEVER recoverable from the token or the PII-free continuation row.
//
// ── Audit discipline ──────────────────────────────────────────────────────────────────────────
// Every branch emits `member_signup.created` / `member_signup.failure` with masked-mobile ONLY
// (never the plaintext, never the token, never a continuation jti).

import { randomUUID } from 'node:crypto';

import type { MemberFullSession, MemberSignupCreateRequest } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../../context.js';
import {
  ConflictError,
  ForbiddenError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../../http-errors.js';
import { emitAuthAudit } from '../shared/audit.js';
import { encryptMobile, maskMobile, mobileBlindIndex, normalizeMobile } from '../shared/mobile-index.js';
import { closeScopeTx, openScopeTx } from '../../multi-tenant/scope-tx.js';
import { completeMemberLogin } from './member-auth.handlers.js';
import * as repo from './member-auth.repo.js';
import { verifySignupContinuation } from './tokens.js';

/** Extract a `Bearer <token>` value from the Authorization header (case-insensitive scheme). */
function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const space = header.indexOf(' ');
  if (space < 0 || header.slice(0, space).toLowerCase() !== 'bearer') return null;
  const token = header.slice(space + 1).trim();
  return token.length > 0 ? token : null;
}

export function createSignupHandlers(deps: AppDeps) {
  return {
    /**
     * POST /api/v1/member/auth/signup/create — create a member from a `signup_continuation` token.
     * Public (pre-session): the caller holds the continuation bearer, not a member session.
     */
    async signupCreate(request: FastifyRequest): Promise<MemberFullSession> {
      const body = request.body as MemberSignupCreateRequest;
      const now = deps.clock();

      // 1. Verify the continuation bearer (intent === 'signup', signature, not expired).
      const token = bearerToken(request);
      const claims = token ? verifySignupContinuation(request.server, token) : null;
      if (!claims) {
        emitAuthAudit(deps, request, 'member_signup.failure', { context: { reason: 'invalid_continuation' } });
        throw new UnauthorizedError('Invalid signup continuation', 'auth.invalid_continuation');
      }

      // 2. Re-derive the blind index from the supplied plaintext mobile and bind it to the token
      //    `sub` (R2) — a mismatch (or an unnormalizable mobile) is a 401.
      const canonical = normalizeMobile(body.mobile);
      const blindIndex = canonical ? await mobileBlindIndex(canonical, deps.encryption) : null;
      if (blindIndex === null || blindIndex !== claims.sub) {
        emitAuthAudit(deps, request, 'member_signup.failure', {
          context: { reason: 'mobile_mismatch', ...(canonical ? { masked_mobile: maskMobile(canonical) } : {}) },
        });
        throw new UnauthorizedError('Mobile does not match the continuation', 'auth.signup_mobile_mismatch');
      }
      const masked = maskMobile(canonical as string);

      // 3. Resolve the v1 default Pariwar (D1). A missing config is a SERVER gap (503), checked
      //    BEFORE the single-use jti is burned — burning a one-shot token on a server
      //    misconfiguration is gratuitous and would just re-503 on the member's retry.
      const pariwarIdStr = deps.config.defaultSignupPariwarId;
      if (!pariwarIdStr) {
        emitAuthAudit(deps, request, 'member_signup.failure', {
          context: { reason: 'pariwar_unconfigured', masked_mobile: masked },
        });
        throw new ServiceUnavailableError('Signup is not available', 'auth.signup_pariwar_unconfigured');
      }

      // 4. Atomically consume the single-use continuation jti (AC1(c)).
      const consume = await repo.consumeSignupContinuation(deps.pool, claims.jti, now);
      if (consume !== 'consumed') {
        const reason = consume === 'already_consumed' ? 'continuation_consumed' : 'continuation_expired';
        emitAuthAudit(deps, request, 'member_signup.failure', { context: { reason, masked_mobile: masked } });
        if (consume === 'already_consumed') {
          throw new ConflictError('Signup continuation already used', 'auth.signup_continuation_consumed');
        }
        throw new UnauthorizedError('Signup continuation expired', 'auth.signup_continuation_expired');
      }

      // 5. Duplicate-signup guard (AC2) — a clean 409 instead of the raw unique-index 500. Reads via
      //    the BYPASSRLS servicePool (pre-scope, mirror login's resolveMembersByMobile).
      const existing = await repo.resolveMembersByMobile(deps.servicePool, blindIndex);
      const priorInThisPariwar = existing.find((m) => m.pariwarId === pariwarIdStr);
      if (priorInThisPariwar) {
        // Story 10.10 (AC7) — the SECOND 12-month rejoin lock: a CURRENTLY-terminated identity
        // (FR-56 → FR-6). Checked BEFORE the withdrawal lock because termination is involuntary and
        // is the stronger signal; the two are independent locks over the same identity and either
        // one blocks. ⚠ NO fake `member_withdrawals` row is ever written on termination —
        // termination is not voluntary and must not masquerade as withdrawal.
        //
        // `moderationStatus` is the CURRENT standing derived from the LATEST moderation action, so a
        // RESTORE clears this block automatically (the repo maps `restore` → null). Do NOT "harden"
        // this by checking for the existence of a historical terminate row — that would lock a
        // restored member out permanently.
        const moderationRejoinAt = priorInThisPariwar.moderationRejoinPermittedAt;
        if (
          priorInThisPariwar.moderationStatus === 'terminated' &&
          moderationRejoinAt &&
          now < new Date(moderationRejoinAt)
        ) {
          emitAuthAudit(deps, request, 'member_moderation.rejoin_blocked', {
            context: { masked_mobile: masked, rejoin_permitted_at: moderationRejoinAt },
          });
          // The SAME dignified 403 shape as the withdrawal lock (AC7) — the member does not need to
          // learn a new error code to be told when they may return.
          throw new ForbiddenError(
            'This identity was terminated and rejoin is not yet permitted',
            'auth.rejoin_locked',
            {
              ...(priorInThisPariwar.moderatedAt
                ? { terminated_at: priorInThisPariwar.moderatedAt }
                : {}),
              rejoin_permitted_at: moderationRejoinAt,
            },
          );
        }

        // Story 3.10 — 12-month rejoin lock. A WITHDRAWN/ANONYMIZED identity within its rejoin window
        // is blocked with the dignified 403 auth.rejoin_locked (carrying the dates the client renders).
        // A non-withdrawn duplicate is the UNCHANGED 409. A withdrawn identity PAST its window is v1
        // OUT-OF-SCOPE (arch §1.14 `withdrawn → pending-fee` reactivation collides with the
        // member_identities UNIQUE(pariwar_id, mobile_blind_index) row) — it keeps the 409 behavior
        // and is recorded DEFERRED (Completion Notes + deferred-work.md). Do NOT pretend it works.
        const isTerminal =
          priorInThisPariwar.state === 'withdrawn' || priorInThisPariwar.state === 'anonymized';
        const rejoinPermittedAt = priorInThisPariwar.rejoinPermittedAt;
        if (isTerminal && rejoinPermittedAt && now < new Date(rejoinPermittedAt)) {
          emitAuthAudit(deps, request, 'member_withdrawal.rejoin_blocked', {
            context: { masked_mobile: masked, rejoin_permitted_at: rejoinPermittedAt },
          });
          throw new ForbiddenError(
            'This identity withdrew and rejoin is not yet permitted',
            'auth.rejoin_locked',
            {
              ...(priorInThisPariwar.withdrawnAt ? { withdrawn_at: priorInThisPariwar.withdrawnAt } : {}),
              rejoin_permitted_at: rejoinPermittedAt,
            },
          );
        }
        emitAuthAudit(deps, request, 'member_signup.failure', {
          context: { reason: 'member_already_exists', masked_mobile: masked },
        });
        throw new ConflictError('A member already exists for this mobile', 'auth.member_already_exists');
      }

      // 6. Mint the member id (== the events_log stream_id) + encrypt the mobile (Tier-1 envelope).
      const memberIdStr = randomUUID();
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const mobileCiphertext = await encryptMobile(canonical as string, deps.encryption);

      // 7. ONE scope-tx: emit member.signup_initiated (creates members + the stream — the FIRST
      //    production projectMemberState call) THEN insert member_identities. Same tx so a member
      //    can never exist without its identity row (R1).
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.signup_initiated',
          payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
          actorId: memberIdStr,
        });
        await memberDomain.insertMemberIdentity(scopeTx.tx, {
          memberId,
          pariwarId,
          mobileCiphertext,
          mobileBlindIndex: blindIndex,
        });
        ok = true;
      } catch (err) {
        // A duplicate-signup race (both passed the step-5 pre-check) surfaces here as the unique
        // violation — map it to the same clean 409 rather than a raw 500.
        if (memberDomain.isMemberIdentityDuplicate(err)) {
          emitAuthAudit(deps, request, 'member_signup.failure', {
            context: { reason: 'member_already_exists_race', masked_mobile: masked },
          });
          throw new ConflictError('A member already exists for this mobile', 'auth.member_already_exists');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // 8. The member is durably created — record it, then upgrade to a full session (trusted-device
      //    bind + access+refresh) by REUSING completeMemberLogin (the carve-out auth writes run on
      //    deps.pool, AFTER the member scope-tx commit — R1).
      emitAuthAudit(deps, request, 'member_signup.created', {
        actorId: memberIdStr,
        pariwarId: pariwarIdStr,
        context: { masked_mobile: masked },
      });
      return completeMemberLogin(
        deps,
        request,
        { memberId: memberIdStr, pariwarId: pariwarIdStr },
        body.deviceId,
        body.deviceLabel,
        masked,
      );
    },
  };
}
