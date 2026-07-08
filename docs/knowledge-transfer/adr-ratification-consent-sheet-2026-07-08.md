# ADR Ratification — Trustee Consent Sheet (2026-07-08)

**Purpose:** collect Trustee Panel consent for the five ADRs currently `drafted` and
awaiting ratification — ADR-0026 through ADR-0029 (authored across Epic 3/5 story
closures, un-presented since their respective author-commit dates) plus ADR-0030
(authored at Epic 5 retrospective AI-5-3 closure, revised through two pre-ratification
amendment passes on 2026-07-08). One row per ADR; mark each **Ratify / Defer / Reject**
and initial.

**Trustee Panel (≥2-trustee quorum required to ratify):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for the flip:** `docs/adr/README.md` lifecycle (`drafted → under-trustee-review → ratified`); `docs/knowledge-transfer/adr-index.md` is the authoritative status ledger.

> Status as of 2026-07-08: all five ADRs below are `drafted`, none previously presented
> to the Trustee Panel, none previously ratified. `adr-index.md` currently carries a row
> for ADR-0026 only — ADR-0027/0028/0029 are missing index rows entirely (an index
> hygiene gap, not a ratification-status problem) and are added as part of this
> session's cascade regardless of outcome.

---

## Read-first priority

- **ADR-0026 (DigiLocker signature policy)** is the one **trustee-judgment** item on
  this sheet — it commits a P0 KYC security policy (certificate staleness fail-closed
  thresholds) the architecture explicitly delegated to an ADR. Read this one closely;
  the other four are engineering-substrate / vendor-selection, light-touch.
- **ADR-0027 (push provider)** and **ADR-0028 (WhatsApp provider)** are vendor/SDK
  selections behind an already-committed swap-surface abstraction (AR-53 for
  WhatsApp; the architecture's own §3.4 wording anticipated both choices) — narrow,
  reversible, light-touch.
- **ADR-0029 (WhatsApp webhook ingress + opt-in lifecycle)** sits between the two
  weights: the URL topology / persist-and-ack mechanics are engineering-substrate, but
  the opt-in **consent model** (state-table vs. consent-registry split, AR-16
  user-initiated-only posture) is policy-adjacent — flagged for a closer read.
- **ADR-0030 (compensating-audit mechanization)** is light-touch engineering-substrate
  (a CI-gate + shared helper, same family as the already-ratified ADR-0012–0015
  cluster) — see the dedicated section below for the full rationale and the specific
  judgment calls it embeds.

---

## Consent table

| # | ADR | Decision (one line) | Owning story/event | Status | Recorded gate / caveat | Weight | Trustee decision |
|---|---|---|---|---|---|---|---|
| 1 | **ADR-0026** digilocker-signature-policy | Two-window cert staleness budget — **fresh ≤7 days** (trusted, no alarm), **within-budget 7–30 days** (trusted + ops alarm), **hard limit >30 days** (new KYC fails closed → `pending-valid` manual fallback; existing verified members unaffected); annual trust-anchor/KEK review + daily cert refresh; key-compromise re-verification queue | Story 3.3a | `drafted` (2026-06-25) | Architecture §3.8 named this an ADR-committed slot (no numbers in architecture itself) — this IS the source of truth for the 7d/30d values, not a backfill | **Trustee-judgment** (P0 security policy) | Ratify : _______  init: __kp & dr___ |
| 2 | **ADR-0027** push-provider-selection | Single `firebase-admin` SDK sends to BOTH Android (FCM HTTP v1) and iOS (APNs) — no native APNs `.p8` credential path, no second auth-refresh mechanism | Story 5.2 | `drafted` (2026-07-05) | None — vendor choice behind the 5.1 provider-stub abstraction; reversible via a single-module swap | Light-touch | Ratify : _______  init: ___kp & dr__ |
| 3 | **ADR-0028** whatsapp-provider-selection | Direct Meta WhatsApp Business Cloud API for v1 — **no BSP intermediary** (Gupshup/Twilio/WATI); thin `fetch`-based client, per-Pariwar system-user access token via Secret-Manager NAME pointer | Story 5.3 | `drafted` (2026-07-05) | AR-53 commits the swap surface is a single-module change if a BSP is added later — this ADR is explicitly reversible along that seam | Light-touch | Ratify: _______  init: __kp & dr___ |
| 4 | **ADR-0029** whatsapp-webhook-ingress-and-opt-in-lifecycle | Per-Pariwar signed webhook URL (`X-Hub-Signature-256` keyed by the Pariwar's app secret, verification key resolved from the path BEFORE the body is trusted); persist-and-ack + async pg-boss worker drain (architecture §3.11 pattern); opt-in lifecycle split across a dedicated state table + the Story 2.7 consent registry | Story 5.4 | `drafted` (2026-07-06) | AR-16 user-initiated-only consent posture (no passive/pre-checked/bundled/inferred opt-in) is a policy commitment worth trustee attention, not just the URL/worker mechanics | Policy-adjacent — read closely | Ratify : _______  init: ___kp & dr__ |
| 5 | **ADR-0030** compensating-audit-mechanization | Shared `withCompensatingAudit` helper (`packages/domain/src/audit`) + 5-site fix (`channel-config` ×3, `degraded-mode` ×2) + 4-module backfill (`wa-opt-in`, `telegram-opt-in`, `terms`, `medical`) + AST gate enforcing "audit writes in a rollback-capable-tx function must flow through the helper," landed in two commits | Epic 5 retrospective AI-5-3 | `drafted` (2 pre-ratification amendment passes applied 2026-07-08 — see ADR changelog) | None — light-touch, reversible, no data-model/policy content; see the dedicated section below for the embedded judgment calls | Light-touch (same family as ADR-0012–0015) | Ratify : _______  init: __kp & dr___ |

---

## ADR-0030 detail — what you're being asked to ratify

**The gap:** the Epic 5 retrospective (H-4/I-1) found the "compensating audit" pattern
— write the intent audit line first, run the mutation, and if it fails, fire a
`*_rolled_back` compensating audit line so the audit ledger never claims a state
change that didn't durably happen — exists correctly in four modules (`wa-opt-in`,
`telegram-opt-in`, `terms`, `medical`), each hand-rolled independently, and is
**missing** in five confirmed call sites across two modules (`channel-config`,
`degraded-mode`).

**Rationale (verbatim from the ADR):** *"The project now has four independently
correct implementations of the same protocol and five confirmed omissions of that
protocol. This exceeds the project's extraction threshold ('rule of three') while
keeping the implementation surface intentionally small. Standardizing the protocol in
one helper and enforcing it with a narrowly scoped AST invariant reduces future review
burden without changing the underlying transaction architecture or audit durability
model."*

**What does NOT change** (ADR §Non-goals): the two-commit-horizon transaction
architecture itself; the `closeScopeTx` commit-failure residual (an accepted,
pre-existing, unrelated risk); the isolated-best-effort audit writes already governed
by AI-4-3(d) (dispatch's `createAuditPort`, device-token's invalidation/registration
audits) — the ADR is explicit that its gate must not, and structurally cannot, touch
these.

**Points the panel may want to probe before signing** (surfaced here rather than left
implicit):

1. **The `degraded-mode.revoke` refactor** (ADR §2) restructures that handler's
   internal flow (pre-check-then-audit-or-skip instead of mutate-then-conditionally-
   audit) to fit one uniform helper shape. Externally observable behavior is
   unchanged (still idempotent, still audits only an actual revocation) — internal
   restructuring, not a behavior change, but it does touch already-shipped Epic 5
   code.
2. **The AST gate's precondition is deliberately narrow** (ADR §0/§4): it only fires
   on functions holding a rollback-capable transaction handle. A future module
   inventing a third transaction-handling shape not yet seen in this codebase would
   need the gate's detection extended — named as a Non-goal (whole-codebase retrofit
   is explicitly out of scope), not hidden.
3. **No CI-job topology is fixed by the ADR** (§Non-goals) — new job vs. extending
   the existing `access-wrapper-invariants` job is left to the implementing commit,
   consistent with how ADR-0013/0014/0015 were ratified before their exact
   script/job shape existed.

None of these are blocking — they're the ADR's own stated scope boundaries.

---

## After the session — what I do per ratified row

Same 3-surface cascade run for every prior ADR ratification (a status flip in one
place without the others is a framework gap per `adr-index.md`):

1. **ADR file** (each of the five) — `Status: drafted → ratified`, `Date` updated,
   `Ratifying trustees` filled in, changelog row appended. ADR-0029, if ratified,
   should record any AR-16 consent-posture discussion as a Ratification/governance
   note (mirroring how ADR-0021 carries its governance clarification).
2. **`adr-index.md`** — flip each ratified row; **add the missing rows for
   ADR-0027/0028/0029** (index hygiene gap, not previously carried); update the
   status-count breakdown; refresh the ledger note.
3. **`.decision-log.md`** — one ratification entry (or one per ADR, panel's
   preference), next number to be assigned at cascade time (last entry on file:
   `2026-07-05-064`; today's session would be `2026-07-08-0NN`, finalized against
   whatever else lands first, per the ADR-0015 058→059 precedent).

For ADR-0030 specifically, implementation then proceeds per its two-commit sequencing
(§5): Commit 1 — helper + five-site fix; Commit 2 — four-module backfill + AST gate.

---

## Session Resolution *(to be completed at the session)*

The Trustee Panel (KP, DR) reviewed ADR-0026, ADR-0027, ADR-0028, ADR-0029, and
ADR-0030 as presented in this sheet.

| ADR | Decision | Amendments / conditions |
|---|---|---|
| ADR-0026 | ☐ Ratified  | |
| ADR-0027 | ☐ Ratified  | |
| ADR-0028 | ☐ Ratified  | |
| ADR-0029 | ☐ Ratified  | |
| ADR-0030 | ☐ Ratified  | |

Trustee initials: _dr____ (DR)  __kp___ (KP)   Date: ___2026-07-08_______

---

### Footnote — ratification weight (for triage, grounded in the decision log)

Consistent with the 2026-06-21 sheet's distinction:
- **Light-touch** — engineering-substrate / reversible-tooling ADRs: confirmation is
  a lower-friction leg. ADR-0027, ADR-0028, and ADR-0030 sit here (vendor selections
  behind committed swap surfaces; a CI-gate + helper extraction in the same family as
  the already-ratified ADR-0012–0015 cluster).
- **Trustee-judgment** — security / data-model / policy ADRs where the choice is
  materially the trust's. ADR-0026 sits here (P0 KYC fail-closed thresholds).
- **Policy-adjacent** — mixed: mechanics are substrate, but a policy commitment is
  embedded. ADR-0029 sits here (AR-16 consent posture inside an otherwise
  engineering-substrate webhook-ingress design).

The weight column is a triage aid, not a status — every row still requires the
≥2-trustee quorum to flip to `ratified`.

---

## Cascade applied — 2026-07-08

All five ADRs ratified (none deferred, none rejected, no amendments recorded on any
row); quorum met (DR + KP, per the consent-table initials and the bottom
Trustee-initials/date line). The 3-surface cascade was run per Decision
**`2026-07-08-065`**:

- **Five ADR files** flipped `drafted` → `ratified` (`Status`, `Date` →
  `2026-07-08 (date entered current status)`, `Ratifying trustees` filled in, +
  changelog row appended): `ADR-0026-digilocker-signature-policy.md`,
  `ADR-0027-push-provider-selection.md`, `ADR-0028-whatsapp-provider-selection.md`,
  `ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md`,
  `ADR-0030-compensating-audit-mechanization.md`.
- **`adr-index.md`** — ADR-0026 and ADR-0030 Section A rows flipped to `ratified`;
  ADR-0027/0028/0029 **added as new Section A rows** (the index-hygiene gap named in
  this sheet's header) and ratified in the same edit; status-count table corrected
  (`drafted` 1→0, `ratified` 23→28, Total 143→147 — the total also folds in a
  same-day correction for the ADR-0030 row that had been added earlier 2026-07-08
  without being posted to the count); reconciliation footnote appended.
- **`.decision-log.md`** — Decision `2026-07-08-065` appended (5-ADR ratification
  batch + the index-hygiene-gap correction, recorded per
  [[feedback_record_unattested_no_backfill]] as a hygiene fix, not a fabricated
  earlier index presence).

**Open follow-ups carried forward (NOT closed by this ratification):** ADR-0030's
two-commit implementation (Commit 1 — helper + five-site fix; Commit 2 —
four-module backfill + AST gate) has not yet started.
