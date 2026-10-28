// Story 6.27d (Task 3.3; AC2, AC4 – AC6) — the inspector's discrepancy panel on `<GroundInspectionPage>`, with a REAL
// `useQuery` under the app's REAL QueryClient (`createQueryClient` — `renderWithClient`). The panel's own query OVERRIDES
// the client defaults (`DISCREPANCY_QUERY_DEFAULTS`: `staleTime: Infinity`, `refetchOnMount: false`, `gcTime: 0`) so a
// seeded result is served without a fetch and forgotten on unmount; the session and list queries keep the client's.
//   · the completion SEEDS the result, the list refetch flips the card to `completed` in the same flush (the action
//     unmounts) — and the panel shows the result with ⛔ GET;
//   · both screens' copy VERBATIM (PM25 (a)); ② renders the date as the page does, `—` when `unavailable`;
//   · the withheld shape renders `<WithheldNote>`, ⛔ either screen;
//   · a `certificate_check` / NULL-source / `scheduled` card renders ⛔ panel; a completed card viewed by a NON-inspector
//     fires ⛔ GET (an on-demand button); the inspector's own card fetches;
//   · the DOM never carries a neighbour's name, value or count — even when a response carries them (the panel renders
//     only its own fields; the client's parse strips them too — `ground-inspection-discrepancy-client.test.ts`);
//   · notes: per-row saves with two deferred promises (each box its own result); another author's note read-only WITH the
//     author; an `unavailable` note's words; a 409 `discrepancy_note_exists` re-reads.
//   · code review round 2 (R2-2 … R2-14): the note refusals' words stay in the note box; ⛔ `crypto.randomUUID` in render;
//     the stable live regions and their re-announcements; a viewer not yet known; a save settling after unmount; a newly
//     hidden reader; the previous actor's cached session; the MutationCache.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryClientProvider } from '@tanstack/react-query';

import * as api from '../src/api/client.js';
import { createQueryClient } from '../src/api/hooks.js';
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
    refuseGroundInspection: vi.fn(),
    // ⭐ Story 6.32 (IQ12) — ⛔ questionnaire for these visits (404) ⇒ ⛔ panel: the page this file pins, byte for byte.
    getGroundInspectionQuestionnaire: vi.fn(() =>
      Promise.reject(new actual.ApiError(404, 'ground_inspection.questionnaire_unavailable', 'There is no questionnaire for this visit')),
    ),
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
      discrepancy: {
        state: 'shown',
        questionKeys: ['has_died', 'death_date'],
        familyDeathDate: { status: 'shown', date: '2026-06-15' }, familyAnswers: null,
        // ⛔ on the wire (the client strips them) — fed here so `expectNoNeighbourContent` can fail if the panel spread them.
        ...({ neighbourName: 'Asha', valueCodes: ['not_died'], neighbourDate: '2026-06-01', count: '2 neighbours' } as object),
      },
    });
    // The inspector's own card WOULD fetch if the seed were lost — the seed must make it unnecessary.
    vi.mocked(api.getInspectionDiscrepancy).mockRejectedValue(new Error('the seeded result must be served without a GET'));
    const qc = createQueryClient();
    render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
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
    // R2-13 — the unmounted completion action leaves ⛔ its response (the result) in the MutationCache (R3-6: within its
    // 1 s `gcTime` — ⛔ 0, which spins a 0 ms timer while a mutation is pending and unobserved).
    await waitFor(
      () => expect(qc.getMutationCache().getAll().filter((m) => m.state.data != null && 'discrepancy' in (m.state.data as object))).toEqual([]),
      { timeout: 3000 },
    );
  });

  it('⛔ difference ⇒ the "no further action" screen VERBATIM, ⛔ a note box', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null }, notes: [] });
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
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await screen.findByTestId('gi-discrepancy-none');
  });

  it('② an `unavailable` family date renders the page\'s `—`', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({
      discrepancy: { state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'unavailable' }, familyAnswers: null },
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
    const shown = { state: 'shown' as const, questionKeys: ['has_died' as const, 'death_date' as const], familyDeathDate: { status: 'shown' as const, date: '2026-06-15' }, familyAnswers: null };
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
    // R2-4 — the box's polite region is ONE node for its whole life (⛔ re-inserted when the box turns read-only).
    const hasDiedRegion = within(hasDied).getByTestId('gi-discrepancy-note-status-has_died');
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
    // The result is announced politely — in the SAME region node that was there before the save.
    expect(within(hasDied).getByRole('status')).toBe(hasDiedRegion);
    expect(hasDiedRegion).toHaveTextContent('Note recorded.');
  });

  it('R2-4 — a confirmed save turns the box read-only AT ONCE (⛔ an empty editable box before the panel\'s refresh)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const shown = { state: 'shown' as const, questionKeys: ['has_died' as const], familyDeathDate: null, familyAnswers: null };
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValueOnce({ discrepancy: shown, notes: [] }).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(api.recordInspectionDiscrepancyNote).mockResolvedValue({ questionKey: 'has_died', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'Said at home.');
    const seen: string[] = [];
    const observer = new MutationObserver(() => {
      if (within(box).queryByRole('textbox') !== null && (within(box).getByRole('textbox') as HTMLTextAreaElement).value === '') seen.push('empty box');
    });
    observer.observe(box, { subtree: true, childList: true, characterData: true, attributes: true });
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    await within(box).findByText('Said at home.');
    observer.disconnect();
    expect(seen).toEqual([]);
    expect(within(box).queryByRole('textbox')).toBeNull();
  });

  it('R4a — another author\'s note renders read-only WITH that author; an `unavailable` note says so, ⛔ blank', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({
      discrepancy: { state: 'shown', questionKeys: ['has_died', 'death_date'], familyDeathDate: { status: 'shown', date: '2026-06-15' }, familyAnswers: null },
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
    const shown = { state: 'shown' as const, questionKeys: ['has_died' as const], familyDeathDate: null, familyAnswers: null };
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
    const region = within(box).getByTestId('gi-discrepancy-note-status-has_died');
    await user.type(within(box).getByRole('textbox'), 'Mine.');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    const note = await within(box).findByTestId('gi-discrepancy-note-has_died');
    expect(note).toHaveTextContent('Recorded by Supervisor Two');
    expect(note).toHaveTextContent('Supervisor wrote first.');
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(2);
    // R2-4 — the author state is ANNOUNCED (the same region node), and the reason stays on screen beside it.
    await waitFor(() => expect(region).toHaveTextContent('Recorded by Supervisor Two'));
    expect(within(box).getByRole('status')).toBe(region);
    expect(within(box).getByRole('alert')).toHaveTextContent('A note on this question is already recorded.');
  });

  it('the note write\'s window and hidden refusals have the page\'s own words', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
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

  it('R2-2 — a window refusal on ANOTHER action keeps the server\'s words (the note box\'s words are its own)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment()] });
    vi.mocked(api.refuseGroundInspection).mockRejectedValue(
      new api.ApiError(409, 'ground_inspection.not_allowed', 'The claim is not in its verification window.'),
    );
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    await user.type(await screen.findByPlaceholderText('Mandatory reason note (encrypted)'), 'Family away.');
    await user.click(screen.getByRole('button', { name: 'Record refusal' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The claim is not in its verification window.');
    expect(alert).not.toHaveTextContent('notes on the visit');
  });

  it("CR1 / R2-13 — signing in as another actor never displays, nor FETCHES for, the previous actor's result", async () => {
    const qc = createQueryClient();
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({
      discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null },
      notes: [{ questionKey: 'has_died', note: 'Private family response', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' }],
    });
    const first = render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
    await loadScope();
    await screen.findByText('Private family response');
    first.unmount();
    expect(qc.getQueriesData({ queryKey: ['ground-inspection-discrepancy'] })).toEqual([]);
    // A sign-out only INVALIDATES the session: the cache still names the PREVIOUS actor while the new session's fetch is
    // in flight — held open here until the list is on screen, so the stale id is what the cards would see.
    qc.setQueryData(['session'], { userId: INSPECTOR, nationalGrants: [] });
    let resolveSession!: (s: Awaited<ReturnType<typeof api.getSession>>) => void;
    vi.mocked(api.getSession).mockImplementation(() => new Promise((r) => (resolveSession = r)));
    vi.mocked(api.getInspectionDiscrepancy).mockClear();
    vi.mocked(api.getInspectionDiscrepancy).mockRejectedValue(new api.ApiError(403, 'authz.forbidden', 'Denied for this viewer'));
    render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
    await loadScope();
    const pending = await screen.findByRole('button', { name: 'Show the result' });
    expect(pending).toBeDisabled(); // the viewer is ⛔ known yet (R2-11)
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
    resolveSession({ userId: SUPERVISOR, nationalGrants: [] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Show the result' })).toBeEnabled());
    expect(screen.queryByText('Private family response')).toBeNull();
    expect(screen.queryByTestId('gi-discrepancy-found')).toBeNull();
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show the result' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Denied for this viewer');
  });

  it('CR1 — changing the active session also clears the result while the page is mounted', async () => {
    const qc = createQueryClient();
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
    await loadScope();
    await screen.findByTestId('gi-discrepancy-found');
    session(SUPERVISOR);
    qc.setQueryData(['session'], { userId: SUPERVISOR, nationalGrants: [] });
    await screen.findByRole('button', { name: 'Show the result' });
    expect(screen.queryByTestId('gi-discrepancy-found')).toBeNull();
    expect(qc.getQueriesData({ queryKey: ['ground-inspection-discrepancy'] }).every(([key]) => !key.includes(INSPECTOR))).toBe(true);
  });

  it.each(['check_failed', 'own_visit'] as const)('CR2/CR4 — a withheld %s result can be retried and the recovered result is announced', async (reason) => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({ discrepancy: { state: 'withheld', reason }, notes: [] })
      .mockResolvedValueOnce({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const withheld = await screen.findByTestId('gi-discrepancy-withheld');
    await waitFor(() => expect(screen.getByTestId('gi-discrepancy-announcement')).toHaveTextContent(withheld.textContent!));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByTestId('gi-discrepancy-found');
    await waitFor(() => expect(screen.getByTestId('gi-discrepancy-announcement')).toHaveTextContent(FOUND));
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(2);
  });

  it('CR1/CR2 — reopening rechecks access and can recover a transient withheld result', async () => {
    const qc = createQueryClient();
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({ discrepancy: { state: 'withheld', reason: 'check_failed' }, notes: [] })
      .mockResolvedValueOnce({ discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null }, notes: [] });
    const first = render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
    await loadScope();
    await screen.findByTestId('gi-discrepancy-withheld');
    first.unmount();
    render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
    await loadScope();
    await screen.findByTestId('gi-discrepancy-none');
    await waitFor(() => expect(screen.getByTestId('gi-discrepancy-announcement')).toHaveTextContent(NONE));
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(2);
  });

  it('CR3 — a successful note remains read-only with its submitted text when refresh fails, with a retry', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const shown = { state: 'shown' as const, questionKeys: ['has_died' as const], familyDeathDate: null, familyAnswers: null };
    const note = { questionKey: 'has_died' as const, notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One', note: 'Saved family response' };
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({ discrepancy: shown, notes: [] })
      .mockRejectedValueOnce(new Error('Refresh failed'))
      .mockResolvedValueOnce({ discrepancy: shown, notes: [note] });
    // R2-14 — the REAL 201 shape (⛔ the note text — `InspectionDiscrepancyNoteWritten`): the box must install what was SUBMITTED.
    vi.mocked(api.recordInspectionDiscrepancyNote).mockResolvedValue({
      questionKey: note.questionKey, notedAt: note.notedAt, authorActorId: note.authorActorId, authorDisplay: note.authorDisplay,
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const panel = await screen.findByTestId('gi-discrepancy-has_died');
    const user = userEvent.setup();
    await user.type(within(panel).getByRole('textbox'), note.note);
    await user.click(within(panel).getByRole('button', { name: 'Save note' }));
    await within(panel).findByText(note.note);
    expect(within(panel).queryByRole('textbox')).toBeNull();
    expect(await screen.findByRole('alert')).toHaveTextContent('The result could not be refreshed');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(within(panel).getByText(note.note)).toBeInTheDocument();
    expect(api.recordInspectionDiscrepancyNote).toHaveBeenCalledTimes(1);
  });

  it('R2-3 — the panel renders where `crypto.randomUUID` is unavailable (plain HTTP); each opening has its own key', async () => {
    const spy = vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      throw new TypeError('crypto.randomUUID is not a function');
    });
    try {
      const qc = createQueryClient();
      vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
      vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null }, notes: [] });
      // The key is [root, pariwar, claim, assignment, readId] (round 3, R3-2 — ⛔ the viewer).
      const readIdOf = () => qc.getQueryCache().findAll({ queryKey: ['ground-inspection-discrepancy'] }).map((q) => q.queryKey[4]);
      const first = render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
      await loadScope();
      await screen.findByTestId('gi-discrepancy-none');
      const [firstId] = readIdOf();
      first.unmount();
      render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
      await loadScope();
      await screen.findByTestId('gi-discrepancy-none');
      const [secondId] = readIdOf();
      expect(typeof firstId).toBe('string');
      expect(secondId).not.toBe(firstId);
    } finally {
      spy.mockRestore();
    }
  });

  it('R2-4 — "Try again" announces its loading, then the result AGAIN even when unchanged; a repeated failure is re-alerted', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    let release!: () => void;
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({ discrepancy: { state: 'withheld', reason: 'check_failed' }, notes: [] })
      .mockImplementationOnce(() => new Promise((r) => (release = () => r({ discrepancy: { state: 'withheld', reason: 'check_failed' }, notes: [] }))))
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'))
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const withheld = await screen.findByTestId('gi-discrepancy-withheld');
    const region = screen.getByTestId('gi-discrepancy-announcement');
    const words = withheld.textContent!;
    await waitFor(() => expect(region).toHaveTextContent(words));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(region).toHaveTextContent('Loading the result…'));
    release();
    await waitFor(() => expect(region).toHaveTextContent(words)); // the SAME result, said again
    expect(screen.getByTestId('gi-discrepancy-announcement')).toBe(region);
    // Two failures in a row: each re-inserts its alert (an unchanged alert says nothing).
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    const firstAlert = await screen.findByRole('alert');
    expect(firstAlert).toHaveTextContent('The result could not be refreshed');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(firstAlert));
    expect(screen.getByRole('alert')).toHaveTextContent('The result could not be refreshed');
    // The withheld result itself stays uniform — ⛔ a word of the result changed by the failures.
    expect(screen.getByTestId('gi-discrepancy-withheld')).toHaveTextContent(words);
  });

  it('R2-4 — a retry after a failed FIRST read announces its loading, and a second identical failure is re-alerted', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    let fail!: () => void;
    vi.mocked(api.getInspectionDiscrepancy)
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'))
      .mockImplementationOnce(() => new Promise((_r, reject) => (fail = () => reject(new api.ApiError(503, 'service.unavailable', 'Try later')))));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const firstAlert = await screen.findByRole('alert');
    expect(firstAlert).toHaveTextContent('Try later');
    const region = screen.getByTestId('gi-discrepancy-announcement');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(region).toHaveTextContent('Loading the result…'));
    fail();
    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(firstAlert));
    expect(screen.getByRole('alert')).toHaveTextContent('Try later');
    await waitFor(() => expect(region.textContent).toBe(''));
  });

  it('R2-11 — before the viewer is known, "Show the result" is DISABLED (⛔ a silent no-op) and a completion\'s seed is still shown', async () => {
    vi.mocked(api.getSession).mockImplementation(() => new Promise(() => undefined)); // the session never answers
    vi.mocked(api.listGroundInspection)
      .mockResolvedValueOnce({ assignments: [makeAssignment(), completed({ groundInspectionId: 'g-other' })] })
      .mockResolvedValue({ assignments: [completed(), completed({ groundInspectionId: 'g-other' })] });
    vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
    vi.mocked(api.completeGroundInspection).mockResolvedValue({
      groundInspectionId: GID, status: 'completed', discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null },
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const show = await screen.findByRole('button', { name: 'Show the result' });
    expect(show).toBeDisabled();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Compare with the certificate we hold' }));
    await screen.findByRole('link', { name: 'Open the uploaded certificate' });
    await user.click(screen.getByLabelText('It matches'));
    fireEvent.change(screen.getByLabelText(/Date of death/), { target: { value: '2026-06-15' } });
    await user.click(screen.getByRole('button', { name: 'Complete inspection' }));
    expect(await screen.findByTestId('gi-discrepancy-none')).toHaveTextContent(NONE);
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
  });

  it('R2-13 (fix-diff review) — a session refetch that FAILS after mount leaves the viewer UNKNOWN: the previous actor\'s card fires ⛔ GET', async () => {
    const qc = createQueryClient();
    // The PREVIOUS actor is still cached (a sign-out only invalidates); the mount's refetch then FAILS — `isFetchedAfterMount`
    // turns true on an error too, so ⛔ that alone may name the viewer.
    qc.setQueryData(['session'], { userId: INSPECTOR, nationalGrants: [] });
    vi.mocked(api.getSession).mockRejectedValue(new api.ApiError(503, 'session.unavailable', 'Session unavailable'));
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
    await loadScope();
    const show = await screen.findByRole('button', { name: 'Show the result' });
    // ⭐ Round 3 (R3-8) — assert only once the session HAS failed (⛔ merely started: a pending fetch disables it too).
    await waitFor(() => expect(qc.getQueryState(['session'])?.status).toBe('error'));
    expect(show).toBeDisabled();
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
  });

  it('R2-13 (fix-diff review) — the viewer becoming KNOWN re-keys ⛔ card: a result seeded while it was unknown SURVIVES', async () => {
    let resolveSession!: (s: Awaited<ReturnType<typeof api.getSession>>) => void;
    vi.mocked(api.getSession).mockImplementation(() => new Promise((r) => (resolveSession = r)));
    vi.mocked(api.listGroundInspection)
      .mockResolvedValueOnce({ assignments: [makeAssignment(), completed({ groundInspectionId: 'g-other' })] })
      .mockResolvedValue({ assignments: [completed(), completed({ groundInspectionId: 'g-other' })] });
    vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
    vi.mocked(api.completeGroundInspection).mockResolvedValue({
      groundInspectionId: GID, status: 'completed', discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null },
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Compare with the certificate we hold' }));
    await screen.findByRole('link', { name: 'Open the uploaded certificate' });
    await user.click(screen.getByLabelText('It matches'));
    fireEvent.change(screen.getByLabelText(/Date of death/), { target: { value: '2026-06-15' } });
    await user.click(screen.getByRole('button', { name: 'Complete inspection' }));
    expect(await screen.findByTestId('gi-discrepancy-none')).toHaveTextContent(NONE);
    // The viewer becomes known — an override completer, ⛔ the assigned inspector. The OTHER card's button enables (the
    // viewer IS known now); the completed card keeps its seeded result (re-keying it would drop the seed and offer
    // "Show the result" there too).
    resolveSession({ userId: SUPERVISOR, nationalGrants: [] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Show the result' })).toBeEnabled());
    expect(screen.getAllByRole('button', { name: 'Show the result' })).toHaveLength(1);
    expect(screen.getByTestId('gi-discrepancy-none')).toHaveTextContent(NONE);
    expect(api.getInspectionDiscrepancy).not.toHaveBeenCalled();
  });

  it('R2-12 / R2-13 — a save settling AFTER the panel is gone fetches ⛔ and re-creates ⛔; its note text leaves the MutationCache', async () => {
    const qc = createQueryClient();
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    let resolve!: (v: Awaited<ReturnType<typeof api.recordInspectionDiscrepancyNote>>) => void;
    vi.mocked(api.recordInspectionDiscrepancyNote).mockImplementation(() => new Promise((r) => (resolve = r)));
    const view = render(<QueryClientProvider client={qc}><GroundInspectionPage pariwarId={PARIWAR} /></QueryClientProvider>);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'The family said: at home.');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(1);
    view.unmount();
    resolve({ questionKey: 'has_died', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' });
    await new Promise((r) => setTimeout(r, 20));
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(1);
    expect(qc.getQueriesData({ queryKey: ['ground-inspection-discrepancy'] })).toEqual([]);
    await waitFor(
      () => expect(qc.getMutationCache().getAll().filter((m) => JSON.stringify(m.state.variables ?? null).includes('at home'))).toEqual([]),
      { timeout: 3000 },
    );
  });

  it('R2-12 — a reader who has become HIDDEN (409 `own_ground_visit_pending`) re-reads: the cached result gives way to the withheld shape', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({
        discrepancy: { state: 'shown', questionKeys: ['has_died', 'death_date'], familyDeathDate: { status: 'shown', date: '2026-06-15' }, familyAnswers: null },
        notes: [{ questionKey: 'death_date', note: 'Another author\'s note.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: SUPERVISOR, authorDisplay: 'Supervisor Two' }],
      })
      .mockResolvedValueOnce({ discrepancy: { state: 'withheld', reason: 'own_visit' }, notes: [] });
    vi.mocked(api.recordInspectionDiscrepancyNote).mockRejectedValue(
      new api.ApiError(409, 'ground_inspection.own_ground_visit_pending', 'server words'),
    );
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'x');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    expect(await screen.findByTestId('gi-discrepancy-withheld')).toBeInTheDocument();
    expect(screen.queryByText('Another author\'s note.')).toBeNull();
    expect(screen.queryByTestId('gi-discrepancy-found')).toBeNull();
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(2);
  });
  /** Complete the scheduled card through the page's real action (the R2-11 steps). */
  async function completeThroughThePage(): Promise<void> {
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Compare with the certificate we hold' }));
    await screen.findByRole('link', { name: 'Open the uploaded certificate' });
    await user.click(screen.getByLabelText('It matches'));
    fireEvent.change(screen.getByLabelText(/Date of death/), { target: { value: '2026-06-15' } });
    await user.click(screen.getByRole('button', { name: 'Complete inspection' }));
  }

  it('R3-2 — a seeded result RETRIED while the viewer is unknown is kept when the viewer becomes known (⛔ the seed again, ⛔ a GET)', async () => {
    let resolveSession!: (s: Awaited<ReturnType<typeof api.getSession>>) => void;
    vi.mocked(api.getSession).mockImplementation(() => new Promise((r) => (resolveSession = r)));
    vi.mocked(api.listGroundInspection)
      .mockResolvedValueOnce({ assignments: [makeAssignment()] })
      .mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
    vi.mocked(api.completeGroundInspection).mockResolvedValue({
      groundInspectionId: GID, status: 'completed', discrepancy: { state: 'withheld', reason: 'check_failed' },
    });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await completeThroughThePage();
    await screen.findByTestId('gi-discrepancy-withheld');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByTestId('gi-discrepancy-found');
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSession({ userId: INSPECTOR, nationalGrants: [] });
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByTestId('gi-discrepancy-found')).toBeInTheDocument();
    expect(screen.queryByTestId('gi-discrepancy-withheld')).toBeNull();
    expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(1);
  });

  it('R3-3 — a 201 the follow-up re-read does ⛔ confirm (⛔ note for that key) returns the box to editable, with the text and a reason', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    vi.mocked(api.recordInspectionDiscrepancyNote).mockResolvedValue({
      questionKey: 'has_died', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One',
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'At home, at night.');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(2));
    expect(await within(box).findByRole('alert')).toHaveTextContent('could not be confirmed as recorded');
    expect(within(box).getByRole('textbox')).toHaveValue('At home, at night.');
    expect(within(box).queryByTestId('gi-discrepancy-note-has_died')).toBeNull();
    // The other arm — a FAILED refresh keeps the confirmed note — is the CR3 test above.
  });

  it('R3-3 (fix-diff review) — a FAILED first re-read keeps the note (CR3); a LATER successful read without it returns the box to editable', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const none = { discrepancy: { state: 'shown' as const, questionKeys: ['has_died' as const], familyDeathDate: null, familyAnswers: null }, notes: [] };
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce(none)
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'))
      .mockResolvedValueOnce(none);
    vi.mocked(api.recordInspectionDiscrepancyNote).mockResolvedValue({
      questionKey: 'has_died', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One',
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'At home, at night.');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    expect(await screen.findByText('The result could not be refreshed. The last recorded information is still shown.')).toBeInTheDocument();
    expect(within(box).getByTestId('gi-discrepancy-note-has_died')).toHaveTextContent('At home, at night.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await within(box).findByText(/could not be confirmed as recorded/)).toBeInTheDocument();
    expect(within(box).getByRole('textbox')).toHaveValue('At home, at night.');
    expect(within(box).queryByTestId('gi-discrepancy-note-has_died')).toBeNull();
  });

  it('R3-3 (fix-diff review) — the "not confirmed" reason clears once a note for that question ARRIVES (another author\'s, via a refresh)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const both = { discrepancy: { state: 'shown' as const, questionKeys: ['has_died' as const, 'death_date' as const], familyDeathDate: { status: 'shown' as const, date: '2026-06-15' }, familyAnswers: null }, notes: [] };
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce(both)
      .mockResolvedValueOnce(both)
      .mockResolvedValue({
        ...both,
        notes: [
          { questionKey: 'has_died', note: 'The supervisor\'s note.', notedAt: '2026-07-10T13:06:00.000Z', authorActorId: SUPERVISOR, authorDisplay: 'Supervisor Two' },
          { questionKey: 'death_date', note: 'Two.', notedAt: '2026-07-10T13:07:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' },
        ],
      });
    vi.mocked(api.recordInspectionDiscrepancyNote).mockImplementation(async (_p, _c, _g, body) => ({
      questionKey: body.questionKey, notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One',
    }));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const hasDied = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(hasDied).getByRole('textbox'), 'First.');
    await user.click(within(hasDied).getByRole('button', { name: 'Save note' }));
    expect(await within(hasDied).findByText(/could not be confirmed as recorded/)).toBeInTheDocument();
    // ⛔ a new save in THIS box (that would clear it on its own): the OTHER box's refresh brings a has_died note in.
    const deathDate = screen.getByTestId('gi-discrepancy-death_date');
    await user.type(within(deathDate).getByRole('textbox'), 'Two.');
    await user.click(within(deathDate).getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(within(hasDied).getByTestId('gi-discrepancy-note-has_died')).toHaveTextContent('Recorded by Supervisor Two'));
    expect(within(hasDied).queryByText(/could not be confirmed as recorded/)).toBeNull();
  });

  it('R3-4 — a reader newly HIDDEN whose re-read FAILS still sees ⛔ the result: the withheld shape is installed first', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({
        discrepancy: { state: 'shown', questionKeys: ['has_died', 'death_date'], familyDeathDate: { status: 'shown', date: '2026-06-15' }, familyAnswers: null },
        notes: [{ questionKey: 'death_date', note: 'Another author\'s note.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: SUPERVISOR, authorDisplay: 'Supervisor Two' }],
      })
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'));
    vi.mocked(api.recordInspectionDiscrepancyNote).mockRejectedValue(new api.ApiError(409, 'ground_inspection.own_ground_visit_pending', 'server words'));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    await user.type(within(box).getByRole('textbox'), 'x');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    expect(await screen.findByTestId('gi-discrepancy-withheld')).toBeInTheDocument();
    await waitFor(() => expect(api.getInspectionDiscrepancy).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Another author\'s note.')).toBeNull();
    expect(screen.queryByTestId('gi-discrepancy-found')).toBeNull();
    expect(screen.getByTestId('gi-discrepancy-withheld')).toBeInTheDocument();
  });

  it('R3-5 — a 409 `discrepancy_note_exists` whose note is ALREADY on screen announces its author at once', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const first = { discrepancy: { state: 'shown' as const, questionKeys: ['has_died' as const, 'death_date' as const], familyDeathDate: { status: 'shown' as const, date: '2026-06-15' }, familyAnswers: null }, notes: [] };
    const withBoth = {
      ...first,
      notes: [
        { questionKey: 'has_died' as const, note: 'Supervisor\'s note.', notedAt: '2026-07-10T13:04:00.000Z', authorActorId: SUPERVISOR, authorDisplay: 'Supervisor Two' },
        { questionKey: 'death_date' as const, note: 'Mine.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' },
      ],
    };
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValueOnce(first).mockResolvedValue(withBoth);
    let reject409!: () => void;
    vi.mocked(api.recordInspectionDiscrepancyNote).mockImplementation((_p, _c, _g, body) =>
      body.questionKey === 'has_died'
        ? new Promise((_r, reject) => (reject409 = () => reject(new api.ApiError(409, 'ground_inspection.discrepancy_note_exists', 'exists'))))
        : Promise.resolve({ questionKey: 'death_date', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One' }),
    );
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const hasDied = await screen.findByTestId('gi-discrepancy-has_died');
    const deathDate = screen.getByTestId('gi-discrepancy-death_date');
    await user.type(within(hasDied).getByRole('textbox'), 'Pending.');
    await user.click(within(hasDied).getByRole('button', { name: 'Save note' }));
    await user.type(within(deathDate).getByRole('textbox'), 'Mine.');
    await user.click(within(deathDate).getByRole('button', { name: 'Save note' }));
    // The OTHER box's refresh brings the supervisor's has_died note on screen BEFORE this box's 409 settles.
    expect(await within(hasDied).findByText('Recorded by Supervisor Two')).toBeInTheDocument();
    const reads = vi.mocked(api.getInspectionDiscrepancy).mock.calls.length;
    reject409();
    await waitFor(() => expect(screen.getByTestId('gi-discrepancy-note-status-has_died')).toHaveTextContent('Recorded by Supervisor Two'));
    expect(vi.mocked(api.getInspectionDiscrepancy).mock.calls.length).toBe(reads); // ⛔ a needless re-read
  });

  it('R3-9 — a "Try again" that FAILS says ⛔ the old result again; a later SUCCESSFUL retry announces the result', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce({ discrepancy: { state: 'withheld', reason: 'check_failed' }, notes: [] })
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'))
      .mockResolvedValueOnce({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const withheld = await screen.findByTestId('gi-discrepancy-withheld');
    const region = screen.getByTestId('gi-discrepancy-announcement');
    const words = withheld.textContent!;
    await waitFor(() => expect(region).toHaveTextContent(words));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The result could not be refreshed');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled());
    expect(region.textContent).toBe(''); // ⛔ the withheld words again, as if fresh
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByTestId('gi-discrepancy-found');
    await waitFor(() => expect(region).toHaveTextContent(FOUND));
  });

  it('R3-9 (fix-diff review) — after a FAILED "Try again", a note SAVE does ⛔ re-announce the whole screen (a save is ⛔ a retry)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    const both = { discrepancy: { state: 'shown' as const, questionKeys: ['has_died' as const, 'death_date' as const], familyDeathDate: { status: 'shown' as const, date: '2026-06-15' }, familyAnswers: null }, notes: [] };
    vi.mocked(api.getInspectionDiscrepancy)
      .mockResolvedValueOnce(both)
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'))
      .mockRejectedValueOnce(new api.ApiError(503, 'service.unavailable', 'Try later'))
      .mockRejectedValue(new api.ApiError(503, 'service.unavailable', 'Try later'));
    vi.mocked(api.recordInspectionDiscrepancyNote).mockImplementation(async (_p, _c, _g, body) => ({
      questionKey: body.questionKey, notedAt: '2026-07-10T13:05:00.000Z', authorActorId: INSPECTOR, authorDisplay: 'Inspector One',
    }));
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const user = userEvent.setup();
    const hasDied = await screen.findByTestId('gi-discrepancy-has_died');
    const region = screen.getByTestId('gi-discrepancy-announcement');
    await waitFor(() => expect(region).toHaveTextContent(FOUND));
    await user.type(within(hasDied).getByRole('textbox'), 'One.');
    await user.click(within(hasDied).getByRole('button', { name: 'Save note' }));
    await screen.findByText('The result could not be refreshed. The last recorded information is still shown.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(region.textContent).toBe(''));
    const deathDate = screen.getByTestId('gi-discrepancy-death_date');
    await user.type(within(deathDate).getByRole('textbox'), 'Two.');
    await user.click(within(deathDate).getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(within(deathDate).getByTestId('gi-discrepancy-note-death_date')).toHaveTextContent('Two.'));
    await new Promise((r) => setTimeout(r, 20));
    expect(region.textContent).toBe('');
  });

  it('R3-10 — Save stays disabled for a note of ONLY invisible characters (zero-width, format, spaces)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({ discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null }, notes: [] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    const textbox = within(box).getByRole('textbox');
    fireEvent.change(textbox, { target: { value: '​⁠﻿  ㅤ' } });
    expect(within(box).getByRole('button', { name: 'Save note' })).toBeDisabled();
    fireEvent.change(textbox, { target: { value: '​At home' } });
    expect(within(box).getByRole('button', { name: 'Save note' })).toBeEnabled();
  });

  it('R4a (round 3 fix-diff review) — while the viewer is UNKNOWN another author\'s note still NAMES its author (⛔ the neutral "Recorded")', async () => {
    vi.mocked(api.getSession).mockImplementation(() => new Promise(() => undefined)); // the session never answers
    vi.mocked(api.listGroundInspection)
      .mockResolvedValueOnce({ assignments: [makeAssignment()] })
      .mockResolvedValue({ assignments: [completed()] });
    vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
    vi.mocked(api.completeGroundInspection).mockResolvedValue({
      groundInspectionId: GID, status: 'completed', discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null },
    });
    vi.mocked(api.recordInspectionDiscrepancyNote).mockRejectedValue(new api.ApiError(409, 'ground_inspection.discrepancy_note_exists', 'exists'));
    vi.mocked(api.getInspectionDiscrepancy).mockResolvedValue({
      discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null },
      notes: [{ questionKey: 'has_died', note: 'The supervisor\'s note.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: SUPERVISOR, authorDisplay: 'Supervisor Two' }],
    });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await loadScope();
    await completeThroughThePage();
    const box = await screen.findByTestId('gi-discrepancy-has_died');
    const user = userEvent.setup();
    await user.type(within(box).getByRole('textbox'), 'Mine.');
    await user.click(within(box).getByRole('button', { name: 'Save note' }));
    const recorded = await within(box).findByTestId('gi-discrepancy-note-has_died');
    expect(recorded).toHaveTextContent('Recorded by Supervisor Two');
    await waitFor(() => expect(screen.getByTestId('gi-discrepancy-note-status-has_died')).toHaveTextContent('Recorded by Supervisor Two'));
  });
});
