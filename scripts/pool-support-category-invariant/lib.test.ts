import { describe, expect, it } from 'vitest';

import { scanDeathBranches } from './lib.js';

describe('scanDeathBranches — pool-support-category-invariant gate teeth', () => {
  // ── KNOWN-BAD fixtures (the teeth): a death-specific branch → RED ──────────────
  it("FLAGS a hardcoded === 'death' branch", () => {
    const src = `export function f(cat: string) {\n  if (cat === 'death') return payout();\n  return null;\n}\n`;
    const f = scanDeathBranches('f.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0]!.line).toBe(2);
  });

  it("FLAGS a hardcoded 'death_support' literal", () => {
    const src = `const V1_CATEGORY = 'death_support';\n`;
    const f = scanDeathBranches('f.ts', src);
    expect(f).toHaveLength(1);
    expect(f[0]!.line).toBe(1);
  });

  it('FLAGS a switch case on death', () => {
    const src = `switch (cat) {\n  case 'death_support':\n    return 1;\n}\n`;
    expect(scanDeathBranches('f.ts', src)).toHaveLength(1);
  });

  it('FLAGS the token in a comment too (the engine must not even think in death terms)', () => {
    const src = `// special-case death here\nconst x = 1;\n`;
    expect(scanDeathBranches('f.ts', src)).toHaveLength(1);
  });

  it('FLAGS case-insensitively (Death / DEATH)', () => {
    expect(scanDeathBranches('f.ts', `const a = 'Death';\n`)).toHaveLength(1);
    expect(scanDeathBranches('f.ts', `const b = 'DEATH';\n`)).toHaveLength(1);
  });

  it('reports the correct file + 1-based line', () => {
    const src = `line1\nline2\nif (x === 'death') {}\n`;
    const f = scanDeathBranches('packages/domain/src/pool/engine.ts', src);
    expect(f[0]!.file).toBe('packages/domain/src/pool/engine.ts');
    expect(f[0]!.line).toBe(3);
  });

  // ── PASSES (no false positive): category-agnostic engine code ─────────────────
  it('PASSES code that keys on the enum, never a death literal', () => {
    const src =
      `import { POOL_SUPPORT_CATEGORIES } from '../schema/pools.js';\n` +
      `export function f(cat: (typeof POOL_SUPPORT_CATEGORIES)[number]) {\n` +
      `  return POOL_SUPPORT_CATEGORIES.includes(cat);\n` +
      `}\n`;
    expect(scanDeathBranches('f.ts', src)).toHaveLength(0);
  });

  it("PASSES 'deceased' — a different word that does NOT contain the death token", () => {
    expect(scanDeathBranches('f.ts', `const id = deceasedMemberId;\n`)).toHaveLength(0);
  });

  it('PASSES support_category / benefit_mechanism generic references', () => {
    const src = `const c = row.supportCategory;\nconst b = row.benefitMechanism;\n`;
    expect(scanDeathBranches('f.ts', src)).toHaveLength(0);
  });
});
