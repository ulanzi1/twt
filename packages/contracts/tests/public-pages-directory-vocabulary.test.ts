// The internal→public VOCABULARY BOUNDARY on the Member Directory wire — Decision
// `2026-08-21-144` clause 4 (the ruling) and clause 8 (the gap it created).
//
// ⭐ WHY THIS FILE EXISTS. The Trustee Panel ruled that the INTERNAL lifecycle value
// `lock-in` is NON-PUBLIC, while the presentation label "Waiting period" IS public.
// Clause 8 recorded that the shipped wire contract contradicted that ruling: the enum
// read `'lock-in'` and `handlers.ts` emitted it on a public, unauthenticated JSON route.
//
// ⛔ The fix is only as durable as its guard. Every other test on this surface asserts the
// vocabulary by RESTATING it in a fixture, so all of them would go green again the moment
// someone changed the enum back and updated the fixtures alongside it — the vacuous-green
// shape this project refuses elsewhere. These tests assert the PROPERTY instead: that no
// internal lifecycle word appears in the public enum, whatever the enum happens to say.
//
// Pure, DB-free, no network.

import { describe, expect, it } from 'vitest';

import {
  PublicDirectoryEntry,
  PublicDirectoryMemberStatus,
} from '../src/public-pages/index.js';

/**
 * The INTERNAL member lifecycle vocabulary (`members.state`), which ⛔ must never cross onto
 * a public wire. Kept as a literal list rather than imported from `@twt/domain`: contracts
 * must not import domain's pg-touching namespaces, and a public-boundary guard that depends
 * on the internal package is a guard that can be quietly weakened from the other side.
 */
const INTERNAL_LIFECYCLE_WORDS = [
  'pending-kyc',
  'pending-fee',
  'pending-valid',
  'lock-in',
  'active-in-grace',
  'lapsed-unpaid',
  'suspended',
  'terminated',
] as const;

describe('Member Directory wire vocabulary (2026-08-21-144 cl.4 / cl.8)', () => {
  it('⛔ REJECTS the internal value `lock-in` — the exact regression clause 8 fixed', () => {
    expect(PublicDirectoryMemberStatus.safeParse('lock-in').success).toBe(false);

    const entry = PublicDirectoryEntry.safeParse({
      name: 'Sunita Devi',
      district: 'Kanpur',
      status: 'lock-in',
    });
    expect(entry.success).toBe(false);
  });

  it('⛔ admits NO internal lifecycle word, whatever the enum currently says', () => {
    // The property, not a restatement of the fixture: iterate the enum as it actually is.
    for (const value of PublicDirectoryMemberStatus.options) {
      expect(INTERNAL_LIFECYCLE_WORDS).not.toContain(value);
    }
  });

  it('accepts the ruled public vocabulary, and exactly two labels', () => {
    expect([...PublicDirectoryMemberStatus.options].sort()).toEqual(['active', 'waiting-period']);

    for (const value of ['active', 'waiting-period']) {
      expect(PublicDirectoryMemberStatus.safeParse(value).success).toBe(true);
    }
  });

  it('⛔ admits no third label — `active-in-grace` has no public representation of its own', () => {
    // `2026-08-20-143` cl.3: a grace period is an internal billing state, and publishing it
    // would tell a stranger that a member is late on a payment. It presents as `active`.
    expect(PublicDirectoryMemberStatus.safeParse('active-in-grace').success).toBe(false);
    expect(PublicDirectoryMemberStatus.options).toHaveLength(2);
  });

  it('⛔ the entry stays .strict() — an over-returning row is a leak, not an ignored field', () => {
    const withExtra = PublicDirectoryEntry.safeParse({
      name: 'Sunita Devi',
      district: 'Kanpur',
      status: 'waiting-period',
      member_id: 'anything',
    });
    expect(withExtra.success).toBe(false);
  });
});
