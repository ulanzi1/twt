import { describe, expect, it } from 'vitest';

import { scanCanonicalIdViolations } from './lib.js';

/** Wrap a statement inside a function body so AST positions are stable. */
const wrap = (body: string): string => `export function q(db: any) {\n  ${body}\n}\n`;

describe('scanCanonicalIdViolations — claim-canonical-id-invariant gate teeth', () => {
  // ── KNOWN-BAD fixtures (the teeth): a downstream flow keying on the intake-attempt id ──

  it('FLAGS a downstream fn that takes intakeAttemptId as a lookup PARAM', () => {
    const src =
      `export function loadVerification(db: any, intakeAttemptId: string) {\n` +
      `  return db.select().from(verifications).where(eq(verifications.attemptId, intakeAttemptId));\n` +
      `}\n`;
    const f = scanCanonicalIdViolations('verification.ts', src);
    expect(f.length).toBeGreaterThanOrEqual(1);
    expect(f[0]!.detail).toMatch(/intakeAttemptId/);
  });

  it("FLAGS a snake_case string-literal lookup key 'intake_attempt_id'", () => {
    const lit = scanCanonicalIdViolations('appeal.ts', wrap("return db.raw(\"WHERE x = :intake_attempt_id\", { 'intake_attempt_id': id });"));
    expect(lit.some((x) => x.detail.includes('intake_attempt_id'))).toBe(true);
  });

  it('FLAGS a bare snake_case object-literal key `{ intake_attempt_id: id }` (Review Finding)', () => {
    // `intake_attempt_id` IS a valid JS/TS identifier (underscores are legal) — an unquoted
    // object key parses as an Identifier node, same AST shape as `.intakeAttemptId`. A prior
    // version of this gate only matched the camelCase identifier spelling and missed this.
    const f = scanCanonicalIdViolations('appeal.ts', wrap('return db.query({ where: { intake_attempt_id: id } });'));
    expect(f.some((x) => x.detail.includes('intake_attempt_id'))).toBe(true);
  });

  it('FLAGS a raw snake_case property read `row.intake_attempt_id` (Review Finding)', () => {
    const f = scanCanonicalIdViolations('notify.ts', wrap('return lookup(row.intake_attempt_id);'));
    expect(f.some((x) => x.detail.includes('intake_attempt_id'))).toBe(true);
  });

  it('FLAGS the id embedded inside a larger string literal, e.g. a raw SQL fragment (Review Finding)', () => {
    const f = scanCanonicalIdViolations('appeal.ts', wrap("return db.raw('SELECT * FROM t WHERE intake_attempt_id = $1', [id]);"));
    expect(f.some((x) => x.detail.includes('intake_attempt_id'))).toBe(true);
  });

  it('FLAGS the id inside a template literal WITH substitutions (Review Finding)', () => {
    const f = scanCanonicalIdViolations('appeal.ts', wrap('return db.raw(`SELECT * FROM t WHERE x = ${id} AND intake_attempt_id = $2`);'));
    expect(f.some((x) => x.detail.includes('intake_attempt_id'))).toBe(true);
  });

  it('FLAGS an import of the intakeAttemptId brand constructor in a downstream module', () => {
    const src = `import { intakeAttemptId } from '@twt/domain';\nexport const x = intakeAttemptId;\n`;
    const f = scanCanonicalIdViolations('publication.ts', src);
    expect(f.length).toBeGreaterThanOrEqual(1);
  });

  it('FLAGS a `.intakeAttemptId` property read used as a key', () => {
    const f = scanCanonicalIdViolations('notify.ts', wrap('return lookup(row.intakeAttemptId);'));
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toMatch(/intakeAttemptId/);
  });

  // ── SELF-GREEN cases: canonical-id-only downstream code must NOT be flagged ──

  it('PASSES a downstream fn keyed on claimCaseId (the canonical id)', () => {
    const src =
      `export function loadVerification(db: any, claimCaseId: string) {\n` +
      `  return db.select().from(verifications).where(eq(verifications.claimCaseId, claimCaseId));\n` +
      `}\n`;
    expect(scanCanonicalIdViolations('verification.ts', src)).toHaveLength(0);
  });

  it('PASSES a claim_case_id string-literal lookup key', () => {
    expect(
      scanCanonicalIdViolations('appeal.ts', wrap("return db.raw(\"WHERE x = :claim_case_id\", { 'claim_case_id': id });")),
    ).toHaveLength(0);
  });

  it('does NOT match the token inside a comment', () => {
    const src = `// downstream never keys on intake_attempt_id / intakeAttemptId\nexport const x = 1;\n`;
    expect(scanCanonicalIdViolations('notify.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const f = scanCanonicalIdViolations('packages/x/notify.ts', wrap('return lookup(row.intakeAttemptId);'));
    expect(f[0]!.file).toBe('packages/x/notify.ts');
    expect(f[0]!.line).toBe(2);
  });
});
