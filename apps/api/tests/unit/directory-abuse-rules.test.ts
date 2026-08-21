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

import { parseDirectoryAbuseRules, type DirectoryAbuseRules } from '@twt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import type { AuthAuditEvent } from '../../src/audit/audit-sink.js';
import {
  __resetDirectoryAbuseCounters,
  evaluateDirectoryAbuse,
  loadDirectoryAbuseRules,
  resolveRulesPath,
  type DirectoryRequestSignal,
} from '../../src/modules/public-pages/abuse-rules.js';

// ⭐ THE PRODUCTION RESOLVER, ⛔ not a second copy of the same walk. This used to rebuild the
// `createRequire` resolution itself, so the real one could break — an `exports` map added to
// `@twt/contracts` without a `"./package.json"` entry, or a packaging step that copies `dist/`
// without the sibling `public-pages/*.yaml` — while this stayed green. ⚠ That failure is not
// contained to the directory: `loadDirectoryAbuseRules` runs inside `buildServer()`, so it takes
// down EVERY route in the API.
const RULES_PATH = resolveRulesPath();

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
    // The AC-named triggers are all DECLARED — four active, one honestly no-subject.
    // ⚠ `deep_page_access` + `rapid_pagination` are the `2026-08-21-145` cl.4 SPLIT of the old
    // single `rapid_pagination`, which promised a rate and measured a position.
    expect(rules.rules.map((r) => r.id).sort()).toEqual(
      [
        'deep_crawl',
        'deep_page_access',
        'high_volume_lookups',
        'rapid_pagination',
        'repeated_district_queries',
      ].sort(),
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

  /** A Pariwar id for attribution assertions. ⚠ A real uuid shape — the audit row stores a uuid. */
  const SIG_PARIWAR = '11111111-1111-4111-8111-111111111111';

  /**
   * Fill the attribution fields every signal must carry.
   *
   * ⚠ A HELPER, ⛔ not a default on `DirectoryRequestSignal` itself: `pariwarId` and `traceId` are
   * REQUIRED on the interface precisely because omitting them silently wrote every abuse line under
   * the nil GLOBAL pariwar. Making them optional again would restore that defect and this helper
   * would hide it.
   */
  const sig = (
    s: Omit<DirectoryRequestSignal, 'pariwarId' | 'traceId'> &
      Partial<Pick<DirectoryRequestSignal, 'pariwarId' | 'traceId'>>,
  ): DirectoryRequestSignal => ({
    pariwarId: SIG_PARIWAR,
    traceId: null,
    ...s,
  });

  it('high_volume_lookups fires on request VOLUME from one key', () => {
    const { deps, events } = fakeDeps();
    // ⚠ ACCUMULATED, ⛔ not overwritten: the rule fires on the request that CROSSES the threshold,
    // and the per-(key,rule) dedupe then suppresses every later one — so reading only the last
    // return value would see `[]` and wrongly report the detector dead.
    const fired: string[] = [];
    for (let i = 0; i < 61; i += 1) {
      fired.push(
        ...evaluateDirectoryAbuse(deps, rules, sig({ key: 'v1', page: 1, limit: 25, at: at(i * 100) })),
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
      evaluateDirectoryAbuse(deps, rules, sig({ key: 'same', page: 1, limit: 25, at: at(i * 1000) }));
    }
    expect(events.some((e) => String(e.resourceLocator).includes('deep_crawl'))).toBe(false);

    // 25 DISTINCT pages from a different key → the walk signature.
    const fired: string[] = [];
    for (let p = 1; p <= 25; p += 1) {
      fired.push(
        ...evaluateDirectoryAbuse(deps, rules, sig({ key: 'walker', page: p, limit: 25, at: at(p * 1000) })),
      );
    }
    expect(fired).toContain('deep_crawl');
  });

  it('deep_page_access fires on page DEPTH — and it says so, rather than claiming a rate', () => {
    const { deps } = fakeDeps();
    const fired = evaluateDirectoryAbuse(deps, rules, sig({ key: 'deep', page: 40, limit: 25, at: at(0) }));
    expect(fired).toContain('deep_page_access');
    // …and a shallow page from a fresh key does not.
    expect(
      evaluateDirectoryAbuse(deps, rules, sig({ key: 'shallow', page: 2, limit: 25, at: at(0) })),
    ).not.toContain('deep_page_access');
  });

  it('⭐ rapid_pagination measures a RATE — one deep request does NOT trip it', () => {
    // ⛔ THE REGRESSION GUARD FOR `2026-08-21-145` cl.4. The old rule set `observed` to the deepest
    // page on the FIRST request, so a visitor following a shared link or resuming a bookmark to
    // `?page=45` emitted an abuse line with ZERO velocity measured — and in a 10k-member Pariwar
    // the whole second half of the legitimate page range was permanently flagged.
    const { deps } = fakeDeps();
    const fired = evaluateDirectoryAbuse(
      deps,
      rules,
      sig({ key: 'bookmark', page: 190, limit: 25, at: at(0) }),
    );
    expect(fired).not.toContain('rapid_pagination');
  });

  it('⭐ rapid_pagination fires on sustained page-to-page ADVANCE', () => {
    const { deps } = fakeDeps();
    const fired: string[] = [];
    // 25 transitions (pages 1→26), inside the 300s window.
    for (let p = 1; p <= 26; p += 1) {
      fired.push(
        ...evaluateDirectoryAbuse(deps, rules, sig({ key: 'walk', page: p, limit: 25, at: at(p * 1000) })),
      );
    }
    expect(fired).toContain('rapid_pagination');
  });

  it('⛔ NEGATIVE CONTROL — REFRESHING one page is not pagination, however often', () => {
    // ⚠ Without this, `page_transitions` could be implemented as a plain request counter and every
    // other assertion here would still pass — it would just be `high_volume_lookups` twice.
    const { deps } = fakeDeps();
    const fired: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      fired.push(
        ...evaluateDirectoryAbuse(deps, rules, sig({ key: 'refresher', page: 7, limit: 25, at: at(i * 1000) })),
      );
    }
    expect(fired).not.toContain('rapid_pagination');
  });

  it('⭐ every emitted line carries its PARIWAR and trace — ⛔ never the nil GLOBAL pariwar', () => {
    // ⛔ Regression guard: the emit omitted `pariwarId`/`traceId`, so `authEventToAuditInput`
    // defaulted every abuse row to `00000000-…` with a null trace — invisible to the Story 1.10
    // Pariwar-scoped audit reader, and two Pariwars crawled at once were indistinguishable.
    const { deps, events } = fakeDeps();
    for (let p = 1; p <= 30; p += 1) {
      evaluateDirectoryAbuse(
        deps,
        rules,
        sig({ key: 'attrib', page: p, limit: 25, at: at(p * 1000), traceId: 'trace-abc' }),
      );
    }
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.pariwarId).toBe(SIG_PARIWAR);
      expect(e.pariwarId).not.toBe('00000000-0000-0000-0000-000000000000');
      expect(e.traceId).toBe('trace-abc');
    }
  });

  it('⛔ the NO-SUBJECT rule NEVER fires — it is declared, not evaluated', () => {
    const { deps, events } = fakeDeps();
    for (let p = 1; p <= 120; p += 1) {
      evaluateDirectoryAbuse(deps, rules, sig({ key: 'everything', page: p, limit: 50, at: at(p * 10) }));
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
      evaluateDirectoryAbuse(deps, rules, sig({ key: 'reader', page: p, limit: 25, at: at(p * 20_000) }));
    }
    expect(events).toEqual([]);
  });

  it('dedupes: one sustained crawler does NOT emit a line per request', () => {
    const { deps, events } = fakeDeps();
    for (let i = 0; i < 200; i += 1) {
      evaluateDirectoryAbuse(deps, rules, sig({ key: 'flood', page: 1, limit: 25, at: at(i * 100) }));
    }
    const volume = events.filter((e) => String(e.resourceLocator).includes('high_volume_lookups'));
    // 200 requests × 100ms = 20s — one dedupe window, so exactly one line.
    expect(volume).toHaveLength(1);
  });

  it('⛔ never throws into the request path, even on a nonsense signal', () => {
    const { deps } = fakeDeps();
    expect(() =>
      evaluateDirectoryAbuse(
        deps,
        rules,
        sig({
          key: 'x',
          page: Number.NaN,
          limit: Number.NaN,
          at: new Date(Number.NaN),
        }),
      ),
    ).not.toThrow();
  });
});
