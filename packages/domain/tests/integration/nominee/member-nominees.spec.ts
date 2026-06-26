// member_nominees behaviour — live-DB integration (Story 3.4, Task 9).
//
// Drives the domain nominee accessors against real Postgres inside the per-test
// BEGIN/ROLLBACK envelope. Three families:
//   · latest-wins replace + ciphertext round-trip — declare 1, then re-declare 2; the prior
//     row-set is DELETED (delete-then-insert), the serialized ciphertext stored AS-IS round-
//     trips, and the server-stamped splitPct lands per rank.
//   · cross-tenant RLS — a PARIWAR_B nominee row is invisible under PARIWAR_A scope (raw AND
//     via the accessor). `enterAppScope` sheds the Docker superuser (which bypasses RLS).
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps its nominee rows.
// Assert membership, not global counts (per-test ROLLBACK isolates rows; [[live-db gotchas]]).

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId } from '../../../src/ids/index.js';
import { getMemberNominees, replaceMemberNominees } from '../../../src/nominee/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

describe.skipIf(!hasDatabase)('member_nominees — latest-wins replace + RLS + FK cascade (:5433)', () => {
  setupLiveDb();

  it('declares 1 then re-declares 2 (latest-wins) — ciphertext round-trips; old rows replaced', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    // Seed the FK target (members row) as the superuser BEFORE entering app scope.
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await enterAppScope(client, PARIWAR_A);

    const memberId = toMemberId(mid);

    // Declare 1 nominee (sole, 100%).
    await replaceMemberNominees(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      nominees: [
        {
          rank: 1,
          nameCiphertext: 'enc:v1:name-A',
          relationship: 'spouse',
          mobileCiphertext: 'enc:v1:mob-A',
          addressCiphertext: null,
          splitPct: 100,
        },
      ],
    });

    let rows = await getMemberNominees(tx, PARIWAR_A, memberId);
    expect(rows.map((r) => r.rank)).toEqual([1]);
    expect(rows[0]!.splitPct).toBe(100);
    expect(rows[0]!.relationship).toBe('spouse');
    expect(rows[0]!.nameCiphertext).toBe('enc:v1:name-A'); // serialized envelope round-trips intact
    expect(rows[0]!.addressCiphertext).toBeNull();

    // Re-declare 2 nominees (latest-wins replace — the prior single row is deleted).
    await replaceMemberNominees(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      nominees: [
        {
          rank: 1,
          nameCiphertext: 'enc:v1:name-1',
          relationship: 'spouse',
          mobileCiphertext: 'enc:v1:mob-1',
          addressCiphertext: 'enc:v1:addr-1',
          splitPct: 75,
        },
        {
          rank: 2,
          nameCiphertext: 'enc:v1:name-2',
          relationship: 'child',
          mobileCiphertext: 'enc:v1:mob-2',
          addressCiphertext: null,
          splitPct: 25,
        },
      ],
    });

    rows = await getMemberNominees(tx, PARIWAR_A, memberId);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]); // exactly the 2 new rows (old single row gone)
    expect(rows.map((r) => r.splitPct)).toEqual([75, 25]);
    expect(rows[1]!.relationship).toBe('child');
    expect(rows[0]!.addressCiphertext).toBe('enc:v1:addr-1');
    expect(rows[1]!.addressCiphertext).toBeNull();
  });

  it('cross-tenant RLS: a PARIWAR_B nominee row is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const midB = randomUUID();
    // Seed member B + a nominee row for B as the superuser (RLS bypassed, before scope).
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    await tx.insert(schema.memberNominees).values({
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      rank: 1,
      nameCiphertext: 'enc:v1:b-name',
      relationship: 'spouse',
      mobileCiphertext: 'enc:v1:b-mob',
      addressCiphertext: null,
      splitPct: 100,
    });

    // Enter PARIWAR_A scope (sheds superuser → RLS now enforced).
    await enterAppScope(client, PARIWAR_A);

    // A raw, tenant-predicate-free SELECT sees 0 of B's rows under A's scope.
    const raw = await client.query('SELECT count(*)::int AS n FROM member_nominees WHERE member_id = $1', [
      midB,
    ]);
    expect(raw.rows[0].n).toBe(0);

    // And the accessor (tenant predicate = A) resolves nothing for B's member.
    expect(await getMemberNominees(tx, PARIWAR_A, toMemberId(midB))).toEqual([]);
  });

  it('FK cascade (RTBF): deleting the member sweeps its nominee rows', async () => {
    const { tx } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await tx.insert(schema.memberNominees).values([
      {
        memberId: toMemberId(mid),
        pariwarId: PARIWAR_A,
        rank: 1,
        nameCiphertext: 'enc:v1:n1',
        relationship: 'spouse',
        mobileCiphertext: 'enc:v1:m1',
        addressCiphertext: null,
        splitPct: 75,
      },
      {
        memberId: toMemberId(mid),
        pariwarId: PARIWAR_A,
        rank: 2,
        nameCiphertext: 'enc:v1:n2',
        relationship: 'child',
        mobileCiphertext: 'enc:v1:m2',
        addressCiphertext: null,
        splitPct: 25,
      },
    ]);

    // Present before the delete.
    const before = await tx
      .select()
      .from(schema.memberNominees)
      .where(eq(schema.memberNominees.memberId, toMemberId(mid)));
    expect(before.map((r) => r.rank).sort()).toEqual([1, 2]);

    // Delete the member → ON DELETE CASCADE sweeps the nominee rows (Story 3.12 RTBF).
    await tx.delete(schema.members).where(eq(schema.members.memberId, toMemberId(mid)));

    const after = await tx
      .select()
      .from(schema.memberNominees)
      .where(eq(schema.memberNominees.memberId, toMemberId(mid)));
    expect(after).toEqual([]);
  });
});
