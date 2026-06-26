// scripts/kyc-provider-boundary/check.ts
//
// kyc-provider-boundary CI gate (Story 3.3a AC3): the DigiLocker SDK/transport
// (`xml-crypto` + `@xmldom/xmldom` / `xpath` / `@xmldom/is-dom-node`) may be imported ONLY
// from the sole provider directory. Scans the source trees (apps/api/src + packages/*/src)
// and fails (exit 1, naming file + line + module) on any import of the transport from
// OUTSIDE the allowlist.
//
// INVARIANT SCAN of the source trees — NOT a git-diff (mirror member-state-invariant /
// domain-accessor-invariants / schema-diff; NO fetch-depth: 0). Precision-scoped →
// self-green by construction (the ONLY files that import the transport are under the
// allowlisted provider directory; the fixture-signing helper that also imports it lives
// under apps/api/tests/, OUTSIDE the scanned src trees).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type ForbiddenImportFinding,
  DIGILOCKER_TRANSPORT_MODULES,
  formatFinding,
  scanForbiddenTransportImports,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

// The source trees scanned (forward-slashed, relative to repoRoot). Tests are NOT scanned
// (a fixture signer may legitimately import the transport).
const SCAN_ROOTS = ['apps/api/src'];

// Each packages/*/src is also scanned (the transport must not leak into any shared package).
function packageSrcRoots(): string[] {
  const packagesDir = path.join(repoRoot, 'packages');
  if (!fs.existsSync(packagesDir)) return [];
  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `packages/${e.name}/src`)
    .filter((rel) => fs.existsSync(path.join(repoRoot, rel)));
}

// The SOLE legitimate holder of the DigiLocker transport (forward-slashed, relative to
// repoRoot). A new legitimate location must be a deliberate, reviewed addition here.
const ALLOWLIST_DIR = 'apps/api/src/modules/kyc/providers/digilocker/';

function isAllowlisted(rel: string): boolean {
  return rel.startsWith(ALLOWLIST_DIR);
}

function collectTsFiles(absDir: string, acc: string[]): void {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) collectTsFiles(abs, acc);
    else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      acc.push(abs);
    }
  }
}

function main(): void {
  console.log(
    'kyc-provider-boundary gate — the DigiLocker transport is provider-only (Story 3.3a AC3)\n',
  );

  const roots = [...SCAN_ROOTS, ...packageSrcRoots()];
  const files: string[] = [];
  for (const root of roots) collectTsFiles(path.join(repoRoot, root), files);
  files.sort();

  console.log(`▸ Banned transport modules: ${DIGILOCKER_TRANSPORT_MODULES.join(', ')}`);
  console.log(`▸ Allowlisted directory: ${ALLOWLIST_DIR}`);
  console.log(`▸ Scope — ${files.length} TypeScript file(s) across ${roots.length} src tree(s)\n`);

  const findings: ForbiddenImportFinding[] = [];
  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
    if (isAllowlisted(rel)) continue; // the provider directory is the one legitimate holder
    findings.push(...scanForbiddenTransportImports(rel, fs.readFileSync(abs, 'utf8')));
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no code outside the provider directory imports the DigiLocker transport\n');
    console.log('✓ kyc-provider-boundary gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ kyc-provider-boundary gate FAILED with ${findings.length} finding(s).\n` +
      '  The DigiLocker SDK/transport is the SINGLE-MODULE-swap boundary (architectural-freeze\n' +
      '  row 13 / AR-43). A transport import outside apps/api/src/modules/kyc/providers/digilocker/**\n' +
      "  couples a consumer to DigiLocker-specifics. Fix: depend on the '@twt/contracts' KycProvider\n" +
      '  port instead. See scripts/kyc-provider-boundary/README.md.',
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(
    `\n✗ kyc-provider-boundary gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
