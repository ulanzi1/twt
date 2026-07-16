---
title: 'AI-6-1 — Extend the access-wrapper AST gate to the Epic 6 claim surface + adopt a standing per-epic scope-extension convention'
type: 'chore'
created: '2026-07-16'
baseline_commit: cb16da6e88624499864341cfd48d60a7a6e0f921
status: 'done'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/ai-5-1-access-wrapper-gate-extension.md'
  - '{project-root}/scripts/access-wrapper-invariants/check.ts'
  - '{project-root}/docs/access-wrapper-invariants.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** For the third epic running the mechanized access-wrapper gate covers the *previous* epic's surface: `check.ts` scans validity (`VALIDITY_ROOTS`) + the Epic-5 channel surface (`CHANNEL_ROOTS`), but Epic 6 built the highest-stakes access surface in the system — `apps/api/src/modules/{claims,nominee}` + `packages/domain/src/claim` (₹50L adjudication, step-up-OTP revision, appeal reviewer-conflict, KMS, audit-after-mutation) — **outside the scan roots**. The doc even claims "Epic 6's claim surface inherits all three mechanized invariants from day one," which is currently false. The scope of a control is itself a per-epic commitment that decays (retro H-1/I-1).

**Approach:** Two coupled halves. (1) **Extend now:** add a `CLAIM_ROOTS` group to `check.ts` and run the two invariants that can *materially* fire on this surface over it — compensating-audit (g) and constant-time secret-compare (f) — self-green on the current tree, biting a future regression. (2) **Stop the recurrence:** make "extend `SCAN_ROOTS` to this epic's new access surface" a standing item in every epic's primitive (Story-1) checklist, documented in the checklist doc + gate README, so the gate grows *with* the code instead of a retro catching the miss two epics later.

## Boundaries & Constraints

**Always:**
- Add `CLAIM_ROOTS = ['apps/api/src/modules/claims', 'apps/api/src/modules/nominee', 'packages/domain/src/claim']` (missing root = hard error, as today).
- Run **compensating-audit** (`scanCompensatingAuditInvariant`) + **secret-compare** (`scanSecretCompareInvariant`) over `CHANNEL_ROOTS` **∪** `CLAIM_ROOTS`. Validity (`scanAccessWrapperInvariant`) stays on `VALIDITY_ROOTS` only.
- The three `lib.ts` scanners are **unchanged** — this widens *scope*, not logic (do not widen a scanner past its precision to manufacture a claim hit).
- Gate stays self-green on the current tree + wired into `pnpm ci:local` and the `access-wrapper-invariants` `ci.yml` job.

**Ask First:**
- Whether to *also* stand up a **new** claim-specific mechanized invariant now (member-appeal route ownership/IDOR, or post-commit-audit-ordering) vs. keeping the claim authz/ownership family on the reviewer checklist. See Design Notes — recommendation: checklist-only for now.

**Never:**
- Run validity's `MemberValidityPayload` invariant over claim roots (payload-shape-specific → vacuous for the wrong reason).
- Add a canary / "≥1 finding" assertion (every invariant here is conditional-semantic, vacuous-safe by construction).
- Touch the frozen claim gates (`claim` / `claim-canonical-id` state-invariants, `claim-adjudication-human-actor-invariant`) — they own the state-machine + human-actor slices; AI-6-1 is only the access-wrapper family.
- Add file exemptions for claim `emitAuthAudit` post-commit sinks — `emitAuthAudit` isn't `audit.writeAuditEntry`, so the invariant never matches them.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Current tree, claim roots added | 77 claim-surface `.ts` files scanned by (f)+(g) | 0 findings — self-green (consent path uses `withCompensatingAudit`; everything else uses `emitAuthAudit`, not `audit.writeAuditEntry`; no verification context) | N/A |
| Future raw-write regression | a claim handler adds a bare `audit.writeAuditEntry(...)` | (g) flags it with the claim file/line | Gate exits 1, `ci:local` red |
| Future local credential compare | a claim handler computes an HMAC / reads a signature header and compares with `!==` | (f) flags it | Gate exits 1 |
| Missing scan root | a claim module renamed/removed | hard error naming the missing root | Gate exits 1 |

</frozen-after-approval>

## Code Map

- `scripts/access-wrapper-invariants/check.ts` -- add `CLAIM_ROOTS`; pass `[...CHANNEL_ROOTS, ...CLAIM_ROOTS]` to the (f) secret-compare + (g) compensating-audit `runInvariant` calls; update header comment + summary copy to name the claim surface.
- `scripts/access-wrapper-invariants/lib.ts` -- **read-only reference.** `scanCompensatingAuditInvariant` (g) / `scanSecretCompareInvariant` (f) reused as-is; `COMPENSATING_AUDIT_EXEMPT_FILES` unchanged.
- `scripts/access-wrapper-invariants/lib.test.ts` -- existing (f)/(g) teeth already prove scanner behavior; no new scanner test required (scope-only change). Optional: a claim-shaped fixture asserting (g) fires on a bare `audit.writeAuditEntry` and passes on `withCompensatingAudit`/`emitAuthAudit`.
- `docs/access-wrapper-invariants.md` -- correct the "inherits from day one" line to reflect reality; add a **"Per-epic scope-extension convention"** section (the standing Story-1 checklist item).
- `scripts/access-wrapper-invariants/README.md` -- document the claim surface as a scanned root group under (f)/(g) + the standing convention.
- `.github/workflows/ci.yml` -- widen the `access-wrapper-invariants` job name/comment to name the claim surface (no `fetch-depth: 0`; DB/network-free).

## Tasks & Acceptance

**Execution:**
- [x] `scripts/access-wrapper-invariants/check.ts` -- add `CLAIM_ROOTS` const; run (f) + (g) over `[...CHANNEL_ROOTS, ...CLAIM_ROOTS]`; leave (1) validity on `VALIDITY_ROOTS`; update the file-header comment and the pass/fail summary copy to name the claim surface. -- closes the recurring scope miss.
- [x] `docs/access-wrapper-invariants.md` -- fix the false "inherits all three from day one" statement (now true for (f)/(g)); add the **Per-epic scope-extension convention** section stating the Principle (Design Notes) verbatim and the rule: *"When an epic's primitive (Story-1) access surface lands, extend `SCAN_ROOTS` (a new `*_ROOTS` group, or an existing one) so the gate reads the new code — and confirm at least one invariant has meaningful semantic coverage of that surface (a green scan over new files alone does not close the item), verified before the epic's first access story merges."* -- the process half that stops the per-epic tax.
- [x] `scripts/access-wrapper-invariants/README.md` -- add the claim root group + the standing convention. -- keep the two docs in sync.
- [x] `.github/workflows/ci.yml` -- update the `access-wrapper-invariants` job name/comment to include the claim surface. -- CI copy honest about scope.
- [x] `scripts/access-wrapper-invariants/lib.test.ts` *(optional)* -- add a claim-shaped (g) fixture (bare `audit.writeAuditEntry` → flagged; `withCompensatingAudit` / `emitAuthAudit` → clean). -- teeth if a reviewer wants a claim-named test.

**Acceptance Criteria:**
- Given the current tree, when `pnpm access-wrapper:check` runs, then it scans the 77 claim-surface files under (f)+(g) and reports 0 findings (self-green), and still scans validity + channel surfaces unchanged.
- Given a claim handler is temporarily rewritten to call `audit.writeAuditEntry` directly, when the gate runs, then it fails with a finding naming that claim file/line; restoring the code returns it to green (revert-sanity proof the extension bites).
- Given the checklist doc, when a reader looks for the scope-extension rule, then the "inherits from day one" claim is accurate and a standing per-epic convention is documented.
- Given `pnpm ci:local`, when it runs, then the `access-wrapper-invariants` step passes with the widened scope.

## Spec Change Log

**2026-07-16 — 3-layer adversarial review (Blind Hunter / Edge-Case Hunter / Acceptance Auditor).** No `intent_gap` / `bad_spec` — no loopback. The two code-access reviewers ran the gate live and independently confirmed: green over 131 files (54 channel + 77 claim), validity unchanged over its 11, revert-sanity RED on a real claim file then restored to zero residual diff, scanners in `lib.ts` untouched, docs honest + self-consistent, 31/31 teeth. The Blind Hunter's "green-but-inert" concern was empirically disproven ((g) has teeth) — the spec's Design-Notes Principle + revert-sanity are exactly the guard for it.
- **[Review][Patch] (f) false-positive vector on compare-dense claim files** — extending the secret-compare invariant over large claim files means the first `createHmac`/`resolve*Secret`/`verify*Signature` added to such a file flips the whole function to a verification context, flagging sibling plain `===` compares (e.g. a nominee-mobile **blind index**, which is not a credential compare). **Fixed (doc-only):** documented as a known heuristic trade-off in `scripts/access-wrapper-invariants/README.md` (Invariant 2), alongside the existing deferred-limits, with the resolution guidance (route genuine credential compares through `timingSafeEqual*`; narrow/carve-out a non-credential MAC). No scanner-logic change.
- **[Review][Accepted, not a gap]** (g) is literally self-green today (0 `audit.writeAuditEntry` on the surface); its "meaningful coverage" rests on audit-writing being a *pervasive, active* concern (49 `emitAuthAudit` + 1 `withCompensatingAudit`), so a dev reaching for the raw helper is a proximate regression the revert-sanity proves is caught. The (c)–(e) authz/IDOR family and post-commit `emitAuthAudit` ordering stay reviewer-checklist (spec "Ask First"), not mechanized here.

## Design Notes

> **Principle (reusable).** Expanding a gate's scan scope is only *complete* when at least one existing invariant has **meaningful semantic coverage** of the new surface. Merely producing a green scan over additional files is not evidence that the gate now protects that surface. This principle is what the standing per-epic convention (Task 2) encodes, and the criterion `check.ts` changes must satisfy.

**The AI-5-1 trap, named (the crux).** Extending `SCAN_ROOTS` is necessary but not sufficient — an invariant added to a root where it can't fire "stays green while proving nothing." Reconnaissance of the 77 claim files decides which invariants earn their scope (i.e. which have meaningful semantic coverage per the Principle above):
- **(g) compensating-audit** — the meaningful slice. Consent uses `audit.withCompensatingAudit` (the canonical ADR-0030 helper); everywhere else audit is a deliberate, reviewed **post-commit sink** via `emitAuthAudit` (49 sites — durable record is the event/row). Neither is a bare `audit.writeAuditEntry`, so the surface is **self-green** and (g) **bites a future regression** bypassing both patterns — AI-5-1's "scan the wider set so a future defect is caught" discipline.
- **(f) secret-compare** — vacuous-safe forward-coverage. Claim step-up-OTP **delegates** to `auth/member/member-otp.service.ts` (`verifyOtp`), so there's no local verification context today; (f) catches a future *local* credential compare.
- **(1) validity** — correctly NOT run here (no `MemberValidityPayload` boundary on claims).

**What stays on the checklist.** Epic 6's real defects (6.16 IDOR on member-appeal routes, wrong-permission gating, post-commit invariant throw) are the authz/ownership judgment-call family (c)–(e) a heuristic lint false-positives on. The dedicated claim state-machine + human-actor gates and the 3-layer review already cover the mechanizable claim shapes. AI-6-1's value is (a) forward-coverage the instant a claim story introduces a raw-write / local-credential-compare shape, and (b) the standing convention that stops the scope tax — not a new bespoke invariant (the **Ask First** decision offers BigDev the option to elevate one anyway).

## Verification

**Commands:**
- `pnpm access-wrapper:check` -- expected: green; log shows (f) + (g) scanning channel **and** claim roots (files count includes the 77 claim files), 0 findings.
- `pnpm access-wrapper:test` -- expected: existing teeth green (plus the optional claim fixture if added).
- `pnpm ci:local` -- expected: `access-wrapper-invariants` step green with widened scope.
- Revert-sanity -- temporarily change one `claims.dpdpa-consent.handlers.ts` `audit.withCompensatingAudit` to `audit.writeAuditEntry`; expected: gate RED naming that file; restore → green, zero residual diff.

## Suggested Review Order

**The scope extension (the core change)**

- Entry point — the new claim root group + the meaningful-coverage rationale in the doc-comment.
  [`check.ts:96`](../../scripts/access-wrapper-invariants/check.ts#L96)

- The wiring: (f) + (g) now run over `ACCESS_SURFACE_ROOTS` (channel ∪ claim); validity stays validity-only.
  [`check.ts:103`](../../scripts/access-wrapper-invariants/check.ts#L103)

- The two invariant calls that received the widened root set.
  [`check.ts:165`](../../scripts/access-wrapper-invariants/check.ts#L165)

**The standing convention (the process half)**

- The reusable Principle + the 3-step per-epic scope-extension convention.
  [`access-wrapper-invariants.md:122`](../../docs/access-wrapper-invariants.md#L122)

- README mirror + the (f) compare-dense claim-surface false-positive trade-off (review patch).
  [`README.md:93`](../../scripts/access-wrapper-invariants/README.md#L93)

**Teeth + CI (supporting)**

- Claim-shaped (g) teeth: bare `writeAuditEntry` flagged; `withCompensatingAudit`/`emitAuthAudit` clean.
  [`lib.test.ts:350`](../../scripts/access-wrapper-invariants/lib.test.ts#L350)

- CI job name/comment widened to the channel + claim surface.
  [`ci.yml:582`](../../.github/workflows/ci.yml#L582)
