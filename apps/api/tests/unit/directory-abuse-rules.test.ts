// The directory anti-enumeration rules + detector — Story 11a.3 (Task 9; AC6.4, AC10).
//
// Two halves, mirroring the module's own pure/impure split:
//   · the PARSER — a malformed file THROWS, ⛔ never degrades to "no rules". Each planted defect is
//     its OWN case: ⛔ one fixture tripping several checks hides which one actually fired.
//   · the DETECTOR — each active rule fires on its own signal and ⛔ NOT on the others', the
//     no-subject rule NEVER fires, and the emitted line carries the rule id where it survives.
//
// ⚠ The COMMITTED file is parsed here too, so a future edit that breaks it fails this test rather
// than the server's first boot.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { parseDirectoryAbuseRules, type DirectoryAbuseRules } from '@twt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import type { AuthAuditEvent } from '../../src/audit/audit-sink.js';
import {
  __resetDirectoryAbuseCounters,
  evaluateDirectoryAbuse,
  loadDirectoryAbuseRules,
} from '../../src/modules/public-pages/abuse-rules.js';

const require = createRequire(import.meta.url);
const RULES_PATH = join(
  dirname(require.resolve('@twt/contracts/package.json')),
  'public-pages',
  'directory-abuse-rules.yaml',
);

/** A minimal deps stub carrying only what the detector touches. */
function fakeDeps(): { deps: AppDeps; events: AuthAuditEvent[] } {
  const events: AuthAuditEvent[] = [];
  const deps = {
    auditSink: { emit: (e: AuthAuditEvent) => events.push(e) },
    clock: () => new Date('2026-06-15T12:00:00.000Z'),
  } as unknown as AppDeps;
  return { deps, events };
}

const MINIMAL = `
version: 1
audit_action: directory.abuse_suspected
rules:
  - id: only_rule
    status: active
    description: a rule
    detects: request_volume
    window_seconds: 60
    threshold: 3
`;

describe('directory-abuse-rules — the PARSER fails LOUD', () => {
  it('parses the COMMITTED file, and it declares at least one active rule', () => {
    const rules = parseDirectoryAbuseRules(readFileSync(RULES_PATH, 'utf-8'));
    expect(rules.version).toBeGreaterThan(0);
    expect(rules.audit_action).toBe('directory.abuse_suspected');
    expect(rules.rules.filter((r) => r.status === 'active').length).toBeGreaterThan(0);
    // The four AC-named triggers are all DECLARED — three active, one honestly no-subject.
    expect(rules.rules.map((r) => r.id).sort()).toEqual(
      ['deep_crawl', 'high_volume_lookups', 'rapid_pagination', 'repeated_district_queries'].sort(),
    );
  });

  it('⛔ THROWS on an EMPTY document — an empty rules file is a FAILURE, not "no rules"', () => {
    expect(() => parseDirectoryAbuseRules('')).toThrow(/empty/i);
    expect(() => parseDirectoryAbuseRules('# only a comment\n')).toThrow(/empty/i);
  });

  it('⛔ THROWS on malformed YAML', () => {
    expect(() => parseDirectoryAbuseRules('version: 1\n  bad:\n :indent')).toThrow(/YAML parse error/);
  });

  it('⛔ THROWS on an UNKNOWN key (strict) — a typo must not be silently ignored', () => {
    expect(() => parseDirectoryAbuseRules(`${MINIMAL}    unexpected_key: 3\n`)).toThrow(/malformed/);
  });

  it('⛔ THROWS when an ACTIVE rule has no threshold — coverage that cannot fire', () => {
    const bad = MINIMAL.replace('    threshold: 3\n', '');
    expect(() => parseDirectoryAbuseRules(bad)).toThrow(/active but is missing/);
  });

  it('⛔ THROWS when a NO-SUBJECT rule omits its reason or its activation trigger', () => {
    const bad = `
version: 1
audit_action: directory.abuse_suspected
rules:
  - id: only_rule
    status: active
    description: a rule
    detects: request_volume
    window_seconds: 60
    threshold: 3
  - id: dangling
    status: no_subject_yet
    description: declared but unreachable
    detects: district_query_volume
`;
    expect(() => parseDirectoryAbuseRules(bad)).toThrow(/no_subject_reason and activation_trigger/);
  });

  it('⛔ THROWS when NO rule is active — a file where nothing can fire is vacuous green', () => {
    const bad = `
version: 1
audit_action: directory.abuse_suspected
rules:
  - id: inert
    status: no_subject_yet
    description: nothing
    detects: district_query_volume
    no_subject_reason: because
    activation_trigger: someday
`;
    expect(() => parseDirectoryAbuseRules(bad)).toThrow(/no rule is active/);
  });

  it('⛔ THROWS on a duplicate rule id — the id IS the triage signal', () => {
    expect(() => parseDirectoryAbuseRules(MINIMAL + MINIMAL.split('rules:')[1]!)).toThrow();
  });

  it('⛔ THROWS when audit_action is retargeted — ⛔ abuse.honeypot must never be reused', () => {
    const bad = MINIMAL.replace('directory.abuse_suspected', 'abuse.honeypot');
    expect(() => parseDirectoryAbuseRules(bad)).toThrow(/malformed/);
  });

  it('⛔ loadDirectoryAbuseRules THROWS on a missing file — the directory must not serve ruleless', () => {
    expect(() => loadDirectoryAbuseRules('/nonexistent/directory-abuse-rules.yaml')).toThrow(
      /could not be read/,
    );
  });
});

describe('directory-abuse-rules — the DETECTOR fires, and fires SPECIFICALLY', () => {
  let rules: DirectoryAbuseRules;

  beforeEach(() => {
    __resetDirectoryAbuseCounters();
    rules = loadDirectoryAbuseRules(RULES_PATH);
  });

  const at = (msOffset: number): Date => new Date(Date.parse('2026-06-15T12:00:00.000Z') + msOffset);

  it('high_volume_lookups fires on request VOLUME from one key', () => {
    const { deps, events } = fakeDeps();
    // ⚠ ACCUMULATED, ⛔ not overwritten: the rule fires on the request that CROSSES the threshold,
    // and the per-(key,rule) dedupe then suppresses every later one — so reading only the last
    // return value would see `[]` and wrongly report the detector dead.
    const fired: string[] = [];
    for (let i = 0; i < 61; i += 1) {
      fired.push(
        ...evaluateDirectoryAbuse(deps, rules, { key: 'v1', page: 1, limit: 25, at: at(i * 100) }),
      );
    }
    expect(fired).toContain('high_volume_lookups');
    const line = events.find((e) => String(e.resourceLocator).includes('high_volume_lookups'));
    expect(line).toBeDefined();
    expect(line?.type).toBe('directory.abuse_suspected');
    // ⭐ The rule id + a coarse, NON-PII shape, in the ONE field that survives the audit row.
    expect(line?.resourceLocator).toMatch(/^directory:high_volume_lookups:p\d+:l\d+$/);
    // ⛔ No account here to name — every visitor is unauthenticated.
    expect(line?.actorId).toBeNull();
  });

  it('deep_crawl fires on DISTINCT pages — ⛔ not on repeated hits to the same page', () => {
    const { deps, events } = fakeDeps();

    // 24 hits on ONE page: below the volume threshold and only ONE distinct page.
    for (let i = 0; i < 24; i += 1) {
      evaluateDirectoryAbuse(deps, rules, { key: 'same', page: 1, limit: 25, at: at(i * 1000) });
    }
    expect(events.some((e) => String(e.resourceLocator).includes('deep_crawl'))).toBe(false);

    // 25 DISTINCT pages from a different key → the walk signature.
    const fired: string[] = [];
    for (let p = 1; p <= 25; p += 1) {
      fired.push(
        ...evaluateDirectoryAbuse(deps, rules, { key: 'walker', page: p, limit: 25, at: at(p * 1000) }),
      );
    }
    expect(fired).toContain('deep_crawl');
  });

  it('rapid_pagination fires on page DEPTH', () => {
    const { deps } = fakeDeps();
    const fired = evaluateDirectoryAbuse(deps, rules, { key: 'deep', page: 40, limit: 25, at: at(0) });
    expect(fired).toContain('rapid_pagination');
    // …and a shallow page from a fresh key does not.
    expect(
      evaluateDirectoryAbuse(deps, rules, { key: 'shallow', page: 2, limit: 25, at: at(0) }),
    ).not.toContain('rapid_pagination');
  });

  it('⛔ the NO-SUBJECT rule NEVER fires — it is declared, not evaluated', () => {
    const { deps, events } = fakeDeps();
    for (let p = 1; p <= 120; p += 1) {
      evaluateDirectoryAbuse(deps, rules, { key: 'everything', page: p, limit: 50, at: at(p * 10) });
    }
    expect(events.some((e) => String(e.resourceLocator).includes('repeated_district_queries'))).toBe(
      false,
    );
    // ⚠ …and the file still SAYS why, so the gap is visible rather than absent.
    const declared = rules.rules.find((r) => r.id === 'repeated_district_queries');
    expect(declared?.status).toBe('no_subject_yet');
    expect(declared?.no_subject_reason).toMatch(/no district filter/i);
    expect(declared?.activation_trigger).toBeTruthy();
  });

  it('an ordinary reader trips NOTHING — the rules are not a tripwire on normal use', () => {
    const { deps, events } = fakeDeps();
    for (let p = 1; p <= 5; p += 1) {
      evaluateDirectoryAbuse(deps, rules, { key: 'reader', page: p, limit: 25, at: at(p * 20_000) });
    }
    expect(events).toEqual([]);
  });

  it('dedupes: one sustained crawler does NOT emit a line per request', () => {
    const { deps, events } = fakeDeps();
    for (let i = 0; i < 200; i += 1) {
      evaluateDirectoryAbuse(deps, rules, { key: 'flood', page: 1, limit: 25, at: at(i * 100) });
    }
    const volume = events.filter((e) => String(e.resourceLocator).includes('high_volume_lookups'));
    // 200 requests × 100ms = 20s — one dedupe window, so exactly one line.
    expect(volume).toHaveLength(1);
  });

  it('⛔ never throws into the request path, even on a nonsense signal', () => {
    const { deps } = fakeDeps();
    expect(() =>
      evaluateDirectoryAbuse(deps, rules, {
        key: 'x',
        page: Number.NaN,
        limit: Number.NaN,
        at: new Date(Number.NaN),
      }),
    ).not.toThrow();
  });
});
