// Concealment-assessment contract tests — Story 6.15 (Task 10).
//
// Verifies (1) the tri-state `kind` enum is value-aligned (lockstep) with the @twt/domain
// `CLAIM_CONCEALMENT_ASSESSMENT_KINDS` pgEnum tuple (@twt/domain cannot import @twt/contracts, so the wire
// mirror is re-declared and pinned here), and (2) the request DTO's shape rules (kind required, note
// optional + ≤500, `.strict()` rejects a smuggled actor identity).

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  CONCEALMENT_ASSESSMENT_NOTE_MAX_CHARS,
  ConcealmentAssessmentKind,
  ConcealmentAssessmentRequest,
} from '../src/index.js';

describe('Story 6.15 — concealment-assessment kind lockstep (contracts ↔ domain)', () => {
  it('domain CLAIM_CONCEALMENT_ASSESSMENT_KINDS === contracts ConcealmentAssessmentKind.options', () => {
    expect([...claim.CLAIM_CONCEALMENT_ASSESSMENT_KINDS].sort()).toEqual(
      [...ConcealmentAssessmentKind.options].sort(),
    );
  });
});

describe('ConcealmentAssessmentRequest', () => {
  it('accepts a bare kind (note is optional)', () => {
    expect(ConcealmentAssessmentRequest.safeParse({ kind: 'linked' }).success).toBe(true);
    expect(ConcealmentAssessmentRequest.safeParse({ kind: 'not_linked' }).success).toBe(true);
    expect(ConcealmentAssessmentRequest.safeParse({ kind: 'unable_to_determine' }).success).toBe(true);
  });

  it('accepts a kind + a note', () => {
    expect(
      ConcealmentAssessmentRequest.safeParse({ kind: 'linked', note: 'Undeclared cardiac condition.' }).success,
    ).toBe(true);
  });

  it('rejects a missing/unknown kind', () => {
    expect(ConcealmentAssessmentRequest.safeParse({}).success).toBe(false);
    expect(ConcealmentAssessmentRequest.safeParse({ kind: 'maybe' }).success).toBe(false);
  });

  it('rejects a note over the max length', () => {
    const note = 'x'.repeat(CONCEALMENT_ASSESSMENT_NOTE_MAX_CHARS + 1);
    expect(ConcealmentAssessmentRequest.safeParse({ kind: 'linked', note }).success).toBe(false);
  });

  it('.strict() rejects a smuggled actor_display (R5 — server-derived only)', () => {
    expect(
      ConcealmentAssessmentRequest.safeParse({ kind: 'linked', actor_display: 'Anita' }).success,
    ).toBe(false);
  });
});
