// @vitest-environment jsdom
// Story 6.36e (Task 5; AC5; V3) — the nominee form's MEMBER MARK, EXECUTED with React DOM and mocked native primitives (the
// 6.36b render-harness shape; native layout and a real screen reader still need a device —
// [[feedback_record_unattested_no_backfill]]):
//   · an UNEDITED re-save sends each kept mark as `{ kind: 'keep', linkId }`;
//   · *Remove mark* sends ⛔ mark (the live one ends at save);
//   · editing a marked slot's name ASKS *"Is this still …?"* first — a save is refused until it is answered; *Keep the mark*
//     sends the keep, *Remove it* sends none;
//   · the SIGNUP form (⛔ `link` prop) sends ⛔ mark even from slots that carry one, and shows ⛔ control;
//   · `canFind: false` (a caller who may not find — V11) hides the find entry but still shows and keeps a mark.
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@twt/i18n/react', () => ({ useT: () => (key: string) => key }))
vi.mock('../../lib/nominee-link-i18n', () => ({
  useNomineeLinkT: () => (key: string, params?: Record<string, unknown>) => (params?.['name'] ? `${key}:${String(params['name'])}` : key),
}))
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
    Button: ({ children, onPress, disabled, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) =>
      createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
  }
})

import { NomineeForm, type NomineeFormEntry } from '../../components/life-events/NomineeForm'

const L1 = '11111111-1111-4111-8111-111111111111'
const marked = (over: Partial<NomineeFormEntry> = {}): NomineeFormEntry => ({
  name: 'Asha Devi',
  relationship: 'spouse',
  mobile: '9876543210',
  address: '',
  memberLink: { kind: 'keep', linkId: L1, label: 'confirmed', name: 'Asha D.' },
  ...over,
})

function renderForm(opts: { link?: { canFind: boolean; onFind: (rank: 1 | 2) => void } | null; forms?: NomineeFormEntry[] } = {}) {
  const onSubmit = vi.fn()
  const link = opts.link === null ? undefined : (opts.link ?? { canFind: true, onFind: vi.fn() })
  render(
    createElement(NomineeForm, {
      title: 'T',
      intro: 'I',
      submitLabel: 'Save',
      busy: false,
      error: null,
      onSubmit,
      initialForms: opts.forms ?? [marked()],
      ...(link ? { link } : {}),
    }),
  )
  return { onSubmit }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('NomineeForm — the member mark (Story 6.36e, V3)', () => {
  it('an UNEDITED re-save sends the kept mark as a KEEP (its link id only); the label shows the registered name', async () => {
    const { onSubmit } = renderForm()
    expect(screen.getByText('label.confirmed:Asha D.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith([
      { name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210', memberLink: { kind: 'keep', linkId: L1 } },
    ])
  })

  it('*Remove mark* sends ⛔ mark', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'form.remove' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).not.toHaveProperty('memberLink')
  })

  it('editing a marked slot\'s name ASKS first — the save is refused until answered; *Keep the mark* keeps it', async () => {
    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.name' }), 'x')
    expect(screen.getByText('edit.question:Asha D.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('edit.answer_first')
    await userEvent.click(screen.getByRole('button', { name: 'edit.keep' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).toMatchObject({ name: 'Asha Devix', memberLink: { kind: 'keep', linkId: L1 } })
  })

  it('editing the mobile and answering *Remove it* sends ⛔ mark', async () => {
    const { onSubmit } = renderForm()
    await userEvent.type(screen.getByRole('textbox', { name: 'nominees.mobile' }), '1')
    await userEvent.click(screen.getByRole('button', { name: 'edit.remove' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).not.toHaveProperty('memberLink')
  })

  it('a NEW mark is sent as new (number + how found) and shows the name the member SAVED', async () => {
    const { onSubmit } = renderForm({ forms: [marked({ memberLink: { kind: 'new', mobile: '+919876500001', foundBy: 'contacts', savedName: 'Meena' } })] })
    expect(screen.getByText('form.marked:Meena')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0].memberLink).toEqual({ kind: 'new', mobile: '+919876500001', foundBy: 'contacts' })
  })

  it('the SIGNUP form (⛔ `link` prop) sends ⛔ mark and shows ⛔ control', async () => {
    const { onSubmit } = renderForm({ link: null })
    expect(screen.queryByText(/label\./)).toBeNull()
    expect(screen.queryByRole('button', { name: 'form.find' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0]).not.toHaveProperty('memberLink')
  })

  it('`canFind: false` (V11) hides the find entry; a kept mark still shows and is still sent', async () => {
    const { onSubmit } = renderForm({ link: { canFind: false, onFind: vi.fn() } })
    expect(screen.queryByRole('button', { name: 'form.find_again' })).toBeNull()
    expect(screen.getByText('label.confirmed:Asha D.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]![0][0].memberLink).toEqual({ kind: 'keep', linkId: L1 })
  })

  it('an unmarked slot offers *Find* for ITS rank; `not_me` shows the consequence note', async () => {
    const onFind = vi.fn()
    renderForm({ link: { canFind: true, onFind }, forms: [marked({ memberLink: { kind: 'keep', linkId: L1, label: 'not_me', name: null } }), marked({ memberLink: null })] })
    expect(screen.getByText('label.not_me')).toBeInTheDocument()
    expect(screen.getByText('label.not_me_note')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'form.find' }))
    expect(onFind).toHaveBeenCalledWith(2)
  })
})
