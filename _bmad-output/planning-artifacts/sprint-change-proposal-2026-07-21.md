# Sprint Change Proposal — Nominee-VPA Collection (discharge Story 8.4 forward commitment)

- **Date:** 2026-07-21
- **Author:** BigDev (via Correct-Course workflow)
- **Trigger story:** Story 8.4 (UPI Intent Flow) — D1, SETTLED 2026-07-21, path (b)
- **Change scope classification:** **Moderate** (backlog add + PRD/architecture amendment + cross-epic surface)
- **Mode:** Batch

---

## Section 1 — Issue Summary

Story 8.4 (UPI Intent Flow) shipped with its payee-VPA resolver deliberately returning `{ available:false, reason:'vpa_not_collected' }` as a first-class, tested state, because **no VPA exists anywhere in the substrate**. D1 (SETTLED, path (b)) deferred VPA collection to a dedicated story and recorded a forward commitment. This proposal discharges it.

**The issue is larger than "an unbuilt story" — it is a latent specification gap in the PRD and epics.** Classifying every VPA reference:

| Assert the payee VPA *exists / pre-fills* | Actually *collect* a payee VPA |
|---|---|
| FR-16, FR-27, Story 7.6 ("resolved via 7.4"), Story 8.4 | **None** |

- FR-31 / FR-37 / Story 6.8 collect nominee **bank account + IFSC only** — never a VPA (and account#+IFSC is not a valid `pa=` VPA).
- **Story 7.6 is "Pool-Bound Payment *Enforcement*"** (wrong-pool rejection); it only *assumes* "the assigned pool's VPA (resolved via 7.4)." Story 7.4 resolves member→pool by hash — it does not resolve a VPA.
- The only VPA ever *captured* is the **sender (member/payer) VPA** read off the bank statement by the matcher (FR-30 / Story 9.4 secondary). **This is a different VPA** from the payee VPA `pa=` needs. The payee (nominee) VPA has exactly one consumer: the 8.4 intent builder.

**Evidence:** `grep -rni vpa packages/domain/src/schema` returns nothing; `claim_nominee_bank_accounts.ts:54-56` stores `account_holder_name` / `account_number` / `ifsc` ciphertext only; Story 8.4 Dev Notes D1 (`8-4-…-yellow-pill.md:155-168`).

**Consequence carried openly:** Epic 8's demoable-closure criterion (`epics.md:2853`, SM-1 demo beat B21) requires firing a real `upi://pay` on-device up to the yellow pill. With no payee VPA, that closure is **not exercisable on a real device** — a carried open Epic-8 risk.

---

## Section 2 — Impact Analysis

### Money-flow finding (drives the design)
Member UPI contributions flow **member → nominee directly** (PMLA posture, `prd.md:1165` — the trust never holds support money in the pool flow). Therefore the `pa=` destination **is the nominee's own bank-account VPA** — the *same two accounts* Story 6.8 collects — and the RBI dual-account workaround (FR-31) exists precisely for the ~16,000 inbound contributions in 15 days. So the VPA is **per bank account** (#1 default, #2 on switch), collected at the same claim-time moment as the accounts.

### Epic impact
- **Epic 8 (host, in-flight):** completable as planned; this story is a **precondition for its demoable-closure execution** (`epics.md:2853`), not a blocker to building the remaining 8.x stories. **BigDev decision: land it in the Epic-8 window (next).**
- **Epic 6 (closed):** the *collection surface* is 6.8's `<NomineeDetailEditor>` (UX-DR34). This story adds an optional field to that surface — it does **not** reopen or renumber any completed Epic-6 story.
- **Epic 7:** provides pool→nominee linkage (7.1 pool `nominee ref = claim_case_id`); the resolver reads through it. No 7.x change.
- **Epic 9:** unaffected. 9.4's secondary matcher uses the **sender** VPA, not this payee VPA. "Fold into 9.1 Nominee Console" was evaluated and **rejected** — 9.1 is a *reconciliation/statement-upload* surface that runs *after* pool spawn; the payee VPA must be captured at claim *filing*, before the pool exists.

### Story impact
- **New:** Story 8.13 (below).
- **Story 8.4 (done):** no code change; this story fulfils the `{available:false}` → `available` transition 8.4's seam was explicitly built for ("lights up with zero changes to this story's surface code").
- **Story 6.8 (done):** its surface (`<NomineeDetailEditor>`) is extended by 8.13; 6.8 itself is not edited.
- **Story 8.12 (backlog):** its on-device SM-1 demo depends on 8.13 having populated ≥1 VPA.

### Artifact conflicts
- **PRD:** FR-37 does not collect a VPA (must amend); FR-16 / FR-27 reference a VPA with no stated source (note the source + fail-soft); FR-31 (clarify VPA is per-account and **optional** — not a freeze-gate).
- **Architecture:** AR-12 Tier-1 PII list omits nominee VPA (add). Payment-module resolver seam (`apps/api/src/modules/payment/`) already exists — wire only.
- **UX:** UX-DR34 `<NomineeDetailEditor>` gains an optional VPA field; UX-DR26 `<UPIIntentButton>` surface transitions from the calm "not available yet" state to enabled when a VPA is present.

### Technical impact
- Migration: nullable Tier-1 `vpa` column on `claim_nominee_bank_accounts` (envelope-encrypted per Story 1.5 / AR-12).
- Domain: light `resolveNomineeVpa` in `payment/` from absent → real; VPA-format validation; per-account default #1 / switch #2.
- Contracts: the `contributions/upi-intent.ts` `{available:true}` branch becomes reachable (already defined in 8.4 — no contract change).
- No change to `buildContributionUpiUrl`, deterministic `tr=` (7.7), amount-lock, or `tn=` grammar.

---

## Section 3 — Recommended Approach

**Selected path: Option 1 — Direct Adjustment (Hybrid with a minimal PRD amendment).**

- **Option 1 (Direct Adjustment) — CHOSEN.** Add one vertical-slice story + a targeted PRD/architecture amendment. Effort: **Medium**. Risk: **Low–Medium** (Tier-1 PII field, fully precedented by 6.8's bank fields).
- **Option 2 (Rollback) — Not viable / unnecessary.** Nothing to revert; 8.4's seam was purpose-built to light up.
- **Option 3 (MVP Review) — Not selected.** FR-16/FR-27 and the 90-second loop (SM-1) are headline MVP scope; the rail stays. The payment-rail alternative (account+IFSC transfer / trust-mediated collection VPA) was surfaced and **BigDev elected to keep the committed nominee-VPA rail** rather than reopen FR-16/FR-27.

**Confirmed decisions (BigDev, 2026-07-21):** land **now / Epic-8 window** · **single vertical-slice story** · **keep the nominee-VPA rail** (collect at claim-time, per-account, optional).

---

## Section 4 — Detailed Change Proposals

### 4a — New Story

> **Story 8.13: Nominee-VPA Claim-Time Collection + Resolver Wiring + UPI Intent Re-enable** `[SURFACE+SUBSTRATE]`
> *(ID note: appended as 8-13, sequenced as the immediate next Epic-8 story. Deliberately NOT renumbered into the 8-6…8-12 range — the completed Stories 8.4/8.5 already cross-reference 8.5/8.10/8.11 by number, and renumbering would drift those done artifacts. The label being higher than 8.12 is cosmetic; the sequencing/priority is "next.")*
>
> **As** the contribution pipeline (fulfilling Story 8.4's deferred payee-VPA seam),
> **I want** the nominee's UPI VPA collected per bank account at claim-time and resolved into the UPI Intent,
> **So that** the assigned pool's `<UPIIntentButton>` fires a real `upi://pay` and Epic 8's 90-second loop is demoable to the yellow pill.
>
> **Acceptance Criteria**
>
> **Given** the confirmed substrate gap (no VPA anywhere; 6.8 collects account#+IFSC only) + BigDev decision 2026-07-21 (keep nominee-VPA rail; collect at claim-time; per-account; optional) + Story 8.4's `resolveNomineeVpa` seam returning `{ available:false, reason:'vpa_not_collected' }`
> **When** claim-time nominee collection runs on the 6.8 `<NomineeDetailEditor>` (UX-DR34) surface
> **Then** an **optional** `vpa` field is collected **per nominee bank account** (#1 and #2), **Tier-1 envelope-encrypted** (AR-12, via Story 1.5), UPI-VPA **format-validated** (`handle@psp`); a nominee without a VPA is a **first-class state** — the account+IFSC disbursement path is unaffected and VPA is **never** a `frozen`-gate (unlike IFSC + holder-name per FR-31)
> **And** a migration adds a **nullable** Tier-1 `vpa` column to `claim_nominee_bank_accounts`
>
> **Given** the payment-module resolver seam Story 8.4 left (`apps/api/src/modules/payment/`)
> **When** the assigned pool's nominee account #1 (or switched #2 per FR-27) **has** a VPA
> **Then** `resolveNomineeVpa` returns the real VPA (replacing the hard-`absent`), `POST /api/v1/member/contribution/intent` returns `{ available:true, upiUrl, tr, amountInr, vpa, account }`, and `<UPIIntentButton>` (UX-DR26, ≥56pt) renders **enabled**
> **And** when the VPA is **absent**, the existing `{ available:false, reason:'vpa_not_collected' }` fail-soft path is preserved **verbatim** (no regression of 8.4's first-class absent state; no fabricated VPA; no derivation from account#+IFSC)
> **And** `buildContributionUpiUrl`, the deterministic `tr=` (7.7), the amount-lock, and the `tn=` grammar are **unchanged** — this story lights only the `pa=` seam
>
> **Given** FR-27's account #1/#2 "Switch account" affordance (deferred in 8.4 per D1)
> **When** ≥2 nominee accounts carry a VPA
> **Then** the switch affordance is enabled (default #1); when <2 accounts carry a VPA, no switch is shown (8.4's `account_not_found` resolver state)
>
> **Given** wrong-pool enforcement (Story 7.6)
> **Then** VPA→pool uniqueness holds (each pool resolves its own nominee-account VPA); no cross-pool remap
>
> **Given** the Epic-8 SM-1 demo precondition (`epics.md:2853`)
> **Then** with ≥1 nominee-account VPA seeded in a test claim, the 90-second loop fires a real `upi://pay` end-to-end to the yellow pill on the canonical validation device
>
> **And** i18n: the new VPA field label / help / validation-error copy added to `locales/{hi,en}/…` (grade-6, hi+en parity, `pnpm i18n:check`)
> **And** tests: domain unit (resolver present / absent / switch), migration + schema shape, contract `{available:true}` reachability, integration (intent endpoint returns `available` when a VPA is seeded)
>
> **Dev Notes / guardrails**
> - Payee (nominee) VPA — money **IN**, this story — is distinct from the **sender** (member) VPA read by the 9.4 secondary matcher — money **observed on statement**. Touch only the payee side.
> - Reuse 8.4's `resolveNomineeVpa` in `payment/`; wire, do not re-architect. Reuse `resolveMemberLivePool` (member-pool read seam).
> - Per-account VPA aligns FR-27's #1/#2 switch; nullable/optional; do **not** add VPA to the `frozen` gate.

### 4b — PRD amendments (`prds/prd-TWT-2026-05-22/prd.md`)

**FR-37 — add optional claim-time VPA collection:**

```
OLD (:654):
Claim filing is open to the nominee (regardless of TWT membership). Nominee enters
bank account #1, IFSC #1, account holder name #1; bank account #2, IFSC #2, account
holder name #2 (RBI/UPI workaround per FR-31). Death certificate uploaded.

NEW:
Claim filing is open to the nominee (regardless of TWT membership). Nominee enters
bank account #1, IFSC #1, account holder name #1; bank account #2, IFSC #2, account
holder name #2 (RBI/UPI workaround per FR-31); optionally a UPI VPA per account
(the `pa=` destination for member→nominee contributions, FR-16/FR-27). Death
certificate uploaded.

+ Consequences (testable):
+ - VPA is OPTIONAL per account and format-validated (handle@psp); its absence is a
+   first-class state and does NOT block `frozen` (unlike IFSC + holder-name).
```

**FR-16 — note the VPA source + fail-soft (append to `:470`):**

```
+ The pre-filled VPA is the assigned pool's nominee-account VPA collected at claim-time
+ (FR-37). When absent, UPI Intent is unavailable (first-class fail-soft) — never a
+ fabricated or `undefined` VPA.
```

**FR-27 — note absent-VPA path (append to consequences `:573`):**

```
+ - When the assigned pool's nominee VPA is not collected, the Intent is unavailable
+   (fail-soft "not available yet — Get help"); the UTR self-attest path (FR-28) still
+   supports out-of-band payment.
```

**FR-31 — clarify VPA scope (append to consequences `:606`):**

```
+ - Each account may carry an optional UPI VPA (FR-37); the "Switch account" affordance
+   is enabled only when ≥2 accounts carry a VPA.
```

### 4c — Architecture amendment (`epics.md:270`, AR-12)

```
OLD: …per-row DEK): mobile, email, Aadhaar, DOB, address, nominee bank, nominee IFSC,
     medical disclosures.
NEW: …per-row DEK): mobile, email, Aadhaar, DOB, address, nominee bank, nominee IFSC,
     nominee VPA, medical disclosures.
```

### 4d — UX note (`ux-design-specification.md`, UX-DR34)

`<NomineeDetailEditor>` gains an **optional VPA field per account** (format-validated, calm "optional — enables in-app UPI contributions" helper). No change to the dual-account structure. The UX-DR26 `<UPIIntentButton>` surface transitions from the "not available yet" state to enabled when a VPA resolves.

---

## Section 5 — Implementation Handoff

- **Scope classification:** Moderate → **PO / Dev**, with **PM / Architect sign-off** on the FR-37 amendment + AR-12 tier addition.
- **Sequencing:** Story 8.13 is the **next** Epic-8 story; it is a **precondition for the Epic-8 demoable-closure execution** and for Story 8.12's on-device SM-1 measurement.
- **Success criteria:** (1) a claim can carry a per-account nominee VPA (Tier-1); (2) with a VPA seeded, `member/contribution/intent` returns `available:true` and the button fires a real `upi://pay` to yellow pill on the validation device; (3) with no VPA, 8.4's `{available:false}` path is byte-for-byte preserved; (4) freeze gate is unaffected by VPA presence.
- **Next steps:** add `8-13` to `sprint-status.yaml` (status `backlog`); apply the PRD/AR-12/UX amendments; author Story 8.13 body in `epics.md`; then `bmad-create-story` for the full context file.
