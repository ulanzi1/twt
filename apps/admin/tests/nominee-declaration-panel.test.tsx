// `<NomineeDeclarationPanel>` — Story 6.20 (Task 8; AC3, AC4, AC7, AC8; invariant 1, invariant 6).
//
// ⭐ The load-bearing ones:
//   · the determination form PRE-SELECTS NOTHING, and Record refuses — and SAYS WHY — until the District
//     Admin has entered the date, marked EVERY version and written a note (invariant 1 — ⛔ never a default);
//   · every version row shows BOTH its `recorded_at` and its `effective_at`, and ⛔ nothing says "after death";
//   · the marks RESET when what is being judged changes (6.18's stale-carry-over finding);
//   · D10 — names, mobiles and the correction requests appear ONLY after the audited reveal;
//   · a correction's target and proposal are shown side by side — with the mobile, address and BOTH notes
//     the approvers act on — and only THIS surface's step carries controls;
//   · the helpline's raise form ⛔ never offers `other` (the target side is `-237` cl.2; the PROPOSED side is
//     an ENGINEERING READING of it, ⛔ not a ratified rule — BigDev 2026-09-24).

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NomineeCorrectionListResponse, NomineeDeclarationTimelineResponse } from '@twt/contracts';

import {
  NomineeCorrectionRaiseForm,
  NomineeCorrections,
  NomineeDeclarationPanel,
} from '../src/modules/claim-verification/index.js';

const V1 = '00000000-0000-4000-8000-000000000001';
const V2 = '00000000-0000-4000-8000-000000000002';
const D1 = '00000000-0000-4000-8000-0000000000d1';
const EARLIER = '44444444-4444-4444-8444-444444444444';

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
      // Recorded and effective DIFFER, so each column is provably its own field.
      recorded_at: '2026-01-10T06:00:00.000Z',
      effective_at: '2026-01-05T06:00:00.000Z',
      corrects_version_id: null,
    },
    {
      version_id: V2,
      rank: 1,
      version_no: 2,
      kind: 'declared',
      source: 'member',
      relationship: 'niece_nephew',
      split_pct: 100,
      recorded_at: '2026-06-10T06:00:00.000Z',
      effective_at: '2026-06-10T06:00:00.000Z',
      corrects_version_id: null,
    },
  ],
  watermark: { rank1: 2, rank2: null },
  live_determination: null,
  earlier_determinations: [],
  declaration_status: 'undetermined',
  determination_recordable: true,
};

const CORRECTION_ID = '33333333-3333-4333-8333-333333333333';
const PA_CORRECTION_ID = '55555555-5555-4555-8555-555555555555';
const CORRECTIONS: NomineeCorrectionListResponse = {
  claim_case_id: TIMELINE.claim_case_id,
  corrections: [
    {
      correction_id: CORRECTION_ID,
      claim_case_id: TIMELINE.claim_case_id,
      rank: 1,
      target_version_id: V1,
      target: {
        relationship: 'daughter_in_law',
        name: { state: 'readable', value: 'Rani Kumari' },
        mobile: { state: 'readable', value: '9811111111' },
      },
      proposed: {
        relationship: 'spouse',
        name: { state: 'readable', value: 'Rani Devi' },
        mobile: { state: 'readable', value: '9876543210' },
        address: { state: 'readable', value: '12 Station Road' },
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
    {
      correction_id: PA_CORRECTION_ID,
      claim_case_id: TIMELINE.claim_case_id,
      rank: 2,
      target_version_id: V2,
      target: { relationship: 'son', name: { state: 'readable', value: 'Ravi' }, mobile: null },
      proposed: {
        relationship: 'son',
        name: { state: 'readable', value: 'Ravi Kumar' },
        mobile: { state: 'readable', value: '9800000000' },
        address: null,
      },
      raised_via: 'member_app',
      raised_at: '2026-06-13T06:00:00.000Z',
      raise_note: { state: 'readable', value: 'Surname missing' },
      step: 'pa_pending',
      district_admin: {
        actor_display: 'Anita (District Admin)',
        decided_at: '2026-06-14T06:00:00.000Z',
        note: { state: 'readable', value: 'Checked the school record' },
      },
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
    decideStep: 'district' as const,
    ...over,
  };
  const utils = render(<NomineeDeclarationPanel {...props} />);
  return { ...utils, props };
}

afterEach(() => cleanup());

describe('<NomineeDeclarationPanel> — the timeline and the determination', () => {
  it('⭐⭐ PRE-SELECTS NOTHING — every radio starts unchecked and Record is aria-disabled (invariant 1)', () => {
    setup();
    for (const v of [V1, V2]) {
      expect((screen.getByTestId(`mark-${v}-stands`) as HTMLInputElement).checked).toBe(false);
      expect((screen.getByTestId(`mark-${v}-discarded`) as HTMLInputElement).checked).toBe(false);
    }
    expect(screen.getByTestId('nominee-determination-submit').getAttribute('aria-disabled')).toBe('true');
  });

  it('⭐ each version row shows its OWN "Recorded" and "Counts as of" instants, and ⛔ nothing says "after death"', () => {
    setup();
    // V1 was recorded on 10 Jan but counts as of 5 Jan — the two cells must carry the two different days.
    expect(screen.getByTestId(`nominee-version-recorded-${V1}`).textContent).toMatch(/10 Jan 2026/);
    expect(screen.getByTestId(`nominee-version-effective-${V1}`).textContent).toMatch(/5 Jan 2026/);
    expect(screen.getByTestId(`nominee-version-recorded-${V2}`).textContent).toMatch(/10 Jun 2026/);
    expect(screen.getByTestId(`nominee-version-effective-${V2}`).textContent).toMatch(/10 Jun 2026/);
    expect(screen.getByTestId('nominee-timeline').textContent).not.toMatch(/after (the )?death|suspicious|should be discarded/i);
    // Announced status — in words, ⛔ never colour alone.
    expect(screen.getByTestId('nominee-declaration-status').getAttribute('role')).toBe('status');
  });

  it('shows the RATIFIED relationship labels, ⛔ never a raw code', () => {
    setup();
    const timeline = screen.getByTestId('nominee-timeline').textContent ?? '';
    expect(timeline).toContain('Niece / Nephew');
    expect(timeline).not.toContain('niece_nephew');
  });

  it('⭐ an incomplete Record is REFUSED IN WORDS (the alert is reachable) and submits nothing', () => {
    const { props } = setup();
    fireEvent.click(screen.getByTestId('nominee-determination-submit'));
    expect(screen.getByTestId('nominee-determination-incomplete').getAttribute('role')).toBe('alert');
    expect(props.onDetermine).not.toHaveBeenCalled();
  });

  it('Record acts only with a date, EVERY version marked and a note — and submits exactly those marks', async () => {
    const { props } = setup();
    fireEvent.change(screen.getByTestId('nominee-certificate-date'), { target: { value: '2026-05-01' } });
    fireEvent.click(screen.getByTestId(`mark-${V1}-stands`));
    fireEvent.click(screen.getByTestId('nominee-determination-submit'));
    expect(props.onDetermine).not.toHaveBeenCalled(); // V2 unmarked
    fireEvent.click(screen.getByTestId(`mark-${V2}-discarded`));
    fireEvent.click(screen.getByTestId('nominee-determination-submit'));
    expect(props.onDetermine).not.toHaveBeenCalled(); // no note
    fireEvent.change(screen.getByTestId('nominee-determination-note'), { target: { value: 'Certificate dated 1 May.' } });
    expect(screen.getByTestId('nominee-determination-submit').getAttribute('aria-disabled')).toBe('false');
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

  it('⭐ family 13(d) — a recorded determination is ANNOUNCED', () => {
    setup({ determined: true });
    const live = screen.getByTestId('nominee-determination-recorded');
    expect(live.getAttribute('role')).toBe('status');
    expect(live.textContent).toMatch(/recorded/i);
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

  it('⭐ D17 — an earlier claim\'s determination is shown READ-ONLY and ⛔ never pre-fills the marks', () => {
    setup({
      timeline: {
        ...TIMELINE,
        earlier_determinations: [
          {
            claim_case_id: EARLIER,
            claim_state: 'denied',
            determination_id: D1,
            decided_at: '2026-06-01T06:00:00.000Z',
            decided_by_display: 'Anita',
            marks: [
              { version_id: V1, mark: 'stands' },
              { version_id: V2, mark: 'discarded' },
            ],
          },
        ],
      },
    });
    const earlier = screen.getByTestId(`nominee-earlier-${EARLIER}`);
    expect(earlier.textContent).toContain('Anita');
    expect(earlier.textContent).toMatch(/1 stand, 1 discarded/);
    // ⛔ Nothing copied across: every radio on THIS claim is still unchecked.
    for (const v of [V1, V2]) {
      expect((screen.getByTestId(`mark-${v}-stands`) as HTMLInputElement).checked).toBe(false);
      expect((screen.getByTestId(`mark-${v}-discarded`) as HTMLInputElement).checked).toBe(false);
    }
  });
});

describe('<NomineeDeclarationPanel> — D10, the audited reveal', () => {
  it('⭐ BEFORE the reveal: ⛔ no snapshot name, ⛔ no correction request (their names ARE in the props), only the reveal', () => {
    // The corrections prop carries names — so a panel that ignored the gate WOULD render them.
    setup({ detailsRequested: false });
    expect(screen.queryByText('Rani Kumari')).toBeNull();
    expect(screen.queryByText('Rani Devi')).toBeNull();
    expect(screen.queryByTestId(`nominee-correction-${CORRECTION_ID}`)).toBeNull();
    expect(screen.getByTestId('nominee-corrections-gated')).toBeTruthy();
    expect(screen.getByTestId('nominee-show-details')).toBeTruthy();
  });

  it('the reveal asks the parent (the audited read); snapshots render once supplied', () => {
    const { rerender, props } = setup();
    fireEvent.click(screen.getByTestId('nominee-show-details'));
    expect(props.onShowDetails).toHaveBeenCalledTimes(1);
    rerender(
      <NomineeDeclarationPanel
        {...props}
        detailsRequested
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
    // Every version has its details — the reveal button is gone.
    expect(screen.queryByTestId('nominee-show-details')).toBeNull();
  });

  it('⭐ a version with NO snapshot (added after the reveal) keeps the reveal reachable', () => {
    setup({
      detailsRequested: true,
      snapshots: {
        claim_case_id: TIMELINE.claim_case_id,
        snapshots: [{ version_id: V1, name: { state: 'readable', value: 'Asha Devi' }, mobile: null, address: null }],
        live_determination: null,
      },
    });
    expect(screen.getByTestId('nominee-details-missing')).toBeTruthy();
    expect(screen.getByTestId('nominee-show-details')).toBeTruthy();
  });

  it('the live determination\'s certificate date and note show once revealed', () => {
    setup({
      detailsRequested: true,
      timeline: {
        ...TIMELINE,
        live_determination: { determination_id: D1, decided_at: '2026-06-20T06:00:00.000Z', decided_by_display: 'Anita', marks: [] },
      },
      snapshots: {
        claim_case_id: TIMELINE.claim_case_id,
        snapshots: [],
        live_determination: {
          determination_id: D1,
          certificate_date: { state: 'readable', value: '2026-05-01' },
          note: { state: 'readable', value: 'Certificate checked' },
        },
      },
    });
    const details = screen.getByTestId('nominee-declaration-last-details');
    expect(details.textContent).toContain('2026-05-01');
    expect(details.textContent).toContain('Certificate checked');
  });
});

describe('<NomineeDeclarationPanel> — nominee corrections', () => {
  it('⭐ shows the TARGET beside the PROPOSAL with everything the approvers act on (⛔ no diff)', () => {
    setup({ detailsRequested: true });
    const card = screen.getByTestId(`nominee-correction-${CORRECTION_ID}`);
    expect(card.textContent).toContain('Rani Kumari');
    expect(card.textContent).toContain('9811111111');
    expect(card.textContent).toContain('Rani Devi');
    expect(card.textContent).toContain('9876543210');
    expect(card.textContent).toContain('12 Station Road');
    expect(card.textContent).toContain('Daughter-in-law');
    expect(card.textContent).toContain('Spouse');
    expect(card.textContent).toContain('Waiting for the District Admin');
    // The District Admin's note is shown to whoever decides next (CC3).
    expect(screen.getByTestId(`nominee-correction-${PA_CORRECTION_ID}`).textContent).toContain('Checked the school record');
  });

  it('⭐ controls follow the SURFACE — the console acts on step 1 only (⛔ no Pariwar Admin controls)', () => {
    setup({ detailsRequested: true });
    expect(screen.getByTestId(`nominee-correction-approve-${CORRECTION_ID}`)).toBeTruthy();
    expect(screen.queryByTestId(`nominee-correction-approve-${PA_CORRECTION_ID}`)).toBeNull();
    // ⛔ The console renders no raise form (the helpline's surface does).
    expect(screen.queryByTestId('nominee-correction-raise')).toBeNull();
  });

  it('⛔ a step without a note is refused in the form; with a note it goes to the DISTRICT step', async () => {
    const { props } = setup({ detailsRequested: true });
    fireEvent.click(screen.getByTestId(`nominee-correction-approve-${CORRECTION_ID}`));
    expect(props.onDecide).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId(`nominee-correction-note-${CORRECTION_ID}`), { target: { value: 'Married name, same person.' } });
    fireEvent.click(screen.getByTestId(`nominee-correction-approve-${CORRECTION_ID}`));
    await waitFor(() =>
      expect(props.onDecide).toHaveBeenCalledWith(CORRECTION_ID, 'district', 'approve', 'Married name, same person.'),
    );
  });

  it('⭐ a loading or failed list is ⛔ never "none requested"', () => {
    const { rerender, props } = setup({ detailsRequested: true, corrections: undefined, correctionsLoading: true });
    expect(screen.getByTestId('nominee-corrections-loading')).toBeTruthy();
    expect(screen.queryByTestId('nominee-corrections-none')).toBeNull();
    rerender(<NomineeDeclarationPanel {...props} correctionsLoading={false} correctionsError="The correction requests could not be loaded." />);
    expect(screen.getByTestId('nominee-corrections-error').getAttribute('role')).toBe('alert');
    expect(screen.queryByTestId('nominee-corrections-none')).toBeNull();
  });

  it('⭐ family 13 — each repeated control names WHICH request it acts on; ⛔ no per-card live region', () => {
    render(
      <NomineeCorrections
        corrections={{ ...CORRECTIONS, corrections: [CORRECTIONS.corrections[1]!, { ...CORRECTIONS.corrections[1]!, correction_id: CORRECTION_ID, rank: 1 }] }}
        decideStep="pariwar"
        onDecide={vi.fn(async () => undefined)}
        resetKey="k"
      />,
    );
    const names = screen.getAllByRole('button', { name: /^Approve — / }).map((b) => b.getAttribute('aria-label'));
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(screen.getByTestId(`nominee-correction-${CORRECTION_ID}`).querySelector('[role="status"]')).toBeNull();
  });

  it('family 13(d) — an approval / decline outcome is ANNOUNCED', () => {
    render(<NomineeCorrections corrections={CORRECTIONS} decideStep="pariwar" onDecide={vi.fn(async () => undefined)} decided resetKey="k" />);
    const live = screen.getByTestId('nominee-correction-decided');
    expect(live.getAttribute('role')).toBe('status');
    expect(live.textContent).toMatch(/recorded/i);
  });
});

describe('<NomineeCorrectionRaiseForm> — the helpline raise', () => {
  it('⭐ ⛔ never offers "other" (target: `-237` cl.2; proposal: an ENGINEERING READING of it), and shows the ratified labels', () => {
    render(<NomineeCorrectionRaiseForm onRaise={vi.fn(async () => undefined)} sentCount={0} resetKey="k" />);
    const select = screen.getByTestId('raise-relationship') as HTMLSelectElement;
    const options = Array.from(select.options);
    expect(options.map((o) => o.value)).not.toContain('other');
    expect(options.map((o) => o.value)).toContain('niece_nephew');
    expect(options.find((o) => o.value === 'niece_nephew')?.textContent).toBe('Niece / Nephew');
  });

  it('⭐ after a SUCCESSFUL send the form clears and the send is announced', () => {
    const { rerender } = render(<NomineeCorrectionRaiseForm onRaise={vi.fn(async () => undefined)} sentCount={0} resetKey="k" />);
    fireEvent.change(screen.getByTestId('raise-name'), { target: { value: 'Rani Devi' } });
    rerender(<NomineeCorrectionRaiseForm onRaise={vi.fn(async () => undefined)} sentCount={1} resetKey="k" />);
    expect((screen.getByTestId('raise-name') as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('raise-sent').textContent).toMatch(/sent/i);
  });
});
