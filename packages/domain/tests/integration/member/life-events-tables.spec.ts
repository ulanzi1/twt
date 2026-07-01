// member_addresses + member_postings behaviour — live-DB integration (Story 3.9, Task 9).
//
// Drives the domain Life Events accessors against real Postgres inside the per-test BEGIN/ROLLBACK
// envelope. Three families per table:
//   · append-only history — a prior row is PRESERVED when a newer one is appended (AC1 "prior value
//     preserved"; NOT latest-wins), and getLatest returns the newest by created_at.
//   · cross-tenant RLS — a PARIWAR_B row is invisible under PARIWAR_A scope (both raw + via the
//     accessor). enterAppScope sheds the Docker superuser (which bypasses RLS).
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps its Life Events rows.
// Assert MEMBERSHIP, not global counts, per [[live-db gotchas]].

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId } from '../../../src/ids/index.js';
import {
  getMemberAddressLatest,
  getMemberPostingLatest,
  insertMemberAddress,
  insertMemberPosting,
} from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

describe.skipIf(!hasDatabase)('member_addresses — append-only + RLS + FK cascade (:5433)', () => {
  setupLiveDb();

  it('append-only: a prior address is preserved when a newer one is appended; getLatest is newest', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);

    // Older row seeded directly with an explicit past timestamp (within one tx now() ties).
    await tx.insert(schema.memberAddresses).values({
      memberId,
      pariwarId: PARIWAR_A,
      addressLineCiphertext: 'enc:v1:addr-old',
      locale: 'en',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });
    await enterAppScope(client, PARIWAR_A);
    const newer = await insertMemberAddress(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      addressLineCiphertext: 'enc:v1:addr-new',
      locale: 'hi',
    });

    // BOTH rows preserved (append-only) — assert membership.
    const all = await tx
      .select()
      .from(schema.memberAddresses)
      .where(eq(schema.memberAddresses.memberId, memberId));
    const ciphertexts = all.map((r) => r.addressLineCiphertext);
    expect(ciphertexts).toContain('enc:v1:addr-old');
    expect(ciphertexts).toContain('enc:v1:addr-new');

    // getLatest returns the newest by created_at.
    const latest = await getMemberAddressLatest(tx, PARIWAR_A, memberId);
    expect(latest?.addressId).toBe(newer.addressId);
    expect(latest?.addressLineCiphertext).toBe('enc:v1:addr-new');
  });

  it('cross-tenant RLS: a PARIWAR_B address is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    await tx.insert(schema.memberAddresses).values({
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      addressLineCiphertext: 'enc:v1:addr-b',
      locale: 'en',
    });

    await enterAppScope(client, PARIWAR_A);
    const rows = await tx.select().from(schema.memberAddresses);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(await getMemberAddressLatest(tx, PARIWAR_A, toMemberId(midB))).toBeNull();
  });

  it('FK cascade: deleting the member sweeps its address rows (RTBF)', async () => {
    const { tx } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);
    await tx.insert(schema.memberAddresses).values({
      memberId,
      pariwarId: PARIWAR_A,
      addressLineCiphertext: 'enc:v1:addr',
      locale: 'en',
    });
    await tx.delete(schema.members).where(eq(schema.members.memberId, memberId));
    const rows = await tx
      .select()
      .from(schema.memberAddresses)
      .where(eq(schema.memberAddresses.memberId, memberId));
    expect(rows).toHaveLength(0);
  });
});

describe.skipIf(!hasDatabase)('member_postings — append-only + RLS + FK cascade (:5433)', () => {
  setupLiveDb();

  it('append-only: prior posting preserved; getLatest newest; is_retirement round-trips', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);

    await tx.insert(schema.memberPostings).values({
      memberId,
      pariwarId: PARIWAR_A,
      district: 'Pune',
      isRetirement: false,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });
    await enterAppScope(client, PARIWAR_A);
    const newer = await insertMemberPosting(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      district: 'Nagpur',
      isRetirement: true,
    });

    const all = await tx
      .select()
      .from(schema.memberPostings)
      .where(eq(schema.memberPostings.memberId, memberId));
    expect(all.map((r) => r.district)).toContain('Pune');
    expect(all.map((r) => r.district)).toContain('Nagpur');

    const latest = await getMemberPostingLatest(tx, PARIWAR_A, memberId);
    expect(latest?.postingId).toBe(newer.postingId);
    expect(latest?.district).toBe('Nagpur');
    expect(latest?.isRetirement).toBe(true);
  });

  it('cross-tenant RLS: a PARIWAR_B posting is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    await tx.insert(schema.memberPostings).values({
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      district: 'Mumbai',
      isRetirement: false,
    });

    await enterAppScope(client, PARIWAR_A);
    const rows = await tx.select().from(schema.memberPostings);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(await getMemberPostingLatest(tx, PARIWAR_A, toMemberId(midB))).toBeNull();
  });

  it('FK cascade: deleting the member sweeps its posting rows (RTBF)', async () => {
    const { tx } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);
    await tx.insert(schema.memberPostings).values({
      memberId,
      pariwarId: PARIWAR_A,
      district: 'Pune',
      isRetirement: false,
    });
    await tx.delete(schema.members).where(eq(schema.members.memberId, memberId));
    const rows = await tx
      .select()
      .from(schema.memberPostings)
      .where(eq(schema.memberPostings.memberId, memberId));
    expect(rows).toHaveLength(0);
  });
});
