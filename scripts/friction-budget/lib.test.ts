// scripts/friction-budget/lib.test.ts
//
// Fixture-driven unit tests for the friction-budget gate's pure core (lib.ts).
// No network, no live device, no DB — this is a DB-free story. Run via
// `pnpm friction:test` (root package.json); the `friction-budget` CI job runs
// these before `pnpm friction:check`. NOT discovered by `pnpm turbo run test`
// because scripts/friction-budget/ is not a pnpm workspace.

import { describe, expect, it } from 'vitest';

import {
  detectBaselineChanges,
  detectLoosenedCeilings,
  detectRaisedBaselines,
  evaluateDeclaration,
  evaluateMetric,
  isMemberFacingPath,
  loosenedGuardVerdict,
  parseAndValidateLedger,
  parseFrictionBudgetYaml,
  type FrictionBudgetConfig,
} from './lib.js';

const SAMPLE_YAML = `
version: 1
surfaces:
  - id: member-app-native
    description: Member mobile app JS bundle
    manifest: apps/mobile/dist/bundle-manifest.json
    metrics:
      - id: js_bundle_bytes
        ceiling: 2621440
        baseline: null
      - id: page_weight_bytes
        ceiling: 3145728
        baseline: 1000000
deferred_metrics:
  - id: critical_render_path_ms
    canonical_device: 3GB Android
    status: deferred
    trigger: throttled-Lighthouse-CI harness lands
`;

describe('parseFrictionBudgetYaml', () => {
  it('parses a valid registry including metrics + deferred placeholder', () => {
    const cfg = parseFrictionBudgetYaml(SAMPLE_YAML);
    expect(cfg.version).toBe(1);
    expect(cfg.surfaces).toHaveLength(1);
    expect(cfg.surfaces[0].id).toBe('member-app-native');
    expect(cfg.surfaces[0].metrics).toHaveLength(2);
    expect(cfg.surfaces[0].metrics[0]).toEqual({
      id: 'js_bundle_bytes',
      ceiling: 2621440,
      baseline: null,
    });
    expect(cfg.surfaces[0].metrics[1].baseline).toBe(1000000);
    expect(cfg.deferredMetrics[0]).toMatchObject({
      id: 'critical_render_path_ms',
      canonicalDevice: '3GB Android',
      status: 'deferred',
    });
  });

  it('throws on a missing manifest field (malformed registry fails loudly)', () => {
    const bad = `
version: 1
surfaces:
  - id: x
    metrics:
      - id: a
        ceiling: 10
        baseline: null
`;
    expect(() => parseFrictionBudgetYaml(bad)).toThrow(/missing a string .manifest/);
  });

  it('throws on a non-numeric ceiling', () => {
    const bad = `
version: 1
surfaces:
  - id: x
    manifest: x/m.json
    metrics:
      - id: a
        ceiling: "lots"
        baseline: null
`;
    expect(() => parseFrictionBudgetYaml(bad)).toThrow(/ceiling must be a number/);
  });

  it('throws on a non-numeric version', () => {
    expect(() => parseFrictionBudgetYaml('version: one\nsurfaces: []')).toThrow(
      /version. must be a number/,
    );
  });

  it('throws when baseline exceeds ceiling (P7)', () => {
    const bad = `
version: 1
surfaces:
  - id: x
    manifest: x/m.json
    metrics:
      - id: a
        ceiling: 1000
        baseline: 2000
`;
    expect(() => parseFrictionBudgetYaml(bad)).toThrow(/baseline.*exceeds ceiling/);
  });
});

describe('parseAndValidateLedger', () => {
  const validLedger = `
# friction-budget.md

Some prose explaining UX Stance #2.

| payer | protects | event_type |
|---|---|---|
| Sushil (UTR-mismatch upload) | Reconciliation integrity | forced |
| Anita (over-payment recovery) | Pool Engine | forced |

Trailing prose.
`;

  it('parses valid seed rows with all three keys', () => {
    const { rows, errors } = parseAndValidateLedger(validLedger);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      payer: 'Sushil (UTR-mismatch upload)',
      protects: 'Reconciliation integrity',
      eventType: 'forced',
    });
  });

  it('flags a row missing the protects key', () => {
    const md = `
| payer | protects | event_type |
|---|---|---|
| Someone |  | forced |
`;
    const { errors } = parseAndValidateLedger(md);
    expect(errors.some((e) => /missing .protects./.test(e))).toBe(true);
  });

  it('flags an invalid event_type', () => {
    const md = `
| payer | protects | event_type |
|---|---|---|
| Someone | Something | mandatory |
`;
    const { errors } = parseAndValidateLedger(md);
    expect(
      errors.some((e) => /event_type "mandatory" must be one of forced \| optional/.test(e)),
    ).toBe(true);
  });

  it('errors when no ledger table is present', () => {
    const { errors } = parseAndValidateLedger('# just prose, no table');
    expect(errors).toEqual([
      'no friction-budget ledger table found (expected columns: payer | protects | event_type)',
    ]);
  });
});

describe('evaluateMetric', () => {
  const metric = { id: 'js_bundle_bytes', ceiling: 1000, baseline: 800 };

  it('no-ops when the manifest is absent (AC-2)', () => {
    const v = evaluateMetric('s', metric, null);
    expect(v.status).toBe('no-op');
    expect(v.measured).toBeNull();
  });

  it('no-ops when the metric is absent from a present manifest', () => {
    const v = evaluateMetric('s', metric, { other_metric: 50 });
    expect(v.status).toBe('no-op');
  });

  it('fails when measured exceeds the ceiling (regression)', () => {
    const v = evaluateMetric('s', metric, { js_bundle_bytes: 1500 });
    expect(v.status).toBe('fail');
    expect(v.message).toMatch(/REGRESSION/);
    expect(v.message).toMatch(/\+500/);
  });

  it('fails when measured improves below baseline but baseline was not lowered in-PR (drift)', () => {
    const v = evaluateMetric('s', metric, { js_bundle_bytes: 700 });
    expect(v.status).toBe('fail');
    expect(v.message).toMatch(/baseline-of-record not updated/);
  });

  it('passes when measured equals the committed (improved) baseline', () => {
    const v = evaluateMetric('s', { ...metric, baseline: 700 }, { js_bundle_bytes: 700 });
    expect(v.status).toBe('pass');
  });

  it('passes within budget (baseline <= measured <= ceiling), reporting the delta', () => {
    const v = evaluateMetric('s', metric, { js_bundle_bytes: 900 });
    expect(v.status).toBe('pass');
    expect(v.message).toMatch(/\+100 vs baseline 800/);
  });

  it('passes when no baseline is set yet, prompting to record it', () => {
    const v = evaluateMetric('s', { ...metric, baseline: null }, { js_bundle_bytes: 500 });
    expect(v.status).toBe('pass');
    expect(v.message).toMatch(/baseline-of-record not yet set/);
  });
});

describe('isMemberFacingPath', () => {
  it('classifies member app paths as member-facing', () => {
    expect(isMemberFacingPath('apps/mobile/src/screens/Login.tsx')).toBe(true);
    expect(isMemberFacingPath('apps/public/src/pages/join.astro')).toBe(true);
  });
  it('excludes admin / api / jobs / infra / docs / _bmad', () => {
    expect(isMemberFacingPath('apps/admin/src/Foo.tsx')).toBe(false);
    expect(isMemberFacingPath('apps/api/src/modules/auth/x.ts')).toBe(false);
    expect(isMemberFacingPath('apps/jobs/src/boot.ts')).toBe(false);
    expect(isMemberFacingPath('infra/gcp/main.tf')).toBe(false);
    expect(isMemberFacingPath('docs/adr/ADR-0012.md')).toBe(false);
    expect(isMemberFacingPath('_bmad-output/x.md')).toBe(false);
  });
});

describe('evaluateDeclaration (diff → verdict)', () => {
  const TABLE = [
    '| payer | protects | event_type |',
    '| --- | --- | --- |',
    '| member | the pool | forced |',
  ].join('\n');
  const MEMBER_DIFF = ['apps/mobile/src/screens/Contribute.tsx', 'friction-budget.md'];

  it('fails when a member-facing path changed but the ledger did not', () => {
    const v = evaluateDeclaration(['apps/mobile/src/screens/Contribute.tsx', 'apps/api/src/x.ts'], {
      base: TABLE,
      head: TABLE,
    });
    expect(v.ok).toBe(false);
    expect(v.basis).toBe('unchanged');
    expect(v.touchedMemberPaths).toEqual(['apps/mobile/src/screens/Contribute.tsx']);
    expect(v.message).toMatch(/Declare the friction/);
  });

  it('passes (dormant) when no member-facing path changed', () => {
    const v = evaluateDeclaration(['apps/api/src/x.ts', 'packages/domain/src/db.ts'], {
      base: TABLE,
      head: TABLE,
    });
    expect(v.ok).toBe(true);
    expect(v.basis).toBe('dormant');
    expect(v.touchedMemberPaths).toEqual([]);
  });

  // ⭐ THE REGRESSION THIS FACET EXISTS TO PREVENT — demonstrated live 2026-09-05:
  // a prose correction to an unrelated paragraph flipped AC-4 red→green while the
  // declaration it demanded stayed unwritten. `#decision-2026-09-05-202` follow-up.
  it('⛔ FAILS when the ledger was edited but carries NO new row and NO new disposition', () => {
    const v = evaluateDeclaration(MEMBER_DIFF, {
      base: `Some prose.\n${TABLE}`,
      head: `Some prose, corrected for a typo.\n${TABLE}`,
    });
    expect(v.ok).toBe(false);
    expect(v.basis).toBe('no-declaration');
    expect(v.message).toMatch(/an incidental edit does not discharge AC-4/);
  });

  it('passes when a NEW declaration row is added', () => {
    const v = evaluateDeclaration(MEMBER_DIFF, {
      base: TABLE,
      head: `${TABLE}\n| member | a second thing | optional |`,
    });
    expect(v.ok).toBe(true);
    expect(v.basis).toBe('row');
    expect(v.message).toMatch(/1 added\/amended/);
  });

  it('passes when an existing row is AMENDED', () => {
    const v = evaluateDeclaration(MEMBER_DIFF, {
      base: TABLE,
      head: TABLE.replace('| member | the pool | forced |', '| member | the pool | optional |'),
    });
    expect(v.ok).toBe(true);
    expect(v.basis).toBe('row');
  });

  // ⭐ Story 11b.9 RETIRED Story 11b.1's row — removal is a legitimate declaration act.
  it('passes when a row is RETIRED', () => {
    const v = evaluateDeclaration(MEMBER_DIFF, {
      base: `${TABLE}\n| member | a retired thing | optional |`,
      head: TABLE,
    });
    expect(v.ok).toBe(true);
    expect(v.basis).toBe('row');
    expect(v.message).toMatch(/1 retired/);
  });

  it('passes when a NEW story disposition is recorded with no row change', () => {
    const v = evaluateDeclaration(MEMBER_DIFF, {
      base: TABLE,
      head: `${TABLE}\n\n**Story 9.9 disposition (declaration affirmed, no new row):** because.`,
    });
    expect(v.ok).toBe(true);
    expect(v.basis).toBe('disposition');
    expect(v.message).toMatch(/9\.9/);
  });

  it('⛔ does NOT accept a PRE-EXISTING disposition as a new one', () => {
    const withDisp = `${TABLE}\n\n**Story 9.9 disposition (declaration affirmed, no new row):** because.`;
    const v = evaluateDeclaration(MEMBER_DIFF, { base: withDisp, head: `${withDisp}\n\nA typo fix.` });
    expect(v.ok).toBe(false);
    expect(v.basis).toBe('no-declaration');
  });

  // ⚠ Degradation is LOUD, never silent — a silent fallback would re-create the defect.
  it('degrades to the file-touched check when the base ledger is unavailable, and SAYS SO', () => {
    const v = evaluateDeclaration(MEMBER_DIFF, { base: null, head: TABLE });
    expect(v.ok).toBe(true);
    expect(v.basis).toBe('content-unavailable');
    expect(v.message).toMatch(/DEGRADED/);
  });
});

describe('threshold-loosening guard (AC-1)', () => {
  const head: FrictionBudgetConfig = {
    version: 1,
    surfaces: [
      {
        id: 's',
        manifest: 'm.json',
        metrics: [{ id: 'a', ceiling: 2000, baseline: 1000 }],
      },
    ],
    deferredMetrics: [],
  };
  const baseTighter: FrictionBudgetConfig = {
    version: 1,
    surfaces: [
      { id: 's', manifest: 'm.json', metrics: [{ id: 'a', ceiling: 1000, baseline: 1000 }] },
    ],
    deferredMetrics: [],
  };

  it('detects a raised ceiling as a loosening', () => {
    const loose = detectLoosenedCeilings(baseTighter, head);
    expect(loose).toEqual([{ surface: 's', metric: 'a', from: 1000, to: 2000 }]);
  });

  it('reports no loosening when the base config is null (new file)', () => {
    expect(detectLoosenedCeilings(null, head)).toEqual([]);
  });

  it('detects baseline changes between base and head', () => {
    const baseWithDiffBaseline: FrictionBudgetConfig = {
      version: 1,
      surfaces: [
        { id: 's', manifest: 'm.json', metrics: [{ id: 'a', ceiling: 2000, baseline: 1500 }] },
      ],
      deferredMetrics: [],
    };
    expect(detectBaselineChanges(baseWithDiffBaseline, head)).toBe(true);
    expect(detectBaselineChanges(head, head)).toBe(false);
  });

  it('fails when a loosening is bundled with a measurement change', () => {
    const loose = detectLoosenedCeilings(baseTighter, head);
    const verdict = loosenedGuardVerdict(loose, true);
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toMatch(/Split into a rationale PR/);
  });

  it('allows a loosening in a rationale-only PR (no measurement change)', () => {
    const loose = detectLoosenedCeilings(baseTighter, head);
    const verdict = loosenedGuardVerdict(loose, false);
    expect(verdict.ok).toBe(true);
  });

  it('passes when there is no loosening at all', () => {
    expect(loosenedGuardVerdict([], true).ok).toBe(true);
  });
});

describe('detectRaisedBaselines (P2 — creeping baseline inflation guard)', () => {
  const mkCfg = (baseline: number | null): FrictionBudgetConfig => ({
    version: 1,
    surfaces: [{ id: 's', manifest: 'm.json', metrics: [{ id: 'a', ceiling: 5000, baseline }] }],
    deferredMetrics: [],
  });

  it('detects a raised baseline as a raise', () => {
    const raises = detectRaisedBaselines(mkCfg(800), mkCfg(1000));
    expect(raises).toEqual([{ surface: 's', metric: 'a', from: 800, to: 1000 }]);
  });

  it('does not flag a lowered baseline (improvement)', () => {
    const raises = detectRaisedBaselines(mkCfg(800), mkCfg(600));
    expect(raises).toEqual([]);
  });

  it('does not flag when baseline is unchanged', () => {
    expect(detectRaisedBaselines(mkCfg(800), mkCfg(800))).toEqual([]);
  });

  it('does not flag when base is null (new file)', () => {
    expect(detectRaisedBaselines(null, mkCfg(800))).toEqual([]);
  });

  it('does not flag when baseline moves from null to a value (first commit)', () => {
    expect(detectRaisedBaselines(mkCfg(null), mkCfg(800))).toEqual([]);
  });
});
