// @vitest-environment jsdom
// Story 6.33 review RP3 — the questionnaire's HAND-OVER of unsent answers is scoped to the ping it came from. The REAL
// `PeerRequestSlot` + the REAL `PeerQuestionnaire` + the REAL query hooks run against a real QueryClient; ONLY the transport
// (`peerRequestApi`) and the native shell are stubbed (the `peer-request-save-version` precedent). The slot's `carried` ref lives
// as long as the screen, and a link-to-link switch whose by-link result is CACHED never passes through `loading`: without a
// `key` per ping, B's first render takes A's unsent answers out of the ref and re-saves them INTO B (the same member's, so the
// server would accept the write).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PeerRequestDetailResponse } from '@twt/contracts'
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), byLink: vi.fn(), saveAnswer: vi.fn(), submit: vi.fn() }))
vi.mock('../../lib/peer-request-api', () => ({ peerRequestApi: api }))
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: {} })) // the sibling hook module (`withReadTimeout`) imports it
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('@react-navigation/native', () => ({
  usePreventRemove: vi.fn(),
  useNavigation: () => ({ dispatch: vi.fn() }),
  useIsFocused: () => true,
}))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@twt/i18n/react', () => ({ useLocale: () => ({ locale: 'en' }) }))
vi.mock('../../lib/claim-i18n', () => ({ useClaimT: () => (key: string) => key }))
vi.mock('../../components/common/CallHelplineCTA', () => ({ CallHelplineCTA: () => null }))
vi.mock('../../components/peer-request/PeerRequestList', () => ({ PeerRequestList: () => null }))
vi.mock('../../components/peer-request/PeerRequestNotOpenable', () => ({ PeerRequestNotOpenable: () => null }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
    Platform: { OS: 'ios' },
    AccessibilityInfo: { announceForAccessibility: vi.fn() },
    BackHandler: { addEventListener: () => ({ remove: () => undefined }) },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole, accessibilityLabel }: { children?: React.ReactNode; accessibilityRole?: string; accessibilityLabel?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' || accessibilityRole === 'radiogroup' ? accessibilityRole : undefined, 'aria-label': accessibilityLabel }, children)
  return {
    Paragraph: container, Text: container, XStack: container, YStack: container,
    Button: ({ children, onPress, disabled, accessibilityRole, accessibilityLabel, accessibilityState }: {
      children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityRole?: string;
      accessibilityLabel?: string; accessibilityState?: { checked?: boolean }
    }) => createElement('button', { onClick: onPress, disabled, role: accessibilityRole, 'aria-label': accessibilityLabel, 'aria-checked': accessibilityState?.checked }, children),
    Input: () => null,
  }
})

import { PeerRequestSlot } from '../../components/peer-request/PeerRequestSlot'
import { peerRequestByLinkKey } from '../../components/peer-request/peer-request-cache'

afterEach(() => cleanup())

const A = 'AAAAAAAAAAAA'
const B = 'BBBBBBBBBBBB'
const words = (en: string) => ({ en, hi: en })
/** Both pings are ONE member's, on the SAME questionnaire version — the server would accept a write to either. */
function detail(pingId: string, answers: PeerRequestDetailResponse['answers']): PeerRequestDetailResponse {
  return {
    pingId, memberName: pingId, submitted: false, answers,
    questionnaire: {
      versionId: 'peer_mesh.v7',
      pages: [{ questions: [
        { key: 'has_died', kind: 'single', words: words('Has the person died?'), options: ['died', 'not_died'].map((code) => ({ code, words: words(code), exclusive: false })), optional: false, showIf: null },
      ] }],
      closingNote: words('Closing note'), thankYou: words('Thank you.'),
    },
  }
}
/** Let the carry-over's 0 ms tick (and a stray re-apply) and the promises behind them run. */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)) })

beforeEach(() => {
  api.get.mockReset().mockImplementation(async (_p: string, pingId: string) =>
    pingId === 'ping-a' ? detail('ping-a', []) : detail('ping-b', [{ questionKey: 'has_died', value: { codes: ['not_died'] }, savedAt: 'now' }]),
  )
  api.byLink.mockReset().mockImplementation(async (_p: string, code: string) => ({ pingId: code === A ? 'ping-a' : 'ping-b' }))
  api.submit.mockReset()
  // A's save never settles: the answer stays UNSENT in A's editor (and so in the hand-over) — the member is offline-ish.
  api.saveAnswer.mockReset().mockImplementation(() => new Promise(() => {}))
})

it('⭐ RP3 — a link-to-link switch (B\'s by-link result cached) ⛔ re-saves A\'s unsent answers INTO B; B shows ITS OWN answers', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  try {
    // B's link was resolved earlier (`staleTime: Infinity`): switching to it never shows `loading`.
    client.setQueryData(peerRequestByLinkKey('p', 'm', B), { pingId: 'ping-b' })
    const view = render(createElement(PeerRequestSlot, { code: A }), { wrapper })
    await userEvent.click(await screen.findByRole('radio', { name: 'died' })) // A's answer — sent, never acknowledged ⇒ UNSENT
    expect(api.saveAnswer).toHaveBeenCalledTimes(1)
    expect(api.saveAnswer.mock.calls[0]![1]).toBe('ping-a')

    view.rerender(createElement(PeerRequestSlot, { code: B }))
    // B's own answer is on screen — and nothing of A's.
    expect(await screen.findByRole('radio', { name: 'not_died' })).toHaveAttribute('aria-checked', 'true')
    await settle()
    expect(screen.getByRole('radio', { name: 'died' })).toHaveAttribute('aria-checked', 'false')
    expect(api.saveAnswer.mock.calls.filter(([, pingId]) => pingId === 'ping-b')).toEqual([]) // ⛔ A's answer written INTO B
    expect(api.saveAnswer).toHaveBeenCalledTimes(1)
  } finally {
    client.clear()
  }
})
