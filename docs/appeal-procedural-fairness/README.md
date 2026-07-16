> **⚠ PENDING LEGAL REVIEW PER STORY 0.13 ⚠**
>
> **This appeal procedural-fairness specification is authored but NOT yet cleared for go-live. The
> internal 3-stage appeal flow is GATED OFF per Pariwar by the `pariwar_appeal_config.legal_review_status`
> config (fail-closed default `pending_legal_review`) until legal counsel returns and the items in §4 are
> resolved. Flipping the config to `cleared` is the go-live action — tracked SEPARATELY from implementation
> completion ([[feedback_closure_language_precision]]: "resolved via deferral" ≠ "closed by edit" ≠ "not
> addressed").**

# Appeal Procedural-Fairness Specification (FR-43A / Story 6.16)

The internal 3-stage claim-denial appeal flow — **Stage 1** (a District Admin reviewer who is **not** the
original verifier/decider) → **Stage 2** (a State Trustee panel vote) → **Stage 3** (Trustee discretion,
final) — with a reversed denial emitting the `claim.reversed` publish hook for Sahyog Vivran (Epic 11b).

This document is the procedural-fairness spec section the Story 0.13 legal-counsel engagement reviews before
the flow may go LIVE. It carries the structurally-visible PENDING-LEGAL-REVIEW marker above (the Story 0.4
comms-template marker discipline). The substantive machine contract lives in code; this doc is the
counsel-facing narrative + the go-live gate.

## 1. The ladder (ratified design, D-A–D-H)

| Stage | Actor | Outcomes (v1) | On reverse | On non-reverse |
| --- | --- | --- | --- | --- |
| **1** | District Admin reviewer (≠ original verifier / state-trustee decider / R9 voter — D-D) | `reversed` \| `advance` | → `reversed` + `claim.reversed` hook | → `appeal_stage_2` (auto-advance, D-C) |
| **2** | State Trustee **panel** (≥2 members, D-B) | `reversed` \| `advance` | strict reverse-majority → `reversed` + hook | tie / sub-majority → `appeal_stage_3` (D-C) |
| **3** | Trustee discretion (**final**) | `reversed` \| `upheld` | → `reversed` + hook | `upheld` → `denied` + `claim.denied_no_appeal` (freeze cleared) |

- **No claimant-facing deadline (D-E).** The claimant may initiate an appeal on a `denied` claim **at any
  time** — the PRD's "no formal time limit … grief-aware" rule. There is NO `AppealWindowExpiredError` and NO
  elapsed-time gate on the right to initiate or continue.
- **Exactly one appeal journey per claim, ever (D-F).** Enforced by an unconditional `UNIQUE (claim_case_id)`
  on `claim_appeals`. After a Stage-3 uphold the claim is NOT re-appealable.
- **Trust-side per-stage SLA (D-H).** Each stage carries a configurable, Pariwar-scoped SLA duration,
  computed AT READ TIME (never a cron/new event; never a gate). A breach surfaces as a flag on the audit
  query + an "overdue appeals" admin indicator + context for Story 0.7's response-time SLA framework. It is
  internal/trust-side ONLY and NEVER blocks the claimant.

## 2. Public accountability without PII (D-A reconciliation)

PRD §4.6 asks for the reversal's decision + rationale + reviewer identity to be public on Sahyog Vivran. This
is **reconciled, not implemented verbatim** — publishing the Tier-1 rationale ciphertext or an individually
identifying reviewer name would leak PII / encrypted content and expose reviewers to targeting. Instead:

- the reviewer selects a bounded, **NON-PII `disposition_category`** enum tag at decision time
  (`new_evidence_presented` | `procedural_correction` | `reconsideration_on_merits` — v1 taxonomy);
- the `claim.reversed` publish-hook event carries `reversed_at_stage` (1|2|3) + `disposition_category` ONLY —
  never rationale text, never a reviewer identity;
- accountability is conveyed via **stage + body**, never a named individual:
  *"Reversed at Stage {N} ({District Admin reviewer | State Trustee panel | Trustee}) — {disposition_category}"*.

## 3. The go-live gate mechanism (D-G)

- **Config:** `pariwar_appeal_config.legal_review_status` — an enum `pending_legal_review` (fail-closed
  default) | `cleared`. Absent config row ⇒ treated as `pending_legal_review` (fail-closed).
- **Enforcement:** every ADMIN stage-adjudication write (`stage1`, `stage2/{open,vote,finalize,cancel}`,
  `stage3`) checks the config INSIDE its scope-tx (`assertAppealFlowLive`) and fails closed with a
  `503 appeal.pending_legal_review` until the flag is `cleared`. **Initiate is deliberately NOT gated** — a
  claimant's right to FILE an appeal must not be blocked by a trust-side config; the gate protects the
  ADJUDICATION, not the filing.
- **Flip procedure:** counsel returns → any counsel-flagged issue is addressed under the supersession
  schema (a `legal-counsel-revision-YYYY-MM-DD.md` patch file in this directory + the prior body preserved in
  a `superseded-YYYY-MM-DD.md` snapshot, the Story 0.4 discipline) → THEN, per Pariwar, an authorized operator
  sets `legal_review_status = 'cleared'`. The flip is the go-live action, tracked separately from
  implementation completion.

## 4. Counsel-review items (MUST be resolved before go-live)

1. **The Stage-2/3 conflict-exclusion open question (D-D scope note).** v1 enforces the reviewer-conflict
   exclusion (reviewer ∉ original verifier ∪ original state-trustee decider ∪ R9 panel voters) at **Stage 1
   only**. Whether Stages 2 and 3 also require conflict-exclusion is a documented open procedural-fairness
   question for counsel — NOT enforced in v1.
2. **The CPA-2019 no-judicial-challenge-mitigation disclosure (AC7/AC4, D-G).** The member surface and the
   Stage-3-uphold outcome copy MUST state that exhausting the internal appeal does NOT waive the claimant's
   right to external legal/consumer-forum recourse (district/state consumer commission, civil court —
   architecture's regulatory cross-reference table names this against FR-43A specifically). Counsel confirms
   the exact disclosure wording.
3. **The D-A `disposition_category` taxonomy + its public wording template.** Counsel confirms that no
   category/stage/timing combination could re-identify a reviewer or leak rationale, and ratifies the public
   wording template Epic 11b renders.

## 5. Closure status (per [[feedback_closure_language_precision]])

- **Closed by edit:** the appeal state machine (Story 6.1), the write-paths + routes + surfaces (Story 6.16),
  the `claim.reversed` publish hook, the reviewer-conflict enforcement, the SLA read model, and this spec doc
  — all authored.
- **Resolved via explicit deferral:** the §4 counsel-review items — tracked here, gating go-live via the
  `legal_review_status` config; NOT built into a code workflow (a tracked doc + go-live gate, the Story 0.13
  pattern).
- **Not addressed:** none (this state must not occur; it triggers an open question).
