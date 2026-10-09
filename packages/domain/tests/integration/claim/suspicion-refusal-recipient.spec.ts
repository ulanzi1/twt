// Story 6.24b — RF9's domain read, live DB (:5433): `readSuspicionRefusalRecipient` — who the app's filing code goes to
// while a `-239` suspicion refusal stands for the death (`-262` FQ6 B; `2026-10-08-295` RB8). Ref-only: a version id.
//
//   · ⛔ no standing refusal (none at all / another reason / an allowed appeal / a revision off `-239`) ⇒ `null`;
//   · a standing refusal with an EFFECTIVE determination ⇒ `at_death` + the rank-1 version (the PRE-death one);
//   · a standing refusal whose determination is ⛔ not effective ⇒ `none` (⛔ never the latest nominee);
//   · two standing refusals ⇒ the most recently CREATED refused claim's determination (RF1's order), proved with the
//     claims created in the OPPOSITE order to their refusals.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { readSuspicionRefusalRecipient } from '../../../src/claim/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, seedNomineeDeclaration } from '../_helpers.js';
import { openAppeal, refusedClaim, reverseAtStage1 } from './_suspicion-refusal-fixtures.js';

const DAY = 86_400_000;
const pid = toPariwarId(PARIWAR_A);

/**
 * ⚠ Every `now()` of ONE test transaction TIES ([[project_db_clock_ordering_tests_tie]]) — two claims created here share
 * `created_at`, and RF1's order would fall to the random `claim_case_id` tiebreak. Move the FIRST-created claim back an
 * hour so "most recently CREATED" is what the test says it is.
 */
async function createdEarlier(client: ReturnType<typeof getTx>['client'], claimCaseId: string): Promise<void> {
  await client.query(`UPDATE claims SET created_at = created_at - interval '1 hour' WHERE claim_case_id = $1`, [claimCaseId]);
}

describe.skipIf(!hasDatabase)('Story 6.24b — RF9: readSuspicionRefusalRecipient (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⛔ no refusal for the death ⇒ null (today\'s path)', async () => {
    const { tx } = getTx();
    expect(await readSuspicionRefusalRecipient(tx, pid, toMemberId(randomUUID()))).toBeNull();
  });

  it('a refusal for ANOTHER reason ⇒ null', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    await refusedClaim(client, PARIWAR_A, mid, { reason: 'other', ground: true });
    expect(await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid))).toBeNull();
  });

  it('⭐ a standing `-239` refusal with an EFFECTIVE determination ⇒ `at_death` + the PRE-death rank-1 version', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    await refusedClaim(client, PARIWAR_A, mid, { ground: true });
    const versions = await listNomineeDeclarationVersions(tx, pid, toMemberId(mid));
    const preDeath = versions.find((v) => v.effectiveAt.getTime() < Date.parse('2026-05-01T00:00:00Z'))!;
    const postDeath = versions.find((v) => v.effectiveAt.getTime() > Date.parse('2026-05-01T00:00:00Z'))!;
    const got = await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid));
    expect(got).toEqual({ kind: 'at_death', versionId: preDeath.versionId });
    expect(got).not.toEqual({ kind: 'at_death', versionId: postDeath.versionId });
  });

  it('a standing refusal whose determination is ⛔ not effective (⛔ determination) ⇒ `none` — ⛔ never the latest nominee', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    await refusedClaim(client, PARIWAR_A, mid);
    expect(await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid))).toEqual({ kind: 'none' });
  });

  it('a revision OFF `-239` (the live decision superseded by another reason) ⇒ null', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true });
    expect(await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid))).toMatchObject({ kind: 'at_death' });
    const { rows } = await client.query<{ decision_id: string }>(
      `UPDATE claim_verifier_decisions SET superseded_at = clock_timestamp() WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id`,
      [s],
    );
    await client.query(
      `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id)
       VALUES ($1, $2, 'denied', 'other', 'enc:v1:r', $3, 'Anita (District Admin)', $4)`,
      [s, PARIWAR_A, randomUUID(), rows[0]!.decision_id],
    );
    expect(await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid))).toBeNull();
  });

  it('after S\'s appeal is ALLOWED (the anchor `reversed`) ⇒ null', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true });
    await openAppeal(client, PARIWAR_A, s);
    await reverseAtStage1(client, PARIWAR_A, s);
    expect(await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid))).toBeNull();
  });

  it('⭐ two standing refusals ⇒ the most recently CREATED refused claim decides (created in the OPPOSITE order to the refusals)', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    // S_old is CREATED first but refused LAST, with an effective determination; S_new is created last, refused FIRST,
    // with ⛔ no determination. RF1 orders by the CLAIM's created_at ⇒ S_new decides ⇒ `none`.
    const sOld = await refusedClaim(client, PARIWAR_A, mid, { ground: true, decidedAt: new Date(Date.now() - 1 * DAY) });
    await refusedClaim(client, PARIWAR_A, mid, { decidedAt: new Date(Date.now() - 5 * DAY) });
    await createdEarlier(client, sOld);
    expect(await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid))).toEqual({ kind: 'none' });
  });

  it('…and the mirror: the newest-created refused claim is the grounded one ⇒ `at_death`', async () => {
    const { client, tx } = getTx();
    const mid = randomUUID();
    // The fixture seeds the declaration only for a FRESH member — seed it first, as `groundSuspicion` would.
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-01-10T06:00:00.000Z') });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, { declaredAt: new Date('2026-06-01T06:00:00.000Z'), ensureMember: false });
    const sOld = await refusedClaim(client, PARIWAR_A, mid, { decidedAt: new Date(Date.now() - 1 * DAY) });
    await refusedClaim(client, PARIWAR_A, mid, { ground: true, decidedAt: new Date(Date.now() - 5 * DAY) });
    await createdEarlier(client, sOld);
    expect((await readSuspicionRefusalRecipient(tx, pid, toMemberId(mid)))?.kind).toBe('at_death');
  });
});
