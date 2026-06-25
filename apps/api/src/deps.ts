// AppDeps construction (production + local-dev).
//
// Resolves the database pool, the Argon2id pepper (Secret Manager in prod; env
// fallback locally), and the KMS provider for the admin-identity Tier-1 envelope +
// blind index. KMS follows the established `KMS_TEST_MODE` convention
// (packages/domain/src/encryption/fake-kms-provider.ts): default `fake` for
// local/CI; `live` switches to Cloud KMS. Tests build deps directly with the
// fake provider + a frozen clock + a capturing audit sink (see
// tests/integration/_setup.ts) — this factory is the production/dev path.

import { createHash } from 'node:crypto';

import { createDb, resolveConnectionString, resolveSecretValue } from '@twt/domain';
import { encryption } from '@twt/domain';
import { createCloudflareTurnstileVerifier } from '@twt/edge';

import { createAuditLogSink, createKmsAuditHook } from './audit/audit-log-sink.js';
import type { ApiConfig } from './config.js';
import type { AppDeps, EncryptionDeps } from './context.js';
import { resolveMemberJwtKeys } from './modules/auth/member/jwt-keys.js';
import { createLogStepUpDelivery } from './modules/auth/shared/step-up-delivery.js';
import { noopTurnstileVerifier, type TurnstileVerifier } from './modules/auth/shared/turnstile.js';
import { createSimpleWebAuthnProvider } from './modules/auth/shared/webauthn.js';
import { resolveDeployTriggerFromEnv } from './modules/pariwar-provisioning/deploy-trigger.js';
import { consoleNiyamavaliAmendedHook } from './modules/rules/notification-hook.js';
import { createToneReviewAuditSink } from './modules/tone-review/index.js';

/** Derive a deterministic 32-byte fake key from a label + the pepper (local/CI only). */
function deriveFakeKey(label: string, pepper: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(`${label}|${pepper}`).digest());
}

/**
 * Build the admin-identity encryption deps. Default `fake` provider (local/CI) is
 * keyed deterministically off the pepper so blind indexes are stable across a dev
 * session; `live` wires Cloud KMS with the configured key resource names.
 */
export function buildEncryptionDeps(pepper: string): EncryptionDeps {
  const mode = process.env['KMS_TEST_MODE'] ?? 'fake';
  if (mode === 'live') {
    const kekResource = process.env['ADMIN_KEK_RESOURCE_NAME'];
    const hmacResource = process.env['ADMIN_HMAC_RESOURCE_NAME'];
    const projectId = process.env['GOOGLE_CLOUD_PROJECT'];
    const location = process.env['ADMIN_KMS_LOCATION'];
    if (!kekResource || !hmacResource || !projectId || !location) {
      throw new Error(
        '[deps] KMS_TEST_MODE=live requires ADMIN_KEK_RESOURCE_NAME, ADMIN_HMAC_RESOURCE_NAME, ' +
          'GOOGLE_CLOUD_PROJECT, ADMIN_KMS_LOCATION',
      );
    }
    const kekRef = { resourceName: kekResource };
    const hmacKeyRef = { resourceName: hmacResource };
    return {
      kms: encryption.createCloudKmsProvider({ kekRef, hmacKeyRef, projectId, location }),
      kekRef,
      hmacKeyRef,
    };
  }
  if (mode !== 'fake') {
    throw new Error(`[deps] KMS_TEST_MODE must be 'fake' or 'live', got ${JSON.stringify(mode)}`);
  }
  return {
    kms: encryption.createFakeKmsProvider({
      kekBytes: deriveFakeKey('twt-admin-kek', pepper),
      hmacKeyBytes: deriveFakeKey('twt-admin-hmac', pepper),
    }),
    kekRef: { resourceName: 'fake:admin-kek' },
    hmacKeyRef: { resourceName: 'fake:admin-hmac' },
  };
}

/**
 * Select the Turnstile verifier from config (AC-2/AC-4). When a secret NAME is
 * configured, resolve the secret VALUE (Secret Manager in prod; env fallback locally
 * — the SAME `resolveSecretValue` path the argon2 pepper uses) and build the real
 * Cloudflare siteverify verifier; otherwise keep the no-op default so the stack runs
 * with ZERO Cloudflare config (local/CI/not-yet-provisioned). Fail-closed is the
 * verifier's default; `config.turnstile.failOpen` opts into degraded-mode pass-through.
 */
async function buildTurnstileVerifier(config: ApiConfig): Promise<TurnstileVerifier> {
  const secretName = config.turnstile.secretName;
  if (!secretName) return noopTurnstileVerifier;

  const secret = await resolveSecretValue(secretName, {
    envFallback: config.turnstile.secretEnvFallback,
  });
  if (!secret || secret.trim() === '') {
    throw new Error(
      `[deps] Turnstile secret resolved to an empty value — check Secret Manager secret ` +
        `'${secretName}' (or unset TURNSTILE_SECRET_NAME to use the no-op verifier)`,
    );
  }
  return createCloudflareTurnstileVerifier({ secret, failOpen: config.turnstile.failOpen });
}

/**
 * Production / local-dev deps. Builds its own pool (§1.1 per-workspace isolation)
 * and resolves the pepper. The caller owns the pool lifecycle via `deps.pool.end()`.
 */
export async function createDeps(config: ApiConfig): Promise<AppDeps> {
  const connectionString = await resolveConnectionString();
  const { db, pool } = createDb(connectionString);

  // Service pool for the audit-log writer (DD-3 / Story 1.10). In production a
  // distinct BYPASSRLS `twt_service`-login pool (SERVICE_DATABASE_URL); in dev/CI
  // it reuses the app pool (the superuser login already bypasses RLS). The live
  // SERVICE_DATABASE_URL credential is Terraform/Secret-Manager, apply-deferrable
  // (Story 1.5 D1-1.5 precedent). The caller ends `servicePool` only when it is a
  // distinct pool (see apps/api/src/index.ts).
  const serviceConnectionString = process.env['SERVICE_DATABASE_URL'];
  const serviceCreated = serviceConnectionString ? createDb(serviceConnectionString) : { db, pool };
  const servicePool = serviceCreated.pool;
  const serviceDb = serviceCreated.db;

  const pepper = await resolveSecretValue(config.argon2.pepperSecretName, {
    envFallback: config.argon2.pepperEnvFallback,
  });
  if (!pepper || pepper.trim() === '') {
    throw new Error(`[deps] Argon2id pepper resolved to an empty value — check Secret Manager secret '${config.argon2.pepperSecretName}'`);
  }

  const isProd = config.nodeEnv === 'production';

  // Build the encryption deps, then populate the KMS audit hook (D10-1.5) so KEK
  // wrap/unwrap + blind-index HMAC emit tamper-evident audit lines. Mutating the
  // provider's optional `auditHook` keeps buildEncryptionDeps (+ the test path
  // that reuses it) sink-free.
  const encryptionDeps = buildEncryptionDeps(pepper);
  encryptionDeps.kms.auditHook = createKmsAuditHook(servicePool);

  return {
    config,
    db,
    pool,
    servicePool,
    serviceDb,
    encryption: encryptionDeps,
    pepper: Buffer.from(pepper, 'utf-8'),
    // The real FR-47 hash-chain sink (Story 1.10) replaces consoleAuthAuditSink.
    auditSink: createAuditLogSink(servicePool),
    // Tone-review sign-off / publish-blocked audit seam (Story 2.2) — same hash-chain
    // writer + service pool as auditSink, but the dedicated tone-review taxonomy.
    toneReviewAuditSink: createToneReviewAuditSink(servicePool),
    stepUpDelivery: createLogStepUpDelivery({ revealForDev: !isProd }),
    // Member access-token + signup-continuation JWT keypair (Story 3.2, §2.4) —
    // Secret Manager in prod; an ephemeral ES256 keypair in dev/CI.
    memberJwt: await resolveMemberJwtKeys(config),
    turnstile: await buildTurnstileVerifier(config),
    webauthn: createSimpleWebAuthnProvider({
      rpId: config.webauthn.rpId,
      rpName: config.webauthn.rpName,
      expectedOrigin: config.webauthn.expectedOrigin,
    }),
    // Deploy seam (Story 1.15) — fake in dev/CI, Dokploy-API client in staging/prod.
    deployTrigger: resolveDeployTriggerFromEnv(config.deployTrigger.mode),
    // Member-notification scaffolding hook (Story 2.4, AC3) — console placeholder
    // until Epic 5 wires the real niyamavali.amended push fan-out.
    niyamavaliAmendedHook: consoleNiyamavaliAmendedHook,
    clock: () => new Date(),
  };
}
