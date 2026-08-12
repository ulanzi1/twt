// Member-moderation contracts — Story 10.10 (Task 7; AC3, AC10).
//
// Two jobs:
//   1. The DOMAIN↔CONTRACTS SYNC-GUARD. The wire tuples are re-declared in contracts (never
//      imported from @twt/domain) for the RN Metro bundle boundary
//      ([[project_contracts_domain_bundle_boundary]] — a domain import leaks `pg` into the mobile
//      bundle). This file is TEST-ONLY, so its `@twt/domain` import never ships, and it is what
//      makes the re-declaration safe: a code renamed on one side and not the other fails here.
//   2. DTO shape assertions — above all, that `rationale` is inbound-only.

import { member } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  ALL_REASON_CODES,
  MODERATION_ACTIONS,
  MODERATION_REASON_CODES,
  MODERATION_STATUSES,
  ModerateMemberRequest,
  ModerationActionResponse,
  ModerationHistoryResponse,
  ModeratedMembersListResponse,
  RESTORE_REASON_CODES,
} from '../src/member-moderation/index.js';

describe('domain ↔ contracts sync-guard (TEST-ONLY cross-import)', () => {
  it('MODERATION_ACTIONS matches the domain tuple, in order', () => {
    expect(MODERATION_ACTIONS).toEqual(member.moderation.MODERATION_ACTIONS);
  });

  it('MODERATION_STATUSES matches the domain tuple, in order', () => {
    expect(MODERATION_STATUSES).toEqual(member.moderation.MODERATION_STATUSES);
  });

  it('MODERATION_REASON_CODES matches the domain registry family, in order', () => {
    expect(MODERATION_REASON_CODES).toEqual(member.moderation.MODERATION_REASON_CODES);
  });

  it('RESTORE_REASON_CODES matches the domain registry family, in order', () => {
    expect(RESTORE_REASON_CODES).toEqual(member.moderation.RESTORE_REASON_CODES);
  });

  it('ALL_REASON_CODES covers the full domain registry with no extras', () => {
    expect([...ALL_REASON_CODES].sort()).toEqual([...member.moderation.ALL_REASON_CODES].sort());
    expect(ALL_REASON_CODES.length).toEqual(Object.keys(member.moderation.REASON_CODE_REGISTRY).length);
  });
});

describe('ModerateMemberRequest', () => {
  it('accepts a code + rationale', () => {
    const parsed = ModerateMemberRequest.parse({
      reason_code: 'r14-forgery',
      rationale: '  Documents confirmed forged by the verifier panel.  ',
    });
    // `.trim()` runs before the min(1) check — the stored plaintext is the trimmed form.
    expect(parsed.rationale).toBe('Documents confirmed forged by the verifier panel.');
  });

  it('REJECTS a missing rationale (AC3 — required on EVERY action, not only "other")', () => {
    expect(ModerateMemberRequest.safeParse({ reason_code: 'r14-forgery' }).success).toBe(false);
  });

  it('REJECTS a whitespace-only rationale', () => {
    expect(
      ModerateMemberRequest.safeParse({ reason_code: 'r14-forgery', rationale: '   \n\t ' }).success,
    ).toBe(false);
  });

  it('REJECTS an undeclared reason code', () => {
    expect(
      ModerateMemberRequest.safeParse({ reason_code: 'made-up', rationale: 'x' }).success,
    ).toBe(false);
  });

  it('is .strict() — it does not carry the action (the ROUTE does)', () => {
    // The action must not be forgeable in the body: the step-up action context is per-route, so a
    // body-carried action could disagree with the elevation that was actually checked.
    expect(
      ModerateMemberRequest.safeParse({
        reason_code: 'r14-forgery',
        rationale: 'x',
        action: 'terminate',
      }).success,
    ).toBe(false);
  });

  it('ACCEPTS a restore code at the schema level — the appliesTo 422 is a SERVER check', () => {
    // Deliberate: a wide union here means a mismatched code produces one explanatory 422 the console
    // can render, not a generic schema 400 that cannot say WHY the code was wrong for that action.
    expect(
      ModerateMemberRequest.safeParse({ reason_code: 'moderation-error', rationale: 'x' }).success,
    ).toBe(true);
  });
});

describe('response DTOs — the rationale never leaves the database', () => {
  const ACTION = {
    moderation_action_id: '11111111-1111-4111-8111-111111111111',
    member_id: '22222222-2222-4222-8222-222222222222',
    action: 'suspend',
    reason_code: 'r7-contribution-discipline',
    from_status: 'none',
    to_status: 'suspended',
    actor_display: 'A. Trustee',
    rejoin_permitted_at: null,
    acted_at: '2026-08-02T00:00:00.000Z',
  };

  it('ModerationActionResponse round-trips', () => {
    expect(ModerationActionResponse.parse(ACTION)).toEqual(ACTION);
  });

  it('ModerationActionResponse REJECTS a rationale field (.strict())', () => {
    expect(
      ModerationActionResponse.safeParse({ ...ACTION, rationale: 'leaked!' }).success,
    ).toBe(false);
  });

  it('ModerationActionResponse REJECTS a ciphertext field (.strict())', () => {
    expect(
      ModerationActionResponse.safeParse({ ...ACTION, rationale_ciphertext: 'AQID…' }).success,
    ).toBe(false);
  });

  it('ModerationHistoryResponse carries the derived standing + server-derived legal actions', () => {
    const parsed = ModerationHistoryResponse.parse({
      member_id: ACTION.member_id,
      current_status: 'suspended',
      current_reason_code: 'r7-contribution-discipline',
      since: ACTION.acted_at,
      legal_actions: ['terminate', 'restore'],
      // Story 10.20 (AC8) — ADDITIVE alongside `legal_actions`, never a filter on it.
      termination_available_at: null,
      entries: [
        {
          moderation_action_id: ACTION.moderation_action_id,
          action: 'suspend',
          reason_code: 'r7-contribution-discipline',
          actor_id: '33333333-3333-4333-8333-333333333333',
          actor_display: 'A. Trustee',
          rejoin_permitted_at: null,
          acted_at: ACTION.acted_at,
          // Story 10.20 (AC9/AC4) — the grounds behind the action + its evidence references.
          grounds: [
            {
              ground_id: '44444444-4444-4444-8444-444444444444',
              code: 'r7-contribution-discipline',
              is_primary: true,
              has_note: false,
              evidence_refs: [],
              supersedes_ground_id: null,
              superseded: false,
              added_by: '33333333-3333-4333-8333-333333333333',
              added_by_display: 'A. Trustee',
              added_at: ACTION.acted_at,
            },
          ],
          evidence_refs: [{ kind: 'complaint', ref: 'CMP-2026-0001' }],
        },
      ],
      has_more: false,
    });
    expect(parsed.legal_actions).toEqual(['terminate', 'restore']);
    expect(parsed.entries[0]).not.toHaveProperty('rationale');
    expect(parsed.has_more).toBe(false);
    // ⚠ `has_note`, never the note itself: the ground note is Tier-1 and stays decrypt-on-demand.
    expect(parsed.entries[0].grounds[0]).not.toHaveProperty('note');
    expect(parsed.entries[0].grounds[0].is_primary).toBe(true);
  });

  it('⛔ Story 10.20: `termination_available_at` is REQUIRED — its absence must not read as "go ahead"', () => {
    // Nullable, but never optional. A response that simply omitted it would be indistinguishable
    // from "the dwell has elapsed" to a console that reads the field, which is exactly the
    // disagreement between the console's buttons and the server that AC8 exists to prevent.
    const withoutIt = {
      member_id: ACTION.member_id,
      current_status: 'suspended',
      current_reason_code: 'r7-contribution-discipline',
      since: ACTION.acted_at,
      legal_actions: ['terminate', 'restore'],
      entries: [],
      has_more: false,
    };
    expect(() => ModerationHistoryResponse.parse(withoutIt)).toThrow();
  });

  it('ModerationHistoryResponse REQUIRES has_more — an audit trail cannot omit its truncation flag', () => {
    // The field is deliberately non-optional: a page that silently drops the oldest entries would
    // present a cut audit trail as the whole record, and on a contested member the oldest entry is
    // typically the ORIGINAL decision under dispute.
    const withoutFlag = {
      member_id: ACTION.member_id,
      current_status: 'none',
      current_reason_code: null,
      since: null,
      legal_actions: ['suspend'],
      termination_available_at: null,
      entries: [],
    };
    expect(() => ModerationHistoryResponse.parse(withoutFlag)).toThrow();
  });

  it('ModerationHistoryEntry REJECTS a rationale field (.strict())', () => {
    expect(
      ModerationHistoryResponse.safeParse({
        member_id: ACTION.member_id,
        current_status: 'none',
        current_reason_code: null,
        since: null,
        legal_actions: ['suspend'],
        entries: [
          {
            moderation_action_id: ACTION.moderation_action_id,
            action: 'restore',
            reason_code: 'moderation-error',
            actor_id: '33333333-3333-4333-8333-333333333333',
            actor_display: 'A. Trustee',
            rejoin_permitted_at: null,
            acted_at: ACTION.acted_at,
            rationale: 'leaked!',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('ModeratedMembersListResponse admits only moderated standings (never `none`)', () => {
    const base = {
      member_id: ACTION.member_id,
      reason_code: 'r14-forgery',
      actor_id: '33333333-3333-4333-8333-333333333333',
      actor_display: 'A. Trustee',
      since: ACTION.acted_at,
      rejoin_permitted_at: null,
    };
    expect(
      ModeratedMembersListResponse.safeParse({
        items: [{ ...base, status: 'terminated' }],
        has_more: false,
      }).success,
    ).toBe(true);
    expect(
      ModeratedMembersListResponse.safeParse({
        items: [{ ...base, status: 'none' }],
        has_more: false,
      }).success,
    ).toBe(false);
  });
});
