# ADR-0024: Consent registry — granular, revocable, version-resolvable (UX-DR2 primitive)

> **Status:** ratified
> **Date:** 2026-06-24
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-24; logged in `.decision-log.md` Decision 2026-06-24-061; consent sheet `docs/knowledge-transfer/trustee-consent-sheet-phase0-framework-ratifications.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 2.7 is the **fourth and final Epic-2 substrate landing** — and, unlike 2.3–2.6, a
PURE `[PRIMITIVE]`: a granular, revocable consent registry with **NO surface layer** (no
`apps/api` route, no `apps/admin`/`apps/public` UI, no member-facing copy, no public
render). It is the **2.6 substrate slice MINUS every surface** — the schema + RLS +
migration mirror `terms_and_conditions_versions` (ADR-0023); the accessor module mirrors
`terms-and-conditions/{read,write,errors,index}.ts`; the contracts DTOs + the dual
`pgEnum` ↔ `z.enum` lockstep mirror `tc-version.ts` + its lockstep test. The story does
not invent patterns — it follows the ones already in the tree.

The "API surface" in the user story is the **`@twt/domain` exported-function surface**
(`recordConsent` / `revokeConsent` / `listConsents` / `consentExists`), NOT an HTTP
surface. The actor-facing flows that *record* consent are built later:
**Epic 3** records `tc_acceptance` / `medical_disclosure_ack` / `nominee_share_split` at
signup; **Epic 6** records `claim_time_dpdpa` at claim time ("Story 2.7's primitive is the
only API touched"); **Epic 5 / 11b** consume `consentExists(...)` as the canonical "did
this member have valid X consent at time Y?" gate. The audit-or-throw HTTP wrapper is the
*consumer's* responsibility — those accessors take a caller-supplied `auditId`.

Per [[feedback_architecture_vs_adr_boundary]], architecture commits the *properties*
([architecture.md L291] "consent registry — per surface, per category, revocable"; the
§1.11 DB-authoritative-time obligation); this ADR commits the *controls* that realise the
consent registry. It records the deliberate variances from the epic's literal column list
and the scope-fence decisions so a future reader does not mistake them for omissions.

## Decision

### 1. The consent-registry shape (`consent_records`)

A per-Pariwar, append-mutate table mirroring `terms_and_conditions_versions`: `consent_id`
(uuid PK, branded `ConsentId`, `gen_random_uuid()` default — a NEW id per grant),
`subject_id` (uuid NOT NULL — see decision 4), `pariwar_id` (RLS predicate column, branded
`PariwarId`), `consent_type` (a `pgEnum` — see decision 2), `consent_artifact_ref` (text,
**nullable** — a `tc_version_id`/`clause_version_id`; null for consents with no versioned
artifact such as `marketing`), `granted_at` (timestamptz NOT NULL, default `now()` —
§1.11 DB-authoritative), `revoked_at` (timestamptz, nullable — see decision 5),
`granted_via_actor` (a `pgEnum`), `consent_payload` (jsonb NOT NULL, typed
`ConsentPayload`), `audit_id` (uuid, nullable, FK → `audit_log_entries` — the grant audit
line), plus the two variance columns (decision 3). Indexed on `(pariwar_id, subject_id,
consent_type)` — the `consentExists` / `listConsents` lookup. **No unique constraint** on
`(subject_id, consent_type)`: grant→revoke→re-grant produces multiple rows over time by
design, and `consentExists(..., validAt?)` resolves the one valid at the queried instant
(decision 5). Migration `0017` generated once + hand-supplemented (GRANT + FORCE RLS),
never regenerated.

The canonical query `consentExists(subject, type, validAt?)` mirrors `getEffectiveTc`'s
effective-window construction: `validAt` defaults to DB `now()` (NOT an app-server clock —
§1.11), predicate `granted_at <= validAt AND (revoked_at IS NULL OR validAt < revoked_at)`,
returning a boolean (`SELECT 1 … LIMIT 1`). `consent_payload` holds internal-only
operational context (checkbox text shown, locale, IP, user-agent); it is never publicly
rendered and is not a Tier-1 PII column under AR-12, so it is stored clear jsonb.

### 2. Two `pgEnum`s, both lockstep-guarded — AC1's values only

`consent_type` (`tc_acceptance | dpdpa_data_processing | dpdpa_data_sharing | marketing |
medical_disclosure_ack | nominee_share_split | claim_time_dpdpa`) and `consent_granted_via`
(`member_self | staff_assisted | inherited`) are both `pgEnum`s (not raw text, not a CHECK)
so each yields a `CREATE TYPE` + DB-level guard. Because `@twt/domain` must NOT import
`@twt/contracts` (turbo cycle), the literal lists are duplicated in the `@twt/contracts`
`ConsentTypeSchema` / `ConsentGrantedViaSchema` z.enums, and a **contracts test
lockstep-asserts BOTH** against the domain `pgEnum.enumValues` (the `TcLegalReviewStatus` /
`BenefitMechanism` precedent — contracts→domain is the legal import direction).

`consent_type` is seeded with the **7 AC1 values only**. New consent types referenced by
later epics — `whatsapp_opt_in` (Epic 5), `sahyog_vivran_publication` / `in_memoriam_listing`
(Epic 11b), `module_lead_handoff` (Epic 12) — are added by their **own consumer epic** via
an additive `ALTER TYPE … ADD VALUE` migration. We do NOT seed types for surfaces that do
not exist yet (the 2.6/RBAC "seed exactly what the artifacts reference" discipline).

### 3. `revocation_reason` + `revoked_audit_id` — variance from the epic's column list

Two revoke-side columns are added beyond epics.md L1554 (which names only `audit_id` +
`revoked_at`): `revocation_reason` (text, nullable) + `revoked_audit_id` (uuid, nullable,
FK → `audit_log_entries`). This is a **deliberate variance** (BigDev 2026-06-24):
`revokeConsent(consent_id, reason)` takes a reason, and the revoke transition needs its OWN
audit line distinct from the grant's. So the row is symmetric — grant carries
`audit_id` + `granted_at`; revoke carries `revoked_audit_id` + `revocation_reason` +
`revoked_at` — and BOTH transitions have a durable on-row audit link, keeping "every
consent transaction is independently auditable" (epics.md L1550) literally true on the row.

### 4. `subject_id` — polymorphic, NO FK, NO brand

`subject_id` is "member OR pre-member applicant id" (epics.md L1554). It is **not FK-able**:
the `members` table is built in Epic 3 (it does not exist yet), and a pre-member applicant
id is minted at signup-initiate before any member row exists. So `subject_id` is a plain
`uuid NOT NULL` with **no FK** and **no branded type** — a brand implies a single owning
entity, which would mis-describe an intentionally polymorphic column. Referential integrity
for the subject is the consumer's concern (Epic 3 ties applicant→member). We do NOT
introduce a `members` FK "to be safe" — it would not compile (no table) and would wrongly
forbid pre-member consents.

### 5. Revoke is a MUTATE, never a DELETE (append-mutate compliance invariant)

Revocation sets `revoked_at` + `revocation_reason` + `revoked_audit_id` on the EXISTING
row; the row is **never deleted** (DPDPA "historical proof preserved", epics.md L1559).
Hence the migration GRANT is `SELECT, INSERT, UPDATE` — **NOT DELETE**. This is structurally
required by the time-travel query: a deleted row would make a pre-revocation
`consentExists(..., pastTimestamp)` wrongly return false, but AC3 requires it return true
(the row was valid at that instant). A re-grant after revocation is a NEW `recordConsent`
row (new `consent_id`); there is no unique constraint on `(subject_id, consent_type)`, and
multiple rows over time are expected. `revokeConsent` rejects a double-revoke
(`ConsentStateError`) and a missing id (`ConsentNotFoundError`), both surfaced top-level
from `@twt/domain` as `class + code constant` pairs (the consumer middleware matches on the
code, not the instance).

### 6. RLS tenant-isolated (NOT cross-readable) + domain+contracts-only scope

`consent_records` gets tenant-isolation RLS (select + write `for: 'all'`, FORCE RLS) using
the Story 1.6 closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id',
true), '')::uuid` — mirror ADR-0020, NOT the `pariwar_passport` cross-readable carve-out.
Consent is per-tenant; a member's consents are read under that Pariwar's `app.pariwar_id`.
`for: 'all'` covers the grant INSERT + the revoke UPDATE; `withCheck` defends an
INSERT/UPDATE from creating/moving a row into another tenant.

**Scope = `@twt/domain` primitive + `@twt/contracts` DTOs only.** NO `apps/api` routes, NO
new RBAC permission keys, NO `PERMISSION_CATALOG_VERSION` bump, NO OpenAPI path
registration (`openapi/v1.yaml` stays byte-identical — there are no endpoints), NO
public/admin surface, NO i18n namespace, NO domain-event emission, NO idempotency. The
consumers (Epic 3/6) own the routes, the audit-or-throw orchestration, and any events that
*reference* a `consent_id`. This follows the 2.6 scope-fence discipline: do not add routes
speculatively for flows that do not yet exist.

## Consequences

- **Audit linkage is a CONSUMER obligation.** The accessors ACCEPT a caller-supplied
  `auditId` / `revokedAuditId` (mirror `createTcVersion`) but cannot enforce audit-or-throw
  — 2.7 has no actor session. The domain integration tests pass `null` (the columns are
  nullable; a random non-null uuid would violate the FK, and writing a real chained audit
  line via `servicePool` would commit on a separate connection while the test's
  `BEGIN/ROLLBACK` discards the consent row). **Flag for Epic 3/6:** they MUST write the
  audit line FIRST and thread the id, or the row carries `audit_id = NULL` (a compliance gap
  the FK alone cannot force).
- **No new dependencies, no surface gates touched.** This story ships no public surface, no
  member copy, no public render — so `friction-budget`, `microcopy`, `i18n-parity`,
  `pii-scrape`, and `benefit-mechanism-tag` are genuinely untouched (no diff expected). The
  changed gates are `db-check`, `schema-diff` (one additive table), `contracts` (build + the
  new lockstep test, no openapi change), `lint`, `typecheck`, `build`, `test`,
  `integration-tests`.
- **First incoming polymorphic-ref column.** `consent_artifact_ref` is a nullable text ref
  (not an FK) across artifact tables; resolution is the consumer's concern. Combined with the
  polymorphic `subject_id`, this primitive is intentionally loose about referential identity
  for the things it points AT, while strict about tenancy (RLS + explicit `pariwarId`).

## References

- epics.md §Story 2.7 L1544-1563 (the 3 epic AC blocks; `[PRIMITIVE]`; the
  `recordConsent`/`revokeConsent`/`listConsents`/`consentExists` surface; "row is NOT
  deleted"; "queryable with full provenance") · §Epic-2 L1385-1403 (FR-97 / UX-DR2)
- architecture.md L291 (DPDPA consent registry — per surface, per category, revocable);
  L1750-1754 (per-data-class retention matrix names "consent registry")
- ADR-0020 (the `clause_versions` registry + RLS-tenant-isolated-not-cross-readable
  rationale this mirrors) · ADR-0023 (the sibling T&C registry — the substrate-slice
  patterns, migration/RLS/lockstep discipline)
- [[feedback_architecture_vs_adr_boundary]] · [[feedback_record_unattested_no_backfill]] ·
  [[project_live_db_test_gotchas]]

## Ratification (2026-06-24)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-06-24 Trustee Panel session; logged in `.decision-log.md` Decision 2026-06-24-061. Supersedes the "un-attested-pending" status recorded at author-commit time (per [[feedback_record_unattested_no_backfill]]): the ratification event has occurred and is attested.

No governance amendments — the domain+contracts-only scope fencing and the audit-linkage-as-consumer-obligation consequence are accepted as authored. The audit-linkage flag for Epic 3/6 (they MUST write the audit line first) carries forward as an open implementation reminder, not a gated follow-up requiring trustee action.
