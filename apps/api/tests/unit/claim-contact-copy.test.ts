// Story 6.19a (D15, AC11a) — the filer's AGREEMENT TO BE CONTACTED: the server's evidence copy is BYTE-IDENTICAL
// with the `contact.agreement` key the member app shows and the helpline card reads aloud (the
// `dpdpa-consent-copy.test.ts` precedent). A hand-edit to either side that drifts from the other fails here,
// instead of silently recording text the family never read.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { claim } from '@twt/domain';
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

// Story 6.37d (WS2 (ii)) — the versions live in the DOMAIN registry; the api re-exports the current one.
describe('the agreement registry — v1 kept as evidence, v2 current', () => {
  const v1 = claim.CLAIM_CONTACT_AGREEMENT_VERSIONS['2026-09-28.v1-pending-story-0.13'];

  it('⭐ v1 is BYTE-IDENTICAL to Story 6.19a’s words (every row written under it stays explicable)', () => {
    expect(v1).toEqual({
      en: 'I agree that the Trust may contact the nominees and the claimant named here, by text message and by post, about this claim.',
      hi: 'मैं सहमति देता/देती हूँ कि ट्रस्ट इस दावे के बारे में यहाँ दिए गए नॉमिनी और दावेदार से टेक्स्ट संदेश और डाक द्वारा संपर्क कर सकता है।',
      namesWhatsapp: false,
      hiReviewed: false,
    });
  });

  it('⭐ the current version is v2 — it names WhatsApp, its Hindi ⛔ yet reviewed (Row 36 (a)), the api re-exports it', () => {
    expect(CLAIM_CONTACT_AGREEMENT_COPY_VERSION).toBe(claim.CLAIM_CONTACT_AGREEMENT_COPY_VERSION);
    expect(CLAIM_CONTACT_AGREEMENT_COPY_VERSION).toBe('2026-10-20.v2-pending-story-0.13');
    const v2 = claim.CLAIM_CONTACT_AGREEMENT_VERSIONS[CLAIM_CONTACT_AGREEMENT_COPY_VERSION]!;
    expect(v2.namesWhatsapp).toBe(true);
    expect(v2.hiReviewed).toBe(false);
    expect(v2.en).toBe('I agree that the Trust may contact me by text message, WhatsApp, phone call or post, about this claim.');
  });

  it('every version id carries the marker; only v1 omits WhatsApp', () => {
    for (const [id, v] of Object.entries(claim.CLAIM_CONTACT_AGREEMENT_VERSIONS)) {
      expect(id).toMatch(/pending-story-0\.13/);
      expect(v.namesWhatsapp).toBe(id !== '2026-09-28.v1-pending-story-0.13');
    }
  });

  it('⛔ the claim.json files carry the "not yet reviewed" marker EXACTLY while the current Hindi is unreviewed (G3 (a) flips both in ONE commit)', () => {
    const current = claim.CLAIM_CONTACT_AGREEMENT_VERSIONS[CLAIM_CONTACT_AGREEMENT_COPY_VERSION]!;
    for (const locale of ['en', 'hi'] as const) {
      const marked = /NOT YET HUMAN-REVIEWED/.test(String(claimJson(locale)['$comment.contact_agreement'] ?? ''));
      expect(marked).toBe(!current.hiReviewed);
    }
  });
});
