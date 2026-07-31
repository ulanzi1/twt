// The flag registry's DB-free surface — Story 10.8 (Task 2/11; AC1/AC3/AC9).
//
// The live-DB behaviour (three-tier resolution, the flip, conflict → 409) is exercised in
// tests/integration/feature-flags/. These are the properties that need no database.

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Db } from '../../src/db.js';
import * as capabilityBar from '../../src/feature-flags/capability-bar.js';
import { FlagKeyNotAllowlistedError, FlagVersionInvalidError } from '../../src/feature-flags/errors.js';
import {
  DEFAULT_FLAG_VERSION,
  FLAG_DEFAULTS,
  FLAG_KEYS,
  createFlagVersion,
  defaultFlagDocument,
  isRegisteredFlag,
  validateFlagVersionInput,
  type CreateFlagVersionInput,
} from '../../src/feature-flags/registry.js';
import type { PariwarId } from '../../src/ids/index.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111' as PariwarId;

function input(overrides: Partial<CreateFlagVersionInput> = {}): CreateFlagVersionInput {
  return {
    flagKey: 'kyc_manual_fallback',
    pariwarId: PARIWAR,
    state: 'canary',
    cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: ['patna'] }] },
    fallbackDefault: true,
    owner: 'kyc-desk',
    deadBy: new Date('2027-06-30T00:00:00.000Z'),
    rationale: 'staged DigiLocker cutover for the Patna pilot',
    ...overrides,
  };
}

describe('the flag registry (code data)', () => {
  it('the code default owns version 1, so persisted rows start at 2', () => {
    // This is what makes (pariwar_id, flag_key, version) an unambiguous replay pin without a
    // separate version-id column — the 10.1 default-owns-v1 trick.
    expect(DEFAULT_FLAG_VERSION).toBe(1);
    expect(defaultFlagDocument('kyc_manual_fallback')?.version).toBe(1);
  });

  it('EVERY default is `off` — a flag’s arrival must never itself change behaviour', () => {
    // The flip is the event, not the deploy. A default of anything but `off` would mean merging the
    // flag changed production, which is precisely the un-audited behaviour change flags exist to avoid.
    for (const key of FLAG_KEYS) {
      expect(FLAG_DEFAULTS[key]?.state).toBe('off');
    }
  });

  it('every registered flag carries lifecycle accountability (owner + dead_by + description)', () => {
    for (const key of FLAG_KEYS) {
      const def = FLAG_DEFAULTS[key]!;
      expect(def.owner.trim().length).toBeGreaterThan(0);
      expect(def.deadBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(def.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('does NOT seed `beta_ux_patterns` (Decision 9)', () => {
    // The epic's seed list names it, but it appears exactly once in the whole corpus with no FR/AR/
    // UX-spec backing. An allowlist entry for an undefined behaviour cannot be gate-checked, and
    // admitting one would normalise the silent expansion this story exists to prevent.
    expect(FLAG_KEYS).not.toContain('beta_ux_patterns');
  });

  it('`defaultFlagDocument` returns a FRESH DEEP copy, never the shared constant', () => {
    // An admin cloning-then-editing the default must not corrupt the seed for every other caller.
    // Deep, not one-level: a clause holds a `values` ARRAY, which a `{...c}` would still share.
    const a = defaultFlagDocument('kyc_manual_fallback')!;
    const b = defaultFlagDocument('kyc_manual_fallback')!;
    expect(a).not.toBe(b);
    expect(a.cohortDefinition).not.toBe(b.cohortDefinition);
    a.cohortDefinition.clauses.push({ dimension: 'district', op: 'in', values: ['x'] });
    expect(defaultFlagDocument('kyc_manual_fallback')!.cohortDefinition.clauses).toHaveLength(0);
  });

  it('returns null for an unregistered key rather than inventing one', () => {
    expect(defaultFlagDocument('not_a_flag')).toBeNull();
    expect(isRegisteredFlag('not_a_flag')).toBe(false);
    expect(isRegisteredFlag('kyc_manual_fallback')).toBe(true);
  });
});

describe('validateFlagVersionInput — write-time validation (a bad rule must surface to its author)', () => {
  it('accepts a well-formed input', () => {
    expect(() => validateFlagVersionInput(input())).not.toThrow();
  });

  it('rejects an UNREGISTERED flag key', () => {
    expect(() => validateFlagVersionInput(input({ flagKey: 'invented_at_runtime' }))).toThrow(FlagVersionInvalidError);
  });

  it('requires a non-empty rationale — FR-58C mandates actor + rationale on every flag change', () => {
    expect(() => validateFlagVersionInput(input({ rationale: '   ' }))).toThrow(/rationale must be non-empty/);
  });

  it('bounds the rationale so it stays a governance note, not a free-text PII sink', () => {
    expect(() => validateFlagVersionInput(input({ rationale: 'x'.repeat(501) }))).toThrow(/at most 500/);
  });

  it('requires an owner (lifecycle accountability)', () => {
    expect(() => validateFlagVersionInput(input({ owner: '' }))).toThrow(/owner must be non-empty/);
  });

  it('rejects an unknown cohort dimension or op — the predicate is BOUNDED, not an expression language', () => {
    expect(() =>
      validateFlagVersionInput(input({ cohortDefinition: { clauses: [{ dimension: 'zodiac', op: 'in', values: ['leo'] }] } })),
    ).toThrow(/not a valid cohort dimension/);
    expect(() =>
      validateFlagVersionInput(input({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'regex', values: ['p.*'] }] } })),
    ).toThrow(/not a valid cohort operator/);
  });

  it('rejects an empty value list and an `eq` with multiple values', () => {
    expect(() =>
      validateFlagVersionInput(input({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'in', values: [] }] } })),
    ).toThrow(/values must be non-empty/);
    expect(() =>
      validateFlagVersionInput(input({ cohortDefinition: { clauses: [{ dimension: 'district', op: 'eq', values: ['a', 'b'] }] } })),
    ).toThrow(/requires exactly one value/);
  });

  it('rejects an effective window that ends before it starts', () => {
    expect(() =>
      validateFlagVersionInput(
        input({ effectiveFrom: new Date('2026-06-01'), effectiveUntil: new Date('2026-05-01') }),
      ),
    ).toThrow(/effective_until must be strictly after/);
  });

  it('reports EVERY reason at once so one round-trip fixes the form', () => {
    let thrown: unknown;
    try {
      validateFlagVersionInput(input({ flagKey: 'nope', rationale: '', owner: '' }));
    } catch (e) {
      thrown = e;
    }
    expect((thrown as FlagVersionInvalidError).reasons.length).toBeGreaterThanOrEqual(3);
  });
});

describe('createFlagVersion — the runtime capability-bar backstop (errors.ts: "the bar cannot be bypassed at runtime")', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('⚠ REVERT-SANITY: throws FlagKeyNotAllowlistedError when a registered key is NOT admitted to the bar', async () => {
    // Simulates the drift the CI gate (scripts/governance-boundary) exists to prevent at build
    // time — this is the write-path guarantee that holds even if the gate were ever skipped or its
    // result stale (a bar on disk that lagged the deployed FLAG_DEFAULTS). The check runs before
    // any DB access, so an unused `Db` stub is enough to prove the guard fires.
    vi.spyOn(capabilityBar, 'loadCapabilityBar').mockReturnValue({
      version: 1,
      count: 0,
      kinds: [],
      allow: [], // deliberately empty — no key is admitted
      prohibited: [{ root: 'packages/domain/src/audit', prohibition: 'x' }],
    });
    await expect(
      createFlagVersion(undefined as unknown as Db, input()),
    ).rejects.toBeInstanceOf(FlagKeyNotAllowlistedError);
  });

  it('does NOT throw the bar check when the key IS admitted (reaches real DB access instead)', async () => {
    // Guards the guard: confirms the check is not vacuously always-throwing. A `Db` stub that fails
    // loudly on first use proves control passed the bar check and reached the real DB path.
    vi.spyOn(capabilityBar, 'loadCapabilityBar');
    const dbStub = {
      select: () => {
        throw new Error('reached-db-after-bar-check');
      },
    } as unknown as Db;
    await expect(createFlagVersion(dbStub, input())).rejects.toThrow('reached-db-after-bar-check');
  });
});
