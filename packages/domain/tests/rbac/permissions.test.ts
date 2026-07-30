// Permission-key smart-constructor + catalog unit tests — Story 1.8 (AC-1, Task 7.1e).

import { describe, expect, it } from 'vitest';

import {
  InvalidPermissionKeyError,
  PERMISSION_CATALOG,
  PERMISSION_CATALOG_VERSION,
  PERMISSION_KEY_REGEX,
  SEED_PERMISSION_KEYS,
  isCatalogKey,
  permissionKey,
} from '../../src/rbac/permissions.js';

describe('permissionKey smart constructor', () => {
  it('accepts canonical <resource>.<action> keys', () => {
    expect(permissionKey('claim.approve')).toBe('claim.approve');
    expect(permissionKey('audit.verify')).toBe('audit.verify');
    expect(permissionKey('pariwar.amend_rule')).toBe('pariwar.amend_rule');
  });

  it.each([
    'claim', // no dot
    'claim.', // empty action
    '.approve', // empty resource
    'claim.approve.now', // two dots
    'Claim.Approve', // uppercase
    'claim approve', // space
    'claim-approve', // hyphen, no dot
    'claim..approve', // double dot
    'claim.approved ', // trailing space
    '', // empty
    'claim/r9_vote', // slash instead of dot
    'claim.r9/vote', // slash within the action segment
    'claim.r١_vote', // Arabic-Indic digit one (U+0661) lookalike for '1' — not ASCII [0-9]
    'claim.r９_vote', // fullwidth digit nine (U+FF19) lookalike for '9' — not ASCII [0-9]
    '.r9_vote', // leading separator (empty resource) — the Story 6.14 digit-widening didn't loosen this
    'claim.r9_vote.', // trailing separator (empty action)
  ])('rejects malformed key %j with InvalidPermissionKeyError', (bad) => {
    expect(() => permissionKey(bad)).toThrow(InvalidPermissionKeyError);
  });

  it('the regex is the canonical <resource>.<action> matcher', () => {
    expect(PERMISSION_KEY_REGEX.test('member.suspend')).toBe(true);
    // Story 6.14 — digits are legal (the R9 key carries a rule number). Regression guard against a re-narrowing.
    expect(PERMISSION_KEY_REGEX.test('claim.r9_vote')).toBe(true);
    expect(permissionKey('claim.r9_vote')).toBe('claim.r9_vote');
    expect(PERMISSION_KEY_REGEX.test('member.suspended.now')).toBe(false);
  });
});

describe('PERMISSION_CATALOG', () => {
  it('is versioned and seeded with exactly the grounded keys', () => {
    expect(PERMISSION_CATALOG_VERSION).toBe(25); // Story 10.5 bump +1 (news.manage; 24 at 10.4 helpdesk.respond, 23 at 10.3 helpdesk.create, 22 at 9.8 reconciliation.review, 21 at 7.5 +2 pool.fixed_amount_set/…_emergency, 19 at 6.16, 16 at 6.14, 15 at 6.13, 14 at 6.12, 13 at 6.10, 12 at 6.9, 11 at 6.8, 9 at 6.7, 7 at 6.3, 6 at 5.8, 5 at 5.3, 4 at 4.8, 3 at 4.6, 2 at 2.6, 1 at 1.8)
    expect(PERMISSION_CATALOG.catalogVersion).toBe(PERMISSION_CATALOG_VERSION);
    expect(PERMISSION_CATALOG.keys).toHaveLength(34);
    expect([...PERMISSION_CATALOG.keys].sort()).toEqual(
      [...SEED_PERMISSION_KEYS].sort(),
    );
  });

  it('includes the Story 6.13 cycle-freeze WRITE key (cycle.freeze — the first state_trustee surface)', () => {
    expect(isCatalogKey('cycle.freeze')).toBe(true);
  });

  it('includes the Story 6.14 R9 panel-voting WRITE key (claim.r9_vote)', () => {
    expect(isCatalogKey('claim.r9_vote')).toBe(true);
  });

  it('includes the Story 7.5 fixed-amount WRITE keys (pool.fixed_amount_set, pool.fixed_amount_emergency)', () => {
    expect(isCatalogKey('pool.fixed_amount_set')).toBe(true);
    expect(isCatalogKey('pool.fixed_amount_emergency')).toBe(true);
  });

  it('includes the Story 9.8 reconciliation review-queue key (reconciliation.review)', () => {
    expect(isCatalogKey('reconciliation.review')).toBe(true);
  });

  it('includes the Story 10.3 helpdesk ticket-create key (helpdesk.create — the first helpdesk key)', () => {
    expect(isCatalogKey('helpdesk.create')).toBe(true);
  });

  it('includes the Story 10.4 helpdesk responder-console key (helpdesk.respond — the second helpdesk key)', () => {
    expect(isCatalogKey('helpdesk.respond')).toBe(true);
  });

  it('includes the Story 2.6 T&C keys (tc.publish, tc.approve)', () => {
    expect(isCatalogKey('tc.publish')).toBe(true);
    expect(isCatalogKey('tc.approve')).toBe(true);
  });

  it('includes the Story 4.6 Member Validity read key (member.view_validity)', () => {
    expect(isCatalogKey('member.view_validity')).toBe(true);
    // It is a READ key, distinct from the write-oriented member.* keys.
    expect(isCatalogKey('member.suspend')).toBe(true);
    expect(isCatalogKey('member.moderate')).toBe(true);
  });

  it('includes the Story 4.8 code-review cache-invalidation WRITE key (validity.invalidate_cache)', () => {
    expect(isCatalogKey('validity.invalidate_cache')).toBe(true);
  });

  it('includes the Story 5.3 WhatsApp config WRITE key (pariwar.configure_channels)', () => {
    expect(isCatalogKey('pariwar.configure_channels')).toBe(true);
  });

  it('includes the Story 5.8 degraded-mode declaration WRITE key (pariwar.declare_degraded_mode)', () => {
    expect(isCatalogKey('pariwar.declare_degraded_mode')).toBe(true);
    // The single-dot <resource>.<action> form is valid; the epic AC's two-dot form is NOT a permission key.
    expect(permissionKey('pariwar.declare_degraded_mode')).toBe('pariwar.declare_degraded_mode');
    expect(() => permissionKey('pariwar.degraded_mode.declare')).toThrow(InvalidPermissionKeyError);
    // The two-dot form is not in the catalog (it survives only as the audit action, a different regex).
    expect(isCatalogKey('pariwar.degraded_mode.declare')).toBe(false);
  });

  it('includes the Story 6.3 helpline claim-intake WRITE key (claim.file)', () => {
    expect(isCatalogKey('claim.file')).toBe(true);
    // It is the intake/FILE key — distinct from the verifier/trustee APPROVE key.
    expect(isCatalogKey('claim.approve')).toBe(true);
    expect(permissionKey('claim.file')).toBe('claim.file');
  });

  it('includes the Story 6.7 ground-inspection keys (conduct + override, single-dot)', () => {
    expect(isCatalogKey('claim.conduct_ground_inspection')).toBe(true);
    expect(isCatalogKey('claim.override_ground_inspection')).toBe(true);
    // The single-dot <resource>.<action> form is valid; the epic AC's two-dot form is NOT a key.
    expect(permissionKey('claim.conduct_ground_inspection')).toBe('claim.conduct_ground_inspection');
    expect(() => permissionKey('claim.ground_inspection.conduct')).toThrow(InvalidPermissionKeyError);
    expect(isCatalogKey('claim.ground_inspection.conduct')).toBe(false);
  });

  it('includes the Story 6.8 nominee-bank keys (manage + correct, replacing an initial claim.file reuse)', () => {
    expect(isCatalogKey('claim.manage_nominee_bank')).toBe(true);
    expect(isCatalogKey('claim.correct_nominee_bank')).toBe(true);
    expect(permissionKey('claim.manage_nominee_bank')).toBe('claim.manage_nominee_bank');
    expect(permissionKey('claim.correct_nominee_bank')).toBe('claim.correct_nominee_bank');
  });

  it('includes the Story 6.10 verifier-console READ key (claim.verify), distinct from the claim.approve WRITE', () => {
    expect(isCatalogKey('claim.verify')).toBe(true);
    expect(permissionKey('claim.verify')).toBe('claim.verify');
    // It is a READ key — distinct from the pre-existing claim.approve WRITE (the 6.11 adjudication action).
    expect(isCatalogKey('claim.approve')).toBe(true);
    // The past-tense event name is NOT a permission key.
    expect(isCatalogKey('claim.verified')).toBe(false);
  });

  it('does NOT contain past-tense EVENT names (catalog ≠ events)', () => {
    // Event names belong to packages/events, not the permission catalog.
    for (const eventName of [
      'claim.approved',
      'member.suspended',
      'alert.published',
      'niyamavali.amended',
    ]) {
      expect(isCatalogKey(eventName)).toBe(false);
    }
  });

  it('isCatalogKey is true only for enumerated keys', () => {
    expect(isCatalogKey('claim.approve')).toBe(true);
    expect(isCatalogKey('claim.delete')).toBe(false); // well-formed but not seeded
    expect(isCatalogKey('not a key')).toBe(false); // malformed
  });
});
