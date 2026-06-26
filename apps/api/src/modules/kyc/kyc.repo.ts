// KYC repository — Story 3.3b (Task 3): the PRE-SCOPE OAuth-callback correlation read.
//
// The `POST /api/v1/kyc/callback` route is PUBLIC (DigiLocker redirects the browser with
// ?state&code; no member JWT) — so it cannot reuse a member-session scope and cannot know
// the Pariwar before resolving the transaction. `kyc_transactions` is tenant-isolated +
// RLS-forced, and `state` is globally unique (the `kyc_transactions_state_uq` index), so the
// callback resolves the transaction's pariwar_id via the BYPASSRLS `servicePool` — the exact
// `resolveMembersByMobile` pre-scope posture (member-auth.repo.ts, R2/R3). The handler then
// opens a scope tx for THAT pariwar_id and re-resolves the transaction in-scope.
//
// Raw parameterized SQL on the service pool (mirrors member-auth.repo.ts).

import type pg from 'pg';

export interface ResolvedKycTransaction {
  transactionId: string;
  memberId: string;
  pariwarId: string;
  status: string;
  expiresAt: Date;
}

/**
 * Resolve a KYC transaction by its globally-unique OAuth `state` across ALL tenants
 * (BYPASSRLS service pool) — the callback's pre-scope correlation. Returns null when no
 * such transaction exists (the handler then 404s; the member re-initiates).
 */
export async function resolveKycTransactionByState(
  servicePool: pg.Pool,
  state: string,
): Promise<ResolvedKycTransaction | null> {
  const res = await servicePool.query<{
    transaction_id: string;
    member_id: string;
    pariwar_id: string;
    status: string;
    expires_at: Date;
  }>(
    `SELECT transaction_id, member_id, pariwar_id, status, expires_at
       FROM kyc_transactions WHERE state = $1 LIMIT 1`,
    [state],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    transactionId: row.transaction_id,
    memberId: row.member_id,
    pariwarId: row.pariwar_id,
    status: row.status,
    expiresAt: row.expires_at,
  };
}
