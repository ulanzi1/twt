// T&C version-registry contract tests — Story 2.6 (Task 4; AC10).
//
// (1) tc_legal_review_status LOCKSTEP: the domain `tc_legal_review_status` pgEnum
//     and the contracts `TcLegalReviewStatusSchema` z.enum must declare the SAME
//     values. `@twt/domain` cannot import `@twt/contracts` (turbo cycle), so the
//     literal is duplicated; THIS test (contracts → domain is legal) is the
//     anti-drift guard (the BenefitMechanism precedent).
// (2) contract-↔-domain type assignability: a Drizzle-row wire projection + the
//     folded pins array extends `TcVersionResponse` (Top-10 anti-pattern #2 defense).
// (3) DTO behaviour (strict, valid parse, required pins, approve-confirm).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  ApproveTcVersionRequest,
  CreateTcVersionRequest,
  TcLegalReviewStatusSchema,
  TcVersionResponse,
  type TcVersionResponse as TcVersionResponseType,
} from '../src/terms-and-conditions/index.js';

// ── (2) type-assignability: domain row + pins → wire projection → contract ────
type Row = typeof schema.termsAndConditionsVersions.$inferSelect;
type WireProjection = Omit<
  Row,
  'effectiveFrom' | 'effectiveUntil' | 'authoredAt' | 'tcVersionId' | 'pariwarId' | 'legalReviewStatus'
> & {
  effectiveFrom: string;
  effectiveUntil: string | null;
  authoredAt: string;
  tcVersionId: TcVersionResponseType['tcVersionId'];
  pariwarId: TcVersionResponseType['pariwarId'];
  legalReviewStatus: TcVersionResponseType['legalReviewStatus'];
  pinnedToClauseVersionIds: TcVersionResponseType['pinnedToClauseVersionIds'];
};
type _AssertWireFromDrizzle = WireProjection extends TcVersionResponseType ? true : never;
const _wireFromDrizzle: _AssertWireFromDrizzle = true;
void _wireFromDrizzle;

const VALID_WIRE = {
  tcVersionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  pariwarId: '11111111-1111-1111-1111-111111111111',
  version: 1,
  bodyMarkdown: '# Terms',
  bodyHtmlRendered: '<h1>Terms</h1>',
  effectiveFrom: '2026-06-24T00:00:00.000Z',
  effectiveUntil: null,
  legalReviewStatus: 'pending',
  legalReviewerActorId: null,
  authoredByActor: null,
  authoredAt: '2026-06-24T00:00:00.000Z',
  auditId: null,
  pinnedToClauseVersionIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
};

describe('Story 2.6 — tc_legal_review_status lockstep (anti-drift guard)', () => {
  it('domain pgEnum enumValues === contracts TcLegalReviewStatusSchema.options', () => {
    expect([...schema.tcLegalReviewStatusEnum.enumValues].sort()).toEqual(
      [...TcLegalReviewStatusSchema.options].sort(),
    );
  });

  it('both declare exactly the five lifecycle states', () => {
    expect([...TcLegalReviewStatusSchema.options].sort()).toEqual(
      ['approved', 'pending', 'reviewed-with-changes-required', 'superseded', 'under-review'],
    );
  });
});

describe('TcVersionResponse', () => {
  it('is .strict()', () => {
    expect(() => assertStrict(TcVersionResponse)).not.toThrow();
  });

  it('parses a valid Drizzle-shaped wire payload (with folded pins)', () => {
    const parsed = TcVersionResponse.parse(VALID_WIRE);
    expect(parsed.legalReviewStatus).toBe('pending');
    expect(parsed.pinnedToClauseVersionIds).toHaveLength(1);
  });

  it('rejects an unknown top-level key (.strict())', () => {
    expect(TcVersionResponse.safeParse({ ...VALID_WIRE, __x: 1 }).success).toBe(false);
  });

  it('rejects an out-of-enum legal_review_status', () => {
    expect(TcVersionResponse.safeParse({ ...VALID_WIRE, legalReviewStatus: 'draft' }).success).toBe(
      false,
    );
  });
});

describe('CreateTcVersionRequest', () => {
  it('accepts a well-formed body, rejects unknown keys', () => {
    expect(
      CreateTcVersionRequest.safeParse({
        bodyMarkdown: '# Terms',
        pinnedToClauseVersionIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
        effectiveFrom: '2026-06-24T00:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      CreateTcVersionRequest.safeParse({
        bodyMarkdown: '# Terms',
        pinnedToClauseVersionIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
        effectiveFrom: '2026-06-24T00:00:00.000Z',
        __x: 1,
      }).success,
    ).toBe(false);
  });

  it('requires at least one pinned clause version', () => {
    expect(
      CreateTcVersionRequest.safeParse({
        bodyMarkdown: '# Terms',
        pinnedToClauseVersionIds: [],
        effectiveFrom: '2026-06-24T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('ApproveTcVersionRequest', () => {
  it('requires confirm === true', () => {
    expect(ApproveTcVersionRequest.safeParse({ confirm: true }).success).toBe(true);
    expect(ApproveTcVersionRequest.safeParse({ confirm: false }).success).toBe(false);
    expect(ApproveTcVersionRequest.safeParse({}).success).toBe(false);
  });
});
