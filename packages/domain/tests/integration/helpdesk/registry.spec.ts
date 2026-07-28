// Helpdesk routing-policy registry — live-DB integration (Story 10.1, Task 7; AC2/AC3).
//
// Covers: default-in-force when a Pariwar has no override; per-Pariwar override versioning (starts at
// 2, past the code default's version 1); the superseded_by_version forward-pointer + immutability of the
// prior policy_document; non-retroactivity (in-force resolution by instant); and replay by version.
// Live DB only. Own-committing writers accumulate rows → assert membership/shape, not global counts.

import { describe, expect, it } from 'vitest';

import {
  RoutingPolicyDocumentInvalidError,
  RoutingPolicyEffectiveAtOutOfOrderError,
  RoutingPolicySelfScopeUnsupportedError,
} from '../../../src/helpdesk/errors.js';
import {
  DEFAULT_ROUTING_POLICY_VERSION,
  createRoutingPolicyVersion,
  routingPolicyDocumentForVersion,
  routingPolicyVersionInForce,
} from '../../../src/helpdesk/registry.js';
import type { RoutingRuleJson } from '../../../src/schema/helpdesk_routing_policy_versions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const rule = (role: string, days: number): RoutingRuleJson => ({
  category: 'other',
  sub_category: null,
  target_role: role,
  target_scope_dimension: 'pariwar',
  sla_first_response_hours: 24,
  sla_resolution_business_days: days,
});

describe.skipIf(!hasDatabase)('helpdesk routing-policy registry (AC2/AC3)', () => {
  setupLiveDb();

  it('a Pariwar with NO override resolves to the code default (version 1)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const inForce = await routingPolicyVersionInForce(tx, PARIWAR_A, new Date('2026-08-10T00:00:00Z'));
    expect(inForce.isDefault).toBe(true);
    expect(inForce.version).toBe(DEFAULT_ROUTING_POLICY_VERSION);
    expect(inForce.document.rules.some((r) => r.category === 'niyamavali-question' && r.sla_resolution_business_days === 10)).toBe(true);
  });

  it("a Pariwar's first override is version 2 (past the default's version 1)", async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await createRoutingPolicyVersion(tx, {
      pariwarId: PARIWAR_A,
      rules: [rule('pariwar_admin', 7)],
      effectiveAt: new Date('2026-08-01T00:00:00Z'),
    });
    expect(row.version).toBe(2);
    expect(row.policyDocument.version).toBe(2);
    expect(row.supersededByVersion).toBeNull();
  });

  it('a second override is version 3 and points the prior (v2) forward; the prior document is UNCHANGED', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const v2 = await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('pariwar_admin', 7)], effectiveAt: new Date('2026-08-01T00:00:00Z') });
    expect(v2.version).toBe(2);
    const v3 = await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('helpline_operator', 4)], effectiveAt: new Date('2026-08-05T00:00:00Z') });
    expect(v3.version).toBe(3);

    // v2's forward-pointer now set; its policy_document is byte-unchanged (immutability by construction).
    const v2Doc = await routingPolicyDocumentForVersion(tx, PARIWAR_A, 2);
    expect(v2Doc).not.toBeNull();
    expect(v2Doc!.rules[0]!.target_role).toBe('pariwar_admin');
    expect(v2Doc!.rules[0]!.sla_resolution_business_days).toBe(7);
  });

  it('non-retroactivity: in-force resolves by INSTANT — an instant before v2 still gets the default', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('pariwar_admin', 7)], effectiveAt: new Date('2026-08-01T00:00:00Z') });

    // An instant BEFORE the override's effective_at → the code default (a ticket created then keeps v1).
    const before = await routingPolicyVersionInForce(tx, PARIWAR_A, new Date('2026-07-15T00:00:00Z'));
    expect(before.isDefault).toBe(true);
    expect(before.version).toBe(DEFAULT_ROUTING_POLICY_VERSION);

    // An instant AFTER → the override.
    const after = await routingPolicyVersionInForce(tx, PARIWAR_A, new Date('2026-08-10T00:00:00Z'));
    expect(after.isDefault).toBe(false);
    expect(after.version).toBe(2);
    expect(after.document.rules[0]!.target_role).toBe('pariwar_admin');
  });

  it('replay: version 1 is ALWAYS the code default; an absent override version resolves to null', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const v1 = await routingPolicyDocumentForVersion(tx, PARIWAR_A, DEFAULT_ROUTING_POLICY_VERSION);
    expect(v1).not.toBeNull();
    expect(v1!.version).toBe(1);
    const missing = await routingPolicyDocumentForVersion(tx, PARIWAR_A, 999);
    expect(missing).toBeNull();
  });

  it('a second tenant (PARIWAR_B) starts its OWN version sequence at 2 and cannot see PARIWAR_A\'s override — RLS tenant isolation + per-pariwar version scoping', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('pariwar_admin', 7)], effectiveAt: new Date('2026-08-01T00:00:00Z') });

    // Switch scope to PARIWAR_B — its version sequence is independent (starts at 2, not 3).
    await enterAppScope(client, PARIWAR_B);
    const bRow = await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_B, rules: [rule('helpline_operator', 9)], effectiveAt: new Date('2026-08-01T00:00:00Z') });
    expect(bRow.version).toBe(2);

    // Under PARIWAR_B's scope, PARIWAR_A's override is invisible (RLS) — resolves to the default.
    const bInForce = await routingPolicyVersionInForce(tx, PARIWAR_A, new Date('2026-08-10T00:00:00Z'));
    expect(bInForce.isDefault).toBe(true);
  });

  it('createRoutingPolicyVersion rejects an invalid rules document (RoutingPolicyDocumentInvalidError) — empty rules, bad category, bad dimension, non-positive SLA, missing catch-all', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await expect(createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [] })).rejects.toThrow(
      RoutingPolicyDocumentInvalidError,
    );
    await expect(
      createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [{ ...rule('pariwar_admin', 5), category: 'not-a-real-category' as never }] }),
    ).rejects.toThrow(RoutingPolicyDocumentInvalidError);
    await expect(
      createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [{ ...rule('pariwar_admin', 5), target_scope_dimension: 'bogus' }] }),
    ).rejects.toThrow(RoutingPolicyDocumentInvalidError);
    await expect(
      createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [{ ...rule('pariwar_admin', 5), sla_first_response_hours: 0 }] }),
    ).rejects.toThrow(RoutingPolicyDocumentInvalidError);
    await expect(
      createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [{ ...rule('pariwar_admin', 5), category: 'kyc-trouble' }] }),
    ).rejects.toThrow(RoutingPolicyDocumentInvalidError); // no 'other'/null catch-all present.
  });

  it('createRoutingPolicyVersion rejects a `self`-dimension rule (RoutingPolicySelfScopeUnsupportedError)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [{ ...rule('helpline_operator', 5), target_scope_dimension: 'self' }] }),
    ).rejects.toThrow(RoutingPolicySelfScopeUnsupportedError);
  });

  it('createRoutingPolicyVersion rejects a publish whose effectiveAt precedes the Pariwar\'s latest existing version (RoutingPolicyEffectiveAtOutOfOrderError)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('pariwar_admin', 7)], effectiveAt: new Date('2026-08-05T00:00:00Z') });
    await expect(
      createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('helpline_operator', 4)], effectiveAt: new Date('2026-08-01T00:00:00Z') }),
    ).rejects.toThrow(RoutingPolicyEffectiveAtOutOfOrderError);
  });

  it('two versions published with the IDENTICAL effectiveAt resolve in-force to the HIGHER version (desc(effectiveAt), desc(version) tie-break)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const sameInstant = new Date('2026-08-01T00:00:00Z');
    await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('pariwar_admin', 7)], effectiveAt: sameInstant });
    const v3 = await createRoutingPolicyVersion(tx, { pariwarId: PARIWAR_A, rules: [rule('helpline_operator', 4)], effectiveAt: sameInstant });
    expect(v3.version).toBe(3);

    const inForce = await routingPolicyVersionInForce(tx, PARIWAR_A, sameInstant);
    expect(inForce.version).toBe(3);
    expect(inForce.document.rules[0]!.target_role).toBe('helpline_operator');
  });
});
