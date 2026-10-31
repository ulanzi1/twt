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

STATUS: review (2026-10-31 — v1.6, implemented by `bmad-dev-story`; code UNCOMMITTED for review). Was: ready-for-dev (v1.4).
- v1.1: validated by three read-only verifiers; 19 improvements (`62416719`).
- v1.2: Task 0.2 answered — BigDev, *"QE1-QE15 as recommended."* Task 0.3: author-commit `2026-10-31-427` (`a22dbdec`,
  alone) (`e38fc5a3`).
- v1.3: Task 0.4 records (`39ef1763`).
- v1.4: a SECOND validation by four read-only verifiers (DB feasibility; a dev-agent dry run; adversarial semantics;
  records audit). BigDev: *"I think story is not yet ready for dev, run story validation one more time"*, then *"apply
  all findings"*. Amending author-commit `2026-10-31-429` (`0168592b`, alone). Every finding applied; records updated;
  ledger `r` relabelled `t`.
- v1.5: BigDev's four checks (*"check these"*), each verified against the repo and fixed: the genesis projector is now
  specified as precisely as the transition projector; the registry-count question is answered with evidence; the index
  build's lock cost is corrected; a lead's actor must BE the member (I11).
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
  - Ours: `p`, `q`, `t`, `u`, `v` ⇒ next free ≥ `2026-10-31w`.
- Roster: no row.

⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each. `story/6-38-…` and `story/11b-5a-…` are live
and may take `0193`, `ADR-0044` or the next ledger letter first.

LETTERS: G = found facts · QE = build decisions (ANSWERED — `-427`, amended by `-429`) · I = invariants · TR = traps ·
C = carried to a sibling story.
-->

# Story 12.1: Module Manifest Schema + Module Lifecycle State Machine `[PRIMITIVE]`

Status: review

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
    `0096_members-custom-fields.sql` header). A plain `CREATE INDEX` takes a SHARE lock on its table for the whole build, and ⚠ a PARTIAL index still scans the
    ENTIRE heap — the `WHERE` filters tuples, ⛔ the scan. On `events_log`, the SHARE lock blocks every event INSERT,
    system-wide, for the length of that scan. Precedents that accepted this on `events_log`: `0079` (the same SHARE-lock
    partial unique index) and `0185` (an ACCESS EXCLUSIVE rewrite). `docs/runbooks/deploy.md`: the migration phase runs
    BEFORE code promotion, i.e. while the previous code is still serving.
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
  | `lead_handoff_url` | text NOT NULL | ⭐ (zod, A3) `https:` only; ⚠ [code review RV3 / RV4 / RP1: also ⛔ whitespace, control characters and backslashes, ⛔ an `@` ANYWHERE in the string, and the string must be in CANONICAL form — equal to `new URL(raw).href` (a bare origin's `/` aside) — because the column stores the RAW string]; ⛔ userinfo; **⛔ query string, ⛔ fragment** (`url.search === '' && url.hash === ''`); host ⛔ an IP literal (v4/v6) and ⛔ `localhost`; ≤ 2048 |
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
    - `trustee_archived` — from any non-archived state; ⚠ [code review RV8: ⛔ under the `system` actor — a person's decision cannot be recorded as the sweep's];
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

    `values` has 1–200 entries, unique, non-empty, ⛔ normalised — ⚠ [code review RV5: each entry ≤ 120 characters, and no NUL or unpaired surrogate (Postgres refuses both)]. Excluded:
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
    `eq(eventsLog.pariwarId, pariwarId)`. Mind its clock-domain caveat. ⚠ [code review RV1: it replays the longest PREFIX, by `event_version`, whose events all have `occurred_at ≤ at` — the comparison is made IN THE DATABASE (µs vs ms) — and it ignores `module.lead_submitted`].

  ⛔ shelf read.
- **QE13 — Errors (`marketplace/errors.ts`).**
  - Lifecycle and projector:
    - `ModuleIllegalTransitionError`
    - `ModuleStreamConcurrencyError` + `isModuleStreamVersionConflict`
    - `ModuleGenesisAlreadyExistsError`
    - `ModuleGenesisMissingError` (also thrown when the locked row is absent)
    - `ModulePersistError`
    - `ModuleProjectorInputError` (actor / actorId mismatch; a member actor on a non-lead event; a lead whose actor is not
      the member — I11; flat inputs vs payload; a genesis payload that fails its schema)
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
projectModuleGenesis(client: pg.PoolClient, i: {
  pariwarId: PariwarId; moduleId: ModuleId; manifest: ModuleManifestV1; auditId: string;
  actor: Exclude<ModuleEventActor, 'member'>; actorId: string | null;
}): Promise<{ eventId: string; eventVersion: 1; state: 'draft' }>
projectModuleTransition(client: pg.PoolClient, i: {
  pariwarId; moduleId; eventType: Exclude<ModuleEventType, 'module.authored'>; payload: unknown; auditId; actor; actorId;
  lockedRow: { currentState: MarketplaceModuleState; stateEventVersion: number; slotsRemaining: number | null; slotCapacity: number | null };
}): Promise<ModuleTransitionResult>
```

`projectModuleGenesis` runs these steps, in order. Each step's failure is typed, and the whole function runs inside
`SAVEPOINT module_genesis`; on ANY error it runs `ROLLBACK TO SAVEPOINT module_genesis` BEFORE mapping or rethrowing, so
the caller's transaction stays usable. It runs `RELEASE` on success.
1. **Actor check (I11):** `(actor === 'system') === (actorId === null)`, and `actor !== 'member'`. Otherwise →
   `ModuleProjectorInputError`.
2. **Stream empty:** `SELECT 1 FROM events_log WHERE stream_id = $moduleId LIMIT 1`. A row → `ModuleGenesisAlreadyExistsError`.
   The check is RLS-scoped. A concurrent or cross-tenant collision is caught by the 23505 in step 4 / 5.
3. **Build + parse the payload:**
   - `{ from_state: null, to_state: 'draft', trigger: 'module.author', actor, module_id, pariwar_id,
     manifest_schema_version: 1, …every QE5 content column in snake_case }`, with `valid_from` / `valid_until` as
     `Date.toISOString()`;
   - parse it with `ModuleAuthoredPayloadSchema` (`.strict()`). A failure here is a programming error (the manifest was
     already parsed) → `ModuleProjectorInputError`, wrapping the ZodError.
4. **Append:** INSERT into `events_log` with `{ streamId: moduleId, eventType: 'module.authored', payload, eventVersion: 1,
   actorId, pariwarId }`, `RETURNING event_id`.
5. **Write the row:** `SET LOCAL app.marketplace_module_state_writer = 'on'`, then INSERT `marketplace_modules`:
   - every content column from `manifest` (the SAME values the payload carries — one object feeds both);
   - `manifest_schema_version = 1`, `current_state = 'draft'`, `state_event_version = 1`;
   - `slots_remaining = slot_capacity`, `archive_reason = NULL`, `audit_id = auditId`;
   - `created_at` / `updated_at` take their defaults;
   - `RETURNING module_id`; 0 rows → `ModulePersistError`;
   - `'off'` in a `finally`.
6. **Map errors** (cause-chain walker, QE8):
   - 23505 on `events_log_stream_id_event_version_uq` or `marketplace_modules_pkey` → `ModuleGenesisAlreadyExistsError`;
   - 42501 (RLS `withCheck`: the scope ≠ `pariwarId`) propagates unchanged — ⚠ code review RV6: it propagates unchanged
     from the `events_log` APPEND (step 4), which runs first; any other failure of the module-row INSERT / UPDATE is a
     `ModulePersistError` carrying `.sqlstate` (40P01, 42501, 23514, …);
   - P0001 with `MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX` → `ModuleStateDirectWriteError` (only reachable if the guard
     was not set — a bug).
7. Return `{ eventId, eventVersion: 1, state: 'draft' }`.

`authorModule` runs these steps, in order, before calling the projector:
1. the step-1 actor check;
2. `parseModuleManifest(i.manifest)`;
3. `SELECT now()` and A5 (`valid_until > now()`, else `ModuleOutsideWindowError`);
4. `projectModuleGenesis`.

It takes ⛔ row lock: there is no row yet, and the race is decided by the 23505.

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
- `ModuleLeadSubmittedPayloadSchema`: QE7's shape with `actor: z.literal('member')`. It accepts only
  `from_state === to_state === 'active'`, with lower-case ids.
- `ModuleArchivedPayloadSchema`: the audit shape + `reason: z.enum(MARKETPLACE_MODULE_ARCHIVE_REASONS)`.

### Actor rules (I11 — implements `-429` A6)

| Event | Allowed `actor` | `actorId` |
|---|---|---|
| `module.authored`, `module.scheduled`, `module.activated` | `operator` \| `trustee` \| `system` (⛔ `member`) | non-null for `operator` / `trustee`; null for `system` |
| `module.archived` | `operator` \| `trustee` \| `system` (the 12.6 sweep is `system` — ⚠ code review RV8: except for the reason `trustee_archived`, which `system` cannot record) | same |
| `module.lead_submitted` | **`member` ONLY** | **MUST equal `memberId`** |

- Why `actorId === memberId` is meaningful: a member session sets `request.requestContext.actorId = payload.sub`, and the
  JWT `sub` IS the `member_id` (`apps/api/src/modules/auth/shared/member-session-guard.ts`). The helpdesk member handlers
  pass `actorId: memberIdStr`.
  - So a lead whose `actorId` is not the member's own id is one member registering someone ELSE's interest. A lead is
    the member's own consented act (C6 / 12.3's consent), so it must be refused.
- Enforced in THREE places:
  - **`submitModuleLead`** checks `i.actor === 'member' && i.actorId === i.memberId` FIRST, before the row lock →
    `ModuleProjectorInputError`. `checkModuleLeadAllowed` takes no actor; its caller passes the session's member id as
    `memberId`.
  - **`ModuleLeadSubmittedPayloadSchema`** has `actor: z.literal('member')`.
  - **`projectModuleTransition`**, for `module.lead_submitted`, cross-validates `actorId === payload.member_id` →
    `ModuleProjectorInputError`.
- Every other event's schema uses `actor: z.enum(['operator','trustee','system'])`.
- ⚠ The id spaces differ: admin sessions set `actorId = userId` (`admin-auth.handlers.ts`), a `users` id, ⛔ a member id.
  So an operator-assisted lead ("the helpline registers interest for a member") is **NOT supported in 12.1**. It would
  record a staff user as the actor of a member's consented act, and needs its own consent basis (C6). This is carried as
  C13.

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
- **I11** — A `module.lead_submitted` event's actor is `member` and its `events_log.actor_id` equals its payload
  `member_id`. No other event has actor `member`.

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
   - AR-14's `timestamp` / `pariwar_id` are the `events_log` columns `occurred_at` / `pariwar_id`, ⛔ payload keys —
     **except the `module.authored` genesis**, which also carries `module_id` and `pariwar_id` because it snapshots the
     whole manifest (BigDev, 2026-10-31, code review RVQ1, option (a)). The genesis payload is built from the same
     `input.pariwarId` as the column, so the two cannot diverge.
   - **And** all five are registered in `packages/events/src/registry.ts`:
     - add `marketplace` to the import;
     - each `entry.schema` is the same object;
     - description template: *"`<event>` (`<from>` → `<to>`) on the MODULE stream (stream_id = module_id) (Story 12.1).
       No production emitter in 12.1 (I6); the emitting surface is 12.2 / 12.3 / 12.6 (unverified until built)."*
       (code review RV11: the template's leading `⛔` was removed — under the glyph register it double-negated);
     - a section header comment mirrors the helpdesk block.
   - **And** `packages/events/tests/module-registry-coverage.test.ts` asserts set equality + schema identity. Copy
     `claim-registry-coverage.test.ts`, whose header explains why it is SET EQUALITY, ⛔ a count: a count passes when one
     event is added and another deleted.
   - **And** the existing count assertions are checked, ⛔ assumed. Verified 2026-10-31:
     - ⛔ test counts `EVENT_TYPE_REGISTRY` as a whole. Its only consumers are `claim-registry-coverage.test.ts`
       (set equality, `claim.*` only) and `smoke.test.ts` (two named keys).
     - The per-family LENGTH assertions are `MEMBER_EVENT_TYPES` 24 (`member/life-events-markers.test.ts`,
       `member/personal-event-assertion.test.ts`) and `CLAIM_EVENT_TYPES` 37 (`claim/dpdpa-consent-events.test.ts`).
       Neither moves, because `module.*` is a new family.
     - ⭐ At Task 0.1 and again before commit, re-run:
       `grep -rnE 'EVENT_TYPE_REGISTRY' packages apps scripts | grep -v node_modules` and
       `grep -rnE '_EVENT_TYPES\)?\.?.*(toHaveLength|length\)\.toBe)' packages apps`.
     - If ANY assertion counts the registry or a tuple this story changes, update it IN THE SAME COMMIT, with a comment
       naming Story 12.1, as `dpdpa-consent-events.test.ts` does.
     - `MODULE_EVENT_TYPES` itself gets an exact-membership assertion (`toEqual([...])`), ⛔ a bare length.
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
   - **And** `projectModuleGenesis` follows its seven steps ("Exact signatures"); a genesis on a non-empty stream →
     `ModuleGenesisAlreadyExistsError` with the caller's transaction still usable.
   - **And** the I11 actor rules hold, each leg throwing `ModuleProjectorInputError` with no event:
     - `submitModuleLead` with `actor: 'operator'`;
     - `submitModuleLead` with `actor: 'member'` and `actorId ≠ memberId`;
     - `authorModule` / `scheduleModule` / `activateModule` / `archiveModule` with `actor: 'member'`;
     - a raw `projectModuleTransition` lead whose `actorId ≠ payload.member_id`.
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
   - a URL that is `http:`, or has userinfo, a **query string, a fragment, an IP-literal host, or `localhost`**; ⚠ [code review RV3 / RP1: or that holds whitespace, a control character or a backslash, or is not in canonical form — a lone surrogate, `https:host`, an upper-case host, `:443`, dot segments, an un-encoded non-ASCII character];
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

- [x] **Task 0 — governance first (AC0).** 0.2–0.4 DONE 2026-10-31. ⭐ **0.1 runs FIRST in `bmad-dev-story`. Do NOT
      write code before 0.1 is done and its greps are in the Debug Log.**
  - [x] 0.1 `git fetch origin`, and rebase on `origin/main` if it moved.
        - Re-grep NUMBERS across every branch and worktree: decision id; migration + journal `when`; ADR;
          `PERMISSION_CATALOG_VERSION`; the ledger letter in BOTH ledgers.
        - Re-verify G2, G4, G5, G7, G11 and G17.
        - Run 0.1 again at each numbered commit.
  - [x] 0.2 BigDev: *"QE1-QE15 as recommended."* · amendments: *"apply all findings"*.
  - [x] 0.3 `-427` (`a22dbdec`) · `-429` (`0168592b`), each committed alone.
  - [x] 0.4 `deferred-work.md` "Deferred from: story 12-1-…" (C1–C12) · `epics.md` INHERITED notes under 12.2–12.6.
- [x] **Task 1 — ids (AC10).**
  - Add the brands (`uuidBrand`) and their tests.
  - QE14:
    - the schema: `moduleId: uuid('module_id').$type<ModuleId>()`;
    - `ProjectTicketGenesisInput.moduleId`;
    - BOTH comments (the `module_id` half only);
    - the one line in `apps/api/src/modules/helpdesk/handlers.ts`.
- [x] **Task 2 — schema + migration + RLS (AC1, AC2).**
  - [x] 2.1 `schema/marketplace_modules.ts`: a header block stating I1–I3 and I10, plus `import type` for the filter types
        (QE2). Export it from `schema/index.ts`.
  - [x] 2.2 `policies/marketplace-modules-rls.ts`: the three named policies (NOT `for:'all'`). Export from
        `policies/index.ts`.
  - [x] 2.3 HAND-AUTHOR `0193_marketplace-modules.sql`. Do NOT run `db:generate`. Separate statements with
        `--> statement-breakpoint`.
        - The enums, the table, the six named CHECKs and the two indexes.
        - `GRANT SELECT, INSERT, UPDATE … TO twt_app`.
        - RLS ENABLE + FORCE, and the three policies.
        - QE8's two `events_log` partial unique indexes. The header states the cost HONESTLY (G13):
          - each `CREATE INDEX` takes a SHARE lock on `events_log` and scans the WHOLE table (a partial predicate filters
            tuples, ⛔ the scan), so every event INSERT in the system waits for both builds. ⛔ Claim the build is fast
            because no `module.lead_submitted` rows exist: the cost is set by the size of `events_log`, ⛔ by the count
            of lead rows;
          - `CONCURRENTLY` is impossible inside drizzle-kit's transaction (25001, the `0096` header);
          - why it is accepted now: TWT has ⛔ production deployment ([[project_not_in_production_merge_is_not_golive]]),
            so the first live run of this migration is on a fresh or small database; precedents `0079` / `0185`;
          - ⚠ re-check trigger: if a live deployment with a populated `events_log` exists when this lands, STOP and
            route the index build to a separate, non-transactional step run outside the migrator (a deploy-runbook
            change), ⛔ ship it in-migration.
          - ⭐ Measure it: in Completion Notes, record `SELECT count(*) FROM events_log` and
            `pg_size_pretty(pg_total_relation_size('events_log'))` on the dev / CI database, plus the two builds' wall
            time (`\timing`).
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
- [x] **Task 3 — events (AC3).**
  - `marketplace/events.ts`: the PINNED SEAM, `moduleActorSchema`, `auditShape`, the five named schemas and the tuple.
  - Registry: add the import, the five entries (description template) and the section header.
  - `packages/events/tests/module-registry-coverage.test.ts`.
- [x] **Task 4 — filters + manifest (AC7).** `marketplace/filters.ts`:
  - `ScopeFilterV1`, `EligibilityFilterV1` and `ModuleBrandingBundle` (schemas + exported types);
  - `parseModuleManifest`, per the QE9 contract and QE5's zod rules;
  - doc comments stating "zero clauses" and each absence (role / cohort / age_band / block / public; withdrawn /
    anonymized) with its re-trigger.
- [x] **Task 5 — reducer, projector, commands, reads, errors (AC4, AC5, AC6, AC8).**
      `marketplace/{state,project,commands,read,errors,index}.ts`, per "Exact signatures".
  - `index.ts` does NOT re-export the projectors.
  - Add the namespace export and the direct-write set to `domain/src/index.ts`.
  - [x] 5.1 The projector, as specified under "Exact signatures".
        - ⚠ **Legality is `nextModuleState(...) !== null`, NOT `toState !== fromState`; copying helpdesk makes every lead
          illegal (TR1).**
        - ⚠ **It does NOT replay the stream; it takes `lockedRow` (TR12).**
        - Every guarded write sits LEXICALLY in the two projector bodies — no inner named arrow or helper — or the gate
          flags it (G2).
  - [x] 5.2 Commands. Every transition command's FIRST statement is `SELECT … FOR UPDATE` (QE7, I10) — ⚠ code review RV10 (b):
        a `SAVEPOINT` precedes it, and I10's actual rule is the lock before any `events_log` read or append. A missing row →
        `ModuleGenesisMissingError`. Then the guards, in QE6 / QE7 order.
        - `submitModuleLead`: QE8 (i)–(iii), then up to `MAX_LEAD_APPEND_ATTEMPTS = 3` attempts.
        - Each attempt runs inside `SAVEPOINT module_lead_append` and re-issues the `FOR UPDATE` (PG16 keeps a lock taken
          before the loop).
        - On ANY error, `ROLLBACK TO SAVEPOINT` BEFORE mapping or rethrowing, so the caller's transaction stays usable.
          `RELEASE` on success.
        - Map 23505 via the cause-chain walker (QE8).

        ⚠ **A 23505 aborts the transaction; a retry without a SAVEPOINT fails (TR3).**
  - [x] 5.3 `checkModuleLeadAllowed`: a read-only pre-check in QE7 order, returning `{ ok: true, replayed }` or a
        `ModuleLeadRefusal`.
  - [x] 5.4 DB time via `select now()` inside the transaction, NOT `new Date()` (TR4).
- [x] **Task 6 — gate (AC9).** Copy, rename, README, wire, revert-sanity.
- [x] **Task 7 — ADR (AC11).** The ADR, the index row flip and the reconciliation note, committed alone.
- [x] **Task 8 — tests (AC1–AC8).** Per Testing standards; paths under `packages/domain/` / `packages/events/`, NOT the
      repo root. Every assertion names a typed error class.
- [x] **Task 9 — verify + ledger (AC12).** (⚠ ticked on the PRE-patch tree: code review v1.7 and v1.8 changed production code and tests afterwards; a full `ci:local` was then run on the patched tree — 36 of 37 jobs in one invocation, `test (unit)` green on a re-run of that job; see the round-2 Disposition)
  - `pnpm ci:local` on a fresh container. Set `DATABASE_URL` to the story's port for every push
    ([[project_prepush_hook_inherits_5432]]).
  - Completion Notes: the I6–I9 greps and the variance list.
  - Prepend the ledger lines safely to BOTH ledgers, with a letter ≥ the one re-grepped at 0.1
    ([[project_sprint_status_safe_prepend]]). Row → `review`.

### Review Findings

Three-layer code review, 2026-10-31, of the UNCOMMITTED tree on `story/12-1-module-manifest-schema-module-lifecycle-state-machine` (HEAD `28908112` = nine docs-only commits over
`origin/main` `b2f36fe9`; the working-tree diff fingerprint `e0d4d94e0612d18c` was identical at launch, at triage and before this write). **Chunk 1 of 2 — PRODUCTION code only**
(28 files, 3,261 diff lines: migration 0193, the schema, the RLS policy, `marketplace/*`, the registry, the ids, the helpdesk type-only edits, the state-invariant gate and its CI wiring), by a
Blind Hunter (diff only), an Edge Case Hunter and an Acceptance Auditor, in parallel, strictly read-only. **Chunk 2 (the tests, ~2,470 lines) is NOT yet reviewed.**
38 numbered raw findings (19 blind / 12 edge / 7 auditor) plus 2 lower-confidence notes. After deduplication and a hand-trace of the load-bearing claims: **1 decision-needed (RVQ1 — since RESOLVED by BigDev, option (a) ⇒ a patch), 11 patch,
6 defer; 12 dismissal groups (15 raw items).** Of the 12 decision / patch items: **0 HIGH, 4 MEDIUM, 7 LOW, 1 INFO**; the 6 defers are latent (no caller exists — I6). The Panel-routing §0 gate was applied
to every candidate: none is about what the Trust discloses about a person, what it owes one, a legal basis, or two RATIFIED clauses in conflict (RVQ1 is two parts of THIS story disagreeing,
which is BigDev's call, not the Panel's). **No Trustee Panel decision is needed.** Product code was not changed by this review. IDs are `RVQ` / `RV` / `RVD`.

⚠ **What this review did NOT do:** run a test, a mutant or `ci:local`. The Dev Agent Record's `ci:local` 37/37, the 133 ms / 28 ms index-build measurement and the I6 grep are CLAIMS here —
the Auditor re-ran the I6 grep (zero call sites outside tests and `marketplace/`); I did not. The Niyamavali grep (git-ignored corpus) was not re-run. Each entry says **traced** (I read the code)
or **layer-reported** (I took a layer's reading).

**Disposition (BigDev, 2026-10-31): RVQ1 → option (a), amend AC3; then option 1 — apply every patch.** All 12 were applied the same day; ⛔ committed, ⛔ pushed. The AC3 amendment and the prose
annotations keep the original words and add the ruling or the review id ([[feedback_supersede_never_reinterpret]]).
**Verified (run here):** `turbo lint typecheck` over `@twt/domain` + `@twt/events` + `@twt/api` and their dependencies — 32/32 tasks; the domain unit suite 3,381 passed / 194 files and the events suite 26 passed (DB-free,
`env -u DATABASE_URL`); ALL SIX marketplace live-DB files against the story's own container `twt-121-pg` :5471 — 51/51 (commands 17, projector-trigger 16, read 6, module-stream-concurrency 3, commands-clock 1, the RLS
policy-regression 8); the gates `domain-invariants`, `marketplace-module-state`, `helpdesk-state`, `member-state`, `governance-boundary` and `db:check` — PASS. **Mutants run and KILLED:** RV1 (the old timestamp filter back),
RV2 (the prefix strip off; the mapper back to `err.message`), RV3 (the unsafe-character check off), RV5 (the storable-text check off; the scope-value cap off), RV6 (the persist message back to the cause's own), RV7 (the payload
window rule off), RV8 (the system + `trustee_archived` rule off) — every file restored and byte-verified. **New tests:** +34 unit legs (198 → 232 in `tests/marketplace` + `tests/ids`; two NEW files, `errors.test.ts` and
`archive-actor.test.ts`), +2 live legs in `read.spec.ts`, and one live leg CHANGED in `commands.spec.ts`.
**⚠ NOT done:** one full `pnpm ci:local` as a single command (the parts above were run separately, and the story's container carries run history); a three-layer review of the PATCH DIFF itself (the standing rule —
[[feedback_review_the_fix_diff_before_commit]]); the review of **chunk 2** (the tests, ~2,470 lines — the new legs above included); a ledger line in `sprint-status.yaml`. ⇒ **the story stays `review`.**

**Deviations and additions (⛔ silent):**
- **RV1** — the first attempt cut the prefix in JavaScript and BROKE an existing leg ("returns the state as of each instant"): `occurred_at` carries microseconds and a JS `Date` milliseconds, so an event stamped a few µs after `at` compared equal to it. It is
  now computed in SQL (`afterAt`), against the same ms-precision parameter the old `lte` used. Caught by the live run, ⛔ by typecheck or the unit suite.
- **RV2 / RV6** — beyond the findings: `ModulePersistError`'s message embedded `cause.message` too, so a drizzle cause leaked the same SQL + params; it now uses `pgMessageOf`. `mapModuleWriteError` is exported for its unit spec (the barrel does not re-export `project.js`);
  `pgMessageOf` / `pgSqlstateOf` now appear in the `marketplace` namespace through `export * from './errors.js'`.
- **RV7** — only the window half was changed. The `partner_id` half was **traced and is false**: zod 3.25.76 `.uuid()` and the repo's `UUID_REGEX` (`db.ts`) accept the same set, so there is no differential and no change.
- **RV8** — an EXISTING live leg asserted "a system-actor archive is allowed (the 12.6 sweep)" using `trustee_archived`; that is exactly the attribution the patch closes, so the leg now asserts the refusal AND the allowed path (`slot_capacity_exhausted` after the last place is taken).
- **RV10 (b)** — only Task 5.2 carried the wording; QE7 did not. **(d)** — a comment-only edit to the unmerged migration 0193 (no DDL change) plus the constant's doc in `errors.ts`.
- **RV11** — the glyph is in the five `registry.ts` strings; the test's substring never had it, so the test is unchanged.
- **Also done in round 1, not listed there (RP18):** RV6's "A1 sentence" — `-429` A1 in `.decision-log.md` was left AS WRITTEN (a governance entry is superseded, never edited); the story's contract text (Step 6) carries the correction.
  `archiveModule` now calls `assertModuleActor` itself and `runLockedTransition` calls it again (harmless). New exports: `MAX_SCOPE_VALUE_LENGTH`, `refineModuleWindow`, `mapModuleWriteError` (for its spec — the barrel does not re-export `project.js`) and, through
  `export * from './errors.js'`, `pgMessageOf` / `pgSqlstateOf`.

- [x] [Review][Patch] **RVQ1 — AC3 forbids `pariwar_id` as a payload key; the genesis payload carries it** — ✅ **DECIDED by BigDev, 2026-10-31: option (a), amend AC3** (now a patch: edit the AC3 sentence to carve out the genesis snapshot; no code change). [`events.ts:83-84`, `project.ts:184-185`; AC3, story line 675] — MEDIUM, **traced**.
  AC3, verbatim: "AR-14's `timestamp` / `pariwar_id` are the `events_log` columns `occurred_at` / `pariwar_id`, ⛔ payload keys." But "Exact signatures" step 3 and "Payload schemas" order
  `{ …, module_id, pariwar_id, manifest_schema_version: 1, … }`, and the code follows them (the `events.ts` header: "the genesis carries `pariwar_id` only because it snapshots the whole manifest").
  The story ships what the signatures order and breaks what the AC says ([[feedback_spec_edits_must_propagate_to_tasks]]). Options:
  **(a) Amend AC3** to carve out the genesis snapshot — no code change. **(b) Drop `module_id` / `pariwar_id` from the genesis payload** and from the signatures — payload schema, projector, registry test change, no behaviour change.
  **Suggest (a):** code, signatures and header already agree, and the genesis payload is built from `input.pariwarId`, the same source as the column, so the two copies cannot diverge in 12.1.
  Cost of (a): the genesis event holds a value that is also a column (a second copy, ⛔ a second authority). Cost of (b): churn in four places for no change in what is stored or owed to anyone.

- [x] [Review][Patch] **RV1 — `getModuleStateAt` can replay a non-prefix of the stream, and reads every lead event with no bound** [`read.ts:64-76`] — MEDIUM, **traced** (the interleaving is derived, not run).
  `occurred_at` defaults to `now()` = the TRANSACTION START (`schema/events_log.ts`; the `commands.ts` TR4 header). A transaction that began first but won the row lock second appends the HIGHER version with the LOWER `occurred_at`:
  tx2 begins t=1 and waits, tx1 begins t=2, locks first, appends v2 (t=2); tx2 then appends v3 (t=1). `getModuleStateAt(1.5)` returns {v1, v3} and skips v2 — a state that never existed. The `member/read.ts` twin has the same shape;
  the module version is new code. Separately the query has no `LIMIT` and no event-type filter: an uncapped module accumulates one `module.lead_submitted` per lead and every call loads and parses them all.
  **Fix:** read only the non-lead events (a lead is a same-state event, so skipping it is lossless — at most the genesis plus three transitions), order by `event_version`, and replay the contiguous prefix up to the first event with `occurred_at > at`.
  Add a test with an out-of-order `occurred_at`. (blind #2, #7 + edge #2)

- [x] [Review][Patch] **RV2 — `ModuleStateDirectWriteError` is built from the OUTER error's message: SQL and every bound parameter reach `.message`, and the prefix is doubled** [`project.ts:126` (`mapModuleWriteError`), `errors.ts:36-54`] — MEDIUM, **traced**
  (drizzle-orm 0.45.2 `DrizzleQueryError` read: its message is `Failed query: <sql>` + newline + `params: <params>`; that the pg session wraps EVERY failed query was taken from `errors.ts`'s own comment, not re-read).
  `findPgError` finds the pg error on the `.cause` chain, but the mapper passes `err.message` — the drizzle wrapper's — as `detail`. A guarded genesis INSERT that trips the trigger therefore carries the manifest's bound parameters
  (name, description, `lead_handoff_url`, the signing-key secret NAME) into `message`, and `toErrorResponse()` returns `this.message` verbatim. Even on a bare pg error the constructor prepends the prefix to a message that already starts with it.
  Reachable only when the projector itself trips the trigger (a bug) — which is when an error body is least wanted to carry parameters. **Fix:** take the message from `findPgError(err)`, strip the prefix, and pass only that; keep `toErrorResponse().message` free of SQL/params. Add a test that asserts the message contains no `params:`. (blind #1)

- [x] [Review][Patch] **RV3 — `lead_handoff_url` is validated on the PARSED URL but stored as the RAW string** [`filters.ts:165-189`; stored at `filters.ts:269` and in the genesis payload] — MEDIUM, **traced** (code read; the WHATWG normalisation is from the spec, not run).
  `new URL(raw)` strips leading/trailing space and C0 controls, deletes tab/LF/CR anywhere, and reads `\` as `/` in an `https:` URL — so every https / userinfo / query / host / IP check runs on a normalised URL, while `raw` is written unchanged to the column and the `module.authored` payload.
  `"https://leads.partner.example/x\n"`, `" https://…"` and `"https://leads.partner.example\x"` pass. The manifest is immutable (trigger rule (b)) and snapshotted in the event, so the value is permanent — 12.5 delivers to it; a CRLF in a stored URL, or a parser that reads it differently from the WHATWG one, is a defect that can then only be fixed by re-authoring (C10).
  **Fix:** refuse a `raw` containing whitespace, a control character or `\` (or require `raw === url.href`) before the other checks. (edge #1)

- [x] [Review][Patch] **RV4 — the lead-URL `@` rule is stricter than QE5 / A3 and is not recorded** [`filters.ts:179`] — LOW, **traced** (grep: no mention in the Dev Agent Record).
  QE5 / A3 say "no userinfo"; the code also refuses any `@` ANYWHERE in the string (`raw.includes('@')`), so `https://partner.example/@team/hook` is refused although it has no userinfo. The strictness is defensible (a raw `@` is the classic parser-differential), but Completion Notes "Implementation choices" #1 lists the other extras (raw `?` / `#`, `localhost.`, `*.localhost`, IP normalisation) and not this one — an unrecorded variance (checklist family 10).
  **Fix:** record it in Completion Notes (and the `filters.ts` doc comment), keeping the rule; do not relax it without a test. (auditor #2)

- [x] [Review][Patch] **RV5 — free-text manifest fields accept NUL and lone surrogates, and scope values have no per-value length cap** [`filters.ts:36-52`, `:147-148`, `:165`; the logo key] — LOW, **layer-reported** for the Postgres behaviour, **traced** for the absence of a guard.
  zod bounds length only. A NUL (`"a\u0000b"`) in `name_en` / a scope value / the logo key reaches Postgres as 22P05 (jsonb) or 22021 (text) and a lone surrogate as 22P02, and `mapModuleWriteError` returns it unchanged — an untyped 500 where `ModuleManifestInvalidError` is the contract.
  `scope_filter.values` is ≤ 200 values of unbounded length each, so the genesis event and the row are bounded only by the upstream body limit. Precedent for the guard: `packages/contracts/src/helpdesk/attachment.ts` rejects `\u0000`.
  **Fix:** a shared `.refine` rejecting NUL and `[\ud800-\udfff]` on the string schemas, and `.max(120)` per scope value (the `moduleNameSchema` bound). Byte-for-byte matching stays — do not add a trim to scope values. (edge #5, #6)

- [x] [Review][Patch] **RV6 — `ModulePersistError` wraps errors the contract says propagate unchanged, and hides the SQLSTATE on `.cause`** [`project.ts:157-158` (JSDoc), `:253-258` (genesis INSERT), `:435-438` (transition UPDATE)] — LOW, **traced** for the code, **layer-reported** for the `-429` A1 wording.
  The genesis catch rethrows only a PK collision or a trigger refusal; anything else (40P01, 42501, 23514, 57014) becomes `ModulePersistError`; the UPDATE catch does the same for any unmapped error. The JSDoc says "42501 … propagates unchanged", and `-429` A1's premise is that a 40P01 stays recognisable.
  In practice the 42501 leg is pre-empted — the `events_log` append, which carries the same Pariwar RLS check, fails first, and no marketplace code branches on a SQLSTATE today — so this is a contract-text mismatch, not a live defect.
  **Fix:** expose the SQLSTATE on `ModulePersistError` (`.sqlstate` from `findPgError(cause)`) and correct the JSDoc and the A1 sentence to say what is true. (blind #12a + auditor #3)

- [x] [Review][Patch] **RV7 — the genesis payload schema omits the `valid_until > valid_from` rule, so the header's "can never be held to different rules" overclaims** [`events.ts:77-100`; `filters.ts:1-8` header, `:221-230`] — LOW, **traced**.
  The rule lives only in `ModuleManifestInputSchema.superRefine`. `ModuleAuthoredPayloadSchema` shares the field schemas but not the window refinement, so an inverted-window payload from any stray `appendEvent` passes the registry and is stopped only by the DB CHECK on the ROW — leaving a stream event the row can never match.
  Not reachable through `projectModuleGenesis` (the manifest is parsed first). **Fix:** hoist the window check into a shared refinement used by both schemas, or soften the header. While there, align the input `partner_id` validator with the brand's (`z.string().uuid()` then `partnerId(...)`: a UUID shape one accepts and the other rejects would surface as a raw `InvalidBrandedIdError`, not a manifest error — UNSURE, not traced). (blind #13)

- [x] [Review][Patch] **RV8 — `archiveModule` accepts `trustee_archived` from the `system` actor** [`commands.ts:263-295`] — LOW, **traced**.
  `assertModuleActor` enforces only system-iff-null-`actorId` and no-member, and the reason guards check the window and the slots, not WHO. `actor: 'system', reason: 'trustee_archived'` is accepted and recorded, so the event and `archive_reason` attribute a trustee decision to the sweep (checklist family 8, attribution).
  The two automatic reasons are different: their guards prove the reason is TRUE whoever calls, so no actor rule is added for them. **Fix:** refuse `trustee_archived` from `system` with the typed `ModuleProjectorInputError`; add the leg. (blind #10 + edge #9)

- [x] [Review][Patch] **RV9 — checklist family 6 REAL GAP: the read accessors return whole rows, and no carried item says the first member-facing consumer must field-pick** [`read.ts:26` (`getModule`), `:48` (`listModulesForPariwar`)] — LOW, **traced**.
  `.select()` returns all 23 columns, including `lead_handoff_url`, `lead_handoff_signing_key_secret_name` and `audit_id`. Nothing consumes them in 12.1 (I6), and the helpdesk precedent field-picks in its handlers — but C5 / C9 do not say "the shelf read must never return the partner endpoint or secret name to a member".
  Per the checklist a REAL GAP is not downgraded to a note. **Fix (no behaviour change):** a doc comment on both accessors — "admin shape: never serialise to a member" — and one sentence added to C9. (blind #16 + edge #12A + auditor #4)

- [x] [Review][Patch] **RV10 — stale or missing prose the code now contradicts** [several] — LOW, mixed (a, d traced; b, c layer-reported).
  (a) `filters.ts:27` — the `withdrawn` / `anonymized` entry of the "Deliberately ABSENT, each with its re-trigger" list has no re-trigger; point it at C9 (the lead route refuses them; Task 4 says each absence carries one). (auditor #5 + blind #4)
  (b) Task 5.2 still says "Every transition command's FIRST statement is `SELECT … FOR UPDATE`" (the Auditor named QE7 too — ⚠ corrected on checking: the phrase is in Task 5.2 only); the code opens a SAVEPOINT first (`commands.ts:198`, `:446`) and takes the lock second. I10's actual rule (lock before any `events_log` append) holds. Completion Notes #7 records the choice; the Task text was never updated. (auditor #6)
  (c) The `commands.ts` header says "Every command wraps its statements in a SAVEPOINT"; `authorModule` delegates to the genesis projector (which does) and `checkModuleLeadAllowed` is a read. Say so. (blind #12b)
  (d) The global `module_lead_id_uq` is marked deliberate in the migration, but with no re-examination trigger (family 9). Add: re-examine if 12.3 lets a CLIENT choose `lead_id` — derive it server-side or key `(pariwar_id, lead_id)`, because a cross-tenant 23505 is a collision oracle. (auditor #9 + edge #10)

- [x] [Review][Patch] **RV11 — the AC3 registry-description template reads as a double negative, and ships in five runtime strings** [AC3; `packages/events/src/registry.ts:270-299`; asserted by `module-registry-coverage.test.ts`] — INFO, **layer-reported**.
  The template contains "⛔ No production emitter". Under this story's own glyph register (⛔ negates the phrase it precedes) that says the opposite, and the register itself says ACs write negations in plain words. **Fix:** "No production emitter yet" in the AC3 template, the five descriptions and the test substring. (auditor #7)

- [x] [Review][Defer] **RVD1 — the lead path scans the module's whole stream under the row lock** [`commands.ts:348-351` (`EXISTING_LEADS_SQL`), `:377-380`, `:445-504`] — deferred: **traced**. The only usable index is `events_log_pariwar_stream_idx`
  (the partial unique indexes cannot serve the read — `->>` is not leakproof under RLS, G16), so each lead heap-scans O(N) events while holding `FOR UPDATE`, and every lead for that module queues behind it. No caller exists (I6) and the magnitude is unmeasured.
  ⭐ Trigger: the first uncapped module expected to take ~1,000 leads, or 12.3's load test. Remedy: the generated column + index that C8 (b) already names (the `0185` precedent). (edge #3)
- [x] [Review][Defer] **RVD2 — a stream/row version drift has no repair path, and a stray `module.*` emitter is not scanned** [`project.ts:344-353`] — deferred: **traced**. `appendEvent` is generic and `registry.ts` now registers `module.*`, so any code could append one outside the projector;
  after that `headVersion != lockedRow.stateEventVersion` on every transition, including `archiveModule`, which then throws `ModuleStreamConcurrencyError` — and `submitModuleLead` retries it twice with sleeps for nothing (RV dismissal group). The helpdesk twin has the same shape.
  ⭐ Trigger: the first production caller of any module command, or a house pass over the `*-state-invariant` gates (flag `appendEvent` / `.insert(eventsLog)` of a `module.*` type outside `project.ts`; add a distinct, non-retried `ModuleStreamDriftError`). (edge #4 + blind #5)
- [x] [Review][Defer] **RVD3 — the gate scans only `packages/domain/src` and only literal `.set({…})` / `.values({…})` forms** [`check.ts:27-28`, `lib.ts:70-76`, `:98-122`] — deferred: **traced**. A writer in `apps/` or `packages/jobs`, `.set(patch)`, an aliased table and raw `sql` are not seen.
  This is the house convention — G1: every `*-state-invariant` gate's `SCAN_ROOT` is `packages/domain/src` — and the README states the layering (the AST gate and the trigger are different layers; the trigger also catches raw SQL). The twin helpdesk gate has the same limits.
  ⭐ Trigger: a house-wide widening of the `*-state-invariant` gates, or the first non-domain package that imports `schema.marketplaceModules`. ([[feedback_gate_scope_semantic_coverage]]) (blind #3 + edge #11)
- [x] [Review][Defer] **RVD4 — the trigger does not enforce the lifecycle, only who / version / slots** [`0193_marketplace-modules.sql:119-158`] — deferred: **traced**. A guarded `archived → active` (with `archive_reason` cleared) and a same-state `slots_remaining − 1` on a `draft` / `archived` row pass rules (a)–(e) and both CHECKs;
  "archived is terminal" and "only `active` takes places" live in `nextModuleState` alone. This is I3 as written and as ratified — the migration header lists rules (a)–(e) accurately, so it is not a false claim — and C3 expects 12.6 to ADD an arm out of `archived`, which a DB-level terminal rule would turn into a second place to change.
  ⭐ Trigger: C3 / Story 12.6's create-story — decide then whether the trigger should mirror terminality and state-gate the slot drop. (blind #9 + edge #7)
- [x] [Review][Defer] **RVD5 — redelivery of a non-lead command is a typed `ModuleIllegalTransitionError` / `ModuleGenesisAlreadyExistsError`, not an idempotent no-op** [`commands.ts:189-222`, `:263-295`, `:160-178`] — deferred: **traced** (the Auditor found the five twins behave the same). `archiveModule(valid_until_reached)` on an archived module,
  `activateModule` on an `active` one, or `authorModule` with the same id fails typed rather than returning `{ replayed: true }`; only `submitModuleLead` has a replay branch. No worker calls them yet.
  ⭐ Trigger: Story 12.6's create-story — the sweep must treat `ModuleIllegalTransitionError` with `fromState = 'archived'` as already done (a new carried item), or the commands gain a replay arm. (edge #8 + blind #10)
- [x] [Review][Defer] **RVD6 — `listModulesForPariwar` has no cursor past 200** [`read.ts:38-53`] — deferred: **traced**. `archived` is terminal and rows are never deleted, so a Pariwar's list only grows; the accessor takes `{ state?, limit? }` and clamps at 200.
  Forced pagination is the gate's rule (family (a)), and no consumer exists. ⭐ Trigger: Story 12.2's list page — add a `(created_at, module_id)` keyset cursor. (blind #6 + edge #12B)

**Dismissed (12 groups, 15 raw items):** zero eligibility clauses reaching departed members — carried as C9 (blind #4) · the lead retry loop on a deterministic drift error — the TR3 backstop, ~30 ms, folded into RVD2 (blind #5) ·
no way to amend a live manifest — QE11 / C10, ratified (blind #8) · the writer GUC is settable by any `twt_app` session — house design for every twin (blind #11) · `checkModuleLeadAllowed` is "not the same decision" — an advisory pre-check, the locked decision is `submitModuleLead`'s (blind #12c) ·
the migration's SHARE lock on `events_log` — disclosed with a re-check trigger, no live deployment ([[project_not_in_production_merge_is_not_golive]]) (blind #14) · the redundant `pariwar_id` index — the helpdesk twin has the same pair and `projector-trigger.spec.ts:94` pins it (blind #15) ·
the helpdesk `ids.moduleId(...)` line — ordered by the story (QE14, line 488) and the contract's `UuidString` validates first (blind #17) · the CI job missing from an aggregate — no aggregate job exists, every job is `needs: install` (blind #18) ·
the README's memory link, the `⛔` glyph, a duplicated `isoInstantSchema`, the type-narrowing `|| row === null` — convention or cosmetic (blind #19a–d) · `logo_object_key` accepts any 1–1024 characters — no consumer; the signer is 12.3's (edge, lower-confidence) ·
`auditId` / `actorId` unvalidated — internal typed callers, and a failure lands inside the savepoint (edge #5, sub-claim).

### Review Findings — round 2 (chunk 2 — the TESTS — plus the PATCH diff)

Three-layer review, 2026-10-31, of (1) the round-1 PATCH diff (8 production files, 493 lines, rebuilt from the chunk-1 snapshot — the method was checked on an unpatched file, which came back byte-identical) and (2) the 15 test files
chunk 1 left out (2,860 lines), by a Blind Hunter (diff only), an Edge Case Hunter and an Acceptance Auditor, in parallel, strictly read-only; the working-tree fingerprint `77140deb7832bae9` was identical at launch and at triage.
55 numbered raw findings (23 blind / 17 edge / 15 auditor). After deduplication and a hand-trace of the load-bearing claims: **0 decision-needed, 20 patch, 4 defer; 7 dismissal groups.** **0 HIGH, 3 MEDIUM, 14 LOW, 3 INFO.** The Panel-routing
§0 gate was applied to every candidate: none is about what the Trust discloses, what it owes, a legal basis, or two ratified clauses in conflict — **no Trustee Panel decision is needed.** Product code was not changed by this round.
IDs are `RP` / `RPD`. ⚠ **Two of the three MEDIUM items are the round-1 checklist verdict being re-issued now that the tests were read** (RP2 family 5, RP3 family 2): round 1's `covered-by-test` named tests it had not read in depth.
⚠ **What this review did NOT do:** run a test or a mutant (the NEW claims were checked by reading, plus a node probe of the URL parser and one read-only `SELECT … ::jsonb` on the story's container); the Disposition's results are CLAIMS here.
Each entry says **traced** (I read the code or ran the probe) or **layer-reported**.

**Disposition (BigDev, 2026-10-31): option 1 — apply every patch (RP1–RP20).** All 20 were applied the same day; ⛔ committed, ⛔ pushed. The story-text edits are annotations: the original words stay and the review id is added.
**Verified (run here, on the patched tree):** `turbo lint typecheck` over `@twt/domain` + `@twt/events` + `@twt/api` and their dependencies — 32/32 tasks; the domain unit suite 3,452 passed / 195 files and the events suite 26 passed (DB-free, `env -u DATABASE_URL`);
ALL SIX marketplace live-DB files against the story's own container `twt-121-pg` :5471 — 72/72 (commands 28, projector-trigger 22, read 8, module-stream-concurrency 5, commands-clock 1, the RLS policy-regression 8); the gates `domain-invariants`, `marketplace-module-state`,
`helpdesk-state`, `member-state`, `governance-boundary`, `db:check` and `contracts:check-pii-scrape` — PASS. **Mutants run and KILLED (production):** RP1 (the canonical-form check off — 9 filter + 2 events tests), RP8 (the SQLSTATE-shape check off), RP7 ×4 (valid_until made inclusive;
valid_from made exclusive; schedule `<` → `<=`; archive `valid_until_reached` `<` → `<=`), RP3 ×2 (not-active before replay; slots before outside-window), RP12 (the backoff sleep deleted), RP4 (the lock taken after `now()`), RP15 (inapplicable events counted), the ROW LOCK removed
(live — killed by the last-place race's single-SAVEPOINT assertion), and `read.ts` ×4 (the `getModule` predicate; the `getModuleStateAt` predicate; `created_at` ASC; the default page 50 → 40). **(DB)** the trigger's exclusion chain widened by `created_at`, and the window CHECK weakened to `true`,
on the story's container — the original definitions were restored and verified equal. Every file restored byte-identical.
**New tests:** DB-free `commands-guards.test.ts` (25) and rows in `filters` (+21), `events` (+8), `errors` (+12), `state` (+5) — 198 → 303 across `tests/marketplace` + `tests/ids` since round 1's start; live: `projector-trigger` +6, `commands` +11, `read` +2, `module-stream-concurrency` +2 (and one assertion added), `commands-clock` extended.
**`ci:local` on the patched tree (run after the round; BigDev chose it over reviewing first).** A fresh `postgres:16-alpine` container `twt-121-ci-pg` on :5472 (empty; `integration-tests` ran `db:migrate` from scratch, so migration 0193 applied after every earlier one); no dangling symlinks, no missing workspace links.
**Run A — `pnpm ci:local` as ONE command (18:53–19:11, 18 min, exit 1): 36 of 37 jobs green** — `lint`, `typecheck`, `build`, `db-check`, `contracts-determinism`, `crypto-check`, `i18n-parity`, `pii-scrape`, every state / boundary invariant incl. `marketplace-module-state-invariant`, `determinism-replay`, `channels-determinism`, the AI-10-5 coverage guard and the live-DB
`integration-tests` (concurrency 1, eight packages). **RED: `test (unit)`** — `@twt/admin`: 14 tests in 6 files failed, 1,525 passed (4 hit the 5 s test timeout, the rest were Testing Library `findBy*` waits of 1 s that expired); all six files are ones this story did not touch (`ground-inspection-discrepancy`, `banners-page`, `fixed-amount-page`,
`verifier-console`, `helpline-claim-page`, `helpline-peer-requests`). The suite took 188 s against 23 s when run alone, and the machine's 1-minute load average was about 11 with other sessions active. Turbo then KILLED `api`, `jobs` and `domain` mid-run, so their unit results from Run A are UNKNOWN, not green.
**Evidence it is the known flake and not this story:** `@twt/admin` alone — 86 / 86 files, 1,539 / 1,539 tests in 23 s; and **Run B — the `test (unit)` job re-run exactly as `ci:local` defines it** (`env -u DATABASE_URL pnpm turbo run test --concurrency=4`; turbo served the 33 earlier passes from cache): **37 / 37 tasks, 0 failures** — `admin` 1,539, `api` 771 (+1,730 DB-gated skipped),
`jobs` 1,242, `domain` 3,452. `admin` passed this time even under load (143 s), so the flake is INTERMITTENT ([[project_ci_local_concurrency_oversubscription]] — the unit job's `--concurrency=4` is a recorded tax). ⚠ **That is two invocations, not one green `ci:local`.** If AC12 must read "green in a single invocation", run it again on a quieter machine.
**⚠ NOT done:** one `pnpm ci:local` that is green in a SINGLE invocation (above); a three-layer review of THIS patch round's diff (the standing rule — [[feedback_review_the_fix_diff_before_commit]]) — it changed four production files again (`filters.ts`, `errors.ts`, `read.ts`, `registry.ts`), added a 301-line test file and edited ten others; the round-2 DB mutants cover the trigger and one CHECK, not every CHECK.

**Deviations and additions (⛔ silent):**
- **RP1** — ONE rule (`raw === url.href`, or `raw + '/'` for a bare origin) instead of enumerating forms. It also refuses an upper-case host or an explicit `:443` that an author might have typed; the error names the canonical form.
- **RP3 / RP4 — what each test PROVES.** The DB-free matrix pins the QE7 ORDER exhaustively. The two live redelivery races pin the redelivery CONTRACT but do NOT prove the lock: they still pass with `FOR UPDATE` removed (MEASURED — the unique indexes and the retry backstop converge on the same outcomes). The lock is pinned by the
  last-place race's single-`SAVEPOINT module_lead_append` assertion (that killed the no-lock mutant: the loser sent 2) and, per command, by the `commands-guards` order tests. Archive-vs-lead stays a PROBABILISTIC smoke, now said so in the spec header.
- **RP10** — the round-2 suggestion of `+ 1 ms` was NOT applied: it swings the flake the other way. 5 ms pads on both sides instead. My first default-page assertion compared against the imported constant — a tautology the `50 → 40` mutant exposed; it now asserts the literal 50.
- **RP11** — a failed fixture now rolls back; the barrier REJECTS after 4 s so a waiting racer releases its client; the pool guard is in. LEFT AS IS: the purge in `afterAll` that logs and swallows its own error (a killed run cannot run `afterAll` at all, so rethrowing would change nothing for it).
- **RP2** — `slots_pair` is shadowed by the trigger and cannot be tripped under `twt_app`: STATED (Completion Notes), not tested.
- **RP9** — `MAX_ELIGIBILITY_CLAUSES = 8` has no accept-at-limit leg: each clause kind may appear once and v1 has ONE kind, so 8 can never be reached; said in the spec.
- **RP13** — also gave AC7's "no evaluator is exported" a standing test (the barrel's export names), which discharges that half of RPD4; the AC5 `withCompensatingAudit` half and I6–I8 stay grep-only.
- **RP14** — the exclusion-chain pin reads the function's own source (`pg_get_functiondef`), and a column-by-column leg fails if a NEW column has no leg.
- **RP6** — the unmapped-UPDATE branch is reached through a non-uuid `auditId` (22P02 after a successful append); **RP12** — the success-after-retry path runs through a stub that emulates drizzle's `RETURNING` shape (`rowMode: 'array'`).
- **RP16 / RP18 / RP19 / RP20** — annotations and wording only; no behaviour.

- [x] [Review][Patch] **RP1 — `lead_handoff_url` is still stored RAW although the URL parser rewrites many shapes: RV3 / RV5 were incomplete** [`filters.ts:197-243` (`hasUrlUnsafeChar`, `moduleLeadHandoffUrlSchema`)] — MEDIUM, **traced and RUN** (node v22.22.2 + the story DB).
  Each of these passes every check and is stored unchanged, while `new URL(raw).href` differs: a lone surrogate (`…/x\ud800` → `…/x%EF%BF%BD`; ⚠ `JSON.stringify` writes the surrogate into the genesis payload and Postgres refuses it — **22P02 "invalid input syntax for type json" —
  so it fails untyped at the `events_log` append, the exact failure RV5 existed to prevent**); `https:host/x`, `https:/host/x`, `https:///host/x` (a strict RFC 3986 parser reads these as no authority); an UPPER-CASE scheme or host; an explicit `:443`; dot segments (`/a/../b` → `/b`); a non-ASCII or NBSP path character.
  The manifest is immutable (C10), so a stored value that 12.5 would read differently from the one that was checked cannot be amended. **Fix:** after the existing checks require `raw === url.href || raw + '/' === url.href` — one rule that subsumes every form above (keep `hasUrlUnsafeChar` for its clearer message) — and add a reject row for each,
  plus a payload-schema parity row. Cost: an author must type the canonical form (lower-case host, no default port, a punycode host); say so in the error. (edge #1, #2 + auditor F3 + blind #1)

- [x] [Review][Patch] **RP2 — checklist family 5 REAL GAP (AC1): three reachable CHECKs are never tripped, the two B-tree indexes are asserted by NAME only, and `slots_pair` is shadowed without a stated reason** [`projector-trigger.spec.ts:76-98`] — MEDIUM, **traced** (grep).
  `marketplace_modules_window`, `_capacity_positive` and `_manifest_schema_version_v1` appear in the live specs only in the catalog name list; the only CHECK legs are `slots_range` (`:276`) and the archive pair (`:293`, 23514 without naming the constraint). A mutant weakening `valid_until > valid_from` to `>=`, or `= 1` to `>= 1`, passes every live test — and the zod mirror in `filters.test.ts` is not a direct DB assertion.
  The index leg would pass if `(pariwar_id, current_state)` were reordered. `slots_pair` cannot be tripped under `twt_app` (the INSERT rule forces `slots = capacity`; rules (b) and (d) block any later change). **Fix:** guarded INSERTs that trip each (23514 + the constraint name), `pg_indexes.indexdef` for both indexes,
  and one sentence in the story saying `slots_pair` is shadowed and why (closure honesty, family 10). (auditor F1)

- [x] [Review][Patch] **RP3 — checklist family 2 REAL GAP (QE7): the replay-before-refusal order and the live redelivery races are not pinned** [`commands.spec.ts:428-519`, `commands-clock.spec.ts`, `module-stream-concurrency.spec.ts:133-181`] — MEDIUM, **traced** (grep: `replayed` is asserted only on an ACTIVE module with places left, and in the pre-check).
  QE7 puts `replay` second, before `ModuleNotActiveError` and `ModuleOutsideWindowError`; no test replays on an archived module or after `valid_until`, so swapping those steps survives. The most realistic redelivery — the lead took the last place and the sweep archived the module (`slot_capacity_exhausted`) — is untested.
  The only lead race uses two DIFFERENT members and two lead ids. **Fix:** (a) replay after the last place is taken and the module archived, and after the window closes (`commands-clock`) ⇒ `{ replayed: true }`, no new event; (b) a two-connection race on the same `(member, lead_id)` ⇒ exactly one `module.lead_submitted`, one replay;
  (c) one member, two lead ids ⇒ one winner, one `ModuleLeadAlreadySubmittedError`. (auditor F2 + edge #4)

- [x] [Review][Patch] **RP4 — the lock-first order (I10) is pinned only on the lead path, and the live races pass without the lock** [`commands.ts` `runLockedTransition`; `module-stream-concurrency.spec.ts:133-181`] — LOW, **layer-reported** (the mechanism).
  Without `FOR UPDATE` both last-place racers read slots=1 and both append v4; the loser's 23505 → the retry backstop → re-reads slots=0 → `ModuleSlotsExhaustedError`: identical assertions, so the race cannot tell the lock from the backstop. Archive-vs-lead asserts "no 40P01" over 6 un-forced rounds, and the Completion Notes record "run 3× green" with no revert-sanity —
  **un-attested** ([[feedback_record_unattested_no_backfill]]). **Fix:** a DB-free stub asserting SAVEPOINT → LOCK → NOW → HEAD → APPEND for schedule / activate / archive; in the last-place race assert the loser issued exactly ONE `SAVEPOINT module_lead_append`; record the archive-vs-lead race as probabilistic. (edge #8 + auditor F6 + blind #15)

- [x] [Review][Patch] **RP5 — cross-tenant behaviours the code documents as deliberate are never tested** [`commands.spec.ts:469-477`] — LOW, **layer-reported** (families 3, 9). A `lead_id` reused under ANOTHER Pariwar (RLS hides the row; `module_lead_id_uq` is not RLS-aware ⇒ `ModuleLeadDuplicateError`, no decrement); a genesis for a `module_id` already authored in another Pariwar
  (⇒ `ModuleGenesisAlreadyExistsError`); `submitModuleLead` with `pariwarId` ≠ the session scope (⇒ `ModuleGenesisMissingError`). **Fix:** `enterAppScope` B → A inside one rolled-back transaction, as `read.spec` does; assert the typed error, a usable transaction, no row or event change. (edge #5 + blind #10)

- [x] [Review][Patch] **RP6 — the projector's integrity guards have no failing-case test** [`project.ts` head check, from/to and actor cross-validation, `slots_remaining_after`, payload parse, row UPDATE] — LOW, **layer-reported**. Only the `module.authored` and actor-vs-`member_id` legs exist. Untested: stream head ≠ the locked version (drift); payload from/to ≠ the locked row;
  payload actor ≠ input actor; `slots_remaining_after` mismatch; a payload that fails its schema; a row UPDATE that fails (⇒ `ModulePersistError` with `.sqlstate` — RV6's new behaviour is only constructed directly in `errors.test.ts`, so a mutant that propagates the raw error survives); a 0-row UPDATE.
  **Fix:** live, through `projectModuleTransition` with a forged `lockedRow` under `expectRefused` — a non-uuid `auditId` makes the UPDATE fail 22P02 after a successful append, which is the cheap way to reach the unmapped-UPDATE branch. (edge #6)

- [x] [Review][Patch] **RP7 — the half-open window is tested at equality only for `authorModule`** [`commands.ts` `inWindow`, schedule, activate, `valid_until_reached`] — LOW, **layer-reported**. `now == valid_from` / `now == valid_until` are never exercised for schedule, activate, lead or archive, so `<` ↔ `<=` mutants survive.
  (Blind #7's claim that `authorModule`'s own equality leg is not equality is FALSE — dismissed below.) **Fix:** a DB-free stub test pinning `NOW` to each edge. (edge #7)

- [x] [Review][Patch] **RP8 — `pgSqlstateOf` returns any string `code`, so a Node `ECONNRESET` becomes the "SQLSTATE"** [`errors.ts` `pgSqlstateOf` / `findPgError`] — LOW, **traced** (`findPgError` accepts any link with a string `code` and `message`; round 1's print). The field is documented as an SQLSTATE.
  **Fix:** return the code only when it matches `/^[0-9A-Z]{5}$/`; add a cyclic-chain and a deeper-than-8 case to `errors.test.ts`. (Blind #3's "unbounded `findPgError`" is false — it is depth-bounded at 8 — and its non-Error-cause path is unreachable with `pg`, which always rejects with an Error.) (edge #14 + blind #3, part)

- [x] [Review][Patch] **RP9 — the manifest tests prove the reject side only, and only through `parseModuleManifest`** [`filters.test.ts`, `events.test.ts`] — LOW, **layer-reported**. The new refinements (NUL / surrogate, URL characters, the `@` rule, the 120-character scope value) are not asserted against `ModuleAuthoredPayloadSchema`, so swapping a payload field to a plain `z.string()` leaves every suite green — which falsifies the header
  claim "can never be held to different rules". And only the scope value has both sides of its limit: no accept-at-limit / reject-at-limit+1 pair for name 120, description 2000, secret name 255, URL 2048, 200 scope values, 8 clauses, or the int4 cap (2,147,483,647 / +1) — a `.max(119)` passes. **Fix:** payload-schema rows driven from the same vectors; boundary pairs. (edge #9 + blind #11)

- [x] [Review][Patch] **RP10 — the `getModuleStateAt` / read legs would not fail on the mutants that matter** [`read.spec.ts`] — LOW, **traced** for the tautologies, **layer-reported** for the rest.
  (a) The first state-at leg takes its instants from `clock_timestamp()` read through a ms-floored `Date`, against microsecond stamps — a tiny flake window. ⚠ **Fix with a 5 ms sleep on each side of every capture, NOT `+1 ms`**: the next transition can start less than 1 ms later, so `+1 ms` would swing the flake the other way. (b) The `beforeGenesis` / `afterAuthor` legs both answer `draft`
  with or without the genesis (the fold of nothing is `draft` by design) — say so. (c) `created_at DESC` is untested (one transaction ⇒ a tie; an `asc` mutant survives). (d) `LIST_MODULES_DEFAULT_LIMIT` (50) is never exercised. (e) Every `getModule` leg is masked by RLS — add a leg with RLS bypassed so the explicit `pariwar_id` predicate is what fails.
  (f) The lead-exclusion leg asserts SQL text, and `spy.mockRestore()` is skipped if the call throws — use `try / finally`. (blind #4, #9, #12, #17 + edge #12 + auditor F7)

- [x] [Review][Patch] **RP11 — fixture and cleanup hygiene in the own-committing specs** [`module-stream-concurrency.spec.ts:36-47`, `:86-101`; `read.spec.ts` afterAll; `commands-clock.spec.ts`] — LOW, **layer-reported**. `committedActiveModule` has `try { … COMMIT } finally { release }` and no ROLLBACK, so a failed author / activate returns an aborted connection with `SET LOCAL ROLE twt_app` to the pool and cascades 25P02 into the later racers and the purge.
  `barrier()` deadlocks if one racer throws before `arrive()` — the other waits, the client is never released and `pool.end()` hangs. `read.spec`'s afterAll lacks `if (!pool) return`. The three own-committing specs purge only in `afterAll` and swallow a purge error with `console.error`, so a killed run leaves committed rows in PARIWAR_A.
  **Fix:** `catch { ROLLBACK; throw }` in the helper, release in a `finally`, the pool guard. (edge #15 + blind #13, #14)

- [x] [Review][Patch] **RP12 — the lead retry's recovery path and its backoff are never observed** [`lead-retry.test.ts:83-110`] — LOW, **layer-reported**. The stub's APPEND always rejects, so "fail once or twice, then succeed" — the path after `continue` that re-locks, re-reads the head and returns — is untested; and the backoff is proved only as the pure `leadRetryBackoffMs`,
  so deleting `await sleep(leadRetryBackoffMs(attempt))` survives (AC6: "backoff `min(200, 10·2^attempt)` ms"). **Fix:** fail twice, succeed on the third; spy on `setTimeout` and assert the delays 10 and 20. (blind #6 + edge #16 + auditor F5)

- [x] [Review][Patch] **RP13 — titles and comments that promise more than the assertions, and one tautology** [several] — LOW, mixed (the tautology **traced**). `state.test.ts:125` `expect(moduleStateMachine.fold(prefix)).toBe(moduleStateMachine.fold(prefix))` is a tautology (line 124 is the real assertion);
  "a lead on a non-active module (draft, scheduled, archived)" never creates a `scheduled` module; the `slot_capacity_exhausted` "only when active" leg cannot isolate its clause (a non-active module cannot hold 0 places, so the "places left" guard fires first) — reword it; "every leg throws `ModuleProjectorInputError` with no event" ends in positive calls;
  "each refusal in QE7 order" proves one ordering; `filters.test.ts` "is not an evaluator" asserts nothing; `AUTHORED_CAPPED` in `state.test.ts` is the malformed genesis. **Fix:** retitle or add the missing leg. (blind #8, #21 + auditor F8 + edge #16)

- [x] [Review][Patch] **RP14 — the whole-row trigger is sampled, and the "prefix once" assertion is tied to a hand-built string** [`projector-trigger.spec.ts:~207`; `errors.test.ts:TRIGGER_TEXT`] — LOW, **layer-reported**. The "any I2 content column" leg covers 7 of the immutable columns (not `eligibility_filter`, `branding_bundle`, `name_hi`, `description_*`, `valid_from`, `partner_id`, `module_id`, the secret name, `manifest_schema_version`);
  a column wrongly added to the trigger's exclusion chain would pass. And `TRIGGER_TEXT` is typed by hand with an em dash, so nothing checks the migration's real RAISE separator against `stripDirectWritePrefix` (an en dash would yield `PREFIX: – only …`). **Fix:** pin the exclusion chain from `pg_get_functiondef` to exactly the six projected columns and loop the rest;
  a live leg that feeds a REAL trigger rejection through `ModuleStateDirectWriteError` and asserts the prefix once. (blind #5, #18)

- [x] [Review][Patch] **RP15 — the reducer's negative paths are untested** [`state.test.ts:110-162`; `state.ts:131`] — LOW, **layer-reported** (checklist family 1). Every fold stream is a legal sequence, so removing `if (next === null) continue` passes the suite although the docstring promises that an inapplicable lead takes no place.
  Not covered: a lead on a draft module, a second archive, an unknown event type, a lead after archive; and `scheduleModule` on an `archived` module (the tests check archive and activate only). **Fix:** one fold row for each. (edge #11)

- [x] [Review][Patch] **RP16 — spec edits did not propagate: the round-1 patches changed behaviour, and the QE / I / AC text that states it was not annotated** [QE5, QE6, QE9, QE12, the I11 table, AC7] — LOW, **layer-reported** (line numbers are the Auditor's; not re-read). The memory rule: AC forbids X, Task orders X ⇒ ships X ([[feedback_spec_edits_must_propagate_to_tasks]]).
  QE6 still reads "`trustee_archived` — from any non-archived state" and the I11 table row "`module.archived` | operator | trustee | system (the 12.6 sweep is system)" although the code now refuses `system` + `trustee_archived` (RV8); QE5 / QE9 still say scope values are "1–200 entries, unique, non-empty" (RV5: ≤ 120 characters, no NUL / unpaired surrogate);
  QE5 / AC7 do not list the URL whitespace / control / backslash refusal (RV3) or the canonical-form rule (RP1); QE12 does not describe the prefix / lead-skip semantics of `getModuleStateAt` (RV1). **Fix:** an annotation on each, naming the review id; the original words stay. (auditor F4)

- [x] [Review][Patch] **RP17 — RV9 was only partly done: the admin-shape warning is a file header, not on the two accessors** [`read.ts:5-9`] — LOW, **traced**. RV9 asked for "a doc comment on both accessors"; `getModule` and `listModulesForPariwar` keep their old JSDoc, so an IDE hover shows no warning. **Fix:** one line on each. (auditor F9)

- [x] [Review][Patch] **RP18 — the Disposition omits three things it did** [Disposition paragraph] — INFO, **traced**. (a) RV6: `-429` A1 in `.decision-log.md` was left as written — a governance entry is superseded, never edited; say so. (b) `archiveModule` now calls `assertModuleActor` itself, and `runLockedTransition` calls it again (harmless, unasked).
  (c) New exports: `MAX_SCOPE_VALUE_LENGTH`, `refineModuleWindow`, `mapModuleWriteError` (spec use), and `pgMessageOf` / `pgSqlstateOf` (reaching the `marketplace` namespace through `export *`). (auditor F10, F11)

- [x] [Review][Patch] **RP19 — closure honesty (AC12): the recorded green run and the test counts describe the PRE-patch tree** [Task 9, the Debug Log, Completion Notes] — INFO, **traced**. Task 9 is `[x]`, the Debug Log reads "ci:local PASSED — 37 job(s) green", and the Completion Notes give filters 83 / events 32 / read 4 — now 100 / 34 / 6 (counted this round from the files).
  The Disposition says `ci:local` was not re-run, but the records themselves are not annotated. **Fix:** annotate each "(pre-patch; v1.7: …; no `ci:local` since)" — the original words stay. (auditor F13)

- [x] [Review][Patch] **RP20 — one `⛔` remains in a registry runtime string** [`registry.ts:~650`, the `module.lead_submitted` description: "(lower-case, ⛔ PII)"] — INFO, **layer-reported**. RV11 was scoped to the "No production emitter" template; this is the same double-negative reading in a catalog string. **Fix:** "NO PII". (blind #20 + auditor F12)

- [x] [Review][Defer] **RPD1 — `foldModuleProjection` re-parses history through the WRITE schema** [`state.ts:126`] — deferred: **layer-reported**, no stored data. It reads `slot_capacity` via `ModuleAuthoredPayloadSchema.safeParse`, so any genesis written before a schema tightening (RV3 / RV5 / RV7 tightened it) folds to `slotsRemaining: null`
  silently and I4 would disagree with the row. ADR-0044 D4 says a change that makes an existing stored value stop parsing is `version: 2`. Harmless today: no `module.*` event exists outside tests (I6) — ⚠ **record that the schemas were tightened BEFORE any module existed**. ⭐ Trigger: the first module stored, or the first tightening after 12.2 ships; read capacity through a narrow `{ slot_capacity }` schema then. (blind #19 + edge #10 + auditor F14)
- [x] [Review][Defer] **RPD2 — the RLS UPDATE `WITH CHECK` is never isolated, and the fail-closed leg tests `''` rather than an unset GUC** [`marketplace-modules-policy-regression.spec.ts:~73`] — deferred: **layer-reported**. The UPDATE policy is unreachable behind the immutability trigger (rule (b) fires first); isolating it needs the trigger stepped aside, as the INSERT leg does.
  ⭐ Trigger: any change to the policies or the trigger. (blind #16)
- [x] [Review][Defer] **RPD3 — the clock spec is one 20 s `it` that outwaits the DB clock with app-clock sleeps** [`commands-clock.spec.ts:~102`, `:~143`] — deferred: **layer-reported**. Three scenarios share one `it`, so the first failure hides the rest, and a 500 ms margin between a Node timer and the DB `now()` can be exceeded by Docker / VM clock drift.
  ⭐ Trigger: the first flake of this file — poll the DB clock until `valid_*` has passed, and split the scenarios. (blind #22)
- [x] [Review][Defer] **RPD4 — the negative-claim ACs have no standing test** [AC5 "no domain function calls `withCompensatingAudit`", AC7 "no evaluator is exported", I6, I7, I8] — deferred: **traced**. Each is proved by a one-time grep in the Completion Notes; nothing re-checks it ([[feedback_negative_claims_checkable_in_repo]]). I6 changes meaning when 12.2 adds the first production caller.
  ⭐ Trigger: Story 12.2's create-story — decide then which of these becomes a gate or a test. (auditor F15)

**Dismissed (7 groups, 8 raw items):** "the `@` rule has no code behind it" — it is `raw.includes('@')` in `filters.ts`, added in round 1 and outside this patch's hunks (blind #2) · "`findPgError` is unbounded" — it is depth-bounded at 8; a non-Error cause under a drizzle wrapper is unreachable with `pg` (blind #3, remainder) ·
"the A5 boundary `valid_until == now()` is not tested" — FALSE: `authorModule` compares two JS Dates from the same `SELECT now()` (`manifest.validUntil.getTime() > now.getTime()`), so ms-equality is the real boundary and the leg hits it (blind #7) ·
"unmapped pg failures keep the manifest in `.message`" — the API's global handler (`apps/api/src/middleware/error-mapping/index.ts`) returns an opaque 500 and "never exposes `err.message`"; only a typed error with `toErrorResponse` reaches a client, which is why RV2 mattered. Server-side logs carry the params for EVERY drizzle error, house-wide (edge #3) ·
"`getModuleStateAt` throws a RangeError on an Invalid Date" — the old `lte(col, at)` reached `toISOString()` through drizzle's column mapper on the same value; no change (edge #13) · "`trustee_archived` is still accepted from `operator`" — RV8 deliberately excluded `system` only; who may record a trustee's decision is the 12.2 authorization surface, and there is no route here (edge #17) ·
duplicated test helpers (`inTx`, the purge `afterAll`, `base()`) (blind #23).

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
  state and grief suppression server-side. The shelf READ also field-picks: `getModule` / `listModulesForPariwar` are
  the ADMIN shape (code review RV9).
- **C10 → 12.2 / 12.5:** a correction or endpoint change means re-authoring, which resets places and allows duplicate
  leads. The wizard warns.
- **C11 → 12.2:** scope values are not validated against the geo tree; the wizard picks them from the tree.
- **C13 → 12.3 / 12.5 (with C6):** an operator-assisted lead (staff registering interest for a member) is NOT supported —
  a lead's actor must be the member (I11). A helpline path needs its own consent basis and a separate actor model.
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
    - `MODULE_EVENT_TYPES` exact membership (`toEqual`), ⛔ a length;
    - the lead schema rejects `actor: 'operator'`; the non-lead schemas reject `actor: 'member'`;
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
    - AC5's I11 actor legs;
    - the genesis legs: a non-empty stream (`ModuleGenesisAlreadyExistsError`, then the transaction is still usable —
      run one more query); a wrong-Pariwar scope (42501); payload content equal to row content, column by column;
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

Claude Opus 5.5 (`claude-opus-5-5`), via `bmad-dev-story`, 2026-10-31.

### Debug Log References

- **Task 0.1 (2026-10-31, before any code).** `git fetch origin`: `origin/main` = `b2f36fe9` = the merge-base ⇒ no
  rebase. Re-grepped across every ref and all six worktrees:
  - decisions: highest `2026-10-31-429` (ours); `-425` / `-426` / `-428` elsewhere ⇒ next ≥ `-430`;
  - migrations: highest `0192_questionnaire-versions` (journal `when` 1796182800037) on every branch / worktree ⇒ `0193`
    is free;
  - ADRs: highest `ADR-0043` everywhere ⇒ `ADR-0044` is free;
  - `PERMISSION_CATALOG_VERSION = 56` (13-2's worktree is stale at 53 — not ahead);
  - ledger letters: ours `p`/`q`/`t`/`u`/`v`; 11b-5a holds `o`/`r`/`s`; 6-38 `m`/`n`/`o`; `origin/main` ends `k` ⇒ next ≥ `w`.
  - Re-verified: G2 (0084 trigger guards only the pair; `HELPDESK_TICKETS_TABLE`, `GUARDED_COLUMNS`,
    `MIN_EXPECTED_FILES = 50`; the three wiring lines), G4 (registry import line unchanged, 86 `schema:` entries),
    G5 (`0001` append-only text; AFTER INSERT triggers only in 0036 / 0093 / 0097), G7 (both "deliberately NOT branded"
    comments; `moduleId: body.module_id ?? null`), G11 (`getMemberAccountOverlay` only in `member/{overlay,index}.ts`),
    G17 (`to_regclass('pariwars')` is NULL).
  - Count greps: `EVENT_TYPE_REGISTRY` consumers = `smoke.test.ts` (two named keys) + `claim-registry-coverage.test.ts`
    (set equality); tuple length assertions = `MEMBER_EVENT_TYPES` 24 ×2, `CLAIM_EVENT_TYPES` 37 / `> 30` ⇒ none moves.
- Story DB: a dedicated container `twt-121-pg` on **:5471** (database named `twt_dev`), migrated to 0192 (0 `events_log`
  rows, session `TimeZone` UTC).

- **Task 2.3 measurement (G13).** The story DB `events_log` had **0 rows / 88 kB** at migration time. To measure a
  populated table, both `CREATE UNIQUE INDEX` statements were timed inside a ROLLED-BACK transaction on the shared
  `twt-test-pg` (:5433, idle — 0 active sessions): **56,932 rows / 27 MB → 133 ms + 28 ms** (`\timing`); nothing was
  left behind (0 `%_probe` indexes after).
- **Task 6 revert-sanity.** A stray `db.update(marketplaceModules).set({ slotsRemaining: 0 })` in a scratch file under
  `packages/domain/src/marketplace/` turned `pnpm marketplace-module-state:check` RED (1 finding, exit 1); with the file
  removed it is green again.
- **AC12 — `pnpm ci:local`.** Run 1 (fresh `twt-121-pg` :5471) was RED in 5 jobs (typecheck, build, test (unit),
  crypto-check, integration-tests), ALL from one cause: `@twt/contracts#build` → TS2307 *"Cannot find module
  '@twt/i18n'"* — this worktree's install predated contracts' `@twt/i18n` workspace dep (the known machine-state trap,
  ⛔ code). Fix: `pnpm install --frozen-lockfile` (re-links only; ⛔ tracked file changed); ⛔ dangling links found.
  **Run 2, on a re-created fresh container: `ci:local PASSED — 37 job(s) green`** (⚠ PRE-patch run. After code review v1.7 / v1.8 a SECOND full `ci:local` ran on the patched tree against a fresh container: 36 of 37 jobs green in one invocation; the one red, `test (unit)`, was `@twt/admin` timing out under CPU contention and passed on a re-run of that job — see the round-2 Disposition) (incl. the new
  `marketplace-module-state-invariant` and `integration-tests`: domain 457 files / 7,007 tests (1 skipped), api 208 /
  2,500 (1 skipped), jobs 86 / 1,962, events 8 / 39, public 37 / 807, channels 21 / 468, validity-service 21 / 284,
  niyamavali-engine 13 / 144, queue 1 / 4). ⚠ The machine load reached 68.8 (1-min) by the end — a peer was busy; the
  run stayed green regardless.
- Two test-only fixes during GREEN (⛔ code defects): `checkModuleLeadAllowed` reads through drizzle `execute`, which
  returns `timestamptz` as a STRING (the raw `pg` client returns a Date) — the row adapter now accepts both; the RLS
  fail-closed leg first cleared the scope `seedBoth` had set in the same transaction.

### Completion Notes List

- **What was built.** The SIXTH event-derived-state primitive in `packages/domain/src/marketplace/` (⛔
  `packages/marketplace`): `marketplace_modules` (migration `0193`, hand-authored; six named CHECKs; GRANT S/I/U; ENABLE +
  FORCE RLS with three per-command policies; the whole-row write guard trigger with INSERT rules + UPDATE rules (a)–(e));
  the five `module.*` events (registered); the pure reducer + `foldModuleProjection`; the two projectors (the only
  writers); the five commands + `checkModuleLeadAllowed`; the three reads; the typed errors; the three brands + the QE14
  helpdesk back-brand; the `marketplace-module-state-invariant` gate (wired in `package.json`, `ci-local.sh`, `ci.yml`);
  ADR-0044 (`drafted`, committed ALONE as `28908112`).
- **Tests.** DB-free: `tests/marketplace/{filters (83), events (32), state (42), lead-retry (5)}` + `tests/ids` (14) +
  `packages/events/tests/module-registry-coverage` (3) + the gate's `lib.test.ts` (20). Live-DB (story container
  :5471): `projector-trigger` (16), `commands` (17), `commands-clock` (1, ~5 s), `module-stream-concurrency` (3; run 3×
  green), `read` (4), `rls/marketplace-modules-policy-regression` (8). Own-committing specs clean up by id (0 rows left).
  ⚠ (PRE-patch counts. After code review v1.7: DB-free `tests/marketplace` 267 across seven files — filters 121, events 42, state 47, errors 21, commands-guards 25, archive-actor 6, lead-retry 5 — plus `tests/ids` 36;
  live-DB 72 — projector-trigger 22, commands 28, read 8, module-stream-concurrency 5, commands-clock 1, rls policy-regression 8.)
- **I6 — no production call site.** `grep -rnE "\b(authorModule|scheduleModule|activateModule|submitModuleLead|archiveModule|checkModuleLeadAllowed|projectModuleGenesis|projectModuleTransition)\("`
  over `apps packages scripts`, excluding tests and `packages/domain/src/marketplace/` → **no hits**.
- **I7.** `PERMISSION_CATALOG_VERSION = 56` (unchanged); `git diff b2f36fe9` over `rbac/`, `consent/`,
  `schema/consent_records.ts` → empty. ⛔ role, permission key or consent value added.
- **I8.** `member/overlay.ts` untouched (empty diff); ⛔ new `account-frozen` source.
- **I9.** `ModuleLeadSubmittedPayloadSchema` is `.strict()` with exactly `lead_id`, `member_id` (lower-case uuids),
  `slots_remaining_after`, `from_state`, `to_state`, `trigger`, `actor` — ⛔ PII key can be added without a schema change;
  the genesis carries the manifest only (⛔ member data).
- **⛔ `withCompensatingAudit` call in the domain** — the only two hits in `marketplace/` are doc comments (QE15).
- **Variances from the epic / PRD (as the story lists them, all built):** ⛔ `packages/marketplace`; `pariwar_id` NOT
  NULL with ⛔ FK; `module.lead_submitted` (⛔ `module.lead-submitted`); `lead_handoff_signing_key_secret_name` (⛔
  `_ref`); `state` → `current_state`; branding → `logo_object_key` + one `accent_color_hex`; the scope vocabulary
  (eligibility "district" → scope); `age_band` absent; the half-open window `[valid_from, valid_until)`;
  `member_state_in` excluding withdrawn / anonymized; the URL rules; `commission_terms` / the external CTA / restore
  deferred.
- **Implementation choices the story left open (recorded, for review):**
  1. The URL rule refuses a RAW `?` / `#` too, not only a non-empty `url.search` / `url.hash` — the WHATWG parser
     reports a bare `https://h/x?` as `search === ''`, so the story's `url.search === '' && url.hash === ''` alone
     would admit it. It also refuses `localhost.` (trailing dot) and `*.localhost`, and the IP check runs on the PARSED
     hostname, so `0x7f.0.0.1` / `2130706433` (normalised to `127.0.0.1`) are refused.
     (Added by code review RP2, 2026-10-31:) `marketplace_modules_slots_pair` cannot be tripped under `twt_app` and is NOT tested: the INSERT rule forces
     `slots_remaining = slot_capacity` (so the two are NULL together or neither is) and rules (b) and (d) refuse any later change to either — the trigger
     SHADOWS that CHECK, which stays as the backstop for a role that bypasses the trigger. The other five CHECKs are each tripped by name.
     (Added by code review RV3 / RV4, 2026-10-31:) it also refuses any whitespace, control character or backslash — the
     parser would strip or rewrite them while the column stores the RAW string — and any `@` ANYWHERE in the string,
     stricter than "no userinfo": `https://partner.example/@team/hook` is refused. Kept deliberately (a raw `@` is the
     classic parser-differential); a test row pins it.
  2. `slot_capacity` is capped at the int4 maximum in zod, so a huge value is a `ModuleManifestInvalidError`, ⛔ a 22003.
  3. `foldModuleProjection` reads an archive's `reason` field on its own (an unknown value → `null`), and counts only
     the events the reducer APPLIES; an empty stream folds to `{ draft, version 0, null, null }`.
  4. `getModuleStateAt` keeps the non-nullable `getMemberStateAt` shape: no event at or before `at` replays to the
     pre-genesis `draft`; callers needing existence check `getModule`.
  5. `projectModuleTransition` maps the lead 23505s (`module_lead_member_uq` / `module_lead_id_uq` / the version slot)
     itself, so a raw projector caller also gets typed errors; `submitModuleLead` retries only
     `ModuleStreamConcurrencyError`.
  6. `projectModuleTransition` also cross-checks `payload.actor === actor` (beyond the story's three checks) and reads
     the stream head with an explicit `pariwar_id` predicate.
  7. Each of `scheduleModule` / `activateModule` / `archiveModule` runs inside `SAVEPOINT module_transition` (the
     story names the genesis and lead savepoints; this one keeps AC5's "transaction stays usable" for a projector-level
     failure too).
  8. AC5's wrapper spec baselines on `max(seq)` of `audit_log_entries` — the table has ⛔ `created_at` column
     (`recorded_at` + `seq`).
- **Not addressed (observed, ⛔ built):** the access-wrapper gate's per-epic SCAN_ROOTS convention (AI-6-1) is ⛔ engaged
  by 12.1 — it has ⛔ verification context, ⛔ audit pairing and ⛔ route; the first Epic-12 route story (12.2 / 12.3) is
  where it applies.
- **Commits.** Only `28908112` (ADR-0044 + the index flip, alone — AC11). The code, tests, gate, migration and records are
  UNCOMMITTED on `story/12-1-…`, for code review (the 6.33 precedent: committed after review). ⛔ pushed.

### File List

**New**
- `packages/domain/migrations/0193_marketplace-modules.sql`
- `packages/domain/src/marketplace/{commands,errors,events,filters,index,project,read,state}.ts`
- `packages/domain/src/schema/marketplace_modules.ts`
- `packages/domain/src/policies/marketplace-modules-rls.ts`
- `packages/domain/tests/marketplace/{archive-actor,commands-guards,errors,events,filters,lead-retry,state}.test.ts` (`archive-actor`, `errors`: code review v1.7; `commands-guards`: v1.8)
- `packages/domain/tests/integration/marketplace/{_fixtures.ts,commands.spec.ts,commands-clock.spec.ts,module-stream-concurrency.spec.ts,projector-trigger.spec.ts,read.spec.ts}`
- `packages/domain/tests/integration/rls/marketplace-modules-policy-regression.spec.ts`
- `packages/events/tests/module-registry-coverage.test.ts`
- `scripts/marketplace-module-state-invariant/{check.ts,lib.ts,lib.test.ts,README.md}`
- `docs/adr/ADR-0044-module-manifest-schema-versioning.md` (committed `28908112`)

**Modified**
- `packages/domain/migrations/meta/_journal.json` (idx 193, `when` 1796269200038)
- `packages/domain/src/index.ts` (the `marketplace` namespace + the top-level direct-write set)
- `packages/domain/src/ids/index.ts` (`ModuleId`, `PartnerId`, `ModuleLeadId`)
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts` (additive exports)
- `packages/domain/src/schema/events_log.ts` (one header comment)
- `packages/domain/src/schema/helpdesk_tickets.ts`, `packages/domain/src/helpdesk/project.ts` (QE14 — type + comment)
- `apps/api/src/modules/helpdesk/handlers.ts` (QE14 — the one `ids.moduleId(...)` line)
- `packages/domain/tests/ids/branded-ids.test.ts`
- `packages/events/src/registry.ts` (the import + five entries + a section header)
- `package.json`, `scripts/ci-local.sh`, `.github/workflows/ci.yml` (the gate wiring)
- `docs/knowledge-transfer/adr-index.md` (row flip + summary + reconciliation note; committed `28908112`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (row; ledger lines)
- `_bmad-output/implementation-artifacts/deferred-work.md` (code review v1.7: a section of six defers + one line under C9)
- `_bmad-output/implementation-artifacts/12-1-module-manifest-schema-module-lifecycle-state-machine.md` (this file)

### Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-31 | v1.8 | Code review ROUND 2 (chunk 2 — the tests — plus the round-1 patch diff), Blind / Edge / Auditor: 0 decision-needed, 20 patch, 4 defer, 7 dismissal groups. BigDev: option 1 — all 20 applied (uncommitted): `filters.ts` (canonical URL form), `errors.ts` (SQLSTATE shape), `read.ts` / `registry.ts` wording; a new DB-free `commands-guards.test.ts`; live legs for the CHECKs, indexes, trigger chain, redelivery, cross-tenant and projector guards. 303 DB-free + 72 live green; 18 mutants killed this round. `ci:local` on the patched tree: 36 of 37 jobs in one invocation (the red `test (unit)` was `@twt/admin` timing out under CPU load; that job is green on a re-run). NOT done: a single green `ci:local` invocation; a review of this round's own diff. Status stays `review`. |
| 2026-10-31 | v1.7 | Code review, chunk 1 of 2 (production code), Blind / Edge / Auditor: 1 decision-needed (RVQ1 → BigDev: amend AC3), 11 patch, 6 defer, 12 dismissal groups. BigDev: option 1 — all 12 patches applied (uncommitted): AC3 amended; RV1–RV11 in code, tests, `deferred-work.md` and prose. Chunk 2 (tests) and the PATCH diff are NOT yet reviewed; status stays `review`. |
| 2026-10-31 | v1.6 | Implemented by `bmad-dev-story` (Tasks 0.1–9). Task 0.1 re-grep clean (`origin/main` = `b2f36fe9`; `0193` / `ADR-0044` / ledger `w` free). Built the primitive, migration `0193`, the gate and ADR-0044 (`drafted`, committed alone as `28908112`); 211 marketplace tests + the gate's 20; `ci:local` 37/37 green on a fresh container (run 1's 5 reds = a stale install, re-linked). Eight implementation choices recorded in Completion Notes for review. Code UNCOMMITTED for review; ⛔ pushed. Row in-progress → review; ledger `2026-10-31w`. |
| 2026-10-31 | v1.5 | BigDev's four checks (*"check these"*), each verified in the repo. (1) The genesis projector gets a seven-step contract equal in precision to the transition's (actor check, stream-empty, payload build + parse, append, guarded INSERT, error map, SAVEPOINT discipline) plus `authorModule`'s order. (2) Registry counts: ⛔ registry-wide count exists (grep evidence); the per-family length assertions (member 24, claim 37) do not move; the re-grep commands and the update-in-the-same-commit rule are added; `MODULE_EVENT_TYPES` gets exact membership. (3) The index build: a partial index still scans all of `events_log` under a SHARE lock that blocks every event INSERT; "fast because no lead rows" withdrawn; accepted pre-production (`0079` / `0185` precedent), with a measure step and a stop-and-route trigger if a populated live DB exists. (4) I11: a lead's actor is `member` and `actorId === memberId` (a member session's `actorId` IS the `member_id`); members cannot author, schedule, activate or archive; operator-assisted leads are not supported (C13). This implements `-429` A6 — ⛔ new decision. Ledger `2026-10-31v`. |
| 2026-10-31 | v1.4 | SECOND validation by four read-only verifiers (DB feasibility; dev-agent dry run; adversarial semantics; records audit); BigDev: *"apply all findings"*. **Decisions:** amending author-commit `-429` (`0168592b`) — every transition locks the row first (deadlock); lead-id idempotency; URL rules; `member_state_in` excludes withdrawn / anonymized; authoring dates; actor set + triggers; §0 / D8 corrections. **Spec precision added:** exact signatures; payload schemas; constants; the projector contract (`lockedRow`); the transitions table; the clock spec; the DB-free retry test; the real-wrapper recipe; SAVEPOINT discipline; trigger rules (d) / (e) + 23514; citation fixes (`0096` / `0185` / `0189`). **Carried items:** C9–C12 added; C2 / C4 / C8 rewritten; trust-deed "disclosed" + Hindi grep. **Records:** ledger `r` → `t`; NUMBERS corrected (`-426` / `-428` taken); Task 0.1 open. Trimmed duplication. |
| 2026-10-31 | v1.3 | Task 0.4 records (`39ef1763`). |
| 2026-10-31 | v1.2 | Task 0.2 answered (*"QE1-QE15 as recommended."*); Task 0.3 `-427` (`a22dbdec`). |
| 2026-10-31 | v1.1 | Fast-forwarded to `b2f36fe9`; first validation (three verifiers), 19 improvements. |
| 2026-10-31 | v1.0 | Created at `01062c51`; row backlog → ready-for-dev. |
