// Story 6.27b code review round 2 (X2; `@twt/contracts` `withheld-note.ts`) — ONE rendering of a staff note WITHHELD from
// this reader, shared by every surface: `own_visit` ⇒ the ONE neutral line; `check_failed` ⇒ the existing could-not-be-shown
// words; ⛔ never an empty note, a blank or a dash. The host legs live beside each host's own fixtures
// (`later-approval-warnings`, `verifier-console`, `correction-queue`, `nominee-name-check-panel`, `nominee-declaration-panel`,
// `death-certificate-review`, `verifier-console-route-name-check`).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { NomineeRefusalListResponse, R9VotesByTrusteeResponse } from '@twt/contracts';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const ACTOR = '33333333-3333-4333-8333-333333333333';

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ pariwarId: '44444444-4444-4444-8444-444444444444' }),
  useNavigate: () => vi.fn(),
}));
const getSession = vi.fn();
const getNomineeRefusals = vi.fn();
const getR9Queue = vi.fn();
const getR9VotesByTrustee = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getNomineeRefusals: (...a: unknown[]) => getNomineeRefusals(...a),
    getR9Queue: (...a: unknown[]) => getR9Queue(...a),
    getR9VotesByTrustee: (...a: unknown[]) => getR9VotesByTrustee(...a),
  };
});

const { AuditTrail } = await import('../src/modules/claim-verification/AuditTrailEntry.js');
const { WithheldNote, withheldNoteWords } = await import('../src/modules/claim-verification/WithheldNote.js');
const { verifierConsoleEn: t } = await import('../src/modules/claim-verification/i18n-en.js');
const { NomineeRefusalsRoute } = await import('../src/routes/NomineeRefusalsRoute.js');
const { R9VotingPage } = await import('../src/modules/r9-voting/R9VotingPage.js');

function wrap(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('<WithheldNote> — the words', () => {
  it('`own_visit` ⇒ the ONE neutral line (⛔ a word about the neighbours or the note); `check_failed` ⇒ the could-not-be-shown words', () => {
    expect(t.noteWithheld.own_visit).toBe('Not shown while a ground visit on this claim is assigned to you.');
    expect(t.noteWithheld.own_visit).not.toMatch(/neighbour|answer|warning|\d/i);
    expect(t.noteWithheld.check_failed).toBe(t.peerMesh.couldNotShow);
    expect(withheldNoteWords('own_visit')).toBe(t.noteWithheld.own_visit);
    expect(withheldNoteWords('check_failed')).toBe(t.noteWithheld.check_failed);
    // Review Y4 — the cross-claim words (precedents, votes-by-trustee); `check_failed` has ⛔ claim in it, so it is shared.
    expect(t.noteWithheld.own_visit_other_claim).toBe('Not shown while a ground visit on that claim is assigned to you.');
    expect(withheldNoteWords('own_visit', 'that_claim')).toBe(t.noteWithheld.own_visit_other_claim);
    expect(withheldNoteWords('check_failed', 'that_claim')).toBe(t.noteWithheld.check_failed);
  });

  it('renders the words as plain text (⛔ empty, ⛔ a dash, ⛔ a role)', () => {
    const { unmount } = render(<WithheldNote reason="own_visit" />);
    const own = screen.getByTestId('note-withheld');
    expect(own.textContent).toBe(t.noteWithheld.own_visit); // EXACTLY the words (review Y6)
    expect(own).not.toHaveAttribute('role');
    unmount();
    render(<WithheldNote reason="check_failed" />);
    expect(screen.getByTestId('note-withheld')).toHaveTextContent(t.peerMesh.couldNotShow);
  });
});

describe('<AuditTrail> — a WITHHELD rationale (the console\'s prior comments and precedents)', () => {
  const entry = { outcome: 'denied', reasonCode: 'concealment_flag_uphold', actorDisplay: 'Anita', decidedAt: '2026-10-01T00:00:00Z' };

  const line = (row: Element) => row.querySelector('[data-testid="audit-rationale"]');

  // Review Y6 — the server flags EVERY entry for a hidden reader (Y3), so `{ text: '', flag set }` is the hidden reader's
  // row and `{ text: '', flag: null }` is a NON-hidden reader's row with ⛔ recorded note. Each is pinned on its own.
  it('{ text "", flag set } ⇒ the withheld words — "this claim" by default, "that claim" on a CROSS-CLAIM row (Y4); `check_failed` the could-not-be-shown words', () => {
    render(
      <AuditTrail
        entries={[
          { ...entry, rationale: '', rationaleWithheld: 'own_visit' },
          { ...entry, rationale: '', rationaleWithheld: 'own_visit', otherClaim: true },
          { ...entry, rationale: '', rationaleWithheld: 'check_failed', otherClaim: true },
        ]}
      />,
    );
    const rows = screen.getAllByTestId('audit-trail-entry');
    expect(line(rows[0]!)?.textContent).toBe(t.noteWithheld.own_visit);
    expect(line(rows[1]!)?.textContent).toBe(t.noteWithheld.own_visit_other_claim);
    expect(line(rows[2]!)?.textContent).toBe(t.peerMesh.couldNotShow);
  });

  it('{ text "…", flag set } ⇒ the FLAG wins: the withheld words, ⛔ the text (a fail-closed reading of a malformed row)', () => {
    render(<AuditTrail entries={[{ ...entry, rationale: 'LEAKED-NOTE', rationaleWithheld: 'own_visit' }]} />);
    expect(line(screen.getByTestId('audit-trail-entry'))?.textContent).toBe(t.noteWithheld.own_visit);
  });

  it('{ text "", flag null } ⇒ ⛔ rationale line (a NON-hidden reader, ⛔ recorded note); { text "…", flag null } ⇒ the note, unchanged', () => {
    render(
      <AuditTrail
        entries={[
          { ...entry, rationale: '', rationaleWithheld: null },
          { ...entry, rationale: 'Recorded note.', rationaleWithheld: null },
        ]}
      />,
    );
    const rows = screen.getAllByTestId('audit-trail-entry');
    expect(line(rows[0]!)).toBeNull();
    expect(line(rows[1]!)?.textContent).toBe('Recorded note.');
  });
});

describe('the two remaining hosts — the refusals list (Pattern A) and the R9 votes-by-trustee transcript (Pattern B)', () => {
  it('<NomineeRefusalsRoute> — a WITHHELD rationale says so (⛔ "—"); a readable one unchanged', async () => {
    getSession.mockResolvedValue({ userId: ACTOR, nationalGrants: [] });
    const OTHER = '22222222-2222-4222-8222-222222222222';
    const list: NomineeRefusalListResponse = {
      items: [
        { claim_case_id: CLAIM, deceased_member_id: OTHER, claim_state: 'denied', refused_at: '2026-10-01T00:00:00.000Z', refused_by_display: 'Anita', rationale: { state: 'withheld', reason: 'own_visit' }, closed_holder_refused: false },
        { claim_case_id: OTHER, deceased_member_id: CLAIM, claim_state: 'denied', refused_at: '2026-10-02T00:00:00.000Z', refused_by_display: 'Ravi', rationale: { state: 'readable', value: 'REFUSAL-NOTE' }, closed_holder_refused: false },
      ],
    };
    getNomineeRefusals.mockResolvedValue(list);
    wrap(<NomineeRefusalsRoute />);
    const notes = await screen.findAllByTestId('nominee-refusal-note');
    // Review Y6 — the cell holds EXACTLY the words (⛔ a dash beside them, ⛔ anything else) — a check that can fail.
    expect(notes[0]!.textContent).toBe(t.noteWithheld.own_visit);
    expect(notes[1]).toHaveTextContent('REFUSAL-NOTE');
  });

  it('<R9VotingPage> — a WITHHELD vote rationale in the votes-by-trustee transcript says "that claim" (Y4; ⛔ blank)', async () => {
    getR9Queue.mockResolvedValue({ pariwar_id: PARIWAR, items: [] });
    const VOTE = '88888888-8888-4888-8888-888888888888';
    const votes: R9VotesByTrusteeResponse = {
      actor_id: ACTOR,
      since_days: 180,
      votes: [
        {
          vote_id: VOTE,
          session_id: '55555555-5555-4555-8555-555555555555',
          claim_case_id: CLAIM,
          vote: 'approve',
          cast_at: '2026-10-01T00:00:00.000Z',
          superseded_at: null,
          clause_id: 'niy.special-death.r9',
          clause_version_id: '66666666-6666-4666-8666-666666666666',
          rule_code: 'R9',
          voting_requirement: 'majority',
          panel_actor_ids: [ACTOR],
          session_outcome: null,
          rationale: '',
          rationale_withheld: 'own_visit',
        },
      ],
    };
    getR9VotesByTrustee.mockResolvedValue(votes);
    wrap(<R9VotingPage pariwarId={PARIWAR} />);
    fireEvent.change(screen.getByLabelText('Trustee actor id'), { target: { value: ACTOR } });
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }));
    // Review Y4 — a CROSS-CLAIM transcript: the visit is on THAT claim (⛔ "this claim").
    expect((await screen.findByTestId(`r9-trustee-vote-rationale-${VOTE}`)).textContent).toBe(t.noteWithheld.own_visit_other_claim);
  });
});

