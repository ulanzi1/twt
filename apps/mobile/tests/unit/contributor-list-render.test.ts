// The mobile <PoolContributorList> render fence — Story 11b.2b (Task 5; AC1–AC7, AC9, AC10).
// DB-free, RN-render-free.
//
// ⛔ THERE IS NO RN MOUNT HARNESS IN apps/mobile, AND THIS STORY DOES NOT STAND ONE UP. No
// `@testing-library/react-native`, no `react-test-renderer`; all `tests/unit/**` files are source scans
// (the `status-pill-render.test.ts:1-18` precedent, and Story 9.6's Dev Note in terms). Comments are
// STRIPPED before scanning (the 8.11 false-negative fix) so a ban can never be satisfied by prose.
//
// A source scan, but DRIVEN BY THE REAL PRESENTER where a behavioural claim is at stake: the
// exhaustiveness block below calls `deriveContributionRowViewModel` for real, so it fails if the row
// taxonomy grows and this render layer does not keep up.
//
// ⛔⛔ WHAT THIS HARNESS CANNOT PROVE IS RECORDED IN THE STORY AS UN-ATTESTED, NOT ASSERTED HERE:
//   · a real screen-reader announcement (no device, no accessibility tree);
//   · a real `t()` resolution at the mobile call site (no mount).
// Story 11b.2's AC2 owns the ten-key ref-resolution proof against `@twt/i18n` in BOTH locales. ⛔ This
// file writes NO second i18n ref test (D12-refscope(a)); it scans its OWN call sites instead.

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { deriveContributionRowViewModel, type ContributionRowInput } from '@twt/ui'
import { describe, expect, it } from 'vitest'

import { toContributionRowInput } from '../../components/contributor-list/contribution-row-input'

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')

/**
 * Strip `//` and block comments with a real string-AND-regex-aware scanner.
 *
 * ⭐ TWO defects have been fixed here, each of which silently DISARMED every fence below it:
 *   1. (first code review) the original two-regex version had no notion of string literals, so a `//`
 *      inside a quoted string (a URL) deleted the rest of that line;
 *   2. (second code review) the string-aware replacement had no notion of REGEX LITERALS, so the
 *      trailing `\/` `/` of a pattern like `/^https:\/\//` was read as a line-comment opener and
 *      everything after it on that line vanished from every scan.
 *
 * ⚠⛔ KNOWN REMAINING LIMITATION, RECORDED RATHER THAN FAKED ([[feedback_record_unattested_no_backfill]]):
 * this is a lexer, ⛔ not a JSX parser. An apostrophe in JSX *text* (`<Text>Don't</Text>`) still opens a
 * phantom string state.
 * ⛔⛔ **THIS BLOCK USED TO SAY THAT DIRECTION "CANNOT HIDE A VIOLATION". THAT WAS WRONG, AND WRONG IN
 * THE DANGEROUS DIRECTION** (corrected at the third code review, reproduced before correcting). When
 * the scanner enters a phantom string it STOPS STRIPPING, so comment PROSE survives into the scanned
 * text — and every POSITIVE fence here (`toMatch`, `.toBe(true)`, ~20 of them) can then be satisfied by
 * a comment instead of by code. That is a FALSE GREEN. Negative fences over-report (false red) at the
 * same time. ⭐ Both parities are live; ⛔ neither is safe.
 * ⚠ None of the scanned files contains a trigger today — verified, ⛔ not assumed.
 * Closing it properly needs a real parser; ⛔ do not paper over it with another regex.
 */
// ⛔⛔ `<` and `>` are DELIBERATELY ABSENT from this set, and removing them is load-bearing: these files
// are TSX, so `</Text>` would otherwise read as a regex opener and swallow the rest of the tree — which
// is exactly what happened when this scanner was first written (caught by AC5(4) going red).
// The cost is that a regex literal directly after a comparison or an arrow (`=> /re/`) is read as
// division; harmless here, because it only means the scanner does not enter regex mode.
// ⚠ `+ - * % ~ ^` REMOVED at the third code review: `prevSignificant` is a single character, so
// `done++ / total` presents `+` and opened phantom regex mode, which then retains comment prose
// verbatim to the next `/` — a FALSE GREEN for every positive fence. Regex literals essentially never
// follow an arithmetic operator in this codebase; division after one is common.
const REGEX_MAY_START_AFTER = /[([{,;:=!&|?]/
const KEYWORD_BEFORE_REGEX =
  /(^|[^\w$])(return|typeof|instanceof|case|in|of|do|else|yield|await|void|delete)\s*$/

const stripComments = (src: string): string => {
  let out = ''
  let quote: string | null = null
  let inLineComment = false
  let inBlockComment = false
  let inRegex = false
  let inRegexClass = false
  let prevSignificant = ''
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    const next = src[i + 1]
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        out += ch
      }
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i += 1
      }
      continue
    }
    if (inRegex) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i += 1
      } else if (ch === '[') {
        inRegexClass = true
      } else if (ch === ']') {
        inRegexClass = false
      } else if (ch === '/' && !inRegexClass) {
        inRegex = false
        prevSignificant = '/'
      }
      continue
    }
    if (quote) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i += 1
      } else if (ch === quote) {
        quote = null
        prevSignificant = ch
      }
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ch
      prevSignificant = ch
      continue
    }
    // Comment openers are checked BEFORE the regex opener, deliberately: `//` is never a valid empty
    // regex and `/*` never a valid pattern start, so there is no ambiguity to resolve in the other order.
    if (ch === '/' && next === '/') {
      inLineComment = true
      i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true
      i += 1
      continue
    }
    if (
      ch === '/' &&
      (prevSignificant === '' || REGEX_MAY_START_AFTER.test(prevSignificant) || KEYWORD_BEFORE_REGEX.test(out))
    ) {
      inRegex = true
      inRegexClass = false
      out += ch
      prevSignificant = '/'
      continue
    }
    out += ch
    if (!/\s/.test(ch)) prevSignificant = ch
  }
  return out
}

const COMPONENT = 'apps/mobile/components/contributor-list/PoolContributorList.tsx'
const ADAPTER = 'apps/mobile/components/contributor-list/contribution-row-input.ts'
const ROUTE_SITE = 'apps/mobile/app/(contribution)/contributors.tsx'
const CONSOLE_SITE = 'apps/mobile/components/nominee-console/NomineeConsole.tsx'
// ⭐ The sibling hook that FETCHES these rows. Added at the second code review: it was in ⛔ NO scanned
// set, and it was carrying a stale "Epic 9's producer is unbuilt" claim as the stated justification for
// the poll design — one file away from an AC that exists to correct exactly that claim.
const HOOK = 'apps/mobile/components/contributor-list/usePoolContributorsQuery.ts'

const component = stripComments(read(COMPONENT))
const adapter = stripComments(read(ADAPTER))
// ⚠ No stripped `hook` binding: the two fences that read it want DIFFERENT views — the AC10 stale-claim
// scan needs the RAW source (the claims are comments; stripping them would make it vacuous), and the
// death-term fence strips per-site inside its own loop.

/** The `renderableRows = useMemo(...)` derivation block, balanced-brace extracted. The per-row guard
 *  lives HERE and ⛔ not in `renderItem` — asserting against this slice is what makes the guard's
 *  contents checkable instead of matched loosely across the whole file. */
// ⚠⚠ STRING-AWARE since the third code review. It counted BARE brackets, so a single unbalanced one
// inside any string literal in the region truncated the slice SILENTLY — and the likeliest place to
// acquire one is the natural-language `console.warn` diagnostic the same patch added. A short slice
// re-widens FENCE 1 back to the whole-file matching it was written to stop, with no test going red.
// ⭐ The other two lexers here were hardened and this one was not; that inconsistency WAS the bug.
const balancedFrom = (src: string, opener: RegExp, open: string, close: string): string => {
  const m = opener.exec(src)
  if (!m) return ''
  let depth = 0
  let quote: string | null = null
  for (let i = m.index; i < src.length; i += 1) {
    const ch = src[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      continue
    }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return src.slice(m.index, i + 1)
    }
  }
  return src.slice(m.index)
}
/** The `depth` nearest JSX opening tags enclosing `idx`, concatenated. Structural — ⛔ NOT a character
 *  window: it walks ELEMENTS, so it cannot be satisfied by a role on some unrelated node that merely
 *  happens to sit within N characters. Depth 2 because RN's announced unit here is legitimately the
 *  CONTAINER (`<YStack accessibilityRole="text"><Text>{copy}</Text></YStack>`) — asserting only the
 *  innermost tag would demand a role on a node that must not carry one. */
const enclosingOpenTags = (src: string, idx: number, depth = 2): string => {
  const tags: string[] = []
  let cursor = idx
  for (let n = 0; n < depth; n += 1) {
    const lt = src.lastIndexOf('<', cursor)
    if (lt === -1) break
    const gt = src.indexOf('>', lt)
    if (gt !== -1) tags.push(src.slice(lt, gt + 1))
    cursor = lt - 1
  }
  return tags.join(' ')
}

const derivationBlock = balancedFrom(component, /const renderableRows = useMemo\(/, '(', ')')
const renderItemBlock = balancedFrom(component, /const renderItem = useCallback\(/, '(', ')')

// ─── The scanner that every fence below depends on ──────────────────────────────────────────────────

describe('stripComments — the helper that can silently disarm every fence in this file', () => {
  // ⭐ ADDED at the second code review. This helper has now been WRONG TWICE (no string awareness, then
  // no regex awareness), and each time it failed OPEN: it deleted real code, so a banned pattern on the
  // same line became invisible and the fence went green over a violation. Nothing tested it either time.
  it('strips a line comment', () => {
    expect(stripComments('const a = 1 // drop me\nconst b = 2')).toContain('const b = 2')
    expect(stripComments('const a = 1 // drop me\nconst b = 2')).not.toContain('drop me')
  })

  it('strips a block comment without eating the code around it', () => {
    expect(stripComments('const a = /* gone */ 1')).toBe('const a =  1')
  })

  it('does NOT treat a // inside a string literal as a comment (first-review defect)', () => {
    const src = `const url = 'https://example.test' \nconst banned = 'deceased'`
    expect(stripComments(src)).toContain('deceased')
  })

  it('does NOT treat the trailing slashes of a REGEX literal as a comment (second-review defect)', () => {
    // ⚠ The banned token must sit on the SAME LINE as the regex: the defect deletes only to end-of-line,
    // so a fixture that puts it on the next line passes even with the bug present (caught by mutation).
    const src = `const ok = /^https:\\/\\//.test(u); const banned = 'deceased'`
    const out = stripComments(src)
    expect(out, 'the text after a regex ending in \\/\\/ was deleted from the scan').toContain('deceased')
  })

  it('keeps a JSX closing tag intact — </Text> is not a regex opener', () => {
    const src = '<Text accessibilityRole="text">hello</Text>\nconst banned = 1'
    const out = stripComments(src)
    expect(out).toContain('accessibilityRole="text"')
    expect(out).toContain('const banned = 1')
  })

  it('does NOT open regex mode after a postfix increment — `done++ / total` is division', () => {
    // ⚠ Third code review: `+`/`-` were in the opener set and `prevSignificant` is ONE character, so
    // `done++ / total` entered phantom regex mode and every comment after it survived the strip —
    // a FALSE GREEN for every positive fence, not merely a false red.
    const src = `const pct = done++ / total // gone\nconst banned = 'deceased'`
    const out = stripComments(src)
    expect(out, 'the comment after a postfix-increment division survived').not.toContain('gone')
    expect(out).toContain('deceased')
  })

  it('survives an escaped quote inside a string', () => {
    expect(stripComments(`const a = 'it\\'s' // gone`)).not.toContain('gone')
  })
})

describe('balancedFrom — the extractor five fences anchor on', () => {
  // ⭐ ADDED at the third code review. It was introduced WITHOUT tests and WITHOUT string awareness
  // while `stripComments` and `splitTopLevelArgs` were both hardened — and a silently-short slice
  // re-widens FENCE 1 to whole-file matching with nothing going red.
  it('extracts a balanced region', () => {
    expect(balancedFrom('x const a = f(1, g(2)) y', /const a = f\(/, '(', ')')).toBe('const a = f(1, g(2))')
  })

  it('is not truncated by an unbalanced bracket inside a string literal', () => {
    const src = `const a = f('row dropped :(', 2) tail`
    expect(balancedFrom(src, /const a = f\(/, '(', ')')).toBe(`const a = f('row dropped :(', 2)`)
  })

  it('is not run to EOF by a stray opener inside a string literal', () => {
    const src = `const a = f("see note (", 2) tail`
    expect(balancedFrom(src, /const a = f\(/, '(', ')')).toBe(`const a = f("see note (", 2)`)
  })

  it('returns empty when the opener is absent — callers assert on that', () => {
    expect(balancedFrom('nothing here', /const zzz = q\(/, '(', ')')).toBe('')
  })
})

// ─── AC1 + AC9 — the presenter is consumed, the inline label is GONE, the adapter exists ─────────────

describe('AC1 — <PoolContributorList> derives row content from the @twt/ui presenter', () => {
  it('imports deriveContributionRowViewModel from @twt/ui', () => {
    expect(component).toMatch(/import\s*\{[^}]*\bderiveContributionRowViewModel\b[^}]*\}\s*from\s*'@twt\/ui'/)
  })

  it('calls the presenter in the memoized derivation block, NOT in renderItem', () => {
    // ⚠ RETITLED at the second code review. The first review's patch moved the derive OUT of
    // `renderItem` into a component-body memo — an improvement — but this test kept a name that
    // asserted the opposite and an assertion (`/deriveContributionRowViewModel\s*\(/`) that checked
    // only that the identifier appears SOMEWHERE in the file.
    expect(derivationBlock, 'no `renderableRows = useMemo(...)` block found').not.toBe('')
    expect(derivationBlock).toMatch(/deriveContributionRowViewModel\s*\(/)
    expect(
      /deriveContributionRowViewModel\s*\(/.test(renderItemBlock),
      'renderItem derives per row again. Derivation belongs in the memo, computed once per data change.',
    ).toBe(false)
  })

  it('DELETES the inline contributorLabel() — it is not left beside the presenter', () => {
    expect(
      /\bcontributorLabel\b/.test(component),
      'contributorLabel() still exists in PoolContributorList.tsx. AC1 deletes it; the display name now ' +
        'comes from the presenter view-model, not from a second local composer.',
    ).toBe(false)
  })

  it('DELETES the local ConfirmedRow type-shadow (D10(a))', () => {
    expect(
      /\bConfirmedRow\b/.test(component),
      'The local `interface ConfirmedRow` is still declared or referenced. D10(a) deletes it: the ' +
        'contract file itself forbids type-shadowing (pool-contributor-list.ts:14).',
    ).toBe(false)
  })

  it('types against @twt/contracts ConfirmedContributorRow, type-only', () => {
    expect(component).toMatch(
      /import\s+type\s*\{[^}]*\bConfirmedContributorRow\b[^}]*\}\s*from\s*'@twt\/contracts'/,
    )
  })
})

describe('AC1 / Trap 1 — the presenter throw is GUARDED, per row, so one bad row cannot red-box the list', () => {
  it('wraps the derive call in a try/catch that returns null — scoped to the derivation block', () => {
    // ⚠ TIGHTENED at the second code review. The previous regex was lazy-quantified across the WHOLE
    // file (`try {` … derive … `} catch` … `return null`), so a `try` in one function, the derive in a
    // second and an unrelated `catch { return null }` in a third would have satisfied it. It is now
    // anchored to the extracted derivation block.
    const guarded = /try\s*\{[\s\S]*?deriveContributionRowViewModel\s*\([\s\S]*?\}\s*catch\s*(\([^)]*\))?\s*\{[\s\S]*?return\s+null/
    expect(
      guarded.test(derivationBlock),
      'deriveContributionRowViewModel is not wrapped in a try/catch that returns null. The presenter ' +
        'THROWS by ruling (11b.2 D8(a)) and this feeds a FlashList — an unguarded throw red-boxes the ' +
        'WHOLE list (Trap 1).',
    ).toBe(true)
  })

  // ⭐⭐ THE TWO FENCES THE FIRST CODE REVIEW OWED AND DID NOT WRITE. Both of its headline patches were
  // MUTATION-PROVEN unmechanized at the second review: reverting the branch condition left 397/397
  // green, and moving the a11y `t()` back outside the try left 55/55 green. A fix nothing asserts is a
  // fix that ships out again on the next refactor ([[feedback_mechanization_split_commitment]]).
  it('FENCE 1 — the a11y t() call is INSIDE the guard, not after it', () => {
    const tryBody = /try\s*\{([\s\S]*?)\}\s*catch/.exec(derivationBlock)
    expect(tryBody, 'no try/catch found in the derivation block').not.toBeNull()
    expect(
      /\bt\(/.test(tryBody![1]),
      'The row a11y `t()` call is not inside the try block. `t()` THROWS on a key miss ' +
        '(resolver.ts:64) and on a missing {name} param (resolver.ts:39), so resolving the label ' +
        'outside the guard reinstates exactly the unguarded throw the guard exists to catch.',
    ).toBe(true)
    expect(
      /rowA11y\.ref\.key/.test(tryBody![1]),
      'the presenter-driven a11y key is resolved outside the guard',
    ).toBe(true)
  })

  it('FENCE 2 — the empty branch triggers on NO RENDERABLE ROW, not just on an empty wire array', () => {
    expect(
      /hasRenderableRow/.test(component),
      'The list-vs-empty branch no longer consults `hasRenderableRow`. With only `confirmedRows.length` ' +
        'deciding, a total derivation failure over a NON-empty response mounts a FlashList containing ' +
        'nothing but null rows — a blank surface with no empty-state copy and no error.',
    ).toBe(true)
    // ⭐⭐ ADDED at the third code review. The assertion above checks only that the IDENTIFIER appears,
    // so `const hasRenderableRow = confirmedRows.length > 0` — the EXACT defective semantics this
    // fence's own message describes — passed it green. A fence that names a defect and then does not
    // assert against it is decoration. The binding must derive from the DERIVED rows.
    const binding = /const hasRenderableRow\s*=([\s\S]*?)\n\s*(?:const|\/\/|return|$)/.exec(component)
    expect(binding, 'no `hasRenderableRow` binding found').not.toBeNull()
    expect(
      /renderableRows/.test(binding![1]),
      '`hasRenderableRow` does not derive from `renderableRows`. It must reflect rows that ACTUALLY ' +
        'DERIVED, never the raw wire count — that is the whole defect this fence exists for.',
    ).toBe(true)
    const branch = /\{([^?]*)\?\s*\(\s*<YStack[^>]*>\s*<Text[^>]*>\s*\{t\('contributor_list\.empty'/.exec(component)
    expect(branch, 'the empty-state branch condition could not be located').not.toBeNull()
    expect(
      /hasRenderableRow/.test(branch![1]),
      'The empty-state branch condition does not mention hasRenderableRow.',
    ).toBe(true)
  })

  it('FENCE 3 — the derivation is memoized, and t() is not a dependency (it would defeat the memo)', () => {
    expect(component).toMatch(/const renderableRows = useMemo\(/)
    expect(component).toMatch(/const renderItem = useCallback\(/)
    // ⚠ The guard used to REQUIRE a trailing comma (`/\]\s*,\s*\)\s*$/`) — stricter than the extractor
    // beneath it, so flipping Prettier to `trailingComma: 'es5'`, or letting the memo fit on one line,
    // red-lined a behavioural fence over a formatting config. The comma is optional now.
    const deps = /\[([^\]]*)\]\s*,?\s*\)\s*$/.exec(derivationBlock.trim())
    expect(deps, 'no dependency array found on the renderableRows memo').not.toBeNull()
    expect(
      /\blocale\b/.test(deps![1]),
      'The memo does not depend on `locale`. `useT()` returns a fresh closure every render, so `locale` ' +
        'is the real input; without it the list would not re-derive on a locale switch.',
    ).toBe(true)
    expect(
      /(^|[^.\w])t\s*(,|\]|$)/.test(deps![1].trim()),
      'The memo lists `t` as a dependency. `useT()` returns a NEW closure on every render ' +
        '(packages/i18n/src/react.ts:56-58), so listing it recomputes every row on every render and ' +
        'defeats the memo entirely — the class recorded at PanchayatNoticeboard.tsx:98.',
    ).toBe(false)
  })

  it('FENCE 4 — a dropped row is not silent', () => {
    // ⚠ TIGHTENED at the third code review: this was `console.warn` OR `__DEV__`, so an UNGATED
    // production log satisfied it — on a surface whose whole subject is PII shielding. Both halves are
    // now required, and the gate must be the `typeof`-safe form: a bare `__DEV__` read is a
    // ReferenceError wherever Metro has not injected the global, and it sits in a CATCH, so it would
    // escape the per-row guard and red-box the surface (shipped by the second review, caught by the third).
    expect(
      /isDevBuild\(\)|typeof __DEV__ !== 'undefined'/.test(derivationBlock),
      'The dev diagnostic is not gated by the typeof-safe helper. A bare `__DEV__` read throws a ' +
        'ReferenceError outside Metro, and this call site is inside the catch — it would escape the guard.',
    ).toBe(true)
    expect(
      /console\.warn/.test(derivationBlock),
      'The per-row catch swallows the failure with no signal. Because `confirmed` and the aggregate ' +
        'figures legitimately diverge for an RTBF omission (D5), a render failure would be ' +
        'indistinguishable from a lawful erasure with nothing left to tell them apart.',
    ).toBe(true)
    expect(
      /firstName|lastInitial|\blabel\b/.test(/catch[\s\S]*$/.exec(derivationBlock)?.[0] ?? ''),
      'The diagnostic in the catch references member name data. The signal is the ACTION, never the ' +
        'subject — no member data may reach a log.',
    ).toBe(false)
  })

  it('does NOT branch on an anonymized kind (11b.2a D5 + D6(a) — no such row is ever emitted)', () => {
    expect(/anonymized/i.test(component)).toBe(false)
  })

  it('does NOT resolve member.anonymousMember (its subject cannot exist)', () => {
    expect(/anonymousMember/.test(component)).toBe(false)
  })

  it('writes NO render arm for the unknown kind — the try/catch IS its handling (D8(a))', () => {
    expect(/['"]unknown['"]/.test(component)).toBe(false)
  })
})

describe('AC9 — the wire→presenter adapter (routed here BY NAME by Story 11b.2)', () => {
  it('exists as its own module and is imported by the component', () => {
    expect(component).toMatch(/from\s*'\.\/contribution-row-input'/)
  })

  it('takes the contract row type-only from @twt/contracts (D10(a))', () => {
    expect(adapter).toMatch(
      /import\s+type\s*\{[^}]*\bConfirmedContributorRow\b[^}]*\}\s*from\s*'@twt\/contracts'/,
    )
  })

  it('returns the presenter input type, imported type-only from @twt/ui', () => {
    expect(adapter).toMatch(/import\s+type\s*\{[^}]*\bContributionRowInput\b[^}]*\}\s*from\s*'@twt\/ui'/)
  })

  it('re-nests the flat name fields under displayName as the ONE input kind', () => {
    expect(adapter).toMatch(/kind:\s*'name'/)
    expect(adapter).toMatch(/firstName/)
    expect(adapter).toMatch(/lastInitial/)
  })

  it('splices the RESPONSE-level pool letter code onto each row', () => {
    expect(adapter).toMatch(/poolLetterCode/)
  })

  it('supplies NO rowKey — D5 vacated it and no value may be invented to satisfy a type', () => {
    expect(
      /\browKey\b/.test(adapter) || /\browKey\b/.test(component),
      'rowKey appears in the render layer. 11b.2a D5 vacated it, it ships in neither @twt/ui interface, ' +
        'and AC9(3) forbids inventing a value for it.',
    ).toBe(false)
  })

  it('JOINS NOTHING — the name FORM is unruled (11b.2 D9(a)); the adapter re-shapes only', () => {
    // ⭐ WIDENED at the second code review: the old pair of alternatives required a `+`/backtick right
    // after `firstName`, or whitespace right after a `${…firstName…}` interpolation — so a join on ANY
    // other delimiter (`[a, b].join('.')`, `` `${row.firstName}-${row.lastInitial}` ``, `.concat(`)
    // ruled the name form and passed green.
    // ⚠ RE-CUT at the third code review. The previous helper failed ANY line containing both
    // identifiers — a FORMATTING property, not a composition one. The adapter's whole job is to put
    // both parts in one object literal, and collapsing it to a single line (86 chars, under Prettier's
    // printWidth 100) would have red-lined a pure reflow with a message about a governance ruling.
    // What actually rules the name form is putting both parts in ONE STRING: a template literal
    // mentioning both, a `+` concatenation, or a `.join()`/`.concat()`.
    const templateJoinsBoth = (adapter.match(/`[^`]*`/g) ?? []).some(
      (lit) => /firstName/.test(lit) && /lastInitial/.test(lit),
    )
    expect(
      /firstName\s*\}?\s*\+|\+\s*\w*\.?lastInitial/.test(adapter) ||
        /\.(join|concat)\s*\(/.test(adapter) ||
        templateJoinsBoth,
      'The adapter composes firstName and lastInitial. It must re-shape only — joining the parts would ' +
        'RULE the name form, the exact question D7-nameform(a) routes to the Trustee Panel.',
    ).toBe(false)
  })

  it('actually invoked: re-shapes a real wire row into the exact presenter input (not just source-matched)', () => {
    // Every other assertion in this describe block regex-scans the adapter's SOURCE TEXT — a subtly
    // wrong implementation containing the right substrings (swapped fields, wrong nesting) would still
    // pass all of them. This is the one assertion that imports and calls the function for real.
    const result = toContributionRowInput({ firstName: 'Reena', lastInitial: 'S' }, 'F')
    expect(result).toEqual({
      displayName: { kind: 'name', firstName: 'Reena', lastInitial: 'S' },
      poolLetterCode: 'F',
    })
  })

  it('actually invoked: an empty lastInitial is re-shaped as-is, not coerced or dropped', () => {
    const result = toContributionRowInput({ firstName: 'Amit', lastInitial: '' }, 'B')
    expect(result.displayName).toEqual({ kind: 'name', firstName: 'Amit', lastInitial: '' })
  })

  // ⭐ ADDED at the second code review: the only two invocation cases were `'S'` and `''`, so every
  // non-Latin, multi-character and whitespace operand was unexercised on a surface whose whole subject
  // is Indian names.
  it('actually invoked: Devanagari name parts pass through byte-for-byte', () => {
    const result = toContributionRowInput({ firstName: 'रीना', lastInitial: 'शा' }, 'क')
    expect(result).toEqual({
      displayName: { kind: 'name', firstName: 'रीना', lastInitial: 'शा' },
      poolLetterCode: 'क',
    })
  })

  it('actually invoked: a multi-character lastInitial is passed through, NOT truncated here', () => {
    // ⚠ This asserts the adapter's CONTRACT (re-shape only, AC9(4)), ⛔ not that the value is safe.
    // `lastInitial: z.string().max(16)` bounds LENGTH, not SHAPE, so a producer regression could put a
    // full surname on this PII-shielded surface — recorded as DEFERRED at the second code review, and
    // ⛔ deliberately NOT patched here: truncating in the adapter would rule the name form (D7-nameform).
    const result = toContributionRowInput({ firstName: 'Reena', lastInitial: 'Sharma' }, 'F')
    expect(result.displayName).toEqual({ kind: 'name', firstName: 'Reena', lastInitial: 'Sharma' })
  })

  it('actually invoked: whitespace is neither trimmed nor collapsed by the adapter', () => {
    const result = toContributionRowInput({ firstName: ' ', lastInitial: ' ' }, 'A')
    expect(result.displayName).toEqual({ kind: 'name', firstName: ' ', lastInitial: ' ' })
  })
})

// ─── AC6 — exhaustiveness over what the REAL presenter can emit, plus anti-widening ──────────────────

describe('AC6 — every displayName kind the presenter can take is rendered or PROVABLY guarded', () => {
  const input = (displayName: ContributionRowInput['displayName']): ContributionRowInput => ({
    displayName,
    poolLetterCode: 'F',
  })

  it("kind 'name' is the ONE renderable kind, and it yields nameParts", () => {
    const vm = deriveContributionRowViewModel(
      input({ kind: 'name', firstName: 'Reena', lastInitial: 'S' }),
    )
    expect(vm.displayName.kind).toBe('nameParts')
    // The render layer reads exactly these two fields off the view-model and joins them itself.
    expect(vm.displayName.firstName).toBe('Reena')
    expect(vm.displayName.lastInitial).toBe('S')
  })

  it("kind 'unknown' THROWS — and the component's try/catch is what handles it", () => {
    expect(() => deriveContributionRowViewModel(input({ kind: 'unknown' }))).toThrow()
  })

  it('ANTI-WIDENING — a THIRD kind throws too, so it cannot silently render blank', () => {
    const forged = { kind: 'anonymized', firstName: 'x', lastInitial: 'y' } as unknown as
      ContributionRowInput['displayName']
    expect(
      () => deriveContributionRowViewModel(input(forged)),
      'A third display-name kind did not throw. Adding one is a RULING (11b.2a D5/D6(a) left exactly one ' +
        'renderable kind); this render layer must not be widened silently.',
    ).toThrow()
  })

  it('the component reads the nameParts arm off the view-model, not the wire row', () => {
    expect(component).toMatch(/\bfirstName\b/)
    expect(component).toMatch(/\blastInitial\b/)
    // The join reads the VIEW-MODEL, so `item.firstName` may only survive in the keyExtractor (AC3).
    const itemReads = component.match(/\bitem\.(firstName|lastInitial)\b/g) ?? []
    expect(
      itemReads.length <= 2,
      'The component still composes the display name from the WIRE row (item.firstName / ' +
        'item.lastInitial) outside the keyExtractor. AC1 routes row content through the presenter.',
    ).toBe(true)
  })
})

// ─── AC5 — the five named behaviour-preservation assertions + AC3 ────────────────────────────────────

describe('AC5 — behaviour is preserved, stated as five named properties', () => {
  it('(1) FlashList remains the list renderer', () => {
    expect(component).toMatch(/FlashList/)
    expect(component).toMatch(/@shopify\/flash-list/)
  })

  it('(2) the four states each still render their own distinct branch', () => {
    expect(component, 'loading branch').toMatch(/if\s*\(\s*isLoading\s*\)/)
    expect(component, 'absence branch').toMatch(/if\s*\(\s*!data\s*\|\|\s*!data\.assigned\s*\)/)
    expect(component, 'empty branch').toMatch(/confirmedRows\.length\s*===\s*0/)
    expect(component, 'list branch').toMatch(/data=\{confirmedRows\}/)
  })

  it('(3) String(...) keeps the pending count + percentage LATIN in both locales', () => {
    expect(component).toMatch(/String\(data\.pending\.count\)/)
    expect(component).toMatch(/String\(data\.pending\.percentage\)/)
    expect(/toHindiNumeral/.test(component)).toBe(false)
  })

  it('(4) the pending strip stays accessibilityLiveRegion="polite", never assertive', () => {
    expect(component).toMatch(/accessibilityLiveRegion="polite"/)
    expect(/assertive/.test(component)).toBe(false)
  })

  it('(5) empty / loading / absence render OUTSIDE the list (Trap 2 — Fabric empty→populated)', () => {
    expect(
      /ListEmptyComponent/.test(component),
      'A ListEmptyComponent was introduced. New-Arch FlashList red-boxes when a list crosses ' +
        'empty→populated IN PLACE, and the 60s poll makes that a routine transition, not an edge case.',
    ).toBe(false)
  })
})

describe('AC3 — the keyExtractor KEEPS index; the 8.3 deferral stays open', () => {
  it('is byte-unchanged: `${item.firstName}-${item.lastInitial}-${index}`', () => {
    expect(component).toContain('`${item.firstName}-${item.lastInitial}-${index}`')
  })
})

// ─── AC4 — the anti-chrome fence (11b.2 D2(a) rejected the bridge BY NAME) ───────────────────────────

describe('AC4 — NO token bridge and NO confirmed chrome (D2(a))', () => {
  const touched = [component, adapter]

  it('(a) imports no @twt/tokens anywhere in the touched files', () => {
    for (const src of touched) expect(/@twt\/tokens/.test(src)).toBe(false)
  })

  it('(b) introduces no status / tone / colour-role element on the contributor row', () => {
    // ⭐ WIDENED at the second code review: every original pattern was evadable by this repo's OWN
    // idioms. Colour ships as Tamagui tokens (`bg="$green4"`), not as a quoted 'green'; a status field
    // ships as `contributionStatus:`, not bare `status:`; a token map ships as `toneTokens`, not
    // `X_TOKENS`. A fence that cannot match the way the codebase actually writes the thing is decoration.
    for (const src of touched) {
      expect(/StatusPill/.test(src), 'a StatusPill reached the contributor row').toBe(false)
      expect(/\w*_?TOKENS\b|\b\w*[Tt]oneTokens\b/.test(src), 'a tone/colour token MAP was introduced').toBe(
        false,
      )
      expect(/['"]green['"]/.test(src), "a 'green' literal reached the row").toBe(false)
      expect(
        /\$(green|red|yellow|orange|success|danger|warning)\w*/i.test(src),
        'a semantic COLOUR token reached the row — Tamagui tokens are how colour actually ships here',
      ).toBe(false)
      // ⚠ NARROWED at the third code review. `/\w*[Tt]one\s*[:=]/` matched **`milestone:`**
      // (mile-s-TONE), and `/\w*[Ss]tatus\s*[:=]/` matched `if (status === …)` — React Query's own
      // field, in scope from this very directory's hook. Both were false-red traps on innocent code.
      // Now: the bare word as an OBJECT KEY only, or an explicit camelCase `…Tone`/`…Status` field.
      expect(/\btone\s*:|\b\w+Tone\s*[:=]/.test(src), 'a tone field was introduced').toBe(false)
      expect(/\bstatus\s*:|\b\w+Status\s*[:=]/.test(src), 'a status field was introduced').toBe(false)
    }
  })

  it('(c) creates no local palette bridge module in the contributor-list directory', () => {
    // ⭐ REWRITTEN at the second code review. The old version proved only that ONE hardcoded filename
    // (`tokens.ts`) did not exist — a bridge named `palette.ts` or `row-tokens.ts` passed it green.
    // The whole directory is now scanned by SHAPE, which is what D2(a) actually rejected.
    const DIR = 'apps/mobile/components/contributor-list'
    const KNOWN = new Set([
      'PoolContributorList.tsx',
      'ViewContributorsEntry.tsx',
      'contribution-row-input.ts',
      'usePoolContributorsQuery.ts',
    ])
    // ⚠ RECURSIVE at the third code review: `readdirSync` without `recursive` is ONE level deep, so
    // `contributor-list/helpers/palette.ts` passed green — the same defect as the hardcoded filename it
    // replaced, one directory out.
    const entries = readdirSync(path.join(repoRoot, DIR), { recursive: true }) as string[]
    expect(entries.length, 'directory scan found nothing — the fence would be vacuous').toBeGreaterThan(0)
    const bridges = entries.filter(
      (f) => !KNOWN.has(f) && /token|palette|colou?r|theme|tone/i.test(f) && !/\/$/.test(f),
    )
    expect(
      bridges,
      `A local palette/token bridge was created in ${DIR}: ${bridges.join(', ')}. D2(a) rejected exactly ` +
        'this construction by name — the name it is given does not change what it is.',
    ).toEqual([])
  })
})

// ─── AC1 + AC2 — the no-death-term regression fence, over BOTH render sites ──────────────────────────

describe('AC1/AC2 — no death-derived term reaches ANY contributor render path', () => {
  // ⭐ Site (2) is a staff-takeover-session-as-deceased surface: the session context IS the deceased
  // member, so a dev "fixing" the list there is one conjunct away from deleting dead contributors from
  // it. A contribution made while alive stays in the record with its name on it (11b.2 D9(a) /
  // 2026-08-24-159 cl.11) — "the right conjunct in the wrong read".
  const sites: ReadonlyArray<readonly [string, string]> = [
    ['the component', COMPONENT],
    ['render site 1 — the 8.3 route', ROUTE_SITE],
    ['render site 2 — the Nominee Console', CONSOLE_SITE],
    // ⭐ ADDED at the second code review. The QUERY HOOK is the natural place to add a filter — it is
    // where the rows come from — and it was in no scanned set at all.
    ['the fetch hook', HOOK],
  ]
  // No word boundary around "deceased": camelCase/compound identifiers like `deceasedMemberId` or
  // `isDeceasedFlag` have no non-word character adjacent to "deceased", so `\bdeceased\b` would miss
  // them entirely. The bare substring is unambiguous enough on its own — false positives on legitimate,
  // unrelated uses of the word "deceased" in this narrow surface are an acceptable trade for not letting
  // a compound identifier slip past the fence undetected.
  // ⭐ WIDENED at the second code review. Death reaches this codebase under names other than "deceased",
  // and ⚠ `members.state` is BLIND TO DEATH BY CONSTRUCTION ([[project_death_is_an_overlay_not_a_state]])
  // — banning it was banning a predicate that could not have encoded death anyway, while the overlay
  // vocabulary that CAN was unbanned. `member.state` / `memberState` / `lifecycleState` are the same
  // predicate spelled three other ways.
  // ⚠⚠ NARROWED **AND** WIDENED at the third code review, and the narrowing matters more.
  // ⛔ `shradhanjali` / `memorial` / `inMemoriam` / `obituary` are REMOVED. They are SURFACE NAMES, ⛔ not
  // death PREDICATES, and banning them was a live false-red trap: `PoolContributorList.tsx` already
  // names `ShradhanjaliSahyogVivran` TWICE as the ratified pattern to follow, and `_layout.tsx` uses
  // "memorial" as a FONT ROLE. The component was green ONLY because `stripComments` removed those
  // comments — i.e. the fence rested entirely on the helper that has now been wrong twice, and the very
  // next legitimate edit (importing the sibling it tells you to copy) would have turned reuse into a
  // death-term violation. ⭐ A fence that fires on the pattern its own subject recommends is a trap.
  // ⭐ WIDENED where it was genuinely thin: the predicate vocabulary for death is `dead`/`died`/
  // `dateOfDeath`/`isAlive`/`passedAway`, none of which were banned.
  const BANNED =
    /deceased|is[-_]?dead\b|\bdied\b|date[-_]?of[-_]?death|dateOfDeath|passedAway|passed[-_]away|isAlive|mrityu|account[-_]?frozen|accountFrozen|members?\.state|memberState|lifecycleState/i

  for (const [label, rel] of sites) {
    it(`${label} (${rel}) carries no death-derived conjunct`, () => {
      expect(
        BANNED.test(stripComments(read(rel))),
        `A death-derived term reached ${rel}. No such term may filter, mask, anonymize or reorder a ` +
          'contributor row — C-5 inverts here (AC1).',
      ).toBe(false)
    })
  }
})

describe('AC2 — both render sites still mount the ONE list component', () => {
  it('render site 1 — the 8.3 contributors route', () => {
    const src = stripComments(read(ROUTE_SITE))
    expect(src).toMatch(/import\s*\{\s*PoolContributorList\s*\}/)
    expect(src).toMatch(/<PoolContributorList\s*\/>/)
  })

  it('render site 2 — the Nominee Console (composed, never re-implemented)', () => {
    const src = stripComments(read(CONSOLE_SITE))
    expect(src).toMatch(/import\s*\{\s*PoolContributorList\s*\}/)
    expect(src).toMatch(/<PoolContributorList\s*\/>/)
  })
})

// ─── AC6 — the i18n obligation: THIS story's OWN call sites ──────────────────────────────────────────

describe('AC6 — every t() call site passes an EXPLICIT namespace (t() defaults to common and THROWS)', () => {
  /** Every `t(` call in `src`, returned as its full balanced-paren argument text. */
  const tCalls = (src: string): string[] => {
    const out: string[] = []
    const opener = /(?<![\w.$])t\(/g
    let m: RegExpExecArray | null
    while ((m = opener.exec(src)) !== null) {
      let depth = 1
      let quote: string | null = null
      let i = m.index + m[0].length
      // ⚠ String-aware (second code review): the previous counter incremented on any `(`, so a
      // parenthesis inside a translation KEY truncated the captured call and the fence then reported a
      // correctly-namespaced call as bare (false red) — or absorbed a following call (false green).
      for (; i < src.length && depth > 0; i += 1) {
        const c = src[i]
        if (quote) {
          if (c === '\\') i += 1
          else if (c === quote) quote = null
          continue
        }
        if (c === '"' || c === "'" || c === '`') quote = c
        else if (c === '(') depth += 1
        else if (c === ')') depth -= 1
      }
      out.push(src.slice(m.index, i))
    }
    return out
  }

  /** Split a captured `t(...)` call into its TOP-LEVEL arguments — bracket- and string-aware. */
  const splitTopLevelArgs = (callText: string): string[] => {
    const inner = callText.slice(callText.indexOf('(') + 1, callText.lastIndexOf(')'))
    const args: string[] = []
    let depth = 0
    let quote: string | null = null
    let current = ''
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i]
      if (quote) {
        current += ch
        if (ch === '\\') {
          current += inner[i + 1] ?? ''
          i += 1
        } else if (ch === quote) quote = null
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
        current += ch
        continue
      }
      if (ch === '(' || ch === '[' || ch === '{') depth += 1
      else if (ch === ')' || ch === ']' || ch === '}') depth -= 1
      if (ch === ',' && depth === 0) {
        args.push(current.trim())
        current = ''
        continue
      }
      current += ch
    }
    if (current.trim()) args.push(current.trim())
    return args
  }

  // ⭐⭐ SECOND CODE REVIEW — THE OLD FENCE ACCEPTED THE EXACT DEFECT IT NAMES. It tested
  // `/\bNS\s*,?\s*\)|namespace:/` against the whole call text, so `namespace:` ANYWHERE satisfied it —
  // including `t(key, { namespace: 'contribution' })`, the namespace in the PARAMS slot, which is the
  // documented 11a.2 defect: it falls back to 'common' and THROWS at runtime. The slot is now checked.
  it('no bare t(key) call survives, and the namespace is in the THIRD argument slot', () => {
    const calls = tCalls(component)
    expect(calls.length, 'no t() calls found — the scan would be vacuous').toBeGreaterThan(0)
    for (const call of calls) {
      const args = splitTopLevelArgs(call)
      expect(
        args.length,
        `t() called with ${args.length} argument(s), so it cannot carry a namespace: ${call}`,
      ).toBeGreaterThanOrEqual(3)
      expect(
        /namespace\s*:/.test(args[1] ?? ''),
        `The namespace is in the PARAMS slot (second argument) of: ${call}. t(key, params, options) — ` +
          "it falls back to 'common' and THROWS on every call (resolver.ts:53-64).",
      ).toBe(false)
      expect(
        /^NS$/.test(args[2] ?? '') || /namespace\s*:/.test(args[2] ?? ''),
        `The THIRD argument of ${call} carries no namespace.`,
      ).toBe(true)
      expect(
        /\bNS\s*,?\s*\)|namespace:/.test(call),
        `Bare t() call without an explicit namespace: ${call}. t() defaults to 'common' and THROWS on ` +
          'a miss (resolver.ts:55, :63-64).',
      ).toBe(true)
    }
  })

  it('the row a11y label resolves the PRESENTER REF — key and namespace both, never guessed', () => {
    // The two-step consumption `view-model.ts:57-64` prescribes: join the parts, then
    // t(rowA11y.ref.key, { name }, { namespace: rowA11y.ref.namespace }).
    expect(component).toMatch(/t\(\s*\n?\s*vm\.rowA11y\.ref\.key\s*,/)
    expect(component).toMatch(/namespace:\s*vm\.rowA11y\.ref\.namespace/)
  })

  it('and that ref IS contributor_list.row_a11y in the contribution namespace (presenter-driven)', () => {
    const vm = deriveContributionRowViewModel({
      displayName: { kind: 'name', firstName: 'Reena', lastInitial: 'S' },
      poolLetterCode: 'F',
    })
    expect(vm.rowA11y.ref.key).toBe('contributor_list.row_a11y')
    expect(vm.rowA11y.ref.namespace).toBe('contribution')
  })

  it('row_a11y is called WITH a {name} param', () => {
    expect(
      /\{\s*name:\s*label\s*\}/.test(component),
      "row_a11y is '{name}, confirmed contributor' — a single-brace token. Calling it without a `name` " +
        'param throws at the interpolation step (resolver.ts:33-42), which is how the 11a.2 defect shipped.',
    ).toBe(true)
  })

  it('does NOT byte-assert the empty-state copy — only that the key is resolved (11b.2a AC8 / D7(c))', () => {
    // D7(c) RE-WORDED `contributor_list.empty` in both locales, and 11b.2a's AC8 forbids pinning the
    // sentence: a byte-equality test on copy turns every future tone review into a test edit. So the
    // SENTENCE is read from the locale at runtime and never appears in this file — and this assertion
    // fails if a later pass pastes it in. What is asserted is that the KEY is resolved.
    const empty = (rel: string): string =>
      (JSON.parse(read(rel)) as Record<string, string>)['contributor_list.empty']
    const self = read('apps/mobile/tests/unit/contributor-list-render.test.ts')
    for (const locale of ['en', 'hi']) {
      const sentence = empty(`packages/i18n/locales/${locale}/contribution.json`)
      expect(sentence.length, `contributor_list.empty is missing from ${locale}`).toBeGreaterThan(0)
      expect(
        self.includes(sentence),
        `This test file byte-pins the ${locale} empty-state sentence. Assert the key and the branch, ` +
          'never the words (11b.2a AC8 / D7(c)).',
      ).toBe(false)
    }
    expect(component).toMatch(/t\(\s*'contributor_list\.empty'/)
  })
})

// ─── AC7 — family-13 semantic accessibility, on the reachable set ONLY ───────────────────────────────

describe('AC7 — family 13 (a): EVERY element carrying accessibilityLabel is explicitly accessible', () => {
  // A label on an element that is not an accessibility element is NEVER announced — and check (a) has
  // failed silently in this codebase before, so this is asserted over every subject, not just the row.
  // `accessible` is matched as a BARE PROP, so `accessibilityRole` / `accessibilityLabel` cannot satisfy it.
  const elements = component
    .split(/</)
    .filter((chunk) => /accessibilityLabel=/.test(chunk))

  it('has subjects — the scan is not vacuous', () => {
    expect(elements.length).toBeGreaterThanOrEqual(2)
  })

  for (const [i, chunk] of elements.entries()) {
    const tag = chunk.slice(0, chunk.search(/\s/)) || `element ${i}`
    it(`<${tag}> declares itself an accessibility element`, () => {
      expect(
        // ⚠ De-coupled from formatting at the third code review: this required `accessible` to be the
        // LAST TOKEN on its line, so `<View accessible accessibilityRole="text" …>` — what Prettier
        // emits whenever the tag fits in 100 columns — false-red'd a correctly-declared element.
        /(^|\s)accessible(\s*=\s*\{\s*true\s*\})?(\s|\/|>|$)/.test(chunk),
        `<${tag}> carries accessibilityLabel with no explicit \`accessible\`. Its label may never be ` +
          'announced (family 13 check (a)).',
      ).toBe(true)
    })
  }
})

describe('AC7 — family 13 (d): every state ratified REACHABLE is ANNOUNCED, not merely styled', () => {
  // ⭐⭐ THE REACHABLE SET IS **SIX**, ⛔ NOT FIVE. The first code review ADDED the sixth — a non-empty
  // `confirmed` array in which NO row could be derived — and ⛔ did not extend this enumeration, which
  // is the vacuous green family 13 exists to catch, produced by the very patch that closed a family-13
  // adjacent defect. It is announced by SHARING the empty branch, and the post-D7(c) copy speaks about
  // NAMES rather than about whether anyone contributed, so it stays truthful for both states. ⛔ The
  // sentence is deliberately NOT quoted here (11b.2a AC8 / D7(c) — the fence below enforces it).
  // ⚠ That the copy happens to be truthful is ⛔ not a substitute for enumerating the state.
  // ⭐ THE REACHABLE SET: loading · absence · empty · NO-ROW-DERIVABLE · a name row · the pending strip.
  // ⛔ THE ANONYMIZED ROW IS NOT ONE OF THEM — 11b.2a's D5 makes it unreachable BY CONSTRUCTION, and an
  // a11y assertion over an unreachable state is exactly the vacuous green family 13 exists to catch.
  const announced: ReadonlyArray<readonly [string, RegExp]> = [
    ['loading', /t\('loading'/],
    ['absence', /t\('contributor_list\.no_pool'/],
    ['empty', /t\('contributor_list\.empty'/],
    ['a name row', /t\(\s*\n?\s*vm\.rowA11y\.ref\.key/],
    ['the pending strip', /t\(\s*\n?\s*'contributor_list\.pending_strip_a11y'/],
  ]

  for (const [state, pattern] of announced) {
    it(`${state} resolves announced copy`, () => {
      expect(pattern.test(component), `${state} renders no announced text`).toBe(true)
    })
  }

  it('the SIXTH state — non-empty but nothing derivable — is announced, not silently blank', () => {
    // It shares the empty branch by design; what must hold is that reaching it RESOLVES announced copy
    // rather than mounting an empty list. FENCE 2 (AC1/Trap 1 block) proves the branch consults
    // `hasRenderableRow`; this proves the branch it lands in actually says something.
    const branch = /\{([^?]*)\?\s*\(\s*<YStack([^>]*)>\s*<Text[^>]*>\s*\{t\('contributor_list\.empty'/.exec(
      component,
    )
    expect(branch, 'the empty/no-derivable branch could not be located').not.toBeNull()
    expect(/hasRenderableRow/.test(branch![1]), 'the sixth state does not reach this branch').toBe(true)
    expect(
      /accessibilityRole=/.test(branch![2]),
      'the branch the sixth state lands in carries no accessibilityRole',
    ).toBe(true)
  })

  it('every state branch carries an accessibilityRole — checked PER BRANCH, not by file-wide count', () => {
    // ⭐ REWRITTEN at the second code review. The old assertion counted `accessibilityRole="`
    // occurrences across the whole file and required >= 5 — so five roles on ONE element passed while
    // four branches carried none. It could not distinguish the property it was named for.
    const branches: ReadonlyArray<readonly [string, string]> = [
      ['loading', balancedFrom(component, /if \(isLoading\) \{/, '{', '}')],
      ['absence', balancedFrom(component, /if \(!data \|\| !data\.assigned\) \{/, '{', '}')],
      ['a name row', renderItemBlock],
      // ⚠⚠ RE-CUT at the third code review. These two were ±300/±400 CHARACTER WINDOWS, so a role
      // belonging to a DIFFERENT element could satisfy them — the precise defect the rewrite claimed to
      // have replaced, and offset-fragile besides (the windows are measured on stripped source, so
      // adding a comment moves them). Now: the opening tag that directly encloses the copy.
      [
        'empty / no-row-derivable',
        enclosingOpenTags(component, component.indexOf("t('contributor_list.empty'")),
      ],
      [
        'the pending strip',
        enclosingOpenTags(component, component.indexOf("'contributor_list.pending_strip_a11y'")),
      ],
    ]
    for (const [label, slice] of branches) {
      expect(slice, `${label}: branch slice not found — the check would be vacuous`).not.toBe('')
      expect(/accessibilityRole=/.test(slice), `${label} branch carries no accessibilityRole`).toBe(true)
    }
  })
})

describe('AC7 — family 13 (b) and (c) are NOT-APPLICABLE on this surface, and that is asserted', () => {
  // ⛔ Recorded as not-applicable, NEVER as passing: the surface has no measurable-value role and no
  // interactive role, so the two checks have no subject here ([[feedback_gate_scope_semantic_coverage]]).
  it('(b) N/A — no progressbar/slider role exists, so none can lack accessibilityValue', () => {
    expect(/accessibilityRole="(progressbar|slider)"/.test(component)).toBe(false)
  })

  it('(c) N/A — no button/link role exists, so none can announce over an empty handler', () => {
    expect(/accessibilityRole="(button|link)"/.test(component)).toBe(false)
  })
})

// ─── AC10 — the in-diff stale comments are corrected (THIS FILE ONLY) ────────────────────────────────

describe('AC10 — the stale "producer is unbuilt" claims are corrected in this story diff', () => {
  // Scanned on the RAW source: these are comments, and stripping them would make the test vacuous.
  const raw = read(COMPONENT)

  it('no longer claims Epic 9\'s confirmed producer is unbuilt', () => {
    expect(
      /producer is unbuilt|producer is not built/i.test(raw),
      'PoolContributorList.tsx still says Epic 9\'s producer is unbuilt. It has been LIVE since Story ' +
        '9.4/9.5 — never read population from a comment.',
    ).toBe(false)
  })

  // ⭐⭐ SECOND CODE REVIEW — the scan covered the component ALONE, and the sibling hook that FETCHES
  // these rows still ASSERTED the false premise as its justification for the 60s poll being a no-op.
  // An AC whose whole subject is "never read population from a comment" was green with the comment
  // intact one file away ([[feedback_gate_scope_semantic_coverage]]).
  it('the sibling FETCH hook no longer asserts the producer is unbuilt either', () => {
    const rawHook = read(HOOK)
    expect(
      /producer is unbuilt|producer is not built|honest no-ops today/i.test(rawHook),
      `${HOOK} still asserts Epic 9's producer is unbuilt / the poll is an honest no-op. It has been ` +
        'LIVE since Story 9.4/9.5, so this poll carries real rows.',
    ).toBe(false)
  })

  // ⚠ The adapter is allowed to QUOTE the stale contract text — it deliberately names
  // `pool-contributor-list.ts:88` as a separate, routed issue and the story forbids tidying the
  // contract. What it may NOT do is state the claim as its own. The fence is the correction marker:
  // if the phrase appears, a repudiation must appear within the same three lines.
  it('the adapter may CITE the stale contract claim, but never assert it unrepudiated', () => {
    const lines = read(ADAPTER).split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      if (!/producer is unbuilt|producer is not built/i.test(lines[i])) continue
      const window = lines.slice(Math.max(0, i - 1), i + 3).join(' ')
      expect(
        /stale|false since|no longer|has been LIVE|corrected/i.test(window),
        `${ADAPTER}:${i + 1} repeats the stale "producer is unbuilt" claim with no repudiation within ` +
          'three lines. Cite it as stale, or do not cite it.',
      ).toBe(true)
    }
  })

  it('no longer asserts "0 confirmed today"', () => {
    expect(/0 confirmed today/i.test(raw)).toBe(false)
  })

  it('does not import from packages/contracts source or edit the contract (out of diff)', () => {
    // D10(a) is an `import type` FROM contracts, via the `@twt/contracts` package alias — never a
    // relative path into the source tree. Checked over BOTH files that reference the contract: the
    // component (which only imports the type) and the adapter (which is the one file that actually
    // consumes `ConfirmedContributorRow`) — a prior version of this test checked only the component,
    // which meant the adapter file could bypass the alias with a relative import undetected.
    expect(/packages\/contracts/.test(component)).toBe(false)
    expect(/packages\/contracts/.test(adapter)).toBe(false)
  })
})
