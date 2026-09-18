// ⭐ THE REAL `t()` PATH FOR `/sahyog-vivran/[driveToken]` — Story 11b.3 (Task 4; AC1, AC7).
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

import { formatCurrency, t, type Locale } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

/**
 * EVERY key `[driveToken].astro` resolves. ⛔ Kept in sync by hand and asserted below,
 * so a key added to the page without copy fails HERE rather than in production.
 */
const KEYS = [
  'page.title',
  'page.intro',
  'facts.group_label',
  // ⭐ Story 11b.3b (Task 2 unit 2) — the `<dt>` for the deceased member's name. ⚠ The VALUE is
  // inert today (⛔ no publication basis), ⛔ but the LABEL still has to resolve: `t()` THROWS on a
  // missing key, so an unresolvable `<dt>` is a 500 on the whole page the moment the first Pariwar
  // pins the clause — ⛔ not a blank label.
  'label.deceased_member',
  // ⭐ Story 11b.3b (Task 3/6, AC4/AC7) — the paging nav's own accessible NAME and its two links.
  // ⚠ `t()` THROWS on a missing key, so an unresolvable `aria-label` is a 500 on the whole page the
  // first time a drive has more contributors than one page holds — ⛔ not a silently unlabelled nav.
  'pagination.label',
  'pagination.previous',
  'pagination.next',
  'label.drive_code',
  'label.pool_letter',
  'label.district',
  'label.closed_on',
  'label.contributions',
  'label.status',
  'value.district_unknown',
  // ⭐⭐ Story 11b.3b / `-219` cl.1+cl.3 — the placeholder for a contributor row whose name is
  // withheld. ⚠ `t()` THROWS on a miss, so an unresolvable placeholder is a 500 on the whole page
  // the first time ANY of the five omission causes fires — ⛔ not a blank bullet.
  'value.contributor_unnamed',
  // ⚠⛔ Story 11b.12 — `status.collecting` / `status.active` / `status.archive` moved to the ONE
  // shared source, `sahyog-shared` (`2026-09-04-193` cl.3, AC4). ⛔ Do ⛔ not re-add them here.
  // ⚠ `collecting.*` KEEPS ITS KEY NAME by D3 while its VALUE now says **Live** — a knowing, ruled
  // trade (the ban is on rendered values, ⛔ not on identifiers a member never reads).
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

/**
 * ⛔⛔ THE CANDIDATES `#decision-2026-09-16-219` cl.3 RULED OUT **BY NAME** for the unnamed-contributor
 * placeholder. ⚠ A later re-wording that reaches for one of these must fail HERE, ⛔ not on a public
 * page.
 *
 * ⚠⛔⛔ **HOISTED AND SELF-TESTED AFTER A VACUOUS-GUARD DEFECT, 2026-09-16 — ⛔ read this before
 * editing.** These regexes were first written with literal **backspace** characters (`\x08`) where
 * `\b` belonged. ⇒ every pattern was unmatchable, `not.toMatch` passed TRIVIALLY, and the suite was
 * green over a guard that could ⛔ never fire — the exact vacuity this file's own header exists to
 * catch. ⭐ `lint`'s `no-control-regex` is what surfaced it, ⛔ not the test.
 * ⇒ ⭐ the guard now PROVES ITS OWN TEETH below, so a silently-defanged pattern fails instead of
 * passing ([[feedback_gate_scope_semantic_coverage]]).
 */
const BANNED_PLACEHOLDER_WORDS = [
  /anonym/i, // ⛔ states the person CHOSE anonymity — and 11b.2a D6(a) removed it for exactly that
  /\bnot\s+recorded\b/i, // ⛔ FALSE here: the name IS recorded, encrypted in KYC
  /\bwithheld\b/i,
  /\bremoved\b/i,
  /\berased\b/i,
  /\bunavailable\b/i,
  /गुमनाम/, // ⛔ the Hindi of "anonymous" — `common.member.anonymousMember`'s word
  /दर्ज\s+नहीं/, // ⛔ the Hindi of "not recorded" — `value.district_unknown`'s word
] as const;

describe('⛔ the placeholder banned-word guard has TEETH — ⛔ it must not pass vacuously', () => {
  // ⚠⛔ Each pattern is fed a string it MUST reject. ⭐ A pattern that stops matching its own probe is
  // defanged, and this goes red — which is what the backspace defect needed and did not have.
  const probes: readonly [RegExp, string][] = [
    [/anonym/i, 'An anonymous member'],
    [/\bnot\s+recorded\b/i, 'Not recorded'],
    [/\bwithheld\b/i, 'Name withheld'],
    [/\bremoved\b/i, 'Name removed'],
    [/\berased\b/i, 'Name erased'],
    [/\bunavailable\b/i, 'Name unavailable'],
    [/गुमनाम/, 'एक गुमनाम सदस्य'],
    [/दर्ज\s+नहीं/, 'दर्ज नहीं है'],
  ];

  it('⭐ every banned pattern MATCHES its probe — ⛔ tested against the REAL constant, flags included', () => {
    // ⚠⛔⛔ **THIS TEST WAS ITSELF VACUOUS UNTIL 2026-09-17** — the same defect class it exists to
    // prevent, one level up. ⛔ IT READ:
    //   `for (const [re, probe] of probes) expect(probe).toMatch(re);`
    // ⇒ `re` came from `probes` — the test's OWN duplicate literal — and was ⛔ never the pattern the
    // real guard uses. The only link was `expect(…re.source).toEqual(…re.source)`, and **`.source`
    // does ⛔ NOT include flags**. So dropping the `i` from `/\bwithheld\b/i` in
    // {@link BANNED_PLACEHOLDER_WORDS} left BOTH meta-assertions green while defanging the real guard,
    // and `"Name Withheld"` would have shipped to a public page.
    // ⭐ Now indexed against the constant, and flags are asserted explicitly.
    expect(probes).toHaveLength(BANNED_PLACEHOLDER_WORDS.length);
    probes.forEach(([declared, probe], i) => {
      const real = BANNED_PLACEHOLDER_WORDS[i]!;
      expect(real.source).toBe(declared.source);
      expect(real.flags).toBe(declared.flags);
      // ⭐⭐ THE LOAD-BEARING LINE — the probe is matched against the REAL pattern, ⛔ not the copy.
      expect(probe).toMatch(real);
    });
  });

  it('⛔ and ⛔ NO pattern contains a control character — the defect that defanged them', () => {
    for (const re of BANNED_PLACEHOLDER_WORDS) {
      // eslint-disable-next-line no-control-regex
      expect(re.source).not.toMatch(/[\x00-\x1f]/);
    }
  });
});

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
    it(`${locale}: "value.contributions_count" interpolates {count} with NO stray brace`, () => {
      const out = t('value.contributions_count', { count: 42 }, { locale, namespace: 'sahyog-vivran' });
      expect(out).toContain('42');
      // ⚠ Checking for the literal token NAME (`{{count}}` / `{count}`) is not enough — a
      // `{{count}}`-templated source resolves through the single-brace regex to `{42}`, a stray
      // brace around the SUBSTITUTED VALUE that names neither literal (review finding: this
      // exact shape passed the weaker assertion). Assert there is no brace of ANY kind left.
      expect(out).not.toMatch(/[{}]/);
    });

    it(`${locale}: "appeal.stage" interpolates {stage} with NO stray brace`, () => {
      const out = t('appeal.stage', { stage: 3 }, { locale, namespace: 'sahyog-vivran' });
      expect(out).toContain('3');
      expect(out).not.toMatch(/[{}]/);
    });

    // ⭐⭐ STORY 11b.3b (AC3b) — THE RULED RUPEE FIGURE, RESOLVED THE WAY THE PAGE RESOLVES IT.
    // ⚠⛔⛔ THIS LEG IS THE REGRESSION TEST FOR A DEFECT THAT ACTUALLY SHIPPED (found 2026-09-15,
    // Task 2 unit 1 review): the key was minted as `"₹{amount} raised"` while `[driveToken].astro`
    // passes `formatCurrency(amountInr, 'en')`, whose output ALREADY carries the symbol — so the page
    // rendered **`₹₹ 1,37,000 raised`**, in BOTH locales. ⛔ Nothing caught it: both suites stub
    // `labels.amountRaised` and so bypass `t()` AND `formatCurrency` at once — ⭐ the exact fixture
    // blind spot this file's header names, re-run on a new key.
    // ⭐ SO IT IS ASSERTED THROUGH THE REAL FORMATTER, ⛔ never a hand-written form: a transcribed
    // expectation is a second source for the house money form and would drift from `currency.ts`.
    it(`${locale}: "value.amount_raised" carries EXACTLY ONE ₹, from the formatter`, () => {
      const amount = formatCurrency(137000, 'en');
      const out = t('value.amount_raised', { amount }, { locale, namespace: 'sahyog-vivran' });
      expect(out).toContain(amount);
      expect(out).not.toMatch(/[{}]/);
      // ⛔⛔ THE DEFECT'S SIGNATURE — ⛔ never two symbols, and ⛔ never a literal ₹ in the template.
      expect(out.match(/₹/g)).toHaveLength(1);
      expect(out).not.toContain('₹₹');
      // ⚠ LATIN DIGITS IN BOTH LOCALES (amendment-A2): money is OPERATIONAL data. The page passes
      // `'en'` to the formatter even under `hi`, and the Devanagari leg below covers the template.
      expect(out).toMatch(/1,37,000/);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⭐⭐ STORY 11b.3b (Task 6, AC7) — THE CROSS-NAMESPACE KEYS, AND THE COMPLETENESS FENCE
  // ══════════════════════════════════════════════════════════════════════════════════════════════

  // ⭐⭐ THE CONTRIBUTOR SECTION'S COPY LIVES IN THE `contribution` NAMESPACE, ⛔ NOT THIS ONE — and
  // that is the point: `packages/ui/src/contribution-list/i18n-keys.ts` already declares these keys
  // and `@twt/ui`'s own consumer resolves them. ⭐ **REUSE ONLY; ⛔ nothing is minted there**, and
  // ⛔ copying them into `sahyog-vivran.json` would be a SECOND HOME for one string.
  // ⚠⛔ **THE PREFIX IS `contributor_list.`, ⛔ NOT `contribution_list.`** — the MODULE is
  // `contribution-list`, the KEYS are not, and `contribution_list.*` matches ⛔ ZERO keys in the repo.
  // ⚠⛔ **AND THE NAMESPACE IS THE *THIRD* ARGUMENT TO `t()`.** Passing it second lands it in the
  // params slot, falls back to `common`, and THROWS on every call — the page passes it correctly and
  // this leg is what proves the page's spelling, ⛔ not the fixture's.
  const CONTRIBUTOR_KEYS = ['contributor_list.confirmed_header', 'contributor_list.empty'] as const;

  for (const locale of LOCALES) {
    for (const key of CONTRIBUTOR_KEYS) {
      it(`${locale}: "${key}" resolves from the \`contribution\` namespace`, () => {
        const out = t(key, undefined, { locale, namespace: 'contribution' });
        expect(out).toBeTruthy();
        expect(out).not.toMatch(/\{\{?[a-z_]+\}?\}/i);
      });
    }

    it(`${locale}: those keys are ⛔ ABSENT from \`sahyog-vivran\` — ⛔ no second home`, () => {
      // ⛔⛔ THE NEGATIVE HALF, AND IT IS THE ONE THAT MATTERS. Resolving from `contribution` proves
      // the keys EXIST; this proves nobody COPIED them here to "make the page self-contained".
      // ⚠ `t()` throws on a miss, so absence is asserted by the throw itself.
      for (const key of CONTRIBUTOR_KEYS) {
        expect(() => t(key, undefined, { locale, namespace: 'sahyog-vivran' })).toThrow();
      }
    });
  }

  // ⛔⛔ **MINTED COPY MAY ⛔ NEVER CLAIM THE LIST IS COMPLETE** (AC7). Two shipped doc-blocks say so,
  // and this is the third place that has to hold — because COPY is where a completeness claim would
  // actually surface. ⭐ This page reads "N confirmed" beside FEWER than N named rows **BY DESIGN**,
  // from THREE independent omissions: RTBF erasure (`2026-08-30-169`), a MONONYM under
  // `shielded_name` (`2026-08-21-145` cl.3), and the erasure sentinel (AC5).
  // ⚠⛔ AND ⛔ NO OMISSION COUNT EITHER — ⛔ no "some names withheld", ⛔ no tally: a count of omissions
  // is an enumeration signal over which members were erased.
  // ⚠⛔⛔ **THE DEVANAGARI PATTERNS WERE VACUOUS UNTIL 2026-09-18 (fourth review pass).** JS `\b` is an
  // ASCII word boundary, so `/\bछिपाए/` can ⛔ NEVER match — `/\bछिपाए/.test('कुछ नाम छिपाए गए')` is
  // `false` — and `not.toMatch` passed trivially: the same class `2efa4c98` fixed for the English half.
  // ⇒ ⭐ a Unicode letter/mark lookbehind with the `u` flag, and ⭐ this leg proves each one CAN fire.
  // ⚠⛔ **ONE SOURCE FOR THE PATTERNS** (fifth review pass, 2026-09-18). The fourth pass's anti-vacuity
  // leg planted violations against RE-TYPED COPIES of these regexes, so reverting a FENCE pattern to
  // `\b` still passed it ([[feedback_stub_must_call_not_transcribe]]). ⇒ both legs read these constants.
  const beforeNoLetter = '(?<![\\p{L}\\p{M}])';
  const HI_COMPLETENESS_CLAIMS: readonly (readonly [RegExp, string])[] = [
    [new RegExp(`${beforeNoLetter}सभी\\s+सहयोगी`, 'u'), 'यहाँ सभी सहयोगी दिखाए गए हैं'],
    [new RegExp(`${beforeNoLetter}पूरी\\s+सूची`, 'u'), 'यह पूरी सूची है'],
  ];
  const HI_TALLIES: readonly (readonly [RegExp, string])[] = [
    [new RegExp(`${beforeNoLetter}छिपाए`, 'u'), 'कुछ नाम छिपाए गए'],
    [new RegExp(`${beforeNoLetter}रोके`, 'u'), '3 नाम रोके गए'],
  ];
  it('⭐ anti-vacuity: every Devanagari fence pattern MATCHES a planted violation', () => {
    for (const [pattern, planted] of [...HI_COMPLETENESS_CLAIMS, ...HI_TALLIES]) {
      expect(planted).toMatch(pattern);
    }
    // ⭐ And the lookbehind still refuses a MID-WORD hit, which is what `\b` was there for.
    expect('अछिपाए').not.toMatch(HI_TALLIES[0]![0]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: ⛔ NO copy claims the contributor list is COMPLETE, and ⛔ none counts omissions`, () => {
      const all = [
        ...KEYS.map((k) => t(k, undefined, { locale, namespace: 'sahyog-vivran' })),
        ...CONTRIBUTOR_KEYS.map((k) => t(k, undefined, { locale, namespace: 'contribution' })),
      ].join(' ');
      for (const claim of [
        /\ball\s+contributors?\b/i,
        /\bevery\s+contributors?\b/i,
        /\bcomplete\s+list\b/i,
        /\bfull\s+list\b/i,
        /\bentire\s+list\b/i,
        ...HI_COMPLETENESS_CLAIMS.map(([pattern]) => pattern),
      ]) {
        expect(all).not.toMatch(claim);
      }
      for (const tally of [/\bwithheld\b/i, /\bomitted\b/i, /\bhidden\b/i, ...HI_TALLIES.map(([pattern]) => pattern)]) {
        expect(all).not.toMatch(tally);
      }
    });
  }

  // ⭐⭐ `#decision-2026-09-16-219` cl.3 — THE PLACEHOLDER WORD, THROUGH THE REAL `t()`, BOTH LOCALES.
  // ⚠⛔ A labels fixture stubs this string in two test files; ⛔ a stub is a SECOND source for a RULED
  // word ([[feedback_stub_must_call_not_transcribe]]). ⇒ THIS is the leg that binds the shipped copy.
  for (const [locale, expected] of [
    ['en', 'A contributor'],
    ['hi', 'एक सहकर्मी'],
  ] as const) {
    it(`${locale}: the placeholder is EXACTLY the ratified word, and names ⛔ no cause`, () => {
      const word = t('value.contributor_unnamed', undefined, { locale, namespace: 'sahyog-vivran' });
      expect(word).toBe(expected);

      // ⛔⛔ cl.3 — the word must be TRUE under all five omission causes and disclose ⛔ NONE of them.
      // ⚠ These are the candidates the Panel ruled out BY NAME; a later re-wording that reaches for
      // one of them fails HERE rather than on a public page.
      for (const banned of BANNED_PLACEHOLDER_WORDS) {
        expect(word).not.toMatch(banned);
      }
    });
  }

  // ⭐ cl.3 — ⛔ NO PER-CAUSE VARIANT MAY BE MINTED. Five causes, ONE word.
  it('⛔ this namespace declares ⛔ NO second placeholder key', () => {
    const file = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../packages/i18n/locales/en/sahyog-vivran.json',
    );
    const keys = Object.keys(JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>);
    const placeholders = keys.filter(
      (k) => !k.startsWith('$') && /contributor_unnamed|contributor_erased|contributor_withheld/.test(k),
    );
    expect(placeholders).toEqual(['value.contributor_unnamed']);
  });

  // ⚠⛔⛔ **THE STAGE WORDS ARE CONSUMED FROM `sahyog-shared`, ⛔ NEVER MINTED HERE** (AC7). ⭐ The
  // ruled public vocabulary is **Live / Closed / Verified** — `2026-09-04-192` cl.1 amended `-191`
  // cl.3's *"Completed"* (which implied a payment event that does ⛔ not exist) and `2026-09-04-193`
  // Trustee-ratified it. ⇒ ⛔ *"Completed"* must appear in ⛔ NO locale file, and that absence is the
  // amendment WORKING, ⛔ not a gap. ⛔ Cite `-192` cl.1 + `-193`, ⛔ never `-191` cl.3 alone.
  for (const locale of LOCALES) {
    it(`${locale}: ⛔ this namespace mints ⛔ NO stage word — they live in \`sahyog-shared\``, () => {
      for (const key of ['stage.live', 'stage.closed', 'stage.verified', 'stage.settled']) {
        expect(() => t(key, undefined, { locale, namespace: 'sahyog-vivran' })).toThrow();
      }
      // ⭐ AND THE THREE RULED ONES DO RESOLVE FROM THEIR ONE HOME — ⛔ so the leg above is ⛔ not
      // passing merely because the keys exist nowhere at all, which would make it vacuous.
      for (const key of ['stage.live', 'stage.closed', 'stage.verified']) {
        expect(t(key, undefined, { locale, namespace: 'sahyog-shared' })).toBeTruthy();
      }
      // ⛔⛔ AND `stage.settled` EXISTS IN ⛔ NO NAMESPACE — the wire token is `settled`, the WORD is
      // "Verified" (`public-read.ts` maps `settled: 'verified'`). A `stage.settled` key would be a
      // second source for a Trustee-ratified word.
      expect(() => t('stage.settled', undefined, { locale, namespace: 'sahyog-shared' })).toThrow();
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
