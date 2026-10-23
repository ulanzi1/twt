// Story 11b.4 (Task 7, AC9 / MA6 / MA16) — the Trustee Panel's family-memorial review screen.
//   · the sentence aid splits Hindi on `।` / `॥` within paragraphs (a UI aid; the server validates offsets);
//   · touching parts with the same reason merge; bidi controls are shown VISIBLY;
//   · the queue lists the name and date — ⛔ the body; a 403 renders the page's own "no access";
//   · a decision posts the act, offsets and reasons — ⛔ the family's words;
//   · ⛔ no textbox's value equals or contains the body; the internal note starts EMPTY (the `queryByRole('textbox')`
//     precedent, `ground-inspection-discrepancy.test.tsx`).

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MemorialReviewDetailResponse, MemorialReviewVersion } from '@twt/contracts';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
}));

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    listMemorialReviews: vi.fn(),
    getMemorialReview: vi.fn(),
    decideMemorialReview: vi.fn(),
    withdrawMemorialApproval: vi.fn(),
  };
});

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { bidiVisible, buildOmissions, memorialSentenceRanges } from '../src/modules/memorial-review/derive.js';
import { MemorialReviewDetailPage, MemorialReviewListPage } from '../src/modules/memorial-review/MemorialReviewPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const SUB = '55555555-5555-4555-8555-555555555555';
const BODY = 'माँ बहुत अच्छी थीं। रमेश ने धोखा दिया।\n\nहम उन्हें याद करते हैं॥';

function version(over: Partial<MemorialReviewVersion> = {}): MemorialReviewVersion {
  return {
    submissionId: SUB,
    sentAt: '2026-10-20T10:00:00.000Z',
    body: BODY,
    altText: null,
    unavailable: null,
    hasPhoto: false,
    photoUrl: null,
    authorisationCopyVersion: '2026-10-23.v1-pending-hi-review',
    authorisationLocale: 'hi',
    handoverRecipient: 'latest',
    decision: null,
    withdrawal: null,
    ...over,
  };
}

function detail(over: Partial<MemorialReviewDetailResponse> = {}): MemorialReviewDetailResponse {
  return {
    submissionId: SUB,
    deceasedName: 'Shanti Devi',
    memorialState: 'with_the_trust',
    chain: [version()],
    canDecide: true,
    canWithdrawApproval: false,
    ...over,
  };
}

afterEach(() => cleanup());
beforeEach(() => vi.mocked(api.decideMemorialReview).mockReset());

describe('the sentence aid (a UI aid only)', () => {
  it('splits Hindi on । and ॥, within paragraphs, ranges into the VERBATIM text', () => {
    const ranges = memorialSentenceRanges(BODY, 'hi');
    expect(ranges.map((r) => BODY.slice(r.start, r.end))).toEqual([
      'माँ बहुत अच्छी थीं।',
      'रमेश ने धोखा दिया।',
      'हम उन्हें याद करते हैं॥',
    ]);
  });

  it('splits English sentences too, and never crosses a blank line', () => {
    const text = 'She was kind. She sang.\n\nWe miss her';
    expect(memorialSentenceRanges(text, 'en').map((r) => text.slice(r.start, r.end))).toEqual(['She was kind.', 'She sang.', 'We miss her']);
  });

  it('merges touching parts with the SAME reason; keeps different reasons apart', () => {
    expect(
      buildOmissions([
        { field: 'body', start: 5, end: 9, reason: 'against_the_law' },
        { field: 'body', start: 0, end: 5, reason: 'against_the_law' },
        { field: 'body', start: 9, end: 12, reason: 'identifies_a_child' },
      ]),
    ).toEqual([
      { field: 'body', start: 0, end: 9, reason: 'against_the_law' },
      { field: 'body', start: 9, end: 12, reason: 'identifies_a_child' },
    ]);
  });

  it('shows a bidi control as a visible marker', () => {
    const rlo = String.fromCharCode(0x202e);
    expect(bidiVisible(`ab${rlo}cd`)).toEqual([
      { kind: 'text', text: 'ab' },
      { kind: 'bidi', codePoint: 'U+202E' },
      { kind: 'text', text: 'cd' },
    ]);
  });
});

describe('the queue', () => {
  it('lists the name and the date — ⛔ the body', async () => {
    vi.mocked(api.listMemorialReviews).mockResolvedValue({
      items: [{ submissionId: SUB, deceasedName: 'Shanti Devi', sentAt: '2026-10-20T10:00:00.000Z', memorialState: 'with_the_trust' }],
    });
    renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
    const row = await screen.findByTestId(`memorial-row-${SUB}`);
    expect(within(row).getByText('Shanti Devi')).toBeInTheDocument();
    expect(within(row).getByText('With the Trust')).toBeInTheDocument();
    expect(api.listMemorialReviews).toHaveBeenCalledWith(PARIWAR, 'pending');
  });

  it('a 403 renders the page\'s own "no access"', async () => {
    vi.mocked(api.listMemorialReviews).mockRejectedValue(new ApiError(403, 'auth.forbidden', 'Forbidden'));
    renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('memorial-no-access')).toBeInTheDocument();
  });
});

describe('one version and its decision', () => {
  it('posts the act, the offsets and the reason — ⛔ the family\'s words', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail());
    vi.mocked(api.decideMemorialReview).mockResolvedValue({ submissionId: SUB, memorialState: 'approved_with_omissions' });
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByLabelText('Approve, leaving out a part'));
    const sentences = within(form).getAllByTestId('memorial-sentence');
    expect(sentences).toHaveLength(3);
    fireEvent.click(within(sentences[1]!).getByRole('checkbox'));
    fireEvent.change(within(sentences[1]!).getByRole('combobox'), { target: { value: 'accuses_someone_of_wrongdoing' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Record decision' }));
    const start = BODY.indexOf('रमेश');
    await waitFor(() =>
      expect(api.decideMemorialReview).toHaveBeenCalledWith(PARIWAR, SUB, {
        action: 'approved_with_omissions',
        omissions: [{ field: 'body', start, end: BODY.indexOf('।', start) + 1, reason: 'accuses_someone_of_wrongdoing' }],
      }),
    );
    const sent = JSON.stringify(vi.mocked(api.decideMemorialReview).mock.calls[0]);
    expect(sent).not.toContain('रमेश');
  });

  it('pre-checks with the shared validator: leaving out EVERY sentence is refused before posting', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail());
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByLabelText('Approve, leaving out a part'));
    for (const s of within(form).getAllByTestId('memorial-sentence')) {
      fireEvent.click(within(s).getByRole('checkbox'));
      fireEvent.change(within(s).getByRole('combobox'), { target: { value: 'against_the_law' } });
    }
    fireEvent.click(within(form).getByRole('button', { name: 'Record decision' }));
    expect(await screen.findByTestId('memorial-decision-problem')).toHaveTextContent('nothing of the words would be left');
    expect(api.decideMemorialReview).not.toHaveBeenCalled();
  });

  it('⭐ AC9: ⛔ no textbox\'s value equals or contains the body; the internal note starts EMPTY', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail({ canWithdrawApproval: true }));
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByLabelText('Approve, leaving out a part'));
    const boxes = screen.getAllByRole('textbox') as HTMLTextAreaElement[];
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.value).toBe('');
      expect(box.value).not.toContain('माँ');
    }
    expect(screen.getByTestId('memorial-internal-note')).toHaveValue('');
    // ⛔ No take-down control anywhere on the page.
    expect(screen.queryByRole('button', { name: /take.?down|remove|delete/i })).toBeNull();
  });

  it('the history view shows a decided version\'s parts left out, its note, and a withdrawal', async () => {
    const start = BODY.indexOf('रमेश');
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({
        memorialState: 'approval_withdrawn',
        canDecide: false,
        chain: [
          version({
            decision: {
              action: 'approved_with_omissions',
              omissions: [{ field: 'body', start, end: BODY.indexOf('।', start) + 1, reason: 'accuses_someone_of_wrongdoing' }],
              photoLeftOutReason: null,
              reasonCode: null,
              internalNote: 'नाम लेकर आरोप',
              actorDisplay: 'Panel Member',
              decidedAt: '2026-10-21T10:00:00.000Z',
            },
            withdrawal: {
              withdrawnBy: 'trust',
              reasonCode: 'identifies_a_child',
              internalNote: null,
              actorDisplay: 'Panel Member',
              withdrawnAt: '2026-10-22T10:00:00.000Z',
            },
          }),
        ],
      }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    expect(await screen.findByTestId('memorial-decision-note')).toHaveTextContent('नाम लेकर आरोप');
    expect(screen.getByTestId('memorial-as-approved')).toHaveTextContent('[left out]');
    expect(screen.getByTestId('memorial-withdrawal')).toHaveTextContent('The Trust withdrew its approval.');
    expect(screen.queryByTestId('memorial-decision-form')).toBeNull();
  });

  it('a bidi control in the family\'s text is shown as a visible marker', async () => {
    const rlo = String.fromCharCode(0x202e);
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail({ chain: [version({ body: `abc${rlo}def` })] }));
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    expect(await screen.findAllByTestId('memorial-bidi-marker')).toHaveLength(1);
  });

  it('a 403 on the detail renders "no access"', async () => {
    vi.mocked(api.getMemorialReview).mockRejectedValue(new ApiError(403, 'auth.forbidden', 'Forbidden'));
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    expect(await screen.findByTestId('memorial-no-access')).toBeInTheDocument();
  });

  it('MA16: withdraw-approval needs a reason, then posts it', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail({ canDecide: false, canWithdrawApproval: true }));
    vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-withdraw-form');
    const button = within(form).getByRole('button', { name: 'Withdraw approval' });
    expect(button).toBeDisabled();
    fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
    fireEvent.click(button);
    await waitFor(() => expect(api.withdrawMemorialApproval).toHaveBeenCalledWith(PARIWAR, SUB, { reasonCode: 'identifies_a_child' }));
  });
});
