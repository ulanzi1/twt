// Story 6.39, Task 2.2 / AC3 (DL3, TR5) — the JOINING receipt: the receipt the `pending-fee → lock-in` event names,
// matched by Pariwar + member + UTR. ⛔ The earliest, ⛔ the latest, ⛔ another member's.
//
// Receipts are RAW-inserted with an explicit `paid_at` (G3: `insertVyawasthaShulkReceipt` never passes it — the
// column defaults to the transaction instant, so a fee "before / on / after a death" cannot be seeded through it).
// Live DB only; each test runs in its own rolled-back transaction, read as `twt_app` in the Pariwar's scope.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { readJoiningFeeReceipt } from '../../../src/claim/membership-check-read.js';
import type { Db } from '../../../src/db.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedEvent, seedMember } from '../_helpers.js';

const uniq = (prefix: string) => `${prefix}-${randomUUID()}`;

async function seedReceipt(tx: Db, pariwarId: string, memberId: string, opts: { utr: string; paidAt: string }): Promise<string> {
  const [row] = await tx
    .insert(schema.vyawasthaShulkReceipts)
    .values({
      memberId: toMemberId(memberId),
      pariwarId: toPariwarId(pariwarId),
      tr: uniq('TR'),
      utr: opts.utr,
      amountInr: 100,
      paymentMethod: 'upi',
      paidAt: new Date(opts.paidAt),
      validThrough: new Date('2099-01-01T00:00:00Z'),
    })
    .returning({ receiptId: schema.vyawasthaShulkReceipts.receiptId });
  return row!.receiptId as string;
}

/** The `pending-fee → lock-in` event, as the joining confirm emits it — it carries the REQUEST BODY's UTR (G3). */
async function seedLockInFeeEvent(tx: Db, pariwarId: string, memberId: string, utr: string, eventVersion = 3): Promise<void> {
  await seedEvent(tx, pariwarId, {
    streamId: memberId,
    eventType: 'member.vyawastha_shulk_paid',
    eventVersion,
    payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'vyawastha_shulk_paid', actor: 'member', utr, amount_inr: 100 },
  });
}

const read = (tx: Db, pariwarId: string, memberId: string) =>
  readJoiningFeeReceipt(tx, toPariwarId(pariwarId), toMemberId(memberId));

describe.skipIf(!hasDatabase)('Story 6.39 AC3 — the joining receipt (DL3)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ of a gate-failed receipt, the joining receipt and a later receipt added in lock-in, the JOINING one is chosen — ⛔ the earliest, ⛔ the latest', async () => {
    const { tx, client } = getTx();
    const memberId = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    const utr1 = uniq('UTR1');
    const utr2 = uniq('UTR2');
    const utr3 = uniq('UTR3');
    // (1) a confirm whose lock-in gate failed: the receipt is committed, ⛔ event — the EARLIEST receipt.
    const gateFailed = await seedReceipt(tx, PARIWAR_A, memberId, { utr: utr1, paidAt: '2026-01-05T06:00:00Z' });
    // (2) the confirm that admitted the member: its UTR is the one the lock-in event carries.
    const joining = await seedReceipt(tx, PARIWAR_A, memberId, { utr: utr2, paidAt: '2026-01-09T06:00:00Z' });
    await seedLockInFeeEvent(tx, PARIWAR_A, memberId, utr2);
    // (3) a confirm accepted from a member already in lock-in: a receipt, ⛔ event — the LATEST receipt.
    const later = await seedReceipt(tx, PARIWAR_A, memberId, { utr: utr3, paidAt: '2026-03-20T06:00:00Z' });
    await enterAppScope(client, PARIWAR_A);

    const found = await read(tx, PARIWAR_A, memberId);
    expect(found?.receiptId).toBe(joining);
    expect(found?.receiptId).not.toBe(gateFailed);
    expect(found?.receiptId).not.toBe(later);
    expect(found?.paidAt.toISOString()).toBe('2026-01-09T06:00:00.000Z');
  });

  it('⛔ a renewal event (from_state ≠ pending-fee) is never the joining event', async () => {
    const { tx, client } = getTx();
    const memberId = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    const joinUtr = uniq('UTR-JOIN');
    const renewalUtr = uniq('UTR-RENEW');
    const joining = await seedReceipt(tx, PARIWAR_A, memberId, { utr: joinUtr, paidAt: '2026-01-09T06:00:00Z' });
    await seedReceipt(tx, PARIWAR_A, memberId, { utr: renewalUtr, paidAt: '2027-01-09T06:00:00Z' });
    await seedLockInFeeEvent(tx, PARIWAR_A, memberId, joinUtr, 3);
    await seedEvent(tx, PARIWAR_A, {
      streamId: memberId,
      eventType: 'member.vyawastha_shulk_paid',
      eventVersion: 4,
      payload: { from_state: 'active-in-grace', to_state: 'active', trigger: 'vyawastha_shulk_paid', actor: 'member', utr: renewalUtr, amount_inr: 100, kind: 'renewal' },
    });
    await enterAppScope(client, PARIWAR_A);
    expect((await read(tx, PARIWAR_A, memberId))?.receiptId).toBe(joining);
  });

  it('⭐ the `member_id` leg — ANOTHER member of the Pariwar holding a receipt with the event’s UTR is ⛔ chosen', async () => {
    const { tx, client } = getTx();
    const deceased = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    const other = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    // An event whose UTR is the OTHER member's receipt's UTR — the shape a re-confirm with a corrected UTR wrote before
    // `2026-11-21-475` (the event now carries the STORED receipt's UTR). A RAW fixture: the DEFENCE, unreachable through the door.
    await seedReceipt(tx, PARIWAR_A, deceased, { utr: uniq('UTR-OWN'), paidAt: '2026-01-05T06:00:00Z' });
    const typedUtr = uniq('UTR-TYPED');
    const othersReceipt = await seedReceipt(tx, PARIWAR_A, other, { utr: typedUtr, paidAt: '2026-01-02T06:00:00Z' });
    await seedLockInFeeEvent(tx, PARIWAR_A, deceased, typedUtr);
    await enterAppScope(client, PARIWAR_A);

    // `(pariwar_id, utr)` alone WOULD find the other member's receipt — the control that makes the null meaningful.
    const byUtrAlone = await client.query('SELECT receipt_id FROM vyawastha_shulk_receipts WHERE pariwar_id = $1 AND utr = $2', [PARIWAR_A, typedUtr]);
    expect(byUtrAlone.rows).toEqual([{ receipt_id: othersReceipt }]);
    expect(await read(tx, PARIWAR_A, deceased)).toBeNull();
  });

  it('DEFENCE (raw; unreachable through the door since -475) — the event’s UTR on ⛔ receipt of the member ⇒ null — the check cannot be recorded', async () => {
    const { tx, client } = getTx();
    const memberId = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    await seedReceipt(tx, PARIWAR_A, memberId, { utr: uniq('UTR-STORED'), paidAt: '2026-01-05T06:00:00Z' });
    await seedLockInFeeEvent(tx, PARIWAR_A, memberId, uniq('UTR-CORRECTED'));
    await enterAppScope(client, PARIWAR_A);
    expect(await read(tx, PARIWAR_A, memberId)).toBeNull();
  });

  it('fail-closed defence: ⛔ event at all, an event with ⛔ `from_state`, and an event with ⛔ UTR each ⇒ null', async () => {
    const { tx, client } = getTx();
    const noEvent = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    await seedReceipt(tx, PARIWAR_A, noEvent, { utr: uniq('UTR'), paidAt: '2026-01-05T06:00:00Z' });

    const bareEvent = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    const bareUtr = uniq('UTR');
    await seedReceipt(tx, PARIWAR_A, bareEvent, { utr: bareUtr, paidAt: '2026-01-05T06:00:00Z' });
    // The `seedOpenMemberStream` shape: an empty payload — ⛔ `from_state`, so it is ⛔ the joining event.
    await seedEvent(tx, PARIWAR_A, { streamId: bareEvent, eventType: 'member.vyawastha_shulk_paid', eventVersion: 3, payload: { utr: bareUtr } });

    const noUtr = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    await seedReceipt(tx, PARIWAR_A, noUtr, { utr: uniq('UTR'), paidAt: '2026-01-05T06:00:00Z' });
    await seedEvent(tx, PARIWAR_A, { streamId: noUtr, eventType: 'member.vyawastha_shulk_paid', eventVersion: 3, payload: { from_state: 'pending-fee' } });
    await enterAppScope(client, PARIWAR_A);

    expect(await read(tx, PARIWAR_A, noEvent)).toBeNull();
    expect(await read(tx, PARIWAR_A, bareEvent)).toBeNull();
    expect(await read(tx, PARIWAR_A, noUtr)).toBeNull();
  });

  it('another Pariwar’s session finds nothing (RLS), and a wrong `pariwarId` argument finds nothing (the explicit predicate)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedMember(tx, PARIWAR_A, { state: 'lock-in' });
    const utr = uniq('UTR');
    const joining = await seedReceipt(tx, PARIWAR_A, memberId, { utr, paidAt: '2026-01-09T06:00:00Z' });
    await seedLockInFeeEvent(tx, PARIWAR_A, memberId, utr);
    await enterAppScope(client, PARIWAR_A);
    expect((await read(tx, PARIWAR_A, memberId))?.receiptId).toBe(joining);
    expect(await read(tx, PARIWAR_B, memberId)).toBeNull();
    await enterAppScope(client, PARIWAR_B);
    expect(await read(tx, PARIWAR_A, memberId)).toBeNull();
  });
});
