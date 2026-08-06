// ⭐ THE HARM GATE — Story 10.26 (Task 1; AC5, D4). PURE, DB-free.
//
// ⚖ The invariant this file pins (RATIFIED — D4, and constitutional since 2026-08-06):
//
//     A clause may influence trustee UNDERSTANDING without influencing trustee SUSPICION.
//
// `deriveViolatorFlags` (`@twt/domain` `trustee-lite/violator-flags.ts:209-216`) maps EVERY R7 clause
// id it finds in `applicableNiyamavaliClauses[]` into a violator flag on the surface that feeds
// SUSPENSION decisions — no `applied` check, no outcome check. 10.24 D2 made that filtering the
// PRODUCER's obligation, discharged upstream, with that module frozen.
//
// R7(G) applies exactly when a member told the truth about their own life (a bereavement, an illness,
// a caregiving crisis). So the naive activation of R7(G) produces a system in which disclosing a
// father's death acquires a suspension-candidate flag. `docs/legal/niyamavali.md:81` — the Trustee
// Panel's ratified §3.1 — says the assertion "carries no consequence of its own", and a flag on that
// surface IS a consequence. The exclusion below is therefore constitutional, not merely humane.
//
// The predicate reads the clause PAYLOAD, never the clause id (`ladder.ts:11-14` / `r7-ladder.ts:14-17`
// — "There is NO `switch (clauseId)` / branch keyed by registry identity"), so a trustee amendment
// moves it without a code change and any future purely-declarative clause is excluded automatically.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { R7_CLAUSE_IDS } from '@twt/niyamavali-engine';
import { describe, expect, it } from 'vitest';

import {
  RESTORATION_OBLIGATION_KEYS,
  imposesRestorationObligation,
} from '../src/rules.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SEED = path.join(repoRoot, 'packages/domain/seed/niyamavali-v1-clauses.sql');

/**
 * The SEEDED R7(A)–(G) payloads, read out of the seed SQL itself (AC5: "walks the SEEDED payloads").
 * Deliberately NOT re-spelled as fixtures: a fixture would pin what this test's author believed the
 * registry says, and the whole point of a DATA-driven predicate is that the registry is the authority.
 */
function seededR7Payloads(): Map<string, Record<string, unknown>> {
  const sql = readFileSync(SEED, 'utf8');
  const byClauseId = new Map<string, Record<string, unknown>>();
  // Each seeded row is `'niy.contribution-discipline.r7-x',` … `'{…}'::jsonb,` within one VALUES tuple.
  for (const match of sql.matchAll(/'(niy\.contribution-discipline\.r7-[a-g])'[\s\S]*?'(\{"rule_code"[\s\S]*?\})'::jsonb/g)) {
    byClauseId.set(match[1]!, JSON.parse(match[2]!) as Record<string, unknown>);
  }
  return byClauseId;
}

/**
 * Restoration-block keys that are NOT obligations: they QUALIFY an obligation prescribed by some other
 * key (`one_time_only`, `lifetime_max` bound R7(A)'s consecutive requirement), or they are the payload
 * stating in its own words that it prescribes nothing (`never_excuses`).
 *
 * Listed here rather than in `src/` on purpose: this is the test's ledger of what it has SEEN and
 * classified, so a trustee amendment that introduces an unclassified key fails loudly instead of being
 * silently swept into "no obligation" ([[feedback_gate_scope_semantic_coverage]] — a green scan over an
 * unexamined vocabulary proves nothing).
 */
const KNOWN_NON_OBLIGATION_KEYS = ['one_time_only', 'lifetime_max', 'never_excuses'] as const;

describe('AC5 — imposesRestorationObligation over the SEEDED R7(A)–(G) payloads', () => {
  const seeded = seededR7Payloads();

  it('the seed carries all seven R7 clauses (the walk is over the real family, not a subset)', () => {
    expect([...seeded.keys()].sort()).toEqual([...R7_CLAUSE_IDS].sort());
  });

  it.each([
    ['niy.contribution-discipline.r7-a', true, 'consecutive_required: 3 (lock_in_months is 0 — the consecutive requirement is the obligation)'],
    ['niy.contribution-discipline.r7-b', true, 'consecutive_required: 5 + lock_in_months: 3'],
    ['niy.contribution-discipline.r7-c', true, 'consecutive_required: 5 + lock_in_months: 3'],
    ['niy.contribution-discipline.r7-d', true, 'lock_in_months: 3 + catch_up_required'],
    ['niy.contribution-discipline.r7-e', true, 'lock_in_months: 5 + complete_all'],
    ['niy.contribution-discipline.r7-f', true, 'lock_in_months: 5 + complete_all'],
    ['niy.contribution-discipline.r7-g', false, 'never_excuses: true — the payload saying it imposes NOTHING'],
  ])('%s → %s (%s)', (clauseId, expected) => {
    const payload = seeded.get(clauseId);
    expect(payload, `${clauseId} is missing from the seed`).toBeDefined();
    expect(imposesRestorationObligation(payload!)).toBe(expected);
  });

  it('EXACTLY ONE seeded R7 clause imposes nothing — the exclusion is narrow, not a blanket', () => {
    const imposing = [...seeded.entries()].filter(([, p]) => imposesRestorationObligation(p));
    expect(imposing.length).toBe(6);
    expect(seeded.size - imposing.length).toBe(1);
  });

  it('every key in every seeded restoration block is CLASSIFIED — an unknown key fails loudly', () => {
    const classified = new Set<string>([...RESTORATION_OBLIGATION_KEYS, ...KNOWN_NON_OBLIGATION_KEYS]);
    const unclassified: string[] = [];
    for (const [clauseId, payload] of seeded) {
      const restoration = payload.restoration as Record<string, unknown> | undefined;
      for (const key of Object.keys(restoration ?? {})) {
        if (!classified.has(key)) unclassified.push(`${clauseId}.restoration.${key}`);
      }
    }
    expect(
      unclassified,
      'A restoration key appeared that this predicate has never been reasoned about. It is currently ' +
        'treated as NOT an obligation, which SUPPRESSES a violator flag. Classify it deliberately.',
    ).toEqual([]);
  });
});

describe('AC5 — the predicate is DATA-driven and reads prescription, not presence', () => {
  it('an absent or malformed restoration block imposes nothing', () => {
    expect(imposesRestorationObligation({})).toBe(false);
    expect(imposesRestorationObligation({ restoration: null })).toBe(false);
    expect(imposesRestorationObligation({ restoration: 'lock-in' })).toBe(false);
    expect(imposesRestorationObligation({ restoration: {} })).toBe(false);
  });

  it('a ZERO or negative numeric requirement is not a prescription (R7(A) ships lock_in_months: 0)', () => {
    expect(imposesRestorationObligation({ restoration: { lock_in_months: 0 } })).toBe(false);
    expect(imposesRestorationObligation({ restoration: { consecutive_required: 0 } })).toBe(false);
    expect(imposesRestorationObligation({ restoration: { lock_in_months: -1 } })).toBe(false);
    expect(imposesRestorationObligation({ restoration: { lock_in_months: 1 } })).toBe(true);
  });

  it('a FALSE boolean requirement is not a prescription; only `true` prescribes', () => {
    expect(imposesRestorationObligation({ restoration: { complete_all: false } })).toBe(false);
    expect(imposesRestorationObligation({ restoration: { catch_up_required: false } })).toBe(false);
    expect(imposesRestorationObligation({ restoration: { complete_all: true } })).toBe(true);
  });

  it('a trustee amendment moves the predicate WITHOUT a code change — R7(G) given a lock-in imposes', () => {
    // The falsifying case for "this is a euphemism for `clauseId === r7-g`". Same clause id, amended
    // payload, opposite answer.
    expect(
      imposesRestorationObligation({
        rule_code: 'R7(G)',
        restoration: { never_excuses: true, lock_in_months: 3 },
      }),
    ).toBe(true);
  });

  it('a NEW purely-declarative clause is excluded automatically (D4: the predicate is not clause-scoped)', () => {
    expect(
      imposesRestorationObligation({ rule_code: 'R7(H)', restoration: { acknowledged_only: true } }),
    ).toBe(false);
  });
});
