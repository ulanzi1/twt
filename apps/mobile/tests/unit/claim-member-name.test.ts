// @vitest-environment jsdom
// `2026-10-27-409` — the claim screens address the person filing by the member's REGISTERED name. EXECUTED: the hook
// (`lib/use-claim-member-name.ts`) under TanStack Query with the claim API mocked and the REAL `claim` translator (Hindi and
// English): the name once it answers; `member_fallback` while pending, when the answer is `null`, and when the read fails;
// `gcTime: 0` ⇒ the Provider's dehydrate filter ⛔ persists it. PINNED (source): all four claim screens take `{name}` from the
// hook — ⛔ `t('member_fallback')` left as the name. The screens on a device: the TalkBack session's re-check.
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
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
import { CLAIM_MEMBER_NAME_QUERY_OPTIONS, useClaimMemberName } from '../../lib/use-claim-member-name'

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

describe('the four claim screens take `{name}` from the hook', () => {
  it.each(['index', 'handover-otp', 'relationship', 'nominee-review'])('(claim)/%s.tsx', (file) => {
    const source = readFileSync(resolve(__dirname, `../../app/(claim)/${file}.tsx`), 'utf8').replace(/\/\/.*$/gm, '')
    expect(source).toMatch(/const name = useClaimMemberName\(\)/)
    expect(source).not.toMatch(/t\('member_fallback'\)/)
  })
})
