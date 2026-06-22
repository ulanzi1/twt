# ADR-0020: Niyamavali rule-registry data model — versioned clause registry + amendment-with-diff

> **Status:** ratified
> **Date:** 2026-06-21 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-21 (continuation of the ADR-0010 session); logged in `.decision-log.md` Decision 2026-06-21-059; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-06-21.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 2.3 lands the Niyamavali rule-registry data model (FR-7; architectural-freeze
rows 12 + 14). The registry must give every downstream rule reference (Epic 4
engine, Epic 6 claim evaluation, member-facing surfaces, audit logs, regulator
queries) a **stable, human-readable clause identifier** that survives amendment /
version history, plus an **amendment-with-diff** lineage. This ADR records the
control decisions the architecture requires to be "committed in an ADR" — most
load-bearingly the `effective_date` timestamptz choice (architecture §1.11
L1081-1099) — and the seam-discipline decisions made at create-story.

Per [[feedback_architecture_vs_adr_boundary]], architecture commits the *properties*
(DB-authoritative time §1.11; multi-tenant isolation §1.2; the mandatory
amendment-scope declaration §1.10; the shape-vs-engine seam freeze row 14); this
ADR commits the *controls* (the column types, nullability contracts, RLS policy
posture, and the branded-id mechanism) that realise them.

This story owns the registry **shape** only. The rule-evaluation engine that
interprets `payload` is **Epic 4** (FR-8..FR-12A Member Validity Service); `payload`
is OPAQUE here (stored, structurally diffed, resolved by id — never interpreted).
Engine logic leaking into the registry is a freeze violation (epics.md L531, L1389).

## Decision

The registry is two tables — `clause_versions` (the versioned clause registry) and
`niyamavali_amendments` (the append-only amendment-with-diff ledger) — with the
following committed decisions:

1. **`effective_date` is `timestamptz` (NOT `date`).** AC7 resolution compares
   `effective_date <= resolution_timestamp` ("rule effective at instant X"), and a
   rule's effective instant is a business point-in-time, not a calendar date. `date`
   would force an implicit timezone cast in that comparison. Per §1.11
   DB-authoritative time, `effective_date` and `authored_at` use Postgres time;
   resolution defaults `asOf` to DB `now()` (no app-server clock). This is the
   mandatory §1.11 "committed in an ADR" artifact.

2. **`audit_id` is NULLABLE at Story 2.3 → NOT-NULL enforced at Story 2.4.**
   Domain-direct creates + the structurally-real seed land BEFORE the Story 2.4
   audited route exists, so the column is nullable here (a real FK to
   `audit_log_entries.audit_id`). The NOT-NULL "audit-or-throw" invariant — no
   published clause/amendment without an audit line — is enforced on the Story 2.4
   publish write path, which always writes an audit line and sets `audit_id`. Story
   2.4 tightens the column. (These are the FIRST incoming FKs to `audit_log_entries`;
   a consequence is that a plain `TRUNCATE audit_log_entries` is now blocked by the
   FK-reference guard before the table's append-only trigger fires — the table stays
   non-truncatable, the audit append-only test was updated to assert both guards.)

3. **`affected_member_scope` is NOT NULL on `niyamavali_amendments`.** Per
   architecture §1.10 L1053-1056: "Every Niyamavali amendment declares its
   affected-member scope as part of the amendment record … Amendments cannot be
   committed without a scope declaration." 2.3 STORES + VALIDATES the declaration (a
   `kind`-discriminated shape: `all_members | past_lockin | rule_subclause | named_cohort`,
   validated by the domain `assertAffectedMemberScope` guard + the contracts
   `AffectedMemberScopeSchema` Zod). Epic 4 / FR-12A resolves it to member ids + the
   cache-invalidation fan-out (seam-clean). Including the column now avoids a
   destructive migration when Epic 4 wires invalidation.

4. **RLS posture: tenant-isolated read + write (mirrors `events-log-rls.ts`), NOT
   cross-readable.** The Niyamavali IS publicly rendered (FR-79, Story 2.5), but each
   Pariwar's public site is its own per-Pariwar build/domain that reads with
   `app.pariwar_id` set to that Pariwar — a tenant-scoped SELECT already serves it.
   The `pariwar_passport` cross-readable carve-out stays the SINGLE positive exception
   to the Story 1.6 leak invariant; adding a second cross-readable table would expand
   that exception surface and force a leak-suite change for no concrete need. Both
   tables ENABLE + FORCE RLS; the append-only `niyamavali_amendments` also installs
   BEFORE UPDATE/DELETE/TRUNCATE reject triggers (events_log precedent).

5. **`ClauseId` is the first NON-UUID branded id in the codebase.** It is the AC2
   slug `niy.<section>.<clause>[.<subclause>]` (lowercase kebab-with-dots), allocated
   by the trustee at clause-create time, immutable across amendment/deprecation/version
   increment, and never reused. It gets a bespoke format-validating smart constructor
   (`clauseId` + `CLAUSE_ID_REGEX`) rather than `uuidBrand` (architecture §Naming
   L3700-3708, "branding mandatory on a new ID's first PR"). The transport
   `ClauseIdSchema` imports the single `CLAUSE_ID_REGEX` authority from `@twt/domain`
   (contracts → domain is the legal import direction) so the regex cannot drift.

6. **`predecessor_clause_ids` stores predecessor `clause_version_id`s, not slugs.**
   The DB column name is mandated verbatim by AC1, but the only coherent reading of
   AC4 ("populated … the prior version's id") for a same-clause amendment — where the
   `clause_id` would be self-referential — is that it references the precise
   predecessor version-node. So: amend → `[prior version's clause_version_id]`; split
   child → `[source version id]`; merge result → `[each source version id]`; plain
   create → `[]`. `lineageForward` / `lineageBackward` map these version-nodes to
   DISTINCT clause_ids (excluding self) for the AC5 "which clauses descend / originate"
   audit query.

**Domain-level immutability (Story 2.3):** the accessors never UPDATE
`payload`/`clause_id`/`version` on an existing row — amendments INSERT a new version;
the only UPDATEs touch `superseded_by_version` + `deprecated_at` (the two
legitimately-mutable columns). A column-restricted Postgres trigger guarding the three
immutable columns against UPDATE is DEFERRED to Story 2.4 (when the audited write path
is exercised under live conditions) — `clause_versions` is NOT fully append-only, so a
block-all-UPDATE trigger (the events_log posture) is wrong for it.

## Alternatives considered

- **`effective_date` as `date`** — Rejected: AC7's point-in-time comparison and §1.11
  DB-authoritative time require an instant, not a calendar date; `date` forces an
  implicit timezone cast.
- **`audit_id` NOT NULL at 2.3** — Rejected: the audited write path (Story 2.4) does
  not exist yet, and the structural seed + domain-direct creates legitimately predate
  it. Enforcing NOT-NULL now would block the seed. Deferred to 2.4 (recorded as a
  re-trigger in deferred-work.md).
- **Cross-readable RLS (the `pariwar_passport` carve-out)** — Rejected: 2.5's public
  render reads with `app.pariwar_id` set, so tenant-scoped SELECT suffices; a second
  carve-out would expand the leak-invariant exception surface. If 2.5 later proves a
  concrete un-scoped cross-tenant public-read need, that is a deliberate carve-out
  decision *there*, with the leak-suite update — not a default here.
- **Re-declaring the benefit-mechanism enum / clause-id regex in `@twt/domain`** —
  Accepted for the enum literal (`@twt/domain` must NOT import `@twt/contracts` — turbo
  cycle), with a contracts equality test as the anti-drift guard. For the clause-id
  regex, the contracts side imports the single domain authority instead (legal
  direction), so no duplication.
- **A column-restricted immutability trigger on `clause_versions` now** — Deferred to
  Story 2.4 (see deferred-work.md); domain-layer enforcement only at 2.3.

## Consequences

- **Operational** — `clause_versions` + `niyamavali_amendments` land in migration
  `0014` with ENABLE + FORCE RLS, GRANTs to `twt_app` (clause_versions:
  SELECT/INSERT/UPDATE; amendments: SELECT/INSERT — append-only), and the amendments
  append-only triggers. The seed `packages/domain/seed/niyamavali-v1-clauses.sql` is a
  separate `.sql` file (not a migration INSERT) loadable by the future seed harness.
- **Security** — Tenant isolation is FORCEd (RLS even for the table owner); the
  cross-pariwar leak suite asserts both tables fail closed to 0 rows cross-tenant. The
  amendment ledger is tamper-evident-by-append (immutable rows).
- **Gate teeth (AC8)** — `clause_versions` in the drizzle snapshot + the 3-record
  `pool`-tagged seed flip benefit-mechanism checks (a) + (c) from no-op to ENFORCING;
  `pnpm benefit:check` green with real records (every record `pool`; zero `reserve`).
- **Failure modes accepted** — `audit_id` nullable at 2.3 admits un-audited
  domain-direct creates until 2.4 enforces the invariant (recorded as open risk +
  re-trigger). The seeded content is provisional/structural — final legal copy is
  Story 0.13 (does not gate Epic 2).
- **Migration / pivot path** — Story 2.4 tightens `audit_id` NOT NULL on the audited
  write path and adds the column-restricted immutability trigger; a future cross-tenant
  public-read need would be a deliberate carve-out ADR at its owning story.

## References

- [Source: architecture.md §1.11, lines 1081-1099] — DB-authoritative time (the `effective_date` timestamptz mandate)
- [Source: architecture.md §1.10, lines 1040-1066] — caching + the mandatory amendment affected-member-scope declaration
- [Source: architecture.md §1.2, lines 715-770] — RLS roles + tenant-isolation posture; §Naming L3663-3708 (branded IDs)
- [Source: architecture.md §1.13 Hook 1, lines 1133-1147] — the `benefit_mechanism` discriminator (the authoritative enum spec)
- [Source: epics.md, Story 2.3, lines 1442-1472] — AC verbatim; freeze-table rows 12 + 14 (L527-531)
- [Source: `.decision-log.md`, Decision 2026-06-20-055] — the AC8 benefit-mechanism teeth-flip binding obligation
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR (Section A, after ADR-0019)
- [Source: `docs/adr/ADR-0004-canonical-json.md`] — the `canonicalJsonStringify` the diff uses for deterministic ordering
- [Source: `docs/adr/ADR-0007-pariwar-passport-data-model.md`] — the cross-readable carve-out this ADR deliberately does NOT mirror
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor
- Memory: [[feedback_architecture_vs_prd_boundary]] — boundary anchor

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-21 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-06-21 Trustee Panel session (data-model — trustee judgment; continuation of the ADR-0010 session); `.decision-log.md` Decision 2026-06-21-059; consent sheet `adr-ratification-consent-sheet-2026-06-21.md`. Cascade applied 2026-06-22. |
| 2026-06-21 | (initial draft) | BigDev (Solo Builder) | Authored under Story 2.3 (Niyamavali rule registry data model + amendment-with-diff storage) closure |
