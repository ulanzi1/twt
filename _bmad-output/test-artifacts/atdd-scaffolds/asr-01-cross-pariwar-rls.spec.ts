/**
 * ASR-1 — Cross-Pariwar adversarial read across every RLS-bound table.
 *
 * Target story: Story 1.6 (`pariwar_id` First-Class + RLS Adversarial Test)
 * Target final location: apps/api/__tests__/security/cross-pariwar-rls.spec.ts
 * Risks burned down: SEC-1 (cross-Pariwar leak), NFR-16 (cross-tenant isolation)
 *
 * RED-PHASE STATUS: all tests use `test.skip()`. Activate one at a time
 * during implementation; each MUST fail before the corresponding RLS policy
 * is wired up, then pass once `pariwar_id` is enforced at the SQL layer.
 *
 * Prerequisite blockers from test-design-architecture.md:
 *   - B-5 (test framework committed in tea/config.yaml)
 *   - Story 1.2 (Cloud SQL Postgres + Drizzle scaffold)
 *   - Story 1.6 (RLS policies authored)
 *
 * Execution:  pnpm test --grep "@P0 @MultiTenant"
 */

import { test } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { expect } from '@playwright/test';
import { newMemberSeed, newPariwarId, type PariwarId } from '../_fixtures/test-data';

// ─── List every multi-tenant RLS-bound table here ────────────────────────────
// Updated as Story 1.6 introduces each table. This list IS the adversarial
// surface — every new entry must come with a corresponding seed + read attempt.
const RLS_BOUND_TABLES = [
  'members',
  'member_events',
  'claims',
  'pools',
  'alerts',
  'contributions',
  'audit_log',
  'consent_registry',
  'niyamavali_rules',
  'rule_evaluations',
  'helpdesk_tickets',
  'field_workers',
  'attribution_events',
  'module_manifests',
  'module_leads',
  'feature_flag_evaluations',
] as const;

test.describe('@P0 @MultiTenant @Security cross-Pariwar RLS adversarial sweep', () => {
  let pariwarA: PariwarId;
  let pariwarB: PariwarId;

  test.beforeEach(async ({ apiRequest }) => {
    pariwarA = newPariwarId('bihar');
    pariwarB = newPariwarId('rail');

    // Seed one canonical row per table per Pariwar via test-seeder endpoint.
    // Endpoint signature: POST /test/seed/<table> { pariwar_id, ...row }
    // (Test-only seeder; gated behind NODE_ENV=test in arch §2.6.)
    for (const table of RLS_BOUND_TABLES) {
      for (const pariwar_id of [pariwarA, pariwarB]) {
        await apiRequest({
          method: 'POST',
          path: `/test/seed/${table}`,
          body: { pariwar_id, ...minimalRowFor(table, pariwar_id) },
        });
      }
    }
  });

  for (const table of RLS_BOUND_TABLES) {
    test.skip(`pariwarA admin cannot read pariwarB rows from ${table}`, async ({ apiRequest }) => {
      const { status, body } = await apiRequest({
        method: 'GET',
        path: `/p/${pariwarA}/admin/${table}`,
        headers: { 'x-actor-pariwar': pariwarA },
      });

      expect(status).toBe(200);
      const rows: Array<{ pariwar_id: string }> = body.rows ?? [];
      // Hard isolation invariant: zero rows from another Pariwar visible.
      expect(rows.every((r) => r.pariwar_id === pariwarA)).toBe(true);
      expect(rows.find((r) => r.pariwar_id === pariwarB)).toBeUndefined();
    });

    test.skip(`direct SQL with pariwarA session_user cannot SELECT pariwarB rows in ${table}`, async ({
      apiRequest,
    }) => {
      // Goes through the /test/exec-sql diagnostic endpoint, which sets
      // current_setting('app.pariwar_id') = pariwarA before executing.
      const { status, body } = await apiRequest({
        method: 'POST',
        path: '/test/exec-sql',
        body: {
          set_pariwar_id: pariwarA,
          sql: `SELECT pariwar_id FROM ${table} WHERE pariwar_id = $1`,
          params: [pariwarB],
        },
      });

      expect(status).toBe(200);
      // RLS policy must reject the cross-Pariwar read at the SQL layer.
      expect(body.rows).toHaveLength(0);
    });
  }

  test.skip('RLS policy lint: every table in RLS_BOUND_TABLES has pariwar_id NOT NULL + RLS enabled', async ({
    apiRequest,
  }) => {
    const { status, body } = await apiRequest({
      method: 'GET',
      path: '/test/rls-introspection',
    });

    expect(status).toBe(200);
    for (const table of RLS_BOUND_TABLES) {
      const meta = body.tables[table];
      expect(meta, `table ${table} missing from RLS introspection`).toBeDefined();
      expect(meta.pariwar_id_column).toEqual(
        expect.objectContaining({ exists: true, nullable: false }),
      );
      expect(meta.rls_enabled).toBe(true);
      expect(meta.policies.length).toBeGreaterThan(0);
    }
  });
});

// ─── helpers ────────────────────────────────────────────────────────────────

function minimalRowFor(table: (typeof RLS_BOUND_TABLES)[number], pariwar_id: PariwarId) {
  switch (table) {
    case 'members':
      return newMemberSeed({ pariwar_id });
    default:
      // Minimal seed shape per table is defined by the seeder; tests assume
      // the seeder fills required FK + NOT NULL columns deterministically.
      return { _seeded_for: table };
  }
}
