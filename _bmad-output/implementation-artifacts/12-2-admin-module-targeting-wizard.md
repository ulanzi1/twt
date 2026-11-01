---
baseline_commit: 36b489c9
---

<!--
PINNED: `36b489c9` = `origin/main` (2026-11-01l, after `git fetch origin`; RE-PINNED at v1.3 — the branch was REBASED
from `3d6b46c5` across 38 commits: Story 11b.5a landed, PR #319). The story lives on branch
`story/12-2-admin-module-targeting-wizard` in its OWN worktree
(`.claude/worktrees/12-2-admin-module-targeting-wizard`), created from `origin/main`; the branch carries only story /
ledger commits (after the rebase: `eae4418d` = v1.1, `de904ad9` = v1.2; v1.3 follows). Every `apps/` / `packages/` /
`scripts/` claim below was traced on 2026-11-01 by four read-only researchers, then checked THREE times by three
read-only verifiers (facts; DB / transaction feasibility; coverage + governance coherence) — v1.1, v1.2 and v1.3 apply
every finding. The v1.3 pass re-traced every G fact at `36b489c9`: the only relied-on file 11b.5a changed is
`memorial/handlers.ts` (kinship additions), and its COMMIT-inside-`mutate` placement is unchanged. Perishable —
re-check at Task 0.1.
Re-locate by FUNCTION, never by line.

STATUS: ready-for-dev (2026-11-01 — v1.4). ⭐ **Task 0 runs FIRST in `bmad-dev-story`: the build decisions QE1–QE22
carry FIVE real asks (QE3, QE6, QE7, QE9, QE17); BigDev answers them at Task 0.2 and the author-commit lands ALONE at
Task 0.3 BEFORE any code** ([[feedback_governance_commits_precede_implementation]]). If an ASK is answered with a
non-recommended option, Task 0.3 rewrites the dependent ACs / Tasks / Invariants first (the map is in Task 0.3).
⭐ **v1.4 (2026-11-01): the five ASKs are ANSWERED — all AS RECOMMENDED — and QE16 is AMENDED by BigDev (strict
base64url cursor validation), both recorded verbatim in Task 0.2.** The Task 0.3 rewrite map is NOT triggered. Still
owed before code: BigDev's one-line acceptance of the other sixteen recommendations (QE1, QE2, QE4, QE5, QE8, QE10–QE15,
QE18–QE22) at Task 0.2, then the author-commit ALONE (Task 0.3) and the records (Task 0.4).

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (used ONLY in this header comment, the rulings and §0 tables,
the G / QE prose and historical Change Log rows) · ⭐ = action / emphasis · ⚠ = hazard. ⭐ In the Names table, Policy meaning, ACs, Invariants,
Tasks, Dev Notes and Traps, negations are written in PLAIN WORDS ("No …", "Do NOT …", "is NOT …"), so a skim cannot
invert them — those sections carry no `⛔`, EXCEPT Task 2.3, whose `⛔` are all VERBATIM quotes of source comments.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. They are
newest-first files, so cite the decision id + clause, the item heading, or the row key. Line numbers into other files
are perishable hints.

NUMBERS — read 2026-11-01 across every ref and every worktree (incl. uncommitted files). Rule (`-366` decision 6): "the
number belongs to the first COMMIT". (`-415`'s merge-order numbering was a recorded departure "for migration `0188` and
Story 6.32 only" — it is NOT a standing rule; a merge-order departure needs its own recorded departure.)
- Decisions: `main` stops at `-432` (11b.5a's `-431` / `-432` landed with PR #319); `-433` is free on every ref but
  NAMED by sibling plans (14-3 and 6-22 — committed; 13-2 only "if one becomes necessary"; 6-39 as "≥ `-432`", which
  now resolves to `-433`) ⇒ this story takes **≥ `-433`** and re-greps at the commit that takes it.
- Migrations: `main` highest `0194_memorial-kinship` (journal idx 194, `when` 1796355600039 — the highest `when` on
  every ref; landed with 11b.5a). Nothing higher is committed on any ref, and no worktree holds an untracked migration.
  Siblings reserve in prose: 14-3 `<MIG>`, 6-22 `0195`, 13-2 `NNNN`, 6-39 THREE (now `0195`–`0197`) ⇒ this story takes
  **≥ `0195`** under `-366` decision 6 (the first COMMIT takes the number) and re-greps at the commit; the `when` must
  exceed 1796355600039 AND every sibling's ([[project_sibling_migration_when_order_shared_db]]). The file name below
  uses `NNNN`.
- ADRs: highest `ADR-0044`. This story writes NO new ADR (QE20); it records a partial amendment of ADR-0044 (QE20).
- RBAC: `PERMISSION_CATALOG_VERSION = 56`, 74 keys, 13 role bundles on every ref. ⚠ **v57 is CONTESTED by THREE**:
  14-3 (`breach.manage`, +1 key), 6-39 (`claim.check_membership`, +1), 6-22 (`claim.flag_fraud` +
  `claim.record_fraud_finding`, +2) ⇒ whichever COMMITS/LANDS first takes 57; read the version AND the key count LIVE
  at Task 0.1 and at the commit (the `-421` QE6 / 6.19b "catalog arithmetic, read LIVE" practice).
- Ledger: top of BOTH ledgers on `main` = `2026-11-01l` (11b.5a took `h`, `j`, `k`, `l`). Committed elsewhere: `b`
  (6-22); `c` (13-2, 14-3); `d` (13-2, 6-22); `e` (13-2, 14-3); `f` (6-22); `g` (13-2 `e6758a66`, 01:22:20 — BEFORE
  v1.2's relabel at 01:25:18, so v1.2's `g` collided the moment it was taken); `i` (13-2) ⇒ this story's entries are
  **`2026-11-01m`** (relabelled `c` → `g` in v1.2, `g` → `m` in v1.3) and **`2026-11-01n`** (v1.4, Task 0.2 answers);
  re-grep and relabel again at landing if needed.
- Roster: highest Row 45 (14-3 and 6-39 both plan 46). This story adds NO row (QE19); it appends a dated note to Row 26
  (QE7 (A) only; QE19, Task 0.4).
- ⚠ 6-39's own NUMBERS block is stale (it names `-432` / `0194` as free) — read every sibling's reservation as RELATIVE.

⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each.

LETTERS: G = found facts · QE = build decisions (PROPOSED — answered at Task 0.2) · I = invariants · TR = traps ·
C = carried (inherited from 12.1, or carried onward from here).
-->

# Story 12.2: Admin Module-Targeting Wizard `[SURFACE]`

Status: ready-for-dev

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

This is the **first production caller** of the Story 12.1 module primitive. It gives a Pariwar admin an admin-console
wizard that authors a partner offer ("module") as an immutable `draft`, and a **publish** step in which a **second**
admin — never the author — signs off the copy (the Story 2.2 tone-review gate), confirms the partner agreement, proves a
fresh step-up OTP, and either **activates** the module (its start date has come) or **schedules** it (its start date is
in the future). It adds the per-Pariwar partner registry the manifest has pointed at since 12.1 (`partner_id` with no
table), a scope picker fed by the Pariwar's published geo tree (C11), a "withdraw" action (archive `trustee_archived`),
the permission key, the routes, the contracts, the audit pairing, and — if QE7 (A) is chosen — the 5-minute sweep that
turns a `scheduled` module `active` at its start time (C2 (b)). **Nothing reaches a member from 12.2** (I8): there is
still no shelf (12.3), no lead route (12.3) and no webhook (12.5).

## ⭐ Names at a glance

| Thing | Name |
|---|---|
| Permission key (NEW) | `module.manage` — `pariwar` dimension; `pariwar_admin` (+ `super_admin` automatically) |
| Step-up context (NEW) | `MODULE_PUBLISH_STEP_UP_CONTEXT = 'module_publish'` (`packages/contracts/src/modules/`) |
| Tables (NEW) | `marketplace_partners` / `marketplacePartners`; `marketplace_module_publications` / `marketplaceModulePublications` |
| Constraints on `marketplace_modules` (NEW; NOT a column) | `marketplace_modules_pariwar_module_unique (pariwar_id, module_id)`; `marketplace_modules_partner_fk`; index `marketplace_modules_scheduled_valid_from_idx` (QE7 (A)) |
| Migration | `packages/domain/migrations/NNNN_marketplace-partners-and-publications.sql` (≥ `0195`, MERGE order — re-grep) |
| Domain (additive, `packages/domain/src/marketplace/`) | `partners.ts`, `publication.ts`, `scope-options.ts`, `activation-sweep.ts` (SELECT + classify only); `read.ts` += NEW `pageModulesForPariwar` (cursor — `listModulesForPariwar` is UNCHANGED), `getModuleAuthorActorId`, `countModuleLeads`; `filters.ts` += WRITE-ONLY display-text schemas (QE12); `errors.ts` += the five 12.2 refusal classes (QE18) |
| API module | `apps/api/src/modules/marketplace/{index,routes,handlers,errors}.ts` → `registerMarketplaceModule(app, deps)` |
| Route base | `/api/v1/p/:pariwarId/modules` (the reserved path in `packages/contracts/src/modules/README.md`) |
| Contracts | `packages/contracts/src/modules/{enums,dto,index}.ts`, re-exported from `packages/contracts/src/index.ts` |
| Job (QE7 (A)) | `apps/jobs/src/scheduler/module-activation.ts` (`runModuleActivationTick`, `registerModuleActivationCron`) · `QUEUE_NAMES.MODULE_ACTIVATION = 'module.activation'` |
| Admin UI | `apps/admin/src/modules/marketplace/` · routes `/p/$pariwarId/modules`, `/p/$pariwarId/modules/new`, `/p/$pariwarId/modules/$moduleId`; fetchers in the CENTRAL `apps/admin/src/api/{client,hooks}.ts` |
| Audit actions | `module.authored`, `module.scheduled`, `module.activated`, `module.archived` (the event-type strings — 12.1 QE3), `module_partner.created`; resource locators `module/<id>` (also the tone sign-off's locator), `module_partner/<id>` |
| Decision | ≥ `2026-11-01-433` (re-grep) — author-commit of QE1–QE22 |

## Story

As a **Pariwar admin or trustee authoring a partner module**,
I want **a wizard that walks me through eligibility + scope + validity + slot capacity definition + partner integration
setup**,
so that **module creation is structured + scope-respecting + audit-logged.**

## 📜 Policy meaning (AI-10-1)

**This story introduces and changes NO predicate that gates a member's access to a benefit.** One line: *no member can
see, register for or be refused anything because of 12.2* — a module is NOT a benefit the Trust owes (12.1 Policy
meaning), and the shelf / lead route that would evaluate one are 12.3's.

What 12.2 DOES decide is **who may author and publish an offer, and what audiences can be written down** — authoring
rules, NOT member predicates:
- only a Pariwar-wide admin may author or publish (QE2);
- the publisher is never the author (Story 2.2);
- a `state` audience needs a published geo tree with states; every audience value is one of the Pariwar's own recorded
  places (C11, QE5).

⭐ The wizard **restates** meanings ALREADY FIXED by 12.1 to the admin in plain words — it does NOT change them. These are
the EXACT strings (AC11 Summary + step (c); Task 8.2's string list; pinned through the real `t()` in
`marketplace-derive.test.ts`):
- *"Offered to: every member of the Pariwar"* (`members-all`); *"Only members whose state is one of: …"*; *"Only members
  whose district is one of: …"*;
- *"No status restriction — every member in the audience"*; *"When the offer shelf opens, it will also refuse members
  who have left the Pariwar or whose data was erased."* (12.1 `-429` A4 + C9 — 12.3's check, NOT 12.2's);
- *"Members with no recorded workplace district are not reached by a state or district audience."* (the 1.19 seam: a
  member with no posting row is in no audience, fail-closed);
- *"An audience that matches no member reaches nobody."*

⭐ **One REACH consequence 12.2 itself adds (stated, not a member predicate):** because QE5 accepts only values equal to a
recorded place, a member whose newest posting carries a district spelling that is NOT a tree node / NOT a listed
workplace district (e.g. a `retired` spelling) can be reached by NO district offer — 12.1's grammar would accept that
spelling; 12.2's route refuses it (there was no authoring surface before 12.2). The no-district sentence covers only
members with NO posting, so the wizard says this one separately (AC11 step (c)): *"Members whose recorded workplace
district is not one of the places listed here are not reached by a district audience."* Carried to 12.3 (the shelf may
report it, alongside QE5's orphaned-value item).

⭐ **A second REACH fact 12.2 must SAY (pre-existing — NOT 12.2's predicate):** four of the seven eligibility statuses —
`active`, `pending-valid`, `active-in-grace`, `lapsed-unpaid` — have NO member today, because nothing in production
emits `member.lock_in_expired` (G18). An "Only these statuses" offer naming only those reaches nobody until that
producer lands; the wizard says so at step (b) (AC11). Carried to 12.3 (re-trigger: row `3-14-lock-in-expiry-producer`
lands).

**Niyamavali check:** not re-run — there is no predicate to check. 12.1's grep (2026-10-31, both languages) found the
Niyamavali SILENT on partners, modules and leads; `niyamavali.md` and `niyamavali.hi.md` are UNCHANGED since 2026-08-16
(before that grep), so the SILENT result carries; nothing in 12.2 engages it. The trust-deed "disclosed" proviso is
handled under QE6.

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Verbatim | Status |
|---|---|---|
| epics.md Story 12.2 AC | "(a) partner identification + module name/description (Hindi + English per Story 2.1); (b) eligibility filter authoring with structured rule expression preview; (c) scope filter (national/state/district/role/cohort); (d) validity window (valid_from/until); (e) slot capacity; (f) partner integration setup (lead_handoff_url + signing key from Secret Manager — Story 1.5); (g) review + tone-review sign-off per Story 2.2; (h) publish" · "scope is RBAC-enforced — admins can only author modules within their scope" · "publish requires step-up OTP per Story 5.9; emits `module.activated` event" | epic text |
| PRD FR-64 | "A module is described by a manifest: `{module_id, title, description, eligibility_filter, scope_filter, valid_from, valid_until, slot_capacity?, target_url_or_form, partner_id, commission_terms (private)}`." | PRD |
| PRD FR-66 | "Admin selects: which Pariwars (cross-Pariwar in v2), which scopes, which member filters (state, role, cohort), validity window, slot capacity, CTA destination, commission terms." | PRD |
| PRD §4.9 | "Commission revenue funds operations — teacher's annual cost stays at ₹110." | PRD |
| PRD OQ-4 | "**OQ-4: First partner deal terms** (HDFC home loan, LIC term plan, health-camp pilot). Commission %, lead/conversion tracking, exclusivity. *Owner:* Trustee Panel + Partner contacts. *Blocks:* SM-6 viability." | OPEN |
| PRD FR-74 / l.205 | "**Never public, never visible to other members:** trust account ledger, partner commission rates, internal operational expenses, …" · "Trust ledger, partner commissions, operational spend **never** public." | PRD |
| Draft trust deed Clause 7.2(i) (`docs/legal/trust-deed.md`, 2026-07-21) | "To collaborate with, or receive commissions or fees from, partners offering products or services to members, provided such arrangements are disclosed, are consistent with the Trust's charitable character, and do not compromise the interests of members;" | ⚠ DRAFT — "NOT YET EXECUTED" |
| Draft trust deed Clause 20(i) (a Trustees' power; same file) | "(i) enter into partner and commercial arrangements consistent with Clause 7.2(i);" | ⚠ DRAFT — "NOT YET EXECUTED" |
| LATER objects draft ¶B.5 (`docs/legal/trust-deed-objects-v4.md`) | "**B.5 — Commercial receipts.** The Trust shall maintain separate books of account in respect of any business incidental to the attainment of its objects. …" | ⚠ "working draft for counsel" — it governs commission RECEIPTS (QE6 (B)) |
| LATER objects draft, Object 10 (`docs/legal/trust-deed-objects-v4.md`, 2026-08-06) | "Institutional Partnerships, Collaboration and Ancillary Revenue" — "To levy and receive, in furtherance of and incidental to the objects of the Trust, administrative grants, service charges, facilitation or administrative fees (*Vyawastha Shulk*), licensing income, royalties, consultancy income, …" — ⚠ carries NO "disclosed" proviso; its ¶B.4 discloses only trustee interests | ⚠ "working draft for counsel, not legal advice"; WHICH draft governs is recorded nowhere in the decision log |
| Decision `2026-10-31-427` QE5 | "**`commission_terms` is DEFERRED to 12.2**, which chooses an admin-only home: it is "never public" (PRD), and its shape is OQ-4, still open." | author-commit (QE6 (A)/(B) amends it) |
| Decision `2026-10-30-422` Q1 A (Trustee-ratified) | "A PARIWAR ADMIN APPROVES FOR THE STATE TRUSTEE, MAY APPROVE THEIR OWN PROPOSAL, AND ONLY THE SUPER ADMIN MAKES A VERSION LIVE" | ratified — a CONTRASTING precedent (QE9) |
| architecture §3.7 | "lead contracts are per-Pariwar (TWT-Bihar's HDFC contract ≠ future Rail Parivar's HDFC contract); contract storage scoped by `pariwar_id`." · "**Partner contract evolution:** versioned per-partner; partner contract changes do not cascade to other partners." | architecture (the second → 12.5, carried) |
| UX "Module Shelf Partner Brand Integration" | "partner colors are NOT applied to card backgrounds, CTAs, or surrounding chrome." · "Owner: BigDev + Module Marketplace partnerships. Gate: every partner agreement before module activation." | UX (C5; the activation gate → QE9) |
| Decision `2026-08-13-103` D8 | "⛔ **Story 12.2 is not the owner** either — it *consumes* a role/cohort filter but does not **own** the attribute." Re-trigger: "*the first surface that must target members by `role` or `cohort`*". | author-commit (NOT Trustee-ratified — its Status line is "Author-committed", ratifying trustees "n/a") |
| Decision `2026-10-31-429` | "**`-103` D8** names ⛔ story. Its re-trigger is a CONDITION … 12.2 MAY be that surface." · "carried to 12.2 with `commission_terms` and routed if 12.2 cannot reconcile them (§0: what the Trust discloses)." | author-commit (QE6 amends the second) |
| Decision `2026-09-08-210` cl.2 (Trustee-ratified) | NOT delegated: "⛔ anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key · … · ⛔ any status whose meaning reaches a **member**." | ⇒ the new key is recorded in this story's author-commit, as `-421` QE6 did for 6.33's three keys |
| `docs/tone-review-checklist.md` | "each surface uses its own resource-specific review key, added by the story that ships that surface. The gate enforces only two invariants at publish time: **(a) a sign-off is present** and **(b) `reviewedBy ≠ authoredBy`**." | ADR-0019 (ratified) — variance in QE2 |
| `banners/write.ts` `publish` header | "⚠ KNOWN, PO-RATIFIED CONSEQUENCE: … a SINGLE-ADMIN Pariwar cannot publish a banner … the identical consequence Story 10.5's review recorded and the PO deferred on 2026-07-30 … do NOT "fix" it by weakening the gate or minting a second role grant." | PO-deferred precedent (QE9) |

### §0 — whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` §0, per edge)

| # | Edge | Verdict |
|---|---|---|
| 1 | Routes, tables, names, job cadence, UI | **Yours** — "the code should do X" with no change to what a person sees or is owed. |
| 2 | The new permission key `module.manage` | **Yours, recorded** — `-210` cl.2 puts a key OUTSIDE the delegated enum-mint class, so it is ⛔ a silent mint; it is recorded in this story's author-commit with its holder set, as `-421` QE6 recorded 6.33's keys. ⛔ new role. |
| 3 | Single-admin Pariwar cannot publish | **Yours, with a ratified ground** — `reviewedBy ≠ authoredBy` is ADR-0019 (RATIFIED) invariant (b), ⛔ the author's to waive; only ACCEPTING the single-admin outcome is open, and the identical consequence was PO-deferred 2026-07-30 (news) and restated for banners. A `super_admin` granted IN this Pariwar can be the second person (`role_grants` rows are per-Pariwar; with no grant there the scope hook answers 404 — G7). `-422` Q1 A (an admin MAY approve their own proposal) is a contrasting precedent that does ⛔ carry: it governs a different gate (questionnaire versions, ⛔ ADR-0019) and still needs a second person (the Super Admin) to make a version live. Stripped: "may an admin approve their own partner offer?" — ⛔ what the Trust owes a member (no member sees a module before 12.3). ASK only to confirm the precedent carries (QE9). |
| 4 | `commission_terms` vs trust-deed "disclosed" | **The Panel's** — ⛔ via the template's row *"what the Trust DISCLOSES about a person, or to whom"* (a fee arrangement is not about a person), but because the deal terms are PRD OQ-4, *"Owner: Trustee Panel + Partner contacts"*, and "disclosed" is a charter term of the (DRAFT) deed. ⚠ TWO drafts exist: the 2026-07-21 deed's 7.2(i) says "disclosed"; the LATER 2026-08-06 objects draft v4 (Object 10) carries no such proviso; which governs is unrecorded. 12.2 can avoid deciding it by storing ⛔ commission data — QE6 (A) — which AMENDS BOTH `-427` QE5 ("12.2 … chooses an admin-only home") AND `-429`'s "routed if 12.2 cannot reconcile them"; routing it NOW is option (B). |
| 5 | `role` / `cohort` targeting | **Yours** — D8's condition is a fact about live requirements; no first partner (HDFC / LIC / health camp) is recorded as needing role or cohort targeting. ASK to confirm (QE17). |
| 6 | A `scheduled` module going live by a system sweep | **Yours** — it executes the admin's own start date; ⛔ new member-facing meaning. |
| 7 | Partner data leaving TWT (privacy policy §6 names ⛔ partners) | **⛔ engaged by 12.2** — nothing leaves (I8). Stays C6 → 12.3 / 12.5. |

## FOUND FACTS (G) — traced at `3d6b46c5`, re-traced at `36b489c9` (v1.3), 2026-11-01

- **G1 — The primitive 12.2 calls** (`packages/domain/src/marketplace/`, exported as `marketplace` from `@twt/domain`;
  projectors ⛔ re-exported):
  - `authorModule(client: pg.PoolClient, i: ModuleCommandBase & { manifest: unknown })` → `{ eventId, eventVersion: 1,
    state: 'draft' }`; `scheduleModule` / `activateModule(client, i: ModuleCommandBase)`; `archiveModule(client, i &
    { reason })`. `ModuleCommandBase = { pariwarId; moduleId; auditId; actor: 'member'|'operator'|'trustee'|'system';
    actorId: string | null }` — `system` iff `actorId === null`; `member` is refused for every 12.2 command (I11).
  - Each transition command takes `SELECT … FOR UPDATE` on the module row FIRST (12.1 I10), judges its guard against
    `dbNow(client)` (the TRANSACTION's `now()`), and must run in a **READ COMMITTED** transaction (C13 (a)).
  - Guards: author refuses `valid_until ≤ now()` (A5); schedule needs `now() < valid_from`; activate needs `valid_from ≤
    now() < valid_until`; `trustee_archived` is legal from any non-archived state but ⛔ under actor `system` (R3-2).
  - `parseModuleManifest(input)` — `.strict()` snake_case: `partner_id` (uuid), `name_en`/`name_hi` (trim 1–120),
    `description_en`/`description_hi` (trim 1–2000), `eligibility_filter`, `scope_filter`, `valid_from`/`valid_until`
    (ISO with offset, UTC year 2000–9999, `until > from`), `slot_capacity` (int 1–2147483647 | null),
    `lead_handoff_url` (https, canonical, RFC 3986, ⛔ userinfo / `@` / `?` / `#` / IP / localhost, ≤ 2048),
    `lead_handoff_signing_key_secret_name` (`^[A-Za-z0-9_-]{1,255}$`), `branding_bundle` (`{ version: 1,
    logo_object_key: string(1–1024) | null, accent_color_hex: /^#[0-9a-f]{6}$/ | null }`). `module_id`, `pariwar_id`,
    `manifest_schema_version` are ⛔ input.
  - ⚠ `moduleNameSchema` / `moduleDescriptionSchema` are `storableText(...)` (it already refuses NUL and unpaired
    surrogates — `filters.ts`) and are SHARED by the manifest (`filters.ts`) AND
    `ModuleAuthoredPayloadSchema` (`events.ts`), which `foldModuleProjection` (`state.ts`) re-parses with `safeParse`
    to read capacity (QE12 / TR16).
  - `ScopeFilterV1`: `{version:1, scope:'members-all'}` | `{version:1, scope:'state'|'district', values: string[]}` —
    values 1–200, unique, each ≤ **120** (exported `MAX_SCOPE_VALUE_LENGTH`), matched BYTE-FOR-BYTE (⛔ trim /
    case-fold). `role` / `cohort` / `public` / `block` are refused at write.
  - `EligibilityFilterV1`: `{version:1, clauses: Clause[]}` with `.max(MAX_ELIGIBILITY_CLAUSES = 8)`, each `kind` at
    most once; the only v1 kind is `{kind:'member_state_in', states: ELIGIBILITY_MEMBER_STATES[]}` (non-empty, unique);
    `ELIGIBILITY_MEMBER_STATES = ['pending-kyc','pending-fee','pending-valid','lock-in','active','active-in-grace',
    'lapsed-unpaid']`; zero clauses = no restriction beyond scope.
  - Reads: `getModule(db, pariwarId, moduleId)` / `listModulesForPariwar(db, pariwarId, {state?, limit?})` (ordered
    `created_at DESC, module_id DESC`, clamp default 50 / cap 200, **⛔ cursor** — RVD6) return the WHOLE row (the admin
    shape); `createdAt` is a JS `Date` (`mode: 'date'` — milliseconds only). `getModuleStateAt`.
  - Errors carry ⛔ HTTP status ("the 12.2 / 12.3 / 12.6 routes map them"): `ModuleManifestInvalidError` (`.issues`),
    `ModuleOutsideWindowError(moduleId, operation, now, validFrom, validUntil)`, `ModuleIllegalTransitionError`,
    `ModuleGenesisMissingError`, `ModuleGenesisAlreadyExistsError`, `ModuleArchiveReasonNotSatisfiedError`,
    `ModuleStreamConcurrencyError`, `ModuleProjectorInputError`, `ModulePersistError` (any non-PK genesis INSERT
    failure, e.g. a 23503, carrying `.sqlstate`), + the lead errors (unused here).
  - `projectModuleGenesis` stores the actor in `events_log.actor_id` — the author of record (QE9).
  - The manifest is IMMUTABLE after `module.authored` (whole-row trigger, migration 0193; ADR-0044) — ⛔ revise command.
    `marketplace_modules` has ONE unique key, `marketplace_modules_pkey (module_id)` — ⛔ `(pariwar_id, module_id)`.
- **G2 — There is ⛔ partner entity anywhere** (packages, apps, docs). `partner_id` is a brand only (`ids/index.ts`
  "`PartnerId` … ⛔ FK until Story 12.2"). `packages/contracts/src/partners/README.md` reserves `/api/v1/global/partners/…`.
- **G3 — Geo tree** (`packages/domain/src/geo-tree/`, `schema/geo_tree_versions.ts`): one JSONB document per version,
  `nodes: { dimension: 'state'|'district'|'block'; value; parent_dimension; parent_value }[]`; values are free-text
  NAMES (⛔ codes, ⛔ normalised), `(dimension, value)` unique, node values up to **128** chars (`MAX_NODE_VALUE_LENGTH`
  in `geo-tree/document.ts` — module-PRIVATE, ⛔ exported; TR6), ≤ 5,000 nodes. `geoTreeVersionInForce(db, pariwarId,
  at)` returns `{version, document} | null`. A tree may publish districts only (⇒ ⛔ states). A Pariwar with ⛔ tree
  resolves members **district-only**, the district coming from the member's newest `member_postings.district`; a member
  with ⛔ posting row is in NO audience. **There is ⛔ read endpoint and ⛔ admin picker for the tree**; every admin
  audience "picker" today is a free-text `<input>` (banners / news / surveys).
- **G4 — District spellings without a tree:** `member/workplace.ts` `listWorkplaceDistricts` / `pageWorkplaceDistricts`
  return the Pariwar's `status='listed'` canonical names (A–Z), "compared BYTE-FOR-BYTE … never normalised", CAPPED at
  200 (`WORKPLACE_DISTRICTS_LIMIT`; `pageWorkplaceDistricts` returns `{ items, hasMore }` and promises ⛔ second page).
  A Pariwar with ⛔ listed row has ⛔ list (`pariwarHasWorkplaceList`). Exposed today only on a MEMBER route.
- **G5 — RBAC** (`packages/domain/src/rbac/`): `PERMISSION_CATALOG_VERSION = 56`, 74 keys in `SEED_PERMISSION_KEYS`;
  key regex `/^[a-z0-9_]+\.[a-z0-9_]+$/`. Roles: `super_admin` (global; holds every key), `pariwar_admin`,
  `state_trustee`, `district_admin`, `block_admin`, `finance_officer`, `it_cell`, `media_comms`, `field_worker`,
  `verifier`, `auditor`, `helpline_operator`, `trustee_panel` — ⛔ role named operator / trustee. `scopeContains`: a
  narrower grant ALWAYS fails a broader target, a `pariwar` grant covers every geo target in the tenant ⇒ a
  `district_admin` or `state_trustee` can NEVER satisfy a `dimension: 'pariwar'` key ("INERT"). Precedent
  `banner.manage`: pariwar dimension, `pariwar_admin` + `super_admin`. Adding a key = the 6.33 commit `0793112a`:
  `permissions.ts` (history comment + version bump + key), `roles.ts` (a `permissionKey('…')` const in the role's
  array), `tests/rbac/permissions.test.ts` (version + key count), `tests/rbac/roles.test.ts` (holder set) — ⛔ golden
  hash, ⛔ SQL seed.
- **G6 — Write shape.** Two twins, and they DIFFER on where the COMMIT is:
  - `apps/api/src/modules/questionnaire-versions/handlers.ts` `tenantWrite`: `requireIdempotencyKey` (header
    `Idempotency-Key`, 400 if missing) → `displayOf` (fail closed: `AdminDisplayNameMissingError`) → `releaseHookTx`
    (commit + detach the scope hook's READ tx) → `withIdempotency(key, …)` (claim; a replay returns the RECORDED result;
    `{ done: true }` for void; a failure RELEASES the key) → `openScopeTx` (bare `BEGIN` = READ COMMITTED; `SET LOCAL ROLE
    twt_app`; scope set) → `audit.withCompensatingAudit(deps.servicePool, { auditIntent: { pariwarId, actorId,
    actorRole: null, action, resourceLocator, requestPayloadHash: sha256(canonicalJsonStringify(shape)), traceId },
    mutate })` → **`closeScopeTx(scopeTx, ok)` in the `finally`, AFTER the wrapper returns** (so a failed COMMIT writes
    ⛔ `_rolled_back` line), `mapChainError` in the outer `catch`.
  - `apps/api/src/modules/memorial/handlers.ts` (the Send handler): **`await closeScopeTx(tx, true)` INSIDE `mutate`**
    ("COMMIT — inside `mutate`, so a failed COMMIT writes the compensating line"; followed there only by an
    ambiguous-COMMIT read-back and the `return` — 12.2 does ⛔ copy the read-back, QE13), with `finally { await
    closeScopeTx(tx, false) }` (a no-op once closed — `closeScopeTx` checks `closed`). ⭐ 12.2 copies the questionnaire
    SHAPE with the memorial COMMIT placement (I2). `releaseHookTx` is a LOCAL helper in
    `questionnaire-versions/handlers.ts` — copy it too. ⚠ The questionnaire `tenantWrite` also calls `displayOf`
    (fail-closed admin display name); the module commands take ⛔ display name, so 12.2's writes do ⛔ call it.
  - `withCompensatingAudit` RETHROWS after writing `_rolled_back`, so mapping errors inside `mutate` or in the outer
    `catch` both keep the compensating line. ⚠ News / banners / surveys write audit FIRE-AND-FORGET — ⛔ copy them.
  - `canonicalJsonStringify` is exported from `@twt/domain` (`canonical-json.ts`). Commands need a `pg.PoolClient`:
    pass `scopeTx.client` (the helpdesk twin).
- **G7 — Route shell** (news / banners twin): `requireAdminSession(deps)` → `scopeResolutionHook(deps)` (opens the READ
  scope tx; zero grants ⇒ 404 so tenants cannot be probed; loads `request.scopeGrants` + `request.geoTree`) →
  `requirePermissionHook(deps, KEY, { dimension: 'pariwar' })`. Actor = `request.requestContext.actorId` (a `users`
  id). ⚠ Grants are per-Pariwar ROWS: `loadActorGrants` (`apps/api/src/modules/rbac/index.ts`) reads `role_grants`
  under the Pariwar's RLS (`0004`), so a `super_admin` passes the scope hook ONLY with a grant row in THAT Pariwar. Params `z.object({ pariwarId: z.string().uuid() }).strict()`; list `limit` `.max(200)`. Registered in
  `apps/api/src/server.ts`. Two route-table gates: `apps/api/tests/integration/login-wall.spec.ts` (every non-public
  route carries `requireAdminSession`) and `apps/api/tests/integration/forced-pagination.spec.ts` (every GET whose 200
  body is a top-level array or `{ items: [] }` must declare a `limit` with a finite `maximum`). ⚠ The pagination gate
  reads `t.app.swagger()` and classifies a route by `responses['200'].content['application/json'].schema` — a GET
  with ⛔ declared 200 response schema is NEVER examined (the gate passes vacuously). Static path segments beat params
  in find-my-way. A 422 has ⛔ `ApiError` subclass in `apps/api/src/http-errors.ts`: use `new ApiError(422, code, msg,
  details)` (the `known-people/handlers.ts` precedent).
- **G8 — Step-up (Story 1.9 gate; 5.9 is delivery):** `requireStepUp(deps, actionContext)`
  (`apps/api/src/modules/step-up/gate.ts`) — session-based (`elevatedUntil > now && elevatedAction === actionContext`),
  else 403 `auth.step_up_required` `{details: {action}}`; elevation 5 min (not consumed by use), OTP 3 min. Contexts
  shared with admin live in contracts (the gate compares a bare string). ⚠ Admin step-up delivery is an always-stub for
  EVERY admin step-up (admins have ⛔ mobile; Story 5.9 deferred admin SMS) — pre-existing, ⛔ 12.2's. API specs have ⛔
  shared helper: each defines its own `elevate(client, actionContext)` (POST `/api/v1/auth/step-up/request`, then
  `/verify` with `adminStepUp.last?.code` — a `CapturingStepUpDelivery` from `_setup.ts`) and its own `actor(…)` /
  `pariwarAdmin(p, name)` user factory. ⚠ They differ: copy `elevate(client, actionContext)` from `workplaces.spec.ts`
  (questionnaire's `elevate(client)` hard-codes `'questionnaire_publish'`) and `pariwarAdmin(p, name)` from
  `questionnaire-versions.spec.ts` (workplaces' takes no name). The `_setup.ts` context field is
  `adminStepUpDelivery`; `adminStepUp` is a per-spec local alias.
- **G9 — Tone review (Story 2.2, ADR-0019 ratified):** pure `toneReview.evaluateToneReviewGate({ signoff, authoredBy,
  resourceLocator })` denies when the sign-off is missing, names another locator, or `reviewedBy === authoredBy`; deny →
  `ToneReviewRequiredError` (constructed with the gate's `denial` object) → 409 `tone_review.required` (already in the
  central mapper). Persistence is the CONSUMER's. `requireToneReviewSignoff`'s `resolveAuthoredBy` is SYNCHRONOUS, so
  12.2 evaluates in the handler and emits `tone_review.publish_blocked` via `deps.toneReviewAuditSink.emit({...})` (a
  `ToneReviewAuditEvent`: `at: Date`, `type`, `actorId`, `resourceLocator`, `traceId?: string` — ⛔ `null`; plus
  optional `pariwarId?: string | null`, `contentHash?: string`, `context?`;
  `apps/api/src/modules/tone-review/index.ts`) — passing `pariwarId` EXPLICITLY
  (the pre-handler reads `request.scopeTx?.pariwarId`, which is gone after `releaseHookTx`) — and the success line via
  `recordToneReviewSignoff(deps, { reviewedBy, resourceLocator, contentHash, pariwarId, traceId })`. Both are
  fire-and-forget. API tests capture them on `t.toneReviewAuditSink` (`CapturingToneReviewAuditSink`, `_setup.ts`).
  The checklist (`docs/tone-review-checklist.md`) has FIVE sections: 1 Voice, 2 Register per surface, 3 Prohibited
  frames, 4 Grief-context gate, 5 Reviewer attestation ("I am **not the author** of this copy, I hold the surface's
  review permission, …"). Its "Publish routing" table has ⛔ "Partner module" row yet — Task 0.4 adds one
  (`module.manage`, Story 12.2).
- **G10 — Admin web app** (`apps/admin`): Vite 7 + React 19 + `@tanstack/react-router` (CODE-based routes in
  `src/router.tsx`) + TanStack Query v5 + Tailwind v4 (+ `@twt/tokens/theme.css`); ⛔ wizard / stepper anywhere; big
  editors hold ONE `useState<EditorState>` object (banners / news / surveys); drafts are held on the SERVER (⛔ browser
  storage in admin). ALL fetchers live in the central `src/api/client.ts` (private `apiFetch(path, schema, init)` parses
  with `@twt/contracts`; exported `ApiError`) and hooks in `src/api/hooks.ts` — ⛔ per-module client files.
  `createQueryClient` — `retry:false`, `staleTime:0`. Admin chrome is ENGLISH-ONLY per module (`i18n-en.ts` `resolveEn
  as t`); bilingual content = side-by-side `*Hi` fields (`BannersPage.tsx`), `lang="hi"` on Hindi read-backs
(`helpline-claims/ReadBackCard.tsx`, `questionnaire-versions/QuestionnaireVersionsPage.tsx`). The microcopy gate
(`scripts/microcopy/check.ts`, an `apps/admin` slice) checks vocabulary such as "report" / "receipt" / "invoice" /
"passbook" — keep 12.2's UI strings clear of them. ⛔ admin
  label map exists for the seven member lifecycle states. `toIsoOrNull` is a PRIVATE helper duplicated in
  `BannersPage.tsx` / `SurveysPage.tsx`: `new Date(local).toISOString()` — a UTC `Z` string (the browser zone is used
  only to READ the `datetime-local` value). Step-up UI is REACTIVE: the write answers 403 `auth.step_up_required` →
  `StepUpPanel` (`src/modules/workplaces/StepUpPanel.tsx`: `holdOnce`, `holdKey`, `needsStepUp`) → verify → retry.
  Preview precedent: `BannersPage.tsx` "Member preview". Tests: `apps/admin/tests/*.test.tsx`, `renderWithClient`,
  `vi.mock('../src/api/client.js', …)`, per-test timeouts (⛔ global) — the `@twt/admin` 5 s flake under `ci:local`
  load is known.
- **G11 — Secret Manager:** `resolveSecretValue(name, {envFallback})` (`packages/domain/src/secrets.ts`) is the ONLY call
  (`accessSecretVersion`); ⛔ exists / list API. The WA / Telegram config forms store a secret NAME validated for SHAPE
  only — the twin for step (f).
- **G12 — Storage:** ⛔ admin upload port, ⛔ presigned PUT; uploads go through the API (`@fastify/multipart`) into
  purpose-specific ports. The Pariwar logo itself is a typed URL. ⇒ a partner-logo upload is a story-sized pipeline (QE8).
- **G13 — Jobs + service role:** cron twin `apps/jobs/src/member-renewal-lifecycle.ts` (`createQueue` → `work` →
  `schedule(queue, cron, {}, {tz: 'Asia/Kolkata'})`, wired in `apps/jobs/src/boot.ts`) over
  `member/renewal-scheduler.ts` (an unscoped indexed cross-tenant candidate scan on the service pool, then one
  `withPariwarScope` tx per candidate — BEGIN + `setPariwarScope`, ⛔ `SET LOCAL ROLE` — `actorId: null`,
  per-candidate try/catch with counts). The audit-wrapped jobs twin is `apps/jobs/src/claim-contact-wa-stop.ts`:
  `audit.withCompensatingAudit` is DEFINED in `packages/domain/src/audit/compensating.ts` and exported from
  `@twt/domain`; only its CALL SITES live in apps/jobs (domain code never calls it — `-427` QE15). Its `mutate` is
  `() => withPariwarScope(pool, pariwarId, (db: Db) => …)` (`claim-contact-wa-stop.ts:53-54`; 12.2's sweep takes
  `({ auditId })` because `activateModule` needs it, and uses `(_db, client)` — the `:34` pre-read form — because the
  module commands need the `pg.PoolClient`), which COMMITs inside the callback (`db.ts`).
  `closeScopeTx` exists only in `apps/api` (`multi-tenant/scope-tx.ts`) — jobs cannot import it. The production jobs
  login inherits ONLY `twt_service` (provisioning COMMENT in `0007_audit-log-entries-rls.sql`: `twt_service_login LOGIN
  BYPASSRLS`, `GRANT twt_service TO …` — ⛔ migration creates it; dev / CI execute only `GRANT twt_service TO
  twt_dev_app` in `0002`); ⛔ job does `SET LOCAL ROLE twt_app` (that needs a membership nothing provisions — the 6.25
  R3 deferral). The systemic gate is roster **Row 26 `jobs-db-role`**, still OPEN (`docs/launch-gate-inventory/
  inventory-roster.md`); its closure criterion (a) asks for a posture DECISION, e.g. "a member of `twt_app` with
  `withPariwarScope` doing `SET LOCAL ROLE twt_app`, plus `twt_service` grants for the cross-tenant reads and writes …
  OR broad `twt_service` grants" — the first example posture is RLS-bound, the second is not. (Row 24
  is `staff-email-transport`; its (b) is a narrower slice, ADR-0040's identity-table reads.) ⚠ Under an RLS-bound login
  an UNSCOPED cross-tenant scan of a `twt_app`-policied table returns ZERO rows with NO error (empty `app.pariwar_id`).
  The house guard: `smsDelivery.canReadAcrossPariwars(pool)` (`packages/domain/src/sms-delivery/reports.ts` — `SELECT
  (rolsuper OR rolbypassrls)` for `current_user`), checked FIRST by six jobs on `main` (e.g. `claim-contact-ladder.ts`,
  which alarms `contact_ladder.rls_bound_role` and ends
  the tick (e.g. `apps/jobs/src/scheduler/claim-contact-ladder.ts`).
  `twt_service` has `SELECT, INSERT` on `events_log` (`0002`); a cross-tenant service read of a tenant table needs its
  OWN grant (`0091_member-moderation.sql` "Why twt_service gets SELECT"). 0193 granted `marketplace_modules` to
  `twt_app` only. ⚠ The default jobs pool is `max: 2` — a tx + a compensating-audit write need two connections
  ([[project_jobs_pool_two_connection_starvation]]).
- **G14 — Access-wrapper gate (AI-6-1):** `scripts/access-wrapper-invariants/check.ts`: `ACCESS_SURFACE_ROOTS =
  [...CHANNEL_ROOTS, ...CLAIM_ROOTS]` feeds BOTH the constant-time-compare invariant AND the compensating-audit
  invariant; the latter flags a bare `audit.writeAuditEntry(...)` namespace call. `filesForRoots` → `collectTsFiles`
  → `readdirSync`: a root must be a DIRECTORY (a file root throws ENOTDIR). README "Per-epic scope-extension
  convention" (also `docs/access-wrapper-invariants.md`): add the roots, confirm an invariant FIRES on them, prove teeth
  with a revert. ⛔ Epic 7–12 roots.
- **G15 — Contracts:** `packages/contracts/src/modules/README.md` reserves `/api/v1/p/<pariwar_id>/modules/...`;
  `.strict()`; shipped contract files import ⛔ `@twt/domain` (tuples re-declared; a TEST imports both —
  `tests/news-blog.test.ts`). OpenAPI paths are registered by hand in `packages/contracts/scripts/emit-openapi.ts` →
  the REPO-ROOT `openapi/v1.yaml`; gate `contracts:check-openapi-determinism`.
- **G16 — `detectNakedPii`** runs at write time only on the Niyamavali clause publish; news / banners / surveys are ⛔
  screened (their gate is the tone review). 12.2 follows news / banners (⛔ PII screen) — admin-authored offer copy.
- **G17 — 12.1 live specs that a partner FK + new constraints BREAK** (all under `packages/domain/tests/integration/`):
  - `marketplace/_fixtures.ts` — `RAW_INSERT_SQL` / `rawInsertParams` / `manifestInput` pass `randomUUID()` as
    `partner_id` (the RLS spec IMPORTS `RAW_INSERT_SQL` / `rawInsertParams` from here);
  - `marketplace/projector-trigger.spec.ts` — the "carries exactly the six named CHECKs, the PK and the two indexes, and
    ⛔ foreign key" test asserts ZERO FKs and an EXACT index list; `seed()` and the "(5,5) and (NULL,NULL) pass" leg do
    guarded raw inserts that must succeed;
  - `rls/marketplace-modules-policy-regression.spec.ts` — `RAW_INSERT_SQL` rows in PARIWAR_A and PARIWAR_B;
  - FIVE marketplace specs: `projector-trigger.spec.ts`, `commands.spec.ts`, and three that OWN their commits —
    `commands-clock.spec.ts`, `module-stream-concurrency.spec.ts`, `read.spec.ts` (authors in PARIWAR_B; own pool).
  - `read.spec.ts` asserts `listModulesForPariwar` returns an ARRAY of at most `limit` rows (`toHaveLength(2)` at 2,
    `toHaveLength(1)` at -1 / 0, the cap-200 leg) — hence QE16's NEW function.
  - Legs expecting P0001 / 23514 still pass (BEFORE triggers and CHECKs fire before the RI check). ⛔ other file in the
    repo inserts `marketplace_modules` rows (besides the `ci.yml` gate job's own run).
- **G18 — Four eligibility statuses have ⛔ member today.** ⛔ production code emits `member.lock_in_expired` (it is
  named only in `member/state.ts`, `member/events.ts`, `restoration-discipline/status.ts` and the registry); rows
  `3-13-trustee-validation-of-manually-entered-identity` and `3-14-lock-in-expiry-producer` are `backlog`. So ⛔ member
  can be `active`, `pending-valid`, `active-in-grace` or `lapsed-unpaid`, and an eligibility clause naming only those
  reaches nobody today ([[project_lock_in_never_ends_no_active_members]]). `pending-valid` means: the lock-in ended with
  identity ⛔ verified, awaiting a trustee (`state.ts`: "unverified → pending-valid (awaits trustee)").

## ⚖️ Build decisions QE1–QE22 (PROPOSED — BigDev answers at Task 0.2)

Five are real **ASKs** (⭐ ASK). The rest carry a recommendation that BigDev may accept in one line.

- **QE1 — Shape of the flow: author a `draft`, publish separately; ⛔ revise event.**
  - The wizard (steps a–f) holds its state CLIENT-SIDE in one `useState<WizardState>` (the banners shape; ⛔ browser
    storage). Its last step, "Create draft", calls `POST …/modules` → `authorModule` (state `draft`). That draft IS the
    server-side draft; it is immutable.
  - Review + publish (steps g–h) happen on the module's DETAIL page, by a non-author (QE9).
  - A correction BEFORE publish = **Withdraw** the draft (archive `trustee_archived`) + **"Start a corrected copy"**
    (the wizard pre-filled from the old module, `?from=<moduleId>`), which authors a NEW module. A draft has no leads,
    so C10's harm is nil for it.
  - ⇒ ⛔ `module.revised` arm. The deferred "revise event" item → **Resolved via explicit deferral** (12.2 needs no
    server-side drafts); re-trigger unchanged: the first surface needing server-side save-as-you-go. Cost: an admin who
    reloads mid-wizard loses steps a–f (said in the wizard's opening line).
- **QE2 — Permission: ONE key, `module.manage`, `pariwar` dimension, held by `pariwar_admin` (+ `super_admin`
  automatically).**
  - It gates every 12.2 route. Catalog 56 → **57** (or the next free — CONTESTED, read LIVE), keys 74 → 75;
    `defaultRoleBundles` stays 13. ⛔ new role.
  - "Admins can only author modules within their scope" is met STRUCTURALLY: any module may target the whole Pariwar,
    so only Pariwar-wide authority may author one; the module's `pariwar_id` is the path's (the scope tx), never body
    input. `district_admin` / `state_trustee` / `trustee_panel` are deliberately ⛔ granted (a narrower grant is INERT
    against a pariwar key — the `banner.manage` precedent). **Acceptance condition for a narrower grant (recorded, ⛔
    built):** a module gains a server-derived geo scope AND the gate moves to that dimension, checking EVERY scope value
    with `rbac.checkPermission` + the request's tree resolver.
  - **Variances (recorded):** `module.manage` doubles as the surface's tone-review key, exactly as `banner.manage` /
    `news.manage` do — ⛔ separate `module.review` (`docs/tone-review-checklist.md` "its own resource-specific review
    key"); the epic persona's "trustee" holds ⛔ key (state_trustee inert; trustee_panel not granted).
- **QE3 — ⭐ ASK — ✅ ANSWERED (A), as recommended (BigDev, 2026-11-01 — Task 0.2) — Partner identity: a per-Pariwar
  `marketplace_partners` registry, and a composite FK from
  `marketplace_modules`.**
  - Table: `partner_id uuid PK` (server-minted), `pariwar_id uuid NOT NULL` (⛔ FK — ⛔ `pariwars` table),
    `display_name_en text NOT NULL`, `display_name_hi text NOT NULL` (QE12 rules), `created_by_actor_id uuid NOT NULL`
    (a `users` id), `audit_id uuid NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`. Constraints:
    `marketplace_partners_pariwar_partner_unique UNIQUE (pariwar_id, partner_id)` (the FK target);
    `CREATE UNIQUE INDEX marketplace_partners_pariwar_name_en_unique ON marketplace_partners (pariwar_id,
    lower(display_name_en))` (⛔ "LIC" and "Lic" in one Pariwar). GRANT SELECT, INSERT to `twt_app` (⛔ UPDATE, ⛔
    DELETE — immutable; a misspelt partner is a new partner; rename = Not addressed, re-trigger: the first rename
    request). ENABLE + FORCE RLS, `marketplace_partners_tenant_isolation_{select,insert}`.
  - FK: `ALTER TABLE marketplace_modules ADD CONSTRAINT marketplace_modules_partner_fk FOREIGN KEY (pariwar_id,
    partner_id) REFERENCES marketplace_partners (pariwar_id, partner_id)`. Composite, because FK checks run as the
    referenced table's owner and IGNORE RLS — a single-column FK would let a module name another Pariwar's partner. The
    0193 whole-row trigger is untouched (a constraint changes ⛔ row; transitions never change the FK columns, so the
    RI check is SKIPPED on them — EXCEPT when the row was written earlier in the SAME transaction (Postgres's xmin rule;
    e.g. author + transition in one tx in `commands.spec`), where it runs as the owner and passes). `twt_app` needs ⛔
    REFERENCES grant. Both FKs are written `ON DELETE NO ACTION ON UPDATE NO ACTION` (the 0161 style); ⛔ CASCADE /
    SET NULL — an FK action that updates `marketplace_modules` runs WITHOUT the writer guard and the 0193 trigger
    rejects it (P0001).
  - Per-Pariwar (architecture §3.7), so the routes are tenant routes `…/modules/partners` and
    `packages/contracts/src/partners/README.md` gets a dated note (global partners = the v2 self-service portal).
  - **Cost:** every 12.1 live spec that inserts a module must first insert a SAME-Pariwar partner (G17, Task 2.4).
  - Alternatives: (B) ⛔ table — the partner's display name lives nowhere, so 12.3 cannot show "LIC" on the card;
    (C) table without the FK — a stray or cross-tenant `partner_id` is possible. **Recommend (A).**
- **QE4 — Publish record (C12): `marketplace_module_publications`, one row per module, insert-only, tenant-safe.**
  - Add `marketplace_modules_pariwar_module_unique UNIQUE (pariwar_id, module_id)` to `marketplace_modules` (a
    constraint, ⛔ column) so the publication FK can be COMPOSITE (QE3's reasoning).
  - Table: `module_id uuid PRIMARY KEY`, `pariwar_id uuid NOT NULL`, `FOREIGN KEY (pariwar_id, module_id) REFERENCES
    marketplace_modules (pariwar_id, module_id)` (`marketplace_module_publications_module_fk`), `published_event_type text
    NOT NULL CHECK (published_event_type IN ('module.scheduled','module.activated'))`, `tone_signoff_content_hash text
    NOT NULL CHECK (tone_signoff_content_hash ~ '^[0-9a-f]{64}$')`, `reviewed_by_actor_id uuid NOT NULL`, `reviewed_at
    timestamptz NOT NULL DEFAULT now()`, `hindi_reviewed boolean NOT NULL CHECK (hindi_reviewed)`,
    `partner_agreement_confirmed boolean NOT NULL CHECK (partner_agreement_confirmed)` (QE9), `audit_id uuid NOT NULL`.
    GRANT SELECT, INSERT to `twt_app`; ENABLE + FORCE RLS (select / insert policies).
  - It is the tone sign-off's persistence (Story 2.2 makes the consumer own it) and the "who published" record.
    `recordModulePublication` takes the `pariwarId` FROM the module row it was given, ⛔ a separate argument.
  - The content hash: sha256 hex of `canonicalJsonStringify({ name_en, name_hi, description_en, description_hi,
    partner_display_name_en, partner_display_name_hi })` — everything a member will read on the card. The manifest and
    partner are immutable, so the hash is provenance, ⛔ an edit detector. The sign-off's `resourceLocator` is
    `module/<id>` (the same string as the audit locator).
- **QE5 — Scope picker + C11 enforcement, server-side.**
  - `GET …/modules/scope-options` → `{ geo_tree_version: number | null, states: Option[], districts: Option[],
    district_source: 'geo_tree' | 'workplace_districts', districts_truncated: boolean }`, `Option = { value: string;
    state: string | null; usable: boolean; unusable_reason: 'too_long' | null }`. A single object (⛔ a collection for
    the forced-pagination gate).
    - Tree in force (`geoTreeVersionInForce(db, pariwarId, now)`): states = its `state` nodes (may be EMPTY for a
      districts-only tree); districts = its `district` nodes with their parent state; `districts_truncated: false`.
    - ⛔ tree: `states: []`; districts = `pageWorkplaceDistricts(db, pariwarId, { limit: 200 })`, `state: null`,
      `districts_truncated = hasMore`.
    - ⛔ tree AND ⛔ listed district: `states: []`, `districts: []` ⇒ only `members-all` is authorable.
    - A value longer than 120 (`MAX_SCOPE_VALUE_LENGTH`) → `usable: false, unusable_reason: 'too_long'` — never
      truncated.
  - Domain `marketplace/scope-options.ts`: a PURE `buildModuleScopeOptions(treeDocument | null, listedDistricts: {
    items: string[]; hasMore: boolean })` (unit-tested) + `listModuleScopeOptions(db, pariwarId, at)` (the two reads,
    then the builder). `at`: the options GET passes `deps.clock()` (the clock the scope hook used to load the tree); the
    write pre-check passes the WRITE transaction's DB `now()` (TR3). `geoTreeVersionInForce` compares `effective_at <=
    at` (a JS `Date`, milliseconds).
  - ⚠ **AMENDS `-429` C11 IN PART (recorded in the author-commit, C11 quoted IN FULL —
    [[feedback_supersede_never_reinterpret]]).** C11 reads: *"scope `values` are ⛔ validated against the Pariwar's geo
    tree in 12.1. The wizard picks them from the tree, and refuses `state` scope where there is no tree."* With ⛔ tree,
    12.2 takes `district` values from the Pariwar's listed workplace districts — the same district-only spelling source
    the member resolver uses when there is ⛔ tree (G3 / G4); `state` is still refused. That WIDENS C11's text, so it
    is an amendment, ⛔ a "reading".
  - **At author time the handler checks the SUBMITTED values in the WRITE transaction, BEFORE the audit wrapper
    (12.1 QE15's pre-check rule) — by EXACT membership, ⛔ against the capped option list.** Order: the pre-check first
    `safeParse`s the body's `scope_filter` with the domain's `ScopeFilterV1Schema` (`filters.ts` — `ScopeFilterV1` is
    only the inferred TYPE); if THAT fails it SKIPS the scope
    check and leaves the refusal to `authorModule`'s manifest parse (422 `module.manifest_invalid`, inside the wrapper);
    only a well-formed filter is checked here:
    - `scope: 'state'` → the tree in force must contain a `state` node with each value (byte-equal), else (⛔ tree or ⛔
      such node) 422 `module.state_scope_requires_geo_tree` / `module.scope_value_unknown`;
    - `scope: 'district'` → with a tree: each value is a `district` node; with ⛔ tree: `SELECT district FROM
      workplace_districts WHERE pariwar_id = $1 AND status = 'listed' AND district = ANY($2::text[])` returns every value
      — else 422 `module.scope_value_unknown` (details: the offending values — the admin's own input, ⛔ PII). (One new
      SQL statement, in `scope-options.ts` as `findListedWorkplaceDistricts`.)
  - `members-all` = the epic's "national" (one Pariwar — cross-Pariwar is v2). `role` / `cohort` → QE17.
  - ⚠ A tree amended after authoring may orphan a value; the module is immutable and 12.3 matches byte-for-byte, so the
    orphan reaches nobody (fail-closed). Recorded, ⛔ built (→ 12.3).
  - R3D1's scope-value leg is BUILT at the 12.2 route only (Task 0.4 dated line; Closed by the build commit at Task 10) (values must equal a recorded place); `parseModuleManifest`
    is unchanged for other callers — Resolved via explicit deferral for non-12.2 callers.
- **QE6 — ⭐ ASK — ✅ ANSWERED (A), as recommended (BigDev, 2026-11-01 — Task 0.2): ⛔ commission data stored; ⛔
  routing note now — `commission_terms`.**
  - (A) **Recommended: store ⛔ commission data in 12.2.** OQ-4 (the deal terms — "Commission %, lead/conversion
    tracking, exclusivity") is OPEN and Panel-owned, so ⛔ shape exists to store; the trust deed is a DRAFT ("NOT YET
    EXECUTED"); storing nothing means 12.2 ITSELF discloses or withholds nothing. ⚠ It does ⛔ make the question go
    away: the partner ARRANGEMENT exists off-platform from the first publish (QE9's tick attests a signed agreement),
    deed 7.2(i) attaches "disclosed" to the ARRANGEMENT, and 20(i) makes entering one a Trustees' power — so (A)
    DEFERS the question, ⛔ answers it. ⚠ This **AMENDS** `-429`'s carried instruction
    ("routed if 12.2 cannot reconcile them") AND `-427` QE5 ("**`commission_terms` is DEFERRED to 12.2**, which
    chooses an admin-only home") — under (A) ⛔ home is chosen. The author-commit records BOTH amendments EXPLICITLY,
    each quoted in full ([[feedback_supersede_never_reinterpret]]; both are author-commits, so BigDev may amend them);
    the same "chooses an admin-only home" wording in the epics.md INHERITED note and in `deferred-work.md` is
    re-pointed at Task 0.4. ⚠ Also recorded: TWO deed drafts exist — the 2026-07-21 deed's Clause 7.2(i) says
    "disclosed"; the LATER 2026-08-06 objects draft v4 (Object 10) has ⛔ such proviso — and which draft governs is
    recorded nowhere. Under (A) 12.2 needs neither. The item moves to:
    *re-trigger = whichever comes FIRST: OQ-4 answered by the Panel; OR the first PRODUCTION publish of a module (its
    tick attests a signed partner agreement — deed 7.2(i) / 20(i)); OR Story 12.3's create-story (the first time a
    member sees an offer — when "is the fee arrangement disclosed to the member?" becomes live)*. FR-64 / FR-66
    variance recorded.
  - (B) As (A), AND write a Panel routing note NOW (from the template) asking "does the Trust disclose its partner fee
    arrangements, and to whom — given deed Clause 7.2(i) 'disclosed', the PRD's 'never public', and 'Commission revenue
    funds operations'?". The note MUST state that the later objects draft v4 drops "disclosed" and that which draft
    governs is unrecorded (that is part of THE ONE FACT); it also quotes deed 20(i) and objects v4 ¶B.5 ("Commercial
    receipts … separate books of account") — the clause that governs commission RECEIPTS. Not blocking 12.2. (Task 0.3
    maps what (B) adds.)
  - (C) Build an admin-only free-text `commission_terms` table now. ⚠ It stores a Panel-owned deal term with no shape,
    and still leaves the disclosure question open.
- **QE7 — ⭐ ASK — ✅ ANSWERED (A), as recommended (BigDev, 2026-11-01 — Task 0.2): 12.2 owns the 5-minute
  activation sweep — Who turns a `scheduled` module `active` (C2 (b)).** Publish with a future `valid_from` emits
  `module.scheduled` (12.1's guard; the epic's "emits `module.activated`" is a variance for that case).
  - (A) **Recommended: 12.2 owns a 5-minute activation sweep.** pg-boss cron `*/5 * * * *` (`tz 'Asia/Kolkata'`).
    - **Domain** (`marketplace/activation-sweep.ts`) exports ONLY `selectDueScheduledModules(servicePool, opts?: { asOf?:
      Date; limit?: number })` and a pure `classifyActivationOutcome(err): 'skipped' | 'failed'`. The scan is unscoped
      and cross-tenant: `WHERE current_state = 'scheduled' AND valid_from <= now() AND valid_until > now() ORDER BY
      valid_from, module_id LIMIT 500` — DB `now()` (⛔ an app clock; `asOf` is a test-only override that replaces
      `now()` with `$asOf`; ⚠ `asOf` serves ONLY "⛔ selected" legs — an `asOf` LATER than real time selects a module
      that `activateModule` (real DB `now()`) then refuses as outside its window). Served by the NEW partial index `marketplace_modules_scheduled_valid_from_idx (valid_from)
      WHERE current_state = 'scheduled'` (C2 (d)). ⛔ `withCompensatingAudit` in the domain (`-427` QE15 / 12.1 AC5).
    - **Jobs** (`apps/jobs/src/scheduler/module-activation.ts`, the `claim-contact-wa-stop.ts` audit shape):
      `runModuleActivationTick(deps)` = the Row 26 guard FIRST (`smsDelivery.canReadAcrossPariwars(tickPool)`; false ⇒
      ONE `module_activation.rls_bound_role` alarm and the tick ends — ⛔ "nothing due"; QE19) → `selectDueScheduledModules`
      → for each candidate the EXPORTED `activateDueModule(deps, candidate): Promise<'activated' | 'skipped' | 'failed'>`
      (exported so AC9's withdraw-race leg can withdraw BETWEEN selection and activation); per candidate
      `audit.withCompensatingAudit(auditPool, {
      auditIntent: { pariwarId, actorId: null, actorRole: null, action: 'module.activated', resourceLocator:
      'module/<id>', requestPayloadHash, traceId: null }, mutate })` where `mutate` is `withPariwarScope(tickPool,
      pariwarId, (_db, client) => marketplace.activateModule(client, { pariwarId, moduleId, auditId, actor: 'system',
      actorId: null }))` — ITS OWN transaction (`BEGIN` = READ COMMITTED + `setPariwarScope`; ⛔ `SET LOCAL ROLE twt_app`
      (G13)) that COMMITs inside the callback, i.e. inside `mutate` (I2's placement). ⛔ `closeScopeTx` (apps/api only).
    - `ModuleIllegalTransitionError` (a racing withdraw) and `ModuleOutsideWindowError` (the window closed between scan
      and lock) → `skipped`; anything else → `failed` (logged, next candidate). Idempotent; one step per tick. A skip is
      thrown inside `mutate`, so it leaves the intent line + `module.activated_rolled_back` — accepted (a skipped row is
      never re-selected: it is no longer `scheduled`, or its window has closed).
    - This changes C2's recorded cost (activation latency "up to a day") to **up to 5 minutes**; record it at Task 0.4.
    - Grants: the migration adds `GRANT SELECT, UPDATE ON marketplace_modules TO twt_service` with a
      0091-style "Why twt_service gets SELECT, UPDATE" header (the unscoped due scan + the projector's guarded
      UPDATE under the BYPASSRLS jobs login); `events_log` is already `SELECT, INSERT` for `twt_service` (`0002`).
      ⚠ Dev / CI superusers HIDE a missing grant — AC1 asserts it with `has_table_privilege`.
    - Pools: ONE dedicated pool for the tick, `max: 3`, worker `localConcurrency: 1` — ⛔ the shared `max: 2` jobs pool
      (G13).
    - A `scheduled` module whose `valid_until` already passed is ⛔ selected — it stays `scheduled` until 12.6 archives
      it (C2 (c), unchanged). Cost: an offer goes live up to 5 minutes after its start time.
  - (B) A per-module delayed pg-boss job enqueued at publish AFTER COMMIT (`startAfter = valid_from`, `singletonKey =
    module_id` — the news-publish shape). ⚠ A job lost between COMMIT and enqueue leaves the module `scheduled` and it
    is NEVER activated (12.6 only archives it at `valid_until`).
  - (C) 12.2 refuses a future `valid_from` at publish (activate-only, 422 `module.publish_before_start`); 12.6 owns
    scheduling (C2 (b) stays with 12.6).
- **QE8 — Branding: `branding_bundle = { version: 1, logo_object_key: null, accent_color_hex: null }` in 12.2.**
  - ⛔ upload (G12: a new storage port + bucket + image pipeline is story-sized). ⛔ accent colour field (C5: usable only
    on a partner-dedicated detail page, which nothing builds). Carried: *the partner logo upload — re-trigger: Story
    12.3's create-story (the card shows "logo, name" — UX)*. The partner's NAME (QE3) is the card's brand asset meanwhile.
- **QE9 — ⭐ ASK (confirm precedent) — ✅ CONFIRMED, as recommended (BigDev, 2026-11-01 — Task 0.2): the
  PO-deferred single-admin precedent covers modules — Publish = non-author tone sign-off + partner-agreement
  confirmation + step-up; single-admin Pariwars cannot publish.**
  - `POST …/modules/:moduleId/publish`, body `{ tone_checklist_confirmed: true, hindi_reviewed: true,
    partner_agreement_confirmed: true }` (each `z.literal(true)` — the memorial `calledBack` precedent,
    `contracts/src/memorial/takedown.ts`; 6.33's `hindiReviewed` is a `z.boolean()` checked in its domain), route chain
    + `requireStepUp(deps, MODULE_PUBLISH_STEP_UP_CONTEXT)`.
  - `partner_agreement_confirmed` records the UX gate *"every partner agreement before module activation"* (an
    off-platform obligation of BigDev + partnerships, incl. TWT's visual-discipline term): the publisher ticks *"The
    partner agreement for this offer is signed and includes TWT's visual-discipline term."* — stored on the publication
    row (QE4). ⛔ document upload.
  - `reviewedBy` = the publishing actor; `authoredBy` = the `events_log.actor_id` of the module's `module.authored`
    event (`getModuleAuthorActorId`). Same person → `tone_review.publish_blocked` + 409 `tone_review.required`. ⚠ If
    `getModuleAuthorActorId` returns `null` (`events_log.actor_id` is nullable; `authorModule` accepts the `system`
    actor), the handler DENIES the same way — `reviewedBy === null` is never true, so the pure gate alone would let it
    through. (12.2 itself only authors as `operator`.)
  - The detail DTO carries a server-computed `authored_by_viewer: boolean` (genesis `actor_id` = session `userId`; `true`
    when the author id is null, so the UI fails closed). The admin UI DISABLES Publish when it is `true` (so the author is
    not sent through an OTP to meet a 409), with the reason shown.
  - Consequence (stated in the UI, AC12's exact sentence): a Pariwar with ONE `pariwar_admin` and no `super_admin`
    granted IN that Pariwar (G7 — grants are per-Pariwar rows) cannot publish a module. The ground is ADR-0019 (RATIFIED) invariant (b); acceptance of the single-admin
    outcome rests on the identical consequence PO-deferred on 2026-07-30 for news and restated for banners (`-422` Q1 A
    is a contrasting precedent — §0 edge 3). ⛔ weaken the gate, ⛔ mint a second grant. **ASK: confirm that precedent
    covers modules** (re-trigger unchanged: a single-admin Pariwar observed in practice).
- **QE10 — Step-up scope:** publish ONLY. Withdraw (archive) is the safe direction (an offer comes down — the banner
  `retract` precedent); partner create / author change ⛔ member-reachable state. ⛔ step-up on them.
- **QE11 — The secret NAME is validated for shape only** (G11; the WA / Telegram precedent). ⛔ existence check — the
  only API reads the secret VALUE into the API process. The wizard says: *"The Secret Manager secret must exist before
  leads are sent (a later release). This is its NAME, never the key."* → 12.5: check existence / resolution at send.
- **QE12 — Display-text policy (builds R3D1's name/description leg — Closed by the build commit at Task 10, BEFORE the first module is stored).**
  - ⚠ Do NOT tighten the SHARED `moduleNameSchema` / `moduleDescriptionSchema` — they also define
    `ModuleAuthoredPayloadSchema`, which `foldModuleProjection` re-parses (TR16). Keep them on 12.1's storage rules (a
    tolerant reader; the stricter WRITE rules are a subset of the laxer payload rules).
  - ADD write-only schemas in `filters.ts` — `moduleDisplayNameEnSchema`, `moduleDisplayNameHiSchema`,
    `moduleDisplayDescriptionEnSchema`, `moduleDisplayDescriptionHiSchema` (same lengths as 12.1; each KEEPS 12.1's
    `storableText` refine — NUL + unpaired surrogates — and ADDS the rules below) — and use them ONLY in
    the manifest input schema (`parseModuleManifest`) and the partner-name schemas (`partnerDisplayNameEnSchema` /
    `…HiSchema`, 1–120). Rules, checked on the RAW string before trimming:
    - refuse C0 controls (U+0000–U+001F, U+007F) — EXCEPT U+000A (line feed) inside descriptions; U+000D is refused (the
      admin client normalises CRLF → LF before sending);
    - refuse C1 controls (U+0080–U+009F);
    - refuse bidi controls (U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069);
    - refuse invisible formatters U+200B, U+2060, U+FEFF, U+00AD;
    - ⭐ ALLOW U+200C / U+200D (ZWNJ / ZWJ — Devanagari conjunct control);
    - require at least one letter or digit (`/[\p{L}\p{N}]/u`) — a blank-looking value is refused;
    - `*_hi` fields must contain at least one Devanagari LETTER: `/(?=\p{Script=Devanagari})\p{L}/u` — "LIC टर्म
      प्लान" passes; "LIC" and "LIC ।" (danda only) are refused (Story 2.1: member-facing copy needs Hindi).
  - Test vectors put each refused character in an INTERIOR position (`.trim()` strips the edges).
  - **RPD1:** this is a tightening made BEFORE any module is stored. Record it in the author-commit decision entry, and
    as a dated amendment line in ADR-0044 (status `drafted`) under D3 (top-level fields) / D4 (grammar) — QE20.
    After 12.2 ships, ANY further tightening of a schema the genesis payload re-parses triggers RPD1 (read capacity
    through a narrow `{ slot_capacity }` schema in `foldModuleProjection`, or bump to `version: 2`). RPD1 → Resolved
    via explicit deferral; re-trigger narrowed to "the first tightening after 12.2 ships".
- **QE13 — Ids are server-minted (C13 (b)).** `module_id` and `partner_id` are `randomUUID()` (lower-case) INSIDE
  `withIdempotency`, so a retried request with the same `Idempotency-Key` returns the SAME id (the recorded result).
  The body carries ⛔ id of the thing being created. Idempotency keys are namespaced (the store is global — `0012`
  "Callers namespace tenant operations into the key string"):
  - `module.author:${pariwarId}:${actorId}:${key}`
  - `module_partner.create:${pariwarId}:${actorId}:${key}`
  - `module.publish:${pariwarId}:${actorId}:${moduleId}:${key}`
  - `module.withdraw:${pariwarId}:${actorId}:${moduleId}:${key}`
  A failed attempt RELEASES the key, and the retry mints a NEW id — correct, because nothing committed. ⚠ Accepted
  residual: an ambiguous COMMIT, or a `recordResult` failure after COMMIT, releases the key and the retry creates a
  second draft (harmless — a draft reaches nobody; the admin withdraws it). Carried, ⛔ built (the memorial read-back
  shape is the fix if it is ever observed).
- **QE14 — Actor mapping.** Every admin-session write uses `actor: 'operator'`, `actorId` = the session `userId`. The
  `trustee` actor value stays unused by 12.2 (admin sessions carry grants, ⛔ a trustee identity); `trustee_archived`
  under `operator` is legal (only `system` is refused). The sweep uses `system` / `null`.
- **QE15 — Withdraw.** `POST …/modules/:moduleId/withdraw` (body `{}` — DTO `z.object({}).strict()`: the admin client
  sends `content-type: application/json` on EVERY call (`apps/admin/src/api/client.ts` `apiFetch`) and Fastify answers
  400 to an EMPTY JSON body — [[project_fastify_empty_json_body_400]]; the fetcher sends `JSON.stringify({})`, API
  tests send `payload: {}`) → `archiveModule(…, { reason: 'trustee_archived' })`, any
  `module.manage` holder (the author included), from `draft` / `scheduled` / `active`; ⛔ step-up (QE10).
  - **C10 warning:** the detail read returns `lead_count` (`countModuleLeads` — `count(*)` of `module.lead_submitted`
    on THIS stream, bounded by the `stream_id` index). When `lead_count > 0`, the UI shows, before Withdraw AND before
    "Start a corrected copy": *"N members registered interest in this offer. A corrected copy starts with all places
    free; those members can register again, and the partner may receive a second lead for the same member."* (In 12.2,
    `lead_count` is always 0 — ⛔ lead route.)
- **QE16 — List cursor (builds RVD6 — Closed by the build commit at Task 10). ⭐ AMENDED by BigDev, 2026-11-01 (Task
  0.2): *"QE16 needs the strict base64url validation amendment before the implementation begins."* — the strict decode
  below is that amendment.** A NEW `pageModulesForPariwar(db, pariwarId, { state?, limit?, after?: {
  createdAtExact: string; moduleId: ModuleId } }) → { items, nextCursor }` — the `listWorkplaceDistricts` /
  `pageWorkplaceDistricts` twin pair. ⚠ `listModulesForPariwar` is left UNCHANGED (12.1's `read.spec.ts` asserts its
  array-of-at-most-`limit` return, G17). The page read ALSO selects `createdAtExact: sql<string>\`created_at::text\``;
  the keyset compares in SQL `(created_at, module_id) < ($1::timestamptz, $2::uuid)` in the existing order; ⛔ OFFSET; ⛔
  round-trip through a JS `Date` (milliseconds only — it would SKIP rows; the `claim/correction-queue-read.ts`
  `createdAtExact` precedent). `next_cursor` = opaque base64url of `{ c: createdAtExact, m: moduleId }`, or `null`.
  Over-fetch one row with the `pageWorkplaceDistricts` form `clampLimit(limit + 1, { default: D + 1, cap: CAP + 1 })`
  INLINE (⛔ `.limit(NAMED_CONST)` — the `domain-accessor-invariants` gate).
  - ⚠ **Cursor validation happens in JS BEFORE any SQL** (`decodeModuleCursor` throws `ModuleCursorInvalidError` →
    400 `module.cursor_invalid`). ⭐ **STRICT base64url (BigDev's amendment)** — Node's `Buffer.from(s, 'base64url')`
    is LENIENT, verified on Node v22 (the repo's engine is `>=22.12.0`): it accepts the standard-alphabet `+` / `/`,
    `=` padding and a `len % 4 === 1` tail, SKIPS whitespace and junk characters (`"ab*cd"` decodes as `"abcd"`),
    ignores non-zero trailing bits (`"YR"` and `"YQ"` both decode to `"a"`), and `.toString('utf8')` turns invalid
    UTF-8 into U+FFFD; `JSON.parse` lets a DUPLICATE key win silently (`{"c":"a","c":"b"}` → one key), which would
    slip past an "exactly `c` and `m`" key check. So `decodeModuleCursor(s)` runs, in order, each failure throwing
    `ModuleCursorInvalidError`:
    1. `s` is a string of length 1–256 (a server-built cursor is ~110 chars; the DTO keeps a looser `.max(1024)` DoS
       bound, so an over-long but DTO-valid cursor still answers `module.cursor_invalid`, NOT a Fastify 400) matching
       `/^[A-Za-z0-9_-]+$/` — URL-safe alphabet ONLY, ⛔ `=`, ⛔ `+` / `/`, ⛔ whitespace — and `s.length % 4 !== 1`;
    2. `bytes = Buffer.from(s, 'base64url')`, then `bytes.toString('base64url') === s` — CANONICAL round-trip (rejects
       non-zero trailing bits and anything the decoder skipped);
    3. `text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)` — invalid UTF-8 THROWS (⛔ U+FFFD);
    4. `obj = JSON.parse(text)` inside `try`; `obj` is a plain object (⛔ `null`, ⛔ array), `Object.keys(obj)` is
       EXACTLY `['c', 'm']`, both values are strings, AND `text === JSON.stringify({ c: obj.c, m: obj.m })` — the
       canonical form the encoder writes (rejects duplicate keys, reordered keys, whitespace and escape variants);
    5. then the field checks below on `c` and `m`.
    The ENCODER is `Buffer.from(JSON.stringify({ c, m }), 'utf8').toString('base64url')` (Node emits NO padding —
    verified), so `decodeModuleCursor(encodeModuleCursor(x))` round-trips, and a unit test asserts it for a cursor
    with a 6-digit fraction, one with none, and one with a `+05:30` offset. `c` matches
    `/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?([+-])(\d{2})(?::(\d{2}))?(?::(\d{2}))?$/` (PG omits
    a zero fraction) AND every field is IN RANGE — year 2000–9999, month 01–12, day 01 to the month's length
    (`new Date(Date.UTC(y, m, 0)).getUTCDate()`), hour 00–23, minute / second 00–59, offset hour 00–15, offset minute /
    second 00–59 (a regex-shaped but out-of-range value — `2026-13-01 …`, `2026-02-30 …`, `… 25:00:00+00`, offset
    `+16` — passes the shape and raises 22008 / 22009 at the cast, i.e. a 500); `m` is a lower-case UUID. A cast failure on the hook's READ tx (22007 / 22008 / 22009 / 22P02) would abort it and answer 500, and
    the bare cast would also accept `'infinity'` / `'now'` / `'epoch'` — the precedent never validates because it only
    sees server-built cursors.
- **QE17 — ⭐ ASK (confirm) — ✅ CONFIRMED, as recommended (BigDev, 2026-11-01 — Task 0.2): no first partner needs
  role / cohort targeting — `role` / `cohort` stay ABSENT.** FR-66 lists "member filters (state, role, cohort)"; no
  first partner is recorded as needing role or cohort targeting, so D8's condition ("the first surface that MUST target
  …") is ⛔ met; ⛔ attribute is raised. FR-66 variance recorded; the scope step offers `members-all` / `state` /
  `district` only, with the line *"Targeting by role or cohort is not available."* **ASK: confirm no first partner
  needs it** — if one does, the story returns to create-story (a member attribute + its producer, raised WITH that
  requirement per D8).
- **QE18 — Error mapping + validation layering.**
  - **Request DTOs are SHAPE-only** (types, `.strict()`, presence, generous max lengths as DoS bounds). The DOMAIN is
    the single content validator, so content refusals surface as the codes below (⛔ a Fastify 400 for a rule the DTO
    happens to mirror). ⚠ **Shape includes every id a pre-check puts into SQL:** the author DTO declares `partner_id:
    z.string().uuid()` (a non-UUID would reach the pre-check SQL, raise 22P02, abort the write tx and answer 500);
    path ids are `.uuid()` params; the cursor is decoded in JS first (QE16).
  - **Pre-checks — on the WRITE `scopeTx`, after `openScopeTx`, BEFORE `withCompensatingAudit` (⛔ audit line):**
    unknown partner → 422 `module.partner_unknown`; QE5's scope refusals; partner-name refusal — the handler calls the
    PURE `parsePartnerDisplayNames({ displayNameEn, displayNameHi })` HERE (⛔ inside `createPartner`, which runs in
    `mutate`) → 422 `module_partner.name_invalid` (details: issue paths); publish on a non-`draft` → 409
    `module.not_draft`; publish on a module NOT visible in this Pariwar (the pre-read returns no row under RLS —
    another Pariwar's id or an unknown id) → 404 `module.not_found` (withdraw reaches the same code through
    `ModuleGenesisMissingError`, inside the wrapper); publish with `now() ≥ valid_until` → 409 `module.window_ended`;
    the tone gate (QE9, its own
    `publish_blocked` line).
  - **Inside the wrapper** — `mapModuleError(err): never` (`apps/api/src/modules/marketplace/errors.ts`) maps to
    `ApiError` (`new ApiError(status, code, message, details)` — ⛔ 422 subclass exists); `withCompensatingAudit` has
    already written `_rolled_back` (it rethrows), so mapping inside `mutate` or in the outer `catch` both keep the line.
    The central mapper is ⛔ touched. The pre-check refusals are typed domain errors (Task 3) mapped by the SAME
    function, so every row below — the pre-check ones included — is a row of `mapModuleError`.

  | Domain error / condition | HTTP | code |
  |---|---|---|
  | `ModuleManifestInvalidError` | 422 | `module.manifest_invalid` (details: each zod issue's `path` + `message`) |
  | `ModuleOutsideWindowError` at author | 422 | `module.window_ended` |
  | `ModuleOutsideWindowError` at publish | 409 | `module.window_ended` — defensive only: the pre-read and the command share ONE transaction, hence one `now()` (TR3) |
  | `ModuleIllegalTransitionError` on publish | 409 | `module.not_draft` (a racing publish / withdraw) |
  | `ModuleIllegalTransitionError` on withdraw | 409 | `module.illegal_transition` |
  | `ModuleGenesisMissingError` | 404 | `module.not_found` |
  | module not visible at the publish pre-read (pre-check — the handler throws 12.1's `ModuleGenesisMissingError(moduleId)` BEFORE the wrapper; NO new class) | 404 | `module.not_found` |
  | `ModuleArchiveReasonNotSatisfiedError` | 409 | `module.archive_not_allowed` |
  | `ModuleStreamConcurrencyError` | 409 | `module.concurrent_change` (⛔ retried by 12.2 — RVD2) |
  | `ModuleGenesisAlreadyExistsError` | 409 | `module.already_exists` (unreachable with server-minted ids) |
  | 23505 `marketplace_module_publications_pkey` | 409 | `module.already_published` |
  | 23505 `marketplace_partners_pariwar_name_en_unique` | 409 | `module_partner.name_taken` |
  | `ModulePartnerUnknownError` (NEW, pre-check) | 422 | `module.partner_unknown` (details: `{ partner_id }`) |
  | `ModuleScopeRequiresGeoTreeError` (NEW, pre-check) | 422 | `module.state_scope_requires_geo_tree` (details: `{}`) |
  | `ModuleScopeValueUnknownError` (NEW, pre-check) | 422 | `module.scope_value_unknown` (details: `{ scope, values: string[] }` — the offending values) |
  | `ModulePartnerNameInvalidError` (NEW, pre-check) | 422 | `module_partner.name_invalid` (details: `{ issues: { path, message }[] }`) |
  | `ModuleCursorInvalidError` (NEW, read) | 400 | `module.cursor_invalid` (details: `{}`) |
  | missing / over-long (> 200) `Idempotency-Key` | 400 | `module.idempotency_key_required` |
  | key claimed, ⛔ result yet | 409 | `module.idempotency_in_progress` |
  | `ModuleStateDirectWriteError` (the 0193 trigger; a bug) | 500 | `module.state_direct_write_rejected` (`MODULE_STATE_DIRECT_WRITE_CODE`; logged at error — the central `ClaimStateDirectWriteError` precedent, done locally; `packages/domain/src/index.ts` names this route as its mapper) |
  | `ModuleProjectorInputError`, `ModulePersistError` | rethrow → 500 | — (a bug) |
  | anything else (incl. `ToneReviewRequiredError`, `ApiError`, `StepUpRequiredError`) | rethrown UNCHANGED, never wrapped — the central mapper answers it (409 `tone_review.required`; an unknown error → 500) | — |
- **QE19 — ⛔ roster row, ⛔ go-live fence; one dated note on Row 26.** 12.2 sends nothing to members or partners (I8).
  Admin step-up's stub delivery is pre-existing (G8). ⚠ The sweep (QE7 (A)) IS a new dependence on roster **Row 26
  `jobs-db-role`** (OPEN — G13): its unscoped cross-tenant scan returns rows only under a BYPASSRLS login inheriting
  `twt_service` (what QE7's grant is for); under criterion (a)'s first example posture (an RLS-bound, ⛔ BYPASSRLS
  login) it would see ⛔ row and activate nothing,
  SILENTLY. ⇒ the tick checks `smsDelivery.canReadAcrossPariwars` FIRST and, if false, raises ONE
  `module_activation.rls_bound_role` alarm and ends (the 6.37b / 6.37c / 6.31 guard precedent), and Task 0.4 appends a
  dated note to Row 26 naming `module-activation`, its `twt_service` SELECT, UPDATE grant, the zero-row failure mode and
  the guard — ⛔ a new closure leg, ⛔ a new row (the 6.27c "Row 26 applies to … every other jobs sweep" precedent).
- **QE20 — ⛔ new ADR; ADR-0044 is amended IN PART.** The flow (QE1) follows ADR-0044 (immutable manifest) and ADR-0019
  (tone gate); the new tables follow C12. ⚠ ADR-0044 goes stale under 12.2 in SIX places:
  - **D5 sentence 1** — "The DB enforces only six named CHECKs" — 12.2 adds a composite FK on `(pariwar_id,
    partner_id)` and a `(pariwar_id, module_id)` unique;
  - **D5 sentence 2** — "Every other content rule is validated once, at write, by `marketplace.parseModuleManifest`, and
    the genesis payload schema reuses the same field schemas." — BOTH halves become false: QE12's display rules live
    in WRITE-ONLY schemas the genesis payload does ⛔ reuse (TR16), and QE5's scope-value membership is checked at the
    12.2 route, ⛔ by `parseModuleManifest`;
  - **D2** — "`pariwar_id uuid NOT NULL`, with ⛔ foreign key (there is ⛔ `pariwars` table)" stays TRUE (it denies a
    `pariwars` FK; the new FK targets `marketplace_partners`) but gets a clarifying line so it is not misread;
  - **D3 / D4** — record 12.1's pre-storage tightenings (RV3 / RV5 / RV7, RP1, R3-4, R3-6, R4-1 — RPD1 asks for this
    line and it does not exist yet) AND QE12's;
  - **Consequences** — "`commission_terms` … are ⛔ in v1 (carried to 12.2 …)" → the QE6 re-trigger;
  - **Alternatives** — the revise-event "Re-trigger: Story 12.2, if editing proves necessary" → QE1's re-trigger; the
    role / cohort "which Story 12.2 MAY be" → "checked by Story 12.2 — condition NOT met (QE17)".
  ADR-0044 is still `drafted`, so the author-commit records "ADR-0044 amended IN PART by `-NNN`: D5 (both sentences);
  D2 clarified; D3 / D4 recorded; Consequences and Alternatives re-pointed" AND the ADR gets a dated amendment line at
  each of the six places in the records commit (Task 0.4). The author-commit records QE1–QE22.
- **QE21 — RVD2 (trigger MET: 12.2 is the first production caller of a module command) → Resolved via explicit
  deferral.** Rationale: 12.2 maps `ModuleStreamConcurrencyError` to 409 `module.concurrent_change` and retries ⛔
  author / schedule / activate / archive, so a drift is surfaced, never looped. Re-trigger: the first LEAD caller (12.3 /
  12.5), where `submitModuleLead`'s internal retry makes drift a loop. **Cost (stated):** after a drift EVERY transition
  throws (RVD2 — `archiveModule` included), so a drifted module can NEVER be withdrawn — once 12.3 ships, an offer
  stuck live; the 409 `module.concurrent_change` is the only signal.
- **QE22 — RPD4: ONE standing test.** `packages/domain/tests/marketplace/no-audit-wrapper-in-domain.test.ts` asserts
  that no `.ts` file under `packages/domain/src/marketplace/` contains `withCompensatingAudit(` outside comments (cheap;
  it guards the exact regression QE7 could have introduced). 12.1's "no evaluator exported", I7 and I8 stay grep-only —
  Resolved via explicit deferral, re-trigger: the first regression of either. 12.1's I6 is RE-STATED in Completion Notes
  as "the lead commands have ⛔ production caller" (author / schedule / activate / archive now do).

## Invariants (I)

- **I1** — Every 12.2 module write goes through a 12.1 command on a `pg.PoolClient`; NO 12.2 code writes
  `marketplace_modules` directly, and NO file under `apps/` imports `schema.marketplaceModules` (RVD3's trigger) — the
  12.1 trigger + `marketplace-module-state:check` stay green, unchanged.
- **I2** — Every module / partner write (route AND sweep) runs in its own READ COMMITTED transaction whose COMMIT happens
  INSIDE `withCompensatingAudit`'s `mutate` (the memorial Send placement, G6). Route: `await closeScopeTx(scopeTx, true)`
  ends `mutate`, with `finally { closeScopeTx(scopeTx, false) }`. Sweep: `mutate` is a `withPariwarScope(...)` call,
  which COMMITs inside its callback (`closeScopeTx` does NOT exist in apps/jobs). NO write rides `request.scopeTx`.
  `recordToneReviewSignoff` and the idempotency `recordResult` run AFTER the wrapper returns.
- **I3** — `module_id` and `partner_id` are minted by the server, never read from the request body (QE13).
- **I4** — The publisher is never the author: a publish whose actor equals the `module.authored` event's `actor_id`, OR
  whose module has a NULL author `actor_id`, is refused with 409 `tone_review.required`, and a
  `tone_review.publish_blocked` line is emitted.
- **I5** — Publish requires a fresh `module_publish` step-up; NO other 12.2 route requires one.
- **I6** — Every stored scope value was, at author time, byte-equal to a `state` / `district` node of the tree in force
  or (when there is NO tree) to a listed workplace district; `state` scope is never stored without a tree state node.
- **I7** — `marketplace_modules` gains NO column; the 0193 trigger and `GUARDED_COLUMNS` are unchanged. The two new
  tables are insert-only (NO UPDATE / DELETE grant to `twt_app`); both FKs are composite on `pariwar_id`.
- **I8** — Nothing reaches a member or a partner: NO member route, NO lead route, NO outbound call;
  `submitModuleLead` / `checkModuleLeadAllowed` still have NO production caller.
- **I9** — `PERMISSION_CATALOG_VERSION` moves by exactly ONE, adding exactly `module.manage`; NO role is added.
- **I10** — NO commission data is stored anywhere (QE6 (A)/(B)); NO partner colour reaches any rendered surface (C5).
- **I11** — No file under `packages/domain/src/marketplace/` calls `withCompensatingAudit` (QE22).

## Acceptance Criteria

0. **AC0 — governance first.** QE1–QE22 carry BigDev's answers (Task 0.2) and are recorded in ONE author-commit
   decision (≥ `-433`), committed ALONE before any code, including — if QE6 (A)/(B) — the explicit amendment of BOTH
   `-427` QE5 ("12.2 … chooses an admin-only home") and `-429`'s "routed if 12.2 cannot reconcile them", each quoted in
   full; the records of Task 0.4 follow. If QE6 (B) is chosen, the routing note is written from the template (§0 first)
   and is NOT "told" until BigDev sends it ([[feedback_shown_to_panel_means_sent]]).
1. **AC1 — migration.** **Given** the new migration is applied, **then**:
   - `marketplace_partners` and `marketplace_module_publications` exist exactly as QE3 / QE4 (columns, NOT NULLs,
     CHECKs, the named uniques / unique index), `twt_app` has SELECT + INSERT only on each, RLS is ENABLE + FORCE with
     the named select / insert policies on `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;
   - `marketplace_modules` has `marketplace_modules_pariwar_module_unique`, `marketplace_modules_partner_fk` (composite)
     and (QE7 (A)) `marketplace_modules_scheduled_valid_from_idx` with `WHERE current_state = 'scheduled'`;
   - (QE7 (A)) `has_table_privilege('twt_service', 'marketplace_modules', 'SELECT')` and `…'UPDATE'` are true, AND
     `…'INSERT'` and `…'DELETE'` are false;
   - a live spec proves: a guarded RAW insert of a module naming another Pariwar's partner → 23503 with `constraint =
     'marketplace_modules_partner_fk'`; an `authorModule` naming an unknown partner → `ModulePersistError` with
     `.sqlstate = '23503'`; a publication row naming another Pariwar's module → 23503; `"LIC"` then `"lic"` in one
     Pariwar → 23505 `marketplace_partners_pariwar_name_en_unique`; UPDATE / DELETE on either new table → 42501;
     cross-tenant SELECT sees nothing; an unscoped session sees nothing.
2. **AC2 — permission.** `module.manage` is in `SEED_PERMISSION_KEYS` (version bumped by one, LIVE-read), held by
   `pariwar_admin` and `super_admin` only (`roles.test.ts` holder set), and every 12.2 route answers 403 for an admin
   without it and 404 for a Pariwar where the admin has NO grant (scope hook). `district_admin` / `state_trustee` /
   `trustee_panel` are NOT holders (asserted).
3. **AC3 — partners.** `GET …/modules/partners?limit=` (int 1–200, default 200; NO cursor — a Pariwar with more than 200
   partners is carried, Dev Notes) lists the Pariwar's partners by `lower(display_name_en)` as `{ items }`; `POST
   …/modules/partners` (Idempotency-Key) creates one with a server-minted id under the I2 shape
   (`module_partner.created`, `module_partner/<id>`); a replay with the same key returns the same partner; a duplicate
   English name (any case) → 409 `module_partner.name_taken`; QE12's rules → 422 `module_partner.name_invalid` with NO
   audit line (the pure `parsePartnerDisplayNames` pre-check, QE18).
4. **AC4 — scope options + C11.** `GET …/modules/scope-options` returns QE5's shape for (i) a Pariwar with a tree (states
   + districts with parents), (ii) a districts-only tree (`states: []`), (iii) NO tree, with listed workplace districts
   (`district_source: 'workplace_districts'`, `districts_truncated` per `hasMore`), (iv) NO tree and NO listed district
   (both empty), (v) a value of 121–128 chars (`usable: false, 'too_long'`). **And** `POST …/modules` refuses `state`
   when the tree has NO state node (422 `module.state_scope_requires_geo_tree`) and any value that is not a recorded
   place (422 `module.scope_value_unknown`) — each with NO audit line and NO event — while a listed district BEYOND the
   first 200 is ACCEPTED (exact-match check). A malformed `scope_filter` skips the pre-check and is refused by the
   domain (422 `module.manifest_invalid`).
5. **AC5 — author.** `POST …/modules` (Idempotency-Key) with a valid body creates a `draft` via `authorModule` under the
   I2 shape (`module.authored`, `module/<id>`, actor `operator`), returns `{ module_id, state: 'draft' }`; a replay
   with the same key returns the same id and NO second stream; the body carries NO `module_id`; `branding_bundle` is
   QE8's all-null bundle; a non-UUID `partner_id` → 400 (DTO shape — NOT a 500); an unknown partner → 422
   `module.partner_unknown` (NO audit line); a manifest the domain refuses → 422 `module.manifest_invalid` with issue
   paths, and the intent + `module.authored_rolled_back` lines exist; `valid_until ≤ now()` → 422
   `module.window_ended`.
6. **AC6 — publish.** On a `draft`:
   - without step-up → 403 `auth.step_up_required` (`details.action = 'module_publish'`), NO event;
   - by the author (with step-up) → 409 `tone_review.required`, a `tone_review.publish_blocked` event on
     `t.toneReviewAuditSink` carrying the Pariwar id, NO module event, NO publication row; the same when the genesis
     `actor_id` is NULL (a raw-seeded `system`-authored module — I4);
   - without any of the three `true` ticks → 400;
   - by a second `module.manage` holder with step-up: `valid_from ≤ now()` → `module.activated`, state `active`;
     `valid_from > now()` → `module.scheduled`, state `scheduled`; in BOTH, ONE publication row (QE4 hash, reviewer,
     `published_event_type`, both confirmations) in the SAME transaction as the event; the audit action equals the event
     type; a `tone_review.signoff` event (contentHash = the row's hash, locator `module/<id>`) on the capturing sink;
   - on a non-`draft` → 409 `module.not_draft`; with `now() ≥ valid_until` → 409 `module.window_ended`; another
     Pariwar's module id → 404 `module.not_found` (each with NO audit line).
7. **AC7 — withdraw.** `POST …/modules/:id/withdraw` (body `{}` — QE15) archives a `draft` / `scheduled` / `active`
   module with `trustee_archived` (actor `operator`, NO step-up), audit `module.archived`; an `archived` module → 409
   `module.illegal_transition`; another Pariwar's module id → 404 `module.not_found`. The detail read returns `lead_count` (0 here; QE15), and the UI shows the C10 warning
   when it is > 0 (an admin unit test with a mocked `lead_count: 3`).
8. **AC8 — reads.**
   - API: `GET …/modules` (`state?`, `limit` ≤ 200, `cursor?`) pages via `pageModulesForPariwar` (QE16): three modules
     authored through the API IN A PARIWAR NO OTHER LEG OF THE SPEC WRITES (a fresh `randomUUID()` Pariwar with its own
     two `pariwarAdmin` grants and partner — a page COUNT, unlike a membership check, breaks on foreign rows) page with
     `limit = 2` into two pages with NO duplicates and `next_cursor: null` on the last; a malformed cursor (bad base64,
     bad JSON, `=` padding, a `+` / `/` character, a duplicate `c` key, `c: 'infinity'`, `c: '2026-13-01 00:00:00+00'`,
     upper-case `m`) → 400 `module.cursor_invalid` (NOT a
     500). `GET …/modules/:id` returns the admin shape + partner names + author display name (a fallback label
     when `getDisplayName` returns null — NEVER a 500) + `authored_by_viewer` + publication (with the reviewer's display
     name, same fallback) or `null` + `lead_count`; both reads are tenant-isolated (another Pariwar's id → 404).
   - Domain LIVE spec `read-cursor.spec.ts` (NOT a unit test), in a FRESH Pariwar (`randomUUID()` — there is no
     `pariwars` table, so any UUID is a tenant; seed its partner first; own-committing specs write PARIWAR_A /
     PARIWAR_B in parallel): five modules authored in ONE transaction (identical `created_at` — the `module_id`
     tiebreak is what is tested) page over three pages with `limit = 2`, NO duplicates or gaps; two rows 100 µs apart in
     the same millisecond (seeded, in that fresh Pariwar too, by a guarded raw-insert VARIANT that sets `created_at`
     explicitly — `authorModule` cannot, `created_at` is `DEFAULT now()`) are both kept;
     `listModulesForPariwar` and its 12.1 `read.spec.ts` legs are unchanged and green.
9. **AC9 — activation (QE7 (A); Task 0.3 rewrites this AC for (B) / (C)).** A `scheduled` module whose `valid_from` has
   passed becomes `active` on the next tick, actor `system`, audit intent `actorId: null`; a module withdrawn between
   selection and activation (the test selects, withdraws, then calls the exported `activateDueModule`) → `'skipped'`
   (NOT thrown out of the tick; its intent + `module.activated_rolled_back` lines exist — accepted); when the login
   cannot read across Pariwars (`canReadAcrossPariwars` stubbed `false`) the tick raises ONE
   `module_activation.rls_bound_role` alarm and activates nothing (QE19); a module whose `valid_until` passed is NOT selected; a second tick is a no-op for the test's own
   ids; the scan uses DB `now()` (the test drives it with `asOf`); the tick runs on its own pool. Every assertion is on
   the test's OWN module ids (the real scan is cross-tenant and spec files run in parallel).
10. **AC10 — display text (QE12).** The write-only schemas refuse each listed character class at an INTERIOR position
    and a blank-looking value; accept ZWJ / ZWNJ inside Devanagari and LF inside a description; refuse a `*_hi` value
    with NO Devanagari letter (incl. `"LIC ।"`) — each a test vector; partner names use the same rules;
    `ModuleAuthoredPayloadSchema` is NOT changed (a 12.1 `events.test.ts` vector that the new rules would refuse still
    parses).
11. **AC11 — admin wizard.**
    - The wizard opens with: *"Your answers stay on this page until you press Create draft. Reloading or leaving the page
      loses them."* (QE1).
    - Steps a–f render in order with per-step validation (Next is disabled with the reason shown).
    - Step (b): "All statuses" vs "Only these statuses", with NO default; labels — `pending-kyc` "Waiting for KYC",
      `pending-fee` "Waiting for the joining fee", `pending-valid` "Lock-in over — waiting for a trustee to check
      identity", `lock-in` "In the lock-in period", `active` "Active", `active-in-grace` "Active (grace period)",
      `lapsed-unpaid` "Lapsed (unpaid)"; the eligibility sentence renders. When "Only these statuses" is picked it shows
      *"No member can be in these statuses yet: Lock-in over — waiting for a trustee to check identity; Active; Active
      (grace period); Lapsed (unpaid). The step that ends the lock-in period is not built yet."* (G18), and when EVERY
      ticked status is one of those four, the warning *"This offer reaches no member for now."*
    - Step (c): the scope picker (search, multi-select, `too_long` options disabled with the reason, `state` hidden when
      `states` is empty and `district` hidden when `districts` is empty — each with its reason; the truncation notice;
      the role/cohort line *"Targeting by role or cohort is not available."*; the sentence *"Members with no recorded
      workplace district are not reached by a state or district audience."*; and, for a district audience, *"Members
      whose recorded workplace district is not one of the places listed here are not reached by a district
      audience."*).
    - Step (d): `datetime-local` converted with a COPY of the private `toIsoOrNull` (a UTC `Z` ISO string; NEVER `new
      Date('')`), refuses `until ≤ from` and a year < 2000, shows the IST rendering.
    - Step (e): "Unlimited places" vs a positive whole number. Step (f): URL + secret NAME with the QE11 copy.
    - Summary: the bilingual text preview (`lang="hi"`, TWT chrome only — NO partner colour) and the plain-language
      audience, window and places — the audience and status lines are EXACTLY the Policy-meaning strings (members-all;
      the state / district list; "No status restriction …"; the left-or-erased line; "An audience that matches no member
      reaches nobody."); "Create draft" posts with an Idempotency-Key minted once per wizard session (reused on
      retry); a 422 maps each issue back to its step. "Start a corrected copy" pre-fills from an existing module.
12. **AC12 — admin detail + publish.** The detail page shows state, the manifest in plain language, author, publication,
    and the line *"Members cannot see offers yet. The member offer shelf comes in a later release."* Publish shows three
    required ticks — "I have reviewed this copy against every section of the TWT tone-review checklist (voice; register;
    prohibited frames; grief context; reviewer attestation), and I am not its author", "I have reviewed the Hindi text",
    "The partner agreement for this offer is signed and includes TWT's visual-discipline term". When
    `authored_by_viewer` is `true`, Publish is DISABLED with *"Another admin must review and publish this offer — you
    wrote it."* and the line *"A Pariwar with only one admin cannot publish an offer: another admin, or a super admin
    granted in this Pariwar, must review and publish it."* (G7: grants are per-Pariwar). On 403
    `auth.step_up_required` it shows the reused `StepUpPanel` with
    `MODULE_PUBLISH_STEP_UP_CONTEXT`, then retries ONCE; a 409 `tone_review.required` shows the same author sentence.
13. **AC13 — gates.** OpenAPI paths for every new route are registered and `contracts:check-openapi-determinism` passes;
    every new route declares its 200 response schema (the pagination gate examines only routes that do — G7), and
    `login-wall.spec.ts` (every route carries `requireAdminSession`) AND `forced-pagination.spec.ts` (every collection
    GET declares a bounded `limit`) pass with the two list GETs among the routes it examined; the access-wrapper gate
    scans `apps/api/src/modules/marketplace` and `packages/domain/src/marketplace` under its compensating-audit
    invariant ONLY, with a recorded revert (a bare `audit.writeAuditEntry(...)` in the marketplace handler turns `pnpm
    access-wrapper:check` RED); `marketplace-module-state:check` stays green; the QE22 test passes; a contracts test
    asserts the re-declared tuples equal the domain's.
14. **AC14 — full gate.** `pnpm ci:local` is green on a fresh Postgres container, recorded in Completion Notes, with the
    I1 (`schema.marketplaceModules` under `apps/`) / I8 / I9 / I10 (NO `commission` identifier, column or DTO field in
    the migration, the two NEW schema files or the contracts DTOs — comments excluded; `schema/marketplace_modules.ts`'s
    re-pointed comment is expected) / I11 greps.

## Tasks / Subtasks

- [ ] **Task 0 — governance first (AC0).** ⭐ Do NOT write code before 0.1–0.3 are done and in the Debug Log.
  - [ ] 0.1 `git fetch origin`; rebase on `origin/main` if it moved. Re-grep NUMBERS on every ref and worktree (decision
        id, migration + journal `when`, `PERMISSION_CATALOG_VERSION` + key count, ledger letter in BOTH ledgers).
        Re-verify G1 (signatures; the shared name schemas), G3, G6 (both twins' COMMIT placement), G8, G9, G13
        (`twt_service` grants), G14 (`ACCESS_SURFACE_ROOTS` feeds both invariants), G17. Run 0.1 again at each numbered
        commit.
  - [ ] 0.2 Put QE1–QE22 to BigDev with the five ASKs first (QE3, QE6, QE7, QE9, QE17). Record the answer verbatim.
        ⭐ **PARTLY DONE (2026-11-01, during `bmad-create-story validate 12.2`).** BigDev, verbatim:
        *"QE16 needs the strict base64url validation amendment before the implementation begins.
        QE3, QE6, QE7, QE9, QE17 AS RECOMMENDED."* ⇒ QE3 (A), QE6 (A), QE7 (A), QE9 confirmed, QE17 confirmed — the
        Task 0.3 rewrite map is NOT triggered; QE16 AMENDED (the strict decode, written into QE16 in v1.4). ⚠ STILL
        OWED here: BigDev's acceptance of the other sixteen recommendations (QE1, QE2, QE4, QE5, QE8, QE10–QE15,
        QE18–QE22) — not given yet, so not recorded as given ([[feedback_record_unattested_no_backfill]]). Tick 0.2
        only once that is recorded.
  - [ ] 0.3 Author-commit `≥ -433` (re-grep): QE1–QE22 as answered, the §0 table, the key + holder set, the explicit
        amendments of `-427` QE5 AND `-429` (QE6 — each quoted in full), the amendment of `-429` C11 in part (QE5 — C11
        quoted in full), the ADR-0044 amendment set (QE20 — D5 both sentences, D2, D3 / D4, Consequences, Alternatives),
        the two-deed-drafts fact (QE6), the consequences (one migration, one key, NO new ADR, NO roster row, one dated
        note on roster Row 26 — QE19). Commit it ALONE:
        `governance: decision 2026-11-01-NNN — AUTHOR-COMMIT: Story 12.2 build decisions QE1-QE22`.
        **If an ASK takes a non-recommended option, ALSO rewrite the story (the next version) before code:**
        - QE3 (B) → drop the partner table, the FK, AC1's partner legs, AC3, Task 2.1 / 3.2, `PartnerPicker`, AND: QE4's
          content hash loses `partner_display_name_en/hi` (`moduleToneContentHash(module)`); AC5's
          `module.partner_unknown` leg; the QE18 rows `module.partner_unknown` / `module_partner.name_taken` /
          `module_partner.name_invalid`; QE13's `module_partner.create` namespace; the partner routes in Task 5.1 and the
          detail DTO's partner names; I7's "both FKs are composite" (one FK remains); Task 2.4 (a)–(e)'s partner seeding
          and TR20's seeding clause; the Names-table partner rows. QE3 (C) → drop the FK and its AC1 leg, Task 2.4 (d)'s
          "one `f`" (zero) and I7's partner-FK clause;
        - QE6 (B) → Task 0.4 ALSO writes
          `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-01-12-2-partner-fee-disclosure.md` from
          the template (§0 first; THE ONE FACT names both deed drafts and that which governs is unrecorded; it quotes
          deed 20(i) and objects v4 ¶B.5); the `commission_terms` deferred item records "routing note WRITTEN, not yet
          SENT"; the deferral's re-trigger becomes the Panel's answer;
        - QE6 (C) → a new table + AC + read rule, I10 rewritten;
        - QE7 (B) → AC9 becomes "enqueue AFTER COMMIT, `startAfter = valid_from`, `singletonKey = module_id`; the worker
          activates if still `scheduled`"; Task 5.2 adds the enqueue; Task 6 becomes a worker; NO partial index (Task 2.4
          (d) lists FOUR indexes); the `twt_service` SELECT, UPDATE grant, the Row 26 guard and the Row 26 note ONLY if
          the worker runs under the service login; the Names "Job" row, I2's "Sweep:" clause, QE19's sweep sentence, Task
          3.6, TR23, the Dev Notes "Current state" index / grant clause, the Testing-standards "Jobs" bullet and Task
          0.4's C2 entries are rewritten. QE7 (C) → AC6's future-start
          leg becomes 422 `module.publish_before_start` (ADD it to the QE18 table and `mapModuleError` — a pre-check, NO
          audit line); AC9, Task 6, Task 3.6, the index (Task 2.4 (d) lists FOUR), the grant, the Row 26 guard and note,
          the Names "Job" row, I2's "Sweep:" clause, QE19's sweep sentence, TR23, the Dev Notes "Current state" index /
          grant clause and the Testing-standards "Jobs" bullet are deleted; C2 (b) stays with
          12.6 (Task 0.4's C2 entries say so);
        - QE9 (not confirmed) → stop; the single-admin question is routed per §0;
        - QE17 (a partner needs role / cohort) → the story returns to create-story.
  - [ ] 0.4 Records (one commit), using [[feedback_closure_language_precision]]. ⚠ The closure vocabulary is exactly
        THREE labels — "Closed by [edit]" / "Resolved via explicit deferral" / "Not addressed" — and it is NOT delegated
        (`-210` cl.2, Trustee-ratified), so Task 0.4 mints NO fourth label. It runs BEFORE any code, so it NEVER writes
        "Closed by":
        - **Items 12.2 will BUILD get NO closure label** — only a dated status line, LEG by LEG: *"2026-11-01 — being
          built by Story 12.2 (QE-n), this leg only: …; still open"*. The legs: C11 (QE5); C12's "12.2's review
          status" leg (QE4 — 12.3's curated rank stays open); C13 "two caller obligations" (a)+(b) (I2 / QE13); R3D1's
          names/descriptions leg (QE12) and its scope-value leg at the 12.2 route (QE5); RPD4's AC5 leg (the QE22 test)
          and its I6 leg ("re-stated in Completion Notes by Story 12.2 — QE22");
          RVD6 (QE16); C5's 12.2 half (I10); C10's 12.2 half (QE15); C2 (b) + C2 (d)'s `(valid_from)` index + C2 (e)
          (QE7 (A); C2's recorded cost "up to a day" becomes "up to 5 minutes" — C2 (a), (c), the `(valid_until)` index
          and the reason-precedence rule stay 12.6's); RVD5's activation leg (QE7 (A) — `classifyActivationOutcome`;
          its archive leg stays 12.6's); D10-1.4's `modules/` contract leg (Task 4);
        - **"Resolved via explicit deferral"** ONLY for real deferrals: RVD2 (QE21), RPD1 (QE12 — re-trigger narrowed),
          the revise event (QE1), R3D1's scope-value leg for non-12.2 callers (QE5), RPD4's AC7 / I7 / I8 legs (QE22 —
          re-trigger: the first regression of any of them), D10-1.4's `partners/` leg (12.2's partner DTOs live in
          `modules/`, on tenant routes — re-trigger: 12.5's per-partner keys or the v2 partner portal), `commission_terms`
          (QE6 — and re-point the "chooses an admin-only home" wording in `deferred-work.md`, the epics.md INHERITED note
          AND the `schema/marketplace_modules.ts` comment (Task 2.3) to the `-NNN` amendment);
        - **"Not addressed"** for anything left as is — INCLUDING `role`/`cohort`, which keeps `-103` D8's deliberate
          label, plus a dated line *"2026-11-01 — Story 12.2 checked D8's condition: NOT met (QE17)"*.
        Cite each item by its HEADING (⚠ the label C13 is used twice). Add a "Deferred from: story 12-2-…" section for
        what 12.2 carries (Dev Notes → Carried). `epics.md` — a "⭐ INHERITED FROM 12.2" note under 12.3, 12.5 and 12.6.
        ADR-0044 — a dated amendment line at each of QE20's six places. `docs/tone-review-checklist.md` — a "Partner
        module" row in the Publish-routing table (`module.manage`, Story 12.2).
        (QE7 (A)) `docs/launch-gate-inventory/inventory-roster.md` Row 26 — a dated note naming `module-activation`, its
        `twt_service` SELECT, UPDATE grant, the zero-row failure mode under an RLS-bound posture and the guard (QE19); NO
        new row,
        NO new closure leg.
- [ ] **Task 1 — permission (AC2).** `permissions.ts` (history comment, version +1, `'module.manage'` with a comment
      naming 12.2 and the inert-narrower-grant acceptance condition), `roles.ts` (`pariwar_admin`), the two rbac tests.
- [ ] **Task 2 — migration + schema + RLS (AC1).**
  - [ ] 2.1 `schema/marketplace_partners.ts`, `schema/marketplace_module_publications.ts` (header: insert-only, C12,
        QE3 / QE4), exported from `schema/index.ts`; `policies/marketplace-partners-rls.ts`,
        `policies/marketplace-module-publications-rls.ts` (named select / insert policies, NOT `for: 'all'`), exported from
        `policies/index.ts`.
  - [ ] 2.2 HAND-AUTHOR the migration (do NOT run `db:generate`; `--> statement-breakpoint`; hand-add the
        `_journal.json` entry with a `when` greater than every sibling's and a trailing newline), in this order:
        `marketplace_partners` (+ uniques, unique index, grants, RLS, policies); `marketplace_modules_pariwar_module_unique`;
        `marketplace_module_publications` (+ composite FK, CHECKs, grants, RLS, policies); `marketplace_modules_partner_fk`
        (both FKs `ON DELETE NO ACTION ON UPDATE NO ACTION` — QE3);
        (QE7 (A)) the partial index and `GRANT SELECT, UPDATE ON marketplace_modules TO twt_service` (with the 0091-style
        "Why twt_service gets SELECT, UPDATE" header). Header, locks: `ADD CONSTRAINT … UNIQUE` takes ACCESS EXCLUSIVE on
        `marketplace_modules`; each `ADD FOREIGN KEY` takes SHARE ROW EXCLUSIVE on BOTH its tables (the publications FK
        on `marketplace_module_publications` + `marketplace_modules`; the partner FK on `marketplace_modules` +
        `marketplace_partners`) and the partner FK VALIDATES existing rows — fine pre-production
        ([[project_not_in_production_merge_is_not_golive]]); ⚠ on a NON-fresh dev / test DB, leftover 12.1 rows (random
        `partner_id`, from own-committing specs) fail the validation with 23503 — delete them and their `events_log`
        streams first (superuser, `session_replication_role = replica`); fresh containers and CI are unaffected.
        (Naming: the repo's composite uniques mostly end `_uq` (0142 / 0143); this story keeps `_unique` for the names
        above — consistent with 12.1's `_pkey` / `_idx` set and with every reference in this file.)
  - [ ] 2.3 Update BOTH stale comments in `ids/index.ts`: the `PartnerId` brand's "⛔ FK until Story 12.2" and the
        nearby "partner identity is Story 12.2's (⛔ FK in 12.1)" → name `marketplace_modules_partner_fk`. ALSO edit the
        Drizzle file `schema/marketplace_modules.ts` so it mirrors the DB (it declares its `index(...)` / `check(...)`
        extras today): `unique('marketplace_modules_pariwar_module_unique').on(t.pariwarId, t.moduleId)`,
        `foreignKey({ name: 'marketplace_modules_partner_fk', columns: [t.pariwarId, t.partnerId], foreignColumns:
        [marketplacePartners.pariwarId, marketplacePartners.partnerId] })` (the `approval_warning_reasons.ts` precedent)
        and (QE7 (A)) the partial `index('marketplace_modules_scheduled_valid_from_idx').on(t.validFrom).where(…)`;
        rewrite its stale comments — the header's and the `partner_id` column's "partner identity is Story 12.2's" (name
        the FK), the `commission_terms` "→ 12.2: admin-only home" line (→ the `-NNN` QE6 re-trigger), and "The ONLY
        DB-side content rules" (add the FK + unique), and the two `pariwar_id` "⛔ FK" lines (header + column) — clarify:
        NO `pariwars` FK; it is part of `marketplace_modules_partner_fk` (QE20's D2 reasoning).
  - [ ] 2.4 Fix the 12.1 live specs (G17):
        - (a) `_fixtures.ts`: `rawInsertParams(id, pariwarId, { partnerId })` and `manifestInput(now, { partner_id })`
          REQUIRE a partner of the SAME Pariwar — the random default is REMOVED, so a missing seed fails loudly (this
          also fixes the RLS spec, which imports them); add a raw-insert VARIANT that sets `created_at` explicitly (AC8);
        - (b) a `seedPartner(client, pariwarId)` helper inserts as superuser before `enterAppScope`, with a randomised
          `display_name_en` (`HDFC ${randomUUID()}`) so the name unique never collides across own-committing specs;
        - (c) own-committing specs (`commands-clock`, `module-stream-concurrency`, `read`) commit their partner and
          delete it in cleanup AFTER the modules; every NEW own-committing spec that writes a publication deletes it
          BEFORE its module (or purges under `session_replication_role = replica`, as 12.1 does) — a superuser DELETE of
          a published module otherwise hits 23503;
        - (d) `projector-trigger.spec.ts` AC1 test: exactly ONE FK `marketplace_modules_partner_fk` on `(pariwar_id,
          partner_id)` → `marketplace_partners (pariwar_id, partner_id)`; `pg_constraint` = six `c`, one `p`, one `u`
          (`marketplace_modules_pariwar_module_unique`), one `f`; `pg_indexes` = exactly FIVE under QE7 (A) (FOUR otherwise) —
          `marketplace_modules_pariwar_id_idx`, `marketplace_modules_pariwar_module_unique`,
          `marketplace_modules_pariwar_state_idx`, `marketplace_modules_pkey`, `marketplace_modules_scheduled_valid_from_idx`
          (assert its `WHERE`); the trigger test (`NOT tgisinternal`) is unchanged (RI triggers are internal);
        - (e) `rls/marketplace-modules-policy-regression.spec.ts`: a same-Pariwar partner per raw insert;
        - (f) run ALL FIVE marketplace live specs AND the RLS spec green.
- [ ] **Task 3 — domain (AC3–AC5, AC8–AC10).** All under `packages/domain/src/marketplace/`, exported via `index.ts`.
  - [ ] 3.1 `filters.ts`: ADD the QE12 write-only schemas + `partnerDisplayName{En,Hi}Schema`; `parseModuleManifest` uses
        them. Do NOT edit `moduleNameSchema`, `moduleDescriptionSchema` or `events.ts` (TR16). Write every code point as
        a `\uXXXX` escape and scan the file after writing (TR15).
  - [ ] 3.2 `partners.ts`: a PURE `parsePartnerDisplayNames({ displayNameEn, displayNameHi })` (the partner schemas →
        parsed values, or throws `ModulePartnerNameInvalidError` with issue paths) — the handler calls it as a PRE-CHECK
        (QE18); `createPartner(client, { pariwarId, partnerId, displayNameEn, displayNameHi, actorId, auditId })` takes
        ALREADY-PARSED values (it re-asserts nothing that could refuse inside `mutate`, beyond the DB unique);
        `listPartnersForPariwar(db, pariwarId, { limit? })` (clamp inline), `getPartner(db, pariwarId, partnerId)`.
  - [ ] 3.3 `publication.ts`: `moduleResourceLocator(id) = 'module/<id>'`, `moduleToneContentHash(module, partner)`,
        `recordModulePublication(client, { module, publishedEventType, reviewedBy, hindiReviewed,
        partnerAgreementConfirmed, contentHash, auditId })` (`pariwarId` from `module`), `getModulePublication(db,
        pariwarId, moduleId)`.
  - [ ] 3.4 `read.ts`: the NEW `pageModulesForPariwar` + `encodeModuleCursor` / `decodeModuleCursor` (QE16 — JS
        validation BEFORE SQL; `ModuleCursorInvalidError`); leave `listModulesForPariwar` UNCHANGED;
        `getModuleAuthorActorId(db, pariwarId, moduleId)` (the genesis event's `actor_id`, `string | null`);
        `countModuleLeads(db, pariwarId, moduleId)` (`module.lead_submitted` on this stream).
  - [ ] 3.5 `scope-options.ts`: pure `buildModuleScopeOptions`, `listModuleScopeOptions`, `findListedWorkplaceDistricts`
        (QE5), plus `assertScopeValuesRecorded(db, pariwarId, scopeFilter, at)` — called only with a filter that already
        passed `ScopeFilterV1Schema.safeParse` — throwing `ModuleScopeRequiresGeoTreeError` / `ModuleScopeValueUnknownError`.
  - [ ] 3.6 (QE7 (A)) `activation-sweep.ts`: `selectDueScheduledModules` + `classifyActivationOutcome` ONLY (I11).
  - [ ] 3.7 `errors.ts`: ADD `ModulePartnerUnknownError`, `ModuleScopeRequiresGeoTreeError`,
        `ModuleScopeValueUnknownError`, `ModulePartnerNameInvalidError`, `ModuleCursorInvalidError` (the 12.1 shape —
        typed, NO HTTP status; their wire codes are QE18's).
- [ ] **Task 4 — contracts (AC13).** `packages/contracts/src/modules/{enums,dto,index}.ts`: re-declared tuples (states,
      archive reasons, eligibility states, scope kinds), `MODULE_PUBLISH_STEP_UP_CONTEXT`, SHAPE-only request DTOs
      (QE18 — incl. `partner_id: z.string().uuid()`; the withdraw body `z.object({}).strict()` — QE15), response DTOs (`.strict()`, snake_case; the detail DTO carries
      `author_display_name`, `authored_by_viewer: boolean`, `publication` (with `reviewer_display_name`) | `null`,
      `lead_count`), the list `{ items, next_cursor }`; export from `src/index.ts`; a contracts test for tuple sync; a
      dated note in `partners/README.md` (QE3). Register OpenAPI paths in `scripts/emit-openapi.ts`; regenerate the
      repo-root `openapi/v1.yaml`.
- [ ] **Task 5 — API (AC2–AC8).** `apps/api/src/modules/marketplace/`:
  - [ ] 5.1 `routes.ts`: the G7 chain with `module.manage`; publish adds `requireStepUp(deps,
        MODULE_PUBLISH_STEP_UP_CONTEXT)`. Routes: `GET /modules` (`state?`, `limit` ≤ 200, `cursor?`), `GET
        /modules/:moduleId` (uuid param), `GET /modules/scope-options`, `GET /modules/partners` (`limit` 1–200) and
        `POST /modules/partners`, `POST /modules`, `POST /modules/:moduleId/publish`, `POST /modules/:moduleId/withdraw`.
        EVERY route declares its `200` response schema (the forced-pagination gate examines only routes that do — G7).
  - [ ] 5.2 `handlers.ts`: reads on `request.scopeTx`. Writes via a LOCAL `tenantWrite` — COPY the questionnaire shape
        and its local `releaseHookTx`; do NOT import them, and do NOT call `displayOf` (the module commands take no
        display name; it would fail writes closed) — with: the QE13 key namespaces; `openScopeTx` → the QE18 pre-checks
        on that SAME transaction (partner names via `parsePartnerDisplayNames`; scope via `safeParse` then
        `assertScopeValuesRecorded`; unknown partner) → `withCompensatingAudit(deps.servicePool, { auditIntent, mutate })`
        whose `mutate` runs the command(s) on `scopeTx.client` and ENDS with `await closeScopeTx(scopeTx, true)` →
        `finally { closeScopeTx(scopeTx, false) }` → outer `catch` → `mapModuleError`.
        ⚠ The `try` opens IMMEDIATELY after `openScopeTx` (as in the questionnaire twin), so the pre-checks sit INSIDE it
        — a pre-check refusal raised outside the `try` would leak a pooled client holding an open transaction, and enough
        422s exhaust the pool (TR22):
        `const scopeTx = await openScopeTx(deps, pariwarId); try { <QE18 pre-checks>; return await
        audit.withCompensatingAudit(…, { mutate: async ({ auditId }) => { …command(s)…; const out = …; await
        closeScopeTx(scopeTx, true); return out; } }); } catch (err) { mapModuleError(err); } finally { await
        closeScopeTx(scopeTx, false); }`. NO statement runs on `scopeTx` after the in-`mutate` COMMIT (`closeScopeTx`
        releases the client in its own `finally`).
        **Publish:** on the write transaction, BEFORE the wrapper, read `now()` and the module (no lock) → no row ⇒
        `module.not_found` (throw 12.1's `ModuleGenesisMissingError(moduleId)` — NO new class) / `module.not_draft` / `module.window_ended` / the tone gate with `authoredBy = getModuleAuthorActorId(...)` (deny
        ALSO when it is `null` — I4; deny: emit `publish_blocked` with an explicit `pariwarId`, throw
        `ToneReviewRequiredError(denial)`) → choose `scheduleModule` (`now < valid_from`) or `activateModule` and set the
        audit action to that event type → in ONE `mutate`: the command, then `recordModulePublication`, then COMMIT →
        after the wrapper: `recordToneReviewSignoff`. Because the pre-read and the command share one `now()`, the choice
        cannot drift (TR3).
        **Detail read:** `author_display_name` / `reviewer_display_name` via `getDisplayName(deps.pool, id)`
        (`auth/admin/admin-auth.repo.ts`) with a fallback label when it returns null or the id is null (NEVER a 500);
        `authored_by_viewer` = (author id is null) OR (author id = `request.requestContext.actorId`).
  - [ ] 5.3 `errors.ts`: `mapModuleError` — EVERY row of the QE18 table, including the five 12.2 classes and
        `ModuleStateDirectWriteError` → 500 `module.state_direct_write_rejected` (logged at error); unit-tested row by row.
  - [ ] 5.4 Register in `server.ts`.
- [ ] **Task 6 — job (AC9; per QE7).** (A): `QUEUE_NAMES.MODULE_ACTIVATION`; `apps/jobs/src/scheduler/
      module-activation.ts` — `runModuleActivationTick(deps)` (QE7 (A): the Row 26 guard first —
      `smsDelivery.canReadAcrossPariwars(tickPool)`, false ⇒ ONE `module_activation.rls_bound_role` alarm through the
      `claim-contact-ladder.ts` `alarmOf` / `onAlarm` shape and the tick ends (QE19); then `selectDueScheduledModules`;
      then the EXPORTED `activateDueModule(deps, candidate)` per candidate → `'activated' | 'skipped' | 'failed'`;
      `mutate` = `withPariwarScope(tickPool, …)`, I2; `classifyActivationOutcome`) and `registerModuleActivationCron(boss, deps, { cron = '*/5 * * * *', tz =
      'Asia/Kolkata' })` — the 5-field cron check is the regex in `apps/jobs/src/boot.ts` (the renewal registrar has
      none); `localConcurrency: 1` follows `wa-webhook-processor.ts` (pg-boss `^12` hands the handler an ARRAY of jobs);
      its own `max: 3` pool created in `boot.ts`; wired in `boot.ts`.
- [ ] **Task 7 — access-wrapper gate (AC13).** Split the root list so the compensating-audit invariant scans
      `[...ACCESS_SURFACE_ROOTS, ...MARKETPLACE_ROOTS]` while the constant-time-compare invariant keeps
      `ACCESS_SURFACE_ROOTS` (it would pass vacuously on marketplace). `MARKETPLACE_ROOTS = ['apps/api/src/modules/
      marketplace', 'packages/domain/src/marketplace']` — DIRECTORIES only (a file root throws ENOTDIR). The job file
      `apps/jobs/src/scheduler/module-activation.ts` is NOT scanned — say so in the README line. Record the
      revert-sanity RED → green.
- [ ] **Task 8 — admin UI (AC11, AC12).**
  - [ ] 8.1 Fetchers in the CENTRAL `apps/admin/src/api/client.ts` and hooks in `apps/admin/src/api/hooks.ts` (per-feature
        query keys; writes via `mutateAsync` — [[project_tanstack_mutate_callbacks_latest_only]]; the Idempotency-Key
        minted once per user intent and REUSED on retry; the withdraw fetcher sends `body: JSON.stringify({})` — QE15).
  - [ ] 8.2 `apps/admin/src/modules/marketplace/`: `ModulesPage.tsx` (list, state filter, "Load more" cursor),
        `ModuleWizard.tsx` (steps a–f + summary), `ModuleDetailPage.tsx` (publish / withdraw / corrected copy),
        `PartnerPicker.tsx` (select or create inline), `ScopePicker.tsx`, `i18n-en.ts` holding EVERY ordered string:
        AC11's opening line, state labels, the step (b) no-member-yet notice and its reaches-no-member warning, the
        role/cohort line, BOTH scope sentences (no district; unlisted district), the truncation notice, the Summary's
        audience / status sentences (the Policy-meaning strings) and the QE11 secret copy; AC12's three tick texts, the author sentence, the single-admin line and the "members cannot see offers
        yet" line; the C10 warning (QE15).
  - [ ] 8.3 Routes: `src/routes/ModulesRoute.tsx` (session gate views, the `BannersRoute` shape) + three `createRoute`s
        in `router.tsx` + a Pariwar-scoped nav link in `RootLayout.tsx` (ungated client-side; the server's 403 is the
        boundary).
  - [ ] 8.4 `derive.ts` (pure, tested): `describeEligibility`, `describeScope`, `describeWindow` (IST + the browser
        zone), `describePlaces`, `validateStep(n, state)`, `toAuthorRequest(state)` (CRLF → LF), `fromModule(module)`
        (the corrected-copy prefill), `issueToStep(path)`, `moduleErrorGuidance(code)`, `toIsoOrNull` (a copy of the
        private banners helper).
- [ ] **Task 9 — tests.** Per Testing standards. Every assertion names a code / error class.
- [ ] **Task 10 — verify + records (AC14).** `pnpm ci:local` on a fresh container (`DATABASE_URL` = the story port on
      EVERY push — [[project_prepush_hook_inherits_5432]]); Completion Notes: I1 / I8 / I9 / I10 / I11 greps, the variance list,
      the RPD4 re-statement of 12.1's I6; in `deferred-work.md`, replace each 12.2 LEG's dated "being built by Story
      12.2" line (Task 0.4) with "Closed by `<sha>` (12.2's leg: …)" naming the code commit — every OTHER leg of the
      same item keeps its text and owner; ledger lines prepended SAFELY to BOTH ledgers
      ([[project_sprint_status_safe_prepend]]); row → `review`.

## Dev Notes

### Current state (what this story changes, what must be preserved)

- **`packages/domain/src/marketplace/`** — additive files; `read.ts` (a NEW page read + two reads; `listModulesForPariwar`
  UNCHANGED), `filters.ts` (write-only schemas) and `errors.ts` (five new classes) are the only edits. Preserve every
  12.1 export, signature and test (except the G17 fixture / assertion updates). Do NOT edit `project.ts`,
  `commands.ts`, `state.ts`, `events.ts`, the 0193 migration or its trigger.
- **`marketplace_modules`** — one unique constraint, one FK, one partial index, one `twt_service` grant; NO new column.
  Its Drizzle file `schema/marketplace_modules.ts` declares them, and its stale "no FK" / `commission_terms` comments
  are rewritten (Task 2.3).
- **`packages/domain/src/rbac/{permissions,roles}.ts`** — one key, one grant, the version bump.
- **`apps/api/src/server.ts`**, **`apps/jobs/src/boot.ts`**, **`packages/queue/src/index.ts`**,
  **`packages/contracts/src/index.ts`**, **`apps/admin/src/{router.tsx,routes/RootLayout.tsx,api/client.ts,api/hooks.ts}`**
  — additive registrations / functions.
- **Do NOT touch:** `member/overlay.ts`; `state-machine.ts`; the central error mapper; `tone-review/*` (consume it);
  `workplaces/StepUpPanel.tsx` (import it as is — [[feedback_no_premature_package]]: do NOT extract a shared component
  now);
  `geo-tree/*`; `secrets.ts`; `member/workplace.ts` (call it); `apps/api/src/modules/questionnaire-versions/*` (copy
  from it, do NOT import it).

### Traps (TR)

- **TR1 — `request.scopeTx` commits in `onSend`, AFTER the audit wrapper returns.** Writes open their own scope tx and
  COMMIT inside `mutate` (I2). Release the hook's READ tx first (`releaseHookTx`), or the request holds two connections.
- **TR2 — The commands need `pg.PoolClient`, not drizzle `Db`.** Pass `scopeTx.client`; reads take `scopeTx.tx`.
- **TR3 — `now()` is the TRANSACTION start.** Publish's pre-read runs on the WRITE transaction, so it and the command see
  the SAME instant. Do NOT pre-read on the hook's transaction, and do NOT use `new Date()` for a guard.
- **TR4 — A refusal inside `mutate` writes intent + `_rolled_back`.** Validation that must leave NO audit line
  (QE18's pre-checks — incl. the partner-name parse) runs BEFORE the wrapper. The manifest parse happens in `authorModule` (inside) — intended: a
  refused manifest is an attempted write.
- **TR5 — TanStack v5:** `onSettled` runs before `success` dispatch; per-call `mutate` callbacks fire for the latest
  call only; unmount drops them ([[project_tanstack_onsettled_before_success]],
  [[project_tanstack_mutate_callbacks_latest_only]]). Use `mutateAsync` and a generation ref (the `BannersPage` guard).
- **TR6 — Tree values up to 128, scope values up to 120.** Never truncate; mark unusable (QE5). `MAX_NODE_VALUE_LENGTH`
  is private — use `MAX_SCOPE_VALUE_LENGTH` for the test.
- **TR7 — Byte-for-byte matching.** The picker emits the EXACT stored string (no trim, no case change, no Unicode
  normalisation) — copy the option's `value`, never its rendered label.
- **TR8 — Idempotency of a void result** stores `{ done: true }`; withdraw returns a body anyway (`{ module_id, state }`).
- **TR9 — Step-up context string** must be the contracts constant on BOTH sides (the gate compares a bare string).
- **TR10 — The cursor is the exact DB text** (QE16). A `Date` cursor skips rows; same-transaction rows share one
  `created_at`.
- **TR11 — Migration ordering / regeneration:** a sibling's later `when` landing first makes drizzle skip ours; NEVER
  regenerate an applied migration (42P07) ([[project_live_db_test_gotchas]]).
- **TR12 — Contracts must NOT import `@twt/domain`** in shipped files; re-declare tuples and test sync.
- **TR13 — `datetime-local` has no zone.** `toIsoOrNull` reads it in the browser zone and emits UTC `Z`; show the IST
  rendering; the domain refuses years < 2000.
- **TR14 — The admin RTL 5 s flake** under `ci:local` load: per-test budgets (NOT a global `testTimeout`),
  `findBy…({ timeout })`.
- **TR15 — Escapes in Write content can land as raw characters** ([[project_unicode_escapes_written_raw]]) — QE12's
  code points MUST be `\uXXXX` escapes in source; scan the file after writing (incl. combining marks — not only Cc / Cf).
- **TR16 — The genesis payload re-parses with the 12.1 name schemas** (`foldModuleProjection` `safeParse`). Tightening
  them drifts the fold on any stored genesis (`slotsRemaining: null`). Hence QE12's write-only schemas.
- **TR17 — Superusers hide grants.** Dev / CI connect as superuser; production jobs run as `twt_service_login`. Assert
  privileges with `has_table_privilege` (AC1).
- **TR18 — Forced pagination.** Any GET returning `{ items: [] }` must declare a bounded `limit` (AC13) — AND its 200
  response schema, or the gate never examines it (G7).
- **TR19 — A bad value cast in SQL aborts the transaction → 500.** A non-UUID id or a garbage cursor that reaches
  `$n::uuid` / `$n::timestamptz` raises 22P02 / 22007 / 22008 / 22009 and aborts the tx. Validate every id / cursor in JS (DTO
  `.uuid()`, `decodeModuleCursor`) BEFORE any SQL (QE16, QE18).
- **TR20 — Live specs run in parallel within the domain package; the tick is cross-tenant.** Assert on your OWN ids
  only; every spec that authors a module seeds a same-Pariwar partner first (the FK). A PAGE-COUNT assertion cannot be
  made on own ids — page in a FRESH `randomUUID()` Pariwar (AC8).
- **TR21 — The tone gate passes a null author.** `reviewedBy === null` is never true; deny explicitly (I4).
- **TR22 — A pre-check refusal outside the `try` leaks a connection.** Open the `try` immediately after `openScopeTx`;
  the `finally` is what releases the client on a 422 / 409 pre-check (Task 5.2).
- **TR23 — Under an RLS-bound jobs login the due scan returns ZERO rows, silently** (G13, roster Row 26). Check
  `canReadAcrossPariwars` first and alarm; a quiet "nothing due" is indistinguishable from a broken login (QE19).
- **TR24 — The cursor regex checks SHAPE only.** Range-check every field in JS, or `2026-02-30 …` reaches the cast and
  answers 500 (QE16).
- **TR25 — `Buffer.from(s, 'base64url')` never throws and accepts almost anything** (QE16's strict decode). Validate
  the alphabet + length BEFORE decoding and re-encode AFTER (canonical round-trip); decode UTF-8 with `fatal: true`;
  compare the JSON text to its canonical re-serialisation, because `JSON.parse` keeps only the LAST of duplicate keys.

### Carried to sibling stories (C) — record in `deferred-work.md` "Deferred from: story 12-2-…" at Task 0.4

- **→ 12.3:** partner logo upload (QE8); the commission-disclosure re-trigger (QE6); an orphaned scope value after a
  tree amendment reaches nobody — the shelf may report it (QE5); the card reads partner names from
  `marketplace_partners`; C5 still binds the card; `marketplace_module_publications` is the "published by" record; RVD2
  re-trigger (QE21).
- **→ 12.5:** Secret Manager existence / resolution at send (QE11); partner endpoint / key on the partner entity (C10's
  NOT NULL relaxation) if 12.5 moves them; RVD2 re-trigger.
- **→ 12.6:** (if QE7 (A)) activation is OWNED by 12.2 — 12.6 keeps archive-at-`valid_until`, the stale `scheduled`
  sweep (C2 (c)), restore (C3); the partial index exists; `twt_service` already holds SELECT, UPDATE on
  `marketplace_modules`.
- **→ 12.5 (also):** architecture §3.7's lead envelope "scope-redacted to partner-allowed fields per FR-66 wizard" —
  12.2 builds NO field allow-list; carried with C6.
- **→ 12.3 (also):** members whose newest posting carries an unlisted / retired district spelling are reachable by NO
  district offer (Policy meaning reach line); four eligibility statuses have NO member until `member.lock_in_expired`
  has a producer (G18 — re-trigger: row `3-14-lock-in-expiry-producer` lands; the shelf must not read "no one matched"
  as a bug).
- **→ 12.5 (also):** architecture §3.7 "**Partner contract evolution:** versioned per-partner; partner contract changes
  do not cascade to other partners." has NO home — 12.2's partner row carries no contract version; carried with C7.
- **Recorded, NOT built:** QE2's acceptance condition for a narrower grant (server-derived geo scope + gate per scope
  value); the single-admin-Pariwar consequence (QE9 — re-trigger: a single-admin Pariwar observed in practice).
- **Accepted residual (NO owner):** an ambiguous COMMIT can yield a duplicate draft (QE13); the admin partners list is
  capped at 200 with NO cursor (re-trigger: a Pariwar with > 200 partners); a district renamed / retired between the
  author-time scope check and the COMMIT (the `lockListedDistrict` precedent) reaches nobody (re-trigger: the first
  module observed holding a value retired in that window).
- **Unchanged and still open:** C1, C4, C6, C7, C8, C9, operator-assisted leads (the first C13), `age_band`, the
  external-URL CTA, R3D2, RPD2, RPD3, RVD1, RVD3, RVD4; RVD5's archive leg (12.6 — its activation leg is QE7 (A)'s
  `classifyActivationOutcome`, Task 0.4).
- ⚠ `deferred-work.md` uses the label **C13 twice** (operator-assisted leads → 12.3/12.5; caller obligations → 12.2).
  Cite the HEADING, not the bare label.

### Testing standards

- **Domain unit (`packages/domain/tests/marketplace/`):** `filters.test.ts` QE12 vectors (interior positions; ZWJ/ZWNJ
  Devanagari accepted; LF in description only; blank-looking; `*_hi` without a Devanagari letter incl. `"LIC ।"`);
  `scope-options.test.ts` (the pure builder: tree / districts-only tree / no tree / no tree + no list / truncated /
  too-long); `publication.test.ts` (hash stability + key order); `read-cursor.test.ts` (encode / decode; malformed = bad
  base64, bad JSON, extra key, the STRICT-base64url vectors (`=` padding; a `+` or `/`; an embedded space / newline; a
  `*`; a `len % 4 === 1` string; a non-canonical last character with non-zero trailing bits; a 257-char string; bytes
  that are invalid UTF-8; JSON `null` / an array / a number; a duplicate `c` key; reordered keys `{"m":…,"c":…}`;
  whitespace inside the JSON; a non-string `c` or `m`), the encode → decode round-trip (6-digit fraction / no fraction /
  `+05:30` offset), `c: 'infinity'` / `'now'`, a `c` without offset, the out-of-range `c` values
  `'2026-13-01 00:00:00+00'` / `'2026-02-30 00:00:00+00'` / `'2026-01-01 25:00:00+00'` / `'2026-01-01 00:00:00+16'`,
  an upper-case or non-UUID `m` — each
  `ModuleCursorInvalidError`); `partners.test.ts` (`parsePartnerDisplayNames` vectors);
  `no-audit-wrapper-in-domain.test.ts` (QE22); `activation-outcome.test.ts` (`classifyActivationOutcome`);
  `events.test.ts` (one QE12-REFUSED vector still parses through `ModuleAuthoredPayloadSchema` — AC10).
- **Domain live (`packages/domain/tests/integration/marketplace/`, the story container; membership, not counts — except a
  page count in a FRESH Pariwar, TR20):**
  ⭐ EVERY new spec that authors a module seeds a same-Pariwar partner first (`seedPartner`, Task 2.4 (b)) and asserts
  on its OWN ids only (TR20). `partners.spec.ts`; `publication.spec.ts`; `read-cursor.spec.ts` (AC8: a FRESH Pariwar; five modules in
  ONE transaction + the 100 µs pair via the explicit-`created_at` raw-insert variant); `scope-check.spec.ts` (exact-match beyond 200 listed districts); `activation-select.spec.ts` (own pool, own
  commits, cleanup, `hasDatabase` guard; `asOf`); `tests/integration/rls/marketplace-partners-policy-regression.spec.ts`
  + `…module-publications…` (AC1 legs incl. `has_table_privilege`); the G17 updates.
- **API (`apps/api/tests/integration/marketplace-admin.spec.ts`; fake secret resolver `test-secret::<name>`):** AC2–AC8
  legs, incl. a non-UUID `partner_id` → 400, a malformed cursor → 400 `module.cursor_invalid` (never 500), and the
  NULL-author publish leg (raw-seeded). COPY `elevate(client, actionContext)` from `workplaces.spec.ts` and
  `pariwarAdmin(p, name)` from `questionnaire-versions.spec.ts` (NO shared helper exists — G8); two admin users for the
  non-author leg; seed partners per test; audit rows by
  baseline `max(seq)` (`audit_log_entries` has `recorded_at` + `seq`, and NO `created_at`); tone lines on
  `t.toneReviewAuditSink`. Unit: `mapModuleError` table.
- **Jobs:** `apps/jobs/tests/module-activation.test.ts` (registration: queue, cron, tz, `localConcurrency`) + a live
  tick test (seed a partner; author with `valid_from = now()+2s`, schedule, commit, sleep 2.5 s, tick → `active`;
  withdraw-race (select, withdraw, then `activateDueModule`) → `'skipped'` + its intent / `_rolled_back` lines; the
  Row 26 guard stubbed `false` → one alarm, nothing activated; assertions on OWN ids only — TR20).
- **Admin (`apps/admin/tests/`):** `marketplace-derive.test.ts` (every Policy-meaning / AC11 sentence through the REAL
  `t()` — NOT a transcribed copy, [[feedback_stub_must_call_not_transcribe]]; the C10 warning with N interpolated; the
  step (b) notice whenever "Only these statuses" is picked, and "This offer reaches no member for now." when every
  ticked status is one of the four G18 statuses); `module-wizard.test.tsx` (step gating, picker states,
  422 issue → step, idempotency key reused on retry); `module-detail.test.tsx` (Publish disabled when `authored_by_viewer: true`, with the author and single-admin lines; publish
  → 403 step-up → panel → retry; C10 warning at `lead_count: 3`); `modules-page.test.tsx` (cursor).
- **Gates:** `pnpm access-wrapper:test && pnpm access-wrapper:check`, `marketplace-module-state:check`,
  `contracts:check-openapi-determinism`, `login-wall.spec.ts`, `forced-pagination.spec.ts`, then `pnpm ci:local`
  ([[project_ci_actions_suspension_local_mirror]]; TS2307 / Pods reds → [[project_ci_local_machine_state_traps]]).

### Project Structure Notes

- **New:** `packages/domain/src/marketplace/{partners,publication,scope-options,activation-sweep}.ts`;
  `packages/domain/src/schema/{marketplace_partners,marketplace_module_publications}.ts`; two policy files; the
  migration; `apps/api/src/modules/marketplace/`; `packages/contracts/src/modules/{enums,dto,index}.ts`;
  `apps/jobs/src/scheduler/module-activation.ts`; `apps/admin/src/modules/marketplace/`;
  `apps/admin/src/routes/ModulesRoute.tsx`; the tests.
- **Variances from the epic / PRD (list in Completion Notes):** publish emits `module.scheduled` for a future start (NOT
  always `module.activated`); epic (b)'s "structured rule expression preview" is a plain-language sentence
  (`describeEligibility`); PRD §4.9's `user` / `block` scopes are absent (12.1 refuses them at write); `role` / `cohort` absent (QE17); "national" = `members-all` of one Pariwar;
  `commission_terms` not stored (QE6); branding all-null (QE8); the signing key is a Secret Manager NAME; step (g)'s
  review happens on the detail page by a non-author; partners are per-Pariwar tenant routes (NOT `/global/partners`);
  `module.manage` doubles as the review key; the "trustee" persona holds NO key (QE2); FR-66's
  "CTA destination" is the lead hand-off URL only (the external-URL CTA stays Not addressed — `-427` QE5); admin
  step-up delivery is the house-wide always-stub (`deferred-work.md` D1-1.9 R4), not the epic's "step-up OTP per Story
  5.9" SMS; the no-tree scope source is the listed workplace districts (the `-429` C11 amendment, QE5).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12 — Story 12.2 (incl. the 1.19 seam and INHERITED FROM 12.1 notes); Stories 12.3–12.6]
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#§4.9 FR-64..FR-67, Out of Scope, OQ-4; FR-74]
- [Source: _bmad-output/planning-artifacts/architecture.md#§3.7; §5.9; §2.2 step-up list]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Module Shelf Partner Brand Integration; Stance #1]
- [Source: _bmad-output/implementation-artifacts/12-1-module-manifest-schema-module-lifecycle-state-machine.md (QE1–QE15, I1–I11, C1–C13, review rounds 1–4)]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md — "Deferred from: story 12-1-…" (all four sections); "Deferred from: code review of story-10-5-…" (single-admin); the story-6.25 ROUND 3 service-login item]
- [Source: _bmad-output/implementation-artifacts/2-2-tone-guide-vocabulary-enforcement-process.md; docs/tone-review-checklist.md; docs/tone-guide.md; docs/adr/ADR-0019-tone-review-publish-gate.md]
- [Source: packages/domain/src/marketplace/*; geo-tree/{registry,document}.ts; member-geo/resolve.ts; member/workplace.ts; rbac/{permissions,roles,scope,check}.ts; tone-review/gate.ts; audit/{compensating,write}.ts; canonical-json.ts; banners/write.ts; member/renewal-scheduler.ts; claim/correction-queue-read.ts]
- [Source: packages/domain/migrations/{0002,0007,0012,0091,0193}; packages/domain/tests/integration/marketplace/*; tests/integration/rls/marketplace-modules-policy-regression.spec.ts]
- [Source: apps/api/src/modules/{questionnaire-versions/handlers.ts, memorial/handlers.ts, news-blog/routes.ts, helpdesk/handlers.ts, step-up/gate.ts, tone-review/index.ts, rbac/index.ts, multi-tenant/scope-tx.ts}; apps/api/src/middleware/scope-resolution/index.ts; apps/api/tests/integration/{login-wall,forced-pagination}.spec.ts, _setup.ts, questionnaire-versions/questionnaire-versions.spec.ts]
- [Source: apps/admin/src/{router.tsx, routes/BannersRoute.tsx, routes/RootLayout.tsx, modules/banners/BannersPage.tsx, modules/workplaces/StepUpPanel.tsx, modules/channel-config/WaConfigForm.tsx, api/client.ts, api/hooks.ts}]
- [Source: apps/jobs/src/{member-renewal-lifecycle.ts, claim-contact-wa-stop.ts, scheduler/news-publish.ts, boot.ts}; scripts/access-wrapper-invariants/]
- [Source: Decisions `2026-10-31-427`, `2026-10-31-429`, `2026-08-13-103` D8, `2026-09-08-210` cl.2, `2026-10-30-421` QE6 (key precedent), ADR-0019, ADR-0044]
- [Source: /Users/dev/Developer/projects/TWT/docs/legal/{trust-deed.md (Clause 7.2(i), 20(i)), privacy-policy.md §6} (git-ignored, main checkout only)]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-01 | v1.4 | BigDev at Task 0.2 (verbatim): *"QE16 needs the strict base64url validation amendment before the implementation begins. QE3, QE6, QE7, QE9, QE17 AS RECOMMENDED."* The five ASKs are marked ANSWERED as recommended (QE3 (A), QE6 (A), QE7 (A), QE9 / QE17 confirmed; the Task 0.3 map not triggered); the other sixteen recommendations still await acceptance (Task 0.2 left unticked). QE16 AMENDED: a STRICT base64url decode in five ordered steps — URL-safe alphabet only, no padding / whitespace, length 1–256 and `% 4 !== 1`; a canonical re-encode round-trip; fatal UTF-8; a plain object with exactly `c` / `m` (both strings) whose text equals its canonical `JSON.stringify` (duplicate keys rejected) — each on Node v22 behaviour verified in session; encoder pinned (no padding). AC8, TR25 and the `read-cursor.test.ts` vectors follow it. Ledger `2026-11-01n`. No code. |
| 2026-11-01 | v1.3 | Third validate pass (three read-only verifiers at `36b489c9`; 6 critical / 15 should-add / 15 nits — ALL applied on BigDev's "all"; then a fresh-context review of the PATCH diff found 16 defects the edits introduced (I10 grep unpassable as worded, Task 10 grep list, G13 twin misquote, stale `baseline_commit` / G heading, Row 26 (a) is a closure criterion not an option, no error class for the publish not-found pre-check, RPD4's I6 leg, the QE7 answer map, 22009, the test-heading count rule, two more stale `pariwar_id` comments, and wording) — all fixed; overlong lines left as is). Branch REBASED from `3d6b46c5` onto `36b489c9` (38 commits; 11b.5a landed; ledger-only conflicts). **Critical:** ledger `g` → `m` (13-2 took `g` 3 min before v1.2); Task 0.4 mints NO fourth closure label (`-210` cl.2) — built legs get a dated status line, Task 10 closes LEG by leg, RPD4's grep legs + D10-1.4's `partners/` leg deferred, `role`/`cohort` stays "Not addressed"; QE20's ADR-0044 amendment covers D5 sentence 2 + Consequences + Alternatives; the sweep's roster dependence is Row 26 `jobs-db-role` (NOT Row 24 (b)) — `canReadAcrossPariwars` guard + a dated Row 26 note; G18 — four eligibility statuses have no member (no `lock_in_expired` producer) — wizard notice, `pending-valid` relabelled, carried to 12.3; cursor range-checked in JS (shape-valid out-of-range values answered 500). **Should-add:** NUMBERS refreshed (`-432` / `0194` on main; v57 contested by three, key count LIVE); `ScopeFilterV1Schema`; `try` opens right after `openScopeTx` (TR22); paging specs in a fresh Pariwar; exported `activateDueModule`; withdraw body `{}`; `-429` C11 AMENDED (not "read"); the unlisted-district sentence; QE6 (A) re-trigger adds the first production publish (deed 20(i)), (B) quotes ¶B.5; Task 0.3 map completed (QE6 (B), QE3 / QE7 dependants, FOUR indexes); `schema/marketplace_modules.ts` edits; `⛔` removed from Policy meaning / Names; Policy-meaning strings pinned in AC11 / Task 8.2 / tests; a super admin must hold a grant IN the Pariwar; publication cleanup order; FK actions `NO ACTION`. **Nits:** G13 callback, `storableText` kept, RI-check xmin wording, scope `at`, `mapModuleError` rethrows unchanged, QE21 drift cost, cross-Pariwar publish 404, `-103` status, §0 edge 4 verbatim, variances, carried homes, `events.test.ts` / I10 tests, RVD5 split, G9 optional fields, 6-39 numbers relative. |
| 2026-11-01 | v1.2 | Re-validated by three read-only verifiers (facts; DB / transaction feasibility; coverage + governance); every finding applied. **Critical:** plain-word negations throughout ACs / Invariants / Tasks / Dev Notes (the glyph register now confines `⛔` to G / QE prose); Task 0.4 uses "Homed in Story 12.2 (QE-n)" and Task 10 flips each to "Closed by `<sha>`"; ledger relabelled `2026-11-01c` → `g` (c–f committed first on 13-2 / 14-3 / 6-22) and the NUMBERS block refreshed (the merge-order migration rule withdrawn — `-415` was a one-off). **Design:** NEW `pageModulesForPariwar` (12.1 `listModulesForPariwar` + `read.spec.ts` untouched); cursor validated in JS before SQL; `partner_id` `.uuid()` in the DTO (TR19); partner-name parse as a PURE pre-check; five named 12.2 error classes + `ModuleStateDirectWriteError` in the QE18 table; `authored_by_viewer` in the detail DTO; null-author publish denied (I4, TR21); `displayOf` NOT copied, display names via `getDisplayName` with a fallback; sweep `mutate` = `withPariwarScope` (no `closeScopeTx` in jobs) and skip writes two audit lines; scope pre-check ordering (`safeParse` first); response schemas required for the pagination gate; five-index list; negative `twt_service` grant leg; migration lock levels; AC8 split into API + domain-live legs; own-id assertions + partner seeding in every new spec (TR20). **Records:** QE6 amends `-427` QE5 as well as `-429`; the later deed objects draft v4 (no "disclosed") recorded; ADR-0044 D5 amended in part / D2 clarified (QE20); QE9 grounded on ADR-0019 with `-422` Q1 A disclosed as a contrast; the C11 no-tree reading recorded; Policy meaning reach line + Niyamavali carry-over reason; C12, C2 (d)/(e) + cost, D10-1.4 legs, tone-checklist routing row added to Task 0.4; new carries (§3.7 redaction → 12.5, partners cap, district rename residual, narrower-grant condition, single-admin); variances (CTA destination, admin step-up stub); UI strings made verbatim (opening line, single-admin, members-cannot-see-yet; tick text covers checklist §5). Fact fixes: checklist has five sections; `withCompensatingAudit` defined in the domain; 0007 login is a provisioning comment; `z.literal(true)` precedent = memorial `calledBack`; helper sources per spec; `adminStepUpDelivery`; five 12.1 specs; second `PartnerId` comment. |
| 2026-11-01 | v1.1 | Validated by three read-only verifiers (facts; DB / transaction feasibility; coverage + governance); every finding applied. **Design:** the activation tick moved OUT of the domain (`-427` QE15 — the domain keeps SELECT + classify only), runs under the jobs service login with a `twt_service` SELECT, UPDATE grant (⛔ `SET LOCAL ROLE`), DB `now()` scan, `OutsideWindow` → skipped; COMMIT placed INSIDE `mutate` (memorial twin — the questionnaire twin commits after); publish pre-read on the WRITE transaction (one `now()`); composite FK for publications (+ `(pariwar_id, module_id)` unique); case-insensitive partner-name unique; cursor on exact `created_at::text`; QE12 as WRITE-ONLY schemas (the shared ones feed the genesis payload + fold) with a Devanagari-LETTER rule; exact-match scope check (the 200-district cap); partner-agreement tick (the UX activation gate); shape-only DTOs; key namespaces; forced-pagination gate; G17 spec breakages enumerated; access-wrapper roots directories only + split. **Records:** QE21 (RVD2), QE22 (RPD4), RPD1 under QE12, QE6 amends `-429` explicitly, §0 edge 4 re-anchored on OQ-4, ADR-0019 ratified, revise event "Resolved via explicit deferral", Task 0.3 non-recommended-answer map. Migration ≥ `0195`. |
| 2026-11-01 | v1.0 | Created by `bmad-create-story` at `3d6b46c5` in its own worktree; four read-only researchers; QE1–QE20 proposed (five ASKs); row backlog → ready-for-dev; ledger `2026-11-01c`. |
