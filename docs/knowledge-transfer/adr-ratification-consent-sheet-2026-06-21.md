# ADR Ratification — Trustee Consent Sheet (2026-06-21)

**Purpose:** collect Trustee Panel consent for the ADRs still awaiting ratification, following the ADR-0010 ratification (Decision 2026-06-21-057). One row per ADR; mark each **Ratify / Defer / Reject** and initial.

**Trustee Panel (≥2-trustee quorum required to ratify):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for the flip:** `docs/adr/README.md` lifecycle (`drafted → under-trustee-review → ratified`); `docs/knowledge-transfer/adr-index.md` is the authoritative status ledger.

> Status as of 2026-06-21. Already ratified (no action): `adr-0001`, `adr-0002`, **`ADR-0010`**.

---

## Read-first priority

- **ADR-0009** is already `under-trustee-review` — it has been formally presented and only needs the ≥2-trustee vote recorded (plus architecture confirmation of the R2 identity-table RLS posture). Closest to closure.
- **ADR-0005, ADR-0008, ADR-0011, ADR-0017** are `drafted` but were each *explicitly flagged* as awaiting ratification in the decision log — natural next batch (see caveats).
- The remaining `drafted` ADRs are authored and stable; most are engineering-substrate / reversible tooling (light-touch ratification per the Story 1.2–1.4 precedent). See the footnote on ratification weight.

---

## Consent table

| # | ADR | Decision (one line) | Owning story | Status | Recorded gate / caveat | Trustee decision |
|---|---|---|---|---|---|---|
| 1 | **ADR-0009** admin-authentication | Fastify session + Argon2id+pepper + WebAuthn passkeys + step-up gating + identity-table RLS carve-out | Story 1.9 | `under-trustee-review` | Awaiting ≥2-trustee vote **+ architecture confirmation of R2 identity-table RLS posture** (Decision 045) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 2 | **ADR-0008** rbac-permission-model | Permission keys + scope enum + `(role,scope)` grants + 12 seeded roles + fail-closed guard | Story 1.8 | `drafted` | **OQ-3 gates the 12-role matrix before production seed** — roles provisional; light-touch ratification acceptable (Decision 044) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 3 | **ADR-0011** dokploy-auto-deploy | Global-scope gate + GitHub Actions→Dokploy deploy + dev-wires/operator-applies split | Story 1.15 | `drafted` | Co-requisite: **3 reconciled runbooks need ≥2-trustee re-sign** (Decision 050) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 4 | **ADR-0017** local-ci-mirror-merge-gate | `pnpm ci:local` + pre-push hook as sanctioned merge gate during GitHub Actions suspension | Epic 1 retro AI-4 | `drafted` | Interim policy — **successor ADR required when GitHub Actions is restored** (Decision 052) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 5 | **ADR-0005** openapi-client-generation | `@hey-api/openapi-ts` (primary) + Orval (secondary) | Story 1.4 | `drafted` | Ratification **explicitly deferred to a Trustee session**; light-touch (reversible at Story 1.9+) (Decision 040) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 6 | **ADR-0003** datastore-engine | Postgres 16 + Cloud SQL + Drizzle ORM + forward-only migrations | Story 1.2 | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 7 | **ADR-0004** canonical-json | RFC 8785 JCS hand-rolled subset | Story 1.3 | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 8 | **ADR-0006** pii-tier-1-kek-library | Cloud KMS + Node crypto AES-256-GCM + HMAC-SHA-256 | Story 1.5 | `drafted` | — (security-relevant; trustee judgment) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 9 | **ADR-0007** pariwar-passport-data-model | Cross-readable carve-out, branding bundle, branded IDs, 60s freshness | Story 1.7 | `drafted` | — (data-model; trustee judgment) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 10 | **ADR-0012** friction-budget-pr-ci-gate | Two-facet (metric ceilings + named-payer ledger), no-op-until-surface | Story 1.16a | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 11 | **ADR-0013** pii-scrape-ci-gate | FR-74 4-tier leak engine + naked-PII detector, no-op-until-populated | Story 1.16b | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 12 | **ADR-0014** schema-diff-ci-gate | FR-100 non-add guard, invariant-scan, four precision scanners | Story 1.16c | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 13 | **ADR-0015** benefit-mechanism-tag-ci-gate | FR-100 / FR-7 enum-tag guard, forward-compat `BenefitMechanism` enum | Story 1.16d | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 14 | **ADR-0016** design-system-foundation | `@twt/tokens` registry + Tailwind `@theme` generator + `microcopy` CI gate | Story 1.17 | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 15 | **ADR-0018** i18n-centralized-utility | `packages/i18n` + bilingual surface contract | Story 2.1 | `drafted` | — (engineering substrate; light-touch) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 16 | **ADR-0019** tone-review-publish-gate | Runtime non-author sign-off above the automated microcopy floor | Story 2.2 | `drafted` | — (policy-adjacent; trustee judgment) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 17 | **ADR-0020** niyamavali-registry-data-model | Versioned clause registry + amendment-with-diff | Story 2.3 | `drafted` | — (data-model; trustee judgment) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |
| 18 | **ADR-0021** niyamavali-draft-publish-workflow | Draft store + audit-logged publish state machine | Story 2.4 | `drafted` | — (policy-adjacent; trustee judgment) | ☐ Ratify ☐ Defer ☐ Reject — init: ___ |

---

## After the session — what I do per ratified row

Each **Ratify** triggers the same 3-surface cascade we ran for ADR-0010 (a status flip in one place without the others is a framework gap per `adr-index.md`):

1. **ADR file** — `Status: drafted/under-trustee-review → ratified`, date, `Ratifying trustees`, + changelog rows.
2. **`adr-index.md`** — flip the row + update the status counts + ledger note.
3. **`.decision-log.md`** — one ratification entry per session (or per ADR). Next number: **`2026-06-21-058`**.

Bring back the marked sheet (or just tell me the ADR numbers ratified/deferred) and I'll run it.

---

### Footnote — ratification weight (for triage, grounded in the decision log)

The decision log distinguishes two ratification weights:
- **Light-touch** — engineering-substrate / reversible-tooling ADRs (the Story 1.2–1.4 precedent): ratification is a confirmation leg, "Resolved via explicit deferral" pending a Trustee session, per [[feedback_closure_language_precision]]. ADR-0005 is the explicit example (Decision 040); ADR-0008 was also tagged light-touch (Decision 044). The CI-gate cluster (0012–0015), tokens (0016), i18n (0018), and the substrate ADRs (0003, 0004) sit here.
- **Trustee-judgment** — security / data-model / policy ADRs where the choice is materially the trust's: ADR-0006 (PII KEK), ADR-0007 (passport data model), ADR-0008 (RBAC + OQ-3), ADR-0009 (auth), ADR-0019 (tone-review policy), ADR-0020 / ADR-0021 (Niyamavali registry + publish).

The "weight" column is a triage aid, not a status — every row still requires the ≥2-trustee quorum to flip to `ratified`.
