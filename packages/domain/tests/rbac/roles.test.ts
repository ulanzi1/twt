// Seeded-role-bundle unit tests — Story 1.8 (AC-3, Task 7.1c + 7.1d).
//
// (c) referential integrity — every role's permission keys ∈ PERMISSION_CATALOG.
// (d) seed idempotency — seedRoles() re-applied is deterministic / a no-op.

import { describe, expect, it } from 'vitest';

import {
  DEPRECATED_KEY_SUCCESSOR,
  PERMISSION_CATALOG,
  SEED_PERMISSION_KEYS,
  isCatalogKey,
  isDeprecatedKey,
} from '../../src/rbac/permissions.js';
import {
  bundleForRole,
  defaultRoleBundles,
  seedRoles,
  type SeededRole,
} from '../../src/rbac/roles.js';
import { SCOPE_DIMENSIONS } from '../../src/rbac/scope.js';

const SEEDED_ROLES: SeededRole[] = [
  'super_admin',
  'pariwar_admin',
  'state_trustee',
  'district_admin',
  'block_admin',
  'finance_officer',
  'it_cell',
  'media_comms',
  'field_worker',
  'verifier',
  'auditor',
  'helpline_operator',
  // Story 10.18 — the 13th seeded role. Renamed from TWELVE_ROLES to SEEDED_ROLES so the
  // next role addition does not have to rename it again.
  'trustee_panel',
];

describe('defaultRoleBundles — the seeded roles (FR-46)', () => {
  it('defines exactly the 13 named roles', () => {
    expect(defaultRoleBundles).toHaveLength(13);
    expect(defaultRoleBundles.map((b) => b.role).sort()).toEqual([...SEEDED_ROLES].sort());
  });

  it('every scopeCeiling is a canonical scope dimension', () => {
    for (const bundle of defaultRoleBundles) {
      expect(SCOPE_DIMENSIONS).toContain(bundle.scopeCeiling);
    }
  });

  it('REFERENTIAL INTEGRITY: every permission key in every bundle ∈ PERMISSION_CATALOG', () => {
    for (const bundle of defaultRoleBundles) {
      for (const key of bundle.permissions) {
        expect(isCatalogKey(key)).toBe(true);
      }
    }
  });

  it('Super Admin is the only global role and carries the FULL catalog', () => {
    const globalRoles = defaultRoleBundles.filter((b) => b.scopeCeiling === 'global');
    expect(globalRoles.map((b) => b.role)).toEqual(['super_admin']);
    expect([...globalRoles[0]!.permissions].sort()).toEqual(
      [...PERMISSION_CATALOG.keys].sort(),
    );
  });

  it('Field Worker scope is self (FR-53 field_worker_self) — proves the enum needs self', () => {
    expect(bundleForRole('field_worker')?.scopeCeiling).toBe('self');
  });

  it('Block Admin exists at block scope — proves the enum needs block', () => {
    expect(bundleForRole('block_admin')?.scopeCeiling).toBe('block');
  });

  it('sparse/empty bundles are allowed (media_comms, field_worker)', () => {
    // helpline_operator gained member.view_validity at Story 4.6; finance_officer gained
    // reconciliation.review at Story 9.8 (the FR-50 "designated reconciliation reviewer"); the
    // remaining two keep empty bundles at v1.
    for (const role of ['media_comms', 'field_worker'] as const) {
      expect(bundleForRole(role)?.permissions).toEqual([]);
    }
  });

  it('finance_officer carries the Story 9.8 reconciliation review key at pariwar ceiling (FR-50)', () => {
    const bundle = bundleForRole('finance_officer');
    expect(bundle?.permissions.map((p) => String(p))).toContain('reconciliation.review');
    expect(bundle?.scopeCeiling).toBe('pariwar');
  });

  it('bundleForRole returns undefined for an unknown role (fail-closed at the lookup)', () => {
    expect(bundleForRole('nonexistent_role')).toBeUndefined();
  });

  it('Story 4.6 — member.view_validity is granted to exactly the read-capable FR-46 roles', () => {
    const KEY = 'member.view_validity';
    // The read-capable set (D5): admin surfaces + verifier/auditor/helpline + super_admin (full catalog).
    const readCapable = [
      'super_admin',
      'pariwar_admin',
      'state_trustee',
      'district_admin',
      'block_admin',
      'verifier',
      'auditor',
      'helpline_operator',
    ].sort();
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(readCapable);
    // The non-read roles (finance_officer, it_cell, media_comms, field_worker) do NOT hold it.
    for (const role of ['finance_officer', 'it_cell', 'media_comms', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 10.21 — member.data_rights is granted ONLY to pariwar_admin (+ super_admin auto-derived)', () => {
    const KEY = 'member.data_rights';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // `super_admin` is NEVER written into a grant list — its bundle IS `PERMISSION_CATALOG.keys`, so it
    // auto-derives. Assert what the resolver returns, not what roles.ts spells out.
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // ⛔ helpline_operator FILES a data-rights request (helpdesk.create) but does NOT execute it — the
    // AC3 intake/fulfilment separation. district_admin and state_trustee are rank-order blocked in
    // OPPOSITE directions against this key's `pariwar` dimension (scope.ts §RANK-ORDER), and neither
    // exclusion is an oversight.
    // ⭐ trustee_panel is excluded BY RULING, not merely pending one. Decision `2026-08-14-109`
    // clause 7 (Escalation 10 / consent-sheet Row 7) ruled that **NO DPDPA action inherently requires
    // Trustee Panel authority**, and clause 8 that where Trustee authority applies for some other
    // governance reason, the **Trustee decides and an authorised administrator executes** — authority
    // attaches to the DECISION, never the EXECUTION. `pariwar_admin` is that administrator.
    // ⚠ The exclusion is therefore SETTLED, not provisional. It remains non-structural: trustee_panel
    // sits at a `pariwar` ceiling and COULD satisfy this check — it simply must not hold this key.
    // ⛔ If this assertion fails because trustee_panel was added, that grant CONTRADICTS a ratified
    // ruling. Do not "fix" the test; revert the grant, or supersede `2026-08-14-109` clause 7 first.
    for (const role of ['helpline_operator', 'district_admin', 'state_trustee', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 4.8 code review — validity.invalidate_cache is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'validity.invalidate_cache';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // Every OTHER read-capable role (incl. state_trustee, district_admin, block_admin, verifier,
    // auditor, helpline_operator) may still read validity but may NOT force a tenant-wide invalidation.
    // state_trustee in particular COULD NOT hold it even if granted: its `state` scopeCeiling is
    // structurally narrower than the `pariwar`-dimension check this action requires.
    for (const role of [
      'state_trustee',
      'district_admin',
      'block_admin',
      'verifier',
      'auditor',
      'helpline_operator',
      'trustee_panel',
    ] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 10.3 — helpdesk.create is granted to helpline_operator + pariwar_admin (+ super_admin); district_admin DEFERRED', () => {
    const KEY = 'helpdesk.create';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // helpline_operator (the SM-1 C3 actor) + pariwar_admin (both `pariwar` ceiling) + super_admin (full catalog).
    expect(holders).toEqual(['helpline_operator', 'pariwar_admin', 'super_admin']);
    // district_admin is DELIBERATELY NOT granted: helpdesk.create is a pariwar-dimension key, and a
    // `district`-ceiling grant can never satisfy a pariwar check (the state_trustee-at-pariwar asymmetry) —
    // seeding it would be an inert/false capability. The check.test.ts scope proof pins WHY it can't work.
    for (const role of ['district_admin', 'state_trustee', 'block_admin', 'verifier', 'auditor', 'finance_officer', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 10.4 — helpdesk.respond is granted to the default-policy target roles (+ super_admin); district_admin DEFERRED', () => {
    const KEY = 'helpdesk.respond';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The four DEFAULT_ROUTING_POLICY target roles (all `pariwar` ceiling) + super_admin (full catalog).
    expect(holders).toEqual(['finance_officer', 'helpline_operator', 'it_cell', 'pariwar_admin', 'super_admin']);
    // district_admin is DELIBERATELY NOT granted — same pariwar-dimension asymmetry as helpdesk.create
    // (a `district`-ceiling grant can never satisfy a pariwar check). check.test.ts pins WHY.
    for (const role of ['district_admin', 'state_trustee', 'block_admin', 'verifier', 'auditor', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 11b.13 — pariwar.manage_drive_target is granted to pariwar_admin (+ super_admin auto)', () => {
    const KEY = 'pariwar.manage_drive_target';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // `2026-09-04-190` cl.7(a) (Trustee Panel) names the Pariwar Admin as the setter; super_admin
    // auto-derives from PERMISSION_CATALOG.keys.
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // ⛔ district_admin / state_trustee are INERT in both directions on a pariwar-dimension key
    // ([[project_rbac_geo_scope_containment]]); no other role holds it.
    for (const role of ['district_admin', 'state_trustee', 'block_admin', 'verifier', 'auditor', 'finance_officer', 'it_cell', 'helpline_operator', 'media_comms', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 11b.13 — pariwar.manage_drive_target_visibility is super_admin ONLY, and pariwar_admin does NOT hold it', () => {
    const VISIBILITY_KEY = 'pariwar.manage_drive_target_visibility';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(VISIBILITY_KEY))
      .map((b) => b.role)
      .sort();
    // ⭐⭐ THE REGRESSION THIS TEST EXISTS TO PREVENT: the WRITE key quietly carrying the REVEAL.
    // `2026-09-04-190` cl.7(c) reserves the disclosure act to the Trust, and D1 (Decision
    // `2026-09-06-203`) made that split STRUCTURAL — two catalog keys, not one key plus a role check
    // inside a route handler. ⛔ `pariwar_admin` holds the setter and must NEVER hold this.
    expect(holders).toEqual(['super_admin']);
    expect((bundleForRole('pariwar_admin')?.permissions as readonly string[]).includes(VISIBILITY_KEY)).toBe(false);
    // ⭐ AND super_admin holds it WITHOUT a bundle edit — `roles.ts` never names this key. Its
    // bundle IS `PERMISSION_CATALOG.keys`, so a super_admin-only key appears in the catalog and
    // never in a hand-written list (the manage_nominee_bank_masking /
    // manage_public_name_presentation precedent, neither of which appears in roles.ts either).
    expect((bundleForRole('super_admin')?.permissions as readonly string[]).includes(VISIBILITY_KEY)).toBe(true);
    for (const role of ['pariwar_admin', 'district_admin', 'state_trustee', 'block_admin', 'verifier', 'auditor', 'finance_officer', 'it_cell', 'helpline_operator', 'media_comms', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(VISIBILITY_KEY)).toBe(false);
    }
    // ⭐ The two keys are DISTINCT holders sets — the whole point of minting two.
    expect((bundleForRole('pariwar_admin')?.permissions as readonly string[]).includes('pariwar.manage_drive_target')).toBe(true);
  });

  it('Story 10.5 — news.manage is granted ONLY to pariwar_admin (+ super_admin); media_comms + district_admin NOT granted', () => {
    const KEY = 'news.manage';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // PO-confirmed 2026-07-30: pariwar_admin only (+ super_admin, full catalog). media_comms stays dormant.
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // media_comms is NOT granted in v1 (its bundle stays empty); district_admin is DEFERRED (a `district`-
    // ceiling grant can never satisfy the pariwar-dimension check — check.test.ts pins WHY).
    for (const role of ['media_comms', 'district_admin', 'state_trustee', 'block_admin', 'verifier', 'auditor', 'finance_officer', 'it_cell', 'helpline_operator', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 10.7 — member.export_roster is granted to district_admin + pariwar_admin (+ super_admin); NOT deferred', () => {
    const KEY = 'member.export_roster';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The FIRST truly district-capable read key that is NOT deferred: district_admin holds it at its
    // `district` ceiling (an exact-node self-district match needs no geo-tree), pariwar_admin at pariwar
    // (sees the whole tenant); super_admin auto-derives (full catalog).
    expect(holders).toEqual(['district_admin', 'pariwar_admin', 'super_admin']);
    // Distinct from member.view_validity — a roster EXPORT is its own read authority; roles that read a
    // single member's validity but should not export a roster do not inherit it.
    for (const role of ['state_trustee', 'block_admin', 'verifier', 'auditor', 'finance_officer', 'it_cell', 'helpline_operator', 'media_comms', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 10.8 — feature_flag.view is granted to pariwar_admin + auditor (+ super_admin); district_admin DEFERRED', () => {
    const KEY = 'feature_flag.view';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // prd.md:892 — "flag inventory is visible to Pariwar Admin role and above". auditor holds it because
    // a flag flip changes production behaviour: an auditor who cannot see which flags are live cannot
    // audit a flag-gated behaviour change.
    expect(holders).toEqual(['auditor', 'pariwar_admin', 'super_admin']);
    // district_admin DEFERRED: the gate is `dimension: 'pariwar'`, and a district-ceiling grant can never
    // satisfy a pariwar-dimension check — granting it would seed an INERT capability (the 10.3/10.4/10.5
    // asymmetry). Contrast 10.7's member.export_roster, which is district-DIMENSION and genuinely capable.
    for (const role of ['district_admin', 'block_admin', 'state_trustee', 'verifier', 'finance_officer', 'it_cell', 'helpline_operator', 'media_comms', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 10.8 — feature_flag.flip is NARROWER than .view: pariwar_admin only (+ super_admin), NOT auditor', () => {
    const KEY = 'feature_flag.flip';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // ⚠ THE ASYMMETRY IS THE PROPERTY (Decision 7). FR-58C makes inventory visibility deliberately
    // BROADER than flip authority — "no secret flags" is transparency, flipping is governance. A single
    // umbrella `feature_flag.manage` key would collapse the two and destroy exactly what FR-58C names.
    // So auditor MUST hold .view and MUST NOT hold .flip; if this ever equalises, the split has been lost.
    expect((bundleForRole('auditor')?.permissions as readonly string[]).includes('feature_flag.view')).toBe(true);
    expect((bundleForRole('auditor')?.permissions as readonly string[]).includes(KEY)).toBe(false);
    for (const role of ['district_admin', 'block_admin', 'state_trustee', 'verifier', 'finance_officer', 'it_cell', 'helpline_operator', 'media_comms', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 10.9 — banner.manage is granted ONLY to pariwar_admin (+ super_admin); district_admin DEFERRED', () => {
    const KEY = 'banner.manage';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The same holder set as news.manage: the tenant's content-authoring authority. ONE key — unlike
    // 10.8's flags there is no transparency property forcing the read broader than the write, so there
    // is deliberately no `banner.view` to hold separately.
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // district_admin DEFERRED: the gate is `dimension: 'pariwar'`, and a district-ceiling grant can never
    // satisfy a pariwar-dimension check — granting it would seed an INERT capability (the 10.3/10.4/10.5/
    // 10.8 asymmetry). check.test.ts pins WHY. state_trustee excluded for the mirror-image reason (its
    // 'state' ceiling is BROADER than 'pariwar', and containment is asymmetric in either direction).
    for (const role of ['district_admin', 'block_admin', 'state_trustee', 'verifier', 'auditor', 'finance_officer', 'it_cell', 'helpline_operator', 'media_comms', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 5.3 — pariwar.configure_channels is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'pariwar.configure_channels';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // A PARIWAR-WIDE config action — state_trustee's narrower `state` ceiling cannot satisfy it even if
    // granted (same rationale as validity.invalidate_cache).
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 5.8 — pariwar.declare_degraded_mode is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'pariwar.declare_degraded_mode';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // The AC's "trustees" resolves to pariwar_admin — state_trustee's `state` ceiling cannot hold a
    // `pariwar`-scoped grant (same rationale as pariwar.configure_channels / validity.invalidate_cache).
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 6.13 (D-B) — cycle.freeze is granted ONLY to pariwar_admin (+ super_admin), NOT state_trustee', () => {
    const KEY = 'cycle.freeze';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // The story's "State Trustee" actor DEFERS to Epic 3 — a `state`-ceiling grant cannot satisfy a
    // pariwar-dimension check pre-Epic-3 (the 6.7 block_admin / 6.10 state_trustee deferral precedent). v1
    // gates on pariwar_admin acting as Trustee-Lite; NO inert state_trustee grant is seeded.
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 6.14 (D-B) — claim.r9_vote is granted ONLY to pariwar_admin (+ super_admin), NOT state_trustee', () => {
    const KEY = 'claim.r9_vote';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // Same Trustee-Lite posture as cycle.freeze — direct state_trustee gating DEFERRED to the Epic-3 geo-tree
    // resolver; NO inert state_trustee grant is seeded.
    expect((bundleForRole('state_trustee')?.permissions as readonly string[]).includes(KEY)).toBe(false);
  });

  it('Story 6.3 — claim.file is granted ONLY to helpline_operator (+ super_admin)', () => {
    const KEY = 'claim.file';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['helpline_operator', 'super_admin']);
    // The intake/FILE key is distinct from the verifier/trustee APPROVE key: roles that may
    // APPROVE a claim (pariwar_admin, state_trustee, district_admin) do NOT gain intake-filing in v1.
    for (const role of ['pariwar_admin', 'state_trustee', 'district_admin', 'verifier', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.17 — claim.conduct_ground_inspection is granted to block_admin AND district_admin (+ super_admin)', () => {
    const KEY = 'claim.conduct_ground_inspection';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // ⚠ THIS IS THE v1-DEFERRAL PIN, AND IT MOVES. Do NOT confuse it with the RANK-ORDER pin in
    // check.test.ts, which is byte-frozen and stays green (a BLOCK grant can never satisfy a
    // DISTRICT-dimension check — still true, and Story 6.17 routed around it rather than lifting it).
    //
    // Story 6.7 shipped `district_admin` only and recorded block_admin DEFERRED, on the reasoning
    // that a block-scoped grant cannot satisfy the D6 `dimension: 'district'` gate. That reasoning
    // was correct about the GATE and wrong about the CONCLUSION: the fix was never a resolver, it
    // was a different gate. Story 6.17 made the authorization DIMENSION a property of the ROW —
    // a block-tagged assignment (`claim_ground_inspections.block != null`) is checked at
    // `dimension: 'block'`, which authorizes block_admin by EXACT-NODE match and district_admin by
    // district→block ANCESTRY; a legacy row (`block == null`) is still checked at
    // `dimension: 'district'`. See roles.ts / permissions.ts and Decision `2026-08-13-104`.
    // ⛔ block_admin's scopeCeiling stays 'block' — no district-scoped grant is issued to it.
    expect(holders).toEqual(['block_admin', 'district_admin', 'super_admin']);
    expect((bundleForRole('block_admin')?.permissions as readonly string[]).includes(KEY)).toBe(true);
    // The ceiling is the other half of AC2 — granting the key must not have widened the role's scope.
    expect(bundleForRole('block_admin')?.scopeCeiling).toBe('block');
    // NOT the verifier/trustee/pariwar APPROVE roles, and NOT field_worker (deferred to Epic 12).
    for (const role of ['pariwar_admin', 'state_trustee', 'verifier', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.7 — claim.override_ground_inspection is granted ONLY to pariwar_admin (+ super_admin)', () => {
    const KEY = 'claim.override_ground_inspection';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The D6 supervisor override — a pariwar-ceiling authority above the district inspector.
    expect(holders).toEqual(['pariwar_admin', 'super_admin']);
    // The district inspector role itself does NOT hold the override (it acts as itself, not over peers).
    for (const role of ['district_admin', 'block_admin', 'state_trustee', 'verifier', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.8 code review — claim.manage_nominee_bank is granted ONLY to helpline_operator (+ super_admin)', () => {
    const KEY = 'claim.manage_nominee_bank';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    expect(holders).toEqual(['helpline_operator', 'super_admin']);
    // Replaces an initial claim.file reuse — pariwar_admin (an APPROVE-capable role) does NOT gain
    // ordinary nominee-bank collection/edit, the same posture as claim.file itself.
    for (const role of ['pariwar_admin', 'state_trustee', 'district_admin', 'verifier', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.8 code review — claim.correct_nominee_bank is granted to helpline_operator AND pariwar_admin (+ super_admin)', () => {
    const KEY = 'claim.correct_nominee_bank';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // helpline_operator: preserves the exact pre-review capability (claim.file previously gated
    // both ordinary collection AND correction). pariwar_admin: the supervisor-escalation grant —
    // the claim.override_ground_inspection rationale — though a pure pariwar_admin still cannot
    // reach the route without ALSO holding claim.manage_nominee_bank (it does not carry that key).
    expect(holders).toEqual(['helpline_operator', 'pariwar_admin', 'super_admin']);
    for (const role of ['state_trustee', 'district_admin', 'verifier', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.9 — claim.manage_dpdpa_consent is granted to helpline_operator AND pariwar_admin (+ super_admin)', () => {
    const KEY = 'claim.manage_dpdpa_consent';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The DPDPA consent REVOCATION key (D5a) — the RECORD path reuses claim.file (consent capture is
    // part of filing). helpline_operator honors a family's later takedown request; pariwar_admin is
    // the supervisor-escalation grant (the claim.manage_nominee_bank/override_ground_inspection shape).
    expect(holders).toEqual(['helpline_operator', 'pariwar_admin', 'super_admin']);
    for (const role of ['state_trustee', 'district_admin', 'verifier', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
  });

  it('Story 6.10 — claim.verify is granted to district_admin AND verifier (+ super_admin); NOT state_trustee (D3a)', () => {
    const KEY = 'claim.verify';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The verifier-console READ key. Anita (district_admin) + verifier hold it — both `district`
    // ceiling, so the dimension:'district' gate is meaningful. + super_admin (full catalog).
    expect(holders).toEqual(['district_admin', 'super_admin', 'verifier']);
    // D3a — state_trustee is NOT granted claim.verify: a `state`-ceiling grant cannot satisfy a
    // district-dimension check under the deny-deeper geo resolver (Epic 3). Their concealment-detail +
    // escalation decisions live in the dedicated 6.13/6.15 State-Trustee surfaces (the block_admin
    // deferral precedent). block_admin / pariwar_admin / field_worker do not hold it either.
    for (const role of ['state_trustee', 'block_admin', 'pariwar_admin', 'field_worker', 'trustee_panel'] as const) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
    }
    // Distinct from the pre-existing claim.approve WRITE (the 6.11 adjudication action) — a role may
    // hold the READ key without the WRITE and vice-versa; verifier holds verify but NOT approve.
    expect((bundleForRole('verifier')?.permissions as readonly string[]).includes('claim.approve')).toBe(false);
  });

  it('Story 6.9 code review — no seeded non-catalog role holds claim.file WITHOUT claim.manage_dpdpa_consent', () => {
    // The RECORD-vs-REVOKE permission split (D5a) is only meaningful if SOME actor can hold claim.file
    // alone: otherwise "claim.file is insufficient to revoke" is unfalsifiable against real grants (the
    // live-DB dpdpa-consent-helpline.spec.ts NOTE documents this exact gap — no seeded role currently
    // demonstrates it). This structurally confirms every claim.file holder (besides the full-catalog
    // super_admin) also holds claim.manage_dpdpa_consent today, and stands as the trip-wire: if a future
    // role ever gains claim.file without claim.manage_dpdpa_consent, this test starts failing and should
    // be read as a prompt to add the live-DB negative test the helpline spec's NOTE describes.
    const fileHolders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes('claim.file'))
      .filter((b) => b.role !== 'super_admin')
      .map((b) => b.role);
    for (const role of fileHolders) {
      expect((bundleForRole(role)?.permissions as readonly string[]).includes('claim.manage_dpdpa_consent')).toBe(
        true,
      );
    }
  });

  it('Story 10.18 — member.moderate holders are exactly pariwar_admin + trustee_panel (+ super_admin)', () => {
    const KEY = 'member.moderate';
    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();
    // The post-10.18 holder set, pinned. `trustee_panel` is the Niyamavali §8.7 body (Decision
    // `2026-08-10-096`); `pariwar_admin` RETAINS the key because clause 3 ruled Panel authority
    // CONCURRENT, not exclusive — this story removes no grant. `super_admin` holds the full catalog.
    // `verifier` is here DELIBERATELY: it holds the key at a `district` ceiling against a
    // pariwar-dimension gate, so the grant is INERT. Decision `2026-08-10-096` clause 7 ruled it a
    // deferral-with-acceptance-condition rather than a removal. See the DEFERRAL PIN in check.test.ts
    // for the scope algebra, and the assertion below for the catalog-dependent half.
    expect(holders).toEqual(['pariwar_admin', 'super_admin', 'trustee_panel', 'verifier']);
  });

  it('Story 10.18 AC6 GATE — member.suspend is DEPRECATED: its holder set is FROZEN, no new grant may appear', () => {
    // ── WHY THIS IS A TEST AND NOT A scripts/ GATE ────────────────────────────────────────────────
    // AC6 permits either. This is a test because the thing it inspects is an IMPORTED DATA STRUCTURE
    // (`defaultRoleBundles`), not a source tree. The `scripts/<name>/check.ts` gates in this repo exist
    // for invariants that must SCAN FILES (governance-boundary, friction-budget) — those cannot be
    // expressed as a unit test because their subject is text across many files. This one has full type
    // access to its subject in-process, needs no runner, no root `package.json` entry, and no
    // `ci-local.sh` registration, and it runs in the existing `test` job on every CI run.
    //
    // ── IT IS A WHOLE-STATE SCAN, NOT A GIT-DIFF ──────────────────────────────────────────────────
    // Per the repo standard (`scripts/governance-boundary/check.ts`): it recomputes the ENTIRE holder
    // set from the live bundles every run. It therefore cannot miss a violation added earlier on the
    // branch, and cannot wrongly pass one that is already merged.
    const KEY = 'member.suspend';
    expect(isDeprecatedKey(KEY)).toBe(true); // the machine-readable marker, not a comment
    expect(DEPRECATED_KEY_SUCCESSOR[KEY]).toBe('member.moderate'); // every deprecated key names a successor

    const holders = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .map((b) => b.role)
      .sort();

    // The FROZEN baseline: the four explicit grants that predate the deprecation, plus super_admin,
    // whose bundle is `permissions: PERMISSION_CATALOG.keys` and therefore holds every catalog key —
    // it appears here like any other holder, because this set is collected FROM the bundles.
    expect(
      holders,
      `\n  member.suspend is DEPRECATED (Story 10.18; successor: member.moderate) and its holder set is FROZEN.\n` +
        `  Expected: block_admin, district_admin, pariwar_admin, state_trustee, super_admin\n` +
        `  Actual:   ${holders.join(', ')}\n` +
        `\n` +
        `  If you ADDED a holder: don't. Grant 'member.moderate' instead — that is the key the moderation\n` +
        `  routes actually gate on, and the one the Niyamavali §8.7 Trustee Panel holds.\n` +
        `  If you REMOVED a holder: removal is a SEPARATE, later catalog bump, taken only once no live\n` +
        `  grant references the key. Deprecation freezes the set; it does not shrink it.\n` +
        `\n` +
        `  ⚠ THIS GATE'S REACH IS THE DECLARATIVE BUNDLES ONLY. It inspects 'defaultRoleBundles'. There is\n` +
        `  NO SQL seed inserting role_grants rows, NO production caller of seedRoles(), and NO admin route\n` +
        `  that writes role_grants — the Story-1.9+ role-admin surface was never built — and static CI has\n` +
        `  no database. A grant written directly to the role_grants TABLE would NOT be caught here.\n` +
        `  Re-trigger: the first story that builds a role_grants write path must extend this assertion.\n`,
    ).toEqual(['block_admin', 'district_admin', 'pariwar_admin', 'state_trustee', 'super_admin']);
  });

  it('Story 10.18 — member.suspend stays ENFORCEABLE: deprecation marks intent, it does not remove the key', () => {
    // ⛔ DEPRECATED ≠ REMOVED. Three properties that must survive the deprecation, each asserted so a
    // later "cleanup" that deletes the key fails loudly rather than silently revoking four live grants.
    expect(isCatalogKey('member.suspend')).toBe(true); // still in the catalog
    expect(PERMISSION_CATALOG.keys).toContain('member.suspend'); // still enumerated
    expect(SEED_PERMISSION_KEYS).toContain('member.suspend'); // still in the source tuple
    // And the successor is a real catalog key, not a hopeful string.
    expect(isCatalogKey(DEPRECATED_KEY_SUCCESSOR['member.suspend'])).toBe(true);
  });

  it('Story 10.18 DEFERRAL PIN (catalog-dependent): verifier STILL HOLDS member.moderate, inertly', () => {
    // ⚠ This assertion is the catalog-dependent half of a revert-sanity PAIR. Its partner in
    // check.test.ts proves the scope algebra with a SYNTHETIC bundle, which makes that proof
    // catalog-INDEPENDENT — it passes identically whether or not this grant exists. Only this
    // assertion can observe the grant itself, so removing `verifier`'s key must fail HERE.
    const verifier = bundleForRole('verifier');
    expect((verifier?.permissions as readonly string[]).includes('member.moderate')).toBe(true);
    expect(verifier?.scopeCeiling).toBe('district');
    // ACCEPTANCE CONDITION (Decision `2026-08-10-096` clause 7): this grant becomes meaningful only if
    // a moderation target gains a server-derived district AND the gate moves to `dimension: 'district'`
    // — never by widening the pariwar gate to a role whose ceiling cannot satisfy it.
  });

  it('Story 10.13 — the fixed-amount keys are held CONCURRENTLY by trustee_panel AND pariwar_admin', () => {
    // Decision `2026-08-16-123` clause 1. The Trust Deed vests the power to fix the per-Pool amount in
    // the BOARD — Clause 10(b) ("a fixed per-Pool amount determined by the Board") and Clause 20(c)
    // ("open Pools, fix per-Pool amounts") — and Niyamavali §4.2 repeats it. Story 7.5 shipped both
    // keys on `pariwar_admin` ALONE, and a `pariwar_admin` is not the Board.
    //
    // ⚠ THIS IS THE FIRST trustee_panel GRANT THAT IS NOT EXCLUSIVE TO THE BUNDLE. `member.restore_terminated`
    // (10.19) and `member.decide_moderation_appeal` (10.22) are Panel-ONLY, and that exclusivity IS the
    // mechanism behind the ratified §8.4/§8.8 text. These two are deliberately CONCURRENT — the §8.7
    // "concurrent, not exclusive" posture — so do NOT read the 10.19/10.22 "⛔ do not grant elsewhere"
    // notes as covering these keys.
    for (const KEY of ['pool.fixed_amount_set', 'pool.fixed_amount_emergency'] as const) {
      const holders = defaultRoleBundles
        .filter((b) => (b.permissions as readonly string[]).includes(KEY))
        .map((b) => b.role)
        .sort();
      expect(holders).toEqual(['pariwar_admin', 'super_admin', 'trustee_panel']);
      // The ceiling is the other half: granting the keys must not have widened the Panel's scope.
      expect(bundleForRole('trustee_panel')?.scopeCeiling).toBe('pariwar');
      // ⛔ NOT state_trustee / district_admin — a state/district-ceiling grant can NEVER satisfy the
      // `pariwar`-dimension check these keys are gated at (rank order, not a missing resolver), so the
      // grant would be INERT ON ARRIVAL. Not a deferral: an arithmetic impossibility.
      for (const role of ['state_trustee', 'district_admin', 'block_admin', 'verifier', 'auditor'] as const) {
        expect((bundleForRole(role)?.permissions as readonly string[]).includes(KEY)).toBe(false);
      }
    }
  });

  it('Story 10.13 — `pool.fixed_amount_emergency` IS the panel-membership eligibility credential', () => {
    // Decision `2026-08-16-123` clause 2 (Q2.1, option (a) — key-as-credential). The emergency
    // attesting panel's eligibility predicate IS this key, checked at `dimension: 'pariwar'`, exactly
    // as `claim.r9_vote` and `claim.appeal_vote` already are for their panels. This assertion is what
    // makes that ruling observable in the capability model rather than only in a comment:
    // assertFixedAmountPanelAuthorized resolves the holder set THROUGH the seeded bundles, so if this
    // key ever left `trustee_panel`/`pariwar_admin`, the eligible-attestor directory would silently
    // shrink and the emergency path would start refusing legitimate panels.
    const KEY = 'pool.fixed_amount_emergency';
    expect(isCatalogKey(KEY)).toBe(true);
    const eligible = defaultRoleBundles
      .filter((b) => (b.permissions as readonly string[]).includes(KEY))
      .filter((b) => b.scopeCeiling === 'pariwar' || b.scopeCeiling === 'global')
      .map((b) => b.role)
      .sort();
    // Every holder must ALSO have a ceiling that can satisfy a `pariwar`-dimension check — a holder
    // that cannot is an inert grant, and would appear in `holders` above while never being eligible.
    expect(eligible).toEqual(['pariwar_admin', 'super_admin', 'trustee_panel']);
  });
});

describe('seedRoles — idempotent + deterministic (AC-3)', () => {
  it('re-applying produces structurally identical bundles every time', () => {
    const a = seedRoles();
    const b = seedRoles();
    expect(a).toEqual(b);
    expect(a).toEqual(defaultRoleBundles);
  });

  it('returns a fresh DEEP COPY — inner permission arrays are new instances, not shared refs', () => {
    // Proves the FR-44 editability path is safe: a caller that replaces a bundle's
    // permissions on the returned copy cannot corrupt the canonical default,
    // because every bundle object AND its permissions array is a fresh instance.
    const seeded = seedRoles();
    const seededAuditor = seeded.find((b) => b.role === 'auditor')!;
    const defaultAuditor = defaultRoleBundles.find((b) => b.role === 'auditor')!;
    expect(seededAuditor.permissions).toEqual(defaultAuditor.permissions); // same contents
    expect(seededAuditor.permissions).not.toBe(defaultAuditor.permissions); // different instance
    expect(seededAuditor).not.toBe(defaultAuditor); // different bundle object
  });
});
