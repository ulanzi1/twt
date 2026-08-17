// isMemberInSurveyAudience — Story 10.15 (AC5, Load-Bearing Decision 7). Pure, DB-free.
//
// ⭐ THE ONE THING THIS FILE EXISTS TO PIN: `public` DENIES here and ALLOWS in 10.9. A reader who
// knows `isMemberInBannerAudience` will assume the polarity carried over — it did not, deliberately —
// so the inversion test is NAMED for the inversion and asserts both sides of the contrast.

import { describe, expect, it, vi } from 'vitest';

import { pariwarId as toPariwarId } from '../../src/ids/index.js';
import { geoAbsent, geoPresent, type MemberGeoNode } from '../../src/member-geo/types.js';
import { SURVEY_AUDIENCE_SCOPES } from '../../src/schema/surveys.js';
import {
  SURVEY_TARGETABLE_AUDIENCE_SCOPES,
  isMemberInSurveyAudience,
} from '../../src/surveys/audience.js';

const silent = { info: () => {} };
const PARIWAR = toPariwarId('11111111-1111-1111-1111-111111111111');

/** A member whose geo resolved fully — `state` present. */
function geoInState(state: string): MemberGeoNode {
  return {
    pariwar: geoPresent(PARIWAR),
    state: geoPresent(state),
    district: geoPresent('Patna'),
    block: geoAbsent('no-member-attribute'),
  };
}

/** A member whose `state` is TYPED-ABSENT for a given reason. */
function geoWithoutState(reason: Parameters<typeof geoAbsent>[0]): MemberGeoNode {
  return {
    pariwar: geoPresent(PARIWAR),
    state: geoAbsent(reason),
    district: geoAbsent(reason),
    block: geoAbsent('no-member-attribute'),
  };
}

describe('isMemberInSurveyAudience', () => {
  it('resolves members-all to true', () => {
    expect(isMemberInSurveyAudience('members-all', null, null, silent)).toBe(true);
  });

  // ⭐ THE LBD-7 INVERSION — named so a reader cannot miss it.
  it('resolves public to FALSE — the OPPOSITE polarity to the 10.9 banner predicate', () => {
    expect(isMemberInSurveyAudience('public', null, null, silent)).toBe(false);
  });

  it('logs a seam note explaining why public is not a survey audience', () => {
    const logger = { info: vi.fn() };
    isMemberInSurveyAudience('public', null, null, logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0]?.[0]).toContain('unauthenticated respondent');
  });

  it('omits public from the targetable scopes, unlike BANNER_TARGETABLE_AUDIENCE_SCOPES', () => {
    expect(SURVEY_TARGETABLE_AUDIENCE_SCOPES).not.toContain('public');
    // Order-sensitive — the contracts mirror is pinned to this exact array by `toEqual`.
    expect(SURVEY_TARGETABLE_AUDIENCE_SCOPES).toEqual(['members-all', 'state']);
  });

  describe('state', () => {
    it('matches a member whose resolved state equals the scope value', () => {
      expect(isMemberInSurveyAudience('state', 'Bihar', geoInState('Bihar'), silent)).toBe(true);
    });

    it('denies a member in a different state', () => {
      expect(isMemberInSurveyAudience('state', 'Bihar', geoInState('Jharkhand'), silent)).toBe(false);
    });

    // ⛔ BYTE-IDENTICAL comparison — agrees with geo-tree/resolver.ts and rbac/scope.ts. Normalizing
    // on one side only would produce a same-request contradiction.
    it('compares byte-identically — case-sensitive and untrimmed', () => {
      expect(isMemberInSurveyAudience('state', 'Bihar', geoInState('bihar'), silent)).toBe(false);
      expect(isMemberInSurveyAudience('state', 'Bihar', geoInState(' Bihar'), silent)).toBe(false);
    });

    it('fails closed when the caller resolved no geo at all', () => {
      expect(isMemberInSurveyAudience('state', 'Bihar', null, silent)).toBe(false);
    });

    it('fails closed on every typed-absent geo reason, each with its own log', () => {
      // The closed five-value absence vocabulary (Decision 2026-08-13-103 D6) — each must reach the
      // log by its own name, so a reader can tell "no posting row" from "tree has no such district".
      for (const reason of ['no-posting-row', 'no-tree-published', 'node-not-in-tree', 'no-ancestor-at-dimension'] as const) {
        const logger = { info: vi.fn() };
        expect(isMemberInSurveyAudience('state', 'Bihar', geoWithoutState(reason), logger)).toBe(false);
        expect(logger.info.mock.calls[0]?.[1]).toMatchObject({ member_geo_absence_reason: reason });
      }
    });

    it('fails closed on a survey with no audience_scope_value, with a DISTINCT log reason', () => {
      const logger = { info: vi.fn() };
      expect(isMemberInSurveyAudience('state', null, geoInState('Bihar'), logger)).toBe(false);
      // Distinct from the member-geo branch so a log reader can grep by ACTUAL cause.
      expect(logger.info.mock.calls[0]?.[0]).toContain('no audience_scope_value');
    });
  });

  describe('role / cohort', () => {
    it('denies both, with a note worded differently from the public and state notes', () => {
      for (const scope of ['role', 'cohort'] as const) {
        const logger = { info: vi.fn() };
        expect(isMemberInSurveyAudience(scope, 'anything', geoInState('Bihar'), logger)).toBe(false);
        // "there is nothing to resolve against" — NOT "wrong for this surface" (public) and NOT
        // "unresolved geo" (state).
        expect(logger.info.mock.calls[0]?.[0]).toContain('no member role/cohort attribute exists');
      }
    });
  });

  it('has an arm for every scope in the enum (the exhaustiveness guard is real)', () => {
    for (const scope of SURVEY_AUDIENCE_SCOPES) {
      expect(() => isMemberInSurveyAudience(scope, 'Bihar', geoInState('Bihar'), silent)).not.toThrow();
    }
  });
});
