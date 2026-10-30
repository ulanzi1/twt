// Story 6.27a (Task 8; AC8; PM17) — RTBF over the neighbours' answers about a deceased member's death (:5433). Per-test
// ROLLBACK; the writer and the erasure both run as `twt_app` in scope (the per-command UPDATE policy is load-bearing).
//   · erasing the DECEASED scrubs EVERY sensitive answer row of their claims — live AND superseded — to the sentinel and
//     NULLs the date's three window indexes, AFTER Submit and AFTER the claim closed (0156's 0143-form erasure arm admits
//     it); a non-sensitive row keeps its plaintext codes (the exactly-one-value CHECK holds); ⛔ the test plaintext /
//     index survives anywhere in the table.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId, peerMeshPingId as toPingId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import { savePeerAnswer, submitPeerReply } from '../../../src/claim/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope, seedMember } from '../_helpers.js';
import { emitClaim } from './_one-payment-fixtures.js';

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-6-27a-kek' };
const ctx = { pariwarId: PARIWAR_A, fieldClass: 'peer_mesh_answer' };
const enc = async (plain: string) => serializeEnvelope(await encryptTier1(Buffer.from(plain, 'utf-8'), ctx, kms, kekRef));
const dec = async (serialized: string) => Buffer.from(await decryptTier1(parseEnvelope(serialized), ctx, kms, kekRef)).toString('utf-8');

describe.skipIf(!hasDatabase)('Story 6.27a — RTBF over the neighbours\' answers (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐⭐ every SENSITIVE answer (live and superseded) → sentinel, the indexes → NULL — after Submit AND after the claim closed; a non-sensitive row keeps its codes', async () => {
    const { client, tx } = getTx();
    const deceased = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const neighbour = randomUUID();
    const cid = randomUUID();
    await driveClaimTo(client, PARIWAR_A, cid, deceased, 'verification_in_progress');
    const selectionId = randomUUID();
    await client.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
       VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
      [selectionId, cid, PARIWAR_A, deceased, neighbour],
    );
    const pingId = randomUUID();
    await client.query(
      `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, send_outcome, attempt_count, send_updated_at)
       VALUES ($1, $2, $3, $4, 'accepted', 1, clock_timestamp())`,
      [pingId, selectionId, PARIWAR_A, neighbour],
    );
    await enterAppScope(client, PARIWAR_A);

    const base = {
      pariwarId: toPariwarId(PARIWAR_A),
      pingId: toPingId(pingId),
      memberId: toMemberId(neighbour),
      savedVia: 'member_app' as const,
      savedByActorId: neighbour,
      todayIst: '2026-10-12',
    };
    await savePeerAnswer(client, { preReadVersionId: 'peer_mesh.v4', ...base, questionKey: 'has_died', value: { codes: ['died'] }, prepared: { form: 'codes', codes: ['died'] }, decryptedLive: new Map() });
    const first = await savePeerAnswer(client, { preReadVersionId: 'peer_mesh.v4',
      ...base,
      questionKey: 'death_date',
      value: { date: '2026-09-30' },
      prepared: { form: 'encrypted', ciphertext: await enc('2026-09-30'), dateWindowIndexes: ['ZZ-IDX-1', 'ZZ-IDX-2', 'ZZ-IDX-3'], codeIndexes: null },
      decryptedLive: new Map(),
    });
    const firstDate = first.live.find((a) => a.questionKey === 'death_date')!;
    await savePeerAnswer(client, { preReadVersionId: 'peer_mesh.v4',
      ...base,
      questionKey: 'death_date',
      value: { date: '2026-10-01' },
      prepared: { form: 'encrypted', ciphertext: await enc('2026-10-01'), dateWindowIndexes: ['ZZ-IDX-4', 'ZZ-IDX-5', 'ZZ-IDX-6'], codeIndexes: null },
      decryptedLive: new Map([[firstDate.answerId, { date: '2026-09-30' }]]),
    });
    await submitPeerReply(client, { pariwarId: base.pariwarId, pingId: base.pingId, memberId: base.memberId });
    await emitClaim(client, PARIWAR_A, cid, deceased, 'verification_in_progress', 'closed', 'claim.closed', {
      trigger: 'suspicion_appeal_allowed',
      held_by_claim_case_id: randomUUID(),
      deceased_member_id: deceased,
    });

    await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(deceased), pariwarId: PARIWAR_A });

    const { rows } = await client.query<{ question_key: string; value_codes: string[] | null; value_ciphertext: string | null; death_date_window_indexes: string[] | null; superseded_at: Date | null }>(
      `SELECT question_key, value_codes, value_ciphertext, death_date_window_indexes, superseded_at FROM claim_peer_mesh_reply_answers WHERE claim_case_id = $1 ORDER BY saved_at`,
      [cid],
    );
    const dates = rows.filter((r) => r.question_key === 'death_date');
    expect(dates).toHaveLength(2); // the superseded one AND the live one
    expect(dates.some((r) => r.superseded_at !== null)).toBe(true);
    for (const r of dates) {
      expect(await dec(r.value_ciphertext!)).toBe(ANONYMIZED_SENTINEL);
      expect(r.death_date_window_indexes).toBeNull();
    }
    const hasDied = rows.find((r) => r.question_key === 'has_died')!;
    expect(hasDied).toMatchObject({ value_codes: ['died'], value_ciphertext: null });
    const dump = JSON.stringify(rows);
    for (const leaked of ['ZZ-IDX', '2026-09-30', '2026-10-01']) expect(dump.includes(leaked), leaked).toBe(false);
  });
});
