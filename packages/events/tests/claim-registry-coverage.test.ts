// Registry coverage for the claim vocabulary — Story 6.18 (Task 3). DB-free.
//
// ⚠ THE GAP THIS CLOSES. Until now NOTHING proved that `EVENT_TYPE_REGISTRY` covers every member of
// `CLAIM_EVENT_TYPES`. The only coupling was the compile-time `satisfies Record<ClaimEventType,
// z.ZodTypeAny>` on `CLAIM_EVENT_PAYLOAD_SCHEMAS` in `@twt/domain` — which binds the domain's OWN
// map and says nothing about this package. So a story could add an event, wire its payload schema,
// bump the six `toHaveLength` assertions, and ship with NO registry entry: the typecheck passes, the
// domain tests pass, and the event is simply absent from the registry every consumer reads.
// ⭐ Story 6.18 hit exactly that seam (it mints `claim.nominee_name_checked`), so it pays the debt
// rather than stepping over it.
//
// The shape is the `packages/domain/tests/member/moderation-reason-codes.test.ts` precedent: SET
// EQUALITY IN BOTH DIRECTIONS, because each direction catches a different defect —
//   · missing entry  ⇒ a shipped event no consumer can resolve;
//   · orphan entry   ⇒ a `claim.*` registry row for an event the vocabulary no longer mints,
//                      which is how a renamed event leaves a live-looking ghost behind.
//
// ⚠ It asserts SET EQUALITY, ⛔ not a count. A count assertion passes when one event is added and
// another deleted in the same change — the precise case a coverage test exists to catch.

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { EVENT_TYPE_REGISTRY } from '../src/registry';

/** The `claim.*` keys the registry actually carries. */
const registryClaimTypes = Object.keys(EVENT_TYPE_REGISTRY)
  .filter((k) => k.startsWith('claim.'))
  .sort();

describe('EVENT_TYPE_REGISTRY — claim.* coverage', () => {
  it('registers EVERY CLAIM_EVENT_TYPES member, and carries no orphan claim.* entry', () => {
    expect(registryClaimTypes).toEqual([...claim.CLAIM_EVENT_TYPES].sort());
  });

  it('binds every claim.* entry to its payload schema, with key === type', () => {
    const rows = EVENT_TYPE_REGISTRY as Record<
      string,
      { type: string; schema?: unknown; description: string } | undefined
    >;
    for (const type of claim.CLAIM_EVENT_TYPES) {
      const entry = rows[type];
      if (!entry) throw new Error(`no registry entry for ${type}`);
      // A key/type mismatch is invisible to a key-set check but breaks every consumer that reads
      // `entry.type` back off a looked-up row.
      expect(entry.type).toBe(type);
      // A `schema`-less entry validates nothing — the registry's whole job for a claim event.
      expect(entry.schema, `no payload schema bound for ${type}`).toBeDefined();
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('the registry schema for a claim event IS the domain payload schema (same object, not a copy)', () => {
    // ⭐ Identity, not equivalence. A hand-copied schema in this package would drift silently from
    // the domain one that `projectClaimState` validates against, so the two would disagree about
    // what a valid payload is — the registry accepting what the writer rejects, or worse.
    const rows = EVENT_TYPE_REGISTRY as Record<string, { schema?: unknown } | undefined>;
    for (const type of claim.CLAIM_EVENT_TYPES) {
      const entry = rows[type];
      if (!entry) throw new Error(`no registry entry for ${type}`);
      expect(entry.schema).toBe(claim.CLAIM_EVENT_PAYLOAD_SCHEMAS[type]);
    }
  });
});
