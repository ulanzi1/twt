// The emergency attesting panel's eligibility predicate — DB-free unit suite (Story 10.13, Task 4; AC3).
//
// `assertFixedAmountPanelAuthorized` takes a raw `pg.PoolClient` and does exactly one query, so a
// hand-rolled fake client exercises the WHOLE predicate DB-free: the grant fold, the pure
// `hasPermission` call, the fail-closed-on-FIRST-member ordering, and the cross-tenant case. The live
// wiring (RLS actually hiding a cross-tenant grant, and no rows written on refusal) is pinned by the
// integration spec — these two suites prove different halves and neither substitutes for the other.

import { describe, expect, it } from 'vitest';
import type pg from 'pg';

import { pariwarId as toPariwarId } from '../../src/ids/index.js';
import {
  POOL_FIXED_AMOUNT_EMERGENCY_PERMISSION_KEY,
  PoolFixedAmountPanelMemberUnauthorizedError,
  assertFixedAmountPanelAuthorized,
} from '../../src/pool/index.js';

const PARIWAR = toPariwarId('11111111-1111-4111-8111-111111111111');
const OTHER_PARIWAR = '22222222-2222-4222-8222-222222222222';

interface GrantRow {
  user_id: string;
  pariwar_id: string;
  role: string;
  scope_dimension: 'global' | 'pariwar' | 'state' | 'district' | 'block' | 'self';
  scope_value: string | null;
}

/**
 * A fake `pg.PoolClient` returning a fixed grant set, capturing the query it was asked.
 * ⚠ `rlsScopedTo` models what the SCOPED client actually returns: `role_grants` is an RLS-scoped table
 * (policies/role-grants-rls.ts) and every caller is inside a scope tx, so a grant belonging to another
 * Pariwar is INVISIBLE — not merely ignored downstream. Modelling that faithfully is the whole point of
 * the cross-tenant test; a fake that returned cross-tenant rows would test a situation that cannot occur.
 */
function fakeClient(
  rows: readonly GrantRow[],
  rlsScopedTo: string | null,
): { client: pg.PoolClient; calls: { text: string; values: unknown[] }[] } {
  const calls: { text: string; values: unknown[] }[] = [];
  const visible = rlsScopedTo === null ? rows : rows.filter((r) => r.pariwar_id === rlsScopedTo);
  const client = {
    query: (text: string, values: unknown[]) => {
      calls.push({ text, values });
      const wanted = new Set((values[0] as string[]) ?? []);
      return Promise.resolve({ rows: visible.filter((r) => wanted.has(r.user_id)) });
    },
  } as unknown as pg.PoolClient;
  return { client, calls };
}

const panelAdmin = (userId: string, pariwar = PARIWAR as string): GrantRow => ({
  user_id: userId,
  pariwar_id: pariwar,
  role: 'trustee_panel',
  scope_dimension: 'pariwar',
  scope_value: pariwar,
});

const pariwarAdmin = (userId: string, pariwar = PARIWAR as string): GrantRow => ({
  user_id: userId,
  pariwar_id: pariwar,
  role: 'pariwar_admin',
  scope_dimension: 'pariwar',
  scope_value: pariwar,
});

describe('assertFixedAmountPanelAuthorized — the AC3 eligibility predicate', () => {
  it('accepts a panel whose every member holds the emergency key at this Pariwar', async () => {
    const { client } = fakeClient([panelAdmin('a'), pariwarAdmin('b')], PARIWAR);
    await expect(
      assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b']),
    ).resolves.toBeUndefined();
  });

  it('accepts BOTH holder roles — the grant is concurrent, not exclusive (Decision 2026-08-16-123 cl.1)', async () => {
    // Regression guard on the ruling itself: if a later story made either key exclusive to one bundle,
    // one of these two panels would start failing and the concurrency ruling would have been undone
    // silently. Asserting both is what makes that observable here rather than in production.
    for (const rows of [[panelAdmin('a'), panelAdmin('b')], [pariwarAdmin('a'), pariwarAdmin('b')]]) {
      const { client } = fakeClient(rows, PARIWAR);
      await expect(
        assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b']),
      ).resolves.toBeUndefined();
    }
  });

  it('accepts a panel that includes the SUBMITTING actor themselves (Q2.1(c) offered, not taken)', async () => {
    // Review Findings, patch 3 — the module's own comments state this is deliberately allowed
    // (Decision `2026-08-16-123` clause 3: no submitter-distinctness check was ruled in), but nothing
    // pinned it against a future "fix". The submitting actor is just another eligible attestor to this
    // predicate — it has no notion of "who submitted", only "who is in the roster".
    const { client } = fakeClient([panelAdmin('submitter'), pariwarAdmin('b')], PARIWAR);
    await expect(
      assertFixedAmountPanelAuthorized(client, PARIWAR, ['submitter', 'b']),
    ).resolves.toBeUndefined();
  });

  it('REFUSES a member holding no grant at all', async () => {
    const { client } = fakeClient([panelAdmin('a')], PARIWAR);
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'nobody'])).rejects.toBeInstanceOf(
      PoolFixedAmountPanelMemberUnauthorizedError,
    );
  });

  it('REFUSES a member whose role does not carry the emergency key', async () => {
    // `verifier` is a real seeded role and deliberately holds neither fixed-amount key.
    const { client } = fakeClient(
      [panelAdmin('a'), { ...pariwarAdmin('b'), role: 'verifier', scope_dimension: 'district', scope_value: 'D1' }],
      PARIWAR,
    );
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b'])).rejects.toBeInstanceOf(
      PoolFixedAmountPanelMemberUnauthorizedError,
    );
  });

  it('⭐ REFUSES a CROSS-TENANT holder — the case the pre-10.13 code let through', async () => {
    // THE point of this story. Before 10.13 the only identity check was
    // `SELECT display_name FROM users WHERE id = $1` on the UNSCOPED pool against a GLOBAL table, so an
    // admin of ANOTHER Pariwar with a display name sailed onto this Pariwar's IMMUTABLE attestation
    // record. Here 'b' holds a FULL pariwar_admin grant — but in OTHER_PARIWAR.
    // ⚠ A same-tenant-only test would pass against the broken behaviour too; this one cannot.
    const { client } = fakeClient([panelAdmin('a'), pariwarAdmin('b', OTHER_PARIWAR)], PARIWAR);
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b'])).rejects.toBeInstanceOf(
      PoolFixedAmountPanelMemberUnauthorizedError,
    );
  });

  it('REFUSES a cross-tenant holder even if RLS did NOT hide the row (defence in depth)', async () => {
    // Belt-and-braces: `rlsScopedTo: null` makes the fake return the cross-tenant grant anyway. The pure
    // predicate must STILL refuse, because `hasPermission` skips a non-global grant whose pariwarId is
    // not the resource's. ⇒ the refusal does not depend on RLS having done its job.
    const { client } = fakeClient([panelAdmin('a'), pariwarAdmin('b', OTHER_PARIWAR)], null);
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b'])).rejects.toBeInstanceOf(
      PoolFixedAmountPanelMemberUnauthorizedError,
    );
  });

  it('REFUSES a holder whose scopeCeiling cannot satisfy a pariwar-dimension check (INERT ON ARRIVAL)', async () => {
    // `state_trustee` has scopeCeiling 'state'. Even handed the key by a hypothetical bundle edit, a
    // state-ceiling grant can never satisfy a `pariwar`-dimension check — rank order, not a missing
    // resolver. This pins WHY the ruling refused to grant to state_trustee/district_admin: the grant
    // would have been inert, and the surface would have offered a trustee the system can never accept.
    const { client } = fakeClient(
      [panelAdmin('a'), { user_id: 'b', pariwar_id: PARIWAR, role: 'state_trustee', scope_dimension: 'state', scope_value: 'BR' }],
      PARIWAR,
    );
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b'])).rejects.toBeInstanceOf(
      PoolFixedAmountPanelMemberUnauthorizedError,
    );
  });

  it('fail-closes on the FIRST ineligible member, naming that actor', async () => {
    // Ordering matters for the audit line: the reason recorded must be the FIRST refusal, in roster
    // order, not whichever the grant query happened to return last.
    const { client } = fakeClient([panelAdmin('c')], PARIWAR);
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b', 'c'])).rejects.toMatchObject({
      name: 'PoolFixedAmountPanelMemberUnauthorizedError',
      actorId: 'a',
      code: 'pool.fixed_amount_panel_member_unauthorized',
    });
  });

  it('queries role_grants ONCE, for exactly the submitted actor ids (no N+1, no widening)', async () => {
    const { client, calls } = fakeClient([panelAdmin('a'), panelAdmin('b')], PARIWAR);
    await assertFixedAmountPanelAuthorized(client, PARIWAR, ['a', 'b']);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toContain('FROM role_grants');
    // Review Findings, patch 2 — an explicit `pariwar_id` predicate now rides alongside the actor-id
    // array (belt-and-braces on top of RLS, matching `resolveEligibleFixedAmountAttestors`'s posture).
    expect(calls[0]!.text).toContain('pariwar_id = $2');
    expect(calls[0]!.values).toEqual([['a', 'b'], PARIWAR]);
  });

  it('an EMPTY roster is not this guard’s refusal — the arithmetic guards own it', async () => {
    // Eligibility is an ADDITIONAL predicate, never a replacement: an empty panel is
    // PoolFixedAmountAttestationRequiredError from applyEmergencyOverride, and this check must not
    // pre-empt it with a different (and wrong) error, nor issue a pointless query.
    const { client, calls } = fakeClient([], PARIWAR);
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR, [])).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('the credential key is the one the route gates on', () => {
    expect(POOL_FIXED_AMOUNT_EMERGENCY_PERMISSION_KEY).toBe('pool.fixed_amount_emergency');
  });
});
