# Escrow Ledger

This ledger is the **sole source of truth for trustee-attested escrow events.** A claim of trustee attestation that is not recorded here is not durable.

Authority: Story 0.2 (epics.md) AC-1 / AC-2 / AC-3. Stored alongside the rest of the escrow framework under the trustee-accessible repo. Mirror-coverage discipline inherited from `docs/runbooks/operational-readiness-ledger.md` — primary git repo is trustee-accessible for v1; Story 0.3 (Code Escrow Auto-Mirror Pipeline) extends coverage to a trustee-controlled mirror destination on every release-branch push. As of Story 0.2 closure, Story 0.3 has not closed; mirror coverage is pending and this ledger inherits the same "provisional" mirror-coverage stance as `docs/runbooks/operational-readiness-ledger.md`.

This ledger mirrors the Story 0.1 ledger pattern (`docs/runbooks/operational-readiness-ledger.md`) but for escrow events instead of runbook sign-offs. Do not delete rows — the ledger preserves history. Material edits are themselves events: record them as a row.

## Framework-commit record

Story 0.2's framework commitment is the first event in this ledger. The framework is itself trustee-attested separately from any envelope sealing.

| Event date | Event type | Author / actor | Trustee attestation (≥2) | git SHA at event | Notes |
|---|---|---|---|---|---|
| 2026-05-29 | Framework commit (scaffolding) | Solo Builder (claude-opus-4-7 via `bmad-dev-story`) | _pending — `[CONTINUITY]` entry in `.decision-log.md` records status as "Author-committed; awaiting trustee sign-off"_ | _filled at commit_ | Story 0.2 Task 1-5 author-committed; Tasks 6-9 awaiting external action |

## Sealing log

Each row records one envelope-sealing event. A credential may have multiple rows over its lifetime: initial seal, re-seal after rotation, re-seal after dry-run, re-seal after table-top, etc. Do not delete rows.

| Event date | Envelope ID | Credential class | Envelope class | Event type (initial-seal / re-seal-post-rotation / re-seal-post-open / re-seal-post-gap) | Sealing trustees (≥2) | Custodial location reference | Last-rotation reference | Outcome (success / gap) | Linked `.decision-log.md` entry |
|---|---|---|---|---|---|---|---|---|---|
| _Story 0.2 Task 7 sealing rows go here once trustees execute sealings (Task 7 is `_AWAITING EXTERNAL ACTION_` at Story 0.2 closure)_ | | | | | | | | | |

## Dry-run log

Each row records one dry-run quorum-open event. Per Story 0.2 AC-2 (as amended by Story 0.2 review Decision 4), the framework requires **≥1 dry-run per `envelope_class`** before AC-2 fully closes:

- **`prod-credential`** — rehearsal on a non-load-bearing staging credential (e.g., staging Cloudflare API token, staging WIF binding).
- **`audit-mirror-credential`** — rehearsal on a non-production audit-mirror credential (e.g., staging audit-mirror service account). Requires the structural fix (Story 1.10 + Story 0.6) plus the ADR before the rehearsal can occur; until then, this class's dry-run is `pending-separation-mechanism`.
- **`high-sensitivity-tier-credential`** — rehearsal on a non-production high-sensitivity credential (e.g., a test KEK in the structurally separate GCP project, or a partner JWT signing key for a sandbox partner). Catches mechanism-specific failure modes — KEK destruction discipline, audit-mirror disjoint-subset coordination, two-person operational approval alignment — that a `prod-credential` rehearsal does not exercise.

The rehearsal opens the envelope, verifies the credential authenticates to its staging target, and re-seals. Gaps discovered trigger procedure revisions per AC-2. **Provisional closure** of AC-2 is acceptable when at least one envelope_class is rehearsed; **full closure** requires all three classes rehearsed.

| Event date | Envelope ID | Envelope class | Credential class | Executing trustees (≥2) | Open-step verification (staging target authenticated?) | Re-seal-step verification (envelope integrity check passed?) | Gaps discovered | Linked procedure-revision `.decision-log.md` entry |
|---|---|---|---|---|---|---|---|---|
| _Story 0.2 Task 8 dry-run rows go here once executed (Task 8 is `_AWAITING EXTERNAL ACTION_` at Story 0.2 closure)_ | | | | | | | | |

## Bus-factor table-top log

Each row records one table-top execution under bus-factor simulation discipline (Solo Builder silent for the duration; per Story 0.2 AC-3). The scope is limited to envelopes marked `sealed` at table-top time; rows marked `pending-system-availability`, `pending-separation-mechanism`, `pending-rotation-completion`, or `deferred-with-ADR` in `credential-inventory.md` are out-of-scope-for-this-table-top.

**Scope-freeze rule.** The in-scope envelope set is frozen at the table-top **start date**. Mid-exercise inventory state changes (e.g., an owning Story closes during the table-top and a row flips from `pending-system-availability` to `sealable-now`) do not retroactively expand or contract scope. The frozen set is what the table-top closes against; later inventory changes drive a future table-top. Record the freeze date verbatim in the table-top log row.

| Event date | Table-top scope (in-scope envelope IDs) | Out-of-scope envelopes (with reason) | Executing trustees (≥2 per envelope) | Verification outcomes (per envelope: success / gap) | Solo Builder consulted? (yes = gap) | Closure status (provisional / full) | Linked `.decision-log.md` entry |
|---|---|---|---|---|---|---|---|
| _Story 0.2 Task 9 table-top rows go here once executed (Task 9 is `_AWAITING EXTERNAL ACTION_` at Story 0.2 closure)_ | | | | | | | |

**Closure-language precision for table-top status:** per `[[feedback_closure_language_precision]]`, distinguish:

- **Provisionally closed** — at least one in-scope envelope opens successfully; the procedure does not require Solo Builder input. The phrase to use: "Provisionally closed via partial-scope table-top dated YYYY-MM-DD; full closure deferred to inventory completion across Stories X, Y, Z."
- **Fully closed** — every PRD §9.1.1 row has had at least one successful table-top access (requires every owning Story to close first).
- **Failed (gap)** — the table-top revealed a gap (Solo Builder consulted, envelope opens but credential unusable, access path documentation insufficient). The row records the gap; a procedure revision follows; re-execution against the revised procedure is scheduled.

Never collapse "provisionally closed" with "fully closed."

## Periodic re-attestation log

Per `README.md` "Review cadence" + `credential-inventory.md` "Re-evaluation cadence", every envelope is periodically re-attested by ≥1 trustee. Re-attestation MUST perform all of the following checks (skipping any check is itself a finding):

1. **Envelope-existence-at-custody** — the sealed envelope is physically present at its `custodial_location_reference` (or its cryptographic equivalent is accessible at the stored location).
2. **Credential-still-authenticates** — a non-mutating authentication test against the credential's `system_identity` confirms the credential is still valid. This catches silent rotations performed outside the framework (e.g., via Secret Manager without a corresponding re-seal). The non-mutating constraint is critical: re-attestation MUST NOT write, change scope, or consume any side-effect quota.
3. **Envelope-class assignment unchanged** — the row's `Envelope class` still matches the `_envelope-template.md` field, still preserves §2.10a, and has not silently drifted (e.g., from `audit-mirror-credential` to `prod-credential` via inadvertent edit).
4. **Cross-references resolved** — the row's owning-Story citation, architecture-section citation, and any linked `.decision-log.md` entry IDs still resolve to existing artifacts.
5. **Ledger-vs-inventory drift check** — the corresponding ledger sealing/re-seal row matches the inventory row's `Envelope reference` + `Last-seal date`. Drift triggers reconciliation per `README.md` "Ledger-vs-inventory reconciliation" (ledger authoritative).

Findings drive re-seals (per envelope's re-seal trigger conditions) or procedure revisions. A clean re-attestation records `Drift findings = none`.

| Review date | Reviewer (≥1 trustee) | Inventory rows reviewed | Drift findings | Re-seals triggered | Linked `.decision-log.md` entry |
|---|---|---|---|---|---|
| _first re-attestation row goes here once cadence begins_ | | | | | |

## Procedure-revision log

Procedure revisions follow gaps discovered in dry-runs, table-tops, or periodic reviews. Each revision is itself a `.decision-log.md` `[CONTINUITY]` entry (per Story 0.2 AC-2); this ledger references the entry.

| Revision date | Triggering event (dry-run / table-top / periodic-review / other) | Triggering ledger row | Gap description | Revision summary | Linked `.decision-log.md` entry | Re-execution status |
|---|---|---|---|---|---|---|
| _first procedure-revision row goes here when a gap is discovered_ | | | | | | |

## Cross-references

- `README.md` — framework lifecycle, sign-off lifecycle, property/control/policy discipline, §2.10a invariant explanation, related-escrow surfaces
- `_envelope-template.md` — sealed-envelope content schema (the `envelope_id` field in this ledger references the template)
- `credential-inventory.md` — canonical list of credential domains, envelope classes, availability status; ledger rows reference inventory rows by `credential_class`
- `sealing-procedure.md` — five-section runbook for the sealing operation
- `.decision-log.md` — trustee-ratified decisions including framework commitment, mechanism selection, custodial-location selection, and procedure revisions (every ledger row that creates or references a decision links the corresponding entry by date + decision ID)
- `docs/runbooks/operational-readiness-ledger.md` — sibling ledger pattern from Story 0.1; the structural parallel that this file mirrors
- `docs/runbooks/secret-rotation.md` — upstream trigger for re-seal events; the secret-rotation runbook's execution-log rows correspond to re-seal-post-rotation rows in this ledger
- Architecture §1.5 (audit log emission for sealing events); §2.10a (audit independence invariant); §5.9 (high-sensitivity tier rotation discipline)
- PRD §9.1.1 — bus-factor mitigation rationale
