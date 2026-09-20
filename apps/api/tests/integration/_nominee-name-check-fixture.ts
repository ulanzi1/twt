// Story 6.18 (AC4) — the nominee name-check fixture for API E2E specs.
//
// Every approving path (P1 `adjudicateClaim`, P3 `voteOnFrozenClaim`, P4 `finalizeR9Outcome`) now
// requires the claim's two live bank accounts AND a current, PASSING District Admin name check
// (`2026-09-19-226` cl.3-cl.5, cl.7). E2E specs that drive a claim and then approve it through the
// HTTP surface need this one call in their `seedClaim`.
//
// ⭐ IT IS DELIBERATELY NOT A BACKDOOR — it seeds two real account rows and records the check through
// the REAL domain writer, including that writer's own state-window and token re-validation. A helper
// that stubbed the gate would make every E2E approval test silently stop proving the gate holds.

import { randomUUID } from 'node:crypto';

import { claim, ids, nominee } from '@twt/domain';

import type { AppDeps } from '../../src/context.js';
import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';

/**
 * Give a claim its two bank accounts and a recorded, PASSING name check so it can pass the AC4 gate.
 * Opens and commits its own scope tx. The claim must already be in one of
 * `NOMINEE_NAME_CHECK_RECORDABLE_STATES`.
 *
 * Pass `verdicts` to build the negative fixture instead — e.g. `['matches', 'does_not_match']`, the
 * "sent back for correction" case (AC5), which must NOT pass the gate and must NEVER be denied.
 */
export async function seedNomineeNameCheck(
  deps: AppDeps,
  pariwarId: string,
  claimCaseId: string,
  opts: {
    readonly verdicts?: readonly ('matches' | 'clerical_difference' | 'does_not_match')[];
    readonly clericalReasons?: readonly (('initial' | 'married_name' | 'bank_shortened_name') | null)[];
  } = {},
): Promise<void> {
  const verdicts = opts.verdicts ?? (['matches', 'matches'] as const);
  const clericalReasons = opts.clericalReasons ?? [null, null];
  const scopeTx = await openScopeTx(deps, pariwarId);
  let ok = false;
  try {
    // Two live accounts — `-226` cl.7 makes both mandatory before a claim can be decided.
    await scopeTx.client.query(
      `DELETE FROM claim_nominee_bank_accounts WHERE pariwar_id = $1 AND claim_case_id = $2`,
      [pariwarId, claimCaseId],
    );
    await scopeTx.client.query(
      `INSERT INTO claim_nominee_bank_accounts
         (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
          account_number_ciphertext, ifsc_ciphertext, bank_name, ifsc_validated)
       VALUES ($1,$2,1,'enc:v1:holder-1','enc:v1:acct-1','enc:v1:ifsc-1','State Bank of India',true),
              ($1,$2,2,'enc:v1:holder-2','enc:v1:acct-2','enc:v1:ifsc-2','HDFC Bank',true)`,
      [claimCaseId, pariwarId],
    );

    const stamps = await scopeTx.client.query<{ account_rank: number; updated_at: Date }>(
      `SELECT account_rank, updated_at FROM claim_nominee_bank_accounts
        WHERE pariwar_id = $1 AND claim_case_id = $2 ORDER BY account_rank`,
      [pariwarId, claimCaseId],
    );

    const claimRow = await claim.getClaimCase(
      scopeTx.tx,
      ids.pariwarId(pariwarId),
      ids.claimId(claimCaseId),
    );
    if (!claimRow) throw new Error(`[fixture] claim ${claimCaseId} not found in ${pariwarId}`);

    const refs = await nominee.getMemberNomineeDeclarationRefs(
      scopeTx.tx,
      ids.pariwarId(pariwarId),
      claimRow.deceasedMemberId,
    );
    const token = claim.deriveNomineeDeclarationToken(refs);

    await claim.recordNomineeNameCheck(scopeTx.client, {
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: ids.pariwarId(pariwarId),
      nomineeDeclarationToken: token,
      accounts: stamps.rows.map((row, i) => ({
        accountRank: row.account_rank as 1 | 2,
        accountUpdatedAt: new Date(row.updated_at).toISOString(),
        verdict: verdicts[i] ?? 'matches',
        clericalReason: clericalReasons[i] ?? null,
      })),
      actorId: randomUUID(),
      actor: 'operator',
    });
    ok = true;
  } finally {
    await closeScopeTx(scopeTx, ok);
  }
}
