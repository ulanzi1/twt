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

STATUS: done (2026-11-01 — v1.14; the notes through v1.6 are HISTORY, kept oldest first, and the v1.7–v1.14 notes follow them). ⭐ **Task 0 runs FIRST in `bmad-dev-story`: the build decisions QE1–QE22
carry FIVE real asks (QE3, QE6, QE7, QE9, QE17); BigDev answers them at Task 0.2 and the author-commit lands ALONE at
Task 0.3 BEFORE any code** ([[feedback_governance_commits_precede_implementation]]). If an ASK is answered with a
non-recommended option, Task 0.3 rewrites the dependent ACs / Tasks / Invariants first (the map is in Task 0.3).
⭐ **v1.4 (2026-11-01): the five ASKs are ANSWERED — all AS RECOMMENDED — and QE16 is AMENDED by BigDev (strict
base64url cursor validation), both recorded verbatim in Task 0.2.** The Task 0.3 rewrite map is NOT triggered.
⭐ **v1.5 (2026-11-01): the other sixteen recommendations are ACCEPTED as recommended (BigDev, verbatim in Task 0.2) ⇒
Task 0.2 is DONE and QE1–QE22 are all answered.**
⭐ **v1.6 (2026-11-01): Task 0.3 DONE — the author-commit is Decision `2026-11-01-433`, committed ALONE as `f95f7ae6`
(BigDev: *"write the author-commit"*).** Still owed before code: the records (Task 0.4), then Task 1.
⭐ **v1.7–v1.8 (2026-11-01): Task 0.4 DONE (v1.7), then Tasks 1–10 DONE with the code commit `89add5ee` and the row in `review`
(v1.8) — the "still owed" sentence above is HISTORY.** The code review's findings are in `### Review Findings` under Tasks.
⭐ **v1.9 (2026-11-01): code review round 1 (chunks A / B / C and the patch-diff review) COMMITTED — code `465a2ac8`, then these
records.** Round 2 reviews the committed production slice next.
⭐ **v1.10 (2026-11-01): the QE12 narrowing (DN1 + DN2) is recorded — author-commit `2026-11-01-434` (`e6f30675`), amending
`-433` QE12 and ADR-0044 D3 / D4 in part.**
⭐ **v1.11 (2026-11-01): code review round 2, chunk A — decision `2026-11-01-435` (`ac1ddad3`, DN3 + DN4), code `497c69e4`;
DN5 / DN6 open (from the patch-diff review). Chunks B and C of round 2 are next.**
⭐ **v1.12 (2026-11-01): DN5 / DN6 / DN7 resolved — decisions `-436` (`a5b23c89`) and `-437` (`60dbcf00`), code `77ea3906`.**
⭐ **v1.13 (2026-11-01): code review round 2 COMPLETE (chunks B / C, code `ea408af3` + `550307be`), two real-browser passes, `ci:local` 37/37 on a
fresh database at `550307be`. Next: push, open the PR (BigDev's instruction).**
⭐ **v1.14 (2026-11-01): LANDED on `main` by fast-forward (BigDev: *"go ahead"*) — PR #320 merged 2026-11-01T14:09:28Z,
`36b489c9..d8ca7628`, 26 commits, SHAs unchanged; GitHub CI 37 / 37 on the PR head. Row `review` → `done`.**

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
  **`2026-11-01m`** (relabelled `c` → `g` in v1.2, `g` → `m` in v1.3), **`2026-11-01n`** (v1.4), **`2026-11-01o`**
  (v1.5 — the Task 0.2 answers), **`2026-11-01p`** (v1.6 — the author-commit), **`2026-11-01q`** (v1.7 — Task 0.1 re-grep +
  Task 0.4, the `-433` records), **`2026-11-01r`** (v1.8 — dev-story complete, row → review), **`2026-11-01s`** (v1.9 —
  code review round 1 committed; `s` re-grepped free on every ref and worktree), **`2026-11-01t`** (v1.10 — `-434`), **`2026-11-01u`** (v1.11 — round 2 chunk A), **`2026-11-01v`** (v1.12 — DN5–DN7) and **`2026-11-01w`** (v1.13 — round 2 complete);
  re-grep and relabel again at landing if needed.
- Roster: highest Row 45 (14-3 and 6-39 both plan 46). This story adds NO row (QE19); it appends a dated note to Row 26
  (QE7 (A) only; QE19, Task 0.4).
- ⚠ 6-39's own NUMBERS block is stale (it names `-432` / `0194` as free) — read every sibling's reservation as RELATIVE.

⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each.

LETTERS: G = found facts · QE = build decisions (PROPOSED — answered at Task 0.2) · I = invariants · TR = traps ·
C = carried (inherited from 12.1, or carried onward from here).
-->

# Story 12.2: Admin Module-Targeting Wizard `[SURFACE]`

Status: done

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

## ⚖️ Build decisions QE1–QE22 (ANSWERED 2026-11-01 — every one AS RECOMMENDED, QE16 AMENDED; Task 0.2)

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
    - refuse invisible formatters U+200B, U+2060, U+FEFF, U+00AD; ⚠ WIDENED 2026-11-01 by code review RP1 and DN2 (BigDev's answer "2"): every other format character (Cf) and every other default-ignorable code point is refused too — except U+FE0E / U+FE0F — as are U+2028 / U+2029, the Braille blank U+2800 and the four Hangul fillers; recorded (v1.10) by author-commit `2026-11-01-434`, which amends `-433` QE12 and ADR-0044 D3 / D4 in part;
    - ⭐ ALLOW U+200C / U+200D (ZWNJ / ZWJ — Devanagari conjunct control); ⚠ NARROWED 2026-11-01 by code review DN1 (BigDev's answer "1"): allowed in the `*_hi` schemas ONLY, refused in the `*_en` ones — recorded (v1.10) by author-commit `2026-11-01-434`;
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
    function, so every row below — the pre-check ones included — is a row of `mapModuleError`. ⚠ CORRECTED 2026-11-01 (code review round 2, RB7 / PT18): the publish pre-checks `module.not_draft` / `module.window_ended`, the detail read's `module.not_found` and the idempotency rows are raised in the handler — only the two publish pre-checks pass THROUGH `mapModuleError`; the others never reach it.

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
      retry) ⚠ SUPERSEDED 2026-11-01 by code review RP18: a key per request BODY (`attemptKey` — kept while the answers are unchanged, a new one when they change); recorded at RC19; a 422 maps each issue back to its step. "Start a corrected copy" pre-fills from an existing module.
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

- [x] **Task 0 — governance first (AC0).** ⭐ Do NOT write code before 0.1–0.3 are done and in the Debug Log.
  - [x] 0.1 `git fetch origin`; rebase on `origin/main` if it moved. Re-grep NUMBERS on every ref and worktree (decision
        id, migration + journal `when`, `PERMISSION_CATALOG_VERSION` + key count, ledger letter in BOTH ledgers).
        Re-verify G1 (signatures; the shared name schemas), G3, G6 (both twins' COMMIT placement), G8, G9, G13
        (`twt_service` grants), G14 (`ACCESS_SURFACE_ROOTS` feeds both invariants), G17. Run 0.1 again at each numbered
        commit.
        ⭐ **DONE (2026-11-01):** re-grepped — `origin/main` = `36b489c9`, unmoved (no rebase); decision `-433` taken
        (`f95f7ae6`, this branch only; main tops at `-432`, siblings at `-430`); migration `0195` free (main tops at
        `0194_memorial-kinship`, `when` 1796355600039; ⛔ sibling has committed a higher one, ⛔ worktree holds an untracked
        one); `PERMISSION_CATALOG_VERSION = 56` / 74 keys on every ref ⇒ v57 free (still contested — re-read at Task 1);
        ledger letters `m`–`p` are this story's, `q` next (13-2 tops at `i`, 14-3 `e`, 6-22 `f`); G1 re-verified
        (signatures, the shared `moduleNameSchema` / `moduleDescriptionSchema` feed `ModuleAuthoredPayloadSchema`).
  - [x] 0.2 Put QE1–QE22 to BigDev with the five ASKs first (QE3, QE6, QE7, QE9, QE17). Record the answer verbatim.
        ⭐ **DONE (2026-11-01, during `bmad-create-story validate 12.2`), in two answers.** First, BigDev, verbatim:
        *"QE16 needs the strict base64url validation amendment before the implementation begins.
        QE3, QE6, QE7, QE9, QE17 AS RECOMMENDED."* ⇒ QE3 (A), QE6 (A), QE7 (A), QE9 confirmed, QE17 confirmed — the
        Task 0.3 rewrite map is NOT triggered; QE16 AMENDED (the strict decode, written into QE16 in v1.4). Then,
        BigDev, verbatim: *"rest of the QEs as recommended"* ⇒ QE1, QE2, QE4, QE5, QE8, QE10–QE15 and QE18–QE22
        ACCEPTED as recommended (QE16 as amended). The author-commit (0.3) records QE1–QE22 from these two answers.
  - [x] 0.3 Author-commit `≥ -433` (re-grep): QE1–QE22 as answered, the §0 table, the key + holder set, the explicit
        amendments of `-427` QE5 AND `-429` (QE6 — each quoted in full), the amendment of `-429` C11 in part (QE5 — C11
        quoted in full), the ADR-0044 amendment set (QE20 — D5 both sentences, D2, D3 / D4, Consequences, Alternatives),
        the two-deed-drafts fact (QE6), the consequences (one migration, one key, NO new ADR, NO roster row, one dated
        note on roster Row 26 — QE19). Commit it ALONE:
        `governance: decision 2026-11-01-NNN — AUTHOR-COMMIT: Story 12.2 build decisions QE1-QE22`.
        ⭐ **DONE (2026-11-01):** Decision **`2026-11-01-433`**, committed ALONE as **`f95f7ae6`** on this branch
        (`-433` re-grepped free on every ref and worktree at the commit; `origin/main` = `36b489c9`). It records
        QE1–QE22 as answered (QE16 amended), §0, the key `module.manage` + holder set, amendments (A1) `-427` QE5,
        (A2) `-429`'s trust-deed bullet and (A3) `-429` C11 — each quoted in full — (A4) ADR-0044 in part, the
        two-deed-drafts fact and the consequences. The Task 0.3 rewrite map was NOT triggered.
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
  - [x] 0.4 Records (one commit), using [[feedback_closure_language_precision]]. ⚠ The closure vocabulary is exactly
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
        ⭐ **DONE (2026-11-01):** one records commit (story v1.7, ledger `2026-11-01q`) — `deferred-work.md` (dated
        "being built" lines on 12.2's legs; the real deferrals labelled "Resolved via explicit deferral"; `role`/`cohort`
        stays "Not addressed" + the D8 line; `commission_terms` re-pointed to `-433` A1 / A2; a NEW "Deferred from: story
        12-2-…" section), `epics.md` (INHERITED FROM 12.2 under 12.3 / 12.5 / 12.6; the 12.2 note re-pointed), ADR-0044
        (six dated amendment lines + a Changelog row), the tone-checklist "Partner module" row, the roster Row 26 note.
- [x] **Task 1 — permission (AC2).** `permissions.ts` (history comment, version +1, `'module.manage'` with a comment
      naming 12.2 and the inert-narrower-grant acceptance condition), `roles.ts` (`pariwar_admin`), the two rbac tests.
- [x] **Task 2 — migration + schema + RLS (AC1).**
  - [x] 2.1 `schema/marketplace_partners.ts`, `schema/marketplace_module_publications.ts` (header: insert-only, C12,
        QE3 / QE4), exported from `schema/index.ts`; `policies/marketplace-partners-rls.ts`,
        `policies/marketplace-module-publications-rls.ts` (named select / insert policies, NOT `for: 'all'`), exported from
        `policies/index.ts`.
  - [x] 2.2 HAND-AUTHOR the migration (do NOT run `db:generate`; `--> statement-breakpoint`; hand-add the
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
  - [x] 2.3 Update BOTH stale comments in `ids/index.ts`: the `PartnerId` brand's "⛔ FK until Story 12.2" and the
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
  - [x] 2.4 Fix the 12.1 live specs (G17):
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
- [x] **Task 3 — domain (AC3–AC5, AC8–AC10).** All under `packages/domain/src/marketplace/`, exported via `index.ts`.
  - [x] 3.1 `filters.ts`: ADD the QE12 write-only schemas + `partnerDisplayName{En,Hi}Schema`; `parseModuleManifest` uses
        them. Do NOT edit `moduleNameSchema`, `moduleDescriptionSchema` or `events.ts` (TR16). Write every code point as
        a `\uXXXX` escape and scan the file after writing (TR15).
  - [x] 3.2 `partners.ts`: a PURE `parsePartnerDisplayNames({ displayNameEn, displayNameHi })` (the partner schemas →
        parsed values, or throws `ModulePartnerNameInvalidError` with issue paths) — the handler calls it as a PRE-CHECK
        (QE18); `createPartner(client, { pariwarId, partnerId, displayNameEn, displayNameHi, actorId, auditId })` takes
        ALREADY-PARSED values (it re-asserts nothing that could refuse inside `mutate`, beyond the DB unique);
        `listPartnersForPariwar(db, pariwarId, { limit? })` (clamp inline), `getPartner(db, pariwarId, partnerId)`.
  - [x] 3.3 `publication.ts`: `moduleResourceLocator(id) = 'module/<id>'`, `moduleToneContentHash(module, partner)`,
        `recordModulePublication(client, { module, publishedEventType, reviewedBy, hindiReviewed,
        partnerAgreementConfirmed, contentHash, auditId })` (`pariwarId` from `module`), `getModulePublication(db,
        pariwarId, moduleId)`.
  - [x] 3.4 `read.ts`: the NEW `pageModulesForPariwar` + `encodeModuleCursor` / `decodeModuleCursor` (QE16 — JS
        validation BEFORE SQL; `ModuleCursorInvalidError`); leave `listModulesForPariwar` UNCHANGED;
        `getModuleAuthorActorId(db, pariwarId, moduleId)` (the genesis event's `actor_id`, `string | null`);
        `countModuleLeads(db, pariwarId, moduleId)` (`module.lead_submitted` on this stream).
  - [x] 3.5 `scope-options.ts`: pure `buildModuleScopeOptions`, `listModuleScopeOptions`, `findListedWorkplaceDistricts`
        (QE5), plus `assertScopeValuesRecorded(db, pariwarId, scopeFilter, at)` — called only with a filter that already
        passed `ScopeFilterV1Schema.safeParse` — throwing `ModuleScopeRequiresGeoTreeError` / `ModuleScopeValueUnknownError`.
  - [x] 3.6 (QE7 (A)) `activation-sweep.ts`: `selectDueScheduledModules` + `classifyActivationOutcome` ONLY (I11).
  - [x] 3.7 `errors.ts`: ADD `ModulePartnerUnknownError`, `ModuleScopeRequiresGeoTreeError`,
        `ModuleScopeValueUnknownError`, `ModulePartnerNameInvalidError`, `ModuleCursorInvalidError` (the 12.1 shape —
        typed, NO HTTP status; their wire codes are QE18's).
- [x] **Task 4 — contracts (AC13).** `packages/contracts/src/modules/{enums,dto,index}.ts`: re-declared tuples (states,
      archive reasons, eligibility states, scope kinds), `MODULE_PUBLISH_STEP_UP_CONTEXT`, SHAPE-only request DTOs
      (QE18 — incl. `partner_id: z.string().uuid()`; the withdraw body `z.object({}).strict()` — QE15), response DTOs (`.strict()`, snake_case; the detail DTO carries
      `author_display_name`, `authored_by_viewer: boolean`, `publication` (with `reviewer_display_name`) | `null`,
      `lead_count`), the list `{ items, next_cursor }`; export from `src/index.ts`; a contracts test for tuple sync; a
      dated note in `partners/README.md` (QE3). Register OpenAPI paths in `scripts/emit-openapi.ts`; regenerate the
      repo-root `openapi/v1.yaml`.
- [x] **Task 5 — API (AC2–AC8).** `apps/api/src/modules/marketplace/`:
  - [x] 5.1 `routes.ts`: the G7 chain with `module.manage`; publish adds `requireStepUp(deps,
        MODULE_PUBLISH_STEP_UP_CONTEXT)`. Routes: `GET /modules` (`state?`, `limit` ≤ 200, `cursor?`), `GET
        /modules/:moduleId` (uuid param), `GET /modules/scope-options`, `GET /modules/partners` (`limit` 1–200) and
        `POST /modules/partners`, `POST /modules`, `POST /modules/:moduleId/publish`, `POST /modules/:moduleId/withdraw`.
        EVERY route declares its `200` response schema (the forced-pagination gate examines only routes that do — G7).
  - [x] 5.2 `handlers.ts`: reads on `request.scopeTx`. Writes via a LOCAL `tenantWrite` — COPY the questionnaire shape
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
  - [x] 5.3 `errors.ts`: `mapModuleError` — EVERY row of the QE18 table, including the five 12.2 classes and
        `ModuleStateDirectWriteError` → 500 `module.state_direct_write_rejected` (logged at error); unit-tested row by row. ⚠ CORRECTED 2026-11-01 (code review round 2, RB7 / PT18): the publish pre-checks `module.not_draft` / `module.window_ended`, the detail read's `module.not_found` and the idempotency rows are raised in the handler — only the two publish pre-checks pass THROUGH `mapModuleError`; the others never reach it.
  - [x] 5.4 Register in `server.ts`.
- [x] **Task 6 — job (AC9; per QE7).** (A): `QUEUE_NAMES.MODULE_ACTIVATION`; `apps/jobs/src/scheduler/
      module-activation.ts` — `runModuleActivationTick(deps)` (QE7 (A): the Row 26 guard first —
      `smsDelivery.canReadAcrossPariwars(tickPool)`, false ⇒ ONE `module_activation.rls_bound_role` alarm through the
      `claim-contact-ladder.ts` `alarmOf` / `onAlarm` shape and the tick ends (QE19); then `selectDueScheduledModules`;
      then the EXPORTED `activateDueModule(deps, candidate)` per candidate → `'activated' | 'skipped' | 'failed'`;
      `mutate` = `withPariwarScope(tickPool, …)`, I2; `classifyActivationOutcome`) and `registerModuleActivationCron(boss, deps, { cron = '*/5 * * * *', tz =
      'Asia/Kolkata' })` — the 5-field cron check is the regex in `apps/jobs/src/boot.ts` (the renewal registrar has
      none); `localConcurrency: 1` follows `wa-webhook-processor.ts` (pg-boss `^12` hands the handler an ARRAY of jobs);
      its own `max: 3` pool created in `boot.ts`; wired in `boot.ts`.
- [x] **Task 7 — access-wrapper gate (AC13).** Split the root list so the compensating-audit invariant scans
      `[...ACCESS_SURFACE_ROOTS, ...MARKETPLACE_ROOTS]` while the constant-time-compare invariant keeps
      `ACCESS_SURFACE_ROOTS` (it would pass vacuously on marketplace). `MARKETPLACE_ROOTS = ['apps/api/src/modules/
      marketplace', 'packages/domain/src/marketplace']` — DIRECTORIES only (a file root throws ENOTDIR). The job file
      `apps/jobs/src/scheduler/module-activation.ts` is NOT scanned — say so in the README line. Record the
      revert-sanity RED → green.
- [x] **Task 8 — admin UI (AC11, AC12).**
  - [x] 8.1 Fetchers in the CENTRAL `apps/admin/src/api/client.ts` and hooks in `apps/admin/src/api/hooks.ts` (per-feature
        query keys; writes via `mutateAsync` — [[project_tanstack_mutate_callbacks_latest_only]]; the Idempotency-Key
        minted once per user intent and REUSED on retry; the withdraw fetcher sends `body: JSON.stringify({})` — QE15).
  - [x] 8.2 `apps/admin/src/modules/marketplace/`: `ModulesPage.tsx` (list, state filter, "Load more" cursor),
        `ModuleWizard.tsx` (steps a–f + summary), `ModuleDetailPage.tsx` (publish / withdraw / corrected copy),
        `PartnerPicker.tsx` (select or create inline), `ScopePicker.tsx`, `i18n-en.ts` holding EVERY ordered string:
        AC11's opening line, state labels, the step (b) no-member-yet notice and its reaches-no-member warning, the
        role/cohort line, BOTH scope sentences (no district; unlisted district), the truncation notice, the Summary's
        audience / status sentences (the Policy-meaning strings) and the QE11 secret copy; AC12's three tick texts, the author sentence, the single-admin line and the "members cannot see offers
        yet" line; the C10 warning (QE15).
  - [x] 8.3 Routes: `src/routes/ModulesRoute.tsx` (session gate views, the `BannersRoute` shape) + three `createRoute`s
        in `router.tsx` + a Pariwar-scoped nav link in `RootLayout.tsx` (ungated client-side; the server's 403 is the
        boundary).
  - [x] 8.4 `derive.ts` (pure, tested): `describeEligibility`, `describeScope`, `describeWindow` (IST + the browser
        zone), `describePlaces`, `validateStep(n, state)`, `toAuthorRequest(state)` (CRLF → LF), `fromModule(module)`
        (the corrected-copy prefill), `issueToStep(path)`, `moduleErrorGuidance(code)`, `toIsoOrNull` (a copy of the
        private banners helper).
- [x] **Task 9 — tests.** Per Testing standards. Every assertion names a code / error class.
- [x] **Task 10 — verify + records (AC14).** `pnpm ci:local` on a fresh container (`DATABASE_URL` = the story port on
      EVERY push — [[project_prepush_hook_inherits_5432]]); Completion Notes: I1 / I8 / I9 / I10 / I11 greps, the variance list,
      the RPD4 re-statement of 12.1's I6; in `deferred-work.md`, replace each 12.2 LEG's dated "being built by Story
      12.2" line (Task 0.4) with "Closed by `<sha>` (12.2's leg: …)" naming the code commit — every OTHER leg of the
      same item keeps its text and owner; ledger lines prepended SAFELY to BOTH ledgers
      ([[project_sprint_status_safe_prepend]]); row → `review`.

### Review Findings — round 1, chunk A: the domain / DB layer + the records (2026-11-01, `bmad-code-review 12.2`)

Scope of THIS round: `36b489c9..60d823e9` restricted to `packages/domain` + `packages/queue` (45 files, 3,683 diff lines), plus the
records diff (decision `-433`, `deferred-work.md`, `sprint-status.yaml`, `epics.md`, ADR-0044, roster Row 26, tone checklist,
access-wrapper doc) audited against the code by the Acceptance Auditor. Three layers ran in parallel, read-only: Blind Hunter
(given the diff as a file in the session scratchpad, not inline, and told to read nothing else), Edge Case Hunter, Acceptance
Auditor (spec + load-bearing-invariant checklist lens). At the time of this round NOT yet reviewed (both were reviewed afterwards — see the later sections): chunk B (contracts, API routes / handlers, jobs sweep,
gate scripts, `openapi/v1.yaml` by regenerate-and-diff) and chunk C (admin UI). NOT re-run: `ci:local` 37/37 and the access-wrapper
revert RED run are the story's own claims and are not reproduced here. Every finding below was re-checked against the tree by the
reviewer before it was written (the Unicode and BOM cases were executed in plain `node`).

Carried to chunk B (an API-layer claim, not judged from the domain diff): the Auditor's note that admin attribution on the detail
read is a live name lookup with a fallback label (`displayNameOrLabel` in the API handlers) while checklist family 8 says a missing
name blocks the action. The actor id is stored on the event and both rows, so attribution itself is stable; whether the fallback
departs from family 8 is ANSWERED in the chunk B section below (verdict (a): sanctioned, not a finding).

- [x] [Review][Patch] **DN1 — ZWNJ / ZWJ are allowed in the three `_en` display schemas (QE12), so look-alike duplicate partners register — RESOLVED by BigDev (verbatim: "1", option A): refuse U+200C / U+200D in the `_en` schemas and keep them in `_hi`; this narrows QE12 for English text only** — the question as put: QE12 allows U+200C / U+200D "for Devanagari conjunct control", but `displayText` applies the allowance to `partnerDisplayNameEn` / `moduleDisplayNameEn` / `moduleDisplayDescriptionEn` too (`requireDevanagari: false`), and the partner unique index is on `lower(display_name_en)`, which does not fold them: "LIC" and "L" + ZWJ + "IC" are two partners that read identically. Rows are insert-only, so a look-alike can never be corrected. Options: (A, recommended) refuse U+200C / U+200D in the `_en` schemas and keep them in `_hi` — narrows QE12 for English text only; cost: an English name that needs a joiner is refused (none expected). (B) keep QE12 as written — cost: look-alike partners stay possible and permanent. The Panel gate (§0) FAILS: no change in what the Trust discloses or owes, it is a validation rule, so this is BigDev's call and is NOT routed. Fix (as resolved): the three `_en` schemas refuse U+200C / U+200D (the `_hi` schemas keep accepting them); add a vector pair to `filters.test.ts` — an `_en` value with a joiner is refused, the same joiner in a `_hi` value is accepted — and record the QE12 narrowing in the Completion Notes. [packages/domain/src/marketplace/filters.ts:198, 230-236] (blind)
- [x] [Review][Patch] **RP1 — The display-text guards miss filler, line-separator and format characters (MED)** — reproduced in `node`: U+3164, U+115F, U+FFA0 (all `Lo`) satisfy `LETTER_OR_DIGIT` and `trim()` leaves them, so a name made only of fillers is accepted although the header says "a blank-looking value is refused"; U+2028 / U+2029 pass the "no line break" rule (it stops at C0 / C1); U+180E, U+2061–2064, U+206A–206F and the tag range U+E0020–E007F (`Cf`) are not in `DISPLAY_REFUSED_FORMAT_CHARS`. Reachable: `POST …/partners` (`parsePartnerDisplayNames`) and `POST …/modules` (`parseModuleManifest`) both use these schemas; partner and manifest rows are immutable, so a bad value is permanent, and the partner name is part of the tone hash. Fix: refuse every `Cf` code point except U+200C / U+200D (kept for `_hi`, refused in `_en` — DN1) plus U+2028 / U+2029; run `LETTER_OR_DIGIT` on a copy with U+115F, U+1160, U+3164, U+FFA0 removed; extend the refusal vectors in `filters.test.ts` (the list stops at U+00AD) [packages/domain/src/marketplace/filters.ts:205-225] (blind+edge)
- [x] [Review][Patch] **RP2 — A BOM-prefixed cursor is accepted as a second spelling of a valid cursor (LOW)** — `new TextDecoder('utf-8', { fatal: true })` has `ignoreBOM: false`, so it strips a leading EF BB BF; the canonical re-encode check one step earlier compares the raw bytes and cannot see it, and the stripped text then equals the canonical JSON. Reproduced: `TextDecoder` returns text with no U+FEFF. No data impact, but it breaks the QE16-amended "canonical only" strictness (TR25). Fix: `ignoreBOM: true` so the BOM stays in `text` and makes `JSON.parse` throw (reported as "not json"); add the vector to `read-cursor.test.ts` [packages/domain/src/marketplace/read.ts:167] (edge)
- [x] [Review][Patch] **RP3 — The "a limit is clamped" test cannot fail on the bug it names (LOW)** — `clampLimit(0)` is 1 and two modules (`opensSoon`, `shortWindow`) are due at `at`, so the regression "LIMIT 0 = no rows" returns 0 rows and satisfies `toBeLessThanOrEqual(1)`. The sibling clamp test in `read-cursor.spec.ts` already asserts `toHaveLength(1)`. Fix: `toHaveLength(1)` for both `limit: 0` and `limit: -5` [packages/domain/tests/integration/marketplace/activation-select.spec.ts:112-116] (blind)
- [x] [Review][Patch] **RP4 — Cursor test hygiene: one conditional assertion, one index overflow, three transactions with no ROLLBACK on failure (LOW)** — the "non-canonical last character" case asserts only `if` the bumped string decodes to the same bytes, and `alphabet[indexOf(last) + 1]` is `undefined` when the last character is `_`; `pages()` and the two tests after the clamp test `BEGIN` on a pool of 2 and `release()` in `finally` with no `ROLLBACK`, so after one failed assertion the next test is handed an open or aborted transaction under `SET LOCAL ROLE twt_app` (the same file's `beforeAll` / `afterAll` already `ROLLBACK` in `catch`). Fix: derive the non-canonical sibling deterministically from the 4 characters sharing the decoded bytes, assert it exists, then `expectInvalid` unconditionally; add the `ROLLBACK` in `catch` [packages/domain/tests/marketplace/read-cursor.test.ts:91-100; packages/domain/tests/integration/marketplace/read-cursor.spec.ts:90-110, 143-171] (blind)
- [x] [Review][Patch] **RP5 — No live two-connection proof for 12.2's publish path (checklist family 2, REAL GAP — MED on the AC ladder)** — grep for `Promise.all` / concurrent / race over `marketplace-admin.spec.ts`, `module-activation.test.ts` and `publication.spec.ts` finds nothing, and 12.1's `module-stream-concurrency.spec.ts` received fixture edits only (`seedPartner`). Safe BY CONSTRUCTION — the command's `FOR UPDATE` row lock, the publications PK `marketplace_module_publications_pkey`, and the `module.not_draft` mapping — so the gap is the missing proof, not a known fault. Fix: a live test where two non-author admins publish the same draft at once: one 200, one 409 `module.not_draft`, exactly one publication row, exactly one publish event, one audit pair per winner; and publish vs withdraw. The handler half was read in chunk B (the publish handler runs the command, the record and COMMIT in one `mutate`) [apps/api/tests/integration/marketplace-admin.spec.ts] (auditor)
- [x] [Review][Patch] **RP6 — `countModuleLeads` is never exercised above 0 and `getModuleAuthorActorId` has no direct domain test (checklist family 7 — REAL GAP, thin)** — neither name appears in any domain, API or jobs test; the API spec asserts `lead_count: 0` only and the UI warning is tested with a mocked 3. A wrong event type or stream filter would still return 0 and every test stays green, and the C10 12.2-half closure rests on this path. `getModuleAuthorActorId` IS covered end to end by the author-refused and NULL-author legs. Fix: a domain integration test that seeds two `module.lead_submitted` events on one module and none on another, and asserts 2 / 0 (and 0 for the same stream id read from another Pariwar's scope) [packages/domain/src/marketplace/read.ts:233, 246] (auditor)
- [x] [Review][Patch] **RP7 — WITHDRAWN by the patch-diff review: the sweep classifier's original comment was RIGHT (LOW)** — round 1 said "the row will never be re-selected" holds only while the cache row and the event stream agree, and reworded the comment around a `skipped` row re-selected under drift. That premise was wrong (two patch-review layers, PB1 and PR1, and verified in `runLockedTransition`): `ModuleIllegalTransitionError` is thrown from `nextModuleState(row.currentState, …)` on the LOCKED CACHE ROW, so it only ever means that row is no longer `scheduled`, which the scan (`current_state = 'scheduled'`) excludes; `ModuleOutsideWindowError` means `valid_until` passed, which the scan (`valid_until > now()`) excludes. Cache / stream drift trips the stream-head check in `projectModuleTransition` and throws `ModuleStreamConcurrencyError`, which classifies as `failed` and is logged per module on every tick. The comment now says exactly that. The round-1 diagnosis was the reviewer's: it took the Edge layer's own "inference" and did not trace `runLockedTransition`. The retry-forever behaviour is RD1 [packages/domain/src/marketplace/activation-sweep.ts `classifyActivationOutcome`] (blind+edge)
- [x] [Review][Patch] **RP8 — The publications schema header promises an atomicity the database does not enforce (LOW)** — "a module is never published without its record, nor recorded without its event": nothing at the DB or in `recordModulePublication` ties the row to the module's state or to the event; it holds because the publish route runs the command, the record and COMMIT in one `mutate` (AC6, chunk B). Fix: reword to name the route as the guarantor [packages/domain/src/schema/marketplace_module_publications.ts:5] (auditor)
- [x] [Review][Patch] **RP9 — Three records are stale or imprecise (LOW)** — (a) `deferred-work.md`, the RPD4 item's 12.2 I6 leg (QE22) reads "Closed by `89add5ee`", but `89add5ee` touches no `_bmad-output` file: the re-statement that closes the leg is in this story's Completion Notes (`60d823e9`) and the fact it restates is true as of `89add5ee`; reword so the citation says which is which (cite the item heading, never a line). (b) roster Row 26 `jobs-db-role` dated note still says "12.2's migration (≥ `0195`)"; it is exactly `0195`. (c) this file's header comment still reads "STATUS: ready-for-dev (v1.6) … Still owed before code: the records (Task 0.4)" and its NUMBERS ledger line stops at `2026-11-01p`, while the body says `Status: review` at v1.8 with ledger `q` and `r` [docs/launch-gate-inventory/inventory-roster.md (Row 26 note); this file lines 18-25, 55-62] (auditor)
- [x] [Review][Defer] **RD1 — A persistently failing activation is retried every tick with no backoff and no escalation beyond a log line** — deferred: the trigger is a cache / stream drift that 12.1's RVD2 already carries with "no repair path yet"; it surfaces as `ModuleStreamConcurrencyError` → `failed`, logged per module on every tick (`console.error`) but never escalated (round 1 first called it a silent `skipped` row; that was wrong — see RP7). Each retry writes an intent + `_rolled_back` audit pair per module per 5 minutes, and a head of 500 such modules would starve later ones, which is unreachable at the current scale (nothing is live; the scan is capped at 500, oldest `valid_from` first). Owner: whichever story builds RVD2's repair path. Re-trigger: the first drifted module seen in a non-test database, or any move toward go-live of the activation sweep (roster Row 26). [packages/domain/src/marketplace/activation-sweep.ts; apps/jobs/src/scheduler/module-activation.ts `activateDueModule`] — deferred, recorded in `deferred-work.md` (blind+edge)

Dismissed as noise (13 items, covering 14 raised findings — the district and comparator findings share one item), each checked against the tree: the sweep grant under RLS (`twt_service` is NOLOGIN NOBYPASSRLS, but the tick runs `canReadAcrossPariwars` FIRST and raises `module_activation.rls_bound_role` — the guard's reaction is pinned by `module-activation.test.ts`, which STUBS the role check; the real login's role is roster Row 26, the go-live gate); same-named districts under different states (the geo-tree document enforces `(dimension, value)` uniqueness across the WHOLE document, so the comparator's tie branch is unreachable); the tone attestation carrying no information (QE9 ratifies `CHECK (hindi_reviewed)` / `CHECK (partner_agreement_confirmed)` as a recorded self-attestation); the migration failing on a database holding 12.1 rows (documented in the migration header; pre-production; fresh and CI containers are unaffected); the audit-wrapper gate being evadable (no subdirectory exists under `src/marketplace`, and the access-wrapper AST gate in `scripts/` is the real gate; the namespace-shape limit is already a "Not addressed" line); the partner list having no cursor (documented as carried); the `created_at::text` DateStyle coupling (documented; every Postgres default is ISO); the table-wide `GRANT SELECT, UPDATE` to `twt_service` (decision `-433` clause, Row 26); `seedPartner` under a session-level `SET ROLE` (no caller does that); duplicated CHECK literals (comment-pinned, tested by name); `listModuleScopeOptions` vs the write pre-check clock and the `asOf` test override (documented); one `module.manage` key and a single admin unable to publish their own module (QE9 single-admin precedent CONFIRMED by BigDev); the partner display-name columns having no content CHECK (QE3 lists none; a content CHECK on Unicode classes is not expressible in the database, and RP1 closes the application half).

#### Patches applied (2026-11-01 — BigDev answered "1", "Apply every patch", to the patch menu)

All ten patches (DN1 and RP1–RP9) are applied; committed (v1.9) as code `465a2ac8` with the records that follow it. How each
was done, and how it was proven:

- **DN1 + RP1 — `filters.ts`.** The three `_en` schemas refuse U+200C / U+200D (a new `allowJoiners` option: `true` for the
  `_hi` schemas, `false` for the `_en` ones). Every format character (category Cf, matched by property, so a code point
  Unicode adds later needs no edit) and the line / paragraph separators U+2028 / U+2029 are refused in every display schema.
  The four Hangul fillers (U+115F, U+1160, U+3164, U+FFA0) are refused ANYWHERE, not just stripped before the letter test as
  the finding suggested: stripping would still have accepted "filler + LIC + filler", a padded look-alike of "LIC". Proof:
  18 test cases were RED against the old source, and all pass after; the QE12 header comment is rewritten.
- **RP2 — `read.ts`.** `ignoreBOM: true`; the BOM now stays in the text and fails as "not json". A BOM-prefixed cursor vector
  was RED before and passes after.
- **RP3 — `activation-select.spec.ts`.** `toHaveLength(1)` for both `limit: 0` and `limit: -5`. Mutation check: with the
  clamp replaced by a LIMIT-0 version the test fails ("expected [] to have a length of 1"); the old assertion passed.
- **RP4 — `read-cursor.test.ts`, `read-cursor.spec.ts`.** The non-canonical sibling characters are derived, and the premise (exactly 3 sibling characters, which implies the 107-character shape) is asserted, so a change to `good` fails loudly instead of asserting nothing; three
  `ROLLBACK`s on failure.
- **RP5 — `marketplace-admin.spec.ts`.** Two new live tests: two admins publishing the same draft at once (3 rounds) and
  publish vs withdraw (4 rounds). Which path the loser takes (the route's unlocked pre-read, or the command's row lock) is
  timing, so every assertion holds for both. Mutation check: with `FOR UPDATE` removed from the command's row lock, both
  tests fail (the loser answers `module.concurrent_change`), so they do reach the lock.
- **RP6 — `read.spec.ts`.** `countModuleLeads` is asserted at 2 / 0 and bound to the Pariwar and the stream;
  `getModuleAuthorActorId` returns the genesis actor and null for a system genesis, another Pariwar and an unknown module.
  Mutation check: a wrong event type in the count fails the 2-lead test ("expected 0 to be 2").
- **RP7 (reverted by the patch-diff review — see its finding), RP8 — comments only** (`activation-sweep.ts`, `marketplace_module_publications.ts`).
- **RP9 — records.** (a) the RPD4 item's I6 leg in `deferred-work.md` now says "Closed by the Completion Notes re-statement in
  `60d823e9`" and names `89add5ee` as the code that makes it true; (b) roster Row 26's "(≥ `0195`)" is "(`0195`)"; (c) this
  file's header STATUS line and NUMBERS ledger line now cover v1.7–v1.8 and ledger letters `q` and `r`.

Verified on the story container (`twt-12-2-pg`, port 5451): `tsc --noEmit` exits 0 for `@twt/domain` and `@twt/api`; ESLint
exits 0 on the ten changed TypeScript files; the domain marketplace unit + integration sets pass (23 files, 544 tests); the
API admin-module spec plus `marketplace-errors.test.ts` pass (48); the jobs `module-activation` test passes (6). NOT run:
the full `pnpm ci:local` gate (37 jobs) — run it before the push.

Open after this round: the QE12 narrowing is NOT recorded in any governance document. `.decision-log.md` `-433`, ADR-0044 (its "ZWJ / ZWNJ allowed" line) and QE12 itself (a dated pointer there now says so) all still say ZWNJ / ZWJ are allowed, so the shipped code departs from three ratified texts until BigDev authorises an amendment. Chunks B and C were reviewed afterwards (below). ⭐ CLOSED 2026-11-01 (v1.10): BigDev — *"Write the QE12 narrowing into -433 and ADR-0044"* — author-commit `2026-11-01-434` (`e6f30675`) amends `-433` QE12 (`-433` itself is not edited) and adds a dated line at ADR-0044 D3 / D4.

### Review Findings — round 1, chunk B: the API / jobs / contracts layer (2026-11-01, `bmad-code-review 12.2`)

Scope: the working tree against `36b489c9` restricted to `packages/contracts`, `apps/api`, `apps/jobs` and `scripts/` (19 files,
3,084 diff lines). The diff includes the round-1 chunk A race tests, which a different layer therefore also read. `openapi/v1.yaml`
was checked by regenerate-and-diff, not read: `contracts:check-openapi-determinism` re-emits it and asserts byte-identity with the
committed file — it passes, and the file is untouched. Same three layers, parallel, read-only (the Blind Hunter again read the diff
from a scratchpad file, nothing else). Every finding below was re-checked against the tree before it was written. NOT re-run:
`ci:local`.

Carried question from chunk A — RESOLVED, verdict (a), not a finding: admin attribution on the detail read is a live
`getDisplayName` lookup with the fallback label `UNNAMED_ADMIN_LABEL`, and checklist family 8's "missing name blocks the action"
applies to a write that snapshots a name; 12.2 has none. The spec says so in G6 (which says, in the story's glyph shorthand, that the module commands take no display name so 12.2's writes do not call `displayOf` — paraphrased here, not quoted), Task 5.2 ("do NOT call `displayOf` … `author_display_name` / `reviewer_display_name` via
`getDisplayName` … with a fallback label … NEVER a 500") and AC8; attribution is by the actor id stored on the event and on both
rows (QE14), and no table has a name column. Residual, disclosed: the label is live, so a later rename changes what the detail page
shows while the permanent record (the actor id) does not move.

- [x] [Review][Patch] **RP10 — `payloadHash` is not total, so one admin-supplied value turns a 422 into a 500 (MED)** — `slot_capacity` in `AuthorModuleRequest` is a bare `z.number().nullable()`, and Zod 3 lets `Infinity` through (`JSON.parse('1e999')`); `canonicalJsonStringify` throws on a non-finite number while `audited` is building the audit-intent arguments, i.e. before the intent line exists, so the client gets a raw `TypeError` as a 500 and no audit line, where the domain's `moduleSlotCapacitySchema` would have answered 422 `module.manifest_invalid` with an issue path. A deeply nested `eligibility_filter` is the inferred twin (the canonicaliser recurses; the body limit is 1 MiB). Fix: `payloadHash` catches and hashes a fixed `{ unhashable: true }` shape, so the domain parse answers; prove it RED first with a raw `1e999` body [apps/api/src/modules/marketplace/handlers.ts:77-79; packages/contracts/src/modules/dto.ts:56] (edge)
- [x] [Review][Patch] **RP11 — The AC2 "403 on all eight routes" leg cannot tell a missing permission from the publish route's step-up gate (MED, checklist family 3)** — the loop asserts only `statusCode` 403; publish also answers 403 when the step-up is absent, and the district admin never elevated, so deleting `requirePermissionHook` from the publish route alone stays green. The questionnaire twin asserts `code` is not `auth.step_up_required`. Fix: assert every response carries the SAME permission-denial code as the first GET and that it is not `auth.step_up_required` [apps/api/tests/integration/marketplace-admin.spec.ts:217-227] (blind+auditor)
- [x] [Review][Patch] **RP12 — Family 3 is tested on 2 of 8 routes for cross-Pariwar and on 0 of 4 for a tampered session (MED — REAL GAP on the AC ladder)** — the no-grant 404 covers `GET …/modules` and `POST …/partners` only; nothing tests a tampered session on author, publish, withdraw or partners. The house standard is the questionnaire twin's RV11 test (positive controls, tamper by rewriting the session's `userId`, EXACTLY 404, before/after counts). Fix: one test with positive controls on all four mutation routes, then a tampered pair of sessions gets exactly 404 on all four with nothing written, and a no-grant admin gets 404 on all eight routes; make `afterAll` delete sessions by `user_id` too, since a tampered `sess.userId` no longer matches. The "non-human / system actor" clause is not constructible here — every route sits behind the admin session guard and nothing else authenticates [apps/api/tests/integration/marketplace-admin.spec.ts:229-234] (auditor)
- [x] [Review][Patch] **RP13 — Three QE13 / QE18 idempotency behaviours have no HTTP test, although the unit-test header says they do (LOW, checklist family 2)** — a key over 200 characters (400 `module.idempotency_key_required`), a concurrent request with the SAME key (`module.idempotency_in_progress`, or the recorded replay if the first already finished), and a withdraw replay. Fix: add them; the same-key race asserts only what holds under either timing — at most one module is written and both 201s name the same module [apps/api/tests/integration/marketplace-admin.spec.ts; apps/api/tests/unit/marketplace-errors.test.ts:3-4] (auditor)
- [x] [Review][Patch] **RP14 — The "event and publication row in one transaction" guarantee is never fault-injected (LOW, checklist family 8)** — it is correct by construction (command, record and COMMIT inside one `mutate`), but the race test's "row IFF published" stays green if the insert moves outside the transaction. Fix: raw-seed a publication row for a draft module, publish, and assert 409 `module.already_published` with the module still `draft`, no publish event, the intent + `_rolled_back` pair, and no sign-off [apps/api/tests/integration/marketplace-admin.spec.ts] (auditor)
- [x] [Review][Patch] **RP15 — Attribution is asserted for author only, and one unit test's title promises logging it never checks (LOW)** — partner create asserts a count of `module_partner.created` lines but not the locator or actor; withdraw counts `module.archived` lines but not the actor or the event's `actor: 'operator'`; `ModuleStateDirectWriteError → … (a bug, logged)` never spies on `console.error`. Fix: assert them [apps/api/tests/integration/marketplace-admin.spec.ts:239-266, 692; apps/api/tests/unit/marketplace-errors.test.ts:129-132] (auditor+blind)
- [x] [Review][Patch] **RP16 — Four comments and records are wrong or orphaned (LOW)** — (a) `routes.ts` says "the step-up is checked LAST — after the session, the scope and the key", but the Idempotency-Key is read in the handler, after the step-up preHandler; (b) in `boot.ts` the Story 3.8 renewal-lifecycle comment now sits above the 12.2 `MODULE_ACTIVATION_CRON` and `RENEWAL_LIFECYCLE_CRON` lost its comment; (c) the `handlers.ts` header's "accepted residual" describes only author's harmless second draft, while for publish the same window loses the sign-off line and turns a retry into 409 `module.not_draft` (and for withdraw into 409 `module.illegal_transition`); (d) the Completion Notes' I10 line says "one hit"; `dto.ts` has two doc-comment hits (lines 15 and 43), both comments, so I10 still holds [apps/api/src/modules/marketplace/routes.ts:126; apps/jobs/src/boot.ts:182-186; apps/api/src/modules/marketplace/handlers.ts:18-19; this file, Completion Notes] (auditor+blind+edge)
- [x] [Review][Patch] **RP17 — The AC6 pre-check test's clock margins invite a flake under load (LOW)** — it authors a module with `valid_until = Date.now() + 1500` on the client clock, so an author call slower than 1.5 s (the repo has recorded `ci:local` oversubscription flakes) answers 422 `window_ended` before the test starts, and it then sleeps a fixed 2 s. Fix: 3 s and 3.2 s [apps/api/tests/integration/marketplace-admin.spec.ts:585, 601] (blind)
- [x] [Review][Defer] **RD2 — An Idempotency-Key reused with a DIFFERENT body replays the first result** — deferred: `withIdempotency` stores and returns the result without a payload fingerprint, so an edited manifest sent under an old key is silently not saved and the client sees the first 201. It is the shared shape of the keyed-store handlers (the questionnaire twin has it too); only the claims ground-inspection handler rejects a changed request. A fix needs a stored fingerprint, a new QE18 row, an OpenAPI response and an admin-client message — a cross-handler change, not 12.2's to make alone. [apps/api/src/modules/marketplace/handlers.ts `withIdempotency`] Owner: NONE YET — no cross-handler idempotency story exists, so this stays unowned until BigDev names one. — not addressed (no owner yet), recorded in `deferred-work.md` (blind+edge)
- [x] [Review][Defer] **RD3 — The post-COMMIT failure window loses the publish sign-off line and can lock a key for 24 h** — deferred: if `recordResult` fails after COMMIT the key is released and a retry gets 409 `module.not_draft` for a publish that succeeded, with no `tone_review.signoff` line ever emitted (the durable publication row survives); if the single, swallowed `release` also fails, the same-key retry gets 409 `module.idempotency_in_progress` until the 24 h TTL. It needs infrastructure to fail between COMMIT and `recordResult`, and the shape is shared by every keyed-write handler. RP16(c) documents it. [apps/api/src/modules/marketplace/handlers.ts `publish`, `withIdempotency`] Owner: NONE YET (as RD2). — not addressed (no owner yet), recorded in `deferred-work.md` (blind+edge)
- [x] [Review][Defer] **RD4 — A scheduled window shorter than the sweep tick can be skipped and then sits `scheduled`** — deferred: the sweep selects only `valid_from <= now() < valid_until` every 5 minutes, so a future-start offer whose whole window falls between two ticks is never activated, and the publish response said `scheduled`. It is the same class as the accepted C2(c) (a scheduled module whose window passed stays `scheduled` until Story 12.6 archives it); real offers span days. Revisit at 12.6, where a minimum window at author or publish time is the cheap guard. [apps/api/src/modules/marketplace/handlers.ts `publish`; packages/domain/src/marketplace/activation-sweep.ts] Owner: Story 12.6 (carried in `epics.md` under 12.6 as INHERITED FROM 12.2). — deferred, recorded in `deferred-work.md` (blind+edge)

Dismissed as noise (15 items, two of them repeats of chunk A), each checked against the tree: the sweep's failure modes (cache / stream drift is logged per module on every tick and carried as RD1; the RLS-bound login is roster Row 26; nothing is live — a merge is not a go-live); the activation write path running with RLS bypassed under the jobs login (a documented, deliberate G13 / Row 26 choice, with explicit `pariwar_id` predicates in the domain); response DTOs stricter than the domain (the domain allows each eligibility kind once, so `max(8)` is looser, and the branding bundle's two keys are required-nullable); the hand-off URL / secret-name SSRF concern (the domain enforces `https:`, canonical form, no userinfo or IP literal, and the secret-name resolution is already carried to Story 12.5 in `deferred-work.md`); withdraw having no pre-read and no step-up (AC7 and QE10 say so by design); a pool deadlock in the detail read (marginal, and the pattern is used widely); `boot.ts` wiring pinned by a source pattern (the repo's stated precedent for `boot.ts` one-liners); authorisation running in `preHandler` after schema validation (the repo-wide shape, e.g. `news-blog`); the composed idempotency key length (the column is `text`, no limit); the partner list's missing cursor (documented as carried); the negation-glyph shorthand (the story's glyph register); mixed clocks in scope options (dismissed in chunk A); test-cleanup ordering (copied from the sibling specs; only matters when cleanup itself fails); the access-wrapper README's sentence about audit pairing (the README discloses the gate's negative-only blind spots); and `actorRole: null` on audit intents (about 60 call sites across the API modules — the repo convention).

#### Chunk B patches applied (2026-11-01 — under BigDev's instruction "after this one done, apply any findings and review chunk C", read as covering chunk B's findings)

All eight patches (RP10–RP17) are applied; the three deferrals are in `deferred-work.md`. Committed (v1.9) as code `465a2ac8`
with the records that follow it.

- **RP10 — `handlers.ts`.** `payloadHash` catches an encoder throw and hashes a fixed `{ unhashable: true }` shape, so the
  domain parse answers. RED first: a raw `1e999` body answered `500 internal.error`; it now answers 422
  `module.manifest_invalid` at `slot_capacity` with the `module.authored` + `_rolled_back` pair. The deep-nesting twin is covered by
  the same `catch` but is not separately tested (it was inferred, not reproduced).
- **RP11 — AC2 test.** Every response must carry the same permission-denial code (`authz.forbidden`) and never
  `auth.step_up_required`. Mutation check: with `requirePermissionHook` removed from the publish route alone, the test fails
  ("expected 'auth.step_up_required' to be 'authz.forbidden'"); the old assertion passed.
- **RP12 — a new family 3 test.** Positive controls on all four mutation routes, then an admin with no grant gets 404 on all eight
  routes, and a tampered pair of sessions gets exactly 404 on the four writes with nothing written (partners, modules,
  publications, events and audit counts unchanged, the open draft still `draft`). `afterAll` now also deletes sessions by
  `user_id`. Mutation check, with a caveat: removing `scopeResolutionHook` from the guard fails the test, but it trips at the
  positive controls (the first write answers 500), so it shows the test depends on the hook, not that the tamper assertion alone
  catches it. The "non-human / system actor" clause is not constructible here: only the admin session guard authenticates these routes.
- **RP13 — three new idempotency tests.** A key of 201 characters is 400 `module.idempotency_key_required` and exactly 200 is
  accepted; two concurrent requests with the same key write one module (the loser is the recorded replay or 409
  `module.idempotency_in_progress`, whichever the timing gives); a withdraw replayed with the same key returns the recorded 200 with
  one archive event and one audit line. The unit-test header's claim is now true for the key-required, over-length and replay rows; `module.idempotency_in_progress` is asserted only if the race produces it (the test passes either way).
- **RP14 — a new fault-injection test.** A publication row raw-seeded for a draft makes the record insert fail after the command has
  written its event: the answer is 409 `module.already_published`, the module stays `draft`, the stream holds only `module.authored`,
  the audit trail is the intent + `_rolled_back` pair, and no sign-off is emitted. Mutation check: committing between the command and
  the record leaves the module `active` and fails the test.
- **RP15.** Partner create asserts the `module_partner/<id>` locator and the acting admin; withdraw asserts the audit line's actor and
  the event's actor id and `payload.actor === 'operator'`; the "(a bug, logged)" unit test now spies on `console.error`.
- **RP16.** The `routes.ts` step-up comment, the `boot.ts` comment order, the `handlers.ts` header residual (now states the publish
  and withdraw consequences and points at RD3) and this file's I10 count are corrected.
- **RP17.** The AC6 pre-check test uses 3 s and 3.2 s instead of 1.5 s and 2 s.

Verified on the story container (`twt-12-2-pg`, port 5451): `tsc --noEmit` exits 0 for `@twt/api` and `@twt/jobs`; ESLint exits 0
on the five changed TypeScript files; the admin-module API spec plus `marketplace-errors.test.ts` pass (54, six new); the jobs
`module-activation` test passes (6); `access-wrapper:check`, `access-wrapper:test` (34), `marketplace-module-state:check`, the
login-wall and forced-pagination specs (11) and the contracts `modules.test.ts` (10) pass; the OpenAPI determinism gate passes.
NOT run: the full `pnpm ci:local` gate (37 jobs) — run it before the push. Chunk C (the admin UI) was reviewed next (below).

### Review Findings — round 1, chunk C: the admin UI (2026-11-01, `bmad-code-review 12.2`)

Scope: the working tree against `36b489c9` restricted to `apps/admin` (17 files, 2,659 diff lines). Same three layers, parallel,
read-only; the first run of all three died on a session rate limit and the same agents were resumed (no layer was started over).
Every finding below was re-checked against the tree before it was written. NOT run: a real-browser pass (still un-attested) and
`ci:local`. Checklist family 13 was applied in its WEB form (native elements and ARIA standing in for `accessible`,
`accessibilityRole` and `accessibilityValue`); the family is un-mechanized by ruling, so this review is the only thing that reads it.

Policy-meaning verdict (family 11, AI-10-1): the wizard's sentences are the spec's own, pinned through the real resolver, and the
Summary and detail audience lines are the Policy-meaning strings. One under-statement was real (RP28): the page the PUBLISHER reads
never carried the "reaches no member for now" warning that only step (b) of the wizard showed.

- [x] [Review][Patch] **RP18 — The Idempotency-Key is minted once per wizard (and once per partner registration) and kept across an EDIT, so a retry after a lost response silently drops the edit (MED)** — the blind layer rated this HIGH on the 422 → edit → retry path; that path is SAFE, because the server releases the key whenever the first attempt failed in a way it saw (`withIdempotency` replays only a RECORDED result). The reachable case is narrower: the first Create (or partner registration) SUCCEEDS but the 2xx never reaches the browser (a 502 / 504 / dropped connection); the admin edits the form and presses Create again under the unchanged key; the server replays the FIRST result, the client navigates to a draft built from the OLD answers, and a partner (immutable) keeps its misspelling. This is deferred RD2 made reachable from the UI. Fix: rotate the key whenever the request body changes (a body signature per attempt); an unchanged body keeps its key, so a genuine retry still replays [apps/admin/src/modules/marketplace/ModuleWizard.tsx:58-59, 84; PartnerPicker.tsx:26, 30] (blind+edge)
- [x] [Review][Patch] **RP19 — A failed background refetch replaces the whole detail page (MED)** — `if (detail.isError || detail.data === undefined)` shows the error even when data is already loaded. The query has `staleTime: 0`, and the admin has to switch apps to read the OTP, so the window-focus refetch is the NORMAL path; if it fails while the step-up panel is open, or after a successful publish, the page, the panel, the typed code and the "Published." message vanish. Fix: the error replaces the page only when there is no data; otherwise keep rendering and show a polite "could not refresh" note [apps/admin/src/modules/marketplace/ModuleDetailPage.tsx:52] (blind+edge)
- [x] [Review][Patch] **RP20 — The corrected-copy prefill overwrites whatever the admin typed while the module loads (LOW)** — `setState(fromModule(...))` replaces the whole state and nothing disables the fields during the load. Fix: the step fieldset is disabled while the source module is loading [apps/admin/src/modules/marketplace/ModuleWizard.tsx:67-71, 126] (blind+edge)
- [x] [Review][Patch] **RP21 — Chosen scope values that are not in the current option list are hidden and cannot be removed (LOW)** — a corrected copy of a module whose district was delisted, or lies beyond the 200 shown, carries values the picker renders no checkbox for, yet "n chosen" counts them and Create sends them; the server's `scope_value_unknown` carries `details.values`, which the UI ignores. Fix: list such values as "not in the list shown" with a Remove button [apps/admin/src/modules/marketplace/ScopePicker.tsx] (blind+auditor+edge)
- [x] [Review][Patch] **RP22 — The permission-denied guidance row is dead: the map is keyed `auth.forbidden`, the API emits `authz.forbidden` (LOW)** — a non-holder who reaches the wizard or a detail page (the nav link is deliberately ungated) is told "Something went wrong. Try again." The list page is unaffected because it tests the status. Fix: key it `authz.forbidden` and test it [apps/admin/src/modules/marketplace/derive.ts:354] (auditor+edge)
- [x] [Review][Patch] **RP23 — A failed options or partners load dead-ends the wizard with no retry (LOW)** — `retry: false`, and on step (c) the picker (and with it even "every member") is not rendered; the only way out is a reload, which discards every answer. Fix: a Try again button on both error notices [apps/admin/src/modules/marketplace/ModuleWizard.tsx:211-212; PartnerPicker.tsx:75] (blind+auditor+edge)
- [x] [Review][Patch] **RP24 — Publishing a draft whose window has lapsed answers "Choose a later closing time", on a page with nothing to edit (MED)** — `module.window_ended` is 409 at publish (AC6), and the guidance string shared with the wizard's 422 case names a control the detail page does not have; the real path (withdraw, then start a corrected copy) is never said. Fix: the detail page uses its own sentence for that code; test it [apps/admin/src/modules/marketplace/derive.ts:341; ModuleDetailPage.tsx:82] (auditor+edge+blind)
- [x] [Review][Patch] **RP25 — The detail and wizard routes are not keyed by Pariwar and module (LOW — inferred)** — the ticks, the held step-up retry closure and the message are component state, and a route that is reused for a new `moduleId` would carry them over (the held retry could then publish the other module); the sibling routes key by id, and `ModuleNewRoute`'s key omits the Pariwar. Fix: key both [apps/admin/src/routes/ModulesRoute.tsx:62-64, 78] (blind+edge)
- [x] [Review][Patch] **RP26 — A lead URL over 4,096 characters has no UI cap and answers an unmapped 400 (LOW)** — the request DTO caps it at 4,096; the 400 is `request.validation`, which neither `codeToStep` nor `moduleErrorGuidance` knows, so the admin gets the generic sentence with no step. Fix: cap it in `validateStep` (f) with its own reason [apps/admin/src/modules/marketplace/derive.ts:216-218] (edge)
- [x] [Review][Patch] **RP27 — A late partner-registration result overwrites a partner chosen in the meantime (LOW)** — `generation` is bumped only on Cancel, never on unmount, so if the admin picks another partner and presses Next while the request is in flight, the resolved request still calls `onChange(created.partner_id)` on the wizard. Fix: bump the generation on unmount [apps/admin/src/modules/marketplace/PartnerPicker.tsx:27-37] (blind)
- [x] [Review][Patch] **RP28 — The page the PUBLISHER reads never says an offer "reaches no member for now" (MED, checklist family 11)** — the G18 notice and the warning exist only at wizard step (b); the detail page (and so the second admin who actually publishes) shows "Only members in these statuses: Active" with no signal that no member can hold that status yet. Fix: the detail page shows the existing "reaches no member for now" warning when every ticked status is one of the four no-member statuses [apps/admin/src/modules/marketplace/ModuleDetailPage.tsx:129-133; derive.ts:134-146] (auditor)
- [x] [Review][Patch] **RP29 — The second-step-up copy says the code "was not accepted" when it was (LOW)** — the elevation succeeded and did not cover the write. Fix: reword [apps/admin/src/modules/marketplace/i18n-en.ts:206] (auditor)
- [x] [Review][Patch] **RP30 — Wizard step changes are not announced and keyboard focus is stranded; a stale error banner follows the admin to later steps (MED, family 13(d))** — Next / Back only call `setStep`; there is no heading or live region naming the step; every new step starts invalid, so the focused Next button becomes disabled and focus is lost; the `issue` banner is not cleared on Back / Next. Fix: a focusable step heading that takes focus on every step change, and the banner cleared by Back / Next (a 422's own step change keeps it) [apps/admin/src/modules/marketplace/ModuleWizard.tsx:329-348] (auditor+blind)
- [x] [Review][Patch] **RP31 — Errors are not tied to the field that failed (MED, family 13)** — no `aria-invalid` or `aria-describedby` exists anywhere in the module; the 422 banner shows the raw message without naming the field; the per-step reason is not linked to the disabled Next. Fix: the banner names the field; the owning input gets `aria-invalid` and `aria-describedby`; Next describes itself with the reason [apps/admin/src/modules/marketplace/ModuleWizard.tsx:93-96, 318-327] (auditor+blind)
- [x] [Review][Patch] **RP32 — Result, loading, empty and count states are drawn but not reliably announced (LOW, family 13(d))** — "Published." / "Withdrawn." are `role="status"` nodes mounted already holding text (unreliable) and focus falls to the body when the form unmounts; loading is the literal "…"; the empty list has no role; "n chosen" is not live. Fix: an always-mounted live region, focus moved to the page heading after a write, "Loading…", `role="status"` on the empty list, `aria-live` on the count [apps/admin/src/modules/marketplace/ModuleDetailPage.tsx:51, 215-219; ModulesPage.tsx:51, 57; ModuleWizard.tsx:214; ScopePicker.tsx:90] (auditor+blind)
- [x] [Review][Patch] **RP33 — Radio and checkbox groups have no group name; list rows all read "Open"; the disabled Publish reason is not linked (LOW, family 13)** — Fix: fieldsets with legends for steps (b) and (e), a named status list, "Open {offer}" as the row button's name, and `aria-describedby` from Publish to the author sentence [apps/admin/src/modules/marketplace/ModuleWizard.tsx:150-160, 243-247; ModulesPage.tsx:72; ModuleDetailPage.tsx:151-181] (auditor+blind)
- [x] [Review][Patch] **RP34 — The detail page's header says each write's key is "REUSED by its retry"; only the step-up retry reuses it (LOW)** — publish and withdraw mint a fresh key per click, which is right (each click is a new intent), so the comment is what is wrong. Fix: say so [apps/admin/src/modules/marketplace/ModuleDetailPage.tsx:11; ModuleWizard.tsx:7] (blind+edge)
- [x] [Review][Patch] **RP35 — Closure honesty (family 10): the Completion Notes disclose two gaps; the audit found many more surfaces with no test (MED)** — never asserted: PartnerPicker registration (create, error, key reuse, cancel in flight), ScopePicker toggling and kind-switch clearing, the rendered `secret-copy`, `places-fixed` and `summary-window`, the held-publish Cancel, `module.window_ended` at publish, a withdraw's result messages, the archived state hiding Withdraw, the list page's 403, the zone in which a `datetime-local` value is read (the existing test is day-tolerant, so a UTC-parsing regression passes), any role / `aria-*` / focus behaviour, the router wiring and the `nav-modules` link. Fix: add the tests that fit the harness and list, in the Completion Notes, exactly what stays un-tested (the router wiring, the nav link, `ModulesRoute.tsx`, and the real-browser pass) [apps/admin/tests/*; this file, Completion Notes] (auditor+edge+blind)
- [x] [Review][Defer] **RD5 — The wizard's "no member can be in these statuses yet" notice, the `NO_MEMBER_YET_STATUSES` constant and the new detail-page warning must change when the lock-in-expiry producer lands** — deferred: the claim is true today (nothing emits `member.lock_in_expired`) and is baked into the client as a list of four statuses and a sentence; once the producer lands the notice and the warning would be falsehoods. The existing G18 deferral names the shelf side (Story 12.3) but not this admin copy. Trigger: row `3-14-lock-in-expiry-producer` lands. [apps/admin/src/modules/marketplace/derive.ts `NO_MEMBER_YET_STATUSES`; i18n-en.ts `module.eligibility.noMemberYet`, `module.eligibility.reachesNoMember`] Owner: the story that lands the producer, or Story 12.3's create-story, whichever is first (carried in `epics.md` under 12.3). — deferred, recorded in `deferred-work.md` (blind+auditor)
- [x] [Review][Defer] **RD6 — Two other admin test files use a bare-arrow `beforeEach(() => someMock.mockReset())`** — deferred: found while fixing RP35. `mockReset()` returns the mock and Vitest runs a function returned from `beforeEach` as teardown, so a mock that REJECTS would surface as an unhandled rejection after each test. `finally-approved-elsewhere.test.tsx` and `later-approval-warnings.test.tsx` have it; both pass today because their mocks resolve, and they belong to other stories. [apps/admin/tests/finally-approved-elsewhere.test.tsx:64; apps/admin/tests/later-approval-warnings.test.tsx:759] Owner: none yet — a braces-around-the-body fix for whoever next edits either file. — not addressed (no owner yet), recorded in `deferred-work.md` (found by the reviewer, not a layer)

Dismissed as noise (16 items; the last bundles three), each checked against the tree: same-named districts in two states sharing one checkbox (the geo-tree document enforces `(dimension, value)` uniqueness across the whole document, so two such options cannot exist); Withdraw having no confirmation (AC7 and QE15 specify a warning, which is there); an unvalidated 422 `details` shape / a missing `path` (the API always sends `issues[].path`, and showing the first issue only is by design — the admin fixes them one at a time); the hard-coded attestation flags in `usePublishModule` (the API requires `z.literal(true)`, and the ticks gate the button); invalidation only on success so a 409 leaves a stale draft (the copy says "Reload the page"; RP19 stops the page vanishing); the trivial `https://` URL check (the server validates the canonical form); minute-precision and DST in the time helpers (the wizard authors minute-aligned values and shows India time and browser time together); `resolveEn` throwing on an unknown key (the response enums are zod-narrowed); a `lang` on the mixed English / Hindi partner option (one string cannot carry two languages); an "unlisted district" caveat on state audiences (an inference; the spec's two sentences cover the recorded-district case); the "Live" label (mitigated by "members cannot see offers yet" on both pages); no `beforeunload` prompt (QE1 and the opening line say leaving loses the answers); publish / withdraw minting a new key per click (a new intent each time — only the comment was wrong, RP34); the "you wrote it" sentence for an unknown author (fail-closed by design); mocked fetchers leaving the zod parse unexercised (the contracts tests cover the DTOs); and blanket `{ timeout: 20_000 }`, a brittle `/send/i` selector and a copy test comparing the dictionary to itself (style, not defects).

#### Chunk C patches applied (2026-11-01 — under the same instruction, which the reviewer read as covering chunk C's findings too; that reading was stated to BigDev before chunk C's review began and was not objected to)

All eighteen patches (RP18–RP35) are applied; RD5 is in `deferred-work.md`. Committed (v1.9) as code `465a2ac8` with the
records that follow it.

- **Key lifecycle (RP18, RP34).** A new `attemptKey(ref, body)` in `api/hooks.ts` keeps a key while the request body is unchanged
  and mints a new one when it changes; the wizard and the partner picker use it and clear it after a success or a cancel.
  Publish and withdraw still mint a key per click; their headers now say so.
- **Detail page (RP19, RP24, RP28, RP29, RP32, RP33).** A failed background refetch keeps the page and shows a "may be out of
  date" note (the error replaces the page only when there is no data); `module.window_ended` at publish says to withdraw and
  copy; the "reaches no member for now" warning is repeated on the page the publisher reads; the second-step-up sentence is
  accurate; results go to an always-mounted live region and focus moves to the page heading after a write; Publish is
  `aria-describedby` its author sentence.
- **Wizard (RP20, RP23, RP26, RP30, RP31, RP33).** The answers are locked while a corrected copy's source loads; a failed places or
  partners load shows Try again; the lead address is capped at 4,096; every step change focuses a step heading and Back / Next
  clear a stale banner; the 422 banner names the field and marks its input `aria-invalid`; Next is described by its reason;
  steps (b) and (e) are fieldsets with legends and the status list is named.
- **Pickers (RP21, RP27).** Chosen places the options do not list are shown with Remove buttons; a partner registration that
  resolves after the picker was left no longer selects anything.
- **Other (RP22, RP25, RP32, RP33).** The permission-denied row is keyed `authz.forbidden`; the detail and wizard routes are keyed
  by Pariwar and id; loading reads "Loading…", the empty list is a status, "n chosen" is live, and each list row's Open button is
  named for its offer.
- **Tests (RP35).** New: `partner-picker.test.tsx` (6), `scope-picker.test.tsx` (4), and additions to the wizard, detail,
  list and derive tests — 83 tests across the six marketplace UI files (48 before the review), including a `datetime-local`
  zone test that switches `TZ` (Kolkata / New York / UTC) so a UTC-parsing regression fails. Not covered, and now disclosed in the
  Completion Notes: the router wiring, `ModulesRoute.tsx`, the `nav-modules` link and a real-browser pass.
- **A latent harness trap, fixed.** `modules-page.test.tsx` had `beforeEach(() => listModules.mockReset())`; `mockReset()` returns
  the mock and Vitest runs a function returned from `beforeEach` as teardown, so a rejecting mock surfaced as an unhandled rejection
  after the test. It now uses braces. Two OTHER admin test files have the same bare-arrow form (`finally-approved-elsewhere.test.tsx`
  and `later-approval-warnings.test.tsx`); both pass today because their mocks resolve, and they are outside this story, so they are
  not touched — deferred RD6.
- **The 422 banner test changed.** The existing assertion expected the plain "Please fix: …" sentence; the banner now names the
  field, so that one assertion was updated (RP31).

Mutation checks, run to completion with every source file backed up first and compared byte-for-byte after each restore: breaking
the key rotation fails the wizard, partner and derive RP18 tests; letting a failed refetch replace the page fails RP19; dropping
the detail-page sentence fails RP24 (two tests); the dead `auth.forbidden` key fails the derive RP22 test and the first-load
detail test (the list-page 403 test does NOT catch it — that page tests the status, not the code); removing the step-change focus
fails RP30; removing the unmount guard fails RP27; removing the publisher warning fails RP28; unlocking the fields during the
prefill fails RP20; hiding the not-listed values fails RP21. ⚠ The first run of this battery used a harness with a shell
word-splitting fault: its backups were never made, its restore steps failed, and its "restored" line was wrong, so nine mutations
were left in the tree. They were reversed by exact-match replacement, the tree was re-verified (no marker left, `tsc`, ESLint and
all 83 tests green), and the battery was re-run with a harness that aborts unless every backup exists and that compares each
restored file with `cmp`.

Verified: `tsc --noEmit` exits 0 and ESLint exits 0 for `@twt/admin` on the changed source and tests; the six marketplace UI
files pass (83); the WHOLE admin suite passes (93 files, 1,653 tests). NOT run: the full `pnpm ci:local` gate (37 jobs) and a
### Patch-diff review — after the three rounds (2026-11-01, BigDev answered "1" to "Review the patch diff before committing")

Three fresh-context, read-only reviewers read the PATCH diff for defects the patches introduced or left: the backend patches (805 diff
lines), the admin UI patches (1,458, including the two new test files) and the records (338). They raised 26 findings (3 backend,
6 admin, 17 records). Each was checked against the tree before it was acted on. Two layer claims were wrong or inflated and are
recorded as such. Committed (v1.9) with the three rounds: code `465a2ac8`, then these records.

- [x] [Review][Patch] **PP1 — My RP7 rewrite was FALSE and is reverted; RD1's premise was false too (MED — backend PB1 and records PR1, independently)** — see RP7 for the trace through `runLockedTransition`. The `classifyActivationOutcome` comment now says a `skipped` row is never re-selected (the scan excludes it) and that drift is `failed` via `ModuleStreamConcurrencyError`, logged per module each tick. RD1 is corrected in this file and in `deferred-work.md` (its substance stands: retried forever, no escalation, an intent + `_rolled_back` pair per tick). The mistake was mine: round 1 accepted the Edge layer's own "inference" without reading `runLockedTransition`. [packages/domain/src/marketplace/activation-sweep.ts]
- [x] [Review][Patch] **PP2 — An older comment ("RP10 (e) — every other cross-tenant leg here runs under twt_app …") had been left above the RP6 tests, away from its own test (LOW — PB2)** — moved back [packages/domain/tests/integration/marketplace/read.spec.ts]
- [x] [Review][Patch] **PP3 — Three accessibility patches had gaps of their own (LOW — admin PU1, PU2, PU3)** — (a) the "could not refresh" note was a `role="status"` node that arrives already holding its text, the pattern RP32 rejected: now `role="alert"`; (b) the list page's empty-state replaced its loading state as two separate status nodes: now ONE always-mounted status region holds both; (c) the new Try again buttons unmounted under keyboard focus (TanStack Query v5 clears `isError` the moment a data-less refetch starts, so the error branch vanished): they now stay mounted, disabled, while the retry runs, and Remove moves focus to the search field [apps/admin/src/modules/marketplace/ModuleDetailPage.tsx; ModulesPage.tsx; ModuleWizard.tsx; PartnerPicker.tsx; ScopePicker.tsx]
- [x] [Review][Patch] **PP4 — Stale and overstated test wording (LOW — admin PU4, PU5, PU6; records PR8, PR13)** — two comments still said the key is minted "once per wizard session" (fixed); the two new `aria-describedby` assertions compared only the attribute text, so a dangling id would pass (now `toHaveAccessibleDescription`, which resolves the id); a comment claimed the wizard tests cover the time zone (they prove wiring only — the zone is pinned with fixed instants in the derive test); the step (b) / (e) group names and the status-list name had no assertion (added); a test title promised a Hindi half it did not assert (retitled); the list page's "RP22" test could not catch the dead mapping (retitled, and the comment says which tests do)
- [x] [Review][Patch] **PP5 — Records corrections (records PR2–PR8, PR10–PR17)** — the un-attested paragraph no longer uses the negation glyph where it carries the risk; the QE12 narrowing is no longer called "recorded" (it is in no governance document — `-433`, ADR-0044 and QE12 all still say "allowed", and a dated pointer now sits at QE12); stale "chunk B / C unreviewed" lines fixed; the three "Dismissed as noise" counts now equal what each paragraph lists; the Completion Notes test numbers are labelled "as of `89add5ee`" and the File List names the two new test files; RP13, RP2, RP4, RP5, the "60 call sites", G6 and `module-activation.test.ts` claims are worded to what the evidence shows; BigDev's two quoted instructions are attributed to the menus they answered; deferrals RD2, RD3 and RD6 have NO owner story, so they are now labelled "not addressed (no owner yet)" and RD4 / RD5 are carried in `epics.md` under Stories 12.6 and 12.3
- [x] [Review][Patch] **DN2 — RESOLVED by BigDev ("2", option B below): the display schemas also refuse the REST of the invisible characters, except U+FE0E / U+FE0F (PB3 — backend; the gap predates the patches)** — the question as put: — DN1 closed ZWNJ / ZWJ so that look-alike partners cannot register. The same hole remains for the other default-ignorable code points: "LIC" and "LIC" followed by U+034F (combining grapheme joiner), a variation selector (U+FE00–FE0F), a Mongolian selector (U+180B–180D) or U+2800 (braille blank) all pass today as distinct, identical-looking partners — checked by running the current rules over each string — and partner rows can never be corrected. The repo already settled this once: `GroundInspectionPage.tsx` and `claims.ground-inspection.routes.ts` use `\p{Default_Ignorable_Code_Point}` plus U+2800, and the page's comment records that a previous fix-diff review found `\p{Cf}` insufficient for exactly this reason. Options: (A) refuse the whole default-ignorable class and U+2800 in every display schema except the `*_hi` joiners — cost: an emoji with a variation selector (a heart, a tick mark) is refused in names and descriptions; (B, recommended) as A but exempt U+FE0F / U+FE0E — cost: "LIC" + U+FE0F stays possible; (C) leave it — cost: look-alike duplicates stay possible. This is a validation rule, not a Panel question (§0 fails). Applied as option B: `FORMAT_CHARACTER` is now `[\p{Cf}\p{Default_Ignorable_Code_Point}]`, U+2800 joins the explicit set, and U+FE0E / U+FE0F are exempt; the refusal covers the Hindi schemas too (the `*_hi` joiners excepted). Proof: 9 test cases were RED against the old rules and pass after; a new test keeps ordinary Hindi and English copy accepted (matras, nukta, virama, danda, Devanagari digits, the rupee sign, curly quotes, an en dash, emoji, and a ZWJ / ZWNJ inside a Devanagari conjunct); a second keeps U+FE0F / U+FE0E accepted; three mutation checks (class dropped back to `\p{Cf}`, exemption removed, Braille blank removed from the set) are each caught and the file was restored byte-identical. The residual look-alike is "LIC" + U+FE0F, as option B states. [packages/domain/src/marketplace/filters.ts; packages/domain/tests/marketplace/filters.test.ts]

Considered and refuted: records PR9 said RP6's "bound to the Pariwar" holds only because of RLS and survives deleting the explicit predicate. Checked by mutation: removing `eq(eventsLog.pariwarId, pariwarId)` from `countModuleLeads` makes the RP6 test fail (`expected 2 to be 0`), because the test asks scope A's stream under Pariwar B. The backend reviewer was right; the claim stands. Everything else the three reviewers checked and found sound is in their reports (the key lifecycle against the server's `withIdempotency`, the `authz.forbidden` rekey, hook order, StrictMode behaviour, the concurrency tests' validity for every interleaving, the BOM fix, the `payloadHash` fix).

Verified after the fixes, on the story container (`twt-12-2-pg`, port 5451): `tsc --noEmit` exits 0 and ESLint exits 0 for `@twt/admin`, `@twt/api`, `@twt/jobs` and `@twt/domain` on the changed files; the WHOLE admin suite passes (93 files, 1,653 tests); the API admin-module spec, the errors unit test, `login-wall` and `forced-pagination` pass (65); the jobs `module-activation` test passes (6); the domain marketplace unit + integration sets pass (23 files, 544); `access-wrapper:check` and its 34 tests, `marketplace-module-state:check`, the contracts `modules.test.ts` (10) and the OpenAPI determinism gate pass. Five new behaviours were mutation-checked with a harness that backs up every file first, aborts if a backup is missing and `cmp`s each restore (the retry buttons stay mounted — wizard and partner picker; focus after Remove; the refresh note's role; the single status region). After DN2 was applied: the domain marketplace unit + integration sets pass (23 files, 554 tests), the API admin-module spec and errors unit pass (54), and `tsc` exits 0 for `@twt/domain` and `@twt/api`. NOT run: the full `pnpm ci:local` gate (37 jobs) and a real-browser pass — run both before the push.

### Review Findings — round 2, chunk A: the domain / DB layer (2026-11-01, `bmad-code-review 12.2`)

Scope: `36b489c9..c62eb930` restricted to `packages/domain` + `packages/queue` (45 files, 3,902 diff lines) — the committed
production slice after round 1 (code `465a2ac8`). Three layers in parallel, read-only: Blind Hunter (the diff as a scratchpad file,
nothing else), Edge Case Hunter, Acceptance Auditor (spec + load-bearing-invariant checklist lens). Each was told round 1's findings
and dismissals and asked to re-raise only with new evidence. 16 raw → 13 distinct: 2 decision-needed, 6 patch, 0 defer, 5 dismissed.
Each finding below was re-checked against the tree before it was written. The Edge layer ran one `git fetch` despite its read-only
brief (remote-tracking refs only; tree, index and branch untouched). `-434` was committed WHILE this round ran; its "Not covered"
already names DN3.

- [x] [Review][Patch] **DN3 — Partner names that look identical still register, through VISIBLE look-alikes (MED) — RESOLVED by BigDev (verbatim: "DN3 1", option 1): the server refuses non-NFC text, every space but U+0020 and a doubled space in a name; the admin client cleans pasted text first — recorded as Decision `2026-11-01-435` (`ac1ddad3`), built in `497c69e4`** — DN1 / DN2 closed the invisible characters, but `displayTextRefusal` has no rule for space separators other than U+0020 (U+00A0 no-break, U+202F, U+2007, U+2009, U+200A, U+205F, U+1680, U+3000), for runs of interior spaces, or for normalisation (NFD "Café" vs NFC "Café"), and nothing between the admin client and the INSERT normalises (the only `normalize` is `derive.ts`'s CRLF → LF). The partner unique index is `lower(display_name_en)` (0195), which folds none of these, and partner rows are insert-only. Executed by the Edge layer against the real `filters.ts`: NBSP, U+202F, NFD "Café", a double space and the NFC / NFD pair are all accepted; full-width "ＬＩＣ" and a Cyrillic "LІС" also pass (Blind, executed). A name pasted from a PDF or Word usually carries a no-break space, so this happens by accident. Panel gate (§0) FAILS — a validation rule; BigDev's call, NOT routed. A change is a NEW decision entry superseding `-434`'s "Not covered" line. [packages/domain/src/marketplace/filters.ts `displayTextRefusal`; packages/domain/migrations/0195_marketplace-partners-and-publications.sql (the `lower(display_name_en)` unique index)] (blind+edge+auditor)
- [x] [Review][Patch] **DN4 — DN1's joiner ban refuses ZWJ emoji in English MODULE text, where DN1's reason does not apply (LOW) — RESOLVED by BigDev (verbatim: "DN4 1", option 1): a ZWJ between two emoji is allowed in the English module texts, the partner name stays strict, the message is readable — `-435`, built in `497c69e4`** — U+200D is refused in all three `*_en` schemas, so an English description such as "Cover for the whole family 👨‍👩‍👧" (also 👩‍⚕️, 🏳️‍🌈) answers 422 with "must not contain a zero-width joiner or non-joiner" — a character the admin never typed — while the same text is accepted in `*_hi`; the England / Scotland / Wales flags (U+1F3F4 + tag characters) are refused in every schema. DN1's reason is the partner-name unique index; module names and descriptions have no unique index. DN1's recorded cost ("an English name that needs a joiner is refused (none expected)") did not consider emoji; `-434` Consequence 1 does. Executed by the Edge layer. BigDev's call (it reshapes DN1); NOT routed. [packages/domain/src/marketplace/filters.ts `displayTextRefusal` (the `allowJoiners: false` branch)] (edge)
- [x] [Review][Patch] **RP36 — The R3D1 closure line in `deferred-work.md` still describes the pre-review rule set (LOW — checklist family 10)** — the R3D1 item ("Free-text manifest fields accept invisible, control and bidi characters other than NUL") reads "Closed by `89add5ee` (12.2's leg — QE12 … ZWJ / ZWNJ allowed …)"; the shipped rule is `465a2ac8`'s, recorded by `-434`. Fix: a dated line under it citing `465a2ac8` and `-434` (the `89add5ee` closure stays true for its date) [_bmad-output/implementation-artifacts/deferred-work.md (the R3D1 item)] (auditor)
- [x] [Review][Patch] **RP37 — Four new reads' explicit `pariwar_id` predicates are never tested with RLS bypassed; one test title promises a check it does not make (LOW — checklist family 3)** — `getPartner` ("… (RLS + the explicit predicate)" asserts only under scope `p`, where RLS already hides the row), `listPartnersForPariwar` ("… and only this Pariwar" — RLS alone), `findListedWorkplaceDistricts` ("own-Pariwar spellings" seeds no other Pariwar's district) and `pageModulesForPariwar` (reads only its own fresh Pariwar). Deleting any of the four `eq(…pariwarId, pariwarId)` leaves the suite green; it would bite under the RLS-bypassing jobs login or a future service-pool caller. Precedent: 12.1's RP10(e) leg in `read.spec.ts`. Fix: a superuser-pool (RLS-bypassed) leg for each that seeds a second Pariwar's row and asserts it is not returned; mutation-check each by deleting the predicate [packages/domain/tests/integration/marketplace/partners.spec.ts; scope-check.spec.ts; read-cursor.spec.ts] (blind+auditor)
- [x] [Review][Patch] **RP38 — AC1's columns / NOT NULLs / DEFAULTs on the two new tables are never checked against the catalog (LOW — checklist family 5)** — the two new policy-regression specs check grants, ENABLE / FORCE, policies, the composite FKs and the indexes, not the column list, `attnotnull` or `DEFAULT now()`; the migration is hand-written and the drizzle snapshot has been frozen since 0020, so a later edit dropping e.g. `reviewed_by_actor_id`'s or `audit_id`'s NOT NULL passes every test. Today the DDL and the drizzle declarations agree. Fix: the house `information_schema.columns` assertion (as `member-nominee-links-policy-regression.spec.ts`) for `marketplace_partners` and `marketplace_module_publications` [packages/domain/tests/integration/marketplace-partners-policy-regression.spec.ts; marketplace-module-publications-policy-regression.spec.ts] (auditor)
- [x] [Review][Patch] **RP39 — The activation scan's cross-Pariwar reach is never tested across Pariwars (LOW)** — every module in `activation-select.spec.ts` is in one Pariwar, so a scope or tenant filter added to the scan would fail nothing; the scan's whole point (QE7 (A)) is that it is unscoped. Fix: seed a due module in a second Pariwar and assert both are selected. (The Blind layer's second half — 500+ foreign `scheduled` rows on a shared DB, a live jobs worker — is dismissed: CI and the story containers are fresh and run no worker.) [packages/domain/tests/integration/marketplace/activation-select.spec.ts] (blind)
- [x] [Review][Patch] **RP40 — The QE22 gate misses the generic and spaced call forms (LOW)** — `callsAuditWrapper` matches the substring `withCompensatingAudit(`, so `audit.withCompensatingAudit<R>(pool, o)` (an ordinary TypeScript call) and `withCompensatingAudit (pool, o)` pass; executed by the Blind layer. Round 1 dismissed "the gate is evadable" on the alias / subdirectory shapes; the generic form is new and is not evasion, just idiom. Fix: match `/\bwithCompensatingAudit\s*(<[^>]*>)?\s*\(/` and add both as teeth vectors (alias and subdirectory stay out of scope, as round 1 recorded) [packages/domain/tests/marketplace/no-audit-wrapper-in-domain.test.ts `callsAuditWrapper`] (blind)
- [x] [Review][Patch] **RP41 — The publications schema header calls its data "mutable" above its own INSERT-ONLY section (LOW)** — "so mutable presentation / review data lives beside it" means "data written after authoring, which the immutable module row cannot hold"; read literally it invites an UPDATE grant. Fix: reword [packages/domain/src/schema/marketplace_module_publications.ts (the "Why its own table" paragraph)] (blind)

Dismissed as noise (5), each checked against the tree: same-named districts in different states (`geo-tree/document.ts` rejects a duplicate `(dimension, value)` across the WHOLE document — round 1's dismissal stands; a Pariwar cannot hold two "Aurangabad" districts); the `byValue` comparator returning 1 for equal pairs (its tie branch is unreachable for the same reason); the sweep starving behind 500 stuck rows (that is RD1, already deferred with this exact scenario); the cursor's `DateStyle` dependency (round 1's dismissal stands — documented, every Postgres default is ISO); the tone hash omitting the branding bundle (`ModuleBrandingBundleSchema` holds a logo object key and an accent colour, no text a member reads; the logo upload is carried to 12.3).

Checklist lens (Edge + Auditor): families 1, 2, 4, 6, 7, 8, 9, 11, 12 covered by test or by construction (named in the layer reports); family 3 REAL GAP → RP37; family 5 REAL GAP → RP38 (and DN3 is the application half of the partner-name index); family 10 REAL GAP → RP36; family 13 not touched.

#### Round 2 chunk A patches applied (2026-11-01 — BigDev: *"DN3 1, DN4 1"*, then *"apply all patches"*)

Decision `2026-11-01-435` (DN3 + DN4) was committed ALONE first (`ac1ddad3`); the code is `497c69e4` (it also carries the
patch-diff review's fixes, below). How each was done and proven:

- **DN3 — server (`filters.ts` `displayTextRefusal`).** Every display schema refuses a value that is not NFC (refused, not
  rewritten) and every `\p{Zs}` but U+0020; the four NAME schemas refuse two spaces in a row on the RAW value (edges included —
  `-435` item 1(c) and QE12's "rules on the raw string"; the first build checked the trimmed value and the patch-diff review
  caught that as an unrecorded reading, PQ1). Five existing tests that passed names with two edge spaces now use one.
- **DN3 — client (`derive.ts` `normaliseDisplayText`).** CRLF → LF, every other space separator → U+0020, NFC, and in a name a
  run of spaces → one; used by `toAuthorRequest` (all four texts) and the partner picker. Step (a) judges length on the SENT
  text (PQ3).
- **DN4 (`zwjJoinsTwoEmoji`).** A ZWJ is allowed in the English module name / description only when the code point before it
  (past U+FE0F and `\p{Emoji_Modifier}`) and after it are `\p{Extended_Pictographic}`; partner English stays strict; U+200C
  stays refused; the message reads "an invisible joining character". The partner picker now shows that reason (PQ2).
- **RP36** — the R3D1 line in `deferred-work.md`, citing `465a2ac8`, `-434`, `-435` and `497c69e4`.
- **RP37** — four RLS-bypassed legs (`RESET ROLE` in the test transaction, an assertion that the role bypasses RLS, a second
  Pariwar seeded, a positive control): `partners.spec.ts` (getPartner + listPartnersForPariwar; the old title corrected),
  `scope-check.spec.ts` (findListedWorkplaceDistricts), `read.spec.ts` (pageModulesForPariwar — placed there, not in
  `read-cursor.spec.ts`, beside 12.1's RP10(e) leg).
- **RP38** — the full column list, types, NOT NULL and `now()` defaults of both tables, from `information_schema.columns`.
- **RP39** — P and Q each hold a module scheduled a DAY ahead; one scan at T0+1d must return both, each with its Pariwar.
- **RP40** — `/\bwithCompensatingAudit\b\s*(?:\(|<|\?\.|\.(?:call|apply)\b)/` (any call shape — PQ5 widened RP40's own
  regex), teeth for nested generics, an arrow type argument, `?.(`, `.call`, and three non-calls.
- **RP41** — the publications header reworded.

RED / mutation evidence (each source file backed up, compared with `cmp` after restore):
- 13 of the new `filters.test.ts` cases failed against the committed `filters.ts` of `ac1ddad3`, and pass now.
- Each of these was caught by its test: dropping the FE0F / skin-tone skip, dropping the after-ZWJ check, the doubled-space
  rule on raw edges (first build), the client cleaning reverted to CRLF-only, length judged on the raw text, the partner
  picker ignoring the issue, deleting each of the four `pariwar_id` predicates (RP37 — one test each), a one-Pariwar-per-tick
  scan (RP39 — the only failing test), and the old substring gate (RP40).
- RP38 was NOT mutation-checked (it would need a DDL change on the shared container); it is an exact `toEqual` on the catalog.

Verified on `twt-12-2-pg` (:5451), at `497c69e4`: `tsc --noEmit` exits 0 for `@twt/domain`, `@twt/admin`, `@twt/api`,
`@twt/jobs`; ESLint exits 0 on every changed file; the domain marketplace unit + integration sets pass (26 files, 609); the
WHOLE admin suite passes (93 files, 1,658); the API admin-module spec + errors unit pass (54); the jobs `module-activation`
test passes (6). NOT run: the full `pnpm ci:local` gate (37 jobs) and a real-browser pass.

#### Round 2 chunk A — patch-diff review (before the commit; three fresh-context layers, read-only)

28 raw → 16 distinct: 9 patched (PQ1–PQ9, in `497c69e4`), 2 decision-needed (DN5, DN6), 1 deferred (RD7), 4 dismissed.

- [x] [Review][Patch] **PQ1 — The doubled-space rule checked the TRIMMED value; `-435` item 1(c) and QE12 say raw (MED — auditor)** — fixed by checking `raw` (above); recorded here rather than as a reading of `-435`.
- [x] [Review][Patch] **PQ2 — The partner picker showed fixed copy ("each needs letters…") for every name refusal, so `-435` item 4's message never reached the admin (MED — auditor+edge)** — `partnerIssueMessage` shows the server's reason with the field's label; the fixed copy is the fallback [apps/admin/src/modules/marketplace/derive.ts; PartnerPicker.tsx]
- [x] [Review][Patch] **PQ3 — Step (a) judged length on the raw text; NFC lengthens a precomposed nukta letter and collapsing shortens a name (LOW — blind+edge+auditor)** — `sentLength` measures the normalised text [derive.ts `validateStep`]
- [x] [Review][Patch] **PQ4 — `normaliseDisplayText`'s comment claimed "pasted text just works" and "changes nothing a reader can see" (LOW — blind+edge)** — narrowed: it cleans exactly the DN3 look-alikes; a tab, soft hyphen, zero-width space or U+2028 is still sent and refused with the server's reason (DN5 asks whether to clean those too)
- [x] [Review][Patch] **PQ5 — RP40's regex missed nested generics, an arrow type argument, `?.(` and `.call` (LOW — blind+edge+auditor)** — any call shape (above)
- [x] [Review][Patch] **PQ6 — RP39's module tied with `opensSoon` and became due on the real clock, where the jobs suite's live tick shares the database (LOW — blind+edge; the stale "two modules are due" comment — auditor)** — the pair moved a day ahead; the variable `otherPariwar` (a module id) renamed
- [x] [Review][Patch] **PQ7 — `toAuthorRequest`'s description wiring was untested (LOW — auditor)** — a test sends NBSP / NFD / precomposed nukta descriptions and checks doubled spaces are kept
- [x] [Review][Patch] **PQ8 — 9 of the 16 refused space separators were tested (LOW — auditor)** — all 16, plus a guard that the list equals every `Zs` but U+0020
- [x] [Review][Patch] **PQ9 — The NFC refusal said "retype or paste it again", which reproduces the same text (LOW — blind)** — it now says the admin console converts text and another caller must normalise first
- [x] [Review][Patch] **DN5 — Should the admin client also clean the OTHER paste artefacts the server refuses? (LOW — blind+edge) — RESOLVED by BigDev (verbatim: "1", given to the DN5 / DN6 menu and read by the session as DN5 1, DN6 1 — stated to BigDev and in the entry): Decision `2026-11-01-436` (`a5b23c89`), built in `77ea3906`** — a tab (copying two spreadsheet cells into an `<input>` keeps it), U+00AD soft hyphen and U+2028 (Word / PDF pastes), U+200B, U+FEFF, U+0085 are sent unchanged and refused (now with the server's reason, PQ2). `-435` item 2 cleans exactly the DN3 set, so cleaning more departs from it. Options: (1, recommended) clean them too — tab → space, U+2028 / U+2029 / U+0085 → LF in a description and a space in a name, drop U+00AD / U+200B / U+FEFF / U+2060 — as a new entry superseding `-435` item 2; cost: the client removes characters the admin pasted (all invisible). (2) leave it; cost: an admin meets a 422 for a character they cannot see, now with a reason that names it. Not routed (§0: a validation rule).
- [x] [Review][Patch] **DN6 — The emoji allowances are broader than "emoji" (LOW — blind+edge) — RESOLVED as option 1 by the same "1" (`-436`; its flagged reading extends the rule to U+FE0E), then NARROWED by DN7 (`-437`, BigDev "DN7 1"); built in `77ea3906`** — (a) `\p{Extended_Pictographic}` includes ©, ®, ™, ‼ and unassigned code points, so "©" + ZWJ + "™" passes an English module text (executed); (b) U+FE0F is allowed anywhere, so "LIC" + U+FE0F stays a second "LIC" partner (`-434`'s recorded residual) and "LIC" + space + U+FE0F + space + "Housing" looks like a doubled space yet passes. Options: (1, recommended) allow U+FE0F only right after a pictographic character or a keycap base (0–9, #, *), in every schema; keep the ZWJ rule as `-435` has it and record (a) as a residual (module texts carry no unique index); cost: a stray U+FE0F after a letter is refused. (2) also require each ZWJ to sit inside a recognised emoji (`Intl.Segmenter` + `\p{RGI_Emoji}`); cost: an emoji newer than the server's Unicode data is refused until Node updates. (3) record both as residuals; cost: the partner-name look-alike stays. Not routed (§0). A change is a new entry superseding `-434` / `-435` in part.
- [x] [Review][Defer] **RD7 — The display-text rules have no database backstop (LOW — auditor, family 5)** — deferred, recorded in `deferred-work.md` (owner none yet; re-trigger: a partner writer that skips `parsePartnerDisplayNames`, or the go-live review).

Dismissed (4): U+2800 passing the doubled-space rule (it is refused outright — `DISPLAY_REFUSED_FORMAT_CHARS`; the blind layer could not see that set); the tone hash built from raw text (`moduleToneContentHash` runs on the server over the STORED module, `handlers.ts` publish); other assertions on the old joiner message (none outside build output); a U+FE0E text-presentation heart in a ZWJ sequence and the tag-character flags being refused (not recommended emoji sequences; the flags are `-435`'s recorded residual).

#### Round 2 — DN5 / DN6 / DN7 built, and their patch-diff reviews (2026-11-01 — BigDev: *"1"*, then *"apply all patches"*, then *"DN7 1"*)

Order of commits: decision `-436` (`a5b23c89`) ALONE → the first build reviewed (uncommitted) → decision `-437` (`60dbcf00`) ALONE → code
`77ea3906` (DN5 + DN6 as narrowed by DN7, with the review fixes below). BigDev's later instruction for this step, verbatim: *"run adversarial
review on patches applied if you think another round will find anything high. If there were any finding apply it, then verify in browser and
after that if any thing pending complete it, if not open pr."*

- **DN5 (`-436` item 1)** — `normaliseDisplayText` also: tab → space; U+2028 / U+2029 / U+0085 → LF (description) or space (name); U+00AD,
  U+200B, U+FEFF, U+2060 removed — before NFC and the collapse. Step (a) and the partner picker's Register button judge EMPTINESS on the
  cleaned text (the patch-diff re-review: an invisible-only value passed the client and met a server 422).
- **DN6 + DN7 (`-436` item 2, narrowed by `-437`)** — `selectorStylesSymbol`: U+FE0F / U+FE0E only right after a code point that is
  `\p{Emoji}` and NOT `\p{Emoji_Presentation}` (not a keycap base), or after a keycap base with U+20E3 following. The message is the one
  `-437` item 3 records ("an emoji style character except right after its emoji") — an interim wording was put back to it (PS3).

Patch-diff reviews of this step (three passes: Blind; Edge + Auditor; then a re-review of each fixed build, read-only):
- [x] [Review][Patch] **PS1 — A selector after a digit, `#` or `*` with NO U+20E3 was accepted, so "Plan 1" + U+FE0F was a second "Plan 1" — it broke `-436` Consequence 2 (HIGH — blind+edge+auditor, executed)** — the keycap branch requires U+20E3; refused vectors added.
- [x] [Review][Patch] **PS2 — The refusal tests did not assert the REASON; positives lacked #️⃣ / *️⃣ / ™️ / ©️ and ZWJ sequences whose selector follows a later element (LOW — blind)** — both added.
- [x] [Review][Patch] **PS3 — The interim refusal message did not match `-437` item 3 (MED — re-review, governance)** — the code uses the recorded wording; the tests match it.
- [x] [Review][Patch] **PS4 — An invisible-only value passed the client's empty check (LOW — re-review, executed)** — emptiness on the cleaned text, tested for all four wizard texts and both partner names.
- [x] [Review][Patch] **PS5 — A stale DN2 test title / comment still called "LIC" + U+FE0F a residual, and the DN6 comment still allowed a skin tone (LOW)** — reworded to cite `-436` S3 and `-437`.
- [x] [Review][Decision → resolved] **DN7 — A selector after an emoji that already draws as emoji (😀), after a skin tone, or after an unassigned code point draws nothing yet passed (MED — edge+auditor)** — BigDev: *"DN7 1"* → Decision `2026-11-01-437`.

Recorded residual (accepted, not a defect): a TEXT-default symbol + U+FE0F + skin tone ("☝" + U+FE0F + a skin tone) is accepted — it complies
with `-437` item 1, is not a recommended emoji, and some renderers may draw it like the toned emoji. Module texts carry no unique index; a
partner name with it would differ from one without.

Dismissed (5): a line feed left in a NAME by the client (the name fields are `<input>`, which strip line breaks — unreachable); the client not
removing a stranded selector, and other artefacts (U+000B, LRM / RLM, …) — `-436` "Not covered" (the server's reason is shown); a `g`-flag
`lastIndex` hazard (no regex here has `g` or `y`); a U+FE0E text heart inside a ZWJ sequence (not a recommended sequence).

Evidence:
- RED: the DN6 refusals failed against `497c69e4`'s rules; the DN7 refusals (😀 / 👍🏽 / unassigned + U+FE0F) failed against the DN6
  build; the DN5 cleaning test against the CRLF-only cleaner; each empty-check test against a raw `.trim()`.
- Mutants: the keycap U+20E3 requirement, the skin-tone branch, the old "selector anywhere", "not Emoji_Presentation" dropped — each
  caught; the re-review's harness ran 12 mutants of `selectorStylesSymbol`, all caught.
- Unicode data (re-review, executed): every fully- / minimally-qualified and component entry of `emoji-test.txt` 16.0 and 17.0, inside
  English and Hindi values in all six schemas — none refused by the selector rule; the only refusals are the tag flags and ZWJ in the
  English partner name (older rules). Of Unicode 17's 742 standard variation sequences, 328 are refused: 24 digit / # / * + selector
  without U+20E3 (`-436` Consequence 2) and the 152 emoji-default symbols with either selector (`-437` item 1 and "Not covered"). The
  207-code-point equality of `-437` item 2 holds over U+0000–U+10FFFF.
- Verified at `77ea3906` on `twt-12-2-pg` (:5451): `tsc --noEmit` 0 (domain, admin, API); ESLint 0 on changed files; the domain
  marketplace unit + integration + policy sets 624; the whole admin suite 1,661; the API admin-module spec + errors unit 54; jobs
  `module-activation` 6. NOT run yet: `pnpm ci:local`, the real-browser pass.

### Review Findings — round 2, chunks B (API / jobs / contracts / gate scripts) and C (admin UI) (2026-11-01, `bmad-code-review 12.2`)

Scope: `36b489c9..4729805c` — chunk B `apps/api apps/jobs packages/contracts scripts` (3,295 diff lines; `openapi/v1.yaml` checked by
reading — in sync), chunk C `apps/admin` (3,625). Six layers in parallel, read-only (Blind / Edge / Auditor per chunk), told every earlier
finding, patch and dismissal. 18 + 3 + 2 (B) and 18 + 10 + 7 (C) raw → 30 distinct patches, 0 decision-needed, 0 new deferrals (RD3 gains a
trigger), 21 dismissed. No HIGH. Applied under BigDev's *"…If there were any finding apply it…"*.

Chunk B — patches:
- [x] [Review][Patch] **RB1 — The detail read hard-codes `hindi_reviewed` / `partner_agreement_confirmed: true` instead of reading the row (LOW — blind)** — read `publication.*` (the DB CHECK makes them true, but the response must not assert what it did not read) [apps/api/src/modules/marketplace/handlers.ts `get`]
- [x] [Review][Patch] **RB2 — `accent_color_hex` lacks the `?? null` its sibling `logo_object_key` has; the strict response DTO would 500 on a bundle missing the key (LOW — blind)** [handlers.ts `get`]
- [x] [Review][Patch] **RB3 — The OpenAPI omits the 401 (`requireAdminSession`) and the scope hook's 404 on every route, and withdraw's / author's reachable 409 codes (LOW — blind+edge)** — add them in `emit-openapi.ts`, re-emit `openapi/v1.yaml` [packages/contracts/scripts/emit-openapi.ts]
- [x] [Review][Patch] **RB4 — AC2's "nothing written" leg asserts only on the audit table, so an UNAUDITED write by a denied admin would pass (LOW — blind)** — assert partner / module / event row counts as RP12 does [apps/api/tests/integration/marketplace-admin.spec.ts]
- [x] [Review][Patch] **RB5 — The contracts sync guard does not pin the eligibility clause kinds, `MAX_ELIGIBILITY_CLAUSES` or the `unusable_reason` set the response DTO re-declares (LOW — auditor; AC13 / TR12)** — a new clause kind within `version: 1` would 500 the detail GET with CI green [packages/contracts/tests/modules.test.ts]
- [x] [Review][Patch] **RB6 — The sweep's `failed` log carries only `err.name` (pg's `DatabaseError.name` is `"error"`) and no Pariwar; the `failed` branch is untested (LOW — edge)** — log `pariwarId` and the SQLSTATE found through `cause`; a stubbed `failed` test that also proves the loop continues [apps/jobs/src/scheduler/module-activation.ts; apps/jobs/tests/module-activation.test.ts]
- [x] [Review][Patch] **RB7 — `errors.ts`'s header (and the Completion Note) say `mapModuleError` owns "EVERY row of the QE18 table … the pre-check refusals included"; the publish pre-checks (`not_draft`, `window_ended`) and the idempotency rows are raised in the handler (LOW — blind+auditor, family 10)** — reword to what is true [apps/api/src/modules/marketplace/errors.ts]
- [x] [Review][Patch] **RB8 — RD3's trigger list misses the reachable one: the API process dies between the key claim and its settle, leaving the key `pending` for 24 h, so the wizard's / picker's same-key retry answers 409 `idempotency_in_progress` ("wait a moment") all day (LOW — edge; blind on the handler header's publish / withdraw-only list)** — record it in RD3 and the handler header (records + comment; the `takeOver` remedy stays RD3's owner's)

Chunk C — patches:
- [x] [Review][Patch] **RC1 — After Create draft nothing is announced and focus is left on `<body>` (MED — the browser pass, edge, auditor; family 13(d))** — navigate with a `created` flag; the detail page focuses its heading on first data and puts "Draft created." in its always-mounted live region [ModuleWizard.tsx; ModulesRoute.tsx; ModuleDetailPage.tsx]
- [x] [Review][Patch] **RC2 — Focus falls to `<body>` when the step-up panel opens (the pressed button disables), when it is cancelled, and when a publish / withdraw / held retry fails; a non-422 Create failure too (MED — blind+edge+auditor, family 13(d))** — focus the panel's first control when it opens; return focus to the heading (or the pressing control) on cancel and in every catch [ModuleDetailPage.tsx; ModuleWizard.tsx]
- [x] [Review][Patch] **RC3 — Registering a partner (success) and Cancel unmount the focused control; the new partner is selected silently (LOW — edge+auditor, family 13(d))** — focus the select after success, the "Register a new partner" button after Cancel [PartnerPicker.tsx]
- [x] [Review][Patch] **RC4 — A registration still in flight overwrites a partner the admin has since picked from the list (MED — blind; RP27 covered only unmount)** — the select's change bumps the generation [PartnerPicker.tsx]
- [x] [Review][Patch] **RC5 — The partner select shows "Choose a partner" for a chosen id the options do not list (a refetch failure after registering; a corrected copy's partner past 200), while Next is enabled and the summary drops the partner line (LOW — blind+edge)** — a fallback option and summary line [PartnerPicker.tsx; ModuleWizard.tsx]
- [x] [Review][Patch] **RC6 — Leaving the wizard while Create is in flight still navigates the admin to the new draft from wherever they went (LOW — edge; TR5's guard)** — a mounted / generation ref [ModuleWizard.tsx]
- [x] [Review][Patch] **RC7 — A corrected copy whose source failed to load unlocks a blank wizard, then a later refetch pre-fills OVER what the admin typed (LOW — blind+edge; new evidence beyond RP20)** — the admin's first edit wins (no later pre-fill), and a failed source keeps the fields locked with Try again [ModuleWizard.tsx]
- [x] [Review][Patch] **RC8 — After 422 `module.scope_value_unknown` the scope options are never refetched and `details.values` is ignored, so the refused place still looks valid (LOW — edge+auditor; new evidence beyond RP21)** — refetch the options and name the refused places [ModuleWizard.tsx; derive.ts]
- [x] [Review][Patch] **RC9 — After 409 `module_partner.name_taken` ("choose it from the list") the list is not refetched (LOW — edge)** [PartnerPicker.tsx]
- [x] [Review][Patch] **RC10 — The summary leaves out step (f) (the lead hand-off address and the secret name), so a typo goes unreviewed into an immutable draft (LOW — blind)** [ModuleWizard.tsx]
- [x] [Review][Patch] **RC11 — A fast double activation of Publish / Withdraw sends two writes with different keys before `busy` renders (LOW — blind)** — a synchronous in-flight guard [ModuleDetailPage.tsx]
- [x] [Review][Patch] **RC12 — "Load more" unmounts under focus on the last page and the new rows are not announced; a failed next page shows the whole-list error over the rows (LOW — blind+edge)** [ModulesPage.tsx]
- [x] [Review][Patch] **RC13 — "No offers yet." under a state filter in a Pariwar that has offers (LOW — edge)** — "No offers in this state." [ModulesPage.tsx; i18n-en.ts]
- [x] [Review][Patch] **RC14 — The partner picker's "Loading…" and disabled Try again come back on every later refetch after one earlier failure (`errorUpdateCount` never resets) (LOW — blind)** [PartnerPicker.tsx]
- [x] [Review][Patch] **RC15 — Create / Publish / Withdraw stay busy until EVERY module query refetches (the invalidation promise is returned from `onSuccess`) (LOW — blind)** [apps/admin/src/api/hooks.ts]
- [x] [Review][Patch] **RC16 — Copy: "1 members registered interest"; the "goes live at its opening time" line stays after the offer is Live; "Only members in these statuses: " with nothing ticked (LOW — blind+auditor)** [i18n-en.ts; derive.ts; ModuleDetailPage.tsx]
- [x] [Review][Patch] **RC17 — Notices not tied to their controls: the G18 note at step (b), the India-time line at step (d), the scope truncation / reach notes; "No place matches the search." not live (LOW — auditor, family 13(d))** — `aria-describedby` / polite status [ModuleWizard.tsx; ScopePicker.tsx]
- [x] [Review][Patch] **RC18 — The detail page's partner line renders the Hindi name without `lang="hi"` (LOW — blind+auditor; WCAG 3.1.2)** [ModuleDetailPage.tsx]
- [x] [Review][Patch] **RC19 — AC11 still says the Idempotency-Key is "minted once per wizard session" (RP18 changed it); the File List still calls two committed test files "untracked" (LOW — auditor, family 10)** — dated pointer at AC11; File List corrected (records)

Dismissed (21), each checked against the tree or the records: the same key with a different body (RD2); the access-wrapper gate not proving the domain never audits (round 1, and the QE22 test — RP40); withdraw with no pre-read writing an audit pair for a foreign id (round 1 — AC7 / QE10; the line records the caller's own attempt with the id they sent); a closed-window `scheduled` module never archived (carried C2 → 12.6); a failing candidate retried forever (RD1); per-process sweep concurrency and the BYPASSRLS write path (the command's row lock; G13 / Row 26); the scope options' clock (round 1); the self-computed tone hash (immutable rows — QE4); the trigger-error code on a 500 (the house precedent); `actorRole: null` (round 1); a session naming a deleted user (the scope hook still answers 404 — no grant); one-click withdraw (AC7 / QE10, the browser pass); same-named districts (the geo tree forbids them); the stale page after a lost write response (round 1); the publish body's literal `true` ticks (the contract's literal; the button is the gate); the normaliser keeping ZWJ / ZWNJ (`-436`); the session-error redirect (the app-wide route-gate pattern); a conditionally mounted reason paragraph (it is Next's `aria-describedby`, not an announcement); three weak-test notes already covered elsewhere (the withdraw step-up mock, the prefill test's scope, the 422 same-key retry — the key-per-body behaviour is tested in derive).

#### Round 2 chunks B / C — patches applied, and their patch-diff reviews (2026-11-01)

Applied by two implementers in parallel on disjoint paths (chunk B: `apps/api`, `apps/jobs`, `packages/contracts`, `openapi`; chunk C:
`apps/admin`), each with RED-then-GREEN or a mutation check (backup → mutate → restore → `cmp`), then reviewed as a PATCH diff by fresh
read-only layers until a round found only LOW items. Code commit: the one after `4729805c` (see the Change Log, v1.13).

- **Chunk B (RB1–RB7):** RB1 has NO red (the row's CHECKs make a false tick unstorable; a broken invariant now throws instead of asserting
  `true`). RB2: a raw-updated bundle without the key answered 500, now 200 `null`. RB3: 401 (`auth.session_required` / `auth.session_expired`)
  and the scope hook's 404 `pariwar.not_found` on all eight routes; ⚠ the finding's suggested 409 codes for author / withdraw were checked
  UNREACHABLE (the genesis maps 23505 to `ModuleGenesisAlreadyExistsError`; a server-minted id cannot collide; `archiveModule` has no
  `trustee_archived` guard) and were NOT added — the round-2 finding over-reached; the reasoning sits in `emit-openapi.ts`. RB4: an unaudited
  partner insert before the permission hook fails the new counts, passed the old audit-only test. RB5: a runtime
  `MODULE_SCOPE_OPTION_UNUSABLE_REASONS` tuple added to `scope-options.ts` (behaviour unchanged) so the sync guard has something to compare;
  five mutations caught. RB6: the log carries `pariwarId` and `sqlstate` (via `pgSqlstateOf`); a stubbed test proves the loop continues.
  RB7: header reworded.
- **Chunk C (RC1–RC18):** 46 new tests (33 RED first), 36 mutations caught.

Patch-diff review 1 (Blind; Edge + Auditor) — no HIGH, no regressions; fixed as PT1–PT18:
- [x] PT1 (MED) the partner picker showed "could not load" + Try again over a WORKING list after a failed background refetch — only with no data now.
- [x] PT2 (MED) late results (Load more, registration, the created heading) stole focus from where the admin had moved — `focus.ts` `focusIfUnclaimed`.
- [x] PT3 (MED) the post-write button lock could be skipped or stick (`!isError`, wall-clock stamps) — see PU4 for its final shape.
- [x] PT4 the held step-up retry left focus on `<body>`; PT5 the panel autofocus skips disabled controls (no RED possible — the panel remounts per hold); PT6 checked, left: no non-user `set()` runs before the source loads.
- [x] PT7 a 404 corrected-copy source offers "Start a blank offer"; PT8 focus after a successful source retry; PT9 an empty last page announces "No more offers."; PT10 `?created` announces only for the viewer's own draft; PT11 route-level tests (`modules-route.test.tsx`, memory history, the real routes); PT12 a list pick during a registration closes the form at once; PT13 the Hindi preview fallback; PT14 the refused-place list is bounded.
- [x] PT15 OpenAPI 400s (params are validated before the hooks — a malformed `pariwarId` is 400 even unauthenticated); PT16 the AC2 counts cover BOTH Pariwars (an unaudited write into the second passed the RB4 version); PT17 the contracts guard comment narrowed and the clause's states enum compared; PT18 `errors.ts` header: only publish's two pre-checks pass through the mapper.

Patch-diff review 2 (combined, on the PT delta) — no HIGH / MED; four LOW fixed as PU1–PU4 (tests written first: 11 RED, 13 mutations caught):
- [x] PU1 "Start a blank offer" left focus on `<body>` — a one-shot `blank` flag focuses the new wizard's step heading; `replace: true`.
- [x] PU2 a malformed `?from=` dead-ended on Try again — `validateModuleNewSearch` drops a non-UUID `from`, re-validated in the route (the router merges the parent's raw search otherwise — found while fixing), and a 400 is treated like the 404.
- [x] PU3 a window-focus refetch flipped the 404 block and unmounted its focused button; PT8 ran only on the click path — the not-found state is sticky; the heading focus is an effect on the source's late arrival.
- [x] PU4 the PT3 test could flake on a millisecond roll-over — the lock is now `awaitingRefresh && detail.isFetching` (ends when the post-write read settles, success or failure; no timestamps); the implementer declined the reviewer's count-snapshot because a refresh that lands before the snapshot would stall it.

**Real-browser pass 2 (2026-11-01, same recipe, throwaway `twt-12-2-browser` :5461, removed afterwards)** at the PT1–PT18 tree, i.e. BEFORE PU1–PU4 (which are covered by jsdom and route tests only): registering a
partner moved focus to the partner select (RC3); the summary showed the hand-off fields (RC10); Create draft → the detail page with focus on
the heading, the live region "Draft created." and the URL without `?created` (RC1); the publisher hand-typing `?created=true` on that draft got
no announcement and the flag dropped (PT10); Publish → the step-up panel with focus on "Send the code" (RC2); Cancel → focus on the heading
(RC2); Publish → send → code → Verify → Live, "Published.", focus on the heading, Withdraw re-enabled once the refresh landed (PT4; PT3's lock, since reshaped by PU4).
Observed, NOT changed: pressing "Send the code" in the SHARED `StepUpPanel` drops focus to `<body>` — deferred as RD8 (`deferred-work.md`). Not
covered: "Load more" (the seeded list is one page), a screen reader, keyboard-only navigation end to end.

#### `ci:local` on the round-2 tree (2026-11-01)

- Run 1 at `4729805c` on the story container `twt-12-2-pg` (:5451): **37 / 37 green** — but the fix implementers began editing midway,
  so it attests the committed state only loosely.
- Run 2 at `ea408af3` (:5451): **35 / 37** — `microcopy` (the tone gate flags "does not count" in a `ModuleDetailPage.tsx` COMMENT —
  reworded in `550307be`) and `integration-tests` (`announcement-activity-read.spec.ts`, Story 5.14 — see below).
- Run 3 at `550307be` (:5451): **36 / 37** — the same announcement spec only.
- Run 4 at `550307be` on a FRESH container `twt-12-2-ci2` (:5462): **37 / 37 green, first run** — the AC13 / AC14 attestation for this tree.
- The announcement spec, diagnosed (not a 12.2 regression — nothing in 12.2's diff touches cycles or announcements): it reads the latest 2
  cycles of the shared `PARIWAR_A` in a 15-day window; run 2 left seven committed `cycle_freeze_commits` rows there (`trustee-actor-1`,
  12:22–12:23 UTC) that persist and outrank the spec's own cycles, so it stays red on :5451 until they age out. No row was deleted; the
  writer was not pinned down. A fresh Pariwar in that spec is the durable fix (Story 5.14's area).

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

Claude Opus 5.5 (`claude-opus-5-5`) via `bmad-dev-story`, 2026-11-01 — with three forked sub-agents for the domain tests,
the API tests and the admin UI (each reported back; their work is in the one code commit).

### Debug Log References

- Task 0.1 (re-grep, 2026-11-01): `origin/main` = `36b489c9` unmoved; decision `-433` ours; migration `0195` free (main
  tops at `0194`, `when` 1796355600039; no sibling committed one) → journal `when` 1796442000040; catalog v56 / 74 keys on
  every ref → v57 / 75; ledger `q` (records) and `r` (this entry). G1 re-verified against the 12.1 source.
- Records commit `78b3671e` (Task 0.4) landed BEFORE any code; code commit `89add5ee`.
- The worktree had ⛔ `node_modules` — the first tool runs resolved packages from the MAIN checkout above it; a
  `pnpm install --frozen-lockfile` in the worktree fixed it before any test result was relied on.
- Story DB: own container `twt-12-2-pg` (:5451, DB `twt_dev`, migrated from scratch, `timezone UTC`). CI DB:
  `twt-12-2-ci-pg` (:5452), recreated fresh for the second `ci:local`.
- A fixture regex turned `manifestFor`'s own `manifestInput(...)` into a recursive call (every `commands.spec` leg timed out
  at 5 s) — fixed before any commit.

### Completion Notes List

**What was built (QE1–QE22 as answered, QE16 as amended):**
- **Migration `0195`** — `marketplace_partners` (per-Pariwar, insert-only, `(pariwar_id, partner_id)` unique as the FK
  target, `(pariwar_id, lower(display_name_en))` unique index) and `marketplace_module_publications` (PK `module_id`,
  composite FK to the module, CHECKs on event type / hash / both ticks); `marketplace_modules` gains a
  `(pariwar_id, module_id)` unique, the COMPOSITE `marketplace_modules_partner_fk`, the partial
  `marketplace_modules_scheduled_valid_from_idx` and `GRANT SELECT, UPDATE … TO twt_service` — ⛔ a column; the 0193
  trigger and `GUARDED_COLUMNS` untouched (I7). RLS ENABLE + FORCE, named select / insert policies.
- **RBAC** — `module.manage` (pariwar; `pariwar_admin` + super_admin), catalog 56 → 57, 74 → 75 keys, 13 roles (I9).
- **Domain** — `partners.ts`, `publication.ts`, `scope-options.ts`, `activation-sweep.ts` (scan + classify ONLY — I11);
  `read.ts` += `pageModulesForPariwar` / `encodeModuleCursor` / `decodeModuleCursor` (the five-step STRICT decode) /
  `getModuleAuthorActorId` / `countModuleLeads` (`listModulesForPariwar` unchanged); `filters.ts` += the QE12 WRITE-ONLY
  display schemas (code points compared numerically — ⛔ invisible character in source); `errors.ts` += the five classes.
- **Contracts** — `packages/contracts/src/modules/{enums,dto,index}.ts` (+ the two list-query schemas, shared by the route
  and OpenAPI); eight OpenAPI paths; `partners/README.md` dated note.
- **API** — `apps/api/src/modules/marketplace/` (eight routes; I2's write shape; `mapModuleError` = every QE18 row). ⚠ CORRECTED 2026-11-01 (code review round 2, RB7 / PT18): the publish pre-checks `module.not_draft` / `module.window_ended`, the detail read's `module.not_found` and the idempotency rows are raised in the handler — only the two publish pre-checks pass THROUGH `mapModuleError`; the others never reach it.
- **Jobs** — `apps/jobs/src/scheduler/module-activation.ts` (`*/5 * * * *` IST, own `max: 3` pool, `localConcurrency: 1`,
  the Row 26 guard first, exported `activateDueModule`); `QUEUE_NAMES.MODULE_ACTIVATION`.
- **Access-wrapper gate** — `MARKETPLACE_ROOTS` under the compensating-audit invariant ONLY.
- **Admin** — `apps/admin/src/modules/marketplace/` (wizard a–f + Summary, detail + publish / withdraw / corrected copy,
  list with "Load more", partner + scope pickers, `derive.ts`, `i18n-en.ts`), `ModulesRoute.tsx`, three routes, nav link.

**Tests (all green) — as of the code commit `89add5ee`; the review rounds changed these numbers (see the review sections: the API admin-module spec is now 33 tests, the six marketplace admin UI files 83, the whole admin suite 93 files / 1,653):** domain unit 614 in `tests/marketplace` + `tests/rbac` (+37 QE12 vectors, 50 cursor vectors, …);
domain live 122 across the 13 marketplace + RLS files (seven NEW, six 12.1 files updated for the partner FK); contracts
sync-guard 10; API unit `mapModuleError` 21; API integration `marketplace-admin.spec.ts` 25 (AC2–AC8 + the AC13 route-table
leg), `login-wall` 5 + `forced-pagination` 6 green; jobs `module-activation.test.ts` 6; admin 48 new (derive 31, wizard 6,
detail 8, list 3), whole admin suite 91 files / 1,618.

**AC14 — `pnpm ci:local` on a FRESH container:** run 1 (fresh `twt-12-2-ci-pg`) = 36/37 — `integration-tests` red on ONE
test, `apps/api/tests/integration/medical/medical-disclose.spec.ts` (`expected 'enc:v1:…' not to contain 'ckd'`): the KNOWN
random-base64 substring collision (a 3-letter needle inside a random envelope); 21/21 three times in isolation on the same
DB; this branch has ⛔ diff in medical code. Run 2 (container RECREATED fresh) = **37/37 green, `ci:local exit=0`** (domain
7,441, jobs 1,968, api 2,656 integration tests). Both runs are stated; run 2 is the AC14 evidence.

**AC14 greps (on `89add5ee`'s tree):** I1 — ⛔ file under `apps/` references `marketplaceModules`; I8 —
`submitModuleLead` / `checkModuleLeadAllowed` have ⛔ caller outside `packages/domain/src/marketplace` (tests excluded); I9 —
the permissions diff is exactly `56 → 57` and `+ 'module.manage'`; I10 — ⛔ `commission` identifier in the migration, the two
new schema files or the contracts DTOs (two hits, both doc-comment lines in `dto.ts` — lines 15 and 43 — saying commission
data / terms are NOT accepted; comments are excluded. Corrected from "one hit" by the code review, chunk B, RP16(d)); I11 — ⛔ `withCompensatingAudit(` call under `packages/domain/src/marketplace/` (also the QE22 test).

**AC13 gate teeth:** a bare `audit.writeAuditEntry(...)` planted in `apps/api/src/modules/marketplace/` turned
`pnpm access-wrapper:check` RED (exit 1), green once removed. ⚠ A DIRECT `writeAuditEntry(...)` import planted in
`packages/domain/src/marketplace/` was ⛔ flagged — the scanner matches the namespace shape only (pre-existing; recorded in
`deferred-work.md`, "Not addressed"). The API fork also proved the I4 leg's teeth (the null-author deny disabled ⇒ 200 ⇒ red).

**RPD4 — 12.1's I6 re-stated (QE22):** the LEAD commands (`submitModuleLead`, `checkModuleLeadAllowed`) have ⛔ production
caller; author / schedule / activate / archive now do (the 12.2 routes and the sweep).

**Variances from the epic / PRD (as the story lists them):** publish emits `module.scheduled` for a future start; the
"structured rule expression preview" is a plain-language sentence; PRD §4.9's `user` / `block` scopes absent; `role` /
`cohort` absent (QE17); "national" = `members-all` of one Pariwar; `commission_terms` not stored (QE6); branding all-null
(QE8); the signing key is a Secret Manager NAME; step (g)'s review is on the detail page by a non-author; partners are
per-Pariwar tenant routes; `module.manage` doubles as the review key; the "trustee" persona holds ⛔ key (QE2); FR-66's "CTA
destination" is the lead hand-off URL only; admin step-up delivery is the house-wide always-stub; the no-tree scope source is
the listed workplace districts (`-429` C11 amended, QE5).

**Choices made in build (within the ACs):**
- A null-author publish is denied with `ToneReviewRequiredError` reason `signoff-missing` and `authoredBy: 'unknown'` (the
  gate's denial type has no "author unknown" reason); its `publish_blocked` line carries `reason: 'author-unknown'`.
- A duplicate partner name fails on the DB unique INSIDE the wrapper, so it leaves an intent + `module_partner.created_rolled_back`
  pair (by design — the name-RULE refusal is the pre-check that writes nothing).
- The admin pages take navigation callbacks; the route file navigates. A held publish retries ONCE; a second step-up demand
  shows an error.

- **QE12 narrowed for English text (code review round 1, DN1 — BigDev, verbatim: "1").** U+200C / U+200D (ZWNJ / ZWJ) are
  accepted in the `*_hi` display schemas ONLY; the three `*_en` schemas (module name, module description, partner name) now
  refuse them. QE12's text allowed both for Devanagari conjuncts, so this is a narrowing of the build decision made by BigDev's answer to DN1, recorded here and as a dated pointer at QE12 — it is NOT recorded in any governance document (`.decision-log.md` `-433` and ADR-0044 still say "allowed"), so it stays an unratified departure until BigDev authorises an amendment. The same
  round (RP1) also refuses every other format character (Cf), U+2028 / U+2029 and the four Hangul fillers in every display schema, and (DN2, BigDev's answer "2") every other default-ignorable code point and the Braille blank, except the emoji / text presentation selectors U+FE0E / U+FE0F — also in no governance document yet. ⭐ Since v1.10 both are recorded: author-commit `2026-11-01-434` (`e6f30675`) amends `-433` QE12, with a dated line at ADR-0044 D3 / D4.

**⭐ Real-browser pass DONE 2026-11-01 at `667c6d74` (BigDev: *"…then verify in browser…"*)** — Chrome (Claude in Chrome) against the
real API (`buildServer`, fake WebAuthn, real passkey routes) on a THROWAWAY Postgres (`twt-12-2-browser`, :5461, all 195 migrations),
admin Vite on :3001, one fresh Pariwar with two `pariwar_admin`s (author "Asha", publisher "Ravi") and three listed workplace districts;
the launcher, cookie helper and container were removed afterwards. Walked and checked: the list's empty state → New offer; a partner
registered from a pasted-style name "LIC" + NBSP + "Housing" + two spaces + "Finance" was STORED as `LIC Housing Finance` (hex, single
U+0020 — DN3's client cleaning); a partner name with a hidden ZWJ was refused with the alert "Please fix “Partner name (English)”: must
not contain an invisible joining character …" (PQ2 — and NO audit line was written); step 1 → 7 with focus moving to each step heading
(RP30), the eligibility notice and live sentence, the no-tree audience (state offered as unavailable), district options from the
workplace list, the real `datetime-local` widgets with India and computer time, a fixed 50 places, the hand-off fields, the bilingual
summary; Create draft (an English description with a family ZWJ emoji and a CRLF — stored with LF, emoji intact — DN4); the author's
Publish DISABLED and described by "you wrote it" (QE9 / RP33); the publisher's three ticks → the step-up panel → the OTP (read from the
launcher's capture) → Live, "Published by Ravi (Publisher)", live region "Published.", focus to the heading (RP32); the DB held one
`module.activated` publication row (64-hex hash, both ticks), the stream `authored` → `activated`, audit `module_partner.created` /
`module.authored` / `module.activated`; Withdraw (one click, no step-up — AC7 / QE10) → "Withdrawn or ended", "Withdrawn."; Start a
corrected copy → the wizard pre-filled (partner, names, description with its emoji and line break). No console error on reload.
Observed, not changed: after Create draft the new detail page leaves focus on `<body>` (the write-time focus of RP32 applies to the
detail page's own writes) — carried to round 2 chunk C's review. NOT covered by this pass: a screen reader, keyboard-only navigation,
a network failure mid-write, a scheduled (future-start) publish and the 5-minute sweep.

**NOT done / un-attested (as written at `89add5ee`; the browser half is superseded by the pass above):** no real-browser pass of the admin wizard was done (unit / RTL tests only — so there was no real screen reader, no
real keyboard focus order, no real `datetime-local` widget, and no real step-up OTP round trip); `ModulesRoute.tsx` (session gate,
`?from=`, the three route keys), the router wiring (`router.tsx`, `validateModuleNewSearch`) and the `nav-modules` link in
`RootLayout.tsx` have no test of their own (corrected by the code review, chunk C, RP35 — the notes used to disclose only the
first and second of these). The family 13 (accessibility) behaviour was added by the review rounds and is tested only as DOM semantics (roles, `aria-*` resolved descriptions, named groups, focus after a step change, a write or a Remove) in jsdom, never in a browser; the exact wording of the reworded second-step-up sentence is not pinned (the test reads it through the dictionary). Nothing is pushed.

### File List

New:
- `packages/domain/migrations/0195_marketplace-partners-and-publications.sql`
- `packages/domain/src/schema/marketplace_partners.ts`, `packages/domain/src/schema/marketplace_module_publications.ts`
- `packages/domain/src/policies/marketplace-partners-rls.ts`, `packages/domain/src/policies/marketplace-module-publications-rls.ts`
- `packages/domain/src/marketplace/{partners,publication,scope-options,activation-sweep}.ts`
- `packages/domain/tests/marketplace/{scope-options,publication,read-cursor,partners,no-audit-wrapper-in-domain,activation-outcome}.test.ts`
- `packages/domain/tests/integration/marketplace/{partners,publication,read-cursor,scope-check,activation-select}.spec.ts`
- `packages/domain/tests/integration/rls/marketplace-partners-policy-regression.spec.ts`,
  `packages/domain/tests/integration/rls/marketplace-module-publications-policy-regression.spec.ts`
- `packages/contracts/src/modules/{enums,dto,index}.ts`, `packages/contracts/tests/modules.test.ts`
- `apps/api/src/modules/marketplace/{errors,handlers,routes,index}.ts`
- `apps/api/tests/unit/marketplace-errors.test.ts`, `apps/api/tests/integration/marketplace-admin.spec.ts`
- `apps/jobs/src/scheduler/module-activation.ts`, `apps/jobs/tests/module-activation.test.ts`
- `apps/admin/src/modules/marketplace/{ModulesPage,ModuleWizard,ModuleDetailPage,PartnerPicker,ScopePicker}.tsx`,
  `apps/admin/src/modules/marketplace/{derive,i18n-en,index}.ts`, `apps/admin/src/routes/ModulesRoute.tsx`
- `apps/admin/tests/{marketplace-derive.test.ts,module-wizard.test.tsx,module-detail.test.tsx,modules-page.test.tsx}`; added by the code review (RP35; committed in `465a2ac8`): `apps/admin/tests/{partner-picker.test.tsx,scope-picker.test.tsx}`

Modified:
- `packages/domain/migrations/meta/_journal.json`; `packages/domain/src/{ids/index.ts,policies/index.ts,schema/index.ts}`;
  `packages/domain/src/schema/marketplace_modules.ts`; `packages/domain/src/rbac/{permissions,roles}.ts`;
  `packages/domain/src/marketplace/{errors,filters,index,read}.ts`
- `packages/domain/tests/rbac/{permissions,roles}.test.ts`; `packages/domain/tests/marketplace/{filters,events}.test.ts`;
  `packages/domain/tests/integration/marketplace/{_fixtures.ts,commands.spec.ts,commands-clock.spec.ts,module-stream-concurrency.spec.ts,projector-trigger.spec.ts,read.spec.ts}`;
  `packages/domain/tests/integration/rls/marketplace-modules-policy-regression.spec.ts`
- `packages/contracts/src/index.ts`, `packages/contracts/src/partners/README.md`, `packages/contracts/scripts/emit-openapi.ts`,
  `openapi/v1.yaml`
- `packages/queue/src/index.ts`
- `apps/api/src/server.ts`; `apps/jobs/src/boot.ts`
- `apps/admin/src/api/{client,hooks}.ts`, `apps/admin/src/router.tsx`, `apps/admin/src/routes/RootLayout.tsx`
- `scripts/access-wrapper-invariants/{check.ts,README.md}`, `docs/access-wrapper-invariants.md`
- Records: `_bmad-output/implementation-artifacts/deferred-work.md` (Task 0.4 + Task 10), `_bmad-output/planning-artifacts/epics.md`,
  `docs/adr/ADR-0044-module-manifest-schema-versioning.md`, `docs/tone-review-checklist.md`,
  `docs/launch-gate-inventory/inventory-roster.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, this story file

### Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-01 | v1.14 | LANDED (BigDev: *"go ahead"*): PR #320 merged by fast-forward `36b489c9..d8ca7628` (26 commits, SHAs unchanged, ⛔ merge commit, ⛔ squash); GitHub CI 37 / 37 on `d8ca7628`; the pre-push `ci:local` 37 / 37 on a fresh container at the branch push (a first push was refused by the hook on known failure #18 — Story 5.14's announcement spec on a second run per database — and re-pushed against a fresh container; ⛔ `SKIP_CI_LOCAL`). Status → done; row → `done`; ledger `2026-11-01x`. |
| 2026-11-01 | v1.13 | Code review round 2, chunks B and C (six read-only layers at `4729805c`, no HIGH): RB1–RB8, RC1–RC19, then two patch-diff reviews (PT1–PT18, PU1–PU4) until only LOW remained; code `ea408af3` + `550307be` (a tone-gate comment). A second real-browser pass (RC1 / RC2 / RC3 / RC10 / PT4 / PT10); RD3 gains the process-death trigger; RD8 (the shared `StepUpPanel` drops focus after "Send the code") deferred. `ci:local` 37 / 37 on a FRESH database at `550307be` (the story container is red only on a Story 5.14 spec its leftover rows break — diagnosed above). Row stays `review`; ledger `2026-11-01w`. |
| 2026-11-01 | v1.12 | DN5 + DN6 (BigDev *"1"*, read as both option 1 — Decision `2026-11-01-436`, `a5b23c89`) and DN7 (*"DN7 1"* — Decision `2026-11-01-437`, `60dbcf00`), each committed ALONE before the code `77ea3906`; three patch-diff review passes (PS1 HIGH keycap hole fixed, PS2–PS5); a residual recorded (text symbol + U+FE0F + skin tone). ADR-0044 fourth dated line. Not run: `ci:local`, a real-browser pass. Row stays `review`; ledger `2026-11-01v`. Not pushed. |
| 2026-11-01 | v1.11 | Code review round 2, chunk A (`bmad-code-review 12.2`): 16 raw → 13 distinct — DN3 + DN4 (BigDev: *"DN3 1, DN4 1"* — Decision `2026-11-01-435`, committed ALONE as `ac1ddad3`), RP36–RP41, 5 dismissed; *"apply all patches"* → code `497c69e4` after a patch-diff review (28 raw → 16: PQ1–PQ9 fixed, DN5 / DN6 open, RD7 deferred, 4 dismissed). ADR-0044 gets a third dated line (`-435`). `deferred-work.md`: the R3D1 line (RP36), RD7. Not run on this tree: `ci:local`, a real-browser pass. Row stays `review`; ledger `2026-11-01u`. Not pushed. |
| 2026-11-01 | v1.10 | BigDev: *"Write the QE12 narrowing into -433 and ADR-0044"* — author-commit `2026-11-01-434` committed ALONE as `e6f30675` (after the code it records, `465a2ac8`): DN1 + DN2 + RP1's display-text rules; amends `-433` QE12 (not edited in place) and ADR-0044 D3 / D4 in part (dated line + Changelog row); RPD1 not triggered. QE12's two dated pointers, the chunk A "Open after this round" line and the Completion Note now cite `-434`. Its "Not covered" names round 2's visible look-alike finding (under triage). Row stays `review`; ledger `2026-11-01t`. Not pushed. |
| 2026-11-01 | v1.9 | Code review round 1 COMMITTED (`bmad-code-review 12.2`; BigDev: *"1"* — commit round 1, then round 2): code `465a2ac8` (DN1, DN2, RP1–RP35 with RP7 reverted by PP1, PP1–PP4; 30 files, two new admin test files). Records: the three chunk sections and the patch-diff review (DN1–DN2 resolved by BigDev, RP1–RP35, PP1–PP5, deferrals RD1–RD6), QE12's dated WIDENED / NARROWED pointers, `deferred-work.md`, `epics.md` (RD4 / RD5 under 12.6 / 12.3), roster Row 26 (`0195`). The QE12 narrowing is still in NO governance document (`-433`, ADR-0044 say "allowed"). Not run on this tree: `ci:local`, a real-browser pass. Row stays `review`; ledger `2026-11-01s`. Not pushed. |
| 2026-11-01 | v1.8 | `bmad-dev-story` COMPLETE: Tasks 1–10 done; code commit `89add5ee` (migration `0195`, `module.manage` v57, domain, contracts + OpenAPI, eight API routes, the 5-minute activation sweep, the access-wrapper roots, the admin wizard / detail / list); `ci:local` 37/37 on a fresh container (run 2; run 1 red only on the known medical-disclose `ckd` collision). `deferred-work.md`: 13 "being built" legs → "Closed by `89add5ee`"; one new "Not addressed" item (the gate's namespace-shape limit). Status → review; row → `review`; ledger `2026-11-01r`. Not pushed. |
| 2026-11-01 | v1.7 | `bmad-dev-story` started: Task 0.1 DONE (re-grep — `origin/main` `36b489c9` unmoved; `0195` / v57 free; ledger `q` next; G1 re-verified) and Task 0.4 DONE (the `-433` records: `deferred-work.md` legs + a 12-2 carried section, epics.md INHERITED FROM 12.2 ×3, ADR-0044 amendment lines ×6, tone-checklist routing row, roster Row 26 note) — Task 0 complete. Row `ready-for-dev` → `in-progress`. Ledger `2026-11-01q`. No code. |
| 2026-11-01 | v1.6 | Task 0.3 DONE (BigDev: *"write the author-commit"*): Decision `2026-11-01-433` committed ALONE as `f95f7ae6` — QE1–QE22 as answered (QE16 amended), §0, the key `module.manage`, amendments A1–A4 each quoted in full. Next: Task 0.4 (records), then Task 1. Ledger `2026-11-01p`. No code. |
| 2026-11-01 | v1.5 | BigDev at Task 0.2 (verbatim): *"rest of the QEs as recommended"* — QE1, QE2, QE4, QE5, QE8, QE10–QE15 and QE18–QE22 ACCEPTED as recommended (QE16 as amended in v1.4). Task 0.2 ticked; every QE answered; the QE section heading now reads ANSWERED. Next: Task 0.3 (author-commit ≥ `-433`, ALONE), Task 0.4 (records). Ledger `2026-11-01o`. No code. |
| 2026-11-01 | v1.4 | BigDev at Task 0.2 (verbatim): *"QE16 needs the strict base64url validation amendment before the implementation begins. QE3, QE6, QE7, QE9, QE17 AS RECOMMENDED."* The five ASKs are marked ANSWERED as recommended (QE3 (A), QE6 (A), QE7 (A), QE9 / QE17 confirmed; the Task 0.3 map not triggered); the other sixteen recommendations still await acceptance (Task 0.2 left unticked). QE16 AMENDED: a STRICT base64url decode in five ordered steps — URL-safe alphabet only, no padding / whitespace, length 1–256 and `% 4 !== 1`; a canonical re-encode round-trip; fatal UTF-8; a plain object with exactly `c` / `m` (both strings) whose text equals its canonical `JSON.stringify` (duplicate keys rejected) — each on Node v22 behaviour verified in session; encoder pinned (no padding). AC8, TR25 and the `read-cursor.test.ts` vectors follow it. Ledger `2026-11-01n`. No code. |
| 2026-11-01 | v1.3 | Third validate pass (three read-only verifiers at `36b489c9`; 6 critical / 15 should-add / 15 nits — ALL applied on BigDev's "all"; then a fresh-context review of the PATCH diff found 16 defects the edits introduced (I10 grep unpassable as worded, Task 10 grep list, G13 twin misquote, stale `baseline_commit` / G heading, Row 26 (a) is a closure criterion not an option, no error class for the publish not-found pre-check, RPD4's I6 leg, the QE7 answer map, 22009, the test-heading count rule, two more stale `pariwar_id` comments, and wording) — all fixed; overlong lines left as is). Branch REBASED from `3d6b46c5` onto `36b489c9` (38 commits; 11b.5a landed; ledger-only conflicts). **Critical:** ledger `g` → `m` (13-2 took `g` 3 min before v1.2); Task 0.4 mints NO fourth closure label (`-210` cl.2) — built legs get a dated status line, Task 10 closes LEG by leg, RPD4's grep legs + D10-1.4's `partners/` leg deferred, `role`/`cohort` stays "Not addressed"; QE20's ADR-0044 amendment covers D5 sentence 2 + Consequences + Alternatives; the sweep's roster dependence is Row 26 `jobs-db-role` (NOT Row 24 (b)) — `canReadAcrossPariwars` guard + a dated Row 26 note; G18 — four eligibility statuses have no member (no `lock_in_expired` producer) — wizard notice, `pending-valid` relabelled, carried to 12.3; cursor range-checked in JS (shape-valid out-of-range values answered 500). **Should-add:** NUMBERS refreshed (`-432` / `0194` on main; v57 contested by three, key count LIVE); `ScopeFilterV1Schema`; `try` opens right after `openScopeTx` (TR22); paging specs in a fresh Pariwar; exported `activateDueModule`; withdraw body `{}`; `-429` C11 AMENDED (not "read"); the unlisted-district sentence; QE6 (A) re-trigger adds the first production publish (deed 20(i)), (B) quotes ¶B.5; Task 0.3 map completed (QE6 (B), QE3 / QE7 dependants, FOUR indexes); `schema/marketplace_modules.ts` edits; `⛔` removed from Policy meaning / Names; Policy-meaning strings pinned in AC11 / Task 8.2 / tests; a super admin must hold a grant IN the Pariwar; publication cleanup order; FK actions `NO ACTION`. **Nits:** G13 callback, `storableText` kept, RI-check xmin wording, scope `at`, `mapModuleError` rethrows unchanged, QE21 drift cost, cross-Pariwar publish 404, `-103` status, §0 edge 4 verbatim, variances, carried homes, `events.test.ts` / I10 tests, RVD5 split, G9 optional fields, 6-39 numbers relative. |
| 2026-11-01 | v1.2 | Re-validated by three read-only verifiers (facts; DB / transaction feasibility; coverage + governance); every finding applied. **Critical:** plain-word negations throughout ACs / Invariants / Tasks / Dev Notes (the glyph register now confines `⛔` to G / QE prose); Task 0.4 uses "Homed in Story 12.2 (QE-n)" and Task 10 flips each to "Closed by `<sha>`"; ledger relabelled `2026-11-01c` → `g` (c–f committed first on 13-2 / 14-3 / 6-22) and the NUMBERS block refreshed (the merge-order migration rule withdrawn — `-415` was a one-off). **Design:** NEW `pageModulesForPariwar` (12.1 `listModulesForPariwar` + `read.spec.ts` untouched); cursor validated in JS before SQL; `partner_id` `.uuid()` in the DTO (TR19); partner-name parse as a PURE pre-check; five named 12.2 error classes + `ModuleStateDirectWriteError` in the QE18 table; `authored_by_viewer` in the detail DTO; null-author publish denied (I4, TR21); `displayOf` NOT copied, display names via `getDisplayName` with a fallback; sweep `mutate` = `withPariwarScope` (no `closeScopeTx` in jobs) and skip writes two audit lines; scope pre-check ordering (`safeParse` first); response schemas required for the pagination gate; five-index list; negative `twt_service` grant leg; migration lock levels; AC8 split into API + domain-live legs; own-id assertions + partner seeding in every new spec (TR20). **Records:** QE6 amends `-427` QE5 as well as `-429`; the later deed objects draft v4 (no "disclosed") recorded; ADR-0044 D5 amended in part / D2 clarified (QE20); QE9 grounded on ADR-0019 with `-422` Q1 A disclosed as a contrast; the C11 no-tree reading recorded; Policy meaning reach line + Niyamavali carry-over reason; C12, C2 (d)/(e) + cost, D10-1.4 legs, tone-checklist routing row added to Task 0.4; new carries (§3.7 redaction → 12.5, partners cap, district rename residual, narrower-grant condition, single-admin); variances (CTA destination, admin step-up stub); UI strings made verbatim (opening line, single-admin, members-cannot-see-yet; tick text covers checklist §5). Fact fixes: checklist has five sections; `withCompensatingAudit` defined in the domain; 0007 login is a provisioning comment; `z.literal(true)` precedent = memorial `calledBack`; helper sources per spec; `adminStepUpDelivery`; five 12.1 specs; second `PartnerId` comment. |
| 2026-11-01 | v1.1 | Validated by three read-only verifiers (facts; DB / transaction feasibility; coverage + governance); every finding applied. **Design:** the activation tick moved OUT of the domain (`-427` QE15 — the domain keeps SELECT + classify only), runs under the jobs service login with a `twt_service` SELECT, UPDATE grant (⛔ `SET LOCAL ROLE`), DB `now()` scan, `OutsideWindow` → skipped; COMMIT placed INSIDE `mutate` (memorial twin — the questionnaire twin commits after); publish pre-read on the WRITE transaction (one `now()`); composite FK for publications (+ `(pariwar_id, module_id)` unique); case-insensitive partner-name unique; cursor on exact `created_at::text`; QE12 as WRITE-ONLY schemas (the shared ones feed the genesis payload + fold) with a Devanagari-LETTER rule; exact-match scope check (the 200-district cap); partner-agreement tick (the UX activation gate); shape-only DTOs; key namespaces; forced-pagination gate; G17 spec breakages enumerated; access-wrapper roots directories only + split. **Records:** QE21 (RVD2), QE22 (RPD4), RPD1 under QE12, QE6 amends `-429` explicitly, §0 edge 4 re-anchored on OQ-4, ADR-0019 ratified, revise event "Resolved via explicit deferral", Task 0.3 non-recommended-answer map. Migration ≥ `0195`. |
| 2026-11-01 | v1.0 | Created by `bmad-create-story` at `3d6b46c5` in its own worktree; four read-only researchers; QE1–QE20 proposed (five ASKs); row backlog → ready-for-dev; ledger `2026-11-01c`. |
