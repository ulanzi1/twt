# ADR-NNNN: <decision in one line>

> **Status:** drafted / under-trustee-review / ratified / superseded
> **Date:** YYYY-MM-DD (date entered current status)
> **Author:** <Solo Builder OR named architect / PM at owning-Story closure>
> **Ratifying trustees:** <names; populated at `ratified` status>
> **Supersedes:** ADR-NNNN-<prior-title> (optional; only if this ADR replaces a prior one)
> **Superseded by:** ADR-NNNN-<successor-title> (optional; filled when this ADR is overridden)

## Context

The conditions that forced this decision. Capture:

- The architectural property / commitment that this ADR is the control mechanism for (e.g., "architecture §5.10 commits paging-surface property — this ADR selects the paging SaaS"). Per [[feedback_architecture_vs_adr_boundary]], the ADR records the control; the architecture records the property. Cite the architecture section by line numbers.
- Operational requirements (SLOs, NFRs, capacity envelopes the chosen mechanism must satisfy).
- Constraints (residency, regulatory, contractual, budgetary, team-capacity).
- Risks (what fails if no decision is made; what fails if the wrong decision is made).
- Decision deadline (calendar event, operational trigger, dependent Story closure).

Keep this section factual — the *Decision* section captures the *choice*; the *Context* explains why a choice was necessary.

## Decision

The chosen path stated unambiguously. Include:

- The specific provider / library / mechanism / configuration / version selected.
- The capability bar the selection satisfies (cite the architectural section that committed the capability bar).
- The configuration values committed (or the reference to the operations-policy document that holds them).
- The migration path forward (if applicable — e.g., "Dokploy v1 → K8s when 2nd-Pariwar provisioning OR sustained ≥70% peak-cycle infra utilization").

State the decision as a single declarative sentence (or paragraph) at the top of this section, then enumerate the load-bearing details below.

## Alternatives considered

Each rejected alternative, with the **reason for rejection** (not just the alternative itself). Examples:

- **<Alternative A>** — Rejected because <reason cite>. Notes on residual risk (e.g., "if Alternative A's residency story changes, revisit this ADR").
- **<Alternative B>** — Rejected because <reason cite>.
- **<Alternative C>** — Deferred (not rejected); cross-link to the future ADR slot if the alternative may be re-considered at a named trigger.

A "rejected" alternative may still be the right call if conditions change. Naming the trigger condition preserves the option-space.

## Consequences

The operational, security, performance, cost, and process implications of the decision. Cover at minimum:

- **Operational** — Runbook obligations (which runbooks this ADR's choice creates / modifies; e.g., a paging-SaaS selection creates an alarm-routing step in the on-call playbook).
- **Security** — Threat-model surface changes (e.g., a third-party SaaS introduces a vendor-trust dependency; cite architecture §2.1 threat-actor inventory if relevant).
- **Performance** — SLO impact (capacity envelopes, latency budgets per architecture §5.12 NFR budgets).
- **Cost** — Per-Pariwar / per-environment cost implication; cross-link to architecture §5.13 cost controls if relevant.
- **Failure modes accepted** — What this decision admits as residual risk (e.g., "if the paging SaaS outage exceeds 30 min, the backup-alert path activates per architecture §5.10 backup alert path property").
- **Migration / pivot path** — How to reverse this decision if needed. Include: the trigger conditions (drill failure; operational signal; trustee judgment); the steps; the successor-ADR pattern. ADRs are durable, but they are not irreversible.

## References

- [Source: architecture.md §<section>, lines <N>-<M>] — every architectural property this ADR controls
- [Source: PRD §<section>, lines <N>-<M>] — every PRD policy this ADR's control surfaces under
- [Source: epics.md, Story <X.Y>] — owning Story (the Story whose closure unblocks substantive content for this ADR)
- [Source: `.decision-log.md`, Decision YYYY-MM-DD-NNN] — trustee-ratification entry (when ratified)
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR
- [Source: <vendor doc URL>] — for vendor-specific decisions where applicable
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor
- Memory: [[feedback_architecture_vs_prd_boundary]] — boundary anchor

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| YYYY-MM-DD | (initial draft) | <author> | Authored under <Story / triggering event> |
| YYYY-MM-DD | drafted → under-trustee-review | <author> | Presented to Trustee Panel meeting <date> |
| YYYY-MM-DD | under-trustee-review → ratified | <ratifying trustees> | Ratified at Trustee Panel meeting <date>; logged in `.decision-log.md` Decision YYYY-MM-DD-NNN |
