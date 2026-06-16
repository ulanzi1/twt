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
      search_indexing_policy: 'noindex',
      fields: [
        { id: 'full_name', tier: 'public' },
        { id: 'district', tier: 'authenticated_member' },
        { id: 'mobile', tier: 'operator_restricted' },
        { id: 'aadhaar', tier: 'never_exposed' },
      ],
    },
  ],
};

describe('matrix schema parse (AC-1)', () => {
  it('parses a structurally valid matrix to a typed object', () => {
    const raw =
      'version: 1\nsurfaces:\n  - id: s\n    search_indexing_policy: index\n    fields:\n      - id: f\n        tier: public\n';
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
      'version: 1\nsurfaces:\n  - id: s\n    search_indexing_policy: index\n    fields:\n      - id: f\n        tier: semi_public\n';
    expect(() => parsePublicVsPrivateMatrix(raw)).toThrow(/malformed matrix/);
  });

  it('throws on an unknown search_indexing_policy', () => {
    const raw =
      'version: 1\nsurfaces:\n  - id: s\n    search_indexing_policy: maybe\n    fields: []\n';
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
  it('never_exposed leaks even on an operator render (highest viewer)', () => {
    const leaks = evaluateSurfaceRender(FIXTURE, 'member-directory', 'operator_restricted', [
      'aadhaar',
    ]);
    expect(leaks).toHaveLength(1);
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

describe('committed scaffold matrix (AC-3/AC-6 self-green)', () => {
  it('the shipped scaffold parses to zero surfaces (a structural no-op)', () => {
    const raw = readFileSync(
      path.resolve(here, '../public-pages/public-vs-private-matrix.yaml'),
      'utf8',
    );
    const matrix = parsePublicVsPrivateMatrix(raw);
    expect(matrix).not.toBeNull();
    expect(matrix?.version).toBe(1);
    expect(matrix?.surfaces).toHaveLength(0);
  });
});
