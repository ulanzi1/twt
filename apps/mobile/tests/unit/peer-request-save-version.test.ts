// @vitest-environment jsdom
// Story 6.33 review RV28 (mobile half) — the link `questionnaireVersionId` → `peerRequestApi.saveAnswer(…, versionId)`, which
// `peer-questionnaire-render.test.ts` cannot see (it mocks `usePeerRequestQueries` wholesale). Here the REAL hooks run against
// a real QueryClient and ONLY the transport (`peerRequestApi`) is stubbed:
//   1. the REAL save mutation hook sends the version it was given as the SIXTH argument (AC12's mutant "a client NOT sending
//      `questionnaireVersionId`" dies here), and an acknowledged save REWRITES the cached detail to a new identity (the premise
//      of review RV1 — the trigger the carry-over must survive);
//   2. the REAL screen + REAL hooks: every save reaches the transport with the version of the detail the screen RENDERED —
//      and after a version-stale reload (a real `refetch`), with the NEW one; the carried answer is sent ONCE, and the member's
//      later edit is not overwritten by it (RV1, end to end).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@twt/api-client'
import type { PeerRequestAnswerValue, PeerRequestDetailResponse } from '@twt/contracts'
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), saveAnswer: vi.fn(), submit: vi.fn() }))
vi.mock('../../lib/peer-request-api', () => ({ peerRequestApi: api }))
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: {} })) // the sibling hook module (`withReadTimeout`) imports it
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm', pariwarId: 'p' }, isLoading: false }) }))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('@react-navigation/native', () => ({
  usePreventRemove: vi.fn(),
  useNavigation: () => ({ dispatch: vi.fn() }),
  useIsFocused: () => true,
}))
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@twt/i18n/react', () => ({ useLocale: () => ({ locale: 'en' }) }))
vi.mock('../../lib/claim-i18n', () => ({ useClaimT: () => (key: string) => key }))
vi.mock('../../components/common/CallHelplineCTA', () => ({ CallHelplineCTA: () => null }))
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
  const container = ({ children, accessibilityRole, accessibilityLabel }: { children: React.ReactNode; accessibilityRole?: string; accessibilityLabel?: string }) =>
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

import { PeerQuestionnaire } from '../../components/peer-request/PeerQuestionnaire'
import { peerRequestDetailKey } from '../../components/peer-request/peer-request-cache'
import { useSavePeerAnswer } from '../../components/peer-request/usePeerRequestQueries'

afterEach(() => cleanup())

const words = (en: string) => ({ en, hi: en })
const saved = (code: string): PeerRequestDetailResponse['answers'] => [{ questionKey: 'has_died', value: { codes: [code] }, savedAt: 'now' }]
function detail(versionId: string, answers = saved('died')): PeerRequestDetailResponse {
  return {
    pingId: 'ping', memberName: 'A', submitted: false, answers,
    questionnaire: {
      versionId,
      pages: [{ questions: [
        { key: 'has_died', kind: 'single', words: words('Has A died?'), options: ['died', 'not_died'].map((code) => ({ code, words: words(code), exclusive: false })), optional: false, showIf: null },
      ] }],
      closingNote: words('Closing note'), thankYou: words('Thank you.'),
    },
  }
}
function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return { client, wrapper }
}
/** Let timers (the carry-over's 0 ms tick, a stray re-apply) and the promises behind them run. */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)) })

beforeEach(() => {
  api.get.mockReset()
  api.submit.mockReset()
  api.saveAnswer.mockReset().mockImplementation(async (_p: string, _ping: string, questionKey: string, value: PeerRequestAnswerValue) => ({
    answers: [{ questionKey, value, savedAt: 'now' }],
  }))
})

describe('useSavePeerAnswer — the REAL mutation hook (RV28)', () => {
  it('sends the questionnaireVersionId it was given as the SIXTH argument of peerRequestApi.saveAnswer', async () => {
    const { client, wrapper } = harness()
    try {
      const { result } = renderHook(() => useSavePeerAnswer('p', 'ping'), { wrapper })
      await act(async () => {
        await result.current.mutateAsync({ questionKey: 'has_died', value: { codes: ['died'] }, idempotencyKey: 'key-1', questionnaireVersionId: 'peer_mesh.v1001' })
      })
      expect(api.saveAnswer).toHaveBeenCalledTimes(1)
      expect(api.saveAnswer.mock.calls[0]).toEqual(['p', 'ping', 'has_died', { codes: ['died'] }, 'key-1', 'peer_mesh.v1001'])
    } finally {
      client.clear()
    }
  })

  it('an acknowledged save REWRITES the cached detail to a NEW object (same questions) — the trigger review RV1 is about', async () => {
    const { client, wrapper } = harness()
    try {
      const before = detail('v2')
      client.setQueryData(peerRequestDetailKey('p', 'm', 'ping'), before)
      const { result } = renderHook(() => useSavePeerAnswer('p', 'ping'), { wrapper })
      await act(async () => {
        await result.current.mutateAsync({ questionKey: 'has_died', value: { codes: ['not_died'] }, idempotencyKey: 'key-2', questionnaireVersionId: 'v2' })
      })
      const after = client.getQueryData<PeerRequestDetailResponse>(peerRequestDetailKey('p', 'm', 'ping'))!
      expect(after).not.toBe(before)
      expect(after.questionnaire).toBe(before.questionnaire)
      expect(after.answers).toEqual([{ questionKey: 'has_died', value: { codes: ['not_died'] }, savedAt: 'now' }])
    } finally {
      client.clear()
    }
  })
})

describe('PeerQuestionnaire with the REAL query + save hooks — only the transport is stubbed (RV28, RV1)', () => {
  const props = { pariwarId: 'p', pingId: 'ping', onBack: () => {} }

  it('EVERY save reaches peerRequestApi.saveAnswer with the version of the detail the screen RENDERED', async () => {
    api.get.mockResolvedValue(detail('peer_mesh.v7'))
    const { client, wrapper } = harness()
    try {
      render(createElement(PeerQuestionnaire, props), { wrapper })
      await userEvent.click(await screen.findByRole('radio', { name: 'not_died' }))
      await waitFor(() => expect(api.saveAnswer).toHaveBeenCalledTimes(1))
      expect(api.saveAnswer.mock.calls[0]).toEqual(['p', 'ping', 'has_died', { codes: ['not_died'] }, expect.any(String), 'peer_mesh.v7'])
    } finally {
      client.clear()
    }
  })

  it('a version-stale save RELOADS through the real refetch: the carried answer goes ONCE on the NEW version — and the member\'s later edit is not overwritten by it', async () => {
    api.get.mockResolvedValueOnce(detail('v2')).mockResolvedValue(detail('v1001'))
    api.saveAnswer.mockRejectedValueOnce(new ApiError(409, 'peer_request.questionnaire_version_stale', 'the questions changed'))
    const { client, wrapper } = harness()
    try {
      render(createElement(PeerQuestionnaire, props), { wrapper })
      await userEvent.click(await screen.findByRole('radio', { name: 'not_died' })) // A — refused as version-stale
      await waitFor(() => expect(api.saveAnswer).toHaveBeenCalledTimes(2))
      expect(api.saveAnswer.mock.calls[0]![5]).toBe('v2')
      expect(api.saveAnswer.mock.calls[1]).toEqual(['p', 'ping', 'has_died', { codes: ['not_died'] }, expect.any(String), 'v1001'])
      expect(await screen.findByText('peer_request.saved')).toBeInTheDocument()
      // The acknowledgement rewrote the cached detail (a new identity) — nothing may be re-sent because of it.
      await settle()
      expect(api.saveAnswer).toHaveBeenCalledTimes(2)
      await userEvent.click(screen.getByRole('radio', { name: 'died' })) // B — the member changes their mind
      await waitFor(() => expect(api.saveAnswer).toHaveBeenCalledTimes(3))
      await settle()
      expect(api.saveAnswer).toHaveBeenCalledTimes(3)
      expect(api.saveAnswer.mock.calls[2]).toEqual(['p', 'ping', 'has_died', { codes: ['died'] }, expect.any(String), 'v1001'])
      expect(screen.getByRole('radio', { name: 'died' })).toHaveAttribute('aria-checked', 'true')
    } finally {
      client.clear()
    }
  })
})
