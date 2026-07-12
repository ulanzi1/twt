// admin-auth repository (Story 1.9, Task 4) — DB access for the GLOBAL identity +
// auth tables.
//
// Raw parameterized SQL on the shared pool (no drizzle-orm import in apps/api).
// These tables are the carve-out family (USING(true) for twt_app, R2): login runs
// BEFORE any scope, so there is no `app.pariwar_id` here — the queries are global.
// Snake_case at the DB boundary; camelCase in the returned records.

import type pg from 'pg';

import type { StoredCredential } from '../shared/webauthn.js';

type Queryable = Pick<pg.Pool, 'query'> & { connect?: pg.Pool['connect'] };

export interface AdminAuthRecord {
  userId: string;
  status: string;
  passwordHash: string;
  emailCiphertext: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}

/** Look up an admin by the email blind index (the login lookup), joining identity. */
export async function findAdminByEmailIndex(
  db: Queryable,
  blindIndex: string,
): Promise<AdminAuthRecord | null> {
  const res = await db.query<{
    user_id: string;
    status: string;
    password_hash: string;
    email_ciphertext: string;
    failed_attempts: number;
    locked_until: Date | null;
  }>(
    `SELECT u.id AS user_id, u.status, c.password_hash, c.email_ciphertext,
            c.failed_attempts, c.locked_until
       FROM admin_credentials c
       JOIN users u ON u.id = c.user_id
      WHERE c.email_blind_index = $1`,
    [blindIndex],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    status: row.status,
    passwordHash: row.password_hash,
    emailCiphertext: row.email_ciphertext,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
  };
}

/** Fetch an admin's credential record by user id (the reset single-use bind path). */
export async function getAdminById(
  db: Queryable,
  userId: string,
): Promise<{ userId: string; status: string; passwordHash: string } | null> {
  const res = await db.query<{ status: string; password_hash: string }>(
    `SELECT u.status, c.password_hash
       FROM admin_credentials c JOIN users u ON u.id = c.user_id
      WHERE c.user_id = $1`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return { userId, status: row.status, passwordHash: row.password_hash };
}

/** Bootstrap/create an admin (users + admin_credentials) atomically. Story 6.11 (R5): an OPTIONAL
 *  `displayName` seeds the controlled staff-attribution `users.display_name` (the actor_display source)
 *  at provisioning time; omitted, it stays NULL and the admin cannot adjudicate until ops sets it via
 *  updateDisplayName (AdminDisplayNameMissingError). NEVER email-derived. */
export async function createAdmin(
  pool: pg.Pool,
  p: {
    userId: string;
    emailCiphertext: string;
    emailBlindIndex: string;
    passwordHash: string;
    displayName?: string;
  },
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO users (id, identity_type, display_name) VALUES ($1, 'admin', $2)`, [
      p.userId,
      p.displayName ?? null,
    ]);
    await client.query(
      `INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash)
         VALUES ($1, $2, $3, $4)`,
      [p.userId, p.emailCiphertext, p.emailBlindIndex, p.passwordHash],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Thrown by `updateDisplayName` when the caller passes an empty/whitespace-only display name — a
 *  caller-input error (ops script/seed/future profile UI), distinct from `AdminDisplayNameMissingError`
 *  (the READ-side "no display name set yet" block at adjudication time). */
export class InvalidDisplayNameError extends Error {
  public readonly name = 'InvalidDisplayNameError';
  public constructor() {
    super('[admin-auth] display name must be a non-empty trimmed string');
  }
}

/** Story 6.11 (R5) — set/replace an admin's controlled staff-attribution display name (ops/seed +
 *  tests provision it here; a self-serve profile UI is out of scope in v1). Validates a non-empty
 *  trimmed value; NEVER accepts an email-derived string (the caller passes a real display name).
 *  Returns the number of rows updated (0 = no such user). Runs on the GLOBAL users carve-out. */
export async function updateDisplayName(pool: pg.Pool, userId: string, displayName: string): Promise<number> {
  const trimmed = displayName.trim();
  if (trimmed === '') {
    throw new InvalidDisplayNameError();
  }
  const res = await pool.query(
    `UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1`,
    [userId, trimmed],
  );
  return res.rowCount ?? 0;
}

/** Story 6.11 (R5) — read an admin's controlled staff-attribution display name (the actor_display
 *  source). Returns `null` when the user has no display name set — the adjudication write path treats
 *  that (or a whitespace-only value) as "missing" and blocks with AdminDisplayNameMissingError. */
export async function getDisplayName(db: Queryable, userId: string): Promise<string | null> {
  const res = await db.query<{ display_name: string | null }>(
    `SELECT display_name FROM users WHERE id = $1`,
    [userId],
  );
  const raw = res.rows[0]?.display_name ?? null;
  return raw !== null && raw.trim() !== '' ? raw : null;
}

export async function incrementFailedAttempts(db: Queryable, userId: string): Promise<number> {
  const res = await db.query<{ failed_attempts: number }>(
    `UPDATE admin_credentials SET failed_attempts = failed_attempts + 1, updated_at = now()
       WHERE user_id = $1 RETURNING failed_attempts`,
    [userId],
  );
  return res.rows[0]?.failed_attempts ?? 0;
}

export async function lockAccount(db: Queryable, userId: string, until: Date): Promise<void> {
  await db.query(
    `UPDATE admin_credentials SET locked_until = $2, updated_at = now() WHERE user_id = $1`,
    [userId, until.toISOString()],
  );
}

export async function clearLockAndAttempts(db: Queryable, userId: string): Promise<void> {
  await db.query(
    `UPDATE admin_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = now()
       WHERE user_id = $1`,
    [userId],
  );
}

export async function updatePassword(
  db: Queryable,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.query(
    `UPDATE admin_credentials SET password_hash = $2, failed_attempts = 0, locked_until = NULL,
            updated_at = now() WHERE user_id = $1`,
    [userId, passwordHash],
  );
}

// ── WebAuthn credentials ──────────────────────────────────────────────────────

function rowToCredential(row: {
  credential_id: string;
  public_key: string;
  counter: string | number;
  transports: string | null;
}): StoredCredential {
  return {
    id: row.credential_id,
    publicKey: row.public_key,
    counter: Number(row.counter),
    ...(row.transports ? { transports: row.transports.split(',') } : {}),
  };
}

export async function listCredentials(db: Queryable, userId: string): Promise<StoredCredential[]> {
  const res = await db.query(
    `SELECT credential_id, public_key, counter, transports FROM webauthn_credentials
       WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
  return res.rows.map(rowToCredential);
}

export async function getCredentialOwner(
  db: Queryable,
  credentialId: string,
): Promise<{ userId: string; credential: StoredCredential } | null> {
  const res = await db.query(
    `SELECT user_id, credential_id, public_key, counter, transports FROM webauthn_credentials
       WHERE credential_id = $1`,
    [credentialId],
  );
  const row = res.rows[0] as
    | { user_id: string; credential_id: string; public_key: string; counter: number; transports: string | null }
    | undefined;
  if (!row) return null;
  return { userId: row.user_id, credential: rowToCredential(row) };
}

export async function countCredentials(db: Queryable, userId: string): Promise<number> {
  const res = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM webauthn_credentials WHERE user_id = $1`,
    [userId],
  );
  return Number(res.rows[0]?.n ?? 0);
}

export async function insertCredential(
  db: Queryable,
  p: { userId: string; credential: StoredCredential; deviceLabel?: string },
): Promise<void> {
  await db.query(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports, device_label)
       VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      p.userId,
      p.credential.id,
      p.credential.publicKey,
      p.credential.counter,
      p.credential.transports?.join(',') ?? null,
      p.deviceLabel ?? null,
    ],
  );
}

export async function updateCredentialCounter(
  db: Queryable,
  credentialId: string,
  counter: number,
): Promise<void> {
  await db.query(`UPDATE webauthn_credentials SET counter = $2 WHERE credential_id = $1`, [
    credentialId,
    counter,
  ]);
}

export async function deleteAllCredentials(db: Queryable, userId: string): Promise<number> {
  const res = await db.query(`DELETE FROM webauthn_credentials WHERE user_id = $1`, [userId]);
  return res.rowCount ?? 0;
}

// ── Recovery codes ────────────────────────────────────────────────────────────

export async function insertRecoveryCodes(
  pool: pg.Pool,
  userId: string,
  hashes: string[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const hash of hashes) {
      await client.query(`INSERT INTO recovery_codes (user_id, code_hash) VALUES ($1, $2)`, [
        userId,
        hash,
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Burn a recovery code if it is unused. Returns true iff exactly one was consumed. */
export async function consumeRecoveryCode(
  db: Queryable,
  userId: string,
  codeHash: string,
  now: Date,
): Promise<boolean> {
  const res = await db.query(
    `UPDATE recovery_codes SET consumed_at = $3
       WHERE user_id = $1 AND code_hash = $2 AND consumed_at IS NULL
       RETURNING id`,
    [userId, codeHash, now.toISOString()],
  );
  return (res.rowCount ?? 0) === 1;
}

export async function countActiveRecoveryCodes(db: Queryable, userId: string): Promise<number> {
  const res = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM recovery_codes WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId],
  );
  return Number(res.rows[0]?.n ?? 0);
}

export async function deleteRecoveryCodes(db: Queryable, userId: string): Promise<void> {
  await db.query(`DELETE FROM recovery_codes WHERE user_id = $1`, [userId]);
}
