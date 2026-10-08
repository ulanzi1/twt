// Verifier-console component tests — Story 6.10 (Task 6; AC2/AC3/AC6/AC7, D8, D10).
//
// Pure render tests (the components take everything as props). Focus:
//   · the shell renders the claim header + a READ-ONLY badge + an EMPTY/inert decision-strip slot
//     (composition seam — 6.11 owns the controls) + the skip-link to it (a11y);
//   · the signals panel renders all six sections, embeds the 6.5 <VerifierReviewPanel> for (b),
//     and renders the three non-present states DISTINCTLY (never collapsed);
//   · the concealment tri-state renders `not_evaluated` as an explicit affordance, NEVER a green/clear;
//   · the scope chrome shows the active Pariwar prominently; the switcher fires onSwitch with the
//     TARGET id (D8 safe-switch mechanics) and hides for a single-Pariwar actor;
//   · the client query key isolates by pariwarId + claimCaseId (no cross-scope cache bleed — D8/AC3).

import type { VerifierConsolePacket } from '@twt/contracts';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { verifierConsoleKey } from '../src/api/hooks.js';
import { ApiError } from '../src/api/client.js';
import {
  ScopeChrome,
  ScopeSwitcher,
  SignalsPanel,
  VerificationConsoleShell,
  verifierConsoleEn as t,
} from '../src/modules/claim-verification/index.js';
import { decisionErrorMessage, verifierConsoleSwitchTarget } from '../src/routes/VerifierConsoleRoute.js';

const PRESENT_PACKET: VerifierConsolePacket = {
  claimCaseId: 'claim-1',
  pariwarId: 'pariwar-A',
  claimState: 'verification_in_progress',
  deceasedMemberId: 'member-1',
  identity: { deceasedName: 'Suresh Patel', deceasedDateOfBirth: '1955-03-01' },
  validity: {
    status: 'present',
    payload: {
      memberId: 'member-1',
      evaluatedAt: '2026-07-01T00:00:00.000Z',
      ruleRegistryVersion: 'rrv-1',
      isValid: true,
      isActive: true,
      // Story 10.17 — the ROSTER predicate. The verifier console renders COVERAGE (`isValid`) and
      // never reads this field; see Story 10.17 Escalation 1 for the open labelling question there.
      isAssignable: true,
      lockInStatus: { daysAtJoin: 0, unlockDate: null, state: 'unlocked' },
      vyawasthaShulkStatus: { paidThrough: null, daysUntilLapse: null, inRenewalGrace: false, graceRemainingDays: null },
      contributionHistorySummary: { status: 'producer_unavailable', producer: 'story-10-24' },
      medicalDisclosureFlags: { hasDisclosureOnRecord: false, declaredConditionCount: null, imaListVersion: null, pendingConcealmentFlag: false },
      retirementCoverage: { status: 'clause_unavailable' },
    restorationDisciplineStatus: { state: 'never-imposed', imposedAt: null, expiresAt: null },
      specialFlags: [],
      applicableNiyamavaliClauses: [],
      provenanceTrace: [],
      validityPayloadHash: 'hash-1',
    },
  },
  concealment: { status: 'not_evaluated', detailVisibility: 'indicator_only' },
  documentReview: {
    status: 'present',
    reviews: [
      {
        documentType: 'death_certificate',
        parityOutcome: 'mismatch',
        verifierReviewRequired: true,
        ocrConfidence: 0.9,
        parityFlags: { name: 'beyond_tolerance' },
        extracted: { deceasedName: 'Suresh Patel', dateOfBirth: '1955-03-01', dateOfDeath: '2026-06-30', issuingAuthority: 'Municipal', certificateNumber: 'DC-1' },
        memberRecord: { name: 'Suresh Patel', dateOfBirth: '1955-03-01' },
        preview: { signedUrl: 'https://signed.example/doc', contentType: 'application/pdf' },
      },
    ],
  },
  peerMesh: {
    status: 'present',
    transcript: {
      selectionId: 's1',
      distinctResponderCount: 1,
      pingedMemberIds: ['x', 'y'],
      responses: [{ responderMemberId: 'x', response: 'confirmed' }],
      verifierAnnotations: { status: 'not_available_yet' },
    },
  },
  groundInspection: { status: 'empty' },
  priorVerifierComments: { status: 'not_available_yet' },
  recentPrecedents: { status: 'not_available_yet' },
  // Story 6.12 — the live shepherd (AC6): the family's named contact, read-only (no phone/WhatsApp here).
  shepherd: {
    status: 'present',
    shepherdActorId: '11111111-1111-1111-1111-111111111111',
    shepherdDisplay: 'Anita Sharma',
    roleLabel: 'District Admin',
  },
  nomineeNameCheck: { available: true, accountsComplete: true, currentAndPassing: true, differenceReasons: [] },
  // Story 6.23a (NW8) — the nominee-change warnings section (⛔ no warning by default).
  // Story 6.26a (GI9) — the ground-inspection gate section (complete by default).
  groundInspectionGate: { available: true, complete: true, waitReason: null },
  suspicionRefusal: { available: true, keptApartFrom: [], finalApprovalWaits: null },
  approvalWarnings: {
    available: true,
    kinds: [],
    postDeath: 'evaluated',
    uncoveredSinceApproval: 0,
    reviseBlocked: null,
    viewerCanRecordLateReason: false,
    lateKeysUncoveredForViewer: 0,
    reasonOptions: [
      {
        code: 'warnings_reviewed',
        reasonId: null,
        label: 'Warnings reviewed — approved despite them',
        whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
        addedByDisplay: null,
        addedAt: null,
        replacesLabel: null,
      },
    ],
  },
};

describe('<VerificationConsoleShell> — anatomy + read-only + decision slot (AC6)', () => {
  it('renders the claim header, a READ-ONLY badge, and an EMPTY/inert decision-strip slot', () => {
    render(
      <VerificationConsoleShell
        claimCaseId="claim-1"
        deceasedMemberName="Suresh Patel"
        claimState="verification_in_progress"
        scopeChrome={<div data-testid="chrome-stub" />}
      >
        <div data-testid="panel-stub" />
      </VerificationConsoleShell>,
    );
    expect(screen.getByTestId('shell-claim-id')).toHaveTextContent('claim-1');
    expect(screen.getByTestId('shell-claim-state')).toHaveTextContent('verification_in_progress');
    expect(screen.getByTestId('read-only-badge')).toBeInTheDocument();
    // The sticky decision slot is PRESENT but empty (composition seam; 6.11 mounts the strip).
    const slot = screen.getByTestId('decision-strip-slot');
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveTextContent(/not available on this screen/i);
    // Skip-link to the decision slot (a11y).
    expect(screen.getByText('Skip to decision')).toBeInTheDocument();
  });

  it('mounts a provided decisionSlot when one is passed (6.11 forward-compat)', () => {
    render(
      <VerificationConsoleShell
        claimCaseId="c" deceasedMemberName={null} claimState="s" scopeChrome={null}
        decisionSlot={<div data-testid="decision-strip-6-11" />}
      >
        <div />
      </VerificationConsoleShell>,
    );
    expect(screen.getByTestId('decision-strip-6-11')).toBeInTheDocument();
  });
});

describe('<SignalsPanel> — six sections, four-state vocabulary, tri-state concealment', () => {
  it('renders all six sections and embeds the 6.5 <VerifierReviewPanel> for (b)', () => {
    render(<SignalsPanel packet={PRESENT_PACKET} />);
    for (const id of ['section-identity', 'section-concealment', 'section-documents', 'section-peer-mesh', 'section-ground-inspection', 'section-prior-comments', 'section-precedents', 'section-shepherd']) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    // (b) embeds the 6.5 panel.
    expect(screen.getByTestId('verifier-review-panel')).toBeInTheDocument();
    // (c) transcript renders responder counts.
    expect(screen.getByTestId('peer-mesh-transcript')).toHaveTextContent('1');
  });

  it('renders the live shepherd section (AC6) with name + role, and NO contact PII on the admin console (AC8)', () => {
    render(<SignalsPanel packet={PRESENT_PACKET} />);
    const present = screen.getByTestId('shepherd-present');
    expect(present).toHaveTextContent('Anita Sharma');
    expect(present).toHaveTextContent('District Admin');
    // The admin console NEVER shows the shepherd's phone/WhatsApp (that is the member card's authorized surface).
    expect(present).not.toHaveTextContent('+91');
  });

  it('⭐ Story 6.20 (AC13) — an INHERITED inspection is labelled and NAMES its source claim', () => {
    const source = '99999999-9999-4999-8999-999999999999';
    render(
      <SignalsPanel
        packet={{
          ...PRESENT_PACKET,
          groundInspection: {
            status: 'present',
            assignments: [
              {
                groundInspectionId: '88888888-8888-4888-8888-888888888888',
                district: 'Patna',
                inspectionStage: 'initial',
                inspectionSiteType: 'family_residence',
                inspectorActorId: 'inspector-1',
                scheduledAt: '2026-05-01T06:00:00.000Z',
                status: 'completed',
                refusalReason: null,
                completedAt: '2026-05-02T06:00:00.000Z',
                notes: null,
                structuredFindings: null,
                photos: [],
                // Story 6.26a (GI10) — a pre-6.26a inherited row: ⛔ no record, labelled as carried over.
                originalCertificateVerdict: null,
                comparedAgainst: null,
                deathDateSource: null,
                deathDate: null,
                deathTime: null,
                deathDateUnreadable: false,
                deathTimeUnreadable: false,
                inherited: true,
                // Story 6.26b — ⛔ date recorded ⇒ nothing compared, ⛔ warning.
                dateComparison: 'not_compared',
                dateDiffersWarning: false,
                originalMismatchWarning: false,
              },
            ],
            inheritedFrom: { claimCaseId: source },
          },
        }}
      />,
    );
    const label = screen.getByTestId('ground-inspection-inherited');
    expect(label.textContent).toContain('Carried over from the refused claim');
    expect(label.textContent).toContain(source);
    // ⛔ NOT a live region (code review 2026-09-24): announcing a bare claim reference on every mount was
    // noise; it is static, labelled text.
    expect(label.getAttribute('role')).toBeNull();
  });

  it('⭐ Story 6.26a (GI10) — the refile\'s OWN certificate check and the INHERITED visit, each labelled; the verdict, the comparison, the dates; an unreadable date says so', () => {
    const base = {
      district: 'Patna',
      inspectorActorId: 'inspector-1',
      scheduledAt: '2026-05-01T06:00:00.000Z',
      status: 'completed',
      refusalReason: null,
      completedAt: '2026-05-02T06:00:00.000Z',
      notes: null,
      structuredFindings: null,
      deathTimeUnreadable: false,
    };
    render(
      <SignalsPanel
        packet={{
          ...PRESENT_PACKET,
          groundInspectionGate: { available: true, complete: true, waitReason: null },
          suspicionRefusal: { available: true, keptApartFrom: [], finalApprovalWaits: null },
          groundInspection: {
            status: 'present',
            assignments: [
              {
                ...base,
                groundInspectionId: 'own-check',
                inspectionStage: 'certificate_check',
                inspectionSiteType: 'school_or_office',
                photos: [{ photoId: 'p1', contentType: 'image/jpeg', byteSize: 1, caption: null, signedUrl: 'https://x/p1', photoKind: 'original_certificate' }],
                originalCertificateVerdict: 'does_not_match',
                comparedAgainst: 'current',
                deathDateSource: 'original_certificate',
                deathDate: '2026-04-30',
                deathTime: null,
                deathDateUnreadable: false,
                inherited: false,
                dateComparison: 'same',
                dateDiffersWarning: false,
                originalMismatchWarning: true,
              },
              {
                ...base,
                groundInspectionId: 'inherited-visit',
                inspectionStage: 'initial',
                inspectionSiteType: 'family_residence',
                photos: [],
                originalCertificateVerdict: 'matches',
                comparedAgainst: 'earlier',
                deathDateSource: 'family_statement',
                deathDate: null,
                deathTime: null,
                deathDateUnreadable: true,
                inherited: true,
                dateComparison: 'same',
                dateDiffersWarning: false,
                originalMismatchWarning: false,
              },
            ],
            inheritedFrom: { claimCaseId: '99999999-9999-4999-8999-999999999999' },
          },
        }}
      />,
    );
    const [own, inherited] = screen.getAllByTestId('ground-inspection-assignment');
    expect(own).toHaveTextContent('(This claim)');
    expect(own).toHaveTextContent('Original does NOT match the copy — compared with the current certificate');
    expect(own).toHaveTextContent('Date printed on the original: 2026-04-30');
    expect(own).not.toHaveTextContent('Time of death'); // ⛔ a time on a certificate check
    expect(own).toHaveTextContent('Original certificate');
    expect(inherited).toHaveTextContent('(Carried over)');
    expect(inherited).toHaveTextContent('Original matches the copy — compared with an earlier certificate');
    expect(inherited).toHaveTextContent("Date of death (the family's word): could not be read");
    expect(inherited).toHaveTextContent('Time of death: not known');
    expect(screen.getByTestId('ground-inspection-gate')).toHaveTextContent('The ground inspection is complete for approval.');
  });

  describe('⭐ Story 6.26b (GI10 [b]; `-288` K2, `-289` L3/L4; RD18; Trap 11; AC9b) — the date comparison and the two warnings', () => {
    const base = {
      district: 'Patna',
      inspectorActorId: 'inspector-1',
      scheduledAt: '2026-05-01T06:00:00.000Z',
      status: 'completed',
      refusalReason: null,
      completedAt: '2026-05-02T06:00:00.000Z',
      notes: null,
      structuredFindings: null,
      inspectionStage: 'initial',
      inspectionSiteType: 'family_residence',
      photos: [],
      originalCertificateVerdict: 'matches' as const,
      comparedAgainst: 'current' as const,
      deathDateSource: 'family_statement' as const,
      deathDate: '2026-04-28',
      deathTime: null,
      deathDateUnreadable: false,
      deathTimeUnreadable: false,
      inherited: false,
      dateComparison: 'same' as const,
      dateDiffersWarning: false,
      originalMismatchWarning: false,
    };
    type Item = Extract<VerifierConsolePacket['groundInspection'], { status: 'present' }>['assignments'][number];
    const renderRows = (assignments: Item[]) => {
      render(<SignalsPanel packet={{ ...PRESENT_PACKET, groundInspection: { status: 'present', assignments } }} />);
      return screen.getAllByTestId('ground-inspection-assignment');
    };
    const r = t.groundInspectionGate.record;

    it('a differing date is a WARNING (an inherited one says "given on an earlier claim"); `not_indexed` and a failed read have their OWN words; `same` / `not_compared` show nothing', () => {
      const rows = renderRows([
        { ...base, groundInspectionId: 'own', dateComparison: 'differs', dateDiffersWarning: true },
        { ...base, groundInspectionId: 'inh', inherited: true, dateComparison: 'differs', dateDiffersWarning: true },
        { ...base, groundInspectionId: 'old', dateComparison: 'not_indexed' },
        { ...base, groundInspectionId: 'unknown', dateComparison: null, dateDiffersWarning: null },
        { ...base, groundInspectionId: 'same' },
        { ...base, groundInspectionId: 'none', dateComparison: 'not_compared' },
      ]);
      const line = (i: number) => within(rows[i]!).queryByTestId('ground-inspection-date-comparison');
      expect(line(0)).toHaveTextContent(r.dateDiffersWarning);
      expect(line(0)).toHaveAttribute('data-warning', 'true');
      expect(line(1)).toHaveTextContent(r.dateDiffersWarningInherited);
      expect(line(2)).toHaveTextContent(r.dateNotIndexed);
      expect(line(2)).not.toHaveAttribute('data-warning');
      expect(line(3)).toHaveTextContent(r.dateUnknown);
      // "just now" is said ONLY of a read that failed — ⛔ of a pre-6.26b certificate.
      expect(r.dateNotIndexed).not.toMatch(/just now/);
      expect(line(4)).toBeNull();
      expect(line(5)).toBeNull();
    });

    it('the VERDICT line: the mismatch warning where `true`; "could not be checked just now" where `null`; nothing where `false` — and an un-completed row shows ⛔ such line', () => {
      const rows = renderRows([
        { ...base, groundInspectionId: 'warned', originalCertificateVerdict: 'does_not_match', originalMismatchWarning: true },
        { ...base, groundInspectionId: 'unknown', originalCertificateVerdict: 'does_not_match', originalMismatchWarning: null, dateComparison: null, dateDiffersWarning: null },
        { ...base, groundInspectionId: 'replaced', originalCertificateVerdict: 'does_not_match', comparedAgainst: 'earlier' },
        {
          ...base,
          groundInspectionId: 'scheduled',
          status: 'scheduled',
          completedAt: null,
          originalCertificateVerdict: null,
          comparedAgainst: null,
          deathDateSource: null,
          deathDate: null,
          dateComparison: 'not_compared',
        },
      ]);
      const mismatch = (i: number) => within(rows[i]!).queryByTestId('ground-inspection-mismatch-line');
      expect(mismatch(0)).toHaveTextContent(r.mismatchWarning);
      expect(mismatch(0)).toHaveAttribute('data-warning', 'true');
      expect(mismatch(1)).toHaveTextContent(r.mismatchUnknown);
      expect(within(rows[1]!).getByTestId('ground-inspection-date-comparison')).toHaveTextContent(r.dateUnknown);
      expect(mismatch(2)).toBeNull(); // shown plainly, ⛔ a warning (a replaced certificate's verdict)
      expect(mismatch(3)).toBeNull();
      expect(within(rows[3]!).queryByTestId('ground-inspection-date-comparison')).toBeNull();
    });

    it('⛔ NO DATE in any kind line, any date-comparison line or the mismatch line (AC9b — the GI10 [a] date line above them is 6.26a\'s)', () => {
      const DATE = /\d{4}-\d{2}-\d{2}|\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/i;
      const rows = renderRows([
        { ...base, groundInspectionId: 'a', originalCertificateVerdict: 'does_not_match', originalMismatchWarning: true, dateComparison: 'differs', dateDiffersWarning: true },
        { ...base, groundInspectionId: 'b', inherited: true, dateComparison: 'differs', dateDiffersWarning: true },
        { ...base, groundInspectionId: 'c', originalCertificateVerdict: 'does_not_match', originalMismatchWarning: null, dateComparison: null, dateDiffersWarning: null },
        { ...base, groundInspectionId: 'd', dateComparison: 'not_indexed' },
      ]);
      const lines = rows.flatMap((row) => [
        ...within(row).queryAllByTestId('ground-inspection-date-comparison'),
        ...within(row).queryAllByTestId('ground-inspection-mismatch-line'),
      ]);
      expect(lines.length).toBe(6);
      for (const l of lines) expect(l.textContent).not.toMatch(DATE);
      for (const words of Object.values(t.approvalWarnings.kindLine)) expect(words).not.toMatch(DATE);
      // The date line itself DOES show the date, by design (6.26a's GI10 [a]).
      expect(rows[0]).toHaveTextContent('2026-04-28');
    });
  });

  it('renders the shepherd section as empty when no shepherd is assigned yet (pre-verification)', () => {
    render(<SignalsPanel packet={{ ...PRESENT_PACKET, shepherd: { status: 'empty' } }} />);
    const section = screen.getByTestId('section-shepherd');
    expect(within(section).getByTestId('section-state-empty')).toBeInTheDocument();
  });

  it('renders AC2c verifier annotations as explicitly not_available_yet (2026-07-11 decision — no owning producer yet)', () => {
    render(<SignalsPanel packet={PRESENT_PACKET} />);
    const annotations = screen.getByTestId('peer-mesh-annotations-state');
    expect(annotations).toHaveAttribute('data-section-state', 'not_available_yet');
    expect(annotations).toHaveTextContent(/not available yet/i);
  });

  it('renders the concealment tri-state `not_evaluated` as an explicit affordance — NEVER a green/clear (D10)', () => {
    render(<SignalsPanel packet={PRESENT_PACKET} />);
    const indicator = screen.getByTestId('concealment-indicator');
    expect(indicator).toHaveAttribute('data-concealment-status', 'not_evaluated');
    expect(indicator).toHaveTextContent(/not yet evaluated/i);
    // It must NOT carry the OK/clear tone class.
    expect(indicator.className).not.toContain('status-ok');
    expect(indicator.className).toContain('status-warn');
    // No PROMINENT banner when not flagged.
    expect(screen.queryByTestId('concealment-flagged-banner')).toBeNull();
  });

  it('renders the PROMINENT flagged banner ABOVE the sections when concealment is `flagged` (Story 6.15 AC1)', () => {
    const packet: VerifierConsolePacket = {
      ...PRESENT_PACKET,
      concealment: { status: 'flagged', detailVisibility: 'indicator_only' },
    };
    render(<SignalsPanel packet={packet} />);
    const banner = screen.getByTestId('concealment-flagged-banner');
    const panel = screen.getByTestId('signals-panel');
    // Prominent = rendered as the FIRST child, above every standard section.
    expect(panel.firstElementChild).toBe(banner);
    // NEVER reads as a denial — it routes to the trustee (never auto-denied).
    expect(banner).toHaveTextContent(/not auto-denied/i);
    expect(banner).toHaveTextContent(/state trustee/i);
    // The indicator carries the danger tone (not green/clear).
    const indicator = screen.getByTestId('concealment-indicator');
    expect(indicator).toHaveAttribute('data-concealment-status', 'flagged');
    expect(indicator.className).not.toContain('status-ok');
  });

  it('surfaces the R14 clause version ONLY for a `full`-visibility caller (D-C)', () => {
    const full: VerifierConsolePacket = {
      ...PRESENT_PACKET,
      concealment: { status: 'flagged', detailVisibility: 'full', clauseVersionId: 'cv-r14-1' },
    };
    render(<SignalsPanel packet={full} />);
    expect(screen.getByTestId('concealment-clause-version')).toHaveTextContent('cv-r14-1');
  });

  it('hides the clause version for an `indicator_only` caller (presence-only)', () => {
    const indicatorOnly: VerifierConsolePacket = {
      ...PRESENT_PACKET,
      concealment: { status: 'flagged', detailVisibility: 'indicator_only', clauseVersionId: null },
    };
    render(<SignalsPanel packet={indicatorOnly} />);
    expect(screen.queryByTestId('concealment-clause-version')).toBeNull();
    expect(screen.getByText(t.concealment.indicatorOnly)).toBeInTheDocument();
  });

  it('mounts the assessment capture control when onAssessConcealment is provided; submits the chosen kind + note', async () => {
    const onAssess = vi.fn().mockResolvedValue(undefined);
    render(<SignalsPanel packet={PRESENT_PACKET} onAssessConcealment={onAssess} />);
    // Requires a kind before recording (never a blank submit).
    fireEvent.click(screen.getByTestId('concealment-assessment-submit'));
    expect(screen.getByTestId('concealment-kind-error')).toBeInTheDocument();
    expect(onAssess).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('concealment-kind-select'), { target: { value: 'linked' } });
    fireEvent.change(screen.getByTestId('concealment-note-input'), { target: { value: 'Undeclared cardiac condition.' } });
    fireEvent.click(screen.getByTestId('concealment-assessment-submit'));
    expect(onAssess).toHaveBeenCalledWith({ kind: 'linked', note: 'Undeclared cardiac condition.' });
    // On success the control resets (kind/note clear) — await that state settling.
    await waitFor(() => expect(screen.getByTestId('concealment-kind-select')).toHaveValue(''));
  });

  it('hides the assessment control on a read-only surface (no onAssessConcealment)', () => {
    render(<SignalsPanel packet={PRESENT_PACKET} />);
    expect(screen.queryByTestId('concealment-assessment-control')).toBeNull();
  });

  it('(e)/(f) render semantic-verb audit-trail entries when present, not raw outcome/rationale markup (AC1/AC4)', () => {
    const packet: VerifierConsolePacket = {
      ...PRESENT_PACKET,
      priorVerifierComments: {
        status: 'present',
        comments: [
          { outcome: 'approved', reasonCode: 'r8_90pct_met', rationale: 'Meets threshold.', actorDisplay: 'Anita (District Admin)', decidedAt: '2026-07-11T00:00:00Z', claimCaseId: 'claim-1' },
        ],
      },
      recentPrecedents: {
        status: 'present',
        precedents: [
          { claimCaseId: 'claim-2', outcome: 'denied', reasonCode: 'concealment_flag_uphold', rationale: null, actorDisplay: null, decidedAt: '2026-07-10T00:00:00Z' },
        ],
      },
    };
    render(<SignalsPanel packet={packet} />);
    expect(within(screen.getByTestId('section-prior-comments')).getByText(/Approved by/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('section-prior-comments')).getByTestId('audit-actor')).toHaveTextContent('Anita (District Admin)');
    expect(within(screen.getByTestId('section-precedents')).getByText(/Denied by/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('section-precedents')).getByText(/Unattributed/i)).toBeInTheDocument();
  });

  it('renders the three non-present states DISTINCTLY (never collapsed)', () => {
    const packet: VerifierConsolePacket = {
      ...PRESENT_PACKET,
      documentReview: { status: 'unavailable' },
      groundInspection: { status: 'empty' },
      priorVerifierComments: { status: 'not_available_yet' },
    };
    render(<SignalsPanel packet={packet} />);
    // Each distinct state renders its own marker (data-section-state) — the gate against collapsing them.
    expect(screen.getAllByTestId('section-state-unavailable').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('section-state-empty').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('section-state-not_available_yet').length).toBeGreaterThanOrEqual(1);
  });
});

describe('<ScopeChrome>/<ScopeSwitcher> — cross-Pariwar scope (AC3, D8)', () => {
  it('shows the active Pariwar prominently', () => {
    render(<ScopeChrome activePariwarId="pariwar-A" activePariwarName="Patna Pariwar" pariwars={[{ id: 'pariwar-A', name: 'Patna Pariwar' }]} onSwitch={vi.fn()} />);
    const name = screen.getByTestId('active-pariwar-name');
    expect(name).toHaveTextContent('Patna Pariwar');
    expect(name).toHaveAttribute('data-active-pariwar-id', 'pariwar-A');
  });

  it('hides the switcher for a single-Pariwar actor', () => {
    render(<ScopeSwitcher activePariwarId="pariwar-A" pariwars={[{ id: 'pariwar-A', name: 'A' }]} onSwitch={vi.fn()} />);
    expect(screen.queryByTestId('scope-switcher')).not.toBeInTheDocument();
  });

  it('fires onSwitch with the TARGET Pariwar (never the active) on an explicit switch (D8)', () => {
    const onSwitch = vi.fn();
    render(
      <ScopeSwitcher
        activePariwarId="pariwar-A"
        pariwars={[{ id: 'pariwar-A', name: 'A' }, { id: 'pariwar-B', name: 'B' }]}
        onSwitch={onSwitch}
      />,
    );
    fireEvent.change(screen.getByTestId('scope-switcher').querySelector('select')!, { target: { value: 'pariwar-B' } });
    expect(onSwitch).toHaveBeenCalledWith('pariwar-B');
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });
});

describe('client query-key isolation (AC3, D8) — no cross-scope cache bleed', () => {
  it('the verifier-console query key includes BOTH the pariwarId and the claimCaseId', () => {
    expect(verifierConsoleKey('pariwar-A', 'claim-1')).toEqual(['verifier-console', 'pariwar-A', 'claim-1']);
    // A different Pariwar (or a different claim) yields a DISTINCT key → the caches never alias.
    expect(verifierConsoleKey('pariwar-B', 'claim-1')).not.toEqual(verifierConsoleKey('pariwar-A', 'claim-1'));
    expect(verifierConsoleKey('pariwar-A', 'claim-2')).not.toEqual(verifierConsoleKey('pariwar-A', 'claim-1'));
  });
});

describe('verifierConsoleSwitchTarget — D8 safe-switch navigation target (code review 2026-07-11)', () => {
  it('routes to the target Pariwar\'s SAFE landing route (member-search), never the verifier-console route', () => {
    const target = verifierConsoleSwitchTarget('pariwar-B');
    expect(target.to).toBe('/p/$pariwarId/members');
    expect(target.params).toEqual({ pariwarId: 'pariwar-B' });
  });

  it('never carries claimCaseId in the navigation target (the D8 "easy-to-miss" property)', () => {
    const target = verifierConsoleSwitchTarget('pariwar-B');
    expect(Object.keys(target.params)).toEqual(['pariwarId']);
    expect(JSON.stringify(target)).not.toMatch(/claim/i);
  });
});

describe('decisionErrorMessage — distinct submit-error messages (Review Finding)', () => {
  it('step-up required → the step-up message', () => {
    expect(decisionErrorMessage(new ApiError(403, 'auth.step_up_required', 'x'))).toBe(t.decision.stepUpRequired);
  });

  it('missing display name → the display-name message, not the generic fallback', () => {
    expect(decisionErrorMessage(new ApiError(409, 'admin.display_name_missing', 'x'))).toBe(t.decision.displayNameMissing);
  });

  it.each(['verifier_decision.already_decided', 'verifier_decision.revision_conflict', 'verifier_decision.stream_conflict'])(
    '%s → the stale-decision/conflict message',
    (code) => {
      expect(decisionErrorMessage(new ApiError(409, code, 'x'))).toBe(t.decision.decisionConflict);
    },
  );

  it('anything else (forbidden, transient 500, a plain Error) → the generic fallback', () => {
    expect(decisionErrorMessage(new ApiError(403, 'auth.forbidden', 'x'))).toBe(t.decision.submitError);
    expect(decisionErrorMessage(new ApiError(500, 'request.internal', 'x'))).toBe(t.decision.submitError);
    expect(decisionErrorMessage(new Error('boom'))).toBe(t.decision.submitError);
  });
});

describe('<SignalsPanel> — Story 6.24a (RF10), kept apart from a claim refused on suspicion', () => {
  const sr = t.suspicionRefusal;
  it('⛔ no such claim ⇒ ⛔ no section at all', () => {
    render(<SignalsPanel packet={PRESENT_PACKET} />);
    expect(screen.queryByTestId('section-suspicion-refusal')).not.toBeInTheDocument();
  });

  it('a standing refusal ⇒ the kept-apart line, the other claim by REFERENCE with its appeal date, and the wait line', () => {
    render(
      <SignalsPanel
        packet={{
          ...PRESENT_PACKET,
          suspicionRefusal: {
            available: true,
            keptApartFrom: [{ reference: 'REF-1234', appeal: 'not_filed', appealUntil: '2026-12-30' }],
            finalApprovalWaits: 'appeal_not_filed',
          },
        }}
      />,
    );
    expect(screen.getByTestId('suspicion-refusal-kept-apart')).toHaveTextContent(sr.keptApart);
    expect(screen.getByTestId('suspicion-refusal-claim-REF-1234')).toHaveTextContent('REF-1234');
    expect(screen.getByTestId('suspicion-refusal-claim-REF-1234')).toHaveTextContent('2026-12-30');
    expect(screen.getByTestId('suspicion-refusal-wait')).toHaveTextContent(sr.waits.appeal_not_filed!);
    expect(screen.getByText(sr.districtAdminNotHeld)).toBeInTheDocument();
  });

  it('TWO kept-apart claims ⇒ each gets its OWN testid (⛔ a duplicate id would throw on more than one)', () => {
    render(
      <SignalsPanel
        packet={{
          ...PRESENT_PACKET,
          suspicionRefusal: {
            available: true,
            keptApartFrom: [
              { reference: 'REF-1234', appeal: 'not_filed', appealUntil: '2026-12-30' },
              { reference: 'REF-5678', appeal: 'open', appealUntil: '2026-11-15' },
            ],
            finalApprovalWaits: 'appeal_open',
          },
        }}
      />,
    );
    expect(screen.getByTestId('suspicion-refusal-claim-REF-1234')).toHaveTextContent('REF-1234');
    expect(screen.getByTestId('suspicion-refusal-claim-REF-5678')).toHaveTextContent('REF-5678');
  });

  it('an UPHELD refusal ⇒ kept apart, but the final approval does ⛔ not wait', () => {
    render(
      <SignalsPanel
        packet={{
          ...PRESENT_PACKET,
          suspicionRefusal: { available: true, keptApartFrom: [{ reference: 'REF-1', appeal: 'upheld_final', appealUntil: '2026-12-30' }], finalApprovalWaits: null },
        }}
      />,
    );
    expect(screen.getByTestId('suspicion-refusal-wait')).toHaveTextContent(sr.noWait);
  });

  it('a refusal NEVER appealed whose 90 days ended ⇒ ⛔ no wait, and ⛔ never "its appeal is decided" (code review round 2)', () => {
    render(
      <SignalsPanel
        packet={{
          ...PRESENT_PACKET,
          suspicionRefusal: { available: true, keptApartFrom: [{ reference: 'REF-1', appeal: 'time_limit_passed', appealUntil: '2026-09-01' }], finalApprovalWaits: null },
        }}
      />,
    );
    expect(screen.getByTestId('suspicion-refusal-claim-REF-1')).toHaveTextContent(`${sr.appeal.time_limit_passed} 2026-09-01`);
    expect(screen.getByTestId('suspicion-refusal-wait')).toHaveTextContent(sr.noWait);
    expect(screen.getByTestId('suspicion-refusal-wait')).not.toHaveTextContent(/appeal is decided/i);
    expect(screen.queryByText(sr.districtAdminNotHeld)).not.toBeInTheDocument();
  });

  it('a FAILED read ⇒ "could not be checked just now" — ⛔ never silence', () => {
    render(<SignalsPanel packet={{ ...PRESENT_PACKET, suspicionRefusal: { available: false, keptApartFrom: [], finalApprovalWaits: null } }} />);
    expect(screen.getByTestId('suspicion-refusal-unavailable')).toHaveTextContent(sr.unavailable);
  });

  it('the decision strip\'s words — the wait (defensive) and the reason lock — ⛔ "try again"', () => {
    expect(decisionErrorMessage(new ApiError(409, 'verifier_decision.suspicion_appeal_pending', 'x', { reason: 'appeal_open' }))).toBe(sr.approvalGate.appeal_open);
    // RF13's lock holds through `approved` / `settled` / `denied` — ⛔ not just "open" (AC2b); the message names the
    // held claim by its reference ONLY (RF10's convention), read from the server's `details.held_claim_reference`.
    expect(sr.reasonLocked).not.toMatch(/still open/i);
    expect(sr.reasonLocked).toMatch(/has not been closed/i);
    expect(
      decisionErrorMessage(new ApiError(409, 'verifier_decision.suspicion_reason_locked', 'x', { held_claim_reference: 'A1B2C3D4' })),
    ).toBe(sr.reasonLocked.replace('{held}', `${sr.claim} A1B2C3D4`));
    // The reference is missing ⇒ a complete, grammatical fallback — ⛔ never a bare splice ("while  for this death…").
    const fallback = decisionErrorMessage(new ApiError(409, 'verifier_decision.suspicion_reason_locked', 'x', {}));
    expect(fallback).not.toContain('{held}');
    expect(fallback).not.toMatch(/while\s+for this death/i);
    expect(fallback).toBe(sr.reasonLocked.replace('{held}', sr.anotherClaim));
  });

  it('the wait 409 with ⛔ no / an unknown reason ⇒ neutral words — ⛔ never asserts an appeal is being decided (code review round 2)', () => {
    for (const details of [undefined, {}, { reason: 'something_new' }]) {
      const msg = decisionErrorMessage(new ApiError(409, 'verifier_decision.suspicion_appeal_pending', 'x', details));
      expect(msg).toBe(sr.approvalGateUnknown);
      expect(msg).not.toBe(sr.approvalGate.appeal_open);
    }
    expect(decisionErrorMessage(new ApiError(409, 'verifier_decision.suspicion_appeal_pending', 'x', { reason: 'appeal_not_filed' }))).toBe(sr.approvalGate.appeal_not_filed);
  });
});
