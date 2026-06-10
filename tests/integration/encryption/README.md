# tests/integration/encryption/

Top-level integration-test slot for the PII encryption substrate per Story 1.5.

This slot is the architectural-integration-test home for cross-workspace
encryption assertions. Per architecture §2.7 + §Project Structure line
4420-4438 it is analogous to:

- `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (Story 1.6).
- `tests/integration/rls/policy-regression.spec.ts` (Story 1.6).
- `tests/integration/audit-log/integrity-check.spec.ts` (Story 1.10).

## Landing-Story map

| Concern                                                          | Landing Story | Path under this slot                                |
| ---------------------------------------------------------------- | ------------- | --------------------------------------------------- |
| Tier-1 envelope + Tier-2 blind-index column-transformer integration | **Story 1.5** | `packages/domain/tests/encryption/column-transformer.integration.test.ts` (substrate proof; co-located with @twt/domain workspace) |
| Per-PII-bearing-column integration coverage                      | Story 3.1+ / 3.3+ / 3.5+ / 6.x / 9.x | per-domain test slots under each Story workspace |
| FR-74 PII shielding matrix scrape-test (Public-vs-Private)       | Story 1.16b   | `tests/integration/public-pages/scrape-test.spec.ts` (architecture §4.11 line 4427) |
| KEK rotation + DEK re-encryption saga integration                | Story 1.10+   | `tests/integration/encryption/dek-migration.spec.ts` (TBC) |
| Cross-Pariwar HMAC separation regression                         | Story 1.6     | merged into `cross-pariwar-leak.spec.ts`            |

## Story 1.5 substrate

Story 1.5 commits the Tier-1 + Tier-2 column-transformer integration test at
`packages/domain/tests/encryption/column-transformer.integration.test.ts`
(workspace-co-located). This top-level slot's `README.md` is the structural
marker — substantive cross-workspace integration tests land per Stories 1.6
and 1.10+ when multi-workspace concerns (RLS + audit-log hash-chain) require
the top-level home.

## Conventions

- DATABASE_URL-set-gates-execution per Story 1.3 pattern (`packages/events/tests/integration-setup.ts`).
- KMS_TEST_MODE=fake default (no external Cloud KMS dependency); KMS_TEST_MODE=live
  switches to `createCloudKmsProvider` against the substantively provisioned
  `twt-dev` GCP project (Story 1.15 live-provisioning trigger).
- Transaction-rollback isolation per Story 1.3 `integration-setup.ts` pattern;
  no fixture cleanup needed because `ROLLBACK` discards all mutations.

## References

- Architecture §2.7 (PII encryption at rest).
- Architecture §Project Structure line 4420-4438 (integration test slot enumeration).
- Story 1.5 `_bmad-output/implementation-artifacts/1-5-cloud-kms-hsm-google-tink-envelope-encryption-pii-tiers.md`.
- Story 1.6 substrate trigger (RLS + cross-Pariwar regression).
