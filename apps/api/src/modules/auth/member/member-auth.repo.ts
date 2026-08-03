// Member-auth repository (Story 3.2) — DB access for the member-identity/auth family.
//
// Raw parameterized SQL on the shared pools (mirrors step-up.repo.ts +
// admin-session.handler.ts). Two pools, by RLS posture:
//   · the GLOBAL carve-out tables (member_auth_otps / member_refresh_tokens /
//     member_trusted_devices / member_step_up_elevations / member_signup_continuations)
//     are read/written via `deps.pool` — their USING(true) policy passes pre-scope.
//   · `member_identities` is TENANT-ISOLATED, but the login-by-mobile lookup runs
//     BEFORE scope is known, so it reads via the BYPASSRLS `deps.servicePool` (the
//     admin-session.handler.ts precedent, R2) — resolving the mobile across tenants.

import type pg from 'pg';

import type { schema } from '@twt/domain';

/** The two distinct member-OTP pools (canonical authority: domain schema). */
type MemberOtpIntent = schema.MemberOtpIntent;

// ── member_identities — pre-scope cross-tenant mobile lookup (servicePool) ──────

export interface ResolvedMembership {
  memberId: string;
  pariwarId: string;
  /** Public display name (pariwar_passport.display_name_en); the pariwarId if absent. */
  pariwarName: string;
  /**
   * The member's cached lifecycle state (members.state), or null if the row is missing (Story 3.10).
   * The signup rejoin-lock guard branches on this — {withdrawn, anonymized} route to the rejoin check.
   */
  state?: string | null;
  /**
   * The 12-month rejoin-lock lift instant (member_withdrawals.rejoin_permitted_at), ISO-8601, or null
   * when the member never withdrew (Story 3.10). Load-bearing for the signup rejoin-lock guard.
   */
  rejoinPermittedAt?: string | null;
  /**
   * When the member withdrew (member_withdrawals.withdrawn_at), ISO-8601, or null (Story 3.10). Carried
   * so the rejoin-block copy can render "This identity withdrew on {withdrawn_at}; rejoin is permitted
   * on {rejoin_permitted_at}" (AC3).
   */
  withdrawnAt?: string | null;
  /**
   * The member's CURRENT moderation standing (Story 10.10) — `'suspended'`, `'terminated'`, or null
   * when they have never been moderated. Derived from their LATEST `member_moderation_actions` row
   * (a `restore` maps to null: the standing is cleared, not merely historical).
   */
  moderationStatus?: 'suspended' | 'terminated' | null;
  /**
   * The FR-56 → FR-6 rejoin-lock lift instant from the member's latest moderation action, ISO-8601,
   * or null. Set only on a `terminate` (the DB CHECK enforces `NOT NULL` iff terminate). This is a
   * SECOND, independent rejoin lock alongside the Story 3.10 withdrawal lock — a terminated identity
   * is blocked even though it never withdrew, and NO fake `member_withdrawals` row is ever written.
   */
  moderationRejoinPermittedAt?: string | null;
  /** When the latest moderation action was taken, ISO-8601, or null. Rendered in the block copy. */
  moderatedAt?: string | null;
}

/**
 * Resolve a mobile blind index → member(s) across ALL tenants (BYPASSRLS service
 * pool). Returns 0 rows (no member — first signup), 1 (returning login), or many
 * (multi-Pariwar membership, R2). Ordered by created_at for a stable membership list.
 * Joins pariwar_passport (cross-readable carve-out) for the display name the
 * pariwar_select branch shows.
 *
 * Story 3.10: also LEFT JOINs `members` (for `state`) + `member_withdrawals` (for `rejoin_permitted_at`)
 * so the signup handler's rejoin-lock guard can, PRE-scope, distinguish a withdrawn-in-window identity
 * (→ 403 auth.rejoin_locked) from a live duplicate (→ 409). Both joins read cross-tenant safely on the
 * BYPASSRLS servicePool (there is no `app.pariwar_id` set yet on the signup path).
 *
 * Story 10.10: additionally LATERAL-joins the member's LATEST `member_moderation_actions` row, so the
 * same guard can treat a CURRENTLY-terminated identity as terminal (FR-56 → FR-6). "Currently" is
 * load-bearing: the join takes the latest action and maps `restore` → not-moderated, so a RESTORE
 * CLEARS the block. A guard keyed on the mere EXISTENCE of a historical `terminate` row would leave a
 * restored member permanently locked out — the exact bug AC7's restore→permitted test pins against.
 *
 * ⚠ `member_moderation_actions` is TENANT-ISOLATED, but like `member_identities` and
 * `member_withdrawals` above it is read here on the BYPASSRLS `servicePool` because signup has no
 * scope yet. That is why migration 0091 GRANTs SELECT on it to `twt_service`.
 */
export async function resolveMembersByMobile(
  servicePool: pg.Pool,
  mobileBlindIndex: string,
): Promise<ResolvedMembership[]> {
  const res = await servicePool.query<{
    member_id: string;
    pariwar_id: string;
    display_name_en: string | null;
    state: string | null;
    rejoin_permitted_at: Date | null;
    withdrawn_at: Date | null;
    moderation_action: string | null;
    moderation_rejoin_permitted_at: Date | null;
    moderated_at: Date | null;
  }>(
    `SELECT mi.member_id, mi.pariwar_id, pp.display_name_en, m.state,
            mw.rejoin_permitted_at, mw.withdrawn_at,
            mma.action        AS moderation_action,
            mma.rejoin_permitted_at AS moderation_rejoin_permitted_at,
            mma.acted_at      AS moderated_at
       FROM member_identities mi
       LEFT JOIN pariwar_passport pp ON pp.pariwar_id = mi.pariwar_id
       LEFT JOIN members m ON m.member_id = mi.member_id
       LEFT JOIN member_withdrawals mw ON mw.member_id = mi.member_id
       LEFT JOIN LATERAL (
              SELECT action, rejoin_permitted_at, acted_at
                FROM member_moderation_actions
               WHERE member_id = mi.member_id
               -- Tiebreak on created_at (the DB clock, DEFAULT now(), assigned in the same tx as
               -- the event append) BEFORE the PK. acted_at is the injected app clock and can tie;
               -- the PK is gen_random_uuid(), so using it as the tiebreak would resolve a
               -- suspend/terminate pair by coin flip -- and picking the suspend here silently SKIPS
               -- the FR-6 12-month rejoin lock, since the guard below keys on terminate.
               ORDER BY acted_at DESC, created_at DESC, moderation_action_id DESC
               LIMIT 1
            ) mma ON true
      WHERE mi.mobile_blind_index = $1
      ORDER BY mi.created_at ASC`,
    [mobileBlindIndex],
  );
  return res.rows.map((r) => ({
    memberId: r.member_id,
    pariwarId: r.pariwar_id,
    pariwarName: r.display_name_en ?? r.pariwar_id,
    state: r.state,
    rejoinPermittedAt: r.rejoin_permitted_at ? r.rejoin_permitted_at.toISOString() : null,
    withdrawnAt: r.withdrawn_at ? r.withdrawn_at.toISOString() : null,
    // A `restore` (or no action at all) maps to null — the CURRENT standing, not the history.
    moderationStatus:
      r.moderation_action === 'terminate'
        ? 'terminated'
        : r.moderation_action === 'suspend'
          ? 'suspended'
          : null,
    moderationRejoinPermittedAt: r.moderation_rejoin_permitted_at
      ? r.moderation_rejoin_permitted_at.toISOString()
      : null,
    moderatedAt: r.moderated_at ? r.moderated_at.toISOString() : null,
  }));
}

/**
 * The mobile blind index for an authenticated member (step-up keys its OTP pool on
 * the mobile, like login). Read via servicePool by the globally-unique member_id —
 * member_identities is tenant-isolated, and the step-up flow keys on member_id, not scope.
 */
export async function getMemberMobileBlindIndex(
  servicePool: pg.Pool,
  memberId: string,
): Promise<string | null> {
  const res = await servicePool.query<{ mobile_blind_index: string }>(
    `SELECT mobile_blind_index FROM member_identities WHERE member_id = $1`,
    [memberId],
  );
  return res.rows[0]?.mobile_blind_index ?? null;
}

// ── member_auth_otps — login + step-up OTP pools (carve-out, deps.pool) ─────────

export interface MemberLiveOtp {
  id: string;
  otpHash: string;
  memberId: string | null;
  actionContext: string | null;
  attempts: number;
}

/** Burn every live OTP for a (mobile, intent) pool (invalidate-on-next, §2.2). */
export async function invalidateLiveOtps(
  pool: pg.Pool,
  mobileBlindIndex: string,
  intent: MemberOtpIntent,
  now: Date,
): Promise<void> {
  await pool.query(
    `UPDATE member_auth_otps SET consumed_at = $3
       WHERE mobile_blind_index = $1 AND intent = $2 AND consumed_at IS NULL`,
    [mobileBlindIndex, intent, now.toISOString()],
  );
}

export async function insertMemberOtp(
  pool: pg.Pool,
  p: {
    mobileBlindIndex: string;
    memberId: string | null;
    intent: MemberOtpIntent;
    actionContext: string | null;
    otpHash: string;
    expiresAt: Date;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO member_auth_otps
       (mobile_blind_index, member_id, intent, action_context, otp_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
    [p.mobileBlindIndex, p.memberId, p.intent, p.actionContext, p.otpHash, p.expiresAt.toISOString()],
  );
}

/**
 * The single live (unconsumed, unexpired) OTP for a (mobile, intent), if any.
 *
 * PR-Patch-4: when `expectedMemberId` is given (the step-up flow, where the OTP is
 * minted with `member_id` set), the lookup is additionally bound to that member — so
 * a different member sharing the same mobile/blind index (multi-Pariwar) cannot find
 * (and burn) another member's step-up OTP. Login OTPs pass `null` (member-agnostic).
 */
export async function findLatestLiveOtp(
  pool: pg.Pool,
  mobileBlindIndex: string,
  intent: MemberOtpIntent,
  now: Date,
  expectedMemberId: string | null = null,
): Promise<MemberLiveOtp | null> {
  const res = await pool.query<{
    id: string;
    otp_hash: string;
    member_id: string | null;
    action_context: string | null;
    attempts: number;
  }>(
    `SELECT id, otp_hash, member_id, action_context, attempts
       FROM member_auth_otps
      WHERE mobile_blind_index = $1 AND intent = $2 AND consumed_at IS NULL AND expires_at > $3
        AND ($4::uuid IS NULL OR member_id = $4)
      ORDER BY created_at DESC
      LIMIT 1`,
    [mobileBlindIndex, intent, now.toISOString(), expectedMemberId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    otpHash: row.otp_hash,
    memberId: row.member_id,
    actionContext: row.action_context,
    attempts: row.attempts,
  };
}

/** Atomically consume an OTP. Returns true iff this call was the one that consumed it. */
export async function burnOtp(pool: pg.Pool, id: string, now: Date): Promise<boolean> {
  const res = await pool.query(
    `UPDATE member_auth_otps SET consumed_at = $2 WHERE id = $1 AND consumed_at IS NULL RETURNING id`,
    [id, now.toISOString()],
  );
  return (res.rowCount ?? 0) === 1;
}

export async function incrementOtpAttempts(pool: pg.Pool, id: string): Promise<void> {
  await pool.query(`UPDATE member_auth_otps SET attempts = attempts + 1 WHERE id = $1`, [id]);
}

/**
 * Atomically increment the attempt counter IFF below the cap (P1). Returns the new
 * count, or null if the OTP is already consumed or the cap is already hit — caller
 * must treat null as "burn it" to prevent further guessing.
 */
export async function atomicIncrementOtpAttempts(
  pool: pg.Pool,
  id: string,
  maxAttempts: number,
): Promise<number | null> {
  const res = await pool.query<{ attempts: number }>(
    `UPDATE member_auth_otps SET attempts = attempts + 1
       WHERE id = $1 AND consumed_at IS NULL AND attempts < $2
       RETURNING attempts`,
    [id, maxAttempts],
  );
  return res.rows[0]?.attempts ?? null;
}

// ── member_trusted_devices (carve-out, deps.pool) ──────────────────────────────

export interface TrustedDevice {
  id: string;
  deviceId: string;
  deviceLabel: string | null;
  boundAt: Date;
}

/** All trusted devices for a member, OLDEST-FIRST (the eviction order). */
export async function listTrustedDevices(pool: pg.Pool, memberId: string): Promise<TrustedDevice[]> {
  const res = await pool.query<{ id: string; device_id: string; device_label: string | null; bound_at: Date }>(
    `SELECT id, device_id, device_label, bound_at FROM member_trusted_devices
       WHERE member_id = $1 ORDER BY bound_at ASC`,
    [memberId],
  );
  return res.rows.map((r) => ({ id: r.id, deviceId: r.device_id, deviceLabel: r.device_label, boundAt: r.bound_at }));
}

export async function insertTrustedDevice(
  pool: pg.Pool,
  p: { memberId: string; deviceId: string; pariwarId: string; deviceLabel: string | null; now: Date },
): Promise<void> {
  await pool.query(
    `INSERT INTO member_trusted_devices (member_id, device_id, pariwar_id, device_label, bound_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $5)`,
    [p.memberId, p.deviceId, p.pariwarId, p.deviceLabel, p.now.toISOString()],
  );
}

export async function touchTrustedDevice(
  pool: pg.Pool,
  memberId: string,
  deviceId: string,
  now: Date,
): Promise<void> {
  await pool.query(
    `UPDATE member_trusted_devices SET last_seen_at = $3 WHERE member_id = $1 AND device_id = $2`,
    [memberId, deviceId, now.toISOString()],
  );
}

export async function deleteTrustedDevice(pool: pg.Pool, id: string): Promise<void> {
  await pool.query(`DELETE FROM member_trusted_devices WHERE id = $1`, [id]);
}

// ── member_refresh_tokens (carve-out, deps.pool) ───────────────────────────────

export interface RefreshTokenRow {
  id: string;
  memberId: string;
  pariwarId: string;
  deviceId: string;
  expiresAt: Date;
  /** When this token was minted — used for the absolute-ceiling check (P32). */
  createdAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
}

export async function insertRefreshToken(
  pool: pg.Pool,
  p: { memberId: string; pariwarId: string; deviceId: string; tokenHash: string; expiresAt: Date },
): Promise<void> {
  await pool.query(
    `INSERT INTO member_refresh_tokens (member_id, pariwar_id, device_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
    [p.memberId, p.pariwarId, p.deviceId, p.tokenHash, p.expiresAt.toISOString()],
  );
}

export async function findRefreshTokenByHash(
  pool: pg.Pool,
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  const res = await pool.query<{
    id: string;
    member_id: string;
    pariwar_id: string;
    device_id: string;
    expires_at: Date;
    created_at: Date;
    rotated_at: Date | null;
    revoked_at: Date | null;
  }>(
    `SELECT id, member_id, pariwar_id, device_id, expires_at, created_at, rotated_at, revoked_at
       FROM member_refresh_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    memberId: row.member_id,
    pariwarId: row.pariwar_id,
    deviceId: row.device_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    rotatedAt: row.rotated_at,
    revokedAt: row.revoked_at,
  };
}

/** Atomically rotate a refresh token. Returns true iff THIS call rotated it (else a
 * concurrent rotation / reuse already did — the caller treats false as reuse). */
export async function markRefreshTokenRotated(pool: pg.Pool, id: string, now: Date): Promise<boolean> {
  const res = await pool.query(
    `UPDATE member_refresh_tokens SET rotated_at = $2
       WHERE id = $1 AND rotated_at IS NULL AND revoked_at IS NULL RETURNING id`,
    [id, now.toISOString()],
  );
  return (res.rowCount ?? 0) === 1;
}

/**
 * Revoke a whole device refresh chain (reuse-detection response, §2.4).
 * Returns the number of rows revoked (P7 — RETURNING so callers know if anything
 * actually changed; a silent no-op on a stale deviceId previously hid missing data).
 */
export async function revokeDeviceChain(
  pool: pg.Pool,
  memberId: string,
  deviceId: string,
  now: Date,
): Promise<number> {
  const res = await pool.query(
    `UPDATE member_refresh_tokens SET revoked_at = $3
       WHERE member_id = $1 AND device_id = $2 AND revoked_at IS NULL RETURNING id`,
    [memberId, deviceId, now.toISOString()],
  );
  return res.rowCount ?? 0;
}

/**
 * The suspension cascade (§2.4 line 1428 / architecture.md:1433-1434 / FR-56): delete ALL of a
 * member's refresh tokens (revoking every session) + their trusted-device bindings. Returns the
 * number of refresh-token rows removed (for the audit context).
 *
 * ── Story 10.10 WIRED this seam ─────────────────────────────────────────────────────────────────
 * It shipped in Story 3.2 as a named-but-uncalled seam ("a later epic wires" —
 * member-auth.service.ts). Story 10.10 is that epic: `suspend` AND `terminate` both call it.
 *
 * `executor` is widened to `pg.Pool | pg.PoolClient` so the moderation route can run the cascade
 * INSIDE its scope transaction, alongside the event append and the decision-record insert. That
 * matters: if the moderation write rolls back, the member must NOT be left logged out. Both tables
 * are Story 1.6 GLOBAL carve-outs (`USING (true)` for twt_app, with DELETE granted in migration
 * 0019), so they are writable from a `SET LOCAL ROLE twt_app` scope tx exactly as from the pool.
 *
 * ── Why trusted devices are cleared too (a DELIBERATE call, not an inherited default) ───────────
 * A refresh chain and a trusted-device binding are different objects: the chain is the live
 * session, the binding is the max-2 device slot. Clearing only the chain would force
 * re-authentication while leaving the moderated member's device slots occupied — so a suspension
 * would silently consume their device budget, and the FR-56 intent ("every device re-authenticates
 * and observes the new standing") would be half-met. architecture.md:1433-1434 says the cascade
 * deletes "all sessions + refresh tokens"; the binding is what makes a device a session-bearer, so
 * it goes. This is also the behaviour this function has had since 3.2 — Story 10.10 wires the seam,
 * it does not redefine it.
 *
 * ⚠ This is NOT a login block. A suspended or terminated member MUST still be able to sign in, to
 * read the dignified explanation and reach the appeal CTA (Decision 6). Enforcement is `is_valid`,
 * not a locked door — see the pinning test in the moderation integration spec.
 */
export async function revokeAllMemberSessions(
  executor: pg.Pool | pg.PoolClient,
  memberId: string,
): Promise<number> {
  const res = await executor.query(`DELETE FROM member_refresh_tokens WHERE member_id = $1`, [
    memberId,
  ]);
  await executor.query(`DELETE FROM member_trusted_devices WHERE member_id = $1`, [memberId]);
  return res.rowCount ?? 0;
}

// ── member_step_up_elevations (carve-out, deps.pool) ───────────────────────────

/**
 * Upsert an elevation record (P23). Plain INSERT accumulates duplicate rows on
 * concurrent verifies for the same member+action; ON CONFLICT ... DO UPDATE collapses
 * them to the latest elevated_until. Requires the unique index
 * member_step_up_elevations_member_action_uq added in migration 0021.
 */
export async function insertElevation(
  pool: pg.Pool,
  p: { memberId: string; actionContext: string; elevatedUntil: Date },
): Promise<void> {
  await pool.query(
    `INSERT INTO member_step_up_elevations (member_id, action_context, elevated_until)
       VALUES ($1, $2, $3)
       ON CONFLICT (member_id, action_context) DO UPDATE SET elevated_until = EXCLUDED.elevated_until`,
    [p.memberId, p.actionContext, p.elevatedUntil.toISOString()],
  );
}

/** True iff a FRESH elevation (elevated_until > now) exists for (member, action_context). */
export async function hasFreshElevation(
  pool: pg.Pool,
  memberId: string,
  actionContext: string,
  now: Date,
): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM member_step_up_elevations
       WHERE member_id = $1 AND action_context = $2 AND elevated_until > $3 LIMIT 1`,
    [memberId, actionContext, now.toISOString()],
  );
  return (res.rowCount ?? 0) > 0;
}

// ── member_signup_continuations (carve-out, deps.pool) ─────────────────────────

export async function insertSignupContinuation(
  pool: pg.Pool,
  p: { jti: string; mobileBlindIndex: string; expiresAt: Date },
): Promise<void> {
  await pool.query(
    `INSERT INTO member_signup_continuations (jti, mobile_blind_index, expires_at)
       VALUES ($1, $2, $3)`,
    [p.jti, p.mobileBlindIndex, p.expiresAt.toISOString()],
  );
}

/**
 * Atomically consume a signup-continuation jti (single-use, Story 3.6a — the mirror of
 * `consumePariwarSelect`). Burns the row only if it is unconsumed AND unexpired, so the two
 * failure modes are distinguished (AC1(c)):
 *   'consumed'          — THIS call burned it → proceed with member creation;
 *   'already_consumed'  — the row exists with `consumed_at` set (replay) → 409;
 *   'expired_or_missing'— no such jti, or it is past `expires_at` → 401 (member restarts OTP).
 * Freshness (`expires_at`) is ALSO checked here (not only by the JWT `exp`) so a row that lingers
 * past its window is treated as expired rather than silently reusable.
 */
export async function consumeSignupContinuation(
  pool: pg.Pool,
  jti: string,
  now: Date,
): Promise<'consumed' | 'already_consumed' | 'expired_or_missing'> {
  const burn = await pool.query(
    `UPDATE member_signup_continuations SET consumed_at = $2
       WHERE jti = $1 AND consumed_at IS NULL AND expires_at > $2 RETURNING jti`,
    [jti, now.toISOString()],
  );
  if ((burn.rowCount ?? 0) === 1) return 'consumed';
  // The UPDATE missed — probe the row to tell "already consumed" (409) from "expired/missing" (401).
  const probe = await pool.query<{ consumed_at: Date | null }>(
    `SELECT consumed_at FROM member_signup_continuations WHERE jti = $1 LIMIT 1`,
    [jti],
  );
  const row = probe.rows[0];
  if (row && row.consumed_at !== null) return 'already_consumed';
  return 'expired_or_missing';
}

// ── member_pariwar_selects — single-use scope-select registry (carve-out) ───────

/** Register a single-use pariwar-select jti (PR-Patch-10). */
export async function insertPariwarSelect(
  pool: pg.Pool,
  p: { jti: string; mobileBlindIndex: string; expiresAt: Date },
): Promise<void> {
  await pool.query(
    `INSERT INTO member_pariwar_selects (jti, mobile_blind_index, expires_at)
       VALUES ($1, $2, $3)`,
    [p.jti, p.mobileBlindIndex, p.expiresAt.toISOString()],
  );
}

/**
 * Atomically consume a pariwar-select jti (single-use, PR-Patch-10). Freshness (exp)
 * is enforced by the JWT verify; this enforces single-use. Returns:
 *   'consumed' — THIS call burned it → proceed;
 *   'already'  — it was already consumed (replay) → 409;
 *   'unknown'  — no such jti → treat as an invalid token.
 */
export async function consumePariwarSelect(
  pool: pg.Pool,
  jti: string,
  now: Date,
): Promise<'consumed' | 'already' | 'unknown'> {
  const burn = await pool.query(
    `UPDATE member_pariwar_selects SET consumed_at = $2
       WHERE jti = $1 AND consumed_at IS NULL RETURNING jti`,
    [jti, now.toISOString()],
  );
  if ((burn.rowCount ?? 0) === 1) return 'consumed';
  const exists = await pool.query(`SELECT 1 FROM member_pariwar_selects WHERE jti = $1 LIMIT 1`, [jti]);
  return (exists.rowCount ?? 0) === 0 ? 'unknown' : 'already';
}
