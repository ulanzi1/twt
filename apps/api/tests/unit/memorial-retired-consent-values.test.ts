// Story 11b.4 (Task 4.3; AC4; `-162` cl.2) — the two RETIRED consent values appear in NO memorial source file.
//
// The family's permission is given AT SEND, on the submission row (MA5) — ⛔ no `consent_records` row, ⛔ no new `consent_type`,
// and ⛔ no reuse of the retired claim-screen boxes `sahyog_vivran_publication` / `in_memoriam_listing` (retired, not
// reinterpreted — `#decision-2026-08-28-162` cl.2). A string in a memorial file would be the first step of reusing one, so the
// scan is a plain, strict grep over the memorial surface: domain, contracts, the API modules, the i18n catalogue, the phone,
// the admin screen and the shared presenter. (The retired values legitimately live in the consent contracts and in migration
// 0058; those are not memorial files and are not scanned.)
//
// ⚠ A grep that cannot fail is not a gate: the scan runs the SAME function over an in-memory planted fixture and must hit it
// (the "teeth" leg), and every root must resolve to at least one real file.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const RETIRED_CONSENT_VALUES = ['sahyog_vivran_publication', 'in_memoriam_listing'] as const;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.sql', '.yaml', '.yml']);
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.expo', '.turbo', 'coverage']);

interface Root {
  /** What the root is (the failure message names it). */
  readonly label: string;
  /** Absolute paths of files and directories (directories are walked). */
  readonly paths: () => string[];
}

const abs = (...parts: string[]): string => join(REPO_ROOT, ...parts);

/** The immediate children of `dir` whose NAME starts with `prefix` (files and directories alike). */
function childrenStartingWith(dir: string, prefix: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith(prefix))
    .map((name) => join(dir, name));
}

/** `packages/i18n/locales/<locale>/memorial.json` for every locale. */
function memorialCatalogues(): string[] {
  const locales = abs('packages', 'i18n', 'locales');
  if (!existsSync(locales)) return [];
  return readdirSync(locales)
    .map((locale) => join(locales, locale, 'memorial.json'))
    .filter((file) => existsSync(file));
}

const ROOTS: readonly Root[] = [
  { label: 'packages/domain/src/memorial', paths: () => [abs('packages', 'domain', 'src', 'memorial')] },
  { label: 'packages/domain/src/schema/memorial_*', paths: () => childrenStartingWith(abs('packages', 'domain', 'src', 'schema'), 'memorial_') },
  { label: 'packages/domain/src/policies/memorial-*', paths: () => childrenStartingWith(abs('packages', 'domain', 'src', 'policies'), 'memorial-') },
  { label: 'packages/domain/migrations/0181_memorial-authorship.sql', paths: () => [abs('packages', 'domain', 'migrations', '0181_memorial-authorship.sql')] },
  { label: 'packages/contracts/src/memorial', paths: () => [abs('packages', 'contracts', 'src', 'memorial')] },
  { label: 'apps/api/src/modules/memorial*', paths: () => childrenStartingWith(abs('apps', 'api', 'src', 'modules'), 'memorial') },
  { label: 'packages/i18n/locales/*/memorial.json', paths: memorialCatalogues },
  { label: 'apps/mobile/app/(memorial)', paths: () => [abs('apps', 'mobile', 'app', '(memorial)')] },
  { label: 'apps/mobile/components/memorial-authorship', paths: () => [abs('apps', 'mobile', 'components', 'memorial-authorship')] },
  { label: 'apps/mobile/lib/*memorial*', paths: () => readdirSync(abs('apps', 'mobile', 'lib')).filter((n) => n.includes('memorial')).map((n) => abs('apps', 'mobile', 'lib', n)) },
  { label: 'apps/admin/src/modules/memorial-review', paths: () => [abs('apps', 'admin', 'src', 'modules', 'memorial-review')] },
  { label: 'packages/ui/src/memorial', paths: () => [abs('packages', 'ui', 'src', 'memorial')] },
];

function walk(path: string, out: string[]): void {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (!SKIPPED_DIRECTORIES.has(name)) walk(join(path, name), out);
    }
    return;
  }
  const dot = path.lastIndexOf('.');
  if (dot >= 0 && SCANNED_EXTENSIONS.has(path.slice(dot))) out.push(path);
}

interface SourceFile {
  readonly path: string;
  readonly text: string;
}

function filesOf(root: Root): SourceFile[] {
  const found: string[] = [];
  for (const p of root.paths()) walk(p, found);
  return found.map((path) => ({ path: relative(REPO_ROOT, path), text: readFileSync(path, 'utf8') }));
}

interface Hit {
  readonly path: string;
  readonly value: string;
  readonly line: number;
}

/** The ONE scan, used on the real files and on the planted fixture alike. */
function scan(files: readonly SourceFile[]): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    const lines = file.text.split('\n');
    lines.forEach((text, index) => {
      for (const value of RETIRED_CONSENT_VALUES) {
        if (text.includes(value)) hits.push({ path: file.path, value, line: index + 1 });
      }
    });
  }
  return hits;
}

describe('Story 11b.4 Task 4.3 — the retired consent values appear in no memorial source file', () => {
  const byRoot = ROOTS.map((root) => ({ root, files: filesOf(root) }));
  const real = byRoot.flatMap((r) => r.files);

  it.each(byRoot.map((r) => [r.root.label, r.files.length] as const))('the root %s resolves to real files (%i)', (_label, count) => {
    expect(count).toBeGreaterThan(0);
  });

  it('the scan covers a real surface — the memorial module sources, the catalogues and the migration', () => {
    const names = real.map((f) => f.path);
    expect(real.length).toBeGreaterThan(40);
    expect(names).toContain('packages/domain/migrations/0181_memorial-authorship.sql');
    expect(names).toContain('packages/i18n/locales/en/memorial.json');
    expect(names).toContain('packages/i18n/locales/hi/memorial.json');
    expect(names.some((n) => n.startsWith('apps/api/src/modules/memorial/'))).toBe(true);
    expect(names.some((n) => n.startsWith('apps/api/src/modules/memorial-review/'))).toBe(true);
    expect(names.some((n) => n.startsWith('apps/mobile/app/(memorial)/'))).toBe(true);
  });

  it('⭐ NEITHER sahyog_vivran_publication NOR in_memoriam_listing appears in any of them', () => {
    expect(scan(real)).toEqual([]);
  });

  it('teeth: the SAME scan flags each retired value planted in memory (a source file, a catalogue, a comment) and only those', () => {
    const planted: SourceFile[] = [
      { path: 'planted/source.ts', text: `export const consentType = 'sahyog_vivran_publication';\n` },
      { path: 'planted/catalogue.json', text: `{ "memorial.key": "in_memoriam_listing" }\n` },
      { path: 'planted/comment.tsx', text: `// reuses in_memoriam_listing for the family's permission\nconst fine = 1;\n` },
      { path: 'planted/clean.ts', text: `export const consentType = 'claim_time_dpdpa';\n` },
    ];
    expect(scan(planted)).toEqual([
      { path: 'planted/source.ts', value: 'sahyog_vivran_publication', line: 1 },
      { path: 'planted/catalogue.json', value: 'in_memoriam_listing', line: 1 },
      { path: 'planted/comment.tsx', value: 'in_memoriam_listing', line: 1 },
    ]);
    // …and planted among the REAL files it is found exactly once — the real set stays clean around it.
    const hits = scan([...real, planted[0]!]);
    expect(hits).toEqual([{ path: 'planted/source.ts', value: 'sahyog_vivran_publication', line: 1 }]);
  });
});
