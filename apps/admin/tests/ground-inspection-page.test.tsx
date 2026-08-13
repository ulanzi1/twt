// `<GroundInspectionPage>` container tests — Story 6.7 (Task 6/7).
//
// Covers the operator affordances: loading a claim's assignments in a district, the
// absence-is-a-signal empty state (AC5), scheduling a new assignment (AC1), and the mandatory-photo
// completion guard being reflected in the UI (AC4 — the Complete button is disabled with 0 photos).
// The api client module is mocked (mirrors helpline-claim-page.test.tsx); the real hooks + Query
// cache are exercised via `renderWithClient`.

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../src/api/client.js';
import { GroundInspectionPage } from '../src/modules/ground-inspection/GroundInspectionPage.js';
import { renderWithClient } from './_helpers.js';

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    listGroundInspection: vi.fn(),
    scheduleGroundInspection: vi.fn(),
  };
});

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '22222222-2222-2222-2222-222222222222';

function makeAssignment(over: Partial<api.GroundInspectionAssignmentT> = {}): api.GroundInspectionAssignmentT {
  return {
    groundInspectionId: '33333333-3333-3333-3333-333333333333',
    district: 'Patna',
    block: null,
    inspectionStage: 'initial',
    inspectionSiteType: 'family_residence',
    inspectorActorId: 'inspector-1',
    scheduledAt: '2026-07-10T12:00:00.000Z',
    status: 'scheduled',
    refusalReason: null,
    supersedesGroundInspectionId: null,
    completedAt: null,
    structuredFindings: null,
    locationDetail: null,
    familyContact: null,
    notes: null,
    photos: [],
    ...over,
  };
}

/** Load by DISTRICT — the legacy locator, unchanged by Story 6.17. */
async function loadScope(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Claim case id'), CLAIM);
  await user.type(screen.getByLabelText('District (your jurisdiction)'), 'Patna');
  await user.click(screen.getByRole('button', { name: 'Load assignments' }));
}

/** Load by BLOCK — the Story 6.17 locator, the one a block_admin can actually satisfy. */
async function loadScopeByBlock(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Claim case id'), CLAIM);
  await user.type(screen.getByLabelText('Block (optional)'), 'Block-1');
  await user.click(screen.getByRole('button', { name: 'Load assignments' }));
}

describe('<GroundInspectionPage>', () => {
  // The api-client mock is module-level, so its call log accumulates across tests. Clearing it makes
  // every `mock.calls[n]` index below mean what it reads as — the call THIS test made.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the absence-is-a-signal empty state when a claim has no assignments in the district (AC5)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await waitFor(() => expect(screen.getByText(/absence of a completed inspection/i)).toBeInTheDocument());
    expect(api.listGroundInspection).toHaveBeenCalledWith(PARIWAR, CLAIM, { district: 'Patna' });
  });

  it('lists an assignment and DISABLES Complete when it has zero photos (AC4 mandatory-photo)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment({ photos: [] })] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await waitFor(() => expect(screen.getByText('inspector-1')).toBeInTheDocument());
    const completeBtn = screen.getByRole('button', { name: 'Complete inspection' });
    expect(completeBtn).toBeDisabled();
    expect(screen.getByText(/At least one photo is required to complete/i)).toBeInTheDocument();
  });

  it('schedules a new assignment through the form (AC1)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    vi.mocked(api.scheduleGroundInspection).mockResolvedValue({ groundInspectionId: 'gi-1', status: 'scheduled', created: true });
    const user = userEvent.setup();
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();

    await user.type(screen.getByLabelText(/Assigned inspector/i), 'inspector-1');
    // datetime-local input — fill via fireEvent-style typing.
    const dt = screen.getByLabelText(/Scheduled date & time/i);
    await user.type(dt, '2026-07-10T12:00');
    await user.click(screen.getByRole('button', { name: 'Schedule assignment' }));

    await waitFor(() => expect(api.scheduleGroundInspection).toHaveBeenCalled());
    const [, claimArg, bodyArg, idemArg] = vi.mocked(api.scheduleGroundInspection).mock.calls[0]!;
    expect(claimArg).toBe(CLAIM);
    expect(bodyArg).toMatchObject({ district: 'Patna', inspectionStage: 'initial', inspectorActorId: 'inspector-1' });
    expect(typeof idemArg).toBe('string');
    expect(idemArg.length).toBeGreaterThan(0);
  });

  // ── Story 6.17 (Escalation 1) — the optional block, asserted in BOTH directions ───────────────
  //
  // ⭐ BOTH DIRECTIONS OR NEITHER. "The block field renders" proves nothing on its own: the failure
  // this guards against is a UI that silently sends a block-shaped locator for a district operator
  // (re-gating every read) or a district-shaped one for a block operator (leaving block_admin with a
  // read it still cannot pass — the inert-capability failure this whole story exists to end).

  it('Story 6.17 — the scope form sends the DISTRICT locator when the operator supplied a district', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await waitFor(() => expect(api.listGroundInspection).toHaveBeenCalled());
    expect(api.listGroundInspection).toHaveBeenCalledWith(PARIWAR, CLAIM, { district: 'Patna' });
    // ⛔ Never both — the server answers 400, and the client must not be the thing that discovers it.
    expect(vi.mocked(api.listGroundInspection).mock.calls[0]![2]).not.toHaveProperty('block');
  });

  it('Story 6.17 — the scope form sends the BLOCK locator when the operator supplied a block', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScopeByBlock();
    await waitFor(() => expect(api.listGroundInspection).toHaveBeenCalled());
    expect(api.listGroundInspection).toHaveBeenCalledWith(PARIWAR, CLAIM, { block: 'Block-1' });
    expect(vi.mocked(api.listGroundInspection).mock.calls[0]![2]).not.toHaveProperty('district');
  });

  it('Story 6.17 — Load is DISABLED until exactly one locator is supplied (neither, and both, are refused)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    const user = userEvent.setup();
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await user.type(screen.getByLabelText('Claim case id'), CLAIM);

    // NEITHER — the D4 "never degrade into return-everything" rule, surfaced before the round-trip.
    expect(screen.getByRole('button', { name: 'Load assignments' })).toBeDisabled();
    expect(screen.getByText(/exactly one/i)).toBeInTheDocument();

    // ONE — allowed.
    await user.type(screen.getByLabelText('District (your jurisdiction)'), 'Patna');
    expect(screen.getByRole('button', { name: 'Load assignments' })).toBeEnabled();

    // BOTH — refused again.
    await user.type(screen.getByLabelText('Block (optional)'), 'Block-1');
    expect(screen.getByRole('button', { name: 'Load assignments' })).toBeDisabled();
    expect(api.listGroundInspection).not.toHaveBeenCalled();
  });

  it('Story 6.17 — the schedule form OMITS `block` when left blank, and sends it when filled', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    vi.mocked(api.scheduleGroundInspection).mockResolvedValue({ groundInspectionId: 'gi-1', status: 'scheduled', created: true });
    const user = userEvent.setup();
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();

    const form = screen.getByRole('form', { name: 'Schedule a new assignment' });
    await user.type(within(form).getByLabelText(/Assigned inspector/i), 'inspector-1');
    await user.type(within(form).getByLabelText(/Scheduled date & time/i), '2026-07-10T12:00');
    await user.click(screen.getByRole('button', { name: 'Schedule assignment' }));

    await waitFor(() => expect(api.scheduleGroundInspection).toHaveBeenCalled());
    // ⛔ OMITTED, not sent as '' — the null path means the row carries NO block at all, and an empty
    // string would be a 400 (`z.string().min(1)`) rather than a district-level assignment.
    expect(vi.mocked(api.scheduleGroundInspection).mock.calls[0]![2]).not.toHaveProperty('block');

    // Now fill it in and schedule again — the block must ride the body.
    // Story 6.17 (review fix) — the ScheduleForm's block field carries its OWN label
    // ('Assignment block (optional)'), distinct from the scope-load form's 'Block (optional)' above,
    // so this no longer needs `within(form)` to disambiguate — it is the only match.
    await user.type(within(form).getByLabelText('Assignment block (optional)'), 'Block-1');
    await user.click(screen.getByRole('button', { name: 'Schedule assignment' }));
    await waitFor(() => expect(vi.mocked(api.scheduleGroundInspection).mock.calls).toHaveLength(2));
    expect(vi.mocked(api.scheduleGroundInspection).mock.calls[1]![2]).toMatchObject({ block: 'Block-1' });
  });

  it('Story 6.17 — the assignment card names the jurisdiction, and says so when there is no block', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({
      assignments: [makeAssignment({ block: 'Block-1' }), makeAssignment({ groundInspectionId: 'gi-2', block: null })],
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await waitFor(() => expect(screen.getByText('Block-1')).toBeInTheDocument());
    // ⭐ Absence is RENDERED, not blank: a blank field reads as "unknown", which is a different claim
    // from "this assignment is authorized at district level".
    expect(screen.getByText('District level (no block)')).toBeInTheDocument();
  });

  it("blocks scheduling when site type is 'other' without a location description", async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    const user = userEvent.setup();
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();

    await user.type(screen.getByLabelText(/Assigned inspector/i), 'inspector-1');
    await user.type(screen.getByLabelText(/Scheduled date & time/i), '2026-07-10T12:00');
    await user.selectOptions(screen.getByLabelText('Site type'), 'other');

    expect(screen.getByRole('button', { name: 'Schedule assignment' })).toBeDisabled();
    expect(screen.getByText(/'other' requires a location description/i)).toBeInTheDocument();
  });
});
