// member_withdrawals behaviour — live-DB integration (Story 3.10, Task 10).
//
// Drives the domain withdrawal accessor against real Postgres inside the per-test BEGIN/ROLLBACK
// envelope. Covers:
//   · row persists (single-row-per-member) + the reason ciphertext is stored AS-IS (never plaintext).
//   · cross-tenant RLS — a PARIWAR_B row is invisible under PARIWAR_A scope (both raw + via accessor).
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps the withdrawal row.
//   · the aadhaar_hmac seam accepts a later backfill UPDATE (the deviation from the append-only tables).
// Assert MEMBERSHIP, not global counts, per [[live-db gotchas]].

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId } from '../../../src/ids/index.js';
import { getMemberWithdrawal, insertMemberWithdrawal } from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

const WITHDRAWN_AT = new Date('2026-01-15T00:00:00Z');
const REJOIN_AT = new Date('2027-01-15T00:00:00Z');

describe.skipIf(!hasDatabase)('member_withdrawals — persist + RLS + FK cascade + seam (:5433)', () => {
  setupLiveDb();

  it('persists a single withdrawal row; reason ciphertext is stored as-is (never plaintext)', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);

    await enterAppScope(client, PARIWAR_A);
    const inserted = await insertMemberWithdrawal(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      reasonCode: 'financial',
      reasonTextCiphertext: 'enc:v1:reason-ct',
      withdrawnAt: WITHDRAWN_AT,
      rejoinPermittedAt: REJOIN_AT,
    });
    expect(inserted.memberId).toBe(memberId);
    expect(inserted.reasonCode).toBe('financial');

    const row = await getMemberWithdrawal(tx, PARIWAR_A, memberId);
    expect(row).not.toBeNull();
    // The ciphertext is stored verbatim — no plaintext leak at rest.
    expect(row?.reasonTextCiphertext).toBe('enc:v1:reason-ct');
    expect(row?.reasonTextCiphertext).not.toContain('reason-plaintext');
    expect(row?.rejoinPermittedAt.toISOString()).toBe(REJOIN_AT.toISOString());
    // The forward-compat Aadhaar-HMAC seam starts NULL (backfilled by a later story).
    expect(row?.aadhaarHmac).toBeNull();
  });

  it('allows a withdrawal with no reason (both reason fields optional)', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);

    await enterAppScope(client, PARIWAR_A);
    const inserted = await insertMemberWithdrawal(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      withdrawnAt: WITHDRAWN_AT,
      rejoinPermittedAt: REJOIN_AT,
    });
    expect(inserted.reasonCode).toBeNull();
    expect(inserted.reasonTextCiphertext).toBeNull();
  });

  it('cross-tenant RLS: a PARIWAR_B withdrawal is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    await tx.insert(schema.memberWithdrawals).values({
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      withdrawnAt: WITHDRAWN_AT,
      rejoinPermittedAt: REJOIN_AT,
    });

    await enterAppScope(client, PARIWAR_A);
    const rows = await tx.select().from(schema.memberWithdrawals);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(await getMemberWithdrawal(tx, PARIWAR_A, toMemberId(midB))).toBeNull();
  });

  it('cross-tenant RLS: the row IS visible under its own PARIWAR_B scope (positive)', async () => {
    const { tx, client } = getTx();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    await tx.insert(schema.memberWithdrawals).values({
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      withdrawnAt: WITHDRAWN_AT,
      rejoinPermittedAt: REJOIN_AT,
    });

    await enterAppScope(client, PARIWAR_B);
    expect(await getMemberWithdrawal(tx, PARIWAR_B, toMemberId(midB))).not.toBeNull();
  });

  it('aadhaar_hmac seam: accepts a later backfill UPDATE (the deviation from append-only tables)', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);

    await enterAppScope(client, PARIWAR_A);
    await insertMemberWithdrawal(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      withdrawnAt: WITHDRAWN_AT,
      rejoinPermittedAt: REJOIN_AT,
    });
    // Story 3.3a will backfill the architecture-committed Aadhaar-HMAC key via UPDATE.
    await tx
      .update(schema.memberWithdrawals)
      .set({ aadhaarHmac: 'hmac-abc123' })
      .where(eq(schema.memberWithdrawals.memberId, memberId));
    const row = await getMemberWithdrawal(tx, PARIWAR_A, memberId);
    expect(row?.aadhaarHmac).toBe('hmac-abc123');
  });

  it('FK cascade: deleting the member sweeps its withdrawal row (RTBF)', async () => {
    const { tx } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);
    await tx.insert(schema.memberWithdrawals).values({
      memberId,
      pariwarId: PARIWAR_A,
      withdrawnAt: WITHDRAWN_AT,
      rejoinPermittedAt: REJOIN_AT,
    });
    await tx.delete(schema.members).where(eq(schema.members.memberId, memberId));
    const rows = await tx
      .select()
      .from(schema.memberWithdrawals)
      .where(eq(schema.memberWithdrawals.memberId, memberId));
    expect(rows).toHaveLength(0);
  });
});
