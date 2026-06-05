# Phase-0 Trustee Questionnaire — Path to P0 Closure

**Prepared:** 2026-06-04
**Audience:** Trustee Panel (≥2 trustees required to ratify)
**Purpose:** Consolidated decision pack to close out Phase-0 (Stories 0.1, 0.2, 0.3, 0.12; residual 0.15 items piggyback on 0.12 Task 9).
**Instructions:** Tick one option per question, or annotate with "Other: …" / "Defer to: …". Where a question requires both trustees, both initial.

---

## Story 0.12 — Spec-to-Cadence Reality Check (review → done)

> Closest to closure. Ratifying these unblocks Tasks 9–11 and AR-49 P0-3 discharge.

### Q12.1 — Ratify the no-trigger finding

The estimation worksheet produced `ceiling_ratio = 1.497` (just under the 1.5× reconciliation threshold). Per the more-protective-governs rule, mismatch did **not** trigger reconciliation.

**Do you accept the no-trigger finding?**
- [x] (a) Yes — ratify as is; no cut-scope / no move-SM-1 / no contract-help required; sprint-plan stands
- [ ] (b) Yes with reservation — ratify but require periodic re-attestation < 6 months given the 0.003 margin from threshold
- [ ] (c) No — request reconciliation despite ratio under threshold. Path: [ ] cut-scope [ ] move-SM-1 [ ] contract-help
- [ ] (d) Other: __________________________________________

### Q12.2 — Ratify Epic 4 medium-band reassignment

Epic 4 (Niyamavali Rules Engine) was reassigned from `low` to `medium` confidence band per `per-epic-aggregation-estimates/epic-4.md §6` (§3-amendment AI-cadence rationale).

**Do you ratify the Epic 4 medium-band assignment?**
- [x] (a) Yes — accept as recorded
- [ ] (b) No — keep at `low` (rules engine is unbuilt substrate). Triggers re-computation; likely flips trigger
- [ ] (c) Other: __________________________________________

### Q12.3 — Ratify Epic 12 medium-band reassignment

Epic 12 (FR-43A external forum) was reassigned from `low` to `medium` per `per-epic-aggregation-estimates/epic-12.md §6` (FR-43A AI-cadence offset rationale).

**Do you ratify the Epic 12 medium-band assignment?**
- [x] (a) Yes — accept as recorded
- [ ] (b) No — keep at `low` (FR-43A external forum unratified at Story 0.15 time). Triggers re-computation
- [ ] (c) Other: __________________________________________

### Q12.4 — Co-sign the 25 → 80 hr/week cadence override

Decision 2026-06-04-016 supersedes the methodology §2 row 2 from 25 hr/week solo-cadence to 80 hr/week AI-cadence (1 AI-cadence month = 346 hr). This is the **single most load-bearing variable** in the no-trigger finding — at 25 hr/week the ratio shifts substantially.

**Do you both co-sign the cadence override?**
- [x] (a) Yes — both trustees co-sign; new methodology baseline locks in
- [ ] (b) Yes with time-box — co-sign but require monthly re-attestation of actual delivered hours vs assumed
- [ ] (c) No — revert to 25 hr/week solo cadence. Reconciliation almost certainly triggers; Tasks 9–11 re-cycle
- [ ] (d) Other: __________________________________________

**Trustee 1 initial:** ____  **Trustee 2 initial:** ____

### Q12.5 — Confirm Task 8 deadline 2026-07-01

Per Decision D-03 a Task 8 completion deadline of 2026-07-01 was added to `target-date-rationale-template §0` + `engagement-ledger §3`.

**Confirm the 2026-07-01 deadline?**
- [x] (a) Yes — accept
- [ ] (b) No — propose alternate date: __________
- [ ] (c) Other: __________________________________________

### Q12.6 — Threshold-proximity carve-out deferral (W-02)

The 0.003 margin below the 1.5× threshold raised a "what if a re-estimate nudges over" concern. Decision was to defer authoring the §1.bis proximity carve-out to Month-3 re-attestation.

**Accept the deferral?**
- [x] (a) Yes — defer; revisit at Month-3 re-attestation
- [ ] (b) No — require §1.bis carve-out be authored before AC-1 closure (blocks Task 9)
- [ ] (c) Other: __________________________________________

### Q12.7 — Story 0.15 Rows 1 + 2 re-opening

Story 0.15 code-review D-01 reopened Rows 1 + 2 from `closed` to `in-progress` pending the same Task 9 ratification event. They close when Q12.1–Q12.4 above are signed off.

**Confirm you understand Rows 1 + 2 of Story 0.15's launch-gate inventory close concurrently with Q12.1–Q12.4 ratification?**
- [x] (a) Yes — acknowledged; no separate Story 0.15 event required
- [ ] (b) No — request separate review session for 0.15 Rows 1 + 2

---

## Story 0.1 — Operational Runbooks Authored & Trustee-Signed (in-progress)

### Q1.1 — Per-runbook sign-off readiness

Seven runbooks at `docs/runbooks/` awaiting ≥2-trustee sign-off recorded in `operational-readiness-ledger.md`:

1. `deploy.md`
2. `rollback.md`
3. `secret-rotation.md`
4. `audit-log-integrity-verification.md`
5. `reconciliation-manual-intervention.md`
6. `rbac-seed-reset.md`
7. `multi-pariwar-provisioning.md`

**Are you ready to review and sign each runbook?**
- [x] (a) Yes — proceed; ≥2-trustee sign-offs per runbook (14 signature events total)
- [ ] (b) Partial — sign N of 7 now; defer the rest. Sign now: ________________________. Gating concern on deferred: __________
- [ ] (c) Not yet — gating concern: __________________________________________

### Q1.2 — "Trustee-accessible repo" definition (OQ 2)

AC-2 commits the sign-off ledger to a "trustee-accessible repo." Two interpretations are open.

**Is the primary git repo (with Story 0.3 mirror, once live) acceptable as "trustee-accessible"?**
- [x] (a) Yes — primary repo + Story 0.3 mirror satisfies; no separate viewing surface needed
- [ ] (b) No — require separate trustee-only viewing surface. Specify: __________
- [ ] (c) Other: __________________________________________

### Q1.3 — AC-4 substitute engineer authorization (OQ 3)

AC-4 requires a **non-Solo-Builder engineer** to execute each runbook under bus-factor simulation. Story 0.6 backup engineer is the canonical executor but is `in-progress`. A trustee-approved substitute can provide table-top closure (provisional), with Story 0.6 closing full validation later.

**Authorize a table-top substitute engineer for AC-4 provisional closure?**
- [x] (a) Yes — authorize substitute. Identity to be nominated by Trustee Panel before execution. 
- [ ] (b) No — wait for Story 0.6 backup engineer; AC-4 stays open; Phase-0 closes "provisionally" on Story 0.1
- [ ] (c) Other: __________________________________________

> **Important:** Story 0.1 explicitly states substitute solicitation is owned by Trustee Panel (not Solo Builder), since the bus-factor simulation needs Solo Builder to be silent.

### Q1.4 — Runbook re-sign threshold (OQ 5)

AC-3 sets the re-sign threshold for runbook edits as: ≥1 trustee for minor edits; ≥2 trustees for rollback procedure or contact escalation changes; higher governs on mixed edits.

**Confirm the threshold scheme?**
- [x] (a) Yes — as drafted
- [ ] (b) Revise — proposed: __________________________________________

### Q1.5 — §5.15 broader inventory ownership (OQ 1)

Architecture §5.15 names 9 runbooks at v1; Story 0.1 owns 7. The remaining 2 are candidate-mapped:
- **Cycle-freeze operational procedure** → Epic 7 Story 7.3 (candidate)
- **Helpline operator escalation procedure** → Epic 10 Story 10.3 (candidate)

**Accept candidate ownership assignments?**
- [x] (a) Yes — Story 7.3 owns cycle-freeze; Story 10.3 owns helpline escalation
- [ ] (b) No — create dedicated follow-on stories. New story names: __________
- [ ] (c) Other: __________________________________________

---

## Story 0.2 — Credential Escrow with Trustee Quorum (in-progress)

### Q2.1 — Sealing mechanism selection (Task 6)

Candidates (operational characteristics differ on rotation cadence, dry-run repeatability, geographic resilience, §2.10a separability):

- **(a) Physical sealed envelopes** in joint bank safe deposit box
- **(b) GPG-encrypted-to-N-recipients** (cryptographic; N selected with emergency recovery threshold)
- **(c) Shamir's Secret Sharing** with M-of-N share distribution to trustees + custodial backup
- **(d) Password manager emergency-kit** (e.g., 1Password Emergency Kit multi-party recovery)
- **(e) Hybrid** (physical envelope holding decryption keys for software vault)

**Select sealing mechanism (one):**
- [x] (a) Physical envelopes + bank safe deposit
- [ ] (b) GPG-to-N-recipients
- [ ] (c) Shamir's Secret Sharing
- [ ] (d) Password manager emergency kit
- [ ] (e) Hybrid
- [ ] (f) Other: __________________________________________

### Q2.2 — Custodial location selection (Task 6)

Constraint: must preserve §2.10a property (audit-mirror credentials in structurally distinct custodial path).

**Select custodial location(s) — multiple may apply:**
- [x] (a) Trustee residences (multi-geographic distribution)
- [x] (b) Bank safe deposit boxes (≥2, geographically separated)
- [ ] (c) Notary/lawyer-held escrow (potentially the same legal counsel engaged under Story 0.13)
- [ ] (d) Hybrid: __________________________________________
- [ ] (e) Other: __________________________________________

### Q2.3 — §2.10a audit independence separation control (Task 6 + OQ 6)

The audit-mirror credentials MUST be sealed under a structurally distinct envelope class so that opening prod envelopes does not transitively grant audit-mirror access. Candidate mechanisms:

- **(a) Strict disjoint trustee subsets** (e.g., 2-of-3 prod + 2-of-3 audit with no shared trustees → requires ≥6 unique trustees)
- **(b) Constrained-overlap disjoint** (one shared trustee allowed → ≥4 trustees)
- **(c) Separate sealing mechanism per class** (e.g., prod = GPG; audit = physical)
- **(d) Separate custodial path per class** (e.g., prod = trustee residences; audit = lawyer escrow)
- **(e) Hybrid**

**Select control:**
- [ ] (a) Strict disjoint (requires ≥6 trustees — confirm in Q2.7)
- [ ] (b) Constrained-overlap disjoint (requires ≥4 — confirm in Q2.7)
- [ ] (c) Separate mechanism per class
- [x] (d) Separate custodial path per class
- [ ] (e) Hybrid: __________________________________________

### Q2.4 — Dry-run scope amendment (review decision D-04)

AC-2 originally required one dry-run on any non-load-bearing credential. Code review recommended amending to one dry-run **per envelope class** (prod, audit-mirror, high-sensitivity).

**Confirm AC-2 dry-run-per-envelope-class amendment?**
- [x] (a) Yes — one rehearsal per envelope class (3 total). Full closure deferred to Stories 1.10 + 0.6 for audit-mirror + high-sensitivity classes
- [ ] (b) No — revert to single dry-run on any envelope class
- [ ] (c) Other: __________________________________________

### Q2.5 — Audit-mirror envelope deferral (OQ 4)

The audit-mirror credential does not exist until Story 1.10 lands the tamper-evident audit-log chain.

**Accept deferral of audit-mirror envelope instantiation until Story 1.10 closes?**
- [x] (a) Yes — framework accepts deferral; placeholder row in inventory tracks the gap
- [ ] (b) No — accelerate audit-mirror envelope creation. Path: __________
- [ ] (c) Other: __________________________________________

### Q2.6 — High-sensitivity tier ↔ §5.9 alignment (OQ 5)

Architecture §5.9 commits two-person Terraform-mediated approval for operational **rotation** of high-sensitivity credentials. The escrow framework commits ≥2-trustee quorum for **opening**. Different actors (operational engineers vs trustees) for related properties.

**Reconcile the two pathways in the ADR?**
- [x] (a) Yes — explicit reconciliation section in the credential-escrow-mechanism ADR
- [ ] (b) No — treat as independent surfaces
- [ ] (c) Other: __________________________________________

### Q2.7 — Trustee headcount confirmation (OQ 6)

PRD §11 commits ≥3 trustees as the statutory minimum. The §2.10a control choice (Q2.3) may require more.

**Current Trustee Panel headcount: ____3____ trustees**

- [ ] (a) ≥6 — supports strict disjoint (Q2.3 option a)
- [ ] (b) =4 or 5 — supports constrained-overlap disjoint (Q2.3 option b)
- [x] (c) =3 — must fall back to Q2.3 option (c), (d), or (e) — disjoint subsets unworkable

### Q2.8 — Bus-factor table-top execution (AC-3, Task 9)

**When ready, who participates in the bus-factor table-top exercise?**
- [ ] (a) ≥2 trustees execute quorum-open procedure with Solo Builder silent
- [x] (b) ≥2 trustees + table-top substitute engineer (from Q1.3)
- [ ] (c) Defer until Story 0.6 backup engineer contracted; AC-3 closes "provisional"
- [ ] (d) Other: __________________________________________

---

## Story 0.3 — Code Escrow Auto-Mirror Pipeline (in-progress)

### Q3.1 — Mirror destination selection (Task 7)

Candidates (operational characteristics differ on 10-min SLA, credential rotation interface, geographic resilience, trustee-admin posture):

- **(a) GitLab.com** under trustee-owned foundation account — SaaS reliability; cross-cloud independent of `asia-south1`
- **(b) Codeberg** (community Gitea) — strong governance independence; smaller scale
- **(c) Self-hosted Gitea** on trustee-controlled VPS (Hetzner, etc.) — maximum control; maximum ops burden
- **(d) Bitbucket** foundation account — SaaS reliability; less common in OSS
- **(e) Dual-mirror** (e.g., GitLab.com + Codeberg) — hedges destination-platform risk; double secret-wiring

> **Geographic constraint:** must be different region/cloud than primary GitHub + GCP `asia-south1`.

**Select mirror destination:**
- [x] (a) GitLab.com
- [ ] (b) Codeberg
- [ ] (c) Self-hosted Gitea — host/region: __________
- [ ] (d) Bitbucket
- [ ] (e) Dual-mirror: __________ + __________
- [ ] (f) Other: __________________________________________

### Q3.2 — Mirror-push credential model (Task 7)

Candidates:

- **(i) GitHub Actions secret + per-destination SSH deploy key** (push-only scope)
- **(ii) Per-destination OAuth token** with `repo:write` scope
- **(iii) Platform-native push-mirror feature** (e.g., GitLab built-in mirror — pull-from-primary semantics may not satisfy AC-1's push-to-mirror; verify)
- **(iv) Workload identity federation analog** (uncommon at mirror destinations)

**Select credential model:**
- [x] (i) Deploy key
- [ ] (ii) OAuth token
- [ ] (iii) Platform-native push-mirror
- [ ] (iv) WIF analog
- [ ] (v) Other: __________________________________________

### Q3.3 — ADR directory scaffolding (OQ 2)

Story 0.2 deferred `docs/adr/` scaffolding to a future story. Story 0.3 Task 7 ADR needs a home.

**Does Story 0.3 Task 7 scaffold `docs/adr/`?**
- [x] (a) Yes — scaffold in Story 0.3 (template + index + first ADR all in one event)
- [ ] (b) No — defer to Story 0.15 architectural launch-gate inventory
- [ ] (c) Other: __________________________________________

### Q3.4 — Release-branch set finalization (OQ 1)

Workflow currently mirrors only `main` (placeholder). Story 1.1 will commit the branching model and may require amendment.

**Expected branching model when Story 1.1 lands:**
- [ ] (a) Trunk-based — `main` only (no change)
- [x] (b) Release-cuts — `main` + `release/*` patterns
- [ ] (c) Tag-based — `main` + tag triggers
- [ ] (d) Other: __________________________________________

### Q3.5 — Mirror-destination branch protection (OQ 6)

**Enforce branch protection at mirror?**
- [x] (a) Yes — require no-force-push; signed commits; ≥1 trustee approval (adds Task 7 complexity; not all destinations support it equally)
- [ ] (b) No — write-trusting-on-credential. Residual risk: a leaked `MIRROR_PUSH_CREDENTIAL` can rewrite mirror history
- [ ] (c) Other: __________________________________________

### Q3.6 — Mirror-push credential rotation cadence (OQ 5)

**Rotation cadence for `MIRROR_PUSH_CREDENTIAL`?**
- [x] (a) Annual
- [ ] (b) On mirror-destination policy change only
- [ ] (c) On suspected compromise only
- [ ] (d) Quarterly
- [ ] (e) Other: __________________________________________

### Q3.7 — Workflow-failure alerting wiring (OQ 4)

The mirror workflow emits failure records but does **not** page on-call. The 10-min AC-1 SLA cannot be enforced without active monitoring.

**Wire workflow-failure alerting now or defer?**
- [ ] (a) Wire now to Cloud Monitoring (out-of-scope edit; needs new story)
- [ ] (b) Defer to Epic 5 alert engine
- [x] (c) Defer to Epic 1 Story 1.16x CI governance
- [ ] (d) Other: __________________________________________

### Q3.8 — Restoration drill executor (Task 10)

**Accept Solo Builder as executor for the first restoration drill (provisional closure), with Story 0.6 backup engineer for full closure?**
- [x] (a) Yes — Solo Builder provisional; Story 0.6 full closure
- [ ] (b) No — wait for Story 0.6 contracted backup engineer
- [ ] (c) Other: __________________________________________

### Q3.9 — Bus-factor switch-to-mirror executor (Task 11)

**Same path for switch-to-mirror exercise?**
- [x] (a) Yes — substitute path with Solo Builder silent; Story 0.6 backup engineer for full closure
- [ ] (b) No — wait for Story 0.6
- [ ] (c) Other: __________________________________________

---

## Cross-Story Questions

### QX.1 — Story 0.6 backup engineer urgency

Story 0.1 AC-4, Story 0.2 AC-3, Story 0.3 AC-2, and the PRD §9.1.1 "30-day takeover" property all gate on Story 0.6's backup engineer contract. Story 0.6 is `done` per sprint-status but the contracted engineer's first table-top execution is what flips the four `provisional` closures to `full`.

**Prioritize the Story 0.6 backup engineer's first table-top execution for next phase?**
- [x] (a) Yes — full closure depends on this; schedule immediately after Phase-0 trustee sign-offs land
- [ ] (b) Accept all P0 stories at provisional closure with explicit deferral; sequence 0.6 first table-top after Phase-0
- [ ] (c) Other: __________________________________________

### QX.2 — Phase-0 closure language

> Per `[[feedback_closure_language_precision]]`: distinguish "Closed by [edit]" vs "Resolved via explicit deferral" — never collapse.

**On what terms does Phase-0 close?**
- [ ] (a) **Fully closed** — all stories reach `done`. Requires Story 0.6 backup-engineer table-top execution + Stories 1.10 / 1.5 closures for audit-mirror + high-sensitivity dry-runs. Realistic in Epic 1 timeframe, not now
- [x] (b) **Provisionally closed** — substitute paths accepted; full closure deferred per deferred-work.md. Phase-0 prereq-gate fires; Epic 1 substrate work unblocked
- [ ] (c) Other: __________________________________________

### QX.3 — Trustee ratification mechanics

Where do the ratified answers get recorded canonically?

**Recording mechanism:**
- [x] (a) Each trustee adds initials + date inline in this document; document committed to repo; cross-referenced from `.decision-log.md` Decisions 2026-XX-XX (one per story)
- [ ] (b) Trustee returns signed PDF + Solo Builder transcribes ratifications into `.decision-log.md`
- [ ] (c) Live session with synchronous decision-log entry per question
- [ ] (d) Other: __________________________________________

---

## Sign-off Block

**Trustee 1**
- Name: ____Dhiraj Rahul______________________________________
- Date: __04-06-2026__________
- Initials confirming Q12.4 cadence co-sign (load-bearing): __dr__

**Trustee 2**
- Name: ___________Kalpana Bharti______________________________
- Date: _____04-06-2026_______
- Initials confirming Q12.4 cadence co-sign (load-bearing): __kp__

**Solo Builder acknowledgment** (transcription into `.decision-log.md`)
- Date: ____04-06-2026________
- Decisions appended: 2026-XX-XX-___ (Story 0.12 supersession), 2026-XX-XX-___ (Story 0.1), 2026-XX-XX-___ (Story 0.2), 2026-XX-XX-___ (Story 0.3)

---

## Appendix — How answers map to story closure

| Question(s) | Story | Closes |
|---|---|---|
| Q12.1–Q12.4 | 0.12 | Task 9 ratification → Tasks 10–11 unblocked → AR-49 P0-3 discharged |
| Q12.5 | 0.12 | Task 8 deadline confirmed |
| Q12.6 | 0.12 | W-02 deferral committed |
| Q12.7 | 0.15 | Rows 1 + 2 close concurrently |
| Q1.1 | 0.1 | Task 4 sign-offs land in ledger |
| Q1.2 | 0.1 | AC-2 trustee-accessible property satisfied |
| Q1.3 | 0.1 | Task 5 AC-4 executor path authorized |
| Q1.4 | 0.1 | AC-3 re-sign threshold confirmed |
| Q1.5 | 0.1 | OQ 1 inventory ownership closed |
| Q2.1 + Q2.2 + Q2.3 | 0.2 | Task 6 mechanism + custodial + §2.10a control → ADR authorable |
| Q2.4 | 0.2 | AC-2 amendment locked |
| Q2.5 + Q2.6 + Q2.7 | 0.2 | OQs 4, 5, 6 closed |
| Q2.8 | 0.2 | Task 9 table-top scheduled |
| Q3.1 + Q3.2 | 0.3 | Task 7 destination + credential model selected → ADR authorable → Tasks 8–11 unblocked |
| Q3.3 | 0.3 | ADR scaffolding home settled |
| Q3.4 + Q3.5 + Q3.6 + Q3.7 | 0.3 | OQs 1, 4, 5, 6 closed |
| Q3.8 + Q3.9 | 0.3 | Tasks 10 + 11 executor paths authorized |
| QX.1 + QX.2 + QX.3 | All | Phase-0 closure semantics + recording mechanics confirmed |

---

**End of original questionnaire.** Total: 7 (0.12) + 5 (0.1) + 8 (0.2) + 9 (0.3) + 3 (cross-story) = **32 questions**.

**Most load-bearing:** Q12.4 (cadence override) — if rejected, Tasks 9–11 re-cycle and Phase-0 closure slips.

> ⚠️ **Trustee initials for Q12.4 still blank.** Co-sign requires both trustees to initial the cadence override. Please initial before `.decision-log.md` transcription.

---

# ADDENDUM — Trustee questions for "done" stories 0.4 / 0.5 / 0.6 / 0.7 / 0.13 / 0.14 / 0.15

**Why an addendum?** Stories 0.4–0.7, 0.13–0.15 are marked `done` in `sprint-status.yaml`, but per the closure-language-precision discipline that's "Closed by [author-commit framework]" — Tasks 7+ in each are parked at `_AWAITING EXTERNAL ACTION_` because they need trustee ratification, named-engineer selection, legal-counsel return, or substantive content the dev agent cannot author.

**Per QX.2 — Provisionally closed:** items below split into:
- 🔵 **NOW** — trustee decision needed for provisional Phase-0 closure (gates downstream Tasks)
- 🟡 **DEFER** — operational execution flows after the NOW decision lands; recorded for visibility, not for sign-off today

**Total addendum:** 7 stories × 2–6 questions = **28 questions**, mostly mode/path selections.

---

## Story 0.4 — Per-Surface Degradation Policy (done; Tasks 7–9 awaiting)

### Q4.1 🔵 — Per-surface stance + comms-template sign-off mode (Task 7)
Ratification mode for the surface-inventory + comms-templates + table-top-exercise runbook:
- [x] (a) Pack-as-a-unit (single ledger entry; default per README §5)
- [ ] (b) Per-surface (individual ratification per surface row; slower)
- [ ] (c) Other: __________________________________________

### Q4.2 🔵 — PENDING LEGAL REVIEW conditional acknowledgment (Task 7)
Comms templates carry "PENDING LEGAL REVIEW" markers until Story 0.13 returns. Ratification is **conditional on the marker being preserved** until then.

**Acknowledge conditional-ratification rule?**
- [x] (a) Yes — ratify conditionally; marker preserved until 0.13 closure
- [ ] (b) No — require Story 0.13 closure before ratifying any comms template (blocks Task 7)
- [ ] (c) Other: __________________________________________

### Q4.3 🟡 — Table-top exercise facilitator (Task 8)
- [x] (a) Story 0.6 backup engineer (preferred under bus-factor)
- [ ] (b) Trustee-authorized substitute (per Q1.3 substitute engineer)
- [ ] (c) Solo Builder fallback
- [ ] (d) Other: __________________________________________

---

## Story 0.5 — Knowledge Transfer Documentation Pack (done; Tasks 8–10 awaiting)

### Q5.1 🔵 — KT pack sign-off mode (Task 8)
Ratification of seven component files + ledger + answer key + ADR scaffold:
- [x] (a) Pack-as-a-unit (default)
- [ ] (b) Per-component (slower; per-file ratification)
- [ ] (c) Other: __________________________________________

### Q5.2 🟡 — Comprehension administration sequencing (Task 9)
Cold-read administration to the backup engineer requires Story 0.6 Task 10 (named engineer contracted + onboarded).

**Sequencing:**
- [x] (a) Wait for Story 0.6 contracted engineer (full closure path)
- [ ] (b) Provisional administration via substitute engineer (from Q1.3); full admin re-runs after 0.6
- [ ] (c) Other: __________________________________________

---

## Story 0.6 — Backup Engineer (done — `Closed by [framework]`; Tasks 8–12 awaiting)

> Story 0.6 is the unblock for Story 0.1 AC-4, Story 0.2 AC-3 audit-mirror structural fix, Story 0.3 AC-2 restoration drill executor, Story 0.4 Task 8 facilitator, and Story 0.5 Task 9 administration. Per QX.1 = "expedite", this is the **highest-priority post-Phase-0 path**.

### Q6.1 🔵 — A-13 retainer authorization mode (Task 8)
- [x] (a) Pack-as-a-unit (framework + retainer + scope-of-work + access-grant + activation + roster + contract-template together)
- [ ] (b) Per-component
- [ ] (c) Other: __________________________________________

### Q6.2 🔵 — A-13 retainer amount within ₹15–25k/month band (Task 8)
PRD A-13 commits the band; specific amount is Trustee Panel discretion. Retainer = availability compensation; surge is billed separately.
- [ ] (a) ₹15,000/month (band floor)
- [x] (b) ₹20,000/month (band mid)
- [ ] (c) ₹25,000/month (band ceiling)
- [ ] (d) Other: ₹__________

### Q6.3 🔵 — Named engineer outreach timeline (Task 10)
Technical-fit profile: TypeScript / React / PostgreSQL / GCP; mutual-aid + bereavement domain context; 4-hour SLA capability; Bihar timezone compatibility.
- [ ] (a) Begin outreach immediately post-Phase-0 sign-off (in parallel with Story 0.13 substantive contract template return)
- [ ] (b) Defer outreach until Story 0.13 returns the substantive contract template (Task 9 dep; serial path)
- [x] (c) Hybrid — informal outreach now; formal contract conversation post-0.13 return
- [ ] (d) Other: __________________________________________

### Q6.4 🔵 — Engineer-roster identity-attribute discipline (OQ 3)
Identity fields are NDA territory. Template carries `<placeholder>` text + header note; real identity populates at Task 10.

**Accept placeholder-row schema-clarity convention?**
- [x] (a) Yes — accept as drafted
- [ ] (b) Other: __________________________________________

### Q6.5 🔵 — Activation-scenario target task (OQ 5; Task 12)
Backup engineer completes ≥1 non-production operational task within 48 hours using only KT pack + runbooks.
- [x] (a) Audit-log integrity verification (recommended default — exercises most KT pack + runbook surfaces)
- [ ] (b) Deploy staging doc-only change
- [ ] (c) RBAC seed reset against dev
- [ ] (d) Multi-Pariwar provisioning rehearsal against staging
- [ ] (e) Trustee discretion at Task 12 execution time

### Q6.6 🟡 — Multi-engineer framework posture (OQ 1)
- [x] (a) Mode-agnostic — framework commits property (multi-engineer support); v1 = single is operational state
- [ ] (b) Single-engineer v1 explicit; multi-engineer v2+
- [ ] (c) Other: __________________________________________

---

## Story 0.7 — Fallback Handler Ledger (done; Tasks 8–11 awaiting) — MAJOR DECISIONS

### Q7.1 🔵 — Operations Lead hire OR substitute-handler-bench (Task 8) ⭐ **LOAD-BEARING**

The Trust must pick one path. Story 0.12 reconciliation closed with no-trigger (no contract-help routing), so this decision now stands on its own:

- **(a) Hire Operations Lead** — specific candidate + salary range + scope-of-work referencing `operations-lead-commitment.md` §2 + start date. AC-1 funding-leg + named-Operations-Lead-leg fully close.
- **(b) Substitute-handler-bench fallback** — Trustee Panel + Story 0.6 backup engineer + named trustee-on-rota collectively cover the 8 loop nodes; **time-bounded 90 days, renewable**; explicit UX-DR4 deferral with rationale. Degraded-mode close, NOT UX-DR4 discharge.
- **(c) Defer to a separate Operations Lead funding decision** outside Story 0.12 (e.g., dedicated trustee-funding action item).

**Select path:**
- [ ] (a) Hire Operations Lead — proceed to Q7.2
- [x] (b) Substitute-handler-bench — proceed to Q7.3
- [ ] (c) Defer the funding decision — note rationale: __________
- [ ] (d) Other: __________________________________________

### Q7.2 — If Q7.1.a (Operations Lead hire)
- Candidate identity: __________________________________________
- Salary range INR/month: __________
- Start date: __________
- Scope-of-work cite: `operations-lead-commitment.md` §2 [ ] verbatim [ ] amend: __________
- IAM grant scope: read-access to `docs/fallback-handler-ledger/` + `docs/degradation-policy/` + `docs/runbooks/` + `docs/escrow/` + architecture/PRD/epics; no member-PII without trustee co-sign — [ ] confirm [ ] amend: __________

### Q7.3 — If Q7.1.b (Substitute-handler-bench)
- Trustee Panel members on bench: _______Dhiraj Rahul, Kalpana Bharti___________________________________
- Story 0.6 backup engineer participation: [ ] yes [x] no (gated on 0.6 Task 10)
- Named trustee-on-rota: ________________Dhiraj Rahul__________________________
- 90-day time-bound start date: __05-06-2026________
- Renewal trigger: _________________Automatic review at Day 75. Renew only if Operations Lead remains unfilled and Story 0.6 backup engineer has not assumed full operational coverage._________________________
- UX-DR4 explicit-deferral rationale: ____Trust elected temporary substitute-handler bench for the first 90 days to preserve capital during pre-launch validation. Operations Lead hiring deferred until operational load is evidenced by live member activity. Coverage provided by Trustee Panel plus backup-engineer framework once Story 0.6 Task 10 completes.______________________________________

### Q7.4 🔵 — Per-loop-node fallback handler ratification approach (Task 9)
Eight loop nodes (`claim-filing`, `peer-mesh`, `ground-inspection`, `reconciliation`, `helpdesk`, `denial-appeal`, `kyc-fallback`, `upi-failure-coach`) need: substantive `fallback_handler_role` + `funding_status` (`retainer-funded` / `salary-funded` / `volunteer-rota-bridge`) + ratified `response_time_sla`.

- [ ] (a) Defer all 8 ratifications to Operations Lead post-hire (if Q7.1.a)
- [ ] (b) Ratify all 8 per-node now — provide per-node response sheet (Q7.4a–h offline)
- [x] (c) Mixed: ratify some now, defer others — list: __________
- [ ] (d) Other: __________________________________________

### Q7.5 🟡 — Synthetic SLA test target (Task 11)
- [x] (a) Claim-filing (recommended default; AC-2 Given)
- [ ] (b) Other loop node: __________
- [ ] (c) All eight in a single multi-loop test
- [ ] (d) Trustee discretion at Task 11 execution time

---

## Story 0.13 — Legal Counsel Concurrent Review Engagement (done; Tasks 7–11 awaiting)

> Story 0.13 unblocks: Story 0.4 Task 9 comms-template ratification (×5 channels); Story 0.6 Task 9 contract template substantive language; Story 0.5 ADR slot population × 5; Story 0.2 DPO-breach-reporting envelope. **Critical multiplier.**

### Q13.1 🔵 — Engagement-scope ratification mode (Task 7)
Scope items: (a) review-scope-charter §1 five AC items; (b) ~32-row deferred-scope inventory; (c) regulatory-surface review; (d) ADR slot review; (e) pre-launch checkpoint coverage; (f) out-of-scope; (g) counsel-roster shortlist criteria.

- [x] (a) Pack-as-a-unit (default)
- [ ] (b) Per-scope-item (both trustees must agree to this mode)
- [ ] (c) Other: __________________________________________

### Q13.2 🔵 — Counsel-roster shortlist criteria
**Mandatory:** DPDPA practice; Indian Trust Act practice; concurrent-review-mode availability; no prior TSCT engagement; professional-indemnity insurance coverage.
**Preferred:** Financial-services regulatory; Bihar / Hindi context; mutual-aid trust track record.

- [x] (a) Confirm as drafted
- [ ] (b) Amend mandatory list: __________________________________________
- [ ] (c) Amend preferred list: __________________________________________

### Q13.3 🔵 — Outreach paths (Task 8) — select all that apply
- [x] (a) Trustee Panel professional network
- [x] (b) Bar Council of Bihar referrals
- [x] (c) Existing legal-counsel contacts of board members
- [ ] (d) Published-practice DPDPA experts in Hindi-language jurisdictions
- [ ] (e) Other: __________________________________________

### Q13.4 🔵 — Single-candidate selection
Framework discipline: ≥2 candidates per shortlist; single-candidate permitted at Trustee Panel discretion with rationale.

- [x] (a) Require ≥2 candidates strictly
- [ ] (b) Single-candidate permitted with documented rationale
- [ ] (c) Other: __________________________________________

### Q13.5 🔵 — Funding cross-coupling with Story 0.12
Story 0.12 reconciliation closed at no-trigger (no contract-help routing). Decision 2026-06-02-013 body item 9 cross-coupled the budget.

- [ ] (a) Standalone-fund 0.13 (since 0.12 didn't trigger contract-help)
- [x] (b) Route 0.13 through a separate dedicated legal-counsel funding allocation
- [ ] (c) Other: __________________________________________

### Q13.6 🔵 — Engagement budget envelope (Task 8 → Task 9)
- Retainer: INR _15,000___/month (or rationale for no-retainer hourly-only structure)
- Per-artifact pricing — standard: INR _7,500___/artifact (5–10 biz days)
- Per-artifact pricing — expedited: INR _15,000___/artifact (2–3 biz days surge)
- Annual cap: INR _300,000___

### Q13.7 🟡 — Emergency single-trustee scope-ratification fallback
README §5: emergency single-trustee scope-ratification valid under documented trustee incapacitation, time-bounded 30 days.
- [x] (a) Confirm fallback as drafted
- [ ] (b) Amend: __________________________________________

---

## Story 0.14 — Native Stack Validation (done; Tasks 7–11 awaiting)

> Story 0.14 unblocks Story 0.10 P0-2c VI/low-vision Hindi AT-walkthrough (PRECONDITION-2 prototype-operability) + Epic 1 Story 1.1 substrate-bootstrap. **Sequencing-critical.**

### Q14.1 🔵 — Experiment-scope ratification (Task 7)
Per UX spec §6 verbatim: ~2-week timebox; three patterns (Yogdaan Bahi + Shradhanjali Sahyog Vivran + Panchayat Noticeboard); three test devices; P1–P6 pass criteria all-must-hold; F1–F5 fail-criteria FM-2 tiered escalation.

- [x] (a) Ratify as authored
- [ ] (b) Amend timebox to: ____ weeks
- [ ] (c) Amend pattern set: __________________________________________
- [ ] (d) Other: __________________________________________

### Q14.2 🔵 — Device-procurement budget (Task 7)
Three devices: (1) mid-range Snapdragon 4-series Android (3GB RAM); (2) older entry-level Android (2GB RAM + Android 11); (3) iPhone (iOS 16+ floor).

- Total device budget: Devices are already available.
- Apple Developer Program annual fee (~₹8,000) included? [x] yes [ ] no
- Funding source:
  - [ ] (a) Standalone-fund (Story 0.12 didn't trigger contract-help)
  - [ ] (b) Pulled from a separate trust operating-budget line item: __________
  - [ ] (c) Other: __Trustee own fund________________________________________

### Q14.3 🔵 — Story 0.10 P0-2c sequencing acknowledgment
Story 0.10 P0-2c VI/low-vision Hindi AT-walkthrough PRECONDITION-2 requires Story 0.14 Task 9 prototype-operability.

- [x] (a) Acknowledge — 0.14 Tasks 8–11 must close before 0.10 P0-2c session
- [ ] (b) Other: __________________________________________

### Q14.4 🔵 — Trustee acknowledgment threshold for ratify-or-pivot (Task 11)
Story 0.14 uses **≥1-trustee acknowledgment** (NOT ≥2-trustee quorum) per UX spec line 845 BigDev decision authority — distinct from prior stories.

- [x] (a) Confirm ≥1-trustee acknowledgment as the threshold (UX-spec-aligned)
- [ ] (b) Override to ≥2-trustee quorum (consistent with other stories)
- [ ] (c) Other: __________________________________________

---

## Story 0.15 — Architectural Launch-Gate Inventory (done; Tasks 8–11 awaiting) — META

> Story 0.15 is the **inventory-of-all-Phase-0-gates**. Task 8 ratification organizes everything else; Task 9 starts the monthly review cadence that tracks closure.

### Q15.1 🔵 — Inventory-roster ratification mode (Task 8)
15 rows + per-row owner + closure-criteria + target-date + closure-criteria-rubric + monthly-review-cadence-protocol + escalation-protocol.

- [x] (a) Pack-as-a-unit (all 15 rows + rubric + protocols together)
- [ ] (b) Per-row (slower; per-row owner + criteria + target-date individual sign-off)
- [ ] (c) Hybrid — pack-as-a-unit for protocols; per-row for Rows 12-14 conditional-escalation
- [ ] (d) Other: __________________________________________

### Q15.2 🔵 — Rows 12–14 conditional-escalation disposition
Rows 12–14 are tied to architecture §Gap Analysis predicate materialization.

- [x] (a) Stay in `conditional-escalation-pending-predicate` until predicates materialize (architecture-aligned default)
- [ ] (b) Elevate to `open` now (proactive surfacing)
- [ ] (c) Per-row decision: Row 12 ____ / Row 13 ____ / Row 14 ____
- [ ] (d) Other: __________________________________________

### Q15.3 🔵 — First monthly review date (Task 9)
First monthly review within 4 weeks of Task 8 ratification.

- Proposed first-review date: __01-07-2026________
- Recurring cadence: monthly until all rows close-or-defer (confirm: [x] yes [ ] amend: ____)

### Q15.4 🟡 — Legal Counsel meeting attendance
Rows 3 (Edge/WAF DPDPA), 8 (DPDPA grievance officer), 9 (FR-43A external forum), 10 (Regulatory surface sign-off) require counsel attendance when on-agenda.

- [x] (a) Confirm — counsel attendance coordinated via Story 0.13 engagement once active
- [ ] (b) Other: __________________________________________

### Q15.5 🟡 — Phase 1 launch readiness signal (Task 11)
Signal arms when every row at an architecture-allowed disposition (`closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed`) + objective evidence link + no open-past-target rows without escalation review.

- [x] (a) Confirm framework
- [ ] (b) Amend disposition vocabulary: __________
- [ ] (c) Other: __________________________________________

### Q15.6 — Cross-link to Q12.7 (Rows 1+2 closure timing)
Already handled. Q12.7 ratification flows through to Story 0.15 Rows 1+2 closure via Q12.1–Q12.4 cadence-override sign-off.

- [x] (a) Confirm — no separate event needed
- [ ] (b) Request separate review for Rows 1+2 — rationale: __________

---

## Addendum Sign-off Block

**Trustee 1**
- Name: _____Dhiraj Rahul_____________________________________
- Date: __05-06-2026________
- Initial on Q6.1+Q6.2 (A-13 retainer authorization, load-bearing): _dr___
- Initial on Q7.1 (Operations Lead vs substitute-bench, load-bearing): _dr___
- Initial on Q13.5 (counsel funding-source): __dr__

**Trustee 2**
- Name: ___Kalpana Bharti_______________________________________
- Date: __05-06-2026________
- Initial on Q6.1+Q6.2: _kp___
- Initial on Q7.1: _kp___
- Initial on Q13.5: _kp___

**Solo Builder acknowledgment** (transcription into `.decision-log.md`)
- Date: __05-06-2026________
- Additional Decisions to append: 2026-XX-XX-___ (Story 0.4 Task 7), 2026-XX-XX-___ (Story 0.5 Task 8), 2026-XX-XX-___ (Story 0.6 Task 8 supersession of Decision 006), 2026-XX-XX-___ (Story 0.7 Task 8 supersession of Decision 007), 2026-XX-XX-___ (Story 0.13 Task 7 supersession of Decision 013), 2026-XX-XX-___ (Story 0.14 Task 7 supersession of Decision 014), 2026-XX-XX-___ (Story 0.15 Task 8 supersession of Decision 015)

---

## Addendum Appendix — Closure-impact map

| Question(s) | Story | Unblocks |
|---|---|---|
| Q4.1 + Q4.2 | 0.4 | Task 7 sign-off → Task 8 table-top scheduled |
| Q4.3 | 0.4 | Task 8 facilitator path settled |
| Q5.1 | 0.5 | Task 8 KT pack sign-off |
| Q5.2 | 0.5 | Task 9 administration sequencing |
| Q6.1 + Q6.2 | 0.6 | **Task 8 A-13 retainer authorization** → audit-mirror unblock in 0.2 → Story 0.1 AC-4 path 1 → Story 0.3 restoration drill primary executor |
| Q6.3 + Q6.4 | 0.6 | Task 10 named-engineer outreach + contract conversation |
| Q6.5 + Q6.6 | 0.6 | Task 12 activation scenario + multi-engineer framework posture |
| Q7.1 (+ Q7.2 OR Q7.3) | 0.7 | **Task 8 Operations Lead decision** → 8 loop-node ratifications + 23-row backfill |
| Q7.4 | 0.7 | Task 9 per-loop-node ratification approach |
| Q7.5 | 0.7 | Task 11 synthetic SLA test target |
| Q13.1 + Q13.2 + Q13.3 + Q13.4 | 0.13 | Task 7 + Task 8 counsel selection |
| Q13.5 + Q13.6 | 0.13 | Task 9 engagement-letter funding |
| Q13.7 | 0.13 | Emergency fallback codified |
| Q14.1 + Q14.2 | 0.14 | **Task 7 experiment scope + device budget** → Tasks 8–10 prototype build → Task 11 ratify-or-pivot |
| Q14.3 | 0.14 | Story 0.10 P0-2c sequencing confirmed |
| Q14.4 | 0.14 | Task 11 acknowledgment threshold confirmed |
| Q15.1 + Q15.2 | 0.15 | **Task 8 inventory ratification** → Task 9 monthly review starts |
| Q15.3 | 0.15 | Task 9 first-review-date scheduled |
| Q15.4 + Q15.5 + Q15.6 | 0.15 | Task 10 + Task 11 disposition framework + Rows 1+2 cross-link |

---

**Critical path after sign-off (in priority order):**

1. **Q12.4 initials** — close the original questionnaire's load-bearing cadence co-sign
2. **Q6.1 + Q6.2** — A-13 retainer authorization (Story 0.6 Task 8) — unblocks four downstream stories
3. **Q7.1** — Operations Lead vs substitute-bench (Story 0.7 Task 8) — largest single trust funding decision
4. **Q13.1–Q13.4** — Legal counsel scope + shortlist (Story 0.13 Tasks 7–8) — multiplier for 0.4, 0.5, 0.6
5. **Q14.1 + Q14.2** — Native stack experiment ratification (Story 0.14 Task 7) — Epic 1 Story 1.1 unblock + Story 0.10 sequencing
6. **Q15.1 + Q15.3** — Inventory ratification + first review date (Story 0.15 Tasks 8–9) — meta-tracking armed

**Total Phase-0 trustee items:** 32 (original) + 28 (addendum) = **60 trustee decisions**.

---

# SECOND ADDENDUM — Final trustee items to close P0 for good

**Why this addendum?** Three pockets surfaced after the first addendum landed:
- **Part A** — two fields inside the existing questionnaire that are still blank
- **Part B** — Stories 0.8 / 0.9 / 0.10 / 0.11 (P0-2 empathy field-work portfolio) marked `done` per `sprint-status` but with pre-recruitment trustee-approval gates and reviewer-of-record assignments unfilled
- **Part C** — three cross-cutting Phase-0 governance items (joint-discharge entry; annual re-attestation cadence; ADR authoring timing)

**Total Second Addendum:** **14 questions** (2 in A + 9 in B + 3 in C).

---

## Part A — Missing entries inside the existing questionnaire

### QA.1 🔵 — Q12.4 cadence-override initials (load-bearing)

The original Q12.4 (line 52) reserved trustee initial slots that are still blank. The ratification stands on the `(a) Yes` tick but the `.decision-log.md` Decision 2026-06-04-016 transcription needs both initials per the Trust's two-witness convention.

**Initial here to close the cadence-override co-sign:**
- Trustee 1 (Dhiraj Rahul) initial: __dr__
- Trustee 2 (Kalpana Bharti) initial: __kp__

### QA.2 🔵 — Q7.4 per-loop-node ratification list

Q7.4 was answered `(c) Mixed: ratify some now, defer others` but the list was left blank. The 8 Phase-1 loop nodes need a per-node disposition. Given Q7.1 = substitute-handler-bench (90-day window) + Q7.3 bench = Trustees Dhiraj + Kalpana with Dhiraj on rota:

**Disposition shorthand:**
- **(BENCH)** — substitute-handler-bench covers this loop node for the 90-day window; ratify now with trustee-on-rota fallback
- **(BACKUP)** — defer until Story 0.6 Task 10 closes (backup engineer contracted); ratify then
- **(OPS-LEAD)** — defer until Operations Lead hire decision (if Q7.1.a re-opened later); ratify then
- **(BACKLOG)** — defer until post-launch operational evidence justifies a substantive ratification

| Loop node | Disposition | Notes (response_time_sla if BENCH; rationale otherwise) |
|---|---|---|
| claim-filing | [x] BENCH [ ] BACKUP [ ] OPS-LEAD [ ] BACKLOG | __________ |
| peer-mesh | [ ] BENCH [ ] BACKUP [ ] OPS-LEAD [x] BACKLOG | __________ |
| ground-inspection | [ ] BENCH [x] BACKUP [ ] OPS-LEAD [ ] BACKLOG | __________ |
| reconciliation | [x] BENCH [ ] BACKUP [ ] OPS-LEAD [ ] BACKLOG | __________ |
| helpdesk | [x] BENCH [ ] BACKUP [ ] OPS-LEAD [ ] BACKLOG | __________ |
| denial-appeal | [ ] BENCH [x] BACKUP [ ] OPS-LEAD [ ] BACKLOG | __________ |
| kyc-fallback | [ ] BENCH [x] BACKUP [ ] OPS-LEAD [ ] BACKLOG | __________ |
| upi-failure-coach | [x] BENCH [ ] BACKUP [ ] OPS-LEAD [ ] BACKLOG | __________ |

---

## Part B — Stories 0.8 / 0.9 / 0.10 / 0.11 (P0-2 empathy field-work)

> All four are marked `done` (author-commit + code review of frameworks). Tasks 7–11 are external-action: recruitment, conduct, synthesis, trustee review, divergence reconciliation. The trustee gates below are the ones the dev agent cannot fill.

### Story 0.8 — Teacher empathy interviews (5 × ≥45 min, Vaishali district)

#### Q8.1 🔵 — Reviewer-of-record for synthesis sign-off (Task 10)

≥1 trustee owns the synthesis review + records Decision 2026-05-30-008. Convention so far: per-story single-trustee-of-record for empathy work, not panel-wide quorum.

- [x] (a) Dhiraj Rahul
- [ ] (b) Kalpana Bharti
- [ ] (c) Both review (panel-wide ≥2-trustee — stricter than AC-1 ≥1 default)
- [ ] (d) Other: __________

#### Q8.2 🟡 — Recruitment-path facilitation (Task 7)
Solo Builder owns recruitment via Shikshakamitra networks in Vaishali. Trustees confirm whether panel-network introductions are offered as a fallback path:

- [x] (a) Solo Builder runs recruitment standalone; trustees on standby for fallback intro if needed
- [ ] (b) Trustee-network introductions offered upfront (specify network: __________)
- [ ] (c) Other: __________

---

### Story 0.9 — Bereaved spouse conversation (1 × ≥60 min)

#### Q9.1 🔵 — Pre-recruitment Trustee Panel approval (Task 7) ⭐ AC-1 PRECONDITION

AC-1 explicitly requires `Trustee Panel approval recorded BEFORE the conversation is conducted` — bereavement-context sensitivity escalates above 0.8's recruit-first model. This is a panel-wide decision, not a single-trustee gate.

**Approve the bereaved-spouse conversation in principle?**
- [ ] (a) Yes — both trustees approve recruitment proceeding under the authored ethics protocol (re-consent rule for verbatim quotation; ≥60-min Hindi conversation at spouse's chosen setting; Pattern 4 dignified-validation grammar evaluation)
- [x] (b) Yes with constraint — approve but require additional safeguard: __Require trustee confirmation that the bereavement event occurred at least 90 days prior to recruitment and that participation is entirely voluntary with an explicit right to stop the conversation at any time.__
- [ ] (c) No — defer until: __________
- [ ] (d) Other: __________

Trustee 1 initial confirming approval: ____   Trustee 2 initial confirming approval: ____

#### Q9.2 🔵 — Trustee-mediated recruitment path (Task 7)
Trustee-mediated path is AC-1 precondition (Solo Builder does not approach bereaved spouses directly without trustee intermediation given the consent-surface escalation).

- [x] (a) Dhiraj Rahul facilitates the introduction via TSCT network
- [ ] (b) Kalpana Bharti facilitates via [network: __________]
- [ ] (c) Joint facilitation — both trustees identify candidate via shared network
- [ ] (d) Other: __________

#### Q9.3 🔵 — Reviewer-of-record (Task 10)
Records Decision 2026-05-30-009.

- [ ] (a) Dhiraj Rahul
- [ ] (b) Kalpana Bharti
- [x] (c) Both review (panel-wide given Pattern 4 grammar evaluation downstream impact)
- [ ] (d) Other: __________

---

### Story 0.10 — VI / low-vision accessibility validation (1 × ≥60 min Hindi AT-walkthrough)

> Sequencing already confirmed via Q14.3 — Story 0.14 Tasks 8–11 must close (prototype-operability) before Task 7 recruitment begins.

#### Q10.1 🔵 — Pre-recruitment Trustee Panel approval (Task 7) ⭐ AC-1 PRECONDITION

Disability-context sensitivity escalation — Trustee Panel approval before any approach to VI/low-vision participants.

**Approve the VI/low-vision AT-walkthrough in principle?**
- [x] (a) Yes — both trustees approve recruitment proceeding (once 0.14 prototype-operability lands) under the authored AT-pre-flight + ethics protocol
- [ ] (b) Yes with constraint: __________
- [ ] (c) No — defer until: __________
- [ ] (d) Other: __________

Trustee 1 initial: ____   Trustee 2 initial: ____

#### Q10.2 🔵 — Disability-network recruitment path (Task 7)
- [ ] (a) National Association for the Blind (NAB) — Bihar chapter
- [ ] (b) Hindi-language disability advocacy networks
- [ ] (c) Trustee personal network — specify: __________
- [x] (d) Combination of the above: _____NAB + Hindi disability networks_____
- [ ] (e) Other: __________

#### Q10.3 🔵 — Reviewer-of-record (Task 10)
Records Decision 2026-05-31-010. Note: synthesis drives UX-DR66/67/68 acceptance-criteria revisions before Epic 3 + Epic 8 + Story 7.10 freezes.

- [ ] (a) Dhiraj Rahul
- [ ] (b) Kalpana Bharti
- [x] (c) Both review (panel-wide given UX-DR cross-cutting impact)
- [ ] (d) Other: __________

---

### Story 0.11 — Operator shadowing (≥4 hr × ≥2 shifts) — TERMINAL P0-2 leg

#### Q11.1 🔵 — Host helpline institution choice (Task 7)
Two-actor consent model — host institution must consent BEFORE individual operator approach.

- [x] (a) TSCT (familiar context; established trustee relationship)
- [ ] (b) NSCT (sibling-trust; geographically separate)
- [ ] (c) Analogous Indian welfare/cooperative trust — specify: __________
- [ ] (d) Other: __________

#### Q11.2 🔵 — Pre-recruitment Trustee Panel approval (Task 7) ⭐ AC-1 PRECONDITION
Staff-workplace + member-caller-privacy escalation. Conditional on host institution consent from Q11.1.

**Approve the operator-shadowing exercise in principle?**
- [x] (a) Yes — both trustees approve, conditional on Q11.1 host-institution consent
- [ ] (b) Yes with constraint: __________
- [ ] (c) No — defer until: __________
- [ ] (d) Other: __________

Trustee 1 initial: ____   Trustee 2 initial: ____

#### Q11.3 🔵 — Reviewer-of-record (Task 10) + P0-2 portfolio TERMINAL leg sign-off

Records Decision 2026-05-31-011 supersession. Task 11 closure also discharges the **P0-2 four-leg portfolio (0.8 + 0.9 + 0.10 + 0.11) as TERMINAL** — final empathy-portfolio sign-off in Phase-0.

- [ ] (a) Dhiraj Rahul (reviewer-of-record for synthesis + TERMINAL portfolio sign-off)
- [ ] (b) Kalpana Bharti
- [x] (c) Both — joint TERMINAL sign-off (recommended given portfolio-discharge weight)
- [ ] (d) Other: __________

---

## Part C — Cross-cutting Phase-0 governance items

### QC.1 🟡 — 30-day takeover joint-discharge entry acknowledgment

Stories 0.3 + 0.4 + 0.5 + 0.6 each commit a follow-up `.decision-log.md` `[CONTINUITY]` entry recording the **30-day takeover joint-discharge achievement** when the eight-condition union closes:

> Story 0.3 AC-1 + AC-2 ∧ Story 0.4 AC-1 + AC-2 ∧ Story 0.5 AC-1 + AC-2 + AC-3 ∧ Story 0.6 AC-1 + AC-2

This entry is recorded by Solo Builder when all eight conditions materialize (likely Q2/Q3 of Epic 1 timeframe per QX.2 = provisionally closed). The trustees acknowledge:

- [x] (a) Solo Builder records the joint-discharge entry when conditions materialize; ≥1-trustee acknowledgment via reviewer-of-record convention
- [ ] (b) ≥2-trustee co-sign required for the joint-discharge entry (stricter)
- [ ] (c) Other: __________

### QC.2 🟡 — Annual re-attestation cadence start dates

Story 0.5 KT pack + Story 0.15 launch-gate inventory both commit annual re-attestation. Per Q15.3 first monthly review = 2026-07-01.

**Default annual re-attestation date for both surfaces:**
- [x] (a) 2027-07-01 (12 months from Q15.3 first monthly review — recommended default)
- [ ] (b) 2027-06-05 (12 months from Phase-0 trustee sign-off date)
- [ ] (c) Calendar-anchored to Trust formation anniversary — specify: __________
- [ ] (d) Other: __________

### QC.3 🔵 — Sealing-mechanism ADR authoring timing

Q2.1 ratified physical sealed envelopes + bank safe deposit; Q2.2 ratified trustee residences + bank safe deposit; Q2.3 ratified separate custodial path per envelope class. These are **custodial-mechanism decisions, not legal instruments** — they do NOT require legal counsel return.

**Should Solo Builder author the credential-escrow-mechanism ADR now, or wait for Story 0.13 counsel return?**
- [x] (a) Author ADR now — closes Story 0.2 Task 6 fully; custodial mechanism is settled and does not need counsel input (recommended)
- [ ] (b) Wait for counsel return — bundle ADR authoring with the engagement-letter signature + contract-template substantive language
- [ ] (c) Other: __________

> Same pattern applies to: code-escrow-mirror-destination ADR (Q3.1 = GitLab.com; Q3.2 = deploy key — same logic, no counsel input needed). Authoring fate for that ADR follows the same answer.

---

## Second Addendum Sign-off Block

**Trustee 1**
- Name: ______Dhiraj Rahul____________________________________
- Date: _05-06-2026_________
- Initial on QA.1 (Q12.4 cadence-override co-sign, load-bearing): __dr__
- Initial on Q9.1 (bereaved-spouse approval, load-bearing): __dr__
- Initial on Q10.1 (VI/low-vision approval, load-bearing): _dr___
- Initial on Q11.2 (operator-shadowing approval, load-bearing): __dr__

**Trustee 2**
- Name: _______________Kalpana Bharti___________________________
- Date: __05-06-2026________
- Initial on QA.1: _kp___
- Initial on Q9.1: _kp___
- Initial on Q10.1: __kp__
- Initial on Q11.2: _kp___

**Solo Builder acknowledgment** (transcription into `.decision-log.md`)
- Date: _05-06-2026_________
- Additional Decisions to append: 2026-XX-XX-___ (Story 0.8 reviewer-of-record commitment), 2026-XX-XX-___ (Story 0.9 pre-recruitment approval), 2026-XX-XX-___ (Story 0.10 pre-recruitment approval), 2026-XX-XX-___ (Story 0.11 host-institution + pre-recruitment approval), 2026-XX-XX-___ (QC.1 joint-discharge acknowledgment convention), 2026-XX-XX-___ (QC.2 annual re-attestation cadence), 2026-XX-XX-___ (QC.3 ADR authoring fate)

---

## Second Addendum Closure-impact map

| Question(s) | Story / Surface | Unblocks |
|---|---|---|
| QA.1 | 0.12 | Decision 2026-06-04-016 transcription completes; cadence-override formally locks |
| QA.2 | 0.7 | Per-loop-node Task 9 ratification approach concretizes; substitute-bench coverage window is well-defined |
| Q8.1 + Q8.2 | 0.8 | Task 7 recruitment proceeds; Task 10 reviewer-of-record named |
| Q9.1 + Q9.2 + Q9.3 | 0.9 | Task 7 trustee-mediated recruitment proceeds; Task 10 reviewer-of-record named; Pattern 4 evaluation path settled |
| Q10.1 + Q10.2 + Q10.3 | 0.10 | Task 7 recruitment proceeds post-Q14.3 sequencing; UX-DR66/67/68 revision-path settled |
| Q11.1 + Q11.2 + Q11.3 | 0.11 | Task 7 host-institution + panel approval flow; P0-2 portfolio TERMINAL sign-off named |
| QC.1 | 0.3 / 0.4 / 0.5 / 0.6 | 30-day-takeover joint-discharge acknowledgment convention codified |
| QC.2 | 0.5 / 0.15 | Annual re-attestation cadence dates committed |
| QC.3 | 0.2 / 0.3 | Sealing-mechanism + mirror-destination ADRs authorable now; closes 0.2 Task 6 + 0.3 Task 7 ADR-leg fully |

---

**Final Phase-0 trustee tally:** 32 (original) + 28 (first addendum) + 14 (second addendum) = **74 trustee decisions across 13 stories**.

**Critical sign-off remaining (in priority order):**

1. **QA.1** — Q12.4 cadence-override initials (still blank; load-bearing for Story 0.12 closure)
2. **Q9.1 + Q10.1 + Q11.2** — three pre-recruitment panel approvals (gate empathy field-work execution; AC-1 preconditions)
3. **QA.2** — per-loop-node disposition table (concretizes the 90-day substitute-bench scope)
4. **QC.3** — ADR authoring timing (unblocks 0.2 Task 6 + 0.3 Task 7 ADR-legs without waiting for counsel)
5. **Reviewer-of-record assignments** across Q8.1 / Q9.3 / Q10.3 / Q11.3 (named owners for four Decision-log entries)
6. **QC.1 + QC.2** — joint-discharge convention + annual cadence (deferred operational items; non-gating)
