// Story 6.33 (QE8 C11; review RV10) — the two audit counts of the answers stored as CIPHERTEXT and decrypted to be shown:
// the neighbours' (`sensitive_answer_count`) and the family's (`family_sensitive_answer_count`), counted INTERNALLY and put on
// BOTH audit lines (`admin_claim.peer_answers_read` and `admin_verifier_console.read`) by this ONE helper. A section that was ⛔
// delivered counts zero; an `empty` section carries the family's account only. Pure.

import { describe, expect, it } from 'vitest';

import { sensitiveAnswerAuditCounts } from '../../src/modules/claims/peer-answers-assembler.js';

describe('sensitiveAnswerAuditCounts', () => {
  const counts = { neighbours: 3, family: 2 };

  it('a PRESENT section carries both counts (non-zero — the case no live spec had)', () => {
    expect(sensitiveAnswerAuditCounts({ status: 'present' }, counts)).toEqual({ sensitive_answer_count: 3, family_sensitive_answer_count: 2 });
  });

  it('an EMPTY section (no selection) carries the family\'s account only', () => {
    expect(sensitiveAnswerAuditCounts({ status: 'empty' }, counts)).toEqual({ sensitive_answer_count: 0, family_sensitive_answer_count: 2 });
  });

  it('a section that was NOT delivered (hidden, unavailable, absent) counts zero — ⛔ a count for what was not shown', () => {
    for (const status of ['hidden', 'unavailable', 'not_available_yet']) {
      expect(sensitiveAnswerAuditCounts({ status }, counts)).toEqual({ sensitive_answer_count: 0, family_sensitive_answer_count: 0 });
    }
    expect(sensitiveAnswerAuditCounts(undefined, counts)).toEqual({ sensitive_answer_count: 0, family_sensitive_answer_count: 0 });
  });

  it('no counts reported (the assembler threw before reporting) ⇒ zero, ⛔ a crash', () => {
    expect(sensitiveAnswerAuditCounts({ status: 'present' }, null)).toEqual({ sensitive_answer_count: 0, family_sensitive_answer_count: 0 });
  });
});
