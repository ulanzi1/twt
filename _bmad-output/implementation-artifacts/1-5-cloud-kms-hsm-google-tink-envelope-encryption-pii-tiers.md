# Story 1.5: Cloud KMS HSM + Google Tink Envelope Encryption (PII Tiers)

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **Solo Builder**,
I want **`packages/domain/src/encryption/` substantively populated as the PII encryption envelope source-of-truth — a Tier-1 envelope-encryption primitive (per-row DEK + Cloud KMS HSM-backed KEK, AES-256-GCM AEAD) + a Tier-2 blind-index primitive (HMAC-SHA-256 with field-class namespacing + per-Pariwar key context) + a Tier-3 pass-through helper + a Drizzle column-transformer factory (`piiColumn(tier, fieldClass?)`) that auto-encrypts on write + decrypts on read, plus Cloud KMS Terraform IaC for three keys (Tier-1 KEK rotation-enabled + Tier-2 HMAC key + per-Pariwar HMAC key derivation context) under the §2.10a IAM Isolation Commitment, plus a local-dev fake-KMS provider mirroring the Story 1.2 fake-Secret-Manager pattern, plus ADR-NNNN-pii-tier-1-kek-library drafted closing the `adr-index.md` line 89 slot, plus the existing `docs/runbooks/secret-rotation.md` extended with the Tier-1 + Tier-2 library + DEK-schema + verification-query specifics**,
So that **every downstream Story landing a PII-bearing column (Story 3.1+ member mobile/email/Aadhaar/DOB/address + Story 3.3+ DigiLocker KYC fields + Story 3.5+ nominee bank/IFSC/medical disclosures + Story 6.x claim case PII attachments + Story 9.x contribution PII fields + Story 1.7 Pariwar-Passport per-Pariwar manifest) can declare `piiColumn(1, 'mobile')` or `piiColumn(2, 'ehrms_id')` or `piiColumn(3)` at schema-definition time and have the architectural §2.7 three-tier discipline structurally enforced from day one — plaintext never lands in DB on Tier 1 or 2 by construction; Tier 2 blind-index supports equality lookup + dedup without leaking plaintext; the FR-74 Public-vs-Private matrix CI guard (Story 1.16b) consumes the same tier annotations; and the KEK rotation cadence per architecture §5.9 has the substantive library + key-shape + saga seam committed (substantive DEK-migration saga lands at Story 1.10+ when re-encryption first becomes load-bearing)**.

This is the **fifth Epic 1 engineering story** (`[PRIMITIVE]`). It commits the **substrate** for AR-12 (PII encryption tiers per architecture §2.7) + AR-13 (Secret Manager + secrets abstracted behind provider interface) + AR-27 (Cloud KMS in GCP `asia-south1`) + architecture §2.7 line 1498-1534 (three-tier PII strategy) + §2.7a line 1535-1583 (transport encryption baseline — orthogonal but co-resident concerns) + §5.9 line 3318-3373 (Secret Manager + rotation + KEK-roots destruction + high-sensitivity-tier separation) + §5.2 line 2940-2994 (Cloud KMS HSM-backed in canonical GCP service map) + §Cross-cutting concerns line 4539 (`packages/domain/src/encryption/` canonical home). Per architecture §Implementation Handoff (lines 5079-5099), this lands within PR-2 territory; it does NOT include substantive PII-bearing columns (each per-Epic Story authors its own column declarations with `piiColumn(tier, ...)` consumed from `@twt/domain/encryption`), nor live GCP Cloud KMS provisioning (Story 1.5 commits the Terraform IaC + the local-dev fake-KMS provider; substantive live provisioning lands as a follow-up analogous to Story 1.2 D1-1.2), nor KEK rotation execution (cadence-driven; the substrate provides the saga seam), nor the DEK migration saga substantive wiring (Story 1.10+ trigger), nor high-sensitivity-tier IAM project topology (Story 1.15 territory), nor FR-74 PII shielding matrix CI gate (Story 1.16b territory; this Story commits the **tier annotation** primitive that gate consumes).

## Acceptance Criteria

**AC-1 — `packages/domain/src/encryption/` substantively populated with the three-tier PII envelope per architecture §2.7 + AR-12; Cloud KMS HSM-backed KEK + Node-crypto AEAD (Tink-equivalent envelope shape per Tink-TypeScript sunset reality, captured in ADR); Drizzle column-transformer factory `piiColumn(tier, fieldClass?)` substantively authored**

**Given** AR-12 (epics line 270: "PII encryption tiers (architecture §2.7) — Tier 1 ciphertext (envelope-encrypted, KEK in Cloud KMS HSM-backed, Google Tink library, per-row DEK): mobile, email, Aadhaar, DOB, address, nominee bank, nominee IFSC, medical disclosures. Tier 2 (hashed for lookup): mobile-hash, eHRMS-hash. Tier 3 (clear): first-name, school, district") + AR-13 (epics line 271: "Secrets in GCP Secret Manager; rotation policy per architecture Category 5; secrets abstracted behind a provider interface (12-factor)") + architecture §2.7 line 1498-1534 (three-tier strategy with HMAC input namespacing `HMAC(key, "<field_class>:" || value)` + different keys per Pariwar where required) + architecture §Cross-cutting concerns line 4539 (`Encryption + KMS | packages/domain/src/encryption/`) + the Story 1.1 baseline state (no `packages/crypto/` workspace exists at HEAD `8aa8189`; epic AC line 1071 says `packages/crypto` but the architecture-canonical home is `packages/domain/src/encryption/` per line 4351 + 4539 — Story 1.5 follows architecture canonical, preserving the Story 1.1 `apps/member` and Story 1.2 `packages/db` architecture-vs-epic-AC divergence-reaffirmation precedent per `[[feedback_architecture_vs_prd_boundary]]`)

**When** the encryption envelope is substantively authored at the architecture-canonical home

**Then** `packages/domain/src/encryption/` exposes the three-tier API replacing the Story 1.2 `.gitkeep` placeholder state:

- **`encryption/index.ts`** — barrel exporting the public API (`encrypt` / `decrypt` / `blindIndex` / `piiColumn` / `PiiTier` enum-like type + `KmsKeyRef` shape + `EncryptionContext` shape + `KmsProvider` interface + `createCloudKmsProvider()` factory + `createFakeKmsProvider()` factory for tests).

- **`encryption/tiers.ts`** — `PiiTier` type union (`1 | 2 | 3`) + `PII_TIER_1` / `PII_TIER_2` / `PII_TIER_3` const exports per architecture §2.7 line 1501-1516; classification authority docstring cites FR-74 Public-vs-Private matrix as canonical (architecture line 1522-1524).

- **`encryption/envelope.ts`** — Tier-1 envelope encryption primitive: `encryptTier1(plaintext: Uint8Array, context: EncryptionContext, kms: KmsProvider, kekRef: KmsKeyRef): Promise<Tier1Ciphertext>` + `decryptTier1(ciphertext: Tier1Ciphertext, context: EncryptionContext, kms: KmsProvider, kekRef: KmsKeyRef): Promise<Uint8Array>`. **Explicit `kms` and `kekRef` parameters are canonical** (ratified Option A, code review 2026-06-10 — service-layer callers pass dependencies explicitly; `withEncryptionContext` / `getEncryptionStore()` in `column.ts` serves as the Story 1.9+ Fastify pre-handler context-propagation seam, not as a hidden dependency for the crypto helpers). Algorithm per architecture §2.7 line 1502-1508 ("envelope encryption: KEK in Cloud KMS HSM-backed; per-row DEK encrypted by KEK and stored alongside the ciphertext; library Google Tink"): a fresh 32-byte DEK is generated per row via `crypto.randomBytes(32)`; the DEK encrypts the plaintext via AES-256-GCM (Tink's recommended AEAD) using a fresh 12-byte IV per call; the DEK itself is encrypted by the KMS KEK via the configured `KmsProvider.encryptDek(dek, kekRef, aad)` call; the ciphertext envelope shape is `{ kekRef: string, encryptedDek: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array, authTag: Uint8Array, aadShape: 'v1' }` (Tink-compatible envelope structure documented in ADR-NNNN-pii-tier-1-kek-library). The AAD (Additional Authenticated Data) for AES-256-GCM is the canonical-JSON serialization (per Story 1.3 `canonicalJsonStringify` from `@twt/events`) of `EncryptionContext = { pariwarId: string, fieldClass: string, rowKey?: string }` — binding the ciphertext to its tenant + field-class + row identity at the AEAD primitive level (defense-in-depth against ciphertext-substitution attacks across rows or tenants).

- **`encryption/blind-index.ts`** — Tier-2 blind-index primitive: `blindIndex(fieldClass: string, plaintext: string, context: { pariwarId: string }): Promise<string>`. Algorithm per architecture §2.7 line 1509-1514 + line 1526-1529 ("HMAC-SHA-256 with separate keyed secret; HMAC input namespacing `HMAC(key, "<field_class>:" || value)`; different keys per Pariwar to prevent cross-Pariwar correlation where required"): `KmsProvider.computeHmac(kmsHmacKeyRef, "<field_class>:<plaintext>", { pariwarContext: context.pariwarId })` → returns hex-encoded hash. Same plaintext under different field classes yields different hashes (no cross-class collision). Same plaintext under different Pariwars yields different hashes (no cross-Pariwar correlation). The architectural property "different keys per Pariwar" is implemented at Story 1.5 substrate via KMS-derived-key context (i.e., the HMAC key is the same key resource but the HMAC computation uses a context-bound key derivation step) rather than per-Pariwar separate KMS key resources — the latter is an operational choice deferred to Story 1.6 RLS substrate when multi-tenancy is structurally wired (cross-reference D9-1.5).

- **`encryption/pass-through.ts`** — Tier-3 pass-through helper: `passThroughTier3(value: T): T` (no-op identity function with a runtime tier-discipline marker for the FR-74 PII shielding CI gate at Story 1.16b to consume per architecture §2.7 line 1522-1524).

- **`encryption/column.ts`** — Drizzle column-transformer factory `piiColumn(tier: PiiTier, fieldClass?: string)` returning a Drizzle `customType` (per Drizzle ORM 0.45+ custom-column pattern) that wires the per-tier primitive into Drizzle's schema-definition surface. Usage at downstream Story schema definitions: `mobile: piiColumn(1, 'mobile')('mobile').notNull(),` produces a `TEXT` column (storing the Base64-encoded envelope JSON for Tier 1; the HMAC hex for Tier 2; the plaintext for Tier 3) with `dataType`, `toDriver` (encrypt on write), and `fromDriver` (decrypt on read) auto-wired. The `EncryptionContext` (pariwarId + rowKey) is supplied via Drizzle's `db.execute(..., { encryptionContext: { pariwarId, rowKey } })` extension hook (a per-call argument-passing convention documented in `encryption/README.md`; substantive integration into Drizzle's session shape lands at Story 1.6 + apps/api Story 1.9+ when the first PII-bearing row is read/written).

- **`encryption/kms-provider.ts`** — `KmsProvider` interface: `{ encryptDek(dek, kekRef, aad): Promise<Uint8Array>; decryptDek(encryptedDek, kekRef, aad): Promise<Uint8Array>; computeHmac(hmacKeyRef, input, context): Promise<Buffer>; auditHook?(op, kekRef, ctx): void }`. Per AR-13 "secrets abstracted behind a provider interface" — `KmsProvider` is the architecture-canonical seam for swapping Cloud KMS for a fake/stub in tests or for a future multi-cloud KMS substrate per architecture §5.1 single-vendor-risk note (line 2931-2936). Note: `generateDek` is **not** a provider responsibility — `envelope.ts` generates the per-row DEK locally via `crypto.randomBytes(32)` (fast local entropy; no KMS round-trip for DEK generation). The optional `auditHook?` seam is included now so Story 1.10 can wire audit-log entries on every KMS operation without changing the interface shape (D10-1.5).

- **`encryption/cloud-kms-provider.ts`** — `createCloudKmsProvider({ kekRef, hmacKeyRef, projectId, location })` returns a `KmsProvider` backed by `@google-cloud/kms` (verify latest stable at dev-time per Story 1.2 D12-1.2 + Story 1.3 + Story 1.4 dep-pin re-validation discipline; current registry-stable as of 2026-06 is `^4.x` — verify and pin in Story 1.5 Completion Notes). Per architecture §2.7 line 1504 KEK lives in **Cloud KMS HSM-backed** — the provider asserts `cryptoKeyVersion.protectionLevel === 'HSM'` at first-call time + throws a structured error if HSM protection is not configured (defense against substrate-drift). `computeHmac` uses Cloud KMS `MacSign` API (architecture §2.7 line 1509-1510 "separate KMS-held HMAC key" — Cloud KMS native HMAC-SHA-256 key type per GCP `HMAC_SHA256` algorithm).

- **`encryption/fake-kms-provider.ts`** — `createFakeKmsProvider({ kekBytes, hmacKeyBytes })` returns a `KmsProvider` backed by Node `crypto` only (no GCP calls); used by `packages/domain/tests/encryption.test.ts` + downstream Story tests that need encrypt/decrypt round-trip without provisioning Cloud KMS. Mirrors the Story 1.2 `secrets.ts` `useFakeSecretManager` pattern + the `secrets.ts` `secret-source` env-toggle convention. The fake provider uses AES-256-GCM with a deterministic-keying scheme (DEK encryption-by-KEK simulated as AES-256-GCM with the fake KEK bytes; HMAC simulated as `crypto.createHmac('sha256', fakeHmacKeyBytes).update(input).digest()`); plaintext-detection assertions in tests can read the fake's internal byte representation to assert envelope correctness.

**And** `packages/domain/src/index.ts` re-exports the encryption public API as `export * as encryption from './encryption/index.js';` (namespaced export — downstream Stories `import { encryption } from '@twt/domain'` then `encryption.piiColumn(1, 'mobile')`); the namespacing avoids polluting the top-level `@twt/domain` API surface (Drizzle schemas + IDs + RLS + cross-tenant + bank-statement + per-Pariwar all remain top-level per architecture §Cross-cutting concerns line 4538-4546).

**And** the architecture's canonical commitment — **plaintext never lands in DB on Tier 1 or 2 by construction** (epic AC line 1079) — is enforced by the column transformer: any caller who passes a `string` to a `piiColumn(1, ...)`-bound column triggers `toDriver` which performs `encryptTier1` before the SQL operation; the value sent over the Postgres wire is the Base64-encoded envelope JSON; the Drizzle `dataType` declaration commits this as TEXT-storing-Base64 in the migration (not BYTEA — preserves human-inspectable cipher prefix `enc:v1:...` for debugging — exact format committed in ADR-NNNN-pii-tier-1-kek-library).

**AC-2 — Cloud KMS Terraform IaC at `infra/gcp/cloud-kms-dev.tf` for keyring + Tier-1 KEK + Tier-2 HMAC key, with HSM protection level + annual rotation period + Story 1.2-pattern IAM bindings under §2.10a Isolation Commitment; root `pnpm crypto:check` Turbo task + CI `crypto-check` job ensures the encryption substrate compiles + tests pass without external GCP dependencies**

**Given** architecture §5.2 line 2952 (Cloud KMS with HSM-backed keys is the canonical service map entry) + §5.9 line 3324-3325 (KEK rotation cadence annual + on suspected compromise) + §5.9 line 3345-3360 (high-sensitivity secret separation + KEK-roots destruction discipline + 30-day delayed-destruction maximum + two-person approval + paging on KEK-roots KMS operations) + the Story 1.2 Terraform pattern (`infra/gcp/cloud-sql-dev.tf` + `network.tf` + `variables.tf` + `outputs.tf` + `locals.tf` + `versions.tf`)

**When** the Cloud KMS substrate is authored

**Then** `infra/gcp/cloud-kms-dev.tf` is committed as a NEW Terraform file alongside the Story 1.2 IaC (NOT a `cloud-kms.tf` file that conflates dev/staging/prod; the `-dev` suffix matches the `cloud-sql-dev.tf` naming convention; Story 1.15 multi-env provisioning will add `cloud-kms-staging.tf` + `cloud-kms-prod.tf` per the per-environment-file pattern). The file commits:

- A `google_kms_key_ring` resource named `twt-dev-keyring` in region `asia-south1` (per architecture §5.1 Mumbai PII residency) attached to the existing Story 1.2 `twt-dev` GCP project.

- A `google_kms_crypto_key` resource named `pii-tier-1-kek` with:
  - `purpose = "ENCRYPT_DECRYPT"` (KEK for AES-256-GCM envelope per architecture §2.7 line 1504-1505).
  - `version_template { algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION", protection_level = "HSM" }` (HSM-backed per architecture §5.2 line 2952 + §2.7 line 1504; non-HSM is an architectural property violation).
  - `rotation_period = "31536000s"` (365 days per architecture §5.9 line 3324 annual cadence; "on suspected compromise" rotation is operations-policy-mediated + does NOT live in the Terraform schedule).
  - `destroy_scheduled_duration = "2592000s"` (30 days per architecture §5.9 line 3356 Cloud KMS maximum delayed-destruction window).
  - `lifecycle { prevent_destroy = true }` (Terraform-level guard against unintended `terraform destroy` removing the KEK; aligns with §5.9 line 3357-3360 two-person approval discipline).

- A `google_kms_crypto_key` resource named `pii-tier-2-hmac` with:
  - `purpose = "MAC"` (HMAC-SHA-256 per architecture §2.7 line 1509-1510 + Cloud KMS native `MacSign` API).
  - `version_template { algorithm = "HMAC_SHA256", protection_level = "HSM" }` (HSM-backed for parity with Tier-1).
  - Same `rotation_period` + `destroy_scheduled_duration` + `lifecycle.prevent_destroy` posture as the Tier-1 key.

- A `google_kms_crypto_key_iam_binding` block for each key granting the Story 1.2 Terraform-managed service account (or a placeholder `var.app_service_account_email` for Story 1.5 — substantively wired at Story 1.15) the minimum-required roles: `roles/cloudkms.cryptoKeyEncrypterDecrypter` for Tier-1 KEK; `roles/cloudkms.signerVerifier` for Tier-2 HMAC key. Per architecture §2.10a Isolation Commitment line 1676-1730 (audit-mirror credentials separated; sole-engineer prod creds cannot reach audit) — Story 1.5 substrate commits the IAM-binding **shape**; the substantive cross-project IAM-grant topology for high-sensitivity tier (per architecture §5.9 line 3345-3353 "KEK roots in a separate GCP project") lands at Story 1.15 multi-env provisioning per D4-1.5.

- A `google_kms_key_ring_iam_binding` granting **NO** principals at Story 1.5 (defense-in-depth: keyring-level IAM is empty; per-key IAM is the only access path; Story 1.15 may add keyring-level read-only bindings for the high-sensitivity tier).

- `variables.tf` extended with `var.kms_kek_rotation_period_seconds` (default 31536000 — annual; validation `>= 2592000` 30-day minimum + `<= 63072000` 2-year maximum band) + `var.kms_destroy_scheduled_duration_seconds` (default 2592000 — Cloud KMS max; validation `>= 86400` 1-day minimum + `<= 2592000` 30-day Cloud KMS hard cap).

- `outputs.tf` extended with `kms_tier_1_kek_resource_name` + `kms_tier_2_hmac_resource_name` (full resource names of the form `projects/<id>/locations/asia-south1/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-1-kek` — consumed by Secret Manager at Story 1.15 substantive wiring; at Story 1.5 the resource names are committed as Terraform outputs only).

**And** `packages/domain/package.json` adds direct dependency `@google-cloud/kms` (verify latest stable at dev-time; current registry-stable as of 2026-06 is `^4.x` — Story 1.5 Completion Notes captures the exact pin). The dependency is wired into `cloud-kms-provider.ts` only; the fake-KMS provider has no GCP imports.

**And** root `package.json` `scripts` map adds `"crypto:check": "turbo run crypto:check"` analogous to Story 1.2 `db:check`; `turbo.json` adds a `crypto:check` task (`inputs` include `packages/domain/src/encryption/**/*.ts`, `packages/domain/tests/encryption*.test.ts`, `packages/domain/package.json`, `pnpm-lock.yaml`; `outputs: []`; no DB or external service required; the task runs `pnpm --filter @twt/domain test -- --run encryption` + a structural assertion that the encryption substrate compiles via `tsc --noEmit`).

**And** `.github/workflows/ci.yml` adds a `crypto-check` job (mirrors `db-check` job shape — `needs: install`; runs `pnpm turbo run crypto:check`); structurally proves the encryption substrate per `[[feedback_closure_language_precision]]` engineering-evidence discipline; runs without provisioning Cloud KMS (uses the fake-KMS provider in test mode per AR-13's provider-interface abstraction).

**And** the substantive **live Cloud KMS provisioning** (`terraform apply` against the live `twt-dev` GCP project) is **explicitly deferred** to a follow-up analogous to Story 1.2 D1-1.2; cross-reference D1-1.5. Story 1.5 commits the IaC + the local-dev fake-KMS path + the CI gate without external dependencies; live provisioning lands when BigDev executes the deferred infrastructure leg (timing not story-blocking).

**AC-3 — Drizzle column-transformer integration test fixture demonstrates encrypt-on-write + decrypt-on-read + plaintext-never-in-DB invariant + blind-index equality lookup + cross-Pariwar HMAC separation; test runs against local Docker Postgres 16 + fake-KMS provider; integration-test slot for tier-1 ciphertext + tier-2 blind-index scaffolds the `tests/integration/encryption/` substrate**

**Given** architecture §1.3 line 787-790 ("Type tests in CI") + Story 1.3 live-DB integration-test pattern (`packages/events/tests/integration-setup.ts` + DATABASE_URL-set-gates-execution) + the architecture-committed uncompromisable integration test slot at `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (line 4423; Story 1.6 landing) + the to-be-authored architecture-committed slot `tests/integration/encryption/` (architecturally implied by §2.7's defense-in-depth posture though not explicitly enumerated in §Project Structure line 4420-4438; Story 1.5 introduces this slot at substrate level)

**When** the encryption substrate integration tests are authored

**Then** `packages/domain/tests/encryption/envelope.test.ts` is committed (vitest unit; no DB) covering:
- Round-trip: `encryptTier1` + `decryptTier1` returns the original plaintext.
- AAD binding: a ciphertext encrypted with `EncryptionContext = { pariwarId: 'A', fieldClass: 'mobile' }` fails `decryptTier1` when the context is `{ pariwarId: 'B', fieldClass: 'mobile' }` (defense against cross-tenant ciphertext substitution).
- Field-class binding: same as above but varying `fieldClass`.
- DEK uniqueness: 100 encryptions of the same plaintext under the same context produce 100 distinct ciphertexts (per-row DEK invariant per architecture §2.7 line 1504-1505 "per-row DEK").
- Envelope shape: the serialized envelope contains exactly `{ kekRef, encryptedDek, iv, ciphertext, authTag, aadShape }` — no debug fields, no plaintext echo.

**And** `packages/domain/tests/encryption/blind-index.test.ts` is committed covering:
- Determinism: `blindIndex('mobile', '+919999999999', { pariwarId: 'A' })` returns the same hash on each call (equality lookup invariant per architecture §2.7 line 1511 "same plaintext always yields same hash").
- Field-class namespacing: `blindIndex('mobile', '9999999999', { pariwarId: 'A' })` ≠ `blindIndex('ehrms_id', '9999999999', { pariwarId: 'A' })` (no cross-class collision per architecture line 1527-1529).
- Cross-Pariwar separation: `blindIndex('mobile', '+919999999999', { pariwarId: 'A' })` ≠ `blindIndex('mobile', '+919999999999', { pariwarId: 'B' })` (no cross-Pariwar correlation per architecture line 1512-1513 "different keys per Pariwar"; at Story 1.5 implemented via KMS HMAC context binding per D9-1.5; substantive per-Pariwar separate KMS keys deferred to Story 1.6 multi-tenancy substrate).
- Equality-only: no API exposes range or partial-match (architecture line 1514).

**And** `packages/domain/tests/encryption/column-transformer.integration.test.ts` is committed (vitest integration; live-DB; DATABASE_URL-set-gates-execution per Story 1.3 pattern) covering:
- A scratch table is created via Drizzle migrate-on-test-setup (Story 1.3 transaction-rollback-isolation pattern); the table has three columns: `mobile_tier_1` via `piiColumn(1, 'mobile')`, `mobile_hash_tier_2` via `piiColumn(2, 'mobile')`, `first_name_tier_3` via `piiColumn(3)`.
- Insert a row with plaintext `{ mobile_tier_1: '+919999999999', mobile_hash_tier_2: '+919999999999', first_name_tier_3: 'Sushil' }`.
- Read raw from Postgres (bypassing Drizzle's `fromDriver`): assert `mobile_tier_1` is Base64-encoded envelope JSON (prefix `enc:v1:`); assert `mobile_hash_tier_2` is the hex HMAC; assert `first_name_tier_3` is `'Sushil'` (plaintext per Tier 3 pass-through).
- Read via Drizzle's `fromDriver`: assert `mobile_tier_1 === '+919999999999'` (decrypt round-trip); assert `mobile_hash_tier_2` is the equality-lookup hex (note: Tier 2 has no decrypt-back path per architecture §2.7 — "stored as: ciphertext (Tier 1) + HMAC hash for equality lookup" — line 1511; the actual mobile plaintext lives in the `mobile_tier_1` column; Tier 2 stores ONLY the hash; production schemas pair the two columns when both equality lookup and decryption are needed).
- Blind-index lookup: `SELECT * FROM scratch WHERE mobile_hash_tier_2 = blindIndex('mobile', '+919999999999', { pariwarId: 'A' })` returns the row (equality lookup invariant).
- **Plaintext-never-in-DB invariant**: a raw `SELECT mobile_tier_1::text FROM scratch` does NOT contain the substring `+919999999999` (epic AC line 1079: "plaintext never lands in DB; only ciphertext + KMS key reference").

**And** the test file uses the fake-KMS provider (no Cloud KMS dependency); the test file documents that the same tests can be re-run against `createCloudKmsProvider(...)` at Story 1.15 live-provisioning verification time + provides a `--use-real-kms` opt-in CLI flag for the integration test runner (gated on `KMS_TEST_MODE=live` env var; defaults to `fake`).

**And** the `tests/integration/encryption/` slot at the repo-root `tests/` directory is introduced as a top-level architectural integration-test slot (analogous to `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` for Story 1.6); Story 1.5 commits a `tests/integration/encryption/README.md` documenting the slot's purpose + landing-Story map (Tier 1 + 2 integration coverage at Story 1.5; per-PII-bearing-column integration coverage at per-Epic Story 3.x / 6.x / 9.x; FR-74 PII shielding matrix scrape coverage at Story 1.16b consuming the tier annotations from `piiColumn(...)`).

**AC-4 — ADR-NNNN-pii-tier-1-kek-library drafted at `docs/adr/`; closes the `adr-index.md` line 89 slot; commits the Google-Tink-equivalent envelope-encryption library choice with rationale across the Tink-ecosystem candidates (including the Tink-TypeScript sunset reality); commits the Tier-1 + Tier-2 algorithm + key-shape + envelope-format + ADR-supersession lifecycle**

**Given** architecture §2.7 line 1508 ("Library: Google Tink (committed in an ADR alongside Cloud KMS integration)") + `adr-index.md` line 89 (`ADR-NNNN-pii-tier-1-kek-library` slot at `slot-reserved-pre-write` with expected close trigger "Story 1.5 closure") + the empirical reality that Google's Tink-TypeScript library was **deprecated in 2023** + sunset by Google (Tink-Java + Tink-Go + Tink-Python + Tink-C++ + Tink-Obj-C remain actively maintained; Tink-TypeScript is not) — architecture commits the Tink **envelope pattern + algorithm choices** as architectural property; the specific library implementing that pattern is ADR territory

**When** Story 1.5 closes

**Then** ADR-NNNN-pii-tier-1-kek-library is drafted at `docs/adr/ADR-0006-pii-tier-1-kek-library.md` (following Story 1.4's ADR-0005 sequential numbering) with the following substantive content:

- **Decision**: commits the choice of **`@google-cloud/kms` ^4.x + Node `crypto` AES-256-GCM AEAD** as the Tier-1 envelope-encryption substrate, and **`@google-cloud/kms` `MacSign` API + Node `crypto` HMAC-SHA-256 fallback in fake mode** as the Tier-2 blind-index substrate; explicitly NOT-CHOSEN candidates: `tink-crypto` (Google's TypeScript Tink port; deprecated 2023 + sunset 2024; npm `tink-crypto` last published 2022); `node-jose` (broader JOSE library; over-broad surface area for envelope-only use case); `libsodium-wrappers` (good-quality AEAD; but XChaCha20-Poly1305 differs from the architecture-committed AES-256-GCM and is not Tink-equivalent); hand-rolled OpenSSL CLI invocation (correctness-fragility unacceptable). The Decision is **substantively re-openable** post-Story-1.10 (first audit-log substantive consumption of envelope ops) if Google ships a new Tink-TS replacement OR if Cloud KMS evolves to support direct symmetric-encrypt-with-AAD at the wire (eliminating the per-row-DEK envelope shape) — per architecture's ADR-supersession discipline.

- **Context**: (a) architecture §2.7 commits Tier 1 envelope + Tier 2 blind index per the Google Tink pattern; (b) Tink-TypeScript was deprecated by Google in 2023; (c) the architectural commitment to "Google Tink" is to the envelope **pattern + algorithms** (AES-256-GCM AEAD; HMAC-SHA-256 MAC; per-row DEK encrypted by KEK; AAD bound to row identity), NOT to the specific TS library; (d) Cloud KMS `MacSign` API + `EncryptDecrypt` API natively provide HSM-backed KEK + HMAC key operations matching Tink's recommended algorithm choices.

- **Rationale**: `@google-cloud/kms` + Node `crypto` rationale grid — Cloud KMS HSM-backed KEK is architecturally mandatory per §5.2 line 2952; the GCP SDK is the canonical access path; Node `crypto` AES-256-GCM is the same primitive Tink wraps; per-row DEK + KMS-wrapped KEK is the envelope shape Tink documents as recommended; HMAC-SHA-256 via Cloud KMS `MacSign` is HSM-backed; Node `crypto` HMAC-SHA-256 is the fake-mode fallback for tests. Tink-equivalence is validated by: (i) algorithm parity (AES-256-GCM + HMAC-SHA-256); (ii) envelope structure parity (per-row DEK + KEK-wrapped DEK + IV + ciphertext + auth tag); (iii) AAD-binding parity (Tink's AssociatedData ↔ our `EncryptionContext` canonical-JSON-serialized).

- **Consequences**: (a) `packages/domain/src/encryption/cloud-kms-provider.ts` is the only file in the monorepo importing `@google-cloud/kms`; the provider interface (`KmsProvider`) is the substitution seam per AR-13; (b) the envelope wire-format `enc:v1:<base64-json>` is committed as a versioned format — future format migrations (e.g., adding AES-256-GCM-SIV for nonce-misuse resistance) bump the prefix to `enc:v2:` + the decrypt path supports both; (c) per-row DEK storage adds ~120 bytes per Tier-1 column (32-byte DEK Base64'd + 12-byte IV + 16-byte auth tag + JSON envelope overhead); columns previously sized for plaintext mobile (10-15 bytes) become ~200-byte TEXT columns; downstream Drizzle migrations declare PII-Tier-1 columns as unbounded TEXT per Story 1.5 schema discipline; (d) KEK rotation triggers DEK re-encryption saga (architecture §5.9 line 3339-3343); the saga substantive wiring lands at Story 1.10+ per D3-1.5; the Story 1.5 substrate provides the API seam; (e) revisit cadence — at first Tier-1-bearing column substantive consumption (Story 3.1+ member mobile/email/Aadhaar/DOB/address per Sushil signup flow), real-usage validation; if blocking, supersede via ADR-NNNN.

- **Status**: `drafted` at Story 1.5 author-commit; flips `under-trustee-review` post-Story-1.5 review per `[[feedback_closure_language_precision]]` lifecycle; ratified per Trustee Panel session given the choice is partially load-bearing-for-trust-posture (PII encryption is regulator-visible; algorithm choice is engineering with security review) — Trustee Panel light-touch ratification path acceptable with a security-review checklist appended to the ADR body; per D6-1.5 (deferred-work).

**And** `docs/knowledge-transfer/adr-index.md` line 89 flips `slot-reserved-pre-write` → `drafted`; Status row-count table updated (`slot-reserved-pre-write` 122 → 121; `drafted` 3 → 4; total unchanged at 126).

**And** `adr-index.md` line 78 (`ADR-NNNN-object-storage-tier-policy` — close trigger "Story 1.5 + Story 9.2") remains at `slot-reserved-pre-write` at Story 1.5 closure — the trigger phrase "Story 1.5 + Story 9.2" is a **co-trigger** (both Stories must close before the ADR is substantively author-able since the policy spans PII encryption tiers + bank statement object storage); Story 1.5 contributes the PII-tier-encryption substrate, Story 9.2 contributes the bank-statement substrate, the ADR substantively lands at Story 9.2 closure (cross-reference D12-1.5).

**And** `.decision-log.md` gets a new Decision 2026-06-XX-041 (next sequential after Decision 2026-06-09-040) appended at the top of `## Decisions` section per reverse-chronological schema, with body covering Story 1.5 substantive author-commit + ADR-0006 drafted + the architecture-vs-epic-AC `packages/crypto`-vs-`packages/domain/src/encryption/` divergence-reaffirmation + the Tink-TypeScript sunset resolution + cross-Story discharge triggers (Stories 1.6 RLS substantive + per-Pariwar HMAC key derivation; Story 1.7 Pariwar-Passport branded IDs + tier-1 manifest; Story 1.8 RBAC tier-aware access checks; Story 1.9 admin auth substantive consumption; Story 1.10 audit-log substantive consumption + DEK re-encryption saga; Story 1.15 live KMS provisioning; Story 1.16b FR-74 PII shielding CI gate; Stories 3.x / 6.x / 9.x per-domain PII column landings).

**AC-5 — `docs/runbooks/secret-rotation.md` extended with Tier-1 + Tier-2 library + key-shape + verification-query specifics; Story 0.1 substrate (KEK rotation procedure framework) is preserved + extended (NOT replaced); the §2.1 KEK rotation section gains specific Cloud KMS commands + envelope format references + verification query**

**Given** Story 0.1 (`done`) authored `docs/runbooks/secret-rotation.md` with the **framework** of KEK rotation per architecture §5.9 (two-person approval, DEK re-encryption saga, retention window, destruction discipline) + the epic AC line 1074 ("key rotation procedure is documented in the runbook (Story 0.1 inventory)") implying Story 1.5 closes the substrate gap by **extending** the runbook with the **substantive library + key-shape + commands** that the Story 0.1 framework references abstractly

**When** the encryption substrate is committed

**Then** `docs/runbooks/secret-rotation.md` §2.1 KEK rotation section gains a new `### 2.1.1 Tier-1 KEK rotation specifics` subsection covering:
- The Cloud KMS resource path of the Tier-1 KEK (`projects/<id>/locations/asia-south1/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-1-kek`).
- The `gcloud kms keys versions create` Cloud-shell command with the `--protection-level=HSM` flag explicit.
- The envelope-format reference (`enc:v1:<base64-json>` per ADR-NNNN-pii-tier-1-kek-library) + the verification query SQL (`SELECT COUNT(*) FROM <pii-bearing-table> WHERE mobile_tier_1::text NOT LIKE 'enc:v1:%' OR ...` returns 0 when 100% re-encryption has completed).
- The DEK-migration metric reference (`encryption.dek_migration.tier_1.progress` per architecture §5.9 line 3343 "DEK migration status is committed as a named observability metric").

**And** the runbook gains a new `### 2.1.2 Tier-2 HMAC key rotation specifics` subsection covering:
- The Cloud KMS resource path of the Tier-2 HMAC key.
- The Tier-2 rotation **requires re-derivation of all hashes** (per architecture §5.9 line 3341 "Rotation re-encrypts DEKs and re-derives HMAC contents lazily") — re-derivation is per-row + per-Pariwar; lazy strategy = recompute on next equality-lookup read + persist; eager strategy = saga-driven full sweep; Story 1.5 substrate documents lazy as default + eager as saga option per D3-1.5 deferral.
- The verification query SQL pattern + the metric reference.

**And** the runbook gains a new `### 2.1.3 Library + envelope version reference` subsection citing ADR-NNNN-pii-tier-1-kek-library for the `enc:v1:` envelope format + the per-row DEK schema + the AAD binding shape + the substrate library pin (`@google-cloud/kms ^4.x` + Node `crypto`).

**And** the runbook header `> Last material edit:` is bumped to the Story 1.5 author-commit date with a `Story 1.5 — Tier-1 + Tier-2 substrate specifics added` entry; the §1 Prerequisites section gains a new bullet "Verify `pnpm crypto:check` exits 0 — the encryption substrate compiles + tests pass before any rotation begins" (Story 1.5 CI substrate adds the gate; Story 0.1 runbook references it).

**And** `docs/runbooks/secret-rotation.md` ledger-status (per Story 0.1 + 0.7 operational-readiness-ledger pattern) is updated: the runbook moves from `framework-complete-substrate-deferred` to `substrate-tier-1-and-tier-2-landed` (specific phrase to align with the Story 0.1 vocabulary; substantive operational execution remains deferred per `[[feedback_closure_language_precision]]` engineering-vs-operational discipline — Story 1.5 closes the substrate by [edit]; KEK rotation execution remains Resolved via explicit deferral pending operations policy).

## Tasks / Subtasks

- [x] **Task 1: `packages/domain/src/encryption/` substrate — public API surface + KMS provider interface + fake provider for tests** (AC: #1)
  - [x] 1.1 Verify current state of `packages/domain/src/encryption/` (Story 1.2 placeholder per `.gitkeep` + `README.md` Landing-Story 1.5 pointer); read the README to confirm the placeholder + Landing-Story expectation alignment.
  - [x] 1.2 Add direct dependencies to `packages/domain/package.json`:
    - `@google-cloud/kms` — `^4.x` (registry-current stable as of 2026-06; verify at dev-time per Story 1.2 + 1.3 + 1.4 dep-pin re-validation discipline; capture exact pin in Completion Notes).
  - [x] 1.3 Author `packages/domain/src/encryption/tiers.ts`:
    ```typescript
    // packages/domain/src/encryption/tiers.ts
    //
    // PII tier model per architecture §2.7 line 1498-1534 + AR-12 (epics line 270).
    // The FR-74 Public-vs-Private matrix is the canonical classification authority
    // (architecture line 1522-1524); the matrix is enforced by the Story 1.16b
    // PII shielding CI gate consuming the tier annotations attached via piiColumn().

    /** PII tier per architecture §2.7. */
    export type PiiTier = 1 | 2 | 3;

    export const PII_TIER_1 = 1 as const;
    export const PII_TIER_2 = 2 as const;
    export const PII_TIER_3 = 3 as const;
    ```
  - [x] 1.4 Author `packages/domain/src/encryption/kms-provider.ts`:
    ```typescript
    // packages/domain/src/encryption/kms-provider.ts
    //
    // KmsProvider seam per AR-13 "secrets abstracted behind a provider interface
    // (12-factor)". Cloud KMS is the substantive backend; fake-KMS is the tests-only
    // backend; both implement this interface. The seam allows Story 1.5 substrate
    // to land without external dependencies and supports the architecture §5.1
    // single-vendor-risk migration path (line 2931-2936).

    export interface KmsKeyRef {
      readonly resourceName: string;  // projects/.../keyRings/.../cryptoKeys/...
      readonly keyVersion?: string;   // explicit version pin (rotation-safe)
    }

    export interface EncryptionContext {
      readonly pariwarId: string;
      readonly fieldClass: string;
      readonly rowKey?: string;
    }

    export interface KmsProvider {
      encryptDek(dek: Uint8Array, kekRef: KmsKeyRef, aad: Uint8Array): Promise<Uint8Array>;
      decryptDek(encryptedDek: Uint8Array, kekRef: KmsKeyRef, aad: Uint8Array): Promise<Uint8Array>;
      computeHmac(hmacKeyRef: KmsKeyRef, input: Uint8Array, context: { pariwarId: string }): Promise<Buffer>;
      // Story 1.10 seam: Story 1.5 declares the slot; Story 1.10 populates it.
      auditHook?: (op: 'encryptDek' | 'decryptDek' | 'computeHmac', kekRef: KmsKeyRef, ctx: EncryptionContext) => void;
    }
    // NOTE: generateDek is intentionally absent — envelope.ts uses crypto.randomBytes(32) locally.
    // Per-row DEK generation requires no KMS round-trip; KMS is only for KEK wrap/unwrap.
    ```
  - [x] 1.5 Author `packages/domain/src/encryption/fake-kms-provider.ts`:
    ```typescript
    // packages/domain/src/encryption/fake-kms-provider.ts
    //
    // Tests-only fake KmsProvider; uses Node 'crypto' AES-256-GCM for DEK
    // encryption + HMAC-SHA-256 for blind index. Mirrors Story 1.2's
    // useFakeSecretManager pattern + secret-source env-toggle convention.
    //
    // NEVER use in production. The 'KMS_TEST_MODE' env var defaults to 'fake';
    // 'live' switches to the cloud-kms-provider.

    import crypto from 'node:crypto';
    import type { KmsProvider, KmsKeyRef } from './kms-provider.js';

    export function createFakeKmsProvider(opts: {
      kekBytes: Uint8Array;       // exactly 32 bytes — fake KEK
      hmacKeyBytes: Uint8Array;   // exactly 32 bytes — fake HMAC key
    }): KmsProvider {
      if (opts.kekBytes.length !== 32) throw new Error('fake KEK must be 32 bytes');
      if (opts.hmacKeyBytes.length !== 32) throw new Error('fake HMAC key must be 32 bytes');
      return {
        async encryptDek(dek, _kekRef, aad) {
          const iv = crypto.randomBytes(12);
          const cipher = crypto.createCipheriv('aes-256-gcm', opts.kekBytes, iv);
          cipher.setAAD(Buffer.from(aad));
          const ct = Buffer.concat([cipher.update(dek), cipher.final()]);
          const tag = cipher.getAuthTag();
          // packed form: iv(12) || tag(16) || ct(32) = 60 bytes
          return Buffer.concat([iv, tag, ct]);
        },
        async decryptDek(encryptedDek, _kekRef, aad) {
          const buf = Buffer.from(encryptedDek);
          if (buf.length !== 60) throw new Error('encryptedDek must be 60 bytes (12 iv + 16 tag + 32 ct)');
          const iv = buf.subarray(0, 12);
          const tag = buf.subarray(12, 28);
          const ct = buf.subarray(28);
          const dec = crypto.createDecipheriv('aes-256-gcm', opts.kekBytes, iv);
          dec.setAAD(Buffer.from(aad));
          dec.setAuthTag(tag);
          return Buffer.concat([dec.update(ct), dec.final()]);
        },
        async computeHmac(_hmacKeyRef, input, context) {
          // Per-Pariwar separation: HMAC key context-bound via pariwarId prefix.
          // Substantive per-Pariwar separate KMS keys deferred to Story 1.6
          // (D9-1.5); fake provider models the architectural intent.
          const h = crypto.createHmac('sha256', opts.hmacKeyBytes);
          h.update(Buffer.from(`pariwar:${context.pariwarId}|`));
          h.update(Buffer.from(input));
          return h.digest();
        },
      };
    }
    ```
  - [x] 1.6 Author `packages/domain/src/encryption/cloud-kms-provider.ts` with `createCloudKmsProvider({ kekRef, hmacKeyRef, projectId, location })` using `@google-cloud/kms` `KeyManagementServiceClient`. HSM-protection assertion at first-call: `getCryptoKey(...)` + assert `versionTemplate.protectionLevel === 'HSM'` — throw structured error if not. `encryptDek` uses `encrypt({ name, plaintext: dek, additionalAuthenticatedData: aad })`. `decryptDek` mirrors. `computeHmac` uses `macSign({ name: hmacKeyRef.resourceName, data: contextPrefixedInput })`. The Pariwar context is prefixed into the HMAC input — same context-binding scheme as the fake provider; substantive per-Pariwar separate KMS keys deferred per D9-1.5.
  - [x] 1.7 Author `packages/domain/src/encryption/envelope.ts` (`encryptTier1` + `decryptTier1` + `Tier1Ciphertext` type + envelope format helpers `serializeEnvelope(env): string` + `parseEnvelope(str): Tier1Ciphertext`) + AAD-derivation helper using `canonicalJsonStringify` from `@twt/events` (Story 1.3 substrate) on `EncryptionContext`.
    - `Tier1Ciphertext` type: `{ kekRef: string; encryptedDek: Uint8Array; iv: Uint8Array; ciphertext: Uint8Array; authTag: Uint8Array; aadShape: 'v1' }`.
    - `serializeEnvelope(env: Tier1Ciphertext): string` must convert every `Uint8Array` field to a Base64 string before `JSON.stringify` — native JSON serialises `Uint8Array` as a numeric-index object `{0:x,1:y,...}`, not Base64. The serialized JSON object keys are exactly: `kekRef` (string), `encryptedDek` (Base64 string), `iv` (Base64 string), `ciphertext` (Base64 string), `authTag` (Base64 string), `aadShape` (literal `'v1'`). Final output: `enc:v1:` + `Buffer.from(JSON.stringify(serializedObj)).toString('base64')`.
    - `parseEnvelope(str: string): Tier1Ciphertext` mirrors: strip the `enc:v1:` prefix, Base64-decode, `JSON.parse`, then convert each Base64-string field back to `Uint8Array` via `Buffer.from(field, 'base64')`.
    - Task 4.1's envelope-shape assertion verifies these exact key names are present and no extra fields (no debug fields, no plaintext echo).
  - [x] 1.8 Author `packages/domain/src/encryption/blind-index.ts` (`blindIndex(fieldClass: string, plaintext: string, context: { pariwarId: string }): Promise<string>` returning hex-encoded HMAC; field-class prefix `${fieldClass}:` per architecture line 1526-1529). The `KmsProvider.computeHmac` interface accepts `input: Uint8Array` — `blindIndex` must convert the constructed string `${fieldClass}:${plaintext}` to `Uint8Array` before passing it: `Buffer.from(\`${fieldClass}:${plaintext}\`, 'utf-8')`. Per-Pariwar context-binding happens inside the provider (fake provider prepends `pariwar:${pariwarId}|` to the input; Cloud KMS provider does the same before `MacSign`). The `blindIndex` return value is `Buffer.from(hmacBytes).toString('hex')` (lowercase hex per equality-lookup convention).
  - [x] 1.9 Author `packages/domain/src/encryption/pass-through.ts` (`passThroughTier3<T>(value: T): T` identity).
  - [x] 1.10 Author `packages/domain/src/encryption/column.ts` `piiColumn(tier, fieldClass?)` Drizzle `customType` factory. Per Drizzle ORM 0.45+ custom-column pattern: returns a curried factory `(columnName: string) => customType({ dataType: () => 'text', toDriver: async (value) => encrypt-or-hash, fromDriver: async (raw) => decrypt-or-passthrough })`. Declare `toDriver`/`fromDriver` as `async` functions — Drizzle 0.45+ internally awaits a `Promise`-returning driver callback; verify against the pinned `drizzle-orm` version's `customType` TypeScript signature at dev-time (fallback: pre-encrypt at service layer — see Dev Notes "Drizzle column-transformer pattern"). The `EncryptionContext` sourcing convention (Drizzle does not natively pass session context to custom types) is implemented via a process-scoped AsyncLocalStorage (`encryptionContextStorage`) consumed inside `toDriver`/`fromDriver`; callers wrap DB ops with `withEncryptionContext({ pariwarId, rowKey }, () => db.insert(...))`. The AsyncLocalStorage pattern aligns with architecture §Essential patterns line 3615 "Context propagation: AsyncLocalStorage for `{requestId, pariwarId, actorId, traceId}`; job payloads carry the envelope" — extends the same store with the encryption-context slot.
  - [x] 1.11 Author `packages/domain/src/encryption/index.ts` barrel:
    ```typescript
    export * from './tiers.js';
    export * from './kms-provider.js';
    export * from './envelope.js';
    export * from './blind-index.js';
    export * from './pass-through.js';
    export * from './column.js';
    export { createCloudKmsProvider } from './cloud-kms-provider.js';
    export { createFakeKmsProvider } from './fake-kms-provider.js';
    ```
  - [x] 1.12 Update `packages/domain/src/index.ts` adding the namespaced export `export * as encryption from './encryption/index.js';` (preserves Story 1.2 + 1.3 top-level exports unchanged).
  - [x] 1.13 Author `packages/domain/src/encryption/README.md` documenting: substantive purpose of the workspace + tier model + landing-Story (Story 1.5) + the architecture canonical home (line 4539) vs. epic AC `packages/crypto` divergence-reaffirmation + the Tink-TypeScript sunset reality + the AsyncLocalStorage encryption-context propagation pattern + the per-Pariwar HMAC key context-binding strategy + the cross-link to ADR-NNNN-pii-tier-1-kek-library + the cross-link to `docs/runbooks/secret-rotation.md` + the fake-vs-live KMS toggle (`KMS_TEST_MODE` env var) + a usage example at downstream Stories.

- [x] **Task 2: Cloud KMS Terraform IaC + variables + outputs** (AC: #2)
  - [x] 2.1 Author `infra/gcp/cloud-kms-dev.tf` with `google_kms_key_ring` (`twt-dev-keyring`, region `asia-south1`) + `google_kms_crypto_key` for `pii-tier-1-kek` (purpose ENCRYPT_DECRYPT + algorithm GOOGLE_SYMMETRIC_ENCRYPTION + protection_level HSM + rotation_period from variable + destroy_scheduled_duration from variable + lifecycle.prevent_destroy true) + `google_kms_crypto_key` for `pii-tier-2-hmac` (purpose MAC + algorithm HMAC_SHA256 + protection_level HSM + same rotation + destroy + lifecycle posture) + `google_kms_crypto_key_iam_binding` per key granting `roles/cloudkms.cryptoKeyEncrypterDecrypter` (KEK) and `roles/cloudkms.signerVerifier` (HMAC) to `var.app_service_account_email` (placeholder for Story 1.5; substantively populated at Story 1.15).
  - [x] 2.2 Extend `infra/gcp/variables.tf` with:
    - `var.kms_kek_rotation_period_seconds` (default 31536000; validation `>= 2592000` AND `<= 63072000`).
    - `var.kms_destroy_scheduled_duration_seconds` (default 2592000; validation `>= 86400` AND `<= 2592000`).
    - `var.app_service_account_email` (default `null`; allows Story 1.5 commit-without-substantive-IAM-binding posture; Story 1.15 populates substantively).
  - [x] 2.3 Extend `infra/gcp/outputs.tf` with `kms_tier_1_kek_resource_name` + `kms_tier_2_hmac_resource_name` outputs.
  - [x] 2.4 Extend `infra/gcp/README.md` with a `## Cloud KMS substrate (Story 1.5)` section: keyring + keys + IAM bindings overview + the deferred-live-provisioning note (analogous to Story 1.2's deferred-live-provisioning leg per D1-1.2) + a "do not `terraform apply` cloud-kms-dev.tf at Story 1.5 closure" reminder.
  - [x] 2.5 Author `infra/gcp/.terraform-plan-expectations.md` (NEW file) capturing the Story 1.5 `terraform plan` expected output shape (4 resources to add: keyring + 2 keys + 2 IAM bindings); cross-reference Story 1.2 plan expectations.

- [x] **Task 3: Root `pnpm crypto:check` + `turbo.json` task + CI `crypto-check` job** (AC: #2, #3)
  - [x] 3.1 Add `"crypto:check": "turbo run crypto:check"` to root `package.json` scripts.
  - [x] 3.2 Add `crypto:check` task to `turbo.json` (`inputs` covering `packages/domain/src/encryption/**/*.ts` + `packages/domain/tests/encryption/**/*.test.ts` + `packages/domain/package.json` + `pnpm-lock.yaml`; `outputs: []`; `dependsOn` empty).
  - [x] 3.3 Add `"crypto:check": "vitest run --dir tests/encryption"` to `packages/domain/package.json` scripts (matches the Turbo task name; runs only the encryption test subdirectory; avoids DB-coupled tests in this job).
  - [x] 3.4 Add `crypto-check` job to `.github/workflows/ci.yml` (mirrors `db-check` job shape — `needs: install`; runs `pnpm turbo run crypto:check`; no DB service container; `KMS_TEST_MODE` env var set to `fake`).

- [x] **Task 4: Test substrate — unit tests for envelope + blind-index; live-DB integration test for column transformer + plaintext-never-in-DB invariant** (AC: #3)
  - [x] 4.1 Author `packages/domain/tests/encryption/envelope.test.ts` (vitest unit; no DB) per AC-3: round-trip + AAD binding + field-class binding + DEK uniqueness (100-iteration) + envelope shape assertion.
  - [x] 4.2 Author `packages/domain/tests/encryption/blind-index.test.ts` (vitest unit; no DB) per AC-3: determinism + field-class namespacing + cross-Pariwar separation + equality-only.
  - [x] 4.3 Author `packages/domain/tests/encryption/fake-kms-provider.test.ts` (vitest unit; no DB) covering fake provider's `encryptDek`/`decryptDek`/`computeHmac` correctness in isolation (independent of envelope.ts + blind-index.ts; assertions on byte-level output shape).
  - [x] 4.4 Author `packages/domain/tests/encryption/column-transformer.integration.test.ts` (vitest integration; live-DB; DATABASE_URL-set-gates-execution per Story 1.3 pattern; uses Story 1.3 `integration-setup.ts` transaction-rollback-isolation pattern). Test creates a scratch table via `db.execute(sql\`CREATE TEMP TABLE ...\`)` with three columns wired through `piiColumn(1, 'mobile')` + `piiColumn(2, 'mobile')` + `piiColumn(3)`. Insert + raw-SELECT (plaintext-never-in-DB invariant via substring assertion) + Drizzle-SELECT (decrypt round-trip) + blind-index equality lookup.
  - [x] 4.5 Author `tests/integration/encryption/README.md` (top-level integration test slot) documenting purpose + landing-Story map per AC-3.

- [x] **Task 5: ADR-0006-pii-tier-1-kek-library drafted + adr-index update + decision-log entry** (AC: #4)
  - [x] 5.1 Author `docs/adr/ADR-0006-pii-tier-1-kek-library.md` following the existing ADR-0003 + ADR-0004 + ADR-0005 template shape. Substantive content per AC-4: Decision (choice + not-chosen rationale) + Context + Rationale (algorithm parity grid + envelope-shape parity + AAD parity) + Consequences + Status + supersession lifecycle + revisit cadence.
  - [x] 5.2 Update `docs/knowledge-transfer/adr-index.md` line 89: `slot-reserved-pre-write` → `drafted` + Status row-count table (`slot-reserved-pre-write` 122 → 121; `drafted` 3 → 4).
  - [x] 5.3 Append Decision 2026-06-XX-041 to `.decision-log.md` (top of `## Decisions` section per reverse-chronological schema) per AC-4 body content.
  - [x] 5.4 Update the header summary in `docs/knowledge-transfer/adr-index.md` (Story 0.5 author-commit summary line) to append "`ADR-0006-pii-tier-1-kek-library` substantive author-commit 2026-06-XX per Story 1.5 Decision 2026-06-XX-041 (Section B row at line 89 flipped `slot-reserved-pre-write` → `drafted`; total row count unchanged at 126)" matching the Story 1.4 ADR-0005 entry pattern.

- [x] **Task 6: Extend `docs/runbooks/secret-rotation.md` with Tier-1 + Tier-2 specifics** (AC: #5)
  - [x] 6.1 Add `### 2.1.1 Tier-1 KEK rotation specifics` subsection per AC-5: Cloud KMS resource path + `gcloud kms keys versions create` command + envelope-format reference + verification query SQL + DEK-migration metric reference.
  - [x] 6.2 Add `### 2.1.2 Tier-2 HMAC key rotation specifics` subsection per AC-5: Cloud KMS resource path + lazy-vs-eager re-derivation strategy + verification query + metric reference.
  - [x] 6.3 Add `### 2.1.3 Library + envelope version reference` subsection citing ADR-0006 + `enc:v1:` envelope format + per-row DEK schema + substrate library pin.
  - [x] 6.4 Bump runbook header `> Last material edit:` + add a `Story 1.5 — Tier-1 + Tier-2 substrate specifics added` entry per AC-5.
  - [x] 6.5 Add `Verify pnpm crypto:check exits 0` bullet to §1 Prerequisites per AC-5.

- [x] **Task 7: Deferred-work + sprint-status + decision-log + branch + commit + push** (AC: #1, #2, #3, #4, #5)
  - [x] 7.1 Author `## Story 1.5 deferred (substrate author-commit, 2026-06-XX per Decision 2026-06-XX-041)` section in `_bmad-output/implementation-artifacts/deferred-work.md` enumerating D1-1.5 through D12-1.5 per the Dev Notes / Deferrals enumeration below.
  - [x] 7.2 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: `development_status[1-5-cloud-kms-hsm-google-tink-envelope-encryption-pii-tiers]: ready-for-dev → in-progress` (at dev-story start) → `review` (at dev-story completion); update `# last_updated:` line with Story 1.5 author-commit summary.
  - [x] 7.3 Author `packages/domain/README.md` Story 1.5 section (extends the existing Story 1.2 + 1.3 sections): substantive encryption substrate landing + tier model + `piiColumn` usage example + fake-vs-live KMS toggle + cross-links.
  - [x] 7.4 Update root `README.md` `## Substrate state` table (if it exists; add if it does not) reflecting the Story 1.5 substrate landing (mirror Story 1.4's root README update if any).
  - [x] 7.5 **Pre-execution branch strategy choice (BigDev pre-execution prompt)**:
    - **Option A (Recommended)**: branch from `origin/main` HEAD `8aa8189` (clean branch with Stories 1.1 + 1.2 + 1.3 + 1.4 squash-merged). Branch name: `story-1.5-encryption-envelope`.
    - **Option B**: stack on `story-1.4-contracts-scaffolding` branch HEAD if Story 1.4 PR has not yet merged (high-coupling unlikely since contracts is orthogonal to encryption at Story 1.5).
    - Story 1.4 closure summary line in `sprint-status.yaml` shows the Story 1.4 PR merged at commit `001cb2d` (PR #6); `origin/main` HEAD is `8aa8189` (Story 1.4 code-review-patches commit). **Option A is the default**; capture the choice in Completion Notes.
  - [x] 7.6 Conventional Commits per Story 1.1 commitlint config:
    - `feat(packages/domain): Story 1.5 substrate — encryption envelope (KMS provider interface + fake + Cloud KMS providers; tiers + envelope + blind-index + pass-through + piiColumn)`
    - `feat(infra/gcp): Story 1.5 Cloud KMS Terraform IaC (Tier-1 KEK + Tier-2 HMAC; HSM protection; annual rotation; 30-day destroy window)`
    - `feat(turbo,ci): Story 1.5 crypto:check task + crypto-check CI job (fake-KMS test mode)`
    - `test(packages/domain): Story 1.5 encryption tests (envelope + blind-index + fake-KMS provider + column-transformer integration)`
    - `docs(adr): ADR-0006-pii-tier-1-kek-library — Tier-1 + Tier-2 library choice; Tink-TS sunset rationale`
    - `docs(runbooks): Story 1.5 — Tier-1 + Tier-2 KEK rotation specifics`
    - `chore: Story 1.5 documentation + decision-log + deferred-work + sprint-status`
  - [x] 7.7 Verification gate before push: `pnpm turbo run lint typecheck test build` exits 0 (matches Story 1.4 baseline; Story 1.5 adds substantive content to `@twt/domain` workspace + a new Turbo task). `pnpm crypto:check` exits 0. `pnpm db:check` exits 0. `pnpm contracts:check-openapi-determinism` exits 0 (unchanged from Story 1.4).
  - [x] 7.8 Push branch + open PR. PR title: `feat: Story 1.5 — Cloud KMS HSM + envelope encryption substrate (PR-2 substrate)`. PR body covers: substrate scope + tier model + Tink-TS sunset resolution + ADR-0006 drafted + 12 deferred items + cross-Story discharge triggers + CI gates green.

### Review Findings

Group A review (2026-06-10) — `packages/domain/src/encryption/` source files only. Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor.

**Decision-needed:**
- [x] [Review][Patch] D1 — Update AC-1 `encryption/envelope.ts` spec signature to match explicit 4-param implementation: `encryptTier1(plaintext, context, kms, kekRef)` and `decryptTier1(ct, context, kms, kekRef)`; document that `withEncryptionContext` / `getEncryptionStore()` is the Story 1.9+ Fastify pre-handler seam (not a hidden dep for the crypto helpers). Ratified Option A — explicit params are canonical. [story file AC-1]
- [x] [Review][Patch] D2 — Add empty-string guard to `blindIndex`: `if (plaintext.length === 0) throw new Error('blindIndex: plaintext must be non-empty')` — consistent with existing `fieldClass` empty-string guard [packages/domain/src/encryption/blind-index.ts:16]

**Patches:**
- [x] [Review][Patch] P1 — HSM assertion race + thundering-herd: `hsmAssertionDone` boolean not guarded with a Promise mutex — concurrent initial callers all bypass; transient network failure on second `getCryptoKey` leaves flag unset, causing every subsequent KMS call to issue two extra `getCryptoKey` RPCs indefinitely [`packages/domain/src/encryption/cloud-kms-provider.ts`:17–41]
- [x] [Review][Patch] P2 — `protectionLevel` proto enum number rejected as non-HSM: `@google-cloud/kms` gRPC client may return the numeric enum value `2` for HSM; `String(2)` → `"2"` fails `!== "HSM"` check, causing a false-positive rejection of a correctly HSM-protected key [`packages/domain/src/encryption/cloud-kms-provider.ts`:24–29]
- [x] [Review][Patch] P3 — `pariwarId` pipe separator not validated: `blind-index.ts` validates that `fieldClass` has no `:` but neither `blindIndex` nor the KMS providers validate that `pariwarId` has no `|` — a crafted `pariwarId` can collide HMAC inputs across tenants [`packages/domain/src/encryption/blind-index.ts` + `cloud-kms-provider.ts`:68 + `fake-kms-provider.ts`:58]
- [x] [Review][Patch] P4 — `decryptTier1` DEK zeroing targets a copy: `Buffer.from(dekBuf).fill(0)` in the `finally` block creates a new Buffer copy and zeros that; the original `dekBuf` Uint8Array remains unzeroed in the heap [`packages/domain/src/encryption/envelope.ts`:99]
- [x] [Review][Patch] P5 — `parseEnvelope` no field-type or byte-length validation: `String(obj[k])` coerces non-string JSON values (numbers, booleans) silently; no length check that decoded `iv` is 12 bytes or `authTag` is 16 bytes — malformed payloads propagate to the crypto layer with opaque native errors [`packages/domain/src/encryption/envelope.ts`:127–143]
- [x] [Review][Patch] P6 — `decryptDek` ignores `kekRef.keyVersion` — asymmetric with `encryptDek`: `encryptDek` correctly appends `/cryptoKeyVersions/${kekRef.keyVersion}` when set; `decryptDek` always passes bare `kekRef.resourceName` — after a rotation, envelopes encrypted under a non-primary version become undecryptable [`packages/domain/src/encryption/cloud-kms-provider.ts`:60 vs 47–49]
- [x] [Review][Patch] P7 — `encryptTier1` DEK not zeroed on KMS failure: if `kms.encryptDek` rejects, the `dek.fill(0)` line is never reached — the plaintext DEK lives in the heap until GC on the failure path [`packages/domain/src/encryption/envelope.ts`:62–66]
- [x] [Review][Patch] P8 — `tiers.ts` exported symbols missing FR-74 citation: AC-1 requires "classification authority docstring cites FR-74" on exported symbols; `PiiTier` JSDoc reads `/** PII tier per architecture §2.7. */` with no FR-74 reference; `PII_TIER_*` consts have no JSDoc at all [`packages/domain/src/encryption/tiers.ts`:7]
- [x] [Review][Patch] P9 — `computeHmac` pariwar-prefix contract undocumented in interface: the `KmsProvider.computeHmac` signature gives no indication that the provider is responsible for prepending `pariwar:{id}|` before the input — a third-party provider reading only the interface would produce incompatible blind indexes silently [`packages/domain/src/encryption/kms-provider.ts` — interface JSDoc]

**Deferred:**
- [x] [Review][Defer] W1 — `encryptionContextAad` sort fragility: `['fieldClass', 'pariwarId']` is hardcoded in already-sorted order then `keys.sort()` is called; correct today by alphabetical accident — a future field inserted out of order without noticing the sort convention breaks AAD binding silently [`packages/domain/src/encryption/canonical-context.ts`:4–6] — deferred, pre-existing code quality issue not a current bug

Group B review (2026-06-10) — `packages/domain/tests/encryption/` + `tests/integration/encryption/` test files. Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor.

**Patches:**
- [x] [Review][Patch] TB1 — `blind-index.test.ts` missing test for empty-string plaintext guard (D2): `blindIndex('mobile', '', ...)` should reject with `/non-empty/` — guard added in Group A but has zero test coverage [`packages/domain/tests/encryption/blind-index.test.ts`]
- [x] [Review][Patch] TB2 — `blind-index.test.ts` missing test for `pariwarId` pipe-separator guard (P3): `blindIndex('mobile', MOBILE, { pariwarId: 'A|B' }, ...)` should reject — crafted pariwarId can collide HMAC inputs across tenants; guard added in Group A but has zero test coverage [`packages/domain/tests/encryption/blind-index.test.ts`]
- [x] [Review][Patch] TB3 — `envelope.test.ts` missing test for `parseEnvelope` non-string field rejection (P5): payload with `iv: 42` (a number) should throw `/must be a string/` — type-coercion guard added in Group A but has zero test coverage [`packages/domain/tests/encryption/envelope.test.ts`]
- [x] [Review][Patch] TB4 — `envelope.test.ts` missing test for `parseEnvelope` IV byte-length check (P5): payload with `iv: Buffer.alloc(8).toString('base64')` (8 bytes ≠ 12) should throw `/iv must be 12 bytes/` [`packages/domain/tests/encryption/envelope.test.ts`]
- [x] [Review][Patch] TB5 — `envelope.test.ts` missing test for `parseEnvelope` authTag byte-length check (P5): payload with `authTag: Buffer.alloc(8).toString('base64')` (8 bytes ≠ 16) should throw `/authTag must be 16 bytes/` [`packages/domain/tests/encryption/envelope.test.ts`]
- [x] [Review][Patch] TB6 — `envelope.test.ts` missing test for `parseEnvelope` non-`enc:v1:` prefix rejection: `parseEnvelope('enc:v2:abc')` should throw `/enc:v1: prefix/` — guard exists in source but no dedicated test [`packages/domain/tests/encryption/envelope.test.ts`]
- [x] [Review][Patch] TB7 — `envelope.test.ts` missing test for `parseEnvelope` payload-not-an-object guard: `parseEnvelope('enc:v1:' + btoa('"hello"'))` should throw `/not an object/` [`packages/domain/tests/encryption/envelope.test.ts`]
- [x] [Review][Patch] TB8 — `envelope.test.ts` missing test for `decryptTier1` unsupported `aadShape` guard: passing a `Tier1Ciphertext` with `aadShape: 'v2' as any` directly to `decryptTier1` should throw `/unsupported aadShape/` [`packages/domain/tests/encryption/envelope.test.ts`]
- [x] [Review][Patch] TB9 — `envelope.test.ts` AAD-binding tests assert `.rejects.toThrow()` with no message pattern — should narrow to Node.js crypto GCM auth-tag error (e.g. `/unable to authenticate/`) so a wrong-error path cannot pass silently [`packages/domain/tests/encryption/envelope.test.ts:56,61`]
- [x] [Review][Patch] TB10 — `envelope.test.ts` DEK uniqueness test composite key obscures IV-reuse: add a parallel `ivSet` to separately assert 100 distinct IVs — GCM catastrophically breaks on `(DEK, IV)` pair reuse; ciphertext-uniqueness alone does not catch IV repetition [`packages/domain/tests/encryption/envelope.test.ts:66-75`]

**Deferred:**
- [x] [Review][Defer] TBW1 — DEK zeroing on `kms.encryptDek` rejection (P7 path): verifying `dek.fill(0)` fires on the rejection path requires intercepting `crypto.randomBytes` or adding a test seam; not observable from test boundary — deferred, defense-in-depth behavior, covered by code inspection [`packages/domain/src/encryption/envelope.ts:63-78`]
- [x] [Review][Defer] TBW2 — DEK in-place zeroing on `decryptTier1` (P4 path): same observability constraint as TBW1; fix confirmed at source level (P4 patch); test verification requires internal seam — deferred [`packages/domain/src/encryption/envelope.ts:101-103`]
- [x] [Review][Defer] TBW3 — `fake-kms-provider.test.ts` module-scope `randomBytes`: `kekBytes`/`hmacKeyBytes` allocated at module load (not in `beforeAll`) — fragile but safe; no test currently mutates shared buffers — deferred, pre-existing pattern [`packages/domain/tests/encryption/fake-kms-provider.test.ts:15-16`]
- [x] [Review][Defer] TBW4 — `EncryptionContext.rowKey` not tested: optional `rowKey` field in AAD is not exercised by any test context — deferred, no Story 1.5 PII column uses `rowKey`; land test when first per-row binding consumer lands (Story 3.1+)
- [x] [Review][Defer] TBW5 — AC-3 PARTIAL (C2/C4): column-transformer integration test demonstrates service-layer encryption, not `piiColumn` `toDriver`/`fromDriver` auto-encrypt — accepted D14-1.5 design deviation (Drizzle 0.45 sync customType constraint); Auditor verdict PARTIAL is intentional and documented [`packages/domain/tests/encryption/column-transformer.integration.test.ts`]
- [x] [Review][Defer] TBW6 — `KMS_TEST_MODE=live` opt-in documented in README only, not wired in test file as AC-3 requires — deferred to Story 1.15 when live provisioning is active; README is the correct home until the live KMS project exists

Group C review (2026-06-10) — `infra/gcp/` Terraform IaC files. Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. AC-2 verdict: PASS.

**Patches:**
- [x] [Review][Patch] TC1 — `rotation_period` on `pii_tier_2_hmac` (`purpose = "MAC"`) causes GCP API 400 at `terraform apply`: Cloud KMS MAC keys do not support automatic rotation; removed `rotation_period` from the HMAC key resource; added comment pointing to manual rotation runbook §2.1.2 [`infra/gcp/cloud-kms-dev.tf:51`]
- [x] [Review][Patch] TC2 — `_iam_binding` replace-semantics breaks multi-SA Story 1.15 topology; also `count = 0` with null SA produced `"serviceAccount:"` interpolation risk: switched both IAM resources to `google_kms_crypto_key_iam_member` + `for_each = toset([...])` pattern — additive semantics, empty set on null SA, no null interpolation [`infra/gcp/cloud-kms-dev.tf:62-74`]
- [x] [Review][Patch] TC3 — `google_kms_key_ring.twt_dev` missing `lifecycle { prevent_destroy = true }`: crypto keys are protected but the parent keyring is not — a deleted keyring would require 24h quarantine before name reuse and permanently destroys all contained keys; added `lifecycle { prevent_destroy = true }` to keyring [`infra/gcp/cloud-kms-dev.tf:17-21`]

**Deferred:**
- [x] [Review][Defer] TCW1 — `kms_kek_rotation_period_seconds` variable name coupling: variable is named KEK-specific but was also applied to HMAC key — moot after TC1 fix removes `rotation_period` from HMAC key; no rename needed [`infra/gcp/variables.tf:162`] — deferred, resolved by TC1
- [x] [Review][Defer] TCW2 — No cross-variable guard ensuring `destroy_scheduled_duration < rotation_period`: validation bands already constrain this (max destroy 30d, min rotation 30d) so the only pathological case is both set to exactly 2592000 — deferred, low operational risk given current validation ranges [`infra/gcp/variables.tf:162-182`]
- [x] [Review][Defer] TCW3 — `outputs.tf` `.id` attribute format: for `google_kms_crypto_key`, `.id` returns the full resource name path (same format expected by `@google-cloud/kms` SDK); confirmed correct for provider ~> 5.0 — deferred, add a clarifying comment when Story 1.15 wires the output values into Secret Manager or app config [`infra/gcp/outputs.tf:48,53`]

Group D review (2026-06-10) — docs/ADR/runbook/decision-log/adr-index files. Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. AC-4 verdict: PASS; AC-5 verdict: PARTIAL (ledger-status label missing).

**Patches:**
- [x] [Review][Patch] TD1 — §2.1.1 verification SQL `NOT LIKE 'enc:v1:%'` checks envelope format prefix, not KEK version — always returns 0 before and after rotation; operator will believe re-encryption complete when it has not started; replace with metric reference + note that SQL form lands at Story 1.10+ [`docs/runbooks/secret-rotation.md:71-79`]
- [x] [Review][Patch] TD2 — `gcloud kms keys versions create --protection-level=HSM` is not a valid CLI flag — protection level is set once at key creation; remove flag from both §2.1.1 and §2.1.2 commands + add "inherited from version_template; runtime-asserted by createCloudKmsProvider" note [`docs/runbooks/secret-rotation.md:60-68,88-95`]
- [x] [Review][Patch] TD3 — ADR-0006 Tink-equivalence parity table describes HMAC input as `${fieldClass}:${plaintext}` — omits `pariwar:<id>|` prefix prepended by KmsProvider; a reader reimplementing from this table produces incorrect blind index values [`docs/adr/ADR-0006-pii-tier-1-kek-library.md:64`]
- [x] [Review][Patch] TD4 — ADR-0006 Consequence #3 encrypted DEK estimate "~44 bytes Base64" is ~3× too small — Cloud KMS ciphertext for 32-byte plaintext is ~97-100 bytes binary (~132 chars Base64); total envelope estimate ~200 bytes understated (~350-400 bytes for short field); misleads capacity planning [`docs/adr/ADR-0006-pii-tier-1-kek-library.md:78`]
- [x] [Review][Patch] TD5 — ADR-0006 links to archived `google/tink` monorepo — per-language repos migrated to `tink-crypto` GitHub org (2024-2025); stale link may mislead trustee reviewers into thinking Tink is abandoned [`docs/adr/ADR-0006-pii-tier-1-kek-library.md:118`]
- [x] [Review][Patch] TD6 — §2.1.2 missing "Cloud KMS MAC keys have no automatic rotation — every rotation is a fully manual operator action" notice; also missing "update KmsKeyRef in app config / Secret Manager after creating new version" step between gcloud command and re-derivation strategy [`docs/runbooks/secret-rotation.md:82-109`]
- [x] [Review][Patch] TD7 — §2.1.1 missing `KmsKeyRef.keyVersion` guidance: after KEK rotation, decryption of old envelopes requires the version stored in the envelope JSON to be passed to Cloud KMS decrypt; verify version-pinning is correctly wired before rotating [`docs/runbooks/secret-rotation.md:69`]
- [x] [Review][Patch] TD8 — decision log drops D6-1.5 from deferred-legs enumeration + title says "12 deferred items D1-1.5 through D12-1.5" when actual total is 14 (D1–D12 + D13 canonical-JSON + D14 Drizzle deviation-derived) [`.decision-log.md:37,73`]
- [x] [Review][Patch] TD9 — §2.1.2 verification SQL references non-existent `hmac_key_version` column with no prerequisite note; operator attempting this query gets a SQL error; add "column requires future schema migration (D3-1.5 / Story 1.10+)" notice before the SQL block [`docs/runbooks/secret-rotation.md:101-108`]
- [x] [Review][Patch] TD10 — AC-5 PARTIAL: ledger-status label `substrate-tier-1-and-tier-2-landed` absent from runbook per Story 0.1 + 0.7 operational-readiness-ledger vocabulary [`docs/runbooks/secret-rotation.md`]

**Deferred:**
- [x] [Review][Defer] TDW1 — §2.1.1 no conditional "pre-Story-1.10 you cannot complete a live KEK rotation" branch — deferred; existing text implies saga is required; add formal conditional at Story 1.10 runbook landing [`docs/runbooks/secret-rotation.md:70`]
- [x] [Review][Defer] TDW2 — ADR-0006 HMAC: Cloud KMS MacSign returns full 256-bit output; Tink's `HMAC_SHA256_128BITTAG` truncates to 128 bits; difference not documented — deferred to ADR ratification; no byte-compatibility requirement today [`docs/adr/ADR-0006-pii-tier-1-kek-library.md`]
- [x] [Review][Defer] TDW3 — ADR-0006 forward-path supersession evaluation criteria lack testable checklist distinguishing new Tink-TS vs Cloud KMS API evolution migration paths — deferred; re-open trigger language is present; detail at trigger time [`docs/adr/ADR-0006-pii-tier-1-kek-library.md:34,89`]
- [x] [Review][Defer] TDW4 — Runbook missing cross-links to `infra/gcp/cloud-kms-dev.tf` + `kms-provider.ts` — deferred; prose descriptions accurate; add "See also" at Story 1.15 when operators first use against live keys [`docs/runbooks/secret-rotation.md`]
- [x] [Review][Defer] TDW5 — `adr-index.md` "Rows by section" footnote omits Section L (pre-existing carry-forward from Story 0.15) [`docs/knowledge-transfer/adr-index.md:33`] — deferred, pre-existing
- [x] [Review][Defer] TDW6 — `adr-index.md` summary table shows `ratified | 0` despite ADR-0001 + ADR-0002 ratified (pre-existing carry-forward) [`docs/knowledge-transfer/adr-index.md:24`] — deferred, pre-existing

Group E review (2026-06-10) — CI / turbo / package.json / openapi / pnpm-lock.yaml. Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. AC-3 verdict: PASS.

**Patches:**
- [x] [Review][Patch] TE1 — `turbo.json` `crypto:check` inputs glob `tests/encryption/**/*.test.ts` misses future non-`.test.ts` helper/fixture files; a new `tests/encryption/fixtures.ts` would silently escape cache invalidation; change to `tests/encryption/**/*.ts` [`turbo.json`]

**Deferred:**
- [x] [Review][Defer] TEW1 — `openapi/v1.yaml` `pattern: \S` (no anchors/quantifier) admits error code values with embedded whitespace like `"NOT FOUND"`; `^\S+$` would enforce no whitespace anywhere; defer to next OpenAPI refinement pass [`openapi/v1.yaml:50`]
- [x] [Review][Defer] TEW2 — Dual `google-gax` versions in lockfile (`4.6.1` for `@google-cloud/kms@4.5.0` + `5.0.7` for `@google-cloud/secret-manager@6.1.3`) — expected peer divergence; pnpm handles correctly; watch at Story 1.15 live provisioning when both are exercised in the same request path [`pnpm-lock.yaml`]
- [x] [Review][Defer] TEW3 — `@types/request@2.48.13` added as runtime transitive dep (via `retry-request@7.0.2` → `@types/request` in google-gax@4.x dep tree); harmless (type declarations only, ~12 KB); known google-gax@4.x quirk; resolves on `@google-cloud/kms@5.x` upgrade at Story 1.15+ [`pnpm-lock.yaml`]

## Dev Notes

### What `packages/domain/src/encryption/` substantively becomes at Story 1.5

The architecture commits `packages/domain/src/encryption/` as the workspace location for "Envelope encryption + blind-index helpers" (line 4351) + the cross-cutting-concerns canonical home (line 4539). At Story 1.2 the directory exists with `.gitkeep` + a `README.md` pointing to Story 1.5 as the landing Story. **Story 1.5 substantively populates this directory** with the **substrate** — the three-tier API surface (`encryptTier1` / `decryptTier1` / `blindIndex` / `passThroughTier3`), the Drizzle column-transformer factory (`piiColumn`), the KMS provider interface (`KmsProvider`) with two implementations (Cloud KMS for production + fake for tests), the envelope wire-format (`enc:v1:<base64-json>`), and the AAD-binding scheme (`EncryptionContext` canonical-JSON serialized via Story 1.3's `canonicalJsonStringify`).

The substantive **PII-bearing columns** in Drizzle schemas (mobile, email, Aadhaar, DOB, address, nominee bank, IFSC, medical disclosures per AR-12 line 270) land at per-Epic Stories — member fields at Story 3.1+ (Sushil signup), KYC fields at Story 3.3+ (DigiLocker), nominee fields at Story 3.5+, claim case PII attachments at Story 6.x, contribution PII at Story 9.x, per-Pariwar manifest tier-1 fields at Story 1.7. Story 1.5 commits **only** the primitive that downstream Stories invoke via `piiColumn(tier, fieldClass)`.

The **substantive DEK migration saga** for KEK rotation (architecture §5.9 line 3339-3343) lands at Story 1.10+ when re-encryption first becomes load-bearing. Story 1.5 commits **only** the saga seam — the API surface (`encryptDek` / `decryptDek`) supports re-keying via the `kekRef` argument; the substantive worker, checkpointing, and metric land later per D3-1.5.

The substantive **FR-74 PII shielding CI gate** (Public-vs-Private matrix scrape-test + tier-annotation enforcement) lands at Story 1.16b. Story 1.5 commits **only** the tier-annotation primitive (`PiiTier` type + `piiColumn(tier, ...)` factory that the CI gate consumes by reading column metadata).

### `packages/domain/src/encryption/` baseline state at Story 1.5 start

Per Story 1.2 substantive Drizzle scaffolding + Story 1.4 inheritances, the directory state at HEAD `8aa8189` is:
- `packages/domain/src/encryption/.gitkeep` (empty marker file).
- `packages/domain/src/encryption/README.md` (351 bytes; documents "Landing Story: 1.5 — Cloud KMS + Google Tink envelope encryption per AR-12 + the Drizzle column transformers wired by Story 1.5; empty at Story 1.2").

**Story 1.5 substantively populates** the directory + adds runtime dependencies to `package.json` + extends the namespaced export at `src/index.ts`. The `.gitkeep` is removed at Task 1.13 once the README + source files land.

### Story 1.1 + 1.2 + 1.3 + 1.4 inheritances + the Story 1.5 substrate it provides

Story 1.1 (`done`; PR #2 merged) provides: monorepo workspace topology + root configs + CI workflow + `packages/domain/` placeholder shape + ADR-0001 + ADR-0002.

Story 1.2 (`done`; PR #3 merged) provides: Cloud SQL Postgres Terraform IaC + Drizzle scaffolding at `packages/domain/` + Secret Manager wiring at `packages/domain/src/secrets.ts` + migration zero idempotent + root `pnpm db:*` scripts + `turbo db:check` task + CI `db-check` job + ADR-0003-datastore-engine drafted + `packages/domain/src/encryption/.gitkeep` + landing-Story README.

Story 1.3 (`done`; PR #4 merged) provides: `events_log` Drizzle schema + append-only Postgres triggers + migration 0001 hand-supplemented + `packages/events/` substantively populated + `StateMachine<S, E>` framework primitive + `canonicalJsonStringify` RFC 8785 JCS subset + `EVENT_TYPE_REGISTRY` shape + ADR-0004-canonical-json drafted + zod ^3.23.0 pinned + transaction-rollback live-DB integration-test pattern at `packages/events/tests/integration-setup.ts`.

Story 1.4 (`done`; PR #6 merged) provides: `packages/contracts/` substantively populated with 16-sub-directory layout + `_common/` substantive primitives (`ErrorResponse` + `Cursor` + `PaginationQuery` + `paginatedResponse` + `Iso8601Datetime` + `UuidString` + `RequestId` + `Email` + `ApiMajorVersion` + `assertStrict` + `HealthResponse` + `event-log-contract`) + `@asteasolutions/zod-to-openapi` build-time emission pipeline + `openapi/v1.yaml` deterministic artifact + generator-determinism CI gate + ADR-0005-openapi-client-generation drafted.

Story 1.5 provides the substrate for:
- **Story 1.6** (`pariwar_id` first-class + RLS adversarial test) — substantively wires Postgres RLS `pgPolicy` on PII-bearing tables; substantively decides the per-Pariwar HMAC key derivation policy (D9-1.5): EITHER substantively-separate per-Pariwar KMS HMAC keys (architectural property "different keys per Pariwar" satisfied at KMS-resource level; expensive but defense-in-depth strongest) OR HMAC-input-context-binding via `pariwar:<id>|...` prefix on the same KMS HMAC key (Story 1.5 substrate default; preserves cross-Pariwar correlation defense at cryptographic level; cheaper at KMS-resource level). Story 1.6 commits substantively.
- **Story 1.7** (Pariwar-Passport data model + branding bundle per FR-63) — substantively authors `packages/domain/src/ids/` branded ID types (PariwarId, MemberId, etc.); substantively consumes `piiColumn(1, 'manifest_tier_1_<field>')` for any tier-1 fields in the per-Pariwar manifest.
- **Story 1.8** (RBAC permission-keys + scope-dimensions + 12 seeded roles per FR-44/45/46) — substantively wires tier-aware access checks; e.g., a role lacking `pii.tier_1.read` permission cannot trigger `fromDriver` decrypt; substantively pairs with `piiColumn` at the row-handler layer.
- **Story 1.9** (admin authentication — email + password + WebAuthn passkey + step-up OTP per FR-22a + AR-22) — substantively wires `apps/api/` first PII-bearing routes (admin email + password hash); substantively consumes `piiColumn(1, 'email')` at the admin user schema; substantively validates the `EncryptionContext` AsyncLocalStorage propagation via the apps/api Fastify request lifecycle.
- **Story 1.10** (tamper-evident audit log + hash chain + 6h off-site mirror) — substantively consumes `piiColumn(...)` annotations to drive audit-log PII redaction per architecture §2.7 line 2739-2740 ("No PII in error reports — error context is sanitized via the existing tier-1 ciphertext + tier-2 hash discipline"); substantively wires the DEK migration saga for KEK rotation per D3-1.5.
- **Story 1.11a + 1.11b** (audit-log integrity verification primitive + trustee-facing UI) — substantively consumes the canonical-JSON canonical envelope shape (Story 1.5 reuses Story 1.3's canonical-JSON for AAD binding); integrity-check job verifies envelope structure on audit log entries.
- **Story 1.12** (pg-boss job queue + idempotency keyed store) — substantively orthogonal to encryption substrate; payloads containing PII consumed via `piiColumn(...)` at writer + decryption at worker.
- **Story 1.13 + 1.14** (Cloudflare + rate-limiting + login-wall + forced-pagination + honeypot/noindex) — substantively orthogonal to encryption substrate.
- **Story 1.15** (Dokploy auto-deploy pipeline + multi-Pariwar provisioning) — substantively wires live Cloud KMS provisioning per D1-1.5; multi-env IaC (`cloud-kms-staging.tf` + `cloud-kms-prod.tf`); high-sensitivity-tier IAM project topology per architecture §5.9 line 3345-3353.
- **Story 1.16a** (friction-budget PR CI gate) — substantively wires lint rules for `piiColumn(...)` usage at downstream Drizzle schemas (e.g., a Tier-1 column declared without `piiColumn(1, ...)` is a lint error).
- **Story 1.16b** (PII scrape CI gate per FR-74) — substantively consumes the tier annotations attached via `piiColumn(...)` to drive the PII shielding matrix CI gate per architecture §2.7 line 1522-1524.
- **Story 1.16c** (schema-diff CI gate per FR-100 non-add guard) — substantively orthogonal at Story 1.5; the gate consumes Drizzle migration diffs, not encryption substrate.
- **Stories 3.1+, 3.3+, 3.5+, 6.x, 9.x** — populate per-domain PII-bearing columns via `piiColumn(tier, fieldClass)`; each Story extends the per-Pariwar fixture set with substantive PII fields.

### Architecture-vs-Epic-AC alignment check

The epic AC line 1062-1080 enumerates Story 1.5 ACs verbatim:
- "the encryption envelope is authored in `packages/crypto`" — **divergence reaffirmation**: architecture canonical home is `packages/domain/src/encryption/` (line 4351 + 4539). Story 1.5 follows architecture canonical, preserving the Story 1.1 `apps/member` (architecture canonical `apps/mobile`) + Story 1.2 `packages/db` (architecture canonical `packages/domain`) divergence-reaffirmation precedent per `[[feedback_architecture_vs_prd_boundary]]`. The epic AC's `packages/crypto` phrasing is interpreted as "the encryption substrate workspace" — at Story 1.5 this is `packages/domain/src/encryption/`. **Story 1.5 does NOT create a new `packages/crypto` workspace**; the architectural canonical home wins. This decision is recorded in Dev Notes here + Decision 2026-06-XX-041 (Task 5.3).
  - **Additional path note:** architecture §2.7 line 1506 reads `packages/domain/encryption/` (missing `src/`). This is a minor architecture-internal inconsistency — the correct path per §Cross-cutting concerns line 4539 and §Project Structure line 4351 is `packages/domain/src/encryption/` (with `src/`). Always use the `src/`-inclusive path; do not create a top-level `packages/domain/encryption/` directory outside `src/`.
- "tier-1, tier-2, tier-3 PII keys exist in Cloud KMS HSM with appropriate IAM (per Isolation Commitment §2.10a)" — Story 1.5 commits the Tier-1 KEK + Tier-2 HMAC key Terraform IaC with HSM protection + IAM-binding shape; the substantive cross-project IAM-grant topology (architecture §5.9 line 3345-3353 "high-sensitivity tier in separate GCP project") is deferred to Story 1.15 per D4-1.5. **Tier-3 is plaintext** per architecture §2.7 line 1515-1517 — there is no KMS key for Tier 3; the epic AC's "tier-3 PII keys exist in Cloud KMS HSM" is a precision drift; correct interpretation per architecture: Tier 3 is plaintext + classification authority (FR-74 matrix); no KMS key. Captured in Dev Notes + Decision 2026-06-XX-041.
- "`encrypt(tier, plaintext)` and `decrypt(tier, ciphertext)` are exposed as Drizzle column transformers" — Story 1.5 commits this exactly via `piiColumn(tier, fieldClass?)`. The transformer wraps `encryptTier1` for tier 1, `blindIndex` for tier 2, `passThroughTier3` for tier 3.
- "key rotation procedure is documented in the runbook (Story 0.1 inventory)" — Story 0.1 (`done`) authored the runbook framework; Story 1.5 extends with Tier-1 + Tier-2 substrate specifics per AC-5.
- "Tink envelope encryption follows Google's recommended pattern" — Story 1.5 commits the Tink-equivalent envelope shape per ADR-0006; Tink-TypeScript sunset reality resolved.
- "plaintext never lands in DB; only ciphertext + KMS key reference" — Story 1.5 commits this exactly via column transformer `toDriver` + integration test plaintext-substring assertion.

**No substantive architecture-vs-epic-AC divergence beyond the workspace-location reaffirmation** is present at Story 1.5. The architecture is canonical at every load-bearing decision; the epic AC tier-3-KMS-key precision drift is non-load-bearing and documented for the dev agent's clarity.

### Tink-TypeScript sunset — the architectural commitment vs. the library reality

Architecture §2.7 line 1508 commits "Library: **Google Tink** (committed in an ADR alongside Cloud KMS integration)." At architecture-authoring time (Step 4 in 2026-05) Tink was Google's recommended cross-language crypto library; the architectural commitment to Tink was a commitment to the **envelope pattern + algorithm choices** Tink documents as recommended. The empirical reality at Story 1.5 execution time (2026-06):

- **Tink-Java**: actively maintained (2026 releases ongoing).
- **Tink-Go**: actively maintained.
- **Tink-Python**: actively maintained.
- **Tink-C++**: actively maintained.
- **Tink-Obj-C**: actively maintained.
- **Tink-TypeScript**: deprecated 2023, sunset 2024. Last npm publish: 2022. Google has not announced a Tink-TS successor.

The architectural commitment is preserved by:
- Implementing the **Tink envelope shape** (per-row DEK + KEK-wrapped DEK + AEAD ciphertext + auth tag + AAD binding).
- Using the **Tink-recommended algorithms** (AES-256-GCM for AEAD; HMAC-SHA-256 for MAC).
- Using **Cloud KMS native operations** (`EncryptDecrypt` + `MacSign`) for KEK + HMAC ops — same primitives Tink wraps.
- Using **Node `crypto`** for AES-256-GCM AEAD + HMAC-SHA-256 — Node `crypto` is the canonical Node-runtime primitive surface; same algorithm choices Tink would use.

ADR-0006 substantively records this — the architectural commitment to Tink is satisfied by Tink-equivalent envelope shape + Tink-recommended algorithms + Cloud-KMS-native KEK operations, even though the specific Tink-TS library is not used. The architectural property holds; the library implementation adapts to the empirical TS-ecosystem reality.

### Cloud KMS + Tink envelope ecosystem at Story 1.5

- **`@google-cloud/kms`** (architecture canonical access path to Cloud KMS) — GCP's official Node SDK; supports `EncryptDecrypt` + `MacSign` + `MacVerify` + key-version management. Registry-current stable as of 2026-06 is `^4.x`. Verify at dev-time per the cross-Story dep-pin re-validation discipline.
- **Node `crypto`** — Node-runtime native; AES-256-GCM via `createCipheriv('aes-256-gcm', ...)` + HMAC-SHA-256 via `createHmac('sha256', ...)`. No external dependency; FIPS-mode-compatible at Node 18+. Same primitives Tink-Java + Tink-Go wrap.
- **`tink-crypto`** (NOT-CHOSEN) — Google's TypeScript Tink port; deprecated 2023; npm last publish 2022. Per ADR-0006 not-chosen rationale.
- **`node-jose`** (NOT-CHOSEN) — broader JOSE library; over-broad surface area; introduces JWE complexity unnecessary for envelope-only use case.
- **`libsodium-wrappers`** (NOT-CHOSEN) — XChaCha20-Poly1305 + Argon2 + Ed25519; high-quality but XChaCha20-Poly1305 ≠ AES-256-GCM (Tink-recommended); algorithm divergence from architecture §2.7.
- **Hand-rolled OpenSSL CLI** (NOT-CHOSEN) — correctness-fragility unacceptable for security-load-bearing primitives.

### Drizzle column-transformer pattern at Story 1.5

Drizzle ORM 0.45+ supports custom column types via `customType<{ data: T, driverData: string }>({ dataType, toDriver, fromDriver })`. Story 1.5's `piiColumn` returns a factory:

```typescript
piiColumn(1, 'mobile')('mobile_field_name')
//   tier=1, fieldClass='mobile' → curried with column name
//   → returns a customType configuration with:
//     dataType: () => 'text',
//     toDriver: async (value) => {   // ← MUST be declared async; see async note below
//       const ctx = encryptionContextStorage.getStore();
//       if (!ctx) throw new Error('encryption context missing — wrap with withEncryptionContext()');
//       return serializeEnvelope(await encryptTier1(Buffer.from(value, 'utf-8'), ctx));
//     },
//     fromDriver: async (raw) => {   // ← MUST be declared async; see async note below
//       const ctx = encryptionContextStorage.getStore();
//       if (!ctx) throw new Error('encryption context missing — wrap reads with withEncryptionContext()');
//       const env = parseEnvelope(raw);
//       return (await decryptTier1(env, ctx)).toString('utf-8');
//     }
```

**Async `toDriver`/`fromDriver` note (verify at dev-time):** Drizzle ORM 0.45+ `customType` accepts `async` callbacks for `toDriver` and `fromDriver` — Drizzle awaits any `Promise` returned by these hooks internally before issuing the SQL command. Verify this behaviour holds against the exact `drizzle-orm` version pinned at dev-time by checking the `customType` TypeScript signature: if `toDriver` accepts `(value: T) => DriverData | Promise<DriverData>`, async is supported. If the pinned version only accepts a synchronous return, the fallback is: (a) for unit tests, supply a synchronous fake-KMS provider that wraps Node `crypto` in already-resolved values (trivial since Node `crypto` operations are synchronous); (b) for production, perform encryption at the service layer before the Drizzle call and store the pre-encrypted string — the column is then declared as a plain TEXT column with the `enc:v1:` invariant enforced at the service boundary. Do NOT use `await` inside a non-`async` `toDriver` callback — that is a syntax error that TypeScript will catch.

**Important Drizzle nuance**: Drizzle's `customType` does NOT pass session context to `toDriver`/`fromDriver` by default. The Story 1.5 substrate solves this via Node's `AsyncLocalStorage` (matching architecture §Essential patterns line 3615 "Context propagation: AsyncLocalStorage"). Callers wrap DB ops with `withEncryptionContext({ pariwarId, rowKey }, () => db.insert(...))`; the AsyncLocalStorage propagates through await boundaries. The pattern aligns with Story 1.9+ `apps/api/` Fastify request lifecycle (Fastify pre-handler hook sets the AsyncLocalStorage on per-request context per architecture §1.4 + §3.1 + §Essential patterns).

For pg-boss workers consuming PII payloads (Story 1.12+), the job-handler hydrates the AsyncLocalStorage from the job's metadata envelope (architecture §Essential patterns line 3615 "job payloads carry the envelope").

The substantive integration of `withEncryptionContext` into Drizzle's session shape lands at Story 1.6 + Story 1.9+ when the first PII-bearing row read/write occurs in `apps/api/`. Story 1.5 commits the wrapper function + documents the usage convention.

### Per-Pariwar HMAC key separation (substantive decision deferred to Story 1.6)

Architecture §2.7 line 1512-1513 says "different keys per Pariwar to prevent cross-Pariwar correlation (where required)." Two implementations satisfy the architectural property:

- **Option A — Substantively-separate per-Pariwar KMS HMAC keys**: each new Pariwar provisioning creates a new `google_kms_crypto_key` HMAC resource named `pii-tier-2-hmac-<pariwar-id>`. Cross-Pariwar correlation defense at the KMS-resource level (strongest); IAM separation possible at the per-key binding; expensive at KMS-resource count + GCP cost.
- **Option B — HMAC-input-context-binding via Pariwar prefix on a single KMS HMAC key**: the input to `MacSign` is `pariwar:<id>|<field-class>:<plaintext>`; cross-Pariwar correlation defense at the cryptographic level (same KMS key, but different inputs guarantee different outputs); cheaper at KMS-resource level + simpler at Terraform.

Story 1.5 substrate defaults to **Option B** (HMAC-input-context-binding) for the fake-KMS + Cloud-KMS providers + the integration tests. The substantive choice between A and B at production time is **Story 1.6 territory** (per D9-1.5) — Story 1.6 wires multi-tenancy + RLS substantively + commits the per-Pariwar key topology decision. Story 1.5 documents both options + commits Option B as the substrate default; Story 1.6's choice is recorded in an ADR-NNNN-per-pariwar-hmac-key-policy slot (to be created at Story 1.6 dev-time).

### Story 1.5 deferred items — substrate-scope vs. downstream-Story scope

The Story 1.5 substrate intentionally **does NOT include** the following items; each is captured in `_bmad-output/implementation-artifacts/deferred-work.md` `## Story 1.5 deferred` section with explicit cross-Story discharge triggers:

- **D1-1.5: Live Cloud KMS provisioning** (`terraform apply` against the live `twt-dev` GCP project). Analogous to Story 1.2 D1-1.2. Triggers: BigDev executes the deferred infrastructure leg outside of Story 1.5 sprint scope; timing not story-blocking.
- **D2-1.5: KEK rotation execution** (annual cadence per architecture §5.9). Trigger: 12 months from first live KMS provisioning (i.e., 12 months from D1-1.5 close); cadence-driven.
- **D3-1.5: DEK migration saga substantive wiring** (architecture §5.9 line 3339-3343 "saga with per-row checkpoint; resumable across worker crashes"). Trigger: **Story 1.10+** when re-encryption first becomes load-bearing AND pg-boss substrate exists (Story 1.12).
- **D4-1.5: High-sensitivity-tier IAM project topology** (architecture §5.9 line 3345-3353 "KEK roots in a separate GCP project"). Trigger: **Story 1.15** multi-Pariwar provisioning + Dokploy auto-deploy pipeline.
- **D5-1.5: KEK-roots destruction approval workflow + KMS-operation paging signal** (architecture §5.9 line 3355-3360 two-person approval + alarm). Trigger: **operations policy authoring window** (post-Phase-1-soft-launch); operational territory.
- **D6-1.5: ADR-0006 trustee ratification**. `drafted` at Story 1.5 author-commit; flips `under-trustee-review` post-Story-1.5-merge; **ratified per Trustee Panel session** (light-touch ratification path acceptable with security-review checklist appended). Closure-language-precision posture per `[[feedback_closure_language_precision]]`: engineering Closed by [edit] on substrate; ADR ratification Resolved via explicit deferral.
- **D7-1.5: Substantive PII-bearing column landings** per per-Epic Story (member fields at **Story 3.1+** Sushil signup; KYC fields at **Story 3.3+** DigiLocker; nominee fields at **Story 3.5+**; claim case PII attachments at **Stories 6.x**; contribution PII at **Stories 9.x**; per-Pariwar manifest tier-1 fields at **Story 1.7**). Story 1.5 commits the primitive `piiColumn(tier, fieldClass)`; downstream Stories invoke.
- **D8-1.5: FR-74 PII shielding matrix CI gate** (architecture §2.7 line 1522-1524 + architecture §4.11 line 4427 `tests/integration/public-pages/scrape-test.spec.ts` uncompromisable). Trigger: **Story 1.16b** PII scrape CI gate.
- **D9-1.5: Per-Pariwar HMAC key derivation policy substantive choice** (Option A separate KMS keys vs Option B HMAC-input-context-binding). Trigger: **Story 1.6** RLS adversarial test + multi-tenancy substrate. Story 1.5 commits Option B as the substrate default.
- **D10-1.5: Audit-log entry on every encrypt/decrypt operation**. Trigger: **Story 1.10** audit-log substantive. The Story 1.5 `KmsProvider` interface includes an optional `auditHook?: (op, kekRef, ctx) => void` slot the Story 1.10 substrate populates.
- **D11-1.5: Per-Pariwar branded `PariwarId` type substituted into `EncryptionContext`**. The Story 1.5 substrate uses `pariwarId: string`; Story 1.7 substantively brands. Cross-link to D12-1.4 (branded ID Story 1.7 trigger).
- **D12-1.5: Object storage tier policy ADR co-trigger** (`adr-index.md` line 78 `ADR-NNNN-object-storage-tier-policy` — close trigger Story 1.5 + Story 9.2). The ADR substantively lands at Story 9.2 closure since the policy spans both PII encryption tiers AND bank statement object storage; Story 1.5 contributes the PII-tier-encryption substrate, Story 9.2 contributes the bank-statement substrate.

### Architecture-canonical home reaffirmation reasoning

The epic AC line 1071 ("the encryption envelope is authored in `packages/crypto`") parallels the Story 1.2 epic AC's "packages/db" phrasing — both were authored before the architecture's substantive `packages/domain/` consolidation (architecture line 4341-4360) was canonical. The Story 1.2 resolution: architecture wins; `packages/db` was never created; substrate landed at `packages/domain/`. The Story 1.5 resolution: same. The architectural canonical home for encryption is `packages/domain/src/encryption/` per architecture §Cross-cutting concerns line 4539 + §Project Structure line 4351. **Story 1.5 does NOT create a new `packages/crypto` workspace.** The epic AC's `packages/crypto` phrasing is honored at the spirit level (the encryption substrate workspace exists; it is the architecture-canonical one).

Recording this in Decision 2026-06-XX-041 closes the divergence audit trail per `[[feedback_architecture_vs_prd_boundary]]` (architecture commits properties; ADRs commit cloud controls; PRD/epics commit policy — workspace location is architectural property territory, not policy territory).

### Repository state at story-creation time

- Current branch: `main` (no in-progress feature branches; Stories 1.1 + 1.2 + 1.3 + 1.4 all squash-merged to `main`).
- Local `main` HEAD: `8aa8189 fix(packages/contracts): Story 1.4 code-review patches — 13 findings resolved` (Story 1.4 code-review-patches commit).
- `origin/main` HEAD: `8aa8189` (same as local; sync at story-creation time).
- The Story 1.5 dev agent should: (1) `git fetch origin && git checkout main && git pull --ff-only origin main` to confirm sync; (2) `git checkout -b story-1.5-encryption-envelope`. Then proceed with Task 1.

### Dev guardrails — what makes the dev agent's Story 1.5 implementation go smoothly

- **Don't create a new `packages/crypto` workspace**: epic AC's phrasing is loose; architecture canonical home is `packages/domain/src/encryption/` per line 4539. The Story 1.5 substrate substantively populates the architecture-canonical home. Documented in Decision 2026-06-XX-041 + Dev Notes here.
- **Don't reinvent Story 1.1's workspace shape**: `packages/domain/` already exists; Story 1.5 ADDS substantive content to `src/encryption/` + extends `package.json` deps + extends `src/index.ts` with a namespaced re-export.
- **Don't reinvent Story 1.2's Drizzle substrate**: schema definitions + RLS + IDs + cross-tenant + secrets.ts wiring + migrations all exist. Story 1.5 IMPORTS the Story 1.3 `canonicalJsonStringify` from `@twt/events` for AAD binding; Story 1.5 does NOT regenerate Drizzle scaffolding.
- **Don't reinvent Story 1.3's substrate**: `packages/events/` `appendEvent`/`loadEvents`/`replayState` + `canonicalJsonStringify` exist. Story 1.5 consumes `canonicalJsonStringify` for AAD binding; Story 1.5 does NOT modify events package.
- **Don't reinvent Story 1.4's substrate**: `packages/contracts/` + `_common/` + OpenAPI emission pipeline + ADR-0005 all landed. Story 1.5 may import `Iso8601Datetime` or `UuidString` from `@twt/contracts/_common` if needed (probably not at Story 1.5 substrate scope); Story 1.5 does NOT modify contracts.
- **Don't substantively populate PII-bearing columns**: per-Epic Story landings; Story 1.5 commits the primitive `piiColumn(tier, fieldClass)` only. The integration test creates a scratch table for round-trip proof, NOT a substantive PII-bearing table.
- **Don't `terraform apply` `cloud-kms-dev.tf`**: Story 1.5 commits the IaC + local-dev fake-KMS only. Live provisioning is deferred per D1-1.5 (analogous to Story 1.2 D1-1.2).
- **Don't substantively wire the DEK migration saga**: Story 1.10+ territory per D3-1.5. The Story 1.5 substrate's `KmsProvider.encryptDek`/`decryptDek` supports re-keying via the `kekRef` argument, but the saga, checkpointing, and metric land later.
- **Don't substantively wire the high-sensitivity-tier IAM project topology**: Story 1.15 territory per D4-1.5. Story 1.5 commits the IAM-binding shape with `var.app_service_account_email` placeholder.
- **Don't substantively wire the KEK-roots destruction approval workflow**: operations policy territory per D5-1.5. Story 1.5 commits the Terraform `lifecycle.prevent_destroy` + `destroy_scheduled_duration` substrate.
- **Don't author the FR-74 PII shielding CI gate**: Story 1.16b territory per D8-1.5. Story 1.5 commits the tier-annotation primitive the gate consumes.
- **Don't author per-domain PII-bearing columns**: per-Epic Story territory per D7-1.5. Story 1.5 commits the `piiColumn(tier, fieldClass)` factory.
- **Don't break the `packages/events/` zod ^3.23.0 pin alignment**: `packages/domain/` already has its own dep tree per Story 1.2; Story 1.5 adds `@google-cloud/kms ^4.x` only; no zod-version coupling.
- **Don't add `@google-cloud/kms` to other workspaces**: `packages/domain/src/encryption/cloud-kms-provider.ts` is the only file importing it; the provider interface is the substitution seam per AR-13.
- **Don't change Story 1.2's migration zero or Story 1.3's migration one**: encryption is application-layer; no DB migration needed at Story 1.5. (The integration test uses a TEMP TABLE via `db.execute(sql\`CREATE TEMP TABLE ...\`)` — no migration committed.)
- **Don't add a `db:migrate` Turbo task or CI job at Story 1.5**: preserves Story 1.2 architecture §1.8 migration-precedes-deploy discipline.
- **Use `pnpm --filter @twt/domain`** for workspace-scoped script invocation.
- **Use Conventional Commits** per Story 1.1 commitlint config (example commits in Task 7.6).
- **HSM protection level is architecturally mandatory**: do NOT configure non-HSM Cloud KMS keys; the architecture §2.7 + §5.2 commit HSM-backed. The Terraform `protection_level = "HSM"` + the runtime `cloudKmsProvider` HSM-assertion-at-first-call together defend against drift.
- **`lifecycle { prevent_destroy = true }` on both KEK + HMAC keys**: Terraform-level defense against unintended `terraform destroy` removing the encryption substrate; align with §5.9 line 3357-3360 two-person approval discipline.
- **AAD binding is non-negotiable**: every Tier-1 ciphertext binds AAD = canonical-JSON-serialized `EncryptionContext`. Skipping AAD binding leaves the ciphertext substitutable across tenants/rows — that's a substantive security property the architecture commits.
- **Don't use `await` in a non-`async` Drizzle `toDriver`/`fromDriver`**: `await` inside a synchronous callback is a syntax error TypeScript will catch. Declare both callbacks as `async` and verify Drizzle 0.45+'s `customType` signature supports `Promise`-returning callbacks at your pinned version. If not, pre-encrypt at the service layer before the Drizzle call (see Dev Notes "Drizzle column-transformer pattern" for the fallback path).
- **Don't serialize `Uint8Array` fields via bare `JSON.stringify`**: JSON encodes `Uint8Array` as a numeric-index object `{0:x,1:y,...}`. Always convert each `Uint8Array` field to a Base64 string (`Buffer.from(field).toString('base64')`) before serialising the envelope object; `parseEnvelope` mirrors with `Buffer.from(field, 'base64')`.
- **`computeHmac` expects `input: Uint8Array`**: `blindIndex` builds the field-class-prefixed string and must convert it with `Buffer.from(\`${fieldClass}:${plaintext}\`, 'utf-8')` before calling the provider. Passing a raw string causes a TypeScript type error and incorrect byte encoding.

### Project Structure Notes

**Workspace tree at Story 1.5 closure** (additions to the Story 1.4 baseline; preserves all Story 1.1 + 1.2 + 1.3 + 1.4 paths):

```
twt/
├── .decision-log.md                    [UPDATED] Task 5.3 — append Decision 2026-06-XX-041
├── README.md                           [UPDATED] Task 7.4 — Substrate state table (Story 1.5)
├── package.json                        [UPDATED] Task 3.1 — crypto:check root script
├── turbo.json                          [UPDATED] Task 3.2 — crypto:check task
├── .github/workflows/ci.yml            [UPDATED] Task 3.4 — crypto-check job
├── docs/
│   ├── adr/
│   │   └── ADR-0006-pii-tier-1-kek-library.md  [NEW] Task 5.1
│   ├── knowledge-transfer/
│   │   └── adr-index.md                [UPDATED] Task 5.2 + 5.4 — flip line 89 slot-reserved-pre-write → drafted + count table + header summary
│   └── runbooks/
│       └── secret-rotation.md          [UPDATED] Task 6.1-6.5 — §2.1.1 + §2.1.2 + §2.1.3 + header + prereq
├── infra/
│   └── gcp/
│       ├── cloud-kms-dev.tf            [NEW] Task 2.1 — keyring + Tier-1 KEK + Tier-2 HMAC + IAM bindings
│       ├── variables.tf                [UPDATED] Task 2.2 — kms_kek_rotation_period_seconds + kms_destroy_scheduled_duration_seconds + app_service_account_email
│       ├── outputs.tf                  [UPDATED] Task 2.3 — kms_tier_1_kek_resource_name + kms_tier_2_hmac_resource_name
│       ├── README.md                   [UPDATED] Task 2.4 — ## Cloud KMS substrate (Story 1.5)
│       └── .terraform-plan-expectations.md  [NEW] Task 2.5 — Story 1.5 expected plan shape
├── packages/
│   └── domain/                         (Story 1.2 substrate; Story 1.5 extends src/encryption/)
│       ├── package.json                [UPDATED] Task 1.2 — @google-cloud/kms ^4.x
│       ├── README.md                   [UPDATED] Task 7.3 — Story 1.5 encryption substrate section
│       ├── src/
│       │   ├── index.ts                [UPDATED] Task 1.12 — namespaced encryption re-export
│       │   └── encryption/             (Story 1.2 placeholder; Story 1.5 substantively populates)
│       │       ├── README.md           [UPDATED] Task 1.13 — substantive purpose + tier model + landing-Story + canonical-home reaffirmation
│       │       ├── index.ts                       [NEW] Task 1.11 — barrel
│       │       ├── tiers.ts                       [NEW] Task 1.3 — PiiTier + PII_TIER_1/2/3
│       │       ├── kms-provider.ts                [NEW] Task 1.4 — KmsProvider interface + KmsKeyRef + EncryptionContext
│       │       ├── fake-kms-provider.ts           [NEW] Task 1.5 — createFakeKmsProvider (tests only)
│       │       ├── cloud-kms-provider.ts          [NEW] Task 1.6 — createCloudKmsProvider (@google-cloud/kms)
│       │       ├── envelope.ts                    [NEW] Task 1.7 — encryptTier1 + decryptTier1 + Tier1Ciphertext + serializeEnvelope/parseEnvelope
│       │       ├── blind-index.ts                 [NEW] Task 1.8 — blindIndex + field-class namespacing
│       │       ├── pass-through.ts                [NEW] Task 1.9 — passThroughTier3 + tier-3 marker
│       │       └── column.ts                      [NEW] Task 1.10 — piiColumn Drizzle customType factory + AsyncLocalStorage encryptionContextStorage + withEncryptionContext wrapper
│       └── tests/
│           ├── smoke.test.ts                      (PRESERVED Story 1.1)
│           └── encryption/
│               ├── envelope.test.ts                          [NEW] Task 4.1
│               ├── blind-index.test.ts                       [NEW] Task 4.2
│               ├── fake-kms-provider.test.ts                 [NEW] Task 4.3
│               └── column-transformer.integration.test.ts   [NEW] Task 4.4
├── tests/
│   └── integration/
│       └── encryption/
│           └── README.md               [NEW] Task 4.5 — slot landing-Story map
└── _bmad-output/implementation-artifacts/
    ├── sprint-status.yaml              [UPDATED] Task 7.2 — 1-5 backlog→ready-for-dev→in-progress→review
    ├── 1-5-cloud-kms-hsm-google-tink-envelope-encryption-pii-tiers.md  [UPDATED] Task 7.x — Dev Agent Record
    └── deferred-work.md                [UPDATED] Task 7.1 — ## Story 1.5 deferred section
```

### Testing standards summary

**At Story 1.5** the test surface is:
- **`packages/domain/tests/smoke.test.ts`** (PRESERVED from Story 1.1 placeholder).
- **`packages/domain/tests/encryption/envelope.test.ts`** (NEW Task 4.1) — vitest unit (no DB); Tier-1 round-trip + AAD binding + field-class binding + DEK uniqueness + envelope shape.
- **`packages/domain/tests/encryption/blind-index.test.ts`** (NEW Task 4.2) — vitest unit (no DB); Tier-2 determinism + field-class namespacing + cross-Pariwar separation + equality-only.
- **`packages/domain/tests/encryption/fake-kms-provider.test.ts`** (NEW Task 4.3) — vitest unit (no DB); byte-level fake provider correctness.
- **`packages/domain/tests/encryption/column-transformer.integration.test.ts`** (NEW Task 4.4) — vitest integration (DATABASE_URL-set-gates-execution per Story 1.3 pattern; uses fake-KMS provider; transaction-rollback isolation per Story 1.3 integration-setup.ts).

**Test runner**: `vitest` per Story 1.1 default; matches the workspace convention. Unit tests run on CI without external dependencies (no DB; no KMS; no live network); the column-transformer integration test runs on CI when `DATABASE_URL` is set + uses the fake-KMS provider. All run via `pnpm turbo run test` + `pnpm turbo run crypto:check` in the existing test job + the new crypto-check job.

**Architecture-committed integration test slots** that Story 1.5 introduces:
- `tests/integration/encryption/` (NEW top-level slot per Task 4.5; landing-Story map for Tier-1 + Tier-2 + per-domain PII columns + FR-74 PII shielding scrape).

**Architecture-committed integration test slots** that Story 1.5 does NOT populate (per Story 1.1 + 1.2 + 1.3 + 1.4 enumeration):
- `tests/integration/pool-engine/replay.spec.ts` (Story 7.x).
- `tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (Story 1.6).
- `tests/integration/rls/policy-regression.spec.ts` (Story 1.6).
- `tests/integration/audit-log/integrity-check.spec.ts` (Story 1.10).
- `tests/integration/snapshot-adapters/property.spec.ts` (Story 7.x).
- `tests/integration/public-pages/scrape-test.spec.ts` (Story 1.16b).

**Live-DB CI substrate**: NOT introduced at Story 1.5 (preserves D2-1.3 deferral to Story 1.6); the column-transformer integration test runs on developer machines + future CI with DATABASE_URL set.

**Crypto-check CI gate**: NEW at Story 1.5 (`crypto-check` job) — runs `pnpm turbo run crypto:check`; executes encryption-substrate unit tests with `KMS_TEST_MODE=fake`; structurally proves the substrate without external KMS dependency.

### References

- [Source: epics.md#Story-1.5] line 1062-1080 — story body + ACs (verbatim source).
- [Source: epics.md#AR-12] line 270 — PII encryption tiers (Tier 1 envelope + Tier 2 hash + Tier 3 clear).
- [Source: epics.md#AR-13] line 271 — Secrets in GCP Secret Manager + provider interface.
- [Source: epics.md#AR-27] line 300 — Cloud KMS in canonical GCP service map.
- [Source: epics.md#NFR-14] line 208 — PII at rest AES-256 + Tier-1 envelope-encrypted via Cloud KMS (HSM-backed) + Google Tink.
- [Source: epics.md#NFR-15] line 209 — In-transit TLS 1.3+ (orthogonal but co-resident concern).
- [Source: epics.md#NFR-16] line 210 — Cross-tenant data isolation (adversarial CI; Story 1.6 substrate).
- [Source: epics.md#Epic-1] line 968-984 — Epic 1 context + cross-story dependencies + AR-12 anchor.
- [Source: architecture.md#1.5-Audit-log] line 884-902 — canonical-JSON; cross-link to Story 1.3 substrate.
- [Source: architecture.md#2.7-PII-encryption-at-rest] line 1498-1534 — three-tier strategy; HMAC input namespacing; KEK rotation cadence; FR-74 classification authority.
- [Source: architecture.md#2.7a-Transport-encryption] line 1535-1583 — TLS 1.3+ at three hop classes (orthogonal substrate; Story 1.13/1.14 territory).
- [Source: architecture.md#2.10a-Isolation-Commitment] line 1676-1730 — audit-mirror credentials separation; cross-link to KEK-roots high-sensitivity tier.
- [Source: architecture.md#5.1-Cloud-provider] line 2920-2939 — GCP `asia-south1` Mumbai; single-vendor risk acknowledgment.
- [Source: architecture.md#5.2-GCP-service-map] line 2940-2994 — Cloud KMS HSM-backed canonical service map entry.
- [Source: architecture.md#5.9-Secret-management] line 3318-3373 — KEK rotation cadence + DEK re-encryption saga + high-sensitivity tier + KEK-roots destruction discipline.
- [Source: architecture.md#Essential-patterns] line 3603-3625 — Context propagation: AsyncLocalStorage for `{requestId, pariwarId, actorId, traceId}`; job payloads carry the envelope.
- [Source: architecture.md#Project-Structure] line 4341-4360 — `packages/domain/src/encryption/` Envelope encryption + blind-index helpers.
- [Source: architecture.md#Cross-cutting-concerns] line 4539 — Encryption + KMS canonical home `packages/domain/src/encryption/`.
- [Source: architecture.md#Top-10-anti-patterns] line 2739-2740 — No PII in error reports; tier-1 ciphertext + tier-2 hash sanitization.
- [Source: docs/knowledge-transfer/adr-index.md] line 89 — `ADR-NNNN-pii-tier-1-kek-library` slot reserved for Story 1.5 closure.
- [Source: docs/knowledge-transfer/adr-index.md] line 78 — `ADR-NNNN-object-storage-tier-policy` co-trigger Story 1.5 + Story 9.2 (D12-1.5).
- [Source: docs/runbooks/secret-rotation.md] — Story 0.1 framework; Story 1.5 substantive Tier-1 + Tier-2 specifics.
- [Source: docs/adr/ADR-0003-datastore-engine.md] — Story 1.2 ADR draft pattern reference.
- [Source: docs/adr/ADR-0004-canonical-json.md] — Story 1.3 ADR draft pattern reference + canonical-JSON cross-Story consumer.
- [Source: docs/adr/ADR-0005-openapi-client-generation.md] — Story 1.4 ADR draft pattern reference.
- [Source: _bmad-output/implementation-artifacts/1-1-turborepo-monorepo-bootstrap.md] — workspace shape inheritance.
- [Source: _bmad-output/implementation-artifacts/1-2-cloud-sql-postgres-drizzle-migration-tooling.md] — `packages/domain/` substrate + Terraform pattern (`cloud-sql-dev.tf` + variables/outputs/locals) + `secrets.ts` provider-interface pattern + fake-Secret-Manager toggle + `turbo db:check` task + CI `db-check` job pattern.
- [Source: _bmad-output/implementation-artifacts/1-3-packages-events-event-log-primitive.md] — `canonicalJsonStringify` for AAD binding + integration-setup.ts transaction-rollback isolation pattern + DATABASE_URL-set-gates-execution convention.
- [Source: _bmad-output/implementation-artifacts/1-4-packages-contracts-zod-openapi-contract-scaffolding.md] — `_common/` primitives (`Iso8601Datetime` + `UuidString`) potentially imported at downstream PII contract Stories.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — Story 1.5 deferred section landed at Task 7.1.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — Story 1.5 development_status entry.
- [Source: .decision-log.md] Decision 2026-06-09-040 (Story 1.4 closure trigger anticipation for Story 1.5) — append Decision 2026-06-XX-041 for Story 1.5 at Task 5.3.
- [Source: feedback_architecture_vs_prd_boundary] — architecture wins on workspace location (`packages/domain/src/encryption/` over epic AC `packages/crypto`).
- [Source: feedback_closure_language_precision] — engineering Closed by [edit] on substrate; ADR + live provisioning + downstream-Story landings = Resolved via explicit deferral.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (`claude-opus-4-7`) via Claude Code, executed by Solo Builder (BigDev) on 2026-06-10 in branch `story-1.5-encryption-envelope`.

### Debug Log References

- `pnpm install` resolved `@google-cloud/kms@4.5.0` (registry-current stable at install time per dep-pin re-validation discipline).
- `pnpm --filter @twt/domain typecheck` exit 0 after Task 1.
- `pnpm --filter @twt/domain crypto:check` initial run: 1 failure in `blind-index.test.ts` (regex mismatch `/colon/` vs actual error message `must not contain ":"`); corrected; rerun exit 0 (26 passed + 2 skipped).
- `vitest run --dir tests/encryption` initial script path used `--dir` flag which sets the project root (not a filter) and matched zero files; corrected to positional path filter `vitest run tests/encryption`.
- Ephemeral Docker Postgres 16 spun up to verify the column-transformer integration test live-DB; `pnpm --filter @twt/domain crypto:check` with `DATABASE_URL` set: 27 passed + 1 skipped (the skipped test is the inverse-branch when-DB-set assertion).

### Completion Notes

- **Dep-pin verification.** Story-file pin `@google-cloud/kms ^4.x` confirmed registry-current at install time; actual installed version: `@google-cloud/kms@4.5.0`. Pin captured in `packages/domain/package.json` + ADR-0006 references + secret-rotation runbook §2.1.3.
- **Pre-execution branch strategy choice.** Branched from local `main` HEAD `8aa8189` per Task 7.5 Option A. (Note: the story file's `origin/main` HEAD reference was stale — local `main` carried the unpushed Story 1.4 code-review-patches commit `8aa8189`; both heads were the same SHA at branch-creation time and `origin/main` will catch up when the Story 1.4 patches + Story 1.5 branch are pushed.)
- **Per-Pariwar HMAC key derivation policy default.** Option B (HMAC-input-context-binding via `pariwar:<id>|` prefix on a single KMS HMAC key) committed at Story 1.5 substrate in both fake + Cloud KMS providers. Substantive Option A vs Option B choice deferred to Story 1.6 per D9-1.5.
- **Tink-TypeScript sunset resolution captured in ADR-0006.** The Decision body enumerates the empirical Tink-TS sunset reality (deprecated 2023 + sunset 2024 + last npm publish 2022; Tink-Java/Go/Python/C++/Obj-C remain actively maintained). The architectural commitment to "Google Tink" is preserved via Tink-equivalent envelope shape + Tink-recommended algorithms (AES-256-GCM AEAD + HMAC-SHA-256 MAC) + Cloud-KMS-native KEK operations (`encrypt`/`decrypt`/`macSign`) + Node `crypto` for the runtime primitives.
- **Architecture-vs-epic-AC divergence reaffirmation.** Epic AC line 1071 ("`packages/crypto`") vs architecture canonical home `packages/domain/src/encryption/` per line 4351 + 4539 — architecture wins per the Story 1.1 `apps/member` + Story 1.2 `packages/db` precedent. **No `packages/crypto` workspace was created.** Captured in Decision 2026-06-10-041 + `packages/domain/src/encryption/README.md`.
- **Cloud KMS Terraform IaC committed.** `infra/gcp/cloud-kms-dev.tf` + variables.tf + outputs.tf + README.md + `.terraform-plan-expectations.md` all landed. Live `terraform apply` deferred per D1-1.5 (analogous to Story 1.2 D1-1.2).
- **Substantive deviations recorded (also enumerated in Decision 2026-06-10-041 Dev-Story Closure Addendum + deferred-work D13-1.5 + D14-1.5):**
  1. **AAD canonical-JSON inlined as `encryptionContextAad` in `packages/domain/src/encryption/canonical-context.ts`** rather than imported from `@twt/events`'s `canonicalJsonStringify`. Rationale: `@twt/events` already depends on `@twt/domain` (events-log.ts imports schema), so importing from events into domain creates a circular workspace dep. The scoped helper produces RFC 8785 JCS canonical-JSON for the `EncryptionContext` shape (3 string keys) — byte-identical output to `canonicalJsonStringify` for this shape. Deferred consolidation tracked in D13-1.5.
  2. **`piiColumn` is a TEXT customType with tier metadata + service-layer encryption helpers** instead of auto-encrypt-on-write inside `customType` `toDriver`/`fromDriver`. `drizzle-orm@^0.45.0`'s `customType` requires synchronous callbacks (verified against `node_modules/drizzle-orm/pg-core/columns/custom.d.ts`); Cloud KMS round-trips are async. Story 1.5 substrate commits `piiColumn(tier, fieldClass?)` as a TEXT customType with tier metadata; substantive encryption flows through explicit service-layer helpers (`encryptTier1` / `decryptTier1` / `blindIndex`). The `AsyncLocalStorage`-backed `encryptionContextStorage` + `withEncryptionContext` wrapper are committed as the architecture-canonical context-propagation seam per architecture §Essential patterns line 3615; substantive consumption lands at Story 1.9+ Fastify pre-handler hooks. Deferred work tracked in D14-1.5. This fallback is anticipated in the story file Dev Notes "Drizzle column-transformer pattern" fallback (b).
  3. **`crypto:check` script path correction.** Story file Task 3.3 prescribed `vitest run --dir tests/encryption`; the correct invocation (verified) is the positional path filter `vitest run tests/encryption`. Corrected in `packages/domain/package.json`.
  4. **`crypto-check` CI job declares `env.KMS_TEST_MODE=fake` at the job level** + `turbo.json` `crypto:check` task `env: ["KMS_TEST_MODE", "DATABASE_URL"]` for Turbo cache busting.
- **All CI gates green (local):** `pnpm turbo run lint typecheck test build` zero-regression vs Story 1.4 baseline + new `crypto:check` task; `pnpm crypto:check` 26 passed + 2 skipped unit (no DB), 27 passed + 1 skipped with ephemeral Docker Postgres 16; `pnpm db:check` unchanged exit 0; `pnpm contracts:check-openapi-determinism` unchanged exit 0.

### File List

**New:**
- `packages/domain/src/encryption/tiers.ts`
- `packages/domain/src/encryption/kms-provider.ts`
- `packages/domain/src/encryption/canonical-context.ts` _(deviation-derived; D13-1.5)_
- `packages/domain/src/encryption/fake-kms-provider.ts`
- `packages/domain/src/encryption/cloud-kms-provider.ts`
- `packages/domain/src/encryption/envelope.ts`
- `packages/domain/src/encryption/blind-index.ts`
- `packages/domain/src/encryption/pass-through.ts`
- `packages/domain/src/encryption/column.ts`
- `packages/domain/src/encryption/index.ts`
- `packages/domain/tests/encryption/envelope.test.ts`
- `packages/domain/tests/encryption/blind-index.test.ts`
- `packages/domain/tests/encryption/fake-kms-provider.test.ts`
- `packages/domain/tests/encryption/column-transformer.integration.test.ts`
- `tests/integration/encryption/README.md`
- `infra/gcp/cloud-kms-dev.tf`
- `infra/gcp/.terraform-plan-expectations.md`
- `docs/adr/ADR-0006-pii-tier-1-kek-library.md`

**Modified:**
- `packages/domain/package.json` (add `@google-cloud/kms ^4.5.0` dep + `crypto:check` script)
- `packages/domain/src/index.ts` (namespaced `export * as encryption from './encryption/index.js'`)
- `packages/domain/src/encryption/README.md` (extended substantively for Story 1.5)
- `packages/domain/README.md` (Story 1.5 substrate landing section)
- `infra/gcp/variables.tf` (kms_kek_rotation_period_seconds + kms_destroy_scheduled_duration_seconds + app_service_account_email)
- `infra/gcp/outputs.tf` (kms_tier_1_kek_resource_name + kms_tier_2_hmac_resource_name)
- `infra/gcp/README.md` (`## Cloud KMS substrate (Story 1.5)` section + landing-story map row)
- `package.json` (root `crypto:check` script)
- `turbo.json` (`crypto:check` task with env array)
- `.github/workflows/ci.yml` (`crypto-check` job with `KMS_TEST_MODE: fake`)
- `docs/knowledge-transfer/adr-index.md` (line 89 slot-reserved-pre-write → drafted; row-count table; header summary line extended)
- `docs/runbooks/secret-rotation.md` (§2.1.1 + §2.1.2 + §2.1.3 + prereq bullet + header `Last material edit` + Changelog entry)
- `.decision-log.md` (Decision 2026-06-10-041 Dev-Story Closure Addendum)
- `_bmad-output/implementation-artifacts/deferred-work.md` (Story 1.5 section D13-1.5 + D14-1.5 deviation-derived items)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (development_status[1-5-cloud-kms-...] → review; last_updated header)
- `_bmad-output/implementation-artifacts/1-5-cloud-kms-hsm-google-tink-envelope-encryption-pii-tiers.md` (Status review + task checkboxes + Dev Agent Record + File List + Change Log)

**Deleted:**
- `packages/domain/src/encryption/.gitkeep` (Story 1.2 placeholder; superseded by substantive substrate)

## Change Log

| Date | Author | Summary |
|---|---|---|
| 2026-06-10 | BigDev (Solo Builder) | Story 1.5 substrate substantive author-commit: `packages/domain/src/encryption/` populated with three-tier API (envelope + blind-index + pass-through + `piiColumn`) + Cloud KMS + fake KMS providers; `infra/gcp/cloud-kms-dev.tf` Terraform IaC; `pnpm crypto:check` Turbo task + CI `crypto-check` job; 4 test files (3 unit + 1 live-DB integration); ADR-0006-pii-tier-1-kek-library drafted; `docs/runbooks/secret-rotation.md` §2.1.1 + §2.1.2 + §2.1.3 extended. Deviations: AAD canonical-JSON inlined (cycle avoidance; D13-1.5); `piiColumn` as TEXT customType + service-layer encryption helpers (Drizzle 0.45 sync customType; D14-1.5). |
