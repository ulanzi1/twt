// @vitest-environment jsdom
// Story 6.35 (AC7; LS6 (a), LS7, LS13; T5, T14) — the app-language screen (`app/(settings)/language.tsx`) and the login
// screen's switch (`app/(auth)/login.tsx`), EXECUTED with React DOM inside a REAL `<LocaleProvider>` (⛔ a mocked `useT`),
// with the REAL `lib/app-language.ts` over an in-memory MMKV and a mocked `memberAuth`.
// The `wa-notifications-screen-render.test.ts` scaffold, EXTENDED (T14): tamagui gains `XStack`; the mocks FORWARD
// `onPress` → `onClick`, `accessibilityRole` → `role`, `accessibilityState.checked` → `aria-checked`,
// `accessibilityLiveRegion` → `aria-live`, `accessibilityLabel` → `aria-label`, `accessibilityHint` → `aria-description`;
// `Stack.Screen` RENDERS its title (the scaffold's `() => null` would hide a missing header title); `Platform.OS` is
// switchable so the announce rule is run under BOTH platforms. Native layout and a real screen reader still need a device
// ([[feedback_record_unattested_no_backfill]]).
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { t } from '@twt/i18n'
import { LocaleProvider } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  memberLanguageSet: vi.fn(),
  memberLanguage: vi.fn(),
  requestOtp: vi.fn(),
  announce: vi.fn(),
  os: 'android' as 'android' | 'ios',
  session: { memberId: 'm-1' } as { memberId: string } | null,
  push: vi.fn(),
}))

vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mock.store.set(k, v)
    },
    removeItem: (k: string) => {
      mock.store.delete(k)
    },
  },
}))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { memberLanguageSet: mock.memberLanguageSet, memberLanguage: mock.memberLanguage, requestOtp: mock.requestOtp },
}))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: mock.session }) }))
vi.mock('expo-router', async () => {
  const { createElement } = await import('react')
  return {
    Stack: { Screen: ({ options }: { options?: { title?: string } }) => createElement('div', { 'data-testid': 'stack-title' }, options?.title) },
    useRouter: () => ({ push: mock.push, replace: vi.fn() }),
  }
})
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    Platform: {
      get OS() {
        return mock.os
      },
    },
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
    accessibilityLiveRegion?: string
    accessibilityLabel?: string
    accessibilityHint?: string
    accessible?: boolean
  }
  const attrs = (p: P) => ({
    'data-testid': p.testID,
    onClick: p.onPress,
    role: p.accessibilityRole,
    'aria-checked': p.accessibilityState?.checked === undefined ? undefined : String(p.accessibilityState.checked),
    'aria-live': p.accessibilityLiveRegion,
    'aria-label': p.accessibilityLabel,
    'aria-description': p.accessibilityHint,
    'data-accessible': p.accessible,
  })
  const container = (p: P) => createElement('div', attrs(p), p.children)
  return {
    YStack: container,
    XStack: container,
    Paragraph: container,
    Text: container,
    H2: container,
    Spinner: () => createElement('div', null),
    Input: (p: { value?: string; onChangeText?: (v: string) => void; accessibilityLabel?: string }) =>
      createElement('input', { value: p.value, 'aria-label': p.accessibilityLabel, onChange: (e: { target: { value: string } }) => p.onChangeText?.(e.target.value) }),
    Button: (p: P) => createElement('button', { ...attrs(p), role: undefined, disabled: p.disabled }, p.children),
  }
})

import LanguageScreen from '../../app/(settings)/language'
import { syncAppLanguage } from '../../lib/app-language'
import LoginScreen from '../../app/(auth)/login'
import { NBSP, sentAs } from './announce-text'

const PENDING = 'app-language.pending.v1'
const tr = (key: string, locale: 'hi' | 'en') => t(key, undefined, { locale, namespace: 'common' })
const pending = () => {
  const raw = mock.store.get(PENDING)
  return raw === undefined ? null : (JSON.parse(raw) as { locale: string; memberId: string | null; processId: string | null })
}

function renderIn(component: () => ReactNode, locale: 'hi' | 'en' = 'hi') {
  return render(createElement(LocaleProvider, { initialLocale: locale }, createElement(component)))
}

const settle = () => new Promise((r) => setTimeout(r, 20))

// `lib/app-language.ts` keeps the account's last-read choice per member for the whole module (Decision 2026-10-23-388);
// a fresh member id per test keeps one test's recorded choice out of the next.
let seq = 0

beforeEach(() => {
  mock.store.clear()
  for (const f of [mock.memberLanguageSet, mock.memberLanguage, mock.requestOtp, mock.announce, mock.push]) f.mockReset()
  mock.memberLanguageSet.mockImplementation((l: string) => Promise.resolve({ chosenLocale: l, pariwarDefaultLocale: 'hi' }))
  mock.os = 'android'
  seq += 1
  mock.session = { memberId: `m-${String(seq)}` }
})
afterEach(() => {
  cleanup()
})

describe('AC7 — the language screen', () => {
  it('a radiogroup of the two endonyms; the current one checked; the header title and the copy in the current language', () => {
    renderIn(LanguageScreen, 'hi')
    const group = screen.getByTestId('language-options')
    expect(group).toHaveAttribute('role', 'radiogroup')
    expect(group).toHaveAttribute('data-accessible', 'false')
    expect(group).not.toHaveAttribute('aria-label')
    const heading = screen.getByTestId('language-heading')
    expect(heading).toHaveAttribute('role', 'header')
    expect(heading).toHaveAttribute('data-accessible', 'true')
    expect(heading).toHaveTextContent(tr('language.title', 'hi'))
    const hi = screen.getByTestId('language-option-hi')
    const en = screen.getByTestId('language-option-en')
    expect(hi).toHaveAttribute('role', 'radio')
    expect(en).toHaveAttribute('role', 'radio')
    expect(hi).toHaveAttribute('data-accessible', 'true')
    expect(en).toHaveAttribute('data-accessible', 'true')
    expect(hi).toHaveAttribute('aria-checked', 'true')
    expect(en).toHaveAttribute('aria-checked', 'false')
    expect(hi).toHaveAttribute('aria-label', 'हिन्दी')
    expect(en).toHaveAttribute('aria-label', 'English')
    expect(screen.getByTestId('stack-title')).toHaveTextContent(tr('language.title', 'hi'))
    expect(document.body.textContent).toContain(tr('language.intro', 'hi'))
  })

  it('⭐ selecting the OTHER language re-renders every useT() string in it at once, checks it, and PUTs ONCE', async () => {
    renderIn(LanguageScreen, 'hi')
    fireEvent.click(screen.getByTestId('language-option-en'))
    expect(screen.getByTestId('stack-title')).toHaveTextContent('Language')
    expect(document.body.textContent).toContain(tr('language.intro', 'en'))
    expect(document.body.textContent).not.toContain(tr('language.intro', 'hi'))
    expect(screen.getByTestId('language-option-en')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('language-option-hi')).toHaveAttribute('aria-checked', 'false')
    await settle()
    expect(mock.memberLanguageSet).toHaveBeenCalledTimes(1)
    expect(mock.memberLanguageSet).toHaveBeenCalledWith('en')
    expect(pending()).toBeNull()
    expect(mock.store.get('app-language.v1')).toBe('en')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('selecting the CURRENT language is a no-op (⛔ PUT — I1); each later change PUTs once more', async () => {
    renderIn(LanguageScreen, 'hi')
    fireEvent.click(screen.getByTestId('language-option-hi'))
    await settle()
    expect(mock.memberLanguageSet).not.toHaveBeenCalled()
    expect(pending()).toBeNull()
    expect(mock.store.has('app-language.v1')).toBe(false)
    fireEvent.click(screen.getByTestId('language-option-en'))
    await settle()
    fireEvent.click(screen.getByTestId('language-option-en'))
    await settle()
    expect(mock.memberLanguageSet).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('language-option-hi'))
    await settle()
    expect(mock.memberLanguageSet).toHaveBeenCalledTimes(2)
    expect(mock.memberLanguageSet).toHaveBeenLastCalledWith('hi')
  })

  it('⭐ -388 item 1 — the account holds NO choice: a tap on the SHOWN language records it, once; before any account read it stays a no-op', async () => {
    mock.store.set('app-language.v1', 'en')
    renderIn(LanguageScreen, 'en')
    fireEvent.click(screen.getByTestId('language-option-en'))
    await settle()
    expect(mock.memberLanguageSet).not.toHaveBeenCalled()
    mock.memberLanguage.mockResolvedValue({ chosenLocale: null, pariwarDefaultLocale: 'hi' })
    await syncAppLanguage(mock.session!.memberId, { setLocale: vi.fn() })
    fireEvent.click(screen.getByTestId('language-option-en'))
    await settle()
    expect(mock.memberLanguageSet).toHaveBeenCalledTimes(1)
    expect(mock.memberLanguageSet).toHaveBeenCalledWith('en')
    expect(pending()).toBeNull()
    expect(screen.getByTestId('language-option-en')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByTestId('language-option-en'))
    await settle()
    expect(mock.memberLanguageSet).toHaveBeenCalledTimes(1)
  })

  it('-388 item 1 — the account holds the OTHER language after a FAILED switch: a tap on the shown one retries it and clears the alert; then ⛔ PUT', async () => {
    // The reachable "different value" case: the account read `hi`, the switch to English failed — the screen shows English,
    // the account still holds Hindi. (A GET adopting a value would itself switch the screen — ⛔ a state to start from.)
    renderIn(LanguageScreen, 'hi')
    mock.memberLanguage.mockResolvedValue({ chosenLocale: 'hi', pariwarDefaultLocale: 'hi' })
    await syncAppLanguage(mock.session!.memberId, { setLocale: vi.fn() })
    mock.memberLanguageSet.mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(screen.getByTestId('language-option-en'))
    expect(await screen.findByTestId('language-not-recorded')).toBeInTheDocument()
    expect(screen.getByTestId('language-option-en')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByTestId('language-option-en'))
    await settle()
    expect(mock.memberLanguageSet.mock.calls).toEqual([['en'], ['en']])
    expect(screen.queryByTestId('language-not-recorded')).toBeNull()
    expect(pending()).toBeNull()
    fireEvent.click(screen.getByTestId('language-option-en'))
    await settle()
    expect(mock.memberLanguageSet).toHaveBeenCalledTimes(2)
  })

  // Story 3.15c AC 3 (DL3, X2): the line is PLAIN text (⛔ live region — it spoke the new words at the SWITCH, before the outcome,
  // and so doubled the announcement and spoke a false "not recorded" when the PUT then succeeded), and EVERY `not_recorded`
  // outcome is announced ONCE, on both platforms, in the chosen language. Counts are RUNNING TOTALS of `mock.announce` calls
  // (⛔ deltas); a "stays" is asserted after a settle. jsdom cannot hear a live region — only (e) (⛔ `aria-live`) catches it.
  for (const os of ['android', 'ios'] as const) {
    it(`⭐ a failed PUT keeps the new language, leaves pending, shows ONE alert line (⛔ live region); announced once per failure (${os}) — AC 3 (a), (b), (e)`, async () => {
      mock.os = os
      mock.memberLanguageSet.mockRejectedValue(new Error('offline'))
      renderIn(LanguageScreen, 'hi')
      fireEvent.click(screen.getByTestId('language-option-en'))
      const line = await screen.findByTestId('language-not-recorded')
      expect(line).toHaveAttribute('role', 'alert')
      expect(line).not.toHaveAttribute('aria-live')
      expect(line).toHaveTextContent(tr('language.error_not_recorded', 'en'))
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(screen.getByTestId('language-option-en')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByTestId('stack-title')).toHaveTextContent('Language')
      expect(pending()).toMatchObject({ locale: 'en', memberId: mock.session?.memberId })
      // (a) the first failure: total 1, in the chosen language.
      await waitFor(() => expect(mock.announce).toHaveBeenCalledTimes(1))
      expect(mock.announce).toHaveBeenLastCalledWith(tr('language.error_not_recorded', 'en'))

      // (b) a switch while the line shows, failing: total 2, the second in the NEW language.
      fireEvent.click(screen.getByTestId('language-option-hi'))
      await waitFor(() => expect(mock.announce).toHaveBeenCalledTimes(2))
      expect(mock.announce).toHaveBeenLastCalledWith(tr('language.error_not_recorded', 'hi'))
      await act(async () => {
        await settle()
      })
      expect(mock.announce).toHaveBeenCalledTimes(2)
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(screen.getByTestId('language-not-recorded')).toHaveTextContent(tr('language.error_not_recorded', 'hi'))
      expect(screen.getByTestId('language-not-recorded')).not.toHaveAttribute('aria-live')
      expect(pending()).toMatchObject({ locale: 'hi', memberId: mock.session?.memberId })
    })

    it(`AC 3 (c) a switch while the line shows, SUCCEEDING ⇒ the total stays 1 and the line is removed (${os})`, async () => {
      mock.os = os
      mock.memberLanguageSet.mockRejectedValueOnce(new Error('offline'))
      renderIn(LanguageScreen, 'hi')
      fireEvent.click(screen.getByTestId('language-option-en'))
      await screen.findByTestId('language-not-recorded')
      await waitFor(() => expect(mock.announce).toHaveBeenCalledTimes(1))
      fireEvent.click(screen.getByTestId('language-option-hi'))
      await waitFor(() => expect(screen.queryByTestId('language-not-recorded')).toBeNull())
      await act(async () => {
        await settle()
      })
      expect(mock.announce).toHaveBeenCalledTimes(1)
      expect(pending()).toBeNull()
    })

    it(`AC 3 (d) -388 item 1 — the switch fails (total 1), then a tap on the SHOWN language retries and fails again ⇒ total 2, the same words (${os})`, async () => {
      mock.os = os
      renderIn(LanguageScreen, 'hi')
      mock.memberLanguage.mockResolvedValue({ chosenLocale: 'hi', pariwarDefaultLocale: 'hi' })
      await syncAppLanguage(mock.session!.memberId, { setLocale: vi.fn() })
      mock.memberLanguageSet.mockRejectedValue(new Error('offline'))
      fireEvent.click(screen.getByTestId('language-option-en'))
      await screen.findByTestId('language-not-recorded')
      await waitFor(() => expect(mock.announce).toHaveBeenCalledTimes(1))
      fireEvent.click(screen.getByTestId('language-option-en'))
      await waitFor(() => expect(mock.announce).toHaveBeenCalledTimes(2))
      expect(mock.memberLanguageSet.mock.calls).toEqual([['en'], ['en']])
      const words = tr('language.error_not_recorded', 'en')
      const [first, second] = mock.announce.mock.calls.map(([s]) => String(s))
      expect(first).toBe(words)
      // Android: the second send of the same words carries one trailing U+00A0 (Story 3.15b `announce()`); iOS: identical.
      expect(second).toBe(os === 'android' ? `${words}${NBSP}` : words)
      expect(sentAs(mock.announce.mock.calls, words)).toHaveLength(2)
      expect(screen.getAllByRole('alert')).toHaveLength(1)
    })
  }

  it('a later successful PUT removes the line', async () => {
    mock.memberLanguageSet.mockRejectedValueOnce(new Error('offline'))
    renderIn(LanguageScreen, 'hi')
    fireEvent.click(screen.getByTestId('language-option-en'))
    await screen.findByTestId('language-not-recorded')
    fireEvent.click(screen.getByTestId('language-option-hi'))
    await waitFor(() => expect(screen.queryByTestId('language-not-recorded')).toBeNull())
    expect(pending()).toBeNull()
  })
})

describe('AC7 — the login screen switch (LS6 (a); T5)', () => {
  it('shows ONLY the other language\'s endonym, with the hint in the current language', () => {
    renderIn(LoginScreen, 'hi')
    const sw = screen.getByTestId('login-language-switch')
    expect(sw).toHaveTextContent('English')
    expect(sw.textContent).not.toContain('हिन्दी')
    expect(sw).toHaveAttribute('aria-description', tr('language.switch_hint', 'hi'))
    cleanup()
    renderIn(LoginScreen, 'en')
    const sw2 = screen.getByTestId('login-language-switch')
    expect(sw2).toHaveTextContent('हिन्दी')
    expect(sw2.textContent).not.toContain('English')
    expect(sw2).toHaveAttribute('aria-description', tr('language.switch_hint', 'en'))
  })

  it('⭐ switching changes the screen at once, writes pending with memberId null (this process), and calls ⛔ API', async () => {
    mock.session = null
    renderIn(LoginScreen, 'hi')
    expect(document.body.textContent).toContain(tr('auth.mobile_prompt', 'hi'))
    fireEvent.click(screen.getByTestId('login-language-switch'))
    expect(document.body.textContent).toContain(tr('auth.mobile_prompt', 'en'))
    expect(screen.getByTestId('login-language-switch')).toHaveTextContent('हिन्दी')
    await settle()
    const p = pending()!
    expect(p.locale).toBe('en')
    expect(p.memberId).toBeNull()
    expect(typeof p.processId).toBe('string')
    expect(mock.store.get('app-language.v1')).toBe('en')
    expect(mock.memberLanguageSet).not.toHaveBeenCalled()
    expect(mock.memberLanguage).not.toHaveBeenCalled()
    expect(mock.requestOtp).not.toHaveBeenCalled()
  })

  it('T5 — an error line already translated into state is CLEARED on a switch (⛔ left in the old language)', async () => {
    renderIn(LoginScreen, 'hi')
    fireEvent.click(screen.getByText(tr('auth.send_otp', 'hi'))) // an empty number ⇒ the invalid-number line
    expect(document.body.textContent).toContain(tr('auth.mobile_error_invalid', 'hi'))
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-language-switch'))
    })
    expect(document.body.textContent).not.toContain(tr('auth.mobile_error_invalid', 'hi'))
    expect(document.body.textContent).not.toContain(tr('auth.mobile_error_invalid', 'en'))
  })
})
