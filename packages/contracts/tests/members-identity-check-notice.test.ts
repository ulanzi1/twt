// Story 3.13a (Task 2; AC3, DL5, N3) — the member's notice contract: the reason code ONLY, `.strict()` at both levels, the
// reason enum REUSED from 3.13's contract (⛔ a third copy) and in lockstep with the domain's.

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { IDENTITY_CHECK_NOT_CONFIRMED_REASONS, MemberIdentityCheckNoticeResponse } from '../src/index.js';

describe('Story 3.13a — MemberIdentityCheckNoticeResponse', () => {
  it.each(IDENTITY_CHECK_NOT_CONFIRMED_REASONS)('a notice with the reason `%s` parses', (reason) => {
    expect(MemberIdentityCheckNoticeResponse.parse({ notice: { reason } })).toEqual({ notice: { reason } });
  });

  it('`notice: null` parses (⛔ card)', () => {
    expect(MemberIdentityCheckNoticeResponse.parse({ notice: null })).toEqual({ notice: null });
  });

  it('the reasons are the domain\'s four, in order (the enum is 3.13\'s, reused)', () => {
    expect([...IDENTITY_CHECK_NOT_CONFIRMED_REASONS]).toEqual([...schema.IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS]);
  });

  it('⭐ N3 — an extra key is REFUSED on the notice (a note, a date, who checked) and on the envelope', () => {
    for (const extra of [{ note: 'x' }, { decidedAt: '2026-11-20T00:00:00.000Z' }, { decidedByDisplay: 'Asha' }]) {
      expect(MemberIdentityCheckNoticeResponse.safeParse({ notice: { reason: 'photo_does_not_match', ...extra } }).success).toBe(
        false,
      );
    }
    expect(MemberIdentityCheckNoticeResponse.safeParse({ notice: null, extra: 1 }).success).toBe(false);
  });

  it('an unknown reason (a future 3-16 code) is refused (`3.13a-G3`), and a missing `notice` is refused', () => {
    expect(MemberIdentityCheckNoticeResponse.safeParse({ notice: { reason: 'documents_unreadable' } }).success).toBe(false);
    expect(MemberIdentityCheckNoticeResponse.safeParse({}).success).toBe(false);
  });
});
