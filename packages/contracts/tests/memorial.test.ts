// Story 11b.4 — the family memorial's contracts: the by-value vocabularies pinned to the domain's (a TEST-ONLY domain
// import — tests never ship in a bundle), the blank / length rules (AC7), the paragraph ranges (AC11), the decision
// validator (MA6) and the no-edit input (AC6).

import { memorial as domainMemorial } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  MEMORIAL_BIDI_CONTROLS,
  MEMORIAL_INVISIBLE_CHARS,
  MEMORIAL_OMISSION_FIELDS,
  MEMORIAL_REVIEW_ACTIONS,
  MEMORIAL_REVIEW_REASONS,
  MEMORIAL_STATES,
  MEMORIAL_TAKEDOWN_OUTCOMES,
  MEMORIAL_WITHDRAWAL_ACTORS,
  MemorialMemberView,
  MemorialReviewDecisionInput,
  MemorialReviewDetailResponse,
  MemorialReviewListQuery,
  MemorialReviewListResponse,
  MemorialTakedownRequestInput,
  MemorialWithdrawApprovalInput,
  isMemorialTextBlank,
  memorialCodePointLength,
  memorialParagraphRanges,
  validateMemorialDecision,
  type MemorialDecisionCandidate,
} from '../src/index.js';

describe('vocabularies — by value, EQUAL to the domain tuples that generate the pgEnums', () => {
  it.each([
    [MEMORIAL_REVIEW_ACTIONS, domainMemorial.MEMORIAL_REVIEW_ACTIONS],
    [MEMORIAL_REVIEW_REASONS, domainMemorial.MEMORIAL_REVIEW_REASONS],
    [MEMORIAL_WITHDRAWAL_ACTORS, domainMemorial.MEMORIAL_WITHDRAWAL_ACTORS],
    [MEMORIAL_OMISSION_FIELDS, domainMemorial.MEMORIAL_OMISSION_FIELDS],
    [MEMORIAL_STATES, domainMemorial.MEMORIAL_STATES],
    // Story 11b.4a — the take-down outcomes (the domain tuple generates `memorial_takedown_outcome`).
    [MEMORIAL_TAKEDOWN_OUTCOMES, domainMemorial.MEMORIAL_TAKEDOWN_OUTCOMES],
  ])('%#', (wire, domain) => {
    expect([...wire]).toEqual([...domain]);
  });

  it('the four grounds and ⛔ no catch-all, ⛔ no family_asked (MA6, MA18; Story 11b.4a Trap 7)', () => {
    expect([...MEMORIAL_REVIEW_REASONS]).toEqual([
      'attacks_someone_named',
      'accuses_someone_of_wrongdoing',
      'against_the_law',
      'identifies_a_child',
    ]);
    // ⚠ INVERTED 2026-10-27 (Story 11b.4a, `-412` §2): `helpline` IS now minted — the take-down at the nominee's request. It
    // carries ⛔ no reason, so the reviewer's four grounds stay exactly four and `family_asked` is ⛔ still not minted.
    expect([...MEMORIAL_WITHDRAWAL_ACTORS]).toEqual(['family', 'trust', 'helpline']);
    expect([...MEMORIAL_REVIEW_REASONS]).not.toContain('family_asked');
  });
});

describe('blank and length (AC7)', () => {
  it.each([
    ['', true],
    ['   \n\t ', true],
    ['\u200b\u200b', true], // ZWSP only
    ['\u3164', true], // HANGUL FILLER (Lo)
    ['\uffa0', true], // HALFWIDTH HANGUL FILLER (Lo) — added beyond the source class
    ['\u2800', true],
    ['.', false],
    ['माँ', false],
    ['❤', false],
  ])('%j blank=%s', (text, blank) => {
    expect(isMemorialTextBlank(text)).toBe(blank);
    // ⚠ The `/g` trap: the same answer twice in a row.
    expect(isMemorialTextBlank(text)).toBe(blank);
  });

  it('the classes carry ⛔ no `g` flag (stateful under .test)', () => {
    expect(MEMORIAL_INVISIBLE_CHARS.global).toBe(false);
    expect(MEMORIAL_BIDI_CONTROLS.global).toBe(false);
    expect(MEMORIAL_BIDI_CONTROLS.test('a\u202eb')).toBe(true);
    expect(MEMORIAL_BIDI_CONTROLS.test('a\u202eb')).toBe(true);
  });

  it('length counts CODE POINTS, ⛔ UTF-16 units', () => {
    expect(memorialCodePointLength('😀😀')).toBe(2);
    expect('😀😀'.length).toBe(4);
    expect(memorialCodePointLength('नमस्ते')).toBe(6);
  });
});

describe('memorialParagraphRanges (AC11)', () => {
  it('splits on a blank line, CRLF-aware, ⛔ trimming nothing inside a paragraph', () => {
    const text = '  पहली पंक्ति\r\n\r\n*दूसरी*  ';
    const ranges = memorialParagraphRanges(text);
    expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual(['  पहली पंक्ति', '*दूसरी*  ']);
  });

  it('a single line break is ⛔ a separator; a whitespace-only line is', () => {
    expect(memorialParagraphRanges('a\nb')).toEqual([{ start: 0, end: 3 }]);
    const t = 'a\n \t\nb';
    expect(memorialParagraphRanges(t).map((r) => t.slice(r.start, r.end))).toEqual(['a', 'b']);
  });

  it('an empty text has ⛔ no paragraph', () => {
    expect(memorialParagraphRanges('')).toEqual([]);
  });
});

describe('validateMemorialDecision (MA6)', () => {
  const body = 'पहला वाक्य। दूसरा वाक्य।\n\nतीसरा वाक्य।';
  const subject = { body, altText: 'माँ की फ़ोटो', hasPhoto: true, kinshipLength: null };
  const span = (start: number, end: number, field: 'body' | 'altText' = 'body') =>
    ({ field, start, end, reason: 'attacks_someone_named' }) as const;
  const awo = (d: Partial<MemorialDecisionCandidate>): MemorialDecisionCandidate => ({ action: 'approved_with_omissions', ...d });
  const first = body.indexOf('दूसरा');
  const firstEnd = body.indexOf('\n');

  it('approved: nothing else', () => {
    expect(validateMemorialDecision({ action: 'approved' }, subject)).toEqual({ ok: true });
    expect(validateMemorialDecision({ action: 'approved', omissions: [span(0, 3)] }, subject).ok).toBe(false);
    expect(validateMemorialDecision({ action: 'approved', photoLeftOut: { reason: 'identifies_a_child' } }, subject).ok).toBe(false);
    expect(validateMemorialDecision({ action: 'approved', reasonCode: 'against_the_law' }, subject).ok).toBe(false);
  });

  it('not_approved: a reason, and ⛔ no omissions or photoLeftOut', () => {
    expect(validateMemorialDecision({ action: 'not_approved', reasonCode: 'against_the_law' }, subject)).toEqual({ ok: true });
    expect(validateMemorialDecision({ action: 'not_approved' }, subject).ok).toBe(false);
    expect(
      validateMemorialDecision({ action: 'not_approved', reasonCode: 'against_the_law', omissions: [span(0, 3)] }, subject).ok,
    ).toBe(false);
  });

  it('approved_with_omissions: ≥ 1 part, ⛔ reasonCode', () => {
    expect(validateMemorialDecision(awo({ omissions: [span(first, firstEnd)] }), subject)).toEqual({ ok: true });
    expect(validateMemorialDecision(awo({ photoLeftOut: { reason: 'identifies_a_child' } }), subject)).toEqual({ ok: true });
    expect(validateMemorialDecision(awo({}), subject)).toEqual({ ok: false, problem: 'action_shape' });
    expect(validateMemorialDecision(awo({ omissions: [span(first, firstEnd)], reasonCode: 'against_the_law' }), subject).ok).toBe(false);
  });

  // Ordering / range cases on an ASCII body, so every offset is a grapheme boundary and only the rule under test fires.
  const ascii = { body: 'alpha beta gamma\n\ndelta epsilon', altText: null, hasPhoto: false, kinshipLength: null };
  it.each([
    ['empty', [span(3, 3)], 'span_empty'],
    ['out of range', [span(0, ascii.body.length + 1)], 'span_out_of_range'],
    ['negative', [span(-1, 2)], 'span_out_of_range'],
    ['unsorted', [span(6, 10), span(0, 5)], 'span_order'],
    ['overlapping', [span(0, 8), span(5, 10)], 'span_order'],
    ['touching', [span(0, 5), span(5, 10)], 'span_order'],
    ['across a blank line', [span(11, 23)], 'span_crosses_paragraph'],
  ] as const)('refuses %s', (_name, omissions, problem) => {
    expect(validateMemorialDecision(awo({ omissions }), ascii)).toEqual({ ok: false, problem });
  });

  it('refuses a Devanagari span across a blank line', () => {
    expect(validateMemorialDecision(awo({ omissions: [span(first, body.length)] }), subject)).toEqual({
      ok: false,
      problem: 'span_crosses_paragraph',
    });
  });

  it('refuses a whitespace-only span', () => {
    const t = 'एक  दो';
    expect(validateMemorialDecision(awo({ omissions: [span(2, 4)] }), { body: t, altText: null, hasPhoto: false, kinshipLength: null })).toEqual({
      ok: false,
      problem: 'span_blank',
    });
  });

  it('refuses a boundary inside a surrogate pair', () => {
    const t = 'a😀b c';
    expect(validateMemorialDecision(awo({ omissions: [span(0, 2)] }), { body: t, altText: null, hasPhoto: false, kinshipLength: null })).toEqual({
      ok: false,
      problem: 'span_not_grapheme_boundary',
    });
  });

  it('refuses a boundary inside a Devanagari conjunct', () => {
    const t = 'क्ष और';
    // `क्ष` is ONE grapheme cluster of three code units — cutting after `क्` splits it.
    expect(validateMemorialDecision(awo({ omissions: [span(0, 2)] }), { body: t, altText: null, hasPhoto: false, kinshipLength: null })).toEqual({
      ok: false,
      problem: 'span_not_grapheme_boundary',
    });
  });

  it('refuses a boundary inside a ZWJ sequence', () => {
    const family = '👨\u200d👩\u200d👧';
    const t = `${family} x`;
    expect(validateMemorialDecision(awo({ omissions: [span(0, 2)] }), { body: t, altText: null, hasPhoto: false, kinshipLength: null })).toEqual({
      ok: false,
      problem: 'span_not_grapheme_boundary',
    });
    expect(validateMemorialDecision(awo({ omissions: [span(0, family.length)] }), { body: t, altText: null, hasPhoto: false, kinshipLength: null })).toEqual({
      ok: true,
    });
  });

  it('refuses leaving ⛔ visible character of the body (that is not_approved)', () => {
    const t = 'केवल यह';
    expect(validateMemorialDecision(awo({ omissions: [span(0, t.length)] }), { body: t, altText: null, hasPhoto: false, kinshipLength: null })).toEqual({
      ok: false,
      problem: 'nothing_left',
    });
  });

  it('the photo rules', () => {
    const noPhoto = { body, altText: null, hasPhoto: false, kinshipLength: null };
    expect(validateMemorialDecision(awo({ photoLeftOut: { reason: 'identifies_a_child' } }), noPhoto)).toEqual({
      ok: false,
      problem: 'photo_left_out_without_photo',
    });
    expect(
      validateMemorialDecision(awo({ photoLeftOut: { reason: 'identifies_a_child' }, omissions: [span(0, 3, 'altText')] }), subject),
    ).toEqual({ ok: false, problem: 'alt_text_span_with_photo_left_out' });
    expect(validateMemorialDecision(awo({ omissions: [span(0, 3, 'altText')] }), noPhoto)).toEqual({
      ok: false,
      problem: 'alt_text_span_without_alt_text',
    });
    expect(validateMemorialDecision(awo({ omissions: [span(0, 3, 'altText')] }), subject)).toEqual({ ok: true });
  });

  describe('alt_text_nothing_left (R12 — the photo and its description go together)', () => {
    const alt = subject.altText;
    const whole = span(0, alt.length, 'altText');

    it('leaving out ALL of the alt text while the photo stays is refused — the cure is photoLeftOut', () => {
      expect(validateMemorialDecision(awo({ omissions: [whole] }), subject)).toEqual({ ok: false, problem: 'alt_text_nothing_left' });
      // Several spans that together leave only whitespace are the same thing.
      const two = { body, altText: 'एक दो', hasPhoto: true, kinshipLength: null };
      expect(validateMemorialDecision(awo({ omissions: [span(0, 2, 'altText'), span(3, 5, 'altText')] }), two)).toEqual({
        ok: false,
        problem: 'alt_text_nothing_left',
      });
      // The cure the problem names.
      expect(validateMemorialDecision(awo({ photoLeftOut: { reason: 'identifies_a_child' } }), subject)).toEqual({ ok: true });
    });

    it('the whole alt text WITH photoLeftOut is already refused by the alt-text-with-photo-left-out rule', () => {
      expect(validateMemorialDecision(awo({ omissions: [whole], photoLeftOut: { reason: 'identifies_a_child' } }), subject)).toEqual({
        ok: false,
        problem: 'alt_text_span_with_photo_left_out',
      });
    });

    it('a PARTIAL alt-text omission is fine, alone or beside a body omission', () => {
      const at = alt.indexOf('की');
      expect(validateMemorialDecision(awo({ omissions: [span(at, at + 2, 'altText')] }), subject)).toEqual({ ok: true });
      expect(validateMemorialDecision(awo({ omissions: [span(first, firstEnd), span(at, at + 2, 'altText')] }), subject)).toEqual({ ok: true });
    });

    it('a body that is emptied is still reported as nothing_left (the body is checked first)', () => {
      const t = 'केवल यह';
      expect(
        validateMemorialDecision(awo({ omissions: [span(0, t.length), span(0, alt.length, 'altText')] }), { body: t, altText: alt, hasPhoto: true, kinshipLength: null }),
      ).toEqual({ ok: false, problem: 'nothing_left' });
    });
  });
});

describe('the review list and detail wire shapes (R9 / R14)', () => {
  it('the list query bounds `offset` (0 – 10000) and `limit`; both arrive as strings off the URL', () => {
    expect(MemorialReviewListQuery.safeParse({ view: 'decided', limit: '50', offset: '100' }).success).toBe(true);
    expect(MemorialReviewListQuery.safeParse({ offset: '0' }).success).toBe(true);
    expect(MemorialReviewListQuery.safeParse({ offset: '10000' }).success).toBe(true);
    for (const bad of ['-1', '10001', '1.5', 'abc']) {
      expect(MemorialReviewListQuery.safeParse({ offset: bad }).success, `offset=${bad}`).toBe(false);
    }
    expect(MemorialReviewListQuery.safeParse({ limit: '201' }).success).toBe(false);
    expect(MemorialReviewListQuery.safeParse({ cursor: 'x' }).success).toBe(false);
  });

  it('the list response carries `hasMore` (required, strict)', () => {
    expect(MemorialReviewListResponse.safeParse({ items: [], hasMore: false }).success).toBe(true);
    expect(MemorialReviewListResponse.safeParse({ items: [] }).success).toBe(false);
    expect(MemorialReviewListResponse.safeParse({ items: [], hasMore: true, nextCursor: 'x' }).success).toBe(false);
  });

  it('each list item carries `decidedAt` — REQUIRED, an ISO date-time or `null` (review V12)', () => {
    const item = { submissionId: 's', deceasedName: null, sentAt: '2026-10-20T10:00:00.000Z', memorialState: 'approved' };
    const parse = (decidedAt?: unknown) =>
      MemorialReviewListResponse.safeParse({ items: [decidedAt === undefined ? item : { ...item, decidedAt }], hasMore: false }).success;
    expect(parse('2026-10-24T09:30:00.000Z')).toBe(true);
    expect(parse(null)).toBe(true); // the pending view
    expect(parse()).toBe(false); // ⛔ omitted
    for (const bad of ['', 'yesterday', '2026-10-24', 0]) expect(parse(bad), String(bad)).toBe(false);
  });

  it('the detail response names the withdraw target, and the member view says whether an earlier approval stands (strict)', () => {
    expect(Object.keys(MemorialReviewDetailResponse.shape)).toEqual(
      expect.arrayContaining(['canDecide', 'canWithdrawApproval', 'withdrawApprovalTargetId']),
    );
    expect(Object.keys(MemorialMemberView.shape)).toEqual(expect.arrayContaining(['earlierApprovalWithdrawn', 'earlierApprovalStands']));
    expect(MemorialMemberView.shape.earlierApprovalStands.safeParse(true).success).toBe(true);
    expect(MemorialMemberView.shape.earlierApprovalStands.safeParse(null).success).toBe(false);
    expect(MemorialReviewDetailResponse.shape.withdrawApprovalTargetId.safeParse(null).success).toBe(true);
    expect(MemorialReviewDetailResponse.shape.withdrawApprovalTargetId.safeParse('0b1c1d34-0000-4000-8000-000000000001').success).toBe(true);
    expect(MemorialReviewDetailResponse.shape.withdrawApprovalTargetId.safeParse(undefined).success).toBe(false);
  });
});

describe('the no-edit invariant is ABSENCE (AC6)', () => {
  it.each(['body', 'text', 'narrative'])('a decision posting `%s` is refused by the strict schema', (field) => {
    expect(MemorialReviewDecisionInput.safeParse({ action: 'approved', [field]: 'rewritten words' }).success).toBe(false);
  });

  it('withdraw-approval needs one of the four reasons, strictly', () => {
    expect(MemorialWithdrawApprovalInput.safeParse({ reasonCode: 'identifies_a_child' }).success).toBe(true);
    expect(MemorialWithdrawApprovalInput.safeParse({}).success).toBe(false);
    expect(MemorialWithdrawApprovalInput.safeParse({ reasonCode: 'family_asked' }).success).toBe(false);
  });

  it('the member view has ⛔ internal note and ⛔ photo key, and ⛔ wire key named `status` (AC10, MA8, MA10)', () => {
    const keys = Object.keys(MemorialMemberView.shape);
    for (const forbidden of ['internalNote', 'internalNoteCiphertext', 'photoObjectKey', 'status']) {
      expect(keys).not.toContain(forbidden);
    }
    expect(keys).toContain('memorialState');
  });
});

describe('the latest Send key — on the MEMBER view only (review Z2, 0183)', () => {
  it('the member view carries `idempotencyKey`: a string or null, ⛔ omitted', () => {
    const shape = MemorialMemberView.shape.idempotencyKey;
    expect(shape.safeParse('k_0123-abc').success).toBe(true);
    expect(shape.safeParse(null).success).toBe(true); // nothing sent, or a pre-0183 row
    expect(shape.safeParse(undefined).success).toBe(false);
  });

  it('⛔ no review (admin) DTO names it', () => {
    const reviewKeys = [
      ...Object.keys(MemorialReviewDetailResponse.shape),
      ...Object.keys(MemorialReviewDetailResponse.shape.chain.element.shape),
      ...Object.keys(MemorialReviewListResponse.shape.items.element.shape),
    ];
    expect(reviewKeys).toContain('submissionId'); // the walk reached the shapes
    expect(reviewKeys).not.toContain('idempotencyKey');
  });
});

describe('the take-down request body names the version the operator was looking at (Story 11b.4a, review R1)', () => {
  const body = {
    calledBack: true,
    firstContactAt: '2026-10-27T10:00:00.000Z',
    shownSubmissionId: '3f0c9b52-6d1e-4a4b-9c55-0a1b2c3d4e5f',
  };

  it('accepts the full body', () => {
    expect(MemorialTakedownRequestInput.safeParse(body).success).toBe(true);
  });

  it.each([
    ['no shownSubmissionId', { calledBack: true, firstContactAt: body.firstContactAt }],
    ['a shownSubmissionId that is not a UUID', { ...body, shownSubmissionId: 'the-one-on-the-page' }],
    ['calledBack: false', { ...body, calledBack: false }],
    ['a note (⛔ no reason is ever input)', { ...body, note: 'why they asked' }],
  ])('refuses %s', (_name, candidate) => {
    expect(MemorialTakedownRequestInput.safeParse(candidate).success).toBe(false);
  });
});
