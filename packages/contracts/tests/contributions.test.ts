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

import { contribution } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  ActiveContributionCardResponse,
  ActiveContributionProgress,
  AssignedContributionCard,
  AssignedPoolContributorList,
  ConfirmedContributorRow,
  ContributionAttestRequest,
  ContributionAttestResponse,
  ContributionFailureReportRequest,
  ContributionHistoryResponse,
  ContributionHistoryRow,
  ContributionIntentRequest,
  ContributionIntentResponse,
  ContributionNoteFacts,
  ContributionStatus,
  ContributionUtr,
  PendingContributorsAggregate,
  PoolContributorListResponse,
  UpiFailureModeSchema,
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
  // Story 8.4 — the member's OWN yellow-pill state (per-member, NOT an aggregate).
  myContribution: 'none' as const,
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

// ── Story 8.3 — the Live Contributor List read-model SHAPE test (Task 5; the AI-6-3-carry decoy teeth) ──
//
// Same discipline as the 8.2 card above, generalized to the NAMED confirmed-contributor rows + the
// aggregate pending signal. The load-bearing invariant (AC1/AC4): the shape carries ONLY confirmed rows
// (first-name + last-initial) + an aggregate pending count/percentage — there is STRUCTURALLY no
// status/yellow/attested/utr/pending-identity field, and no ciphertext/full-name/phone/bank field. A future
// dev physically cannot surface a yellow/pending contribution as confirmed without this test going red.

const VALID_CONTRIBUTOR_LIST = {
  assigned: true as const,
  pool: { letterCode: 'F', name: null, canonicalIdentifier: 'P-2026-07-001' },
  confirmed: [
    { firstName: 'Rajesh', lastInitial: 'S' },
    { firstName: 'Meena', lastInitial: '' },
  ],
  pending: { count: 46, percentage: 96 },
};

describe('AC1/AC4 — the confirmed list is CONFIRMED-ONLY (no yellow/attested/pending-identity field can exist)', () => {
  it('accepts a fully-resolved contributor list (confirmed rows + aggregate pending)', () => {
    expect(PoolContributorListResponse.safeParse(VALID_CONTRIBUTOR_LIST).success).toBe(true);
  });

  it('the confirmed numerator is legitimately empty today (Epic 9 producer unbuilt) — [] is valid', () => {
    const empty = { ...VALID_CONTRIBUTOR_LIST, confirmed: [], pending: { count: 48, percentage: 100 } };
    expect(PoolContributorListResponse.safeParse(empty).success).toBe(true);
  });

  it('REJECTS a status/yellow/attested/utr field on a confirmed row (strict — the load-bearing teeth)', () => {
    for (const field of ['status', 'yellow', 'attested', 'utr', 'pending', 'confirmationState']) {
      const leakyRow = { firstName: 'Rajesh', lastInitial: 'S', [field]: 'yellow' };
      expect(ConfirmedContributorRow.safeParse(leakyRow).success, `confirmed row must reject ${field}`).toBe(
        false,
      );
    }
  });

  it('REJECTS a ciphertext / full-name / phone / bank field on a confirmed row (PII shield, strict)', () => {
    for (const field of ['nameCiphertext', 'fullName', 'phone', 'bankAccount', 'memberId']) {
      const leakyRow = { firstName: 'Rajesh', lastInitial: 'S', [field]: 'secret' };
      expect(ConfirmedContributorRow.safeParse(leakyRow).success, `confirmed row must reject ${field}`).toBe(
        false,
      );
    }
  });

  it('an empty last-initial is allowed (single-token name — no surname to leak)', () => {
    expect(ConfirmedContributorRow.safeParse({ firstName: 'Meena', lastInitial: '' }).success).toBe(true);
  });
});

describe('AC2/D3 — pending is AGGREGATE ONLY (count + percentage, NO member-identifying detail)', () => {
  it('accepts a { count, percentage } aggregate and NOTHING else', () => {
    expect(PendingContributorsAggregate.parse({ count: 46, percentage: 96 })).toEqual({
      count: 46,
      percentage: 96,
    });
  });

  it('REJECTS any per-member identity field on the pending aggregate (no shame list — strict teeth)', () => {
    for (const field of ['members', 'names', 'memberIds', 'firstName', 'rows']) {
      const leaky = { count: 46, percentage: 96, [field]: ['someone'] };
      expect(PendingContributorsAggregate.safeParse(leaky).success, `pending must reject ${field}`).toBe(
        false,
      );
    }
  });

  it('percentage is bounded 0–100 (integer)', () => {
    expect(PendingContributorsAggregate.safeParse({ count: 0, percentage: 101 }).success).toBe(false);
    expect(PendingContributorsAggregate.safeParse({ count: 0, percentage: -1 }).success).toBe(false);
    expect(PendingContributorsAggregate.safeParse({ count: 0, percentage: 0 }).success).toBe(true);
  });
});

describe('AC1 — contributor-list self-suppression discriminated union on `assigned`', () => {
  it('{ assigned: false } is a valid first-class absence signal', () => {
    expect(PoolContributorListResponse.parse({ assigned: false })).toEqual({ assigned: false });
  });

  it('REJECTS a top-level pending-identity or ciphertext field on the assigned list (strict)', () => {
    for (const field of ['pendingMembers', 'yellowContributors', 'nameCiphertext']) {
      const leaky = { ...VALID_CONTRIBUTOR_LIST, [field]: 'x' };
      expect(AssignedPoolContributorList.safeParse(leaky).success, `list must reject ${field}`).toBe(false);
    }
  });
});

// ── Story 8.4 — the UPI Intent + UTR self-attestation write shapes ──────────────────────────────────

describe('Story 8.4 — the member card carries a per-member yellow state, never an aggregate one (AC4)', () => {
  it('accepts myContribution `none` and `attested`', () => {
    expect(AssignedContributionCard.parse({ ...VALID_ASSIGNED, myContribution: 'none' })).toBeTruthy();
    expect(AssignedContributionCard.parse({ ...VALID_ASSIGNED, myContribution: 'attested' })).toBeTruthy();
  });

  it('REJECTS an unknown myContribution value (never `confirmed`/`paid`/`green`)', () => {
    for (const bad of ['confirmed', 'paid', 'green', 'success']) {
      expect(
        AssignedContributionCard.safeParse({ ...VALID_ASSIGNED, myContribution: bad }).success,
        `card must reject myContribution=${bad}`,
      ).toBe(false);
    }
  });

  it('the yellow state does NOT bleed into the confirmed-only progress meter (still strict {confirmedCount,rosterSize})', () => {
    // Re-assert after 8.4 makes yellow real: a yellow/attested count on `progress` is still rejected.
    expect(
      ActiveContributionProgress.safeParse({ confirmedCount: 0, rosterSize: 48, attestedCount: 3 }).success,
    ).toBe(false);
  });
});

describe('Story 8.4 — UPI Intent request/response (AC1/AC2)', () => {
  it('the intent request is empty or an optional account switch', () => {
    expect(ContributionIntentRequest.parse({})).toEqual({});
    expect(ContributionIntentRequest.parse({ account: 2 })).toEqual({ account: 2 });
  });

  it('REJECTS an account other than 1/2, or the client naming the payee/amount (strict R4)', () => {
    expect(ContributionIntentRequest.safeParse({ account: 3 }).success).toBe(false);
    // The client can NEVER name pa/am/tr — those are server-resolved.
    for (const field of ['vpa', 'amountInr', 'tr', 'pa', 'am']) {
      expect(
        ContributionIntentRequest.safeParse({ [field]: 'x' }).success,
        `intent request must reject client-named ${field}`,
      ).toBe(false);
    }
  });

  it('the available intent carries the server-built URL + tr + amount + vpa + account + canSwitchAccount + myContribution', () => {
    const ok = ContributionIntentResponse.parse({
      available: true,
      upiUrl: 'upi://pay?pa=x@ok&am=310&cu=INR&tn=Pool%20F&tr=contrib-v1-abc',
      tr: 'contrib-v1-abc',
      amountInr: 310,
      vpa: 'nominee@okhdfc',
      account: 1,
      canSwitchAccount: false,
      myContribution: 'none',
    });
    expect(ok).toMatchObject({ available: true, amountInr: 310, canSwitchAccount: false, myContribution: 'none' });
    // myContribution is REQUIRED on the available branch (review finding — the field must be carried on
    // every intent response so a member who already attested can be routed to confirmation, not re-shown
    // the launch flow).
    expect(
      ContributionIntentResponse.safeParse({
        available: true,
        upiUrl: 'upi://pay?pa=x@ok&am=310&cu=INR&tn=Pool%20F&tr=contrib-v1-abc',
        tr: 'contrib-v1-abc',
        amountInr: 310,
        vpa: 'nominee@okhdfc',
        account: 1,
        canSwitchAccount: false,
      }).success,
    ).toBe(false);
    // canSwitchAccount is REQUIRED on the available branch (Story 8.13 — the FR-27 switch affordance).
    expect(
      ContributionIntentResponse.safeParse({
        available: true,
        upiUrl: 'upi://pay?pa=x@ok&am=310&cu=INR&tn=Pool%20F&tr=contrib-v1-abc',
        tr: 'contrib-v1-abc',
        amountInr: 310,
        vpa: 'nominee@okhdfc',
        account: 1,
        myContribution: 'none',
      }).success,
      'available intent must require canSwitchAccount',
    ).toBe(false);
  });

  it('the unavailable intent is a first-class fail-soft on `available:false` with a reason + myContribution (D1)', () => {
    for (const reason of ['unassigned', 'accounts_not_collected', 'account_not_found', 'vpa_not_collected']) {
      expect(ContributionIntentResponse.parse({ available: false, reason, myContribution: 'none' })).toEqual({
        available: false,
        reason,
        myContribution: 'none',
      });
    }
    // A member can be unavailable AND already attested (e.g. an out-of-band payer, 8.10).
    expect(
      ContributionIntentResponse.parse({ available: false, reason: 'vpa_not_collected', myContribution: 'attested' }),
    ).toMatchObject({ myContribution: 'attested' });
    expect(ContributionIntentResponse.safeParse({ available: false, reason: 'boom', myContribution: 'none' }).success).toBe(false);
    expect(ContributionIntentResponse.safeParse({ available: false, reason: 'unassigned' }).success).toBe(false);
  });
});

describe('Story 8.4 — UTR attest request/response (AC3/AC4)', () => {
  it('the attest request requires a tr + a format-valid UTR (12-digit or 22-alnum)', () => {
    expect(ContributionAttestRequest.parse({ tr: 'contrib-v1-abc', utr: '123456789012' })).toBeTruthy();
    expect(ContributionAttestRequest.parse({ tr: 't', utr: 'ABCDefgh1234567890ABCD' })).toBeTruthy();
    expect(ContributionAttestRequest.safeParse({ tr: 't', utr: '12345' }).success).toBe(false);
    expect(ContributionAttestRequest.safeParse({ utr: '123456789012' }).success).toBe(false); // tr required
  });

  it('the attest response is the yellow-pill view — NO confirmed/aggregate count field (the teeth)', () => {
    const ok = ContributionAttestResponse.parse({ myContribution: 'attested', tr: 'contrib-v1-abc', idempotent: false });
    expect(ok.myContribution).toBe('attested');
    // A confirmed/count field can never appear on the yellow response (strict decoy teeth).
    for (const field of ['confirmedCount', 'confirmed', 'raisedSoFar', 'green', 'count']) {
      expect(
        ContributionAttestResponse.safeParse({
          myContribution: 'attested', tr: 't', idempotent: false, [field]: 1,
        }).success,
        `attest response must reject ${field}`,
      ).toBe(false);
    }
  });

  it('the attest response can only be `attested` — never `confirmed`/`none`', () => {
    expect(ContributionAttestResponse.safeParse({ myContribution: 'none', tr: 't', idempotent: false }).success).toBe(false);
    expect(ContributionAttestResponse.safeParse({ myContribution: 'confirmed', tr: 't', idempotent: false }).success).toBe(false);
  });
});

// Review finding: `ContributionUtr`'s regex is a LOCAL literal, deliberately not imported from
// `@twt/domain` at the source level (that import would pull `pg` into the mobile Metro bundle via
// `contribution/write.ts` — see the `upi-intent.ts` header). A test-only cross-package import is safe
// (tests never ship in a bundle) and gives the "MUST stay in sync" comment real, mechanical teeth: this
// fails the moment either copy drifts from the other.
describe('ContributionUtr regex stays byte-for-byte in sync with @twt/domain (review finding, mechanical)', () => {
  it('the contract pattern source + flags match contribution.CONTRIBUTION_UTR_REGEX exactly', () => {
    const contractPattern = ContributionUtr._def.checks.find(
      (c): c is { kind: 'regex'; regex: RegExp } => c.kind === 'regex',
    )?.regex;
    expect(contractPattern).toBeInstanceOf(RegExp);
    expect(contractPattern?.source).toBe(contribution.CONTRIBUTION_UTR_REGEX.source);
    expect(contractPattern?.flags).toBe(contribution.CONTRIBUTION_UTR_REGEX.flags);
  });
});

// ── Story 8.5 — the UPI Failure Coach anonymous failure-report shape (Task 1; the AC3 PII decoy teeth) ──
//
// The load-bearing invariant (AC3/D2): the request carries the `mode` enum and NOTHING ELSE. "Anonymous"
// is enforced by the SHAPE — a `.strict()` object with no free-text field — so a future dev physically
// cannot add a `detail`/`note`/`other_text` box (which would invite a typed UTR / amount / name — PII —
// into the analytics log) without this test going red.

describe('Story 8.5 — the failure-report mode enum is a bounded self-classification (AC1/D1)', () => {
  it('accepts each of the five member-declared modes', () => {
    for (const mode of ['insufficient_balance', 'wrong_pin', 'app_issue', 'network_issue', 'other']) {
      expect(UpiFailureModeSchema.safeParse(mode).success, `mode ${mode} must be valid`).toBe(true);
      expect(ContributionFailureReportRequest.parse({ mode })).toEqual({ mode });
    }
  });

  it('REJECTS an out-of-set mode value (never a free-form / diagnosed reason)', () => {
    for (const bad of ['insufficient', 'timeout', 'cancelled', 'unknown', '']) {
      expect(UpiFailureModeSchema.safeParse(bad).success, `mode ${bad} must be rejected`).toBe(false);
      expect(ContributionFailureReportRequest.safeParse({ mode: bad }).success).toBe(false);
    }
  });
});

describe('Story 8.5 — the failure-report shape carries NO free-text / PII field (AC3 load-bearing teeth)', () => {
  it('requires the mode (an empty body is rejected)', () => {
    expect(ContributionFailureReportRequest.safeParse({}).success).toBe(false);
  });

  it('REJECTS any free-text / transaction-detail field riding alongside the mode (strict — the PII guard)', () => {
    // The one change that would break the "anonymous" invariant: a detail/note box, or any UTR / amount /
    // payee / tr leaking in. `.strict()` forbids every unknown key, so none of these can ever be logged.
    for (const field of ['detail', 'note', 'other_text', 'otherDetail', 'utr', 'amount', 'amountInr', 'vpa', 'tr', 'message']) {
      const leaky = { mode: 'other', [field]: 'anything the member typed' };
      expect(
        ContributionFailureReportRequest.safeParse(leaky).success,
        `failure report must reject the free-text/PII field ${field}`,
      ).toBe(false);
    }
  });

  it('the parsed object has exactly one key — `mode` (structural: no free-text field exists in the shape)', () => {
    const parsed = ContributionFailureReportRequest.parse({ mode: 'network_issue' });
    expect(Object.keys(parsed)).toEqual(['mode']);
  });
});

const VALID_HISTORY_ROW = {
  contributionId: '11111111-1111-1111-1111-111111111111',
  date: '2026-06-20T10:15:00.000Z',
  deceasedFirstName: 'Rajesh',
  deceasedLastInitial: 'S',
  poolLetterCode: 'F',
  poolName: null,
  poolCanonicalIdentifier: 'P-2026-06-001',
  cycleRef: '2026-06',
  amountInr: 500,
  status: 'yellow' as const,
  noteAvailable: false,
};

describe('Story 8.6 — the Yogdaan Bahi contribution-history read model (AC1/AC2/AC3/AC6)', () => {
  it('accepts a fully-resolved row + an empty passbook (the dignified empty state)', () => {
    expect(ContributionHistoryRow.safeParse(VALID_HISTORY_ROW).success).toBe(true);
    expect(ContributionHistoryResponse.safeParse({ rows: [], totalInr: 0 }).success).toBe(true);
    expect(
      ContributionHistoryResponse.safeParse({ rows: [VALID_HISTORY_ROW], totalInr: 500 }).success,
    ).toBe(true);
  });

  it('the status enum is EXACTLY the four tones (bounds — no fifth tone leaks in)', () => {
    for (const tone of ['yellow', 'green', 'red', 'grey']) {
      expect(ContributionStatus.safeParse(tone).success, `${tone} valid`).toBe(true);
    }
    for (const bad of ['orange', 'confirmed', 'pending', 'YELLOW', '']) {
      expect(ContributionStatus.safeParse(bad).success, `${bad} rejected`).toBe(false);
    }
  });

  it('the status enum is value-aligned with @twt/domain’s CONTRIBUTION_STATUSES (lockstep guard)', () => {
    // Contracts cannot import @twt/domain at SOURCE (browser-bundle rule), but a TEST-only import is safe
    // ([[project_contracts_domain_bundle_boundary]]) — pin the two enums together so a domain change that
    // adds/renames a tone without updating the contract goes red.
    expect([...ContributionStatus.options].sort()).toEqual([...contribution.CONTRIBUTION_STATUSES].sort());
  });

  it('THE PII GUARD (load-bearing teeth): the row shape carries NO UTR / tr / full-name / other-member field', () => {
    // The one change that would break the PII discipline (AC6): a UTR, the tr, a full name, or ANY other
    // member's data riding on the row. `.strict()` forbids every unknown key, so none can ever cross the wire.
    for (const field of [
      'utr',
      'tr',
      'fullName',
      'deceasedFullName',
      'memberId',
      'memberFullName',
      'contributorName',
      'nomineeName',
      'bankAccount',
      'vpa',
      'phone',
      'mobile',
    ]) {
      const leaky = { ...VALID_HISTORY_ROW, [field]: 'leaked' };
      expect(
        ContributionHistoryRow.safeParse(leaky).success,
        `history row must reject the extra-PII field ${field}`,
      ).toBe(false);
    }
  });

  it('is strict end-to-end: an unknown key on the response envelope is rejected too', () => {
    expect(
      ContributionHistoryResponse.safeParse({ rows: [], totalInr: 0, cursor: 'x' }).success,
    ).toBe(false);
  });

  it('amountInr is a positive whole-INR integer; totalInr is a non-negative integer', () => {
    expect(ContributionHistoryRow.safeParse({ ...VALID_HISTORY_ROW, amountInr: 0 }).success).toBe(false);
    expect(ContributionHistoryRow.safeParse({ ...VALID_HISTORY_ROW, amountInr: 12.5 }).success).toBe(false);
    expect(ContributionHistoryResponse.safeParse({ rows: [], totalInr: -1 }).success).toBe(false);
  });

  it('poolName is nullable (curated name absent at launch → letter-code fallback) but never an empty string', () => {
    expect(ContributionHistoryRow.safeParse({ ...VALID_HISTORY_ROW, poolName: 'भीष्म' }).success).toBe(true);
    expect(ContributionHistoryRow.safeParse({ ...VALID_HISTORY_ROW, poolName: '' }).success).toBe(false);
  });
});

// ── Story 8.7 — the Yogdaan Pratigya (Contribution Note) facts shape (Task 1) ──────────────────────
//
// Three load-bearing guards, all structural (a shareable artifact leaves the app — the honesty cannot
// live in the surface it was fetched from, D3):
//   1. `.strict()` — no unknown key may ride onto the artifact's facts.
//   2. THE PII GUARD — no phone / address / Aadhaar / bank / nominee / full-name / ciphertext field
//      exists on the shape AT ALL (structurally impossible, not merely unused — AC5).
//   3. THE OVER-CLAIM GUARD (AC3) — `utr` cannot be set unless `status === 'green'`. A non-green Note
//      that carried a UTR would assert a settled payment the reconciliation pipeline has not
//      established. This is the single most important assertion in this file.

const VALID_NOTE_FACTS = {
  contributionId: 'evt-1',
  status: 'yellow',
  attestedAt: '2026-06-20T10:15:00.000Z',
  generatedAt: '2026-07-23T09:00:00.000Z',
  cycleRef: '2026-06',
  deceasedFirstName: 'Rajesh',
  deceasedLastInitial: 'S',
  memberFirstName: 'Sushil',
  memberLastInitial: 'K',
  memberRef: 'TWT-4F2A9C1B',
  poolLetterCode: 'A',
  poolName: null,
  poolCanonicalIdentifier: 'P-2026-06-001',
  amountInr: 500,
  paymentReference: 'TWT7QX4M2K',
  niyamavali: null,
  branding: {
    displayNameHi: 'टीचर्स वेलफेयर ट्रस्ट',
    displayNameEn: 'Teachers Welfare Trust',
    logoUrl: null,
    primaryColor: '#1F4E5F',
    secondaryColor: '#C9A227',
  },
} as const;

describe('Story 8.7 — ContributionNoteFacts: the over-claim guard (AC3, load-bearing)', () => {
  it('accepts a green Note carrying the UTR (epics.md:2990 — "UTR (when confirmed)")', () => {
    const green = { ...VALID_NOTE_FACTS, status: 'green', utr: '123456789012' };
    expect(ContributionNoteFacts.safeParse(green).success).toBe(true);
  });

  it('REJECTS a UTR on a yellow / red / grey Note — the artifact may never imply a settled payment', () => {
    for (const status of ['yellow', 'red', 'grey']) {
      const overClaiming = { ...VALID_NOTE_FACTS, status, utr: '123456789012' };
      const parsed = ContributionNoteFacts.safeParse(overClaiming);
      expect(parsed.success, `a ${status} Note must not be constructible with a UTR`).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((i) => i.path.join('.') === 'utr')).toBe(true);
      }
    }
  });

  it('accepts every status WITHOUT a UTR (a non-green Note is still a real, generatable artifact — D3(a))', () => {
    for (const status of ['yellow', 'green', 'red', 'grey']) {
      expect(
        ContributionNoteFacts.safeParse({ ...VALID_NOTE_FACTS, status }).success,
        `a ${status} Note must be generatable`,
      ).toBe(true);
    }
  });
});

describe('Story 8.7 — ContributionNoteFacts: PII discipline + strictness (AC5)', () => {
  it('THE PII GUARD: no phone / address / Aadhaar / bank / nominee / full-name field can ride the artifact', () => {
    for (const field of [
      'phone',
      'mobile',
      'address',
      'aadhaar',
      'aadhaarNumber',
      'bankAccount',
      'ifsc',
      'vpa',
      'nomineeName',
      'memberFullName',
      'deceasedFullName',
      'nameCiphertext',
      'memberId',
      'memberNumber',
      'membershipNumber',
    ]) {
      const leaky = { ...VALID_NOTE_FACTS, [field]: 'leaked' };
      expect(
        ContributionNoteFacts.safeParse(leaky).success,
        `the Note facts must reject the extra-PII field ${field}`,
      ).toBe(false);
    }
  });

  it('the member identifier is a bounded derived watermark, never a long/absent identity string', () => {
    expect(ContributionNoteFacts.safeParse({ ...VALID_NOTE_FACTS, memberRef: '' }).success).toBe(false);
    expect(
      ContributionNoteFacts.safeParse({ ...VALID_NOTE_FACTS, memberRef: 'x'.repeat(33) }).success,
    ).toBe(false);
  });

  it('the Niyamavali reference is nullable — the HONEST ABSENCE is first-class (AC4)', () => {
    expect(ContributionNoteFacts.safeParse({ ...VALID_NOTE_FACTS, niyamavali: null }).success).toBe(true);
    expect(
      ContributionNoteFacts.safeParse({
        ...VALID_NOTE_FACTS,
        niyamavali: {
          clauseId: 'niy.contribution-discipline.r7-a',
          clauseVersionId: '11111111-1111-1111-1111-111111111111',
          version: 2,
        },
      }).success,
    ).toBe(true);
  });

  it('branding is strict + colour-validated, and the nested objects reject unknown keys too', () => {
    expect(
      ContributionNoteFacts.safeParse({
        ...VALID_NOTE_FACTS,
        branding: { ...VALID_NOTE_FACTS.branding, primaryColor: 'teal' },
      }).success,
    ).toBe(false);
    expect(
      ContributionNoteFacts.safeParse({
        ...VALID_NOTE_FACTS,
        branding: { ...VALID_NOTE_FACTS.branding, trackingPixel: 'x' },
      }).success,
    ).toBe(false);
  });

  it('the status enum on the Note is the SAME four tones (one derivation, D3(b))', () => {
    expect(ContributionNoteFacts.safeParse({ ...VALID_NOTE_FACTS, status: 'confirmed' }).success).toBe(false);
  });
});
