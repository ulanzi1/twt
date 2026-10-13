// Story 6.27a (PM8, Task 1) — the ANSWER WINDOW, once: the pure decision for EVERY claim state × routed / not routed, the
// same identity behind 6.26a's old name, and the SQL twin's shape. (The SQL twin's parity against the per-claim read on a
// live database — every state × routed / not routed — is in tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts,
// "the plpgsql answer window ⇔ claim/answer-window.ts (parity)", which runs BOTH the plpgsql function and `answerWindowSql`.)

import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

import { ANSWER_WINDOW_R9_STATE, answerWindowSql, isClaimInAnswerWindow, isStateInAnswerWindow } from '../../src/claim/answer-window.js';
import { isClaimInGroundInspectionWindow } from '../../src/claim/ground-inspection-persist.js';
import { CLAIM_REVIEW_WINDOW_STATES } from '../../src/claim/review-window.js';
import { CLAIM_LIFECYCLE_STATES as CLAIM_STATES } from '../../src/schema/claims.js';

describe('the answer window (PM8)', () => {
  it("6.26a's isClaimInGroundInspectionWindow IS isClaimInAnswerWindow (same identity — ⛔ never a copy)", () => {
    expect(isClaimInGroundInspectionWindow).toBe(isClaimInAnswerWindow);
  });

  it('every claim state × routed / not routed', () => {
    for (const state of CLAIM_STATES) {
      const inReview = (CLAIM_REVIEW_WINDOW_STATES as readonly string[]).includes(state);
      expect(isStateInAnswerWindow(state, false), `${state} / not routed`).toBe(inReview);
      expect(isStateInAnswerWindow(state, true), `${state} / routed`).toBe(inReview || state === ANSWER_WINDOW_R9_STATE);
    }
    expect(isStateInAnswerWindow('closed', true)).toBe(false);
    expect(isStateInAnswerWindow('state_trustee_approved', false)).toBe(false);
  });

  it('the per-claim read asks the R9 question ONLY in state_trustee_approved', async () => {
    let calls = 0;
    const db = { execute: async () => { calls++; return { rows: [{ live: true }] }; } } as never;
    const p = 'p' as never;
    const c = 'c' as never;
    expect(await isClaimInAnswerWindow(db, p, c, 'verifier_approved')).toBe(true);
    expect(await isClaimInAnswerWindow(db, p, c, 'closed')).toBe(false);
    expect(calls).toBe(0);
    expect(await isClaimInAnswerWindow(db, p, c, 'state_trustee_approved')).toBe(true);
    expect(calls).toBe(1);
  });

  it('answerWindowSql is built from the review states + the live-R9 EXISTS, over a validated alias', () => {
    const text = new PgDialect().sqlToQuery(sql`${answerWindowSql('c')}`).sql;
    for (const s of CLAIM_REVIEW_WINDOW_STATES) expect(text).toContain(`'${s}'`);
    expect(text).toContain(`c.current_state = 'state_trustee_approved'`);
    expect(text).toContain("r9_route.outcome = 'routed_to_r9'");
    expect(() => answerWindowSql('c; drop table claims')).toThrow(/invalid claim alias/);
  });
});
