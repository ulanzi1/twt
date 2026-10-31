---
baseline_commit: b2f36fe9
---

<!--
PINNED: `b2f36fe9` = `origin/main` (2026-10-31k). The story lives on branch
`story/12-1-module-manifest-schema-module-lifecycle-state-machine` in its OWN worktree
(`.claude/worktrees/12-1-module-manifest-schema-module-lifecycle-state-machine`), fast-forwarded
`4e57fa42 → 01062c51 → b2f36fe9` with no code change. Every `apps/` / `packages/` / `scripts/` claim was traced at the
pin on 2026-10-31, then re-checked by SEVEN read-only verifiers across two rounds. Perishable — re-check at Task 0.1.
Re-locate by FUNCTION, ⛔ by line.

STATUS: ready-for-dev (2026-10-31 — v1.4).
- v1.1: validated by three read-only verifiers; 19 improvements (`62416719`).
- v1.2: Task 0.2 answered — BigDev, *"QE1-QE15 as recommended."* Task 0.3: author-commit `2026-10-31-427` (`a22dbdec`,
  alone) (`e38fc5a3`).
- v1.3: Task 0.4 records (`39ef1763`).
- v1.4: a SECOND validation by four read-only verifiers (DB feasibility; a dev-agent dry run; adversarial semantics;
  records audit). BigDev: *"I think story is not yet ready for dev, run story validation one more time"*, then *"apply
  all findings"*. Amending author-commit `2026-10-31-429` (`0168592b`, alone). Every finding applied; records updated;
  ledger `r` relabelled `t`.
- ⛔ pushed. ⭐ **Task 0.1 runs FIRST in `bmad-dev-story`; then the build may start.**

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes · ⭐ = action / emphasis · ⚠ = hazard. ⭐ In ACs, Invariants,
Tasks and Traps, negations are written in PLAIN WORDS ("No …", "Do NOT …"), so a skim cannot invert them.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. They are
newest-first files, so cite the decision id + clause, the item heading, or the row key. Line numbers into other files
are perishable hints.

NUMBERS — re-checked 2026-10-31 on every ref and worktree. Rule (`-366` decision 6): "the number belongs to the first
COMMIT". For migrations `-415` follows `-332` d2: the number follows the MERGE order.
- Decisions:
  - `-427` (`a22dbdec`) and `-429` (`0168592b`) are TAKEN here.
  - `-426` (`16dc6911`) and `-428` (`1bdd8cd0`) are on `story/11b-5a-…`.
  - `-425` is on local `story/6-38-…`.
  - ⇒ any further decision takes ≥ `-430`.
- Migrations: highest `0192_questionnaire-versions` (journal `when` 1796182800037, step 86400001) ⇒ this story takes
  ≥ `0193`, with `when` ≈ 1796269200038 and greater than every sibling's.
- ADRs: highest `ADR-0043` ⇒ ≥ `ADR-0044`.
- RBAC: `PERMISSION_CATALOG_VERSION = 56` (unchanged — I7).
- Ledger:
  - `2026-10-31a`–`o` and `r` are taken elsewhere. `story/11b-5a-…` committed `r` first (`ec7e5eb9`), so this branch's
    `r` was relabelled `t`.
  - `s` is held uncommitted in the 11b-5a worktree, and `n` / `o` in the 6-38 worktree.
  - Ours: `p`, `q`, `t`, `u` ⇒ next free ≥ `2026-10-31v`.
- Roster: no row.

⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each. `story/6-38-…` and `story/11b-5a-…` are live
and may take `0193`, `ADR-0044` or the next ledger letter first.

LETTERS: G = found facts · QE = build decisions (ANSWERED — `-427`, amended by `-429`) · I = invariants · TR = traps ·
C = carried to a sibling story.
-->

# Story 12.1: Module Manifest Schema + Module Lifecycle State Machine `[PRIMITIVE]`

Status: ready-for-dev

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

This is the **sixth** event-derived-state primitive, after member (3.1), claim (6.1), pool (7.1), alert (8.1) and
helpdesk (10.1).

It stores a partner **module** — an HDFC home-loan, LIC term-plan or health-camp offer that a Pariwar shows its members —
as an immutable, bilingual **manifest**: who the partner is, what the offer says, who may see it, its dates, how many
places it has, where leads go, and which Secret Manager secret signs them.

Its lifecycle, `draft → scheduled → active → archived`, is derived **only from `events_log`**:
- Five events drive it: `module.authored`, `module.scheduled`, `module.activated`, `module.lead_submitted` and
  `module.archived`.
- ONE projector writes them, guarded by a DB trigger and an AST gate, as for `helpdesk_tickets`.
- Every transition first locks the module row.

It builds **no** route, UI, shelf, filter evaluator, webhook, cron, permission key, consent type or audit-wrapper call.
Those belong to 12.2–12.6.

**Nothing reaches a member from 12.1 alone** (I6). The lead rules in Policy meaning are fixed here; members feel them once
12.3 ships.

## ⭐ Names at a glance

| Thing | Name |
|---|---|
| Namespace / folder | `marketplace` — `packages/domain/src/marketplace/` |
| Table / drizzle export | `marketplace_modules` / `marketplaceModules` (`packages/domain/src/schema/marketplace_modules.ts`) |
| Enums (domain tuples → pgEnums) | `MARKETPLACE_MODULE_STATES` → `marketplace_module_state`; `MARKETPLACE_MODULE_ARCHIVE_REASONS` → `marketplace_module_archive_reason` |
| Guard session var | `app.marketplace_module_state_writer` |
| Trigger fn / trigger | `marketplace_modules_reject_unguarded_state_write()` / `marketplace_modules_state_write_guard` (BEFORE INSERT OR UPDATE … FOR EACH ROW) |
| Direct-write error | `ModuleStateDirectWriteError`, `MODULE_STATE_DIRECT_WRITE_CODE = 'module.state_direct_write_rejected'`, `MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX = 'marketplace_modules direct write rejected'`, SQLSTATE `P0001` |
| RLS policies | `marketplace_modules_tenant_isolation_{select,insert,update}` |
| Named CHECKs (the ONLY DB-side content rules) | `marketplace_modules_window`, `_capacity_positive`, `_slots_pair`, `_slots_range`, `_archive_reason_pair`, `_manifest_schema_version_v1` |
| Indexes | `marketplace_modules_pariwar_id_idx`, `marketplace_modules_pariwar_state_idx`; on `events_log`: `module_lead_member_uq`, `module_lead_id_uq` |
| Migration | `packages/domain/migrations/0193_marketplace-modules.sql` (≥, re-grep) |
| Projector fns (the only writers; ⛔ re-exported) | `projectModuleGenesis`, `projectModuleTransition` (`marketplace/project.ts`) |
| Commands (public write entry points) | `authorModule`, `scheduleModule`, `activateModule`, `submitModuleLead`, `archiveModule` (`marketplace/commands.ts`) |
| Pre-check | `checkModuleLeadAllowed` |
| Payload schemas | `ModuleAuthoredPayloadSchema`, `ModuleScheduledPayloadSchema`, `ModuleActivatedPayloadSchema`, `ModuleLeadSubmittedPayloadSchema`, `ModuleArchivedPayloadSchema` |
| Brands | `ModuleId`, `PartnerId`, `ModuleLeadId` |
| Gate | `scripts/marketplace-module-state-invariant/` · scripts `marketplace-module-state:{check,test}` |
| ADR | `docs/adr/ADR-0044-module-manifest-schema-versioning.md` (≥, re-grep) |
| Decisions | `2026-10-31-427` (QE1–QE15) · `2026-10-31-429` (amendments A1–A7) |

## Story

As **Solo Builder authoring the marketplace primitive**,
I want **a module manifest schema + lifecycle state machine consuming Story 1.3's event log primitive**,
so that **every module is event-derived, audit-replayable, and lifecycle-traceable.**

## 📜 Policy meaning (AI-10-1)

**This story evaluates NO predicate that decides which members SEE a module.** It does FIX the meanings 12.3 must
evaluate:
- **Offerable:** an offer is shown to no one unless it is active, within its dates and, if capped, has places left (C1).
- **Audience:** `members-all` means every member of the Pariwar; zero eligibility clauses means no restriction beyond
  scope.
- **Matching:** values match byte-for-byte, and an empty or unknown audience means nobody.

Which members see it is 12.3's call, and 12.3 owes its own note.

**It introduces three predicates that gate a member's ability to register interest (a lead)**, inside the lead command
(QE7, QE8):

*In a member's terms:* **"You can register interest in a partner offer only while it is open (live and within its dates).
Once every place on it is taken, nobody else can register. And you can register interest in each offer only once — a
corrected offer is published as a new offer."**

⚠ **These three are necessary, NOT sufficient.** Who may register at all — scope, eligibility, member state and grief
suppression — is checked by 12.3 at submission (C9).

**Checked against the Niyamavali** (the git-ignored copies in the main checkout, grepped 2026-10-31):
- `docs/legal/niyamavali.md` for `partner|commercial|advertis|insurance|loan|marketplace|LIC|HDFC|third part|share.*data|lead|camp`.
- `docs/legal/niyamavali.hi.md` for साझेदार|पार्टनर|विज्ञापन|बीमा|ऋण|मॉड्यूल.

**Result: SILENT.** No clause covers partners, modules or leads. The only hits are §1.2 and its Hindi equivalents
(बीमाकर्ता, ऋण): "facilitator of mutual aid, not a guarantor, insurer, or financial intermediary". Neither §1.2 nor Part 10
("specified purposes") is engaged, because a lead is ⛔ a benefit the Trust owes.

**The trust deed:** the draft Clause 7.2(i) permits partner arrangements "provided such arrangements are **disclosed**,
are consistent with the Trust's charitable character, and do not compromise the interests of members". Places counted
exactly (I5) and taken once per member (QE8) are consistent with the last limb. ⚠ "Disclosed" sits against the PRD's
"partner commission rates … never public". That tension is carried to 12.2 with `commission_terms`, and is routed if 12.2
cannot reconcile them (§0: what the Trust discloses).

⇒ **No conflict for 12.1; nothing to route now.** (The Niyamavali is a rulebook, ⛔ a ratified spec —
[[feedback_niyamavali_rulebook_not_spec]].)

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Verbatim | Status |
|---|---|---|
| epics.md Story 12.1 AC | "state is event-derived per Story 3.1, 6.1, 7.1 pattern; persisted state column never directly UPDATEd" | epic text |
| epics.md AR-14 | "state derived from event history; persisted state is optimization only. Transitions emit `from_state`, `to_state`, `trigger`, `actor`, `timestamp`, `pariwar_id`." | epic text |
| PRD FR-64 | "A module is described by a manifest: `{module_id, title, description, eligibility_filter, scope_filter, valid_from, valid_until, slot_capacity?, target_url_or_form, partner_id, commission_terms (private)}`." | PRD |
| PRD §4.9 Out of Scope v1 | "Partner self-service portal — v2. - Cross-Pariwar partner manifest — v2." | PRD |
| architecture §3.7 | "lead contracts are per-Pariwar (TWT-Bihar's HDFC contract ≠ future Rail Parivar's HDFC contract); contract storage scoped by `pariwar_id`." | architecture |
| Decision `2026-08-13-103` D8 (Story 1.19) | "`role`/`cohort` are recorded "Not addressed", and ⛔ NO successor is minted … ⛔ **Story 12.2 is not the owner** either — it *consumes* a role/cohort filter but does not **own** the attribute." Re-trigger (a CONDITION, naming no story): "the first surface that must target members by `role` or `cohort` … ⛔ Do not mint a successor before a live requirement attaches." | ratified (author) — unchanged |
| Decision `2026-08-21-147` cl.3 (Trustee-ratified) | "Any future change that introduces a new **source/reason** for account-frozen must re-examine the directory exclusion predicate and the ratified member-facing sentence" | not engaged by 12.1 (I8); engaged at 12.4 (C4) |
| Decision `2026-09-08-210` cl.2 (Trustee-ratified) | NOT delegated: "anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key · … · ⛔ any status whose meaning reaches a **member**." | does not govern this vocabulary (§0 edge 6) |
| Draft trust deed Clause 7.2(i) | "To collaborate with, or receive commissions or fees from, partners offering products or services to members, provided such arrangements are disclosed, are consistent with the Trust's charitable character, and do not compromise the interests of members" | draft — "disclosed" carried to 12.2 |
| UX spec "Module Shelf Partner Brand Integration" | "partner colors are NOT applied to card backgrounds, CTAs, or surrounding chrome." | UX — carried (C5) |

### §0 — whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` §0, per edge; answered `-427`, corrected `-429` A7)

| # | Edge | Verdict |
|---|---|---|
| 1 | Package location | **Yours** — QE1. |
| 2 | Event-name spelling | **Yours** — QE3. |
| 3 | `pariwar_id` NOT NULL in v1 | **Yours** — the PRD already puts the cross-Pariwar manifest in v2 (QE4). |
| 4 | One place per member per module | **Yours — confirmed by BigDev (`-427`).** Stripped: "may a member who already registered interest in an offer register again?" A person sees the refusal, but it is ⛔ something the Trust owes (a lead is ⛔ a benefit), ⛔ a disclosure (it NARROWS what reaches a partner), and raises ⛔ consent basis. The cost is recorded (`-427` Consequence 3). |
| 5 | Sharing member data with partners (privacy policy §6 names ⛔ partners) | **Panel / counsel's — ⛔ 12.1's.** 12.1 sends nothing. Carried, with C8 (a), to 12.3 / 12.5, to be raised BEFORE anything leaves (C6). |
| 6 | New enums and `-210` | **⛔ engaged, now or later.** `-210` delegates `development_status`-class tracking values; it does not govern this vocabulary. A later value (a restore state, a new archive reason) is judged by §0 on its own: the Panel's if it changes what a member is shown or owed. |
| 7 | `account-frozen` / grief suppression | **⛔ 12.1's** — no freeze source (I8). C4 → 12.4. |
| 8 | Trust-deed "disclosed" vs the PRD's "commission … never public" | **Possibly the Panel's (what the Trust discloses) — ⛔ 12.1's.** 12.1 stores ⛔ commission. Carried to 12.2 with `commission_terms`. |

## FOUND FACTS (G) — traced at `b2f36fe9`, re-verified 2026-10-31

- **G1 — Home.** The code lives in `packages/domain/src/<area>/`; there is ⛔ per-primitive package (decided by QE1 /
  `-427`). Domain owns the schema, reducer and projector because the drizzle globs, every `*-state-invariant` gate's
  `SCAN_ROOT` and `domain-accessor-invariants` all read only `packages/domain/src`, and `@twt/events` depends on
  `@twt/domain`. The epic's `packages/marketplace` is the same misnamed home Story 3.1 refused for
  `packages/member-lifecycle`.
- **G2 — Helpdesk twin (10.1, `0084_helpdesk-tickets-and-routing-policy.sql`).**
  - **Columns:** `current_state` pgEnum + `state_event_version bigint {mode:'number'}`.
  - **Trigger:** a guarded `BEFORE INSERT OR UPDATE` trigger. ⚠ It checks ONLY `current_state` / `state_event_version`
    (TR10).
  - **Grants and RLS:** `GRANT SELECT, INSERT, UPDATE` (⛔ DELETE). ENABLE + FORCE RLS, with separate select / insert /
    update policies.
  - **Projector:** `helpdesk/project.ts` takes `client: pg.PoolClient` + `auditId: string`. ⚠ It **replays the whole
    stream, appends to `events_log`, THEN updates the row**. That append-first order deadlocks against a row lock (TR12),
    so it is ⛔ copied.
  - **Gate:** `scripts/helpdesk-state-invariant/{check,lib,lib.test}.ts` — ⛔ README (the pool / alert gates have one).
    - `lib.ts` declares `const HELPDESK_TICKETS_TABLE = 'helpdeskTickets'` and `GUARDED_COLUMNS = new Set([...])`.
    - `enclosingFunctionName` returns the INNERMOST named function or const-arrow.
    - `isAllowlistedWrite` (in `check.ts`) drops allowlisted findings.
    - `MIN_EXPECTED_FILES = 50` is local to `check.ts`.
  - **Wiring:**
    - `package.json`: `"helpdesk-state:check": "tsx scripts/helpdesk-state-invariant/check.ts"` and `"helpdesk-state:test": "vitest run scripts/helpdesk-state-invariant"`.
    - `scripts/ci-local.sh`: `run "helpdesk-state-invariant" "pnpm helpdesk-state:test && pnpm helpdesk-state:check"`.
    - `.github/workflows/ci.yml`: a standalone `helpdesk-state-invariant` job (⛔ aggregate `needs:`).
- **G3 — Reducer framework.**
  - `defineStateMachine({initial, reduce, transitions?})` in `packages/domain/src/state-machine.ts`, which "is PURE … and
    stays so". Do NOT edit it.
  - `transitions` is "documentation-only — runtime authority is `reduce`". `fold` returns the state STRING only.
  - `helpdesk/state.ts` `nextTicketState` returns the **unchanged state** for an illegal pair, and the projector then
    throws on `toState === fromState` (TR1).
  - `alert/state.ts` has a pre-genesis `initial: 'draft'`. Its bridge `toAlertEvent` is private.
  - Same-state events with a version bump already exist: the member "NON-TRANSITION MARKER" in `member/events.ts`.
- **G4 — Events.**
  - Names are single-dot snake_case: `pool/events.ts` "PINNED SEAM"; the `helpdesk/events.ts` and `alert/events.ts`
    "Event-name delimiter" headers.
  - `registry.ts`: 86 entries, ⛔ `module.*`. Import line: `import { alert, claim, contribution, helpdesk, member, pool,
    reconciliation } from '@twt/domain'`. ⛔ test asserts the registry size.
  - Registry descriptions follow `registry.ts`'s "⚠ An owner named here is an ASSERTION NOTHING VERIFIES".
  - Actor sets: claim `['member','operator','trustee','system']`; helpdesk `['member','operator','staff','system']`.
  - Audit actions must match `/^[a-z0-9_]+(\.[a-z0-9_]+)+$/` (`audit/write.ts`).
- **G5 — `events_log` (`0001`, `0002`).**
  - `pariwar_id` NOT NULL. RLS is `FOR ALL` with `withCheck pariwar_id = app.pariwar_id`.
  - It is append-only: BEFORE UPDATE / DELETE / TRUNCATE triggers reject with "events_log is append-only — corrections
    emit a new event (AR-8)". `twt_app` has SELECT + INSERT only.
  - Erasure keeps streams (`member/anonymize.ts`: "the event stream is RETAINED").
  - Its AFTER INSERT triggers fire only for `member.%` / `contribution.*`.
- **G6 — Secret references.** Secret Manager references are `<thing>_secret_name text` columns holding a NAME:
  `pariwar_wa_config.access_token_secret_name`, `pariwar_telegram_config.bot_token_secret_name`, resolved by
  `resolveSecretValue` (`domain/src/secrets.ts`). ⛔ `*_key_ref` column exists anywhere.
- **G7 — The helpdesk `module_id` seam is UNBRANDED.**
  - Schema: `helpdesk_tickets.moduleId: uuid('module_id')`, with ⛔ `$type`. Projector input:
    `ProjectTicketGenesisInput.moduleId` (`helpdesk/project.ts`).
  - The same "deliberately NOT branded" comment, covering BOTH `module_id` and `validity_lookup_id`, appears in BOTH
    files.
  - The API passes a raw string — `moduleId: body.module_id ?? null` in `apps/api/src/modules/helpdesk/handlers.ts` —
    while the `poolId` line beside it is branded.
  - Helpdesk specs pass `moduleId: null`. `uuidBrand` lower-cases (`ids/index.ts`).
- **G8 — Name clash.** `BrandingBundle` already means PARIWAR branding (`schema/pariwar_passport.ts`).
- **G9 — Audience precedent** (`schema/banners.ts`, `news-blog/audience.ts`, `member-geo/resolve.ts`):
  - byte-identical value comparison;
  - `block` never resolvable;
  - an empty audience means nobody;
  - banners and news DECLARE `role` / `cohort` and resolve them to empty.
- **G10 — DOB is Tier-1 ciphertext** (`member_kyc_profiles`, `piiColumn(1, …)`).
- **G11 — The `account-frozen` overlay** (`member/overlay.ts`).
  - It freezes on `claim.intake_initiated` and lifts on `claim.settled` / `claim.denied_no_appeal` (`-233`) and
    `claim.closed` (`-292` RF4).
  - `getMemberAccountOverlay` has zero production call sites.
  - The durable "a claim was ever filed" fact is `claim/nominee-lock.ts`. A living member locked by a stray claim "STAYS
    locked" until row 6-22.
- **G12 — Audit pairing is the CALLER's.**
  - `audit.withCompensatingAudit(servicePool: pg.Pool, { auditIntent, mutate: ({ auditId }) => … })`
    (`audit/compensating.ts`) commits the intent line in its own transaction, and writes `<action>_rolled_back` if
    `mutate` throws.
  - ⛔ domain primitive calls it. The twin caller is `apps/api/src/modules/helpdesk/handlers.ts`. `wa-opt-in/code.ts`:
    "a refusal thrown inside `withCompensatingAudit` would write an intent line + `_rolled_back`".
  - Domain specs pass `auditId: randomUUID()`.
  - `setupLiveDb`'s pool is private, so wrapper specs create `new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl:
    false })` (`wa-opt-in/end-every-wa-yes.spec.ts`, `bulk-operations/audit-seam.spec.ts`).
  - `audit_id` is genesis-only in every twin.
- **G13 — Migrations are HAND-AUTHORED.**
  - The snapshot is frozen at 0020 (`0084`: "DO NOT REGENERATE with `db:generate`"). Use `--> statement-breakpoint`, and
    hand-add the `meta/_journal.json` entry with a trailing newline.
  - `CREATE INDEX CONCURRENTLY` is impossible because drizzle-kit wraps each migration in a transaction (25001 — the
    `0096_members-custom-fields.sql` header). A plain `CREATE INDEX` takes a SHARE lock on its table for the build.
- **G14 — Live-DB harness** (paths under `packages/domain/`).
  - `src/test-utils/integration-setup.ts` provides `setupLiveDb`, `getTx` (rolled back) and `hasDatabase`.
  - `tests/integration/_helpers.ts` provides `PARIWAR_A` / `PARIWAR_B`, `enterAppScope` and `enterAppRoleNoScope`.
  - `vitest.config.ts` includes `tests/**/*.test.ts` and `tests/integration/**/*.spec.ts`, and `@twt/domain` is already in
    the CI integration filter. ⚠ The REPO-ROOT `tests/integration/` is a placeholder that nothing runs.
  - RLS twin: `tests/integration/rls/alerts-policy-regression.spec.ts` (it sets the writer guard before a raw INSERT).
  - Concurrency twin: `tests/integration/alert/alert-stream-concurrency.spec.ts` (RR + barrier, its own pool,
    `session_replication_role='replica'` cleanup).
- **G15 — Lock and retry precedents.**
  - `FOR UPDATE` under the three-policy RLS shape: `announcement-channels/posts.ts`. It needs the UPDATE grant plus the
    SELECT and UPDATE policies' USING clauses.
  - SAVEPOINT retry: `reconciliation/reconciliation-review-write.ts`, under READ COMMITTED.
  - Lock before guard: `docs/domain-accessor-invariants.md` family (c).
- **G16 — `events_log` payload-expression indexes.**
  - `0079`: `CREATE UNIQUE INDEX "contribution_utr_attested_tr_uq" ON "events_log" ((payload ->> 'tr')) WHERE event_type =
    'contribution.utr-attested';` — global and partial.
  - Under RLS, `->>` is not leakproof, so a JSON predicate is a Filter, ⛔ an Index Cond (`0185:3`). Unique enforcement
    ignores RLS.
  - Hand-authored `events_log` indexes are named in `schema/events_log.ts`'s header (the 0185 lines), ⛔ declared on the
    Drizzle table.
  - The constraint name is read from the cause chain by `uniqueViolationConstraint` in `contribution/write.ts`. It is
    private, so copy its shape. `helpdesk/errors.ts` compares against `'events_log_stream_id_event_version_uq'`.
- **G17 — There is ⛔ `pariwars` table.** The twin migrations carry ⛔ tenant FK, and specs use `PARIWAR_A` unseeded.
- **G18 — Whole-row trigger precedent:** `0189_ground-inspection-questionnaire.sql`, in chained-key form —
  `(to_jsonb(NEW) - 'value_ciphertext' - 'value_code_indexes') IS NOT DISTINCT FROM (to_jsonb(OLD) - …)`. Postgres is
  **16** (`ci.yml` `postgres:16-alpine`).
- **G19 — Nothing in governance gates Epic 12.**
  - The ADR slot `ADR-NNNN-module-manifest-schema-versioning` is reserved in `docs/knowledge-transfer/adr-index.md`.
  - The only open items pointing at Epic 12 are 1.19's member-geo seam (12.2 consumes `state` / `district`) and D8's
    condition-shaped role / cohort re-trigger.

## ⚖️ Build decisions QE1–QE15 (ANSWERED 2026-10-31 — all as recommended, `2026-10-31-427`; amended by `2026-10-31-429` A1–A7)

- **QE1 — Home.**
  - `packages/domain/src/marketplace/`, ⛔ `packages/marketplace`. Exported as `export * as marketplace from
    './marketplace/index.js'`.
  - Tables go in `schema/`, RLS in `policies/`.
  - ⛔ contracts in 12.1: there is ⛔ route, and contracts serve "externally-consumed API surfaces only".
- **QE2 — Names:** see "Names at a glance".
  - TS row type: `MarketplaceModule`. Stream id: `module_id`.
  - `schema/marketplace_modules.ts` takes the filter / branding TYPES via `import type` from `../marketplace/filters.js`
    (type-only ⇒ ⛔ runtime cycle) and uses them with `$type<…>()`.
- **QE3 — Events, actors, triggers (A6).**
  - Events: `module.authored`, `module.scheduled`, `module.activated`, `module.lead_submitted`, `module.archived`.
    `marketplace/events.ts` carries a "PINNED SEAM" comment reconciling the epic's `module.lead-submitted`.
  - Actors: `moduleActorSchema = z.enum(['member','operator','trustee','system'])` (the claim set).
    - `system` iff `actorId === null`.
    - A lead is `actor: 'member'` with `actorId` = the member's id.
  - Commands COMPUTE `trigger` themselves (⛔ caller input): `module.author`, `module.schedule`, `module.activate`,
    `module.lead_submit`, `module.archive:<reason>`. The schema keeps `z.string().min(1)`.
  - Audit actions are the event-type strings.
- **QE4 — `pariwar_id uuid NOT NULL`, ⛔ FK (G17).**
  - ⛔ nullable, because:
    - the cross-Pariwar manifest is v2;
    - contracts are per-Pariwar (architecture §3.7);
    - `events_log.pariwar_id` is NOT NULL.
  - Re-trigger: the v2 cross-Pariwar manifest.
- **QE5 — Manifest columns.** ⭐ The DB enforces ONLY the six named CHECKs; every other rule below is zod-only, in
  `parseModuleManifest`.

  | Column | Type | Rule (where) |
  |---|---|---|
  | `module_id` | uuid PK, ⛔ default | caller-minted, passed to `authorModule` (QE15) |
  | `pariwar_id` | uuid NOT NULL, ⛔ FK | QE4 |
  | `partner_id` | uuid NOT NULL, ⛔ FK | `PartnerId`; partner identity is 12.2's |
  | `name_en`, `name_hi` | text NOT NULL | trimmed 1–120 (zod) |
  | `description_en`, `description_hi` | text NOT NULL | trimmed 1–2000 (zod) |
  | `eligibility_filter` | jsonb NOT NULL, `$type<EligibilityFilterV1>` | QE9 (zod) |
  | `scope_filter` | jsonb NOT NULL, `$type<ScopeFilterV1>` | QE9 (zod) |
  | `valid_from`, `valid_until` | timestamptz NOT NULL | `CONSTRAINT marketplace_modules_window CHECK (valid_until > valid_from)` |
  | `slot_capacity` | integer NULL (NULL = uncapped) | `CONSTRAINT marketplace_modules_capacity_positive CHECK (slot_capacity > 0)` |
  | `slots_remaining` | integer NULL — **projected** | `CONSTRAINT marketplace_modules_slots_pair CHECK ((slot_capacity IS NULL) = (slots_remaining IS NULL))`; `CONSTRAINT marketplace_modules_slots_range CHECK (slots_remaining >= 0 AND slots_remaining <= slot_capacity)` |
  | `lead_handoff_url` | text NOT NULL | ⭐ (zod, A3) `https:` only; ⛔ userinfo; **⛔ query string, ⛔ fragment** (`url.search === '' && url.hash === ''`); host ⛔ an IP literal (v4/v6) and ⛔ `localhost`; ≤ 2048 |
  | `lead_handoff_signing_key_secret_name` | text NOT NULL | `^[A-Za-z0-9_-]{1,255}$` (zod) — a Secret Manager NAME (G6), renamed from the epic's `_ref` |
  | `branding_bundle` | jsonb NOT NULL, `$type<ModuleBrandingBundle>` | `{ version: 1, logo_object_key: string(1–1024) \| null, accent_color_hex: /^#[0-9a-f]{6}$/ \| null }` `.strict()` (zod); C5 |
  | `manifest_schema_version` | smallint NOT NULL | `CONSTRAINT marketplace_modules_manifest_schema_version_v1 CHECK (manifest_schema_version = 1)` |
  | `current_state` | `marketplace_module_state` NOT NULL — **projected** | |
  | `state_event_version` | bigint NOT NULL — **projected** | |
  | `archive_reason` | `marketplace_module_archive_reason` NULL — **projected** | `CONSTRAINT marketplace_modules_archive_reason_pair CHECK ((current_state = 'archived') = (archive_reason IS NOT NULL))` |
  | `audit_id` | uuid NOT NULL, ⛔ FK — **projected** | the audit line of the MOST RECENT transition (unlike the genesis-only twins) |
  | `created_at` | timestamptz NOT NULL default `now()` | immutable |
  | `updated_at` | timestamptz NOT NULL default `now()` — **projected** | SET to `now()` on every transition |

  Indexes: `marketplace_modules_pariwar_id_idx (pariwar_id)` and `marketplace_modules_pariwar_state_idx (pariwar_id,
  current_state)`.

  **Deliberately NOT in 12.1:**
  - `commission_terms` → 12.2: admin-only home; PRD "never public"; OQ-4 open; trust-deed "disclosed" (§0 edge 8).
  - The external-URL CTA (FR-64 `target_url_or_form`) — Not addressed.
  - Lead delivery status → 12.5.
  - `module.restored` → 12.6.
- **QE6 — The lifecycle.** All arms are authored here: one command per event, called from tests only (I6).

  | From | Event | To | Guard (DB `now()`) | Failure |
  |---|---|---|---|---|
  | — | `module.authored` | `draft` | stream empty; manifest valid; **`valid_until > now()`** (A5 — a past `valid_from` is fine) | `ModuleGenesisAlreadyExistsError` / `ModuleManifestInvalidError` / `ModuleOutsideWindowError` |
  | `draft` | `module.scheduled` | `scheduled` | `now() < valid_from` | `ModuleOutsideWindowError` |
  | `draft` / `scheduled` | `module.activated` | `active` | `valid_from ≤ now() < valid_until` | `ModuleOutsideWindowError` |
  | `active` | `module.lead_submitted` | `active` (same-state) | QE7 / QE8 | QE7 / QE8 |
  | `draft` / `scheduled` / `active` | `module.archived` | `archived` | the reason's rule | `ModuleArchiveReasonNotSatisfiedError` |

  - Archive reasons:
    - `trustee_archived` — from any non-archived state;
    - `valid_until_reached` — `now() ≥ valid_until`, from any non-archived state;
    - `slot_capacity_exhausted` — only when `active`, capped and `slots_remaining = 0`.
  - `archived` is terminal in 12.1 (C3).
  - Guard order for schedule / activate / archive: row present (`ModuleGenesisMissingError`) → transition legal
    (`ModuleIllegalTransitionError`) → window / reason guard.
  - The window is half-open, `[valid_from, valid_until)`. FR-65 writes a closed interval; this is a variance, so that an
    archive at `valid_until` and a lead at `valid_until` cannot both be legal.
  - The reducer uses a pre-genesis `initial: 'draft'`. `module.authored` is NEVER legal through `projectModuleTransition`
    (TR2).
- **QE7 — Every transition locks the row first (A1).**
  - `scheduleModule`, `activateModule`, `submitModuleLead` and `archiveModule` FIRST run `SELECT … FROM
    marketplace_modules WHERE module_id = $1 AND pariwar_id = $2 FOR UPDATE`, then check their guards against the locked
    row, then call `projectModuleTransition(client, { …, lockedRow })`.
  - There is ONE lock order everywhere — row lock → `events_log` append → row UPDATE. This prevents the 40P01 deadlock
    that an append-first transition would cause against a lead (TR12). Under the lock, a version conflict is reachable
    only at genesis.
  - The lead path checks in this order, throwing at the first failure:
    1. row present (`ModuleGenesisMissingError`);
    2. **replay** (QE8 (i)) — returns the original result;
    3. state ≠ `active` → `ModuleNotActiveError` (`submitModuleLead` never throws `ModuleIllegalTransitionError`);
    4. `now() ∉ [valid_from, valid_until)` → `ModuleOutsideWindowError`;
    5. capped and `slots_remaining = 0` → `ModuleSlotsExhaustedError`;
    6. QE8 (ii);
    7. QE8 (iii).
  - **⛔ Automatic archive at zero** (confirmed `-427`): a capped module stays `active` at 0 places until an archive is
    emitted, and 12.6 decides when (C2).
  - Payload: `{ lead_id, member_id, slots_remaining_after: number | null, from_state: 'active', to_state: 'active',
    trigger, actor }`, `.strict()`, ⛔ PII.
- **QE8 — One place per member per module; the lead id is the idempotency key (A2).**
  - `leadId: ModuleLeadId` is CALLER-supplied. Under the row lock:
    - (i) a `module.lead_submitted` with the same `lead_id` on THIS stream for the SAME `member_id` → return `{ replayed:
      true, leadId, eventVersion, slotsRemainingAfter }`, read from that event; ⛔ event, ⛔ decrement;
    - (ii) the same `lead_id` for a DIFFERENT member on this stream → `ModuleLeadDuplicateError`;
    - (iii) the same member with a different `lead_id` → `ModuleLeadAlreadySubmittedError`.
  - Two partial unique indexes on `events_log` (the `0079` precedent) are the guarantee:
    - `CREATE UNIQUE INDEX "module_lead_member_uq" ON "events_log" ("stream_id", (payload ->> 'member_id')) WHERE
      event_type = 'module.lead_submitted';`
    - `CREATE UNIQUE INDEX "module_lead_id_uq" ON "events_log" ((payload ->> 'lead_id')) WHERE event_type =
      'module.lead_submitted';` — global, so a `lead_id` reused on ANOTHER module (even another tenant's) is a 23505 →
      `ModuleLeadDuplicateError`.
  - Map each 23505 by constraint name, using a local copy of `contribution/write.ts`'s cause-chain walker (G16):
    - `module_lead_member_uq` → `ModuleLeadAlreadySubmittedError`;
    - `module_lead_id_uq` → `ModuleLeadDuplicateError`;
    - `events_log_stream_id_event_version_uq` → `ModuleStreamConcurrencyError`.
  - In `projectModuleGenesis`, a 23505 on `events_log_stream_id_event_version_uq` or `marketplace_modules_pkey` →
    `ModuleGenesisAlreadyExistsError`.
  - `member_id` / `lead_id` in the payload are validated as LOWER-CASE uuids
    (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`), so case cannot bypass the text-keyed indexes.
    The index key names equal the zod keys exactly.
  - The pre-check reads THIS stream only: `SELECT payload FROM events_log WHERE pariwar_id = $ AND stream_id = $ AND
    event_type = 'module.lead_submitted' AND (payload->>'lead_id' = $ OR payload->>'member_id' = $) LIMIT 2`. The JSON
    predicate is a Filter, bounded by the `stream_id` index (G16).
  - ⛔ cross-stream `lead_id` pre-check (RLS hides other tenants); that case comes only from the 23505.
  - The lead path ⛔ replays the stream.
- **QE9 — Filter grammars: closed, versioned, `.strict()`, validated at WRITE by `parseModuleManifest`, ⛔ evaluated in
  12.1.**
  - **`ScopeFilterV1`** is one of:
    - `{ version: 1, scope: 'members-all' }`
    - `{ version: 1, scope: 'state', values: string[] }`
    - `{ version: 1, scope: 'district', values: string[] }`

    `values` has 1–200 entries, unique, non-empty, ⛔ normalised. Excluded:
    - ⛔ `'public'` — the shelf is members-only;
    - ⛔ `block` — never resolvable;
    - **`role` / `cohort` — ABSENT, rejected at write** (confirmed `-427`). D8's re-trigger is unchanged: the first
      surface that must target by role / cohort, which 12.2 MAY be.

    Values are ⛔ validated against the geo tree in 12.1 (C11).
  - **`EligibilityFilterV1`** is `{ version: 1, clauses: Clause[] }`, with 0–8 clauses and each `kind` at most once.
    - The v1 clause is `{ kind: 'member_state_in', states: (MemberLifecycleState minus 'withdrawn' | 'anonymized')[] }`,
      non-empty and unique (A4).
    - Zero clauses = no restriction beyond scope.
    - The epic's eligibility "district" lives in `ScopeFilterV1`.
    - `age_band` is Not addressed (it would decrypt Tier-1 DOB) → 12.3.
  - The grammar grows additively within `version: 1`; a breaking change is `version: 2`.
  - **`parseModuleManifest(input: unknown): ModuleManifestV1`.**
    - Input: snake_case JSON with exactly the QE5 content keys — `partner_id`, `name_en`, `name_hi`, `description_en`,
      `description_hi`, `eligibility_filter`, `scope_filter`, `valid_from`, `valid_until`, `slot_capacity`,
      `lead_handoff_url`, `lead_handoff_signing_key_secret_name`, `branding_bundle`.
    - `valid_*` are ISO strings in and `Date` out.
    - NOT input: `module_id`, `pariwar_id`, `manifest_schema_version` (command args / constants).
    - It throws `ModuleManifestInvalidError`, wrapping the ZodError.
    - The window-vs-`now()` rule (A5) is checked by `authorModule` against DB time, ⛔ by the parser.
- **QE10 — No route, UI, permission key, consent type or job.** `module_lead_handoff` is 12.3's.
- **QE11 — Manifest content is immutable after `module.authored`.** A correction = archive + a new module (C10). ⛔ revise
  event (re-trigger: 12.2). Recorded in the ADR.
- **QE12 — Reads (explicit `pariwarId`):**
  - `getModule(db, pariwarId, moduleId)`.
  - `listModulesForPariwar(db, pariwarId, { state?, limit? })` — ordered `created_at DESC, module_id DESC`; uses
    `.limit(clampLimit(opts.limit, { default: LIST_MODULES_DEFAULT_LIMIT, cap: LIST_MODULES_MAX_LIMIT }))` inline, with
    `LIST_MODULES_DEFAULT_LIMIT = 50` and `LIST_MODULES_MAX_LIMIT = 200` (TR5).
  - `getModuleStateAt(db, pariwarId, moduleId, at)` — STATE only, in the `member/read.ts` `getMemberStateAt` shape plus
    `eq(eventsLog.pariwarId, pariwarId)`. Mind its clock-domain caveat.

  ⛔ shelf read.
- **QE13 — Errors (`marketplace/errors.ts`).**
  - Lifecycle and projector:
    - `ModuleIllegalTransitionError`
    - `ModuleStreamConcurrencyError` + `isModuleStreamVersionConflict`
    - `ModuleGenesisAlreadyExistsError`
    - `ModuleGenesisMissingError` (also thrown when the locked row is absent)
    - `ModulePersistError`
    - `ModuleProjectorInputError` (actor / actorId mismatch; flat inputs vs payload)
    - `ModuleManifestInvalidError`
    - `ModuleArchiveReasonNotSatisfiedError`
  - Lead: `ModuleNotActiveError`, `ModuleOutsideWindowError`, `ModuleSlotsExhaustedError`,
    `ModuleLeadAlreadySubmittedError`, `ModuleLeadDuplicateError`.
  - Direct write: `ModuleStateDirectWriteError` + `MODULE_STATE_DIRECT_WRITE_CODE` +
    `MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX` + `isModuleStateDirectWriteError`. Only this set is exported at the TOP
    level of `domain/src/index.ts` (the pool trio shape); everything else goes through the `marketplace` namespace.
  - ⛔ API error-mapper entry.
- **QE14 — Back-brand the helpdesk seam** (type-only).
  - Schema: `moduleId: uuid('module_id').$type<ModuleId>()`. Projector: `ProjectTicketGenesisInput.moduleId: ModuleId |
    null`.
  - Rewrite only the `module_id` half of the shared comment, in BOTH files.
  - In `apps/api/src/modules/helpdesk/handlers.ts`: `moduleId: body.module_id ? ids.moduleId(body.module_id) : null`.
  - The `helpdesk.ticket_created` payload's `module_id` becomes lower-case, which is harmless.
- **QE15 — Audit pairing is the CALLER's (G12).**
  - Commands take `client: pg.PoolClient` (`SET LOCAL ROLE twt_app` + `setPariwarScope` already done) and a REQUIRED
    `auditId`. ⛔ domain function calls `withCompensatingAudit`.
  - The caller (the 12.2 / 12.3 / 12.6 routes and jobs):
    1. mints `moduleId` / `leadId`;
    2. runs `checkModuleLeadAllowed` BEFORE the wrapper;
    3. calls `audit.withCompensatingAudit(servicePool, { auditIntent, mutate: ({ auditId }) => marketplace.<command>(client,
       { …, auditId }) })` with `resourceLocator` `module/<id>`.
  - A lead refused by the pre-check writes ⛔ audit lines. A refusal under the lock (a genuine race) writes the intent
    line + `_rolled_back`.
  - The lead's backstop retry stays inside ONE command call, so it uses one `auditId`.

### Exact signatures (Task 5 — copy these)

```ts
type ModuleEventActor = 'member' | 'operator' | 'trustee' | 'system';
interface ModuleCommandBase {
  pariwarId: PariwarId; moduleId: ModuleId; auditId: string;
  actor: ModuleEventActor; actorId: string | null;            // 'system' iff null (else ModuleProjectorInputError)
}
interface ModuleTransitionResult { eventId: string; eventVersion: number; fromState: MarketplaceModuleState; state: MarketplaceModuleState }

authorModule(client: pg.PoolClient, i: ModuleCommandBase & { manifest: unknown }): Promise<{ eventId: string; eventVersion: 1; state: 'draft' }>
scheduleModule(client: pg.PoolClient, i: ModuleCommandBase): Promise<ModuleTransitionResult>
activateModule(client: pg.PoolClient, i: ModuleCommandBase): Promise<ModuleTransitionResult>
archiveModule(client: pg.PoolClient, i: ModuleCommandBase & { reason: MarketplaceModuleArchiveReason }): Promise<ModuleTransitionResult & { reason: MarketplaceModuleArchiveReason }>
submitModuleLead(client: pg.PoolClient, i: ModuleCommandBase & { leadId: ModuleLeadId; memberId: MemberId })
  : Promise<ModuleTransitionResult & { replayed: false; slotsRemainingAfter: number | null }
         | { replayed: true; leadId: ModuleLeadId; eventVersion: number; slotsRemainingAfter: number | null }>
checkModuleLeadAllowed(db: Db, a: { pariwarId: PariwarId; moduleId: ModuleId; memberId: MemberId; leadId: ModuleLeadId })
  : Promise<{ ok: true; replayed: boolean } | { ok: false; refusal: ModuleLeadRefusal }>
type ModuleLeadRefusal = 'not_found' | 'not_active' | 'outside_window' | 'slots_exhausted' | 'duplicate_lead' | 'already_submitted'; // QE7 order

// marketplace/project.ts — ⛔ re-exported from marketplace/index.ts (specs import from src/marketplace/project.js)
projectModuleGenesis(client: pg.PoolClient, i: { pariwarId; moduleId; manifest: ModuleManifestV1; auditId; actor; actorId }): Promise<…>
projectModuleTransition(client: pg.PoolClient, i: {
  pariwarId; moduleId; eventType: Exclude<ModuleEventType, 'module.authored'>; payload: unknown; auditId; actor; actorId;
  lockedRow: { currentState: MarketplaceModuleState; stateEventVersion: number; slotsRemaining: number | null; slotCapacity: number | null };
}): Promise<ModuleTransitionResult>
```

`projectModuleTransition` runs these steps, in order:
1. Read `SELECT max(event_version)` for the stream. If it ≠ `lockedRow.stateEventVersion`, throw
   `ModuleStreamConcurrencyError`.
2. Set `fromState = lockedRow.currentState`. Legality is `nextModuleState(fromState, eventType) !== null`.
3. Cross-validate `payload.from_state === fromState` and `payload.to_state === nextModuleState(…)`. For a lead, also
   `payload.slots_remaining_after === (slotsRemaining === null ? null : slotsRemaining − 1)`. A mismatch →
   `ModuleProjectorInputError`.
4. Parse the payload `.strict()` and insert it at `stateEventVersion + 1`.
5. `SET LOCAL app.marketplace_module_state_writer = 'on'` → UPDATE (the I1 columns, `updated_at = now()`, `audit_id`) →
   `'off'` in a `finally`.

It ⛔ replays payloads. `authorModule` needs ⛔ time guard beyond A5; `created_at` / `updated_at` take their defaults.

**Payload schemas** (`marketplace/events.ts`, all `.strict()`; `auditShape = { from_state, to_state, trigger:
z.string().min(1), actor: moduleActorSchema }`):
- `ModuleAuthoredPayloadSchema`: `from_state: z.null()`, `to_state: z.literal('draft')`, plus `module_id`, `pariwar_id`,
  `manifest_schema_version: z.literal(1)` and every QE5 content column in snake_case. Timestamps are
  `z.string().datetime({ offset: true })`.
- `ModuleScheduledPayloadSchema` / `ModuleActivatedPayloadSchema`: the audit shape only, with `from_state` / `to_state`
  literals per arm.
- `ModuleLeadSubmittedPayloadSchema`: QE7's shape. It accepts only `from_state === to_state === 'active'`, with lower-case
  ids.
- `ModuleArchivedPayloadSchema`: the audit shape + `reason: z.enum(MARKETPLACE_MODULE_ARCHIVE_REASONS)`.

## Invariants (I)

- **I1** — The projected columns `current_state`, `state_event_version`, `slots_remaining`, `archive_reason`, `audit_id`
  and `updated_at` are written ONLY by `projectModuleGenesis` / `projectModuleTransition`. Two mechanisms enforce this:
  - the trigger rejects any unguarded UPDATE or INSERT;
  - the AST gate.
- **I2** — Every other column is immutable after INSERT, even with the guard on. The trigger compares the whole row
  minus the I1 columns, so a column added later is immutable by default (C12).
- **I3** — On INSERT: `current_state = 'draft'`, `state_event_version = 1`, `slots_remaining IS NOT DISTINCT FROM
  slot_capacity`, and `archive_reason IS NULL`. With the guard on:
  - `state_event_version` strictly increases;
  - `slots_remaining` stays the same or drops by exactly 1;
  - a state change never moves `slots_remaining`.
- **I4** — After every projector call, the row equals `foldModuleProjection(loadEvents(module_id))` on `{ state,
  version, slotsRemaining, archiveReason }`.
- **I5** — For a capped module, `0 ≤ slots_remaining ≤ slot_capacity`, and `slot_capacity − slots_remaining` equals the
  number of `module.lead_submitted` events, under concurrency. For an uncapped module, both columns stay NULL.
- **I6** — No production call site exists for any 12.1 write command (grep in Completion Notes).
- **I7** — `PERMISSION_CATALOG_VERSION` stays 56; no role, permission key or consent value is added.
- **I8** — No new `account-frozen` source or reason; `member/overlay.ts` is untouched.
- **I9** — Event payloads carry no Tier-1 PII; the member is identified only by a lower-case `member_id`.
- **I10** — Every transition takes the row lock before any `events_log` append (one lock order, A1).

## Acceptance Criteria

0. **AC0 — governance first.** ⭐ MET.
   - QE1–QE15 are in `-427` (`a22dbdec`) and the amendments in `-429` (`0168592b`), each committed ALONE before code.
   - The four ASKs carry BigDev's answer (*"QE1-QE15 as recommended."*); the amendments carry *"apply all findings"*.
   - C1–C12 are in `deferred-work.md` ("Deferred from: story 12-1-…"), with "⭐ INHERITED FROM 12.1" notes under 12.2–12.6
     in `epics.md`.
1. **AC1 — table.** **Given** `0193_marketplace-modules.sql` is applied, **then**:
   - `marketplace_modules` has exactly QE5's columns, types, NOT NULLs, six named CHECKs and two indexes, with pgEnums
     sourced from the domain tuples;
   - **and** `twt_app` has SELECT / INSERT / UPDATE (no DELETE);
   - **and** RLS is ENABLE + FORCE, with the three named policies on `pariwar_id = nullif(current_setting('app.pariwar_id',
     true), '')::uuid`;
   - **and** QE8's two `events_log` indexes exist. A spec asserts `pg_indexes.indexdef` contains `'member_id'` /
     `'lead_id'` and `module.lead_submitted` (the `contribution-suppression-index-policy-regression.spec.ts` shape).
2. **AC2 — guarded state (I1–I3).** Each of these is rejected with P0001 and `MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX`:
   - an unguarded INSERT;
   - an unguarded UPDATE of ANY column, including `audit_id` alone or `slots_remaining` alone;
   - a guarded UPDATE that changes any I2 column (at least `name_en`, `scope_filter`, `pariwar_id`, `created_at`);
   - a guarded INSERT that violates I3 — the uncapped `(NULL, NULL)` case passes, `(5, 4)` fails;
   - a guarded UPDATE with a non-increasing version;
   - a guarded UPDATE that moves `slots_remaining` by anything other than 0 / −1;
   - a guarded UPDATE that changes state AND moves `slots_remaining`.

   ⚠ A guarded `slots_remaining` 0 → −1 passes the trigger and fails `marketplace_modules_slots_range` with **23514**.
   Assert that separately.
3. **AC3 — events.**
   - The five payload schemas are exported under their names, along with `MODULE_EVENT_TYPES` and
     `MODULE_EVENT_PAYLOAD_SCHEMAS … satisfies Record<ModuleEventType, z.ZodTypeAny>`.
   - AR-14's `timestamp` / `pariwar_id` are the `events_log` columns `occurred_at` / `pariwar_id`, ⛔ payload keys.
   - **And** all five are registered in `packages/events/src/registry.ts`:
     - add `marketplace` to the import;
     - each `entry.schema` is the same object;
     - description template: *"`<event>` (`<from>` → `<to>`) on the MODULE stream (stream_id = module_id) (Story 12.1).
       ⛔ No production emitter in 12.1 (I6); the emitting surface is 12.2 / 12.3 / 12.6 (unverified until built)."*;
     - a section header comment mirrors the helpdesk block.
   - **And** `packages/events/tests/module-registry-coverage.test.ts` asserts set equality + schema identity.
4. **AC4 — reducer.** `marketplace/state.ts` uses `defineStateMachine` with `initial: 'draft'` and `transitions`
   **exactly**:
   - `draft→scheduled` (`module.scheduled`);
   - `draft→active` and `scheduled→active` (`module.activated`);
   - `active→active` (`module.lead_submitted`);
   - `draft` / `scheduled` / `active` → `archived` (`module.archived`);
   - ⛔ `module.authored` row.

   `reduce` = table lookup, else identity.
   - **And** `nextModuleState` returns the table's `to`, or `null`.
   - **And** a test asserts table / reducer agreement for EVERY (state × event type) pair.
   - **And** the exported pure `foldModuleProjection(rows: readonly { type: string; payload: unknown; eventVersion:
     number }[]) → { state, version, slotsRemaining, archiveReason }`:
     - `version` = the last `eventVersion`;
     - `slot_capacity` comes from `ModuleAuthoredPayloadSchema.safeParse` (on failure `slotsRemaining` is null; the fold
       never throws);
     - `slotsRemaining` = `slot_capacity` − the count of lead events.
   - **And** `toModuleEvent(row)` is exported for tests.
5. **AC5 — commands (QE7, QE15).**
   - The commands match "Exact signatures". They write only through the projector (I1), take the row lock first (I10),
     and enforce QE6 / QE7 against DB `now()`.
   - **And** each failed guard throws its QE13 class with no event and the row unchanged, and the caller's transaction
     stays usable (SAVEPOINT discipline, Task 5.2).
   - **And** `projectModuleTransition` rejects `module.authored` with `ModuleGenesisAlreadyExistsError`; an actor /
     actorId mismatch → `ModuleProjectorInputError`.
   - **And** I4 holds after every command.
   - **And** no domain function calls `withCompensatingAudit`.
   - **And** ONE spec composes `submitModuleLead` under the real wrapper (recipe in Testing standards) and asserts, by
     baseline, the intent row plus — for a race refusal — the `module.lead_submitted_rolled_back` row with
     `resourceLocator = 'module/<id>'`.
6. **AC6 — places and idempotency (I5, QE7, QE8).** **Given** `slot_capacity = 1`:
   - two connections at READ COMMITTED submitting for two members produce exactly one event and `slots_remaining = 0`:
     one fulfils, the other gets `ModuleSlotsExhaustedError` (assert symmetrically);
   - **and** a concurrent `archiveModule` racing a `submitModuleLead` on the same module ends in typed outcomes, NEVER
     40P01;
   - **and** the identical call replayed returns `{ replayed: true }` with no event;
   - **and** the same member with a NEW `leadId` gets `ModuleLeadAlreadySubmittedError`;
   - **and** a `leadId` reused for a DIFFERENT member gets `ModuleLeadDuplicateError`, both on the same module (pre-check
     / locked check) and on another module (23505). Neither decrements;
   - **and** an uncapped module accepts leads with `slots_remaining_after: null`;
   - **and** a lead on a non-active module → `ModuleNotActiveError`, and outside the window → `ModuleOutsideWindowError`,
     with no event (the clock spec);
   - **and** the backstop retry is `MAX_LEAD_APPEND_ATTEMPTS = 3` attempts total, backoff `min(200, 10·2^attempt)` ms;
     after the 3rd conflict `ModuleStreamConcurrencyError` propagates (DB-free);
   - **and** the GENESIS race (two `authorModule` with the same `moduleId`, RR + barrier) leaves exactly one stream; the
     loser gets `ModuleGenesisAlreadyExistsError`.
7. **AC7 — grammars + manifest (QE5, QE9).** `parseModuleManifest` accepts every valid form and REJECTS each of these
   with `ModuleManifestInvalidError`:
   - an unknown scope (`role`, `cohort`, `public`, `block`);
   - empty or duplicate `values`;
   - an unknown clause (`age_band`) or a duplicate clause;
   - a state not allowed (including `withdrawn`, `anonymized`);
   - extra keys, or `version ≠ 1`;
   - a URL that is `http:`, or has userinfo, a **query string, a fragment, an IP-literal host, or `localhost`**;
   - a bad secret name;
   - `valid_until ≤ valid_from`;
   - `slot_capacity ≤ 0`.

   **And** `authorModule` refuses `valid_until ≤ now()` with `ModuleOutsideWindowError` and accepts a past `valid_from`.
   No evaluator is exported.
8. **AC8 — reads (QE12).** Both reads are isolated from a second tenant; the list is capped; `getModuleStateAt` returns
   the state between two transitions.
9. **AC9 — gate.**
   - Files: `scripts/marketplace-module-state-invariant/{check,lib,lib.test}.ts` (copied from helpdesk) + `README.md`
     (from `scripts/pool-state-invariant/README.md`).
   - Renames: `MARKETPLACE_MODULES_TABLE = 'marketplaceModules'`; `GUARDED_COLUMNS = new Set(['currentState',
     'stateEventVersion','slotsRemaining','archiveReason','auditId','updatedAt'])`; `scanMarketplaceModuleStateWrites`;
     `MarketplaceModuleStateWriteFinding`.
   - Allowlist: `marketplace/project.ts` → `projectModuleGenesis`, `projectModuleTransition`.
   - **And** `lib.test.ts` flags `.set({ slotsRemaining })` and `.set({ auditId })` outside the allowlist, while `scan…` +
     `isAllowlistedWrite` produce zero findings for the full guarded `.set({ … })` written directly inside
     `projectModuleTransition`.
   - **And** the known-bad cases live in `lib.test.ts` (the helpdesk / pool practice); record the revert-sanity check.
   - Wire it exactly as G2's three lines, renamed. ⛔ "match the column alignment" — the existing alignment is
     inconsistent.
10. **AC10 — ids + seam.** The three brands go in `packages/domain/src/ids/index.ts`, with tests in
    `packages/domain/tests/ids/branded-ids.test.ts`. QE14 is applied, including `apps/api`. `pnpm typecheck` is green.
11. **AC11 — ADR.** `docs/adr/ADR-0044-module-manifest-schema-versioning.md`, from `_adr-template.md`, **Status
    `drafted`** (an author decision; no ratification).
    - It records QE11 + QE4 + QE9's version rule. Alternatives considered: a nullable `pariwar_id`; a mutable manifest
      with `module.revised`; declared-and-empty role / cohort; an unversioned grammar.
    - **And** the `adr-index.md` row is renamed `ADR-NNNN-…` → `ADR-0044-module-manifest-schema-versioning`, with Status
      `drafted` and the last column set to the file path.
    - **And** a dated reconciliation note is appended (re-count `grep -cE '^\| ADR-'`; the total is unchanged).
    - Commit both ALONE: `governance: ADR-0044 drafted — module manifest schema versioning` (the `35c39dcf` precedent).
12. **AC12 — full gate.** `pnpm ci:local` is green on a fresh Postgres container, and the result is recorded.

## Tasks / Subtasks

- [ ] **Task 0 — governance first (AC0).** 0.2–0.4 DONE 2026-10-31. ⭐ **0.1 runs FIRST in `bmad-dev-story`. Do NOT
      write code before 0.1 is done and its greps are in the Debug Log.**
  - [ ] 0.1 `git fetch origin`, and rebase on `origin/main` if it moved.
        - Re-grep NUMBERS across every branch and worktree: decision id; migration + journal `when`; ADR;
          `PERMISSION_CATALOG_VERSION`; the ledger letter in BOTH ledgers.
        - Re-verify G2, G4, G5, G7, G11 and G17.
        - Run 0.1 again at each numbered commit.
  - [x] 0.2 BigDev: *"QE1-QE15 as recommended."* · amendments: *"apply all findings"*.
  - [x] 0.3 `-427` (`a22dbdec`) · `-429` (`0168592b`), each committed alone.
  - [x] 0.4 `deferred-work.md` "Deferred from: story 12-1-…" (C1–C12) · `epics.md` INHERITED notes under 12.2–12.6.
- [ ] **Task 1 — ids (AC10).**
  - Add the brands (`uuidBrand`) and their tests.
  - QE14:
    - the schema: `moduleId: uuid('module_id').$type<ModuleId>()`;
    - `ProjectTicketGenesisInput.moduleId`;
    - BOTH comments (the `module_id` half only);
    - the one line in `apps/api/src/modules/helpdesk/handlers.ts`.
- [ ] **Task 2 — schema + migration + RLS (AC1, AC2).**
  - [ ] 2.1 `schema/marketplace_modules.ts`: a header block stating I1–I3 and I10, plus `import type` for the filter types
        (QE2). Export it from `schema/index.ts`.
  - [ ] 2.2 `policies/marketplace-modules-rls.ts`: the three named policies (NOT `for:'all'`). Export from
        `policies/index.ts`.
  - [ ] 2.3 HAND-AUTHOR `0193_marketplace-modules.sql`. Do NOT run `db:generate`. Separate statements with
        `--> statement-breakpoint`.
        - The enums, the table, the six named CHECKs and the two indexes.
        - `GRANT SELECT, INSERT, UPDATE … TO twt_app`.
        - RLS ENABLE + FORCE, and the three policies.
        - QE8's two `events_log` partial unique indexes. The header notes:
          - the SHARE lock on `events_log` during the build;
          - `CONCURRENTLY` is impossible inside drizzle-kit's transaction (25001, the `0096` header);
          - the build is fast because no `module.lead_submitted` rows exist yet.
        - The trigger fn + trigger. Every RAISE uses `MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX` + `ERRCODE 'P0001'`. Use
          `IS DISTINCT FROM` throughout, NOT `<>` / `=`.
          - **INSERT:**
            - the guard `IS DISTINCT FROM 'on'` → RAISE;
            - `NEW.current_state IS DISTINCT FROM 'draft' OR NEW.state_event_version IS DISTINCT FROM 1 OR
              NEW.slots_remaining IS DISTINCT FROM NEW.slot_capacity OR NEW.archive_reason IS NOT NULL` → RAISE.
          - **UPDATE:**
            - (a) the guard not 'on' → RAISE unconditionally;
            - (b) `(to_jsonb(NEW) - 'current_state' - 'state_event_version' - 'slots_remaining' - 'archive_reason' -
              'audit_id' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - …same chain…)` → RAISE even when guarded.
              This is the `0189` chained-key form; `- ARRAY[…]` is equivalent on PG16;
            - (c) `NEW.state_event_version <= OLD.state_event_version` → RAISE;
            - (d) `NEW.slots_remaining IS DISTINCT FROM OLD.slots_remaining AND NEW.slots_remaining IS DISTINCT FROM
              OLD.slots_remaining - 1` → RAISE;
            - (e) `NEW.current_state IS DISTINCT FROM OLD.current_state AND NEW.slots_remaining IS DISTINCT FROM
              OLD.slots_remaining` → RAISE.
          - Header note: ⚠ a future STORED GENERATED column reads NULL in a BEFORE trigger's NEW, so (b) would reject
            every guarded UPDATE. Add any such column to the exclusion chain (C12).
        - Hand-add the `_journal.json` entry (idx 193, `when` > every sibling, trailing newline).
        - Add a header comment line to `schema/events_log.ts` naming `module_lead_member_uq` / `module_lead_id_uq`
          (migration 0193), mirroring the 0185 lines. Do NOT declare them on the Drizzle table.
- [ ] **Task 3 — events (AC3).**
  - `marketplace/events.ts`: the PINNED SEAM, `moduleActorSchema`, `auditShape`, the five named schemas and the tuple.
  - Registry: add the import, the five entries (description template) and the section header.
  - `packages/events/tests/module-registry-coverage.test.ts`.
- [ ] **Task 4 — filters + manifest (AC7).** `marketplace/filters.ts`:
  - `ScopeFilterV1`, `EligibilityFilterV1` and `ModuleBrandingBundle` (schemas + exported types);
  - `parseModuleManifest`, per the QE9 contract and QE5's zod rules;
  - doc comments stating "zero clauses" and each absence (role / cohort / age_band / block / public; withdrawn /
    anonymized) with its re-trigger.
- [ ] **Task 5 — reducer, projector, commands, reads, errors (AC4, AC5, AC6, AC8).**
      `marketplace/{state,project,commands,read,errors,index}.ts`, per "Exact signatures".
  - `index.ts` does NOT re-export the projectors.
  - Add the namespace export and the direct-write set to `domain/src/index.ts`.
  - [ ] 5.1 The projector, as specified under "Exact signatures".
        - ⚠ **Legality is `nextModuleState(...) !== null`, NOT `toState !== fromState`; copying helpdesk makes every lead
          illegal (TR1).**
        - ⚠ **It does NOT replay the stream; it takes `lockedRow` (TR12).**
        - Every guarded write sits LEXICALLY in the two projector bodies — no inner named arrow or helper — or the gate
          flags it (G2).
  - [ ] 5.2 Commands. Every transition command's FIRST statement is `SELECT … FOR UPDATE` (QE7, I10). A missing row →
        `ModuleGenesisMissingError`. Then the guards, in QE6 / QE7 order.
        - `submitModuleLead`: QE8 (i)–(iii), then up to `MAX_LEAD_APPEND_ATTEMPTS = 3` attempts.
        - Each attempt runs inside `SAVEPOINT module_lead_append` and re-issues the `FOR UPDATE` (PG16 keeps a lock taken
          before the loop).
        - On ANY error, `ROLLBACK TO SAVEPOINT` BEFORE mapping or rethrowing, so the caller's transaction stays usable.
          `RELEASE` on success.
        - Map 23505 via the cause-chain walker (QE8).

        ⚠ **A 23505 aborts the transaction; a retry without a SAVEPOINT fails (TR3).**
  - [ ] 5.3 `checkModuleLeadAllowed`: a read-only pre-check in QE7 order, returning `{ ok: true, replayed }` or a
        `ModuleLeadRefusal`.
  - [ ] 5.4 DB time via `select now()` inside the transaction, NOT `new Date()` (TR4).
- [ ] **Task 6 — gate (AC9).** Copy, rename, README, wire, revert-sanity.
- [ ] **Task 7 — ADR (AC11).** The ADR, the index row flip and the reconciliation note, committed alone.
- [ ] **Task 8 — tests (AC1–AC8).** Per Testing standards; paths under `packages/domain/` / `packages/events/`, NOT the
      repo root. Every assertion names a typed error class.
- [ ] **Task 9 — verify + ledger (AC12).**
  - `pnpm ci:local` on a fresh container. Set `DATABASE_URL` to the story's port for every push
    ([[project_prepush_hook_inherits_5432]]).
  - Completion Notes: the I6–I9 greps and the variance list.
  - Prepend the ledger lines safely to BOTH ledgers, with a letter ≥ the one re-grepped at 0.1
    ([[project_sprint_status_safe_prepend]]). Row → `review`.

## Dev Notes

### Current state (what this story changes, what must be preserved)

- **The helpdesk `moduleId` seam:** see QE14. Preserve:
  - the column, the migration and every helpdesk test;
  - nullability;
  - `validityLookupId` (still unbranded).

  `member-handlers.ts` is unchanged.
- **`packages/events/src/registry.ts`:** add the import + 5 entries. Preserve every existing entry and the `satisfies`
  shape.
- **Additive exports only:** `packages/domain/src/{index,ids/index,schema/index,policies/index}.ts`.
- **One change each:**
  - `schema/events_log.ts` — a header comment line;
  - `package.json`, `scripts/ci-local.sh`, `.github/workflows/ci.yml` — the gate wiring.
- **`docs/knowledge-transfer/adr-index.md`:** one row + a reconciliation note.
- **Do NOT touch:**
  - `member/overlay.ts` (I8);
  - `state-machine.ts`;
  - `rbac/permissions.ts` (I7);
  - `schema/consent_records.ts`;
  - `packages/contracts/src/modules/README.md`;
  - the API error mapper;
  - `contribution/write.ts` — copy its walker; do NOT refactor it.

### Traps (TR)

- **TR1 — A same-state lead.** See Task 5.1.
- **TR2 — Genesis legality** is "stream empty", checked in `projectModuleGenesis`. `projectModuleTransition` rejects
  `module.authored`.
- **TR3 — A 23505 aborts the transaction.** See Task 5.2. drizzle wraps pg errors, so walk `.cause` for `code` /
  `constraint`.
- **TR4 — `now()` is the TRANSACTION START.**
  - One transaction has ONE `now()`, so legs with disjoint guards cannot share a transaction (use the clock spec).
  - A lead that began before `valid_until` and waited on the row lock is judged at its start time. QE6's "cannot both be
    legal" holds per instant; across transactions, the lock serialises.
- **TR5 — `domain-accessor-invariants` rejects `.limit(NAMED_CONST)`.** Use `clampLimit(...)` inline. Only the full
  `ci:local` runs this gate.
- **TR6 — REPEATABLE READ on the last-place spec gives 40001.** The last-place and archive-vs-lead races run at READ
  COMMITTED. Only the genesis race uses RR + barrier.
- **TR7 — Contracts must NOT import `@twt/domain`** (Metro). 12.1 adds no contracts.
- **TR8 — Migration ordering.** A sibling's later `when` landing first makes drizzle skip this migration (`-332` d2;
  [[project_sibling_migration_when_order_shared_db]]). Do NOT regenerate an applied migration (42P07).
- **TR9 — Read the registry for spellings, NOT the epic.** `claim.intake.initiated` is really `claim.intake_initiated`.
- **TR10 — A literal `0084` trigger copy guards only two columns.** Use Task 2.3's trigger.
- **TR11 — Concurrency and clock specs own their commits:** their own `pg.Pool`, `session_replication_role = 'replica'`
  cleanup, and they declare `hasDatabase` (the AI-10-5 guard).
- **TR12 — Copying the helpdesk projector's append-then-UPDATE order** under a lead's row lock deadlocks (40P01, which is
  unmapped). Every transition locks first (I10).

### Carried to sibling stories (C) — full text in `deferred-work.md` "Deferred from: story 12-1-…". ⭐ Build NONE of these.

- **C1 → 12.3:** the offerable rule (`active` + in window + places left); evaluate fail-closed.
- **C2 → 12.6 (or 12.2):**
  - (a) immediate vs daily archive at zero;
  - (b) nothing activates a `scheduled` module;
  - (c) sweep stale `draft` / `scheduled` modules;
  - (d) a cross-tenant indexed candidate scan, plus a rule for which reason wins.

  Cost: an offer can stall for up to a day.
- **C3 → 12.6:** `module.restored` — its target state, the grace window, and its meaning after `valid_until_reached` / at
  0 places. New values are judged by §0 (edge 6).
- **C4 → 12.4:** the overlay lifts on settle / deny / close. Keying on the durable claim fact is a new `-147` cl.3 reason,
  so re-examination is MANDATORY.
- **C5 → 12.2 / 12.3:** partner colours never touch the shelf chrome.
- **C6 → 12.3 / 12.5:** partner data has no basis on record — route it to Panel / counsel BEFORE anything leaves.
- **C7 → 12.5:** the signing scheme (HMAC per module vs JWT per partner), plus a send-time check of the resolved address
  (SSRF / DNS rebinding).
- **C8 → 12.3 / 12.5 (with C6):** an RTBF can never remove a member↔offer link.
  - (a) The retention basis goes to Panel / counsel.
  - (b) The data export must add these events; a by-member lookup needs a generated column + index.
  - (c) Lead PII belongs in 12.5's entity.
- **C9 → 12.3 / 12.4:** the shelf filter is NOT an authorization. The lead route re-checks scope, eligibility, member
  state and grief suppression server-side.
- **C10 → 12.2 / 12.5:** a correction or endpoint change means re-authoring, which resets places and allows duplicate
  leads. The wizard warns.
- **C11 → 12.2:** scope values are not validated against the geo tree; the wizard picks them from the tree.
- **C12 → every sibling:** mutable presentation data goes in its own table. A new `marketplace_modules` column is
  immutable unless its story amends the trigger chain and `GUARDED_COLUMNS`.
- Also carried:
  - `commission_terms` (+ the trust-deed "disclosed") → 12.2;
  - `age_band` → 12.3;
  - the revise event → 12.2;
  - the external CTA (no owner).

### Testing standards

All paths are under `packages/domain/` unless marked. Do NOT use the repo-root `tests/`.

- **DB-free unit tests:**
  - `tests/marketplace/state.test.ts`:
    - every arm;
    - table / reducer agreement over all pairs;
    - unknown types;
    - prefix replay;
    - `foldModuleProjection`, including a malformed authored payload;
    - exact tuple membership.
  - `tests/marketplace/events.test.ts`:
    - accept / reject per schema;
    - `.strict()`;
    - `from_state` null only at genesis;
    - the lead is `active → active` only;
    - upper-case ids are rejected.
  - `tests/marketplace/filters.test.ts`: AC7's reject list + the accepted frozen vectors.
  - `tests/marketplace/lead-retry.test.ts`: a stub `pg.PoolClient` whose `events_log` INSERT rejects `{ code: '23505',
    constraint: 'events_log_stream_id_event_version_uq' }`. Assert 3 attempts, then `ModuleStreamConcurrencyError`, and
    the SAVEPOINT / ROLLBACK TO / RELEASE call sequence.
  - `tests/ids/branded-ids.test.ts`.
- **Live-DB tests** (`:5433`; assert membership, not counts; do NOT `DROP SCHEMA`):
  - `tests/integration/marketplace/projector-trigger.spec.ts`:
    - every AC2 leg via raw SQL, with the guard set via `SET LOCAL` (the `alerts-policy-regression.spec.ts` shape);
    - the 23514 leg;
    - `pg_trigger` presence;
    - AC1's `pg_indexes` leg.
  - `tests/integration/marketplace/commands.spec.ts`:
    - AC5 / AC6's sequential legs within one `getTx`, with windows relative to `SELECT now()`;
    - I4 after each;
    - the three idempotency outcomes;
    - **the real-wrapper composition:**
      1. Create an own `new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false })`.
      2. On a capacity-1 module, `checkModuleLeadAllowed` returns ok for member A.
      3. In the same transaction, call `submitModuleLead` for member B directly.
      4. Then `audit.withCompensatingAudit(pool, …)` wrapping A's submit throws `ModuleSlotsExhaustedError`.
      5. Assert the intent row and the `module.lead_submitted_rolled_back` row (`resourceLocator = 'module/<id>'`) newer
         than a baseline `max(created_at)`. The audit rows commit permanently.
  - `tests/integration/marketplace/commands-clock.spec.ts` (TR4, TR11), on its own pool:
    1. Transaction 1 authors with `valid_from = now()+2s` (or `valid_until = now()+2s`), schedules / activates, and
       commits.
    2. Sleep 2.5 s.
    3. Transaction 2 runs one of: `scheduled → active`; `archive(valid_until_reached)`; a lead refused with
       `ModuleOutsideWindowError` on an ACTIVE module.
  - `tests/integration/marketplace/module-stream-concurrency.spec.ts` (TR6, TR11):
    - the last-place race and the archive-vs-lead race, at READ COMMITTED;
    - the genesis race at RR + barrier (the `alert-stream-concurrency.spec.ts` shape).
  - `tests/integration/marketplace/read.spec.ts`: AC8.
  - `tests/integration/rls/marketplace-modules-policy-regression.spec.ts`:
    - positive and negative cases;
    - 42501 on withCheck;
    - unscoped fail-closed;
    - `relforcerowsecurity`;
    - DELETE denied;
    - `FOR UPDATE` allowed under `twt_app`.
- **Elsewhere:** `packages/events/tests/module-registry-coverage.test.ts` ·
  `scripts/marketplace-module-state-invariant/lib.test.ts`.
- **Merge gate:** `pnpm ci:local` ([[project_ci_actions_suspension_local_mirror]]).

### Project Structure Notes

- **New:**
  - `packages/domain/src/marketplace/`
  - `schema/marketplace_modules.ts`
  - `policies/marketplace-modules-rls.ts`
  - `migrations/0193_marketplace-modules.sql`
  - `scripts/marketplace-module-state-invariant/`
  - `docs/adr/ADR-0044-…`
  - the tests
- **Variances from the epic / PRD** (list in Completion Notes):
  - ⛔ `packages/marketplace`;
  - `pariwar_id` NOT NULL with ⛔ FK;
  - `module.lead_submitted`;
  - `lead_handoff_signing_key_secret_name`;
  - `state` → `current_state`;
  - branding → `logo_object_key` + one `accent_color_hex`;
  - the scope vocabulary (eligibility "district" → scope);
  - `age_band`;
  - the half-open window;
  - `member_state_in` excluding withdrawn / anonymized;
  - the URL rules;
  - `commission_terms` / the CTA / restore deferred.
- **Not this story's to change** (noted only):
  - the readiness report's Epic 4 dependency vs the epic's 1 / 3 / 6;
  - `per-epic-aggregation-estimates/epic-12.md` (a forum integration);
  - `-104`'s stale "Epic 12" for field workers (now Epic 13).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12 — Stories 12.1–12.6 (incl. the INHERITED FROM 12.1 notes)]
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#§4.9 FR-64..FR-67, Out of Scope, OQ-4]
- [Source: _bmad-output/planning-artifacts/architecture.md#§3.7; §5.9; Contracts sub-domain rule; branded IDs]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Module Shelf Partner Brand Integration]
- [Source: _bmad-output/implementation-artifacts/10-1-…md, 7-1-…md, 8-1-…md, 3-1-…md]
- [Source: packages/domain/migrations/0001, 0002, 0079, 0084, 0096 (header), 0185 (header), 0189]
- [Source: packages/domain/src/helpdesk/{project,state,events,errors,read}.ts; alert/state.ts; pool/errors.ts; member/read.ts; member/anonymize.ts; contribution/write.ts (`uniqueViolationConstraint`); announcement-channels/posts.ts; reconciliation/reconciliation-review-write.ts; audit/compensating.ts; wa-opt-in/code.ts]
- [Source: apps/api/src/modules/helpdesk/handlers.ts; scripts/helpdesk-state-invariant/; scripts/pool-state-invariant/README.md]
- [Source: packages/domain/tests/integration/{_helpers.ts, alert/alert-stream-concurrency.spec.ts, rls/alerts-policy-regression.spec.ts}]
- [Source: Decisions `2026-10-31-427`, `2026-10-31-429`, `2026-08-13-103` D8, `2026-08-21-147` cl.3, `2026-09-08-210` cl.2, `2026-09-20-233`, `2026-10-07-292` RF4]
- [Source: /Users/dev/Developer/projects/TWT/docs/legal/{niyamavali.md, niyamavali.hi.md, trust-deed.md, privacy-policy.md} (git-ignored)]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-31 | v1.4 | SECOND validation by four read-only verifiers (DB feasibility; dev-agent dry run; adversarial semantics; records audit); BigDev: *"apply all findings"*. **Decisions:** amending author-commit `-429` (`0168592b`) — every transition locks the row first (deadlock); lead-id idempotency; URL rules; `member_state_in` excludes withdrawn / anonymized; authoring dates; actor set + triggers; §0 / D8 corrections. **Spec precision added:** exact signatures; payload schemas; constants; the projector contract (`lockedRow`); the transitions table; the clock spec; the DB-free retry test; the real-wrapper recipe; SAVEPOINT discipline; trigger rules (d) / (e) + 23514; citation fixes (`0096` / `0185` / `0189`). **Carried items:** C9–C12 added; C2 / C4 / C8 rewritten; trust-deed "disclosed" + Hindi grep. **Records:** ledger `r` → `t`; NUMBERS corrected (`-426` / `-428` taken); Task 0.1 open. Trimmed duplication. |
| 2026-10-31 | v1.3 | Task 0.4 records (`39ef1763`). |
| 2026-10-31 | v1.2 | Task 0.2 answered (*"QE1-QE15 as recommended."*); Task 0.3 `-427` (`a22dbdec`). |
| 2026-10-31 | v1.1 | Fast-forwarded to `b2f36fe9`; first validation (three verifiers), 19 improvements. |
| 2026-10-31 | v1.0 | Created at `01062c51`; row backlog → ready-for-dev. |
