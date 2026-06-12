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

import { consoleAuthAuditSink } from './audit/audit-sink.js';
import type { ApiConfig } from './config.js';
import type { AppDeps, EncryptionDeps } from './context.js';
import { createLogStepUpDelivery } from './modules/auth/shared/step-up-delivery.js';
import { noopTurnstileVerifier } from './modules/auth/shared/turnstile.js';
import { createSimpleWebAuthnProvider } from './modules/auth/shared/webauthn.js';

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
 * Production / local-dev deps. Builds its own pool (§1.1 per-workspace isolation)
 * and resolves the pepper. The caller owns the pool lifecycle via `deps.pool.end()`.
 */
export async function createDeps(config: ApiConfig): Promise<AppDeps> {
  const connectionString = await resolveConnectionString();
  const { db, pool } = createDb(connectionString);

  const pepper = await resolveSecretValue(config.argon2.pepperSecretName, {
    envFallback: config.argon2.pepperEnvFallback,
  });
  if (!pepper || pepper.trim() === '') {
    throw new Error(`[deps] Argon2id pepper resolved to an empty value — check Secret Manager secret '${config.argon2.pepperSecretName}'`);
  }

  const isProd = config.nodeEnv === 'production';

  return {
    config,
    db,
    pool,
    encryption: buildEncryptionDeps(pepper),
    pepper: Buffer.from(pepper, 'utf-8'),
    auditSink: consoleAuthAuditSink,
    stepUpDelivery: createLogStepUpDelivery({ revealForDev: !isProd }),
    turnstile: noopTurnstileVerifier,
    webauthn: createSimpleWebAuthnProvider({
      rpId: config.webauthn.rpId,
      rpName: config.webauthn.rpName,
      expectedOrigin: config.webauthn.expectedOrigin,
    }),
    clock: () => new Date(),
  };
}
