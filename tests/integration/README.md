# tests/integration/

PR-1 placeholder — substantive integration tests land per surface.

Per architecture §Test organization (architecture lines 4621-4624 + 4422-4427), this directory is the home for cross-workspace integration tests. The PR-1 bootstrap creates the home; the named-uncompromisable-subsystem tests land as their respective surfaces materialize.

## Architecture-committed integration test slots

- `pool-engine/replay.spec.ts` — Pool Engine determinism (uncompromisable) — Story 7.X.
- `multi-tenant/cross-pariwar-leak.spec.ts` — Cross-Pariwar adversarial (uncompromisable) — Story 1.6.
- `rls/policy-regression.spec.ts` — RLS regression (uncompromisable) — Story 1.6.
- `audit-log/integrity-check.spec.ts` — Hash-chain integrity (uncompromisable) — Story 1.10.
- `snapshot-adapters/property.spec.ts` — Historical fixtures + invariants (uncompromisable) — Story 7.X.
- `public-pages/scrape-test.spec.ts` — PII shielding FR-74 (uncompromisable) — Story 1.16b CI gate activates; substantive infra spans multiple stories. **REALIZED at Story 2.5** in `apps/public/tests/integration/public-pages/scrape-test.spec.ts` (inside the `@twt/public` workspace so it resolves the `@twt/*` packages + transitive deps cleanly AND runs in the existing `test` CI job on every PR — the AC5/AC6a live-render guard). It feeds the pure `@twt/contracts` engine the real Niyamavali render HTML built from fixture clauses via the pure render module (no live server, no DB).
