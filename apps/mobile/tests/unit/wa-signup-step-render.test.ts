// @vitest-environment jsdom
// Story 5.10 (AC1–AC6, AC8, AC12-signup; Decision 2026-10-21-375) — the signup WhatsApp step (`app/(signup)/whatsapp.tsx`)
// EXECUTED with React DOM and mocked native primitives, inside a REAL `<LocaleProvider>` (⛔ a stubbed `t` —
// [[feedback_stub_must_call_not_transcribe]]). Harness: `peer-questionnaire-render.test.ts` (BackHandler + `hardwareBack()`, a
// mutable `Platform.OS`, a checkbox stub mapping `accessibilityState.checked` → `aria-checked`) + `wa-notifications-screen-
// render.test.ts` (LocaleProvider, mmkv, member-api). Four ways a leg here could pass VACUOUSLY are closed (story T11):
//   · `useRouter` returns ONE stable `mock.router` (a fresh object per call could not be asserted);
//   · the `Button` mock RECORDS its full props per `testID`, so the reminder's two buttons are compared on EVERY prop;
//   · the double tap fires both presses inside ONE `act()` (a mock `<button disabled>` would swallow a second separate click);
//   · the `Text` mock FORWARDS `selectable`.
// Native layout and a real screen reader still need a device ([[feedback_record_unattested_no_backfill]]).
import '@testing-library/jest-dom/vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ApiError } from '@twt/api-client'
import { getCatalog } from '@twt/i18n'
import { LocaleProvider } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  getWaOptInStatus: vi.fn(),
  requestWaOptIn: vi.fn(),
  openURL: vi.fn(),
  alert: vi.fn(),
  announce: vi.fn(),
  router: { replace: vi.fn() },
  backHandlers: [] as (() => boolean)[],
  os: 'ios' as string,
  buttons: {} as Record<string, Record<string, unknown>>,
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { getWaOptInStatus: mock.getWaOptInStatus, requestWaOptIn: mock.requestWaOptIn },
}))
vi.mock('expo-router', () => ({ useRouter: () => mock.router }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
    StyleSheet: { absoluteFill: {} },
    Linking: { openURL: mock.openURL },
    Alert: { alert: mock.alert },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    Platform: { get OS() { return mock.os } },
    BackHandler: {
      addEventListener: (_event: string, handler: () => boolean) => {
        mock.backHandlers.push(handler)
        return { remove: () => { mock.backHandlers = mock.backHandlers.filter((h) => h !== handler) } }
      },
    },
  }
})
/** Android's hardware back, as the LATEST registered handler sees it. */
const hardwareBack = () => mock.backHandlers.at(-1)?.() ?? false
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type Props = {
    children?: ReactNode; testID?: string; accessibilityRole?: string; accessibilityLabel?: string
    accessibilityLiveRegion?: string; accessibilityViewIsModal?: boolean; selectable?: boolean
  }
  const container = ({ children, testID, accessibilityRole, accessibilityLabel, accessibilityLiveRegion, accessibilityViewIsModal, selectable }: Props) =>
    createElement('div', {
      'data-testid': testID,
      role: accessibilityRole === 'alert' ? 'alert' : undefined,
      'aria-label': accessibilityLabel,
      'aria-live': accessibilityLiveRegion,
      'aria-modal': accessibilityViewIsModal ? 'true' : undefined,
      'data-selectable': selectable ? 'true' : undefined,
    }, children)
  return {
    YStack: container, Paragraph: container, Text: container, H2: container, View: container,
    Spinner: ({ testID }: { testID?: string }) => createElement('div', { 'data-testid': testID ?? 'spinner' }),
    Button: (props: Record<string, unknown> & { children?: ReactNode; onPress?: () => void; disabled?: boolean; testID?: string;
      accessibilityRole?: string; accessibilityLabel?: string; accessibilityState?: { checked?: boolean } }) => {
      if (props.testID) mock.buttons[props.testID] = props
      return createElement('button', {
        onClick: props.onPress, disabled: props.disabled, role: props.accessibilityRole, 'aria-label': props.accessibilityLabel,
        'aria-checked': props.accessibilityState?.checked, 'data-testid': props.testID,
      }, props.children)
    },
  }
})

import WhatsappStepScreen from '../../app/(signup)/whatsapp'

const NEXT = '/(signup)/payment'
const LINK = 'https://wa.me/919876543210?text=TWT-ABCDEFGH'
const MINTED = { state: 'PENDING', displayPhoneNumber: '+91 98765 43210', deepLink: LINK, verificationPhrase: 'TWT-ABCDEFGH' }
/** The REAL en catalog the `<LocaleProvider initialLocale="en">` renders from. */
const words = getCatalog('en', 'common')!

function status(state: string | null, available = true) {
  return { available, displayPhoneNumber: '+91 98765 43210', state, deepLink: null, verificationPhrase: null, windowExpiresAt: null }
}

function renderStep() {
  return render(createElement(LocaleProvider, { initialLocale: 'en' }, createElement(WhatsappStepScreen)))
}

/** Render the step on a Pariwar with WhatsApp available and the member not yet on; wait for the box. */
async function ask() {
  mock.getWaOptInStatus.mockResolvedValue(status(null))
  renderStep()
  return screen.findByTestId('wa-signup-box')
}

const box = () => screen.getByTestId('wa-signup-box')
const cont = () => screen.getByTestId('wa-signup-continue')
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

beforeEach(() => {
  for (const f of [mock.getWaOptInStatus, mock.requestWaOptIn, mock.openURL, mock.alert, mock.announce, mock.router.replace]) f.mockReset()
  mock.requestWaOptIn.mockResolvedValue(MINTED)
  mock.openURL.mockResolvedValue(true)
  mock.backHandlers = []
  mock.os = 'ios'
  mock.buttons = {}
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('AC1 — a separate, unticked box on its own step', () => {
  it('shows the title, the intro, an UNTICKED checkbox labelled box_label, its hint, and Continue', async () => {
    await ask()
    expect(screen.getByText(words['waSignup.title']!)).toBeInTheDocument()
    expect(screen.getByText(words['waSignup.intro']!)).toBeInTheDocument()
    expect(box()).toHaveAttribute('role', 'checkbox')
    expect(box()).toHaveAttribute('aria-checked', 'false')
    expect(box()).toHaveAttribute('aria-label', words['waSignup.box_label'])
    expect(box()).toHaveTextContent(words['waSignup.box_label']!)
    expect(screen.getByText(words['waSignup.box_hint']!)).toBeInTheDocument()
    expect(cont()).toHaveTextContent(words['waSignup.continue']!)
  })

  it('re-entering the step shows the box unticked again (I1)', async () => {
    await ask()
    fireEvent.click(box())
    expect(box()).toHaveAttribute('aria-checked', 'true')
    cleanup()
    await ask()
    expect(box()).toHaveAttribute('aria-checked', 'false')
  })
})

describe('AC1 — PREV and NEXT (SB2 (d): medical → whatsapp → payment)', () => {
  // The route literals are a SOURCE check: under expo-router 55 the generated typed routes accept any two-segment absolute path
  // (`'/zzz/yyy'` typechecks — probed 2026-10-21), so `tsc` with `.expo/types` would ⛔ catch a wrong `'/(signup)/…'` literal.
  const read = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8')
  it("medical's Continue goes to the WhatsApp step, the step goes on to payment, and both route files exist", () => {
    expect(read('app/(signup)/medical.tsx')).toContain("router.replace('/(signup)/whatsapp')")
    expect(read('app/(signup)/medical.tsx')).not.toContain("router.replace('/(signup)/payment')")
    expect(read('app/(signup)/whatsapp.tsx')).toContain("router.replace('/(signup)/payment')")
    expect(existsSync(join(__dirname, '..', '..', 'app', '(signup)', 'whatsapp.tsx'))).toBe(true)
    expect(existsSync(join(__dirname, '..', '..', 'app', '(signup)', 'payment.tsx'))).toBe(true)
  })
})

describe('AC2 — skipped where there is nothing to offer (SB3)', () => {
  const skipped = () => {
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('wa-signup-box')).toBeNull()
    expect(screen.queryByTestId('wa-signup-reminder')).toBeNull()
    expect(screen.getByTestId('wa-signup-loading')).toBeInTheDocument()
    expect(mock.requestWaOptIn).not.toHaveBeenCalled()
  }

  it('WhatsApp not available for the Pariwar ⇒ straight on, showing nothing', async () => {
    mock.getWaOptInStatus.mockResolvedValue(status(null, false))
    renderStep()
    await settle()
    skipped()
  })

  it('the member is already ACTIVE ⇒ straight on', async () => {
    mock.getWaOptInStatus.mockResolvedValue(status('ACTIVE'))
    renderStep()
    await settle()
    skipped()
  })

  it('the status read fails ⇒ straight on', async () => {
    mock.getWaOptInStatus.mockRejectedValue(new TypeError('offline'))
    renderStep()
    await settle()
    skipped()
  })

  it('a status read that hangs ⇒ straight on at 5 s, ⛔ 15 s, and ⛔ before 5 s', async () => {
    vi.useFakeTimers()
    mock.getWaOptInStatus.mockReturnValue(new Promise(() => {}))
    renderStep()
    await act(async () => { await vi.advanceTimersByTimeAsync(4_999) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    expect(screen.getByTestId('wa-signup-loading')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    skipped()
  })
})

describe('AC3 — the reminder, once, even-handed (SB4)', () => {
  it('an unticked Continue shows a rendered modal overlay — ⛔ Alert.alert — with two buttons that differ ONLY in label, handler and testID', async () => {
    await ask()
    fireEvent.click(cont())
    const overlay = screen.getByTestId('wa-signup-reminder')
    expect(overlay).toHaveAttribute('aria-modal', 'true')
    expect(overlay).toHaveAttribute('aria-label', words['waSignup.popup_a11y'])
    expect(overlay).toHaveTextContent(words['waSignup.popup_title']!)
    expect(overlay).toHaveTextContent(words['waSignup.popup_body']!)
    const back = screen.getByTestId('wa-signup-reminder-back')
    const proceed = screen.getByTestId('wa-signup-reminder-proceed')
    expect(back).toHaveTextContent(words['waSignup.popup_back']!)
    expect(proceed).toHaveTextContent(words['waSignup.popup_proceed']!)
    // BigDev's order: "Go back" first.
    expect(back.compareDocumentPosition(proceed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const DIFFER = new Set(['children', 'onPress', 'testID', 'accessibilityLabel'])
    const omit = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([k]) => !DIFFER.has(k)))
    const backProps = mock.buttons['wa-signup-reminder-back']!
    const proceedProps = mock.buttons['wa-signup-reminder-proceed']!
    expect(omit(backProps)).toEqual(omit(proceedProps))
    expect(Object.keys(omit(backProps)).length).toBeGreaterThan(0)
    expect(backProps.theme).not.toBe('accent')
    expect(proceedProps.theme).not.toBe('accent')
    expect(mock.alert).not.toHaveBeenCalled()
    expect(mock.requestWaOptIn).not.toHaveBeenCalled()
  })

  it('"Go back" closes it and the box is STILL UNTICKED; a second unticked Continue goes straight on with ⛔ overlay', async () => {
    await ask()
    fireEvent.click(cont())
    fireEvent.click(screen.getByTestId('wa-signup-reminder-back'))
    expect(screen.queryByTestId('wa-signup-reminder')).toBeNull()
    expect(box()).toHaveAttribute('aria-checked', 'false')
    expect(mock.router.replace).not.toHaveBeenCalled()
    fireEvent.click(cont())
    expect(screen.queryByTestId('wa-signup-reminder')).toBeNull()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.requestWaOptIn).not.toHaveBeenCalled()
    expect(mock.alert).not.toHaveBeenCalled()
  })

  it('"Continue without WhatsApp" goes on to payment, ⛔ requesting anything (AC4)', async () => {
    await ask()
    fireEvent.click(cont())
    fireEvent.click(screen.getByTestId('wa-signup-reminder-proceed'))
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
    expect(mock.requestWaOptIn).not.toHaveBeenCalled()
  })

  it('Android back while the reminder is open = "Go back": it closes, the box stays unticked, and the listener is removed', async () => {
    await ask()
    expect(mock.backHandlers).toHaveLength(0)
    fireEvent.click(cont())
    expect(mock.backHandlers).toHaveLength(1)
    let handled = false
    act(() => { handled = hardwareBack() })
    expect(handled).toBe(true)
    expect(screen.queryByTestId('wa-signup-reminder')).toBeNull()
    expect(box()).toHaveAttribute('aria-checked', 'false')
    expect(mock.backHandlers).toHaveLength(0)
    expect(mock.router.replace).not.toHaveBeenCalled()
  })
})

describe('AC4 — unticked never blocks signup', () => {
  it("payment.tsx's LockInGateStep is unchanged — the WhatsApp step is ⛔ a lock-in step", () => {
    const src = readFileSync(join(__dirname, '..', '..', 'app', '(signup)', 'payment.tsx'), 'utf8')
    expect(src).toContain("type LockInGateStep = 'kyc' | 'nominees' | 'medical' | 'tc'\n")
    expect(src).not.toMatch(/LockInGateStep[^\n]*whatsapp/)
  })
})

describe('AC5 — a tick asks, the member\'s WhatsApp message answers (SB1 (a), SB6)', () => {
  it('ticked + Continue: ONE request, WhatsApp opened with ITS link, then the sent stage', async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    const sent = await screen.findByTestId('wa-signup-sent')
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
    expect(mock.openURL).toHaveBeenCalledWith(LINK)
    expect(mock.requestWaOptIn.mock.invocationCallOrder[0]!).toBeLessThan(mock.openURL.mock.invocationCallOrder[0]!)
    expect(sent).toHaveTextContent(words['waSignup.sent_title']!)
    expect(sent).toHaveTextContent(words['waSignup.sent_desc']!)
    expect(screen.getByTestId('wa-signup-reopen')).toHaveTextContent(words['waNotifications.pending_resend']!)
    expect(screen.queryByTestId('wa-signup-box')).toBeNull()
    expect(mock.router.replace).not.toHaveBeenCalled()
    fireEvent.click(cont())
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
  })

  it('"Open WhatsApp again" re-opens the SAME link — ⛔ a second request — and a rejected re-open says WhatsApp did not open', async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    fireEvent.click(screen.getByTestId('wa-signup-reopen'))
    await settle()
    expect(mock.openURL).toHaveBeenCalledTimes(2)
    expect(mock.openURL).toHaveBeenLastCalledWith(LINK)
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    mock.openURL.mockRejectedValueOnce(new Error('no handler'))
    fireEvent.click(screen.getByTestId('wa-signup-reopen'))
    expect(await screen.findByRole('alert')).toHaveTextContent(words['waSignup.link_failed']!)
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
  })
})

describe('AC6 — every failure still lets the member continue (SB6)', () => {
  async function tickAndContinue() {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await settle()
  }

  it.each(['wa_opt_in.already_active', 'wa_opt_in.channel_unavailable'])('409 %s ⇒ straight on to payment', async (code) => {
    mock.requestWaOptIn.mockRejectedValue(new ApiError(409, code, 'conflict'))
    await tickAndContinue()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.openURL).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each([
    ['409 wa_opt_in.no_mobile', () => new ApiError(409, 'wa_opt_in.no_mobile', 'no mobile')],
    ['409 wa_opt_in.invalid_display_number', () => new ApiError(409, 'wa_opt_in.invalid_display_number', 'bad number')],
    ['a 500', () => new ApiError(500, 'internal', 'boom')],
  ])('%s ⇒ request_failed (an alert); the next Continue goes on with ⛔ second request', async (_name, make) => {
    mock.requestWaOptIn.mockRejectedValue(make())
    await tickAndContinue()
    expect(await screen.findByRole('alert')).toHaveTextContent(words['waSignup.request_failed']!)
    expect(mock.router.replace).not.toHaveBeenCalled()
    expect(mock.openURL).not.toHaveBeenCalled()
    fireEvent.click(cont())
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
  })

  it('a request that hangs ⇒ request_failed at 15 s; the next Continue goes on with ⛔ second request', async () => {
    await ask()
    vi.useFakeTimers()
    mock.requestWaOptIn.mockReturnValue(new Promise(() => {}))
    fireEvent.click(box())
    fireEvent.click(cont())
    await act(async () => { await vi.advanceTimersByTimeAsync(14_999) })
    expect(screen.queryByRole('alert')).toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(screen.getByRole('alert')).toHaveTextContent(words['waSignup.request_failed']!)
    fireEvent.click(cont())
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
  })

  it('WhatsApp does not open ⇒ link_failed on the ask stage; the next Continue goes on with ⛔ second request', async () => {
    mock.openURL.mockRejectedValue(new Error('no handler'))
    await tickAndContinue()
    expect(await screen.findByRole('alert')).toHaveTextContent(words['waSignup.link_failed']!)
    expect(screen.queryByTestId('wa-signup-sent')).toBeNull()
    expect(mock.router.replace).not.toHaveBeenCalled()
    fireEvent.click(cont())
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
  })

  it('⭐ a double tap on Continue makes ONE request (both presses inside one act — the pre-update closure)', async () => {
    await ask()
    fireEvent.click(box())
    const b = cont()
    await act(async () => {
      fireEvent.click(b)
      fireEvent.click(b)
    })
    await screen.findByTestId('wa-signup-sent')
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
    expect(mock.openURL).toHaveBeenCalledTimes(1)
    expect(mock.router.replace).not.toHaveBeenCalled()
  })

  it('a double tap on an UNTICKED Continue shows the reminder — ⛔ skips it', async () => {
    await ask()
    const b = cont()
    await act(async () => {
      fireEvent.click(b)
      fireEvent.click(b)
    })
    expect(screen.getByTestId('wa-signup-reminder')).toBeInTheDocument()
    expect(mock.router.replace).not.toHaveBeenCalled()
  })
})

describe.each(['ios', 'android'])('AC8 — accessible (Platform.OS = %s)', (os) => {
  beforeEach(() => { mock.os = os })

  it('the box announces its checked state; the reminder opening is spoken once, on both platforms', async () => {
    await ask()
    expect(box()).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(box())
    expect(box()).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(box())
    expect(mock.announce).not.toHaveBeenCalled()
    fireEvent.click(cont())
    expect(screen.getByTestId('wa-signup-reminder')).toHaveAttribute('aria-modal', 'true')
    expect(mock.announce).toHaveBeenCalledTimes(1)
    expect(mock.announce).toHaveBeenCalledWith(words['waSignup.popup_title'])
  })

  it('the sent stage is spoken once, on both platforms', async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    expect(mock.announce.mock.calls.filter(([text]) => text === words['waSignup.sent_title'])).toHaveLength(1)
  })

  it('an error is an AnnouncedText line: assertive live region on Android, the announce call on iOS — never both', async () => {
    mock.requestWaOptIn.mockRejectedValue(new ApiError(500, 'internal', 'boom'))
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    const line = await screen.findByRole('alert')
    expect(line).toHaveAttribute('aria-live', 'assertive')
    const spoken = mock.announce.mock.calls.filter(([text]) => text === words['waSignup.request_failed'])
    expect(spoken).toHaveLength(os === 'ios' ? 1 : 0)
  })
})

describe('AC12 — "WhatsApp on another phone?" on the sent stage (SB12)', () => {
  it('is collapsed, then reveals the number and the phrase from the request\'s response — the phrase SELECTABLE', async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    const link = screen.getByTestId('wa-other-phone-link')
    expect(link).toHaveTextContent(words['waOtherPhone.link']!)
    expect(screen.queryByTestId('wa-other-phone-details')).toBeNull()
    fireEvent.click(link)
    const details = screen.getByTestId('wa-other-phone-details')
    expect(details).toHaveTextContent(words['waOtherPhone.desc']!.replace('{number}', '+91 98765 43210'))
    expect(details).toHaveTextContent(words['waOtherPhone.note']!)
    const phrase = screen.getByTestId('wa-other-phone-phrase')
    expect(phrase).toHaveTextContent('TWT-ABCDEFGH')
    expect(phrase).toHaveAttribute('data-selectable', 'true')
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
  })

  it('is ⛔ shown on the ask stage', async () => {
    await ask()
    expect(screen.queryByTestId('wa-other-phone')).toBeNull()
  })
})
