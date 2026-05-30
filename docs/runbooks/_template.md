# Runbook: <operation name>

> **Status:** draft / signed-off (with ledger entry at git SHA `<sha>`) / superseded
> **Owner role:** <role responsible for executing this runbook, e.g., "Infrastructure on-call">
> **Last material edit:** YYYY-MM-DD by <author>
> **Architectural authority:** architecture.md §<n> · PRD §<n> · ADR-<id> (cite all that ground this runbook)

## 1. Prerequisites

Preconditions that must hold before the procedure begins. Cite architecture sections for non-obvious prerequisites. Examples:

- Environment: dev / staging / prod (which environments this runbook applies to).
- Credentials and access required (cite IAM roles per architecture §5.9 and §5.4 where applicable).
- Prior operations that must have completed (e.g., "Schema migration ran successfully — verified per `verification.audit-log-integrity-verification.md`").
- Information that must be known (e.g., previous deployable image SHA, current Niyamavali version).

## 2. Step-by-step procedure

Numbered, executable steps. Each step should be concrete enough that an engineer with the prerequisites can execute it without judgment calls.

1. <step 1>
2. <step 2>
   - <sub-step 2a>
3. <step 3 — note any decisions that require trustee escalation, ADR reference, or operations-policy lookup>

Where a step requires a decision that is currently deferred to an ADR not yet authored, tag the step:

> `[deferred ADR — placeholder procedure]` <describe the placeholder procedure that holds until the ADR lands; reference the ADR backlog ID if known>

## 3. Rollback procedure

What to do if the operation fails partway or produces a wrong outcome.

- For operations the architecture commits as forward-only (e.g., schema migrations per §1.8), rollback is a *new forward operation*, not a reversal. Document the forward path explicitly.
- For reversible operations, describe the inverse and cite the architecture section that grounds it.
- Name the verification check that confirms rollback succeeded (forward-link to §4).

## 4. Verification checks

Observable post-conditions that prove the operation succeeded. Each check returns a deterministic pass/fail signal.

- [ ] <Check 1 — command, query, dashboard URL, or log query; expected result>
- [ ] <Check 2>
- [ ] <Check 3>

If any check fails, do not declare success; escalate per §5.

## 5. Contact escalation list

Roles, not individuals where possible. Specific contacts live in operations policy.

- **Primary:** <role>
- **Secondary (if primary unreachable within SLA):** <role>
- **Trustee escalation (when operation affects trustee-relevant invariants):** Trustee Panel chair on rota

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| YYYY-MM-DD | <sha> | <author> | yes / no | yes (≥1 trustee) / yes (≥2 trustees) / no | <link to ledger row> |
