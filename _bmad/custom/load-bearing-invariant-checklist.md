# Load-Bearing-Invariant Checklist (AI-6-5)

Source: Epic 6 retro W-6/H-6 — the recurring families BigDev's post-review second
passes (6.10, 6.12, 6.13×3, 6.14, 6.15×2) kept closing after the 3-layer review.
The Acceptance Auditor audits every diff against the families it touches.

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
