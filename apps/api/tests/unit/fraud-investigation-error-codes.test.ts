// Story 6.22 — the fraud-investigation routes' WIRE CODES are exactly the contract's list (code review 2026-11-02, RB6), and a note
// with no visible character is not a note (RB11).
//
// `FRAUD_INVESTIGATION_ERROR_CODES` was documented as "closed (the admin maps each to copy)" yet referenced by nothing, and it missed
// `concurrent` (a retriable 409). Here every domain refusal reason — a compile-time EXHAUSTIVE map, so a NEW reason fails to compile
// until it is listed — and the concurrency error are turned into their wire code by the handlers' own `translate`, and the list must
// equal that set. Status classes are pinned too: 404 for the missing claim, 400 for an incomplete step, 409 for the rest.

import { FRAUD_INVESTIGATION_ERROR_CODES } from '@twt/contracts';
import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { hasVisibleText, translateFraudRefusal } from '../../src/modules/claims/claims.fraud-investigation.handlers.js';

/** EXHAUSTIVE over the domain's reasons: adding one to `FraudInvestigationRefusalReason` is a compile error here until it is listed. */
const ALL_REASONS = {
  claim_not_found: 404,
  already_flagged: 409,
  not_flagged: 409,
  already_found: 409,
  finder_is_flagger: 409,
  step_conflict: 409,
  missing_note: 400,
  missing_alive_confirmation: 400,
  missing_display: 409,
} as const satisfies Record<claim.FraudInvestigationRefusalReason, 400 | 404 | 409>;

function wire(err: unknown): { code: string; statusCode: number } {
  try {
    translateFraudRefusal(err);
  } catch (thrown) {
    const e = thrown as { code: string; statusCode: number };
    return { code: e.code, statusCode: e.statusCode };
  }
  throw new Error('translateFraudRefusal returned');
}

describe('Story 6.22 — the wire codes are the contract\'s closed list (RB6)', () => {
  it('every domain reason maps to `fraud_investigation.<reason>` with the right status class', () => {
    for (const [reason, status] of Object.entries(ALL_REASONS)) {
      const out = wire(new claim.FraudInvestigationRefusedError('c', reason as claim.FraudInvestigationRefusalReason, 'x'));
      expect(out, reason).toEqual({ code: `fraud_investigation.${reason}`, statusCode: status });
    }
  });

  it('a claim-stream concurrency conflict is the retriable 409 `fraud_investigation.concurrent`', () => {
    expect(wire(new claim.ClaimStreamConcurrencyError('c', 7))).toEqual({ code: 'fraud_investigation.concurrent', statusCode: 409 });
  });

  it('⭐ FRAUD_INVESTIGATION_ERROR_CODES equals exactly the set the handlers can emit (no extra, none missing)', () => {
    const emitted = [
      ...Object.keys(ALL_REASONS).map((r) => wire(new claim.FraudInvestigationRefusedError('c', r as claim.FraudInvestigationRefusalReason, 'x')).code),
      wire(new claim.ClaimStreamConcurrencyError('c', 1)).code,
    ].sort();
    expect([...FRAUD_INVESTIGATION_ERROR_CODES].sort()).toEqual(emitted);
  });

  it('anything else is rethrown untouched (⛔ swallowed into a fraud code)', () => {
    const boom = new Error('boom');
    expect(() => translateFraudRefusal(boom)).toThrow(boom);
  });
});

describe('Story 6.22 — a note needs a visible character (RB11)', () => {
  it.each([
    ['ordinary text', 'Spoke to the member by video.', true],
    ['a Devanagari note', 'सदस्य से वीडियो पर बात हुई', true],
    ['a single digit', '7', true],
    ['empty', '', false],
    ['ordinary whitespace', '   \n\t ', false],
    ['zero-width spaces (U+200B / U+200C / U+200D)', '\u200B\u200C\u200D', false],
    ['a word joiner (U+2060) and a BOM (U+FEFF)', '\u2060\uFEFF', false],
    ['braille blanks (U+2800)', '\u2800\u2800', false],
    ['a Hangul filler (U+3164)', '\u3164', false],
    ['a Hangul halfwidth filler (U+FFA0) and a soft hyphen (U+00AD)', '\uFFA0\u00AD', false],
    ['punctuation counts as visible, as everywhere else in the repo (the rule is about what DRAWS, ⛔ what is meaningful)', '—', true],
  ] as const)('%s', (_label, note, visible) => {
    expect(hasVisibleText(note)).toBe(visible);
  });
});
