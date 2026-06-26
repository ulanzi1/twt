import { describe, expect, it } from 'vitest';

import { isForbiddenModule, scanForbiddenTransportImports } from './lib.js';

describe('scanForbiddenTransportImports — kyc-provider-boundary gate teeth', () => {
  it('FLAGS a static `import … from "xml-crypto"`', () => {
    const f = scanForbiddenTransportImports('f.ts', `import { SignedXml } from 'xml-crypto';`);
    expect(f).toHaveLength(1);
    expect(f[0]!.module).toBe('xml-crypto');
  });

  it('FLAGS a side-effect import + a subpath import', () => {
    const f = scanForbiddenTransportImports(
      'f.ts',
      `import 'xml-crypto';\nimport { DOMParser } from '@xmldom/xmldom';\nimport * as xp from 'xpath/lib';`,
    );
    expect(f.map((x) => x.module).sort()).toEqual(['@xmldom/xmldom', 'xml-crypto', 'xpath/lib']);
  });

  it('FLAGS a re-export, a dynamic import, and a require', () => {
    const src =
      `export { SignedXml } from 'xml-crypto';\n` +
      `const a = await import('@xmldom/xmldom');\n` +
      `const b = require('xpath');\n`;
    expect(scanForbiddenTransportImports('f.ts', src)).toHaveLength(3);
  });

  it('PASSES imports of the contracts port + unrelated modules', () => {
    const src =
      `import type { KycProvider } from '@twt/contracts';\n` +
      `import { kyc } from '@twt/domain';\n` +
      `import { z } from 'zod';\n`;
    expect(scanForbiddenTransportImports('f.ts', src)).toHaveLength(0);
  });

  it('does NOT match a banned module name inside a comment or string literal', () => {
    const src =
      `// we deliberately keep xml-crypto out of this file\n` +
      `const note = "import { X } from 'xml-crypto'";\n`;
    expect(scanForbiddenTransportImports('f.ts', src)).toHaveLength(0);
  });

  it('reports the correct file + 1-based line', () => {
    const f = scanForbiddenTransportImports(
      'apps/api/src/x/y.ts',
      `const k = 1;\nimport { SignedXml } from 'xml-crypto';\n`,
    );
    expect(f[0]!.file).toBe('apps/api/src/x/y.ts');
    expect(f[0]!.line).toBe(2);
  });

  it('isForbiddenModule matches exact roots + subpaths, not similar names', () => {
    expect(isForbiddenModule('xml-crypto')).toBe(true);
    expect(isForbiddenModule('xml-crypto/lib/signed-xml.js')).toBe(true);
    expect(isForbiddenModule('@xmldom/xmldom')).toBe(true);
    expect(isForbiddenModule('xml-crypto-helpers')).toBe(false); // not a subpath
    expect(isForbiddenModule('fast-xml-parser')).toBe(false);
  });
});
