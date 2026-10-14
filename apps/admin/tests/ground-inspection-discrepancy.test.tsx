// Story 6.27d (Task 3.3; AC2, AC4 – AC6) — the inspector's discrepancy panel on `<GroundInspectionPage>`, with a REAL
// `useQuery` under the app's REAL QueryClient defaults (`gcTime: 0`, `refetchOnMount: 'always'` — `renderWithClient`):
//   · the completion SEEDS the result, the list refetch flips the card to `completed` in the same flush (the action
//     unmounts) — and the panel shows the result with ⛔ GET;
//   · both screens' copy VERBATIM (PM25 (a)); ② renders the date as the page does, `—` when `unavailable`;
//   · the withheld shape renders `<WithheldNote>`, ⛔ either screen;
//   · a `certificate_check` / NULL-source / `scheduled` card renders ⛔ panel; a completed card viewed by a NON-inspector
//     fires ⛔ GET (an on-demand button); the inspector's own card fetches;
//   · the DOM never carries a neighbour's name, value or count;
//   · notes: per-row saves with two deferred promises (each box its own result); another author's note read-only WITH the
//     author; an `unavailable` note's words; a 409 `discrepancy_note_exists` re-reads.

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../src/api/client.js';
import { GroundInspectionPage } from '../src/modules/ground-inspection/GroundInspectionPage.js';
import { renderWithClient } from './_helpers.js';

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getSession: vi.fn(),
    listGroundInspection: vi.fn(),
    getGroundInspectionCertificate: vi.fn(),
    completeGroundInspection: vi.fn(),
    getInspectionDiscrepancy: vi.fn(),
    recordInspectionDiscrepancyNote: vi.fn(),
  };
});

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '22222222-2222-2222-2222-222222222222';
const GID = '33333333-3333-3333-3333-333333333333';
const INSPECTOR = 'a1a1a1a1-0000-4000-8000-000000000001';
const SUPERVISOR = 'b2b2b2b2-0000-4000-8000-000000000002';

const FOUND =
  "Thank you, your response has been recorded. We found the family's answers don't match the neighbours' observations. Please ask the family again, in your own words, without mentioning anyone else's answer, and record their response in the note next to each question.";
const NONE = 'Thank you, your response has been recorded. No further action needed.';
const HAS_DIED = "The family reported that the member has died. A neighbour's answer differs.";

const originalPhoto = {
  photoId: 'p-orig', contentType: 'image/jpeg', byteSize: 1, caption: null, captionWithheld: null, signedUrl: 'https://x/p',
  photoKind: 'original_certificate' as const, certificateToken: 'tok-current' as string | null,
};
const CERT = { certificateToken: 'tok-current', contentType: 'application/pdf', signedUrl: 'https://x/certificate', expiresInSeconds: 300 };

function makeAssignment(over: Partial<api.GroundInspectionAssignmentT> = {}): api.GroundInspectionAssignmentT {
  return {
    groundInspectionId: GID,
    district: 'Patna',
    block: null,
    inspectionStage: 'initial',
    inspectionSiteType: 'family_residence',
    inspectorActorId: INSPECTOR,
    scheduledAt: '2026-07-10T12:00:00.000Z',
    status: 'scheduled',
    refusalReason: null,
    supersedesGroundInspectionId: null,
    completedAt: null,
    structuredFindings: null,
    locationDetail: null,
    familyContact: null,
    notes: null,
    notesWithheld: null,
    photos: [originalPhoto],
    originalCertificateVerdict: null,
    comparedCertificateToken: null,
    deathDateSource: null,
    deathDate: null,
    deathTime: null,
    ...over,
  };
}
const completed = (over: Partial<api.GroundInspectionAssignmentT> = {}) =>
  makeAssignment({
    status: 'completed',
    completedAt: '2026-07-10T13:00:00.000Z',
    originalCertificateVerdict: 'matches',
    comparedCertificateToken: 'tok-current',
    deathDateSource: 'family_statement',
    deathDate: '2026-06-15',
    ...over,
  });

async function loadScope(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Claim case id'), CLAIM);
  await user.type(screen.getByLabelText('District (your jurisdiction)'), 'Patna');
  await user.click(screen.getByRole('button', { name: 'Load assignments' }));
}

function session(userId: string): void {
  vi.mocked(api.getSession).mockResolvedValue({ userId, nationalGrants: [] });
}

/** A neighbour's name / value / count must ⛔ appear anywhere in the page. */
function expectNoNeighbourContent(): void {
  const text = document.body.textContent ?? '';
  for (const forbidden of ['Asha', 'not_died', 'not died', '2026-06-01', 'neighbours said', '1 neighbour', '2 neighbours']) {
    expect(text.includes(forbidden), forbidden).toBe(false);
  }
}

describe('Story 6.27d — the inspector\'s discrepancy panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session(INSPECTOR);
  });

  it('⭐ the completion SEEDS the result; the list refetch flips the card to `completed` (the action unmounts) and the panel shows it with ⛔ GET', async () => {
    vi.mocked(api.listGroundInspection)
      .mockResolvedValueOnce({ assignments: [makeAssignment()] })
      .mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
    vi.mocked(api.completeGroundInspection).mockResolvedValue({
      groundInspectionId: GID,
      status: 'completed',
      discrepancy: { state: 'shown', questionKeys: ['has_died', 'death_date'], familyDeathDate: { status: 'shown', date: '2026-06-15' } },
    });
    // The inspector's own card WOULD fetch if the seed were lost — the seed must make it unnecessary.
    vi.mocked(api.getInspectionDiscrepancy).mockRejectedValue(new Error('the seeded result must be served without a GET'));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Compare with the certificate we hold' }));
    await screen.findByRole('link', { name: 'Open the uploaded certificate' });
    await user.click(screen.getByLabelText('It matches'));
    fireEvent.change(screen.getByLabelText(/Date of death/), { target: { value: '2026-06-15' } });
    await user.click(screen.getByRole('button', { name: 'Complete inspection' }));

    const panel = await screen.findByTestId('gi-discrepancy-found');
    expect(screen.queryByRole('button', { name: 'Complete inspection' })).toBeNull(); // unmounted
    expect(within(panel).getByText(FOUND)).toBeInTheDocument();
    expect(within(panel).getByText(HAS_DIED)).toBeInTheDocument();
    expect(within(panel).getByText("The family said: 2026-06-15. A neighbour's answer differs.")).toBeInTheDocument();
    expect(within(panel).getAllByRole('textbox')).toHaveLength(2); // ONE note box per differing question
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
    expectNoNeighbourContent();
  });

  it('⛔ difference ⇒ the "no further action" screen VERBATIM, ⛔ a note box', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const none = await screen.findByTestId('gi-discrepancy-none');
    expect(none).toHaveTextContent(NONE);
    expect(within(screen.getByTestId('gi-discrepancy')).queryByRole('textbox')).toBeNull();
    // The inspector's OWN card fetched (the session names the assigned inspector — normalised).
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledWith(PARIWAR, CLAIM, GID);
  });

  it('the session id is compared under the domain\'s normalisation (whitespace + case) — the inspector\'s card still fetches', async () => {
    session(` ${INSPECTOR.toUpperCase()}\t`);
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await screen.findByTestId('gi-discrepancy-none');
  });

  it('② an `unavailable` family date renders the page\'s `—`', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({
      discrepancy: { state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'unavailable' } },
      notes: [],
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    expect(await screen.findByText("The family said: —. A neighbour's answer differs.")).toBeInTheDocument();
  });

  it('the WITHHELD shape renders `<WithheldNote>` — ⛔ either screen', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'withheld', reason: 'own_visit' }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    expect(await screen.findByTestId('gi-discrepancy-withheld')).toBeInTheDocument();
    expect(screen.queryByText(NONE)).toBeNull();
    expect(screen.queryByText(FOUND)).toBeNull();
  });

  it('⛔ panel for a `scheduled` card (AC2), a `certificate_check` and a NULL-source (pre-0147) completed card', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({
      assignments: [
        makeAssignment({ groundInspectionId: 'g-scheduled' }),
        completed({ groundInspectionId: 'g-check', inspectionStage: 'certificate_check', deathDateSource: 'original_certificate' }),
        completed({ groundInspectionId: 'g-legacy', deathDateSource: null, originalCertificateVerdict: null }),
      ],
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await waitFor(() => expect(screen.getAllByText(INSPECTOR).length).toBe(3));
    expect(screen.queryByTestId('gi-discrepancy')).toBeNull();
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
  });

  it('a completed card viewed by a NON-inspector fires ⛔ GET — an on-demand "Show the result"; a 403 shows the server\'s words', async () => {
    session(SUPERVISOR);
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockRejectedValue(new api.ApiError(403, 'authz.forbidden', 'You do not have permission for this action'));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const show = await screen.findByRole('button', { name: 'Show the result' });
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
    await userEvent.setup().click(show);
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission for this action');
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(1);
  });

  it('notes — two boxes saved at once resolve EACH on its own (per-call `mutateAsync`); each then shows read-only "Recorded"', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const shown = { state: 'shown' as const, questionKeys: ['has_died' as const, 'death_date' as const], familyDeathDate: { status: 'shown' as const, date: '2026-06-15' } };
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValueOnce({ discrepancy: shown, notes: [] });
    let resolveA!: (v: Awaited<ReturnType<typeof api.recordInspectionDiscrepancyNote>>) => void;
    let resolveB!: (v: Awaited<ReturnType<typeof api.recordInspectionDiscrepancyNote>>) => void;
    vi.mocked(api.recordInspectionDiscrepancyNote)
      .mockImplementationOnce(() => new Promise((r) => (resolveA = r)))
      .mockImplementationOnce(() => new Promise((r) => (resolveB = r)));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const hasDied = await screen.findByTestId('gi-discrepancy-has_died');
    const date = screen.getByTestId('gi-discrepancy-death_date');
    await user.type(within(hasDied).getByRole('textbox'), 'At home.');
    await user.type(within(date).getByRole('textbox'), 'On the 15th.');
    await user.click(within(hasDied).getByRole('button', { name: 'Save note' }));
    await user.click(within(date).getByRole('button', { name: 'Save note' }));
    expect(api.recordInspectionDiscrepancyNote).toHaveBeenNthCalledWith(1, PARIWAR, CLAIM, GID, { questionKey: 'has_died', note: 'At home.' });
    expect(api.recordInspectionDiscrepancyNote).toHaveBeenNthCalledWith(2, PARIWAR, CLAIM, GID, { questionKey: 'death_date', note: 'On the 15th.' });
    const after = (keys: ('has_died' | 'death_date')[]) => ({
      discrepancy: shown,
      notes: keys.map((k) => ({ questionKey: k, note: k === 'has_died' ? 'At home.' : 'On the 15th.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' })),
    });
    // The SECOND save resolves FIRST — the first box is still saving.
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValueOnce(after(['death_date']));
    resolveB({ questionKey: 'death_date', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' });
    await waitFor(() => expect(within(date).getByText('Recorded')).toBeInTheDocument());
    expect(within(hasDied).getByRole('button', { name: 'Saving…' })).toBeDisabled();
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValueOnce(after(['death_date', 'has_died']));
    resolveA({ questionKey: 'has_died', notedAt: '2026-07-10T13:06:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' });
    await waitFor(() => expect(within(hasDied).getByText('Recorded')).toBeInTheDocument());
    expect(within(hasDied).getByText('At home.')).toBeInTheDocument();
    // The result is announced politely.
    expect(within(hasDied).getByRole('status')).toHaveTextContent('Note recorded.');
  });

  it('R4a — another author\'s note renders read-only WITH that author; an `unavailable` note says so, ⛔ blank', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({
      discrepancy: { state: 'shown', questionKeys: ['has_died', 'death_date'], familyDeathDate: { status: 'shown', date: '2026-06-15' } },
      notes: [
        { questionKey: 'has_died', note: 'The family repeated: at home.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: SUPERVISOR, authorDisplay: 'Supervisor Two' },
        { questionKey: 'death_date', note: { status: 'unavailable' }, notedAt: '2026-07-10T13:06:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' },
      ],
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const hasDied = await screen.findByTestId('gi-discrepancy-note-has_died');
    expect(hasDied).toHaveTextContent('Recorded by Supervisor Two');
    expect(hasDied).toHaveTextContent('The family repeated: at home.');
    const date = screen.getByTestId('gi-discrepancy-note-death_date');
    expect(date).toHaveTextContent('Recorded'); // the viewer's own
    expect(date).not.toHaveTextContent('Inspector One');
    expect(date).toHaveTextContent('This note could not be shown');
    expect(within(screen.getByTestId('gi-discrepancy')).queryByRole('textbox')).toBeNull();
  });

  it('a 409 `discrepancy_note_exists` RE-READS and then shows the existing note with its author — ⛔ an empty box again', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const shown = { state: 'shown' as const, questionKeys: ['has_died' as const], familyDeathDate: null };
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({ discrepancy: shown, notes: [] })
      .mockResolvedValueOnce({
        discrepancy: shown,
        notes: [{ questionKey: 'has_died', note: 'Supervisor wrote first.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: SUPERVISOR, authorDisplay: 'Supervisor Two' }],
      });
    vi.mocked(api.recordInspectionDiscrepancyNote).mockRejectedValue(
      new api.ApiError(409, 'ground_inspection.discrepancy_note_exists', 'A note on this question is already recorded'),
    );
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'Mine.');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    expect(await within(box).findByText('Recorded by Supervisor Two')).toBeInTheDocument();
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(2);
  });

  it('the note write\'s window and hidden refusals have the page\'s own words', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null }, notes: [] });
    vi.mocked(api.recordInspectionDiscrepancyNote)
      .mockRejectedValueOnce(new api.ApiError(409, 'ground_inspection.not_allowed', 'server words'))
      .mockRejectedValueOnce(new api.ApiError(409, 'ground_inspection.own_ground_visit_pending', 'server words'));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'x');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    expect(await within(box).findByRole('alert')).toHaveTextContent('This claim is no longer open for notes on the visit.');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    await waitFor(() =>
      expect(within(box).getByRole('alert')).toHaveTextContent('Your own ground visit on this claim is not finished yet — finish it before recording a note.'),
    );
  });
});
