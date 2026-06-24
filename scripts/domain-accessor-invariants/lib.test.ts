import { describe, expect, it } from 'vitest';

import { scanLimitInvariant } from './lib.js';

/** Wrap a `.limit(<arg>)` in a minimal query so the arg sits on source line 3. */
const wrap = (limitArg: string): string =>
  `import { clampLimit } from '../pagination.js';\n` +
  `export function q(db: any, opts: any) {\n` +
  `  return db.select().from(t).limit(${limitArg});\n` +
  `}\n`;

describe('scanLimitInvariant — family-(a) gate teeth', () => {
  it('ACCEPTS an integer-literal limit (fixed bound)', () => {
    expect(scanLimitInvariant('f.ts', wrap('1'))).toHaveLength(0);
    expect(scanLimitInvariant('f.ts', wrap('50'))).toHaveLength(0);
  });

  it('ACCEPTS a clampLimit(...) call', () => {
    expect(
      scanLimitInvariant('f.ts', wrap('clampLimit(opts.limit, { default: 50, cap: 200 })')),
    ).toHaveLength(0);
  });

  it('FLAGS a raw caller limit', () => {
    const f = scanLimitInvariant('f.ts', wrap('opts.limit'));
    expect(f).toHaveLength(1);
    expect(f[0].expr).toBe('opts.limit');
  });

  it('FLAGS the `opts.limit ?? N` default-without-clamp form', () => {
    expect(scanLimitInvariant('f.ts', wrap('opts.limit ?? 50'))).toHaveLength(1);
  });

  it('FLAGS the `Math.min(...)` cap-without-lower-bound form (the 2.7 P2 bypass class)', () => {
    expect(scanLimitInvariant('f.ts', wrap('Math.min(opts.limit ?? 50, 200)'))).toHaveLength(1);
  });

  it('does NOT match a `.limit(` substring inside a comment or string literal', () => {
    const src = `// prose mentioning .limit(opts.limit)\nconst s = ".limit(opts.foo)";\n`;
    expect(scanLimitInvariant('f.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const f = scanLimitInvariant('packages/domain/src/x/read.ts', wrap('opts.limit'));
    expect(f[0].file).toBe('packages/domain/src/x/read.ts');
    expect(f[0].line).toBe(3);
  });
});
