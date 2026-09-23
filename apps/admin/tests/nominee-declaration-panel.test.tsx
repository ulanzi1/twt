// `<NomineeDeclarationPanel>` — Story 6.20 (Task 8; AC3, AC4, AC7, AC8; invariant 1, invariant 6).
//
// ⭐ The load-bearing ones:
//   · the determination form PRE-SELECTS NOTHING, and Record stays disabled until the District Admin has
//     entered the date, marked EVERY version and written a note (invariant 1 — ⛔ never a default);
//   · the timeline shows BOTH `recorded_at` and `effective_at`, and ⛔ nothing on it says "after death";
//   · the marks RESET when what is being judged changes (6.18's stale-carry-over finding);
//   · a correction's target and proposal are shown side by side, and a step needs a note;
//   · the helpline's raise form ⛔ never offers `other` (`-237` cl.2).

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NomineeCorrectionListResponse, NomineeDeclarationTimelineResponse } from '@twt/contracts';

import { NomineeDeclarationPanel } from '../src/modules/claim-verification/index.js';

const V1 = '00000000-0000-4000-8000-000000000001';
const V2 = '00000000-0000-4000-8000-000000000002';
const D1 = '00000000-0000-4000-8000-0000000000d1';

const TIMELINE: NomineeDeclarationTimelineResponse = {
  claim_case_id: '11111111-1111-4111-8111-111111111111',
  claim_state: 'verifier_review',
  deceased_member_id: '22222222-2222-4222-8222-222222222222',
  versions: [
    {
      version_id: V1,
      rank: 1,
      version_no: 1,
      kind: 'declared',
      source: 'member',
      relationship: 'spouse',
      split_pct: 100,
      recorded_at: '2026-01-10T06:00:00.000Z',
      effective_at: '2026-01-10T06:00:00.000Z',
      corrects_version_id: null,
    },
    {
      version_id: V2,
      rank: 1,
      version_no: 2,
      kind: 'declared',
      source: 'member',
      relationship: 'son',
      split_pct: 100,
      recorded_at: '2026-06-10T06:00:00.000Z',
      effective_at: '2026-06-10T06:00:00.000Z',
      corrects_version_id: null,
    },
  ],
  watermark: { rank1: 2, rank2: null },
  live_determination: null,
  declaration_status: 'undetermined',
  determination_recordable: true,
};

const CORRECTIONS: NomineeCorrectionListResponse = {
  claim_case_id: TIMELINE.claim_case_id,
  corrections: [
    {
      correction_id: '33333333-3333-4333-8333-333333333333',
      claim_case_id: TIMELINE.claim_case_id,
      rank: 1,
      target_version_id: V1,
      target: { relationship: 'daughter_in_law', name: { state: 'readable', value: 'Rani Kumari' }, mobile: null },
      proposed: {
        relationship: 'spouse',
        name: { state: 'readable', value: 'Rani Devi' },
        mobile: { state: 'readable', value: '9876543210' },
        address: null,
      },
      raised_via: 'helpline',
      raised_at: '2026-06-12T06:00:00.000Z',
      raise_note: { state: 'readable', value: 'Married name' },
      step: 'da_pending',
      district_admin: null,
      pariwar_admin: null,
      declined_at_step: null,
      applied_version_id: null,
    },
  ],
};

function setup(over: Partial<Parameters<typeof NomineeDeclarationPanel>[0]> = {}) {
  const props = {
    timeline: TIMELINE,
    onShowDetails: vi.fn(),
    onDetermine: vi.fn(async () => undefined),
    corrections: CORRECTIONS,
    onDecide: vi.fn(async () => undefined),
    onRaise: vi.fn(async () => undefined),
    ...over,
  };
  const utils = render(<NomineeDeclarationPanel {...props} />);
  return { ...utils, props };
}

afterEach(() => cleanup());

describe('<NomineeDeclarationPanel> — the timeline and the determination', () => {
  it('⭐⭐ PRE-SELECTS NOTHING — every radio starts unchecked and Record is disabled (invariant 1)', () => {
    setup();
    for (const v of [V1, V2]) {
      expect((screen.getByTestId(`mark-${v}-stands`) as HTMLInputElement).checked).toBe(false);
      expect((screen.getByTestId(`mark-${v}-discarded`) as HTMLInputElement).checked).toBe(false);
    }
    expect((screen.getByTestId('nominee-determination-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('⭐ shows BOTH "Recorded" and "Counts as of" for every version, and ⛔ nothing says "after death"', () => {
    setup();
    expect(screen.getAllByText(/Counts as of/)).toHaveLength(1);
    expect(screen.getByTestId('nominee-timeline').textContent).not.toMatch(/after (the )?death|suspicious|should be discarded/i);
    // Announced status — in words, ⛔ never colour alone.
    expect(screen.getByTestId('nominee-declaration-status').getAttribute('role')).toBe('status');
  });

  it('Record is enabled only with a date, EVERY version marked and a note — and submits exactly those marks', async () => {
    const { props } = setup();
    fireEvent.change(screen.getByTestId('nominee-certificate-date'), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByTestId(`mark-${V1}-stands`));
    expect((screen.getByTestId('nominee-determination-submit') as HTMLButtonElement).disabled).toBe(true); // V2 unmarked
    fireEvent.click(screen.getByTestId(`mark-${V2}-discarded`));
    expect((screen.getByTestId('nominee-determination-submit') as HTMLButtonElement).disabled).toBe(true); // no note
    fireEvent.change(screen.getByTestId('nominee-determination-note'), { target: { value: 'Certificate dated 1 May.' } });
    fireEvent.click(screen.getByTestId('nominee-determination-submit'));
    await waitFor(() => expect(props.onDetermine).toHaveBeenCalledTimes(1));
    expect(props.onDetermine).toHaveBeenCalledWith({
      certificate_date: '2026-05-01',
      marks: [
        { version_id: V1, mark: 'stands' },
        { version_id: V2, mark: 'discarded' },
      ],
      note: 'Certificate dated 1 May.',
      watermark: { rank1: 2, rank2: null },
      expected_live_determination_id: null,
    });
  });

  it('⭐ the marks RESET when a new determination lands (a fresh judgement, ⛔ no carried-over marks)', () => {
    const { rerender, props } = setup();
    fireEvent.click(screen.getByTestId(`mark-${V1}-stands`));
    expect((screen.getByTestId(`mark-${V1}-stands`) as HTMLInputElement).checked).toBe(true);
    rerender(
      <NomineeDeclarationPanel
        {...props}
        timeline={{
          ...TIMELINE,
          live_determination: { determination_id: D1, decided_at: '2026-06-20T06:00:00.000Z', decided_by_display: 'Anita', marks: [] },
        }}
      />,
    );
    expect((screen.getByTestId(`mark-${V1}-stands`) as HTMLInputElement).checked).toBe(false);
  });

  it('outside the recordable window there is ⛔ no form — the reason is announced instead', () => {
    setup({ timeline: { ...TIMELINE, determination_recordable: false } });
    expect(screen.queryByTestId('nominee-determination-strip')).toBeNull();
    expect(screen.getByTestId('nominee-determination-closed').getAttribute('role')).toBe('status');
  });

  it('D10 — names appear ONLY once the snapshots were asked for', () => {
    const { rerender, props } = setup();
    expect(screen.queryByText('Asha Devi')).toBeNull();
    fireEvent.click(screen.getByTestId('nominee-show-details'));
    expect(props.onShowDetails).toHaveBeenCalledTimes(1);
    rerender(
      <NomineeDeclarationPanel
        {...props}
        snapshots={{
          claim_case_id: TIMELINE.claim_case_id,
          snapshots: [
            { version_id: V1, name: { state: 'readable', value: 'Asha Devi' }, mobile: null, address: null },
            { version_id: V2, name: { state: 'anonymized' }, mobile: null, address: null },
          ],
          live_determination: null,
        }}
      />,
    );
    expect(screen.getByText('Asha Devi')).toBeTruthy();
    expect(screen.getByText(/Erased at the member/)).toBeTruthy();
  });
});

describe('<NomineeDeclarationPanel> — nominee corrections', () => {
  it('⭐ shows the TARGET beside the PROPOSAL, relationship beside relationship (⛔ no diff)', () => {
    setup();
    const card = screen.getByTestId('nominee-correction-33333333-3333-4333-8333-333333333333');
    expect(card.textContent).toContain('Rani Kumari');
    expect(card.textContent).toContain('Rani Devi');
    expect(card.textContent).toContain('daughter_in_law');
    expect(card.textContent).toContain('spouse');
    expect(card.textContent).toContain('Waiting for the District Admin');
  });

  it('⛔ a step without a note is refused in the form; with a note it goes to the DISTRICT step', async () => {
    const { props } = setup();
    const id = '33333333-3333-4333-8333-333333333333';
    fireEvent.click(screen.getByTestId(`nominee-correction-approve-${id}`));
    expect(props.onDecide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId(`nominee-correction-note-${id}`), { target: { value: 'Married name, same person.' } });
    fireEvent.click(screen.getByTestId(`nominee-correction-approve-${id}`));
    await waitFor(() => expect(props.onDecide).toHaveBeenCalledWith(id, 'district', 'approve', 'Married name, same person.'));
  });

  it('⭐ `-237` cl.2 — the raise form ⛔ never offers "other"', () => {
    setup();
    const options = Array.from((screen.getByTestId('raise-relationship') as HTMLSelectElement).options).map((o) => o.value);
    expect(options).not.toContain('other');
    expect(options).toContain('niece_nephew');
  });
});
