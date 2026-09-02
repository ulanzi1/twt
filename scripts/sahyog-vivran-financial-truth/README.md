# `sahyog-vivran-financial-truth` — the financial-truth-from-canonical-events gate

**Story 11b.3, AC3 + AC4.** The epic AC asks for exactly this:

> *a CI test asserts: no API endpoint serving Sahyog Vivran data computes inferred financial state
> from non-canonical sources; financial summaries source exclusively from `contribution.confirmed`
> + `pool.settled` events.*

## What it checks

Three rules, over the five files that are the Sahyog Vivran read path today (`check.ts` `SCAN_FILES`):

1. **Event surface.** Every event-type-shaped string literal must be on `ALLOWED_EVENT_TYPES`:
   `contribution.confirmed` · `reconciliation.confirmation-reversed` · `pool.closed` · `pool.settled`
   · `claim.reversed`.
   It is an **allowlist**, not a deny-list — AC3's list of prohibited framings is explicitly
   open-ended (*"any aggregate mixing confirmed and unconfirmed counts"*), so a deny-list would only
   ever catch the sources somebody already thought of.
2. **Prohibited import.** The read path may not import an attestation-derived accessor
   (`hasAttestedContribution`, `listActedMemberIdsForPool`, the yellow event-type constants).
   Rule 1 cannot see these: the accessor reads the prohibited event type in *another* file.
3. **Render-path multiplication — D1(c), mechanized.** No file on the render path may so much as
   *name* an amount operand (`fixedAmount`, `amountRaisedInr`, `rosterSize`, …).

## ⛔ Do not fix a failure by widening the allowlist

The gate failing means a non-canonical source reached the read path. **Remove the source.** Adding
the event type to `ALLOWED_EVENT_TYPES` inverts the control — the same discipline
`RULED_TIER1_PUBLIC_EXCEPTIONS` states one layer over: *the gate failing is the gate working.*

## Why it is an AST scan, and not a line scan

These files are dense with comments that **name** the prohibited event types in order to forbid
them (*"⛔ NEVER `contribution.utr-attested`"*). A line scan would fail on the prohibition itself,
and the only way to make it pass would be to delete the sentence explaining the rule. So the scanner
walks the TypeScript AST and looks at **string literals only** — comments are invisible to it by
construction.

This is the opposite trade-off from `pool-support-category-invariant`, which scans comments **on
purpose**, because a pool-engine comment thinking in category-specific terms *is* the smell.
Different rule, different instrument — do not harmonise them.

## Why rule 3 is scoped to the render path

The **domain read** legitimately names `fixedAmount`: it feeds `classifyCycleOutcome`, which
*quarantines* the target by construction — both totals flow in, only an opaque `CycleFundingOutcome`
enum flows out. Banning the operand there would forbid the quarantine itself. So `SCAN_FILES` marks
the domain read `renderPath: false` and every `apps/public` / wire-DTO file `renderPath: true`.

`apps/api/src/modules/public-pages/handlers.ts` is **shared** with the two sibling routes, so it is
scanned for rules 1 and 2 only — a legitimate `sahyog-drive` amount operand there is not this
surface's defect, and flagging it would be the noisy failure that gets a gate allow-listed.

## The per-story scope tax

`SCAN_FILES` **must grow with the read path**:

- **11b.3a** adds the nominee-bank presentation → add its files.
- **11b.3b** adds the named-identity render layer **and the amount-raised render** → add its files,
  and flip that file's `renderPath` flag, or better, replace rule 3 with a check that the amount comes
  from the **shipped** `@twt/ui` presenter rather than a local multiplication.
  ⛔ Deleting rule 3 outright would discard D1(c)'s refusal, which survives 11b.3b unchanged.

A gate that does not cover the new surface silently under-protects, and a green scan over files it
never reads proves nothing.

## What it does NOT prove

It is a **syntactic, per-file** scan with no call-graph analysis. A read of a prohibited event type
placed in a *third* module and called from the read path is invisible to it — exactly as
`pool-bound-payment-invariant` cannot see a remap split across two functions. Rule 2 narrows that gap
for the accessors that actually exist, but this is a **tripwire against the common-case mistake, not
a formal proof of AC3.** Code review remains the backstop. Do not write in a story that this gate
proves the invariant.

## Running it

```sh
pnpm sahyog-vivran-financial-truth:test    # the scanner's teeth (known-bad fixtures)
pnpm sahyog-vivran-financial-truth:check   # the gate, over the real read path
```

The teeth are proven by known-bad fixtures in `lib.test.ts` — a planted `contribution.utr-attested`
literal, a planted attestation import, a planted local multiplication, and a scoped file that
disappears (fail-closed) — plus the planted-violation + revert-sanity run recorded in Story 11b.3's
Dev Agent Record.
