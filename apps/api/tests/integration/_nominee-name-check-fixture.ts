// Story 6.18 (AC4) — the nominee name-check fixture for API E2E specs.
//
// Every approving path (P1 `adjudicateClaim`, P3 `voteOnFrozenClaim`, P4 `finalizeR9Outcome`) now
// requires the claim's two live bank accounts AND a current, PASSING District Admin name check
// (`2026-09-19-226` cl.3-cl.5, cl.7). E2E specs that drive a claim and then approve it through the
// HTTP surface need this one call in their `seedClaim`.
//
// ⭐ IT IS DELIBERATELY NOT A BACKDOOR FOR THE CHECK — the check goes through the REAL
// `recordNomineeNameCheck`, including that writer's own state-window, coherence and token
// re-validation. A helper that stubbed the gate would make every E2E approval test silently stop
// proving the gate holds.
//
// ⚠⚠ BUT THE HEADER USED TO OVERCLAIM, AND THE OVERCLAIM MATTERED (code review 2026-09-20). It
// said the fixture *"seeds two real account rows"*. They are raw-SQL INSERTs with PLACEHOLDER
// ciphertext (`enc:v1:holder-1`), so:
//   · `recordClaimNomineeBankAccounts` — the real bank writer — is ⛔ never exercised, and neither
//     is its `updated_at` movement, which is the whole mechanism D5 staleness rests on. A test
//     whose SUBJECT is the D5 chain must drive that writer itself, across two COMMITTED
//     transactions;
//   · the ciphertexts are ⛔ not decryptable, so the AC2 read returns `unreadable` and ⛔ no
//     plaintext name ever exists. A PII test built on this fixture cannot fail — there is nothing
//     to leak. Plant real plaintext through the real route for that.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';

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
    /** The acting staff display name snapshotted into the event (D3). Non-empty by construction. */
    readonly actorDisplay?: string;
    /**
     * ⭐ OPT OUT of seeding a check at all — for the specs that must reach an UNCHECKED claim.
     * Every `seedClaim` in this suite calls this fixture unconditionally, so without this flag
     * ⛔ no test could construct the very claim the AC4/AC6 gates exist to refuse, and the 409
     * mappings for `…nominee_name_check_required` / `…bank_details_required` were asserted
     * NOWHERE (code review 2026-09-20, chunk 5).
     */
    readonly skip?: boolean;
    /** Seed the accounts but ⛔ NOT the check — the "two accounts, nobody checked" case (AC4). */
    readonly accountsOnly?: boolean;
    /** Seed only ONE account — `-226` cl.7's "the claim WAITS" case (AC6). */
    readonly singleAccount?: boolean;
    /** Story 6.20 (T16) — `'skip'` leaves the claim UNDETERMINED (the AC5 gate's 409). Default: a
     *  "no discards" determination through the REAL writer, plus a one-nominee declaration when the
     *  deceased has none. */
    readonly determination?: 'no_discards' | 'skip';
  } = {},
): Promise<void> {
  if (opts.skip === true) return;
  const verdicts = opts.verdicts ?? (['matches', 'matches'] as const);
  const clericalReasons = opts.clericalReasons ?? [null, null];
  // ⚠ A SHORT ARRAY THROWS. `verdicts[i] ?? 'matches'` silently produced a PASSING verdict on the
  // ranks a caller did not mention — a negative fixture quietly becoming a positive one.
  if (!opts.singleAccount && verdicts.length !== 2) {
    throw new Error(
      `[fixture] verdicts must cover both accounts, got ${verdicts.length} — a short array used to default the missing ranks to 'matches'`,
    );
  }
  const scopeTx = await openScopeTx(deps, pariwarId);
  let ok = false;
  try {
    // Two live accounts — `-226` cl.7 makes both mandatory before a claim can be decided.
    await scopeTx.client.query(
      `DELETE FROM claim_nominee_bank_accounts WHERE pariwar_id = $1 AND claim_case_id = $2`,
      [pariwarId, claimCaseId],
    );
    await scopeTx.client.query(
      opts.singleAccount === true
        ? `INSERT INTO claim_nominee_bank_accounts
             (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
              account_number_ciphertext, ifsc_ciphertext, bank_name, ifsc_validated)
           VALUES ($1,$2,1,'enc:v1:holder-1','enc:v1:acct-1','enc:v1:ifsc-1','State Bank of India',true)`
        : `INSERT INTO claim_nominee_bank_accounts
             (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
              account_number_ciphertext, ifsc_ciphertext, bank_name, ifsc_validated)
           VALUES ($1,$2,1,'enc:v1:holder-1','enc:v1:acct-1','enc:v1:ifsc-1','State Bank of India',true),
                  ($1,$2,2,'enc:v1:holder-2','enc:v1:acct-2','enc:v1:ifsc-2','HDFC Bank',true)`,
      [claimCaseId, pariwarId],
    );

    // ⭐ Story 6.20 (AC5, T16) — the as-at-death DETERMINATION the gate asks for BEFORE the check.
    // Seeded here, ahead of the `accountsOnly` return, so "nobody CHECKED" still reaches the name-check
    // 409 rather than `nominee_determination_required` — a different fact. `determination: 'skip'`
    // builds the UNDETERMINED claim instead.
    if (opts.determination !== 'skip') {
      await seedDeclarationAndDetermination(scopeTx, pariwarId, claimCaseId);
    }

    // ⛔ The "two accounts but NOBODY CHECKED" fixture stops here — exactly the claim AC4's gate
    // must refuse with `nominee_name_check_required`, and the one no test could build before.
    if (opts.accountsOnly === true || opts.singleAccount === true) {
      ok = true;
      return;
    }

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

    // Story 6.20 (AC5) — the token of the EFFECTIVE as-at-death declaration, read through the same
    // accessor the writer re-validates against.
    const token = (
      await claim.getEffectiveNomineeDeclaration(scopeTx.tx, ids.pariwarId(pariwarId), ids.claimId(claimCaseId))
    ).token;

    await claim.recordNomineeNameCheck(scopeTx.client, {
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: ids.pariwarId(pariwarId),
      nomineeDeclarationToken: token,
      accounts: stamps.rows.map((row, i) => ({
        accountRank: row.account_rank as 1 | 2,
        accountUpdatedAt: new Date(row.updated_at).toISOString(),
        verdict: verdicts[i]!,
        clericalReason: clericalReasons[i] ?? null,
      })),
      actorId: randomUUID(),
      // ⛔ NOT a placeholder: the writer refuses an empty display name (D3), so every seeded check
      // carries a name exactly as a real one does.
      actorDisplay: opts.actorDisplay ?? 'Anita (District Admin)',
      actor: 'operator',
    });
    ok = true;
  } finally {
    await closeScopeTx(scopeTx, ok);
  }
}

/** Tomorrow in IST — a certificate date against which every version dated up to now STANDS. */
function certificateDateAfterEverything(): string {
  return cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(new Date()), 1);
}

/**
 * Story 6.20 (T16) — give the claim's deceased a VERSIONED declaration (when they have none) and a live
 * "no discards" determination (when there is none), both through the real domain writers. ⛔ Never a
 * raw `member_nominees` INSERT: that row would be unversioned and fail closed (D1).
 */
async function seedDeclarationAndDetermination(
  scopeTx: Awaited<ReturnType<typeof openScopeTx>>,
  pariwarId: string,
  claimCaseId: string,
): Promise<void> {
  const pid = ids.pariwarId(pariwarId);
  const cid = ids.claimId(claimCaseId);
  const claimRow = await claim.getClaimCase(scopeTx.tx, pid, cid);
  if (!claimRow) throw new Error(`[fixture] claim ${claimCaseId} not found in ${pariwarId}`);
  const mid = claimRow.deceasedMemberId;

  const before = await claim.getEffectiveNomineeDeclaration(scopeTx.tx, pid, cid);
  if (before.status === 'unversioned') {
    throw new Error('[fixture] the deceased has member_nominees rows with NO version — seed them through the declare path');
  }
  let versions = await nominee.listNomineeDeclarationVersions(scopeTx.tx, pid, mid);
  if (versions.length === 0) {
    await scopeTx.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
       VALUES ($1, $2, 'active', 1) ON CONFLICT (member_id) DO NOTHING`,
      [mid, pariwarId],
    );
    const row = {
      rank: 1 as const,
      splitPct: 100 as const,
      relationship: 'spouse',
      nameCiphertext: 'enc:v1:nominee-name-1',
      mobileCiphertext: 'enc:v1:nominee-mobile-1',
      addressCiphertext: null,
    };
    await nominee.replaceMemberNominees(scopeTx.tx, { memberId: mid, pariwarId: pid, nominees: [row] });
    await nominee.appendMemberDeclarationVersions(scopeTx.tx, {
      memberId: mid,
      pariwarId: pid,
      plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(scopeTx.tx, pid, mid), [1]),
      nominees: [row],
      recordedAt: new Date('2026-01-05T06:00:00.000Z'),
      eventVersion: null,
    });
    versions = await nominee.listNomineeDeclarationVersions(scopeTx.tx, pid, mid);
  }
  if (before.determinationId !== null) return;
  const head = (rank: number) =>
    versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);
  await claim.recordNomineeDetermination(scopeTx.client, {
    claimCaseId: cid,
    pariwarId: pid,
    certificateDate: certificateDateAfterEverything(),
    certificateDateCiphertext: 'enc:v1:certificate-date',
    noteCiphertext: 'enc:v1:determination-note',
    marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
    watermark: { rank1: head(1), rank2: head(2) },
    expectedLiveDeterminationId: null,
    actorId: randomUUID(),
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
  });
}
