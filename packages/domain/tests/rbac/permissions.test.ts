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
  ])('rejects malformed key %j with InvalidPermissionKeyError', (bad) => {
    expect(() => permissionKey(bad)).toThrow(InvalidPermissionKeyError);
  });

  it('the regex is the canonical <resource>.<action> matcher', () => {
    expect(PERMISSION_KEY_REGEX.test('member.suspend')).toBe(true);
    expect(PERMISSION_KEY_REGEX.test('member.suspended.now')).toBe(false);
  });
});

describe('PERMISSION_CATALOG', () => {
  it('is versioned and seeded with exactly the 12 grounded keys', () => {
    expect(PERMISSION_CATALOG_VERSION).toBe(3); // Story 4.6 bump (was 2 at Story 2.6, 1 at 1.8)
    expect(PERMISSION_CATALOG.catalogVersion).toBe(PERMISSION_CATALOG_VERSION);
    expect(PERMISSION_CATALOG.keys).toHaveLength(12);
    expect([...PERMISSION_CATALOG.keys].sort()).toEqual(
      [...SEED_PERMISSION_KEYS].sort(),
    );
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
