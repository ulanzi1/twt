// Story 6.19a (D15, AC11a) — the filer's AGREEMENT TO BE CONTACTED: the server's evidence copy is BYTE-IDENTICAL
// with the `contact.agreement` key the member app shows and the helpline card reads aloud (the
// `dpdpa-consent-copy.test.ts` precedent). A hand-edit to either side that drifts from the other fails here,
// instead of silently recording text the family never read.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CLAIM_CONTACT_AGREEMENT_COPY_VERSION,
  resolveClaimContactAgreementCopy,
} from '../../src/modules/claims/claim-contact-copy.js';

const here = dirname(fileURLToPath(import.meta.url));
const i18nLocalesDir = join(here, '../../../../packages/i18n/locales');
const claimJson = (locale: 'en' | 'hi'): Record<string, string> =>
  JSON.parse(readFileSync(join(i18nLocalesDir, locale, 'claim.json'), 'utf8')) as Record<string, string>;

describe('the claim-contact agreement copy — server evidence ↔ the app’s `contact.agreement`', () => {
  for (const locale of ['en', 'hi'] as const) {
    it(`[${locale}] ⭐ byte-identical`, () => {
      expect(claimJson(locale)['contact.agreement']).toBe(resolveClaimContactAgreementCopy(locale));
    });
  }

  it('⚠ the version carries the "pending Story 0.13" marker until counsel returns (M — launch-gate row 18)', () => {
    expect(CLAIM_CONTACT_AGREEMENT_COPY_VERSION).toMatch(/pending-story-0\.13/);
  });
});
