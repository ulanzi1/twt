// ⭐⭐ THE RULED STAGE VOCABULARY — **Live · Closed · Verified** — Story 11b.12 (AC1, AC2, AC4).
//
// `2026-09-04-190` cl.5 · `-191` cl.3 · `-192` cl.1/3 · `-193` cl.1/3, all Trustee-ratified
// (Dhiraj Rahul + Kalpana Bharti). ⭐ This file asserts the three properties that are decided by
// COPY rather than by code, and that ⛔ no typecheck can see.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { t } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

const LOCALES = ['en', 'hi'] as const;
const LOCALES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/i18n/locales',
);

/** ⛔ The two SAHYOG namespaces, and ⛔ deliberately no others — see the scope note at AC1 below. */
const SAHYOG_NAMESPACES = ['sahyog-drive', 'sahyog-shared', 'sahyog-vivran'] as const;

/**
 * The RENDERED values of a namespace. ⚠ `$comment*` keys are developer notes (the convention this
 * repo already uses in `locales/classification.json`) — they are ⛔ never passed to `t()` and
 * ⛔ never reach a member, so they are ⛔ not user-facing copy.
 */
function renderedValues(locale: string, namespace: string): Array<[string, string]> {
  const raw = JSON.parse(
    readFileSync(join(LOCALES_DIR, locale, `${namespace}.json`), 'utf8'),
  ) as Record<string, string>;
  return Object.entries(raw).filter(([k]) => !k.startsWith('$comment'));
}

describe('AC1 — the RETIRED stage words render ⛔ nowhere on either sahyog surface', () => {
  // ⚠⛔ WORD-BOUNDARY, ⛔ NOT SUBSTRING — and that is load-bearing in both directions.
  //  · Substring `collect` would false-fail on `collecting.body`'s D3-ruled *"the collection window
  //    closes"* and on `empty.body`'s *"collection window"*, neither of which is a STAGE NAME.
  //  · Bare `active` would false-fail on ordinary prose containing the word.
  // ⭐ What `-190` cl.5(b) retires is the stage VOCABULARY, on the REGISTER ground recorded
  // verbatim — *"like Trust is collector"* — ⛔ not every string containing those letters.
  const RETIRED = /\b(active|collecting|archive|archived)\b/i;

  // ⛔⛔ SCOPED TO THE SAHYOG NAMESPACES, AND ⛔ IT MAY ⛔ NOT BE WIDENED REPO-WIDE.
  // ⚠ `locales/{en,hi}/members.json` renders **"Active"** as the ratified MEMBER-LIFECYCLE label
  // (`2026-08-21-144` cl.4). It is CORRECT, it has ⛔ nothing to do with drives, and a repo-wide ban
  // would false-fail on it and invite someone to "fix" a ratified word.
  for (const locale of LOCALES) {
    for (const ns of SAHYOG_NAMESPACES) {
      it(`${locale}/${ns}: ⛔ no retired stage word in any rendered value`, () => {
        const offenders = renderedValues(locale, ns).filter(([, v]) => RETIRED.test(v));
        expect(
          offenders.map(([k]) => k),
          `these values still render a RETIRED stage word (Active / Collecting / Archive). The ` +
            `ruled words are Live · Closed · Verified (${'`'}2026-09-04-191${'`'} cl.3).`,
        ).toEqual([]);
      });
    }
  }

  it('⛔ NON-VACUOUS — the scan actually reads a real body of copy', () => {
    // The 1.13 "inert guard" lesson: a scanner with nothing to scan reports green.
    const total = LOCALES.flatMap((l) => SAHYOG_NAMESPACES.flatMap((ns) => renderedValues(l, ns)));
    expect(total.length).toBeGreaterThan(80);
    expect(RETIRED.test('Archived drives')).toBe(true); // the matcher itself still bites
  });

  it('⭐ the ban is on VALUES, ⛔ not on KEY NAMES (D3) — `collecting.*` keeps its name', () => {
    // ⚠ Stated as an ASSERTION, ⛔ not as a comment, because the opposite reading is the natural
    // one and would send a future dev renaming keys across four render files and six test files.
    const keys = renderedValues('en', 'sahyog-vivran').map(([k]) => k);
    expect(keys).toContain('collecting.title');
    expect(keys).toContain('collecting.body');
  });
});

describe('⛔⛔ AC1 — the `hi` half is pinned POSITIVELY, because a word ban is BLIND to it', () => {
  // ⚠⛔ THE ENGLISH BAN ABOVE FINDS **ZERO** HITS IN `hi/*.json` **BY CONSTRUCTION** — the strings
  // are in Devanagari. ⇒ a dev who rewrites only `en` passes it with `hi` still reading
  // सक्रिय / संग्रह / संग्रहण. ⭐ And `parity.test.ts` does ⛔ NOT close this either: it compares
  // KEY SETS, ⛔ never values. ⇒ the ruled Hindi words must be pinned as PRESENT.
  const RULED_HI = { 'stage.live': 'जारी', 'stage.closed': 'बंद', 'stage.verified': 'सत्यापित' };

  for (const [key, word] of Object.entries(RULED_HI)) {
    it(`hi: ${key} renders the ruled Hindi word "${word}"`, () => {
      expect(t(key, undefined, { locale: 'hi', namespace: 'sahyog-shared' })).toBe(word);
    });
  }

  it('⛔ the RETIRED Hindi stage words render nowhere on either sahyog surface', () => {
    // ⭐ The exact strings the four files carried before this story: सक्रिय (Active),
    // संग्रह / अभिलेख (Archive) and संग्रहण (Collecting) — as WHOLE stage labels.
    const RETIRED_HI = ['सक्रिय', 'अभिलेख', 'संग्रहण', 'संग्रह'];

    // ⚠⛔ TWO KNOWN, LEGITIMATE, NON-STAGE-LABEL USES OF संग्रह ("collection") — same shape as the
    // English `RETIRED` regex's need for word-boundary, not substring: `empty.body` ("collection
    // window") and `collecting.body` (D3-ruled, "collection window" retained verbatim). Both use
    // संग्रह as an ordinary noun inside a sentence, ⛔ never as the bare ARCHIVE stage-label value —
    // a real regression would reintroduce it AS a label (e.g. at `section.archive.title` or
    // `table.caption.archive`), which this scoped exclusion does ⛔ not shield.
    const KNOWN_NON_LABEL_USES = new Set(['sahyog-drive:empty.body', 'sahyog-vivran:collecting.body']);

    const offenders: string[] = [];
    for (const ns of SAHYOG_NAMESPACES) {
      for (const [k, v] of renderedValues('hi', ns)) {
        const id = `${ns}:${k}`;
        if (KNOWN_NON_LABEL_USES.has(id)) continue;
        if (RETIRED_HI.some((w) => v.includes(w))) offenders.push(id);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('⛔⛔ AC2 — ⛔ NO copy states or implies that the TRUST pays the family', () => {
  // ⚠⛔ CASE-INSENSITIVE AND CONCEPT-SHAPED, ⛔ NOT THE TWO LITERAL SENTENCES — and that is the
  // whole point of this assertion's shape. `page.intro` said *"still to be **paid out**"* and
  // *"already **paid out**"*: ⛔ neither matches the literal `"not yet been paid"`, and ⛔ neither
  // matches a CASE-SENSITIVE `"Paid out"`. A naive test passes while the falsehood stays live.
  //
  // ⭐ WHY IT IS FALSE, ⛔ not merely old: `2026-09-04-192` establishes the trust ⛔ NEVER disburses
  // — `upi-intent.ts` builds the payment server-side with the NOMINEE as payee ⇒ the family is paid
  // **THROUGHOUT** a drive. A payout step ⛔ does not exist to be "not yet" reached.
  const PAYOUT = [/not yet been paid/i, /paid out/i, /to be paid/i, /भुगतान/];

  for (const locale of LOCALES) {
    for (const ns of SAHYOG_NAMESPACES) {
      it(`${locale}/${ns}: ⛔ no payout claim`, () => {
        const offenders = renderedValues(locale, ns)
          .filter(([, v]) => PAYOUT.some((re) => re.test(v)))
          .map(([k]) => k);
        expect(
          offenders,
          `these values state or imply a trust payout the trust ⛔ never performs ` +
            `(${'`'}2026-09-04-192${'`'}).`,
        ).toEqual([]);
      });
    }
  }

  it('⛔ NON-VACUOUS — the matcher still bites the three sentences this story deleted', () => {
    expect(PAYOUT.some((re) => re.test('The family has not yet been paid.'))).toBe(true);
    expect(PAYOUT.some((re) => re.test('Paid out to the family.'))).toBe(true);
    expect(PAYOUT.some((re) => re.test('those already paid out appear under Archive'))).toBe(true);
    expect(PAYOUT.some((re) => re.test('जिन अभियानों का भुगतान अभी होना है'))).toBe(true);
  });

  it('⚠ `outcome.under_funded` is ⛔ NOT touched by this story — D2 closed WITHOUT moving it', () => {
    // ⭐ Pinned so the key's survival is a RECORDED disposition, ⛔ not an oversight someone
    // "tidies" later. D2 (Trustee Panel, DR + KB, 2026-09-05) settled WHO AUTHORS WHAT; the
    // ratified replacement is authored dark at AC9 and rendered on the DRIVE PAGE, at another
    // story. ⛔ A copy story may ⛔ not rewrite a statement of the trust's obligation.
    expect(t('outcome.under_funded', undefined, { locale: 'en', namespace: 'sahyog-drive' })).toBe(
      'The cycle closed. The trust met its commitment to the family.',
    );
  });
});

describe('⭐⭐ AC4 — ONE shared copy source, and ⛔ exactly one', () => {
  // ⚠⛔ `-193` cl.3, on BigDev's ground adopted into the ruling: **two sources is exactly how
  // *"Active"* came to mean two different things.** ⇒ asserted by a TEST, ⛔ not by convention.
  const STAGE_KEYS = ['stage.live', 'stage.closed', 'stage.verified'] as const;

  it('⭐ the stage set RESOLVES through the real `t()` path in both locales', () => {
    // ⭐ The `members.json` lesson (`catalog-registration.test.ts`): a namespace whose file exists
    // but whose five `catalog.ts` lines were forgotten passes the parity gate GREEN while every
    // `t()` call against it THROWS in production. ⇒ resolve REAL keys, ⛔ never a hand-built fixture.
    for (const locale of LOCALES) {
      for (const key of [...STAGE_KEYS, 'stage.live.help', 'stage.explainer.summary']) {
        const value = t(key, undefined, { locale, namespace: 'sahyog-shared' });
        expect(value.length, `${locale}/sahyog-shared :: ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('⛔⛔ NO SECOND DEFINITION — ⛔ no other namespace, in any locale, defines a stage word', () => {
    // ⭐ Scanned over EVERY locale file on disk, ⛔ not over a hand-listed set of suspects: a story
    // that mints `apps/mobile`'s own copy would land in a namespace nobody thought to list here.
    const offenders: string[] = [];
    for (const locale of LOCALES) {
      for (const file of readdirSync(join(LOCALES_DIR, locale))) {
        if (!file.endsWith('.json')) continue;
        const ns = file.replace(/\.json$/, '');
        if (ns === 'sahyog-shared') continue; // ⭐ the ONE permitted home
        for (const [k] of renderedValues(locale, ns)) {
          if (STAGE_KEYS.includes(k as (typeof STAGE_KEYS)[number]) || k.startsWith('stage.')) {
            offenders.push(`${locale}/${ns} :: ${k}`);
          }
        }
      }
    }
    expect(
      offenders,
      `the stage vocabulary is defined OUTSIDE ${'`'}sahyog-shared${'`'}. ⛔ There may be exactly ` +
        `ONE source (${'`'}2026-09-04-193${'`'} cl.3) — ⛔ do not re-add these keys, consume the ` +
        `shared ones.`,
    ).toEqual([]);
  });

  it('⛔ the retired `status.*` keys are GONE from both sahyog surfaces', () => {
    // ⭐ The concrete way a second source would come back: someone re-adds `status.active` to
    // `sahyog-drive.json` rather than reading `stage.closed`.
    for (const locale of LOCALES) {
      for (const ns of ['sahyog-drive', 'sahyog-vivran']) {
        const keys = renderedValues(locale, ns).map(([k]) => k);
        for (const gone of ['status.active', 'status.archive', 'status.collecting']) {
          expect(keys, `${locale}/${ns} re-introduced ${gone}`).not.toContain(gone);
        }
      }
    }
  });
});
