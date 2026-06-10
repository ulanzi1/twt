# src/encryption/

**Landing Story: 1.5** — Cloud KMS HSM + envelope encryption substrate per AR-12
+ architecture §2.7 + §5.2 + §5.9.

## Substrate

This module is the architecture-canonical home for PII encryption (architecture
§Cross-cutting concerns line 4539). Story 1.5 substantively populates it with:

- **Tier model** (`tiers.ts`) — `PiiTier = 1 | 2 | 3`. Tier 1: envelope-encrypted
  via Cloud KMS HSM-backed KEK + per-row DEK + AES-256-GCM AEAD. Tier 2: HMAC-SHA-256
  blind index with field-class namespacing + per-Pariwar key context. Tier 3:
  plaintext (classification authority is FR-74 Public-vs-Private matrix; CI gate at
  Story 1.16b).
- **KMS seam** (`kms-provider.ts`) — `KmsProvider` interface per AR-13 ("secrets
  abstracted behind a provider interface"). Two implementations:
  `createCloudKmsProvider` (production; `@google-cloud/kms`) and
  `createFakeKmsProvider` (tests-only; Node `crypto`).
- **Tier-1 envelope** (`envelope.ts`) — `encryptTier1` / `decryptTier1` +
  `serializeEnvelope` / `parseEnvelope`. Envelope format: `enc:v1:<base64-json>`
  (versioned for future `enc:v2:` migration per ADR-0006 forward-path).
- **Tier-2 blind index** (`blind-index.ts`) — `blindIndex(fieldClass, plaintext,
  context, kms, hmacKeyRef)` returning hex HMAC. Equality-lookup only per
  architecture §2.7 line 1514.
- **Tier-3 pass-through** (`pass-through.ts`) — `passThroughTier3` identity +
  `TIER_3_MARKER` symbol for Story 1.16b CI gate consumption.
- **Drizzle integration** (`column.ts`) — `piiColumn(tier, fieldClass?)`
  TEXT customType factory + `AsyncLocalStorage`-backed
  `encryptionContextStorage` + `withEncryptionContext` wrapper.

## Architecture-vs-epic-AC reaffirmation

Epic AC line 1071 reads "the encryption envelope is authored in
`packages/crypto`"; the architecture-canonical home is
`packages/domain/src/encryption/` per §Cross-cutting concerns line 4539 and
§Project Structure line 4351. Story 1.5 follows architecture canonical (matches
the Story 1.1 `apps/member` and Story 1.2 `packages/db` divergence-reaffirmation
precedent). **No `packages/crypto` workspace exists or will be created**;
captured in Decision 2026-06-10-041.

## Tink-TypeScript sunset

Architecture §2.7 line 1508 commits to Google Tink. Tink-TypeScript was
deprecated in 2023 + sunset in 2024 (Tink-Java/Go/Python/C++/Obj-C remain
actively maintained). The architectural commitment is preserved by Tink-equivalent
envelope shape + Tink-recommended algorithms (AES-256-GCM + HMAC-SHA-256) +
Cloud-KMS-native KEK operations. Captured in ADR-0006.

## Drizzle 0.45 sync customType constraint (substrate deviation)

Drizzle 0.45's `customType` requires synchronous `toDriver` / `fromDriver`
callbacks; Cloud KMS round-trips are async. Story 1.5 substrate commits
`piiColumn` as a TEXT customType with tier metadata attached — substantive
encryption is performed by explicit service-layer helpers
(`encryptTier1` / `decryptTier1` / `blindIndex`). The `AsyncLocalStorage`
context-propagation seam (`encryptionContextStorage` + `withEncryptionContext`)
aligns with architecture §Essential patterns line 3615 and is the substrate
the Story 1.9+ Fastify pre-handler hooks substantively populate. The
auto-encrypt-on-write-via-customType behaviour is deferred per D14-1.5 to
when Drizzle 0.46+ async customType lands OR Story 1.9+ apps/api substantively
wires the service-layer helper convention.

## AAD canonical-JSON deviation

Architecture §2.7 commits AAD = canonical-JSON-serialized `EncryptionContext`.
Story 1.3's `canonicalJsonStringify` lives in `@twt/events`, which depends on
`@twt/domain` (events-log.ts imports schema). Adding `@twt/events` as a dep of
`@twt/domain` creates a circular workspace dependency. Story 1.5 resolves this
with a scoped helper (`canonical-context.ts`'s `encryptionContextAad`) that
produces RFC 8785-compliant canonical-JSON for the `EncryptionContext` shape
only (3 string keys). Byte-identical output to `canonicalJsonStringify` for the
same input. Future consolidation captured in D13-1.5.

## Per-Pariwar HMAC key separation (Option B default)

Architecture §2.7 line 1512-1513 says "different keys per Pariwar to prevent
cross-Pariwar correlation (where required)". Story 1.5 substrate defaults to
**Option B**: HMAC-input-context-binding via `pariwar:<id>|` prefix on a single
KMS HMAC key (both fake + Cloud KMS providers). The substantive choice between
Option A (per-Pariwar separate KMS keys) and Option B (context-binding on a
single key) is Story 1.6 territory per D9-1.5.

## Fake-vs-live KMS toggle

`KMS_TEST_MODE=fake` (default) — `createFakeKmsProvider` for tests + CI
without external dependencies.
`KMS_TEST_MODE=live` — `createCloudKmsProvider` against the substantively
provisioned `twt-dev` GCP project (live provisioning deferred per D1-1.5).

## Usage at downstream Stories

```typescript
import { encryption } from '@twt/domain';

// Schema declaration (Story 3.1+):
const members = pgTable('members', {
  id: uuid('id').primaryKey(),
  mobile: encryption.piiColumn(1, 'mobile')('mobile').notNull(),
  mobileHash: encryption.piiColumn(2, 'mobile')('mobile_hash').notNull(),
  firstName: encryption.piiColumn(3)('first_name').notNull(),
});

// Service-layer encrypt-on-write (Story 1.9+ apps/api):
import { encryption as enc } from '@twt/domain';

const kms = enc.createCloudKmsProvider({ kekRef, hmacKeyRef, projectId, location });
const ctx = { pariwarId, fieldClass: 'mobile', rowKey };

const envelope = enc.serializeEnvelope(
  await enc.encryptTier1(Buffer.from(plaintextMobile, 'utf-8'), ctx, kms, kekRef),
);
const mobileHash = await enc.blindIndex('mobile', plaintextMobile, { pariwarId }, kms, hmacKeyRef);

await enc.withEncryptionContext({ context: ctx, kms, kekRef, hmacKeyRef }, async () => {
  await db.insert(members).values({
    id: memberId,
    mobile: envelope,
    mobileHash,
    firstName: 'Sushil',
  });
});
```

## References

- Architecture §2.7 (PII encryption at rest) — three-tier strategy.
- Architecture §5.2 (GCP service map) — Cloud KMS HSM-backed.
- Architecture §5.9 (Secret management) — rotation cadence + DEK saga + KEK roots.
- Architecture §Essential patterns line 3615 — AsyncLocalStorage context propagation.
- ADR-0006-pii-tier-1-kek-library — library + envelope-format choice.
- `docs/runbooks/secret-rotation.md` §2.1 — KEK rotation specifics.
