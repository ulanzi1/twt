import { describe, expect, it } from 'vitest';

import { scanCrossPoolRemap } from './lib.js';

describe('scanCrossPoolRemap — pool-bound-payment-invariant gate teeth', () => {
  // ── KNOWN-BAD fixtures (the teeth): a cross-pool remap surface → RED ───────────
  it('FLAGS a function that pairs a wrong-pool payment with a target pool AND writes (auto-move)', () => {
    const src =
      `async function remapWrongPoolPayment(db, payment, targetPool) {\n` +
      `  await db.update(pools).set({ claimCaseId: targetPool.claimCaseId }).where(eq(pools.poolId, payment.poolId));\n` +
      `}\n`;
    const f = scanCrossPoolRemap('remap.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0]!.line).toBe(1);
    expect(f[0]!.functionName).toBe('remapWrongPoolPayment');
  });

  it('FLAGS the destructured-object signature form ({ payment, destinationPool })', () => {
    const src =
      `export const movePayment = async ({ payment, destinationPool }) => {\n` +
      `  await db.insert(contributions).values({ poolId: destinationPool.id, amount: payment.amount });\n` +
      `};\n`;
    const f = scanCrossPoolRemap('move.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0]!.functionName).toBe('movePayment');
  });

  it('FLAGS an auto-reassign handler (contribution + reassignPool params that write)', () => {
    const src =
      `function autoReassign(contribution, reassignToPool) {\n` +
      `  return db.update(members).set({ pool: reassignToPool }).where(eq(members.id, contribution.memberId));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('r.ts', src)).toHaveLength(1);
  });

  // ── AC3.9(a)/(c)'s OWN wording ("move to the member's assigned pool" / "phantom … in the assigned
  // pool") — the code-review-verified exploit that evaded the pre-fix naming regex ────────────────────
  it('FLAGS auto-move-to-assigned-pool (AC3.9(a) exact wording, params named with "assigned")', () => {
    const src =
      `async function moveWrongPoolPaymentToAssignedPool(db, payment, assignedPoolId) {\n` +
      `  await db.update(contributions).set({ poolId: assignedPoolId }).where(eq(contributions.id, payment.id));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('move-assigned.ts', src)).toHaveLength(1);
  });

  it('FLAGS auto-create-phantom-in-assigned-pool (AC3.9(c) exact wording)', () => {
    const src =
      `async function createPhantomContributionInAssignedPool(db, wrongPoolPayment, assignedPool) {\n` +
      `  await db.insert(contributions).values({ poolId: assignedPool.id, amount: wrongPoolPayment.amount });\n` +
      `}\n`;
    expect(scanCrossPoolRemap('phantom-assigned.ts', src)).toHaveLength(1);
  });

  it('FLAGS a reverse-order target-pool name the earlier asymmetric regex missed (poolCorrect, poolMove)', () => {
    const src =
      `function fixup(payment, poolCorrect) {\n` +
      `  return db.update(contributions).set({ poolId: poolCorrect }).where(eq(contributions.id, payment.id));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('reverse-order.ts', src)).toHaveLength(1);
  });

  // ── The codebase's actual Fastify handler idiom: `request.body` read INSIDE the body, not the
  // signature — the code-review-verified exploits that evaded the parameter-list-only scan ────────────
  it('FLAGS the request.body-destructuring handler idiom (one of the two request.body read shapes)', () => {
    const src =
      `async function correctWrongPoolPayment(request) {\n` +
      `  const { contributionId, targetPoolId } = request.body;\n` +
      `  await db.update(contributions).set({ poolId: targetPoolId }).where(eq(contributions.id, contributionId));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('handler.ts', src)).toHaveLength(1);
  });

  it('FLAGS the request.body PROPERTY-ACCESS handler idiom (the shape this repo actually uses)', () => {
    const src =
      `async function correctWrongPoolPayment(request) {\n` +
      `  const contributionId = request.body.contributionId;\n` +
      `  const targetPoolId = request.body.targetPoolId;\n` +
      `  await db.update(contributions).set({ poolId: targetPoolId }).where(eq(contributions.id, contributionId));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('prop-access.ts', src)).toHaveLength(1);
  });

  it('FLAGS a whole-object `const b = request.body` alias then property reads (b.payment / b.targetPool)', () => {
    const src =
      `async function remap(request) {\n` +
      `  const b = request.body;\n` +
      `  await db.insert(contributions).values({ poolId: b.targetPool, amount: b.payment });\n` +
      `}\n`;
    expect(scanCrossPoolRemap('alias.ts', src)).toHaveLength(1);
  });

  // ── Ordinary single-function target-pool names the earlier synonym list missed (code-review finding) ─
  it('FLAGS the most natural remap-target name `newPoolId` (auto-move that writes)', () => {
    const src =
      `async function remapContribution(contribution, newPoolId) {\n` +
      `  await db.update(contributions).set({ poolId: newPoolId }).where(eq(contributions.id, contribution.id));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('newpool.ts', src)).toHaveLength(1);
  });

  it('FLAGS a `toPool` / `destPool` / `intoPool`-style target name that writes', () => {
    const src =
      `function moveDeposit(deposit, toPoolId) {\n` +
      `  return db.insert(contributions).values({ poolId: toPoolId, amount: deposit.amount });\n` +
      `}\n`;
    expect(scanCrossPoolRemap('topool.ts', src)).toHaveLength(1);
  });

  it('does NOT let a nested function-like node\'s body destructuring leak onto the outer function', () => {
    const src =
      `function outer(payment, targetPool) {\n` +
      `  const helper = () => {\n` +
      `    const { unrelated } = something;\n` +
      `    return unrelated;\n` +
      `  };\n` +
      `  return db.select().from(pools).where(eq(pools.id, targetPool));\n` +
      `}\n`;
    // outer has payment + targetPool but no write — the nested arrow's own destructuring must not
    // contribute a false payment/target-pool match onto a DIFFERENT function-like node either.
    expect(scanCrossPoolRemap('nested.ts', src)).toHaveLength(0);
  });

  // ── PASSES (no false positive): legitimate 7.6 surfaces ───────────────────────
  it('PASSES the pure classifier classifyContributionDestination (two pool ids, NO write)', () => {
    const src =
      `export function classifyContributionDestination(input) {\n` +
      `  const isWrongPool = input.depositedToPoolId !== input.assignedPoolId;\n` +
      `  return isWrongPool ? { verdict: 'wrong_pool' } : { verdict: 'valid' };\n` +
      `}\n`;
    expect(scanCrossPoolRemap('classify.ts', src)).toHaveLength(0);
  });

  it('PASSES the binding resolver (has a pool query but no target-pool param, read-only)', () => {
    const src =
      `export async function resolveMemberContributionBinding(db, pariwarId, cycleId, memberId) {\n` +
      `  return db.select().from(pools).where(eq(pools.cycleId, cycleId));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('resolve.ts', src)).toHaveLength(0);
  });

  it('PASSES the allowed helpdesk action — writes the wrong-pool RECORD itself, no target pool', () => {
    const src =
      `async function confirmContributionInvalid(db, contribution, reason) {\n` +
      `  await db.update(contributions).set({ validity: 'invalid', reason }).where(eq(contributions.id, contribution.id));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('helpdesk.ts', src)).toHaveLength(0);
  });

  it('PASSES a function that names a target pool but only READS (no mutation)', () => {
    const src =
      `function previewRemap(payment, targetPool) {\n` +
      `  return db.select().from(pools).where(eq(pools.poolId, targetPool.id));\n` +
      `}\n`;
    expect(scanCrossPoolRemap('preview.ts', src)).toHaveLength(0);
  });

  it('PASSES a pure function using Map.set/Object.values despite payment+target names (set/values are not DB writes)', () => {
    // Regression for dropping `set`/`values` from WRITE_METHODS — a Map.set / Object.values must NOT
    // read as a DB mutation, or a pure helper with payment+target-pool names would false-fail CI.
    const src =
      `function summarize(payment, targetPool) {\n` +
      `  const seen = new Map();\n` +
      `  seen.set(targetPool, payment);\n` +
      `  return Object.values(seen);\n` +
      `}\n`;
    expect(scanCrossPoolRemap('mapset.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const src =
      `\n\nasync function remap(payment, targetPool) {\n  await db.update(pools).set({ x: targetPool });\n}\n`;
    const f = scanCrossPoolRemap('packages/domain/src/pool/bad.ts', src);
    expect(f[0]!.file).toBe('packages/domain/src/pool/bad.ts');
    expect(f[0]!.line).toBe(3);
  });
});
