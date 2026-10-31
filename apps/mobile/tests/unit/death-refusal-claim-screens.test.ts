// @vitest-environment jsdom
// Story 6.38 code review round 2, patch 9 — the claim door's calm state and its routing, EXECUTED (not source-scanned).
//
// `cannot-file-copy-resolves.test.ts` resolves the copy through the real `t()` and greps the sources for `announceForAccessibility`,
// `accessible={true}` and the routing line — letter-compliant with AC7, but a regression to dead code stays green. This mounts the
// real screens with native primitives, HTTP, navigation and storage mocked (the `death-report-refusal-announcements` harness):
//   · `CannotFileScreen` — announces `title. body` ONCE on arrival, in the active locale; the message is ONE labelled accessible
//     container; the helpline CTA and the way back are there and the way back navigates;
//   · `RelationshipScreen` — a 409 `claim.intake_refused` replaces the route with `/(claim)/cannot-file`, saves ⛔ draft and
//     shows ⛔ generic error; any OTHER failure still shows the generic error (the routing is selective);
//   · `useWorkplaceT` — the `{ namespace: 'common' }` override reaches the `common` catalog (en and hi), and the `workplace`
//     namespace holds ⛔ death line, so WITHOUT the override the lookup throws — the override is what the workplace screens need.
// ⚠ Native VoiceOver / TalkBack behaviour still needs a device (deferred-work.md, D5).
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@twt/api-client'
import { t } from '@twt/i18n'

const mock = vi.hoisted(() => ({
  locale: 'en' as 'en' | 'hi',
  announce: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  intake: vi.fn(),
  saveDraft: vi.fn(),
}))

vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AccessibilityInfo: { announceForAccessibility: mock.announce } }))
vi.mock('tamagui', async () => {
  const { createContext, createElement, useContext } = await import('react')
  type Props = { children?: React.ReactNode; accessible?: boolean; accessibilityLabel?: string }
  const container = ({ children, accessible, accessibilityLabel }: Props) =>
    createElement(
      'div',
      { 'data-accessible': accessible === undefined ? undefined : String(accessible), 'aria-label': accessibilityLabel },
      children,
    )
  const Group = createContext<(value: string) => void>(() => undefined)
  const ToggleGroup = Object.assign(
    ({ children, onValueChange }: { children?: React.ReactNode; onValueChange?: (value: string) => void }) =>
      createElement(Group.Provider, { value: onValueChange ?? (() => undefined) }, children),
    {
      Item: ({ children, value, 'aria-label': label }: { children?: React.ReactNode; value: string; 'aria-label'?: string }) => {
        const select = useContext(Group)
        return createElement('button', { 'aria-label': label, onClick: () => select(value) }, children)
      },
    },
  )
  return {
    Text: container,
    Paragraph: container,
    H2: container,
    YStack: container,
    Spinner: () => null,
    ToggleGroup,
    Button: ({ children, onPress, disabled, accessibilityLabel }: { children?: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
  }
})
vi.mock('@twt/i18n/react', async () => {
  const { t } = await import('@twt/i18n')
  return {
    useLocale: () => ({ locale: mock.locale }),
    useT: () => (key: string, params?: Record<string, unknown>, opts?: { namespace?: string }) =>
      t(key, params as never, { locale: mock.locale, ...(opts?.namespace ? { namespace: opts.namespace } : {}) } as never),
  }
})
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: mock.replace, push: mock.push }) }))
vi.mock('../../components/common/CallHelplineCTA', () => ({
  CallHelplineCTA: ({ label }: { label: string }) => createElement('button', null, label),
}))
vi.mock('../../components/claim/ClaimProxyFlowShell', () => ({
  ClaimProxyFlowShell: ({ children }: { children?: React.ReactNode }) => createElement('div', null, children),
}))
vi.mock('../../lib/claim-api', () => ({ claimApi: { initiateIntake: mock.intake } }))
vi.mock('../../lib/claim-entry-gate', () => ({ boundClaimEntryRead: vi.fn(), mayRecordClosedClaimPointer: vi.fn() }))
vi.mock('../../lib/fetch-claim-entry-outcome', () => ({ fetchClaimEntryReadOutcome: vi.fn() }))
vi.mock('../../lib/filed-claim', () => ({ getFiledClaimCaseId: vi.fn(), setFiledClaimCaseId: vi.fn() }))
vi.mock('../../lib/use-claim-member-name', () => ({ useClaimMemberName: () => 'Asha' }))
vi.mock('../../lib/claim-draft', () => ({ loadClaimDraft: () => ({}), saveClaimDraft: mock.saveDraft }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm-1' } }) }))

import CannotFileScreen from '../../app/(claim)/cannot-file'
import RelationshipScreen from '../../app/(claim)/relationship'
import { CANNOT_FILE_COPY, CLAIM_INTAKE_REFUSED_CODE } from '../../lib/cannot-file-copy'
import { DEATH_REPORTED_COPY } from '../../lib/death-report-copy'
import { useWorkplaceT } from '../../lib/workplace-i18n'

const claim = (key: string, locale: 'en' | 'hi' = 'en') => t(key, undefined, { locale, namespace: 'claim' })
const common = (key: string, locale: 'en' | 'hi' = 'en') => t(key, undefined, { locale, namespace: 'common' })

beforeEach(() => {
  mock.locale = 'en'
  for (const f of [mock.announce, mock.replace, mock.push, mock.intake, mock.saveDraft]) f.mockReset()
})
afterEach(cleanup)

describe('CannotFileScreen — executed', () => {
  const message = (locale: 'en' | 'hi' = 'en') => `${claim(CANNOT_FILE_COPY.title, locale)}. ${claim(CANNOT_FILE_COPY.body, locale)}`

  it('⭐ announces "title. body" ONCE on arrival — and a re-render with the same strings does not announce again', () => {
    const { rerender } = render(createElement(CannotFileScreen))
    expect(mock.announce).toHaveBeenCalledTimes(1)
    expect(mock.announce).toHaveBeenCalledWith(message())
    rerender(createElement(CannotFileScreen))
    expect(mock.announce).toHaveBeenCalledTimes(1)
  })

  it('announces in the ACTIVE locale (Hindi), and the Hindi differs from the English', () => {
    mock.locale = 'hi'
    render(createElement(CannotFileScreen))
    expect(mock.announce).toHaveBeenCalledWith(message('hi'))
    expect(message('hi')).not.toBe(message('en'))
  })

  it('the message is rendered as ONE labelled container passed `accessible={true}` (the PROP — checklist 13 (a); ⛔ a device claim, see D5)', () => {
    render(createElement(CannotFileScreen))
    expect(screen.getByLabelText(message())).toHaveAttribute('data-accessible', 'true')
  })

  it('the helpline CTA is present, and the way back navigates home', () => {
    render(createElement(CannotFileScreen))
    expect(screen.getByRole('button', { name: claim(CANNOT_FILE_COPY.call) })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: claim(CANNOT_FILE_COPY.back) }))
    expect(mock.replace).toHaveBeenCalledWith('/(tabs)')
  })
})

describe('RelationshipScreen — the door refusal routes to the calm state (executed)', () => {
  async function submit(): Promise<void> {
    render(createElement(RelationshipScreen))
    fireEvent.click(screen.getByRole('button', { name: claim('relationship.spouse') }))
    fireEvent.click(screen.getByRole('button', { name: claim('relationship.confirm') }))
  }

  it('⭐ a 409 claim.intake_refused replaces the route with /(claim)/cannot-file — ⛔ draft saved, ⛔ generic error, ⛔ push', async () => {
    mock.intake.mockRejectedValueOnce(new ApiError(409, CLAIM_INTAKE_REFUSED_CODE, 'A claim cannot be filed for this member'))
    await submit()
    await waitFor(() => expect(mock.replace).toHaveBeenCalledWith('/(claim)/cannot-file'))
    expect(mock.saveDraft).not.toHaveBeenCalled()
    expect(mock.push).not.toHaveBeenCalled()
    expect(screen.queryByText(claim('relationship.error'))).not.toBeInTheDocument()
  })

  it('⭐ control — any OTHER failure still shows the generic error and does ⛔ route to the calm state', async () => {
    mock.intake.mockRejectedValueOnce(new ApiError(500, 'internal', 'boom'))
    await submit()
    expect(await screen.findByText(claim('relationship.error'))).toBeInTheDocument()
    expect(mock.replace).not.toHaveBeenCalledWith('/(claim)/cannot-file')
    expect(mock.saveDraft).not.toHaveBeenCalled()
  })
  // (The screen's code constant is pinned to the canonical `@twt/contracts` export in `cannot-file-copy-resolves.test.ts`; a test here
  // comparing it to its own literal proved nothing and was removed in code review round 3.)
})

describe('useWorkplaceT — the `common` namespace override the workplace screens use for the death-reported line', () => {
  it.each(['en', 'hi'] as const)('(%s) with { namespace: "common" } the death-reported line resolves from `common`', (locale) => {
    mock.locale = locale
    const line = useWorkplaceT()(DEATH_REPORTED_COPY.lifeEvents, undefined, { namespace: 'common' })
    expect(line).toBe(common(DEATH_REPORTED_COPY.lifeEvents, locale))
    expect(line).not.toBe(DEATH_REPORTED_COPY.lifeEvents)
  })

  it('⭐ control — WITHOUT the override the lookup is in the `workplace` namespace, which holds no such line, so it THROWS', () => {
    expect(() => useWorkplaceT()(DEATH_REPORTED_COPY.lifeEvents)).toThrow(/missing key/)
  })

  it('and the default namespace is `workplace` (an ordinary workplace key resolves)', () => {
    expect(useWorkplaceT()('step_title')).toBe(t('step_title', undefined, { locale: 'en', namespace: 'workplace' }))
  })
})
