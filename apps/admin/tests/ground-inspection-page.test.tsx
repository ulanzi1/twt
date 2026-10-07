// `<GroundInspectionPage>` container tests — Story 6.7 (Task 6/7).
//
// Covers the operator affordances: loading a claim's assignments in a district, the
// absence-is-a-signal empty state (AC5), scheduling a new assignment (AC1), and the mandatory-photo
// completion guard being reflected in the UI (AC4 — the Complete button is disabled with 0 photos).
// The api client module is mocked (mirrors helpline-claim-page.test.tsx); the real hooks + Query
// cache are exercised via `renderWithClient`.

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
    listGroundInspection: vi.fn(),
    scheduleGroundInspection: vi.fn(),
    // Story 6.26a — the certificate read, the completion and the photo upload.
    getGroundInspectionCertificate: vi.fn(),
    completeGroundInspection: vi.fn(),
    uploadGroundInspectionPhoto: vi.fn(),
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
    // Story 6.26a (GI4 / GI5) — the inspector's record (none until completion).
    originalCertificateVerdict: null,
    comparedCertificateToken: null,
    deathDateSource: null,
    deathDate: null,
    deathTime: null,
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

  // ── Story 6.26a (GI4 / GI5 / GI12) — the original certificate, the dates, the certificate check ───────────────
  describe('Story 6.26a — the original certificate and the date of death', () => {
    const originalPhoto = { photoId: 'p-orig', contentType: 'image/jpeg', byteSize: 1, caption: null, signedUrl: 'https://x/p', photoKind: 'original_certificate' as const };
    const sitePhoto = { ...originalPhoto, photoId: 'p-site', photoKind: 'site' as const };
    const CERT = { certificateToken: 'tok-current', contentType: 'application/pdf', signedUrl: 'https://x/certificate', expiresInSeconds: 300 };

    async function openAndFill(opts: { verdict?: 'It matches' | 'It does not match'; date?: string; time?: string } = {}) {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Compare with the certificate we hold' }));
      await screen.findByRole('link', { name: 'Open the uploaded certificate' });
      if (opts.verdict) await user.click(screen.getByLabelText(opts.verdict));
      if (opts.date) fireEvent.change(screen.getByLabelText(/Date of death/), { target: { value: opts.date } });
      if (opts.time) fireEvent.change(screen.getByLabelText(/Time of death/), { target: { value: opts.time } });
      return user;
    }

    it('⭐ a FULL visit: open the uploaded copy, record the verdict + the family\'s date and time ⇒ the completion carries them, with the copy\'s token', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment({ photos: [originalPhoto] })] });
      vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
      vi.mocked(api.completeGroundInspection).mockResolvedValue({ groundInspectionId: 'gi', status: 'completed' });
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      await screen.findByText('inspector-1');
      const complete = screen.getByRole('button', { name: 'Complete inspection' });
      expect(complete).toBeDisabled(); // ⛔ copy opened yet
      expect(screen.getByText(/Open the uploaded certificate before you record/)).toBeInTheDocument();
      const user = await openAndFill({ verdict: 'It matches', date: '2026-06-01', time: '14:30' });
      expect(api.getGroundInspectionCertificate).toHaveBeenCalledWith(PARIWAR, CLAIM, '33333333-3333-3333-3333-333333333333');
      expect(screen.getByRole('link', { name: 'Open the uploaded certificate' })).toHaveAttribute('href', CERT.signedUrl);
      expect(complete).toBeEnabled();
      await user.click(complete);
      await waitFor(() => expect(api.completeGroundInspection).toHaveBeenCalled());
      expect(vi.mocked(api.completeGroundInspection).mock.calls[0]![3]).toEqual({
        originalCertificateVerdict: 'matches',
        comparedCertificateToken: 'tok-current',
        deathDate: '2026-06-01',
        deathTime: '14:30',
      });
    });

    it('Complete stays DISABLED without a photo of the ORIGINAL (a site photo is ⛔ enough), and says so', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment({ photos: [sitePhoto] })] });
      vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      await screen.findByText('inspector-1');
      await openAndFill({ verdict: 'It matches', date: '2026-06-01' });
      expect(screen.getByRole('button', { name: 'Complete inspection' })).toBeDisabled();
      expect(screen.getByText(/Upload at least one photo of the original death certificate/)).toBeInTheDocument();
    });

    it('GI12 — a CERTIFICATE CHECK asks for the date PRINTED on the original and ⛔ no time; the body carries ⛔ no time', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({
        assignments: [makeAssignment({ inspectionStage: 'certificate_check', photos: [originalPhoto] })],
      });
      vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
      vi.mocked(api.completeGroundInspection).mockResolvedValue({ groundInspectionId: 'gi', status: 'completed' });
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      await screen.findByText('inspector-1');
      expect(screen.getByLabelText(/Date of death printed on the original/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Time of death/)).toBeNull();
      const user = await openAndFill({ verdict: 'It does not match', date: '2026-04-30' });
      await user.click(screen.getByRole('button', { name: 'Complete inspection' }));
      await waitFor(() => expect(api.completeGroundInspection).toHaveBeenCalled());
      expect(vi.mocked(api.completeGroundInspection).mock.calls[0]![3]).toEqual({
        originalCertificateVerdict: 'does_not_match',
        comparedCertificateToken: 'tok-current',
        deathDate: '2026-04-30',
      });
    });

    it('a 409 `certificate_changed` is said in the page\'s own words (open the new one and compare again); the stale token is ⛔ never resubmittable (review 2026-10-07)', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment({ photos: [originalPhoto] })] });
      vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
      vi.mocked(api.completeGroundInspection).mockRejectedValue(new api.ApiError(409, 'ground_inspection.certificate_changed', 'server words'));
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      await screen.findByText('inspector-1');
      const user = await openAndFill({ verdict: 'It matches', date: '2026-06-01' });
      await user.click(screen.getByRole('button', { name: 'Complete inspection' }));
      expect(await screen.findByText(/replaced the certificate since you opened it/)).toBeInTheDocument();
      // The stale token is cleared — Complete is disabled again until "Compare" is re-run.
      expect(screen.getByRole('button', { name: 'Complete inspection' })).toBeDisabled();
      expect(screen.getByText(/Open the uploaded certificate before you record/)).toBeInTheDocument();
      // Adversarial review 2026-10-07: the verdict/date judged against the OLD certificate must ⛔ also clear —
      // never resubmittable unchanged against the new one once "Compare" is re-run.
      expect(screen.getByLabelText('It matches')).not.toBeChecked();
      expect(screen.getByLabelText(/Date of death/)).toHaveValue('');
    });

    it('adversarial review 2026-10-07: a 409 `no_current_certificate` ALSO resets the stale token + verdict/date (the second of the two reset-triggering codes)', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment({ photos: [originalPhoto] })] });
      vi.mocked(api.getGroundInspectionCertificate).mockResolvedValue(CERT);
      vi.mocked(api.completeGroundInspection).mockRejectedValue(new api.ApiError(409, 'ground_inspection.no_current_certificate', 'server words'));
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      await screen.findByText('inspector-1');
      const user = await openAndFill({ verdict: 'It does not match', date: '2026-06-01' });
      await user.click(screen.getByRole('button', { name: 'Complete inspection' }));
      expect(await screen.findByText(/no uploaded death certificate to compare/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Complete inspection' })).toBeDisabled();
      expect(screen.getByLabelText('It does not match')).not.toBeChecked();
      expect(screen.getByLabelText(/Date of death/)).toHaveValue('');
    });

    it('the photo upload sends the chosen KIND; a certificate check defaults to the original', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment({ inspectionStage: 'certificate_check' })] });
      vi.mocked(api.uploadGroundInspectionPhoto).mockResolvedValue({ photoId: 'p' });
      const user = userEvent.setup();
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      await screen.findByText('inspector-1');
      expect(screen.getByLabelText('What the photo shows')).toHaveValue('original_certificate');
      await user.upload(screen.getByLabelText('Upload photo'), new File([new Uint8Array([1])], 'o.jpg', { type: 'image/jpeg' }));
      await user.click(screen.getByRole('button', { name: 'Upload photo' }));
      await waitFor(() => expect(api.uploadGroundInspectionPhoto).toHaveBeenCalled());
      expect(vi.mocked(api.uploadGroundInspectionPhoto).mock.calls[0]![5]).toBe('original_certificate');
    });

    it('GI4 — the refusal offers "the family did not produce the original certificate" under evidence_unavailable', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [makeAssignment()] });
      const user = userEvent.setup();
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      await screen.findByText('inspector-1');
      await user.selectOptions(screen.getByLabelText('Disposition'), 'evidence_unavailable');
      expect(within(screen.getByLabelText('Reason')).getByRole('option', { name: 'The family did not produce the original certificate' })).toHaveValue(
        'original_certificate_not_produced',
      );
    });

    it('a COMPLETED assignment shows the inspector\'s record: the verdict (a mismatch plainly), the family\'s date, the time "not known"', async () => {
      vi.mocked(api.listGroundInspection).mockResolvedValue({
        assignments: [
          makeAssignment({
            status: 'completed',
            photos: [originalPhoto, sitePhoto],
            originalCertificateVerdict: 'does_not_match',
            comparedCertificateToken: 'tok',
            deathDateSource: 'family_statement',
            deathDate: '2026-06-01',
            deathTime: null,
          }),
        ],
      });
      renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
      await loadScope();
      expect(await screen.findByText('Does NOT match the copy')).toBeInTheDocument();
      expect(screen.getByText('2026-06-01')).toBeInTheDocument();
      expect(screen.getByText('Not known')).toBeInTheDocument();
      expect(screen.getByText('Original certificate photos')).toBeInTheDocument();
      expect(screen.getByText('Site photos')).toBeInTheDocument();
    });
  });
});
