// Story 6.39 — the District Admin's MEMBERSHIP CHECK on the console (Task 6; AC12; DL8, DL9, DL10, DL12).
//
// ⭐ The load-bearing ones:
//   · the control SHOWS the two dates and the comparison the system made — it has ⛔ field to type either, and ⛔
//     control to change the result (N3);
//   · the identity judgment has ⛔ nothing pre-selected; "cannot confirm yet" needs a reason AND a note, and says the
//     claim WAITS — ⛔ never that it is refused;
//   · the control mounts ONLY for `membershipCheckGate.viewer.canCheckMembership` (judged server-side), and is
//     disabled WITH A LINE until a certificate is accepted;
//   · the preview (it opens the date of death — audited) is fetched ONLY when the control is opened;
//   · every refusal is WORDS — the gate's reason on each of the four surfaces, in the copy BigDev approved word for
//     word (`2026-11-21-472` DL12) — ⛔ never a raw code; a `closure.*` refusal shows the API's own plain message;
//   · a stale 409 refetches the preview and the console packet.
// The network is the only thing faked (`api/client.js`, function by function).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MembershipCheckGateStatus, MembershipCheckPreviewResponse, VerifierConsolePacket, VerifierReviewItem } from '@twt/contracts';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const CLAIM_2 = '11111111-1111-4111-8111-222222222222';
const REVIEW = '00000000-0000-4000-8000-0000000000ac';
const CHECK = '00000000-0000-4000-8000-0000000000c1';

const routeParams = vi.hoisted(() => ({ claimCaseId: '11111111-1111-4111-8111-111111111111' }));
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: PARIWAR, claimCaseId: routeParams.claimCaseId }),
  useNavigate: () => vi.fn(),
}));

const getSession = vi.fn();
const getVerifierConsole = vi.fn();
const getMembershipCheckPreview = vi.fn();
const postMembershipCheck = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getVerifierConsole: (p: string, c: string) => getVerifierConsole(p, c),
    getMembershipCheckPreview: (p: string, c: string) => getMembershipCheckPreview(p, c),
    postMembershipCheck: (p: string, c: string, b: unknown) => postMembershipCheck(p, c, b),
  };
});

const { VerifierConsoleRoute, decisionErrorMessage, membershipCheckLoadErrorMessage } = await import('../src/routes/VerifierConsoleRoute.js');
const { MembershipCheckControl, membershipCheckGateWords } = await import('../src/modules/claim-verification/MembershipCheckControl.js');
const { ReasonCodeDropdown, verifierConsoleEn } = await import('../src/modules/claim-verification/index.js');
const { ApiError } = await import('../src/api/client.js');
const { feePaidAfterDeathNotShownMessage, membershipCheckErrorMessage, membershipCheckRequiredMessage } = await import(
  '../src/modules/claim-verification/nominee-errors.js'
);
const { closureErrorText } = await import('../src/modules/correction-closure/errors.js');
const { MEMBERSHIP_CHECK_STALE_CODES } = await import('../src/api/hooks.js');
const t = verifierConsoleEn.membershipCheck;

// ── DL12 — the copy BigDev approved word for word (`2026-11-21-472`). Pinned HERE as literals, so a reword of the
// copy file fails this test rather than silently changing what staff read. ─────────────────────────────────────────
const DL12 = {
  notChecked: 'Membership check needed before approval.',
  stale: 'The certificate changed since the membership check — check again.',
  identity: "The person's identity has not been confirmed.",
  feeConsole:
    'The joining fee was paid after the date of death on the certificate. No drive can open for this claim — deny it with the reason "Fee paid after the death".',
  feeFinalVote:
    'The joining fee was paid after the date of death on the certificate. No drive can open for this claim — refuse it in the final vote with the reason "Fee paid after the death".',
  feeR9AndClosure: 'The joining fee was paid after the date of death on the certificate. No drive can open for this claim.',
  paidBefore: 'Paid before the death',
  paidSameDay: 'Paid on the day of death',
  paidAfter: 'Paid after the death',
  typedIn: 'Typed in at joining, never checked',
  digilocker: 'Checked through DigiLocker',
  reasonLabel: 'Fee paid after the death',
  notShown: 'This reason can be used only when the membership check found the fee was paid after the death.',
} as const;

type Gate = MembershipCheckGateStatus;
const gate = (over: Partial<Gate> = {}): Gate => ({ available: true, passed: false, reason: 'not_checked', viewer: { canCheckMembership: true }, ...over });

const preview = (over: Partial<MembershipCheckPreviewResponse> = {}): MembershipCheckPreviewResponse => ({
  claim_case_id: CLAIM,
  window_open: true,
  expected_live_review_id: REVIEW,
  date_of_death: '2026-05-01',
  fee_paid_on: '2026-04-30',
  fee_receipt_found: true,
  fee_outcome: 'before_death',
  identity_required: true,
  kyc_route: 'typed_in_unchecked',
  latest_posting_district: 'Patna',
  live_check: null,
  gate: { passed: false, reason: 'not_checked' },
  ...over,
});

const DOCS = [
  { key: 'd1', kind: 'death_certificate', signedUrl: 'https://example.test/cert', contentType: 'image/png' },
  { key: 'd2', kind: 'hospital_record', signedUrl: 'https://example.test/hospital', contentType: 'application/pdf' },
  { key: 'p1', kind: 'ground_inspection_photo', signedUrl: 'https://example.test/photo', contentType: 'image/jpeg' },
] as const;

function renderControl(over: Partial<Parameters<typeof MembershipCheckControl>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  const utils = render(
    <MembershipCheckControl
      gate={gate()}
      certificateAccepted
      open
      onOpenChange={onOpenChange}
      preview={preview()}
      memberRecord={{ name: 'Suresh Patel', dateOfBirth: '1955-03-01' }}
      documents={DOCS}
      onSubmit={onSubmit}
      {...over}
    />,
  );
  return { ...utils, onSubmit, onOpenChange };
}

afterEach(() => {
  cleanup();
  routeParams.claimCaseId = CLAIM;
});

describe('<MembershipCheckControl> — what the staff member is shown (DL8, N3)', () => {
  it('⭐ the two dates, the fee line, the KYC route, the posting, the details on record and EVERY document on the claim', () => {
    renderControl();
    expect(screen.getByTestId('membership-check-date-of-death')).toHaveTextContent('2026-05-01');
    expect(screen.getByTestId('membership-check-fee-paid-on')).toHaveTextContent('2026-04-30');
    expect(screen.getByTestId('membership-check-fee-outcome')).toHaveTextContent(DL12.paidBefore);
    expect(screen.getByTestId('membership-check-kyc-route')).toHaveTextContent(DL12.typedIn);
    expect(screen.getByTestId('membership-check-record-posting')).toHaveTextContent('Patna');
    expect(screen.getByTestId('membership-check-record-name')).toHaveTextContent('Suresh Patel');
    expect(screen.getByTestId('membership-check-record-dob')).toHaveTextContent('1955-03-01');
    const docs = screen.getAllByTestId('membership-check-document');
    expect(docs.map((d) => d.getAttribute('data-kind'))).toEqual(['death_certificate', 'hospital_record', 'ground_inspection_photo']);
    // Each through the console's existing <DocumentPreview>, named by its kind.
    expect(within(docs[0]!).getByTestId('document-preview')).toHaveTextContent(t.documentLabel.death_certificate!);
    expect(within(docs[1]!).getByTestId('document-preview')).toHaveTextContent(t.documentLabel.hospital_record!);
  });

  it.each([
    ['before_death', DL12.paidBefore],
    ['same_day', DL12.paidSameDay],
    ['after_death', DL12.paidAfter],
  ] as const)('the fee line for `%s` is "%s" (DL12) — AC8: the day of death has its OWN words', (fee_outcome, words) => {
    renderControl({ preview: preview({ fee_outcome }) });
    expect(screen.getByTestId('membership-check-fee-outcome')).toHaveTextContent(words);
    expect(screen.getByTestId('membership-check-fee-outcome').getAttribute('data-outcome')).toBe(fee_outcome);
  });

  it('⭐ N3 — the comparison is the SYSTEM\'s: ⛔ date input, ⛔ control that changes the result, and the control says so', () => {
    const { container } = renderControl({ preview: preview({ fee_outcome: 'after_death' }) });
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(0);
    // The ONLY inputs are the identity radios and the note.
    const inputs = [...container.querySelectorAll('input, select, textarea')].map((el) => el.getAttribute('data-testid'));
    expect(inputs).toEqual(['membership-check-identity-confirmed', 'membership-check-identity-not_confirmed', 'membership-check-note']);
    expect(screen.getByTestId('membership-check-body')).toHaveTextContent(t.feeComputed);
    // A fee paid after the death: the control says what follows (record, then deny with the reason) — ⛔ a refusal of its own.
    expect(screen.getByTestId('membership-check-fee-after-death-note')).toHaveTextContent(t.feeAfterDeathNote);
  });

  it('the KYC route in words — DigiLocker (DL12), and the fail-closed routes', () => {
    renderControl({ preview: preview({ kyc_route: 'digilocker', identity_required: false }) });
    expect(screen.getByTestId('membership-check-kyc-route')).toHaveTextContent(DL12.digilocker);
    cleanup();
    renderControl({ preview: preview({ kyc_route: 'no_record' }) });
    expect(screen.getByTestId('membership-check-kyc-route')).toHaveTextContent(t.kycRoute.no_record!);
  });

  it('a posting or a detail that is absent says so (⛔ a blank)', () => {
    renderControl({ preview: preview({ latest_posting_district: null }), memberRecord: { name: null, dateOfBirth: null }, documents: [] });
    for (const id of ['membership-check-record-posting', 'membership-check-record-name', 'membership-check-record-dob']) {
      expect(screen.getByTestId(id)).toHaveTextContent(t.recordUnknown);
    }
    expect(screen.getByTestId('membership-check-documents')).toHaveTextContent(t.documentsNone);
  });

  it('the recorded check is shown in words, with who and when', () => {
    renderControl({
      preview: preview({
        live_check: {
          check_id: CHECK,
          fee_outcome: 'same_day',
          identity_required: true,
          identity_outcome: 'not_confirmed',
          identity_reason: 'name_differs',
          has_note: true,
          decided_by_display: 'Anita (District Admin)',
          decided_at: '2026-11-21T06:00:00.000Z',
        },
      }),
    });
    const live = screen.getByTestId('membership-check-live');
    expect(live).toHaveTextContent(DL12.paidSameDay);
    expect(live).toHaveTextContent(t.liveIdentity.not_confirmed!);
    expect(live).toHaveTextContent(t.reasons.name_differs!);
    expect(live).toHaveTextContent('Anita (District Admin)');
  });
});

describe('<MembershipCheckControl> — the identity judgment (DL8)', () => {
  it('⭐ ⛔ nothing is pre-selected; the advisory criterion is shown; an empty submit is REFUSED IN WORDS and sends nothing', () => {
    const { onSubmit } = renderControl();
    expect((screen.getByTestId('membership-check-identity-confirmed') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('membership-check-identity-not_confirmed') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByTestId('membership-check-criterion')).toHaveTextContent(t.identityCriterion);
    // The criterion DESCRIBES the group (it is read with the question).
    expect(screen.getByTestId('membership-check-identity').getAttribute('aria-describedby')).toBe('membership-check-criterion');
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    const alert = screen.getByTestId('membership-check-incomplete');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert).toHaveTextContent(t.incompleteIdentity);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('⭐ `confirmed` submits exactly that — ⛔ a date, ⛔ an outcome of the comparison; a note is optional', async () => {
    const { onSubmit } = renderControl();
    fireEvent.click(screen.getByTestId('membership-check-identity-confirmed'));
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ identity_outcome: 'confirmed' }));
    cleanup();
    const second = renderControl();
    fireEvent.click(screen.getByTestId('membership-check-identity-confirmed'));
    fireEvent.change(screen.getByTestId('membership-check-note'), { target: { value: '  Seen with the certificate.  ' } });
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    await waitFor(() => expect(second.onSubmit).toHaveBeenCalledWith({ identity_outcome: 'confirmed', note: 'Seen with the certificate.' }));
  });

  it('⭐ "cannot confirm yet" offers EXACTLY the four reasons (⛔ none pre-selected), needs one AND a note, and says the claim WAITS', async () => {
    const { onSubmit } = renderControl();
    expect(screen.queryByTestId('membership-check-reasons')).toBeNull();
    fireEvent.click(screen.getByTestId('membership-check-identity-not_confirmed'));
    const reasons = within(screen.getByTestId('membership-check-reasons')).getAllByRole('radio') as HTMLInputElement[];
    expect(reasons.map((r) => r.value)).toEqual(['name_differs', 'age_or_birth_date_differs', 'document_unreadable', 'other']);
    expect(reasons.every((r) => !r.checked)).toBe(true);
    const help = screen.getByTestId('membership-check-not-confirmed-help');
    expect(help).toHaveTextContent(t.notConfirmedHelp);
    expect(help.textContent).toMatch(/waits/);
    expect(help.textContent).toMatch(/not refused/);

    // ⛔ reason, ⛔ note ⇒ refused in words.
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    expect(screen.getByTestId('membership-check-incomplete')).toHaveTextContent(t.incompleteNotConfirmed);
    // A reason alone is ⛔ enough…
    fireEvent.click(screen.getByTestId('membership-check-reason-age_or_birth_date_differs'));
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    // …nor is a whitespace note.
    fireEvent.change(screen.getByTestId('membership-check-note'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('membership-check-note'), { target: { value: 'The certificate gives 1962; the record says 1955.' } });
    // The refusal clears itself once the form is valid.
    expect(screen.queryByTestId('membership-check-incomplete')).toBeNull();
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        identity_outcome: 'not_confirmed',
        identity_reason: 'age_or_birth_date_differs',
        note: 'The certificate gives 1962; the record says 1955.',
      }),
    );
  });

  it('an identity that is ALREADY checked has nothing to judge: ⛔ radios, a line saying so, and the submit sends `not_required`', async () => {
    const { onSubmit } = renderControl({ preview: preview({ identity_required: false, kyc_route: 'digilocker' }) });
    expect(screen.queryByTestId('membership-check-identity')).toBeNull();
    expect(screen.getByTestId('membership-check-identity-not-required')).toHaveTextContent(t.identityNotRequired);
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ identity_outcome: 'not_required' }));
  });

  it('a different certificate review is a different judgement: the form starts again', () => {
    const { rerender, onSubmit, onOpenChange } = renderControl();
    fireEvent.click(screen.getByTestId('membership-check-identity-not_confirmed'));
    fireEvent.change(screen.getByTestId('membership-check-note'), { target: { value: 'half-typed' } });
    rerender(
      <MembershipCheckControl
        gate={gate()}
        certificateAccepted
        open
        onOpenChange={onOpenChange}
        preview={preview({ expected_live_review_id: '00000000-0000-4000-8000-0000000000ad' })}
        memberRecord={{ name: 'Suresh Patel', dateOfBirth: '1955-03-01' }}
        documents={DOCS}
        onSubmit={onSubmit}
      />,
    );
    expect((screen.getByTestId('membership-check-identity-not_confirmed') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('membership-check-note') as HTMLTextAreaElement).value).toBe('');
  });
});

describe('<MembershipCheckControl> — when the check cannot be recorded, it says why', () => {
  it('⭐ ⛔ accepted certificate ⇒ DISABLED WITH A LINE: ⛔ disclosure, ⛔ form', () => {
    renderControl({ certificateAccepted: false, open: false, preview: undefined });
    expect(screen.getByTestId('membership-check-needs-certificate')).toHaveTextContent(t.needsCertificate);
    expect(screen.queryByTestId('membership-check-disclosure')).toBeNull();
    expect(screen.queryByTestId('membership-check-form')).toBeNull();
  });

  it('the joining receipt cannot be identified ⇒ an ALERT that says to escalate, and ⛔ form (fail closed)', () => {
    renderControl({ preview: preview({ fee_receipt_found: false, fee_paid_on: null, fee_outcome: null }) });
    const alert = screen.getByTestId('membership-check-no-joining-fee');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert).toHaveTextContent(t.noFeeReceipt);
    expect(screen.queryByTestId('membership-check-form')).toBeNull();
    expect(screen.queryByTestId('membership-check-fee-outcome')).toBeNull();
  });

  it('outside the window ⇒ the line, ⛔ form', () => {
    renderControl({ preview: preview({ window_open: false }) });
    expect(screen.getByTestId('membership-check-window-closed')).toHaveTextContent(t.windowClosed);
    expect(screen.queryByTestId('membership-check-form')).toBeNull();
  });

  it('⭐ the lines are ANNOUNCED: loading and "recorded" are `role="status"`; a load error and a refusal are `role="alert"`', () => {
    renderControl({ preview: undefined, loading: true });
    expect(screen.getByTestId('membership-check-loading').getAttribute('role')).toBe('status');
    cleanup();
    renderControl({ preview: undefined, loadError: t.loadError });
    expect(screen.getByTestId('membership-check-load-error').getAttribute('role')).toBe('alert');
    cleanup();
    renderControl({ error: t.refused.stale! });
    const err = screen.getByTestId('membership-check-error');
    expect(err.getAttribute('role')).toBe('alert');
    expect(err).toHaveTextContent(t.refused.stale!);
    cleanup();
    renderControl({ recorded: true });
    const ok = screen.getByTestId('membership-check-recorded');
    expect(ok.getAttribute('role')).toBe('status');
    expect(ok).toHaveTextContent(t.recorded);
    // A refusal is never shown beside "recorded".
    cleanup();
    renderControl({ recorded: true, error: t.refusedGeneric });
    expect(screen.queryByTestId('membership-check-recorded')).toBeNull();
  });

  it('the disclosure has an accessible state, and toggles through the route', () => {
    const { onOpenChange } = renderControl({ open: false, preview: undefined });
    const toggle = screen.getByTestId('membership-check-disclosure');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle).toHaveTextContent(t.show);
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('membership-check-body')).toBeNull();
  });
});

describe('the words of every refusal — ⛔ never a raw code (DL12, G16)', () => {
  const required = (prefix: string, reason: string | undefined) =>
    new ApiError(409, `${prefix}.membership_check_required`, 'server message', reason === undefined ? undefined : { reason });

  it('⭐ the approved copy is in the copy file word for word (DL12)', () => {
    expect(t.approveBlocked).toMatchObject({ not_checked: DL12.notChecked, stale: DL12.stale, identity_not_confirmed: DL12.identity, fee_after_death: DL12.feeConsole });
    expect(t.finalVoteGate).toEqual({ not_checked: DL12.notChecked, stale: DL12.stale, identity_not_confirmed: DL12.identity, fee_after_death: DL12.feeFinalVote });
    expect(t.r9Gate).toEqual({ not_checked: DL12.notChecked, stale: DL12.stale, identity_not_confirmed: DL12.identity, fee_after_death: DL12.feeR9AndClosure });
    expect(t.feeOutcome).toEqual({ before_death: DL12.paidBefore, same_day: DL12.paidSameDay, after_death: DL12.paidAfter });
    expect(t.kycRoute).toMatchObject({ typed_in_unchecked: DL12.typedIn, digilocker: DL12.digilocker });
    expect(verifierConsoleEn.reasonCodes.fee_paid_after_death).toBe(DL12.reasonLabel);
    expect(t.feePaidAfterDeathNotShown).toBe(DL12.notShown);
  });

  it('⭐ the CONSOLE (P1): `decisionErrorMessage` words each reason; a fee paid after the death says to DENY with the reason', () => {
    expect(decisionErrorMessage(required('verifier_decision', 'not_checked'))).toBe(DL12.notChecked);
    expect(decisionErrorMessage(required('verifier_decision', 'stale'))).toBe(DL12.stale);
    expect(decisionErrorMessage(required('verifier_decision', 'identity_not_confirmed'))).toBe(DL12.identity);
    expect(decisionErrorMessage(required('verifier_decision', 'fee_after_death'))).toBe(DL12.feeConsole);
    // An unknown or missing reason falls back to words — ⛔ the code, ⛔ the server's raw message.
    for (const err of [required('verifier_decision', 'something_new'), required('verifier_decision', undefined)]) {
      expect(decisionErrorMessage(err)).toBe(DL12.notChecked);
    }
    expect(decisionErrorMessage(new ApiError(409, 'verifier_decision.fee_paid_after_death_not_shown', 'x'))).toBe(DL12.notShown);
  });

  it('⭐ the CYCLE-FREEZE page and the R9 panel — the same reasons, each surface\'s own instruction for a fee paid after the death', () => {
    expect(membershipCheckRequiredMessage(required('cycle_freeze', 'fee_after_death'), 'final_vote')).toBe(DL12.feeFinalVote);
    expect(membershipCheckRequiredMessage(required('cycle_freeze', 'stale'), 'final_vote')).toBe(DL12.stale);
    expect(membershipCheckRequiredMessage(required('cycle_freeze', 'not_checked'), 'final_vote')).toBe(DL12.notChecked);
    // The R9 panel's denial does not take the reason ⇒ ⛔ instruction.
    expect(membershipCheckRequiredMessage(required('r9_voting', 'fee_after_death'), 'r9')).toBe(DL12.feeR9AndClosure);
    expect(membershipCheckRequiredMessage(required('r9_voting', 'identity_not_confirmed'), 'r9')).toBe(DL12.identity);
    expect(membershipCheckRequiredMessage(required('r9_voting', undefined), 'r9')).toBe(DL12.notChecked);
    expect(feePaidAfterDeathNotShownMessage()).toBe(DL12.notShown);
    // ⛔ None of them is a raw code.
    for (const surface of ['console', 'final_vote', 'r9'] as const) {
      for (const reason of ['not_checked', 'stale', 'fee_after_death', 'identity_not_confirmed']) {
        const words = membershipCheckRequiredMessage(required('x', reason), surface);
        expect(words, `${surface} / ${reason}`).not.toMatch(/membership_check|_required|server message/);
        expect(words.endsWith('.'), `${surface} / ${reason}`).toBe(true);
      }
    }
  });

  it('⭐ a `closure.*` refusal shows the API\'s OWN plain message (the staff copy there) — ⛔ the code', () => {
    const err = new ApiError(409, 'closure.membership_check_required', DL12.feeR9AndClosure, { reason: 'fee_after_death' });
    expect(closureErrorText(err)).toBe(DL12.feeR9AndClosure);
    expect(closureErrorText(new ApiError(409, 'closure.membership_check_required', DL12.notChecked, { reason: 'not_checked' }))).toBe(DL12.notChecked);
  });

  it('recording the check: each typed refusal has its instruction; a session or permission failure says so; anything else is the generic line', () => {
    for (const reason of ['stale', 'concurrent', 'no_fee_receipt', 'certificate_not_accepted', 'certificate_date_unreadable', 'window_closed', 'invalid_outcome', 'not_found']) {
      const words = membershipCheckErrorMessage(new ApiError(reason === 'invalid_outcome' ? 400 : reason === 'not_found' ? 404 : 409, `membership_check.${reason}`, 'server'));
      expect(words, reason).toBe(t.refused[reason]);
      expect(words, reason).not.toContain('membership_check.');
    }
    expect(membershipCheckErrorMessage(new ApiError(401, 'auth.session_required', 'x'))).toBe(t.sessionExpired);
    expect(membershipCheckErrorMessage(new ApiError(403, 'rbac.denied', 'x'))).toBe(t.forbidden);
    expect(membershipCheckErrorMessage(new ApiError(409, 'admin.display_name_missing', 'x'))).toBe(verifierConsoleEn.decision.displayNameMissing);
    expect(membershipCheckErrorMessage(new ApiError(500, 'internal', 'x'))).toBe(t.refusedGeneric);
    expect(membershipCheckErrorMessage(new Error('network'))).toBe(t.refusedGeneric);
    // The preview's own failures: a typed refusal keeps its words, anything else is the load-error line.
    expect(membershipCheckLoadErrorMessage(new ApiError(409, 'membership_check.certificate_date_unreadable', 'x'))).toBe(t.refused.certificate_date_unreadable);
    expect(membershipCheckLoadErrorMessage(new Error('network'))).toBe(t.loadError);
  });

  it('the gate\'s state in words: passed, each reason, and an unknown is ⛔ "passed"', () => {
    expect(membershipCheckGateWords(gate({ passed: true, reason: null }))).toBe(t.passed);
    expect(membershipCheckGateWords(gate({ reason: 'stale' }))).toBe(DL12.stale);
    expect(membershipCheckGateWords(gate({ available: false, passed: false, reason: null }))).toBe(t.approveBlocked.unavailable);
  });

  it('⭐ AC6 — "Fee paid after the death" is offered in the DENY dropdown with its label, and ⛔ for an approval or an escalation', () => {
    const { rerender } = render(<ReasonCodeDropdown outcome="denied" value="" onChange={() => undefined} />);
    expect(screen.getByTestId('reason-option-fee_paid_after_death')).toHaveTextContent(DL12.reasonLabel);
    rerender(<ReasonCodeDropdown outcome="approved" value="" onChange={() => undefined} />);
    expect(screen.queryByTestId('reason-option-fee_paid_after_death')).toBeNull();
    rerender(<ReasonCodeDropdown outcome="escalated" value="" onChange={() => undefined} />);
    expect(screen.queryByTestId('reason-option-fee_paid_after_death')).toBeNull();
  });

  it('the stale codes that refetch are the ones that mean "what the check was opened against has moved"', () => {
    for (const code of ['membership_check.stale', 'membership_check.concurrent', 'membership_check.window_closed', 'membership_check.certificate_not_accepted']) {
      expect(MEMBERSHIP_CHECK_STALE_CODES.has(code), code).toBe(true);
    }
  });
});

// ── The route ──────────────────────────────────────────────────────────────────────────────────────────────────────

type Review = NonNullable<VerifierReviewItem['review']>;
const acceptedCertificate = (over: Partial<Review> = {}): VerifierReviewItem => ({
  documentType: 'death_certificate',
  parityOutcome: 'match',
  verifierReviewRequired: false,
  ocrConfidence: 0.9,
  parityFlags: {},
  extracted: { deceasedName: null, dateOfBirth: null, dateOfDeath: '2026-05-01', issuingAuthority: null, certificateNumber: null },
  memberRecord: null,
  preview: { signedUrl: 'https://example.test/cert', contentType: 'image/png' },
  review: {
    status: 'accepted',
    rejectionReason: null,
    registerCheck: 'matches',
    decidedByDisplay: 'Anita (District Admin)',
    decidedAt: '2026-11-20T06:00:00.000Z',
    liveReviewId: REVIEW,
    certificateToken: '00000000-0000-4000-8000-0000000000ab',
    determinationStale: false,
    viewer: { canReview: true },
    ...over,
  },
});

const packet = (membershipCheckGate: Gate, items: VerifierReviewItem[] = [acceptedCertificate()]): VerifierConsolePacket =>
  ({
    claimCaseId: routeParams.claimCaseId,
    pariwarId: PARIWAR,
    claimState: 'verifier_review',
    deceasedMemberId: '22222222-2222-4222-8222-222222222222',
    identity: { deceasedName: 'Suresh Patel', deceasedDateOfBirth: '1955-03-01' },
    validity: { status: 'unavailable' },
    concealment: { status: 'not_evaluated', detailVisibility: 'indicator_only' },
    documentReview: { status: 'present', reviews: items },
    peerMesh: { status: 'unavailable' },
    groundInspection: { status: 'empty' },
    priorVerifierComments: { status: 'not_available_yet' },
    recentPrecedents: { status: 'not_available_yet' },
    shepherd: { status: 'empty' },
    nomineeNameCheck: { available: true, accountsComplete: true, currentAndPassing: true, differenceReasons: [] },
    groundInspectionGate: { available: true, complete: true, waitReason: null },
    membershipCheckGate,
    suspicionRefusal: { available: true, keptApartFrom: [], finalApprovalWaits: null },
    otherClaimsForDeath: { available: true, total: 0, claims: [] },
    finallyApprovedElsewhere: null,
    approvalWarnings: {
      available: true,
      kinds: [],
      postDeath: 'evaluated',
      uncoveredSinceApproval: 0,
      reviseBlocked: null,
      viewerCanRecordLateReason: false,
      lateKeysUncoveredForViewer: 0,
      ownVisitPending: false,
      reasonOptions: [],
    },
  }) as VerifierConsolePacket;

let qc: QueryClient;
const ui = () => (
  <QueryClientProvider client={qc}>
    <VerifierConsoleRoute />
  </QueryClientProvider>
);
const mount = async (g: Gate, items?: VerifierReviewItem[]) => {
  getVerifierConsole.mockImplementation(() => Promise.resolve({ packet: packet(g, items) }));
  const utils = render(ui());
  await screen.findByTestId('name-check-disclosure');
  return utils;
};

describe('<VerifierConsoleRoute> — the membership check (DL10, DL12)', () => {
  beforeEach(() => {
    for (const f of [getSession, getVerifierConsole, getMembershipCheckPreview, postMembershipCheck]) f.mockReset();
    getSession.mockResolvedValue({ userId: '33333333-3333-4333-8333-333333333333', nationalGrants: [] });
    getMembershipCheckPreview.mockResolvedValue(preview());
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });

  it('⭐ the control mounts ONLY for `viewer.canCheckMembership` — a verifier sees ⛔ control, but STILL sees why approval waits', async () => {
    await mount(gate());
    expect(screen.getByTestId('membership-check-control')).toBeTruthy();
    cleanup();
    await mount(gate({ viewer: { canCheckMembership: false } }));
    expect(screen.queryByTestId('membership-check-section')).toBeNull();
    expect(screen.queryByTestId('membership-check-control')).toBeNull();
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(DL12.notChecked);
  });

  it.each([
    ['not_checked', DL12.notChecked],
    ['stale', DL12.stale],
    ['identity_not_confirmed', DL12.identity],
    ['fee_after_death', DL12.feeConsole],
  ] as const)('⭐ the approve-blocked line for `%s` is its words, and Approve is DISABLED — known from the PACKET, the control unopened', async (reason, words) => {
    await mount(gate({ reason }));
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(words);
    expect(screen.getByTestId('membership-check-gate')).toHaveTextContent(words);
    // ⛔ The audited preview is not fetched for this.
    expect(getMembershipCheckPreview).not.toHaveBeenCalled();
  });

  it('a section that could ⛔ be read disables Approve with "could not be checked" — ⛔ never "passed"; a passing check enables it', async () => {
    await mount(gate({ available: false, passed: false, reason: null }));
    expect(screen.getByTestId('action-approve')).toBeDisabled();
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(t.approveBlocked.unavailable!);
    expect(screen.getByTestId('membership-check-gate')).not.toHaveTextContent(t.passed);
    cleanup();
    await mount(gate({ passed: true, reason: null }));
    expect(screen.getByTestId('action-approve')).not.toBeDisabled();
    expect(screen.getByTestId('membership-check-gate')).toHaveTextContent(t.passed);
  });

  it('the order is the gate\'s: an unaccepted certificate is named FIRST — and the control is disabled with its line', async () => {
    await mount(gate(), [acceptedCertificate({ status: 'not_reviewed', liveReviewId: null, decidedByDisplay: null, decidedAt: null })]);
    expect(screen.getByTestId('approve-blocked-reason')).toHaveTextContent(verifierConsoleEn.deathCertificate.approveBlocked.not_reviewed!);
    expect(screen.getByTestId('membership-check-needs-certificate')).toHaveTextContent(t.needsCertificate);
    expect(screen.queryByTestId('membership-check-disclosure')).toBeNull();
  });

  it('⭐ the audited preview is fetched ONLY when the control is OPENED; the claim\'s documents and the details on record come from the packet', async () => {
    await mount(gate());
    expect(getMembershipCheckPreview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('membership-check-disclosure'));
    await screen.findByTestId('membership-check-body');
    expect(getMembershipCheckPreview).toHaveBeenCalledTimes(1);
    expect(getMembershipCheckPreview).toHaveBeenCalledWith(PARIWAR, CLAIM);
    expect(screen.getByTestId('membership-check-record-name')).toHaveTextContent('Suresh Patel');
    expect(screen.getByTestId('membership-check-record-dob')).toHaveTextContent('1955-03-01');
    expect(screen.getAllByTestId('membership-check-document').map((d) => d.getAttribute('data-kind'))).toEqual(['death_certificate']);
  });

  it('⭐ a recorded check sends the review the preview was computed against + the judgment — ⛔ a date — and says "recorded"', async () => {
    postMembershipCheck.mockResolvedValue({
      claim_case_id: CLAIM,
      check_id: CHECK,
      death_certificate_review_id: REVIEW,
      fee_outcome: 'before_death',
      identity_required: true,
      identity_outcome: 'confirmed',
      identity_reason: null,
      superseded_check_id: null,
      event_version: 9,
    });
    await mount(gate());
    fireEvent.click(screen.getByTestId('membership-check-disclosure'));
    await screen.findByTestId('membership-check-form');
    fireEvent.click(screen.getByTestId('membership-check-identity-confirmed'));
    const consoleReads = getVerifierConsole.mock.calls.length;
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    await waitFor(() => expect(postMembershipCheck).toHaveBeenCalledWith(PARIWAR, CLAIM, { expected_live_review_id: REVIEW, identity_outcome: 'confirmed' }));
    expect(await screen.findByTestId('membership-check-recorded')).toHaveTextContent(t.recorded);
    // The console packet (its gate section, the approve gate) is refreshed.
    await waitFor(() => expect(getVerifierConsole.mock.calls.length).toBeGreaterThan(consoleReads));
  });

  it('⭐ a STALE 409 says so in words (`role="alert"`) AND refetches the preview and the console packet', async () => {
    postMembershipCheck.mockRejectedValue(new ApiError(409, 'membership_check.stale', 'server words'));
    await mount(gate());
    fireEvent.click(screen.getByTestId('membership-check-disclosure'));
    await screen.findByTestId('membership-check-form');
    fireEvent.click(screen.getByTestId('membership-check-identity-confirmed'));
    const consoleReads = getVerifierConsole.mock.calls.length;
    const previewReads = getMembershipCheckPreview.mock.calls.length;
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    const alert = await screen.findByTestId('membership-check-error');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert).toHaveTextContent(t.refused.stale!);
    expect(alert.textContent).not.toContain('membership_check.');
    await waitFor(() => expect(getVerifierConsole.mock.calls.length).toBeGreaterThan(consoleReads));
    await waitFor(() => expect(getMembershipCheckPreview.mock.calls.length).toBeGreaterThan(previewReads));
    expect(screen.queryByTestId('membership-check-recorded')).toBeNull();
  });

  it('a refusal that is ⛔ stale (a 403) says so and does ⛔ refetch the audited preview', async () => {
    postMembershipCheck.mockRejectedValue(new ApiError(403, 'rbac.denied', 'x'));
    await mount(gate());
    fireEvent.click(screen.getByTestId('membership-check-disclosure'));
    await screen.findByTestId('membership-check-form');
    fireEvent.click(screen.getByTestId('membership-check-identity-confirmed'));
    const previewReads = getMembershipCheckPreview.mock.calls.length;
    fireEvent.click(screen.getByTestId('membership-check-submit'));
    expect(await screen.findByTestId('membership-check-error')).toHaveTextContent(t.forbidden);
    expect(getMembershipCheckPreview.mock.calls.length).toBe(previewReads);
  });

  it('a preview that fails to load says why in words — the certificate\'s date cannot be read', async () => {
    getMembershipCheckPreview.mockRejectedValue(new ApiError(409, 'membership_check.certificate_date_unreadable', 'server'));
    await mount(gate());
    fireEvent.click(screen.getByTestId('membership-check-disclosure'));
    const err = await screen.findByTestId('membership-check-load-error');
    expect(err).toHaveTextContent(t.refused.certificate_date_unreadable!);
    expect(screen.queryByTestId('membership-check-form')).toBeNull();
  });

  it('⭐ a same-route CLAIM CHANGE closes the control and does ⛔ fetch the next claim\'s audited preview', async () => {
    const utils = await mount(gate());
    fireEvent.click(screen.getByTestId('membership-check-disclosure'));
    await screen.findByTestId('membership-check-body');
    expect(getMembershipCheckPreview).toHaveBeenCalledTimes(1);
    routeParams.claimCaseId = CLAIM_2;
    utils.rerender(ui());
    await waitFor(() => expect(getVerifierConsole).toHaveBeenCalledWith(PARIWAR, CLAIM_2));
    await waitFor(() => expect(screen.getByTestId('membership-check-disclosure').getAttribute('aria-expanded')).toBe('false'));
    expect(screen.queryByTestId('membership-check-body')).toBeNull();
    expect(getMembershipCheckPreview).toHaveBeenCalledTimes(1);
    expect(getMembershipCheckPreview).not.toHaveBeenCalledWith(PARIWAR, CLAIM_2);
  });
});
