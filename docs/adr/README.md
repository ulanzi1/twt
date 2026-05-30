# Architecture Decision Records (ADRs)

This directory holds the project's Architecture Decision Records — durable narrative documents that capture *load-bearing* technical decisions, the alternatives considered, and the rationale that led to the chosen path. Authority: architecture.md §Workspace Layout (lines 636 + 4170) commits this directory's existence; architecture.md §Implementation Handoff (lines 5069-5096) commits the lifecycle (substantive content is PR-2 / implementation-time work); Story 0.5 Task 1 scaffolds it as the closure leg of Decision 2026-05-29-003 Open Follow-up #6.

The **live index** of ADRs (with current status + deferred-slot inventory + expected-close triggers) is `docs/knowledge-transfer/adr-index.md` per Story 0.5. This README declares the directory's existence, lifecycle, naming convention, and authoring discipline; the index is the canonical place to read ADR status. Do not duplicate the index here.

## Lifecycle

Every ADR moves through a small, named lifecycle:

1. **`drafted`** — Author writes the body; the file lands in `docs/adr/` with `Status: drafted` in the front matter. Subject to Solo Builder + (where applicable) named architect / PM review.
2. **`under-trustee-review`** — Drafted ADR is presented for ≥2-trustee review. The `under-trustee-review` window is bounded by operations policy cadence.
3. **`ratified`** — Trustee Panel + Solo Builder agree; the ADR is ratified and becomes operationally binding. The corresponding row in `docs/knowledge-transfer/adr-index.md` flips to `ratified`. A ratified ADR is referenced by runbooks, framework READMEs, and the implementing code.
4. **`superseded`** — A later ADR overrides this one. The superseded ADR is NOT deleted; its `Status:` is updated to `superseded` and it gains a `Superseded by: ADR-NNNN-<title>` field. The successor's `Supersedes:` field cross-links back. This preserves the architectural-evolution record per architecture §Architecture sunset → maintenance mode.

A fifth implicit state — **`slot-reserved-pre-write`** — applies to ADR slots that have been catalogued in `adr-index.md` but for which no draft file yet exists in this directory. This is the dominant state at Phase 0 per architecture §Implementation Handoff: most ADRs are deferred to implementation time.

## Naming convention

ADR files follow the format:

```
adr-NNNN-<short-kebab-title>.md
```

Where:
- `NNNN` is monotonically-increasing across the directory (zero-padded to four digits). The next available number is determined by reading the existing files in `docs/adr/` and incrementing; conflicts are resolved at PR time. Do NOT renumber existing ADRs.
- `<short-kebab-title>` is a brief, lowercase-kebab-case slug capturing the decision (e.g., `mirror-destination-platform`, `paging-saas-selection`, `audit-loss-window-mechanism`).

Examples (illustrative — substantive content is PR-2 work):
- `adr-0001-turborepo-monorepo-bootstrap.md`
- `adr-0002-cloud-sql-postgres-prod-instance.md`
- `adr-0003-mirror-destination-platform.md`

A reserved slot's filename in the index is the placeholder identifier `ADR-NNNN-<kebab-title>` — the file is created when the slot's status flips out of `slot-reserved-pre-write`.

## Body schema — canonical structure

All ADR files use the canonical schema captured in `_adr-template.md`. The schema is:

- **Title** — the decision in one line (e.g., `# ADR-0003: Mirror destination platform`)
- **Status** — one of `drafted | under-trustee-review | ratified | superseded`
- **Date** — `Date: YYYY-MM-DD` (the date the ADR entered its current status)
- **Context** — the conditions that forced the decision (architecture commitments deferred to this ADR; operational requirements; constraints; risks; the decision deadline)
- **Decision** — the chosen path stated unambiguously, with explicit values where applicable (provider, version, configuration, capability bar)
- **Alternatives considered** — the rejected paths with the reason for rejection
- **Consequences** — the operational, security, performance, and cost implications; the failure modes accepted; the migration / pivot path if the decision needs to be reversed
- **References** — architecture sections + PRD sections + Story keys + memory `[[name]]` links + URLs for vendor docs (where applicable)
- **Supersession metadata (optional)** — `Supersedes: ADR-NNNN-<title>` + `Superseded by: ADR-NNNN-<title>` lines for cross-linkage. Filled when the ADR replaces or is replaced by another.

Copy `_adr-template.md` when authoring a new ADR rather than re-deriving the structure.

## Authoring discipline

- **Property / control / policy boundary** per [[feedback_architecture_vs_adr_boundary]] + [[feedback_architecture_vs_prd_boundary]]: ADRs commit **control mechanisms** (specific provider, specific version, specific configuration). Architecture commits **properties** (capability bars, invariants, structural relationships). PRD commits **policies** (eligibility, cadence, what-the-trust-does). An ADR that re-states an architectural property is duplicative; an ADR that authors policy oversteps; an ADR that names a control without an architectural property to ground it is unmoored.
- **Substantive ADR content is implementation-time work** per architecture §Implementation Handoff (lines 5069-5096): "PR-2 ADRs are transcription of architectural decisions already documented in Steps 2–6, not net-new architectural work." Story 0.5 Task 1 scaffolds this directory; Story 0.5 Task 2 inventories the deferred slots in `docs/knowledge-transfer/adr-index.md`; the substantive ADRs are authored as PR-2 + downstream-Story implementation lands.
- **No silent decisions.** A decision being made in commit-time prose, in a runbook, in a framework README, or in code review — without an ADR — is a process violation. The fix: open an ADR + cross-link from the surface where the decision was being made.
- **Reversibility surface.** Every ADR's Consequences section names the migration / pivot path if the decision needs to be reversed. ADRs are durable, but they are not irreversible — and the path back is part of the decision.

## Relationship to runbooks + framework READMEs + the `.decision-log.md`

- **ADRs** cover **decisions** (what we chose and why). They are durable. They live here.
- **Runbooks** (`docs/runbooks/`) cover **operations** (how to do the thing the ADR chose). They reference ADRs by ID.
- **Framework READMEs** (`docs/escrow/README.md`, `docs/runbooks/README.md`, `docs/degradation-policy/README.md`, `docs/knowledge-transfer/README.md`) describe **framework scope, lifecycle, and structural invariants** for a cross-cutting concern. They may reference ADRs by ID but do not author ADR content.
- **`.decision-log.md`** (project root) covers **trustee-ratified operational decisions** — runbook sign-offs, escrow openings, backup-engineer authorizations, substrate-validation outcomes. The decision-log is narrower than the ADR directory: ADRs cover architectural decisions; the log covers governance actions.

When a runbook references a decision that lives in an ADR, it cites the ADR by ID. When a runbook step requires a decision not yet recorded in an ADR, the step is tagged `[deferred ADR — placeholder procedure]` and the deferred slot is catalogued in `docs/knowledge-transfer/adr-index.md` per Story 0.5.

## Status legend

| Status | Meaning |
|---|---|
| `slot-reserved-pre-write` | The ADR slot has been catalogued in `docs/knowledge-transfer/adr-index.md`; no draft file exists yet in this directory. Dominant state at Phase 0. |
| `drafted` | The ADR file exists; the body is authored; under Solo Builder + (where applicable) named-architect review prior to trustee presentation. |
| `under-trustee-review` | Drafted ADR presented to Trustee Panel; awaiting ≥2-trustee ratification. |
| `ratified` | Ratified by ≥2 trustees; operationally binding; referenced by runbooks + framework READMEs + implementing code. |
| `superseded` | A later ADR has overridden this one; `Status:` flipped + `Superseded by:` link added; body preserved as the architectural-evolution record. |

## Index symmetry note

The live ADR index lives in `docs/knowledge-transfer/adr-index.md` per Story 0.5 Task 2. That file is the single canonical place to read:
- Every deferred-ADR slot already named in architecture / runbooks / escrow / degradation-policy frameworks
- Every drafted / under-trustee-review / ratified / superseded ADR currently in `docs/adr/`
- Per-row metadata: expected-author, expected-close-trigger (the Story whose closure unblocks the ADR), cross-link to the originating commitment

Do NOT maintain a parallel index in this README. When you add an ADR file here, also update the corresponding row in `docs/knowledge-transfer/adr-index.md` (status flip + cross-link).

## File index

- `README.md` (this file) — directory existence + lifecycle + naming + body schema + authoring discipline + relationship surfaces + status legend + index symmetry
- `_adr-template.md` — canonical body schema starter; copy this when authoring a new ADR

ADR files (`adr-NNNN-<title>.md`) are added per the lifecycle above. At Story 0.5 author-commit time, this directory holds only the README + template — substantive ADR drafting is PR-2 / implementation-time work per architecture §Implementation Handoff.

## References

- [Source: `_bmad-output/planning-artifacts/architecture.md`, §Workspace Layout (line 636 + line 4170)] — directory existence commitment
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §Implementation Handoff (lines 5069-5096)] — PR-2 / implementation-time substantive content commitment
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §Architecture sunset → maintenance mode (lines 5101-5125)] — supersession discipline
- [Source: `_bmad-output/implementation-artifacts/0-5-knowledge-transfer-documentation-pack-compiled.md`] — Story 0.5 Task 1 scaffolds this directory; Story 0.5 Task 2 populates the live index
- [Source: `.decision-log.md`, Decision 2026-05-29-003] — Open Follow-up #6 closure leg
- [Source: `docs/runbooks/README.md`, §"Relationship to ADRs"] — runbook ↔ ADR relationship
- [Source: `docs/knowledge-transfer/adr-index.md`] — live ADR index + deferred-slot inventory
- Memory: [[feedback_architecture_vs_adr_boundary]] — property-driven design; ADRs commit cloud controls
- Memory: [[feedback_architecture_vs_prd_boundary]] — architecture commits state/transitions/events; PRD commits policy/eligibility/cadence
