// PII scrape verification-engine + matrix-schema tests — Story 1.16b (AC-2/AC-3).
//
// Fixture-driven, pure: no network, no DB, no live render (this is a DB-free
// story). Covers, per the AC-2 testing list:
//   (1) the four tier-leak rules — each with a leak fixture (→ fail naming
//       surface + field) and a compliant fixture (→ pass), plus fail-closed on
//       an undeclared rendered field;
//   (2) the naked-PII detector — phone / email / Aadhaar present (→ match) and
//       clean HTML (→ none);
//   (3) matrix parse — valid → typed object; malformed → throw; empty → null;
//   (4) evaluateSnapshot orchestration — no-render → no-op; public HTML with PII
//       → fail; fields leak → fail; compliant → pass;
//   (5) the committed scaffold matrix parses to zero surfaces (self-green no-op).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  type PublicVsPrivateMatrix,
  VISIBILITY_TIERS,
  detectNakedPii,
  evaluateSnapshot,
  evaluateSurfaceRender,
  parsePublicVsPrivateMatrix,
} from '../src/public-pages/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// A fixture matrix exercising all four tiers on one surface.
const FIXTURE: PublicVsPrivateMatrix = {
  version: 1,
  surfaces: [
    {
      id: 'member-directory',
      route: '/members',
      renders: false,
      search_indexing_policy: 'noindex', cache_policy: 'edge_cacheable', paginated: false,
      fields: [
        { id: 'full_name', tier: 'public' },
        { id: 'district', tier: 'authenticated_member' },
        { id: 'mobile', tier: 'operator_restricted' },
        { id: 'aadhaar', tier: 'never_exposed' },
      ],
    },
  ],
  escalations: [],
  escalation_count: 0,
};

describe('matrix schema parse (AC-1)', () => {
  it('parses a structurally valid matrix to a typed object', () => {
    const raw =
      'version: 1\nsurfaces:\n  - id: s\n    route: /s\n    search_indexing_policy: index\n    cache_policy: edge_cacheable\n    fields:\n      - id: f\n        tier: public\n';
    const matrix = parsePublicVsPrivateMatrix(raw);
    expect(matrix).not.toBeNull();
    expect(matrix?.version).toBe(1);
    expect(matrix?.surfaces[0]?.fields[0]?.tier).toBe('public');
  });

  it('returns null for a blank / comments-only document (empty → no-op)', () => {
    expect(parsePublicVsPrivateMatrix('')).toBeNull();
    expect(parsePublicVsPrivateMatrix('# only a comment\n')).toBeNull();
  });

  it('throws loudly on an unknown tier', () => {
    const raw =
      'version: 1\nsurfaces:\n  - id: s\n    route: /s\n    search_indexing_policy: index\n    cache_policy: edge_cacheable\n    fields:\n      - id: f\n        tier: semi_public\n';
    expect(() => parsePublicVsPrivateMatrix(raw)).toThrow(/malformed matrix/);
  });

  it('throws on an unknown search_indexing_policy', () => {
    const raw =
      'version: 1\nsurfaces:\n  - id: s\n    route: /s\n    search_indexing_policy: maybe\n    cache_policy: edge_cacheable\n    fields: []\n';
    expect(() => parsePublicVsPrivateMatrix(raw)).toThrow(/malformed matrix/);
  });

  it('throws on an extra (unknown) key — .strict() discipline', () => {
    const raw = 'version: 1\nsurfaces: []\nrogue: true\n';
    expect(() => parsePublicVsPrivateMatrix(raw)).toThrow(/malformed matrix/);
  });

  it('throws on a missing required key (surfaces)', () => {
    expect(() => parsePublicVsPrivateMatrix('version: 1\n')).toThrow(/malformed matrix/);
  });

  it('throws on invalid YAML', () => {
    expect(() => parsePublicVsPrivateMatrix('version: 1\n  : : bad')).toThrow(
      /YAML parse error|malformed/,
    );
  });
});

describe('tier-leak rules (AC-2)', () => {
  // Rule (a): never_exposed → appears on NO surface (any viewer).
  it('never_exposed leaks on a public render (fail, names surface + field)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'public', ['aadhaar']);
    expect(leaks).toHaveLength(1);
    expect(leaks[0]?.field).toBe('aadhaar');
    expect(leaks[0]?.surfaceId).toBe('member-directory');
    expect(leaks[0]?.tier).toBe('never_exposed');
  });
  it('never_exposed leaks on an authenticated_member render (no viewer context is exempt)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'authenticated_member', [
      'aadhaar',
    ]);
    expect(leaks).toHaveLength(1);
    expect(leaks[0]?.field).toBe('aadhaar');
    expect(leaks[0]?.tier).toBe('never_exposed');
  });
  it('never_exposed leaks even on an operator render (highest viewer)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'operator_restricted', [
      'aadhaar',
    ]);
    expect(leaks).toHaveLength(1);
    expect(leaks[0]?.field).toBe('aadhaar');
    expect(leaks[0]?.tier).toBe('never_exposed');
  });
  it('never_exposed absent from a render is compliant (pass)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'public', ['full_name']);
    expect(leaks).toHaveLength(0);
  });

  // Rule (b): operator_restricted → not on member or public renders.
  it('operator_restricted leaks on a member render (fail)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'authenticated_member', [
      'mobile',
    ]);
    expect(leaks).toHaveLength(1);
    expect(leaks[0]?.field).toBe('mobile');
  });
  it('operator_restricted is compliant on an operator render (pass)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'operator_restricted', [
      'mobile',
    ]);
    expect(leaks).toHaveLength(0);
  });

  // Rule (c): authenticated_member → not on public renders.
  it('authenticated_member leaks on a public render (fail)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'public', ['district']);
    expect(leaks).toHaveLength(1);
    expect(leaks[0]?.field).toBe('district');
  });
  it('authenticated_member is compliant on a member render (pass)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'authenticated_member', [
      'district',
    ]);
    expect(leaks).toHaveLength(0);
  });

  // Rule (d): public → renderable everywhere.
  it('public is compliant on a public render (pass)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'public', ['full_name']);
    expect(leaks).toHaveLength(0);
  });
  it('public is compliant on a member + operator render (pass)', () => {
    expect(
      evaluateSurfaceRender(FIXTURE, 'member-directory', 'authenticated_member', ['full_name']),
    ).toHaveLength(0);
    expect(
      evaluateSurfaceRender(FIXTURE, 'member-directory', 'operator_restricted', ['full_name']),
    ).toHaveLength(0);
  });

  // Mixing tiers above the viewer's context within a single render fails per field.
  it('reports every offending field when tiers are mixed above the viewer (fail)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'public', [
      'full_name', // ok
      'district', // leak
      'mobile', // leak
      'aadhaar', // leak
    ]);
    expect(leaks).toHaveLength(3);
    expect(leaks.map((l) => l.field).sort()).toEqual(['aadhaar', 'district', 'mobile']);
  });

  // Fail-closed: a rendered field the matrix does not declare is a leak.
  it('flags an undeclared rendered field (fail-closed, unclassified)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'public', ['secret_field']);
    expect(leaks).toHaveLength(1);
    expect(leaks[0]?.tier).toBe('unclassified');
  });

  // A surface absent from the matrix → every rendered field is unclassified.
  it('flags all fields on a surface absent from the matrix (fail-closed)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'unknown-surface', 'public', ['a', 'b']);
    expect(leaks).toHaveLength(2);
    expect(leaks.every((l) => l.tier === 'unclassified')).toBe(true);
  });
});

describe('naked-PII detector (AC-2)', () => {
  it('detects a naked Indian mobile number', () => {
    const matches = detectNakedPii('<p>Call 9876543210 for help</p>');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });
  it('detects a +91-prefixed mobile number', () => {
    const matches = detectNakedPii('<p>+91 9876543210</p>');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });
  it('detects a naked email address', () => {
    const matches = detectNakedPii('<a href="mailto:x">ram.kumar@example.org</a>');
    expect(matches.some((m) => m.type === 'email')).toBe(true);
  });
  it('detects a naked Aadhaar (grouped 4-4-4)', () => {
    const matches = detectNakedPii('<span>1234 5678 9012</span>');
    expect(matches.some((m) => m.type === 'aadhaar')).toBe(true);
  });
  it('detects a naked Aadhaar (12 contiguous digits)', () => {
    const matches = detectNakedPii('UID:123456789012.');
    expect(matches.some((m) => m.type === 'aadhaar')).toBe(true);
  });
  it('returns no matches for clean HTML', () => {
    expect(detectNakedPii('<h1>Welcome to the Trust</h1><p>About us.</p>')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRECISION — the other direction (Story 11a.4, AC-1)
//
// Every PII assertion above tests RECALL: a planted violation is caught. Before
// this block nothing in the repo asserted that a NON-PII digit run is *not*
// flagged, so the false-positive defect CR-D1-1.16b had no regression net and
// the integration corpus was authored AROUND it (scrape-test.spec.ts:146-147).
// This block is that net. Each case is planted INDEPENDENTLY — one fixture must
// never carry several expectations, or one detector can silently stop firing
// while its neighbours keep the suite green (scrape-test.spec.ts:654's doctrine).
//
// ⚠ Two of these are FIXED by the phone-lookbehind tightening; three are
// STANDING GUARDS over shapes that already pass and must never start failing.
// They are labelled so a future reader can tell which is which.
describe('naked-PII detector — PRECISION (FR-93 / Story 11a.4)', () => {
  // ── Fixed by the AC-2 tightening (each was a live false positive at 075827b).
  it('does not flag a 10-digit URL path segment as a phone number', () => {
    const matches = detectNakedPii('<a href="/blog/9876543210">Read the post</a>');
    expect(matches.filter((m) => m.type === 'phone')).toHaveLength(0);
  });

  it('does not flag a double-quoted numeric attribute as a phone number', () => {
    const matches = detectNakedPii('<span data-id="9123456789">Row</span>');
    expect(matches.filter((m) => m.type === 'phone')).toHaveLength(0);
  });

  it('does not flag a single-quoted numeric attribute as a phone number', () => {
    const matches = detectNakedPii("<span data-id='9123456789'>Row</span>");
    expect(matches.filter((m) => m.type === 'phone')).toHaveLength(0);
  });

  // ── Fixed by Decision 2026-08-22-150 (D2 superseded): the original AC-2
  // lookbehinds excluded a bare `'` or `/`, not the markup signature they were
  // meant to detect. These two cases were live false NEGATIVES at the tightened
  // D2 regex — a real phone number silently evaded detection.
  it('DOES flag a phone number quoted in prose, not inside an attribute', () => {
    const matches = detectNakedPii("<p>Call us at '9876543210' for help.</p>");
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });

  it('DOES flag the second number of a slash-separated alternate-number pair', () => {
    const matches = detectNakedPii('<p>Reach us at 9876543210/9123456789</p>');
    const phoneMatches = matches.filter((m) => m.type === 'phone').map((m) => m.value);
    expect(phoneMatches).toContain('9876543210');
    expect(phoneMatches).toContain('9123456789');
  });

  // ── Standing guards. These already pass; they exist so a future widening of
  // the pattern cannot start flagging a separated landline without going red.
  //
  // ⚠ THE CONTIGUOUS LANDLINE IS DELIBERATELY ABSENT, AND ITS ABSENCE IS THE
  // POINT. `08012345678` (STD 080 + 8-digit local) IS flagged today and that is
  // a genuine false positive — but it is `0` + [6-9] + 9 digits, the SAME token
  // shape as the legitimate 0-prefixed mobile `09876543210` pinned below. STD
  // codes whose second digit falls in 6-9 (079, 080, 066) collide with the
  // mobile pattern BY CONSTRUCTION, so ⛔ no context-free regex separates them.
  // Excluding the landline would stop catching the mobile — precision bought
  // with recall, which AC-2 forbids in terms. ⛔ Do not "fix" it here.
  it('does not flag a space-separated landline as a phone number', () => {
    const matches = detectNakedPii('<p>Office: 0801234 5678</p>');
    expect(matches.filter((m) => m.type === 'phone')).toHaveLength(0);
  });

  it('does not flag a hyphen-separated landline as a phone number', () => {
    const matches = detectNakedPii('<p>Office: 080-12345678</p>');
    expect(matches.filter((m) => m.type === 'phone')).toHaveLength(0);
  });

  // ── The recall pin on the collision. ⛔ This is NOT a precision case: it is
  // what makes the two guards above safe to trust. If a future tightening buys
  // precision with recall on the 0-prefix branch, this goes red first.
  it('STILL flags a 0-prefixed mobile number (recall pin — precision may never cost recall)', () => {
    const matches = detectNakedPii('<p>09876543210</p>');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });
});

describe('evaluateSnapshot orchestration (AC-2/AC-3)', () => {
  it('no html and no fields → no-op (a surface with no render)', () => {
    const v = evaluateSnapshot(FIXTURE, { surfaceId: 'member-directory', viewerContext: 'public' });
    expect(v.status).toBe('no-op');
  });

  it('public HTML render with naked PII → fail', () => {
    const v = evaluateSnapshot(FIXTURE, {
      surfaceId: 'member-directory',
      viewerContext: 'public',
      html: '<p>9876543210</p>',
    });
    expect(v.status).toBe('fail');
    expect(v.piiMatches.length).toBeGreaterThan(0);
  });

  it('public HTML render with clean content → pass', () => {
    const v = evaluateSnapshot(FIXTURE, {
      surfaceId: 'member-directory',
      viewerContext: 'public',
      html: '<h1>Members</h1>',
    });
    expect(v.status).toBe('pass');
  });

  it('does NOT run the PII detector on a non-public render', () => {
    const v = evaluateSnapshot(FIXTURE, {
      surfaceId: 'member-directory',
      viewerContext: 'operator_restricted',
      html: '<p>9876543210</p>', // an operator legitimately sees a mobile number
    });
    expect(v.piiMatches).toHaveLength(0);
    expect(v.status).toBe('pass');
  });

  it('field-set render with a tier leak → fail', () => {
    const v = evaluateSnapshot(FIXTURE, {
      surfaceId: 'member-directory',
      viewerContext: 'public',
      fields: ['full_name', 'aadhaar'],
    });
    expect(v.status).toBe('fail');
    expect(v.leaks.map((l) => l.field)).toContain('aadhaar');
  });

  it('field-set render fully within the viewer ceiling → pass', () => {
    const v = evaluateSnapshot(FIXTURE, {
      surfaceId: 'member-directory',
      viewerContext: 'authenticated_member',
      fields: ['full_name', 'district'],
    });
    expect(v.status).toBe('pass');
  });
});

describe('matrix uniqueness constraints', () => {
  it('throws on duplicate surface ids in the matrix', () => {
    const raw =
      'version: 1\nsurfaces:\n' +
      '  - id: dup\n    route: /dup\n    search_indexing_policy: index\n    cache_policy: edge_cacheable\n    fields: []\n' +
      '  - id: dup\n    route: /dup2\n    search_indexing_policy: noindex\n    cache_policy: edge_cacheable\n    fields: []\n';
    expect(() => parsePublicVsPrivateMatrix(raw)).toThrow(/duplicate surface id "dup"/);
  });
  it('throws on duplicate field ids within a surface', () => {
    const raw =
      'version: 1\nsurfaces:\n  - id: s\n    route: /s\n    search_indexing_policy: index\n    cache_policy: edge_cacheable\n    fields:\n' +
      '      - id: mobile\n        tier: public\n' +
      '      - id: mobile\n        tier: never_exposed\n';
    expect(() => parsePublicVsPrivateMatrix(raw)).toThrow(/duplicate field id "mobile"/);
  });
});

describe('evaluateSnapshot — edge cases', () => {
  const EMPTY_SURFACE_FIXTURE: PublicVsPrivateMatrix = {
    version: 1,
    surfaces: [
      { id: 'stub-surface', route: '/stub', renders: false, search_indexing_policy: 'noindex', cache_policy: 'edge_cacheable', paginated: false, fields: [] },
    ],
    escalations: [],
    escalation_count: 0,
  };

  it('emits a warning when the matched surface has no declared fields', () => {
    const v = evaluateSnapshot(EMPTY_SURFACE_FIXTURE, {
      surfaceId: 'stub-surface',
      viewerContext: 'public',
      fields: ['some_field'],
    });
    expect(v.status).toBe('fail'); // fail-closed: unclassified field
    expect(v.warnings.length).toBeGreaterThan(0);
    expect(v.warnings[0]).toMatch(/no fields/);
  });

  it('treats an empty-string html as no-op (no render available)', () => {
    const v = evaluateSnapshot(FIXTURE, {
      surfaceId: 'member-directory',
      viewerContext: 'public',
      html: '',
    });
    expect(v.status).toBe('no-op');
  });

  it('deduplicates repeated entries in renderedFieldIds', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'public', [
      'aadhaar',
      'aadhaar',
    ]);
    expect(leaks).toHaveLength(1);
  });
});

// ⭐ RETIRED BY STORY 11a.1 — this describe block used to assert
// `expect(matrix?.surfaces).toHaveLength(0)`, encoding Story 1.16b's self-green
// SCAFFOLD posture: the matrix was empty on purpose, so the gate was a no-op on
// purpose. This story is the event that retires that posture, and the assertion
// with it. ⛔ The failure mode the story named explicitly is reverting the matrix
// to keep the old assertion green — the empty matrix WAS the defect.
//
// What replaces it asserts the POPULATED invariants: the matrix is non-empty,
// every shipped route is declared, every field is tier-classified, and the ruled
// Tier-1 exception is present exactly once.
describe('committed matrix — the POPULATED invariants (Story 11a.1)', () => {
  const committed = (): PublicVsPrivateMatrix => {
    const raw = readFileSync(
      path.resolve(here, '../public-pages/public-vs-private-matrix.yaml'),
      'utf8',
    );
    const matrix = parsePublicVsPrivateMatrix(raw);
    if (matrix === null) throw new Error('the committed matrix parsed to the empty-document sentinel');
    return matrix;
  };

  it('is POPULATED — ⛔ no longer the zero-surface scaffold', () => {
    const matrix = committed();
    expect(matrix.version).toBeGreaterThanOrEqual(2);
    expect(matrix.surfaces.length).toBeGreaterThan(0);
  });

  it('declares every public route that ships today, plus the not-yet-built directory', () => {
    // The gate checks this against the real filesystem in both directions; this
    // asserts the committed CONTENT, so emptying the matrix fails here too — the
    // gate and the suite would have to be defeated together.
    const routes = committed().surfaces.map((s) => s.route).sort();
    expect(routes).toEqual(
      [
        '/',
        '/404',
        '/500',
        '/blog',
        '/blog/[postId]',
        '/members',
        '/niyamavali',
        // Story 11b.1 — the first Epic 11b surface to be declared, and declared only
        // because it SHIPPED A ROUTE.
        '/sahyog',
        // ⭐ Story 11b.3 — the SECOND, and declared on exactly the same terms: the route
        // shipped, so the bidirectional route-coverage leg demanded a declaration and this
        // is it. ⚠ It is the first DYNAMIC route in this list besides `/blog/[postId]`, and
        // the first that declares ZERO `pii_tier: 1` fields at `tier: public` — which is what
        // let it ship with ⛔ no Panel ruling and ⛔ no `tier1_public_exception` (D6(b),
        // `2026-09-02-182` cl.2).
        // ⛔ 11b.6 (/in-memoriam) STAYS UNDECLARED and must stay absent from this list until
        // it ships its own route — the omission is what the route-coverage leg makes safe.
        // ⚠ Story 11b.10 renamed the parameter to the drive's OPAQUE PUBLIC TOKEN.
        '/sahyog-vivran/[driveToken]',
        '/terms',
      ].sort(),
    );
  });

  it('every declared field carries a tier (no unclassified declarations)', () => {
    for (const surface of committed().surfaces) {
      for (const field of surface.fields) {
        expect(VISIBILITY_TIERS).toContain(field.tier);
      }
    }
  });

  it('classifies a real, non-trivial field set (a matrix of empty surfaces would prove nothing)', () => {
    const total = committed().surfaces.reduce((n, s) => n + s.fields.length, 0);
    expect(total).toBeGreaterThanOrEqual(20);
  });

  // ⭐ WIDENED 2026-08-24 by Decision `2026-08-24-159` cl.2 (Story 11b.1 / D1(b)) from ONE
  // ruled exception to EXACTLY TWO, BY NAME — and 2026-09-02 by `2026-08-28-165` cl.1
  // (Story 11b.3a) to **SIX**: the four nominee-bank pairs on `sahyog-vivran`. ⛔ This asserts
  // IDENTITY, not just the count — a count-only assertion would pass while an exception silently
  // migrated to some seventh field, which is the failure the enumerated allowlist exists to make
  // impossible. ⚠⛔ AND THE FOUR WERE ⛔ NOT SIX: `nominee_bank_name` / `nominee_branch` were Tier-3
  // PLAINTEXT and carried NO exception — an entry for either would be an "exception that does not
  // except anything", which the field-level check rejects in the other direction.
  //
  // ⭐⭐⛔ **NARROWED 2026-09-05 BY STORY 11b.11 — SIX → THREE, AND IT IS THE FIRST MOVE IN THIS
  // DIRECTION.** `2026-09-04-190` cl.1 (Trustee-ratified — Dhiraj Rahul, Kalpana Bharti) supersedes
  // `2026-08-28-165` cl.1-2 **IN PART**, withdrawing `nominee_account_number` and `nominee_ifsc`
  // (with the two Tier-3 bank siblings) from `public`; `2026-09-04-191` cl.1 withdraws
  // `nominee_vpa`; ⭐ `-190` cl.2 KEEPS `nominee_account_holder_name` and this entry is RE-KEYED to
  // that clause, because a survivor must cite the ruling that KEEPS it, ⛔ never the superseded one.
  // ⛔ `-165` itself is ⛔ NOT edited in place; its cl.3-4 STAND and the survivor rests on them.
  // ⭐ A NARROWING needs ⛔ no new authority beyond the ruling that ordered it: this allowlist is a
  // CEILING, and removing entries only ever lowers it. ⚠ The IDENTITY discipline is unchanged — the
  // assertion still names every pair, so a withdrawn exception silently reappearing FAILS here.
  it('carries EXACTLY the three ruled Tier-1 public exceptions, each attributed to its decision', () => {
    const exceptions = committed().surfaces.flatMap((s) =>
      s.fields.filter((f) => f.tier1_public_exception !== undefined).map((f) => ({ s, f })),
    );
    expect(
      exceptions
        .map((e) => `${e.s.id}.${e.f.id}@${e.f.tier1_public_exception?.decision ?? '??'}`)
        .sort(),
    ).toEqual([
      'member-directory.member_name@2026-08-19-136',
      'sahyog-drive.deceased_member_name@2026-08-24-159',
      'sahyog-vivran.nominee_account_holder_name@2026-09-04-190 cl.2',
    ]);
    for (const e of exceptions) expect(e.f.pii_tier).toBe(1);
  });

  // ⚠ THE TWO LEDGERS ARE NOT THE SAME LEDGER, and this is the assertion that keeps them
  // apart. Adding the second `tier1_public_exception` above did NOT add an escalation: an
  // `escalations:` entry records a tier MOVE (from → to) for a field ALREADY declared, and a
  // field being declared for the FIRST time has no honest `from` tier. Declaring a surface is
  // not an escalation. ⇒ exception blocks 1 → 2, escalation_count 1 → 1.
  it('declaring the second exception did NOT inflate the escalation ledger', () => {
    // ⭐ NOR DID 11b.3a's FOUR, and for exactly the same reason: an `escalations:` entry records a
    // tier MOVE (from → to) for a field ALREADY declared, and a field being declared for the FIRST
    // time has no honest `from` tier. ⇒ exception blocks 2 → 6, escalation_count 1 → 1.
    expect(committed().escalation_count).toBe(1);
    expect(committed().escalations).toHaveLength(1);
    expect(committed().escalations[0]?.surface).toBe('member-directory');
  });

  it('the escalation ledger count matches its entries, and each cites a decision', () => {
    const matrix = committed();
    expect(matrix.escalation_count).toBe(matrix.escalations.length);
    for (const e of matrix.escalations) expect(e.decision).not.toBe('');
  });

  it('the member-directory NOW RENDERS (11a.2 D1(a) supersedes 11a.1 D5), and stays noindex + paginated', () => {
    // ⚠ SUPERSEDED, ⛔ NOT DELETED. Story 11a.1 asserted `renders === false` under its
    // ruling D5. Story 11a.2 ruling D1(a) (Decision `2026-08-20-141`) ships the
    // `/members` route, so the flag moved — and the route-coverage leg is armed in
    // BOTH directions, so the flag and the page cannot move apart. Updating the
    // assertion to the new truth is the honest edit; leaving it would have asserted
    // that a shipped route does not ship.
    const directory = committed().surfaces.find((s) => s.id === 'member-directory');
    expect(directory?.renders).toBe(true);
    // ⛔ The full-name supersession moved the NAME FORM only — forced pagination
    // and noindex stand (`2026-08-19-135` cl.7(c)).
    expect(directory?.search_indexing_policy).toBe('noindex');
    // FR-91 — and this flag is what ARMS the pagination-binding leg on the route.
    expect(directory?.paginated).toBe(true);
  });

  it('⭐ every surface declares an explicit cache_policy (11a.2 D4 — ⛔ never inferred)', () => {
    // Inference ("all-public ⇒ cacheable") is immediately wrong on two of the eight
    // shipped surfaces: `/500` is all-public but must be no-store, and `/` is a
    // redirect. The declaration is REQUIRED by the schema; this asserts the committed
    // file actually carries it everywhere, and that both counter-examples are right.
    const surfaces = committed().surfaces;
    for (const s of surfaces) expect(s.cache_policy, s.id).toBeDefined();
    expect(surfaces.find((s) => s.id === 'server-error')?.cache_policy).toBe('private_no_store');
    expect(surfaces.find((s) => s.id === 'root-redirect')?.cache_policy).toBe('redirect');
  });

  it('⛔ declares NO school / designation / block field on any surface (Trap 1, SD-1)', () => {
    // `school` and `designation` are PERMANENTLY INELIGIBLE as RBAC dimensions;
    // `block` is gated on `2026-08-19-137` cl.7(a)+(b). None may appear as a
    // global field row — per-Pariwar attributes carry a RULE, never a row.
    const ids = committed().surfaces.flatMap((s) => s.fields.map((f) => f.id));
    for (const forbidden of ['school', 'designation', 'block', 'zone', 'division']) {
      expect(ids).not.toContain(forbidden);
    }
  });

  it('carries the per-Pariwar attribute RULE, fail-closed by default', () => {
    const rule = committed().per_pariwar_attribute_rule;
    expect(rule).toBeDefined();
    // ⛔ An unclassified Pariwar attribute must not default to visible.
    expect(rule?.default_tier).not.toBe('public');
    expect(rule?.declaration_site).toMatch(/registry|pariwar_custom_field_definitions/i);
  });
});
