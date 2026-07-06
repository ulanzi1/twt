// Consent-registry contract tests — Story 2.7 (Task 3; AC6).
//
// (1) DUAL lockstep: the domain `consent_type` / `consent_granted_via` pgEnums and
//     the contracts `ConsentTypeSchema` / `ConsentGrantedViaSchema` z.enums must each
//     declare the SAME values. `@twt/domain` cannot import `@twt/contracts` (turbo
//     cycle), so the literals are duplicated; THIS test (contracts → domain is legal)
//     is the anti-drift guard (the TcLegalReviewStatus / BenefitMechanism precedent).
// (2) contract-↔-domain type assignability: a Drizzle-row wire projection extends
//     `ConsentRecordResponse` (Top-10 anti-pattern #2 defense).
// (3) DTO behaviour (strict, valid parse, reject unknown key, reject out-of-enum,
//     RecordConsent/RevokeConsent request shapes).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  ConsentGrantedViaSchema,
  ConsentRecordResponse,
  type ConsentRecordResponse as ConsentRecordResponseType,
  ConsentTypeSchema,
  RecordConsentRequest,
  RevokeConsentRequest,
} from '../src/consent/index.js';

// ── (2) type-assignability: domain row → wire projection → contract ───────────
type Row = typeof schema.consentRecords.$inferSelect;
type WireProjection = Omit<
  Row,
  | 'grantedAt'
  | 'revokedAt'
  | 'consentId'
  | 'pariwarId'
  | 'consentType'
  | 'grantedViaActor'
  | 'consentPayload'
> & {
  grantedAt: string;
  revokedAt: string | null;
  consentId: ConsentRecordResponseType['consentId'];
  pariwarId: ConsentRecordResponseType['pariwarId'];
  consentType: ConsentRecordResponseType['consentType'];
  grantedViaActor: ConsentRecordResponseType['grantedViaActor'];
  consentPayload: ConsentRecordResponseType['consentPayload'];
};
type _AssertWireFromDrizzle = WireProjection extends ConsentRecordResponseType ? true : never;
const _wireFromDrizzle: _AssertWireFromDrizzle = true;
void _wireFromDrizzle;

const VALID_WIRE = {
  consentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  subjectId: '22222222-2222-2222-2222-222222222222',
  pariwarId: '11111111-1111-1111-1111-111111111111',
  consentType: 'tc_acceptance',
  consentArtifactRef: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  grantedAt: '2026-06-24T00:00:00.000Z',
  revokedAt: null,
  grantedViaActor: 'member_self',
  consentPayload: { checkboxTextShown: 'I agree', locale: 'en' },
  auditId: null,
  revocationReason: null,
  revokedAuditId: null,
};

describe('Story 2.7 — consent enum lockstep (dual anti-drift guard)', () => {
  it('domain consent_type enumValues === contracts ConsentTypeSchema.options', () => {
    expect([...schema.consentTypeEnum.enumValues].sort()).toEqual(
      [...ConsentTypeSchema.options].sort(),
    );
  });

  it('domain consent_granted_via enumValues === contracts ConsentGrantedViaSchema.options', () => {
    expect([...schema.consentGrantedViaEnum.enumValues].sort()).toEqual(
      [...ConsentGrantedViaSchema.options].sort(),
    );
  });

  it('consent_type declares the seven AC1 values + the Story 5.4 whatsapp_opt_in additive', () => {
    expect([...ConsentTypeSchema.options].sort()).toEqual(
      [
        'claim_time_dpdpa',
        'dpdpa_data_processing',
        'dpdpa_data_sharing',
        'marketing',
        'medical_disclosure_ack',
        'nominee_share_split',
        'tc_acceptance',
        // Story 5.4 — member WhatsApp opt-in consent (additive via ALTER TYPE + lockstep).
        'whatsapp_opt_in',
      ],
    );
  });

  it('consent_granted_via declares exactly the three grant channels', () => {
    expect([...ConsentGrantedViaSchema.options].sort()).toEqual([
      'inherited',
      'member_self',
      'staff_assisted',
    ]);
  });
});

describe('ConsentRecordResponse', () => {
  it('is .strict()', () => {
    expect(() => assertStrict(ConsentRecordResponse)).not.toThrow();
  });

  it('parses a valid Drizzle-shaped wire payload', () => {
    const parsed = ConsentRecordResponse.parse(VALID_WIRE);
    expect(parsed.consentType).toBe('tc_acceptance');
    expect(parsed.revokedAt).toBeNull();
    expect(parsed.consentPayload).toMatchObject({ locale: 'en' });
  });

  it('accepts a null consentArtifactRef (e.g. marketing) + a revoked row', () => {
    const parsed = ConsentRecordResponse.parse({
      ...VALID_WIRE,
      consentType: 'marketing',
      consentArtifactRef: null,
      revokedAt: '2026-06-25T00:00:00.000Z',
      revocationReason: 'unsubscribed',
      revokedAuditId: '33333333-3333-3333-3333-333333333333',
    });
    expect(parsed.consentArtifactRef).toBeNull();
    expect(parsed.revocationReason).toBe('unsubscribed');
  });

  it('rejects an unknown top-level key (.strict())', () => {
    expect(ConsentRecordResponse.safeParse({ ...VALID_WIRE, __x: 1 }).success).toBe(false);
  });

  it('rejects an out-of-enum consent_type', () => {
    // `whatsapp_opt_in` is now a VALID Story 5.4 additive — use a genuinely unknown value here.
    expect(
      ConsentRecordResponse.safeParse({ ...VALID_WIRE, consentType: 'telegram_opt_in' }).success,
    ).toBe(false);
  });

  it('rejects an out-of-enum granted_via_actor', () => {
    expect(
      ConsentRecordResponse.safeParse({ ...VALID_WIRE, grantedViaActor: 'robot' }).success,
    ).toBe(false);
  });

  it('passes unknown keys through in consent_payload (.passthrough())', () => {
    const parsed = ConsentRecordResponse.parse({
      ...VALID_WIRE,
      consentPayload: { locale: 'hi', custom: 'context' },
    });
    expect(parsed.consentPayload).toMatchObject({ locale: 'hi', custom: 'context' });
  });
});

describe('RecordConsentRequest', () => {
  it('accepts a well-formed body, rejects unknown keys', () => {
    expect(
      RecordConsentRequest.safeParse({
        subjectId: '22222222-2222-2222-2222-222222222222',
        consentType: 'tc_acceptance',
        consentArtifactRef: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        grantedViaActor: 'member_self',
        consentPayload: { checkboxTextShown: 'I agree' },
      }).success,
    ).toBe(true);
    expect(
      RecordConsentRequest.safeParse({
        subjectId: '22222222-2222-2222-2222-222222222222',
        consentType: 'tc_acceptance',
        grantedViaActor: 'member_self',
        consentPayload: {},
        __x: 1,
      }).success,
    ).toBe(false);
  });

  it('allows consentArtifactRef to be omitted (e.g. marketing)', () => {
    expect(
      RecordConsentRequest.safeParse({
        subjectId: '22222222-2222-2222-2222-222222222222',
        consentType: 'marketing',
        grantedViaActor: 'member_self',
        consentPayload: {},
      }).success,
    ).toBe(true);
  });

  it('rejects an empty consentArtifactRef string', () => {
    expect(
      RecordConsentRequest.safeParse({
        subjectId: '22222222-2222-2222-2222-222222222222',
        consentType: 'tc_acceptance',
        consentArtifactRef: '',
        grantedViaActor: 'member_self',
        consentPayload: {},
      }).success,
    ).toBe(false);
  });
});

describe('RevokeConsentRequest', () => {
  it('requires a non-empty reason; rejects unknown keys', () => {
    expect(RevokeConsentRequest.safeParse({ reason: 'subject withdrew' }).success).toBe(true);
    expect(RevokeConsentRequest.safeParse({ reason: '' }).success).toBe(false);
    expect(RevokeConsentRequest.safeParse({}).success).toBe(false);
    expect(
      RevokeConsentRequest.safeParse({ reason: 'x', consentId: 'should-be-a-path-param' }).success,
    ).toBe(false);
  });
});
