# Mirror Destination Inventory

This inventory enumerates the code-escrow mirror destination(s) — the trustee-controlled location(s) that receive every release-branch push per AR-67 + PRD §9.1.1 + architecture §5.4.

**Authority:** Story 0.3 (epics.md) AC-1. Each row is a candidate or ratified mirror destination. Status follows the lifecycle in `README.md` §"Framework lifecycle." The destination platform + credential model + replication mechanism are committed by the code-escrow-mirror-destination ADR (Story 0.3 Task 7); until the ADR lands, rows live at status `pending-ADR`.

## Inventory schema

Allowed `Availability status` values (full lifecycle from `README.md` §"Framework lifecycle"):

- `mirror-destination-inventoried` — candidate destination recorded; pre-ADR; pre-selection. Closure-language precision per [[feedback_closure_language_precision]]: this is the "Resolved via explicit deferral" state until Task 7 closes (the deferral rationale is "Trustee Panel + Solo Builder selection authority pending").
- `pending-ADR` — synonymous with `mirror-destination-inventoried` for rows that are inventoried specifically for Task 7 deliberation; preserved as a status for backward-compatibility with Story 0.3 author-commit phrasing.
- `ADR-ratified` — the code-escrow-mirror-destination ADR has named this destination; provisioning has not yet begun.
- `provisioned-pending-wire` — destination ADR-ratified and provisioned at the platform; access credentials generated but not yet wired into GitHub Actions secrets.
- `wired-pending-verification` — GitHub Actions secrets populated; mirror workflow operational; awaiting first successful push + ≥2-trustee read-access verification.
- `verified` — at least one release-branch push has replicated successfully AND ≥2 trustees have independently verified read-access from the mirror (per `code-escrow-ledger.md` "Read-access verification log").
- `restoration-drill-passed` — a trustee-authorized engineer has executed `restoration-procedure.md` end-to-end against this destination (clone + build + non-prod deploy); recorded in `code-escrow-ledger.md` "Restoration drill log."
- `bus-factor-table-topped` — a non-Solo-Builder engineer has executed the AC-2 switch-to-mirror exercise under bus-factor silence; recorded in `code-escrow-ledger.md` "Bus-factor switch-to-mirror log."
- `superseded` — this destination has been replaced by a newer destination per the mechanism-level revision path (`README.md` §"Open ADR slots"); preserved here for history, never re-activated without a new ADR.

**Forbidden statuses** (the framework MUST abort on row creation):

- Any status beyond `pending-ADR` recorded WITHOUT a corresponding `Trustee-administrative-control attestation` value (sole-Solo-Builder admin defeats AR-67 per `README.md` §"Surface separation").
- Any status beyond `pending-ADR` recorded WITHOUT a corresponding ADR cite (the destination's control choice is ADR territory per `README.md` §"Property / control / policy three-way discipline").

## Inventory

| Destination name | Platform | Trustee-administrative-control attestation | Geographic location | Credential model | Availability status | Provisioning Story | Re-verification trigger | Notes |
|---|---|---|---|---|---|---|---|---|
| _candidate-mirror-1_ | _pending-ADR (candidate platforms: GitLab.com, Codeberg, Gitea-self-hosted, Bitbucket, hybrid dual-mirror)_ | _pending-ADR (≥1 trustee owner-account; ≥2 recommended subject to ADR)_ | _pending-ADR (the destination MUST be in a different region/cloud than the primary GitHub host to satisfy the geographic-resilience property — see Open Question #7 in Story 0.3 file)_ | _pending-ADR (candidates: deploy-key SSH; OAuth token with repo:write scope; platform-native push-mirror; hybrid)_ | `pending-ADR` | 0.3 | Trustee Panel ratification of mirror destination + credential model ADR (Story 0.3 Task 7) | First row reserved for the primary mirror destination. Closure-language precision per [[feedback_closure_language_precision]]: this row is "Resolved via explicit deferral" — the destination MUST be selected, but selection is Trustee Panel + Solo Builder authority and the selection happens in Task 7 which is `_AWAITING EXTERNAL ACTION_` at Story 0.3 closure. Status flips on Task 7 ADR landing |
| _candidate-mirror-2 (if hybrid dual-mirror is selected)_ | _pending-ADR_ | _pending-ADR_ | _pending-ADR_ | _pending-ADR_ | `pending-ADR` | 0.3 | Trustee Panel ratification of mirror destination + credential model ADR (Story 0.3 Task 7) | Reserved for the second mirror destination IF the Trustee Panel selects a hybrid dual-mirror posture (e.g., GitLab.com + Codeberg simultaneously) per Story 0.3 Open Question #3. **If single-destination is selected at Task 7 landing, this row is marked `superseded`** (per `README.md` §"Framework lifecycle" forbidden-removal discipline — row removal is forbidden; supersession is the only allowed lifecycle exit). The `superseded` row preserves history and is annotated with the Task 7 decision rationale; it is not re-activated without a new ADR |

## Inventory status summary

At Story 0.3 author-commit time: 0 destinations `verified` or higher; 2 candidate rows at `pending-ADR` reserved for the Task 7 ADR. The candidate row count is intentional — it makes the inventory non-empty before the ADR lands so readers (Trustee Panel deliberation in Task 7) see the lifecycle is committed even when the specific choice is pending.

**Closure-language precision callout** per [[feedback_closure_language_precision]]:

The discipline names two valid states ("Closed by [edit]" and "Resolved via explicit deferral") plus a third sentinel ("Not addressed") that — if it ever appears — is a framework gap that triggers an Open Question, NOT a valid third option. Both rows at Story 0.3 author-commit time are explicitly in the "Resolved via explicit deferral" state:

- "Resolved via explicit deferral" — the deferral rationale is "Trustee Panel + Solo Builder authority required for destination selection per AR-67 + Story 0.3 AC-1; selection deferred to Task 7 which is `_AWAITING EXTERNAL ACTION_` at Story 0.3 author-commit time." The revisit trigger is Task 7 ADR landing.
- Neither row is "Closed by [edit]" — no destination is selected, provisioned, or verified at Story 0.3 author-commit time.

The "Not addressed" sentinel is therefore NOT a recorded state of either row; it is the framework-gap trigger that would force an Open Question if a row had no rationale and no revisit trigger. Both rows have both.

## Re-evaluation cadence

Per `README.md` §"Review cadence":

- **Periodic re-verification** of every `verified`-or-higher row: quarterly (fallback pre-operations-policy) — ≥2 trustees re-clone, re-verify HEAD SHA against the workflow's last-recorded SHA, record the row in `code-escrow-ledger.md` "Periodic re-verification log."
- **Substrate-pivot trigger** (per Story 0.2 review-decision patch precedent): if a mirror destination platform's governance, ToS, regulatory posture, or operational characteristics change in a way that affects AR-67 + §2.10a + §5.4 compliance (e.g., GitLab.com is acquired by an entity hostile to the trust's mission; Codeberg's hosting region changes in a way that affects geographic-resilience; a platform deprecates the credential model selected by the ADR), the affected row's re-evaluation runs within 30 days of the trigger detection. Recorded in `code-escrow-ledger.md` "Periodic re-verification log" with a `substrate-pivot` event tag.
- **Mechanism-level revision trigger** (per `README.md` §"Open ADR slots" mechanism-revision path): if the chosen mechanism is itself flawed (the platform's push-mirror SLA cannot meet 10 minutes; the credential model lacks rotation hooks compatible with §5.9), the ADR is superseded; the row's status flips to `superseded`; a new row enters at `pending-ADR` for the replacement destination.

## Row-addition authority

Per `README.md` §"Sign-off lifecycle" inheritance from Story 0.2:

- Inventory row addition (e.g., adding a second mirror destination after Task 7 selects hybrid dual-mirror; or adding a replacement destination after a mechanism-revision supersession) requires ≥1 trustee acknowledgment + a `.decision-log.md` `[CONTINUITY]` entry naming the new row + its mirror-destination ADR cite.
- Inventory row removal is **forbidden** — supersession is the only allowed lifecycle exit (per `README.md` §"Framework lifecycle" forbidden-transitions list). A superseded row preserves history; deletion erases it.

## Cross-references

- `README.md` — framework lifecycle, property/control/policy discipline, surface separation, sign-off lifecycle
- `code-escrow-ledger.md` — trustee event-record (authoritative for verification status reconciliation)
- `mirror-procedure.md` — operational procedure that consumes the wired credentials
- `restoration-procedure.md` — operational procedure that exercises the destination
- `../README.md` (Story 0.2 credential escrow README) — the framework whose envelopes hold the mirror-push credential values
- `../credential-inventory.md` (Story 0.2 inventory) — the row that records the mirror-push credential's envelope (added at Story 0.3 Task 8)
- Story 0.3 file (`_bmad-output/implementation-artifacts/0-3-code-escrow-auto-mirror-pipeline-live.md`) — AC text, Open Questions, Cross-Story Dependency Map
- Architecture §5.4 — Source-code host: GitHub primary; escrow mirror to trustee-controlled location per Step 2 §9.1.1
- Architecture §2.10a — surface separation invariant (the structural property the mirror MUST preserve)
- PRD §9.1.1 — bus-factor mitigation rationale + 30-day takeover property
- AR-67 — solo-build operational continuity commitment, including code escrow
