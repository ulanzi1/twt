// Story 6.38 (DL3, N3; code review round 2, patch 1) — the two advisory-lock KEYS an erasure takes are CASE-INSENSITIVE on the ids.
// ⛔ DB.
//
// Why it matters: `acquireErasureLocks` is called with BRANDED ids (`uuidBrand` lower-cases), while the export-grant paths in
// `member-data-rights/handlers.ts` key the SAME `rtbf` lock on the raw request string — and the contract accepts an any-case
// `uuid()`. A key that hashes the spelling gave an upper-case request an erasure key and a grant key that never met, so the
// "no grant against an artifact about to be zeroed" serialisation (10.21) was silently lost for that input. The fix lives in
// the key functions (lower-case before hashing), so EVERY caller agrees whatever spelling it was handed.
//
// ⭐ The control: the lower-case spelling still hashes to the SAME bigint it always did (so no lock a live process holds moves).

import { describe, expect, it } from 'vitest';

import { intakeAdvisoryLockKey } from '../../src/claim/icp-lock.js';
import { rtbfAdvisoryLockKey } from '../../src/member/rtbf-legality.js';

const PARIWAR = '3f9b1c52-8a1e-4c7d-9d0a-5b2e6f7a8c91';
const MEMBER = 'a7d2e5c0-1b3f-4e68-b9a4-0c6d8e2f4a13';
const OTHER_MEMBER = 'a7d2e5c0-1b3f-4e68-b9a4-0c6d8e2f4a14';

describe('Story 6.38 — erasure advisory-lock keys ignore the spelling (case) of the ids', () => {
  it.each([
    ['rtbfAdvisoryLockKey', rtbfAdvisoryLockKey],
    ['intakeAdvisoryLockKey', intakeAdvisoryLockKey],
  ] as const)('%s — an UPPER-case or mixed-case id hashes to the same key as its lower-case form', (_name, key) => {
    const lower = key(PARIWAR, MEMBER);
    expect(key(PARIWAR.toUpperCase(), MEMBER.toUpperCase())).toBe(lower);
    expect(key(PARIWAR, MEMBER.toUpperCase())).toBe(lower);
    expect(key(PARIWAR.toUpperCase(), MEMBER)).toBe(lower);
  });

  it.each([
    ['rtbfAdvisoryLockKey', rtbfAdvisoryLockKey],
    ['intakeAdvisoryLockKey', intakeAdvisoryLockKey],
  ] as const)('⭐ %s positive control — a DIFFERENT member still gets a different key (the fix does not collapse the key space)', (_name, key) => {
    expect(key(PARIWAR, OTHER_MEMBER)).not.toBe(key(PARIWAR, MEMBER));
  });

  it('the two namespaces stay apart: the rtbf key and the intake key for the same member are different locks', () => {
    expect(rtbfAdvisoryLockKey(PARIWAR, MEMBER)).not.toBe(intakeAdvisoryLockKey(PARIWAR, MEMBER));
  });

  it('⭐ the lower-case spelling hashes to the SAME bigint as before this change (no live lock key moves)', () => {
    // Pinned from the pre-change implementation: sha256(`member.rtbf:${p}:${m}`) / sha256(`${p}:${m}`), first 15 hex chars.
    expect(rtbfAdvisoryLockKey(PARIWAR, MEMBER)).toBe(0x9577cfc2b34621fn);
    expect(intakeAdvisoryLockKey(PARIWAR, MEMBER)).toBe(0x30e8bd6048187bcn);
  });
});
