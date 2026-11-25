// @vitest-environment jsdom
// Story 3.15d, Task 6.1 (S7, S8; AC 2, AC 3) — the workplace picker (`components/workplace/WorkplacePicker.tsx`) EXECUTED with React DOM and
// mocked native primitives. There was NO render test for it (`workplace-screen-render.test.ts` mocks it away; only source scans touched
// it), so this is a NEW harness: FlashList (the `known-people-find-render` precedent), tamagui (recording `testID` / `color` /
// `fontSize`, forwarding `accessibilityLiveRegion` → `aria-live`), `react-native` (`Platform` is a getter), the two query hooks (MUTABLE
// results carrying `errorUpdateCount`, `isError`, `isPending`, `hasNextPage`, `isFetchNextPageError`) and a workplace `t` that is a NEW
// function each render and locale-DISTINCT after a switch. Native layout and a real screen reader still need a device.
//
// What it shows — two lines the story makes "spoken again", per platform (3.15c-dev Y1):
//   · S7 `districts_error` — the error SCREEN that replaces the whole picker. Spoken when the query's `errorUpdateCount` moves while the
//     query is in `error` (cached districts + a Retry that failed again: `status` stays `error`, the screen stays mounted, the words are
//     the same). The effect sits in the picker body ABOVE the `isPending` early return (mobile has ⛔ `react-hooks` lint — the leg that
//     takes ONE mounted picker from `isPending` to loaded is the only guard against a misplaced hook), and re-checks `districts.isError`
//     (live here: the count never resets, so a remount after a SUCCESS holds a non-zero count and must stay silent).
//   · S8 `search_error` beside "Show more" — a CHILD rendered inside the `hasNextPage && isFetchNextPageError` branch, so a page-1 refetch
//     failure (which moves the same count, and shows the OTHER `search_error` line) unmounts it: the structure is the answer, ⛔ a re-check.
// Counts are RUNNING TOTALS of `announce` calls BY TEXT (`useAnnounceOnChange` also announces each phase's title); every positive is awaited,
// every "nothing more" is asserted after a flush (an `act` + one macrotask — the announce-after-heading race).
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NBSP, sentAs } from './announce-text'

const mock = vi.hoisted(() => ({
  districts: null as unknown,
  search: null as unknown,
  os: 'ios' as 'ios' | 'android',
  locale: 'en',
  announce: vi.fn(),
  invalidate: vi.fn(async () => undefined),
}))

vi.mock('../../components/workplace/useWorkplaceQueries', () => ({
  useWorkplaceDistrictsQuery: () => mock.districts,
  useWorkplaceSearchQuery: () => mock.search,
  workplaceKeys: { all: ['workplace'] },
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mock.invalidate }) }))
vi.mock('../../lib/member-api', () => ({ memberAuth: { lifeEventsUpdatePosting: vi.fn() } }))
vi.mock('../../lib/idempotency-key', () => ({ newIdempotencyKey: () => 'key-1' }))
vi.mock('../../components/known-people/known-people-cache', () => ({ invalidateKnownPeoplePrompts: vi.fn() }))
const echo = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).map(String).join(',')}` : key)
// `en`: the echo (the bare key); any other locale: `<locale>:<echo>` — locale-DISTINCT; a NEW function per call, as the real hook is.
vi.mock('../../lib/workplace-i18n', () => ({
  useWorkplaceT: () => (key: string, params?: Record<string, unknown>) => (mock.locale === 'en' ? echo(key, params) : `${mock.locale}:${echo(key, params)}`),
}))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: React.ReactNode }) => createElement('div', null, children),
    Platform: {
      get OS() {
        return mock.os
      },
    },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
  }
})
vi.mock('@shopify/flash-list', async () => {
  const { createElement, Fragment } = await import('react')
  return {
    FlashList: ({ data, renderItem, keyExtractor }: { data: unknown[]; renderItem: (a: { item: unknown; index: number }) => React.ReactNode; keyExtractor: (i: unknown) => string }) =>
      createElement('div', { 'data-testid': 'flash-list' }, data.map((item, index) => createElement(Fragment, { key: keyExtractor(item) }, renderItem({ item, index })))),
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type P = {
    children?: React.ReactNode
    accessibilityRole?: string
    accessibilityLabel?: string
    accessibilityLiveRegion?: string
    accessibilityState?: { checked?: boolean; disabled?: boolean }
    testID?: string
    color?: string
    fontSize?: string
    onPress?: () => void
    disabled?: boolean
  }
  const container = (p: P) =>
    createElement(
      'div',
      {
        role: p.accessibilityRole === 'alert' || p.accessibilityRole === 'radiogroup' ? p.accessibilityRole : undefined,
        'aria-live': p.accessibilityLiveRegion,
        'data-testid': p.testID,
        'data-color': p.color,
        'data-font-size': p.fontSize,
      },
      p.children,
    )
  return {
    H2: container,
    Paragraph: container,
    Text: container,
    View: container,
    XStack: container,
    YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Input: ({ value, onChangeText, accessibilityLabel }: { value?: string; onChangeText?: (v: string) => void; accessibilityLabel?: string }) =>
      createElement('input', { value, 'aria-label': accessibilityLabel, onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value) }),
    Button: (p: P) =>
      createElement(
        'button',
        { onClick: p.onPress, disabled: p.disabled, role: p.accessibilityRole, 'aria-label': p.accessibilityLabel, 'aria-checked': p.accessibilityState?.checked },
        p.children,
      ),
  }
})

import { WorkplacePicker } from '../../components/workplace/WorkplacePicker'

const props = { submitLabel: 'save', onSaved: () => undefined, onCancel: () => undefined }
const base = () => ({ refetch: vi.fn(), fetchNextPage: vi.fn() })
// ── the districts query ──
const districtsLoaded = (over: Record<string, unknown> = {}) => ({
  ...base(),
  isPending: false,
  isError: false,
  errorUpdateCount: 0,
  data: { hasList: true, items: [{ district: 'Patna' }] },
  ...over,
})
const districtsPending = () => ({ ...base(), isPending: true, isError: false, errorUpdateCount: 0, data: undefined })
/** The query is in `error` WITH its cached districts (a refetch failed): `status` stays `error`, `isPending` is false, the data is kept. */
const districtsFailed = (count: number) => districtsLoaded({ isError: true, errorUpdateCount: count })
/** A first load that failed: ⛔ cached data. */
const districtsFailedNoData = (count: number) => ({ ...base(), isPending: false, isError: true, errorUpdateCount: count, data: undefined })
// ── the search query ──
const WP = { workplaceId: 'w-1', name: 'GMS RAMPUR', villageName: 'Rampur', clusterName: 'North' }
const searchOk = (over: Record<string, unknown> = {}) => ({
  ...base(),
  data: { pages: [{ items: [WP] }] },
  isLoading: false,
  isPlaceholderData: false,
  isError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
  hasNextPage: true,
  errorUpdateCount: 0,
  ...over,
})
const searchMoreFailed = (count: number) => searchOk({ isError: true, isFetchNextPageError: true, errorUpdateCount: count })
/** A failed REFETCH of page 1: `fetchMeta` is cleared, so the flag is false — and the count moves all the same. */
const searchPageOneFailed = (count: number) => searchOk({ isError: true, isFetchNextPageError: false, isFetching: false, errorUpdateCount: count })

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const sentOf = (text: string) => sentAs(mock.announce.mock.calls, text)
const sends = (os: string, text: string, n: number) => Array.from({ length: n }, (_, k) => text + (os === 'android' ? NBSP.repeat(k) : ''))

beforeEach(() => {
  mock.districts = districtsLoaded()
  mock.search = searchOk()
  mock.os = 'ios'
  mock.locale = 'en'
  mock.announce.mockClear()
})
afterEach(cleanup)

const mountPicker = () => render(createElement(WorkplacePicker, props))
const rerender = (view: ReturnType<typeof render>) => view.rerender(createElement(WorkplacePicker, props))
/** district → "At a school" → the search phase (clicks, as the member does). */
async function toSearch(view: ReturnType<typeof render>) {
  await userEvent.click(screen.getByRole('radio', { name: 'Patna' }))
  await userEvent.click(screen.getByRole('radio', { name: 'kind_school' }))
  expect(await screen.findByLabelText('search_label_school', { selector: 'input' })).toBeInTheDocument()
  return view
}

for (const os of ['ios', 'android'] as const) {
  describe(`S7 — the districts error screen (${os})`, () => {
    const WORDS = 'districts_error'
    beforeEach(() => {
      mock.os = os
    })

    it('(a) cached districts + a failed refetch (spoken once), Retry fails AGAIN (the count moves, the SAME words) ⇒ spoken again; (e) nothing before the failure', async () => {
      const view = mountPicker()
      await flush()
      expect(sentOf(WORDS)).toHaveLength(0)
      mock.districts = districtsFailed(1)
      rerender(view)
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.districts = districtsFailed(2)
      rerender(view)
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(2))
      expect(sentOf(WORDS)).toEqual(sends(os, WORDS, 2))
    })

    it('(e) a view that MOUNTS in `error` speaks it once', async () => {
      mock.districts = districtsFailed(1)
      mountPicker()
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      await flush()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(e) a REMOUNT after a SUCCESS holds a non-zero count and stays SILENT — the `isError` re-check (the one re-check that is live)', async () => {
      mock.districts = districtsLoaded({ errorUpdateCount: 2 })
      mountPicker()
      await flush()
      expect(sentOf(WORDS)).toHaveLength(0)
      expect(screen.queryByTestId('workplace-districts-error')).toBeNull()
    })

    it('(b) a re-render beside the standing line sends nothing more; (d) role alert, ⛔ live region, testID, the look', async () => {
      mock.districts = districtsFailed(1)
      const view = mountPicker()
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      const line = screen.getByTestId('workplace-districts-error')
      expect(line).toHaveAttribute('role', 'alert')
      expect(line).not.toHaveAttribute('aria-live')
      expect(line).toHaveAttribute('data-color', '#C0392B')
      expect(line).toHaveAttribute('data-font-size', '$2')
      rerender(view)
      rerender(view)
      await flush()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(c) a later SUCCESS clears the screen and speaks nothing (the count is unchanged)', async () => {
      mock.districts = districtsFailed(1)
      const view = mountPicker()
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.districts = districtsLoaded({ errorUpdateCount: 1 })
      rerender(view)
      await flush()
      expect(screen.queryByTestId('workplace-districts-error')).toBeNull()
      expect(screen.getByRole('radio', { name: 'Patna' })).toBeInTheDocument()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(f) a LOCALE SWITCH while the line stands sends nothing more (the line itself shows the new words)', async () => {
      mock.districts = districtsFailed(1)
      const view = mountPicker()
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.locale = 'hi'
      rerender(view) // `useWorkplaceT()` is a NEW function now, the words are `hi:…`
      await flush()
      expect(screen.getByTestId('workplace-districts-error')).toHaveTextContent(`hi:${WORDS}`)
      expect(sentOf(WORDS)).toHaveLength(1)
      expect(sentOf(`hi:${WORDS}`)).toHaveLength(0)
    })

    it('with ⛔ cached data the existing first-failure behaviour is kept: loading → error (spoken once); Retry → loading → error again (spoken again, the remount)', async () => {
      mock.districts = districtsPending()
      const view = mountPicker()
      await waitFor(() => expect(screen.getByText('districts_loading')).toBeInTheDocument())
      mock.districts = districtsFailedNoData(1)
      rerender(view)
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.districts = districtsPending() // Retry: no data ⇒ `status` goes `pending`
      rerender(view)
      expect(screen.queryByTestId('workplace-districts-error')).toBeNull()
      mock.districts = districtsFailedNoData(2)
      rerender(view)
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(2))
      await flush()
      expect(sentOf(WORDS)).toEqual(sends(os, WORDS, 2))
    })

    it('HOOK ORDER — ONE mounted picker goes `isPending` → loaded → `error` (a hook placed after the `isPending` early return would throw here)', async () => {
      mock.districts = districtsPending()
      const view = mountPicker()
      expect(screen.getByText('districts_loading')).toBeInTheDocument()
      mock.districts = districtsLoaded()
      rerender(view)
      expect(screen.getByRole('radio', { name: 'Patna' })).toBeInTheDocument()
      mock.districts = districtsFailed(1)
      rerender(view)
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
    })
  })

  describe(`S8 — the Show-more search error line (${os})`, () => {
    const WORDS = 'search_error'
    beforeEach(() => {
      mock.os = os
    })

    it('(a) Show more fails (the line mounts: spoken once), Retry fails AGAIN (the count moves, the SAME words) ⇒ spoken again; (e) nothing before', async () => {
      const view = await toSearch(mountPicker())
      await flush()
      expect(sentOf(WORDS)).toHaveLength(0)
      mock.search = searchMoreFailed(1)
      rerender(view)
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.search = searchMoreFailed(2)
      rerender(view)
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(2))
      expect(sentOf(WORDS)).toEqual(sends(os, WORDS, 2))
    })

    it('(e) a view that reaches the search phase HOLDING the Show-more error speaks it once', async () => {
      mock.search = searchMoreFailed(1)
      await toSearch(mountPicker())
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      await flush()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(b) a re-render beside the standing line sends nothing more; (d) role alert, ⛔ live region, testID, the look', async () => {
      mock.search = searchMoreFailed(1)
      const view = await toSearch(mountPicker())
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      const line = screen.getByTestId('workplace-search-more-error')
      expect(line).toHaveAttribute('role', 'alert')
      expect(line).not.toHaveAttribute('aria-live')
      expect(line).toHaveAttribute('data-color', '#C0392B')
      expect(line).toHaveAttribute('data-font-size', '$2')
      rerender(view)
      rerender(view)
      await flush()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(c) the line CLEARED — a changed `q` (a new query key: other flags) — speaks nothing and the line is gone', async () => {
      mock.search = searchMoreFailed(1)
      await toSearch(mountPicker())
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.search = searchOk() // the NEW key's result
      await userEvent.type(screen.getByLabelText('search_label_school', { selector: 'input' }), 'x')
      await flush()
      expect(screen.queryByTestId('workplace-search-more-error')).toBeNull()
      expect(sentOf(WORDS)).toHaveLength(1)
    })

    it('(f) a LOCALE SWITCH while the line stands sends nothing more (the line itself shows the new words)', async () => {
      mock.search = searchMoreFailed(1)
      const view = await toSearch(mountPicker())
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1))
      mock.locale = 'hi'
      rerender(view)
      await flush()
      expect(screen.getByTestId('workplace-search-more-error')).toHaveTextContent(`hi:${WORDS}`)
      expect(sentOf(WORDS)).toHaveLength(1)
      expect(sentOf(`hi:${WORDS}`)).toHaveLength(0)
    })

    it('a PAGE-1 refetch failure moves the same count but does ⛔ speak the Show-more line — its own line is the other one (running totals per platform)', async () => {
      mock.search = searchMoreFailed(1)
      const view = await toSearch(mountPicker())
      await waitFor(() => expect(sentOf(WORDS)).toHaveLength(1)) // the Show-more line's own mount: 1 on BOTH platforms
      mock.search = searchPageOneFailed(2)
      rerender(view)
      await flush()
      // The page-1 line is still `AnnouncedText` (same words): its mount adds 1 on iOS (an announce) and ⛔ on Android (a live region, which
      // jsdom cannot hear) — a Show-more child hoisted out of its branch would speak here too and make this 3 / 2.
      expect(sentOf(WORDS)).toHaveLength(os === 'ios' ? 2 : 1)
      expect(screen.queryByTestId('workplace-search-more-error')).toBeNull()
      expect(screen.getAllByRole('alert')).toHaveLength(1)
    })
  })
}
