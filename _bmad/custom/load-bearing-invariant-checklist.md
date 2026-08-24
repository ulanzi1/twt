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

> **Extended 2026-08-24 — family 13 added (AI-11a-3).** Families 1–12 are byte-unchanged.
> Accessibility is ruled a **checklist family, ⛔ NOT a CI gate and ⛔ NOT a package**
> ([[feedback_no_premature_package]]) — mechanization is revisited when Story 11b.8's
> accessibility audit shows what is actually mechanizable. ⚠ Unlike AI-10-1, this item has
> **one vehicle**: BigDev confirmed *"checklist first"* 2026-08-23. ⭐ Landing it here makes
> it live immediately — `bmad-code-review.toml:9` already loads this file, so ⛔ no wiring
> is owed.

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
13. **Semantic accessibility (AI-11a-3)** — for every **component or surface** story, four
    checks, each of which has already failed silently in this codebase:
    **(a) a container carrying `accessibilityLabel` is explicitly `accessible={true}`** — a
    label on a container that is not an accessibility element is ⛔ never announced;
    **(b) a role implying a measurable value** (`progressbar`, `slider`) **supplies
    `accessibilityValue`** — a progressbar with no value announces progress it cannot state;
    **(c) a role implying interaction** (`button`, `link`) **has a real handler** — ⛔ never
    announced over an empty body, which promises an affordance that does not exist;
    **(d) a state the AC ratifies as reachable is ANNOUNCED**, ⛔ not merely reflected in a
    prop — a state a sighted user can see and a screen-reader user cannot is ⛔ not delivered.
    Source: Epic 11a retro **H-6** + **I-5**. 11a.6 closed `done` with deferral (d) leaving
    **two defects NOT ADDRESSED** in `PanchayatNoticeboard.tsx` — the Masthead Pariwar-seal
    carries `accessibilityLabel` with ⛔ no `accessible={true}` (check a), and `PinnedSkeleton`
    announces `accessibilityRole="progressbar"` with ⛔ no `accessibilityValue` (check b).
    ⚠ **That disposition was CORRECT** — those elements belong to 11a.5 and reaching into them
    would have been the scope drift D7(a) declined. ⭐ **What makes it a leak is the
    surrounding fact:** 11a.6's own AC6 *was* semantic accessibility, **editing that exact
    file**, and the seal defect is the **same defect class AC6 had just closed one row above**.
    ⇒ the gap is ⛔ not the deferral; it is that **nothing catches the class** — `scripts/`
    holds **nineteen** invariant gates and ⛔ **zero** cover accessibility, on the epic
    preceding the one that makes an accessibility audit a **launch-blocker** (11b.8 / UX-DR70).
    ⭐ **Start from the worked example, ⛔ not from scratch:**
    `apps/mobile/components/panchayat/PinnedItem.tsx` carries a commented
    explicit-`accessible={true}`-grouping pattern that 11a.6 left deliberately for this purpose.
    ⛔ Ruled a checklist, **NOT a CI gate and NOT a package** (BigDev 2026-08-23, *"checklist
    first"*) — revisit mechanization at 11b.8. ⚠ **This family is un-mechanized BY RULING, so
    it is the half that decays** (Epic 10 E3 / I-5): the Acceptance Auditor is the only thing
    reading it, and ⛔ a missed check here leaves ⛔ no trace.
