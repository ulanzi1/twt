# ADR-0019: Tone-review publish gate + automated-floor-vs-human-check relationship (Story 2.2)

> **Status:** drafted
> **Date:** 2026-06-20 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 2.2 closure
> **Ratifying trustees:** <pending; populated at `ratified` status>
> **Supersedes:** —
> **Superseded by:** —

## Context

FR-69 commits that the tone guide is **enforced via copy review** (epics.md L1393). The
**automatable** dimensions of tone — the vocabulary register (`passbook → Yogdaan Bahi`,
`receipt`/`invoice` → `Contribution Note`, `report → Sahyog Vivran`, `user`/`customer`/`donor`
→ colleague), tone prohibitions (scarcity / panic / Pool-Reality comparison-to-target), and
numeral discipline — already ship as the Story 1.17 `microcopy` CI gate (ADR-0016). But the
**human-judgment** dimensions (warmth, dignity, register-fit per surface, grief-context
modulation) cannot be a static lint: no regex decides whether a sentence reads like a
trustworthy neighbour or a donation funnel.

Per [[feedback_architecture_vs_adr_boundary]], the architecture/PRD records the *property*
("member-visible copy is tone-reviewed before publish"); this ADR records the *control
mechanism* that enforces it. Per [[feedback_architecture_vs_prd_boundary]], *which* register
each surface uses is PRD/policy (captured in `docs/tone-guide.md`); the *gate invariant*
(a non-author sign-off must exist before publish) is the architectural control this ADR's
runtime gate enforces.

Several scope questions had to be settled before building, and were **locked at
create-story**:

- **What is the deliverable at Story 2.2?** There is **no member-visible-copy publish
  endpoint** yet — the first (Niyamavali publish) lands at Story 2.4; News/Blog, T&C, push
  templates, and helpdesk macros come later. The "which artifact was reviewed" identity is
  **polymorphic across surfaces that do not exist yet** (a `clause_version_id` from 2.3, a
  future `news_post_id`, a `push_template_id`…).
- **Where does the sign-off persist?** Manufacturing a generic `copy_review_signoffs` table
  now would violate the project's own discipline ("do NOT manufacture keys/stores for
  resources whose endpoints don't exist" — permissions.ts; the 2.1 "`apps/member` doesn't
  exist" reasoning).
- **Which audit taxonomy?** `tone_review.*` events are not auth/security events; routing
  them through the auth-typed `AuthAuditEventType` union (`apps/api/src/audit/audit-sink.ts`,
  whose own comment defers the `SecurityAuditEventType` rename) would conflate taxonomies.
- **Which review permission?** `niyamavali.review` already exists (permissions.ts:88, seeded
  at Story 1.8); a generic `copy.review` key would be a manufactured key for a non-existent
  generic endpoint.

Risk if undecided: the human tone-review obligation decays to "reviewer discretion" (the
exact un-gated-commitment failure the Epic 1 retrospective flagged — [[feedback_record_unattested_no_backfill]]),
and the FR-69 "enforced via copy review" promise has no runtime teeth.

## Decision

**Ship the tone-review gate as a framework-agnostic pure evaluator + a runtime Fastify
pre-handler that enforces a non-author sign-off at the publish boundary — the human layer
above the Story 1.17 `microcopy` automated floor — with the sign-off *record* injected by
the consuming surface (persistence deferred to Story 2.4).** The load-bearing choices:

1. **The gate is a RUNTIME publish gate, not a new CI lint.** Tone review is inherently a
   human-judgment check. The *automated* portion already exists as the Story 1.17 `microcopy`
   CI gate; this story adds the human layer (the `docs/tone-guide.md` + `docs/tone-review-checklist.md`
   process) plus its runtime teeth. The `microcopy` lint is **NOT** re-implemented, widened, or
   duplicated here.

2. **Pure domain evaluator, fail-closed** (`packages/domain/src/tone-review/`). `evaluateToneReviewGate({ signoff, authoredBy, resourceLocator })`
   decides allow/deny from an **injected** sign-off record, enforcing two invariants:
   **sign-off-present** (a `null`/absent sign-off, or one with no reviewer, → deny) and
   **non-author** (`reviewedBy === authoredBy` → deny). No Fastify/HTTP import (the
   `rbac/check.ts` precedent). A `ToneReviewRequiredError` with a `toErrorResponse(requestId)`
   projector mirrors `AuthorizationDeniedError`, surfaced at the `@twt/domain` top level for the
   error-mapping middleware.

3. **HTTP 409 `tone-review-required`.** The error-mapping middleware maps `ToneReviewRequiredError`
   → 409 via its own projector, alongside the RBAC 403 branch — matching the Story 2.4 publish
   contract (epics.md L1490).

4. **Persistence is the consumer's, not Story 2.2's.** The evaluator operates on an injected
   sign-off; the pre-handler (`requireToneReviewSignoff(deps, opts)`) resolves it via
   `opts.resolveSignoff(request)`. The **first concrete persistence is owned by Story 2.4**,
   which already commits to recording tone-reviewer attribution + `clause_version_id`
   (epics.md L1485). This is the established "land-once primitive → consumer wires in with
   teeth" pattern (gate-inventory Category B).

5. **Dedicated audit seam, through the Story 1.10 writer.** `tone_review.signoff` (status 200)
   and `tone_review.publish_blocked` (status 409) route through a dedicated `ToneReviewAuditSink`
   (a SIBLING of the auth `AuthAuditSink`, NOT an extension of `AuthAuditEventType`). Its default
   impl maps to a `@twt/domain` `AuditEntryInput` and calls `writeAuditEntry` fire-and-forget /
   never-throw (the `createAuditLogSink` precedent). Both actions match the writer's
   `^[a-z0-9_]+(\.[a-z0-9_]+)+$` regex; the reviewed copy is carried only as a **content hash**
   in `requestPayloadHash` — never raw copy material.

6. **Reuse `niyamavali.review`; manufacture no generic key.** Each governed surface uses its own
   resource-specific review permission, added by the story that ships that surface. WHO may
   review is enforced at the consumer's review-submission endpoint (Story 2.4); the publish gate
   enforces only **sign-off-present + non-author**.

7. **The two layers are both required.** `docs/tone-guide.md §5` states the relationship: the
   `microcopy` gate is the automated floor; the tone-review sign-off is the human check above it.
   A passing lint does not waive the human sign-off, and a sign-off does not waive the lint.

## Alternatives considered

- **A CI lint for tone** — Rejected. Warmth/dignity/grief-register are human-judgment axes a
  static analyzer cannot evaluate; only the automatable subset (already the `microcopy` gate)
  belongs in CI. A lint would produce false confidence ("tone passed") for the dimensions it
  cannot see.
- **A generic `copy_review_signoffs` table + a `copy.review` permission now** — Rejected:
  manufactures a store + key for endpoints that do not exist, across surfaces whose review-id
  shape is still polymorphic. Violates the project's own "no speculative store" discipline.
  The injected-record seam defers the shape to the first real consumer (Story 2.4).
- **Extend `AuthAuditEventType` with `tone_review.*`** — Rejected: tone review is not an
  auth/security event; the auth taxonomy already carries a deferred `SecurityAuditEventType`
  rename. A dedicated seam keeps the taxonomies honest and routes both through the same 1.10
  writer.
- **Throw from the pure evaluator** — Rejected: the evaluator returns a structured result
  (the `hasPermission`/`requirePermission` split); the apps/api adapter owns the throw +
  audit emission, keeping the domain layer framework-agnostic and side-effect-free.
- **Mount the gate on a placeholder publish route now** — Rejected: no publish endpoint exists
  at Story 2.2 (the disaster-prevention note). Teeth are proven against a stub resolver + fake
  audit sink (no live DB), and the gate is registered Category B awaiting the Story 2.4 consumer.

## Consequences

- **Operational** — A new runtime gate obligation lands installed-but-unmounted (gate-inventory
  Category B). Story 2.4 mounts `requireToneReviewSignoff` in the Niyamavali publish `preHandler`
  chain and supplies the sign-off resolver + persistence. A new `toneReviewAuditSink` dependency
  is wired into `AppDeps` / `createDeps` / test-deps (mirroring `auditSink`).
- **Security** — Neutral-to-positive: fail-closed by construction (missing/empty/self-review →
  deny); no PII/secret reaches the audit seam (content is a hash). The 1.10 hash-chain writer is
  the integrity backstop.
- **Performance** — Negligible: a pure synchronous decision + a fire-and-forget audit write on
  the service pool, off the request's app-pool transaction.
- **Cost** — None.
- **Failure modes accepted** — (a) The gate is mounted by no route at Story 2.2 (inert until
  2.4); this is the deliberate land-once posture, tracked in gate-inventory with an explicit
  re-trigger. (b) Persistence of which-artifact-was-reviewed is the consumer's; until Story 2.4,
  no durable signoff store exists (only the audit trail). (c) The audit emitter is never-throw,
  so an audit-sink failure is logged + dropped, never propagated — an audit failure cannot change
  the gate decision (proven by the throwing-sink test).
- **Migration / pivot path** — If a future surface needs a richer sign-off record (e.g. multiple
  reviewers, expiry), extend `ToneReviewSignoff` + the resolver contract; the `evaluateToneReviewGate`
  invariants and the 409 mapping stay. Reverse via a successor ADR.

## References

- [Source: epics.md, Story 2.2 (L1424-1440)] — owning Story; ACs; `[GOVERNANCE]` label (L1403)
- [Source: epics.md L1484-1490] — Story 2.4 consumer contract (409 `tone-review-required`; tone-reviewer attribution + `clause_version_id` on publish)
- [Source: epics.md L1393] — FR-69 (tone guide enforced via copy review); [Source: epics.md L2782] — Pool-Reality prohibited frames
- [Source: `docs/tone-guide.md` + `docs/tone-review-checklist.md`] — the human process this gate enforces
- [Source: packages/domain/src/rbac/check.ts:219-256; packages/domain/src/errors.ts:85-110] — the `AuthorizationDeniedError` projector pattern mirrored here
- [Source: packages/domain/src/audit/write.ts:71-122] — `AuditEntryInput` + `writeAuditEntry`; [Source: apps/api/src/audit/audit-log-sink.ts] — the never-throw sink precedent; [Source: apps/api/src/audit/audit-sink.ts] — the seam pattern (and the deferred `SecurityAuditEventType` rename)
- [Source: apps/api/src/modules/rbac/index.ts:68-110] — `requirePermissionHook` shape mirrored; [Source: apps/api/src/middleware/error-mapping/index.ts] — the 409 branch; [Source: apps/api/src/context.ts] — `AppDeps` seam wiring
- [Source: packages/domain/src/rbac/permissions.ts:88] — `niyamavali.review` (reused, not manufactured)
- [Source: ADR-0016] — Story 1.17 `microcopy` automated floor (the layer below this gate)
- [Source: `_bmad-output/implementation-artifacts/gate-inventory.md`] — Category-B registration (runtime publish gate, Story 2.4 re-trigger)
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live Section A index row for this ADR
- Memory: [[feedback_architecture_vs_adr_boundary]] (ADR records control, architecture records property); [[feedback_architecture_vs_prd_boundary]] (register = PRD policy; sign-off-gate = architectural control); [[feedback_closure_language_precision]] (Closed-by-edit vs Resolved-via-deferral); [[feedback_record_unattested_no_backfill]] (un-gated commitments decay → gate the re-commitment); [[project_ci_actions_suspension_local_mirror]] (ci:local is the merge gate)

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-20 | (initial draft) | BigDev (Solo Builder) | Authored under Story 2.2 (tone-guide + vocabulary enforcement process) closure |
