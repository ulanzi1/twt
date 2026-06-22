# ADR-0021: Niyamavali draft store + audit-logged publish state machine

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (continuation of the ADR-0010 session); governance clarification adopted in-session — this audit-logged draft→publish workflow is the authoritative path by which Niyamavali amendments become official and publishable (Decision 2026-06-21-059 amendment C); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 2.4 turns the Story 2.3 registry `[PRIMITIVE]` (the `clause_versions` /
`niyamavali_amendments` data model + the framework-agnostic `niyamavali.*`
accessors) into a real trustee `[SURFACE]`: author → edit draft → preview diff →
submit for tone-review → non-author sign-off → audit-logged publish. It is the FIRST
CONSUMER of the Story 2.2 tone-review gate (`requireToneReviewSignoff`) and the OWNER
of the seams Stories 2.2 / 2.3 explicitly handed forward.

Per [[feedback_architecture_vs_adr_boundary]], architecture commits the *properties*
(DB-authoritative time §1.11; the mandatory amendment-scope declaration §1.10; the
audit-or-throw posture; the shape-vs-engine seam freeze row 14); this ADR commits the
*controls* that realise the new workflow — most load-bearingly the **server-persisted
draft store**, the **content-bound sign-off**, and the **audit-or-throw publish
sequencing** against an append-only amendment ledger.

This story owns the admin-side authoring workflow only. It does NOT interpret rule
payloads (Epic 4) and does NOT build the public render (Story 2.5).

## Decision

### 1. The draft store is a server-persisted table (`clause_drafts`), not client-only state

Story 2.3's model has no draft concept: `createClause` inserts a published
`version=1` immediately and `amendClause` inserts a published `version+1`
immediately. But AC1(b) requires editing a clause **draft** that does not affect the
published version until published, and AC1(d) requires routing the draft to a
**non-author** reviewer who must load the **exact** pending content. A different user
loading the exact content is impossible with client-only draft state → the draft MUST
be server-persisted. Hence `clause_drafts` (migration `0015`): tenant-isolated
(mirrors `clause-versions-rls`, NOT cross-readable), with a `BEFORE UPDATE` immutability
trigger only on `clause_versions` (the draft table is freely mutable). A **partial-unique**
index on `(pariwar_id, clause_id) WHERE status IN ('draft','in_review','signed_off')`
enforces at-most-one OPEN draft per clause. The published `clause_versions` row is
minted only at publish, consuming the draft.

### 2. The draft state machine

`draft → in_review` (submit-for-review) `→ signed_off` (a non-author recorded a
sign-off) `→ published` (publish minted the version + audit line). `discarded` is the
terminal cancel state. Any edit on a non-published draft RESETS the status to `draft`
(see §3). The OPEN states are `draft | in_review | signed_off`. Illegal transitions
throw typed errors (`DraftStateError` → 409; `DraftNotFoundError` → 404;
`DraftSelfReviewError` → 409) mapped at the transport boundary.

### 3. The sign-off is content-bound — but the gate is not

`evaluateToneReviewGate` (Story 2.2) checks exactly three things: a sign-off is
present with a reviewer, its `resourceLocator` matches the publish target, and
`reviewedBy !== authoredBy`. It does **NOT** compare content hashes. So a sign-off
recorded against an *old* payload would still pass the gate if naively returned. The
content-binding is therefore the CONSUMER'S job (this story):

- `clause_drafts.tone_review_content_hash` stores `sha256(canonicalJson(payload))` at
  sign-off (RFC 8785 JCS — the same canonicalizer the audit chain + `computePayloadDiff`
  use).
- `resolveDraftSignoff` returns a `ToneReviewSignoff` ONLY when the draft is
  `signed_off` AND the stored hash equals `sha256(canonicalJson(current payload))`.
- `updateDraft` clears the three sign-off columns + resets to `draft` on ANY edit.

Net effect: edit-after-signoff ⇒ re-review required ⇒ publish 409s until a fresh
non-author sign-off. The pure decision is factored into `signoffFromDraftRow` so the
content-binding is unit-testable without a DB.

### 4. Audit-or-throw publish sequencing (the append-only constraint forces audit-first)

`niyamavali_amendments` is append-only (the Story 2.3 migration installs a
`BEFORE UPDATE` reject trigger), so an amendment row's `audit_id` CANNOT be
back-filled — it must be set at INSERT. That forces the audit line to be written
BEFORE `amendClause`/`createClause`. AC2 also requires the audit line to carry the
newly-minted `clause_version_id`, which is unknown before the insert. The reconciling
control:

1. Compute the diff (prior published payload for amend, `{}` for create) — `resolveByClauseId`
   with `asOf` left to DB `now()` (§1.11; no app-server clock).
2. **Pre-generate** the `clause_version_id` (`randomUUID()`). `createClause`/`amendClause`
   gained an OPTIONAL `clauseVersionId` parameter (backward-compatible; 2.3 call sites
   default to `gen_random_uuid()`) so the route can supply it.
3. `writeAuditEntry(servicePool, …)` on its own BYPASSRLS connection + own transaction,
   `requestPayloadHash = sha256(canonicalJson({ diff_document, clause_id, clause_version_id,
   tone_reviewed_by, tone_reviewed_at, operation }))` — a SINGLE line whose digest commits
   to the full provenance (diff + reviewer + ids; never raw copy — AC2), with the
   `resourceLocator = niyamavali:clause:<clause_id>:version:<cvid>`. **If this throws, it
   propagates → the scope tx rolls back → no published clause without an audit line (AC5).**
4. On the request scope tx: `createClause`/`amendClause` with the pre-generated
   `clauseVersionId` + `auditId` → both the `clause_versions` row AND (for amend) the
   `niyamavali_amendments` row carry `audit_id` NON-NULL at INSERT (AC5). The AC7
   immutability trigger permits the `audit_id` column (it is one of the legitimately-mutable
   columns), but no UPDATE is needed because it is set at insert.
5. `markDraftPublished` consumes the draft; the AC3 member-notification hook fires
   (placeholder); `onSend` COMMITs on 2xx.

**Accepted edge:** the audit row (step 3, separate connection) commits independently.
If step 4/COMMIT later fails and the scope tx rolls back, the audit row survives as an
append-only record of an *attempted* publish whose `resourceLocator` references a
now-absent `clause_version_id`. This is acceptable for an append-only audit log (it
records intent) and preserves the only hard invariant — no published clause without
`audit_id`. To minimise orphans, cheap validations (clause-id conflict / clause-not-found)
run BEFORE the audit write, so an orphan only arises on a genuine post-audit failure.

### 5. The 2.4 UI scope boundary (create + amend only)

The domain layer also has `splitClause` / `mergeClauses` / `deprecateClause`, but AC1
lists only create / edit / preview / submit / publish, so the admin UI surfaces
**create + amend** only (`clause_draft_operation = ['create','amend']`). The other ops
remain available + unchanged as domain accessors for a later surface. The payload is
opaque (freeze row 14) so the authoring form captures display fields + workflow
metadata, not rule-specific scalars (Epic 4) and not a raw-JSON editor (Open
Decision #4); the rendered-content diff is a display-field rendering, not a rule
interpretation. The authoritative bilingual display contract crystallizes at Story 2.5.

### 6. The De2 cross-tenant amendment guard is a `SECURITY INVOKER` `BEFORE INSERT` trigger

Migration `0015` adds a `BEFORE INSERT` trigger asserting an amendment's `pariwar_id`
matches the `pariwar_id` of its FK'd from/to `clause_versions`. It reads under the
caller's role and skips the not-visible (NULL) case so a non-existent reference falls
through to the FK (23503), preserving the 2.3 FK-integrity contract; it catches a
cross-tenant attempt observed from an RLS-bypassing context. The legitimate scoped
write path can never create a cross-tenant amendment (`amendClause` resolves from/to
within scope; `withCheck` pins `pariwar_id`). A fully RLS-independent hardening (a
composite FK on `(clause_version_id, pariwar_id)`) is deferred — recorded in
deferred-work.md.

## Consequences

- **Positive:** a non-author reviewer can load the exact pending content; a sign-off
  cannot be laundered onto edited content; every published clause carries a single,
  provenance-committing audit line with a non-null `audit_id` (no published clause
  without an audit line); the 2.3-deferred 409/404 mapping + immutability trigger +
  amendment-ledger hardening all land on this audited write path.
- **Negative / accepted:** an orphan audit line is possible on a post-audit publish
  rollback (intentional, §4); the `createClause`/`amendClause` signatures gained an
  optional parameter (backward-compatible); the De2 guard has a far-fetched residual
  gap closed only by a future composite FK (§6). **AC5's "no published clause without
  `audit_id`" is an app-level-enforced invariant (the publish route always supplies a
  pre-generated `auditId`), not a database-level `NOT NULL` constraint** —
  `clause_versions.audit_id` remains nullable at the schema level (migration 0015),
  since pre-2.4 domain-direct creates / the structural seed may predate this audited
  route. A future non-route write path could still insert a null-`audit_id` row
  without the database objecting (code review, 2026-06-21).
- **Follow-ups:** split/merge/deprecate UI; richer payload authoring (Epic 4);
  bilingual display contract (Story 2.5); composite-FK De2 hardening — all in
  deferred-work.md (Story 2.4 section).

## References

- [Source: epics.md#Story-2.4 L1474-1490] — the user story + AC1–AC4.
- [Source: ADR-0020] — the registry data model this builds on (`audit_id` nullable→NOT-NULL contract).
- [Source: ADR-0019] — the tone-review publish gate this story first consumes.
- [Source: packages/domain/src/{schema/clause_drafts.ts, niyamavali/drafts.ts, niyamavali/write.ts}; migrations/0015_strong_cerise.sql].
- [Source: apps/api/src/modules/rules/index.ts] — the route + publish sequencing.
- Memory: [[feedback_architecture_vs_adr_boundary]], [[feedback_closure_language_precision]], [[feedback_record_unattested_no_backfill]], [[project_live_db_test_gotchas]].
