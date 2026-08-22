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
  NOTICEBOARD_MASTHEAD_TITLE_KEY,
  NOTICEBOARD_NEXT_MEETING_HEADER_KEY,
  NOTICEBOARD_PINNED_EMPTY_KEY,
  NOTICEBOARD_PINNED_HEADER_KEY,
  NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
  deriveNoticeboardViewModel,
} from '@twt/ui'
import type { MemberBannerResponse } from '@twt/contracts'
import { describe, expect, it } from 'vitest'

import {
  MEMBER_READ_AUDIENCE,
  toNoticeboardBannerNotice,
} from '../../components/panchayat/banner-notice'
import { CATEGORY_HINT_KEYS, CATEGORY_TOKENS } from '../../components/panchayat/tokens'
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
    ...Object.values(CATEGORY_HINT_KEYS),
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

  it('gives EVERY category a corrected a11y hint key — ⚠ `black` is now SCHEDULED MEETING', () => {
    expect(Object.keys(CATEGORY_HINT_KEYS)).toEqual(['terracotta', 'green', 'black', 'ink'])
    // The correction itself: the prototype announced `black` as "memorial", which §1819 makes wrong.
    const en = (k: string): string => t(k, undefined, { locale: 'en', namespace: 'noticeboard' })
    expect(en(CATEGORY_HINT_KEYS.black)).toMatch(/meeting/i)
    expect(en(CATEGORY_HINT_KEYS.black)).not.toMatch(/memorial/i)
    expect(stripComments(read(ROW))).not.toMatch(/memorial/i)
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

  it('⛔ wires NO dismiss path — `dismissible` is a FLAG and 11a.6 owns the interaction (AC6)', () => {
    const board = stripComments(read(BOARD))
    const row = stripComments(read(ROW))
    for (const src of [board, row]) {
      expect(/useDismissBannerMutation|DismissBannerResponse|dismiss\.mutate/.test(src)).toBe(false)
    }
  })
})
