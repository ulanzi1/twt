---
baseline_commit: 90535934
---

<!--
PINNED: `90535934` = `origin/main` (2026-11-21o, after `git fetch origin`). The story lives on branch
`story/12-5-module-lead-handoff-transport-partners-as-downstream-consumers-invariant` in its OWN worktree
(`.claude/worktrees/12-5-module-lead-handoff-transport-partners-as-downstream-consumers-invariant`), created from
`origin/main`. Every `apps/` / `packages/` / `scripts/` claim below was traced at the pin on 2026-11-21. Perishable —
re-check at Task 0.1. Re-locate by FUNCTION, ⛔ by line.

STATUS: ready-for-dev (2026-11-21 — v1.0, created by `bmad-create-story 12.5`). ⭐ **Task 0 runs FIRST in
`bmad-dev-story`.** The build decisions QE1–QE20 carry SIX real asks (QE2, QE3, QE5, QE6, QE8, QE11). BigDev answers them
at Task 0.2, and the author-commit lands ALONE at Task 0.3 BEFORE any code
([[feedback_governance_commits_precede_implementation]]). If an ASK is answered with a non-recommended option, Task 0.3
first rewrites the dependent ACs / Tasks / Invariants (the map is in Task 0.3).
⭐ **The Panel note and the counsel question (Task 0.5) are WRITTEN, ⛔ SENT, by this story. ⛔ NEITHER blocks the build
— both block GO-LIVE** through the new roster row (Task 0.6). Nothing reaches a partner or a member from 12.5 alone (I1).

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (used ONLY in this header comment, the rulings and §0 tables,
and the G / QE prose) · ⭐ = action / emphasis · ⚠ = hazard. ⭐ In Policy meaning, ACs, Invariants, Tasks, Dev Notes and
Traps, negations are written in PLAIN WORDS ("No …", "Do NOT …", "is NOT …"), so a skim cannot invert them.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. They are
newest-first files, so cite the decision id + clause, the item heading, or the row key. Line numbers into other files
are perishable hints.

NUMBERS — read 2026-11-21 across every ref and the three live sibling worktrees (`3-13-…`, `6-22b-…`, `6-39a-…`; incl.
  uncommitted files), and RE-READ at the end of create-story (two siblings committed DURING it). Rule (`-366`
decision 6): "the number belongs to the first COMMIT".
- Decisions: `main` stops at `-476`. `story/6-22b-…` has COMMITTED `-477`–`-480` (`-480` landed DURING this
  create-story) ⇒ this story takes **≥ `-481`** and re-greps at the commit that takes it.
- Migrations: highest on every ref `0212_claim-membership-checks` (journal `when` `1797998520000`). `story/6-22b-…`
  RESERVES `0213` in prose (its Task 1.1, ⛔ committed) ⇒ this story takes the next TWO free numbers at its commit
  (⚠ two files — QE2: `ALTER TYPE … ADD VALUE` needs its own) — `0213` + `0214` if 6.22b has not committed first, else
  `0214` + `0215`. Each `when` must exceed every sibling's ([[project_sibling_migration_when_order_shared_db]]). The file
  names below use `NNNN` / `NNNN+1`.
- ADRs: highest `ADR-0045` ⇒ this story writes **≥ `ADR-0046`** (QE19).
- RBAC: this story adds NO key, NO role (I7). Read `PERMISSION_CATALOG_VERSION` live at Task 0.1 only to record it.
- Ledger: `main` top `2026-11-21o`; `story/6-22b-…` committed `p`, `q`, `r`; `story/3-13-…` committed `s` (DURING this
  create-story) ⇒ this story's first entry is **`2026-11-21t`** (re-grep at every entry; relabel if taken).
- Roster: highest `Row 53` (14.3) ⇒ this story appends **≥ `Row 54`** (Task 0.6).
⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each.

LETTERS: G = found facts · QE = build decisions (ASK = BigDev answers at Task 0.2) · I = invariants · TR = traps ·
C = carried to a sibling story · PQ = questions for the Panel / counsel (Task 0.5).
-->

# Story 12.5: Module Lead-Handoff Transport + Partners-as-Downstream-Consumers Invariant `[PRIMITIVE]`

Status: ready-for-dev

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

When a member registers interest in a partner offer (12.3's lead route, not built yet), this story's transport takes
that registered interest to the partner's system. The lead route records a **handoff** row in the same transaction
as `module.lead_submitted`. A per-minute jobs sweep then sends it to the module's `lead_handoff_url` as one signed HTTPS
POST. The body holds the member fields the member agreed to share, plus TWT's attribution header. The sweep retries a
transient failure with backoff and marks a permanent one `failed_delivery` for partner-relationship review.

Before every attempt the sweep re-checks four things, and if any fails it cancels instead of sending:
- the member's consent for that lead is still in force;
- the member has not left the Trust or been erased;
- the member's account is not frozen (a death claim);
- the address the partner's hostname resolves to is public.

The second half is the **boundary**. Partners are downstream consumers of explicitly consented leads, never a source
of truth for any member's lifecycle, validity, contribution or claim state. No inbound partner endpoint exists. A
partner's reply is stored only as a short advisory reference. A CI fence and an ADR keep it that way.

**Nothing reaches a partner or a member from 12.5 alone (I1).** The handoff command has no production caller until
12.3, and the governance that must come before any member field leaves (C6 / C8 from 12.1) is written here as a Panel
note and a counsel question. Both gate go-live, NOT the merge ([[project_not_in_production_merge_is_not_golive]]).

## ⭐ Names at a glance

| Thing | Name |
|---|---|
| Table (NEW) | `marketplace_lead_handoffs` / `marketplaceLeadHandoffs` (`packages/domain/src/schema/marketplace_lead_handoffs.ts`) |
| Consent type (NEW value, QE2) | `module_lead_handoff` on the `consent_type` pgEnum (+ the `@twt/contracts` `ConsentTypeSchema` lockstep) |
| Migrations (NEW, two) | `NNNN_consent-type-module-lead-handoff.sql` (the `ADD VALUE`, alone) · `NNNN+1_marketplace-lead-handoffs.sql` |
| Domain (NEW, `packages/domain/src/marketplace/`) | `lead-handoff.ts` (record / claim / settle / release / cancel / lapse / reads) · `lead-envelope.ts` (pure: the v1 body, the signature, the attribution header) · `lead-member-fields.ts` (the v1 allow-list schema + the Tier-1 field class) |
| Domain command (the 12.3 seam) | `recordLeadHandoff(client, { … })` — called by 12.3 in the SAME transaction as `submitModuleLead`; NO production caller in 12.5 |
| Egress client (NEW) | `apps/jobs/src/scheduler/partner-lead-client.ts` — `node:https`, pinned validated address, no redirects, port 443 only (QE8) |
| Sweep (NEW) | `apps/jobs/src/scheduler/module-lead-handoff.ts` (`runModuleLeadHandoffTick`, `registerModuleLeadHandoffCron`) · `QUEUE_NAMES.MODULE_LEAD_HANDOFF = 'module.lead_handoff'` |
| Audit actions | `module.lead_handoff_recorded` (by 12.3's caller), `module.lead_handoff_attempted` (one per send attempt, with the body's SHA-256), `module.lead_handoff_fields_decrypted` (the decrypt line, the 13.1b shape) |
| Headers sent | `X-TWT-Attribution: pariwar=<id>, module=<id>, lead_id=<uuid>` (epic AC, verbatim form) · `X-TWT-Signature: t=<unix>, v1=<hex>` (QE3 (A)) · `Idempotency-Key: <lead_id>` (QE6 (A)) · `Content-Type: application/json` |
| Boundary fence (NEW) | `scripts/partner-boundary-invariant/{check,lib,lib.test}.ts` · scripts `partner-boundary:{check,test}` |
| ADR (NEW) | `docs/adr/ADR-NNNN-partner-lead-handoff-transport.md` (≥ `ADR-0046`) |
| Decision | ≥ `2026-11-21-481` (re-grep) — author-commit of QE1–QE20 |
| Panel note (WRITTEN, not sent) | `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-12-5-partner-lead-data.md` |
| Counsel question (WRITTEN, not sent) | `_bmad-output/planning-artifacts/counsel-question-2026-11-21-12-5-partner-lead-transfer.md` |
| Roster | `Row NN` (≥ 54) — `partner-lead-handoff-live` |

## Story

As **Solo Builder authoring the lead-handoff transport that connects TWT members' consented interest to partner
systems**,
I want **a webhook-based transport with signed payloads + member-consented data + TWT attribution + idempotent
delivery**,
so that **partner systems receive valid leads with provenance, and partner integration boundaries are preserved.**

## 📜 Policy meaning (AI-10-1)

**This story introduces NO predicate that gates a member's access to a benefit.** A lead is NOT a benefit the Trust
owes (12.1 Policy meaning; 12.2's restatement). Who may REGISTER interest is 12.1's three lead rules plus 12.3's
server-side re-checks (C9). 12.5 does not touch them.

**It does introduce four predicates that decide whether a member's registered interest is PASSED ON to the partner**
(QE7). In a member's terms, in one sentence:

**"What you agreed to share is sent to the partner only while you still agree to it — if you withdraw that agreement,
leave the Trust, ask for your data to be erased, or your account is closed after a death claim before it is sent, it
is not sent."**

⚠ This sentence narrows only. Each predicate can stop a send, and none can cause one. A send that has already reached
the partner cannot be recalled (TR9). That limit is stated to the Panel and the counsel (PQ4).

**Checked against the Niyamavali** (the git-ignored copies in the MAIN checkout, by absolute path, 2026-11-21):
- `niyamavali.md` and `niyamavali.hi.md` are UNCHANGED since 2026-08-16 (file mtime). That is BEFORE 12.1's
  2026-10-31 grep, which found them SILENT on partners, modules and leads.
- Re-grepped `niyamavali.hi.md` for साझेदार|पार्टनर|विज्ञापन|बीमा|ऋण|मॉड्यूल. The only hits are §1.2 (बीमाकर्ता, "not an
  insurer") and two "not a debt" (ऋण) lines about contributions. None of them concerns partners.

**Result: SILENT.** No clause covers sharing a member's data with a partner. Part 10 ("explicit DPDPA consents …
consent registry") states the general posture that a consent is recorded and honoured. Nothing in 12.5 conflicts with
it: the transport refuses to send without a live, specific consent.

⚠ **The privacy policy is NOT silent, and that is the blocker.** §6 ("Who we share with") lists payment providers,
banks, KYC providers, cloud providers, trustees / admins / verifiers and authorities. **It does NOT list partners.**
The file is unchanged since 2026-07-21. §8 (retention) has no row for a lead. ⇒ C6 and C8 (a) are still open, and
they are the Panel's and counsel's (§0 edge 1). They are routed at Task 0.5 and gate go-live (Row NN).

(The Niyamavali is a rulebook, NOT a ratified spec — [[feedback_niyamavali_rulebook_not_spec]].)

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Verbatim | Status |
|---|---|---|
| epics.md Story 12.5 AC | "signed payload (HMAC-SHA-256 with module's signing key from Secret Manager), member-consented data only (consent-checked via Story 2.7 at the moment of handoff — revocation between submission and handoff cancels the delivery), TWT attribution header (`X-TWT-Attribution: pariwar=<id>, module=<id>, lead_id=<uuid>`)" · "idempotent via Story 1.12 keyed store (key = `lead_id`); retries on transient failure with exp backoff; permanent failure flagged for partner-relationship review" · "every handoff is audit-logged via Story 1.10 with full payload reference + delivery status" | epic text |
| epics.md Story 12.5 AC (boundary) | "partner integrations **consume explicitly consented lead-handoff events only** and **must NOT become authoritative sources of member lifecycle, validity, contribution, or claim-state truth**" · "(a) partner webhooks are **outbound only** … (b) any partner-provided data … is treated as **advisory information**, never authoritative; (c) partner integrations cannot register inbound APIs that update member lifecycle state, validity status, contribution status, or claim state" | epic text |
| architecture §3.7 | "partner authentication via signed JWT (asymmetric — partner holds TWT's public key for verification)." · "TWT API generates a signed-JWT lead envelope (member-attributed, scope-redacted to partner-allowed fields per FR-66 wizard) → POSTs to the partner endpoint." · "lead status is `delivered \| pending_retry \| failed_delivery`" · "TWT lead JWT carries a nonce; partner is contractually expected to dedupe by nonce." · "Circuit breaker per partner endpoint" · "Per-partner outbound concurrency limit" | architecture — ⚠ C7: conflicts with the epic AC (QE3) |
| architecture "Replayable outbound dispatch" | "Outbound dispatch (push, WhatsApp, Telegram, partner) stores **message intent** — the canonical request: target, payload, channel, timestamp, attempt counter — not just the provider's send-result." | architecture |
| architecture §3.12 | "every external call has timeout + breaker + retry policy declared at the integration boundary." | architecture |
| architecture §5.9 | "**Partner JWT signing keys:** rotated per partner contract terms" · "**Webhook signing secrets:** rotated on a committed cadence; rotation coordinated with provider via dual-secret window." | architecture |
| PRD review M-8 | "Each module enrollment is a controller-to-controller PII transfer under DPDPA. … the **partner's downstream processing** (HDFC, LIC) is the trust's joint-liability surface and is not enumerated." | review finding |
| Privacy policy §6 (`docs/legal/privacy-policy.md`, main checkout) | "We share personal data only as needed, with:" — payment/UPI providers and banks; KYC providers; cloud and infrastructure providers; trustees, admins and verifiers; authorities. | ⚠ partners ABSENT — C6 |
| Decision `2026-10-31-427` / `-429` (12.1) | C6: "partner data has no basis on record — route it to Panel / counsel BEFORE anything leaves." · C7: "the signing scheme (HMAC per module vs JWT per partner), plus a send-time check of the resolved address (SSRF / DNS rebinding)." · C8: "an RTBF can never remove a member↔offer link … (c) Lead PII belongs in 12.5's entity, which erasure IS able to reach." · I11: "A `module.lead_submitted` event's actor is `member`" | author-commit |
| Decision `2026-11-01-433` (12.2) QE11 | "The secret NAME is validated for shape only … → 12.5: check existence / resolution at send." | author-commit |
| Decision `2026-08-21-147` cl.3 (Trustee-ratified) | "Any future change that introduces a new **source/reason** for account-frozen must re-examine the directory exclusion predicate and the ratified member-facing sentence" | ⛔ engaged — 12.5 READS the overlay and adds no source (I6) |
| Decision `2026-09-08-210` cl.2 (Trustee-ratified) | NOT delegated: "anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key · … · ⛔ any status whose meaning reaches a **member**." | QE2 — the consent value is recorded in the author-commit, ⛔ as a `-210` mint |
| `consent_records.ts` header | "New consent types (e.g. `whatsapp_opt_in` Epic 5, `module_lead_handoff` Epic 12) are added by the epic that FIRST WRITES them … Do NOT seed types for surfaces that do not exist yet." | house convention — QE2 departs from it, recorded |

### §0 — whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` §0, per edge)

| # | Edge | Verdict |
|---|---|---|
| 1 | Sending a member's data to a partner at all, which fields, and how long the Trust keeps the record that the member asked (C6, C8 (a)) | **The Panel's, on counsel's advice** — "a LEGAL or consent BASIS for handling someone's data" and "what the Trust DISCLOSES about a person, or to whom". ⛔ 12.5 decides it. 12.5 BUILDS on the narrow side (a closed four-field allow-list, QE5) and ROUTES it (PQ1–PQ4, Task 0.5); go-live waits (Row NN). |
| 2 | The signing scheme (C7) | **Yours** — "which implementation is correct, faster, or safer". Stripped: "should the partner check TWT's signature with a shared secret or a public key?" No person sees or is owed anything different. ASK (QE3) because the epic and the architecture disagree. |
| 3 | At-least-once vs at-most-once delivery | **Yours, with a stated member cost** — a duplicate could mean the partner contacts a member twice. ASK (QE6). |
| 4 | The four cancel predicates (Policy meaning) | **Yours** — each one only NARROWS what leaves (fail-closed), so none of them is "what the Trust discloses". The Panel is TOLD of them in the note as "built on the narrow side", NOT asked ([[feedback_told_line_must_not_carry_panel_choice]] — the told line carries no choice). |
| 5 | The new `module_lead_handoff` consent VALUE | **Yours, recorded** — a code name with no writer and no copy in 12.5. The consent TEXT and its basis are edge 1 (the Panel's). Not a `-210` mint (a consent reaches a member), so it is recorded in the author-commit (QE2). |
| 6 | Port and address policy at send (C7) | **Yours** — SSRF hardening. ASK (QE8) only because a refusal at send can strand an immutable manifest (C10). |
| 7 | What a partner may send BACK, and what TWT does with it | **Yours, as an invariant the epic already fixes** — "advisory, never authoritative". 12.5 builds NO inbound path. The first inbound feedback path (lead outcome) re-opens §0 at its own create-story (C-5). |
| 8 | The commission-disclosure question (12.2 QE6) | **⛔ 12.5's trigger** — its re-trigger is "OQ-4 answered / the first production publish / Story 12.3's create-story". 12.5 shows no offer to a member. Unchanged. |

## FOUND FACTS (G) — traced at `90535934`, 2026-11-21

- **G1 — The lead today ends at an event.** `submitModuleLead` (`marketplace/commands.ts`) appends `module.lead_submitted`
  with `{ lead_id, member_id, slots_remaining_after, from_state, to_state, trigger, actor }`, `.strict()`, NO PII (12.1
  I9). The caller mints `leadId` and runs it inside `withCompensatingAudit` (12.1 QE15). It has NO production caller.
  12.3 (the shelf and the lead route) is `backlog`. ⇒ 12.5 is a PRIMITIVE built ahead of its caller, exactly as 12.3's
  AC expects ("submission emits `module.lead-submitted` event consuming Story 12.5 transport").
- **G2 — Nothing can subscribe to `events_log`.** The house shape for "do something external after an event" is an
  OUTBOX ROW written in the SAME transaction as the event, plus a jobs sweep. Twins:
  - `field_worker_code_sms_sends` (0202, Story 13.1b, `-450`) — one row per worker; `activateFieldWorker` writes it in
    the approval's transaction. The sweep is `apps/jobs/src/scheduler/field-worker-code-sms.ts`.
  - `claim_suspicion_staff_emails` (0152–0154, Story 6.25) — the held / parked / `aging_since` lessons
    ([[project_staff_email_substrate]]).

  The 13.1b sweep's order is: the Row 26 guard first; lapse expired leases; claim ONE row at a time (committed); read
  in one scope transaction; ONE audit line written first with the decrypt as its `mutate`; send with NO connection
  held; settle or release. It orders the claim by `updated_at`, NEVER `created_at`
  ([[project_field_worker_code_sms_substrate]]).
- **G3 — Where the endpoint and key live.** `marketplace_modules.lead_handoff_url` and
  `lead_handoff_signing_key_secret_name` are NOT NULL, immutable after `module.authored` (whole-row trigger, 12.1 I2;
  ADR-0044). The URL rule (12.1 QE5, as amended by review): `https:` only; canonical form (`raw === new URL(raw).href`);
  RFC 3986 characters only; no `@`, no userinfo, no query, no fragment; host neither an IP literal nor `localhost`;
  length ≤ 2048; **any explicit port accepted** (12.1 R3-6 — "whether it is acceptable is 12.5's send-time question").
  The secret NAME matches `^[A-Za-z0-9_-]{1,255}$`; 12.2 validates its shape only (QE11).
  `marketplace_partners` (12.2) carries names only — NO endpoint, NO key, NO contract version.
- **G4 — Secret resolution.** `resolveSecretValue(secretName, { envFallback })` (`domain/src/secrets.ts`):
  - It reads `projects/<GOOGLE_CLOUD_PROJECT>/secrets/<name>/versions/latest` under ADC, with a 10 s timeout.
  - Locally it reads the named env var.
  - It throws on a missing secret, and its message names the secret but never the value.

  Every current caller resolves a FIXED name at boot (`apps/api/src/deps.ts`). **No caller resolves a per-ROW secret
  name at send time.** 12.5 is the first, so a missing secret becomes a per-row outcome, NOT a boot failure (QE9).
- **G5 — Consent.** `consent_records` (Story 2.7) — one row per grant; revoke sets `revoked_at` and is NEVER a delete.
  - `consentExists(db, pariwarId, subjectId, consentType, validAt?)` is per SUBJECT + TYPE and ignores
    `consent_artifact_ref`.
  - `resolveConsentById(db, pariwarId, consentId)` returns the row regardless of revocation.
  - The `consent_type` pgEnum has 13 values and **NO `module_lead_handoff`**. The header reserves that name for "Epic
    12" and says types are added "by the epic that FIRST WRITES them".
  - Each `ADD VALUE` is its own migration file (`0048`, `0124`: `ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS …`).
    It cannot run in a transaction, nor be used in the transaction that adds it.
  - LOCKSTEP: `packages/contracts/src/consent/consent-record.ts` `ConsentTypeSchema`, pinned by an equality test
    (contracts → domain is the legal direction).
  - Precedent for "read ONLY through the referencing column, never by subject": `claim_contact_agreement` (6.19a, `-261`
    C3).
- **G6 — Per-lead consent is the only reading that satisfies "revocation … cancels the delivery".** A per-subject check
  (`consentExists`) would let a member's consent on offer A keep offer B's lead alive, and would let a revoke of B be
  masked by A. ⇒ the handoff row carries the `consent_id` 12.3 records for THIS lead (QE2).
- **G7 — Idempotency.** The Story 1.12 keyed store (`idempotency/keyed-store.ts`: `claim` / `recordResult` /
  `getResult`, global `idempotency_keys`, TTL) serves REQUEST idempotency at the API door. A sweep that owns a row
  keyed by `lead_id` gets the same guarantee from the row's primary key and its status. The keyed store is NOT used by
  any jobs sweep today (13.1b and 6.25 key their outbox by PK / UNIQUE). ⇒ QE6 records the variance from the epic's
  "via Story 1.12 keyed store".
- **G8 — Outbound HTTP.** The sweeps use global `fetch` with `AbortSignal.timeout(…)`
  (`apps/jobs/src/scheduler/staff-email-client.ts`). `undici` is NOT a declared dependency in any `package.json`, so a
  custom `fetch` dispatcher (to pin a resolved address) would add a dependency. `node:https` `request` takes a `lookup`
  option and does NOT follow redirects, so it can pin the validated address with no new dependency (QE8). No SSRF or
  private-address guard exists in the repo; the only address rule is 12.1's write-time one (`marketplace/filters.ts`).
- **G9 — Tier-1 storage + audited decrypt.** Member mobile is Tier-1 ciphertext (`member_identities.mobile_ciphertext`).
  The house rule for a sweep that must read Tier-1 is 13.1b's: ONE audit line, written first, whose `mutate` is the
  decrypt and nothing else (a send failure inside it would write a false `_rolled_back`). Field classes and envelopes
  live in `packages/domain/src/encryption/` (`field-classes.ts`, `envelope.ts`, `member-fields.ts`). The KMS-audit-per-op
  cost is recorded ([[project_kms_audit_per_hmac_global_lock]]).
- **G10 — Erasure.** `member/anonymize.ts` scrubs every PII-bearing table "HERE, in the SAME transaction". Each table
  carries a column-level UPDATE grant and a per-command UPDATE policy AT BIRTH; under FORCE RLS a missing policy makes
  the scrub match 0 rows silently (`-279` A12). An append-only guard must name the scrubbed columns
  ([[project_append_only_guard_names_erasure_columns]]). The event stream is RETAINED, so the `module.lead_submitted`
  member↔offer link survives erasure (12.1 C8).
- **G11 — The overlay.** `getMemberAccountOverlay` (`member/overlay.ts`) freezes on `claim.intake_initiated` and lifts on
  `claim.settled` / `claim.denied_no_appeal` / `claim.closed`. It has zero production call sites (12.1 G11). A death is
  an overlay, NOT a `members.state` value ([[project_death_is_an_overlay_not_a_state]]). 12.4 (`backlog`) owns
  suppression on the shelf and the lead route (C4, C9).
- **G12 — The jobs login and Row 26.** Every cross-tenant sweep first checks `smsDelivery.canReadAcrossPariwars`.
  Under an RLS-bound login the claim would see no row and raise no error, so the sweep raises ONE `rls_bound_role`
  alarm and ends the tick (roster Row 26 `jobs-db-role`). 12.2's `apps/jobs/src/scheduler/module-activation.ts` is the
  marketplace twin, registered in `apps/jobs/src/boot.ts`. Its queue name is `QUEUE_NAMES.MODULE_ACTIVATION =
  'module.activation'` (`packages/queue/src/index.ts`). A sweep needs its OWN pool
  ([[project_jobs_pool_two_connection_starvation]]).
- **G13 — Audit.** `audit.withCompensatingAudit(servicePool, { auditIntent, mutate })`. Actions must match
  `/^[a-z0-9_]+(\.[a-z0-9_]+)+$/`. The 12.2 locators are `module/<id>`. Audit pairing is the CALLER's, and NO domain
  function calls the wrapper (12.1 QE15).
- **G14 — The data export.** `data-export/assemble.ts` lists consents by `consentType`. Its sections are strict-parsed
  ([[project_data_export_sections_strict_parsed]]): a new section key needs a contract. A new consent VALUE flows
  through the existing consents section unchanged. ⇒ 12.5 adds NO export section. The lead section is 12.3's (C8 (b)),
  carried.
- **G15 — No inbound partner path exists today.** `apps/api/src/modules/` has no `partner*` module. The architecture
  tree names `apps/api/.../partner/` ("JWT verification for partner endpoints") and `partner-leads/`; neither was built.
  `channel-webhooks/` is the WA / Telegram ingress (§3.11 persist + ack), NOT a partner path.
- **G16 — Migrations are hand-authored** (12.1 G13: `--> statement-breakpoint`; the journal is hand-added with a
  trailing newline; the snapshot is frozen at 0020, so NEVER run `db:generate`). `marketplace_modules` carries
  `marketplace_modules_pariwar_module_unique (pariwar_id, module_id)` (12.2), the target for a COMPOSITE FK (an FK check
  ignores RLS, so a single-column FK would let a row name another Pariwar's module — the 12.2 partner-FK lesson).

## ⚖️ Build decisions QE1–QE20 (ASK = BigDev answers at Task 0.2; the rest are recommendations BigDev may accept as a set)

- **QE1 — Home.** Domain: `packages/domain/src/marketplace/lead-handoff.ts`, `lead-envelope.ts`, `lead-member-fields.ts`,
  re-exported through the existing `marketplace` namespace barrel. Schema: `schema/marketplace_lead_handoffs.ts`; RLS:
  `policies/marketplace-lead-handoffs-rls.ts`. Jobs: `apps/jobs/src/scheduler/module-lead-handoff.ts` +
  `partner-lead-client.ts`. ⛔ API route (12.3 calls `recordLeadHandoff` from its own handler), ⛔ contracts (no route),
  ⛔ admin UI (C-3).

- **QE2 — ASK — per-lead consent, and who mints the value.**
  - **(A, recommended)** 12.5 mints `module_lead_handoff` (migration `NNNN`, alone; the contracts lockstep). The handoff
    row stores the `consent_id` 12.3 records for THAT lead (`consent_artifact_ref = lead_id`). At every attempt the sweep
    reads it through that column, NEVER by subject (G5, G6). It must be `module_lead_handoff`, in the same Pariwar, with
    `subject_id = member_id` and `revoked_at IS NULL`.
    Cost: it departs from the header's "the epic that FIRST WRITES them". 12.5 never writes one, and its tests write the
    value directly. Recorded in the author-commit and as a dated line in the `consent_records.ts` header.
  - (B) 12.3 mints the value. Then 12.5 cannot type-check or test its consent leg, and must ship the leg behind a
    string. Cost: the one AC the epic makes load-bearing ("revocation … cancels") lands untested until 12.3.
  - (C) A per-subject `consentExists`. Cost: G6 — one consent covers every offer, so a revoke on one offer can be masked
    by another.

- **QE3 — ASK — the signing scheme (C7).**
  - **(A, recommended)** HMAC-SHA-256 with the module's secret, the epic's wording. Header `X-TWT-Signature: t=<unix
    seconds>, v1=<hex>` over the exact bytes `"<t>." + body`. Constant-time compare on the partner side is in the ADR's
    receiver guide. The `t` gives replay protection (the receiver guide says to refuse `|now − t| > 5 min`). The secret
    is 12.1's per-module NAME, so ⛔ schema change and ⛔ C10 relaxation. Several modules of one partner may name the same
    secret, which in practice is per partner.
    **Rotation:** a NEW Secret Manager VERSION under the same name. Within the dual-secret window the sweep signs with
    both `latest` and the previous enabled version (`v1=<a>, v1=<b>`), per §5.9 "dual-secret window"; one version means
    one signature.
    Cost: (i) NO non-repudiation — the partner holds the key, so a signature cannot prove in a dispute that TWT sent a
    lead; the evidence is TWT's own handoff row + audit line + the partner's 2xx. (ii) It supersedes architecture
    §3.7's "signed JWT (asymmetric …)" and §5.9's "Partner JWT signing keys". These are recorded in the author-commit,
    and Task 0.4 annotates both architecture sentences in place ("superseded for the lead transport by `-NNN` QE3"),
    NEVER rewriting them ([[feedback_supersede_never_reinterpret]]). (iii) The secret must reach the partner over a
    secure channel at onboarding (an ops step, roster leg).
  - (B) Asymmetric, the architecture's wording: an Ed25519 JWS (`alg: EdDSA`), the private key in Secret Manager, the
    partner holding the public key, with `jti` = `lead_id` as §3.7's nonce. Cost: a way to give the partner the public
    key (an admin read of it, or an ops export — new scope); a per-PARTNER key would move the key to
    `marketplace_partners`, which is C10's NOT NULL relaxation (a migration on an immutable table's trigger chain).
    Gain: non-repudiation, no shared secret.
  - (C) Both, chosen per module. Cost: two code paths and a manifest field. Recorded only as considered.

- **QE4 — The handoff row (`marketplace_lead_handoffs`).** One row per lead; the outbox and the delivery record in one.

  | Column | Type | Rule |
  |---|---|---|
  | `lead_id` | uuid PK, ⛔ default | = the `module.lead_submitted` payload's `lead_id` (caller-minted, lower-case) |
  | `pariwar_id` | uuid NOT NULL, ⛔ FK | tenant key (⛔ `pariwars` table) |
  | `module_id` | uuid NOT NULL | COMPOSITE FK `(pariwar_id, module_id)` → `marketplace_modules_pariwar_module_unique` (G16) |
  | `member_id` | uuid NOT NULL | the lead's member (= the event's `member_id`, = its `actor_id`, 12.1 I11); FK per the house members-FK precedent — re-check at Task 0.1 |
  | `consent_id` | uuid NOT NULL | FK `consent_records(consent_id)`; QE2 |
  | `envelope_version` | smallint NOT NULL | `CHECK (envelope_version = 1)` |
  | `member_fields_ciphertext` | text NULL | ONE Tier-1 envelope of the QE5 object (QE11); NULL only after an erasure scrub |
  | `status` | text NOT NULL | `due \| attempting \| delivered \| failed_delivery \| cancelled` — a named CHECK, LOCKSTEP with a domain tuple |
  | `outcome_detail` | text NULL | a FIXED vocabulary (QE10), a named CHECK on its grammar; ⛔ free text, ⛔ an error message, ⛔ a response body |
  | `attempt_count` | integer NOT NULL default 0 | `CHECK (attempt_count >= 0)` |
  | `next_attempt_at` | timestamptz NOT NULL default `now()` | the backoff (QE6) |
  | `claimed_at` | timestamptz NULL | the lease start (`attempting` only — a pair CHECK) |
  | `partner_reference` | text NULL | ADVISORY (I3): from a response header only, `^[A-Za-z0-9_.-]{1,64}$`, else NULL |
  | `delivered_at` | timestamptz NULL | pair CHECK with `status = 'delivered'` |
  | `audit_id` | uuid NOT NULL, ⛔ FK | the caller's `module.lead_handoff_recorded` intent line |
  | `created_at` / `updated_at` | timestamptz NOT NULL default `now()` | `updated_at` set on every write |

  Indexes: `marketplace_lead_handoffs_due_idx (next_attempt_at, updated_at) WHERE status = 'due'` (the cross-tenant
  claim); `marketplace_lead_handoffs_attempting_idx (claimed_at) WHERE status = 'attempting'` (the lapse);
  `(pariwar_id, module_id)`; `(pariwar_id, member_id)` (erasure + 12.3's status read).
  **The guard trigger** (`BEFORE UPDATE OR DELETE`):
  - DELETE is refused.
  - `lead_id`, `pariwar_id`, `module_id`, `member_id`, `consent_id`, `envelope_version`, `audit_id` and `created_at`
    are immutable.
  - A FINAL row (`delivered` / `failed_delivery` / `cancelled`) admits only the erasure arm: `member_fields_ciphertext`
    → NULL, with `updated_at` (the `to_jsonb(NEW) - '<cols>'` shape, 0189 / 0156).
  - `status` moves only along QE6's edges.

  GRANTs: `twt_app` SELECT, INSERT, UPDATE (the mutable columns only; ⛔ DELETE). FORCE RLS with per-command policies,
  and an UPDATE policy AT BIRTH so erasure matches rows (G10).

- **QE5 — ASK — the v1 member-field allow-list (what 12.5 BUILDS; the Panel rules what may be USED — PQ2).**
  `LeadMemberFieldsV1 = { version: 1, full_name: string(1–120, storableText), mobile: E.164 India (+91 then 10 digits,
  the house mobile grammar), district: string(1–120) | null, preferred_language: 'hi' | 'en' }`, `.strict()`.
  - **(A, recommended)** These four and nothing else, the same for every partner. NO DOB or age, NO Aadhaar / PAN, NO
    membership state, NO contribution or claim data, NO nominee, NO workplace beyond the district, NO health data (a
    health-camp lead carries none — C8 (a)'s concern), NO free text.
    Cost: (i) the PRD's "school, designation — pre-filled" (UJ-10) is NOT carried; (ii) a partner needing more fields
    needs a new envelope version AND a Panel ruling; (iii) a partner needing FEWER fields still receives all four — a
    per-module allow-list ("scope-redacted to partner-allowed fields per FR-66 wizard") is carried (C-4), because the
    manifest is immutable and a new manifest column means a trigger-chain change (12.1 C12).
  - (B) Name + mobile only. Cost: a partner cannot route by district; offers in Bihar are district-run.
  - (C) Per-module field choice now. Cost: a 12.2 wizard change plus a manifest column plus the trigger chain — story
    sized, outside a PRIMITIVE.
  ⭐ Whatever is chosen, the PANEL's ruling (PQ2) may only NARROW the built set without code. A widening is a new
  version and a new story.

- **QE6 — ASK — the delivery semantics.**
  - **(A, recommended)** AT LEAST ONCE, deduplicated by the partner on `Idempotency-Key: <lead_id>` (§3.7's "partner is
    contractually expected to dedupe by nonce"). A timeout or a dropped connection after the request was written is a
    TRANSIENT outcome and IS retried. This is the variance from 13.1b's at-most-once, because a lost lead is a member's
    registered interest silently dropped, while a duplicate is caught by the key.
    Retry schedule after attempt k (k = 1…6): +1 min, +5 min, +30 min, +2 h, +6 h, +24 h. After the 7th attempt fails
    transiently → `failed_delivery:retries_exhausted` (≈ 33 h). A 4xx other than 408 / 429 is permanent at once
    (`failed_delivery:http_4xx:<code>`). The schedule is a named constant tuple, NEVER inline numbers.
    Cost: if the partner does NOT dedupe (no contract clause yet — roster leg), a member may be contacted twice after a
    timeout.
  - (B) At most once (13.1b). Cost: every timeout ends as `failed_delivery:outcome_unknown`; a partner outage of minutes
    loses leads for good, with no retry.
  - **The 1.12 keyed store is NOT used** (G7). The row's PK + status is the idempotency key, and the partner-side key
    is `lead_id`. The epic's "via Story 1.12 keyed store" is satisfied in substance and recorded as a variance.
  - Status edges: `due → attempting → (delivered | failed_delivery | due [release] | cancelled)`, `due → cancelled`
    (erasure). A lapsed `attempting` (crash, lease 5 min) → `due` with the attempt COUNTED (it may have sent — at least
    once). Nothing leaves a final state.
  - **Member-facing status** (architecture §3.7, derived for 12.3, never stored): `due` / `attempting` →
    `pending_retry`; `delivered` → `delivered`; `failed_delivery` → `failed_delivery`; `cancelled` → NOT shown as a
    delivery status (12.3 decides its words; C-1).

- **QE7 — The four cancel predicates (§0 edge 4; Policy meaning).** Checked IN THIS ORDER in the scope transaction
  before EVERY attempt, each stopping at the first failure. A cancel is final, and NO audit decrypt happens.
  1. **Consent:** the QE2 row is still `module_lead_handoff`, same Pariwar and subject, `revoked_at IS NULL`. Otherwise
     → `cancelled:consent_revoked`.
  2. **Erased:** `member_fields_ciphertext IS NULL`, or the member is `anonymized` → `cancelled:member_erased`.
  3. **Left:** the member is `withdrawn` → `cancelled:member_withdrawn`.
  4. **Frozen:** `getMemberAccountOverlay` says `account-frozen` → `cancelled:account_frozen`. This is the overlay's
     FIRST production read. It adds NO freeze source (I6), so `-147` cl.3 is NOT engaged. A lift does NOT revive a
     cancelled row: final means final, and the member registers again through 12.3.

  ⚠ **The module's state is NOT a predicate.** A lead registered while the offer was open is delivered even if the
  module was archived since. The partner agreed to receive it, and cancelling it would silently drop a member's
  registered interest. 12.6's archive therefore does NOT cancel handoffs (C-2).

- **QE8 — ASK — the send-time address and port policy (C7: SSRF / DNS rebinding).** In `partner-lead-client.ts`:
  - **(A, recommended)** Re-parse the stored URL and require the same 12.1 rules (defence in depth). **Port: only the
    default (none written) or `443`.** Any other explicit port → `failed_delivery:port_refused`, permanent, with NO
    request made.
    Resolve the host with `dns.lookup(host, { all: true, verbatim: true })`. Refuse the WHOLE send if ANY returned
    address is non-public:
    - IPv4: 0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.0.2/24, 192.88.99/24, 192.168/16,
      198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4, 255.255.255.255.
    - IPv6: ::/128, ::1, ::ffff:0:0/96 (judged as the mapped v4), 64:ff9b::/96, 100::/64, 2001::/23, 2001:db8::/32,
      fc00::/7, fe80::/10, ff00::/8.

    A refusal → `failed_delivery:address_refused`, permanent. Connect with `https.request({ host: <the validated
    address>, servername: <hostname>, headers: { host: <hostname> }, lookup: <returns only the validated address> })`,
    so the connection goes to the address that was checked (closing DNS rebinding). Also: TLS verification ON (the
    default), NO redirects (a 3xx is `failed_delivery:http_3xx:<code>`), a 10 s total timeout, and a 64 KiB response
    read cap (excess is discarded; the body is never parsed).
    Cost: a partner on `:8443` cannot receive leads, and the manifest is immutable, so the fix is re-authoring (C10).
    12.2's wizard does NOT yet refuse such a port at author time (C-6, carried).
  - (B) Any port above 1023 as well. Cost: widens the reachable surface to arbitrary service ports on public hosts.
  - The table lives in ONE exported constant with a unit test per range and per mapped / unmapped form.

- **QE9 — Secret resolution at send (12.2 QE11).**
  - Resolve per row through `resolveSecretValue(name, { envFallback: undefined })`. In tests, inject a resolver (the
    `apps/api/src/context.ts` fake-secret precedent).
  - Cache per tick and per name; NEVER across ticks, so a rotation is seen within one tick.
  - A resolution failure is a DEFINITE not-sent: release to `due`, with the attempt NOT counted and the detail
    `held:signing_key_unavailable`, and end that module's rows for this tick. After 24 h of only such holds →
    `failed_delivery:signing_key_unavailable` (judged by `created_at`, the field-worker max-age shape).
  - Never log, alarm or throw the name's VALUE. The NAME may appear in an alarm (it is a pointer, 12.2).

- **QE10 — The detail vocabulary (`outcome_detail`).** Closed and grammar-checked (a named CHECK + a domain tuple):
  `delivered:http_2xx:<3 digits>` · `released:http_5xx:<code>` · `released:http_408` · `released:http_429` ·
  `released:timeout` · `released:network` · `held:signing_key_unavailable` · `held:circuit_open` ·
  `failed_delivery:http_4xx:<code>` · `failed_delivery:http_3xx:<code>` · `failed_delivery:address_refused` ·
  `failed_delivery:port_refused` · `failed_delivery:url_refused` · `failed_delivery:retries_exhausted` ·
  `failed_delivery:signing_key_unavailable` · `cancelled:consent_revoked` · `cancelled:member_erased` ·
  `cancelled:member_withdrawn` · `cancelled:account_frozen` · `lapsed:lease_expired`.
  NEVER an error message, a body, a header value, a hostname, an IP or a secret name.

- **QE11 — ASK — how the member fields are stored.**
  - **(A, recommended)** ONE Tier-1 envelope (`member_fields_ciphertext`) of the canonical JSON of `LeadMemberFieldsV1`,
    encrypted by `recordLeadHandoff` in the request path (12.3's handler passes the encryption deps). The sweep decrypts
    it inside ONE audit line (`module.lead_handoff_fields_decrypted`) per attempt, the 13.1b shape (G9).
    Cost: one KMS encrypt per lead plus one decrypt per ATTEMPT (≤ 7), each audited.
  - (B) Store nothing and re-read the member's fields at send. Cost: the partner would get what the member's record
    says at SEND time, NOT what the member CONFIRMED on the form, which breaks "member-consented data only".
  - (C) Store in clear. Cost: refused by the house PII posture (mobile is Tier-1); listed only to be refused.

- **QE12 — The body (`LeadEnvelopeV1`, canonical JSON via `canonicalJsonStringify`).**
  `{ envelope_version: 1, lead_id, module_id, pariwar_id, partner_id, submitted_at (the row's `created_at`, ISO UTC — the
  row is written in the event's own transaction, so it equals the event's `occurred_at` (TR10) and the sweep never
  reads `events_log`),
  member: <LeadMemberFieldsV1 minus version>, attribution: { source: 'twt', pariwar_id, module_id, lead_id } }`.
  - NO `member_id` (an internal id is NOT a partner's business; `lead_id` is the join key).
  - NO module text, NO commission terms, NO consent text.
  - The signature covers these exact bytes, and the audit line records `sha256(body)` as "the full payload reference"
    (epic AC), NEVER the body.
  - **Versioned per envelope**, and the partner contract names the version (architecture §3.7 "versioned
    per-partner": the envelope version IS the contract version in v1; a per-partner contract record is carried, C-4).

- **QE13 — Concurrency, breaker, fairness (§3.7 / §3.12).**
  - The sweep is single-flight (`localConcurrency: 1`, its own `pg.Pool` with `max: 3`).
  - It claims ONE row at a time with `FOR UPDATE SKIP LOCKED` in a MATERIALIZED CTE (NEVER an `IN (subquery LIMIT)` —
    [[project_in_subquery_limit_skip_locked_overclaim]]), ordered `next_attempt_at, updated_at`, up to
    `MODULE_LEAD_HANDOFF_TICK_MAX = 20`.
  - **Breaker (per tick, per URL origin):** after a transient failure to origin O, every other due row for O this tick
    is released with `held:circuit_open`, the attempt NOT counted and `next_attempt_at = now() + 1 min`. So one flaky
    partner costs at most ONE request per tick and cannot starve the others. The cost is recorded: NO cross-tick breaker
    state and NO open-circuit admin view (C-3).
  - Per-partner concurrency is 1 by construction (a single-flight sweep).

- **QE14 — Audit (G13).**
  - (a) **12.3's caller** wraps `submitModuleLead` + `recordConsent` + `recordLeadHandoff` in its own audit intents.
    12.5 documents that `recordLeadHandoff` takes the `auditId` of a `module.lead_handoff_recorded` intent line.
  - (b) **Per attempt**, the sweep writes ONE `module.lead_handoff_fields_decrypted` line whose `mutate` is the decrypt
    and nothing else.
  - (c) **After the send**, it writes ONE `module.lead_handoff_attempted` line (outside any wrapper, the settle's own
    transaction) carrying `{ lead_id, module_id, attempt, outcome_detail, body_sha256 }`.
  - Locator `module_lead/<lead_id>`. NEVER a member field or the URL.

- **QE15 — The boundary, enforced (epic AC 2; I3, I4).**
  - (a) **No inbound path.** A fence asserts that `apps/api` registers NO route whose path matches
    `/partner|lead-outcome|lead_outcome|module-lead/i` with a body-accepting method (POST / PUT / PATCH / DELETE). It
    enumerates the Fastify route table in a unit test (`app.printRoutes` or the `onRoute` hook), NOT a grep, so a path
    built at runtime is seen.
  - (b) **Advisory only.** Only `marketplace/lead-handoff.ts` and the sweep may read or write `partner_reference`. The
    fence is an AST scan over `packages/domain/src`, `apps/api/src` and `apps/jobs/src` for the column's TS name.
  - (c) **No authority import.** `lead-handoff.ts`, `lead-envelope.ts` and the two jobs files may NOT import a WRITE
    entry point of `member/`, `contribution/`, `claim/`, `pool/` or `validity-cache/` (an import-graph scan). They MAY
    import the named reads: the member state, the overlay and `consent.resolveConsentById`.
  - (d) The response body is NEVER parsed; only the status code and one header (`X-Partner-Reference`) are read.
  - ⚠ The fence's SEMANTIC limit is stated in its README: it proves the absence of the patterns it names, NOT that no
    future code path could launder partner data ([[feedback_gate_scope_semantic_coverage]]). The ADR names the review
    question every future inbound integration must answer.

- **QE16 — The erasure arm.**
  - `member/anonymize.ts` gains ONE step in the same transaction: for the member's handoff rows, set
    `member_fields_ciphertext = NULL`, and any row still `due` → `cancelled` with `cancelled:member_erased`. An
    `attempting` row keeps its status; the sweep's predicate 2 cancels it at settle, or the send already happened
    (TR9).
  - The table's UPDATE grant, its UPDATE policy and its guard's erasure arm exist AT BIRTH (G10).
  - A live-DB leg scrubs a row in each status.

- **QE17 — No production caller, and the cron.** `recordLeadHandoff` has NO production caller (I1; grep in Completion
  Notes). The sweep IS registered in `boot.ts` (the 12.2 activation precedent). With no rows it claims nothing. Its
  go-live (the jobs login grant, Row 26; the secrets; the egress) is Row NN's.

- **QE18 — What 12.3 must do (the seam, written into C-1).**
  - In ONE READ COMMITTED transaction, after its C9 re-checks: `consent.recordConsent({ consentType:
    'module_lead_handoff', consentArtifactRef: leadId, … })` → `submitModuleLead` → `recordLeadHandoff({ consentId, … })`.
  - A replayed lead (`{ replayed: true }`) writes NO second handoff, because `lead_id` is the PK and a 23505 on it maps
    to `LeadHandoffAlreadyRecordedError`, which the caller treats as the replay.
  - RVD2 (12.1 / `-433` QE21): the lead caller is where `submitModuleLead`'s retry loops on a drift. That is 12.3's
    caller-side decision. 12.5 adds NO module command and does NOT change the retry.

- **QE19 — ADR.** `ADR-NNNN-partner-lead-handoff-transport.md` (status `drafted`). It records:
  - the signing scheme and the receiver guide (QE3);
  - the delivery semantics (QE6);
  - the address policy (QE8);
  - the envelope v1 (QE12);
  - the partners-as-downstream-consumers invariant, with the prohibited and acceptable patterns quoted from the epic,
    and the review question for any future inbound integration: "does any value this partner sends change what TWT
    believes about a member's lifecycle, validity, contributions or claims?" — if yes, refused.

  It adds a row to `docs/knowledge-transfer/adr-index.md`.

- **QE20 — Records.** An author-commit decision (≥ `-481`) recording QE1–QE19 and the six answers, committed ALONE
  (Task 0.3). Then:
  - `deferred-work.md` "Deferred from: story 12-5-…" with C-1…C-8, plus the closure lines on 12.1's C7 / C8 (c) and
    12.2's QE11 / §3.7 items ("Closed by …" only where this story's code closes them; else "Resolved via explicit
    deferral" with a re-trigger — [[feedback_closure_language_precision]]);
  - `epics.md` "⭐ INHERITED FROM 12.5" notes under 12.3, 12.4 and 12.6;
  - the architecture annotations (QE3 (A));
  - the Panel note and the counsel question (Task 0.5);
  - Row NN (Task 0.6).

## Invariants (I)

- **I1** — No production call site exists for `recordLeadHandoff`. With no rows, the sweep sends nothing. Proved by a
  grep in Completion Notes; 12.3 changes this.
- **I2** — Every send attempt re-checks QE7's four predicates in a scope transaction that COMMITS before the request.
  NO request is made for a cancelled row.
- **I3** — Partner-provided data is advisory. Only `partner_reference` (≤ 64 safe characters) is stored, and nothing
  outside `marketplace/lead-handoff.ts` and the sweep reads it (QE15 (b)).
- **I4** — No inbound partner route exists in `apps/api` (QE15 (a)). No handoff code imports a write entry point of
  member, contribution, claim, pool or validity state (QE15 (c)).
- **I5** — The body holds only `LeadEnvelopeV1`. The member section is exactly the QE5 allow-list the member confirmed
  (decrypted from the row), NEVER a re-read of the member's record.
- **I6** — No new `account-frozen` source or reason; `member/overlay.ts` is NOT edited.
- **I7** — `PERMISSION_CATALOG_VERSION`, roles and keys are unchanged. No new event TYPE on `events_log` (handoff
  facts live in the row and the audit log, NOT the event stream). 12.1's five events are untouched.
- **I8** — Nothing logged, alarmed, thrown or stored in `outcome_detail` carries a member field, the URL, a resolved
  address, a header value, a response body or a secret value.
- **I9** — A connection is made only to an address that passed QE8's check, on port 443, with TLS verified, and with
  no redirect followed.
- **I10** — A final row never changes except by the erasure arm.

## Acceptance Criteria

0. **AC0 — governance first.** QE1–QE20 and BigDev's six answers are in the author-commit (≥ `-481`), committed ALONE
   before any code. The Panel note and the counsel question are WRITTEN and NOT sent. Row NN exists. The
   `deferred-work.md`, `epics.md` and architecture records exist (Task 0).
1. **AC1 — the schema.** Both migrations apply on a fresh DB and on the current chain. `module_lead_handoff` is in the
   pgEnum and in `ConsentTypeSchema`, and the lockstep test passes. `marketplace_lead_handoffs` has QE4's columns,
   named CHECKs, indexes, grants, FORCE RLS and per-command policies. The guard refuses each of:
   - a DELETE;
   - an immutable-column change;
   - an illegal status edge;
   - any change to a final row other than the erasure arm.

   Each refusal is a live-DB leg, and the erasure arm passes for each final status.
2. **AC2 — `recordLeadHandoff`.**
   - It refuses a consent that is not `module_lead_handoff`, is for another subject or Pariwar, or is revoked
     (`LeadHandoffConsentInvalidError`).
   - It refuses member fields outside `LeadMemberFieldsV1` (`LeadHandoffFieldsInvalidError`).
   - A second call with the same `lead_id` gives `LeadHandoffAlreadyRecordedError`.
   - It writes a `due` row with the ciphertext and `next_attempt_at = now()`.
   - It runs inside the caller's transaction, under a SAVEPOINT, so a 23505 leaves that transaction usable (12.1 TR3).
3. **AC3 — the envelope and the signature (QE3 as answered, QE12).** For a fixed input, the body bytes and the header
   values equal frozen vectors. The signature verifies with a reference implementation in the test (an independent
   `createHmac` over `"<t>." + body`), and fails if the body changes by one byte or the timestamp changes. With two
   enabled versions, two `v1=` values are sent. The attribution header is exactly `pariwar=<id>, module=<id>,
   lead_id=<uuid>`.
4. **AC4 — the address policy (QE8 as answered).** There is a unit row for every range in QE8, in v4, v6 and
   IPv4-mapped v6 forms. A host that resolves to one public and one private address is refused. A non-443 explicit
   port is refused with NO lookup. A local HTTPS test server proves all of the following:
   - the client connects to the pinned address with SNI = the hostname;
   - it follows NO redirect;
   - it aborts at 10 s;
   - it discards the body past 64 KiB;
   - it reads only the status and `X-Partner-Reference`.
5. **AC5 — the four cancel predicates (QE7).** For each predicate, a live-DB leg sets the condition between `record`
   and the tick. The row ends `cancelled:<reason>`, the test server receives NO request, NO decrypt audit line is
   written, and the predicate order holds (a revoked consent on an erased member reads `consent_revoked`). An archived
   module's lead IS delivered.
6. **AC6 — delivery outcomes (QE6, QE10, QE13).** Against the test server:
   - a 2xx → `delivered:http_2xx:<code>` with `delivered_at` and a sanitised `partner_reference` (an unsafe header
     value → NULL);
   - each transient class → released with the schedule's next time and `attempt_count + 1`;
   - the 7th transient failure → `failed_delivery:retries_exhausted`;
   - a 4xx other than 408 / 429 → permanent at once;
   - a 3xx → permanent;
   - a second due row for the same origin after a transient failure → `held:circuit_open` (no request, attempt not
     counted), while a row for another origin IS sent in the same tick;
   - a crash mid-attempt (the lease passed) → `due`, counted, and the next tick re-sends with the SAME
     `Idempotency-Key`.
7. **AC7 — secrets (QE9).** A missing secret → `held:signing_key_unavailable`, the attempt not counted, the module's
   other rows not tried this tick. After 24 h → `failed_delivery:signing_key_unavailable`. No log, alarm or detail
   carries a value (a spy on `console.*` and the alarm sink, checked against the injected secret value).
8. **AC8 — audit (QE14).** One decrypt line per attempt that reaches the decrypt, and one attempted line per send
   attempt, carrying `body_sha256` equal to the SHA-256 of the bytes the server received. NO audit line carries a
   member field or the URL.
9. **AC9 — erasure (QE16).** `anonymizeMember` NULLs the ciphertext on every one of the member's handoff rows,
   cancels a `due` row (`cancelled:member_erased`), and leaves another member's rows untouched. A tick afterwards sends
   nothing for that member. The existing anonymize specs stay green.
10. **AC10 — the boundary fence (QE15).** `partner-boundary:test` covers each rule with a planted violation that fails
    and a clean tree that passes. `partner-boundary:check` passes on the tree. It is wired into `package.json`,
    `scripts/ci-local.sh` and `.github/workflows/ci.yml` as its own job. Its README states its semantic limit.
11. **AC11 — the Row 26 guard and the tick.** Under an RLS-bound login the tick raises ONE `rls_bound_role` alarm and
    claims nothing. A throw in the lapse or the claim gives ONE `sweep_failed:<error name>` alarm and ends the tick.
    `registerModuleLeadHandoffCron` registers the queue and the cron in `boot.ts`, and the boot test sees it.
12. **AC12 — no production caller (I1), and the regressions.** The Completion Notes grep shows `recordLeadHandoff`
    called only from tests. The marketplace, consent, anonymize and data-export suites are green. `ci:local` passes
    with every job on a FRESH container ([[project_known_livedb_test_failures]] #18 — re-run the whole job).

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). No code before 0.3.**
  - [ ] 0.1 `git fetch origin`. Re-check the pin, and every G fact by FUNCTION. Re-grep NUMBERS (decisions,
        migrations + `when`, ADR, ledger letter, roster row) on every ref AND both live sibling worktrees. Confirm 12.3
        and 12.4 are still `backlog` (if 12.3 has started, read its seam first). Record `PERMISSION_CATALOG_VERSION`.
        Confirm the members-FK precedent for QE4.
  - [ ] 0.2 BigDev answers QE2, QE3, QE5, QE6, QE8 and QE11 (the ASKs), and accepts or amends the rest as a set.
        Record the answers VERBATIM here.
  - [ ] 0.3 The author-commit (≥ `-481`), committed ALONE
        (`governance: Story 12.5 lead-handoff transport build decisions (Decision 2026-11-21-NNN)`). **Rewrite map** if
        a non-recommended answer lands:
        - QE2 (B) → drop AC1's consent-value half and AC5's consent leg, and add C-1 "12.3 wires and tests the consent
          leg";
        - QE3 (B) → AC3 becomes JWS vectors, and add `marketplace_partners` key columns + C10's relaxation as a new
          Task 1.3;
        - QE5 (B) / (C) → the `LeadMemberFieldsV1` shape, AC2 and PQ2's wording;
        - QE6 (B) → AC6's transient rows become `failed_delivery:outcome_unknown`, and drop the retry schedule;
        - QE8 (B) → AC4's port rows;
        - QE11 (B) → drop the ciphertext column, the decrypt audit line and AC9's scrub, and AC5 reads the member record
          — and record the "what the member confirmed" cost in PQ2.
  - [ ] 0.4 Records: `deferred-work.md` "Deferred from: story 12-5-…" (C-1…C-8) and the closure lines on 12.1 C7 /
        C8 (c) and 12.2 QE11 / the §3.7 envelope / the §3.7 contract-version items. Then `epics.md` "⭐ INHERITED FROM
        12.5" under 12.3 (the seam, QE18; the member-facing status words; the C8 (b) export section), 12.4 (the
        transport also cancels on `account-frozen` — QE7 (4) — so 12.4 owns the shelf and the route, NOT the
        transport), and 12.6 (an archive does NOT cancel handoffs — QE7). Finally the architecture §3.7 / §5.9
        annotations, per QE3 as answered.
  - [ ] 0.5 Write, and do NOT send, the Panel note from the template
        (`trustee-panel-routing-note-2026-11-21-12-5-partner-lead-data.md`; §0 passed per edge 1) and the counsel
        question (`counsel-question-2026-11-21-12-5-partner-lead-transfer.md`, the `counsel-question-2026-11-01-14-3-…`
        shape). The questions:
        - **PQ1** May the Trust send a member's details to a partner when the member asks, on the member's own consent
          for that one offer? (the privacy-policy §6 amendment follows if yes)
        - **PQ2** Which details: the built four (QE5), fewer, or none until counsel advises?
        - **PQ3** How long does the Trust keep (a) what the member shared (the ciphertext) after delivery, and (b) the
          record that the member asked (the event, which erasure cannot remove — C8)?
        - **PQ4** The limits the Panel is TOLD, with no choice carried: a sent lead cannot be recalled; a duplicate is
          possible if the partner does not dedupe (QE6 as answered).

        Counsel's half: the controller-to-controller transfer (M-8), the partner data-handling agreement's minimum
        terms (purpose limit, dedupe by `Idempotency-Key`, deletion on request, breach notice — 14.3's Rule 7 duty), and
        whether a health-camp partner's lead is sensitive by implication. ⭐ The note's "one fact that decides it": *the
        privacy policy members accepted names no partner among those the Trust shares with.*
  - [ ] 0.6 Append Row NN `partner-lead-handoff-live` to `docs/launch-gate-inventory/inventory-roster.md`
        (decision-authored). Its legs:
        - (a) the Panel's ruling on PQ1–PQ3, recorded;
        - (b) counsel's return, recorded ([[feedback_record_unattested_no_backfill]]);
        - (c) the privacy policy §6 / §8 amended in `twt-legal`;
        - (d) the consent copy approved (12.3);
        - (e) a signed partner data-handling agreement per partner, with the dedupe clause;
        - (f) each module's secret provisioned and shared securely;
        - (g) the jobs login grant on `marketplace_lead_handoffs` (Row 26);
        - (h) production egress permits outbound 443;
        - (i) 12.3 and 12.4 landed.
- [ ] **Task 1 — migrations (AC1).**
  - [ ] 1.1 `NNNN_consent-type-module-lead-handoff.sql` — the single `ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS
        'module_lead_handoff';`, alone. The journal entry is hand-added. Then add the pgEnum value at the END of the
        `consent_records.ts` list (never reorder) with its comment and the dated header line (QE2), plus
        `ConsentTypeSchema`.
  - [ ] 1.2 `NNNN+1_marketplace-lead-handoffs.sql` — the table, CHECKs, composite FK, indexes, grants, FORCE RLS +
        policies, and the guard function + trigger (QE4), hand-authored (G16). The Drizzle schema + RLS file are
        exported through the schema / policies barrels.
- [ ] **Task 2 — pure modules (AC3, AC4 unit half).** `lead-member-fields.ts` (schema + the Tier-1 field class), then
      `lead-envelope.ts` (body, signature, attribution — QE3 / QE12), then the address table + check (in
      `partner-lead-client.ts`'s pure half or a domain helper — the dev picks, recorded). Frozen vectors.
- [ ] **Task 3 — domain commands (AC2, AC5–AC7 state half).** `lead-handoff.ts`: `recordLeadHandoff`; `claimDueLeadHandoff`
      (MATERIALIZED CTE + SKIP LOCKED); `readLeadHandoffForSend` (the QE7 order); `settleLeadHandoffDelivered` /
      `releaseLeadHandoff` / `failLeadHandoff` / `cancelLeadHandoff` / `lapseLeadHandoffs`; reads `getLeadHandoffStatus`
      (12.3's member-facing derivation, QE6) and `listFailedLeadHandoffs` (admin shape, capped, `clampLimit` inline —
      12.1 TR5). The errors go in `errors.ts`.
- [ ] **Task 4 — the egress client (AC4).** `partner-lead-client.ts` per QE8, with an injectable `lookup` and
      `request` for tests.
- [ ] **Task 5 — the sweep (AC5–AC8, AC11).** `module-lead-handoff.ts` in G2's order. Register it in `boot.ts`, add
      `QUEUE_NAMES.MODULE_LEAD_HANDOFF`, and give it its own pool.
- [ ] **Task 6 — erasure (AC9).** One step in `member/anonymize.ts` (QE16), with a comment in the file's own shape.
- [ ] **Task 7 — the boundary fence (AC10).** `scripts/partner-boundary-invariant/` + the wiring + a README.
- [ ] **Task 8 — ADR (QE19)** + the `adr-index.md` row.
- [ ] **Task 9 — tests + `ci:local` (AC1–AC12).** Per Testing standards, then the Completion Notes greps (I1, I6, I7).

## Dev Notes

### Current state (what this story changes, what must be preserved)

- **`consent_records.ts`** — APPEND one pgEnum value at the end. Preserve every existing value, its comment and its
  order. Add the contracts lockstep in the same commit.
- **`member/anonymize.ts`** — ADD one step. Preserve every other scrub and the transaction shape. The deceased-keyed
  scrubs (6.38) are NOT affected: a handoff is keyed by the MEMBER, so it is scrubbed only on that member's own
  erasure.
- **`apps/jobs/src/boot.ts`** — ADD one registration beside `registerModuleActivationCron`.
- **`packages/queue/src/index.ts`** — ADD one queue name.
- **`docs/knowledge-transfer/adr-index.md`**, **`package.json`**, **`scripts/ci-local.sh`**,
  **`.github/workflows/ci.yml`** — one addition each.
- **Do NOT touch:**
  - `marketplace/commands.ts`, `project.ts`, `events.ts` and the `marketplace_modules` trigger chain (I7; 12.1 C12);
  - `member/overlay.ts` (I6);
  - `rbac/permissions.ts`;
  - `packages/events/src/registry.ts` (no new event type);
  - the data-export assemble sections (G14);
  - 12.2's wizard (C-6 is carried, NOT built).

### Traps (TR)

- **TR1 — `ADD VALUE` in a transaction.** It cannot share a migration with a statement that USES the value (55P04).
  Two files.
- **TR2 — A per-subject consent check** passes the AC's words and fails its meaning (G6). Read the row by `consent_id`.
- **TR3 — A 23505 aborts the caller's transaction.** `recordLeadHandoff` runs under a SAVEPOINT and rolls back to it
  before mapping (12.1 TR3).
- **TR4 — Global `fetch` cannot pin an address** without `undici`'s dispatcher (G8). Use `node:https` with `lookup`.
  Setting only `servername` while connecting by hostname leaves DNS rebinding open.
- **TR5 — `IN (subquery LIMIT) … SKIP LOCKED` over-claims** — use a MATERIALIZED CTE.
- **TR6 — Ordering the claim by `created_at`** lets a failing head row block the queue. Order by `next_attempt_at,
  updated_at`.
- **TR7 — A decrypt inside the same wrapper as the send** writes a false `_rolled_back` when the SEND fails (13.1b TR2).
  The decrypt is the wrapper's only `mutate`.
- **TR8 — The jobs pool.** A transaction plus an audit line needs two connections. Use its own pool (`max: 3`), and
  hold NO connection across the HTTP call.
- **TR9 — A send cannot be recalled.** A revoke or erasure that lands while a row is `attempting` is honoured only if
  the request has not been written. The domain records this, and PQ4 tells the Panel. Do NOT claim "revocation always
  cancels" in copy or tests.
- **TR10 — `now()` is the transaction start** (12.1 TR4). A lapse and a claim in one transaction see one clock. Use
  separate transactions, as the twins do.
- **TR11 — PG 16.16 RLS index quals** ([[project_pg1616_leakproof_cast_index_qual]]). The claim runs under the jobs
  login (BYPASSRLS today). A `twt_app` read with a cast on the outer side may become a Filter; keep the
  member-status read keyed by `(pariwar_id, lead_id)`.
- **TR12 — Markdown in JSDoc.** `**…**/` closes a comment ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR13 — Unicode test vectors** land raw ([[project_unicode_escapes_written_raw]]). Build Devanagari names in the
  fixtures with `String.fromCharCode`, and scan the added lines.
- **TR14 — The pre-push hook inherits `DATABASE_URL=:5432`** — prefix every `git push` with the story's port
  ([[project_prepush_hook_inherits_5432]]).

### Carried to sibling stories (C) — record in `deferred-work.md` "Deferred from: story 12-5-…" at Task 0.4

- **C-1 → 12.3:** the seam (QE18). Also: the member-facing words for `pending_retry` / `delivered` /
  `failed_delivery` and for a cancelled handoff; the consent copy (Row NN (d)); the data-export lead section (12.1
  C8 (b)); RVD2's retry decision.
- **C-2 → 12.6:** an archive does NOT cancel handoffs (QE7). If 12.6 restores modules, nothing in 12.5 changes.
- **C-3 → no owner yet:** the partner-relationship admin view (the failed list, the open-circuit view, a resubmit — §3.7
  "helpdesk can resubmit via admin"). 12.5 builds the read `listFailedLeadHandoffs` only. ⭐ Trigger: the first
  `failed_delivery` in a non-test database, or Row NN's go-live, whichever is first.
- **C-4 → no owner yet:** a per-module field allow-list ("scope-redacted … per FR-66 wizard") and a per-partner contract
  record (§3.7 "versioned per-partner"). ⭐ Trigger: the first partner whose contract needs fewer fields than QE5, or a
  second envelope version.
- **C-5 → no owner yet:** any inbound partner feedback (lead outcome, "not at this time" — PRD UJ-10). It must be
  advisory (ADR), persist + ack (§3.11), and re-open §0. ⭐ Trigger: the first partner offering an outcome callback.
- **C-6 → 12.2 (follow-up):** the wizard should refuse a non-443 explicit port at author time (QE8), so that an
  immutable manifest cannot be stranded. ⭐ Trigger: QE8 (A) answered.
- **C-7 → 12.4:** the transport's own `account-frozen` cancel (QE7 (4)) is NOT 12.4's suppression. 12.4 still owns the
  shelf and the lead route.
- **C-8 → Panel / counsel (Row NN):** PQ1–PQ4 and the counsel question, as written at Task 0.5.

### Testing standards

- **DB-free unit** (`packages/domain/tests/marketplace/`): `lead-member-fields.test.ts` (accept / reject per field,
  `.strict()`), `lead-envelope.test.ts` (frozen bytes, signature vectors, the independent verifier, two versions, the
  attribution header), `lead-address-policy.test.ts` (every range × form; mixed answers; the port rule).
- **Live-DB** (`packages/domain/tests/integration/marketplace/`): `lead-handoff-schema.spec.ts` (AC1 guard legs, RLS
  isolation from `PARIWAR_B`, the erasure arm per status), `lead-handoff-commands.spec.ts` (AC2, the predicate order,
  the status edges), `lead-handoff-erasure.spec.ts` (AC9). Use `setupLiveDb` / `getTx`. A spec that commits uses its own
  pool and declares `hasDatabase` (12.1 TR11).
- **Jobs** (`apps/jobs/tests/`): `module-lead-handoff.test.ts` against a local `https.createServer` with a self-signed
  cert the client trusts through an injected CA. It covers AC4's live half, AC5–AC8 and AC11, with the injected lookup
  resolving a test hostname to `127.0.0.1` ONLY in a test-only allow seam that the production constant does NOT
  contain. ⚠ The seam must be a constructor argument, NEVER an env var, and the fence asserts that production boot
  passes none.
- **Contracts:** the `ConsentTypeSchema` lockstep test (it exists — run it).
- **Fence:** `scripts/partner-boundary-invariant/lib.test.ts`.
- Run `ci:local` on a fresh container, DB named `twt_dev`, `DATABASE_URL` prefixed
  ([[project_known_livedb_test_failures]]).

### Project Structure Notes

- Everything domain-side lives in `packages/domain/src/marketplace/` (12.1 QE1), NEVER a `packages/marketplace`. NO
  contracts until a route exists.
- The jobs files follow `apps/jobs/src/scheduler/<name>.ts` + `<name>-client.ts` (the staff-email pair).
- Variance from the architecture tree (`apps/api/.../partner-leads/`, `packages/contracts/module-leads/`): there is NO
  API surface in 12.5, and the lead route is 12.3's in `apps/api/src/modules/marketplace/`. Recorded in the ADR.

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 12, Story 12.5 + the INHERITED notes from 12.1 / 12.2.
- `_bmad-output/planning-artifacts/architecture.md` — §3.7, §3.11, §3.12, §5.9, "Replayable outbound dispatch".
- `_bmad-output/implementation-artifacts/12-1-…md` — QE5, QE7, QE8, QE15, I9, I11, C6–C8, C10, C13.
- `_bmad-output/implementation-artifacts/12-2-…md` — QE11, Carried → 12.5.
- `.decision-log.md` — `2026-10-31-427`, `2026-10-31-429`, `2026-11-01-433`, `2026-08-21-147`, `2026-09-08-210`.
- `deferred-work.md` — "Deferred from: story 12-1-…", "… 12-2-…".
- `apps/jobs/src/scheduler/field-worker-code-sms.ts` (the sweep twin), `staff-email-client.ts` (the client twin).
- `packages/domain/src/consent/`, `secrets.ts`, `member/anonymize.ts`, `member/overlay.ts`, `encryption/`.
- `docs/legal/privacy-policy.md` §6 / §8, `niyamavali.md` / `.hi.md` (MAIN checkout, git-ignored — cite by section,
  never paste).
- `trustee-panel-routing-note-TEMPLATE.md` (§0 first).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (`bmad-create-story 12.5`,
  2026-11-21).

### File List

### Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-21 | v1.0 | Created by `bmad-create-story 12.5` on its own worktree at `90535934`. Six ASKs open with BigDev (QE2, QE3, QE5, QE6, QE8, QE11); the Panel note and the counsel question are planned at Task 0.5 (written, not sent); NO code before Task 0.3. |
