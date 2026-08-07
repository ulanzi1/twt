# src/per-pariwar/bihar/

**Landing Story: 10.12** — Per-Pariwar custom-field policy per architecture §1.7
(`architecture.md:943-991`) + AR-21.

This directory holds Bihar's **per-Pariwar custom-field policy artifacts**: the index inventory, and
any Bihar-specific policy a human maintains in code. It does **not** hold field definitions.

| File | What it is |
|---|---|
| `index-inventory.ts` | The §1.7 index inventory — the human-authored record of functional B-tree indexes on custom-field JSON paths, each scoped to this `pariwar_id` by a partial `WHERE`. **Empty at v1**, which is the correct state: no Bihar custom field exists yet, so no access pattern has been observed, and a pre-populated inventory would be speculative index cost paid forever against a read that may never happen. |

---

## D2-1.7 — **Closed by this edit**

The Story 1.7 deferral recorded here was: *"the per-Pariwar custom-field mechanism is the GIN-indexed
JSONB extension on the members / claims / pools tables — those host tables do not exist until Epic 3 /
6 / 7 … Re-triggered when the first custom-field host table lands (Epic 3+)."*

**That trigger fired at Epic 3**, when `members` landed — and went unnoticed until Story 10.12. The
deferral is now **Closed by this edit** [[feedback_closure_language_precision]]: `members.custom_fields`
exists (migration 0096, carrying the repo's first GIN index), the definition registry exists
(migration 0095), and this directory now holds the §1.7 artifact it was reserved for.

The corresponding `deferred-work.md` entry is closed with the same language.

> ⚠ **What is NOT closed.** The placeholder text said "the members / claims / pools tables". Story
> 10.12 hosts custom fields on **members only** — claims and pools are a recorded, gated deferral
> (story D7), not part of this closure. Claims are additionally guarded by §1.9/§1.13 against exactly
> this vector: a tenant-authored claim custom field *is* the payout-destination absorption those
> sections forbid, so claims need their own story with their own fence review rather than a free ride
> on this one. Closing D2-1.7 does **not** close that gap; see `deferred-work.md`.

---

## ⚠ Where field definitions actually live — and why not here

Architecture §1.7 says the medium is *"versioned per-Pariwar JSON Schema in
`packages/domain/per-pariwar/<id>/schema-v<n>.ts`"* — i.e. a code file **in this directory**.

**Story 10.12 deviates: definitions live in the `pariwar_custom_field_definitions` registry table.**
PRD FR-54's stated point is *"variation without schema migrations"*, and a code-file edit is a
release — so a `schema-v<n>.ts` medium cannot satisfy the requirement it was written to serve, and
`epics.md:3603`'s admin-authoring AC cannot be built on it at all.

§1.7's **substantive** properties all survive the change (versioned ✓, no silent renames ✓,
deprecation window ✓, migration-gated where DDL is involved ✓). What changed is the storage medium —
from a TS file to an append-only, RLS-scoped, audit-anchored, trigger-protected table.

This is an **architectural deviation, declared rather than smuggled**:

- **ADR-0037** (`docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md`, status `drafted`) states it in
  its own section.
- **ESCALATION 1** raises the §1.7 amendment. Architecture is amended by proposal, never by a story's
  convenience [[feedback_supersede_never_reinterpret]].

Until that amendment lands, §1.7's text and the shipped code disagree, and the ADR is the record of
why. **Do not resolve the disagreement by editing §1.7 from here.**

---

## The split, so nobody has to guess

| Concern | Lives where |
|---|---|
| Field definitions (key, type, labels, PII tier, bounds) | `pariwar_custom_field_definitions` — an append-only, RLS-scoped, versioned table |
| The type allowlist, the forbidden-key patterns, the hard limits | **Code**: `packages/domain/src/custom-fields/{types,frozen-governance,limits}.ts`. A tenant must never author the fence. |
| Functional B-tree indexes on JSON paths | **drizzle-kit migrations**, partial on this `pariwar_id`. DDL — §1.7's migration clause binds here, and correctly. |
| The index inventory + per-Pariwar policy | **This directory** — §1.7 says so verbatim, and it is the one part of §1.7's placement Story 10.12 follows literally. |

The Bihar **identity** envelope (branding, display names) is unrelated to this directory and lives on
the Pariwar Passport (`../../schema/pariwar_passport.ts`), as it has since Story 1.7.
