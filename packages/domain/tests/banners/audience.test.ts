// isMemberInBannerAudience — Story 10.9 (AC9, Decision 4) + Story 1.19 (AC3, AC4). Pure, DB-free.
//
// Two things this file exists to pin, and they are easy to conflate:
//
//   1. The POLARITY of `public`. Story 10.5's dispatch resolver maps `public` to the EMPTY member
//      set (a public post renders on the web; no member push). 10.9's read-time VISIBILITY predicate
//      maps it to TRUE: a `public` banner widens who else may see it (Story 11a.5's public strip),
//      it never narrows it away from members. ⛔ Do not "harmonize" the two.
//   2. ⭐ The `state` arm RESOLVES (Story 1.19) against an INJECTED, already-resolved geo — and
//      FAILS CLOSED at every uncertain step. `role`/`cohort` do NOT resolve, and their reason is
//      categorically different: no member attribute exists at any layer.

import { describe, expect, it, vi } from 'vitest';

import {
  BANNER_TARGETABLE_AUDIENCE_SCOPES,
  isMemberInBannerAudience,
} from '../../src/banners/audience.js';
import { pariwarId as toPariwarId } from '../../src/ids/index.js';
import { geoAbsent, geoPresent, type MemberGeoNode } from '../../src/member-geo/types.js';
import { BANNER_AUDIENCE_SCOPES } from '../../src/schema/banners.js';

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

/** A member whose `state` is TYPED-ABSENT for a given reason (the AC1 contract). */
function geoWithoutState(reason: Parameters<typeof geoAbsent>[0]): MemberGeoNode {
  return {
    pariwar: geoPresent(PARIWAR),
    state: geoAbsent(reason),
    district: reason === 'no-posting-row' ? geoAbsent(reason) : geoPresent('Patna'),
    block: geoAbsent('no-member-attribute'),
  };
}

describe('isMemberInBannerAudience — the always-resolvable scopes', () => {
  it('`members-all` → true', () => {
    expect(isMemberInBannerAudience('members-all', null, null, silent)).toBe(true);
  });

  it('`public` → TRUE (a member is always eligible for a public banner — the 10.5 polarity is inverted)', () => {
    expect(isMemberInBannerAudience('public', null, null, silent)).toBe(true);
  });

  it('neither depends on the member geo — passing one changes nothing', () => {
    expect(isMemberInBannerAudience('members-all', null, geoInState('Bihar'), silent)).toBe(true);
    expect(isMemberInBannerAudience('public', null, geoInState('Bihar'), silent)).toBe(true);
  });
});

describe('the `state` arm RESOLVES (Story 1.19 AC3)', () => {
  it('a member IN the banner’s state sees it', () => {
    expect(isMemberInBannerAudience('state', 'Bihar', geoInState('Bihar'), silent)).toBe(true);
  });

  it('a member in a DIFFERENT state does NOT see it', () => {
    expect(isMemberInBannerAudience('state', 'Bihar', geoInState('UP'), silent)).toBe(false);
  });

  // ⛔ BYTE-IDENTICAL comparison, agreeing with `geo-tree/resolver.ts:20-31` and `rbac/scope.ts:241`.
  // Normalizing on one side only produces a same-request contradiction.
  it('is case-SENSITIVE and untrimmed — no normalization', () => {
    expect(isMemberInBannerAudience('state', 'Bihar', geoInState('bihar'), silent)).toBe(false);
    expect(isMemberInBannerAudience('state', 'Bihar', geoInState(' Bihar'), silent)).toBe(false);
  });
});

describe('⛔ the `state` arm FAILS CLOSED — typed-absent must never mean "visible"', () => {
  // ⭐ THE LOAD-BEARING ASSERTION OF THIS STORY. A typed absence is not "no opinion"; it is a DENY.
  // Every one of the four causes must deny independently — a test that only covered one would pass
  // against an implementation that special-cased it.
  it.each([
    'no-posting-row',
    'no-tree-published',
    'node-not-in-tree',
    'no-ancestor-at-dimension',
  ] as const)('typed-absent state (`%s`) → FALSE, never true', (reason) => {
    expect(isMemberInBannerAudience('state', 'Bihar', geoWithoutState(reason), silent)).toBe(false);
  });

  it('NO resolved geo at all (caller passed none) → FALSE', () => {
    expect(isMemberInBannerAudience('state', 'Bihar', null, silent)).toBe(false);
  });

  it('a banner with NO scope value → FALSE even for a fully-resolved member', () => {
    expect(isMemberInBannerAudience('state', null, geoInState('Bihar'), silent)).toBe(false);
  });

  it('logs the CLOSED absence reason so the denial is greppable by cause', () => {
    const logger = { info: vi.fn() };
    isMemberInBannerAudience('state', 'Bihar', geoWithoutState('no-tree-published'), logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0]?.[1]).toMatchObject({
      audience_scope: 'state',
      audience_scope_value: 'Bihar',
      member_geo_absence_reason: 'no-tree-published',
    });
  });

  it('does NOT log when the state arm actually resolves (the note means "something is missing")', () => {
    const logger = { info: vi.fn() };
    isMemberInBannerAudience('state', 'Bihar', geoInState('Bihar'), logger);
    isMemberInBannerAudience('state', 'Bihar', geoInState('UP'), logger);
    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe('`role` / `cohort` — NOT ADDRESSED, and NOT the same case as `state` (Story 1.19 AC4/D8)', () => {
  it.each(['role', 'cohort'] as const)('`%s` → false — no member attribute exists at any layer', (scope) => {
    expect(isMemberInBannerAudience(scope, 'some-value', null, silent)).toBe(false);
  });

  // ⭐ Asserted PER ARM, not per file. The distinction is the whole point of AC4: `state` was
  // "resolvable, not yet wired"; these are "there is nothing to resolve against". A future reader
  // who collapses them would go looking for a tree fix that cannot exist.
  it.each(['role', 'cohort'] as const)(
    '`%s` stays false even when the member geo resolved FULLY — geo is irrelevant to it',
    (scope) => {
      expect(isMemberInBannerAudience(scope, 'some-value', geoInState('Bihar'), silent)).toBe(false);
    },
  );

  it('logs a note saying NO ATTRIBUTE EXISTS — not "not yet resolvable"', () => {
    const logger = { info: vi.fn() };
    isMemberInBannerAudience('cohort', 'lock-in-2026', null, logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info.mock.calls[0]?.[0]).toMatch(/no member attribute exists/i);
    expect(logger.info.mock.calls[0]?.[1]).toMatchObject({
      audience_scope: 'cohort',
      audience_scope_value: 'lock-in-2026',
    });
  });

  it('its log carries NO geo absence reason — there is no geo question here to answer', () => {
    const logger = { info: vi.fn() };
    isMemberInBannerAudience('role', 'verifier', geoInState('Bihar'), logger);
    expect(logger.info.mock.calls[0]?.[1]).not.toHaveProperty('member_geo_absence_reason');
  });

  it('does NOT log for a resolvable scope (the note means "something is missing", not "a read happened")', () => {
    const logger = { info: vi.fn() };
    isMemberInBannerAudience('members-all', null, null, logger);
    isMemberInBannerAudience('public', null, null, logger);
    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe('coverage of the DB enum', () => {
  it('answers for EVERY value in the banner_audience_scope enum (no unhandled arm)', () => {
    for (const scope of BANNER_AUDIENCE_SCOPES) {
      expect(typeof isMemberInBannerAudience(scope, null, null, silent)).toBe('boolean');
    }
  });

  // ⚠ RESTATED BY STORY 1.19, deliberately. The old form asserted
  // `TARGETABLE.includes(scope) === predicate(scope, null, silent)` — i.e. "targetable" meant
  // "returns true for a member with nothing supplied". That equivalence broke the moment `state`
  // became targetable, because `state` correctly denies a member whose geo is unresolved.
  //
  // ⭐ The property that actually matters is unchanged and is now stated directly: a scope is
  // TARGETABLE iff the predicate can return true for SOME member. Anything else would let the admin
  // console's "not yet targetable" indicator drift from the rule the member read applies.
  it('BANNER_TARGETABLE_AUDIENCE_SCOPES agrees with the predicate: targetable ⇔ SOME member can see it', () => {
    // One representative input per scope that would resolve TRUE if the scope resolves at all.
    const bestCaseInput = (scope: (typeof BANNER_AUDIENCE_SCOPES)[number]) =>
      isMemberInBannerAudience(scope, 'Bihar', geoInState('Bihar'), silent);

    for (const scope of BANNER_AUDIENCE_SCOPES) {
      expect(BANNER_TARGETABLE_AUDIENCE_SCOPES.includes(scope)).toBe(bestCaseInput(scope));
    }
  });

  it('`state` is now IN the targetable list, and `role`/`cohort` are NOT', () => {
    expect(BANNER_TARGETABLE_AUDIENCE_SCOPES).toContain('state');
    expect(BANNER_TARGETABLE_AUDIENCE_SCOPES).not.toContain('role');
    expect(BANNER_TARGETABLE_AUDIENCE_SCOPES).not.toContain('cohort');
  });

  // ⚠ The contracts mirror's sync-guard is an ORDER-SENSITIVE `toEqual`, so position matters.
  it('lists `state` LAST — the position the contracts mirror must match', () => {
    expect([...BANNER_TARGETABLE_AUDIENCE_SCOPES]).toEqual(['public', 'members-all', 'state']);
  });
});
