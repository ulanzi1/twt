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
0.4's entry [`-433`]. Highest minted roster row: Row 45 ⇒ [Row 46]. Highest migration on any ref: `0194_memorial-kinship`
(`story/11b-5a-…`, unlanded, journal `when` 1796355600039); main holds `0193` ⇒ [`0195`], `when` ABOVE every sibling's
([[project_sibling_migration_when_order_shared_db]]). Permission catalog on main: `PERMISSION_CATALOG_VERSION = 56` ⇒ [57]. Ledger:
`2026-11-01a` (main) and `2026-11-01b` (`story/6-22-…`) are taken ⇒ this creation's line is `2026-11-01c`.
⚠ **PEERS RESERVE THE SAME NUMBERS IN THEIR STORY FILES (⛔ minted yet):** 6.39 (`story/6-39-…`: Row 46 "Members' claims go live",
catalog 56→57, migrations `0195` / `0196`); 6.22 (`story/6-22-…`: decision `-433`, `0195`, catalog 57; it defers Row 46 to 6.39); 13.2
(worktree `13-2-…`, untracked: `-433`, `0195_field-worker-attribution-codes`). Whoever commits first takes the number; every later one
re-derives. ⇒ This file writes the placeholders `<DEC>` (decision), `<ROW>` (roster row), `<MIG>` (migration), `<CAT>` (catalog version)
wherever the value is not yet minted.

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
  `deps.servicePool`; append-only `no_update_delete` / `no_truncate` triggers) and its RLS spec `packages/domain/src/policies/degraded-bridge-sms-switch-rls.ts`.
- The GLOBAL-write handler shape of `setBridgeSwitch` (`apps/api/src/modules/degraded-mode/handlers.ts`): `getDisplayName` (fail-closed —
  `AdminDisplayNameMissingError`) BEFORE any write, `audit.withCompensatingAudit(deps.servicePool, { auditIntent: { pariwarId:
  ADMIN_GLOBAL_NAMESPACE, … }, mutate })`, the display name SNAPSHOT on the row ([[project_admin_display_name_attribution]]).
- The GLOBAL route guard `[requireAdminSession(deps), requireGlobalPermission(deps, KEY)]` (`apps/api/src/modules/rbac/index.ts`) — as
  `GET /api/v1/audit/integrity-checks` uses it (`apps/api/src/modules/audit-log/index.ts`).
- The admin trust-wide page precedent `apps/admin/src/modules/audit-integrity/` + `apps/admin/src/routes/IntegrityRoute.tsx`
  (`IntegrityGateView` → `AccessDenied` unless the grant; advisory only — the server is the boundary) and its test shape
  (`apps/admin/tests/integrity-page.test.tsx`: `vi.mock('../src/api/client.js')` with in-memory state, `tests/_helpers.tsx`).
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
| `2026-06-21-057` · `2026-08-24-156` | Counsel Adv. Mohit Agrawal (`lc-1`, `docs/legal-counsel-engagement/counsel-roster.md`) IS engaged; his recorded acts cover edge/WAF, directory/public surfaces, T&C clauses — ⛔ DPO, ⛔ breach, ⛔ SDF. Review-artifact Row 18 `dpo-breach-reporting-envelope-v1` is `pending-submission` — counsel has ⛔ been asked. | recorded |
| Niyamavali Part 10 · Deed cl. 15(b) · privacy policy §11 (private corpus — `docs/legal/`, git-ignored copy in the main checkout) | Niyamavali Part 10: a DPO / grievance officer *"designated as and when required, with breach-notification procedures per law"*. Draft privacy policy §11: notify the Board and affected Data Principals *"in the manner and timelines required by the DPDPA … The DPO owns this process."* — DPO name/contact are placeholders. ⚠ Deed is an unexecuted agent draft ([[project_legal_corpus_private_repo_split]]). | ⛔ ratified / draft |

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate that gates a member's access to a benefit, and changes ⛔ existing one** — it records incidents and
drafts notices; ⛔ code path reads a breach record to decide anything about a member.

What it MEANS to a member, in their terms (for the record, ⛔ a gate): *"If the Trust's handling of your data goes wrong, the Trust will
tell you without delay what happened, what it may mean for you, what it is doing about it, what you can do, and whom to ask."* —
**checked against the Niyamavali:** Part 10 (*"breach-notification procedures per law"*) — CONSISTENT; ⛔ clause contradicts it.

## ⭐ THE INVARIANTS

- **N1 — The system drafts; people send.** ⛔ Code path transmits a breach notice to a member, the Board or CERT-In. Every "sent" fact is
  an entry RECORDED by staff after they sent it outside the system (`*_recorded` kinds, DL5). ⛔ SMS / WhatsApp / push / email dispatch is
  added ([[project_dlt_only_approved_text_is_delivered]] — an un-registered SMS text would ⛔ even be delivered).
- **N2 — Every breach is notifiable; a signal is ⛔ a breach.** The law has ⛔ materiality threshold (G1). ⛔ Field, enum value, copy or
  runbook line may say a breach is "minor" and so need not be notified. Conversely a detection SIGNAL (G14–G16) only opens an ASSESSMENT —
  the runbook says so in one line.
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
  delay"*: description incl. nature, extent, timing **and location**, likely impact. 7(2)(b) to the Board *"within seventy-two hours of
  becoming aware"* (or a longer period the Board allows on written request): (i) updated detailed description; (ii) broad facts on events,
  circumstances, reasons; (iii) mitigation implemented or proposed; (iv) findings regarding the person who caused it; (v) remedial measures
  to prevent recurrence; (vi) report on the intimations given to Data Principals. ⛔ Prescribed form or portal — the Board is a "digital
  office" (Rule 20); [S] reported *"constituted but not yet functional"* (Union, Kerala HC, 7 Oct 2026).
- **G3 — DPO is SDF-only; a CONTACT is universal.** s.10(2)(a): an SDF's DPO is *"based in India"*, *"an individual responsible to the
  Board of Directors or similar governing body"*, the grievance point of contact. s.8(9) + Rule 9 (every fiduciary): publish *"prominently"*
  the business contact of *"a Data Protection Officer, if applicable, or a person who is able to answer"*, and state it in every rights
  response. s.8(10) grievance mechanism; Rule 14(3) response period ≤ 90 days.
- **G4 — SDF has ⛔ numeric threshold.** s.10(1): the Central Government *"may notify any Data Fiduciary or class"* on factors (volume and
  sensitivity, risk to rights, sovereignty, electoral democracy, security of the State, public order). [S] ⛔ SDF or class notified as of
  Oct 2026. SDF duties (s.10(2), Rule 13): DPO, independent data auditor, DPIA + audit every 12 months, algorithmic due diligence,
  localisation of specified data. ⇒ the epic's *"monitoring of data-principal count threshold"* monitors a number with ⛔ threshold (DL9).
- **G5 — Commencement.** Rules notified 13 Nov 2025. Rule 1(4): Rules 3, 5–16, 22, 23 — **including Rule 7 (breach)** — commence 18 months
  later ⇒ **13 May 2027** (one firm reads 12 May). [S] Act ss.3–17 + Schedule commence the same day (G.S.R. 843(E)). [S] A Jan 2026 MeitY
  PROPOSAL to cut 18 → 12 months (⇒ 13 Nov 2026) — ⛔ amending notification found as of late Oct 2026. [S] DPDP (Removal of Difficulties)
  Order 2026 (S.O. 5458(E)) — editorial only. ⚠ TWT is ⛔ in production ([[project_not_in_production_merge_is_not_golive]]) — the duty
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
  "Appended … by Story X (Task 0.4) under [Decision …]" preamble (Row 44's shape); Row 16 was minted by an AUTHOR-COMMIT decision.
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
- **G19 — RBAC.** `packages/domain/src/rbac/permissions.ts`: `PERMISSION_CATALOG_VERSION = 56`; adding a key = append to
  `SEED_PERMISSION_KEYS` + bump with a dated comment block + update the pins in `packages/domain/tests/rbac/permissions.test.ts`; ⛔
  migration (catalog is pure data); `super_admin` derives every key; the 5.8b / 6.33 precedent for a Super-Admin-only global key is
  "derived, ⛔ `roles.ts` const". Contracts transport mirror `packages/contracts/src/rbac/permissions.ts`.
- **G20 — Migrations.** `packages/domain/migrations/NNNN_kebab.sql`, hand-authored, `meta/_journal.json`; never regenerate an applied one
  (42P07 — [[project_live_db_test_gotchas]]). main's highest `0193_marketplace-modules`; `0194_memorial-kinship` on `story/11b-5a-…`.
- **G21 — ⛔ cross-Pariwar member count exists** (only per-Pariwar counts: `reports/templates/contribution-rate-by-district.ts`, news/survey
  fan-out `memberCount`). Member states: the `members.ts` tuple (`pending-kyc` … `anonymized`); `members.state` is a projector-written cache.
- **G22 — Route-table gates.** `apps/api/tests/integration/login-wall.spec.ts` and `forced-pagination.spec.ts` walk the live route table —
  every collection route needs a bounded `limit`. `contracts:check-openapi-determinism` needs `pnpm contracts:emit-openapi` re-run.
  `friction-budget` does ⛔ count `apps/admin`. `docs/launch-gate-inventory/` edits re-include CI (`dlt-typed-variables` reads it).

## Build decisions — PROPOSED (BigDev answers at Task 0.2; ⭐ = recommended)

- **DL1 — Correct the premise, FOUND (⛔ a ruling).** The decision entry (Task 0.4) records G1–G5 as found law: breach-reporting readiness
  is due by **go-live or DPDP commencement (13 May 2027, re-checked), whichever is first**, for the Trust as it is today; only the DPO is
  SDF-gated. PRD FR-99 and epics 14.3 get DATED annotation lines (⛔ rewrites — [[feedback_supersede_never_reinterpret]]): *"breach
  reporting is ⛔ SDF-gated — see `<DEC>`"*. ⛔ Panel routing (it is statute — [[feedback_provider_policy_is_found_not_counsel]]); the
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
- **DL3 — ONE new GLOBAL key `breach.manage`** (read AND write; catalog 56 → <CAT>, key count +1, dated comment block citing `<DEC>`).
  Super-Admin only, DERIVED (⛔ `roles.ts` const — the 5.8b / 6.33 precedent). ⛔ `dpo` role, ⛔ `auditor` grant (TR1). The future DPO is
  the intended holder — say so in the key's comment beside `member.data_rights`'s, plus DL1's dated correction line there. The
  "⛔ other role holds it" pin goes in `packages/domain/tests/rbac/roles.test.ts` (5.8b's block / 6.33's `holders(...)` shape).
  `packages/contracts/src/rbac/permissions.ts` holds ⛔ key list or version — ⛔ change there. Admin grant helper: `hasBreachManage(grants)`
  in `apps/admin/src/api/hooks.ts` (beside `hasAuditVerify`).
- **DL4 — Migration `<MIG>_breach-incidents.sql`** (number re-checked at Task 0.1; journal `when` above every sibling's), two GLOBAL tables:
  - `breach_incidents` — `incident_id uuid PK default gen_random_uuid()`, `is_rehearsal boolean NOT NULL`, `title text NOT NULL` (1–200),
    `became_aware_at timestamptz NOT NULL` (the 72-hour clock — G2), `opened_at timestamptz NOT NULL default now()`, CHECK
    `became_aware_at <= opened_at`, `detection_source text NOT NULL` CHECK in DL8's list, `detection_signal_ref text NULL` (≤ 200; e.g. an
    `audit_integrity_checks.check_id`), `opened_by uuid NOT NULL` (admin user id), `opened_by_display text NOT NULL` (snapshot),
    `audit_id uuid NOT NULL` (the compensating-audit intent line's id, as 0188's history row stores it). The handler generates
    `incident_id` with `randomUUID()` BEFORE the audit intent (the `declare` handler's precedent — DL10's locator embeds it).
  - `breach_incident_entries` — `entry_id uuid PK` (generated before the audit intent, as above), `entry_seq bigint GENERATED ALWAYS AS
    IDENTITY`, `incident_id uuid NOT NULL REFERENCES breach_incidents`, `kind text NOT NULL` CHECK in DL5's list, `payload jsonb NOT NULL`,
    `recorded_at timestamptz NOT NULL` stamped by a BEFORE INSERT trigger with `clock_timestamp()` (0188's `_stamp` shape — ⛔ `default
    now()`, which is the transaction START and can sort a lock-waiter before an earlier commit — footgun #62c), `recorded_by uuid NOT NULL`,
    `recorded_by_display text NOT NULL`, `audit_id uuid NOT NULL`; index `(incident_id, entry_seq)`. **Order everywhere by `entry_seq`.**
  - Both: ENABLE + FORCE RLS with **ZERO policies**, ⛔ `twt_app` grant (N5); `GRANT SELECT, INSERT ON <both> TO twt_service` — ⛔ UPDATE /
    DELETE (`twt_service` is `NOBYPASSRLS` from `0002`; the service login inherits it and BYPASSRLS does ⛔ bypass GRANTs — a superuser test
    DB HIDES a missing grant; 0188 grants it explicitly). Append-only trigger function `breach_reject_mutation()` raising
    `integrity_constraint_violation` + `no_update_delete` / `no_truncate` triggers per table (0192's / 0188's shape).
    ⚠ **FIRST OF ITS KIND, declared:** ⛔ table in the repo has RLS on with no `twt_app` grant and no policy. ⛔ Gate requires a policy per
    table (`policies/README.md` requires a regression spec per POLICY; ⛔ rule for a policy-less table) ⇒ ⛔ `policies/breach-incidents-rls.ts`.
    The regression spec `packages/domain/tests/integration/rls/breach-incidents-policy-regression.spec.ts` pins: `twt_app`'s privilege set
    EMPTY and `twt_service`'s = {SELECT, INSERT} (`tablePrivileges(client, …)` as `degraded-bridge-sms-switch-policy-regression.spec.ts`
    does), the triggers, and the CHECKs.
  - The kind / source lists are TUPLES exported from `packages/domain/src/breach/` (0188's `ALERT_SMS_SEND_*` lockstep pattern); the
    regression spec compares each tuple to `pg_get_constraintdef` of its CHECK; contracts mirrors the tuples and a contracts test pins them
    equal to the domain export ([[project_contracts_domain_bundle_boundary]] — contracts ⛔ imports a pg-touching domain module at runtime;
    the test may).
  - Drizzle schema `packages/domain/src/schema/breach_incidents.ts` (+ export from `schema/index.ts`); `pnpm db:check` clean. `when` above
    `0194`'s 1796355600039 and every other sibling's at the commit.
  - **Domain module `packages/domain/src/breach/`** (`index.ts`, `incidents.ts`) — the handlers call it, ⛔ inline SQL in handlers:
    `openBreachIncident(pool, input)`; `appendBreachEntry(pool, input)` which takes a client, `BEGIN`, `SELECT … FROM breach_incidents WHERE
    incident_id = $1 FOR UPDATE` (a row lock fires ⛔ UPDATE trigger), reads the entries, derives (DL6), checks closed / extension, inserts,
    `COMMIT` — so "after `closed` ⇒ 409" and "`grantedUntil` > current due" cannot race; `listBreachIncidents(pool, limit)` (clamped);
    `readBreachIncident(pool, id)`. A concurrency spec: a `closed` and a `mitigation` append raced on two own-committing clients (both CALLING
    `appendBreachEntry` — ⛔ a hand copy of the lock, [[feedback_stub_must_call_not_transcribe]]) ⇒ ⛔ entry ever has a higher `entry_seq`
    than the incident's `closed` entry; the loser gets `breach.incident_closed`.
- **DL5 — Entry kinds (closed list; one strict Zod payload each in `packages/contracts/src/breach/`; the DB CHECK lists the same strings —
  pinned by DL4's lockstep mechanism).** Text fields bounded (≤ 2000 unless noted). Request body `{ kind, payload }` is a Zod discriminated
  union on `kind`. A DB CHECK violation (23514 — e.g. app clock ahead of the DB on `became_aware_at`) maps to **400**, ⛔ a 500.
  ⭐ Appends take an `Idempotency-Key` header through the existing idempotency substrate (`idempotency_keys` — a GLOBAL table; the caller
  namespaces the key `breach-entry:${incidentId}:${headerKey}`; `packages/domain/src/idempotency/keyed-store.ts`; COMMIT then `recordResult` —
  [[project_idempotent_write_handler_shape]]): an append-only row can never be removed, so a retried `principals_notice_recorded` must ⛔
  land twice.
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
  - `signoff_recorded` — `signers: string[]` (≥ 2 DISTINCT trimmed names, each ≤ 120), `signedOn` (date ≤ today), `note`. ⚠ A RECORD
    that trustees signed outside the system, made by the operator — ⛔ the trustees' own sessions (name it so in the UI).
  - `closed` — `summary`. After `closed` every append is refused **409 `breach.incident_closed`**.
  - `note` — `text`.
- **DL6 — ONE derivation.** `deriveBreachIncidentView(incident, entries, now)` (pure, in `packages/contracts/src/breach/derive.ts` so the API
  and admin share it — ⛔ a second copy in the admin module): `status: 'open' | 'closed'`; `latestAssessment`; `boardReportDueAt =
  latest board_extension.grantedUntil ?? became_aware_at + 72h`; booleans `principalsNoticeRecorded`, `boardInitialRecorded`,
  `boardReportRecorded`, `boardReportOverdue (open && !boardReportRecorded && now > due)`, `signoffRecorded`. ⛔ Stored. Entries are
  consumed in `entry_seq` order. Times shown in IST with `formatIst` (`apps/admin/src/modules/correction-chase/ist.ts` — already imported by
  `degraded-mode/BridgeSwitchPanel.tsx`; ⛔ inline `toLocaleString`). Form inputs (`becameAwareAt`, `occurredAt`, `sentAt`, `grantedUntil`)
  are `datetime-local` read as IST wall-clock and converted to an ISO instant with the `+05:30` offset before submit (one helper in the
  module, unit-tested; ⛔ the browser's local zone). The overdue badge reads "Board report overdue" — ⛔ `URGENT` (a microcopy tone rule).
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
  'audit_chain_break'`, `detection_signal_ref = check_id`, `became_aware_at = verified_at`. ⛔ Other signal is wired: 4.8 and 1.16b and the
  five have ⛔ persisted signal to read (G15–G17); the runbook's triage table says WHERE each surfaces today (CI red; a pino `op`; ⛔ built)
  and a `deferred-work.md` item homes the live feeds to Category 5. ⚠ This is a DECLARED NARROWING of the epic's "integrates with" — ⛔
  silent; AC10 says so. ⛔ New alert sink, paging, or acknowledgement write from the breach page (the integrity page owns acknowledgement).
- **DL9 — Members on record (the monthly review's input, ⛔ a threshold).** ⭐ (a) `GET /api/v1/data-protection/members-on-record` →
  `{ asOf, pariwarCount, total, byState: Record<MemberLifecycleStateWire, int> }` (contracts' `MemberLifecycleStateWire` from
  `packages/contracts/src/kyc/signup.ts` — contracts ⛔ imports `@twt/domain`; trust-wide via `deps.servicePool`, the shipped convention
  for global reads — `runAsCrossTenant` has ⛔ production caller; `total` EXCLUDES `anonymized`, which stays visible in `byState`).
  ⚠ `twt_service` holds ⛔ grant on `members` today (the `role_grants` posture; the production service login is undecided — roster Row 26):
  the test DB's superuser hides it — the migration adds ⛔ grant; Completion Notes name it as a Row 26 residual. Labelled **"Members on
  record"** — ⛔ "data principals": the runbook lists the people-holding tables it does ⛔ count
  (nominees, known people, claim contacts, workplace requests). ⛔ Threshold, ⛔ alert (G4). Shown in a "Monthly review" panel on the
  breach list page. *(b)* ⛔ endpoint — a documented SQL in the runbook run by hand monthly. ⭐ (a): it makes the monthly review real and
  gives "extent" a number.
- **DL10 — Audit.** Writes under `withCompensatingAudit` (ADMIN_GLOBAL_NAMESPACE): `data_protection.breach.opened`,
  `data_protection.breach.entry_appended` (resource locator `global/data-protection/breaches/<id>[/entries/<entryId>];kind=<kind>`; payload
  hash over the canonical body). ⭐ The DETAIL read is audited `data_protection.breach.viewed` (FR-47 — narratives may hold personal data)
  by a direct `audit.writeAuditEntry(deps.servicePool, …)` (precedent: `member-validity/handlers.ts`'s `member.search`; the module is
  outside the access-wrapper roots, so a direct write is allowed); the list and signals reads are ⛔ audited (titles, dates, flags only —
  ⛔ narrative in the list DTO). ⛔ Audit-action registry exists — the names are free strings in the dotted `resource.action` form.
- **DL11 — The runbooks (`docs/runbooks/`, `_template.md`'s five sections, header "⚠ NOT AUTHORITATIVE until signed in
  `operational-readiness-ledger.md`").**
  - `personal-data-breach-response.md` — G2's two clocks; who does what (owner = `[PENDING PQ1]`, interim = on-call §2.13's escalation);
    the triage table (DL8; N2's one line); the Rule-7 notice steps using the drafts; the channels that EXIST today to reach affected members
    (the app's per-Pariwar News / noticeboard banner, the Pariwar's WhatsApp / announcement channels where live, phone via the helpline) —
    ⛔ a channel that is not built, and SMS only with a DLT-registered text (deferred item); "translate the member notice before sending";
    the CERT-In leg marked `[COUNSEL — CQ2]` with the 6-hour clock stated as the conservative reading; Board filing route `[no portal yet —
    re-check]`.
  - `dpo-appointment-and-sdf-watch.md` — named-candidate criteria (G3: an individual, India-based, responsible to the Board of Trustees, the
    grievance contact; independence / conflicts `[COUNSEL — CQ5]`); the appointment ceremony (Panel decision entry naming the person +
    contact; `dpo-contact-path` envelope sealed per `docs/escrow/`; privacy policy / T&C placeholders filled in the private corpus; Rule 9
    publication; Row 8 / Row <ROW> updated); the SDF watch (architecture's named triggers + the Gazette check + the members-on-record count);
    the **FR-99 monthly compliance review** checklist (open incidents and overdue clocks; SDF / commencement Gazette check; members on record;
    Row 8 / Row <ROW> status; counsel returns; a dated line in this runbook's log table — ⛔ the decision log, unless something changed).
  - `breach-tabletop-exercise.md` — the degradation table-top's shape: a synthetic incident run on a REHEARSAL record end to end (signal →
    open → assessment → drafts → owner review → recorded sign-off → close), ≥ 2 trustees, output a GAP LIST, logged as a decision entry WHEN
    RUN (architecture: pre-launch, then semi-annual). ⛔ Run by this story.
  - Also: `docs/runbooks/README.md` related-runbooks list gains the three; on-call playbook §2.13 points at the breach runbook and drops
    the stale "(when engaged)" ([[project_dpdpa_counsel_engaged_but_unrecorded]] — write "counsel has not been asked about breach
    reporting", ⛔ "counsel is not engaged"); `docs/escrow/credential-inventory.md` Domain 7 gains ONE dated line (status unchanged — G11).
- **DL12 — Launch-gate Row <ROW> `dpdpa-breach-and-dpo-readiness`**, appended by the author-commit `<DEC>` (Row 16 precedent): owner Trustee
  Panel; support BigDev + counsel `lc-1`; closure criteria — (a) the three runbooks signed by ≥ 2 trustees in the ledger; (b) the table-top
  RUN and logged with its gap list closed or homed; (c) PQ1 ruled and the breach owner named with a published contact (with Row 8); (d)
  counsel's return on CQ1–CQ5 recorded; (e) commencement / SDF Gazette check dated within 30 days of go-live; (f) a DLT-registered breach
  SMS text OR a recorded decision not to use SMS; target: before go-live or 13 May 2027, whichever is first; `current_status: open`. Row 8
  gets ONE dated cross-reference line.
- **DL13 — Counsel question** `_bmad-output/planning-artifacts/counsel-question-2026-11-01-14-3-breach-and-dpo.md` (the 2026-10-18 file's
  shape; WRITTEN, ⛔ sent — BigDev sends): CQ1 does s.8(6) / Rule 7 bind the Trust as constituted (and is there ANY registration duty for
  a Data Fiduciary — roster Rows 10 / 11 assume one; the Act registers Consent Managers); CQ2 do the CERT-In 2022 Directions apply
  to it; CQ3 does a notice through the app (News / banner) plus WhatsApp / a phone call satisfy "each affected Data Principal … through her
  user account or any mode of communication registered by her"; CQ4 the Trust's SDF exposure (Aadhaar-derived KYC, death certificates,
  financial history) and whether a voluntary DPO is advisable; CQ5 who may be the DPO / breach owner (a trustee? independence). `review-artifact-roster.md`
  Row 18 gets a dated "question drafted (not submitted)" line — ⛔ `submitted` until BigDev sends.
- **DL14 — Records.** Ledger `2026-11-01c`; row `14-3-…` backlog → ready-for-dev; `epic-14` backlog → in-progress (12.1's precedent).
  `deferred-work.md` items (Task 0.6).

## Panel question (NON-BLOCKING — ⛔ gates the build or the merge; gates Row <ROW> (c))

- **PQ1 — Until the Trust is notified as a Significant Data Fiduciary, who owns a personal data breach, and when is a DPO appointed?**
  THE ONE FACT: the law requires a DPO only of an SDF, but requires EVERY fiduciary to report a breach and to publish a person who can
  answer (G1, G3); our draft privacy policy says *"The DPO owns this process"* while PRD OQ-7 targets a DPO *"before public launch"*.
  - **A** — appoint a DPO before go-live, voluntarily. Cost: a named, India-based individual responsible to the Board of Trustees, with
    time and independence, from launch; the privacy policy stays as drafted.
  - **B** ⭐ — designate now the person Row 8 publishes as the contact (s.8(9)) as the breach owner; appoint a DPO only when notified as an
    SDF (or earlier on counsel's advice — CQ4). Cost: privacy policy §11's *"The DPO owns this process"* must change before members agree to
    it; an SDF notification would start the 12-month DPIA / audit clock with ⛔ DPO in post.
  - **C** — the Panel chair owns breaches until an SDF notification. Cost: a trustee carries an operational 72-hour duty; the published
    contact (Row 8) and the breach owner become two people.
  Written from the template (§0 gate passed — WHO the Trust names and what it owes a member), Task 0.3.

## Acceptance Criteria

1. **AC1 — Governance first (Task 0).** Before any code: the decision entry `<DEC>` (AUTHOR-COMMIT; G1–G5 as found law with the Gazette
   check's date; DL1–DL14 as answered; Row <ROW> minted; ⛔ supersedes a ratified entry) committed ALONE; the PQ1 note and the CQ file written
   (⛔ sent); FR-99 / epics 14.3 annotated (dated lines, ⛔ rewrites); the `-106` item 8 premise corrected in the entry (DL1); Row <ROW> +
   Row 8 line + Row 18 line + escrow Domain 7 line present; `deferred-work.md` carries Task 0.6's four items.
2. **AC2 — Runbooks (DL11).** The three runbooks exist with the template's five sections and the NOT-AUTHORITATIVE header; the breach runbook
   states both Rule-7 clocks, N2's line, the DL8 triage table with each signal's present surface, and ⛔ channel that is not built; the DPO
   runbook carries the FR-99 monthly review checklist; ⛔ sign-off row, ⛔ "table-top run" line is written anywhere. README + playbook §2.13
   updated.
3. **AC3 — Permission (DL3).** `breach.manage` in `SEED_PERMISSION_KEYS`; `PERMISSION_CATALOG_VERSION = <CAT>` with a dated block; the pins in
   `permissions.test.ts` updated; `super_admin` derives it; `roles.test.ts` pins that ⛔ other role holds it; the dated DL1 correction
   line sits beside the `member.data_rights` comment; ⛔ `dpo` role anywhere.
4. **AC4 — Migration (DL4, N3, N5).** `<MIG>_…` applies on a fresh DB and on top of `0194` in either landing order (journal `when` above);
   live-DB tests: UPDATE / DELETE / TRUNCATE on either table raise; `twt_app`'s privilege set on both tables is EMPTY and `twt_service`'s is
   exactly {SELECT, INSERT}; `became_aware_at > opened_at` and an unknown `kind` / `detection_source` are refused by CHECK; each CHECK's
   list equals its domain tuple (`pg_get_constraintdef`); `recorded_at` is trigger-stamped; `pnpm db:check` clean.
5. **AC5 — Open an incident.** `POST /api/v1/data-protection/breaches` (`breach.manage`): body `{ isRehearsal, title, becameAwareAt,
   detectionSource, detectionSignalRef? }`; `becameAwareAt` in the future ⇒ 400; a nameless admin ⇒ refused before any write (the
   bridge-switch shape); one row + one `data_protection.breach.opened` audit line; without the grant ⇒ 403 (the global-gate denial audit
   as today); a non-admin session ⇒ 401.
6. **AC6 — Append an entry.** `POST /api/v1/data-protection/breaches/:incidentId/entries` with `{ kind, payload }` — each DL5 kind accepted
   with a valid payload and refused 400 with an invalid one (one test per kind); `signoff_recorded` with < 2 distinct names ⇒ 400;
   `board_extension_recorded.grantedUntil` ≤ the current due time ⇒ 400; any append after `closed` ⇒ 409 `breach.incident_closed`; unknown
   incident ⇒ 404; a DB CHECK violation ⇒ 400 (⛔ 500); one `data_protection.breach.entry_appended` audit line per accepted append; the
   same `Idempotency-Key` twice ⇒ ONE entry, the same response; the DL4 concurrency spec passes; a bodyless request is sent `'{}'` in
   tests ([[project_fastify_empty_json_body_400]]).
7. **AC7 — Read.** `GET /api/v1/data-protection/breaches?limit=` (bounded, default 20, max 100; newest `opened_at` first; response
   `{ items: [...] }` — ⛔ a named array such as `{ incidents }`, which `forced-pagination.spec.ts` cannot see, making it vacuous; item =
   id, title, isRehearsal, openedAt, becameAwareAt, detectionSource + DL6's status / due / overdue / recorded flags — ⛔ narrative) passes
   `forced-pagination.spec.ts` and `login-wall.spec.ts`; `GET …/:incidentId` returns the incident, every entry in `entry_seq` order, and
   `deriveBreachIncidentView`'s output, and writes ONE `data_protection.breach.viewed` audit line.
8. **AC8 — Derivation (DL6).** Unit tests of `deriveBreachIncidentView`: due = aware + 72h; an extension moves it; overdue only when open,
   unreported and past due; `closed` ⇒ status closed and ⛔ overdue; the latest `assessment` wins. The API and the admin page import the
   SAME function (a grep-able single definition).
9. **AC9 — Drafts (DL7, N1, N6).** Unit tests of `buildBreachDrafts`: every Rule-7 sub-item (7(1)(a)–(e), 7(2)(a), 7(2)(b)(i)–(vi)) appears
   labelled in its draft; an empty assessment yields `complete: false` with each missing field named; a rehearsal heads all three with
   `REHEARSAL — DO NOT SEND`; ⛔ draft contains a hard-coded trust name. The admin page shows each draft read-only with "Copy" and ⛔ send
   control.
10. **AC10 — The one live link (DL8).** `GET /api/v1/data-protection/signals` (bounded, `{ items }`, `breach.manage`) lists failed,
    unacknowledged integrity checks and "Open an incident from this" pre-fills source / ref / awareness; a live-DB test seeds its OWN
    `chain_valid = false` check and its own acknowledged failed check and asserts by MEMBERSHIP (own unacknowledged present, own acknowledged
    absent — both tables are append-only and accumulate; ⛔ "sees only"). The story's Completion Notes state the narrowing: 4.8, 1.16b and
    architecture's five are runbook triage + a deferred item, ⛔ wired.
11. **AC11 — Members on record (DL9), by the arm BigDev picks.** (a): the endpoint returns `total` (⛔ `anonymized`) and per-state counts
    trust-wide across ≥ 2 seeded Pariwars, `anonymized` visible in `byState`; the panel is labelled "Members on record"; ⛔ threshold or
    alert. (b): ⛔ endpoint, ⛔ panel; the SDF-watch runbook carries the count SQL with the same `total` rule. Strike the other arm at Task
    0.2.
12. **AC12 — Admin page (DL2).** `/data-protection/breaches` behind `hasBreachManage` (`AccessDenied` otherwise — a SIBLING of
    `IntegrityGateView`, which is hard-wired to `hasAuditVerify`; ⛔ reuse it);
    list with overdue and rehearsal badges; open form (react-hook-form + the contracts schema); detail page with the timeline, one form per
    kind, the clock panel (IST), the drafts, and the rehearsal banner; the free-text hint (N4); copy in `breach-reporting/i18n-en.ts`.
    vitest + jsdom tests mocking `../src/api/client.js` cover the gate, open, append, the closed state, the rehearsal banner and the drafts.
13. **AC13 — Gates.** Every new path registered by hand in `packages/contracts/scripts/emit-openapi.ts` (`registerPath` — the bridge
    switch's entries are the model; re-running the emitter WITHOUT them changes nothing), then `pnpm contracts:emit-openapi` re-run and
    `openapi/v1.yaml` committed; the microcopy gate green — per-file `allow` entries in `microcopy.yaml` with `pattern: '\breport'` and a
    reason ("statutory DPDP Rule 7(2)(b) term — 'report to the Board' — staff surface") for every new `breach-reporting/*` file,
    `BreachReportingRoute.tsx` and `api/hooks.ts` (Story 10.7's precedent; ⛔ reword the statute's language); `pnpm ci:local` green on a fresh container
    ([[project_known_livedb_test_failures]] — own container, DB named `twt_dev`); every push prefixed `DATABASE_URL=<story port>`
    ([[project_prepush_hook_inherits_5432]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST, ⛔ code** ([[feedback_governance_commits_precede_implementation]])
  - [ ] 0.1 `git fetch origin`; confirm `3d6b46c5` is an ancestor of HEAD; re-derive the NUMBERS block on every ref (decision, roster row,
        migration, catalog version, ledger letter); re-check G5 against the e-Gazette (commencement; any SDF notification; any Board portal)
        and write the check's date into the entry. `ListAgents` + `git branch --show-current` before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
  - [ ] 0.2 Put DL1–DL14 to BigDev (DL9 (a)/(b)); record the answers verbatim in this file.
  - [ ] 0.3 Write the PQ1 note from the template (by path, ⛔ copied):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-14-3-who-owns-a-breach.md` — question, THE ONE FACT, A/B/C with
        an honest cost each, evidence LAST; run the template's checks. Status WRITTEN, ⛔ sent (BigDev sends). Written now, committed
        AFTER 0.4's entry (the entry is the first commit).
  - [ ] 0.4 Decision entry (AUTHOR-COMMIT, next free — `-433` at authoring; peers 6.22 / 13.2 reserve the same — re-derive), committed
        ALONE, FIRST; try the write — if refused, ask once ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.5 The CQ file (DL13) + Row 18 dated line; Row <ROW> appended + Row 8 line (DL12); FR-99 + epics 14.3 dated annotations (DL1); escrow
        Domain 7 dated line.
  - [ ] 0.6 `deferred-work.md` items: (i) live feeds for 4.8 / 1.16b / architecture's five signals → Category 5 (trigger: the Category-5
        observability story's create-story); (ii) a DLT-registered breach SMS text (trigger: Row <ROW> (f)); (iii) a human-reviewed Hindi member
        notice template (trigger: go-live of member comms in Hindi); (iv) members-on-record omits nominees / known people / claim contacts
        (trigger: an SDF notification or CQ4's return).
  - [ ] 0.7 Ledger line + row `ready-for-dev → in-progress` ([[project_sprint_status_safe_prepend]] — verify the YAML parses).
- [ ] **Task 1 — Runbooks (AC2)** — DL11's three files + README + playbook §2.13. Cite sections, ⛔ paste private-corpus text.
- [ ] **Task 2 — Permission (AC3)** — DL3; run `packages/domain/tests/rbac/permissions.test.ts` and `roles.test.ts`.
- [ ] **Task 3 — Migration + schema + domain module (AC4, AC6)** — DL4: `<MIG>`, journal entry (`when` above every sibling), Drizzle schema,
      `packages/domain/src/breach/` (tuples + `openBreachIncident` / `appendBreachEntry` (row lock) / `listBreachIncidents` /
      `readBreachIncident` / the signals read / the members-on-record count); the regression spec
      `packages/domain/tests/integration/rls/breach-incidents-policy-regression.spec.ts` (⛔ policy file — DL4); the concurrency spec.
- [ ] **Task 4 — Contracts (AC5–AC9)** — `packages/contracts/src/breach/` (`schemas.ts`, `derive.ts`, `drafts.ts`, `index.ts`; re-export from
      `src/index.ts`); tuples mirrored + pinned to the domain export; unit tests for derive + drafts
      ([[project_contracts_tests_outside_tsc]] — run them, typecheck does ⛔ see them).
- [ ] **Task 5 — API (AC5–AC7, AC10, AC11)** — `apps/api/src/modules/data-protection/{index,routes,handlers}.ts` registered in `server.ts`;
      global guards (⛔ `scopeResolutionHook` / `requirePermissionHook` — TR3); handlers in the bridge-switch shape (ids by `randomUUID()`
      before the audit intent; 23514 ⇒ 400; the idempotency key on appends); live-DB specs under
      `apps/api/tests/integration/data-protection/` (assert own rows by membership — append-only rows cannot be cleaned; delete
      `role_grants` after each test, as `audit-integrity-ui.spec.ts` does); `registerPath` entries in
      `packages/contracts/scripts/emit-openapi.ts`, then `pnpm contracts:emit-openapi`.
- [ ] **Task 6 — Admin (AC12, AC9, AC10, AC11)** — module + route + nav + `hasBreachManage` + client / hooks additions in `api/client.ts` /
      `api/hooks.ts` + the IST input helper; `microcopy.yaml` per-file `allow` entries (AC13); tests.
- [ ] **Task 7 — Gate + records (AC13)** — `ci:local` on a fresh container; story Completion Notes (including AC10's narrowing and every
      un-attested item: ⛔ table-top run, ⛔ sign-off, ⛔ counsel return, ⛔ device / browser pass); File List; ledger; row → review.

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
- **TR7 — Migration ordering.** `0194` sits unlanded on `story/11b-5a-…`; whichever lands second must keep a higher `when` and be applied in
  journal order on a shared dev DB ([[project_sibling_migration_when_order_shared_db]]); ⛔ regenerate an applied migration (42P07).
- **TR8 — Forced pagination.** The list route MUST take a bounded `limit` or `forced-pagination.spec.ts` fails (G22); clamp `.limit()`
  ([[project_domain_limit_clamp_and_savepoint_retry]]).
- **TR9 — JSDoc + markdown.** `**7(2)(b)**` inside a `/** */` block contains `**/` and closes the comment
  ([[project_markdown_emphasis_closes_jsdoc]]) — write sub-rule labels without bold in code comments.
- **TR10 — ⛔ fabricate the un-attested.** ⛔ Sign-off rows in `operational-readiness-ledger.md`, ⛔ "table-top run", ⛔ counsel return,
  ⛔ `submitted` on Row 18 ([[feedback_record_unattested_no_backfill]]).
- **TR11 — ⛔ "counsel is not engaged".** Write "counsel has not been asked about breach reporting / DPO / SDF" (G10).
- **TR12 — Free text can still hold PII.** The UI hint (N4) is guidance, ⛔ a control; the detail read is audited (DL10). ⛔ Add a member-id
  lookup that would render a name into the breach page.
- **TR13 — Copy honesty.** The `signoff_recorded` form says "Record that trustees signed" — ⛔ "Sign". The members-on-record panel says
  "Members on record", ⛔ "data principals".
- **TR14 — Admin mutate callbacks.** Per-row actions use per-call `mutateAsync` ([[project_tanstack_mutate_callbacks_latest_only]]); a
  refetch can rejoin a hung fetch ([[project_tanstack_refetch_rejoins_hung_fetch]]).
- **TR15 — Microcopy gate.** `microcopy.yaml` scans `apps/admin/src/**` (comments too) and maps `report → Sahyog Vivran` with ⛔
  `member_only` — "Board report" turns `ci:local` red until the per-file `allow` entries (AC13) exist. `\bURGENT\b` is a tone rule.
- **TR16 — The superuser hides grants.** The test DB connects as a superuser, so a missing `twt_service` GRANT passes every test and
  fails only in production — the regression spec pins the privilege sets (DL4).
- **TR17 — Numbers are contested.** 6.22, 6.39 and 13.2 reserve `-433` / Row 46 / `0195` / catalog 57 in their files; re-derive at each
  commit (NUMBERS block).

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
  `apps/admin/src/api/{client,hooks}.ts`, `openapi/v1.yaml` (emitted), `docs/runbooks/README.md`, `docs/knowledge-transfer/on-call-playbook.md`,
  `docs/launch-gate-inventory/inventory-roster.md`, `docs/legal-counsel-engagement/review-artifact-roster.md`, `docs/escrow/credential-inventory.md`,
  `prd.md` FR-99 + `epics.md` 14.3 (dated lines), `.decision-log.md`, `deferred-work.md`, `sprint-status.yaml`.
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

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-11-01 — v1.0 created by `bmad-create-story 14.3` (three read-only research passes: governance records, code substrate, DPDP law;
  pinned `3d6b46c5`). Ultimate context engine analysis completed — comprehensive developer guide created.
- 2026-11-01 — v1.1: checklist validation by one fresh-context verifier — 2 critical (the microcopy gate's `report` rule would turn
  `ci:local` red; ledger `2026-11-01b` already taken on `story/6-22-…` ⇒ `-11-01c`), 9 should-fix (peers reserve `-433` / Row 46 / `0195` /
  catalog 57 ⇒ placeholders; `twt_service` GRANTs; first-of-kind policy-less RLS declared; the append race ⇒ a domain module with a row
  lock + a concurrency spec; `clock_timestamp()` + `entry_seq` ordering; `-106` item 8's premise corrected; AC11 two-armed + `total`; named
  helpers — `formatIst`, `hasBreachManage`, `MemberLifecycleStateWire`, ids before audit, the `.viewed` write, `{ items }`, a signals route;
  hand-registered OpenAPI paths), ~12 low — ALL applied.
