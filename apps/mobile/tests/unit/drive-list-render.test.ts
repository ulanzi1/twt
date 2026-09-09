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
 */
const codeOnly = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

const listCode = codeOnly(list)
const layoutCode = codeOnly(layout)

const NS = 'member-drive-list'
const SHARED = 'sahyog-shared'

describe('⭐⭐ AC6 / Trap 3 — empty · loading · error render OUTSIDE the list', () => {
  it('⛔ the FlashList mounts ONLY in the populated branch — never as a ListEmptyComponent', () => {
    // ⭐ The empty branch is an early-`?` sibling on `drives.length === 0`; the list mounts in the
    // `else`. ⇒ the component never crosses empty → populated IN PLACE, which is the crash.
    expect(listCode).toMatch(/drives\.length === 0/)
    const emptyBranch = listCode.slice(
      listCode.indexOf('drives.length === 0'),
      listCode.lastIndexOf('FlashListAny'),
    )
    expect(emptyBranch).not.toContain('<FlashListAny')

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
    const labelCount = (listCode.match(/accessibilityLabel=/g) ?? []).length
    const accessibleCount = (listCode.match(/accessible(\s|=\{true\})/g) ?? []).length
    expect(labelCount).toBeGreaterThan(0)
    expect(
      accessibleCount,
      'an accessibilityLabel exists without a matching explicit `accessible` — the label will never be announced',
    ).toBeGreaterThanOrEqual(labelCount)
  })

  it('⛔ the ROW declares `text`, ⛔ never `button`/`link` — it has no handler (story F owns detail)', () => {
    // ⚠ A row that LOOKED tappable and did nothing would be the *"a role implying interaction has a
    // real handler"* failure AC5 forbids. The per-drive DETAIL view is story F (`11b-17`).
    const row = listCode.slice(listCode.indexOf('function DriveRow'))
    expect(row).toContain('accessibilityRole="text"')
    expect(row).not.toContain('accessibilityRole="button"')
    expect(row).not.toContain('accessibilityRole="link"')
    expect(row).not.toContain('onPress')
  })

  it('⭐ the row a11y label has a NO-FAMILY variant — ⛔ `t()` THROWS on an unsupplied token', () => {
    // ⚠⛔ THE VARIANT STOPS A CRASH, ⛔ it is not a nicety: `deceasedMemberName` is nullable on the
    // wire, and resolving `row.a11y` without `{family}` would take down the WHOLE list, not one row.
    expect(MemberDriveListEntry.shape.deceasedMemberName.isNullable()).toBe(true)
    expect(list).toContain("t('row.a11y.no_family'")
    for (const locale of ['en', 'hi'] as const) {
      const full = t('row.a11y', { family: 'X', stage: 'S', count: '1', amount: 'A' }, { locale, namespace: NS })
      const noFamily = t('row.a11y.no_family', { stage: 'S', count: '1', amount: 'A' }, { locale, namespace: NS })
      expect(full).toContain('X')
      expect(noFamily).not.toContain('X')
      // ⛔ The no-family arm must carry NO `{family}` token left to throw on.
      expect(getCatalog(locale, NS)?.['row.a11y.no_family']).not.toContain('{family}')
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
    expect(list).toContain("t('drive_target', { amount:")
    for (const locale of ['en', 'hi'] as const) {
      expect(t('drive_target', { amount: '₹ 8 lakh' }, { locale, namespace: SHARED })).toContain('₹ 8 lakh')
    }
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
