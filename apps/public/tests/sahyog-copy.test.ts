// ⭐ THE REAL `t()` PATH FOR `/sahyog` — Story 11b.1 (Task 5; AC4).
//
// ── ⛔ WHY THIS FILE EXISTS, AND WHY IT IS NOT OPTIONAL ─────────────────────────────────────────
// THE 11a.2 HEADLINE DEFECT WAS A TEST-FIXTURE BLIND SPOT, ⛔ NOT A LOGIC ERROR. `/members` threw
// on **every single request** — the copy used a `{{max}}` token while `packages/i18n`'s resolver
// matches SINGLE-brace `{max}` — and ⛔ NO TEST CAUGHT IT, because every test hand-built a labels
// fixture and bypassed `t()` entirely. The page was green in CI and broken in fact.
//
// ⇒ this file exercises the REAL resolver against the REAL committed locale files, for BOTH
// locales, for EVERY key the page asks for. ⛔ A labels fixture cannot substitute: the fixture
// shape IS the blind spot. Assert THROUGH `t()`, ⛔ never around it.
//
// ⚠ `t()` DEFAULTS TO THE `common` NAMESPACE AND THROWS ON A MISS, so every call below passes
// `namespace: 'sahyog-drive'` explicitly — exactly as the page does.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { t, type Locale } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

/**
 * EVERY key `sahyog.astro` resolves. ⛔ Kept in sync by hand and asserted below, so a key added to
 * the page without copy fails HERE rather than in production.
 */
  // ⚠⛔ Story 11b.12 — the SIX keys removed below did ⛔ not disappear: the three stage names and
  // their explanations moved to the ONE shared source, `sahyog-shared` (`2026-09-04-193` cl.3,
  // AC4), where the drive page and (at story E) the member app read the SAME keys. ⛔ Do ⛔ not
  // re-add `status.*` or `section.*.help` here — two sources is exactly how *"Active"* came to mean
  // two different things. ⭐ The shared set has its own key test in `sahyog-stage-vocabulary.test.ts`.
const KEYS = [
  'page.title',
  'page.intro',
  'section.active.title',
  'section.archive.title',
  'table.caption.active',
  'table.caption.archive',
  'table.col.name',
  'table.col.pool',
  'table.col.letter',
  'table.col.district',
  'table.col.date',
  'table.col.contributions',
  'table.col.outcome',
  'value.district_unknown',
  'value.date_unknown',
  'outcome.fully_funded',
  'outcome.under_funded',
  'outcome.partial',
  'filter.legend',
  'filter.district.label',
  'filter.closed_from.label',
  'filter.closed_to.label',
  'filter.pool_code.label',
  'filter.submit',
  'filter.no_name_search',
  'empty.title',
  'empty.body',
  'empty.filtered.title',
  'empty.filtered.body',
  'past_end.title',
  'past_end.body',
  'outage.title',
  'outage.body',
  'rejected.title',
  'rejected.body',
  'pagination.label',
  'pagination.previous',
  'pagination.next',
  'consent.note',
] as const;

const LOCALES: readonly Locale[] = ['en', 'hi'];

describe('/sahyog copy resolves through the REAL t() — both locales', () => {
  for (const locale of LOCALES) {
    for (const key of KEYS) {
      it(`${locale}: "${key}" resolves to non-empty copy`, () => {
        const out = t(key, undefined, { locale, namespace: 'sahyog-drive' });
        expect(out).toBeTruthy();
        // ⛔ An UNRESOLVED interpolation token left in the output is the 11a.2 defect's
        // signature — the page renders literal braces where a number belongs.
        expect(out).not.toMatch(/\{\{?[a-z_]+\}?\}/i);
      });
    }
  }

  // ⭐ THE INTERPOLATED KEY, ASSERTED THROUGH `t()` WITH ITS PARAM — this is the exact shape that
  // threw on every request at 11a.2. A test that resolved it WITHOUT the param would pass while
  // the page broke.
  for (const locale of LOCALES) {
    it(`${locale}: "value.contributions_count" interpolates {count} with NO stray brace`, () => {
      const out = t('value.contributions_count', { count: 42 }, { locale, namespace: 'sahyog-drive' });
      expect(out).toContain('42');
      // ⚠ Checking for the literal token NAME (`{{count}}` / `{count}`) is not enough — a
      // `{{count}}`-templated source resolves through the single-brace regex to `{42}`, a stray
      // brace around the SUBSTITUTED VALUE that names neither literal (review finding: this exact
      // shape shipped live and passed the weaker assertion). Assert no brace of any kind survives.
      expect(out).not.toMatch(/[{}]/);
    });
  }

  // ⚠ Read off DISK rather than imported: `@twt/i18n` exports no per-locale JSON subpath, and
  // adding one just to satisfy a test would widen the package's public surface for no other reason.
  it('en and hi declare the SAME key set — ⛔ neither locale may drift ahead', () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/i18n/locales');
    const read = (loc: string): Record<string, string> =>
      JSON.parse(readFileSync(join(dir, loc, 'sahyog-drive.json'), 'utf8')) as Record<string, string>;
    expect(Object.keys(read('en')).sort()).toEqual(Object.keys(read('hi')).sort());
  });

  // ⛔ THE PROHIBITED VOCABULARY (`microcopy.yaml:42,48`). "donor" → colleague / सम्मानित साथी;
  // "Late Teacher" → Deceased Member. Both are `member_only: true`, so both bite the moment this
  // namespace enters `copy_globs` — asserted here too so the failure is legible rather than a
  // gate line-number.
  // ⚠ AND THE POOL-REALITY-COMPARISON RULE: no copy on this surface may compare to a target.
  for (const locale of LOCALES) {
    it(`${locale}: no prohibited term, and ⛔ no comparison-to-target framing`, () => {
      const all = KEYS.map((k) => t(k, undefined, { locale, namespace: 'sahyog-drive' })).join(' ');
      for (const banned of [/\bdonor/i, /late teacher/i, /\breceipt\b/i, /\bpassbook\b/i]) {
        expect(all).not.toMatch(banned);
      }
      for (const comparison of [/fell short/i, /shortfall/i, /\d+% of the target/i, /लक्ष्य से कम/]) {
        expect(all).not.toMatch(comparison);
      }
    });
  }
});
