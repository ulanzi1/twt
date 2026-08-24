# Engagement Ledger

**Authority cite:** Story 0.13 AC-1 + AC-2; `README.md` §2 + §6; `engagement-letter-template.md`; `counsel-roster.md`; Decision 2026-06-02-013.

**Status:** Author-committed with schema + section headers + template-row placeholders at `pending-Task-N` status (per the lifecycle stage that populates the section); substantive entries land at Story 0.13 Tasks 7-11.

> **Header note:** This ledger is the **parallel** ledger of the legal-counsel-concurrent-review portfolio, distinct from the other framework portfolio ledgers (operational-readiness-ledger; escrow-ledger; code-escrow-ledger; degradation-policy-ledger; kt-pack-ledger; backup-engineer-ledger; fallback-handler-ledger; spec-to-cadence-reconciliation framework). Forbidden-removal rule applied; supersession-only lifecycle exit. The ledger is authoritative for the lifecycle log; substantive return content lives in `per-artifact-return-roster.md`.

---

## §1 Header

**Authority cites:**
- UX §Phase-0 P0-4 launch-blocker (UX spec line 109)
- Epics line 564 cross-cutting Phase-0 prereq gates
- Epics line 687 Epic 0 Deliverable P0-4
- Architecture §External Validation Pending (architecture lines 4842-4860)
- Architecture §Launch Gate Risks subsidiary legal-counsel-naming rows (architecture lines 4785-4788)
- PRD §4.14.1 regulatory surface inventory (PRD line 1169)
- PRD §10.1 trust-posture legal caveat (UX spec line 75)
- Decision 2026-06-02-013

**Lifecycle stage at author-commit:** `Author-committed; awaiting Trustee Panel scope ratification + counsel shortlist + counsel selection + engagement-letter signature + first-artifact submission + counsel returns + Epic 2/3/6 integration`

**Lifecycle stage progression** (per `README.md` §2):
1. Author-commit (Story 0.13 Tasks 1-6) — framework artifacts authored
2. Trustee Panel scope ratification (Task 7) — `review-scope-charter.md` §1 + §3 + §4 ratified
3. Counsel shortlist + selection (Task 8) — `counsel-roster.md` candidates added → ratified
4. Engagement-letter + NDA + COI disclosure signed (Task 9) — `engagement-letter-template.md` substantive language committed by Counsel + signed
5. First artifact submitted within 2 weeks of signing (Task 10) — Epic 2 T&C draft per `review-artifact-roster.md` Row 1 priority-1
6. Counsel returns within per-artifact SLA (Task 11) — `per-artifact-return-roster.md` populated
7. Epic 2/3/6 integration (Task 11) — implementing-Story counsel-return integration
8. Ongoing concurrent review + quarterly engagement health + annual term renewal (per §9 below)

---

## §2 Lifecycle definition

(Documented above in §1 Header lifecycle stages. The lifecycle is event-driven: each Task closure event triggers a `.decision-log.md` `[LEGAL]` supersession entry on Decision 2026-06-02-013 + a corresponding §-log entry in this ledger.)

---

## §3 Trustee scope ratification log

**Schema per row:** date | ratifying trustees | ratification mode | ratified scope items | conditions

**Allowed ratification modes:** `pack-as-a-unit` (default) OR `per-scope-item` (requires both trustees to agree on mode); mode recorded in header column

(Empty at author-commit; populates at Task 7 Trustee Panel scope ratification event.)

| Date | Ratifying trustees | Mode | Ratified scope items | Conditions / Notes |
|---|---|---|---|---|
| 2026-07-05 | Dhiraj Rahul + Kalpana Bharti | pack-as-a-unit | `review-scope-charter.md` §1 + §3 + §4 + §5 + §6 + §7 | Ratified via `docs/knowledge-transfer/trustee-consent-sheet-phase0-framework-ratifications.md` row R1; discharges Story 0.13 Task 7; unblocks Task 8 (counsel shortlist + selection). Cross-reference: `.decision-log.md` Decision 2026-07-05-064. |

---

## §4 Counsel-selection log

**Schema per row:** date | ratifying trustees | mode | shortlisted candidates | interview outcomes | selected candidate | selection rationale | alternatives considered | multi-counsel notes (if applicable)

(Empty at author-commit; populates at Task 8 counsel shortlist + selection event.)

| Date | Ratifying trustees | Shortlisted candidates | Interview outcomes | Selected candidate | Selection rationale | Alternatives considered | Multi-counsel notes |
|---|---|---|---|---|---|---|---|
| `<PENDING-TASK-8>` | `<≥2 trustees>` | `<≥2 candidates per counsel-roster.md>` | `<interview-outcome-per-candidate>` | `<lc-N>` | `<selection rationale per shortlist criteria match + COI clearance + concurrent-review-mode availability + budget fit per Story 0.12 contract-help-path>` | `<alternatives + non-selection rationale>` | `<multi-counsel coordination notes if applicable per README §4 invariant 11>` |
| **2026-08-24** ⚠ *(RECONSTRUCTED, ⛔ not a Task-8 record)* | ⛔ **UNKNOWN — no record of who selected** | ⛔ **NONE ON RECORD** | ⛔ **NONE ON RECORD** | **`lc-1` — Adv. Mohit Agrawal** | ⛔ **UNKNOWN.** ⚠ The counsel is real and engaged since **2026-06-21** (`2026-06-21-057`), but ⛔ **no shortlist, no interview and no selection rationale was ever recorded** | ⛔ **UNKNOWN** | ⛔ Single counsel |

> ⛔⛔ **THE ROW ABOVE IS A RECONSTRUCTION, ⛔ NOT A TASK-8 EXECUTION RECORD** ([Decision 2026-08-24-156](../../.decision-log.md#decision-2026-08-24-156) cl.4). ⭐ **It documents that the Task-8 process did ⛔ NOT run in recorded form — ⛔ it does not substitute for it.** The `<PENDING-TASK-8>` template row above is **deliberately preserved unfilled**: the shortlist-and-interview process it describes remains **un-executed on the record**, and ⛔ nothing here should be read as having discharged it ([[feedback_record_unattested_no_backfill]]).
> ⚠ **What that leaves open, stated plainly:** the mandatory shortlist criteria in `counsel-roster.md` — **COI disclosure**, **professional-indemnity insurance**, **Bar Council of India enrollment**, **Indian Trust Act practice**, **no-TSCT-conflict** — are ⛔ **UNVERIFIED**, in both directions. ⛔ Not asserted met; ⛔ not asserted unmet.

---

## §5 Engagement-signature log

**Schema per row:** date | signed engagement letter on file path | NDA signed status + NDA-on-file location | COI disclosure on file status | retainer schedule activated | engagement letter git-SHA at signature | counsel-side acceptance of `review-scope-charter.md`

(Empty at author-commit; populates at Task 9 engagement-letter signature event.)

| Date | Engagement letter on-file path | NDA signed | COI disclosure | Retainer schedule | Engagement letter git-SHA | Counsel acceptance of scope-charter |
|---|---|---|---|---|---|---|
| `<PENDING-TASK-9>` | `<trustee-accessible repo path + counsel-side archive path>` | `signed` + signature date + NDA-on-file path | `disclosed-no-conflicts` OR `disclosed-with-managed-conflicts` (with plan) | `<activated date + retainer amount per `engagement-letter-template.md` §5>` | `<git SHA>` | `accepted` + date OR `accepted-with-amendments` + amendment notes |
| **2026-06-21** ⚠ *(recorded 2026-08-24; ⛔ NOT contemporaneous)* | ⚠ **INTERIM: trustee-owned OneDrive Personal Vault.** ⭐ **DESTINATION: credential-escrow envelope** — `credential-inventory.md` row `legal-instruments-custody`, `pending-task-7-sealing-event`, custodial location per Decision `2026-06-05-018` (physical sealed envelope · joint bank safe deposit / trustee residences). ⛔ **The envelope ID becomes this field's resolvable reference path at sealing.** ⛔ Counsel-side archive path (§14 step 5 wants **both**) still OWED | `signed` asserted 2026-06-21 · **same vault**. ⚠ A2.1 box **unticked**, date only | **`disclosed-no-conflicts`** — ⭐ the **fact** is attested and counsel-signed; the **filing** is asserted 2026-06-21, **same vault**. ⚠ A2.3 box **unticked**, date only | ✅ **Activated 2026-06-21 · ₹2,00,000 per year** (`engagement-letter-template.md` §5) | ⛔ **n/a** — executed off-repo by design; ⛔ no git SHA exists | ✅ **`accepted` 2026-06-21** — counsel accepted `review-scope-charter.md` |

> ⚠ **RECORDED 2026-08-24 per [Decision 2026-08-24-157](../../.decision-log.md#decision-2026-08-24-157) cl.2 — counsel-asserted, ⛔ NOT verified.**
> ⭐ **A correction worth keeping:** the executed engagement letter's **absence from this repo is BY DESIGN** — `engagement-letter-template.md` **§14 step 5** places it in *"secure non-git trustee-accessible storage"*, with only the **reference path + receipt** committed here. ⛔ So its absence is ⛔ **not** evidence against the engagement. ⛔ **What IS missing is the reference path**, which §14 step 5 requires and which this row records as **OWED**.
> ⛔ The `<PENDING-TASK-9>` template row above stays unfilled: the Task-9 signature *event* — Panel chair + ≥1 further trustee + trust-side witness per §14 — is ⛔ **not** recorded as having occurred, and ⛔ counsel was not asked whether it did.
> ⚠ **Two schema fields were never asked on the consent sheet** and are recorded UNKNOWN rather than inferred: **retainer schedule** (§5 pricing) and **counsel acceptance of `review-scope-charter.md`**. ⛔ Not back-filled ([[feedback_record_unattested_no_backfill]]).
> ✅ **SUPPLIED 2026-08-24 — the two fields above are no longer UNKNOWN:** retainer **activated 2026-06-21 at ₹2,00,000/year**, and counsel **`accepted`** the `review-scope-charter.md` on **2026-06-21**. ⛔ The row is updated; this note is kept because it records that they were never *asked*, which is why they were missing.
>
> ⚠⛔ **A STORAGE-POSTURE CONCERN, RECORDED ⛔ NOT RULED.** The three instruments are held in a **trustee's PERSONAL OneDrive Personal Vault**. §14 step 5 requires *"secure non-git **trustee-accessible** storage"* — ⭐ a personal vault is **secure** but is **single-person-controlled**, which is the ⛔ opposite of trust-accessible. ⇒ if that trustee is unavailable, the trust's **engagement letter, NDA and COI disclosure are unreachable** — precisely the failure mode Stories **0.1–0.6** exist to mitigate. ⚠ These are **legal instruments, ⛔ not credentials**, so they fall ⛔ outside `docs/escrow/credential-inventory.md`'s seven PRD §9.1.1 domains and are covered by **no** escrow envelope. ⛔ **Observational — the Panel has ruled nothing here** ([[feedback_gap_analysis_observational]]).
>
> ⚠ **And the locator is still owed.** A named *location* is ⛔ not a **reference path + receipt**: §14 step 5 asks for a resolvable pointer, and *"OneDrive/Personal Vault"* ⛔ does not resolve to a document.
>
> ⭐ **RESOLVED-BY-ROUTE 2026-08-24 — the destination is now recorded, and it ⛔ is not OneDrive.** A
> `legal-instruments-custody` row is minted in `docs/escrow/credential-inventory.md`, modelled on the
> **`dr-runbook-pdf-custody`** precedent — a **document**, ⛔ not a credential, held in a
> credential-escrow envelope per architecture §5.7. Custody terms are already ≥2-trustee ratified at
> Decision **`2026-06-05-018`**. ⇒ **OneDrive is recorded INTERIM**; the escrow envelope is the
> destination, and ⛔ **sealing is what closes this field** — the repo holds ⛔ no payload, only the
> pointer, so the **envelope ID *is* the reference path**.
> ⚠ **Status `pending-task-7-sealing-event`** — the mechanism and location are ratified but sealing
> execution is pending across **21** inventory rows. ⛔ Nothing is sealed today.
> ⚠ **Two needs the escrow does ⛔ NOT serve, recorded so they are not assumed away:** the
> **counsel-side archive** (§14 step 5 wants both copies) and a **working reference copy** — an
> engagement letter is consulted routinely (§4 SLA, §5 pricing, §13 termination) and a sealed vault
> copy ⛔ does not serve that. A **trust-controlled — ⛔ not personal — shared location** should hold
> the working copy.

---

## §6 First-artifact-submission log

**Schema per row:** date | artifact submitted (artifact_id from `review-artifact-roster.md`) | source artifact path | SLA target return date | paging surface used | counsel-side acknowledgment date

(Empty at author-commit; populates at Task 10 first-artifact-submission event per AC-1 "within 2 weeks of signing.")

| Date | artifact_id | source_artifact_path | SLA target return date | Paging surface | Counsel ack date |
|---|---|---|---|---|---|
| `<PENDING-TASK-10>` | `epic-2-tc-draft-v1` | `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md §FR-94 + Niyamavali reference` | `<submission_date + 5-10 biz days per `engagement-letter-template.md` §4>` | `<counsel-side encrypted document exchange per deferred ADR `adr-index.md` Section K row #2>` | `<counsel ack date — within 2 biz hours per `engagement-letter-template.md` §11>` |
| **2026-06-21 or earlier** ⚠ *(RECONSTRUCTED)* | ⛔ **UNREGISTERED** — the edge/WAF review predates `review-artifact-roster.md` having a row for it | `docs/adr/ADR-0010-edge-waf-cloudflare-turnstile.md` (the design as recorded) | ⛔ **UNKNOWN** | ⛔ **UNKNOWN** | ⛔ **UNKNOWN** |

> ⚠ **RECONSTRUCTED 2026-08-24** (`2026-08-24-156` cl.4). ⭐ **The submission side of counsel act #1 was never captured** — only its *return* is on record (`2026-06-21-057`). ⛔ Submission date, SLA target, paging surface and acknowledgment are **all unknown and are ⛔ not inferred** from the return date. ⛔ The `<PENDING-TASK-10>` row above stays unfilled: the Epic 2 T&C first-artifact submission it describes has ⛔ still not happened.
> ⛔⛔ **AND NOW THE CLOCK IS COMPUTABLE — AC-1's FIRST-ARTIFACT DEADLINE IS ⛔ 50 DAYS BREACHED.**
> `README.md:39` commits it as a **structural property**: *"First-artifact-submission within 2 weeks
> of signing is a structural property. AC-1 commits this as a deadline."* ⇒ signing **2026-06-21**
> ⇒ first artifact due **2026-07-05**. ⚠ Today is **2026-08-24** and **⛔ nothing has been
> submitted** — this log's only real row is the *reconstructed* edge review, whose submission side
> was never captured.
> ⭐ **This is a TRUST-SIDE lapse, ⛔ not a counsel SLA breach** — counsel cannot return an artifact
> he was never sent, so it is recorded **here** and ⛔ **not** in §8 SLA-breach-tracking.
> ⚠⛔ **AND IT IS THE SAME DOCUMENT AS THE A3.3 PROBLEM.** The overdue priority-1 artifact is the
> **Epic 2 T&C draft** — ⭐ the very document counsel cited as the *basis* for clearing the three
> Epic 11b surfaces (`2026-08-24-157` cl.3). ⇒ **counsel grounded a clearance in a document the trust
> owed him 50 days ago and ⛔ never sent.**
> ⛔ Recorded, ⛔ not actioned — surfacing it is this ledger's job; scheduling it is not.
>
> ⭐⭐ **ROOT CAUSE FOUND 2026-08-24, AND IT IS ⛔ NOT A SCHEDULING FAILURE: THE ARTEFACT DID NOT
> EXIST.** Story 2.6 shipped the T&C **registry** (versions table, pinned-clause junction,
> `body_html_rendered`, RLS, public render at `apps/public/src/pages/terms.astro`) — but
> `body_markdown` is *"canonical T&C content **authored by the trustee**"*, and ⛔ **no T&C prose was
> ever authored.** Verified: the only T&C-adjacent prose in the entire repo is the tagline in
> `packages/i18n/locales/hi/contribution.json`. ⇒ ⛔ **there was nothing to submit**, and ⛔ no amount
> of submission coordination would have discharged this.
> ⭐ **A v0.1 draft is authored 2026-08-24** —
> `docs/legal-counsel-engagement/handover/TWT-Terms-and-Conditions-DRAFT-v0.1-for-counsel-review.docx`,
> assembled **strictly** from committed sources (FR-94's seven verbatim phrasings, the posture FRs,
> §4.14.1) with ⛔ **no originated legal drafting**, carrying a **7-question counsel annex**.
> ⛔ **THE SUBMISSION ITSELF HAS ⛔ NOT HAPPENED** and this log is ⛔ not flipped: the
> review-artifact-roster reserves submission to *"Solo Builder + Trustee Panel … outside the
> dev-story scope"*. ⚠ **Authoring and submitting are different acts**; ⛔ only the first is done.
>
> ⛔⛔ **Counsel act #2 (2026-08-24, full-name publication) is ⛔ ABSENT from this section BY CONSTRUCTION** — it was a **verbal consultation**, ⛔ not an artifact submission. ⛔ There is nothing to log here, and ⛔ inventing a row would assert a submission that never occurred.

---

## §7 Return-receipt log

**Schema per row:** date | artifact_id | substantive return summary link | integration target Story | integration status | gap-list from review | remediation plan per gap

(Empty at author-commit; populates at Task 11 per-return event.)

| Date | artifact_id | return_summary_link | integration_target_story | integration_status | Gap list | Remediation plan |
|---|---|---|---|---|---|---|
| `<PENDING-TASK-11>` | `<artifact_id from review-artifact-roster.md>` | `per-artifact-return-roster.md#<artifact_id>` | `<owning Story per review-artifact-roster.md>` | `returned-pending-integration` → `integrated-into-Story-X` | `<gap list per return>` | `<remediation plan + responsible owner + target date>` |
| **2026-06-21** ⚠ *(RECONSTRUCTED)* | ⛔ unregistered — edge/WAF design review | [Decision 2026-06-21-057](../../.decision-log.md#decision-2026-06-21-057) cl.1 — *"Cloudflare acceptable as designed"* ⚠ **the decision log is the return record; ⛔ there is no `per-artifact-return-roster.md` row** | Story 1.13 / ADR-0010 | `integrated` — ADR-0010 §6 `OPEN → CLEARED`; roster **Row 3** `closed` | ⛔ **No gaps recorded** | ⛔ n/a. ⚠ **Standing condition:** `-057` cl.5 — a material change to the edge data-flow **re-opens** the review |

> ⚠ **RECONSTRUCTED 2026-08-24** (`2026-08-24-156` cl.4) — ⛔ this section did not capture the one return this engagement has produced.
>
> ⛔⛔ **COUNSEL ACT #2 (2026-08-24 — full-name publication, all four public surfaces) IS ⛔ DELIBERATELY ⛔ NOT LOGGED HERE, AND ITS ABSENCE IS THE POINT.** §7 records **returns**; a return requires a **returned artifact**. Act #2 was **verbal, relayed by a trustee, with ⛔ no written artifact** — so ⛔ it does not qualify, and `2026-08-24-156` cl.1(b) forbids citing it as a §7 entry. ⭐ It is recorded instead at `counsel-roster.md` **§ Reconstructed engagement record**, act #2, and in `-156` cl.1.
> ⚠ **This is the asymmetry worth seeing:** the clearance that authorised **publishing real members' full legal names to the open internet** (`-156` cl.2) is the one that ⛔ **cannot be entered in the return-receipt log** — ⛔ because nothing was returned. ⇒ `-156` open follow-up: **obtain it in writing.**

---

## §8 SLA-breach-tracking log

**Schema per row:** date | artifact_id | breach_type (acknowledgment_sla_breach / first_review_sla_breach) | expected return date | actual return date OR non-return status | breach class (minor / material / repeated) | counsel-side root cause | escalation outcome | ≥3-breaches-in-quarter trigger (Yes/No)

(Empty at author-commit; populates if SLA breaches occur per `engagement-letter-template.md` §11.)

| Date | artifact_id | Breach type | Expected return date | Actual return date | Breach class | Root cause | Escalation outcome | ≥3-in-quarter trigger |
|---|---|---|---|---|---|---|---|---|
| (none at author-commit) | — | — | — | — | — | — | — | — |

**Breach-type thresholds:** `acknowledgment_sla_breach` — ≥3 in a month escalates to Counsel-side senior oversight (per `engagement-letter-template.md` §11); `first_review_sla_breach` — ≥3 in a quarter triggers mandatory Trustee Panel review per `engagement-letter-template.md` §11 + `engagement-ledger.md` §9 Periodic re-attestation log; review outcome may include engagement-letter amendment (e.g., SLA adjustment + pricing-structure renegotiation) or trustee-initiated termination per `engagement-letter-template.md` §13.

---

## §9 Periodic re-attestation log

**Schema per row:** date | re-attestation cadence (quarterly / annual / per-major-architecture-amendment / on-counsel-event / pre-launch-checkpoint) | reviewed scope | outcome | next re-attestation date

(Empty at author-commit; populates at quarterly engagement-health review cadence + annual term renewal + per-major-architecture-amendment + per-counsel-event + pre-launch-checkpoint events.)

| Date | Cadence | Reviewed scope | Outcome | Next re-attestation date |
|---|---|---|---|---|
| `<PENDING — first quarterly review at engagement-signature + 3 months>` | `quarterly` | engagement-health: SLA-breach-tracking + practice-area-coverage gaps + ongoing-disclosure COI events + Trustee Panel satisfaction | `<TBD>` | `<engagement-signature + 6 months>` |
| `<PENDING — first annual review at engagement-signature + 10 months>` | `annual` | `engagement-letter-template.md` §8 auto-renewal trigger; counsel + Trustee Panel re-confirm engagement (scheduled at +10 months to preserve the 60-day termination-notice window before auto-renewal fires at +12 months per `engagement-letter-template.md` §8) | `<auto-renew OR amend OR terminate>` | `<TBD>` |
| `<PENDING — per-major-architecture-amendment event>` | `per-major-architecture-amendment` | new scope items + new regulatory regime + architecture line-count delta in legal-counsel-touching sections | `<scope amendment + counsel re-acceptance>` | `<TBD>` |
| `<PENDING — per-counsel-event>` | `on-counsel-event` | significant counsel-event post-mortem (e.g., COI emergence, SLA-breach escalation, practice-area gap surfacing) | `<post-mortem outcome + amendment or substitute-counsel engagement>` | `<TBD>` |
| `<PENDING — per pre-launch-checkpoint per `review-scope-charter.md` §6>` | `pre-launch-checkpoint` | per checkpoint scope + counsel attendance + outcome | `<checkpoint outcome>` | `<next checkpoint>` |

---

## §10 Pack-revision log

**Schema per row:** date | revised document | revision summary | rationale | supersession-marker | trustee co-sign

(Empty at author-commit; populates as framework documents undergo revisions per ratified amendments.)

| Date | Revised document | Revision summary | Rationale | Supersession-marker | Trustee co-sign |
|---|---|---|---|---|---|
| 2026-06-02 | All framework docs at `docs/legal-counsel-engagement/` | Initial author-commit per Story 0.13 Tasks 1-6 | Story 0.13 framework scaffolding per Decision 2026-06-02-013 | `Decision 2026-06-02-013` | Solo Builder author-commit; ≥2-trustee ratification pending at Task 7 |
| `<PENDING-future revisions>` | `<doc>` | `<summary>` | `<rationale>` | `<supersession-marker>` | `<≥2 trustees>` |

---

## §11 Cross-links to related framework ledgers

| Related framework ledger | Path | Cross-link rationale |
|---|---|---|
| Operational-readiness-ledger | `docs/runbooks/operational-readiness-ledger.md` | Cross-references Story 0.1 + 0.13 framework coverage section per Task 6 narrow edit |
| Escrow-ledger | `docs/escrow/` (sealing-procedure.md + credential-inventory.md) | Cross-references Story 0.2 DPO-breach-reporting envelope + sealing-procedure legal-counsel escalation |
| Code-escrow-ledger | `docs/escrow/code-escrow/code-escrow-ledger.md` | Cross-references Story 0.3 restoration-procedure legal-counsel escalation |
| Degradation-policy-ledger | `docs/degradation-policy/degradation-policy-ledger.md` | Cross-references Story 0.4 Legal-counsel revision log — per-template counsel returns logged here (Stories 0.4 + 0.13 cross-coupling) |
| KT-pack-ledger | `docs/knowledge-transfer/kt-pack-ledger.md` | Cross-references Story 0.5 ADR slot population events + dependency inventory Section E regulatory rows |
| Backup-engineer-ledger | `docs/backup-engineer/backup-engineer-ledger.md` | Cross-references Story 0.6 Contract-signature log per Story 0.13 Task 9 + Story 0.6 Task 9 counsel return |
| Fallback-handler-ledger | `docs/fallback-handler-ledger/ledger.md` | Cross-references Story 0.7 denial-appeal node + Story 0.13 procedural-fairness review |
| Spec-to-cadence-reconciliation framework | `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` + `backfill-log.md` | Cross-references Story 0.12 contract-help-path budget substantive resolution at Story 0.13 Task 9 engagement-signature event |

---

### §11a Open-questions ledger

(Cross-reference target for non-blocking open questions per AC-2): per-artifact `return_open_questions` field cross-references entries here. Open questions are logged per artifact_id + scope-area + date + counsel-noted resolution path; non-blocking open questions are tracked as ongoing dependencies per AC-2 "remaining feedback is tracked as ongoing dependencies, not blockers on demoable closure."

| Date | artifact_id | Open question summary | Resolution path | Status |
|---|---|---|---|---|
| (none at author-commit) | — | — | — | — |
| `<PENDING-TASK-11>` | `<artifact_id>` | `<open question summary per counsel return>` | `<resolution path per counsel guidance>` | `open` / `tracking` / `resolved` |
