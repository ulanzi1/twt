// ⭐ EVERY LOCALE DOMAIN ON DISK IS REGISTERED IN THE CATALOG — Story 11a.3 (Task 11; AC9).
//
// ── ⛔ THE GAP THIS CLOSES, AND THE DEFECT THAT PROVED IT REAL ──────────────────────────────────
// `catalog.ts` registers domains BY HAND (deliberately — no magic glob, so the registry is
// reviewable). The parity gate (`scripts/check-parity.ts`) walks the `locales/` DIRECTORY.
// ⇒ THE TWO NEVER MEET: a domain whose `{en,hi}.json` pair exists but whose registry lines were
// forgotten passes `i18n:check-parity` GREEN, while every `t()` call against it THROWS
// `[i18n] unknown namespace '<domain>'` at runtime.
//
// ⛔ THAT IS NOT HYPOTHETICAL. Story 11a.2 added `locales/{en,hi}/members.json` and shipped
// `members.astro` calling `t(..., { namespace: 'members' })` — but never registered `members`.
// `/members` therefore threw on EVERY REQUEST on `main`, with a green parity gate, and ⛔ no test
// caught it: every test hand-built a `MembersLabels` fixture and bypassed the resolver entirely.
// (It is the SECOND defect of exactly this shape on the same page — the first was `{{max}}` vs the
// single-brace `{max}` token. Both were fixture blind spots, ⛔ neither was a logic error.)
//
// ⭐ FIXING THE INSTANCE IS NOT ENOUGH — this file mechanizes the INVARIANT, so the next domain
// added without its registry lines fails here instead of in production
// ([[feedback_gate_scope_semantic_coverage]]: complete only when an invariant MEANINGFULLY covers
// the new surface).

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { getCatalog, KNOWN_NAMESPACES } from '../src/catalog.js';
import { LOCALES } from '../src/locale.js';

const here = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(here, '../locales');

/** The domains present on disk for a locale, derived from the filenames. */
function domainsOnDisk(locale: string): string[] {
  return readdirSync(join(LOCALES_DIR, locale))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

describe('⭐ catalog registration — the registry and the filesystem cannot drift', () => {
  it('the scan is NON-VACUOUS — it finds a real set of domains on disk', () => {
    // The 1.13 "inert guard" lesson: a scanner with nothing to scan reports green.
    expect(domainsOnDisk('en').length).toBeGreaterThan(5);
  });

  for (const locale of LOCALES) {
    it(`[${locale}] ⛔ EVERY domain file on disk is REGISTERED in the catalog`, () => {
      const unregistered = domainsOnDisk(locale).filter(
        (d) => getCatalog(locale, d) === undefined,
      );
      expect(
        unregistered,
        `these locale files exist but are NOT registered in catalog.ts — every t() call against ` +
          `them THROWS at runtime while the parity gate stays green: ${unregistered.join(', ')}`,
      ).toEqual([]);
    });

    it(`[${locale}] ⛔ every REGISTERED namespace resolves to a real, non-empty catalog`, () => {
      // The other drift direction: a registry entry whose file was deleted or emptied.
      for (const ns of KNOWN_NAMESPACES) {
        const catalog = getCatalog(locale, ns);
        expect(catalog, `${locale}/${ns} is registered but resolves to nothing`).toBeDefined();
        expect(Object.keys(catalog ?? {}).length, `${locale}/${ns} is empty`).toBeGreaterThan(0);
      }
    });
  }

  it('KNOWN_NAMESPACES agrees with the registry itself — ⛔ not a hand-maintained second list', () => {
    // ⚠ `KNOWN_NAMESPACES` is a separate literal from the `catalogs` map, so it can drift from the
    // thing it claims to describe. Asserting the two against each other is what stops that.
    for (const ns of KNOWN_NAMESPACES) {
      expect(getCatalog('en', ns), `KNOWN_NAMESPACES lists '${ns}' but en has no catalog`).toBeDefined();
    }
    for (const domain of domainsOnDisk('en')) {
      expect(
        KNOWN_NAMESPACES,
        `'${domain}' has a catalog but is missing from KNOWN_NAMESPACES`,
      ).toContain(domain);
    }
  });

  it('⭐ the `members` domain specifically resolves — the defect this file was written for', () => {
    // ⛔ A named regression guard for the flagship public surface. Story 11a.3's page cannot render
    // without this, and it was broken on `main` when that story began.
    for (const locale of LOCALES) {
      expect(getCatalog(locale, 'members')?.['page_title']).toBeTruthy();
    }
  });
});
