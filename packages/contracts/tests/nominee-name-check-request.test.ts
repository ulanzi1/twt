// `NomineeNameCheckRequest` — the AC3 boundary (Story 6.18). Code review 2026-09-20.
//
// ⭐⭐ THE RULE THIS FILE PINS IS THE ONE THE STORY CALLS LOAD-BEARING. `2026-09-19-226` cl.5:
// *"District Admin cannot proceed unless reason for name mismatch is selected."* Before this file
// there was NO contracts-level test of it at all — it was exercised only over HTTP, in two API
// tests, one of which asserted the status code and not the error code. A rule with no unit test at
// the layer that enforces it is a rule waiting to be refactored away.
//
// ⚠ These cases are deliberately about SHAPE, not about the database: they are the fastest place to
// state what a well-formed check is, and the domain writer re-enforces every one of them (a JSONB
// payload carries no CHECK constraint, so defence in depth is the only option).

import { describe, expect, it } from 'vitest';

import { NomineeNameCheckRequest } from '../src/index.js';

const UPDATED_1 = '2026-09-20T10:00:00.000Z';
const UPDATED_2 = '2026-09-20T10:00:01.000Z';

const entry = (over: Record<string, unknown> = {}) => ({
  account_rank: 1,
  account_updated_at: UPDATED_1,
  verdict: 'matches',
  ...over,
});

const req = (accounts: unknown[], over: Record<string, unknown> = {}) => ({
  nominee_declaration_token: 'tok-abc',
  accounts,
  ...over,
});

describe('NomineeNameCheckRequest — cl.5, the reason rule', () => {
  it('⭐ ACCEPTS a well-formed pair: one matches, one clerical_difference WITH a reason', () => {
    const r = NomineeNameCheckRequest.safeParse(
      req([
        entry(),
        entry({ account_rank: 2, account_updated_at: UPDATED_2, verdict: 'clerical_difference', clerical_reason: 'initial' }),
      ]),
    );
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it('⛔ REFUSES a clerical_difference with NO reason — cl.5 verbatim', () => {
    const r = NomineeNameCheckRequest.safeParse(
      req([entry(), entry({ account_rank: 2, account_updated_at: UPDATED_2, verdict: 'clerical_difference' })]),
    );
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('must be selected');
  });

  it('⛔ REFUSES a reason on `matches` AND on `does_not_match`', () => {
    for (const verdict of ['matches', 'does_not_match'] as const) {
      const r = NomineeNameCheckRequest.safeParse(
        req([entry({ verdict, clerical_reason: 'initial' }), entry({ account_rank: 2, account_updated_at: UPDATED_2 })]),
      );
      expect(r.success, verdict).toBe(false);
      expect(JSON.stringify(r.error?.issues)).toContain('only valid for a clerical difference');
    }
  });

  it('⭐ ACCEPTS `does_not_match` with no reason — sending a claim back needs no clerical code (cl.6)', () => {
    const r = NomineeNameCheckRequest.safeParse(
      req([entry(), entry({ account_rank: 2, account_updated_at: UPDATED_2, verdict: 'does_not_match' })]),
    );
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });
});

describe('NomineeNameCheckRequest — the account set', () => {
  it('⛔ REFUSES DUPLICATE ranks — [rank 1, rank 1] used to surface as a staleness 409', () => {
    const r = NomineeNameCheckRequest.safeParse(req([entry(), entry({ account_updated_at: UPDATED_2 })]));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('each of the two accounts');
  });

  it('⛔ REFUSES one account, three accounts, and none — exactly two, always (`-226` cl.7)', () => {
    expect(NomineeNameCheckRequest.safeParse(req([entry()])).success).toBe(false);
    expect(NomineeNameCheckRequest.safeParse(req([])).success).toBe(false);
    expect(
      NomineeNameCheckRequest.safeParse(
        req([entry(), entry({ account_rank: 2, account_updated_at: UPDATED_2 }), entry({ account_rank: 1 })]),
      ).success,
    ).toBe(false);
  });

  it('⛔ REFUSES a rank outside {1, 2} — there is no rank 0 and no rank 3', () => {
    for (const rank of [0, 3, -1]) {
      expect(
        NomineeNameCheckRequest.safeParse(req([entry({ account_rank: rank }), entry({ account_rank: 2 })])).success,
        String(rank),
      ).toBe(false);
    }
  });

  it('⛔ REFUSES an empty declaration token — the staleness assertion cannot be blank', () => {
    expect(
      NomineeNameCheckRequest.safeParse(
        req([entry(), entry({ account_rank: 2, account_updated_at: UPDATED_2 })], { nominee_declaration_token: '' }),
      ).success,
    ).toBe(false);
  });
});

describe('NomineeNameCheckRequest — .strict()', () => {
  it('⛔ REFUSES a smuggled actor identity — the server resolves WHO, never the client (D3)', () => {
    for (const smuggled of [
      { actor_display: 'Someone Else' },
      { checked_by_actor_display: 'Someone Else' },
      { actor_id: '00000000-0000-0000-0000-000000000009' },
    ]) {
      const r = NomineeNameCheckRequest.safeParse(
        req([entry(), entry({ account_rank: 2, account_updated_at: UPDATED_2 })], smuggled),
      );
      expect(r.success, JSON.stringify(smuggled)).toBe(false);
    }
  });

  it('⛔ REFUSES an unknown field on an ENTRY too — strictness is not only top level', () => {
    const r = NomineeNameCheckRequest.safeParse(
      req([entry({ names_match: true }), entry({ account_rank: 2, account_updated_at: UPDATED_2 })]),
    );
    // ⛔⛔ `names_match` is precisely the field Trap 1 forbids ever existing. A permissive schema
    // would have accepted it and let a client start asserting a COMPARISON the system must never make.
    expect(r.success).toBe(false);
  });
});
