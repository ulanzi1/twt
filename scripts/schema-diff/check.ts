// scripts/schema-diff/check.ts
//
// Schema-diff PR CI gate entrypoint (Story 1.16c, FR-100 Non-Add Guard). Asserts
// the v1 codebase ships ZERO payout-destination surface (architecture §1.13 Hook
// 2 L1149-1163; PRD §4.15 FR-100 L1253) so the v2/v3 Durghatana Sahayata
// activation is a GREENFIELD addition, never a column/index add to a v1 table.
//
// INVARIANT SCAN of current repo state — NOT a git-diff against a base ref. The
// v1 baseline permits zero payout-destination artifacts ever, so the gate scans
// the current four artifact roots and asserts none exist. No GITHUB_BASE_REF, no
// merge-base, no fetch-depth: 0 (mirror the sibling pii-scrape current-state
// scan; do NOT cargo-cult friction-budget's fetch-depth: 0 — that exists only for
// its base-ref declaration diff). See README.md.
//
// Repo-global by design — its four assertions span packages/domain (tables/
// columns), apps/api (endpoints) AND packages/contracts (Zod). No single
// workspace owns all four, so this is a repo-root tsx script (not a per-package
// turbo task), invoked via `pnpm schema:check`.
//
// PRECISION-SCOPING = SELF-GREEN (AC-3/AC-7): the four FR-100 keywords appear in
// dozens of NON-artifact files (epics, architecture, PRD, READMEs, deferred-work,
// sprint-status ledger comments, the story files, this gate's own fixtures + the
// fr-100-non-add.yaml config). NONE are artifacts. The gate globs ONLY the four
// real artifact roots below and never the repo root / _bmad-output / docs / *.md
// / sprint-status.yaml / scripts/schema-diff / the config file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type Finding,
  type SqlFile,
  type TsFile,
  formatFinding,
  parseFr100Config,
  scanColumns,
  scanEndpoints,
  scanTables,
  scanZodSchemas,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

// The FOUR precision-scoped artifact roots (and only these).
const CONFIG_FILE = 'fr-100-non-add.yaml';
const MIGRATIONS_DIR = 'packages/domain/migrations';
const MIGRATIONS_META_DIR = 'packages/domain/migrations/meta';
const API_SRC_DIR = 'apps/api/src';
const CONTRACTS_SRC_DIR = 'packages/contracts/src';

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

/** Recursively collect `.ts` files under a repo-relative dir (excludes node_modules / dotdirs). */
function collectTsFiles(relDir: string): TsFile[] {
  const absRoot = path.join(repoRoot, relDir);
  if (!fs.existsSync(absRoot)) return [];
  const out: TsFile[] = [];
  const walk = (absDir: string): void => {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        out.push({ path: path.relative(repoRoot, abs), text: fs.readFileSync(abs, 'utf8') });
      }
    }
  };
  walk(absRoot);
  return out;
}

/** All `migrations/*.sql` files (flat dir), repo-relative. */
function collectSqlFiles(): SqlFile[] {
  const absDir = path.join(repoRoot, MIGRATIONS_DIR);
  if (!fs.existsSync(absDir)) return [];
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => ({
      path: path.posix.join(MIGRATIONS_DIR, e.name),
      text: fs.readFileSync(path.join(absDir, e.name), 'utf8'),
    }));
}

/** Parse the latest cumulative drizzle snapshot (highest numeric prefix), or null. */
function loadLatestSnapshot(): { name: string; data: unknown } | null {
  const absDir = path.join(repoRoot, MIGRATIONS_META_DIR);
  if (!fs.existsSync(absDir)) return null;
  const snapshots = fs
    .readdirSync(absDir)
    .map((n) => /^(\d+)_snapshot\.json$/.exec(n))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ file: m[0], idx: Number(m[1]) }))
    .sort((a, b) => b.idx - a.idx);
  if (snapshots.length === 0) return null;
  const latest = snapshots[0].file;
  try {
    return { name: latest, data: JSON.parse(fs.readFileSync(path.join(absDir, latest), 'utf8')) };
  } catch (err) {
    throw new Error(
      `schema-diff: failed to parse snapshot ${latest}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function main(): void {
  console.log('schema-diff gate — FR-100 Non-Add Guard (Story 1.16c)\n');

  // Parse the registry — throws on malformed → gate fails loudly (AC-1).
  const config = parseFr100Config(readRepo(CONFIG_FILE));
  console.log(
    `▸ Registry fr-100-non-add.yaml (v${config.version}) — ` +
      `${config.allow.length} allowlisted artifact(s)\n`,
  );

  // Resolve the four precision-scoped artifact roots.
  const snapshot = loadLatestSnapshot();
  const sqlFiles = collectSqlFiles();
  const apiFiles = collectTsFiles(API_SRC_DIR);
  const contractsFiles = collectTsFiles(CONTRACTS_SRC_DIR);

  console.log('▸ Scan roots');
  console.log(
    `  · tables/columns — snapshot ${snapshot?.name ?? '(none)'} + ${sqlFiles.length} migration .sql`,
  );
  console.log(`  · endpoints      — ${apiFiles.length} file(s) under ${API_SRC_DIR}`);
  console.log(`  · zod schemas    — ${contractsFiles.length} file(s) under ${CONTRACTS_SRC_DIR}\n`);

  const snapshotData = snapshot?.data ?? null;
  const findings: Finding[] = [
    ...scanTables(snapshotData, sqlFiles, config),
    ...scanColumns(snapshotData, sqlFiles, config),
    ...scanEndpoints(apiFiles, config),
    ...scanZodSchemas(contractsFiles, config),
  ];

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log('  ✓ no FR-100 payout-destination artifacts found — v1 non-add invariant holds\n');
    console.log('✓ schema-diff gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ schema-diff gate FAILED with ${findings.length} FR-100 forbidden-pattern finding(s).\n` +
      `  v1 ships ZERO payout-destination surface (FR-100 non-add, architecture §1.13 Hook 2).\n` +
      `  The Durghatana Sahayata activation must be a GREENFIELD v2 addition (new table + new\n` +
      `  endpoints + new module), admitted via an explicit allow entry in ${CONFIG_FILE}\n` +
      `  (rationale + trustee-attested ADR per Story 14.7) — never a v1 column/endpoint/schema add.`,
  );
  process.exit(1);
}

main();
