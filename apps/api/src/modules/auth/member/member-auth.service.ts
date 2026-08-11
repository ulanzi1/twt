// Member-auth service (Story 3.2, Tasks 3-4) — session issuance + token rotation.
//
// Owns the §2.4 member session model: trusted-device binding (max 2, 3rd drops the
// oldest — R6), full-session issuance (access JWT + opaque rotated refresh token),
// and the rotation-on-use refresh flow with reuse detection. Pure orchestration over
// the repo + token helpers; the handlers own HTTP + audit.

import type { MemberFullSession } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../../context.js';
import * as repo from './member-auth.repo.js';
import * as terminationBlock from './termination-block-seam.js';
import type { TerminationNotice } from './termination-block-seam.js';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens.js';

export interface IssueSessionArgs {
  memberId: string;
  pariwarId: string;
  deviceId: string;
  deviceLabel?: string | undefined;
}

export interface DroppedDeviceInfo {
  deviceId: string;
  deviceLabel: string | null;
  boundAt: Date;
}

/**
 * Bind (or refresh) a trusted device. At cap (`memberMaxTrustedDevices`), binding a
 * NEW device drops the OLDEST (`bound_at`) + revokes its refresh chain (R6 — the
 * login OTP authorized the replacement). Returns the dropped device, if any.
 */
async function bindDevice(
  deps: AppDeps,
  args: IssueSessionArgs,
  now: Date,
): Promise<DroppedDeviceInfo | undefined> {
  // P15: a zero cap would allow unbounded device bindings. Guard at service entry.
  if (deps.config.memberMaxTrustedDevices < 1) {
    throw new Error('[member-auth] memberMaxTrustedDevices must be ≥ 1');
  }

  // PR-Patch-3: serialize this read-modify-write per member with a Postgres advisory
  // lock. Without it, two concurrent logins binding two NEW devices at cap can both
  // observe "2 devices", both drop the same oldest, and both insert — leaving 3
  // trusted devices (the only unique index is (member_id, device_id); it does not
  // bound the row count). The lock is held on a dedicated connection for the
  // critical section and released in finally (also auto-released if the conn drops).
  const lockClient = await deps.pool.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock(hashtext($1)::bigint)', [args.memberId]);

    const devices = await repo.listTrustedDevices(deps.pool, args.memberId); // oldest-first
    const already = devices.find((d) => d.deviceId === args.deviceId);
    if (already) {
      await repo.touchTrustedDevice(deps.pool, args.memberId, args.deviceId, now);
      return undefined;
    }
    let dropped: DroppedDeviceInfo | undefined;
    if (devices.length >= deps.config.memberMaxTrustedDevices) {
      const oldest = devices[0];
      if (oldest) {
        await repo.deleteTrustedDevice(deps.pool, oldest.id);
        // P16: revokeDeviceChain may throw AFTER deleteTrustedDevice already ran. That
        // orphans the device row but the token chain is left active — log and propagate.
        try {
          await repo.revokeDeviceChain(deps.pool, args.memberId, oldest.deviceId, now);
        } catch (err) {
          console.error('[member-auth] revokeDeviceChain failed after deleteTrustedDevice', err);
          throw err;
        }
        dropped = { deviceId: oldest.deviceId, deviceLabel: oldest.deviceLabel, boundAt: oldest.boundAt };
      }
    }
    // P17: insertTrustedDevice may throw AFTER drop already ran. Propagate the error;
    // the session issuance caller will audit and surface a 5xx.
    try {
      await repo.insertTrustedDevice(deps.pool, {
        memberId: args.memberId,
        deviceId: args.deviceId,
        pariwarId: args.pariwarId,
        deviceLabel: args.deviceLabel ?? null,
        now,
      });
    } catch (err) {
      console.error('[member-auth] insertTrustedDevice failed after device drop', err);
      throw err;
    }
    return dropped;
  } finally {
    try {
      await lockClient.query('SELECT pg_advisory_unlock(hashtext($1)::bigint)', [args.memberId]);
    } finally {
      lockClient.release();
    }
  }
}

export interface IssuedSession {
  session: MemberFullSession;
  /** The dropped device (for the member_device.dropped audit), if any. */
  droppedDevice: DroppedDeviceInfo | undefined;
}

/** Bind the device, mint an access JWT + opaque refresh token, return the wire session. */
export async function issueFullSession(
  deps: AppDeps,
  app: FastifyInstance,
  args: IssueSessionArgs,
  now: Date,
): Promise<IssuedSession> {
  const droppedDevice = await bindDevice(deps, args, now);

  const { token: refreshToken, tokenHash } = generateRefreshToken();
  await repo.insertRefreshToken(deps.pool, {
    memberId: args.memberId,
    pariwarId: args.pariwarId,
    deviceId: args.deviceId,
    tokenHash,
    expiresAt: new Date(now.getTime() + deps.config.memberRefreshTtlMs),
  });

  const accessToken = signAccessToken(
    app,
    { memberId: args.memberId, pariwarId: args.pariwarId, deviceId: args.deviceId },
    deps.config.memberAccessTtlMs,
  );
  const accessTokenExpiresAt = new Date(now.getTime() + deps.config.memberAccessTtlMs).toISOString();

  const session: MemberFullSession = {
    sessionType: 'full_session',
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    deviceId: args.deviceId,
    memberId: args.memberId,
    pariwarId: args.pariwarId,
    ...(droppedDevice
      ? {
          droppedDevice: {
            deviceId: droppedDevice.deviceId,
            ...(droppedDevice.deviceLabel ? { deviceLabel: droppedDevice.deviceLabel } : {}),
            boundAt: droppedDevice.boundAt.toISOString(),
          },
        }
      : {}),
  };
  return { session, droppedDevice };
}

export type RotateResult =
  | { ok: true; session: MemberFullSession; memberId: string; deviceId: string }
  | { ok: false; reason: 'unknown' | 'expired' | 'concurrent' }
  | { ok: false; reason: 'reuse'; memberId: string; deviceId: string }
  | {
      ok: false;
      reason: 'member_blocked';
      /**
       * ⛔ WHY the member is blocked — Story 10.19 AC5, and it is REQUIRED, not informational.
       *
       * Before this, `member_blocked` carried no discriminator, so the handler could not tell a
       * withdrawn member from a terminated one and threw `auth.member_withdrawn` with "Member is
       * not active" for BOTH. A terminated member on the refresh path was therefore told something
       * false about their own account.
       *
       * ⛔ The handler must switch on THIS field. It must NOT re-read member state to recover the
       * cause — that is a second query to rebuild information the service already had and threw
       * away, and the two reads could disagree under concurrent moderation.
       */
      cause: 'withdrawn' | 'anonymized' | 'terminated';
      /**
       * The structured termination notice, present ONLY when `cause === 'terminated'`.
       *
       * ⚠ Carried here deliberately, slightly beyond AC5's literal text. Decision `2026-08-10-097`
       * clause 8 requires a CONTROLLED TERMINATION STATE rather than a generic authentication
       * failure, and AC10 requires the member-app surface to render FROM this payload. A refresh
       * denial is where a member with a live app hits the block FIRST — before any re-login — so
       * omitting it here would leave that surface with nothing to render but an error code, which
       * is precisely the generic failure clause 8 rules out.
       */
      notice?: TerminationNotice;
      memberId: string;
      deviceId: string;
    };

/**
 * Rotate-on-use refresh (§2.4). Presenting an already-rotated/revoked token (or
 * losing the atomic rotation race) is REUSE → revoke the device's whole chain and
 * signal the caller to audit `member_session.reuse_revoke`. The device id + scope are
 * sourced from the stored row, never the client (unverifiable/spoofable).
 */
export async function rotateRefresh(
  deps: AppDeps,
  app: FastifyInstance,
  refreshTokenPlain: string,
  now: Date,
): Promise<RotateResult> {
  const tokenHash = hashToken(refreshTokenPlain);
  const row = await repo.findRefreshTokenByHash(deps.pool, tokenHash);
  if (!row) return { ok: false, reason: 'unknown' };

  if (row.revokedAt !== null || row.rotatedAt !== null) {
    // A replayed rotated/revoked token signals theft → revoke the whole device chain.
    // (A token read here with rotated_at ALREADY set is a sequential replay-after-
    // rotation, NOT a concurrent double-tap — those race on the atomic UPDATE below and
    // are handled in the `!rotated` branch. Keeping this strict preserves the classic
    // rotation reuse-detection: whoever presents a superseded token loses the chain.)
    // P18: revokeDeviceChain may throw; propagate so the caller surfaces a 5xx.
    try {
      await repo.revokeDeviceChain(deps.pool, row.memberId, row.deviceId, now);
    } catch (err) {
      console.error('[member-auth] revokeDeviceChain failed on reuse detection', err);
      throw err;
    }
    return { ok: false, reason: 'reuse', memberId: row.memberId, deviceId: row.deviceId };
  }
  if (row.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  // P32: absolute ceiling — revoke if the token was minted more than memberRefreshAbsoluteMs ago.
  if (now.getTime() - row.createdAt.getTime() > deps.config.memberRefreshAbsoluteMs) {
    await repo.revokeDeviceChain(deps.pool, row.memberId, row.deviceId, now);
    return { ok: false, reason: 'expired' };
  }

  // PR-Patch-9: re-check member lifecycle state. The login path blocks withdrawn/anonymized
  // members; a long-lived (90d) refresh chain must too — belt-and-suspenders over the suspension
  // cascade (`revokeAllMemberSessions`). Without this, a member withdrawn AFTER login keeps minting
  // fresh access tokens for the life of the refresh chain. Read via serviceDb (BYPASSRLS,
  // pre-scope-safe), mirroring the login gate.
  //
  // ⚖ Story 10.19: the cascade IS now wired — this comment previously read "which a later epic
  // wires", and this is that epic. Left as a live sentence it would send the next reader hunting for
  // work already done. `revokeAllMemberSessions` runs inside the moderation transaction
  // (`member-moderation/handlers.ts`), and the two mechanisms are complementary, not redundant: the
  // cascade clears sessions at the MOMENT of the decision, while this re-check catches a chain that
  // survived it (a race, a retry, or a moderation action that never reached the cascade).
  //
  // ── ⭐ THE SECOND READ SITE, AND WHY IT SHARES THE LOGIN GATE'S SEAM (AC5) ──────────────────────
  // This is the same `resolveSessionDenial` the login gate calls, with the same inputs, and that is
  // load-bearing rather than tidy. If only the login path were gated, a terminated member holding a
  // live app would KEEP ROTATING refresh tokens indefinitely and never re-authenticate — the block
  // would be green in tests and absent in production for exactly the members it targets. One key,
  // one seam, two call sites: the flag state, the fail-open polarity, the unbounded overlay read and
  // the exhaustive `ModerationStatus` switch cannot drift between them, because there is only one of
  // each. `row.pariwarId` is the SAME tenant the login gate resolves, so a per-Pariwar flip applies
  // identically at both sites.
  const state = await memberDomain.getMemberStateAt(deps.serviceDb, ids.memberId(row.memberId), now);
  const denial = await terminationBlock.resolveSessionDenial(deps, {
    memberId: row.memberId,
    pariwarId: row.pariwarId,
    lifecycleState: state,
    now,
    // Mirrors the login call site (`member-auth.handlers.ts`) — without this, a flag/overlay lookup
    // failure on the refresh path degrades silently with zero telemetry, unlike login.
    onError: (err) =>
      app.log.warn({ err }, 'termination-access flag/overlay resolution failed on refresh'),
    onAccess: (d, source) =>
      app.log.debug(
        { flag: 'termination_access_block', reason: d.reason, enabled: d.enabled, source },
        'termination-access: flag resolved',
      ),
  });
  if (denial !== null) {
    await repo.revokeDeviceChain(deps.pool, row.memberId, row.deviceId, now);
    return {
      ok: false,
      reason: 'member_blocked',
      // Set at THE one return site — the union's `cause` cannot be forgotten at a second one,
      // because the seam is what produces it and there is no other path to this arm.
      cause: denial.reason,
      ...(denial.reason === 'terminated' ? { notice: denial.notice } : {}),
      memberId: row.memberId,
      deviceId: row.deviceId,
    };
  }

  const rotated = await repo.markRefreshTokenRotated(deps.pool, row.id, now);
  if (!rotated) {
    // PR-Patch-11: lost the atomic rotation race. Distinguish a BENIGN concurrent
    // rotation of the SAME token (a double-tap / retry on flaky connectivity — the
    // sibling request already minted the successor) from a genuine replay of an OLD
    // rotated token (theft). Re-read: if the row was rotated within the grace window
    // and is not revoked, treat as benign (do NOT revoke — that would also kill the
    // sibling's freshly-issued token). Otherwise it is reuse → revoke the chain.
    const after = await repo.findRefreshTokenByHash(deps.pool, tokenHash);
    if (
      after &&
      after.rotatedAt !== null &&
      after.revokedAt === null &&
      now.getTime() - after.rotatedAt.getTime() <= deps.config.memberRefreshRaceGraceMs
    ) {
      return { ok: false, reason: 'concurrent' };
    }
    try {
      await repo.revokeDeviceChain(deps.pool, row.memberId, row.deviceId, now);
    } catch (err) {
      console.error('[member-auth] revokeDeviceChain failed after losing rotation race', err);
      throw err;
    }
    return { ok: false, reason: 'reuse', memberId: row.memberId, deviceId: row.deviceId };
  }

  // Mint the next token in the chain, bound to the SAME member/scope/device.
  const { token: refreshToken, tokenHash: nextHash } = generateRefreshToken();
  // P19: insert new token may throw after rotation stamp is committed. The old token
  // is now permanently rotated but the new one was never issued — the session is stuck.
  // Propagate the error so the handler surfaces a 5xx (the client can re-authenticate).
  try {
    await repo.insertRefreshToken(deps.pool, {
      memberId: row.memberId,
      pariwarId: row.pariwarId,
      deviceId: row.deviceId,
      tokenHash: nextHash,
      expiresAt: new Date(now.getTime() + deps.config.memberRefreshTtlMs),
    });
  } catch (err) {
    console.error('[member-auth] insertRefreshToken failed after rotation — session stuck', err);
    throw err;
  }
  await repo.touchTrustedDevice(deps.pool, row.memberId, row.deviceId, now);

  const accessToken = signAccessToken(
    app,
    { memberId: row.memberId, pariwarId: row.pariwarId, deviceId: row.deviceId },
    deps.config.memberAccessTtlMs,
  );
  const session: MemberFullSession = {
    sessionType: 'full_session',
    accessToken,
    accessTokenExpiresAt: new Date(now.getTime() + deps.config.memberAccessTtlMs).toISOString(),
    refreshToken,
    deviceId: row.deviceId,
    memberId: row.memberId,
    pariwarId: row.pariwarId,
  };
  return { ok: true, session, memberId: row.memberId, deviceId: row.deviceId };
}
