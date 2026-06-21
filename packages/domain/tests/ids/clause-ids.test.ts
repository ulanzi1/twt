// Niyamavali clause-ID smart-constructor unit tests — Story 2.3 (AC1, AC2).
//
// `clauseVersionId` is a UUID brand (reuses the shared validator). `clauseId` is
// the FIRST non-UUID branded id: a `niy.<section>.<clause>[.<subclause>]` slug
// with a bespoke format constructor. These tests assert the runtime contract:
// the format regex accepts the canonical examples + rejects every malformed
// shape, throwing the typed InvalidClauseIdError.

import { describe, expect, it } from 'vitest';

import {
  CLAUSE_ID_REGEX,
  InvalidBrandedIdError,
  InvalidClauseIdError,
  clauseId,
  clauseVersionId,
} from '../../src/ids/index.js';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('clauseVersionId (UUID brand)', () => {
  it('returns the value for a valid UUID and lowercases it', () => {
    expect(clauseVersionId(VALID_UUID)).toBe(VALID_UUID);
    expect(clauseVersionId(VALID_UUID.toUpperCase())).toBe(VALID_UUID);
  });

  it('throws InvalidBrandedIdError for a non-UUID', () => {
    expect(() => clauseVersionId('niy.foo.bar')).toThrow(InvalidBrandedIdError);
  });
});

describe('clauseId (AC2 slug brand)', () => {
  it.each([
    'niy.contribution-discipline.r7-a',
    'niy.ninety-percent-rule.r8',
    'niy.special-death.r9-suicide-murder',
    'niy.section.clause', // minimal: no subclause
    'niy.a1.b2', // alphanumeric single-segment slugs
  ])('accepts the canonical/valid slug %s', (good) => {
    expect(clauseId(good)).toBe(good);
    expect(CLAUSE_ID_REGEX.test(good)).toBe(true);
  });

  it('returns the slug UNCHANGED (no normalisation — already lowercase)', () => {
    const v = 'niy.contribution-discipline.r7-a';
    // identity, not a lowercased copy
    expect(clauseId(v)).toBe(v);
  });

  it.each([
    ['empty string', ''],
    ['missing niy prefix', 'foo.contribution-discipline.r7'],
    ['only two segments (no clause)', 'niy.contribution-discipline'],
    ['four-plus segments (too deep)', 'niy.a.b.c.d'],
    ['uppercase', 'niy.Contribution.R7'],
    ['leading hyphen in a segment', 'niy.-contribution.r7'],
    ['trailing hyphen in a segment', 'niy.contribution-.r7'],
    ['double hyphen', 'niy.contribution--discipline.r7'],
    ['underscore', 'niy.contribution_discipline.r7'],
    ['space', 'niy.contribution discipline.r7'],
    ['trailing dot', 'niy.contribution.r7.'],
    ['sql-ish injection', `niy.r7'; DROP TABLE clause_versions; --`],
    ['a bare uuid is not a clause id', VALID_UUID],
  ])('throws InvalidClauseIdError for %s', (_label, bad) => {
    expect(() => clauseId(bad)).toThrow(InvalidClauseIdError);
  });

  it('error carries the received value for diagnostics', () => {
    try {
      clauseId('bad');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidClauseIdError);
      expect((err as InvalidClauseIdError).received).toBe('bad');
      expect((err as InvalidClauseIdError).message).toContain('ClauseId');
    }
  });
});
