# Backfill Log — Spec-to-Cadence Reconciliation

**Status:** Author-committed 2026-06-01. All 19 rows carry `backfill_status = citation-slot-committed`. Substantive backfill (replacing "Story 0.12 reconciliation territory" placeholders with resolved outcome text) happens at Task 9 closure.

**Row count:** 19 rows committed at author-commit time (within the ~20-22-row estimate in Decision 2026-06-01-012 body item 4). The author-commit grep of `docs/fallback-handler-ledger/` for `"Story 0.12"` yielded 18 unique source_file:source_line matches; BFL-015 is a second citation-slot entry for `loop-nodes/claim-filing.md:58` covering the claim-shepherd salary decision specifically (pre-assigned separately in `estimation-worksheet.md §3` as a distinct reconciliation territory item from the overall claim-filing funding posture in BFL-007).

**Canonical authority:** This log is the canonical source for BFL IDs. The `estimation-worksheet.md §3–§5` provisional BFL cross-references for `ledger.md` rows (provisionally BFL-017 for the claim-filing `funding_status` row, BFL-018 for peer-mesh, BFL-019 for helpdesk) are superseded by this log. Those `ledger.md` funding_status rows (lines 86, 104, 158) do not carry explicit "Story 0.12" text and are handled at Task 9 as part of the general funding-posture determination — no separate backfill-log entry. The canonical IDs BFL-017/018/019 are assigned to `operations-lead-commitment.md` rows below.

---

## Schema

| Column | Description |
|---|---|
| `bfl_id` | Canonical backfill-log row identifier (BFL-NNN) |
| `source_file` | Path relative to project root |
| `source_line` | Line number at author-commit time |
| `source_column_or_section` | Section heading or column header nearest the cross-reference |
| `pre-existing_xref_text` | Verbatim excerpt of the "Story 0.12 reconciliation territory" cross-reference text |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md` row or `reconciliation-decision-framework.md §X` that discharges this cross-reference |
| `backfill_status` | `citation-slot-committed` \| `substantive-backfill-applied` \| `superseded` |
| `backfill_date` | Date substantive backfill was applied (blank until Task 9) |
| `supersession-schema-marker` | Decision ID + date if superseded (blank until Task 9) |
| `notes` | Context for the backfill scope |

---

## Rows

### BFL-001

| Field | Value |
|---|---|
| `bfl_id` | BFL-001 |
| `source_file` | `docs/fallback-handler-ledger/README.md` |
| `source_line` | 32 |
| `source_column_or_section` | §2 Lifecycle (Task 8 — Operations Lead hire decision) |
| `pre-existing_xref_text` | "Task 8 — `_AWAITING EXTERNAL ACTION_` — Trustee Panel authority + Story 0.12 P0-3 spec-to-cadence reconciliation linkage" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path (Operations Lead hire is one of the structural funding decisions in scope) |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | README §2 lifecycle step 2 carries the Operations Lead hire decision linkage to Story 0.12; at Task 9, replace with the ratified path outcome (hire authorized vs substitute-bench formally ratified) |

---

### BFL-002

| Field | Value |
|---|---|
| `bfl_id` | BFL-002 |
| `source_file` | `docs/fallback-handler-ledger/README.md` |
| `source_line` | 48 |
| `source_column_or_section` | §3 Four-way property/control/policy/gap-analysis discipline — Control row |
| `pre-existing_xref_text` | "specific Operations Lead salary range + funding source (Story 0.12 reconciliation)" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §5` tier-2-staff-primary row; `reconciliation-decision-framework.md §3(c)` contract-help path |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | README four-way discipline table's Control column names the salary range as an ADR territory item pending Story 0.12; at Task 9, update with the specific ADR slot ID when ADR-NNNN-operations-lead-salary-range is substantively authored |

---

### BFL-003

| Field | Value |
|---|---|
| `bfl_id` | BFL-003 |
| `source_file` | `docs/fallback-handler-ledger/README.md` |
| `source_line` | 88 |
| `source_column_or_section` | §4 Substitute-handler-bench fallback (Operations-Lead-unavailable fallback path) |
| `pre-existing_xref_text` | "Story 0.12 P0-3 spec-to-cadence reconciliation is the appropriate forum for long-term funding-decision resolution" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path; `reconciliation-decision-framework.md §3(b)` move-SM-1 if timeline affects Operations Lead hire window |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | README substitute-bench fallback section cross-links Story 0.12 as the long-term resolution forum; at Task 9, update with the reconciliation outcome (hired/deferred-with-bench); if substitute-bench is the ratified path, this cross-reference becomes "Resolved via explicit deferral — substitute-bench formally ratified per Decision YYYY-MM-DD-012 supersession" |

---

### BFL-004

| Field | Value |
|---|---|
| `bfl_id` | BFL-004 |
| `source_file` | `docs/fallback-handler-ledger/README.md` |
| `source_line` | 128 |
| `source_column_or_section` | §8 Open ADR slots table — Operations Lead salary range row |
| `pre-existing_xref_text` | "Operations Lead salary range + funding source \| `operations-lead-commitment.md` (1 slot — Story 0.12 reconciliation territory) \| Story 0.12 P0-3 spec-to-cadence reconciliation closes" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §5` tier-2-staff-primary row; `reconciliation-decision-framework.md §3(c)` contract-help path |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | README §8 open ADR slots table explicit "Story 0.12 reconciliation territory" marker; at Task 9, update "Story 0.12 P0-3 spec-to-cadence reconciliation closes" column with the actual closure date + Decision ID; populate the ADR slot ID when the salary-range ADR is authored |

---

### BFL-005

| Field | Value |
|---|---|
| `bfl_id` | BFL-005 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 5 |
| `source_column_or_section` | **Status** header |
| `pre-existing_xref_text` | "Trustee Panel authority + Story 0.12 P0-3 spec-to-cadence reconciliation linkage" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | operations-lead-commitment.md Status header cross-links Story 0.12; at Task 9, update Status header to reflect the substantive Task 8 decision outcome + Story 0.12 Task 9 reconciliation closure date |

---

### BFL-006

| Field | Value |
|---|---|
| `bfl_id` | BFL-006 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 38 |
| `source_column_or_section` | §3 Hire decision procedure — step 3 |
| `pre-existing_xref_text` | "reference to Story 0.12 P0-3 spec-to-cadence reconciliation funding-tradeoff outcome" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Hire decision procedure step 3 references Story 0.12 outcome as the `.decision-log.md` `[OPS]` entry antecedent; at Task 9, the substantive `[OPS]` entry is authored with the actual salary range + funding source after reconciliation closes |

---

### BFL-007

| Field | Value |
|---|---|
| `bfl_id` | BFL-007 |
| `source_file` | `docs/fallback-handler-ledger/loop-nodes/claim-filing.md` |
| `source_line` | 58 |
| `source_column_or_section` | §5 Funding posture |
| `pre-existing_xref_text` | "Trustee Panel + Story 0.12 P0-3 spec-to-cadence reconciliation will determine the substantive retainer-vs-salary-vs-volunteer-bridge posture at Task 9 ratification + per-loop-node negotiation" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §3` row `loop-node-claim-filing`; `reconciliation-decision-framework.md §3(a)-(c)` |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Claim-filing loop-node §5 funding posture carries the "Story 0.12 reconciliation territory" cross-reference for overall posture determination; at Task 9, replace with the ratified posture (retainer-funded / salary-funded / volunteer-bridge per the reconciliation decision) |

---

### BFL-008

| Field | Value |
|---|---|
| `bfl_id` | BFL-008 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 48 |
| `source_column_or_section` | §3 Hire decision procedure — hire decision table |
| `pre-existing_xref_text` | "_(pending; Trustee Panel + Story 0.12 reconciliation territory)_" (in the `ops_decision_authority` table row) |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path; `estimation-worksheet.md §5` tier-2-staff-primary row |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Hire decision table pending cell; at Task 9 (after Task 8 Trustee Panel decision), populate this cell with the actual decision outcome and `.decision-log.md` `[OPS]` entry ID |

---

### BFL-009

| Field | Value |
|---|---|
| `bfl_id` | BFL-009 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 52 |
| `source_column_or_section` | §4 Substitute-handler-bench fallback — opening paragraph |
| `pre-existing_xref_text` | "Operations Lead hire formally postponed pending Story 0.12 P0-3 spec-to-cadence reconciliation" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(a)-(c)` |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | §4 substitute-bench trigger condition includes Story 0.12 deferral; at Task 9, this sentence is updated to reflect whether the deferral was confirmed or the hire was authorized |

---

### BFL-010

| Field | Value |
|---|---|
| `bfl_id` | BFL-010 |
| `source_file` | `docs/fallback-handler-ledger/loop-nodes/peer-mesh.md` |
| `source_line` | 50 |
| `source_column_or_section` | §5 Funding posture — Rationale subsection |
| `pre-existing_xref_text` | "the transition to retainer-funded is Story 0.12 spec-to-cadence reconciliation territory" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §3` row `loop-node-peer-mesh`; `reconciliation-decision-framework.md §3(a)-(c)` |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Peer-mesh funding posture transition from volunteer-rota-bridge to retainer-funded is explicitly Story 0.12 territory; at Task 9, update with the ratified posture + transition timeline if a move-SM-1 or contract-help decision was made that affects peer-mesh coordinator compensation |

---

### BFL-011

| Field | Value |
|---|---|
| `bfl_id` | BFL-011 |
| `source_file` | `docs/fallback-handler-ledger/loop-nodes/ground-inspection.md` |
| `source_line` | 51 |
| `source_column_or_section` | §5 Funding posture — Rationale subsection |
| `pre-existing_xref_text` | "funding requires Trustee Panel + Story 0.12 reconciliation linkage — the field-worker comp model itself is a cash-flow constraint that gates ground-inspection density" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §3` row `loop-node-ground-inspection`; `reconciliation-decision-framework.md §3(a)-(c)` |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Ground-inspection funding posture is explicitly PRD §9.3 cash-flow dependent and Story 0.12 territory; field-worker comp model is downstream of the reconciliation decision; at Task 9, update with the ratified posture + field-worker comp decision outcome |

---

### BFL-012

| Field | Value |
|---|---|
| `bfl_id` | BFL-012 |
| `source_file` | `docs/fallback-handler-ledger/loop-nodes/helpdesk.md` |
| `source_line` | 50 |
| `source_column_or_section` | §5 Funding posture — Rationale subsection |
| `pre-existing_xref_text` | "the shift count + per-shift staffing depth is a Story 0.12 reconciliation territory item" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §3` row `loop-node-helpdesk`; `reconciliation-decision-framework.md §3(a)-(c)` |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Helpdesk per-shift staffing depth is explicitly Story 0.12 territory; affects admin console queue capacity estimate; at Task 9, update with the ratified helpdesk staffing depth + shift count decision |

---

### BFL-013

| Field | Value |
|---|---|
| `bfl_id` | BFL-013 |
| `source_file` | `docs/fallback-handler-ledger/ledger.md` |
| `source_line` | 122 |
| `source_column_or_section` | §3 Per-loop-node rows — ground-inspection row `funding_status` |
| `pre-existing_xref_text` | "`unfunded` (Task 9 — recommended posture: `retainer-funded` for dispatch supervisor + `salary-funded` for District Admin; per PRD §9.3 cash-flow constraint, funding requires Trustee Panel + Story 0.12 reconciliation linkage)" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §3` row `loop-node-ground-inspection`; `reconciliation-decision-framework.md §3(a)-(c)` |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Ledger §3 ground-inspection row `funding_status` carries explicit Story 0.12 linkage; at Task 9, this cell is updated from `unfunded` to the ratified posture (`retainer-funded` / `salary-funded` / `volunteer-rota-bridge`) per the reconciliation decision |

---

### BFL-014

| Field | Value |
|---|---|
| `bfl_id` | BFL-014 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 77 |
| `source_column_or_section` | §4 Substitute-handler-bench fallback — fallback path trigger conditions, item (e) |
| `pre-existing_xref_text` | "Story 0.12 P0-3 spec-to-cadence reconciliation is cross-linked for the long-term funding-decision resolution path. If Story 0.12 ratifies cut-scope OR contracted-help, Operations Lead hire may be re-prioritized in the reconciliation" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path (Operations Lead hire re-prioritization); `estimation-worksheet.md §5` tier-2-staff-primary row |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | This row is the worked example in Story 0.12 AC-1 (backfill-log worked example). At Task 9: if contract-help selected with Operations Lead in scope, update with "Operations Lead hire authorized per Decision YYYY-MM-DD-012 supersession; salary range per `[OPS]` entry; substitute-bench path superseded." If substitute-bench confirmed, update with "Resolved via explicit deferral — substitute-bench formally ratified per Decision YYYY-MM-DD-012 supersession; Operations Lead hire deferred pending [condition]." |

---

### BFL-015

| Field | Value |
|---|---|
| `bfl_id` | BFL-015 |
| `source_file` | `docs/fallback-handler-ledger/loop-nodes/claim-filing.md` |
| `source_line` | 58 |
| `source_column_or_section` | §5 Funding posture — second sentence (claim-shepherd salary aspect) |
| `pre-existing_xref_text` | "Funding-tradeoff (claim-shepherd salary vs cut-scope per Story 0.12) is the appropriate forum for the long-term posture" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §3` row `loop-node-claim-filing`; `reconciliation-decision-framework.md §3(a)` cut-scope path (claim-shepherd salary vs cut-scope trade) OR `§3(c)` contract-help path |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Same file:line as BFL-007 but covers the specific claim-shepherd salary decision aspect (pre-assigned separately in estimation-worksheet §3 as distinct reconciliation territory from the overall posture in BFL-007). At Task 9, the claim-shepherd salary decision resolves: if cut-scope selected for claim-shepherd role, update with deferral rationale; if contract-help, update with salary range + funding source |

---

### BFL-016

| Field | Value |
|---|---|
| `bfl_id` | BFL-016 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 83 |
| `source_column_or_section` | §5 Funding posture — bullet (decision-path property) |
| `pre-existing_xref_text` | "the *decision-path* (Trustee Panel authority + Story 0.12 reconciliation linkage); does NOT inline a specific salary range or funding source" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path; `estimation-worksheet.md §5` tier-2-staff-primary row |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | §5 Funding posture property/decision-path split; the "does NOT inline salary range" statement is an intentional deferral pointing to Story 0.12; at Task 9, this is updated to reference the resolved `[OPS]` entry that DOES contain the salary range (if Operations Lead hired) or the substitute-bench formal ratification Decision ID (if deferred) |

---

### BFL-017

| Field | Value |
|---|---|
| `bfl_id` | BFL-017 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 84 |
| `source_column_or_section` | §5 Funding posture — bullet (Story 0.12 as appropriate forum) |
| `pre-existing_xref_text` | "Story 0.12 P0-3 spec-to-cadence reconciliation is the appropriate forum for the funding-tradeoff conversation — the spec-to-cadence reconciliation explicitly addresses scope-vs-resources tradeoffs at the launch boundary; Operations Lead hire is one of the structural funding decisions in scope" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(c)` contract-help path |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | §5 Funding posture "appropriate forum" statement; at Task 9, the forum has closed — update to "Closed per Decision YYYY-MM-DD-012 supersession" with a cross-reference to the reconciliation outcome |

---

### BFL-018

| Field | Value |
|---|---|
| `bfl_id` | BFL-018 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 87 |
| `source_column_or_section` | §5 Funding posture — Salary range ADR slot |
| `pre-existing_xref_text` | "Salary range ADR slot — reserved in `docs/knowledge-transfer/adr-index.md` Section I; populated when Story 0.12 reconciliation closes + the Trustee Panel authors the substantive ADR" |
| `worksheet_row_id_or_decision_path` | `estimation-worksheet.md §5` tier-2-staff-primary row; `docs/knowledge-transfer/adr-index.md` Section J deferred-ADR slots (to be committed in Task 6 cross-reference edit) |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Salary range ADR slot trigger condition — "when Story 0.12 reconciliation closes"; at Task 9, this becomes a concrete "Story 0.12 reconciliation closed YYYY-MM-DD; ADR-NNNN-operations-lead-salary-range substantive write due within [N] days of closure" |

---

### BFL-019

| Field | Value |
|---|---|
| `bfl_id` | BFL-019 |
| `source_file` | `docs/fallback-handler-ledger/operations-lead-commitment.md` |
| `source_line` | 94 |
| `source_column_or_section` | §6 Paths at Task 8 closure — Path (b) substitute-bench ratified |
| `pre-existing_xref_text` | "Story 0.12 spec-to-cadence reconciliation is cross-linked for long-term resolution" |
| `worksheet_row_id_or_decision_path` | `reconciliation-decision-framework.md §3(a)-(c)` |
| `backfill_status` | `citation-slot-committed` |
| `backfill_date` | _(pending Task 9)_ |
| `supersession-schema-marker` | _(pending Task 9)_ |
| `notes` | Path (b) substitute-bench ratified — long-term resolution cross-link; at Task 9, update with the actual resolution outcome from the reconciliation decision (whether Operations Lead was included in contract-help scope, deferred further, or substitute-bench made permanent until a future funding event) |

---

## Task 9 backfill procedure

At Task 9 closure (Trustee Panel ≥2-trustee ratification of the reconciliation decision):

1. For each row: set `backfill_status = substantive-backfill-applied`; set `backfill_date` to the Task 9 ratification date; set `supersession-schema-marker` to the Decision 2026-06-01-012 supersession entry ID.

2. For each row: apply the narrow edit in the `source_file` at `source_line` per `reconciliation-decision-framework.md §9` cross-reference update procedure. Replace the "Story 0.12 reconciliation territory" placeholder text with the resolved-outcome text. Verify source_line is still accurate (lines may have shifted if source files were edited between author-commit and Task 9).

3. Update `estimation-worksheet.md §9 Mismatch-ratio history` with the final computed ratios and the reconciliation path(s) ratified.

4. Note: the `ledger.md` funding_status rows for claim-filing (line 86), peer-mesh (line 104), reconciliation (line 140), denial-appeal (line 176), kyc-fallback (line 194), and upi-failure-coach (line 212) do not carry explicit "Story 0.12" text but are also updated at Task 9 as part of the general funding-posture determination (these are implicit reconciliation territory items, not backfill-log rows).
