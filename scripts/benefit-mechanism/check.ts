// scripts/benefit-mechanism/check.ts
//
// benefit-mechanism PR CI gate entrypoint (Story 1.16d, FR-100 / FR-7 Hook 1 —
// the enum-tag guard). Asserts every Niyamavali rule record carries a valid
// `benefit_mechanism` discriminator (`pool | reserve`), and that v1 rules only
// ever use `pool` (architecture §1.13 Hook 1 L1133-1147). The SIBLING of 1.16c's
// schema-diff (Hook 2, non-add): Hook 2 asserts ZERO forbidden artifacts exist;
// Hook 1 (here) asserts EVERY rule record is tagged.
//
// INVARIANT SCAN of current repo state — NOT a git-diff against a base ref (like
// the sibling schema-diff / pii-scrape, UNLIKE friction-budget). No GITHUB_BASE_REF,
// no merge-base, no fetch-depth: 0. See README.md.
//
// NO-OP UNTIL EPIC 2: the Niyamavali rule registry (the `clause_versions` table +
// seed + apps/api/src/modules/rules/ payload) is Epic 2 / Story 2.3. At v1:
//   · check (a) rule-record tag scan → no rule records (seed/fixture globs empty,
//     no INSERT INTO the rule table) → finds nothing.
//   · check (b) enum-definition cross-check → TEETH NOW (asserts the shipped
//     BenefitMechanism z.enum equals benefit-mechanism.yaml `mechanisms`).
//   · check (c) rule-table schema-column → no `clause_versions` table → no-op.
// The gate grows teeth surface-by-surface as Epic 2 populates rule_sources — the
// no-op is DATA-DRIVEN, not a feature flag.
//
// Repo-global by design — the rule artifacts span packages/domain (the
// clause_versions migration + seed) and apps/api/src/modules/rules/ (the registry
// payload), so this is a repo-root tsx script (not a per-package turbo task),
// invoked via `pnpm benefit:check`. The forward-compat enum type lives in
// packages/contracts/ (importable by Epic 2); only this gate is repo-root.
//
// PRECISION-SCOPING = SELF-GREEN (AC-7): the four keywords (`benefit_mechanism`,
// `pool`, `reserve`, `BENEFIT_MECHANISM_V1_ONLY`) appear across _bmad-output / docs
// / READMEs / *.md / this story / this gate's own fixtures + benefit-mechanism.yaml.
// NONE are rule records. The gate reads ONLY the declared rule_sources (globs empty
// at v1) + migration SQL for the configured tables + the drizzle snapshot + the
// enum file — never the repo root / _bmad-output / docs / *.md / sprint-status.yaml
// / scripts/benefit-mechanism/ / the config.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type Finding,
  type JsonSeedFile,
  type SqlFile,
  checkEnumDefinition,
  extractFromJsonSeed,
  extractFromSqlInserts,
  formatFinding,
  parseBenefitMechanismConfig,
  scanRuleTableColumns,
  validateRuleRecords,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

const CONFIG_FILE = 'benefit-mechanism.yaml';
const MIGRATIONS_DIR = 'packages/domain/migrations';
const MIGRATIONS_META_DIR = 'packages/domain/migrations/meta';

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

/** All `migrations/*.sql` files (flat dir), repo-relative. */
function collectMigrationSql(): SqlFile[] {
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
      `benefit-mechanism: failed to parse snapshot ${latest}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Minimal glob → repo-relative file resolver (supports `*` and `**`). Empty at v1. */
function resolveGlobs(globs: string[]): string[] {
  const out = new Set<string>();
  for (const glob of globs) {
    // Static prefix (before the first wildcard) gives the walk root.
    const firstStar = glob.search(/[*?]/);
    const prefix = firstStar === -1 ? glob : glob.slice(0, firstStar);
    const baseDir = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '';
    const absBase = path.join(repoRoot, baseDir);
    if (!fs.existsSync(absBase)) continue;

    const re = new RegExp(
      '^' +
        glob
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*\//g, '§§') // **/ → any depth (incl. zero)
          .replace(/\*\*/g, '§§')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '[^/]')
          .replace(/§§/g, '(?:.*/)?') +
        '$',
    );

    const walk = (absDir: string): void => {
      for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const abs = path.join(absDir, entry.name);
        if (entry.isDirectory()) {
          walk(abs);
        } else if (entry.isFile()) {
          const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
          if (re.test(rel)) out.add(rel);
        }
      }
    };
    walk(absBase);
  }
  return [...out].sort();
}

async function main(): Promise<void> {
  console.log('benefit-mechanism gate — FR-100 / FR-7 Hook 1 enum-tag guard (Story 1.16d)\n');

  // Parse the config — throws on malformed → gate fails loudly (AC-1).
  const config = parseBenefitMechanismConfig(readRepo(CONFIG_FILE));
  console.log(
    `▸ Config benefit-mechanism.yaml (v${config.version}) — ` +
      `mechanisms [${config.mechanisms.join(', ')}], v1_only=${config.v1Only}, ` +
      `v1_permitted [${config.v1Permitted.join(', ')}]\n`,
  );

  const findings: Finding[] = [];

  // Check (b) — enum-definition cross-check (TEETH NOW; dynamic-imports the enum).
  console.log('▸ Check (b) enum-definition cross-check');
  const enumFindings = await checkEnumDefinition(config);
  console.log(
    enumFindings.length === 0
      ? '  ✓ BenefitMechanism z.enum matches config.mechanisms\n'
      : '  ✗ enum drift detected\n',
  );
  findings.push(...enumFindings);

  // Check (c) — rule-table schema-column (no-op until Story 2.3 lands the table).
  const snapshot = loadLatestSnapshot();
  console.log('▸ Check (c) rule-table schema-column');
  const schemaFindings = scanRuleTableColumns(snapshot?.data ?? null, config);
  console.log(
    `  · rule tables [${config.ruleSources.tables.join(', ') || '(none)'}] vs snapshot ` +
      `${snapshot?.name ?? '(none)'} → ${schemaFindings.length} finding(s)\n`,
  );
  findings.push(...schemaFindings);

  // Check (a) — rule-record tag scan (no-op at v1: no rule records).
  const migrationSql = collectMigrationSql();
  const globFiles = resolveGlobs([
    ...config.ruleSources.seedGlobs,
    ...config.ruleSources.fixtureGlobs,
  ]);
  const sqlFixtures: SqlFile[] = [];
  const jsonSeeds: JsonSeedFile[] = [];
  for (const rel of globFiles) {
    const text = readRepo(rel);
    if (rel.endsWith('.sql')) sqlFixtures.push({ path: rel, text });
    else if (rel.endsWith('.json')) jsonSeeds.push({ path: rel, text });
    else {
      console.warn(
        `  ! Skipping ${rel}: only .sql and .json rule-source files are parsed ` +
          `(declare .ts/.yaml seeds in rule_sources after Epic 2 establishes the seed shape)`,
      );
    }
  }
  const records = [
    ...extractFromSqlInserts([...migrationSql, ...sqlFixtures], config),
    ...extractFromJsonSeed(jsonSeeds, config),
  ];
  console.log('▸ Check (a) rule-record tag scan');
  console.log(
    `  · ${migrationSql.length} migration .sql + ${globFiles.length} declared rule-source file(s) ` +
      `→ ${records.length} rule record(s)\n`,
  );
  findings.push(...validateRuleRecords(records, config));

  // Report.
  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log(
      '  ✓ enum matches config; every rule record (0 at v1) carries a valid ' +
        'benefit_mechanism — FR-100 Hook 1 enum-tag invariant holds\n',
    );
    console.log('✓ benefit-mechanism gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ benefit-mechanism gate FAILED with ${findings.length} FR-100 Hook 1 finding(s).\n` +
      `  Every Niyamavali rule record must carry benefit_mechanism ∈ {${config.mechanisms.join(', ')}};\n` +
      `  v1 rules only ever use ${config.v1Permitted.join(', ')} (architecture §1.13 Hook 1).\n` +
      `  reserve-tagged rules are a GREENFIELD v2 addition admitted by flipping v1_only: false in\n` +
      `  ${CONFIG_FILE} (trustee-attested ADR per Story 14.7 + continuous-gate closure at Story 14.5).`,
  );
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(
    `\n✗ benefit-mechanism gate ERRORED: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
