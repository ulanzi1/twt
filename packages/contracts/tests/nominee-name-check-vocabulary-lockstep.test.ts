// The nominee name-check VOCABULARY lockstep — Story 6.18 (code review 2026-09-20).
//
// ⭐⭐ WHY THIS FILE EXISTS. The clerical-reason tuple was written out by hand FIVE times: the
// domain vocabulary, the claim event payload, `contracts/claims/nominee-name-check.ts`,
// `contracts/claims/cycle-freeze.ts` and `contracts/claims/verifier-console.ts`. Nothing compared
// them. And the failure mode is not a type error — it is a PRODUCTION 500: `serializerCompiler`
// PARSES responses, so a value one copy carries and another lacks means a District Admin records a
// perfectly valid reason and the Pariwar Admin's page then fails to serialize, with no failing test
// anywhere.
//
// Three of the five copies are now IMPORTS of a single tuple. This suite pins the two that must
// stay separate — the contracts tuple and its `@twt/domain` twin, which cannot import each other
// (the browser-bundle rule forbids a contract importing the domain) — and then feeds EVERY value
// through EVERY schema that carries one, so a future sixth copy cannot be added silently.

import { describe, expect, it } from 'vitest';

import { claim as claimDomain } from '@twt/domain';

import {
  CycleFreezePendingItem,
  NomineeNameCheckVerdict,
  NomineeNameClericalReason,
  NomineeNameCheckRequest,
  VerifierConsolePacket,
} from '../src/index.js';

const CLAIM = '00000000-0000-0000-0000-000000000001';
const MEMBER = '00000000-0000-0000-0000-000000000002';
const UPDATED_1 = '2026-09-20T10:00:00.000Z';
const UPDATED_2 = '2026-09-20T10:00:01.000Z';

describe('the clerical-reason + verdict tuples are in lockstep, contracts ↔ domain', () => {
  it('⭐ the contracts clerical-reason tuple EQUALS the domain one, in order', () => {
    expect(NomineeNameClericalReason.options).toEqual([...claimDomain.NOMINEE_NAME_CLERICAL_REASONS]);
  });

  it('⭐ the contracts verdict tuple EQUALS the domain one, in order', () => {
    expect(NomineeNameCheckVerdict.options).toEqual([...claimDomain.NOMINEE_NAME_CHECK_VERDICTS]);
  });

  it('⛔ neither tuple carries `transliteration` — `-227` cl.9 struck it out', () => {
    expect(NomineeNameClericalReason.options).not.toContain('transliteration');
    expect([...claimDomain.NOMINEE_NAME_CLERICAL_REASONS]).not.toContain('transliteration');
  });

  it('⛔ neither tuple carries `other` — `-226` cl.6 sends a non-clerical difference BACK', () => {
    expect(NomineeNameClericalReason.options).not.toContain('other');
  });
});

describe('EVERY clerical reason parses through EVERY schema that carries one', () => {
  // ⚠ `bank_shortened_name` was accepted by NO schema in any test before this — the value most
  // likely to be dropped from a hand-written copy was the one nothing exercised.
  for (const reason of claimDomain.NOMINEE_NAME_CLERICAL_REASONS) {
    it(`'${reason}' — the WRITE request (AC3)`, () => {
      const r = NomineeNameCheckRequest.safeParse({
        nominee_declaration_token: 'tok',
        accounts: [
          { account_rank: 1, account_updated_at: UPDATED_1, verdict: 'clerical_difference', clerical_reason: reason },
          { account_rank: 2, account_updated_at: UPDATED_2, verdict: 'matches' },
        ],
      });
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    });

    it(`'${reason}' — the cycle-freeze pending item (AC8, the Pariwar Admin's card)`, () => {
      const r = CycleFreezePendingItem.safeParse({
        claim_case_id: CLAIM,
        deceased_member_id: MEMBER,
        current_state: 'verifier_approved',
        verifier_decision_id: null,
        verifier_actor_display: null,
        verifier_reason_code: null,
        verifier_rationale: null,
        signals_summary: '',
        concealment_flags: [],
        routed_to_r9: false,
        under_correction: false,
        name_difference_reasons: [reason],
      });
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    });

    it(`'${reason}' — the verifier console's name-check status (AC8, the District Admin's console)`, () => {
      // ⚠ Parsed through the FULL packet, because the serializer parses the whole response — a
      // section schema tested in isolation would not prove the response can be emitted.
      const section = VerifierConsolePacket.shape.nomineeNameCheck.safeParse({
        available: true,
        accountsComplete: true,
        currentAndPassing: true,
        differenceReasons: [reason],
      });
      expect(section.success, JSON.stringify(section.error?.issues)).toBe(true);
    });
  }

  it('⛔ a reason OUTSIDE the tuple is refused by all three — the tuples are closed', () => {
    for (const bad of ['transliteration', 'other', 'nickname', '']) {
      expect(
        NomineeNameCheckRequest.safeParse({
          nominee_declaration_token: 'tok',
          accounts: [
            { account_rank: 1, account_updated_at: UPDATED_1, verdict: 'clerical_difference', clerical_reason: bad },
            { account_rank: 2, account_updated_at: UPDATED_2, verdict: 'matches' },
          ],
        }).success,
        bad,
      ).toBe(false);
      expect(
        VerifierConsolePacket.shape.nomineeNameCheck.safeParse({
          available: true,
          accountsComplete: true,
          currentAndPassing: true,
          differenceReasons: [bad],
        }).success,
        bad,
      ).toBe(false);
    }
  });
});
