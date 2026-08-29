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

// ⭐⭐ MIGRATED BY STORY 11b.9, AND THE MIGRATION IS THE POINT OF THE FILE — read this first.
//
// The two sides this file compares STOPPED BEING THE SAME SET, deliberately (`2026-08-28-162` cl.2):
//   · UI LABELS (`packages/i18n/locales/{en,hi}/claim.json`) — ⛔ the three publication label keys
//     were REMOVED with their checkboxes. Only `dpdpa.processing` remains.
//   · ⭐ SERVER EVIDENCE COPY (`DPDPA_CONSENT_COPY`) — ⛔ STAYS IN FULL. It is what makes an
//     ALREADY-WRITTEN row explicable ("what exactly did this family agree to?"), it is
//     `Record`-TOTAL over the preserved `DpdpaConsentType`, and it is read back today by
//     `dpdpa-consent-helpline.spec.ts`.
//
// ⇒ this file now asserts TWO different things instead of one, and the split IS the contract:
//   (1) the ONE live label is still byte-identical to its evidence copy (the original guarantee);
//   (2) the three retired ones have ⛔ NO label and ⭐ STILL HAVE evidence copy.
// ⛔⛔ IF (2) GOES RED BECAUSE AN EVIDENCE ENTRY WAS DELETED, THAT IS AN **AC4 VIOLATION** — revert
// the SOURCE, ⛔ never the test. Deleting the enum values to make a narrowed Record typecheck is
// precisely the deletion `2026-08-28-160` cl.5 forbids.
describe('DPDPA consent copy — server canonical text matches the mobile dpdpa.* i18n keys', () => {
  const LOCALES = ['en', 'hi'] as const;
  // ⚠ Typed `Record<DpdpaConsentType, …>` ON PURPOSE (Story 11b.1): as a bare object literal this map
  // was hand-maintained, so a NEW consent type would simply not be covered and every existing case
  // would still pass — the drift would be SILENT, which is the exact failure this file was written to
  // prevent. The Record type makes omitting a type a TYPECHECK error, and the exhaustiveness test
  // below makes it a runtime failure too (belt and braces — the same two-direction discipline
  // `catalog-registration.test.ts` uses for KNOWN_NAMESPACES).
  //
  // ⚠ `null` = ⛔ NO UI LABEL, because the box was RETIRED — ⛔ not "unmapped" and ⛔ not an omission
  // to be filled in later. The Record stays TOTAL so a genuinely new type is still a typecheck error.
  const KEY_BY_TYPE: Record<DpdpaConsentType, string | null> = {
    claim_time_dpdpa: 'dpdpa.processing',
    // ⛔ RETIRED by `2026-08-28-162` cl.2 — box gone, label key gone, evidence copy PRESERVED.
    sahyog_vivran_publication: null,
    in_memoriam_listing: null,
    // ⛔ RETIRED by `-162` cl.2; its render gate separately DE-AUTHORISED by `-160` cl.3-5.
    sahyog_drive_publication: null,
  };

  /** The types whose box the family can still see and tick. ⭐ Exactly one, since 11b.9. */
  const LIVE_TYPES = Object.entries(KEY_BY_TYPE).filter(([, key]) => key !== null) as [
    DpdpaConsentType,
    string,
  ][];
  /** Retired boxes: ⛔ no label, ⭐ evidence copy preserved. */
  const RETIRED_TYPES = Object.entries(KEY_BY_TYPE)
    .filter(([, key]) => key === null)
    .map(([type]) => type as DpdpaConsentType);

  for (const locale of LOCALES) {
    const claimJson = loadClaimJson(locale);

    for (const [consentType, i18nKey] of LIVE_TYPES) {
      it(`${locale}/${consentType}: mobile "${i18nKey}" is byte-identical to the server copy`, () => {
        const serverCopy = resolveDpdpaConsentCopy(consentType, locale);
        expect(claimJson[i18nKey]).toBe(serverCopy);
      });
    }

    for (const consentType of RETIRED_TYPES) {
      it(`${locale}/${consentType}: the UI label is GONE but the EVIDENCE copy is preserved`, () => {
        // ⛔ The box is retired, so no family will ever read a label for it again…
        expect(claimJson[`dpdpa.${consentType}`]).toBeUndefined();
        // …⭐ but the canonical text recorded against rows already written must still resolve.
        // ⛔ If this is undefined, an evidence entry was deleted — that is the AC4 violation.
        expect(resolveDpdpaConsentCopy(consentType, locale)).toBeTruthy();
      });
    }
  }

  it('EVERY DpdpaConsentType has an entry — a new type cannot be silently uncovered', () => {
    expect(Object.keys(KEY_BY_TYPE).sort()).toEqual([...DpdpaConsentType.options].sort());
  });

  it('⭐ exactly ONE box is still captured — the screen reduced to (a) alone (-162 cl.2)', () => {
    expect(LIVE_TYPES.map(([type]) => type)).toEqual(['claim_time_dpdpa']);
  });

  it('⛔ no retired label key survives in EITHER locale — the i18n-parity leg checks both', () => {
    for (const locale of LOCALES) {
      const claimJson = loadClaimJson(locale);
      for (const retiredKey of ['dpdpa.sahyog_vivran', 'dpdpa.in_memoriam', 'dpdpa.sahyog_drive']) {
        expect(claimJson[retiredKey]).toBeUndefined();
      }
    }
  });

  // ⭐⛔ PRESERVED AS EVIDENCE, ⛔ NOT AS A LIVE PROMISE — and the distinction is the whole of this
  // block after 11b.9. The declinability sentence lives INSIDE each retired label string, so it left
  // the UI with the box. It must STILL be in the EVIDENCE copy, because that copy is the record of
  // what a family who granted BEFORE 11b.9 actually read and relied on. ⛔ Rewriting it would
  // retroactively change the terms of a consent already given.
  //
  // ⚠⛔ AND ⛔ DO NOT READ THIS BLOCK AS A LIVE RULE ANY MORE. Its original ground was that
  // "Niyamavali §4.4, Part 10 and (prevailing above both, cl.28) Trust Deed cl.15(c) forbid default
  // opt-in". ⛔ Both cited authorities are UNRATIFIED drafts (`2026-08-28-164` cl.1 / `-167`), and the
  // mechanism is superseded: `-160` cl.3 rests publication on the member's own accepted T&C — a
  // CONDITION OF MEMBERSHIP — and cl.6 removed the family's decline path on purpose.
  describe('the declinability sentence is preserved in the EVIDENCE copy, both locales', () => {
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
        it(`${locale}/${consentType} — the recorded evidence text still says it could be declined`, () => {
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
