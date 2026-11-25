// @vitest-environment jsdom
// Story 6.38 review: execute the real refusal screens, MedicalForm, step-up hook and AnnouncedText.
// Native primitives, HTTP, navigation, storage and locale hooks are mocked; native screen-reader
// behavior still needs a device. Assert the iOS announcement and Android live region separately.
// Story 3.15d (S1): the ADDRESS screen's `address_required` / catch line is no longer `AnnouncedText` — it is plain `Text`
// (role alert, ⛔ live region) spoken ONCE per SET by `announce()` on BOTH platforms, so on Android the `address` surface below
// speaks through `announce()` and has no live region; the other four surfaces are still `AnnouncedText` (live region on Android).
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@twt/api-client'
import { t } from '@twt/i18n'

import { NBSP, sentAs } from './announce-text'

const mock = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  locale: 'en',
  announce: vi.fn(),
  address: vi.fn(),
  medical: vi.fn(),
  withdrawal: vi.fn(),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  catalog: vi.fn(),
}))

vi.mock('react-native', () => ({
  ScrollView: ({ children }: { children?: React.ReactNode }) => children,
  Platform: mock.platform,
  AccessibilityInfo: { announceForAccessibility: mock.announce },
}))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole, accessibilityLiveRegion, testID, color, fontSize }: {
    children?: React.ReactNode; accessibilityRole?: string; accessibilityLiveRegion?: string; testID?: string; color?: string; fontSize?: string
  }) => createElement('div', {
    role: accessibilityRole === 'alert' ? 'alert' : undefined,
    'aria-live': accessibilityLiveRegion,
    'data-testid': testID,
    'data-color': color,
    'data-font-size': fontSize,
  }, children)
  return {
    Text: container, Paragraph: container, H2: container, YStack: container,
    Spinner: () => null,
    Button: ({ children, onPress, disabled, accessibilityLabel }: {
      children?: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string
    }) => createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
    Input: ({ value, onChangeText, accessibilityLabel }: {
      value?: string; onChangeText?: (value: string) => void; accessibilityLabel?: string
    }) => createElement('input', { value, 'aria-label': accessibilityLabel, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChangeText?.(e.target.value) }),
  }
})
vi.mock('@twt/i18n/react', async () => {
  const { t } = await import('@twt/i18n')
  // MUTABLE (Story 3.15d AC 2 (f)): `mock.locale` is read on every render, `useT()` hands back a NEW function each call (as the
  // real hook does), and the words are locale-DISTINCT — an echo `t` would make the "t / words in the deps" mutation an equivalent mutant.
  return { useLocale: () => ({ locale: mock.locale }), useT: () => (key: string) => t(key, undefined, { locale: mock.locale as 'en' | 'hi' }) }
})
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ back: vi.fn() }) }))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: { memberId: 'm-1' }, signOut: vi.fn() }) }))
vi.mock('../../components/life-events/draft-store', () => ({ loadDraft: () => null, clearDraft: vi.fn(), saveDraft: vi.fn() }))
vi.mock('../../lib/member-api', () => ({ memberAuth: {
  lifeEventsUpdateAddress: mock.address,
  lifeEventsUpdateMedical: mock.medical,
  withdrawMember: mock.withdrawal,
  stepUpRequest: mock.requestOtp,
  stepUpVerify: mock.verifyOtp,
  medicalImaList: mock.catalog,
} }))

import AddressScreen from '../../app/(life-events)/address'
import MedicalScreen from '../../app/(life-events)/medical'
import WithdrawalScreen from '../../app/(withdrawal)/index'
import { DEATH_REPORTED_COPY } from '../../lib/death-report-copy'

const copy = (key: string) => t(key, undefined, { locale: 'en' })
const click = (key: string) => fireEvent.click(screen.getByRole('button', { name: copy(key) }))

beforeEach(() => {
  vi.resetAllMocks()
  mock.locale = 'en'
  mock.address.mockRejectedValue(new ApiError(409, 'life_events.death_reported', 'refused'))
  mock.medical.mockRejectedValue(new ApiError(409, 'medical.death_reported', 'refused'))
  mock.withdrawal.mockRejectedValue(new ApiError(409, 'withdrawal.death_reported', 'refused'))
  mock.requestOtp.mockResolvedValue(undefined)
  mock.verifyOtp.mockResolvedValue(undefined)
  mock.catalog.mockResolvedValue({ version: 'v1', conditions: [], ackText: { en: 'ack', hi: 'ack' } })
})
afterEach(cleanup)

describe.each(['ios', 'android'])('after-death refusals on %s', (platform) => {
  it.each(['address', 'withdrawal', 'withdrawal OTP', 'medical', 'medical OTP'])('%s explains the refusal through the platform announcement channel', async (surface) => {
    mock.platform.OS = platform
    const otp = surface.endsWith('OTP')
    const medical = surface.startsWith('medical')
    const withdrawal = surface.startsWith('withdrawal')
    const mutation = medical ? mock.medical : withdrawal ? mock.withdrawal : mock.address
    if (otp) mutation.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'step up'))
    const Component = medical ? MedicalScreen : withdrawal ? WithdrawalScreen : AddressScreen
    const { rerender } = render(createElement(Component))

    if (medical) {
      fireEvent.click(await screen.findByRole('button', { name: 'ack' }))
      click('medical.submit')
    } else if (withdrawal) {
      click('withdrawal.ack_continue')
      click('withdrawal.reason_continue')
      click('withdrawal.confirm_cta')
    } else {
      fireEvent.change(screen.getByRole('textbox', { name: copy('lifeEvents.address_field_label') }), { target: { value: 'New address' } })
      click('lifeEvents.address_submit')
    }

    if (otp) {
      const input = await screen.findByRole('textbox', { name: copy('lifeEvents.step_up_required') })
      fireEvent.change(input, { target: { value: '123456' } })
      click('auth.verify')
    }

    const message = copy(withdrawal ? DEATH_REPORTED_COPY.withdrawal : DEATH_REPORTED_COPY.lifeEvents)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(mutation).toHaveBeenCalledTimes(otp ? 2 : 1)
    // The ADDRESS surface speaks through `announce()` on BOTH platforms (Story 3.15d S1: plain Text, no live region); the other
    // four are still `AnnouncedText` — iOS announces, Android's live region speaks and `announce()` is never called.
    const viaAnnounce = platform === 'ios' || surface === 'address'
    if (viaAnnounce) {
      await waitFor(() => expect(mock.announce).toHaveBeenCalledWith(message))
      expect(mock.announce).toHaveBeenCalledTimes(1)
      if (platform === 'android') expect(screen.getByRole('alert')).not.toHaveAttribute('aria-live')
    } else {
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
      expect(mock.announce).not.toHaveBeenCalled()
    }
    rerender(createElement(Component))
    expect(mock.announce).toHaveBeenCalledTimes(viaAnnounce ? 1 : 0)
  })
})

// ── Story 3.15d, S1 (DL1) — `address_required` and the failure line are plain Text, spoken ONCE per SET, on BOTH platforms ──
// 3.15c-dev Y1: as `AnnouncedText` an identical re-set was sent NOTHING (Android: the live region has no content change; iOS: the
// effect keys on the words). Counts are RUNNING TOTALS of `announce` calls BY TEXT (`sentAs`); every positive is awaited, every
// "nothing more" is asserted after a settle (an `act` flush + one macrotask — the announce-after-heading race).
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const required = () => copy('lifeEvents.address_required')
const sentOf = (text: string) => sentAs(mock.announce.mock.calls, text)
/** What the n sends of `text` look like: identical on iOS; on Android the k-th (from 0) carries k trailing U+00A0. */
const sends = (platform: string, text: string, n: number) => Array.from({ length: n }, (_, k) => text + (platform === 'android' ? NBSP.repeat(k) : ''))
const addressInput = () => screen.getByRole('textbox', { name: copy('lifeEvents.address_field_label') })

describe.each(['ios', 'android'])('S1 — address_required, spoken once per set, on %s (Story 3.15d)', (platform) => {
  beforeEach(() => {
    mock.platform.OS = platform
  })

  it('(a) the empty Submit set twice with the SAME words is spoken twice (Android: the second = the words + one U+00A0)', async () => {
    render(createElement(AddressScreen))
    click('lifeEvents.address_submit')
    await waitFor(() => expect(sentOf(required())).toHaveLength(1))
    click('lifeEvents.address_submit')
    await waitFor(() => expect(sentOf(required())).toHaveLength(2))
    expect(sentOf(required())).toEqual(sends(platform, required(), 2))
    expect(mock.address).not.toHaveBeenCalled() // the empty branch: no request
  })

  it('(b) an unrelated re-render beside the standing line sends nothing more', async () => {
    const { rerender } = render(createElement(AddressScreen))
    click('lifeEvents.address_submit')
    await waitFor(() => expect(sentOf(required())).toHaveLength(1))
    rerender(createElement(AddressScreen))
    rerender(createElement(AddressScreen))
    await settle()
    expect(sentOf(required())).toHaveLength(1)
  })

  it('(c) typing CLEARS the line and speaks nothing', async () => {
    render(createElement(AddressScreen))
    click('lifeEvents.address_submit')
    await waitFor(() => expect(sentOf(required())).toHaveLength(1))
    fireEvent.change(addressInput(), { target: { value: 'N' } })
    await settle()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(mock.announce).toHaveBeenCalledTimes(1)
  })

  it('(d) the line is role alert, ⛔ a live region, with its testID and the look it had', async () => {
    render(createElement(AddressScreen))
    click('lifeEvents.address_submit')
    const line = await screen.findByTestId('address-error')
    expect(line).toHaveAttribute('role', 'alert')
    expect(line).not.toHaveAttribute('aria-live')
    expect(line).toHaveAttribute('data-color', '#C0392B')
    expect(line).toHaveAttribute('data-font-size', '$2')
    expect(line).toHaveTextContent(required())
  })

  it('(e) a screen that mounts with no line speaks nothing', async () => {
    render(createElement(AddressScreen))
    await settle()
    expect(mock.announce).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('(f) a LOCALE SWITCH while the line stands sends nothing more, and the line keeps its set-time words', async () => {
    const { rerender } = render(createElement(AddressScreen))
    click('lifeEvents.address_submit')
    await waitFor(() => expect(sentOf(required())).toHaveLength(1))
    const hindi = t('lifeEvents.address_required', undefined, { locale: 'hi' })
    expect(hindi).not.toBe(required()) // the words are locale-DISTINCT, so this leg can tell a switch from no switch
    mock.locale = 'hi'
    rerender(createElement(AddressScreen)) // `t` is a NEW function now, the screen's own labels are Hindi
    await settle()
    expect(mock.announce).toHaveBeenCalledTimes(1)
    expect(sentOf(hindi)).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent(required()) // `error` holds the already-translated string
  })

  it('the catch path: ONE failing submit speaks ONCE, a second failing submit speaks once more', async () => {
    mock.address.mockRejectedValue(new Error('offline'))
    const generic = copy('lifeEvents.error_generic')
    render(createElement(AddressScreen))
    fireEvent.change(addressInput(), { target: { value: 'New address' } })
    click('lifeEvents.address_submit')
    await waitFor(() => expect(sentOf(generic)).toHaveLength(1))
    await settle()
    expect(sentOf(generic)).toHaveLength(1) // once, ⛔ twice (the helper is the only writer on this path)
    click('lifeEvents.address_submit')
    await waitFor(() => expect(sentOf(generic)).toHaveLength(2))
    expect(sentOf(generic)).toEqual(sends(platform, generic, 2))
  })
})
