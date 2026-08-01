# ADR-0033: Bank-statement intake pipeline — 5-bank CSV-first parser allowlist

> **Status:** ratified
> **Date:** 2026-08-01 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 9.2 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-08-01; logged in `.decision-log.md` Decision 2026-08-01-071
> **Supersedes:** —
> **Superseded by:** —

## Context

FR-29 + AR-41 commit a nominee-pushed daily bank-statement intake feeding the
reconciliation matcher. Architecture §3.6 commits the *transport property* (a per-bank
parser allowlist, 50 golden files/bank, a normalized schema) and §5.3 commits the
*parser-sandbox property* (isolated env, resource limits, failure isolation). The
threat-model (architecture L1316) treats bank-statement intake as an untrusted surface
(compromised/forged/crafted-malicious statement) mitigated by an allowlist + golden files +
source verification + manual triage.

Per [[feedback_architecture_vs_adr_boundary]], this ADR records the *controls* that realize
those properties. Story 9.2 is a `[PRIMITIVE]`: it builds the pure parse engine, not the
upload transport (Decision D1) — so this ADR must be precise about what 9.2 authored vs
what is a documented seam for Story 9.3 ([[feedback_closure_language_precision]]).

## Decision

**v1 ships a closed 5-bank CSV-first parser allowlist** (architecture §3.6 Option C):
SBI, PNB, Bank of Baroda, Bank of India, and one named Bihar cooperative
(`Bihar State Cooperative Bank`), all under `pariwar = bihar`.

- **Library:** `csv-parse` (pinned exact `5.6.0`, no `^` range) — production-grade, actively
  maintained, streaming-capable. Pinned so the replay-critical parser cannot float against
  an ad-hoc version (matching the repo-wide pinning convention).
- **Layout (architecture wins over epics):** parsers at
  `packages/bank-parsers/<pariwar>/<bank>/parse.ts` with **golden files co-located** under
  each bank's `golden/`; runtime dispatch at `packages/bank-parsers/src/registry.ts`
  (RE6-6) keyed on `(pariwar, bank_code)`. epics.md §9.2's `packages/parsers/fixtures/…`
  path is a drafting variance; the authoritative architecture layout (L4402-4410) is used
  and this variance is recorded here (same class as the i18n `locales/` variance in
  ADR-0018).
- **Pariwar dimension = the pariwar SLUG (`bihar`), not the provisioned UUID.** The runtime
  tenant `pariwar_id` resolves to the slug at the Story 9.3 transport boundary, so the pure
  parser + registry are not coupled to a per-environment UUID. A future Rail-Parivar adds a
  `rail` slug + its own per-bank parsers.
- **Governance:** `bank-allowlist.yaml` (repo-root, mirrors `benefit-mechanism.yaml`)
  enumerates the exactly-5 permitted pairs. A **package-local** conformance test (Decision
  D5) asserts `registry ⊆ allowlist`, exactly-5, with revert-sanity teeth — **not** a
  repo-global CI gate (a single-consumer registry doesn't warrant one;
  [[feedback_mechanization_split_commitment]]). An unlisted bank is rejected with a typed,
  helpdesk-routed `UnsupportedBankError` — never a silent drop, never a crash (AC1).
- **50 golden files/bank (250 total):** a semantic coverage MATRIX (not padding —
  [[feedback_gate_scope_semantic_coverage]]) over standard credits, transfers, reversals,
  charges, multi-day batches, encoding variants (UTF-8 / UTF-8-BOM / latin1),
  partial/malformed rows, formula-injection, amount formats, duplicate rows. A format
  change ⇒ bump `parser_version` ⇒ `golden:regen` ⇒ review the diff ⇒ CI re-greens; CI
  fails on undregenerated drift (AC4). Golden data is **synthetic** — no real member PII.
- **Parser-sandbox posture (architecture §5.3):** the parser is written so the sandbox is
  *possible* — pure (no I/O/clock/randomness), resource-bounded (row/size/cell caps,
  reject-absurd-early), failure-isolated (bad row → skip-with-record; bad input → typed
  error). 9.2 does not build the isolated Cloud Run service; it writes the code that can be
  dropped into one.

### Baseline-format assumption (recorded per [[feedback_record_unattested_no_backfill]])

No real sample statements existed for any of the 5 banks at authoring time. Each bank's
native CSV columns are modeled on a **generic Indian bank e-statement export** (date,
narration, ref/UTR, withdrawal/deposit or amount+Dr/Cr, balance). This is a **documented
assumption**, not attested against real files — Story 9.3's real-file testing MUST
reconcile the actual bank exports against this baseline and regenerate golden files as
needed.

**Story 9.3 status of the assumption — STILL UN-ATTESTED, carried forward (not backfilled).**
Decision D7 put real-file reconciliation in 9.3's scope, but **no real per-bank export was
obtainable in this build cycle** (the TWT-Bihar launch cohort has not yet supplied member
statements; procuring genuine SBI/PNB/BoB/BoI/Bihar-cooperative exports needs a real account
holder per bank). Per [[feedback_record_unattested_no_backfill]], the assumption is recorded
as **still un-attested** rather than reconstructed to fake a validation: the 9.2 golden files
were NOT regenerated (regenerating them against the same synthetic assumption would only launder
the assumption as attestation). The gate is explicit — **the first real statement upload per bank
(the 9.3 fallback path stores every unparseable upload, so a real export that the assumed parser
mis-reads lands in the staff-transcription queue with its raw blob) is the attestation trigger**:
when a real export arrives, diff it against the assumed columns, regenerate the affected golden
files, and flip this note. This does NOT decay silently — it is carried as an OPEN RISK with a
named trigger, not a closed item.

## Alternatives considered

- **PDF + OCR path in v1.** Deferred (Decision D2, not rejected) — all 5 v1 banks are
  CSV-only. PDF/OCR is Phase-2, triggered by the first non-CSV bank; it carries its own
  pacing property (own worker pool / own latency budget) so its variable, higher latency
  never blocks the CSV fast path. Documented as a forward commitment; no code in 9.2.
- **A repo-global allowlist CI gate (like `scripts/benefit-mechanism/`).** Rejected for v1
  (Decision D5) — a single-consumer registry is reliably caught by a package-local test;
  a repo-global gate would over-gate ([[project_access_wrapper_gate_pending_scope]]).
  Escalate on a second consumer or real drift risk.
- **Open parser (best-effort any-bank).** Rejected — the threat-model requires a closed
  allowlist; an unknown bank is a triage event, not a silent parse attempt.

## Consequences

- **Operational** — Adding a bank is a trustee-attested 5-part change (ADR-0032 enum +
  parser + 50 golden + allowlist bump + `.decision-log.md` attestation). `golden:regen` is
  the format-change runbook.
- **Security** — Closed allowlist + golden regression + verbatim `raw_row` (no
  interpretation) + typed rejection. AR-45 external-call resilience binds the **9.3
  storage-fetch / future-OCR seam**, NOT this pure parser (Decision D3) — building retry
  machinery around pure code would be theatre. The seam is documented in the bank-parsers
  README + here for 9.3 to wire.
- **Performance** — Pure, streaming-capable, O(rows), resource-capped.
- **Failure modes accepted** — A bank outside the allowlist is rejected + helpdesk-routed
  (a real bank the org onboards needs the admission workflow). The baseline-format
  assumption may not match a real export until 9.3 reconciles it.
- **Migration / pivot path** — PDF/OCR arrives as a new parser variant + its own pacing;
  a repo-global gate is the D5 escalation if a second consumer appears.

## References

- [Source: architecture.md §3.6, L2224-2271] — intake transport, csv-parse, per-bank layout, 50 golden files, OCR pacing
- [Source: architecture.md §5.3, L3026-3033] — parser sandbox (isolation / resource limits / failure isolation)
- [Source: architecture.md §threat-model, L1316] — compromised bank-statement intake mitigations
- [Source: architecture.md §file-structure, L4402-4410] — canonical `bank-parsers/` layout + RE6-6 registry
- [Source: epics.md, Story 9.2, L3168-3185] — owning Story + the five ACs
- [Source: bank-allowlist.yaml] — the shipped governance registry
- [Source: packages/bank-parsers/README.md] — the admission workflow + AR-45 seam
- [Source: docs/knowledge-transfer/adr-index.md, row 130] — the live index row for this ADR
- Memory: [[feedback_gate_scope_semantic_coverage]], [[feedback_mechanization_split_commitment]], [[feedback_closure_language_precision]]
- **Note on "reversals" in the golden-file matrix (above):** these are bank-recorded reversal
  transactions in test data (a bank-side reversed transfer appearing on a statement) — input-data
  coverage, not a TWT system action. See ADR-0035's "Governance principles › Recovery, not automatic
  reversal" section for how this ADR family uses "reversal" when it DOES refer to a TWT-side action.

## Ratification (2026-08-01)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-08-01 Trustee Panel session,
as part of the ADR-0032/0033/0034/0035 batch; logged in `.decision-log.md` Decision
`2026-08-01-071`. Consent sheet:
`docs/knowledge-transfer/adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`.

**Ratified with its baseline-format-assumption risk explicitly carried, not resolved.** The
5-bank CSV-first parser allowlist ships as designed; the panel affirmed the pipeline's honest
fallback (an unparseable real file routes to staff transcription, never a silent mis-parse) as
sufficient to ship behind an unverified assumption — this ratification does NOT assert the
assumption has been checked against any real bank export. The named re-trigger stands: the first
real statement upload per bank, at which point the assumption is diffed against reality and golden
files regenerated if needed. No amendments to this ADR's own content beyond the cross-reference
note above.

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-08-01 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-08-01 Trustee Panel session as part of the ADR-0032/0033/0034/0035 batch, alongside ADR-0036 ratified earlier the same day, with the baseline-format-assumption risk explicitly carried forward, not resolved. `.decision-log.md` Decision `2026-08-01-071`; consent sheet `adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`. |
| 2026-08-01 | Pre-ratification revision | BigDev (Solo Builder) | Added the cross-reference note distinguishing bank-recorded "reversal" line items from the TWT-side ledger-correction meaning of "reversal" defined in ADR-0035, requested ahead of presentation. |
| 2026-07-26 | (initial draft) | BigDev (Solo Builder) | Authored under Story 9.2 (5-bank CSV-first allowlist + 50-golden-file regime + parser sandbox) |
| 2026-07-26 | drafted (transport seams WIRED by Story 9.3) | BigDev (Claude) | Story 9.3 wired the AR-45 external-call resilience at the storage/scanner boundary (the `ResilientCall` retry-with-backoff-3× + per-attempt timeout + circuit-breaker around `BankStatementStorage.put` + `StatementScanner.scan`; a storage/scanner outage → dignified 503, never 500, audit-logged) and the virus-scan quarantine step (the injectable `StatementScanner` seam — no-op/allow-all v1, no real ClamAV vendor yet, the 6.5 `OcrProvider` "no boundary gate until a real vendor" posture; scan runs BEFORE store+parse, an unclean verdict rejects + audit-logs + never stores). The CSV-first / PDF-OCR-deferred posture is UNCHANGED — a non-CSV upload routes to the human "padh lenge" fallback, not an OCR engine (Decision D1). **Baseline-format assumption remains UN-ATTESTED (Decision D7) — carried forward with a named trigger, not backfilled** (see the Baseline-format-assumption section). |
