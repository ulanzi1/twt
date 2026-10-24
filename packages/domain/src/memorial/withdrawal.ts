// Withdrawing a memorial version (Story 11b.4, MA9 / MA16 — `#decision-2026-10-24-398`).
//   · the FAMILY withdraws the latest version of its own drive while it is WITH THE TRUST (before review) — AC8;
//   · the TRUST withdraws its own approval of the chain's latest approved, un-withdrawn version (MA16) — AC9.
// ⛔ A take-down of a PUBLISHED memorial (the helpline operator, on the nominee's request — `-393` / `-395`) is row 11b-4a's
// (MA18): ⛔ nothing is public in this row. Both writes run under `lockMemorialPool` and re-read the chain after it.

import type { Db } from '../db.js';
import {
  memorialWithdrawals,
  type MemorialWithdrawalInsert,
  type MemorialWithdrawalRow,
} from '../schema/memorial_withdrawals.js';
import { memorialCanWithdraw, deriveMemorialStatus } from './status.js';
import type { MemorialChainLink } from './submission.js';

/**
 * PURE — the family's withdraw, against the session drive's chain read under the lock (AC8):
 *   · an id ⛔ in this chain ⇒ `not_found` (the one neutral 404 — another family's id looks like an unknown one);
 *   · an earlier (superseded) version, or the latest in any state but `with_the_trust` ⇒ `not_withdrawable` (409);
 *   · else `ok`.
 */
export function decideFamilyWithdraw(
  chain: readonly MemorialChainLink[],
  submissionId: string,
): 'ok' | 'not_found' | 'not_withdrawable' {
  const index = chain.findIndex((l) => l.submission.submissionId === submissionId);
  if (index < 0) return 'not_found';
  if (index !== chain.length - 1) return 'not_withdrawable';
  return memorialCanWithdraw(deriveMemorialStatus(chain[index]!)) ? 'ok' : 'not_withdrawable';
}

/** Insert the ONE withdrawal (the PK makes a second one a 23505 — reachable only without the lock). */
export async function insertMemorialWithdrawal(
  db: Db,
  values: Omit<MemorialWithdrawalInsert, 'withdrawnAt'>,
): Promise<MemorialWithdrawalRow> {
  const [row] = await db.insert(memorialWithdrawals).values(values).returning();
  return row!;
}
