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

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { t } from '../src/index.js'

const NAMESPACE = 'sahyog-shared'
const LOCALES = ['en', 'hi'] as const
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

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
  const SCAN_ROOTS = ['apps', 'packages'].map((d) => join(repoRoot, d))
  const SKIP = new Set(['node_modules', 'dist', '.turbo', 'ios', 'android', '.astro'])

  function sources(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry)) continue
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) sources(full, acc)
      else if (/\.(ts|tsx|astro)$/.test(entry)) acc.push(full)
    }
    return acc
  }

  const files = SCAN_ROOTS.flatMap((r) => sources(r))

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

  it('⛔ ⛔ NO source file resolves an `index_line.*` key', () => {
    // ⭐ WHEN STORY D LANDS: D renders these keys and this assertion becomes false BY DESIGN.
    // ⛔ Do ⛔ not delete it then — NARROW it to *"⛔ never rendered without both tokens supplied"*,
    // which is the property that actually protects the page.
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8')
      // ⚠ Skip THIS file and the locale-scanning tests, which name the keys as DATA, ⛔ not as a
      // resolved call.
      if (f.endsWith('sahyog-shared-dark-copy.test.ts')) return false
      return /['"`]index_line\.[a-z_]+['"`]/.test(src)
    })
    expect(
      offenders.map((f) => f.replace(repoRoot, '')),
      'these files RESOLVE a dark index-line key. ⛔ {amount} and {nominee_name} are ⛔ NOT on ' +
        'any public wire yet (story D — 11b-14 AC7 / Task 8), and t() THROWS on an unsupplied ' +
        'token (resolver.ts:36-42) ⇒ this would ship a 500 / outage arm onto a live public page, ' +
        'not a silently-blank rupee figure or a dangling "nominee of".',
    ).toEqual([])
  })

  it('⚠ the tokens are ⛔ not on any public wire yet — the reason the lines stay dark', () => {
    // ⭐ Checked rather than asserted in prose: if `nomineeName` ever appears on the INDEX contract,
    // ruling 2 has landed and this file's guidance needs re-reading, ⛔ not silently outliving it.
    const indexContract = readFileSync(
      join(repoRoot, 'packages/contracts/src/public-pages/sahyog-drive.ts'),
      'utf8',
    )
    expect(indexContract).not.toMatch(/nomineeName|nominee_name/)
  })
})
