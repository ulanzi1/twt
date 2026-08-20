# Load-Bearing-Invariant Checklist (AI-6-5)

Source: Epic 6 retro W-6/H-6 — the recurring families BigDev's post-review second
passes (6.10, 6.12, 6.13×3, 6.14, 6.15×2) kept closing after the 3-layer review.
The Acceptance Auditor audits every diff against the families it touches.

> **Extended 2026-08-20 — families 11 and 12 added.** The file is no longer AI-6-5
> alone: it now also carries **AI-10-1** (policy meaning of member-gating predicates)
> and **AI-10-3** (cross-member ownership), both confirmed by BigDev 2026-08-18 in the
> Epic 10 retrospective. Families 1–10 are byte-unchanged. AI-10-1 has a SECOND vehicle
> by ruling — the story template, at `_bmad/custom/bmad-create-story.toml` — because a
> review-time check cannot make a story STATE its policy meaning; this file carries only
> the review half.

1. **State-machine totality & guards** — every new event has a reducer case
   (identity transitions annotated; reducer stays TOTAL); terminal states block
   dependent mutations on EVERY path (guards + aggregates), not just the obvious one.
2. **Concurrency & redelivery idempotency** — at-least-once worker redelivery and
   true two-connection races proven live (exactly one write, N−1 idempotent no-ops,
   one event); advisory-lock serialization covers ALL entry paths (auto + manual);
   retry-on-23505 inside a caller tx uses raw SAVEPOINT.
3. **Tenant & actor boundary completeness** — cross-Pariwar denial tested explicitly
   (not just same-tenant non-owner); tampered/non-human/system-actor runtime denial
   tested per new mutation route; geo-scope containment asymmetry respected (a
   narrower grant never satisfies a wider-dimension gate).
4. **Event payload completeness for consumers** — payloads carry every correlation
   field downstream overlays/hooks key on (e.g. deceased_member_id on ALL claim
   events); two-authority discipline: event = timeline authority, row = metadata
   authority, one tx, neither a projection of the other.
5. **DB-level backstops** — app-layer shape validation mirrored by CHECK constraints;
   a dedicated migration-level policy-regression spec asserts RLS
   (positive/negative/fail-closed/FORCE), FKs, partial-uniques, tenant-scoped
   indexes, and CHECKs directly — never only inferred through higher-level tests.
6. **Projection & snapshot discipline** — read models field-pick explicitly, never
   spread rows; snapshot columns are never rewritten by later live-data edits
   (historical attribution stable); PII/contact exposure minimal per consumer.
7. **Aggregate correctness** — workload/count aggregates exclude terminal-claim and
   superseded rows; count(DISTINCT) wherever joins can fan out.
8. **Audit-after-mutation & attribution** — every privileged mutation carries its
   audit/event pair in the same tx; admin attribution snapshotted server-side from
   users.display_name (never email-derived; missing name blocks the action).
9. **Deliberate-vs-oversight** — any bypass of a normal tenant/role/scope check
   carries an explicit DELIBERATE doc block with rationale and a re-examination
   trigger; an undocumented bypass is a finding.
10. **Closure honesty** — items not constructible in this system are explained,
    never faked; un-attested gaps are disclosed in the story record, no backfill.
11. **Policy meaning of member-gating predicates (AI-10-1)** — any predicate that
    gates a member's access to a benefit states, in ONE sentence, what it means to
    the member, and that sentence is checked against the Niyamavali. Applies to a
    predicate introduced OR changed, including a conjunction added to an existing
    one. The sentence is about the MEMBER's experience, never the code ("a
    suspended member can never be assigned to a pool again", not "is_valid is
    false"). Source: Epic 10 retro H-1/I-1 — 10.10's `is_valid: false` conjunction
    made every suspension a de-facto permanent ban and every gate was green through
    it; recurred in shape at 10.23's `episode_key`. A predicate can be
    constitutional law, and no CI gate can see it.
12. **Cross-member ownership (AI-10-3)** — for every admin or member write-action
    touching member data: (a) every client-supplied resource id is validated to
    belong to the loaded scope/case, never trusted from the request; (b) no read
    keys on `pariwar_id` alone where a member-scoped read is meant; (c) an
    already-resolved record rejects re-action. Source: AI-9-1 re-issued — triggered
    by 9.8, practised but never extracted, and the exact class recurred at 10.29.
    ⛔ Ruled a checklist, NOT a shared package and NOT a CI gate (BigDev 2026-08-18).
