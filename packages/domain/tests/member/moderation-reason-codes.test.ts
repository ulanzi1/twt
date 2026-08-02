// Story 10.10 (Task 1; AC3, AC10) — the reason-code registry.
//
// The `appliesTo` metadata is what makes this a REGISTRY rather than a bare enum: it is what
// rejects a restore code offered to justify a termination (a typed 422). These tests pin that
// property in both directions and pin the frozen vocabulary itself, so a code cannot be quietly
// renamed (the wire value is a governance term, and the contracts sync-guard mirrors it).

import { describe, expect, it } from 'vitest';

import {
  ALL_REASON_CODES,
  MODERATION_REASON_CODES,
  REASON_CODE_REGISTRY,
  RESTORE_REASON_CODES,
  isReasonCode,
  reasonCodeAppliesTo,
  reasonCodeMeta,
  reasonCodesForAction,
} from '../../src/member/moderation/reason-codes.js';
import { MODERATION_ACTIONS } from '../../src/member/moderation/status.js';

describe('the frozen vocabulary', () => {
  it('declares the seven PRD/epic-anchored moderation grounds, in order', () => {
    expect(MODERATION_REASON_CODES).toEqual([
      'r7-contribution-discipline',
      'r14-forgery',
      'r10a-parallel-org-office',
      'concealment-confirmed',
      'helpdesk-escalated-abuse',
      'regulator-action',
      'voluntary-pending-review',
    ]);
  });

  it('declares the three restore grounds (prd.md:853)', () => {
    expect(RESTORE_REASON_CODES).toEqual(['rule-clearance', 'trustee-discretion', 'moderation-error']);
  });

  it('has registry metadata for every declared code, and no orphan entries', () => {
    expect(Object.keys(REASON_CODE_REGISTRY).sort()).toEqual([...ALL_REASON_CODES].sort());
  });

  it('anchors every code to a Niyamavali rule or FR (provenance, not policy)', () => {
    for (const code of ALL_REASON_CODES) {
      expect(REASON_CODE_REGISTRY[code].niyamavaliRef.length).toBeGreaterThan(0);
      expect(REASON_CODE_REGISTRY[code].label.length).toBeGreaterThan(0);
    }
  });
});

describe('appliesTo — the guard that makes this a registry', () => {
  it('a RESTORE code can never justify a suspension or a termination (AC3)', () => {
    for (const code of RESTORE_REASON_CODES) {
      expect(reasonCodeAppliesTo(code, 'suspend')).toBe(false);
      expect(reasonCodeAppliesTo(code, 'terminate')).toBe(false);
      expect(reasonCodeAppliesTo(code, 'restore')).toBe(true);
    }
  });

  it('a MODERATION code can never justify a restore', () => {
    for (const code of MODERATION_REASON_CODES) {
      expect(reasonCodeAppliesTo(code, 'suspend')).toBe(true);
      expect(reasonCodeAppliesTo(code, 'terminate')).toBe(true);
      expect(reasonCodeAppliesTo(code, 'restore')).toBe(false);
    }
  });

  it('an UNDECLARED code applies to nothing (untrusted input never falls through)', () => {
    for (const action of MODERATION_ACTIONS) {
      expect(reasonCodeAppliesTo('not-a-real-code', action)).toBe(false);
      expect(reasonCodeAppliesTo('', action)).toBe(false);
      // Prototype keys must not resolve through the registry's own object.
      expect(reasonCodeAppliesTo('toString', action)).toBe(false);
      expect(reasonCodeAppliesTo('constructor', action)).toBe(false);
    }
  });

  it('isReasonCode / reasonCodeMeta agree with the registry', () => {
    expect(isReasonCode('r14-forgery')).toBe(true);
    expect(isReasonCode('nope')).toBe(false);
    expect(reasonCodeMeta('r14-forgery')?.niyamavaliRef).toBe('R14');
    expect(reasonCodeMeta('nope')).toBeNull();
  });
});

describe('reasonCodesForAction — what the admin dropdown filters on (AC9)', () => {
  it('every action has at least one code that can justify it', () => {
    // The value-level complement of the compile-time `satisfies` exhaustiveness: an action whose
    // code set is empty would render an un-submittable dropdown.
    for (const action of MODERATION_ACTIONS) {
      expect(reasonCodesForAction(action).length).toBeGreaterThan(0);
    }
  });

  it('partitions the vocabulary exactly: moderation codes ∪ restore codes, no overlap', () => {
    expect(reasonCodesForAction('suspend')).toEqual([...MODERATION_REASON_CODES]);
    expect(reasonCodesForAction('terminate')).toEqual([...MODERATION_REASON_CODES]);
    expect(reasonCodesForAction('restore')).toEqual([...RESTORE_REASON_CODES]);
  });
});
