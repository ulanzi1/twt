# survey-advisory-invariant gate

**A survey is ADVISORY and has no governance effect.** (Story 10.15, Load-Bearing Decision 1.)

`pnpm survey-advisory:check` fails the build if the word `quorum` — or a phrase claiming a survey
decided something — reaches a **code position** in any survey surface: a column, a DTO field, a TS
identifier, an i18n key, an admin label, or member copy.

## Why the word is banned

FR-58 calls the optional threshold a *"quorum threshold"*. In this project that word is already
spent, and on something binding that is **not about members**:

- `docs/legal/trust-deed.md:227` — *"(b) The **quorum** shall be [one-half of the Trustees then in
  office, or two, whichever is higher]."* (Deed Cl. 19.)
- `docs/legal/niyamavali.md:266` — the Trustee Panel's *"meetings, quorum, and manner of resolution"*
  are governed by Deed Cl. 19 directly.
- `docs/legal/niyamavali.md:270` — the Deed's quorum is explicitly distinguished from the Part-9
  State-Trustee-panel rule. **The project has already had to disambiguate this word once.**

Members hold no governance vote anywhere in the Deed or the Niyamavali. A survey that reached a
"quorum" and thereby decided something would be a member vote the Deed does not create — and it would
do it **by naming**, which is the cheapest way for an unintended authority to arrive.

So the column is `response_threshold`, the derived aggregate field is `threshold_met`, and the
threshold **gates nothing**: it changes no status, blocks no read, triggers no job, and appears in
exactly one place — one informational boolean on the aggregate projection.

A rename holds only for as long as nobody renames it back. That is what this gate is for.

## ⚠ The declared deviation from the story's literal wording

Story 10.15's Task 11 specifies this gate as a raw `grep -rni "quorum"` over the survey paths,
returning **zero** hits.

**A raw grep does not return zero, and it never could.** Every survey file's header explains at length
why the word is banned, citing the Deed and the Niyamavali. That prose *is* the record of the
decision.

Satisfying the literal grep would mean **deleting the reasoning** — leaving a `response_threshold`
column whose renaming no future reader could account for. That is precisely the decay that
`[[feedback_record_unattested_no_backfill]]` exists to prevent: a rule whose reason has been erased is
indistinguishable from an arbitrary one, and the next author "simplifies" it back.

So the gate enforces **the invariant the story states** — *"not in a column, a DTO field, a TS
identifier, an i18n key, an admin label, or member copy"* — rather than the raw-text proxy for it:

- **Comments are stripped before scanning.** An explanation of the ban passes.
- **String literals and identifiers are not stripped.** A `quorum` in any executable or user-visible
  position still fails.

This deviation is declared here, in `lib.ts`, and in the story's Completion Notes. It is not silent.

## ⚠ The gate's real weakness is its path list, not its word list

`SCAN_PATHS` in `check.ts` enumerates every path Story 10.15 adds. **A survey file added later and not
listed there is silently uncovered, and a green run would prove nothing about it**
(`[[feedback_gate_scope_semantic_coverage]]` — a green scan over a surface no invariant covers proves
only that the surface is unlisted).

Two mitigations:

1. **A missing declared path is a FAILURE, not a skip.** A moved or renamed file trips the gate rather
   than shrinking the scan in silence.
2. If you add a survey surface, **add its path to `SCAN_PATHS`.** The gate cannot see what it is not
   pointed at.

## Commands

| command | what it does |
|---|---|
| `pnpm survey-advisory:check` | run the gate over the declared paths |
| `pnpm survey-advisory:test` | run the scanner's own unit tests (comment-vs-code discrimination) |

## If a survey result must ever bind a decision

That is **a Trustee Panel routing note and a Deed question** (Cl. 19 quorum, Cl. 20 Board powers,
Niyamavali §8.7) — not a rename here, and not a relaxation of this gate. It arrives with its live
requirement attached (Story 10.15, Escalation 2).
