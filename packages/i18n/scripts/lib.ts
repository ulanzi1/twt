// packages/i18n/scripts/lib.ts
//
// PURE verification core for the i18n parity gate (Story 2.1, AC3/AC5). Holds no
// filesystem/CI coupling so it is unit-testable in isolation — the lib-vs-check split
// of the 1.17 scripts/microcopy gate. The impure entry (check-parity.ts) reads the
// `locales/` tree off disk and calls `checkParity` here.
//
// Asserts the bilingual surface contract:
//   1. every key in en/<ns> has a non-empty hi/<ns> parity entry …
//   2. … for namespaces that are member-facing (the default) — they cannot ship a
//      string missing Hindi;
//   3. admin-facing namespaces may ship English-only (skipped).

import { resolveClassification } from '../src/classification.js';
import type { ClassificationConfig } from '../src/classification.js';

/** A locale's catalogs: namespace → (key → value). */
export type LocaleCatalogs = Record<string, Record<string, string>>;

/** Pure-core input: both locales' catalogs + the classification config. */
export interface ParityInput {
  en: LocaleCatalogs;
  hi: LocaleCatalogs;
  classification: ClassificationConfig;
}

/** A single parity violation, naming the offending file + key (AC5). */
export interface ParityFinding {
  file: string;
  namespace: string;
  key: string;
  message: string;
}

/**
 * Compare en/ against hi/ under the classification rules and return all parity
 * violations (empty array = clean). Pure: same input → same output, no I/O.
 */
export function checkParity(input: ParityInput): ParityFinding[] {
  const findings: ParityFinding[] = [];

  for (const [namespace, enCatalog] of Object.entries(input.en)) {
    // admin-facing namespaces may ship English-only (rule 3) — no parity requirement.
    if (resolveClassification(input.classification, namespace) === 'admin-facing') continue;

    const hiCatalog = input.hi[namespace] ?? {};
    for (const key of Object.keys(enCatalog)) {
      const hiValue = hiCatalog[key];
      if (hiValue === undefined || hiValue.trim() === '') {
        findings.push({
          file: `locales/hi/${namespace}.json`,
          namespace,
          key,
          message: `member-facing namespace '${namespace}' has key '${key}' in en/ but its Hindi parity entry is ${hiValue === undefined ? 'MISSING' : 'EMPTY'}`,
        });
      }
    }
  }

  return findings;
}

/** Render a finding as a single line naming file + key (AC5). */
export function formatFinding(f: ParityFinding): string {
  return `${f.file} :: key '${f.key}' — ${f.message}`;
}
