# `@twt/bank-parsers`

The **pure bank-statement parse engine** for the reconciliation pipeline (Story 9.2,
`[PRIMITIVE]`). A 5-bank allowlist of per-bank CSV parsers, dispatched by a
`(pariwar, bank_code)` registry, each emitting the ONE canonical `@twt/domain`
`BankStatementEntry` shape the Story 9.4 UTR matcher replays.

```
packages/bank-parsers/
  bank-allowlist.yaml is at the REPO ROOT (mirrors benefit-mechanism.yaml)
  src/
    index.ts        public surface
    registry.ts     (pariwar, bank_code) → parser dispatch (RE6-6)
    factory.ts      defineBankParser — the shared normalization engine
    normalize.ts    pure helpers (decode / date / amount / UTR-VPA-name / entry-type)
    allowlist.ts    parseBankAllowlist + loader
    errors.ts       UnsupportedBankError / BankStatementParseError
  bihar/<bank>/
    parse.ts        thin per-bank format config
    golden/         50 golden .csv inputs + .expected.json outputs (the corpus)
  scripts/
    gen-golden-inputs.ts   authoring tool for the 50-case matrix
    regen-golden.ts        the golden:regen command (AC4)
```

## Design invariants (do not break)

- **Pure + local + DB-free.** A parser is `(input: string | Buffer) => BankParseResult`.
  No storage, no network, no DB, no `process.env`, no clock, no randomness. The
  multipart upload endpoint + virus-scan quarantine + object-storage promotion are the
  **Story 9.3 `<BankStatementUpload>` transport**, NOT this package (Decision D1).
- **Deterministic (replay identity).** `entry_id` is a content-derived UUIDv5
  (`deriveBankStatementEntryId`), never random. Re-parsing the same bytes is byte-identical
  — that is what the 250 golden files assert and what makes a re-parse auditable.
- **Money is integer paise**, never a float. `amount` is a non-negative magnitude
  (direction is `entry_type`); `running_balance` is signed.
- **Dependency direction is `bank-parsers → @twt/domain`, never the reverse.**
- **Parser-sandbox posture** (architecture §5.3): resource-bounded (row/size caps),
  failure-isolated (a bad row is skip-with-record; a bad input is a typed error — never a
  crash), raw cells preserved verbatim (a formula-injection cell is stored, never
  interpreted).

## AR-45 external-call resilience — the seam (Decision D3)

AR-45 requires retry/backoff + timeout + circuit-breaker + audit-log for **any external
call** in the intake pipeline. **A pure CSV parser makes no external call**, so there is
nothing to wrap here — building a retry wrapper around pure code would be theatre. The
external calls in the *full* pipeline are (1) **fetch the quarantined file from object
storage** and (2) the **future PDF/OCR** path. Both live in the **Story 9.3 transport**.
AR-45 binds there, at the storage-fetch / OCR boundary — not in this package. See
`docs/adr/ADR-0033-bank-statement-intake-pipeline.md`.

## PDF / OCR — deferred (Decision D2)

All 5 v1 banks are **CSV-only** (architecture §3.6 Option C). There is **no PDF path**.
PDF/OCR is Phase-2, triggered by the first non-CSV bank; it carries its own pacing
property (own worker pool / own latency budget) documented in the intake-pipeline ADR.

## Adding a bank — trustee-attested admission (AC4, Story 7.5-style)

The allowlist is a **closed set** (exactly 5 today). Admitting a 6th bank is a SINGLE
reviewed change that MUST carry ALL of:

1. **Trustee attestation** recorded in `.decision-log.md` (the capability-bar bump).
2. A new **`BankCode` enum value** in `@twt/domain` (`bank-statement/schema.ts`) — the
   shared code authority.
3. A new **per-bank parser** under `bihar/<bank>/parse.ts` (or a new `<pariwar>/<bank>/`).
4. **50 golden files** under that bank's `golden/` (the coverage matrix, AC2 — see
   `scripts/gen-golden-inputs.ts`; run `regen-golden` for the expected outputs).
5. A **bump of `bank-allowlist.yaml`** (a new `pairs:` entry + `count`).

The package-local conformance test (`tests/allowlist.test.ts`) has **teeth**: `registry ⊆
allowlist`, exactly-`count`, with revert-sanity — a rogue registry entry or a broken
allowlist edit fails CI. This is a package-local guard, **not** a repo-global gate
(Decision D5) — escalate only if a second consumer or real drift risk appears.

## Golden-file workflow (AC2 / AC4)

- The 50-case-per-bank **coverage matrix** lives in `scripts/gen-golden-inputs.ts`
  (reviewable in one place). It covers: standard credits, transfers, reversals, charges,
  multi-day batches, encoding variants (UTF-8 / UTF-8-BOM / latin1), partial/malformed
  rows, formula-injection, amount formats, duplicate rows, whitespace edges.
- A **format change** ⇒ bump the parser's `parser_version` ⇒ `pnpm --filter
  @twt/bank-parsers golden:regen` ⇒ **review the diff** ⇒ CI re-greens. Without
  regeneration, `tests/golden.test.ts` fails on drift (the regression teeth).
- **Synthetic data only** — no real member PII. No real sample statements existed at
  authoring; each bank's CSV columns are modeled on a generic Indian bank e-statement
  export (documented in ADR-0033 as the baseline for 9.3's real-file reconciliation).
