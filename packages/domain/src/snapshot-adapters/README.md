# src/snapshot-adapters/

**Landed: Story 7.1** — Pool Engine snapshot-version adapters per architecture
§1.6 line 925-934.

Per-version adapters that translate between snapshot versions during the replay
migration. `pool-v1.ts` is the v1 (current-shape, identity-migration) adapter.
Property-tested per `packages/domain/tests/pool/pool-snapshot.test.ts`
(deterministic · canonical-shape · replay-invariants · hash-discrimination).
