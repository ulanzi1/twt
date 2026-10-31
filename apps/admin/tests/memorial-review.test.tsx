// Story 11b.4 (Task 7, AC9 / MA6 / MA16) — the Trustee Panel's family-memorial review screen.
//   · the sentence aid splits Hindi on `।` / `॥` within paragraphs (a UI aid; the server validates offsets);
//   · touching parts with the same reason merge; bidi controls are shown VISIBLY;
//   · the queue lists the name and date — ⛔ the body; a 403 renders the page's own "no access";
//   · a decision posts the act, offsets and reasons — ⛔ the family's words;
//   · ⛔ no textbox's value equals or contains the body; the internal note starts EMPTY (the `queryByRole('textbox')`
//     precedent, `ground-inspection-discrepancy.test.tsx`);
//   · code review: R9 — the withdraw form posts to the chain's approved version, not the one open; R13 — a hidden RLO is
//     shown visibly EVERYWHERE the family's words are rendered; R14 — the queue pages ("Load more"); R19 — a server
//     refusal names its problem in a whole sentence, and the confirmation outlives the form that raised it;
//   · fix-diff reviews: V6 / W8 — one action at a time, and a succeeded action keeps its form locked; W9 — the Decided
//     tab's date line is labelled by state.

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MemorialDecisionProblem, MemorialReviewDetailResponse, MemorialReviewVersion } from '@twt/contracts';
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
import { bidiVisible, bidiVisibleString, buildOmissions, memorialSentenceRanges } from '../src/modules/memorial-review/derive.js';
import { problemSentence } from '../src/modules/memorial-review/i18n-en.js';
import { MemorialReviewDetailPage, MemorialReviewListPage } from '../src/modules/memorial-review/MemorialReviewPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const SUB = '55555555-5555-4555-8555-555555555555';
const SUB_NEWER = '66666666-6666-4666-8666-666666666666';
const BODY = 'माँ बहुत अच्छी थीं। रमेश ने धोखा दिया।\n\nहम उन्हें याद करते हैं॥';
/** An UNTERMINATED right-to-left override — built from its code point so this file holds no invisible character. */
const RLO = String.fromCharCode(0x202e);

function version(over: Partial<MemorialReviewVersion> = {}): MemorialReviewVersion {
  return {
    submissionId: SUB,
    sentAt: '2026-10-20T10:00:00.000Z',
    body: BODY,
    altText: null,
    // Story 11b.5a — ⛔ family list and ⛔ declaration unless a test gives them (a v1 row).
    kinship: null,
    unavailable: null,
    hasPhoto: false,
    photoUrl: null,
    guardianDeclaration: false,
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
    withdrawApprovalTargetId: null,
    ...over,
  };
}

/** A decided-and-approved version (the one a Trust withdrawal targets). */
function approvedVersion(over: Partial<MemorialReviewVersion> = {}): MemorialReviewVersion {
  return version({
    decision: {
      action: 'approved',
      omissions: [],
      photoLeftOutReason: null,
      kinshipLeftOut: [],
      reasonCode: null,
      internalNote: null,
      actorDisplay: 'Panel Member',
      decidedAt: '2026-10-21T10:00:00.000Z',
    },
    ...over,
  });
}

/** The 400 the API sends when the shared validator refuses a decision. */
function invalidOmissions(problem?: string): ApiError {
  return new ApiError(
    400,
    'memorial_review.invalid_omissions',
    'The parts left out are not valid',
    problem === undefined ? undefined : { problem },
  );
}

afterEach(() => cleanup());
beforeEach(() => {
  vi.mocked(api.decideMemorialReview).mockReset();
  vi.mocked(api.withdrawMemorialApproval).mockReset();
  vi.mocked(api.getMemorialReview).mockReset();
  vi.mocked(api.listMemorialReviews).mockReset();
});

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
      items: [
        { submissionId: SUB, deceasedName: 'Shanti Devi', sentAt: '2026-10-20T10:00:00.000Z', decidedAt: null, memorialState: 'with_the_trust' },
      ],
      hasMore: false,
    });
    renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
    const row = await screen.findByTestId(`memorial-row-${SUB}`);
    expect(within(row).getByText('Shanti Devi')).toBeInTheDocument();
    expect(within(row).getByText('With the Trust')).toBeInTheDocument();
    // A pending row has no decision, so no "Decided" line (V12).
    expect(within(row).queryByTestId('memorial-row-decided')).toBeNull();
    // The first page: from offset 0, one page's worth.
    expect(api.listMemorialReviews).toHaveBeenCalledWith(PARIWAR, 'pending', 50, 0);
    // ⛔ No "Load more" when the server says there is no more.
    expect(screen.queryByTestId('memorial-load-more')).toBeNull();
  });

  // R14 — the Decided tab was the OLDEST 50 with no way past them; it is now newest-first and pages.
  describe('paging (R14)', () => {
    const item = (n: number) => ({
      submissionId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      deceasedName: `Member ${n}`,
      sentAt: '2026-10-20T10:00:00.000Z',
      decidedAt: '2026-10-21T10:00:00.000Z',
      memorialState: 'approved' as const,
    });
    const row = (n: number) => `memorial-row-${item(n).submissionId}`;

    it('the Decided tab asks for the first page, then "Load more" APPENDS the next page at the right offset', async () => {
      vi.mocked(api.listMemorialReviews).mockImplementation(async (_pariwar, view, _limit, offset) => {
        if (view === 'pending') return { items: [], hasMore: false };
        return offset === 0 ? { items: [item(1), item(2)], hasMore: true } : { items: [item(3)], hasMore: false };
      });
      renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Decided' }));
      expect(await screen.findByTestId(row(1))).toBeInTheDocument();
      expect(api.listMemorialReviews).toHaveBeenCalledWith(PARIWAR, 'decided', 50, 0);
      expect(screen.queryByTestId(row(3))).toBeNull();

      fireEvent.click(screen.getByTestId('memorial-load-more'));
      expect(await screen.findByTestId(row(3))).toBeInTheDocument();
      // The offset is the rows already loaded; the earlier rows stay (appended, not replaced).
      expect(api.listMemorialReviews).toHaveBeenCalledWith(PARIWAR, 'decided', 50, 2);
      expect(screen.getByTestId(row(1))).toBeInTheDocument();
      expect(screen.getByTestId(row(2))).toBeInTheDocument();
      // The last page said `hasMore: false`, so the button goes.
      await waitFor(() => expect(screen.queryByTestId('memorial-load-more')).toBeNull());
    });

    it('a row a new decision pushed onto the next page is shown ONCE', async () => {
      vi.mocked(api.listMemorialReviews).mockImplementation(async (_pariwar, view, _limit, offset) => {
        if (view === 'pending') return { items: [], hasMore: false };
        return offset === 0 ? { items: [item(1), item(2)], hasMore: true } : { items: [item(2), item(3)], hasMore: false };
      });
      renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Decided' }));
      fireEvent.click(await screen.findByTestId('memorial-load-more'));
      expect(await screen.findByTestId(row(3))).toBeInTheDocument();
      expect(screen.getAllByTestId(row(2))).toHaveLength(1);
    });

    it('a failed "Load more" keeps the rows already loaded and says so', async () => {
      vi.mocked(api.listMemorialReviews).mockImplementation(async (_pariwar, view, _limit, offset) => {
        if (view === 'pending') return { items: [], hasMore: false };
        if (offset === 0) return { items: [item(1)], hasMore: true };
        throw new ApiError(500, 'internal', 'boom');
      });
      renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Decided' }));
      fireEvent.click(await screen.findByTestId('memorial-load-more'));
      expect(await screen.findByText('Could not load memorials.')).toBeInTheDocument();
      expect(screen.getByTestId(row(1))).toBeInTheDocument();
    });
  });

  // V12 — the Decided tab is ordered by the decision time (T7); a row that showed only its SENT date looked unsorted.
  it('a decided row shows its decision date ("Decided …") beside the date it was sent', async () => {
    const decidedAt = '2026-10-23T09:00:00.000Z';
    vi.mocked(api.listMemorialReviews).mockImplementation(async (_pariwar, view) =>
      view === 'pending'
        ? { items: [], hasMore: false }
        : {
            items: [{ submissionId: SUB, deceasedName: 'Shanti Devi', sentAt: '2026-06-01T10:00:00.000Z', decidedAt, memorialState: 'approved' }],
            hasMore: false,
          },
    );
    renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decided' }));
    const row = await screen.findByTestId(`memorial-row-${SUB}`);
    const decidedLine = within(row).getByTestId('memorial-row-decided');
    expect(decidedLine).toHaveTextContent(`Decided ${new Date(decidedAt).toLocaleDateString('en-IN')}`);
    // The sent date is still there, and is a DIFFERENT date — the line shows the decision time, not the sent one.
    expect(row).toHaveTextContent(new Date('2026-06-01T10:00:00.000Z').toLocaleDateString('en-IN'));
    expect(decidedLine).not.toHaveTextContent(new Date('2026-06-01T10:00:00.000Z').toLocaleDateString('en-IN'));
  });

  // W9 — every Decided-tab row read "Decided …", including a family withdrawal (no decision at all) and an approval the
  // Trust withdrew (the date is the withdrawal's). The line is labelled by the row's state, through the page's own `t()`.
  it.each([
    ['approved', 'Decided'],
    ['approved_with_omissions', 'Decided'],
    ['not_approved', 'Decided'],
    ['withdrawn', 'Withdrawn'],
    ['approval_withdrawn', 'Approval withdrawn'],
    // Story 11b.4a (AC12) — a head the helpline took down (the date is the withdrawal's).
    ['taken_down', 'Taken down'],
  ] as const)('a %s row\'s date line reads "%s <date>"', async (memorialState, label) => {
    const decidedAt = '2026-10-23T09:00:00.000Z';
    vi.mocked(api.listMemorialReviews).mockImplementation(async (_pariwar, view) =>
      view === 'pending'
        ? { items: [], hasMore: false }
        : {
            items: [{ submissionId: SUB, deceasedName: 'Shanti Devi', sentAt: '2026-06-01T10:00:00.000Z', decidedAt, memorialState }],
            hasMore: false,
          },
    );
    renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decided' }));
    const row = await screen.findByTestId(`memorial-row-${SUB}`);
    expect(within(row).getByTestId('memorial-row-decided').textContent).toBe(`${label} ${new Date(decidedAt).toLocaleDateString('en-IN')}`);
  });

  // X7 — a state this build does not know (a newer server's) still reads "Decided <date>", ⛔ "undefined <date>".
  it('a row in an UNKNOWN future state falls back to "Decided <date>"', async () => {
    const decidedAt = '2026-10-23T09:00:00.000Z';
    vi.mocked(api.listMemorialReviews).mockImplementation(async (_pariwar, view) =>
      view === 'pending'
        ? { items: [], hasMore: false }
        : {
            items: [{ submissionId: SUB, deceasedName: 'Shanti Devi', sentAt: '2026-06-01T10:00:00.000Z', decidedAt, memorialState: 'a_future_state' as never }],
            hasMore: false,
          },
    );
    renderWithClient(<MemorialReviewListPage pariwarId={PARIWAR} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decided' }));
    const row = await screen.findByTestId(`memorial-row-${SUB}`);
    expect(within(row).getByTestId('memorial-row-decided').textContent).toBe(`Decided ${new Date(decidedAt).toLocaleDateString('en-IN')}`);
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
    // A whole sentence (R19), not a lead-in with a dangling colon.
    expect(await screen.findByTestId('memorial-decision-problem')).toHaveTextContent(
      'Nothing of the words would be left. Choose “Do not approve” instead.',
    );
    expect(api.decideMemorialReview).not.toHaveBeenCalled();
  });

  it('⭐ AC9: ⛔ no textbox\'s value equals or contains the body; the internal note starts EMPTY', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail({ canWithdrawApproval: true, withdrawApprovalTargetId: SUB }));
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
              kinshipLeftOut: [],
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

  // ⭐ Story 11b.4a (AC12, Trap 15) — a `helpline` withdrawal reads as the helpline's take-down, WITH its time — ⛔ never "The Trust
  // withdrew its approval." (the two-way ternary this map replaced read exactly that, and nothing failed to compile).
  it('a helpline withdrawal reads "Taken down at the nominee\'s request · {time}", and the state reads taken down', async () => {
    const withdrawnAt = '2026-10-27T10:00:00.000Z';
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({
        memorialState: 'taken_down',
        canDecide: false,
        chain: [
          approvedVersion({
            withdrawal: { withdrawnBy: 'helpline', reasonCode: null, internalNote: null, actorDisplay: 'Helpline Operator', withdrawnAt },
          }),
        ],
      }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const line = await screen.findByTestId('memorial-withdrawal');
    expect(line).toHaveTextContent(`Taken down at the nominee’s request · ${new Date(withdrawnAt).toLocaleString('en-IN')}`);
    expect(line).not.toHaveTextContent('The Trust withdrew its approval.');
    expect(screen.getAllByText('Taken down at the nominee’s request').length).toBeGreaterThan(0);
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
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({ canDecide: false, canWithdrawApproval: true, withdrawApprovalTargetId: SUB, chain: [approvedVersion()] }),
    );
    vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-withdraw-form');
    const button = within(form).getByRole('button', { name: 'Withdraw approval' });
    expect(button).toBeDisabled();
    fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
    fireEvent.click(button);
    await waitFor(() => expect(api.withdrawMemorialApproval).toHaveBeenCalledWith(PARIWAR, SUB, { reasonCode: 'identifies_a_child' }));
  });

  // R9 — the queue lists chain HEADS, so the version a reviewer opens is usually the newest, while the approval to withdraw
  // is on an EARLIER one. `canWithdrawApproval` was evaluated for the opened id, so the cure was unreachable from the head.
  describe('MA16 from the head of a chain whose earlier version is approved (R9)', () => {
    const chain = (): MemorialReviewVersion[] => [
      approvedVersion({ submissionId: SUB, sentAt: '2026-10-20T10:00:00.000Z' }),
      version({ submissionId: SUB_NEWER, sentAt: '2026-10-22T10:00:00.000Z' }),
    ];

    it('offers the withdrawal on the head, names the version it withdraws, and posts to THAT version', async () => {
      vi.mocked(api.getMemorialReview).mockResolvedValue(
        detail({ submissionId: SUB_NEWER, canDecide: true, canWithdrawApproval: true, withdrawApprovalTargetId: SUB, chain: chain() }),
      );
      vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
      renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

      const form = await screen.findByTestId('memorial-withdraw-form');
      // It says WHICH version — by its place in the chain and its date — not the version that happens to be open.
      expect(within(form).getByTestId('memorial-withdraw-target')).toHaveTextContent(/This withdraws the approval of Version 1 of 2/);
      expect(within(form).getByTestId('memorial-withdraw-target')).not.toHaveTextContent('Version 2');

      fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'against_the_law' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));
      await waitFor(() => expect(api.withdrawMemorialApproval).toHaveBeenCalledWith(PARIWAR, SUB, { reasonCode: 'against_the_law' }));
      expect(api.withdrawMemorialApproval).not.toHaveBeenCalledWith(PARIWAR, SUB_NEWER, expect.anything());
    });

    it('each card carries its place in the chain, so the reviewer can tell which version an action names', async () => {
      vi.mocked(api.getMemorialReview).mockResolvedValue(
        detail({ submissionId: SUB_NEWER, canWithdrawApproval: true, withdrawApprovalTargetId: SUB, chain: chain() }),
      );
      renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);
      expect(await screen.findByTestId(`memorial-version-${SUB}`)).toHaveTextContent('Version 1 of 2');
      expect(screen.getByTestId(`memorial-version-${SUB_NEWER}`)).toHaveTextContent('Version 2 of 2');
      expect(screen.getByTestId(`memorial-version-${SUB_NEWER}`)).toHaveTextContent('This version');
    });

    it('no withdrawal is offered when the chain has no approved version', async () => {
      vi.mocked(api.getMemorialReview).mockResolvedValue(detail({ canWithdrawApproval: false, withdrawApprovalTargetId: null }));
      renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
      await screen.findByTestId('memorial-decision-form');
      expect(screen.queryByTestId('memorial-withdraw-form')).toBeNull();
    });

    // Two approved versions: withdrawing the NEWER approval moves the chain's target to the EARLIER one, and the form that
    // was on screen for the first target must not carry its lock, its reason or its note over to the second.
    // v1 approved with a part left out, v2 (the head) approved — and v2's approval withdrawn by the Trust.
    const twoApproved = () => {
      const start = BODY.indexOf('रमेश');
      const v1 = approvedVersion({
        submissionId: SUB,
        sentAt: '2026-10-20T10:00:00.000Z',
        decision: {
          action: 'approved_with_omissions',
          omissions: [{ field: 'body', start, end: BODY.indexOf('।', start) + 1, reason: 'accuses_someone_of_wrongdoing' }],
          photoLeftOutReason: null,
          kinshipLeftOut: [],
          reasonCode: null,
          internalNote: null,
          actorDisplay: 'Panel Member',
          decidedAt: '2026-10-20T12:00:00.000Z',
        },
      });
      const v2 = approvedVersion({ submissionId: SUB_NEWER, sentAt: '2026-10-22T10:00:00.000Z' });
      const v2Withdrawn: MemorialReviewVersion = {
        ...v2,
        withdrawal: {
          withdrawnBy: 'trust',
          reasonCode: 'against_the_law',
          internalNote: 'first note',
          actorDisplay: 'Panel Member',
          withdrawnAt: '2026-10-23T10:00:00.000Z',
        },
      };
      return { v1, v2, v2Withdrawn };
    };

    it('after the first withdrawal the form is for the NEXT approved version: named, empty, enabled, posting to its id', async () => {
      const { v1, v2, v2Withdrawn } = twoApproved();
      const opened = { submissionId: SUB_NEWER, canDecide: false } as const;
      vi.mocked(api.getMemorialReview)
        .mockResolvedValueOnce(detail({ ...opened, memorialState: 'approved', canWithdrawApproval: true, withdrawApprovalTargetId: SUB_NEWER, chain: [v1, v2] }))
        // After v2's approval is withdrawn, v1 is the latest approved, not-withdrawn version.
        .mockResolvedValueOnce(
          detail({ ...opened, memorialState: 'approval_withdrawn', canWithdrawApproval: true, withdrawApprovalTargetId: SUB, chain: [v1, v2Withdrawn] }),
        )
        // After v1's, nothing is left to withdraw.
        .mockResolvedValue(
          detail({
            ...opened,
            memorialState: 'approval_withdrawn',
            canWithdrawApproval: false,
            withdrawApprovalTargetId: null,
            chain: [{ ...v1, withdrawal: v2Withdrawn.withdrawal }, v2Withdrawn],
          }),
        );
      vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
      renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

      // First: the newer approval (Version 2 of 2), with a reason and a note typed.
      let form = await screen.findByTestId('memorial-withdraw-form');
      expect(within(form).getByTestId('memorial-withdraw-target')).toHaveTextContent('Version 2 of 2');
      fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'against_the_law' } });
      fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'first note' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));
      await waitFor(() =>
        expect(api.withdrawMemorialApproval).toHaveBeenCalledWith(PARIWAR, SUB_NEWER, { reasonCode: 'against_the_law', internalNote: 'first note' }),
      );

      // The target moved on: the form now names Version 1 …
      await waitFor(() => expect(screen.getByTestId('memorial-withdraw-target')).toHaveTextContent('Version 1 of 2'));
      form = screen.getByTestId('memorial-withdraw-form');
      expect(within(form).getByTestId('memorial-withdraw-target')).not.toHaveTextContent('Version 2');
      // … the first withdrawal's confirmation is still on the page, and it names the version it was about — Version 2, not the
      // Version 1 the form beside it is now for …
      expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 2 withdrawn.');
      expect(screen.getByTestId('memorial-feedback-status')).not.toHaveTextContent('Version 1');
      // … its inputs are EMPTY again (the reason and the note typed for Version 2 are gone) …
      expect(within(form).getByRole('combobox')).toHaveValue('');
      expect(within(form).getByRole('textbox')).toHaveValue('');
      // … and it is usable: choosing a reason enables it (the first success must not lock the second target) …
      const button = within(form).getByRole('button', { name: 'Withdraw approval' });
      fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
      expect(button).toBeEnabled();
      // … and it posts to Version 1's id, with the new reason and not the old note.
      fireEvent.click(button);
      await waitFor(() => expect(api.withdrawMemorialApproval).toHaveBeenCalledWith(PARIWAR, SUB, { reasonCode: 'identifies_a_child' }));
      expect(api.withdrawMemorialApproval).toHaveBeenCalledTimes(2);

      // Nothing left to withdraw: the form goes, and the confirmation stays — now about Version 1.
      await waitFor(() => expect(screen.queryByTestId('memorial-withdraw-form')).toBeNull());
      expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.');
      expect(screen.getByTestId('memorial-feedback-status')).not.toHaveTextContent('Version 2');
    });

    // The mutation is the PAGE's, so a FAILED withdrawal of v2 outlives the form it came from: another reviewer withdrew v2's
    // approval first (404), the refetch moved the target to v1, and a fresh form for Version 1 now sits beside the old error.
    it('a FAILED withdrawal of Version 2 is named Version 2, so it is never read as being about the new Version 1 form', async () => {
      const { v1, v2, v2Withdrawn } = twoApproved();
      const opened = { submissionId: SUB_NEWER, canDecide: false } as const;
      vi.mocked(api.getMemorialReview)
        .mockResolvedValueOnce(detail({ ...opened, memorialState: 'approved', canWithdrawApproval: true, withdrawApprovalTargetId: SUB_NEWER, chain: [v1, v2] }))
        // The refetch after the failure: the other reviewer's withdrawal of v2 is there, and v1 is the target now.
        .mockResolvedValueOnce(
          detail({ ...opened, memorialState: 'approval_withdrawn', canWithdrawApproval: true, withdrawApprovalTargetId: SUB, chain: [v1, v2Withdrawn] }),
        )
        .mockResolvedValue(
          detail({ ...opened, memorialState: 'approval_withdrawn', canWithdrawApproval: false, withdrawApprovalTargetId: null, chain: [v1, v2Withdrawn] }),
        );
      vi.mocked(api.withdrawMemorialApproval)
        .mockRejectedValueOnce(new ApiError(404, 'memorial_review.not_found', 'Not found'))
        .mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
      renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

      let form = await screen.findByTestId('memorial-withdraw-form');
      expect(within(form).getByTestId('memorial-withdraw-target')).toHaveTextContent('Version 2 of 2');
      fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'against_the_law' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));
      await waitFor(() => expect(api.withdrawMemorialApproval).toHaveBeenCalledWith(PARIWAR, SUB_NEWER, { reasonCode: 'against_the_law' }));

      // The form beside the error is now for Version 1 …
      await waitFor(() => expect(screen.getByTestId('memorial-withdraw-target')).toHaveTextContent('Version 1 of 2'));
      // … and the error says which version it failed for: Version 2.
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Could not withdraw the approval of Version 2. Please reload and try again.');
      expect(alert).not.toHaveTextContent('Version 1');

      // The new form is usable, and its own answer replaces the old error (the success names Version 1).
      form = screen.getByTestId('memorial-withdraw-form');
      expect(within(form).getByRole('combobox')).toHaveValue('');
      fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));
      await waitFor(() => expect(api.withdrawMemorialApproval).toHaveBeenCalledWith(PARIWAR, SUB, { reasonCode: 'identifies_a_child' }));
      await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.'));
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});

// R13 — AC9: "bidi controls in the family's text are shown visibly". Only the stored block did it; the places where the
// reviewer chooses what to cut (the sentence picker), reads what was approved, and reads what was left out rendered the raw
// text, so an unterminated RLO reordered what they read at the moment of decision.
describe('a hidden bidi control is shown visibly EVERYWHERE the family\'s words are rendered (R13)', () => {
  const MARKER = '⟦BIDI U+202E⟧';
  // Sentence 1 is clean; sentence 2 (left out) and sentence 3 (kept) each hold an UNTERMINATED RLO.
  const S1 = 'She was kind.';
  const S2 = `He${RLO} lied about it.`;
  const S3 = `We${RLO} miss her.`;
  const RLO_BODY = `${S1} ${S2} ${S3}`;

  it('the sentence picker\'s labels', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({ chain: [version({ body: RLO_BODY, authorisationLocale: 'en' })] }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByLabelText('Approve, leaving out a part'));
    const sentences = within(form).getAllByTestId('memorial-sentence');
    expect(sentences).toHaveLength(3);
    for (const s of [sentences[1]!, sentences[2]!]) {
      expect(within(s).getAllByTestId('memorial-bidi-marker')).toHaveLength(1);
      expect(s).toHaveTextContent(MARKER);
    }
    expect(within(sentences[0]!).queryByTestId('memorial-bidi-marker')).toBeNull();
    // The raw control is not in the picker at all.
    expect(screen.getByTestId('memorial-sentences-body').textContent).not.toContain(RLO);
  });

  it('the as-approved text, the omission quote, the photo\'s alt text — and no raw control anywhere in the page', async () => {
    const start = RLO_BODY.indexOf(S2);
    const alt = `Her${RLO} portrait.`;
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({
        memorialState: 'approved_with_omissions',
        canDecide: false,
        chain: [
          version({
            body: RLO_BODY,
            altText: alt,
            hasPhoto: true,
            photoUrl: 'https://photos.example.test/p.jpg',
            authorisationLocale: 'en',
            decision: {
              action: 'approved_with_omissions',
              omissions: [{ field: 'body', start, end: start + S2.length, reason: 'accuses_someone_of_wrongdoing' }],
              photoLeftOutReason: null,
              kinshipLeftOut: [],
              reasonCode: null,
              internalNote: null,
              actorDisplay: 'Panel Member',
              decidedAt: '2026-10-21T10:00:00.000Z',
            },
          }),
        ],
      }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);

    // What was approved: sentence 3 (kept, RLO inside) beside the "[left out]" marker for sentence 2.
    const asApproved = await screen.findByTestId('memorial-as-approved');
    expect(within(asApproved).getAllByTestId('memorial-bidi-marker')).toHaveLength(1);
    expect(asApproved).toHaveTextContent(MARKER);
    expect(asApproved).toHaveTextContent('[left out]');
    // What was left out: the quote of sentence 2 (RLO inside).
    const omission = within(screen.getByTestId('memorial-decision')).getByTestId('memorial-omission');
    expect(within(omission).getAllByTestId('memorial-bidi-marker')).toHaveLength(1);
    expect(omission).toHaveTextContent(MARKER);
    // The photo's alt text, which a broken image shows raw.
    expect(screen.getByRole('img')).toHaveAttribute('alt', `Her${MARKER} portrait.`);
    // The ONE sweep over the whole page: the control is in no text node and no attribute.
    expect(document.body.innerHTML).not.toContain(RLO);
  });

  it('the one helper: bidiVisibleString spells each control exactly as the marker does', () => {
    expect(bidiVisibleString(`ab${RLO}cd`)).toBe(`ab${MARKER}cd`);
    expect(bidiVisibleString('plain')).toBe('plain');
    expect(bidiVisibleString('')).toBe('');
    // The direction MARKS are shown too (LRM U+200E, RLM U+200F, ALM U+061C).
    expect(bidiVisible(`a${String.fromCharCode(0x200e)}b${String.fromCharCode(0x200f)}c${String.fromCharCode(0x061c)}`)).toEqual([
      { kind: 'text', text: 'a' },
      { kind: 'bidi', codePoint: 'U+200E' },
      { kind: 'text', text: 'b' },
      { kind: 'bidi', codePoint: 'U+200F' },
      { kind: 'text', text: 'c' },
      { kind: 'bidi', codePoint: 'U+061C' },
    ]);
  });
});

// R19 — a server refusal named no reason ("These choices cannot be recorded: " with nothing after the colon), and the
// confirmation of a success sat inside a form that unmounts the moment the refetch flips `canDecide` / `canWithdrawApproval`.
describe('what the screen says back (R19)', () => {
  // Typed as a Record so a problem added to the contract fails to compile HERE until it is listed.
  const PROBLEMS: Record<MemorialDecisionProblem, true> = {
    action_shape: true,
    photo_left_out_without_photo: true,
    alt_text_span_with_photo_left_out: true,
    alt_text_span_without_alt_text: true,
    span_empty: true,
    span_out_of_range: true,
    span_order: true,
    span_not_grapheme_boundary: true,
    span_blank: true,
    span_crosses_paragraph: true,
    nothing_left: true,
    kinship_without_list: true,
    kinship_index_out_of_range: true,
    kinship_order: true,
    alt_text_nothing_left: true,
  };

  it('every problem the validator can name has a whole sentence of its own — none ends in a colon, none repeats another', () => {
    const sentences = (Object.keys(PROBLEMS) as MemorialDecisionProblem[]).map((p) => problemSentence(p));
    for (const s of sentences) {
      expect(s.trim().length).toBeGreaterThan(20);
      expect(s).toMatch(/^[A-Z“]/);
      expect(s).toMatch(/[.”]$/);
      expect(s).not.toMatch(/:\s*$/);
    }
    expect(new Set(sentences).size).toBe(sentences.length);
    // …and none of them is the generic fallback.
    const generic = problemSentence(undefined);
    expect(sentences).not.toContain(generic);
  });

  it('an unknown, missing or non-string problem is still a complete sentence — no dangling colon', () => {
    for (const p of [undefined, null, 'a_problem_from_a_newer_server', 42, {}, '__proto__', 'toString']) {
      const s = problemSentence(p);
      expect(s).toMatch(/\.$/);
      expect(s).not.toMatch(/:\s*$/);
    }
  });

  it.each(Object.keys(PROBLEMS) as MemorialDecisionProblem[])('a server 400 naming %s renders that sentence', async (problem) => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail());
    vi.mocked(api.decideMemorialReview).mockRejectedValue(invalidOmissions(problem));
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByRole('button', { name: 'Record decision' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(problemSentence(problem));
    expect(alert.textContent).not.toMatch(/:\s*$/);
  });

  it('a server 400 with no named problem still says something whole', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(detail());
    vi.mocked(api.decideMemorialReview).mockRejectedValue(invalidOmissions());
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record decision' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(problemSentence(undefined));
    expect(alert.textContent).not.toMatch(/:\s*$/);
  });

  it('"Decision recorded." is announced and STAYS after the refetch removes the decision form', async () => {
    vi.mocked(api.getMemorialReview)
      .mockResolvedValueOnce(detail())
      .mockResolvedValue(detail({ memorialState: 'approved', canDecide: false, chain: [approvedVersion()] }));
    vi.mocked(api.decideMemorialReview).mockResolvedValue({ submissionId: SUB, memorialState: 'approved' });
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record decision' }));

    // The form goes (the refetch said it is decided) …
    await waitFor(() => expect(screen.queryByTestId('memorial-decision-form')).toBeNull());
    // … and the confirmation is still there, in a status region.
    const status = screen.getByTestId('memorial-feedback-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent('Decision recorded.');
    expect(vi.mocked(api.getMemorialReview).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('"Approval of Version 1 withdrawn." is announced and STAYS after the refetch removes the withdraw form', async () => {
    vi.mocked(api.getMemorialReview)
      .mockResolvedValueOnce(detail({ canDecide: false, canWithdrawApproval: true, withdrawApprovalTargetId: SUB, chain: [approvedVersion()] }))
      .mockResolvedValue(detail({ memorialState: 'approval_withdrawn', canDecide: false, canWithdrawApproval: false, chain: [approvedVersion()] }));
    vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-withdraw-form');
    fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));

    await waitFor(() => expect(screen.queryByTestId('memorial-withdraw-form')).toBeNull());
    expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.');
    expect(screen.getByTestId('memorial-feedback-status')).toHaveAttribute('role', 'status');
  });

  it('a refusal that arrives as the form disappears ("no longer open") is not lost with it either', async () => {
    vi.mocked(api.getMemorialReview)
      .mockResolvedValueOnce(detail())
      .mockResolvedValue(detail({ memorialState: 'approved', canDecide: false, chain: [approvedVersion()] }));
    vi.mocked(api.decideMemorialReview).mockRejectedValue(new ApiError(404, 'memorial_review.not_found', 'Not found'));
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record decision' }));
    await waitFor(() => expect(screen.queryByTestId('memorial-decision-form')).toBeNull());
    expect(screen.getByRole('alert')).toHaveTextContent('This version can no longer be decided');
  });

  // T12 (c) — with v1 approved and v2 open, BOTH forms are on the page and each mutation keeps its last answer: a failed
  // decision's alert stayed beside a later successful withdrawal. Starting one action now clears the other's answer.
  describe('only the LATEST action\'s answer shows (T12 (c))', () => {
    const both = () =>
      detail({
        submissionId: SUB_NEWER,
        canDecide: true,
        canWithdrawApproval: true,
        withdrawApprovalTargetId: SUB,
        chain: [
          approvedVersion({ submissionId: SUB, sentAt: '2026-10-20T10:00:00.000Z' }),
          version({ submissionId: SUB_NEWER, sentAt: '2026-10-22T10:00:00.000Z' }),
        ],
      });

    it('decide FAILS, then withdraw SUCCEEDS ⇒ only the withdrawal\'s confirmation shows — no alert left over', async () => {
      vi.mocked(api.getMemorialReview).mockResolvedValue(both());
      vi.mocked(api.decideMemorialReview).mockRejectedValue(new ApiError(500, 'internal', 'boom'));
      vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
      renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

      fireEvent.click(within(await screen.findByTestId('memorial-decision-form')).getByRole('button', { name: 'Record decision' }));
      // The premise: the failed decision IS shown first.
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not record this decision.');

      const form = screen.getByTestId('memorial-withdraw-form');
      fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));

      await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.'));
      const feedback = screen.getByTestId('memorial-feedback');
      expect(within(feedback).queryByRole('alert')).toBeNull();
      expect(feedback).not.toHaveTextContent('Could not record this decision.');
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('and the other way round: withdraw FAILS, then decide SUCCEEDS ⇒ only "Decision recorded." shows', async () => {
      vi.mocked(api.getMemorialReview).mockResolvedValue(both());
      vi.mocked(api.withdrawMemorialApproval).mockRejectedValue(new ApiError(500, 'internal', 'boom'));
      vi.mocked(api.decideMemorialReview).mockResolvedValue({ submissionId: SUB_NEWER, memorialState: 'approved' });
      renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

      const form = await screen.findByTestId('memorial-withdraw-form');
      fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not withdraw the approval of Version 1.');

      fireEvent.click(within(screen.getByTestId('memorial-decision-form')).getByRole('button', { name: 'Record decision' }));

      await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Decision recorded.'));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByTestId('memorial-feedback')).not.toHaveTextContent('Could not withdraw');
    });

    // V6 — resetting the OTHER mutation while it is still PENDING lost its answer and unlocked its form (a double submit):
    // while either action is in flight, BOTH submits are disabled; the other is reset only once it has settled.
    describe('one action at a time (V6)', () => {
      /** A promise the test settles by hand, so an action can be held PENDING. */
      function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
        let resolve!: (v: T) => void;
        let reject!: (e: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      }

      it('a PENDING decision disables the withdrawal; once it settles (failed), the withdrawal works and the decide alert clears', async () => {
        vi.mocked(api.getMemorialReview).mockResolvedValue(both());
        const pendingDecide = deferred<Awaited<ReturnType<typeof api.decideMemorialReview>>>();
        vi.mocked(api.decideMemorialReview).mockReturnValue(pendingDecide.promise);
        vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
        renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

        const form = await screen.findByTestId('memorial-withdraw-form');
        // A reason is chosen first, so the ONLY thing that can hold the withdrawal is the pending decision.
        fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
        const withdrawButton = within(form).getByRole('button', { name: 'Withdraw approval' });
        expect(withdrawButton).toBeEnabled();

        const decideButton = within(screen.getByTestId('memorial-decision-form')).getByRole('button', { name: 'Record decision' });
        fireEvent.click(decideButton);
        await waitFor(() => expect(api.decideMemorialReview).toHaveBeenCalledTimes(1));
        // W8 — the lock IS the `disabled` attribute: React drops a click on a disabled button, so clicking it and seeing no
        // call would pass whether or not the button were locked.
        await waitFor(() => expect(withdrawButton).toBeDisabled());
        expect(decideButton).toBeDisabled();

        // The decision settles — it failed — and its answer is shown (⛔ lost to a reset).
        pendingDecide.reject(new ApiError(500, 'internal', 'boom'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Could not record this decision.');
        await waitFor(() => expect(withdrawButton).toBeEnabled());

        fireEvent.click(withdrawButton);
        await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.'));
        expect(api.withdrawMemorialApproval).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByTestId('memorial-feedback')).not.toHaveTextContent('Could not record this decision.');
      });

      it('and the other way round: a PENDING withdrawal disables the decision', async () => {
        vi.mocked(api.getMemorialReview).mockResolvedValue(both());
        const pendingWithdraw = deferred<Awaited<ReturnType<typeof api.withdrawMemorialApproval>>>();
        vi.mocked(api.withdrawMemorialApproval).mockReturnValue(pendingWithdraw.promise);
        renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

        const form = await screen.findByTestId('memorial-withdraw-form');
        const decideButton = within(screen.getByTestId('memorial-decision-form')).getByRole('button', { name: 'Record decision' });
        expect(decideButton).toBeEnabled();
        fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
        fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));
        // The `disabled` attribute is the assertion (W8) — ⛔ a click React would drop.
        await waitFor(() => expect(decideButton).toBeDisabled());

        pendingWithdraw.resolve({ submissionId: SUB, memorialState: 'approval_withdrawn' });
        await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.'));
        await waitFor(() => expect(decideButton).toBeEnabled());
      });
    });

    // W8 — the other form's `onStart` reset a mutation that had already SUCCEEDED, unlocking its form before the refetch
    // showed the new state (a second decision on a decided version). Here every refetch answers the OLD state (`both()`),
    // so only the page's own lock stands between the reviewer and a second submit.
    describe('a SUCCEEDED action keeps its form locked until the refetch shows it (W8)', () => {
      it('decide SUCCEEDS, the refetch has not shown it, then Withdraw ⇒ the decision form stays disabled', async () => {
        vi.mocked(api.getMemorialReview).mockResolvedValue(both());
        vi.mocked(api.decideMemorialReview).mockResolvedValue({ submissionId: SUB_NEWER, memorialState: 'approved' });
        vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
        renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

        const decideButton = within(await screen.findByTestId('memorial-decision-form')).getByRole('button', { name: 'Record decision' });
        fireEvent.click(decideButton);
        await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Decision recorded.'));
        expect(decideButton).toBeDisabled();

        const form = screen.getByTestId('memorial-withdraw-form');
        fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
        fireEvent.click(within(form).getByRole('button', { name: 'Withdraw approval' }));
        await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.'));

        // The premise: the refetch still offers the decision form (it never showed the decision).
        expect(screen.getByTestId('memorial-decision-form')).toBeInTheDocument();
        // Both actions have settled, so ⛔ `actionPending` holds it — the decided-for lock does.
        expect(decideButton).toBeDisabled();
        // The decision's confirmation is still true, so it stays.
        expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Decision recorded.');
        expect(api.decideMemorialReview).toHaveBeenCalledTimes(1);
      });

      it('and the other way round: withdraw SUCCEEDS, the refetch has not shown it, then decide ⇒ the withdrawal stays disabled', async () => {
        vi.mocked(api.getMemorialReview).mockResolvedValue(both());
        vi.mocked(api.withdrawMemorialApproval).mockResolvedValue({ submissionId: SUB, memorialState: 'approval_withdrawn' });
        vi.mocked(api.decideMemorialReview).mockResolvedValue({ submissionId: SUB_NEWER, memorialState: 'approved' });
        renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB_NEWER} />);

        const form = await screen.findByTestId('memorial-withdraw-form');
        fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
        const withdrawButton = within(form).getByRole('button', { name: 'Withdraw approval' });
        fireEvent.click(withdrawButton);
        await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.'));
        expect(withdrawButton).toBeDisabled();

        fireEvent.click(within(screen.getByTestId('memorial-decision-form')).getByRole('button', { name: 'Record decision' }));
        await waitFor(() => expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Decision recorded.'));

        // The premise: the same withdraw form (same target, reason still chosen) is still on the page.
        expect(screen.getByTestId('memorial-withdraw-form')).toBe(form);
        expect(withdrawButton).toBeDisabled();
        expect(screen.getByTestId('memorial-feedback-status')).toHaveTextContent('Approval of Version 1 withdrawn.');
        expect(api.withdrawMemorialApproval).toHaveBeenCalledTimes(1);
      });
    });
  });
});

// ─── Story 11b.5a — the family list on the review screen (KL6 / KL12 / KL15 / KL16; AC5 / AC14 / AC15) ──────────────────
describe('Story 11b.5a — the family list, the declaration and the ticks', () => {
  const LIST: NonNullable<MemorialReviewVersion['kinship']> = [
    { relation: 'wife', name: 'परीक्षा-पत्नी' },
    { relation: 'daughters_daughter', name: 'परीक्षा-नातिन', inPhoto: true },
    { relation: 'son', name: `परीक्षा${RLO}पुत्र` },
  ];
  const withList = (over: Partial<MemorialReviewVersion> = {}) =>
    detail({ chain: [version({ kinship: LIST, hasPhoto: true, altText: 'फ़ोटो', photoUrl: 'https://x/p.jpg', ...over })] });

  it('the list sits under the words, each relation labelled (relative to the member who died), the bidi control visible', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(withList());
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const list = await screen.findByTestId('memorial-kinship');
    expect(list).toHaveTextContent('Each relation is the person’s relation to the member who died.');
    const entries = within(list).getAllByTestId('memorial-kinship-entry');
    expect(entries.map((e) => e.textContent?.split(' — ')[0])).toEqual(['Wife', 'Granddaughter (daughter\'s daughter)', 'Son']);
    expect(list.textContent).not.toContain(RLO); // shown as a visible marker, ⛔ raw
    // KL15 — the ticked person is listed BESIDE the photo.
    expect(screen.getByTestId('memorial-kinship-in-photo')).toHaveTextContent('परीक्षा-नातिन');
  });

  it('⭐ AC5 — leaving out one entry posts its INDEX and reason — ⛔ a name; ⛔ no textbox holds a name', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(withList({ hasPhoto: false, altText: null, photoUrl: null }));
    vi.mocked(api.decideMemorialReview).mockResolvedValue({ submissionId: SUB, memorialState: 'approved_with_omissions' });
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByLabelText('Approve, leaving out a part'));
    const choices = within(form).getAllByTestId('memorial-kinship-choice');
    expect(choices).toHaveLength(3);
    fireEvent.click(within(choices[2]!).getByRole('checkbox'));
    fireEvent.change(within(choices[2]!).getByRole('combobox'), { target: { value: 'attacks_someone_named' } });
    for (const box of screen.getAllByRole('textbox') as HTMLTextAreaElement[]) expect(box.value).not.toContain('परीक्षा');
    fireEvent.click(within(form).getByRole('button', { name: 'Record decision' }));
    await waitFor(() =>
      expect(api.decideMemorialReview).toHaveBeenCalledWith(PARIWAR, SUB, {
        action: 'approved_with_omissions',
        kinshipLeftOut: [{ index: 2, reason: 'attacks_someone_named' }],
      }),
    );
    expect(JSON.stringify(vi.mocked(api.decideMemorialReview).mock.calls[0])).not.toContain('परीक्षा');
  });

  it('⭐ KL15 — leaving out a TICKED entry on the child reason while the photo stays asks to confirm (⛔ a refusal); the second press posts', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(withList());
    vi.mocked(api.decideMemorialReview).mockResolvedValue({ submissionId: SUB, memorialState: 'approved_with_omissions' });
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByLabelText('Approve, leaving out a part'));
    const ticked = within(form).getAllByTestId('memorial-kinship-choice')[1]!;
    fireEvent.click(within(ticked).getByRole('checkbox'));
    fireEvent.change(within(ticked).getByRole('combobox'), { target: { value: 'identifies_a_child' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Record decision' }));
    expect(await screen.findByTestId('memorial-decision-problem')).toHaveTextContent(
      'This person is ticked as in the photo; the photo is being kept.',
    );
    expect(api.decideMemorialReview).not.toHaveBeenCalled();
    fireEvent.click(within(form).getByRole('button', { name: 'Record decision' }));
    await waitFor(() =>
      expect(api.decideMemorialReview).toHaveBeenCalledWith(PARIWAR, SUB, {
        action: 'approved_with_omissions',
        kinshipLeftOut: [{ index: 1, reason: 'identifies_a_child' }],
      }),
    );
  });

  it('⭐ AC14 — guardianDeclaration: the banner, the v4 child label and the guidance on EVERY reason select (decision AND withdrawal)', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({
        chain: [approvedVersion({ kinship: LIST, guardianDeclaration: true, authorisationCopyVersion: '2026-10-31.v4-pending-hi-review' })],
        canDecide: false,
        canWithdrawApproval: true,
        withdrawApprovalTargetId: SUB,
      }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    expect(await screen.findByTestId('memorial-declaration')).toHaveTextContent(
      'The sender has declared they are the parent or guardian of every child named or shown',
    );
    const withdrawForm = screen.getByTestId('memorial-withdraw-form');
    expect(within(withdrawForm).getByRole('option', { name: 'Names or shows a child the declaration cannot cover' })).toBeInTheDocument();
    expect(within(withdrawForm).getByTestId('memorial-child-guidance')).toHaveTextContent(
      'Use this only where something in the memorial itself shows the sender’s declaration cannot cover the child; the family is told why.',
    );
  });

  it('AC14 — the decision form\'s selects carry the guidance too under the declaration', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(withList({ guardianDeclaration: true }));
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const form = await screen.findByTestId('memorial-decision-form');
    fireEvent.click(within(form).getByLabelText('Do not approve'));
    expect(within(form).getByTestId('memorial-child-guidance')).toBeInTheDocument();
    expect(within(form).getByRole('option', { name: 'Names or shows a child the declaration cannot cover' })).toBeInTheDocument();
  });

  it('AC14 — a historical v1–v3 row shows ⛔ banner, ⛔ guidance, the plain label', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({ chain: [approvedVersion()], canDecide: false, canWithdrawApproval: true, withdrawApprovalTargetId: SUB }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const withdrawForm = await screen.findByTestId('memorial-withdraw-form');
    expect(screen.queryByTestId('memorial-declaration')).toBeNull();
    expect(within(withdrawForm).queryByTestId('memorial-child-guidance')).toBeNull();
    expect(within(withdrawForm).getByRole('option', { name: 'Names or shows a child' })).toBeInTheDocument();
  });

  it('AC14 — the FLAG drives the banner, ⛔ the version string: a synthetic later version with the flag shows it; a v4 id without it does not', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({ chain: [version({ guardianDeclaration: true, authorisationCopyVersion: '2099-01-01.v9-pending-hi-review' })] }),
    );
    const { unmount } = renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    expect(await screen.findByTestId('memorial-declaration')).toBeInTheDocument();
    unmount();
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({ chain: [version({ guardianDeclaration: false, authorisationCopyVersion: '2026-10-31.v4-pending-hi-review' })] }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    await screen.findByTestId('memorial-decision-form');
    expect(screen.queryByTestId('memorial-declaration')).toBeNull();
  });

  it('the history shows each left-out entry with its reason', async () => {
    vi.mocked(api.getMemorialReview).mockResolvedValue(
      detail({
        chain: [
          version({
            kinship: LIST,
            decision: {
              action: 'approved_with_omissions',
              omissions: [],
              photoLeftOutReason: null,
              kinshipLeftOut: [{ index: 0, reason: 'against_the_law' }],
              reasonCode: null,
              internalNote: null,
              actorDisplay: 'Panel Member',
              decidedAt: '2026-10-21T10:00:00.000Z',
            },
          }),
        ],
        canDecide: false,
      }),
    );
    renderWithClient(<MemorialReviewDetailPage pariwarId={PARIWAR} submissionId={SUB} />);
    const left = await screen.findByTestId('memorial-kinship-left-out');
    expect(left).toHaveTextContent('Wife — परीक्षा-पत्नी — Against the law');
  });

  it('the admin\'s English relation labels are pinned EQUAL to memorial.json en (KL9 — one wording)', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const { MEMORIAL_KINSHIP_RELATIONS } = await import('@twt/contracts');
    const { kinshipLabel } = await import('../src/modules/memorial-review/i18n-en.js');
    const en = JSON.parse(readFileSync(path.resolve(__dirname, '../../../packages/i18n/locales/en/memorial.json'), 'utf8')) as Record<string, string>;
    for (const r of MEMORIAL_KINSHIP_RELATIONS) expect(kinshipLabel(r), r).toBe(en[`kinship.${r}`]);
  });
});
