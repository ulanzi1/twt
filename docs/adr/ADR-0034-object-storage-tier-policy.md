# ADR-0034: Object-storage tier + lifecycle policy (bank statements) — wiring deferred to Story 9.3

> **Status:** ratified (bank-statement portion ONLY — see Ratification below)
> **Date:** 2026-08-01 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 9.2 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-08-01; logged in `.decision-log.md` Decision 2026-08-01-071
> **Supersedes:** —
> **Superseded by:** —

## Context

adr-index row 129 (`ADR-NNNN-object-storage-tier-policy`, "Story 1.5 + Story 9.2 closure")
reserves the object-storage tier + lifecycle policy for KYC docs, death certificates,
Contribution Note PDFs, and **bank statements**. Story 1.5 committed the PII tier model
(Cloud KMS HSM + Tink envelope encryption); Story 6.5 landed the first blob store
(`ClaimDocumentStorage` port + GCS adapter, object-key-in-Postgres, signed-URL access —
[[project_claim_document_storage_port]]).

Story 9.2 is a **pure parser** (Decision D1): it never fetches, never touches storage,
never touches the DB — it operates on an in-hand buffer/stream. The multipart upload +
virus-scan quarantine + object-storage promotion are the **Story 9.3
`<BankStatementUpload>` transport**. So 9.2 can cheaply record the *tier + lifecycle
policy* bank statements will get, but the *storage wiring* is not 9.2's to build.

Per [[feedback_closure_language_precision]], this ADR distinguishes what is **authored** (the
policy) from what is **resolved via explicit deferral** (the wiring) — the two are never
collapsed.

## Decision

**Bank-statement tier + lifecycle POLICY (authored now):**

- **PII tier:** bank statements are **Tier-1 PII** (they contain member/nominee financial
  identifiers — UTR, VPA, sender name, account). They are stored encrypted at rest under
  the Story 1.5 envelope-encryption model (Cloud KMS + Tink), consistent with claim
  documents (ADR / [[project_claim_document_storage_port]]).
- **Storage abstraction:** reuse the Story 6.5 `ClaimDocumentStorage`-style port pattern —
  object bytes in the blob store (GCS), object-key + PII metadata in Postgres (never the
  raw bytes in a column), signed-URL access. The parsed `BankStatementEntry` rows are
  **derived data** (the matcher's input), NOT the raw file — the raw uploaded statement is
  the blob; the normalized rows persist separately (Story 9.4).
- **Lifecycle:** the raw uploaded statement is retained for the reconciliation audit window
  and then subject to the standard PII retention/erasure policy (DPDPA); it is NOT
  indefinitely retained (contrast the ₹110 signup-fee receipt, AR-67). **The exact retention
  window is set here at the 9.3 storage wiring: 180 days (6 months).** Rationale: the
  reconciliation cycle is a 15-day contribution window (FR-22) whose matcher (9.4) may re-read
  the blob during that window; the statement then supports the disbursement + close-of-cycle
  audit and any short appeal/dispute follow-up. 180 days comfortably covers one full cycle +
  its audit/appeal tail while bounding storage cost and DPDPA exposure (the raw statement is
  Tier-1 PII, so the window is deliberately short — an order of magnitude below the multi-year
  fee-receipt retention). Enforcement is a GCS Object Lifecycle Management delete rule on the
  `BANK_STATEMENT_BUCKET` (age > 180d), the same lifecycle-rule mechanism as the pool-snapshot
  cold-tier; provisioning the bucket + the lifecycle rule is deployment infra (the daily-dump /
  bucket-provisioning pattern), NOT application code — 9.3 SETS the value + the runbook, the
  bucket rule is applied at deploy time.

**Storage WIRING for bank statements — WIRED by Story 9.3 (this closes the deferral).** The
upload endpoint (the dual member/staff `reconciliation` module), the quarantine/virus-scan step
(the injectable `StatementScanner` seam — no-op v1, the 6.5 `OcrProvider` posture), the
object-storage promotion (the NEW `BankStatementStorage` port + GCS/local-fs/in-memory adapters,
Decision D3 — a separate port instance + `BANK_STATEMENT_BUCKET`, not a `ClaimDocumentStorage`
reuse), and the AR-45 external-call resilience at the storage-fetch/scanner boundary (the
`ResilientCall` retry+timeout+breaker) are all now BUILT in the Story 9.3 transport, along with the
concrete retention-window value (180d, above). **The signed-URL issuance (`signedReadUrl`,
short-lived, staff-transcriber read) is implemented on the port and all three adapters and is
unit-tested, but has NO live caller in 9.3** — the staff-transcription surface that would call it
(the admin-side manual-entry UI) is out of 9.3's scope (see the 9.3 story's scope table); it is a
reserved seam for that future surface, not a wired path today (corrected at code review, 2026-07-26
— the prior wording overstated this as built end-to-end). The metadata persists as the
`reconciliation.statement-uploaded` events_log event (object key + provenance + counts — never the
entries; the 9.1 events_log-direct precedent, minimizing new schema), NOT a new table. The parsed
rows still persist separately (Story 9.4, unchanged).

### Retention scope, stated precisely (so trustees know exactly what is being retained)

The 180-day window governs **exactly two things, and nothing else**:

1. **The uploaded raw bank-statement file/object itself** — the bytes in the
   `BANK_STATEMENT_BUCKET` blob store, enforced by a GCS Object Lifecycle Management delete rule
   (age > 180 days).
2. **That object's own storage-layer metadata** — the object's key, size, content-type, and
   upload timestamp as tracked by the storage system alongside the blob; this is deleted with the
   object because it cannot outlive it.

**The 180-day window does NOT apply to, and never deletes:**

- **Reconciliation events** — the `reconciliation.statement-uploaded` events_log event (object
  key + provenance + counts) is an ordinary events_log row, governed by the Story 1.3 append-only
  immutability trigger, not the object-lifecycle rule. It is retained under the system's standard
  permanent-audit-trail posture.
- **Contribution history** — `contribution.confirmed` / `contribution.reconciliation-mismatch` /
  `reconciliation.confirmation-reversed` events, and every derived read (contributor list, Yogdaan
  Bahi, status pill) built on them.
- **Audit history** — every `admin_reconciliation.*` / `audit.withCompensatingAudit` line the
  reconciliation flow emits.
- **Normalized transactional records** — the persisted `bank_statement_entries` rows (ADR-0035
  Decision D4). These records form part of the trust's reconciliation ledger and therefore follow
  the trust's financial-record retention policy, rather than the raw bank-statement lifecycle this
  ADR defines. They are deliberately minimal and re-derivable (a matcher-read cache of the raw
  statement, not a replacement for it), but once persisted they are ledger data, not disposable
  intake artifacts — this ADR's 180-day window has no authority over them.

The distinction matters because the raw statement (Tier-1 PII: verbatim sender names, narration,
account-adjacent detail) is deliberately short-lived, while the reconciliation *decision* it
produced — the fact that a contribution was confirmed, against which pool, on what evidence — is
part of the permanent, append-only financial and audit record and is never subject to this or any
other deletion rule.

## Alternatives considered

- **Author the full storage wiring now.** Rejected — it is out of 9.2's `[PRIMITIVE]`
  scope (D1); a pure parser must not grow a storage dependency.
- **Store parsed rows only, discard the raw file.** Rejected — the raw statement is the
  audit anchor for a ₹50L-flow reconciliation; it must be retained for the audit window.
- **Store raw bytes in a Postgres column (base64).** Rejected — the Story 6.5 precedent is
  object-key-in-Postgres + bytes-in-blob-store; base64-in-column is the documented
  anti-pattern.

## Consequences

- **Operational** — 9.3 inherits a documented tier + lifecycle policy to wire against; it
  owns the retention-window value + the quarantine runbook.
- **Security** — Tier-1 encryption + signed-URL access + verbatim-`raw_row` (no
  interpretation) bound the untrusted-statement threat surface (architecture L1316).
- **Cost** — Blob storage per statement per Pariwar per cycle; bounded by the retention
  window (set at 9.3).
- **Failure modes accepted** — Until 9.3 wires storage, there is no persisted raw
  statement; 9.2's parser is exercised over in-hand buffers (golden corpus + 9.3 uploads).
- **Migration / pivot path** — If bank statements later need a different tier/retention,
  this ADR is superseded; the storage port keeps the change to one adapter.

## References

- [Source: architecture.md §Deferred Decisions, L235-236; §1.5 + §5.2, L2940-2994] — object-storage tier property
- [Source: epics.md, Story 9.2 + Story 9.3] — the pure-parser vs transport split
- [Source: docs/adr/ADR-0033-bank-statement-intake-pipeline.md] — the intake pipeline + AR-45 seam
- [Source: docs/knowledge-transfer/adr-index.md, row 129] — the live index row (partial: bank-statement portion)
- Memory: [[project_claim_document_storage_port]] — the blob-store port precedent (Story 6.5)
- Memory: [[feedback_closure_language_precision]] — authored-vs-deferred discipline

## Ratification (2026-08-01)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-08-01 Trustee Panel session,
as part of the ADR-0032/0033/0034/0035 batch; logged in `.decision-log.md` Decision
`2026-08-01-071`. Consent sheet:
`docs/knowledge-transfer/adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`.

**Scope of what is ratified, stated explicitly:** this ratification covers the **bank-statement
portion of this ADR ONLY** — Tier-1 PII classification, the `BankStatementStorage` port, and the
180-day retention window (now precisely scoped, see the amendment below). The KYC-document,
death-certificate, and Contribution-Note-PDF portions of this same reserved ADR slot remain
**unauthored and unratified** — this ratification does not extend to them; they stay owned by
their own future stories.

**One amendment adopted ahead of presentation and applied to this ADR:** the "Retention scope,
stated precisely" subsection was added, and the `bank_statement_entries` exclusion within it was
reworded, on trustee request, to: *"these records form part of the trust's reconciliation ledger
and therefore follow the trust's financial-record retention policy rather than the raw
bank-statement lifecycle this ADR defines"* — replacing an earlier, vaguer "ordinary
data-retention posture" phrasing that the panel found insufficiently legible.

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-08-01 | drafted → ratified (bank-statement portion) | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-08-01 Trustee Panel session as part of the ADR-0032/0033/0034/0035 batch, alongside ADR-0036 ratified earlier the same day. Scope explicitly limited to the bank-statement portion — the KYC/death-cert/Note-PDF portions remain unauthored and unratified. `.decision-log.md` Decision `2026-08-01-071`; consent sheet `adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`. |
| 2026-07-26 | (initial draft) | BigDev (Solo Builder) | Bank-statement tier POLICY authored under Story 9.2; storage WIRING resolved via explicit deferral to Story 9.3 |
| 2026-07-26 | drafted → wired (bank-statement portion closed) | BigDev (Claude) | Story 9.3 WIRED the storage: `BankStatementStorage` port + adapters (Decision D3, own `BANK_STATEMENT_BUCKET`), the `StatementScanner` virus-scan seam, the AR-45 `ResilientCall` at the storage/scanner boundary, `signedReadUrl` on the port/adapters, the dual member/staff upload endpoints. **The retention window is set: 180 days** (one 15-day cycle + audit/appeal tail; GCS lifecycle delete rule; bounds Tier-1 PII exposure). Metadata persists as the `reconciliation.statement-uploaded` events_log event (object key + counts, never the entries — the 9.1 events_log-direct precedent), NOT a new table. The "partial: bank-statement portion" caveat on adr-index row 129 is discharged. |
| 2026-07-26 | correction (code review) | Claude (bmad-code-review) | Corrected an overclaim in the row above: `signedReadUrl` is implemented + unit-tested but has **no live caller in 9.3** (the staff-transcription surface that would call it is out of scope). Reworded the body text accordingly — the wiring is a reserved seam, not an end-to-end path, today. |
| 2026-08-01 | Pre-ratification revision | BigDev (Solo Builder) | Trustee-requested revision ahead of presentation: added the "Retention scope, stated precisely" subsection, making explicit that the 180-day window covers ONLY the raw uploaded object + its storage-layer metadata, and explicitly does NOT cover reconciliation events, contribution history, audit history, or the normalized `bank_statement_entries` rows (ADR-0035 D4). Refined per a second trustee pass: the `bank_statement_entries` exclusion is now framed as "these records form part of the trust's reconciliation ledger and therefore follow the trust's financial-record retention policy rather than the raw bank-statement lifecycle this ADR defines" — trustee-legible language replacing the earlier vaguer "ordinary data-retention posture" phrasing. |
