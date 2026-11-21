# partner-boundary-invariant (Story 12.5, AC10)

**Partners are downstream consumers of explicitly consented leads — never a source of truth for any member's lifecycle, validity,
contribution or claim state** (Epic 12, Story 12.5's boundary AC; Decision `2026-11-21-483` QE15; ADR-0046).

## What it checks

| Rule | Where | What fails |
|---|---|---|
| (a) | `apps/api/tests/integration/partner-boundary.spec.ts` (live route registry) | A body-accepting route (POST / PUT / PATCH / DELETE) whose URL matches `/partner\|lead-outcome\|lead_outcome\|module-lead/i` and carries neither the admin nor the member session guard — an inbound partner path. |
| (b) | `pnpm partner-boundary:check` over `packages/domain/src`, `apps/api/src`, `apps/jobs/src` | The advisory value's names (`partner_reference`, `partnerReference`) as an identifier, a property or inside a string, outside the four files that may touch it: `schema/marketplace_lead_handoffs.ts`, `marketplace/lead-handoff.ts`, `scheduler/module-lead-handoff.ts`, `scheduler/partner-lead-client.ts`. And ANY mention inside `getLeadHandoffStatus` (the member-facing read never returns it). |
| (c) | the four transport files | A use of the `member` / `consent` / `claim` / `contribution` / `pool` / `validityCache` namespaces (or a value import from their modules) that is not one of the READS P0–P5 need: `member.memberExists`, `member.getCurrentMemberState`, `member.listAccountFrozenMemberIds`, `member.moderation.getCurrentMemberModerationOverlay`, `claim.isDeathReportStanding`, `consent.listConsentsForArtifact`, `consent.resolveConsentById`. In the jobs files the rule keys on the namespace (they import the `@twt/domain` barrel); in the two domain files on the relative path and the imported name. Type-only imports are not judged. |
| (d) | `scheduler/partner-lead-client.ts` | `JSON.parse(` or `.json(` — the partner's response body is never parsed; only the status and `X-Partner-Reference` are read. |
| (e) | everything under `apps/jobs/src` | A `createPartnerLeadClient(` call with an argument — production passes no test seam. |

Comments never match (AST-detected). The gate also FAILS when one of its listed files is missing, so a moved or renamed transport
file cannot shrink the scan in silence.

## ⚠ The semantic limit

This gate proves the **absence of the patterns it names**. It does **NOT** prove that no future code path could launder partner data
into what TWT believes about a member — a new table, a new namespace, a value copied through an innocently named field, or an inbound
path that is session-guarded but fed by a partner's export would all pass it. A green run means "none of these five shapes", nothing
more ([[feedback_gate_scope_semantic_coverage]]).

The human half is the review question ADR-0046 sets for **every** future inbound integration (K-5's lead-outcome callback first):

> Does any value this partner sends change what TWT believes about a member's lifecycle, validity, contributions or claims? If yes,
> it is refused.

When a later story adds a file that may touch the advisory reference (an admin view — K-3), it extends `REFERENCE_ALLOWED_FILES` in
`lib.ts` **in that story**, with its own review — never by widening a pattern.

## Run

```sh
pnpm partner-boundary:test   # the planted violations (lib.test.ts)
pnpm partner-boundary:check  # the tree
```
