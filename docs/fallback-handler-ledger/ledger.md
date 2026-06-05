# Fallback-Handler Ledger

**Authority:** AR-61 (architecture line 349, anchored at lines 296-298 Cross-Cutting #9) — "Staff-fallback at every node — every loop node carries `{primary_actor, fallback_actor, escalation_trigger}`; P0-1 gates Phase 1" + UX-DR4 (epics line 374) — "P0-1 fallback-handler-named launch gate" + UX §0 Stance #6 (UX spec line 91) — "No loop node ships without a named, funded, on-rota fallback handler" + UX §Phase-0 P0-1 launch-blocker statement (UX spec line 97) + AR-49 P0-1 Launch Gate Risks row "P0-1 Lifecycle Operational-State Coverage | BigDev | UX" (architecture line 4781).

**Status:** Author-committed 2026-05-30; awaiting trustee ratification + Operations Lead hire OR substitute-handler-bench formal ratification.

**Reading guide:** §1 Header + authority cites; §2 Ledger schema + allowed-values + forbidden statuses; §3 Loop-node ledger rows (8 rows); §4 Operations Lead authorization log; §5 Trustee ratification log; §6 Synthetic SLA test log; §7 Pack-revision log; §8 Periodic re-attestation log; §9 Backfill log cross-references; §10 Cross-links into related framework ledgers.

---

## §1 Header

**Framework:** Fallback-Handler Ledger (this framework — `docs/fallback-handler-ledger/`).

**Authority cites:**

- AR-61 "Staff-fallback at every node" — architecture line 349, anchored at lines 296-298 (Cross-Cutting #9): "Account State Machine drives screen-mode parameters; every loop node carries `{primary_actor, fallback_actor, escalation_trigger}`. P0-1 gates Phase 1." Each row in §3 below populates the `{primary_actor, fallback_actor, escalation_trigger}` triple per AR-61.
- UX-DR4 — epics line 374: "P0-1 fallback-handler-named launch gate — every Phase-1 loop node has a named, funded, on-rota `fallback_handler` role assigned with SLA + contact rota published before that loop ships." Closure of this ledger (Tasks 1-11 per Story 0.7) discharges UX-DR4.
- UX §0 Stance #6 — UX spec line 91: "No loop node ships without a named, funded, on-rota fallback handler." This stance is the foundational property that this ledger discharges.
- UX §Phase-0 P0-1 launch-blocker statement — UX spec line 97: "Every Phase-1 loop node has a named, funded, on-rota `fallback_handler` role assigned, with SLA + contact rota published."
- AR-49 P0-1 Launch Gate Risks row — architecture line 4781: "P0-1 Lifecycle Operational-State Coverage | BigDev | UX". Story 0.7 Task 11 closure for all eight loop nodes discharges this row.

**Owning Story:** 0.7 (P0-1 Fallback-Handler Ledger Published with SLA + Rota).

**Status:** `Author-committed; awaiting trustee ratification + Operations Lead hire or substitute-handler-bench formal ratification`.

**Cross-cutting commitments anchored on this ledger:**

- Epic 6 line 2267 — cross-cutting AR-61: "Every claim-flow story (6.2, 6.3, 6.5, 6.6, 6.7, 6.10, 6.11, 6.12, 6.14, 6.16) carries a staff-fallback path per Story 0.7's fallback-handler ledger; the ledger is referenced rather than re-implemented per-story."
- Architecture Cross-Cutting #9 — Staff-fallback at every node; every loop node carries `{primary_actor, fallback_actor, escalation_trigger}`; P0-1 (Story 0.7) gates Phase 1.
- Story 0.4 surface-inventory.md `fallback_handler` column citation contract — `P0-1-pending` placeholders cite ledger rows per §3 below once Story 0.7 closes; citation slots committed in `backfill-log.md` at author-commit.

## §2 Ledger schema

Each row in §3 below carries the following columns, per AC-1 of Story 0.7:

| Column | Meaning | Allowed values |
|---|---|---|
| `loop_node_id` | Canonical kebab-case slug per loop node | `claim-filing` \| `peer-mesh` \| `ground-inspection` \| `reconciliation` \| `helpdesk` \| `denial-appeal` \| `kyc-fallback` \| `upi-failure-coach` |
| `node_description` | One-line description grounded in epic + UX surface authority | Free text; must cite an epic / UX line for the descriptive authority |
| `owning_epic + stories` | The implementing Stories that ship the node (this ledger does NOT ship them) | Free text; must enumerate Epic # + Story #s; one loop node may be owned by multiple Stories |
| `primary_actor` | The default-mode actor for the node when the software works (per AR-61) | Free text; one of: member app (Ravi-mode), automated cron, helpline operator, field worker, automated coach, DigiLocker (external dependency), peer-mesh evaluator, appeal-stage reviewer; per-loop-node free-text qualifier permitted |
| `fallback_actor` | The staff role taking over when the primary actor's path fails (per AR-61) | Free text; one of: Helpline Operator + claim-shepherd staff, peer-mesh coordinator, field-worker dispatch supervisor + District Admin, reconciliation triage on-call + Sunita-class nominee staff-takeover, Helpline shift supervisor + helpdesk on-call, State Trustee + appeal-shepherd, manual KYC reviewer, contribution-loop staff support + helpline operator; per-loop-node free-text qualifier permitted |
| `escalation_trigger` | The event that triggers the fallback actor's engagement (per AR-61) | Enumerated values + per-loop-node free-text qualifier (hybrid taxonomy per Open Question #7): `automation-failure-detected` \| `automation-timeout-exceeded` \| `automation-precondition-failure` \| `user-initiated-escalation` \| `external-dependency-outage`; loop-node-specific qualifier permitted (e.g., "DigiLocker downtime OR signature-verification failure") |
| `fallback_handler_role` | Named staff role responsible for the fallback engagement | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` at author-commit per `[deferred ADR — placeholder procedure]` discipline; substantive role name lands at Task 9 closure |
| `funding_status` | Funding posture of the fallback handler position | `unfunded` (author-commit default) \| `retainer-funded` \| `salary-funded` \| `volunteer-rota-bridge`; substantive funding posture lands at Task 9 closure |
| `response_time_sla` | Acknowledgment window + first-action window per loop node | Free text; format "≤<ack_window> ack / ≤<first_action_window> first action" (e.g., "≤30 min ack / ≤4 hr first action"); per-loop-node negotiation at Task 9; recommended-default committed at author-commit |
| `contact_rota_cite` | File path to `rota.md` section for the loop node | `pending-rota-population` at author-commit; substantive rota cite lands at Task 10 closure (file path or anchor like `rota.md#claim-filing`) |
| `comms_channel` | Paging surface(s) per the comms-templates | Free text; combinations of: `push` (`comms-templates/push-channel.md`) \| `WA` (`comms-templates/whatsapp-channel.md`) \| `SMS` (`comms-templates/sms-channel.md`) \| `helpline-inbound` \| `email` (`comms-templates/email-channel.md`) \| `public-page-banner` (`comms-templates/public-page-banner.md`); per-loop-node entry's §8 carries the substantive template citations |
| `surface_inventory_xref` | The `docs/degradation-policy/surface-inventory.md` rows this loop node's fallback covers | Free text; enumerates the surface-inventory row names (e.g., "Ravi-mode claim filing" + "Helpline Operator console"); one loop node may discharge multiple surface-inventory rows; one surface-inventory row may cite multiple loop nodes per the dispatch shape |
| `status` | Ratification status per the §5 sign-off lifecycle | `pending-trustee-ratification` (author-commit default) \| `trustee-signed-off` \| `fully-staffed` (rota populated + ≥2-trustee sign-off + at least one synthetic SLA test passed) \| `superseded` (the row was superseded by a later row per the supersession schema; the superseding row id is cited in §7 Pack-revision log) |

**Append-only with forbidden-removal rule** (per Story 0.3 + 0.4 + 0.5 + 0.6 inventory-row precedent): rows MUST NOT be removed once added; supersession is the only allowed lifecycle exit. Schema column additions require a `.decision-log.md` `[GOV]` entry; existing column removal is forbidden.

**Factual error correction vs supersession boundary:** A pre-ratification factual error (e.g., wrong source-inventory line number, typographical error in a loop-node-id slug, broken cross-reference URL) may be corrected directly without a `.decision-log.md` `[OPS]` entry, provided the correction does not change the substantive meaning of the row (no role change, no SLA change, no funding-status change). A post-ratification change to any substantive column (`fallback_handler_role`, `funding_status`, `response_time_sla`, `comms_channel`, `surface_inventory_xref`, `status`) IS a supersession and requires a `.decision-log.md` `[OPS]` entry + a `§7 Pack-revision log` row per the supersession schema. If in doubt, treat the change as a supersession — a `.decision-log.md` entry for a trivial correction costs less than a silent substantive change.

**Forbidden statuses:**

- Silent trustee ratification (no `.decision-log.md` `[OPS]` entry for the ratification event) — forbidden
- A row without a `comms_channel` cite — forbidden (every loop node MUST identify its paging surface)
- A row without a `surface_inventory_xref` cite — forbidden (every loop node MUST identify which `docs/degradation-policy/surface-inventory.md` rows it covers, even if the cite is "none in surface-inventory.md at author-commit; surface-inventory amendment is the implementing Story's territory" — kyc-fallback and peer-mesh are examples of this case at author-commit)
- Row removal — forbidden; use supersession per §7 Pack-revision log
- Status flip from `trustee-signed-off` or `fully-staffed` back to `pending-trustee-ratification` without `.decision-log.md` `[OPS]` entry citing the reason (per-loop-node-handler turnover, funding-posture change, SLA revision based on operational data) — forbidden

**Status transition rules:**

- `pending-trustee-ratification` → `trustee-signed-off`: triggered when the Trustee Panel formally ratifies the per-loop-node row per §5 sign-off lifecycle (≥2-trustee sign-off or emergency single-trustee under quorum-unavailable path); requires a `.decision-log.md` `[OPS]` entry + a §5 Trustee ratification log row; Operations Lead (or substitute-bench representative) applies the ledger edit; ≥1-trustee co-sign required per the Open Question #3 recommended posture
- `trustee-signed-off` → `fully-staffed`: triggered when (a) rota is substantively populated per Task 10 AND (b) ≥2-trustee sign-off per §5 is complete AND (c) at least one synthetic SLA test passes per Task 11 for the loop node; requires a `.decision-log.md` `[OPS]` entry recording all three trigger conditions; Operations Lead applies the edit; ≥1-trustee co-sign required
- Any status → `superseded`: triggered when a later row supersedes the current row per the supersession schema; requires a §7 Pack-revision log row + the superseding row's Decision-log entry id

## §3 Loop-node ledger rows

Per-loop-node rows. At Task 9 ≥2-trustee ratification per `.decision-log.md` Decision 2026-06-05-023 (substituting Decision 2026-05-30-007 `pending-trustee-ratification` framework state), each row carries a substantive disposition reflecting the 90-day substitute-handler-bench window (2026-06-05 to 2026-09-03) per Q7.1 + Q7.3 selection. Per Q7.4 / QA.2 per-loop-node disposition table: **4 BENCH rows** (claim-filing + reconciliation + helpdesk + upi-failure-coach) carry `fallback_handler_role = Trustee-on-rota (Dhiraj Rahul primary, Kalpana Bharti secondary)`, `funding_status = volunteer-rota-bridge`, `status = trustee-signed-off-bench-disposition`. **3 BACKUP rows** (ground-inspection + denial-appeal + kyc-fallback) carry `fallback_handler_role = <TO-BE-NAMED-POST-STORY-0.6-TASK-10>`, `funding_status = pending-backup-engineer-contracting`, `status = trustee-deferred-pending-backup-engineer`. **1 BACKLOG row** (peer-mesh) carries `fallback_handler_role = <TO-BE-NAMED-POST-LAUNCH-EVIDENCE>`, `funding_status = pending-operational-evidence`, `status = trustee-deferred-pending-backlog`. Substantive role names + funding postures evolve as Story 0.6 Task 10 closes (BACKUP-tier reassessment) and as post-launch operational evidence materializes (BACKLOG-tier reassessment).

### Row 1: claim-filing

| Column | Value |
|---|---|
| `loop_node_id` | `claim-filing` |
| `node_description` | Member-initiated claim filing for a member's bereavement event (Ravi-mode dual-path: member app OR helpline-mediated; cite UX §1 Trust Loops + Helpline Operator console + Ravi-class member archetype + PRD §9.1.1 highest-stakes surface) |
| `owning_epic + stories` | Epic 6 + Stories 6.2 (claim creation) + 6.3 (claim documentation upload). Cross-cutting AR-61 commitment per Epic 6 line 2267: this row is the staff-fallback path for Story 6.2 + Story 6.3 + downstream Stories 6.5 + 6.10 + 6.11 + 6.12 + 6.14 + 6.16 (claim-flow Stories cite this ledger row rather than re-implementing the staff-fallback path) |
| `primary_actor` | Member app (Ravi-mode) OR Helpline Operator (helpline-mediated) |
| `fallback_actor` | Helpline Operator + claim-shepherd staff |
| `escalation_trigger` | `automation-failure-detected` (claim-creation API failure; document-upload pipeline failure; provider integration failure per architecture §3.4 + Cross-Cutting #9; helpline-mediated path is invoked when member app path fails OR when Ravi-class member archetype cannot complete the app path per UX Helpline Operator console authority) |
| `fallback_handler_role` | `Trustee-on-rota (Dhiraj Rahul primary, Kalpana Bharti secondary)` per Q7.3 substitute-bench composition; Helpline Operator + claim-shepherd staff candidates deferred until post-bench-window per per-Story-evidence + substantive Operations Lead OR backup-engineer landing |
| `funding_status` | `volunteer-rota-bridge` (90-day substitute-bench window 2026-06-05 → 2026-09-03; trustees absorb without retainer/salary line item per Trust capital-preservation rationale per Q7.3) |
| `response_time_sla` | `≤30 min ack / ≤4 hr first action` (recommended-default; rationale: claim filing is highest-stakes/dignity coupling per PRD §9.1.1; the tight ack window is justified by the bereavement-context member-facing-immediacy + Helpline Operator console design assumption that members reach a real human within minutes; per-loop-node entry §6 carries the substantive rationale; **trustee-on-rota meets these SLA targets via direct-line escalation to Dhiraj per Q7.3 rota selection**) |
| `contact_rota_cite` | `rota.md#claim-filing` populated per Q7.3 trustee-on-rota composition (Task 10 substantive backfill) |
| `comms_channel` | `helpline-inbound` + `push` (`comms-templates/push-channel.md`) + `public-page-banner` (`comms-templates/public-page-banner.md`, for cases where the claim landing flows through twt.org public surface) |
| `surface_inventory_xref` | "Ravi-mode claim filing" row (`surface-inventory.md` line 49) + "Helpline Operator console" row (`surface-inventory.md` line 57); two rows discharged |
| `status` | `trustee-signed-off-bench-disposition` per Decision 2026-06-05-023 + Q7.4/QA.2 BENCH assignment; **also selected as Task 11 synthetic SLA test target per Q7.5** |

### Row 2: peer-mesh

| Column | Value |
|---|---|
| `loop_node_id` | `peer-mesh` |
| `node_description` | Automated peer-mesh evaluation per Story 6.6 deterministic-5-nearest-selection (selects peers in proximity to the claim's geographic / Pariwar locality to act as peer-verifier-class for claim documentation review per UX §Peer Mesh) |
| `owning_epic + stories` | Epic 6 + Story 6.6 (peer-mesh evaluator) |
| `primary_actor` | Automated peer-mesh evaluator (Story 6.6 deterministic-5-nearest-selection algorithm) |
| `fallback_actor` | Peer-mesh coordinator (staff role) |
| `escalation_trigger` | `automation-precondition-failure` (5-nearest peers cannot be selected — insufficient Pariwar density OR all candidate peers unreachable / unresponsive within the 24-hr peer-mesh window) + `external-dependency-outage` (peer outreach surface — WA push / push — unavailable) |
| `fallback_handler_role` | `<TO-BE-NAMED-POST-LAUNCH-EVIDENCE>` per Q7.4/QA.2 BACKLOG disposition; substantive ratification deferred until post-launch operational evidence justifies; recommended candidate (peer-mesh coordinator) recorded for re-evaluation trigger |
| `funding_status` | `pending-operational-evidence` per Q7.4/QA.2 BACKLOG disposition; per-Pariwar density volume drives the eventual `volunteer-rota-bridge → retainer-funded` transition |
| `response_time_sla` | `≤2 hr ack / ≤24 hr first action` (recommended-default; rationale: peer-mesh window is the substantive constraint — the 24-hr first-action matches the peer-outreach window; ack window allows for peer-mesh coordinator to be paged during business hours; per-loop-node entry §6 carries the substantive rationale) — **SLA targets ratified-in-principle but NOT operative under BACKLOG disposition; activation depends on post-launch evidence** |
| `contact_rota_cite` | `pending-rota-population` (BACKLOG disposition; rota population deferred until post-launch evidence triggers re-evaluation) |
| `comms_channel` | `WA` (`comms-templates/whatsapp-channel.md`) + `push` (`comms-templates/push-channel.md`) |
| `surface_inventory_xref` | None in `surface-inventory.md` at author-commit (peer-mesh-specific surface not yet enumerated); surface-inventory amendment is Story 6.6 territory at closure |
| `status` | `trustee-deferred-pending-backlog` per Decision 2026-06-05-023 + Q7.4/QA.2 BACKLOG assignment |

### Row 3: ground-inspection

| Column | Value |
|---|---|
| `loop_node_id` | `ground-inspection` |
| `node_description` | Field-worker (Vikram-class) ground-inspection of claim circumstances per Story 6.7 ground-inspection workflow (member-bereavement context requires on-site verification of the claim per UX §Ground Inspection + Vikram-class member-archetype + PRD §9.3 field-worker comp constraint) |
| `owning_epic + stories` | Epic 6 + Story 6.7 (ground-inspection workflow); cross-cuts Story 13.3 field-worker dispatch app |
| `primary_actor` | Field-worker (Vikram-class) dispatched via field-worker dispatch app |
| `fallback_actor` | Field-worker dispatch supervisor + District Admin role |
| `escalation_trigger` | `automation-precondition-failure` (field-worker unreachable; field-worker dispatch app sync failure) + `automation-failure-detected` (inspection-scheduling failure; Vikram-class member archetype WA reach failure per UX surface-priority Tier 2) |
| `fallback_handler_role` | `<TO-BE-NAMED-POST-STORY-0.6-TASK-10>` per Q7.4/QA.2 BACKUP disposition; recommended candidates (Field-worker dispatch supervisor + District Admin per Story 0.4 surface-inventory.md line 60) deferred to backup-engineer-contracting + Operations-Lead-eventual-hire |
| `funding_status` | `pending-backup-engineer-contracting` per Q7.4/QA.2 BACKUP disposition; recommended posture (retainer-funded for dispatch supervisor + salary-funded for District Admin) deferred to Story 0.6 Task 10 closure |
| `response_time_sla` | `≤4 hr ack / ≤48 hr first action` (recommended-default; rationale: ground inspection is field-time-constrained — dispatch supervisor can re-route within hours but the 48-hr first-action accounts for travel + inspection-window negotiation with the member's family per UX Vikram-class workflow; per-loop-node entry §6 carries the substantive rationale) — **SLA targets ratified-in-principle but NOT operative under BACKUP disposition; activation post-Story 0.6 Task 10** |
| `contact_rota_cite` | `pending-rota-population` (BACKUP disposition; rota population at Story 0.6 Task 10 named-engineer landing) |
| `comms_channel` | `WA` (`comms-templates/whatsapp-channel.md`, Vikram-class WA reach per UX surface-priority) + `push` (`comms-templates/push-channel.md`) |
| `surface_inventory_xref` | "Field-worker dispatch app" row (`surface-inventory.md` line 60); one row discharged |
| `status` | `trustee-deferred-pending-backup-engineer` per Decision 2026-06-05-023 + Q7.4/QA.2 BACKUP assignment |

### Row 4: reconciliation

| Column | Value |
|---|---|
| `loop_node_id` | `reconciliation` |
| `node_description` | Matcher cron-driven reconciliation of contribution-flow ↔ claim-payout per architecture §3.6 + Stories 9.1 + 9.4 + 9.7 + 9.8 (Yogdaan Bahi contribution timeline ↔ claim-payout reconciliation; Sunita-class nominee non-engagement staff-takeover per UX §1 nominee non-engagement rule) |
| `owning_epic + stories` | Epic 9 + Stories 9.1 (matcher cron substrate) + 9.4 (manual triage queue) + 9.7 (self-verify path) + 9.8 (reconciliation review queue) |
| `primary_actor` | Matcher cron per architecture §3.6 (automated) + Sunita-class nominee (member-archetype primary actor for nominee-engagement path) |
| `fallback_actor` | Reconciliation triage on-call (matcher exception path) + Sunita-class nominee staff-takeover (Anita-class staff per UX §1 nominee non-engagement rule) |
| `escalation_trigger` | `automation-failure-detected` (matcher cron exception — contribution-flow row that cannot be matched to a claim-payout) + `automation-timeout-exceeded` (nominee non-engagement triggers staff-takeover by day N per UX §1; the day-N threshold is per UX nominee-non-engagement rule) |
| `fallback_handler_role` | `Trustee-on-rota (Dhiraj Rahul primary, Kalpana Bharti secondary)` per Q7.3 substitute-bench composition; Reconciliation triage on-call + Nominee shepherd / claim-shepherd staff candidates deferred until post-bench-window |
| `funding_status` | `volunteer-rota-bridge` (90-day substitute-bench window 2026-06-05 → 2026-09-03; trustees absorb without retainer/salary line item per Trust capital-preservation rationale per Q7.3) |
| `response_time_sla` | `≤1 hr ack / ≤8 hr first action` (recommended-default; rationale: reconciliation exceptions accumulate quickly in production; the 1-hr ack matches matcher-cron-frequency constraints; the 8-hr first action allows for triage analysis; per-loop-node entry §6 carries the substantive rationale; **trustee-on-rota meets these SLA targets via direct-line escalation to Dhiraj per Q7.3 rota selection**) |
| `contact_rota_cite` | `rota.md#reconciliation` populated per Q7.3 trustee-on-rota composition (Task 10 substantive backfill) |
| `comms_channel` | `push` (`comms-templates/push-channel.md`, in-console operator banner per surface-inventory.md line 66) + `email` (`comms-templates/email-channel.md`) |
| `surface_inventory_xref` | "Reconciliation review queue" row (`surface-inventory.md` line 66) + "Sunita-mode nominee console" row (`surface-inventory.md` line 50) + "Yogdaan Bahi" row (`surface-inventory.md` line 47); three rows discharged |
| `status` | `trustee-signed-off-bench-disposition` per Decision 2026-06-05-023 + Q7.4/QA.2 BENCH assignment |

### Row 5: helpdesk

| Column | Value |
|---|---|
| `loop_node_id` | `helpdesk` |
| `node_description` | Helpdesk operator inbound-call + ticket-handling per Stories 10.2 + 10.3 + 10.4 (member-facing inbound-helpline surface per architecture §3.5 inbound fallback; Helpline Operator console authority per UX) |
| `owning_epic + stories` | Epic 10 + Stories 10.2 (helpline call routing) + 10.3 (helpdesk operator console) + 10.4 (ticket SLA tracking) |
| `primary_actor` | Helpdesk operator per Story 10.3 (helpline-mediated path) |
| `fallback_actor` | Helpline shift supervisor + helpdesk on-call (escalation role for operator-unavailable or operator-overloaded conditions) |
| `escalation_trigger` | `automation-failure-detected` (inbound call routing failure per Story 10.2; carrier-level outage) + `automation-timeout-exceeded` (ticket SLA breach per Story 10.4) + `user-initiated-escalation` (member explicitly escalates to supervisor) |
| `fallback_handler_role` | `Trustee-on-rota (Dhiraj Rahul primary, Kalpana Bharti secondary)` per Q7.3 substitute-bench composition; tickets land naturally to trustees during 90-day window per Q7.4/QA.2 BENCH disposition rationale; Helpline shift supervisor + carrier-level auto-attendant candidates deferred until post-bench-window |
| `funding_status` | `volunteer-rota-bridge` (90-day substitute-bench window 2026-06-05 → 2026-09-03; trustees absorb without retainer/salary line item per Trust capital-preservation rationale per Q7.3) |
| `response_time_sla` | `≤15 min ack / ≤2 hr first action` (recommended-default; rationale: inbound-helpline is the most member-facing-immediate of the loop nodes; the tight ack window is justified by carrier-level inbound timeouts; the 2-hr first-action matches Story 10.4 ticket SLA assumptions; per-loop-node entry §6 carries the substantive rationale; **trustee-on-rota meets these SLA targets via direct-line escalation to Dhiraj per Q7.3 rota selection — pre-launch helpdesk volume expected near-zero**) |
| `contact_rota_cite` | `rota.md#helpdesk` populated per Q7.3 trustee-on-rota composition (Task 10 substantive backfill) |
| `comms_channel` | `helpline-inbound` (per architecture §3.5) + `push` (`comms-templates/push-channel.md`, in-console operator banner) |
| `surface_inventory_xref` | "Helpline Operator console" row (`surface-inventory.md` line 57); one row discharged |
| `status` | `trustee-signed-off-bench-disposition` per Decision 2026-06-05-023 + Q7.4/QA.2 BENCH assignment |

### Row 6: denial-appeal

| Column | Value |
|---|---|
| `loop_node_id` | `denial-appeal` |
| `node_description` | Member appeal of a denied claim per Story 6.16 (FR-43A appeal-stage workflow; Stage-1-reviewer ≠ original-decision-maker conflict-of-interest discipline per audit-of-Anita pattern) |
| `owning_epic + stories` | Epic 6 + Story 6.16 (denial-appeal workflow); cross-cuts Story 1.11b audit-of-Anita UI |
| `primary_actor` | Appeal-stage reviewer per FR-43A (a reviewer distinct from the original decision-maker) |
| `fallback_actor` | State Trustee (escalation role per Story 6.13 State Trustee escalation) + appeal-shepherd (member-facing escalation support) |
| `escalation_trigger` | `automation-timeout-exceeded` (appeal SLA breach) + `automation-precondition-failure` (Stage-1-reviewer-equals-original-decision-maker conflict — automated assignment cannot find a distinct reviewer due to small reviewer pool) + `user-initiated-escalation` (member or appeal-shepherd escalates) |
| `fallback_handler_role` | `<TO-BE-NAMED-POST-STORY-0.6-TASK-10>` per Q7.4/QA.2 BACKUP disposition; requires Niyamavali knowledge + counsel-touching per Story 0.13 cross-coupling; recommended candidates (State Trustee + appeal-shepherd role) deferred to backup-engineer + Story 0.13 counsel return |
| `funding_status` | `pending-backup-engineer-contracting` per Q7.4/QA.2 BACKUP disposition; recommended posture (retainer-funded for State Trustee + salary-funded for appeal-shepherd) deferred to Story 0.6 Task 10 + Story 0.13 counsel return |
| `response_time_sla` | `≤24 hr ack / ≤72 hr first action` (recommended-default; rationale: denial-appeal is high-stakes but not member-facing-immediate — the appeal process inherently runs days-to-weeks; the 24-hr ack ensures the member sees motion within a business day; per-loop-node entry §6 carries the substantive rationale) — **SLA targets ratified-in-principle but NOT operative under BACKUP disposition; activation post-Story 0.6 Task 10 + Story 0.13 counsel return** |
| `contact_rota_cite` | `pending-rota-population` (BACKUP disposition; rota population at Story 0.6 Task 10 named-engineer landing + Story 0.13 counsel return) |
| `comms_channel` | `push` (`comms-templates/push-channel.md`) + `WA` (`comms-templates/whatsapp-channel.md`) + `email` (`comms-templates/email-channel.md`) |
| `surface_inventory_xref` | "R9 voting workflow" row (`surface-inventory.md` line 63) + "Audit-of-Anita UI" row (`surface-inventory.md` line 64); two rows discharged |
| `status` | `trustee-deferred-pending-backup-engineer` per Decision 2026-06-05-023 + Q7.4/QA.2 BACKUP assignment |

### Row 7: kyc-fallback

| Column | Value |
|---|---|
| `loop_node_id` | `kyc-fallback` |
| `node_description` | KYC-verification fallback when DigiLocker-mediated KYC fails per Story 3.3a + 3.3b (provider-interface-abstraction per A-4 provider-approval-gating; manual KYC review path when automated verification is unavailable) |
| `owning_epic + stories` | Epic 3 + Story 3.3a (DigiLocker provider-interface) + Story 3.3b (manual KYC fallback) |
| `primary_actor` | DigiLocker per Story 3.3a provider-interface-abstraction (external dependency) |
| `fallback_actor` | Manual KYC reviewer (staff role) |
| `escalation_trigger` | `external-dependency-outage` (DigiLocker downtime — provider unavailable; provider-approval-gating-failure per A-4) + `automation-failure-detected` (signature-verification failure; document-quality rejection) |
| `fallback_handler_role` | `<TO-BE-NAMED-POST-STORY-0.6-TASK-10>` per Q7.4/QA.2 BACKUP disposition; recommended candidate (manual KYC reviewer role under Operations Lead or backup engineer) deferred to backup-engineer-contracting; volume tied to DigiLocker failure rate per Q7.4 rationale |
| `funding_status` | `pending-backup-engineer-contracting` per Q7.4/QA.2 BACKUP disposition; recommended posture (retainer-funded initially → salary-funded as volume sustains) deferred to Story 0.6 Task 10 closure |
| `response_time_sla` | `≤2 hr ack / ≤24 hr first action` (recommended-default; rationale: KYC fallback is onboarding-window-constrained — members in the joining flow expect KYC completion within a day to proceed; the 2-hr ack ensures Operations Lead is paged within business hours; per-loop-node entry §6 carries the substantive rationale) — **SLA targets ratified-in-principle but NOT operative under BACKUP disposition; activation post-Story 0.6 Task 10** |
| `contact_rota_cite` | `pending-rota-population` (BACKUP disposition; rota population at Story 0.6 Task 10 named-engineer landing) |
| `comms_channel` | `push` (`comms-templates/push-channel.md`) + `WA` (`comms-templates/whatsapp-channel.md`) |
| `surface_inventory_xref` | None in `surface-inventory.md` at author-commit (KYC-specific surface not yet enumerated); surface-inventory amendment is Story 3.3b territory at closure |
| `status` | `trustee-deferred-pending-backup-engineer` per Decision 2026-06-05-023 + Q7.4/QA.2 BACKUP assignment |

### Row 8: upi-failure-coach

| Column | Value |
|---|---|
| `loop_node_id` | `upi-failure-coach` |
| `node_description` | Automated coach guidance when UPI Intent contribution fails per Story 8.5 (self-attestation path when UPI Intent returns failure; yellow-pill-stuck recovery; contribution-loop substrate per architecture §3.4) |
| `owning_epic + stories` | Epic 8 + Story 8.5 (UPI failure coach); cross-cuts Story 8.2 (My Pool card) + Story 8.6 (Yogdaan Bahi contribution timeline) |
| `primary_actor` | Automated coach per Story 8.5 (in-app coach guidance + self-attestation fallback) + the contribution-loop substrate per architecture §3.4 |
| `fallback_actor` | Contribution-loop staff support + helpline operator (escalation role for members stuck despite automated coach) |
| `escalation_trigger` | `external-dependency-outage` (UPI Intent failure — payment gateway unavailable) + `automation-failure-detected` (self-attestation failure; yellow-pill-stuck condition) + `user-initiated-escalation` (member explicitly requests human help via in-app helpline link) |
| `fallback_handler_role` | `Trustee-on-rota (Dhiraj Rahul primary, Kalpana Bharti secondary)` per Q7.3 substitute-bench composition; lightweight member coaching per Q7.4/QA.2 BENCH disposition rationale (trustee-on-rota acceptable); Contribution-loop staff support + Helpline Operator pool candidates deferred until post-bench-window |
| `funding_status` | `volunteer-rota-bridge` (90-day substitute-bench window 2026-06-05 → 2026-09-03; trustees absorb without retainer/salary line item per Trust capital-preservation rationale per Q7.3) |
| `response_time_sla` | `≤1 hr ack / ≤8 hr first action` (recommended-default; rationale: UPI failure during contribution risks member dropping out of the contribution-cycle attempt; the 1-hr ack window matches the typical member retry-attempt cadence; per-loop-node entry §6 carries the substantive rationale; **trustee-on-rota meets these SLA targets via direct-line escalation to Dhiraj per Q7.3 rota selection — pre-launch UPI failure volume expected low**) |
| `contact_rota_cite` | `rota.md#upi-failure-coach` populated per Q7.3 trustee-on-rota composition (Task 10 substantive backfill) |
| `comms_channel` | `push` (`comms-templates/push-channel.md`) + `helpline-inbound` |
| `surface_inventory_xref` | "My Pool card" row (`surface-inventory.md` line 46) + "Yogdaan Bahi" row (`surface-inventory.md` line 47); two rows discharged |
| `status` | `trustee-signed-off-bench-disposition` per Decision 2026-06-05-023 + Q7.4/QA.2 BENCH assignment |

**Total surface-inventory rows discharged by these 8 ledger rows:** 9 unique rows (11 row-claims across 8 loop nodes — claim-filing 2 + peer-mesh 0 + ground-inspection 1 + reconciliation 3 + helpdesk 1 + denial-appeal 2 + kyc-fallback 0 + upi-failure-coach 2 = 11 row-claims — minus 2 co-covered rows: line 47 / Yogdaan Bahi is claimed by both reconciliation and upi-failure-coach; line 57 / Helpline Operator console is claimed by both claim-filing and helpdesk — yielding 9 unique surface-inventory rows discharged). Note: this count covers the unique surface-inventory rows discharged by P0-1 ledger rows. Per `backfill-log.md`, the substantive textual P0-1-pending → named-role replacement at Task 9 closure will be applied to the surface-inventory rows currently carrying `P0-1-pending` (18 rows in surface-inventory.md); the 11-rows-discharged count above counts only those rows where a P0-1 ledger row's `surface_inventory_xref` directly cites the surface-inventory row name. The remaining 7 surface-inventory `P0-1-pending` rows (Renewal-grace surface, Anita's verifier console, Trustee-Lite signals panel, Staff console, Niyamavali amendment workflow, Fixed-amount setter, Feature-flag toggle console) are covered indirectly — by Trustee Panel chair, Operations Lead, State Trustee, or Story 0.2 quorum-open path roles that this ledger does NOT carry per-loop-node entries for (those rows belong to trustee-class or admin-class surfaces, not loop nodes; per per-loop-node enumeration in §3 above, only the eight loop nodes are committed). The 7 indirect-coverage surface-inventory rows carry their substantive role names directly in surface-inventory.md's existing parenthetical text — Task 9 backfill substitutes the named role per backfill-log.md row-level mapping.

## §4 Operations Lead authorization log

Per-event rows recording Trustee Panel authorization decisions (Operations Lead hire OR substitute-handler-bench formal ratification per `operations-lead-commitment.md` §3 + §6). The log is empty at author-commit (Task 8 territory — Trustee Panel ratification).

| Event date | Authorization type | Trustee Panel ratifying members | Decision | Reference |
|---|---|---|---|---|
| 2026-06-05 | `substitute-handler-bench-formal-ratification` | Dhiraj Rahul + Kalpana Bharti | Path (b) substitute-handler-bench fallback ratified per Q7.1 (vs Operations Lead hire path (a)); 90-day window 2026-06-05 → 2026-09-03; bench composition = Trustees Dhiraj Rahul + Kalpana Bharti; named trustee-on-rota = Dhiraj Rahul; Story 0.6 backup engineer NOT in bench (gated on Story 0.6 Task 10 closure); automatic Day-75 review (2026-08-19) per Q7.3 renewal trigger; UX-DR4 explicit-deferral rationale = capital-preservation during pre-launch validation per Q7.3 | `.decision-log.md` Decision 2026-06-05-023 (supersession of Decision 2026-05-30-007 Open Follow-up #1) |

**Schema notes:**

- `Event date` — date the Trustee Panel ratified the authorization
- `Authorization type` — one of: `operations-lead-hire` (path (a) per `operations-lead-commitment.md` §6), `substitute-handler-bench-formal-ratification` (path (b) initial 90-day ratification), `substitute-handler-bench-renewal` (90-day renewal per README §5; no auto-roll-over per Open Question #4 recommended posture)
- `Trustee Panel ratifying members` — names of Trustee Panel members ratifying (≥2 trustees per §5 sign-off lifecycle OR emergency single-trustee per quorum-unavailable fallback path)
- `Decision` — substantive decision: candidate identity for `operations-lead-hire`; substitute-bench composition for `substitute-handler-bench-formal-ratification`; renewal terms for `substitute-handler-bench-renewal`
- `Reference` — `.decision-log.md` `[OPS]` entry id (e.g., `Decision YYYY-MM-DD-NNN`) recording the ratification event

## §5 Trustee ratification log

≥2-trustee per-loop-node-row OR pack-as-a-unit ratification rows per the README §5 sign-off lifecycle. The log is empty at author-commit (Task 10 territory — Trustee Panel ratification).

| Event date | Ratification mode | Trustees ratifying | Loop nodes ratified | Decision-log entry id |
|---|---|---|---|---|
| 2026-06-05 | `per-loop-node` (mixed dispositions per Q7.4/QA.2 table) | Dhiraj Rahul + Kalpana Bharti | 4 BENCH ratified-now: claim-filing + reconciliation + helpdesk + upi-failure-coach; 3 BACKUP deferred-pending-Story-0.6-Task-10: ground-inspection + denial-appeal + kyc-fallback; 1 BACKLOG deferred-pending-post-launch-evidence: peer-mesh | `.decision-log.md` Decision 2026-06-05-023 |

**Schema notes:**

- `Event date` — date of the trustee ratification
- `Ratification mode` — one of: `pack-as-a-unit` (default per README §5; all eight loop nodes ratified together), `per-loop-node` (Trustee Panel discretion; per-loop-node ratification rows), `emergency-single-trustee` (quorum-unavailable fallback path; valid 90 days; requires second-trustee co-sign within 90 days per README §5)
- `Trustees ratifying` — names of ratifying trustees (≥2 for `pack-as-a-unit` and `per-loop-node`; ≥1 for `emergency-single-trustee` with 90-day expiry)
- `Loop nodes ratified` — for `pack-as-a-unit`: `all-eight` (or the canonical kebab-case list); for `per-loop-node`: explicit list of `loop_node_id` values ratified
- `Decision-log entry id` — `.decision-log.md` `[OPS]` entry id recording the ratification

**Supersession schema:** if a previously-ratified `loop_node_id` is re-ratified (e.g., handler turnover, SLA revision, funding-posture change), the new ratification row is appended; the prior row is NOT removed; the prior row's `Decision-log entry id` is cited in the supersession `.decision-log.md` entry per the Story 0.4 + 0.5 + 0.6 supersession-schema precedent. The `status` column in §3 above flips per the latest ratification.

## §6 Synthetic SLA test log

Per AC-2 of Story 0.7: planned synthetic loop-node automation-failure exercise scheduled by the Trustee Panel; fallback handler paged via the published rota; acknowledgment + first-action windows measured; gap-list recorded; remediation plan logged. The log is empty at author-commit (Task 11 territory — Trustee Panel facilitator).

| Test date | Loop node | Exercising trustee | Handler paged (Y/N) | Handler identity | Paging surface | Comms channel template | Ack time | Ack SLA met | First-action time | First-action SLA met | Completion time | Completion SLA met | Gap list | Remediation plan | Audit-line emission verified | Decision-log entry id |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| _(pending Task 11)_ | _(one of: `claim-filing` \| `peer-mesh` \| `ground-inspection` \| `reconciliation` \| `helpdesk` \| `denial-appeal` \| `kyc-fallback` \| `upi-failure-coach`)_ | _(pending)_ | _(pending Y/N)_ | _(pending — identity of the handler paged per the rota row)_ | _(pending — e.g., `push`, `WA`, `SMS`, `helpline-inbound`)_ | _(pending — e.g., `comms-templates/push-channel.md`)_ | _(pending)_ | _(pending Y/N)_ | _(pending)_ | _(pending Y/N)_ | _(pending)_ | _(pending Y/N or N/A)_ | _(pending; cite per-loop-node entry sections affected)_ | _(pending)_ | _(pending Y/N)_ | _(pending `.decision-log.md` `[OPS]` entry id)_ |

**Synthetic SLA test procedure** (referenced from per-loop-node entry §11):

1. **Pre-exercise authorization** — Trustee Panel chair authorizes the exercise; loop-node selection + test design (told-vs-untold per AC-2 untold-vs-told discipline; recommend untold for first test per loop node) recorded in pre-event row
2. **Trigger** — Trustee Panel chair triggers the synthetic exercise per the loop node's §11 escalation path (e.g., simulated matcher-cron failure for reconciliation; simulated DigiLocker outage for kyc-fallback; simulated helpline-inbound carrier-outage for helpdesk)
3. **Paging** — fallback handler is paged via the published rota (the paging surface is per the `comms_channel` column — push / WA / SMS / helpline-inbound / email — cross-linked to `docs/degradation-policy/comms-templates/`)
4. **Ack measurement** — the time from page-trigger to handler ack is measured; recorded in `Ack time`; pass/fail vs the documented `response_time_sla` ack window recorded in `Ack SLA met`
5. **First-action measurement** — the time from page-trigger to handler first action (the deterministic pass/fail signal of AC-2 closure) is measured; recorded in `First-action time`; pass/fail vs the documented `response_time_sla` first-action window recorded in `First-action SLA met`
6. **Completion measurement (if applicable)** — for loop nodes carrying a documented completion window, the time from page-trigger to handler completion is measured; recorded in `Completion time`; pass/fail recorded in `Completion SLA met`
7. **Gap list** — every step where the paging surface failed to route, every SLA breach, every audit-line emission gap per loop-node entry §10, every comms-channel routing failure is logged; each gap cites loop-node-entry section + rota row + comms-template + rationale + proposed remediation
8. **Remediation plan** — per gap: rota revision; SLA revision if the original SLA proved structurally unachievable; comms-channel routing revision; audit-line mechanism revision routed to Story 1.10 per the substrate-ownership invariant; per-loop-node-entry revision
9. **Audit-line emission verification** — confirm the engagement event emitted the expected audit line per §10 of the loop-node entry; recorded in `Audit-line emission verified`
10. **Decision-log entry** — the exercise outcome is recorded as a `.decision-log.md` `[OPS]` entry; cross-referenced from `Decision-log entry id`

**Closure-language precision per [[feedback_closure_language_precision]]:**

- A successful exercise (SLA met per the documented windows + no `unanswerable-from-ledger` gaps) closes AC-2 for the tested loop node as **Closed by [edit]**
- A successful exercise with gaps closes AC-2 for the tested loop node as **Provisionally closed; full closure pending gap remediation per the Pack-revision log §7**
- An unsuccessful exercise (SLA breach + root cause is rota/role mis-specification rather than the simulated failure being too realistic) does NOT close AC-2 — re-rehearsal is scheduled after framework / per-loop-node-entry revisions per §7 Pack-revision log

**UX-DR4 + AR-49 P0-1 discharge trigger:** once AC-2 closes for all eight Phase-1 loop nodes (one synthetic test per node per Open Question #2 recommended posture, OR a single multi-loop test covering all eight at the Trustee Panel's discretion), a follow-up `.decision-log.md` `[OPS]` entry records the UX-DR4 + AR-49 P0-1 row discharge per the supersession schema; the entry cross-references Decision 2026-05-30-007 + the per-loop-node Task 9 supersession entries + the Task 11 per-loop-node test-event entries.

## §7 Pack-revision log

Per-loop-node entry revisions + ledger schema revisions per the Story 0.4 + 0.5 + 0.6 supersession schema. Empty at author-commit; populated when post-author-commit revisions occur.

| Revision date | Target | Prior version reference | Revision summary | Rationale | Decision-log entry id |
|---|---|---|---|---|---|
| _(empty — first row appended on first post-author-commit revision)_ | _(file path + section, e.g., `loop-nodes/claim-filing.md#§6` or `ledger.md#§3-row-1`)_ | _(prior version commit hash OR `author-commit baseline 2026-05-30`)_ | _(summary of revision)_ | _(why the revision is needed — gap discovered in synthetic SLA test, per-loop-node-handler turnover, funding-posture change, etc.)_ | _(`.decision-log.md` `[OPS]` entry id)_ |

**Schema notes:**

- Forbidden-removal rule applied; supersession-only lifecycle exit; per-row append-only
- Per-row append-only includes the schema columns themselves — schema-column additions require a `.decision-log.md` `[GOV]` entry; existing column removal is forbidden
- Routine maintenance (typo fixes, cross-reference broken-link repairs, formatting consistency) does NOT require a Pack-revision log row; substantive revisions (SLA window changes, role-name changes, escalation-trigger taxonomy revisions, comms-channel changes) DO require a row

## §8 Periodic re-attestation log

Per the README §6 review cadence fallback. Empty at author-commit; populated per the monthly / quarterly / annual / per-architectural-amendment / per-Story-closure / on-engagement-event cadence.

| Re-attestation date | Cadence | Performed by | Outcome | Stale-rota rows | Re-attestation entry id |
|---|---|---|---|---|---|
| _(empty — first row appended on first scheduled re-attestation post-Task-10-closure)_ | _(`monthly-rota-refresh` \| `quarterly-ledger-re-attestation` \| `annual-ledger-renewal` \| `per-architectural-amendment` \| `per-Story-closure-rota-update` \| `on-engagement-event-post-mortem`)_ | _(Operations Lead OR Trustee Panel)_ | _(pass / pass-with-gaps / fail-rerun-required)_ | _(rota rows discovered stale; cross-link to `rota.md` row id)_ | _(`.decision-log.md` `[OPS]` entry id)_ |

## §9 Backfill log cross-references

Cross-links to `backfill-log.md` for the substantive backfill operation. This ledger is the index; `backfill-log.md` is the per-row detail.

- **Source files carrying `P0-1-pending` placeholders at Story 0.7 author-commit time:**
  - `docs/degradation-policy/surface-inventory.md` (18 occurrences across lines 18, 34, 46-66 — 16 row-data occurrences + 2 schema-notes occurrences)
  - `docs/degradation-policy/README.md` (1 occurrence, line 71 — structural invariant 2)
  - `docs/degradation-policy/degradation-policy-ledger.md` (1 occurrence, line 184 — Story 0.7 P0-1 ledger Procedure-revision log placeholder)
  - `docs/degradation-policy/table-top-exercise.md` (2 occurrences, lines 50 + 54 — helpdesk fallback handler gap-recording references)
  - `_bmad-output/implementation-artifacts/deferred-work.md` (1 occurrence, line 50 — `{fallback_handler_phone}` resolution dependency)
- **Total occurrences:** 23 lines containing `P0-1-pending` at author-commit. Corresponds to 23 `backfill-log.md` rows.
- **Citation-slot-committed status at author-commit; substantive textual replacement is Task 9 territory:** the dev agent commits the *citation slot* per row (source_file + line + ledger_row_discharging_placeholder), not the substantive identity replacement. The substantive replacement (`P0-1-pending` → named-role text) is Task 9 territory (Trustee Panel + Operations Lead name the role first).
- **See `backfill-log.md` for per-row detail.**

## §10 Cross-links into related framework ledgers

This ledger is the **parallel** ledger of the loop-node-operational-responsiveness portfolio, distinct from the bus-factor-of-one mitigation portfolio per README §10.

| Framework ledger | Owning Story | Cross-link rationale |
|---|---|---|
| `docs/runbooks/operational-readiness-ledger.md` | Story 0.1 | The operational-readiness-ledger tracks runbook re-sign cadence for the seven Phase-0 runbooks. The fallback-handler-ledger framework adds a "Fallback-handler-ledger framework coverage" section per Story 0.7 Task 7; framework re-attestation cadence aligns with the per-loop-node entry review cadence per §6 of this ledger. |
| `docs/escrow/escrow-ledger.md` (and credential-inventory) | Story 0.2 | The credential-inventory carries the `backup-engineer-access-credentials` row owned by Story 0.6; fallback-handler-ledger does not directly couple to credential-inventory. |
| `docs/escrow/code-escrow/mirror-attestation-ledger.md` | Story 0.3 | The code-escrow mirror is the bus-factor-portfolio leg; fallback-handler-ledger does not directly couple to code-escrow. |
| `docs/degradation-policy/degradation-policy-ledger.md` | Story 0.4 | **Highest coupling:** this ledger's §3 rows discharge the `fallback_handler` column citation contract committed in `surface-inventory.md`. The `degradation-policy-ledger.md` line 184 row is updated per Story 0.7 Task 7 to reflect this framework's author-commit; the per-loop-node entries' §9 enumerate the discharged surface-inventory rows. |
| `docs/knowledge-transfer/sign-off-ledger.md` | Story 0.5 | The KT pack sign-off-ledger tracks KT pack comprehension administration. Fallback-handler-ledger does not directly couple to KT pack sign-off; the cross-link in `adr-index.md` Section I per Story 0.7 Task 7 catalogs this framework's open ADR slots. |
| `docs/backup-engineer/sign-off-ledger.md` | Story 0.6 | Backup engineer is the **third-tier escalation** per per-loop-node entry §11 (after Operations Lead + Trustee Panel chair); the backup-engineer framework's sign-off-ledger tracks the backup engineer contract authorization, not loop-node operational responsiveness. The two frameworks have disjoint closure semantics per README §10. |

**Other related repository surfaces:**

- `.decision-log.md` — Decision 2026-05-30-007 appended at top of Decisions section per Story 0.7 Task 7
- `docs/knowledge-transfer/adr-index.md` Section I — 30 ADR slot rows reserved per Story 0.7 Task 7 (paging integrations + per-loop-node SLA tooling + OL salary range + substitute-bench mechanics + multi-Pariwar localization + bench-on-leave + SLA-breach thresholds + audit-line shape + per-loop-node-ADR backlog)
- `docs/runbooks/README.md` Related runbooks expected from other stories table — new row referencing this framework per Story 0.7 Task 7
- `docs/backup-engineer/README.md` + `docs/backup-engineer/scope-of-work.md` §3 — Notes-clarification on parallel-portfolio distinction + third-tier escalation role per Story 0.7 Task 7
- `_bmad-output/implementation-artifacts/deferred-work.md` line 50 — Notes-column append on `{fallback_handler_phone}` row per Story 0.7 Task 7
