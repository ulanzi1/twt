// resolveMemberDisplayName unit tests — Story 3.12 (Task 4; AC2/AC3). DB-FREE.
//
// The display-time seam that renders "an anonymous member" for an `anonymized` member. No real
// member-backed public read exists at Epic 3 (the contributor surfaces are sample-data — the wire-in is
// a DEFER, see deferred-work.md), so this unit test IS the guarantee that the anonymized → i18n-key
// mapping is correct the moment a real read routes through the seam.

import { describe, expect, it } from 'vitest';

import { MEMBER_LIFECYCLE_STATES } from '../../src/schema/members.js';
import {
  ANONYMOUS_MEMBER_I18N_KEY,
  resolveMemberDisplayName,
} from '../../src/member/display-name.js';

describe('resolveMemberDisplayName — anonymized masking seam', () => {
  it('anonymized → the "an anonymous member" i18n key (never the residual name)', () => {
    const r = resolveMemberDisplayName({ state: 'anonymized', name: 'Asha Devi' });
    expect(r).toEqual({ kind: 'anonymized', i18nKey: ANONYMOUS_MEMBER_I18N_KEY });
    expect(ANONYMOUS_MEMBER_I18N_KEY).toBe('member.anonymousMember');
  });

  it('every NON-anonymized state resolves to the provided name', () => {
    for (const state of MEMBER_LIFECYCLE_STATES) {
      if (state === 'anonymized') continue;
      expect(resolveMemberDisplayName({ state, name: 'Asha Devi' })).toEqual({
        kind: 'name',
        value: 'Asha Devi',
      });
    }
  });

  it('a null name on a non-anonymized state resolves to { kind: unknown } — callers can show a placeholder', () => {
    expect(resolveMemberDisplayName({ state: 'active', name: null })).toEqual({ kind: 'unknown' });
    expect(resolveMemberDisplayName({ state: 'withdrawn', name: null })).toEqual({ kind: 'unknown' });
  });
});
