// admin-auth service (Story 1.9, Task 4) — the business logic for the admin
// authentication flows. Pure-ish orchestration over the repo + the crypto
// primitives + the injected WebAuthn provider; HTTP/session concerns live in the
// handlers. Every "allow" path is explicit; uncertain paths fail closed.

import { createHash, randomUUID } from 'node:crypto';

import type { AppDeps } from '../../../context.js';
import { ConflictError } from '../../../http-errors.js';
import { emailBlindIndex, encryptEmail } from '../shared/email-index.js';
import { hashPassword, verifyPassword } from '../shared/password.js';
import { generateRecoveryCodes, hashRecoveryCode } from '../shared/recovery.js';
import { mintSignedLink, verifySignedLink } from '../shared/signed-link.js';
import type { StoredCredential } from '../shared/webauthn.js';
import * as repo from './admin-auth.repo.js';
import type {
  FirstFactorResult,
  RegisterVerifyResult,
  ResetConsumeResult,
} from './admin-auth.types.js';

const MAX_DEVICES = 2;
const PW_RESET_TTL_MS = 30 * 60 * 1000; // 30 min
const ENROLLMENT_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Short prefix of the password hash — the reset-link single-use binding (no extra columns). */
function pwBind(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

// ── First factor: email + password ───────────────────────────────────────────

export async function verifyFirstFactor(
  deps: AppDeps,
  email: string,
  password: string,
): Promise<FirstFactorResult> {
  const blindIndex = await emailBlindIndex(email, deps.encryption);
  const rec = await repo.findAdminByEmailIndex(deps.pool, blindIndex);

  // Equalize timing on the no-such-user path with a throwaway verify so a missing
  // email is not distinguishable by response time from a wrong password.
  if (!rec) {
    await verifyPassword(
      '$argon2id$v=19$m=8,t=1,p=1$YWFhYWFhYWFhYWFhYWFhYQ$AAAAAAAAAAAAAAAAAAAAAA',
      password,
      deps.pepper,
    ).catch(() => false);
    return { ok: false, reason: 'invalid' };
  }

  const now = deps.clock();
  if (rec.lockedUntil && now < rec.lockedUntil) {
    return { ok: false, reason: 'locked' };
  }
  if (rec.status !== 'active') {
    return { ok: false, reason: 'invalid' };
  }

  const ok = await verifyPassword(rec.passwordHash, password, deps.pepper);
  if (!ok) {
    const attempts = await repo.incrementFailedAttempts(deps.pool, rec.userId);
    let locked = false;
    if (attempts >= deps.config.lockoutThreshold) {
      await repo.lockAccount(deps.pool, rec.userId, new Date(now.getTime() + deps.config.lockoutMs));
      locked = true;
    }
    return { ok: false, reason: locked ? 'locked' : 'invalid' };
  }

  await repo.clearLockAndAttempts(deps.pool, rec.userId);
  return { ok: true, userId: rec.userId };
}

// ── WebAuthn registration (enroll a passkey) ─────────────────────────────────

export async function registerOptions(
  deps: AppDeps,
  userId: string,
  userName: string,
): Promise<{ challenge: string; options: unknown }> {
  const existing = await repo.listCredentials(deps.pool, userId);
  if (existing.length >= MAX_DEVICES) {
    throw new ConflictError('Maximum passkey devices reached', 'auth.device_cap', {
      max: MAX_DEVICES,
    });
  }
  const options = await deps.webauthn.generateRegistrationOptions({ userId, userName, existing });
  return { challenge: options.challenge, options };
}

export async function registerVerify(
  deps: AppDeps,
  userId: string,
  response: Record<string, unknown>,
  expectedChallenge: string,
  deviceLabel?: string,
): Promise<RegisterVerifyResult> {
  const priorCount = await repo.countCredentials(deps.pool, userId);
  if (priorCount >= MAX_DEVICES) {
    throw new ConflictError('Maximum passkey devices reached', 'auth.device_cap', {
      max: MAX_DEVICES,
    });
  }

  const result = await deps.webauthn.verifyRegistration({
    response: response as never,
    expectedChallenge,
  });
  if (!result.verified || !result.credential) {
    return { verified: false };
  }

  await repo.insertCredential(deps.pool, {
    userId,
    credential: result.credential,
    ...(deviceLabel !== undefined ? { deviceLabel } : {}),
  });

  // First enrollment provisions the 10 one-time recovery codes (returned once).
  if (priorCount === 0) {
    const { codes, hashes } = generateRecoveryCodes();
    await repo.insertRecoveryCodes(deps.pool, userId, hashes);
    return { verified: true, recoveryCodes: codes };
  }
  return { verified: true };
}

// ── WebAuthn authentication (second factor) ──────────────────────────────────

export async function authOptions(
  deps: AppDeps,
  userId: string,
): Promise<{ challenge: string; options: unknown }> {
  const existing = await repo.listCredentials(deps.pool, userId);
  if (existing.length === 0) {
    throw new ConflictError('No passkey enrolled', 'auth.no_passkey');
  }
  const options = await deps.webauthn.generateAuthenticationOptions({ allow: existing });
  return { challenge: options.challenge, options };
}

export async function authVerify(
  deps: AppDeps,
  userId: string,
  response: Record<string, unknown>,
  expectedChallenge: string,
): Promise<boolean> {
  const credentialId = typeof response['id'] === 'string' ? response['id'] : '';
  const owner = await repo.getCredentialOwner(deps.pool, credentialId);
  // The credential must exist AND belong to the authenticating user.
  if (!owner || owner.userId !== userId) return false;

  const result = await deps.webauthn.verifyAuthentication({
    response: response as never,
    expectedChallenge,
    credential: owner.credential,
  });
  if (!result.verified) return false;

  // Explicit clone-detection: a non-increasing counter signals a cloned authenticator
  // → reject + do NOT bump (§2.3). Skip only when both stored AND new are 0 (the
  // authenticator does not maintain counters at all).
  const newCounter = result.newCounter;
  if (
    newCounter !== undefined &&
    !(newCounter === 0 && owner.credential.counter === 0) &&
    newCounter <= owner.credential.counter
  ) {
    return false;
  }
  if (newCounter !== undefined) {
    await repo.updateCredentialCounter(deps.pool, credentialId, newCounter);
  }
  return true;
}

// ── Recovery codes (second factor) ───────────────────────────────────────────

export async function consumeRecovery(
  deps: AppDeps,
  userId: string,
  code: string,
): Promise<boolean> {
  return repo.consumeRecoveryCode(deps.pool, userId, hashRecoveryCode(code), deps.clock());
}

// ── Enrollment ceremony gate (AC-2) ──────────────────────────────────────────

/**
 * Mint an out-of-band enrollment link (bootstrap / post-reset). Issued by an
 * ops/super-admin path (NOT a public route) — exposed for that caller + tests.
 */
export function mintEnrollmentToken(deps: AppDeps, userId: string): string {
  return mintSignedLink(
    {
      sub: userId,
      purpose: 'passkey_enrollment',
      exp: deps.clock().getTime() + ENROLLMENT_TTL_MS,
    },
    deps.config.sessionSecret,
  );
}

/**
 * Resolve the user authorized to enroll a passkey. The ceremony requires EITHER a
 * full session (an existing 2nd factor was used to log in) OR a valid enrollment
 * token — password-only access never reaches here. The token is single-use for the
 * bootstrap window: honoured only while the user has 0 passkeys.
 */
export async function resolveEnrollmentSubject(
  deps: AppDeps,
  opts: { sessionUserId?: string; enrollmentToken?: string },
): Promise<string | null> {
  if (opts.sessionUserId) return opts.sessionUserId;
  if (!opts.enrollmentToken) return null;
  const payload = verifySignedLink(opts.enrollmentToken, deps.config.sessionSecret, deps.clock().getTime());
  if (!payload || payload.purpose !== 'passkey_enrollment') return null;
  // Bootstrap single-use: the link only works before the first device enrolls.
  const count = await repo.countCredentials(deps.pool, payload.sub);
  if (count > 0) return null;
  return payload.sub;
}

// ── Password reset (AC-2) ────────────────────────────────────────────────────

export async function requestPasswordReset(
  deps: AppDeps,
  email: string,
): Promise<{ token: string; userId: string } | null> {
  const blindIndex = await emailBlindIndex(email, deps.encryption);
  const rec = await repo.findAdminByEmailIndex(deps.pool, blindIndex);
  if (!rec || rec.status !== 'active') return null;
  const token = mintSignedLink(
    {
      sub: rec.userId,
      purpose: 'password_reset',
      exp: deps.clock().getTime() + PW_RESET_TTL_MS,
      bind: pwBind(rec.passwordHash),
    },
    deps.config.sessionSecret,
  );
  return { token, userId: rec.userId };
}

export async function consumePasswordReset(
  deps: AppDeps,
  token: string,
  newPassword: string,
): Promise<ResetConsumeResult> {
  const payload = verifySignedLink(token, deps.config.sessionSecret, deps.clock().getTime());
  if (!payload || payload.purpose !== 'password_reset') return { ok: false };

  const rec = await repo.getAdminById(deps.pool, payload.sub);
  if (!rec) return { ok: false };
  // Single-use binding: a consumed link's bind no longer matches (password changed).
  if (payload.bind !== pwBind(rec.passwordHash)) return { ok: false };

  const newHash = await hashPassword(newPassword, deps.pepper, deps.config.argon2.params);
  await repo.updatePassword(deps.pool, payload.sub, newHash);
  // Force WebAuthn re-enrollment (a reset must not silently retain the 2nd factor).
  await repo.deleteAllCredentials(deps.pool, payload.sub);
  // Old recovery codes are also 2nd-factor material — delete them so only a fresh
  // enrollment provisions new ones.
  await repo.deleteRecoveryCodes(deps.pool, payload.sub);
  return { ok: true, userId: payload.sub };
}

// ── Bootstrap helper (tests + ops seed) ──────────────────────────────────────

export async function createAdminAccount(
  deps: AppDeps,
  params: { email: string; password: string; userId?: string },
): Promise<string> {
  const userId = params.userId ?? randomUUID();
  const [emailCiphertext, emailBlindIndexValue, passwordHash] = await Promise.all([
    encryptEmail(params.email, deps.encryption),
    emailBlindIndex(params.email, deps.encryption),
    hashPassword(params.password, deps.pepper, deps.config.argon2.params),
  ]);
  await repo.createAdmin(deps.pool, {
    userId,
    emailCiphertext,
    emailBlindIndex: emailBlindIndexValue,
    passwordHash,
  });
  return userId;
}

export type { StoredCredential };
