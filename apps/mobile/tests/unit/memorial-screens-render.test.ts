// @vitest-environment jsdom
//
// Story 11b.4 — the memorial screens on the jsdom harness (the `language-screen-render.test.ts` precedent: RN mocked,
// `lib/mmkv` mocked, RTL `cleanup`; + mocks for `expo-file-system` and `expo-image-picker`, which ⛔ mobile test mocked
// before). AC2 (Save and come back, Not now), AC3 (save on every change), AC4 (M3′ at the top, the permission immediately
// above Send, in the app's language), AC7a (the handover leg: once, retried once, then the helpline), AC10 (each outcome,
// the helpline everywhere, Write again iff canSend, empty vs Start from what I sent), AC12 (real `t()` in hi and en),
// AC13 (labels, live regions, 44pt targets), Trap 7 (the input props).

import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { t } from '@twt/i18n'
import { LocaleProvider } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemorialMemberView } from '@twt/contracts'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  files: new Set<string>(),
  session: { memberId: 'm-1' } as { memberId: string } | null,
  push: vi.fn(),
  replace: vi.fn(),
  view: null as unknown,
  send: vi.fn(),
  withdraw: vi.fn(),
  fetchView: vi.fn(),
  invalidate: vi.fn(),
  otp: { masked: null as string | null, error: null as string | null, busy: false },
  otpSend: vi.fn(),
  otpVerify: vi.fn(),
  inputs: [] as Record<string, unknown>[],
  os: 'ios' as 'ios' | 'android',
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
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: mock.session }) }))
vi.mock('expo-router', () => ({ useRouter: () => ({ push: mock.push, replace: mock.replace }) }))
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(() => Promise.resolve({ granted: true })),
  launchImageLibraryAsync: vi.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}))
vi.mock('expo-file-system', () => {
  class File {
    public readonly uri: string
    public constructor(dirOrUri: string | { uri: string }, name?: string) {
      const base = typeof dirOrUri === 'string' ? dirOrUri : dirOrUri.uri
      this.uri = name === undefined ? base : `${base}/${name}`
    }
    public get exists(): boolean {
      return mock.files.has(this.uri)
    }
    public copy(dest: File): void {
      mock.files.add(dest.uri)
    }
    public delete(): void {
      mock.files.delete(this.uri)
    }
  }
  return { File, Paths: { document: { uri: 'file:///docs' } } }
})
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mock.invalidate, fetchQuery: mock.fetchView }),
}))
vi.mock('../../components/memorial-authorship/useMemorialQueries', () => ({
  MEMORIAL_VIEW_QUERY_KEY: ['member', 'memorial', 'view'],
  useMemorialViewQuery: () => ({ data: { memorial: mock.view } }),
  useMemorialEntryQuery: () => ({ data: { memorialEntry: true } }),
  invalidateMemorialQueries: (...a: unknown[]) => mock.invalidate(...a),
}))
vi.mock('../../lib/memorial-api', () => ({ memorialApi: { send: mock.send, withdraw: mock.withdraw, view: mock.fetchView } }))
vi.mock('../../lib/use-handover-otp', () => ({
  useHandoverOtp: () => ({
    masked: mock.otp.masked,
    noNominee: mock.otp.masked === '',
    error: mock.otp.error,
    busy: mock.otp.busy,
    send: mock.otpSend,
    verify: mock.otpVerify,
  }),
}))
vi.mock('../../components/common/CallHelplineCTA', async () => {
  const { createElement } = await import('react')
  return { CallHelplineCTA: () => createElement('div', { 'data-testid': 'helpline-cta' }, 'helpline') }
})
vi.mock('react-native', async () => {
  const { createElement } = await import('react')
  return {
    ScrollView: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
    Image: (p: { accessibilityLabel?: string }) => createElement('img', { 'aria-label': p.accessibilityLabel }),
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
    accessibilityLabel?: string
    accessibilityLiveRegion?: string
    style?: { minHeight?: number }
  }
  const attrs = (p: P) => ({
    'data-testid': p.testID,
    role: p.accessibilityRole,
    'aria-label': p.accessibilityLabel,
    'aria-live': p.accessibilityLiveRegion,
  })
  const container = (p: P) => createElement('div', attrs(p), p.children)
  return {
    YStack: container,
    XStack: container,
    Paragraph: container,
    Text: (p: P) => createElement('span', attrs(p), p.children),
    H2: container,
    H3: container,
    Spinner: () => createElement('div', null),
    Input: (p: Record<string, unknown> & { value?: string; onChangeText?: (v: string) => void; accessibilityLabel?: string; testID?: string }) => {
      mock.inputs.push(p)
      return createElement('input', {
        value: p.value,
        'data-testid': p.testID,
        'aria-label': p.accessibilityLabel,
        onChange: (e: { target: { value: string } }) => p.onChangeText?.(e.target.value),
      })
    },
    Button: (p: P) =>
      createElement(
        'button',
        { 'data-testid': p.testID, 'aria-label': p.accessibilityLabel, 'data-minheight': p.style?.minHeight, onClick: p.onPress, disabled: p.disabled },
        p.children,
      ),
  }
})

import MemorialIntroScreen from '../../app/(memorial)/index'
import MemorialOutcomeScreen from '../../app/(memorial)/outcome'
import MemorialPhotoScreen from '../../app/(memorial)/photo'
import MemorialPreviewScreen from '../../app/(memorial)/preview'
import MemorialWriteScreen from '../../app/(memorial)/write'
import { ApiError } from '@twt/api-client'
import { loadMemorialDraft, memorialDraftKey, saveMemorialDraft } from '../../lib/memorial-draft'

const tr = (key: string, locale: 'hi' | 'en', params?: Record<string, string>) => t(key, params, { locale, namespace: 'memorial' })

function view(over: Partial<MemorialMemberView> = {}): MemorialMemberView {
  return {
    driveId: 'pool-1',
    deceasedName: 'शांति देवी',
    memorialState: 'none',
    submissionId: null,
    body: null,
    altText: null,
    unavailable: null,
    hasPhoto: false,
    photoUrl: null,
    omissions: [],
    photoLeftOut: null,
    reasonCode: null,
    earlierApprovalWithdrawn: null,
    canSend: true,
    canWithdraw: false,
    authorisation: { copyVersion: 'v1', text: { hi: 'अनुमति का पाठ', en: 'The permission text' } },
    ...over,
  }
}

function renderIn(component: () => ReactNode, locale: 'hi' | 'en' = 'hi') {
  return render(createElement(LocaleProvider, { initialLocale: locale }, createElement(component)))
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 10)))

beforeEach(() => {
  mock.store.clear()
  mock.files.clear()
  mock.inputs.length = 0
  mock.session = { memberId: 'm-1' }
  mock.view = view()
  mock.otp = { masked: null, error: null, busy: false }
  mock.os = 'ios'
  for (const f of [mock.push, mock.replace, mock.send, mock.withdraw, mock.fetchView, mock.invalidate, mock.otpSend, mock.otpVerify]) f.mockReset()
})
afterEach(() => {
  cleanup()
})

describe('AC2 — every screen carries "Save and come back"; the intro offers "Not now" as an equal choice', () => {
  it.each([
    ['intro', MemorialIntroScreen],
    ['write', MemorialWriteScreen],
    ['photo', MemorialPhotoScreen],
    ['preview', MemorialPreviewScreen],
    ['outcome', MemorialOutcomeScreen],
  ] as const)('%s', (_n, Screen) => {
    if (_n === 'outcome') mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    renderIn(Screen)
    expect(screen.getByTestId('memorial-header')).toHaveTextContent(tr('header.save_and_come_back', 'hi'))
  })

  it('the intro asks with the name; Not now leaves; both choices are full 44pt buttons', () => {
    renderIn(MemorialIntroScreen)
    expect(document.body.textContent).toContain(tr('intro.prompt', 'hi', { name: 'शांति देवी' }))
    const yes = screen.getByText(tr('intro.start', 'hi'))
    const no = screen.getByText(tr('intro.not_now', 'hi'))
    expect(yes).toHaveAttribute('data-minheight', '44')
    expect(no).toHaveAttribute('data-minheight', '44')
    fireEvent.click(no)
    expect(mock.replace).toHaveBeenCalledWith('/(tabs)')
  })

  it('the no-name intro is a SEPARATE key (⛔ "{name}" with an empty string)', () => {
    mock.view = view({ deceasedName: null })
    renderIn(MemorialIntroScreen, 'en')
    expect(document.body.textContent).toContain(tr('intro.prompt_no_name', 'en'))
  })

  it('⛔ drive ⇒ the screen renders nothing', () => {
    mock.view = null
    const { container } = renderIn(MemorialIntroScreen)
    expect(container.textContent).toBe('')
  })
})

describe('Trap 7 / AC3 / AC10 — the write box', () => {
  it('autoCorrect={false} + an EXPLICIT spellCheck + accessibilityLanguage on iOS, ⛔ maxLength, a label', () => {
    renderIn(MemorialWriteScreen)
    const body = mock.inputs.find((p) => p.testID === 'memorial-body')!
    expect(body.autoCorrect).toBe(false)
    expect(body.spellCheck).toBe(true)
    expect(body.accessibilityLanguage).toBe('hi-IN')
    expect(body).not.toHaveProperty('maxLength')
    expect(body.accessibilityLabel).toBe(tr('write.label', 'hi'))
  })

  it('Android: ⛔ accessibilityLanguage (React Native has no equivalent — recorded N/A)', () => {
    mock.os = 'android'
    renderIn(MemorialWriteScreen)
    expect(mock.inputs.find((p) => p.testID === 'memorial-body')).not.toHaveProperty('accessibilityLanguage')
  })

  it('saves to MMKV on EVERY change', () => {
    renderIn(MemorialWriteScreen)
    const input = screen.getByTestId('memorial-body')
    fireEvent.change(input, { target: { value: 'म' } })
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('म')
    fireEvent.change(input, { target: { value: 'माँ' } })
    expect(JSON.parse(mock.store.get(memorialDraftKey('m-1', 'pool-1'))!).body).toBe('माँ')
  })

  it('Write again opens an EMPTY box; "Start from what I sent" fills it with the ORIGINAL text (⛔ the as-approved)', () => {
    const original = 'माँ बहुत अच्छी थीं। रमेश ने धोखा दिया।'
    mock.view = view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: original, omissions: [{ field: 'body', start: 20, end: original.length, reason: 'accuses_someone_of_wrongdoing' }] })
    renderIn(MemorialWriteScreen)
    expect(screen.getByTestId('memorial-body')).toHaveValue('')
    fireEvent.click(screen.getByText(tr('write.start_from_sent', 'hi')))
    expect(screen.getByTestId('memorial-body')).toHaveValue(original)
  })

  it('the photo alt-text input: labelled as describing the photo for people who cannot see it (AC13)', () => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg' })
    renderIn(MemorialPhotoScreen, 'en')
    const alt = mock.inputs.find((p) => p.testID === 'memorial-alt-text')!
    expect(alt.accessibilityLabel).toBe(tr('photo.alt_label', 'en'))
    expect(alt.accessibilityHint).toBe(tr('photo.alt_hint', 'en'))
    expect(alt.autoCorrect).toBe(false)
    expect(alt).not.toHaveProperty('maxLength')
  })

  it('a draft photo whose file is gone degrades to a gentle line (⛔ an error)', () => {
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'gone.jpg' })
    renderIn(MemorialPhotoScreen)
    expect(document.body.textContent).toContain(tr('draft.photo_missing', 'hi'))
  })
})

describe('AC4 — preview and send', () => {
  beforeEach(() => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'पहली पंक्ति\n\nदूसरी पंक्ति' })
  })

  it('M3′ at the TOP; the permission IMMEDIATELY above Send, in the app\'s language', () => {
    renderIn(MemorialPreviewScreen, 'en')
    const top = screen.getByTestId('memorial-before-publish')
    const text = screen.getByTestId('memorial-preview-text')
    const permission = screen.getByTestId('memorial-permission')
    const send = screen.getByTestId('memorial-send')
    expect(top).toHaveTextContent(tr('preview.before_publish', 'en'))
    expect(top.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(permission).toHaveTextContent('The permission text')
    expect(permission.nextElementSibling).toBe(send)
  })

  it('a 2xx clears the draft and goes to the outcome; the client sends only the version + the locale shown', async () => {
    mock.send.mockResolvedValue({ submissionId: 's-1', memorialState: 'with_the_trust' })
    renderIn(MemorialPreviewScreen, 'hi')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    const form = mock.send.mock.calls[0]![0] as FormData
    expect(form.get('authorisationCopyVersion')).toBe('v1')
    expect(form.get('authorisationLocale')).toBe('hi')
    expect(form.get('body')).toBe('पहली पंक्ति\n\nदूसरी पंक्ति')
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('a refusal KEEPS the draft and shows Pattern-4 copy in a live region, with the helpline', async () => {
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    const refusal = screen.getByTestId('memorial-refusal')
    expect(refusal).toHaveAttribute('aria-live', 'polite')
    expect(refusal).toHaveTextContent(tr('send.authorisation_outdated', 'en'))
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('पहली पंक्ति\n\nदूसरी पंक्ति')
  })
})

describe('AC7a — the handover code, asked at Send', () => {
  beforeEach(() => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
  })

  it('a 403 texts the nominee ONCE (across re-renders), retries ONCE with the SAME key after a verified code', async () => {
    mock.send.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'x')).mockResolvedValueOnce({ submissionId: 's-1', memorialState: 'with_the_trust' })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    const { rerender } = renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    rerender(createElement(LocaleProvider, { initialLocale: 'en' }, createElement(MemorialPreviewScreen)))
    await settle()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).toContain(tr('handover.body', 'en', { masked: '+91·····3210' }))
    fireEvent.change(screen.getByTestId('memorial-handover-code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(mock.send).toHaveBeenCalledTimes(2)
    const key = (i: number) => (mock.send.mock.calls[i]![1] as { idempotencyKey: string }).idempotencyKey
    expect(key(1)).toBe(key(0))
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('a SECOND refusal after a verified code goes to the helpline (⛔ another SMS round trip)', async () => {
    mock.send.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'))
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    fireEvent.change(screen.getByTestId('memorial-handover-code'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr('handover.still_refused', 'en'))
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('शब्द')
  })

  it('⛔ nominee ⇒ the helpline with memorial copy (⛔ claim copy)', async () => {
    mock.send.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'))
    mock.otp.masked = ''
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-handover-no-nominee')).toHaveTextContent(tr('handover.no_nominee', 'en'))
    expect(screen.getByTestId('memorial-handover')).toContainElement(screen.getByTestId('helpline-cta'))
  })

  it('a code that does not match asks again, in memorial copy', async () => {
    mock.send.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'))
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(false)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    fireEvent.change(screen.getByTestId('memorial-handover-code'), { target: { value: '9' } })
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(document.body.textContent).toContain(tr('handover.not_verified', 'en'))
    expect(mock.send).toHaveBeenCalledTimes(1)
  })
})

describe('AC10 — the outcome, gently, in the app', () => {
  it('approved: the text as approved, the nominee calls the helpline to change or take it down, ⛔ Write again', () => {
    mock.view = view({ memorialState: 'approved', submissionId: 's-1', body: 'शब्द', canSend: false })
    renderIn(MemorialOutcomeScreen, 'en')
    expect(document.body.textContent).toContain(tr('outcome.approved', 'en'))
    expect(document.body.textContent).toContain(tr('outcome.helpline_for_changes', 'en'))
    expect(screen.queryByTestId('memorial-write-again')).toBeNull()
    expect(screen.getByTestId('helpline-cta')).toBeInTheDocument()
  })

  it('approved_with_omissions: the part left out is a MARKER segment, with the reason; the photo line', () => {
    const body = 'एक दो तीन'
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      omissions: [{ field: 'body', start: 3, end: 5, reason: 'attacks_someone_named' }],
      photoLeftOut: { reason: 'identifies_a_child' },
      hasPhoto: true,
    })
    renderIn(MemorialOutcomeScreen, 'hi')
    const text = screen.getByTestId('memorial-outcome-text')
    expect(text).toHaveTextContent(tr('render.omitted', 'hi'))
    expect(text).not.toHaveTextContent('दो')
    expect(document.body.textContent).toContain(tr('outcome.photo_left_out', 'hi'))
    expect(document.body.textContent).toContain(tr('outcome.reason', 'hi', { reason: tr('reason.attacks_someone_named', 'hi') }))
    expect(screen.getByTestId('memorial-write-again')).toBeInTheDocument()
  })

  it('with_the_trust: Withdraw and Write again side by side, with the replace note', () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.getByTestId('memorial-withdraw')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-write-again')).toBeInTheDocument()
    expect(document.body.textContent).toContain(tr('outcome.replace_note', 'en'))
  })

  it.each([
    ['not_approved', 'outcome.not_approved'],
    ['approval_withdrawn', 'outcome.approval_withdrawn'],
    ['withdrawn', 'outcome.withdrawn'],
  ] as const)('%s → its calm line and the helpline', (state, key) => {
    mock.view = view({ memorialState: state, submissionId: 's-1', body: 'x', reasonCode: state === 'withdrawn' ? null : 'against_the_law' })
    renderIn(MemorialOutcomeScreen, 'en')
    expect(document.body.textContent).toContain(tr(key, 'en'))
    expect(document.body.textContent).toContain(tr('outcome.helpline', 'en'))
  })

  it('an earlier approval the Trust withdrew is told above the newer version', () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-2', body: 'x', canWithdraw: true, earlierApprovalWithdrawn: { reasonCode: 'identifies_a_child' } })
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.getByTestId('memorial-earlier-withdrawn')).toHaveTextContent(tr('outcome.earlier_approval_withdrawn', 'en'))
  })
})

describe('AC12 — real t() for every interpolated key, in hi and en', () => {
  it.each(['hi', 'en'] as const)('%s', (locale) => {
    expect(tr('intro.prompt', locale, { name: 'Shanti' })).toContain('Shanti')
    expect(tr('write.remaining', locale, { count: '5' })).toContain('5')
    expect(tr('write.over_limit', locale, { count: '7' })).toContain('7')
    expect(tr('photo.alt_remaining', locale, { count: '3' })).toContain('3')
    expect(tr('handover.body', locale, { masked: '+91·····1' })).toContain('+91·····1')
    expect(tr('outcome.reason', locale, { reason: 'R' })).toContain('R')
    // ⛔ Hindi numerals in a count.
    expect(tr('write.remaining', locale, { count: '12' })).not.toMatch(/[०-९]/)
  })
})
