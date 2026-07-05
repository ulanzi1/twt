# Degradation Policy Ledger

**Authority:** Story 0.4 + architecture Cross-Cutting #20 + #9 + PRD §9.1.1. **Status:** Live ledger; Framework-commit record below dated 2026-05-29 (Story 0.4 author-commit); all downstream sections await Tasks 7-9 closure.

This ledger is the **sole source of truth for trustee-attested degradation-policy events.** A claim of trustee attestation that is not recorded here is not durable; the ledger is to the degradation framework what `docs/escrow/escrow-ledger.md` is to credential escrow and what `docs/escrow/code-escrow/code-escrow-ledger.md` is to code escrow (per Story 0.2 + 0.3 precedent).

**Ledger-vs-inventory reconciliation:** ledger authoritative. When a `surface-inventory.md` row status disagrees with this ledger, the ledger is correct and the inventory is amended to match per the supersession schema (per Story 0.2 Decision 005 precedent).

**Ledger-vs-comms-template reconciliation:** ledger authoritative. When a `comms-templates/*.md` file's PENDING LEGAL REVIEW marker state disagrees with this ledger's Legal-counsel revision log, the ledger is correct and the template's marker state is amended to match.

---

## Framework-commit record

| Date | Author | Scope | Sign-off status | Notes |
|---|---|---|---|---|
| 2026-05-29 | Solo Builder (BigDev) | Story 0.4 author-commit — `docs/degradation-policy/` framework documents authored: `README.md`, `surface-inventory.md` (Tier 1 + Tier 2 + Tier 3 + Account State Machine sub-rows + out-of-scope enumeration), `comms-templates/` sub-directory with 5 channel files each carrying the PENDING LEGAL REVIEW marker, `table-top-exercise.md` (5-section runbook), this ledger | Author-committed; awaiting ≥2-trustee sign-off per Story 0.4 Task 7 | Tasks 1-6 author-committable; Tasks 7-9 explicitly `_AWAITING EXTERNAL ACTION_` per the Story 0.4 scope discipline. The framework cannot reach `trustee-signed-off` status without Task 7; cannot reach `fully-ratified` on comms templates without Story 0.13 returns per Task 9; cannot reach `table-top-exercised` without Task 8 execution. The full lifecycle from `drafted` to `live` is multi-Story per [[feedback_closure_language_precision]] — never collapse partial closure with full closure |

**Sign-off discipline (READ before adding rows):**

- Sign-off entries are appended below in the "Trustee sign-off log" section, not in this framework-commit record. This record is fixed at one row per material framework revision (author-commit, schema amendment, etc.).
- A framework revision (e.g., adding a sixth channel template) requires a NEW framework-commit row and ≥2-trustee re-attestation per the README §9 review cadence — it does NOT modify an existing row.

---

## Trustee sign-off log

_Empty at Story 0.4 author-commit time — populates as Task 7 (≥2-trustee sign-off) closes._

**Schema** (one row per sign-off event):

| Date | Trustee | Scope (per-bundle OR per-surface) | Mode | PENDING LEGAL REVIEW acknowledgement | Supersession-schema marker | Signature line | Notes |
|---|---|---|---|---|---|---|---|
| 2026-07-05 | Dhiraj Rahul | Framework: surface-inventory.md + table-top-exercise.md | per-bundle | Acknowledged — the 5 comms templates remain `PENDING LEGAL REVIEW` and are excluded from this sign-off; ratification is conditional on the marker being preserved until Story 0.13 counsel returns | Supersedes Decision 2026-05-29-004 framework-leg via `.decision-log.md` Decision 2026-07-05-064 | Dhiraj Rahul | Ratified via `docs/knowledge-transfer/trustee-consent-sheet-phase0-framework-ratifications.md` row R3; framework + inventory + table-top only. |
| 2026-07-05 | Kalpana Bharti | Framework: surface-inventory.md + table-top-exercise.md | per-bundle | Acknowledged — same carve-out as above | Supersedes the same Decision 2026-05-29-004 framework-leg | Kalpana Bharti | Quorum row (≥2-trustee sign-off complete). |

**Quorum requirement:** each sign-off event requires **≥2 rows** — one row per ratifying trustee. A single-row sign-off event is incomplete and does not satisfy the ≥2-trustee quorum. When adding a sign-off row, always verify that a co-signing trustee's row is also present (or pending) for the same scope/date.

**Mode legend:**

- `per-bundle` — trustee ratifies surface-inventory + comms-templates + table-top-exercise as a single unit. One row covers all surfaces; recorded conditionality is "all surfaces in scope at sign-off date."
- `per-surface` — trustee ratifies named surface(s) individually. One row per surface (or per bundle of surfaces ratified in the same session). Notes column enumerates the surfaces.

**PENDING LEGAL REVIEW acknowledgement:** every trustee sign-off MUST acknowledge that comms templates remain pending counsel review per Story 0.13 and that the ratification is **conditional** on the marker being preserved until Story 0.13 returns per-template. The acknowledgement is recorded verbatim in the column.

**Supersession-schema marker:** every sign-off row carries a marker that supersedes the "Author-committed; awaiting trustee sign-off" status on the corresponding `.decision-log.md` entry (Decision 2026-05-29-004 at author-commit; subsequent Decisions for amendments). The supersession is a NEW `.decision-log.md` `[CONTINUITY]` entry referencing the prior; the prior is NOT modified.

**AC-1 closure discipline** per Story 0.4 AC-1: AC-1 is **fully closed** when ≥2 trustees have signed off (per-bundle OR per-surface); **provisionally closed** when ≥1 trustee has signed off. Surface rows owned by Stories not yet closed (e.g., Module Marketplace surfaces in Epic 12, Phase-2-only surfaces) are expected to be `drafted` status at sign-off time — trustees sign off on the framework as-authored, with the understanding that placeholder rows are explicitly enumerated as `pending-system-availability` in the sign-off row's Notes column and will be amended as owning Stories close. Each amendment is a new ledger entry per the supersession schema; it does NOT require a full framework re-sign unless the amendment is material (i.e., changes the degradation stance or comms template for a surface that has now shipped).

---

## Legal-counsel revision log

_Empty at Story 0.4 author-commit time — populates as Story 0.13 closes and counsel returns per template._

**Schema** (one row per Story-0.13-counsel-return event):

| Date | Template file | Counsel reviewer | Return type | Revision-patch file cite | Trustee co-sign | Marker state transition | Notes |
|---|---|---|---|---|---|---|---|

**Return-type legend:**

- `flat-acceptance` — counsel accepts the template body as-authored; no revisions required. Marker transition: `PENDING LEGAL REVIEW` → `LEGAL REVIEW RETURNED (flat acceptance)`.
- `copy-revision` — counsel returns body-copy revisions; variable list unchanged. Marker transition: `PENDING LEGAL REVIEW` → `LEGAL REVIEW RETURNED (revisions applied YYYY-MM-DD)` after the revision patch is applied.
- `structural-revision` — counsel returns revisions affecting the template's variable list or channel-shape. The revision is applied AND requires a downstream Story 5.x update (dispatcher integration); the integration coordination is logged in this row's Notes column.
- `rejection` — counsel rejects the template body; re-authoring required. The original template is preserved in a `superseded-YYYY-MM-DD.md` snapshot per the supersession schema; the new template body is authored as a new `comms-templates/<channel>.md` file with a fresh PENDING LEGAL REVIEW marker; the original is marked `superseded-by` in its header.

**Marker-removal discipline** (per README §4 invariant 6): the PENDING LEGAL REVIEW marker is removed from a template ONLY via this log + trustee co-sign + supersession-schema marker. A silent marker removal is a framework violation; the only acceptable removal path is:

1. Counsel return logged here with `flat-acceptance` OR `revisions applied`.
2. Trustee co-sign recorded in this row's "Trustee co-sign" column.
3. The template file's PENDING LEGAL REVIEW marker is replaced with `LEGAL REVIEW RETURNED (YYYY-MM-DD)` referencing this ledger row.
4. The corresponding `surface-inventory.md` rows that cite this template are amended to `legal-counsel-returned` status (or `fully-ratified` if they were already `trustee-signed-off`).
5. The amendment to the surface-inventory rows is logged in the "Procedure-revision log" below.

---

## Activation declaration log

_Empty at Story 0.4 author-commit time — populates when degraded posture is formally declared per README §14 activation/deactivation ceremony._

**Schema** (one row per activation/deactivation event pair):

| Date activated | Declared by (Trustee secretary / designated trustee) | Certifying trustees (≥2) | Contact-attempt log cite | Trigger-condition certification | Activation flag set (Y/N + path used or "deferred-ADR") | Deactivation date | All-clear trustees | Comms-withdrawal SLA met | Notes |
|---|---|---|---|---|---|---|---|---|---|

**Recording discipline:**

- One row per activation event. The `Deactivation date` and downstream columns are filled when degraded posture ends; they are NOT a separate row.
- The contact-attempt log (per README §14.3) MUST be cited as an attachment or external reference. The ledger row does not reproduce the attempt log; it cites where it is held (Trustee resolution register, email thread SHA, shared folder reference, etc.).
- The `Trigger-condition certification` column records the verbatim trustee attestation text (e.g., "Solo Builder unreachable 7 consecutive calendar days as of YYYY-MM-DD; contact-attempt log reviewed; condition certified by [Trustee A] + [Trustee B]").
- `Activation flag set` records whether the technical flag-set path was used (per README §14.5 deferred ADR) or whether the declaration was documentary-only pending the ADR.
- **Supersession schema:** activation rows are never deleted. If a declaration is found to be premature (e.g., the trigger-condition log was incomplete), a new row records the corrected declaration; the original row is marked `[superseded by row YYYY-MM-DD-corrected]` in its Notes column.

**Cross-link:** each activation event is also logged in `.decision-log.md` as a `[CONTINUITY]` entry per the `.decision-log.md` schema (Decision 2026-05-29-004 "type" field). The `.decision-log.md` entry is the human-readable narrative; this ledger row is the machine-readable, field-by-field authority.

---

## Table-top exercise log

**30-day takeover joint-discharge anchor** (per Story 0.3 Decision 2026-05-29-003 Open Follow-up + Story 0.5 Decision 2026-05-30-005 cross-link + Story 0.6 Decision 2026-05-30-006 cross-link): the PRD §9.1.1 + AR-67 30-day-takeover property is jointly discharged by Story 0.3 AC-1 (code accessibility) + Story 0.3 AC-2 (continuity-of-development) + Story 0.4 AC-1 (per-surface degradation stance + comms templates + trustee sign-off) + Story 0.4 AC-2 (table-top exercise) + Story 0.5 AC-1 (KT pack compiled) + Story 0.5 AC-2 (KT pack stored + cross-linked) + Story 0.5 AC-3 (backup engineer scores ≥ 80% on comprehension questionnaire) + Story 0.6 AC-1 (backup engineer contract framework + signed contract) + Story 0.6 AC-2 (activation-scenario test). A closure of any one of those **nine** conditions (note: Story 0.6 splits into AC-1 + AC-2 per the Story 0.6 spec — the broader "Story 0.6 (backup engineer contract)" phrasing above remains in earlier drafts; under Story 0.6 Decision 006 the eight-condition union is reinterpreted as Story 0.3 AC-1 + AC-2 + Story 0.4 AC-1 + AC-2 + Story 0.5 AC-1 + AC-2 + AC-3 + Story 0.6 AC-1 + AC-2 — eight separate AC commitments since Story 0.6 AC-1 + AC-2 jointly count as the Story 0.6 contribution) MUST NOT be conflated with the joint discharge per [[feedback_closure_language_precision]]. Every row in this log carries a "Joint-discharge contribution" column tracking how that exercise contributes to the joint discharge. **Story 0.5 author-commit dated 2026-05-30** contributes the KT pack legs (AC-1 + AC-2 author-committed; AC-3 awaits Story 0.6 closure for the backup-engineer comprehension administration); cross-link to `docs/knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log" which holds the parallel anchor for the AC-3 leg. **Story 0.6 author-commit dated 2026-05-30** contributes the backup-engineer framework leg (AC-1 framework + cross-Story dependency closure paths committed; substantive engineer + signed contract + onboarding + activation-scenario test pending per Story 0.6 Tasks 8-12); cross-link to `docs/backup-engineer/backup-engineer-ledger.md` §6 Activation event log header which holds the parallel anchor for Story 0.6 AC-2; the backup-engineer-as-facilitator path becomes operationally available once Story 0.6 Tasks 8-10 close.

_Empty at Story 0.4 author-commit time — populates as Task 8 (first table-top execution) closes._

**Schema** (one row per table-top execution event):

| Date | Facilitator | Attending trustees | Scenario script version | Day-N steps walked | Joint-discharge contribution | Re-execution schedule | Notes |
|---|---|---|---|---|---|---|---|

**Per-decision-point recording** (required per AC-2 leg 3): immediately below each exercise row, add a decision-point sub-table as a markdown fenced block with the following columns:

```
| Day-N step | Artifact cited | Answer unambiguous (Y/N) | Gap surfaced (Y/N) | Gap description |
|---|---|---|---|---|
| 2.1 — Day 1 | surface-inventory.md Tier-1 rows + README §14 | Y | N | — |
...
```

A decision point with no artifact cited is itself a gap — the policy artifact is insufficient.

**Gap recording** (required per AC-2 leg 3): each gap is logged as an **inline gap row** immediately below the exercise row and its decision-point sub-table — NOT in an external gap-list document. Inline schema:

| Gap date | Day-N step | Gap description | Artifact insufficient | Remediation owner | Remediation target | Remediation status |
|---|---|---|---|---|---|---|

**Facilitator-selection discipline** (per Story 0.4 Task 8 self-sufficiency guardrails):

- **Preferred:** backup engineer per Story 0.6 (allows the exercise to rehearse under bus-factor silence per the Story 0.2 + 0.3 simulation discipline).
- **Substitute path:** Solo Builder OR trustee-authorized substitute if Story 0.6 has not yet contracted a backup engineer (record as a `.decision-log.md` `[CONTINUITY]` entry citing the Story 0.6 dependency).
- **Avoid:** Solo Builder facilitating when Story 0.6 IS contracted (defeats the bus-factor simulation purpose).

**Bus-factor simulation discipline:** when the facilitator is non-Solo-Builder, Solo Builder is silent for the duration of the exercise. Questions asked of Solo Builder during the exercise are themselves the gap — the policy artifacts are insufficient and the gap goes in the gap list.

**Decision-point recording discipline:** every Day-N decision point MUST cite a specific artifact (surface-inventory row OR comms-template file OR cross-referenced Story 0.X framework). A decision point that resolves on "the trustees discussed it and decided X" with no artifact cite is a **gap** — the artifact is insufficient OR the policy doesn't cover the case. The gap goes in the gap list; the remediation is the artifact amendment.

**Output is a gap list, not a pass/fail score** (per AC-2 explicit text). The exercise is a dry run that surfaces gaps so they're resolved in the artifacts, not in live bus-factor activation. Zero gaps on a first execution is a suspicious outcome — the README §9 fallback cadence recommends re-execution with scenario revisions to confirm "no new gaps" before treating the outcome as terminal.

**AC-2 closure rule:**

- AC-2 is **provisionally closed** when at least one table-top exercise is executed and the resulting gap list is recorded — regardless of gap count.
- AC-2 is **fully closed** when (a) the gap list is fully discharged (every gap either remediated in the artifacts OR explicitly deferred with rationale per [[feedback_closure_language_precision]]) AND (b) the panel reaches "no new gaps surfaced" on at least one re-execution OR ≥6 months elapsed without a remediation-triggering live incident — whichever comes first per the README §9 review cadence fallback.

---

## Periodic re-attestation log

_Empty at Story 0.4 author-commit time — populates per the README §9 fallback cadence (quarterly re-attestation; annual table-top re-execution; per-counsel-return ratification; per-incident post-mortem)._

**Schema** (one row per re-attestation event):

| Date | Re-attestation type | Trustee | Scope verified | Outcome | Gaps surfaced | Follow-up | Notes |
|---|---|---|---|---|---|---|---|

**Re-attestation-type legend:**

- `quarterly-inventory-re-attestation` — ≥1 trustee re-attests the surface inventory (surface drift surfaces new rows; superseded rows are confirmed superseded).
- `annual-table-top-re-execution` — re-execution of `table-top-exercise.md`; appends a row in the Table-top exercise log AND a row here noting the cadence-driven nature.
- `per-counsel-return-ratification` — ratification of a Story 0.13 counsel return; cross-links the Legal-counsel revision log row.
- `per-incident-post-mortem` — within-30-days policy-revision review after a live degraded-posture activation; surface findings here AND in the Procedure-revision log.
- `on-rotation-event-cred-re-seal` — re-seal of any credentials referenced by the framework (e.g., DR runbook PDF custody per architecture §5.9).

---

## Procedure-revision log

_Empty at Story 0.4 author-commit time — populates when the framework documents are revised per the supersession schema (per Story 0.3 procedure-revision precedent)._

**Schema** (one row per material framework revision):

| Date | Revising author | Document(s) revised | Trigger (live incident / table-top gap / counsel return / cadence-driven / surface-amendment) | Pre-revision state cite | Post-revision state cite | Re-sign required? | Trustee co-sign | Notes |
|---|---|---|---|---|---|---|---|---|

**Revision discipline:**

- Revisions follow the supersession schema (inherited from Story 0.3): the prior text is preserved (in git history; in a `superseded-YYYY-MM-DD.md` snapshot where the revision is structural); the new text is the canonical reference going forward; the revision is logged here.
- Material edits to comms templates (anything beyond a typo) require re-sign per the README §9 cadence; non-material edits (typos, formatting) do not.
- Surface-amendment-driven revisions (e.g., a Tier-1 surface ships under its owning Story and its degradation framing needs sharpening) are NOT material edits to this framework — they are amendments to `surface-inventory.md` rows. Log the row amendments here when they affect multiple surfaces; log them in the inventory itself when they affect a single row.

---

## Cross-links into related frameworks

- **Story 0.1 operational readiness** — `docs/runbooks/operational-readiness-ledger.md` "Degradation policy coverage" section cross-links to this ledger. The operational runbook sign-off rotation is the trustee-attestation backbone that the degradation policy inherits per the README §7.
- **Story 0.2 credential escrow** — `docs/escrow/credential-inventory.md` row `dr-runbook-pdf-custody` cites Story 0.4 + architecture §5.7. The DR runbook PDF custody is forward-referenced as a related artifact owned by the broader DR-runbook ownership decision (Open ADR slot per README §8).
- **Story 0.3 code escrow** — `docs/escrow/code-escrow/README.md` cites Story 0.4 for the degradation-policy comms templates and the DR runbook PDF custody. The code-survival posture committed by Story 0.3 is the upstream input for the "code accessibility" leg of the 30-day takeover joint discharge tracked in the Table-top exercise log header above.
- **Story 0.7 P0-1 fallback-handler ledger** — Author-committed 2026-05-30 at `docs/fallback-handler-ledger/` per Decision 2026-05-30-007 — citation slots committed via `docs/fallback-handler-ledger/backfill-log.md` (23 rows: 22 across this framework + 1 in `_bmad-output/implementation-artifacts/deferred-work.md`); substantive textual `P0-1-pending` replacement pending Story 0.7 Task 9 (Trustee Panel + Operations Lead naming event). The substantive backfill operation when applied will be logged in this Procedure-revision log per the supersession schema.
- **Story 0.13 legal counsel engagement** — counsel returns per template are logged in the Legal-counsel revision log above. Story 0.13 closure is the unblock for comms-template marker removal per the README §4 invariant 6.
