---
baseline_commit: 3d6b46c5
---

<!--
PINNED: `3d6b46c5` = `origin/main` (`git fetch origin` 2026-11-01, at authoring — Story 12.1 had just landed). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/14-3-dpo-breach-reporting-operational-readiness`, branch
`story/14-3-dpo-breach-reporting-operational-readiness` (upstream UNSET — push with an explicit refspec)
([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] — peer sessions `twt-bb` / `twt-57` were BUSY; the main
checkout was ⛔ switched). Every `apps/` / `packages/` / `docs/` claim below was traced at `beae5116` on 2026-11-01 by three read-only
passes (governance records, code substrate, DPDP law) and re-checked at `3d6b46c5` (12.1's diff touches ⛔ file this story cites except
`sprint-status.yaml` and migration `0193`). Re-locate by FUNCTION, ⛔ by line number — line numbers rot.
⚠ **STALE BASE (v1.3, 2026-11-20):** `origin/main` is now `a7c99c6a`, **304 commits** past the pin. The v1.3 validation re-checked the
cited symbols at `a7c99c6a` (read-only `git show origin/main:…`; the branch was ⛔ rebased): 26 cited files changed (`api/client.ts`,
`api/hooks.ts`, `RootLayout.tsx`, `server.ts`, `emit-openapi.ts`, `permissions.ts`, `roles.test.ts`, `access-wrapper-invariants/check.ts`,
`microcopy.yaml`, `memorial-takedown/handlers.ts`, …). Verified STILL TRUE at `a7c99c6a`: `isCheckViolation` in
`memorial-takedown/handlers.ts`; `hasAuditVerify` + `newIdempotencyKey` in `api/hooks.ts`; `defaultRoleBundles` `toHaveLength(13)`; the
`member.data_rights` "⛔ No `dpo` role … activates at the MeitY threshold" comment; ⛔ `twt_service` grant on `members`; ⛔ IST
`datetime-local` helper. Changed: see G19, G20, DL4, DL9, DL10, DL12, NUMBERS. ⇒ Task 0.1 REBASES first.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): almost
everything here is the AUTHOR's (HOW to be ready) or is FOUND (what the statute says — [[feedback_provider_policy_is_found_not_counsel]]).
ONE question is the Panel's — WHO owns a breach for the Trust before a DPO exists, and WHEN a DPO is appointed (PRD OQ-7, open since
2026-05-22) — and is PQ1 (one NON-BLOCKING note, Task 0.3). Legal residue the statute leaves open is COUNSEL's (CQ1–CQ5, Task 0.5),
⛔ the Panel's.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or
the row key.

NUMBERS (⛔ claimed by this file — every number below is "the next free AT THE COMMIT THAT TAKES IT"; the value in brackets is only the
value at authoring): at authoring the highest MINTED decision on any ref is `2026-10-31-432` (`story/11b-5a-…`; main's is `-430`) ⇒ Task
0.4's entry [`-433`]. Highest minted roster row: Row 45 ⇒ [Row 46] (⚠ superseded at v1.3 — Row 46 is 6.39's; see RE-DERIVED below). Highest migration on any ref: `0194_memorial-kinship`
(`story/11b-5a-…`, unlanded, journal `when` 1796355600039); main holds `0193` ⇒ [`0195`], `when` ABOVE every sibling's
([[project_sibling_migration_when_order_shared_db]]). Permission catalog on main: `PERMISSION_CATALOG_VERSION = 56` ⇒ [57]. Ledger
(re-derived on every ref AND every worktree's dirty `sprint-status.yaml`, 2026-11-01): `2026-11-01a` (main), `-b` (`story/6-22-…`),
`-c` (held THREE times — `story/13-2-…` `2a89a370`, committed 19 s BEFORE this branch's `0280dfc9`; this branch; 12.2's dirty tree),
`-d` (`story/13-2-…` and `story/6-22-…`). This creation's line keeps `2026-11-01c`; the v1.2 validation's is `2026-11-01e`. ⚠ Whichever
of 13.2 / 14.3 lands SECOND relabels its `-c` line to the next free letter at landing, keeping both entries
([[project_rebase_ledger_conflict_separator]]).
⚠ **PEERS RESERVE THE SAME NUMBERS IN THEIR STORY FILES (⛔ minted yet):** 6.39 (`story/6-39-…`: Row 46 "Members' claims go live",
catalog 56→57, THREE migrations — two enum-value migrations, then `0196_claim-membership-checks`); 6.22 (`story/6-22-…`: decision `-433`,
`0195`, catalog 57; it defers Row 46 to 6.39); 12.2 (worktree `12-2-…`, untracked story file: `-433`, `0195` / `0196_marketplace-partners-and-publications`,
catalog 57); 13.2 (`story/13-2-…`, committed `b85a597e`: a migration `NNNN_field-worker-attribution-codes`, `-433` only "if one becomes
necessary", catalog stays 56). Whoever commits first takes the number; every later one re-derives. ⇒ This file writes the placeholders
`<DEC>` (decision), `<ROW>` (roster row), `<MIG>` (migration), `<CAT>` (catalog version) wherever the value is not yet minted.
⭐ **RE-DERIVED 2026-11-20 at `origin/main` `a7c99c6a` (v1.3 — still ⛔ claimed; re-derive at each commit):** `-433` was TAKEN by Story
12.2; main's highest decision `2026-11-20-466` ⇒ [`-467`]. Migrations: `0194`–`0207` ALL landed on main (`0207_field-worker-ending-undo-appeal-link`)
⇒ [`0208`]. `PERMISSION_CATALOG_VERSION = 63`, 94 keys ⇒ [64], [95]. Roster: main's highest Row 52; ⚠ **Row 46 is ⛔ 14.3's** —
`story/6-39-…`'s story file claims Row 46 BY NAME, and main's Rows 47–52 each skip it as "reserved by 6.39 / 14.3"; one number cannot
serve two stories ⇒ 14.3 RELEASES its share of 46 and takes the next free row ⇒ [Row 53], its preamble saying why 46 is skipped (DL12).
Peers: 6.22, 12.2 and 13.2 have LANDED; still open: `story/6-22b-…` and `story/6-39-…` (re-derive their migrations / catalog / rows).
Ledger: main holds `2026-11-01c` AND `2026-11-01e` as Story 13.2's lines (main's 11-01 letters run to `ad`) ⇒ at the Task 0.1 rebase
this branch's `-11-01c` and `-11-01e` lines relabel to the next free 11-01 letters (`ae`, `af` today), BOTH entries kept, `---`
separator kept ([[project_rebase_ledger_conflict_separator]]); the v1.3 validation's line is `2026-11-20f`.

PRIVATE CORPUS: this repo is PUBLIC (`ulanzi1/twt`). The Niyamavali, the Deed and the draft privacy policy live in the PRIVATE `twt-legal`
repo (`2026-08-28-167`: cite sections by number; ⛔ paste). Every reference below to them is a PARAPHRASE with a section number — and so
must be every file this story writes (runbooks, the PQ1 note, the CQ file, the decision entry).

LETTERS: **G** = found facts (G1–G22); **DL** = build decisions (DL1–DL14, PROPOSED — BigDev answers at Task 0.2); **PQ** = Panel question
(PQ1); **CQ** = counsel questions (CQ1–CQ5); **TR** = traps; **AC1–AC13**.
-->

# Story 14.3: DPO + Breach-Reporting Operational Readiness — the Trust Can Tell the Board and Every Affected Person on Time, and Knows Who Answers

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Under India's DPDP Act 2023 (s.8(6)) and DPDP Rules 2025 (Rule 7), **every** Data Fiduciary
> that suffers a personal data breach must tell **each affected person** "without delay", tell the **Data Protection Board** "without
> delay", and send the Board a **detailed report within 72 hours** of becoming aware — **whether or not** it is a Significant Data
> Fiduciary (G1). The epic framed breach reporting as activating "at MeitY SDF threshold"; that premise is FOUND wrong for breach
> reporting — only the **DPO** is SDF-gated (G3), and SDF status has **no numeric threshold** (G4). Today the Trust has ⛔ breach runbook,
> ⛔ place to record an incident, ⛔ draft of any notice, ⛔ named owner, and ⛔ launch-gate row (G6–G12). This story builds: **(1)** a
> breach register in the admin app — open an incident, record what happened as an append-only timeline, see the Board's 72-hour clock,
> and get the three Rule-7 notices DRAFTED from what was recorded (⛔ sent — staff send them); **(2)** one live link from the only
> detection signal that persists today (a failed audit-chain check); **(3)** a members-on-record count for the monthly review; **(4)** the
> runbooks (breach response, DPO appointment + SDF watch with the FR-99 monthly review, a breach table-top script); **(5)** the records —
> an author-commit decision, launch-gate Row <ROW>, a counsel question, a non-blocking Panel note on who owns a breach before a DPO exists.
> ⛔ Notice is sent by the system. ⛔ `dpo` role. ⛔ New alert sink or paging. ⛔ Table-top is RUN by this story (humans run it; Row <ROW>
> tracks it).

**What already ships and this story REUSES — rebuild none of it:**
- The GLOBAL-table shape of `0188_degraded-bridge-sms.sql` (⛔ `pariwar_id`; ENABLE + FORCE RLS; writes through the BYPASSRLS
  `deps.servicePool`; table-prefixed `<table>_no_update_delete` / `<table>_no_truncate` triggers; the `_stamp` BEFORE INSERT trigger;
  `audit_id`). This story DEPARTS from 0188 on purpose (DL4): 0188 grants `twt_app` SELECT and has a `USING (true)` SELECT policy — here
  ⛔ `twt_app` grant and ⛔ policy; 0188's append-only function raises `P0001` — here 0192's `integrity_constraint_violation`. Its
  regression spec `packages/domain/tests/integration/rls/degraded-bridge-sms-switch-policy-regression.spec.ts` (its local
  `tablePrivileges(client, table, grantee)` helper and its "writer on the service LOGIN's privileges" test) is the model
  (`packages/domain/src/policies/degraded-bridge-sms-switch-rls.ts` is the pgPolicy DECLARATION, ⛔ a spec).
- The advisory-lock serialisation of `packages/domain/src/degraded-mode/declarations.ts` (`SELECT pg_advisory_xact_lock(hashtext(...))`)
  — DL4's append lock (⛔ `FOR UPDATE` — TR18).
- The GLOBAL idempotency precedent `apps/api/src/modules/feature-flags/handlers.ts` `withIdempotency(request, key, run)` on
  `idempotency.createKeyedStore(deps.pool)` (claim → replay / in-flight 409 → run) — with DL5's ⚠ change to WHERE `recordResult` and
  `release` run.
- The GLOBAL-write handler shape of `setBridgeSwitch` (`apps/api/src/modules/degraded-mode/handlers.ts`): `getDisplayName` (fail-closed —
  `AdminDisplayNameMissingError`) BEFORE any write, `audit.withCompensatingAudit(deps.servicePool, { auditIntent: { pariwarId:
  ADMIN_GLOBAL_NAMESPACE, … }, mutate })`, the display name SNAPSHOT on the row ([[project_admin_display_name_attribution]]).
- The GLOBAL route guard `[requireAdminSession(deps), requireGlobalPermission(deps, KEY)]` — `requireAdminSession` from
  `apps/api/src/modules/auth/shared/session-guard.ts`, `requireGlobalPermission` from `apps/api/src/modules/rbac/index.ts` — as
  `GET /api/v1/audit/integrity-checks` uses them (`apps/api/src/modules/audit-log/index.ts`, with its `ListChecksQuery` querystring schema
  and `config: { rateLimit: namedRateLimits(deps).read }`).
- The admin trust-wide page precedent `apps/admin/src/modules/audit-integrity/` + `apps/admin/src/routes/IntegrityRoute.tsx`
  (`IntegrityGateView` → a NON-EXPORTED, route-local `AccessDenied` unless the grant; `ProvisioningRoute.tsx` defines its own the same way;
  advisory only — the server is the boundary) and its test shape (`apps/admin/tests/integrity-page.test.tsx`:
  `vi.mock('../src/api/client.js')` with in-memory state — the factory must also export `ApiError`; `tests/_helpers.tsx`).
- `audit_integrity_checks` + `audit_integrity_acknowledgements` (Stories 1.11a / 1.11b) — the ONE persisted detection signal (G14).
- The table-top runbook shape `docs/degradation-policy/table-top-exercise.md` (output is a GAP LIST, ⛔ a pass/fail).
- The runbook template `docs/runbooks/_template.md` (five mandatory sections) and the sign-off ledger
  `docs/runbooks/operational-readiness-ledger.md` (≥2-trustee sign-off on a SHA — ⛔ written by this story).
- The counsel-question shape `_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md`.

## Story

As **the Trustee Panel and the staff who will run the Trust's data protection**,
I want **a rehearsed way to record a personal data breach, see the legal clock, and produce the notices to the Data Protection Board and
to every affected person from what we recorded — and a written process for naming a DPO and watching for Significant Data Fiduciary
status**,
so that **when a breach happens (after DPDP commencement, or after go-live, whichever is first) the Trust meets the law's "without delay"
and 72-hour duties without scrambling, and a member whose data was exposed is told what happened, what it means for them, and whom to ask**.

## The sources this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| PRD FR-99 (`prds/prd-TWT-2026-05-22/prd.md` §4.14) | *"DPO + breach-reporting readiness `[v1-S, activates at MeitY threshold]`"* — *"Process + contact present; tooling for incident-response, breach notification timing per DPDPA, monthly compliance review."* NFRs: PII encrypted at rest, TLS 1.3+, *"PII access by admins audit-logged (FR-47)"*. ⚠ epics.md's copy drops *"breach notification timing per DPDPA"*; the epic's 14.3 ACs drop *"monthly compliance review"* — BOTH are carried here. | PRD |
| PRD OQ-7 | *"DPO appointment + Privacy Policy drafting timing. … Owner: Trustee Panel + Legal counsel. Target: before public launch."* — ⚠ in tension with FR-99's *"activates at MeitY threshold"* ⇒ PQ1. | open |
| PRD glossary / Phase 0 | *"DPO … Required at MeitY's Data Fiduciary threshold; trust to appoint pre-launch or v1-S."* · Phase 0: *"DPO appointment (or activation plan)."* · NFR: *"DPDPA-aware (CERT-In incident reporting in-region)."* | PRD |
| architecture §2.12 | *"Breach reporting: incident-response procedure documented in ops runbook (Category 5); DPDPA notification timelines + DPO contact baked into the runbook."* · *"SDF classification is reviewed at named triggers (member-base milestone, biometric data inclusion, regulatory threshold publication); DPIA artifact lives in the trust's governance documentation, not in the codebase."* · **Breach detection signals**: cross-tenant read anomaly, PII export volume above baseline, RLS-bypass attempts, out-of-hours privileged admin sessions, Class-A dead-letter accumulation — *"Alert routing committed in Category 5."* | architecture |
| architecture §1.5 / Launch Gate Risks | *"chain break triggers a P0 incident"* · risk row *"DPDPA grievance officer designation | Trustee Panel | Legal Counsel + BigDev"* · *"Incident response tabletop | Pre-launch | Semi-annual"*. | architecture |
| `2026-08-14-106` item 8 | *"No `dpo` role is minted. FR-99 activates at the MeitY threshold, DPO appointment is OQ-7 (open), and minting a role bundle for an unconstituted body is the inert-capability defect…"* — mirrored at `packages/domain/src/rbac/permissions.ts` (the `member.data_rights` key's comment). | author-commit — BINDING here (TR1) |
| `2026-06-21-057` · `2026-08-24-156` | Counsel Adv. Mohit Agrawal (`lc-1`, `docs/legal-counsel-engagement/counsel-roster.md`) IS engaged; his recorded acts: edge/WAF (written, `-057`), the four public surfaces (VERBAL, `-156`); the T&C draft `epic-2-tc-draft-v1` SUBMITTED 2026-08-24, ⛔ returned — ⛔ DPO, ⛔ breach, ⛔ SDF. Review-artifact Row 18 `dpo-breach-reporting-envelope-v1` is `pending-submission` — counsel has ⛔ been asked. | recorded |
| Niyamavali Part 10 · Deed cl. 15(b) · draft privacy policy (PRIVATE corpus — `twt-legal`; a git-ignored copy under `docs/legal/` in the main checkout; PARAPHRASED here, ⛔ quoted — this repo is public) | Niyamavali Part 10 (draft, unratified): a DPO / grievance officer is designated when required, with breach-notification procedures per law. Draft privacy policy §11: the Board and affected people are notified as the DPDPA requires, a process the policy assigns to the DPO; ⚠ the policy also names the DPO as the grievance contact in its contact block, its rights section, its grievance section and its closing contact block, and its own checklist carries "appoint / name the DPO" — DPO name / contact are placeholders throughout. ⚠ Deed is an unexecuted agent draft ([[project_legal_corpus_private_repo_split]]). | ⛔ ratified / draft |

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate that gates a member's access to a benefit, and changes ⛔ existing one** — it records incidents and
drafts notices; ⛔ code path reads a breach record to decide anything about a member.

What it MEANS to a member, in their terms (for the record, ⛔ a gate): *"If the Trust's handling of your data goes wrong, the Trust will
tell you without delay what happened, what it may mean for you, what it is doing about it, what you can do, and whom to ask."* —
**checked against the Niyamavali:** Part 10 (breach-notification procedures follow the law — paraphrased; private corpus) — CONSISTENT;
⛔ clause contradicts it.

## ⭐ THE INVARIANTS

- **N1 — The system drafts; people send.** ⛔ Code path transmits a breach notice to a member, the Board or CERT-In. Every "sent" fact is
  an entry RECORDED by staff after they sent it by their own means (`*_recorded` kinds, DL5). ⛔ SMS / WhatsApp / push / email dispatch is
  added ([[project_dlt_only_approved_text_is_delivered]] — an un-registered SMS text would ⛔ even be delivered).
- **N2 — Every breach is notifiable; a signal is ⛔ a breach.** The law has ⛔ materiality threshold (G1). ⛔ Field, enum value, copy or
  runbook line may say a breach is "minor" and so need not be notified. Conversely a detection SIGNAL (G14–G16) only opens an ASSESSMENT —
  the runbook says so in one line. A CONFIRMED leak of personal data IS a breach (the epic's *"any leak is an incident"*); a CI-red scrape
  or any other signal is a prompt to assess, ⛔ yet a breach.
- **N3 — Append-only.** `breach_incidents` and `breach_incident_entries` reject UPDATE / DELETE / TRUNCATE at the DB (triggers), and the
  incident's status, deadlines and "what has been recorded" are DERIVED from the entries by ONE pure function (`deriveBreachIncidentView`,
  DL6). ⛔ Mutable status column.
- **N4 — ⛔ Member PII columns.** Neither table has a column for a member's name, mobile, Aadhaar, address or bank detail; affected people
  are an estimated COUNT + data categories + affected Pariwars. Free-text fields are bounded and carry a UI hint "refer to members by
  member id, never by name or number" (DL4). ⇒ ⛔ RTBF scrub interplay ([[project_append_only_guard_names_erasure_columns]]).
- **N5 — Trust-wide, service-pool only.** ⛔ `pariwar_id` scoping (the Trust is the Data Fiduciary); ⛔ grant to `twt_app` at all (the
  member-facing pool can never read a breach record); every route behind `requireGlobalPermission(deps, 'breach.manage')`.
- **N6 — Rehearsal is unmistakable.** `is_rehearsal` is set at open, immutable, shown as a banner on the incident, and heads every draft
  with `REHEARSAL — DO NOT SEND`. A rehearsal and a real incident never share a row.
- **N7 — ⛔ `dpo` role, ⛔ hard-coded people.** ⛔ Role bundle, ⛔ trust legal name ([[project_legal_name_pending]]), ⛔ person's name
  or contact in code or copy — the contact for affected people is typed per incident (DL5 `assessment.contactForPrincipals`).

## Found facts (traced 2026-11-01 at `beae5116`, re-checked at `3d6b46c5`)

**The law (primary sources read: DPDP Rules 2025 G.S.R. 846(E) MeitY PDF; DPDP Act 2023 Gazette PDF; CERT-In Directions 28-04-2022 PDF;
items marked [S] are secondary).** ⚠ Verify against the e-Gazette at Task 0.1 before any of G1–G5 is written into the decision entry
([[feedback_verify_before_committing_governance_claims]]); if a date has moved, the entry says so.
- **G1 — Breach duty is universal.** Act s.8(6): *"the Data Fiduciary shall give the Board and each affected Data Principal, intimation of
  such breach"* — ⛔ SDF condition. Act s.2(s) "person" includes *"every artificial juristic person"* and *"association of persons or a body
  of individuals"*. ⛔ materiality threshold — Rule 7 applies to *"any personal data breach"*. Penalty (Schedule item 2): up to ₹200 crore.
- **G2 — Rule 7 content.** 7(1) to each affected Data Principal, *"without delay, through her user account or any mode of communication
  registered by her"*: (a) description — nature, extent, timing; (b) likely consequences for her; (c) mitigation implemented / being
  implemented; (d) safety measures she may take; (e) business contact of a person who can respond. 7(2)(a) to the Board *"without
  delay"*: description incl. nature, extent, timing **and location** (⚠ 7(1)(a) has ⛔ "location"; 7(2)(a) does), likely impact. 7(2)(b)
  to the Board *"within seventy-two hours of becoming aware of the breach"* (or a longer period the Board allows on written request):
  (i) updated detailed description; (ii) broad facts on events, circumstances, reasons; (iii) mitigation implemented or proposed;
  (iv) findings regarding the person who caused it; (v) remedial measures to prevent recurrence; (vi) report on the intimations given to
  Data Principals. ⛔ Prescribed form or portal — the Board (established by G.S.R. 844(E)) is a "digital office" (Rule 20); `dpb.gov.in`
  does ⛔ resolve (NXDOMAIN, 2026-11-01). [S] *C.R. Neelakandan v. Union of India*, WP(PIL) 15/2026, Kerala HC, 7 Oct 2026 (LiveLaw,
  10 Oct 2026): the Union said the Board is constituted but not yet functional; the court *"expect[s] that the Board will be made
  functional within … eight weeks"* (≈ 2 Dec 2026) ⇒ a filing route may exist by ~Dec 2026 — the monthly review re-checks (DL11).
  [S] Re-checked 2026-11-20 (web search, secondary only — UN-ATTESTED): ⛔ report found of the Board being functional; a report of
  late Oct 2026 has MeitY still finalising the Board's member appointments (whalesbook.com, cadp.in, barandbench.com).
- **G3 — DPO is SDF-only; a CONTACT is universal.** s.10(2)(a): an SDF's DPO is *"based in India"*, *"an individual responsible to the
  Board of Directors or similar governing body"*, the grievance point of contact. s.8(9) + Rule 9 (every fiduciary): publish *"prominently"*
  the business contact of *"a Data Protection Officer, if applicable, or a person who is able to answer"*, and state it in every rights
  response. s.8(10) grievance mechanism; Rule 14(3) response period ≤ 90 days.
- **G4 — SDF has ⛔ numeric threshold.** s.10(1): the Central Government *"may notify any Data Fiduciary or class"* on factors (volume and
  sensitivity, risk to rights, sovereignty, electoral democracy, security of the State, public order). [S] ⛔ SDF or class notified as of
  Oct 2026. SDF duties (s.10(2), Rule 13): DPO, independent data auditor, DPIA + audit every 12 months, algorithmic due diligence,
  localisation of specified data. ⇒ the epic's *"monitoring of data-principal count threshold"* monitors a number with ⛔ threshold (DL9).
- **G5 — Commencement.** Rules notified 13 Nov 2025 (e-Gazette 267650). Rule 1(4): Rules 3, 5–16, 22, 23 — **including Rule 7 (breach)**
  — commence 18 months later ⇒ **13 May 2027** (COMPUTED from the notification date — ⛔ an officially stated date; 14 Nov is only the
  PIB press date). Act commencement, G.S.R. 843(E) (e-Gazette 267647, primary): ss.3–5, 7–10, 11–17, 28–34, 36, 37, 44(2) at 18 months
  (with Rule 7); s.6(9) and s.27(1)(d) at one year — **13 Nov 2026, now PASSED** (with Rule 4, Consent Managers), so that tranche is in
  force as scheduled; ss.18–26 (the Board) on publication. [S] A Jan 2026 MeitY PROPOSAL to cut 18 → 12 months (⇒ 13 Nov 2026) — ⛔
  amending notification found (dpdprules.org timeline, checked 28 Oct 2026; RE-CHECKED 2026-11-20 by web search, secondary sources only
  — bitscore.in, protectcomply.com, dpdpa.dcomply.in, corpusjurislegal.com — "none found", ⛔ "none exists"; UN-ATTESTED against the
  e-Gazette) ⇒ Rule 7 still commences **13 May 2027** as far as found. ⚠ Had the cut been notified, Rule 7 would ALREADY bind — the
  Task 0.1 e-Gazette check is the one that settles it. [S] DPDP (Removal of
  Difficulties) Order 2026 (S.O. 5458(E), 5 Oct 2026, under s.43): amends the WORDING of s.9(1) and s.10(2)(c)(ii) ("periodic data audit")
  — ⛔ a commencement change. ⚠ Corrigendum G.S.R. 892(E) (10 Dec 2025) exists — its text ⛔ read; read it at Task 0.1. ⚠ TWT is ⛔ in production ([[project_not_in_production_merge_is_not_golive]]) — the duty
  binds once real personal data is processed after commencement.
- **G6 — CERT-In.** Directions 28-04-2022: incidents in Annexure I reported *"within 6 hours of noticing"*; ICT logs kept 180 days in
  India. Addressees: *"service providers, intermediaries, data centres, body corporate and Government organisations"*. Whether a public
  charitable trust is covered is GENUINELY UNCERTAIN ([S] FAQ Q25 vs Q26; IT Act s.70B(6) "any other person") ⇒ CQ2. [S] Commentary treats
  CERT-In and DPDP duties as CUMULATIVE.
- **G7 — Rule 6 safeguards** include *"appropriate logs, monitoring and review, for enabling detection of unauthorised access"* and log
  retention for one year — context for G14–G16, ⛔ built here.

**The repo.**
- **G8 — ⛔ breach / DPO runbook.** `docs/runbooks/` has 12 runbooks (plus README, `_template.md`, the ledger); ⛔ breach, ⛔ DPO. `docs/runbooks/README.md` "Related runbooks expected
  from other stories" has ⛔ breach row. `docs/knowledge-transfer/on-call-playbook.md` §2.13 *"[v1-pending] DPDPA breach response —
  `[deferred to Story 14.3]` … slot-reserved-pre-write … Interim escalation: any suspected breach → Solo Builder + Trustee Panel chair +
  Story 0.13 legal counsel (when engaged)"* — ⚠ "(when engaged)" is STALE (counsel is engaged — `2026-06-21-057`).
- **G9 — ⛔ launch-gate row.** `docs/launch-gate-inventory/inventory-roster.md`: Row 8 `dpdpa-grievance-officer-designation` (open — the s.8(9)
  contact is this row's person); Row 10 / Row 11 cover "DPDPA Data Fiduciary registration"; ⛔ row covers breach readiness, DPO, or SDF watch.
  Rows are append-only, supersession-only; decision-authored rows carry `architecture_source_line: N/A — **decision-authored**` under an
  "Appended … by Story X (Task 0.4) under [Decision …]" preamble — **Row 45 is the exact precedent** (author-commit `-421`,
  decision-authored, with the preamble); Row 16 was the first author-commit append but is `N/A — PRD/epics-authored` with ⛔ preamble.
- **G10 — Counsel ⛔ asked.** `docs/legal-counsel-engagement/review-scope-charter.md` §1(b) lists *"DPO appointment per PRD §11 OQ-7"* and
  *"Breach-reporting tooling per architecture §2.12 + Story 14.3"*; `review-artifact-roster.md` Row 18 `dpo-breach-reporting-envelope-v1` is
  `pending-submission`. ⛔ Counsel question pack on breach / DPO / SDF exists.
- **G11 — Escrow Domain 7.** `docs/escrow/credential-inventory.md` "Domain 7 — DPDPA breach-reporting tooling": `dpo-breach-reporting-portal`,
  `incident-response-tooling-credentials`, `dpo-contact-path` — all `pending-system-availability`. ⛔ portal exists (G2) ⇒ they stay so.
- **G12 — ⛔ code.** ⛔ `breach*` / `incident*` / `dpo` / `data_principal` code (the "breach" hits are helpdesk/appeal SLA bands). ⛔
  `apps/admin/modules/` — admin modules live in **`apps/admin/src/modules/`** (the epic's path drops `src/`).
- **G13 — `dpo` posture.** `2026-08-14-106` item 8 + `permissions.ts` (the `member.data_rights` comment: *"⛔ No `dpo` role is minted … The
  DPO is the intended future holder of this key"*).
- **G14 — Story 1.10 / 1.11a tamper detection is the ONLY persisted signal.** `verifyAuditChain` (`apps/jobs/src/audit/integrity-check.ts`)
  inserts an `audit_integrity_checks` row; on `chain_valid = false` it calls `alerter.alertChainBroken`, whose default only
  `console.error`s (`apps/jobs/src/audit/integrity-observability.ts`; `INTEGRITY_OBSERVABILITY_MODE=live` THROWS — the live adapter is
  Category 5). The admin red `StatusBanner` persists until an `audit_integrity_acknowledgements` row. The cron
  (`.github/workflows/nightly-integrity.yml`) runs against a CI database — ⛔ production; the 6-hourly mirror is ⛔ scheduled
  (`apps/jobs/src/boot.ts` header: *"cron graduations stay DEFERRED"*).
- **G15 — Story 4.8 has ⛔ persisted signal.** `FallbackRateMonitor` (`packages/validity-service/src/cache-observability.ts`) is per-process,
  in-memory; `apps/api/src/modules/member-validity/handlers.ts` logs pino `op` values `validity_cache.fallback`, `validity_cache.poisoned`,
  `validity_cache.fallback_rate_alert` (error), `validity_cache.write_error`. ⛔ Metrics sink (Category 5). By design stale values are
  ⛔ served — a 4.8 signal is rarely a personal-data breach.
- **G16 — Story 1.16b is CI-red only.** CI job `pii-scrape` (`packages/contracts/scripts/check-pii-scrape.ts` — coverage / indexing /
  attestation / matrix, ⛔ tier leaks) + the render leg `apps/public/tests/integration/public-pages/scrape-test.spec.ts`. ⛔ Runtime leak
  monitor (`detectNakedPii` is called at runtime only to block a Niyamavali publish). The Fastify logger has ⛔ `redact`.
- **G17 — Architecture's five signals are ⛔ built** (§2.12; alert routing Category 5). ⛔ Sentry / paging / ops-alert table exists.
- **G18 — Admin app.** Vite + React 19 + TanStack Router (code-based, `apps/admin/src/router.tsx`) + TanStack Query + react-hook-form + zod.
  One client `apps/admin/src/api/client.ts`, one hooks file `apps/admin/src/api/hooks.ts`. Nav in `apps/admin/src/routes/RootLayout.tsx`
  (national links gated by grant booleans). Admin copy is English-only per-module `i18n-en.ts` maps (⛔ `@twt/i18n`).
- **G19 — RBAC.** `packages/domain/src/rbac/permissions.ts`: `PERMISSION_CATALOG_VERSION = 56` at the pin — **63 on main at
  `a7c99c6a` (94 keys)**; adding a key = append to
  `SEED_PERMISSION_KEYS` + bump with a dated comment block + update the pins in `packages/domain/tests/rbac/permissions.test.ts`
  (`toBe(<current>)` → `<CAT>` = current + 1; `toHaveLength(<current keys>)` → current + 1 — `toBe(63)` / `toHaveLength(94)` on
  2026-11-20; ⛔ hard-code either; `defaultRoleBundles` `toHaveLength(13)` in `roles.test.ts` UNCHANGED); ⛔ migration (catalog is pure data);
  ⛔ other registration (`nationalGrants` derives from bundles in `admin-session.handler.ts`; `requireGlobalPermission` reads `role_grants`
  with ⛔ list of global keys); `super_admin` derives every key; the 5.8b / 6.33 precedent for a Super-Admin-only global key is
  "derived, ⛔ `roles.ts` const". Contracts transport mirror `packages/contracts/src/rbac/permissions.ts`.
- **G20 — Migrations.** `packages/domain/migrations/NNNN_kebab.sql`, hand-authored, `meta/_journal.json`; never regenerate an applied one
  (42P07 — [[project_live_db_test_gotchas]]). At the pin main's highest was `0193_marketplace-modules`; **at `a7c99c6a` `0194`–`0207`
  have all LANDED** (highest `0207_field-worker-ending-undo-appeal-link`); open siblings: `story/6-22b-…`, `story/6-39-…` (re-derive).
- **G21 — ⛔ cross-Pariwar member count exists** (only per-Pariwar counts: `reports/templates/contribution-rate-by-district.ts`, news/survey
  fan-out `memberCount`). Member states: the `members.ts` tuple (`pending-kyc` … `anonymized`); `members.state` is a projector-written cache.
- **G22 — Route-table gates.** `apps/api/tests/integration/login-wall.spec.ts` and `forced-pagination.spec.ts` walk the live route table —
  every collection route needs a bounded `limit`. `contracts:check-openapi-determinism` needs `pnpm contracts:emit-openapi` re-run.
  `friction-budget` does ⛔ count `apps/admin`. `docs/launch-gate-inventory/` edits re-include CI (`dlt-typed-variables` reads it).

## Build decisions — PROPOSED (BigDev answers at Task 0.2; ⭐ = recommended)

- **DL1 — Correct the premise, FOUND (⛔ a ruling).** The decision entry (Task 0.4) records G1–G5 as found law: breach-reporting readiness
  is due by **go-live or DPDP commencement (13 May 2027, re-checked), whichever is first**, for the Trust as it is today; only the DPO is
  SDF-gated. Dated annotations (⛔ rewrites — [[feedback_supersede_never_reinterpret]]) in the PRECEDENT shapes — PRD:
  `> ⚠ **ANNOTATION <date> (Story 14.3 Task 0)** — … ⭐ Annotated, ⛔ not rewritten.` (the 2026-09-21 Story 6-20 annotation); epics:
  `- ⚠ **ANNOTATED <date> ([`<DEC>`](…)) — ⛔ not rewritten.**` (the 2026-10-14 `-330` annotation) — text: *"breach reporting is ⛔
  SDF-gated; only the DPO is — see `<DEC>`"*, beside EVERY site that carries the premise: **PRD** — the FR-99 entry (§4.14) and the §4.14
  "DPDPA & PMLA" paragraph (*"… activate at the MeitY threshold"*); **epics.md** — the FR inventory's FR-99 line, the Epic 14 intro
  (*"… lands at MeitY SDF threshold"*), the Epic 14 User Outcome (*"DPO appointment ratified pre-MeitY threshold"*), and Story 14.3's
  title + Given (*"MeitY SDF Threshold Activation"*). Re-grep `MeitY` in both files at Task 0.5 — annotate any further site found.
  ⚠ **DECLARED — the DPO appointment is DOCUMENTED, ⛔ performed.** The epic's 14.3 AC *"DPO appointment ceremony completes within the
  regulator-notified window; trustee panel ratifies + records"* and the Demoable *"DPO ratified in `.decision-log.md`"* become Row `<ROW>`
  (c) after PQ1: the DPO runbook carries the ceremony and its trigger (on an SDF notification, the ceremony runs within any window the
  notification sets — the Rules set ⛔ fixed window; re-check at Task 0.1). ⛔ Panel routing (it is statute — [[feedback_provider_policy_is_found_not_counsel]]); the
  residue (does it bind a trust; CERT-In) is CQ1 / CQ2. ⚠ The entry LABELS its two legs: "by DPDP commencement" is FOUND law; "by
  go-live, if earlier" is the AUTHOR's readiness target (⛔ law — before commencement ⛔ duty binds).
  ⚠ **The same wrong premise sits in `-106` item 8** (*"FR-99 activates at the MeitY threshold"*) and its mirror comment in
  `permissions.ts` (the `member.data_rights` block). The entry says: `-106` item 8's CONCLUSION (⛔ `dpo` role) STANDS on its other ground
  (OQ-7 open; an unconstituted body — the inert-capability defect); its premise clause is corrected for breach reporting. DL3 adds a
  dated correction line beside that `permissions.ts` comment (⛔ rewrite of the old text).
  The epic's *"breach-reporting tooling moves from `rehearsed` to `active` operational status"* is MAPPED (declared): that transition IS
  Row `<ROW>`'s closure — ⛔ a status field in code.
- **DL2 — Paths.** `apps/admin/src/modules/breach-reporting/` + `apps/admin/src/routes/BreachReportingRoute.tsx`; admin paths
  `/data-protection/breaches` (list + open) and `/data-protection/breaches/$incidentId` (detail). API under `/api/v1/data-protection/…`.
  Nav link in `RootLayout.tsx`, national section, shown only with the grant.
- **DL3 — ONE new GLOBAL key `breach.manage`** (read AND write; catalog current → <CAT> — 63 → 64 on 2026-11-20, re-derive; key count +1, dated comment block citing `<DEC>`).
  Super-Admin only, DERIVED (⛔ `roles.ts` const — the 5.8b / 6.33 precedent). ⛔ `dpo` role, ⛔ `auditor` grant (TR1). The future DPO is
  the intended holder — say so in the key's comment beside `member.data_rights`'s, plus DL1's dated correction line there. The
  "⛔ other role holds it" pin goes in `packages/domain/tests/rbac/roles.test.ts` (5.8b's block / 6.33's `holders(...)` shape).
  `packages/contracts/src/rbac/permissions.ts` holds ⛔ key list or version — ⛔ change there. Admin grant helper: `hasBreachManage(grants)`
  in `apps/admin/src/api/hooks.ts` (beside `hasAuditVerify`).
- **DL4 — Migration `<MIG>_breach-incidents.sql`** (number re-checked at Task 0.1; journal `when` above every sibling's), two GLOBAL tables:
  - `breach_incidents` — `incident_id uuid PK default gen_random_uuid()`, `is_rehearsal boolean NOT NULL`, `title text NOT NULL` (1–200),
    `became_aware_at timestamptz NOT NULL` (the 72-hour clock — G2), `opened_at timestamptz NOT NULL default now()`, CHECK
    `became_aware_at <= opened_at`, `detection_source text NOT NULL` CHECK in DL8's list, `detection_signal_ref text NULL` (≤ 200; e.g. an
    `audit_integrity_checks.check_id`), `opened_by uuid NOT NULL` (admin user id — ⛔ FK to `users`, as 0188 has none: test cleanup
    deletes `users` rows, and an append-only row could never let it), `opened_by_display text NOT NULL` (snapshot),
    `audit_id uuid NOT NULL` (the compensating-audit intent line's id, as 0188's history row stores it). The handler generates
    `incident_id` with `randomUUID()` BEFORE the audit intent (the `declare` handler's precedent — DL10's locator embeds it).
  - `breach_incident_entries` — `entry_id uuid PK` (generated before the audit intent, as above), `entry_seq bigint GENERATED ALWAYS AS
    IDENTITY`, `incident_id uuid NOT NULL REFERENCES breach_incidents`, `kind text NOT NULL` CHECK in DL5's list, `payload jsonb NOT NULL`,
    `recorded_at timestamptz NOT NULL` stamped by a BEFORE INSERT trigger with `clock_timestamp()` (0188's `_stamp` shape — ⛔ `default
    now()`, which is the transaction START and can sort a lock-waiter before an earlier commit — footgun #62c), `recorded_by uuid NOT NULL`,
    `recorded_by_display text NOT NULL`, `audit_id uuid NOT NULL`; index `(incident_id, entry_seq)`. **Order everywhere by `entry_seq`.**
  - Both: ENABLE + FORCE RLS with **ZERO policies**, ⛔ `twt_app` grant (N5); `GRANT SELECT, INSERT ON <both> TO twt_service` — ⛔ UPDATE /
    DELETE, ⛔ policy `TO twt_service` (the 0007 / 0009 posture). WHY those grants and nothing more: `twt_service` itself is a NOLOGIN
    NOBYPASSRLS group (`0002`); production's service login is a SEPARATE BYPASSRLS login that is a MEMBER of `twt_service` (0009's header;
    `deps.ts` `SERVICE_DATABASE_URL`). Role ATTRIBUTES are ⛔ inherited through membership, GRANTs are; BYPASSRLS skips policies, ⛔
    GRANTs — so the login needs exactly these grants, and a FORCE-RLS zero-policy table is readable by it (and by the superuser test DB,
    which HIDES a missing grant — TR16). Append-only trigger function `breach_reject_mutation()` raising `integrity_constraint_violation`
    (0192's; ⛔ 0188's `P0001`) + table-prefixed `breach_incidents_no_update_delete` / `breach_incidents_no_truncate` (and the same for
    `breach_incident_entries`) — row-level BEFORE UPDATE OR DELETE, statement-level BEFORE TRUNCATE.
    ⚠ **FIRST OF ITS KIND, declared:** ⛔ table in the repo has RLS on with no `twt_app` grant and no policy. ⛔ Gate or test enumerates
    tables by RLS / policy / `pariwar_id` (checked: `policies/README.md`, `cross-pariwar-leak.spec.ts`, schema-diff, pii-scrape,
    access-wrapper; `policies/README.md` requires a regression spec per POLICY — ⛔ rule for a policy-less table) ⇒ ⛔
    `policies/breach-incidents-rls.ts`. The regression spec `packages/domain/tests/integration/rls/breach-incidents-policy-regression.spec.ts`
    pins: (i) `twt_app`'s privilege set EMPTY and `twt_service`'s = {SELECT, INSERT} on both (copy the local `tablePrivileges(client,
    table, grantee)` helper from `degraded-bridge-sms-switch-policy-regression.spec.ts`); (ii) ⭐ an EXECUTED service-login leg (that spec's
    "writer on the service LOGIN's privileges" test): `CREATE ROLE <tmp> NOLOGIN BYPASSRLS IN ROLE twt_service`, `SET LOCAL ROLE <tmp>`, then
    CALL `openBreachIncident` and `appendBreachEntryInTx` (⛔ a hand copy — [[feedback_stub_must_call_not_transcribe]]) and see both
    succeed, and UPDATE / DELETE / TRUNCATE refused; (iii) bare `SET LOCAL ROLE twt_service` (NOBYPASSRLS) sees ⛔ rows (FORCE RLS, zero
    policies); (iv) the triggers; (v) the CHECKs.
  - The kind / source lists are TUPLES in the pg-free schema file `packages/domain/src/schema/breach_incidents.ts` (where
    `ALERT_SMS_SEND_*` live — `schema/alert_sms_sends.ts`), re-exported from `breach/`; the regression spec compares each tuple to
    `pg_get_constraintdef` of its CHECK (the `alert-sms-sends-policy-regression.spec.ts` pattern); contracts mirrors the tuples and a
    contracts test pins them equal to the domain export ([[project_contracts_domain_bundle_boundary]] — contracts ⛔ imports a pg-touching
    domain module at runtime; the test may — `audit.test.ts` already does).
  - Drizzle schema `packages/domain/src/schema/breach_incidents.ts` (+ export from `schema/index.ts`); `pnpm db:check` (`drizzle-kit check`)
    clean. `when` above main's highest journal `when` (`0207`'s at `a7c99c6a`) and above every OPEN sibling's (`story/6-22b-…`,
    `story/6-39-…` — re-derive at the commit). *(v1.3: the v1.2 "if 14.3 lands before `story/11b-5a-…`" note is OBSOLETE — `0194`
    landed; whichever of 14.3 / 6.22b / 6.39 lands later re-checks its own `when` at its rebase.)*
  - **Domain module `packages/domain/src/breach/`** (`index.ts`, `incidents.ts`; barrel `export * as breach from './breach/index.js'`) —
    the handlers call it, ⛔ inline SQL in handlers:
    - `openBreachIncident(pool, input)`.
    - `appendBreachEntry(pool, input)` = `connect` + `BEGIN` + `appendBreachEntryInTx(client, input)` + `COMMIT` (the bridge-switch pair).
      `appendBreachEntryInTx`: `SELECT … FROM breach_incidents WHERE incident_id = $1` (absent ⇒ `breach.incident_not_found`), then
      `SELECT pg_advisory_xact_lock(hashtext('breach_incident:' || $1))` (the `degraded-mode/declarations.ts` precedent), THEN reads the
      entries, derives (DL6), checks closed / extension, inserts. ⛔ `SELECT … FOR UPDATE` — Postgres requires UPDATE privilege on some
      column to take ANY row lock (`0142`'s header records it; 0188's own `FOR UPDATE` works only because 0188 grants a column UPDATE),
      and `twt_service` has ⛔ UPDATE here: every production append would fail 42501 while every superuser test passes (TR16, TR18).
      Under the lock, "after `closed` ⇒ 409" and "`grantedUntil` > current due" cannot race, and `entry_seq` order = commit order.
    - `listBreachIncidents(pool, limit)` and the signals read — raw SQL `LIMIT $n` with `clampLimit` from `packages/domain/src/pagination.ts`
      called EXPLICITLY (the `domain-accessor-invariants` gate only scans Drizzle `.limit(` — it will ⛔ catch a raw `LIMIT`).
    - `readBreachIncident(pool, id)`; `countMembersOnRecord(pool)` (DL9).
    A concurrency spec: a `closed` and a `mitigation` append raced on two own-committing clients (both CALLING `appendBreachEntry` — ⛔ a
    hand copy of the lock, [[feedback_stub_must_call_not_transcribe]]) ⇒ ⛔ entry ever has a higher `entry_seq` than the incident's
    `closed` entry; the loser gets `breach.incident_closed`.
- **DL5 — Entry kinds (closed list; one strict Zod payload each in `packages/contracts/src/breach/`; the DB CHECK lists the same strings —
  pinned by DL4's lockstep mechanism).** Text fields bounded (≤ 2000 unless noted). Request body `{ kind, payload }` is a Zod discriminated
  union on `kind`. A DB CHECK violation (23514 — e.g. app clock ahead of the DB on `became_aware_at`) maps to **400**, ⛔ a 500: ⛔ global
  23514 mapper exists (`apps/api/src/middleware/error-mapping/index.ts` maps only typed errors) — copy `isCheckViolation` from
  `memorial-takedown/handlers.ts` (it checks `.code` AND `.cause.code`) and catch it in the handler AFTER `withCompensatingAudit` has
  written its `_rolled_back` line and rethrown.
  - ⭐ **Idempotency — REQUIRED on BOTH writes** (open AND append): an append-only row can never be removed, so a retried open must ⛔
    create a second incident and a retried `principals_notice_recorded` must ⛔ land twice. Substrate: `idempotency_keys` (GLOBAL; the
    caller namespaces) via `idempotency.createKeyedStore(deps.pool)` (`packages/domain/src/idempotency/keyed-store.ts`); ⛔ shared HTTP
    helper exists — each handler hand-rolls it; the GLOBAL precedent is `feature-flags/handlers.ts` `withIdempotency`.
    - Header `Idempotency-Key` (`request.headers['idempotency-key']`): missing, blank, or sent as an array ⇒ **400
      `breach.idempotency_key_required`**.
    - Namespaces: `breach-open:${actorId}:${key}` and `breach-entry:${incidentId}:${key}`.
    - ORDER (⚠ DIFFERS from the feature-flags precedent on two points): claim → replay (stored body, same status) / in flight ⇒ **409
      `breach.idempotency_in_progress`** → pre-checks (below) → `withCompensatingAudit({ mutate: the domain write, which COMMITs })` →
      `recordResult` **OUTSIDE `mutate`** (`error-mapping/index.ts`: *"`recordResult` runs AFTER `run()` has succeeded and AFTER
      `withCompensatingAudit` returned"* → 503 `idempotency.record_failed`). Inside `mutate` a failed `recordResult` would write a
      `_rolled_back` line for an entry that DID commit. ⛔ `release` once the domain write has committed (the precedent's `catch` releases
      on ANY error, so a failed `recordResult` would let a retry duplicate a permanent row) — `release` only when the throw came BEFORE the
      commit ([[project_idempotent_write_handler_shape]]).
    - Admin: `newIdempotencyKey()` (`apps/admin/src/api/hooks.ts`), held in a `useRef` across the retries of ONE decision and renewed after
      a success (the `useSetDriveTarget` comment).
  - ⭐ **Pre-checks BEFORE the audit intent.** `withCompensatingAudit` (`packages/domain/src/audit/compensating.ts`) writes the intent line
    first and, on any throw from `mutate`, a `${action}_rolled_back` line — so a refusal raised only inside the lock leaves two audit lines.
    As `setBridgeSwitch` does (`alreadyInThisState()` before the audit, `concurrentChange()` in the lock as the backstop): pre-read the
    incident + its derived view and refuse 404 / 409 closed / 400 extension with ⛔ audit line; the in-lock check is the RACE backstop
    only (intent + `_rolled_back` accepted there). A test asserts ZERO `data_protection.breach.entry_appended*` lines for a pre-checked
    refusal.
  - `assessment` — `nature`, `extent`, `location` (G2 7(2)(a)), `dataCategories: string[]` (closed list: `identity`, `contact`, `kyc`,
    `financial`, `nominee`, `health_or_death`, `credentials`, `other`), `estimatedAffected: { count: int ≥ 0 } | { unknown: true }`,
    `affectedPariwarIds: uuid[]` (empty = unknown / trust-wide), `likelyConsequences`, `safetyMeasuresForPrincipals` (7(1)(d)),
    `contactForPrincipals` (7(1)(e), ≤ 300 — typed per incident, N7). A later `assessment` SUPERSEDES the earlier for drafting (the latest
    wins; all stay on the timeline).
  - `timeline_event` — `occurredAt` (≤ now), `description`.
  - `mitigation` — `measures`, `status: 'implemented' | 'proposed'`.
  - `cause_findings` — `broadFacts` (7(2)(b)(ii)), `findingsOnPersonResponsible` (7(2)(b)(iv)).
  - `remedial` — `measures` (7(2)(b)(v)).
  - `principals_notice_recorded` — `sentAt` (≤ now), `channel` (≤ 200, free text — N1), `reachedCount: int | null`, `note`.
  - `board_initial_recorded` — `sentAt`, `reference` (≤ 200).
  - `board_report_recorded` — `sentAt`, `reference`.
  - `board_extension_recorded` — `grantedUntil` (> the current deadline), `reference`.
  - `cert_in_report_recorded` — `sentAt`, `reference` (kept although CQ2 is open — recording a report that was made is harmless).
  - `owner_review` — `note` (the breach owner's review; named "owner", ⛔ "DPO" — PQ1).
  - `signoff_recorded` — `signers: string[]` (≥ 2 DISTINCT trimmed names, each ≤ 120), `signedOn` (date ≤ today), `note`. ⚠ A RECORD,
    made by the operator, that trustees signed on paper or by their own means — ⛔ the trustees' own sessions (name it so in the UI).
  - `closed` — `summary`. After `closed` every append is refused **409 `breach.incident_closed`**.
  - `note` — `text`.
- **DL6 — ONE derivation.** `deriveBreachIncidentView(incident, entries, now)` (pure, in `packages/contracts/src/breach/derive.ts` so the API
  and admin share it — ⛔ a second copy in the admin module): `status: 'open' | 'closed'`; `latestAssessment`; `boardReportDueAt =
  latest board_extension.grantedUntil ?? became_aware_at + 72h`; booleans `principalsNoticeRecorded`, `boardInitialRecorded`,
  `boardReportRecorded`, `boardReportOverdue (open && !boardReportRecorded && now > due)`, `signoffRecorded`. ⛔ Stored. Entries are
  consumed in `entry_seq` order. Times shown in IST with `formatIst` (`apps/admin/src/modules/correction-chase/ist.ts` — already imported by
  `degraded-mode/BridgeSwitchPanel.tsx`; ⛔ inline `toLocaleString`; ⚠ since the pin two MORE IST formatters exist —
  `field-workers/derive.ts` `formatIstDateTime` and a duplicate `formatIst` in `marketplace/derive.ts` — import `correction-chase/ist.ts`'s
  and ⛔ add a fourth). Form inputs (`becameAwareAt`, `occurredAt`, `sentAt`, `grantedUntil`)
  are `datetime-local` read as IST wall-clock and converted to an ISO instant with the `+05:30` offset before submit. The helper works in
  BOTH directions — `istLocalInputToIso(value)` and `isoToIstLocalInput(iso)` (the second pre-fills `becameAwareAt` from a signal's
  `verified_at`) — placed beside `formatIst` / `istToday` in `correction-chase/ist.ts`, unit-tested in a non-IST `TZ`. ⛔ IST helper exists
  today (building it is ⛔ reinvention); ⚠ ⛔ copy the existing `datetime-local` helpers (`banners/BannersPage.tsx` `toIsoOrNull` /
  `toLocalInput`, `degraded-mode/DeclareForm.tsx`) — they use the browser's zone. The overdue badge reads "Board report overdue" — ⛔
  "urgent" in any case (TR15).
- **DL7 — The three drafts.** `buildBreachDrafts(view)` (pure, `packages/contracts/src/breach/drafts.ts`) → `{ principalsNotice,
  boardInitial, boardReport }`, each `{ text: string; complete: boolean; missing: string[] }`. Every paragraph is labelled with its sub-rule
  (e.g. `7(1)(b) Likely consequences for you:`); a missing input renders `[MISSING — <field>]` and sets `complete: false`; the Trust is
  `[TRUST LEGAL NAME]` (⛔ hard-coded — N7); a rehearsal heads every draft `REHEARSAL — DO NOT SEND` (N6). `boardReport` 7(2)(b)(vi) lists
  the recorded `principals_notice_recorded` entries. English only — the Hindi member notice is translated by a person at incident time
  (runbook step; ⛔ unreviewed Hindi ships; deferred item). Admin: a read-only text box + "Copy" per draft; ⛔ send button (N1).
- **DL8 — Detection sources, and the ONE live link.** `detection_source` closed list: `audit_chain_break` (1.10/1.11a), `pii_scrape_failure`
  (1.16b), `validity_cache_alert` (4.8), `cross_tenant_read_anomaly`, `pii_export_volume`, `rls_bypass_attempt`,
  `out_of_hours_privileged_session`, `class_a_dead_letter` (architecture §2.12), `external_report` (a member, staff, partner or regulator
  told us), `other`. ⭐ The breach page shows "Signals to assess": every `audit_integrity_checks` row with `chain_valid = false` and ⛔
  acknowledgement, read through a NEW `GET /api/v1/data-protection/signals?limit=` behind `breach.manage` (⛔ the existing
  `/api/v1/audit/integrity-checks`, which needs `audit.verify`; bounded `limit`, default 20, max 50; newest `verified_at` first; response
  `{ items: [...] }`) with "Open an incident from this" — prefilling `detection_source =
  'audit_chain_break'`, `detection_signal_ref = check_id`, `became_aware_at = verified_at`. Acknowledgement stays with the integrity page,
  so an assessed break would keep offering the action: each signal item carries `incidentIds` (the incidents whose `detection_signal_ref =
  check_id`); with ≥ 1 the page shows "Incident opened" + a link to it IN PLACE of the open action (a live-DB test pins it). ⛔ Other
  signal is wired: 4.8 and 1.16b and the
  five have ⛔ persisted signal to read (G15–G17); the runbook's triage table says WHERE each surfaces today (CI red; a pino `op`; ⛔ built)
  and a `deferred-work.md` item homes the live feeds to Category 5. ⚠ This is a DECLARED NARROWING of the epic's "integrates with" — ⛔
  silent; AC10 says so. ⛔ New alert sink, paging, or acknowledgement write from the breach page (the integrity page owns acknowledgement).
- **DL9 — Members on record (the monthly review's input, ⛔ a threshold).** ⭐ (a) `GET /api/v1/data-protection/members-on-record` →
  `{ asOf, pariwarCount, total, byState }` (contracts' `MemberLifecycleStateWire` from `packages/contracts/src/kyc/signup.ts` — nine
  states, equal to the domain tuple incl. `anonymized`; contracts ⛔ imports `@twt/domain`). `byState` is a `.strict()` `z.object` with
  ALL nine state keys REQUIRED (0 for an empty state) — ⛔ `z.record(MemberLifecycleStateWire, …)`, which Zod 3 makes Partial.
  `pariwarCount` = `COUNT(DISTINCT pariwar_id)` over the rows `total` counts. Trust-wide via `deps.servicePool`, the shipped convention for
  global reads — `runAsCrossTenant` has ⛔ production caller; `total` EXCLUDES `anonymized`, which stays visible in `byState`.
  ⚠ `twt_service` holds ⛔ grant on `members` today; the test DB's superuser hides it. This is ⛔ new: login already reads `members` on
  `deps.servicePool` (`member-auth.repo.ts` `resolveMembersByMobile`) with the same gap. The migration adds ⛔ grant; Completion Notes name
  it as part of Row 26's shared-service-login grant gap. Labelled **"Members on record"** — ⛔ "data principals": the runbook lists the
  people-holding tables the count excludes (nominees, known people, claim contacts, workplace requests, **`field_workers`** (name +
  mobile, Tier-1, decrypted on the admin screens — asked of 14.3 by Story 13.1 C7, roster Row 48's notes and `deferred-work.md` 13.1a C6),
  **the memorial family list** (`memorial_submissions.kinship_ciphertext`, `0194`)). ⛔ Threshold, ⛔ alert (G4). Shown in a "Monthly review" panel on the
  breach list page. *(b)* ⛔ endpoint — a documented SQL in the runbook run by hand monthly. ⭐ (a): it makes the monthly review real and
  gives "extent" a number.
- **DL10 — Audit.** Writes under `withCompensatingAudit` (ADMIN_GLOBAL_NAMESPACE): `data_protection.breach.opened`,
  `data_protection.breach.entry_appended` (resource locator `global/data-protection/breaches/<id>[/entries/<entryId>];kind=<kind>`; payload
  hash over the canonical body). ⭐ The DETAIL read is audited `data_protection.breach.viewed` (FR-47 — narratives may hold personal data)
  through `audit.withCompensatingAudit(deps.servicePool, { auditIntent, mutate })` whose `mutate` builds the read result — the intent line
  IS the disclosure record (the Story 13.1f precedent, `field-worker/handlers.ts` `field_worker.previous_endings_shown`: *"⛔ a direct
  `writeAuditEntry`"*, ADR-0030). *(v1.3 — SUPERSEDES v1.2's direct `audit.writeAuditEntry`, which relied on `data-protection` being
  ABSENT from the gate's roots: since the pin Stories 12.2 and 13.1 each ADDED their surface to the compensating-audit invariant
  (`MARKETPLACE_ROOTS`, `FIELD_WORKER_ROOTS` in `scripts/access-wrapper-invariants/check.ts`).)* ⭐ This story does the same: a
  `DATA_PROTECTION_ROOTS = ['apps/api/src/modules/data-protection', 'packages/domain/src/breach']` const (its OWN const — ⛔ an edit of
  another story's; DIRECTORIES only — a file root throws ENOTDIR), added to the compensating-audit `runInvariant` list and its ✓ line,
  plus a README line. The scanner flags EVERY `audit.writeAuditEntry` call in a scanned root, so once the root is in a direct write
  turns the gate RED — revert-sanity it (add one, see red, remove). The domain module ⛔ calls the wrapper at all; `requestPayloadHash` must be SHA-256 hex (`write.ts` enforces the regex) — ⛔ named helper exists; the idiom is
  `createHash('sha256').update(canonicalJsonStringify({ incidentId }), 'utf8').digest('hex')`; ⛔ `.viewed` line on a 404 (decide the
404 by a pre-read BEFORE the wrapper — inside `mutate` a throw would write `.viewed` + `.viewed_rolled_back`). The list,
  signals and members-on-record reads are ⛔ audited (titles, dates, flags, counts only — ⛔ narrative in the list DTO). ⛔ Audit-action
  registry exists — the names are free strings in the dotted `resource.action` form. All three GETs and the detail GET carry `config: {
  rateLimit: namedRateLimits(deps).read }` (the integrity-checks route's).
- **DL11 — The runbooks (`docs/runbooks/`, `_template.md`'s five sections, header "⚠ NOT AUTHORITATIVE until signed in
  `operational-readiness-ledger.md`").**
  - `personal-data-breach-response.md` — G2's two clocks; who does what (owner = `[PENDING PQ1]`, interim = on-call §2.13's escalation);
    the triage table (DL8; N2's one line); the Rule-7 notice steps using the drafts; the channels that EXIST today to reach affected members
    (the app's per-Pariwar News / noticeboard banner, the Pariwar's WhatsApp / announcement channels where live, phone via the helpline) —
    ⛔ a channel that is not built, and SMS only with a DLT-registered text (deferred item); "translate the member notice before sending";
    the CERT-In leg marked `[COUNSEL — CQ2]` with the 6-hour clock stated as the conservative reading; Board filing route `[no portal yet —
    re-check; the Kerala HC expects the Board functional by ≈ 2 Dec 2026 (G2)]`.
    ⭐ (v1.3) The triage table gains a row **"a notice or text reached the wrong person (e.g. a mistyped mobile)"** ⇒ assess as a possible
    breach; whether it is notifiable is counsel's, already asked at roster Row 49 (d) /
    `counsel-question-2026-11-03-field-worker-data-basis.md` — cite it, ⛔ judge it (N2: ⛔ "small harm" finding).
    ⭐ (v1.3) A section **"Where personal data is held and who receives it"** — the incident inventory `deferred-work.md` homes on 14.3
    (13.1a C6, 13.1b C3 — trigger "14.3 dev"): the people-holding tables (DL9's list incl. `field_workers` and the memorial family list);
    the decrypt sites (the admin field-worker screens; the jobs SMS sweep); the processors that RECEIVE personal data (MSG91 — a worker's
    mobile and code, `field_worker_code_sms_sends` holds ⛔ name / mobile / code; the staff-email path, e.g. `field_worker_notice_emails`
    `0206`). Built by grep at the commit (⛔ from this list alone); a line per item, ⛔ completeness claimed ("found by <method>, <date>").
    The two deferred items each get a dated "discharged by Story 14.3 (<DEC>)" line (⛔ rewritten).
  - `dpo-appointment-and-sdf-watch.md` — named-candidate criteria (G3: an individual, India-based, responsible to the Board of Trustees, the
    grievance contact; independence / conflicts `[COUNSEL — CQ5]`); the appointment ceremony (Panel decision entry naming the person +
    contact; `dpo-contact-path` envelope sealed per `docs/escrow/`; privacy policy / T&C placeholders filled in the private corpus; Rule 9
    publication; Row 8 / Row <ROW> updated) and its TRIGGER (on an SDF notification, within any window the notification sets — DL1's
    declared mapping); the SDF watch (architecture's named triggers + the Gazette check + the members-on-record count); the DPIA OWNER (the
    DPIA is SDF-only in law — Rule 13 — but architecture §2.12 asks for its owner to be identified before launch; the runbook names the
    role, `[PENDING PQ1]` for the person); the **FR-99 monthly compliance review** checklist (open incidents and overdue clocks; SDF /
    commencement Gazette check; whether the Board is functional and has a filing route; members on record; Row 8 / Row <ROW> status;
    counsel returns; a dated line in this runbook's log table — ⛔ the decision log, unless something changed).
  - `breach-tabletop-exercise.md` — the degradation table-top's shape: a synthetic incident run on a REHEARSAL record end to end (signal →
    open → assessment → drafts → owner review → recorded sign-off → close), ≥ 2 trustees, output a GAP LIST, logged as a decision entry WHEN
    RUN (architecture: pre-launch, then semi-annual). ⛔ Run by this story.
  - Also: `docs/runbooks/README.md` related-runbooks list gains the three; on-call playbook §2.13 points at the breach runbook and drops
    the stale "(when engaged)" ([[project_dpdpa_counsel_engaged_but_unrecorded]] — write "counsel has not been asked about breach
    reporting", ⛔ "counsel is not engaged"); the playbook's §3 escalation bullet (*"Pre-Story-0.13-closure, the escalation routes to the
    Trustee Panel chair + pre-existing legal counsel contact"*) is stale the same way — it routes to counsel `lc-1` and points at the breach
    runbook; `docs/escrow/credential-inventory.md` Domain 7 gains ONE dated line (status unchanged — G11).
- **DL12 — Launch-gate Row <ROW> `dpdpa-breach-and-dpo-readiness`**, appended by the author-commit `<DEC>` (Row 45's shape — author-commit
  `-421`, `architecture_source_line: N/A — **decision-authored**`, the "Appended … by Story 14.3 (Task 0.5) under [Decision `<DEC>`]"
  preamble; Row 16 was the first author-commit append; ⭐ v1.3: the CURRENT shape is main's Rows 49–52 — the `> **Appended …` preamble
  re-stating "the next free row … grepped <date>" and WHY 46 is skipped (6.39 holds it — NUMBERS), and a "Merge ≠ go-live" note
  ([[project_not_in_production_merge_is_not_golive]]); ⛔ take Row 46): owner Trustee
  Panel; support BigDev + counsel `lc-1`; closure criteria — (a) the three runbooks signed by ≥ 2 trustees in the ledger; (b) the table-top
  RUN and logged with its gap list closed or homed; (c) PQ1 ruled and the breach owner named with a published contact (with Row 8) — and,
  if the ruling or an SDF notification calls for one, the DPO appointed and ratified in `.decision-log.md` (DL1's declared mapping); (d)
  counsel's return on CQ1–CQ5 recorded; (e) commencement / SDF Gazette check dated within 30 days of go-live, and the DPIA owner named
  (architecture §2.12); (f) a DLT-registered breach
  SMS text OR a recorded decision not to use SMS; target: before go-live or 13 May 2027, whichever is first; `current_status: open`. Row 8
  gets ONE dated cross-reference line.
- **DL13 — Counsel question** `_bmad-output/planning-artifacts/counsel-question-2026-11-01-14-3-breach-and-dpo.md` (the 2026-10-18 file's
  shape; WRITTEN, ⛔ sent — BigDev sends): CQ1 does s.8(6) / Rule 7 bind the Trust as constituted (and is there ANY registration duty for
  a Data Fiduciary — roster Rows 10 / 11 assume one; the Act registers Consent Managers); CQ2 do the CERT-In 2022 Directions apply
  to it; CQ3 does a notice through the app (News / banner) plus WhatsApp / a phone call satisfy "each affected Data Principal … through her
  user account or any mode of communication registered by her"; CQ4 the Trust's SDF exposure (Aadhaar-derived KYC, death certificates,
  financial history) and whether a voluntary DPO is advisable; CQ5 who may be the DPO / breach owner (a trustee? independence). ⭐ (v1.3)
  The file CROSS-REFERENCES — ⛔ repeats — the question already owed in `counsel-question-2026-11-03-field-worker-data-basis.md` / Row 49
  (d) (is a text to a mistyped number a notifiable breach?): one line, "asked there; the answer applies to the breach runbook's
  wrong-recipient triage row". `review-artifact-roster.md`
  Row 18 gets a dated "question drafted (not submitted)" line — ⛔ `submitted` until BigDev sends.
- **DL14 — Records.** The creation transitions (row `14-3-…` backlog → ready-for-dev; `epic-14` backlog → in-progress — 12.1's
  precedent) were made by `0280dfc9` (ledger `2026-11-01c`; see NUMBERS on its collision); the v1.2 validation is ledger `2026-11-01e`.
  Dev-story's transitions (ready-for-dev → in-progress at Task 0.7, → review at Task 7) each take the NEXT FREE ledger letter at that
  commit, re-derived on every ref AND every worktree's dirty `sprint-status.yaml`. `deferred-work.md` items: Task 0.6.

## Panel question (NON-BLOCKING — ⛔ gates the build or the merge; gates Row <ROW> (c))

- **PQ1 — Until the Trust is notified as a Significant Data Fiduciary, who owns a personal data breach, and when is a DPO appointed?**
  THE ONE FACT: the law requires a DPO only of an SDF, but requires EVERY fiduciary to report a breach and to publish a person who can
  answer (G1, G3); our draft privacy policy assigns breach notification to a DPO and names the DPO as the grievance contact throughout
  (paraphrased — private corpus), while PRD OQ-7 targets a DPO *"before public launch"* — and ⛔ person holds Row 8 (the published contact)
  today: Row 8 is `open` with ⛔ Trustee Panel designation event.
  Under EVERY option a contact must be published (Rule 9) by commencement.
  - **A** — appoint a DPO before go-live, voluntarily. Cost: a named, India-based individual responsible to the Board of Trustees, with
    time and independence, from launch; ⛔ candidate is identified today; the privacy policy stays as drafted.
  - **B** ⭐ — designate now ONE named person as BOTH the published contact (Row 8 — ⛔ yet designated) and the breach owner; appoint a
    DPO only when notified as an SDF (or earlier on counsel's advice — CQ4). Cost: TWO Panel acts — the Panel must name that person now,
    and make them breach owner; every "DPO" reference in the draft privacy policy (contact block, rights, grievance, breach section) must
    change before members agree to it; an SDF notification would start the 12-month DPIA / audit clock with ⛔ DPO in post.
  - **C** — the Panel chair owns breaches until an SDF notification. Cost: a trustee carries an operational 72-hour duty; the published
    contact (Row 8) and the breach owner become two people; whether a trustee may hold it at all is CQ5 (open).
  Written from the template (§0 gate passed — WHO the Trust names and what it owes a member), Task 0.3. ⚠ In the NOTE, the options say
  what changes for a person in plain words; section numbers (`s.8(9)`), CQ ids and row numbers move to the EVIDENCE section.

## Acceptance Criteria

1. **AC1 — Governance first (Task 0).** Before any code: the decision entry `<DEC>` (AUTHOR-COMMIT; G1–G5 as found law with the Gazette
   check's date and the sources actually read — or "Gazette re-check UN-ATTESTED" if it could ⛔ be fetched; DL1–DL14 as answered; Row
   <ROW> minted; ⛔ supersedes a ratified entry) committed ALONE; the PQ1 note and the CQ file written (⛔ sent); EVERY premise site DL1
   lists annotated in the precedent shape (dated lines, ⛔ rewrites); DL1's declared DPO-appointment mapping in the entry; the `-106` item
   8 premise corrected in the entry (DL1); Row <ROW> + Row 8 line + Row 18 line + escrow Domain 7 line present; `deferred-work.md` carries
   Task 0.6's four items; ⛔ private-corpus text pasted into any tracked file.
2. **AC2 — Runbooks (DL11).** The three runbooks exist with the template's five sections and the NOT-AUTHORITATIVE header; the breach runbook
   states both Rule-7 clocks, N2's lines (incl. the confirmed-leak line), the DL8 triage table with each signal's present surface (incl.
   the wrong-recipient row citing Row 49 (d)), the "Where personal data is held and who receives it" section (DL11 — `field_workers`,
   the memorial family list, MSG91, the staff-email path; 13.1a C6 + 13.1b C3 each carry a dated discharge line), and ⛔
   channel that is not built; the DPO runbook carries the ceremony + its SDF trigger, the DPIA-owner line and the FR-99 monthly review
   checklist; ⛔ sign-off row, ⛔ "table-top run" line is written anywhere. README + playbook §2.13 AND §3's escalation bullet updated.
3. **AC3 — Permission (DL3).** `breach.manage` in `SEED_PERMISSION_KEYS`; `PERMISSION_CATALOG_VERSION = <CAT>` with a dated block; the pins in
   `permissions.test.ts` updated (`toBe(<current>)` → `<CAT>`, `toHaveLength(<current keys>)` → current + 1 — 63 / 94 on main at
   2026-11-20, re-read after the rebase; the 13-bundle pin unchanged); `super_admin` derives it; `roles.test.ts` pins that ⛔ other role holds it; the dated DL1 correction
   line sits beside the `member.data_rights` comment; ⛔ `dpo` role anywhere.
4. **AC4 — Migration (DL4, N3, N5).** `<MIG>_…` applies on a fresh DB and on top of main's highest migration at the rebase (`0207` at
   2026-11-20; journal `when` above main's and every open sibling's at the commit); live-DB tests: UPDATE / DELETE / TRUNCATE on either table raise; `twt_app`'s
   privilege set on both tables is EMPTY and `twt_service`'s is exactly {SELECT, INSERT}; ⭐ the EXECUTED service-login leg (DL4 (ii)):
   `openBreachIncident` and `appendBreachEntryInTx` succeed under a BYPASSRLS role IN ROLE `twt_service`, and bare `twt_service` sees ⛔
   rows; `became_aware_at > opened_at` and an unknown `kind` / `detection_source` are refused by CHECK; each CHECK's
   list equals its domain tuple (`pg_get_constraintdef`); `recorded_at` is trigger-stamped; `pnpm db:check` clean.
5. **AC5 — Open an incident.** `POST /api/v1/data-protection/breaches` (`breach.manage`, `Idempotency-Key` REQUIRED — DL5): body
   `{ isRehearsal, title, becameAwareAt, detectionSource, detectionSignalRef? }`; responds **200 with the detail DTO** (AC7's shape);
   `becameAwareAt` in the future ⇒ 400; a missing key ⇒ 400 `breach.idempotency_key_required`; the same key twice ⇒ ONE incident, the
   same response; a nameless admin ⇒ **409 `admin.display_name_missing`** (`AdminDisplayNameMissingError`) before any write (the
   bridge-switch shape); one row + one `data_protection.breach.opened` audit line; without the grant ⇒ 403 (`authz.denied` through
   `deps.auditSink`, as today); ⛔ admin session ⇒ 401 `auth.session_required`.
6. **AC6 — Append an entry.** `POST /api/v1/data-protection/breaches/:incidentId/entries` with `{ kind, payload }` — each DL5 kind accepted
   with a valid payload and refused 400 with an invalid one (one test per kind); `signoff_recorded` with < 2 distinct names ⇒ 400;
   `board_extension_recorded.grantedUntil` ≤ the current due time ⇒ 400; any append after `closed` ⇒ 409 `breach.incident_closed`; unknown
   incident ⇒ 404; a DB CHECK violation ⇒ 400 (⛔ 500); one `data_protection.breach.entry_appended` audit line per accepted append and
   ZERO `entry_appended*` lines for a pre-checked refusal (404 / 409 / extension 400 — DL5); a missing key ⇒ 400; the same
   `Idempotency-Key` twice ⇒ ONE entry, the same response; a claimed-but-unfinished key ⇒ 409 `breach.idempotency_in_progress`; the DL4
   concurrency spec passes; a bodyless request is sent `'{}'` in
   tests ([[project_fastify_empty_json_body_400]]).
7. **AC7 — Read.** `GET /api/v1/data-protection/breaches?limit=` (bounded, default 20, max 100; newest `opened_at` first; response
   `{ items: [...] }` — ⛔ a named array such as `{ incidents }`, which `forced-pagination.spec.ts` cannot see, making it vacuous; item =
   id, title, isRehearsal, openedAt, becameAwareAt, detectionSource + DL6's status / due / overdue / recorded flags — ⛔ narrative) passes
   `forced-pagination.spec.ts` and `login-wall.spec.ts`. ⚠ `forced-pagination.spec.ts` walks the LIVE `app.swagger()` and examines only a
   route that declares `responses['200']` (top-level array or `{ items: array }`) and needs a query `limit` with a numeric `maximum` — a
   route WITHOUT a 200 schema is never examined and the gate passes vacuously. So every new route declares `schema: { querystring:
   z.object({ limit: z.coerce.number().int().min(1).max(N).default(20) }).strict(), response: { 200: … } }` (collection routes; the
   `ListChecksQuery` shape in `audit-log/index.ts`) or at least `response: { 200: … }` (detail / members-on-record — named arrays such as
   the detail's `entries` are ⛔ flagged; ⛔ allow-list entry needed). `GET …/:incidentId` returns the incident, every entry in
   `entry_seq` order, and `deriveBreachIncidentView`'s output, and writes ONE `data_protection.breach.viewed` audit line through
   `withCompensatingAudit` (⛔ line on 404; ⛔ `_rolled_back` twin on a successful read — DL10).
8. **AC8 — Derivation (DL6).** Unit tests of `deriveBreachIncidentView`: due = aware + 72h; an extension moves it; overdue only when open,
   unreported and past due; `closed` ⇒ status closed and ⛔ overdue; the latest `assessment` wins. The API and the admin page import the
   SAME function (a grep-able single definition).
9. **AC9 — Drafts (DL7, N1, N6).** Unit tests of `buildBreachDrafts`: every Rule-7 sub-item (7(1)(a)–(e), 7(2)(a), 7(2)(b)(i)–(vi)) appears
   labelled in its draft; an empty assessment yields `complete: false` with each missing field named; a rehearsal heads all three with
   `REHEARSAL — DO NOT SEND`; ⛔ draft contains a hard-coded trust name. The admin page shows each draft read-only with "Copy" and ⛔ send
   control.
10. **AC10 — The one live link (DL8).** `GET /api/v1/data-protection/signals` (bounded, `{ items }`, `breach.manage`) lists failed,
    unacknowledged integrity checks and "Open an incident from this" pre-fills source / ref / awareness (via `isoToIstLocalInput`); a
    live-DB test seeds its OWN `chain_valid = false` check and its own acknowledged failed check (the insert-helper shape of
    `apps/api/tests/integration/audit-integrity-ui.spec.ts`; 0010's CHECKs need coherent start / end / broken values) and asserts by
    MEMBERSHIP (own unacknowledged present, own acknowledged absent — both tables are append-only and accumulate; ⛔ "sees only"); after an
    incident is opened with `detectionSignalRef = check_id`, that item's `incidentIds` contains it and the page shows "Incident opened" + a
    link in place of the action. The story's Completion Notes state the narrowing: 4.8, 1.16b and
    architecture's five are runbook triage + a deferred item, ⛔ wired.
11. **AC11 — Members on record (DL9), by the arm BigDev picks.** (a): the endpoint returns `total` (⛔ `anonymized`), `pariwarCount`
    (distinct Pariwars over the counted rows) and per-state counts trust-wide across ≥ 2 seeded Pariwars (asserted as a DELTA over a
    before-read — other tests' members accumulate), `anonymized` visible in `byState`, every one of the nine state keys present; the panel is labelled "Members on record"; ⛔ threshold or
    alert. (b): ⛔ endpoint, ⛔ panel; the SDF-watch runbook carries the count SQL with the same `total` rule. Strike the other arm at Task
    0.2.
12. **AC12 — Admin page (DL2).** `/data-protection/breaches` behind `hasBreachManage` (a module-local `BreachGateView` + its own
    `AccessDenied` — the `IntegrityRoute` / `ProvisioningRoute` shape; `IntegrityGateView` is hard-wired to `hasAuditVerify` and its
    `AccessDenied` is ⛔ exported; ⛔ reuse them); query keys `['breaches', 'list']`, `['breaches', 'detail', id]`, `['breaches',
    'signals']`, `['breaches', 'members-on-record']`; after an open ⇒ navigate to `/data-protection/breaches/$incidentId` and invalidate
    list + signals; after an append ⇒ invalidate detail + list; a 409 `breach.incident_closed` ⇒ refetch the detail and show the closed
    state (forms hidden); a 409 `admin.display_name_missing` ⇒ a "set your display name first" message in the module's `i18n-en.ts` (the
    shipped handling in `feature-flags/FeatureFlagsPage.tsx` / `approval-warning-reasons/` is the model);
    list with overdue and rehearsal badges; open form (react-hook-form + the contracts schema); detail page with the timeline, one form per
    kind, the clock panel (IST), the drafts, and the rehearsal banner; the free-text hint (N4); copy in `breach-reporting/i18n-en.ts`.
    vitest + jsdom tests mocking `../src/api/client.js` cover the gate, open, append, the closed state, the rehearsal banner and the drafts.
13. **AC13 — Gates.** Every new path registered by hand in `packages/contracts/scripts/emit-openapi.ts` (`registerPath` — the bridge
    switch's entries are the model; re-running the emitter WITHOUT them changes nothing; paths written `{incidentId}`; every new schema
    ALSO registered as a component — `X.openapi('X')` in a components map, as `degradedModeComponents` does; the `Idempotency-Key`
    header documented in the description text, as the drive-target entries do), then `pnpm contracts:emit-openapi` re-run and
    `openapi/v1.yaml` committed (`contracts:check-openapi-determinism` byte-compares it); the microcopy gate green — run `scripts/microcopy`
    FIRST and add one `{ file, pattern: '\breport', reason: "statutory DPDP Rule 7(2)(b) term — 'report to the Board' — staff surface" }`
    entry for EACH file it actually flags; ⭐ (v1.3) the `access-wrapper-invariants` gate scans `DATA_PROTECTION_ROOTS` (DL10) and is
    revert-sanity checked (a direct `audit.writeAuditEntry` turns it red); (the microcopy rule is `\breport\b`, word-bounded, case-insensitive — "reporting", "Reports",
    `boardReport`, `board_report_recorded`, `breach-reporting/` do ⛔ match; `file:` is matched by `endsWith`, ⛔ globs; `api/client.ts`
    already carries Story 10.7's entry; ⛔ reword the statute's language), and ⛔ tone-rule hit (TR15); `pnpm ci:local` (`bash
    scripts/ci-local.sh`) green on a fresh container
    ([[project_known_livedb_test_failures]] — own container, DB named `twt_dev`); every push prefixed `DATABASE_URL=<story port>`
    ([[project_prepush_hook_inherits_5432]]).

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [x] 0.1 `git fetch origin`; ⭐ **REBASE** the story commits onto `origin/main` (304 commits ahead at v1.3 — an ancestor check alone
        passes trivially and proves nothing); resolve the `sprint-status.yaml` conflict by relabelling this branch's `2026-11-01c` /
        `-e` / `2026-11-20f` lines to the next free letters, keeping every entry and the `---` separator (NUMBERS;
        [[project_rebase_ledger_conflict_separator]]; verify the YAML parses); then re-verify every `apps/` / `packages/` / `scripts/`
        citation at the new base by FUNCTION (the v1.3 STALE BASE note lists what was checked at `a7c99c6a`); re-derive the NUMBERS block on every ref AND every worktree's
        dirty tree (decision, roster row, migration, catalog version, ledger letter); re-check G5 against the e-Gazette (commencement; the
        corrigendum G.S.R. 892(E); any SDF notification; any Board portal; any window an SDF notification would set for a DPO) and write
        the check's date into the entry. ⚠ Record each source ACTUALLY read (URL + date). If the e-Gazette cannot be fetched, the entry
        says "Gazette re-check UN-ATTESTED — secondary sources only", ⛔ "checked". A negative ("⛔ SDF notified") is written "none found
        by <method>, <date>" — a search can ⛔ prove an absence. `ListAgents` + `git branch --show-current` before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [x] 0.2 ⛔ **STOP — HUMAN.** Put DL1–DL14 to BigDev (DL9 (a)/(b)); proceed ONLY on BigDev's verbatim answers, recorded verbatim in this
        file. ⛔ Infer, default or "take as recommended" an answer BigDev did not give.
  - [x] 0.3 Write the PQ1 note from the template (by path, ⛔ copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-14-3-who-owns-a-breach.md`, in the template's order: the
        ⏳ AWAITING block; The question (one sentence + why it needs the Panel, ⛔ clause ids); The one fact; the options table (what changes
        for a person / honest cost) + Our reading; What is at stake (live / blocked: nothing / if nothing is decided); How much to trust
        this note; In plain English; EVIDENCE E1–E4 LAST (E4's commands RUN before sending). PQ1's `s.8(9)` / `CQ4` / Row 8 references move
        to the evidence. ⛔ Private-corpus text — paraphrase with section numbers. Run the template's checks. Status WRITTEN, ⛔ sent
        (BigDev sends). Written now, committed AFTER 0.4's entry (the entry is the first commit).
  - [x] 0.4 Decision entry (AUTHOR-COMMIT, next free — `-433` at authoring, TAKEN by 12.2; `-467` at v1.3, 2026-11-20 —
        re-derive on every ref and worktree), committed ALONE, FIRST; try the write — if refused, ask once ([[project_decision_log_writes_user_inserted]]).
  - [x] 0.5 The CQ file (DL13) + Row 18 dated line; Row <ROW> appended (Row 45's shape) + Row 8 line (DL12); EVERY premise site's dated
        annotation (DL1's list, precedent shapes; re-grep `MeitY` in `prd.md` and `epics.md`); escrow Domain 7 dated line.
  - [x] 0.6 `deferred-work.md` — a NEW newest-first section `## Deferred from: story 14-3-dpo-breach-reporting-operational-readiness.md —
        the build decisions `<DEC>` (<date>)`, one-line intro, items `- **<title>** [<file / symbol>; <id>] — <what and why>. ⭐ Trigger:
        <…>.`, then `---`. Items: (i) live feeds for 4.8 / 1.16b / architecture's five signals → Category 5 (trigger: the Category-5
        observability story's create-story); (ii) a DLT-registered breach SMS text (trigger: Row <ROW> (f)); (iii) a human-reviewed Hindi member
        notice template (trigger: go-live of member comms in Hindi); (iv) members-on-record omits nominees / known people / claim contacts
        / `field_workers` / the memorial family list (trigger: an SDF notification or CQ4's return). ⭐ (v1.3) Also a dated
        "discharged by Story 14.3 (`<DEC>`) — the breach runbook's 'Where personal data is held' section" line under 13.1a C6 and
        13.1b C3 (⛔ rewritten), and one dated "told — see DL9 / the runbook" line at roster Row 48's notes (13.1 C7).
  - [x] 0.7 Ledger line (next free letter — DL14) + row `ready-for-dev → in-progress` ([[project_sprint_status_safe_prepend]] — verify the
        YAML parses).
- [x] **Task 1 — Runbooks (AC2)** — DL11's three files + README + playbook §2.13 and §3's escalation bullet. Cite sections, ⛔ paste
      private-corpus text (this repo is public — `-167`).
- [x] **Task 2 — Permission (AC3)** — DL3; run `packages/domain/tests/rbac/permissions.test.ts` and `roles.test.ts`.
- [x] **Task 3 — Migration + schema + domain module (AC4, AC6)** — DL4: `<MIG>`, journal entry (`when` above every sibling), Drizzle schema,
      tuples in `schema/breach_incidents.ts`, `packages/domain/src/breach/` (`openBreachIncident` / `appendBreachEntry` +
      `appendBreachEntryInTx` (ADVISORY lock — ⛔ `FOR UPDATE`, TR18) / `listBreachIncidents` / `readBreachIncident` / the signals read
      (with `incidentIds`) / `countMembersOnRecord`; explicit `clampLimit`); the regression spec
      `packages/domain/tests/integration/rls/breach-incidents-policy-regression.spec.ts` incl. the EXECUTED service-login leg (⛔ policy
      file — DL4); the concurrency spec.
- [x] **Task 4 — Contracts (AC5–AC9)** — `packages/contracts/src/breach/` (`schemas.ts`, `derive.ts`, `drafts.ts`, `index.ts`; re-export from
      `src/index.ts`); tuples mirrored + pinned to the domain export; unit tests for derive + drafts
      ([[project_contracts_tests_outside_tsc]] — run them, typecheck does ⛔ see them).
- [x] **Task 5 — API (AC5–AC7, AC10, AC11)** — `apps/api/src/modules/data-protection/{index,routes,handlers}.ts` registered in `server.ts`;
      global guards (⛔ `scopeResolutionHook` / `requirePermissionHook` — TR3); route schemas with `querystring` / `response[200]` (AC7)
      and the read rate limit; handlers in the bridge-switch shape (ids by `randomUUID()` before the audit intent; pre-checks before the
      intent; 23514 ⇒ 400 via a copied `isCheckViolation`; the REQUIRED idempotency key on open AND append in DL5's order); live-DB specs under
      `apps/api/tests/integration/data-protection/` (assert own rows by membership — append-only rows cannot be cleaned; delete
      `role_grants` after each test, as `audit-integrity-ui.spec.ts` does); `registerPath` entries in
      `packages/contracts/scripts/emit-openapi.ts` (+ component registrations — AC13), then `pnpm contracts:emit-openapi`;
      `DATA_PROTECTION_ROOTS` in `scripts/access-wrapper-invariants/check.ts` + README line, `.viewed` through `withCompensatingAudit`
      (DL10), revert-sanity.
- [x] **Task 6 — Admin (AC12, AC9, AC10, AC11)** — module + route + nav + `BreachGateView` / local `AccessDenied` + `hasBreachManage` +
      client / hooks additions in `api/client.ts` / `api/hooks.ts` (query keys, invalidation, `newIdempotencyKey()` in a `useRef`) + the
      two-way IST helper in `correction-chase/ist.ts`; `microcopy.yaml` entries only for files the gate flags (AC13); tests.
- [ ] **Task 7 — Gate + records (AC13)** — `ci:local` on a fresh container; story Completion Notes (including AC10's narrowing, the
      migration `when` re-check against the open siblings (DL4), the Row 26 `members` grant residual, and every un-attested item: ⛔ table-top run, ⛔ sign-off, ⛔ counsel
      return, ⛔ device / browser pass, the Gazette re-check if it was un-attested); File List; ledger (next free letter); row → review.

## Dev Notes

### Traps

- **TR1 — ⛔ `dpo` role / ⛔ `auditor` grant.** `-106` item 8 binds; the key is Super-Admin-derived only.
- **TR2 — ⛔ materiality.** ⛔ Severity enum, "minor" flag, or runbook line that skips notice (N2). A field for "estimated affected" is
  ⛔ a threshold.
- **TR3 — Global route + per-tenant hook = 500.** `requirePermissionHook` / `scopeResolutionHook` hard-throw with ⛔ `scopeTx`; use
  `requireGlobalPermission` (the audit-log module's comment names this landmine).
- **TR4 — ⛔ claim detection is live.** The integrity alerter only logs; the cron runs on a CI DB; the mirror is ⛔ scheduled (G14). ⛔ Copy,
  runbook or completion note may say "the Trust is alerted to a breach".
- **TR5 — ⛔ send.** ⛔ `fetch` to any external notice endpoint, ⛔ staff-email / SMS / WA call from this module (N1).
- **TR6 — Path.** The epic's `apps/admin/modules/breach-reporting/` does ⛔ exist as a convention — use `apps/admin/src/modules/…` (G12).
- **TR7 — Migration ordering.** (v1.3) `0194` has LANDED; the open siblings are `story/6-22b-…` and `story/6-39-…` — whichever lands
  second must keep a higher `when` and be applied in journal order on a shared dev DB ([[project_sibling_migration_when_order_shared_db]]); ⛔ regenerate an applied migration (42P07).
- **TR8 — Forced pagination.** The list route MUST take a bounded `limit` or `forced-pagination.spec.ts` fails (G22); clamp `.limit()`
  ([[project_domain_limit_clamp_and_savepoint_retry]]).
- **TR9 — JSDoc + markdown.** `**7(2)(b)**` inside a `/** */` block contains `**/` and closes the comment
  ([[project_markdown_emphasis_closes_jsdoc]]) — write sub-rule labels without bold in code comments.
- **TR10 — ⛔ fabricate the un-attested.** ⛔ Sign-off rows in `operational-readiness-ledger.md`, ⛔ "table-top run", ⛔ counsel return,
  ⛔ `submitted` on Row 18 ([[feedback_record_unattested_no_backfill]]); ⛔ a named breach owner / DPO / Row 8 contact anywhere; ⛔ PQ1 or
  the CQ file marked sent or "shown to Panel" ([[feedback_shown_to_panel_means_sent]]); ⛔ a DL answer BigDev did not give; ⛔ "Gazette
  checked" when it could ⛔ be fetched (Task 0.1).
- **TR11 — ⛔ "counsel is not engaged".** Write "counsel has not been asked about breach reporting / DPO / SDF" (G10).
- **TR12 — Free text can still hold PII.** The UI hint (N4) is guidance, ⛔ a control; the detail read is audited (DL10). ⛔ Add a member-id
  lookup that would render a name into the breach page.
- **TR13 — Copy honesty.** The `signoff_recorded` form says "Record that trustees signed" — ⛔ "Sign". The members-on-record panel says
  "Members on record", ⛔ "data principals".
- **TR14 — Admin mutate callbacks.** Per-row actions use per-call `mutateAsync` ([[project_tanstack_mutate_callbacks_latest_only]]); a
  refetch can rejoin a hung fetch ([[project_tanstack_refetch_rejoins_hung_fetch]]).
- **TR15 — Microcopy gate.** `microcopy.yaml` scans `apps/admin/src/**` (comments too) and maps `report → Sahyog Vivran` with ⛔
  `member_only` — "Board report" turns `ci:local` red until the per-file `allow` entries (AC13) exist. The TONE rules also run on admin
  code, comments included, flags `'gi'` (case-insensitive). Avoid: "urgent" (any case); "outside the system / app / platform" (say "by
  staff, by their own means"); "does / did / will / would not count" (say "excludes"); "action required", "needs action"; "act now",
  "last chance", "final notice", "N% complete"; "receipt" (say "reference"); (v1.3) the out-of-band-blame rule's "by mistake" arm
  (Story 13.1c had to allow-list "Registered by mistake") — "disclosed / sent by mistake" will trip it: run `scripts/microcopy` and
  reword, ⛔ allow-list unless the phrase is statutory. `packages/contracts/src` is ⛔ scanned (so `drafts.ts`'s
  notice text is safe there).
- **TR16 — The superuser hides grants.** The test DB connects as a superuser, so a missing `twt_service` GRANT passes every test and
  fails only in production — the regression spec pins the privilege sets AND executes the writes under a BYPASSRLS role IN ROLE
  `twt_service` (DL4 (ii)).
- **TR17 — Numbers are contested.** (v1.3) 6.22, 12.2 and 13.2 have LANDED and took `-433`, `0195`–`0199`, catalog 57+; the open peers
  are 6.22b and 6.39 — and 6.39 holds **Row 46** by name, so 14.3 takes the next free row, ⛔ 46. Main holds ledger `-11-01c` and
  `-11-01e` (13.2) ⇒ this branch's two 11-01 lines relabel at the rebase. Re-derive at each commit (NUMBERS block).
- **TR18 — ⛔ row locks.** `SELECT … FOR UPDATE` / `FOR SHARE` / `FOR NO KEY UPDATE` / `FOR KEY SHARE` on either table needs an UPDATE
  privilege `twt_service` does ⛔ have (and must ⛔ get — N3): production fails 42501, the superuser test DB passes. Serialise appends with
  `pg_advisory_xact_lock(hashtext('breach_incident:' || id))` (DL4).

### What this story does ⛔ do

⛔ Send any notice · ⛔ appoint or name a DPO / breach owner (PQ1) · ⛔ run the table-top · ⛔ sign a runbook · ⛔ build alert sinks,
paging, or the 4.8 / 1.16b / architecture-five feeds · ⛔ a DPIA (architecture: governance documentation, ⛔ codebase) · ⛔ touch Rows
10 / 11's "Data Fiduciary registration" items (⚠ the DPDP Act registers Consent Managers, ⛔ Data Fiduciaries — whether those rows rest
on a real duty is folded into CQ1) · ⛔ change Stories 14.1 / 14.2 · ⛔ edit the private legal corpus (privacy policy §11 changes follow
PQ1, there).

### Project Structure Notes

- NEW: `docs/runbooks/{personal-data-breach-response,dpo-appointment-and-sdf-watch,breach-tabletop-exercise}.md`;
  `packages/domain/migrations/<MIG>_breach-incidents.sql` (+ journal); `packages/domain/src/schema/breach_incidents.ts`;
  `packages/domain/src/breach/*`; `packages/domain/tests/integration/rls/breach-incidents-policy-regression.spec.ts` (⛔ policy file — DL4);
  `packages/contracts/src/breach/*`; `apps/api/src/modules/data-protection/*`; `apps/admin/src/modules/breach-reporting/*`;
  `apps/admin/src/routes/BreachReportingRoute.tsx`; the PQ1 note; the CQ file.
- UPDATE: `packages/domain/src/rbac/permissions.ts` (+ `permissions.test.ts` / `roles.test.ts` pins), `packages/contracts/src/index.ts`,
  `packages/contracts/scripts/emit-openapi.ts`, `microcopy.yaml`, `packages/domain/src/index.ts` (export `breach`),
  `packages/domain/src/schema/index.ts`, `apps/api/src/server.ts`, `apps/admin/src/router.tsx`, `apps/admin/src/routes/RootLayout.tsx`,
  `apps/admin/src/api/{client,hooks}.ts`, `apps/admin/src/modules/correction-chase/ist.ts` (the two-way IST input helper, + its test),
  `openapi/v1.yaml` (emitted), `scripts/access-wrapper-invariants/{check.ts,README.md}` (DL10), `docs/runbooks/README.md`, `docs/knowledge-transfer/on-call-playbook.md` (§2.13 + §3),
  `docs/launch-gate-inventory/inventory-roster.md`, `docs/legal-counsel-engagement/review-artifact-roster.md`, `docs/escrow/credential-inventory.md`,
  `prd.md` (FR-99 + §4.14 DPDPA paragraph) + `epics.md` (FR inventory, Epic 14 intro + User Outcome, Story 14.3 title + Given) — dated
  lines, `.decision-log.md`, `deferred-work.md`, `sprint-status.yaml`.
- Preserve: the integrity page owns acknowledgement (⛔ write `audit_integrity_acknowledgements` from here); `audit-log` routes unchanged.

### References

- epics.md §Epic 14 / Story 14.3 · PRD FR-99, OQ-7, §4.14.1 · architecture §2.12 (breach reporting, DPIA, breach detection signals), §1.5,
  §5.15, Launch Gate Risks · `2026-08-14-106` item 8 · `2026-06-21-057` · `2026-08-24-156` · roster Rows 8, 10, 11, 16, 44 ·
  `docs/legal-counsel-engagement/review-scope-charter.md` §1(b) · `review-artifact-roster.md` Row 18 · `docs/escrow/credential-inventory.md`
  Domain 7 · on-call playbook §2.13.
- Law: DPDP Act 2023 ss.2(s), 8(5), 8(6), 8(9), 8(10), 10; DPDP Rules 2025 (G.S.R. 846(E), 13 Nov 2025) Rules 1, 6, 7, 9, 13, 14, 20;
  CERT-In Directions 28-04-2022 (s.70B(6) IT Act). URLs: meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf ·
  meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf · cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf.

## Dev Agent Record

### Agent Model Used

Claude Fable 5.2 (`claude-fable-5-2`) — `bmad-dev-story 14.3`, started 2026-11-20.

### Debug Log References

**(d1) Task 0.1 — 2026-11-20 (rebase, citations, NUMBERS, Gazette).**

- **Rebase.** `git fetch origin`; `origin/main` = `a7c99c6a` (unchanged since v1.3). Backup branch `backup/14-3-pre-rebase-2026-11-20`
  (= `b2250129`). Rebased the three story commits onto `a7c99c6a`; SHA map `0280dfc9` -> `6a953bd3`, `be1c5b9a` -> `0b1792aa`,
  `b2250129` -> `8508a6be`. Conflicts only in `sprint-status.yaml`'s two ledgers, branch lines on top. Relabelled (label only, bodies
  untouched): `2026-11-01c` -> `2026-11-01ae`, `2026-11-01e` -> `2026-11-01af` (main's 11-01 letters ran to `ad`; main holds `-c` / `-e`
  as Story 13.2 lines); `2026-11-20f` kept (main's 11-20 letters run to `e`; no other ref or worktree holds `f`). The commit SUBJECTS
  still read "ledger 2026-11-01c" / "-01e" — this map is the record. Verified: main's file minus the branch's four lines and two row
  moves is byte-identical to `origin/main`'s; the file has no `---` separator on either side (none to keep); PyYAML parses it
  (`epic-14: in-progress`, the 14-3 row `ready-for-dev`); the story file is byte-identical to the backup's.
- **Citations at `a7c99c6a`, by function (grep, ~125 symbol checks across 68 files).** All hold. Three notes, none changing a task:
  the member-state tuple the story calls "the `members.ts` tuple" is in `packages/domain/src/schema/members.ts` (also
  `member/state.ts`); `resolveMembersByMobile` is in `apps/api/src/modules/auth/member/member-auth.repo.ts`; the roster's phrase is
  "Row 46 is reserved by Stories 6.39 / 14.3" (Rows 48-52's preambles). `istLocalInputToIso` / `isoToIstLocalInput` do not exist yet
  (expected — Task 6 builds them). `docs/runbooks/` holds 12 runbooks + README, `_template.md`, the ledger (as G8).
- **NUMBERS re-derived on every local + remote ref ahead of main and every worktree (all five worktrees clean).** Highest anywhere:
  decision `2026-11-20-466`, migration `0207` (journal `when` 1797910200000), `PERMISSION_CATALOG_VERSION = 63` / 94 keys
  (`toBe(63)` / `toHaveLength(94)`), roster Row 52 (46 unused — reserved). The open peers `story/6-22b-…` (decision -440, `0198`,
  catalog 58) and `story/6-39-…` (-430, `0192`, 56) sit on stale bases and hold nothing above main. => next free TODAY: decision
  `2026-11-20-467`, Row 53, migration `0208`, catalog 64 / 95 keys, ledger `2026-11-20g`. Still re-derived at each commit that takes one.
- **G5 Gazette re-check — PARTLY attested.** READ (primary, e-Gazette, 2026-11-20 ~15:45 UTC, plain HTTPS GET, text extracted with
  macOS PDFKit): (1) `https://egazette.gov.in/WriteReadData/2025/267650.pdf` — G.S.R. 846(E), the Rules (41 pp., SHA-256
  `eabc7d05…f5aa08`; byte-identical to the MeitY copy at `meity.gov.in/static/uploads/2025/11/53450e6e…ad39.pdf`); (2)
  `https://egazette.gov.in/WriteReadData/2025/267647.pdf` — G.S.R. 843(E), the Act's commencement (2 pp., SHA-256 `6df25cd8…0998e5`).
  CONFIRMED as notified: Rule 1(2) Rules 1, 2, 17-21 on publication; 1(3) Rule 4 "one year after the date of publication of this
  Gazette"; 1(4) "Rules 3, 5 to 16, 22 and 23 … eighteen months after the date of publication of this Gazette" (so Rule 7 is in the
  18-month tranche); Rule 7(1)(a)-(e), 7(2)(a) (with "location"), 7(2)(b)(i)-(vi) and "within seventy-two hours of becoming aware of
  the breach, or within such longer period as the Board may allow on a request made in writing" — G2 matches the text. 843(E): (a)
  ss.1(2), 2, 18-26, 35, 38-43, 44(1), 44(3) on publication; (b) ss.6(9), 27(1)(d) at one year; (c) ss.3-5, 6(1)-(8), 6(10), 7-10,
  11-17, 27 (rest), 28-34, 36, 37, 44(2) at eighteen months — G5 matches.
  ⚠ **NEW — the date the clock runs from is not settled by the text.** Both issues are headed "NEW DELHI, THURSDAY, NOVEMBER 13, 2025"
  (the notification is also dated the 13th), but each carries the e-Gazette number `CG-DL-E-14112025-…` — an e-publication stamp of
  14 Nov 2025. Rule 1(4) runs from "the date of publication of this Gazette" => 13 May 2027 on the issue date, 14 May 2027 on the
  e-publication stamp. v1.3's "14 Nov is only the PIB press date" is therefore too strong. This story keeps **13 May 2027** (the
  EARLIER, conservative date) as a readiness target; which date the law takes is put to counsel (folded into CQ1 at Task 0.5).
  **UN-ATTESTED (secondary sources only, 2026-11-20; "none found", never "none exists"):** (i) any notification amending Rule 1(4)
  (18 -> 12 months) — none found by web search (easydp.in, theintect.com, consentos.in, bitscore.in, astraready.com, dpdpa.support,
  legismith.com); the e-Gazette's ministry search (`SearchMenu.aspx`, a stateful form) was NOT run and its recent-uploads lists
  returned nothing parseable; (ii) any SDF or class notified under s.10, and so any window one would set for a DPO — none found
  (konfirmity.com, complydp.com, dpdpa.dcomply.in, certbar.com; one says "no public designation" as of Sept 2026); (iii) the Board —
  secondary trackers report NO Chairperson or Member appointed as of 1 / 14 Nov 2026 (livelaw.in, ppc.land, indiadatalaw.org,
  dapro.in), MeitY advertised the posts May-June 2026; no breach-intimation portal found; `dpb.gov.in` and `www.dpb.gov.in` do not
  resolve (DNS, 2026-11-20); (iv) corrigendum G.S.R. 892(E) (10 Dec 2025) — its text was NOT read (the one page said to reproduce it,
  dpdp.myndsolution.com, returned 503; no e-Gazette id for it found); secondary description only: "minor typographical errors",
  page 24 of the notification; (v) a second corrigendum "G.S.R. 113(E)" is named by one secondary page (simpliance.in, Feb 2026) —
  unconfirmed, not read. `meity.gov.in` HTML pages refused the fetch agent (403); the e-Gazette refused it too (TLS chain) but
  answered a plain request.

**(d2) Task 0.2 — 2026-11-20, BigDev's answers, VERBATIM.** Put as two questions in the session's question dialog (the dialog's
option labels are the answer text; nothing was inferred or defaulted):

- Question: *"Story 14.3, DL9 — how should the monthly review get its "members on record" count?"* — offered: "(a) Endpoint + panel
  (Recommended)" / "(b) Runbook SQL only". **BigDev: "(a) Endpoint + panel (Recommended)"**.
- Question: *"Story 14.3 — do you accept the other thirteen build decisions (DL1–DL8, DL10–DL14) exactly as written in story v1.3?"* —
  offered: "All thirteen as written (Recommended)" / "Some need changes". **BigDev: "All thirteen as written (Recommended)"**.

=> DL1–DL8 and DL10–DL14 stand exactly as written in v1.3; DL9 takes arm (a). AC11's arm (b) is STRUCK by this answer — the AC's own
text sits outside the sections a dev run may edit, so the strike is recorded here and in the decision entry, and the AC text is left
as written. Not asked and not answered: anything beyond DL1–DL14 (the 13 / 14 May 2027 reading in (d1) is a finding for counsel, not
a decision BigDev was asked to make).

**(d3) Tasks 0.3–0.7 — 2026-11-20 (governance records; ⛔ code).**

- **0.4 — Decision `2026-11-20-467`** (author-commit) written to `.decision-log.md` (the write was accepted — no ask needed) and
  committed ALONE as `1bfc9053`, the first commit after the rebase. Beyond Task 0.1's two Gazette files the Act itself was read that
  day (MeitY's copy, 21 pp., SHA-256 `4deb2398…a7d15`): ss.2(l), 2(s), 8(6), 8(9), 10 are quoted in the entry from the file. The
  Act's only registration is the Consent Manager's (ss.2(g), 6(9)) — grepped.
- **0.3 — The PQ1 note** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-20-14-3-who-owns-a-breach.md`, written
  from the template in its order; E4's eight commands RUN at `1bfc9053`, each returning what the note states. WRITTEN, ⛔ sent.
  Rule 13(1)'s twelve-month DPIA / audit clock (option B's cost) was read in the Gazette file.
- **0.5 — Records.** The counsel file `counsel-question-2026-11-01-14-3-breach-and-dpo.md` (DL13's file name kept as decided; it
  says inside that it was prepared 2026-11-20), CQ1–CQ5, with CQ1 (b) ADDED for the 13 / 14 May 2027 reading and the Row 49 (d)
  cross-reference; WRITTEN, ⛔ sent. `review-artifact-roster.md` Row 18: a dated "question drafted (not submitted)" line, status
  unchanged. Roster **Row 53** `dpdpa-breach-and-dpo-readiness` (commit `f611941c`, with the Row 8 cross-reference line). Dated
  annotations: PRD — the FR-99 entry, the §4.14 "DPDPA & PMLA" paragraph, and two FURTHER `MeitY` sites the re-grep found (the
  glossary's DPO line; the §4.14.1 "Data Fiduciary registration" line); `epics.md` — the FR inventory's FR-99 line, the Epic 14
  intro, the User Outcome, Story 14.3's title, its Given / "at threshold activation" block, and its launch-gate block ("monitoring of
  data-principal count threshold"). Every `MeitY` line in both files now has an annotation beside it (re-grepped). Escrow Domain 7:
  one dated line, the three statuses unchanged. ⚠ Corrected while writing: Row 53 (f)'s discharge path first cited Row 26 for DLT
  registration — Row 26 is `jobs-db-role`; the DLT row is Row 30 (fixed before the commit).
- **0.6 — `deferred-work.md`: PARTLY done, the box is left OPEN on purpose.** Written: the new section with the four items, and
  the dated "told" line at roster Row 48 (13.1 C7). ⛔ Written as the task words it: the "discharged by Story 14.3" lines under
  13.1a C6 and 13.1b C3. What discharges them — the runbook's "Where personal data is held and who receives it" section — does not
  exist until Task 1, and a discharge recorded before its evidence is a record ahead of its evidence
  ([[feedback_record_unattested_no_backfill]]). Each item carries a dated "PICKED UP … not yet discharged" line instead; the discharge
  lines are written with Task 1, and 0.6 is ticked then.
- **0.7 — Ledger `2026-11-20g`** (free on every ref and worktree, re-fetched; `origin/main` still `a7c99c6a`); row
  `ready-for-dev -> in-progress`; PyYAML parses the file; line count +2 (nothing truncated).
- **Gates that read these files, run now:** `pnpm dlt-typed-variables:check` (reads `docs/launch-gate-inventory/*.md`) — passed;
  `pnpm pii:check` (reads `.decision-log.md`) — passed. `pnpm install --frozen-lockfile` was run in the worktree first (it had no
  `node_modules`).
- **Private corpus.** Nothing from `twt-legal` is quoted in any file written: the Niyamavali Part 10 and privacy-policy section 11
  references are paraphrases with section numbers; the one count taken from the private copy (seven "DPO" mentions in the English
  draft policy) is a number, not text.

**(d4) Task 1 — 2026-11-20 (the runbooks, AC2).**

- Written, each with the template's five numbered sections, the "NOT AUTHORITATIVE until signed" header and a changelog row:
  `docs/runbooks/personal-data-breach-response.md` (both Rule-7 clocks; the three rules incl. the confirmed-leak line; the triage
  table with each signal's present surface and the wrong-recipient row citing Row 49 (d); the notice steps; only channels that
  exist; CERT-In `[COUNSEL — CQ2]` on the conservative 6-hour reading; an appendix "Where personal data is held and who receives
  it"), `dpo-appointment-and-sdf-watch.md` (criteria; the SDF trigger; the ceremony; the FR-99 monthly review with a log table; the
  DPIA-owner line), `breach-tabletop-exercise.md` (a script on a REHEARSAL record; output a gap list). The breach owner is
  `[PENDING PQ1]` everywhere. ⛔ Ledger row, ⛔ "run" line, ⛔ named person.
- **The inventory was built by grep at `a7c99c6a`, 2026-11-20** (⛔ from the story's list alone): `_ciphertext` columns across
  `packages/domain/src/schema/*.ts` (44 schema files carry one); `decrypt…(` call sites (22 API modules, 7 jobs scheduler files);
  outbound hosts and provider adapters (MSG91, Meta WhatsApp, Telegram, APNs / FCM, Amazon SES for staff email, DigiLocker, Google
  Cloud, Cloudflare). The appendix says "found by grep, no completeness claimed".
- **Read for the runbooks:** Rule 9 (publication of the contact) and Rule 13(1) (the twelve-month DPIA / audit) are quoted from the
  Gazette file. ⚠ The CERT-In Directions could NOT be fetched on 2026-11-20 (`cert-in.org.in` returned an empty reply), so the
  runbook prints no CERT-In reporting address and says the Directions were last read at authoring (2026-11-01).
- **Removed while writing (the session's own inventions, caught on re-read):** a fallback "send it to the Ministry" route if the
  Board has no filing route (now: ask counsel the same hour; the runbook says it does not know); a "within 1 hour" secondary
  escalation and a "within 35 days" check (no source for either number).
- `docs/runbooks/README.md`: three rows in the related-runbooks table. `docs/knowledge-transfer/on-call-playbook.md` (status
  "drafted", unsigned): §2.13 and §3's escalation bullet REWRITTEN in place as DL11 decides — they point at the breach runbook,
  name counsel `lc-1`, and no longer say "(when engaged)" (first written as annotations beside the old text; corrected to DL11's
  "drops").
- **Task 0.6 closed here:** the dated DISCHARGED lines under 13.1a C6 and 13.1b C3 and the follow-up line at roster Row 48 were
  written once the appendix existed. `pnpm dlt-typed-variables:check` passes after the roster edit.

**(d5) Task 2 — 2026-11-20 (the permission, AC3).** RED first: the two pins moved (`toBe(64)`, `toHaveLength(95)`) and a new
`roles.test.ts` block (`breach.manage` held by `super_admin` only; not `auditor`; no `dpo` bundle, the count stays 13; live for a
GLOBAL super_admin grant, refused for a pariwar_admin, an auditor and a super_admin grant narrowed to a Pariwar) — 3 failed. GREEN:
`breach.manage` appended to `SEED_PERMISSION_KEYS`, `PERMISSION_CATALOG_VERSION` 63 -> 64 with a dated block (63 / 94 read live at
`a7c99c6a`), the dated DL1 correction beside the `member.data_rights` comment (the old lines kept). `tests/rbac` + `tests/field-worker`:
15 files, 640 tests pass. ⛔ `roles.ts` change (super_admin derives it); ⛔ contracts change. The one other literal `63` found
(`tests/field-worker/ending-appeal-events.test.ts`, an event fixture's recorded `catalog_version`) is a stored fact, not a pin of the
current version — left alone.

**(d6) Task 3 — 2026-11-20 (migration `0208`, schema, domain module; AC4, AC6's race).**

- **Database:** this story's own container `twt-143-pg`, `postgres:16.16-alpine` (CI's minor), port **5489**, DB `twt_dev`;
  migrated to main's `0207` first. `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5489/twt_dev?sslmode=disable`.
- **Numbers taken:** migration `0208_breach-incidents`, journal idx 208, `when` 1797996600050 — above main's 1797910200000 (`0207`),
  `story/6-22b-…`'s 1796701200043 and `story/6-39-…`'s 1796182800037 (each read from its ref today). The journal stays monotonic.
- **RED → GREEN:** both specs were written and run BEFORE `0208` was applied — 15 of 16 failed (no table); after `pnpm db:migrate`
  16 of 16 pass. `pnpm db:check`: "Everything's fine". Domain `tsc` and `eslint` clean.
- **⚠ A DEPARTURE FROM DL4's WORDING, forced by the package graph.** DL4 has `appendBreachEntryInTx` "derive (DL6)" under the lock,
  and DL6 puts the ONE derivation in `@twt/contracts`. But `@twt/contracts` depends on `@twt/domain` (never the reverse — a domain
  import of contracts is a workspace cycle), so the domain cannot call it. Built instead: `packages/domain/src/breach/rules.ts`, two
  pure pg-free functions answering the only two facts the in-lock backstop needs — `isBreachIncidentClosed(entries)` and
  `breachBoardReportDueAt(becameAwareAt, entries)` (+ the 72-hour constant). `deriveBreachIncidentView` stays the ONE view
  derivation in contracts (Task 4), and a contracts test — which may import the domain — pins both rules equal to it on shared
  fixtures, so they cannot drift silently. The domain derives nothing else. ⚠ This is the session's call, not BigDev's; it changes
  no behaviour DL4 / DL6 describe.
- **Sanity, both run and reverted:** (1) the advisory lock REMOVED ⇒ the race spec goes red ("backend … never waited on a lock");
  (2) the advisory lock REPLACED by `SELECT … FOR UPDATE` ⇒ the service-login leg goes red ("permission denied for table
  breach_incidents") while every superuser leg stays green — TR16 / TR18 demonstrated, not assumed.
- **Found while building:** `twt_service` already holds SELECT on `audit_integrity_checks` / `_acknowledgements` (the signals read
  works on the production login); it holds NO grant on `members` (the members-on-record read is the known Row 26 residual — `0208`
  adds no grant, as DL9 says). An identity column needs no separate sequence grant, and the FK's referential check passes under the
  service login (both executed in the service-login leg).
- The regression spec has no policy file beside it (zero policies — DL4). Detail the story did not spell out, added: a
  `payload` must be a JSON object and the display snapshots non-blank (CHECKs); `entry_id` has no default (the one writer always
  supplies it); `entry_seq` cannot be written (`GENERATED ALWAYS` — pinned, 428C9).

**(d7) Task 4 — 2026-11-20 (contracts; AC5–AC9's shapes, AC8, AC9).**

- RED first (`tests/breach.test.ts` could not import the module), then GREEN: 40 tests; the whole contracts suite 97 files /
  1764 tests; `tsc` and `eslint` clean. `packages/contracts/src/breach/{schemas,derive,drafts,index}.ts`, re-exported from the top
  barrel.
- **Shapes decided where the story left room (the session's calls, each within DL5–DL7):**
  (1) An `assessment` may be PARTIAL — its narrative fields may be blank, its lists empty, its count "unknown". A first assessment
  is recorded "as soon as anything is known" and AC9 asks that an EMPTY assessment yield named missing fields; requiring every
  field would make both impossible. Every other kind's main text is required (1–2000).
  (2) Two payload sets from one factory: REQUEST payloads refuse a future `occurredAt` / `sentAt` and a `signedOn` later than
  today in IST; STORED payloads (inside a response) do not re-judge time.
  (3) `deriveBreachIncidentView` returns DL6's flags PLUS what the drafts are built from (the latest assessment, mitigations,
  findings, remedial measures, recorded notices, timeline events), so `buildBreachDrafts(view)` keeps DL7's one-argument
  signature. The LIST item is a separate strict schema that carries the flags only — a narrative key is refused (pinned).
  (4) `signoff_recorded.signers`: two names that differ only in case or spacing are the same person.
  (5) The response sends display names, never an actor id (0188's posture).
  (6) An IST formatter for the draft TEXT lives in `drafts.ts` — contracts cannot import the admin's `formatIst`, and DL6's
  "no fourth formatter" is about the admin module, which still imports `correction-chase/ist.ts`.
- **Pinned to the domain** (the test imports `@twt/domain`, as other contracts tests do): both tuples, the 72-hour window, the nine
  member states, and — the (d6) promise — the domain's `isBreachIncidentClosed` / `breachBoardReportDueAt` equal the derivation's
  `status` / `boardReportDueAt` on eight shared fixtures.
- **AC8's "one definition":** a test walks `apps/` and `packages/` source (skipping `tests` directories) and finds
  `function deriveBreachIncidentView` in exactly one file.
- Two bugs caught by the tests while going green: an impossible calendar date (`2026-02-30`) THREW inside the refinement instead of
  being refused (now guarded); the single-definition test matched its own pattern.

**(d8) Task 5 — 2026-11-20 (the API; AC5–AC7, AC10, AC11, part of AC13).**

- `apps/api/src/modules/data-protection/{index,routes,handlers}.ts`, registered in `server.ts`: six routes, each behind
  `[requireAdminSession, requireGlobalPermission('breach.manage')]`, each declaring `response[200]`; both collection routes
  `{ items }` with a bounded `limit`; reads on the `read` rate limit, writes on `write`.
- **The live-DB spec** `apps/api/tests/integration/data-protection/breach-register.spec.ts` — 30 tests, on `twt-143-pg`: 401 / 403
  on every route (no role, a Pariwar Admin, a global Auditor — each with an `authz.denied` event and nothing written); open
  (one row, one `…opened` line, the row carries that line's id; the same key twice ⇒ one incident, the same response; a missing
  or blank key ⇒ 400; a nameless admin ⇒ 409 with no row and no audit line, and the key is free to retry); one test PER KIND
  (valid ⇒ 200 + one `…entry_appended` line with the exact locator; invalid ⇒ 400); pre-checked refusals leave ZERO
  `entry_appended*` lines (404 / extension 400 / 409 closed); idempotency on append incl. a claimed-but-unfinished key ⇒ 409;
  the detail's one `…viewed` line per read, none on a 404, never a `_rolled_back` twin; the list's exact key set (⛔ narrative)
  and bounds; overdue; signals by membership + `incidentIds`; members on record.
  ⚠ Written AFTER the handlers (the one task where the test did not come first); the first run was 28 / 30 — both failures were
  the spec's own (it sent an EMPTY body to the POSTs, and body validation answers 400 before a `preHandler` guard runs — the
  repo's convention, as `login-wall.spec.ts` notes). Fixed in the spec; no handler change.
- **A DB CHECK violation ⇒ 400, executed:** `Date.now` is moved two hours ahead for one request so the contract admits a
  `becameAwareAt` the database's clock refuses ⇒ 400 `breach.constraint_violation` naming the constraint; no row.
- **Idempotency as built (DL5's order):** the claim holds for 300 s (a dead claim blocks no longer); the recorded response is
  replayed for 24 h (`extendTtlSeconds`); a throw before the commit releases the key; a failure to record AFTER the commit is a
  503 `idempotency.record_failed` and keeps the claim. ⚠ NOT executed by a test: that last 503 leg (it needs the store to fail
  between a commit and its record) — reasoned from the code only.
- **Sanity, each run and reverted:** (1) `forced-pagination.spec.ts` EXAMINES the new routes — the signals route with no
  `maximum` on `limit` turned it red ("expected [ '/api/v1/data-protection/signals' ] to deeply equal []"); (2)
  `pnpm access-wrapper:check` with a direct `audit.writeAuditEntry(…)` planted in `handlers.ts` ⇒ RED (exit 1), green again
  once removed. `DATA_PROTECTION_ROOTS` (its own const) + the README paragraph + a domain test that the breach module never calls
  the wrapper (the 12.2 / 13.1 precedent — the gate sees the `audit.` call shape only).
- **OpenAPI:** six `registerPath` entries + six components in `packages/contracts/scripts/emit-openapi.ts`; `pnpm
  contracts:emit-openapi` re-run. ⚠ The file's diff shows 541 DELETED lines — YAML anchor renumbering only (`&a78` → `&a82`, …):
  with anchors resolved, all 188 earlier paths and 246 earlier schemas are unchanged; 5 paths (6 operations) and 6 schemas are
  added. `contracts:check-openapi-determinism` passes.
- **Added beyond the task list (small, in scope of N1 / TR5):** `apps/api/tests/unit/data-protection-sends-nothing.test.ts` — a
  source fence: neither the API module nor the domain breach module imports a channel, a queue or a mail / SMS client, or makes
  an outbound request (with teeth).
- `login-wall.spec.ts` (5) and `forced-pagination.spec.ts` (6) pass. API `tsc` + `eslint` clean.
- ⚠ **A slip in this session's own commit, recorded:** `1671ccf4` (Task 5's code) was committed by a chained command whose
  earlier step had failed silently — the fence test still sat at `apps/api/tests/` and this story-file record was missing from
  it. The next commit moves the test to `tests/unit/` and adds this record; no code in `1671ccf4` is wrong.

**(d9) Task 6 — 2026-11-20 (the admin pages; AC12, and AC9 / AC10 / AC11's page halves).**

- **The IST helper first (RED → GREEN):** `istLocalInputToIso` / `isoToIstLocalInput` beside `formatIst` in
  `correction-chase/ist.ts`; `tests/ist-local-input.test.ts` (6 tests) runs with `TZ=America/New_York` and asserts it really is
  outside IST. An impossible date (30 February) is refused, not rolled forward.
- **Module `apps/admin/src/modules/breach-reporting/`:** `i18n-en.ts` (all copy), `BreachGateView.tsx` (the module's own gate +
  its own `AccessDenied`), `fields.ts` (each kind's form as data — the payload is validated by the SAME
  `BreachEntryAppendRequest` the server uses, through a react-hook-form resolver), `OpenIncidentForm.tsx`, `EntryForm.tsx`,
  `DraftsPanel.tsx` (the contract's `buildBreachDrafts`; read-only boxes with Copy; ⛔ send control), `BreachListPage.tsx`
  (signals, open, the list with badges, the "Monthly review" panel), `BreachDetailPage.tsx` (rehearsal banner, the clock in IST,
  the timeline, one form per kind behind a kind selector, the drafts; a closed incident shows no form).
  `routes/BreachReportingRoute.tsx` (list + detail), two routes in `router.tsx`, a "Data protection" nav link shown only with
  the grant. `api/client.ts` (six calls), `api/hooks.ts` (`hasBreachManage`, the four query keys of AC12, the hooks).
- **Idempotency on the page:** `attemptKey` over a `useRef` (the 12.2 helper) — one key per attempt, kept across its retries,
  renewed when the body changes or the attempt succeeds. Pinned: three submits of one body carry ONE key; an edited body a new one.
- **`tests/breach-reporting-page.test.tsx` — 13 tests**, the client mocked with an in-memory register whose views come from the
  REAL derivation: the gate; open (12:00 IST ⇒ `06:30Z`; navigate; list + signals refreshed); client-side refusals without a
  server call; the display-name 409 and the 503 messages; a signal's prefill and "Incident opened" + link IN PLACE of the action;
  the badges; "Members on record" with no threshold; the rehearsal banner and draft heading; the drafts read-only with Copy and
  no send control anywhere; an append through a kind's form; a partial assessment; the sign-off's two-different-names rule and
  its "trustees do not sign in this app" line; the 409-closed refetch; the clock in IST.
  ⚠ Written AFTER the pages and green on the first run — so three MUTATIONS were run and reverted to show they bite: (1) no
  refetch on a 409 closed ⇒ the closed-state test fails; (2) a "Send to the Board" button in the drafts ⇒ the no-send test
  fails; (3) the open action left beside "Incident opened" ⇒ the signal test fails.
- **Microcopy gate:** the first run had 11 findings — nine "report" hits and two "not counted" (the out-of-band-blame rule).
  Reworded where it was not the statute's word (a test id, a comment, one label); ONE allow-list entry, for
  `breach-reporting/i18n-en.ts`, with AC13's statutory reason. `pnpm microcopy:check` green; `microcopy:test` 443 pass.
- Whole admin suite: 111 files, 2286 tests pass. Admin `tsc` + `eslint` clean.
- ⚠ **UN-ATTESTED: no real-browser pass.** Everything above is jsdom. The pages have not been opened in a browser, so layout,
  the native `datetime-local` control, the clipboard permission prompt and focus behaviour are unverified.

### Completion Notes List

### File List

*(Task 0 — governance; code files are added as each task lands.)*

- `.decision-log.md` — MODIFIED (Decision `2026-11-20-467`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-20-14-3-who-owns-a-breach.md` — NEW
- `_bmad-output/planning-artifacts/counsel-question-2026-11-01-14-3-breach-and-dpo.md` — NEW
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — MODIFIED (four dated annotations)
- `_bmad-output/planning-artifacts/epics.md` — MODIFIED (six dated annotations)
- `docs/launch-gate-inventory/inventory-roster.md` — MODIFIED (Row 53; dated lines at Rows 8 and 48)
- `docs/legal-counsel-engagement/review-artifact-roster.md` — MODIFIED (Row 18 dated line)
- `docs/escrow/credential-inventory.md` — MODIFIED (Domain 7 dated line)
- `_bmad-output/implementation-artifacts/deferred-work.md` — MODIFIED (new section; "picked up" then DISCHARGED lines under 13.1a C6 and 13.1b C3)
- `packages/domain/src/rbac/permissions.ts` — MODIFIED (`breach.manage`; catalog 64; the dated correction line)
- `packages/domain/tests/rbac/permissions.test.ts` — MODIFIED (pins 64 / 95)
- `packages/domain/tests/rbac/roles.test.ts` — MODIFIED (the `breach.manage` block)
- `packages/domain/migrations/0208_breach-incidents.sql` — NEW
- `packages/domain/migrations/meta/_journal.json` — MODIFIED (idx 208)
- `packages/domain/src/schema/breach_incidents.ts` — NEW (tables + the kind / source tuples)
- `packages/domain/src/schema/index.ts` — MODIFIED (export)
- `packages/domain/src/breach/{index,incidents,rules}.ts` — NEW
- `packages/domain/src/index.ts` — MODIFIED (`export * as breach`)
- `packages/domain/tests/integration/rls/breach-incidents-policy-regression.spec.ts` — NEW
- `packages/domain/tests/integration/breach/append-concurrency.spec.ts` — NEW
- `packages/contracts/src/breach/{index,schemas,derive,drafts}.ts` — NEW
- `packages/contracts/src/index.ts` — MODIFIED (export)
- `packages/contracts/tests/breach.test.ts` — NEW
- `apps/api/src/modules/data-protection/{index,routes,handlers}.ts` — NEW
- `apps/api/src/server.ts` — MODIFIED (module registered)
- `apps/api/tests/integration/data-protection/breach-register.spec.ts` — NEW
- `apps/api/tests/unit/data-protection-sends-nothing.test.ts` — NEW
- `packages/contracts/scripts/emit-openapi.ts` — MODIFIED (six paths, six components)
- `openapi/v1.yaml` — MODIFIED (emitted)
- `scripts/access-wrapper-invariants/check.ts` — MODIFIED (`DATA_PROTECTION_ROOTS`)
- `scripts/access-wrapper-invariants/README.md` — MODIFIED
- `packages/domain/tests/breach/no-audit-wrapper-in-domain.test.ts` — NEW
- `apps/admin/src/modules/breach-reporting/{i18n-en.ts,BreachGateView.tsx,fields.ts,OpenIncidentForm.tsx,EntryForm.tsx,DraftsPanel.tsx,BreachListPage.tsx,BreachDetailPage.tsx}` — NEW
- `apps/admin/src/routes/BreachReportingRoute.tsx` — NEW
- `apps/admin/src/router.tsx` — MODIFIED (two routes)
- `apps/admin/src/routes/RootLayout.tsx` — MODIFIED (nav link)
- `apps/admin/src/api/client.ts` — MODIFIED (six calls)
- `apps/admin/src/api/hooks.ts` — MODIFIED (`hasBreachManage`, keys, hooks)
- `apps/admin/src/modules/correction-chase/ist.ts` — MODIFIED (the two-way IST input helper)
- `apps/admin/tests/breach-reporting-page.test.tsx` — NEW
- `apps/admin/tests/ist-local-input.test.ts` — NEW
- `microcopy.yaml` — MODIFIED (one allow-list entry)
- `docs/runbooks/personal-data-breach-response.md` — NEW
- `docs/runbooks/dpo-appointment-and-sdf-watch.md` — NEW
- `docs/runbooks/breach-tabletop-exercise.md` — NEW
- `docs/runbooks/README.md` — MODIFIED (three related-runbook rows)
- `docs/knowledge-transfer/on-call-playbook.md` — MODIFIED (§2.13; §3 escalation bullet)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (rebase relabels; ledger `2026-11-20g`; row -> in-progress)
- `_bmad-output/implementation-artifacts/14-3-dpo-breach-reporting-operational-readiness.md` — MODIFIED (task boxes, Dev Agent Record, File List, Change Log)

## Change Log

- 2026-11-01 — v1.0 created by `bmad-create-story 14.3` (three read-only research passes: governance records, code substrate, DPDP law;
  pinned `3d6b46c5`). Ultimate context engine analysis completed — comprehensive developer guide created.
- 2026-11-01 — v1.1: checklist validation by one fresh-context verifier — 2 critical (the microcopy gate's `report` rule would turn
  `ci:local` red; ledger `2026-11-01b` already taken on `story/6-22-…` ⇒ `-11-01c`), 9 should-fix (peers reserve `-433` / Row 46 / `0195` /
  catalog 57 ⇒ placeholders; `twt_service` GRANTs; first-of-kind policy-less RLS declared; the append race ⇒ a domain module with a row
  lock + a concurrency spec; `clock_timestamp()` + `entry_seq` ordering; `-106` item 8's premise corrected; AC11 two-armed + `total`; named
  helpers — `formatIst`, `hasBreachManage`, `MemberLifecycleStateWire`, ids before audit, the `.viewed` write, `{ items }`, a signals route;
  hand-registered OpenAPI paths), ~12 low — ALL applied.
- 2026-11-01 — v1.2: second validation (`bmad-create-story validate 14.3`) by three parallel fresh-context, read-only verifiers (DB /
  domain / RBAC; API / contracts / admin / gates; governance / law — the law against the e-Gazette primary texts). 3 critical, 16
  should-add, 14 low — ALL applied on BigDev's "all". Critical: the append's `FOR UPDATE` row lock needs an UPDATE grant `twt_service`
  does ⛔ have (42501 in production, green on the superuser test DB) ⇒ an advisory lock + an EXECUTED service-login regression leg +
  TR18; the repo is PUBLIC ⇒ every private-corpus quote paraphrased with its section number (`-167`); idempotency REQUIRED on open AND
  append with `recordResult` outside `mutate` and ⛔ `release` after commit. Should-add: pre-checks before the audit intent; the tone
  rules; forced-pagination needs a `response[200]` schema; signals carry `incidentIds`; admin query keys / invalidation / 409 handling /
  the two-way IST helper; the service-login posture restated; ledger `-11-01c` collision + DL14 staleness; DL1 annotates every premise
  site and declares the DPO-appointment mapping; N2's confirmed-leak line; PQ1's costs (⛔ Row 8 person exists); G5 corrected from
  G.S.R. 843(E) / S.O. 5458(E) / G.S.R. 892(E); Task 0.1 / 0.2 / TR10 anti-fabrication; precedent paths. ⛔ Code; ⛔ decision entry.
- 2026-11-20 — v1.3: third validation (`bmad-create-story validate 14.3`), a DRIFT pass — `origin/main` `a7c99c6a` is 304 commits past
  the pin; read-only `git show origin/main:…` greps + two web searches (secondary only). 3 critical, 6 should-add, 3 low — ALL applied
  on BigDev's "all". Critical: Task 0.1 REBASES (an ancestor check proves nothing) and relabels the branch's 11-01 ledger lines, which
  main's 13.2 holds; AC3 / G19's literal test pins (56 / 74 — now 63 / 94) become "current + 1"; Row 46 is 6.39's by name ⇒ 14.3
  takes the next free row. Should-add: `.viewed` through `withCompensatingAudit` + `DATA_PROTECTION_ROOTS` in the access-wrapper gate
  (the 12.2 / 13.1 / 13.1f precedent — supersedes v1.2's direct write); `field_workers` + the memorial family list in the
  people-holding list and an incident inventory in the breach runbook (main's 13.1 C7 / Row 48 / 13.1a C6 / 13.1b C3 ask 14.3);
  a wrong-recipient triage row + a CQ cross-reference to Row 49 (d); G2 / G5 re-dated (13 Nov 2026 passed; ⛔ 12-month cut found;
  Board ⛔ functional — UN-ATTESTED); the `0194` landing note retired; NUMBERS re-derived. Low: TR15 "by mistake"; the IST formatter
  duplicates; Rows 49–52 as the row shape. ⛔ Rebased; ⛔ code; ⛔ decision entry.
- 2026-11-20 — v1.4: `bmad-dev-story 14.3` started. Task 0 (governance): rebased onto `origin/main` `a7c99c6a` (ledger lines
  relabelled `-11-01ae` / `-11-01af`); BigDev's answers to DL1–DL14 recorded verbatim (DL9 arm (a); the rest as written); decision
  `2026-11-20-467` committed alone; roster Row 53; the PQ1 note and the counsel file written, ⛔ sent; ten dated annotations; the
  deferred-work section. Found: the Gazette's two dates (13 / 14 May 2027). Un-attested: the "none found" negatives; corrigendum
  G.S.R. 892(E). Task 0.6 left open until Task 1's runbook section exists. ⛔ Code yet.
