---
baseline_commit: c79adecaf91167422ac1987cc1a2a1a9077c3615
---

# Story 9.2: Bank Statement Intake Transport + 5-Bank Parser Allowlist + 50 Golden Files/Bank + Normalization Schema `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the reconciliation pipeline ingesting daily bank statements,
I want a parser supporting a 5-bank allowlist with 50 golden files per bank for regression + a normalized schema per the AR-69 normalization-schema ADR,
so that bank statement parsing is scoped, regression-resistant, and produces a single canonical record shape (`BankStatementEntry`) regardless of source bank — the deterministic input the Story 9.4 UTR matcher replays.

## Scope — what belongs to 9.2 vs what is a reserved seam

> **Build-order reality (READ THIS FIRST).** Story 9.2 is a `[PRIMITIVE]`. It authors the **pure parser library + the canonical normalized schema + the golden-file regression corpus + the allowlist governance boundary**. It is the deterministic *input producer* for the Story 9.4 matcher and the *parse engine* the Story 9.3 `<BankStatementUpload>` surface calls. It does **NOT** build the upload UI (9.3), the matcher (9.4), the pill flip (9.5), or the review queue (9.8). Same house discipline as 9.1: build the primitive honestly, leave first-class seams for the unbuilt consumers, never fake a downstream.

**In scope for 9.2:**

- **`packages/domain/src/bank-statement/`** — the canonical `BankStatementEntry` normalized-row schema (Zod + branded `BankStatementEntryId`), the single shape every parser emits and the 9.4 matcher consumes. This is the **[P0] normalization schema** the whole reconciliation engine is built on. (README placeholder exists; landing Story = 9.2.)
- **`packages/bank-parsers/`** — fill the placeholder package: `src/registry.ts` runtime parser dispatch (RE6-6) keyed by `(pariwar_id, bank_code)`, plus per-bank CSV parser variants under `bihar/{sbi,pnb,bob,boi,cooperative}/`, each with **50 co-located golden files**.
- **`bank-allowlist.yaml`** — the versioned governance registry enumerating the exactly-5 permitted `(pariwar_id, bank_code)` pairs + a conformance guard (registry dispatch ⊆ allowlist) + a documented trustee-attested admission workflow (Story 7.5-style).
- **`packages/contracts/src/reconciliation/`** — the transport DTO for the **parser normalization output** (parse-result summary the 9.3 upload surface will render). README explicitly names 9.2 as the landing story for this contract. `.strict()` default.
- **Three AR-69 deferred ADRs closed** (see Dev Notes §ADRs to author).

**Reserved seams / explicitly NOT in 9.2 (do not build, do not fake):**

- **Multipart upload endpoint + virus-scan quarantine + object-storage promotion** (architecture §3.6 "Transport") → **belongs to the 9.3 `<BankStatementUpload>` surface**. 9.2's parser is a **pure function over an already-in-hand file buffer/stream** — it never fetches, never touches storage, never touches the DB. See **Decision D1**.
- **PDF + OCR path** → **Phase-2**, deferred to "first non-CSV bank arrives" (architecture §3.6 Decision: CSV-first hybrid, Option C). All 5 v1 banks are **CSV-only**. The OCR *pacing property* (own worker pool, own latency budget) is a documented forward commitment, not code here. See **Decision D2**.
- **The matcher** (`contribution.confirmed` emission, UTR matching, idempotency, monotonic-confirmation invariant) → **Story 9.4**. 9.2 stops at producing `BankStatementEntry` rows.
- **AR-45 external-call resilience machinery** (retry/backoff, timeout, circuit-breaker) → there is **no external call in a pure CSV parser**. This AC binds the storage-fetch + future-OCR seam, which lives in the 9.3 transport. 9.2 records it as a forward seam. See **Decision D3**.

## Acceptance Criteria

Verbatim from epics.md §Story 9.2 (lines 3168–3185), decomposed for the dev:

**AC1 — 5-bank allowlist, closed set, everything else rejected.**
**Given** FR-29 + AR-41 + AR-69 (normalization schema ADR) + AR-45 cross-cutting
**When** the parser is authored
**Then** v1 supports **exactly 5 banks**: SBI, PNB, BoB, BoI, and one Bihar cooperative (the specific cooperative named in `bank-allowlist.yaml`); **any other bank is rejected with a clear message + helpdesk routing** (not a silent drop, not a crash).

**AC2 — 50 golden files per bank, semantic edge coverage, co-located.**
**And** each bank parser has **50 golden test files** in CI fixtures under `packages/bank-parsers/bihar/<bank>/` (architecture layout — NOT `packages/parsers/fixtures/`, see Project Structure Notes); files cover edge cases: **standard rows, transfers, refunds, charges, multi-day batches, encoding variants, partial rows**. The 50 are a **coverage matrix, not padding** (see Dev Notes §Golden-file discipline).

**AC3 — Canonical `BankStatementEntry` shape, one shape regardless of source bank.**
**And** the parser produces a canonical `BankStatementEntry`: `entry_id`, `bank_code`, `transaction_date`, `transaction_id_utr`, `sender_vpa`, `amount`, `description`, `entry_type` (`credit | debit | charge | reversal`), `running_balance`, `raw_row` (preserved for audit), `parser_version` — **reconciled with the architecture §3.6 normalized-row schema** (`sender_name`, `source_account` folded in; see Dev Notes §Schema reconciliation + Decision D4).

**AC4 — Format-change → golden regeneration; CI fails on drift; new banks need trustee attestation.**
**And** any change to a bank's format triggers golden-file regeneration; **CI fails if golden tests fail**; new banks require **trustee-attested admission** to the allowlist (Story 7.5-style workflow).

**AC5 — AR-45 external-call resilience (cross-cutting) — recorded at the correct seam.**
**Given** AR-45 external-call resilience (cross-cutting)
**When** any external call is part of the intake pipeline
**Then** retry-with-backoff (3 retries × exp backoff); timeouts enforced; circuit-breaker prevents cascading failure; all failures audit-logged.
> **9.2 realization:** the CSV parser is **pure and local — it makes no external call**, so there is nothing to wrap in v1. This AC is satisfied by (a) keeping the parser a pure, side-effect-free, resource-bounded function (parser-sandbox posture, architecture §5.3), and (b) **documenting the AR-45 seam at the storage-fetch / OCR boundary** that the 9.3 transport owns. Do not manufacture a retry wrapper around a pure function. See Decision D3.

## Tasks / Subtasks

- [x] **Task 1 — Canonical normalized schema in `@twt/domain` (AC3, AC1)**
  - [x] Add `BankStatementEntryId` branded type + smart constructor to `packages/domain/src/ids/` (follow the existing `Brand<>` + `UUID_REGEX` pattern in `ids/index.ts`).
  - [x] Author `packages/domain/src/bank-statement/schema.ts` — the `BankStatementEntry` Zod object (`.strict()`), the canonical shape reconciled per Decision D4 (epics superset + architecture `sender_name`/`source_account`). Include the `entry_type` enum (`credit | debit | charge | reversal`), `raw_row` (preserved verbatim), `parser_version`.
  - [x] Add a `BankCode` enum + a `PermittedBank` type sourced from the allowlist (see Task 4) so the schema and registry share one bank-code authority (no type-shadowing).
  - [x] Export from `packages/domain/src/bank-statement/index.ts` + wire into `packages/domain/src/index.ts`.
  - [x] Conformance test: a table-driven test asserting every parser's output validates against the schema (CI guard "all parser outputs conform", architecture §3.6 L2249). → `packages/bank-parsers/tests/schema-conformance.test.ts` (homed in bank-parsers to keep the dep direction bank-parsers → domain).
- [x] **Task 2 — Fill the `@twt/bank-parsers` package: per-bank CSV parsers + registry (AC1, AC3)**
  - [x] Add `csv-parse` as a dependency of `@twt/bank-parsers`, pinned `"csv-parse": "^5.5.0"`.
  - [x] Author `packages/bank-parsers/src/registry.ts` — runtime dispatch (RE6-6) keyed by `(pariwar, bank_code)` → parser fn. Registry entries MUST be a subset of `bank-allowlist.yaml` (Task 4 guard).
  - [x] Author 5 per-bank parsers under `packages/bank-parsers/bihar/<bank>/parse.ts` (`sbi`, `pnb`, `bob`, `boi`, `cooperative`). Each maps the bank's native CSV columns → the canonical shape, derives `entry_type`, preserves `raw_row`, stamps `parser_version`. **Signature refined** `(input) => BankParseResult` (`{ entries, rejected }`) — see Completion Notes / Debug Log.
  - [x] Unknown-bank path: registry lookup miss → typed `UnsupportedBankError` carrying a clear message + `helpdeskRouting` marker (AC1).
  - [x] Replace the PR-1 placeholder `src/index.ts` `export {}` with the real public surface (registry + parse entry point + rejection error).
- [x] **Task 3 — 50 golden files per bank + regeneration workflow (AC2, AC4)**
  - [x] For each of the 5 banks, **50 synthetic golden inputs** (`bihar/<bank>/golden/NN-<case>.csv`) + expected outputs (`NN-<case>.expected.json`). Synthetic only. Matrix authored in `scripts/gen-golden-inputs.ts`.
  - [x] Golden-file test: `parse(input.csv)` deep-equals `expected.json` for all 250 (`tests/golden.test.ts`). Deterministic.
  - [x] Regeneration command `pnpm --filter @twt/bank-parsers golden:regen` (`scripts/regen-golden.ts`) rewrites `.expected.json` from current parser output; workflow documented in the README; golden test **fails on drift** without regeneration (AC4).
  - [x] Defensive/malicious-input tests (`tests/defensive.test.ts`): oversized (row-count cap → typed error), malformed/partial (skip-with-record), encoding (UTF-8/BOM/latin1), formula-injection (`=`/`+`/`-`/`@` verbatim in `raw_row`), duplicate rows (distinct deterministic ids). Never crashes the caller.
- [x] **Task 4 — `bank-allowlist.yaml` governance registry + conformance guard + admission workflow (AC1, AC4)**
  - [x] Author `bank-allowlist.yaml` (repo-root) — `version: 1`, `count: 5`, the 5 permitted pairs with the named Bihar cooperative, plus a loud-throw parser (`parseBankAllowlist`).
  - [x] Conformance guard with **teeth** (`tests/allowlist.test.ts`): `registry ⊆ allowlist` + `allowlist ⊆ registry` + exactly-5 + revert-sanity (count mismatch / rogue 6th bank / duplicate / missing field all fail). Package-local test per Decision D5.
  - [x] Trustee-attested admission workflow (Story 7.5-style) documented in the allowlist header + the bank-parsers README.
- [x] **Task 5 — Reconciliation transport contract (parser normalization output) (AC3)**
  - [x] Author `packages/contracts/src/reconciliation/parse-result.ts` — the `ParseResultSummary` DTO (counts + `rejected_breakdown` + `parser_version`), `.strict()`. Tenant-scoped route noted for 9.3, not wired.
  - [x] No shadow of the domain `BankStatementEntry` (the summary carries counts, not entries); `BankCodeSchema` local + a test-only lockstep guard against `@twt/domain` `BANK_CODES` (bundle boundary).
- [x] **Task 6 — Close the AR-69 deferred ADRs + update the ADR index (AC governance)**
  - [x] `docs/adr/ADR-0032-bank-statement-normalization-schema.md` (canonical shape + D4 reconciliation table).
  - [x] `docs/adr/ADR-0033-bank-statement-intake-pipeline.md` (5-bank CSV-first + csv-parse + 50-golden regime + parser-sandbox + PDF/OCR + AR-45 deferral).
  - [x] `docs/adr/ADR-0034-object-storage-tier-policy.md` — bank-statement tier POLICY authored; storage WIRING resolved via explicit deferral to 9.3 (D1).
  - [x] Flipped rows 97/130 → `drafted`, 129 → `drafted` (partial) in `adr-index.md`; count table + ledger paragraph updated.
  - [x] All three `Status: drafted` (ratification is Story 14.7).
- [x] **Task 7 — Verify green + sprint-status ledger**
  - [x] `pnpm --filter @twt/bank-parsers lint typecheck test` (283 ✓), `@twt/domain` (986 ✓, live-DB skip), `@twt/contracts` (561 ✓). `pnpm ci:local` merge gate — all static/invariant gates ✓ (see Completion Notes).
  - [x] Update `sprint-status.yaml` + `last_updated` ledger comment (in-progress → review at completion).

### Review Findings

- [x] [Review][Patch] Public per-bank parser exports bypass the allowlist/registry gate entirely (AC1/AC4) [packages/bank-parsers/src/index.ts:37-41] — fixed: raw `parseSbi`/etc. no longer re-exported from the public index; `parseStatement` is the only entry point.
- [x] [Review][Patch] `parseInrToPaise` strips a leading bare `.` as a currency symbol, causing a 100x amount error on inputs like `.50` [packages/domain/src/bank-statement/schema.ts:162] — fixed: leading-strip regex now matches only `₹`/`Rs.` tokens, never a bare `.`; regression test added (`.50`/`.5` now throw `BankAmountParseError` instead of silently misparsing).
- [x] [Review][Patch] Unrecognized/blank Dr-Cr indicator silently defaults to debit with no rejection path [packages/bank-parsers/src/factory.ts:94-95] — fixed: added `'ambiguous-direction'` skip-with-record reason; regression test added.
- [x] [Review][Patch] Row with both debit and credit cells non-empty silently discards the debit value, no conflict recorded [packages/bank-parsers/src/factory.ts:97-108] — fixed: added `'ambiguous-amount'` skip-with-record reason (also added to the `RejectedRowBreakdown` contract + its lockstep test); regression test added.
- [x] [Review][Patch] `normalizeDate` never validates day-of-month against the actual month; the already-ISO branch has no range validation at all [packages/bank-parsers/src/normalize.ts:101-124] — fixed: shared `isValidCalendarDate` (leap-year aware) now applied to all three date-format branches; regression test added.
- [x] [Review][Patch] String-input path bypasses `MAX_INPUT_BYTES`; `readCsv` fallback silently truncates instead of throwing (unlike the Buffer path) [packages/bank-parsers/src/normalize.ts:40-48,65-66] — fixed: `decodeInput`'s string branch now throws the same typed `RangeError` as the Buffer branch; `readCsv`'s silent-truncate fallback replaced with a throw; regression test added.
- [x] [Review][Patch] `csv-parse` declared "pinned" but uses a caret range `^5.5.0`, which can float — contradicts the stated replay-determinism rationale [packages/bank-parsers/package.json:17, docs/adr/ADR-0033-bank-statement-intake-pipeline.md:31-33] — fixed: pinned to exact `5.6.0` (the version already resolved in the lockfile) in package.json + lockfile; ADR-0033 wording corrected.
- [x] [Review][Patch] `VPA_RE` comment claims a "known-shape lowercase handle" requirement the regex doesn't actually enforce (case-insensitive, no PSP allowlist) — risks false-positive matches on embedded emails [packages/bank-parsers/src/normalize.ts:131-133] — fixed: PSP segment now requires lowercase (`[a-z]{2,}`), matching the documented intent; verified against all golden fixtures (every real VPA is lowercase already, no regression).
- [x] [Review][Defer] Deterministic `entry_id` bakes in CSV row position, so the same transaction gets a different id across two overlapping-date re-exports [packages/domain/src/bank-statement/schema.ts:225-240] — deferred, pre-existing design (byte-identical replay is the stated goal; dedup for 9.4 should key on `transaction_id_utr`, not `entry_id` — worth a one-line forward note when 9.4 is built, not a 9.2 fix)

## Dev Notes

### Current state of the surfaces being touched (READ before building)

- **`packages/bank-parsers/`** — **exists as a PR-1 placeholder.** `src/index.ts` is `export {}` with the "substantive content lands in downstream stories" comment; `tests/smoke.test.ts` is a trivial import check. `package.json` = `@twt/bank-parsers`, ESM, vitest, `test: vitest run --passWithNoTests`, `eslint.config.js` re-exports `@twt/eslint-config-twt`. **You are filling this package for real.** Add `csv-parse`; replace the placeholder export; the smoke test can stay or be subsumed.
- **`packages/domain/src/bank-statement/`** — **README-only placeholder.** README says: *"Landing Story: 9.2 — Normalized bank-statement row schema… Story 9.2 authors the substantive schema + the per-bank-adapter normalization tests. Empty at Story 1.2."* You author the schema here.
- **`packages/contracts/src/reconciliation/`** — **README-only placeholder.** README says substantive contracts land at **9.2 / 9.4**; 9.2 owns the **parser normalization output** contract. Discipline reminders in that README are binding: `.strict()` default, tenant-scoped routes (`/api/v1/p/<pariwar_id>/reconciliation/...`), no type-shadowing in `apps/api/.../reconciliation.types.ts`.
- **`packages/domain/src/ids/index.ts`** — branded-ID substrate (Story 1.7). Add `BankStatementEntryId` following the exact `Brand<'…'>` + `UUID_REGEX`-from-`db.js` + lowercase-canonicalize pattern already there. Branding is mandatory on first PR for new IDs (architecture §Naming L3706).
- **`apps/api/src/modules/`** — has `nominee` + `nominee-console` (Story 9.1) but **no `reconciliation` module yet**. Do not create one in 9.2 — the multipart upload endpoint is 9.3's transport (Decision D1).

### Schema reconciliation — the [P0] decision this story ratifies (AC3, Decision D4)

Three schema statements exist and MUST be reconciled into one canonical `BankStatementEntry`:

| Source | Fields |
|---|---|
| **epics.md §9.2 (L3180)** | `entry_id, bank_code, transaction_date, transaction_id_utr, sender_vpa, amount, description, entry_type(credit\|debit\|charge\|reversal), running_balance, raw_row, parser_version` |
| **architecture §3.6 (L2248)** | `{datetime, amount, sender_name?, sender_vpa?, utr, narration, source_bank, source_account}` |
| **FR-29 (L76)** | `{datetime, amount, sender_name, sender_VPA?, UTR, narration}` |

**Recommended canonical shape (Decision D4):** the **epics superset** with the two architecture-only fields folded in, and the field-name mapping made explicit:
- `transaction_date` ← architecture `datetime`
- `transaction_id_utr` ← architecture `utr` / FR-29 `UTR`
- `description` ← architecture `narration`
- `bank_code` ← architecture `source_bank`
- **`sender_name`** — KEEP (architecture + FR-29 require it; the 9.4 secondary match reads sender identity). epics omitted it; dropping it would violate architecture §3.6 / FR-29.
- **`source_account`** — KEEP (architecture requires it; ties an entry to the nominee account that produced the statement, relevant to the dual-account 9.9 workaround).

This is the exact **architecture-vs-epics reconciliation** the project treats as an ADR decision: architecture commits the *shape*; epics adds *implementation detail* (`entry_type`, `running_balance`, `raw_row`, `parser_version`); the **normalization-schema ADR (which THIS story authors) is where the union is ratified.** Record the mapping table verbatim in the ADR. Preserve `raw_row` unmodified (architecture §3.6 "CSV inputs preserved… original narration values stored unmodified and consumed unmodified by the matcher").

### Golden-file discipline — 50 = a coverage matrix, not 50 copies

The project has a hard-won rule: *a green scan over new files proves nothing* — coverage must be **semantic** ([[feedback_gate_scope_semantic_coverage]]). Apply it literally here: the 50 golden files per bank are a deliberate matrix over the AC2 axes, not padding. Suggested distribution per bank (tune to the bank's real format):
- Standard credit rows (the happy path the matcher confirms) — several.
- Transfers, refunds/reversals, charges (each exercising `entry_type` derivation).
- Multi-day batches (date rollover, ordering).
- Encoding variants (UTF-8, UTF-8-BOM, latin1) — proves decode robustness.
- Partial/malformed rows (short row, missing UTR, missing amount) — proves graceful degradation.
- Formula-injection cells (`=cmd`, `+`, `-`, `@`) preserved verbatim in `raw_row`, never interpreted (architecture §3.6 output-sanitization is an *export* concern, not the parser's — the parser stores raw).
- Whitespace / thousands-separators / currency-symbol amount formats.
Mirror the **frozen-vector discipline** used for pool assignment (`packages/domain/tests/pool/assign.test.ts` — seeded deterministic vectors, replay identity). The parser is replay-critical: the 9.4 matcher is *replayable* (epics §9.4 L3213) and consumes these entries; `parser_version` in every entry is what makes a re-parse auditable.

No real sample statements exist for any of the 5 banks at story-authoring time — if none surface during implementation, model each bank's CSV columns on a generic Indian bank e-statement export (date, narration, ref/UTR no., withdrawal, deposit, balance) and flag the assumption explicitly in the intake-pipeline ADR (Task 6) so 9.3's real-file testing has a documented baseline to reconcile against.

### Parser-sandbox posture (architecture §5.3, L3026-3033) — write the parser so it CAN be sandboxed

The parser ingests *potentially-untrusted input* (compromised statement source, forged statement, crafted-malicious CSV — architecture §threat-model L1316). 9.2 does not build the isolated Cloud Run service, but it MUST write the parser so the sandbox is possible:
- **Pure, no side effects**: no DB, no network, no filesystem, no `process.env` reads inside `parse()`. Input in, `BankStatementEntry[]` out.
- **Resource-bounded**: stream/cap row count + row size; reject absurd inputs early rather than OOM. csv-parse streaming supports this.
- **Failure-isolated**: a parse crash returns a typed error to the caller; it must never be able to take down the (future) matcher or the API process.

### AR-45 resilience — where it actually binds (Decision D3)

AR-45 = "any **external call** in the intake pipeline gets retry/backoff + timeout + circuit-breaker + audit-log." A pure CSV parser has **no external call**. The external calls in the *full* pipeline are: (1) fetch the quarantined file from object storage, (2) future PDF/OCR. Both live in the **9.3 transport**, not 9.2. So: keep 9.2's parser pure (nothing to wrap), and **document the AR-45 seam** in the intake-pipeline ADR + the bank-parsers README so 9.3 wires it at the storage-fetch boundary. Do not build a retry wrapper around a pure function — that would be theatre. (Cf. the "don't over-gate reliably-caught families" discipline, [[feedback_mechanization_split_commitment]].)

### ADRs to author (AR-69 closure — first sprint that touches each closes it)

Story 9.2 closes these `slot-reserved-pre-write` rows in `docs/knowledge-transfer/adr-index.md`:
- **Row 97** — `ADR-NNNN-bank-statement-normalization-schema` ("Story 9.2 … closure"). Author it: canonical `BankStatementEntry` + the reconciliation mapping table above.
- **Row 130** — `ADR-NNNN-bank-statement-intake-pipeline` ("Story 9.2 closure"). Author it: CSV-first Option-C, 5-bank allowlist, csv-parse, 50-golden-file regime, parser-sandbox, PDF/OCR deferral + OCR-pacing property.
- **Row 129 (partial)** — `ADR-NNNN-object-storage-tier-policy` ("Story 1.5 + Story 9.2 closure"). This is the storage *tier* for bank statements. Since the upload/storage transport is 9.3 (Decision D1), either record the tier decision now (cheap: which PII tier + lifecycle bank statements get) or note explicit deferral-to-9.3 with rationale — do NOT collapse "authored" and "deferred" ([[feedback_closure_language_precision]]).

Follow the adr-index's own supersession + breakdown-reconciliation conventions when flipping rows (the index is a ledger; record, don't silently absorb).

### Architecture references

- **§3.6 Bank statement intake transport — reconciliation matcher input (OQ-2)** [Source: architecture.md L2224-2271] — CSV-first hybrid Option C; `csv-parse`; per-bank variant in `packages/bank-parsers/<pariwar_id>/<bank>/`, 50 golden files/bank; normalized schema in `packages/domain/bank-statement/`; CSV inputs preserved / outputs sanitized-at-export; PDF-OCR confidence + OCR pacing (Phase-2).
- **§5.3 Bank statement parser sandbox** [Source: architecture.md L3026-3033] — isolated env, failure isolation, resource limits.
- **§Deferred Decisions [P0] normalization schema** [Source: architecture.md L177-179, L1291] — "if the normalized schema is wrong, the matcher is wrong."
- **File structure** [Source: architecture.md L4357 (`domain/src/bank-statement/`), L4402-4410 (`bank-parsers/` + `registry.ts` RE6-6 + `bihar/{sbi,pnb,bob,boi,cooperative}/`), L4375 (`contracts/src/reconciliation/`), L4547 parser-home table].
- **FR-29** [Source: epics.md L76] — nominee-pushed daily statement; parsed deposits `{datetime, amount, sender_name, sender_VPA?, UTR, narration}`.
- **Threat model** [Source: architecture.md L1316] — compromised bank-statement intake → allowlist + golden files + source verification + manual triage (FR-50, later).
- **adr-index rows 97/129/130** [Source: docs/knowledge-transfer/adr-index.md] — the three AR-69 slots 9.2 closes.

### Previous story intelligence (9.1 — the only prior Epic 9 story)

- 9.1 is a `[SURFACE]` shell; it explicitly **deferred the real nominee-family-pool contributor read to "9.2/9.4/9.5"** (9.1 File List note + Review defer at NomineeConsole.tsx:183). 9.2 is a `[PRIMITIVE]` and does **not** owe that read either — it's the matcher/read stories (9.4/9.5) that resolve pool-contributor truth. 9.2 only produces `BankStatementEntry` rows. Don't get pulled into 9.1's deferred UI read.
- 9.1 established the house pattern for "primitive/surface before its consumer": **encode the frame + first-class seam, never fake** ([[project_nominee_vpa_deferred_seam]], [[project_channels_no_live_dispatch_yet]], [[feedback_record_unattested_no_backfill]]). Applied here: the parse-result contract + registry are real; the upload endpoint + matcher are honest seams.
- 9.1 surfaced decisions as a **"Resolved decisions (LOCKED)"** block. This story surfaces its open decisions at the end (§Decisions) for BigDev to lock before/at dev.

### Testing standards

- **Parser tests are pure + DB-free** — no live Postgres needed (unlike the domain integration suites). Run `pnpm --filter @twt/bank-parsers test`. Golden-file snapshot tests + registry-dispatch test + allowlist-conformance test + defensive/malicious-input tests.
- **Domain schema conformance** — `pnpm --filter @twt/domain test` (the "all parser outputs conform" guard can live in bank-parsers to avoid a domain→bank-parsers dep inversion; keep the dependency direction bank-parsers → domain, never the reverse).
- **Per-package lint cwd** — shared `eslint-config-twt` runs per package; any rule carve-out `files` globs must be cwd-relative role globs, not package-path globs ([[project_eslint_config_per_package_cwd]]). Verify each package with its own `pnpm --filter <pkg> lint`.
- **Merge gate** — `pnpm ci:local` mirrors all ci.yml jobs with `--concurrency=4`; integration needs `DATABASE_URL` on :5433 ([[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]). Known live-DB flakes ([[project_known_livedb_test_failures]]) are non-regressions — confirm innocence by running a suspect spec in isolation. 9.2's own tests being DB-free, they should not touch that flake class.

### Project Structure Notes

- **Epics-vs-architecture path variance (architecture wins).** epics.md §9.2 says `packages/parsers/fixtures/<bank-code>/` and `bank_allowlist.yaml`; the **authoritative architecture layout** ([Source: architecture.md L4402-4410]) is `packages/bank-parsers/bihar/<bank>/` (golden files **co-located under each bank dir**) + `packages/bank-parsers/src/registry.ts`. `packages/bank-parsers` **already exists** per that layout. **Use the architecture layout.** Record this reconciliation (same class as the i18n `locales/` vs `src/strings/` variance recorded in ADR-0018). Config file: `bank-allowlist.yaml` at repo-root mirroring `benefit-mechanism.yaml` (recommended; see Decision D5).
- **Per-Pariwar scoping.** Parsers are scoped `bihar/<bank>/`; the registry key is `(pariwar_id, bank_code)`; v1 = `bihar` only. The allowlist is per-Pariwar (a future Rail-Parivar's SBI ≠ TWT-Bihar's SBI parser).
- **Dependency direction.** `@twt/bank-parsers` → `@twt/domain` (for `BankStatementEntry` + `BankStatementEntryId`). Never domain → bank-parsers. Contracts references the transport projection only.

### References

- [Source: epics.md#Story-9.2 L3168-3185] — the five ACs.
- [Source: epics.md#FR-29 L76] — nominee daily statement intake fields.
- [Source: architecture.md#3.6 L2224-2271] — intake transport, csv-parse, normalized schema, CSV discipline, OCR pacing.
- [Source: architecture.md#5.3 L3026-3033] — parser sandbox.
- [Source: architecture.md#file-structure L4357,L4402-4410,L4375,L4547] — canonical package layout + RE6-6 registry.
- [Source: docs/knowledge-transfer/adr-index.md rows 97/129/130] — AR-69 slots closed by 9.2.
- [Source: packages/domain/src/bank-statement/README.md] — landing-story seam note.
- [Source: packages/contracts/src/reconciliation/README.md] — landing-story + `.strict()`/tenant/no-shadow discipline.
- [Source: packages/domain/src/ids/index.ts] — branded-ID pattern for `BankStatementEntryId`.
- [Source: benefit-mechanism.yaml + scripts/benefit-mechanism/] — the versioned-config + conformance-gate precedent for `bank-allowlist.yaml`.
- [Source: packages/domain/tests/pool/assign.test.ts] — seeded frozen-vector testing precedent for golden files.
- [Source: _bmad-output/implementation-artifacts/9-1-*.md] — prior Epic 9 story; deferred pool-contributor read; first-class-seam discipline.

### Resolved decisions (BigDev, 2026-07-26 — LOCKED, build to these)

All five were confirmed to the recommended option. Do not re-litigate; build exactly to these.

- **D1 — Scope boundary → PURE PARSER ONLY. LOCKED.** 9.2 owns the `[PRIMITIVE]` parse engine; the multipart upload endpoint + virus-scan quarantine + object-storage promotion belong to the **9.3 `<BankStatementUpload>` surface**. 9.2's parser is a pure function over an in-hand buffer/stream — no storage, no network, no DB, no `apps/api/.../reconciliation` module in this story. The object-storage-tier ADR (Task 6 / adr-index row 129) records the bank-statement PII tier + lifecycle **policy** as a cheap statement but explicitly defers the storage **wiring** to 9.3 (use "Resolved via explicit deferral" language, not "authored" — [[feedback_closure_language_precision]]).
- **D2 — CSV-only v1. LOCKED.** All 5 v1 banks are CSV (architecture §3.6 Option C). Build **no PDF path**; document only the OCR-pacing forward property (own worker pool / own latency budget) in the intake-pipeline ADR. PDF/OCR is Phase-2, triggered by the first non-CSV bank.
- **D3 — AR-45 = pure parser + documented seam. LOCKED.** No retry/backoff/timeout/circuit-breaker machinery in 9.2 — there is no external call in a pure parser. Record the AR-45 seam at the storage-fetch/OCR boundary (owned by 9.3) in the intake-pipeline ADR + bank-parsers README. Do not build resilience theatre around pure code.
- **D4 — Canonical `BankStatementEntry` = epics superset + architecture `sender_name` + `source_account`. LOCKED.** Ratify the full union (see §Schema reconciliation mapping table) in the normalization-schema ADR. Keep `sender_name` and `source_account`; dropping them would violate architecture §3.6 / FR-29.
- **D5 — Allowlist conformance = package-local test-with-teeth, NOT a repo-global CI gate. LOCKED.** Ship the `bank-allowlist.yaml` registry + a package-local test asserting registry ⊆ allowlist, exactly-5, with revert-sanity teeth. Do **not** build a `scripts/bank-allowlist/` repo-global gate — a single-consumer registry doesn't warrant it ([[feedback_mechanization_split_commitment]], [[project_access_wrapper_gate_pending_scope]]). Escalate only if a second consumer or real drift risk appears.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / bmad-dev-story)

### Debug Log References

- **Parser signature refined `=> BankStatementEntry[]` → `=> BankParseResult`.** Task 2
  sketched a bare-array return, but AC5's "skip-with-record" + Task 5's `rows_rejected`
  need the reject ledger returned alongside the entries — a silent array-length delta
  cannot carry *why* a row was skipped. `BankParseResult = { entries, rejected }` makes
  graceful degradation honest and testable. `entries` is still the single canonical shape.
- **Money = integer paise, not float.** `parseInrToPaise` is string-based (split on `.`,
  pad fraction) — `1000.50 * 100 !== 100050` in IEEE-754 would break replay identity for a
  replay-critical parser. `amount` is a non-negative magnitude (direction is `entry_type`);
  `running_balance` is signed (overdraft) via `parseBalanceCell`.
- **`entry_id` is deterministic UUIDv5** (`deriveBankStatementEntryId`) over
  `(bank_code, parser_version, rowIndex, raw_row)`, mirroring pool-spawn's `derivePoolId`.
  Random ids would make golden-file regression impossible; `rowIndex` distinguishes
  byte-identical duplicate rows.
- **Pariwar dimension = the pariwar SLUG (`bihar`), not the provisioned UUID.** No canonical
  Pariwar UUID exists (Pariwars are provisioned at runtime); the parser + registry key on the
  stable slug, and the runtime `pariwar_id → slug` resolution is the 9.3 transport's job.
  Recorded in `bank-allowlist.yaml` + ADR-0033.
- **`sender_name` extraction is UPI-positional first** (segment 4 of `UPI/CR/<utr>/<name>/…`)
  so a non-ASCII name (Devanagari / latin1 `JOSÉ`) is captured correctly rather than falling
  through the ASCII heuristic to the trailing remark.
- **latin1 decode heuristic**: a `Buffer` is decoded UTF-8 first; a U+FFFD replacement char
  triggers a latin1 re-decode (no declared charset). Exercised by golden case 31 + a
  defensive test.
- **ci:local integration-tests flaked once** in the bundled `--concurrency=4` run (known
  live-DB concurrency flake class — [[project_ci_local_concurrency_oversubscription]],
  [[project_known_livedb_test_failures]]); an isolated re-run of the full integration target
  passed 17/17 packages (incl. the renewal-lifecycle spec). Innocence confirmed — all 9.2
  code is pure + DB-free, adds no live-DB spec.

### Completion Notes List

- **Task 1 — [P0] canonical schema (`@twt/domain`).** `BankStatementEntry` `.strict()` Zod
  object + `BankCode` enum + `BankStatementEntryId` brand + `parseInrToPaise` +
  `deriveBankStatementEntryId`. D4 union ratified (epics superset + arch
  `sender_name`/`source_account`). 31 unit tests.
- **Task 2 — filled `@twt/bank-parsers`.** `csv-parse ^5.5.0`; shared `defineBankParser`
  factory + `normalize.ts` (decode/date/amount/UTR-VPA-name/entry-type/skip-with-record);
  5 thin per-bank configs under `bihar/<bank>/parse.ts`; `registry.ts` RE6-6 dispatch;
  typed `UnsupportedBankError` (helpdesk-routed) on a miss; real `src/index.ts` surface.
- **Task 3 — 250 golden files (50 × 5, coverage matrix).** Authored via
  `scripts/gen-golden-inputs.ts` (the matrix in one reviewable place); `golden:regen`
  derives expected outputs. `golden.test.ts` (255 assertions) + `defensive.test.ts` (9) +
  `schema-conformance.test.ts` (5). Synthetic data only.
- **Task 4 — `bank-allowlist.yaml` (repo-root) + teeth.** `parseBankAllowlist` loud-throw
  loader; `allowlist.test.ts` asserts `registry ⇔ allowlist` exactly-5 with revert-sanity.
  Package-local (D5), not a repo-global gate. Admission workflow documented in the header +
  README.
- **Task 5 — reconciliation contract.** `ParseResultSummary` (counts + `rejected_breakdown`
  + `parser_version`), `.strict()`, no domain-shape shadow; `BankCodeSchema` local +
  test-only lockstep guard (bundle boundary). Wired into the contracts barrel.
- **Task 6 — 3 AR-69 ADRs authored `drafted`** (0032 normalization-schema, 0033
  intake-pipeline, 0034 object-storage-tier-policy — the last with storage WIRING *resolved
  via explicit deferral* to 9.3, D1). adr-index rows 97/130/129 flipped; count table +
  ledger updated.
- **Task 7 — green.** bank-parsers 283 ✓, contracts 561 ✓, domain 986 ✓ (live-DB skip),
  all 26 ci:local static/invariant gates ✓, unit + crypto ✓, integration 17/17 ✓ (isolated).
- **Scope discipline held (D1/D2/D3):** no upload endpoint, no storage, no DB, no matcher,
  no PDF/OCR, no AR-45 retry-wrapper-around-pure-code. All reserved seams left honest +
  documented.

### File List

**New — `@twt/domain`:**
- `packages/domain/src/bank-statement/schema.ts`
- `packages/domain/src/bank-statement/index.ts`
- `packages/domain/tests/bank-statement/schema.test.ts`

**New — `@twt/bank-parsers`:**
- `packages/bank-parsers/src/normalize.ts`
- `packages/bank-parsers/src/factory.ts`
- `packages/bank-parsers/src/registry.ts`
- `packages/bank-parsers/src/allowlist.ts`
- `packages/bank-parsers/src/errors.ts`
- `packages/bank-parsers/bihar/{sbi,pnb,bob,boi,cooperative}/parse.ts`
- `packages/bank-parsers/bihar/{sbi,pnb,bob,boi,cooperative}/golden/*.csv` + `*.expected.json` (250 + 250)
- `packages/bank-parsers/scripts/gen-golden-inputs.ts`
- `packages/bank-parsers/scripts/regen-golden.ts`
- `packages/bank-parsers/tests/{golden,registry,allowlist,schema-conformance,defensive}.test.ts`
- `packages/bank-parsers/README.md`

**New — `@twt/contracts`:**
- `packages/contracts/src/reconciliation/parse-result.ts`
- `packages/contracts/src/reconciliation/index.ts`
- `packages/contracts/tests/reconciliation.test.ts`

**New — repo root / docs:**
- `bank-allowlist.yaml`
- `docs/adr/ADR-0032-bank-statement-normalization-schema.md`
- `docs/adr/ADR-0033-bank-statement-intake-pipeline.md`
- `docs/adr/ADR-0034-object-storage-tier-policy.md`

**Modified:**
- `packages/domain/src/ids/index.ts` (added `BankStatementEntryId` brand)
- `packages/domain/src/index.ts` (export `bankStatement` namespace)
- `packages/bank-parsers/package.json` (deps: `@twt/domain`, `csv-parse`, `yaml`, `tsx`; `golden:regen` script)
- `packages/bank-parsers/tsconfig.json` (include `bihar/**`, `scripts/**`)
- `packages/bank-parsers/src/index.ts` (real public surface, replacing `export {}`)
- `packages/contracts/src/index.ts` (export reconciliation barrel)
- `docs/knowledge-transfer/adr-index.md` (rows 97/129/130 flipped; count table + ledger)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger)

**Deleted:**
- `packages/domain/src/bank-statement/.gitkeep`
- `packages/contracts/src/reconciliation/.gitkeep`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-26 | 0.1 | Story drafted via bmad-create-story — comprehensive context engine analysis. Status → ready-for-dev. | BigDev (Claude) |
| 2026-07-26 | 1.0 | Implemented via bmad-dev-story. [P0] `BankStatementEntry` schema (@twt/domain) + 5 CSV parsers + registry (@twt/bank-parsers) + 250 golden files + `bank-allowlist.yaml` governance + `ParseResultSummary` contract + 3 AR-69 ADRs (0032/0033/0034 drafted). All ACs satisfied; bank-parsers 283, contracts 561, domain 986 green; ci:local static+invariant+integration green. Status → review. | Amelia (Claude) |
