// AR-65 member-search compound read model — live-DB integration (Story 4.7, Task 1 + Task 2; AC1).
//
// Drives the projector-exclusive projection refresh, the write-rejection trigger, the scope-respecting
// search accessor (member_id + mobile blind index), the cross-Pariwar RLS guarantee, the nominee-summary
// capture, and the no-N+1 query-count assertion — all against real Postgres under PARIWAR_A scope inside
// the per-test BEGIN/ROLLBACK (nothing persists). Asserts MEMBERSHIP / explicit values, never global
// counts; per [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId } from '../../../src/ids/index.js';
import { projectMemberState, searchMembers } from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const audit = (
  from: string | null,
  to: string,
  trigger: string,
  actor: 'member' | 'system' | 'trustee',
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ from_state: from, to_state: to, trigger, actor, ...extra });

/** Seed a member_identities row directly (plain-text columns; no encryption transformer). */
async function seedIdentity(
  client: import('pg').PoolClient,
  memberId: string,
  pariwarId: string,
  mobileBlindIndex: string,
): Promise<void> {
  await client.query(
    `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
     VALUES ($1, $2, $3, $4)`,
    [memberId, pariwarId, 'enc:test:mobile', mobileBlindIndex],
  );
}

/** Seed a member_nominees row directly (raw SQL — bypass the Tier-1 column transformer for ciphertext). */
async function seedNominee(
  client: import('pg').PoolClient,
  memberId: string,
  pariwarId: string,
  rank: number,
  relationship: string,
  splitPct: number,
): Promise<void> {
  await client.query(
    `INSERT INTO member_nominees
       (member_id, pariwar_id, rank, name_ciphertext, relationship, mobile_ciphertext, split_pct)
     VALUES ($1, $2, $3, 'enc:test:name', $4, 'enc:test:mobile', $5)`,
    [memberId, pariwarId, rank, relationship, splitPct],
  );
}

describe.skipIf(!hasDatabase)('member-search projection (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('the projector writes the projection on member-state append + refreshes on later events', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.signup_initiated',
      payload: audit(null, 'pending-kyc', 'signup', 'member'),
      actorId: null,
    });

    let rows = await tx
      .select()
      .from(schema.memberSearchProjection)
      .where(eq(schema.memberSearchProjection.memberId, mid));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.state).toBe('pending-kyc');
    expect(rows[0]?.stateEventVersion).toBe(1);
    // D2: the contribution + claim sections are the typed producer_unavailable sentinel, NEVER [].
    expect(rows[0]?.contributionSection).toEqual({ status: 'producer_unavailable', producer: 'story-10-24' });
    expect(rows[0]?.claimSection).toEqual({ status: 'producer_unavailable', producer: 'epic-6' });
    expect(rows[0]?.nomineeSummary).toEqual([]);

    // A subsequent state event refreshes the SAME projection row (incremental, one row per member).
    await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.kyc_completed',
      payload: audit('pending-kyc', 'pending-fee', 'verified', 'system'),
      actorId: null,
    });
    rows = await tx
      .select()
      .from(schema.memberSearchProjection)
      .where(eq(schema.memberSearchProjection.memberId, mid));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.state).toBe('pending-fee');
    expect(rows[0]?.stateEventVersion).toBe(2);
  });

  it('captures the non-PII nominee summary (count + split + relationship) on the nominees_declared event', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.signup_initiated',
      payload: audit(null, 'pending-kyc', 'signup', 'member'),
      actorId: null,
    });
    // Nominee rows are written in the SAME scope-tx BEFORE the nominees_declared event (the handler's
    // ordering) — so the projector's refresh sees them.
    await seedNominee(client, mid, PARIWAR_A, 1, 'spouse', 75);
    await seedNominee(client, mid, PARIWAR_A, 2, 'child', 25);
    await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.nominees_declared',
      payload: { ...audit('pending-kyc', 'pending-kyc', 'nominees declared', 'member'), nominee_count: 2, split: '75-25' },
      actorId: null,
    });

    const rows = await tx
      .select()
      .from(schema.memberSearchProjection)
      .where(eq(schema.memberSearchProjection.memberId, mid));
    expect(rows[0]?.nomineeSummary).toEqual([
      { rank: 1, relationship: 'spouse', splitPct: 75 },
      { rank: 2, relationship: 'child', splitPct: 25 },
    ]);
  });

  it('the write-rejection trigger blocks an out-of-band INSERT/UPDATE (projector-exclusive)', async () => {
    const { client } = getTx();
    const mid = randomUUID();
    // Seed the member row (superuser) so the FK is satisfied, then enter app scope.
    await getTx().tx.insert(schema.members).values({
      memberId: toMemberId(mid),
      pariwarId: PARIWAR_A,
      state: 'pending-kyc',
      stateEventVersion: 1,
    });
    await enterAppScope(client, PARIWAR_A);

    // Direct INSERT without app.member_search_projection_writer = 'on' → trigger RAISEs P0001.
    const err = await client
      .query(
        `INSERT INTO member_search_projection (member_id, pariwar_id, state, state_event_version)
         VALUES ($1, $2, 'pending-kyc', 1)`,
        [mid, PARIWAR_A],
      )
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
    expect((err as Error).message).toContain('member_search_projection direct write rejected');
  });

  it('search by member_id + by mobile blind index returns the in-scope projection (exact-match)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const blindIdx = `bx-${randomUUID()}`;

    await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.signup_initiated',
      payload: audit(null, 'pending-kyc', 'signup', 'member'),
      actorId: null,
    });
    await seedIdentity(client, mid, PARIWAR_A, blindIdx);

    const byId = await searchMembers(getTx().tx, {
      pariwarId: PARIWAR_A,
      criteria: { by: 'memberId', memberId: mid },
    });
    expect(byId).toHaveLength(1);
    expect(byId[0]?.memberId).toBe(mid);
    expect(byId[0]?.state).toBe('pending-kyc');
    expect(byId[0]?.mobileCiphertext).toBe('enc:test:mobile');
    expect(byId[0]?.nameCiphertext).toBeNull(); // no KYC profile seeded

    const byMobile = await searchMembers(getTx().tx, {
      pariwarId: PARIWAR_A,
      criteria: { by: 'mobileBlindIndex', mobileBlindIndex: blindIdx },
    });
    expect(byMobile.map((r) => r.memberId)).toContain(mid);

    // A wrong exact value returns nothing (blind index is exact-match only — no prefix/fuzzy).
    const miss = await searchMembers(getTx().tx, {
      pariwarId: PARIWAR_A,
      criteria: { by: 'mobileBlindIndex', mobileBlindIndex: blindIdx.slice(0, -1) },
    });
    expect(miss).toHaveLength(0);
  });

  it('a cross-Pariwar search returns nothing (RLS scope-respecting)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.signup_initiated',
      payload: audit(null, 'pending-kyc', 'signup', 'member'),
      actorId: null,
    });

    // Searching the SAME member id but scoped to PARIWAR_B returns nothing (RLS + explicit predicate).
    const cross = await searchMembers(getTx().tx, {
      pariwarId: PARIWAR_B,
      criteria: { by: 'memberId', memberId: mid },
    });
    expect(cross).toHaveLength(0);
  });

  it('no N+1: the pariwar browse resolves N members in ONE query (constant, not per-result)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (let i = 0; i < 4; i++) {
      await projectMemberState(client, {
        memberId: toMemberId(randomUUID()),
        pariwarId: PARIWAR_A,
        eventType: 'member.signup_initiated',
        payload: audit(null, 'pending-kyc', 'signup', 'member'),
        actorId: null,
      });
    }

    // Instrument the client to count queries issued during the search only.
    const realQuery = client.query.bind(client);
    let queryCount = 0;
    (client as unknown as { query: typeof realQuery }).query = ((...args: unknown[]) => {
      queryCount += 1;
      return (realQuery as (...a: unknown[]) => unknown)(...args);
    }) as typeof realQuery;
    try {
      const results = await searchMembers(getTx().tx, {
        pariwarId: PARIWAR_A,
        criteria: { by: 'pariwar' },
      });
      expect(results.length).toBeGreaterThanOrEqual(4);
      // ONE query for the whole page (a join, not a per-result loop) — the AR-65 no-N+1 guarantee.
      expect(queryCount).toBe(1);
    } finally {
      (client as unknown as { query: typeof realQuery }).query = realQuery;
    }
  });
});
