// Story 6.33 (AC10; I1 — NOTHING GATES) — the import fence: ⛔ module of the chain reaches a reader that DECIDES, FLAGS,
// ROUTES or DELAYS a claim — the approval warnings, the ground-inspection approval (6.26a's ONE definition of "complete"),
// the inspection discrepancy's rule table, the approval gate, or the member's medical declaration. Scanned TRANSITIVELY over
// the domain's relative imports (a helper that reaches one through another module counts), and directly for the API
// handlers. The live-DB half (a chain answer leaves every gate byte-identical) is in `peer-mesh-reply.spec.ts`.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const domainSrc = path.join(repo, 'packages/domain/src');

/**
 * The module specifiers a source file names — every form that LOADS code (review RV23): `import … from 'x'`, `export … from 'x'`,
 * a side-effect `import 'x'`, a dynamic `import('x')` and `require('x')`. Pure.
 */
export function importSpecifiers(code: string): string[] {
  const out: string[] = [];
  const forms = [
    /(?:import|export)[^'"`;]*?from\s+['"]([^'"]+)['"]/g,
    /(?:^|[;\s])import\s+['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of forms) for (const m of code.matchAll(re)) out.push(m[1]!);
  return out;
}

/** A relative specifier → the file it names: `x.js` → `x.ts`, else `x.ts`, else `x/index.ts` (a directory import). */
function resolveSpecifier(from: string, spec: string): string {
  const resolved = path.resolve(path.dirname(from), spec.replace(/\.js$/, ''));
  for (const candidate of [`${resolved}.ts`, path.join(resolved, 'index.ts')]) if (existsSync(candidate)) return candidate;
  return `${resolved}.ts`; // missing ⇒ the read below throws LOUDLY
}

/** Every file a domain entry reaches through RELATIVE imports (packages are skipped). */
function reachable(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
      if (spec.startsWith('.')) queue.push(resolveSpecifier(file, spec));
    }
  }
  return seen;
}

const FORBIDDEN_DOMAIN = [
  'claim/approval-warnings.ts',
  'claim/ground-inspection-approval.ts',
  'claim/inspection-discrepancy.ts',
  'claim/nominee-name-check.ts',
  'medical/',
];
/**
 * Review RV23 — AC10 names the member's medical declaration. Its TABLE and policy live outside `medical/`, so a chain module that
 * imported them directly passed the `medical/` prefix check. ⚠ These are checked DIRECTLY (each chain file's own imports and
 * text), ⛔ transitively: `db.ts` imports the whole schema barrel, so every module that touches `Db` REACHES every table in
 * graph terms without reading any of them — a transitive check on a table would always trip and prove nothing.
 */
const FORBIDDEN_DIRECT = ['schema/member_medical_disclosures.ts', 'policies/member-medical-disclosures-rls.ts'];
const MEDICAL_NAME_RE = /member_medical_disclosures|memberMedicalDisclosures|member-medical-disclosures/;
const ENTRIES = ['questionnaire-versions/index.ts', 'questionnaires/index.ts'];

describe('AC10 — the chain reaches ⛔ reader that gates a claim', () => {
  it.each(ENTRIES)('%s reaches ⛔ approval / warning / completion / discrepancy / medical module (transitively)', (entry) => {
    const files = [...reachable(path.join(domainSrc, entry))].map((f) => path.relative(domainSrc, f));
    for (const bad of FORBIDDEN_DOMAIN) expect(files.filter((f) => f.startsWith(bad)), `${entry} → ${bad}`).toEqual([]);
    expect(files.some((f) => f.startsWith('questionnaires/'))).toBe(true);
  });

  it('⛔ chain file — in questionnaire-versions/ or questionnaires/ — imports or names the member\'s medical declaration (table, policy) DIRECTLY', () => {
    const dirs = ['questionnaire-versions', 'questionnaires'].map((d) => path.join(domainSrc, d));
    // Review RP18 — RECURSIVE: a subdirectory of either chain directory is scanned too
    const tsFiles = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tsFiles(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));
    const chainFiles = dirs.flatMap((d) => tsFiles(d));
    expect(chainFiles.length).toBeGreaterThan(10); // ⛔ a renamed directory shrinking the scan to nothing
    for (const file of chainFiles) {
      const code = readFileSync(file, 'utf8');
      const direct = importSpecifiers(code)
        .filter((spec) => spec.startsWith('.'))
        .map((spec) => path.relative(domainSrc, resolveSpecifier(file, spec)));
      for (const bad of FORBIDDEN_DIRECT) expect(direct, `${path.relative(domainSrc, file)} imports ${bad}`).not.toContain(bad);
      expect(MEDICAL_NAME_RE.test(code), `${path.relative(domainSrc, file)} names the medical declaration`).toBe(false);
    }
  });

  it('the direct scan has TEETH: the medical name pattern matches its three spellings, and the real medical files exist where the list says', () => {
    for (const hit of ['member_medical_disclosures', 'memberMedicalDisclosures', 'member-medical-disclosures-rls']) expect(MEDICAL_NAME_RE.test(hit), hit).toBe(true);
    for (const miss of ['questionnaire_versions', 'medical_note']) expect(MEDICAL_NAME_RE.test(miss), miss).toBe(false);
    for (const f of FORBIDDEN_DIRECT) expect(existsSync(path.join(domainSrc, f)), `${f} exists`).toBe(true); // ⛔ a stale path that matches nothing
    // and the schema barrel DOES reach the table (why a transitive check on it is meaningless)
    expect([...reachable(path.join(domainSrc, 'schema/index.ts'))].map((f) => path.relative(domainSrc, f))).toContain('schema/member_medical_disclosures.ts');
  });

  it('the API chain handlers and THE ONE word function call ⛔ gate', () => {
    for (const f of ['apps/api/src/modules/questionnaire-versions/handlers.ts', 'apps/api/src/modules/questionnaire-versions/routes.ts', 'apps/api/src/modules/claims/questionnaire-words.ts']) {
      const code = readFileSync(path.join(repo, f), 'utf8');
      expect(code, f).not.toMatch(/assertClaimApprovable|readClaimApprovalWarnings|groundInspectionApprovalState|INSPECTION_DISCREPANCY|member_medical_disclosures|medical\b/);
    }
  });

  it('the scan has TEETH: the 6.26a state-trustee decision module reaches the ground-inspection-approval module', () => {
    const files = [...reachable(path.join(domainSrc, 'claim/state-trustee-decision-persist.ts'))].map((f) => path.relative(domainSrc, f));
    expect(files).toContain('claim/ground-inspection-approval.ts');
  });

  it('the import scan sees EVERY form that loads code: static, export-from, side-effect, dynamic import(), require()', () => {
    const code = [
      "import { a } from './static.js';",
      "export * from './reexport.js';",
      "export { b } from './named-reexport.js';",
      "import './side-effect.js';",
      "const lazy = await import('./dynamic.js');",
      "const old = require('./required.js');",
      "import type { T } from '../types.js';",
    ].join('\n');
    expect(importSpecifiers(code).sort()).toEqual(['../types.js', './dynamic.js', './named-reexport.js', './reexport.js', './required.js', './side-effect.js', './static.js']);
    expect(importSpecifiers('const x = 1; // import nothing here')).toEqual([]);
  });

  it('a DIRECTORY import resolves to its index.ts (the barrel is followed, ⛔ skipped)', () => {
    const files = [...reachable(path.join(domainSrc, 'claim/state-trustee-decision-persist.ts'))].map((f) => path.relative(domainSrc, f));
    expect(files.some((f) => f.endsWith('/index.ts'))).toBe(true); // an index barrel was followed, ⛔ skipped
  });
});
