// ⭐⭐ THE TWO **DARK COPY TOKENS** — `{amount}` and `{nominee_name}` — Story 11b.12 (AC9, Task 2b).
//
// ── ⭐ WHAT "DARK" MEANS HERE, PRECISELY ────────────────────────────────────────────────────────
// The Trustee Panel (Dhiraj Rahul + Kalpana Bharti, 2026-09-05) ratified an INDEX line — routing
// note §9.2 — and closed **D2** with three rulings (§10.2). ⭐ Only **ruling 3** is this story's:
// *an absent token **DROPS ITS CLAUSE**; ⛔ no combinatorial variants.*
//
//   · ruling 1 (mechanize the approver duty) ⇒ **Story 6.18**
//   · ruling 2 (the nominee name on the index) ⇒ **`11b-14` AC7 + Task 8**
//
// ⇒ **B AUTHORS THE COPY; ANOTHER STORY LIGHTS IT UP.** `{amount}` is story D's field, and
// `{nominee_name}` is story D's AC7 — ⛔ NEITHER is on a public wire today.
//
// ⚠⛔ AND THAT IS WHY THE SECOND HALF OF THIS FILE EXISTS — ⭐ THOUGH ⛔ NOT FOR THE REASON THE
// STORY GAVE. Story 11b.12's AC9 states that *"`t()` interpolates an unsupplied token to nothing ⇒
// an empty rupee figure … must never reach a page"*. ⛔ **THAT IS FALSE IN THIS CODEBASE, AND IT WAS
// CHECKED, ⛔ not assumed**: `resolver.ts:36-42` **THROWS** `[i18n] missing interpolation param` on
// an unsupplied `{token}`. ⇒ the real failure mode of a premature render is a **500 / an outage
// arm**, ⛔ not a silently-blank figure.
// ⭐ The conclusion is UNCHANGED and if anything stronger — ⛔ the copy may exist, ⛔ the render may
// not — but the reason is recorded correctly so the next reader does ⛔ not go looking for a blank
// ₹ that this resolver cannot produce.
//
// ⭐ WHY IT IS AUTHORED HERE AT ALL, rather than left to D: story D's **AC7 is already written
// against these keys**. Had B shipped nothing, D would have minted its own — ⭐ recreating the exact
// two-source defect `-193` cl.3 exists to close, on a **Trustee-ratified** line
// ([[feedback_circular_deferral_between_sibling_stories]], re-forming AFTER the split was resolved).

import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { t } from '../src/index.js'

const NAMESPACE = 'sahyog-shared'
const LOCALES = ['en', 'hi'] as const
// ⚠⛔ [Review][Patch] CORRECTED 2026-09-12 (third pass) — A PRIOR FIX HERE USED `resolve()`, WHICH
// ⛔ DOES NOT RESOLVE SYMLINKS OR NORMALISE CASE, WHILE CLAIMING TO CLOSE EXACTLY THAT GAP. ⭐
// `realpathSync` DOES: both `OWN_FILE` and every walked `f` are canonicalised through it below, so
// the `===` comparison compares real filesystem identity, ⛔ not just two string spellings of a path.
const OWN_FILE = realpathSync(fileURLToPath(import.meta.url))
const repoRoot = join(dirname(OWN_FILE), '../../..')

/**
 * ⭐ Read a variant's RAW TEMPLATE, ⛔ never through `t()`.
 *
 * ⚠⛔ LOAD-BEARING: these strings carry `{token}`s that ⛔ NOTHING supplies yet, and `t()` THROWS on
 * an unsupplied token (`resolver.ts:36-42`). ⇒ asserting on the template is the ONLY way to pin
 * copy that is deliberately dark — and the throw is itself the proof it IS dark.
 */
function template(locale: string, key: string): string {
  const raw = JSON.parse(
    readFileSync(join(repoRoot, `packages/i18n/locales/${locale}/${NAMESPACE}.json`), 'utf8'),
  ) as Record<string, string>
  const value = raw[key]
  if (value === undefined) throw new Error(`missing ${locale}/${NAMESPACE}:${key}`)
  return value
}

/** ⭐ The FOUR variants, and ⛔ exactly four — see the ruling-3 assertion below. */
const VARIANTS = [
  'index_line.full',
  'index_line.no_nominee',
  'index_line.no_family',
  'index_line.no_district',
] as const

// ⭐⭐ STORY 11b.19 — B's UNSHIPPED HALF. The §8.1 **MESSAGE BLOCK** and its table labels, added to
// THIS file rather than a sibling because the repo walk below must stay **ONE** walker: two copies
// drift the moment one gains a `SKIP` entry the other lacks, and the self-exclusion carve-out here
// already names this filename. ⛔ Nothing above is weakened — ⭐ the helpers are HOISTED, ⛔ not edited.
const MESSAGE_BLOCK_KEYS = [
  'message_block.headline.full',
  'message_block.headline.no_family',
  'message_block.solidarity',
  'message_block.gratitude',
  'message_block.tagline',
  'message_block.join',
  'message_block.table.nominee_name',
  'message_block.table.district',
] as const

// ⭐ HOISTED (Story 11b.19) from the second describe, unchanged, so BOTH families scan one walker.
const SCAN_ROOTS = ['apps', 'packages'].map((d) => join(repoRoot, d))
const SKIP = new Set(['node_modules', 'dist', '.turbo', 'ios', 'android', '.astro'])

/**
 * ⭐⭐ **A TEST MODULE IS ⛔ NOT A RENDER SITE — NARROWED 2026-09-13 (Story 11b.17), ⭐ WITH ITS REASON.**
 *
 * ⚠⛔ **THIS FENCE CAUGHT `11b-17`'s OWN TEST FILE, AND THAT WAS THE FENCE WORKING** — ⛔ but it was
 * ⛔ **not** catching the thing it exists to catch. ⭐ Its stated danger is precise: *"an unguarded
 * resolution ships a **500 / outage arm** onto a PAGE-shaped block"* ⇒ the subject is a **PRODUCTION
 * RENDER**. A `.test.ts` naming these keys in order to **ASSERT** them ⛔ cannot ship anything to a
 * member — ⭐ and this very file's FIRST tests resolve `index_line.*` and `message_block.*` for exactly
 * that purpose, which is why it already self-excludes by real path. ⇒ ⭐ the carve-out is the same one,
 * generalised from ONE file to the CLASS, ⛔ not a new indulgence.
 *
 * ⚠⛔⛔ **AND IT IS A NARROWING, ⛔ NOT A WAIVER — ⭐ THE DISTINCTION IS THE WHOLE POINT.** The wrong fix
 * was to **APPEND the test file to `AUTHORISED`**, which is what both allow-lists below forbid in
 * terms (*"⛔ do ⛔ not append to it to make a build green"*) — that would have declared a TEST an
 * authorised RENDER SITE and left the next real one able to hide behind it.
 * ⛔ Scoped to a **TEST MODULE** (`*.test.*` / `*.spec.*`), ⛔ **not** to a `tests/` directory: a helper
 * module living beside a test is still ordinary source and is still scanned.
 * ⚠ The non-vacuity assertions below are what keep this honest — ⛔ they fail if this carve-out ever
 * swallows the real walk ([[feedback_gate_scope_semantic_coverage]]).
 */
const isTestModule = (file: string): boolean => /\.(test|spec)\.(ts|tsx)$/.test(file)

function sources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sources(full, acc)
    else if (/\.(ts|tsx|astro)$/.test(entry) && !isTestModule(entry)) acc.push(full)
  }
  return acc
}

const files = SCAN_ROOTS.flatMap((r) => sources(r))

describe('⭐ AC9 — the ratified index line is AUTHORED, verbatim, in both locales', () => {
  it('the FULL line carries BOTH pending tokens — ⛔ verbatim from routing note §9.2', () => {
    expect(template('en', 'index_line.full')).toBe(
      '{amount} contributed by colleagues for {nominee_name}, nominee of Late {family_name}, ' +
        'who served in {district_name} district.',
    )
    expect(template('hi', 'index_line.full')).toBe(
      'जनपद {district_name} में कार्यरत स्व० {family_name} की नॉमिनी {nominee_name} के लिए ' +
        'सहकर्मियों द्वारा {amount} का योगदान।',
    )
  })

  it('⭐ RULING 3 — ONE variant per absent token, ⛔ NOT the combinatorial cross-product', () => {
    // ⚠ Three optional tokens would be 2³ = EIGHT sentences if written combinatorially. The Panel
    // ruled *"omit the clause whose value is absent"* (§9.5, §10.2 ruling 3) ⇒ FOUR strings.
    expect(VARIANTS).toHaveLength(4)
    for (const locale of LOCALES) {
      for (const key of VARIANTS) {
        expect(template(locale, key).trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('⭐ each variant DROPS exactly the clause its name says, and keeps the rest', () => {
    for (const locale of LOCALES) {
      const v = (k: (typeof VARIANTS)[number]) => template(locale, k)
      // `{amount}` is on EVERY variant — it is pending-on-D, ⛔ not nullable.
      for (const key of VARIANTS) expect(v(key)).toContain('{amount}')

      expect(v('index_line.no_nominee')).not.toContain('{nominee_name}')
      expect(v('index_line.no_nominee')).toContain('{family_name}')
      expect(v('index_line.no_nominee')).toContain('{district_name}')

      expect(v('index_line.no_district')).not.toContain('{district_name}')
      expect(v('index_line.no_district')).toContain('{nominee_name}')
      expect(v('index_line.no_district')).toContain('{family_name}')

      expect(v('index_line.no_family')).not.toContain('{family_name}')
      expect(v('index_line.no_family')).toContain('{nominee_name}')
    }
  })

  it('⛔⛔ `no_family` ALSO drops the district clause — ⛔ this is ⛔ not an oversight', () => {
    // ⚠⛔ THE COUPLING, STATED AS AN ASSERTION SO IT CANNOT BE "FIXED" BACK. *"who served in
    // {district_name} district"* / *"जनपद {district_name} में कार्यरत"* modifies the **DECEASED
    // MEMBER**. Drop `{family_name}` and leave the district clause standing, and the sentence
    // attributes the posting district to the **NOMINEE** — a factual claim about a named private
    // individual that the data does ⛔ not support. ⇒ the dependent clause goes with its antecedent.
    for (const locale of LOCALES) {
      expect(
        template(locale, 'index_line.no_family'),
        'a nameless family must ⛔ not leave the district clause attached to the nominee',
      ).not.toContain('{district_name}')
    }
  })
})

describe('⛔⛔ AC9 — ⛔ NEITHER TOKEN IS RENDERED. The copy exists; the render may ⛔ not.', () => {
  // ⚠ A repo scan, because the failure is not local: the defect would be a NEW call site in another
  // package, added by a story that read "the copy is ready" and stopped there.
  // ⭐ HOISTED to module scope by Story 11b.19 so the `message_block.*` fence shares ONE walker —
  // ⛔ the roots, the SKIP set and the extensions are byte-identical to what shipped here.

  it('⛔ NON-VACUOUS — the scan reaches a real body of source', () => {
    expect(files.length).toBeGreaterThan(200)
  })

  it('⭐ `t()` THROWS on a dark line — the render is ⛔ structurally unavailable, ⛔ not merely unwritten', () => {
    // ⭐⭐ THE REAL MECHANISM, PINNED. A story that tries to render the ratified line before its
    // tokens exist gets a LOUD failure, ⛔ never a page with an empty ₹. ⚠ This corrects AC9's own
    // stated premise (see the header) — recorded, ⛔ not silently relied upon.
    expect(() => t('index_line.full', undefined, { locale: 'en', namespace: NAMESPACE })).toThrow(
      /missing interpolation param 'amount'/,
    )
    // ⭐ And it resolves cleanly ONCE the tokens are supplied — so the copy itself is sound, and
    // ⛔ this is ⛔ not a broken string being excused as "dark".
    expect(
      t('index_line.full', { amount: '₹1,20,000', nominee_name: 'Sunita Devi', family_name: 'R K Sharma', district_name: 'Lucknow' }, { locale: 'en', namespace: NAMESPACE }),
    ).toBe(
      '₹1,20,000 contributed by colleagues for Sunita Devi, nominee of Late R K Sharma, who served in Lucknow district.',
    )
  })

  it('⛔ an `index_line.*` key is resolved ⛔ ONLY where EVERY token is supplied', () => {
    // ⚠⛔⛔ **NARROWED 2026-09-07 (Story 11b.14, AC7) — ⛔ NOT DELETED, ⭐ and its AUTHOR left this
    // instruction in writing** ([[feedback_supersede_never_reinterpret]]). It read *"⛔ ⛔ NO source
    // file resolves an `index_line.*` key"*, with: *"⭐ WHEN STORY D LANDS: D renders these keys and
    // this assertion becomes false BY DESIGN. ⛔ Do ⛔ not delete it then — **NARROW it** to *'⛔ never
    // rendered without both tokens supplied'*, which is the property that actually protects the
    // page."* ⭐ Story D has landed; that is exactly what this now asserts.
    //
    // ⭐⭐ **THE SURVIVING PROPERTY IS THE ONE THAT MATTERS**: `t()` **THROWS** on an unsupplied
    // interpolation param, so a resolution that does ⛔ not supply every token its string names is a
    // **500 / outage arm on a live public page**, ⛔ not a blank figure. ⇒ every resolver must sit
    // behind {@link selectIndexLineVariant}'s decision — including its `null`, which means
    // ⛔ **NO ratified variant fits** and the row renders ⛔ nothing (`2026-09-07-205` cl.6).
    //
    // ⚠⛔ [Review][Patch] WIDENED 2026-09-12 (re-review) to the SAME shape as the `message_block.*`
    // RESOLVER below — ⭐ two copies of this fence drifting is exactly what this file's own doc-block
    // warns against for the walker (`SCAN_ROOTS`/`SKIP`). A dynamically-built key
    // (`` `index_line.${variant}` ``) would have slipped past the old fully-quoted-literal form
    // just as it would have for `message_block.*`; the one authorised site (`sahyog.astro`) uses
    // only bare literals, so this change is a no-op for it (verified: the fence still names exactly
    // that one file).
    const RESOLVER = /['"`]index_line\.[\w.$]+/
    const resolvers = files.filter((f) => {
      if (realpathSync(f) === OWN_FILE) return false
      return RESOLVER.test(readFileSync(f, 'utf8'))
    })

    // ⭐ THE ALLOW-LIST IS ⛔ NOT A WAIVER — it names the ONE render site story D authorised, so a
    // SECOND one (another package, another surface) still fails here and must come back with its
    // own ruling. ⛔ Do ⛔ not append to it to make a build green.
    const AUTHORISED = ['/apps/public/src/pages/sahyog.astro']
    expect(
      resolvers.map((f) => f.replace(repoRoot, '')).sort(),
      'a file RESOLVES a ratified index-line key. ⛔ t() THROWS on an unsupplied token ' +
        '(resolver.ts:36-42) ⇒ an unguarded resolution ships a 500 / outage arm onto a live ' +
        'public page. ⭐ Only Story 11b.14 (AC7) authorised a render, and only behind ' +
        'selectIndexLineVariant.',
    ).toEqual(AUTHORISED)

    // ⭐⭐ AND THE GUARD IS ASSERTED, ⛔ not assumed: the authorised site consults the selector, and
    // ⛔ returns early on its `null` rather than resolving a key anyway.
    const authorised = readFileSync(join(repoRoot, AUTHORISED[0]!), 'utf8')
    expect(authorised).toContain('selectIndexLineVariant')
    expect(authorised).toMatch(/variant === null\)\s*return null/)
  })

  it('⭐ the tokens ARE on the public index wire now — ⭐ and that is ruling 2 landing, ⛔ not drift', () => {
    // ⚠⛔⛔ **NARROWED 2026-09-07 (Story 11b.14, AC7) — ⛔ NOT DELETED.** It asserted the INDEX
    // contract does ⛔ NOT match `/nomineeName|nominee_name/`, with: *"if `nomineeName` ever appears
    // on the INDEX contract, ruling 2 has landed and this file's guidance needs re-reading, ⛔ not
    // silently outliving it."* ⭐ It landed — `2026-09-07-205` cl.1, Trustee-ratified 2026-09-05 —
    // and this file's guidance IS re-read above.
    //
    // ⭐⭐ **THE SUCCESSOR PROPERTY, AND IT IS STRICTER THAN A NAME SCAN:** the field is present AND
    // it is **NULLABLE**. A non-nullable `nomineeName` would mean a drive whose claim carried no
    // bank details (6.8 AC3's absence signal) fails response serialization and 500s the page —
    // exactly the outage arm this whole file exists to keep off a public surface.
    const indexContract = readFileSync(
      join(repoRoot, 'packages/contracts/src/public-pages/sahyog-drive.ts'),
      'utf8',
    )
    expect(indexContract).toMatch(/nomineeName:\s*z\.string\(\)\.min\(1\)\.nullable\(\)/)
    // ⛔ AND ⛔ NO OTHER NOMINEE-BANK VALUE CAME WITH IT — `-190` cl.1 + `-191` cl.1 withdrew them,
    // and `-205` cl.9 authorises the NAME and ⛔ nothing else. Keys ABSENT, ⛔ never `null`.
    // ⚠ It matches a Zod FIELD DECLARATION (`name: z.…`), ⛔ not the bare word — the file's own
    // doc-blocks NAME these values in explaining that they may ⛔ not cross, and a substring scan
    // would fail on the prohibition itself.
    for (const banned of [
      /accountNumber\s*:\s*z\./,
      /accountNumberLast4\s*:\s*z\./,
      /ifsc\s*:\s*z\./i,
      /vpa\s*:\s*z\./i,
      /bankName\s*:\s*z\./,
      /branch\s*:\s*z\./,
    ]) {
      expect(indexContract).not.toMatch(banned)
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────────────────────────
// ⭐⭐ STORY 11b.19 — **B's UNSHIPPED HALF**: the §8.1 FIVE-PARAGRAPH MESSAGE BLOCK.
//
// ⚠⛔ **WHY A SECOND FAMILY EXISTS IN THIS NAMESPACE AT ALL.** B (`11b-12`, `done`) was routed BOTH
// the §9.2 **index line** and the §8.1 **message block** on 2026-09-05 and shipped ⛔ only the first.
// `2026-09-11-214` **Consequence 2** gave the unshipped half a named home ⇒ this is **B's work
// completing**, ⛔ not new scope ([[feedback_record_unattested_no_backfill]] — E's separate RENDER
// debt stays recorded against `11b-15` and is ⛔ NOT back-filled here).
//
// ⭐ The block is **PAGE-shaped** (§8.3(2)) — ⛔ it cannot sit in a one-line index cell. Its renders
// are `11b-17` **AC10 / Task 5d** (member) and `11b-20` (public); ⛔ NEITHER exists today.
// ────────────────────────────────────────────────────────────────────────────────────────────────

describe('⭐ AC1/AC2/AC3 — the ratified §8.1 message block is AUTHORED, verbatim, in both locales', () => {
  it('⭐ EN — the five paragraphs, §8.1 verbatim', () => {
    // ⚠⛔ TRAP 1 IS ASSERTED HERE, ⛔ not merely commented: §8.1 writes *"₹{amount}"*, but `{amount}`
    // arrives ALREADY FORMATTED and carries its own ₹ (`$comment.live_line`: *"Yes rupee sign should
    // appear"*; `$comment.drive_target`: *"Expected: ₹ 300"*) ⇒ a literal ₹ here ships **₹₹**.
    // ⭐ B's own `index_line.full`, same ratification, same day, carries ⛔ no literal ₹ either.
    expect(template('en', 'message_block.headline.full')).toBe(
      "Late {family_name}'s family received contributions of {amount} from colleagues.",
    )
    expect(template('en', 'message_block.solidarity')).toBe(
      'When one family needs support, the whole Pariwar stands with them. ' +
        'Because in Pariwar, we stand together.',
    )
    expect(template('en', 'message_block.gratitude')).toBe(
      'Our heartfelt gratitude to every colleague who stood beside the family.',
    )
    // ⚠⛔ THE DEVANAGARI TAGLINE STAYS DEVANAGARI IN THE ENGLISH COPY — ⭐ the Panel's own text,
    // ⛔ NOT an oversight, and ⛔ not ours to translate or transliterate. Asserted so a later
    // "consistency" pass cannot quietly anglicise it.
    expect(template('en', 'message_block.tagline')).toBe('सहयोग का हाथ, हर परिवार के साथ।')
    expect(template('en', 'message_block.join')).toBe('Join the Pariwar. Be the Movement.')
  })

  it('⭐ HI — the five paragraphs, §8.1 verbatim', () => {
    // ⚠⛔ `स्व.` (FULL STOP) IS §8.1's OWN SPELLING AND IS KEPT — ⭐ CHECKED, ⛔ not missed. B's
    // shipped `index_line.*` / `zero_line.*` use `स्व०` (the Devanagari abbreviation sign), and
    // `$comment.zero_line` calls that "the `index_line.*` convention". ⇒ the two DIVERGE, and the
    // story's own instruction settles which wins: *"⛔ do ⛔ not improve it, shorten it, **re-punctuate
    // it** or translate it"*. ⛔ Normalising `स्व.` → `स्व०` is precisely re-punctuating ratified text.
    // ⭐ RECORDED as a divergence for a future routing note, ⛔ never silently harmonised here
    // ([[feedback_supersede_never_reinterpret]]).
    expect(template('hi', 'message_block.headline.full')).toBe(
      'स्व. {family_name} जी के परिवार के लिए सहकर्मियों ने मिलकर {amount} का योगदान किया।',
    )
    expect(template('hi', 'message_block.solidarity')).toBe(
      'परिवार के हर सहकर्मी का सहयोग मायने रखता है। यही हमारी ताकत है।',
    )
    expect(template('hi', 'message_block.gratitude')).toBe(
      'परिवार के साथ खड़े होने वाले हर सहकर्मी का हम हृदय से आभार व्यक्त करते हैं।',
    )
    expect(template('hi', 'message_block.tagline')).toBe('सहयोग का हाथ, हर परिवार के साथ।')
    // ⚠⛔ [Review][Patch] CORRECTED 2026-09-12 (re-review) — A PRIOR PASS ADDED A REDUNDANT
    // `toContain('Pariwar')` HERE, REASONING IT WAS A MISSING "MIRROR" OF THE EN TAGLINE CHECK.
    // ⛔ THAT WAS A NO-OP: the exact-match `.toBe()` two lines below ALREADY fully pins this string
    // — any transliteration of "Pariwar" to परिवार changes the string and fails `.toBe()` on its
    // own, so a second `.toContain()` assertion on the same value adds zero detection power. ⭐ THE
    // ASYMMETRY THE ORIGINAL FINDING FLAGGED NEVER EXISTED: the EN tagline check above (`:283`) is
    // likewise a bare `.toBe()` exact match, with no additional `.toContain()` beside it either.
    // ⭐ Removed the no-op line rather than leave a redundant assertion in place
    // ([[feedback_supersede_never_reinterpret]] — the correction is recorded, not silently dropped).
    expect(template('hi', 'message_block.join')).toBe(
      'Pariwar से आज ही जुड़ें और इस आंदोलन का हिस्सा बनें।',
    )
  })

  it('⭐ AC2 — the table labels are `Nominee full name` | `District`, and they are LABELS', () => {
    // ⭐ §8.1: *"a table above the message — **Nominee full name** (left) · **District** (right)"*.
    // ⭐ The FULL form is ruled (`-205` cl.1) ⇒ the per-Pariwar `public_name_presentation_mode` has
    // ⛔ NO SUBJECT here.
    expect(template('en', 'message_block.table.nominee_name')).toBe('Nominee full name')
    expect(template('en', 'message_block.table.district')).toBe('District')

    // ⚠⛔⛔ **THE HINDI LABELS ARE THE ONE PLACE THE PANEL GAVE ⛔ NO HINDI — RECORDED, ⛔ NOT HIDDEN.**
    // §8.1 states the table in an English sentence only. ⚠ But the parity gate REQUIRES an HI key
    // (an absent one is a THROW at render, ⛔ not a fallback) ⇒ a value must exist.
    // ⭐ IT IS ⛔ NOT A DEV TRANSLATION: both nouns are the **Panel's own Hindi words for these exact
    // fields**, taken from §9.2's ratified HI index line — *"**जनपद** {district_name} में कार्यरत …
    // की **नॉमिनी** {nominee_name}"* — same routing note, same ratification, same day, same data.
    // ⇒ the only word not lifted from §9.2 is *"पूरा नाम"* (full name), which renders `-205` cl.1's
    // ruled FORM. ⭐ Asserted against B's shipped HI key below so the provenance cannot rot.
    expect(template('hi', 'message_block.table.nominee_name')).toBe('नॉमिनी का पूरा नाम')
    expect(template('hi', 'message_block.table.district')).toBe('जनपद')
    expect(template('hi', 'index_line.full'), 'the HI labels borrow §9.2s own two nouns').toContain(
      'नॉमिनी',
    )
    expect(template('hi', 'index_line.full')).toContain('जनपद')

    // ⚠⛔ TRAP 5 — THE COLUMN SAYS *"Nominee"* AND THE DATA ⛔ CANNOT PROMISE IT. The value behind it
    // is `account_holder_name_ciphertext`; 6.8's D1 removed the nominee linkage deliberately and
    // `D5-subject (i)` rules *"the SCHEMA is the authority"*. ⇒ ⛔ NO key in this family may assert a
    // RELATIONSHIP. A label names a column; a sentence makes a claim about a named private person.
    for (const locale of LOCALES) {
      for (const key of MESSAGE_BLOCK_KEYS) {
        expect(
          template(locale, key),
          `${locale}/${key} must ⛔ not assert the nominee RELATIONSHIP (Trap 5, §9.3, D5-subject)`,
        ).not.toMatch(/nominee of|की नॉमिनी|के नॉमिनी/)
      }
    }
  })

  it('⭐ AC3 — the no-name variant is §9.1 row 4 VERBATIM, and replaces the HEADLINE only', () => {
    // ⚠⛔ A SAFETY PROPERTY, ⛔ NOT A NICETY. `deceased_member_name` is nullable and `t()` THROWS ⇒
    // resolving `.full` on a drive with no publishable name 500s the WHOLE PAGE — and this block is
    // PAGE-shaped, so "the row" and "the page" are the same thing here. ⭐ Same structural reason B
    // shipped four `index_line.*` variants (`-214` Consequence 5).
    expect(template('en', 'message_block.headline.no_family')).toBe(
      'The family received contributions of {amount} from colleagues.',
    )
    expect(template('hi', 'message_block.headline.no_family')).toBe(
      'परिवार के लिए सहकर्मियों ने मिलकर {amount} का योगदान किया।',
    )

    // ⭐ AND THE OTHER FOUR PARAGRAPHS ARE NAME-FREE — which is WHY only the headline varies. If any
    // of them carried `{family_name}`, a nameless drive would need four more variants (or would
    // throw), and §10.2 ruling 3's "⛔ no combinatorial variants" would be unsatisfiable.
    for (const locale of LOCALES) {
      for (const key of [
        'message_block.solidarity',
        'message_block.gratitude',
        'message_block.tagline',
        'message_block.join',
      ]) {
        expect(template(locale, key)).not.toContain('{family_name}')
        expect(template(locale, key)).not.toContain('{')
      }
      expect(template(locale, 'message_block.headline.no_family')).not.toContain('{family_name}')
    }
  })

  it('⛔⛔ `{family_name}` is the ONLY omittable token — ⛔ there is ⛔ NO `no_amount` variant', () => {
    // ⚠⛔ THE QUESTION §10.2 RULING 3 INVITES, ANSWERED SO IT IS ⛔ NOT DISCOVERED. §9.1's
    // implementation note on blocker (1) did order B *"the copy and the **no-amount variants**"* —
    // ⚠ that was ORDERING AGAINST AN UNBUILT STORY D, and ⭐ D (`11b-14`) is `done` ⇒ the condition
    // it guarded is GONE. ⭐ B's own shipped precedent settles it and is ASSERTED, ⛔ not assumed:
    // every `index_line.*` variant carries `{amount}` (pinned above) — *"it is pending-on-D, ⛔ not
    // nullable"*. ⇒ an absent `{amount}` is ⛔ not a copy case; it is a render site that must ⛔ not
    // resolve at all.
    const raw = JSON.parse(
      readFileSync(join(repoRoot, `packages/i18n/locales/en/${NAMESPACE}.json`), 'utf8'),
    ) as Record<string, string>
    // ⚠⛔ [Review][Patch] CORRECTED 2026-09-12 (third pass) — THE RATIONALE FOR KEEPING THIS CHECK
    // WAS WRONG. It is ⛔ NOT the only one that names the offending key (the structural walk below's
    // own assertion message does that too). ⭐ THE REAL REASON: this grep runs over the WHOLE
    // `message_block.*` family, ⛔ not just `.headline.*` — it would catch a `no_amount` variant
    // minted under an ENTIRELY DIFFERENT key path (e.g. `message_block.table.no_amount`), which the
    // structural walk below cannot see because it only ever looks at `.headline.*` keys.
    expect(Object.keys(raw).filter((k) => /^message_block\..*no_amount/.test(k))).toEqual([])

    // ⚠⛔ [Review][Patch] THE NAMING CHECK ABOVE ONLY CATCHES A VARIANT SPELLED `no_amount` — ⭐ THE
    // STRUCTURAL GUARANTEE IS THE ONE THAT MATTERS. Walk every `message_block.headline.*` key that
    // EXISTS, however it is named, and require `{amount}` on every one of them. A future variant
    // that dropped `{amount}` under a different name (e.g. `.pending`) would pass the naming grep
    // above but fails HERE.
    //
    // ⚠⛔ [Review][Patch] CORRECTED 2026-09-12 (third pass) — TWO GAPS IN THE FIRST VERSION OF THIS
    // WALK, BOTH CLOSED: (1) it read `headlineKeys` from the EN file only and reused them for HI too
    // — a headline variant that existed in HI but not EN would never be walked at all; the two
    // locales' key sets are now UNIONED. (2) the filter required a `.` after `headline`, so a
    // (structurally wrong, but not impossible) bare `message_block.headline` key with no variant
    // suffix would silently skip this check; the filter now also matches that exact key.
    const hiRaw = JSON.parse(
      readFileSync(join(repoRoot, `packages/i18n/locales/hi/${NAMESPACE}.json`), 'utf8'),
    ) as Record<string, string>
    const isHeadlineKey = (k: string) =>
      k.startsWith('message_block.headline.') || k === 'message_block.headline'
    const headlineKeys = [
      ...new Set([...Object.keys(raw), ...Object.keys(hiRaw)].filter(isHeadlineKey)),
    ]
    for (const locale of LOCALES) {
      for (const key of headlineKeys) {
        expect(template(locale, key), `${locale}/${key} must carry {amount}`).toContain('{amount}')
      }
    }

    // ⚠⛔ AND ⛔ NO COMBINATORIAL FAMILY CREPT IN: the headline has exactly TWO variants, ⛔ never one
    // per combination of absent tokens (§10.2 ruling 3, `-214` Consequence 6).
    expect(headlineKeys).toHaveLength(2)
  })

  it('⛔⛔ ⛔ NO LITERAL ₹ ANYWHERE IN THE FAMILY — ⭐ `{amount}` carries its own (Trap 1)', () => {
    // ⭐ THE WHOLE TRAP, AS ONE ASSERTION. §8.1's typography would ship `₹₹ 19,45,000`.
    for (const locale of LOCALES) {
      for (const key of MESSAGE_BLOCK_KEYS) {
        expect(template(locale, key), `${locale}/${key} must ⛔ not carry a literal ₹`).not.toContain(
          '₹',
        )
      }
    }
  })

  it('⭐ AC7 — both locales carry the SAME key set and the SAME tokens per key', () => {
    // ⚠ A missing HI key is a THROW at render, ⛔ not a fallback. ⭐ This is the local half of CI's
    // `i18n-parity` job (`ci.yml:223` → `pnpm turbo run i18n:check-parity`), scoped to this family.
    const keysOf = (locale: string) =>
      Object.keys(
        JSON.parse(
          readFileSync(join(repoRoot, `packages/i18n/locales/${locale}/${NAMESPACE}.json`), 'utf8'),
        ) as Record<string, string>,
      )
        .filter((k) => k.startsWith('message_block.') && !k.startsWith('$comment'))
        .sort()

    expect(keysOf('hi')).toEqual(keysOf('en'))
    expect(keysOf('en')).toEqual([...MESSAGE_BLOCK_KEYS].sort())

    const tokensOf = (locale: string, key: string) =>
      (template(locale, key).match(/\{(\w+)\}/g) ?? []).sort()
    for (const key of MESSAGE_BLOCK_KEYS) {
      expect(tokensOf('hi', key), `token set must match across locales for ${key}`).toEqual(
        tokensOf('en', key),
      )
    }

    // ⚠ AND ⛔ NO EMPTY / WHITESPACE-ONLY VALUE — the parity script flags those too, so a placeholder
    // is ⛔ not a way past the gate.
    for (const locale of LOCALES) {
      for (const key of MESSAGE_BLOCK_KEYS) {
        expect(template(locale, key).trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('⛔⛔ AC6 — ⛔ NOTHING RENDERS THE MESSAGE BLOCK. The copy exists; the render may ⛔ not.', () => {
  it('⛔ NON-VACUOUS — the scan reaches a real body of source', () => {
    // ⛔ WITHOUT THIS, A GREEN SCAN PROVES NOTHING ([[feedback_gate_scope_semantic_coverage]]).
    expect(files.length).toBeGreaterThan(200)
  })

  it('⭐ `t()` THROWS on the dark block — the render is ⛔ structurally unavailable', () => {
    // ⭐⭐ THE PROOF OF DARKNESS, and it is POSITIVE: a story that renders the ratified block before
    // its tokens exist gets a LOUD failure (`resolver.ts:36-42`, the throw at `:39`), ⛔ never a page
    // with an empty ₹. ⚠ And on a PAGE-shaped block that failure IS the whole page.
    expect(() =>
      t('message_block.headline.full', undefined, { locale: 'en', namespace: NAMESPACE }),
    ).toThrow(/missing interpolation param 'family_name'/)
    expect(() =>
      t('message_block.headline.no_family', undefined, { locale: 'hi', namespace: NAMESPACE }),
    ).toThrow(/missing interpolation param 'amount'/)

    // ⭐ AND IT RESOLVES CLEANLY ONCE EVERY TOKEN IS SUPPLIED — so the copy itself is sound and
    // ⛔ "dark" ⛔ never excuses a broken string. ⚠ Note the output carries EXACTLY ONE ₹, which is
    // Trap 1 proven end-to-end rather than asserted about the template alone.
    const rendered = t(
      'message_block.headline.full',
      { family_name: 'R K Sharma', amount: '₹19,45,000' },
      { locale: 'en', namespace: NAMESPACE },
    )
    expect(rendered).toBe(
      "Late R K Sharma's family received contributions of ₹19,45,000 from colleagues.",
    )
    expect(rendered.match(/₹/g)).toHaveLength(1)

    expect(
      t(
        'message_block.headline.no_family',
        { amount: '₹19,45,000' },
        { locale: 'hi', namespace: NAMESPACE },
      ),
    ).toBe('परिवार के लिए सहकर्मियों ने मिलकर ₹19,45,000 का योगदान किया।')
  })

  it('⛔ a `message_block.*` key is resolved ⛔ ONLY where EVERY token is supplied', () => {
    // ⚠⛔⛔ **NARROWED 2026-09-13 (Story 11b.17, AC10 / Task 5d) — ⛔ NOT DELETED, ⛔ NOT WAIVED, AND
    // ⛔ NOT APPENDED TO ON THE STRENGTH OF A GREEN BUILD** ([[feedback_supersede_never_reinterpret]]).
    // ⭐ **ITS AUTHOR LEFT THE INSTRUCTION IN WRITING AND THIS IS IT, CARRIED OUT.** It read
    // *"⛔ ⛔ ZERO CONSUMERS — ⛔ no source file resolves a `message_block.*` key"*, with:
    // *"⭐ WHEN `11b-17` / `11b-20` LAND: they render these keys and this assertion becomes false BY
    // DESIGN. ⛔ Do ⛔ NOT delete it then — **NARROW it** to *'⛔ never resolved without every token
    // supplied'*, naming each authorised site, which is the property that actually protects the page."*
    //
    // ⭐⭐ **`11b-17` HAS LANDED — the MEMBER render (`-214` cl.4(b): *"`11b-17` carries the MEMBER
    // render — AC10 / Task 5d — and ⛔ nothing more"*). ⚠⛔ **`11b-20` (the PUBLIC render,
    // `-214` Consequence 3) HAS ⛔ NOT** — it is `ready-for-dev` and **HOMED, ⛔ not built**
    // ([[feedback_closure_language_precision]]) ⇒ ⛔ its render site is ⛔ **NOT** pre-authorised here,
    // and a second entry appearing in this list without its story is the exact defect this file exists
    // to catch.
    //
    // ⭐⭐ **THE SURVIVING PROPERTY IS THE ONE THAT MATTERS**: `t()` **THROWS** on an unsupplied
    // interpolation param (`resolver.ts:36-42`), and this block is **PAGE-shaped** (§8.3(2)) ⇒ a
    // resolution that does ⛔ not supply every token its string names is a **500 / outage arm on a
    // WHOLE PAGE**, ⛔ not a blank figure and ⛔ not one line. ⇒ every resolver must sit behind a
    // variant selector that **RETURNS EARLY** rather than resolving a key it cannot fill — including
    // its `null`, which means ⛔ **NO ratified variant fits** and the block renders ⛔ **NOTHING**
    // (`2026-09-08-207` cl.2's ₹0 silence; ⛔ there is ⛔ NO `no_amount` variant and ⛔ there must ⛔ not
    // be one).
    //
    // ⚠⛔ [Review][Patch] THE CLOSING QUOTE WAS DROPPED ON PURPOSE (2026-09-12). A render site is
    // ⛔ NOT obligated to spell the key as one bare literal — `` `message_block.headline.${variant}` ``
    // is exactly the shape `11b-17`/`11b-20` will plausibly write once they pick a variant at
    // runtime. Requiring a matched closing quote/backtick would let that consumer slip past
    // `AUTHORISED = []` undetected, so the pattern no longer demands the literal be fully closed —
    // ⚠ CORRECTED 2026-09-12 (re-review): `$` is deliberately INCLUDED in `[\w.$]`, ⛔ not a
    // terminator — it is what lets the match run up to and through the `$` of a `${` interpolation
    // opener; it is the UNQUOTED `{` immediately after that the character class excludes, which is
    // what actually stops the match there.
    const RESOLVER = /['"`]message_block\.[\w.$]+/
    const resolvers = files.filter((f) => {
      if (realpathSync(f) === OWN_FILE) return false
      return RESOLVER.test(readFileSync(f, 'utf8'))
    })

    // ⛔⛔ **THE ALLOW-LIST IS ⛔ NOT A WAIVER.** ⭐ It names the ⛔ ONE render site `-214` **cl.4(b)**
    // authorised — the MEMBER half, Story `11b-17` AC10 / Task 5d — so a **SECOND** one (another
    // package, another surface, or `11b-20`'s public render arriving early) still **FAILS here** and
    // must come back with its own ruling. ⛔ Do ⛔ not append to it to make a build green.
    // ⚠⛔ **TWO SOURCE FILES, ⛔ NOT ONE, AND BOTH ARE THE SAME RENDER SITE.** The variant SELECTORS
    // live in a plain `.ts` module because this repo has ⛔ **no RN mount harness** — the `.tsx`
    // cannot be imported by a test — so the pure logic was extracted where a test can CALL it. ⭐ That
    // split is the shipped idiom (`components/drive-list/format.ts` states it), ⛔ not a second
    // consumer, and the guard assertion below proves the `.tsx` resolves ⛔ only behind those
    // selectors.
    // ⭐⭐ **THE WALK IS NON-VACUOUS AND IT REACHES THIS STORY'S SURFACE** — ⛔ asserted HERE because
    // the test-module carve-out above is the one change that could silently shrink it. ⚠ A green
    // allow-list over a walk that no longer sees `apps/mobile` would prove ⛔ nothing.
    expect(files.length).toBeGreaterThan(200)
    expect(files.some((f) => f.endsWith('/apps/mobile/components/drive-detail/MemberDriveDetail.tsx'))).toBe(true)
    expect(files.some((f) => f.endsWith('/apps/public/src/pages/sahyog.astro'))).toBe(true)
    // ⛔ And the carve-out really is scoped to TEST MODULES — ⛔ not to whole `tests/` trees.
    expect(files.some((f) => f.includes('/tests/') && !/\.(test|spec)\.tsx?$/.test(f))).toBe(true)

    const AUTHORISED = [
      '/apps/mobile/components/drive-detail/MemberDriveDetail.tsx',
      '/apps/mobile/components/drive-detail/format.ts',
    ]
    expect(
      resolvers.map((f) => f.replace(repoRoot, '')).sort(),
      'a file RESOLVES a ratified message-block key. ⛔ t() THROWS on an unsupplied token ' +
        '(resolver.ts:36-42) ⇒ an unguarded resolution ships a 500 / outage arm onto a PAGE-shaped ' +
        'block — the WHOLE page, ⛔ not one line. ⭐ `2026-09-11-214` cl.4(b) authorised exactly ONE ' +
        'render site: the MEMBER half, Story 11b-17 AC10 / Task 5d. ⚠⛔ The PUBLIC half is 11b-20 ' +
        '(Consequence 3) and it is HOMED, ⛔ NOT built — ⛔ its site is ⛔ not pre-authorised here.',
    ).toEqual(AUTHORISED)

    // ⭐⭐ **AND THE GUARD IS ASSERTED, ⛔ NOT ASSUMED** — the shape story D's narrowing of the
    // `index_line.*` fence set above, applied to this family.
    // ⚠⛔ A green allow-list proves ⛔ only WHERE the keys are resolved; it proves ⛔ nothing about
    // whether the render can supply their tokens ([[feedback_gate_scope_semantic_coverage]] — a scan
    // that asserts nothing about MEANING is a scan that passes while the page 500s).
    const selectors = readFileSync(
      join(repoRoot, '/apps/mobile/components/drive-detail/format.ts'.slice(1)),
      'utf8',
    )
    const render = readFileSync(
      join(repoRoot, '/apps/mobile/components/drive-detail/MemberDriveDetail.tsx'.slice(1)),
      'utf8',
    )
    // ⭐ (2) THE VARIANT IS CHOSEN ON NULLABILITY, and the selector RETURNS EARLY rather than
    // resolving a key with an unsupplied `{family_name}`.
    expect(selectors).toMatch(/deceasedMemberName === null\)\s*return \{ key: 'message_block\.headline\.no_family' \}/)
    // ⭐ (3) THERE IS ⛔ NO `no_amount` VARIANT — where the amount is unavailable the block renders
    // NOTHING (`2026-09-08-207` cl.2). ⛔ The selector's `null` IS that rule.
    expect(selectors).toMatch(/amountRaisedInr <= 0\)\s*return null/)
    expect(template('en', 'message_block.headline.no_family')).not.toContain('{family_name}')
    // ⭐ The render site consults the selector and returns early on its `null` — ⛔ it never resolves a
    // headline it cannot fill.
    expect(render).toContain('selectMessageBlockHeadline')
    expect(render).toMatch(/messageHeadline === null \? null :/)
    // ⭐ (1) `{amount}` ARRIVES ALREADY FORMATTED AND CARRIES ITS OWN ₹ ⇒ ⛔ the render site adds ⛔ no
    // literal one. ⚠ Asserted on the render source because the TEMPLATE is already pinned above.
    expect(render).not.toMatch(/['"`]₹\{?\s*\$\{?\s*amount/)
    // ⭐ (4) AN ABSENT `district` DROPS ITS COLUMN — ⛔ never a placeholder, and ⛔ never left attached
    // to the nominee when the DECEASED is absent (`-214` Consequence 6; B's own `no_family` coupling).
    expect(selectors).toMatch(
      /district !== null && detail\.deceasedMemberName !== null/,
    )
  })

  it('⛔ AC6 — ⛔ nothing else moved: this story ships KEYS and ⛔ no contract field', () => {
    // ⚠⛔ THE TABLE IS ⛔ NOT A WIRE CHANGE. Its two values already exist on the drive-page contract —
    // the nominee's name (`-205` cl.1, shipped by D) and `district`, which is `.nullable()`. ⇒ this
    // story adds ⛔ NO field, and asserting that keeps a later pass from "completing" the table by
    // widening a public contract without a ruling.
    const vivran = readFileSync(
      join(repoRoot, 'packages/contracts/src/public-pages/sahyog-vivran.ts'),
      'utf8',
    )
    // ⭐ Navigate by the FIELD DECLARATION, ⛔ never by a line number — it has moved :322 → :344 → :349.
    expect(vivran).toMatch(/district:\s*z\.string\(\)\.min\(1\)\.nullable\(\)/)
    // ⇒ ⭐ AC4's consequence: an absent District DROPS ITS COLUMN. ⛔ Never "Not recorded", ⛔ never a
    // placeholder — and ⭐ never left attached to a nominee when the DECEASED is absent, because
    // *"who served in … district"* modifies the DECEASED MEMBER (B's own `no_family` reasoning,
    // asserted for `index_line.*` above and governing this table by the SAME logic).
    expect(template('en', 'message_block.table.district')).not.toMatch(/not recorded/i)
  })
})
