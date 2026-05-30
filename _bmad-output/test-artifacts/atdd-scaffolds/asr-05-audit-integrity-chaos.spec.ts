/**
 * ASR-5 — Audit log integrity chaos: sole-engineer credential mutates one
 * audit row → daily integrity check FAILS ≤ 24 h AND off-site mirror diff
 * detects divergence ≤ 6 h.
 *
 * Target stories: Story 1.10 (tamper-evident audit log) + Story 1.11a (integrity
 *                 verification primitive)
 * Target final location: apps/api/__tests__/security/audit-integrity-chaos.spec.ts
 * Risks burned down: TECH-9 (hash-chain break), SEC-3, SEC-9, OPS-7
 *
 * RED-PHASE STATUS: test.skip(). Activation blocked on:
 *   - Story 1.10 hash-chain implementation
 *   - Story 1.11a integrity verification job
 *   - AR-10 IAM Isolation Commitment (twt-audit-mirror project provisioned)
 *
 * Lane: Nightly (chaos).
 *
 * Execution:  pnpm vitest --grep "@P0 @Audit @Chaos"
 */

import { describe, expect, test } from 'vitest';

// Imports do NOT exist yet.
// import { withSoleEngineerCredential } from '@twt/test-utils/iam';
// import { runAuditIntegrityCheck, getOffsiteMirrorDiff } from '@twt/api-client/audit';
// import { TestClock } from '@twt/test-utils/clock';
// import { writeAuditLine, mutateAuditRowDirectly } from '@twt/test-utils/audit';

declare function writeAuditLine(line: {
  actor_id: string;
  kind: string;
  payload: Record<string, unknown>;
}): Promise<{ id: string; this_hash: string; prev_hash: string }>;

declare function mutateAuditRowDirectly(args: {
  id: string;
  new_payload: Record<string, unknown>;
}): Promise<void>;

declare function runAuditIntegrityCheck(): Promise<{
  ok: boolean;
  first_break_id: string | null;
  first_break_reason: string | null;
}>;

declare function getOffsiteMirrorDiff(): Promise<{
  diverged: boolean;
  first_divergence_id: string | null;
}>;

declare class TestClock {
  static install(): TestClock;
  advance(seconds: number): Promise<void>;
}

describe('@P0 @Audit @Chaos audit integrity is independent of sole-engineer access', () => {
  test.skip('mutation by sole-engineer credential is detected within 24 h by integrity check', async () => {
    const clock = TestClock.install();

    // Step 1: write a few legitimate audit lines to build the chain.
    const lines = await Promise.all([
      writeAuditLine({ actor_id: 'admin-1', kind: 'member.suspended', payload: { m: 'm1' } }),
      writeAuditLine({ actor_id: 'admin-1', kind: 'claim.approved', payload: { c: 'c1' } }),
      writeAuditLine({ actor_id: 'admin-1', kind: 'pool.spawned', payload: { p: 'p1' } }),
    ]);
    const target = lines[1];

    // Step 2: integrity check passes BEFORE tamper.
    const before = await runAuditIntegrityCheck();
    expect(before.ok).toBe(true);

    // Step 3: tamper via sole-engineer credential (this is the credential that
    // owns the prod DB; the test asserts that even WITH this credential the
    // check still detects mutation, because the verifier runs in an isolated
    // IAM environment per AR-10).
    // The harness wraps the mutation in `withSoleEngineerCredential` so the
    // SQL bypasses the application layer entirely.
    // await withSoleEngineerCredential(() =>
    await mutateAuditRowDirectly({
      id: target.id,
      new_payload: { c: 'tampered' },
    });
    // );

    // Step 4: advance time up to 24 h; integrity check MUST fail by then.
    await clock.advance(24 * 60 * 60);
    const after = await runAuditIntegrityCheck();
    expect(after.ok).toBe(false);
    expect(after.first_break_id).toBe(target.id);
    expect(after.first_break_reason).toMatch(/hash mismatch|chain break/i);
  });

  test.skip('off-site mirror diff detects divergence within 6 h', async () => {
    const clock = TestClock.install();

    const line = await writeAuditLine({
      actor_id: 'admin-2',
      kind: 'niyamavali.amended',
      payload: { clause: 'R8' },
    });

    await mutateAuditRowDirectly({ id: line.id, new_payload: { clause: 'R8-tampered' } });

    // Per AR-9: mirror replicates every 6 h. Diff MUST surface divergence.
    await clock.advance(6 * 60 * 60);
    const diff = await getOffsiteMirrorDiff();
    expect(diff.diverged).toBe(true);
    expect(diff.first_divergence_id).toBe(line.id);
  });

  test.skip('verifier IAM cannot mutate audit rows (independence assertion)', async () => {
    // Sanity check: the credential that EXECUTES the integrity check must NOT
    // be able to perform mutations. This is the heart of §2.10a.
    // The harness exposes a `withVerifierCredential` wrapper that uses only the
    // read-role IAM. A write attempt MUST throw a permission error.
    // await expect(
    //   withVerifierCredential(() => mutateAuditRowDirectly({ id: 'any', new_payload: {} })),
    // ).rejects.toThrow(/permission denied|insufficient_privilege/i);

    // RED-phase placeholder until verifier-credential harness lands:
    expect(true).toBe(false); // intentional FAIL — implementation gates this
  });
});
