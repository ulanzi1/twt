# src/snapshot-fixtures/

**Landed: Story 7.1** — Pool Engine snapshot migration per architecture §1.6
line 925-934.

Versioned Pool Engine state snapshots used for replay-based migration.
`pool-v1.example.json` is the v1 canonical fixture — its `integrity_hash` is
independently recomputed against `packages/domain/tests/pool/pool-snapshot.test.ts`.
