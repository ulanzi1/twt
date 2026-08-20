// The public Member Directory roster read — live-DB integration (Story 11a.3, Task 2; AC2).
//
// Drives `listPublicDirectoryMembers` / `countPublicDirectoryMembers` against real Postgres inside
// the per-test BEGIN/ROLLBACK envelope. Five families:
//   · the RULED roster predicate (`2026-08-20-143` cl.3) — every excluded lifecycle state, and a
//     suspended / terminated / restored member.
//   · the SET-BASED district read — the D3 comparator `created_at DESC, posting_id DESC`, INCLUDING
//     the `posting_id` tie-break on a `created_at` tie, and the correlated-subquery correctness that
//     [[project_epic6_drizzle_correlated_subquery_bug]] is about (member A must not inherit B's district).
//   · deterministic paging across two pages — the property offset paging silently violates when the
//     ORDER BY is not total.
//   · the KYC inner join — a member with no profile row is OMITTED, never a blank name row.
//   · cross-tenant RLS.
//
// ⚠ Assert MEMBERSHIP, not global counts, per [[project_live_db_test_gotchas]] — EXCEPT where the
// assertion is explicitly scoped to ids this test seeded.

import { describe, expect, it } from 'vitest';

import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import {
  countPublicDirectoryMembers,
  listPublicDirectoryMembers,
} from '../../../src/member/index.js';
import { memberModerationActions } from '../../../src/schema/member_moderation_actions.js';
import * as schema from '../../../src/schema/index.js';
import type { MemberLifecycleState } from '../../../src/member/state.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppScope,
  seedMember,
  seedMemberPosting,
} from '../_helpers.js';
import type { Db } from '../../../src/db.js';

const TRUSTEE = 'aaaaaaaa-0000-4000-8000-0000000000a1';

/** Seed a member + its KYC profile (the inner join the accessor requires). Returns the member id. */
async function seedDirectoryMember(
  tx: Db,
  pariwar: string,
  opts: { state?: MemberLifecycleState; memberId?: string; withKyc?: boolean } = {},
): Promise<string> {
  const mid = await seedMember(tx, pariwar, {
    state: opts.state ?? 'active',
    ...(opts.memberId !== undefined ? { memberId: opts.memberId } : {}),
  });
  if (opts.withKyc !== false) {
    await tx.insert(schema.memberKycProfiles).values({
      memberId: toMemberId(mid),
      pariwarId: toPariwarId(pariwar),
      nameCiphertext: `enc:v1:kyc-name-${mid}`,
      dobCiphertext: 'enc:v1:dob',
      photoCiphertext: 'enc:v1:photo',
      aadhaarMaskedId: 'XXXX1234',
      verificationStrength: 'aadhaar_kyc',
      source: 'digilocker',
    });
  }
  return mid;
}

/** Record a moderation action against a member. */
async function seedModeration(
  tx: Db,
  memberId: string,
  action: 'suspend' | 'terminate' | 'restore',
  actedAt: Date,
): Promise<void> {
  await tx.insert(memberModerationActions).values({
    memberId: toMemberId(memberId),
    pariwarId: toPariwarId(PARIWAR_A),
    action,
    reasonCode: 'r7-contribution-discipline',
    decisionNoteCiphertext: 'enc:v1:seed-decision-note',
    // ⚠ `member_moderation_actions_escalation_iff_terminate` makes these two NOT NULL iff the action
    // is `terminate` — and NULL otherwise. Supplying them unconditionally fails the other direction.
    ...(action === 'terminate'
      ? {
          escalationInadequacyCiphertext: 'enc:v1:why-suspension-was-inadequate',
          escalationProportionalityCiphertext: 'enc:v1:why-termination-is-proportionate',
          // `member_moderation_actions_rejoin_iff_terminate` — same iff shape, third column.
          rejoinPermittedAt: new Date('2027-06-02T00:00:00Z'),
        }
      : {}),
    actorId: TRUSTEE,
    actorDisplay: 'Seed Trustee',
    actedAt,
  });
}

describe.skipIf(!hasDatabase)('public Member Directory roster read (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── The RULED roster predicate — `2026-08-20-143` cl.3 (D3(a)) ──────────────────────────────

  it('admits exactly the three ruled lifecycle states and omits every other one', async () => {
    const { tx, client } = getTx();
    const admitted: Record<string, string> = {};
    for (const state of ['active', 'active-in-grace', 'lock-in'] as const) {
      admitted[state] = await seedDirectoryMember(tx, PARIWAR_A, { state });
    }
    const omitted: Record<string, string> = {};
    for (const state of [
      'pending-kyc',
      'pending-fee',
      'pending-valid',
      'lapsed-unpaid',
      'withdrawn',
      'anonymized',
    ] as const) {
      omitted[state] = await seedDirectoryMember(tx, PARIWAR_A, { state });
    }

    await enterAppScope(client, PARIWAR_A);
    const ids = (await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 })).map(
      (r) => r.memberId as string,
    );

    for (const [state, id] of Object.entries(admitted)) {
      expect(ids, `${state} must appear`).toContain(id);
    }
    for (const [state, id] of Object.entries(omitted)) {
      expect(ids, `${state} must NOT appear`).not.toContain(id);
    }
  });

  it('omits a SUSPENDED member and a TERMINATED member, and re-admits a RESTORED one', async () => {
    const { tx, client } = getTx();
    const plain = await seedDirectoryMember(tx, PARIWAR_A);
    const suspended = await seedDirectoryMember(tx, PARIWAR_A);
    const terminated = await seedDirectoryMember(tx, PARIWAR_A);
    const restored = await seedDirectoryMember(tx, PARIWAR_A);

    await seedModeration(tx, suspended, 'suspend', new Date('2026-06-01T00:00:00Z'));
    await seedModeration(tx, terminated, 'suspend', new Date('2026-06-01T00:00:00Z'));
    await seedModeration(tx, terminated, 'terminate', new Date('2026-06-02T00:00:00Z'));
    // The restored member's history is suspend → restore: the LATEST action decides, so they return.
    await seedModeration(tx, restored, 'suspend', new Date('2026-06-01T00:00:00Z'));
    await seedModeration(tx, restored, 'restore', new Date('2026-06-03T00:00:00Z'));

    await enterAppScope(client, PARIWAR_A);
    const ids = (await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 })).map(
      (r) => r.memberId as string,
    );

    expect(ids).toContain(plain);
    expect(ids).not.toContain(suspended);
    expect(ids).not.toContain(terminated);
    // ⭐ Suspension is NOT a permanent directory ban — the moderation model's own "suspension keeps
    // the roster" posture survives here as "a restore puts you back on the page".
    expect(ids).toContain(restored);
  });

  // ── The set-based district read + the D3 comparator ─────────────────────────────────────────

  it('resolves each member to their OWN latest district — the correlated subquery is not a tautology', async () => {
    const { tx, client } = getTx();
    // Deliberately seeded so that a collapsed correlation (the Epic-6 bug) would hand BOTH members
    // the globally-latest posting. If this test ever reads 'Kanpur' for `a`, the correlation broke.
    const a = await seedDirectoryMember(tx, PARIWAR_A);
    const b = await seedDirectoryMember(tx, PARIWAR_A);
    await seedMemberPosting(tx, PARIWAR_A, a, 'Lucknow', {
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, PARIWAR_A, b, 'Kanpur', {
      createdAt: new Date('2026-05-01T00:00:00Z'),
    });

    await enterAppScope(client, PARIWAR_A);
    const rows = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 });
    const byId = new Map(rows.map((r) => [r.memberId as string, r.district]));

    expect(byId.get(a)).toBe('Lucknow');
    expect(byId.get(b)).toBe('Kanpur');
  });

  it('breaks a created_at TIE on posting_id DESC — the D3 comparator, not created_at alone', async () => {
    const { tx, client } = getTx();
    const mid = await seedDirectoryMember(tx, PARIWAR_A);
    const tie = new Date('2026-03-01T00:00:00Z');
    // Same instant, two postings. ⛔ `ORDER BY created_at DESC` ALONE resolves this
    // non-deterministically; the D3 rule's `posting_id DESC` makes the HIGHER uuid win.
    const lowId = '00000000-0000-4000-8000-000000000001';
    const highId = 'ffffffff-0000-4000-8000-00000000000f';
    await seedMemberPosting(tx, PARIWAR_A, mid, 'LowIdDistrict', {
      postingId: lowId,
      createdAt: tie,
    });
    await seedMemberPosting(tx, PARIWAR_A, mid, 'HighIdDistrict', {
      postingId: highId,
      createdAt: tie,
    });

    await enterAppScope(client, PARIWAR_A);
    const rows = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 });
    expect(rows.find((r) => (r.memberId as string) === mid)?.district).toBe('HighIdDistrict');
  });

  it('honours the as-of bound: a posting created after `now` does not win', async () => {
    const { tx, client } = getTx();
    const mid = await seedDirectoryMember(tx, PARIWAR_A);
    await seedMemberPosting(tx, PARIWAR_A, mid, 'Older', {
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await seedMemberPosting(tx, PARIWAR_A, mid, 'Future', {
      createdAt: new Date('2026-12-01T00:00:00Z'),
    });

    await enterAppScope(client, PARIWAR_A);
    const rows = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), {
      limit: 50,
      now: new Date('2026-06-01T00:00:00Z'),
    });
    expect(rows.find((r) => (r.memberId as string) === mid)?.district).toBe('Older');
  });

  it('a member with NO posting row yields a null district, and is still LISTED', async () => {
    const { tx, client } = getTx();
    const mid = await seedDirectoryMember(tx, PARIWAR_A);

    await enterAppScope(client, PARIWAR_A);
    const rows = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 });
    const row = rows.find((r) => (r.memberId as string) === mid);
    // ⭐ A missing district is a missing FIELD, not a missing member — the member still belongs on
    // the directory. ⛔ Do not "fix" this into an inner join on member_postings.
    expect(row).toBeDefined();
    expect(row?.district).toBeNull();
  });

  // ── The KYC inner join ──────────────────────────────────────────────────────────────────────

  it('OMITS a member with no KYC profile row — never a blank name row', async () => {
    const { tx, client } = getTx();
    const withKyc = await seedDirectoryMember(tx, PARIWAR_A);
    const withoutKyc = await seedDirectoryMember(tx, PARIWAR_A, { withKyc: false });

    await enterAppScope(client, PARIWAR_A);
    const rows = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 });
    const ids = rows.map((r) => r.memberId as string);
    expect(ids).toContain(withKyc);
    expect(ids).not.toContain(withoutKyc);
    // The ciphertext travels AS STORED — the accessor never decrypts.
    expect(rows.find((r) => (r.memberId as string) === withKyc)?.nameCiphertext).toBe(
      `enc:v1:kyc-name-${withKyc}`,
    );
  });

  // ── Deterministic paging ────────────────────────────────────────────────────────────────────

  it('pages deterministically: page 1 ∪ page 2 are disjoint and cover the seeded set, on every request', async () => {
    const { tx, client } = getTx();
    const seeded: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      seeded.push(await seedDirectoryMember(tx, PARIWAR_A));
    }

    await enterAppScope(client, PARIWAR_A);
    const p = async (offset: number): Promise<string[]> =>
      (await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 3, offset })).map(
        (r) => r.memberId as string,
      );

    const page1 = await p(0);
    const page2 = await p(3);
    expect(page1).toHaveLength(3);
    expect(page1.filter((id) => page2.includes(id))).toEqual([]);

    // ⭐ THE PROPERTY, RUN TWICE: page N is the same page N on a second request. A non-total ORDER BY
    // passes this maybe half the time, which is exactly why it is asserted rather than assumed.
    expect(await p(0)).toEqual(page1);
    expect(await p(3)).toEqual(page2);

    // Ascending member_id, the house convention.
    expect([...page1].sort()).toEqual(page1);

    // Every seeded member is reachable by walking the pages (membership, not a global count).
    const walked = new Set([...page1, ...page2, ...(await p(6))]);
    for (const id of seeded) expect(walked.has(id)).toBe(true);
  });

  it('clamps the limit: an over-cap request cannot pull more than the FR-91 ceiling', async () => {
    const { tx, client } = getTx();
    for (let i = 0; i < 3; i += 1) await seedDirectoryMember(tx, PARIWAR_A);

    await enterAppScope(client, PARIWAR_A);
    // `clampLimit` maps 10_000 → the cap (50) and −1 → 1. ⛔ A LIMIT -1 would return ALL rows.
    const huge = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 10_000 });
    expect(huge.length).toBeLessThanOrEqual(50);
    const negative = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: -1 });
    expect(negative).toHaveLength(1);
  });

  // ── The count ───────────────────────────────────────────────────────────────────────────────

  it('counts under the SAME predicate as the page read', async () => {
    const { tx, client } = getTx();
    await seedDirectoryMember(tx, PARIWAR_A);
    await seedDirectoryMember(tx, PARIWAR_A);
    const suspended = await seedDirectoryMember(tx, PARIWAR_A);
    await seedModeration(tx, suspended, 'suspend', new Date('2026-06-01T00:00:00Z'));
    await seedDirectoryMember(tx, PARIWAR_A, { state: 'withdrawn' });
    await seedDirectoryMember(tx, PARIWAR_A, { withKyc: false });

    await enterAppScope(client, PARIWAR_A);
    const total = await countPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A));
    const listed = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 });
    // The two agree BY CONSTRUCTION (one shared predicate) — asserting it is what keeps them so.
    expect(total).toBe(listed.length);
    expect(typeof total).toBe('number');
  });

  // ── Cross-tenant RLS ────────────────────────────────────────────────────────────────────────

  it('cross-tenant RLS: a PARIWAR_B member is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const a = await seedDirectoryMember(tx, PARIWAR_A);
    const b = await seedDirectoryMember(tx, PARIWAR_B);

    await enterAppScope(client, PARIWAR_A);
    const ids = (await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 })).map(
      (r) => r.memberId as string,
    );
    expect(ids).toContain(a);
    expect(ids).not.toContain(b);
    // And the explicit predicate holds even when asked for the OTHER tenant under this scope.
    expect(await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_B), { limit: 50 })).toEqual([]);
  });
});

describe.skipIf(!hasDatabase)('directory read is transport-free (:5433)', () => {
  setupLiveDb();

  it('returns the name as CIPHERTEXT — the accessor never decrypts', async () => {
    const { tx, client } = getTx();
    const mid = await seedDirectoryMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    const rows = await listPublicDirectoryMembers(tx, toPariwarId(PARIWAR_A), { limit: 50 });
    const row = rows.find((r) => (r.memberId as string) === mid);
    expect(row?.nameCiphertext.startsWith('enc:')).toBe(true);
    // ⛔ No decrypted `name` key exists on the returned shape at all — the boundary owns that.
    expect(Object.keys(row ?? {}).sort()).toEqual(
      ['district', 'memberId', 'nameCiphertext', 'state'].sort(),
    );
  });
});
