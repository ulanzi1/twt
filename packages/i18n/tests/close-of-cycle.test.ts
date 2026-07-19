// Smoke test for the `close-of-cycle` namespace (Story 7.8) — resolves one key per
// outcome family (fully_funded / under_funded / partial) via `t()` in BOTH locales,
// proving the namespace is registered + interpolates the token contract end-to-end.
// The authoritative governance assertions (no dangling keys; no prohibited frame in
// the resolved copy) live in the domain framing test + scripts/microcopy/close-of-cycle.test.ts.

import { describe, expect, it } from 'vitest';

import { t } from '../src/resolver.js';

const PARAMS = { poolLabel: 'P-2026-05-001', contributorCount: 214, familyName: 'Sharma', amount: '₹4,20,000' };

describe('close-of-cycle namespace', () => {
  for (const locale of ['hi', 'en'] as const) {
    for (const outcome of ['fully_funded', 'under_funded', 'partial'] as const) {
      it(`resolves ${locale}/${outcome}.{title,body} with the token contract`, () => {
        const title = t(`${outcome}.title`, PARAMS, { locale, namespace: 'close-of-cycle' });
        const body = t(`${outcome}.body`, PARAMS, { locale, namespace: 'close-of-cycle' });
        // Interpolation ran — the pool label + amount landed, and no `{token}` remains.
        expect(title).toContain('P-2026-05-001');
        expect(body).toContain('₹4,20,000');
        expect(body).toContain('Sharma');
        expect(`${title} ${body}`).not.toMatch(/\{[a-zA-Z]+\}/);
      });
    }
  }
});
