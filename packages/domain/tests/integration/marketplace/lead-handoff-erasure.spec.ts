// Story 12.5 (Task 6 / 9.1; AC9's erasure half; QE16, W11; TR19) — `anonymizeMember` meets the member's lead handoffs, live, AS `twt_app`
// under the Pariwar's scope (FORCE RLS: without the UPDATE policy at birth the scrub would match 0 rows SILENTLY — so every leg asserts the
// rows that DID change, beside the ones that must not). Per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { memberId as toMemberId } from '../../../src/ids/index.js';
import { claimDueLeadHandoff, readLeadHandoffPredicates } from '../../../src/marketplace/lead-handoff.js';
import { anonymizeMember } from '../../../src/member/anonymize.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { SEALED_PLACEHOLDER, handoffRow, insertHandoffRaw, seedHandoffWorld, seedLeadConsent, type HandoffWorld } from './_lead-handoff-fixtures.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-12-5-kek' };

type Client = ReturnType<typeof getTx>['client'];

/** Another handoff for the SAME member and Pariwar: a fresh lead on a fresh module (one registration per offer). */
async function another(client: Client, w: HandoffWorld): Promise<HandoffWorld> {
  const fresh = await seedHandoffWorld(client, w.pariwarId);
  const leadId = randomUUID();
  const consentId = await seedLeadConsent(client, w.pariwarId, { subjectId: w.memberId, artifactRef: leadId });
  return { ...fresh, memberId: w.memberId, leadId, consentId };
}

describe.skipIf(!hasDatabase)('Story 12.5 — erasure meets the lead handoffs (W11, live)', () => {
  setupLiveDb();

  it('NULLs the fields on every row that holds them, in every status, and cancels a due row (cancelled:member_erased)', async () => {
    const { client } = getTx();
    const due = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, due);
    const att = await another(client, due);
    await insertHandoffRaw(client, att, { status: 'attempting', attemptCount: 1 });
    const del = await another(client, due);
    await insertHandoffRaw(client, del, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200', partnerReference: 'REF-9' });
    const fail = await another(client, due);
    await insertHandoffRaw(client, fail, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400' });
    const held = await another(client, due);
    await insertHandoffRaw(client, held, { outcomeDetail: 'held:kms_unavailable', heldSinceSql: "now() - interval '1 hour'" });

    await enterAppScope(client, PARIWAR_A);
    await anonymizeMember(bindScopedDb(client), { kms, kekRef }, { memberId: toMemberId(due.memberId), pariwarId: PARIWAR_A });
    await client.query('RESET ROLE');

    expect(await handoffRow(client, due.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:member_erased', member_fields_ciphertext: null });
    expect(await handoffRow(client, held.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:member_erased', member_fields_ciphertext: null });
    expect(await handoffRow(client, att.leadId)).toMatchObject({ status: 'attempting', attempt_count: 1, member_fields_ciphertext: null });
    expect(await handoffRow(client, del.leadId)).toMatchObject({ status: 'delivered', outcome_detail: 'delivered:http_2xx:200', partner_reference: 'REF-9', member_fields_ciphertext: null });
    expect(await handoffRow(client, fail.leadId)).toMatchObject({ status: 'failed_delivery', member_fields_ciphertext: null });
    // What it leaves (QE16; `-484` Q5 A): the ids, the status and the times — the member↔offer link.
    expect(await handoffRow(client, del.leadId)).toMatchObject({ member_id: due.memberId, module_id: del.moduleId, consent_id: del.consentId });
  });

  it('SUCCEEDS on the rows it will really meet, leaving them BYTE-UNCHANGED: a cancelled row and a purged delivered row (TR19)', async () => {
    const { client } = getTx();
    const cancelled = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, cancelled, { status: 'cancelled', outcomeDetail: 'cancelled:member_withdrawn', ciphertext: null });
    const purged = await another(client, cancelled);
    await insertHandoffRaw(client, purged, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200', ciphertext: null, updatedAtSql: "now() - interval '40 days'" });
    const before = [await handoffRow(client, cancelled.leadId), await handoffRow(client, purged.leadId)];

    await enterAppScope(client, PARIWAR_A);
    await anonymizeMember(bindScopedDb(client), { kms, kekRef }, { memberId: toMemberId(cancelled.memberId), pariwarId: PARIWAR_A });
    await client.query('RESET ROLE');

    expect([await handoffRow(client, cancelled.leadId), await handoffRow(client, purged.leadId)]).toEqual(before);
  });

  it('leaves ANOTHER member\'s rows untouched — and another Pariwar\'s (the control rows keep their fields)', async () => {
    const { client } = getTx();
    const mine = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, mine);
    const otherMember = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, otherMember);
    const otherPariwar = await seedHandoffWorld(client, PARIWAR_B);
    await insertHandoffRaw(client, otherPariwar);

    await enterAppScope(client, PARIWAR_A);
    await anonymizeMember(bindScopedDb(client), { kms, kekRef }, { memberId: toMemberId(mine.memberId), pariwarId: PARIWAR_A });
    await client.query('RESET ROLE');

    expect((await handoffRow(client, mine.leadId))['member_fields_ciphertext']).toBeNull();
    expect(await handoffRow(client, otherMember.leadId)).toMatchObject({ status: 'due', member_fields_ciphertext: SEALED_PLACEHOLDER });
    expect(await handoffRow(client, otherPariwar.leadId)).toMatchObject({ status: 'due', member_fields_ciphertext: SEALED_PLACEHOLDER });
  });

  it('afterwards nothing of the member can be sent: ⛔ due row to claim, and an in-flight row is cancelled by P2 at its next attempt', async () => {
    const { client } = getTx();
    const due = await seedHandoffWorld(client, PARIWAR_A);
    await insertHandoffRaw(client, due);
    const att = await another(client, due);
    await insertHandoffRaw(client, att, { status: 'attempting', attemptCount: 1 });

    await enterAppScope(client, PARIWAR_A);
    await anonymizeMember(bindScopedDb(client), { kms, kekRef }, { memberId: toMemberId(due.memberId), pariwarId: PARIWAR_A });
    await client.query('RESET ROLE');

    const claimed = await claimDueLeadHandoff(client, { claimToken: randomUUID() });
    expect([due.leadId, att.leadId]).not.toContain(claimed?.leadId);
    await client.query(`SELECT set_config('app.pariwar_id', $1, true)`, [PARIWAR_A]);
    expect(await readLeadHandoffPredicates(bindScopedDb(client), client, att)).toEqual({ kind: 'cancel', word: 'member_erased' });
  });
});
