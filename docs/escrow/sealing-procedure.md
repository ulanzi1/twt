# Runbook: Credential Escrow Sealing Procedure

> **Status:** draft (author-committed; awaiting ≥2-trustee sign-off per `escrow-ledger.md` framework-commit row)
> **Owner role:** Trustee Panel (≥2 trustees execute) with Solo Builder providing the source-of-truth credential retrieval where the credential lives in operational systems (e.g., Secret Manager per architecture §5.9). Under bus-factor scenario, Solo Builder's role transfers to the contracted backup engineer per Story 0.6 (read-only default per architecture §5.10; write/admin requires per-action trustee approval).
> **Last material edit:** 2026-05-29 by Solo Builder (initial)
> **Architectural authority:** architecture.md §Workspace Layout (line 4172) (canonical `docs/escrow/` location) · §2.10a (audit independence invariant — envelope-class separation) · §2.10 (audit log access controls — separability) · §5.9 (Secret Manager source-of-truth + high-sensitivity tier two-person approval + KEK-roots destruction discipline) · §5.7 (DR runbook PDF custody via credential-escrow envelope) · §5.10 (backup engineer access posture) · PRD §9.1.1 (bus-factor mitigation rationale + seven credential domains) · AR-67 (framework commitment)

This runbook describes **how to seal a credential envelope** under the trustee-selected sealing mechanism. The mechanism itself is ADR territory (per `README.md` "Property / control / policy three-way discipline"); this runbook's steps stay stable across mechanism changes because they are property-driven, not control-driven (per `[[feedback_architecture_vs_adr_boundary]]`).

The procedure covers the **initial seal** event. Re-seal events (post-rotation, post-open, post-gap, post-mechanism-supersession) follow the same procedure with two material differences:

1. **Step §2.1 is replaced by the prior-envelope-invalidation step.** For re-seals, §2.1 ("verify envelope does not already exist") is inverted: the prior envelope MUST exist; its location and identity are recorded as the supersession reference. Then the prior envelope is physically destroyed (cross-shred / secure incineration for physical envelopes) or cryptographically invalidated (key destruction per the credential-escrow-mechanism ADR's destruction discipline) BEFORE the new envelope is sealed. Invalidation is observed by the ≥2 sealing trustees and recorded in the new ledger row's `Notes` column. The framework MUST NOT allow two valid envelopes for the same credential class to coexist — that would defeat the bus-factor scenario by producing ambiguous credentials at quorum-open.
2. **The `escrow-ledger.md` row uses the appropriate re-seal event type** (`re-seal-post-rotation` | `re-seal-post-open` | `re-seal-post-gap` | `re-seal-post-mechanism-supersession`) and references the prior ledger row in its `Notes` column.

## 1. Prerequisites

Preconditions that must hold before the procedure begins. A sealing operation that proceeds without these is a P0 procedure violation; raise the gap as a `.decision-log.md` `[CONTINUITY]` entry per `README.md` "Sign-off lifecycle".

- **Sealing mechanism selected and recorded.** EITHER the credential-escrow-mechanism ADR exists in `docs/adr/` with the mechanism choice + rationale, OR (under the hybrid pre-ADR sealing rule per `README.md` "Audit independence invariant") the Trustee Panel has ratified an interim sealing mechanism in a `.decision-log.md` `[CONTINUITY]` entry that explicitly commits to ADR-supersession when the ADR lands. The interim ratification is sufficient ONLY for envelopes of class `prod-credential`; envelopes of class `audit-mirror-credential` or `high-sensitivity-tier-credential` MUST wait for the full ADR. A sealing operation that attempts to seal a non-`prod-credential` envelope under interim ratification is a P0 framework violation; abort and raise the gap as a `.decision-log.md` `[CONTINUITY]` entry.
- **Custodial location selected and recorded.** Same status as above — recorded in the ADR or, under the hybrid rule, in the interim `.decision-log.md` ratification (same envelope-class scope). Without a custodial location, the envelope cannot be transmitted post-seal.
- **Audit-mirror sealing structural fix verified** (only for `envelope_class = audit-mirror-credential`). Per Story 0.2 review Decision 3, the audit-mirror envelope's credential retrieval cannot transit through Solo Builder (who holds prod authority) or §2.10a collapses at sealing time. The structural fix requires BOTH (a) Story 1.10 closure (provisions the audit-mirror chain so the credentials exist) AND (b) Story 0.6 closure (provides a non-Solo-Builder principal — the contracted backup engineer — with the IAM grant required to retrieve audit-mirror credentials from Secret Manager). Until BOTH close, the inventory rows are `pending-separation-mechanism` and the sealing operation MUST abort with the structural-fix-pending gap raised in `.decision-log.md`.
- **Envelope-class assignment verified against `credential-inventory.md`.** The credential being sealed has a row in the inventory with an assigned `envelope_class`. The proposed sealing MUST honor that assignment; a sealing operation that proposes a different `envelope_class` (e.g., sealing an audit-mirror credential under the prod-credential custodial path because "it's simpler") is a §2.10a violation and MUST be aborted. The §2.10a invariant is non-negotiable; if the chosen sealing mechanism cannot express the separation, the mechanism is wrong, not the invariant.
- **≥2 trustees present and prepared to sign.** The trustees come from the trustee subset that holds quorum authority for this envelope's `envelope_class`. Subset membership lives in the credential-escrow-mechanism ADR; until the ADR exists, the trustees are named verbatim in the envelope's `intended_quorum_class` field and the ADR retrospectively groups them into the named subset.
- **Source-of-truth credential retrieval ready.** The credential exists at its source-of-truth (Secret Manager for cloud credentials per architecture §5.9; operational-origin for non-cloud credentials such as bank account access) and can be retrieved by a principal authorized to do so. For high-sensitivity tier credentials per §5.9, the retrieval may require the two-person Terraform-mediated approval discipline — the two operational signers may be the same as or different from the ≥2 sealing trustees, per the credential-escrow-mechanism ADR alignment policy.
- **Audit-log baseline verified.** The audit-log integrity check (per architecture §1.5 and `docs/runbooks/audit-log-integrity-verification.md`) has passed within the operational window. Sealing events emit audit lines (architecture §1.5 + §2.10); a broken chain pre-sealing means the seal record lands in a corrupted store.
- **Inventory row availability status is `sealable-now`.** Rows marked `pending-system-availability` (system does not yet exist) cannot be sealed — they await their owning Story's closure. Rows marked `deferred-with-ADR` (no current concrete instance) cannot be sealed — they await the contractual / regulatory event that instantiates the credential. Closure-language precision per `[[feedback_closure_language_precision]]`: do not collapse `pending-system-availability` with `sealable-now` to force a premature seal.
- **High-sensitivity tier prerequisite (envelope_class = high-sensitivity-tier-credential).** Per architecture §5.9 high-sensitivity Secret Manager two-person approval: any secret update to the high-sensitivity tier requires two-person approval (Terraform-mediated change with co-sign, or workflow-mediated update with second-approver). The sealing event for a high-sensitivity envelope inherits this discipline: both operational signers captured + ≥2 sealing trustees attest.
- **§2.10a separation guardrail check.** Verify that the proposed sealing custody arrangement preserves envelope-class separation per `README.md` §"Audit independence invariant — envelope-class separation". A sealing operation that violates separation MUST be aborted. Specifically: if the envelope's `envelope_class` is `audit-mirror-credential`, the custodial location MUST be the audit-mirror custodial path (not the prod custodial path), AND the trustees signing this seal MUST be from the audit-mirror trustee subset (not the prod subset). The credential-escrow-mechanism ADR defines both; this prerequisite step is the enforcement point.
- **Custodial-location circular-dependency check.** Verify that access to the chosen custodial location does NOT require any credential whose envelope is itself in the inventory. Examples to test: (a) legal-counsel custody whose access requires the DPO portal credentials that are escrowed under Domain 7 — circular; (b) software-vault custody whose recovery kit needs an email account whose 2FA is in escrow — circular; (c) bank safe deposit whose key requires biometric authentication tied to a trustee whose identity credentials are in escrow — depends on framing, may or may not be circular. Circularity means under bus-factor scenario the custodial location is unreachable because its access credentials are sealed inside the very envelopes the trustees are trying to retrieve. A circular dependency MUST be broken before sealing — either by re-selecting the custodial location, or by removing the cycle (e.g., the DPO portal credential is held in a different envelope class with a different custodial path).

## 2. Step-by-step procedure

Each step is concrete enough that ≥2 trustees with the prerequisites can execute it without judgment calls. Where a step requires a mechanism-specific instruction that is currently deferred to the credential-escrow-mechanism ADR, the step is tagged `[deferred ADR — placeholder procedure]` with the placeholder advisory inline.

### 2.1 Verify envelope does not already exist

1. Open `credential-inventory.md` and locate the row for the credential being sealed. Confirm `Envelope reference` is "Reserved" (not yet sealed) and `Availability status` is `sealable-now`.
2. Open `escrow-ledger.md` "Sealing log" and confirm no prior `initial-seal` row exists for this credential class. (Re-seal events have prior rows; this step distinguishes initial seal from re-seal.)
3. If a prior envelope exists at the custodial location for this credential class — but the inventory and ledger do not record it — that is a P0 framework violation (custodial-state drift). Raise the gap; abort the sealing.

### 2.2 Retrieve the credential from source-of-truth

1. For cloud credentials (prod DB, KEK roots, audit-mirror service accounts, etc.) — retrieve from Secret Manager per architecture §5.9. The principal performing the retrieval must have IAM permission scoped to the specific secret (not broader). For high-sensitivity tier secrets, the retrieval itself is two-person-approved per §5.9.
2. For non-cloud credentials (trust bank operational access, DPO contact path) — retrieve from the operational origin per the credential's operational ownership (Trustee Panel chair for bank credentials; DPO appointment record for DPO contact).
3. For credentials that are themselves recovery paths rather than payloads (e.g., the `cloud-sql-iam-recovery-grant` row in the inventory; the `kek-root-tier-1-envelope-encryption` row whose envelope holds the recovery procedure not the KMS key) — generate or document the recovery procedure following the credential class's specific construction per `credential-inventory.md` Notes column.
4. Verify the retrieved credential is current — for example, by authenticating it against its `system_identity` in a read-only / non-mutating manner. A stale credential retrieved into an envelope means the envelope is born invalid.

### 2.3 Construct the envelope contents per `_envelope-template.md`

1. Populate every field in `_envelope-template.md`: `envelope_id`, `envelope_class`, `credential_class`, `system_identity`, `credential_payload`, `sealing_date`, `sealing_trustees`, `intended_quorum_class`, `re_seal_trigger_conditions`, `last_rotation_reference`, `custodial_location_reference`, `verification_check_signature`.
2. The `envelope_id` follows the convention `escrow-<envelope_class>-<sequence>` where `<sequence>` is the next zero-padded monotonic integer for that envelope class (e.g., if `escrow-prod-credential-005` is the latest sealed, the new one is `escrow-prod-credential-006`).
3. The `verification_check_signature` is computed at this step (it's part of what's sealed); the specific computation `[deferred ADR — placeholder procedure: per the credential-escrow-mechanism ADR, e.g., a SHA-256 hash of the credential payload + envelope metadata, OR a physical seal-tape integrity reference, OR a MAC under a separate verification key]`.

### 2.4 Apply the sealing mechanism

1. `[deferred ADR — placeholder procedure: per the credential-escrow-mechanism ADR — the specific cryptographic or physical operation. Candidate mechanisms (the ADR selects one): (a) physical sealed envelope inserted into a tamper-evident bag; (b) GPG encryption with recipients = ≥2 trustees (encrypted to N keys, decryptable by any K; threshold cryptography per the ADR); (c) Shamir's Secret Sharing with share-distribution to trustees; (d) password-manager emergency-kit construction; (e) hybrid]`
2. Verify the sealing operation completed without error. A partial seal (e.g., GPG encryption succeeded for some recipients but not others) is NOT a successful seal — abort and retry, or escalate as a gap.
3. The output of the sealing operation is the sealed envelope artifact, with the credential payload no longer retrievable except via the trustee quorum-open procedure.

### 2.5 Record the seal in `escrow-ledger.md`

1. Append a row to `escrow-ledger.md` "Sealing log" with: event date, envelope_id, credential_class, envelope_class, event type = `initial-seal`, sealing trustees (≥2), custodial location reference, last-rotation reference, outcome = success (only if Step §2.4 verification passed), linked `.decision-log.md` entry (created in Step §2.7).
2. Update `credential-inventory.md` for the corresponding row: `Availability status` flips from `sealable-now` to `sealed`; `Envelope reference` column populated with the new envelope_id; `Last-seal date` populated.
3. Both files are committed to the repo in the same commit. Atomic update — ledger row + inventory row update + decision-log entry land together.

### 2.6 Transmit the sealed envelope to the custodial location

**Minimum transmission constraints (apply pre-ADR; the ADR may tighten further, never loosen):**

- Transmission MUST NOT use email, SMS, messaging apps (WhatsApp, Telegram, Signal-without-vouched-recipient-verification), or any channel that lacks end-to-end encryption AND recipient authentication.
- Transmission MUST NOT pass through any party outside the ≥2 sealing trustees and the custodial location operator (e.g., no courier handoff to a third party who can open the envelope; sealed-tamper-evident packaging required for physical custody).
- Acceptable channels pre-ADR: (a) in-person physical transfer by ≥2 sealing trustees to the custodial location; (b) trustee-controlled offline encrypted media (e.g., a hardware-encrypted USB drive transferred in person); (c) for cryptographic envelopes — Trustee Panel-controlled storage with separately-keyed IAM access that does not transit through Solo Builder's principals.

1. `[deferred ADR — placeholder procedure: the transmission method depends on the trustee-selected custodial location. For physical envelopes to a bank safe deposit box — trustees physically deposit; record the deposit-slip reference in the envelope's custodial_location_reference field. For GPG-encrypted files — transmit via the secure-channel committed in the ADR; in the pre-ADR interim, only the channels named above are acceptable. For Shamir shares — distribute one share per trustee per the ADR's share-distribution map]`
2. The transmission is itself a security-sensitive step: a sealed envelope intercepted in transit defeats the entire framework. The minimum constraints above hold pre-ADR; the ADR records the full transmission-security commitments.
3. After transmission, the ≥2 sealing trustees confirm custodial receipt (e.g., bank receipt for safe deposit; checksum match for cryptographic transmission). Receipt confirmation is recorded in the envelope's `custodial_location_reference` field (e.g., "deposited at <bank> on <date>, slip #<id>"; "stored at <storage location>, content hash <hash>").

### 2.7 Emit audit line + `.decision-log.md` entry

1. The sealing event itself emits an audit line per architecture §1.5 + §2.10 — the sealing is a privileged action affecting the trust's operational continuity. The audit emission is automatic if the sealing operation runs through the audit-instrumented path; if the sealing happens outside the instrumented path (e.g., a physical-only sealing with no software touchpoint), the audit line is manually authored by Solo Builder + ≥1 trustee and committed to the audit chain.
2. Append an entry to `.decision-log.md` per the Story 0.1 schema (see `README.md` "Relationship to ADRs, runbooks, and `.decision-log.md`"). Decision type = `Story 0.2 — Credential Escrow`. Status = `Author-committed; awaiting trustee sign-off` (if the sealing event itself does not constitute the trustee ratification) or `Trustee-ratified` (if the ≥2 sealing trustees' attestation suffices for ratification, per the credential-escrow-mechanism ADR's alignment policy). Context = which envelope was sealed and why. Decision = the envelope-id, custodial location, sealing trustees, and any operational caveats. Open follow-ups = any periodic re-attestation cadence the sealing event commits to. References = the inventory row, the ledger row, the ADR.
3. The `.decision-log.md` entry is the trustee-canonical record of the sealing event; the escrow-ledger row is the operational record; the audit line is the cryptographic record. All three must align.

## 3. Rollback procedure

If the sealing fails midway, the credential MUST be returned to a safe state without leaving a half-sealed copy at any intermediate location. The architecture §1.8 forward-only migration discipline applies by analogy: rollback is a *new forward operation* (returning the credential to source-of-truth + cleaning the failed-seal artifact), not a reversal that pretends the failure didn't happen.

1. **Return the credential to source-of-truth.** If the credential was retrieved from Secret Manager into a working buffer (memory, terminal session, sealed-mechanism intermediate), confirm the buffer is destroyed. If the credential was printed on paper for a physical seal, confirm the paper is destroyed (cross-shred per the credential-escrow-mechanism ADR's destruction discipline) AND the audit line records the destruction.
2. **Forced rotation rule (no operator-judgment override).** Rotation is REQUIRED — not subject to operator judgment — if any of the following hold:
   - The credential was in plaintext outside the source-of-truth (Secret Manager / operational origin) at any point during the failed sealing.
   - The sealing mechanism produced any persistent artifact that contained the credential payload (e.g., a partially-encrypted file written to disk; a GPG operation that completed for some recipients).
   - The custodial-location operator handled the credential in any form before the sealing failure was discovered.
   The forced-rotation rule overrides any "buffer-destroyed-so-no-rotation-needed" judgment. Per architecture §5.9, rotation is the standard exposure response. Follow `docs/runbooks/secret-rotation.md` for the rotation; the rotation event itself is recorded in the secret-rotation ledger. After rotation, the inventory row's `Availability status` remains `sealable-now`; a fresh sealing operation is initiated against the rotated credential, with a new `envelope_id`.
3. **Record the rollback in `escrow-ledger.md`.** Append a row to the "Sealing log" with: event type = `initial-seal` (or `re-seal-post-rotation` if applicable), outcome = `gap`, gap description = the failure mode (e.g., "GPG encryption succeeded for trustees A, B; failed for trustee C; ABORT") + the rollback action taken (credential rotated; new sealing scheduled).
4. **Author a `.decision-log.md` `[CONTINUITY]` entry** recording the gap, the rollback action, and the planned re-sealing. The entry links the failed-sealing ledger row and any procedure-revision entry that follows.
5. **Do NOT mark the inventory row as `sealed` until the re-sealing succeeds.** The row stays `sealable-now` (or flips to `pending-rotation-completion` if the credential is mid-rotation per Step §3.2). Per `[[feedback_closure_language_precision]]`, the failed seal is "Not addressed (rolled back)", not "Closed by [seal]".

**Audit-emission-failure path (§2.7 fails AFTER §2.5 commit).** If steps §2.1-§2.6 complete (envelope at custody; ledger row + inventory row updated; `.decision-log.md` entry committed) but the audit emission in §2.7 fails (audit chain broken; instrumented path down; manual authoring missed), the rollback path above does NOT apply because the envelope IS sealed and the credential is no longer in plaintext outside the custodial location. Instead:

1. Treat the audit-emission failure as a **P0 framework violation** distinct from a sealing rollback.
2. Update the ledger row's `Outcome` column to `success-with-audit-gap`; add a `Notes` line citing the audit-emission failure mode (chain break vs replication lag vs manual-emission missed) and the architecture §1.5 verification path that detected it.
3. Author a `.decision-log.md` `[CONTINUITY]` entry that triggers a **framework-level review** — not a routine procedure revision — because audit emission is a load-bearing property and its failure indicates either a §1.5 audit-chain incident (escalate per `docs/runbooks/audit-log-integrity-verification.md`) or a sealing-procedure §2.7 gap (procedure revision).
4. The envelope remains `sealed` in the inventory — but with a flagged provenance (the audit chain does not record its sealing). Trustees opening this envelope under bus-factor scenario MUST be informed of the audit-gap provenance via the ledger.

## 4. Verification checks

Observable post-conditions that prove the sealing succeeded. Each check returns a deterministic pass/fail signal.

- [ ] **Envelope integrity check passes.** The `verification_check_signature` field of the envelope template is computed at seal time and re-verified at this step. For physical envelopes: visual seal-tape integrity. For cryptographic envelopes: ciphertext hash match + MAC verification + expected key fingerprint match.
- [ ] **Custodial-location receipt confirmation.** The custodial location (bank safe deposit, trustee residence, notary, software vault) acknowledges receipt of the sealed envelope. Acknowledgment is recorded in the envelope's `custodial_location_reference` field with a verifiable artifact (deposit slip, signed receipt, content-hash match).
- [ ] **Escrow-ledger row present with ≥2-trustee attestation.** The "Sealing log" row exists with both trustees' identifying contact and outcome = success.
- [ ] **`credential-inventory.md` updated atomically.** The inventory row's `Availability status` is `sealed`; `Envelope reference` populated with the envelope_id; `Last-seal date` populated. Inventory and ledger must agree.
- [ ] **`.decision-log.md` entry committed.** The trustee-canonical record exists with the correct decision-type tag and status. Per the Story 0.1 load-bearing schema, the entry follows the template verbatim.
- [ ] **Audit line emitted.** The sealing event is in the audit log; the integrity check (per architecture §1.5) confirms the line is in the chain.
- [ ] **§2.10a separation invariant still holds.** The envelope-class assignment recorded in the envelope matches the inventory; the custodial location matches the envelope-class's designated custody path; the sealing trustees are from the envelope-class's designated trustee subset.
- [ ] **For high-sensitivity tier envelopes:** the §5.9 two-person operational approval is recorded; the alignment policy from the credential-escrow-mechanism ADR is honored.

If any check fails, do not declare success; escalate per §5.

## 5. Contact escalation list

Roles, not individuals. Specific contacts live in operations policy. The escalation route depends on whether the operation is happening under normal operation or under bus-factor scenario — the two routes are structurally different because under bus-factor scenario Solo Builder is by definition unavailable.

### 5.1 Normal-operation escalation (Solo Builder reachable)

- **Primary:** Trustee Panel chair on rota (for ratification authority + custodial-location coordination).
- **Secondary:** Solo Builder (for source-of-truth credential retrieval + audit-log instrumentation; for `prod-credential` envelopes only — never for `audit-mirror-credential` retrieval per §2.10a + Story 0.2 review Decision 3).
- **Trustee escalation:** Trustee Panel chair when operation affects trustee-relevant invariants (§2.10a; mechanism revision; ADR-recorded constraints).
- **Legal counsel escalation:** The legal counsel engaged under Story 0.13 (when 0.13 closes) when operation affects DPDPA / partner-contract terms.

### 5.2 Bus-factor scenario escalation (Solo Builder unreachable)

Under bus-factor scenario, the normal-operation escalation collapses to ONE role plus the conditional Story 0.6 backup engineer. The framework MUST honor that this is the scenario the escrow framework was designed to support — fallbacks that depend on Solo Builder reachability are NOT fallbacks under bus-factor.

- **Primary:** Trustee Panel chair on rota (mandatory; only role guaranteed reachable under bus-factor by Trust governance).
- **Secondary (CONDITIONAL — only if Story 0.6 has closed):** Backup engineer per Story 0.6. Read-only default per architecture §5.10; write/admin requires per-action trustee approval; for `audit-mirror-credential` sealings, the backup engineer is the non-Solo-Builder principal per Story 0.2 review Decision 3. **As of Story 0.6 author-commit dated 2026-05-30** (per Decision 2026-05-30-006), the backup-engineer framework exists at `docs/backup-engineer/`; the substantive engineer + signed contract + IAM grant are pending Story 0.6 Tasks 8-10. Until Tasks 8-10 close, this "Secondary CONDITIONAL" branch is structurally available (framework leg complete) but operationally unavailable (operational principal pending).
- **If Story 0.6 has NOT closed at bus-factor activation time:** the escalation collapses to Trustee Panel chair alone. Operations that require a non-trustee technical principal MUST be paused and recorded as a gap; Story 0.1 AC-4 path 2 (table-top trustee-approved substitute engineer) applies as the interim — see `docs/runbooks/operational-readiness-ledger.md` for the substitute-authorization pattern.
- **NO Solo Builder fallback** under bus-factor scenario, by definition. Procedure steps that name Solo Builder in §5.1 (source-of-truth retrieval; audit-log instrumentation) MUST be paused, gap-flagged, and re-routed via the Story 0.6 backup engineer with trustee co-sign — not via Solo Builder. **As of Story 0.6 author-commit dated 2026-05-30** (per Decision 2026-05-30-006), the re-routing target (`docs/backup-engineer/activation-procedure.md` §2.3 bus-factor activation) is authored as the routing surface; the operational principal (named engineer per `docs/backup-engineer/engineer-roster.md`) is pending Story 0.6 Tasks 8-10. Until Tasks 8-10 close, the pause-and-gap-flag step holds; the substitute path per Story 0.1 AC-4 path 2 (trustee-authorized substitute engineer) is the interim fallback recorded in `docs/runbooks/operational-readiness-ledger.md`.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _filled at commit_ | Solo Builder (claude-opus-4-7 via `bmad-dev-story`) | yes (initial) | yes (≥2 trustees per `escrow-ledger.md` framework-commit row) | escrow-ledger.md framework-commit row dated 2026-05-29 |
