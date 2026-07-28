// Golden-hash guard on DEFAULT_ROUTING_POLICY — Story 10.1 review-hardening (AC3 non-retroactivity).
//
// DEFAULT_ROUTING_POLICY is a plain exported code constant (not a versioned DB row like a
// per-Pariwar override), yet every ticket routed via the default only stores the integer
// `routing_policy_version` (never a document snapshot) — so a future edit to the constant's
// `rules` would silently rewrite what "policy v1" meant for every historical ticket ever routed
// under it, unless the edit also bumps DEFAULT_ROUTING_POLICY_VERSION. This test fails the moment
// the constant's content changes without an accompanying version bump, forcing that decision to be
// explicit and reviewed rather than an accidental drive-by edit.
//
// If you are INTENTIONALLY changing the default policy's rules: bump DEFAULT_ROUTING_POLICY_VERSION
// in registry.ts, then update EXPECTED_HASH below to the new hash this test reports on failure.

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { canonicalJsonStringify } from '../../src/canonical-json.js';
import { DEFAULT_ROUTING_POLICY, DEFAULT_ROUTING_POLICY_VERSION } from '../../src/helpdesk/index.js';

// Hashed via canonicalJsonStringify (RFC 8785 sorted-key canonical JSON), NOT plain JSON.stringify —
// a cosmetic reordering of properties inside a rule literal is semantically meaningless (rule ARRAY
// order is what drives precedence, per resolveRoute's revert-sanity discipline) and must not false-flip
// this guard the way key-order-sensitive JSON.stringify would.
const EXPECTED_HASH = '5ddcd4b4c9e4743915dfbd38495ebffbc26e3278996f7d352f7885a27146b144';

describe('DEFAULT_ROUTING_POLICY golden hash', () => {
  it('matches the frozen hash — a content change requires a deliberate version bump', () => {
    const hash = createHash('sha256').update(canonicalJsonStringify(DEFAULT_ROUTING_POLICY), 'utf8').digest('hex');
    expect(hash).toBe(EXPECTED_HASH);
  });

  it('carries the version its own hash was pinned against', () => {
    // Cheap sanity check: DEFAULT_ROUTING_POLICY.version tracks DEFAULT_ROUTING_POLICY_VERSION —
    // if this ever diverges, the hash guard above is protecting the wrong invariant.
    expect(DEFAULT_ROUTING_POLICY.version).toBe(DEFAULT_ROUTING_POLICY_VERSION);
  });
});
