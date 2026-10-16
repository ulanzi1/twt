// @vitest-environment jsdom
// Story 6.27c (code review F4; AC6) — the REAL `PeerRequestSlot` rendered with React DOM and mocked children / native
// primitives (the `peer-questionnaire-render` precedent): the link's dismissal and the open request belong to the link that
// was SHOWN — a NEW code on the mounted route reaches the by-link call afresh; the SAME code after Back stays dismissed.
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PeerRequestSlot } from '../../components/peer-request/PeerRequestSlot'

const A = 'AAAAAAAAAAAA'
const B = 'BBBBBBBBBBBB'
const mock = vi.hoisted(() => ({ codes: [] as (string | null)[] }))

vi.mock('../../lib/claim-i18n', () => ({ useClaimT: () => (key: string) => key }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ isLoading: false, session: { pariwarId: 'p', memberId: 'm' } }) }))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
  return { Paragraph: container, YStack: container }
})
vi.mock('../../components/peer-request/usePeerRequestQueries', () => ({
  usePeerRequestByLinkQuery: (_pariwarId: string | undefined, code: string | null) => {
    mock.codes.push(code)
    return { status: 'success', data: { pingId: code === A ? 'ping-a' : 'ping-b' } }
  },
}))
vi.mock('../../components/peer-request/PeerQuestionnaire', async () => {
  const { createElement } = await import('react')
  return {
    PeerQuestionnaire: ({ pingId, onBack }: { pingId: string; onBack: () => void }) =>
      createElement('button', { onClick: onBack }, `questionnaire ${pingId}`),
  }
})
vi.mock('../../components/peer-request/PeerRequestList', async () => {
  const { createElement } = await import('react')
  return {
    PeerRequestList: ({ onOpen }: { onOpen: (pingId: string) => void }) =>
      createElement('button', { onClick: () => onOpen('ping-from-list') }, 'list'),
  }
})
vi.mock('../../components/peer-request/PeerRequestNotOpenable', () => ({ PeerRequestNotOpenable: () => null }))

beforeEach(() => {
  mock.codes = []
})
afterEach(cleanup)

it('⭐ F4 — Back from link A, then link B on the mounted route: B reaches the by-link call and opens ITS request', () => {
  const view = render(createElement(PeerRequestSlot, { code: A }))
  fireEvent.click(screen.getByText('questionnaire ping-a'))
  expect(screen.getByText('list')).toBeTruthy()
  expect(mock.codes.at(-1)).toBeNull() // A dismissed
  view.rerender(createElement(PeerRequestSlot, { code: B }))
  expect(mock.codes.at(-1)).toBe(B)
  expect(screen.getByText('questionnaire ping-b')).toBeTruthy()
})

it('the SAME code after Back stays dismissed (⛔ a second call reopens it)', () => {
  const view = render(createElement(PeerRequestSlot, { code: A }))
  fireEvent.click(screen.getByText('questionnaire ping-a'))
  view.rerender(createElement(PeerRequestSlot, { code: A }))
  expect(mock.codes.at(-1)).toBeNull()
  expect(screen.getByText('list')).toBeTruthy()
})

it('a request opened from the list gives way to a NEW link on the mounted route', () => {
  const view = render(createElement(PeerRequestSlot, { code: null }))
  fireEvent.click(screen.getByText('list'))
  expect(screen.getByText('questionnaire ping-from-list')).toBeTruthy()
  view.rerender(createElement(PeerRequestSlot, { code: B }))
  expect(screen.getByText('questionnaire ping-b')).toBeTruthy()
})
