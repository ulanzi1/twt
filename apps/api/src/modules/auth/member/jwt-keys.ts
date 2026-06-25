// Member-JWT signing keypair resolution (Story 3.2, Task 3 — §2.4 algorithm pinning).
//
// The member access token + signup-continuation token are asymmetric JWTs (ES256).
// In production the private key is resolved from Secret Manager (mirror the argon2
// pepper / sessionSecret `resolveSecretValue` path); dev/test/CI generate an
// EPHEMERAL ES256 keypair so the stack boots with ZERO key config. The public key
// is always DERIVED from the private key — never configured separately — so the
// pair can never be mismatched. Refresh tokens are NOT JWTs (opaque + hashed).

import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';

import { resolveSecretValue } from '@twt/domain';

import type { ApiConfig } from '../../../config.js';
import type { MemberJwtKeys } from '../../../context.js';

/** Generate a fresh ES256 (P-256) keypair as PEM strings (dev/test/CI). */
export function generateEphemeralMemberJwtKeys(): MemberJwtKeys {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    algorithm: 'ES256',
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

/** Derive the SPKI public-key PEM from a PKCS8 private-key PEM. */
function derivePublicKeyPem(privateKeyPem: string): string {
  return createPublicKey(createPrivateKey(privateKeyPem)).export({ type: 'spki', format: 'pem' }).toString();
}

/**
 * Resolve the member-JWT keypair for the production/dev path. Tries Secret Manager
 * (prod) / the env fallback (local); when neither resolves AND we are not in
 * production, falls back to an ephemeral ES256 keypair. In production a missing key
 * is a loud boot failure (never sign with an ephemeral key in prod).
 */
export async function resolveMemberJwtKeys(config: ApiConfig): Promise<MemberJwtKeys> {
  const isProd = config.nodeEnv === 'production';
  let privateKeyPem: string | undefined;
  try {
    privateKeyPem = await resolveSecretValue(config.memberJwt.privateKeySecretName, {
      envFallback: config.memberJwt.privateKeyEnvFallback,
    });
  } catch {
    privateKeyPem = undefined;
  }
  if (!privateKeyPem || privateKeyPem.trim() === '') {
    if (isProd) {
      throw new Error(
        `[deps] member JWT private key is required in production — set Secret Manager secret ` +
          `'${config.memberJwt.privateKeySecretName}' (asymmetric ES256/RS256 PKCS8 PEM)`,
      );
    }
    return generateEphemeralMemberJwtKeys();
  }
  return {
    algorithm: config.memberJwt.algorithm,
    privateKeyPem,
    publicKeyPem: derivePublicKeyPem(privateKeyPem),
  };
}
