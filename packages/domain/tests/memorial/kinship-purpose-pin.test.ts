// Story 11b.5a (AC10) — "USED FOR NOTHING ELSE", MECHANICALLY. `2026-10-31-428` item 1 (PQ1 A, Trustee-ratified): the family list
// is used for *"nothing else"* than the memorial. This pin scans every source file of every package and app and asserts that the
// family list's identifiers — and the memorial-submission TABLE identifier itself (a `db.select().from(memorialSubmissions)` returns
// the list's column without naming it) — appear ONLY in the memorial's own paths (the allow-list below). ⛔ No claims, nominee,
// peer-mesh, directory, validity or jobs file may read it: reusing the list (e.g. the 6.27a "family-link substrate" to exclude
// relatives from the peer-mesh five) is exactly the purpose-creep `-398` MA2 forbids, and needs its own Panel question.
//
// Scanned: EVERY source file under `packages/*` and `apps/*` (not a fixed list of roots — a new `hooks/` or `store/` folder is covered
// the day it appears), plus the repo-root `scripts/` and `infra/`. ⛔ Not scanned: tests, `openapi/`, `_bmad-output`, migrations (the
// migration is named by its own file). The guarded names are the list's COLUMN (`kinship_ciphertext`), its domain property
// (`kinshipOmissions`, `kinshipLeftOut`), the submissions table, and every identifier carrying one of the list's STEMS (`GUARDED`
// below — round 3, RP28: its schemas, helpers, row types and the public view's field) — a file that decodes, groups, labels or
// draws the list without naming a column is the same reuse. ⚠ ⛔ Pinnable: a bare `.kinship` property read off an API response or
// a draft (too generic a word — RD15's class). The allow-list was built from the pasted grep
// at Task 8 (2026-10-31) and re-checked when the helpers were added (review 2026-11-01) — every user at that commit is covered, or
// this pin would fail on `main`. A walker that meets a symlink skips it (⛔ never `statSync` through it — a dangling `ios/Pods` link once
// crashed a sibling walker).

import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/**
 * The guarded identifiers (AC10): the column, the domain property and the table as whole words; RP28 — and ANY identifier that
 * CONTAINS one of the list's own stems, ⛔ a hand-picked few: `MemorialKinship` (the entry and row schemas — a re-parse with
 * `MemorialKinshipEntrySchema.array()` is the same reuse — and `parse…` / `group…` / `public…` / `useMemorialKinship…`),
 * `memorialKinship` (the plaintext, label and draft helpers), `MEMORIAL_KINSHIP_` (the relations, the caps, the label keys),
 * `KinshipRow` (`SahyogVivranKinshipRow`, `MemorialDraftKinshipRow`, …), `kinshipLatticeRows` / `KinshipLatticeRow` (the render
 * helper and its row type) and `familyMemorialKinship` (the public view's field) — a stem match, ⛔ a word match. ⛔ The bare
 * component name `KinshipLattice`: it names a component, ⛔ the data (11a's `shradhanjali/` sample shares it).
 */
const GUARDED =
  /\b(kinship_ciphertext|kinshipCiphertext|kinshipLeftOut|kinship_omissions|kinshipOmissions|memorialSubmissions|memorial_submissions)\b|MemorialKinship|memorialKinship|MEMORIAL_KINSHIP_|KinshipRow|kinshipLatticeRows|KinshipLatticeRow|familyMemorialKinship/;

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

const SOURCE = /\.(ts|tsx|mts|cts|astro|mjs|cjs|js|jsx)$/;
const SKIP_DIR = /^(node_modules|dist|build|coverage|\..*|tests?|__tests__|migrations|openapi|ios|android)$/;

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
  // Each package and app is walked WHOLE (⛔ not a fixed `src` / `app` / `lib` list — `hooks/`, `store/`, a package's `scripts/` or
  // `seed/` are in scope without an edit here); `SKIP_DIR` drops the build output, the dependencies and the tests.
  for (const top of ['packages', 'apps']) {
    for (const pkg of readdirSync(join(repoRoot, top))) walk(join(repoRoot, top, pkg), out);
  }
  // The repo-root tooling — a gate script or an ops script is source too.
  for (const root of ['scripts', 'infra']) walk(join(repoRoot, root), out);
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
    for (const prefix of [
      'packages/domain/src/',
      'packages/contracts/src/',
      'apps/api/src/',
      'apps/mobile/app/',
      'apps/mobile/lib/',
      'apps/admin/src/',
      'apps/public/src/',
      'scripts/',
    ]) {
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
    // Real files (each is asserted to be in the scan, so a rename or a delete fails here instead of passing on a dead path).
    for (const rel of [
      'packages/domain/src/claim/peer-mesh.ts',
      'packages/domain/src/nominee/relationship.ts',
      'apps/api/src/modules/claims/claims.appeal.handlers.ts',
      'apps/jobs/src/claim-peer-mesh.ts',
      'apps/api/src/modules/directory-publication/handlers.ts',
      'apps/api/src/modules/member-validity/handlers.ts',
      'apps/public/src/pages/members.astro',
      'packages/validity-service/src/producer.ts',
    ]) {
      expect(files.has(rel), `${rel} is a scanned file`).toBe(true);
      expect(isAllowed(rel), rel).toBe(false);
    }
  });

  it('the allow-list matcher, on SYNTHETIC paths (not files in the repo): `**` crosses folders, `*` does not, nothing else widens', () => {
    expect(isAllowed('packages/domain/src/memorial/deep/er/x.ts')).toBe(true);
    expect(isAllowed('packages/domain/src/schema/memorial_submissions.ts')).toBe(true);
    expect(isAllowed('packages/domain/src/schema/memorial_x/y.ts')).toBe(false);
    expect(isAllowed('packages/domain/src/schema/claims.ts')).toBe(false);
    expect(isAllowed('apps/jobs/src/memorial/x.ts')).toBe(false);
    expect(isAllowed('apps/mobile/hooks/use-memorial.ts')).toBe(false);
    expect(isAllowed('scripts/memorial/x.ts')).toBe(false);
  });

  it('the scan reads the HELPER names and the wider file extensions (positive control)', () => {
    const planted = new Map<string, string>([
      ['apps/mobile/hooks/use-family.ts', 'export const g = groupMemorialKinship(list, []);'],
      ['apps/jobs/src/decode.mts', 'parseMemorialKinship(text);'],
      ['scripts/gate.cjs', 'MemorialKinshipListSchema.parse(x);'],
      ['apps/admin/src/x.jsx', 'row.kinshipOmissions;'],
      // RP28 — the families, ⛔ only the names listed before the widening.
      ['apps/public/src/pages/og-card.ts', 'MemorialKinshipEntrySchema.array().parse(body.kinship);'],
      ['apps/jobs/src/label.ts', 'memorialKinshipLabelKey(row.relation, 2);'],
      ['apps/api/src/modules/share/x.ts', 'publicMemorialKinship(entries, []);'],
      ['apps/public/src/pages/sitemap.ts', 'kinshipLatticeRows(view, t);'],
      ['packages/domain/src/claim/caps.ts', 'MEMORIAL_KINSHIP_MAX_ENTRIES;'],
      ['apps/mobile/hooks/use-list.ts', 'export const x = useMemorialKinshipRows();'],
      ['apps/public/src/pages/share.ts', 'const rows = view.familyMemorialKinship;'],
      ['apps/mobile/hooks/use-rows.ts', 'let r: MemorialDraftKinshipRow[] = [];'],
      ['apps/public/src/pages/clean.ts', 'const kinship = 1; // a bare word is ⛔ a guarded name'],
    ]);
    expect(purposeViolations(planted)).toEqual([
      'apps/admin/src/x.jsx',
      'apps/api/src/modules/share/x.ts',
      'apps/jobs/src/decode.mts',
      'apps/jobs/src/label.ts',
      'apps/mobile/hooks/use-family.ts',
      'apps/mobile/hooks/use-list.ts',
      'apps/mobile/hooks/use-rows.ts',
      'apps/public/src/pages/og-card.ts',
      'apps/public/src/pages/share.ts',
      'apps/public/src/pages/sitemap.ts',
      'packages/domain/src/claim/caps.ts',
      'scripts/gate.cjs',
    ]);
    for (const rel of planted.keys()) expect(SOURCE.test(rel), rel).toBe(true);
  });

  it('a planted reference outside the allow-list is caught (positive control)', () => {
    const planted = new Map(files);
    planted.set('packages/domain/src/claim/peer-mesh-family.ts', 'export const x = memorialSubmissions.kinshipCiphertext;');
    planted.set('apps/jobs/src/family-link.ts', "import { MEMORIAL_KINSHIP_RELATIONS } from '@twt/contracts';");
    expect(purposeViolations(planted)).toEqual(['apps/jobs/src/family-link.ts', 'packages/domain/src/claim/peer-mesh-family.ts']);
  });
});
