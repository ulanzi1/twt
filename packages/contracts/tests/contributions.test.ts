// The My Pool card read-model SHAPE test — Story 8.2 (Task 7). This is the AI-6-3-carry
// compound-read-model shape-test obligation Story 8.1 (D8) handed to 8.2/8.3: assert the shape of the
// compound read model (member × live-alert × assigned-pool × claim-deceased-name join) so the
// load-bearing invariants are STRUCTURALLY enforced, not merely intended.
//
// Three load-bearing assertions (each is a decoy-teeth check — a future dev physically cannot violate
// the invariant without this test going red):
//   1. Confirmed-only progress (AC4): `progress` carries ONLY { confirmedCount, rosterSize }. A
//      yellow/attested/pending count field is REJECTED by `.strict()` — yellow (intent) can never reach
//      the meter (money). This is the epic's load-bearing invariant, encoded before yellow exists (8.4).
//   2. PII shielding (AC2 / Story 1.16b): the assigned card carries only the deceased member's
//      first-name + last-initial — NO ciphertext field, NO full-name field, NO nominee/bank field.
//   3. Self-suppression discriminator (AC1): the response is a discriminated union on `assigned`;
//      `{ assigned: false }` is the first-class absence signal the client renders as null.

import { describe, expect, it } from 'vitest';

import {
  ActiveContributionCardResponse,
  ActiveContributionProgress,
  AssignedContributionCard,
} from '../src/contributions/index.js';

const VALID_ASSIGNED = {
  assigned: true as const,
  poolLetterCode: 'F',
  poolName: null,
  poolCanonicalIdentifier: 'P-2026-07-001',
  deceasedFirstName: 'Rajesh',
  deceasedLastInitial: 'S',
  fixedAmount: 500,
  daysRemaining: 12,
  progress: { confirmedCount: 0, rosterSize: 48 },
  upcomingAmountChange: null,
};

describe('AC4 — the progress meter is CONFIRMED-ONLY (no yellow/attested/pending field can exist)', () => {
  it('accepts a { confirmedCount, rosterSize } progress and NOTHING else', () => {
    expect(ActiveContributionProgress.parse({ confirmedCount: 0, rosterSize: 48 })).toEqual({
      confirmedCount: 0,
      rosterSize: 48,
    });
  });

  it('REJECTS an attested/pending/yellow count field on progress (strict — the load-bearing teeth)', () => {
    for (const field of ['attestedCount', 'pendingCount', 'yellowCount', 'unconfirmedCount']) {
      const withYellow = { confirmedCount: 0, rosterSize: 48, [field]: 5 };
      expect(ActiveContributionProgress.safeParse(withYellow).success, `progress must reject ${field}`).toBe(
        false,
      );
    }
  });

  it('the confirmed numerator is legitimately 0 today (Epic 9 producer unbuilt) — 0 of N is valid', () => {
    expect(ActiveContributionProgress.safeParse({ confirmedCount: 0, rosterSize: 48 }).success).toBe(true);
  });
});

describe('AC2 — PII shielding (only first-name + last-initial of the deceased crosses the wire)', () => {
  it('accepts the shielded assigned card', () => {
    expect(AssignedContributionCard.safeParse(VALID_ASSIGNED).success).toBe(true);
  });

  it('an empty last-initial is allowed (single-token name — no surname to leak)', () => {
    expect(AssignedContributionCard.safeParse({ ...VALID_ASSIGNED, deceasedLastInitial: '' }).success).toBe(
      true,
    );
  });

  it('REJECTS a ciphertext / full-name / nominee field on the card (strict)', () => {
    for (const field of ['deceasedNameCiphertext', 'deceasedFullName', 'nomineeName', 'nomineeBankAccount']) {
      const leaky = { ...VALID_ASSIGNED, [field]: 'secret' };
      expect(AssignedContributionCard.safeParse(leaky).success, `card must reject ${field}`).toBe(false);
    }
  });

  it('REJECTS an over-long last-initial (the .max shield — never a full surname)', () => {
    // `.max(16)` is sized to accommodate a real single grapheme cluster (a Devanagari conjunct + vowel
    // signs), so the rejection fixture must clearly exceed that — a full multi-syllable surname, not a
    // short one that could pass as a wide grapheme cluster.
    expect(
      AssignedContributionCard.safeParse({ ...VALID_ASSIGNED, deceasedLastInitial: 'Ramalingeswararao' }).success,
    ).toBe(false);
  });
});

describe('AC1 — self-suppression discriminated union on `assigned`', () => {
  it('{ assigned: false } is a valid first-class absence signal', () => {
    expect(ActiveContributionCardResponse.parse({ assigned: false })).toEqual({ assigned: false });
  });

  it('a fully-resolved assigned card parses', () => {
    expect(ActiveContributionCardResponse.safeParse(VALID_ASSIGNED).success).toBe(true);
  });

  it('the assigned card carries the compound join fields (pool × amount × days × progress)', () => {
    const parsed = AssignedContributionCard.parse(VALID_ASSIGNED);
    expect(parsed.poolLetterCode).toBe('F');
    expect(parsed.fixedAmount).toBe(500);
    expect(parsed.daysRemaining).toBe(12);
    expect(parsed.progress).toEqual({ confirmedCount: 0, rosterSize: 48 });
  });

  it('an assigned card with an upcoming-amount transition (AC6) parses', () => {
    const withUpcoming = {
      ...VALID_ASSIGNED,
      upcomingAmountChange: { effectiveFrom: '2027-07-01T00:00:00.000Z', newAmount: 600 },
    };
    expect(AssignedContributionCard.safeParse(withUpcoming).success).toBe(true);
  });

  it('rejects a payload with no `assigned` discriminator', () => {
    expect(ActiveContributionCardResponse.safeParse({ poolLetterCode: 'F' }).success).toBe(false);
  });
});
