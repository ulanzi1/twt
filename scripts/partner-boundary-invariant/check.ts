// scripts/partner-boundary-invariant/check.ts
//
// Story 12.5's boundary fence (Decision `2026-11-21-483` QE15; AC10): PARTNERS ARE DOWNSTREAM CONSUMERS of explicitly consented leads,
// never a source of truth for any member's lifecycle, validity, contribution or claim state. Scans `packages/domain/src`, `apps/api/src`
// and `apps/jobs/src` and fails (exit 1, naming file + line + rule) on rules (b)–(e) of `lib.ts`. Rule (a) — ⛔ inbound partner route —
// is `apps/api/tests/integration/partner-boundary.spec.ts` (a route built at runtime is invisible to a text scan).
//
// INVARIANT SCAN of the current tree — NOT a git diff (the schema-diff / microcopy shape; ⛔ fetch-depth: 0).
// ⚠ THE FILE LISTS ARE THE GATE'S WEAKNESS: a transport file moved or renamed would shrink the scan in silence, so the gate ALSO fails when
// a listed file is MISSING ([[feedback_gate_scope_semantic_coverage]]). ⚠ Its SEMANTIC limit (README): it proves the absence of the
// patterns it names, ⛔ that no future path could launder partner data — the ADR's review question is the human half.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CLIENT_FILE,
  REFERENCE_ALLOWED_FILES,
  SCAN_ROOTS,
  TRANSPORT_FILES,
  authorityReadAllowlistPairs,
  authorityReadsImported,
  formatFinding,
  scanFile,
  type BoundaryFinding,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

function collect(absDir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const abs = path.join(absDir, entry.name);
    // ⚠ Dot-directories ARE scanned (a `.well-known` route dir is real code — [[project_reach_fence_door_and_dotdirs]]).
    if (entry.isDirectory()) collect(abs, acc);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) acc.push(abs);
  }
}

function main(): void {
  console.log('partner-boundary-invariant gate — partners are downstream consumers (Story 12.5, QE15 (b)–(e))\n');

  const missing = [...new Set([...REFERENCE_ALLOWED_FILES, ...TRANSPORT_FILES, CLIENT_FILE])].filter((f) => !fs.existsSync(path.join(repoRoot, f)));
  if (missing.length > 0) {
    console.error('✗ partner-boundary-invariant: a listed file is MISSING — a moved or renamed transport file would shrink the scan in silence:');
    for (const f of missing) console.error(`  ✗ ${f}`);
    process.exit(1);
  }

  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const abs = path.join(repoRoot, root);
    if (!fs.existsSync(abs)) {
      console.error(`✗ partner-boundary-invariant: scan root '${root}' not found`);
      process.exit(1);
    }
    collect(abs, files);
  }
  files.sort();
  console.log(`▸ Scope — ${String(files.length)} TypeScript file(s) under ${SCAN_ROOTS.join(', ')}\n`);

  const findings: BoundaryFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    findings.push(...scanFile(rel, fs.readFileSync(abs, 'utf8')));
  }

  // ⚠ Rule (c) is not vacuous: the file that holds P0–P5 must import EXACTLY the allow-listed reads. If the predicates move to a file
  // this gate does not judge, or an allowance goes unused, the gate says so instead of passing on nothing.
  const predicateFile = 'packages/domain/src/marketplace/lead-handoff.ts';
  const imported = authorityReadsImported(predicateFile, fs.readFileSync(path.join(repoRoot, predicateFile), 'utf8'));
  const allowed = authorityReadAllowlistPairs();
  for (const pair of allowed.filter((p) => !imported.includes(p))) {
    findings.push({ rule: 'c', file: predicateFile, line: 1, what: `the allow-listed read ${pair} is NOT imported here — the member-side reads moved (this gate would judge nothing), or the allowance is stale` });
  }

  if (findings.length > 0) {
    console.error(`✗ partner-boundary-invariant: ${String(findings.length)} finding(s):\n`);
    for (const f of findings) console.error(formatFinding(f));
    console.error('\nSee scripts/partner-boundary-invariant/README.md and docs/adr/ADR-0046-partner-lead-handoff-transport.md.');
    process.exit(1);
  }
  console.log('✓ partner-boundary-invariant: none of the named shapes — the advisory reference is named only in its four files; the four');
  console.log('  transport files import only the allow-listed member / consent / claim reads (all ' + String(allowed.length) + ' seen), write no other table by raw SQL');
  console.log('  and load nothing dynamically; the client calls no JSON parser; no createPartnerLeadClient( call carries an argument.');
  console.log('  ⚠ NOT proven (README, the semantic limit): a write through a helper in another file, a value laundered through a new field.');
}

main();
