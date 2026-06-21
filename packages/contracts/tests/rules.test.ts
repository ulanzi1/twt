// Niyamavali rule-registry contract tests — Story 2.3 (Task 7).
//
// (1) benefit_mechanism LOCKSTEP: the domain `benefit_mechanism` pgEnum and the
//     contracts `BenefitMechanism` z.enum must declare the SAME values. `@twt/domain`
//     cannot import `@twt/contracts` (turbo cycle), so the literal is duplicated;
//     THIS test (contracts → domain is legal) is the anti-drift guard that Story
//     2.3 Task 2 mandates.
// (2) contract-↔-domain type assignability: a Drizzle-row wire projection extends
//     `ClauseVersionResponse` (the pariwar-passport precedent; Top-10 anti-pattern
//     #2 defense — no hand-written *.types.ts shadowing the domain row).
// (3) ClauseIdSchema / AffectedMemberScopeSchema / ClauseResolutionQuery behaviour.

import { describe, expect, it } from 'vitest';
import { ids, schema } from '@twt/domain';

import { assertStrict } from '../src/_common/strict.js';
import { BenefitMechanism } from '../src/rules/benefit-mechanism.js';
import {
  AffectedMemberScopeSchema,
  CLAUSE_ID_PATTERN,
  ClauseDraftOperationSchema,
  ClauseDraftResponse,
  ClauseDraftStatusSchema,
  ClauseIdSchema,
  ClauseResolutionQuery,
  ClauseVersionResponse,
  CreateClauseDraftRequest,
  PublishClauseResponse,
  ToneReviewSignoffRequest,
  type ClauseDraftResponse as ClauseDraftResponseType,
  type ClauseVersionResponse as ClauseVersionResponseType,
} from '../src/rules/index.js';

// ── (2) type-assignability: domain row → wire projection → contract ──────────
type Row = typeof schema.clauseVersions.$inferSelect;
type WireProjection = Omit<
  Row,
  | 'effectiveDate'
  | 'deprecatedAt'
  | 'authoredAt'
  | 'clauseVersionId'
  | 'clauseId'
  | 'pariwarId'
  | 'predecessorClauseIds'
  | 'supersededByVersion'
> & {
  effectiveDate: string;
  deprecatedAt: string | null;
  authoredAt: string;
  clauseVersionId: ClauseVersionResponseType['clauseVersionId'];
  clauseId: ClauseVersionResponseType['clauseId'];
  pariwarId: ClauseVersionResponseType['pariwarId'];
  predecessorClauseIds: ClauseVersionResponseType['predecessorClauseIds'];
  supersededByVersion: ClauseVersionResponseType['supersededByVersion'];
};
type _AssertWireFromDrizzle = WireProjection extends ClauseVersionResponseType ? true : never;
const _wireFromDrizzle: _AssertWireFromDrizzle = true;
void _wireFromDrizzle;

// ── Story 2.4 — clause_drafts row → wire projection → ClauseDraftResponse ─────
type DraftRow = typeof schema.clauseDrafts.$inferSelect;
type DraftWireProjection = Omit<
  DraftRow,
  | 'effectiveDate'
  | 'toneReviewedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'draftId'
  | 'pariwarId'
  | 'clauseId'
  | 'affectedMemberScope'
  | 'publishedClauseVersionId'
> & {
  effectiveDate: string;
  toneReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  draftId: ClauseDraftResponseType['draftId'];
  pariwarId: ClauseDraftResponseType['pariwarId'];
  clauseId: ClauseDraftResponseType['clauseId'];
  affectedMemberScope: ClauseDraftResponseType['affectedMemberScope'];
  publishedClauseVersionId: ClauseDraftResponseType['publishedClauseVersionId'];
};
type _AssertDraftWireFromDrizzle = DraftWireProjection extends ClauseDraftResponseType ? true : never;
const _draftWireFromDrizzle: _AssertDraftWireFromDrizzle = true;
void _draftWireFromDrizzle;

const VALID_WIRE = {
  clauseVersionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  clauseId: 'niy.contribution-discipline.r7-a',
  pariwarId: '11111111-1111-1111-1111-111111111111',
  version: 1,
  effectiveDate: '2026-06-21T00:00:00.000Z',
  payload: { rule_code: 'R7(A)', restores_after_days: 30 },
  benefitMechanism: 'pool',
  predecessorClauseIds: [] as string[],
  supersededByVersion: null,
  deprecatedAt: null,
  authoredByActor: null,
  authoredAt: '2026-06-21T00:00:00.000Z',
  auditId: null,
};

describe('Story 2.3 — benefit_mechanism lockstep (anti-drift guard)', () => {
  it('domain pgEnum enumValues === contracts BenefitMechanism.options', () => {
    expect([...schema.benefitMechanismEnum.enumValues].sort()).toEqual(
      [...BenefitMechanism.options].sort(),
    );
  });

  it('both declare exactly [pool, reserve]', () => {
    expect([...BenefitMechanism.options].sort()).toEqual(['pool', 'reserve']);
    expect([...schema.benefitMechanismEnum.enumValues].sort()).toEqual(['pool', 'reserve']);
  });
});

describe('Story 2.3 — clause-id regex lockstep (anti-drift guard)', () => {
  it('contracts CLAUSE_ID_PATTERN === domain CLAUSE_ID_REGEX (the single authority)', () => {
    // The contracts pattern is re-declared (a SOURCE file cannot import @twt/domain
    // — browser-bundle constraint), so this TEST is the drift guard.
    expect(CLAUSE_ID_PATTERN.source).toBe(ids.CLAUSE_ID_REGEX.source);
  });
});

describe('ClauseVersionResponse (Story 2.3)', () => {
  it('is .strict()', () => {
    expect(() => assertStrict(ClauseVersionResponse)).not.toThrow();
  });

  it('parses a valid Drizzle-shaped wire payload', () => {
    const parsed = ClauseVersionResponse.parse(VALID_WIRE);
    expect(parsed.clauseId).toBe(VALID_WIRE.clauseId);
    expect(parsed.benefitMechanism).toBe('pool');
  });

  it('rejects an unknown top-level key (.strict())', () => {
    expect(ClauseVersionResponse.safeParse({ ...VALID_WIRE, __x: 1 }).success).toBe(false);
  });

  it('rejects a malformed clause_id', () => {
    expect(ClauseVersionResponse.safeParse({ ...VALID_WIRE, clauseId: 'R7' }).success).toBe(false);
  });

  it('rejects an out-of-enum benefit_mechanism', () => {
    expect(ClauseVersionResponse.safeParse({ ...VALID_WIRE, benefitMechanism: 'grant' }).success).toBe(
      false,
    );
  });
});

describe('ClauseIdSchema (AC2)', () => {
  it.each([
    'niy.contribution-discipline.r7-a',
    'niy.ninety-percent-rule.r8',
    'niy.special-death.r9-suicide-murder',
    'niy.section.clause',
  ])('accepts %s', (good) => {
    expect(ClauseIdSchema.safeParse(good).success).toBe(true);
  });

  it.each(['', 'R7', 'foo.bar.baz', 'niy.Upper.r7', 'niy.a.b.c.d', 'niy.contribution'])(
    'rejects %s',
    (bad) => {
      expect(ClauseIdSchema.safeParse(bad).success).toBe(false);
    },
  );
});

describe('AffectedMemberScopeSchema (architecture §1.10)', () => {
  it('parses every well-formed kind', () => {
    expect(AffectedMemberScopeSchema.safeParse({ kind: 'all_members' }).success).toBe(true);
    expect(AffectedMemberScopeSchema.safeParse({ kind: 'past_lockin' }).success).toBe(true);
    expect(
      AffectedMemberScopeSchema.safeParse({
        kind: 'rule_subclause',
        clause_id: 'niy.contribution-discipline.r7-a',
        subclause: 'C',
      }).success,
    ).toBe(true);
    expect(
      AffectedMemberScopeSchema.safeParse({ kind: 'named_cohort', definition: 'Patna active 2025' })
        .success,
    ).toBe(true);
  });

  it('rejects an unknown kind + a malformed rule_subclause', () => {
    expect(AffectedMemberScopeSchema.safeParse({ kind: 'everyone' }).success).toBe(false);
    expect(
      AffectedMemberScopeSchema.safeParse({ kind: 'rule_subclause', clause_id: 'R7', subclause: 'C' })
        .success,
    ).toBe(false);
    expect(
      AffectedMemberScopeSchema.safeParse({
        kind: 'rule_subclause',
        clause_id: 'niy.a.b',
        subclause: '',
      }).success,
    ).toBe(false);
  });
});

describe('Story 2.4 — clause-draft enum lockstep (anti-drift guard)', () => {
  it('domain clause_draft_operation pgEnum === contracts ClauseDraftOperationSchema.options', () => {
    expect([...schema.clauseDraftOperationEnum.enumValues].sort()).toEqual(
      [...ClauseDraftOperationSchema.options].sort(),
    );
  });

  it('domain clause_draft_status pgEnum === contracts ClauseDraftStatusSchema.options', () => {
    expect([...schema.clauseDraftStatusEnum.enumValues].sort()).toEqual(
      [...ClauseDraftStatusSchema.options].sort(),
    );
  });
});

describe('Story 2.4 — draft endpoint DTOs', () => {
  it('ClauseDraftResponse is .strict()', () => {
    expect(() => assertStrict(ClauseDraftResponse)).not.toThrow();
  });

  it('CreateClauseDraftRequest accepts a well-formed create body, rejects unknown keys', () => {
    const ok = CreateClauseDraftRequest.safeParse({
      operation: 'create',
      clauseId: 'niy.a.b',
      payload: { rule_code: 'R1' },
      effectiveDate: '2026-07-01T00:00:00.000Z',
      benefitMechanism: 'pool',
    });
    expect(ok.success).toBe(true);
    expect(
      CreateClauseDraftRequest.safeParse({
        operation: 'create',
        clauseId: 'niy.a.b',
        payload: {},
        effectiveDate: '2026-07-01T00:00:00.000Z',
        benefitMechanism: 'pool',
        __x: 1,
      }).success,
    ).toBe(false);
  });

  it('ToneReviewSignoffRequest requires confirm === true', () => {
    expect(ToneReviewSignoffRequest.safeParse({ confirm: true }).success).toBe(true);
    expect(ToneReviewSignoffRequest.safeParse({ confirm: false }).success).toBe(false);
    expect(ToneReviewSignoffRequest.safeParse({}).success).toBe(false);
  });

  it('PublishClauseResponse requires a non-null auditId (AC5)', () => {
    const base = {
      clauseVersionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      clauseId: 'niy.a.b',
      version: 2,
    };
    expect(PublishClauseResponse.safeParse({ ...base, auditId: null }).success).toBe(false);
    expect(
      PublishClauseResponse.safeParse({
        ...base,
        auditId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      }).success,
    ).toBe(true);
  });
});

describe('ClauseResolutionQuery (AC7 XOR)', () => {
  it('accepts clauseId-only and clauseVersionId-only', () => {
    expect(ClauseResolutionQuery.safeParse({ clauseId: 'niy.a.b' }).success).toBe(true);
    expect(
      ClauseResolutionQuery.safeParse({ clauseVersionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
        .success,
    ).toBe(true);
    expect(
      ClauseResolutionQuery.safeParse({ clauseId: 'niy.a.b', asOf: '2026-06-21T00:00:00.000Z' })
        .success,
    ).toBe(true);
  });

  it('rejects supplying BOTH keys (mutually exclusive)', () => {
    expect(
      ClauseResolutionQuery.safeParse({
        clauseId: 'niy.a.b',
        clauseVersionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }).success,
    ).toBe(false);
  });
});
