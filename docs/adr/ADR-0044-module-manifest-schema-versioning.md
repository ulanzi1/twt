# ADR-0044: Module manifest schema versioning — an immutable, per-Pariwar, versioned manifest on an event-derived lifecycle

> **Status:** drafted
> **Date:** 2026-10-31 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** —
> **Supersedes:** —
> **Superseded by:** —

⚠ **`drafted` is an AUTHOR decision**, recorded under author-commit Decisions `2026-10-31-427` (QE1–QE15, BigDev:
*"QE1-QE15 as recommended."*) and `2026-10-31-429` (amendments A1–A7). ⛔ No trustee has ratified it, and this ADR does
⛔ not claim they have.

## Context

- **The property this ADR controls.** Story 12.1 builds the SIXTH event-derived-state primitive — a partner MODULE (an
  HDFC home-loan, LIC term-plan or health-camp offer a Pariwar shows its members) whose lifecycle `draft → scheduled →
  active → archived` is derived only from `events_log` (epics Story 12.1 AC: *"state is event-derived per Story 3.1,
  6.1, 7.1 pattern; persisted state column never directly UPDATEd"*; AR-14). The manifest itself — PRD FR-64's
  *"`{module_id, title, description, eligibility_filter, scope_filter, valid_from, valid_until, slot_capacity?,
  target_url_or_form, partner_id, commission_terms (private)}`"* — needs a shape that the five downstream stories
  (12.2 wizard, 12.3 shelf + lead route, 12.4 grief suppression, 12.5 lead delivery, 12.6 auto-archive) can rely on
  without each re-deciding what a module IS.
- **Tenancy.** Architecture §3.7 (*Module Marketplace lead-handoff transport*): *"lead contracts are per-Pariwar
  (TWT-Bihar's HDFC contract ≠ future Rail Parivar's HDFC contract); contract storage scoped by `pariwar_id`."* PRD §4.9
  puts *"Cross-Pariwar partner manifest — v2."* `events_log.pariwar_id` is NOT NULL.
- **Members feel it.** A module's audience, dates and places decide which members see an offer and who may register
  interest. A manifest that could change after members acted on it would leave a lead attached to an offer that no
  longer says what the member saw.
- **Risk if undecided.** Each sibling story would pick its own answer to "can a module be edited?", "what if the
  audience grammar changes?", and "may a module span Pariwars?" — and the first two answers are expensive to reverse
  once leads exist.

## Decision

**A module's manifest is IMMUTABLE after `module.authored`, belongs to exactly one Pariwar, and is versioned at two
levels — a row-level `manifest_schema_version` (v1 only, DB-pinned) and an inner `version` on each JSON grammar — with
the grammars growing additively inside `version: 1` and every breaking change taking a new version.**

1. **Immutable manifest (QE11).** Every content column of `marketplace_modules` is unchanged after INSERT, enforced by a
   whole-row BEFORE UPDATE trigger that compares the row minus its six projected columns (`current_state`,
   `state_event_version`, `slots_remaining`, `archive_reason`, `audit_id`, `updated_at`) — so a column added later is
   immutable by default. A correction is `module.archived` + a NEW module (a new `module_id`, a new stream). There is ⛔
   `module.revised` event. The genesis event `module.authored` snapshots the whole manifest, so a module is
   audit-replayable from its stream alone.
2. **One Pariwar (QE4).** `pariwar_id uuid NOT NULL`, with ⛔ foreign key (there is ⛔ `pariwars` table). Re-trigger: the
   v2 cross-Pariwar manifest.
   ⭐ *Amended in part 2026-11-01 by `2026-11-01-433` (Story 12.2 QE20):* D2 CLARIFIED, ⛔ changed — there is still ⛔ `pariwars`
   FK. Story 12.2 adds the composite FK `marketplace_modules_partner_fk (pariwar_id, partner_id) → marketplace_partners
   (pariwar_id, partner_id)`, of which `pariwar_id` is a part; it targets the per-Pariwar partner registry, so a module
   can never name another Pariwar's partner (FK checks run as the owner and ignore RLS).
3. **Row-level version.** `manifest_schema_version smallint NOT NULL` with `CONSTRAINT
   marketplace_modules_manifest_schema_version_v1 CHECK (manifest_schema_version = 1)`. A v2 manifest is a migration
   that relaxes this CHECK together with a new parser arm and a new genesis payload schema — ⛔ a silent reinterpretation
   of v1 rows.
4. **Grammar-level version (QE9).** `scope_filter` (`members-all` / `state` / `district`), `eligibility_filter`
   (`{ version: 1, clauses }`, v1 clause `member_state_in`) and `branding_bundle` are closed, `.strict()` and carry
   `version: 1`. They grow ADDITIVELY within `version: 1` (a new scope, a new clause kind, a new optional-by-absence
   member of a union). A change that would make an existing stored value mean something different — or stop parsing —
   is `version: 2`. Values match byte-for-byte; an empty or unknown audience means nobody.
   ⭐ *Amended in part 2026-11-01 by `2026-11-01-433` (Story 12.2 QE20):* D3 / D4 RECORD the tightenings made BEFORE any module
   was stored (code review R4-7: top-level fields under D3, grammars under D4) — Story 12.1's RV3 (the lead URL rules),
   RV5 (NUL / unpaired surrogates refused), RV7 (the window rule shared with the genesis payload), RP1 (the URL's
   canonical form), R3-4 (instants in UTC years, offsets), R3-6 (RFC 3986 URL characters) and R4-1 (the year floor 2000);
   and Story 12.2's QE12 WRITE-ONLY display rules (C0 / C1 / bidi / invisible-formatter characters refused, ZWJ / ZWNJ
   allowed, a letter or digit required, a Devanagari letter in every `*_hi` field). None stops a STORED value parsing
   (there was none). The first tightening AFTER 12.2 ships of a schema the genesis payload re-parses is RPD1's
   re-trigger (a narrow `{ slot_capacity }` read in the fold, or `version: 2`).
   ⭐ *Amended in part 2026-11-01 by `2026-11-01-434` (Story 12.2 code review DN1 + DN2, amending `-433` QE12):* the QE12
   display rules recorded in the line above are TIGHTENED, still before any module or partner was stored — ZWJ / ZWNJ are
   allowed in the `*_hi` fields only and refused in the `*_en` ones; every other format character and default-ignorable
   code point is refused (except the presentation selectors U+FE0E / U+FE0F), as are U+2028 / U+2029, the Braille blank
   U+2800 and the four Hangul fillers. These are write-only schemas the genesis payload does not re-parse, and 12.2 has not
   shipped, so RPD1's re-trigger is NOT met. The line above stays a true record of the rules from `-433` to `-434`.
   ⭐ *Amended in part 2026-11-01 by `2026-11-01-435` (Story 12.2 code review round 2, DN3 + DN4, superseding `-434` in
   part):* the display rules ALSO refuse a value that is not NFC, every space separator but U+0020, and (in a name) two spaces
   in a row; a ZWJ joining two emoji is allowed in the English MODULE texts (the English partner name stays strict). Still
   write-only, still before anything was stored — RPD1's re-trigger is NOT met. The two lines above stay true for their periods.
   ⭐ *Amended in part 2026-11-01 by `2026-11-01-436` and `2026-11-01-437` (Story 12.2 code review round 2, DN5–DN7):* an
   emoji presentation selector (U+FE0F / U+FE0E) is allowed only right after a symbol with both a text and an emoji form
   (`\p{Emoji}`, not `\p{Emoji_Presentation}`) or completing a keycap — `-434`'s "anywhere" exception is narrowed and its
   "LIC" + U+FE0F residual closed. (The admin client's extra cleaning, `-436` item 1, is not a schema rule.) Still write-only and
   before anything was stored — RPD1's re-trigger is NOT met.
5. **Where the rules live.** The DB enforces only six named CHECKs (the window, positive capacity, the capacity/places
   pair and range, the archive-reason pair, the v1 pin). Every other content rule is validated once, at write, by
   `marketplace.parseModuleManifest`, and the genesis payload schema reuses the same field schemas.
   ⭐ *Amended in part 2026-11-01 by `2026-11-01-433` (Story 12.2 QE20):* D5 sentence 1 — the DB ALSO enforces the composite
   partner FK `marketplace_modules_partner_fk` and the unique `marketplace_modules_pariwar_module_unique (pariwar_id,
   module_id)` (the target of the publication record's composite FK); still ⛔ content CHECK beyond the six.
   ⭐ *Amended in part 2026-11-01 by `2026-11-01-433` (Story 12.2 QE20):* D5 sentence 2 — BOTH halves no longer hold: QE12's
   display-text rules live in WRITE-ONLY schemas used by `parseModuleManifest` that the genesis payload does ⛔ reuse (it
   keeps 12.1's laxer, tolerant field schemas — the stricter write rules are a subset), and QE5's scope-value membership
   (every value equals a recorded place) is checked at the 12.2 route, ⛔ by `parseModuleManifest`.

## Alternatives considered

- **A nullable `pariwar_id` (a global partner manifest).** Rejected: the cross-Pariwar manifest is explicitly v2 (PRD
  §4.9), lead contracts are per-Pariwar (architecture §3.7), and `events_log.pariwar_id` is NOT NULL — a NULL tenant
  key would need its own RLS model and its own stream tenancy. Revisit at the v2 cross-Pariwar manifest.
- **A mutable manifest with a `module.revised` event.** Rejected for v1: a revision after leads exist leaves each lead
  attached to an offer that no longer says what the member saw, and every consumer (shelf, delivery, export) would
  need to read "the manifest as of the lead". Archive-and-reauthor costs a reset of places and lets a member register
  again on the new module (carried to 12.2's wizard as a warning, C10). Re-trigger: Story 12.2, if editing proves
  necessary — it would be a new event and an amendment of this ADR.
  ⭐ *Amended in part 2026-11-01 by `2026-11-01-433` (Story 12.2 QE20):* Story 12.2 needs ⛔ editing — a correction is Withdraw +
  "Start a corrected copy" (QE1). The re-trigger is now: the first surface needing server-side save-as-you-go.
- **Declared-and-empty `role` / `cohort` scopes (the banners / news shape).** Rejected (confirmed at `-427`): a scope
  value nobody can resolve is a trap for the wizard and the shelf. Decision `2026-08-13-103` D8's re-trigger stands
  unchanged: the first surface that must target members by role or cohort — which Story 12.2 MAY be.
  ⭐ *Amended in part 2026-11-01 by `2026-11-01-433` (Story 12.2 QE20):* checked by Story 12.2 — condition NOT met (QE17: ⛔
  first partner needs role / cohort targeting); D8's re-trigger is unchanged.
- **An unversioned grammar.** Rejected: the shelf (12.3) evaluates these values long after they were written; without
  a version a later grammar change silently reinterprets stored modules.

## Consequences

- **Operational.** Migration `0193` builds two partial unique indexes on `events_log` (`module_lead_member_uq`,
  `module_lead_id_uq`) inside drizzle-kit's transaction, so each takes a SHARE lock and scans the whole table while
  every event INSERT waits. Accepted pre-production (measured 133 ms + 28 ms on a 56,932-row / 27 MB `events_log`,
  2026-10-31). ⚠ If a populated live deployment exists when it lands, the builds move to a separate `CONCURRENTLY` step
  (the migration header's stop-and-route trigger).
- **Security / privacy.** Lead events carry ⛔ PII — only a lower-case `member_id` and `lead_id`. Sharing member data
  with a partner has ⛔ basis on record yet and is routed to Panel / counsel before anything leaves (carried items C6,
  C8). The lead URL is a write-time shape rule only; the send-time address check is Story 12.5's (C7).
- **Immutability's cost (accepted).** A typo fix is an archive plus a new module: places reset, and a member can
  register interest again on the corrected offer (C10). Mutable presentation data, if a sibling story needs it, goes in
  its own table (C12).
- **Failure modes accepted.** `commission_terms`, FR-64's external `target_url_or_form` CTA and a `module.restored`
  event are ⛔ in v1 (carried to 12.2 / no owner / 12.6). A capped module stays `active` at 0 places until an archive is
  emitted (C2).
  ⭐ *Amended in part 2026-11-01 by `2026-11-01-433` (Story 12.2 QE20):* `commission_terms` is ⛔ stored by 12.2 either (QE6 (A);
  `-433` A1 / A2) — it moves to QE6's re-trigger: OQ-4 answered by the Panel, OR the first PRODUCTION publish of a module,
  OR Story 12.3's create-story, whichever comes first.
- **Migration / pivot path.** A v2 manifest: relax the v1 CHECK, add a v2 parser arm + genesis payload schema, leave
  every v1 row and stream as written. A cross-Pariwar manifest: a successor ADR (this one's Decision 2 is its
  re-trigger).

## References

- [Source: `_bmad-output/planning-artifacts/architecture.md` §3.7 *Module Marketplace lead-handoff transport*] —
  per-Pariwar lead contracts
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` §4.9 FR-64..FR-67, *Out of Scope v1*, OQ-4]
- [Source: `_bmad-output/planning-artifacts/epics.md`, Story 12.1] — owning Story
- [Source: `_bmad-output/implementation-artifacts/12-1-module-manifest-schema-module-lifecycle-state-machine.md`] — QE1–QE15,
  I1–I11, carried items C1–C13
- [Source: `.decision-log.md`, Decisions `2026-10-31-427` (QE1–QE15) and `2026-10-31-429` (A1–A7)] — author-commit
- [Source: `.decision-log.md`, Decision `2026-08-13-103` D8] — the role / cohort re-trigger
- [Source: `packages/domain/migrations/0193_marketplace-modules.sql`; `packages/domain/src/marketplace/`] — the mechanism
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR
- Memory: [[feedback_architecture_vs_adr_boundary]] · [[feedback_supersede_never_reinterpret]]

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-10-31 | (initial draft) | BigDev (Solo Builder) | Authored under Story 12.1 (author-commit `2026-10-31-427` / `-429`); the reserved slot `ADR-NNNN-module-manifest-schema-versioning` flipped `slot-reserved-pre-write` → `drafted` |
| 2026-11-01 | (⛔ flip — stays `drafted`) | BigDev (Solo Builder) | Amended IN PART by author-commit `2026-11-01-433` (Story 12.2 QE20, A4): dated lines at D2, D3 / D4, D5 (both sentences), Alternatives (revise event; role / cohort) and Consequences (`commission_terms`) |
| 2026-11-01 | (no flip — stays `drafted`) | BigDev (Solo Builder) | Amended IN PART by author-commit `2026-11-01-434` (Story 12.2 code review DN1 + DN2, A2): a second dated line at D3 / D4 — QE12's display rules tightened (ZWJ / ZWNJ `*_hi` only; every other invisible code point refused except U+FE0E / U+FE0F) |
| 2026-11-01 | (no flip — stays `drafted`) | BigDev (Solo Builder) | Amended IN PART by author-commit `2026-11-01-435` (Story 12.2 code review DN3 + DN4): a third dated line at D3 / D4 — NFC, U+0020 the only space, no doubled space in a name; ZWJ between two emoji in the English module texts |
| 2026-11-01 | (no flip — stays `drafted`) | BigDev (Solo Builder) | Amended IN PART by author-commits `2026-11-01-436` / `-437` (Story 12.2 code review DN6 + DN7): a fourth dated line at D3 / D4 — a presentation selector only where it changes the look |
