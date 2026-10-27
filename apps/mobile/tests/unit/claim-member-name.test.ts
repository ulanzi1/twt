// @vitest-environment jsdom
// `2026-10-27-409` — the claim screens address the person filing by the member's REGISTERED name. EXECUTED: the hook
// (`lib/use-claim-member-name.ts`) under TanStack Query with the claim API mocked and the REAL `claim` translator (Hindi and
// English): the name once it answers; `member_fallback` while pending, when the answer is `null`, and when the read fails;
// `gcTime: 0` ⇒ the Provider's dehydrate filter ⛔ persists it. PINNED (source): all four claim screens take `{name}` from the
// hook — ⛔ `t('member_fallback')` left as the name; the entry uses its own no-name wording (`-410`, real t(), hi + en).
// The screens on a device: the TalkBack session's re-check.
import '@testing-library/jest-dom/vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocaleProvider } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ getMemberName: vi.fn(), session: { memberId: 'm-1', pariwarId: 'p-1' } as null | { memberId: string; pariwarId: string } }))

vi.mock('../../lib/claim-api', () => ({ claimApi: { getMemberName: mock.getMemberName } }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: mock.session, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

import { PEER_REQUEST_DEHYDRATE_OPTIONS } from '../../components/peer-request/peer-request-cache'
import { CLAIM_MEMBER_NAME_QUERY_OPTIONS, useClaimMemberName, useClaimMemberRegisteredName } from '../../lib/use-claim-member-name'

function Probe() {
  return createElement('p', { 'data-testid': 'name' }, useClaimMemberName())
}
function renderProbe(locale: 'hi' | 'en', client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(createElement(QueryClientProvider, { client }, createElement(LocaleProvider, { initialLocale: locale }, createElement(Probe))))
  return client
}

beforeEach(() => {
  mock.session = { memberId: 'm-1', pariwarId: 'p-1' }
  mock.getMemberName.mockReset()
})
afterEach(() => cleanup())

describe('useClaimMemberName (`2026-10-27-409`)', () => {
  it.each([
    ['hi', 'आपके परिजन'],
    ['en', 'your family member'],
  ] as const)('%s: the fallback while pending, then the REGISTERED name', async (locale, fallback) => {
    let answer!: (v: { name: string | null }) => void
    mock.getMemberName.mockReturnValue(new Promise((r) => { answer = r }))
    renderProbe(locale)
    expect(screen.getByTestId('name')).toHaveTextContent(fallback)
    answer({ name: 'Shanti Devi' })
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Shanti Devi'))
  })

  it('a `null` answer and a FAILED read both keep the fallback', async () => {
    mock.getMemberName.mockResolvedValue({ name: null })
    renderProbe('en')
    await waitFor(() => expect(mock.getMemberName).toHaveBeenCalled())
    expect(screen.getByTestId('name')).toHaveTextContent('your family member')
    cleanup()
    mock.getMemberName.mockRejectedValue(new Error('offline'))
    renderProbe('en')
    await waitFor(() => expect(mock.getMemberName).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId('name')).toHaveTextContent('your family member')
  })

  it('⛔ session ⇒ ⛔ read', () => {
    mock.session = null
    renderProbe('en')
    expect(mock.getMemberName).not.toHaveBeenCalled()
    expect(screen.getByTestId('name')).toHaveTextContent('your family member')
  })

  it('the name is ⛔ persisted: gcTime 0 ⇒ the Provider\'s dehydrate filter skips the query', async () => {
    expect(CLAIM_MEMBER_NAME_QUERY_OPTIONS.gcTime).toBe(0)
    mock.getMemberName.mockResolvedValue({ name: 'Shanti Devi' })
    const client = renderProbe('en')
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Shanti Devi'))
    const query = client.getQueryCache().find({ queryKey: ['claims', 'member-name', 'm-1'] })!
    expect(query.state.status).toBe('success')
    expect(PEER_REQUEST_DEHYDRATE_OPTIONS.shouldDehydrateQuery!(query)).toBe(false)
  })
})

describe('the claim screens take the name from the hook (`-409`); the entry has its OWN no-name wording (`-410`)', () => {
  const src = (file: string) => readFileSync(resolve(__dirname, `../../app/(claim)/${file}.tsx`), 'utf8').replace(/\/\/.*$/gm, '')

  // `-409` amended: ALL the flow's steps (the banner read on every step must not switch between the name and the generic).
  it.each(['handover-otp', 'relationship', 'consent', 'document', 'nominee-review', 'contact', 'acknowledgement'])('(claim)/%s.tsx — `{name}` from useClaimMemberName', (file) => {
    expect(src(file)).toMatch(/const name = useClaimMemberName\(\)/)
    expect(src(file)).not.toMatch(/t\('member_fallback'\)/)
  })

  it('⛔ claim screen passes `member_fallback` itself (a directory scan — a NEW step must take the hook too)', () => {
    const dir = resolve(__dirname, '../../app/(claim)')
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.tsx'))) {
      expect(readFileSync(resolve(dir, f), 'utf8').replace(/\/\/.*$/gm, ''), f).not.toMatch(/t\('member_fallback'\)/)
    }
  })

  it('(claim)/index.tsx — the registered name, else entry.question_no_name / entry.no_no_name (⛔ member_fallback in the sentence)', () => {
    const s = src('index')
    expect(s).toMatch(/const name = useClaimMemberRegisteredName\(\)/)
    expect(s).toMatch(/name === null \? t\('entry\.question_no_name'\) : t\('entry\.question', \{ name \}\)/)
    expect(s).toMatch(/name === null \? t\('entry\.no_no_name'\) : t\('entry\.no', \{ name \}\)/)
    expect(s).not.toMatch(/member_fallback/)
  })
})

describe('`-410` — the no-name wording, through the REAL t() (hi + en, as decided)', () => {
  it.each([
    ['en', 'entry.question_no_name', "Are you a family member of the person this phone belongs to? We can guide you through filing a claim. We need to verify it's you."],
    ['en', 'entry.no_no_name', 'No — this is my own phone'],
    ['hi', 'entry.question_no_name', 'क्या आप उस व्यक्ति के परिजन हैं जिनका यह फ़ोन है? हम दावा दर्ज करने में आपका मार्गदर्शन कर सकते हैं। हमें यह सत्यापित करना होगा कि यह आप ही हैं।'],
    ['hi', 'entry.no_no_name', 'नहीं — यह मेरा अपना फ़ोन है'],
  ] as const)('%s %s', async (locale, key, text) => {
    const { t } = await import('@twt/i18n')
    expect(t(key, undefined, { locale, namespace: 'claim' })).toBe(text)
  })

  it('useClaimMemberRegisteredName: null while pending / for a null answer, the name once it answers', async () => {
    function Probe() {
      return createElement('p', { 'data-testid': 'raw' }, String(useClaimMemberRegisteredName()))
    }
    let answer!: (v: { name: string | null }) => void
    mock.getMemberName.mockReturnValue(new Promise((r) => { answer = r }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(createElement(QueryClientProvider, { client }, createElement(LocaleProvider, { initialLocale: 'en' }, createElement(Probe))))
    expect(screen.getByTestId('raw')).toHaveTextContent('null')
    answer({ name: 'Shanti Devi' })
    await waitFor(() => expect(screen.getByTestId('raw')).toHaveTextContent('Shanti Devi'))
  })
})
