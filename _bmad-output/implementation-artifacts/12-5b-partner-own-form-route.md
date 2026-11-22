---
baseline_commit: 4db122e0
---

<!--
PINNED: `4db122e0` = `origin/main` (2026-11-22e, after `git fetch origin`). The story lives on branch
`story/12-5b-partner-own-form-route` in its OWN worktree (`.claude/worktrees/12-5b-partner-own-form-route`), cut from
`origin/main`. Two facts, kept apart: (1) the pin is an ancestor of HEAD (durable); (2) every `apps/` / `packages/` /
`scripts/` claim below was re-derived at the pin on 2026-11-22 (perishable — `git diff --name-only 4db122e0..origin/main
-- packages apps scripts` at Task 0.1). Re-locate by FUNCTION, ⛔ by line.

STATUS: ready-for-dev (2026-11-22 — v1.2; created by `bmad-create-story 12.5b` as v1.0, validated the same day). ⭐ **TASK 0
COMPLETE (2026-11-22):** BigDev answered every ask as recommended; Decision `2026-11-22-489` committed ALONE (`7b4f93db`);
the records committed after it. Task 1 may start (re-run 0.1's `git diff` first if `origin/main` has moved). ⭐ **NO CODE BEFORE TASK 0.3.** The build
decisions QE1–QE18 carry SIX asks (QE6, QE7, QE9, QE10, QE12, QE13). BigDev answers them at Task 0.2; the author-commit
(≥ `-489`) is committed ALONE before any code ([[feedback_governance_commits_precede_implementation]]). Nothing in this story
is the Panel's as proposed (the §0 table below): the Panel already ruled R1–R5 (`-486`), and every edge left open is either
built on the narrow side as `-486` itself directs, or engineering. ⚠ ONE exception is BigDev's call at Task 0.2: QE10 (a
death-reported member's visit record) touches `-423`; if BigDev judges R2 C and `-423` in conflict for it, that edge is
routed from the template. Otherwise ⛔ Panel note is written by this story.

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (used ONLY in this header comment, the rulings and §0 tables,
and the G / QE prose) · ⭐ = action / emphasis · ⚠ = hazard. ⭐ In Policy meaning, ACs, Invariants, Tasks, Dev Notes and
Traps, negations are written in PLAIN WORDS ("No …", "Do NOT …", "is NOT …"), so a skim cannot invert them.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. They are
newest-first files, so cite the decision id + clause, the item heading, or the row key. Line numbers into other files
are perishable hints. Legal files (`docs/legal/*`, git-ignored, main checkout) are cited by NAME and described in our own
words — ⛔ pasted (the repo is public). Grep them by ABSOLUTE path ([[feedback_worktree_session_never_cd_to_main_checkout]]).

LETTERS: G = found facts · QE = build decisions · I = invariants · TR = traps · K = carried to sibling stories. ⚠ `C5`,
`C8`, `C9`, `C10`, `C12` with NO hyphen are ALWAYS Story 12.1's carried items; `K-1` … `K-13` with a hyphen and NO `b` are
Story 12.5's; this story's own carried items are `KB-1` … `KB-9`. `W1`–`W14` / `S1`–`S10` / `P0`–`P5` are 12.5's (QE6 / QE13 /
QE7 of `-483`); this story adds `W15` (the visit purge) and nothing else to those tables.

NUMBERS — re-read 2026-11-22 across every ref (heads and remotes, backups excluded) and the live sibling worktrees
(`3-13-…`, `3-15-…`, `6-39a-…`, `governance-registration-change-2026-11-21`). Every number is a FLOOR, never a value; the
number belongs to the first COMMIT, on any branch (`-366` decision 6).
- Decisions: newest on every ref and worktree is `2026-11-22-488` ⇒ this story's author-commit is **≥ `-489`**.
- Migrations: highest on every ref is `0215_marketplace-lead-handoffs`; the siblings' trees stop at `0212` ⇒ this story takes
  **≥ `0216` and `0217`** (two files — QE1). Each journal `when` must exceed every sibling's
  ([[project_sibling_migration_when_order_shared_db]]). File names below use `NNNN` / `NNNN+1`.
- ADRs: highest `ADR-0046` — this story writes ⛔ new ADR; it appends dated lines to `ADR-0044` and `ADR-0046` (QE17).
- RBAC: this story adds NO key and NO role (I9). `PERMISSION_CATALOG_VERSION` = `65` at the pin.
- Ledger: newest is `2026-11-22e` ⇒ this story's creation entry is **≥ `2026-11-22f`** (re-grep every ref at every entry).
- Roster: Row 55 `partner-form-route-live` exists and is THIS story's (leg (d)). ⛔ new row.
⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each.
-->

# Story 12.5b: Partner's-Own-Form Route — Offer Route Marker + Send Guard + Outbound Link `[PRIMITIVE]`

Status: review

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

The Panel ruled that a partner offer works one of two ways (`-484` Q1 C). Story 12.5 built the first way: the Trust sends
four of the member's details to the partner. This story builds the second way: the member opens the partner's own page
in the phone's own browser, and **the Trust sends nothing about the member**. The only link between the member and the
partner is a fixed code in the offer's URL, the same for every member.

The story does five things:
1. **Marks each offer's route** in its manifest (`lead_route`: `trust_sends` | `partner_form`), set at authoring and
   immutable (manifest schema v2).
2. **Makes the sending route refuse a `partner_form` offer, everywhere.** The lead, seal and handoff commands refuse it;
   a database trigger refuses a handoff row for it; the 12.5 sweep cancels any such row and raises an alarm. A 12.3 bug
   then fails loudly and never sends quietly.
3. **Builds the outbound link** for the app: `Linking.openURL` on the stored URL, byte for byte, with the Panel's own
   sentence shown first (R5).
4. **Builds what the Panel ruled the Trust may learn** (`-486`):
   - a per-member record that the member opened the partner's page, removed 90 days after it was made (R2 C);
   - per-offer counts with no member on them;
   - staff entry of the partner's own totals per offer, never shown below 5 (R3 B).
5. **Lets the publishing admin choose the route** (R1 A): the author proposes it in the wizard, and the publisher chooses
   it again at publish. The choice is stored on the publish record.

**Nothing reaches a member from 12.5b alone.** There is no member shelf yet (Story 12.3, built AFTER this story). The
domain functions the shelf will call have no production caller here. The admin wizard and publish changes do have
callers, but a published offer reaches no member until 12.3 exists. Go-live of the route waits on roster Row 55 (c) and
(d). Merge ≠ go-live ([[project_not_in_production_merge_is_not_golive]]).

## ⭐ Names at a glance

| Thing | Name |
|---|---|
| Route enum (NEW pgEnum) | `marketplace_module_lead_route` = `('trust_sends', 'partner_form')` · TS `MARKETPLACE_MODULE_LEAD_ROUTES` in `schema/marketplace_modules.ts` |
| Manifest columns (NEW) | `lead_route` (NOT NULL; ⛔ default after the migration) · `partner_form_url` (NULL) — `marketplace_modules` |
| Manifest version | `MODULE_MANIFEST_SCHEMA_VERSION = 2` for every NEW manifest; v1 rows / streams stay as written and read as `trust_sends` |
| CHECKs (NEW / REPLACED) | `marketplace_modules_route_columns` (NEW) · `marketplace_modules_manifest_schema_version_v1` → REPLACED by `marketplace_modules_manifest_schema_version` (`IN (1, 2)`) + `marketplace_modules_v1_is_trust_sends` |
| Publish record (NEW column + FK) | `marketplace_module_publications.lead_route` — the PUBLISHER's choice; composite FK `(pariwar_id, module_id, lead_route)` → NEW unique `marketplace_modules_pariwar_module_route_unique` |
| Handoff backstop (NEW trigger) | `marketplace_lead_handoffs_route_guard` — BEFORE INSERT on `marketplace_lead_handoffs`, refuses a `partner_form` module |
| Cancel word (NEW) | `partner_form_route` — in `LEAD_HANDOFF_CANCEL_WORDS` AND the `0215` detail CHECK (replaced, lockstep) |
| Typed errors (NEW) | `ModuleLeadRouteRefusedError` (`marketplace/errors.ts`) — thrown by `submitModuleLead`, `sealLeadMemberFields`, `recordLeadHandoff`; lead refusal word `partner_form_route` in `ModuleLeadRefusal` |
| Visit record (NEW table, R2 C) | `marketplace_partner_form_visits` — one row per opening; removed 90 days after `opened_at` (W15) |
| Per-offer counts (NEW table) | `marketplace_partner_form_counts` — `(pariwar_id, module_id, day, kind)` → `count`; kinds `card_shown` · `card_opened` · `went_to_partner` · `came_back` |
| Partner totals (NEW table, R3 B) | `marketplace_partner_form_totals` — staff-entered, insert-only; a figure below 5 is stored as "fewer than 5", never the number |
| Domain (NEW file) | `packages/domain/src/marketplace/partner-form.ts` — `openPartnerFormVisit` (writes the visit + `went_to_partner`, returns the URL) · `countPartnerFormEvent` · `recordPartnerFormTotals` · `listPartnerFormFigures` · `purgeExpiredPartnerFormVisits` |
| Constants | `PARTNER_FORM_VISIT_RETENTION_DAYS = 90` (`-486` R2 C) · `PARTNER_FORM_FIGURE_FLOOR = 5` (`-486` R3 B) |
| Mobile opener (NEW) | `apps/mobile/lib/partner-form-link.ts` — `openPartnerForm(url)` → `Linking.openURL(url)` and nothing else |
| Member copy (NEW namespace + key) | `packages/i18n/locales/{en,hi}/marketplace.json` → `partnerForm.notice` (the Panel's sentence, `{{partner}}`) |
| API (CHANGED / NEW) | `POST …/modules` (author: route fields) · `POST …/modules/:id/publish` (the publisher's `lead_route`) · `GET …/modules/:id` (route, URL, figures) · NEW `POST …/modules/:id/partner-form-totals` |
| Decisions | `2026-11-21-484` (Q1 C) · `2026-11-21-485` (author-commit, K-12) · `2026-11-22-486` (Trustee-ratified, R1–R5) · this story's author-commit ≥ `-489` |
| Roster | Row 55 `partner-form-route-live` — leg (d) is this story |

## Story

As **Solo Builder carrying out Decision 2026-11-21-484 Q1 C ("Both — each offer works one way or the other")**,
I want **each offer to carry which way a member's interest reaches the partner, and the "partner's own form" way to send
nothing about the member**,
so that **"The Trust sends nothing … only a code saying which offer the visit came from, and nothing about the member"
holds by construction, not by 12.3 getting it right.**

## 📜 Policy meaning (AI-10-1)

**This story introduces NO predicate that gates a member's access to a benefit.** A partner offer is not a benefit the
Trust owes (`-485`'s own policy-meaning line). The refusals it adds (a `partner_form` offer refuses a lead; the visit
command refuses a member whose death is reported, who withdrew, was erased or terminated, or whose account is frozen) gate
an OFFER, never a Trust benefit. The one that changes what a member sees is R4 A (offers hidden once a death is reported),
and the Panel ruled it in a member's terms itself.

**In a member's terms** (the sentence `-486` ratified as this route's policy meaning, kept verbatim): *"For some offers you
are sent to the partner's own page, where the partner may ask for your contact details; the Trust passes the partner
nothing about you. The Trust keeps a note that you opened that page for 90 days, then removes it. The partner may tell the
Trust how many people got through its form, never who. Once your death has been reported to the Trust, these offers are
not shown on your phone."*

**Checked against the Niyamavali:** re-checked 2026-11-22 by grep of `niyamavali.md` and `niyamavali.hi.md` (main checkout,
absolute path) for "partner" / "साझेदार" / "पार्टनर": **no match — SILENT on partners**, as `-485` and `-486` recorded on 2026-11-21. The
only legal text naming partner arrangements is the trust deed's objects clause (disclosure), already deferred by `-433`
(QE6 (A)) and not touched here.

## The rulings this story builds on (quoted, never paraphrased)

> **`2026-11-21-484` ruling 1 (Q1 — C), Trustee-ratified:** *"Both — each offer works one way or the other."* Option B, as
> put: *"The Trust sends nothing — the member opens the partner's own form from the app and fills it in; the partner checks
> the member's number in its own way. The form opens in the phone's own browser, not inside the Trust's app, so the Trust
> cannot see what the member types. The Trust passes the partner only a code saying which offer the visit came from, and
> nothing about the member."* Option C, as put: *"As A for some offers and as B for others; the member sees which before
> going on."*

> **`2026-11-22-486`, Trustee-ratified (DR + KB), as relayed:** *"R1 A, R2 C -  remove after 90 days, R3 B, R4 A, R5 : You
> are being directed to [partner]'s page, where [partner] may ask for your contact information."*
> - **R1 A**, as put: *"The admin who publishes the offer chooses, offer by offer. The choice is on the publish record."*
> - **R2 C, 90 days**, as put: *"Yes, removed after a number of days (yours and counsel's to set)."* — the Panel set 90.
> - **R3 B**, as put: *"Totals per offer only — how many started, reached each step, and finished — treated as information,
>   never as a fact about any member."* Cost accepted: *"… we suggest totals below 5 are not shown."* — 5 stands as put.
> - **R4 A**, as put: *"Yes — the same as Q7 A. Hidden from the moment the death is reported, and still hidden after the claim
>   is settled."*
> - **R5 — AMENDED:** the member sees only *"You are being directed to [partner]'s page, where [partner] may ask for your
>   contact information."*; the Hindi goes through the house tone review, ⛔ back to the Panel.

> **`-486` "does NOT cover"** (each is handled in this story as `-486` itself directs — see §0):
> - R2 — *"the legal basis for keeping the record (counsel …); who on staff may READ a member's record of a visit …; whether
>   the 90 days count from the opening or from the last opening of the same offer; what happens to the record when the
>   member's death is reported"* ⇒ `-486`: *"Story 12.5b builds the narrow side and asks: ⛔ staff read; 90 days from each
>   record's own creation; an erasure request and the DPDPA data export reach it like any other member record."*
> - R3 — *"how totals reach the Trust … — the author's, Story 12.5b's create-story."* (QE12)
> - R1 — *"whether a trustee may overrule a publishing admin's choice; the publish record's shape … — 12.5b's."* (QE6; KB-7)
> - R5 — *"the Hindi text (tone review); the `trust_sends` route's wording (12.3 …)."*

> **`2026-11-21-485`** (author-commit, K-12) items 2, 4, 5, 7, 9 stand unchanged; item 6 (tracking) and its policy-meaning
> clause are SUPERSEDED in part by `-486`; item 8's "WHO may choose it" is ANSWERED by R1 A. ⚠ Item 3 stands EXCEPT its
> clause *"⛔ member↔offer link"*: R2 C's 90-day visit record IS such a link, and `-486` superseded ⛔ that clause by name.
> This story's author-commit supersedes it in part, by name (Task 0.3) — ⛔ read around it.
>
> **The routing note's "Told — not asked" item 3** (what the Panel was told, not asked): *"Which details go, how long a copy
> is kept, and telling the partner after a withdrawal (your Q3 to Q6) concern only offers where the Trust sends details. Here
> it sends none."* ⇒ ⛔ `-484` Q4 A's schedule may be cited as ratifying anything on THIS route (QE10).

### §0 — whose decision is each edge (`trustee-panel-routing-note-TEMPLATE.md` §0)

| Edge | Whose | Why |
|---|---|---|
| Route marker, CHECKs, manifest v2 (QE1–QE3) | author | engineering; only NARROWS what may leave (`-485` item 2) |
| Send guard + DB trigger + sweep cancel (QE4, QE5) | author | narrows (`-485` item 3); amends `-483` QE13's tick by name |
| Publisher chooses the route on the publish record (QE6) | author | R1 A ruled WHO; `-486` gives the record's SHAPE to 12.5b |
| Wizard layout (QE7) | author | UX layout; ⛔ change to who chooses or what is sent |
| Visit record: shape, ⛔ staff read, 90 days from own creation, erasure + export (QE8) | author | `-486` prescribes this narrow side in its own words |
| Visit record: ⛔ audit line, ⛔ event, ⛔ log copy (QE9) | author | engineering that keeps R2 C's removal REAL; holds LESS, never more |
| Visit record of a member whose death is reported (QE10) | ⭐ ASK — author, unless BigDev routes it | (A) follows R2 C's own words (*"removed after 90 days"*, no exception) and `-486`'s record that `-423` is ⛔ read as reaching it — that IS a reading of `-423` (erasure on request ≠ a retention schedule), stated as one; (C) is `-423`'s side. If BigDev judges the two ratified texts in conflict for this record, it is the Panel's (reconciling two rulings) |
| Visit refusals for a frozen / death-reported / gone member (QE11) | author | narrow side of R4 A (ratified); C9 belt-and-braces |
| Totals intake channel (QE12) | author | `-486` R3: *"the author's, Story 12.5b's create-story"* |
| Count granularity + floor on the Trust's own counts (QE13) | author | per-offer only (`-485` item 6 stands); the floor on own counts narrows |
| Copy key, Hindi through tone review (QE14) | author + tone review | R5 ruled the English; `-486` sends the Hindi to tone review |
| Opener (QE15) | author | `-485` item 5 |
| A trustee overruling a publisher's route | ⛔ built | `-486` not covered; withdraw is the existing path — KB-7, ⛔ routed now (no trigger yet) |

## FOUND FACTS (G) — re-derived at `4db122e0`, 2026-11-22

- **G1 — the manifest has no route and two NOT NULLs.** `0193_marketplace-modules.sql`: `lead_handoff_url text NOT NULL`,
  `lead_handoff_signing_key_secret_name text NOT NULL`, `slot_capacity integer` (NULL = uncapped), CHECK
  `marketplace_modules_manifest_schema_version_v1` (`= 1`). `schema/marketplace_modules.ts` mirrors them;
  `MODULE_MANIFEST_SCHEMA_VERSION = 1 as const`.
- **G2 — the whole-row trigger makes new columns immutable BY DEFAULT.** `marketplace_modules_reject_unguarded_state_write`
  (b) compares `to_jsonb(NEW) - <six projected keys>` with OLD, so `lead_route` and `partner_form_url` are immutable with ⛔
  trigger change. ⚠ Any UPDATE (even a backfill in the migration) is refused P0001 unless the guard GUC is on — so the
  migration must set existing rows through the column DEFAULT, never an UPDATE (TR2). `ALTER TABLE … ADD COLUMN` fires ⛔
  row trigger. The genesis INSERT shape check (I3) does not read the new columns.
- **G3 — ADR-0044 already says how v2 is done.** "Migration / pivot path. A v2 manifest: relax the v1 CHECK, add a v2
  parser arm + genesis payload schema, leave every v1 row and stream as written." D3: *"A v2 manifest is a migration that
  relaxes this CHECK together with a new parser arm and a new genesis payload schema — ⛔ a silent reinterpretation of v1
  rows."*
- **G4 — the genesis payload is re-parsed on every fold.** `state.ts` (`foldModuleProjection`) runs
  `ModuleAuthoredPayloadSchema.safeParse(row.payload)`; the registry (`packages/events/src/registry.ts`) binds
  `module.authored` to the same schema. ⇒ the v1 schema must keep parsing every stored v1 genesis unchanged (TR4).
  ⚠ The v1 payload schema in `events.ts` is written `manifest_schema_version: z.literal(MODULE_MANIFEST_SCHEMA_VERSION)` —
  the CONSTANT, NOT the number 1. The constant is defined in `schema/marketplace_modules.ts` and also read by `project.ts`
  (the genesis writer). Bumping it to 2 while leaving `events.ts` "as it is" turns the v1 arm into `z.literal(2)`: every
  stored v1 genesis then fails to parse, the fold reads capacity as null and the projector refuses (TR4).
- **G5 — the URL rule refuses any query.** `filters.ts` `moduleLeadHandoffUrlSchema`: https only; ⛔ userinfo and ⛔ `@`
  anywhere; ⛔ query, ⛔ fragment (raw `?` / `#` refused); ⛔ whitespace / control / backslash; ⛔ IP literal / localhost;
  canonical form (`raw === url.href` or bare origin + `/`); RFC 3986 character set `RFC3986_URL_CHARS` (no `?` in it); ≤ 2048.
  A `partner_form_url` needs a fixed partner-supplied query (the offer code) ⇒ its own schema (QE3).
- **G6 — `parseModuleManifest` is one strict object.** `ModuleManifestInputSchema` is `.strict()` with exactly 12 content
  keys and returns `ModuleManifestV1`; the 12.2 author route passes `{ ...body, branding_bundle: EMPTY_BRANDING_BUNDLE }`
  (`apps/api/src/modules/marketplace/handlers.ts` `author`).
- **G7 — the lead decision has no route check.** `commands.ts` `decideLead` order: not_found → replay → not_active →
  outside_window → slots_exhausted → duplicate_lead → already_submitted. `MODULE_GUARD_COLUMNS` = `current_state,
  state_event_version, slots_remaining, slot_capacity, valid_from, valid_until`. `checkModuleLeadAllowed` and
  `submitModuleLead` both run it. ⛔ projector check of the route (`project.ts` `projectModuleTransition`).
- **G8 — the seal touches no database, and runs OUTSIDE any transaction by contract.** `lead-handoff.ts`
  `sealLeadMemberFields(enc, { pariwarId, leadId, fields })` → `sealLeadMemberFieldsV1` (KMS only). It has ⛔ `moduleId` and
  ⛔ client, so it cannot know the route today. `-483` QE18 step 1 and `lead-member-fields.ts`'s header: 12.3 seals BEFORE
  its transaction — *"no KMS round trip may run while `submitModuleLead` holds the module row"*. ⇒ there is ⛔ caller scope
  to read under; under FORCE RLS an unscoped `twt_app` read sees ⛔ module row. Callers: its own tests
  (`packages/domain/tests/marketplace/lead-member-fields.test.ts`, `apps/jobs/tests/module-lead-handoff.test.ts`);
  ⛔ production caller (12.5 I1).
- **G9 — `recordLeadHandoff` checks consent, never the route.** Inside `SAVEPOINT lead_handoff_record`: consent found /
  type / subject / `memberExists` / revoked / artifact, then INSERT. `marketplace_lead_handoffs` has the composite FK
  `marketplace_lead_handoffs_module_fk (pariwar_id, module_id)` → modules, and its own guard trigger
  `marketplace_lead_handoffs_guard` (0215).
- **G10 — the sweep's claim reads the URL authority, and NULL breaks it.** `claimDueLeadHandoff`'s CTE selects
  `split_part(m.lead_handoff_url, '/', 3) AS authority` and filters `NOT (split_part(…) = ANY($3::text[]))`. With a NULL URL
  the authority is NULL; `NULL = ANY('{}')` is false (so the row IS claimed when no authority is open), but
  `NULL = ANY('{a}')` is NULL ⇒ `NOT NULL` ⇒ the row is NOT claimed in any tick that has an open authority (TR1).
  `ClaimedLeadHandoff.authority` is typed `string`.
- **G11 — S4 assumes a URL.** `apps/jobs/src/scheduler/module-lead-handoff.ts` S4: `readLeadHandoffModule` →
  `checkLeadUrl(module.leadHandoffUrl)` → S5 secret + DNS. `LeadHandoffModule.leadHandoffUrl` / `signingKeySecretName` are
  `string`. A NULL would reach `checkLeadUrl` and `resolveSecret`.
- **G12 — the waiting pass reads only "withdrawn".** `listWaitingLeadHandoffs` returns `moduleWithdrawn`; the sweep cancels
  with the member's word or `module_withdrawn` via `cancelWaitingLeadHandoff` (W14).
- **G13 — the cancel words are in a DB CHECK.** `LEAD_HANDOFF_CANCEL_WORDS` (7 words) and `LEAD_HANDOFF_DETAIL_PATTERN`
  (`schema/marketplace_lead_handoffs.ts`) are LOCKSTEP with `0215`'s `marketplace_lead_handoffs_outcome_detail_check`. A new
  word needs that CHECK dropped and re-added in a NEW migration (⛔ edit an applied one — [[project_live_db_test_gotchas]]).
- **G14 — the publisher is never the author.** `handlers.ts` `publish`: *"The tone gate (Story 2.2 / ADR-0019 invariant (b)):
  the publisher is NEVER the author (QE9, I4)."* `PublishModuleRequest` = three `z.literal(true)` ticks. The publication row
  (`marketplace_module_publications`, insert-only, PK `module_id`, composite FK `(pariwar_id, module_id)` →
  `marketplace_modules_pariwar_module_unique`) has ⛔ route column. ⇒ R1 A's *"The choice is on the publish record"* needs a
  column there (QE6).
- **G15 — the wizard asks places BEFORE the URL.** `apps/admin/src/modules/marketplace/derive.ts` `validateStep`: step `e`
  = places (`placesMode` `unlimited | fixed`), step `f` = `leadHandoffUrl` + `secretName`. `WizardState` has ⛔ route.
  Prefill for "Start a corrected copy" maps `m.lead_handoff_url` back.
- **G16 — the mobile app opens the system browser already, and also has an in-app browser.** `Linking.openURL` in
  `(helpdesk)/[ticketId].tsx`, `(renewal)/payment.tsx`, `(settings)/notifications.tsx`, `(auth)/terminated.tsx`;
  `lib/public-site.ts` documents the "⛔ in-app WebView" stance. ⚠ `expo-web-browser` IS a dependency
  (`app.config.ts` plugin; `(signup)/kyc.tsx` imports `WebBrowser`) — so the wrong opener is one import away (TR19).
- **G17 — i18n namespaces.** `packages/i18n/locales/{en,hi}/*.json`, one file per namespace; ⛔ `marketplace` namespace;
  mobile binds a namespace with a thin hook (`lib/helpdesk-i18n.ts` precedent). en/hi parity is gated. ⚠ A file alone is
  NOT a namespace: `packages/i18n/src/catalog.ts` registers each one THREE times — a static import per locale, the
  `catalogs` map, and the separate `KNOWN_NAMESPACES` literal — and `packages/i18n/tests/catalog-registration.test.ts`
  checks they agree. An unregistered namespace makes `t()` THROW. `microcopy.yaml` `scope.copy_globs` lists the scanned
  locale files BY NAME (16 namespaces; `helpdesk` and `known_people` are not among them).
- **G18 — erasure pins its statement and table counts, and erasure is a SOFT delete.**
  `packages/domain/tests/member/rtbf-anonymize.test.ts` pins `captured` `toHaveLength(34)` and `new Set(tables).size`
  `toBe(31)` (12.5 made it 31), AND, in the "member with no claims" test, `captured` `toHaveLength(30)` (12.5 made it 30;
  a member-keyed statement counts there too). `member/anonymize.ts` imports `marketplace_lead_handoffs` from the SCHEMA file
  directly (⛔ the barrel — a member ↔ marketplace init cycle), and reaches it with an UPDATE scrub — `anonymize.ts` has ⛔
  `.delete(` anywhere, and `twt_app` holds ⛔ DELETE on `marketplace_lead_handoffs` (0215). Under FORCE RLS a DELETE (or
  UPDATE) with ⛔ matching per-command policy matches 0 rows SILENTLY (0215's header, `-279` A12). The only `FOR DELETE`
  policy in the migrations today is 0167's global one.
- **G19 — the export strict-parses its sections.** `packages/domain/src/data-export/assemble.ts` builds the files;
  `apps/jobs/src/data-export.ts` parses each against `.strict()` contracts in `packages/contracts/src/data-export/data-export.ts`
  ([[project_data_export_sections_strict_parsed]]). ⛔ marketplace data is exported today (12.1 C8 (b) is 12.3's, K-1).
- **G20 — the audit log and `events_log` are permanent.** Both are append-only; nothing purges them. A line naming a member
  and an offer would keep R2's fact forever (QE9).
- **G21 — admin copy cannot say "report".** The microcopy gate scans admin code, test ids and comments for "receipt" /
  "report" / "invoice" ([[project_microcopy_gate_scans_admin_code]]). R3's own word ("report totals") cannot be the UI's.
- **G22 — the boundary fence exists.** `scripts/partner-boundary-invariant/` + `apps/api/tests/integration/partner-boundary.spec.ts`
  (12.5): ⛔ inbound partner route. A staff-entry form adds ⛔ partner-facing route (QE12 (A)).
- **G23 — Niyamavali silent; privacy policy silent.** Grep of `docs/legal/niyamavali*.md` and `privacy-policy*.md` (main
  checkout) for "partner": no match. The policy will need to describe the visit record before go-live — counsel's, Row 55
  (KB-6).
- **G24 — the sweep and the export run on the JOBS LOGIN, which has no grant on a new table.** `lead-handoff.ts`: *"The
  sweep's pool BYPASSES RLS (roster Row 26)"*; `apps/jobs/src/data-export.ts` reads under `withPariwarScope` on the jobs
  pool. In production that login inherits `twt_service` (Row 26), and BYPASSRLS waives policies, ⛔ GRANTs ⇒ a table
  `twt_service` holds nothing on is 42501 in production, while CI is GREEN (every live test connects as the superuser —
  Row 26 (c)). Two precedents: 0195 grants `SELECT, UPDATE ON marketplace_modules TO twt_service` in the migration; 0215
  left `marketplace_lead_handoffs` to a roster leg (Row 54 (g)).
- **G25 — a manifest 422 reaches the admin by its issue PATH.** `ModuleManifestInvalidError.issues` → the API's
  `issues[].path` (`apps/api/src/modules/marketplace/errors.ts`) → the wizard's `issueToStep(path)` (reads `path[0]`
  against `FIELD_STEP`) and `issueFieldName` (`FIELD_LABEL`) in `derive.ts`. A failed `z.union` reports ONE
  `invalid_union` issue at path `[]` ⇒ every field error would land on the summary step. Zod is `^3.23`:
  `z.discriminatedUnion` accepts only plain `ZodObject` options, ⛔ the `.superRefine(...)`-wrapped arms every manifest
  schema here is.
- **G26 — the sweep's tick runs on its OWN pool connections.** A `pg_temp` table exists only in the session that made it,
  so the tick never sees a test's clone (`apps/jobs/tests/wa-opt-in-lasting-yes.test.ts` says so for its worker). The
  route columns cannot be "flipped" after insert (G2). The house way to write a row past a trigger without DDL is a
  committed superuser transaction with `SET LOCAL session_replication_role = 'replica'`, then `'origin'`
  (`packages/domain/tests/integration/attribution-code/_fixtures.ts`; 0215's header names the same bypass).
- **G27 — two `deferred-work.md` items name this story as owner.** 12.5's K-12 (items (1)–(3)) AND 12.1's *"An external-URL
  CTA (FR-64 `target_url_or_form`) is Not addressed"* (owner Story 12.5b since 2026-11-21, `-485` (A1)).

## ⚖️ Build decisions QE1–QE18 (⭐ ASK = BigDev answers at Task 0.2; the rest are proposed as a set)

**QE1 — the migrations (two files).**
`NNNN_marketplace-module-lead-route.sql`:
- `CREATE TYPE marketplace_module_lead_route AS ENUM ('trust_sends', 'partner_form')`;
- `ADD COLUMN lead_route … NOT NULL DEFAULT 'trust_sends'`, then `ALTER COLUMN lead_route DROP DEFAULT` (every new INSERT
  must name it — fails loudly);
- `ADD COLUMN partner_form_url text`;
- `ALTER COLUMN lead_handoff_url DROP NOT NULL` and the same for `lead_handoff_signing_key_secret_name`;
- DROP `marketplace_modules_manifest_schema_version_v1`; ADD `marketplace_modules_manifest_schema_version CHECK
  (manifest_schema_version IN (1, 2))` and `marketplace_modules_v1_is_trust_sends CHECK (manifest_schema_version = 2 OR
  lead_route = 'trust_sends')`;
- ADD `marketplace_modules_route_columns CHECK`:
  `(lead_route = 'trust_sends' AND lead_handoff_url IS NOT NULL AND lead_handoff_signing_key_secret_name IS NOT NULL AND
  partner_form_url IS NULL) OR (lead_route = 'partner_form' AND partner_form_url IS NOT NULL AND lead_handoff_url IS NULL
  AND lead_handoff_signing_key_secret_name IS NULL AND slot_capacity IS NULL)`;
- ADD UNIQUE `marketplace_modules_pariwar_module_route_unique (pariwar_id, module_id, lead_route)` (the publication FK's
  target, QE6). ⛔ row changes, so the whole-row trigger is untouched;
- `marketplace_module_publications`: `ADD COLUMN lead_route … NOT NULL DEFAULT 'trust_sends'`, then DROP DEFAULT; ADD FK
  `marketplace_module_publications_module_route_fk (pariwar_id, module_id, lead_route)` → the new unique (NO ACTION);
- `marketplace_lead_handoffs`: replace `marketplace_lead_handoffs_outcome_detail_check` with the grammar plus
  `cancelled:partner_form_route` (LOCKSTEP with `LEAD_HANDOFF_DETAIL_PATTERN`); `CREATE FUNCTION` +
  `CREATE TRIGGER marketplace_lead_handoffs_route_guard BEFORE INSERT` (QE4).

`NNNN+1_marketplace-partner-form-figures.sql`: the three new tables (QE8, QE12, QE13), each with ENABLE + FORCE RLS,
per-command tenant policies (⛔ FOR ALL — the 0193 shape), composite FK `(pariwar_id, module_id)` →
`marketplace_modules_pariwar_module_unique`, and exactly these GRANTs (each policy exists for each granted command —
a command with ⛔ policy matches 0 rows silently, G18):

| Table | `twt_app` | Policies (`…_tenant_isolation_<cmd>`) | `twt_service` (the jobs login, G24) |
|---|---|---|---|
| `marketplace_partner_form_visits` | SELECT · INSERT (`visit_id`, `pariwar_id`, `module_id`, `member_id`) · DELETE (erasure) · ⛔ UPDATE | select · insert · **delete** | SELECT (export) · DELETE (W15) |
| `marketplace_partner_form_counts` | SELECT · INSERT · UPDATE (`count`) — the UPSERT needs both · ⛔ DELETE | select · insert · update | ⛔ |
| `marketplace_partner_form_totals` | SELECT · INSERT · ⛔ UPDATE · ⛔ DELETE (insert-only) | select · insert | ⛔ |

The `twt_service` grants follow 0195's precedent (in the migration), so the W15 purge and the export do not 42501 in
production; Row 26 and Row 55 get dated lines saying so (Task 0.4). Hand-authored, ⛔ `db:generate` (the 0193 header);
journal entries with `when` above every sibling's.

**QE2 — manifest v2 in the domain.**
- `MODULE_MANIFEST_SCHEMA_VERSION = 2` (`schema/marketplace_modules.ts`); add `MODULE_MANIFEST_SCHEMA_VERSION_V1 = 1` beside
  it. ⭐ In the SAME change, rewrite the v1 payload's version field in `events.ts` from
  `z.literal(MODULE_MANIFEST_SCHEMA_VERSION)` to `z.literal(MODULE_MANIFEST_SCHEMA_VERSION_V1)` — this is the ONE edit the
  v1 arm gets, and it keeps its meaning (`1`) exactly (G4, TR4). `project.ts` keeps reading `MODULE_MANIFEST_SCHEMA_VERSION`,
  so every new genesis and row write 2.
- `ModuleAuthoredPayloadSchema` becomes a `z.union([...])` of THREE `.strict().superRefine(refineModuleWindow)` arms:
  - v1 — the existing object, renamed `ModuleAuthoredPayloadV1Schema`, every key unchanged;
  - v2 `trust_sends` — the v1 keys, `manifest_schema_version: z.literal(2)` and `lead_route: z.literal('trust_sends')`;
  - v2 `partner_form` — `lead_route: z.literal('partner_form')`, `partner_form_url`, `slot_capacity: z.null()`, ⛔
    `lead_handoff_url`, ⛔ signing-key name.
  ⛔ `z.discriminatedUnion`: zod 3 refuses `.superRefine`-wrapped arms (G25), and the v1 arm has no `lead_route` key. The
  payload is never shown to a person, so a union's root-level issue is acceptable HERE.
- `parseModuleManifest` (the INPUT, whose issues reach the wizard by path — G25) is ⛔ a `z.union`. It first parses
  `lead_route` alone with `z.enum(MARKETPLACE_MODULE_LEAD_ROUTES)` (a missing / unknown value is one issue at path
  `['lead_route']`), then parses the whole input with THAT route's strict arm, so every other issue keeps its field path
  (`['slot_capacity']`, `['partner_form_url']`, …). It returns `ModuleManifest` (a discriminated TS union on `leadRoute`,
  replacing `ModuleManifestV1`). A test asserts the PATH of a pairing error (e.g. `partner_form` + `slot_capacity: 5` →
  `['slot_capacity']`).
- The fold (`state.ts`) and every reader treat a v1 genesis / row as `trust_sends`. ADR-0044 gets a dated line (QE17).

**QE3 — the `partner_form_url` rule** (`modulePartnerFormUrlSchema`, `filters.ts`). It is the lead URL rule with these
differences:
- a query IS allowed — one fixed query the partner supplied, `?` then RFC 3986 query characters (unreserved, sub-delims,
  `:`, `@` is still refused, `/`, `?`, `%HH`); an empty query (a bare `?`) is refused;
- a fragment is refused (raw `#` too);
- an explicit port is refused (the phone's browser opens it and nothing on the Trust's side checks it later — narrow side);
- canonical form (`raw === url.href`); ≤ 2048; https; ⛔ userinfo or `@`; ⛔ IP literal / localhost; ⛔ whitespace / control
  / backslash.
The Trust appends nothing to it, ever (I3).

**QE4 — the send guard (load-bearing).** One typed error, `ModuleLeadRouteRefusedError(moduleId, operation)` with code
`module.lead_route_partner_form`. It is thrown in five places:
- **(a) `submitModuleLead` / `checkModuleLeadAllowed`.** `MODULE_GUARD_COLUMNS` gains `lead_route`; `decideLead` refuses
  `partner_form_route` right AFTER `not_found` and BEFORE `replay` (no replay of a lead that can never exist — TR27).
  `checkModuleLeadAllowed` returns `{ ok: false, refusal: 'partner_form_route' }`.
- **(b) `projectModuleTransition`.** It refuses `module.lead_submitted` when `lockedRow.leadRoute === 'partner_form'`
  (`ModuleLockedRow` gains `leadRoute`) — a second line in the only writer.
- **(c) `sealLeadMemberFields`.** It gains a pool and `moduleId`
  (`sealLeadMemberFields(pool, encDeps, { pariwarId, moduleId, leadId, fields })`). The seal runs OUTSIDE any caller
  transaction by contract (G8), so it opens its OWN short read: `withPariwarScope(pool, pariwarId, …)` selecting the
  module's `lead_route`, which COMMITS before the first KMS call. A `partner_form` module refuses
  (`ModuleLeadRouteRefusedError`); a module not found throws `ModuleGenesisMissingError`; only then does it seal. ⛔ KMS
  call runs while that read's transaction is open, and ⛔ caller-supplied route is trusted. This amends `-483` QE18 step 1
  (the seal's inputs) BY NAME in the author-commit. ⛔ production caller, so the signature change costs only its tests
  (G8, TR28); 12.3 calls it as before, outside its transaction.
- **(d) `recordLeadHandoff`.** Inside its savepoint, before the consent checks, it reads `lead_route` for
  `(pariwar_id, module_id)` and refuses.
- **(e) the DB.** `marketplace_lead_handoffs_route_guard`, BEFORE INSERT: it reads
  `SELECT lead_route FROM marketplace_modules WHERE pariwar_id = NEW.pariwar_id AND module_id = NEW.module_id` and raises
  P0001 `'marketplace_lead_handoffs route rejected — …'` for `partner_form`. It runs as the inserter. The module row is
  visible to it for every inserter: for `twt_app` because the handoffs INSERT policy forces `NEW.pariwar_id` to equal the
  scope GUC, which the modules SELECT policy also keys on; a superuser or BYPASSRLS role sees every row. (⛔ the composite
  FK: FK checks bypass RLS and prove nothing about what the trigger's SELECT sees.) ⛔ row found (an unknown module) ⇒
  the trigger lets the INSERT go on, so the composite FK raises its usual 23503 — the existing error stays. This is the
  backstop that holds even if (a)–(d) regress.
  ⚠ It is a NEW function and trigger. ⛔ Replace `marketplace_lead_handoffs_guard` ([[project_append_only_guard_names_erasure_columns]]).

**QE5 — the sweep (amends `-483` QE13's tick and `-487`'s W14 pass by name).**
- **S3:** the claim CTE uses `COALESCE(split_part(m.lead_handoff_url, '/', 3), '')` in both the select and the filter (TR1),
  so a NULL-URL row is claimable in every tick.
- **S4:** `readLeadHandoffModule` returns `leadRoute`, and `leadHandoffUrl` / `signingKeySecretName` become `string | null`.
  A `partner_form` row is decided FIRST, before withdrawn / URL / S5 / S6: cancel `partner_form_route` at once (W9). It
  runs no secret, no DNS, no member read, no decrypt, no audit line and no request. It raises ONE alarm per row:
  `module_lead_handoff_route_refused` (ids only) — such a row is a bug upstream.
  ⚠ This departs from 12.5's I2 ("the member's side decides first") ON PURPOSE. I2 orders checks before a SEND, and a
  `partner_form` row is never sent; reading the member's side for it would only add a way to HOLD a row that must go.
  Record it in the author-commit as an amendment of QE13.
- **S2 waiting pass:** `listWaitingLeadHandoffs` returns `routePartnerForm`; the pass cancels such a row with
  `partner_form_route` BEFORE reading the member's side (same reasoning).
- **W15 (NEW): the visit purge.** It runs LAST in the tick, after the claim loop (S3 onward) ends, ⛔ inside S2: `-488`
  item 2 keeps "a throw in the lapse or the purge ends the tick", so a visits fault placed in S2 would stop the waiting pass
  and every `trust_sends` delivery for that tick — a fault in one route must ⛔ stop the other. The statement:
  `DELETE FROM marketplace_partner_form_visits WHERE opened_at < clock_timestamp() - interval '90 days'`, batch-bounded
  (`PARTNER_FORM_VISIT_PURGE_BATCH = 500`), in the W12 MATERIALIZED-CTE shape (`purgeLeadHandoffFields`:
  `WITH old AS MATERIALIZED (SELECT … LIMIT … FOR UPDATE SKIP LOCKED)`) — ⛔ an `IN (subquery LIMIT)` with SKIP LOCKED
  ([[project_in_subquery_limit_skip_locked_overclaim]]). It is cross-tenant BY DESIGN on the sweep's own pool (a DELIBERATE
  note, the W12 one; the jobs login needs its `twt_service` grant — QE1, G24). It runs even when the tick budget is spent
  (one bounded statement). A throw ends ONLY W15: ONE alarm `module_lead_handoff.visit_purge_failed:<error>` (an error name
  and a SQLSTATE only); the next tick retries. ⇒ a record goes at most about one minute after its 90th day. Its own pool and
  cron: ⛔ needed (TR23). Record the placement in the author-commit as part of the QE13 amendment.

**⭐ QE6 — ASK — R1 A: what the publish record carries.**
- **(A) recommended — the publisher chooses again.** The author proposes the route in the wizard; it is in the manifest.
  At publish the publisher must pick the route with ⛔ default (`PublishModuleRequest` gains a required `lead_route`). If it
  differs from the manifest's, the publish is refused 409 `module.lead_route_mismatch` BEFORE the audit wrapper (⛔ write,
  ⛔ audit line); the publisher can only Withdraw and have a corrected copy authored. The publication row stores
  `lead_route`, and the composite FK (QE1) makes "the publication's route = the module's route" a DATABASE fact.
  Cost: a publisher who disagrees cannot just flip it; it takes a withdraw + a new draft (the existing immutability cost,
  C10, and the routing note's Told 5), and because the publisher is never the author, that corrected copy is published by
  someone else. ⚠ `epics.md`'s 2026-11-22 note under 12.5b reads *"the publishing admin chooses each offer's route in the
  wizard"*; the wizard is the AUTHOR's (G14 — publisher ≠ author), so under (A) the publisher chooses at PUBLISH and the
  author proposes in the wizard. The author-commit names this variance of the epic note.
  Wiring: `recordModulePublication` (`marketplace/publication.ts`) gains a `leadRoute` input written to the new column; the
  publish handler's audit `hashShape` already spreads the request body (`...ticks`), so `lead_route` enters the audit
  hash with ⛔ further change; `moduleToneContentHash` is unchanged (the route is on the publication row, bound by the FK).
- (B) — the publisher ticks "I have checked how this offer works" (`z.literal(true)`) and the row stores only the tick.
  Cost: the choice is the author's in fact; the publish record holds a tick, not a choice — a weaker reading of "the
  admin who publishes … chooses".
- (C) — the route moves out of the manifest and is set at publish only. Cost: contradicts the AC (*"set at authoring and
  immutable (manifest schema v2)"*) and the route-pairing CHECK. A draft would have no route, so its URL fields could not be
  checked at authoring.

**⭐ QE7 — ASK — where the wizard asks the route.**
- **(A) recommended — first, in step (e).** Step (e) becomes "How it reaches the partner, and places". It opens with the
  route question (⛔ default); places are asked only for `trust_sends` (a `partner_form` offer sends `slot_capacity: null`).
  Step (f) shows the chosen route's fields: the partner's page URL for `partner_form`; the handoff URL + signing key for
  `trust_sends`. Cost: varies the AC's *"step (f) asks the route"* by one step letter — recorded in the author-commit.
- (B) — AC-literal: step (f) asks the route. If `partner_form` is chosen with fixed places in (e), step (f)'s reason is
  "An offer that uses the partner's own page has no places — choose 'No limit' in step (e)", with a link back. Cost: the
  author answers a question in (e) that (f) can make void.

**QE8 — the visit record (R2 C), shape and reach.** `marketplace_partner_form_visits`:
- columns: `visit_id uuid PK` (server-minted), `pariwar_id`, `module_id`, `member_id`,
  `opened_at timestamptz DEFAULT clock_timestamp()`;
- composite FK to modules; member FK (single column) plus a `memberExists(pariwar, member)` check in the writer (the
  12.5 `member_not_in_pariwar` reasoning);
- index `(opened_at)` for the purge, and `(pariwar_id, member_id)` for erasure / export;
- ONE row per opening; 90 days from that row's own `opened_at` (`-486`). ⛔ dedup, ⛔ "last opening";
- grants and policies: the QE1 table — `twt_app` SELECT, a column-narrowed INSERT and DELETE (for erasure), ⛔ UPDATE, with
  a `FOR DELETE` tenant policy beside select / insert; `twt_service` SELECT (the export) and DELETE (W15). ⚠ This is ⛔ the
  `marketplace_lead_handoffs` shape: that table is reached by an UPDATE scrub and grants ⛔ DELETE (G18).
- ⛔ staff read: no API route, no admin page, no `listPartnerFormVisits` export from the barrel that a route could call. The
  only readers are the erasure, the export and the purge.
- Erasure: `anonymizeMember` DELETEs the member's rows (a hard delete — the row holds nothing but the link, and nothing else
  references it) in ONE statement keyed on `(pariwar_id, member_id)`. It is the FIRST `.delete(` in `anonymize.ts`; say so
  in its comment. RTBF pins: 34 → 35 statements, 31 → 32 tables, and the "member with no claims" test's 30 → 31 (G18; TR13).
  ⚠ The spec's capture mock was built for `.update()` statements — check it also records a `.delete()` before trusting the
  counts (else extend the mock, ⛔ the pins). ⭐ The mock cannot see RLS: a live-DB spec erases a member with two visit rows
  (and a second member's control row) and asserts the DELETE's rowCount is 2 and the control row survives (AC8).
- Export: `profile.json` gains `partnerOfferVisits: [{ module_id, offer_name_en, offer_name_hi, opened_at }]`, with the
  matching `ProfileSection` contract field in the SAME change (G19) — the 6.36b `knownPeople` precedent.

**⭐ QE9 — ASK — the visit write keeps no permanent copy of the fact.** Recommended **(A)**:
- `openPartnerFormVisit` writes ⛔ audit line and ⛔ `events_log` event;
- the domain logs ⛔ member id with a module id;
- the per-offer counter it bumps (`went_to_partner`) carries ⛔ member.
Reason: the audit log and the event log are permanent (G20). Either line would hold *"member X opened offer Y"* forever,
so the 90-day removal R2 C ratified would be false. This is a deliberate exception to the house rule that a write is
audited, stated in the author-commit with its reason. (B): write an audit line naming the member and `module/<id>`. Cost:
R2 C's "removed after 90 days" becomes untrue for the audit copy. (C): an audit line under `partner_form_visit/<visit_id>`
without the module. Cost: it still keeps, forever, that a NAMED member opened SOME partner form on that day — the very fact
R2 asked about.

**⭐ QE10 — ASK — the visit record of a member whose death is reported.** Two ratified texts bear on it, and neither was
asked about this record: R2 C (*"removed after a number of days"* — the Panel set 90, with no exception) and `-423`
(*"once a member's death is reported, their personal data is ⛔ never erased"*). `-486` records it as ⛔ asked and says
`-423` is ⛔ read as reaching it. ⚠ `-484` Q4 A's *"removed on the same schedule whoever the member is"* is ⛔ a ground
here: the Panel was told Q3–Q6 concern only the sending route (Told 3, quoted above).
- **(A) recommended — the 90-day schedule, no special rule.** Ground: R2 C's own words, and `-486`'s own record of the
  reading — that `-423` governs ERASURE, ⛔ a retention schedule the Panel itself set later for this one record. Stated as a reading, in the author-commit. Cost: if the Panel reads `-423` as reaching every record of
  a dead member, this record is removed against it.
- (B) — delete the member's visit rows when a death report stands. Cost: an erasure triggered by a death report contradicts
  `-423` outright; the Panel's (`-424`'s §0).
- (C) — pause W15 for a member whose death report stands (keep the rows while it stands; the schedule resumes if the report
  is closed because the member is alive). Cost: the Trust then holds *"this named member opened this offer"* past 90 days,
  which R2 C's words do not allow; W15 gains a death-report read per row.
⭐ If BigDev judges (A)'s reading not the author's to make, the edge is routed from the template (R2 C vs `-423`), and
BigDev also picks which of (A) / (C) W15 runs until the Panel answers — each departs from one of the two texts.

**QE11 — the visit command's own refusals (R4 A's narrow side; C9's belt-and-braces).** `openPartnerFormVisit(client, {
pariwarId, moduleId, memberId })` returns `{ visitId, partnerFormUrl }` or throws `PartnerFormVisitRefusedError(reason)`.
Reasons, checked in this order:
- `not_found`;
- `not_partner_form` — a `trust_sends` offer has no page to open;
- `not_active`;
- `outside_window`;
- `member_not_in_pariwar`;
- `member_erased` (anonymized);
- `member_withdrawn`;
- `member_terminated`;
- `account_frozen` (`listAccountFrozenMemberIds` at the DB clock);
- `death_reported` (`isDeathReportStanding`).
Reuse 12.5's reads (`memberExists`, `getCurrentMemberState`, `getCurrentMemberModerationOverlay`,
`listAccountFrozenMemberIds`, `isDeathReportStanding`) by extracting the member-side half of `readLeadHandoffPredicates`
(`lead-handoff.ts`, P0–P5) into one shared reader — ⛔ copy it. Only P0, P2's `anonymized` state, P3, P4 and P5 are
shared; P1 (the lead's consent rows) and P2's ciphertext check stay lead-only. `readLeadHandoffPredicates` must keep its
order, its verdict words and its `unsound` cases exactly; the 12.5 tick tests are the regression check. Scope and eligibility stay
12.3's (12.1 exports no evaluator — C9; KB-1). On success, in ONE savepoint: INSERT the visit, UPSERT the
`went_to_partner` count, RETURN the stored URL unchanged. ⇒ **the URL is handed out only by a successful visit write.**

**⭐ QE12 — ASK — R3 B: how a partner's totals reach the Trust.**
- **(A) recommended — staff entry.** An admin with `module.manage` enters the partner's figures on the module detail page
  of a `partner_form` offer: a period (`period_start` / `period_end` dates), then one or more stages in order (a label the
  partner uses, e.g. "Started", "Entered OTP", "Finished", and a whole number). The rows are insert-only
  (`marketplace_partner_form_totals`: `totals_id`, `pariwar_id`, `module_id`, `period_start`, `period_end`, `stage_order`,
  `stage_label` ≤ 80 chars, `figure integer NULL`, `below_floor boolean`, `entered_by_actor_id`, `entered_at`,
  `audit_id`).
  - A figure below 5 is stored as `figure = NULL, below_floor = true` — the number itself is never stored. A CHECK says so:
    `(below_floor AND figure IS NULL) OR (NOT below_floor AND figure >= 5)`.
  - A correction is a new entry for the same period; the read shows the newest entry per period.
  - Audited (`module.partner_form_totals_recorded`, `withCompensatingAudit` at the route; it names no member).
  - ⛔ inbound partner route, so the 12.5 boundary fence is unchanged (G22). The figures are advisory and change nothing
    about any member (the K-5 rule).
- (B) — an inbound, signed partner endpoint. Cost: the first inbound partner path; it must pass `-483` QE15's fence and
  re-open its §0 edge 7; partner credentials and an ADR. Not needed while no partner exists.
- (C) — build nothing until a partner agreement carries totals (Row 55 (c)). Cost: `-486` "Built vs owed" names *"the
  totals intake with the floor of 5"* as 12.5b's — deferring it needs a dated line against that.

**⭐ QE13 — ASK — the Trust's own per-offer counts.** `marketplace_partner_form_counts`: `(pariwar_id, module_id, day date,
kind)` PK → `count bigint`; `day` is the IST date from the DB (`(clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date`).
`countPartnerFormEvent(client, { pariwarId, moduleId, kind })` UPSERTs `count + 1` and takes ⛔ member argument by type.
It refuses a module that is not `partner_form`. ⛔ audit line (anonymous counts).
- **(A) recommended — per offer, per IST day; shown with the floor.** The admin detail page shows each kind's total and a
  per-day list; any figure below 5 shows as "fewer than 5" (`PARTNER_FORM_FIGURE_FLOOR`), the same as the partner's totals.
  Cost: a slightly larger table; a small offer shows mostly "fewer than 5".
- (B) — all-time totals only, no day. Cost: no trend after a campaign.
- (C) — no floor on the Trust's own counts. Cost: R3 B's reason (*"A total for a very small offer can point at a person"*)
  applies to these numbers just as much.

**QE14 — the member copy (R5).** NEW namespace `marketplace` (`packages/i18n/locales/{en,hi}/marketplace.json`) with ONE
key, `partnerForm.notice`:
- en: `You are being directed to {{partner}}'s page, where {{partner}} may ask for your contact information.` — the Panel's
  sentence, verbatim, with `[partner]` → `{{partner}}` (the partner's display name in the member's language,
  `display_name_en` / `display_name_hi`).
- hi: drafted by the dev, then put through `docs/tone-review-checklist.md`; BigDev signs it off (Row 55 (b)'s "Hindi by tone
  review"). Record the review result in the Completion Notes.
- register the namespace in `packages/i18n/src/catalog.ts` — the en and hi static imports, the `catalogs` map entry for
  BOTH locales, and `KNOWN_NAMESPACES` — so `catalog-registration.test.ts` passes and `t()` does not throw (G17);
- add `packages/i18n/locales/{en,hi}/marketplace.json` to `microcopy.yaml` `scope.copy_globs` (G17). ⚠ If the gate flags
  the Panel's English, do NOT reword ratified text and do NOT allow-list it silently: stop and raise it with BigDev;
- a mobile hook `useMarketplaceT()` (`lib/marketplace-i18n.ts`, the `helpdesk-i18n.ts` shape).
- a REAL-`t()` test leg: render the key through the real `@twt/i18n` `t()` in BOTH locales with a partner name and assert
  the interpolation ([[feedback_stub_must_call_not_transcribe]]).
⛔ second sentence; ⛔ "The Trust does not send anything about you" (the Panel REPLACED the draft — `-486` R5). The
`trust_sends` card's wording is 12.3's (KB-3).

**QE15 — the opener.** `apps/mobile/lib/partner-form-link.ts`:
`export async function openPartnerForm(url: string): Promise<'opened' | 'failed'>` — `await Linking.openURL(url)` and
nothing else: ⛔ `canOpenURL`, ⛔ URL rewriting, ⛔ query appended, ⛔ `expo-web-browser`, ⛔ `react-native-webview`. A thrown
`openURL` returns `'failed'` (the caller shows an error; ⛔ retried by itself). Two tests:
- the argument `Linking.openURL` receives `===` the input;
- a static fence that reads this file's imports and refuses `expo-web-browser` / `react-native-webview` /
  `WebBrowser` anywhere in it.

**QE16 — contracts, API, admin.**
- `AuthorModuleRequest` gains `lead_route` and `partner_form_url` (nullable); `lead_handoff_url` and the secret name become
  nullable. The domain parse decides validity (422 `module.manifest_invalid`).
- `ModuleDetailResponse` gains `lead_route`, `partner_form_url` and `partner_form_figures` (null for `trust_sends`:
  `{ counts: { [kind]: { total: number | null, below_floor: boolean } }, days: […], partner_totals: […] }`); the two lead
  fields become nullable. `lead_count` stays (always 0 for `partner_form`; the page shows "Not used for this offer").
- `PublishModuleRequest` gains `lead_route` (QE6). NEW `RecordPartnerFormTotalsRequest` / route
  `POST /api/v1/p/:pariwarId/modules/:moduleId/partner-form-totals` (the existing marketplace route prefix, `routes.ts`;
  `module.manage`; Idempotency-Key as the author route). It refuses a `trust_sends` offer with 409
  `module.not_partner_form`.
- Admin: the wizard (QE7), the publish panel's route radio (QE6), and the detail page: the route, the partner's page URL,
  the figures with the floor, the totals form. In `derive.ts`, besides state / validation / request / prefill, add
  `lead_route` and `partner_form_url` to `FIELD_STEP` (the step that asks each) and `FIELD_LABEL` (their label keys), so a
  422 on either lands on its own step and names its field (G25). Admin copy avoids "report" / "receipt" / "invoice" everywhere, test ids and
  comments included — e.g. "Figures from the partner" (G21).
- ⚠ Contracts tests are outside tsc — every fixture that builds these DTOs breaks on a new required field
  ([[project_contracts_tests_outside_tsc]]).

**QE17 — records in docs.**
- `ADR-0044`: a dated line at D3 (v2 exists: `lead_route` + `partner_form_url`; v1 rows read as `trust_sends`) and at
  Consequences (FR-64's `target_url_or_form` is now `partner_form_url`).
- `ADR-0046`: a dated line — a `partner_form` offer never has a handoff row (the trigger, the commands); the sweep cancels
  one with `partner_form_route` and alarms.
- Architecture §3.7 already carries the 2026-11-21 annotation — ⛔ change.
⛔ new ADR.

**QE18 — what is NOT built (stated so it is not inferred).**
- The member shelf, the card, the C9 re-check route and the count emitters (12.3).
- Suppression (12.4).
- A trustee overruling a route (KB-7).
- Any staff read of visit records.
- Any inbound partner path.
- Member-by-member progress from a partner (R3 C was not chosen).
- Counters for `trust_sends` offers.

## Invariants (I)

- **I1 — No member reaches a `partner_form` offer from this story.** There is no member surface. `openPartnerFormVisit`,
  `countPartnerFormEvent` and `openPartnerForm` have no production caller; 12.3 is their first.
- **I2 — A `partner_form` offer can never pass a member on.** It never gets a `module.lead_submitted` event, a sealed
  envelope, a handoff row, a place or a delivery status. It is enforced in the five places of QE4, and the sweep cancels any
  row that slips through anyway.
- **I3 — The URL handed out is the stored `partner_form_url`, byte for byte.** Nothing is appended, prefixed, templated or
  rewritten anywhere: domain, API, app.
- **I4 — No member on any count or total.** `countPartnerFormEvent` takes no member argument. The partner's totals never
  hold a figure below 5. No figure below 5 is shown to anyone.
- **I5 — The visit record is real and short-lived.**
  - One row per opening, removed by W15 once `opened_at` is 90 days old.
  - Erasure deletes it; the export lists it.
  - No staff read exists.
  - No audit line, event or log line copies "member + offer" (QE9 (A)).
- **I6 — The opener is `Linking.openURL` only.** No embedded web view and no in-app browser tab.
- **I7 — v1 is untouched.** Every stored v1 row and genesis parses and folds as before and reads as `trust_sends`. The new
  columns are immutable (the 0193 trigger, unchanged).
- **I8 — The publication's route equals the module's** — a database fact (the composite FK), not a route's check alone.
- **I9 — No new RBAC key or role.** `module.manage` covers the totals entry; `PERMISSION_CATALOG_VERSION` stays 65.
- **I10 — No inbound partner path.** `scripts/partner-boundary-invariant` and its spec pass unchanged.

## Acceptance Criteria

1. **AC1 — route marker (manifest v2).**
   - **Given** a v2 manifest, **When** it is authored, **Then** the row and the genesis carry `lead_route` and
     `manifest_schema_version = 2`.
   - A `partner_form` row has `partner_form_url`, a NULL handoff URL, a NULL secret name and a NULL `slot_capacity`, and
     the CHECK refuses any other pairing (23514).
   - A `trust_sends` row is as before, with `partner_form_url` NULL.
   - Both new columns are refused on any UPDATE (P0001, the 0193 trigger).
2. **AC2 — v1 unchanged.**
   - **Given** a stored v1 genesis and row, **When** the module is read, folded or replayed, **Then** it parses
     unchanged, folds to the same state and reads as `trust_sends`. The test builds the genesis with the literal `1`
     (NOT from a constant), runs AFTER `MODULE_MANIFEST_SCHEMA_VERSION` is 2, and asserts the folded `slotsRemaining`
     equals the stored capacity (an unreadable genesis folds to null).
   - A v1 row cannot be `partner_form` (CHECK).
3. **AC3 — the URL rule.** `partner_form_url` accepts `https://partner.example/apply?offer=twt-bihar-lic`. It refuses each
   of: `http:`, a fragment, a bare `?`, userinfo or any `@`, an IP literal, `localhost`, an explicit port, whitespace or
   a control character, non-canonical form, characters outside RFC 3986, and more than 2048 characters — each with a
   typed `ModuleManifestInvalidError`.
4. **AC4 — the send guard.**
   - **Given** an active `partner_form` offer, **When** anything tries to pass a member on, **Then** each of these
     refuses with `ModuleLeadRouteRefusedError` and writes nothing: `checkModuleLeadAllowed` (refusal
     `partner_form_route`), `submitModuleLead`, `sealLeadMemberFields` (before any KMS call — the KMS fake records zero
     calls), `recordLeadHandoff`.
   - `sealLeadMemberFields` on a `trust_sends` module, called with NO transaction open (as 12.3 will), seals; its route
     read has committed before the KMS fake's first call (the fake records, at that call, that every client of the test's own
     pool is idle — `pool.totalCount === pool.idleCount`).
   - A raw `INSERT` into `marketplace_lead_handoffs` for that offer is refused P0001 by `marketplace_lead_handoffs_route_guard`.
   - The caller's transaction stays usable after each refusal (savepoints).
5. **AC5 — the sweep fails loudly.**
   - **Given** a `due` handoff row for a `partner_form` offer (planted by a fixture in a COMMITTED superuser transaction
     under `SET LOCAL session_replication_role = 'replica'`, reset to `'origin'` before commit — G26; NOT a `pg_temp` clone,
     which the tick's own connections never see, and NOT a "flip" of the immutable route), **When** the tick claims it,
     **Then** it is `cancelled:partner_form_route`, its fields are NULL, and ONE `module_lead_handoff_route_refused` alarm
     is raised.
   - No secret, DNS, member read, decrypt, audit line or request happens.
   - The waiting pass cancels such a row the same way.
   - A NULL-authority row is claimed even while another authority is `open`.
   - W15 runs after the claim loop; a W15 throw raises ONE `module_lead_handoff.visit_purge_failed:<error>` alarm and a
     `trust_sends` row due in the same tick is still delivered.
6. **AC6 — nothing about the member reaches the URL.** The URL returned by `openPartnerFormVisit` equals the stored
   `partner_form_url` byte for byte, and contains no member field, no `member_id`, no `visit_id` and no lead id. The
   mobile opener passes exactly its input to `Linking.openURL`. Both are proven by tests.
7. **AC7 — the opener.**
   - `openPartnerForm` calls `Linking.openURL` once, with the input; it returns `'failed'` when that throws.
   - The file imports neither `expo-web-browser` nor `react-native-webview` (fence test).
8. **AC8 — the visit record (R2 C).**
   - **Given** an active `partner_form` offer and a member who may see it, **When** `openPartnerFormVisit` runs,
     **Then** ONE visit row and ONE `went_to_partner` count increment are written in one savepoint, and the stored URL
     is returned.
   - Each QE11 reason refuses with `PartnerFormVisitRefusedError` and writes nothing.
   - W15 deletes a row whose `opened_at` is more than 90 days old and keeps one at 89 days (time from the DB), with the
     QE10 answer's death-report behaviour tested both ways.
   - `anonymizeMember` deletes the member's rows: on a live DB the DELETE's rowCount equals the member's rows and another
     member's control row survives (the FOR DELETE policy works under FORCE RLS); RTBF pins 35 / 32 and 31.
   - The export's `profile.json` lists them, and the jobs strict parse passes.
   - The migration grants match the QE1 table (a catalog test reads `information_schema.role_table_grants` /
     `column_privileges` for `twt_app` and `twt_service` on the three new tables).
   - No audit line or event names the visit (QE9 (A)).
9. **AC9 — per-offer counts.**
   - `countPartnerFormEvent` UPSERTs `(pariwar, module, IST day, kind)`; it takes no member argument.
   - It refuses a `trust_sends` offer.
   - The admin read shows any figure below 5 as "fewer than 5".
10. **AC10 — the partner's totals (R3 B, per QE12).**
    - A `module.manage` admin records a period's stages; a figure below 5 is stored as `below_floor = true` with a NULL
      figure (the CHECK refuses any other form).
    - The detail page shows the newest entry per period.
    - The route is audited and refuses a `trust_sends` offer (409).
    - The partner-boundary fence passes unchanged.
11. **AC11 — the wizard and the publish record (R1 A).**
    - The wizard asks the route with no default (QE7) and shows the chosen route's fields; the API refuses an invalid
      pairing with 422 whose issue path names the field (e.g. `['slot_capacity']`), and the wizard opens that field's
      step.
    - Publish requires the publisher's `lead_route`. A mismatch is 409 `module.lead_route_mismatch`, with no write and no
      audit line.
    - The publication row stores the route; the composite FK refuses a row whose route differs from the module's.
    - "Start a corrected copy" carries the route.
12. **AC12 — the member copy (R5).** `partnerForm.notice` exists in en (the Panel's sentence, verbatim but for
    `{{partner}}`) and hi (tone-reviewed, signed off by BigDev). The namespace is registered in `catalog.ts` (both
    locales + `KNOWN_NAMESPACES`) and `catalog-registration.test.ts` passes. The real-`t()` leg passes in both locales, the
    en/hi parity gate passes, and the microcopy gate scans both new files.
13. **AC13 — go-live stays gated.** Row 55 gets a dated line for (d) only once this story is `done`; (c) stays open.
    Once the `NNNN+1` migration is committed (NOT before — [[feedback_record_unattested_no_backfill]]), Row 26 and Row 55
    each get a dated line: the new tables' `twt_service` grants are in that migration (G24), and the jobs login itself is
    still Row 26's. Merge ≠ go-live.

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (no code before 0.3)**
  - [x] 0.1 `git fetch origin`; `git diff --name-only 4db122e0..origin/main -- packages apps scripts`; re-locate every G
        by function; re-grep the NUMBERS (decision ≥ `-489`, migrations ≥ `0216`/`0217`, ledger ≥ `2026-11-22f`) on every
        ref and worktree ([[feedback_check_story_branches_before_analysis]]).
  - [x] 0.2 BigDev answers QE6, QE7, QE9, QE10, QE12, QE13, and accepts or amends the rest as a set. For QE10, BigDev also
        says whether (A)'s reading of `-423` is the author's to make; if not, write the Panel note from the template
        (R2 C vs `-423`) before 0.3, and 0.3 records only the interim W15 behaviour BigDev picks.
  - [x] 0.3 Author-commit Decision ≥ `-489` ALONE, on this branch. It records QE1–QE18 as answered, and names what it
        amends or supersedes:
        - `-483` QE13's tick (S3 COALESCE, S4 route first, W15 after the claim loop with its own alarm) and `-487`'s W14
          pass;
        - `-483` QE18 step 1 — the seal's inputs and its own short route read (QE4 (c));
        - `-485` item 3's clause *"⛔ member↔offer link"* — SUPERSEDED in part, quoted in full: no PERMANENT link (no
          `module.lead_submitted`); the 90-day visit record exists by `-486` R2 C;
        - `-485` item 8's wizard step letter (if QE7 (A)), and the variance of `epics.md`'s 2026-11-22 note ("chooses …
          in the wizard" → chooses at publish, if QE6 (A));
        - QE9's audit exception, with its reason;
        - QE10's answer, stating (A)'s reading of `-423` AS a reading if (A) is chosen.
        It supersedes ⛔ ratified text. It quotes `-486` R1–R5 verbatim where it carries them out
        ([[feedback_supersede_never_reinterpret]]).
  - [x] 0.4 Records (a separate commit after 0.3):
        - `deferred-work.md` "Deferred from: story 12-5b-…" with KB-1 … KB-9;
        - a dated line on 12.5's K-12 ("Story 12.5b ready-for-dev; items (1)–(3) owned") — ⛔ "Closed by" before code
          ([[feedback_closure_language_precision]]);
        - a dated line on 12.1's *"An external-URL CTA (FR-64 `target_url_or_form`) is Not addressed"* (G27): owned by
          12.5b as `partner_form_url`, NOT built yet — "Closed by" only at `done`.
- [x] **Task 1 — migrations (AC1, AC2, AC4, AC8–AC11)** — QE1. Hand-author both files and their journal entries; run
      `db:migrate` on a FRESH container (BigDev runs it if the classifier refuses — [[project_admin_browser_pass_launcher]]).
      Mirror every new CHECK / enum in the drizzle schema files (`schema/marketplace_modules.ts` — including replacing its
      `check('marketplace_modules_manifest_schema_version_v1', …)` by the two new names, TR5 —
      `schema/marketplace_module_publications.ts`, `schema/marketplace_lead_handoffs.ts`, three NEW schema files) and in
      `LEAD_HANDOFF_DETAIL_PATTERN` (LOCKSTEP). Grants and policies exactly as the QE1 table, with the grants catalog test
      (AC8).
- [x] **Task 2 — manifest v2 in the domain (AC1–AC3)** — QE2, QE3: `schema/marketplace_modules.ts` (the constant → 2,
      plus `MODULE_MANIFEST_SCHEMA_VERSION_V1 = 1`), `filters.ts` (`modulePartnerFormUrlSchema`, the route-first input
      parse, `ModuleManifest`), `events.ts` (the v1 arm's version literal moved to `…_V1` — its ONLY edit — plus the two v2
      arms), `project.ts` (genesis writes v2 and the new columns), `state.ts` fold, `read.ts` types; tests for every AC3
      case, the issue paths (G25) and a stored-v1 replay built from the literal `1` (AC2).
- [x] **Task 3 — the send guard (AC4)** — QE4 (a)–(e): `errors.ts`, `commands.ts`, `project.ts`, `lead-handoff.ts`
      (the seal's pool + own short route read before KMS, the record check), the trigger's live-DB test; update the seal's
      existing tests (TR28).
- [x] **Task 4 — the sweep (AC5, AC8 purge)** — QE5: `lead-handoff.ts` (claim COALESCE, `readLeadHandoffModule`, the
      waiting list, the cancel word, `purgeExpiredPartnerFormVisits`), `apps/jobs/src/scheduler/module-lead-handoff.ts`
      (S4 first, the alarm, the waiting pass, W15 after the claim loop with its own alarm); the tick tests, with the bad
      row planted as AC5 says (G26).
- [x] **Task 5 — visits, counts, totals (AC6, AC8–AC10)** — QE8, QE11–QE13: NEW `marketplace/partner-form.ts` + barrel
      exports (⛔ any staff-read export); the shared member-side reader extracted from `readLeadHandoffPredicates` (QE11);
      `member/anonymize.ts` (import the visit SCHEMA directly — G18) + the THREE RTBF pins + the live-DB erasure spec;
      `data-export/assemble.ts` + `contracts/data-export` `ProfileSection` + the jobs export test.
- [x] **Task 6 — contracts + API (AC10, AC11)** — QE6, QE16: `packages/contracts/src/modules/dto.ts`, handlers (author,
      publish with the mismatch pre-check BEFORE `withCompensatingAudit`, detail with figures, the totals route),
      `recordModulePublication` (`leadRoute`), the API error map, the OpenAPI emit if present (TR25).
- [x] **Task 7 — admin (AC10, AC11)** — QE7, QE16: `derive.ts` (state, validation, request, prefill, `FIELD_STEP`,
      `FIELD_LABEL`), `ModuleWizard.tsx`, `ModuleDetailPage.tsx` (route, URL, figures, totals form, publish radio),
      `i18n-en.ts`; component tests; the microcopy gate.
- [x] **Task 8 — mobile (AC6, AC7, AC12)** — QE14, QE15: `lib/partner-form-link.ts`, `lib/marketplace-i18n.ts`, the two
      locale files, their registration in `packages/i18n/src/catalog.ts` (imports, `catalogs`, `KNOWN_NAMESPACES`), the two
      `microcopy.yaml` `copy_globs` lines, the real-`t()` leg, the import fence; the tone review of the Hindi and BigDev's
      sign-off.
- [x] **Task 9 — docs, gates, records (AC13)** — QE17 ADR dated lines; the Row 26 and Row 55 grant dated lines once the
      migration is committed.
  - Run the fences: the partner-boundary fence, the marketplace AST gate, the source fence in `apps/api` unit
    ([[project_source_fence_lives_in_api_unit_suite]]), the microcopy gate, i18n parity and `catalog-registration.test.ts`.
  - Run `ci:local` on a FRESH container named for this story (DB `twt_dev`). Every `git push` needs
    `DATABASE_URL=<story port>` ([[project_prepush_hook_inherits_5432]]).
  - Update `sprint-status.yaml` (safe prepend, YAML parsed after — [[project_sprint_status_safe_prepend]]).
  - Add the Row 55 (d) dated line only at `done`.

## Dev Notes

### Current state (what this story changes, what must be preserved)

- **`marketplace_modules` / `filters.ts` / `events.ts` / `project.ts` / `state.ts`** — the immutable v1 manifest primitive
  (12.1). **Changes:** v2 with `lead_route` + `partner_form_url`. **Preserve:** every v1 row and stream, the whole-row
  trigger, I10's lock order, the genesis savepoint, the stricter write-only display schemas (`-433`–`-437`).
- **`commands.ts`** — five commands + the pre-check. **Changes:** `lead_route` in the guard columns; one refusal first
  after `not_found`. **Preserve:** the QE7 order of every other refusal, the replay semantics, the savepoint per attempt,
  `MAX_LEAD_APPEND_ATTEMPTS`.
- **`lead-handoff.ts` + the sweep** — 12.5's transport, landed (PR #333), with `-487` / `-488`'s waiting pass.
  **Changes:** seal / record refuse; claim COALESCE; S4 route-first cancel; W15. **Preserve:** every other step and its
  order, the CAS shape, every alarm word, the tick budget, `-488`'s "a throw ends the pass, not the tick".
- **Admin wizard / publish / detail (12.2)** — **Changes:** the route question, the URL field per route, the publisher's
  radio, figures and totals. **Preserve:** focus management (PT8, PU1, PU3, RC2, RP30), the tone gate (publisher ≠ author),
  step-up on publish, the corrected-copy flow, every 12.2 refusal.
- **`anonymize.ts`, `assemble.ts`** — **Changes:** one table each. **Preserve:** the single-statement shapes, the direct
  schema import (⛔ barrel).

### Traps (TR)

- **TR1** — `split_part(NULL, …)` is NULL; `NOT (NULL = ANY('{a}'))` is NULL ⇒ the row is never claimed while any authority
  is open (G10). COALESCE in BOTH places; type `authority` as `string` with `''` for none.
- **TR2** — Do NOT backfill `lead_route` with an UPDATE in the migration: the 0193 trigger refuses it (P0001). Use the
  column DEFAULT, then DROP DEFAULT.
- **TR3** — Dropping NOT NULL changes drizzle types to `string | null`. Follow every reader: `readLeadHandoffModule`,
  `checkLeadUrl` in S4, `handlers.ts` detail, `derive.ts` prefill, `ModuleDetailPage`.
- **TR4** — The v1 genesis schema must keep ACCEPTING exactly what it accepts today: version `1`, the same keys, the same
  rules. ⚠ It is written `z.literal(MODULE_MANIFEST_SCHEMA_VERSION)` today (G4), so "leave it as it is" plus the bump to 2
  silently makes it `z.literal(2)` and no old stream folds. Point it at `MODULE_MANIFEST_SCHEMA_VERSION_V1`, nothing else.
  A tightened v1 arm stops old streams folding too (ADR-0044 RPD1's re-trigger). The v2 arms are new objects.
- **TR5** — Constraint swaps go by NAME (`DROP CONSTRAINT marketplace_modules_manifest_schema_version_v1`), and the drizzle
  `check(...)` names must match the SQL (`schema/marketplace_modules.ts` declares the `_v1` check today), or the next
  schema diff fights it.
- **TR6** — `LEAD_HANDOFF_DETAIL_PATTERN` ↔ the 0215 CHECK are LOCKSTEP. Replace the CHECK in the NEW migration; never edit
  0215. The pattern string is built with `sql.raw` in the schema file — keep the escaping identical.
- **TR7** — Sibling migration order: the journal `when` must exceed every sibling's, or drizzle skips a migration on a shared
  DB ([[project_sibling_migration_when_order_shared_db]]).
- **TR8** — Permanence defeats the 90 days: `audit_log`, `events_log`, pino request logs and alarm text must never pair a
  member id with a module id for a visit (QE9; KB-2).
- **TR9** — The microcopy gate fails "report" in admin code, test ids AND comments (G21). Reword; do not allow-list.
- **TR10** — Contracts tests are outside tsc; new required DTO fields break their fixtures silently until run.
- **TR11** — Hindi copy: Unicode escapes and some typed characters land raw on disk ([[project_unicode_escapes_written_raw]]).
  Scan the added lines for invisible characters (ZWJ / ZWNJ only where the word needs them).
- **TR12** — Export: a key in `assemble.ts` without its contract field breaks EVERY member's export at the jobs parse (G19).
- **TR13** — RTBF pins: `toHaveLength(34)` → 35, `size).toBe(31)` → 32, AND the "member with no claims" test's
  `toHaveLength(30)` → 31, each with the story's name in its comment chain. The counts are completeness checks — rewrite
  them to the new truth, never weaken them. They prove the statement was ISSUED, NOT that it removed anything: RLS is
  proven only by the live-DB erasure spec (AC8).
- **TR14** — Markdown closes JSDoc: `**cl.3**` contains `**/` ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR15** — Prettier is not enforced: hand-format; no `--write` ([[project_prettier_not_enforced]]).
- **TR16** — ESLint carve-out globs are cwd-relative per package ([[project_eslint_config_per_package_cwd]]).
- **TR17** — `schema/marketplace_modules.ts` imports marketplace types TYPE-ONLY; keep the new ones type-only
  ([[project_type_only_import_cycle_trap]]).
- **TR18** — Mobile must not import pg-touching `@twt/domain` ([[project_contracts_domain_bundle_boundary]]); the opener
  takes a plain string.
- **TR19** — `expo-web-browser` is in the app already (G16). An autocomplete import is the most likely regression — hence
  the fence test (QE15).
- **TR20** — An IST `day` from the DB, never `new Date()` in JS; tests read today's date from the DB
  ([[project_ist_vs_utc_test_date_window]]).
- **TR21** — Equal `now()` in one transaction: two increments or two visits in one test transaction tie on
  `now()`; use `clock_timestamp()` in the writers and tests that do not order by time ([[project_db_clock_ordering_tests_tie]]).
- **TR22** — A post-savepoint "nothing survived" assertion cannot fail; assert the error reason AND a control write
  ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).
- **TR23** — The purge rides the lead-handoff sweep's OWN pool (max 3, boot.ts). Do NOT add a cron on the shared jobs pool
  (max 2 starves — [[project_jobs_pool_two_connection_starvation]]).
- **TR24** — Fastify answers 400 to an empty JSON body; the admin client sends `{}` on bodyless POSTs
  ([[project_fastify_empty_json_body_400]]).
- **TR25** — If an OpenAPI emit changes, compare with yaml anchors resolved; renumbering shows hundreds of false deletions
  ([[project_openapi_yaml_anchor_renumbering]]).
- **TR26** — Planting a bad handoff row for the TICK: do NOT use `ALTER TABLE … DISABLE TRIGGER` on a shared table
  ([[project_test_only_ddl_use_pg_temp_clone]]), and NOT a `pg_temp` clone either — the tick runs on its own connections and
  never sees it (G26). Use a committed superuser fixture transaction with `SET LOCAL session_replication_role = 'replica'`
  (no DDL, session-local; it also skips FK triggers, so insert real parents), set back to `'origin'` before commit — the
  `attribution-code/_fixtures.ts` precedent. The trigger's OWN test needs no bypass: a plain INSERT for a `partner_form`
  module must raise P0001, beside a `trust_sends` control INSERT that succeeds.
- **TR27** — The route refusal goes BEFORE replay in `decideLead`. Placed after it, a forged "replay" path could return
  `{ replayed: true }` for a `partner_form` offer.
- **TR28** — The seal's signature changes (G8): update `lead-member-fields.test.ts` and `module-lead-handoff.test.ts`
  callers; do not keep an overload without the pool. Do NOT read the route on a caller's client or inside a caller's
  transaction: the seal is called with none open (`-483` QE18), and an unscoped read under FORCE RLS sees NO row.
- **TR31** — A `z.union` on the manifest INPUT hides which field failed (G25): the 422 arrives with path `[]` and the
  wizard shows the summary. Parse the route first, then its arm.
- **TR32** — An unregistered i18n namespace throws in `t()` at render, NOT at build (G17): add it to `catalog.ts` in all
  three places before writing the mobile hook.
- **TR33** — CI cannot catch a missing jobs-login grant (every live test runs as the superuser, G24). The grants catalog
  test (AC8) is the only check before production.
- **TR29** — New FK tables + TRUNCATE CASCADE in test teardown can deadlock on lock order
  ([[project_fk_truncate_cascade_deadlock]]); follow the marketplace test fixtures' existing teardown order.
- **TR30** — Known live-DB flakes (#18 announcement-activity fails on every 2nd `ci:local` per DB): push from a FRESH
  container ([[project_known_livedb_test_failures]]).

### Carried to sibling stories (KB) — record in `deferred-work.md` "Deferred from: story 12-5b-…" at Task 0.4

- **KB-1 → Story 12.3 — the `partner_form` card flow.**
  - The shelf list response must NOT carry `partner_form_url`. The link is handed out only by `openPartnerFormVisit`, which
    the visit route calls AFTER its own C9 re-check (scope, eligibility, member state, 12.4's suppression). That way the
    link is never prefetched or cached (12.4 (b), (d)).
  - The card shows no place count and no delivery status.
  - The member sees which way an offer works before going on (`-484` Q1 C option C): the R5 notice is shown before
    `openPartnerForm`.
- **KB-2 → Story 12.3 — the visit route's own logs.** The API request log for the visit route must not keep a member id
  with a module id beyond 90 days. Check the pino fields and the log sink's retention before shipping. Otherwise R2 C's
  removal is false in the logs (TR8).
- **KB-3 → Story 12.3 — the emitters and the other wording.**
  - `card_shown` / `card_opened` / `came_back` via `countPartnerFormEvent` ("came back" = the app returning to the
    foreground after an `'opened'`).
  - The `trust_sends` card's wording (`-484` Q3 A — the four details shown before agreeing).
- **KB-4 → Story 12.4 — suppression covers `partner_form`.** No card, no count and no link for a frozen or death-reported
  member. `openPartnerFormVisit` already refuses both (QE11), and 12.4 still owns the structural absence.
- **KB-5 → Story 12.6 — archive.** A `partner_form` offer has no places, so only `valid_until_reached` or `trustee_archived`
  can archive it; a slot-exhaustion archive never applies.
- **KB-6 → counsel / Row 55 / Row 54 (c) — the privacy policy and the visit record's basis.** The policy must describe
  the 90-day visit record before go-live, and its basis is counsel's (`-486` not covered). Add a dated line on Row 55 at
  Task 0.4.
- **KB-7 → ⛔ owner — a trustee overruling a publisher's route.** Not built; Withdraw is the existing path. ⭐ Trigger: the
  first time a trustee asks to change a published offer's route.
- **KB-8 → ⛔ owner — counts for `trust_sends` offers.** Not built (QE18). ⭐ Trigger: 12.3 or a partner asks for card
  figures on a sending offer.
- **KB-9 → K-13 (12.5) — unchanged.** Telling a partner after a withdrawal applies to `trust_sends` only. A `partner_form`
  offer has nothing to withdraw at the Trust.

### Testing standards

- Domain live-DB specs under `packages/domain/tests/integration/marketplace/` (the `_fixtures.ts` template, whose
  substitutions are asserted — extend it for v2 and route `partner_form`; and `_lead-handoff-fixtures.ts` for handoff
  rows, extended with the AC5 planting helper). Run on the story's OWN container (DB `twt_dev`).
- Pure specs beside them: the URL schema, the payload union and the fold.
- Jobs: `apps/jobs/tests/module-lead-handoff.test.ts` (tick), plus the export test against a live DB.
- API: the integration specs for author / publish / detail / totals, and the partner-boundary spec.
- Admin: vitest component tests. jsdom keeps focus on disabled buttons, so focus-fall legs need a browser
  ([[project_jsdom_disabled_button_keeps_focus]]).
- Mobile: vitest unit for the opener and the real-`t()` leg ([[project_mobile_vitest_and_expo_install_traps]]).
- Every refusal test asserts the reason AND that a control write succeeds afterwards (TR22).

### Project Structure Notes

- The domain stays in `packages/domain/src/marketplace/` (⛔ `packages/marketplace` — the 12.1 precedent). One new file
  (`partner-form.ts`); everything else is edits.
- Three new schema files under `packages/domain/src/schema/` (`marketplace_partner_form_visits.ts`, `…_counts.ts`,
  `…_totals.ts`), exported from the schema index.
- Mobile: `apps/mobile/lib/partner-form-link.ts`, `apps/mobile/lib/marketplace-i18n.ts`; ⛔ new screen (12.3's).
- ⛔ new package (the 2nd-consumer rule — [[feedback_no_premature_package]]).

### References

- `_bmad-output/planning-artifacts/epics.md` — Story 12.5b (AC + the 2026-11-22 dated note), 12.3 / 12.4 notes.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-21-k12-partner-form-route.md` (+ its 2026-11-22 addendum).
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-12-5b-partner-form-route.md` (RULED).
- `.decision-log.md` — `2026-11-22-486`, `2026-11-21-485`, `2026-11-21-484`, `2026-11-21-483`, `2026-11-22-487`, `2026-11-22-488`.
- `docs/launch-gate-inventory/inventory-roster.md` — Row 55 (and Row 54 for the sending route).
- `docs/adr/ADR-0044-module-manifest-schema-versioning.md` · `docs/adr/ADR-0046-partner-lead-handoff-transport.md`.
- `_bmad-output/implementation-artifacts/12-5-module-lead-handoff-transport-partners-as-downstream-consumers-invariant.md`
  (QE6 W table, QE7 P0–P5, QE13 tick, I2) · `12-2-admin-module-targeting-wizard.md` (I4, QE9) ·
  `12-1-module-manifest-schema-module-lifecycle-state-machine.md` (C8–C12).
- `deferred-work.md` — 12.5's K-5, K-12, K-13; 12.1's C8, C9, C10.
- `docs/tone-review-checklist.md`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 12.5b` on the story worktree, 2026-11-22.

### Debug Log References

- Story DB: Docker `twt-125b-pg` (:5455, DB `twt_dev`), fresh. The auto-mode classifier refused `pnpm db:migrate` against it; BigDev ran
  it (217 journal rows, `0217`'s `when` the max) — [[project_admin_browser_pass_launcher]]'s known refusal.
- Red proofs: the genesis writer without the route failed `publication.spec.ts` with 23502 on `lead_route` (⛔ default — AC1); the TR1
  leg (`AC5 / TR1: a NULL-authority row is claimed …`) FAILED with the claim's COALESCE reverted and passed with it restored.
- The waiting pass re-reads EVERY `due` row (`-488` (1)), so a planted `partner_form` row is cancelled there before the claim meets it;
  the S4 legs therefore fail the pass's page read (`-488` (2): its throw ends only the pass) so the CLAIM is what meets the row.

### Completion Notes List

- 2026-11-22 — Story created by `bmad-create-story 12.5b` (v1.0): Ultimate context engine analysis completed —
  comprehensive developer guide created. Six ASKs open (QE6, QE7, QE9, QE10, QE12, QE13); no code before Task 0.3.
- 2026-11-22 — Task 0.1: `git fetch origin`; `origin/main` is still `4db122e0`, so `git diff --name-only 4db122e0..origin/main
  -- packages apps scripts` is empty and every G holds as re-derived at v1.1. Numbers re-grepped on every ref and worktree:
  newest decision `-488`, migrations stop at `0215`, ledger letter `2026-11-22f` was this branch's.
- 2026-11-22 — Task 0.2: BigDev, verbatim: *"QE6 A, QE7 A, QE9 A, QE10 A, QE12 A, QE13 A"*; the other twelve by selection,
  "Accept as a set (Recommended)"; QE10's reading of `-423`, by selection, "My call, no Panel note (Recommended)". ⇒ ⛔ Panel
  note.
- 2026-11-22 — Task 0.3: Decision `2026-11-22-489` (author-commit) committed ALONE, `7b4f93db`. It amends `-483` QE13 and
  QE18 and `-487` item 3 by name, supersedes `-485` item 3's *"⛔ member↔offer link"* in part, varies `-485` item 8 and the
  epic note, and supersedes ⛔ ratified text.
- 2026-11-22 — Task 0.4: `deferred-work.md` "Deferred from: story 12-5b-…" (KB-1 … KB-9); dated lines on 12.5's K-12 and
  12.1's external-URL CTA item (⛔ "Closed by"); roster Row 55 dated line (⛔ leg moves; KB-6 recorded). The Row 26 / Row 55
  grant lines wait for the `NNNN+1` migration's commit (Task 9).
- 2026-11-22 — Task 0.1 re-check at dev start: `origin/main` still `4db122e0`; migrations `0216` / `0217` free on every ref and worktree
  (siblings stop at `0212`); journal `when` `1797998760000` / `1797998820000`, above every sibling's.
- 2026-11-22 — **Task 1 (QE1).** `0216_marketplace-module-lead-route.sql`: the enum, `lead_route` (DEFAULT then DROP DEFAULT — TR2, ⛔
  UPDATE), `partner_form_url`, the two lead columns nullable, the v1 CHECK replaced BY NAME by `…_manifest_schema_version` + `…_v1_is_
  trust_sends`, `…_route_columns`, the route unique, the publication `lead_route` + composite FK (the old FK kept beside it), the
  detail CHECK replaced with `cancelled:partner_form_route` (LOCKSTEP), and the NEW trigger `marketplace_lead_handoffs_route_guard`
  (⛔ `marketplace_lead_handoffs_guard` touched). `0217_marketplace-partner-form-figures.sql`: the three tables with FORCE RLS, per-command
  policies (the visits' FOR DELETE at birth), composite module FKs, and exactly the QE1 grants incl. `twt_service` SELECT + DELETE on
  visits. Drizzle mirrors (three new schema + three RLS files). Live specs: `partner-form-schema.spec.ts` (pairing CHECKs, ⛔ default,
  immutability, the trigger as superuser AND `twt_app` with a `trust_sends` control, unknown module → 23503, the grants catalog for
  `twt_app` + `twt_service` — TR33, FORCE RLS + policies, the FOR DELETE policy under FORCE, the floor CHECK); catalog pins moved in
  `projector-trigger`, `lead-handoff-schema`, the two RLS regression specs and `publication.spec.ts`.
- 2026-11-22 — **Task 2 (QE2, QE3).** `MODULE_MANIFEST_SCHEMA_VERSION = 2` + `…_V1 = 1`; the v1 genesis arm's ONLY edit is its literal's
  name (TR4); the payload is a `z.union` of v1 + two v2 route arms; `parseModuleManifest` parses `lead_route` FIRST, then that route's
  strict arm, so every issue keeps its field path (G25, TR31); `ModuleManifest` is a discriminated union. `modulePartnerFormUrlSchema`
  (QE3). Tests: `partner-form-manifest.test.ts` (paths, AC3's every case), `manifest-v2-payload.test.ts` (AC2 — a stored v1 genesis
  built from the literal `1`, folded with the constant at 2), `partner-form-authoring.spec.ts` (live: both routes through
  `authorModule`, and a stored v1 stream folding to its row).
- 2026-11-22 — **Task 3 (QE4).** `ModuleLeadRouteRefusedError` (code `module.lead_route_partner_form`); `decideLead` refuses
  `partner_form_route` after `not_found` and BEFORE the replay (TR27 — a planted lead event is NOT replayed); the projector refuses on
  `lockedRow.leadRoute`; `sealLeadMemberFields(pool, enc, { pariwarId, moduleId, leadId, fields })` reads the route in its OWN short
  `withPariwarScope` read that commits before KMS (at the KMS call every client of the test's pool is idle; a `partner_form` module →
  zero KMS calls); `recordLeadHandoff` checks first inside its savepoint. `partner-form-send-guard.spec.ts` + the two unit stubs.
- 2026-11-22 — **Task 4 (QE5).** Claim COALESCE in BOTH places (TR1); `readLeadHandoffModule` returns the route and nullable lead
  fields; S4 decides a `partner_form` row FIRST (cancel + ONE `module_lead_handoff_route_refused` alarm, ⛔ secret / DNS / member read /
  decrypt / audit / request); the waiting pass cancels such a row before the member's side; W15 `purgeExpiredPartnerFormVisits`
  (MATERIALIZED-CTE, batch 500, `< clock − 90 days`) runs LAST after the claim loop, its throw ends only W15 (ONE
  `visit_purge_failed:<error>` alarm). Live tick legs: AC5's planted row (`session_replication_role = replica`, committed — G26), the
  waiting-pass cancel, TR1, W15 at 90d+1m vs 89d for an ordinary AND a death-reported member (QE10 (A), ⛔ special rule), a W15 throw with
  a `trust_sends` row still delivered the same tick.
- 2026-11-22 — **Task 5 (QE8, QE11–QE13).** `partner-form.ts`: `openPartnerFormVisit` (QE11's order; the shared reader
  `readMemberStandingP2toP5` EXTRACTED from `readLeadHandoffPredicates` — its order, words and `unsound` cases unchanged, the 12.5 tick
  tests green; ONE visit + ONE `went_to_partner` in one savepoint; the stored URL returned byte for byte; ⛔ audit line, ⛔ event — QE9 (A)),
  `countPartnerFormEvent` (⛔ member by type), `recordPartnerFormTotals` (below 5 stored as `below_floor`), `listPartnerFormFigures` (every
  figure floored). ⛔ Staff-read export of visits. Erasure: ONE `.delete(` (the file's first) on `(pariwar_id, member_id)`; RTBF pins
  35 / 32 / 31 with the mock extended to record a `.delete()`; the live erasure spec shows the member's two rows gone and another
  member's control row kept. Export: `profile.json` `partnerOfferVisits` + `ProfileSection` in the same change; the jobs strict-parse leg.
- 2026-11-22 — **Task 6 (QE6, QE16).** DTOs (route on author / publish / detail / publication; the floored figures DTO REFUSES a figure
  below 5 — the serializer is a second floor; `RecordPartnerFormTotalsRequest`); the publish pre-check → 409 `module.lead_route_mismatch`
  BEFORE the wrapper (⛔ write, ⛔ audit line); `recordModulePublication({ leadRoute })`; the detail's figures (null for `trust_sends`);
  NEW `POST …/modules/:moduleId/partner-form-totals` (pre-checks → 422 / 404 / 409 `module.not_partner_form`, then audited
  `module.partner_form_totals_recorded`, Idempotency-Key replay). OpenAPI re-emitted — the semantic diff (anchors resolved) is additive
  only (TR25); determinism green. `marketplace-admin.spec.ts` 45/45 incl. the new legs.
- 2026-11-22 — **Task 7 (QE7 (A), QE16).** Wizard step (e) asks the route FIRST with ⛔ default, places only for `trust_sends`; step (f)
  the route's fields; the summary restates the route; `FIELD_STEP` / `FIELD_LABEL` carry `lead_route` (e) and `partner_form_url` (f); the
  publish panel's route radio (⛔ default; Publish disabled until chosen); the detail's route / page / "not used" lines, the figures
  table ("fewer than 5"), and the totals form. ⛔ "report" / "receipt" / "invoice" (a test walks the new keys); the microcopy gate green.
  Admin suite 2362/2362.
- 2026-11-22 — **Task 8 (QE14, QE15).** `partner-form-link.ts` (`Linking.openURL` and nothing else) with its argument-identity test and
  an import fence; `marketplace-i18n.ts`; the `marketplace` namespace registered in `catalog.ts` in all three places (the registration
  test green); `microcopy.yaml` scans both files; the real-`t()` leg in both locales. ⭐ **Hindi tone review:** BigDev, by selection,
  *"Accept as drafted (पेज)"* — recorded in `docs/tone-review-checklist.md`'s ad-hoc table (an owed row, then the acceptance row); Row
  55 (b)'s "Hindi by tone review" is discharged for this key. Invisible-character scan of the Hindi: none (TR11).
- 2026-11-22 — **Task 9 (QE17, AC13).** ADR-0044 dated lines at D3 and Consequences, ADR-0046 at §1 (+ changelog rows); ⛔ new ADR.
  Fences: partner-boundary (after the W15 move), marketplace AST gate, the `apps/api` unit source fences, microcopy, i18n parity and
  `catalog-registration.test.ts` — all green. **`ci:local` 41 / 41 in ONE run** on a FRESH container (`twt-125b-pg3`, :5457, DB `twt_dev`,
  migrated by `ci:local` itself), after two earlier runs that found real defects: run 1 — lint (unused destructure names) and the
  partner-boundary rule (c) finding; run 2 (fresh `twt-125b-pg2`) — `apps/jobs/tests/module-activation.test.ts` still authored a manifest
  without `lead_route` (fixed), and a mobile a11y spec in an untouched file (`wa-signup-step-render.test.ts`) that passed alone (80/80) —
  a parallel-load flake. Code committed `714b30a9` (BigDev: "Commit, then finish records"); AFTER it, roster Row 26 and Row 55 got their
  grant dated lines (the `0217` `twt_service` grants are in the migration; the jobs login itself stays Row 26's). ⛔ pushed. Row 55 (d)'s
  line waits for `done`.

⭐ **Engineering variances from the story text (each the narrow or the house-consistent side; none changes a ruling):**
1. The copy token is `{partner}` (single brace), ⛔ the story's `{{partner}}`: the house resolver's token is `/\{(\w+)\}/` — a doubled
   brace would render the partner's name inside stray braces (the 11a.2 `{{max}}` defect).
2. The export keys are camelCase (`partnerOfferVisits: [{ moduleId, offerNameEn, offerNameHi, openedAt }]`) like every other
   `profile.json` key, ⛔ QE8's snake_case spelling.
3. The partner totals: `totals_id` is the ENTRY's id and the PK is `(totals_id, stage_order)`; `stage_order` is bounded 1–20
   (`PARTNER_FORM_STAGES_MAX`, a new bound — QE12 named none).
4. `AuthorModuleRequest`'s three route-specific fields are `.nullable().optional()`; `lead_route` is required (⛔ default).
5. The publication's old `(pariwar_id, module_id)` FK is KEPT beside the new route FK (stricter; ⛔ dropped).
6. `countPartnerFormEvent` refuses an unknown or `trust_sends` module only — it does ⛔ check the offer is active (12.3's emitters call it
   where the card is shown).
7. W15's `purgeExpiredPartnerFormVisits` lives in `partner-form.ts`, ⛔ `lead-handoff.ts` as Task 4 listed: the partner-boundary fence's
   rule (c) holds the transport file to writing `marketplace_lead_handoffs` alone, and the first `ci:local` caught the DELETE there. The
   sweep still calls it LAST in its tick, on its own pool — only the file moved.
8. The lint and fence findings of the first `ci:local` (unused destructure names in three test files; the rule (c) finding above) were
   fixed; the run's only live-DB failure was that move landing mid-run.

⚠ **An observation for BigDev — ⛔ fixed here (QE13 (A) was answered as put):** the detail page shows each kind's ALL-DAYS total AND a
per-day list, each floored at 5. When the total is 5 or more and only one day is below the floor, the hidden day can be worked out
(total minus the days shown) — the small-number residual R3 B's floor was meant to close. If that matters, the narrow fixes are a
per-day list without a total, or a floor on the difference too; it is a QE13 amendment (author-commit), ⛔ a Panel question.

### File List

Migrations / schema / policies (domain):
- `packages/domain/migrations/0216_marketplace-module-lead-route.sql` (new)
- `packages/domain/migrations/0217_marketplace-partner-form-figures.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/marketplace_modules.ts`, `marketplace_module_publications.ts`, `marketplace_lead_handoffs.ts`, `index.ts`
- `packages/domain/src/schema/marketplace_partner_form_visits.ts`, `marketplace_partner_form_counts.ts`, `marketplace_partner_form_totals.ts` (new)
- `packages/domain/src/policies/marketplace-partner-form-visits-rls.ts`, `marketplace-partner-form-counts-rls.ts`, `marketplace-partner-form-totals-rls.ts` (new), `policies/index.ts`

Domain:
- `packages/domain/src/marketplace/partner-form.ts` (new)
- `packages/domain/src/marketplace/commands.ts`, `errors.ts`, `events.ts`, `filters.ts`, `index.ts`, `lead-handoff.ts`, `project.ts`, `publication.ts`, `state.ts`
- `packages/domain/src/member/anonymize.ts`, `packages/domain/src/data-export/assemble.ts`
- `packages/events/src/registry.ts`

Contracts / API / jobs:
- `packages/contracts/src/modules/dto.ts`, `enums.ts`, `index.ts`; `packages/contracts/src/data-export/data-export.ts`
- `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`
- `apps/api/src/modules/marketplace/errors.ts`, `handlers.ts`, `routes.ts`
- `apps/jobs/src/scheduler/module-lead-handoff.ts`

Admin / mobile / i18n:
- `apps/admin/src/api/client.ts`, `apps/admin/src/api/hooks.ts`
- `apps/admin/src/modules/marketplace/ModuleDetailPage.tsx`, `ModuleWizard.tsx`, `derive.ts`, `i18n-en.ts`
- `apps/mobile/lib/partner-form-link.ts`, `apps/mobile/lib/marketplace-i18n.ts` (new)
- `packages/i18n/locales/en/marketplace.json`, `packages/i18n/locales/hi/marketplace.json` (new); `packages/i18n/src/catalog.ts`
- `microcopy.yaml`

Tests:
- `packages/domain/tests/integration/marketplace/partner-form-schema.spec.ts`, `partner-form-authoring.spec.ts`, `partner-form-send-guard.spec.ts`, `partner-form-visit.spec.ts` (new)
- `packages/domain/tests/marketplace/partner-form-manifest.test.ts`, `manifest-v2-payload.test.ts` (new)
- `packages/domain/tests/integration/marketplace/_fixtures.ts`, `_lead-handoff-fixtures.ts`, `commands.spec.ts`, `lead-handoff-commands.spec.ts`, `lead-handoff-schema.spec.ts`, `projector-trigger.spec.ts`, `publication.spec.ts`
- `packages/domain/tests/integration/rls/marketplace-lead-handoffs-policy-regression.spec.ts`, `marketplace-module-publications-policy-regression.spec.ts`
- `packages/domain/tests/marketplace/commands-guards.test.ts`, `filters.test.ts`, `lead-retry.test.ts`; `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/contracts/tests/modules.test.ts`
- `apps/api/tests/integration/marketplace-admin.spec.ts`
- `apps/jobs/tests/module-lead-handoff.test.ts`, `apps/jobs/tests/data-export.test.ts`
- `apps/admin/tests/module-partner-form.test.tsx` (new); `marketplace-derive.test.ts`, `module-detail.test.tsx`, `module-wizard.test.tsx`, `modules-route.test.tsx`
- `apps/mobile/tests/unit/partner-form-link.test.ts`, `marketplace-notice-copy.test.ts` (new)

Docs / records:
- `docs/adr/ADR-0044-module-manifest-schema-versioning.md`, `docs/adr/ADR-0046-partner-lead-handoff-transport.md`
- `docs/tone-review-checklist.md`
- `_bmad-output/implementation-artifacts/12-5b-partner-own-form-route.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-22 | 1.0 | Created at pin `4db122e0` on `story/12-5b-partner-own-form-route`; row backlog → ready-for-dev. |
| 2026-11-22 | 1.2 | Task 0 complete: answers recorded, Decision `-489` (`7b4f93db`), the Task 0.4 records; status header and Completion Notes updated. ⛔ code. |
| 2026-11-22 | 1.3 | `bmad-dev-story 12.5b` → **review**: Tasks 1–9 done; code `714b30a9`; ci:local 41/41 on a fresh container; Row 26 / Row 55 grant lines after the commit. Tasks 1–8 built and tested (migrations `0216` / `0217`; manifest v2; the send guard in five places; the sweep's route cancel + W15; visits / counts / totals; contracts + API + OpenAPI; admin wizard / publish / detail; mobile opener + the `marketplace` namespace, Hindi accepted by BigDev); Task 9's ADR dated lines; engineering variances and one observation recorded in the Completion Notes. |
| 2026-11-22 | 1.1 | Validated at the same pin (`origin/main` unmoved; numbers re-grepped). G4, G8, G17, G18 extended; G24–G27 added. QE1 grants + policies table (a FOR DELETE policy for erasure; `twt_service` for W15 and the export); QE2 v1 arm pointed at `…_V1`, route-first input parse; QE4 (c) seal's own short read before KMS (amends `-483` QE18); QE4 (e) visibility reason + unknown-module behaviour; QE5 W15 after the claim loop with its own alarm; QE6 wiring + the epic note's variance; QE8 erasure / RTBF pins (three); QE10 re-grounded (Told 3), option (C) added, ⭐ ASK; QE11 names `readLeadHandoffPredicates`; QE14 catalog registration + microcopy scope; QE16 `FIELD_STEP` / `FIELD_LABEL`; `-485` item 3 superseded in part at Task 0.3; the 12.1 CTA item's dated line at Task 0.4; ACs 2, 4, 5, 8, 11, 12, 13 and Tasks 0–9 to match; TR4, TR5, TR13, TR26, TR28 rewritten; TR31–TR33 added. |
