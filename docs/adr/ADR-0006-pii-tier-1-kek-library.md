# ADR-0006: PII Tier-1 KEK library — `@google-cloud/kms` + Node `crypto` AES-256-GCM + HMAC-SHA-256

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** Solo Builder (BigDev), discharging architecture §2.7 line 1508 + `docs/knowledge-transfer/adr-index.md` line 89 at Story 1.5 closure.
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (security-relevant — trustee judgment); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** (none)
> **Superseded by:** (none)

## Context

Architecture §2.7 line 1498-1534 commits the **three-tier PII strategy**: Tier 1 ciphertext (envelope-encrypted; KEK in Cloud KMS HSM-backed; per-row DEK; AES-256-GCM AEAD); Tier 2 HMAC-SHA-256 blind index with field-class namespacing + per-Pariwar key context; Tier 3 plaintext (FR-74 Public-vs-Private matrix classification authority).

Architecture line 1508 commits the **library** as Google Tink: "Library: Google Tink (committed in an ADR alongside Cloud KMS integration)."

### The empirical reality at Story 1.5 execution time (2026-06)

Google's Tink crypto library is alive in five language ecosystems — actively maintained Java, Go, Python, C++, and Obj-C. **Tink-TypeScript was deprecated by Google in 2023 + sunset in 2024.** Last npm publish of `tink-crypto` was 2022. Google has not announced a Tink-TS successor.

The architectural commitment to "Google Tink" was a commitment to the **envelope pattern + algorithm choices** Tink documents as recommended (per-row DEK + KEK-wrapped DEK + AEAD ciphertext + auth tag + AAD binding; AES-256-GCM AEAD; HMAC-SHA-256 MAC). The architectural property holds; the library implementation adapts to the empirical TS-ecosystem reality.

### Architectural constraints that bound the choice

- **§2.7 line 1502-1508** — envelope encryption: KEK in Cloud KMS HSM-backed; per-row DEK encrypted by KEK and stored alongside the ciphertext.
- **§2.7 line 1509-1514** — Tier-2 blind index: HMAC-SHA-256 with separate keyed secret; HMAC input namespacing `HMAC(key, "<field-class>:" || value)`; equality-only lookup; different keys per Pariwar where required.
- **§5.2 line 2952** — Cloud KMS with HSM-backed keys as canonical service map entry.
- **§5.9 line 3318-3373** — KEK rotation cadence (annual) + DEK re-encryption saga + KEK-roots destruction discipline (30-day max delayed-destruction window per Cloud KMS platform).
- **§AR-13 line 271** — "Secrets in GCP Secret Manager; rotation policy per architecture Category 5; secrets abstracted behind a provider interface (12-factor)" — the library choice must be substitutable behind a provider interface.

## Decision

**Adopt `@google-cloud/kms` ^4.x + Node `crypto` AES-256-GCM AEAD as the Tier-1 envelope-encryption substrate. Adopt `@google-cloud/kms` `MacSign` API + Node `crypto` HMAC-SHA-256 (fake-mode fallback) as the Tier-2 blind-index substrate.**

The Decision is substantively re-openable post-Story-1.10 (first audit-log substantive consumption of envelope ops) if Google ships a new Tink-TS replacement OR if Cloud KMS evolves to support direct symmetric-encrypt-with-AAD at the wire (eliminating the per-row-DEK envelope shape) — per the architecture's ADR-supersession discipline.

### Tool comparison grid

| Tool | Algorithm parity | Envelope-shape parity | AAD-binding parity | Maintenance | Disposition |
|---|---|---|---|---|---|
| `@google-cloud/kms` (KEK + HMAC ops) + Node `crypto` (AEAD + fake HMAC) | ✅ AES-256-GCM + HMAC-SHA-256 | ✅ Per-row DEK + KEK-wrapped DEK + IV + ciphertext + auth tag | ✅ `EncryptionContext` canonical-JSON ↔ Tink AssociatedData | Very active (GCP first-party + Node runtime native) | **Primary** |
| `tink-crypto` (Google's Tink TS port) | ✅ AES-256-GCM + HMAC-SHA-256 | ✅ Tink envelope | ✅ AssociatedData native | **Deprecated 2023 + sunset 2024**; last npm publish 2022 | NOT chosen — deprecated upstream; Phase-0 dep-pin discipline prohibits |
| `node-jose` (broader JOSE library) | ✅ AES-256-GCM (within JWE) | ⚠ JWE-shaped envelope (over-broad) | ⚠ JWE protected header (not Tink-equivalent) | Active | NOT chosen — JWE complexity is unnecessary for envelope-only use case; surface area too broad |
| `libsodium-wrappers` (Sodium WebAssembly bindings) | ❌ XChaCha20-Poly1305, not AES-256-GCM | ✅ AEAD envelope-shape works | ✅ AAD support | Very active; mature | NOT chosen — algorithm divergence from architecture §2.7 (AES-256-GCM commitment); cross-runtime parity with Java/Go Tink ecosystems breaks |
| Hand-rolled OpenSSL CLI invocation | ✅ AES-256-GCM via `openssl enc` | ⚠ Would have to assemble envelope manually | ⚠ AAD handling is fragile in CLI | n/a | NOT chosen — correctness-fragility unacceptable for security-load-bearing primitives |

### Primary choice rationale — `@google-cloud/kms` + Node `crypto`

- **Cloud KMS HSM-backed KEK is architecturally mandatory** per §5.2 line 2952; the `@google-cloud/kms` SDK is the canonical access path. HSM protection level is enforced at provider construction via an `HSM`-assertion-at-first-call check (defense against substrate-drift).
- **Node `crypto` AES-256-GCM is the same primitive Tink wraps** — `createCipheriv('aes-256-gcm', dek, iv)` + `cipher.setAAD(aad)` + `cipher.getAuthTag()` is byte-equivalent to Tink-Java's `AesGcmJce` envelope when given the same inputs.
- **Per-row DEK + KMS-wrapped KEK is the envelope shape Tink documents as recommended.** The substrate matches Tink-Java envelope at the wire-format level: `{ kekRef, encryptedDek, iv, ciphertext, authTag, aadShape: 'v1' }`.
- **HMAC-SHA-256 via Cloud KMS `MacSign` is HSM-backed.** Cloud KMS's `MacSign` API supports HMAC-SHA-256 natively at HSM protection level; matches Tink-Java's `HmacKeyManager`.
- **Node `crypto` HMAC-SHA-256 is the fake-mode fallback for tests.** The `createFakeKmsProvider` returns a `KmsProvider` backed by `crypto.createHmac('sha256', fakeKeyBytes)` — byte-level correct + zero external dependency.

### Tink-equivalence parity

| Dimension | Architecture commitment | Story 1.5 substrate satisfies |
|---|---|---|
| AEAD algorithm | AES-256-GCM | ✅ `crypto.createCipheriv('aes-256-gcm', ...)` |
| MAC algorithm | HMAC-SHA-256 | ✅ Cloud KMS `MacSign` HMAC_SHA256 + `crypto.createHmac('sha256', ...)` fallback |
| Per-row DEK | Fresh per row | ✅ `crypto.randomBytes(32)` per `encryptTier1` call |
| KEK wrap | HSM-backed | ✅ Cloud KMS `encrypt({ name, plaintext: dek, ... })` with `HSM`-assertion-at-first-call |
| AAD binding | Bound to row identity | ✅ `EncryptionContext` canonical-JSON serialized; passed as `additionalAuthenticatedData` |
| Envelope wire format | Tink-equivalent | ✅ `{kekRef, encryptedDek, iv, ciphertext, authTag, aadShape}` Base64-JSON; `enc:v1:` prefix |
| Field-class namespacing (Tier 2) | `HMAC(key, "<field-class>:" || value)` | ✅ `blindIndex` builds `${fieldClass}:${plaintext}`; KmsProvider prepends `pariwar:${pariwarId}|`; full MacSign input = `pariwar:${pariwarId}|${fieldClass}:${plaintext}` |
| Per-Pariwar separation (Tier 2) | "different keys per Pariwar where required" | ✅ Option B context-binding at substrate (D9-1.5 Story 1.6 substantive choice) |

### Not-chosen rationale

- **`tink-crypto`** — Google deprecated Tink-TypeScript in 2023 + sunset 2024. Last npm publish is 2022. Phase-0 dep-pin discipline (Story 1.2 D12-1.2) prohibits adopting deprecated tools.
- **`node-jose`** — JWE-shaped envelope introduces JWE complexity (protected headers, JWK formats, content-encryption-key vs key-encryption-key terminology) unnecessary for envelope-only use case. Surface area too broad for the bounded substrate need.
- **`libsodium-wrappers`** — XChaCha20-Poly1305 (Sodium's recommended AEAD) is not AES-256-GCM. Architecture §2.7 commits AES-256-GCM (matches Tink-Java + Cloud KMS native). Cross-runtime parity with Java/Go Tink ecosystems requires AES-256-GCM.
- **Hand-rolled OpenSSL CLI** — Correctness-fragility unacceptable for security-load-bearing primitives. CLI error paths swallow AEAD authentication failures by default; programmatic AAD binding is brittle through shell escaping.

## Consequences

1. **`packages/domain/src/encryption/cloud-kms-provider.ts` is the only file in the monorepo importing `@google-cloud/kms`.** The `KmsProvider` interface is the substitution seam per AR-13. Other workspaces consume Cloud KMS only via the `KmsProvider` interface from `@twt/domain`.
2. **Envelope wire-format `enc:v1:<base64-json>` is committed as a versioned format.** Future format migrations (e.g., adding AES-256-GCM-SIV for nonce-misuse resistance) bump the prefix to `enc:v2:` and the decrypt path supports both. The `aadShape: 'v1'` field inside the envelope is the structural version marker for AAD-derivation logic.
3. **Per-row DEK storage adds ~350-400 bytes per Tier-1 column for short plaintexts.** The 32-byte DEK, once wrapped by Cloud KMS (AES-256 GCM), becomes ~97-100 bytes binary (~132 chars Base64). The 12-byte IV is ~16 chars Base64; the 16-byte auth tag is ~24 chars Base64; the ciphertext is roughly the same size as the plaintext. JSON envelope structural overhead (field names, braces, `enc:v1:` prefix) adds another ~80-100 chars. Total: a column previously sized for a 10-15 byte plaintext (e.g., mobile number) becomes a ~350-400 char TEXT column. Downstream Drizzle migrations declare PII-Tier-1 columns as unbounded TEXT per Story 1.5 schema discipline.
4. **KEK rotation triggers DEK re-encryption saga** (architecture §5.9 line 3339-3343). The saga substantive wiring lands at Story 1.10+ per D3-1.5. The Story 1.5 substrate provides the API seam (`KmsProvider.encryptDek`/`decryptDek` with `kekRef` argument; `auditHook?` slot for Story 1.10 audit-log substantive consumption).
5. **AAD canonical-JSON helper is inlined per substrate constraint.** Story 1.3's `canonicalJsonStringify` lives in `@twt/events`, which depends on `@twt/domain`. Adding `@twt/events` as a dep of `@twt/domain` would create a circular workspace dep. Story 1.5 commits a scoped `encryptionContextAad` helper for the `EncryptionContext` shape only (3 string keys); byte-identical output to `canonicalJsonStringify` for this shape. Future consolidation captured in D13-1.5.
6. **Drizzle 0.45 sync `customType` constraint.** Cloud KMS round-trips are async; Drizzle's `customType` requires sync `toDriver`/`fromDriver`. Story 1.5 commits `piiColumn(tier, fieldClass?)` as a TEXT customType with tier metadata attached — substantive encryption happens via explicit service-layer helpers. Auto-encrypt-on-write inside Drizzle is deferred per D14-1.5.
7. **Revisit cadence.** At first Tier-1-bearing column substantive consumption (Story 3.1+ member mobile/email/Aadhaar/DOB/address per Sushil signup flow), real-usage validation. If blocking (e.g., Cloud KMS rate-limits bite at scale, or `@google-cloud/kms` v5 ships a breaking change that's hard to absorb), supersede via `ADR-NNNN-pii-tier-1-kek-library-revised`.

## Status lifecycle

- **drafted** at Story 1.5 author-commit — substantive author-commit; rationale on file; tool comparison grid + Tink-equivalence parity grid published.
- **under-trustee-review** post-Story-1.5-merge — set when the Story 1.5 PR merges to main; tracked at `docs/knowledge-transfer/adr-index.md`.
- **ratified** per Trustee Panel session — light-touch ratification path acceptable with a **security-review checklist** appended to this ADR body (engineering with security review). The checklist must affirm: (a) AES-256-GCM is the right AEAD; (b) per-row DEK is the right envelope shape; (c) HSM protection level is enforced; (d) AAD binding is structurally non-bypassable; (e) the `KmsProvider` interface admits future provider substitution without ciphertext migration.
- **superseded** if Story 1.10+ surfaces a deal-breaker, OR if Google ships a new Tink-TS replacement that fits the architectural commitment more tightly, OR if Cloud KMS evolves direct-symmetric-encrypt-with-AAD eliminating the per-row-DEK envelope shape.

## Per [[feedback_closure_language_precision]] posture

- **Library choice + ADR body = Closed by [edit]** at Story 1.5 commit: ADR exists; comparison grid + Tink-equivalence grid published; consequences enumerated; the substantive cross-Story-discharge triggers are downstream-Story territory per architecture's PR-2 boundaries.
- **Trustee Panel ratification = Resolved via explicit deferral** with a light-touch ratification path; security-review checklist gates the substantive flip.
- **Live Cloud KMS provisioning = Resolved via explicit deferral** to D1-1.5 (analogous to Story 1.2 D1-1.2 deferred infrastructure leg).
- **DEK migration saga substantive wiring = Resolved via explicit deferral** to D3-1.5 (Story 1.10+).
- **High-sensitivity-tier IAM project topology = Resolved via explicit deferral** to D4-1.5 (Story 1.15).
- **Per-Pariwar HMAC key derivation policy substantive choice (Option A vs Option B) = Resolved via explicit deferral** to D9-1.5 (Story 1.6).
- **FR-74 PII shielding CI gate = Resolved via explicit deferral** to D8-1.5 (Story 1.16b).
- **Object-storage tier policy ADR co-trigger = Resolved via explicit deferral** to D12-1.5 (Story 9.2).

## References

- Architecture §2.7 line 1498-1534 — three-tier PII strategy.
- Architecture §5.2 line 2940-2994 — Cloud KMS HSM-backed canonical service map.
- Architecture §5.9 line 3318-3373 — Secret Manager + rotation + KEK-roots destruction.
- Architecture §Cross-cutting concerns line 4539 — `packages/domain/src/encryption/` canonical home.
- Epics line 270 (AR-12) — PII encryption tiers.
- Epics line 271 (AR-13) — Secrets behind provider interface.
- `docs/knowledge-transfer/adr-index.md` line 89 — slot reserved pre-write.
- `docs/adr/ADR-0003-datastore-engine.md` — Story 1.2 ADR draft pattern reference.
- `docs/adr/ADR-0004-canonical-json.md` — Story 1.3 ADR draft pattern reference + the `canonicalJsonStringify` substrate referenced in Consequence #5.
- `docs/adr/ADR-0005-openapi-client-generation.md` — Story 1.4 ADR draft pattern reference.
- `docs/runbooks/secret-rotation.md` §2.1 — KEK rotation procedure; Story 1.5 extends with Tier-1 + Tier-2 specifics.
- `_bmad-output/implementation-artifacts/1-5-cloud-kms-hsm-google-tink-envelope-encryption-pii-tiers.md` — Story 1.5 file.
- `_bmad-output/implementation-artifacts/deferred-work.md` `## Story 1.5 deferred` section — cross-Story discharge triggers.
- `@google-cloud/kms` — https://www.npmjs.com/package/@google-cloud/kms (registry-current `^4.5.0` at Story 1.5 install time).
- Google Tink — https://github.com/tink-crypto (monorepo org; per-language repos: `tink-java`, `tink-go`, `tink-python`, `tink-cc`, `tink-objc` — actively maintained); Tink-TypeScript deprecated 2023 + sunset 2024 + last npm published 2022; no TS successor announced.
- Cloud KMS `MacSign` API — https://cloud.google.com/kms/docs/create-validate-mac.
- RFC 8785 JSON Canonicalization Scheme (JCS) — referenced for AAD canonical-JSON shape.
