---
baseline_commit: b2f36fe9
---

<!--
PINNED: `b2f36fe9` = `origin/main` (2026-10-31k, the rows 3-13 / 3-14 landing). The story lives on branch
`story/12-1-module-manifest-schema-module-lifecycle-state-machine` in its OWN worktree
(`.claude/worktrees/12-1-module-manifest-schema-module-lifecycle-state-machine`). The branch was fast-forwarded
`4e57fa42 → 01062c51 → b2f36fe9` and has no commits of its own; the last hop was records and governance only (`git diff --stat
01062c51 b2f36fe9 -- apps packages scripts docs/adr` is empty). Every `apps/` / `packages/` / `scripts/` claim below was traced
at the pin on 2026-10-31 and re-checked by three read-only verifiers. It is perishable: re-check at Task 0.1. Re-locate by
FUNCTION, ⛔ by line.

STATUS: ready-for-dev (2026-10-31 — v1.1: created v1.0, then validated by three read-only verifiers (facts against the repo;
disaster-prevention against the helpdesk / pool / alert twins; coherence + LLM optimisation), all 19 improvements applied.
Committed at `62416719`; ⛔ pushed. QE1–QE15 ANSWERED 2026-10-31 — all as recommended (Task 0.2), recorded by author-commit `2026-10-31-427` (`a22dbdec`, alone — Task 0.3). Task 0.4's records DONE 2026-10-31 (`deferred-work.md` section with C1–C8 + the QE5 / QE9 / QE11 deferrals; "⭐ INHERITED FROM 12.1" notes in `epics.md` under 12.2–12.6) ⇒ **Task 0 is COMPLETE**; the build may start.)

GLYPH REGISTER: ⛔ NEGATES the word or phrase it precedes (before an already-negative word it is emphasis: "⛔ never");
⭐ = action / emphasis; ⚠ = hazard. ⭐ In ACs, Invariants, Tasks and Traps, negations are written in PLAIN WORDS ("No …",
"Do NOT …") so that a skim cannot invert them.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. They are
newest-first files; cite the decision id + clause, the item heading, or the row key instead. Line numbers into other files
are perishable hints; re-locate by function.

NUMBERS, re-checked 2026-10-31 on every branch and worktree. Rule (`-366` decision 6): "the number belongs to the first COMMIT
that takes it on any branch". For migrations `-415` follows `-332` d2: the number follows the MERGE order.
- Decisions: `-424` is the highest on `origin/main` (also on `story/11b-5a-…` and `governance-lock-in-gap-rows`). `-425`
  exists only on LOCAL `story/6-38-…`; `-426` is held UNCOMMITTED in the `11b-5a-…` worktree. ⇒ `-427` is TAKEN here
  (`a22dbdec`); any further decision takes ≥ `-428`.
- Migrations: highest `0192_questionnaire-versions` (journal `when` 1796182800037; recent entries step by 86400001) ⇒ this
  story takes ≥ `0193`, `when` ≈ 1796269200038, GREATER than every sibling's.
- ADRs: highest `ADR-0043` ⇒ this story takes ≥ `ADR-0044`.
- RBAC: `PERMISSION_CATALOG_VERSION = 56` ⇒ this story does not change it (I7).
- Ledger: `2026-10-31a`–`o` are taken elsewhere; `p` (creation), `q` (Task 0.2 / 0.3) and `r` (Task 0.4) are taken here ⇒
  next free ≥ `2026-10-31s`.
- Roster: no row (nothing member-visible ships).

⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each. `story/6-38-…` and `story/11b-5a-…` are live
and may take `0193` / `-426` first.

LETTERS: G = found facts (traced at the pin) · QE = build decisions · I = invariants · TR = traps · C = carried to a
sibling story.
-->

# Story 12.1: Module Manifest Schema + Module Lifecycle State Machine `[PRIMITIVE]`

Status: ready-for-dev

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

The **sixth** event-derived-state primitive, after member (3.1), claim (6.1), pool (7.1), alert (8.1) and helpdesk (10.1).
It stores a partner **module** — an HDFC home-loan, LIC term-plan or health-camp offer that a Pariwar shows its members — as
an immutable, bilingual **manifest**. The manifest records:
- who the partner is and what the offer says;
- the rules for who may see it;
- its dates and how many places it has;
- where leads go, and which Secret Manager secret signs them.

It also gives the module a lifecycle `draft → scheduled → active → archived`, derived **only from `events_log`**. Five events
drive it — `module.authored`, `module.scheduled`, `module.activated`, `module.lead_submitted`, `module.archived` — and ONE
projector writes them. A DB trigger and an AST gate guard that projector, exactly as they do for `helpdesk_tickets`.

It builds **no** route, UI, shelf, filter evaluator, webhook, cron, permission key, consent type or audit wrapper call;
those belong to 12.2–12.6. **Nothing reaches a member from 12.1 alone** (I6). The three lead rules in Policy meaning are fixed
here, and members feel them once 12.3 ships.

## ⭐ Names at a glance

| Thing | Name |
|---|---|
| Namespace / folder | `marketplace` — `packages/domain/src/marketplace/` |
| Table / drizzle export | `marketplace_modules` / `marketplaceModules` (`packages/domain/src/schema/marketplace_modules.ts`) |
| Enums (domain tuples → pgEnums) | `MARKETPLACE_MODULE_STATES` → `marketplace_module_state`; `MARKETPLACE_MODULE_ARCHIVE_REASONS` → `marketplace_module_archive_reason` |
| Guard session var | `app.marketplace_module_state_writer` |
| Trigger fn | `marketplace_modules_reject_unguarded_state_write()` |
| Lead uniqueness indexes (on `events_log`) | `module_lead_member_uq`, `module_lead_id_uq` |
| Migration | `packages/domain/migrations/0193_marketplace-modules.sql` (≥, re-grep) |
| Projector fns (the only writers) | `projectModuleGenesis`, `projectModuleTransition` (`marketplace/project.ts`) |
| Commands (public write entry points) | `authorModule`, `scheduleModule`, `activateModule`, `submitModuleLead`, `archiveModule` (`marketplace/commands.ts`) |
| Pre-check | `checkModuleLeadAllowed` |
| Brands | `ModuleId`, `PartnerId`, `ModuleLeadId` |
| Gate | `scripts/marketplace-module-state-invariant/` · scripts `marketplace-module-state:{check,test}` |
| ADR | `docs/adr/ADR-0044-module-manifest-schema-versioning.md` (≥, re-grep) |
| Author-commit decision | `2026-10-31-427` (TAKEN, `a22dbdec`) |

## Story

As **Solo Builder authoring the marketplace primitive**,
I want **a module manifest schema + lifecycle state machine consuming Story 1.3's event log primitive**,
so that **every module is event-derived, audit-replayable, and lifecycle-traceable.**

## 📜 Policy meaning (AI-10-1)

**This story introduces NO predicate that decides which members SEE a module.** It stores the eligibility and scope rules
as data and evaluates none of them. Evaluating them is Story 12.3's job, and 12.3 owes its own Policy meaning note.

**It DOES introduce three predicates that gate a member's ability to register interest (a lead) in a partner offer.** All
three sit in the lead-submission command (QE7, QE8).

*In a member's terms:* **"You can register interest in a partner offer only while it is open (live and within its dates).
Once every place on it is taken, nobody else can register. And you can register interest in each offer only once."**

**Checked against the Niyamavali.** Grepped 2026-10-31: the git-ignored copy in the main checkout, `docs/legal/niyamavali.md`,
for `partner|commercial|advertis|insurance|loan|marketplace|LIC|HDFC|third part|share.*data|lead|camp`, plus the Hindi
साझेदार|पार्टनर|विज्ञापन|बीमा|ऋण|मॉड्यूल.

**Result: SILENT.** The Niyamavali has no clause on partners, modules or leads. The nearest clauses are not engaged, because a
lead is not a benefit the Trust owes:
- §1.2: "facilitator of mutual aid, not a guarantor, insurer, or financial intermediary".
- Part 10: consent "for specified purposes".

The draft trust deed's Clause 7.2(i) requires partner arrangements to "not compromise the interests of members". Places that
are counted exactly (I5) and taken once per member (QE8) are consistent with that. ⇒ **No conflict; nothing to route.**
(⚠ The Niyamavali is a rulebook, not a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Verbatim | Status |
|---|---|---|
| epics.md Story 12.1 AC | "state is event-derived per Story 3.1, 6.1, 7.1 pattern; persisted state column never directly UPDATEd" | epic text |
| epics.md AR-14 | "state derived from event history; persisted state is optimization only. Transitions emit `from_state`, `to_state`, `trigger`, `actor`, `timestamp`, `pariwar_id`." | epic text |
| PRD FR-64 | "A module is described by a manifest: `{module_id, title, description, eligibility_filter, scope_filter, valid_from, valid_until, slot_capacity?, target_url_or_form, partner_id, commission_terms (private)}`." | PRD |
| PRD §4.9 Out of Scope v1 | "Partner self-service portal — v2. - Cross-Pariwar partner manifest — v2." | PRD |
| architecture §3.7 | "lead contracts are per-Pariwar (TWT-Bihar's HDFC contract ≠ future Rail Parivar's HDFC contract); contract storage scoped by `pariwar_id`." | architecture |
| Decision `2026-08-13-103` D8 (Story 1.19) | "`role`/`cohort` are recorded "Not addressed", and ⛔ NO successor is minted … ⛔ **Story 12.2 is not the owner** either — it *consumes* a role/cohort filter but does not **own** the attribute." Re-trigger: "the first surface that must target members by `role` or `cohort` … ⛔ Do not mint a successor before a live requirement attaches." | ratified (author) |
| Decision `2026-08-21-147` cl.3 (Trustee-ratified) | "Any future change that introduces a new **source/reason** for account-frozen must re-examine the directory exclusion predicate and the ratified member-facing sentence" | ratified — not engaged (I8) |
| Decision `2026-09-08-210` cl.2 (Trustee-ratified) | NOT delegated: "anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key · … · ⛔ any status whose meaning reaches a **member**." | ratified — see §0 edge 6 |
| UX spec "Module Shelf Partner Brand Integration" | "partner colors are NOT applied to card backgrounds, CTAs, or surrounding chrome." | UX — carried (C5) |

### §0 — whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` §0, applied per edge)

| # | Edge | Verdict |
|---|---|---|
| 1 | Package location (`packages/marketplace` vs `packages/domain/src/marketplace/`) | **Yours** — this is "which implementation is correct". See QE1. |
| 2 | Event-name spelling (`module.lead-submitted` vs `module.lead_submitted`) | **Yours** — a naming question. See QE3. |
| 3 | `pariwar_id` NOT NULL in v1 (the epic says nullable, for cross-Pariwar) | **Yours** — the PRD already puts the cross-Pariwar manifest in v2. See QE4. |
| 4 | One place per member per module | **Yours, confirm with BigDev.** This is partner place accounting, not something the Trust owes. Stripped of citations it reads "should a double tap count twice?" See QE8. |
| 5 | Sharing member data with partners — the privacy policy's §6 recipient list names no partners | **Panel / counsel's, but not 12.1's.** 12.1 sends nothing to anyone. Carried to 12.3 / 12.5, which must raise it **before** anything leaves (C6). |
| 6 | New enums (`module_state`, `archive_reason`) and `-210` | **Not engaged.** `-210` governs ADDING values to an existing tracking vocabulary. This is a new primitive's vocabulary, authored from the epic text and recorded in the author-commit (Task 0.3), as 10.1's lifecycle set was. Any LATER value added to it IS `-210`-shaped and reaches members, so it is not delegated. |
| 7 | `account-frozen` / grief suppression | **Not 12.1's.** 12.1 adds no freeze source (I8). The overlay lifting on settle is 12.4's problem (C4). |

## FOUND FACTS (G) — traced at `b2f36fe9`

- **G1 — There is no per-primitive package. The epic's `packages/marketplace` is the same misnamed home that Story 3.1
  refused.**
  - All five existing primitives live in `packages/domain/src/<area>/` and are exported as namespaces from
    `packages/domain/src/index.ts`, e.g. `export * as helpdesk from './helpdesk/index.js'`.
  - Story 3.1's file: "The epic AC text says author in `packages/member-lifecycle`. **Do NOT create that package.**"
    Story 3.3a did the same for `packages/digilocker`.
  - Five structural forces keep the schema, reducer and projector in domain:
    - `drizzle.config.ts` reads only `./src/schema/*.ts` and `./src/policies/*-rls.ts`.
    - Every `*-state-invariant` gate has `SCAN_ROOT = 'packages/domain/src'`.
    - `domain-accessor-invariants` scans only `packages/domain/src`.
    - `@twt/events` depends on `@twt/domain`, so projectors insert into `events_log` directly (see the `helpdesk/project.ts`
      header).
    - `packages/events/src/registry.ts` imports payload schemas from `@twt/domain`.
  - Architecture never lists `packages/marketplace`. It maps §4.9 to `apps/api/src/modules/{modules-shelf,partner-leads}`
    and `packages/contracts/src/{modules,partners}/`. Both contracts folders already exist as README-only placeholders.
- **G2 — The closest twin is helpdesk (10.1, migration `0084_helpdesk-tickets-and-routing-policy.sql`).**
  - **Columns:** `current_state` (pgEnum) and `state_event_version bigint {mode:'number'}`.
  - **Trigger:** `helpdesk_tickets_reject_unguarded_state_write()`, `BEFORE INSERT OR UPDATE`, guarded by
    `current_setting('app.helpdesk_state_writer', true)`. It checks the genesis state on INSERT and requires
    `state_event_version` to be strictly monotonic.
    - ⚠ It checks ONLY `current_state` / `state_event_version`. A literal copy leaves this story's other projected columns
      unguarded (TR10).
  - **Privileges and RLS:**
    - `GRANT SELECT, INSERT, UPDATE … TO twt_app` (no DELETE).
    - RLS ENABLE + FORCE.
    - Separate select / insert / update policies. `for:'all'` is avoided because it would bring DELETE in.
  - **Projector:** `helpdesk/project.ts` `projectTicketGenesis` / `projectTicketTransition`. It:
    - takes `client: pg.PoolClient` and `auditId: string`;
    - loads and replays the stream;
    - parses the payload with `.strict()`;
    - inserts into `events_log` at max+1;
    - runs `SET LOCAL app.helpdesk_state_writer = 'on'` → write → `'off'` in a `finally`.
  - **Gate:** `scripts/helpdesk-state-invariant/{check,lib,lib.test}.ts`. ⚠ It has **no README**; the pool / alert /
    member / claim gates do.
    - The allowlist is per file AND per function.
    - `MIN_EXPECTED_FILES = 50` is a local const in `check.ts`.
  - **Wiring:** root `package.json` `helpdesk-state:{check,test}`; a standalone `.github/workflows/ci.yml` job (no aggregate
    `needs:` list to update); a `run` line in `scripts/ci-local.sh`.
- **G3 — Reducer framework.**
  - `packages/domain/src/state-machine.ts` provides `defineStateMachine({initial, reduce, transitions?})`. Its header says
    the framework "is PURE … and stays so". Do NOT edit it.
  - `transitions` is "documentation-only — runtime authority is `reduce`". `fold` returns the state STRING only.
  - Reducers are pure, deterministic and **total**: an inapplicable or unknown event returns the same state and never
    throws.
  - `alert/state.ts` uses a pre-genesis `initial: 'draft'`.
  - `helpdesk/state.ts` `nextTicketState` returns the **unchanged state** for an illegal pair. The projector then throws
    when `toState === fromState`, which is fatal for a same-state event (TR1).
  - The bridges `toAlertEvent` / `toHelpdeskEvent` are private functions.
  - Same-state events with a version bump already exist: the member "NON-TRANSITION MARKER" in `member/events.ts`.
- **G4 — Event names are single-dot snake_case for a primitive family.**
  - `pool/events.ts` carries a "PINNED SEAM" reconciling the epic's `pool.opened-for-contributions` to
    `pool.opened_for_contributions`.
  - `helpdesk/events.ts` and `alert/events.ts` state the same convention in an "Event-name delimiter" header.
  - `registry.ts` has 86 entries and no `module.*`. Its import line is `import { alert, claim, contribution, helpdesk,
    member, pool, reconciliation } from '@twt/domain'`. No test asserts the registry's size.
  - **Audit actions cannot contain a hyphen**: `audit/write.ts` uses the regex `/^[a-z0-9_]+(\.[a-z0-9_]+)+$/`.
- **G5 — `events_log.pariwar_id` is NOT NULL** (`schema/events_log.ts`). Its RLS policy (`0002_events-log-rls.sql`) is
  `FOR ALL` with `withCheck pariwar_id = app.pariwar_id`, so every append needs the Pariwar scope set.
- **G6 — Secret Manager references are stored as `<thing>_secret_name text`, holding a NAME.**
  - Examples: `pariwar_wa_config.access_token_secret_name`, `pariwar_telegram_config.bot_token_secret_name`.
  - The schema comment: "a NAME is not a secret, so this column is plain `text` (NOT piiColumn)".
  - Resolution is `resolveSecretValue` (`domain/src/secrets.ts`). No column anywhere is named `*_key_ref`.
  - ⚠ The epic attributes this to "Story 1.5", but 1.5 is KMS / Tink PII encryption. Secret Manager is AR-13 /
    architecture §5.9.
- **G7 — `module_id` already exists UNBRANDED, waiting for this PR.**
  - It appears in `helpdesk_tickets.module_id` (`schema/helpdesk_tickets.ts`) and `ProjectTicketGenesisInput.moduleId`
    (`helpdesk/project.ts`). One comment covers BOTH `module_id` and `validity_lookup_id`: "deliberately NOT branded … Brand
    on the first PR that builds the owning primitive."
  - The API passes a raw string: `apps/api/src/modules/helpdesk/handlers.ts`
    `moduleId: body.module_id ?? null`. The `poolId` line beside it is the branded pattern:
    `body.pool_id ? ids.poolId(body.pool_id) : null`.
  - Other seams: alert category `module_new {module_id, module_title}`; deep link `resource:'modules'`; helpdesk category
    `partner-module-issue`.
- **G8 — `branding_bundle` / `BrandingBundle` already means PARIWAR branding** (`schema/pariwar_passport.ts`, migration
  0003). Do NOT reuse that name for a module type.
- **G9 — Audience vocabulary precedent.**
  - `BANNER_AUDIENCE_SCOPES = ['public', 'members-all', 'state', 'role', 'cohort']` (`schema/banners.ts`) and News/Blog
    (`news-blog/audience.ts`) both DECLARE `role` / `cohort` and resolve them to the EMPTY set with a logged note.
  - `state` resolves via `districtsBeneathState(tree, stateValue)` (`member-geo/resolve.ts`). A member's district comes
    from their newest `member_postings` row.
  - Comparison is byte-identical (no case-folding). `block` is "⛔ NEVER" resolvable.
  - An empty audience means "no audience", never "all".
- **G10 — A member's date of birth is Tier-1 ciphertext** (`member_kyc_profiles`, `piiColumn(1, …)`). An age-band
  eligibility rule cannot be evaluated without decrypting Tier-1 data on the shelf path.
- **G11 — The `account-frozen` overlay is BUILT**, in `member/overlay.ts`:
  - `ACCOUNT_FREEZE_EVENT_TYPE = 'claim.intake_initiated'`;
  - unfreeze on `claim.settled | claim.denied_no_appeal | claim.closed`;
  - `getMemberAccountOverlay`, which has **zero production call sites**.

  ⚠ The overlay **lifts** on settle / deny (Decision `2026-09-20-233`) and on close (`claim.closed` was added by
  `2026-10-07-292` RF4).
- **G12 — Audit pairing is the CALLER's, never the domain's.**
  - `audit.withCompensatingAudit(pool: pg.Pool, { auditIntent, mutate: ({ auditId }) => … })` (`audit/compensating.ts`)
    takes the SERVICE pool. It commits its intent line in its own transaction and writes `<action>_rolled_back` if `mutate`
    throws.
  - No domain primitive calls it; only a comment mentions it. The twin is `apps/api/src/modules/helpdesk/handlers.ts`:
    `audit.withCompensatingAudit(deps.servicePool, { auditIntent, mutate: async ({ auditId }) =>
    helpdesk.projectTicketGenesis(scopeTx.client, { …, auditId }) })`.
  - Why a refusal must not run inside the wrapper (`wa-opt-in/code.ts` header): "a refusal thrown inside
    `withCompensatingAudit` would write an intent line + `_rolled_back`". That is two rows on the global hash chain, under
    its global advisory lock.
  - Domain specs pass `auditId: randomUUID()`.
  - `audit_id` is a plain uuid with no FK. It is NOT NULL on helpdesk and nullable on pools / alerts, and **genesis-only**
    in all three: no twin refreshes it on transition.
- **G13 — Migrations are HAND-AUTHORED.**
  - The drizzle snapshot baseline is frozen at 0020. `0084`'s header says "⚠ DO NOT REGENERATE with `db:generate`".
  - Statements are separated by `--> statement-breakpoint`.
  - The journal entry is hand-added to `meta/_journal.json`; keep the trailing newline.
- **G14 — Live-DB harness (all paths under `packages/domain/`).**
  - `src/test-utils/integration-setup.ts` provides `setupLiveDb`, `getTx` (a per-test transaction, rolled back) and
    `hasDatabase`. Suites use `describe.skipIf(!hasDatabase)`.
  - Helpers are in `tests/integration/_helpers.ts` (`PARIWAR_A`, `enterAppScope`).
  - `vitest.config.ts` includes `tests/**/*.test.ts` and `tests/integration/**/*.spec.ts`.
  - `@twt/domain` is already in the integration `--filter` list in `ci-local.sh` / `ci.yml`, so no config change is needed.
  - ⚠ The REPO-ROOT `tests/integration/` is a placeholder that no workspace runs. The AI-10-5 guard greps only
    `packages apps`, so a spec placed there would run nowhere, silently.
- **G15 — The concurrency and lock precedents.**
  - The genesis race: `alert-stream-concurrency.spec.ts`. Each connection runs `BEGIN; SET TRANSACTION ISOLATION LEVEL
    REPEATABLE READ; SET LOCAL ROLE twt_app; setPariwarScope; SELECT max(event_version) …`, then waits at a barrier. The
    specs own their commits (a separate `pg.Pool`) and clean up via `session_replication_role='replica'`.
  - The SAVEPOINT retry: `reconciliation/reconciliation-review-write.ts` (`SAVEPOINT …` / `ROLLBACK TO SAVEPOINT` /
    version-conflict check / backoff / `continue`), under the default READ COMMITTED. Nothing in `packages/domain/src` or
    `apps/api/src` sets an isolation level.
  - The lock-before-guard convention: `docs/domain-accessor-invariants.md` family (c), "Either `SELECT … FOR UPDATE` the row
    before the guard, or …".
- **G16 — Payload-expression indexes on the shared `events_log` already exist.**
  - `0079`: `CREATE UNIQUE INDEX "contribution_utr_attested_tr_uq" ON "events_log" ((payload ->> 'tr')) WHERE event_type =
    'contribution.utr-attested';`.
  - `0081` has a partial expression index, and `0185` has generated columns.
  - `0185` notes that a non-`CONCURRENTLY` build takes a SHARE lock on `events_log`, and that under RLS a JSON-expression
    predicate is not usable as an index condition.
- **G17 — There is no `pariwars` table** (only `pariwar_passport` / `pariwar_wa_config` / `pariwar_telegram_config`).
  - The twin migrations (`0071`, `0078`, `0084`) carry no tenant FK; tenancy is enforced by the RLS `withCheck`.
  - Helpdesk specs use `PARIWAR_A` without seeding a passport.
- **G18 — The ADR slot exists, and nothing in governance gates Epic 12.**
  - The slot: `docs/knowledge-transfer/adr-index.md` row `ADR-NNNN-module-manifest-schema-versioning`, "Story 12.1 …
    closure", `slot-reserved-pre-write`.
  - No decision, routing note, deferred item or roster row defers or gates the marketplace. The only open item pointing at
    Epic 12 is 1.19's role / cohort "Not addressed", which points at **12.2**.

## ⚖️ Build decisions QE1–QE15

> ⭐ Each QE is an author decision under §0. The four marked **ASK** go to BigDev at Task 0.2. All of them are recorded in
> ONE author-commit decision entry at Task 0.3, BEFORE any code.

- **QE1 — Home: `packages/domain/src/marketplace/`. Do NOT create `packages/marketplace`.**
  - Basis: G1, and the 3.1 / 3.3a precedent ([[feedback_no_premature_package]]). Export with `export * as marketplace from
    './marketplace/index.js'`.
  - Tables go in `packages/domain/src/schema/`, RLS in `packages/domain/src/policies/`.
  - No contracts in 12.1. Architecture: "`packages/contracts/src/<domain>/` exists for **externally-consumed API surfaces**
    only", and 12.1 has no route. 12.2 / 12.3 add `packages/contracts/src/modules/` with the sync-guard test.
- **QE2 — Names:** see "Names at a glance".
  - Brands use `uuidBrand` in `ids/index.ts`; ids are lower-case ([[project_branded_ids_lowercase]]).
  - The TS row type is `MarketplaceModule`. The branding type is `ModuleBrandingBundle`, not `BrandingBundle` (G8).
  - The stream id is `module_id`.
- **QE3 — Event types:** `module.authored`, `module.scheduled`, `module.activated`, `module.lead_submitted`,
  `module.archived`.
  - This follows the single-dot snake_case convention for primitive families (G4).
  - The epic's `module.lead-submitted` is reconciled in a "PINNED SEAM" comment in `marketplace/events.ts`, copied from
    `pool/events.ts`.
  - Audit actions use the same strings, which already satisfy the audit regex.
- **QE4 — `pariwar_id uuid NOT NULL`, with no FK** (G17; tenancy is enforced by RLS). Do not make it nullable:
  - the PRD puts the cross-Pariwar manifest in v2;
  - architecture §3.7 scopes contracts by `pariwar_id`;
  - `events_log.pariwar_id` is NOT NULL (G5).

  A nullable column would ship an affordance v1 can never write. Re-trigger: the v2 cross-Pariwar manifest. It will need its
  own rule for which tenant owns the stream; `feature_flag_versions.ts` shows the three carve-outs a NULL tenant forces.
- **QE5 — Manifest fields (the epic list reconciled with FR-64):**

  | Column | Type / rule | Note |
  |---|---|---|
  | `module_id` | uuid PK, no default; **caller-minted**, passed into `authorModule` (QE15) | stream id |
  | `pariwar_id` | uuid NOT NULL, no FK | QE4 |
  | `partner_id` | uuid NOT NULL, `PartnerId`, no FK | No partner registry exists; partner identity is 12.2's step (a). Mirrors pool `cycle_id` unFK'd ([[project_pool_primitive_substrate]]). |
  | `name_en`, `name_hi` | text NOT NULL, trimmed length 1–120 | both locales required (FR-64 `title`) |
  | `description_en`, `description_hi` | text NOT NULL, trimmed length 1–2000 | FR-64 `description` |
  | `eligibility_filter` | jsonb NOT NULL — `EligibilityFilterV1` (QE9) | |
  | `scope_filter` | jsonb NOT NULL — `ScopeFilterV1` (QE9) | |
  | `valid_from`, `valid_until` | timestamptz NOT NULL; `CONSTRAINT marketplace_modules_window CHECK (valid_until > valid_from)` | |
  | `slot_capacity` | integer NULL; `CONSTRAINT marketplace_modules_capacity_positive CHECK (slot_capacity > 0)`; NULL = uncapped | FR-64 `slot_capacity?` |
  | `slots_remaining` | integer NULL; `CONSTRAINT marketplace_modules_slots_pair CHECK ((slot_capacity IS NULL) = (slots_remaining IS NULL))`; `CONSTRAINT marketplace_modules_slots_range CHECK (slots_remaining >= 0 AND slots_remaining <= slot_capacity)` (NULLs pass; the pair CHECK covers them) | **projected** |
  | `lead_handoff_url` | text NOT NULL; `https:` only, no userinfo, ≤ 2048 | partner endpoint (delivered by 12.5) |
  | `lead_handoff_signing_key_secret_name` | text NOT NULL; `^[A-Za-z0-9_-]{1,255}$` | renamed from the epic's `lead_handoff_signing_key_ref` to the repo convention (G6). Holds a Secret Manager NAME, never key material. |
  | `branding_bundle` | jsonb NOT NULL — `{ version: 1, logo_object_key: string \| null, accent_color_hex: /^#[0-9a-f]{6}$/ \| null }`, `.strict()` | C5 |
  | `manifest_schema_version` | smallint NOT NULL; `CHECK (manifest_schema_version = 1)` | QE11 / ADR |
  | `current_state` | `marketplace_module_state` NOT NULL | **projected** |
  | `state_event_version` | bigint NOT NULL | **projected** |
  | `archive_reason` | `marketplace_module_archive_reason` NULL; `CONSTRAINT marketplace_modules_archive_reason_pair CHECK ((current_state = 'archived') = (archive_reason IS NOT NULL))` | **projected** (CHECKs see the final row; the archive UPDATE sets both columns in one statement) |
  | `audit_id` | uuid NOT NULL, no FK — the audit line of the **most recent** transition | ⚠ Unlike the twins (genesis-only, G12), the projector SETs it on every transition, so it is projector-written (I1). |
  | `created_at` | timestamptz NOT NULL default `now()` | immutable |
  | `updated_at` | timestamptz NOT NULL default `now()`; SET to DB `now()` by the projector on every transition | projector-written (twin posture) |

  Indexes: `marketplace_modules_pariwar_id_idx (pariwar_id)` and `marketplace_modules_pariwar_state_idx (pariwar_id,
  current_state)` (the `0084` twin).

  **Deliberately NOT in 12.1:**
  - **`commission_terms` → 12.2.** It is the private commercial term the PRD says is "**never** public", and its shape is
    OQ-4, still open (Trustee Panel + partners). Storing it on a row that member-facing reads will select invites a leak;
    12.2 chooses an admin-only home. **ASK (BigDev): confirm this deferral.**
  - **FR-64's `target_url_or_form` / an external-URL CTA.** The epic resolved the CTA to an in-app interest form (12.3)
    plus a webhook (12.5). An external-URL CTA is **Not addressed**. Re-trigger: the first partner whose contract requires
    sending the member to the partner's own page.
  - **Lead delivery status** (`delivered | pending_retry | failed_delivery`, architecture §3.7) → 12.5's lead entity.
  - **`module.restored`** → 12.6 (C3).
- **QE6 — The lifecycle.** All arms are authored here. 12.1 ships one command per event, called from tests only (I6).

  | From | Event | To | Command guard (DB `now()`, never the app clock) | Failure |
  |---|---|---|---|---|
  | — | `module.authored` | `draft` | stream empty (genesis); manifest valid | `ModuleGenesisAlreadyExistsError` / `ModuleManifestInvalidError` |
  | `draft` | `module.scheduled` | `scheduled` | `now() < valid_from` | `ModuleOutsideWindowError` |
  | `draft` / `scheduled` | `module.activated` | `active` | `valid_from ≤ now() < valid_until` | `ModuleOutsideWindowError` |
  | `active` | `module.lead_submitted` | `active` (**same-state**) | QE7 / QE8 | see QE7 / QE8 |
  | `draft` / `scheduled` / `active` | `module.archived` | `archived` | the reason's rule (below) | `ModuleArchiveReasonNotSatisfiedError` |

  An event from any other state throws `ModuleIllegalTransitionError`. `archived` is **terminal in 12.1's vocabulary**;
  12.6 may add `module.restored` (C3).

  Archive reasons:
  - `trustee_archived` — allowed from any non-archived state.
  - `valid_until_reached` — requires `now() ≥ valid_until`; allowed from any non-archived state.
  - `slot_capacity_exhausted` — requires `active`, a capped module, and `slots_remaining = 0`.

  The reducer uses the pre-genesis `initial: 'draft'`, as alert does. Genesis legality is "the stream is empty", checked in
  `projectModuleGenesis`. `module.authored` is NEVER legal through `projectModuleTransition` (TR2).

  The time window is **half-open**, `[valid_from, valid_until)`: at `now() = valid_until` the module is closed. FR-65 writes
  `[valid_from, valid_until]`; this is a deliberate variance, so that an archive at `valid_until` and a lead at
  `valid_until` cannot both be legal.
- **QE7 — `module.lead_submitted`: row lock first, then the guards, then a decrement in the projector.**
  `submitModuleLead` first runs `SELECT … FROM marketplace_modules WHERE module_id = $1 AND pariwar_id = $2 FOR UPDATE`
  (G15 family (c)). The lock serialises leads per module, so the last place is decided under the lock, not by a version race.

  It then re-checks against the locked row, in this order, throwing the first that fails:
  1. state ≠ `active` → `ModuleNotActiveError` (`submitModuleLead` never throws `ModuleIllegalTransitionError`);
  2. `now() ∉ [valid_from, valid_until)` → `ModuleOutsideWindowError`;
  3. capped and `slots_remaining = 0` → `ModuleSlotsExhaustedError`;
  4. QE8.

  Payload: `{ lead_id, member_id, slots_remaining_after: number | null, from_state:'active', to_state:'active', trigger,
  actor }`, `.strict()`. No name, mobile number or other PII.

  **There is no automatic archive at zero in 12.1.** A capped module whose last place goes stays `active` with
  `slots_remaining = 0` until a `module.archived` (`slot_capacity_exhausted`) is emitted. Whether that happens immediately or
  in a daily sweep is 12.6's call (C2), so 12.3's shelf must treat `slots_remaining = 0` as not offerable (C1).
  **ASK (BigDev): confirm "no auto-archive inside 12.1"**, rather than archiving in the same projector call.
- **QE8 — One place per member per module. The DB enforces it, not a stream scan.**
  - `leadId: ModuleLeadId` is CALLER-supplied: it is the idempotency key for 12.3 / 12.5.
  - The migration adds two partial unique indexes on `events_log` (G16 precedent):
    - `CREATE UNIQUE INDEX "module_lead_member_uq" ON "events_log" ("stream_id", (payload ->> 'member_id')) WHERE
      event_type = 'module.lead_submitted';`
    - `CREATE UNIQUE INDEX "module_lead_id_uq" ON "events_log" ((payload ->> 'lead_id')) WHERE event_type =
      'module.lead_submitted';`
  - A 23505 is mapped by constraint name:
    - `module_lead_member_uq` → `ModuleLeadAlreadySubmittedError`;
    - `module_lead_id_uq` → `ModuleLeadDuplicateError`;
    - `events_log_stream_id_event_version_uq` → `ModuleStreamConcurrencyError`.

    `isModuleStreamVersionConflict` keys on the constraint name, as `helpdesk/errors.ts` does, so a lead-uniqueness
    violation is never mistaken for a version conflict.
  - A cheap pre-check (`SELECT 1 … WHERE stream_id = $ AND event_type = 'module.lead_submitted' AND payload->>'member_id' =
    $`) lets `checkModuleLeadAllowed` refuse before any audit wrapper runs (QE15). The unique index is the guarantee.
  - The lead path does NOT load the full stream with payloads. The genesis payload carries the whole manifest, up to about
    4 KB plus 200 filter values. The lead path reads the locked row's projected scalars and the stream head version only.
  - A place counts a PERSON, not a tap. **ASK (BigDev)** — §0 edge 4.
- **QE9 — Filter grammars: closed, versioned and `.strict()`. `parseModuleManifest` validates them at WRITE and rejects
  anything unknown. Nothing in 12.1 evaluates them.**
  - **`ScopeFilterV1`** is one of:
    - `{ version: 1, scope: 'members-all' }`
    - `{ version: 1, scope: 'state', values: string[] }`
    - `{ version: 1, scope: 'district', values: string[] }`

    `values` holds 1–200 entries, unique and non-empty, and is not normalised (byte-identical, G9).
  - Scopes deliberately absent:
    - `'public'`: the shelf is members-only.
    - `block`: never resolvable (G9).
    - **`role` / `cohort`: ABSENT, rather than declared-and-empty as in banners / news.** A module authored for "cohort X"
      would silently reach nobody: a targeting mistake with no signal. 1.19 D8 says do not mint before a live requirement,
      and 12.2 is the named re-trigger surface. **ASK (BigDev): confirm ABSENT (rejected at write) rather than
      declared-and-empty.**
  - "Pariwar" in the epic's `Pariwar / state / district / role / cohort` is `members-all`, because the row is already
    Pariwar-scoped (QE4).
  - **`EligibilityFilterV1`** is `{ version: 1, clauses: Clause[] }`, with 0–8 clauses and each `kind` at most once.
    - The only v1 clause is `{ kind: 'member_state_in', states: MemberLifecycleState[] }`: non-empty, unique, drawn from
      `MEMBER_LIFECYCLE_STATES`.
    - **Zero clauses = no eligibility restriction beyond scope**; document this on the type.
    - The epic's eligibility "district" is expressed in `ScopeFilterV1`'s `district` arm.
    - **`age_band` is Not addressed** (G10): evaluating it decrypts Tier-1 DOB on the shelf path. Re-trigger: the first
      age-banded module (the PRD's LIC UJ-10 edge case); 12.2 / 12.3 raise it with that requirement attached.
  - The grammar grows additively within `version: 1`. A breaking change is `version: 2`.
- **QE10 — No route, UI, permission key, consent type or job.** The `module_lead_handoff` consent type is added "by the epic
  that FIRST WRITES" it (`schema/consent_records.ts` comment), which is 12.3. The commands are domain functions, called from
  tests only in 12.1 (I6).
- **QE11 — Manifest content is IMMUTABLE after `module.authored`.**
  - The genesis event payload carries the whole manifest. The projector writes the content columns once, and the trigger
    rejects any later change (I2).
  - A correction means archiving (`trustee_archived`) and authoring a new module. There is no revise event in v1.
  - Re-trigger: 12.2, if the wizard needs server-side save-as-you-go. It would then add a `module.revised` arm, legal in
    `draft` only.
  - This posture, plus `manifest_schema_version` and QE9's grammar-version rule, is the ADR (Task 7).
- **QE12 — Reads**, with an explicit `pariwarId` as `helpdesk/read.ts` does (RLS is the second line, not the only one):
  - `getModule(db, pariwarId, moduleId)`;
  - `listModulesForPariwar(db, pariwarId, { state?, limit? })`, ordered `created_at DESC, module_id DESC`, with
    `.limit(clampLimit(opts.limit, { default, cap }))` written inline (TR5);
  - `getModuleStateAt(db, pariwarId, moduleId, at)`, which replays `events_log` with `occurred_at ≤ at` (AR-14
    time-travel, the `member/read.ts` `getMemberStateAt` shape).

  No shelf read.
- **QE13 — Per-domain errors, in `marketplace/errors.ts`:**
  - `ModuleIllegalTransitionError`
  - `ModuleStreamConcurrencyError` + `isModuleStreamVersionConflict`
  - `ModuleGenesisAlreadyExistsError`, `ModuleGenesisMissingError`
  - `ModulePersistError`
  - `ModuleManifestInvalidError` (wraps a ZodError)
  - `ModuleArchiveReasonNotSatisfiedError`
  - the five lead / window errors: `ModuleNotActiveError`, `ModuleOutsideWindowError`, `ModuleSlotsExhaustedError`,
    `ModuleLeadAlreadySubmittedError`, `ModuleLeadDuplicateError`
  - `ModuleStateDirectWriteError` + `MODULE_STATE_DIRECT_WRITE_CODE` + `isModuleStateDirectWriteError`

  Borrow none from another namespace (10.1 review). Only the direct-write trio is exported at the TOP level of
  `domain/src/index.ts`, following the `PoolStateDirectWriteError` trio. Every other error is reached through the
  `marketplace` namespace (the helpdesk precedent). Do NOT register anything in the API error mapper (12.1 has no route).
- **QE14 — Back-brand the helpdesk seam** (type-only: no FK, no migration):
  - `helpdesk_tickets.moduleId` and `ProjectTicketGenesisInput.moduleId` become `ModuleId | null`.
  - `apps/api/src/modules/helpdesk/handlers.ts` becomes `moduleId: body.module_id ? ids.moduleId(body.module_id) : null`.
    This mirrors `poolId`; the contract is `UuidString`, so the brand cannot throw.
  - Rewrite only the `module_id` half of the shared comment. `validity_lookup_id` stays unbranded.
  - `uuidBrand` lower-cases, so the `helpdesk.ticket_created` payload `module_id` becomes lower-case. This is harmless.
- **QE15 — Audit pairing is the CALLER's (G12).**
  - Every command takes `client: pg.PoolClient` (a caller-held transaction with `SET LOCAL ROLE twt_app` and
    `setPariwarScope` already done; `events_log` needs it, G5) and a REQUIRED `auditId: string`, and writes `auditId` to
    `audit_id`.
  - No domain function calls `withCompensatingAudit`. The caller (the 12.2 / 12.3 / 12.6 routes and jobs; in 12.1, one spec
    only) mints `moduleId` / `leadId`, runs `checkModuleLeadAllowed(db, …) → { ok: true } | { ok: false, refusal }`
    BEFORE the wrapper (the wa-opt-in shape), and then calls `audit.withCompensatingAudit(servicePool, { auditIntent, mutate:
    ({ auditId }) => marketplace.<command>(client, { …, auditId }) })`. The audit `resourceLocator` is `module/<id>`.
  - The in-transaction re-check under the row lock still throws the typed errors. Only a genuine race reaches
    `_rolled_back`.
  - `submitModuleLead`'s backstop retry stays inside ONE command call: one `auditId`, one intent line.

## Invariants (I)

- **I1** — The projected columns `current_state`, `state_event_version`, `slots_remaining`, `archive_reason`, `audit_id`
  and `updated_at` are written ONLY by `projectModuleGenesis` / `projectModuleTransition`. Two mechanisms enforce this:
  - the trigger: ANY UPDATE without `app.marketplace_module_state_writer = 'on'` raises P0001, and so does an unguarded
    INSERT;
  - the AST gate.
- **I2** — These columns are immutable after INSERT, **even with the guard on**: `module_id`, `pariwar_id`, `partner_id`,
  `name_en`, `name_hi`, `description_en`, `description_hi`, `eligibility_filter`, `scope_filter`, `valid_from`,
  `valid_until`, `slot_capacity`, `lead_handoff_url`, `lead_handoff_signing_key_secret_name`, `branding_bundle`,
  `manifest_schema_version`, `created_at`. The trigger compares the whole row minus the I1 columns, so any column added
  later is immutable by default.
- **I3** — On INSERT: `current_state = 'draft'`, `state_event_version = 1`, `slots_remaining IS NOT DISTINCT FROM
  slot_capacity`, and `archive_reason IS NULL`. With the guard on, `state_event_version` strictly increases, and
  `slots_remaining` either stays the same or drops by exactly 1.
- **I4** — After every projector call, the persisted row equals `foldModuleProjection(loadEvents(module_id))` on `{ state,
  version, slotsRemaining, archiveReason }`. Tests assert this.
- **I5** — For a capped module, `0 ≤ slots_remaining ≤ slot_capacity`, and `slot_capacity − slots_remaining` equals the
  number of `module.lead_submitted` events on the stream. This holds under two concurrent connections. For an uncapped
  module both columns stay NULL.
- **I6** — No production call site exists for any 12.1 write command (grep result in Completion Notes). 12.2 / 12.3 / 12.6
  add them.
- **I7** — `PERMISSION_CATALOG_VERSION` stays 56. No role, permission key or consent value is added.
- **I8** — No new `account-frozen` source or reason. `member/overlay.ts` is untouched, so the `-147` cl.3 fence is not
  engaged.
- **I9** — Event payloads carry no Tier-1 PII; a member is identified by `member_id` only.

## Acceptance Criteria

0. **AC0 — governance first.**
   - QE1–QE15 are recorded in ONE author-commit decision entry (`-427`, `a22dbdec` — ⭐ MET), committed ALONE with a `governance:` prefix,
     BEFORE any code commit.
   - The four ASKs (QE5 `commission_terms` deferral, QE7 no auto-archive, QE8 one place per member, QE9 role / cohort absent)
     carry BigDev's answers verbatim.
   - ⭐ MET: the carried items C1–C8 land in `deferred-work.md`, and as short "⭐ INHERITED FROM 12.1" notes under the owning
     stories in `epics.md` ([[feedback_governance_commits_precede_implementation]],
     [[feedback_spec_edits_must_propagate_to_tasks]]).
1. **AC1 — manifest table.** **Given** FR-64 + AR-42 + QE4 / QE5, **when** `0193_marketplace-modules.sql` is applied,
   **then**:
   - `marketplace_modules` exists with exactly QE5's columns, types, NOT NULLs, named CHECKs and indexes.
   - Both pgEnums exist, sourced from the domain tuples (one tuple feeds both the pgEnum and the TS union).
   - **And** `twt_app` has SELECT / INSERT / UPDATE, and no DELETE.
   - **And** RLS is ENABLE + FORCE, with separate select / insert / update policies on `pariwar_id =
     nullif(current_setting('app.pariwar_id', true), '')::uuid`.
   - **And** the two `events_log` partial unique indexes from QE8 exist.
2. **AC2 — guarded state (I1–I3).** Each of these is rejected with P0001 and the `ModuleStateDirectWriteError` message
   prefix:
   - an unguarded INSERT;
   - an unguarded UPDATE of ANY column, including `audit_id` alone or `slots_remaining` alone;
   - a guarded UPDATE that changes any I2 column (at least `name_en`, `scope_filter`, `pariwar_id`, `created_at`);
   - a guarded INSERT that violates I3, including the uncapped (NULL, NULL) case passing and a (5, 4) case failing;
   - a guarded UPDATE with a non-increasing `state_event_version`;
   - a guarded UPDATE that moves `slots_remaining` by anything other than 0 or −1.
3. **AC3 — events.** **Given** QE3 / QE6 / QE7, **then**:
   - `marketplace/events.ts` exports `MODULE_EVENT_TYPES` (the five) and `MODULE_EVENT_PAYLOAD_SCHEMAS … satisfies
     Record<ModuleEventType, z.ZodTypeAny>`.
   - Every schema is `.strict()` and carries the AR-14 audit shape: `from_state` (null only at genesis), `to_state`,
     `trigger`, `actor`. AR-14's `timestamp` is `events_log.occurred_at` and its `pariwar_id` is `events_log.pariwar_id`;
     both are row columns, not payload keys.
   - `module.authored` carries the full manifest. `module.archived` carries `reason`. `module.lead_submitted` accepts only
     `from_state === to_state === 'active'`.
   - **And** all five are registered in `packages/events/src/registry.ts`: add `marketplace` to the `@twt/domain` import,
     and each `entry.schema` is the SAME object as the domain schema.
   - **And** `packages/events/tests/module-registry-coverage.test.ts` asserts set equality, as
     `claim-registry-coverage.test.ts` does.
4. **AC4 — reducer.** **Given** QE6, **then** `marketplace/state.ts` defines the machine with `defineStateMachine`, and the
   reducer is pure and total: every legal arm is covered, every inapplicable (state × event) pair returns the same state,
   and unknown types are no-ops.
   - **And** `nextModuleState(state, eventType)` looks the pair up in the machine's `transitions` table and returns the
     `to` state, or `null` if the pair is absent. This deliberately differs from `nextTicketState`, which returns the same
     state (TR1).
   - **And** a unit test asserts, for EVERY (state × event type) pair, that `reduce` equals the table's `to` when present
     and equals the input state when absent.
   - **And** `nextModuleState(s, 'module.authored')` is `null` for every `s`.
   - **And** a pure `foldModuleProjection(rows) → { state, version, slotsRemaining, archiveReason }` exists:
     - `slotsRemaining` = the authored `slot_capacity` − the count of `module.lead_submitted`, or null if uncapped;
     - `archiveReason` = the `module.archived` reason.
5. **AC5 — projector + commands (QE15).** **Given** a caller-held `pg.PoolClient` with the Pariwar scope set and a
   caller-supplied `auditId`, **then**:
   - `authorModule` (which takes the caller-minted `moduleId`), `scheduleModule`, `activateModule`, `submitModuleLead` and
     `archiveModule` are the only public write entry points. They write `marketplace_modules` / `events_log` ONLY through
     `projectModuleGenesis` / `projectModuleTransition` (I1).
   - Each enforces QE6's guards against DB `now()`.
   - **And** each failed guard throws its QE6 / QE7 / QE13 class with no event appended and the row unchanged.
   - **And** `projectModuleTransition` rejects `module.authored` with `ModuleGenesisAlreadyExistsError`.
   - **And** `actor === 'system'` holds iff `actorId === null`.
   - **And** I4 holds after every command.
   - **And** no domain function calls `withCompensatingAudit`. ONE spec composes `submitModuleLead` under the real wrapper
     (the service pool is the test superuser pool) and asserts, by baseline rather than counts, the intent row and, for a
     forced race refusal, the `_rolled_back` row.
6. **AC6 — places (I5, QE7, QE8).** **Given** a module with `slot_capacity = 1`, **when** two connections at the default
   READ COMMITTED submit leads for two different members concurrently, **then**:
   - exactly one `module.lead_submitted` is appended and `slots_remaining = 0`;
   - one caller fulfils and the other receives `ModuleSlotsExhaustedError` (assert symmetrically: order does not matter).
     The `FOR UPDATE` lock decides it.
   - **And** the same member submitting twice gets `ModuleLeadAlreadySubmittedError`, and a replayed `leadId` gets
     `ModuleLeadDuplicateError`; neither decrements.
   - **And** an uncapped module accepts leads with `slots_remaining_after: null`.
   - **And** a lead outside the window, or on a non-active module, is refused with `ModuleOutsideWindowError` /
     `ModuleNotActiveError` respectively, with no event.
   - **And** the backstop retry on `ModuleStreamConcurrencyError` runs at most 3 times, each under its own SAVEPOINT (TR3).
     If the 3rd retry still conflicts, `ModuleStreamConcurrencyError` propagates.
   - **And** a GENESIS race (two `authorModule` calls with the same `moduleId`) leaves exactly one stream. This spec copies
     the alert spec's REPEATABLE READ + barrier rendezvous.
7. **AC7 — filter grammars (QE9).** `parseModuleManifest` accepts every valid form and REJECTS each of these with
   `ModuleManifestInvalidError`:
   - an unknown scope (`role`, `cohort`, `public`, `block`);
   - empty or duplicate `values`;
   - an unknown clause kind (`age_band`);
   - a duplicate clause kind;
   - a state not in `MEMBER_LIFECYCLE_STATES`;
   - extra keys;
   - `version ≠ 1`;
   - a bad URL (`http:`, userinfo), a bad secret name, `valid_until ≤ valid_from`, or `slot_capacity ≤ 0`.

   No evaluator function is exported.
8. **AC8 — reads (QE12).**
   - `getModule` / `listModulesForPariwar` return only the given Pariwar's rows (a second-tenant spec).
   - The list is capped by `clampLimit`.
   - `getModuleStateAt` returns the replayed state as of a timestamp between two transitions.
9. **AC9 — static gate.** `scripts/marketplace-module-state-invariant/{check,lib,lib.test}.ts` + `README.md` exist:
   - The code is copied from helpdesk's gate; the README is written from `scripts/pool-state-invariant/README.md` (helpdesk
     has none).
   - `TABLE = 'marketplaceModules'`; `GUARDED_COLUMNS` = the six I1 columns.
   - The allowlist is file + function: `marketplace/project.ts` → `projectModuleGenesis`, `projectModuleTransition`.
   - It keeps `MIN_EXPECTED_FILES`, template-literal computed keys, bulk array inserts and `onConflictDoUpdate`.
   - It is wired into root `package.json` (`marketplace-module-state:{check,test}`), `scripts/ci-local.sh` and
     `.github/workflows/ci.yml`.
   - **And** `lib.test.ts` flags a `.set({ slotsRemaining })` and a `.set({ auditId })` OUTSIDE the allowlist (so the
     columns new to this table have teeth), and does NOT flag a same-state lead write inside the allowlisted function.
   - **And** a known-bad fixture turns the gate RED; record the revert-sanity check
     ([[feedback_gate_scope_semantic_coverage]]).
10. **AC10 — ids + seam.** The `ModuleId`, `PartnerId` and `ModuleLeadId` brands exist with tests in
    `packages/domain/tests/ids/branded-ids.test.ts`. QE14 is applied, including `apps/api`. `pnpm typecheck` is green across
    the workspace.
11. **AC11 — ADR.** `docs/adr/ADR-0044-module-manifest-schema-versioning.md` (≥ 0044, re-grepped), written from
    `_adr-template.md`, records QE11 + QE4 + QE9's version rule. The `adr-index.md` row flips from `slot-reserved-pre-write`
    to its written status.
12. **AC12 — full gate.** `pnpm ci:local` is green on a fresh Postgres container, and the result is recorded. Per-package
    runs miss `domain-accessor-invariants` (TR5).

## Tasks / Subtasks

- [x] **Task 0 — governance first (AC0).** ⭐ COMPLETE 2026-10-31. Do NOT start anything below until 0.3 is committed.
  - [ ] 0.1 `git fetch origin`; rebase this branch on `origin/main` if it moved. Re-grep NUMBERS (decision id, migration +
        journal `when`, ADR number, `PERMISSION_CATALOG_VERSION`, ledger letter) across every branch and worktree
        ([[feedback_git_fetch_before_remote_reasoning]]). Re-verify G1, G4, G5, G7, G11 and G17.
  - [x] 0.2 Put the four ASKs to BigDev and record the answers verbatim here. ⭐ **ANSWERED 2026-10-31 — BigDev, verbatim:
        *"QE1-QE15 as recommended."*** All four ASKs are confirmed as written, and ⛔ QE changed:
        - QE5: `commission_terms` → 12.2;
        - QE7: no auto-archive;
        - QE8: one place per member;
        - QE9: role / cohort absent.

        If an answer changes a QE, edit the QE, the ACs AND the Tasks together.
  - [x] 0.3 ⭐ DONE — `2026-10-31-427` (`a22dbdec`, committed alone; `-426` skipped as held uncommitted elsewhere). Write ONE author-commit decision entry (QE1–QE15, the §0 table, the four answers) at the top of
        `.decision-log.md`. Commit it ALONE as `governance: decision 2026-10-31-4NN — Story 12.1 build decisions …`
        ([[project_decision_log_writes_user_inserted]]: try first; if refused, ask once).
  - [x] 0.4 ⭐ DONE 2026-10-31. Records:
        - In `deferred-work.md`, add C1–C8 under a `## Story 12.1` heading, each with its owning story and re-trigger.
        - In `epics.md`, add short "⭐ INHERITED FROM 12.1" notes:
          - under 12.2: C2 (activation emitter), C5, QE9 role / cohort, QE11 revise, QE5 `commission_terms`;
          - under 12.3: C1, C5, C6, C8, the QE3 `module.lead_submitted` spelling, QE15 caller-wraps, `age_band`;
          - under 12.4: C4;
          - under 12.5: C6, C7, C8;
          - under 12.6: C2, C3.
- [ ] **Task 1 — ids (AC10).**
  - Add `ModuleId`, `PartnerId` and `ModuleLeadId` to `packages/domain/src/ids/index.ts` (`uuidBrand`), with tests in
    `packages/domain/tests/ids/branded-ids.test.ts`.
  - Apply QE14 in `schema/helpdesk_tickets.ts`, `helpdesk/project.ts` (type + the `module_id` half of the comment) and
    `apps/api/src/modules/helpdesk/handlers.ts` (one line).
- [ ] **Task 2 — schema + migration + RLS (AC1, AC2).**
  - [ ] 2.1 Create `packages/domain/src/schema/marketplace_modules.ts`, with a header block in the `alerts.ts` /
        `helpdesk_tickets.ts` style that states I1–I3. Export it from `schema/index.ts`.
  - [ ] 2.2 Create `packages/domain/src/policies/marketplace-modules-rls.ts` (separate select / insert / update policies, NOT
        `for:'all'`). Export it from `policies/index.ts`.
  - [ ] 2.3 HAND-AUTHOR `packages/domain/migrations/0193_marketplace-modules.sql`. Do NOT run `db:generate`. Separate
        statements with `--> statement-breakpoint`. In order:
        - the enums, the table, QE5's named CHECKs and its two indexes;
        - `GRANT SELECT, INSERT, UPDATE … TO twt_app`;
        - RLS ENABLE + FORCE, and the policies;
        - QE8's two `events_log` partial unique indexes. The header notes the SHARE lock on `events_log` during the build
          (the `0185` precedent);
        - the trigger `marketplace_modules_reject_unguarded_state_write()`, `BEFORE INSERT OR UPDATE`. Every RAISE uses
          the `ModuleStateDirectWriteError` message prefix and `ERRCODE 'P0001'`. Use `IS DISTINCT FROM` throughout, NOT
          `<>` / `=` (NULL-uncapped must compare equal):
          - **INSERT:** if the guard `IS DISTINCT FROM 'on'`, RAISE. RAISE if `NEW.current_state IS DISTINCT FROM 'draft'
            OR NEW.state_event_version IS DISTINCT FROM 1 OR NEW.slots_remaining IS DISTINCT FROM NEW.slot_capacity OR
            NEW.archive_reason IS NOT NULL`.
          - **UPDATE:**
            - (a) if the guard is not 'on', RAISE unconditionally;
            - (b) RAISE, even when guarded, if `(to_jsonb(NEW) - ARRAY['current_state','state_event_version','slots_remaining','archive_reason','audit_id','updated_at'])
              IS DISTINCT FROM (to_jsonb(OLD) - ARRAY[…same…])` (I2, fail-closed for future columns — the
              `0189_ground-inspection-questionnaire.sql` precedent);
            - (c) RAISE if `NEW.state_event_version <= OLD.state_event_version`;
            - (d) RAISE if `NEW.slots_remaining IS DISTINCT FROM OLD.slots_remaining AND NEW.slots_remaining IS DISTINCT
              FROM OLD.slots_remaining - 1`.

        Hand-add the `_journal.json` entry: idx 193, `when` greater than every sibling's, trailing newline.
- [ ] **Task 3 — events (AC3).**
  - Create `packages/domain/src/marketplace/events.ts`: the PINNED SEAM comment for QE3, the schemas and the tuple.
  - In `packages/events/src/registry.ts`, add `marketplace` to the import and register the five entries.
  - Add `packages/events/tests/module-registry-coverage.test.ts`.
- [ ] **Task 4 — filters (AC7).** Create `packages/domain/src/marketplace/filters.ts`:
  - the `ScopeFilterV1`, `EligibilityFilterV1` and `ModuleBrandingBundle` zod schemas;
  - `parseModuleManifest`, which validates the whole manifest (lengths, URL, secret name, window, capacity) and throws
    `ModuleManifestInvalidError`;
  - doc comments on each type stating QE9's "zero clauses" meaning and its absences (role / cohort / age_band / block /
    public), each with its re-trigger.
- [ ] **Task 5 — reducer, projector, commands, reads, errors (AC4, AC5, AC6, AC8).** Create
      `packages/domain/src/marketplace/{state,project,commands,read,errors,index}.ts`. The twins are `alert/state.ts`
      (pre-genesis initial) and `helpdesk/project.ts` (projector shape). Add the namespace export and the direct-write
      trio to `domain/src/index.ts`. Do NOT copy helpdesk's `updatedAt` handling blindly: this table's `updated_at` is
      projector-written (QE5).
  - [ ] 5.1 Projector:
        - checks genesis first (stream empty) in `projectModuleGenesis`;
        - in `projectModuleTransition`, decides legality with `nextModuleState(...) !== null`. ⚠ **NOT
          `toState !== fromState`: copying helpdesk's check makes every lead illegal (TR1).**
        - cross-validates its flat inputs against the parsed payload (7.1 review);
        - sets `updated_at = now()` and `audit_id = auditId` on every transition;
        - is followed by an I4 check in tests.
  - [ ] 5.2 `submitModuleLead`:
        - `SELECT … FOR UPDATE` the row first (QE7), then the QE7 / QE8 guards against the locked row;
        - map 23505 by constraint name (QE8);
        - a backstop retry (≤ 3) on `ModuleStreamConcurrencyError`, each attempt under its own SAVEPOINT, in the
          `reconciliation-review-write.ts` shape. ⚠ **A 23505 aborts the transaction, so a retry without a SAVEPOINT fails
          (TR3).**
  - [ ] 5.3 `checkModuleLeadAllowed`: a pure-read pre-check returning `{ ok } | { ok: false, refusal }` (QE15).
  - [ ] 5.4 Take DB time from `select now()` inside the transaction, NOT `new Date()` (TR4).
- [ ] **Task 6 — static gate (AC9).**
  - Copy `scripts/helpdesk-state-invariant/{check,lib,lib.test}.ts` → `scripts/marketplace-module-state-invariant/` and
    retarget them. Write `README.md` from `scripts/pool-state-invariant/README.md`.
  - Wire root `package.json`, `scripts/ci-local.sh` (match the column alignment) and `.github/workflows/ci.yml`.
  - Add the known-bad fixture leg, and do the revert-sanity check by hand once (record it).
- [ ] **Task 7 — ADR (AC11).** Write `docs/adr/ADR-0044-module-manifest-schema-versioning.md` from `_adr-template.md`, and
      flip the `adr-index.md` row.
- [ ] **Task 8 — tests (AC1–AC8).** See Testing standards: every path is under `packages/domain/` or `packages/events/`,
      NOT the repo-root `tests/`. Every test asserts a typed error class, NOT a bare `.toThrow()`.
- [ ] **Task 9 — verify + ledger (AC12).**
  - Run `pnpm ci:local` on a fresh container. Set `DATABASE_URL` to the story's port for every push
    ([[project_prepush_hook_inherits_5432]]).
  - In Completion Notes: the greps for I6 / I7 / I8 / I9, and every variance (list under Project Structure Notes).
  - Prepend the sprint-status ledger entries safely ([[project_sprint_status_safe_prepend]] — BOTH ledgers). Row →
    `review`.

## Dev Notes

### Current state (what exists, what this story changes, what must be preserved)

- **Helpdesk `moduleId`** in `schema/helpdesk_tickets.ts` + `helpdesk/project.ts` (UPDATE, type-only):
  - Today: `string | null`, unbranded.
  - Change: `ModuleId | null`, and update the `module_id` half of the shared comment.
  - Preserve: the column, the migration, every helpdesk test, nullability, and `validityLookupId` (still unbranded).
  - Helpdesk specs that pass `moduleId: null` compile unchanged.
- **`apps/api/src/modules/helpdesk/handlers.ts`** (UPDATE, one line): `moduleId: body.module_id ? ids.moduleId(body.module_id)
  : null`. Without this change the workspace typecheck fails (TS2322). `member-handlers.ts` (`moduleId: null`) is unchanged.
- **`packages/events/src/registry.ts`** (UPDATE):
  - Today: 86 entries; `@twt/domain` import without `marketplace`.
  - Change: add the import and 5 entries.
  - Preserve: every existing entry, and the `satisfies` shape.
- **`packages/domain/src/index.ts`, `ids/index.ts`, `schema/index.ts`, `policies/index.ts`** (UPDATE): additive exports only.
- **`package.json`, `scripts/ci-local.sh`, `.github/workflows/ci.yml`** (UPDATE): one gate each, mirroring the helpdesk lines.
- **`docs/knowledge-transfer/adr-index.md`** (UPDATE): one row's status.
- **Do NOT touch:**
  - `member/overlay.ts` (I8);
  - `state-machine.ts`;
  - `rbac/permissions.ts` (I7);
  - `schema/consent_records.ts` (QE10);
  - `packages/contracts/src/modules/README.md` (12.2 / 12.3 replace it);
  - the API error mapper (QE13).

### Traps (TR)

- **TR1 — `lead_submitted` is a SAME-STATE transition.** The helpdesk projector throws when `toState === fromState`, and
  `nextTicketState` returns the unchanged state for an illegal pair. Copying either makes every lead illegal. Decide
  legality from the transitions table (`nextModuleState` returns `null` when the pair is not legal).
- **TR2 — Genesis.** In the reducer, `initial: 'draft'` + `module.authored → draft` is a no-op. Check genesis legality as
  "the stream is empty" in `projectModuleGenesis`, not in the reducer. The INSERT trigger enforces `draft` / version 1, and
  `projectModuleTransition` must reject `module.authored`.
- **TR3 — A 23505 aborts the transaction.** A retry inside the same transaction without a SAVEPOINT fails with "current
  transaction is aborted" ([[project_domain_limit_clamp_and_savepoint_retry]]). drizzle wraps pg errors, so check
  `err.cause.code` and `err.cause.constraint`.
- **TR4 — One transaction means one `now()`.** Ordering tests that need distinct timestamps must use separate transactions
  ([[project_db_clock_ordering_tests_tie]]). For `getModuleStateAt`, commit the transitions in separate transactions, or
  seed `occurred_at` explicitly.
- **TR5 — `domain-accessor-invariants` rejects `.limit(NAMED_CONST)`.** This was 10.1's post-review CI red (fix
  `0f696111`). Use `clampLimit(...)` inline. Only the full `ci:local` runs this gate.
- **TR6 — REPEATABLE READ on the last-place spec gives the wrong error.** Under RR, the waiter on the locked row gets 40001,
  and a SAVEPOINT retry re-reads the same snapshot. The last-place race runs at the default READ COMMITTED. Only the
  GENESIS race copies the alert spec's RR + barrier.
- **TR7 — Contracts/domain boundary.** Do NOT import `@twt/domain` from `packages/contracts/src` (the Metro bundle —
  [[project_contracts_domain_bundle_boundary]]). 12.1 adds no contracts.
- **TR8 — Migration ordering on the shared DB.** If a sibling branch lands a later `when` first, drizzle skips this
  migration ([[project_sibling_migration_when_order_shared_db]]; `-332` d2 merge-order rule). Re-check at the commit. Do NOT
  regenerate an applied migration (42P07 — [[project_live_db_test_gotchas]]).
- **TR9 — The epic's own event names are wrong elsewhere.** `claim.intake.initiated` is really `claim.intake_initiated`.
  Read the registry; do NOT copy epic spellings.
- **TR10 — A literal copy of `0084`'s trigger guards only two columns.** It would let an unguarded UPDATE of
  `slots_remaining`, `archive_reason` or `audit_id` through. Use Task 2.3's whole-row trigger.
- **TR11 — Concurrency specs must own their commits.** `getTx()` rolls back, so two-connection specs use their own
  `pg.Pool`, clean up via `session_replication_role='replica'` (the alert spec's `afterAll`), and declare `hasDatabase`, so
  the AI-10-5 guard sees them.

### Carried to sibling stories (C) — recorded at Task 0.4, NOT built here

- **C1 → 12.3:** the shelf must treat all of these as not offerable:
  - `slots_remaining = 0`;
  - `now() ∉ [valid_from, valid_until)`;
  - any state other than `active`.

  It evaluates QE9's grammars fail-closed: an unknown or empty audience is nobody.
- **C2 → 12.6 (or 12.2) — three items:**
  - (a) Decide whether exhaustion archives immediately or in the daily sweep (QE7).
  - (b) **Nothing activates a `scheduled` module at `valid_from`.** The epic's cron only archives, so 12.6 or 12.2 must own
    the `scheduled → active` emitter, or `scheduled` is a dead end.
  - (c) The sweep must also archive `draft` / `scheduled` modules with `now() ≥ valid_until` (reason `valid_until_reached`,
    legal from any non-archived state), or they never leave. The epic's `valid_until < now()` and 12.1's
    `now() ≥ valid_until` are compatible, because at `now() = valid_until` leads are already refused.
- **C3 → 12.6:** `module.restored`. 12.6 decides its target state, the grace window (the epic says "e.g., 7 days"), and
  what a restore means after `valid_until_reached` or with 0 places, and adds the arm to QE6's table.
- **C4 → 12.4:** the `account-frozen` overlay LIFTS on `claim.settled` / `claim.denied_no_appeal` (`-233`) and
  `claim.closed` (`-292` RF4) — G11.
  - "Structurally absent post-claim" therefore cannot key on the overlay alone. The durable "a claim was ever filed" fact is
    `claim/nominee-lock.ts`.
  - The `-147` cl.3 fence applies if 12.4 adds a freeze reason.
- **C5 → 12.2 / 12.3:** `branding_bundle.accent_color_hex` is never applied to shelf card backgrounds, CTAs or chrome (UX).
  It is allowed only on a partner-dedicated detail page.
- **C6 → 12.3 / 12.5 (Panel / counsel):** the privacy policy's §6 recipient list names no partners, and the PRD adversarial
  review's M-8 calls each lead "a controller-to-controller PII transfer under DPDPA". Raise this before any member data
  leaves ([[project_dpdpa_counsel_engaged_but_unrecorded]]).
- **C7 → 12.5:** the signing scheme conflicts.
  - Architecture §3.7 / §5.9: asymmetric JWT, **per partner**, keys in the high-sensitivity project.
  - Epic 12.5: HMAC-SHA-256, **per module**.

  12.1 stores only a Secret Manager NAME per module, which fits either. 12.5 decides, and may move the reference to a
  partner entity.
- **C8 → 12.3 / 12.5:** lead events carry `member_id` on the MODULE stream, not the member's. Before leads go live,
  DPDPA data export (`packages/domain/src/data-export/`, whose sections are strict-parsed —
  [[project_data_export_sections_strict_parsed]]) and RTBF must learn to find them.

### Testing standards

All paths below are under `packages/domain/` unless prefixed otherwise. Do NOT use the repo-root `tests/` (G14).

- **DB-free unit tests:**
  - `tests/marketplace/state.test.ts`:
    - every legal arm;
    - every (state × event) pair against the transitions table (AC4);
    - unknown types;
    - prefix replay;
    - `foldModuleProjection`;
    - exact-membership assertions on both tuples.
  - `tests/marketplace/events.test.ts`: accept and reject for every schema; a `.strict()` extra key; `from_state` null only
    at genesis; the lead schema's `active → active` only.
  - `tests/marketplace/filters.test.ts`: AC7's full reject list, plus the accepted forms as frozen vectors.
  - `tests/ids/branded-ids.test.ts`: the three new brands.
- **Live-DB tests** (`:5433` `twt-test-pg`). Assert membership, not counts. Do NOT `DROP SCHEMA`.
  - `tests/integration/marketplace/projector-trigger.spec.ts`: every AC2 leg via raw SQL (P0001 + message prefix); trigger
    presence via `pg_trigger`.
  - `tests/integration/marketplace/commands.spec.ts`:
    - AC5 / AC6 sequential legs;
    - I4 after each command;
    - window guards against DB time;
    - the one real-wrapper composition (AC5).
  - `tests/integration/marketplace/module-stream-concurrency.spec.ts`: TWO real connections (7.1 / 8.1 both had to add this
    in review); own commits (TR11).
    - the last-place race at READ COMMITTED (TR6);
    - the genesis race at RR + barrier.
  - `tests/integration/marketplace/read.spec.ts`: AC8, including the cap and time-travel.
  - `tests/integration/rls/marketplace-modules-policy-regression.spec.ts`:
    - positive and negative cases;
    - a mismatched-Pariwar `withCheck` (42501);
    - unscoped fail-closed;
    - `relforcerowsecurity`;
    - DELETE denied.
- **Events:** `packages/events/tests/module-registry-coverage.test.ts`.
- **Gate:** `scripts/marketplace-module-state-invariant/lib.test.ts` (AC9's three extra cases).
- **Merge gate:** `pnpm ci:local` (GitHub Actions status flips — [[project_ci_actions_suspension_local_mirror]]).

### Project Structure Notes

**New:**
- `packages/domain/src/marketplace/`
- `schema/marketplace_modules.ts`
- `policies/marketplace-modules-rls.ts`
- `migrations/0193_marketplace-modules.sql`
- `scripts/marketplace-module-state-invariant/`
- `docs/adr/ADR-0044-…`

**Variances from the epic and PRD text.** Each is deliberate; list each one in Completion Notes:
- no `packages/marketplace` (QE1);
- `pariwar_id` NOT NULL, with no FK (QE4);
- `module.lead_submitted` (QE3);
- `lead_handoff_signing_key_secret_name` (QE5);
- `state` → `current_state` (QE5, the helpdesk convention);
- branding "logo + colors" → `logo_object_key` + a single `accent_color_hex` (QE5);
- the scope vocabulary (QE9), with eligibility "district" moved into the scope filter (QE9);
- `age_band` Not addressed (QE9);
- the half-open window `[valid_from, valid_until)` vs FR-65's closed interval (QE6);
- `commission_terms` / the external CTA / restore deferred (QE5, C3).

**Not this story's to change** (noted only):
- the readiness report lists Epic 4 as an Epic 12 dependency, while the epic body lists Epics 1 / 3 / 6;
- `per-epic-aggregation-estimates/epic-12.md` scopes a forum integration, not this marketplace;
- `-104`'s "deferred to Epic 12" for field workers is stale numbering (field workers are now Epic 13).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12: Module Marketplace — Stories 12.1, 12.2 (inherited seam), 12.5, 12.6]
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#§4.9 FR-64..FR-67, Out of Scope, OQ-4]
- [Source: _bmad-output/planning-artifacts/architecture.md#§3.7 Module Marketplace lead-handoff transport; §5.9 secrets; Contracts sub-domain rule; branded IDs]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Module Shelf Partner Brand Integration]
- [Source: _bmad-output/implementation-artifacts/10-1-helpdesk-subsystem-data-model-routing-policy-registry.md — File List + Review Findings]
- [Source: _bmad-output/implementation-artifacts/7-1-pool-object-…md, 8-1-alert-state-machine-cycle-open-trigger.md, 3-1-member-lifecycle-state-machine-event-stream.md]
- [Source: packages/domain/migrations/0084_helpdesk-tickets-and-routing-policy.sql, 0079 (events_log partial unique index), 0189 (whole-row trigger compare)]
- [Source: packages/domain/src/helpdesk/{project,state,events,errors,read}.ts; apps/api/src/modules/helpdesk/handlers.ts; scripts/helpdesk-state-invariant/, scripts/pool-state-invariant/README.md]
- [Source: packages/domain/src/audit/compensating.ts; wa-opt-in/code.ts header; reconciliation/reconciliation-review-write.ts; tests/integration/alert/alert-stream-concurrency.spec.ts; docs/domain-accessor-invariants.md family (c)]
- [Source: packages/domain/src/member-geo/resolve.ts; news-blog/audience.ts; schema/banners.ts]
- [Source: Decisions `2026-08-13-103` D8, `2026-08-21-147` cl.3, `2026-09-08-210` cl.2, `2026-09-20-233`, `2026-10-07-292` RF4]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-10-31 — v1.0 created by `bmad-create-story` at `01062c51` (four read-only research passes); row backlog → ready-for-dev.
- 2026-10-31 — v1.3: Task 0.4 done (`deferred-work.md` C1–C8 + deferrals; `epics.md` INHERITED notes under 12.2–12.6) ⇒ Task 0 complete.
- 2026-10-31 — v1.2: Task 0.2 answered ("QE1-QE15 as recommended."); Task 0.3 done — `2026-10-31-427` (`a22dbdec`).
- 2026-10-31 — v1.1 at `b2f36fe9` (worktree fast-forwarded to `origin/main`): validated by three read-only verifiers; all 19
  improvements applied (audit pairing moved to the caller — QE15; no tenant FK; row-lock last-place design + RC isolation;
  valid named CHECKs; package-scoped test paths; the `apps/api` QE14 line; whole-row trigger incl. `audit_id` /
  `updated_at`; gate README source; ASK / C-list / error-name consistency; `events_log` partial unique indexes for QE8;
  `foldModuleProjection` + table/reducer agreement; explicit-`pariwarId` reads; C2 (c) and C8; variance list; plain-word
  negations; names-at-a-glance).
