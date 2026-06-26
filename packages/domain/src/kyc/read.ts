// KYC substrate read accessors — Story 3.3a (Task 3).
//
// Two read families:
//   · `digilocker_public_certs` — GLOBAL cert cache (no tenant scope; the verifier +
//     refresh job read it pre-/cross-scope). Mirrors the member-auth global accessors.
//   · `kyc_transactions` — TENANT-scoped; every read takes `pariwarId` explicitly
//     (matches the RLS predicate column + is cross-tenant defense-in-depth) AND relies
//     on RLS. Mirrors `consent/read.ts`.
//
// Like consent/member, this is a transport-free PRIMITIVE: NO HTTP, NO audit, NO event
// emission — the provider (apps/api) orchestrates those.

import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  type DigiLockerPublicCertRow,
  digilockerPublicCerts,
} from '../schema/digilocker_public_certs.js';
import { type KycTransactionRow, kycTransactions } from '../schema/kyc_transactions.js';

// ── digilocker_public_certs (GLOBAL) ─────────────────────────────────────────

/**
 * Resolve the ACTIVE cached cert for an issuer `keyId` — the verifier's lookup when the
 * eAadhaar signature names its signing key. Returns null when no active row exists for
 * the key (the verifier then fails closed, never silently accepts — AC7). GLOBAL: no
 * tenant predicate (the cert cache has no tenant dimension).
 */
export async function getActiveCertByKeyId(
  db: Db,
  keyId: string,
): Promise<DigiLockerPublicCertRow | null> {
  const rows = await db
    .select()
    .from(digilockerPublicCerts)
    .where(and(eq(digilockerPublicCerts.keyId, keyId), eq(digilockerPublicCerts.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * List the ACTIVE cached certs, newest-fetched first (Story 1.14 forced pagination,
 * default 50 / cap 200). The verifier uses this when a signature does not name a key id
 * and it must try the trusted set; ops uses it to inspect cache freshness.
 */
export async function listActiveCerts(
  db: Db,
  opts: { limit?: number } = {},
): Promise<DigiLockerPublicCertRow[]> {
  return db
    .select()
    .from(digilockerPublicCerts)
    .where(eq(digilockerPublicCerts.isActive, true))
    .orderBy(desc(digilockerPublicCerts.fetchedAt))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));
}

// ── kyc_transactions (TENANT-scoped) ─────────────────────────────────────────

/**
 * Resolve a transaction by its `transaction_id` within a Pariwar — backs `getStatus`.
 * Takes an explicit `pariwarId` for defense-in-depth alongside RLS. Returns null when
 * no such row exists for the Pariwar.
 */
export async function getKycTransaction(
  db: Db,
  pariwarId: PariwarId,
  transactionId: string,
): Promise<KycTransactionRow | null> {
  const rows = await db
    .select()
    .from(kycTransactions)
    .where(
      and(eq(kycTransactions.pariwarId, pariwarId), eq(kycTransactions.transactionId, transactionId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve a transaction by its OAuth `state` within a Pariwar — backs the callback
 * (`verifyAndPullProfile` validates `state` ↔ transaction). Returns null when no such
 * row exists for the Pariwar (the provider then normalizes to `transaction_not_found`).
 */
export async function getKycTransactionByState(
  db: Db,
  pariwarId: PariwarId,
  state: string,
): Promise<KycTransactionRow | null> {
  const rows = await db
    .select()
    .from(kycTransactions)
    .where(and(eq(kycTransactions.pariwarId, pariwarId), eq(kycTransactions.state, state)))
    .limit(1);
  return rows[0] ?? null;
}
