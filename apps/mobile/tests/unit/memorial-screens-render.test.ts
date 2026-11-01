// @vitest-environment jsdom
//
// Story 11b.4 — the memorial screens on the jsdom harness (the `language-screen-render.test.ts` precedent: RN mocked,
// `lib/mmkv` mocked, RTL `cleanup`; + mocks for `expo-file-system` and `expo-image-picker`, which ⛔ mobile test mocked
// before). AC2 (Save and come back, Not now), AC3 (save on every change), AC4 (M3′ at the top, the permission immediately
// above Send, in the app's language), AC7a (the handover leg: once, retried once, then the helpline), AC10 (each outcome,
// the helpline everywhere, Write again iff canSend, empty vs Start from what I sent), AC12 (real `t()` in hi and en),
// AC13 (labels, live regions, 44pt targets), Trap 7 (the input props).
// Code-review legs (2026-10-24): R2 (the earlier approval still stands), R5 (a state that appears is ANNOUNCED — the mocked
// `AccessibilityInfo` records it), R7 (a second Send gets its own code), R8 (the kept photo), R10 (each reason beside its own
// part), R13 (a segment's bidi controls stay in their isolate), R16 (Task 6.7 legs: labels, 44pt on every button, the refusal
// linked to its field, reading order; AC3 orchestration; the Withdraw flow), R20 (a missing view is never a blank screen; the
// saved draft is loaded in an effect). ⚠ The mocked `tamagui` maps `accessibilityLabel` to `aria-label` and never sees
// `accessible`: the "a labelled container is accessible" check is the source scan in `memorial-a11y-scan.test.ts`.

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
  dismissAll: vi.fn(),
  // Is there a screen below this one in the memorial stack (`router.canDismiss()`)? The normal way in: intro → … → preview.
  canDismiss: true,
  view: null as unknown,
  // What the member GET query is doing: has data (`view` may be null = `{ memorial: null }`), is loading, or failed.
  viewState: 'data' as 'data' | 'loading' | 'error',
  // A refetch in flight (`isFetching`) — a Retry after a failed GET (`isPending` stays false then).
  viewFetching: false,
  refetch: vi.fn(),
  announce: vi.fn(),
  send: vi.fn(),
  withdraw: vi.fn(),
  fetchView: vi.fn(),
  invalidate: vi.fn(),
  otp: { masked: null as string | null, error: null as string | null, busy: false },
  otpSend: vi.fn(),
  otpVerify: vi.fn(),
  inputs: [] as Record<string, unknown>[],
  os: 'ios' as 'ios' | 'android',
  // The screens' focus (`useFocusEffect`), navigation options and Android back — driven by the tests.
  focus: { handlers: [] as Array<{ cb: () => void | (() => void); cleanup: void | (() => void) }> },
  navigation: { setOptions: vi.fn() },
  back: { handlers: [] as Array<() => boolean> },
  // `null` ⇒ the announcement plan answers with its REAL values; otherwise DISTINGUISHABLE ones (a hard-coded literal on a
  // screen cannot equal them).
  planValues: null as null | { error: string; status: string },
  // V9 (a) — the phone's storage refuses writes (full storage): `setItem` throws.
  failWrites: false,
}))

vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (mock.failWrites) throw new Error('storage full')
      mock.store.set(k, v)
    },
    removeItem: (k: string) => {
      mock.store.delete(k)
    },
  },
}))
vi.mock('../../lib/session-context', () => ({ useSession: () => ({ session: mock.session }) }))
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react')
  return {
    useRouter: () => ({ push: mock.push, replace: mock.replace, dismissAll: mock.dismissAll, canDismiss: () => mock.canDismiss }),
    useNavigation: () => mock.navigation,
    // The registry stands in for the navigator: it runs the callback on mount ("focused"), `blurScreens()` runs the cleanup,
    // `focusScreens()` runs the callback again, and an unmount runs the cleanup too — as the real `useFocusEffect` does.
    useFocusEffect: (cb: () => void | (() => void)) => {
      useEffect(() => {
        const h = { cb, cleanup: undefined as void | (() => void) }
        mock.focus.handlers.push(h)
        h.cleanup = cb()
        return () => {
          h.cleanup?.()
          mock.focus.handlers.splice(mock.focus.handlers.indexOf(h), 1)
        }
      }, [])
    },
  }
})
// T10 (a) — with `planValues` null the screens get the REAL plan (`vi.importActual`), not a re-implementation of it, so a
// test that pins "the real plan's values" can fail when the plan changes; otherwise DISTINGUISHABLE values (P4).
vi.mock('../../lib/death-certificate-announce', async () => {
  const actual = await vi.importActual<typeof import('../../lib/death-certificate-announce')>('../../lib/death-certificate-announce')
  return {
    announcementPlan: (platform: string, kind: 'status' | 'error' = 'status') =>
      mock.planValues
        ? { liveRegion: kind === 'error' ? mock.planValues.error : mock.planValues.status, iosAnnounce: platform === 'ios' }
        : actual.announcementPlan(platform, kind),
  }
})
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
      if (this.uri.includes('unreadable')) throw new Error('cannot read')
      mock.files.add(dest.uri)
    }
    public delete(): void {
      mock.files.delete(this.uri)
    }
  }
  return { File, Paths: { document: { uri: 'file:///docs' } } }
})
// Y — the Send hooks only INVALIDATE the memorial queries (⛔ no `fetchQuery`: no refetch before a Send any more).
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mock.invalidate }),
}))
vi.mock('../../components/memorial-authorship/useMemorialQueries', () => ({
  MEMORIAL_VIEW_QUERY_KEY: ['member', 'memorial', 'view'],
  useMemorialViewQuery: () => ({
    data: mock.viewState === 'data' ? { memorial: mock.view } : undefined,
    isPending: mock.viewState === 'loading',
    isFetching: mock.viewState === 'loading' || mock.viewFetching,
    isError: mock.viewState === 'error',
    refetch: mock.refetch,
  }),
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
    Image: (p: { accessibilityLabel?: string; accessible?: boolean; source?: { uri?: string }; onError?: () => void; onLoad?: () => void }) =>
      createElement('img', {
        'aria-label': p.accessibilityLabel,
        'data-accessible': p.accessible === true ? 'true' : undefined,
        'data-testid': 'img',
        src: p.source?.uri,
        onError: p.onError,
        onLoad: p.onLoad,
      }),
    AccessibilityInfo: { announceForAccessibility: (...a: unknown[]) => mock.announce(...a) },
    BackHandler: {
      addEventListener: (_name: string, fn: () => boolean) => {
        mock.back.handlers.push(fn)
        return { remove: () => void mock.back.handlers.splice(mock.back.handlers.indexOf(fn), 1) }
      },
    },
    Platform: {
      get OS() {
        return mock.os
      },
    },
  }
})
// The device run (2026-10-24) found the header over the status bar: it pads itself by the top safe-area inset.
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 48, left: 0, right: 0 }) }))
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
    accessible?: boolean
    style?: { minHeight?: number }
    pt?: number | string
    accessibilityState?: { checked?: boolean; expanded?: boolean }
  }
  const attrs = (p: P) => ({
    'data-testid': p.testID,
    role: p.accessibilityRole,
    'aria-label': p.accessibilityLabel,
    'aria-live': p.accessibilityLiveRegion,
    'data-accessible': p.accessible === true ? 'true' : undefined,
    'data-pt': p.pt,
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
        {
          'data-testid': p.testID,
          'aria-label': p.accessibilityLabel,
          'data-minheight': p.style?.minHeight,
          onClick: p.onPress,
          disabled: p.disabled,
          // Story 11b.5a — the family screen's relation options (radio) and "in the photo" tick (checkbox) carry their state.
          'data-role': p.accessibilityRole,
          'aria-checked': p.accessibilityState?.checked,
        },
        p.children,
      ),
  }
})

import MemorialFamilyScreen from '../../app/(memorial)/family'
import MemorialIntroScreen from '../../app/(memorial)/index'
import MemorialOutcomeScreen from '../../app/(memorial)/outcome'
import MemorialPhotoScreen from '../../app/(memorial)/photo'
import MemorialPreviewScreen from '../../app/(memorial)/preview'
import MemorialWriteScreen from '../../app/(memorial)/write'
import { ApiError } from '@twt/api-client'
import { loadMemorialDraft, memorialDraftKey, saveMemorialDraft } from '../../lib/memorial-draft'
import { handoverGateAnswerOf, useHandoverGatedAction } from '../../lib/use-memorial-send'

const tr = (key: string, locale: 'hi' | 'en', params?: Record<string, string>) => t(key, params, { locale, namespace: 'memorial' })

function view(over: Partial<MemorialMemberView> = {}): MemorialMemberView {
  return {
    driveId: 'pool-1',
    deceasedName: 'शांति देवी',
    memorialState: 'none',
    submissionId: null,
    idempotencyKey: null,
    body: null,
    altText: null,
    unavailable: null,
    hasPhoto: false,
    photoUrl: null,
    omissions: [],
    photoLeftOut: null,
    // Story 11b.5a — ⛔ family list unless a test gives one.
    kinship: null,
    kinshipLeftOut: [],
    guardianDeclaration: false,
    reasonCode: null,
    earlierApprovalWithdrawn: null,
    earlierApprovalStands: false,
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
  mock.viewState = 'data'
  mock.viewFetching = false
  mock.canDismiss = true
  mock.otp = { masked: null, error: null, busy: false }
  mock.os = 'ios'
  mock.planValues = null
  mock.failWrites = false
  mock.focus.handlers.length = 0
  mock.back.handlers.length = 0
  for (const f of [mock.push, mock.replace, mock.dismissAll, mock.send, mock.withdraw, mock.fetchView, mock.invalidate, mock.otpSend, mock.otpVerify, mock.refetch, mock.announce, mock.navigation.setOptions]) f.mockReset()
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

  // Device run (2026-10-24): the `(memorial)` stack hides the native header, and the memorial header sat UNDER the status
  // bar (over the clock and the battery). It now pads itself by the top safe-area inset (mocked as 24).
  it.each([
    ['intro', MemorialIntroScreen],
    ['write', MemorialWriteScreen],
    ['photo', MemorialPhotoScreen],
    ['preview', MemorialPreviewScreen],
    ['outcome', MemorialOutcomeScreen],
  ] as const)('%s — the header clears the status bar (top padding = the safe-area inset + 8)', (_n, Screen) => {
    if (_n === 'outcome') mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    renderIn(Screen)
    expect(screen.getByTestId('memorial-header')).toHaveAttribute('data-pt', '32')
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

  // R20 — this used to be "no drive ⇒ the screen renders nothing" (a blank screen in a header-less stack: no message, no
  // retry, no exit). The home entry still shows only with a drive; a deep link or a restored screen now gets a way out.
  it('no drive ⇒ the header, a gentle line, a retry and the helpline (never a blank screen)', () => {
    mock.view = null
    const { container } = renderIn(MemorialIntroScreen)
    expect(container.textContent).not.toBe('')
    expect(screen.getByTestId('memorial-header')).toBeInTheDocument()
    // P3 — the intro cannot know whether a draft is still on the phone, so it makes no claim about it.
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveTextContent(tr('view_missing.body_outcome', 'hi'))
    expect(screen.getByTestId('helpline-cta')).toBeInTheDocument()
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

  // Device run (2026-10-24): Android centred the multiline box's text vertically, so the first line started mid-box.
  it('the text starts at the TOP of the box (textAlignVertical="top")', () => {
    renderIn(MemorialWriteScreen)
    expect(mock.inputs.find((p) => p.testID === 'memorial-body')!.textAlignVertical).toBe('top')
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
    expect(refusal).toHaveAttribute('aria-live', 'assertive')
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

// ─── Story 11b.4a (AC8) — the take-down, and the reworded "left out" line (`2026-10-27-411` item 3) ─────────────────────────

describe('Story 11b.4a AC8 — `taken_down` and the reworded `approved_with_omissions` line, through real t()', () => {
  it.each(['hi', 'en'] as const)('%s: taken_down ⇒ its line, ⛔ no reason line, ⛔ no Withdraw, Write again (canSend), the helpline', (locale) => {
    mock.view = view({ memorialState: 'taken_down', submissionId: 's-1', body: 'x', reasonCode: null, canSend: true, canWithdraw: false })
    renderIn(MemorialOutcomeScreen, locale)
    expect(screen.getByTestId('memorial-outcome-taken_down')).toBeInTheDocument()
    expect(document.body.textContent).toContain(tr('outcome.taken_down', locale))
    // ⛔ No reason rides beside it (the member GET sends `reasonCode: null` — 11b.4a MP9), and the line is ⛔ not a Trust act.
    expect(document.body.textContent).not.toContain(tr('outcome.reason', locale, { reason: '' }).trim())
    expect(document.body.textContent).not.toContain(tr('outcome.approval_withdrawn', locale))
    expect(screen.queryByTestId('memorial-withdraw')).toBeNull()
    expect(screen.getByTestId('memorial-write-again')).toBeInTheDocument()
    expect(document.body.textContent).toContain(tr('outcome.helpline', locale))
  })

  it('the taken_down copy names the nominee and says it may be written again — ⛔ never "removed by the Trust", "deleted" or "immediately"', () => {
    const en = tr('outcome.taken_down', 'en')
    expect(en).toMatch(/nominee/i)
    expect(en).toMatch(/write again/i)
    for (const banned of [/removed by the Trust/i, /deleted/i, /immediate/i]) expect(en).not.toMatch(banned)
    expect(tr('outcome.taken_down', 'hi')).toMatch(/नॉमिनी/)
  })

  it.each(['hi', 'en'] as const)('%s: approved_with_omissions ⇒ the REWORDED line — the page shows ⛔ no mark where the part was', (locale) => {
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body: 'एक दो',
      omissions: [{ field: 'body', start: 2, end: 4, reason: 'attacks_someone_named' }],
      canSend: true,
    })
    renderIn(MemorialOutcomeScreen, locale)
    const line = tr('outcome.approved_with_omissions', locale)
    expect(document.body.textContent).toContain(line)
    // ⛔ The old sentence ("…will appear … like this") is gone in BOTH languages.
    expect(line).not.toMatch(/like this|इस तरह दिखेंगे/)
    expect(line).toMatch(locale === 'en' ? /nothing marks where it was/ : /कोई निशान नहीं/)
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Code-review legs (2026-10-24). Every copy assertion goes through the REAL catalogue and `t()` (`tr`) — the screens render
// through `LocaleProvider` + `useMemorialT`, so nothing here is a transcribed string.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

const ALL_LOCALES = ['hi', 'en'] as const
type Locale = (typeof ALL_LOCALES)[number]
/**
 * TalkBack device session 2026-10-27 (T1) — every memorial screen but the outcome SPEAKS its heading on arrival
 * (`useMemorialScreenAnnounce`). `announced()` is everything ELSE that was spoken, so the "silent" legs below keep asserting what
 * they did (no refusal, no notice, no over-limit line); `arrivals()` is the arrival announcements alone (the T1 legs).
 */
const ARRIVAL_KEYS = ['write.title', 'photo.title', 'preview.title', 'family.title', 'intro.prompt_no_name'] as const
const isArrival = (text: string): boolean =>
  ALL_LOCALES.some(
    (l) =>
      ARRIVAL_KEYS.some((k) => tr(k, l) === text) ||
      ((mock.view as MemorialMemberView | null)?.deceasedName != null &&
        tr('intro.prompt', l, { name: (mock.view as MemorialMemberView).deceasedName! }) === text),
  )
const spokenAll = (): string[] => mock.announce.mock.calls.map((c) => String(c[0]))
const announced = (): string[] => spokenAll().filter((x) => !isArrival(x))
const arrivals = (): string[] => spokenAll().filter(isArrival)
const rerenderIn = (r: ReturnType<typeof renderIn>, component: () => ReactNode, locale: Locale = 'hi') =>
  r.rerender(createElement(LocaleProvider, { initialLocale: locale }, createElement(component)))
const cpoint = (n: number): string => String.fromCodePoint(n)
const follows = (a: Element, b: Element): boolean => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
const lastInput = (testID: string) => [...mock.inputs].reverse().find((p) => p.testID === testID)!
const sentKey = (i: number) => (mock.send.mock.calls[i]![1] as { idempotencyKey: string }).idempotencyKey
const typeCode = (value: string) => fireEvent.change(screen.getByTestId('memorial-handover-code'), { target: { value } })
const stepUp = () => new ApiError(403, 'auth.step_up_required', 'x')
const SENT_OK = { submissionId: 's-9', memorialState: 'with_the_trust' }

// ─── R2 — the earlier approval still stands ──────────────────────────────────────────────────────────────────────────────

describe('R2 — the newest version is withdrawn / declined but an EARLIER one is still approved', () => {
  const ours = (state: MemorialMemberView['memorialState'], over: Partial<MemorialMemberView> = {}) =>
    view({
      memorialState: state,
      submissionId: 's-2',
      body: 'x',
      reasonCode: state === 'not_approved' || state === 'approval_withdrawn' ? 'against_the_law' : null,
      canSend: true,
      ...over,
    })
  const newestGone = ['withdrawn', 'not_approved', 'approval_withdrawn'] as const

  it.each(newestGone.flatMap((s) => ALL_LOCALES.map((l) => [s, l] as const)))('%s / %s ⇒ one extra sentence: the earlier version stands, the helpline is the way to change it', (state, locale) => {
    mock.view = ours(state, { earlierApprovalStands: true })
    renderIn(MemorialOutcomeScreen, locale)
    const line = screen.getByTestId('memorial-earlier-stands')
    expect(line).toHaveTextContent(tr('outcome.earlier_approval_stands', locale))
    expect(line.textContent).toMatch(locale === 'en' ? /helpline/i : /हेल्पलाइन/)
    expect(screen.getByTestId('helpline-cta')).toBeInTheDocument()
    // After the state's own line, not above the title.
    expect(follows(screen.getByText(tr('outcome.title', locale)), line)).toBe(true)
  })

  it.each(newestGone)('%s without the flag ⇒ no extra sentence', (state) => {
    mock.view = ours(state, { earlierApprovalStands: false })
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.queryByTestId('memorial-earlier-stands')).toBeNull()
    expect(document.body.textContent).not.toContain(tr('outcome.earlier_approval_stands', 'en'))
  })

  it.each(['approved', 'approved_with_omissions', 'with_the_trust'] as const)('%s never shows it, even with the flag (the sentence is about a newest version that is gone)', (state) => {
    mock.view = ours(state, { earlierApprovalStands: true, canWithdraw: state === 'with_the_trust' })
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.queryByTestId('memorial-earlier-stands')).toBeNull()
  })
})

// ─── R5 — a state that appears is ANNOUNCED (checklist family 13 (d)) ──────────────────────────────────────────────────

describe('R5 — the Send refusal, the nominee-code states, the notice and the Withdraw swap are SPOKEN', () => {
  beforeEach(() => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
  })

  it.each(ALL_LOCALES)('the refusal (%s): a live region with NO label of its own, the helpline button stays focusable inside it, and the refusal TEXT is announced', async (locale) => {
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, locale)
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    const refusal = screen.getByTestId('memorial-refusal')
    expect(refusal).toHaveAttribute('aria-live', 'assertive')
    // A container label would replace what is read; grouping the container would hide the helpline button from focus.
    expect(refusal).not.toHaveAttribute('aria-label')
    expect(refusal).not.toHaveAttribute('data-accessible')
    expect(refusal.querySelector('[aria-label]')).toBeNull()
    expect(refusal).toContainElement(screen.getByTestId('helpline-cta'))
    expect(announced()).toContain(tr('send.authorisation_outdated', locale))
  })

  it('Android: the live region speaks it — the announce call is iOS-only (both ⇒ TalkBack speaks it twice)', async () => {
    mock.os = 'android'
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-refusal')).toHaveAttribute('aria-live', 'assertive')
    expect(announced()).not.toContain(tr('send.authorisation_outdated', 'en'))
  })

  it('the same refusal twice is announced twice (the second Send speaks again)', async () => {
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(announced().filter((a) => a === tr('send.authorisation_outdated', 'en'))).toHaveLength(2)
  })

  describe('the handover panel after a 403', () => {
    const press = async () => {
      mock.send.mockRejectedValue(stepUp())
      renderIn(MemorialPreviewScreen, 'en')
      fireEvent.click(screen.getByTestId('memorial-send'))
      await settle()
    }

    it('the code is asked for (the code was sent) ⇒ announced', async () => {
      mock.otp.masked = '+91·····3210'
      await press()
      expect(announced()).toContain(tr('handover.body', 'en', { masked: '+91·····3210' }))
      expect(screen.getByTestId('memorial-handover-body')).toHaveAttribute('aria-live', 'polite')
    })

    it('the code could not be sent ⇒ announced — WITH the offer of a new code, as ONE announcement (Z0 (A))', async () => {
      mock.otp.masked = null
      mock.otp.error = 'x'
      await press()
      expect(announced()).toContain(`${tr('handover.send_failed', 'en')} ${tr('handover.resend_note', 'en')}`)
      expect(announced().filter((a) => a === tr('handover.resend_note', 'en'))).toEqual([]) // ⛔ a second, cutting the first off
      expect(screen.getByTestId('memorial-handover-send-failed')).toHaveAttribute('aria-live', 'assertive') // an error, from the plan
    })

    it('no nominee ⇒ announced', async () => {
      mock.otp.masked = ''
      await press()
      expect(announced()).toContain(tr('handover.no_nominee', 'en'))
      expect(screen.getByTestId('memorial-handover-no-nominee')).toHaveAttribute('aria-live', 'assertive')
    })

    it('a code that does not match ⇒ announced, AND linked to the field (the field reads it as its hint)', async () => {
      mock.otp.masked = '+91·····3210'
      mock.otpVerify.mockResolvedValue(false)
      await press()
      expect(lastInput('memorial-handover-code')).not.toHaveProperty('accessibilityHint')
      typeCode('9')
      fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
      await settle()
      expect(announced()).toContain(tr('handover.not_verified', 'en'))
      expect(screen.getByTestId('memorial-handover-not-verified')).toHaveAttribute('aria-live', 'assertive')
      expect(lastInput('memorial-handover-code').accessibilityHint).toBe(tr('handover.not_verified', 'en'))
    })
  })

  describe('the outcome screen', () => {
    const withTheTrust = () => view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true, canSend: true })

    it.each(['ios', 'android'] as const)('%s: nothing is announced on arrival; the Withdraw that worked announces the new state when the refetched view swaps in', async (os) => {
      mock.os = os
      mock.view = withTheTrust()
      mock.withdraw.mockResolvedValue({ memorialState: 'withdrawn' })
      const r = renderIn(MemorialOutcomeScreen, 'en')
      expect(announced()).toEqual([]) // the screen reader reads the screen itself on arrival
      fireEvent.click(screen.getByTestId('memorial-withdraw'))
      await settle()
      expect(mock.withdraw).toHaveBeenCalledWith('s-1')
      mock.view = view({ memorialState: 'withdrawn', submissionId: 's-1', body: 'x', canSend: true })
      rerenderIn(r, MemorialOutcomeScreen, 'en')
      expect(announced()).toEqual([tr('outcome.withdrawn', 'en')])
    })

    it('the notice (a Withdraw that failed) is a live region and is announced', async () => {
      mock.view = withTheTrust()
      mock.withdraw.mockRejectedValue(new ApiError(500, 'memorial.something_else', 'x'))
      renderIn(MemorialOutcomeScreen, 'en')
      fireEvent.click(screen.getByTestId('memorial-withdraw'))
      await settle()
      expect(screen.getByTestId('memorial-notice')).toHaveAttribute('aria-live', 'assertive')
      expect(screen.getByTestId('memorial-notice')).toHaveTextContent(tr('outcome.withdraw_failed', 'en'))
      expect(announced()).toContain(tr('outcome.withdraw_failed', 'en'))
    })

    it('a second refusal after the verified code (the helpline line) is announced', async () => {
      mock.view = withTheTrust()
      mock.otp.masked = '+91·····3210'
      mock.otpVerify.mockResolvedValue(true)
      mock.withdraw.mockRejectedValue(stepUp())
      renderIn(MemorialOutcomeScreen, 'en')
      fireEvent.click(screen.getByTestId('memorial-withdraw'))
      await settle()
      expect(announced()).toContain(tr('handover.body', 'en', { masked: '+91·····3210' }))
      typeCode('123456')
      fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
      await settle()
      expect(announced()).toContain(tr('handover.still_refused', 'en'))
      expect(screen.getByText(tr('handover.still_refused', 'en'))).toHaveAttribute('aria-live', 'assertive')
    })
  })

  // The REAL plan's values, on both platforms (the plan is platform-independent). That the screens TAKE them from the plan,
  // rather than hold the same literal, is proven by the "P4" block below, with a plan that answers distinguishable values.
  // T10 (a) — "real" is literal: with `planValues` null the mocked module DELEGATES to the actual `announcementPlan`
  // (`vi.importActual`), so this test fails if the plan's values change (it used to run against a copy of them).
  it('with the real plan: the refusal is assertive, and the write counter is ⛔ a live region (T2), on iOS and Android', async () => {
    const actual = await vi.importActual<typeof import('../../lib/death-certificate-announce')>('../../lib/death-certificate-announce')
    expect(mock.planValues).toBeNull()
    for (const os of ['ios', 'android'] as const) {
      // The values asserted below ARE the actual plan's (a change there fails here, not silently).
      expect(actual.announcementPlan(os, 'error').liveRegion).toBe('assertive')
      expect(actual.announcementPlan(os, 'status').liveRegion).toBe('polite')
      mock.os = os
      saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
      mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
      renderIn(MemorialPreviewScreen, 'en')
      fireEvent.click(screen.getByTestId('memorial-send'))
      await settle()
      expect(screen.getByTestId('memorial-refusal')).toHaveAttribute('aria-live', 'assertive')
      cleanup()
      renderIn(MemorialWriteScreen, 'en')
      expect(screen.getByText(tr('write.remaining', 'en', { count: '5996' }))).not.toHaveAttribute('aria-live') // T2 — ⛔ a live region
      cleanup()
    }
  })
})

// ─── R7 / T5 / Y — a refusal after a verified code is STICKY; a SERVER answer proves the step-up, NO answer proves nothing ──

describe('T5 / Y — after a verified code is refused, the screen never texts the nominee again; a SUCCESS or a server answer lets a later lapse get a fresh code (R7)', () => {
  it('Send: verified code → 403 again (the helpline) → press Send again ⇒ ⛔ no second otp.send, still the helpline (AC7a)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.send.mockRejectedValue(stepUp())
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr('handover.still_refused', 'en'))
    expect(mock.otpSend).toHaveBeenCalledTimes(1)

    for (let press = 0; press < 3; press++) {
      fireEvent.click(screen.getByTestId('memorial-send')) // the family presses Send again on the same screen
      await settle()
    }
    expect(mock.send).toHaveBeenCalledTimes(5)
    expect(mock.otpSend).toHaveBeenCalledTimes(1) // ⛔ no other SMS round trip — however often, however late (X2 (b))
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr('handover.still_refused', 'en'))
    expect(screen.getByTestId('memorial-refusal')).toContainElement(screen.getByTestId('helpline-cta'))
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('शब्द')
  })

  const verifiedThen = async (outcome: () => Error): Promise<void> => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.send
      .mockRejectedValueOnce(stepUp()) // Send 1 → asks for the code
      .mockRejectedValueOnce(outcome()) // the retry after the verified code: NOT a 403
      .mockRejectedValueOnce(stepUp()) // a later press refused
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(mock.send).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('memorial-handover')).toBeNull() // the code was used: its panel is put away
    expect(screen.getByTestId('memorial-refusal')).not.toHaveTextContent(tr('handover.still_refused', 'en'))
  }

  // A SERVER answer from AFTER the step-up check that is not a 403 PROVES the step-up passed: a later 403 is a lapsed
  // elevation (R7's case: the 5 minutes ran out while the family edited) ⇒ a NEW code. (Z4 (a): a 5xx, a 429, an `auth.*` or
  // `memorial.not_found` may come from BEFORE the check — they are NO answer, below.)
  const SERVER_ANSWERS = [
    ['409 memorial.try_again', 'send.try_again', () => new ApiError(409, 'memorial.try_again', 'x')],
    ['409 memorial.authorisation_outdated', 'send.authorisation_outdated', () => new ApiError(409, 'memorial.authorisation_outdated', 'x')],
    ['409 memorial.idempotency_in_progress (an OLDER server)', 'send.try_again', () => new ApiError(409, 'memorial.idempotency_in_progress', 'x')],
    ['422 with the server\'s envelope', 'send.generic', () => new ApiError(422, 'memorial.something_else', 'x')],
  ] as const

  it.each(SERVER_ANSWERS)('Send (R7): verified code → %s (a SERVER answer) → a later 403 ⇒ a NEW code, ⛔ no helpline', async (_name, shownKey, outcome) => {
    await verifiedThen(outcome)
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr(shownKey, 'en'))
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.send).toHaveBeenCalledTimes(3)
    expect(document.body.textContent).not.toContain(tr('handover.still_refused', 'en'))
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(mock.otpSend).toHaveBeenCalledTimes(2) // a fresh code for a fresh lapse
  })

  // NO answer from the server (a network error, a gateway page with no envelope) proves nothing about the step-up: the NEXT
  // press is still the code-verified retry, so its 403 goes to the helpline — ⛔ no second SMS seconds after a verified code
  // (W2's case, without a clock).
  const NO_ANSWERS = [
    ['a network error', () => new Error('network down')],
    ['a gateway 502 (no envelope: http.502)', () => new ApiError(502, 'http.502', 'Bad Gateway')],
    // Z4 (a) — answers that may come from BEFORE the step-up check (rate limit → switch → session → step-up)
    ['a 429 (the rate limit runs first)', () => new ApiError(429, 'rate_limit.exceeded', 'x')],
    ['a 401 auth.* (the session check runs before the step-up)', () => new ApiError(401, 'auth.session_expired', 'x')],
    ['a 404 memorial.not_found (the switch runs before the step-up)', () => new ApiError(404, 'memorial.not_found', 'x')],
    ['a 500 with the server\'s envelope (a preHandler may have failed)', () => new ApiError(500, 'memorial.something_else', 'x')],
  ] as const

  it.each(NO_ANSWERS)('Send (Y): verified code → %s (NO answer) → the next press is STILL the retry: its 403 ⇒ the helpline, ⛔ no second SMS', async (_name, outcome) => {
    await verifiedThen(outcome)
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr('send.try_again', 'en'))
    expect(screen.getByTestId('memorial-send')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.send).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr('handover.still_refused', 'en'))
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
  })

  it.each(NO_ANSWERS)('Send (Y): verified code → %s → the next press replays under the SAME key and lands (the server\'s 200 replay)', async (_name, outcome) => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.send.mockRejectedValueOnce(stepUp()).mockRejectedValueOnce(outcome()).mockResolvedValueOnce(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(sentKey(2)).toBe(sentKey(0))
    expect(sentKey(1)).toBe(sentKey(0))
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
  })

  it('Send (R7\'s real case): verified code → a 2xx (newer words were written meanwhile, so the Preview stays) → the elevation lapses → the next Send gets a 403 ⇒ a NEW code', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.send.mockRejectedValueOnce(stepUp())
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    const retry = deferredSend() // the retry after the code is in flight …
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द' }) // … while newer words are written (P1 (a): they are kept)
    retry.resolve(SENT_OK) // the Send that WORKED
    await settle()
    expect(mock.replace).not.toHaveBeenCalled()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)

    mock.send.mockReset().mockRejectedValueOnce(stepUp()).mockResolvedValueOnce(SENT_OK) // "six minutes later": lapsed
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(document.body.textContent).not.toContain(tr('handover.still_refused', 'en'))
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(mock.otpSend).toHaveBeenCalledTimes(2) // a fresh code for a fresh lapse
    typeCode('222222')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect((mock.send.mock.calls[1]![0] as FormData).get('body')).toBe('नए शब्द')
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('Withdraw: verified code → 403 again → the helpline; the NEXT presses ⇒ ⛔ no second otp.send, still the helpline', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.withdraw.mockRejectedValue(stepUp())
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(document.body.textContent).toContain(tr('handover.still_refused', 'en'))
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)

    for (let press = 0; press < 2; press++) {
      fireEvent.click(screen.getByTestId('memorial-withdraw'))
      await settle()
    }
    expect(mock.otpSend).toHaveBeenCalledTimes(1) // ⛔ no other SMS round trip
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
    expect(document.body.textContent).toContain(tr('handover.still_refused', 'en'))
    expect(mock.withdraw).toHaveBeenCalledTimes(4)
  })

  it('Withdraw (R7\'s real case): 403 → verified code → the Withdraw WORKS → a later press gets a 403 ⇒ a NEW code', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.withdraw
      .mockRejectedValueOnce(stepUp()) // press 1 → asks for the code
      .mockResolvedValueOnce({ memorialState: 'withdrawn' }) // after the verified code → it worked
      .mockRejectedValueOnce(stepUp()) // a later press, the elevation lapsed → a NEW code
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(document.body.textContent).not.toContain(tr('handover.still_refused', 'en'))
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(mock.otpSend).toHaveBeenCalledTimes(2)
  })

  const withdrawVerifiedThen = async (outcome: () => Error): Promise<void> => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.withdraw.mockRejectedValueOnce(stepUp()).mockRejectedValueOnce(outcome()).mockRejectedValueOnce(stepUp())
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.queryByTestId('memorial-handover')).toBeNull() // the code was used: its panel is put away
    expect(document.body.textContent).not.toContain(tr('handover.still_refused', 'en'))
  }

  it.each([
    ['memorial.not_withdrawable (quiet)', () => new ApiError(409, 'memorial.not_withdrawable', 'x')],
    ['another refusal (the notice)', () => new ApiError(422, 'memorial.something_else', 'x')],
  ] as const)('Withdraw (R7): verified code → %s (a SERVER answer) → a later 403 ⇒ a NEW code, ⛔ not exhausted', async (_name, outcome) => {
    await withdrawVerifiedThen(outcome)
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(mock.withdraw).toHaveBeenCalledTimes(3)
    expect(document.body.textContent).not.toContain(tr('handover.still_refused', 'en'))
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(mock.otpSend).toHaveBeenCalledTimes(2)
  })

  it.each(NO_ANSWERS)('Withdraw (Y): verified code → %s (NO answer, the notice) → the next press is STILL the retry: its 403 ⇒ exhausted, ⛔ no second SMS', async (_name, outcome) => {
    await withdrawVerifiedThen(outcome)
    expect(screen.getByTestId('memorial-notice')).toHaveTextContent(tr('outcome.withdraw_failed', 'en'))
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(mock.withdraw).toHaveBeenCalledTimes(3)
    expect(document.body.textContent).toContain(tr('handover.still_refused', 'en'))
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
  })
})

// ─── R8 — "Use the photo I sent before" ────────────────────────────────────────────────────────────────────────────────

describe('R8 — "Use the photo I sent before" lets go of the picked photo and previews the KEPT one', () => {
  const sentBefore = (over: Partial<MemorialMemberView> = {}) =>
    view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: 'पहले के शब्द', hasPhoto: true, photoUrl: 'https://signed.example/earlier.jpg', canSend: true, ...over })

  it('deletes the picked copy, clears its name and type, sets keepPreviousPhoto — and the screen shows the kept photo, not the picked one', () => {
    mock.view = sentBefore()
    mock.files.add('file:///docs/picked.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'picked.jpg', photoMime: 'image/jpeg', altText: 'विवरण' })
    renderIn(MemorialPhotoScreen, 'en')
    expect(screen.getByLabelText(tr('photo.chosen_a11y', 'en'))).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('memorial-use-previous-photo'))
    const draft = loadMemorialDraft('m-1', 'pool-1')
    expect(draft.keepPreviousPhoto).toBe(true)
    expect(draft.photoFileName).toBeUndefined()
    expect(draft.photoMime).toBeUndefined()
    expect(draft.altText).toBe('विवरण') // alt text is still required with a kept photo — the family's words stay
    expect(mock.files.has('file:///docs/picked.jpg')).toBe(false)
    expect(screen.queryByLabelText(tr('photo.chosen_a11y', 'en'))).toBeNull()
    const kept = screen.getByTestId('memorial-kept-photo')
    expect(kept.querySelector('img')).toHaveAttribute('src', 'https://signed.example/earlier.jpg')
    expect(kept.querySelector('img')).toHaveAttribute('data-accessible', 'true')
    expect(kept).toHaveTextContent(tr('photo.kept_note', 'en'))
  })

  it('picking another photo afterwards takes keepPreviousPhoto back off', async () => {
    mock.view = sentBefore()
    saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true })
    const picker = await import('expo-image-picker')
    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///picker/x.png', mimeType: 'image/png' }] } as never)
    mock.files.add('file:///picker/x.png')
    renderIn(MemorialPhotoScreen, 'en')
    expect(screen.getByTestId('memorial-kept-photo')).toBeInTheDocument()
    fireEvent.click(screen.getByText(tr('photo.choose', 'en')))
    await settle()
    const draft = loadMemorialDraft('m-1', 'pool-1')
    expect(draft.keepPreviousPhoto).toBe(false)
    expect(draft.photoFileName).toMatch(/\.png$/)
    expect(screen.queryByTestId('memorial-kept-photo')).toBeNull()
  })

  it('"Continue without a photo" also deletes the copy and clears the choice', () => {
    mock.view = sentBefore()
    mock.files.add('file:///docs/picked.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'picked.jpg', photoMime: 'image/jpeg', keepPreviousPhoto: false })
    renderIn(MemorialPhotoScreen, 'en')
    fireEvent.click(screen.getByText(tr('photo.without', 'en')))
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({ keepPreviousPhoto: false })
    expect(mock.files.has('file:///docs/picked.jpg')).toBe(false)
    // Story 11b.5a (KL8) — both ways on from the photo go to the family list, then the preview.
    expect(mock.push).toHaveBeenCalledWith('/(memorial)/family')
  })

  it('the preview shows the KEPT photo (its signed URL), and the Send carries keepPreviousPhoto with the alt text and NO file', async () => {
    mock.view = sentBefore()
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द', altText: 'विवरण', keepPreviousPhoto: true })
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    const kept = screen.getByTestId('memorial-kept-photo')
    expect(kept.querySelector('img')).toHaveAttribute('src', 'https://signed.example/earlier.jpg')
    expect(kept.querySelector('img')).toHaveAttribute('aria-label', tr('photo.kept_a11y', 'en'))
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    const form = mock.send.mock.calls[0]![0] as FormData
    expect(form.get('keepPreviousPhoto')).toBe('true')
    expect(form.get('altText')).toBe('विवरण')
    expect(form.get('photo')).toBeNull()
  })

  it('no URL for the earlier photo ⇒ a plain line says it will be used — never a wrong image', () => {
    mock.view = sentBefore({ photoUrl: null })
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', altText: 'विवरण', keepPreviousPhoto: true })
    renderIn(MemorialPreviewScreen, 'hi')
    const kept = screen.getByTestId('memorial-kept-photo')
    expect(kept.querySelector('img')).toBeNull()
    expect(kept).toHaveTextContent(tr('photo.kept_note', 'hi'))
  })

  it('a stale draft holding BOTH a picked file and keepPreviousPhoto previews what the Send will carry (the kept photo), not the picked one', () => {
    mock.view = sentBefore()
    mock.files.add('file:///docs/picked.jpg')
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', altText: 'विवरण', photoFileName: 'picked.jpg', photoMime: 'image/jpeg', keepPreviousPhoto: true })
    renderIn(MemorialPreviewScreen, 'en')
    const imgs = screen.getAllByTestId('img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute('src', 'https://signed.example/earlier.jpg')
  })
})

// ─── R10 / R13 — each reason beside its own part; a segment's bidi controls stay in their isolate ────────────────────

describe('R10 — the outcome pairs EACH reason with its own part (`-391` Q4 A)', () => {
  const body = 'एक दो तीन चार पाँच'
  const at = (word: string) => body.indexOf(word)

  it.each(ALL_LOCALES)('%s: two parts left out for DIFFERENT reasons — each reason sits right after its own marker, in reading order', (locale) => {
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      omissions: [
        { field: 'body', start: at('दो'), end: at('दो') + 2, reason: 'attacks_someone_named' },
        { field: 'body', start: at('चार'), end: at('चार') + 3, reason: 'against_the_law' },
      ],
    })
    renderIn(MemorialOutcomeScreen, locale)
    const reasons = screen.getAllByTestId('memorial-omitted-reason')
    expect(reasons).toHaveLength(2)
    const line = (r: string) => tr('outcome.reason', locale, { reason: tr(`reason.${r}`, locale) })
    expect(reasons[0]).toHaveTextContent(line('attacks_someone_named'))
    expect(reasons[1]).toHaveTextContent(line('against_the_law'))
    for (const r of reasons) expect(r.previousElementSibling).toHaveTextContent(tr('render.omitted', locale)) // the marker it belongs to
    expect(reasons[0]!.previousElementSibling!.previousElementSibling).toHaveTextContent('एक')
    expect(reasons[0]!.nextElementSibling).toHaveTextContent('तीन')
    expect(reasons[1]!.nextElementSibling).toHaveTextContent('पाँच')
    expect(follows(reasons[0]!, reasons[1]!)).toBe(true)
    // The omitted words are gone from what the family reads as approved.
    expect(screen.getByTestId('memorial-outcome-text')).not.toHaveTextContent('दो')
    expect(screen.getByTestId('memorial-outcome-text')).not.toHaveTextContent('चार')
  })

  it('two parts left out for the SAME reason are two lines (nothing is de-duplicated)', () => {
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      omissions: [
        { field: 'body', start: at('दो'), end: at('दो') + 2, reason: 'against_the_law' },
        { field: 'body', start: at('चार'), end: at('चार') + 3, reason: 'against_the_law' },
      ],
    })
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.getAllByTestId('memorial-omitted-reason')).toHaveLength(2)
  })

  it('the photo left out carries ITS reason on its own line, and each part of the photo description its own', () => {
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      altText: 'alpha beta gamma',
      hasPhoto: true,
      omissions: [
        { field: 'body', start: at('दो'), end: at('दो') + 2, reason: 'attacks_someone_named' },
        { field: 'altText', start: 0, end: 5, reason: 'accuses_someone_of_wrongdoing' },
        { field: 'altText', start: 11, end: 16, reason: 'against_the_law' },
      ],
    })
    renderIn(MemorialOutcomeScreen, 'en')
    const alt = screen.getAllByTestId('memorial-alt-text-left-out')
    expect(alt).toHaveLength(2)
    expect(alt[0]).toHaveTextContent(`${tr('outcome.alt_text_left_out', 'en')} ${tr('outcome.reason', 'en', { reason: tr('reason.accuses_someone_of_wrongdoing', 'en') })}`)
    expect(alt[1]).toHaveTextContent(`${tr('outcome.alt_text_left_out', 'en')} ${tr('outcome.reason', 'en', { reason: tr('reason.against_the_law', 'en') })}`)
    expect(screen.queryByTestId('memorial-photo-left-out')).toBeNull() // the photo was NOT left out
  })

  it('a photo left out: the line carries its reason (and the other reasons are not mixed into it)', () => {
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      altText: 'alpha',
      hasPhoto: true,
      photoLeftOut: { reason: 'identifies_a_child' },
      omissions: [{ field: 'body', start: at('दो'), end: at('दो') + 2, reason: 'attacks_someone_named' }],
    })
    renderIn(MemorialOutcomeScreen, 'hi')
    const photo = screen.getByTestId('memorial-photo-left-out')
    expect(photo).toHaveTextContent(`${tr('outcome.photo_left_out', 'hi')} ${tr('outcome.reason', 'hi', { reason: tr('reason.identifies_a_child', 'hi') })}`)
    expect(photo).not.toHaveTextContent(tr('reason.attacks_someone_named', 'hi'))
    expect(screen.getByTestId('memorial-omitted-reason')).toHaveTextContent(tr('reason.attacks_someone_named', 'hi'))
    expect(screen.queryByTestId('memorial-alt-text-left-out')).toBeNull()
  })
})

describe('R13 — a family-authored segment cannot reorder the omission marker that follows it', () => {
  const RLO = cpoint(0x202e)
  const PDF = cpoint(0x202c)
  const FSI = cpoint(0x2068)
  const PDI = cpoint(0x2069)

  it('a HOSTILE segment is drawn inside its own isolate (the unterminated RLO is closed inside it); a plain one is untouched; the marker is outside', () => {
    const body = `पहला${RLO}अधूरा दूसरा तीसरा`
    const cut = body.indexOf('दूसरा')
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      omissions: [{ field: 'body', start: cut, end: cut + 'दूसरा'.length, reason: 'against_the_law' }],
    })
    renderIn(MemorialOutcomeScreen, 'en')
    const reason = screen.getByTestId('memorial-omitted-reason')
    const marker = reason.previousElementSibling!
    const before = marker.previousElementSibling!
    const after = reason.nextElementSibling!
    expect(marker.textContent).toBe(tr('render.omitted', 'en')) // the marker carries no control of the family's
    expect(before.textContent).toBe(`${FSI}पहला${RLO}अधूरा ${PDF}${PDI}`)
    expect(after.textContent).toBe(' तीसरा') // plain ⇒ exactly the stored slice, no invisible control added
    // The family's own characters are untouched: removing the added controls gives back the stored slice.
    expect(before.textContent!.replace(new RegExp(`[${FSI}${PDI}${PDF}]`, 'gu'), '')).toBe(body.slice(0, cut))
    // The marker and its reason sit OUTSIDE every isolate: nothing the family typed can reach them.
    expect(marker.textContent).not.toMatch(new RegExp(`[${FSI}${PDI}${PDF}${RLO}]`, 'u'))
    expect(reason.textContent).not.toMatch(new RegExp(`[${FSI}${PDI}${PDF}${RLO}]`, 'u'))
  })

  it('plain Hindi on the outcome carries NO invisible control at all', () => {
    const body = 'एक दो तीन चार'
    const cut = body.indexOf('दो')
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      omissions: [{ field: 'body', start: cut, end: cut + 2, reason: 'against_the_law' }],
    })
    renderIn(MemorialOutcomeScreen, 'hi')
    const text = screen.getByTestId('memorial-outcome-text').textContent!
    expect(text).not.toMatch(new RegExp(`[${FSI}${PDI}${PDF}${RLO}]`, 'u'))
    expect(text).toContain('एक ')
    expect(text).toContain(' तीन चार')
  })

  it('the preview isolates a hostile segment too (preview == outcome), and leaves plain text alone', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: `ab${RLO}cd` })
    renderIn(MemorialPreviewScreen, 'en')
    expect(screen.getByTestId('memorial-preview-text')).toHaveTextContent(`${FSI}ab${RLO}cd${PDF}${PDI}`)
    cleanup()
    saveMemorialDraft('m-1', 'pool-1', { body: 'सादा पाठ' })
    renderIn(MemorialPreviewScreen, 'en')
    expect(screen.getByTestId('memorial-preview-text').textContent).toBe('सादा पाठ')
  })
})

// ─── R16 — Task 6.7 (AC13) legs ────────────────────────────────────────────────────────────────────────────────────────

describe('R16 / AC13 — labels, 44pt targets, the refusal linked to its field, reading order', () => {
  const buttons = (): HTMLButtonElement[] => Array.from(document.querySelectorAll('button'))
  const expectAll44 = (what: string) => {
    expect(buttons().length, what).toBeGreaterThan(1)
    for (const b of buttons()) expect(b.getAttribute('data-minheight'), `${what}: "${b.textContent}"`).toBe('44')
  }

  it('EVERY Input on the screens has a label — the handover-code field included (hi and en)', async () => {
    for (const locale of ALL_LOCALES) {
      mock.inputs.length = 0
      saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', photoFileName: 'p.jpg', photoMime: 'image/jpeg' })
      mock.files.add('file:///docs/p.jpg')
      mock.view = view({ memorialState: 'approved', submissionId: 's-1', body: 'x', hasPhoto: true, canSend: true })
      mock.send.mockRejectedValue(stepUp())
      mock.otp.masked = '+91·····3210'
      for (const Screen of [MemorialWriteScreen, MemorialPhotoScreen]) {
        renderIn(Screen, locale)
        cleanup()
      }
      renderIn(MemorialPreviewScreen, locale)
      fireEvent.click(screen.getByTestId('memorial-send'))
      await settle()
      cleanup()
      const labelled = new Map(mock.inputs.map((p) => [String(p.testID), String(p.accessibilityLabel ?? '')]))
      expect([...labelled.keys()].sort()).toEqual(['memorial-alt-text', 'memorial-body', 'memorial-handover-code'])
      expect(labelled.get('memorial-handover-code')).toBe(tr('handover.code_label', locale))
      expect(labelled.get('memorial-body')).toBe(tr('write.label', locale))
      expect(labelled.get('memorial-alt-text')).toBe(tr('photo.alt_label', locale))
      for (const [id, label] of labelled) expect(label.length, id).toBeGreaterThan(0)
    }
  })

  it('every Button on ALL five screens is a 44pt target — not only the intro\'s two', async () => {
    // intro: no draft · a draft · something sent before
    renderIn(MemorialIntroScreen)
    expectAll44('intro')
    cleanup()
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    renderIn(MemorialIntroScreen)
    expectAll44('intro with a draft')
    cleanup()
    mock.store.clear()
    mock.view = view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: 'पहले', hasPhoto: true, canSend: true })
    renderIn(MemorialIntroScreen)
    expectAll44('intro, sent before')
    cleanup()
    // write: with "Start from what I sent"
    renderIn(MemorialWriteScreen)
    expect(screen.getByText(tr('write.start_from_sent', 'hi'))).toBeInTheDocument()
    expectAll44('write')
    cleanup()
    // photo: choose · use previous · without · next, with a picked photo
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg' })
    renderIn(MemorialPhotoScreen)
    expect(screen.getByTestId('memorial-use-previous-photo')).toBeInTheDocument()
    expectAll44('photo')
    cleanup()
    // preview: change words · change photo · send · the code panel's Confirm · the refusal
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockRejectedValue(stepUp())
    mock.otp.masked = '+91·····3210'
    renderIn(MemorialPreviewScreen)
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-handover-confirm')).toBeInTheDocument()
    expectAll44('preview + code panel')
    cleanup()
    // outcome: withdraw · write again
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true, canSend: true })
    renderIn(MemorialOutcomeScreen)
    expect(screen.getByTestId('memorial-withdraw')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-write-again')).toBeInTheDocument()
    expectAll44('outcome')
    cleanup()
    // the missing-view screen: retry
    mock.viewState = 'error'
    renderIn(MemorialOutcomeScreen)
    expect(screen.getByTestId('memorial-view-missing-retry')).toBeInTheDocument()
    expectAll44('view missing')
  })

  // AC7 / AC13: an error is "aria-linked" to its field. React Native has no `aria-describedby`; the repo's way to LINK a
  // message to its field is the field's own `accessibilityHint`. Three errors share a SCREEN with their field: the nominee's
  // code ("that code did not match"), and — T8 — the two over-limit lines (the words, the photo description). The Send
  // refusals (blank words, a too-long alt text …) appear on the PREVIEW, a different screen from the box they are about.
  it('the code refusal AND the over-limit errors are linked to their fields (each box\'s hint reads its error)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockRejectedValue(stepUp())
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(false)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    typeCode('9')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(lastInput('memorial-handover-code').accessibilityHint).toBe(tr('handover.not_verified', 'en'))
    cleanup()

    // the words: under the limit the hint is the plain hint; over it, the over-limit error is read first
    renderIn(MemorialWriteScreen, 'en')
    expect(lastInput('memorial-body').accessibilityHint).toBe(tr('write.hint', 'en'))
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'क'.repeat(6002) } })
    const over = tr('write.over_limit', 'en', { count: '2' })
    expect(screen.getByTestId('memorial-body-counter')).toHaveTextContent(over)
    expect(String(lastInput('memorial-body').accessibilityHint)).toContain(over)
    expect(String(lastInput('memorial-body').accessibilityHint).startsWith(over)).toBe(true)
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'क' } })
    expect(lastInput('memorial-body').accessibilityHint).toBe(tr('write.hint', 'en'))
    cleanup()

    // the photo description
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'विवरण' })
    renderIn(MemorialPhotoScreen, 'en')
    expect(lastInput('memorial-alt-text').accessibilityHint).toBe(tr('photo.alt_hint', 'en'))
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'क'.repeat(304) } })
    const altOver = tr('photo.alt_over_limit', 'en', { count: '4' })
    expect(screen.getByTestId('memorial-alt-counter')).toHaveTextContent(altOver)
    expect(String(lastInput('memorial-alt-text').accessibilityHint).startsWith(altOver)).toBe(true)
    cleanup()

    // and the write / photo screens still never render a SEND refusal (that one lives on the preview)
    for (const Screen of [MemorialWriteScreen, MemorialPhotoScreen]) {
      renderIn(Screen, 'en')
      expect(screen.queryByTestId('memorial-refusal')).toBeNull()
      cleanup()
    }
  })

  it('every screen starts with the header — "Save and come back" is the first thing reached', () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    for (const Screen of [MemorialIntroScreen, MemorialWriteScreen, MemorialPhotoScreen, MemorialPreviewScreen, MemorialOutcomeScreen]) {
      renderIn(Screen, 'en')
      expect(buttons()[0]).toHaveTextContent(tr('header.save_and_come_back', 'en'))
      expect(screen.getByTestId('memorial-header')).toContainElement(buttons()[0]!)
      cleanup()
    }
  })

  it('reading order = DOM order: write · photo · preview · outcome', async () => {
    const en = (k: string) => screen.getByText(tr(k, 'en'))
    // write
    renderIn(MemorialWriteScreen, 'en')
    let chain: Element[] = [screen.getByTestId('memorial-header'), en('write.title'), en('write.label'), en('write.hint'), screen.getByTestId('memorial-body'), en('write.next')]
    chain.slice(1).forEach((el, i) => expect(follows(chain[i]!, el), `write ${i}`).toBe(true))
    cleanup()
    // photo (with a photo: choose · use previous · alt text · without · next)
    mock.files.add('file:///docs/p.jpg')
    mock.view = view({ memorialState: 'approved', submissionId: 's-1', body: 'x', hasPhoto: true, canSend: true })
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg' })
    renderIn(MemorialPhotoScreen, 'en')
    chain = [screen.getByTestId('memorial-header'), en('photo.title'), en('photo.body'), en('photo.choose_other'), en('photo.use_previous'), screen.getByTestId('memorial-alt-text'), en('photo.without'), en('photo.next')]
    chain.slice(1).forEach((el, i) => expect(follows(chain[i]!, el), `photo ${i}`).toBe(true))
    cleanup()
    // preview, with a refusal showing
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    chain = [
      screen.getByTestId('memorial-header'),
      screen.getByTestId('memorial-before-publish'),
      en('preview.title'),
      screen.getByTestId('memorial-preview-text'),
      en('preview.change_words'),
      en('preview.change_photo'),
      screen.getByTestId('memorial-refusal'),
      screen.getByTestId('memorial-permission'),
      screen.getByTestId('memorial-send'),
    ]
    chain.slice(1).forEach((el, i) => expect(follows(chain[i]!, el), `preview ${i}`).toBe(true))
    cleanup()
    // outcome (with the Trust)
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true, canSend: true })
    renderIn(MemorialOutcomeScreen, 'en')
    chain = [
      screen.getByTestId('memorial-header'),
      en('outcome.title'),
      en('outcome.with_the_trust'),
      screen.getByTestId('memorial-withdraw'),
      en('outcome.replace_note'),
      screen.getByTestId('memorial-write-again'),
      en('outcome.helpline'),
      screen.getByTestId('helpline-cta'),
    ]
    chain.slice(1).forEach((el, i) => expect(follows(chain[i]!, el), `outcome ${i}`).toBe(true))
  })
})

// ─── R16 / Y — AC3 orchestration: the kept key, with ⛔ no clock and ⛔ no refetch before a Send ──────────────────────────

describe('AC3 / Y — the kept key: minted when a Send starts with none, kept until ANY 2xx, dropped ONLY by an edit', () => {
  beforeEach(() => {
    mock.view = view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: 'पुराने शब्द', canSend: true })
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द' })
  })

  it('the first press mints the key with the latest submission id shown, and the Send carries it — ⛔ no refetch of the view first', async () => {
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.fetchView).not.toHaveBeenCalled()
    expect(mock.send).toHaveBeenCalledTimes(1)
    expect(sentKey(0)).toMatch(/\S/)
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({}) // the 2xx cleared the draft (and the key with it)
  })

  it.each([
    ['a network error (NO answer)', () => new Error('network down'), 'send.try_again'],
    ['409 memorial.idempotency_in_progress (an OLDER server — defensive)', () => new ApiError(409, 'memorial.idempotency_in_progress', 'x'), 'send.try_again'],
    ['409 memorial.try_again', () => new ApiError(409, 'memorial.try_again', 'x'), 'send.try_again'],
    ['500 memorial.something_else (Z4 (a): no proof — "try again")', () => new ApiError(500, 'memorial.something_else', 'x'), 'send.try_again'],
    ['422 memorial.something_else', () => new ApiError(422, 'memorial.something_else', 'x'), 'send.generic'],
  ] as const)('%s ⇒ the key is KEPT, the family is told, the button is free; the next press goes under the SAME key, and its 200 replay lands', async (_name, failure, shownKey) => {
    mock.send.mockRejectedValueOnce(failure()).mockResolvedValueOnce(SENT_OK) // the server's 200 replay of the first result
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr(shownKey, 'en'))
    expect(screen.getByTestId('memorial-send')).not.toBeDisabled()
    expect(screen.getByTestId('memorial-send')).toHaveTextContent(tr('preview.send', 'en'))
    expect(loadMemorialDraft('m-1', 'pool-1').pending?.idempotencyKey).toBe(sentKey(0)) // ⛔ never dropped on a refusal
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('नए शब्द') // a refusal never clears the draft
    expect(mock.replace).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.send).toHaveBeenCalledTimes(2)
    expect(sentKey(1)).toBe(sentKey(0)) // the same key: a replay or the landing, never a second version
    expect(mock.fetchView).not.toHaveBeenCalled()
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('a key KEPT by an older build (with mint / post times, of any age) is reused as it is — ⛔ no landed check, ⛔ no refetch', async () => {
    saveMemorialDraft('m-1', 'pool-1', {
      pending: { idempotencyKey: 'k-old', latestSubmissionIdAtSend: 's-1', mintedAt: 1, firstPostedAt: 2, lastPostedAt: 3 } as never,
    })
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.fetchView).not.toHaveBeenCalled()
    expect(sentKey(0)).toBe('k-old')
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('an EDIT between two Sends mints a NEW key (R6), so the edited words are sent as a new version — through the screens', async () => {
    mock.send.mockRejectedValueOnce(new ApiError(500, 'memorial.something_else', 'x')).mockResolvedValueOnce(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    cleanup()
    renderIn(MemorialWriteScreen, 'en')
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'नए शब्द, और कुछ' } })
    cleanup()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(sentKey(1)).not.toBe(sentKey(0))
    expect((mock.send.mock.calls[1]![0] as FormData).get('body')).toBe('नए शब्द, और कुछ')
  })

  it('NO edit between two Sends on a NEW screen (the app was closed, reopened) ⇒ the SAME key', async () => {
    mock.send.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    cleanup()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(sentKey(1)).toBe(sentKey(0))
  })
})

describe('AC3 / Z2 — the intro: the latest version carries the KEPT key ⇒ the Send landed, straight to the outcome', () => {
  it('clears the draft and replaces the route with the outcome', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', pending: { idempotencyKey: 'k-1' } })
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', idempotencyKey: 'k-1', body: 'शब्द', canWithdraw: true })
    renderIn(MemorialIntroScreen, 'en')
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
  })

  it.each([
    ['another Send\'s key', 'k-earlier'],
    ['no key (a version from before 0183)', null],
  ] as const)('a kept key and a latest version with %s ⇒ no redirect: resume / start again, and the draft stays', (_name, latestKey) => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', pending: { idempotencyKey: 'k-1' } })
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', idempotencyKey: latestKey, body: 'पहले', canWithdraw: true })
    renderIn(MemorialIntroScreen, 'en')
    expect(mock.replace).not.toHaveBeenCalled()
    expect(screen.getByText(tr('draft.resume', 'en'))).toBeInTheDocument()
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('शब्द')
  })

  it('an OLDER build\'s record (a submission id beside the key) is read tolerantly: only the key decides', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', pending: { idempotencyKey: 'k-1', latestSubmissionIdAtSend: 's-0' } as never })
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', idempotencyKey: 'k-earlier', body: 'पहले', canWithdraw: true })
    renderIn(MemorialIntroScreen, 'en')
    expect(mock.replace).not.toHaveBeenCalled() // the submission id moved on ('s-0' → 's-1'), but it is not THIS Send
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('शब्द')
  })

  // Z2 — the bug the key comparison closes: the id recorded beside the key came from a STALE cached view, so an EARLIER
  // version (sent before, not seen by this phone's cache) read as "this Send landed" and the edited, unsent words were cleared.
  it('a STALE view + a lost answer + an EDIT, then a resume ⇒ the edited draft SURVIVES (an earlier version is not this Send)', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', idempotencyKey: 'k-s1', body: 'पहले', canWithdraw: true, canSend: true }) // stale
    saveMemorialDraft('m-1', 'pool-1', { body: 'पहले शब्द' })
    mock.send.mockRejectedValueOnce(new Error('network down')) // the server COMMITTED this one as 's-2' — the answer was lost
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    const committedKey = sentKey(0)
    saveMemorialDraft('m-1', 'pool-1', { body: 'बदले हुए शब्द' }) // an edit: the key is dropped (R6)
    mock.send.mockRejectedValueOnce(new Error('network down')) // the edited words never reach the server
    fireEvent.click(screen.getByTestId('memorial-send')) // the cached view is still the stale one ('s-1')
    await settle()
    expect(sentKey(1)).not.toBe(committedKey)
    cleanup()
    // Resume: the fresh view's latest version is 's-2' — the FIRST Send, under the first key.
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-2', idempotencyKey: committedKey, body: 'पहले शब्द', canWithdraw: true, canSend: true })
    renderIn(MemorialIntroScreen, 'en')
    expect(mock.replace).not.toHaveBeenCalled()
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('बदले हुए शब्द')
    expect(screen.getByText(tr('draft.resume', 'en'))).toBeInTheDocument()
  })

  it('…and when the latest version carries the key KEPT for the edited words, it landed: cleared, to the outcome', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'बदले हुए शब्द' })
    mock.send.mockRejectedValueOnce(new Error('network down')) // committed, the answer lost
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    cleanup()
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-3', idempotencyKey: sentKey(0), body: 'बदले हुए शब्द', canWithdraw: true })
    renderIn(MemorialIntroScreen, 'en')
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
  })

  it('no kept key ⇒ no redirect either (the draft alone proves nothing)', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'पहले', canWithdraw: true })
    renderIn(MemorialIntroScreen, 'en')
    expect(mock.replace).not.toHaveBeenCalled()
  })
})

// ─── R16 — the Withdraw button flow ────────────────────────────────────────────────────────────────────────────────────

describe('AC8 — Withdraw while with the Trust', () => {
  beforeEach(() => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true, canSend: true })
  })

  it('pressing Withdraw withdraws THIS submission and refetches the outcome — no code asked while the elevation holds', async () => {
    mock.withdraw.mockResolvedValue({ memorialState: 'withdrawn' })
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(mock.withdraw).toHaveBeenCalledWith('s-1')
    expect(mock.invalidate).toHaveBeenCalled()
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
    expect(mock.otpSend).not.toHaveBeenCalled()
  })

  it('a 403 asks the NOMINEE\'s code (once), and after the verified code Withdraw is retried and goes through', async () => {
    mock.withdraw.mockRejectedValueOnce(stepUp()).mockResolvedValueOnce({ memorialState: 'withdrawn' })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    typeCode('123456')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(mock.withdraw).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
  })

  it('memorial.not_withdrawable (the Trust decided meanwhile) ⇒ the outcome is refetched QUIETLY — no notice', async () => {
    mock.withdraw.mockRejectedValue(new ApiError(409, 'memorial.not_withdrawable', 'x'))
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(mock.invalidate).toHaveBeenCalled()
    expect(screen.queryByTestId('memorial-notice')).toBeNull()
    expect(announced()).toEqual([])
  })

  it('any other refusal ⇒ the gentle generic line, and the outcome is refetched', async () => {
    mock.withdraw.mockRejectedValue(new ApiError(500, 'memorial.something_else', 'x'))
    renderIn(MemorialOutcomeScreen, 'hi')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(screen.getByTestId('memorial-notice')).toHaveTextContent(tr('outcome.withdraw_failed', 'hi'))
    expect(mock.invalidate).toHaveBeenCalled()
  })
})

// ─── R20 — a missing view is never a blank screen; the saved draft is loaded in an effect ────────────────────────────

describe('R20 — no view ⇒ the header, a gentle line, a retry and the helpline (never a blank screen)', () => {
  const SCREENS = [
    ['intro', MemorialIntroScreen],
    ['write', MemorialWriteScreen],
    ['photo', MemorialPhotoScreen],
    ['preview', MemorialPreviewScreen],
    ['outcome', MemorialOutcomeScreen],
  ] as const
  const CASES = SCREENS.flatMap(([name, Screen]) => ALL_LOCALES.map((locale) => [name, locale, Screen] as const))

  // The OUTCOME screen has its own line: after a Send the draft is cleared and the words are with the Trust, so "what you
  // have written is safe on this phone" would be untrue there. The writing screens keep the draft-safety line.
  // The intro joins the outcome (P3): it cannot know whether a draft is on the phone — its key needs the view that failed.
  const bodyKey = (name: string) => (name === 'outcome' || name === 'intro' ? 'view_missing.body_outcome' : 'view_missing.body')

  it.each(CASES)('%s / %s — the GET failed', (name, locale, Screen) => {
    mock.viewState = 'error'
    const { container } = renderIn(Screen, locale)
    expect(container.textContent).not.toBe('')
    expect(screen.getByTestId('memorial-header')).toHaveTextContent(tr('header.save_and_come_back', locale))
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveTextContent(tr(bodyKey(name), locale))
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveAttribute('aria-live', 'assertive') // an error: the plan says assertive
    expect(screen.getByTestId('helpline-cta')).toBeInTheDocument()
    expect(announced()).toContain(tr(bodyKey(name), locale)) // iOS is told; Android has the live region
    fireEvent.click(screen.getByTestId('memorial-view-missing-retry'))
    expect(screen.getByTestId('memorial-view-missing-retry')).toHaveTextContent(tr('view_missing.retry', locale))
    expect(mock.refetch).toHaveBeenCalledTimes(1)
  })

  it.each(CASES)('%s / %s — { memorial: null } (no drive)', (name, locale, Screen) => {
    mock.view = null
    renderIn(Screen, locale)
    expect(screen.getByTestId('memorial-header')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveTextContent(tr(bodyKey(name), locale))
    expect(screen.getByTestId('memorial-view-missing-retry')).toBeInTheDocument()
    expect(screen.getByTestId('helpline-cta')).toBeInTheDocument()
  })

  it.each(CASES)('%s / %s — still loading: the header, a calm line, the helpline; no retry yet', (_name, locale, Screen) => {
    mock.viewState = 'loading'
    renderIn(Screen, locale)
    expect(screen.getByTestId('memorial-header')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveTextContent(tr('view_missing.loading', locale))
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveAttribute('aria-live', 'polite') // a status, not an error
    expect(screen.queryByTestId('memorial-view-missing-retry')).toBeNull()
    expect(screen.getByTestId('helpline-cta')).toBeInTheDocument()
    expect(announced()).toEqual([])
  })

  // The phone-safety wording of the draft-safety sentence (`view_missing.body`) — en and hi. The regexes must MATCH it (else
  // the negative assertions below could never fail), and must match NOTHING in the lines that make no claim.
  const PHONE_CLAIM: Record<Locale, RegExp[]> = {
    en: [/safe on this phone/i, /\bsafe\b/i, /\bwritten\b/i],
    hi: [/सुरक्षित/, /इस फ़ोन पर/, /लिखा हुआ/],
  }

  it.each(ALL_LOCALES)('%s: the lines without a draft claim contain NONE of the phone-safety wording; the writing line contains it', (locale) => {
    const writing = tr('view_missing.body', locale)
    for (const re of PHONE_CLAIM[locale]) expect(writing, `teeth: ${re}`).toMatch(re)
    for (const key of ['view_missing.body_outcome', 'outcome.withdraw_failed']) {
      const line = tr(key, locale)
      for (const re of PHONE_CLAIM[locale]) expect(line, `${key} vs ${re}`).not.toMatch(re)
    }
    expect(tr('view_missing.body_outcome', locale)).not.toBe(writing)
  })

  it.each(ALL_LOCALES)('%s: rendered, the OUTCOME and the INTRO make no claim about the phone; write, photo and preview do', (locale) => {
    mock.viewState = 'error'
    for (const Screen of [MemorialOutcomeScreen, MemorialIntroScreen]) {
      renderIn(Screen, locale)
      const line = screen.getByTestId('memorial-view-missing-line').textContent!
      for (const re of PHONE_CLAIM[locale]) expect(line, String(re)).not.toMatch(re)
      cleanup()
    }
    for (const Screen of [MemorialWriteScreen, MemorialPhotoScreen, MemorialPreviewScreen]) {
      renderIn(Screen, locale)
      const line = screen.getByTestId('memorial-view-missing-line').textContent!
      for (const re of PHONE_CLAIM[locale]) expect(line, String(re)).toMatch(re)
      cleanup()
    }
  })

  it('a signed-out session is not a blank screen either', () => {
    mock.session = null
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.getByTestId('memorial-view-missing-line')).toBeInTheDocument()
  })

  it('the Save-and-come-back header is still the way out of the error state', () => {
    mock.viewState = 'error'
    renderIn(MemorialWriteScreen, 'en')
    fireEvent.click(screen.getByText(tr('header.save_and_come_back', 'en')))
    expect(mock.replace).toHaveBeenCalledWith('/(tabs)')
  })
})

describe('R20 — the saved draft is loaded in an EFFECT once the view and the member are known', () => {
  it('write: a cold mount shows no box until the view arrives, then the SAVED words — and the saved draft is never overwritten on the way', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'सहेजे हुए शब्द' })
    mock.viewState = 'loading'
    const r = renderIn(MemorialWriteScreen, 'en')
    expect(screen.queryByTestId('memorial-body')).toBeNull() // nothing to type into before the draft is read
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('सहेजे हुए शब्द')
    mock.viewState = 'data'
    rerenderIn(r, MemorialWriteScreen, 'en')
    expect(screen.getByTestId('memorial-body')).toHaveValue('सहेजे हुए शब्द')
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('सहेजे हुए शब्द')
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'सहेजे हुए शब्द, और' } })
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('सहेजे हुए शब्द, और')
  })

  it('write: normal navigation (the view is already there) also shows the saved words', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'सहेजे हुए शब्द' })
    renderIn(MemorialWriteScreen, 'en')
    expect(screen.getByTestId('memorial-body')).toHaveValue('सहेजे हुए शब्द')
  })

  it('write: the box is disabled before the draft has been read (a keystroke cannot beat the load)', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'सहेजे हुए शब्द' })
    renderIn(MemorialWriteScreen, 'en')
    const disabled = mock.inputs.filter((p) => p.testID === 'memorial-body').map((p) => p.disabled)
    expect(disabled[0]).toBe(true) // the first render, before the effect has read the draft
    expect(disabled[disabled.length - 1]).toBe(false)
  })

  it('photo: a cold mount brings back the picked photo and the alt text once the view arrives', () => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'सहेजा विवरण' })
    mock.viewState = 'loading'
    const r = renderIn(MemorialPhotoScreen, 'en')
    expect(screen.queryByTestId('memorial-alt-text')).toBeNull()
    mock.viewState = 'data'
    rerenderIn(r, MemorialPhotoScreen, 'en')
    expect(screen.getByTestId('memorial-alt-text')).toHaveValue('सहेजा विवरण')
    expect(screen.getByLabelText(tr('photo.chosen_a11y', 'en'))).toBeInTheDocument()
    expect(screen.getByLabelText(tr('photo.chosen_a11y', 'en'))).toHaveAttribute('data-accessible', 'true')
  })
})

describe('AC12 — the new copy through the REAL t(), hi and en', () => {
  it.each(ALL_LOCALES)('%s: every key added by the review fixes resolves, interpolates and is not a bare key', (locale) => {
    for (const key of ['view_missing.loading', 'view_missing.body', 'view_missing.body_outcome', 'view_missing.retry', 'photo.kept_note', 'photo.kept_a11y', 'outcome.alt_text_left_out', 'outcome.earlier_approval_stands', 'outcome.earlier_approval_stands_helpline_only', 'handover.resend', 'handover.resend_note']) {
      const value = tr(key, locale)
      expect(value.length, key).toBeGreaterThan(3)
      expect(value, key).not.toBe(key)
      expect(value).not.toMatch(/\{[a-z_]+\}/) // no unresolved placeholder
    }
    expect(tr('outcome.reason', locale, { reason: tr('reason.against_the_law', locale) })).toContain(tr('reason.against_the_law', locale))
  })
})

// ─── Fix-round follow-ups ──────────────────────────────────────────────────────────────────────────────────────────────

describe('the kept photo: a failed URL does not poison a FRESH one', () => {
  const sentBefore = (photoUrl: string) =>
    view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: 'पहले', hasPhoto: true, photoUrl, canSend: true })

  it('a signed URL that lapsed shows the plain line; the refetched fresh URL shows the PICTURE again', () => {
    mock.view = sentBefore('https://signed.example/old.jpg?sig=1')
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', altText: 'विवरण', keepPreviousPhoto: true })
    const r = renderIn(MemorialPreviewScreen, 'en')
    const kept = () => screen.getByTestId('memorial-kept-photo')
    expect(kept().querySelector('img')).toHaveAttribute('src', 'https://signed.example/old.jpg?sig=1')
    // The URL expired (300 s) while the family was elsewhere: the image answers 403 → onError.
    fireEvent.error(kept().querySelector('img')!)
    expect(kept().querySelector('img')).toBeNull()
    expect(kept()).toHaveTextContent(tr('photo.kept_note', 'en')) // the plain line, never an empty gap
    // The view is refetched (a fresh signed URL): the picture comes back.
    mock.view = sentBefore('https://signed.example/old.jpg?sig=2')
    rerenderIn(r, MemorialPreviewScreen, 'en')
    expect(kept().querySelector('img')).toHaveAttribute('src', 'https://signed.example/old.jpg?sig=2')
    expect(kept().querySelector('img')).toHaveAttribute('data-accessible', 'true')
  })

  it('the same on the photo screen', () => {
    mock.view = sentBefore('https://signed.example/a.jpg')
    saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true })
    const r = renderIn(MemorialPhotoScreen, 'en')
    fireEvent.error(screen.getByTestId('memorial-kept-photo').querySelector('img')!)
    expect(screen.getByTestId('memorial-kept-photo').querySelector('img')).toBeNull()
    mock.view = sentBefore('https://signed.example/b.jpg')
    rerenderIn(r, MemorialPhotoScreen, 'en')
    expect(screen.getByTestId('memorial-kept-photo').querySelector('img')).toHaveAttribute('src', 'https://signed.example/b.jpg')
  })
})

describe('the photo screen shows what the Send will carry (keepPreviousPhoto wins over a stale picked file)', () => {
  it('a draft with BOTH a picked file and keepPreviousPhoto (an older build) renders ONE image — the kept one — and no "photo missing" line', () => {
    mock.view = view({ memorialState: 'approved', submissionId: 's-1', body: 'x', hasPhoto: true, photoUrl: 'https://signed.example/earlier.jpg', canSend: true })
    mock.files.add('file:///docs/picked.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'picked.jpg', photoMime: 'image/jpeg', altText: 'विवरण', keepPreviousPhoto: true })
    renderIn(MemorialPhotoScreen, 'en')
    const imgs = screen.getAllByTestId('img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute('src', 'https://signed.example/earlier.jpg')
    expect(screen.queryByLabelText(tr('photo.chosen_a11y', 'en'))).toBeNull()
    expect(screen.getByText(tr('photo.choose', 'en'))).toBeInTheDocument() // not "choose a different photo": nothing is picked
  })

  it('…and when that stale file is also gone, the "photo missing" line stays away (the kept photo is what counts)', () => {
    mock.view = view({ memorialState: 'approved', submissionId: 's-1', body: 'x', hasPhoto: true, photoUrl: null, canSend: true })
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'gone.jpg', photoMime: 'image/jpeg', keepPreviousPhoto: true })
    renderIn(MemorialPhotoScreen, 'en')
    expect(document.body.textContent).not.toContain(tr('draft.photo_missing', 'en'))
    expect(screen.getByTestId('memorial-kept-photo')).toHaveTextContent(tr('photo.kept_note', 'en'))
  })
})

describe('the preview: "Change the words" / "Change the photo" are off while a Send is in flight', () => {
  it('both buttons are disabled while sending (an edit cannot drop the key mid-request), and a click does nothing', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    let release!: (v: unknown) => void
    mock.send.mockReturnValue(new Promise((resolve) => (release = resolve)))
    renderIn(MemorialPreviewScreen, 'en')
    const words = () => screen.getByText(tr('preview.change_words', 'en'))
    const photo = () => screen.getByText(tr('preview.change_photo', 'en'))
    expect(words()).not.toBeDisabled() // not busy: the family may still change things
    fireEvent.click(words())
    expect(mock.push).toHaveBeenCalledWith('/(memorial)/write')
    mock.push.mockReset()

    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-send')).toBeDisabled()
    expect(words()).toBeDisabled()
    expect(photo()).toBeDisabled()
    fireEvent.click(words())
    fireEvent.click(photo())
    expect(mock.push).not.toHaveBeenCalled()
    expect(loadMemorialDraft('m-1', 'pool-1').pending).toBeDefined() // the key is still the one in flight

    release(SENT_OK)
    await settle()
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('they are enabled again after a refusal (the family can change things and try again)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByText(tr('preview.change_words', 'en'))).not.toBeDisabled()
    expect(screen.getByText(tr('preview.change_photo', 'en'))).not.toBeDisabled()
  })
})

describe('copy: the earlier approval "stands" in Hindi too', () => {
  it('hi says the earlier version is still APPROVED (स्वीकृत), not merely "still the same"', () => {
    const hi = tr('outcome.earlier_approval_stands', 'hi')
    expect(hi).toContain('स्वीकृत')
    expect(hi).not.toContain('वैसा ही')
    expect(hi).toContain('हेल्पलाइन')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Last review pass (P1–P9)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

const blurScreens = () =>
  act(() => {
    for (const h of mock.focus.handlers) {
      h.cleanup?.()
      h.cleanup = undefined
    }
  })
const focusScreens = () =>
  act(() => {
    for (const h of mock.focus.handlers) h.cleanup = h.cb()
  })
/** A Send whose request the test resolves or rejects BY HAND (the request is "in flight" until then). */
const deferredSend = () => {
  let resolve!: (v: unknown) => void
  let reject!: (e: unknown) => void
  mock.send.mockReturnValue(
    new Promise((res, rej) => {
      resolve = res
      reject = rej
    }),
  )
  return { resolve, reject }
}

// ─── P1 — a Send in flight is tied to its screen ────────────────────────────────────────────────────────────────────────

describe('P1 — a Send in flight is tied to its screen', () => {
  const OLD = 'पुराने शब्द'
  beforeEach(() => {
    saveMemorialDraft('m-1', 'pool-1', { body: OLD })
  })

  it('(a)(b) the screen is left, the family writes something NEWER, then the 2xx arrives: the newer draft and its photo copy SURVIVE, nothing navigates', async () => {
    const send = deferredSend()
    const r = renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1').pending).toBeDefined()
    r.unmount() // "Save and come back" replaces the route: the Preview is gone, the POST carries on
    mock.files.add('file:///docs/new.jpg')
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द', photoFileName: 'new.jpg', photoMime: 'image/jpeg' })
    expect(loadMemorialDraft('m-1', 'pool-1').pending).toBeUndefined() // the edit dropped the kept key (R6)
    send.resolve(SENT_OK)
    await settle()
    const draft = loadMemorialDraft('m-1', 'pool-1')
    expect(draft.body).toBe('नए शब्द')
    expect(draft.photoFileName).toBe('new.jpg')
    expect(mock.files.has('file:///docs/new.jpg')).toBe(true) // the newer draft's photo copy is not deleted
    expect(mock.replace).not.toHaveBeenCalled()
    expect(mock.invalidate).toHaveBeenCalled() // the view is still refreshed: a version exists now
  })

  it('(a) the same with the Preview still mounted but BEHIND another screen (blurred): the newer draft survives, no navigation — not even when it comes back to the front', async () => {
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    await blurScreens()
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द' })
    send.resolve(SENT_OK)
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('नए शब्द')
    await focusScreens()
    expect(mock.replace).not.toHaveBeenCalled()
  })

  it('(a) even on the screen that is still in FRONT: a draft that changed during the request is kept, and nobody is sent to the outcome over their newer words', async () => {
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द' })
    send.resolve(SENT_OK)
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('नए शब्द')
    expect(mock.replace).not.toHaveBeenCalled()
  })

  it('an UNCHANGED draft and a 2xx on the screen that is still in front: the draft is cleared and the family goes to the outcome', async () => {
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.replace).not.toHaveBeenCalled()
    send.resolve(SENT_OK)
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
    expect(mock.replace).toHaveBeenCalledTimes(1)
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('(b) an unchanged draft but the screen is BEHIND another one: the Send is recorded (draft cleared) and nobody is yanked to the outcome', async () => {
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    await blurScreens()
    send.resolve(SENT_OK)
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
    expect(mock.replace).not.toHaveBeenCalled()
  })

  it('(b) a promise that resolves — or is refused — AFTER the screen is gone is safe: no throw, no navigation', async () => {
    const ok = deferredSend()
    const a = renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    a.unmount()
    ok.resolve(SENT_OK)
    await settle()
    expect(mock.replace).not.toHaveBeenCalled()
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({}) // nothing newer ⇒ the sent draft is cleared

    saveMemorialDraft('m-1', 'pool-1', { body: OLD })
    const refused = deferredSend()
    const b = renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    b.unmount()
    refused.reject(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    await settle()
    expect(mock.replace).not.toHaveBeenCalled()
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe(OLD) // a refusal never clears the draft
  })

  it('(c) Android back is consumed — and the iOS swipe-back gesture is off — ONLY while the request is in flight', async () => {
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    expect(mock.back.handlers).toHaveLength(0)
    expect(mock.navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true })
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.back.handlers).toHaveLength(1)
    expect(mock.back.handlers[0]!()).toBe(true) // consumed: the hardware back does nothing
    expect(mock.navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: false })
    send.resolve(SENT_OK)
    await settle()
    expect(mock.back.handlers).toHaveLength(0)
    expect(mock.navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true })
  })

  it('(c) not while the nominee\'s code is asked for, nor after a refusal (the family can go back to edit)', async () => {
    mock.otp.masked = '+91·····3210'
    mock.send.mockRejectedValueOnce(stepUp()).mockRejectedValueOnce(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(mock.back.handlers).toHaveLength(0)
    expect(mock.navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true })
    mock.otpVerify.mockResolvedValue(true)
    typeCode('1')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByTestId('memorial-refusal')).toBeInTheDocument()
    expect(mock.back.handlers).toHaveLength(0)
    expect(mock.navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true })
  })

  it('(d) 403 → the code is asked for → "Change the words" → edit → back: the Preview shows the EDITED words, and the Send sends them', async () => {
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.send.mockRejectedValueOnce(stepUp()).mockResolvedValueOnce(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-preview-text')).toHaveTextContent(OLD)
    // The edit buttons stay ON in this state (the family may need to change something before sending).
    expect(screen.getByText(tr('preview.change_words', 'en'))).not.toBeDisabled()
    fireEvent.click(screen.getByText(tr('preview.change_words', 'en')))
    expect(mock.push).toHaveBeenCalledWith('/(memorial)/write')
    // The Write screen saves the edit; the Preview, still mounted underneath, comes back into focus.
    saveMemorialDraft('m-1', 'pool-1', { body: 'बदले हुए शब्द' })
    await blurScreens()
    await focusScreens()
    expect(screen.getByTestId('memorial-preview-text')).toHaveTextContent('बदले हुए शब्द')
    expect(screen.getByTestId('memorial-preview-text')).not.toHaveTextContent(OLD)
    typeCode('123456')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect((mock.send.mock.calls[1]![0] as FormData).get('body')).toBe('बदले हुए शब्द') // shown == sent
  })
})

// ─── P2 — a failed Withdraw says nothing about "sending" or the phone ──────────────────────────────────────────────────

describe('P2 — a failed Withdraw: it is still with the Trust (no "sending", no phone claim)', () => {
  it.each(ALL_LOCALES)('%s: the notice is outcome.withdraw_failed — real t(), nothing about this phone', async (locale) => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true, canSend: true })
    mock.withdraw.mockRejectedValue(new ApiError(500, 'memorial.something_else', 'x'))
    renderIn(MemorialOutcomeScreen, locale)
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    const notice = screen.getByTestId('memorial-notice')
    expect(notice.textContent).toBe(tr('outcome.withdraw_failed', locale))
    expect(notice.textContent).not.toBe(tr('send.generic', locale))
    expect(notice.textContent).toMatch(locale === 'en' ? /still with the Trust/ : /ट्रस्ट के पास/)
    expect(notice.textContent).toMatch(locale === 'en' ? /helpline/i : /हेल्पलाइन/)
  })

  it('memorial.not_withdrawable stays a QUIET refetch (no notice at all)', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    mock.withdraw.mockRejectedValue(new ApiError(409, 'memorial.not_withdrawable', 'x'))
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(screen.queryByTestId('memorial-notice')).toBeNull()
  })
})

// ─── P4 (b) — the live-region values come from the PLAN, not from a literal on a screen ─────────────────────────────────

describe('P4 — every live region on the memorial screens takes the VALUE the announcement plan gives', () => {
  const liveValues = (): string[] => Array.from(document.querySelectorAll('[aria-live]')).map((e) => e.getAttribute('aria-live')!)

  beforeEach(() => {
    // Values that are NOT RN live-region words: a hard-coded "polite" / "assertive" on any screen cannot equal them.
    mock.planValues = { error: 'plan-error', status: 'plan-status' }
  })

  it('the Send refusal, the nominee-code lines (each of the four), and the missing-view lines', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-refusal')).toHaveAttribute('aria-live', 'plan-error')
    cleanup()

    // the code is asked for ⇒ a status; a wrong code ⇒ an error
    mock.send.mockReset().mockRejectedValue(stepUp())
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(false)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-handover-body')).toHaveAttribute('aria-live', 'plan-status')
    typeCode('9')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByTestId('memorial-handover-not-verified')).toHaveAttribute('aria-live', 'plan-error')
    cleanup()

    mock.otp.masked = ''
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-handover-no-nominee')).toHaveAttribute('aria-live', 'plan-error')
    cleanup()

    mock.otp.masked = null
    mock.otp.error = 'x'
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-handover-send-failed')).toHaveAttribute('aria-live', 'plan-error')
    cleanup()

    mock.otp.error = null
    mock.viewState = 'error'
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveAttribute('aria-live', 'plan-error')
    cleanup()
    mock.viewState = 'loading'
    renderIn(MemorialOutcomeScreen, 'en')
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveAttribute('aria-live', 'plan-status')
  })

  it('the outcome notice and the helpline-after-code line', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    mock.withdraw.mockRejectedValue(new ApiError(500, 'memorial.something_else', 'x'))
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(screen.getByTestId('memorial-notice')).toHaveAttribute('aria-live', 'plan-error')
    cleanup()

    mock.withdraw.mockReset().mockRejectedValue(stepUp())
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    typeCode('1')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByText(tr('handover.still_refused', 'en'))).toHaveAttribute('aria-live', 'plan-error')
  })

  it('the counters (⛔ a live region under or over the limit — T2; T8: the crossing is announced, not the counter) and the photo notices', async () => {
    renderIn(MemorialWriteScreen, 'en')
    expect(screen.getByTestId('memorial-body-counter')).not.toHaveAttribute('aria-live')
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'क'.repeat(6001) } })
    expect(screen.getByTestId('memorial-body-counter')).not.toHaveAttribute('aria-live')
    cleanup()

    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'विवरण' })
    renderIn(MemorialPhotoScreen, 'en')
    expect(screen.getByTestId('memorial-alt-counter')).not.toHaveAttribute('aria-live')
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'क'.repeat(301) } })
    expect(screen.getByTestId('memorial-alt-counter')).not.toHaveAttribute('aria-live')
    cleanup()

    mock.store.clear() // no photo picked any more: the button reads "Choose a photo"
    const picker = await import('expo-image-picker')
    vi.mocked(picker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({ granted: false } as never)
    renderIn(MemorialPhotoScreen, 'en')
    fireEvent.click(screen.getByText(tr('photo.choose', 'en')))
    await settle()
    expect(screen.getByTestId('memorial-photo-notice')).toHaveAttribute('aria-live', 'plan-error')
  })

  it('NO aria-live anywhere in the rendered memorial screens is a value the plan did not give', async () => {
    const seen = new Set<string>()
    const note = () => liveValues().forEach((v) => seen.add(v))
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    mock.otp.masked = '+91·····3210'
    for (const Screen of [MemorialIntroScreen, MemorialWriteScreen, MemorialPhotoScreen, MemorialOutcomeScreen]) {
      renderIn(Screen, 'en')
      note()
      cleanup()
    }
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    note()
    cleanup()
    mock.viewState = 'error'
    renderIn(MemorialWriteScreen, 'en')
    note()
    expect(seen.size).toBeGreaterThan(0)
    for (const v of seen) expect(['plan-error', 'plan-status'], v).toContain(v)
  })
})

// ─── P5 — "the earlier version still stands" is announced when it appears ───────────────────────────────────────────────

describe('P5 — the "earlier version still stands" sentence is SPOKEN when it appears after the screen is up', () => {
  const withTheTrust = () => view({ memorialState: 'with_the_trust', submissionId: 's-2', body: 'x', canWithdraw: true, canSend: true })

  it.each(ALL_LOCALES)('%s: a Withdraw that worked brings the withdrawn state AND the sentence — announced together, once', async (locale) => {
    mock.view = withTheTrust()
    mock.withdraw.mockResolvedValue({ memorialState: 'withdrawn' })
    const r = renderIn(MemorialOutcomeScreen, locale)
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    mock.view = view({ memorialState: 'withdrawn', submissionId: 's-2', body: 'x', canSend: true, earlierApprovalStands: true })
    rerenderIn(r, MemorialOutcomeScreen, locale)
    expect(screen.getByTestId('memorial-earlier-stands')).toBeInTheDocument()
    expect(announced()).toEqual([`${tr('outcome.withdrawn', locale)} ${tr('outcome.earlier_approval_stands', locale)}`])
  })

  it('the Trust deciding meanwhile (declined, with an earlier approval standing) is spoken the same way', () => {
    mock.view = withTheTrust()
    const r = renderIn(MemorialOutcomeScreen, 'en')
    mock.view = view({ memorialState: 'not_approved', submissionId: 's-2', body: 'x', reasonCode: 'against_the_law', canSend: true, earlierApprovalStands: true })
    rerenderIn(r, MemorialOutcomeScreen, 'en')
    expect(announced()).toEqual([`${tr('outcome.not_approved', 'en')} ${tr('outcome.earlier_approval_stands', 'en')}`])
  })

  it('without the flag only the state line is spoken; on arrival nothing is', () => {
    mock.view = view({ memorialState: 'withdrawn', submissionId: 's-2', body: 'x', canSend: true, earlierApprovalStands: true })
    const r = renderIn(MemorialOutcomeScreen, 'en')
    expect(announced()).toEqual([]) // present on arrival: the screen reader reads the screen itself
    mock.view = view({ memorialState: 'withdrawn', submissionId: 's-2', body: 'x', canSend: true, earlierApprovalStands: false })
    rerenderIn(r, MemorialOutcomeScreen, 'en')
    expect(announced().join(' ')).not.toContain(tr('outcome.earlier_approval_stands', 'en'))
  })
})

// ─── P6 / P8 — the photo and write live regions ─────────────────────────────────────────────────────────────────────────

describe('P6 — the photo screen\'s notices and the alt-text counter', () => {
  const sentBefore = () => view({ memorialState: 'approved', submissionId: 's-1', body: 'x', hasPhoto: true, canSend: true })

  it.each(ALL_LOCALES)('%s: permission denied ⇒ an assertive live region, and it is announced on iOS', async (locale) => {
    mock.view = sentBefore()
    const picker = await import('expo-image-picker')
    vi.mocked(picker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({ granted: false } as never)
    renderIn(MemorialPhotoScreen, locale)
    fireEvent.click(screen.getByText(tr('photo.choose', locale)))
    await settle()
    const notice = screen.getByTestId('memorial-photo-notice')
    expect(notice).toHaveTextContent(tr('photo.permission_denied', locale))
    expect(notice).toHaveAttribute('aria-live', 'assertive')
    expect(announced()).toContain(tr('photo.permission_denied', locale))
  })

  it('a photo that cannot be read (send.photo_unreadable) is the same, and Android is left to its live region', async () => {
    const picker = await import('expo-image-picker')
    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///picker/unreadable.jpg', mimeType: 'image/jpeg' }] } as never)
    mock.os = 'android'
    renderIn(MemorialPhotoScreen, 'en')
    fireEvent.click(screen.getByText(tr('photo.choose', 'en')))
    await settle()
    expect(screen.getByTestId('memorial-photo-notice')).toHaveTextContent(tr('send.photo_unreadable', 'en'))
    expect(screen.getByTestId('memorial-photo-notice')).toHaveAttribute('aria-live', 'assertive')
    expect(announced()).toEqual([]) // iOS-only: TalkBack speaks the live region itself
    expect(loadMemorialDraft('m-1', 'pool-1').photoFileName).toBeUndefined() // nothing half-saved
  })

  it('the alt-text counter is a plain line under the limit (⛔ a live region — T2) — and is not announced as the family types', () => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'विवरण' })
    renderIn(MemorialPhotoScreen, 'en')
    const counter = screen.getByTestId('memorial-alt-counter')
    expect(counter).toHaveTextContent(tr('photo.alt_remaining', 'en', { count: '295' }))
    expect(counter).not.toHaveAttribute('aria-live')
    expect(announced()).toEqual([])
  })
})

describe('P8 / T8 / T2 — the counters are ⛔ live regions; crossing INTO over the limit is announced ONCE (an error); the line is LINKED to its box', () => {
  it.each(ALL_LOCALES.flatMap((l) => (['ios', 'android'] as const).map((os) => [l, os] as const)))('%s / %s write: ⛔ a live region throughout (T2); the crossing is spoken once (not per keystroke), and again after coming back under', (locale, os) => {
    mock.os = os
    renderIn(MemorialWriteScreen, locale)
    const counter = () => screen.getByTestId('memorial-body-counter')
    const type = (n: number) => fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'क'.repeat(n) } })
    expect(counter()).toHaveTextContent(tr('write.remaining', locale, { count: '6000' }))
    expect(counter()).not.toHaveAttribute('aria-live')
    type(6000)
    expect(counter()).toHaveTextContent(tr('write.remaining', locale, { count: '0' }))
    expect(announced()).toEqual([])
    type(6003)
    expect(counter()).toHaveTextContent(tr('write.over_limit', locale, { count: '3' }))
    expect(counter()).not.toHaveAttribute('aria-live') // ⛔ assertive on every keystroke
    expect(announced()).toEqual([tr('write.over_limit', locale, { count: '3' })]) // the crossing, as an error, once
    type(6004)
    type(6009)
    expect(counter()).toHaveTextContent(tr('write.over_limit', locale, { count: '9' }))
    expect(announced()).toHaveLength(1) // typing further past the limit is not re-announced
    type(10)
    expect(counter()).not.toHaveAttribute('aria-live') // back under the limit
    expect(announced()).toHaveLength(1)
    type(6001)
    expect(announced()).toEqual([tr('write.over_limit', locale, { count: '3' }), tr('write.over_limit', locale, { count: '1' })])
  })

  it.each(ALL_LOCALES)('%s photo: the alt-text counter has its own over-limit line (never "room for 0 more"), is ⛔ a live region (T2), and the crossing is spoken once', (locale) => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'क'.repeat(300) })
    renderIn(MemorialPhotoScreen, locale)
    const counter = () => screen.getByTestId('memorial-alt-counter')
    expect(counter()).toHaveTextContent(tr('photo.alt_remaining', locale, { count: '0' }))
    expect(counter()).not.toHaveAttribute('aria-live')
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'क'.repeat(302) } })
    expect(counter()).toHaveTextContent(tr('photo.alt_over_limit', locale, { count: '2' }))
    expect(counter()).not.toHaveTextContent(tr('photo.alt_remaining', locale, { count: '0' }))
    expect(counter()).not.toHaveAttribute('aria-live')
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'क'.repeat(305) } })
    expect(announced()).toEqual([tr('photo.alt_over_limit', locale, { count: '2' })])
    expect(tr('photo.alt_over_limit', locale, { count: '7' })).toContain('7')
  })

  it('with the plan answering distinguishable values: the counters never take the error value, and the announcement is the only error signal', () => {
    mock.planValues = { error: 'plan-error', status: 'plan-status' }
    renderIn(MemorialWriteScreen, 'en')
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'क'.repeat(6001) } })
    expect(screen.getByTestId('memorial-body-counter')).not.toHaveAttribute('aria-live')
    expect(announced()).toEqual([tr('write.over_limit', 'en', { count: '1' })])
  })
})

// ─── P9 — a lapsed kept-photo URL refetches the view ONCE per failed URL ────────────────────────────────────────────────

describe('P9 / T2 — a failed kept-photo URL refetches the view at most ONCE per mounted component', () => {
  const sentBefore = (photoUrl: string) =>
    view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: 'पहले', hasPhoto: true, photoUrl, canSend: true })
  const keptImg = () => screen.getByTestId('memorial-kept-photo').querySelector('img')

  it.each([
    ['preview', MemorialPreviewScreen],
    ['photo', MemorialPhotoScreen],
  ] as const)('%s: error → ONE refetch (the plain line stands in) → the fresh URL arrives → the picture; the same dead URL twice → still one', (_name, Screen) => {
    mock.view = sentBefore('https://signed.example/a.jpg?sig=1')
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', altText: 'विवरण', keepPreviousPhoto: true })
    const r = renderIn(Screen, 'en')
    expect(mock.refetch).not.toHaveBeenCalled()
    act(() => {
      // two error events for the same URL in one batch
      fireEvent.error(keptImg()!)
      fireEvent.error(keptImg()!)
    })
    expect(mock.refetch).toHaveBeenCalledTimes(1)
    expect(keptImg()).toBeNull()
    expect(screen.getByTestId('memorial-kept-photo')).toHaveTextContent(tr('photo.kept_note', 'en'))
    // The refetch brings the SAME dead URL back: still nothing to show, and no second refetch (no loop).
    rerenderIn(r, Screen, 'en')
    expect(keptImg()).toBeNull()
    expect(mock.refetch).toHaveBeenCalledTimes(1)
    // A fresh URL arrives: the picture is back.
    mock.view = sentBefore('https://signed.example/a.jpg?sig=2')
    rerenderIn(r, Screen, 'en')
    expect(keptImg()).toHaveAttribute('src', 'https://signed.example/a.jpg?sig=2')
    expect(mock.refetch).toHaveBeenCalledTimes(1)
  })

  // T2 — every refetch brings a NEW signed URL (a V4 URL embeds its signing time), so "once per URL" never stopped when the
  // photo can never load (the object gone, bytes that will not decode): each turn was a member GET with KMS decrypts.
  it.each([
    ['preview', MemorialPreviewScreen],
    ['photo', MemorialPhotoScreen],
  ] as const)('%s: EVERY URL fails (each refetch brings a new one) ⇒ exactly ONE refetch, then the plain line stands', (_name, Screen) => {
    mock.view = sentBefore('https://signed.example/b.jpg?sig=1')
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', altText: 'विवरण', keepPreviousPhoto: true })
    const r = renderIn(Screen, 'en')
    for (let sig = 2; sig <= 6; sig += 1) {
      fireEvent.error(keptImg()!) // this URL is dead too
      mock.view = sentBefore(`https://signed.example/b.jpg?sig=${sig}`) // "the refetch" brings a NEW signed URL
      rerenderIn(r, Screen, 'en')
      expect(keptImg()).toHaveAttribute('src', `https://signed.example/b.jpg?sig=${sig}`) // a fresh URL is still tried
    }
    fireEvent.error(keptImg()!)
    expect(mock.refetch).toHaveBeenCalledTimes(1)
    expect(keptImg()).toBeNull()
    expect(screen.getByTestId('memorial-kept-photo')).toHaveTextContent(tr('photo.kept_note', 'en'))
  })

  it('a NEW mount (the family came back to the screen) gets its own one refetch', () => {
    mock.view = sentBefore('https://signed.example/c.jpg?sig=1')
    saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true })
    renderIn(MemorialPhotoScreen, 'en')
    fireEvent.error(keptImg()!)
    expect(mock.refetch).toHaveBeenCalledTimes(1)
    cleanup()
    renderIn(MemorialPhotoScreen, 'en')
    fireEvent.error(keptImg()!)
    expect(mock.refetch).toHaveBeenCalledTimes(2)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Third review pass (T1, T6, T11, T12)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

describe('T6 — a stale Write / Photo in the stack cannot save over a newer draft; a landed Send resets the stack', () => {
  it('write: back to a FIRST Write (Preview → "Change the words" pushed a second one) shows the EDITED words, and typing builds on them', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'पहले के शब्द' })
    renderIn(MemorialWriteScreen, 'en')
    expect(screen.getByTestId('memorial-body')).toHaveValue('पहले के शब्द')
    await blurScreens() // → photo → preview → "Change the words": a SECOND Write saves the edit
    saveMemorialDraft('m-1', 'pool-1', { body: 'बदले हुए शब्द' })
    await focusScreens() // back, back, back: the first Write is in front again
    expect(screen.getByTestId('memorial-body')).toHaveValue('बदले हुए शब्द')
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'बदले हुए शब्द, और' } })
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('बदले हुए शब्द, और') // ⛔ the pre-edit words saved over the edit
  })

  it('photo: back to a stale Photo screen shows the NEWER alt text and photo choice, and an edit builds on them', async () => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'पुराना विवरण' })
    renderIn(MemorialPhotoScreen, 'en')
    expect(screen.getByTestId('memorial-alt-text')).toHaveValue('पुराना विवरण')
    await blurScreens()
    saveMemorialDraft('m-1', 'pool-1', { altText: 'नया विवरण' })
    await focusScreens()
    expect(screen.getByTestId('memorial-alt-text')).toHaveValue('नया विवरण')
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'नया विवरण, और' } })
    expect(loadMemorialDraft('m-1', 'pool-1')).toMatchObject({ body: 'शब्द', photoFileName: 'p.jpg', altText: 'नया विवरण, और' })
  })

  it('a landed Send RESETS the memorial stack to the outcome: dismissAll first, then replace (back cannot reach Write / Photo)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.dismissAll).toHaveBeenCalledTimes(1)
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
    expect(mock.dismissAll.mock.invocationCallOrder[0]!).toBeLessThan(mock.replace.mock.invocationCallOrder[0]!)
  })

  it('…and when the Preview is the only screen in the stack (a deep link), it is simply replaced', async () => {
    mock.canDismiss = false
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.dismissAll).not.toHaveBeenCalled()
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('a Send that landed while the Preview was BEHIND another screen (the draft cleared) goes to the outcome when the Preview comes back to the front', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    await blurScreens()
    send.resolve(SENT_OK)
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({})
    expect(mock.replace).not.toHaveBeenCalled() // never yanked out of the screen in front
    await focusScreens()
    expect(mock.dismissAll).toHaveBeenCalledTimes(1)
    expect(mock.replace).toHaveBeenCalledTimes(1)
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
    await blurScreens()
    await focusScreens()
    expect(mock.replace).toHaveBeenCalledTimes(1) // owed once, shown once
  })
})

// T12 (a) / W7 — the progress a Retry shows comes from the TAP (a flag in `MemorialViewMissing`), ⛔ from `isFetching`: a
// background refetch moves `isFetching` too, and must not flip the line; a Retry on a `{ memorial: null }` view must show
// progress as one after a failed GET does.
describe('W7 — a Retry the family TAPPED shows progress until its fetch settles, whatever the last result; Retry is off meanwhile', () => {
  const SCREENS = [
    ['intro', MemorialIntroScreen, 'view_missing.body_outcome'],
    ['write', MemorialWriteScreen, 'view_missing.body'],
    ['photo', MemorialPhotoScreen, 'view_missing.body'],
    ['preview', MemorialPreviewScreen, 'view_missing.body'],
    ['outcome', MemorialOutcomeScreen, 'view_missing.body_outcome'],
  ] as const
  const CASES = SCREENS.flatMap(([name, Screen, lineKey]) =>
    (['the GET failed', '{ memorial: null }'] as const).map((last) => [name, last, Screen, lineKey] as const),
  )
  const line = () => screen.getByTestId('memorial-view-missing-line')
  const retry = () => screen.getByTestId('memorial-view-missing-retry')

  it.each(CASES)('%s / %s: tap Retry ⇒ the calm loading line and Retry disabled (a second tap starts nothing); the fetch settles ⇒ the line and Retry are back', async (_name, last, Screen, lineKey) => {
    if (last === 'the GET failed') mock.viewState = 'error'
    else mock.view = null
    let settleFetch!: () => void
    mock.refetch.mockReturnValue(new Promise<void>((res) => (settleFetch = res)))
    renderIn(Screen, 'en')
    expect(line()).toHaveTextContent(tr(lineKey, 'en'))
    fireEvent.click(retry())
    expect(line()).toHaveTextContent(tr('view_missing.loading', 'en'))
    expect(line()).toHaveAttribute('aria-live', 'polite') // a status while loading
    expect(retry()).toBeDisabled()
    fireEvent.click(retry())
    expect(mock.refetch).toHaveBeenCalledTimes(1) // ⛔ a second GET (it would cancel and restart the first)
    await act(async () => {
      settleFetch() // … the fetch answers: still nothing to show
      await Promise.resolve()
    })
    await settle()
    expect(line()).toHaveTextContent(tr(lineKey, 'en'))
    expect(retry()).not.toBeDisabled()
  })

  it.each(SCREENS)('%s: a BACKGROUND refetch after a failed GET (isFetching, no tap) does not flip the line to loading', (_name, Screen, lineKey) => {
    mock.viewState = 'error'
    const r = renderIn(Screen, 'en')
    mock.viewFetching = true
    rerenderIn(r, Screen, 'en')
    expect(line()).toHaveTextContent(tr(lineKey, 'en'))
    expect(line()).not.toHaveTextContent(tr('view_missing.loading', 'en'))
    expect(retry()).not.toBeDisabled()
  })

  it('a Retry whose fetch never settles is released after the bound (Retry must not stay off for ever)', async () => {
    const { MEMORIAL_VIEW_RETRY_BOUND_MS } = await import('../../components/memorial-authorship/MemorialViewMissing')
    expect(MEMORIAL_VIEW_RETRY_BOUND_MS).toBe(20_000)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      mock.viewState = 'error'
      mock.refetch.mockReturnValue(new Promise(() => undefined)) // hung
      renderIn(MemorialWriteScreen, 'en')
      fireEvent.click(retry())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(MEMORIAL_VIEW_RETRY_BOUND_MS - 1)
      })
      expect(retry()).toBeDisabled()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(retry()).not.toBeDisabled()
      expect(line()).toHaveTextContent(tr('view_missing.body', 'en'))
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('T12 (b) — the photo\'s reason has ONE source (the view), shown even when the words cannot be', () => {
  it.each(ALL_LOCALES)('%s: approved_with_omissions, the photo left out, the words could not be decrypted ⇒ the photo line still carries ITS reason', (locale) => {
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body: null,
      unavailable: 'memorial.unavailable_now',
      photoLeftOut: { reason: 'identifies_a_child' },
      canSend: true,
    })
    renderIn(MemorialOutcomeScreen, locale)
    const line = screen.getByTestId('memorial-photo-left-out')
    expect(line).toHaveTextContent(tr('outcome.photo_left_out', locale))
    expect(line).toHaveTextContent(tr('outcome.reason', locale, { reason: tr('reason.identifies_a_child', locale) }))
  })
})

describe('T1 — the earlier-approval sentence agrees with "Write again" beside it (UN-ATTESTED copy)', () => {
  const gone = (over: Partial<MemorialMemberView>) =>
    view({ memorialState: 'withdrawn', submissionId: 's-2', body: 'x', earlierApprovalStands: true, ...over })

  it.each(ALL_LOCALES)('%s: canSend ⇒ "Write again" is offered and the sentence says a NEW version can be written (or the helpline)', (locale) => {
    mock.view = gone({ canSend: true })
    renderIn(MemorialOutcomeScreen, locale)
    expect(screen.getByTestId('memorial-write-again')).toBeInTheDocument()
    const line = screen.getByTestId('memorial-earlier-stands')
    expect(line.textContent).toBe(tr('outcome.earlier_approval_stands', locale))
    expect(line.textContent).toMatch(locale === 'en' ? /new version/i : /नया संस्करण/)
    expect(line.textContent).toMatch(locale === 'en' ? /helpline/i : /हेल्पलाइन/)
  })

  it.each(ALL_LOCALES)('%s: ⛔ canSend ⇒ no "Write again", and the sentence names the helpline ALONE', (locale) => {
    mock.view = gone({ canSend: false })
    renderIn(MemorialOutcomeScreen, locale)
    expect(screen.queryByTestId('memorial-write-again')).toBeNull()
    const line = screen.getByTestId('memorial-earlier-stands')
    expect(line.textContent).toBe(tr('outcome.earlier_approval_stands_helpline_only', locale))
    expect(line.textContent).not.toMatch(locale === 'en' ? /new version/i : /नया संस्करण/)
  })

  it('the SPOKEN sentence (P5) is the same variant as the drawn one', () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-2', body: 'x', canWithdraw: true, canSend: false })
    const r = renderIn(MemorialOutcomeScreen, 'en')
    mock.view = gone({ canSend: false, memorialState: 'not_approved', reasonCode: 'against_the_law' })
    rerenderIn(r, MemorialOutcomeScreen, 'en')
    expect(announced()).toEqual([`${tr('outcome.not_approved', 'en')} ${tr('outcome.earlier_approval_stands_helpline_only', 'en')}`])
  })
})

describe('T11 — the omission marker carries ⛔ dead label (RN flattens nested text; the visible marker is read)', () => {
  it('the marker is drawn, with no aria-label on it', () => {
    mock.view = view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body: 'एक दो तीन',
      omissions: [{ field: 'body', start: 3, end: 5, reason: 'against_the_law' }],
      canSend: true,
    })
    renderIn(MemorialOutcomeScreen, 'en')
    const marker = screen.getByText(tr('render.omitted', 'en'))
    expect(marker).not.toHaveAttribute('aria-label')
    expect(screen.getByTestId('memorial-outcome-text').querySelectorAll('[aria-label]')).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fix-diff review of the third pass (V3, V4, V5, V8, V9, V10, V11; V2 is in the T5 block above)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

describe('V8 — an over-limit state the screen STARTS in is not announced; only a crossing after the draft is read', () => {
  it.each(ALL_LOCALES)('%s write: a restored draft already over the limit ⇒ silent; typing further ⇒ silent; back under and over again ⇒ ONE announcement', (locale) => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'क'.repeat(6003) })
    renderIn(MemorialWriteScreen, locale)
    const type = (n: number) => fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'क'.repeat(n) } })
    expect(screen.getByTestId('memorial-body-counter')).toHaveTextContent(tr('write.over_limit', locale, { count: '3' }))
    expect(announced()).toEqual([])
    type(6005)
    expect(announced()).toEqual([])
    type(10)
    expect(announced()).toEqual([])
    type(6001)
    expect(announced()).toEqual([tr('write.over_limit', locale, { count: '1' })])
  })

  it('a PUSHED second Write over the limit (Preview → "Change the words") ⇒ silent at its mount', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'क'.repeat(6002) })
    renderIn(MemorialWriteScreen, 'en')
    renderIn(MemorialWriteScreen, 'en')
    expect(announced()).toEqual([])
  })

  it('photo: alt text already over the limit at load ⇒ silent; back under and over again ⇒ ONE announcement', () => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'क'.repeat(302) })
    renderIn(MemorialPhotoScreen, 'en')
    const type = (n: number) => fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'क'.repeat(n) } })
    expect(screen.getByTestId('memorial-alt-counter')).toHaveTextContent(tr('photo.alt_over_limit', 'en', { count: '2' }))
    type(305)
    expect(announced()).toEqual([])
    type(10)
    type(301)
    expect(announced()).toEqual([tr('photo.alt_over_limit', 'en', { count: '1' })])
  })
})

describe('V9 — the focus re-read edges', () => {
  it('(a) write: while the last save FAILED (full storage), coming back to the front keeps the newer words in the box; once a save works, the re-read is back', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'पुराने शब्द' })
    renderIn(MemorialWriteScreen, 'en')
    mock.failWrites = true
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'नए शब्द' } })
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('पुराने शब्द') // the write did not reach the storage
    await blurScreens()
    await focusScreens()
    expect(screen.getByTestId('memorial-body')).toHaveValue('नए शब्द') // ⛔ replaced by the older stored words
    mock.failWrites = false
    fireEvent.change(screen.getByTestId('memorial-body'), { target: { value: 'नए शब्द, और' } })
    await blurScreens()
    saveMemorialDraft('m-1', 'pool-1', { body: 'दूसरे Write के शब्द' })
    await focusScreens()
    expect(screen.getByTestId('memorial-body')).toHaveValue('दूसरे Write के शब्द')
  })

  it('(a) photo: the same for the alt text', async () => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'पुराना विवरण' })
    renderIn(MemorialPhotoScreen, 'en')
    mock.failWrites = true
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'नया विवरण' } })
    expect(screen.getByTestId('memorial-alt-text')).toHaveValue('नया विवरण')
    await blurScreens()
    await focusScreens()
    expect(screen.getByTestId('memorial-alt-text')).toHaveValue('नया विवरण')
  })

  it('(b) a Send landed while the Preview was behind; the family then wrote NEW words elsewhere ⇒ coming back to the front does ⛔ go to the outcome, and the new words stay', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    await blurScreens()
    send.resolve(SENT_OK)
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({}) // the sent draft was cleared: the outcome is owed
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द' }) // … and a new draft is started on another screen
    await focusScreens()
    expect(mock.replace).not.toHaveBeenCalled()
    expect(mock.dismissAll).not.toHaveBeenCalled()
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('नए शब्द')
    await blurScreens()
    await focusScreens()
    expect(mock.replace).not.toHaveBeenCalled() // nothing is owed any more
  })
})

describe('V10 — a kept-photo URL that LOADS re-arms the one refetch (a second lapse on a long-open screen)', () => {
  const sentBefore = (photoUrl: string) =>
    view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: 'पहले', hasPhoto: true, photoUrl, canSend: true })
  const keptImg = () => screen.getByTestId('memorial-kept-photo').querySelector('img')

  it.each([
    ['preview', MemorialPreviewScreen],
    ['photo', MemorialPhotoScreen],
  ] as const)('%s: lapse → refetch → the fresh URL LOADS → it lapses later → ONE more refetch; a URL that never loads re-arms nothing', (_name, Screen) => {
    mock.view = sentBefore('https://signed.example/d.jpg?sig=1')
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', altText: 'विवरण', keepPreviousPhoto: true })
    const r = renderIn(Screen, 'en')
    fireEvent.load(keptImg()!)
    fireEvent.error(keptImg()!) // the first URL lapses
    expect(mock.refetch).toHaveBeenCalledTimes(1)
    mock.view = sentBefore('https://signed.example/d.jpg?sig=2')
    rerenderIn(r, Screen, 'en')
    fireEvent.load(keptImg()!) // the refreshed URL WORKS …
    fireEvent.error(keptImg()!) // … and lapses in its turn, minutes later
    expect(mock.refetch).toHaveBeenCalledTimes(2)
    mock.view = sentBefore('https://signed.example/d.jpg?sig=3')
    rerenderIn(r, Screen, 'en')
    fireEvent.error(keptImg()!) // never loaded
    mock.view = sentBefore('https://signed.example/d.jpg?sig=4')
    rerenderIn(r, Screen, 'en')
    fireEvent.error(keptImg()!)
    expect(mock.refetch).toHaveBeenCalledTimes(2) // still no loop
  })
})

describe('V11 — a background refetch of a `{ memorial: null }` view is ⛔ a Retry: the line does not flip to loading', () => {
  it.each([
    ['intro', MemorialIntroScreen, 'view_missing.body_outcome'],
    ['write', MemorialWriteScreen, 'view_missing.body'],
    ['photo', MemorialPhotoScreen, 'view_missing.body'],
    ['preview', MemorialPreviewScreen, 'view_missing.body'],
    ['outcome', MemorialOutcomeScreen, 'view_missing.body_outcome'],
  ] as const)('%s: { memorial: null } + isFetching ⇒ the missing line and its retry, ⛔ the loading line', (_name, Screen, lineKey) => {
    mock.view = null
    mock.viewFetching = true
    renderIn(Screen, 'en')
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveTextContent(tr(lineKey, 'en'))
    expect(screen.getByTestId('memorial-view-missing-line')).not.toHaveTextContent(tr('view_missing.loading', 'en'))
    expect(screen.getByTestId('memorial-view-missing-retry')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fix-diff review of the V round (W1, W3, W5, W6, W12; W2 is in the T5 block, W4 in the V5 block, W7 replaced T12 (a))
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

describe('W3 — Withdraw: a code sent and not yet verified stays asked for; the button is off while in flight and while the code is asked', () => {
  beforeEach(() => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true, canSend: true })
    mock.otp.masked = '+91·····3210'
  })

  it('the code panel is open ⇒ Withdraw is disabled: a press does nothing (⛔ a second SMS, the first code still works)', async () => {
    mock.withdraw.mockRejectedValueOnce(stepUp()).mockRejectedValueOnce(new ApiError(500, 'memorial.something_else', 'x'))
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-withdraw')).toBeDisabled()
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(mock.withdraw).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
  })

  it('Withdraw is disabled while its request is in flight, and free again when it settles', async () => {
    let fail!: (e: unknown) => void
    mock.withdraw.mockReturnValueOnce(new Promise((_res, rej) => (fail = rej)))
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(screen.getByTestId('memorial-withdraw')).toBeDisabled()
    fail(new ApiError(500, 'memorial.something_else', 'x'))
    await settle()
    expect(screen.getByTestId('memorial-withdraw')).not.toBeDisabled()
  })

  it('the hook: while the code is asked for, run() is IGNORED by the machine — ⛔ no request, the panel stays, ⛔ no second SMS', async () => {
    const action = vi.fn()
    const refused = vi.fn()
    let flow!: ReturnType<typeof useHandoverGatedAction>
    const Harness = (): ReactNode => {
      flow = useHandoverGatedAction(action, refused)
      return null
    }
    render(createElement(Harness))
    action.mockRejectedValueOnce(stepUp())
    await act(async () => flow.run())
    expect(flow.needCode).toBe(true)
    expect(flow.canRun).toBe(false)
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
    await act(async () => flow.run())
    await act(async () => flow.run())
    expect(action).toHaveBeenCalledTimes(1) // ⛔ no second request while the code is asked for
    expect(refused).not.toHaveBeenCalled()
    expect(flow.needCode).toBe(true) // the code sent is still the one to type
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
  })
})

describe('W5 — Photo: a change made while the saves FAIL is merged into the SCREEN, ⛔ into the older stored draft', () => {
  it('pick a photo, then type its description, both under failing writes ⇒ both stay on the screen', async () => {
    const picker = await import('expo-image-picker')
    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///picker/a.jpg', mimeType: 'image/jpeg' }] } as never)
    mock.files.add('file:///picker/a.jpg')
    renderIn(MemorialPhotoScreen, 'en')
    mock.failWrites = true
    fireEvent.click(screen.getByText(tr('photo.choose', 'en')))
    await settle()
    expect(screen.getByLabelText(tr('photo.chosen_a11y', 'en'))).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'माँ की फ़ोटो' } })
    expect(screen.getByLabelText(tr('photo.chosen_a11y', 'en'))).toBeInTheDocument() // change 1 survives change 2
    expect(screen.getByTestId('memorial-alt-text')).toHaveValue('माँ की फ़ोटो')
    expect(loadMemorialDraft('m-1', 'pool-1')).toEqual({}) // neither reached the storage
  })

  it('…and picking ANOTHER photo then deletes the first copy (it was held by the screen alone)', async () => {
    const picker = await import('expo-image-picker')
    vi.mocked(picker.launchImageLibraryAsync)
      .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///picker/a.jpg', mimeType: 'image/jpeg' }] } as never)
      .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///picker/b.jpg', mimeType: 'image/jpeg' }] } as never)
    mock.files.add('file:///picker/a.jpg')
    mock.files.add('file:///picker/b.jpg')
    renderIn(MemorialPhotoScreen, 'en')
    mock.failWrites = true
    fireEvent.click(screen.getByText(tr('photo.choose', 'en')))
    await settle()
    const firstCopy = [...mock.files].find((u) => u.startsWith('file:///docs/memorial-photo-'))!
    fireEvent.click(screen.getByText(tr('photo.choose_other', 'en')))
    await settle()
    const copies = [...mock.files].filter((u) => u.startsWith('file:///docs/memorial-photo-'))
    expect(copies).toHaveLength(1)
    expect(copies[0]).not.toBe(firstCopy)
  })
})

describe('W12 — a draft RESTORED over the limit is silent at mount, and the box\'s hint carries the over-limit line', () => {
  it.each(ALL_LOCALES)('%s write', (locale) => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'क'.repeat(6004) })
    renderIn(MemorialWriteScreen, locale)
    const over = tr('write.over_limit', locale, { count: '4' })
    expect(String(lastInput('memorial-body').accessibilityHint).startsWith(over)).toBe(true)
    expect(String(lastInput('memorial-body').accessibilityHint)).toContain(tr('write.hint', locale))
    expect(announced()).toEqual([])
  })

  it.each(ALL_LOCALES)('%s photo', (locale) => {
    mock.files.add('file:///docs/p.jpg')
    saveMemorialDraft('m-1', 'pool-1', { photoFileName: 'p.jpg', photoMime: 'image/jpeg', altText: 'क'.repeat(303) })
    renderIn(MemorialPhotoScreen, locale)
    const over = tr('photo.alt_over_limit', locale, { count: '3' })
    expect(String(lastInput('memorial-alt-text').accessibilityHint).startsWith(over)).toBe(true)
    expect(String(lastInput('memorial-alt-text').accessibilityHint)).toContain(tr('photo.alt_hint', locale))
    expect(announced()).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Y round — the Send / Withdraw state machine on the screens (X3, X7), the photo screen's save after a failure (X1), the
// missing-view first load (X4) and the Retry's loading line (X7)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

describe('Y / Z4 (a) — how a failed request is read: a PROVING answer is the API\'s envelope from after the step-up check; anything else is NO answer', () => {
  it.each([
    ['403 auth.step_up_required', new ApiError(403, 'auth.step_up_required', 'x'), { kind: 'step_up' }],
    ['409 memorial.authorisation_outdated', new ApiError(409, 'memorial.authorisation_outdated', 'x'), { kind: 'refused', code: 'memorial.authorisation_outdated' }],
    ['422 with an envelope', new ApiError(422, 'memorial.something_else', 'x'), { kind: 'refused', code: 'memorial.something_else' }],
    ['409 memorial.not_withdrawable', new ApiError(409, 'memorial.not_withdrawable', 'x'), { kind: 'refused', code: 'memorial.not_withdrawable' }],
    // Z4 (a) — from BEFORE the step-up check (routes.ts: rate limit → memorialSwitch → memberSession → handoverStepUp) ⇒ no proof
    ['500 with an envelope', new ApiError(500, 'memorial.something_else', 'x'), { kind: 'no_answer' }],
    ['503 with an envelope', new ApiError(503, 'platform.unavailable', 'x'), { kind: 'no_answer' }],
    ['429 (the rate limit)', new ApiError(429, 'rate_limit.exceeded', 'x'), { kind: 'no_answer' }],
    ['401 auth.session_expired', new ApiError(401, 'auth.session_expired', 'x'), { kind: 'no_answer' }],
    ['403 auth.forbidden (⛔ the step-up code)', new ApiError(403, 'auth.forbidden', 'x'), { kind: 'no_answer' }],
    ['404 memorial.not_found (the switch)', new ApiError(404, 'memorial.not_found', 'x'), { kind: 'no_answer' }],
    ['a 502 page with no envelope', new ApiError(502, 'http.502', 'Bad Gateway'), { kind: 'no_answer' }],
    ['a 403 page with no envelope (⛔ not a step-up)', new ApiError(403, 'http.403', 'Forbidden'), { kind: 'no_answer' }],
    ['a network error', new TypeError('Network request failed'), { kind: 'no_answer' }],
    ['anything else thrown', 'boom', { kind: 'no_answer' }],
  ] as const)('%s', (_name, err, answer) => {
    expect(handoverGateAnswerOf(err)).toEqual(answer)
  })
})

describe('X7 — a double tap in ONE frame starts ONE request (the machine\'s ref guard)', () => {
  it('Send: two clicks before any re-render ⇒ one POST', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    const send = deferredSend()
    renderIn(MemorialPreviewScreen, 'en')
    const button = screen.getByTestId('memorial-send')
    act(() => {
      button.click()
      button.click() // the same frame: the button is not disabled yet
    })
    await settle()
    expect(mock.send).toHaveBeenCalledTimes(1)
    send.resolve(SENT_OK)
    await settle()
  })

  it('Withdraw: two clicks before any re-render ⇒ one POST', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    mock.withdraw.mockReturnValue(new Promise(() => undefined))
    renderIn(MemorialOutcomeScreen, 'en')
    const button = screen.getByTestId('memorial-withdraw')
    act(() => {
      button.click()
      button.click()
    })
    await settle()
    expect(mock.withdraw).toHaveBeenCalledTimes(1)
  })

  it('Confirm: two clicks before any re-render ⇒ one verify, one retry', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.otp.masked = '+91·····3210'
    mock.otpVerify.mockResolvedValue(true)
    mock.send.mockRejectedValueOnce(stepUp()).mockResolvedValueOnce(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    typeCode('123456')
    const confirm = screen.getByTestId('memorial-handover-confirm')
    act(() => {
      confirm.click()
      confirm.click()
    })
    await settle()
    expect(mock.otpVerify).toHaveBeenCalledTimes(1)
    expect(mock.send).toHaveBeenCalledTimes(2)
  })
})

describe('X3 — Confirm is OFF while the code is checked and while its retry runs (Send and Withdraw); the panel stays up', () => {
  const arrange = (Screen: () => ReactNode, kind: 'send' | 'withdraw') => {
    mock.otp.masked = '+91·····3210'
    if (kind === 'send') saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    else mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    renderIn(Screen, 'en')
  }
  const CASES = [
    ['Send', MemorialPreviewScreen, 'send', 'memorial-send'],
    ['Withdraw', MemorialOutcomeScreen, 'withdraw', 'memorial-withdraw'],
  ] as const

  it.each(CASES)('%s: while the code is checked ⇒ Confirm and the action are disabled; a click starts nothing', async (_name, Screen, kind, actionId) => {
    let verify!: (ok: boolean) => void
    mock.otpVerify.mockReturnValue(new Promise<boolean>((res) => (verify = res)))
    const request = kind === 'send' ? mock.send : mock.withdraw
    request.mockRejectedValueOnce(stepUp()).mockResolvedValueOnce(SENT_OK)
    arrange(Screen, kind)
    fireEvent.click(screen.getByTestId(actionId))
    await settle()
    typeCode('123456')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-handover-confirm')).toBeDisabled()
    expect(screen.getByTestId(actionId)).toBeDisabled()
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    fireEvent.click(screen.getByTestId(actionId))
    await settle()
    expect(mock.otpVerify).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(1)
    await act(async () => {
      verify(true)
      await Promise.resolve()
    })
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it.each(CASES)('%s: while the code-verified retry runs ⇒ Confirm is disabled (⛔ no re-verify of a used code, ⛔ no second POST)', async (_name, Screen, kind, actionId) => {
    mock.otpVerify.mockResolvedValue(true)
    const request = kind === 'send' ? mock.send : mock.withdraw
    let answer!: (v: unknown) => void
    request.mockRejectedValueOnce(stepUp()).mockReturnValueOnce(new Promise((res) => (answer = res)))
    arrange(Screen, kind)
    fireEvent.click(screen.getByTestId(actionId))
    await settle()
    typeCode('123456')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(request).toHaveBeenCalledTimes(2) // the retry is in flight
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-handover-confirm')).toBeDisabled()
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(mock.otpVerify).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(2)
    answer(SENT_OK)
    await settle()
    expect(screen.queryByTestId('memorial-handover')).toBeNull()
  })

  it('a wrong code keeps Confirm ON for the next try (need_code), with ⛔ no second SMS', async () => {
    mock.otpVerify.mockResolvedValue(false)
    mock.send.mockRejectedValue(stepUp())
    arrange(MemorialPreviewScreen, 'send')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    typeCode('9')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByTestId('memorial-handover-not-verified')).toBeInTheDocument()
    expect(screen.getByTestId('memorial-handover-confirm')).not.toBeDisabled()
    expect(screen.getByTestId('memorial-send')).toBeDisabled()
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
  })
})

describe('X1 — Photo: a failed save, then one that WORKS, writes the screen\'s choices (⛔ never the change alone over the older draft)', () => {
  const pickOnce = async (uri: string) => {
    const picker = await import('expo-image-picker')
    vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri, mimeType: 'image/jpeg' }] } as never)
    mock.files.add(uri)
  }
  const copies = () => [...mock.files].filter((u) => u.startsWith('file:///docs/memorial-photo-'))

  it('pick a photo while the save FAILS, then type its description while saves WORK ⇒ both are stored, the copy is the stored one (no orphan)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    await pickOnce('file:///picker/a.jpg')
    renderIn(MemorialPhotoScreen, 'en')
    mock.failWrites = true
    fireEvent.click(screen.getByText(tr('photo.choose', 'en')))
    await settle()
    expect(copies()).toHaveLength(1)
    const copy = copies()[0]!.replace('file:///docs/', '')
    expect(loadMemorialDraft('m-1', 'pool-1').photoFileName).toBeUndefined() // the pick did not reach the storage
    mock.failWrites = false
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'माँ की फ़ोटो' } })
    expect(loadMemorialDraft('m-1', 'pool-1')).toMatchObject({ body: 'शब्द', photoFileName: copy, photoMime: 'image/jpeg', altText: 'माँ की फ़ोटो' })
    expect(screen.getByLabelText(tr('photo.chosen_a11y', 'en'))).toBeInTheDocument() // the screen still shows the pick
    expect(copies()).toEqual([`file:///docs/${copy}`]) // the one copy is the one the draft names: nothing orphaned
  })

  it('"Use the photo I sent before" while the save FAILS, then a description that saves ⇒ keepPreviousPhoto is stored too', async () => {
    mock.view = view({ memorialState: 'approved_with_omissions', submissionId: 's-1', body: 'पहले', hasPhoto: true, photoUrl: null, canSend: true })
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    renderIn(MemorialPhotoScreen, 'en')
    mock.failWrites = true
    fireEvent.click(screen.getByTestId('memorial-use-previous-photo'))
    mock.failWrites = false
    fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'विवरण' } })
    expect(loadMemorialDraft('m-1', 'pool-1')).toMatchObject({ body: 'शब्द', keepPreviousPhoto: true, altText: 'विवरण' })
  })

  it('after a save that WORKED, a change is saved alone (the words written elsewhere are never overwritten from this screen)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द', altText: 'पुराना' })
    renderIn(MemorialPhotoScreen, 'en')
    saveMemorialDraft('m-1', 'pool-1', { body: 'Write के नए शब्द' }) // another screen saved newer words meanwhile
    await pickOnce('file:///picker/b.jpg')
    fireEvent.click(screen.getByText(tr('photo.choose', 'en')))
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1').body).toBe('Write के नए शब्द')
  })
})

describe('X4 — the FIRST load is bounded too; a mount refetch after a cached error shows loading', () => {
  const line = () => screen.getByTestId('memorial-view-missing-line')
  const SCREENS = [
    ['intro', MemorialIntroScreen, 'view_missing.body_outcome'],
    ['write', MemorialWriteScreen, 'view_missing.body'],
    ['photo', MemorialPhotoScreen, 'view_missing.body'],
    ['preview', MemorialPreviewScreen, 'view_missing.body'],
    ['outcome', MemorialOutcomeScreen, 'view_missing.body_outcome'],
  ] as const

  it.each(SCREENS)('%s: a first load that never settles ⇒ "loading" (no Retry) until the bound, then the missing line and an ACTIVE Retry', async (_name, Screen, lineKey) => {
    const { MEMORIAL_VIEW_RETRY_BOUND_MS } = await import('../../components/memorial-authorship/MemorialViewMissing')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      mock.viewState = 'loading'
      renderIn(Screen, 'en')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(MEMORIAL_VIEW_RETRY_BOUND_MS - 1)
      })
      expect(line()).toHaveTextContent(tr('view_missing.loading', 'en'))
      expect(screen.queryByTestId('memorial-view-missing-retry')).toBeNull()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(line()).toHaveTextContent(tr(lineKey, 'en'))
      expect(screen.getByTestId('memorial-view-missing-retry')).not.toBeDisabled()
      fireEvent.click(screen.getByTestId('memorial-view-missing-retry'))
      expect(mock.refetch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(SCREENS)('%s: mounted on a cached ERROR while its mount refetch runs ⇒ "loading", no Retry; it settles with an error ⇒ the missing line and Retry', (_name, Screen, lineKey) => {
    mock.viewState = 'error'
    mock.viewFetching = true // the mount refetch (isPending is false: the query has a result — the error)
    const r = renderIn(Screen, 'en')
    expect(line()).toHaveTextContent(tr('view_missing.loading', 'en'))
    expect(screen.queryByTestId('memorial-view-missing-retry')).toBeNull()
    mock.viewFetching = false
    rerenderIn(r, Screen, 'en')
    expect(line()).toHaveTextContent(tr(lineKey, 'en'))
    expect(screen.getByTestId('memorial-view-missing-retry')).not.toBeDisabled()
  })
})

describe('X7 (family 13 (d)) — after a Retry tap, the loading line is SPOKEN on iOS too (Android: its live region)', () => {
  it.each(['ios', 'android'] as const)('%s', (os) => {
    mock.os = os
    mock.viewState = 'error'
    mock.refetch.mockReturnValue(new Promise(() => undefined))
    renderIn(MemorialWriteScreen, 'en')
    mock.announce.mockReset()
    fireEvent.click(screen.getByTestId('memorial-view-missing-retry'))
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveTextContent(tr('view_missing.loading', 'en'))
    expect(screen.getByTestId('memorial-view-missing-line')).toHaveAttribute('aria-live', 'polite')
    if (os === 'ios') expect(announced()).toEqual([tr('view_missing.loading', 'en')])
    else expect(announced()).toEqual([])
  })

  it('the FIRST load\'s line is still not announced (the screen reader reads the screen on arrival)', () => {
    mock.viewState = 'loading'
    renderIn(MemorialWriteScreen, 'en')
    expect(announced()).toEqual([])
  })
})

describe('X5 — the refresh after a request is ⛔ never awaited: a hung refetch cannot hold the screen in flight', () => {
  it('Send: a 2xx while invalidateQueries never settles ⇒ the screen leaves "sending" (Back free) and goes to the outcome', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.invalidate.mockReturnValue(new Promise(() => undefined)) // the refetch it starts hangs
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.invalidate).toHaveBeenCalled()
    expect(mock.back.handlers).toHaveLength(0)
    expect(mock.navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true })
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('Send: authorisation_outdated while invalidateQueries never settles ⇒ the refusal is shown and Send is free', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.invalidate.mockReturnValue(new Promise(() => undefined))
    mock.send.mockRejectedValue(new ApiError(409, 'memorial.authorisation_outdated', 'x'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr('send.authorisation_outdated', 'en'))
    expect(screen.getByTestId('memorial-send')).not.toBeDisabled()
  })

  it('Withdraw: it worked while invalidateQueries never settles ⇒ Withdraw is not held busy', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    mock.invalidate.mockReturnValue(new Promise(() => undefined))
    mock.withdraw.mockResolvedValue({ memorialState: 'withdrawn' })
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(mock.withdraw).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('memorial-withdraw')).not.toBeDisabled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Final review of the Y round — Z0 (A) "Send a new code", Z3 (a key whose save failed), Z4 (b) (an edit after a no-answer
// retry), Z5 (each code request's own result)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

/** Each `otp.send()` call, in order, does what the SHARED hook does: success ⇒ `masked` set, `error` cleared; failure ⇒
 * `error` set and `masked` LEFT as it was (the hook never clears it — the Z5 trap). */
const otpRounds = (...rounds: Array<string | 'fail'>) => {
  for (const r of rounds) {
    mock.otpSend.mockImplementationOnce(async () => {
      mock.otp = r === 'fail' ? { ...mock.otp, error: 'x' } : { ...mock.otp, masked: r, error: null }
    })
  }
}
const MASKED = '+91·····3210'
const resendButton = () => screen.queryByTestId('memorial-handover-resend')
const pressSendTo403 = async (locale: Locale = 'en') => {
  saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
  mock.send.mockRejectedValue(stepUp())
  renderIn(MemorialPreviewScreen, locale)
  fireEvent.click(screen.getByTestId('memorial-send'))
  await settle()
}

describe('Z0 (A) — "Send a new code" on the code panel: when the SMS failed, or after a wait; ⛔ without a nominee; at most three', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each(ALL_LOCALES)('%s: the SMS failed ⇒ the offer (a real 44pt button + its line, real t()); pressing it sends ONE new SMS and the new code is asked for', async (locale) => {
    otpRounds('fail', MASKED)
    await pressSendTo403(locale)
    expect(screen.getByTestId('memorial-handover-send-failed')).toHaveTextContent(tr('handover.send_failed', locale))
    const button = resendButton()!
    expect(button).toHaveTextContent(tr('handover.resend', locale))
    expect(button).toHaveAttribute('data-minheight', '44')
    expect(button).not.toBeDisabled()
    expect(screen.getByTestId('memorial-handover-resend-note')).toHaveTextContent(tr('handover.resend_note', locale))
    expect(screen.getByTestId('memorial-handover')).toContainElement(screen.getByTestId('helpline-cta'))
    expect(mock.otpSend).toHaveBeenCalledTimes(1)
    fireEvent.click(button)
    await settle()
    expect(mock.otpSend).toHaveBeenCalledTimes(2) // ONE new SMS
    expect(screen.queryByTestId('memorial-handover-send-failed')).toBeNull()
    expect(screen.getByTestId('memorial-handover-body')).toHaveTextContent(tr('handover.body', locale, { masked: MASKED }))
    expect(resendButton()).toBeNull() // the new code was sent: the wait starts again
    expect(mock.send).toHaveBeenCalledTimes(1) // ⛔ a Send — only a code
  })

  it('is a real button by ROLE (accessibilityRole), and its line is a polite live region (the plan\'s status value)', async () => {
    mock.planValues = { error: 'plan-error', status: 'plan-status' }
    otpRounds('fail')
    await pressSendTo403()
    expect(screen.getByTestId('memorial-handover-resend-note')).toHaveAttribute('aria-live', 'plan-status')
    expect(screen.getByTestId('memorial-handover-send-failed')).toHaveAttribute('aria-live', 'plan-error')
  })

  it.each(['ios', 'android'] as const)('%s: after the wait since the code was SENT the offer appears and is SPOKEN (alone, a status); ⛔ before it', async (os) => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mock.os = os
    otpRounds(MASKED, MASKED)
    await pressSendTo403()
    expect(screen.getByTestId('memorial-handover-body')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(59_000)
    })
    expect(resendButton()).toBeNull()
    expect(announced()).not.toContain(tr('handover.resend_note', 'en'))
    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })
    expect(resendButton()).toBeInTheDocument()
    expect(screen.getByTestId('memorial-handover-resend-note')).toHaveAttribute('aria-live', 'polite')
    // iOS is told here; Android speaks the line's own live region (both ⇒ TalkBack twice)
    expect(announced().includes(tr('handover.resend_note', 'en'))).toBe(os === 'ios')
    // the code input stays: the family may still type the first code
    expect(screen.getByTestId('memorial-handover-code')).toBeInTheDocument()
  })

  it('pressing it clears "did not match" and the typed code; the new code is asked for with ⛔ a Send in between', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    otpRounds(MASKED, MASKED)
    mock.otpVerify.mockResolvedValue(false)
    await pressSendTo403()
    typeCode('999999')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByTestId('memorial-handover-not-verified')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    fireEvent.click(resendButton()!)
    await settle()
    expect(mock.otpSend).toHaveBeenCalledTimes(2)
    expect(screen.queryByTestId('memorial-handover-not-verified')).toBeNull()
    expect(screen.getByTestId('memorial-handover-code')).toHaveValue('')
    expect(mock.send).toHaveBeenCalledTimes(1)
  })

  it('⛔ never without a nominee — not at once, not after the wait: the helpline is the answer there', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    otpRounds('')
    await pressSendTo403()
    expect(screen.getByTestId('memorial-handover-no-nominee')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(10 * 60_000)
    })
    expect(resendButton()).toBeNull()
    expect(screen.getByTestId('memorial-handover')).toContainElement(screen.getByTestId('helpline-cta'))
  })

  it('at most THREE new codes per screen: after the third, only the helpline (the SMS kept failing)', async () => {
    otpRounds('fail', 'fail', 'fail', 'fail')
    await pressSendTo403()
    for (let i = 0; i < 3; i++) {
      fireEvent.click(resendButton()!)
      await settle()
      expect(screen.getByTestId('memorial-handover-send-failed')).toBeInTheDocument() // Z5: each request's own failure
    }
    expect(mock.otpSend).toHaveBeenCalledTimes(4)
    expect(resendButton()).toBeNull()
    expect(screen.queryByTestId('memorial-handover-resend-note')).toBeNull()
    expect(screen.getByTestId('memorial-handover')).toContainElement(screen.getByTestId('helpline-cta'))
    // the failure alone is spoken now (⛔ an offer that is not there)
    expect(announced()[announced().length - 1]).toBe(tr('handover.send_failed', 'en'))
  })

  it('Withdraw gets the same offer (one machine for both)', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    otpRounds('fail', MASKED)
    mock.withdraw.mockRejectedValue(stepUp())
    renderIn(MemorialOutcomeScreen, 'hi')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(resendButton()).toHaveTextContent(tr('handover.resend', 'hi'))
    fireEvent.click(resendButton()!)
    await settle()
    expect(mock.otpSend).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('memorial-handover-body')).toHaveTextContent(tr('handover.body', 'hi', { masked: MASKED }))
    expect(mock.withdraw).toHaveBeenCalledTimes(1)
  })
})

describe('Z5 — each code request shows ITS OWN result: a second SMS that fails never stands under the first one\'s number', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('Withdraw: a code sent → it worked → a later lapse asks a SECOND code whose SMS FAILS ⇒ "could not send", ⛔ the old masked number', async () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    otpRounds(MASKED, 'fail')
    mock.otpVerify.mockResolvedValue(true)
    mock.withdraw.mockRejectedValueOnce(stepUp()).mockResolvedValueOnce({ memorialState: 'withdrawn' }).mockRejectedValueOnce(stepUp())
    renderIn(MemorialOutcomeScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-withdraw'))
    await settle()
    expect(screen.getByTestId('memorial-handover-body')).toHaveTextContent(tr('handover.body', 'en', { masked: MASKED }))
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    fireEvent.click(screen.getByTestId('memorial-withdraw')) // the elevation lapsed
    await settle()
    expect(mock.otpSend).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('memorial-handover-send-failed')).toHaveTextContent(tr('handover.send_failed', 'en'))
    expect(screen.queryByTestId('memorial-handover-body')).toBeNull()
    expect(document.body.textContent).not.toContain(MASKED)
  })

  it('Send: a code sent → "Send a new code" after the wait → that SMS FAILS ⇒ "could not send", ⛔ the first number', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    otpRounds(MASKED, 'fail')
    await pressSendTo403()
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    fireEvent.click(resendButton()!)
    await settle()
    expect(screen.getByTestId('memorial-handover-send-failed')).toBeInTheDocument()
    expect(screen.queryByTestId('memorial-handover-body')).toBeNull()
    expect(screen.queryByTestId('memorial-handover-code')).toBeNull()
  })

  it('while the new SMS is on its way the panel WAITS — ⛔ the old number above an input for a code not yet sent', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    otpRounds(MASKED)
    let release!: () => void
    mock.otpSend.mockImplementationOnce(() => new Promise<void>((r) => (release = r)))
    await pressSendTo403()
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    fireEvent.click(resendButton()!)
    await settle()
    expect(screen.queryByTestId('memorial-handover-body')).toBeNull()
    expect(screen.queryByTestId('memorial-handover-code')).toBeNull()
    mock.otp = { ...mock.otp, masked: '+91·····9999', error: null }
    await act(async () => {
      release()
    })
    await settle()
    expect(screen.getByTestId('memorial-handover-body')).toHaveTextContent(tr('handover.body', 'en', { masked: '+91·····9999' }))
  })
})

describe('Z3 — a key whose SAVE failed (full storage) is held for the screen\'s life and reused before another is minted', () => {
  it('two presses while the storage refuses writes ⇒ the SAME key (a committed Send whose answer was lost replays, ⛔ a second version)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.failWrites = true
    mock.send.mockRejectedValueOnce(new Error('network down')).mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByTestId('memorial-send'))
      await settle()
    }
    expect(mock.send).toHaveBeenCalledTimes(3)
    expect(sentKey(1)).toBe(sentKey(0))
    expect(sentKey(2)).toBe(sentKey(0))
    expect(mock.replace).toHaveBeenCalledWith('/(memorial)/outcome')
  })

  it('…and once the storage takes writes again, the held key is SAVED (it outlives the screen)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.failWrites = true
    mock.send.mockRejectedValue(new Error('network down'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(loadMemorialDraft('m-1', 'pool-1').pending).toBeUndefined()
    mock.failWrites = false
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(sentKey(1)).toBe(sentKey(0))
    expect(loadMemorialDraft('m-1', 'pool-1').pending).toEqual({ idempotencyKey: sentKey(0) })
  })

  it('an EDIT after it ⇒ a NEW key (the held key belongs to the words it was minted for — R6)', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    mock.failWrites = true
    mock.send.mockRejectedValue(new Error('network down'))
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    mock.failWrites = false
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द' })
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(sentKey(1)).not.toBe(sentKey(0))
    expect((mock.send.mock.calls[1]![0] as FormData).get('body')).toBe('नए शब्द')
  })
})

describe('Z4 (b) — the code-verified retry got NO answer, then the words were EDITED (the key dropped) ⇒ the next press is a NEW Send', () => {
  it('its 403 asks a NEW code (⛔ the helpline a refused retry would get), and it goes under a NEW key with the new words', async () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    otpRounds(MASKED, MASKED)
    mock.otpVerify.mockResolvedValue(true)
    mock.send.mockRejectedValueOnce(stepUp()).mockRejectedValueOnce(new Error('network down')).mockRejectedValueOnce(stepUp())
    renderIn(MemorialPreviewScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    typeCode('111111')
    fireEvent.click(screen.getByTestId('memorial-handover-confirm'))
    await settle()
    expect(screen.getByTestId('memorial-refusal')).toHaveTextContent(tr('send.try_again', 'en'))
    saveMemorialDraft('m-1', 'pool-1', { body: 'बदले हुए शब्द' }) // "Change the words" → an edit → back
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect(mock.send).toHaveBeenCalledTimes(3)
    expect(sentKey(2)).not.toBe(sentKey(0))
    expect((mock.send.mock.calls[2]![0] as FormData).get('body')).toBe('बदले हुए शब्द')
    expect(document.body.textContent).not.toContain(tr('handover.still_refused', 'en'))
    expect(screen.getByTestId('memorial-handover')).toBeInTheDocument()
    expect(mock.otpSend).toHaveBeenCalledTimes(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// TalkBack device session (2026-10-27) — T1: the stack hides its header, so each screen SPEAKS its heading on arrival
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

describe('T1 — a memorial screen speaks its heading on arrival (on the device the intro, Write and Preview opened in silence)', () => {
  it.each(
    ALL_LOCALES.flatMap((l) =>
      (['ios', 'android'] as const).flatMap((os) =>
        ([
          ['write', MemorialWriteScreen, 'write.title'],
          ['photo', MemorialPhotoScreen, 'photo.title'],
          ['preview', MemorialPreviewScreen, 'preview.title'],
        ] as const).map(([name, Screen, key]) => [l, os, name, Screen, key] as const),
      ),
    ),
  )('%s / %s %s: the heading, ONCE, on BOTH platforms (a page change has no live region beside it)', (locale, os, _n, Screen, key) => {
    mock.os = os
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    renderIn(Screen, locale)
    expect(arrivals()).toEqual([tr(key, locale)])
  })

  it.each(ALL_LOCALES)('%s intro: the question WITH the name is the arrival', (locale) => {
    renderIn(MemorialIntroScreen, locale)
    expect(arrivals()).toEqual([tr('intro.prompt', locale, { name: 'शांति देवी' })])
  })

  it('the intro whose view arrives AFTER the screen gained focus speaks the question then — once', () => {
    mock.viewState = 'loading'
    const r = renderIn(MemorialIntroScreen, 'en')
    expect(arrivals()).toEqual([])
    mock.viewState = 'data'
    rerenderIn(r, MemorialIntroScreen, 'en')
    rerenderIn(r, MemorialIntroScreen, 'en')
    expect(arrivals()).toEqual([tr('intro.prompt', 'en', { name: 'शांति देवी' })])
  })

  it.each([
    ['photo', MemorialPhotoScreen, 'photo.title'],
    ['preview', MemorialPreviewScreen, 'preview.title'],
  ] as const)('%s: ⛔ re-announced on a re-render while it stays focused', (_n, Screen, key) => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    const r = renderIn(Screen, 'en')
    rerenderIn(r, Screen, 'en')
    rerenderIn(r, Screen, 'en')
    expect(arrivals()).toEqual([tr(key, 'en')])
  })

  it('coming BACK to a screen is a page change too: spoken again on the next focus, ⛔ while it stays focused', () => {
    saveMemorialDraft('m-1', 'pool-1', { body: 'शब्द' })
    const r = renderIn(MemorialWriteScreen, 'en')
    rerenderIn(r, MemorialWriteScreen, 'en')
    expect(arrivals()).toEqual([tr('write.title', 'en')])
    blurScreens()
    focusScreens()
    expect(arrivals()).toEqual([tr('write.title', 'en'), tr('write.title', 'en')])
  })

  it('the intro that shows something else (sent before, no draft) speaks ⛔ question; the outcome speaks ⛔ arrival of its own', () => {
    mock.view = view({ memorialState: 'with_the_trust', submissionId: 's-1', body: 'x', canWithdraw: true })
    renderIn(MemorialIntroScreen, 'en')
    expect(arrivals()).toEqual([])
    cleanup()
    renderIn(MemorialOutcomeScreen, 'en')
    expect(spokenAll()).toEqual([]) // its arrival after a Send is spoken by the Send (R5); on arrival the reader reads it
  })
})

// ─── Story 11b.5a — the family list (KL8 / KL9 / KL15 / KL16; AC2 / AC6 / AC14 / AC15) ──────────────────────────────────

describe('Story 11b.5a — the family screen (AC2)', () => {
  const LIST = [
    { relation: 'wife' as const, name: 'परीक्षा-पत्नी', inPhoto: true as const },
    { relation: 'son' as const, name: 'परीक्षा-पुत्र' },
  ]
  const resend = (over: Partial<MemorialMemberView> = {}) =>
    view({ memorialState: 'approved', submissionId: 's-1', body: 'पहले', kinship: LIST, hasPhoto: true, photoUrl: 'https://signed.example/p.jpg', ...over })

  it.each(['hi', 'en'] as const)('%s: starts EMPTY (⛔ pre-filled), with the guardian line under the body and the places it appears', (locale) => {
    renderIn(MemorialFamilyScreen, locale)
    expect(screen.getByText(tr('family.title', locale))).toBeInTheDocument()
    expect(screen.getByText(tr('family.children_guardian', locale))).toBeInTheDocument()
    expect(screen.getByText(tr('family.where_shown', locale))).toBeInTheDocument()
    expect(screen.queryByTestId('memorial-family-row-0')).toBeNull()
    expect(screen.queryByTestId('memorial-family-start-from-sent')).toBeNull() // ⛔ re-send ⇒ ⛔ offer
  })

  it('add a row, choose one of the fourteen relations, type a name (kept exactly), Next ⇒ the draft holds it and the preview opens', () => {
    renderIn(MemorialFamilyScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-family-add'))
    fireEvent.click(screen.getByTestId('memorial-family-relation-0'))
    const options = screen.getAllByRole('button').filter((b) => b.getAttribute('data-role') === 'radio')
    expect(options.map((b) => b.textContent)).toEqual(
      ['wife', 'husband', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'sons_son', 'daughters_son', 'sons_daughter', 'daughters_daughter', 'daughter_in_law', 'son_in_law'].map((c) => tr(`kinship.${c}`, 'en')),
    )
    fireEvent.click(screen.getByTestId('memorial-family-relation-0-daughter'))
    fireEvent.change(screen.getByTestId('memorial-family-name-0'), { target: { value: '  परीक्षा-पुत्री ' } })
    fireEvent.click(screen.getByTestId('memorial-family-next'))
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toEqual([{ relation: 'daughter', name: '  परीक्षा-पुत्री ' }])
    expect(mock.push).toHaveBeenCalledWith('/(memorial)/preview')
  })

  it('an unfinished row blocks Next with copy 2.11 (spoken); "Continue without a list" clears it and goes on', () => {
    saveMemorialDraft('m-1', 'pool-1', { kinship: [{ name: 'बिना रिश्ते' }] })
    renderIn(MemorialFamilyScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-family-next'))
    expect(screen.getByTestId('memorial-family-incomplete')).toHaveTextContent(tr('family.row_incomplete', 'en'))
    expect(mock.push).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('memorial-family-without'))
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toBeUndefined()
    expect(mock.push).toHaveBeenCalledWith('/(memorial)/preview')
  })

  // RP30 — the line is already on screen at the second press, so nothing changes for the hook (keyed on the text): on iOS the
  // press would be silent. iOS speaks it once per repeat; Android ⛔ (TalkBack re-reads the standing live region at a press —
  // a call here would double it; device-checked in 6.36f D1, ⛔ for this screen).
  it.each(ALL_LOCALES.flatMap((l) => (['ios', 'android'] as const).map((os) => [l, os] as const)))(
    '%s / %s: RP30 — a SECOND Next on an unfinished row is spoken again on iOS (⛔ a silent press); Android leaves it to the live region',
    (locale, os) => {
      mock.os = os
      saveMemorialDraft('m-1', 'pool-1', { kinship: [{ name: 'बिना रिश्ते' }] })
      renderIn(MemorialFamilyScreen, locale)
      const line = tr('family.row_incomplete', locale)
      fireEvent.click(screen.getByTestId('memorial-family-next'))
      const first = announced().filter((a) => a === line).length
      expect(first).toBe(os === 'ios' ? 1 : 0) // the first press: the hook on iOS, the live region on Android
      fireEvent.click(screen.getByTestId('memorial-family-next'))
      fireEvent.click(screen.getByTestId('memorial-family-next'))
      expect(announced().filter((a) => a === line)).toHaveLength(os === 'ios' ? first + 2 : 0)
      expect(mock.push).not.toHaveBeenCalled()
    },
  )

  it.each(['hi', 'en'] as const)('%s: RP31 — a BLANK name (spaces only) falls back to copy 2.15 / the plain tick label, ⛔ the name', (locale) => {
    mock.view = resend()
    saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true, kinship: [{ relation: 'son', name: '   ' }] })
    renderIn(MemorialFamilyScreen, locale)
    expect(screen.getByTestId('memorial-family-remove-0')).toHaveAttribute('aria-label', tr('family.remove_empty_a11y', locale))
    expect(screen.getByTestId('memorial-family-in-photo-0')).toHaveAttribute('aria-label', tr('family.in_photo', locale))
  })

  it.each(['hi', 'en'] as const)('%s: ⭐ KL15 — the "In the photo" tick shows ONLY when the Send will carry a photo; it is a checkbox with its state', (locale) => {
    saveMemorialDraft('m-1', 'pool-1', { kinship: [{ relation: 'son', name: 'परीक्षा-पुत्र' }] })
    const { unmount } = renderIn(MemorialFamilyScreen, locale)
    expect(screen.queryByTestId('memorial-family-in-photo-0')).toBeNull()
    unmount()
    mock.view = resend()
    saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true })
    renderIn(MemorialFamilyScreen, locale)
    const tick = screen.getByTestId('memorial-family-in-photo-0')
    expect(tick).toHaveAttribute('data-role', 'checkbox')
    expect(tick).toHaveAttribute('aria-label', tr('family.in_photo_a11y', locale, { name: 'परीक्षा-पुत्र' }))
    expect(tr('family.in_photo_a11y', locale, { name: 'परीक्षा-पुत्र' })).toContain('परीक्षा-पुत्र')
    fireEvent.click(tick)
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toEqual([{ relation: 'son', name: 'परीक्षा-पुत्र', inPhoto: true }])
    expect(screen.getByTestId('memorial-family-in-photo-0')).toHaveAttribute('aria-checked', 'true')
  })

  it('⭐ re-send — "Start from the list I sent" fills the rows on a TAP (⛔ automatically); ticks copied only with the previous photo kept', () => {
    mock.view = resend()
    const { unmount } = renderIn(MemorialFamilyScreen, 'en')
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toBeUndefined() // ⛔ automatic
    fireEvent.click(screen.getByTestId('memorial-family-start-from-sent'))
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toEqual([
      { relation: 'wife', name: 'परीक्षा-पत्नी' },
      { relation: 'son', name: 'परीक्षा-पुत्र' },
    ])
    unmount()
    mock.store.clear()
    saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true })
    renderIn(MemorialFamilyScreen, 'en')
    fireEvent.click(screen.getByTestId('memorial-family-start-from-sent'))
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toEqual(LIST)
    expect(screen.queryByTestId('memorial-family-start-from-sent')).toBeNull() // only while the rows are empty
  })

  it.each(['hi', 'en'] as const)('%s: at 20 rows "Add someone" gives way to the limit line (the real t(), the count filled in)', (locale) => {
    saveMemorialDraft('m-1', 'pool-1', { kinship: Array.from({ length: 20 }, () => ({ relation: 'son' as const, name: 'न' })) })
    renderIn(MemorialFamilyScreen, locale)
    expect(screen.queryByTestId('memorial-family-add')).toBeNull()
    expect(screen.getByTestId('memorial-family-limit')).toHaveTextContent(tr('family.limit_reached', locale, { count: '20' }))
    expect(tr('family.limit_reached', locale, { count: '20' })).toContain('20')
  })

  it.each(['hi', 'en'] as const)('%s: the interpolated keys render through the real t() (remove label, over-limit line)', (locale) => {
    saveMemorialDraft('m-1', 'pool-1', { kinship: [{ relation: 'son', name: 'न'.repeat(203) }, { name: '' }] })
    renderIn(MemorialFamilyScreen, locale)
    expect(screen.getByTestId('memorial-family-remove-0')).toHaveAttribute('aria-label', tr('family.remove_a11y', locale, { name: 'न'.repeat(203) }))
    expect(screen.getByTestId('memorial-family-remove-1')).toHaveAttribute('aria-label', tr('family.remove_empty_a11y', locale))
    expect(screen.getByText(tr('family.name_over_limit', locale, { count: '3' }))).toBeInTheDocument()
    expect(tr('family.name_over_limit', locale, { count: '3' })).toContain('3')
  })

  // RP7 (AC2) — the re-send after the Trust left something out can keep the list too (the state the family sees is
  // `approved_with_omissions`, not only `approved`).
  it('⭐ AC2 — a re-send after approved_with_omissions can keep the list: "Start from the list I sent" is offered on a TAP and fills the rows', () => {
    mock.view = resend({ memorialState: 'approved_with_omissions', kinshipLeftOut: [{ index: 1, reason: 'identifies_a_child' }] })
    renderIn(MemorialFamilyScreen, 'en')
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toBeUndefined() // never automatic
    fireEvent.click(screen.getByTestId('memorial-family-start-from-sent'))
    expect(loadMemorialDraft('m-1', 'pool-1').kinship).toEqual([
      { relation: 'wife', name: 'परीक्षा-पत्नी' },
      { relation: 'son', name: 'परीक्षा-पुत्र' },
    ])
    expect(screen.queryByTestId('memorial-family-start-from-sent')).toBeNull() // only while the rows are empty
  })

  // RP18 (AC2) — the name cap is 200 CODE POINTS: an astral name (two UTF-16 units per code point) of exactly 200 is within
  // it, 201 is one over — a `.length` count would call 200 "a hundred over".
  it.each(['hi', 'en'] as const)('%s: an ASTRAL name of exactly 200 code points shows no over-limit line; 201 shows "about 1"', (locale) => {
    const astral = (n: number) => String.fromCodePoint(0x1f468).repeat(n)
    saveMemorialDraft('m-1', 'pool-1', { kinship: [{ relation: 'son', name: astral(200) }] })
    renderIn(MemorialFamilyScreen, locale)
    expect(screen.queryByText(tr('family.name_over_limit', locale, { count: '1' }))).toBeNull()
    expect(screen.queryByText(tr('family.name_over_limit', locale, { count: '200' }))).toBeNull()
    fireEvent.change(screen.getByTestId('memorial-family-name-0'), { target: { value: astral(201) } })
    expect(screen.getByText(tr('family.name_over_limit', locale, { count: '1' }))).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('memorial-family-next'))
    expect(mock.push).not.toHaveBeenCalled() // 201 is an unfinished row: it blocks Next
    fireEvent.change(screen.getByTestId('memorial-family-name-0'), { target: { value: astral(200) } })
    fireEvent.click(screen.getByTestId('memorial-family-next'))
    expect(mock.push).toHaveBeenCalledWith('/(memorial)/preview')
  })

  // RP2 (checklist 13 (d)) — the two states that appear on the family screen with no live region beside them are SPOKEN: once at
  // the crossing (never per keystroke), on both platforms, in both languages.
  describe('RP2 — the over-limit name and the limit line are announced once at the crossing', () => {
    const over = (locale: 'hi' | 'en', n: number) => tr('family.name_over_limit', locale, { count: String(n) })
    const typeName = (i: number, n: number) =>
      fireEvent.change(screen.getByTestId(`memorial-family-name-${i}`), { target: { value: 'न'.repeat(n) } })
    const finished = (n: number) => ({ relation: 'son' as const, name: 'न'.repeat(n) })

    it.each(ALL_LOCALES.flatMap((l) => (['ios', 'android'] as const).map((os) => [l, os] as const)))(
      '%s / %s: the crossing is spoken once (not per keystroke), and again after coming back under',
      (locale, os) => {
        mock.os = os
        saveMemorialDraft('m-1', 'pool-1', { kinship: [finished(200)] })
        renderIn(MemorialFamilyScreen, locale)
        expect(announced()).toEqual([]) // 200 is within the cap
        typeName(0, 203)
        expect(screen.getByText(over(locale, 3))).toBeInTheDocument()
        expect(announced()).toEqual([over(locale, 3)]) // the crossing, once
        typeName(0, 205)
        typeName(0, 209)
        expect(announced()).toHaveLength(1) // typing further past the cap is not re-announced
        typeName(0, 10)
        expect(announced()).toHaveLength(1) // back under: nothing is spoken
        typeName(0, 201)
        expect(announced()).toEqual([over(locale, 3), over(locale, 1)])
      },
    )

    it('a draft restored already over the cap is the baseline (silent); only a crossing after it is spoken', () => {
      saveMemorialDraft('m-1', 'pool-1', { kinship: [finished(203)] })
      renderIn(MemorialFamilyScreen, 'en')
      expect(screen.getByText(over('en', 3))).toBeInTheDocument()
      expect(announced()).toEqual([])
      typeName(0, 205)
      expect(announced()).toEqual([])
      typeName(0, 10)
      typeName(0, 201)
      expect(announced()).toEqual([over('en', 1)])
    })

    it('each row crosses on its own: a second name going over is spoken while the first is still over', () => {
      saveMemorialDraft('m-1', 'pool-1', { kinship: [finished(203), finished(1)] })
      renderIn(MemorialFamilyScreen, 'en')
      expect(announced()).toEqual([])
      typeName(1, 202)
      expect(announced()).toEqual([over('en', 2)])
      typeName(0, 210) // the first row stays over: still not re-announced
      expect(announced()).toHaveLength(1)
    })

    it('removing a row does not make a name that was already over its cap sound new at its new position', () => {
      saveMemorialDraft('m-1', 'pool-1', { kinship: [finished(1), finished(203)] })
      renderIn(MemorialFamilyScreen, 'en')
      expect(announced()).toEqual([])
      fireEvent.click(screen.getByTestId('memorial-family-remove-0'))
      expect(screen.getByTestId('memorial-family-name-0')).toHaveValue('न'.repeat(203))
      expect(screen.getByText(over('en', 3))).toBeInTheDocument()
      expect(announced()).toEqual([])
    })

    it.each(ALL_LOCALES.flatMap((l) => (['ios', 'android'] as const).map((os) => [l, os] as const)))(
      '%s / %s: the 20th row replaces "Add someone" with the limit line, and that is spoken once; again at the next 20th',
      (locale, os) => {
        mock.os = os
        saveMemorialDraft('m-1', 'pool-1', { kinship: Array.from({ length: 19 }, () => finished(1)) })
        renderIn(MemorialFamilyScreen, locale)
        expect(announced()).toEqual([])
        expect(screen.queryByTestId('memorial-family-limit')).toBeNull()
        fireEvent.click(screen.getByTestId('memorial-family-add'))
        const limit = tr('family.limit_reached', locale, { count: '20' })
        expect(screen.getByTestId('memorial-family-limit')).toHaveTextContent(limit)
        expect(announced()).toEqual([limit])
        fireEvent.click(screen.getByTestId('memorial-family-remove-0')) // back to 19: the button returns, nothing is spoken
        expect(screen.getByTestId('memorial-family-add')).toBeInTheDocument()
        expect(announced()).toEqual([limit])
        fireEvent.click(screen.getByTestId('memorial-family-add'))
        expect(announced()).toEqual([limit, limit])
      },
    )

    it('a draft restored already at 20 rows is the baseline: the limit line is drawn, not spoken', () => {
      saveMemorialDraft('m-1', 'pool-1', { kinship: Array.from({ length: 20 }, () => finished(1)) })
      renderIn(MemorialFamilyScreen, 'en')
      expect(screen.getByTestId('memorial-family-limit')).toBeInTheDocument()
      expect(announced()).toEqual([])
    })
  })

  // KL15 — a tick points at the photo it was given for: a CHANGE of the photo choice clears every tick (the Photo screen),
  // a re-press of the choice the draft already holds (RP9) does not.
  describe('KL15 — the Photo screen and the ticks (RP7, RP9)', () => {
    const UNTICKED = [
      { relation: 'wife' as const, name: 'परीक्षा-पत्नी' },
      { relation: 'son' as const, name: 'परीक्षा-पुत्र' },
    ]
    const picked = () => {
      mock.files.add('file:///docs/p.jpg')
      return { photoFileName: 'p.jpg', photoMime: 'image/jpeg' as const, altText: 'विवरण', kinship: LIST }
    }
    const pickNew = async (label: string) => {
      const picker = await import('expo-image-picker')
      vi.mocked(picker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///picker/new.jpg', mimeType: 'image/jpeg' }] } as never)
      fireEvent.click(screen.getByText(label))
      await settle()
    }

    it('a photo change on the Photo screen clears every tick: "without" while the previous photo is kept', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true, altText: 'विवरण', kinship: LIST })
      renderIn(MemorialPhotoScreen, 'en')
      fireEvent.click(screen.getByText(tr('photo.without', 'en')))
      expect(loadMemorialDraft('m-1', 'pool-1').kinship).toEqual(UNTICKED)
    })

    it('… "without" while a photo is picked', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', picked())
      renderIn(MemorialPhotoScreen, 'en')
      fireEvent.click(screen.getByText(tr('photo.without', 'en')))
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.kinship).toEqual(UNTICKED)
      expect(d.photoFileName).toBeUndefined()
      expect(d.keepPreviousPhoto).toBe(false)
    })

    it('… "use the photo I sent before" while a photo is picked (the keep-previous branch)', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', picked())
      renderIn(MemorialPhotoScreen, 'en')
      fireEvent.click(screen.getByTestId('memorial-use-previous-photo'))
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.kinship).toEqual(UNTICKED)
      expect(d.photoFileName).toBeUndefined()
      expect(d.keepPreviousPhoto).toBe(true)
    })

    it('… a NEW pick over the previous photo it was kept from (the new-pick branch)', async () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true, altText: 'विवरण', kinship: LIST })
      renderIn(MemorialPhotoScreen, 'en')
      await pickNew(tr('photo.choose', 'en'))
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.photoFileName).toBeDefined()
      expect(d.keepPreviousPhoto).toBe(false)
      expect(d.kinship).toEqual(UNTICKED)
    })

    it('… and a NEW pick over a photo picked before (the ticks pointed at the one it replaces)', async () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', picked())
      renderIn(MemorialPhotoScreen, 'en')
      await pickNew(tr('photo.choose_other', 'en'))
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.photoFileName).not.toBe('p.jpg')
      expect(d.kinship).toEqual(UNTICKED)
    })

    it('RP9 — "use the photo I sent before" while it is ALREADY kept changes nothing: the ticks stay', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true, altText: 'विवरण', kinship: LIST })
      renderIn(MemorialPhotoScreen, 'en')
      fireEvent.click(screen.getByTestId('memorial-use-previous-photo'))
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.kinship).toEqual(LIST)
      expect(d.keepPreviousPhoto).toBe(true)
      expect(d.altText).toBe('विवरण')
    })

    it('RP9 — "without" with no photo picked and none kept changes nothing either: the ticks stay', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', { kinship: LIST })
      renderIn(MemorialPhotoScreen, 'en')
      fireEvent.click(screen.getByText(tr('photo.without', 'en')))
      expect(loadMemorialDraft('m-1', 'pool-1').kinship).toEqual(LIST)
      expect(mock.push).toHaveBeenCalledWith('/(memorial)/family')
    })

    it('RP9 — choosing "the photo I sent before" when there was none IS a change: the ticks go', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', { kinship: LIST })
      renderIn(MemorialPhotoScreen, 'en')
      fireEvent.click(screen.getByTestId('memorial-use-previous-photo'))
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.keepPreviousPhoto).toBe(true)
      expect(d.kinship).toEqual(UNTICKED)
    })

    // RP25 — after a FAILED save the stored draft is OLDER than the screen (X1): the choice the family is holding is the SCREEN's,
    // so a re-press of it changes nothing even when the stored draft names another choice. (Storage is made to disagree on
    // purpose — only the failed-save branch reads `shown.current`; a read of storage would see "none" and clear the ticks.)
    it('RP25 — after a FAILED save, a re-press of the choice the SCREEN holds keeps the ticks, ⛔ not judged by the older stored draft', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true, altText: 'विवरण', kinship: LIST })
      renderIn(MemorialPhotoScreen, 'en')
      mock.failWrites = true
      fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'नया विवरण' } }) // this save FAILS
      mock.failWrites = false
      expect(loadMemorialDraft('m-1', 'pool-1').altText).toBe('विवरण') // the stored draft really is older than the screen
      saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: false }) // …and names another choice ("none")
      fireEvent.click(screen.getByTestId('memorial-use-previous-photo'))
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.keepPreviousPhoto).toBe(true)
      expect(d.kinship).toEqual(LIST) // the ticks stay: the screen already held "the photo I sent before"
      expect(d.altText).toBe('नया विवरण') // and the next save wrote the screen's choices (X1), not the press alone
    })

    // RP29 — a failed save here skips the focus re-read (V9 (a)), so the screen still holds the list; the family then removed it on
    // the family screen ("Continue without a list"). A photo change must ⛔ write the screen's stale list back.
    it('RP29 — after a FAILED save, a photo change does ⛔ bring back a list the family removed elsewhere', () => {
      mock.view = resend()
      saveMemorialDraft('m-1', 'pool-1', { keepPreviousPhoto: true, altText: 'विवरण', kinship: LIST })
      renderIn(MemorialPhotoScreen, 'en')
      mock.failWrites = true
      fireEvent.change(screen.getByTestId('memorial-alt-text'), { target: { value: 'नया विवरण' } }) // this save FAILS
      mock.failWrites = false
      saveMemorialDraft('m-1', 'pool-1', { kinship: undefined }) // the family screen: "Continue without a list"
      fireEvent.click(screen.getByText(tr('photo.without', 'en'))) // a CHANGE (previous → none)
      const d = loadMemorialDraft('m-1', 'pool-1')
      expect(d.keepPreviousPhoto).toBe(false)
      expect(d.kinship).toBeUndefined()
    })
  })
})

describe('Story 11b.5a — the preview and the Send carry the list (AC2 / AC6)', () => {
  // The hostile name's bidi controls, by code point (never written raw in source): an unterminated RLO, and the isolate the preview draws it in.
  const RLO = cpoint(0x202e)
  const PDF = cpoint(0x202c)
  const FSI = cpoint(0x2068)
  const PDI = cpoint(0x2069)

  it.each(['hi', 'en'] as const)('%s: the preview draws the grouped rows (plural English label, names isolated); the Send carries exactly them', async (locale) => {
    saveMemorialDraft('m-1', 'pool-1', {
      body: 'शब्द',
      kinship: [
        { relation: 'son', name: 'अमित' },
        { relation: 'wife', name: 'सुनीता', inPhoto: true },
        { relation: 'son', name: `राहुल${RLO}` },
      ],
    })
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, locale)
    const block = screen.getByTestId('memorial-preview-kinship')
    expect(block).toHaveTextContent(tr('kinship.heading', locale))
    const lines = Array.from(block.children).slice(1).map((c) => c.textContent)
    expect(lines).toEqual([
      `${tr('kinship.wife', locale)}: सुनीता`,
      `${tr('kinship.son_plural', locale)}: अमित, ${FSI}राहुल${RLO}${PDF}${PDI}`,
    ])
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    const form = mock.send.mock.calls[0]![0] as FormData
    // ⛔ photo in this Send ⇒ the tick is STRIPPED from the part.
    expect(JSON.parse(form.get('kinship') as string)).toEqual([
      { relation: 'son', name: 'अमित' },
      { relation: 'wife', name: 'सुनीता' },
      { relation: 'son', name: `राहुल${RLO}` },
    ])
  })

  it('⛔ list ⇒ ⛔ kinship part; a re-send without a list when the last version had one says so', async () => {
    mock.view = view({ memorialState: 'approved', submissionId: 's-1', body: 'पहले', kinship: [{ relation: 'son', name: 'x' }] })
    saveMemorialDraft('m-1', 'pool-1', { body: 'नए शब्द' })
    mock.send.mockResolvedValue(SENT_OK)
    renderIn(MemorialPreviewScreen, 'en')
    expect(screen.getByTestId('memorial-preview-no-family-list')).toHaveTextContent(tr('preview.no_family_list', 'en'))
    fireEvent.click(screen.getByText(tr('preview.change_family', 'en')))
    expect(mock.push).toHaveBeenCalledWith('/(memorial)/family')
    fireEvent.click(screen.getByTestId('memorial-send'))
    await settle()
    expect((mock.send.mock.calls[0]![0] as FormData).get('kinship')).toBeNull()
  })
})

describe('Story 11b.5a — the outcome tells each left-out entry and its reason (AC6 / AC14)', () => {
  const omitted = (over: Partial<MemorialMemberView> = {}) =>
    view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body: 'शब्द',
      kinship: [
        { relation: 'wife', name: 'परीक्षा-पत्नी' },
        { relation: 'daughters_daughter', name: 'परीक्षा-नातिन' },
      ],
      kinshipLeftOut: [{ index: 1, reason: 'identifies_a_child' }],
      canSend: true,
      ...over,
    })

  it.each(['hi', 'en'] as const)('%s: one line per left-out entry — relation, name, then the reason (copy 4.1)', (locale) => {
    mock.view = omitted()
    renderIn(MemorialOutcomeScreen, locale)
    const lines = screen.getAllByTestId('memorial-kinship-left-out')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toHaveTextContent(
      `${tr('outcome.kinship_left_out', locale, { relation: tr('kinship.daughters_daughter', locale), name: 'परीक्षा-नातिन' })} ${tr('outcome.reason', locale, { reason: tr('reason.identifies_a_child', locale) })}`,
    )
  })

  it.each(['hi', 'en'] as const)('%s: ⭐ KL16 — under the declaration the child reason reads copy 4.3, ⛔ the plain one', (locale) => {
    mock.view = omitted({ guardianDeclaration: true })
    renderIn(MemorialOutcomeScreen, locale)
    const line = screen.getByTestId('memorial-kinship-left-out')
    expect(line).toHaveTextContent(tr('outcome.reason', locale, { reason: tr('outcome.reason_child_undeclared', locale) }))
    // (the English 4.3 begins with the plain phrase, so the check is on how the line ENDS)
    expect(line.textContent?.endsWith(tr('reason.identifies_a_child', locale))).toBe(false)
  })
})

// RP7 (KL16) — copy 4.3 is not only the kinship line's: EVERY reason line of the outcome that carries `identifies_a_child` reads it
// under the declaration — the words' markers (`MemorialText showReasons`), the photo, a part of the photo description, the earlier
// approval the Trust withdrew, and a decision's own reason — and the plain wording everywhere else. (A photo left out takes its
// description with it, so the photo line and the description-part line are two views.)
describe('Story 11b.5a — KL16: copy 4.3 reaches every reason line of the outcome, not only the kinship one', () => {
  const body = 'एक दो तीन'
  const cut = body.indexOf('दो')
  const bodyPart = { field: 'body' as const, start: cut, end: cut + 2, reason: 'identifies_a_child' as const }
  const photoGone: Partial<MemorialMemberView> = { photoLeftOut: { reason: 'identifies_a_child' }, omissions: [bodyPart] }
  const altPartGone: Partial<MemorialMemberView> = {
    omissions: [bodyPart, { field: 'altText', start: 0, end: 5, reason: 'identifies_a_child' }],
  }
  const declared = (over: Partial<MemorialMemberView> = {}) =>
    view({
      memorialState: 'approved_with_omissions',
      submissionId: 's-1',
      body,
      altText: 'alpha beta',
      hasPhoto: true,
      earlierApprovalWithdrawn: { reasonCode: 'identifies_a_child' },
      guardianDeclaration: true,
      ...over,
    })
  const VIEWS = [
    ['the photo left out', photoGone, 'memorial-photo-left-out'],
    ['a part of the photo description left out', altPartGone, 'memorial-alt-text-left-out'],
  ] as const
  const line = (locale: 'hi' | 'en', key: string) => tr('outcome.reason', locale, { reason: tr(key, locale) })
  // The reason line is the END of each element's text; the English 4.3 begins with the plain phrase, so the check is on how it ENDS.
  const endsWith = (el: HTMLElement, text: string) => el.textContent?.endsWith(text) === true
  const reasonLines = (testID: string) => [
    screen.getByTestId('memorial-omitted-reason'),
    screen.getByTestId(testID),
    screen.getByTestId('memorial-earlier-withdrawn'),
  ]

  it.each(VIEWS.flatMap(([what, over, testID]) => (['hi', 'en'] as const).map((l) => [l, what, over, testID] as const)))(
    '%s, %s: under the declaration, the marker, that line and the earlier withdrawal all read 4.3',
    (locale, _what, over, testID) => {
      mock.view = declared(over)
      renderIn(MemorialOutcomeScreen, locale)
      for (const el of reasonLines(testID)) {
        expect(endsWith(el, line(locale, 'outcome.reason_child_undeclared'))).toBe(true)
        expect(endsWith(el, line(locale, 'reason.identifies_a_child'))).toBe(false)
      }
    },
  )

  it.each(VIEWS.flatMap(([what, over, testID]) => (['hi', 'en'] as const).map((l) => [l, what, over, testID] as const)))(
    '%s, %s: without the declaration, the same lines read the plain wording',
    (locale, _what, over, testID) => {
      mock.view = declared({ ...over, guardianDeclaration: false })
      renderIn(MemorialOutcomeScreen, locale)
      for (const el of reasonLines(testID)) {
        expect(endsWith(el, line(locale, 'reason.identifies_a_child'))).toBe(true)
        expect(el.textContent).not.toContain(tr('outcome.reason_child_undeclared', locale))
      }
    },
  )

  it.each(['hi', 'en'] as const)('%s: a decision\'s own reason (not approved) reads 4.3 under the declaration too', (locale) => {
    mock.view = view({ memorialState: 'not_approved', submissionId: 's-1', body, reasonCode: 'identifies_a_child', guardianDeclaration: true })
    renderIn(MemorialOutcomeScreen, locale)
    expect(screen.getByText(line(locale, 'outcome.reason_child_undeclared'))).toBeInTheDocument()
    expect(screen.queryByText(line(locale, 'reason.identifies_a_child'))).toBeNull()
  })
})
