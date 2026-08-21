// Directory-publication kill-switch contract tests — Story 10.30 (Task 7; AC1, AC5).
//
// (1) `.strict()` discipline; (2) ⭐ the `rationale` `.trim().min(1)` boundary — THE 400 the story
// requires, proven to reject whitespace and not merely emptiness; (3) ⛔ that `changedByDisplay` is
// UNREPRESENTABLE on the wire (Trap 2 — proven unrepresentable, not merely unused); (4) the status
// response shape, including the explicit `configured` flag.

import { describe, expect, it } from 'vitest';

import {
  DirectoryPublicationStatusResponse,
  SetDirectoryPublicationRequest,
} from '../src/directory-publication/index.js';

describe('SetDirectoryPublicationRequest', () => {
  it('accepts a disable with a rationale', () => {
    const parsed = SetDirectoryPublicationRequest.parse({
      enabled: false,
      rationale: 'Pulled pending a privacy review.',
    });
    expect(parsed.enabled).toBe(false);
    expect(parsed.rationale).toBe('Pulled pending a privacy review.');
  });

  it('accepts an enable with a rationale (the switch moves in BOTH directions)', () => {
    const parsed = SetDirectoryPublicationRequest.parse({ enabled: true, rationale: 'Review cleared.' });
    expect(parsed.enabled).toBe(true);
  });

  it('trims the rationale', () => {
    const parsed = SetDirectoryPublicationRequest.parse({ enabled: false, rationale: '  spaced  ' });
    expect(parsed.rationale).toBe('spaced');
  });

  it('REJECTS an empty rationale (the 400 boundary — ⛔ never the domain 500)', () => {
    const result = SetDirectoryPublicationRequest.safeParse({ enabled: false, rationale: '' });
    expect(result.success).toBe(false);
  });

  // ⭐ The load-bearing case. `.min(1)` alone would ACCEPT '   ' and let it reach
  // `setDirectoryPublicationEnabled`'s own `rationale.trim() === ''` throw — which is an
  // unregistered non-ApiError and would surface as a 500 on a plain input error.
  it('REJECTS a whitespace-only rationale (⛔ NOT merely an empty string)', () => {
    for (const rationale of ['   ', '\t', '\n', ' \t\n ']) {
      const result = SetDirectoryPublicationRequest.safeParse({ enabled: false, rationale });
      expect(result.success, `expected ${JSON.stringify(rationale)} to be rejected`).toBe(false);
    }
  });

  it('REJECTS a rationale over the 2000-character bound', () => {
    const result = SetDirectoryPublicationRequest.safeParse({
      enabled: false,
      rationale: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  // ⛔ Trap 2 — a client-supplied display name would let an operator's browser lie about who pulled a
  // Pariwar's directory. `.strict()` makes the field UNREPRESENTABLE, not merely ignored.
  it('⛔ REJECTS a client-supplied changedByDisplay (Trap 2 — unrepresentable on the wire)', () => {
    const result = SetDirectoryPublicationRequest.safeParse({
      enabled: false,
      rationale: 'r',
      changedByDisplay: 'Somebody Else',
    });
    expect(result.success).toBe(false);
  });

  it('⛔ REJECTS any other unknown key (.strict())', () => {
    const result = SetDirectoryPublicationRequest.safeParse({
      enabled: false,
      rationale: 'r',
      pariwarId: '3f8c1d0e-0000-4000-8000-000000000000',
    });
    expect(result.success).toBe(false);
  });

  it('REJECTS a missing enabled', () => {
    expect(SetDirectoryPublicationRequest.safeParse({ rationale: 'r' }).success).toBe(false);
  });
});

describe('DirectoryPublicationStatusResponse', () => {
  it('round-trips the unconfigured default shape (enabled + configured:false, all attribution null)', () => {
    const parsed = DirectoryPublicationStatusResponse.parse({
      enabled: true,
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    });
    expect(parsed).toEqual({
      enabled: true,
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    });
  });

  it('round-trips a configured row', () => {
    const parsed = DirectoryPublicationStatusResponse.parse({
      enabled: false,
      configured: true,
      changedByDisplay: 'Asha Verma',
      rationale: 'Pulled pending a privacy review.',
      updatedAt: '2026-08-21T10:00:00.000Z',
    });
    expect(parsed.configured).toBe(true);
    expect(parsed.changedByDisplay).toBe('Asha Verma');
  });

  // ⭐ `configured` carries a fact nothing else in the shape carries: a deliberately RE-ENABLED
  // Pariwar and one nobody ever touched both report `enabled: true`, and they are different facts.
  it('distinguishes a re-enabled Pariwar from an unconfigured one at the same `enabled` value', () => {
    const reEnabled = DirectoryPublicationStatusResponse.parse({
      enabled: true,
      configured: true,
      changedByDisplay: 'Asha Verma',
      rationale: 'Review cleared.',
      updatedAt: '2026-08-21T10:00:00.000Z',
    });
    const untouched = DirectoryPublicationStatusResponse.parse({
      enabled: true,
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    });
    expect(reEnabled.enabled).toBe(untouched.enabled);
    expect(reEnabled.configured).not.toBe(untouched.configured);
  });

  it('REQUIRES configured — absence must not be signalled only by all-null fields', () => {
    const result = DirectoryPublicationStatusResponse.safeParse({
      enabled: true,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
    });
    expect(result.success).toBe(false);
  });

  it('⛔ REJECTS an unknown key (.strict())', () => {
    const result = DirectoryPublicationStatusResponse.safeParse({
      enabled: true,
      configured: false,
      changedByDisplay: null,
      rationale: null,
      updatedAt: null,
      pariwarId: '3f8c1d0e-0000-4000-8000-000000000000',
    });
    expect(result.success).toBe(false);
  });
});
