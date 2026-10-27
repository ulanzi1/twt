// @vitest-environment jsdom
// Story 6.35 (AC15 — THE GATE for LS15 (b); Decision 2026-10-23-387) — the agreement-language render test. With the APP's
// provider in English (a REAL outer `LocaleProvider initialLocale="en"`), the `(claim)/contact.tsx` route's default export
// renders, on the SAME render: (1) the `contact-agreement` checkbox label = the `hi` `claim` `contact.agreement`, ⛔ the
// `en` one; (2) the in-screen title, a nominee heading's relationship label (`common` `nominees.relationship_*`), the
// shell's strings and `contact.continue` in Hindi; (3) the body sent to `claimApi.recordClaimContact` carries
// `locale: 'hi'`. Together with the EXISTING lockstep `apps/api/tests/unit/claim-contact-copy.test.ts` (`claim.json`
// `contact.agreement` ≡ `resolveClaimContactAgreementCopy(locale)`), this proves the server's recorded
// `checkboxTextShown` is the text the member SAW. RED against the pre-change file (it renders English and submits `'en'`).
// The `wa-notifications-screen-render` scaffold EXTENDED (AC15's harness): tamagui `XStack` / `Input` / `H3` / `Separator`
// with the a11y props forwarded; `Platform.OS` (else `announce()` throws after the POST); `useRouter`; `expo-linking`.
// `2026-10-27-409` (amended): the step takes the member's name through a query — the render gets a `QueryClientProvider` and the
// name read answers `null`, so the banner keeps the `member_fallback` this test pins (the named path: `claim-member-name.test.ts`).
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { t } from '@twt/i18n'
import { LocaleProvider, useLocale } from '@twt/i18n/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  recordClaimContact: vi.fn(),
  getMemberName: vi.fn(),
  nomineesStatus: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  announce: vi.fn(),
  openURL: vi.fn(),
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm-1' } }) }))
vi.mock('../../lib/claim-draft', () => ({ loadClaimDraft: () => ({ claimCaseId: 'c-1' }), saveClaimDraft: () => undefined }))
vi.mock('../../lib/member-api', () => ({ memberAuth: { nomineesStatus: mock.nomineesStatus } }))
vi.mock('../../lib/claim-api', () => ({ claimApi: { recordClaimContact: mock.recordClaimContact, getMemberName: mock.getMemberName } }))
vi.mock('expo-linking', () => ({ openURL: mock.openURL }))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  return {
    useRouter: () => ({ push: mock.push, replace: mock.replace }),
    useFocusEffect: (cb: () => void | (() => void)) => useEffect(() => cb(), [cb]),
  }
})
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    Platform: { OS: 'android' },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type P = {
    children?: ReactNode
    testID?: string
    onPress?: () => void
    disabled?: boolean
    accessibilityRole?: string
    accessibilityState?: { checked?: boolean }
    accessibilityLabel?: string
  }
  const attrs = (p: P) => ({
    'data-testid': p.testID,
    onClick: p.onPress,
    role: p.accessibilityRole,
    'aria-checked': p.accessibilityState?.checked === undefined ? undefined : String(p.accessibilityState.checked),
    'aria-label': p.accessibilityLabel,
  })
  const container = (p: P) => createElement('div', attrs(p), p.children)
  return {
    YStack: container,
    XStack: container,
    Paragraph: container,
    Text: container,
    H3: container,
    Separator: () => createElement('hr'),
    Spinner: () => createElement('div', null),
    Input: (p: { value?: string; onChangeText?: (v: string) => void; testID?: string; accessibilityLabel?: string }) =>
      createElement('input', {
        value: p.value,
        'data-testid': p.testID,
        'aria-label': p.accessibilityLabel,
        onChange: (e: { target: { value: string } }) => p.onChangeText?.(e.target.value),
      }),
    Button: (p: P) => createElement('button', { 'data-testid': p.testID, onClick: p.onPress, disabled: p.disabled, 'aria-label': p.accessibilityLabel }, p.children),
  }
})

import ContactScreen from '../../app/(claim)/contact'

const claim = (key: string, locale: 'hi' | 'en', params?: Record<string, string | number>) => t(key, params, { locale, namespace: 'claim' })
const common = (key: string, locale: 'hi' | 'en') => t(key, undefined, { locale, namespace: 'common' })

/** The OUTER (app) provider's locale, rendered beside the screen — proves the app itself is in English. */
function AppLocaleProbe(): React.ReactElement {
  return createElement('span', { 'data-testid': 'app-locale' }, useLocale().locale)
}

beforeEach(() => {
  for (const f of Object.values(mock)) f.mockReset()
  mock.nomineesStatus.mockResolvedValue({
    nominees: [{ rank: 1, relationship: 'spouse', splitPct: 100, mobilePresent: true, addressPresent: false }],
    locked: false,
  })
  mock.recordClaimContact.mockResolvedValue({})
  mock.getMemberName.mockResolvedValue({ name: null })
})
afterEach(() => {
  cleanup()
})

describe('AC15 — the contact step renders and records Hindi while the app is in English (LS15 (b))', () => {
  it('⭐ (1) the agreement label, (2) every other string, (3) the request locale — all `hi`, on the SAME render', async () => {
    render(createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, createElement(LocaleProvider, { initialLocale: 'en' }, createElement(AppLocaleProbe), createElement(ContactScreen))))
    expect(screen.getByTestId('app-locale')).toHaveTextContent('en')
    await screen.findByTestId('contact-address-1')

    // (1) the checkbox's label — what the member reads and agrees to.
    const agreement = screen.getByTestId('contact-agreement')
    expect(agreement).toHaveAttribute('role', 'checkbox')
    expect(agreement).toHaveAttribute('aria-label', claim('contact.agreement', 'hi'))
    expect(agreement).toHaveTextContent(claim('contact.agreement', 'hi'))
    expect(agreement.textContent).not.toContain(claim('contact.agreement', 'en'))

    // (2) the in-screen title, a nominee heading with its `common` relationship label, the shell, the helpline, continue.
    const body = document.body.textContent ?? ''
    expect(body).toContain(claim('contact.title', 'hi'))
    expect(body).not.toContain(claim('contact.title', 'en'))
    const relHi = common('nominees.relationship_spouse', 'hi')
    expect(body).toContain(claim('contact.nominee_heading', 'hi', { rank: 1, relationship: relHi }))
    expect(body).not.toContain(common('nominees.relationship_spouse', 'en'))
    expect(body).toContain(claim('shell.banner', 'hi', { name: claim('member_fallback', 'hi') }))
    expect(body).toContain(claim('shell.saved', 'hi'))
    expect(body).toContain(claim('shell.save_resume', 'hi'))
    expect(body).toContain(common('call_helpline.label', 'hi'))
    expect(body).not.toContain(common('call_helpline.label', 'en'))
    expect(screen.getByTestId('contact-save')).toHaveTextContent(claim('contact.continue', 'hi'))
    expect(body).not.toContain(claim('contact.continue', 'en'))

    // (3) fill the address, pick the claimant, tick the agreement, save ⇒ the body carries `locale: 'hi'`.
    fireEvent.change(screen.getByTestId('contact-address-1'), { target: { value: 'Ward 4, Patna' } })
    fireEvent.click(screen.getByTestId('contact-claimant-rank-1'))
    fireEvent.click(agreement)
    expect(screen.getByTestId('contact-agreement')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByTestId('contact-save'))
    await waitFor(() => expect(mock.recordClaimContact).toHaveBeenCalledTimes(1))
    const [claimCaseId, sent] = mock.recordClaimContact.mock.calls[0]!
    expect(claimCaseId).toBe('c-1')
    expect(sent).toMatchObject({ locale: 'hi', agreed: true, claimantNomineeRank: 1, nominees: [{ rank: 1, address: 'Ward 4, Patna' }] })

    // The app's own language is untouched by the nested provider.
    expect(screen.getByTestId('app-locale')).toHaveTextContent('en')
  })
})
