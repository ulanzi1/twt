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

import { DpdpaConsentType } from '@twt/contracts';
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
  // ⚠ Typed `Record<DpdpaConsentType, …>` ON PURPOSE (Story 11b.1): as a bare object literal this map
  // was hand-maintained, so a NEW consent type would simply not be covered and every existing case
  // would still pass — the drift would be SILENT, which is the exact failure this file was written to
  // prevent. The Record type makes omitting a type a TYPECHECK error, and the exhaustiveness test
  // below makes it a runtime failure too (belt and braces — the same two-direction discipline
  // `catalog-registration.test.ts` uses for KNOWN_NAMESPACES).
  const KEY_BY_TYPE: Record<DpdpaConsentType, string> = {
    claim_time_dpdpa: 'dpdpa.processing',
    sahyog_vivran_publication: 'dpdpa.sahyog_vivran',
    in_memoriam_listing: 'dpdpa.in_memoriam',
    // Story 11b.1 (D4(b)) — the fourth box: the deceased member's name on the public Sahyog Drive.
    sahyog_drive_publication: 'dpdpa.sahyog_drive',
  };

  for (const locale of LOCALES) {
    const claimJson = loadClaimJson(locale);
    for (const [consentType, i18nKey] of Object.entries(KEY_BY_TYPE)) {
      it(`${locale}/${consentType}: mobile "${i18nKey}" is byte-identical to the server copy`, () => {
        const serverCopy = resolveDpdpaConsentCopy(consentType as DpdpaConsentType, locale);
        expect(claimJson[i18nKey]).toBe(serverCopy);
      });
    }
  }

  it('EVERY DpdpaConsentType has a mobile key — a new type cannot be silently uncovered', () => {
    expect(Object.keys(KEY_BY_TYPE).sort()).toEqual([...DpdpaConsentType.options].sort());
  });

  // Story 11b.1 AC12 / Decision 2026-08-24-159 cl.1: the three PUBLICATION consents must each say, in
  // both locales, that declining costs the family nothing. This is not tone — Niyamavali §4.4, Part 10
  // and (prevailing above both, cl.28) Trust Deed cl.15(c) forbid default opt-in, and a consent that
  // the family believes is compulsory is not consent. The processing consent (a) is deliberately
  // EXCLUDED: it genuinely is required to proceed, so promising declinability there would be a lie.
  describe('the declinability sentence is present on every publication consent, both locales', () => {
    const DECLINABILITY = {
      en: 'You may decline this without affecting the claim.',
      hi: 'आप इसे अस्वीकार कर सकते हैं, इससे दावे पर कोई असर नहीं होगा।',
    } as const;
    const PUBLICATION_TYPES = [
      'sahyog_vivran_publication',
      'in_memoriam_listing',
      'sahyog_drive_publication',
    ] as const satisfies readonly DpdpaConsentType[];

    for (const locale of LOCALES) {
      for (const consentType of PUBLICATION_TYPES) {
        it(`${locale}/${consentType} states it may be declined`, () => {
          expect(resolveDpdpaConsentCopy(consentType, locale)).toContain(DECLINABILITY[locale]);
        });
      }
    }

    it('the PROCESSING consent does NOT promise declinability (it is genuinely required)', () => {
      for (const locale of LOCALES) {
        expect(resolveDpdpaConsentCopy('claim_time_dpdpa', locale)).not.toContain(
          DECLINABILITY[locale],
        );
      }
    });
  });
});
