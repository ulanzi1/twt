// @vitest-environment jsdom
// Story 6.36e (Task 5; AC5; V3) — the nominee form's MEMBER MARK, EXECUTED with React DOM and mocked native primitives (the
// 6.36b render-harness shape; native layout and a real screen reader still need a device —
// [[feedback_record_unattested_no_backfill]]). MOCKED: `react-native` (+ `announceForAccessibility`), `tamagui` (plain elements),
// `@twt/i18n/react` (the form's common `useT` echoes keys), `lib/mmkv`; REAL: the `nominee_link` translator (`t()`),
// `AnnouncedText`, `announcementPlan`, `lib/nominee-links.ts`:
//   · an UNEDITED re-save sends each kept mark as `{ kind: 'keep', linkId }`;
//   · *Remove mark* sends ⛔ mark (the live one ends at save) and SAYS so;
//   · editing a marked slot's name ASKS *"Is this still …?"* first — a save is refused until it is answered; *Keep the mark*
//     sends the keep, *Remove it* sends none; ⭐ the question is SPOKEN on iOS (family 13(d) — the REAL `AnnouncedText` and the
//     REAL `announcementPlan` run — the mocks are listed above);
//   · ⭐ code review 2026-10-24 — the question SURVIVES a remount: the form is unmounted after an edit and remounted with the
//     slots it reported (what a pick on the other slot, a stale reload or a resumed draft does) — it is still asked, and the
//     save is still refused. Before, the question lived in component state and the mark rode onto a different person;
//   · ⭐ round 3 — the refusal "Answer the question … first" is ⛔ stored text: it shows only while a question is still open (an
//     edit reverted, a slot removed ⇒ gone); a name REPLACED or CLEARED after a pick asks, a typo fixed by a backspace does ⛔;
//   · device run 2026-10-24 — every control of the member mark (*Find…*, *Pick a different member*, *Remove mark*, *Keep the mark*,
//     *Remove it*) is at least 48 dp (they were 36 dp on the emulator);
//   · a slot the form ADDS carries ⛔ mark (`memberLink: null`) — ⛔ `undefined`, which a reload gives the rank's OLD mark;
//   · the copy goes through the REAL `t()` — a token the form forgets to supply THROWS here, as it would on a phone;
//   · the SIGNUP form (⛔ `link` prop) sends ⛔ mark even from slots that carry one, and shows ⛔ control;
//   · `canFind: false` (a caller who may not find — V11) hides the find entry but still shows and keeps a mark.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { announce } = vi.hoisted(() => ({ announce: vi.fn() }))
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AccessibilityInfo: { announceForAccessibility: announce } }))
vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key }))
// The REAL translator for the `nominee_link` namespace (⛔ a stub that echoes keys and can never throw).
vi.mock('../../lib/nominee-link-i18n', async () => {
  const { t } = await import('@twt/i18n')
  return {
    useNomineeLinkT: () => (key: string, params?: Record<string, string | number>) => t(key, params, { locale: 'en', namespace: 'nominee_link' }),
  }
})
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
vi.mock('tamagui', async () => {
  const { createElement } = await import('react')
  const container = ({ children, accessibilityRole, testID }: { children?: React.ReactNode; accessibilityRole?: string; testID?: string }) =>
    createElement('div', { role: accessibilityRole === 'alert' ? 'alert' : undefined, 'data-testid': testID }, children)
  return {
    H2: container, Paragraph: container, Text: container, XStack: container, YStack: container,
    Spinner: () => createElement('span', null, 'spinner'),
    Input: ({ value, onChangeText, accessibilityLabel }: { value: string; onChangeText: (v: string) => void; accessibilityLabel?: string }) =>
      createElement('input', { value, 'aria-label': accessibilityLabel, onChange: (e: { target: { value: string } }) => onChangeText(e.target.value) }),
    Button: ({ children, onPress, disabled, accessibilityLabel, height }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string; height?: number }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel, 'data-height': height }, children),
  }
})

import { NomineeForm, type NomineeFormEntry } from '../../components/life-events/NomineeForm'
import { slotFingerprint } from '../../lib/nominee-links'

const L1 = '11111111-1111-4111-8111-111111111111'
const NAME = 'Asha Devi'
const MOBILE = '9876543210'
/** A slot whose mark was last CONFIRMED for it — what a draft the member left alone, or a just-saved form, carries. */
const marked = (over: Partial<NomineeFormEntry> = {}): NomineeFormEntry => ({
  name: NAME,
  relationship: 'spouse',
  mobile: MOBILE,
  address: '',
  memberLink: { kind: 'keep', linkId: L1, label: 'confirmed', name: 'Asha D.', confirmedFor: slotFingerprint({ name: NAME, mobile: MOBILE }) },
  ...over,
})

function renderForm(opts: { link?: { canFind: boolean; onFind: (rank: 1 | 2) => void } | null; forms?: NomineeFormEntry[] } = {}) {
  const onSubmit = vi.fn()
  const reported: NomineeFormEntry[][] = []
  const link = opts.link === null ? undefined : (opts.link ?? { canFind: true, onFind: vi.fn() })
  const props = {
    title: 'T',
    intro: 'I',
    submitLabel: 'Save',
    busy: false,
    error: null,
    onSubmit,
    onFormsChange: (forms: NomineeFormEntry[]) => reported.push(forms),
    ...(link ? { link } : {}),
  }
  render(createElement(NomineeForm, { ...props, initialForms: opts.forms ?? [marked()] }))
  return { onSubmit, reported, props }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('NomineeForm — the member mark (Story 6.36e, V3)', () => {
  it('an UNEDITED re-save sends the kept mark as a KEEP (its link id only); the label shows the registered name', async () => {
    const { onSubmit } = renderForm()
    expect(screen.getByText('Confirmed — Asha D.')).toBeInTheDocument()
    expect(screen.queryByTestId('nominee-mark-question-0')).toBeNull() // confirmed for this slot ⇒ nothing to ask
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith([
      { name: NAME, relationship: 'spouse', mobile: MOBILE, memberLink: { kind: 'keep', linkId: L1 } },
    ])
  })

  it('*Remove mark* sends ⛔ mark — and SAYS the mark was removed (the buttons vanish with it)', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: /^Remove mark/ }))
    expect(screen.getByText('Mark removed.')).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('Mark removed.') // iOS: spoken, ⛔ only reflected in a prop
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.name' }), 'x')
    expect(screen.queryByText('Mark removed.')).toBeNull() // … and ⛔ left standing once the member edits on
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).not.toHaveProperty('memberLink')
  })

  it('editing a marked slot\'s name ASKS first — SPOKEN on iOS; the save is refused (and said) until answered; *Keep the mark* keeps it', async () => {
    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.name' }), 'x')
    expect(screen.getByText('Is this still Asha D.?')).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('Is this still Asha D.?') // family 13(d): ANNOUNCED, ⛔ merely rendered
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Answer the question about the member mark first.')
    expect(announce).toHaveBeenCalledWith('Answer the question about the member mark first.')
    await userEvent.click(screen.getByRole('button', { name: /^Keep the mark/ }))
    expect(screen.getByText('Mark kept.')).toBeInTheDocument()
    expect(announce).toHaveBeenCalledWith('Mark kept.') // the question closes WITH words — ⛔ in silence
    expect(screen.queryByTestId('nominee-mark-question-0')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull() // the stale refusal does not outlive its answer
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).toMatchObject({ name: 'Asha Devix', memberLink: { kind: 'keep', linkId: L1 } })
  })

  it('⭐ the question SURVIVES a remount: the slots a form reported after an edit, re-mounted, are still asked — ⛔ the mark rides onto the new person', async () => {
    const first = renderForm()
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.name' }), 'x')
    expect(screen.getByText('Is this still Asha D.?')).toBeInTheDocument()
    const reported = first.reported.at(-1)! // what the parent keeps (`latestForms` / the draft)
    cleanup() // a pick on the other slot, a stale reload, a resumed draft: the keyed form is rebuilt from those slots
    const again = renderForm({ forms: reported })
    expect(screen.getByRole('textbox', { name: 'nominees.name' })).toHaveValue('Asha Devix')
    expect(screen.getByText('Is this still Asha D.?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(again.onSubmit).not.toHaveBeenCalled() // ⛔ { kind: 'keep' } for a slot that now names someone else
    expect(screen.getByRole('alert')).toHaveTextContent('Answer the question about the member mark first.')
  })

  it('a draft written by an earlier build (a mark with ⛔ `confirmedFor`) is ASKED, ⛔ trusted', async () => {
    const { onSubmit } = renderForm({ forms: [marked({ memberLink: { kind: 'keep', linkId: L1, label: 'confirmed', name: 'Asha D.' } })] })
    expect(screen.getByText('Is this still Asha D.?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('⭐ a pick made BEFORE the name is completed by the name typed next — ⛔ "Is this still …?" on the first keystroke; a LATER edit asks', async () => {
    // what a pick on an EMPTY slot leaves: no name, the offered number, the mark confirmed for exactly that
    const emptyFp = slotFingerprint({ name: '', mobile: MOBILE })
    const { onSubmit } = renderForm({
      forms: [{ name: '', relationship: 'spouse', mobile: MOBILE, address: '', memberLink: { kind: 'new', mobile: '+919876500001', foundBy: 'contacts', savedName: 'Meena', confirmedFor: emptyFp, namePending: true } }],
    })
    expect(screen.queryByTestId('nominee-mark-question-0')).toBeNull()
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.name' }), 'Asha')
    expect(screen.queryByTestId('nominee-mark-question-0')).toBeNull() // the member just made this mark
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]![0][0]).toMatchObject({ name: 'Asha', memberLink: { kind: 'new', mobile: '+919876500001' } })
    // … but editing the NUMBER of a marked slot asks — the identity the member is pointing at
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.mobile' }), '1')
    expect(screen.getByTestId('nominee-mark-question-0')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Keep the mark/ }))
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.name' }), 'x') // the member answered: the name ASKS from now on
    expect(screen.getByTestId('nominee-mark-question-0')).toBeInTheDocument()
  })

  it('⭐ ⛔ the form says nothing about a death or about being asked — with no mark, a new mark and a kept mark (`2026-10-24-401`: it must not describe how the five are chosen)', async () => {
    const DEATH = /death|\bdie[sd]?\b|dead|deceased|keeps them out|asked about|vouch/i
    const forms: NomineeFormEntry[][] = [
      [marked({ memberLink: null })],
      [marked({ memberLink: { kind: 'new', mobile: '+919876500001', foundBy: 'contacts', savedName: 'Meena', confirmedFor: slotFingerprint({ name: NAME, mobile: MOBILE }) } })],
      [marked()],
    ]
    for (const f of forms) {
      renderForm({ forms: f })
      expect(screen.getByTestId('nominee-mark-0')).toBeInTheDocument() // the mark control IS rendered
      expect(document.body.textContent ?? '').not.toMatch(DEATH)
      cleanup()
    }
  })

  it('⭐ rounds 3–4 — after a pick the name EXTENDS silently; a backspace, a replacement and a clearing each ASK (the mark must ⛔ ride onto another person)', async () => {
    const emptyFp = slotFingerprint({ name: '', mobile: MOBILE })
    const pending = (): NomineeFormEntry => ({
      name: '', relationship: 'spouse', mobile: MOBILE, address: '',
      memberLink: { kind: 'new', mobile: '+919876500001', foundBy: 'contacts', savedName: 'Meena', confirmedFor: emptyFp, namePending: true },
    })
    const name = () => screen.getByRole('textbox', { name: 'nominees.name' })
    const question = () => screen.queryByTestId('nominee-mark-question-0')
    renderForm({ forms: [pending()] })
    await userEvent.type(name(), 'Asha')
    expect(question()).toBeNull() // extending is completing the name
    await userEvent.type(name(), ' Devi')
    expect(question()).toBeNull()
    // a typo fixed by a backspace: the cost of the safe rule — ONE question; *Keep the mark* closes the window
    await userEvent.type(name(), '{backspace}')
    expect(question()).toBeInTheDocument()
    cleanup()
    // select all + ONE letter over the name ("a" is a prefix of "asha"), then the rest of ANOTHER name: the question never goes away
    renderForm({ forms: [pending()] })
    await userEvent.type(name(), 'Asha')
    await userEvent.tripleClick(name())
    await userEvent.paste('A')
    expect(question()).toBeInTheDocument()
    await userEvent.type(name(), 'nil')
    expect(name()).toHaveValue('Anil')
    expect(question()).toBeInTheDocument() // ⛔ swallowed by the keystrokes that follow
    cleanup()
    // select all + paste another name
    renderForm({ forms: [pending()] })
    await userEvent.type(name(), 'Asha')
    await userEvent.tripleClick(name())
    await userEvent.paste('Ravi Kumar')
    expect(question()).toBeInTheDocument()
    cleanup()
    // the name deleted outright (the way to type another one)
    renderForm({ forms: [pending()] })
    await userEvent.type(name(), 'Asha')
    await userEvent.clear(name())
    expect(question()).toBeInTheDocument()
    // the member answers *Keep the mark* with the slot still nameless: the first letter then COMPLETES it — ⛔ a second question
    await userEvent.click(screen.getByRole('button', { name: /^Keep the mark/ }))
    await userEvent.type(name(), 'R')
    expect(question()).toBeNull()
  })

  it('⭐ round 3 — "Answer the question … first" does ⛔ outlive the question: the edit reverted, or the mark removed, takes the refusal with it', async () => {
    const name = () => screen.getByRole('textbox', { name: 'nominees.name' })
    const { onSubmit } = renderForm()
    await userEvent.type(name(), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Answer the question about the member mark first.')
    await userEvent.type(name(), '{backspace}') // back to the confirmed name: no question, so no refusal either
    expect(screen.queryByTestId('nominee-mark-question-0')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1) // … and the save goes through
    // the other way out: the question is answered by removing the mark
    cleanup()
    renderForm()
    await userEvent.type(name(), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Answer the question about the member mark first.')
    await userEvent.click(screen.getByRole('button', { name: /^Remove it/ }))
    expect(screen.queryByRole('alert')).toBeNull()
    // a refusal for a missing field is a different line and stays until the next submit
    await userEvent.clear(name())
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('nominees.name_required')
  })

  it('device run — every control of the member mark is at least 48 dp: Find (no mark), Pick a different / Remove mark (a mark), Keep the mark / Remove it (the question)', async () => {
    const heightOf = (name: RegExp) => Number(screen.getByRole('button', { name }).getAttribute('data-height')) // an unsized button has no attribute: 0
    renderForm({ forms: [marked({ memberLink: null })] })
    expect(heightOf(/^Is this nominee a TWT member\?/)).toBeGreaterThanOrEqual(48)
    cleanup()
    renderForm()
    expect(heightOf(/^Pick a different member/)).toBeGreaterThanOrEqual(48)
    expect(heightOf(/^Remove mark/)).toBeGreaterThanOrEqual(48)
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.name' }), 'x') // opens the question
    expect(heightOf(/^Keep the mark/)).toBeGreaterThanOrEqual(48)
    expect(heightOf(/^Remove it/)).toBeGreaterThanOrEqual(48)
  })

  it('⭐ round 4 — the refusal does ⛔ COME BACK when a later edit reopens the question: it belongs to the Save that produced it', async () => {
    const name = () => screen.getByRole('textbox', { name: 'nominees.name' })
    renderForm()
    await userEvent.type(name(), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Answer the question about the member mark first.')
    await userEvent.type(name(), '{backspace}') // reverted: the question and the refusal go
    expect(screen.queryByRole('alert')).toBeNull()
    announce.mockClear()
    await userEvent.type(name(), 'y') // reopened by an edit — ⛔ a Save
    expect(screen.getByTestId('nominee-mark-question-0')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(announce).not.toHaveBeenCalledWith('Answer the question about the member mark first.')
    // answering the question ends a refusal that is still standing, too, and the next reopening starts clean
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Keep the mark/ }))
    expect(screen.queryByRole('alert')).toBeNull()
    await userEvent.type(name(), 'z')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('editing the mobile and answering *Remove it* sends ⛔ mark', async () => {
    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.mobile' }), '1')
    await userEvent.click(screen.getByRole('button', { name: /^Remove it/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).not.toHaveProperty('memberLink')
  })

  it('two marked slots: each button names ITS nominee (WCAG 2.5.3 — the accessible name BEGINS with the visible text)', () => {
    renderForm({ forms: [marked(), marked({ name: 'Ravi Kumar', mobile: '9988776655', memberLink: { kind: 'keep', linkId: '22222222-2222-4222-8222-222222222222', label: 'asked', name: null, confirmedFor: slotFingerprint({ name: 'Ravi Kumar', mobile: '9988776655' }) } })] })
    expect(screen.getByRole('button', { name: 'Remove mark — nominees.primary_label' })).toHaveTextContent('Remove mark')
    expect(screen.getByRole('button', { name: 'Remove mark — nominees.secondary_label' })).toHaveTextContent('Remove mark')
  })

  it('a slot the form ADDS carries ⛔ mark (`null`) — ⛔ `undefined`, which a reload would give the rank\'s OLD mark', async () => {
    const { reported } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'nominees.add_second' }))
    expect(reported.at(-1)![1]!.memberLink).toBeNull()
  })

  it('a NEW mark is sent as new (number + how found), shows the name the member SAVED, and says the nominee will be ASKED', async () => {
    const { onSubmit } = renderForm({
      forms: [marked({ memberLink: { kind: 'new', mobile: '+919876500001', foundBy: 'contacts', savedName: 'Meena', confirmedFor: slotFingerprint({ name: NAME, mobile: MOBILE }) } })],
    })
    expect(screen.getByText('Marked as a member: Meena')).toBeInTheDocument()
    expect(screen.getByText('When you save, Meena will be asked in the app and will see your name. A member who has already answered this same mark is not asked again.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0].memberLink).toEqual({ kind: 'new', mobile: '+919876500001', foundBy: 'contacts' })
  })

  it('the SIGNUP form (⛔ `link` prop) sends ⛔ mark and shows ⛔ control', async () => {
    const { onSubmit } = renderForm({ link: null })
    expect(screen.queryByText(/Confirmed/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Is this nominee a TWT member/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).not.toHaveProperty('memberLink')
  })

  it('`canFind: false` (V11) hides the find entry; a kept mark still shows and is still sent', async () => {
    const { onSubmit } = renderForm({ link: { canFind: false, onFind: vi.fn() } })
    expect(screen.queryByRole('button', { name: /^Pick a different member/ })).toBeNull()
    expect(screen.getByText('Confirmed — Asha D.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0].memberLink).toEqual({ kind: 'keep', linkId: L1 })
  })

  it('an unmarked slot offers *Find* for ITS rank; `not_me` shows the consequence note', async () => {
    const onFind = vi.fn()
    renderForm({
      link: { canFind: true, onFind },
      forms: [marked({ memberLink: { kind: 'keep', linkId: L1, label: 'not_me', name: null, confirmedFor: slotFingerprint({ name: NAME, mobile: MOBILE }) } }), marked({ memberLink: null })],
    })
    expect(screen.getByText('Said it is not them')).toBeInTheDocument()
    expect(screen.getByText('The mark still counts until you remove it or pick again.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Is this nominee a TWT member\?/ }))
    expect(onFind).toHaveBeenCalledWith(2)
  })
})
