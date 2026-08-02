// isMemberInBannerAudience — Story 10.9 (AC9, Decision 4). Pure, DB-free.
//
// The POLARITY of `public` is the point of this file. Story 10.5's dispatch resolver maps `public`
// to the EMPTY member set (a public post renders on the web; no member push). 10.9's read-time
// VISIBILITY predicate maps it to TRUE: a `public` banner widens who else may see it (Story 11a.5's
// public strip), it never narrows it away from members.

import { describe, expect, it, vi } from 'vitest';

import {
  BANNER_TARGETABLE_AUDIENCE_SCOPES,
  isMemberInBannerAudience,
} from '../../src/banners/audience.js';
import { BANNER_AUDIENCE_SCOPES } from '../../src/schema/banners.js';

const silent = { info: () => {} };

describe('isMemberInBannerAudience — the two resolvable scopes', () => {
  it('`members-all` → true', () => {
    expect(isMemberInBannerAudience('members-all', null, silent)).toBe(true);
  });

  it('`public` → TRUE (a member is always eligible for a public banner — the 10.5 polarity is inverted)', () => {
    expect(isMemberInBannerAudience('public', null, silent)).toBe(true);
  });
});

describe('isMemberInBannerAudience — the three seam scopes (Decision 4)', () => {
  it.each(['state', 'role', 'cohort'] as const)('`%s` → false (no queryable member attribute yet)', (scope) => {
    expect(isMemberInBannerAudience(scope, 'some-value', silent)).toBe(false);
  });

  it('logs a structured seam note naming the scope + its value', () => {
    const logger = { info: vi.fn() };
    isMemberInBannerAudience('cohort', 'lock-in-2026', logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0]?.[0]).toMatch(/not yet resolvable/i);
    expect(logger.info.mock.calls[0]?.[1]).toMatchObject({
      audience_scope: 'cohort',
      audience_scope_value: 'lock-in-2026',
    });
  });

  it('does NOT log for a resolvable scope (the note means "something is missing", not "a read happened")', () => {
    const logger = { info: vi.fn() };
    isMemberInBannerAudience('members-all', null, logger);
    isMemberInBannerAudience('public', null, logger);
    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe('coverage of the DB enum', () => {
  it('answers for EVERY value in the banner_audience_scope enum (no unhandled arm)', () => {
    for (const scope of BANNER_AUDIENCE_SCOPES) {
      expect(typeof isMemberInBannerAudience(scope, null, silent)).toBe('boolean');
    }
  });

  it('BANNER_TARGETABLE_AUDIENCE_SCOPES agrees with the predicate (one authority, not two)', () => {
    for (const scope of BANNER_AUDIENCE_SCOPES) {
      expect(BANNER_TARGETABLE_AUDIENCE_SCOPES.includes(scope)).toBe(
        isMemberInBannerAudience(scope, null, silent),
      );
    }
  });
});
