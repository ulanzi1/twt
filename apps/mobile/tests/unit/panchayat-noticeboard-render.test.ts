// The Panchayat Noticeboard fence — Story 11a.5 (Task 3; AC3/AC4). DB-free, RN-render-free.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native — see vitest.config.ts and the
// `banner-host-render.test.ts` / `status-pill-render.test.ts` precedent). So this file does three things:
//
//   1. UNIT-TESTS the pure logic split out of the component for exactly this reason — the banner-lane
//      adapter (`banner-notice.ts`) and the D6 token maps.
//   2. RESOLVES REAL i18n KEYS through the REAL `t()`. ⚠ This is not decoration: `t()` THROWS on an
//      unregistered namespace at RUNTIME while the `locales/`-walking parity gate stays GREEN, and that
//      exact defect shipped once (Story 11a.2's `/members` threw on every request on `main`).
//      `packages/i18n/src/catalog.ts` asks every new domain for precisely this test.
//   3. SOURCE-SCANS the render for the guarantees a pure test cannot otherwise reach: no fabricated
//      fixtures survive, no hex literal survives, the presenter drives composition, the loading state is
//      a skeleton rather than a spinner, and `<PollsEntry>` is still there and still unrestructured.

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { t } from '@twt/i18n'
import {
  NOTICEBOARD_CATEGORY_LABEL_KEYS,
  NOTICEBOARD_MASTHEAD_TITLE_KEY,
  NOTICEBOARD_NEXT_MEETING_HEADER_KEY,
  NOTICEBOARD_PINNED_EMPTY_KEY,
  NOTICEBOARD_PINNED_HEADER_KEY,
  NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
  NOTICEBOARD_ROW_DISMISSED_A11Y_KEY,
  NOTICEBOARD_ROW_DISMISS_A11Y_KEY,
  deriveNoticeboardViewModel,
} from '@twt/ui'
import type { MemberBannerResponse } from '@twt/contracts'
import { describe, expect, it } from 'vitest'

import {
  MEMBER_READ_AUDIENCE,
  toNoticeboardBannerNotice,
} from '../../components/panchayat/banner-notice'
import { CATEGORY_TOKENS, PINNED_ROW_OPACITY } from '../../components/panchayat/tokens'
import { formatCount } from '../../lib/format-count'

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const BOARD = 'apps/mobile/components/panchayat/PanchayatNoticeboard.tsx'
const ROW = 'apps/mobile/components/panchayat/PinnedItem.tsx'
const PANCHAYAT_DIR = 'apps/mobile/components/panchayat'

const BANNER: MemberBannerResponse = {
  banner_id: '11111111-1111-4111-8111-111111111111',
  title: 'Maintenance window',
  body: 'The app is unavailable 02:00–03:00 IST.',
  title_hi: 'रखरखाव अवधि',
  body_hi: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
  display_mode: 'banner',
  dismissible: true,
  display_once_per_member: false,
  severity: 'warning',
  revision: 1,
  valid_until: '2026-08-23T00:00:00.000Z',
}

describe('the banner-lane adapter — ONE query, ONE winner, at most ONE notice (D1(a)/D7(a))', () => {
  it('reshapes the server-resolved winner into the presenter singular slot, Hindi-first', () => {
    const notice = toNoticeboardBannerNotice(BANNER, 'hi')
    expect(notice).not.toBeNull()
    expect(notice!.id).toBe(BANNER.banner_id)
    expect(notice!.title).toBe(BANNER.title_hi)
    expect(notice!.body).toBe(BANNER.body_hi)
    expect(notice!.severity).toBe('warning')
    expect(notice!.dismissible).toBe(true)
    expect(notice!.validUntil.toISOString()).toBe(BANNER.valid_until)
  })

  it('renders the English variant under `en`', () => {
    expect(toNoticeboardBannerNotice(BANNER, 'en')!.title).toBe(BANNER.title)
  })

  it('yields NOTHING when there is no banner', () => {
    expect(toNoticeboardBannerNotice(null, 'hi')).toBeNull()
    expect(toNoticeboardBannerNotice(undefined, 'hi')).toBeNull()
  })

  it('yields NOTHING rather than a BLANK row when a banner has no copy in either language', () => {
    const blank = { ...BANNER, title: null, body: null, title_hi: null, body_hi: null }
    expect(toNoticeboardBannerNotice(blank, 'hi')).toBeNull()
  })

  it('turns an absent body into `null`, not an empty meta line', () => {
    const noBody = { ...BANNER, body: null, body_hi: null }
    expect(toNoticeboardBannerNotice(noBody, 'hi')!.body).toBeNull()
  })

  it('⛔ declares the FAIL-CLOSED audience for an authenticated member read (AC5)', () => {
    // `MemberBannerResponse` deliberately carries no `audience_scope`; the server already applied the
    // predicate. Declaring `members-all` is the MORE RESTRICTIVE of the possibilities — it can only ever
    // hide a notice from a signed-out viewer, never reveal one.
    expect(MEMBER_READ_AUDIENCE).toBe('members-all')
    expect(toNoticeboardBannerNotice(BANNER, 'hi')!.audience).toBe(MEMBER_READ_AUDIENCE)
    // …and it feeds a notice the presenter's tier filter actually admits for a member.
    const vm = deriveNoticeboardViewModel(
      {
        status: 'ready',
        viewer: { isAuthenticated: true },
        bannerNotice: toNoticeboardBannerNotice(BANNER, 'hi'),
      },
      new Date('2026-08-22T10:00:00.000Z'),
    )
    expect(vm.state).toBe('default')
  })

  it('⛔ re-derives NO precedence and reaches for NO second query (Trap 2 / D7(a))', () => {
    const src = stripComments(read('apps/mobile/components/panchayat/banner-notice.ts'))
    expect(/resolveVisibleBanners|compareBannerPrecedence|BANNER_SEVERITY_ORDER/.test(src)).toBe(false)
    expect(/useQuery|fetch\(|apiClient|bannerApi/.test(src)).toBe(false)
  })
})

describe('⭐ real i18n keys resolve through the REAL `t()` — the unregistered-namespace gate', () => {
  const KEYS = [
    NOTICEBOARD_MASTHEAD_TITLE_KEY,
    NOTICEBOARD_PINNED_HEADER_KEY,
    NOTICEBOARD_PINNED_EMPTY_KEY,
    NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
    NOTICEBOARD_NEXT_MEETING_HEADER_KEY,
    ...Object.values(NOTICEBOARD_CATEGORY_LABEL_KEYS),
    NOTICEBOARD_ROW_DISMISS_A11Y_KEY,
    NOTICEBOARD_ROW_DISMISSED_A11Y_KEY,
    'seal_a11y',
    'pinned_list_a11y',
    'loading_a11y',
  ]

  for (const locale of ['hi', 'en'] as const) {
    it(`[${locale}] every key the presenter and render emit resolves to non-empty copy`, () => {
      for (const key of KEYS) {
        const value = t(key, undefined, { locale, namespace: 'noticeboard' })
        expect(value.length, `${locale}/noticeboard:${key} is empty`).toBeGreaterThan(0)
      }
    })
  }

  it('carries the RATIFIED English empty copy verbatim (UX `:1808`)', () => {
    expect(t(NOTICEBOARD_PINNED_EMPTY_KEY, undefined, { locale: 'en', namespace: 'noticeboard' })).toBe(
      'No pinned notices',
    )
  })

  it('is hi-PRIMARY — the Hindi masthead is the Devanagari the prototype hardcoded', () => {
    expect(t(NOTICEBOARD_MASTHEAD_TITLE_KEY, undefined, { locale: 'hi', namespace: 'noticeboard' })).toBe(
      'परिवार की नब्ज़',
    )
  })
})

describe('⭐ the D6(a) token bridge — one named map, no hex, exhaustive by type', () => {
  it('maps EVERY §1819 category to a Tamagui scale token', () => {
    for (const category of ['terracotta', 'green', 'black', 'ink'] as const) {
      expect(CATEGORY_TOKENS[category].stub).toMatch(/^\$/)
    }
  })

  it('⛔ `saffron` is DEAD — not aliased, not kept', () => {
    expect(Object.keys(CATEGORY_TOKENS)).toEqual(['terracotta', 'green', 'black', 'ink'])
    expect(JSON.stringify(CATEGORY_TOKENS)).not.toContain('saffron')
    expect(stripComments(read(ROW))).not.toContain('saffron')
    expect(stripComments(read('apps/mobile/components/panchayat/tokens.ts'))).not.toContain('saffron')
  })

  it('⛔ contains NO colour hex — FM-14 #2 (the prototype had three, plus a black hairline)', () => {
    for (const file of ['tokens.ts', 'PinnedItem.tsx', 'PanchayatNoticeboard.tsx']) {
      const src = stripComments(read(`${PANCHAYAT_DIR}/${file}`))
      expect(/#[0-9a-fA-F]{3,8}\b/.test(src), `${file} still carries a colour hex`).toBe(false)
    }
  })

  it('⛔ does NOT add `@twt/tokens` to apps/mobile (D6(b), refused) …', () => {
    const pkg = JSON.parse(read('apps/mobile/package.json')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    expect('@twt/tokens' in pkg.dependencies).toBe(false)
    expect('@twt/tokens' in pkg.devDependencies).toBe(false)
  })

  it('⛔ … and does NOT touch tamagui.config.ts (D6(c), routed — blast radius is every surface)', () => {
    // The config still overrides FONTS only. A colour override here would have re-themed the whole app
    // from inside a one-tab story.
    const src = stripComments(read('apps/mobile/tamagui.config.ts'))
    expect(/@twt\/tokens/.test(src)).toBe(false)
  })

  it('⭐ gives EVERY category a LABEL key — ⚠ `black` is STILL SCHEDULED MEETING (D6(a), Trap 3)', () => {
    // ⭐ AMENDED, ⛔ NOT DELETED. Story 11a.6's D6(a) retires the four `open_detail_*` HINT keys — the row
    // is no longer a button and has no detail destination to promise — and moves the category into the
    // accessibility LABEL, which is what UX `:1820` asked for. ⚠ The half of the 11a.5 correction that is
    // ⛔ NOT negotiable survives VERBATIM: §491 `black` meant BEREAVEMENT, §1819 `black` means SCHEDULED
    // MEETING, so announcing "memorial" about a meeting notice stays wrong on the successor key too.
    expect(Object.keys(NOTICEBOARD_CATEGORY_LABEL_KEYS)).toEqual([
      'terracotta',
      'green',
      'black',
      'ink',
    ])
    const en = (k: string): string => t(k, undefined, { locale: 'en', namespace: 'noticeboard' })
    expect(en(NOTICEBOARD_CATEGORY_LABEL_KEYS.black)).toMatch(/meeting/i)
    expect(en(NOTICEBOARD_CATEGORY_LABEL_KEYS.black)).not.toMatch(/memorial/i)
    expect(stripComments(read(ROW))).not.toMatch(/memorial/i)
  })

  it('⛔ the retired `open_detail_*` keys are GONE from both catalogs — ⛔ not aliased, ⛔ not kept', () => {
    for (const locale of ['hi', 'en'] as const) {
      const catalog = JSON.parse(read(`packages/i18n/locales/${locale}/noticeboard.json`)) as Record<
        string,
        string
      >
      expect(Object.keys(catalog).filter((k) => k.startsWith('open_detail'))).toEqual([])
    }
    expect(stripComments(read(`${PANCHAYAT_DIR}/tokens.ts`))).not.toMatch(/CATEGORY_HINT_KEYS/)
  })

  it('⭐ maps BOTH ratified row states to an emphasis — exhaustive, ⛔ no inline opacity literal', () => {
    // The D4(a) counterpart of `CATEGORY_TOKENS`: the STATE is the presenter's property, the emphasis
    // VALUE is the render layer's. ⛔ Fading is never the sole channel — the presenter also appends a
    // `dismissed_a11y` label part, asserted in `packages/ui/tests/noticeboard/pinned-notice.test.ts`.
    expect(Object.keys(PINNED_ROW_OPACITY)).toEqual(['default', 'dismissed'])
    expect(PINNED_ROW_OPACITY.dismissed).toBeLessThan(PINNED_ROW_OPACITY.default)
    const row = stripComments(read(ROW))
    expect(/opacity=\{PINNED_ROW_OPACITY\[vm\.state\]\}/.test(row)).toBe(true)
    expect(/opacity=\{0?\.\d/.test(row), 'an inline opacity literal survives in the row').toBe(false)
  })
})

describe('⭐ NO FABRICATED DATA SURVIVES (AC4 / D3(a))', () => {
  it('the fixture module is DELETED — ⛔ not relocated and ⛔ not commented out', () => {
    expect(existsSync(path.join(repoRoot, `${PANCHAYAT_DIR}/sample-data.ts`))).toBe(false)
  })

  it('⛔ NONE of the five invented deceased-member names survives anywhere in the app', () => {
    // The sharpest edge in this story: five fabricated bereavement records rendered under हाल की आहुति
    // on a live member tab. Scanning the WHOLE app, not just the deleted file, so a copy-paste rescue
    // into another component is caught too.
    const INVENTED = ['दीनानाथ झा', 'शिवकुमारी देवी', 'विद्यानंद यादव', 'सुषमा कुमारी', 'महेश्वर पासवान']
    for (const file of ['PanchayatNoticeboard.tsx', 'PinnedItem.tsx', 'tokens.ts', 'banner-notice.ts']) {
      const src = read(`${PANCHAYAT_DIR}/${file}`)
      for (const name of INVENTED) {
        expect(src.includes(name), `${file} still carries the invented name ${name}`).toBe(false)
      }
    }
  })

  it('the render imports NO `SAMPLE_` fixture and builds none of its own', () => {
    const src = stripComments(read(BOARD))
    expect(/SAMPLE_/.test(src)).toBe(false)
    expect(/sample-data/.test(src)).toBe(false)
  })

  it('sections with no producer render NOTHING — ⛔ never a "coming soon" placeholder', () => {
    const src = stripComments(read(BOARD))
    expect(/coming soon|Coming Soon|जल्द/.test(src)).toBe(false)
    // The silent arm returns null; it does not fall through to the pinned section's copy.
    expect(/render\.kind === 'silent'[\s\S]{0,80}return null/.test(src)).toBe(true)
  })

  it('⛔ builds NO close-of-cycle and NO aggregate-stat read model', () => {
    const src = stripComments(read(BOARD))
    expect(/useQuery|closeOfCycle|close-of-cycle|statsApi|aggregate/.test(src)).toBe(false)
  })

  it('keeps the Latin-numeral discipline alive as a render util (Trap 6)', () => {
    // The behaviour survives the fixture module's deletion; ⛔ it did NOT move into @twt/ui.
    expect(formatCount(51_204)).toBe('51,204')
    expect(formatCount(7)).toBe('7')
    // Indian grouping, not Western: 1842 → 1,842 but 100000 → 1,00,000.
    expect(formatCount(100_000)).toBe('1,00,000')
    expect(/formatCount/.test(read('packages/ui/src/noticeboard/presenter.ts'))).toBe(false)
  })
})

describe('the render derives its COMPOSITION from the presenter (AC3)', () => {
  const src = stripComments(read(BOARD))

  it('calls `deriveNoticeboardViewModel` and walks `vm.sections` for ORDER', () => {
    expect(/deriveNoticeboardViewModel\(/.test(src)).toBe(true)
    expect(/vm\.sections\.map\(/.test(src)).toBe(true)
  })

  it('INJECTS `now` at the render boundary — the presenter never reaches for the clock', () => {
    expect(/deriveNoticeboardViewModel\([\s\S]{0,1200}new Date\(\)/.test(src)).toBe(true)
    expect(/new Date\(\)/.test(read('packages/ui/src/noticeboard/presenter.ts').replace(/\/\/.*$/gm, ''))).toBe(false)
  })

  it('maps all three load statuses, keeping `refreshing` distinct from `loading`', () => {
    expect(/isLoading \? 'loading' : isFetching \? 'refreshing' : 'ready'/.test(src)).toBe(true)
  })

  it('renders the ratified SKELETON on loading — ⛔ not a spinner, ⛔ not a blank screen', () => {
    expect(/PinnedSkeleton/.test(src)).toBe(true)
    expect(/ActivityIndicator|Spinner/.test(src)).toBe(false)
    // The row COUNT comes from the presenter's skeleton, never from this file.
    expect(/vm\.skeleton\?\.noticeRows/.test(src)).toBe(true)
  })

  it('resolves ALL chrome through the namespace-bound hook — ⛔ never bare `useT()`', () => {
    expect(/useNoticeboardT\(\)/.test(src)).toBe(true)
    expect(/\buseT\(\)/.test(src)).toBe(false)
    expect(/\buseT\(\)/.test(stripComments(read(ROW)))).toBe(false)
  })

  it('⛔ hardcodes NO Devanagari chrome literal — every string is a key', () => {
    // The prototype hardcoded परिवार की नब्ज़ / सूचना पट्ट / हाल की आहुति / अगली मासिक बैठक. The seal
    // glyph `ट` is the ONE exception: it is a Stamp-atom placeholder, not copy (UX spec line 679).
    const withoutSeal = src.replace(/>\s*ट\s*</g, '><')
    expect(/[ऀ-ॿ]/.test(withoutSeal), 'a Devanagari chrome literal survives in the render').toBe(
      false,
    )
  })

  it('keeps `<PollsEntry>` — Story 10.15 is an ADDITION, ⛔ never restructured by this story', () => {
    expect(/<PollsEntry \/>/.test(src)).toBe(true)
    // Its own render-nothing-when-empty behaviour is untouched: this screen renders it unconditionally
    // in its section slot and passes it nothing.
    expect(/<PollsEntry[^/]*\w+=/.test(src)).toBe(false)
  })

  it('removes the prototype-only P3 diagnostic panel per its own "production removes this"', () => {
    expect(/P3DiagnosticPanel/.test(src)).toBe(false)
    expect(existsSync(path.join(repoRoot, `${PANCHAYAT_DIR}/P3DiagnosticPanel.tsx`))).toBe(false)
  })

  it('preserves the a11y posture: header roles, a list announcement, an ordered read', () => {
    expect(/accessibilityRole="header"/.test(src)).toBe(true)
    expect(/accessibilityRole="list"/.test(src)).toBe(true)
    expect(/accessibilityLabel=\{t\('pinned_list_a11y'\)\}/.test(src)).toBe(true)
  })

  it('is NOT a FlatList — no empty→populated Fabric crash surface', () => {
    // [[project_fabric_flatlist_empty_populated_crash]]: the simple fix is not to introduce one.
    expect(/FlatList|SectionList|FlashList/.test(src)).toBe(false)
  })

  it('⛔ ships NO orientation prop — UX `:1806` is "full-width VERTICAL stack" only', () => {
    expect(/orientation|horizontal=\{?true/.test(src)).toBe(false)
  })
})

describe('⭐ the banner appears EXACTLY ONCE on the panchayat tab (Trap 3b / D7(a))', () => {
  it('the noticeboard renders the banner-sourced row in exactly ONE place', () => {
    const src = stripComments(read(BOARD))
    // One `<PinnedItem>` render site, fed by the presenter's single pinned-rows arm.
    expect(src.match(/<PinnedItem\b/g) ?? []).toHaveLength(1)
    expect(src.match(/toNoticeboardBannerNotice\(/g) ?? []).toHaveLength(1)
  })

  it('⛔ does NOT open a second banner query — it reads the EXISTING one', () => {
    const src = stripComments(read(BOARD))
    expect(/useMemberBannersQuery\(/.test(src)).toBe(true)
    // No parallel fetch, no second cache key, no duplicate MMKV entry.
    expect(src.match(/useMemberBannersQuery\(/g) ?? []).toHaveLength(1)
    expect(/MEMBER_BANNERS_QUERY_KEY\s*=/.test(src)).toBe(false)
  })

  it('⛔ does NOT reuse the `banner-strip` testID that belongs to `<BannerHost>`', () => {
    expect(/banner-strip/.test(read(BOARD))).toBe(false)
  })

  it('⭐ WIRES the dismiss path — through the EXISTING mutation, and ⛔ nothing new (Trap 3, AC3)', () => {
    // ⭐ THIS FENCE IS AMENDED INTO ITS INVERSE, ⛔ NOT DELETED. Story 11a.5 wrote it to hold the
    // interaction until 11a.6 arrived; this is 11a.6, so it now asserts the OTHER half — that the
    // acknowledgement is wired, and wired to what already exists.
    const board = stripComments(read(BOARD))
    expect(/useDismissBannerMutation\(pariwarId\)/.test(board)).toBe(true)
    expect(/dismiss\.mutate\(/.test(board)).toBe(true)
    expect(/kind: 'dismissed'/.test(board)).toBe(true)
    // ONE explicit activation (D3(a)) — ⛔ no confirmation modal, ⛔ no sheet, ⛔ no swipe-only path,
    // ⛔ no auto-dismiss on scroll or timer.
    // ⚠ `\bSheet\b` deliberately: `StyleSheet.hairlineWidth` is the section rule, not a bottom sheet.
    expect(
      /\bSheet\b|AlertDialog|Alert\.alert|confirm\(|setTimeout|Swipeable|PanGestureHandler/.test(board),
    ).toBe(
      false,
    )
  })

  it('⛔ introduces NO second mutation, endpoint, table or persistence layer (AC3)', () => {
    const board = stripComments(read(BOARD))
    const row = stripComments(read(ROW))
    for (const src of [board, row]) {
      // ⛔ No hand-rolled mutation and ⛔ no direct SDK/network call — the EXISTING hook or nothing.
      expect(/useMutation\(|bannerApi|fetch\(|axios/.test(src)).toBe(false)
      // ⛔ No local persistence: D3(c) refused an MMKV dismissal set, and the server is the authority.
      expect(/mmkv|MMKV|AsyncStorage|persist/i.test(src)).toBe(false)
    }
    // Exactly one dismiss mutation hook call, in the SCREEN. ⛔ The row holds none — it takes a callback.
    expect(board.match(/useDismissBannerMutation\(/g) ?? []).toHaveLength(1)
    expect(/useDismissBannerMutation|dismiss\.mutate/.test(row)).toBe(false)
  })

  it('⛔ NEVER posts `{kind:\'shown\'}` — `<BannerHost>` already reports it on this tab (Trap 4)', () => {
    // The `useRef` once-guard lives inside `<BannerHost>` and is NOT shared, so a second reporter is a
    // genuine double-post — and `shown` suppresses IDENTICALLY to `dismissed` (`enums.ts:91`), so the two
    // writers would race on the same suppression.
    for (const src of [stripComments(read(BOARD)), stripComments(read(ROW))]) {
      expect(/'shown'|"shown"/.test(src)).toBe(false)
    }
  })

  it('⭐ keys the optimistic window by `bannerId:revision` — ⛔ the format is NOT re-implemented (D5(a))', () => {
    // The routed 11a.5 code-review finding, closed BY DESIGN: the descriptor is not widened with 10.9's
    // `revision`; the SCREEN composes the key from the banner it already holds, through the ONE existing
    // helper. A bare-id key would let a stale in-session dismissal swallow a copy revision that is meant
    // to RE-SURFACE the notice.
    const board = stripComments(read(BOARD))
    expect(/bannerDismissalKey\(banner\.banner_id, banner\.revision\)/.test(board)).toBe(true)
    // ⛔ No second implementation of the `${id}:${revision}` format anywhere in the panchayat module.
    for (const file of ['PanchayatNoticeboard.tsx', 'PinnedItem.tsx', 'banner-notice.ts']) {
      expect(/:\$\{/.test(stripComments(read(`${PANCHAYAT_DIR}/${file}`))), file).toBe(false)
    }
  })

  it('⛔ rolls the optimistic acknowledgement BACK on write failure (AC3/D4(a))', () => {
    // A failed write must never permanently hide a notice the server did not suppress.
    const board = stripComments(read(BOARD))
    expect(/onError:[\s\S]{0,200}next\.delete\(key\)/.test(board)).toBe(true)
  })

  it('⛔ does NOT edit ANY of the four `components/banners/*` files (D7(a))', () => {
    // Zero edits: the noticeboard reuses the endpoint, the mutation hook and the key helper as they are.
    // Asserted by shape rather than by diff — each file still says what 10.9/11a.5 left it saying.
    expect(/MIN_TOUCH_TARGET = 44/.test(read('apps/mobile/components/banners/BannerHost.tsx'))).toBe(true)
    expect(
      /export function bannerDismissalKey/.test(read('apps/mobile/components/banners/copy.ts')),
    ).toBe(true)
    expect(
      /export function useDismissBannerMutation/.test(
        read('apps/mobile/components/banners/useMemberBannersQuery.ts'),
      ),
    ).toBe(true)
    expect(
      /export function isBannerRenderedByRoute/.test(
        read('apps/mobile/components/banners/route-suppression.ts'),
      ),
    ).toBe(true)
  })
})

describe('⭐ the ROW promoted — semantic accessibility and the affordance (AC1, AC3, AC6)', () => {
  const row = stripComments(read(ROW))

  it('⭐ the row is NON-INTERACTIVE CONTENT — the "tap to open detail" LIE is gone (D6(a), Trap 5)', () => {
    // The prototype announced `accessibilityRole="button"` over an EMPTY `onPress` body, with no detail
    // screen and no link CTA on the descriptor. The fix REMOVES the claim; ⛔ it does not invent a
    // destination, which would pre-empt the routed link-CTA item's trigger.
    expect(/Pressable/.test(row)).toBe(false)
    expect(/accessibilityHint/.test(row)).toBe(false)
    // The ONLY `accessibilityRole="button"` left is on the dismiss control, which actually does something.
    expect(row.match(/accessibilityRole="button"/g) ?? []).toHaveLength(1)
    expect(/onPress=\{onDismiss\}/.test(row)).toBe(true)
    // ⛔ No empty handler survives anywhere.
    expect(/onPress=\{\(\) => \{\s*\}\}/.test(row)).toBe(false)
  })

  it('⭐ title + meta read as ONE unit via an EXPLICIT `accessible` wrapper (UX `:1820`, Trap 5)', () => {
    // ⚠ RN defaults `Pressable` to `accessible={true}`, and that was the ONLY mechanism holding this
    // guarantee. D6(a) removes the `Pressable`, so the unit is re-established explicitly — around
    // title+meta ONLY, carrying the presenter's composed label.
    expect(/accessible=\{true\}/.test(row)).toBe(true)
    expect(/accessible=\{true\} accessibilityLabel=\{a11yLabel\}|accessibilityLabel=\{a11yLabel\}/.test(row)).toBe(
      true,
    )
    // ⛔ AND THE CONTROL IS A SIBLING, ⛔ NEVER A CHILD: the accessible <YStack> closes BEFORE the
    // <Button> opens. A control nested inside an `accessible` container is not individually focusable.
    const wrapperClose = row.indexOf('</YStack>')
    const buttonOpen = row.indexOf('<Button')
    expect(wrapperClose).toBeGreaterThan(-1)
    expect(buttonOpen).toBeGreaterThan(wrapperClose)
  })

  it('⛔ composes NO label string of its own — the composition is the presenter\'s (AC6)', () => {
    expect(/derivePinnedNoticeViewModel\(/.test(row)).toBe(true)
    expect(/PINNED_NOTICE_A11Y_SEPARATOR/.test(row)).toBe(true)
    // The shipped defect: `` `${item.title}. ${item.meta}` `` produced ". <meta>" on an empty title.
    expect(/\$\{item\.title\}|\$\{vm\.title\}/.test(row)).toBe(false)
  })

  it('⭐ the affordance is a PRESENTER PROPERTY, and ⛔ `dismissible: false` renders none (AC3)', () => {
    // A non-dismissible `banner` is LEGAL and reachable (`packages/domain/src/banners/errors.ts:84-86`);
    // only a POPUP must be dismissible. The guard is `vm.dismiss`, ⛔ never an inline `item.dismissible`
    // condition in JSX — which is also what makes it assertable in this renderer-free harness.
    expect(/\{vm\.dismiss !== null && \(/.test(row)).toBe(true)
    expect(/item\.dismissible|row\.dismissible/.test(row)).toBe(false)
  })

  it('⭐ meets the ≥44pt touch-target floor, as a NAMED constant (AC3, UX `:2310`)', () => {
    expect(/const MIN_TOUCH_TARGET = 44/.test(row)).toBe(true)
    expect(/minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET/.test(row)).toBe(true)
    expect(/accessibilityLabel=\{t\(vm\.dismiss\.labelKey\)\}/.test(row)).toBe(true)
  })

  it('⛔ re-implements NO tier filter and takes NO viewer input (AC5)', () => {
    // A row reaches here only after the strip presenter's `isVisibleToViewer` passed it; a second filter
    // could only ever DISAGREE with the first.
    expect(/isVisibleToViewer|AUDIENCE_VISIBILITY|audience|isAuthenticated|useSession/.test(row)).toBe(
      false,
    )
  })

  it('⛔ adds NO severity axis to the row — D2(a) maps severity INTO `category` (Trap 2)', () => {
    expect(/severity|SEVERITY_TOKENS|info|warning|critical/.test(row)).toBe(false)
    // ⛔ And exactly ONE colour slot: the stub. No second tint, badge or icon keyed by anything else.
    expect(row.match(/CATEGORY_TOKENS\[/g) ?? []).toHaveLength(1)
  })

  it('⛔ ships NO new above-the-fold surface, sticky header or second mount point (AC1/D1(a))', () => {
    const board = stripComments(read(BOARD))
    for (const src of [board, row]) {
      expect(/sticky|stickyHeader|position: 'absolute'|zIndex/.test(src)).toBe(false)
      expect(/BannerHost/.test(src)).toBe(false)
    }
  })
})
