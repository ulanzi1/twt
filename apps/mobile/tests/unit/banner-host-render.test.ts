// The mobile <BannerHost> fence — Story 10.9 (Task 7; AC3/AC8). DB-free, RN-render-free.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native — RN component MOUNT tests
// aren't set up here; see vitest.config.ts + the status-pill-render.test.ts precedent). So this
// file does two things:
//
//   1. UNIT-TESTS the pure logic that was split out of the component for exactly this reason —
//      Hindi-first copy selection and the revision-aware dismissal key.
//   2. SOURCE-SCANS the component for the guarantees a pure test cannot otherwise reach: the
//      self-suppression arms, severity exhaustiveness, the ≥44pt dismiss target, the display-once
//      double-post guard, and the AC8 prohibition on Alert.alert / alert() / confirm().
//
// A source scan (comments stripped — the 8.11 false-negative fix) rather than a mount, but the
// severity check is driven by the REAL contract enum, so it is not a static string match: it fails
// if the vocabulary grows and the mobile palette map does not keep up.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BANNER_SEVERITIES } from '@twt/contracts'
import { describe, expect, it } from 'vitest'

import { bannerDismissalKey, selectBannerCopy } from '../../components/banners/copy'

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const HOST = 'apps/mobile/components/banners/BannerHost.tsx'
const LAYOUT = 'apps/mobile/app/(tabs)/_layout.tsx'

const full = {
  title: 'Maintenance window',
  body: 'The app is unavailable 02:00–03:00 IST.',
  title_hi: 'रखरखाव अवधि',
  body_hi: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
}

describe('selectBannerCopy — Hindi-first (AC8)', () => {
  it('renders the HINDI variant under the default `hi` locale', () => {
    expect(selectBannerCopy(full, 'hi')).toEqual({ title: full.title_hi, body: full.body_hi })
  });

  it('renders the ENGLISH variant under `en`', () => {
    expect(selectBannerCopy(full, 'en')).toEqual({ title: full.title, body: full.body })
  })

  it('treats any non-`en` locale as Hindi-first (the app default is hi)', () => {
    expect(selectBannerCopy(full, '').title).toBe(full.title_hi)
  })

  it('falls back to the other language rather than rendering a BLANK banner', () => {
    expect(selectBannerCopy({ ...full, title_hi: null, body_hi: null }, 'hi')).toEqual({
      title: full.title,
      body: full.body,
    })
    expect(selectBannerCopy({ ...full, title: null, body: null }, 'en')).toEqual({
      title: full.title_hi,
      body: full.body_hi,
    })
  })

  it('yields empty strings when a field is absent on BOTH sides (the host renders nothing)', () => {
    expect(selectBannerCopy({ title: null, body: null, title_hi: null, body_hi: null }, 'hi')).toEqual({
      title: '',
      body: '',
    })
  })
})

describe('bannerDismissalKey — revision-aware (AC3)', () => {
  it('keys on banner_id AND revision, so a copy revision re-surfaces the banner', () => {
    expect(bannerDismissalKey('b1', 1)).toBe('b1:1')
    // The whole point: a dismissal recorded against revision 1 must NOT suppress revision 2.
    expect(bannerDismissalKey('b1', 1)).not.toBe(bannerDismissalKey('b1', 2))
  })

  it('distinguishes different banners at the same revision', () => {
    expect(bannerDismissalKey('b1', 1)).not.toBe(bannerDismissalKey('b2', 1))
  })
})

describe('<BannerHost> source fence', () => {
  const src = stripComments(read(HOST))

  it('maps EVERY severity the contract can emit (no unstyled banner)', () => {
    for (const severity of BANNER_SEVERITIES) {
      expect(
        new RegExp(`\\b${severity}:\\s*\\{`).test(src),
        `BannerHost SEVERITY_TOKENS has no '${severity}' entry — that severity would render with no ` +
          `colour. Add the mobile-palette triple.`,
      ).toBe(true)
    }
  })

  it('SELF-SUPPRESSES on no session, loading, error, and empty (the fail-soft house rule, AC8)', () => {
    // One combined early return covers session/loading/error/absent-data…
    expect(/if\s*\(!pariwarId\s*\|\|\s*isLoading\s*\|\|\s*isError\s*\|\|\s*!data\)\s*return null/.test(src)).toBe(true)
    // …and a second covers "nothing visible in either lane".
    expect(/if\s*\(!visibleBanner\s*&&\s*!visiblePopup\)\s*return null/.test(src)).toBe(true)
  })

  it('uses NO Alert.alert, alert() or confirm() — the popup is a rendered surface (AC8)', () => {
    expect(/\bAlert\.alert\b/.test(src)).toBe(false)
    expect(/(^|[^.\w])alert\s*\(/.test(src)).toBe(false)
    expect(/(^|[^.\w])confirm\s*\(/.test(src)).toBe(false)
    // …and it does not reach for the RN Modal either — a Tamagui overlay keeps the host self-contained.
    expect(/from 'react-native'[\s\S]{0,120}\bModal\b/.test(src)).toBe(false)
  })

  it('gives the dismiss affordance a ≥44pt touch target', () => {
    expect(/MIN_TOUCH_TARGET\s*=\s*(4[4-9]|[5-9]\d)/.test(src)).toBe(true)
    expect(/minWidth:\s*MIN_TOUCH_TARGET/.test(src)).toBe(true)
    expect(/minHeight:\s*MIN_TOUCH_TARGET/.test(src)).toBe(true)
  })

  it('renders the dismiss affordance ONLY when the banner is dismissible (AC4 in the render)', () => {
    expect(/\{banner\.dismissible\s*&&\s*\(/.test(src)).toBe(true)
  })

  it('guards the display-once `shown` post against a re-render double-fire (AC3)', () => {
    expect(/shownReported\.current\.has\(/.test(src)).toBe(true)
    expect(/shownReported\.current\.add\(/.test(src)).toBe(true)
    expect(/kind:\s*'shown'/.test(src)).toBe(true)
  })

  it('removes the banner OPTIMISTICALLY on dismiss and reconciles on refetch (AC8)', () => {
    expect(/setLocallyDismissed\(/.test(src)).toBe(true)
    expect(/locallyDismissed\.has\(/.test(src)).toBe(true)
  })

  it('renders BOTH lanes independently — a popup never suppresses the strip (AC5)', () => {
    // Two separate conditional blocks, each keyed off its own resolved slot.
    expect(/\{visibleBanner\s*&&\s*\(/.test(src)).toBe(true)
    expect(/\{visiblePopup\s*&&\s*\(/.test(src)).toBe(true)
    // Neither is nested inside the other's condition (no `visiblePopup ? … : visibleBanner`).
    expect(/visiblePopup\s*\?[\s\S]{0,80}visibleBanner/.test(src)).toBe(false)
  })

  it('re-implements NO precedence — it renders the server-resolved pair (AC5)', () => {
    expect(/resolveVisibleBanners|compareBannerPrecedence|BANNER_SEVERITY_ORDER/.test(src)).toBe(false)
    expect(/data\?\.banner\s*\?\?\s*null/.test(src)).toBe(true)
    expect(/data\?\.popup\s*\?\?\s*null/.test(src)).toBe(true)
  })

  it('announces the banner when it appears, politely (UX Pattern 9 a11y)', () => {
    expect(/accessibilityLiveRegion="polite"/.test(src)).toBe(true)
    expect(/accessibilityLiveRegion="assertive"/.test(src)).toBe(false)
  })

  it('is NOT a FlatList — no empty→populated Fabric crash surface', () => {
    // [[project_fabric_flatlist_empty_populated_crash]]: the simple fix is not to introduce one.
    expect(/FlatList|SectionList/.test(src)).toBe(false)
  })
})

describe('the mount point (the recorded architecture substitution)', () => {
  it('mounts <BannerHost> in the AUTHENTICATED (tabs) layout, above the tab navigator', () => {
    const src = stripComments(read(LAYOUT))
    expect(/import \{ BannerHost \}/.test(src)).toBe(true)
    expect(/<BannerHost \/>/.test(src)).toBe(true)
    // Above the navigator, so the strip is a full-width band at the top of the surface.
    expect(src.indexOf('<BannerHost />')).toBeLessThan(src.indexOf('<Tabs'))
  })

  it('does NOT mount it in the root layout, which also wraps the unauthenticated (auth) group', () => {
    const rootLayout = stripComments(read('apps/mobile/app/_layout.tsx'))
    expect(/BannerHost/.test(rootLayout)).toBe(false)
  })
})
