// @vitest-environment jsdom
// The Life events panel's HEADER TITLE (Story 6.36f AC7 device run, 2026-10-27 — finding D4): the group's plain `<Stack />` names
// an untitled route by its FILE, so the header read — and TalkBack spoke — "index". The screen sets its own title, as every
// sibling screen in `(life-events)` already does. MOCKED: `expo-router` (`Stack.Screen` records its options), `react-native`,
// `tamagui` (plain elements), `@twt/i18n/react` (echoes keys), the summary query.
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ screenOptions: [] as { title?: string }[] }))

vi.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options: { title?: string } }) => {
      mock.screenOptions.push(options)
      return null
    },
  },
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return { ScrollView: ({ children }: { children: React.ReactNode }) => createElement('div', null, children) }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children }: { children?: React.ReactNode }) => createElement('div', null, children)
  return { Button: container, H2: container, Paragraph: container, Text: container, YStack: container }
})
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key }))
vi.mock('../../components/life-events/useLifeEventsSummaryQuery', () => ({ useLifeEventsSummaryQuery: () => ({ data: undefined }) }))

import LifeEventsIndexScreen from '../../app/(life-events)/index'

afterEach(() => {
  cleanup()
  mock.screenOptions.length = 0
})

it('device run D4 — the panel titles its own header (⛔ the route file name "index")', () => {
  render(createElement(LifeEventsIndexScreen))
  expect(mock.screenOptions.map((o) => o.title)).toEqual(['lifeEvents.title'])
})
