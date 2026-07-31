// The capability-bar loader + the seeded-bar hash pin — Story 10.8 (Task 3/11; AC5/AC6/AC9).
//
// The bar is a GOVERNANCE artifact: a document nobody attested must not load, and a document that
// changed without attestation must not pass unnoticed. Both properties are tested here.

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { canonicalJsonStringify } from '../../src/canonical-json.js';
import {
  allowlistedFlagKeys,
  loadCapabilityBar,
  parseCapabilityBar,
} from '../../src/feature-flags/capability-bar.js';
import { CapabilityBarInvalidError } from '../../src/feature-flags/errors.js';
import { FLAG_KEYS } from '../../src/feature-flags/registry.js';

/** A minimal well-formed bar the negative cases mutate one field at a time. */
const VALID = `
version: 1
count: 1
kinds:
  - member_flow
allow:
  - kind: member_flow
    artifact: some_flag
    rationale: because it selects between two shipped code paths
    adr: ADR-0036
prohibited:
  - root: packages/domain/src/audit
    prohibition: a flag must never disable audit logging
`;

function expectReasons(raw: string, matcher: RegExp): void {
  let thrown: unknown;
  try {
    parseCapabilityBar(raw);
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(CapabilityBarInvalidError);
  expect((thrown as CapabilityBarInvalidError).reasons.join(' | ')).toMatch(matcher);
}

describe('parseCapabilityBar — the happy path', () => {
  it('parses a well-formed bar', () => {
    const bar = parseCapabilityBar(VALID);
    expect(bar.version).toBe(1);
    expect(bar.count).toBe(1);
    expect(bar.allow).toHaveLength(1);
    expect(bar.allow[0]?.artifact).toBe('some_flag');
    expect(bar.prohibited).toHaveLength(1);
  });
});

describe('parseCapabilityBar — LOUD failure (a silently-degrading governance artifact is worse than an absent one)', () => {
  it('throws on a non-mapping top level', () => {
    expectReasons('- just\n- a list\n', /top-level must be a mapping/);
  });

  it('throws when `count` disagrees with allow.length (the revert-sanity cross-check)', () => {
    // The bank-allowlist trick: dropping an entry without bumping count, or vice-versa, fails.
    expectReasons(VALID.replace('count: 1', 'count: 2'), /count \(2\) !== allow\.length \(1\)/);
  });

  it('throws on an unknown `kind`', () => {
    expectReasons(VALID.replace('kind: member_flow\n    artifact', 'kind: anything_goes\n    artifact'), /kind must be one of/);
  });

  it('throws on a MISSING RATIONALE — an unattested bar expansion (AC6)', () => {
    expectReasons(VALID.replace(/ *rationale: .*\n/, ''), /rationale must be a non-empty string/);
  });

  it('throws on a missing `adr` reference', () => {
    expectReasons(VALID.replace(/ *adr: .*\n/, ''), /adr must be a non-empty string/);
  });

  it('throws on a duplicate artifact', () => {
    const dup = VALID.replace('count: 1', 'count: 2').replace(
      'prohibited:',
      `  - kind: member_flow
    artifact: some_flag
    rationale: a second entry for the same key
    adr: ADR-0036
prohibited:`,
    );
    expectReasons(dup, /duplicate artifact 'some_flag'/);
  });

  it('⚠ REJECTS an entry naming an architecturally FROZEN behaviour, citing the freeze row (prohibition e)', () => {
    // Prohibition (e) has no import to scan for — the violation is in what the bar CLAIMS a flag may
    // toggle, so it is caught at admission. This is the leg that keeps "a flag may not alter a
    // freeze-table row" mechanized rather than merely written down.
    expectReasons(VALID.replace('artifact: some_flag', 'artifact: rbac_escalation_mode'), /FROZEN behaviour.*freeze row 9/s);
    expectReasons(VALID.replace('artifact: some_flag', 'artifact: skip_validity_check'), /FROZEN behaviour.*freeze row 11/s);
    expectReasons(VALID.replace('artifact: some_flag', 'artifact: consent_optional'), /FROZEN behaviour.*prohibition \(b\)/s);
  });

  it('⚠ REJECTS an EMPTY prohibited list — it would make gate leg (b) scan nothing and pass vacuously', () => {
    const noProhibited = VALID.replace(/prohibited:[\s\S]*$/, 'prohibited: []\n');
    expectReasons(noProhibited, /at least one root.*vacuous/);
  });

  it('⚠ REJECTS a `prohibited[].root` with path traversal, before it ever reaches the gate\'s filesystem join', () => {
    expectReasons(VALID.replace('root: packages/domain/src/audit', 'root: ../../etc'), /repo-relative path with no traversal/);
    expectReasons(VALID.replace('root: packages/domain/src/audit', 'root: packages/../../etc'), /repo-relative path with no traversal/);
  });

  it('⚠ REJECTS a `prohibited[].root` that is an absolute path', () => {
    expectReasons(VALID.replace('root: packages/domain/src/audit', 'root: /etc/passwd'), /repo-relative path with no traversal/);
  });

  it('collects EVERY reason, not just the first', () => {
    const doubly = VALID.replace('count: 1', 'count: 9').replace('kind: member_flow\n    artifact', 'kind: bogus\n    artifact');
    let thrown: unknown;
    try {
      parseCapabilityBar(doubly);
    } catch (e) {
      thrown = e;
    }
    expect((thrown as CapabilityBarInvalidError).reasons.length).toBeGreaterThan(1);
  });
});

describe('the SHIPPED governance_boundary.yaml', () => {
  it('loads from the repo root and is internally consistent', () => {
    const bar = loadCapabilityBar();
    expect(bar.count).toBe(bar.allow.length);
    expect(bar.prohibited.length).toBeGreaterThan(0);
  });

  it('admits EXACTLY the registered flag keys — the bar and the registry cannot drift', () => {
    // This is gate leg (a) asserted at the unit level too, in BOTH directions: neither half can move
    // alone. (The repo-global gate asserts the same thing; having it here means a domain-only test
    // run still catches the drift.)
    expect(allowlistedFlagKeys(loadCapabilityBar())).toEqual([...FLAG_KEYS]);
  });

  it('every prohibited root names a real governance module path', () => {
    for (const p of loadCapabilityBar().prohibited) {
      expect(p.root).toMatch(/^(packages|scripts)/);
      expect(p.prohibition.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── The seeded-bar hash pin (the default-policy-hash.test.ts precedent) ──────────────────────────
// The capability bar governs what a feature flag may change in production. An unreviewed edit to it
// is exactly the "silent expansion" AC6 exists to prevent, and a reviewer skimming a large diff can
// miss a one-line `allow` addition. This guard fails the moment the bar's CONTENT changes, forcing
// the change to be deliberate.
//
// If you are INTENTIONALLY changing the bar: complete the admission workflow in the YAML header
// (trustee attestation + rationale + ADR + `count` bump), then update EXPECTED_BAR_HASH below to the
// hash this test reports on failure.
const EXPECTED_BAR_HASH = '1710dfee1a17ffbf39b8004521a7c2652c0cd1ab5688e30043e170bdc96efbf2';

describe('governance_boundary.yaml golden hash', () => {
  it('matches the frozen hash — a bar change requires deliberate attestation', () => {
    const bar = loadCapabilityBar();
    // Hashed over the PARSED, canonicalized structure rather than the raw bytes: comments and
    // formatting in the YAML are documentation and must be freely editable, while the semantic
    // content (which behaviours are toggleable, under what attestation, and which roots are
    // prohibited) is what needs pinning. canonicalJsonStringify (RFC 8785) so key order cannot
    // false-flip the guard.
    const hash = createHash('sha256')
      .update(
        canonicalJsonStringify({
          version: bar.version,
          count: bar.count,
          allow: bar.allow.map((e) => ({ kind: e.kind, artifact: e.artifact, adr: e.adr })),
          prohibited: bar.prohibited.map((p) => p.root),
        } as never),
        'utf8',
      )
      .digest('hex');
    expect(hash).toBe(EXPECTED_BAR_HASH);
  });
});
