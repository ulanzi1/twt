import { readFileSync } from 'node:fs';
// Story 5.13 code review round 2 — the verify judges a code's expiry at ONE instant, minted AFTER the member lock. DB-FREE (source).
//
// The domain makes "after the lock" structural: `lockMemberWaYesForCodeVerify` is the ONLY minter of a `CodeClockInstant`, and
// `findLiveCodes` / `consumeCode` / `recordWrongAttempt` require one. What the types cannot say is "ONE per verify" — a second
// mint passed to the consume would re-open the match/consume split (a code that dies across the audit insert ⇒ a 500, where AC4
// answers `code_no_longer_valid`). This pins it: the verify mints exactly once, takes ⛔ bare lock, and threads that one instant.

import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../../src/modules/wa-opt-in/code-handlers.ts', import.meta.url), 'utf8');
const verifyBody = (() => {
  const start = source.indexOf('async verify(');
  expect(start).toBeGreaterThan(-1);
  return source.slice(start);
})();

describe('the code verify — one expiry instant, minted after the lock', () => {
  it('mints the instant exactly ONCE, through the lock-and-mint call (⛔ a bare lockMemberWaYes)', () => {
    expect(verifyBody.match(/lockMemberWaYesForCodeVerify\(/g)).toHaveLength(1);
    expect(verifyBody).not.toMatch(/\blockMemberWaYes\(/);
  });

  it('the match, the consume and a wrong attempt all read THAT instant', () => {
    expect(verifyBody).toMatch(/const asOf = await waOptIn\.lockMemberWaYesForCodeVerify\(/);
    expect(verifyBody).toMatch(/const theRequest = \{[^}]*\basOf\b[^}]*\}/);
    expect(verifyBody).toMatch(/findLiveCodes\(tx, theRequest\)/);
    expect(verifyBody).toMatch(/recordWrongAttempt\(tx, theRequest\)/);
    expect(verifyBody).toMatch(/consumeCode\(tx, \{[^}]*\basOf\b[^}]*\}\)/);
  });
});
