// @vitest-environment jsdom
// Story 3.13a (Task 3; AC5, DL8; `-509`) — the help form's optional `category` route parameter, EXECUTED: the REAL `new.tsx`, the
// REAL categories hook over a REAL `QueryClient` (`retry: false`), the REAL draft store over an in-memory MMKV. Stubbed: the
// transport (`lib/helpdesk-api`), the session, Turnstile, the two pickers, the navigator and the tamagui primitives (the Button
// mock forwards `accessibilityState.selected`). Story 10.2 / 10.29's source pins (`helpdesk-screens-render.test.ts`) stay as they
// are; the once-only pin on the tap's `setCategory(c.category)` is here.
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Categories = { categories: { category: string; sub_categories: string[] }[] }

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  params: {} as Record<string, string | string[] | undefined>,
  categories: vi.fn<() => Promise<Categories>>(),
}))

vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => void mock.store.set(k, v),
    removeItem: (k: string) => void mock.store.delete(k),
  },
}))
vi.mock('../../lib/helpdesk-api', () => ({ helpdeskApi: { categories: () => mock.categories(), createTicket: vi.fn() } }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm-1', pariwarId: 'p-1' }, isLoading: false }) }))
vi.mock('../../lib/turnstile', () => ({ getTurnstileToken: async () => 'tok' }))
vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }))
vi.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: vi.fn(), launchImageLibraryAsync: vi.fn() }))
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key }))
vi.mock('react-native', () => ({ ScrollView: ({ children }: { children?: React.ReactNode }) => children }))
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => mock.params,
  Stack: { Screen: () => null },
}))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
  return {
    YStack: container,
    XStack: container,
    H2: container,
    Paragraph: container,
    Text: container,
    Spinner: () => createElement('div', { 'data-testid': 'spinner' }),
    Input: (p: { value?: string; onChangeText?: (v: string) => void; accessibilityLabel?: string }) =>
      createElement('input', { value: p.value ?? '', 'aria-label': p.accessibilityLabel, onChange: (e: { target: { value: string } }) => p.onChangeText?.(e.target.value) }),
    Button: (p: { children?: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityState?: { selected?: boolean; checked?: boolean } }) =>
      createElement(
        'button',
        { onClick: p.onPress, disabled: p.disabled, 'data-selected': String(p.accessibilityState?.selected ?? false) },
        p.children,
      ),
  }
})

import HelpdeskNewScreen from '../../app/(helpdesk)/new'

const DRAFT_KEY = 'helpdesk-draft:m-1'
const LIST: Categories = {
  categories: [
    { category: 'kyc-trouble', sub_categories: [] },
    { category: 'payment-trouble', sub_categories: [] },
    { category: 'other', sub_categories: [] },
  ],
}
const label = (c: string) => `category.${c}.label`
const selected = () =>
  screen.queryAllByRole('button').filter((b) => b.getAttribute('data-selected') === 'true').map((b) => b.textContent)
const draft = () => JSON.parse(mock.store.get(DRAFT_KEY) ?? '{}') as Record<string, unknown>

let client: QueryClient
const app = () => render(createElement(QueryClientProvider, { client }, createElement(HelpdeskNewScreen)))
const listLoaded = () => waitFor(() => expect(screen.getByText(label('other'))).toBeInTheDocument())

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  mock.store.clear()
  mock.params = {}
  mock.categories.mockReset()
})
afterEach(() => {
  cleanup()
  client.clear()
})

describe('Story 3.13a DL8 — `category=kyc-trouble` preselects, ONLY when the member has ⛔ category and the list names it', () => {
  it('⭐ preselected once the list loads — EXACTLY as a tap: saved to the draft, `staffMediation` false', async () => {
    mock.params = { category: 'kyc-trouble' }
    mock.store.set(DRAFT_KEY, JSON.stringify({ subject: 'typed earlier', staffMediation: true }))
    mock.categories.mockResolvedValueOnce(LIST)
    app()
    await listLoaded()
    await waitFor(() => expect(selected()).toEqual([label('kyc-trouble')]))
    expect(draft()).toEqual({ subject: 'typed earlier', category: 'kyc-trouble', staffMediation: false })
  })

  it('an existing draft category is KEPT (the control: the parameter would otherwise select)', async () => {
    mock.params = { category: 'kyc-trouble' }
    mock.store.set(DRAFT_KEY, JSON.stringify({ category: 'payment-trouble' }))
    mock.categories.mockResolvedValueOnce(LIST)
    app()
    await listLoaded()
    await act(async () => undefined)
    expect(selected()).toEqual([label('payment-trouble')])
    expect(draft().category).toBe('payment-trouble')
  })

  it('applied ONCE: a category the member picks is kept when the list loads again', async () => {
    mock.params = { category: 'kyc-trouble' }
    mock.categories.mockResolvedValue(LIST)
    app()
    await listLoaded()
    await waitFor(() => expect(selected()).toEqual([label('kyc-trouble')]))
    fireEvent.click(screen.getByText(label('other')))
    expect(selected()).toEqual([label('other')])
    await act(() => client.invalidateQueries({ queryKey: ['helpdesk', 'categories'] }))
    await waitFor(() => expect(mock.categories).toHaveBeenCalledTimes(2))
    await act(async () => undefined)
    expect(selected()).toEqual([label('other')])
    expect(draft().category).toBe('other')
  })

  it('applied ONCE, at the FIRST successful load: a later load that ADDS `kyc-trouble` does ⛔ select it', async () => {
    mock.params = { category: 'kyc-trouble' }
    mock.categories
      .mockResolvedValueOnce({ categories: LIST.categories.filter((c) => c.category !== 'kyc-trouble') })
      .mockResolvedValueOnce(LIST)
    app()
    await listLoaded()
    await act(() => client.invalidateQueries({ queryKey: ['helpdesk', 'categories'] }))
    await waitFor(() => expect(screen.getByText(label('kyc-trouble'))).toBeInTheDocument())
    await act(async () => undefined)
    expect(selected()).toEqual([])
    expect(mock.store.has(DRAFT_KEY)).toBe(false)
  })

  it.each([
    ['an unknown value', { category: 'not-a-category' }, LIST],
    ['a list that OMITS `kyc-trouble` (a Pariwar override)', { category: 'kyc-trouble' }, { categories: LIST.categories.filter((c) => c.category !== 'kyc-trouble') }],
    ['⛔ parameter (Story 10.2 unchanged)', {}, LIST],
    ['an ARRAY parameter', { category: ['kyc-trouble', 'other'] }, LIST],
  ] as const)('ignored: %s ⇒ nothing selected, nothing saved', async (_label, params, list) => {
    mock.params = { ...params }
    mock.categories.mockResolvedValueOnce(list as Categories)
    app()
    await listLoaded()
    await act(async () => undefined)
    expect(selected()).toEqual([])
    expect(mock.store.has(DRAFT_KEY)).toBe(false)
  })

  it('the list still LOADING ⇒ nothing selected (the control: it is selected once the list arrives)', async () => {
    mock.params = { category: 'kyc-trouble' }
    let settle: (v: Categories) => void = () => undefined
    mock.categories.mockReturnValueOnce(new Promise<Categories>((r) => { settle = r }))
    app()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    await act(async () => undefined)
    expect(mock.store.has(DRAFT_KEY)).toBe(false)
    await act(async () => settle(LIST))
    await waitFor(() => expect(selected()).toEqual([label('kyc-trouble')]))
  })

  it('the list FAILED ⇒ nothing selected, nothing saved', async () => {
    mock.params = { category: 'kyc-trouble' }
    mock.categories.mockRejectedValueOnce(new Error('503'))
    app()
    await waitFor(() => expect(client.getQueryState(['helpdesk', 'categories', 'p-1'])?.status).toBe('error'))
    await act(async () => undefined)
    expect(selected()).toEqual([])
    expect(mock.store.has(DRAFT_KEY)).toBe(false)
  })
})

describe('Story 3.13a DL8 — the tap handler is UNCHANGED (the 10.29 pin keeps reading it)', () => {
  it('`setCategory(c.category)` occurs EXACTLY once in `new.tsx` (the preselect uses its own identifier)', () => {
    const src = readFileSync(resolve(__dirname, '../../app/(helpdesk)/new.tsx'), 'utf8')
    expect(src.match(/setCategory\(c\.category\)/g)).toHaveLength(1)
    expect(src).toMatch(/setCategory\(preselect\)/)
  })
})
