// Story 11b.5a (AC10) — "USED FOR NOTHING ELSE", MECHANICALLY. `2026-10-31-428` item 1 (PQ1 A, Trustee-ratified): the family list
// is used for *"nothing else"* than the memorial. This pin scans every source file of every package and app and asserts that the
// family list's identifiers — and the memorial-submission TABLE identifier itself (a `db.select().from(memorialSubmissions)` returns
// the list's column without naming it) — appear ONLY in the memorial's own paths (the allow-list below). ⛔ No claims, nominee,
// peer-mesh, directory, validity or jobs file may read it: reusing the list (e.g. the 6.27a "family-link substrate" to exclude
// relatives from the peer-mesh five) is exactly the purpose-creep `-398` MA2 forbids, and needs its own Panel question.
//
// Scanned: `packages/*/src`, `apps/*/src`, `apps/*/app`, `apps/*/lib`, `apps/*/components`. ⛔ Not scanned: tests, `openapi/`,
// `_bmad-output`, migrations (the migration is named by its own file). The allow-list was built from the pasted grep at Task 8
// (2026-10-31) — every user at that commit is covered, or this pin would fail on `main`. A walker that meets a symlink skips it
// (⛔ `statSync` through it — a dangling `ios/Pods` link once crashed a sibling walker).

import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/** The guarded identifiers (AC10). */
const GUARDED = /\b(kinship_ciphertext|kinshipCiphertext|MEMORIAL_KINSHIP_RELATIONS|kinshipLeftOut|kinship_omissions|memorialSubmissions|memorial_submissions)\b/;

/** The memorial's own paths — repo-relative, `**` = any depth. */
const ALLOWED: readonly string[] = [
  // domain — the memorial, its schema, the erasure scrub, the field class, the RLS policy registry
  'packages/domain/src/memorial/**',
  'packages/domain/src/schema/memorial_*.ts',
  'packages/domain/src/schema/index.ts',
  'packages/domain/src/member/anonymize.ts',
  'packages/domain/src/encryption/field-classes.ts',
  'packages/domain/src/policies/memorial-rls.ts',
  // contracts — the memorial wire and the public page's memorial block
  'packages/contracts/src/memorial/**',
  'packages/contracts/src/public-pages/sahyog-vivran.ts',
  // api — the family's routes, the review, the take-down, the public memorial read
  'apps/api/src/modules/memorial/**',
  'apps/api/src/modules/memorial-review/**',
  'apps/api/src/modules/memorial-takedown/**',
  'apps/api/src/modules/public-pages/memorial-public-*.ts',
  // mobile — the family's screens
  'apps/mobile/app/(memorial)/**',
  'apps/mobile/components/memorial-authorship/**',
  'apps/mobile/lib/memorial-draft.ts',
  'apps/mobile/lib/use-memorial-send.ts',
  'apps/mobile/lib/memorial-i18n.ts',
  // admin — the review and take-down screens
  'apps/admin/src/modules/memorial-review/**',
  'apps/admin/src/modules/memorial-takedown/**',
  // public — the memorial section and the lattice
  'apps/public/src/components/FamilyMemorial.astro',
  'apps/public/src/components/KinshipLattice.astro',
  'apps/public/src/lib/family-memorial.ts',
  'apps/public/src/lib/sahyog-vivran-render.ts',
  'apps/public/src/lib/sahyog-vivran.server.ts',
  'apps/public/src/lib/surface-fields.ts',
];

function globToRegExp(glob: string): RegExp {
  const part = (seg: string): string => seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${glob.split('**').map(part).join('.*')}$`);
}
const ALLOWED_RE = ALLOWED.map(globToRegExp);
export const isAllowed = (rel: string): boolean => ALLOWED_RE.some((re) => re.test(rel));

const SOURCE = /\.(ts|tsx|astro|mjs|js)$/;
const SKIP_DIR = /^(node_modules|dist|build|\..*|tests?|__tests__|migrations|openapi|ios|android)$/;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const abs = join(dir, name);
    const st = lstatSync(abs);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (!SKIP_DIR.test(name)) walk(abs, out);
    } else if (SOURCE.test(name) && !/\.(test|spec)\.[a-z]+$/.test(name)) {
      out.push(relative(repoRoot, abs).split('\\').join('/'));
    }
  }
}

function sourceFiles(): string[] {
  const out: string[] = [];
  for (const top of ['packages', 'apps']) {
    for (const pkg of readdirSync(join(repoRoot, top))) {
      const roots = top === 'packages' ? ['src'] : ['src', 'app', 'lib', 'components'];
      for (const r of roots) walk(join(repoRoot, top, pkg, r), out);
    }
  }
  return out.sort();
}

/** Every file in `files` (repo-relative → text) that names a guarded identifier outside the allow-list. */
export function purposeViolations(files: ReadonlyMap<string, string>): string[] {
  return [...files].filter(([rel, text]) => GUARDED.test(text) && !isAllowed(rel)).map(([rel]) => rel).sort();
}

describe('AC10 — the family list is used for nothing else (`-428` item 1)', () => {
  const files = new Map(sourceFiles().map((rel) => [rel, readFileSync(join(repoRoot, rel), 'utf-8')] as const));
  const users = [...files].filter(([, text]) => GUARDED.test(text)).map(([rel]) => rel);

  it('the scan is NON-EMPTY and reaches every root (⛔ a vacuous pass)', () => {
    expect(files.size).toBeGreaterThan(500);
    for (const prefix of ['packages/domain/src/', 'packages/contracts/src/', 'apps/api/src/', 'apps/mobile/app/', 'apps/mobile/lib/', 'apps/admin/src/', 'apps/public/src/']) {
      expect([...files.keys()].some((rel) => rel.startsWith(prefix)), prefix).toBe(true);
    }
    // The guarded identifiers really are found — in the places that must hold them.
    for (const rel of [
      'packages/domain/src/schema/memorial_submissions.ts',
      'packages/domain/src/member/anonymize.ts',
      'apps/api/src/modules/memorial/handlers.ts',
      'apps/public/src/lib/sahyog-vivran.server.ts',
      'apps/mobile/app/(memorial)/family.tsx',
    ]) {
      expect(users, rel).toContain(rel);
    }
  });

  it('⭐ every file that names the list or the submissions table is a memorial path', () => {
    expect(purposeViolations(files)).toEqual([]);
  });

  it('⛔ no claims, nominee, peer-mesh, directory, validity or jobs file is on the allow-list', () => {
    for (const rel of [
      'packages/domain/src/claim/peer-mesh.ts',
      'packages/domain/src/nominee/relationship.ts',
      'apps/api/src/modules/claims/handlers.ts',
      'apps/jobs/src/peer-mesh.ts',
      'apps/public/src/pages/members.astro',
      'packages/validity-service/src/producer.ts',
    ]) {
      expect(isAllowed(rel), rel).toBe(false);
    }
  });

  it('a planted reference outside the allow-list is caught (positive control)', () => {
    const planted = new Map(files);
    planted.set('packages/domain/src/claim/peer-mesh-family.ts', 'export const x = memorialSubmissions.kinshipCiphertext;');
    planted.set('apps/jobs/src/family-link.ts', "import { MEMORIAL_KINSHIP_RELATIONS } from '@twt/contracts';");
    expect(purposeViolations(planted)).toEqual(['apps/jobs/src/family-link.ts', 'packages/domain/src/claim/peer-mesh-family.ts']);
  });
});
