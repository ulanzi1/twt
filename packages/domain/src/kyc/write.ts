// KYC substrate write accessors — Story 3.3a (Task 3).
//
// Two write families:
//   · `digilocker_public_certs` — GLOBAL cert cache. `upsertDigiLockerCert` (the
//     refresh path — insert-or-update on `key_id`) + `deactivateDigiLockerCert` (the
//     key-compromise procedure, §2.8 — mark inactive, never delete). No tenant scope.
//   · `kyc_transactions` — TENANT-scoped. `insertKycTransaction` (the `initiate` path)
//     + `updateKycTransactionStatus` (the verify outcome). Mirror `consent/write.ts`:
//     NO HTTP, NO audit, NO event emission — the provider orchestrates those.
//
// ── Transaction contract ─────────────────────────────────────────────────────
// These accessors run their statements DIRECTLY on the passed `db`. Tenant scope
// (`SET LOCAL app.pariwar_id`) is transaction-scoped, so a scoped caller is already
// inside a transaction. The cert accessors are GLOBAL (the `USING(true)` policy needs
// no scope).

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type DigiLockerPublicCertRow,
  digilockerPublicCerts,
} from '../schema/digilocker_public_certs.js';
import { type KycTransactionRow, kycTransactions } from '../schema/kyc_transactions.js';

// ── digilocker_public_certs (GLOBAL) ─────────────────────────────────────────

export interface UpsertDigiLockerCertInput {
  /** The issuer key identifier (X.509 SKI / cert fingerprint) — the upsert conflict key. */
  keyId: string;
  /** The PEM-encoded X.509 certificate. */
  pem: string;
  /** X.509 `notAfter` (hard cert expiry). */
  notAfter: Date;
  /** X.509 `notBefore` (optional). */
  notBefore?: Date | null;
  /** Cert Subject DN (optional, diagnostic). */
  subject?: string | null;
  /** Last-successful-refresh instant (defaults to DB now()). DRIVES the staleness budget. */
  fetchedAt?: Date;
}

/**
 * Insert-or-update the cached cert for an issuer key (the `refreshDigiLockerCerts()`
 * path). On a `key_id` conflict it refreshes `pem` / `not_after` / `not_before` /
 * `subject`, bumps `fetched_at` (resetting the staleness clock), and re-activates the
 * row. Returns the upserted row. GLOBAL — no tenant scope.
 */
export async function upsertDigiLockerCert(
  db: Db,
  input: UpsertDigiLockerCertInput,
): Promise<DigiLockerPublicCertRow> {
  const fetchedAt = input.fetchedAt ?? new Date();
  const upserted = await db
    .insert(digilockerPublicCerts)
    .values({
      keyId: input.keyId,
      pem: input.pem,
      notAfter: input.notAfter,
      notBefore: input.notBefore ?? null,
      subject: input.subject ?? null,
      fetchedAt,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: digilockerPublicCerts.keyId,
      set: {
        pem: input.pem,
        notAfter: input.notAfter,
        notBefore: input.notBefore ?? null,
        subject: input.subject ?? null,
        fetchedAt,
        isActive: true,
      },
    })
    .returning();
  const row = upserted[0];
  if (!row) {
    throw new Error('[upsertDigiLockerCert] upsert returned no row');
  }
  return row;
}

/**
 * Deactivate a cached cert by `key_id` (the key-compromise procedure, §2.8): mark
 * `is_active = false` — the row is NEVER deleted so it stays auditable; the verifier
 * stops trusting it. Returns the deactivated row, or null if no such key was cached.
 */
export async function deactivateDigiLockerCert(
  db: Db,
  keyId: string,
): Promise<DigiLockerPublicCertRow | null> {
  const updated = await db
    .update(digilockerPublicCerts)
    .set({ isActive: false })
    .where(eq(digilockerPublicCerts.keyId, keyId))
    .returning();
  return updated[0] ?? null;
}

// ── kyc_transactions (TENANT-scoped) ─────────────────────────────────────────

export interface InsertKycTransactionInput {
  /** Optional caller-supplied row address (defaults to DB gen_random_uuid()). */
  transactionId?: string;
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The active provider key (`digilocker` today). */
  provider: string;
  /** The KYC intent ('signup' | 'relink'). */
  intent: string;
  /** The OAuth `state` nonce (unique). */
  state: string;
  /** The PKCE `code_verifier` (secret; short TTL; never logged). */
  codeVerifier: string;
  /** The validated `redirect_uri`. */
  redirectUri: string;
  /** Application-enforced TTL instant. */
  expiresAt: Date;
}

/**
 * Insert a new provider transaction (the `initiate` path). `status` defaults to
 * `pending`. Returns the inserted row. Tenant-scoped (RLS `withCheck` enforces the
 * caller's `app.pariwar_id` matches `pariwarId`).
 */
export async function insertKycTransaction(
  db: Db,
  input: InsertKycTransactionInput,
): Promise<KycTransactionRow> {
  const inserted = await db
    .insert(kycTransactions)
    .values({
      transactionId: input.transactionId ?? undefined,
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      provider: input.provider,
      intent: input.intent,
      state: input.state,
      codeVerifier: input.codeVerifier,
      redirectUri: input.redirectUri,
      expiresAt: input.expiresAt,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[insertKycTransaction] insert returned no row — check session scope');
  }
  return row;
}

/** The transaction states a writer may set (value-aligned with contracts `KycTransactionState`). */
export type KycTransactionStatusValue = 'pending' | 'verified' | 'failed' | 'expired';

/**
 * Update a transaction's `status` within a Pariwar (the verify outcome). Returns the
 * updated row, or null if no such transaction exists for the Pariwar. Tenant-scoped.
 */
export async function updateKycTransactionStatus(
  db: Db,
  pariwarId: PariwarId,
  transactionId: string,
  status: KycTransactionStatusValue,
): Promise<KycTransactionRow | null> {
  const updated = await db
    .update(kycTransactions)
    .set({ status })
    .where(
      and(eq(kycTransactions.pariwarId, pariwarId), eq(kycTransactions.transactionId, transactionId)),
    )
    .returning();
  return updated[0] ?? null;
}
