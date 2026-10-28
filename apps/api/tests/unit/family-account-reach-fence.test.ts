// Story 6.32 (second review S9; AC8 "⛔ the family, the claimant, the nominee, other members, the public") — WHO can reach
// the family's answers at the ground inspection, fenced in code. They are read by the domain's own module
// (`readClaimFamilyAccount`, `readLiveGroundInspectionAnswers`, the `claimGroundInspectionAnswers` table) and served by
// EXACTLY three API modules: the approvers' account through ONE assembler (`peer-answers-assembler.ts`, after the PM25 (c)
// hide) and its two handler modules (the verifier console, the approvers' read), and the inspector's own questionnaire /
// result (`claims.ground-inspection.handlers.ts`). Every route file importing one of them registers ONLY staff URLs under
// `/api/v1/p/:pariwarId/admin/…` (the admin session + the route's gate). So ⛔ member, nominee, helpline-for-member, job or
// public module can serve them: a new importer — anywhere in `apps/api`, `apps/jobs` or `packages/domain` — is a reviewed
// edit HERE (patch review: the first version scanned `apps/api/src` alone and matched `./` imports only).
// ⭐ POSITIVE CONTROL: a planted importer outside the allow-list IS caught (named, or by a `../` path); a COMMENTED mention is ⛔.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

/** What reaches the family's answers: the domain reads and table, the assembler module and its builders. */
const REACH =
  /\breadClaimFamilyAccount\b|\breadLiveGroundInspectionAnswers\b|\bclaimGroundInspectionAnswers\b|claim_ground_inspection_answers\b|peer-answers-assembler(?:\.js)?['"]|\bassemblePeerSection\b|\bassemblePeerMeshSection\b|\bassemblePeerMesh\b|\bassembleVerifierConsole\b/;

/** The scanned trees. */
const TREES = ['apps/api/src', 'apps/jobs/src', 'packages/domain/src'] as const;

/** The EXACT allow-list of files that may name one of them. */
const ALLOWED = [
  'apps/api/src/modules/claims/claims.ground-inspection.handlers.ts',
  'apps/api/src/modules/claims/claims.peer-answers.handlers.ts',
  'apps/api/src/modules/claims/claims.verifier-console.handlers.ts',
  'apps/api/src/modules/claims/peer-answers-assembler.ts',
  // the domain: the writer and reads, the comparison (index arrays only — I3), the erasure, the table and its policy
  'packages/domain/src/claim/ground-inspection-questionnaire.ts',
  'packages/domain/src/claim/inspection-discrepancy.ts',
  'packages/domain/src/member/anonymize.ts',
  'packages/domain/src/policies/claim-ground-inspection-questionnaire-rls.ts',
  'packages/domain/src/schema/claim_ground_inspection_questionnaire.ts',
] as const;

/** The API handler modules → the route file that registers them (every URL it registers is a staff URL). */
const HANDLER_ROUTES: Record<string, string> = {
  'apps/api/src/modules/claims/claims.ground-inspection.handlers.ts': 'apps/api/src/modules/claims/claims.ground-inspection.routes.ts',
  'apps/api/src/modules/claims/claims.peer-answers.handlers.ts': 'apps/api/src/modules/claims/claims.peer-answers.routes.ts',
  'apps/api/src/modules/claims/claims.verifier-console.handlers.ts': 'apps/api/src/modules/claims/claims.verifier-console.routes.ts',
};


function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (name.endsWith('.ts')) out.push(path.relative(repoRoot, full).split(path.sep).join('/'));
  }
  return out;
}
const read = (rel: string) => stripComments(readFileSync(path.join(repoRoot, rel), 'utf-8'));
const reachers = (files: readonly string[], src: (f: string) => string) => files.filter((f) => REACH.test(src(f))).sort();
/** Imports `base.js` by ANY relative path (`./`, `../claims/`, …). */
const importsModule = (src: string, base: string) => new RegExp(`['"]\\.{1,2}/(?:[^'"]*/)?${base.replace(/\./g, '\\.')}\\.js['"]`).test(src);

describe('second review S9 — the family\'s answers are reachable ONLY from staff (`/admin/`) routes (AC8)', () => {
  const files = TREES.flatMap((t) => sourceFiles(path.join(repoRoot, t)));

  it('exactly the allow-listed modules name a read, the table, the assembler or its builders', () => {
    expect(reachers(files, read)).toEqual([...ALLOWED].sort());
  });

  it('the assembler is imported ONLY by its two handler modules (by any relative path)', () => {
    const importers = files.filter((f) => importsModule(read(f), 'peer-answers-assembler'));
    expect(importers.sort()).toEqual(['apps/api/src/modules/claims/claims.peer-answers.handlers.ts', 'apps/api/src/modules/claims/claims.verifier-console.handlers.ts']);
  });

  it('each API handler module is imported by ONE route file, and every URL it registers is a staff `/admin/` URL', () => {
    for (const [handlers, routeFile] of Object.entries(HANDLER_ROUTES)) {
      const base = path.basename(handlers, '.ts');
      const importers = files.filter((f) => f !== handlers && importsModule(read(f), base));
      expect(importers, handlers).toEqual([routeFile]);
      const urls = [...read(routeFile).matchAll(/['`](\/api\/v1\/[^'`]+)['`]/g)].map((m) => m[1]!);
      expect(urls.length, routeFile).toBeGreaterThan(0);
      for (const u of urls) expect(u, routeFile).toMatch(/^\/api\/v1\/p\/:pariwarId\/admin\//);
    }
  });

  it('⭐ POSITIVE CONTROL — a planted importer is caught; a commented mention is ⛔', () => {
    const planted = 'apps/api/src/modules/member/planted.ts';
    const withPlant = (src: string) => (f: string) => (f === planted ? src : read(f));
    expect(reachers([...files, planted], withPlant(`import { assemblePeerSection } from '../claims/peer-answers-assembler.js';`))).toContain(planted);
    expect(reachers([...files, planted], withPlant(`const v = await claim.readClaimFamilyAccount(db, p, c);`))).toContain(planted);
    expect(reachers([...files, planted], withPlant(`const rows = await claim.readLiveGroundInspectionAnswers(db, p, g);`))).toContain(planted);
    expect(importsModule(`import { x } from '../claims/claims.verifier-console.handlers.js';`, 'claims.verifier-console.handlers')).toBe(true);
    expect(reachers([...files, planted], (f) => (f === planted ? stripComments('// readClaimFamilyAccount is ⛔ called here') : read(f)))).not.toContain(planted);
  });
});
