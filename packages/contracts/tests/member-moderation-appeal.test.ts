// Moderation-appeal contracts — Story 10.22 (AC4, AC5, AC7). Niyamavali §8.8.
//
// Three jobs:
//   1. The DOMAIN↔CONTRACTS SYNC-GUARD. The three wire tuples are re-declared in contracts, never
//      imported from `@twt/domain`, for the RN Metro bundle boundary
//      ([[project_contracts_domain_bundle_boundary]] — a domain import leaks `pg` into the mobile
//      bundle). This file is TEST-ONLY, so its `@twt/domain` import never ships, and it is what makes
//      the re-declaration safe: a token renamed on one side and not the other fails here.
//   2. DTO shape assertions — above all, that neither Tier-1 field is ever OUTBOUND on a list shape.
//   3. The two shared-constant pins. Both have SILENT failure modes, which is the whole reason they
//      are constants rather than literals.

import { member } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  APPEAL_FILED_VIA,
  APPEAL_OUTCOMES,
  APPEAL_STATUSES,
  DecideModerationAppealRequest,
  FileModerationAppealOffPortalRequest,
  FileModerationAppealRequest,
  MODERATION_APPEAL_HELPDESK_CATEGORY,
  MODERATION_APPEAL_STEP_UP_CONTEXT,
  MODERATION_APPEAL_SUBCATEGORY,
  ModerationAppealDetailResponse,
  ModerationAppealDto,
  ModerationAppealsListResponse,
} from '../src/member-moderation/index.js';
import { DATA_RIGHTS_STEP_UP_CONTEXT } from '../src/member-data-rights/member-data-rights.js';

describe('domain ↔ contracts sync-guard (TEST-ONLY cross-import)', () => {
  it('APPEAL_FILED_VIA matches the domain tuple, in order', () => {
    expect(APPEAL_FILED_VIA).toEqual(member.moderation.APPEAL_FILED_VIA);
  });

  it('APPEAL_STATUSES matches the domain tuple, in order', () => {
    expect(APPEAL_STATUSES).toEqual(member.moderation.APPEAL_STATUSES);
  });

  it('APPEAL_OUTCOMES matches the domain tuple, in order', () => {
    expect(APPEAL_OUTCOMES).toEqual(member.moderation.APPEAL_OUTCOMES);
  });

  it('⛔ there is no third `varied` outcome on either side', () => {
    expect(APPEAL_OUTCOMES).not.toContain('varied');
    expect(member.moderation.APPEAL_OUTCOMES).not.toContain('varied');
  });
});

describe('the two shared constants — both have SILENT failure modes', () => {
  it('the step-up context is DISTINCT from the data-rights one', () => {
    // ⛔ If these ever collide, an elevation obtained to execute a DPDPA right would also authorise
    // determining a member's appeal against their own sanction. `requireStepUp` compares a bare
    // string by equality with no registry, so nothing else would notice.
    expect(MODERATION_APPEAL_STEP_UP_CONTEXT).not.toBe(DATA_RIGHTS_STEP_UP_CONTEXT);
    expect(MODERATION_APPEAL_STEP_UP_CONTEXT).toBe('member_moderation_appeal');
  });

  it('the off-portal arm rides an EXISTING helpdesk category, never a new one', () => {
    // ⛔ A new `HELPDESK_CATEGORIES` member is guaranteed-UNROUTED: every per-Pariwar override is a
    // version-pinned document and a new category resolves under NONE of them
    // ([[project_helpdesk_default_policy_version_trap]]). `complaint` is in the v1 default policy
    // with `sub_category: null`, so it matches any subcategory and routing stays green.
    expect(MODERATION_APPEAL_HELPDESK_CATEGORY).toBe('complaint');
    expect(MODERATION_APPEAL_SUBCATEGORY).toBe('moderation-appeal');
    expect(MODERATION_APPEAL_SUBCATEGORY.length).toBeLessThanOrEqual(64);
  });
});

describe('the member filing request — the SESSION is the member', () => {
  const valid = {
    moderation_action_id: '22222222-2222-4222-8222-222222222222',
    grounds: 'I was not given an opportunity to explain the missed contributions.',
  };

  it('accepts a well-formed filing', () => {
    expect(FileModerationAppealRequest.safeParse(valid).success).toBe(true);
  });

  it('⛔ REJECTS a caller-supplied member_id — `.strict()` is the enforcement', () => {
    // A member-supplied member id on a member route is a cross-member write waiting to happen. The
    // member is the session; there is deliberately no field for this.
    expect(
      FileModerationAppealRequest.safeParse({
        ...valid,
        member_id: '33333333-3333-4333-8333-333333333333',
      }).success,
    ).toBe(false);
  });

  it('⛔ REJECTS empty or trivially short grounds — §8.8 promises a hearing on stated grounds', () => {
    expect(FileModerationAppealRequest.safeParse({ ...valid, grounds: '' }).success).toBe(false);
    expect(FileModerationAppealRequest.safeParse({ ...valid, grounds: 'no' }).success).toBe(false);
  });
});

describe('the off-portal filing request — the ticket is REQUIRED', () => {
  const valid = {
    member_id: '33333333-3333-4333-8333-333333333333',
    moderation_action_id: '22222222-2222-4222-8222-222222222222',
    helpdesk_ticket_id: '44444444-4444-4444-8444-444444444444',
    grounds: 'The member called the helpline to contest the termination recorded against them.',
  };

  it('accepts a well-formed off-portal filing', () => {
    expect(FileModerationAppealOffPortalRequest.safeParse(valid).success).toBe(true);
  });

  it('⛔ REJECTS a helpline filing with no ticket — the ruling puts the process ON a ticket', () => {
    const withoutTicket: Record<string, unknown> = { ...valid };
    delete withoutTicket.helpdesk_ticket_id;
    expect(FileModerationAppealOffPortalRequest.safeParse(withoutTicket).success).toBe(false);
  });

  it('⛔ REJECTS a caller-supplied filed_via — the SURFACE decides it, not the caller', () => {
    expect(
      FileModerationAppealOffPortalRequest.safeParse({ ...valid, filed_via: 'portal' }).success,
    ).toBe(false);
  });
});

describe('the determination request — attribution is server-side', () => {
  const valid = {
    outcome: 'allowed',
    reasoned_outcome: 'The dwell had not elapsed and the escalation justification restated itself.',
  };

  it('accepts a well-formed determination', () => {
    expect(DecideModerationAppealRequest.safeParse(valid).success).toBe(true);
  });

  it('⛔ REJECTS `varied` — §8.8 has exactly two outcomes', () => {
    expect(DecideModerationAppealRequest.safeParse({ ...valid, outcome: 'varied' }).success).toBe(
      false,
    );
  });

  it('⛔ REJECTS a client-supplied decided_by — a client-supplied attribution is not an attribution', () => {
    expect(
      DecideModerationAppealRequest.safeParse({ ...valid, decided_by: 'A. Trustee' }).success,
    ).toBe(false);
  });

  it('⛔ REJECTS a missing reasoned outcome — §8.8 requires it and so does the DB CHECK', () => {
    expect(DecideModerationAppealRequest.safeParse({ outcome: 'upheld' }).success).toBe(false);
    expect(
      DecideModerationAppealRequest.safeParse({ outcome: 'upheld', reasoned_outcome: '' }).success,
    ).toBe(false);
  });
});

describe('⭐ the Tier-1 fields are OUTBOUND on exactly ONE shape', () => {
  const dto = {
    appeal_id: '11111111-1111-4111-8111-111111111111',
    member_id: '33333333-3333-4333-8333-333333333333',
    moderation_action_id: '22222222-2222-4222-8222-222222222222',
    filed_via: 'portal',
    helpdesk_ticket_id: null,
    filed_at: '2026-08-15T00:00:00.000Z',
    status: 'open',
    outcome: null,
    decided_by_display: null,
    decided_at: null,
  };

  it('the list DTO carries NEITHER grounds NOR reasoned_outcome', () => {
    const parsed = ModerationAppealDto.parse(dto);
    expect(parsed).not.toHaveProperty('grounds');
    expect(parsed).not.toHaveProperty('reasoned_outcome');
  });

  it('⛔ the list DTO REJECTS a grounds field outright', () => {
    expect(ModerationAppealDto.safeParse({ ...dto, grounds: 'text' }).success).toBe(false);
    expect(ModerationAppealDto.safeParse({ ...dto, reasoned_outcome: 'text' }).success).toBe(false);
  });

  it('the LIST response is built from that same DTO, so neither field can appear there either', () => {
    const r = ModerationAppealsListResponse.safeParse({ items: [{ ...dto, grounds: 'text' }] });
    expect(r.success).toBe(false);
  });

  it('the single-item DETAIL response is the ONE shape that carries both', () => {
    const r = ModerationAppealDetailResponse.safeParse({
      appeal: dto,
      grounds: 'I was not given an opportunity to explain.',
      reasoned_outcome: null,
    });
    expect(r.success).toBe(true);
  });

  it('both detail fields are NULLABLE — a corrupt/rotated envelope fail-softs, it does not 500', () => {
    const r = ModerationAppealDetailResponse.safeParse({
      appeal: dto,
      grounds: null,
      reasoned_outcome: null,
    });
    expect(r.success).toBe(true);
  });
});
