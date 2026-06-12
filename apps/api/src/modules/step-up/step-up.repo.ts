// step-up OTP repository (Story 1.9, Task 5) — DB access for `step_up_otps`.
//
// GLOBAL table (carve-out family). Raw parameterized SQL on the shared pool. Only
// the OTP HASH is ever stored (§2.2). `invalidateActorOtps` enforces the
// invalidate-on-next-request rule so at most one OTP is live per actor.

import type pg from 'pg';

export interface LiveOtp {
  id: string;
  otpHash: string;
  actionContext: string;
  attempts: number;
  expiresAt: Date;
}

/** Burn every still-live OTP for an actor (invalidate-on-next, §2.2). */
export async function invalidateActorOtps(pool: pg.Pool, userId: string, now: Date): Promise<void> {
  await pool.query(
    `UPDATE step_up_otps SET consumed_at = $2
       WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId, now.toISOString()],
  );
}

export async function insertOtp(
  pool: pg.Pool,
  p: { userId: string; otpHash: string; actionContext: string; pariwarId: string | null; expiresAt: Date },
): Promise<void> {
  await pool.query(
    `INSERT INTO step_up_otps (user_id, otp_hash, action_context, pariwar_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
    [p.userId, p.otpHash, p.actionContext, p.pariwarId, p.expiresAt.toISOString()],
  );
}

/** The single live (unconsumed, unexpired) OTP for an actor, if any. */
export async function findLatestLiveOtp(
  pool: pg.Pool,
  userId: string,
  now: Date,
): Promise<LiveOtp | null> {
  const res = await pool.query<{
    id: string;
    otp_hash: string;
    action_context: string;
    attempts: number;
    expires_at: Date;
  }>(
    `SELECT id, otp_hash, action_context, attempts, expires_at
       FROM step_up_otps
      WHERE user_id = $1 AND consumed_at IS NULL AND expires_at > $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, now.toISOString()],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    otpHash: row.otp_hash,
    actionContext: row.action_context,
    attempts: row.attempts,
    expiresAt: row.expires_at,
  };
}

/** Atomically consume an OTP. Returns true iff this call was the one that consumed it. */
export async function burnOtp(pool: pg.Pool, id: string, now: Date): Promise<boolean> {
  const res = await pool.query(
    `UPDATE step_up_otps SET consumed_at = $2 WHERE id = $1 AND consumed_at IS NULL RETURNING id`,
    [id, now.toISOString()],
  );
  return (res.rowCount ?? 0) === 1;
}

export async function incrementOtpAttempts(pool: pg.Pool, id: string): Promise<number> {
  const res = await pool.query<{ attempts: number }>(
    `UPDATE step_up_otps SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
    [id],
  );
  return res.rows[0]?.attempts ?? 0;
}
