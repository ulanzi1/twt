# src/encryption/

**Landing Story: 1.5** — Cloud KMS + Google Tink envelope encryption per AR-12.

Drizzle column transformers for envelope-encrypted PII tiers + blind-index
helpers per architecture §1.5 line 1073. Story 1.5 authors the substantive
`encrypt(tier, plaintext)` + `decrypt(tier, ciphertext)` column transformers.
Empty at Story 1.2.
