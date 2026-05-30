# Fallback-Handler Ledger Framework

**Authority:** UX §0 Stance #6 "No loop node ships without a named, funded, on-rota fallback handler" (UX spec line 91) + UX §Phase-0 P0-1 launch-blocker statement (UX spec line 97) + UX §Phase-0 Operational Ownership Note (UX spec line 99) + AR-61 "Staff-fallback at every node — every loop node carries `{primary_actor, fallback_actor, escalation_trigger}`; P0-1 gates Phase 1" (architecture line 349 + Cross-Cutting #9 architecture lines 296-298) + UX-DR4 "P0-1 fallback-handler-named launch gate" (epics line 374) + AR-49 P0-1 Launch Gate Risks row "P0-1 Lifecycle Operational-State Coverage | BigDev | UX" (architecture line 4781).

**Owning Story:** 0.7 (P0-1 Fallback-Handler Ledger Published with SLA + Rota).

**Status:** Author-committed 2026-05-30; awaiting Trustee Panel Operations Lead hire OR substitute-handler-bench formal ratification (Task 8) + per-loop-node fallback-handler naming + funding + per-loop-node ratification (Task 9) + rota population + ≥2-trustee ledger sign-off (Task 10) + synthetic loop-node automation-failure SLA test (Task 11).

---

## §1 Why a top-level surface

The fallback-handler ledger discharges a **single cross-cutting commitment** (UX §0 Stance #6 + UX §Phase-0 P0-1 + AR-61 + UX-DR4 + AR-49 P0-1 Launch Gate Risks): every Phase-1 loop node where automation can fail (claim filing, peer mesh, ground inspection, reconciliation, helpdesk, denial appeal, KYC fallback, UPI failure coach) carries a named, funded, on-rota fallback handler with a published response-time SLA + contact rota before the implementing Story's loop ships.

The framework is broader than any single existing top-level surface's scope:

- **Bigger than `docs/runbooks/`** — the framework is multi-component (README + ledger + per-loop-node entries × 8 + rota + operations-lead-commitment + backfill-log), not a single runbook
- **Bigger than `docs/degradation-policy/`** — degradation policy is *what the platform does when automation fails*; this framework is *who picks up the work when automation fails*; the two are dependency-coupled (this framework discharges the `fallback_handler` column citation contract committed in Story 0.4 surface-inventory.md)
- **Bigger than `docs/escrow/`** + `docs/knowledge-transfer/` + `docs/backup-engineer/` — those frameworks belong to the **bus-factor-of-one mitigation portfolio** (Stories 0.1–0.6); this framework belongs to the **parallel loop-node operational-responsiveness portfolio** (Story 0.7 alone). See §10 for the disjoint-anchor discipline.
- **Bigger than a single ADR** — the framework commits *properties* (Operations Lead is needed; substitute-handler-bench is the explicit-deferral fallback; ledger rows are append-only with forbidden-removal; the fallback handler SLA is for staff operational responsiveness, NOT for members per UX Stance #5); specific paging integrations + per-loop-node SLA tooling + Operations Lead salary range are ADR-territory (per [[feedback_architecture_vs_adr_boundary]]) and live in `docs/adr/` once authored, with slots reserved in `docs/knowledge-transfer/adr-index.md` Section I

The unified directory exposes the framework as a single trustee-accessible operations surface per AC-1 ("the ledger is published in the admin-accessible operations runbook"). The cross-reference from `docs/runbooks/README.md`'s "Related runbooks expected from other stories" table per Story 0.7 Task 7 satisfies the operations-runbook-cite property without binding the framework to live as a single file under `docs/runbooks/`.

**Parallel to existing continuity surfaces (five independent top-level directories + one sub-surface):** `docs/runbooks/` (Story 0.1), `docs/escrow/` (Story 0.2; sub-surface: `docs/escrow/code-escrow/` per Story 0.3 — a subdirectory of `docs/escrow/`, not an independent top-level sibling), `docs/degradation-policy/` (Story 0.4), `docs/knowledge-transfer/` (Story 0.5), `docs/backup-engineer/` (Story 0.6). `docs/fallback-handler-ledger/` is the sixth independent top-level continuity-framework surface; see §9 for the Related continuity surfaces table.

## §2 Framework lifecycle

The framework progresses through five lifecycle stages with explicit hand-offs:

1. **Author-commit (Tasks 1-7 — Story 0.7 dev-story)** — framework scaffolding authored: this README + `ledger.md` (8 per-loop-node rows with recommended-default SLAs + `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` placeholders) + `loop-nodes/` × 8 per-loop-node entry files + `rota.md` (schema-only with `pending-rota-population`) + `operations-lead-commitment.md` + `backfill-log.md` (23 citation-slot rows discharging the Story 0.4 framework + `deferred-work.md` P0-1-pending placeholders) + Decision 2026-05-30-007 appended + cross-reference edits applied to Stories 0.1 / 0.4 / 0.5 / 0.6 frameworks + `deferred-work.md`.

2. **Operations Lead hire OR substitute-handler-bench formal ratification (Task 8 — `_AWAITING EXTERNAL ACTION_` — Trustee Panel authority + Story 0.12 P0-3 spec-to-cadence reconciliation linkage)** — Trustee Panel chooses one of two paths per `operations-lead-commitment.md` §6: (a) authorize Operations Lead hire (specific candidate, salary range, scope-of-work referencing `operations-lead-commitment.md` §2, start date); (b) formally ratify the substitute-handler-bench fallback per §5 below. The chosen path is recorded as a `.decision-log.md` `[OPS]` entry. Path (b) is a degraded-mode close of the AC-1 named-Operations-Lead-leg per [[feedback_closure_language_precision]] — **explicit-deferral-with-rationale**, NOT discharge of UX-DR4.

3. **Per-loop-node named role + funding + per-loop-node ratification + 23-row P0-1-pending substantive backfill (Task 9 — `_AWAITING EXTERNAL ACTION_` — depends on Task 8)** — Trustee Panel + Operations Lead (or substitute-bench representative) name the substantive `fallback_handler_role` + `funding_status` per loop node; ratify the recommended-default `response_time_sla` (or amend); flip `ledger.md` §3 rows from `pending-trustee-ratification` to `trustee-signed-off`; execute the substantive textual P0-1-pending → named-role replacement in the Story 0.4 framework source files per the verify-before-editing pattern; flip `backfill-log.md` rows from `citation-slot-committed` to `substantive-backfill-applied`. Closure-language precision: per-loop-node-ratification events flip the AC-1 named-role-leg + funding-leg to **Closed by [edit]** per loop node ratified; loop nodes not yet ratified remain **Resolved via explicit deferral** with rationale.

4. **Rota population + ≥2-trustee ledger sign-off (Task 10 — `_AWAITING EXTERNAL ACTION_` — depends on Task 9)** — Operations Lead (or substitute-bench representative) populates `rota.md` per loop node with substantive `primary_handler_contact_ref` + `secondary_handler_contact_ref` (NDA territory — only the `<NDA — see operations-policy>` placeholder is committed in the framework; substantive identity is stored out-of-band per operations policy, recorded with redacted-identity hash + last-engagement-event-date for accountability per the Story 0.6 engineer-roster need-to-know discipline). ≥2 trustees ratify per §5 sign-off lifecycle (pack-as-a-unit OR per-loop-node mode); each ratifying trustee records date + mode + per-loop-node-row approvals + signature line in `ledger.md` §5 Trustee ratification log.

5. **Synthetic loop-node automation-failure SLA test (Task 11 — `_AWAITING EXTERNAL ACTION_` — depends on Task 10 for the tested loop node)** — Trustee Panel chair triggers a planned synthetic loop-node automation-failure exercise per `ledger.md` §6 Synthetic SLA test procedure. Fallback handler paged via the published rota; acknowledgment + first-action windows measured; gap-list recorded; remediation plan logged. AC-2 closes per loop node when the synthetic test completes with the fallback handler successfully acknowledging + first-action-completing within the documented SLAs. Closure for all eight loop nodes discharges UX-DR4 + AR-49 P0-1 Launch Gate Risks row per the supersession schema. Re-rehearsal is permitted after gap remediation; the ledger records each rehearsal as a new row.

After Task 11 closure for all eight loop nodes, the framework enters **ongoing daily-operations + periodic review mode** per §6 Review cadence fallback.

## §3 Four-way property / control / policy / gap-analysis discipline

| Layer | What it commits | Where it lives in this framework |
|---|---|---|
| **Property** (architecture-equivalent) | Every Phase-1 loop node has a named, funded, on-rota `fallback_handler` role with a documented SLA + contact rota before the implementing Story's loop ships; ledger rows are append-only with forbidden-removal; the Operations Lead role is the framework co-owner; the substitute-handler-bench is the explicit-deferral fallback if the Operations Lead hire is deferred; the fallback handler SLA is for staff operational responsiveness, NOT for members (per UX Stance #5 no-punitive-auto-action); paging surface is the comms-channel column (push / WA / SMS / helpline-inbound / email / public-page-banner) per the Story 0.4 comms-templates; audit-line emission per Story 1.10 substrate. | This `README.md` §4 Structural invariants; `ledger.md` §2 Ledger schema + forbidden statuses; `loop-nodes/<id>.md` §10 Audit-line emission obligation; `operations-lead-commitment.md` §4 substitute-handler-bench fallback. |
| **Policy** (PRD-equivalent) | What the trust does to mitigate loop-node-automation-failure risk (per-loop-node fallback handler + SLA + rota); how the trust selects + funds + onboards the per-loop-node handlers (Trustee Panel + Operations Lead authority); review-cadence policy fallback; SLA finalization is per-loop-node negotiation (recommended-defaults in `ledger.md` §3 rows are starting points, not commitments). | This `README.md` §6 Review cadence fallback; `loop-nodes/<id>.md` §5-§7; `operations-lead-commitment.md` §2-§5; `ledger.md` §3 (recommended-default SLAs). |
| **Control** (ADR territory) | Specific paging integration per loop node; specific per-loop-node SLA tooling; specific Operations Lead salary range + funding source (Story 0.12 reconciliation); specific substitute-handler-bench rota mechanics; per-Pariwar fallback-handler localization (Epic 1 multi-Pariwar territory); bench-on-leave coverage; SLA breach escalation thresholds; audit-line shape (Story 1.10 closure); per-loop-node-ADR backlog. | This `README.md` §8 Open ADR slots; `loop-nodes/<id>.md` §11 escalation path on SLA breach; cross-references to `docs/knowledge-transfer/adr-index.md` Section I entries. |
| **Gap analysis** (observational) | Synthetic SLA test observes which rota windows are unreachable OR which comms-channel routing fails OR which SLA proved structurally unachievable; quarterly ledger re-attestation observes which named-role positions have lapsed; per-Story-closure rota update observes when a new loop node ships without a rota; on-engagement-event post-mortem observes whether the SLA was met under realistic conditions; monthly rota refresh observes stale contact identities. | `ledger.md` §6 Synthetic SLA test log gap-list rows; §8 Periodic re-attestation log stale-rota rows; §7 Pack-revision log gap-discharge rows; `loop-nodes/<id>.md` §11 SLA-breach-escalation rows. |

The four-way split mirrors Story 0.4 + 0.5 + 0.6 discipline. Per [[feedback_gap_analysis_observational]], the gap-analysis layer does NOT prescribe sprint planning or override architecture — it observes incompleteness/risk and proposes conditional escalation paths; the Trustee Panel + Operations Lead retain decision authority.

## §4 Structural invariants

1. **Named, funded, on-rota fallback handler before loop ships.** Every Phase-1 loop node enumerated in `ledger.md` §3 MUST carry a substantively-named `fallback_handler_role` + a substantive `funding_status` (`retainer-funded` / `salary-funded` / `volunteer-rota-bridge`) + a populated rota row in `rota.md` + a documented `response_time_sla` before the implementing Story's loop ships per UX §0 Stance #6. Pre-substantive-naming, the `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` + `unfunded` + `pending-rota-population` placeholders are valid only as `pending-trustee-ratification` status; status flips to `trustee-signed-off` upon per-loop-node ratification per Task 9 + Task 10.

2. **Ledger rows are append-only with forbidden-removal.** Rows in `ledger.md` §3, `rota.md`, and `backfill-log.md` are append-only. Supersession is the only allowed lifecycle exit — superseding rows reference the prior row id and explain the supersession rationale per `ledger.md` §7 Pack-revision log. Silent removal is forbidden (mirrors Story 0.3 + 0.4 + 0.5 + 0.6 inventory-row-forbidden-removal discipline).

3. **Per-loop-node entries are version-controlled per substantive revision.** Each substantive revision to a `loop-nodes/<id>.md` file (SLA window change, role change, escalation path change, comms-channel change) is logged as a `.decision-log.md` `[OPS]` entry referencing the prior version per the supersession schema. Routine maintenance (typo fixes, cross-reference broken-link repairs) is exempt.

4. **Rota contact identities are NDA territory.** Substantive `primary_handler_contact_ref` + `secondary_handler_contact_ref` values are NDA-protected, need-to-know per the Story 0.6 engineer-roster precedent. The framework commits only the `<NDA — see operations-policy>` placeholder; substantive identity is stored out-of-band per operations policy + recorded with a redacted-identity hash + last-engagement-event-date for accountability.

5. **Audit-line emission obligation per loop-node-entry §10.** Every fallback-handler engagement event (paging trigger → handler ack → first action → completion or escalation) emits an audit line per architecture Cross-Cutting #2 + #9 carrying loop-node id + handler identity + trigger event + outcome. The Story 1.10 audit-log mechanism is the substrate; pre-Story-1.10 closure, the audit-line emission obligation is committed property + procedure shape; substantive emission lands at Story 1.10 closure.

6. **Paging surface is the comms-channel column.** Each per-loop-node entry's §8 cross-links to a `docs/degradation-policy/comms-templates/` template (`push-channel.md` / `whatsapp-channel.md` / `sms-channel.md` / `email-channel.md` / `helpline-inbound` / `public-page-banner.md`). The framework does NOT inline phone numbers or specific paging integrations — those are operations-policy ADR territory per [[feedback_architecture_vs_adr_boundary]] (paging-integration ADR slots reserved in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7).

7. **No punitive auto-action toward members per UX Stance #5.** The SLA is for **staff fallback handlers**, NOT for members. SLA breaches escalate to Operations Lead + Trustee Panel chair + Story 0.6 backup engineer (third-tier) per per-loop-node entry §11 — never trigger punitive action against members (no auto-suspend, no punitive-timer pattern). The framework's `response_time_sla` column is one-way: it constrains staff response, not member engagement.

8. **Operations Lead is the framework co-owner (NOT a deferrable nice-to-have).** The Operations Lead role co-owns the fallback-handler ledger with the Trustee Panel per `operations-lead-commitment.md` §2. The substitute-handler-bench fallback per §5 below is the *explicit-deferral-with-rationale* path if the Operations Lead hire is deferred — never a silent omission. The substitute-bench is a degraded-mode close per [[feedback_closure_language_precision]], NOT discharge of UX-DR4.

9. **The ledger is admin-accessible per AC-1.** At v1, "admin-accessible operations runbook" means the trustee-accessible repository serving `docs/fallback-handler-ledger/` (cross-referenced from `docs/runbooks/README.md`'s "Related runbooks expected from other stories" table per Story 0.7 Task 7). Once a member-facing operations runbook surface ships post-v1, the cross-reference points at that surface; the framework files remain canonical.

10. **No member-PII inlined in the framework.** Per architecture §1.5 PII-shielding + the Story 0.6 NDA territory discipline (invariant 4 above), the framework concerns staff fallback roles + paging surfaces, not member identity. Member-PII references are forbidden in `ledger.md`, `loop-nodes/<id>.md`, `rota.md`, `operations-lead-commitment.md`, and `backfill-log.md`. Member-class identifiers in failure-mode descriptions are limited to the role-archetype labels (Ravi, Sushil, Sunita, Anita, Vikram, Reena) committed in PRD §1 + UX spec §0.

11. **Forbidden statuses.** The following are framework violations: silent trustee ratification (no `.decision-log.md` `[OPS]` entry); a `ledger.md` §3 row without a `comms_channel` cite; a `ledger.md` §3 row without a `surface_inventory_xref` cite (the loop node MUST identify which `docs/degradation-policy/surface-inventory.md` rows it covers, even if the cite is "none in surface-inventory.md at author-commit; surface-inventory amendment is the implementing Story's territory" — kyc-fallback and peer-mesh are the canonical examples of this case at author-commit, and any future loop node where no surface-inventory row covers the node at author-commit may use the same form); row removal (use supersession per invariant 2); a per-loop-node entry without §10 audit-line emission obligation language; a `rota.md` row without `loop_node_id` or without `pending-rota-population` (or substantive contact-ref); inlining of substantive contact identity in `rota.md` (NDA violation per invariant 4); inlining of member-PII (per invariant 10).

## §5 Sign-off lifecycle

**Trustee ratification gate.** Per AC-1, the populated ledger requires **≥2-trustee sign-off** before the AC-1 ≥2-trustee-sign-off-leg closes (Task 10). The Trustee Panel selects the ratification mode:

- **Pack-as-a-unit ratification (default)** — all eight loop nodes ratified together as a single ratification event. Recorded in `ledger.md` §5 Trustee ratification log with one row carrying the pack-ratification timestamp + ratifying-trustee identities + signature lines.
- **Per-loop-node ratification** — Trustee Panel discretion to ratify ready loop nodes while deferring others (e.g., if a per-loop-node-handler candidate is still in onboarding). Each per-loop-node ratification is a separate `ledger.md` §5 row carrying the loop-node-id + ratification timestamp + ratifying-trustee identities + signature lines. The unratified loop nodes remain `pending-trustee-ratification` per `ledger.md` §3 status column.

**Pack-as-a-unit is the default**; per-loop-node mode requires Trustee Panel chair invocation per the mode-tie-breaking precedent inherited from Story 0.5 + 0.6 README §5.

**Quorum-unavailable fallback path** (mirrors Story 0.5 + 0.6 quorum-unavailable fallback): emergency single-trustee ratification is valid under documented trustee incapacitation (illness, unreachability, recusal), time-bounded 90 days, recorded as a `.decision-log.md` `[OPS]` entry. At 90 days, a second trustee MUST ratify (or the original ratification is reversed); the second-trustee ratification is its own `.decision-log.md` `[OPS]` entry per the supersession schema. The 90-day expiry is hard: a single-trustee ratification not co-signed within 90 days is treated as **lapsed**. The Trustee Panel chair is the named owner of the 90-day review obligation; the triggering `.decision-log.md` `[OPS]` entry MUST include a calendar-reminder notation for the 90-day co-sign deadline. At lapse, the Trustee Panel chair conducts a manual expiry review: if the second trustee is now available, co-sign proceeds immediately per the supersession schema; if not, the relevant `ledger.md` §3 row(s) revert to `pending-trustee-ratification` status. Lapse affects governance status going forward only — historical fallback-handler actions already performed under the valid single-trustee ratification during the 90-day window remain valid and are not retroactively undone.

**Operations-Lead-unavailable fallback path.** If the Operations Lead hire is deferred (Trustee Panel decides funding cannot support v1, OR no qualified candidate within the launch window, OR Operations Lead hire formally postponed pending Story 0.12 P0-3 spec-to-cadence reconciliation), the trust commits to a **substitute-handler-bench fallback** per `operations-lead-commitment.md` §4: (a) Trustee Panel + Story 0.6 backup engineer + named trustee-on-rota collectively cover the eight loop nodes' fallback obligation at degraded operational responsiveness (longer SLAs; per-loop-node coverage may concentrate on a subset of trustees with explicit-deferral-with-rationale per [[feedback_closure_language_precision]]); (b) the substitute-bench bridge is time-bounded 90 days from formal ratification, renewable; (c) the substitute-bench bridge does NOT discharge UX-DR4 — the launch-gate property "named, funded, on-rota fallback handler" remains in **explicit-deferral-with-rationale** status; (d) substitute-bench renewals require a new `.decision-log.md` `[OPS]` entry (no auto-roll-over) to force the panel to confront whether the Operations Lead hire can finally happen each quarter; (e) Story 0.12 P0-3 spec-to-cadence reconciliation is the appropriate forum for long-term funding-decision resolution. Per Open Question #4 in the Story 0.7 file, the no-auto-roll-over discipline is the recommended posture.

## §6 Review cadence fallback

The framework requires ongoing maintenance to remain operational. The review cadence:

- **Monthly per-loop-node rota refresh** — Operations Lead (or substitute-bench representative) reviews `rota.md` for stale contact identities, rota-window shifts, on-leave coverage; logs the refresh as a new entry in `ledger.md` §8 Periodic re-attestation log. Routine refreshes (window-shift, contact-info update) are Operations Lead authority per Open Question #3 recommended posture; substantive changes (SLA changes, role-name changes, funding-status changes) require ≥1-trustee co-sign.

- **Quarterly ledger re-attestation** — Trustee Panel + Operations Lead jointly re-attest the populated `ledger.md` per quarter; each re-attestation is a `.decision-log.md` `[OPS]` entry + a `ledger.md` §8 row; re-attestation may flip the `ledger.md` §3 status column from `trustee-signed-off` back to `pending-trustee-ratification` if a per-loop-node-row revision is needed (per-loop-node-handler turnover, funding-posture change, SLA revision based on operational data).

- **Annual ledger renewal** — Trustee Panel re-ratifies the entire ledger annually per the §5 sign-off lifecycle; recorded as a `.decision-log.md` `[OPS]` entry + a `ledger.md` §5 row; renewal may include schema amendments per the supersession schema. **Quorum-unavailable fallback for annual renewal:** the same emergency single-trustee path per §5 applies — emergency single-trustee annual renewal is valid under documented trustee incapacitation, time-bounded 90 days, requiring second-trustee co-sign within 90 days per the §5 procedure (including the 90-day calendar-reminder obligation in the triggering `.decision-log.md` entry). A missed annual renewal does NOT auto-revert `trustee-signed-off` rows; instead, it triggers a manual review by the Trustee Panel chair within 30 days of the missed renewal date, recorded as a `.decision-log.md` `[OPS]` entry.

- **Per-architectural-amendment loop-node-inventory refresh** — if architecture amends AR-61 or Cross-Cutting #9 (e.g., loop-node taxonomy change, new loop node introduced, escalation-trigger taxonomy revision), the loop-node inventory in `ledger.md` §3 is refreshed within 30 days; refresh is logged in `ledger.md` §7 Pack-revision log + cross-referenced from the architectural amendment's `.decision-log.md` `[GOV]` entry.

- **Per-Story-closure rota update** — when a new Phase-1 loop node ships (e.g., a future Story introduces an automation surface that requires a fallback handler), the rota is updated within 30 days of the Story's closure; the loop-node-inventory row is appended per the supersession schema; cross-referenced from the implementing Story's closure-event `.decision-log.md` entry.

- **On-engagement-event post-mortem** — after every real-world fallback-handler engagement event (paging triggered → handler responded → action taken), the Operations Lead conducts a post-mortem within 7 days; outcome logged in `ledger.md` §8 Periodic re-attestation log + (if SLA breached or gap surfaced) a `ledger.md` §7 Pack-revision log row + a remediation plan.

The cadence is **operating discipline**, not a hard schedule — deferrals are valid with explicit-deferral-with-rationale per [[feedback_closure_language_precision]] (e.g., "monthly rota refresh deferred 30 days pending Operations Lead onboarding completion; revisit trigger: Operations Lead first day in role").

## §7 Ledger-vs-per-loop-node-file reconciliation

The `ledger.md` is the **authoritative index + status registry**: the eight-row table summarizing each loop node's loop-node-id + role + funding + SLA + status + rota cross-link + comms-channel + surface-inventory backfill citations. The `loop-nodes/<id>.md` files are the **authoritative substantive procedure + SLA semantics**: §1-§12 per the per-loop-node schema (identity → primary actor → failure modes → fallback actor → funding posture → SLA → rota → comms → surface-inventory backfill → audit-line emission → escalation path → cross-references).

**Reconciliation discipline:**

- **Status column** (`ledger.md` §3) is authoritative for ratification status; a per-loop-node entry's §1-§12 content may evolve, but the ratification status lives in the ledger.
- **SLA recommended-default** (`ledger.md` §3 `response_time_sla` column) carries the one-liner; the per-loop-node entry's §6 SLA carries the rationale subsection (loop-node-specific; the per-loop-node entry is authoritative for the substantive SLA semantics + the deterministic pass/fail signal). When the Trustee Panel ratifies an amended SLA at Task 9 / Task 10, both the ledger row + the per-loop-node entry are updated; the amendment is logged in `ledger.md` §7 Pack-revision log per the supersession schema.
- **Substantive procedure** (paging trigger sequence, ack-response procedure, first-action procedure, completion-or-escalation procedure) lives in the per-loop-node entry §§3-§7-§11; the ledger row's `surface_inventory_xref` + `comms_channel` + `contact_rota_cite` are the index pointers, not substitutes for the substantive procedure.
- **Substantive contact identity** (substantive `primary_handler_contact_ref` + `secondary_handler_contact_ref`) lives in `rota.md`, NOT in `ledger.md` or `loop-nodes/<id>.md` (per invariant 4 NDA discipline).
- **Revisions to per-loop-node files are logged in `ledger.md` §7 Pack-revision log** per the Story 0.4 + 0.5 + 0.6 supersession-schema precedent.

## §8 Open ADR slots

The framework reserves the following ADR slots for sub-architectural specification. Each slot is enumerated in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7, marked `slot-reserved-pre-write` until the corresponding ADR is authored.

| Slot | Owning framework / loop node | Trigger to author | Notes |
|---|---|---|---|
| Paging-integration surface per loop node | Each `loop-nodes/<id>.md` (8 slots — one per Phase-1 loop node) | Operations Lead hire + per-loop-node paging-tool selection | The specific WA / SMS / helpline-inbound / push integration tool (Twilio? MSG91? Exotel? in-house? — substrate choice is deferred ADR territory per [[feedback_architecture_vs_adr_boundary]]) |
| Per-loop-node SLA tooling | Each `loop-nodes/<id>.md` (8 slots) | Operations Lead hire + per-loop-node SLA-tracking-tool selection | The specific SLA-tracking + alerting tool (PagerDuty? OpsGenie? in-house? — substrate choice is deferred ADR territory) |
| Operations Lead salary range + funding source | `operations-lead-commitment.md` (1 slot — Story 0.12 reconciliation territory) | Story 0.12 P0-3 spec-to-cadence reconciliation closes | The salary range + funding source is a Trustee Panel funding-decision territory; the framework commits the property (Operations Lead is needed; substitute-bench is the explicit-deferral fallback), not the specific salary |
| Substitute-handler-bench rota mechanics | `operations-lead-commitment.md` §4 (1 slot — README §5 territory) | Trustee Panel ratifies substitute-bench path per Task 8 path (b) | Specific bench-composition + rota-rotation + handoff protocol if the Operations Lead hire is deferred |
| Per-Pariwar fallback-handler localization | This framework (1 slot — Epic 1 multi-Pariwar territory) | Epic 1 multi-Pariwar provisioning lands | Per-Pariwar variation in fallback-handler roles, funding postures, rota cadences as Pariwar count grows |
| Bench-on-leave coverage mechanism | This framework (1 slot) | First Operations Lead leave event OR first substantive bench-member leave | How the framework handles short-term unavailability of named fallback handlers (PTO, illness, conflict-of-interest recusal) |
| SLA breach escalation thresholds | This framework (1 slot) | First N synthetic SLA test failures OR first N real-world SLA breaches | Threshold (≥N breaches in M months) at which the framework triggers per-loop-node SLA revision OR per-loop-node-handler replacement |
| Audit-line shape per Story 1.10 closure | Each `loop-nodes/<id>.md` §10 (1 framework-level slot + 8 per-loop-node sub-slots) | Story 1.10 tamper-evident audit log primitive closes | The hash-chained audit-line shape + field schema for fallback-handler engagement events |
| Per-loop-node-ADR backlog (slot-reserved-pre-write) | Each `loop-nodes/<id>.md` (8 slots — one per Phase-1 loop node) | Per-loop-node SLA / rota / funding / paging substrate requires sub-architectural specification | A per-loop-node ADR slot is reserved so per-loop-node ADRs can be authored without re-deriving the slot-reservation pattern |

**Total Section I slots at author-commit: 30 slots** (1 paging × 8 + 1 SLA tooling × 8 + 1 OL salary + 1 substitute-bench mechanics + 1 multi-Pariwar localization + 1 bench-on-leave + 1 SLA-breach thresholds + 1 audit-line shape + 1 per-loop-node-ADR × 8 = 30, cross-referenced in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7). **Arithmetic note:** the "audit-line shape" row in the table describes "(1 framework-level slot + 8 per-loop-node sub-slots)"; the 8 per-loop-node audit-line sub-slots are absorbed within the "1 per-loop-node-ADR × 8" count — each per-loop-node-ADR backlog slot accommodates the loop-node-specific audit-line sub-slot as a sub-item, not a separate top-level slot. The total of 30 is verifiable by counting table rows: 8 (paging) + 8 (SLA tooling) + 1 (OL salary) + 1 (substitute-bench mechanics) + 1 (multi-Pariwar) + 1 (bench-on-leave) + 1 (SLA-breach thresholds) + 1 (audit-line shape, framework-level) + 8 (per-loop-node-ADR, including per-loop-node audit-line sub-slots) = 30.

## §9 Related continuity surfaces

| Framework | Owning Story | Cross-link |
|---|---|---|
| Operational runbooks | Story 0.1 | `docs/runbooks/` (READY runbooks + operational-readiness-ledger + Re-sign protocol; `docs/runbooks/README.md` Related runbooks expected from other stories table cites this framework per Story 0.7 Task 7) |
| Credential escrow | Story 0.2 | `docs/escrow/` (credential-inventory + escrow-ledger + quorum-open procedure; the `backup-engineer-access-credentials` inventory row is owned by Story 0.6) |
| Code escrow + mirror | Story 0.3 | `docs/escrow/code-escrow/` (mirror-config + restoration-drill-playbook + mirror-attestation ledger) |
| Per-surface degradation policy | Story 0.4 | `docs/degradation-policy/` (surface-inventory + comms-templates + table-top-exercise + ledger + README; the `fallback_handler` column citation contract is discharged by this framework via `backfill-log.md`) |
| Knowledge-transfer documentation pack | Story 0.5 | `docs/knowledge-transfer/` (KT pack + adr-directory-scaffold + adr-index + on-call-playbook + sign-off-ledger; `adr-index.md` Section I catalogs this framework's open ADR slots per §8 above) |
| Backup engineer | Story 0.6 | `docs/backup-engineer/` (contract-template + scope-of-work + access-grant-procedure + activation-procedure + onboarding-checklist + sign-off-ledger; backup engineer is the **third-tier escalation** per `loop-nodes/<id>.md` §11 — NOT the primary fallback handler; distinct mitigation portfolio per §10 below) |
| **Fallback-handler ledger (this framework)** | **Story 0.7** | **`docs/fallback-handler-ledger/` (this framework) — README + ledger + loop-nodes/ × 8 + rota + operations-lead-commitment + backfill-log** |

## §10 30-day-takeover joint-discharge — disjoint anchor

**This framework does NOT contribute to the 30-day-takeover joint-discharge.** The 30-day-takeover joint-discharge anchor (per Story 0.3 Decision 003 + Story 0.4 Decision 004 + Story 0.5 Decision 005 + Story 0.6 Decision 006 Open Follow-ups) is the **bus-factor-of-one mitigation portfolio** anchor — the property "the trust survives Solo Builder unavailability >7 days and a backup engineer can take over within 30 days" — discharged jointly by Stories 0.1 (runbooks) + 0.2 (credential escrow) + 0.3 (code escrow + mirror) + 0.4 (degradation policy) + 0.5 (KT pack) + 0.6 (backup engineer arrangement).

**This framework is the parallel portfolio.** Story 0.7 is the **loop-node operational-responsiveness portfolio** — the property "every Phase-1 loop node has a named, funded, on-rota fallback handler reachable within SLA when automation fails" — discharged by this framework alone.

**The two portfolios have disjoint closure semantics:**

- **Bus-factor portfolio closes** the property "the trust survives Solo Builder unavailability >7 days" — discharge sufficient when Stories 0.1-0.6 each reach `done` AND the joint-discharge attestation per Story 0.6 Decision 006 Open Follow-up closes
- **Loop-node portfolio closes** the property "every Phase-1 loop node has a named, funded, on-rota fallback handler reachable within SLA when automation fails" — discharge sufficient when Story 0.7 reaches `done` (Tasks 1-11 closure) AND each of the eight loop nodes has Task 11 synthetic SLA test closure AND UX-DR4 + AR-49 P0-1 Launch Gate Risks row are discharged per the supersession schema

A trust with the bus-factor portfolio fully discharged but the loop-node portfolio undischarged ships Phase-1 with automation-failure leaving members stranded. A trust with the loop-node portfolio fully discharged but the bus-factor portfolio undischarged ships Phase-1 with loop-nodes-staffed but unable to survive Solo Builder absence. **Both are required for Phase-1 launch readiness** — both portfolios are gating per their respective launch-gate properties.

**Backup engineer is third-tier escalation per `loop-nodes/<id>.md` §11**, NOT the primary fallback handler — the backup engineer's role per Story 0.6 is bus-factor-of-one continuity (the engineering layer), not loop-node operational responsiveness (the operations layer). The cross-link from Story 0.6 framework to this framework's per-loop-node entry §11 escalation path is the only operational-runtime tie between the two portfolios; the closure semantics remain disjoint.

## §11 Domain glossary

- **P0-1** — Phase-0 launch-blocker priority 1 (UX spec line 97 + epics line 374). The fallback-handler-named launch gate.
- **UX-DR4** — UX Design Requirement #4 (epics line 374) — "P0-1 fallback-handler-named launch gate"; the launch-gate property that this framework's Tasks 1-11 closure discharges.
- **AR-61** — Architectural Requirement #61 (architecture line 349) — "Staff-fallback at every node — every loop node carries `{primary_actor, fallback_actor, escalation_trigger}`. P0-1 gates Phase 1."
- **AR-49** — Architectural Requirement #49 (architecture line 4781, P0-1 Launch Gate Risks row) — "P0-1 Lifecycle Operational-State Coverage | BigDev | UX"; the launch-gate-risks table row that Story 0.7 Task 11 closure discharges.
- **Loop node** — a discrete automation surface in a v1 trust loop where the software path can fail and a staff fallback is required. The eight Phase-1 loop nodes: claim-filing, peer-mesh, ground-inspection, reconciliation, helpdesk, denial-appeal, kyc-fallback, upi-failure-coach.
- **Fallback handler** — the named staff role responsible for picking up the work when a loop node's automation path fails, paged via the published rota, responding within the documented SLA.
- **Rota** — the contact-rotation schedule per loop node, mapping rota windows to primary + secondary fallback-handler contact references. Substantive contact identity is NDA territory.
- **SLA** — Service Level Agreement: the acknowledgment + first-action + completion windows committed per loop node. The SLA is for staff fallback handlers per UX Stance #5, NOT for members.
- **Operations Lead** — the role co-owning the fallback-handler ledger with the Trustee Panel per `operations-lead-commitment.md` §2. Recommended pre-launch hire per UX §Phase-0 Operational Ownership Note.
- **Substitute-handler-bench** — the explicit-deferral fallback per `operations-lead-commitment.md` §4 if the Operations Lead hire is deferred. Trustee Panel + Story 0.6 backup engineer + named trustee-on-rota collectively cover the eight loop nodes at degraded operational responsiveness; time-bounded 90 days, renewable.
- **Primary actor** — the actor (member app, automated cron, helpline operator, field worker) whose software-or-staff path is the default-mode path for a loop node when the software works.
- **Fallback actor** — the staff role taking over when the primary actor's path fails. Names the role (Helpline Operator, claim-shepherd staff, peer-mesh coordinator, field-worker dispatch supervisor, reconciliation triage on-call, helpdesk on-call, appeal-shepherd, manual KYC reviewer, contribution-loop staff) — substantive role identity is `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` at author-commit.
- **Escalation trigger** — the event that triggers the fallback actor's engagement: `automation-failure-detected` / `automation-timeout-exceeded` / `automation-precondition-failure` / `user-initiated-escalation` / `external-dependency-outage` (hybrid taxonomy per Open Question #7 recommended posture; per-loop-node free-text qualifier permitted).
- **Surface-inventory backfill** — the `docs/degradation-policy/surface-inventory.md` `fallback_handler` column citation contract; every `P0-1-pending` placeholder row MUST cite a P0-1 ledger row once this framework closes. Citation slot is committed at Story 0.7 author-commit via `backfill-log.md`; substantive textual replacement is Task 9 territory.
- **Comms-template citation** — the cross-link from each per-loop-node entry's §8 to a `docs/degradation-policy/comms-templates/` template file (`push-channel.md` / `whatsapp-channel.md` / `sms-channel.md` / `email-channel.md` / `public-page-banner.md` / `helpline-inbound`).
- **Audit-line emission** — every fallback-handler engagement event emits an audit line per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate, carrying loop-node id + handler identity + trigger event + outcome.

## §12 File index

Files in this framework (author-committed 2026-05-30 per Story 0.7 Tasks 1-7):

- `README.md` (this file) — framework rationale, lifecycle, four-way discipline, invariants, sign-off lifecycle, review cadence, reconciliation, open ADR slots, related continuity surfaces, disjoint anchor, glossary, file index
- `ledger.md` — eight per-loop-node ledger rows + schema + per-event logs (Operations Lead authorization, Trustee ratification, Synthetic SLA test, Pack-revision, Periodic re-attestation, Backfill log cross-references, Cross-links into related framework ledgers)
- `loop-nodes/claim-filing.md` — Epic 6 Stories 6.2 + 6.3 — Helpline Operator + claim-shepherd fallback
- `loop-nodes/peer-mesh.md` — Epic 6 Story 6.6 — peer-mesh coordinator fallback
- `loop-nodes/ground-inspection.md` — Epic 6 Story 6.7 — field-worker dispatch supervisor + District Admin fallback
- `loop-nodes/reconciliation.md` — Epic 9 Stories 9.1 + 9.4 + 9.7 + 9.8 — reconciliation triage on-call + Sunita-class nominee staff-takeover fallback
- `loop-nodes/helpdesk.md` — Epic 10 Stories 10.2 + 10.3 + 10.4 — Helpline shift supervisor + helpdesk on-call fallback
- `loop-nodes/denial-appeal.md` — Epic 6 Story 6.16 — State Trustee + appeal-shepherd fallback
- `loop-nodes/kyc-fallback.md` — Epic 3 Story 3.3b — manual KYC reviewer fallback
- `loop-nodes/upi-failure-coach.md` — Epic 8 Story 8.5 — contribution-loop staff support + helpline operator fallback
- `rota.md` — per-loop-node rota schedule (schema-only at author-commit; `pending-rota-population` rows; substantive population is Task 10 territory)
- `operations-lead-commitment.md` — UX §Phase-0 Operational Ownership Note operationalization (commitment + decision path + substitute-handler-bench fallback)
- `backfill-log.md` — 23 P0-1-pending citation-slot rows discharging the Story 0.4 framework + `_bmad-output/implementation-artifacts/deferred-work.md` placeholders (citation slots committed at author-commit; substantive textual replacement is Task 9 territory)

External references:

- `.decision-log.md` — Decision 2026-05-30-007 appended at top of Decisions section per Story 0.7 Task 7
- `docs/knowledge-transfer/adr-index.md` — Section I appended with 30 ADR slot rows per Story 0.7 Task 7
- `docs/runbooks/operational-readiness-ledger.md` — new "Fallback-handler-ledger framework coverage" section appended before "Re-sign protocol" per Story 0.7 Task 7
- `docs/runbooks/README.md` — new row appended to "Related runbooks expected from other stories" table per Story 0.7 Task 7
- `docs/degradation-policy/README.md` — line 162 row update + §11 30-day takeover joint-discharge anchor Notes-clarification per Story 0.7 Task 7
- `docs/degradation-policy/surface-inventory.md` — Schema notes (lines 18 + 34) Notes-clarification (existing row data NOT modified at author-commit; substantive textual P0-1-pending → named-role replacement is Task 9 territory)
- `docs/degradation-policy/degradation-policy-ledger.md` — line 184 row update per Story 0.7 Task 7
- `docs/degradation-policy/table-top-exercise.md` — lines 50 + 54 + 101 cross-reference updates per Story 0.7 Task 7
- `docs/degradation-policy/comms-templates/email-channel.md` — line 20 cross-reference update per Story 0.7 Task 7
- `docs/backup-engineer/README.md` — Notes-clarification on Story 0.7 parallel-portfolio distinction per Story 0.7 Task 7
- `docs/backup-engineer/scope-of-work.md` — §3 Notes-clarification on backup engineer third-tier escalation role per Story 0.7 Task 7
- `_bmad-output/implementation-artifacts/deferred-work.md` — line 50 Notes-column append on `{fallback_handler_phone}` row per Story 0.7 Task 7
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story 0.7 status flipped backlog → ready-for-dev → in-progress → review per Story 0.6 precedent
