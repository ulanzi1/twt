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
}

/**
 * Resolve a mobile blind index → member(s) across ALL tenants (BYPASSRLS service
 * pool). Returns 0 rows (no member — first signup), 1 (returning login), or many
 * (multi-Pariwar membership, R2). Ordered by created_at for a stable membership list.
 * Joins pariwar_passport (cross-readable carve-out) for the display name the
 * pariwar_select branch shows.
 */
export async function resolveMembersByMobile(
  servicePool: pg.Pool,
  mobileBlindIndex: string,
): Promise<ResolvedMembership[]> {
  const res = await servicePool.query<{
    member_id: string;
    pariwar_id: string;
    display_name_en: string | null;
  }>(
    `SELECT mi.member_id, mi.pariwar_id, pp.display_name_en
       FROM member_identities mi
       LEFT JOIN pariwar_passport pp ON pp.pariwar_id = mi.pariwar_id
      WHERE mi.mobile_blind_index = $1
      ORDER BY mi.created_at ASC`,
    [mobileBlindIndex],
  );
  return res.rows.map((r) => ({
    memberId: r.member_id,
    pariwarId: r.pariwar_id,
    pariwarName: r.display_name_en ?? r.pariwar_id,
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
 * Suspension cascade seam (§2.4 line 1428 / FR-56): delete ALL of a member's
 * refresh tokens (revoking every session) + their trusted-device bindings. Exposed
 * now so the later suspension/force-re-OTP signal handler can call it. Returns the
 * number of refresh-token rows removed (for the audit context).
 */
export async function revokeAllMemberSessions(pool: pg.Pool, memberId: string): Promise<number> {
  const res = await pool.query(`DELETE FROM member_refresh_tokens WHERE member_id = $1`, [memberId]);
  await pool.query(`DELETE FROM member_trusted_devices WHERE member_id = $1`, [memberId]);
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
