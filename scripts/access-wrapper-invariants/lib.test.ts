import { describe, expect, it } from 'vitest';

import { scanAccessWrapperInvariant } from './lib.js';

// The real guard shape (service.ts step 0), operand order preserved.
const GUARD =
  `  if (!opts.caller && !opts.internal) {\n` +
  `    throw new Error('[getX] opts.caller or opts.internal must be supplied');\n` +
  `  }\n`;

/** An exported async entrypoint returning Promise<MemberValidityPayload>, body injected. */
const entrypoint = (body: string): string =>
  `export async function getX(\n` +
  `  deps: any,\n` +
  `  ctx: any,\n` +
  `  opts: ValidityServiceOptions = {},\n` +
  `): Promise<MemberValidityPayload> {\n` +
  `${body}` +
  `}\n`;

describe('scanAccessWrapperInvariant — AI-4-3 gate teeth', () => {
  it('ACCEPTS an entrypoint with the caller-XOR-internal fail-closed guard', () => {
    const src = entrypoint(GUARD + `  const full = assemblePayload(input);\n  return full;\n`);
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('ACCEPTS the guard with reversed operand order (!internal && !caller)', () => {
    const guard =
      `  if (!opts.internal && !opts.caller) {\n    throw new Error('nope');\n  }\n`;
    const src = entrypoint(guard + `  return assemblePayload(input);\n`);
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('ACCEPTS a pure delegator that forwards its opts param to a guarded entrypoint', () => {
    // The getValidity → getValidityAt shape: a preceding `const` then a forwarding return.
    const src =
      `export async function getValidity(\n` +
      `  deps: any,\n  ctx: any,\n  opts: ValidityServiceOptions = {},\n` +
      `): Promise<MemberValidityPayload> {\n` +
      `  const now = await selectDbNow(deps.db);\n` +
      `  return getValidityAt(deps, ctx, now, opts);\n` +
      `}\n`;
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('FLAGS an entrypoint that assembles + returns the full payload with NO guard (the 4.6 regression)', () => {
    const src = entrypoint(`  const full = assemblePayload(input);\n  return full;\n`);
    const f = scanAccessWrapperInvariant('service.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0].fn).toBe('getX');
  });

  it('FLAGS a "delegator" that forwards a literal { internal: true } (auto-internal bypass)', () => {
    // Does NOT forward the caller-supplied opts — it hard-codes internal access. Must guard.
    const src = entrypoint(`  return getValidityAt(deps, ctx, now, { internal: true });\n`);
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(1);
  });

  it('does NOT flag a sync helper returning a BARE (non-Promise) payload (assemblePayload/redactForCaller)', () => {
    const src =
      `export function assemblePayload(input: AssembleInput): MemberValidityPayload {\n` +
      `  return { ...input } as MemberValidityPayload;\n` +
      `}\n` +
      `export function redactForCaller(p: MemberValidityPayload, c: any): MemberValidityPayload {\n` +
      `  return p;\n` +
      `}\n`;
    expect(scanAccessWrapperInvariant('redaction.ts', src)).toHaveLength(0);
  });

  it('does NOT flag an async fn that returns something other than the payload (Promise<void> audit writer)', () => {
    const src =
      `export async function auditValidityRead(deps: any, ctx: any, p: any, c: any): Promise<void> {\n` +
      `  await deps.write(p);\n` +
      `}\n`;
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(0);
  });

  it('does NOT match a caller/internal mention inside a comment or string', () => {
    const src = entrypoint(
      `  // opts.caller and opts.internal are documented here but not guarded\n` +
        `  const note = "if (!opts.caller && !opts.internal) throw";\n` +
        `  return assemblePayload(input);\n`,
    );
    // No real guard node → still flagged (the prose must not satisfy the gate).
    expect(scanAccessWrapperInvariant('service.ts', src)).toHaveLength(1);
  });

  it('reports the correct file, 1-based line, and function name', () => {
    const src = `\n\n` + entrypoint(`  return assemblePayload(input);\n`);
    const f = scanAccessWrapperInvariant('packages/validity-service/src/service.ts', src);
    expect(f[0].file).toBe('packages/validity-service/src/service.ts');
    expect(f[0].fn).toBe('getX');
    expect(f[0].line).toBe(3); // two blank lines + `export async function getX` on line 3
  });
});
