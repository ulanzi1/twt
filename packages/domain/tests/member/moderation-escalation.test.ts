// The two-part escalation justification + the evidence-reference schema — Story 10.20 (Task 5;
// AC4, AC6).
//
// These are the PLAINTEXT guards. They run in the route BEFORE `encryptModerationRationale`, for a
// reason premise #5 states: envelope encryption is non-deterministic, so two identical plaintexts
// produce different ciphertexts and no `CHECK (a <> b)` could ever express the anti-restatement
// rule. What the DB CAN express is PRESENCE (`escalation_iff_terminate`, migration 0099) — and that
// is the half it enforces. Restatement and substance are this module's.

import { describe, expect, it } from 'vitest';

import {
  ESCALATION_PART_MIN_CHARS,
  assertEscalationJustification,
  normalizeEscalationPart,
} from '../../src/member/moderation/escalation.js';
import {
  EVIDENCE_REFS_MAX,
  EVIDENCE_REF_MAX_LENGTH,
  assertEvidenceRefs,
  evidenceRefSchema,
} from '../../src/member/moderation/evidence-refs.js';
import {
  ModerationEscalationNotApplicableError,
  ModerationEscalationRequiredError,
  ModerationEscalationRestatementError,
  ModerationEvidenceRefInvalidError,
} from '../../src/member/moderation/errors.js';

/** A part that clears the substance floor without saying anything about the other part. */
const INADEQUACY =
  'Suspension would not protect the Trust here: the member retains the very access that was misused, and the restoration path it preserves is futile while the forged documents remain in circulation.';
const PROPORTIONALITY =
  'Termination fits the conduct because the forgery was deliberate, repeated across three cycles, and directed at the claim-verification process the Trust depends on.';

describe('assertEscalationJustification — required, two-part, on terminate ONLY (AC6)', () => {
  it('accepts a terminate carrying both parts, and returns them trimmed', () => {
    const out = assertEscalationJustification('terminate', {
      inadequacy: `  ${INADEQUACY}  `,
      proportionality: PROPORTIONALITY,
    });
    expect(out).toEqual({ inadequacy: INADEQUACY, proportionality: PROPORTIONALITY });
  });

  it('requires BOTH parts on terminate — each absence names its own part', () => {
    expect(() =>
      assertEscalationJustification('terminate', { proportionality: PROPORTIONALITY }),
    ).toThrow(ModerationEscalationRequiredError);
    expect(() =>
      assertEscalationJustification('terminate', { inadequacy: INADEQUACY }),
    ).toThrow(ModerationEscalationRequiredError);

    try {
      assertEscalationJustification('terminate', { proportionality: PROPORTIONALITY });
      expect.unreachable('a terminate missing part (a) must throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ModerationEscalationRequiredError);
      expect((err as ModerationEscalationRequiredError).part).toBe('inadequacy');
      expect((err as ModerationEscalationRequiredError).reason).toBe('missing');
    }
  });

  it('rejects whitespace-only and `n/a` — the floor exists to reject those, not to judge reasoning', () => {
    for (const junk of ['   ', 'n/a', 'N/A.', 'see above', '-']) {
      try {
        assertEscalationJustification('terminate', {
          inadequacy: junk,
          proportionality: PROPORTIONALITY,
        });
        expect.unreachable(`'${junk}' must not satisfy part (a)`);
      } catch (err) {
        expect(err).toBeInstanceOf(ModerationEscalationRequiredError);
        expect((err as ModerationEscalationRequiredError).part).toBe('inadequacy');
      }
    }
  });

  it('applies the substance floor to each part INDEPENDENTLY', () => {
    const justUnder = 'x'.repeat(ESCALATION_PART_MIN_CHARS - 1);
    try {
      assertEscalationJustification('terminate', {
        inadequacy: INADEQUACY,
        proportionality: justUnder,
      });
      expect.unreachable('a short part (b) must throw even when part (a) is substantial');
    } catch (err) {
      expect(err).toBeInstanceOf(ModerationEscalationRequiredError);
      expect((err as ModerationEscalationRequiredError).part).toBe('proportionality');
      expect((err as ModerationEscalationRequiredError).reason).toBe('too_short');
    }
    // Exactly at the floor is ACCEPTED — a floor is inclusive, and an off-by-one here would reject
    // text an operator was told was long enough.
    expect(
      assertEscalationJustification('terminate', {
        inadequacy: INADEQUACY,
        proportionality: 'y'.repeat(ESCALATION_PART_MIN_CHARS),
      }),
    ).not.toBeNull();
  });

  it('⭐ rejects a RESTATEMENT — part (a) is not satisfied by restating part (b)', () => {
    expect(() =>
      assertEscalationJustification('terminate', {
        inadequacy: PROPORTIONALITY,
        proportionality: PROPORTIONALITY,
      }),
    ).toThrow(ModerationEscalationRestatementError);
  });

  it('⭐ the restatement compare is NORMALIZED — case, punctuation and whitespace cannot defeat it', () => {
    expect(() =>
      assertEscalationJustification('terminate', {
        inadequacy: PROPORTIONALITY.toUpperCase().replace(/,/g, ' ;  '),
        proportionality: PROPORTIONALITY,
      }),
    ).toThrow(ModerationEscalationRestatementError);
  });

  it('does NOT reject two parts that merely share vocabulary', () => {
    expect(
      assertEscalationJustification('terminate', {
        inadequacy: INADEQUACY,
        proportionality: PROPORTIONALITY,
      }),
    ).not.toBeNull();
  });

  it('returns null for suspend/restore, and REJECTS a part smuggled onto them', () => {
    expect(assertEscalationJustification('suspend', {})).toBeNull();
    expect(assertEscalationJustification('restore', { inadequacy: null })).toBeNull();
    for (const action of ['suspend', 'restore'] as const) {
      expect(() =>
        assertEscalationJustification(action, { inadequacy: INADEQUACY }),
      ).toThrow(ModerationEscalationNotApplicableError);
      expect(() =>
        assertEscalationJustification(action, { proportionality: PROPORTIONALITY }),
      ).toThrow(ModerationEscalationNotApplicableError);
    }
  });

  it('normalizeEscalationPart collapses case, punctuation and runs of whitespace', () => {
    expect(normalizeEscalationPart('  The Member,  repeatedly!  ')).toBe('the member repeatedly');
    expect(normalizeEscalationPart('a-b-c')).toBe('a b c');
  });
});

describe('evidence references are structurally incapable of carrying prose (AC4)', () => {
  it('accepts a real identifier for every declared kind', () => {
    for (const kind of ['complaint', 'investigation', 'helpdesk-ticket', 'document', 'external-order'] as const) {
      expect(evidenceRefSchema.safeParse({ kind, ref: 'CMP-2026-0001' }).success).toBe(true);
    }
    expect(assertEvidenceRefs([])).toEqual([]);
    expect(assertEvidenceRefs([{ kind: 'document', ref: 'doc/2026/07_31.pdf' }])).toHaveLength(1);
  });

  it('⭐ REJECTS a sentence — it is never truncated to a prefix of the prose', () => {
    const prose = 'The member submitted a forged ration card on 12 July';
    expect(evidenceRefSchema.safeParse({ kind: 'complaint', ref: prose }).success).toBe(false);
    expect(() => assertEvidenceRefs([{ kind: 'complaint', ref: prose }])).toThrow(
      ModerationEvidenceRefInvalidError,
    );
    // A single SPACE is the load-bearing exclusion — without it, prose is representable.
    expect(evidenceRefSchema.safeParse({ kind: 'complaint', ref: 'CMP 0001' }).success).toBe(false);
  });

  it('rejects an unknown kind, a third key, and a too-long ref', () => {
    expect(evidenceRefSchema.safeParse({ kind: 'anything', ref: 'CMP-1' }).success).toBe(false);
    expect(
      evidenceRefSchema.safeParse({ kind: 'complaint', ref: 'CMP-1', note: 'prose' }).success,
    ).toBe(false);
    expect(
      evidenceRefSchema.safeParse({ kind: 'complaint', ref: 'A'.repeat(EVIDENCE_REF_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
  });

  it('caps cardinality — "attach the whole case file" is impossible', () => {
    const many = Array.from({ length: EVIDENCE_REFS_MAX + 1 }, (_, i) => ({
      kind: 'complaint' as const,
      ref: `CMP-${i}`,
    }));
    expect(() => assertEvidenceRefs(many)).toThrow(ModerationEvidenceRefInvalidError);
    expect(assertEvidenceRefs(many.slice(0, EVIDENCE_REFS_MAX))).toHaveLength(EVIDENCE_REFS_MAX);
  });

  it('a non-array (and a null) is a typed error, never a silent empty list', () => {
    expect(() => assertEvidenceRefs({ kind: 'complaint', ref: 'CMP-1' })).toThrow(
      ModerationEvidenceRefInvalidError,
    );
    expect(assertEvidenceRefs(undefined)).toEqual([]);
    expect(assertEvidenceRefs(null)).toEqual([]);
  });
});
