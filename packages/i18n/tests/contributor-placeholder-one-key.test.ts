// Story 11b.21 (AC4; `#decision-2026-09-19-224` D1) — the ruled contributor placeholder lives in ONE key.
//
// `2026-09-18-222` cl.2 (Trustee-ratified): the member contributor list renders the SAME words as the public
// Sahyog Vivran page — `A contributor` / `एक सहकर्मी` — and *"⛔ no member-specific variant is minted, and
// ⛔ no second key."* ⇒ across EVERY namespace file, in each locale, exactly one key carries the word, and it
// is `sahyog-vivran` → `value.contributor_unnamed`.
//
// ⚠ Why a directory scan: `apps/public/tests/sahyog-vivran-copy.test.ts`'s single-placeholder check reads
// ONLY `en/sahyog-vivran.json`, so a second key in `contribution.json` would pass it. Modelled on
// `apps/public/tests/sahyog-stage-vocabulary.test.ts` (`readdirSync(join(LOCALES_DIR, locale))`).
// ⛔ `$comment.*` keys are documentation, ⛔ not copy, and are skipped.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales');

const WORD = { en: 'A contributor', hi: 'एक सहकर्मी' } as const;

/** Every `namespace → key` whose VALUE is exactly `word`, flattening any nested object. */
function keysCarrying(locale: keyof typeof WORD, word: string): string[] {
  const hits: string[] = [];
  const walk = (namespace: string, node: unknown, prefix: string): void => {
    if (typeof node === 'string') {
      if (node.trim() === word) hits.push(`${namespace} → ${prefix}`);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith('$comment')) continue;
      walk(namespace, v, prefix === '' ? k : `${prefix}.${k}`);
    }
  };
  const files = readdirSync(join(LOCALES_DIR, locale)).filter((f) => f.endsWith('.json'));
  // Non-vacuity: a mis-resolved directory must fail, ⛔ never read as "no second key".
  expect(files.length).toBeGreaterThan(10);
  for (const file of files) {
    walk(file.replace(/\.json$/, ''), JSON.parse(readFileSync(join(LOCALES_DIR, locale, file), 'utf8')), '');
  }
  return hits;
}

describe('the contributor placeholder is ONE key across every namespace (`-222` cl.2, `-224` D1)', () => {
  for (const locale of ['en', 'hi'] as const) {
    it(`${locale}: exactly one key has the value "${WORD[locale]}", and it is sahyog-vivran → value.contributor_unnamed`, () => {
      expect(keysCarrying(locale, WORD[locale])).toEqual(['sahyog-vivran → value.contributor_unnamed']);
    });
  }
});
