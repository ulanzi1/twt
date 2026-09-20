// Nominee name-check event payload + vocabulary + currency helpers — pure, DB-free (Story 6.18).
//
// Covers the ONE event this story mints: `ClaimNomineeNameCheckedPayloadSchema`, the 32nd claim
// event. It is `requireIdentityTransition` (`.strict()` + from_state === to_state) and carries the
// declaration token + per-account {rank, updated_at, verdict, clerical_reason} ONLY.
//
// ⭐ THE TESTS THAT MATTER MOST HERE ARE THE NEGATIVE ONES. `.strict()` is what makes Trap 4
// structural rather than aspirational: there is no field a holder name, a nominee name, a HASH of
// either, or the filer's note could be smuggled into, and the tests below try to smuggle each one.

import { describe, expect, it } from 'vitest';

import {
  CLAIM_EVENT_PAYLOAD_SCHEMAS,
  CLAIM_EVENT_TYPES,
  ClaimNomineeNameCheckedPayloadSchema,
} from '../../src/claim/events.js';
import {
  NOMINEE_NAME_CHECK_RECORDABLE_STATES,
  NOMINEE_NAME_CLERICAL_REASONS,
  NOMINEE_NAME_CHECK_VERDICTS,
  deriveNomineeDeclarationToken,
  isNomineeNameCheckCurrent,
  nomineeNameCheckClericalReasons,
  nomineeNameCheckPasses,
  type RecordedNomineeNameCheck,
} from '../../src/claim/nominee-name-check.js';
import { NOMINEE_BANK_ADMIN_CORRECTION_STATES, NOMINEE_BANK_COLLECTABLE_STATES } from '../../src/claim/errors.js';
import { CLAIM_LIFECYCLE_STATES } from '../../src/schema/claims.js';
import { claimStateMachine } from '../../src/claim/state.js';

const UPDATED_1 = '2026-09-20T10:00:00.000Z';
const UPDATED_2 = '2026-09-20T10:00:01.000Z';

const checkedBase = {
  from_state: 'verifier_review',
  to_state: 'verifier_review',
  trigger: 'district_admin_nominee_name_check',
  actor: 'operator',
  // ⭐ D3 — the acting District Admin's name, SNAPSHOT into the payload. ⛔ Required and non-empty:
  // a check nobody is named on looks like attribution and is not.
  checked_by_actor_display: 'Anita (District Admin)',
  nominee_declaration_token: 'abc123',
  accounts: [
    { account_rank: 1, account_updated_at: UPDATED_1, verdict: 'matches', clerical_reason: null },
    {
      account_rank: 2,
      account_updated_at: UPDATED_2,
      verdict: 'clerical_difference',
      clerical_reason: 'married_name',
    },
  ],
} as const;

describe('ClaimNomineeNameCheckedPayloadSchema (the 32nd claim event)', () => {
  it('is registered as a claim event type + bound in the payload-schema map', () => {
    expect(CLAIM_EVENT_TYPES).toContain('claim.nominee_name_checked');
    expect(CLAIM_EVENT_PAYLOAD_SCHEMAS['claim.nominee_name_checked']).toBe(
      ClaimNomineeNameCheckedPayloadSchema,
    );
  });

  it('⭐ this story mints EXACTLY ONE event — the return loop (AC11) adds none', () => {
    // The Pariwar Admin's return-to-District-Admin action is a METADATA-ONLY decision row on the
    // shipped `routeToR9` shape. An earlier draft of this story ordered two annotation events for
    // it; both were dropped. If a future change adds a `claim.*` event for the return, THIS is the
    // assertion that should make someone re-read AC11 before doing it.
    expect(CLAIM_EVENT_TYPES.filter((t) => t.includes('nominee_name'))).toEqual([
      'claim.nominee_name_checked',
    ]);
    expect(CLAIM_EVENT_TYPES.filter((t) => t.includes('correction_return'))).toEqual([]);
    expect(CLAIM_EVENT_TYPES.filter((t) => t.includes('returned'))).toEqual([]);
  });

  it('accepts a valid payload (both ranks, one verdict each)', () => {
    const parsed = ClaimNomineeNameCheckedPayloadSchema.parse(checkedBase);
    expect(parsed).toMatchObject({ nominee_declaration_token: 'abc123' });
  });

  it('accepts every verdict in the vocabulary, and a null clerical reason on the non-clerical ones', () => {
    for (const verdict of NOMINEE_NAME_CHECK_VERDICTS) {
      const payload = {
        ...checkedBase,
        accounts: [
          {
            account_rank: 1,
            account_updated_at: UPDATED_1,
            verdict,
            clerical_reason: verdict === 'clerical_difference' ? 'initial' : null,
          },
          checkedBase.accounts[1],
        ],
      };
      expect(() => ClaimNomineeNameCheckedPayloadSchema.parse(payload)).not.toThrow();
    }
  });

  it('requires an IDENTITY transition — a state-advancing payload is rejected', () => {
    // `-226` cl.5: the system never acts on a mismatch. A payload claiming the check moved the claim
    // is a defect, and the schema is where that is caught.
    expect(() =>
      ClaimNomineeNameCheckedPayloadSchema.parse({ ...checkedBase, to_state: 'verifier_approved' }),
    ).toThrow();
  });

  it('requires EXACTLY two account entries', () => {
    expect(() =>
      ClaimNomineeNameCheckedPayloadSchema.parse({ ...checkedBase, accounts: [checkedBase.accounts[0]] }),
    ).toThrow();
  });

  // ── Trap 4 — the smuggling attempts ───────────────────────────────────────────────────────
  it('⛔ rejects a holder name, a nominee name, a name HASH and the filer note (.strict())', () => {
    for (const smuggled of [
      { holder_name: 'Asha Devi' },
      { nominee_name: 'Asha Devi' },
      { holder_name_hash: 'e3b0c44298fc1c149afbf4c8996fb924' },
      { name_difference_note: 'the bank shortened it' },
      { names_match: true },
      { similarity_score: 0.82 },
    ]) {
      expect(
        () => ClaimNomineeNameCheckedPayloadSchema.parse({ ...checkedBase, ...smuggled }),
        `payload accepted a forbidden field: ${Object.keys(smuggled)[0]}`,
      ).toThrow();
    }
  });

  it('⛔ rejects a name smuggled into an ACCOUNT entry', () => {
    expect(() =>
      ClaimNomineeNameCheckedPayloadSchema.parse({
        ...checkedBase,
        accounts: [{ ...checkedBase.accounts[0], holder_name: 'Asha Devi' }, checkedBase.accounts[1]],
      }),
    ).toThrow();
  });

  it('⛔ rejects an `other` and a `transliteration` clerical reason (`-227` cl.9)', () => {
    for (const reason of ['other', 'transliteration', 'spelling']) {
      expect(() =>
        ClaimNomineeNameCheckedPayloadSchema.parse({
          ...checkedBase,
          accounts: [
            {
              account_rank: 1,
              account_updated_at: UPDATED_1,
              verdict: 'clerical_difference',
              clerical_reason: reason,
            },
            checkedBase.accounts[1],
          ],
        }),
      ).toThrow();
    }
    expect([...NOMINEE_NAME_CLERICAL_REASONS]).toEqual(['initial', 'married_name', 'bank_shortened_name']);
  });

  it('the reducer treats it as IDENTITY from EVERY lifecycle state (replay-robustness)', () => {
    // ⭐ `step()`, not `fold()` — fold always starts at the machine's `initial`, so it could only
    // ever prove identity from ONE state. `-226` cl.5's "the system never acts" has to hold from
    // every state a claim can be in, including the ones the writer refuses to record in: the
    // reducer stays TOTAL, and the window guard lives in the writer, never here.
    for (const state of CLAIM_LIFECYCLE_STATES) {
      const stepped = claimStateMachine.step(state, {
        type: 'claim.nominee_name_checked',
        payload: { ...checkedBase, from_state: state, to_state: state },
      } as never);
      expect(stepped, `reducer moved state from ${state}`).toBe(state);
    }
  });
});

describe('the recordable window (AC3) vs the bank-write windows (AC4)', () => {
  it('⭐ BOTH bank-write windows exclude the freeze states — no bank write is legal once the freeze begins', () => {
    // AC4 pins this: `commitCycleFreeze` carries no check precisely because nothing can change the
    // accounts after the freeze opens. If either window ever gains a freeze state, the "a corrected
    // account makes the check stale" reasoning stops covering the vote→commit window.
    for (const frozen of ['state_trustee_freeze', 'state_trustee_approved', 'approved'] as const) {
      expect(NOMINEE_BANK_COLLECTABLE_STATES as readonly string[]).not.toContain(frozen);
      expect(NOMINEE_BANK_ADMIN_CORRECTION_STATES as readonly string[]).not.toContain(frozen);
    }
  });

  it('a check is recordable in the states a corrected claim can be sitting in (D5), but never after the vote', () => {
    expect(NOMINEE_NAME_CHECK_RECORDABLE_STATES as readonly string[]).toContain('state_trustee_freeze');
    expect(NOMINEE_NAME_CHECK_RECORDABLE_STATES as readonly string[]).toContain('reversed');
    expect(NOMINEE_NAME_CHECK_RECORDABLE_STATES as readonly string[]).not.toContain('state_trustee_approved');
    expect(NOMINEE_NAME_CHECK_RECORDABLE_STATES as readonly string[]).not.toContain('approved');
  });
});

describe('deriveNomineeDeclarationToken', () => {
  const t = (rows: { rank: number; createdAt: Date }[]) => deriveNomineeDeclarationToken(rows);

  it('is deterministic and order-independent', () => {
    const a = { rank: 1, createdAt: new Date('2026-01-01T00:00:00.000Z') };
    const b = { rank: 2, createdAt: new Date('2026-01-01T00:00:00.000Z') };
    expect(t([a, b])).toBe(t([b, a]));
  });

  it('⭐ CHANGES when the declaration is replaced — the mechanism that invalidates a check', () => {
    const before = t([{ rank: 1, createdAt: new Date('2026-01-01T00:00:00.000Z') }]);
    const after = t([{ rank: 1, createdAt: new Date('2026-06-01T00:00:00.000Z') }]);
    expect(after).not.toBe(before);
  });

  it('changes when a nominee is ADDED or REMOVED', () => {
    const one = t([{ rank: 1, createdAt: new Date('2026-01-01T00:00:00.000Z') }]);
    const two = t([
      { rank: 1, createdAt: new Date('2026-01-01T00:00:00.000Z') },
      { rank: 2, createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    expect(two).not.toBe(one);
  });

  it('gives an EMPTY declaration a stable token distinct from every populated one', () => {
    expect(t([])).toBe(t([]));
    expect(t([])).not.toBe(t([{ rank: 1, createdAt: new Date('2026-01-01T00:00:00.000Z') }]));
  });
});

describe('currency + passing (AC3, AC4)', () => {
  const check: RecordedNomineeNameCheck = {
    checkedAt: new Date('2026-09-20T11:00:00.000Z'),
    checkedByActorDisplay: 'Anita Kumari',
    nomineeDeclarationToken: 'tok-1',
    eventVersion: 7,
    accounts: [
      { accountRank: 1, accountUpdatedAt: UPDATED_1, verdict: 'matches', clericalReason: null },
      { accountRank: 2, accountUpdatedAt: UPDATED_2, verdict: 'clerical_difference', clericalReason: 'initial' },
    ],
  };
  const liveAccounts = [
    { accountRank: 1, updatedAt: new Date(UPDATED_1) },
    { accountRank: 2, updatedAt: new Date(UPDATED_2) },
  ];

  it('is current when both tokens and both account timestamps match', () => {
    expect(isNomineeNameCheckCurrent(check, liveAccounts, 'tok-1')).toBe(true);
  });

  it('⭐ goes STALE when an account is edited (D5 — a post-approval correction needs a fresh check)', () => {
    const edited = [liveAccounts[0]!, { accountRank: 2, updatedAt: new Date('2026-09-20T12:00:00.000Z') }];
    expect(isNomineeNameCheckCurrent(check, edited, 'tok-1')).toBe(false);
  });

  it('⭐ goes STALE when the nominees are re-declared', () => {
    expect(isNomineeNameCheckCurrent(check, liveAccounts, 'tok-2')).toBe(false);
  });

  it('goes stale when an account disappears', () => {
    expect(isNomineeNameCheckCurrent(check, [liveAccounts[0]!], 'tok-1')).toBe(false);
  });

  it('passes when every verdict is matches or clerical_difference', () => {
    expect(nomineeNameCheckPasses(check)).toBe(true);
  });

  it('⛔ does NOT pass when any account is does_not_match — and that is never a denial (cl.6)', () => {
    const failing: RecordedNomineeNameCheck = {
      ...check,
      accounts: [
        check.accounts[0]!,
        { accountRank: 2, accountUpdatedAt: UPDATED_2, verdict: 'does_not_match', clericalReason: null },
      ],
    };
    expect(nomineeNameCheckPasses(failing)).toBe(false);
  });

  it('surfaces the AC8 highlight reasons — codes only, never a name', () => {
    expect(nomineeNameCheckClericalReasons(check)).toEqual(['initial']);
    const clean: RecordedNomineeNameCheck = {
      ...check,
      accounts: check.accounts.map((a) => ({ ...a, verdict: 'matches' as const, clericalReason: null })),
    };
    expect(nomineeNameCheckClericalReasons(clean)).toEqual([]);
  });
});

// ── Code review 2026-09-20 — the rules that lived ONLY in the HTTP schema ─────────────────────
//
// ⭐ EVERY TEST BELOW WOULD HAVE PASSED BEFORE THE FIX, because the rule it pins did not exist at
// this layer. `-226` cl.5 (*"District Admin cannot proceed unless reason for name mismatch is
// selected"*) is the one control this story calls load-bearing, and it held only for as long as the
// route stayed the single caller. A JSONB payload carries no CHECK constraint, so the payload
// schema is the last place the rule can live.
describe('ClaimNomineeNameCheckedPayloadSchema — the coherence rules (code review 2026-09-20)', () => {
  it('⛔ REFUSES a clerical_difference with a null clerical_reason (`-226` cl.5)', () => {
    const result = ClaimNomineeNameCheckedPayloadSchema.safeParse({
      ...checkedBase,
      accounts: [
        checkedBase.accounts[0],
        { account_rank: 2, account_updated_at: UPDATED_2, verdict: 'clerical_difference', clerical_reason: null },
      ],
    });
    expect(result.success).toBe(false);
    // ⚠ Asserted on the MESSAGE, not just on `.success` — a schema that refused for an unrelated
    // reason (a typo in a field name, say) would satisfy a bare `.success === false`.
    expect(JSON.stringify(result.error?.issues)).toContain('clerical_reason is required');
  });

  it('⛔ REFUSES a clerical_reason on a verdict that is not clerical_difference', () => {
    for (const verdict of ['matches', 'does_not_match'] as const) {
      const result = ClaimNomineeNameCheckedPayloadSchema.safeParse({
        ...checkedBase,
        accounts: [
          { account_rank: 1, account_updated_at: UPDATED_1, verdict, clerical_reason: 'initial' },
          checkedBase.accounts[1],
        ],
      });
      expect(result.success, verdict).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain('only permitted');
    }
  });

  it('⛔ REFUSES duplicate account ranks — `.length(2)` alone accepted [rank 1, rank 1]', () => {
    const result = ClaimNomineeNameCheckedPayloadSchema.safeParse({
      ...checkedBase,
      accounts: [checkedBase.accounts[0], { ...checkedBase.accounts[0], account_updated_at: UPDATED_2 }],
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('distinct');
  });

  it('⛔ REFUSES a missing or empty checked_by_actor_display (D3) — a check names a human or is not recorded', () => {
    const without: Record<string, unknown> = { ...checkedBase };
    delete without.checked_by_actor_display;
    expect(ClaimNomineeNameCheckedPayloadSchema.safeParse(without).success).toBe(false);
    expect(
      ClaimNomineeNameCheckedPayloadSchema.safeParse({ ...checkedBase, checked_by_actor_display: '' }).success,
    ).toBe(false);
  });

  it('⭐ ACCEPTS every clerical reason in the tuple — so a value present in one copy and missing from another cannot hide', () => {
    for (const reason of NOMINEE_NAME_CLERICAL_REASONS) {
      const result = ClaimNomineeNameCheckedPayloadSchema.safeParse({
        ...checkedBase,
        accounts: [
          checkedBase.accounts[0],
          { account_rank: 2, account_updated_at: UPDATED_2, verdict: 'clerical_difference', clerical_reason: reason },
        ],
      });
      expect(result.success, reason).toBe(true);
    }
  });

  it('⭐ the payload vocabularies are DERIVED from the domain tuples, not re-spelled', () => {
    // ⚠ The point is not that the values happen to match today — it is that the schema READS the
    // tuple, so they cannot drift. Feeding a value the tuple does not contain must be refused.
    expect(
      ClaimNomineeNameCheckedPayloadSchema.safeParse({
        ...checkedBase,
        accounts: [
          checkedBase.accounts[0],
          { account_rank: 2, account_updated_at: UPDATED_2, verdict: 'clerical_difference', clerical_reason: 'transliteration' },
        ],
      }).success,
      // ⛔ `transliteration` is exactly the reason `-227` cl.9 struck out.
    ).toBe(false);
    expect(
      ClaimNomineeNameCheckedPayloadSchema.safeParse({
        ...checkedBase,
        accounts: [
          { account_rank: 1, account_updated_at: UPDATED_1, verdict: 'unclear', clerical_reason: null },
          checkedBase.accounts[1],
        ],
      }).success,
    ).toBe(false);
  });
});
