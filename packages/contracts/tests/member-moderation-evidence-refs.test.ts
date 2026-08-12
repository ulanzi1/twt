// The evidence-reference DRIFT GUARD + the moderation request DTO — Story 10.20 (Task 5; AC4, AC6).
//
// ── What this file exists to prevent ────────────────────────────────────────────────────────────
// The evidence-ref schema is deliberately DUPLICATED: canonical in `@twt/domain`, value-aligned in
// `@twt/contracts`. That is forced, not chosen — a contracts SOURCE file cannot import `@twt/domain`
// (turbo cycle in one direction, `pg` in the RN Metro bundle in the other). The cost of a copy is
// drift, and drift here is not cosmetic: the two copies produce DIFFERENT rejections, so a `ref` the
// boundary accepts could be one the domain 422s or — far worse — one the DB's `moderation_evidence
// _refs_valid` CHECK accepts while the domain no longer would.
//
// ⇒ this TEST holds them in lockstep. A test-only cross-package import is safe (it never reaches a
// bundle); a source one is not. This is the `review-reason-codes.ts:15-19` / BankCode precedent.

import { member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  EVIDENCE_REFS_MAX,
  EVIDENCE_REF_KINDS,
  EVIDENCE_REF_MAX_LENGTH,
  EVIDENCE_REF_PATTERN,
  EvidenceRefDto,
  MODERATION_ESCALATION_MAX_CHARS,
  MODERATION_ESCALATION_MIN_CHARS,
  MODERATION_DECISION_NOTE_MAX_CHARS,
  ModerateMemberRequest,
} from '../src/member-moderation/index.js';

const domainModeration = memberDomain.moderation;

describe('the contracts copy is value-aligned with @twt/domain (anti-drift)', () => {
  it('pins the kinds, the cap, the length bound and the ref charset', () => {
    expect([...EVIDENCE_REF_KINDS]).toEqual([...domainModeration.EVIDENCE_REF_KINDS]);
    expect(EVIDENCE_REFS_MAX).toBe(domainModeration.EVIDENCE_REFS_MAX);
    expect(EVIDENCE_REF_MAX_LENGTH).toBe(domainModeration.EVIDENCE_REF_MAX_LENGTH);
    expect(EVIDENCE_REF_PATTERN.source).toBe(domainModeration.EVIDENCE_REF_PATTERN.source);
    expect(EVIDENCE_REF_PATTERN.flags).toBe(domainModeration.EVIDENCE_REF_PATTERN.flags);
  });

  it('pins the escalation substance floor and ceiling', () => {
    expect(MODERATION_ESCALATION_MIN_CHARS).toBe(domainModeration.ESCALATION_PART_MIN_CHARS);
    expect(MODERATION_ESCALATION_MAX_CHARS).toBe(domainModeration.ESCALATION_PART_MAX_CHARS);
  });

  it('⭐ the escalation substance floor is DELIBERATELY NOT wired into the schema (only emptiness is)', () => {
    // Review follow-up, REVERTED after a live-DB regression: an earlier pass wired
    // MODERATION_ESCALATION_MIN_CHARS into `EscalationPart`'s `.min()`, which made Fastify reject a
    // too-short value with a generic 400 before the request ever reached the domain — the layer that
    // produces the SPECIFIC typed 422 (`member_moderation.escalation_required`, `missing` vs
    // `too_short`, with a `min_chars` detail) `member-moderation.spec.ts` and `moderation-dwell.spec.ts`
    // pin against a live DB. The schema's job here is only to reject the truly-empty case; the
    // substance floor is the domain's `assertPart`/`assertImmediateTerminationReason` job, one layer in.
    const base = { reason_code: 'r14-forgery', rationale: 'Forged documents confirmed by the panel.' };
    const tooShort = 'x'.repeat(MODERATION_ESCALATION_MIN_CHARS - 1);
    expect(
      ModerateMemberRequest.safeParse({
        ...base,
        escalation_inadequacy: tooShort,
        escalation_proportionality: 'y'.repeat(60),
      }).success,
    ).toBe(true);
    expect(
      ModerateMemberRequest.safeParse({
        ...base,
        escalation_inadequacy: '',
        escalation_proportionality: 'y'.repeat(60),
      }).success,
    ).toBe(false);
  });

  it('⭐ the two copies AGREE on accept/reject for the cases that matter', () => {
    const cases: unknown[] = [
      { kind: 'complaint', ref: 'CMP-2026-0001' },
      { kind: 'document', ref: 'doc/2026/07_31.pdf' },
      { kind: 'external-order', ref: 'RBI.2026.114' },
      // The rejections — each is a distinct rule.
      { kind: 'complaint', ref: 'The member submitted a forged ration card' }, // prose
      { kind: 'complaint', ref: 'CMP 0001' }, // whitespace
      { kind: 'anything', ref: 'CMP-1' }, // unknown kind
      { kind: 'complaint', ref: 'CMP-1', note: 'prose' }, // third key
      { kind: 'complaint', ref: 'A'.repeat(EVIDENCE_REF_MAX_LENGTH + 1) }, // too long
      { kind: 'complaint', ref: '' }, // empty
      { kind: 'complaint', ref: '-CMP-1' }, // must START alphanumeric
    ];
    for (const c of cases) {
      expect(
        { input: c, ok: EvidenceRefDto.safeParse(c).success },
        `contracts and domain must agree on ${JSON.stringify(c)}`,
      ).toEqual({ input: c, ok: domainModeration.evidenceRefSchema.safeParse(c).success });
    }
  });
});

describe('ModerateMemberRequest (AC4, AC6)', () => {
  const base = { reason_code: 'r14-forgery', rationale: 'Forged documents confirmed by the panel.' };

  it('accepts a suspend body with neither escalation part nor evidence', () => {
    expect(ModerateMemberRequest.safeParse(base).success).toBe(true);
  });

  it('carries the two escalation parts as SEPARATE fields, and evidence refs', () => {
    const parsed = ModerateMemberRequest.safeParse({
      ...base,
      escalation_inadequacy: 'x'.repeat(60),
      escalation_proportionality: 'y'.repeat(60),
      evidence_refs: [{ kind: 'complaint', ref: 'CMP-2026-0001' }],
    });
    expect(parsed.success).toBe(true);
    // ⛔ Two fields, never one nested object — a single field lets a UI concatenate the parts.
    expect(parsed.success && parsed.data.escalation_inadequacy).toBe('x'.repeat(60));
    expect(parsed.success && parsed.data.escalation_proportionality).toBe('y'.repeat(60));
  });

  it('is `.strict()` — a smuggled actor or ciphertext field is rejected', () => {
    for (const extra of [
      { actor_id: '00000000-0000-4000-8000-000000000000' },
      { escalation_inadequacy_ciphertext: 'enc:v1:...' },
      { r7a_restorations_used_snapshot: 0 },
    ]) {
      expect(ModerateMemberRequest.safeParse({ ...base, ...extra }).success).toBe(false);
    }
  });

  it('rejects prose evidence at the BOUNDARY, before the request ever reaches the domain', () => {
    expect(
      ModerateMemberRequest.safeParse({
        ...base,
        evidence_refs: [{ kind: 'complaint', ref: 'the member forged a ration card' }],
      }).success,
    ).toBe(false);
  });

  it('caps evidence cardinality and each part at the Decision Note ceiling', () => {
    expect(
      ModerateMemberRequest.safeParse({
        ...base,
        evidence_refs: Array.from({ length: EVIDENCE_REFS_MAX + 1 }, (_, i) => ({
          kind: 'complaint' as const,
          ref: `CMP-${i}`,
        })),
      }).success,
    ).toBe(false);
    expect(
      ModerateMemberRequest.safeParse({
        ...base,
        escalation_inadequacy: 'x'.repeat(MODERATION_DECISION_NOTE_MAX_CHARS + 1),
      }).success,
    ).toBe(false);
  });
});
