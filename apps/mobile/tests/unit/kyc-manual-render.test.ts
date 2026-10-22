// @vitest-environment jsdom
// Story 3.3c (AC5; `-378` decision 6, `-382`) — the manual KYC name, EXECUTED inside the REAL screen
// (`app/(signup)/kyc.tsx`) under a REAL `<LocaleProvider>` (⛔ a stubbed `t` —
// [[feedback_stub_must_call_not_transcribe]]). The harness is wa-code-entry-render.test.ts's: jsdom +
// RTL, `react-native` / `tamagui` stand-ins, `lib/member-api` + `lib/mmkv` + `expo-router` mocked, and
// `expo-web-browser` (kyc.tsx imports it; its build pulls native modules). Every leg types a VALID
// DoB — `onManualSubmit` returns on a blank DoB, which would make "never called" pass under the
// client mutant.
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ApiError } from '@twt/api-client'
import { getCatalog } from '@twt/i18n'
import { LocaleProvider } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  kycStatus: vi.fn(),
  kycManualSubmit: vi.fn(),
  announce: vi.fn(),
  router: { replace: vi.fn() },
  inputs: {} as Record<string, Record<string, unknown>>,
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { kycStatus: mock.kycStatus, kycManualSubmit: mock.kycManualSubmit },
}))
vi.mock('expo-router', () => ({ useRouter: () => mock.router }))
vi.mock('expo-web-browser', () => ({ openBrowserAsync: vi.fn() }))
vi.mock('react-native', () => ({
  AccessibilityInfo: { announceForAccessibility: mock.announce },
  Platform: { OS: 'android' },
}))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type Props = { children?: ReactNode; accessibilityRole?: string; accessibilityLabel?: string; accessibilityLiveRegion?: string }
  const container = (props: Props) =>
    createElement('div', {
      role: props.accessibilityRole === 'alert' ? 'alert' : undefined,
      'aria-label': props.accessibilityLabel,
      'aria-live': props.accessibilityLiveRegion,
    }, props.children)
  return {
    YStack: container, Paragraph: container, Text: container, H2: container,
    Spinner: () => createElement('div', { 'data-testid': 'spinner' }),
    Input: (props: Record<string, unknown> & { value?: string; onChangeText?: (v: string) => void; accessibilityLabel?: string }) => {
      if (props.accessibilityLabel) mock.inputs[props.accessibilityLabel] = props
      return createElement('input', {
        value: props.value ?? '', 'aria-label': props.accessibilityLabel,
        onChange: (e: { target: { value: string } }) => props.onChangeText?.(e.target.value),
      })
    },
    Button: (props: { children?: ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) =>
      createElement('button', { onClick: props.onPress, disabled: props.disabled, 'aria-label': props.accessibilityLabel }, props.children),
  }
})

import KycScreen from '../../app/(signup)/kyc'

const words = getCatalog('en', 'common')!
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const ENGLISH_MSG = words['kyc.manual_name_english']!

/** Render, open the manual form from the choose screen, and type a name + a valid DoB. */
async function toManualForm(name: string) {
  render(createElement(LocaleProvider, { initialLocale: 'en' }, createElement(KycScreen)))
  await settle()
  fireEvent.click(screen.getByRole('button', { name: words['kyc.manual_cta'] }))
  fireEvent.change(screen.getByLabelText(words['kyc.manual_name']!), { target: { value: name } })
  fireEvent.change(screen.getByLabelText(words['kyc.manual_dob']!), { target: { value: '1990-01-01' } })
}
const submit = async () => {
  fireEvent.click(screen.getByRole('button', { name: words['kyc.manual_submit'] }))
  await settle()
}

beforeEach(() => {
  mock.kycStatus.mockResolvedValue({ manualFallbackEnabled: true })
  mock.inputs = {}
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Story 3.3c — the manual KYC name in the real screen', () => {
  it('a Devanagari name: the inline alert shows, submit sends ⛔ request and announces once', async () => {
    await toManualForm('आशा देवी')
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toHaveTextContent(ENGLISH_MSG)
    const nameInput = mock.inputs[words['kyc.manual_name']!]!
    expect(nameInput.accessibilityHint).toBe(ENGLISH_MSG)
    expect(nameInput.maxLength).toBe(200)

    await submit()
    expect(mock.kycManualSubmit).not.toHaveBeenCalled()
    expect(mock.announce).toHaveBeenCalledTimes(1)
    expect(mock.announce).toHaveBeenCalledWith(ENGLISH_MSG)
    // ⛔ the sentence twice: the banner stays clear, the inline alert is the one place it shows.
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('an English name: ⛔ inline alert, the hint is today\'s, and it submits', async () => {
    mock.kycManualSubmit.mockResolvedValue({ lifecycleState: 'pending-fee', memberKycState: 'manual_pending' })
    await toManualForm('Asha Devi')
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(mock.inputs[words['kyc.manual_name']!]!.accessibilityHint).toBe(words['kyc.manual_name_required'])
    await submit()
    expect(mock.kycManualSubmit).toHaveBeenCalledWith({ name: 'Asha Devi', dob: '1990-01-01' })
  })

  it('a server 400 refusing the name\'s script renders the English-name message — ⛔ "DigiLocker is unavailable"', async () => {
    mock.kycManualSubmit.mockRejectedValue(
      new ApiError(400, 'request.validation', 'Request failed schema validation', {
        issues: [{ keyword: 'invalid_string', instancePath: '/name', schemaPath: '#/name/invalid_string', params: {}, message: 'x' }],
      }),
    )
    await toManualForm('Asha Devi')
    await submit()
    expect(mock.kycManualSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent(ENGLISH_MSG)
    expect(screen.getByRole('alert')).not.toHaveTextContent(words['kyc.fallback_empathy']!)
  })

  // Review finding, 2026-10-22: before `kyc.manual_name_too_long` existed, this leg rendered
  // `kyc.fallback_empathy` ("DigiLocker is unavailable") — the exact false message this story exists
  // to kill, just for length instead of script.
  it('a server 400 on /name too_big renders the too-long message — ⛔ the English-script message, ⛔ "DigiLocker is unavailable"', async () => {
    mock.kycManualSubmit.mockRejectedValue(
      new ApiError(400, 'request.validation', 'Request failed schema validation', {
        issues: [{ keyword: 'too_big', instancePath: '/name', schemaPath: '#/name/too_big', params: {}, message: 'x' }],
      }),
    )
    await toManualForm('Asha Devi')
    await submit()
    expect(mock.kycManualSubmit).toHaveBeenCalledTimes(1)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(words['kyc.manual_name_too_long']!)
    expect(alert).not.toHaveTextContent(ENGLISH_MSG)
    expect(alert).not.toHaveTextContent(words['kyc.fallback_empathy']!)
  })
})
