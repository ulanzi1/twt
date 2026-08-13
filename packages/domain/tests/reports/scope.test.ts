// Reports actor-scope resolution — the scope-as-predicate input (Story 10.7, AC3).

import { describe, expect, it } from 'vitest';

import type { EffectiveGrant } from '../../src/rbac/check.js';
import { resolveActorReportScope } from '../../src/reports/index.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const OTHER_PARIWAR = '22222222-2222-2222-2222-222222222222';

const districtAdminGrant = (pariwarId: string, district: string): EffectiveGrant => ({
  pariwarId,
  role: 'district_admin',
  scopeDimension: 'district',
  scopeValue: district,
});
const pariwarAdminGrant = (pariwarId: string): EffectiveGrant => ({
  pariwarId,
  role: 'pariwar_admin',
  scopeDimension: 'pariwar',
  scopeValue: pariwarId,
});

describe('resolveActorReportScope', () => {
  it('resolves a district_admin to their own district (the roster narrows WHERE district = value)', () => {
    const scope = resolveActorReportScope(
      [districtAdminGrant(PARIWAR, 'Patna')],
      'member.export_roster',
      PARIWAR,
    );
    expect(scope).toEqual({ dimension: 'district', values: ['Patna'] });
  });

  it('resolves a pariwar_admin to pariwar scope (sees the whole tenant — no district narrowing)', () => {
    const scope = resolveActorReportScope(
      [pariwarAdminGrant(PARIWAR)],
      'member.export_roster',
      PARIWAR,
    );
    expect(scope).toEqual({ dimension: 'pariwar', values: [PARIWAR] });
  });

  it('returns null when the actor holds the key at NO scope (fail-closed → 403 upstream)', () => {
    // A district_admin does NOT hold audit.export → no scope resolves.
    expect(
      resolveActorReportScope([districtAdminGrant(PARIWAR, 'Patna')], 'audit.export', PARIWAR),
    ).toBeNull();
    // No grants at all.
    expect(resolveActorReportScope([], 'member.export_roster', PARIWAR)).toBeNull();
  });

  it('ignores a grant from ANOTHER Pariwar (cross-scope inheritance forbidden)', () => {
    expect(
      resolveActorReportScope(
        [districtAdminGrant(OTHER_PARIWAR, 'Patna')],
        'member.export_roster',
        PARIWAR,
      ),
    ).toBeNull();
  });

  it('picks the BROADEST authorized scope when an actor holds several grants', () => {
    const scope = resolveActorReportScope(
      [districtAdminGrant(PARIWAR, 'Patna'), pariwarAdminGrant(PARIWAR)],
      'member.export_roster',
      PARIWAR,
    );
    // pariwar is broader than district → the actor sees the whole tenant.
    expect(scope).toEqual({ dimension: 'pariwar', values: [PARIWAR] });
  });

  // ── Story 10.28 (AC1, AC5) — MULTI-NODE SCOPE ────────────────────────────────────────────────
  //
  // ⭐ THE HEADLINE. Before 10.28 a strict-`<` tie-break kept whichever same-dimension grant the
  // `grants` array iterated FIRST, so this actor exported ONE district and the rest vanished with no
  // error, no warning and no partial-export signal.
  it('AC1: carries EVERY district an actor holds the key at — not the first-iterated one', () => {
    const scope = resolveActorReportScope(
      [districtAdminGrant(PARIWAR, 'Patna'), districtAdminGrant(PARIWAR, 'Gaya')],
      'member.export_roster',
      PARIWAR,
    );
    expect(scope).toEqual({ dimension: 'district', values: ['Gaya', 'Patna'] });
  });

  it('AC1: the accumulated set is SORTED at the producer, so iteration order cannot change it', () => {
    const forward = resolveActorReportScope(
      [
        districtAdminGrant(PARIWAR, 'Patna'),
        districtAdminGrant(PARIWAR, 'Gaya'),
        districtAdminGrant(PARIWAR, 'Arrah'),
      ],
      'member.export_roster',
      PARIWAR,
    );
    const reversed = resolveActorReportScope(
      [
        districtAdminGrant(PARIWAR, 'Arrah'),
        districtAdminGrant(PARIWAR, 'Gaya'),
        districtAdminGrant(PARIWAR, 'Patna'),
      ],
      'member.export_roster',
      PARIWAR,
    );
    // Determinism is what makes the SQL `IN` list, these tests and D4's audit attribution stable.
    expect(forward).toEqual({ dimension: 'district', values: ['Arrah', 'Gaya', 'Patna'] });
    expect(forward).toEqual(reversed);
  });

  // ⭐ D7 — the de-dup pin, and it is REACHABLE, not hypothetical: two roles at ONE district is an
  // ordinary grant shape today. AC5's "must not double-count" is pinned by a test that can actually
  // fail — unlike an ancestry-based double-count test, which under D3 could never run at all.
  it('AC5/D7: two grants at the SAME district collapse to ONE entry (no double-counting)', () => {
    const scope = resolveActorReportScope(
      [
        districtAdminGrant(PARIWAR, 'Patna'),
        // A SECOND key-bearing role at the SAME node — reachable today, no ancestry involved.
        { pariwarId: PARIWAR, role: 'pariwar_admin', scopeDimension: 'district', scopeValue: 'Patna' },
      ],
      'member.export_roster',
      PARIWAR,
    );
    expect(scope).toEqual({ dimension: 'district', values: ['Patna'] });
    expect(scope?.values.filter((v) => v === 'Patna')).toHaveLength(1);
  });

  // ⭐ D1(i) — the invariant, asserted in BOTH directions. `global` is the one dimension whose
  // canonical target value is null (`rbac/scope.ts:236`), so it is the one dimension carrying the
  // empty set; every other dimension that resolves at all carries at least one node.
  it('AC1/D1(i): dimension === "global" ⇔ values.length === 0', () => {
    const globalScope = resolveActorReportScope(
      [{ pariwarId: PARIWAR, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
      'member.export_roster',
      PARIWAR,
    );
    expect(globalScope).toEqual({ dimension: 'global', values: [] });

    // ⇐ the other direction: a non-global scope NEVER resolves to an empty set. An actor with no
    // qualifying grant resolves to `null` (fail-closed), never to an empty-set scope.
    for (const grants of [
      [districtAdminGrant(PARIWAR, 'Patna')],
      [pariwarAdminGrant(PARIWAR)],
      [districtAdminGrant(PARIWAR, 'Patna'), districtAdminGrant(PARIWAR, 'Gaya')],
    ]) {
      const scope = resolveActorReportScope(grants, 'member.export_roster', PARIWAR);
      expect(scope).not.toBeNull();
      expect(scope!.dimension).not.toBe('global');
      expect(scope!.values.length).toBeGreaterThan(0);
    }
  });

  // A narrower grant must never dilute a broader win — the reset-on-broader arm of the accumulator.
  it('AC1: a broader dimension DISCARDS the narrower set, whichever order they arrive in', () => {
    const districtFirst = resolveActorReportScope(
      [
        districtAdminGrant(PARIWAR, 'Patna'),
        districtAdminGrant(PARIWAR, 'Gaya'),
        pariwarAdminGrant(PARIWAR),
      ],
      'member.export_roster',
      PARIWAR,
    );
    const pariwarFirst = resolveActorReportScope(
      [
        pariwarAdminGrant(PARIWAR),
        districtAdminGrant(PARIWAR, 'Patna'),
        districtAdminGrant(PARIWAR, 'Gaya'),
      ],
      'member.export_roster',
      PARIWAR,
    );
    expect(districtFirst).toEqual({ dimension: 'pariwar', values: [PARIWAR] });
    expect(pariwarFirst).toEqual({ dimension: 'pariwar', values: [PARIWAR] });
  });
});
