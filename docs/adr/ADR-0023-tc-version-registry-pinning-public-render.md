# ADR-0023: T&C version-pinning registry + sanitized precomputed render + public `/terms`

> **Status:** ratified
> **Date:** 2026-06-24
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-06-24; logged in `.decision-log.md` Decision 2026-06-24-061; consent sheet `docs/knowledge-transfer/trustee-consent-sheet-phase0-framework-ratifications.md`
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 2.6 is the **third Epic-2 registry + public-surface pairing** (after Story 2.3's
Niyamavali registry primitive and Story 2.5's public shell). It lands a **Terms &
Conditions entity version-pinned to specific Niyamavali clause versions**, with a public
render at `/terms` marked "pending legal review" until the Story 0.13 legal engagement
returns. It is a vertical slice that FUSES three patterns already in the tree (mirror,
not invent): the 2.3 registry table + RLS + migration, the 2.4 audit-or-throw trustee
endpoints, and the 2.5 public render via `withPublicScope`.

Per [[feedback_architecture_vs_adr_boundary]], architecture commits the *properties*;
this ADR commits the *controls* that realise the T&C registry. Scope fences: NO
rule-evaluation (the Niyamavali payload stays opaque, freeze row 14 — the T&C only
*references* clause versions by id); NO consent recording (Story 2.7 / Epic 3 — 2.6 only
proves `tc_version_id` is a durable, recoverable handle); NO `apps/admin` T&C editor UI
(deferred per BigDev 2026-06-24 — trustee actions are `apps/api` endpoints + a seeded
placeholder for the demoable closure).

## Decision

### 1. The T&C registry shape (`terms_and_conditions_versions`)

A versioned, per-Pariwar table mirroring `clause_versions`: `tc_version_id` (uuid PK,
branded `TcVersionId`), `pariwar_id`, `version` (int, monotonic per Pariwar, `>= 1`),
`body_markdown` (canonical content), `body_html_rendered` (precomputed sanitized HTML),
an `effective_from`/`effective_until` window, `legal_review_status` (a `pgEnum`
`pending | under-review | reviewed-with-changes-required | approved | superseded`),
`legal_reviewer_actor_id` (nullable, set on approve), `audit_id` (nullable — set by the
audited route; null for the seed placeholder), and authorship columns. The status enum is
**lockstep-asserted** against the `@twt/contracts` `TcLegalReviewStatusSchema` z.enum (the
`benefit_mechanism` precedent — the legal import direction is contracts→domain). Migration
`0016` generated once + hand-supplemented (GRANT + FORCE RLS), never regenerated.

### 2. Clause pinning via an FK-enforced link table — variance from the epic's `text[]`

The epic AC literally says `pinned_to_clause_version_ids text[]` (epics.md L1532). We
**deviate deliberately** (BigDev 2026-06-24): pins live in a junction table
`terms_and_conditions_pinned_clauses` (`tc_version_id` FK → the T&C version, cascade;
`clause_version_id` FK → `clause_versions`; `pariwar_id` for RLS; composite PK). Postgres
cannot FK an array element, and the `text[]` design could silently hold a dangling or
cross-tenant id. Semantically identical (the set of pinned clause versions), structurally
stronger. **Two guards, both required:** (a) the link **FK** is the hard referential guard
against a non-existent version; (b) a domain **pre-check** (`niyamavali.resolveByClauseVersionId`
returns a row only when `pariwar_id` matches) is the **cross-tenant** guard — the FK targets
the global PK and would happily link a different Pariwar's clause version, so the pre-check
is NOT optional. The wire/OpenAPI contract stays a flat `pinnedToClauseVersionIds` array (the
link table is an internal storage detail the API recomposes via `listPinnedClauses`).

### 3. The effective-window invariant + supersede-on-approve

At most ONE open-ended (`effective_until IS NULL`) version per Pariwar, enforced by a
**partial-unique index** `(pariwar_id) WHERE effective_until IS NULL` (drizzle-kit emits the
predicate from the `.where()` builder — no hand-supplement). The lifecycle that satisfies
this together with AC4 (the public page renders the current effective version, even while
pending, with a provisional banner) and AC6 (approve supersedes the prior currently-effective
version):

- `createTcVersion` **opens the GENESIS** version (no open version exists yet) so it renders
  immediately as pending, but **STAGES** every subsequent version (`effective_until =
  effective_from` → an empty window that is never "effective") so the in-force version keeps
  rendering and the partial-unique constraint is not violated at create time.
- Approve = **supersede the prior currently-effective version FIRST** (`effective_until = now`,
  status → `superseded`), **THEN open** the target (`effective_until = NULL`, status →
  `approved`). The close-prior-first ordering keeps the constraint satisfied throughout. The
  route orchestrates the two single-purpose accessors (`supersedeTcVersion` + `approveTcVersion`)
  in one scope tx. A superseded row is never deleted — it stays queryable by `tc_version_id`
  for AC8 historical attestation (the handle Story 2.7's consent registry + Epic 3 store).

### 4. Markdown → sanitized HTML, precomputed at WRITE

`body_html_rendered` is rendered ONCE at write time (in `createTcVersion`) by
`renderTcMarkdown`, a pure helper built on the pinned **`unified` + `remark-parse` +
`remark-rehype` + `rehype-sanitize` + `rehype-stringify`** pipeline (the recommended option;
`rehype-sanitize` is the purpose-built allowlist). `remark-rehype` runs with its DEFAULT
config (NO `allowDangerousHtml`, NO `rehype-raw`) so raw HTML in the markdown is dropped at
the mdast→hast boundary; `rehype-sanitize`'s default schema strips event-handler attributes
and neutralizes `javascript:`/`data:` URL schemes on markdown-syntax links. Security is
non-negotiable because the stored HTML is served **unauthenticated and edge-cached** — a
stored XSS would hit every visitor. A co-located unit test pins every vector (`<script>`,
`onerror=`, `[x](javascript:…)`, `[x](data:…)`, raw `<a/​img href="javascript:…">`) plus
benign-markdown survival, so a future schema override cannot silently regress it. The public
`/terms` page therefore carries **no markdown dependency** — it emits the stored HTML via
Astro `set:html`. The pinned clause-version ids are rendered as a COUNT, not raw UUIDs (a
public reader gains nothing from internal UUIDs, and a UUID's digit runs false-positive the
FR-74 PII scanner's aadhaar pattern).

### 5. RLS = tenant-isolated, NOT cross-readable (mirror ADR-0020)

Both tables get tenant-isolation RLS (select + write, FORCE RLS) using the Story 1.6
closed-failure construct `pariwar_id = nullif(current_setting('app.pariwar_id', true),
'')::uuid`. NOT cross-readable: each Pariwar's public site reads with `app.pariwar_id` set to
that Pariwar, so a tenant-scoped SELECT already serves the public `/terms` render under the
unauthenticated `withPublicScope` (`SET LOCAL ROLE twt_app` → scope → read → ROLLBACK — not a
superuser bypass). `pariwar_passport` stays the single positive exception to the Story 1.6
leak invariant — the rationale is identical to ADR-0020 and already ratified there.

## Consequences

- **RBAC:** two new permission keys `tc.publish` + `tc.approve` (grounded — the endpoints
  exist); `PERMISSION_CATALOG_VERSION` bumped 1 → 2; `pariwar_admin` gets both, `state_trustee`
  (the "Trustee Panel") gets `tc.approve`.
- **The placeholder T&C** is a seeded `pending` row (`scripts/seed-placeholder-tc.ts`,
  idempotent) so `/terms` renders for the demoable closure; lawyer-reviewed final copy lands
  later per Story 0.13 and does NOT gate this story.
- **`@twt/domain` gains its first markdown deps** (`unified` + the rehype/remark stack). They
  stay out of the `apps/public` graph by construction (precompute-at-write).
- **Gates extended (not decayed):** the PII-scrape spec adds a fixture-fed `/terms` leg;
  `microcopy.yaml` globs the `terms` namespace; the `friction-budget` `member-public-web`
  page-weight rose 3942 → 5219 bytes (far under the 512000 ceiling) — the **baseline-of-record
  stays at its best-ever 3942** (the AC-1 ratchet only permits an in-PR *decrease*; a regression
  under ceiling does not bump the baseline). `COMPOSITION-CONTRACT.md` lists `/terms`; the
  empty/skeleton/error inventory adds the `/terms` surface (Row 6 stays `in-progress`).

## References

- epics.md §Story 2.6 L1522-1543 (the 3 epic AC blocks; `[SURFACE]`; pending-legal-review)
- ADR-0020 (the `clause_versions` registry + RLS-not-cross-readable rationale this mirrors)
- ADR-0021 (the audit-or-throw publish path this mirrors) · ADR-0022 (the public shell + `withPublicScope`)
- [[feedback_architecture_vs_adr_boundary]] · [[project_live_db_test_gotchas]]

## Ratification (2026-06-24)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-06-24 Trustee Panel session; logged in `.decision-log.md` Decision 2026-06-24-061.

No governance amendments or open caveats — the data-model and workflow controls are accepted as authored. The `tc_legal_review_status` pending-legal-review carve-out on the public `/terms` render is an operational state recorded in the ADR, not a caveat requiring trustee direction; it closes when Story 0.13 counsel returns.
