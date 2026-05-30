# Fallback-Handler Rota

**Authority:** Per `README.md` §4 invariant 1 (named, funded, on-rota fallback handler before loop ships) + Story 0.7 AC-1.

**Status:** Author-committed 2026-05-30 as a **schema-only structure**. Substantive rota population (substantive identity + contact data + finalized rota windows per loop node) is **Task 10 territory** — post-Operations-Lead-hire (or substitute-handler-bench formal ratification per `operations-lead-commitment.md` §6) + per-loop-node-handler appointment per Task 9. At author-commit, every row carries `pending-rota-population` with the Task 10 dependency cited.

**NDA discipline:** Contact identity fields are NDA territory per the Story 0.6 engineer-roster need-to-know precedent (per `README.md` §4 invariant 4). Specific identity data is stored out-of-band per operations policy; only the `<NDA — see operations-policy>` placeholder is committed in this framework. Substantive identities are recorded with redacted-identity hash + last-engagement-event-date for accountability per the Story 0.6 engineer-roster discipline.

**Forbidden-removal rule:** Rows are append-only; supersession is the only allowed lifecycle exit per `README.md` §4 invariant 2.

---

## Schema

Per AC-1 of Story 0.7, each row carries:

| Column | Meaning | Allowed values |
|---|---|---|
| `loop_node_id` | Canonical kebab-case slug per `ledger.md` §2 | `claim-filing` \| `peer-mesh` \| `ground-inspection` \| `reconciliation` \| `helpdesk` \| `denial-appeal` \| `kyc-fallback` \| `upi-failure-coach` |
| `rota_window_start` | Start of the rota window (per the per-loop-node SLA cadence requirement) | Free text; format ISO-8601 date-time (timezone required — use IST or explicit UTC offset, e.g., `2026-06-01T08:00:00+05:30`) OR rota-window-label (timezone required in label, e.g., `weekly-mon-08:00-IST`, `per-shift-IST`); substantive value at Task 10 |
| `rota_window_end` | End of the rota window | Free text; format matching `rota_window_start`; timezone required when a point-in-time format is used; for recurring-window labels, timezone suffix required (e.g., `weekly-mon-17:00-IST`); substantive value at Task 10 |
| `primary_handler_role` | Named role of primary handler on rota during this window | Free text; matches `ledger.md` §3 `fallback_handler_role` once Task 9 closes |
| `primary_handler_contact_ref` | Contact reference for primary handler (NDA-protected) | `<NDA — see operations-policy>` at author-commit; substantive identity stored out-of-band; record redacted-identity hash + last-engagement-event-date for accountability |
| `secondary_handler_role` | Named role of secondary handler on rota during this window | Free text; matches `ledger.md` §3 `fallback_handler_role` |
| `secondary_handler_contact_ref` | Contact reference for secondary handler (NDA-protected) | `<NDA — see operations-policy>` at author-commit; substantive identity stored out-of-band |
| `last_engagement_event_date` | Date of last fallback-handler engagement (paging triggered + handler responded) for this rota row | ISO-8601 date; empty at author-commit; populated post-Task-11 on first engagement event |
| `notes` | Free-text notes per row | Free text |

---

## Rota rows (per loop node)

At author-commit, every row carries `pending-rota-population`; substantive population is Task 10 territory.

### claim-filing rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `claim-filing` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Helpline Operator) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (claim-shepherd staff) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: weekly primary + biweekly secondary per `loop-nodes/claim-filing.md` §7; per-loop-node negotiation at Task 10. Highest-stakes loop node per PRD §9.1.1 — may evolve to daily primary as Pariwar density grows |

### peer-mesh rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `peer-mesh` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (peer-mesh coordinator) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (peer-mesh coordinator backup) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: weekly primary + monthly secondary per `loop-nodes/peer-mesh.md` §7 |

### ground-inspection rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `ground-inspection` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Field-worker dispatch supervisor) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (District Admin) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: biweekly primary + monthly secondary per `loop-nodes/ground-inspection.md` §7 |

### reconciliation rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `reconciliation` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Reconciliation triage on-call) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Nominee shepherd / claim-shepherd staff) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: daily primary + weekly secondary per `loop-nodes/reconciliation.md` §7 — reconciliation is daily-cadence by nature |

### helpdesk rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `helpdesk` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Helpline shift supervisor) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (helpdesk on-call) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: per-shift primary + daily secondary per `loop-nodes/helpdesk.md` §7 — helpdesk is per-shift by nature; carrier-level auto-attendant covers inbound-outage cases per architecture §3.5 (automated; not a staff rota slot) |

### denial-appeal rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `denial-appeal` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (State Trustee per Story 6.13) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (appeal-shepherd) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: weekly primary + monthly secondary per `loop-nodes/denial-appeal.md` §7 |

### kyc-fallback rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `kyc-fallback` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (manual KYC reviewer) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (manual KYC reviewer backup) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: weekly primary + biweekly secondary per `loop-nodes/kyc-fallback.md` §7 |

### upi-failure-coach rota

| `loop_node_id` | `rota_window_start` | `rota_window_end` | `primary_handler_role` | `primary_handler_contact_ref` | `secondary_handler_role` | `secondary_handler_contact_ref` | `last_engagement_event_date` | `notes` |
|---|---|---|---|---|---|---|---|---|
| `upi-failure-coach` | `pending-rota-population` | `pending-rota-population` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Contribution-loop staff support) | `<NDA — see operations-policy>` | `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Helpline Operator pool) | `<NDA — see operations-policy>` | _(empty)_ | Recommended cadence: daily primary + weekly secondary per `loop-nodes/upi-failure-coach.md` §7 — contribution cycles are daily-cadence |

---

## Rota population dependencies

- **Task 8 closure** (Trustee Panel Operations Lead hire OR substitute-handler-bench formal ratification per `operations-lead-commitment.md` §6) — required before Task 9 + Task 10 can proceed substantively
- **Task 9 closure** (per-loop-node fallback handler named + funded + per-loop-node ratification) — required before Task 10 substantive rota population; the `primary_handler_role` + `secondary_handler_role` columns flip from `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` to substantive role names at Task 9
- **Task 10 substantive population** — Operations Lead (or substitute-bench representative) populates substantive identity + contact data + finalized rota windows per loop node; ≥2 trustees ratify the populated `ledger.md` per the README §5 sign-off lifecycle; this rota's rows flip from `pending-rota-population` to substantive values

## Rota refresh cadence

Per `README.md` §6 review cadence fallback:

- **Monthly per-loop-node rota refresh** — Operations Lead reviews each rota row for stale contact identities, rota-window shifts, on-leave coverage; refresh logged in `ledger.md` §8 Periodic re-attestation log
- **Per-Story-closure rota update** — when a new Phase-1 loop node ships, the rota is updated within 30 days; new loop-node-inventory row appended per the supersession schema

## NDA discipline reminder

The `primary_handler_contact_ref` + `secondary_handler_contact_ref` columns NEVER carry substantive contact identities in this framework. Substantive identity is stored out-of-band per operations policy. The framework commits the **rota structure** (rota-window, role-on-rota, last-engagement-event-date for accountability) but NOT the **substantive identity** (which is operations-policy-territory per the Story 0.6 engineer-roster precedent).

If a row's `primary_handler_contact_ref` or `secondary_handler_contact_ref` carries any value other than `<NDA — see operations-policy>` OR a documented redacted-identity hash, that is a framework violation per `README.md` §4 invariant 11 (forbidden statuses).
