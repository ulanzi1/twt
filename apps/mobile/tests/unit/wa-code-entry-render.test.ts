// @vitest-environment jsdom
// Story 5.13 (Task 5.4; AC1's render legs, AC9, AC13; WC7, WC16; Decision 2026-10-21-374 option A, build decisions -376) — the
// signup WhatsApp step's "WhatsApp on another phone?" with a WhatsApp CODE (`OtherPhoneCodeHint` → `useWaCode` + `WaCodeEntry`),
// EXECUTED inside the REAL step (`app/(signup)/whatsapp.tsx`) and a REAL `<LocaleProvider>` (⛔ a stubbed `t` —
// [[feedback_stub_must_call_not_transcribe]]). The harness is wa-signup-step-render.test.ts's (a stable router, recorded Button
// props, a mutable Platform / AppState) plus a tamagui `Input` that RECORDS its props, so the ABSENCE of `textContentType` /
// `autoComplete` is asserted (T12). Every error is a REAL `ApiError`; the double tap fires both presses inside ONE `act()`.
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
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
  sendWaOptInCode: vi.fn(),
  verifyWaOptInCode: vi.fn(),
  openURL: vi.fn(),
  announce: vi.fn(),
  router: { replace: vi.fn() },
  os: 'ios' as string,
  buttons: {} as Record<string, Record<string, unknown>>,
  inputs: {} as Record<string, Record<string, unknown>>,
  focused: true,
  focusListeners: new Set<() => void>(),
  appState: 'active' as string,
  appStateHandlers: [] as ((next: string) => void)[],
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: {
    getWaOptInStatus: mock.getWaOptInStatus,
    requestWaOptIn: mock.requestWaOptIn,
    sendWaOptInCode: mock.sendWaOptInCode,
    verifyWaOptInCode: mock.verifyWaOptInCode,
  },
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
    ScrollView: (props: { children?: ReactNode; testID?: string }) => createElement('div', { 'data-testid': props.testID }, props.children),
    StyleSheet: { absoluteFill: {} },
    Modal: (props: { children?: ReactNode; visible?: boolean }) => (props.visible ? createElement('div', { 'data-testid': 'rn-modal' }, props.children) : null),
    AppState: {
      get currentState() { return mock.appState },
      addEventListener: (_event: string, handler: (next: string) => void) => {
        mock.appStateHandlers.push(handler)
        return { remove: () => { mock.appStateHandlers = mock.appStateHandlers.filter((h) => h !== handler) } }
      },
    },
    Linking: { openURL: mock.openURL },
    Alert: { alert: vi.fn() },
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    Platform: { get OS() { return mock.os } },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type Props = { children?: ReactNode; testID?: string; accessibilityRole?: string; accessibilityLabel?: string; accessibilityLiveRegion?: string; selectable?: boolean }
  const container = (props: Props) =>
    createElement('div', {
      'data-testid': props.testID,
      role: props.accessibilityRole === 'alert' ? 'alert' : undefined,
      'aria-label': props.accessibilityLabel,
      'aria-live': props.accessibilityLiveRegion,
      'data-selectable': props.selectable ? 'true' : undefined,
    }, props.children)
  return {
    YStack: container, Paragraph: container, Text: container, H2: container, View: container,
    Spinner: ({ testID }: { testID?: string }) => createElement('div', { 'data-testid': testID ?? 'spinner' }),
    Input: (props: Record<string, unknown> & { value?: string; onChangeText?: (v: string) => void; testID?: string; accessibilityLabel?: string; maxLength?: number }) => {
      if (props.testID) mock.inputs[props.testID] = props
      return createElement('input', {
        value: props.value ?? '', 'data-testid': props.testID, 'aria-label': props.accessibilityLabel,
        // Native-equivalent: React Native truncates the incoming text to `maxLength` BEFORE `onChangeText` (code review P2).
        onChange: (e: { target: { value: string } }) =>
          props.onChangeText?.(typeof props.maxLength === 'number' ? e.target.value.slice(0, props.maxLength) : e.target.value),
      })
    },
    Button: (props: Record<string, unknown> & { children?: ReactNode; onPress?: () => void; disabled?: boolean; testID?: string;
      accessibilityRole?: string; accessibilityLabel?: string; accessibilityState?: { checked?: boolean; expanded?: boolean } }) => {
      if (props.testID) mock.buttons[props.testID] = props
      return createElement('button', {
        onClick: props.onPress, disabled: props.disabled, role: props.accessibilityRole, 'aria-label': props.accessibilityLabel,
        'aria-checked': props.accessibilityState?.checked, 'aria-expanded': props.accessibilityState?.expanded, 'data-testid': props.testID,
      }, props.children)
    },
  }
})

import WhatsappStepScreen from '../../app/(signup)/whatsapp'

const NEXT = '/(signup)/payment'
const words = getCatalog('en', 'common')!
const BASE = { state: 'PENDING', displayPhoneNumber: '+91 98765 43210', deepLink: 'https://wa.me/919876543210?text=TWT-ABCDEFGH', verificationPhrase: 'TWT-ABCDEFGH' }
const OFFER = { ...BASE, codeAvailable: true, codesRemaining: 2, liveCode: false, liveCodeDelivery: null }
const CLOSED = { ...BASE, codeAvailable: false, codesRemaining: 2, liveCode: false, liveCodeDelivery: null }

const status = (state: string | null) => ({ available: true, displayPhoneNumber: '+91 98765 43210', state, deepLink: null, verificationPhrase: null, windowExpiresAt: null })
const err = (status: number, code: string, details?: unknown) => new ApiError(status, code, 'x', details)
const details = (d: Record<string, unknown>) => ({ codesRemaining: 1, liveCode: false, ...d })
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const q = (id: string) => screen.queryByTestId(id)
const get = (id: string) => screen.getByTestId(id)

/** Render the step, tick, Continue ⇒ the mint answers `minted` and WhatsApp opens (`link: false` ⇒ it does ⛔ open). */
async function toSent(minted: Record<string, unknown>, opts: { link?: boolean } = {}) {
  mock.getWaOptInStatus.mockResolvedValue(status(null))
  mock.requestWaOptIn.mockResolvedValue(minted)
  if (opts.link === false) mock.openURL.mockRejectedValue(new Error('no handler'))
  render(createElement(LocaleProvider, { initialLocale: 'en' }, createElement(WhatsappStepScreen)))
  fireEvent.click(await screen.findByTestId('wa-signup-box'))
  fireEvent.click(get('wa-signup-continue'))
  await settle()
}

/** Open the code form (the link is collapsed by default). */
function expand() {
  fireEvent.click(get('wa-code-link'))
}

async function press(id: string) {
  await act(async () => { fireEvent.click(get(id)) })
  await settle()
}

function typeCode(text: string) {
  fireEvent.change(get('wa-code-input'), { target: { value: text } })
}

const alertText = () => screen.queryByRole('alert')?.textContent ?? null

beforeEach(() => {
  for (const f of [mock.getWaOptInStatus, mock.requestWaOptIn, mock.sendWaOptInCode, mock.verifyWaOptInCode, mock.openURL, mock.announce, mock.router.replace]) f.mockReset()
  mock.openURL.mockResolvedValue(true)
  mock.os = 'ios'
  mock.buttons = {}
  mock.inputs = {}
  mock.focused = true
  mock.appState = 'active'
  mock.appStateHandlers = []
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('AC1 — the link offers the code only where it can work', () => {
  it('codeAvailable ⇒ a COLLAPSED `wa-code-link` (5.10\'s label); expanded: the intro and Send — ⛔ the number + phrase', async () => {
    await toSent(OFFER)
    expect(get('wa-code-link')).toHaveTextContent(words['waOtherPhone.link']!)
    expect(get('wa-code-link')).toHaveAttribute('aria-expanded', 'false')
    expect(q('wa-code-form')).toBeNull()
    expect(q('wa-other-phone-link')).toBeNull()
    expand()
    expect(get('wa-code-link')).toHaveAttribute('aria-expanded', 'true')
    expect(get('wa-code-form')).toHaveTextContent(words['waCode.intro']!)
    expect(get('wa-code-send')).toHaveTextContent(words['waCode.send']!)
    expect(q('wa-code-resend')).toBeNull()
    expect(q('wa-other-phone-number')).toBeNull()
    expect(q('wa-code-input')).toBeNull()
  })

  it.each([['sent', 'waCode.sent'], ['uncertain', 'waCode.sent_uncertain']] as const)(
    'liveCode (delivery %s) ⇒ opens EXPANDED at the field with its line; Send another code (one left)', async (delivery, key) => {
      await toSent({ ...OFFER, liveCode: true, codesRemaining: 1, liveCodeDelivery: delivery })
      expect(get('wa-code-link')).toHaveAttribute('aria-expanded', 'true')
      expect(get('wa-code-status')).toHaveTextContent(words[key]!)
      expect(get('wa-code-input')).toBeInTheDocument()
      expect(q('wa-code-send')).toBeNull()
      expect(get('wa-code-resend')).toBeInTheDocument()
      expect(q('wa-other-phone-details')).toBeNull()
    })

  it('codeAvailable false + liveCode ⇒ the form renders at the field, the closed route below, ⛔ send or resend (whatever codesRemaining says)', async () => {
    await toSent({ ...CLOSED, liveCode: true, codesRemaining: 1, liveCodeDelivery: 'sent' })
    expect(get('wa-code-input')).toBeInTheDocument()
    expect(get('wa-other-phone-number')).toHaveTextContent('+91 98765 43210')
    expect(get('wa-other-phone-phrase')).toHaveTextContent('TWT-ABCDEFGH')
    expect(q('wa-code-send')).toBeNull()
    expect(q('wa-code-resend')).toBeNull()
  })

  it('both false ⇒ 5.10\'s `OtherPhoneHint` exactly (⛔ `wa-code-link`)', async () => {
    await toSent(CLOSED)
    expect(get('wa-other-phone-link')).toBeInTheDocument()
    expect(q('wa-code-link')).toBeNull()
  })

  it('ask + the link did ⛔ open: the code link ONLY when codeAvailable || liveCode; otherwise 5.10\'s ask stage (⛔ hint)', async () => {
    await toSent(OFFER, { link: false })
    expect(alertText()).toBe(words['waSignup.link_failed'])
    expect(get('wa-signup-box')).toBeInTheDocument()
    expect(get('wa-code-link')).toBeInTheDocument()
    cleanup()
    mock.openURL.mockReset()
    await toSent(CLOSED, { link: false })
    expect(q('wa-code-link')).toBeNull()
    expect(q('wa-other-phone-link')).toBeNull()
  })

  it('ask with a request failure ⇒ ⛔ link (⛔ mint)', async () => {
    mock.getWaOptInStatus.mockResolvedValue(status(null))
    mock.requestWaOptIn.mockRejectedValue(err(500, 'internal.error'))
    render(createElement(LocaleProvider, { initialLocale: 'en' }, createElement(WhatsappStepScreen)))
    fireEvent.click(await screen.findByTestId('wa-signup-box'))
    fireEvent.click(get('wa-signup-continue'))
    await settle()
    expect(alertText()).toBe(words['waSignup.request_failed'])
    expect(q('wa-code-link')).toBeNull()
  })

  it('source — the "WhatsApp notifications" screen still renders `OtherPhoneHint` (WC6 (a)) and ⛔ the code hint', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'app', '(settings)', 'notifications.tsx'), 'utf8')
    expect(src).toContain('<OtherPhoneHint ')
    expect(src).not.toContain('OtherPhoneCodeHint')
  })
})

describe('AC9 — Send', () => {
  it('200 sent ⇒ waCode.sent + the field (number-pad, 6, labelled, ⛔ oneTimeCode / autoComplete) + Confirm disabled under 6 digits', async () => {
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 })
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(get('wa-code-status')).toHaveTextContent(words['waCode.sent']!)
    const input = mock.inputs['wa-code-input']!
    expect(input).toMatchObject({ keyboardType: 'number-pad', accessibilityLabel: words['waCode.input_label'] })
    // ⛔ native maxLength — it would cut a pasted "123 456" BEFORE the digits-only filter; the hook keeps six (code review P2).
    expect(input.maxLength).toBeUndefined()
    expect('textContentType' in input).toBe(false)
    expect('autoComplete' in input).toBe(false)
    expect(get('wa-code-confirm')).toBeDisabled()
    typeCode('12345')
    expect(get('wa-code-confirm')).toBeDisabled()
    typeCode('123456')
    expect(get('wa-code-confirm')).toBeEnabled()
    expect(q('wa-code-send')).toBeNull()
    expect(get('wa-code-resend')).toBeDisabled()
    expect(get('wa-code-wait')).toHaveTextContent(words['waCode.resend_wait']!)
    expect(mock.sendWaOptInCode).toHaveBeenCalledTimes(1)
  })

  it('a paste of "123 456" becomes "123456" (digits only, six at most)', async () => {
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: null })
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    typeCode('123 456')
    expect(get('wa-code-input')).toHaveValue('123456')
    typeCode('1234567')
    expect(get('wa-code-input')).toHaveValue('123456')
  })

  it('⭐ the resend countdown runs from the response (fake timers — ⛔ the device clock), then Send another code is enabled', async () => {
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 3 })
    await toSent(OFFER)
    expand()
    vi.useFakeTimers()
    await act(async () => { fireEvent.click(get('wa-code-send')) })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(get('wa-code-resend')).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(get('wa-code-resend')).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(get('wa-code-resend')).toBeEnabled()
    expect(q('wa-code-wait')).toBeNull()
  })

  it.each([
    ['200 uncertain', () => mock.sendWaOptInCode.mockResolvedValue({ delivery: 'uncertain', codesRemaining: 1, retryAfterSeconds: 60 })],
    ['a transport rejection (⛔ ApiError)', () => mock.sendWaOptInCode.mockRejectedValue(new TypeError('Network request failed'))],
    ['a 500 internal.error with ⛔ details', () => mock.sendWaOptInCode.mockRejectedValue(err(500, 'internal.error'))],
    ['a proxy 504 (http.504)', () => mock.sendWaOptInCode.mockRejectedValue(err(504, 'http.504'))],
  ])('%s ⇒ sent_uncertain + the field (a code may still arrive); Send another code after the wait', async (_n, arrange) => {
    arrange()
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(get('wa-code-status')).toHaveTextContent(words['waCode.sent_uncertain']!)
    expect(get('wa-code-input')).toBeInTheDocument()
    expect(get('wa-code-resend')).toBeDisabled()
    expect(q('wa-code-send')).toBeNull()
  })

  it('a client timeout (15 s) ⇒ sent_uncertain + the field', async () => {
    mock.sendWaOptInCode.mockReturnValue(new Promise(() => {}))
    await toSent(OFFER)
    expand()
    vi.useFakeTimers()
    await act(async () => { fireEvent.click(get('wa-code-send')) })
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(get('wa-code-status')).toHaveTextContent(words['waCode.sent_uncertain']!)
    expect(get('wa-code-input')).toBeInTheDocument()
  })

  it('⭐ a released FIRST send (502, 2 left) ⇒ send_failed + Send ENABLED, ⛔ wait, ⛔ number + phrase yet', async () => {
    mock.sendWaOptInCode.mockRejectedValue(err(502, 'wa_opt_in.code_send_failed', details({ codesRemaining: 2, retryAfterSeconds: null })))
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(alertText()).toBe(words['waCode.send_failed'])
    expect(get('wa-code-send')).toBeEnabled()
    expect(q('wa-code-wait')).toBeNull()
    expect(q('wa-other-phone-details')).toBeNull()
    expect(q('wa-code-input')).toBeNull()
  })

  it('a rate-limited release (2 left, wait 60) ⇒ Send disabled for the wait', async () => {
    mock.sendWaOptInCode.mockRejectedValue(err(502, 'wa_opt_in.code_send_failed', details({ codesRemaining: 2, retryAfterSeconds: 60 })))
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(get('wa-code-send')).toBeDisabled()
    expect(get('wa-code-wait')).toBeInTheDocument()
  })

  it('a refused send with ONE left ⇒ send_failed + Send (⛔ told) + the number + phrase', async () => {
    mock.sendWaOptInCode.mockRejectedValue(err(502, 'wa_opt_in.code_send_failed', details({ codesRemaining: 1, retryAfterSeconds: null })))
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(alertText()).toBe(words['waCode.send_failed'])
    expect(get('wa-code-send')).toBeEnabled()
    expect(get('wa-other-phone-number')).toHaveTextContent('+91 98765 43210')
  })

  it.each([
    ['code_send_failed, 0 left', err(502, 'wa_opt_in.code_send_failed', details({ codesRemaining: 0 })), 'waCode.send_failed'],
    ['code_limit_reached', err(409, 'wa_opt_in.code_limit_reached', details({ codesRemaining: 0 })), 'waCode.no_more'],
    ['code_unavailable (step 1\'s 503 — ⛔ sent_uncertain)', err(503, 'wa_opt_in.code_unavailable', details({ codesRemaining: 2 })), 'waCode.send_failed'],
    ['code_not_offered', err(409, 'wa_opt_in.code_not_offered', details({ codesRemaining: 2 })), 'waCode.send_failed'],
    ['channel_unavailable', err(409, 'wa_opt_in.channel_unavailable', details({ codesRemaining: 2 })), 'waCode.send_failed'],
    ['a 401', err(401, 'auth.session_required'), 'waCode.send_failed'],
    ['a wa_opt_in code with details that do ⛔ parse', err(409, 'wa_opt_in.something_new', { bogus: true }), 'waCode.send_failed'],
  ])('%s ⇒ its line + the CLOSED route (the mint\'s number + phrase), ⛔ field', async (_n, e, key) => {
    mock.sendWaOptInCode.mockRejectedValue(e)
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(alertText()).toBe(words[key])
    expect(get('wa-other-phone-number')).toHaveTextContent('+91 98765 43210')
    expect(get('wa-other-phone-phrase')).toHaveTextContent('TWT-ABCDEFGH')
    expect(q('wa-code-input')).toBeNull()
    expect(q('wa-code-resend')).toBeNull()
  })

  it('a closed route KEEPS the field while a code is live (details.liveCode)', async () => {
    mock.sendWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.code_limit_reached', details({ codesRemaining: 0, liveCode: true })))
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(get('wa-code-input')).toBeInTheDocument()
    expect(get('wa-other-phone-details')).toBeInTheDocument()
  })

  it('code_resend_too_soon ⇒ the wait from the details; the field only with a live code', async () => {
    mock.sendWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.code_resend_too_soon', details({ codesRemaining: 1, liveCode: true, retryAfterSeconds: 40 })))
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(get('wa-code-input')).toBeInTheDocument()
    expect(get('wa-code-wait')).toHaveTextContent(words['waCode.resend_wait']!)
  })

  it('429 rate_limit.exceeded (⛔ details) ⇒ the form stays + the wait', async () => {
    mock.sendWaOptInCode.mockRejectedValue(err(429, 'rate_limit.exceeded'))
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(get('wa-code-send')).toBeDisabled()
    expect(get('wa-code-wait')).toBeInTheDocument()
    expect(q('wa-code-status')).toBeNull()
  })

  it('not_pending (the request lapsed) ⇒ no_longer_valid ALONE (⛔ closed route, ⛔ field, ⛔ button)', async () => {
    mock.sendWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.not_pending', { codesRemaining: 0, liveCode: false }))
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(alertText()).toBe(words['waCode.no_longer_valid'])
    for (const id of ['wa-other-phone-details', 'wa-code-input', 'wa-code-send', 'wa-code-resend']) expect(q(id), id).toBeNull()
  })

  it('⭐ a double tap on Send (both presses inside ONE act) makes ONE request', async () => {
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 })
    await toSent(OFFER)
    expand()
    const b = get('wa-code-send')
    await act(async () => {
      fireEvent.click(b)
      fireEvent.click(b)
    })
    await settle()
    expect(mock.sendWaOptInCode).toHaveBeenCalledTimes(1)
  })

  it('⭐ send → collapse → expand ⇒ still at the field, the countdown intact, ⛔ second request', async () => {
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 })
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    typeCode('12')
    expand() // collapse
    expect(q('wa-code-form')).toBeNull()
    expand()
    expect(get('wa-code-status')).toHaveTextContent(words['waCode.sent']!)
    expect(get('wa-code-input')).toHaveValue('12')
    expect(get('wa-code-resend')).toBeDisabled()
    expect(mock.sendWaOptInCode).toHaveBeenCalledTimes(1)
  })

  it('a send that finishes AFTER the step blurs is dropped (the hook\'s own version — ⛔ a collapse)', async () => {
    let resolve!: (v: unknown) => void
    mock.sendWaOptInCode.mockReturnValue(new Promise((r) => { resolve = r }))
    await toSent(OFFER)
    expand()
    await act(async () => { fireEvent.click(get('wa-code-send')) })
    act(() => {
      mock.focused = false
      for (const sync of mock.focusListeners) sync()
    })
    await act(async () => { resolve({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 }) })
    expect(q('wa-code-status')).toBeNull()
    expect(q('wa-code-input')).toBeNull()
  })

  it.each(['ios', 'android'])('[%s] waCode.sent is SPOKEN on each send told (a phase change — both platforms), a second too', async (os) => {
    mock.os = os
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: null })
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(mock.announce.mock.calls.filter(([t]) => t === words['waCode.sent'])).toHaveLength(1)
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 0, retryAfterSeconds: null })
    await press('wa-code-resend')
    expect(mock.announce.mock.calls.filter(([t]) => t === words['waCode.sent'])).toHaveLength(2)
  })
})

describe('AC9 — Verify', () => {
  async function atField(minted: Record<string, unknown> = { ...OFFER, liveCode: true, codesRemaining: 1, liveCodeDelivery: 'sent' }) {
    await toSent(minted)
    typeCode('123456')
  }

  it('⭐ 200 ⇒ waCode.done REPLACES the sent stage body, spoken from the step; Continue → payment; ⛔ the return announcement after it', async () => {
    mock.verifyWaOptInCode.mockResolvedValue({ state: 'ACTIVE' })
    await atField()
    await press('wa-code-confirm')
    expect(mock.verifyWaOptInCode).toHaveBeenCalledWith('123456')
    expect(get('wa-code-done')).toHaveTextContent(words['waCode.done']!)
    expect(q('wa-signup-sent')).toBeNull()
    expect(q('wa-code-form')).toBeNull()
    expect(mock.announce).toHaveBeenCalledWith(words['waCode.done'])
    act(() => {
      mock.appState = 'background'
      for (const h of [...mock.appStateHandlers]) h('background')
    })
    act(() => {
      mock.appState = 'active'
      for (const h of [...mock.appStateHandlers]) h('active')
    })
    expect(mock.announce.mock.calls.filter(([t]) => t === words['waSignup.sent_title'])).toHaveLength(0)
    fireEvent.click(get('wa-signup-continue'))
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
  })

  it('activation on the ASK stage (the link did ⛔ open) hides the box and link_failed', async () => {
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: null })
    mock.verifyWaOptInCode.mockResolvedValue({ state: 'ACTIVE' })
    await toSent(OFFER, { link: false })
    expand()
    await press('wa-code-send')
    typeCode('123456')
    await press('wa-code-confirm')
    expect(get('wa-code-done')).toBeInTheDocument()
    expect(q('wa-signup-box')).toBeNull()
    expect(alertText()).toBeNull()
  })

  it('code_wrong with a try left ⇒ wrong_retry, the field CLEARED', async () => {
    mock.verifyWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.code_wrong', details({ attemptsRemaining: 1, liveCode: true })))
    await atField()
    await press('wa-code-confirm')
    expect(alertText()).toBe(words['waCode.wrong_retry'])
    expect(get('wa-code-input')).toHaveValue('')
  })

  it('code_wrong, ⛔ try left, one code left ⇒ wrong_final + Send another code', async () => {
    mock.verifyWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.code_wrong', details({ attemptsRemaining: 0, codesRemaining: 1, liveCode: false })))
    await atField()
    await press('wa-code-confirm')
    expect(alertText()).toBe(words['waCode.wrong_final'])
    expect(get('wa-code-resend')).toBeEnabled()
    expect(q('wa-other-phone-details')).toBeNull()
  })

  it('code_wrong, ⛔ try left, ⛔ code left, ⛔ live code ⇒ wrong_final + the closed route', async () => {
    mock.verifyWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.code_wrong', details({ attemptsRemaining: 0, codesRemaining: 0, liveCode: false })))
    await atField({ ...OFFER, liveCode: true, codesRemaining: 0, liveCodeDelivery: 'sent' })
    await press('wa-code-confirm')
    expect(alertText()).toBe(words['waCode.wrong_final'])
    expect(get('wa-other-phone-details')).toBeInTheDocument()
    expect(q('wa-code-resend')).toBeNull()
  })

  it.each([[1, 'resend'], [0, 'closed']] as const)('code_no_longer_valid with %s left ⇒ no_longer_valid + %s', async (left, then) => {
    mock.verifyWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.code_no_longer_valid', { codesRemaining: left, liveCode: false }))
    await atField()
    await press('wa-code-confirm')
    expect(alertText()).toBe(words['waCode.no_longer_valid'])
    if (then === 'resend') expect(get('wa-code-resend')).toBeInTheDocument()
    else expect(get('wa-other-phone-details')).toBeInTheDocument()
  })

  it('not_pending ⇒ no_longer_valid ALONE', async () => {
    mock.verifyWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.not_pending', { codesRemaining: 0, liveCode: false }))
    await atField()
    await press('wa-code-confirm')
    expect(alertText()).toBe(words['waCode.no_longer_valid'])
    for (const id of ['wa-other-phone-details', 'wa-code-input', 'wa-code-resend']) expect(q(id), id).toBeNull()
  })

  it('already_active ⇒ done', async () => {
    mock.verifyWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.already_active', { codesRemaining: 0, liveCode: false }))
    await atField()
    await press('wa-code-confirm')
    expect(get('wa-code-done')).toBeInTheDocument()
  })

  it.each([
    ['ACTIVE', 'done'],
    ['PENDING', 'verify_failed'],
    ['EXPIRED_24H_WINDOW', 'no_longer_valid'],
  ])('a verify that fails otherwise (invalid_state) ⇒ ONE status re-read: %s ⇒ %s', async (state, then) => {
    mock.verifyWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.invalid_state'))
    await atField()
    mock.getWaOptInStatus.mockResolvedValue(status(state))
    mock.getWaOptInStatus.mockClear()
    await press('wa-code-confirm')
    expect(mock.getWaOptInStatus).toHaveBeenCalledTimes(1)
    if (then === 'done') expect(get('wa-code-done')).toBeInTheDocument()
    else if (then === 'verify_failed') {
      expect(alertText()).toBe(words['waCode.verify_failed'])
      expect(get('wa-code-input')).toBeInTheDocument()
    } else {
      expect(alertText()).toBe(words['waCode.no_longer_valid'])
      expect(q('wa-code-input')).toBeNull()
    }
  })

  it('a verify that HANGS ⇒ the re-read at 15 s (PENDING ⇒ verify_failed)', async () => {
    mock.verifyWaOptInCode.mockReturnValue(new Promise(() => {}))
    await atField()
    mock.getWaOptInStatus.mockResolvedValue(status('PENDING'))
    vi.useFakeTimers()
    await act(async () => { fireEvent.click(get('wa-code-confirm')) })
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(alertText()).toBe(words['waCode.verify_failed'])
  })
})

describe('code review 2026-10-21 — the six P2 patches (the app\'s five)', () => {
  const blur = () => act(() => { mock.focused = false; for (const sync of mock.focusListeners) sync() })
  const refocus = () => act(() => { mock.focused = true; for (const sync of mock.focusListeners) sync() })
  /** A Send whose answer never parses (⛔ ApiError) ⇒ told, count unknown, a 60 s wait — run out under fake timers (the interval
   *  must START under them), then resend is pressable. */
  async function unknownSendThenWaitOut() {
    mock.sendWaOptInCode.mockRejectedValueOnce(new TypeError('Network request failed'))
    vi.useFakeTimers()
    await act(async () => { fireEvent.click(get('wa-code-send')) })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(get('wa-code-resend')).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    vi.useRealTimers()
    expect(get('wa-code-resend')).toBeEnabled()
  }

  it('P2 blur → settle → refocus after a SEND ⇒ the dropped result is ⛔ shown, and Send is ENABLED again (⛔ busy forever)', async () => {
    let resolve!: (v: unknown) => void
    mock.sendWaOptInCode.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    await toSent(OFFER)
    expand()
    await act(async () => { fireEvent.click(get('wa-code-send')) })
    blur()
    await act(async () => { resolve({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 }) })
    await settle()
    refocus()
    expect(q('wa-code-status')).toBeNull()
    expect(get('wa-code-send')).toBeEnabled()
    mock.sendWaOptInCode.mockResolvedValueOnce({ delivery: 'sent', codesRemaining: 0, retryAfterSeconds: null })
    await press('wa-code-send')
    expect(get('wa-code-status')).toHaveTextContent(words['waCode.sent']!)
  })

  it('P2 blur → settle → refocus after a VERIFY ⇒ the dropped result is ⛔ shown, and Confirm is ENABLED again', async () => {
    let reject!: (e: unknown) => void
    mock.verifyWaOptInCode.mockReturnValueOnce(new Promise((_r, j) => { reject = j }))
    await toSent({ ...OFFER, liveCode: true, codesRemaining: 1, liveCodeDelivery: 'sent' })
    typeCode('123456')
    await act(async () => { fireEvent.click(get('wa-code-confirm')) })
    expect(get('wa-code-confirm')).toBeDisabled()
    blur()
    await act(async () => { reject(err(409, 'wa_opt_in.code_wrong', details({ attemptsRemaining: 1, liveCode: true }))) })
    await settle()
    refocus()
    expect(alertText()).toBeNull()
    expect(get('wa-code-confirm')).toBeEnabled()
  })

  it('P2 an UNKNOWN first send, then a RELEASED retry (2 left) ⇒ a send control stays (enabled), ⛔ dead end', async () => {
    await toSent(OFFER)
    expand()
    await unknownSendThenWaitOut()
    expect(get('wa-code-status')).toHaveTextContent(words['waCode.sent_uncertain']!)
    mock.sendWaOptInCode.mockRejectedValueOnce(err(502, 'wa_opt_in.code_send_failed', details({ codesRemaining: 2, liveCode: false, retryAfterSeconds: null })))
    await press('wa-code-resend')
    expect(alertText()).toBe(words['waCode.send_failed'])
    expect(get('wa-code-resend')).toBeEnabled()
    expect(q('wa-other-phone-details')).toBeNull()
  })

  it('P2 an UNKNOWN first send, then code_resend_too_soon with 2 left (a rate-limited release) ⇒ the send control shows, disabled for the wait', async () => {
    await toSent(OFFER)
    expand()
    await unknownSendThenWaitOut()
    mock.sendWaOptInCode.mockRejectedValueOnce(err(409, 'wa_opt_in.code_resend_too_soon', details({ codesRemaining: 2, liveCode: false, retryAfterSeconds: 30 })))
    await press('wa-code-resend')
    expect(get('wa-code-resend')).toBeDisabled()
    expect(get('wa-code-wait')).toHaveTextContent(words['waCode.resend_wait']!)
  })

  it.each([
    ['code_no_longer_valid (1 left)', err(409, 'wa_opt_in.code_no_longer_valid', details({ codesRemaining: 1, liveCode: false })), 'waCode.no_longer_valid'],
    ['a final code_wrong (1 left)', err(409, 'wa_opt_in.code_wrong', details({ attemptsRemaining: 0, codesRemaining: 1, liveCode: false })), 'waCode.wrong_final'],
  ])('P2 sending BLOCKED (codeAvailable false) + the live code dies by %s ⇒ the number + phrase STAY (⛔ dead end)', async (_n, e, key) => {
    await toSent({ ...CLOSED, liveCode: true, codesRemaining: 1, liveCodeDelivery: 'sent' })
    expect(get('wa-other-phone-number')).toBeInTheDocument()
    typeCode('123456')
    mock.verifyWaOptInCode.mockRejectedValueOnce(e)
    await press('wa-code-confirm')
    expect(alertText()).toBe(words[key])
    expect(get('wa-other-phone-number')).toHaveTextContent('+91 98765 43210')
    expect(get('wa-other-phone-phrase')).toHaveTextContent('TWT-ABCDEFGH')
    expect(q('wa-code-send')).toBeNull()
    expect(q('wa-code-resend')).toBeNull()
  })

  it('P2 a pasted "123 456" survives NATIVE maxLength handling (the mock truncates like React Native) ⇒ "123456", Confirm enabled', async () => {
    await toSent({ ...OFFER, liveCode: true, codesRemaining: 1, liveCodeDelivery: 'sent' })
    typeCode('123 456')
    expect(get('wa-code-input')).toHaveValue('123456')
    expect(get('wa-code-confirm')).toBeEnabled()
    typeCode(' 123-456 ')
    expect(get('wa-code-input')).toHaveValue('123456')
    typeCode('12345678')
    expect(get('wa-code-input')).toHaveValue('123456')
  })

  it.each([
    ['429 rate_limit.exceeded', err(429, 'rate_limit.exceeded')],
    ['code_resend_too_soon', err(409, 'wa_opt_in.code_resend_too_soon', details({ codesRemaining: 2, liveCode: false, retryAfterSeconds: 40 }))],
  ])('P2 entering the wait by %s is SPOKEN once (⛔ each countdown tick); a second entry is spoken again', async (_n, e) => {
    await toSent(OFFER)
    expand()
    const spoken = () => mock.announce.mock.calls.filter(([t]) => t === words['waCode.resend_wait']).length
    mock.sendWaOptInCode.mockRejectedValueOnce(e)
    vi.useFakeTimers()
    await act(async () => { fireEvent.click(get('wa-code-send')) })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(get('wa-code-wait')).toHaveTextContent(words['waCode.resend_wait']!)
    expect(spoken()).toBe(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
    expect(get('wa-code-wait')).toBeInTheDocument()
    expect(spoken()).toBe(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    vi.useRealTimers()
    expect(q('wa-code-wait')).toBeNull()
    mock.sendWaOptInCode.mockRejectedValueOnce(e)
    await press('wa-code-send')
    expect(spoken()).toBe(2)
  })

  it('P2 a send told WITH a wait (200, retryAfterSeconds) speaks waCode.sent ONLY — ⛔ resend_wait on top', async () => {
    mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 })
    await toSent(OFFER)
    expand()
    await press('wa-code-send')
    expect(get('wa-code-wait')).toBeInTheDocument()
    expect(mock.announce.mock.calls.filter(([t]) => t === words['waCode.resend_wait'])).toHaveLength(0)
  })
})

describe('AC13 — signup never waits on the code', () => {
  it.each([
    ['the form unopened', async () => undefined],
    ['the form open', async () => { expand() }],
    ['a send in flight', async () => { mock.sendWaOptInCode.mockReturnValue(new Promise(() => {})); expand(); await act(async () => { fireEvent.click(get('wa-code-send')) }) }],
    ['the closed route', async () => { mock.sendWaOptInCode.mockRejectedValue(err(409, 'wa_opt_in.code_limit_reached', details({ codesRemaining: 0 }))); expand(); await press('wa-code-send') }],
    ['a verify in flight', async () => {
      mock.sendWaOptInCode.mockResolvedValue({ delivery: 'sent', codesRemaining: 1, retryAfterSeconds: 60 })
      mock.verifyWaOptInCode.mockReturnValue(new Promise(() => {}))
      expand()
      await press('wa-code-send')
      typeCode('123456')
      await act(async () => { fireEvent.click(get('wa-code-confirm')) })
    }],
  ])('Continue goes to payment from %s', async (_n, arrange) => {
    await toSent(OFFER)
    await arrange()
    expect(get('wa-signup-continue')).toBeEnabled()
    fireEvent.click(get('wa-signup-continue'))
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
  })
})
