/**
 * ASR-7 — Reconciliation matcher: idempotent + monotonic-confirmation invariant.
 *
 * Target story: Story 9.4 (UTR Matching Engine + Cron 6×/day + Monotonic)
 * Target final location:
 *   packages/domain/__tests__/reconciliation/matcher-idempotency.spec.ts
 * Risks burned down: TECH-1 (silent mismatch), DATA-6 (state drift), NFR-9
 *
 * RED-PHASE STATUS: test.skip(). Activation blocked on:
 *   - B-2: normalized statement schema ADR (AR-69)
 *   - Story 9.2 5-bank parser landing
 *
 * Execution:  pnpm vitest --grep "@P0 @Recon"
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { newBankRecord, type NormalizedBankRecord } from '../_fixtures/test-data';

// Imports do NOT exist yet.
// import { runMatcher, getContributionStatus } from '@twt/domain/reconciliation';

type ContributionStatus =
  | { status: 'submitted'; utr: string }
  | { status: 'pending_match'; utr: string }
  | { status: 'confirmed'; utr: string; confirmed_at: string }
  | { status: 'mismatch'; utr: string; reason: string };

declare function runMatcher(args: {
  alert_id: string;
  pool_id: string;
  statements: NormalizedBankRecord[];
  member_attested_utrs: Array<{ member_id: string; utr: string; amount: number }>;
}): Promise<{ updated_count: number; idempotent_skipped: number }>;

declare function getContributionStatus(args: {
  member_id: string;
  alert_id: string;
}): Promise<ContributionStatus>;

describe('@P0 @Recon @Idempotency matcher is replay-safe', () => {
  test.skip('running matcher twice with same input ⇒ identical outcome, no double-confirm', async () => {
    const utr = 'ABCD1234EFGH5678IJKL90';
    const member_id = 'm-001';
    const alert_id = 'alert-78';
    const pool_id = 'pool-karna-78';

    const statement = newBankRecord({ UTR: utr, amount: 31000 });
    const attested = [{ member_id, utr, amount: 31000 }];

    const first = await runMatcher({ alert_id, pool_id, statements: [statement], member_attested_utrs: attested });
    expect(first.updated_count).toBe(1);
    expect(first.idempotent_skipped).toBe(0);

    const after1 = await getContributionStatus({ member_id, alert_id });
    expect(after1.status).toBe('confirmed');

    // Replay the matcher with the SAME input — must be a no-op.
    const second = await runMatcher({ alert_id, pool_id, statements: [statement], member_attested_utrs: attested });
    expect(second.updated_count).toBe(0);
    expect(second.idempotent_skipped).toBe(1);

    const after2 = await getContributionStatus({ member_id, alert_id });
    expect(after2.status).toBe('confirmed');
    if (after1.status === 'confirmed' && after2.status === 'confirmed') {
      // Monotonic: confirmed_at MUST NOT change between replays.
      expect(after2.confirmed_at).toBe(after1.confirmed_at);
    }
  });

  test.skip('monotonic invariant: once confirmed, NEVER reverts on subsequent runs', async () => {
    const member_id = 'm-002';
    const alert_id = 'alert-78';
    const pool_id = 'pool-karna-78';
    const utr = 'MONOTONIC-UTR-001';

    // Run 1: matched and confirmed.
    await runMatcher({
      alert_id,
      pool_id,
      statements: [newBankRecord({ UTR: utr, amount: 31000 })],
      member_attested_utrs: [{ member_id, utr, amount: 31000 }],
    });
    const confirmed = await getContributionStatus({ member_id, alert_id });
    expect(confirmed.status).toBe('confirmed');

    // Run 2: WITHOUT the statement (simulate transient ingest gap). The
    // matcher MUST NOT revert the confirmation.
    await runMatcher({ alert_id, pool_id, statements: [], member_attested_utrs: [{ member_id, utr, amount: 31000 }] });
    const stillConfirmed = await getContributionStatus({ member_id, alert_id });
    expect(stillConfirmed.status).toBe('confirmed');

    // Run 3: a CONTRADICTORY statement (different UTR for same member). Still
    // must NOT revert; should record a flag instead (engine-level, audit-logged).
    await runMatcher({
      alert_id,
      pool_id,
      statements: [newBankRecord({ UTR: 'OTHER-UTR', amount: 99999 })],
      member_attested_utrs: [{ member_id, utr, amount: 31000 }],
    });
    const final = await getContributionStatus({ member_id, alert_id });
    expect(final.status).toBe('confirmed');
  });

  test.skip('amount lock (FR-18): am ≠ fixed_amount ⇒ mismatch, not confirmed', async () => {
    const member_id = 'm-003';
    const alert_id = 'alert-78';
    const pool_id = 'pool-karna-78';
    const utr = 'AMT-LOCK-UTR-001';

    await runMatcher({
      alert_id,
      pool_id,
      statements: [newBankRecord({ UTR: utr, amount: 30000 /* ₹300 — wrong */ })],
      member_attested_utrs: [{ member_id, utr, amount: 31000 /* fixed = ₹310 */ }],
    });

    const status = await getContributionStatus({ member_id, alert_id });
    expect(status.status).toBe('mismatch');
    if (status.status === 'mismatch') {
      expect(status.reason).toMatch(/amount/i);
    }
  });

  test.skip('property: order of input statements does NOT change final outcome', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            fc.string({ minLength: 8, maxLength: 22 }).filter((s) => /^[A-Z0-9]+$/.test(s)),
            fc.constant(31000),
          ),
          { minLength: 1, maxLength: 50 },
        ),
        async (pairs) => {
          const alert_id = `alert-${Date.now()}`;
          const pool_id = `pool-${alert_id}`;
          const attested = pairs.map(([utr], i) => ({ member_id: `m-${i}`, utr, amount: 31000 }));
          const statements = pairs.map(([utr, amount]) => newBankRecord({ UTR: utr, amount }));

          // Run with two orderings; final per-member status must be identical.
          await runMatcher({ alert_id, pool_id, statements, member_attested_utrs: attested });
          const a = await Promise.all(attested.map((x) => getContributionStatus({ member_id: x.member_id, alert_id })));

          const reverse_alert_id = `${alert_id}-rev`;
          const reverse_pool_id = `${pool_id}-rev`;
          await runMatcher({
            alert_id: reverse_alert_id,
            pool_id: reverse_pool_id,
            statements: [...statements].reverse(),
            member_attested_utrs: [...attested].reverse(),
          });
          const b = await Promise.all(
            attested.map((x) => getContributionStatus({ member_id: x.member_id, alert_id: reverse_alert_id })),
          );

          // Compare only the discriminator + UTR; confirmed_at differs by run.
          expect(a.map((s) => s.status)).toEqual(b.map((s) => s.status));
        },
      ),
      { numRuns: 25 },
    );
  });
});
