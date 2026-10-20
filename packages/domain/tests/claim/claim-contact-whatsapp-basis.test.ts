// Story 6.37d AC2 — the claimant's WhatsApp basis (`-357` G3): eligible ONLY on a live agreement whose KNOWN
// version names WhatsApp, and — agreed in Hindi — whose Hindi was reviewed. Every unknown fails closed.

import { describe, expect, it } from 'vitest';

import {
  CLAIM_CONTACT_AGREEMENT_VERSIONS,
  type ClaimContactAgreementVersion,
} from '../../src/claim/claim-contact-agreement-copy.js';
import { evaluateClaimantWhatsappBasis } from '../../src/claim/claim-contact-whatsapp-basis.js';

const V1 = '2026-09-28.v1-pending-story-0.13';
const V2 = '2026-10-20.v2-pending-story-0.13';

describe('evaluateClaimantWhatsappBasis', () => {
  it('⭐ v2 agreed in English ⇒ eligible', () => {
    expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: { copyVersion: V2, locale: 'en' } })).toEqual({
      eligible: true,
      copyVersion: V2,
    });
  });

  it('⭐ v2 agreed in Hindi ⇒ hindi_not_reviewed while v2’s Hindi is unreviewed (Row 36 (a))', () => {
    expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: { copyVersion: V2, locale: 'hi' } })).toEqual({
      eligible: false,
      reason: 'hindi_not_reviewed',
    });
  });

  it('a Hindi agreement on a version whose Hindi IS reviewed ⇒ eligible', () => {
    const reviewed: ClaimContactAgreementVersion = { ...CLAIM_CONTACT_AGREEMENT_VERSIONS[V2]!, hiReviewed: true };
    // The registry is typed read-only; swap the one entry for this leg and restore it.
    const registry = CLAIM_CONTACT_AGREEMENT_VERSIONS as Record<string, ClaimContactAgreementVersion>;
    const saved = registry[V2]!;
    registry[V2] = reviewed;
    try {
      expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: { copyVersion: V2, locale: 'hi' } })).toEqual({
        eligible: true,
        copyVersion: V2,
      });
    } finally {
      registry[V2] = saved;
    }
  });

  it('⛔ an unrecorded locale fails closed with the Hindi reason', () => {
    expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: { copyVersion: V2 } })).toEqual({
      eligible: false,
      reason: 'hindi_not_reviewed',
    });
  });

  it('⭐ v1 (texts and post only) ⇒ old_wording — in either language', () => {
    for (const locale of ['en', 'hi']) {
      expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: { copyVersion: V1, locale } })).toEqual({
        eligible: false,
        reason: 'old_wording',
      });
    }
  });

  it('⭐ a payload with ⛔ copyVersion is the OLD wording (T7 — the fixtures and every pre-version row)', () => {
    expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: { checkboxTextShown: 'x', locale: 'en' } })).toEqual({
      eligible: false,
      reason: 'old_wording',
    });
    expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: null })).toEqual({ eligible: false, reason: 'old_wording' });
  });

  it('⛔ an id the registry does not know ⇒ unknown_version (incl. prototype names and non-strings)', () => {
    for (const copyVersion of ['2027-01-01.v9', 'toString', '__proto__', 42, true]) {
      expect(evaluateClaimantWhatsappBasis({ revoked: false, payload: { copyVersion, locale: 'en' } })).toEqual({
        eligible: false,
        reason: 'unknown_version',
      });
    }
  });

  it('⛔ revoked, or ⛔ agreement row ⇒ not_live (the version is never consulted)', () => {
    expect(evaluateClaimantWhatsappBasis({ revoked: true, payload: { copyVersion: V2, locale: 'en' } })).toEqual({
      eligible: false,
      reason: 'not_live',
    });
    expect(evaluateClaimantWhatsappBasis(null)).toEqual({ eligible: false, reason: 'not_live' });
  });
});
