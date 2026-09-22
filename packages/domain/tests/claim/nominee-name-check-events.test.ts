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
    //
    // ⚠⚠ REWRITTEN 2026-09-22 — IT USED TO BE UNABLE TO DO THAT JOB. It filtered on the substrings
    // `nominee_name`, `correction_return` and `returned`, so it caught ⛔ only an event somebody
    // named after the mechanism. A `claim.sent_back`, `claim.pariwar_admin_rejected` or
    // `claim.correction_requested` — the names a real author is at least as likely to reach for —
    // would have sailed through all three filters and the test would have gone on reporting
    // *"EXACTLY ONE event"* ([[feedback_gate_scope_semantic_coverage]]: the guard must cover the
    // property, ⛔ not three spellings of it).
    //
    // ⭐ It is now a DIFF AGAINST THE PRE-6.18 VOCABULARY, so ANY addition fails it whatever it is
    // called. The baseline is a frozen literal on purpose: derived from `CLAIM_EVENT_TYPES` it
    // would move with the thing it is measuring.
    const PRE_6_18_CLAIM_EVENTS: readonly string[] = [
      'claim.intake_initiated',
      'claim.intake_converged',
      'claim.documents_received',
      'claim.peer_mesh_pinged',
      'claim.peer_mesh_responded',
      'claim.ground_inspection_scheduled',
      'claim.ground_inspection_completed',
      'claim.nominee_bank_recorded',
      'claim.dpdpa_consent_recorded',
      'claim.dpdpa_consent_revoked',
      'claim.verifier_reviewing',
      'claim.verifier_approved',
      'claim.verifier_denied',
      'claim.verifier_escalated',
      'claim.verifier_decision_revised',
      'claim.concealment_assessed',
      'claim.shepherd_assigned',
      'claim.state_trustee_frozen',
      'claim.state_trustee_approved',
      'claim.approved',
      'claim.state_trustee_denied',
      'claim.r9_outcome',
      'claim.appeal_stage1_initiated',
      'claim.appeal_stage1_reviewed',
      'claim.appeal_stage2_initiated',
      'claim.appeal_stage2_reviewed',
      'claim.appeal_stage3_initiated',
      'claim.appeal_stage3_reviewed',
      'claim.reversed',
      'claim.settled',
      'claim.denied_no_appeal',
    ];
    const live = [...CLAIM_EVENT_TYPES] as string[];

    // ⭐ ADDED — exactly one, and it is the one AC3 names.
    expect(live.filter((t) => !PRE_6_18_CLAIM_EVENTS.includes(t))).toEqual([
      'claim.nominee_name_checked',
    ]);
    // REMOVED — ⛔ none. A rename is an add AND a delete, and only checking additions would read a
    // rename as a clean addition.
    expect(PRE_6_18_CLAIM_EVENTS.filter((t) => !live.includes(t))).toEqual([]);
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

  // ── COHERENCE — the DOMAIN payload schema's own rules ──────────────────────────────────────
  //
  // ⚠⚠ THIS BLOCK EXISTS BECAUSE THE EVENTS TEST ⛔ ONLY EVER ACCEPTED WELL-FORMED PAYLOADS (code
  // review 2026-09-22). `packages/contracts` has a thorough `superRefine` suite for the REQUEST —
  // but the REQUEST and the EVENT PAYLOAD are two different schemas, and the event is what is
  // written to `events_log` FOREVER. A payload that only the HTTP boundary refuses is a payload a
  // direct domain caller, a backfill or a future second writer can still persist.
  it('⚠ COHERENCE — `clerical_difference` with a NULL reason is refused by the EVENT schema too', () => {
    expect(() =>
      ClaimNomineeNameCheckedPayloadSchema.parse({
        ...checkedBase,
        accounts: [
          { account_rank: 1, account_updated_at: UPDATED_1, verdict: 'clerical_difference', clerical_reason: null },
          checkedBase.accounts[1],
        ],
      }),
    ).toThrow();
  });

  it('⚠ COHERENCE — a reason on `matches` and on `does_not_match` is refused by the EVENT schema', () => {
    // ⭐ BOTH DIRECTIONS. A reason on `matches` would put a "difference" on the permanent record
    // for a claim the District Admin said had none — and AC8's highlight reads exactly that field,
    // so the flag would appear on a claim nobody flagged.
    for (const verdict of ['matches', 'does_not_match'] as const) {
      expect(() =>
        ClaimNomineeNameCheckedPayloadSchema.parse({
          ...checkedBase,
          accounts: [
            { account_rank: 1, account_updated_at: UPDATED_1, verdict, clerical_reason: 'initial' },
            checkedBase.accounts[1],
          ],
        }),
        `the event schema accepted a clerical reason on \`${verdict}\``,
      ).toThrow();
    }
  });

  it('⚠ COHERENCE — DUPLICATE ranks are refused: "exactly two" is ⛔ not just a LENGTH check', () => {
    // ⚠ The existing "requires EXACTLY two account entries" test only ever tried LENGTH 1. A
    // `[rank 1, rank 1]` payload has length two and is still incoherent — two verdicts about one
    // account and ⛔ none about the other. ⭐ That is a judgement about an account nobody looked at,
    // recorded permanently.
    expect(() =>
      ClaimNomineeNameCheckedPayloadSchema.parse({
        ...checkedBase,
        accounts: [checkedBase.accounts[0], { ...checkedBase.accounts[0] }],
      }),
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
    //
    // ⚠ WHAT THIS DOES ⛔ NOT PROVE, stated because the title invites the stronger reading (code
    // review 2026-09-22). `reduce` ends in `default: return state`, so identity is the BEHAVIOUR of
    // every unhandled event too. ⇒ deleting the explicit `case 'claim.nominee_name_checked'` would
    // change ⛔ nothing observable and this loop would still pass. It proves the PROPERTY
    // (`-226` cl.5 holds from every state), ⛔ not that the case is written down — and the property
    // is the thing cl.5 rules on, so that is the right subject. The structural half is the separate
    // assertion below.
    for (const state of CLAIM_LIFECYCLE_STATES) {
      const stepped = claimStateMachine.step(state, {
        type: 'claim.nominee_name_checked',
        payload: { ...checkedBase, from_state: state, to_state: state },
      } as never);
      expect(stepped, `reducer moved state from ${state}`).toBe(state);
    }
  });

  it('⭐⭐ …and the event appears on ⛔ NO edge of the transition table — the STRUCTURAL half', () => {
    // ⚠ THE LOOP ABOVE CANNOT CATCH THE REGRESSION THAT MATTERS. If a future change gives this
    // event a transition, it would be added HERE — and a reader of the loop above would have to
    // notice that a passing identity test had quietly stopped being true. This asserts the absence
    // directly, on the table itself.
    //
    // ⭐ `-226` cl.5 — *"the system never acts"* — is a claim about the SHAPE of the machine, ⛔ not
    // only about today's outputs: there must be ⛔ no edge for a future reader to reach for. The
    // matrix is documentation-only (the runtime authority is `reduce`), which is exactly why it is
    // worth pinning: a documentation table that disagreed with cl.5 is how the next author learns
    // the wrong rule.
    const edges = claimStateMachine.transitions ?? [];
    expect(edges.length, 'the transition table is empty — this assertion would be vacuous').toBeGreaterThan(
      20,
    );
    expect(
      edges.filter((e) => e.event === 'claim.nominee_name_checked'),
      'claim.nominee_name_checked was given a transition — `-226` cl.5 says the system NEVER acts',
    ).toEqual([]);
  });
});

describe('the recordable window (AC3) vs the bank-write windows (AC4)', () => {
  it('⭐ the two COLLECTION windows exclude the freeze states — ⚠ but this is ⛔ NOT "no bank write is legal"', () => {
    // ⚠⚠ THIS TEST WAS RE-TITLED (validate pass, 2026-09-21). It used to read *"BOTH bank-write
    // windows exclude the freeze states — no bank write is legal once the freeze begins"*, and that
    // title asserted a property the code does ⛔ NOT have.
    //
    // There are THREE bank-write windows, ⛔ not two. The two asserted below are the COLLECTION
    // windows. The third is D4's helpline-correction branch, guarded by
    // `NOMINEE_BANK_CORRECTION_BARRED_STATES = ['denied', 'approved', 'settled']` in
    // `nominee-bank-persist.ts` — which ⛔ does NOT bar `state_trustee_freeze`. So a correction write
    // IS legal during the freeze, and the old title denied it.
    //
    // ⛔ This test ⛔ cannot notice that branch: it inspects two CONSTANTS, and the third window's
    // guard is a different constant applied on a different path. The branch is proved behaviourally
    // instead, in `tests/integration/claim/nominee-name-check-return-loop.spec.ts`.
    //
    // ⚠⚠ AND THE RESTATED RULE WAS ITSELF TOO NARROW — corrected 2026-09-22. This comment used to
    // end *"the true rule is «a correction may reach a frozen claim ⛔ only while a RETURN is
    // open»"*. That is FALSE, and the AC5 block in the integration spec now proves it: the
    // District Admin's `does_not_match` verdict unlocks the correction at `state_trustee_freeze`
    // and at `reversed` with ⛔ NO return row in existence. `underCorrection` is a DISJUNCTION —
    // `isClaimUnderCorrection(hasLiveReturn && !resubmitted, checkSendsBack)` — and the old
    // sentence named ⛔ only the first disjunct.
    // ⇒ the true rule is **"a correction may reach a frozen claim while EITHER a return is open or
    //   the District Admin's current check sends it back"**, ⛔ not "nothing can be written after
    //   the freeze" and ⛔ not "only while a return is open".
    //
    // AC4's reasoning survives the correction, and this is why: `commitCycleFreeze` carries no check
    // because a correction write MAKES THE CHECK STALE, and a stale check re-blocks approval. The
    // vote→commit window is covered by staleness, ⛔ not by the write being impossible.
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

  // ── THE THREE CASES THE PREDICATE'S OWN BRANCHES ALLOW AND ⛔ NOTHING EXERCISED ─────────────
  // Added 2026-09-22 (code review). The four tests above cover the token, an edited stamp and a
  // MISSING account; the remaining shapes each take a DIFFERENT line of the function, and all three
  // are how a real bug would look.

  it('⭐ goes stale when an EXTRA live account appears — the length guard, from the other side', () => {
    // ⚠ The four tests above only ever SHRINK the live set, so `check.accounts.length !==
    // liveAccounts.length` was proven in ⛔ only one direction. A third row on a two-row claim is the
    // realistic shape (a bad insert, or a rank-3 the writer should have refused), and a check
    // recorded over two accounts must ⛔ never be current for three.
    const extra = [...liveAccounts, { accountRank: 3, updatedAt: new Date(UPDATED_1) }];
    expect(isNomineeNameCheckCurrent(check, extra, 'tok-1')).toBe(false);
  });

  it('⭐⭐ goes stale when the two ranks SWAP their timestamps — ⛔ not matched positionally', () => {
    // ⚠⚠ THE SHARPEST OF THE THREE. The function looks each live account up BY RANK
    // (`check.accounts.find(a => a.accountRank === live.accountRank)`), ⛔ not by position. An
    // implementation that zipped the two arrays index-by-index would pass every test above — same
    // length, same two timestamps present, same token — and would be WRONG: it would report a
    // check as current after the two accounts had exchanged details, which is precisely the edit a
    // name check exists to catch.
    const swapped = [
      { accountRank: 1, updatedAt: new Date(UPDATED_2) },
      { accountRank: 2, updatedAt: new Date(UPDATED_1) },
    ];
    expect(isNomineeNameCheckCurrent(check, swapped, 'tok-1')).toBe(false);

    // ⛔ NON-VACUITY: the swap is the ⛔ only difference — reversing the ARRAY ORDER alone, with
    // each rank keeping its own stamp, is still current. Without this the assertion above could be
    // passing because the function is order-sensitive, which would be a different bug.
    expect(isNomineeNameCheckCurrent(check, [liveAccounts[1]!, liveAccounts[0]!], 'tok-1')).toBe(true);
  });

  it('⭐ a SUB-MILLISECOND edit is invisible — recorded as a fact, ⛔ not asserted as a guarantee', () => {
    // ⚠⚠ SAY IT PLAINLY: the comparison is `recorded.accountUpdatedAt !== live.updatedAt
    // .toISOString()`, and JS `Date` carries MILLISECONDS. Postgres `timestamptz` carries
    // MICROSECONDS. ⇒ two edits inside the same millisecond are indistinguishable here and the
    // check reports CURRENT.
    // ⭐ This test pins the REAL behaviour so it cannot change unnoticed; it does ⛔ NOT bless it.
    // ⚠ It is un-escalated on purpose: `updated_at` moves on a DELETE-then-INSERT rewrite, and two
    // such rewrites landing in the same millisecond on the same claim would ALSO have to race
    // the claim row lock, which serialises them. ⛔ No reachability is claimed either way
    // ([[feedback_trace_reachability_before_escalating]]).
    const sameMs = [
      { accountRank: 1, updatedAt: new Date(UPDATED_1) },
      { accountRank: 2, updatedAt: new Date(UPDATED_2) },
    ];
    expect(isNomineeNameCheckCurrent(check, sameMs, 'tok-1')).toBe(true);
    // ⭐ And ONE millisecond IS enough — the resolution floor, pinned from the other side.
    const oneMsLater = [
      { accountRank: 1, updatedAt: new Date(new Date(UPDATED_1).getTime() + 1) },
      liveAccounts[1]!,
    ];
    expect(isNomineeNameCheckCurrent(check, oneMsLater, 'tok-1')).toBe(false);
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
