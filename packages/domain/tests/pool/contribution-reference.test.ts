// Idempotent contribution payment-reference derivation — DB-free unit + property + frozen-vector suite
// (Story 7.7, Task 6; AC1). The derivation is PURE, so this suite proves: determinism, stability across
// repeats (the idempotency-by-construction guarantee), bounded length (the NPCI ceiling correctness
// property), collision-sanity over a large fast-check sample, and FROZEN seeded vectors that pin the exact
// bytes so a silent algorithm drift is caught (the 7.4 frozen-vector discipline).
//
// ── The frozen vectors are a CONTRACT, not a snapshot to regenerate ────────────
// A diff in any pinned vector below means an intentional CONTRIBUTION_REF_VERSION bump ('v1' → 'v2') of
// the whole four-tuple { prefix, hash fn, delimiter/encoding, truncation width }. Never "fix" a failing
// vector by pasting the new value — that silently breaks the idempotency guarantee for already-issued
// references (a repeated payment would derive a DIFFERENT tr= and double-credit).

import { createHash } from 'node:crypto';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_REF_MAX_LENGTH,
  CONTRIBUTION_REF_PREFIX,
  CONTRIBUTION_REF_VERSION,
  contributionReferenceCore,
  deriveContributionReference,
} from '../../src/pool/index.js';
import { alertId as toAlertId, memberId as toMemberId } from '../../src/ids/index.js';

/** Deterministic, replay-stable UUIDs from a seed — SHA-256(`${seed}:${i}`) → 8-4-4-4-12 hex (the
 *  assign.test.ts seeded-uuid discipline). The ONLY id source for the frozen vectors, so the suite
 *  re-derives byte-identically. A property generator must NEVER source a frozen vector. */
function seededUuid(seed: string, i: number): string {
  const hex = createHash('sha256').update(`${seed}:${String(i)}`).digest().subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const M0 = seededUuid('twt-7.7-frozen-member', 0);
const M1 = seededUuid('twt-7.7-frozen-member', 1);
const A0 = seededUuid('twt-7.7-frozen-alert', 0);
const A1 = seededUuid('twt-7.7-frozen-alert', 1);

/** Arbitrary strings EXCLUDING the preimage delimiter — `contributionReferenceCore` now rejects a
 *  delimiter-containing input (the delimiter-injection guard), so property inputs must exclude it. */
const nonDelimiterString = fc.string().filter((s) => !s.includes(':'));

describe('deriveContributionReference — determinism + stability (AC1.1)', () => {
  it('is a PURE function of (memberId, alertId): identical across repeated calls (idempotency by construction)', () => {
    fc.assert(
      fc.property(nonDelimiterString, nonDelimiterString, (memberId, alertId) => {
        const first = contributionReferenceCore(memberId, alertId);
        const second = contributionReferenceCore(memberId, alertId);
        // A repeated payment for the same (member, alert) derives the SAME tr= — reconciles as ONE contribution.
        expect(first).toBe(second);
      }),
    );
  });

  it('the branded public API matches the string core (same derivation, no re-hash)', () => {
    // Both branded ids are UUIDs; the derivation lowercases nothing extra — the branded constructor already
    // canonicalizes to lowercase, so the branded API and the string core agree on a lowercased id.
    const branded = deriveContributionReference({ memberId: toMemberId(M0), alertId: toAlertId(A0) });
    expect(branded).toBe(contributionReferenceCore(M0, A0));
  });

  it('distinguishes the two components — swapping member/alert changes the reference (delimiter is load-bearing)', () => {
    // Without a delimiter, (member="ab", alert="c") and (member="a", alert="bc") would collide.
    expect(contributionReferenceCore('ab', 'c')).not.toBe(contributionReferenceCore('a', 'bc'));
  });

  it('THROWS if either input contains the preimage delimiter — the collision this guard prevents', () => {
    // Without the guard, ('a:b', 'c') and ('a', 'b:c') would derive the SAME preimage ('a:b:c').
    expect(() => contributionReferenceCore('a:b', 'c')).toThrow(/preimage delimiter/);
    expect(() => contributionReferenceCore('a', 'b:c')).toThrow(/preimage delimiter/);
  });
});

describe('deriveContributionReference — bounded length (AC1.3, the NPCI ceiling correctness property)', () => {
  it('never exceeds the NPCI tr= ceiling across a broad input space', () => {
    fc.assert(
      fc.property(nonDelimiterString, nonDelimiterString, (memberId, alertId) => {
        const ref = contributionReferenceCore(memberId, alertId);
        expect(ref.length).toBeLessThanOrEqual(CONTRIBUTION_REF_MAX_LENGTH);
      }),
    );
  });

  it('is a clean lowercase-alphanumeric token: `contrib-v1-` + base32 body (UPI tr=-safe charset)', () => {
    fc.assert(
      fc.property(nonDelimiterString, nonDelimiterString, (memberId, alertId) => {
        const ref = contributionReferenceCore(memberId, alertId);
        expect(ref.startsWith(`${CONTRIBUTION_REF_PREFIX}${CONTRIBUTION_REF_VERSION}-`)).toBe(true);
        // Whole reference is lowercase base32-safe (a-z2-7) plus the prefix's hyphen/digit — no case, no +/_.
        expect(ref).toMatch(/^contrib-v1-[a-z2-7]+$/);
      }),
    );
  });
});

describe('deriveContributionReference — collision sanity (AC1.3)', () => {
  it('maps distinct (member, alert) pairs to distinct references over a large sample', () => {
    // 96-bit digest ⇒ collisions are astronomically unlikely; a large deterministic sweep must stay injective.
    const seen = new Map<string, string>();
    for (let m = 0; m < 250; m++) {
      const member = seededUuid('twt-7.7-collision-member', m);
      for (let a = 0; a < 40; a++) {
        const alert = seededUuid('twt-7.7-collision-alert', a);
        const ref = contributionReferenceCore(member, alert);
        const key = `${member}|${alert}`;
        for (const [priorKey, priorRef] of seen) {
          if (priorRef === ref) {
            expect(priorKey).toBe(key); // same ref ⇒ must be the same pair (never a real collision)
          }
        }
        seen.set(key, ref);
      }
    }
    // 10,000 distinct pairs → 10,000 distinct references.
    expect(new Set(seen.values()).size).toBe(seen.size);
  });
});

// ── FROZEN REFERENCE VECTORS — the pinned whole-contract replay identity ───────
// A change here == a deliberate CONTRIBUTION_REF_VERSION bump (see the header). Epic 9 must reproduce
// these EXACT bytes from (member_id, alert_id) + the version pin to dedupe correctly.
describe('FROZEN VECTORS — a change here == a deliberate CONTRIBUTION_REF_VERSION bump', () => {
  it('the version pin is v1', () => {
    expect(CONTRIBUTION_REF_VERSION).toBe('v1');
  });

  it('the seeded id generator is itself pinned (guards the vectors below)', () => {
    expect(M0).toBe('b09d0509-2859-c314-4bb9-7cfe520a314d');
    expect(M1).toBe('91b7d27c-478f-2b99-5332-43de7ada6dbc');
    expect(A0).toBe('b885f7f9-686c-a57f-2a20-187c95453988');
    expect(A1).toBe('860fcda0-97c6-56f7-16c9-8a81b207262a');
  });

  it('pins the exact derived bytes for four (member, alert) pairs', () => {
    expect(contributionReferenceCore(M0, A0)).toBe('contrib-v1-aqfjx5w6ni53cse246oa');
    expect(contributionReferenceCore(M0, A1)).toBe('contrib-v1-kfcsaht2abr3ttyczxkq');
    expect(contributionReferenceCore(M1, A0)).toBe('contrib-v1-vybhxndzunrxwh24tvna');
    expect(contributionReferenceCore(M1, A1)).toBe('contrib-v1-2nawx362g2tvmx3mu2ra');
  });

  it('the frozen references are all within the NPCI ceiling', () => {
    for (const ref of [
      contributionReferenceCore(M0, A0),
      contributionReferenceCore(M0, A1),
      contributionReferenceCore(M1, A0),
      contributionReferenceCore(M1, A1),
    ]) {
      expect(ref.length).toBeLessThanOrEqual(CONTRIBUTION_REF_MAX_LENGTH);
    }
  });
});
