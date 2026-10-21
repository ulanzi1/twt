// @vitest-environment jsdom
// Story 5.10 (AC1–AC6, AC8, AC12-signup; Decision 2026-10-21-375) — the signup WhatsApp step (`app/(signup)/whatsapp.tsx`)
// EXECUTED with React DOM and mocked native primitives, inside a REAL `<LocaleProvider>` (⛔ a stubbed `t` —
// [[feedback_stub_must_call_not_transcribe]]). Harness: `peer-questionnaire-render.test.ts` (a
// mutable `Platform.OS`, a checkbox stub mapping `accessibilityState.checked` → `aria-checked`) + `wa-notifications-screen-
// render.test.ts` (LocaleProvider, mmkv, member-api). Four ways a leg here could pass VACUOUSLY are closed (story T11):
//   · `useRouter` returns ONE stable `mock.router` (a fresh object per call could not be asserted);
//   · the `Button` mock RECORDS its full props per `testID`, so the reminder's two buttons are compared on EVERY prop;
//   · the double tap fires both presses inside ONE `act()` (a mock `<button disabled>` would swallow a second separate click);
//   · the `Text` mock FORWARDS `selectable`.
// Second review: `Modal` renders its children only while `visible` and records its props (`mock.modal`), so the reminder's
// window-level modality and its `onRequestClose` are asserted; `AppState` is mutable (`setAppState`), so the `sent` stage's
// announcement is pinned to the member's RETURN to TWT.
// Native layout and a real screen reader still need a device ([[feedback_record_unattested_no_backfill]]).
import '@testing-library/jest-dom/vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ApiError } from '@twt/api-client'
import { WaOptInStateSchema } from '@twt/contracts'
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
  os: 'ios' as string,
  buttons: {} as Record<string, Record<string, unknown>>,
  views: {} as Record<string, Record<string, unknown>>,
  focused: true,
  focusListeners: new Set<() => void>(),
  appState: 'active' as string,
  appStateHandlers: [] as ((next: string) => void)[],
  modal: null as Record<string, unknown> | null,
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { getWaOptInStatus: mock.getWaOptInStatus, requestWaOptIn: mock.requestWaOptIn },
}))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  const useFocusEffect = (cb: () => void | (() => void)) => useEffect(() => {
    let undo: void | (() => void)
    let active = false
    const sync = () => {
      if (mock.focused && !active) {
        active = true
        undo = cb()
      } else if (!mock.focused && active) {
        active = false
        if (undo) undo()
      }
    }
    mock.focusListeners.add(sync)
    sync()
    return () => {
      mock.focusListeners.delete(sync)
      if (active && undo) undo()
    }
  }, [cb])
  return { useRouter: () => mock.router, useFocusEffect }
})
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 48, left: 0, right: 0 }) }))
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: (props: { children?: ReactNode; testID?: string }) => {
      if (props.testID) mock.views[props.testID] = props
      return createElement('div', { 'data-testid': props.testID }, props.children)
    },
    StyleSheet: { absoluteFill: {} },
    Modal: (props: { children?: ReactNode; visible?: boolean }) => {
      mock.modal = props
      return props.visible ? createElement('div', { 'data-testid': 'rn-modal' }, props.children) : null
    },
    AppState: {
      get currentState() { return mock.appState },
      addEventListener: (_event: string, handler: (next: string) => void) => {
        mock.appStateHandlers.push(handler)
        return { remove: () => { mock.appStateHandlers = mock.appStateHandlers.filter((h) => h !== handler) } }
      },
    },
    Linking: { openURL: mock.openURL },
    Alert: { alert: mock.alert },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    Platform: { get OS() { return mock.os } },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type Props = {
    children?: ReactNode; testID?: string; accessibilityRole?: string; accessibilityLabel?: string
    accessibilityLiveRegion?: string; accessibilityViewIsModal?: boolean; selectable?: boolean; accessible?: boolean
  }
  const container = (props: Props) => {
    const { children, testID, accessibilityRole, accessibilityLabel, accessibilityLiveRegion, accessibilityViewIsModal, selectable } = props
    if (testID) mock.views[testID] = props
    return createElement('div', {
      'data-testid': testID,
      role: accessibilityRole === 'alert' ? 'alert' : undefined,
      'aria-label': accessibilityLabel,
      'aria-live': accessibilityLiveRegion,
      'aria-modal': mock.os === 'ios' && accessibilityViewIsModal ? 'true' : undefined,
      'data-selectable': selectable ? 'true' : undefined,
    }, children)
  }
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

/** The app moving to `next` (WhatsApp taking the foreground = 'background'; the member returning = 'active'). */
function setAppState(next: string) {
  act(() => {
    mock.appState = next
    for (const handler of [...mock.appStateHandlers]) handler(next)
  })
}

function setFocused(focused: boolean) {
  act(() => {
    mock.focused = focused
    for (const sync of mock.focusListeners) sync()
  })
}

beforeEach(() => {
  for (const f of [mock.getWaOptInStatus, mock.requestWaOptIn, mock.openURL, mock.alert, mock.announce, mock.router.replace]) f.mockReset()
  mock.requestWaOptIn.mockResolvedValue(MINTED)
  mock.openURL.mockResolvedValue(true)
  mock.os = 'ios'
  mock.buttons = {}
  mock.views = {}
  mock.focused = true
  mock.appState = 'active'
  mock.appStateHandlers = []
  mock.modal = null
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
    expect(mock.announce).not.toHaveBeenCalled()
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

describe('AC2 — every other state IS offered the box (second review P6 (a))', () => {
  const OFFERED = ['PENDING', 'REVOKED', 'BLOCKED_BY_META', 'EXPIRED_24H_WINDOW']

  it('the list is every state but ACTIVE — a new state must be placed here deliberately', () => {
    expect(WaOptInStateSchema.options.filter((s) => s !== 'ACTIVE').sort()).toEqual([...OFFERED].sort())
  })

  it.each(OFFERED)('state %s ⇒ the UNTICKED box, ⛔ straight on', async (state) => {
    mock.getWaOptInStatus.mockResolvedValue(status(state))
    renderStep()
    expect(await screen.findByTestId('wa-signup-box')).toHaveAttribute('aria-checked', 'false')
    expect(mock.router.replace).not.toHaveBeenCalled()
  })

  it('ACTIVE on a Pariwar where WhatsApp is now off ⇒ straight on', async () => {
    mock.getWaOptInStatus.mockResolvedValue(status('ACTIVE', false))
    renderStep()
    await settle()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(screen.queryByTestId('wa-signup-box')).toBeNull()
  })
})

describe('AC3 — the reminder, once, even-handed (SB4)', () => {
  it('an unticked Continue shows a rendered modal overlay — ⛔ Alert.alert — with two buttons that differ ONLY in label, handler and testID', async () => {
    await ask()
    fireEvent.click(cont())
    const overlay = screen.getByTestId('wa-signup-reminder')
    expect(mock.modal).toMatchObject({ transparent: true, visible: true })
    expect(screen.getByTestId('rn-modal')).toContainElement(overlay)
    expect(overlay).toHaveAttribute('aria-modal', 'true')
    expect(mock.views['wa-signup-reminder-instruction']!.accessibilityHint).toBeUndefined()
    expect(mock.views['wa-signup-reminder-instruction']!.accessibilityLabel)
      .toBe(`${words['waSignup.popup_title']} ${words['waSignup.popup_a11y']}`)
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

  it('"Go back", then the member ticks the box: Continue makes the ONE request and opens WhatsApp', async () => {
    await ask()
    fireEvent.click(cont())
    fireEvent.click(screen.getByTestId('wa-signup-reminder-back'))
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
    expect(mock.openURL).toHaveBeenCalledWith(LINK)
    expect(mock.router.replace).not.toHaveBeenCalled()
  })

  it('"Continue without WhatsApp" goes on to payment, ⛔ requesting anything (AC4)', async () => {
    await ask()
    fireEvent.click(cont())
    fireEvent.click(screen.getByTestId('wa-signup-reminder-proceed'))
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
    expect(mock.requestWaOptIn).not.toHaveBeenCalled()
  })

  it('Android back while the reminder is open = "Go back" (the Modal\'s onRequestClose): it closes and the box stays unticked', async () => {
    await ask()
    fireEvent.click(cont())
    expect(mock.modal!.onRequestClose).toBeTypeOf('function')
    act(() => { (mock.modal!.onRequestClose as () => void)() })
    expect(mock.modal!.visible).toBe(false)
    expect(screen.queryByTestId('wa-signup-reminder')).toBeNull()
    expect(box()).toHaveAttribute('aria-checked', 'false')
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

  it('the box is locked while the request is in flight — an untick then cannot be made (second review P3)', async () => {
    await ask()
    let resolveMint!: (value: typeof MINTED) => void
    mock.requestWaOptIn.mockReturnValue(new Promise((resolve) => { resolveMint = resolve }))
    fireEvent.click(box())
    fireEvent.click(cont())
    await settle()
    expect(box()).toBeDisabled()
    expect(mock.buttons['wa-signup-box']!.accessibilityState).toEqual({ checked: true, disabled: true })
    fireEvent.click(box())
    expect(box()).toHaveAttribute('aria-checked', 'true')
    await act(async () => { resolveMint(MINTED) })
    expect(await screen.findByTestId('wa-signup-sent')).toBeInTheDocument()
  })

  it('a box tap in the SAME frame as Continue (before the lock renders) cannot untick it', async () => {
    await ask()
    mock.requestWaOptIn.mockReturnValue(new Promise(() => {}))
    fireEvent.click(box())
    const b = box()
    const c = cont()
    await act(async () => {
      fireEvent.click(c)
      fireEvent.click(b)
    })
    expect(box()).toHaveAttribute('aria-checked', 'true')
  })

  it('a box UNTICK in the same frame just BEFORE Continue wins: the reminder, ⛔ a request (patch review)', async () => {
    await ask()
    fireEvent.click(box())
    const b = box()
    const c = cont()
    await act(async () => {
      fireEvent.click(b)
      fireEvent.click(c)
    })
    expect(mock.requestWaOptIn).not.toHaveBeenCalled()
    expect(screen.getByTestId('wa-signup-reminder')).toBeInTheDocument()
    expect(box()).toHaveAttribute('aria-checked', 'false')
  })

  it('after WhatsApp did not open the box is unlocked again', async () => {
    mock.openURL.mockRejectedValue(new Error('no handler'))
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByRole('alert')
    expect(box()).not.toBeDisabled()
  })

  it('after a failed request the box is unlocked again', async () => {
    mock.requestWaOptIn.mockRejectedValue(new ApiError(500, 'internal', 'boom'))
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByRole('alert')
    expect(box()).not.toBeDisabled()
    expect(mock.buttons['wa-signup-box']!.accessibilityState).toEqual({ checked: true, disabled: false })
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

  it('the box appearing and the reminder opening are each spoken once, on both platforms; the box announces its checked state', async () => {
    await ask()
    // Second review P5: focus was on the loading spinner, which unmounts — the box's arrival is spoken.
    expect(mock.announce).toHaveBeenCalledTimes(1)
    expect(mock.announce).toHaveBeenLastCalledWith(words['waSignup.title'])
    expect(box()).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(box())
    expect(box()).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(box())
    expect(mock.announce).toHaveBeenCalledTimes(1)
    fireEvent.click(cont())
    // Modal to assistive tech on BOTH platforms through the window-level Modal; `accessibilityViewIsModal` is iOS-only
    // (second review P6 (c)), so it is asserted on the iOS leg alone.
    expect(mock.modal).toMatchObject({ transparent: true, visible: true })
    if (os === 'ios') expect(mock.views['wa-signup-reminder']!.accessibilityViewIsModal).toBe(true)
    expect(mock.announce).toHaveBeenCalledTimes(2)
    expect(mock.announce).toHaveBeenLastCalledWith(words['waSignup.popup_title'])
  })

  it('the reminder is its own window (second review D1 (a)): the screen behind it is outside the Modal; it closes on "Go back"', async () => {
    await ask()
    expect(mock.modal).toMatchObject({ transparent: true, visible: false })
    expect(screen.queryByTestId('wa-signup-reminder')).toBeNull()
    fireEvent.click(cont())
    expect(mock.modal).toMatchObject({ transparent: true, visible: true })
    const modal = screen.getByTestId('rn-modal')
    expect(modal).toContainElement(screen.getByTestId('wa-signup-reminder'))
    expect(modal).not.toContainElement(box())
    expect(modal).not.toContainElement(cont())
    fireEvent.click(screen.getByTestId('wa-signup-reminder-back'))
    expect(mock.modal!.visible).toBe(false)
    expect(screen.queryByTestId('rn-modal')).toBeNull()
  })

  it('the heading is ONE accessible element named by its visible title FIRST, then the instruction — ⛔ an optional hint (P4 + patch review)', async () => {
    await ask()
    fireEvent.click(cont())
    const instruction = mock.views['wa-signup-reminder-instruction']!
    expect(instruction.accessible).toBe(true)
    const name = instruction.accessibilityLabel as string
    expect(name.startsWith(words['waSignup.popup_title']!)).toBe(true)
    expect(name).toContain(words['waSignup.popup_a11y']!)
    expect(instruction.accessibilityHint).toBeUndefined()
    expect(screen.getByTestId('wa-signup-reminder-instruction')).toHaveTextContent(words['waSignup.popup_title']!)
    // The heading must not group the two actions into a single accessibility element.
    expect(screen.getByTestId('wa-signup-reminder-instruction').querySelector('button')).toBeNull()
    expect(mock.views['wa-signup-reminder']!.accessible).not.toBe(true)
  })

  // Second review P1: the `sent` stage lands as WhatsApp takes the foreground — it is spoken on the member's RETURN, once.
  const sentSpoken = () => mock.announce.mock.calls.filter(([text]) => text === words['waSignup.sent_title']).length

  it('openURL settling AFTER the switch (TWT already in the background): ⛔ spoken then; spoken on the return, once', async () => {
    await ask()
    mock.openURL.mockImplementation(async () => {
      mock.appState = 'background'
      return true
    })
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    // The DOM can show the stage before its AppState effect has run — flush it before driving AppState (a CI-load flake).
    await settle()
    expect(sentSpoken()).toBe(0)
    setAppState('active')
    expect(sentSpoken()).toBe(1)
    setAppState('background')
    setAppState('active')
    expect(sentSpoken()).toBe(1)
  })

  it('openURL settling BEFORE the switch (TWT still active): ⛔ spoken at once; spoken on the return', async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    // The DOM can show the stage before its AppState effect has run — flush it before driving AppState (a CI-load flake).
    await settle()
    expect(sentSpoken()).toBe(0)
    setAppState('background')
    expect(sentSpoken()).toBe(0)
    setAppState('active')
    expect(sentSpoken()).toBe(1)
  })

  it('if TWT never leaves the foreground, it is spoken after the 2 s grace — ⛔ before', async () => {
    await ask()
    vi.useFakeTimers()
    fireEvent.click(box())
    fireEvent.click(cont())
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByTestId('wa-signup-sent')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(1_999) })
    expect(sentSpoken()).toBe(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(sentSpoken()).toBe(1)
  })

  it('a departure before the grace ends stops the grace: ⛔ spoken while in WhatsApp, spoken on the return', async () => {
    await ask()
    vi.useFakeTimers()
    fireEvent.click(box())
    fireEvent.click(cont())
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    setAppState('background')
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
    expect(sentSpoken()).toBe(0)
    setAppState('active')
    expect(sentSpoken()).toBe(1)
  })

  it('an iOS `inactive` blip (Control Centre, a call banner) is ⛔ a departure: nothing is spoken for it, and the grace still runs', async () => {
    await ask()
    vi.useFakeTimers()
    fireEvent.click(box())
    fireEvent.click(cont())
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    setAppState('inactive')
    setAppState('active')
    expect(sentSpoken()).toBe(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(sentSpoken()).toBe(1)
  })

  it('TWT still `inactive` when the grace ends (the app switcher): ⛔ spoken then; spoken on the return', async () => {
    await ask()
    vi.useFakeTimers()
    fireEvent.click(box())
    fireEvent.click(cont())
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    setAppState('inactive')
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(sentSpoken()).toBe(0)
    setAppState('active')
    expect(sentSpoken()).toBe(1)
  })

  it("iOS's own order on leaving and coming back (inactive → background → active): spoken once, only when active", async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    await settle()
    setAppState('inactive')
    setAppState('background')
    setAppState('inactive')
    expect(sentSpoken()).toBe(0)
    setAppState('active')
    expect(sentSpoken()).toBe(1)
  })

  it('a grace announcement does ⛔ use up the return: a late departure is spoken again on coming back, once', async () => {
    await ask()
    vi.useFakeTimers()
    fireEvent.click(box())
    fireEvent.click(cont())
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(sentSpoken()).toBe(1)
    setAppState('background')
    setAppState('active')
    expect(sentSpoken()).toBe(2)
    setAppState('background')
    setAppState('active')
    expect(sentSpoken()).toBe(2)
  })

  it('leaving the step during the grace: ⛔ spoken afterwards, and the listener is removed', async () => {
    await ask()
    vi.useFakeTimers()
    fireEvent.click(box())
    fireEvent.click(cont())
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(mock.appStateHandlers).toHaveLength(1)
    cleanup()
    expect(mock.appStateHandlers).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(sentSpoken()).toBe(0)
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
  it('is collapsed, then reveals the number and the phrase from the request\'s response — each SELECTABLE on its own line', async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    const link = screen.getByTestId('wa-other-phone-link')
    expect(link).toHaveTextContent(words['waOtherPhone.link']!)
    expect(screen.queryByTestId('wa-other-phone-details')).toBeNull()
    fireEvent.click(link)
    const details = screen.getByTestId('wa-other-phone-details')
    expect(details).toHaveTextContent(words['waOtherPhone.desc']!)
    expect(details).toHaveTextContent(words['waOtherPhone.note']!)
    // Second review D2 (b): the number ALONE on its own selectable line, between the sentence and the phrase.
    const number = screen.getByTestId('wa-other-phone-number')
    expect(number).toHaveTextContent(/^\+91 98765 43210$/)
    expect(number).toHaveAttribute('data-selectable', 'true')
    const phrase = screen.getByTestId('wa-other-phone-phrase')
    expect(screen.getByText(words['waOtherPhone.desc']!).compareDocumentPosition(number) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
    expect(number.compareDocumentPosition(phrase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Each value is introduced by its own label line (BigDev), OUTSIDE the selectable value — a copy takes only the value.
    const numberLabel = screen.getByTestId('wa-other-phone-number-label')
    const phraseLabel = screen.getByTestId('wa-other-phone-phrase-label')
    expect(numberLabel).toHaveTextContent(words['waOtherPhone.number_label']!)
    expect(phraseLabel).toHaveTextContent(words['waOtherPhone.message_label']!)
    expect(numberLabel).not.toHaveAttribute('data-selectable')
    expect(phraseLabel).not.toHaveAttribute('data-selectable')
    expect(numberLabel.compareDocumentPosition(number) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(number.compareDocumentPosition(phraseLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(phraseLabel.compareDocumentPosition(phrase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(phrase).toHaveTextContent(/^TWT-ABCDEFGH$/)
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

describe('Review R2 — a response belongs to the visit that requested it', () => {
  for (const departure of ['unmount', 'blur', 'blur then refocus'] as const) {
    it.each(['success', 'wa_opt_in.already_active', 'wa_opt_in.channel_unavailable', 'other error'])(
      `${departure}: delayed %s cannot open WhatsApp or navigate`, async (outcome) => {
        await ask()
        let resolveMint!: (value: typeof MINTED) => void
        let rejectMint!: (error: unknown) => void
        mock.requestWaOptIn.mockReturnValue(new Promise((resolve, reject) => {
          resolveMint = resolve
          rejectMint = reject
        }))
        fireEvent.click(box())
        fireEvent.click(cont())
        if (departure === 'unmount') cleanup()
        else {
          setFocused(false)
          if (departure === 'blur then refocus') setFocused(true)
        }
        await act(async () => {
          if (outcome === 'success') resolveMint(MINTED)
          else rejectMint(new ApiError(outcome === 'other error' ? 500 : 409, outcome, 'failed'))
        })
        expect(mock.openURL).not.toHaveBeenCalled()
        expect(mock.router.replace).not.toHaveBeenCalled()
        if (departure !== 'unmount') {
          // After `cleanup()` there is no tree to hold an alert, so this only bites while the step is still mounted.
          expect(screen.queryByRole('alert')).toBeNull()
          // An abandoned first attempt still counts as the one mint; returning lets the member continue.
          setFocused(true)
          expect(cont()).not.toBeDisabled()
          fireEvent.click(cont())
          expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
          expect(mock.requestWaOptIn).toHaveBeenCalledTimes(1)
        }
      },
    )
  }

  it.each(['success', 'rejection'])('ignores a late link %s after blur and refocus', async (outcome) => {
    await ask()
    let resolveLink!: () => void
    let rejectLink!: (error: unknown) => void
    mock.openURL.mockReturnValue(new Promise<void>((resolve, reject) => { resolveLink = resolve; rejectLink = reject }))
    fireEvent.click(box())
    fireEvent.click(cont())
    await settle()
    expect(mock.openURL).toHaveBeenCalledTimes(1)
    setFocused(false)
    setFocused(true)
    await act(async () => {
      if (outcome === 'success') resolveLink()
      else rejectLink(new Error('cancelled'))
    })
    expect(screen.queryByTestId('wa-signup-sent')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(mock.router.replace).not.toHaveBeenCalled()
    // A return to TWT after the abandoned link speaks nothing: the only announcement is the box's arrival.
    setAppState('background')
    setAppState('active')
    expect(mock.announce.mock.calls).toEqual([[words['waSignup.title']]])
  })

  it('ignores a late reopen error after blur and refocus', async () => {
    await ask()
    fireEvent.click(box())
    fireEvent.click(cont())
    await screen.findByTestId('wa-signup-sent')
    let rejectLink!: (error: unknown) => void
    mock.openURL.mockReturnValue(new Promise((_resolve, reject) => { rejectLink = reject }))
    fireEvent.click(screen.getByTestId('wa-signup-reopen'))
    setFocused(false)
    setFocused(true)
    await act(async () => { rejectLink(new Error('cancelled')) })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(cont()).not.toBeDisabled()
  })
})

describe('Review R3 — an overflowing reminder can scroll', () => {
  it('keeps both choices inside a ScrollView bounded by the available overlay height', async () => {
    await ask()
    fireEvent.click(cont())
    const scrolling = screen.getByTestId('wa-signup-reminder-scroll')
    expect(scrolling).toContainElement(screen.getByTestId('wa-signup-reminder-back'))
    expect(scrolling).toContainElement(screen.getByTestId('wa-signup-reminder-proceed'))
    expect(mock.views['wa-signup-reminder-scroll']!.style).toMatchObject({ maxHeight: '100%', flexGrow: 0 })
    expect(screen.getByTestId('wa-signup-reminder')).toContainElement(scrolling)
  })

  it('keeps the card clear of the system bars the window-level Modal reaches under (patch review)', async () => {
    await ask()
    fireEvent.click(cont())
    expect(mock.views['wa-signup-reminder']).toMatchObject({ pt: 24 + 16, pb: 48 + 16 })
  })
})
