// Application dependency-injection seam.
//
// `AppDeps` is the single bundle the Fastify factory (`buildServer`) is bound to.
// Production wires it from config + Secret Manager + Cloud KMS; tests wire it with
// fakes (fake KMS, in-memory clock, capturing audit sink) so the whole surface is
// integration-testable via `fastify.inject` without external services. This is the
// §1.1 per-workspace pool-isolation contract made concrete: the pool lives in
// AppDeps, never as a module-global.

import type pg from 'pg';

import type { Db, encryption } from '@twt/domain';

import type { AuthAuditSink } from './audit/audit-sink.js';
import type { ApiConfig } from './config.js';
import type { StepUpOtpDeliveryPort } from './modules/auth/shared/step-up-delivery.js';
import type { TurnstileVerifier } from './modules/auth/shared/turnstile.js';
import type { WebAuthnProvider } from './modules/auth/shared/webauthn.js';
import type { DeployTrigger } from './modules/pariwar-provisioning/deploy-trigger.js';

/**
 * The fixed namespace the admin-identity blind index + Tier-1 encryption context
 * key on. Admin identity is GLOBAL, not Pariwar-scoped (Reconciliation R2) — login
 * runs before any `app.pariwar_id` is set — but the encryption substrate's
 * `blindIndex`/`EncryptionContext` require a `pariwarId` namespace. We bind the
 * admin family to the nil-UUID sentinel so admin blind indexes are stable + never
 * collide with a real tenant's. Recorded in ADR-0009.
 */
export const ADMIN_GLOBAL_NAMESPACE = '00000000-0000-0000-0000-000000000000';

/** Field-class namespace for the admin email blind index (HMAC input prefix). */
export const ADMIN_EMAIL_FIELD_CLASS = 'admin_email';

/** Envelope-encryption + blind-index key material for the admin-identity family. */
export interface EncryptionDeps {
  readonly kms: encryption.KmsProvider;
  readonly kekRef: encryption.KmsKeyRef;
  readonly hmacKeyRef: encryption.KmsKeyRef;
}

export interface AppDeps {
  readonly config: ApiConfig;
  /** Drizzle handle bound to `pool` (§1.1 — per-workspace pool). */
  readonly db: Db;
  /** The node-postgres pool the session store + scope tx check out clients from. */
  readonly pool: pg.Pool;
  /**
   * The BYPASSRLS service-role pool for the audit-log writer (DD-3 / Story 1.10).
   * In production this is a SEPARATE pool bound to the `twt_service`-login
   * connection string (SERVICE_DATABASE_URL, from Secret Manager) so the
   * hash-chain writer can read the global tail across tenants; in dev/CI it
   * reuses `pool` (the superuser login already bypasses RLS). The audit sink +
   * KMS audit hook write through this pool, never the request's app pool.
   */
  readonly servicePool: pg.Pool;
  readonly encryption: EncryptionDeps;
  /** Resolved Argon2id pepper (Secret Manager in prod; env fallback in local dev). */
  readonly pepper: Buffer;
  readonly auditSink: AuthAuditSink;
  readonly stepUpDelivery: StepUpOtpDeliveryPort;
  readonly turnstile: TurnstileVerifier;
  /** WebAuthn ceremony provider (SimpleWebAuthn in prod; a fake in tests). */
  readonly webauthn: WebAuthnProvider;
  /**
   * Deploy seam (Story 1.15, AC-3) — env-resolved: the in-memory fake in dev/test/CI,
   * the live Dokploy-API client in staging/prod. Same seam pattern as `auditSink` /
   * `turnstile`.
   */
  readonly deployTrigger: DeployTrigger;
  /** Injectable clock — tests freeze it to assert TTL / lockout / window expiry. */
  readonly clock: () => Date;
}
