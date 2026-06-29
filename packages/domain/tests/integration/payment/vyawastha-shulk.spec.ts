// vyawastha_shulk_receipts + member_attribution behaviour — live-DB integration (Story 3.6b, Task 10).
//
// Drives the domain payment accessors against real Postgres inside the per-test BEGIN/ROLLBACK
// envelope. Families:
//   · receipt round-trip + `tr` UNIQUE idempotency — insert a receipt; a SECOND insert with the same
//     `tr` raises 23505, narrowed by isReceiptTrDuplicate; getReceiptByTr / getLatestReceipt resolve it.
//   · cross-tenant RLS — a PARIWAR_B receipt/attribution row is invisible under PARIWAR_A scope.
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps its receipt + attribution rows.
//   · lock_in_days_at_join column write is trigger-safe — a non-`state` UPDATE does NOT trip the 0018
//     state-writer trigger (the receipt RAISEs only on state changes).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId } from '../../../src/ids/index.js';
import { setLockInDaysAtJoin } from '../../../src/member/lock-in.js';
import {
  getLatestReceipt,
  getReceiptByTr,
  insertMemberAttribution,
  insertVyawasthaShulkReceipt,
  isReceiptTrDuplicate,
} from '../../../src/payment/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

const VALID_THROUGH = new Date('2027-01-01T00:00:00Z');

describe.skipIf(!hasDatabase)(
  'vyawastha_shulk_receipts + member_attribution — RLS + idempotency + FK cascade (:5433)',
  () => {
    setupLiveDb();

    it('receipt round-trips; getReceiptByTr + getLatestReceipt resolve it', async () => {
      const { tx } = getTx();
      const mid = randomUUID();
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      const memberId = toMemberId(mid);
      const tr = `signup-${mid}-${randomUUID()}`;

      const row = await insertVyawasthaShulkReceipt(tx, {
        memberId,
        pariwarId: PARIWAR_A,
        tr,
        utr: '123456789012',
        amountInr: 110,
        paymentMethod: 'upi_intent',
        validThrough: VALID_THROUGH,
      });
      expect(row.amountInr).toBe(110);
      expect(row.utr).toBe('123456789012');

      const byTr = await getReceiptByTr(tx, PARIWAR_A, memberId, tr);
      expect(byTr?.receiptId).toBe(row.receiptId);
      const latest = await getLatestReceipt(tx, PARIWAR_A, memberId);
      expect(latest?.receiptId).toBe(row.receiptId);
    });

    it('`tr` UNIQUE: a second insert with the same tr raises 23505 (isReceiptTrDuplicate)', async () => {
      const { tx } = getTx();
      const mid = randomUUID();
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      const memberId = toMemberId(mid);
      const tr = `signup-${mid}-${randomUUID()}`;
      const base = {
        memberId,
        pariwarId: PARIWAR_A,
        tr,
        utr: '123456789012',
        amountInr: 110,
        paymentMethod: 'upi_intent',
        validThrough: VALID_THROUGH,
      };
      await insertVyawasthaShulkReceipt(tx, base);
      let caught: unknown;
      try {
        await insertVyawasthaShulkReceipt(tx, { ...base, utr: '999999999999' });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect(isReceiptTrDuplicate(caught)).toBe(true);
    });

    it('cross-tenant RLS: a PARIWAR_B receipt is invisible under PARIWAR_A scope', async () => {
      const { tx, client } = getTx();
      const midB = randomUUID();
      await seedMember(tx, PARIWAR_B, { memberId: midB });
      await insertVyawasthaShulkReceipt(tx, {
        memberId: toMemberId(midB),
        pariwarId: PARIWAR_B,
        tr: `signup-${midB}-${randomUUID()}`,
        utr: '123456789012',
        amountInr: 110,
        paymentMethod: 'upi_intent',
        validThrough: VALID_THROUGH,
      });

      await enterAppScope(client, PARIWAR_A);
      const rows = await tx.select().from(schema.vyawasthaShulkReceipts);
      expect(rows.every((r) => r.pariwarId !== PARIWAR_B)).toBe(true);
    });

    it('attribution round-trips + cross-tenant RLS denial', async () => {
      const { tx, client } = getTx();
      const midB = randomUUID();
      await seedMember(tx, PARIWAR_B, { memberId: midB });
      const attribution = await insertMemberAttribution(tx, {
        memberId: toMemberId(midB),
        pariwarId: PARIWAR_B,
        attributionSource: '654321',
      });
      expect(attribution.attributionSource).toBe('654321');

      await enterAppScope(client, PARIWAR_A);
      const rows = await tx.select().from(schema.memberAttribution);
      expect(rows.every((r) => r.pariwarId !== PARIWAR_B)).toBe(true);
    });

    it('FK cascade (RTBF): deleting the member sweeps its receipt + attribution rows', async () => {
      const { tx } = getTx();
      const mid = randomUUID();
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      const memberId = toMemberId(mid);
      await insertVyawasthaShulkReceipt(tx, {
        memberId,
        pariwarId: PARIWAR_A,
        tr: `signup-${mid}-${randomUUID()}`,
        utr: '123456789012',
        amountInr: 110,
        paymentMethod: 'upi_intent',
        validThrough: VALID_THROUGH,
      });
      await insertMemberAttribution(tx, {
        memberId,
        pariwarId: PARIWAR_A,
        attributionSource: '111111',
      });

      await tx.delete(schema.members).where(eq(schema.members.memberId, memberId));

      expect(await getLatestReceipt(tx, PARIWAR_A, memberId)).toBeNull();
      const attr = await tx
        .select()
        .from(schema.memberAttribution)
        .where(eq(schema.memberAttribution.memberId, memberId));
      expect(attr).toHaveLength(0);
    });

    it('setLockInDaysAtJoin writes the snapshot column without tripping the 0018 state-writer trigger', async () => {
      const { tx } = getTx();
      const mid = randomUUID();
      // Seed the member directly in `lock-in` (the realistic post-transition state); the column write
      // leaves `state` unchanged, so the trigger (which RAISEs only on state changes) stays quiet.
      await seedMember(tx, PARIWAR_A, { memberId: mid, state: 'lock-in' });
      const memberId = toMemberId(mid);

      await setLockInDaysAtJoin(tx, memberId, 30);

      const rows = await tx
        .select({ days: schema.members.lockInDaysAtJoin, state: schema.members.state })
        .from(schema.members)
        .where(eq(schema.members.memberId, memberId));
      expect(rows[0]?.days).toBe(30);
      expect(rows[0]?.state).toBe('lock-in');
    });
  },
);
