// Trustee-Lite contracts — Story 10.11 (Task 3; AC4/AC6/AC8/AC10).
//
// THREE jobs:
//   (1) the test-only sync-guard binding the contract enums to the @twt/domain source tuples
//       (contracts cannot import domain in SHIPPED files — the RN Metro bundle boundary — so this
//       test, which never ships, is the mechanical drift guard,
//       [[project_contracts_domain_bundle_boundary]]);
//   (2) the AC4 FROZEN-KEY assertion on `ViolatorFlag`: its key set must equal the permitted set
//       EXACTLY, and no key may be recommendation-shaped. This is the structural half of
//       "detection only" — the copy half is the `moderation-advice` microcopy rule;
//   (3) the AC6 optionality contract: a section key is genuinely omissible, and ABSENT is
//       representable distinctly from EMPTY — the wire property the whole scope-respecting design
//       rests on.

import { trusteeLite } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  TRUSTEE_CROSS_LINK_KINDS,
  TRUSTEE_SIGNAL_CATEGORIES,
  TRUSTEE_SIGNAL_SEVERITIES,
  TrusteeCrossLinkKind,
  TrusteeLiteResponse,
  TrusteeSignalCategory,
  TrusteeSignalRow,
  TrusteeSignalSeverity,
  VIOLATOR_FLAG_FORBIDDEN_KEY_PATTERN,
  VIOLATOR_FLAG_PERMITTED_KEYS,
  ViolatorFlag,
  ViolatorFlagsSection,
} from '../src/trustee-lite/index.js';

// ── (1) the sync-guard ───────────────────────────────────────────────────────────────────────

describe('trustee-lite contract ↔ domain sync-guard', () => {
  it('TrusteeSignalCategory matches the domain TRUSTEE_SIGNAL_CATEGORIES tuple, IN ORDER', () => {
    // Order is not incidental: the domain's declared order is the AC2 tie-break's first key, so a
    // silent re-ordering on either side would change the rendered worklist order.
    expect([...TrusteeSignalCategory.options]).toEqual([...trusteeLite.TRUSTEE_SIGNAL_CATEGORIES]);
    expect([...TRUSTEE_SIGNAL_CATEGORIES]).toEqual([...trusteeLite.TRUSTEE_SIGNAL_CATEGORIES]);
  });

  it('TrusteeCrossLinkKind matches the domain TRUSTEE_CROSS_LINK_KINDS tuple', () => {
    expect([...TrusteeCrossLinkKind.options]).toEqual([...trusteeLite.TRUSTEE_CROSS_LINK_KINDS]);
    expect([...TRUSTEE_CROSS_LINK_KINDS]).toEqual([...trusteeLite.TRUSTEE_CROSS_LINK_KINDS]);
  });

  it('TrusteeSignalSeverity matches the domain severity-order tuple', () => {
    expect([...TrusteeSignalSeverity.options]).toEqual([...trusteeLite.TRUSTEE_SIGNAL_SEVERITY_ORDER]);
    expect([...TRUSTEE_SIGNAL_SEVERITIES]).toEqual([...trusteeLite.TRUSTEE_SIGNAL_SEVERITY_ORDER]);
  });

  it('the contract carries exactly seven categories (six sources + the violator arm)', () => {
    expect(TRUSTEE_SIGNAL_CATEGORIES).toHaveLength(7);
    expect(TRUSTEE_SIGNAL_CATEGORIES).toContain('violator_flag');
  });
});

// ── (2) the AC4 frozen-key assertion ─────────────────────────────────────────────────────────

const validFlag = {
  clause_id: 'niy.contribution-discipline.r7-f',
  clause_label: 'r7_restoration_required · rule.contribution_gap_six_months',
  facts_establishing: [{ key: 'contribution.months_since_last', value: 7 }],
  holding_since: '2026-01-15T00:00:00.000Z',
};

describe('ViolatorFlag — the FROZEN key set (AC4)', () => {
  it('the parsed key set equals the permitted set EXACTLY', () => {
    const parsed = ViolatorFlag.parse(validFlag);
    expect(Object.keys(parsed).sort()).toEqual([...VIOLATOR_FLAG_PERMITTED_KEYS].sort());
  });

  it('the DTO shape itself declares exactly those keys (not just this one instance)', () => {
    expect(Object.keys(ViolatorFlag.shape).sort()).toEqual([...VIOLATOR_FLAG_PERMITTED_KEYS].sort());
  });

  it('NO key is recommendation-shaped', () => {
    // The forward guard: a future field cannot smuggle a recommendation in under a different name.
    for (const key of Object.keys(ViolatorFlag.shape)) {
      expect(key, `\`${key}\` reads as a recommendation`).not.toMatch(VIOLATOR_FLAG_FORBIDDEN_KEY_PATTERN);
    }
  });

  it('the forbidden pattern actually matches the names it is meant to catch (not a vacuous regex)', () => {
    // A frozen-key test whose regex silently matched nothing would pass forever while enforcing
    // nothing. Pin the regex itself against the names this AC exists to reject.
    for (const name of [
      'recommended_action',
      'suggested_outcome',
      'advisory_note',
      'severity',
      'urgency',
      'priority',
      'rank',
      'risk_score',
    ]) {
      expect(name, `the guard must reject \`${name}\``).toMatch(VIOLATOR_FLAG_FORBIDDEN_KEY_PATTERN);
    }
  });

  it('.strict() REJECTS an added recommendation field rather than stripping it silently', () => {
    expect(() => ViolatorFlag.parse({ ...validFlag, recommended_action: 'suspend' })).toThrow();
    expect(() => ViolatorFlag.parse({ ...validFlag, severity: 'breached' })).toThrow();
  });

  it('holding_since is nullable — an unestablished onset is representable', () => {
    expect(ViolatorFlag.parse({ ...validFlag, holding_since: null }).holding_since).toBeNull();
  });
});

describe('ViolatorFlagsSection — a discriminated union, never a bare list (AC4)', () => {
  it('detection_unavailable carries the producer and has NO members field', () => {
    const parsed = ViolatorFlagsSection.parse({ status: 'detection_unavailable', producer: 'story-10-24' });
    expect(parsed).toEqual({ status: 'detection_unavailable', producer: 'story-10-24' });
    expect(parsed).not.toHaveProperty('members');
  });

  it('rejects a detection_unavailable that tries to also carry members (the two states cannot blur)', () => {
    expect(() =>
      ViolatorFlagsSection.parse({ status: 'detection_unavailable', producer: 'story-10-24', members: [] }),
    ).toThrow();
  });

  it('an `ok` section with an EMPTY member list is valid and DISTINCT from the gap state', () => {
    // The whole point of the union: `{status:'ok', members:[]}` means "detection ran, nobody is
    // flagged"; `{status:'detection_unavailable'}` means "nothing checked". They must not be the
    // same value on the wire.
    const empty = ViolatorFlagsSection.parse({ status: 'ok', members: [] });
    expect(empty).toEqual({ status: 'ok', members: [] });
    expect(empty).not.toEqual(ViolatorFlagsSection.parse({ status: 'detection_unavailable', producer: 'x' }));
  });

  it('rejects a status the contract does not define', () => {
    expect(() => ViolatorFlagsSection.parse({ status: 'unknown', members: [] })).toThrow();
  });
});

// ── (3) AC6 optionality + AC2 nullability + AC8 no-ciphertext ────────────────────────────────

const validRow = {
  category: 'reconciliation',
  source_key: 'mismatch:pool-a:member-a',
  resource_id: '33333333-3333-4333-8333-333333333333',
  claim_case_id: null,
  label: 'mismatch · amount_mismatch',
  age_ms: 172800000,
  raised_at: '2026-08-03T12:00:00.000Z',
  deadline_at: '2026-08-10T12:00:00.000Z',
  severity: 'on_track',
  cross_link_kind: 'reconciliation_review',
};

describe('TrusteeSignalRow — the wire shape (AC1/AC2/AC8)', () => {
  it('accepts a valid snake_case row', () => {
    expect(TrusteeSignalRow.parse(validRow).source_key).toBe('mismatch:pool-a:member-a');
  });

  it('accepts the fully-undated row an undated source produces (AC2)', () => {
    const undated = TrusteeSignalRow.parse({
      ...validRow,
      category: 'cycle_freeze',
      age_ms: null,
      raised_at: null,
      deadline_at: null,
      severity: null,
      cross_link_kind: 'cycle_freeze',
    });
    expect(undated.deadline_at).toBeNull();
    expect(undated.severity).toBeNull();
  });

  it('rejects a NEGATIVE age (a future-dated instant must be clamped, never emitted)', () => {
    expect(() => TrusteeSignalRow.parse({ ...validRow, age_ms: -1 })).toThrow();
  });

  it('.strict() REJECTS a ciphertext field (AC8 — nothing on this surface is encrypted)', () => {
    expect(() => TrusteeSignalRow.parse({ ...validRow, rationale_ciphertext: 'ENC(x)' })).toThrow();
  });
});

describe('TrusteeLiteResponse — ABSENT ≠ EMPTY (AC6)', () => {
  it('parses with NO sections at all (every section key is genuinely optional)', () => {
    const parsed = TrusteeLiteResponse.parse({ evaluated_at: '2026-08-05T12:00:00.000Z' });
    expect(parsed.r9_voting).toBeUndefined();
    expect('r9_voting' in parsed).toBe(false);
  });

  it('an ABSENT section and an EMPTY section are distinguishable after parsing', () => {
    // The wire property the scope-respecting design rests on: if the parser materialized absent
    // sections as `[]`, "you may not see this" would render identically to "there is nothing here".
    const absent = TrusteeLiteResponse.parse({ evaluated_at: '2026-08-05T12:00:00.000Z' });
    const empty = TrusteeLiteResponse.parse({ evaluated_at: '2026-08-05T12:00:00.000Z', r9_voting: [] });
    expect(absent.r9_voting).toBeUndefined();
    expect(empty.r9_voting).toEqual([]);
    expect(absent.r9_voting).not.toEqual(empty.r9_voting);
  });

  it('every one of the six row sections plus the violator section is optional', () => {
    for (const key of [
      'cycle_freeze',
      'r9_voting',
      'concealment',
      'appeal',
      'reconciliation',
      'moderation',
    ] as const) {
      const parsed = TrusteeLiteResponse.parse({ evaluated_at: '2026-08-05T12:00:00.000Z', [key]: [validRow] });
      expect(parsed[key]).toHaveLength(1);
    }
    const withViolator = TrusteeLiteResponse.parse({
      evaluated_at: '2026-08-05T12:00:00.000Z',
      violator_flags: { status: 'detection_unavailable', producer: 'story-10-24' },
    });
    expect(withViolator.violator_flags?.status).toBe('detection_unavailable');
  });

  it('.strict() rejects an unknown section key', () => {
    expect(() =>
      TrusteeLiteResponse.parse({ evaluated_at: '2026-08-05T12:00:00.000Z', kanban_columns: [] }),
    ).toThrow();
  });
});
