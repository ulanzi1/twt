// Story 6.23b (Task 6; AC3–AC7, AC10) — the LATER approvers' wire. ⛔ No contracts test pinned these request shapes
// before (the 6.13 / 6.14 / 6.19c tests cover `safeParse` and `.strict()` smuggling only): the new optional
// `warning_reason_code` and its `superRefine` rules, D27's paired `{ warning_reason_code, note }`, the shared
// `ApprovalWarningsSummary` block on every read surface (snake_case — RD4; 6.23a's option DTO stays camelCase), R9's
// per-vote `covers_current_warnings` (RD11), the queue item's nullable block (RD20) and the correction queue's
// late-warning fields (EA10).

import { describe, expect, it } from 'vitest';

import {
  ApprovalWarningsSummary,
  ClaimsUnderCorrectionResponse,
  ClaimUnderCorrectionItem,
  CycleFreezeDecisionRequest,
  CycleFreezePendingItem,
  CycleFreezePendingResponse,
  EscalatedClosureDecisionRequest,
  EscalatedClosureDetailResponse,
  NoCorrectionNeededApproveRequest,
  PariwarClosureQueueItemDto,
  R9PanelResponse,
  R9PanelVote,
  R9VoteRequest,
} from '../src/index.js';

const CLAIM = '0b8f0c3e-6a4f-4b7a-9d2a-1c3e5f7a9b0d';
const MEMBER = '1c9a1d4f-7b5a-4c8b-8e3b-2d4f6a8b0c1e';
const ok = (r: { success: boolean; error?: { issues: unknown } }) => expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
const failsAt = (r: { success: boolean; error?: { issues: { path: (string | number)[] }[] } }, path: string) => {
  expect(r.success).toBe(false);
  expect(r.error!.issues.map((i) => i.path.join('.'))).toContain(path);
};

const SUMMARY = {
  available: true,
  kinds: ['post_death_version'],
  post_death: 'evaluated',
  waiting_for_district_admin: false,
  own_reason_excluded: false,
} as const;

describe('ApprovalWarningsSummary (EA7) — snake_case, `.strict()`', () => {
  it('parses the full block and the unavailable one; refuses a camelCase field and an unknown kind', () => {
    ok(ApprovalWarningsSummary.safeParse(SUMMARY));
    ok(ApprovalWarningsSummary.safeParse({ ...SUMMARY, available: false, kinds: [], post_death: 'awaiting_determination' }));
    expect(ApprovalWarningsSummary.safeParse({ ...SUMMARY, waitingForDistrictAdmin: false }).success).toBe(false);
    expect(ApprovalWarningsSummary.safeParse({ ...SUMMARY, kinds: ['inspection_missing'] }).success).toBe(false);
  });
});

describe('CycleFreezeDecisionRequest — `warning_reason_code` (EA3, EA4; Trap 2)', () => {
  const base = { claim_case_id: CLAIM } as const;
  it('an un-warned approve body is byte-identical to today\'s (⛔ no reason, ⛔ no rationale)', () => {
    ok(CycleFreezeDecisionRequest.safeParse({ ...base, action: 'approve' }));
  });
  it('approve / resolve-to-approved: a code + a rationale ⇒ ok; a code with ⛔ no rationale ⇒ 400 at `rationale`', () => {
    ok(CycleFreezeDecisionRequest.safeParse({ ...base, action: 'approve', warning_reason_code: 'warnings_reviewed', rationale: 'why' }));
    ok(
      CycleFreezeDecisionRequest.safeParse({
        ...base,
        action: 'resolve_escalation',
        escalation_outcome: 'approved',
        warning_reason_code: 'warnings_reviewed',
        rationale: 'why',
      }),
    );
    failsAt(CycleFreezeDecisionRequest.safeParse({ ...base, action: 'approve', warning_reason_code: 'warnings_reviewed' }), 'rationale');
    failsAt(CycleFreezeDecisionRequest.safeParse({ ...base, action: 'approve', warning_reason_code: 'warnings_reviewed', rationale: '   ' }), 'rationale');
  });
  it('Trap 3 — `concealment_override` AND a warning reason ride together (ONE rationale)', () => {
    ok(
      CycleFreezeDecisionRequest.safeParse({
        ...base,
        action: 'approve',
        reason_code: 'concealment_override',
        warning_reason_code: 'warnings_reviewed',
        rationale: 'why',
      }),
    );
  });
  it('⛔ on a deny, a route to R9, a return or a denying resolution ⇒ 400 at `warning_reason_code`', () => {
    const code = { warning_reason_code: 'warnings_reviewed', rationale: 'why' };
    failsAt(CycleFreezeDecisionRequest.safeParse({ ...base, ...code, action: 'deny', reason_code: 'other' }), 'warning_reason_code');
    failsAt(CycleFreezeDecisionRequest.safeParse({ ...base, ...code, action: 'route_to_r9', reason_code: 'r9_special_case' }), 'warning_reason_code');
    failsAt(
      CycleFreezeDecisionRequest.safeParse({ ...base, ...code, action: 'return_to_district_admin', reason_code: 'other', must_act: 'family' }),
      'warning_reason_code',
    );
    failsAt(
      CycleFreezeDecisionRequest.safeParse({ ...base, ...code, action: 'resolve_escalation', escalation_outcome: 'denied', reason_code: 'other' }),
      'warning_reason_code',
    );
  });
});

describe('R9VoteRequest — its FIRST `superRefine` (EA5)', () => {
  it('approve + a code ⇒ ok; ⛔ code ⇒ ok; deny + a code ⇒ 400', () => {
    ok(R9VoteRequest.safeParse({ vote: 'approve', rationale: 'why', warning_reason_code: 'warnings_reviewed' }));
    ok(R9VoteRequest.safeParse({ vote: 'deny', rationale: 'why' }));
    failsAt(R9VoteRequest.safeParse({ vote: 'deny', rationale: 'why', warning_reason_code: 'warnings_reviewed' }), 'warning_reason_code');
  });
});

describe('EscalatedClosureDecisionRequest — approve only (EA6a)', () => {
  it('approve + a code ⇒ ok; close / refuse + a code ⇒ 400', () => {
    ok(EscalatedClosureDecisionRequest.safeParse({ decision: 'approve', reason: 'details_verified', note: 'n', warning_reason_code: 'warnings_reviewed' }));
    failsAt(
      EscalatedClosureDecisionRequest.safeParse({ decision: 'close', reason: 'family_silent_after_reached', note: 'n', warning_reason_code: 'warnings_reviewed' }),
      'warning_reason_code',
    );
    failsAt(
      EscalatedClosureDecisionRequest.safeParse({
        decision: 'refuse',
        reason: 'other',
        note: 'n',
        refusal_reason_code: 'documents_insufficient',
        warning_reason_code: 'warnings_reviewed',
      }),
      'warning_reason_code',
    );
  });
});

describe('NoCorrectionNeededApproveRequest — `note` ⇔ `warning_reason_code`, PAIRED (EA6b; Trap 4)', () => {
  it('`{}` (un-warned) and the pair ⇒ ok', () => {
    ok(NoCorrectionNeededApproveRequest.safeParse({}));
    ok(NoCorrectionNeededApproveRequest.safeParse({ warning_reason_code: 'warnings_reviewed', note: 'why' }));
  });
  it('one without the other, or a blank note ⇒ 400; a smuggled field ⇒ 400', () => {
    failsAt(NoCorrectionNeededApproveRequest.safeParse({ note: 'why' }), 'warning_reason_code');
    failsAt(NoCorrectionNeededApproveRequest.safeParse({ warning_reason_code: 'warnings_reviewed' }), 'note');
    // Code review 2026-10-06 (P11): asserts the failure PATH, not just `success: false` — a blank (but present)
    // note satisfies the pairing `superRefine`'s own presence check, so this must come from `RequiredNote`'s own
    // blank-string refine at `note`, not from the pairing logic (deleting the pairing rule would still fail here).
    failsAt(NoCorrectionNeededApproveRequest.safeParse({ warning_reason_code: 'warnings_reviewed', note: '  ' }), 'note');
    expect(NoCorrectionNeededApproveRequest.safeParse({ keep_note: 'x' }).success).toBe(false);
  });
});

describe('the read DTOs carry the block (EA7, RD11, RD20) — every field REQUIRED (Trap 14)', () => {
  const pending = {
    claim_case_id: CLAIM,
    deceased_member_id: MEMBER,
    current_state: 'verifier_approved',
    verifier_decision_id: null,
    verifier_actor_display: null,
    verifier_reason_code: null,
    verifier_rationale: null,
    signals_summary: '',
    concealment_flags: [],
    routed_to_r9: false,
    under_correction: false,
    name_difference_reasons: [],
    approval_name_highlight: null,
  };
  it('CycleFreezePendingItem requires `approval_warnings`; the response carries `reason_options` ONCE', () => {
    expect(CycleFreezePendingItem.safeParse(pending).success).toBe(false);
    ok(CycleFreezePendingItem.safeParse({ ...pending, approval_warnings: SUMMARY }));
    const response = { pariwar_id: CLAIM, ready_to_freeze: [], escalated: [], voted_pending_commit: [] };
    expect(CycleFreezePendingResponse.safeParse(response).success).toBe(false);
    ok(
      CycleFreezePendingResponse.safeParse({
        ...response,
        reason_options: [
          { code: 'warnings_reviewed', reasonId: null, label: 'L', whenToUse: 'W', addedByDisplay: null, addedAt: null, replacesLabel: null },
        ],
      }),
    );
  });
  it('R9PanelVote requires `covers_current_warnings` (boolean | null)', () => {
    const vote = { vote_id: CLAIM, voter_actor_id: 'v', voter_display: 'V', vote: 'approve', cast_at: 'x', clause_version_id: MEMBER, rationale: 'r' };
    expect(R9PanelVote.safeParse(vote).success).toBe(false);
    ok(R9PanelVote.safeParse({ ...vote, covers_current_warnings: null }));
    ok(R9PanelVote.safeParse({ ...vote, covers_current_warnings: false }));
  });
  it('RD20 — PariwarClosureQueueItemDto: `approval_warnings` is REQUIRED and nullable', () => {
    const item = {
      kind: 'closure_request',
      claim_case_id: CLAIM,
      deceased_member_id: MEMBER,
      short_reference: '0B8F0C3E',
      at: 'x',
      by: 'y',
      note: { state: 'unreadable' },
      family_run_day0: null,
      checked_after_record: null,
      held: false,
    };
    expect(PariwarClosureQueueItemDto.safeParse(item).success).toBe(false);
    ok(PariwarClosureQueueItemDto.safeParse({ ...item, approval_warnings: null }));
    ok(PariwarClosureQueueItemDto.safeParse({ ...item, kind: 'no_correction_needed', approval_warnings: SUMMARY }));
  });
  it('EA10 — the correction queue item\'s two late-warning fields and the response\'s `late_warnings_unavailable`', () => {
    // `.innerType()` — the `superRefine` added below wraps the object in a `ZodEffects`, which has no `.shape`.
    const shape = ClaimUnderCorrectionItem.innerType().shape;
    expect(shape.late_warning_awaiting_reason.safeParse(true).success).toBe(true);
    expect(shape.late_warning_uncovered_count.safeParse(2).success).toBe(true);
    expect(shape.late_warning_uncovered_count.safeParse(-1).success).toBe(false);
    expect(ClaimsUnderCorrectionResponse.safeParse({ pariwar_id: CLAIM, items: [] }).success).toBe(false);
    ok(ClaimsUnderCorrectionResponse.safeParse({ pariwar_id: CLAIM, items: [], late_warnings_unavailable: false }));
    // Code review 2026-10-06 (P19): `true` — never read as "none waiting" — is parse-tested too, not just `false`.
    ok(ClaimsUnderCorrectionResponse.safeParse({ pariwar_id: CLAIM, items: [], late_warnings_unavailable: true }));
  });

  // Code review 2026-10-06 (P48): the two late-warning fields as part of the REAL, full item — not just their own
  // schemas in isolation (`.shape.X.safeParse`, above) — so a break in how they interact with the item's many
  // pre-existing required fields, or with the new cross-field pairing below, is actually caught here.
  it('P48 — ClaimUnderCorrectionItem end-to-end, and its cross-field pairing (a nonzero count implies the flag)', () => {
    const fullItem = {
      claim_case_id: CLAIM,
      deceased_member_id: MEMBER,
      claim_state: 'verifier_approved',
      claim_filed_at: '2026-09-01T00:00:00Z',
      returned_at: null,
      returned_by_actor_display: null,
      return_note: null,
      sent_back_by_check: false,
      accounts_complete: true,
      short_reference: '0B8F0C3E',
      correction_chase: {
        return_decision_id: null,
        must_act: null,
        must_act_set_by: null,
        must_act_set_at: null,
        run: null,
        cannot_remind: null,
        claimant_unresolved: false,
        awaiting_check: false,
        people: [],
        escalated: false,
      },
      correction_closure: {
        state: null,
        origin: null,
        requested_at: null,
        requested_by: null,
        blocker: null,
        not_reached: null,
        family_run_day: null,
      },
      late_warning_awaiting_reason: false,
      late_warning_uncovered_count: 0,
    };
    ok(ClaimUnderCorrectionItem.safeParse(fullItem));
    ok(ClaimUnderCorrectionItem.safeParse({ ...fullItem, late_warning_awaiting_reason: true, late_warning_uncovered_count: 2 }));
    // The "⛔ never dropped on a fault" shape (decision-needed #1): the flag true, the count unknown (0).
    ok(ClaimUnderCorrectionItem.safeParse({ ...fullItem, late_warning_awaiting_reason: true, late_warning_uncovered_count: 0 }));
    // A nonzero count with the flag false is incoherent and must fail.
    failsAt(
      ClaimUnderCorrectionItem.safeParse({ ...fullItem, late_warning_awaiting_reason: false, late_warning_uncovered_count: 2 }),
      'late_warning_awaiting_reason',
    );
  });

  // Code review 2026-10-06 (P18): `true` — an approve vote whose rationale covers every current warning — is the
  // central reason this field exists, yet only `null`/`false` were previously parse-tested.
  it('P18 — R9PanelVote.covers_current_warnings: true parses (the central "it covers everything" case)', () => {
    const vote = { vote_id: CLAIM, voter_actor_id: 'v', voter_display: 'V', vote: 'approve', cast_at: 'x', clause_version_id: MEMBER, rationale: 'r' };
    ok(R9PanelVote.safeParse({ ...vote, covers_current_warnings: true }));
    // RD11 — `null` on a deny vote; `true`/`false` on a deny vote is now refused (code review 2026-10-06).
    failsAt(R9PanelVote.safeParse({ ...vote, vote: 'deny', covers_current_warnings: true }), 'covers_current_warnings');
  });

  // Code review 2026-10-06 (P17): `R9PanelResponse` and `EscalatedClosureDetailResponse` each gained
  // `approval_warnings` + `reason_options` as required fields with zero test coverage in this diff.
  it('P17 — R9PanelResponse carries `approval_warnings` + `reason_options`, both required', () => {
    const base = {
      claim_case_id: CLAIM,
      deceased_member_id: MEMBER,
      current_state: 'state_trustee_frozen',
      session: null,
      votes: [],
      tally: null,
      name_difference_reasons: [],
    };
    expect(R9PanelResponse.safeParse(base).success).toBe(false);
    ok(R9PanelResponse.safeParse({ ...base, approval_warnings: SUMMARY, reason_options: [] }));
  });

  it('P17 — EscalatedClosureDetailResponse requires `approval_warnings` + `reason_options` too', () => {
    const shape = EscalatedClosureDetailResponse.shape;
    expect(shape.approval_warnings.safeParse(SUMMARY).success).toBe(true);
    expect(shape.approval_warnings.safeParse(undefined).success).toBe(false);
    expect(shape.reason_options.safeParse([]).success).toBe(true);
    expect(shape.reason_options.safeParse(undefined).success).toBe(false);
  });
});
