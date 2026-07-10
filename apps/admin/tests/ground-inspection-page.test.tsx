// `<GroundInspectionPage>` container tests — Story 6.7 (Task 6/7).
//
// Covers the operator affordances: loading a claim's assignments in a district, the
// absence-is-a-signal empty state (AC5), scheduling a new assignment (AC1), and the mandatory-photo
// completion guard being reflected in the UI (AC4 — the Complete button is disabled with 0 photos).
// The api client module is mocked (mirrors helpline-claim-page.test.tsx); the real hooks + Query
// cache are exercised via `renderWithClient`.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

async function loadScope(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Claim case id'), CLAIM);
  await user.type(screen.getByLabelText('District (your jurisdiction)'), 'Patna');
  await user.click(screen.getByRole('button', { name: 'Load assignments' }));
}

describe('<GroundInspectionPage>', () => {
  it('renders the absence-is-a-signal empty state when a claim has no assignments in the district (AC5)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await waitFor(() => expect(screen.getByText(/absence of a completed inspection/i)).toBeInTheDocument());
    expect(api.listGroundInspection).toHaveBeenCalledWith(PARIWAR, CLAIM, 'Patna');
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
