# ADR-0032: Canonical bank-statement normalization schema (`BankStatementEntry`) [P0]

> **Status:** ratified
> **Date:** 2026-08-01 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 9.2 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-08-01; logged in `.decision-log.md` Decision 2026-08-01-071
> **Supersedes:** —
> **Superseded by:** —

## Context

Architecture §Deferred Decisions L177-179 flags the bank-statement normalization schema as
a **[P0]** decision: *"if the normalized schema is wrong, the matcher is wrong."* The
Story 9.4 UTR matcher replays these rows against the ₹50L-per-decision reconciliation flow,
so the row shape is load-bearing.

Per [[feedback_architecture_vs_adr_boundary]], the architecture/PRD commit the *property*
(a single normalized row shape across all bank parsers); this ADR records the *decision* —
the exact field union the code ratifies. Three schema statements existed and had to be
reconciled into ONE canonical shape (Decision D4, locked at create-story):

| Source | Fields |
|---|---|
| **epics.md §9.2 (L3180)** | `entry_id, bank_code, transaction_date, transaction_id_utr, sender_vpa, amount, description, entry_type(credit\|debit\|charge\|reversal), running_balance, raw_row, parser_version` |
| **architecture §3.6 (L2248)** | `{datetime, amount, sender_name?, sender_vpa?, utr, narration, source_bank, source_account}` |
| **FR-29 (L76)** | `{datetime, amount, sender_name, sender_VPA?, UTR, narration}` |

## Decision

**The canonical `BankStatementEntry` is the epics.md §9.2 superset, with the two
architecture-only fields (`sender_name`, `source_account`) folded in.** Homed in
`packages/domain/src/bank-statement/schema.ts` as a Zod `.strict()` object; the branded
`BankStatementEntryId` lives in `packages/domain/src/ids/`.

Field-name mapping (recorded verbatim so downstream never re-derives it):

- `transaction_date` ← architecture `datetime` — normalized to ISO `YYYY-MM-DD` (optionally `THH:MM:SS`).
- `transaction_id_utr` ← architecture `utr` / FR-29 `UTR` — **nullable** (charges/reversals/partial rows carry none; the matcher never confirms a UTR-less row).
- `description` ← architecture `narration` — preserved as decoded.
- `bank_code` ← architecture `source_bank` — the shared `BankCode` enum authority (5 v1 codes).
- **`sender_name` — KEPT** (architecture §3.6 + FR-29 require it; the 9.4 secondary match reads sender identity). Nullable.
- **`source_account` — KEPT** (architecture requires it; ties an entry to the nominee account that produced the statement — relevant to the dual-account 6.8/9.9 workaround). Nullable.
- `entry_type`, `running_balance`, `raw_row`, `parser_version` — epics implementation detail, retained.

Two load-bearing representation decisions the code commits:

- **Money is INTEGER PAISE**, never a float (`₹1,000.50 → 100050`). The matcher replays these
  rows; IEEE-754 float multiplication (`1000.50 * 100 !== 100050`) would break replay
  identity. `amount` is a non-negative magnitude (direction is `entry_type`);
  `running_balance` is signed (overdraft). Parsing is string-based and exact
  (`parseInrToPaise`).
- **`entry_id` is a deterministic UUIDv5** (`deriveBankStatementEntryId`) over
  `(bank_code, parser_version, rowIndex, raw_row)` — NOT random / DB-defaulted. A re-parse
  is byte-identical (golden-file identity + auditable re-parse). Mirrors the pool-spawn
  `derivePoolId` pattern ([[project_pool_spawn_saga_atomicity]]).
- **`raw_row` is preserved verbatim** (the native cells as decoded) — architecture §3.6:
  *"CSV inputs preserved… original narration values stored unmodified and consumed unmodified
  by the matcher."* Formula-injection cells live here untouched; output-sanitization is an
  export concern, not the parser's.

## Alternatives considered

- **Adopt the leaner architecture §3.6 shape (drop `entry_type` / `running_balance` /
  `parser_version`).** Rejected — `parser_version` is what makes a re-parse auditable;
  `entry_type` gives the matcher the credit/charge/reversal signal it needs; dropping them
  would lose replay provenance.
- **Drop `sender_name` (epics omitted it).** Rejected — architecture §3.6 + FR-29 require
  it and the 9.4 secondary match reads it; dropping it violates the architecture.
- **Money as a decimal string or float.** Rejected — a float breaks replay identity; a
  decimal string pushes exact-arithmetic onto every consumer. Integer paise is exact and
  comparison-cheap.
- **Random `entry_id` (DB default).** Rejected — non-determinism makes golden-file
  regression impossible and a re-parse non-auditable.

## Consequences

- **Operational** — Adding a bank adds a `BankCode` enum value (this schema) + a parser +
  50 golden files + an allowlist bump, all in one trustee-attested change (ADR-0033).
- **Security** — `raw_row` stores untrusted cells verbatim; consumers MUST sanitize at
  export (never interpret). `.strict()` rejects any unexpected key (a leaked native column
  is a parser bug, surfaced not swallowed).
- **Performance** — Integer-paise + content-derived id keep the parser pure and O(rows).
- **Failure modes accepted** — A row that cannot form a valid entry (unparseable date /
  missing amount / empty) is skip-with-record, never silently dropped from the audit.
- **Migration / pivot path** — A shape change bumps `parser_version` and regenerates the
  golden corpus (ADR-0033 workflow); a breaking change to the union would be a superseding
  ADR + a matcher-coordination note.

## References

- [Source: architecture.md §Deferred Decisions, L177-179, L1291] — the [P0] normalization-schema property
- [Source: architecture.md §3.6, L2224-2271] — normalized-row schema + CSV-preservation discipline
- [Source: epics.md, Story 9.2, L3168-3185] — owning Story + the field list
- [Source: epics.md, FR-29, L76] — nominee daily-statement deposit fields
- [Source: packages/domain/src/bank-statement/schema.ts] — the shipped schema
- [Source: docs/knowledge-transfer/adr-index.md, row 97] — the live index row for this ADR
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor
- Memory: [[project_pool_spawn_saga_atomicity]] — deterministic-UUID precedent
- **Note on `entry_type: 'reversal'` (D column, above):** this classifies a line the BANK itself
  recorded as a reversal on the source statement (e.g., a bank-side reversed transfer) — it is
  input-data classification, not a TWT system action. See ADR-0035's "Governance principles ›
  Recovery, not automatic reversal" section for how "reversal" is used elsewhere in this ADR
  family when it DOES refer to a TWT-side action (a ledger correction, never a fund movement).

## Ratification (2026-08-01)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-08-01 Trustee Panel session,
as part of the ADR-0032/0033/0034/0035 batch; logged in `.decision-log.md` Decision
`2026-08-01-071`. Consent sheet:
`docs/knowledge-transfer/adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`.

Ratified as authored, no amendments to this ADR's own content (the batch's pre-presentation
revisions landed in ADR-0034 and ADR-0035; this ADR gained only the cross-reference note above).
No accepted failure modes beyond normal engineering — the canonical `BankStatementEntry` schema,
integer-paise money, and deterministic UUIDv5 `entry_id` stand as shipped.

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-08-01 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-08-01 Trustee Panel session as part of the ADR-0032/0033/0034/0035 batch, alongside ADR-0036 ratified earlier the same day. `.decision-log.md` Decision `2026-08-01-071`; consent sheet `adr-ratification-consent-sheet-2026-08-01-bank-statement-batch.md`. |
| 2026-08-01 | Pre-ratification revision | BigDev (Solo Builder) | Added the cross-reference note distinguishing bank-recorded "reversal" line items from the TWT-side ledger-correction meaning of "reversal" defined in ADR-0035, requested ahead of presentation. |
| 2026-07-26 | (initial draft) | BigDev (Solo Builder) | Authored under Story 9.2 (bank-statement intake transport + normalization schema) |
