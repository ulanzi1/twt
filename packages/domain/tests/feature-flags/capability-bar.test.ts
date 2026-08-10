// The capability-bar loader + the seeded-bar hash pin — Story 10.8 (Task 3/11; AC5/AC6/AC9).
//
// The bar is a GOVERNANCE artifact: a document nobody attested must not load, and a document that
// changed without attestation must not pass unnoticed. Both properties are tested here.

import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { canonicalJsonStringify } from '../../src/canonical-json.js';
import {
  allowlistedFlagKeys,
  loadCapabilityBar,
  parseCapabilityBar,
} from '../../src/feature-flags/capability-bar.js';
import { CapabilityBarInvalidError } from '../../src/feature-flags/errors.js';
import { FLAG_DEFAULTS, FLAG_KEYS } from '../../src/feature-flags/registry.js';

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

  it('⚠ every prohibited root RESOLVES TO A REAL DIRECTORY on disk', () => {
    // This assertion used to be `expect(p.root).toMatch(/^(packages|scripts)/)`, which is satisfied
    // by `packages/typo/nowhere` — i.e. it certified nothing about whether the load-bearing leg
    // actually scans anything. A stale root (a module rename, a moved package, a typo) made leg (b)
    // silently scan ZERO files for that root while printing a green checkmark. Check the filesystem.
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
    for (const p of loadCapabilityBar().prohibited) {
      const abs = join(repoRoot, p.root);
      expect(existsSync(abs), `prohibited root does not exist: ${p.root}`).toBe(true);
      expect(statSync(abs).isDirectory(), `prohibited root is not a directory: ${p.root}`).toBe(true);
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
// ⚖ UPDATED by Story 10.23 (2026-08-07) — a DELIBERATE bar change, admitted through the workflow:
//   · new `allow` entry `member_flow` / `restoration_discipline_imposition` (the AC14 rollout flag
//     gating the automatic restoration-lock-in writer), with its rationale and adr;
//   · `count` bumped 4 → 5 in the SAME commit (the revert-sanity teeth the YAML header requires);
//   · attested by Decision `2026-08-07-088` clauses 4-5 + Decision `2026-08-07-089`.
// ⛔ The entry's rationale states the enablement authority in terms — Trustee-Panel-exclusive,
// through a formal `.decision-log.md` entry — because this flag gates an automatic process that
// removes a member's COVERAGE with no human in the loop.
// ⚖ UPDATED by Story 10.19 (2026-08-10) — a DELIBERATE bar change, admitted through the workflow:
//   · new `allow` entry `member_flow` / `termination_access_block` (the Q6 rollout gate on denying
//     session issuance to a terminated member), with its rationale and adr;
//   · `count` bumped 5 → 6 in the SAME commit (the revert-sanity teeth the YAML header requires);
//   · attested by Decision `2026-08-10-097` clauses 6-8 + Decision `2026-08-10-098`.
// ⛔ THIS ENTRY EXTENDED THE BAR INTO AUTHENTICATION — the first flag to condition it. That extension
// was the RULING (`097` clause 7(i), ratified-as-written by `098` clause 2), NOT a consequence of the
// source scan passing: `apps/api/src/modules/auth/` is simply not among the prohibited roots, and a
// green leg (b) proves the root is unlisted, not that the behaviour is admissible.
// ⛔ Its rationale TRACES the fail-open polarity to the member rather than asserting it, because the
// `kyc_manual_fallback` attestation asserted the opposite of its own code through three review passes.
const EXPECTED_BAR_HASH = '11da8ec7b166ca4bc313970baaec6b652ef34c33b3b7071b9637d5290dcb010a';

describe('governance_boundary.yaml golden hash', () => {
  it('matches the frozen hash — a bar change requires deliberate attestation', () => {
    const bar = loadCapabilityBar();
    // Hashed over the PARSED, canonicalized structure rather than the raw bytes: comments and
    // formatting in the YAML are documentation and must be freely editable, while the semantic
    // content (which behaviours are toggleable, under what attestation, and which roots are
    // prohibited) is what needs pinning. canonicalJsonStringify (RFC 8785) so key order cannot
    // false-flip the guard.
    //
    // ⚠ `rationale` and `prohibition` ARE hashed (Review Pass 2). They were excluded, which left the
    // pin blind to the one field that IS the governance artifact: AC6 makes an entry's rationale the
    // substance of the trustee attestation ("additions … require trustee-attested PRs with explicit
    // rationale"), and the parser only checks that it is non-empty. So a rationale could be replaced
    // with a false one — or with "x" — and this guard, whose stated job is to catch exactly that,
    // stayed green. Whitespace is normalised because YAML folded scalars re-wrap on edit and a
    // reflow is not a semantic change.
    const norm = (s: string): string => s.trim().replace(/\s+/g, ' ');
    const hash = createHash('sha256')
      .update(
        canonicalJsonStringify({
          version: bar.version,
          count: bar.count,
          kinds: [...bar.kinds].sort(),
          allow: bar.allow.map((e) => ({
            kind: e.kind,
            artifact: e.artifact,
            adr: e.adr,
            rationale: norm(e.rationale),
          })),
          prohibited: bar.prohibited.map((p) => ({
            root: p.root,
            prohibition: norm(p.prohibition),
          })),
        } as never),
        'utf8',
      )
      .digest('hex');
    expect(hash).toBe(EXPECTED_BAR_HASH);
  });
});

// ── The FLAG_DEFAULTS pin (AC2's other half) ────────────────────────────────────────────────────
// AC2 requires "a fixture-pinned hash test pins the seeded capability bar + THE DEFAULT FLAG
// DOCUMENTS". Only the bar was pinned (Review Pass 2). The gap mattered most for exactly the field
// that was found inverted: `kyc_manual_fallback.fallbackDefault` flipping true↔false silently
// changes what happens to every member when a cohort rule cannot be evaluated — DigiLocker becoming
// hard-mandatory by default, with zero flips and zero audit lines — and every existing assertion
// about FLAG_DEFAULTS was per-field, so nothing caught a change to a field nobody thought to assert.
//
// If you are INTENTIONALLY changing a flag default: that is a governance change (the bar's admission
// workflow applies to the paired `allow` entry), so update this hash deliberately.
// ⚖ UPDATED by Story 10.23 (2026-08-07) — the paired half of the bar change above: the new
// `restoration_discipline_imposition` default. ⛔ `fallbackDefault: false` is load-bearing and is
// separately asserted below: AC14 requires default-OFF to be the behaviour of the ABSENT
// configuration, so every degraded path (no version in force, malformed cohort rule, lookup error)
// must land on "the writer does nothing".
// ⚖ UPDATED by Story 10.19 (2026-08-10) — the paired half of the bar change above: the new
// `termination_access_block` default. ⛔ `fallbackDefault: false` is load-bearing here in the OPPOSITE
// direction from every other flag in this file, and is separately asserted below: for
// `restoration_discipline_imposition` it means "the writer does nothing" (a safeguard that fails
// SAFE); here it means "session issuance is NOT denied", i.e. a terminated member RECEIVES A NORMAL
// SESSION — a safeguard that fails OPEN. That is deliberate and ratified (Q6 sub-choice (b-i)): it is
// the status quo, so no degraded path is a regression, and default-OFF must be the behaviour of the
// ABSENT configuration until the Panel authorises the flip.
// ⚖ RE-PINNED within Story 10.19 (2026-08-10): `termination_access_block`'s `description` was
// shortened 618 → 505 chars to fit the 512-char WIRE cap on `FeatureFlagInventoryResponse`. A
// description edit is a hash change like any other; the behaviour it describes did not change.
const EXPECTED_FLAG_DEFAULTS_HASH = 'd5b6d3bb6f98ab882900e053030b427d292f82b8ad67f611b8343adff242b4e8';

describe('FLAG_DEFAULTS golden hash', () => {
  it('matches the frozen hash — a seeded flag default cannot change unnoticed', () => {
    const hash = createHash('sha256')
      .update(
        canonicalJsonStringify(
          Object.fromEntries(
            Object.entries(FLAG_DEFAULTS).map(([key, d]) => [
              key,
              {
                state: d.state,
                fallbackDefault: d.fallbackDefault,
                owner: d.owner,
                deadBy: d.deadBy,
                cohortDefinition: d.cohortDefinition,
                description: d.description.trim().replace(/\s+/g, ' '),
              },
            ]),
          ) as never,
        ),
        'utf8',
      )
      .digest('hex');
    expect(hash).toBe(EXPECTED_FLAG_DEFAULTS_HASH);
  });

  it('⛔ restoration_discipline_imposition DEFAULTS OFF — AC14, and absence is what must be off', () => {
    // Story 10.23 AC14: "a test asserts the default: with no flag configuration present, the writer
    // performs NO imposition — no row, no event. Default-off must be the behaviour of the ABSENT
    // configuration, not a value that happens to be seeded off."
    //
    // `state: 'off'` covers the seeded case; `fallbackDefault: false` is the one that covers ABSENCE
    // — it is what every degraded path resolves to (no version in force, malformed cohort rule,
    // lookup error). Asserted by name rather than left to the golden hash, because the hash tells a
    // future reader THAT something changed and this tells them WHY it must not: flipping either
    // makes an automatic process start removing members' coverage with no human in the loop, and
    // enabling it is Trustee-Panel-exclusive (Decision 2026-08-07-089).
    const flag = FLAG_DEFAULTS['restoration_discipline_imposition'];
    expect(flag).toBeDefined();
    expect(flag?.state).toBe('off');
    expect(flag?.fallbackDefault).toBe(false);
    expect(flag?.cohortDefinition).toEqual({ clauses: [] });
  });

  it('⛔ termination_access_block DEFAULTS OFF and FAILS OPEN — Q6 (b-i), and absence is what must be off', () => {
    // Decision `2026-08-10-097` clause 6, sub-choice (b-i): the block ships default-OFF and the flip
    // is gated on Story 10.21 landing. `state: 'off'` covers the seeded case; `fallbackDefault:
    // false` is the one that covers ABSENCE — what every degraded path resolves to (no version in
    // force, malformed cohort rule, lookup error).
    //
    // ⛔ READ THE POLARITY BEFORE "FIXING" IT. `false` here means "do NOT deny session issuance",
    // so every degraded path yields a NORMAL SESSION for a terminated member. This safeguard FAILS
    // OPEN — the opposite direction from `restoration_discipline_imposition` above, where `false`
    // means "do nothing" and fails safe. Flipping this to `true` would make an unevaluable cohort
    // rule START denying sessions, i.e. enable the block by accident, with zero flips and zero
    // Panel decision — which is precisely the governance violation the entry's rationale forbids.
    // The fail-open direction is deliberate and ratified (`097` clause 7(ii), `098` clause 2): it is
    // today's behaviour, so no degraded path is a regression.
    //
    // Asserted by name rather than left to the golden hash, because the hash tells a future reader
    // THAT something changed and this tells them WHY it must not.
    const flag = FLAG_DEFAULTS['termination_access_block'];
    expect(flag).toBeDefined();
    expect(flag?.state).toBe('off');
    expect(flag?.fallbackDefault).toBe(false);
    expect(flag?.cohortDefinition).toEqual({ clauses: [] });
    // The name is load-bearing: `parseCapabilityBar` rejects any artifact containing
    // `member_lifecycle` (freeze row 2), and this gate reads the MODERATION OVERLAY, never
    // `members.state`. Pinned so a rename toward lifecycle vocabulary fails here as well as at parse.
    expect(Object.keys(FLAG_DEFAULTS)).toContain('termination_access_block');
    expect(Object.keys(FLAG_DEFAULTS).some((k) => k.includes('member_lifecycle'))).toBe(false);
  });

  it('⚠ every description fits the WIRE cap — an overrun blanks the WHOLE inventory, not one flag', () => {
    // `FeatureFlagInventoryResponse.description` is `z.string().max(512)`
    // (`packages/contracts/src/feature-flags/feature-flags.ts:94`), and the inventory handler
    // projects EVERY registered flag into one strict response. So a single over-length description
    // fails serialization for the entire payload and the admin console renders "Could not load the
    // flag inventory" — hiding every flag, which is precisely the outage `safeCohort`'s header
    // (`apps/api/src/modules/feature-flags/handlers.ts:102-112`) records for malformed cohorts.
    //
    // ⚖ ADDED by Story 10.19 (2026-08-10) after `termination_access_block` shipped at 618 chars and
    // took out seven live-DB E2E assertions with a 500. Caught only by an integration suite, which
    // is a slow and indirect way to learn about a string cap — this asserts it at the source, in a
    // unit test, where the next author gets the answer in milliseconds and with the reason attached.
    const WIRE_MAX = 512;
    const over = Object.entries(FLAG_DEFAULTS)
      .map(([key, d]) => ({ key, len: d.description.length }))
      .filter((e) => e.len > WIRE_MAX);
    expect(over).toEqual([]);
  });

  it('⚠ kyc_manual_fallback.fallbackDefault is FALSE — the degraded path keeps members able to join', () => {
    // Named explicitly, not just covered by the hash, because the hash tells a future reader THAT
    // something changed and this tells them WHY it must not. The flag is named for the CUTOVER, so
    // `fallbackDefault: false` means "cutover not active" → the seam's `!enabled` → the manual
    // fallback stays AVAILABLE. `true` traces to the CTA being hidden, i.e. KYC hard-mandatory on an
    // unevaluable rule — the exact outcome the capability-bar attestation says is impossible.
    expect(FLAG_DEFAULTS['kyc_manual_fallback']?.fallbackDefault).toBe(false);
  });
});
