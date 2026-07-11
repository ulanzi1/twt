// DPDPA claim-time consent copy — server ↔ mobile lockstep — DB-free unit test (Story 6.9 code
// review). The Dev Agent Record claims the mobile `dpdpa.*` i18n copy is "byte-identical" to the
// server's canonical `resolveDpdpaConsentCopy` text; nothing in the diff actually asserted that.
// This reads both locale JSON files directly (no @twt/i18n package dependency needed) and compares
// them against the server copy per (consent type × locale), so a future hand-edit to either side
// that drifts from the other fails CI instead of silently diverging the evidence text from what the
// family actually read.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveDpdpaConsentCopy } from '../../src/modules/claims/dpdpa-consent-copy.js';

const here = dirname(fileURLToPath(import.meta.url));
const i18nLocalesDir = join(here, '../../../../packages/i18n/locales');

function loadClaimJson(locale: 'en' | 'hi'): Record<string, string> {
  return JSON.parse(readFileSync(join(i18nLocalesDir, locale, 'claim.json'), 'utf8')) as Record<
    string,
    string
  >;
}

describe('DPDPA consent copy — server canonical text matches the mobile dpdpa.* i18n keys', () => {
  const LOCALES = ['en', 'hi'] as const;
  const KEY_BY_TYPE = {
    claim_time_dpdpa: 'dpdpa.processing',
    sahyog_vivran_publication: 'dpdpa.sahyog_vivran',
    in_memoriam_listing: 'dpdpa.in_memoriam',
  } as const;

  for (const locale of LOCALES) {
    const claimJson = loadClaimJson(locale);
    for (const [consentType, i18nKey] of Object.entries(KEY_BY_TYPE)) {
      it(`${locale}/${consentType}: mobile "${i18nKey}" is byte-identical to the server copy`, () => {
        const serverCopy = resolveDpdpaConsentCopy(
          consentType as keyof typeof KEY_BY_TYPE,
          locale,
        );
        expect(claimJson[i18nKey]).toBe(serverCopy);
      });
    }
  }
});
