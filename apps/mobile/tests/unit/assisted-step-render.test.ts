// @vitest-environment jsdom
// Story 3.15 (AC6, AC7; DL7, DL8, N1) — the signup "Did someone help you register?" step (`app/(signup)/assisted.tsx`) EXECUTED with
// React DOM and mocked native primitives, inside a REAL `<LocaleProvider>` (⛔ a stubbed `t` — [[feedback_stub_must_call_not_transcribe]]).
// Harness: `wa-signup-step-render.test.ts`. Ways a leg could pass VACUOUSLY, closed here:
//   · `useRouter` returns ONE stable `mock.router`;
//   · the double tap fires both presses inside ONE `act()` (a mock `<button disabled>` would swallow a second separate click);
//   · the hung reads are HELD OPEN (a never-settling promise), and the leg asserts the step has ⛔ moved on just BEFORE the bound
//     ([[project_tanstack_instant_mock_hides_notready_flip]]);
//   · the `Button` mock RECORDS its full props per `testID`, so Yes and No are compared on every prop;
//   · the `useFocusEffect` mock lets a leg BLUR and RE-FOCUS the still-mounted step (`mock.blur()` / `mock.refocus()`), as a route
//     pushed over it would — an unmount would hide a continuation that outlives the focus (review R2);
//   · the `Input` mock maps `disabled` to `readOnly` but STILL forwards a change event, so the screen's own guard is tested; it
//     RECORDS every render's props per `testID`, so a leg can show `disabled` is never passed (Story 3.15a W2 (i));
//   · `Platform.OS` is switchable (`mock.os`, reset to `'ios'`), and the `Text` mock forwards `accessibilityLiveRegion` as
//     `data-live` — an Android live region was INVISIBLE to the old mock (Story 3.15a V1; the 6.36f `device run D1` mock).
// Native layout, the Hindi label's wrapping and a real screen reader still need a device ([[feedback_record_unattested_no_backfill]]).
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
  assistedCodeStatus: vi.fn(),
  assistedCodeRecord: vi.fn(),
  announce: vi.fn(),
  router: { replace: vi.fn() },
  buttons: {} as Record<string, Record<string, unknown>>,
  inputs: {} as Record<string, Record<string, unknown>[]>,
  os: 'ios' as 'ios' | 'android',
  blur:() => undefined as void,
  refocus: () => undefined as void,
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { assistedCodeStatus: mock.assistedCodeStatus, assistedCodeRecord: mock.assistedCodeRecord },
}))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  const useFocusEffect = (cb: () => void | (() => void)) =>
    useEffect(() => {
      let cleanup: void | (() => void) = cb()
      mock.blur = () => {
        if (cleanup) cleanup()
        cleanup = undefined
      }
      mock.refocus = () => {
        if (cleanup) cleanup()
        cleanup = cb()
      }
      return () => {
        if (cleanup) cleanup()
      }
    }, [cb])
  return { useRouter: () => mock.router, useFocusEffect }
})
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: (props: { children?: ReactNode; testID?: string }) => createElement('div', { 'data-testid': props.testID }, props.children),
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    Platform: { get OS() { return mock.os } },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type Props = { children?: ReactNode; testID?: string; accessibilityRole?: string; accessibilityLabel?: string;
    accessibilityLiveRegion?: string; color?: string; fontSize?: string }
  const container = (props: Props) =>
    createElement('div', {
      'data-testid': props.testID,
      role: props.accessibilityRole === 'alert' ? 'alert' : undefined,
      'aria-label': props.accessibilityLabel,
      // `data-live` ⇒ an Android live region (TalkBack re-reads one on a nearby re-render — 3.15 device pass V1, 6.36f D1).
      'data-live': props.accessibilityLiveRegion,
      'data-color': props.color,
      'data-font-size': props.fontSize,
    }, props.children)
  return {
    YStack: container, Paragraph: container, Text: container, H2: container, View: container,
    // Keeps the label AND the `accessible` flag: a mock that drops them cannot see a label on a non-accessible container (review P5).
    Spinner: ({ testID, accessible, accessibilityLabel }: { testID?: string; accessible?: boolean; accessibilityLabel?: string }) =>
      createElement('div', {
        'data-testid': testID ?? 'spinner',
        'aria-label': accessibilityLabel,
        'data-accessible': accessible === true ? 'true' : undefined,
      }),
    Input: (props: { value?: string; onChangeText?: (v: string) => void; testID?: string; accessibilityLabel?: string; maxLength?: number; keyboardType?: string; disabled?: boolean }) => {
      if (props.testID) (mock.inputs[props.testID] ??= []).push(props)
      return createElement('input', {
        value: props.value ?? '', 'data-testid': props.testID, 'aria-label': props.accessibilityLabel, maxLength: props.maxLength,
        readOnly: props.disabled === true,
        inputMode: props.keyboardType === 'number-pad' ? 'numeric' : undefined,
        onChange: (e: { target: { value: string } }) => props.onChangeText?.(e.target.value),
      })
    },
    Button: (props: Record<string, unknown> & { children?: ReactNode; onPress?: () => void; disabled?: boolean; testID?: string;
      accessibilityRole?: string; accessibilityLabel?: string; accessibilityState?: { disabled?: boolean } }) => {
      if (props.testID) mock.buttons[props.testID] = props
      return createElement('button', {
        onClick: props.onPress, disabled: props.disabled, role: props.accessibilityRole, 'aria-label': props.accessibilityLabel,
        // The screen-reader state: a Skip that is pressable but READ as disabled would be a defect the DOM `disabled` cannot show (P7).
        'aria-disabled': props.accessibilityState?.disabled === true ? 'true' : undefined,
        'data-testid': props.testID,
      }, props.children)
    },
  }
})

import AssistedStepScreen from '../../app/(signup)/assisted'

const NEXT = '/(signup)/kyc'
const words = getCatalog('en', 'common')!
const hi = getCatalog('hi', 'common')!
const KEYS = ['title', 'body', 'yes', 'no', 'code_label', 'continue', 'skip', 'not_found', 'format', 'saved'].map((k) => `signup.assisted.${k}`)

function renderStep() {
  return render(createElement(LocaleProvider, { initialLocale: 'en' }, createElement(AssistedStepScreen)))
}
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })
const never = () => new Promise<never>(() => undefined)
/** How many times `text` was spoken — the question and the code label are spoken too, so a bare call count would not do. */
const spoken = (text: string | undefined) => mock.announce.mock.calls.filter(([s]) => s === text).length
/** A POST held open until the leg settles it. */
const held = () => {
  const h: { resolve: (v: { recorded: true }) => void; reject: (e: unknown) => void } = { resolve: () => undefined, reject: () => undefined }
  mock.assistedCodeRecord.mockReturnValue(new Promise((res, rej) => { h.resolve = res; h.reject = rej }))
  return h
}

/**
 * Render with ⛔ code recorded; wait for the question — AND for its passive effects. `findByTestId` resolves as soon as the node is in
 * the DOM; the question is spoken from an effect (`useAnnounceOnChange`) that React may flush a macrotask later, so on a loaded
 * machine (`ci:local` runs ~37 tasks at once) an assertion made straight after it saw `announce` with 0 calls (seen once, in
 * `ci:local` at 3fefcae1; ⛔ reproduced locally). Settling here makes every caller's "spoken" / "not re-spoken" assertion deterministic.
 */
async function ask() {
  mock.assistedCodeStatus.mockResolvedValue({ recorded: false })
  renderStep()
  await screen.findByTestId('assisted-yes')
  await settle()
}
/** Ask, press Yes, type `code`. */
async function typed(code: string) {
  await ask()
  fireEvent.click(screen.getByTestId('assisted-yes'))
  fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: code } })
}

beforeEach(() => {
  for (const f of [mock.assistedCodeStatus, mock.assistedCodeRecord, mock.announce, mock.router.replace]) f.mockReset()
  mock.buttons = {}
  mock.inputs = {}
  mock.os = 'ios'
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('AC7 — the words', () => {
  it('every key exists in en AND hi, and the screen renders the en catalog (⛔ inline literal)', async () => {
    for (const k of KEYS) {
      expect(words[k], k).toBeTruthy()
      expect(hi[k], k).toBeTruthy()
    }
    // The payment box's two keys are gone from both (DL6).
    for (const k of ['payment.reference_code_label', 'payment.reference_code_help']) {
      expect(words[k]).toBeUndefined()
      expect(hi[k]).toBeUndefined()
    }
    await ask()
    expect(screen.getByText(words['signup.assisted.title']!)).toBeInTheDocument()
    expect(screen.getByText(words['signup.assisted.body']!)).toBeInTheDocument()
  })
})

describe('AC6 — the question', () => {
  it('renders Yes and No as two buttons of EQUAL weight (every prop but the label, the id and the press)', async () => {
    await ask()
    expect(screen.getByTestId('assisted-yes')).toHaveTextContent(words['signup.assisted.yes']!)
    expect(screen.getByTestId('assisted-no')).toHaveTextContent(words['signup.assisted.no']!)
    const strip = (p: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(p).filter(([k]) => !['children', 'testID', 'accessibilityLabel', 'onPress'].includes(k)))
    expect(strip(mock.buttons['assisted-yes']!)).toEqual(strip(mock.buttons['assisted-no']!))
    // The question is spoken when it appears.
    expect(mock.announce).toHaveBeenCalledWith(words['signup.assisted.title'])
  })

  it('No ⇒ on to KYC with ⛔ request (DL5)', async () => {
    await ask()
    fireEvent.click(screen.getByTestId('assisted-no'))
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.assistedCodeRecord).not.toHaveBeenCalled()
  })

  it('a code already recorded ⇒ straight on to KYC, the question ⛔ shown', async () => {
    mock.assistedCodeStatus.mockResolvedValue({ recorded: true })
    renderStep()
    await settle()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(screen.queryByTestId('assisted-yes')).toBeNull()
  })

  it('a failed status read ⇒ straight on to KYC (N1)', async () => {
    mock.assistedCodeStatus.mockRejectedValue(new ApiError(500, 'http.500', 'x'))
    renderStep()
    await settle()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
  })

  it('a HUNG status read holds the spinner, ⛔ moves on before 5 s, then goes on to KYC at the bound (N1)', async () => {
    vi.useFakeTimers()
    mock.assistedCodeStatus.mockReturnValue(never())
    renderStep()
    expect(screen.getByTestId('assisted-loading')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(4_900) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
  })
})

describe('AC6 — the code', () => {
  it('Yes shows the 6-digit box (number pad), Continue and Continue without a code', async () => {
    await ask()
    fireEvent.click(screen.getByTestId('assisted-yes'))
    const input = screen.getByTestId('assisted-code')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('maxlength', '6')
    expect(input).toHaveAttribute('aria-label', words['signup.assisted.code_label'])
    expect(screen.getByTestId('assisted-continue')).toHaveTextContent(words['signup.assisted.continue']!)
    expect(screen.getByTestId('assisted-skip')).toHaveTextContent(words['signup.assisted.skip']!)
  })

  it('6 digits + Continue ⇒ ONE request (a double tap makes one), the saved line, then on to KYC', async () => {
    let resolve!: (v: { recorded: true }) => void
    mock.assistedCodeRecord.mockReturnValue(new Promise((r) => { resolve = r }))
    await typed('482913')
    act(() => {
      fireEvent.click(screen.getByTestId('assisted-continue'))
      fireEvent.click(screen.getByTestId('assisted-continue'))
    })
    expect(mock.assistedCodeRecord).toHaveBeenCalledTimes(1)
    expect(mock.assistedCodeRecord).toHaveBeenCalledWith('482913')
    // Not on yet: the request is still open.
    expect(mock.router.replace).not.toHaveBeenCalled()
    await act(async () => { resolve({ recorded: true }) })
    expect(await screen.findByText(words['signup.assisted.saved']!)).toBeInTheDocument()
    expect(mock.router.replace).not.toHaveBeenCalled()
    await act(async () => { await new Promise((r) => setTimeout(r, 1_300)) })
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
  })

  it('not 6 digits ⇒ the "6 digits" line and ⛔ request; a server 400 shows the same line', async () => {
    await typed('48291')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    expect(screen.getByRole('alert')).toHaveTextContent(words['signup.assisted.format']!)
    expect(mock.assistedCodeRecord).not.toHaveBeenCalled()

    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '482913' } })
    expect(screen.queryByRole('alert')).toBeNull()
    mock.assistedCodeRecord.mockRejectedValue(new ApiError(400, 'request.validation', 'x'))
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(screen.getByRole('alert')).toHaveTextContent(words['signup.assisted.format']!)
    expect(mock.router.replace).not.toHaveBeenCalled()
  })

  it('422 ⇒ the not-found line under the box; the member may retry, or continue without a code', async () => {
    mock.assistedCodeRecord.mockRejectedValueOnce(new ApiError(422, 'attribution.code_not_found', 'x'))
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(screen.getByRole('alert')).toHaveTextContent(words['signup.assisted.not_found']!)
    expect(mock.router.replace).not.toHaveBeenCalled()
    // Retry with another code — a second request is made.
    mock.assistedCodeRecord.mockRejectedValueOnce(new ApiError(422, 'attribution.code_not_found', 'x'))
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '135790' } })
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(mock.assistedCodeRecord).toHaveBeenCalledTimes(2)
    // …or continue without one.
    fireEvent.click(screen.getByTestId('assisted-skip'))
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
  })

  it.each([
    ['409', new ApiError(409, 'attribution.already_recorded', 'x')],
    ['409 (past signup)', new ApiError(409, 'attribution.not_signing_up', 'x')],
    ['429', new ApiError(429, 'http.429', 'x')],
    ['500', new ApiError(500, 'http.500', 'x')],
    ['no network', new TypeError('Network request failed')],
  ])('%s ⇒ on to KYC with ⛔ message (N1)', async (_label, err) => {
    mock.assistedCodeRecord.mockRejectedValue(err)
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(words['signup.assisted.saved']!)).toBeNull()
  })

  it('a HUNG request ⇒ on to KYC after the call bound (15 s), ⛔ before', async () => {
    mock.assistedCodeStatus.mockResolvedValue({ recorded: false })
    renderStep()
    await screen.findByTestId('assisted-yes')
    vi.useFakeTimers()
    mock.assistedCodeRecord.mockReturnValue(never())
    fireEvent.click(screen.getByTestId('assisted-yes'))
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '482913' } })
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await act(async () => { await vi.advanceTimersByTimeAsync(14_900) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Review R1 — the code is frozen while its (permanent) capture is pending', () => {
  it('during the POST a change is IGNORED (the box stays editable — Story 3.15a W2 (i)); the saved line follows the code that was SENT', async () => {
    let resolve!: (v: { recorded: true }) => void
    mock.assistedCodeRecord.mockReturnValue(new Promise((r) => { resolve = r }))
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    const input = screen.getByTestId('assisted-code')
    // 3.15a DL3: ⛔ locked (locking it dropped focus and the keyboard on Android) — R1 is the ignored change below.
    expect(input).not.toHaveAttribute('readonly')
    fireEvent.change(input, { target: { value: '135790' } })
    expect(screen.getByTestId('assisted-code')).toHaveValue('482913')
    await act(async () => { resolve({ recorded: true }) })
    expect(screen.getByText(words['signup.assisted.saved']!)).toBeInTheDocument()
    expect(mock.assistedCodeRecord).toHaveBeenCalledTimes(1)
    expect(mock.assistedCodeRecord).toHaveBeenCalledWith('482913')
  })

  it('a 422 lands on the code that was SENT, and the box is editable (CONTROL — the retry with a new code is sent)', async () => {
    let reject!: (e: unknown) => void
    mock.assistedCodeRecord.mockReturnValueOnce(new Promise((_r, j) => { reject = j }))
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '135790' } })
    await act(async () => { reject(new ApiError(422, 'attribution.code_not_found', 'x')) })
    expect(screen.getByRole('alert')).toHaveTextContent(words['signup.assisted.not_found']!)
    const input = screen.getByTestId('assisted-code')
    expect(input).toHaveValue('482913')
    expect(input).not.toHaveAttribute('readonly')
    mock.assistedCodeRecord.mockResolvedValueOnce({ recorded: true })
    fireEvent.change(input, { target: { value: '135790' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(mock.assistedCodeRecord).toHaveBeenLastCalledWith('135790')
  })
})

describe('Story 3.15a V1 — the error lines are spoken ONCE, ⛔ a live region', () => {
  // The 3.15 device pass (V1): TalkBack re-read the not-found line on the backspace that removed it — a live region is re-read on a
  // nearby re-render, whether the line stays or is being removed (6.36f device run D1). The lines are plain text now, spoken by ONE
  // `announceForAccessibility` per time an error is SET (DL2), on BOTH platforms.
  const NOT_FOUND = words['signup.assisted.not_found']
  const FORMAT = words['signup.assisted.format']

  it.each(['android', 'ios'] as const)('%s: a 422 ⇒ the not-found line, ⛔ a live region, spoken ONCE; a backspace and a new code ⇒ ⛔ again; a second 422 ⇒ spoken again', async (os) => {
    mock.os = os
    mock.assistedCodeRecord.mockRejectedValueOnce(new ApiError(422, 'attribution.code_not_found', 'x'))
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    const line = screen.getByRole('alert')
    expect(line).toHaveTextContent(NOT_FOUND!)
    expect(line).toHaveAttribute('data-testid', 'assisted-error-not-found')
    expect(line).not.toHaveAttribute('data-live')
    // The look `AnnouncedText kind="error"` gave it (AC 1).
    expect(line).toHaveAttribute('data-color', '$red10')
    expect(line).toHaveAttribute('data-font-size', '$2')
    expect(spoken(NOT_FOUND)).toBe(1)
    // The edit that clears the line (the device pass's re-read) — and typing a whole new code, ⛔ press.
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '48291' } })
    await settle()
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '135790' } })
    await settle()
    expect(spoken(NOT_FOUND)).toBe(1)
    // A retry answered by a 422 again SETS the error again ⇒ spoken again (DL2 (a)).
    mock.assistedCodeRecord.mockRejectedValueOnce(new ApiError(422, 'attribution.code_not_found', 'x'))
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(screen.getByRole('alert')).toHaveTextContent(NOT_FOUND!)
    expect(spoken(NOT_FOUND)).toBe(2)
  })

  it.each(['android', 'ios'] as const)('%s: 5 digits + Continue ⇒ the format line spoken ONCE; the same press again ⇒ spoken again (a repeat); a backspace ⇒ ⛔ again', async (os) => {
    mock.os = os
    await typed('48291')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    const line = screen.getByRole('alert')
    expect(line).toHaveTextContent(FORMAT!)
    expect(line).toHaveAttribute('data-testid', 'assisted-error-format')
    expect(line).not.toHaveAttribute('data-live')
    expect(spoken(FORMAT)).toBe(1)
    // The same 5 digits, pressed again with ⛔ edit between: the error is SET again ('format' → 'format') ⇒ spoken again.
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(spoken(FORMAT)).toBe(2)
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '4829' } })
    await settle()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(spoken(FORMAT)).toBe(2)
    expect(mock.assistedCodeRecord).not.toHaveBeenCalled()
  })

  it.each(['android', 'ios'] as const)('%s: a server 400 ⇒ the format line spoken ONCE, ⛔ a live region', async (os) => {
    mock.os = os
    mock.assistedCodeRecord.mockRejectedValueOnce(new ApiError(400, 'request.validation', 'x'))
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    const line = screen.getByRole('alert')
    expect(line).toHaveTextContent(FORMAT!)
    expect(line).not.toHaveAttribute('data-live')
    expect(spoken(FORMAT)).toBe(1)
  })
})

describe('Story 3.15a W2 (i) — the code box is never locked; R1 still holds', () => {
  // ⚠ jsdom cannot show the native focus drop ([[project_jsdom_disabled_button_keeps_focus]]): on Android `disabled` → tamagui
  // `editable: false` → RN `view.isEnabled = false`, which drops focus and closes the keyboard. This leg pins the CAUSE (the prop is
  // never passed); the device pass (AC 6 (c)) proves the effect.
  it('through a HELD POST the box never gets `disabled` / `readOnly` / `editable={false}`; a change is ignored; Continue is disabled (CONTROL)', async () => {
    const h = held()
    await typed('482913')
    const log = () => mock.inputs['assisted-code'] ?? []
    const atPress = log().length
    expect(atPress).toBeGreaterThan(0)
    fireEvent.click(screen.getByTestId('assisted-continue'))
    // CONTROL: the POST is open (Continue disabled, with its spinner) and the box HAS re-rendered while it is.
    expect(screen.getByTestId('assisted-continue')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByTestId('assisted-continue')).toBeDisabled()
    expect(log().length).toBeGreaterThan(atPress)
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '48291' } })
    expect(screen.getByTestId('assisted-code')).toHaveValue('482913')
    await act(async () => { h.reject(new ApiError(422, 'attribution.code_not_found', 'x')) })
    expect(screen.getByRole('alert')).toHaveTextContent(words['signup.assisted.not_found']!)
    expect(screen.getByTestId('assisted-continue')).not.toBeDisabled()
    const locked = log().filter((p) => p.disabled === true || p.readOnly === true || p.editable === false)
    expect(locked).toEqual([])
    expect(mock.assistedCodeRecord).toHaveBeenCalledWith('482913')
  })
})

describe('Review R2 — ⛔ navigation from a step that has lost focus', () => {
  it('a status read that answers "recorded" AFTER blur does ⛔ move; on re-focus the read is made again and moves on', async () => {
    let resolve!: (v: { recorded: boolean }) => void
    mock.assistedCodeStatus.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderStep()
    act(() => { mock.blur() })
    await act(async () => { resolve({ recorded: true }) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    mock.assistedCodeStatus.mockResolvedValueOnce({ recorded: true })
    act(() => { mock.refocus() })
    await settle()
    expect(mock.assistedCodeStatus).toHaveBeenCalledTimes(2)
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
  })

  it('a status read that answers "recorded" in the very instant of the blur (before the effect cleanup flushes) does ⛔ move a blurred step', async () => {
    // `focusedRef` is set synchronously in the focus callback and its cleanup; the effect that cancels the read cleans up only
    // after a render, so a continuation can run in between (review P3, round 2). Blur and the answer share ONE act().
    let resolve!: (v: { recorded: boolean }) => void
    mock.assistedCodeStatus.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderStep()
    await act(async () => { mock.blur(); resolve({ recorded: true }) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    mock.assistedCodeStatus.mockResolvedValueOnce({ recorded: true })
    act(() => { mock.refocus() })
    await settle()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
  })

  it('a status read that answers "not recorded" in the very instant of the blur does ⛔ show (or speak) the question; at re-focus it reads again and asks', async () => {
    let resolve!: (v: { recorded: boolean }) => void
    mock.assistedCodeStatus.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderStep()
    mock.announce.mockClear()
    await act(async () => { mock.blur(); resolve({ recorded: false }) })
    expect(screen.queryByTestId('assisted-yes')).toBeNull()
    expect(mock.announce).not.toHaveBeenCalledWith(words['signup.assisted.title'])
    mock.assistedCodeStatus.mockResolvedValueOnce({ recorded: false })
    act(() => { mock.refocus() })
    expect(await screen.findByTestId('assisted-yes')).toBeInTheDocument()
    await settle() // the question is spoken from an effect — let it flush (see `ask()`)
    expect(mock.announce).toHaveBeenCalledWith(words['signup.assisted.title'])
    expect(mock.assistedCodeStatus).toHaveBeenCalledTimes(2)
  })

  it('a status read that FAILS in the very instant of the blur does ⛔ move a blurred step; at re-focus it reads again and moves on, once', async () => {
    // The rejected branch calls `goNext` straight from the continuation: only `goNext`'s own focus guard stops it in this window.
    let reject!: (e: unknown) => void
    mock.assistedCodeStatus.mockReturnValueOnce(new Promise((_r, j) => { reject = j }))
    renderStep()
    await act(async () => { mock.blur(); reject(new ApiError(500, 'http.500', 'x')) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    mock.assistedCodeStatus.mockRejectedValueOnce(new ApiError(500, 'http.500', 'x'))
    act(() => { mock.refocus() })
    await settle()
    expect(mock.assistedCodeStatus).toHaveBeenCalledTimes(2)
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
  })

  it('a status read that FAILS or HANGS past its bound after blur does ⛔ move', async () => {
    vi.useFakeTimers()
    let reject!: (e: unknown) => void
    mock.assistedCodeStatus.mockReturnValueOnce(new Promise((_r, j) => { reject = j }))
    renderStep()
    act(() => { mock.blur() })
    await act(async () => { reject(new ApiError(500, 'http.500', 'x')) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    cleanup()
    mock.assistedCodeStatus.mockReturnValueOnce(never())
    renderStep()
    act(() => { mock.blur() })
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000) })
    expect(mock.router.replace).not.toHaveBeenCalled()
  })

  it('the "saved" timer does ⛔ fire after blur; on re-focus the saved line shows again and THEN moves on, once', async () => {
    mock.assistedCodeRecord.mockResolvedValue({ recorded: true })
    await typed('482913')
    vi.useFakeTimers()
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText(words['signup.assisted.saved']!)).toBeInTheDocument()
    act(() => { mock.blur() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1_300) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    act(() => { mock.refocus() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1_300) })
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
  })
})

describe('Review P3 — a POST that settles while the step is BLURRED keeps its result; only the move waits for focus', () => {
  it('201 after blur: the result is KEPT but ⛔ spoken or moved on while blurred; at re-focus the saved line shows, is spoken, and THEN the step moves on, once', async () => {
    const h = held()
    await typed('482913')
    vi.useFakeTimers()
    fireEvent.click(screen.getByTestId('assisted-continue'))
    act(() => { mock.blur() })
    mock.announce.mockClear()
    await act(async () => { h.resolve({ recorded: true }) })
    // KEPT: Continue is enabled again and the stage is `saved` — but the line is not mounted, so nothing is spoken over another screen.
    expect(screen.queryByText(words['signup.assisted.saved']!)).toBeNull()
    expect(mock.announce).not.toHaveBeenCalledWith(words['signup.assisted.saved'])
    await act(async () => { await vi.advanceTimersByTimeAsync(1_300) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    act(() => { mock.refocus() })
    expect(screen.getByText(words['signup.assisted.saved']!)).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith(words['signup.assisted.saved'])
    await act(async () => { await vi.advanceTimersByTimeAsync(1_300) })
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
    expect(mock.assistedCodeRecord).toHaveBeenCalledTimes(1)
  })

  // Both platforms (Story 3.15a): the line is no longer a live region, so the re-focus announce is the ONLY way TalkBack hears it.
  it.each([
    ['ios', '422', new ApiError(422, 'attribution.code_not_found', 'x'), 'signup.assisted.not_found'],
    ['android', '422', new ApiError(422, 'attribution.code_not_found', 'x'), 'signup.assisted.not_found'],
    ['ios', '400', new ApiError(400, 'request.validation', 'x'), 'signup.assisted.format'],
    ['android', '400', new ApiError(400, 'request.validation', 'x'), 'signup.assisted.format'],
  ] as const)('%s — %s after blur: the error line is kept and spoken at re-focus (⛔ while blurred), the box is editable, ⛔ move', async (os, _label, err, key) => {
    mock.os = os
    const h = held()
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    act(() => { mock.blur() })
    mock.announce.mockClear()
    await act(async () => { h.reject(err) })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(mock.announce).not.toHaveBeenCalledWith(words[key])
    expect(screen.getByTestId('assisted-code')).not.toHaveAttribute('readonly')
    act(() => { mock.refocus() })
    expect(screen.getByRole('alert')).toHaveTextContent(words[key]!)
    expect(mock.announce).toHaveBeenCalledWith(words[key])
    expect(mock.router.replace).not.toHaveBeenCalled()
  })

  it.each([
    ['409', new ApiError(409, 'attribution.already_recorded', 'x')],
    ['429', new ApiError(429, 'http.429', 'x')],
    ['500', new ApiError(500, 'http.500', 'x')],
    ['no network', new TypeError('Network request failed')],
  ])('%s after blur: ⛔ move while blurred; on re-focus the step moves on, once, with ⛔ message', async (_label, err) => {
    const h = held()
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    act(() => { mock.blur() })
    await act(async () => { h.reject(err) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    // Continue is enabled again while the step waits for focus — a second press must ⛔ make a second request (`exitingRef`).
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(mock.assistedCodeRecord).toHaveBeenCalledTimes(1)
    act(() => { mock.refocus() })
    await settle()
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(words['signup.assisted.saved']!)).toBeNull()
  })

  it('a HUNG request that times out (15 s) while the step is blurred ⛔ moves it; on re-focus the step moves on, once', async () => {
    mock.assistedCodeRecord.mockReturnValue(never())
    await typed('482913')
    vi.useFakeTimers()
    fireEvent.click(screen.getByTestId('assisted-continue'))
    act(() => { mock.blur() })
    await act(async () => { await vi.advanceTimersByTimeAsync(15_100) })
    expect(mock.router.replace).not.toHaveBeenCalled()
    act(() => { mock.refocus() })
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
  })
})

describe('Review P7 — "Continue without a code" is never held back by a pending request (N1)', () => {
  it('during the POST Skip is ENABLED (CONTROL: Continue is disabled) and moves on; the POST\'s late answer changes nothing', async () => {
    let resolve!: (v: { recorded: true }) => void
    mock.assistedCodeRecord.mockReturnValue(new Promise((r) => { resolve = r }))
    await typed('482913')
    fireEvent.click(screen.getByTestId('assisted-continue'))
    expect(screen.getByTestId('assisted-continue')).toBeDisabled()
    expect(screen.getByTestId('assisted-continue')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByTestId('assisted-skip')).not.toBeDisabled()
    // ⛔ READ as disabled by a screen reader either (the Button mock now carries `accessibilityState`).
    expect(screen.getByTestId('assisted-skip')).not.toHaveAttribute('aria-disabled')
    fireEvent.click(screen.getByTestId('assisted-skip'))
    expect(mock.router.replace).toHaveBeenCalledWith(NEXT)
    await act(async () => { resolve({ recorded: true }) })
    expect(screen.queryByText(words['signup.assisted.saved']!)).toBeNull()
    expect(mock.router.replace).toHaveBeenCalledTimes(1)
  })
})

describe('Review P5 — checklist family 13: a label needs an accessibility element; a line a sighted member sees is SPOKEN', () => {
  it('(a) the loading spinner carries its label AND is an accessibility element', () => {
    mock.assistedCodeStatus.mockReturnValue(never())
    renderStep()
    const spinner = screen.getByTestId('assisted-loading')
    expect(spinner).toHaveAttribute('aria-label', words['loading']!)
    expect(spinner).toHaveAttribute('data-accessible', 'true')
  })

  it('(d) the format, not-found and saved lines are each ANNOUNCED — a bare alert role would not be', async () => {
    await typed('48291')
    mock.announce.mockClear()
    fireEvent.click(screen.getByTestId('assisted-continue'))
    expect(mock.announce).toHaveBeenCalledWith(words['signup.assisted.format'])

    mock.assistedCodeRecord.mockRejectedValueOnce(new ApiError(422, 'attribution.code_not_found', 'x'))
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '482913' } })
    mock.announce.mockClear()
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(mock.announce).toHaveBeenCalledWith(words['signup.assisted.not_found'])

    mock.assistedCodeRecord.mockResolvedValueOnce({ recorded: true })
    fireEvent.change(screen.getByTestId('assisted-code'), { target: { value: '135790' } })
    mock.announce.mockClear()
    fireEvent.click(screen.getByTestId('assisted-continue'))
    await settle()
    expect(mock.announce).toHaveBeenCalledWith(words['signup.assisted.saved'])
  })
})

describe('Review R3 — the code-entry phase is spoken (checklist family 13 (d))', () => {
  it('Yes announces the code box by its label; the question is ⛔ re-announced', async () => {
    await ask()
    mock.announce.mockClear()
    fireEvent.click(screen.getByTestId('assisted-yes'))
    expect(screen.getByTestId('assisted-code')).toBeInTheDocument()
    expect(mock.announce).toHaveBeenCalledWith(words['signup.assisted.code_label'])
    expect(mock.announce).not.toHaveBeenCalledWith(words['signup.assisted.title'])
  })
})

describe('AC7 — PREV and NEXT (DL7: tc → assisted → kyc)', () => {
  // A SOURCE check: under expo-router 55 the generated typed routes accept any two-segment absolute path, so `tsc` with
  // `.expo/types` would ⛔ catch a wrong `'/(signup)/…'` literal ([[project_mobile_typed_routes_worktree]]).
  const read = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8')
  it("the terms' accept goes to the assisted step, the step goes on to KYC, and both route files exist", () => {
    expect(read('app/(signup)/tc.tsx')).toContain("router.replace('/(signup)/assisted')")
    expect(read('app/(signup)/tc.tsx')).not.toContain("router.replace('/(signup)/kyc')")
    expect(read('app/(signup)/assisted.tsx')).toContain("router.replace('/(signup)/kyc')")
    expect(existsSync(join(__dirname, '..', '..', 'app', '(signup)', 'assisted.tsx'))).toBe(true)
    expect(existsSync(join(__dirname, '..', '..', 'app', '(signup)', 'kyc.tsx'))).toBe(true)
  })

  it('the payment step has ⛔ code box and sends ⛔ referenceCode (DL6)', () => {
    const payment = read('app/(signup)/payment.tsx')
    expect(payment).not.toMatch(/referenceCode|reference_code/)
  })
})
