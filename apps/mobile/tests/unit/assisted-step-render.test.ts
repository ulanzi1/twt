// @vitest-environment jsdom
// Story 3.15 (AC6, AC7; DL7, DL8, N1) — the signup "Did someone help you register?" step (`app/(signup)/assisted.tsx`) EXECUTED with
// React DOM and mocked native primitives, inside a REAL `<LocaleProvider>` (⛔ a stubbed `t` — [[feedback_stub_must_call_not_transcribe]]).
// Harness: `wa-signup-step-render.test.ts`. Ways a leg could pass VACUOUSLY, closed here:
//   · `useRouter` returns ONE stable `mock.router`;
//   · the double tap fires both presses inside ONE `act()` (a mock `<button disabled>` would swallow a second separate click);
//   · the hung reads are HELD OPEN (a never-settling promise), and the leg asserts the step has ⛔ moved on just BEFORE the bound
//     ([[project_tanstack_instant_mock_hides_notready_flip]]);
//   · the `Button` mock RECORDS its full props per `testID`, so Yes and No are compared on every prop.
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
}))

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('../../lib/member-api', () => ({
  memberAuth: { assistedCodeStatus: mock.assistedCodeStatus, assistedCodeRecord: mock.assistedCodeRecord },
}))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  const useFocusEffect = (cb: () => void | (() => void)) => useEffect(() => cb(), [cb])
  return { useRouter: () => mock.router, useFocusEffect }
})
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: (props: { children?: ReactNode; testID?: string }) => createElement('div', { 'data-testid': props.testID }, props.children),
    AccessibilityInfo: { announceForAccessibility: mock.announce },
    Platform: { OS: 'ios' },
  }
})
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  type Props = { children?: ReactNode; testID?: string; accessibilityRole?: string; accessibilityLabel?: string }
  const container = (props: Props) =>
    createElement('div', {
      'data-testid': props.testID,
      role: props.accessibilityRole === 'alert' ? 'alert' : undefined,
      'aria-label': props.accessibilityLabel,
    }, props.children)
  return {
    YStack: container, Paragraph: container, Text: container, H2: container, View: container,
    Spinner: ({ testID }: { testID?: string }) => createElement('div', { 'data-testid': testID ?? 'spinner' }),
    Input: (props: { value?: string; onChangeText?: (v: string) => void; testID?: string; accessibilityLabel?: string; maxLength?: number; keyboardType?: string }) =>
      createElement('input', {
        value: props.value ?? '', 'data-testid': props.testID, 'aria-label': props.accessibilityLabel, maxLength: props.maxLength,
        inputMode: props.keyboardType === 'number-pad' ? 'numeric' : undefined,
        onChange: (e: { target: { value: string } }) => props.onChangeText?.(e.target.value),
      }),
    Button: (props: Record<string, unknown> & { children?: ReactNode; onPress?: () => void; disabled?: boolean; testID?: string;
      accessibilityRole?: string; accessibilityLabel?: string }) => {
      if (props.testID) mock.buttons[props.testID] = props
      return createElement('button', {
        onClick: props.onPress, disabled: props.disabled, role: props.accessibilityRole, 'aria-label': props.accessibilityLabel,
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

/** Render with ⛔ code recorded; wait for the question. */
async function ask() {
  mock.assistedCodeStatus.mockResolvedValue({ recorded: false })
  renderStep()
  await screen.findByTestId('assisted-yes')
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
