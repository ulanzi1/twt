// ⭐ THE REAL `t()` PATH FOR `/sahyog-vivran/[poolCanonicalIdentifier]` — Story 11b.3 (Task 4; AC1, AC7).
//
// ── ⛔ WHY THIS FILE EXISTS, AND WHY IT IS NOT OPTIONAL ─────────────────────────────────────────
// THE 11a.2 HEADLINE DEFECT WAS A TEST-FIXTURE BLIND SPOT, ⛔ NOT A LOGIC ERROR. `/members` threw
// on **every single request** — the copy used a `{{max}}` token while `packages/i18n`'s resolver
// matches SINGLE-brace `{max}` — and ⛔ NO TEST CAUGHT IT, because every test hand-built a labels
// fixture and bypassed `t()` entirely. The page was green in CI and broken in fact.
//
// ⇒ this file exercises the REAL resolver against the REAL committed locale files, for BOTH locales,
// for EVERY key the page asks for. ⛔ A labels fixture cannot substitute: the fixture shape IS the
// blind spot. Assert THROUGH `t()`, ⛔ never around it.
// ⚠ AND ⛔ NOT BY READING THE LOCALE JSON FROM DISK EITHER — that is the same defect wearing a
// different costume. The one disk read below compares KEY SETS, ⛔ not values.
//
// ⚠ `t()` DEFAULTS TO THE `common` NAMESPACE AND THROWS ON A MISS, so every call below passes
// `namespace: 'sahyog-vivran'` explicitly — exactly as the page does.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { t, type Locale } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

/**
 * EVERY key `[poolCanonicalIdentifier].astro` resolves. ⛔ Kept in sync by hand and asserted below,
 * so a key added to the page without copy fails HERE rather than in production.
 */
const KEYS = [
  'page.title',
  'page.intro',
  'facts.group_label',
  'label.drive_code',
  'label.pool_letter',
  'label.district',
  'label.closed_on',
  'label.contributions',
  'label.status',
  'value.district_unknown',
  'status.collecting',
  'status.active',
  'status.archive',
  'collecting.title',
  'collecting.body',
  'outcome.fully_funded',
  'outcome.under_funded',
  'outcome.partial',
  'appeal.title',
  'appeal.lineage',
  'appeal.reversed_on',
  'disposition.new_evidence_presented',
  'disposition.procedural_correction',
  'disposition.reconsideration_on_merits',
  'outage.title',
  'outage.body',
] as const;

const LOCALES: readonly Locale[] = ['en', 'hi'];

describe('/sahyog-vivran copy resolves through the REAL t() — both locales', () => {
  for (const locale of LOCALES) {
    for (const key of KEYS) {
      it(`${locale}: "${key}" resolves to non-empty copy`, () => {
        const out = t(key, undefined, { locale, namespace: 'sahyog-vivran' });
        expect(out).toBeTruthy();
        // ⛔ An UNRESOLVED interpolation token left in the output is the 11a.2 defect's signature —
        // the page renders literal braces where a number belongs.
        expect(out).not.toMatch(/\{\{?[a-z_]+\}?\}/i);
      });
    }
  }

  // ⭐ THE TWO INTERPOLATED KEYS, ASSERTED THROUGH `t()` WITH THEIR PARAMS — this is the exact shape
  // that threw on every request at 11a.2. A test that resolved them WITHOUT the param would pass
  // while the page broke.
  for (const locale of LOCALES) {
    it(`${locale}: "value.contributions_count" interpolates {{count}}`, () => {
      const out = t('value.contributions_count', { count: 42 }, { locale, namespace: 'sahyog-vivran' });
      expect(out).toContain('42');
      expect(out).not.toContain('{{count}}');
      expect(out).not.toContain('{count}');
    });

    it(`${locale}: "appeal.stage" interpolates {{stage}}`, () => {
      const out = t('appeal.stage', { stage: 3 }, { locale, namespace: 'sahyog-vivran' });
      expect(out).toContain('3');
      expect(out).not.toContain('{{stage}}');
      expect(out).not.toContain('{stage}');
    });
  }

  // ⚠ Read off DISK rather than imported: `@twt/i18n` exports no per-locale JSON subpath, and adding
  // one just to satisfy a test would widen the package's public surface for no other reason.
  it('en and hi declare the SAME key set — ⛔ neither locale may drift ahead', () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/i18n/locales');
    const read = (loc: string): Record<string, string> =>
      JSON.parse(readFileSync(join(dir, loc, 'sahyog-vivran.json'), 'utf8')) as Record<string, string>;
    expect(Object.keys(read('en')).sort()).toEqual(Object.keys(read('hi')).sort());
  });

  // ⛔ THE PROHIBITED VOCABULARY (`microcopy.yaml`). `donor` → colleague / सम्मानित साथी;
  // `Late Teacher` → Deceased Member; `report` → Sahyog Vivran. All bite the moment this namespace
  // enters `copy_globs` — asserted here too so the failure is legible rather than a gate line-number.
  // ⚠ AND THE POOL-REALITY-COMPARISON RULE: ⛔ no copy on this surface may compare to a target. The
  // numbers are already quarantined upstream by `classifyCycleOutcome`; this is the second place that
  // quarantine has to hold, because COPY is where a shortfall would actually surface.
  for (const locale of LOCALES) {
    it(`${locale}: no prohibited term, and ⛔ no comparison-to-target framing`, () => {
      const all = KEYS.map((k) => t(k, undefined, { locale, namespace: 'sahyog-vivran' })).join(' ');
      for (const banned of [/\bdonor/i, /late teacher/i, /\breceipt\b/i, /\bpassbook\b/i, /\breport\b/i]) {
        expect(all).not.toMatch(banned);
      }
      for (const comparison of [/fell short/i, /shortfall/i, /\d+% of the target/i, /लक्ष्य से कम/]) {
        expect(all).not.toMatch(comparison);
      }
    });
  }

  // ⭐⛔ AC3's PROHIBITED FRAMINGS, IN THE COPY LAYER. The domain read and the DTO make an estimate
  // structurally unreachable; this asserts the COPY does not narrate one anyway. The live-drive block
  // must say "the final outcome will appear after reconciliation settles" — ⛔ never a projection,
  // ⛔ never an "X% confirmed so far" frame that exposes the attested↔confirmed gap.
  for (const locale of LOCALES) {
    it(`${locale}: the live-drive copy promises a LATER outcome, ⛔ never an estimate`, () => {
      const body = t('collecting.body', undefined, { locale, namespace: 'sahyog-vivran' });
      for (const estimate of [
        /\bestimat/i,
        /\bproject(ed|ion)\b/i,
        /\bapproximate/i,
        /\bso far\b/i,
        /\d+\s*%/,
        /अनुमान/,
        /लगभग/,
      ]) {
        expect(body).not.toMatch(estimate);
      }
    });
  }

  // ⛔ UX-DR73 NUMERAL DISCIPLINE — this is an OPERATIONAL register surface (drive codes, dates,
  // counts), so Latin numerals even under `hi`. A Devanagari operational digit must not ship.
  for (const locale of LOCALES) {
    it(`${locale}: ⛔ no Devanagari digits anywhere in this namespace`, () => {
      const all = KEYS.map((k) => t(k, undefined, { locale, namespace: 'sahyog-vivran' })).join(' ');
      expect(all).not.toMatch(/[०-९]/);
    });
  }
});
