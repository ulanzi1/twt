// scripts/microcopy/check.ts
//
// microcopy CI gate entrypoint (Story 1.17, AC3 / AC5 — the forensic-microcopy /
// vocabulary / numeral-discipline / FM-14 token-governance lint set). Resolves the
// declared scope globs, reads each file, runs the pure checks (lib.ts), and exits 1
// on any finding (each naming file + line + the canonical replacement).
//
// INVARIANT SCAN of the declared scope — NOT a git-diff (no GITHUB_BASE_REF, no
// fetch-depth: 0; mirrors schema-diff / benefit-mechanism, not friction-budget).
//
// v1 ENFORCEMENT FOOTPRINT [Decision 2]: scope.code_globs is a bounded, allow-listed
// apps/admin slice (the FM-14 magic-number check + the active vocabulary/tone checks
// have teeth NOW over live React components); scope.copy_globs is empty (the broad
// member-surface vocabulary/numeral register stays forward-compat until Epic 2+ member
// surfaces land — data-driven, no gate code change). Green-with-teeth on introduction.
//
// PRECISION-SCOPING = SELF-GREEN: the gate reads ONLY the declared scope globs. It never
// globs the repo root / _bmad-output / docs / *.md / sprint-status.yaml /
// scripts/microcopy/ itself / microcopy.yaml — so the prohibited terms that appear in
// THIS gate's docs/fixtures/config are not findings.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type Finding,
  type MicrocopyConfig,
  checkMagicNumberColors,
  checkNumerals,
  checkTone,
  checkVocabulary,
  formatFinding,
  parseMicrocopyConfig,
} from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

const CONFIG_FILE = 'microcopy.yaml';

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

/** Minimal glob → repo-relative file resolver (supports `*` and `**`). Mirrors the sibling gates. */
function resolveGlobs(globs: string[]): string[] {
  const out = new Set<string>();
  for (const glob of globs) {
    const firstStar = glob.search(/[*?]/);
    const prefix = firstStar === -1 ? glob : glob.slice(0, firstStar);
    const baseDir = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '';
    const absBase = path.join(repoRoot, baseDir);
    if (!fs.existsSync(absBase)) {
      console.warn(`⚠ microcopy gate: glob '${glob}' base dir '${baseDir || '.'}' not found — no files matched`);
      continue;
    }

    const re = new RegExp(
      '^' +
        glob
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*\//g, '§§')
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

function isCeremonial(file: string, config: MicrocopyConfig): boolean {
  if (config.numerals.ceremonialGlobs.length === 0) return false;
  const ceremonial = new Set(resolveGlobs(config.numerals.ceremonialGlobs));
  return ceremonial.has(file);
}

async function main(): Promise<void> {
  console.log(
    'microcopy gate — vocabulary / numeral-discipline / FM-14 token-governance (Story 1.17)\n',
  );

  const config = parseMicrocopyConfig(readRepo(CONFIG_FILE));
  const codeFiles = resolveGlobs(config.scope.codeGlobs);
  const copyFiles = resolveGlobs(config.scope.copyGlobs);
  console.log(
    `▸ Config microcopy.yaml (v${config.version}) — ${config.vocabulary.length} vocabulary term(s), ` +
      `${config.tone.length} tone rule(s), ${config.allow.length} allow-list entr(y/ies)`,
  );
  console.log(
    `▸ Scope — ${codeFiles.length} code file(s) [teeth: FM-14 colors + active vocab/tone + numerals], ` +
      `${copyFiles.length} copy file(s) [member-surface register; forward-compat]\n`,
  );
  if (config.scope.codeGlobs.length > 0 && codeFiles.length === 0) {
    console.error(
      '✗ microcopy gate: declared code_globs matched no files — gate has no teeth (verify scope config in microcopy.yaml)',
    );
    process.exit(1);
  } else if (codeFiles.length + copyFiles.length === 0) {
    console.warn(
      '⚠ microcopy gate: no files matched scope globs — scanned zero files (verify scope config in microcopy.yaml)',
    );
  }

  const findings: Finding[] = [];

  // code_globs — FM-14 magic-number colors + active vocabulary (member_only excluded) + tone + numerals.
  for (const file of codeFiles) {
    const text = readRepo(file);
    findings.push(...checkMagicNumberColors(file, text, config));
    findings.push(...checkVocabulary(file, text, config, { includeMemberOnly: false }));
    findings.push(...checkTone(file, text, config));
    findings.push(
      ...checkNumerals(file, text, config, { isCeremonial: isCeremonial(file, config) }),
    );
  }

  // copy_globs — the FULL vocabulary register (incl. member-address terms) + tone + numerals.
  for (const file of copyFiles) {
    const text = readRepo(file);
    findings.push(...checkVocabulary(file, text, config, { includeMemberOnly: true }));
    findings.push(...checkTone(file, text, config));
    findings.push(
      ...checkNumerals(file, text, config, { isCeremonial: isCeremonial(file, config) }),
    );
  }

  console.log('▸ Findings');
  if (findings.length === 0) {
    console.log(
      '  ✓ no vocabulary / tone / numeral / magic-number-color violations in the scanned scope\n',
    );
    console.log('✓ microcopy gate passed');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ microcopy gate FAILED with ${findings.length} finding(s).\n` +
      '  Fix the offending copy/literal (use the canonical term / a @twt/tokens token / Latin\n' +
      '  numerals), or — only for a GENUINE non-applicable — add an allow-list entry with a\n' +
      `  reason in ${CONFIG_FILE}.`,
  );
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(`\n✗ microcopy gate ERRORED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
