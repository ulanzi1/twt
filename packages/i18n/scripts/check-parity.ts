// packages/i18n/scripts/check-parity.ts
//
// i18n parity gate entry (Story 2.1, AC3/AC5) — the IMPURE shell around the pure core
// (lib.ts). Reads the `locales/{en,hi}/*.json` tree + `locales/classification.json`
// off disk, runs `checkParity`, prints each finding naming file + key, and exits 1 on
// any violation. Wired as the `i18n:check-parity` turbo task → `i18n-parity` CI job →
// `ci-local.sh` registration (the active merge gate while GitHub Actions is suspended).
//
// Read-only from the repo's POV: the working tree is never altered.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseClassificationConfig } from '../src/classification.js';
import { checkParity, formatFinding, type LocaleCatalogs } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, '..');
const localesDir = path.join(pkgRoot, 'locales');

/** Read one locale's `*.json` domain files into a namespace→catalog map (strings only). */
function loadLocale(locale: 'en' | 'hi'): LocaleCatalogs {
  const dir = path.join(localesDir, locale);
  const out: LocaleCatalogs = {};
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith('.json')) continue;
    const namespace = entry.slice(0, -'.json'.length);
    const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, entry), 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`locales/${locale}/${entry} must be a JSON object of string values`);
    }
    const catalog: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        throw new Error(`locales/${locale}/${entry} key '${key}' must be a string, got ${typeof value}`);
      }
      catalog[key] = value;
    }
    out[namespace] = catalog;
  }
  return out;
}

function main(): void {
  console.log('i18n parity gate — bilingual surface contract (Story 2.1, AC3/AC5)\n');

  const classification = parseClassificationConfig(
    JSON.parse(fs.readFileSync(path.join(localesDir, 'classification.json'), 'utf8')),
  );
  const en = loadLocale('en');
  const hi = loadLocale('hi');

  const enNamespaces = Object.keys(en).sort();
  console.log(`▸ en namespaces: ${enNamespaces.length > 0 ? enNamespaces.join(', ') : '(none)'}`);
  console.log(
    `▸ classification default: ${classification.default}; ` +
      `admin-facing overrides: ${Object.keys(classification.namespaces).length}\n`,
  );

  const findings = checkParity({ en, hi, classification });

  if (findings.length === 0) {
    console.log('✓ i18n parity gate passed — every member-facing en/ key has non-empty Hindi parity');
    return;
  }

  for (const f of findings) console.error(`  ✗ ${formatFinding(f)}`);
  console.error(
    `\n✗ i18n parity gate FAILED with ${findings.length} finding(s). Add the named Hindi parity ` +
      `entr${findings.length === 1 ? 'y' : 'ies'} in locales/hi/, or declare the namespace ` +
      `admin-facing in locales/classification.json.`,
  );
  process.exit(1);
}

try {
  main();
} catch (err: unknown) {
  console.error(`\n✗ i18n parity gate ERRORED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
