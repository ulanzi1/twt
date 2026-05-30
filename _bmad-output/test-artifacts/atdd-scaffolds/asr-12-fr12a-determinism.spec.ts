/**
 * ASR-12 — FR-12A Member Validity Service determinism: same `member_id` +
 * same `rule_registry_version` ⇒ identical payload (replay-able for audit).
 *
 * Distinct from ASR-4 (which covers latency + freshness). This one is the
 * pure-correctness contract: given a frozen registry version, the service
 * is a deterministic function of (member_id, rule_registry_version).
 *
 * Target story: Story 4.6 (FR-12A canonical payload + p95 + determinism)
 * Target final location:
 *   packages/domain/__tests__/validity-service/determinism.spec.ts
 * Risks burned down: TECH-3 partial (determinism leg; freshness is ASR-4)
 *
 * RED-PHASE STATUS: test.skip(). Can begin once Story 4.1 (rule evaluation
 * primitive) exposes the deterministic eval API.
 *
 * Execution:  pnpm vitest --grep "@P0 @FR-12A @Determinism"
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';

// Imports do NOT exist yet — they land with Story 4.6 + Story 4.1.
// import { evaluateMemberValidity, freezeRuleRegistry } from '@twt/domain/validity';

type ValidityPayload = {
  member_id: string;
  evaluated_at: string;
  rule_registry_version: string;
  is_valid: boolean;
  is_active: boolean;
  lock_in_status: { days_at_join: number; unlock_date: string; state: 'in_lockin' | 'past_lockin' };
  vyawastha_shulk_status: { paid_through: string; days_until_lapse: number };
  contribution_history: {
    total_contributions: number;
    missed_count_lifetime: number;
    rolling_year_skips: number;
    R7_subclause_state: string | null;
    R8_subclause_state: string | null;
  };
  applicable_niyamavali_clauses: Array<{ rule_id: string; version: string; outcome: string }>;
  outcome_digest: string;
};

declare function evaluateMemberValidity(args: {
  member_id: string;
  pinned_registry_version: string;
}): Promise<ValidityPayload>;

declare function freezeRuleRegistry(): Promise<{ version: string }>;

describe('@P0 @FR-12A @Determinism evaluateMemberValidity', () => {
  test.skip('same (member_id, pinned_registry_version) ⇒ identical payload (modulo evaluated_at)', async () => {
    const { version } = await freezeRuleRegistry();
    const member_id = 'm4L-0000042';

    const a = await evaluateMemberValidity({ member_id, pinned_registry_version: version });
    const b = await evaluateMemberValidity({ member_id, pinned_registry_version: version });

    // outcome_digest is the canonical replay key.
    expect(a.outcome_digest).toBe(b.outcome_digest);

    // Every field except `evaluated_at` must match exactly.
    expect({ ...a, evaluated_at: '' }).toEqual({ ...b, evaluated_at: '' });
  });

  test.skip('property: deterministic across a large member sample at fixed version', async () => {
    const { version } = await freezeRuleRegistry();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 400_000 - 1 }),
        async (idx) => {
          const member_id = `m4L-${idx.toString().padStart(7, '0')}`;
          const a = await evaluateMemberValidity({ member_id, pinned_registry_version: version });
          const b = await evaluateMemberValidity({ member_id, pinned_registry_version: version });
          expect(a.outcome_digest).toBe(b.outcome_digest);
        },
      ),
      { numRuns: 100 },
    );
  });

  test.skip('changing registry version ⇒ payload MAY change; outcome_digest reflects the change', async () => {
    const v1 = await freezeRuleRegistry();
    const member_id = 'm4L-0000042';

    const payloadV1 = await evaluateMemberValidity({
      member_id,
      pinned_registry_version: v1.version,
    });

    // Bump a clause that affects this member (lock-in or skip allowance).
    // Helper landing with Story 4.4. After bump, freeze again.
    // await amendNiyamavali({ pariwar_id: 'bihar', clause_id: 'R8', new_value: { allowed_skips: 0 } });
    const v2 = await freezeRuleRegistry();
    expect(v2.version).not.toBe(v1.version);

    const payloadV2 = await evaluateMemberValidity({
      member_id,
      pinned_registry_version: v2.version,
    });

    // outcome_digest MUST encode the registry version. (If clauses are
    // unaffected, digests CAN be equal; if affected, they MUST differ.)
    // Strictest assertion: rule_registry_version reflects the pin.
    expect(payloadV1.rule_registry_version).toBe(v1.version);
    expect(payloadV2.rule_registry_version).toBe(v2.version);
  });

  test.skip('applicable_niyamavali_clauses is fully provenance-grade: every rule lists version + outcome', async () => {
    const { version } = await freezeRuleRegistry();
    const payload = await evaluateMemberValidity({
      member_id: 'm4L-0000042',
      pinned_registry_version: version,
    });

    expect(payload.applicable_niyamavali_clauses.length).toBeGreaterThan(0);
    for (const clause of payload.applicable_niyamavali_clauses) {
      expect(clause.rule_id).toMatch(/^[A-Z][A-Z0-9_]+$/);
      expect(clause.version).toBe(version);
      expect(clause.outcome).toMatch(/^(passed|failed|skipped|not_applicable)$/);
    }
  });
});
