// RBAC scope redaction + read-access — pure unit tests (Story 4.6, Task 6; AC1, confirmed D5).
//
// The redaction matrix: member-self vs State-Trustee vs district-admin, incl. fail-closed. Proves the
// State-Trustee-only pending_concealment_flag + the concealment_review_required special flag are visible
// ONLY to a State-Trustee-scope (or global super-admin) caller — every narrower caller sees them
// redacted, and the validity_payload_hash is UNCHANGED by redaction (it is the full-payload hash).

import { AuthorizationDeniedError, rbac } from '@twt/domain';
import { CONCEALMENT_REVIEW_FLAG } from '@twt/niyamavali-engine';
import { ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { assemblePayload } from '../src/payload.js';
import { assertCanReadValidity, canSeeConcealment, redactForCaller, type ValidityCaller } from '../src/redaction.js';
import { r12Slot, r12Result } from './fixtures/eval-results.js';

const PARIWAR_A = '11111111-1111-1111-1111-111111111111';
const PARIWAR_B = '22222222-2222-2222-2222-222222222222';
const MEMBER = ids.memberId('33333333-3333-3333-3333-333333333333');
const ACTOR = '99999999-9999-9999-9999-999999999999';

// Patna ∈ Bihar (the Epic-3 geo resolver seam).
const BIHAR_TREE: rbac.GeoTreeResolver = {
  contains: (a, d) => a.dimension === 'state' && a.value === 'Bihar' && d.value === 'Patna',
};

/** A full payload carrying the State-Trustee-only fields set (pre-redaction). */
function payloadWithConcealment() {
  return assemblePayload({
    memberId: MEMBER,
    evaluatedAt: new Date('2025-06-01T00:00:00Z'),
    memberState: 'active',
    lockInStatus: { daysAtJoin: null, unlockDate: null, state: 'never-entered' },
    vyawasthaShulkStatus: { paidThrough: null, daysUntilLapse: null, inRenewalGrace: false, graceRemainingDays: null },
    medicalDisclosureFlags: {
      hasDisclosureOnRecord: true,
      declaredConditionCount: 0,
      imaListVersion: 'ima-v3',
      pendingConcealmentFlag: true,
    },
    retirementCoverage: { status: 'clause_unavailable' },
    slots: [r12Slot(r12Result({ grantedYears: 0, isRetired: false, specialFlags: [CONCEALMENT_REVIEW_FLAG] }))],
  });
}

/** A payload carrying the Story 10.24 PRODUCED contribution arm (the redaction subject below). */
function payloadWithContribution() {
  return assemblePayload({
    memberId: MEMBER,
    evaluatedAt: new Date('2025-06-01T00:00:00Z'),
    memberState: 'active',
    lockInStatus: { daysAtJoin: null, unlockDate: null, state: 'never-entered' },
    vyawasthaShulkStatus: { paidThrough: null, daysUntilLapse: null, inRenewalGrace: false, graceRemainingDays: null },
    medicalDisclosureFlags: {
      hasDisclosureOnRecord: false,
      declaredConditionCount: null,
      imaListVersion: null,
      pendingConcealmentFlag: false,
    },
    retirementCoverage: { status: 'clause_unavailable' },
    contributionHistory: {
      status: 'ok',
      facts: {
        'contribution.total_count': 12,
        'contribution.ever_contributed': true,
        'contribution.months_since_last': 7,
        'contribution.skips_current_year': 1,
        'contribution.in_lapse': true,
        // Story 10.25 — the sixth supplied fact, on the wire alongside the other five.
        'contribution.r7a_restorations_used': 1,
      },
      lapseSince: '2025-03-01T00:00:00.000Z',
      heldFacts: [{ key: 'contribution.personal_event_excuse_claimed', producer: 'story-10-26' }],
      restorationPackage: { status: 'ok', remaining: 2, required: 5 },
    },
    slots: [r12Slot(r12Result({ grantedYears: 0, isRetired: false, specialFlags: [] }))],
  });
}

function districtResource(over: Partial<rbac.ResourceLocator> = {}): rbac.ResourceLocator {
  return { dimension: 'district', value: 'Patna', pariwarId: PARIWAR_A, ...over };
}

/** A genuine self-target resource locator — `dimension: 'self'`, `value` = the owner's own actor id. */
function selfResource(over: Partial<rbac.ResourceLocator> = {}): rbac.ResourceLocator {
  return { dimension: 'self', value: ACTOR, pariwarId: PARIWAR_A, ...over };
}

describe('assertCanReadValidity — scope-respecting READ access (AC1)', () => {
  it('a self-call is permitted when the resource independently confirms it (own-profile)', () => {
    const caller: ValidityCaller = { actorId: ACTOR, grants: [], resource: selfResource(), isSelf: true };
    expect(() => assertCanReadValidity(caller)).not.toThrow();
  });

  it('a mis-constructed self-claim (isSelf true but resource is NOT a matching self target) is NOT trusted verbatim — falls through to the permission check (fail-closed throw without a covering grant)', () => {
    const caller: ValidityCaller = { actorId: ACTOR, grants: [], resource: districtResource(), isSelf: true };
    expect(() => assertCanReadValidity(caller)).toThrow(AuthorizationDeniedError);
  });

  it('a district admin holding member.view_validity at a covering scope is permitted', () => {
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      resource: districtResource(),
      isSelf: false,
    };
    expect(() => assertCanReadValidity(caller)).not.toThrow();
  });

  it('a caller WITHOUT the read key is denied (fail-closed throw)', () => {
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'field_worker', scopeDimension: 'self', scopeValue: ACTOR }],
      resource: districtResource(),
      isSelf: false,
    };
    expect(() => assertCanReadValidity(caller)).toThrow(AuthorizationDeniedError);
  });

  it('cross-Pariwar read is denied', () => {
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      resource: districtResource({ pariwarId: PARIWAR_B }),
      isSelf: false,
    };
    expect(() => assertCanReadValidity(caller)).toThrow(AuthorizationDeniedError);
  });
});

describe('canSeeConcealment — State-Trustee-scope only (role/scope gate, not a key)', () => {
  const stateTrustee = (value: string): ValidityCaller => ({
    actorId: ACTOR,
    grants: [{ pariwarId: PARIWAR_A, role: 'state_trustee', scopeDimension: 'state', scopeValue: value }],
    resource: { dimension: 'state', value: 'Bihar', pariwarId: PARIWAR_A },
    isSelf: false,
  });

  it('State Trustee covering the member → true', () => {
    expect(canSeeConcealment(stateTrustee('Bihar'))).toBe(true);
  });

  it('State Trustee of a DIFFERENT state → false (exact-node mismatch)', () => {
    expect(canSeeConcealment(stateTrustee('Maharashtra'))).toBe(false);
  });

  it('global super_admin → true (universal)', () => {
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
      resource: districtResource(),
      isSelf: false,
    };
    expect(canSeeConcealment(caller)).toBe(true);
  });

  it('district admin → false (not a concealment-visible role)', () => {
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      resource: districtResource(),
      isSelf: false,
    };
    expect(canSeeConcealment(caller)).toBe(false);
  });

  it('self-call → false (never sees internal flags)', () => {
    const caller: ValidityCaller = { actorId: ACTOR, grants: [], resource: districtResource(), isSelf: true };
    expect(canSeeConcealment(caller)).toBe(false);
  });

  it('fail-closed: State Trustee at state, member at district, NO resolver → false; WITH resolver → true', () => {
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'state_trustee', scopeDimension: 'state', scopeValue: 'Bihar' }],
      resource: districtResource(), // district=Patna
      isSelf: false,
    };
    expect(canSeeConcealment(caller)).toBe(false);
    expect(canSeeConcealment({ ...caller, authz: { resolver: BIHAR_TREE } })).toBe(true);
  });
});

describe('redactForCaller — field redaction (hash unchanged)', () => {
  it('State Trustee sees the full payload incl. pending_concealment_flag + the special flag', () => {
    const full = payloadWithConcealment();
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'state_trustee', scopeDimension: 'state', scopeValue: 'Bihar' }],
      resource: { dimension: 'state', value: 'Bihar', pariwarId: PARIWAR_A },
      isSelf: false,
    };
    const out = redactForCaller(full, caller);
    expect(out.medicalDisclosureFlags.pendingConcealmentFlag).toBe(true);
    expect(out.specialFlags).toContain(CONCEALMENT_REVIEW_FLAG);
  });

  it('district admin: concealment flag forced false + the internal special flag stripped', () => {
    const full = payloadWithConcealment();
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      resource: districtResource(),
      isSelf: false,
    };
    const out = redactForCaller(full, caller);
    expect(out.medicalDisclosureFlags.pendingConcealmentFlag).toBe(false);
    expect(out.specialFlags).not.toContain(CONCEALMENT_REVIEW_FLAG);
  });

  it('self-call sees own payload minus the internal flags', () => {
    const full = payloadWithConcealment();
    const caller: ValidityCaller = { actorId: ACTOR, grants: [], resource: districtResource(), isSelf: true };
    const out = redactForCaller(full, caller);
    expect(out.medicalDisclosureFlags.pendingConcealmentFlag).toBe(false);
    expect(out.specialFlags).not.toContain(CONCEALMENT_REVIEW_FLAG);
  });

  it('Story 10.17: `isAssignable` SURVIVES redaction for a narrow caller and for the member themselves', () => {
    // AC3 — the roster predicate is member-visible BY DESIGN and is deliberately NOT in
    // `STATE_TRUSTEE_ONLY_FLAGS`. A member is entitled to know they are on the donor roster: the whole
    // point of Story 10.17 is that a suspended member can still contribute their way back, and the
    // Story 10.16 disclosure on `/pay` is derived from this same payload. Redacting it would hide the
    // restoration path from the one person completing it.
    const full = payloadWithConcealment();
    const narrow: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      resource: districtResource(),
      isSelf: false,
    };
    const selfCall: ValidityCaller = { actorId: ACTOR, grants: [], resource: districtResource(), isSelf: true };

    for (const caller of [narrow, selfCall]) {
      const out = redactForCaller(full, caller);
      expect(out.isAssignable).toBe(full.isAssignable);
      expect(out).toHaveProperty('isAssignable'); // present, not merely equal-by-undefined
    }
  });

  it('Story 10.24: `contributionHistorySummary` facts SURVIVE redaction for every caller', () => {
    // The POSITIVE pin Task 4 requires, asserted rather than assumed. Contribution facts are NON-PII
    // MEMBER STANDING — how many contributions are on record, how long since the last one, whether a
    // cycle was missed. They are not State-Trustee-only material like the concealment flag, and they
    // are not medical, financial-account or identity data.
    //
    // Redacting them would break the two surfaces this story exists to light up: the member's own
    // status panel (they are entitled to see their own contribution standing — it is the restoration
    // path they are being asked to walk) and the Trustee-Lite violator section, whose
    // `factsEstablishing[]` is read straight off this sub-object. It is deliberately NOT in
    // `STATE_TRUSTEE_ONLY_FLAGS`, and this test is what keeps that deliberate.
    const full = payloadWithContribution();
    const narrow: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      resource: districtResource(),
      isSelf: false,
    };
    const selfCall: ValidityCaller = { actorId: ACTOR, grants: [], resource: districtResource(), isSelf: true };

    for (const caller of [narrow, selfCall]) {
      const out = redactForCaller(full, caller);
      expect(out.contributionHistorySummary).toEqual(full.contributionHistorySummary);
      expect(out.contributionHistorySummary.status).toBe('ok');
    }
  });

  it('Story 10.25: the SIXTH fact and `restorationPackage` SURVIVE redaction too', () => {
    // The same positive pin, extended to the fields 10.25 added — asserted on the FIELDS rather than
    // inherited from the `toEqual` above, because a future redaction rule that stripped one of them
    // would be a silent regression on the two surfaces that need them most.
    //
    // `r7a_restorations_used` is member standing of exactly the same class as the other five facts,
    // and `restorationPackage` is the count the member is OWED before being asked to contribute
    // without coverage (10.16 AC1(c)). Redacting either from a self-call would mean withholding from
    // a member the very number that tells them how far along their own restoration is.
    const full = payloadWithContribution();
    const selfCall: ValidityCaller = { actorId: ACTOR, grants: [], resource: districtResource(), isSelf: true };
    const out = redactForCaller(full, selfCall);
    expect(out.contributionHistorySummary.status).toBe('ok');
    if (out.contributionHistorySummary.status === 'ok') {
      expect(out.contributionHistorySummary.facts['contribution.r7a_restorations_used']).toBe(1);
      expect(out.contributionHistorySummary.restorationPackage).toEqual({
        status: 'ok',
        remaining: 2,
        required: 5,
      });
    }
  });

  it('the validity_payload_hash is UNCHANGED by redaction (canonical full-payload hash)', () => {
    const full = payloadWithConcealment();
    const caller: ValidityCaller = {
      actorId: ACTOR,
      grants: [{ pariwarId: PARIWAR_A, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      resource: districtResource(),
      isSelf: false,
    };
    expect(redactForCaller(full, caller).validityPayloadHash).toBe(full.validityPayloadHash);
  });
});
