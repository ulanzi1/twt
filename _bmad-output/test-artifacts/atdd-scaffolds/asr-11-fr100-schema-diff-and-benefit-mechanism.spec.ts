/**
 * ASR-11 — FR-100 governance CI gates:
 *   A) Schema-diff non-additive guard: v1 tables (per allowlist) cannot grow
 *      columns to support trust-paid benefits — those must arrive as a new
 *      greenfield entity.
 *   B) `benefit_mechanism` tag guard: every rule entry must carry a
 *      `benefit_mechanism` discriminator (`pool` | `reserve`); v1 ships only
 *      `pool`-tagged rules.
 *
 * Target stories: Story 1.16c + 1.16d + Story 14.4 + Story 14.5
 * Target final location:
 *   apps/api/__tests__/governance/fr100-schema-diff.spec.ts
 *   apps/api/__tests__/governance/benefit-mechanism-tag.spec.ts
 * Risks burned down: maintains FR-100 forward-compat hooks; prevents
 *   accidental column adds that would break greenfield activation later.
 *
 * RED-PHASE STATUS: test.skip(). No upstream blocker.
 *
 * Lane: PR (CI gate — < 5 s for both).
 *
 * Execution:  pnpm vitest --grep "@P0 @Governance"
 */

import { describe, expect, test } from 'vitest';

// Imports do NOT exist yet.
// import { diffSchemaAgainstBaseline } from '@twt/test-utils/schema-diff';
// import { listRuleRegistryEntries } from '@twt/test-utils/niyamavali';

declare function diffSchemaAgainstBaseline(args: {
  baseline_ref: string; // git ref, e.g. tag v1.0.0-schema
}): Promise<
  Array<{
    table: string;
    change: 'column_added' | 'column_removed' | 'type_changed' | 'index_added' | 'constraint_changed';
    column?: string;
    details: string;
  }>
>;

declare function listRuleRegistryEntries(): Promise<
  Array<{
    rule_id: string;
    pariwar_id: string;
    version: string;
    benefit_mechanism?: 'pool' | 'reserve';
    payload: Record<string, unknown>;
  }>
>;

// FR-100 protected table allowlist: these tables MUST NOT grow columns for
// trust-paid benefits. New benefits must be a new entity (separate tables).
const FR100_PROTECTED_TABLES = [
  'members',
  'member_events',
  'claims',
  'pools',
  'alerts',
  'contributions',
  'niyamavali_rules',
] as const;

describe('@P0 @Governance @FR100 schema-diff non-add guard', () => {
  test.skip('no protected v1 table has had a column added since baseline', async () => {
    const diff = await diffSchemaAgainstBaseline({ baseline_ref: 'v1.0.0-schema' });

    const violations = diff.filter(
      (d) =>
        d.change === 'column_added' &&
        (FR100_PROTECTED_TABLES as readonly string[]).includes(d.table),
    );

    expect(
      violations,
      `FR-100 non-additive guard violation:\n${violations
        .map((v) => `  ${v.table}.${v.column} → ${v.details}`)
        .join('\n')}\n` +
        `If you intend to add trust-paid-benefit data, create a NEW entity + new tables — do NOT add columns to v1 tables.`,
    ).toEqual([]);
  });

  test.skip('column REMOVAL on protected tables is also blocked (v1 stability)', async () => {
    const diff = await diffSchemaAgainstBaseline({ baseline_ref: 'v1.0.0-schema' });
    const removed = diff.filter(
      (d) =>
        d.change === 'column_removed' &&
        (FR100_PROTECTED_TABLES as readonly string[]).includes(d.table),
    );
    expect(removed).toEqual([]);
  });
});

describe('@P0 @Governance @FR100 benefit_mechanism tag guard', () => {
  test.skip('every rule registry entry carries a benefit_mechanism in {pool, reserve}', async () => {
    const rules = await listRuleRegistryEntries();
    expect(rules.length).toBeGreaterThan(0);

    const untagged = rules.filter((r) => r.benefit_mechanism === undefined);
    expect(
      untagged,
      `rules missing benefit_mechanism:\n${untagged.map((r) => `  ${r.rule_id}@${r.version}`).join('\n')}`,
    ).toEqual([]);

    const invalid = rules.filter(
      (r) => r.benefit_mechanism !== 'pool' && r.benefit_mechanism !== 'reserve',
    );
    expect(invalid).toEqual([]);
  });

  test.skip('v1 ships ZERO `reserve`-tagged rules (Durghatana Sahayata is v2/v3)', async () => {
    const rules = await listRuleRegistryEntries();
    const reserveTagged = rules.filter((r) => r.benefit_mechanism === 'reserve');
    expect(
      reserveTagged,
      `v1 must not ship reserve-tagged rules; got:\n${reserveTagged.map((r) => r.rule_id).join(', ')}`,
    ).toEqual([]);
  });

  test.skip('every rule-evaluation audit line includes benefit_mechanism', async () => {
    // Sample evaluation: trigger an eligibility check and inspect audit log.
    // This asserts the evaluation pipeline carries the discriminator through.
    // (Pseudo — exact API surface lands with Story 4.1.)
    const sample = { rule_id: 'R8_skip_allowance', expected_mechanism: 'pool' };
    // const evalResult = await evaluateRule(sample);
    // const audit = await getAuditLineForEvaluation(evalResult.evaluation_id);
    // expect(audit.payload.benefit_mechanism).toBe(sample.expected_mechanism);
    expect(sample.expected_mechanism).toBe('pool'); // placeholder until Story 4.1 lands
  });
});
