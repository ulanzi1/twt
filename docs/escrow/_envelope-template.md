# Envelope Template

> ⚠️ **THIS IS A SCHEMA. DO NOT FILL IN-PLACE. DO NOT COMMIT POPULATED INSTANCES.**
>
> This file defines what fields a sealed envelope holds. Filled instances must NEVER be committed to the repo in plaintext or any reversible form — they live at the custodial location selected by the Trustee Panel ADR. Constructing an envelope is a sealing-procedure operation (`sealing-procedure.md` §2.3), not a file edit. If you find yourself populating this template's fields in this file (or any file under `docs/escrow/`), STOP — you are constructing an envelope outside the sealing procedure. Per `README.md` "Critical scope distinction", a committed credential payload is a P0 framework violation.

This template is the **schema** for the contents of a sealed credential envelope. It is **not** the envelope itself — actual sealed envelopes live at the custodial location selected by the Trustee Panel (see `README.md` "Critical scope distinction"). The repo holds only the schema and the pointer.

When a new envelope is constructed under the trustee-selected sealing mechanism, the construction process populates the fields below into the envelope's contents (whether the envelope is a physical sealed envelope holding a printed sheet, a GPG-encrypted file, a Shamir-shared key bundle, or another mechanism per the credential-escrow-mechanism ADR).

---

## Envelope content fields

Every sealed envelope MUST hold the following fields. Missing or ambiguous fields are a sealing-procedure gap (see `sealing-procedure.md` §4 Verification checks).

### `envelope_id`

A unique, stable identifier for this envelope. Format: `escrow-<envelope_class>-<sequence>` where `<sequence>` is a zero-padded monotonic integer (e.g., `escrow-prod-credential-001`, `escrow-audit-mirror-credential-001`). The `envelope_id` is recorded in `credential-inventory.md` and in every `escrow-ledger.md` row that references this envelope.

### `envelope_class`

One of three allowed values; this field is **load-bearing** for the §2.10a audit independence invariant:

- `prod-credential` — production application credentials (prod DB, Cloudflare admin, Dokploy admin, payment intent / banking, DigiLocker integration, DPDPA breach-reporting tooling, and per-partner integrations). Quorum-open authority: prod-class trustee subset per the credential-escrow-mechanism ADR.
- `audit-mirror-credential` — credentials granting access to the audit-mirror project (`twt-audit-mirror` per architecture §2.10 / §5.9). Quorum-open authority: audit-class trustee subset, **structurally disjoint** from the prod-class subset by the mechanism the ADR records.
- `high-sensitivity-tier-credential` — KEK roots, partner JWT signing keys, telephony recording-storage credentials per architecture §5.9 high-sensitivity tier. Operational rotation requires two-person Terraform-mediated approval per §5.9; escrow recovery requires ≥2-trustee quorum aligned to the high-sensitivity discipline.

A sealing operation that proposes an envelope with the wrong `envelope_class` for the underlying credential MUST be aborted. The mapping from credential to envelope_class is canonicalized in `credential-inventory.md`; do not redefine it at sealing time.

### `credential_class`

The named credential class this envelope holds. Examples: `cloudflare-account-admin`, `cloud-sql-service-account-prod`, `dokploy-substrate-admin`, `digilocker-oauth-client`, `upi-intent-signing-key`, `audit-mirror-write-service-account`, `kek-root-tier-1`, `dpo-breach-reporting-portal`, etc. The credential class is one row in `credential-inventory.md`; the envelope holds **one credential class** per envelope (multiple credentials of the same class — e.g., primary + backup tokens — MAY share an envelope; credentials of different classes MAY NOT, because their re-seal triggers and quorum-open authorities differ).

### `system_identity`

The system this credential authenticates against. Examples: `cloudflare.com (account ID <id>)`, `Cloud SQL instance <name> in project <project>`, `DigiLocker OAuth tenant <tenant>`, etc. Specific enough that a trustee retrieving the credential under bus-factor scenario knows where to use it without consulting Solo Builder.

### `credential_payload`

The actual credential content — the token, password, key material, recovery codes, OAuth client secret, etc. — that authenticates to `system_identity`. The format depends on the credential class:

- For a single secret value: the value verbatim (e.g., a Cloudflare API token).
- For a key pair: the private key + the public key reference + the algorithm.
- For OAuth credentials: client_id + client_secret + the redirect URI allowlist + the authorization endpoint.
- For Shamir-shared values: the share assigned to this envelope (the threshold + share index recorded in the verification metadata).
- For physically-anchored credentials (bank account access cards, hardware tokens): the credential's location + retrieval instructions + any unlock secret.

The `credential_payload` is the only field whose form depends on the sealing mechanism — the mechanism may transform the payload (encrypt, share-split, physically transport) but does not change the schema's intent.

### `sealing_date`

The date the envelope was sealed. Format: `YYYY-MM-DD`.

### `sealing_trustees`

The ≥2 trustees who sealed the envelope, each with: name, role, identifying contact (phone, email, or signature reference). The signing event itself happens per the sealing-procedure runbook.

### `intended_quorum_class`

The trustee subset whose ≥2 members can quorum-open this envelope. The subset definition lives in the credential-escrow-mechanism ADR (per the chosen separation mechanism); the field here references the subset by name (e.g., `prod-subset-A`, `audit-mirror-subset-B`). For envelopes sealed before the ADR exists (e.g., during Story 0.2 Task 7 — `_AWAITING EXTERNAL ACTION_`), this field is populated with the trustee names verbatim; the ADR retrospectively groups them into the named subset.

### `re_seal_trigger_conditions`

The conditions under which this envelope must be re-sealed. Always includes:

- Rotation of the underlying credential per architecture §5.9 (or per the credential's specific rotation policy where §5.9 does not directly govern, e.g., the bank-policy cadence for trust bank operational credentials).
- Detected compromise of the credential payload.
- Detected compromise of the sealing mechanism (e.g., a CVE in the chosen cryptographic toolchain).
- Detected compromise of any sealing trustee's custody of their share/key (even if the credential payload is unchanged — the mechanism's per-trustee anchor is now partially compromised).
- Detected compromise of the custodial location.
- **Trustee membership change affecting this envelope's quorum subset** — resignation, removal, death, or any change that reduces the available quorum below ≥2, OR addition of a trustee whose subset assignment must be re-evaluated against the §2.10a disjointness property. The re-seal re-records `sealing_trustees` and `intended_quorum_class` against the current Panel composition.
- Periodic re-attestation cadence (per operations policy; fallback default per `README.md` "Fallback cadence pre-operations-policy").

May also include credential-class-specific triggers (e.g., partner contract renewal for partner JWT signing keys).

### `last_rotation_reference`

A pointer to the most recent rotation event for this credential. For credentials whose rotation is recorded in `docs/runbooks/secret-rotation.md` execution history (rotation runbook ledger entries), this field references the ledger row. For credentials whose rotation predates the runbook framework (e.g., trust bank operational credentials), this field records the rotation date and the operational-origin attestation.

### `custodial_location_reference`

A pointer to the custodial location where this envelope physically resides. Format depends on the trustee-selected location (per the credential-escrow-mechanism ADR):

- For a bank safe deposit box: bank name + branch + box number + held-jointly-by trustee names.
- For trustee residences: trustee name + sealed-container-identifier.
- For notary/legal-counsel custody: counsel firm + matter identifier + envelope identifier within counsel's custody.
- For cryptographic sealing under a software vault: vault provider + emergency-recovery-kit reference + ≥2-trustee recovery share distribution.

This field is what makes the envelope retrievable; missing this field means the envelope cannot be located, which is a P0 sealing-procedure gap.

### `verification_check_signature`

The deterministic pass/fail signal that confirms envelope integrity at retrieval time. For physical envelopes: seal-tape integrity reference + tamper-evident packaging description. For cryptographic envelopes: ciphertext hash + MAC + expected key fingerprint. The check is run by the retrieving trustees per `sealing-procedure.md` §4 Verification checks.

---

## Envelope contents NOT in the schema

The following are explicitly NOT held inside the envelope, because they belong elsewhere:

- **The credential-domain inventory itself.** That's in `credential-inventory.md` in the repo.
- **The sealing procedure.** That's in `sealing-procedure.md` in the repo.
- **The trustee-quorum membership list and the disjoint-subset definitions.** Those are in the credential-escrow-mechanism ADR.
- **The audit log of envelope events.** That's in `escrow-ledger.md` in the repo (and via the audit-log emission per architecture §1.5).
- **Cross-references to other envelopes.** Cross-references are tracked in the inventory + the ledger, not inside the envelope itself.

The envelope is **self-contained for retrieval**: the retrieving trustees can use the credential to authenticate to the system without needing access to anything else inside the envelope. But the envelope is NOT self-contained for governance — the inventory and the ledger and the ADR carry the governance context.

---

## Envelope-construction caveat for high-sensitivity tier

For envelopes with `envelope_class = high-sensitivity-tier-credential`, additional caveats apply per architecture §5.9:

- The credential payload may be held at the source-of-truth in a structurally separate GCP project from the prod project; the escrow envelope holds the **recovery path to that structurally separate project**, not the credential payload directly. (Example: KEK roots live in the KMS keyring of a structurally separate high-sensitivity GCP project; the envelope holds the GCP project ID + the trustee-recovery IAM grant procedure + the alarms that fire on any access to that project, NOT the KMS key itself.)
- Two-person operational rotation discipline at §5.9 means the rotation event itself is co-signed; the escrow re-seal event inherits this co-signature requirement (the two operational signers may be the same as or different from the ≥2 sealing trustees — the credential-escrow-mechanism ADR records the alignment policy).
- KEK-roots destruction discipline (per architecture §5.9 — Cloud KMS 30-day max delayed-destruction; two-person approval; alarms on any KMS operation) means a KEK-roots envelope is re-sealed BEFORE the old KEK is scheduled for destruction, not after — otherwise a quorum-open after destruction would yield an unusable credential.

For envelopes with `envelope_class = audit-mirror-credential`, additional caveats apply per architecture §2.10 / §2.10a:

- The credential payload is held in the `twt-audit-mirror` GCP project (per architecture §2.10), which is structurally separate from the prod GCP project under the IAM Isolation Commitment. The escrow envelope holds the audit-mirror project access path, NOT the prod project's credentials.
- Quorum-open of this envelope MUST NOT be by trustees who can also quorum-open the prod envelopes — that is the §2.10a invariant in operational form. The credential-escrow-mechanism ADR codifies the disjointness.
