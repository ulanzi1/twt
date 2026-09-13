// The member drive-list render fence — Story 11b.15 (Task 6; AC4, AC5, AC6, AC7, AC8b). DB-free,
// RN-render-free.
//
// The mobile harness is pure-Vitest (⛔ no `@testing-library/react-native` — RN component MOUNT
// tests are not set up here; the `helpdesk-screens-render.test.ts` / `status-pill-render.test.ts`
// precedent). ⇒ this proves, by a source scan driven by the REAL i18n catalog and the REAL
// contract, the things a pure test CAN prove:
//
//   1. **TRAP 3 / AC6** — empty · loading · error render OUTSIDE the FlashList, so the component
//      ⛔ never crosses empty → populated IN PLACE. Asserted on the same slice-the-source shape
//      `helpdesk-screens-render.test.ts:77-82` uses, because ⭐ the regression this guards has a
//      NAME in this repo ([[project_fabric_flatlist_empty_populated_crash]]).
//   2. **AC7** — the list is `@shopify/flash-list`, ⛔ not `FlatList` (UX-DR80's *"Sahyog List
//      components"* clause; the repo's recorded threshold split reserves FlashList for exactly this
//      case).
//   3. **AC4** — the three stage words and the *"i"* affordance resolve from story B's SHARED
//      namespace, by name, and the surface mints ⛔ no second key set.
//   4. **AC5 / family 13** — every labelled container declares `accessible` EXPLICITLY (a tamagui
//      `<Button>` is `styled(View)` and supplies it NOWHERE), a role implying interaction has a
//      REAL handler, and the row's a11y label has a no-family VARIANT.
//   5. **AC8b** — लक्ष्य is gated on the key being ABSENT, ⛔ never on a `null` check.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MemberDriveListEntry } from '@twt/contracts'
import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { IST_OFFSET_MS, formatClosedAtIst, outcomeFramingKey } from '../../components/drive-list/format'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')

const list = read('apps/mobile/components/drive-list/MemberDriveList.tsx')
const layout = read('apps/mobile/app/(tabs)/_layout.tsx')

/**
 * ⭐⭐ THE SOURCE WITH ITS COMMENTS REMOVED — for assertions about what the code DOES.
 *
 * ⚠⛔ **THIS IS ⛔ NOT A CONVENIENCE, AND THE FIRST RUN OF THIS FILE PROVED IT.** Three assertions
 * below forbid a token outright (`ListEmptyComponent`, `FlatList`, `estimatedItemSize`) — and every
 * one of them FAILED against the raw source, because the component's doc-blocks NAME those tokens in
 * order to forbid them. ⇒ ⭐ a raw-source scan makes the codebase's own discipline — *"say what you
 * are not doing, and why"* — indistinguishable from doing it.
 * ⛔ The wrong fix is to reword the comments until the regex is happy: that deletes the record a
 * future author needs and leaves the test just as blind. ⭐ The right one is to scan the CODE.
 *
 * ⚠ Line comments are stripped ⛔ only when they start a line (after whitespace), so a `//` inside a
 * string literal or a URL survives — a URL is code. ⛔ Do ⛔ not "improve" this into a full parser:
 * the assertions using it are token-presence checks, and `codeOnly` only has to be right about
 * comments. ⭐ Assertions ABOUT the doc-blocks (the 10.15 supersession) deliberately read the RAW
 * source instead.
 *
 * [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): the BLOCK
 * comment strip used to match a block-comment OPENER anywhere in the source, so a string literal
 * containing that same two-character sequence would be misread as a comment opener and everything up
 * to the next comment-closer (including real code) would vanish from `codeOnly`. ⭐ Every block
 * comment in this codebase's own style — plain JSDoc-style AND JSX's curly-braced form — starts at
 * the beginning of a line (after only whitespace, and for the JSX form one optional `{`) — the SAME
 * constraint line comments already carry, one line below — so anchoring the opener there closes the
 * gap without becoming a parser: an opener appearing mid-line, after real code, can no longer be
 * mistaken for one. The optional trailing `}` swallows the JSX form's closer the same way the
 * un-anchored version always did.
 */
const codeOnly = (src: string): string =>
  src
    .replace(/^[ \t]*\{?\/\*[\s\S]*?\*\/\}?/gm, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

const listCode = codeOnly(list)
const layoutCode = codeOnly(layout)

const NS = 'member-drive-list'
const SHARED = 'sahyog-shared'

describe('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09), SECOND pass — `codeOnly` itself, both directions', () => {
  // ⚠⛔ BEFORE THIS TEST the anchored-opener fix (above) shipped with reasoning in a comment but no
  // test locking in EITHER of the two properties it claims: that a real block comment is still
  // stripped, and that a `/*`-like sequence inside a string literal NOT at line-start now survives.
  it('⭐ a real, line-anchored block comment is still stripped', () => {
    const src = [
      'const x = 1',
      '/**',
      ' * a real doc comment',
      ' */',
      'const y = 2',
    ].join('\n')
    const result = codeOnly(src)
    expect(result).not.toContain('a real doc comment')
    expect(result).toContain('const x = 1')
    expect(result).toContain('const y = 2')
  })

  it('⭐ the JSX curly form `{/* ... */}` is still stripped when it opens a line', () => {
    const src = ['const a = 1', '{/* a jsx comment */}', 'const b = 2'].join('\n')
    const result = codeOnly(src)
    expect(result).not.toContain('a jsx comment')
  })

  it('⛔⛔ a `/*`-like sequence INSIDE A STRING LITERAL, not at line-start, now SURVIVES — the bug this fix closes', () => {
    // ⚠ Before the anchored fix, this line's `/*` (mid-line, after `const url = `) was misread as a
    // comment opener, and everything up to the NEXT real `*/` in the file — including subsequent real
    // code — would have vanished from `codeOnly`.
    const src = ['const url = "example.com/*not-a-comment*/path"', 'const z = 3'].join('\n')
    const result = codeOnly(src)
    expect(result).toContain('example.com/*not-a-comment*/path')
    expect(result).toContain('const z = 3')
  })
})

describe('⭐⭐ AC6 / Trap 3 — empty · loading · error render OUTSIDE the list', () => {
  it('⛔ the FlashList mounts ONLY in the populated branch — never as a ListEmptyComponent', () => {
    // ⭐ The empty branch is an early-`?` sibling on `drives.length === 0`; the list mounts in the
    // `else`. ⇒ the component never crosses empty → populated IN PLACE, which is the crash.
    expect(listCode).toMatch(/drives\.length === 0/)

    // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), THIRD pass.
    // ⚠⛔⛔ **THIS ASSERTION USED TO BE A TAUTOLOGY.** It sliced
    // `[indexOf('drives.length === 0'), lastIndexOf('FlashListAny'))` and then asserted the slice
    // did ⛔ not contain `<FlashListAny` — but `FlashListAny` occurs EXACTLY TWICE in the source (the
    // `as any` binding and the element), so `lastIndexOf` returned the element's own offset and the
    // slice was DEFINED to end immediately before the string being searched for. ⇒ it could ⛔ not
    // fail — ⛔ not even if the list were moved INSIDE the empty branch, which is the ⛔ one regression
    // this test exists to catch ([[project_fabric_flatlist_empty_populated_crash]]).
    // ⇒ ⭐ the slice now ends at the ternary's OWN `else` marker, and the test proves it is
    // non-vacuous: the list must genuinely exist, and exist AFTER that marker.
    const emptyStart = listCode.indexOf('drives.length === 0')
    const elseMarker = listCode.indexOf(') : (', emptyStart)
    expect(elseMarker, 'the empty/populated ternary lost its `) : (` else marker').toBeGreaterThan(
      emptyStart,
    )
    const emptyBranch = listCode.slice(emptyStart, elseMarker)
    expect(emptyBranch.length, 'the empty branch sliced to nothing — the shape moved').toBeGreaterThan(
      0,
    )
    expect(emptyBranch).not.toContain('FlashList')
    // ⭐ NON-VACUITY: the list exists at all, and mounts only after the else marker.
    expect(listCode.indexOf('<FlashListAny')).toBeGreaterThan(elseMarker)

    // ⛔⛔ AND THE FORBIDDEN SHAPE IS NAMED, not merely avoided: `ListEmptyComponent` swaps the empty
    // state IN PLACE inside the list, which is precisely the remount the guard exists to prevent.
    expect(listCode).not.toContain('ListEmptyComponent')
  })

  it('⭐ loading and error are EARLY RETURNS, before any list exists', () => {
    const firstList = listCode.indexOf('FlashListAny')
    // Both branches must appear BEFORE the list in source order — i.e. they `return` out of the
    // component rather than rendering beside a mounted list.
    expect(listCode.indexOf('if (isLoading)')).toBeGreaterThan(-1)
    expect(listCode.indexOf('if (isLoading)')).toBeLessThan(firstList)
    expect(listCode.indexOf('if (isError')).toBeGreaterThan(-1)
    expect(listCode.indexOf('if (isError')).toBeLessThan(firstList)
  })

  it('⭐ the three states use THREE DIFFERENT strings — ⛔ loading never asserts absence', () => {
    // ⚠ NON-VACUOUS: showing the EMPTY copy while the first read is in flight would assert
    // something FALSE about the member's own Pariwar, and the two would be indistinguishable to a
    // screen reader. The route is deliberately not fail-soft precisely so `error` is a real branch.
    for (const locale of ['en', 'hi'] as const) {
      const values = ['loading', 'empty', 'error'].map((k) =>
        t(k, undefined, { locale, namespace: NS }),
      )
      expect(new Set(values).size, `${locale}: two of loading/empty/error coincide`).toBe(3)
      for (const v of values) expect(v.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('⭐ AC7 — the list is FlashList, and it is virtualized', () => {
  it('⛔ `@shopify/flash-list`, ⛔ NOT `FlatList`', () => {
    expect(listCode).toContain("from '@shopify/flash-list'")
    // ⭐ The repo's recorded threshold split: `YogdaanBahi.tsx:23` reserves FlashList for *"Epic
    // 11b's 10k Sahyog case, NOT this surface"* — and THIS is that case.
    expect(listCode).not.toMatch(/\bFlatList\b/)
  })

  it('⛔ no sizing prop rides the `as any` cast (the `estimatedItemSize` lesson)', () => {
    // ⚠ The cast suppresses unknown-prop errors, which is how a removed `estimatedItemSize`
    // survived in `PoolContributorList` — inert, with a dead constant behind it.
    expect(listCode).not.toContain('estimatedItemSize')
  })

  it('⭐ rows are keyed by the drive’s own stable address, ⛔ not an array index', () => {
    expect(listCode).toMatch(/keyExtractor=\{\(item: MemberDriveListEntry\) => item\.publicToken\}/)
  })
})

describe('⭐⭐ AC4 — the stage words come from story B’s SHARED source, by name', () => {
  it('⛔ the surface mints NO second key set — it reads the `sahyog-shared` namespace', () => {
    expect(list).toContain("namespace: 'sahyog-shared'")
    // ⛔⛔ The live assertion aimed at this story (`sahyog-stage-copy-resolves.test.ts:66-73`) says
    // story E *"consumes THESE keys, by name — it may NOT mint its own"*. Two sources is exactly how
    // "Active" came to mean two different things (`2026-09-04-193` cl.3).
    for (const key of ['stage.live', 'stage.closed', 'stage.verified']) {
      expect(list).toContain(`'${key}'`)
    }
    // ⛔ And the shared strings are NOT copied into this surface's own namespace.
    const own = getCatalog('en', NS) ?? {}
    const shared = getCatalog('en', SHARED) ?? {}
    for (const key of Object.keys(shared)) {
      if (key.startsWith('$comment')) continue
      expect(Object.keys(own), `\`${key}\` was copied out of \`${SHARED}\``).not.toContain(key)
    }
  })

  it('⭐ every stage the CONTRACT admits has a rendered word — ⛔ a 4th stage cannot render blank', () => {
    // ⚠ Driven by the REAL contract enum, ⛔ not a hand-listed set: widening the wire without
    // minting a word fails HERE.
    const stages = MemberDriveListEntry.shape.status.options as readonly string[]
    expect(stages.length).toBeGreaterThan(0)
    for (const stage of stages) {
      expect(list, `no stage key for \`${stage}\``).toContain(`${stage}: 'stage.${stage}'`)
      for (const locale of ['en', 'hi'] as const) {
        expect(t(`stage.${stage}`, undefined, { locale, namespace: SHARED }).trim().length).toBeGreaterThan(0)
        expect(
          t(`stage.${stage}.help`, undefined, { locale, namespace: SHARED }).trim().length,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('⭐ the info affordance is a REAL control with a TAP handler — ⛔ never hover-only', () => {
    expect(list).toContain("t('stage.explainer.summary', undefined, SHARED_NS)")
    expect(list).toContain("t('stage.explainer.a11y', undefined, SHARED_NS)")
    // ⛔ A role implying interaction MUST have a real handler (AC5). A hover-only affordance is
    // simply ABSENT on a phone.
    expect(listCode).toMatch(/onPress=\{\(\) => setExplainerOpen/)
    expect(listCode).not.toContain('onHover')
  })
})

describe('⭐ AC5 / family 13 — every labelled container is an accessibility element', () => {
  it('⛔ NO `accessibilityLabel` appears without `accessible` on the same element', () => {
    // ⚠⛔ THE MECHANISM, not a style rule: a tamagui `<Button>` is `styled(View)` and `@tamagui/web`
    // sets `accessible` NOWHERE (verified at the installed 2.1.0) ⇒ an RN `View` is not an
    // accessibility element unless it says so, and the label/role/hint are dropped on the floor.
    // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), THIRD pass.
    // ⚠⛔ **IT USED TO COUNT THE TWO TOKENS ACROSS THE WHOLE FILE AND ASSERT `>=`.** The defect it
    // claims to detect is PER-ELEMENT, so any element carrying `accessible` WITHOUT a label offset
    // an element carrying a label WITHOUT `accessible` and the check passed regardless. ⇒ it could
    // ⛔ never have caught the inline-banner defect this same pass found (a retry `<Button>` whose
    // own `accessible={true}` was swallowed by an `accessible` PARENT) — a shape a global count is
    // blind to by construction.
    // ⇒ ⭐ PAIRED PER ELEMENT. This file writes one attribute per line, so each
    // `accessibilityLabel=` is walked back to its own opening tag and the attribute block between
    // them must carry an explicit `accessible`.
    const lines = listCode.split('\n')
    const labelLines = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => line.includes('accessibilityLabel='))
    expect(labelLines.length, 'no accessibilityLabel found at all — the scan is looking at the wrong file').toBeGreaterThan(0)

    for (const { i } of labelLines) {
      let open = -1
      for (let j = i; j >= 0; j -= 1) {
        if (/^\s*<[A-Z][A-Za-z]*/.test(lines[j] as string)) {
          open = j
          break
        }
      }
      expect(open, `no opening tag found above line ${String(i + 1)}`).toBeGreaterThanOrEqual(0)
      const attrBlock = lines.slice(open, i + 1).join('\n')
      expect(
        /\baccessible\b(\s*=\s*\{true\})?/.test(attrBlock),
        `line ${String(i + 1)} carries accessibilityLabel on an element with no explicit \`accessible\` — the label will never be announced`,
      ).toBe(true)
    }
  })

  it('⛔ the ROW\'s interactive role has a REAL handler — ⛔ never a role without one', () => {
    // ⚠⛔⛔ **AMENDED 2026-09-13 (Story 11b.17, AC8) — ⛔ NOT DELETED, AND ⛔ NOT WEAKENED.**
    // ⛔ **WHAT IT ASSERTED, kept verbatim as the record** ([[feedback_supersede_never_reinterpret]]):
    // *"⛔ the ROW declares `text`, ⛔ never `button`/`link` — it has no handler (story F owns detail)"*,
    // with: *"⚠ A row that LOOKED tappable and did nothing would be the 'a role implying interaction
    // has a real handler' failure AC5 forbids. The per-drive DETAIL view is story F (`11b-17`)."*
    //
    // ⭐⭐ **THE GROUND IS GONE, ⛔ NOT THE RULE.** E declared the row `text` because there was
    // **NOWHERE TO GO** — the detail view did ⛔ not exist. ⭐ Story `11b-17` **BUILT IT**
    // (`apps/mobile/app/(sahyog)/[driveToken].tsx`), under the obligation **E's own THIRD code-review
    // pass routed to it BY NAME** (2026-09-09, BigDev — `11b-15:860-861`, `[x] [Review][Decision] ✅
    // RULED`): *"⭐ **THIS** story owns the per-drive view, so the affordance belongs here — and it must
    // be a REAL focusable control with a real handler and an accessible name."*
    //
    // ⇒ ⭐⭐ **THE INVARIANT E WAS ENFORCING IS ASSERTED THE OTHER WAY ROUND, AND IT IS STRICTER:**
    // ⛔ a role implying interaction may ⛔ NEVER appear without a handler, **in either direction** — so
    // this now catches BOTH the original defect (a `button` role with nothing behind it) AND the new
    // one a later refactor could introduce (the handler stripped while the role stays). ⚠ The OLD
    // assertion could ⛔ not catch the second, because it forbade the role outright.
    //
    // ⚠⛔ **`button`, ⛔ NOT `link`** — this row navigates **IN-APP** to a session-guarded screen.
    // ⭐ `link` is reserved for the two affordances that **LEAVE THE APP** for the public site
    // (`SahyogVivranEntry`, Trustee-ratified `2026-09-05-200` cl.4; and the detail screen's own
    // public-page CTA), where a screen reader should say so before the member commits to the tap.
    const row = listCode.slice(listCode.indexOf('function DriveRow'))
    expect(row).toContain('accessibilityRole="button"')
    // ⛔ Still forbidden here — see above.
    expect(row).not.toContain('accessibilityRole="link"')
    // ⭐⭐ THE ROLE AND THE HANDLER TRAVEL TOGETHER. ⛔ Neither half alone is acceptable.
    expect(
      row,
      'the row declares an interactive role with ⛔ NO onPress — the exact "a role implying ' +
        'interaction has a real handler" failure story E\'s AC5 named, now reachable from the ' +
        'opposite direction',
    ).toContain('onPress')
    // ⭐ AND THE HANDLER GOES SOMEWHERE REAL: the detail route story 11b.17 built, addressed by the
    // SERVER-RETURNED opaque token. ⛔⛔ ⛔ NEVER an address derived from `poolCanonicalIdentifier` —
    // that counter is MONOTONIC per (pariwar, month) and rebuilding an address from it would
    // re-create inside the client the guessability Story 11b.10's D2 removed, on a path that now
    // reaches FIVE decrypted Tier-1 fields per account.
    expect(listCode).toContain('/(sahyog)/')
    expect(listCode).toContain('entry.publicToken')
    expect(listCode).not.toMatch(/\(sahyog\)\/\$\{[^}]*poolCanonicalIdentifier/)
    // ⭐ AND THE ACCESSIBLE NAME SURVIVES THE ROLE CHANGE — the row still announces its facts under
    // ONE grouped label, and now also announces what the tap DOES.
    expect(row).toContain('accessibilityLabel={rowA11y}')
    expect(row).toContain("'row.open_hint'")
    for (const locale of ['en', 'hi'] as const) {
      expect(getCatalog(locale, NS)?.['row.open_hint']).toBeTruthy()
    }
  })

  it('⭐ the row a11y label has a NO-FAMILY variant — ⛔ `t()` THROWS on an unsupplied token', () => {
    // ⚠⛔ THE VARIANT STOPS A CRASH, ⛔ it is not a nicety: `deceasedMemberName` is nullable on the
    // wire, and resolving `row.a11y` without `{family}` would take down the WHOLE list, not one row.
    expect(MemberDriveListEntry.shape.deceasedMemberName.isNullable()).toBe(true)
    // ⚠ Asserted on the KEY, ⛔ not on a one-line `t('…'` spelling — THIRD pass reformatted these
    // calls across lines when the row's a11y label became a COMPOSITION, and a format-coupled scan
    // fails on a change that alters ⛔ nothing it is meant to protect.
    expect(listCode).toContain("'row.a11y.no_family'")
    for (const locale of ['en', 'hi'] as const) {
      const full = t('row.a11y', { family: 'X', stage: 'S', count: '1', amount: 'A' }, { locale, namespace: NS })
      const noFamily = t(
        'row.a11y.no_family',
        { code: 'Z', stage: 'S', count: '1', amount: 'A' },
        { locale, namespace: NS },
      )
      expect(full).toContain('X')
      expect(noFamily).not.toContain('X')
      // ⛔ The no-family arm must carry NO `{family}` token left to throw on.
      expect(getCatalog(locale, NS)?.['row.a11y.no_family']).not.toContain('{family}')
    }
  })

  it('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09) — the NO-FAMILY variant carries an IDENTIFYING token, so two nameless rows are distinguishable', () => {
    // ⚠⛔ BEFORE THIS PATCH the no-family sentence carried NO token distinguishing one nameless row
    // from another, even though the VISIBLE fallback (`entry.deceasedMemberName ?? entry.poolLetterCode`)
    // already could. A screen-reader user could not tell two nameless drives apart.
    expect(list).toContain('code: entry.poolLetterCode')
    for (const locale of ['en', 'hi'] as const) {
      const rowA = t(
        'row.a11y.no_family',
        { code: 'A-01', stage: 'S', count: '1', amount: 'A' },
        { locale, namespace: NS },
      )
      const rowB = t(
        'row.a11y.no_family',
        { code: 'A-02', stage: 'S', count: '1', amount: 'A' },
        { locale, namespace: NS },
      )
      expect(rowA).not.toBe(rowB)
    }
  })

  it('⛔ a null family name omits the NAME and KEEPS the row (AC3 floor in the render)', () => {
    // ⭐ The public index keeps a nameless row, so dropping one here would show a member LESS than a
    // stranger (`-189` cl.3). The row falls back to the pool letter code; it does NOT return null.
    const row = listCode.slice(listCode.indexOf('function DriveRow'))
    expect(row).toContain('entry.deceasedMemberName ?? entry.poolLetterCode')
    expect(row).not.toMatch(/if \(entry\.deceasedMemberName === null\) return null/)
  })
})

describe('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09) — the read is genuinely paginated, and a background refetch failure does not hide cached data', () => {
  it('⛔ the client asks for a NEXT page — `onEndReached` wired to `fetchNextPage`', () => {
    // ⚠⛔ BEFORE THIS PATCH the hook fetched exactly one page and never read `total`; a Pariwar with
    // more drives than one page could never see the remainder despite AC7's read being paginated
    // end to end (contract, route, domain). ⭐ Mirrors this app's own `usePollsQuery` shape.
    expect(listCode).toContain('onEndReached')
    expect(listCode).toContain('fetchNextPage()')
    // [Review][Patch] — THIRD pass: the guard USED TO BE `if (hasNextPage && !isFetchingNextPage)`,
    // which re-fired a page fetch that had just FAILED on every subsequent scroll — `hasNextPage` is
    // computed from the last SUCCESSFUL page, so it stays true. ⇒ the failure condition is now part
    // of the guard, and this test asserts THAT rather than the shape it replaced.
    expect(listCode).toContain('isFetchNextPageError')
    expect(
      listCode,
      'onEndReached must not re-fire a failed page fetch — the failure flag left the guard',
    ).toMatch(/if \(!hasNextPage \|\| isFetchingNextPage \|\| isFetchNextPageError\) return/)
  })

  it('⭐ a background refetch failure keeps rendering cached data, with an inline banner — ⛔ never the full error screen', () => {
    // ⚠⛔ THE FULL-SCREEN error state is now gated on `data === undefined` (nothing cached), ⛔ not on
    // `isError` alone — a failed retry/next-page fetch with ALREADY-LOADED pages falls through to an
    // inline banner instead of hiding a Pariwar's own drive list.
    expect(listCode).toMatch(/if \(isError && data === undefined\)/)
    expect(listCode).not.toMatch(/if \(isError \|\| !data\)/)
  })
})

const hookSrc = read('apps/mobile/components/drive-list/useMemberDriveListQuery.ts')

describe('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09) — the hook is `useInfiniteQuery`, page-keyed', () => {
  it('⛔ `useQuery` (a single, unpaginated page) is GONE', () => {
    expect(hookSrc).toContain('useInfiniteQuery')
    expect(hookSrc).not.toMatch(/\buseQuery\(/)
  })

  it('⭐ the next-page test is the SAME "more rows exist past this window" shape the public index uses', () => {
    expect(hookSrc).toMatch(/lastPage\.page \* lastPage\.limit < lastPage\.total/)
  })
})

describe('⭐⭐ AC8b — लक्ष्य renders only when the key is PRESENT', () => {
  it('⛔ gated on ABSENCE (`=== undefined`), ⛔ never on a null check', () => {
    // ⚠ The wire key is ABSENT rather than `null` when withheld (the 11b.11 shape). A `!== null`
    // test would render the target for every drive, on every Pariwar, at launch.
    expect(listCode).toContain('entry.driveTargetInr === undefined')
    expect(listCode).not.toContain('entry.driveTargetInr !== null')
    expect(MemberDriveListEntry.shape.driveTargetInr.isOptional()).toBe(true)
  })

  it('⭐ it uses the TARGET number form, ⛔ not the contributed amount’s', () => {
    // ⚠⛔ TWO DIFFERENT RULES ON ONE ROW, deliberately (`2026-09-07-206` cl.3): the target is exact
    // only below ₹1 lakh, the contributed amount below ₹10 lakh. ⛔ Do NOT align them.
    expect(list).toContain('formatSahyogTargetAmount(entry.driveTargetInr, locale)')
    expect(list).toContain('formatSahyogContributedAmount(entry.amountRaisedInr, locale, isLive)')
  })

  it('⭐ it renders story B’s ratified `drive_target` line — ⛔ no locally-minted sentence', () => {
    // ⚠ Asserted on the KEY + its ruled amount producer, ⛔ not on a one-line spelling — see the
    // no-family note above; THIRD pass wrapped this call across lines.
    expect(listCode).toContain("'drive_target'")
    expect(listCode).toContain('formatSahyogTargetAmount(entry.driveTargetInr, locale)')
    for (const locale of ['en', 'hi'] as const) {
      expect(t('drive_target', { amount: '₹ 8 lakh' }, { locale, namespace: SHARED })).toContain('₹ 8 lakh')
    }
  })
})

describe('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09) — AC3\'s floor, WIRED into the render', () => {
  // ⚠⛔ RESOLVED [Review][Decision], 2026-09-09: the Acceptance Auditor found `closedAt`,
  // `confirmedPercentage` and `fundingOutcome` present on the contract but never referenced by
  // `DriveRow` — a member saw no close date/outcome framing on a closed drive and no progress
  // percentage on a live one, both of which the public index shows for the same drive. This block
  // pins that the three are now referenced.
  it('⛔ `closedAt` is rendered', () => {
    expect(listCode).toContain('entry.closedAt === null')
    expect(listCode).toContain("t('row.closed_on'")
  })

  it('⛔ `confirmedPercentage` is rendered', () => {
    expect(listCode).toContain('entry.confirmedPercentage === null')
    expect(listCode).toContain("t('row.progress'")
  })

  it('⛔ `fundingOutcome` is rendered, and ⛔ NEVER on a `live` row', () => {
    expect(listCode).toContain('entry.fundingOutcome === null || isLive')
    expect(listCode).toContain('outcomeFramingKey(entry.fundingOutcome)')
    // ⭐ Every value the enum admits resolves in both locales — driven by the REAL contract enum.
    for (const outcome of MemberDriveListEntry.shape.fundingOutcome.unwrap().options) {
      for (const locale of ['en', 'hi'] as const) {
        expect(
          t(`outcome.${outcome}`, undefined, { locale, namespace: NS }).trim().length,
        ).toBeGreaterThan(0)
      }
    }
  })
})

describe('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09), SECOND pass — `format.ts` REAL unit tests', () => {
  // ⚠⛔ THESE ARE REAL CALLS, ⛔ NOT source-scans. `MemberDriveList.tsx` cannot be `import`ed in this
  // pure-Vitest (no `@testing-library/react-native`) harness — confirmed by trying: importing it
  // throws `SyntaxError: Unexpected token 'typeof'` from a transitive React Native dependency's Flow
  // syntax. `format.ts` was extracted specifically because it has NO such imports, so it CAN be
  // called directly and its OUTPUT checked — not merely its presence in source text.

  it('⭐ `formatClosedAtIst`\'s offset matches the public index\'s own, TEXTUALLY pinned', () => {
    // ⚠ `apps/mobile` cannot `import` from `apps/public` (a separate app, not a shared package) any
    // more than it could call its NOT-exported `formatClosedAt` directly — so this reads the public
    // source as TEXT (this file's own established `read()` pattern, used for `list`/`layout` above)
    // and confirms the two files declare the IDENTICAL offset expression, rather than merely trusting
    // the doc-comment's claim of parity.
    const publicSource = read('apps/public/src/lib/sahyog-render.ts')
    expect(publicSource).toContain('export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;')
    expect(IST_OFFSET_MS).toBe(5.5 * 60 * 60 * 1000)
  })

  it('⭐⭐ [Review][Patch] code review of 11b-15, FOURTH pass — `formatClosedAtIst` matches a REAL reference implementation of `apps/public`\'s `formatClosedAt`, not just its offset constant', () => {
    // ⚠⛔ THE PRIOR TEST ABOVE ONLY PINS THE OFFSET CONSTANT BY TEXT-MATCH — it cannot catch the two
    // copies drifting in rounding/format behaviour, which is exactly what the doc-block's "safe to
    // fork, mechanical format" claim needs covered. `apps/public/src/lib/sahyog-render.ts`'s
    // `formatClosedAt` is NOT exported (module-local) and `apps/mobile` cannot import across apps
    // anyway, so this reference implementation is a byte-for-byte copy of its body
    // (`apps/public/src/lib/sahyog-render.ts:378-388`), kept honest by asserting it PRODUCES THE
    // PUBLIC SOURCE'S OWN LOGIC TEXT below, not by trusting the copy silently.
    const referenceFormatClosedAt = (iso: string | null): string | null => {
      if (iso === null) return null
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return null
      const ist = new Date(d.getTime() + IST_OFFSET_MS)
      const yyyy = String(ist.getUTCFullYear()).padStart(4, '0')
      const mm = String(ist.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(ist.getUTCDate()).padStart(2, '0')
      return `${dd}-${mm}-${yyyy}`
    }
    const publicSource = read('apps/public/src/lib/sahyog-render.ts')
    // ⭐ Pins the reference copy's SHAPE against the real source's exact lines, so an edit to
    // `formatClosedAt` there that this reference implementation misses fails HERE, not silently.
    expect(publicSource).toContain('const ist = new Date(d.getTime() + IST_OFFSET_MS);')
    expect(publicSource).toContain("return `${dd}-${mm}-${yyyy}`;")

    // A broad instant table, not just the rollover boundary already covered below — every whole UTC
    // hour across two representative calendar days, which is enough range to catch a rounding or
    // padding divergence anywhere in the month/day/year arms.
    const instants: string[] = []
    for (const day of ['2026-01-01', '2026-06-30']) {
      for (let hour = 0; hour < 24; hour += 1) {
        instants.push(`${day}T${String(hour).padStart(2, '0')}:00:00.000Z`)
      }
    }
    for (const iso of instants) {
      expect(formatClosedAtIst(iso)).toBe(referenceFormatClosedAt(iso))
    }
    // The `null`/unparseable arms agree too.
    expect(formatClosedAtIst('not-a-real-date')).toBe(referenceFormatClosedAt('not-a-real-date'))
  })

  it('⭐ formats an ordinary IST-same-day instant correctly', () => {
    // 00:00 UTC on 1 Jan 2026 + 5:30 = 05:30 IST, same calendar day.
    expect(formatClosedAtIst('2026-01-01T00:00:00.000Z')).toBe('01-01-2026')
  })

  it('⭐⭐ the IST date-ROLLOVER boundary — the classic UTC+5:30 bug class', () => {
    // 18:29 UTC + 5:30 = 23:59 IST — still the SAME day.
    expect(formatClosedAtIst('2026-01-01T18:29:00.000Z')).toBe('01-01-2026')
    // 18:30 UTC + 5:30 = 00:00:00 IST the NEXT day — exactly on the boundary.
    expect(formatClosedAtIst('2026-01-01T18:30:00.000Z')).toBe('02-01-2026')
    // 20:00 UTC (a late-evening close, the case most likely to be gotten wrong) + 5:30 = 01:30 IST
    // the next day.
    expect(formatClosedAtIst('2026-01-01T20:00:00.000Z')).toBe('02-01-2026')
  })

  it('⛔⛔ [Review][Patch] an unparseable instant returns `null`, ⛔ NEVER the literal "NaN-NaN-NaN"', () => {
    expect(formatClosedAtIst('not-a-real-date')).toBeNull()
    expect(formatClosedAtIst('')).toBeNull()
  })

  it('⭐ `outcomeFramingKey` maps every enum member to its key, EXHAUSTIVELY — driven by the REAL contract enum', () => {
    const expected: Record<string, string> = {
      fully_funded: 'outcome.fully_funded',
      partial: 'outcome.partial',
      under_funded: 'outcome.under_funded',
    }
    for (const outcome of MemberDriveListEntry.shape.fundingOutcome.unwrap().options) {
      expect(outcomeFramingKey(outcome as 'fully_funded' | 'partial' | 'under_funded')).toBe(
        expected[outcome],
      )
    }
  })

  it('⛔⛔ [Review][Patch] a value OUTSIDE the enum throws, rather than resolving to an unmapped `t()` key', () => {
    // ⚠ Simulates what a WIDENED wire enum would do before its i18n key existed — the exhaustiveness
    // guard's whole reason to exist. `as any` is deliberate: this is the one place that must bypass
    // the type system to prove the RUNTIME guard, not just the compile-time one.
    expect(() => outcomeFramingKey('some_future_outcome' as any)).toThrow(
      /unhandled funding outcome/,
    )
  })
})

describe('⭐ AC1 — the FOURTH TAB, and its recorded supersession', () => {
  it('⭐ a fourth `Tabs.Screen` exists, beside the three', () => {
    expect((layoutCode.match(/<Tabs\.Screen/g) ?? []).length).toBe(4)
    expect(layoutCode).toContain('name="sahyog"')
  })

  it('⭐ its title is `t()`-RESOLVED — the recorded Trap 4 decision', () => {
    expect(layoutCode).toContain("t('tab.title', undefined, DRIVE_LIST_NS)")
    for (const locale of ['en', 'hi'] as const) {
      expect(t('tab.title', undefined, { locale, namespace: NS }).trim().length).toBeGreaterThan(0)
    }
    // ⭐ The two locales genuinely DIFFER — otherwise "translated" would be a claim with no content.
    expect(t('tab.title', undefined, { locale: 'en', namespace: NS })).not.toBe(
      t('tab.title', undefined, { locale: 'hi', namespace: NS }),
    )
  })

  it('⛔ the three PRE-EXISTING literals are NOT swept — Trap 4 fences that explicitly', () => {
    // ⚠ A tab-bar i18n sweep is a whole-bar decision and is ⛔ not this story's to take unasked.
    // ⭐ This assertion is what stops a well-meaning follow-up from doing it inside this story.
    expect(layoutCode).toContain("title: 'My Pool'")
    expect(layoutCode).toContain("title: 'Shradhanjali'")
    expect(layoutCode).toContain("title: 'Panchayat'")
  })

  it('⭐⭐ the 10.15 supersession is recorded BY NAME in the doc-block', () => {
    // ⛔ Without this the next author reads 10.15's *"the tab bar is at three"* rejection and reverts
    // the tab ([[feedback_supersede_never_reinterpret]]).
    expect(layout).toContain('10-15-survey-poll.md:134')
    expect(layout).toContain('2026-09-04-194')
  })
})
