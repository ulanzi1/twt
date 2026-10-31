// @vitest-environment jsdom
// Story 6.38 review: execute the real refusal screens, MedicalForm, step-up hook and AnnouncedText.
// Native primitives, HTTP, navigation, storage and locale hooks are mocked; native screen-reader
// behavior still needs a device. Assert the iOS announcement and Android live region separately.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@twt/api-client'
import { t } from '@twt/i18n'

const mock = vi.hoisted(() => ({
  platform: { OS: 'ios' },
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
  const container = ({ children, accessibilityRole, accessibilityLiveRegion }: {
    children?: React.ReactNode; accessibilityRole?: string; accessibilityLiveRegion?: string
  }) => createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined, 'aria-live': accessibilityLiveRegion }, children)
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
  return { useLocale: () => ({ locale: 'en' }), useT: () => (key: string) => t(key, undefined, { locale: 'en' }) }
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
    if (platform === 'ios') {
      await waitFor(() => expect(mock.announce).toHaveBeenCalledWith(message))
      expect(mock.announce).toHaveBeenCalledTimes(1)
    } else {
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
      expect(mock.announce).not.toHaveBeenCalled()
    }
    rerender(createElement(Component))
    expect(mock.announce).toHaveBeenCalledTimes(platform === 'ios' ? 1 : 0)
  })
})
