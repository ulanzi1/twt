// R7 violator-flag derivation unit tests — Story 10.11 (Task 7; AC4).
//
// The three properties D1-B actually commits to:
//   (1) TODAY the section renders `detection_unavailable` NAMING the missing producer — never an
//       empty list, because an empty violator list on a governance surface is a false all-clear;
//   (2) the sentinel is checked FIRST, so the empty R7 ∩ applicable-clauses intersection that
//       `payload.ts:294` guarantees can never be mistaken for "detection ran and found nobody";
//   (3) the derivation is PRODUCER-SHAPED — feeding a synthetic payload that carries applied R7
//       clauses makes flags render with ZERO changes to the shipped files. That is the seam proof:
//       the day Story 10.24 lands, this arm lights up on its own.
//
// Plus the frozen-field discipline: the flag carries no recommendation-shaped field, and
// `holdingSince` is honestly null rather than back-filled from the evaluation instant.

import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS,
  TRUSTEE_LITE_R7_CLAUSE_IDS,
  deriveViolatorFlags,
  isR7ClauseId,
  summarizeViolatorFlags,
  type ViolatorFlagPayloadInput,
} from '../../src/trustee-lite/index.js';

/** The payload EXACTLY as `assemblePayload` builds it today (payload.ts:294 + types.ts:56-65). */
function producerUnavailablePayload(overrides: Partial<ViolatorFlagPayloadInput> = {}): ViolatorFlagPayloadInput {
  return {
    memberId: 'm-1',
    evaluatedAt: '2026-08-05T12:00:00.000Z',
    contributionHistorySummary: { status: CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS, producer: 'epic-8-9' },
    applicableNiyamavaliClauses: [],
    ...overrides,
  };
}

/**
 * The payload a REAL producer will build — the Story 10.24 shape, synthesized. Nothing in the shipped
 * code produces this yet; that is precisely what makes it the seam proof.
 */
function producedPayload(overrides: Partial<ViolatorFlagPayloadInput> = {}): ViolatorFlagPayloadInput {
  return {
    memberId: 'm-1',
    evaluatedAt: '2026-08-05T12:00:00.000Z',
    contributionHistorySummary: {
      status: 'available',
      facts: {
        'contribution.total_count': 4,
        'contribution.ever_contributed': true,
        'contribution.months_since_last': 7,
        'contribution.in_lapse': true,
        // A non-contribution fact must NOT be surfaced as establishing an R7 holding.
        'member.valid_membership_years': 6,
      },
      lapseSince: '2026-01-15T00:00:00.000Z',
    },
    applicableNiyamavaliClauses: [
      {
        clauseId: 'niy.contribution-discipline.r7-f',
        clauseVersionId: 'cv-1',
        outcome: 'r7_restoration_required',
        reasonCode: 'rule.contribution_gap_six_months',
      },
    ],
    ...overrides,
  };
}

// ── (1)/(2) the honest gap ───────────────────────────────────────────────────────────────────

describe('deriveViolatorFlags — the producer sentinel short-circuits (AC4, D1-B)', () => {
  it('returns detection_unavailable NAMING the producer, never an empty flag list', () => {
    const result = deriveViolatorFlags(producerUnavailablePayload());
    expect(result.status).toBe('detection_unavailable');
    expect(result).toEqual({ status: 'detection_unavailable', producer: 'epic-8-9' });
    expect(result).not.toHaveProperty('flags');
  });

  it('checks the sentinel BEFORE the clause filter — an R7 clause on an unavailable payload is still a gap', () => {
    // The load-bearing ordering assertion. If the filter ran first, this payload would return
    // `{status:'ok', flags:[…]}` off a summary that admits it has no facts — reporting a holding the
    // system cannot actually establish.
    const result = deriveViolatorFlags(
      producerUnavailablePayload({
        applicableNiyamavaliClauses: [
          {
            clauseId: 'niy.contribution-discipline.r7-a',
            clauseVersionId: 'cv-x',
            outcome: 'r7_restoration_required',
            reasonCode: 'rule.x',
          },
        ],
      }),
    );
    expect(result.status).toBe('detection_unavailable');
  });

  it('falls back to a named-unknown producer rather than an empty string', () => {
    const result = deriveViolatorFlags(
      producerUnavailablePayload({
        contributionHistorySummary: { status: CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS },
      }),
    );
    expect(result).toEqual({ status: 'detection_unavailable', producer: 'unknown' });
  });
});

// ── (3) the seam — flags render the day a producer lands ─────────────────────────────────────

describe('deriveViolatorFlags — producer-shaped, not story-shaped (AC4)', () => {
  it('renders flags for applied R7 clauses once the summary is no longer the sentinel', () => {
    const result = deriveViolatorFlags(producedPayload());
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0]!.clauseId).toBe('niy.contribution-discipline.r7-f');
    expect(result.flags[0]!.clauseLabel).toBe('r7_restoration_required · rule.contribution_gap_six_months');
  });

  it('filters to R7 ONLY — a non-R7 applied clause never becomes a violator flag', () => {
    const result = deriveViolatorFlags(
      producedPayload({
        applicableNiyamavaliClauses: [
          { clauseId: 'niy.special-death.r9', clauseVersionId: 'cv-2', outcome: 'route_r9_voting', reasonCode: 'rule.r9' },
          { clauseId: 'niy.ninety-percent-rule.r8-a', clauseVersionId: 'cv-3', outcome: 'r8_x', reasonCode: 'rule.r8' },
        ],
      }),
    );
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.flags).toEqual([]);
  });

  it('renders one flag per applied R7 sub-clause, for all seven', () => {
    const result = deriveViolatorFlags(
      producedPayload({
        applicableNiyamavaliClauses: TRUSTEE_LITE_R7_CLAUSE_IDS.map((clauseId, i) => ({
          clauseId,
          clauseVersionId: `cv-${i}`,
          outcome: 'r7_restoration_required',
          reasonCode: `rule.${i}`,
        })),
      }),
    );
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.flags.map((f) => f.clauseId)).toEqual([...TRUSTEE_LITE_R7_CLAUSE_IDS]);
  });

  it('carries only `contribution.*` facts, sorted for replay-stable order', () => {
    const result = deriveViolatorFlags(producedPayload());
    if (result.status !== 'ok') throw new Error('unreachable');
    const keys = result.flags[0]!.factsEstablishing.map((f) => f.key);
    expect(keys).toEqual([
      'contribution.ever_contributed',
      'contribution.in_lapse',
      'contribution.months_since_last',
      'contribution.total_count',
    ]);
    expect(keys).not.toContain('member.valid_membership_years');
  });
});

// ── The frozen-field discipline ──────────────────────────────────────────────────────────────

describe('the violator flag carries no recommendation, in any form (AC4)', () => {
  it('the field set is exactly the four permitted keys', () => {
    const result = deriveViolatorFlags(producedPayload());
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(Object.keys(result.flags[0]!).sort()).toEqual([
      'clauseId',
      'clauseLabel',
      'factsEstablishing',
      'holdingSince',
    ]);
  });

  it('no field name is recommendation-shaped', () => {
    const result = deriveViolatorFlags(producedPayload());
    if (result.status !== 'ok') throw new Error('unreachable');
    for (const key of Object.keys(result.flags[0]!)) {
      expect(key, `\`${key}\` reads as a recommendation`).not.toMatch(
        /recommend|suggest|advis|severit|urgen|priorit|rank|score/i,
      );
    }
  });

  it('holdingSince is NULL when no producer establishes an onset — never the evaluation instant', () => {
    const payload = producedPayload();
    const result = deriveViolatorFlags({
      ...payload,
      contributionHistorySummary: { ...payload.contributionHistorySummary, lapseSince: null },
    });
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.flags[0]!.holdingSince).toBeNull();
    // The back-fill that must never happen: "applies as of this evaluation" is not "in violation since".
    expect(result.flags[0]!.holdingSince).not.toBe(payload.evaluatedAt);
  });

  it('holdingSince passes through a real producer-supplied onset', () => {
    const result = deriveViolatorFlags(producedPayload());
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.flags[0]!.holdingSince).toBe('2026-01-15T00:00:00.000Z');
  });
});

// ── The section aggregate ────────────────────────────────────────────────────────────────────

describe('summarizeViolatorFlags — the section (AC4)', () => {
  it('an UNAVAILABLE candidate source is detection_unavailable, not an empty member list', () => {
    expect(summarizeViolatorFlags({ status: 'unavailable', producer: 'epic-8-9' })).toEqual({
      status: 'detection_unavailable',
      producer: 'epic-8-9',
    });
  });

  it('degrades the WHOLE section if ANY candidate payload still carries the sentinel', () => {
    // A partial scan is a false all-clear for exactly the members it could not evaluate, and a
    // trustee reading a short list has no way to know a member was skipped.
    const section = summarizeViolatorFlags({
      status: 'available',
      candidates: [
        { memberId: 'm-1', payload: producedPayload() },
        { memberId: 'm-2', payload: producerUnavailablePayload() },
      ],
    });
    expect(section.status).toBe('detection_unavailable');
  });

  it('omits members holding zero flags — within an `ok` section, absence is a supported claim', () => {
    const section = summarizeViolatorFlags({
      status: 'available',
      candidates: [
        { memberId: 'm-1', payload: producedPayload() },
        { memberId: 'm-2', payload: producedPayload({ applicableNiyamavaliClauses: [] }) },
      ],
    });
    if (section.status !== 'ok') throw new Error('unreachable');
    expect(section.members.map((m) => m.memberId)).toEqual(['m-1']);
  });

  it('an available source with no flagged members is `ok` with an EMPTY list — not the gap state', () => {
    const section = summarizeViolatorFlags({ status: 'available', candidates: [] });
    expect(section).toEqual({ status: 'ok', members: [] });
  });

  it('orders members by id — NEVER by flag count or any proxy for "who most needs action"', () => {
    const section = summarizeViolatorFlags({
      status: 'available',
      candidates: [
        // m-z holds THREE clauses, m-a holds one. Ordering by urgency would put m-z first — and
        // ordering by inferred urgency IS a recommendation (AC4).
        {
          memberId: 'm-z',
          payload: producedPayload({
            applicableNiyamavaliClauses: TRUSTEE_LITE_R7_CLAUSE_IDS.slice(0, 3).map((clauseId, i) => ({
              clauseId,
              clauseVersionId: `cv-${i}`,
              outcome: 'o',
              reasonCode: 'r',
            })),
          }),
        },
        { memberId: 'm-a', payload: producedPayload() },
      ],
    });
    if (section.status !== 'ok') throw new Error('unreachable');
    expect(section.members.map((m) => m.memberId)).toEqual(['m-a', 'm-z']);
  });
});

describe('isR7ClauseId', () => {
  it('recognizes all seven and fails closed on everything else', () => {
    for (const id of TRUSTEE_LITE_R7_CLAUSE_IDS) expect(isR7ClauseId(id)).toBe(true);
    for (const id of ['', 'r7-a', 'niy.contribution-discipline.r7-h', 'niy.special-death.r9']) {
      expect(isR7ClauseId(id), id).toBe(false);
    }
  });
});
