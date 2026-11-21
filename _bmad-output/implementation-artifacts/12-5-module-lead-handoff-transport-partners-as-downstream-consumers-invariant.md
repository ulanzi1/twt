---
baseline_commit: 90535934
---

<!--
PINNED: `90535934` = `origin/main` (2026-11-21o, after `git fetch origin`). The story lives on branch
`story/12-5-module-lead-handoff-transport-partners-as-downstream-consumers-invariant` in its OWN worktree
(`.claude/worktrees/12-5-module-lead-handoff-transport-partners-as-downstream-consumers-invariant`), created from
`origin/main`. Two facts, kept apart: (1) the pin is an ancestor of HEAD (durable); (2) every `apps/` / `packages/` /
`scripts/` claim below was re-derived at the pin on 2026-11-21 (perishable — `git diff --name-only 90535934..origin/main
-- packages apps scripts` at Task 0.1). Re-locate by FUNCTION, ⛔ by line.
REBASED 2026-11-21 onto `origin/main` = `e5e13f92` (Story 6.22b landed; every commit of this branch was re-written, so the
SHAs cited here are the post-rebase ones). Between the pin and `e5e13f92` eight code files moved, all 6.22b's; ONE is
cited here — `member/anonymize.ts`, where only a comment changed (the three pinned counts in `rtbf-anonymize.test.ts`
are unchanged). Migration `0213` and decisions `-477`–`-481` are now on `main`.

STATUS: ready-for-dev (2026-11-21 — v1.8). ⭐ **Task 0 is DONE except 0.1** (the re-check `bmad-dev-story` runs first).
The build decisions QE1–QE26 carried TWELVE asks (QE2, QE3, QE5, QE6, QE8, QE11, QE21–QE26). BigDev answered them on
2026-11-21, all as recommended (QE21 is (C)), and accepted the rest as a set. The author-commit is **Decision
`2026-11-21-483`**, committed ALONE (`24d930fc`) before any code ([[feedback_governance_commits_precede_implementation]]).
This file is amended to those answers: where an ASK lists options, the one marked "recommended" is the one BUILT, and
the others stay only as the record of what was considered.
⭐ **The Panel note was SENT and RULED: Decision `2026-11-21-484` (Trustee-ratified, DR + KB) — Q1 C, Q2 A … Q7 A.**
Every built answer the note asked about (the four details, the 30 days, the kept fact of interest, the stop on a
reported death) is now RATIFIED as built; nothing in QE1–QE26 changes. Q1 C also allows a SECOND route (the member
fills in the partner's own form; the Trust sends nothing) — NOT this story (K-12). BigDev, 2026-11-21, by selection:
"Build 12.5 now" — the correct-course for that route does NOT come before Task 1 (K-12 says what it owes). The counsel
question is WRITTEN, ⛔ recorded as sent. Neither blocks the build — counsel, the policy edit and the rest of Row 54
block GO-LIVE (Task 0.6). Nothing reaches a partner or a member from 12.5 alone (I1).

GLYPH REGISTER: `⛔` NEGATES the word or phrase it precedes (used ONLY in this header comment, the rulings and §0 tables,
and the G / QE prose) · ⭐ = action / emphasis · ⚠ = hazard. ⭐ In Policy meaning, ACs, Invariants, Tasks, Dev Notes and
Traps, negations are written in PLAIN WORDS ("No …", "Do NOT …", "is NOT …"), so a skim cannot invert them.

ADDRESSING RULE: never cite file:NNN into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`. They are
newest-first files, so cite the decision id + clause, the item heading, or the row key. Line numbers into other files
are perishable hints. Legal files (`docs/legal/*`, git-ignored, main checkout) are cited by SECTION NUMBER and described
in our own words — ⛔ pasted (the repo is public; `docs/legal-corpus-location.md`).

LETTERS: G = found facts · QE = build decisions (ANSWERED = BigDev's answer, `-483`) · W = the row's writes (QE6) ·
S = the tick's steps (QE13) · P = the cancel predicates (QE7) · I = invariants · TR = traps · PQ = questions for the
Panel / counsel (Task 0.5). ⚠ `C6`, `C7`, `C8`, `C10`, `C13` with NO hyphen are ALWAYS Story 12.1's carried items. This
story's own carried items are `K-1` … `K-13`.

NUMBERS — re-read 2026-11-21 ~18:20 IST across every ref (heads and remotes) and the live sibling worktrees
(`3-13-…`, `6-22b-…`, `6-39a-…`, `governance-registration-change-2026-11-21`, incl. uncommitted files); re-read again at
v1.7 after `git fetch origin` (`origin/main` = `e5e13f92`; `6-22b-…` has landed and has no worktree; a fifth sibling,
`3-15-assisted-signup-field-worker-code`, stacked on the governance branch, adds no decision, migration or roster row). Siblings
committed several times while this story was being written, so every number here is a floor, never a value. Rule (`-366` decision 6): the number belongs to the first
COMMIT, on any branch.
- Decisions: this story's author-commit is **`2026-11-21-483`** (`24d930fc`), taken after `-477`–`-481`
  (`story/6-22b-…`) and `-482` (`governance/registration-change-2026-11-21`). The Panel's ruling is **`-484`**
  (`90e0f9ba`, this branch). A later decision is **≥ `-485`** and re-greps every ref and every worktree.
- Migrations: `main`'s highest is `0212_claim-membership-checks`. `story/6-22b-…` has COMMITTED
  `0213_claim-documents-death-certificate-delete-guard` (journal `when` `1797998580000`); `story/6-39a-…` and
  `story/3-13-…` both plan later numbers in prose ⇒ this story takes the next TWO free numbers at its commit, **≥ `0214` + `0215`** (⚠ two files — QE2). Each
  `when` must exceed every sibling's ([[project_sibling_migration_when_order_shared_db]]). The file names below use
  `NNNN` / `NNNN+1`.
- ADRs: highest `ADR-0045` ⇒ this story writes **≥ `ADR-0046`** (QE19). ⚠ New ADR files are upper-case `ADR-NNNN-…`.
- RBAC: this story adds NO key, NO role (I7). Read `PERMISSION_CATALOG_VERSION` live at Task 0.1 only to record it.
- Ledger: this story's creation entry is `2026-11-21t` (`fc715af5`, 16:32:17 IST — the FIRST commit of `t`;
  `story/6-22b-…`'s own `t` is `10aa2b82`, 16:33:59 ⇒ THEIRS to relabel, ⛔ this story's). Letters through `z` are
  taken across the branches (`s` and `w` twice) ⇒ after `z` the file runs `aa`, `ab`, …; this story's last entry is
  `al` (`a18a69ec`), so the next is **≥ `am`** (re-grep every ref at every entry; relabel if taken).
- Roster: this story appended **`Row 54`** (`partner-lead-handoff-live`), the first commit of that number;
  `story/6-39a-…` plans `Row 54` in prose and takes the next one (≥ `Row 55`).
⭐ Re-grep ALL of these at Task 0.1 and again at the commit that takes each.
-->

# Story 12.5: Module Lead-Handoff Transport + Partners-as-Downstream-Consumers Invariant `[PRIMITIVE]`

Status: review

## ⭐⭐ WHAT THIS STORY IS, IN ONE PARAGRAPH

When a member registers interest in a partner offer (12.3's lead route, not built yet), this story's transport takes
that registered interest to the partner's system. The lead route records a **handoff** row in the same transaction
as `module.lead_submitted`. A per-minute jobs sweep then sends it to the module's `lead_handoff_url` as one signed HTTPS
POST. The body holds the member fields the member agreed to share, plus TWT's attribution header. The sweep retries a
transient failure with backoff and marks a permanent one `failed_delivery` for partner-relationship review, with an
alarm.

Before every attempt the sweep re-checks the member's side. If any check fails it **cancels** instead of sending:
- the member's consent for that lead is still in force;
- the member's data has not been erased;
- the member is still a member (has not withdrawn, and has not been terminated — QE23);
- no death has been reported for the member (the account is not frozen, and — QE26 — no death report stands).

It also cancels a lead whose offer the Trust itself has withdrawn (QE22).

It also re-checks the partner's side. If a check fails it **does not send** (a refusal or a hold, never a cancel):
- the URL is still well-formed and on port 443;
- the signing key resolves;
- every address the partner's hostname resolves to is public.

The second half is the **boundary**. Partners are downstream consumers of explicitly consented leads, never a source
of truth for any member's lifecycle, validity, contribution or claim state. No inbound partner endpoint exists. A
partner's reply is stored only as a short advisory reference. A CI fence and an ADR keep it that way.

**Nothing reaches a partner or a member from 12.5 alone (I1).** The handoff command has no production caller until
12.3. The governance that must come before any member field leaves (12.1's C6 / C8) was routed here: the Panel has
RULED (`-484`); counsel's return, the privacy-policy edit and the rest of Row 54 are still open. They gate go-live, NOT
the merge ([[project_not_in_production_merge_is_not_golive]]).

**This story builds ONE of the two routes `-484` Q1 C allows** — the one where the Trust sends the details. For offers
that use the other route (the member fills in the partner's own form; "the Trust sends nothing"), no handoff row may
ever exist. Nothing in 12.5 can tell the two kinds of offer apart yet (no module records its route); the story that
adds that marker owes the refusal (K-12).

## ⭐ Names at a glance

| Thing | Name |
|---|---|
| Table (NEW) | `marketplace_lead_handoffs` / `marketplaceLeadHandoffs` (`packages/domain/src/schema/marketplace_lead_handoffs.ts`) |
| Consent type (NEW value, QE2) | `module_lead_handoff` on the `consent_type` pgEnum (+ the `@twt/contracts` `ConsentTypeSchema` lockstep + the second pin in `packages/contracts/tests/consent.test.ts`) |
| Migrations (NEW, two) | `NNNN_consent-type-module-lead-handoff.sql` (the `ADD VALUE`, alone) · `NNNN+1_marketplace-lead-handoffs.sql` |
| Tier-1 field class (NEW) | `MODULE_LEAD_FIELDS_FIELD_CLASS = 'module_lead_fields'`, declared in `packages/domain/src/encryption/field-classes.ts` (the single authority — never re-declared elsewhere) |
| Domain (NEW, `packages/domain/src/marketplace/`) | `lead-handoff.ts` (seal / record / claim / settle / release / hold / fail / cancel / lapse / purge / requeue / reads) · `lead-envelope.ts` (pure: the v1 body, the signature, the attribution header) · `lead-member-fields.ts` (the v1 allow-list schema + the sealed shape) |
| Domain commands (the 12.3 seam) | `sealLeadMemberFields(encDeps, { pariwarId, leadId, fields })` — BEFORE the transaction · `recordLeadHandoff(client, { … sealedFields })` — in the SAME transaction as `submitModuleLead`. NO production caller in 12.5 |
| Egress client (NEW) | `apps/jobs/src/scheduler/partner-lead-client.ts` — `node:https`, connects to the validated address, no redirects, port 443 only (QE8) |
| Sweep (NEW) | `apps/jobs/src/scheduler/module-lead-handoff.ts` (`runModuleLeadHandoffTick`, `registerModuleLeadHandoffCron`) · `QUEUE_NAMES.MODULE_LEAD_HANDOFF = 'module.lead_handoff'` |
| Audit actions | `module.lead_handoff_recorded` (by 12.3's caller), `module.lead_handoff_fields_decrypted` (the decrypt line, the 13.1b shape), `module.lead_handoff_attempted` (one per request made) |
| Headers sent | `X-TWT-Attribution: pariwar=<id>, module=<id>, lead_id=<uuid>` (epic AC, verbatim form) · `X-TWT-Signature: t=<unix>, v1=<hex>` (QE3 (A)) · `Idempotency-Key: <lead_id>` (QE6 (A)) · `Content-Type: application/json` |
| Boundary fence (NEW) | static: `scripts/partner-boundary-invariant/{check,lib,lib.test}.ts` · scripts `partner-boundary:{check,test}` · route leg: `apps/api/tests/integration/partner-boundary.spec.ts` |
| ADR (NEW) | `docs/adr/ADR-NNNN-partner-lead-handoff-transport.md` (≥ `ADR-0046`) |
| Decisions | `2026-11-21-483` (`24d930fc`) — author-commit of QE1–QE26 · `2026-11-21-484` (`90e0f9ba`) — Trustee-ratified, the Panel note's Q1–Q7 |
| Panel note (SENT, RULED by `-484`) | `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-12-5-partner-lead-data.md` |
| Counsel question (WRITTEN, not recorded as sent) | `_bmad-output/planning-artifacts/counsel-question-2026-11-21-12-5-partner-lead-transfer.md` |
| Roster | `Row 54` — `partner-lead-handoff-live` (appended 2026-11-21) |

## Story

As **Solo Builder authoring the lead-handoff transport that connects TWT members' consented interest to partner
systems**,
I want **a webhook-based transport with signed payloads + member-consented data + TWT attribution + idempotent
delivery**,
so that **partner systems receive valid leads with provenance, and partner integration boundaries are preserved.**

## 📜 Policy meaning (AI-10-1)

**This story introduces NO predicate that gates a member's access to a benefit.** A lead is NOT a benefit the Trust
owes (12.1 Policy meaning; 12.2's restatement). Who may REGISTER interest is 12.1's three lead rules plus 12.3's
server-side re-checks (12.1's C9). 12.5 does not touch them.

**It does introduce predicates that decide whether a member's registered interest is PASSED ON to the partner** (P1–P5
in QE7, and QE22's withdrawn-offer stop). In a member's terms:

**"What you agreed to share with a partner is sent only while your agreement for that offer stands and you are still
a member. If, before it is sent, that agreement is withdrawn, your membership ends, your data is erased, your death is
reported to the Trust, or the Trust withdraws the offer, it is not sent. Once it has been sent, it cannot be called
back."**

A second sentence follows from 12.1's rule that a member registers for each offer only once (`-427` Consequence 3,
`-429` A2 (iii)):

**"If your interest is stopped for one of those reasons, or could not be delivered, your place on that offer is not
given back."**

Both sentences are as BUILT (`-483`), and the Panel has ratified the acts behind them (`-484`): "your death is
reported" rests on P5 as well as P4, and Q7 A reads, as put, "Stop from the moment the death is reported, and stay
stopped after the claim is settled." (Staff can re-send a failed lead inside the retention window, once K-3 gives that
a caller. That is a staff remedy, not something the member can ask for, so the second sentence covers a failed
delivery too.)

**Scope — the sentences cover ONE route.** `-484` Q1 C lets each offer work one of two ways; its own member sentence
reads: "For some offers the Trust passes on four of your details when you agree; for others you fill in the partner's
own form and the Trust passes on nothing about you. Once your death has been reported to the Trust, nothing of yours is
passed to a partner." The two sentences above are about the FIRST kind of offer only. The second kind is K-12's.

**After it is sent** (`-484` Q6 A, as put): "The Trust tells the partner and asks it to delete — a duty written into the
partner agreement, carried out by staff." So "cannot be called back" stays true of the transport, and a member who
withdraws or is erased after delivery is followed up by staff. 12.5 builds none of that duty (K-13); do NOT put it in
member copy until it exists.

⚠ The first sentence narrows only: each predicate can stop a send, and none can cause one. "Before it is sent" is
load-bearing: a change that lands after the last check is too late (TR9). The second sentence is a COST to the
member, and it is told to the Panel (PQ4).

**What is real behind each clause today** (do NOT put a clause in member copy before its mechanism is reachable):

| Clause | Mechanism | Reachable by a member today? |
|---|---|---|
| "your agreement … is withdrawn" | P1 reads `revoked_at` on the lead's consent rows | NO. No member surface revokes a consent today (the revoke callers are the Telegram and WhatsApp opt-ins and the claim DPDPA route). The withdraw-my-interest act is carried to 12.3 (K-1). Built and tested here, unreachable until then. |
| "your membership ends" | P3 reads the lifecycle state `withdrawn` and the moderation overlay `terminated` | Termination: yes. Withdrawal: no member can reach `withdrawn` until row `3-14` (the lock-in producer) lands. A SUSPENDED member is still a member, and the lead is sent. |
| "your data is erased" | P2 reads the NULLed ciphertext / `anonymized`; QE16 cancels a `due` row inside the erasure | Only for a withdrawn or terminated member — erasure is legal for no one else (`resolveRtbfLegality`), and never while a death report stands (`-423` Q1 (a)). |
| "your death is reported" | P4 reads the account-frozen overlay; P5 reads `isDeathReportStanding` | Yes. The wording follows the form of `-146`'s adopted sentence ("once your death has been reported to the trust"); it makes no promise about a freeze that lifts, or about a report later closed as false (the cancel is final — ratified, `-484` Q7 A; its accepted cost: "A living member wrongly reported dead loses their place on that offer for good."). |
| "the Trust withdraws the offer" | S4 reads the module's `archive_reason` (QE22) | Yes — 12.2's Withdraw. |
| "cannot be called back" | TR9 | Yes. The Trust then tells the partner and asks it to delete (`-484` Q6 A) — a staff duty with no owner, procedure or clause yet (K-13). |

**Checked against the Niyamavali** (the git-ignored copies in the MAIN checkout, by absolute path, 2026-11-21; cited by
section, never pasted):
- Both language files are unchanged since 2026-08-16 (file mtime), before 12.1's 2026-10-31 grep.
- The English file was grepped for partner, third party, advertisement, marketing, offer and scheme: no hit. The Hindi
  file was grepped for the matching nouns: the only hits are §1.2 (the Trust's own character) and two lines about
  contributions. None concerns partners.
- The story's own nouns were grepped too. Part 10 states the general data-protection posture (consents are recorded and
  honoured; statutory rights). §6.3 covers claim-time consents only. §8.4 ends a membership on termination, which is
  the ground for QE23.

**Result: SILENT on sharing a member's data with a partner.** Nothing in 12.5 conflicts with Part 10: the transport
refuses to send without a live, specific consent. (The Niyamavali is a rulebook, NOT a ratified spec —
[[feedback_niyamavali_rulebook_not_spec]].)

⚠ **The privacy policy is a DRAFT, and it speaks to this — that is the go-live blocker.** Its own header says it awaits
counsel's review before publication, and `-469` item 3 publishes it at go-live. So no member has accepted it yet, and
the remedy is an edit BEFORE publication, not a re-consent. As drafted (file unchanged since 2026-07-21):
- §6 lists those the Trust shares personal data with. Partners are NOT among them.
- §6 also commits that the Trust does not sell personal data. FR-64 lists commission terms on the manifest (none is
  stored yet — `-433` QE6 (A)). The Panel has now ruled (`-484` Q2 A, as put): "Never per lead. The Trust may be paid
  only when a member takes up the partner's product, and the policy says so in plain words." Still open: whether a
  take-up commission is a sale in law (counsel), and the partner terms themselves (OQ-4). 12.5 carries no payment
  field and changes nothing for this.
- §7 says where data is processed and limits cross-border transfer. QE8 admits any public address in the world.
- §4.1 makes taking a consent back no harder than granting it. No withdraw surface exists yet (the table above).
- §8 (retention) has no row for a lead.

⇒ 12.1's C6 and C8 (a) are the Panel's and counsel's (§0 edge 1). The Panel's half is RULED (`-484` Q1–Q5); counsel's
half and the policy edit before publication are still open, and gate go-live (Row 54 (b), (c)). Neither is "closed"
until those land ([[feedback_closure_language_precision]]).

## The rulings and decisions this story builds on (quoted, never paraphrased)

| Source | Verbatim | Status |
|---|---|---|
| epics.md Story 12.5 AC | "signed payload (HMAC-SHA-256 with module's signing key from Secret Manager), member-consented data only (consent-checked via Story 2.7 at the moment of handoff — revocation between submission and handoff cancels the delivery), TWT attribution header (`X-TWT-Attribution: pariwar=<id>, module=<id>, lead_id=<uuid>`)" · "idempotent via Story 1.12 keyed store (key = `lead_id`); retries on transient failure with exp backoff; permanent failure flagged for partner-relationship review" · "every handoff is audit-logged via Story 1.10 with full payload reference + delivery status" | epic text |
| epics.md Story 12.5 AC (boundary) | "partner integrations **consume explicitly consented lead-handoff events only** and **must NOT become authoritative sources of member lifecycle, validity, contribution, or claim-state truth**" · "(a) partner webhooks are **outbound only** … (b) any partner-provided data … is treated as **advisory information**, never authoritative; (c) partner integrations cannot register inbound APIs that update member lifecycle state, validity status, contribution status, or claim state" | epic text |
| architecture §3.7 | "partner authentication via signed JWT (asymmetric — partner holds TWT's public key for verification)." · "TWT API generates a signed-JWT lead envelope (member-attributed, scope-redacted to partner-allowed fields per FR-66 wizard) → POSTs to the partner endpoint." · "lead status is `delivered \| pending_retry \| failed_delivery`" · "TWT lead JWT carries a nonce; partner is contractually expected to dedupe by nonce." · "Circuit breaker per partner endpoint" · "Per-partner outbound concurrency limit" | architecture — ⚠ conflicts with the epic AC (QE3) |
| architecture "Replayable outbound dispatch" | "Outbound dispatch (push, WhatsApp, Telegram, partner) stores **message intent** — the canonical request: target, payload, channel, timestamp, attempt counter — not just the provider's send-result." | architecture |
| architecture §3.12 | "every external call has timeout + breaker + retry policy declared at the integration boundary." | architecture |
| architecture §5.9 | "**Partner JWT signing keys:** rotated per partner contract terms" · "**Webhook signing secrets:** rotated on a committed cadence; rotation coordinated with provider via dual-secret window." · "**High-sensitivity secret separation.** A named tier of highest-sensitivity secrets lives in a separate GCP project (or projects) from prod" — the tier lists "Partner JWT signing keys." | architecture — ⚠ QE3 records two variances |
| architecture network | "**Egress controls:** named outbound destinations (DigiLocker, FCM, APNs, WhatsApp Business, Telegram, telephony provider, partner endpoints, bank statement upload endpoints) allowlisted via VPC Service Controls or equivalent firewall rules." | architecture — Row 54 (h) |
| PRD review M-8 | "Each module enrollment is a controller-to-controller PII transfer under DPDPA. The consent registry (FR-97) covers it in principle; the **partner's downstream processing** (HDFC, LIC) is the trust's joint-liability surface and is not enumerated." | review finding |
| Privacy policy §4.1, §6, §7, §8 (main checkout, git-ignored) | Cited by section; described in Policy meaning. ⛔ pasted. | ⚠ a DRAFT, published at go-live (`-469` item 3); ⛔ binding authority (`docs/legal-corpus-location.md` rule 2) |
| Decision `2026-10-31-427` QE10 (12.1) | "⛔ route, UI, permission key, consent type or job. The `module_lead_handoff` consent type is 12.3's to add." | author-commit — ⚠ QE2 (A) AMENDS it, by name |
| Decision `2026-10-31-427` Consequence 3 | "A member who registered interest and wants to register again (for example after a partner lost the lead) cannot, until a later story adds a re-register or withdraw path." | author-commit — QE21 |
| Decision `2026-10-31-429` A2 (iii) | "the same member with a NEW `lead_id` → `ModuleLeadAlreadySubmittedError`." | author-commit — QE21 |
| Decision `2026-10-31-429` Consequence 3 | "A partner whose webhook needs a URL token must take it as a header from Secret Manager instead, which is 12.5's delivery concern." | author-commit — QE25 |
| `deferred-work.md` "Deferred from: story 12-1-…" (implementing `-427` / `-429`) | C6: "partner data sharing has ⛔ basis on record (Panel / counsel)" · C7: "The scheme is unresolved. Architecture §3.7 / §5.9 says asymmetric JWT **per partner**, with keys in the high-sensitivity project. Epic 12.5 says HMAC-SHA-256 **per module**." · "12.5 also re-checks the RESOLVED address at send time (SSRF / DNS rebinding)." · C8 (c): "Any lead PII (name, mobile) lives in 12.5's lead entity, which erasure IS able to reach." | open deferred items routed here |
| Decision `2026-11-01-433` QE11 (12.2) | "the lead signing key is a Secret Manager NAME, validated for shape only; existence / resolution at send → 12.5." | author-commit |
| Decision `2026-10-31-427` QE11 · `2026-11-01-433` QE15 | "A correction is archive + a new module." · "withdraw = archive `trustee_archived` by any key holder (the author included), ⛔ step-up, body `{}`; when `lead_count > 0` the UI warns before Withdraw and before a corrected copy (C10)." | author-commits — QE22's cost |
| Decision `2026-08-21-147` cl.3 (Trustee-ratified) | "Any future change that introduces a new **source/reason** for account-frozen must re-examine the directory exclusion predicate and the ratified member-facing sentence" | P4 READS the overlay and adds no source (I6). P5 is weighed against it in QE26. |
| `deferred-work.md` 12.1 C4 (→ 12.4) | "Keying suppression instead on the durable "a claim was ever filed" fact (`claim/nominee-lock.ts`) would suppress a LIVING member after an erroneous claim" · "That IS a new reason in `2026-08-21-147` cl.3's widened sense ⇒ **the re-examination is MANDATORY at 12.4**." | open deferred item; its 2026-11-01 note calls the premise stale and does not withdraw the reading — QE26 |
| Decision `2026-10-30-423` Q1 (a) (Trustee-ratified) | "Never erased once a death is reported." · "From the moment a claim is filed for the member's death, an erasure request is refused, for good — unless the report is closed as false (Q1 (b))." · the reason, as put: "the member agreed to how their data is used while they were alive; that agreement is what the claim, the drive and the donors rely on, and no one can withdraw it on their behalf afterwards." | QE24 and QE26 state their relation to it. Also a fixture rule: an erased member never has a standing death report. |
| Decision `2026-10-31-424` §0 gate (Trustee-ratified) | "the Panel's — … what may be done with a dead member's membership and record (Q2: CONSENT — `-423` Q1 (a)'s own reason)" | §0 edge 12; PQ6 |
| Decision `2026-09-08-210` cl.2 (Trustee-ratified) | The delegated mint leaves out (verbatim, the glyph is the source's): "⛔ anything touching `PERMISSION_CATALOG_VERSION`, a role, or a permission key" — and any status whose meaning reaches a member (our words). | QE2 — the consent value is recorded in the author-commit, ⛔ as a `-210` mint |
| Decision `2026-11-21-484` Q1 C (Trustee-ratified, DR + KB) | "Both — each offer works one way or the other." — option A: "The Trust sends the details — on the member's own agreement, given offer by offer; the policy is changed before it is published to name partners." · option B: "The Trust sends nothing — the member opens the partner's own form from the app and fills it in; the partner checks the member's number in its own way. … The Trust passes the partner only a code saying which offer the visit came from, and nothing about the member." · accepted cost: "Two things to build and keep, and two sets of wording for members." | RULED — NOT our suggestion (A). 12.5 builds A only; B is K-12. Not covered: which offers go which way, who chooses, member-by-member progress on the partner's form, step totals. |
| `-484` Q2 A | "Never per lead. The Trust may be paid only when a member takes up the partner's product, and the policy says so in plain words." | RULED. Counsel: whether a take-up commission is a sale. |
| `-484` Q3 A | "The four, for every partner. The member sees all four on the form before agreeing." · cost: "A partner that needs only a name and a number still receives the district and the language." | RULED = QE5 (A). The form half is 12.3's (K-1). |
| `-484` Q4 A | "Removed at once if the send is stopped; removed 30 days after it is delivered or finally fails." | RULED = QE24 (A) as BEHAVIOUR. The number is still counsel's to change; the author's reading of `-423` is NOT ratified as a reading, and `-423` is NOT amended. |
| `-484` Q5 A | "Accepted, and the policy says so: the fact that a member once registered interest in an offer is kept permanently, without their details." | RULED = what QE16 leaves on the row. Counsel: whether the law permits it. |
| `-484` Q6 A | "The Trust tells the partner and asks it to delete — a duty written into the partner agreement, carried out by staff." | RULED; NOT built, no owner, no procedure (K-13; Row 54 (e)). |
| `-484` Q7 A | "Stop from the moment the death is reported, and stay stopped after the claim is settled." · cost: "A living member wrongly reported dead loses their place on that offer for good." | RULED = P4 + P5 (QE26 (A)). `-423` is NOT amended. |
| `-484` the Told list (PQ4) | "No objection is recorded — and that is ⛔ a ratification." | The TOLD costs stay TOLD; never cite them as ratified. |
| `consent_records.ts` header | "New consent types (e.g. `whatsapp_opt_in` Epic 5, `module_lead_handoff` Epic 12) are added by the epic that FIRST WRITES them … Do NOT seed types for surfaces that do not exist yet." | house convention — QE2 (A) departs from its second sentence, recorded |

### §0 — whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` §0, per edge)

| # | Edge | Verdict |
|---|---|---|
| 1 | Sending a member's data to a partner at all, which fields, how long the Trust keeps what the member shared and the record that the member asked, and whether a paid lead squares with the draft policy's no-sale line (12.1's C6, C8 (a)) | **The Panel's, on counsel's advice** — "a LEGAL or consent BASIS for handling someone's data" and "what the Trust DISCLOSES about a person, or to whom". ⛔ 12.5 decides it. 12.5 BUILDS on the narrow side (a closed four-field allow-list, QE5; a finite retention default, QE24) and ROUTED it (PQ1–PQ5, Task 0.5; PQ6 is edge 12's). **RULED by `-484` Q1 C – Q5 A** (rulings table): the built answers stand as put; Q1 C adds a second route (K-12). Counsel's half and the policy edit are open; go-live waits (Row 54). |
| 2 | The signing scheme (12.1's C7) | **Yours** — "which implementation is correct, faster, or safer". Stripped: "should the partner check TWT's signature with a shared secret or a public key?" No person sees or is owed anything different. Answered (QE3) because the epic and the architecture disagree. |
| 3 | At-least-once vs at-most-once delivery | **Yours, with a stated member cost** — the same lead can reach the partner more than once (at most 7 requests per pass through the schedule), so a partner that does not dedupe may contact a member again. Answered (QE6). The Panel is TOLD the exact bound (PQ4), the `-370` shape. |
| 4 | The cancel predicates P1–P4 (Policy meaning) | **Yours** — each one only NARROWS what leaves (fail-closed). P4 rests on FR-65 ("Suppressed in all account-frozen states"). The Panel is TOLD of them as "built on the narrow side", ⛔ asked ([[feedback_told_line_must_not_carry_panel_choice]]). P5 is edge 12. |
| 5 | The new `module_lead_handoff` consent VALUE | **Yours, recorded** — a code name with no writer and no copy in 12.5. The consent TEXT and its basis are edge 1 (the Panel's). ⛔ a `-210` mint (a consent reaches a member), so it is recorded in the author-commit (QE2). |
| 6 | Port and address policy at send (12.1's C7) | **Yours** — SSRF hardening. Answered (QE8) only because a refusal at send can strand an immutable manifest (12.1's C10). |
| 7 | What a partner may send BACK, and what TWT does with it | **Yours, as an invariant the epic already fixes** — partner-provided data "is treated as **advisory information**, never authoritative". 12.5 builds NO inbound path. The first inbound feedback path (lead outcome) re-opens §0 at its own create-story (K-5). |
| 8 | The commission-disclosure question (12.2 QE6) | **⛔ 12.5's trigger** — its re-trigger (in our words: OQ-4 answered, the first production publish, or Story 12.3's create-story) is not met here. 12.5 shows no offer to a member. ⚠ But the no-sale line (edge 1) was 12.5's to ROUTE, because it concerns the transfer this story builds — RULED `-484` Q2 A ("Never per lead"); whether each OFFER shows the take-up commission stays deferred under `-433` QE6 (A). |
| 9 | What a final failure costs the member (one registration per offer, ever) | **Yours to build, the Panel TOLD** — Answered (QE21): keep final, or add a guarded requeue. The cost reaches a member, so it is in PQ4. |
| 10 | A lead whose offer was archived before it was sent | **Yours, on the narrow side** — Answered (QE22). Stopping sends after the Trust itself withdrew an offer NARROWS "to whom"; continuing them would be the wide side, and ⛔ recommended. Its cost (a withdrawal needs no step-up, and a correction is a withdrawal) is in QE22. |
| 11 | Telling the partner, or asking it to delete, after a member withdraws agreement or is erased AFTER delivery | **The Panel's, on counsel's advice** — a new disclosure-and-duty question. PQ5. **RULED `-484` Q6 A** — staff tell the partner and ask it to delete. ⛔ built here; who, how staff learn, and the clause's words are ⛔ ruled (K-13). |
| 12 | P5 — once the freeze has lifted, a standing death report still stops the send, for good | **Built on the narrow side; the Panel ASKED, ⛔ blocking (PQ6) — RULED `-484` Q7 A, as built.** `-423` is ⛔ amended, and "C when a way to register again exists" is ⛔ ruled. The original verdict, kept: `-424`'s §0 puts "what may be done with a dead member's membership and record" with the Panel. `-423` Q1 (a)'s reason, as put, is that the dead member's agreement STANDS ("no one can withdraw it on their behalf afterwards"); it is scoped to what "the claim, the drive and the donors rely on". OUR reading: extended to a partner-offer consent, that agreement would still allow the send, so withholding is the narrower act. 12.1's C4 reads a durable death fact as a new reason under `-147` cl.3. Whether to BUILD it now was QE26, answered (A); whether it is RIGHT, and its cost when a report proves false, is the Panel's. |

## FOUND FACTS (G) — re-derived at `90535934`, 2026-11-21

- **G1 — The lead today ends at an event, and a member gets ONE per offer.** `submitModuleLead` (`marketplace/commands.ts`)
  appends `module.lead_submitted` with `{ lead_id, member_id, slots_remaining_after, from_state, to_state, trigger,
  actor }`, `.strict()`, NO PII (12.1 I9). It takes a `pg.PoolClient`, needs READ COMMITTED, uses its own
  `SAVEPOINT module_lead_append`, and returns `{ replayed: true, … }` on a replay. The caller mints `leadId` and runs it
  inside `withCompensatingAudit` (12.1 QE15). It has NO production caller. 12.3 is `backlog`.
  It locks the module row `FOR UPDATE` first (`lockModuleRow`).
  ⚠ `decideLead` refuses a second lead from the same member on the same module (`already_submitted`), and the unique
  index `module_lead_member_uq` (0193) enforces it. ⇒ a handoff that ends `cancelled` or `failed_delivery` cannot be
  replaced by a new registration (QE21).
- **G2 — Nothing can subscribe to `events_log`.** The house shape for "do something external after an event" is an
  OUTBOX ROW written in the SAME transaction as the event, plus a jobs sweep. Twins:
  - `field_worker_code_sms_sends` (0202, Story 13.1b, `-450`; domain `field-worker/code-sms.ts`; sweep
    `apps/jobs/src/scheduler/field-worker-code-sms.ts`).
  - `claim_suspicion_staff_emails` (0152–0154, Story 6.25) — the held / parked / `aging_since` lessons
    ([[project_staff_email_substrate]]).

  The 13.1b sweep's order is: the Row 26 guard first; lapse expired leases; claim ONE row at a time (committed); read
  in one scope transaction; ONE audit line written first with the decrypt as its `mutate`; send with NO connection
  held; settle or release. A release ENDS the tick ("most of its causes are global").
  ⚠ **What the twin HAS, and what it does not** — "per the twin" inherits only this:
  - It HAS: a `claim_token` column (attempting ⇒ NOT NULL, a CHECK) and compare-and-set on it in every settle and
    release; `attempt_count` raised AT THE CLAIM; `clock_timestamp()` in its writes; a MATERIALIZED CTE with `FOR UPDATE
    SKIP LOCKED`; a 5-minute lease; release details for faults that definitely did not send
    (`api_unavailable:(kms|audit|db)`, `config_unavailable:secret_manager`).
  - It does NOT have: a return to `due` after a lapse (its lapse is FINAL, at-most-once); a `cancelled` status; a
    `twt_app` UPDATE grant; an erasure arm. Its guard forbids `due → due`.
  - The erasure arms cited elsewhere (0143 / 0156) admit a ciphertext change only as NOT NULL → NOT NULL (a sentinel
    overwrite). 12.5's arm is NOT NULL → NULL, so it is written fresh, not copied.
- **G3 — Where the endpoint and key live.** `marketplace_modules.lead_handoff_url` and
  `lead_handoff_signing_key_secret_name` are NOT NULL, immutable after `module.authored` (whole-row trigger, 12.1 I2;
  ADR-0044). The URL rule (`moduleLeadHandoffUrlSchema`, 12.1 QE5 as amended): `https:` only; canonical form
  (`raw === new URL(raw).href`, so a stored URL never carries `:443`); RFC 3986 characters only; no `@`, no userinfo, no
  query, no fragment; host neither an IP literal nor `localhost`; length ≤ 2048; **any explicit port accepted** (12.1
  R3-6). The secret NAME matches `^[A-Za-z0-9_-]{1,255}$`; 12.2 validates its shape only. `partner_id` is NOT NULL on
  the module row. `marketplace_partners` (12.2) carries names only — NO endpoint, NO key, NO contract version.
  A module is `draft | scheduled | active | archived`, with `archive_reason` one of `trustee_archived`,
  `valid_until_reached`, `slot_capacity_exhausted` (QE22). 12.2's Withdraw writes `trustee_archived`, by any key holder,
  with no step-up; a correction is a withdrawal plus a new module (rulings table).
- **G4 — Secret resolution.** `resolveSecretValue(secretName, { envFallback })` (`domain/src/secrets.ts`):
  - It reads `projects/<GOOGLE_CLOUD_PROJECT>/secrets/<name>/versions/latest` under ADC, with a 10 s timeout. It has
    NO version argument and NO list call, and it builds a new client on every call.
  - With no production context and `envFallback` unset it ALWAYS throws (local, CI) ⇒ tests inject a resolver.
  - Its message names the secret but never the value.

  Per-row names are already resolved at send time elsewhere: `deps.resolveSecret(ready.accessTokenSecretName)`
  (`packages/channels/src/composition/provider-composition.ts`) and the jobs twin. `resolveSmsDltConfig`
  (`apps/jobs/src/scheduler/contribution-providers.ts`) already tells NOT_FOUND (`code === 5`) from an outage, and
  duck-types the Google error because `@google-cloud/secret-manager` is declared only in `@twt/domain`. ⇒ QE9 reuses
  that classification.
- **G5 — Consent.** `consent_records` (Story 2.7) — one row per grant; revoke sets `revoked_at` and is NEVER a delete.
  `recordConsent(db, input)` mints a NEW row on every call; there is NO unique constraint.
  - `consentExists(db, pariwarId, subjectId, consentType, validAt?)` is per SUBJECT + TYPE and ignores
    `consent_artifact_ref`.
  - `resolveConsentById(db, pariwarId, consentId)` returns the row regardless of revocation.
  - `listConsents(db, pariwarId, subjectId, opts)` hides revoked rows unless `includeRevoked: true` and clamps to 50
    (cap 200). NO read goes through `consent_artifact_ref`, which is nullable text with no FK ⇒ P1 needs a new read.
  - The `consent_type` pgEnum has 13 values and **NO `module_lead_handoff`**. It already holds `dpdpa_data_sharing`
    and `marketing`, neither with a lead writer — and neither can be revoked per OFFER, which is why a new value is
    needed (G6).
  - `-427` QE10 says the value "is 12.3's to add" (rulings table).
  - Each `ADD VALUE` is its own migration file (`0048`, `0124`). ⚠ Drizzle's migrator applies ALL pending files in ONE
    transaction, and a value added in a transaction cannot be USED until it commits (55P04) ⇒ `NNNN+1` must not use
    the literal as an enum in any DDL-evaluated expression (TR1).
  - LOCKSTEP: `packages/contracts/src/consent/consent-record.ts` `ConsentTypeSchema`, pinned by an equality test. ⚠ A
    SECOND pin: `packages/contracts/tests/consent.test.ts` hard-codes the sorted list of 13. No other pin exists (not
    the OpenAPI emit, no exhaustive `Record<ConsentType, …>`; the data export types it as a string).
  - Precedent for "read ONLY through the referencing column, never by subject": `claim_contact_agreement` (6.19a, `-261`
    C3).
- **G6 — Per-lead consent is the only reading that satisfies "revocation … cancels the delivery".** A per-subject check
  (`consentExists`) would let a member's consent on offer A keep offer B's lead alive, and would let a revoke of B be
  masked by A. ⇒ the handoff row carries the `consent_id` 12.3 records for THIS lead, and every check compares
  `consent_artifact_ref` to the `lead_id` (QE2, P1).
- **G7 — Idempotency.** The Story 1.12 keyed store (`idempotency/keyed-store.ts`) serves request idempotency at the API
  door, and several jobs use it for JOB-RUN idempotency (`cycle-spawn.ts`, `contribution-notify-triggers.ts`,
  `survey-publish.ts`, `news-publish.ts`, `assignable-roster.ts`). The two OUTBOX sweeps (13.1b, 6.25) do not: an
  outbox row keyed by its own id gets the guarantee from the primary key, its status and the claim token, and a second
  store entry would be a second record of one fact. ⇒ QE6 records the variance from the epic's "via Story 1.12 keyed
  store".
- **G8 — Outbound HTTP.** The sweeps use global `fetch` with `AbortSignal.timeout(…)`
  (`apps/jobs/src/scheduler/staff-email-client.ts`). `undici` is NOT a declared dependency in any `package.json`.
  `node:https` `request` does NOT follow redirects and can connect to a chosen address with a separate TLS
  `servername`. No SSRF or private-address guard exists in the repo; the only address rule is 12.1's write-time one.
  Node is 22.12.0. No `https.createServer` test exists yet; committed PEM fixtures have a precedent
  (`apps/api/tests/fixtures/kyc/*.pem`).
- **G9 — Tier-1 storage + audited decrypt.** `encryptTier1` / `decryptTier1` / `serializeEnvelope` / `parseEnvelope`
  (`packages/domain/src/encryption/envelope.ts`). Field classes are declared ONCE in `field-classes.ts` (and re-exported
  by NAME from `encryption/index.ts`); a Tier-1 column is typed `piiColumn(1, '<class>')`. The encryption context has
  an optional `rowKey` (`kms-provider.ts`). The house mobile grammar is `normalizeMobile` (`encryption/member-fields.ts`).
  The house rule for a sweep that must read Tier-1 is 13.1b's: ONE audit line, written first, whose `mutate` is the
  decrypt and nothing else. `apps/jobs` wires KMS with NO `auditHook`; `apps/api` wires one, so an encrypt in the API
  writes its own audit line. A KMS round trip must not hold a pooled connection (`field-worker/crypto.ts`), and write
  accessors take pre-serialised ciphertext (`member/anonymize.ts` header). The audit writer takes a GLOBAL advisory
  lock per line ([[project_kms_audit_per_hmac_global_lock]]).
- **G10 — Erasure.** `anonymizeMember` (`member/anonymize.ts`) scrubs every PII-bearing table in the caller's RLS
  transaction (`twt_app`). Each table carries a column-level UPDATE grant and a per-command UPDATE policy AT BIRTH;
  under FORCE RLS a missing policy makes the scrub match 0 rows silently (`-279` A12). It does NOT touch
  `consent_records`. Erasure is legal only for a `withdrawn` member or one whose moderation overlay reads `terminated`
  (`resolveRtbfLegality`), and never while a death report stands (`-423`). The event stream is RETAINED, so the
  `module.lead_submitted` member↔offer link survives erasure (12.1's C8).
  ⚠ `packages/domain/tests/member/rtbf-anonymize.test.ts` pins exact counts (`toHaveLength(33)`, `toHaveLength(29)`,
  `size).toBe(30)`), and its mock client supports only `update().set().[from()].where()` — anything else throws.
- **G11 — The death reads.** The account-frozen overlay (`member/overlay.ts`) freezes on `claim.intake_initiated`, lifts
  on `claim.settled` / `claim.denied_no_appeal` / `claim.closed`, and has a sticky arm
  (`ACCOUNT_STICKY_FREEZE_EVENT_TYPE = 'claim.member_found_guilty'`). ⚠ It LIFTS at settlement of a real death.
  - `getMemberAccountOverlay(db, memberId, atTimestamp)` has NO Pariwar predicate and no production caller.
  - `listAccountFrozenMemberIds(db, memberIds, at)` is the reader built for the jobs pool: it filters on the
    `withPariwarScope` GUC itself and fails loud when unscoped. It is already in production
    (`contribution-notify-triggers.ts`; `directory-read.ts` carries the same fold).
  - `isDeathReportStanding(db, pariwarId, memberId)` (`claim/death-report.ts`; `-423`–`-425`) is the durable fact: it
    stays true after the freeze lifts on a settled claim, and it is released when the report is closed as false. The
    two differ both ways (an innocent finding not yet closed; a settled claim), so neither implies the other.

  A death is an overlay, NOT a `members.state` value ([[project_death_is_an_overlay_not_a_state]]). Termination is an
  overlay too (`member.moderation.getCurrentMemberModerationOverlay`), never a lifecycle state. 12.4 (`backlog`) owns
  suppression on the shelf and the lead route (12.1's C4, C9).
- **G12 — The jobs login and Row 26.** Every cross-tenant sweep first checks `smsDelivery.canReadAcrossPariwars`.
  Under an RLS-bound login the claim would see no row and raise no error, so the sweep raises ONE `rls_bound_role`
  alarm and ends the tick (roster Row 26 `jobs-db-role`). ⚠ The jobs pool BYPASSES RLS, and `withPariwarScope` only
  sets the GUC (it does not switch role) ⇒ on that pool RLS hides NOTHING, and every read needs an explicit Pariwar
  predicate or a reader that carries one. `getCurrentMemberState(db, memberId)` and
  `getCurrentMemberModerationOverlay(db, memberId)` take NO Pariwar (a member id is a global uuid), and the first
  returns `pending-kyc` for a stream it cannot see — the file's own doc calls that default permissive.
  12.2's `apps/jobs/src/scheduler/module-activation.ts` is the marketplace twin, registered in `apps/jobs/src/boot.ts`
  with its OWN `max: 3` pool ([[project_jobs_pool_two_connection_starvation]]). There is no boot test file: the
  precedent is a source-text pin in the sweep's own test (`apps/jobs/tests/module-activation.test.ts`), including the
  two `…Pool.end()` sites.
- **G13 — Audit.** `audit.withCompensatingAudit(servicePool, { auditIntent, mutate })`, and the bare
  `audit.writeAuditEntry(servicePool, input)`. Both open their OWN connection and transaction, so a line can never
  join another transaction. The wrapper writes the intent line and, when `mutate` throws, a second `_rolled_back` line.
  `writeAuditEntry` is already used from `apps/jobs`; the 13.1b sweep's actor is `actorId: null, actorRole: 'system'`.
  The input is `.strict()`: `pariwarId, actorId, actorRole, action, resourceLocator,
  requestPayloadHash` (SHA-256 hex), `responseStatus` (100–599), `traceId` — there is NO free payload. Actions match
  `/^[a-z0-9_]+(\.[a-z0-9_]+)+$/`; there is no closed action registry. Audit pairing is the CALLER's, and NO domain
  function calls the wrapper (12.1 QE15). The audit log is never scrubbed by erasure.
- **G14 — The data export.** `data-export/assemble.ts` lists consents by `consentType` (typed as a string). Its
  sections are strict-parsed ([[project_data_export_sections_strict_parsed]]). ⇒ 12.5 adds NO export section. The lead
  section is 12.3's (12.1's C8 (b)), carried.
- **G15 — No INBOUND partner path exists today.** `apps/api/src/modules/` has no partner-authenticated module. ⚠ The
  word "partner" does appear in a route: 12.2's admin registry, `GET` / `POST /api/v1/p/:pariwarId/modules/partners`
  (`apps/api/src/modules/marketplace/routes.ts`), which is session-guarded. `getCollectedRoutes(app)`
  (`apps/api/src/route-registry.ts`) returns every route's `{ method, url, preHandlers }`; `login-wall.spec.ts`'s
  `hasSessionGuard` (a non-exported local there, built on the `ADMIN_SESSION_GUARD` / `MEMBER_SESSION_GUARD` symbols)
  is the predicate for "carries the admin or member session guard". `channel-webhooks/` is the WA /
  Telegram ingress, NOT a partner path.
- **G16 — Migrations are hand-authored** (12.1 G13: `--> statement-breakpoint`; the journal is hand-added with a
  trailing newline; the snapshot is frozen at 0020, so NEVER run `db:generate`). `marketplace_modules` carries
  `marketplace_modules_pariwar_module_unique (pariwar_id, module_id)` (12.2), the target for a COMPOSITE FK (an FK check
  ignores RLS, so a single-column FK would let a row name another Pariwar's module). The members FK precedent is
  single-column `REFERENCES members(member_id)`; under a refuse-DELETE guard it must be `ON DELETE no action`, never
  cascade.
- **G17 — Gates this story meets.** CI has 40 jobs; the new static fence makes 41 (no code pins the count).
  `scripts/access-wrapper-invariants/check.ts` scans `packages/domain/src/marketplace` for a direct
  `audit.writeAuditEntry`, and its comment says the signing key is "read by no code here" — stale once this story
  lands (Task 7). Not tripped, checked: ESLint (only the `pg` value-import ban), governance-boundary, microcopy,
  pii-scrape, schema-diff, marketplace-module-state, the erasure fence, and domain-accessor (given `clampLimit`).

## ⚖️ Build decisions QE1–QE26 — ALL ANSWERED 2026-11-21, Decision `2026-11-21-483` (the option marked "recommended" is the one built; the others are kept as the record of what was considered)

- **QE1 — Home.** Domain: `packages/domain/src/marketplace/lead-handoff.ts`, `lead-envelope.ts`, `lead-member-fields.ts`,
  re-exported through the existing `marketplace` namespace barrel. Schema: `schema/marketplace_lead_handoffs.ts`; RLS:
  `policies/marketplace-lead-handoffs-rls.ts`. Field class: `encryption/field-classes.ts`. Jobs:
  `apps/jobs/src/scheduler/module-lead-handoff.ts` + `partner-lead-client.ts`. ⛔ API route (12.3 calls the seam from
  its own handler), ⛔ contracts (no route), ⛔ admin UI (K-3).

- **QE2 — ANSWERED (A) — per-lead consent, and who mints the value.**
  - **(A, recommended)** 12.5 mints `module_lead_handoff` (migration `NNNN`, alone; the contracts lockstep and the
    second pin). The handoff row stores the `consent_id` 12.3 records for THAT lead (`consent_artifact_ref = lead_id`),
    UNIQUE on the handoff table (one consent backs one handoff). Every check reads through that column, NEVER by
    subject (G5, G6; the full rule is P1).
    Cost: (i) it AMENDS `-427` QE10 ("is 12.3's to add") — the author-commit says so by name; (ii) it departs from the
    `consent_records.ts` header's "Do NOT seed types for surfaces that do not exist yet" — 12.5 never writes one, and
    its tests write the value directly; a dated line goes in that header.
  - (B) 12.3 mints the value, as `-427` QE10 says. Then 12.5 cannot type-check or test its consent leg, and must ship
    the leg behind a string. Cost: the one AC the epic makes load-bearing ("revocation … cancels") lands untested until
    12.3.
  - (C) A per-subject `consentExists`. Cost: G6 — one consent covers every offer, so a revoke on one offer can be masked
    by another.

- **QE3 — ANSWERED (A) — the signing scheme (12.1's C7).**
  - **(A, recommended)** HMAC-SHA-256 with the module's secret, the epic's wording. Header `X-TWT-Signature: t=<unix
    seconds>, v1=<lower-case hex>` — exactly ONE `v1`, signed with the `latest` version, over the exact bytes
    `"<t>." + body`. The receiver guide (in the ADR) asks for a constant-time compare and for refusing
    `|now − t| > 5 min`. The secret is 12.1's per-module NAME, so ⛔ schema change and ⛔ C10 relaxation. Several modules
    of one partner may name the same secret.
    **Rotation is the RECEIVER's dual-secret window:** ops add a new Secret Manager version; for the agreed window the
    partner accepts BOTH the old and the new secret; TWT signs with `latest` from its next tick. That follows §5.9's
    "dual-secret window" by analogy (that sentence is about provider webhook secrets), with no second signature
    (roster leg (f)).
    Cost: (i) NO non-repudiation — the partner holds the key, so a signature cannot prove in a dispute that TWT sent a
    lead; the evidence is TWT's own handoff row + audit line + the partner's 2xx. (ii) It supersedes architecture
    §3.7's "signed JWT (asymmetric …)" and §5.9's "Partner JWT signing keys" — recorded in the author-commit, and Task
    0.4 annotates EVERY partner-JWT sentence in place, NEVER rewriting one ([[feedback_supersede_never_reinterpret]]).
    (iii) The secret must reach the partner over a secure channel at onboarding (roster leg (f)). (iv) A partner that
    drops the old secret before TWT's next tick answers 401 until then (retried on the schedule — QE21 (C)). (v) The
    secret lives in the PROD project, because 12.1's NAME carries no project and `resolveSecretValue` reads
    `GOOGLE_CLOUD_PROJECT` — a recorded variance from §5.9's separate high-sensitivity tier. What a leaked HMAC secret
    allows is forging a lead TO that partner; it does not open member data.
  - (A2) As (A), but TWT sends TWO `v1` values during a rotation. Cost: a new domain resolver for enabled versions
    (`resolveSecretValue` reads `latest` only), `secretmanager.versions.list` for the jobs service account, and a rule
    for when the window ends. New capability for no gain over the receiver-side window.
  - (B) Asymmetric, the architecture's wording: an Ed25519 JWS (`alg: EdDSA`), the private key in Secret Manager, the
    partner holding the public key, with `jti` = `lead_id`. Cost: a way to give the partner the public key (new scope);
    a per-PARTNER key would move the key to `marketplace_partners`, which is C10's NOT NULL relaxation (a migration on
    an immutable table's trigger chain). Gain: non-repudiation, no shared secret.
  - (C) Both, chosen per module. Cost: two code paths and a manifest field. Recorded only as considered.

- **QE4 — The handoff row (`marketplace_lead_handoffs`).** One row per lead; the outbox and the delivery record in one.

  | Column | Type | Rule |
  |---|---|---|
  | `lead_id` | uuid PK, ⛔ default | = the `module.lead_submitted` payload's `lead_id` (caller-minted, lower-case) |
  | `pariwar_id` | uuid NOT NULL, ⛔ FK | tenant key (⛔ `pariwars` table) |
  | `module_id` | uuid NOT NULL | COMPOSITE FK `(pariwar_id, module_id)` → `marketplace_modules_pariwar_module_unique` (G16) |
  | `member_id` | uuid NOT NULL | FK `members(member_id)` `ON DELETE no action` (G16); = the event's `member_id` (12.1 I11) |
  | `consent_id` | uuid NOT NULL UNIQUE | FK `consent_records(consent_id)`; QE2 |
  | `envelope_version` | smallint NOT NULL | `CHECK (envelope_version = 1)` |
  | `member_fields_ciphertext` | `piiColumn(1, 'module_lead_fields')` NULL | ONE Tier-1 envelope of the sealed object (QE11); NULL after W9, W11 or W12 |
  | `status` | text NOT NULL | `due \| attempting \| delivered \| failed_delivery \| cancelled` — a named CHECK, LOCKSTEP with a domain tuple |
  | `outcome_detail` | text NULL | NULL until the first outcome; then QE10's FIXED vocabulary (a named grammar CHECK that admits NULL); ⛔ free text |
  | `attempt_count` | integer NOT NULL default 0 | `CHECK (attempt_count >= 0)`; raised AT THE CLAIM (W2) |
  | `next_attempt_at` | timestamptz NOT NULL default `now()` | the backoff (QE6) |
  | `claim_token` | text NULL | set at W2; a CHECK: `status = 'attempting'` ⇔ `claim_token IS NOT NULL` |
  | `claimed_at` | timestamptz NULL | the lease start; the same pair CHECK |
  | `held_since` | timestamptz NULL | the start of an unbroken run of holds (W6); cleared as QE6's rule says |
  | `partner_reference` | text NULL | ADVISORY (I3): from a response header only, `^[A-Za-z0-9_.-]{1,64}$`, else NULL |
  | `delivered_at` | timestamptz NULL | pair CHECK with `status = 'delivered'` |
  | `audit_id` | uuid NOT NULL, ⛔ FK | the caller's `module.lead_handoff_recorded` intent line |
  | `created_at` / `updated_at` | timestamptz NOT NULL default `now()` | `updated_at` set on every write |

  A CHECK ties the detail to the status: a FINAL status requires a NOT NULL detail with its own prefix (`delivered:`
  with `delivered`, `failed_delivery:` with `failed_delivery`, `cancelled:` with `cancelled`), and those prefixes appear
  with no other status; `released:` / `held:` / `lapsed:` / `requeued:` only with `due` or `attempting` — a claim
  keeps the previous detail.
  Indexes: `…_due_idx (next_attempt_at, updated_at) WHERE status = 'due'` (the claim); `…_attempting_idx (claimed_at)
  WHERE status = 'attempting'` (the lapse); `…_purge_idx (updated_at) WHERE member_fields_ciphertext IS NOT NULL AND
  status IN ('delivered', 'failed_delivery')` (W12); `(pariwar_id, module_id)`; `(pariwar_id, member_id)` (erasure +
  12.3's status read).
  **The guard trigger** (`BEFORE UPDATE OR DELETE`), written fresh (G2):
  - DELETE is refused.
  - `lead_id`, `pariwar_id`, `module_id`, `member_id`, `consent_id`, `envelope_version`, `audit_id` and `created_at`
    are immutable.
  - `member_fields_ciphertext` may only go NOT NULL → NULL. It never changes to another value and never comes back.
  - `status` moves only along the W rows of QE6. On a FINAL row (`delivered` / `failed_delivery` / `cancelled`) the
    only changes admitted are the ciphertext going NULL with `updated_at` (W11, W12) and W13.

  GRANTs: `twt_app` SELECT, INSERT, and UPDATE on EXACTLY the columns its writers touch — erasure (W11:
  `member_fields_ciphertext`, `status`, `outcome_detail`, `updated_at`) and the requeue (W13: also
  `attempt_count`, `next_attempt_at`, `held_since`). No DELETE. FORCE RLS with per-command policies, and an UPDATE
  policy AT BIRTH so erasure matches rows (G10). The sweep's writes run on the jobs login (Row 54 (g)).

- **QE5 — ANSWERED (A) — the v1 member-field allow-list (what 12.5 BUILDS; what may be USED is the Panel's — PQ2,
  RULED `-484` Q3 A: "The four, for every partner. The member sees all four on the form before agreeing." The form
  half is 12.3's — K-1).**
  `LeadMemberFieldsV1 = { full_name: string(1–120, the `storableText` rule), mobile: the canonical form
  `normalizeMobile` returns (refused when it returns null), district: string(1–120) | null, preferred_language:
  'hi' | 'en' }`, `.strict()`. The name is sent WHOLE, never shortened ([[feedback_never_mangle_member_names]]).
  (`storableText` is a non-exported local in `marketplace/filters.ts`: export it, or copy its rule under a lockstep
  test — the dev picks, recorded.)
  - **(A, recommended)** These four and nothing else, the same for every partner. NO DOB or age, NO Aadhaar / PAN, NO
    membership state, NO contribution or claim data, NO nominee, NO workplace beyond the district, NO health data, NO
    free text.
    Cost: (i) the PRD's "school, designation — pre-filled" (UJ-10) is NOT carried; (ii) a partner needing more fields
    needs a new envelope version AND a Panel ruling; (iii) a partner needing FEWER fields still receives all four — a
    per-module allow-list ("scope-redacted to partner-allowed fields per FR-66 wizard") is carried (K-4), because the
    manifest is immutable and a new manifest column means a trigger-chain change (12.1's C12). Cost (iii) is a
    disclosure breadth, so PQ2 asked it — accepted by `-484` Q3 A.
  - (B) Name + mobile only. Cost: a partner cannot route by district; offers in Bihar are district-run.
  - (C) Per-module field choice now. Cost: a 12.2 wizard change plus a manifest column plus the trigger chain — story
    sized, outside a PRIMITIVE.
  ⭐ The Panel chose the built four (`-484` Q3 A), so nothing here changes. A LATER ruling for FEWER fields would be a
  schema edit and a new envelope version — small, but code. A ruling for MORE is a new story.

- **QE6 — ANSWERED (A) — the delivery semantics, and the row's writes W1–W13 (the ONE copy; the guard and the domain tuple
  are in lockstep with this table).**
  - **(A, recommended)** AT LEAST ONCE, deduplicated by the partner on `Idempotency-Key: <lead_id>` (§3.7's "partner is
    contractually expected to dedupe by nonce"). A timeout or a dropped connection after the request was written is a
    TRANSIENT outcome and IS retried. This is the variance from 13.1b's at-most-once, because a lost lead is a member's
    registered interest silently dropped, while a duplicate is caught by the key.
    Cost: (i) the same lead can reach the partner up to 7 times per pass through the schedule (and again after a
    requeue). If the partner does NOT dedupe (no contract clause yet — roster leg (e)), a member may be contacted more
    than once. (ii) `Idempotency-Key` is THE dedupe key; the body's `nonce` is not one. (iii) The receiver guide and
    roster leg (e) require a 2xx for a replayed key. A partner that answers 409 to a replay lands as
    `failed_delivery:http_4xx:409` with its alarm — the contract, not the code, prevents that. (iv) A re-authored
    module (12.1's C10) gives the same member a NEW `lead_id`, which no key can dedupe.
  - (B) At most once (13.1b). Cost: every timeout ends as `failed_delivery:outcome_unknown`; a partner outage of minutes
    loses leads for good. It also drops the epic's "retries on transient failure with exp backoff", which would then
    be a recorded variance.
  - **The 1.12 keyed store is NOT used** (G7). The row's PK + status + claim token is the idempotency key, and the
    partner-side key is `lead_id`. The epic's "via Story 1.12 keyed store" is satisfied in substance and recorded as a
    variance.

  **Constants** (named, exported, never inline; each is also a test seam through the sweep's options, so no test
  waits or edits a frozen column): `RETRY_SCHEDULE_MS = [1 min, 5 min, 30 min, 2 h, 6 h, 24 h]`, `MAX_ATTEMPTS = 7`
  (≈ 32.6 h end to end), `LEASE_MS = 5 min`, `HOLD_RETRY_MS = 1 min`, `MAX_HOLD_MS = 24 h`, `AUDIT_RETRY_PAUSE_MS =
  200`, `TICK_BUDGET_MS = 45 s`, `LEAD_FIELDS_RETENTION_DAYS = 30`. Every sweep write uses
  `clock_timestamp()` (TR10).

  | # | Write | From → To | By | Sets | Detail |
  |---|---|---|---|---|---|
  | W1 | record | — → `due` | `recordLeadHandoff` (12.3's transaction, `twt_app`) | `attempt_count 0`, `next_attempt_at now()` | NULL |
  | W2 | claim | `due` → `attempting` | sweep | `claim_token`, `claimed_at`, `attempt_count + 1` | unchanged |
  | W3 | delivered | `attempting` → `delivered` | sweep, CAS | `delivered_at`, `partner_reference`; token, `claimed_at`, `held_since` NULL | `delivered:http_2xx:<code>` |
  | W4 | release (a transient outcome; the attempt stays counted) | `attempting` → `due` | sweep, CAS | `next_attempt_at = clock + RETRY_SCHEDULE_MS[attempt_count − 1]`; `held_since` NULL | `released:*` |
  | W5 | exhausted (a W4 outcome on attempt 7) | `attempting` → `failed_delivery` | sweep, CAS | — | `failed_delivery:retries_exhausted` |
  | W6 | hold (a fault that DEFINITELY sent nothing) | `attempting` → `due` | sweep, CAS | `attempt_count − 1`; `held_since = COALESCE(held_since, clock)`; `next_attempt_at = clock + HOLD_RETRY_MS` | `held:*` |
  | W7 | hold expired (a W6 fault when `clock − held_since ≥ MAX_HOLD_MS`) | `attempting` → `failed_delivery` | sweep, CAS | `attempt_count − 1` | `failed_delivery:hold_expired:<signing_key\|kms\|audit\|db\|dns>` (the word of THIS attempt's fault, whatever earlier holds in the run were) |
  | W8 | permanent | `attempting` → `failed_delivery` | sweep, CAS | — | `failed_delivery:(http_4xx:<code>\|http_3xx:<code>\|port_refused\|url_refused\|fields_unreadable)` |
  | W9 | cancel (P1–P5, QE22) | `attempting` → `cancelled` | sweep, CAS | `member_fields_ciphertext` NULL (QE24) | `cancelled:*` |
  | W10 | lapse (`claimed_at ≤ clock − LEASE_MS`) | `attempting` → `due`; → `failed_delivery` when `attempt_count ≥ MAX_ATTEMPTS` | sweep's lapse step (no token; it clears the token) | `next_attempt_at = clock + RETRY_SCHEDULE_MS[attempt_count − 1]`; `held_since` NULL | `lapsed:lease_expired` / `failed_delivery:outcome_unknown` |
  | W11 | erasure | any status, unchanged — except `due` → `cancelled` | `anonymizeMember` (`twt_app`) | `member_fields_ciphertext` NULL | `cancelled:member_erased` (the `due` row only) |
  | W12 | purge (QE24: final for longer than the retention constant, judged by `updated_at`) | `delivered` / `failed_delivery`, unchanged | sweep's purge step | `member_fields_ciphertext` NULL | unchanged |
  | W13 | requeue (QE21 (C)) | `failed_delivery` → `due` | `requeueLeadHandoff` (no production caller) | `attempt_count 0`, `next_attempt_at clock`, `held_since` NULL; refused when the ciphertext is NULL | `requeued:manual` |

  Rules that follow from the table:
  - "CAS" = `WHERE pariwar_id = $1 AND lead_id = $2 AND status = 'attempting' AND claim_token = $3`. Zero rows means
    another claim owns the row: the worker writes NOTHING and raises one `stale_claim` alarm. Never compare on
    `claimed_at` (a JS `Date` drops microseconds).
  - Every write that leaves `attempting` (W3–W10) clears `claim_token` and `claimed_at`. `held_since` is cleared by
    every write except W2, W6, W7, W11 and W12 — a lapse (W10) included, so a new run of holds starts a new clock.
  - Every status edge not in the table is refused by the guard. There is NO `due → due` and NO `due →
    failed_delivery`: a hold and a give-up both happen from `attempting`.
  - A lapse keeps the attempt counted, because the request may have been sent. A settle ALWAYS records the true
    outcome: a 2xx on a row whose member was erased mid-flight ends `delivered`, never `cancelled`.
  - Every row that reaches `failed_delivery` — by W5, W7, W8 or W10 — raises ONE `module_lead_handoff_failed` alarm
    carrying `lead_id`, `module_id` and the detail — the epic's "flagged for partner-relationship review", and K-3's
    trigger.
  - A hold raises ONE `module_lead_handoff_held:<word>` alarm per module per tick (per tick for the global words). If
    QE21 (C): the first 401 / 403 / 404 / `address_refused` per module per tick raises ONE
    `module_lead_handoff_setup_fault` alarm, so the retry window is not silent.
  - **Member-facing status** (architecture §3.7, derived for 12.3 by `getLeadHandoffStatus`, never stored): `due` /
    `attempting` → `pending_retry`; `delivered` → `delivered`; `failed_delivery` → `failed_delivery`; `cancelled` → NOT
    shown as a delivery status (12.3 decides its words; K-1). It never returns `partner_reference`.

- **QE7 — The cancel predicates P0–P5 (§0 edges 4 and 12; Policy meaning).** Checked IN THIS ORDER at step S6, on EVERY attempt
  and before any partner-side outcome is written (QE13), in ONE `withPariwarScope` transaction on the sweep's pool that
  COMMITS before any request, each stopping at the first failure. A cancel is final (W9), and NO decrypt happens.
  ⚠ On this pool RLS hides nothing (G12). P0 ties the member to the row's Pariwar first; after it, the two readers that
  take no Pariwar are safe, and every other read carries `pariwar_id` or uses a reader that does.
  - **P0 — the read is sound.** `memberExists(db, pariwarId, memberId)` must be true. The FK guarantees the member
    row, so `false` means the read is broken: W6 `held:db_unavailable`, never a send. This closes
    `getCurrentMemberState`'s permissive default.
  - **P1 — consent.** Through a NEW read, `consent.listConsentsForArtifact(db, pariwarId, subjectId, consentType,
    artifactRef)` in `consent/read.ts` — filtered in SQL on `consent_artifact_ref` (lower-case text), revoked rows
    INCLUDED, with a clamped limit (the domain-accessor gate). The row's own `consent_id` must be among the rows for
    this `lead_id` with `subject_id = member_id`, and NONE of them may have `revoked_at` set. Otherwise →
    `cancelled:consent_revoked`. (So a revoke that lands on a duplicate consent row for the same lead still cancels.
    `listConsents` is the wrong tool: it hides revoked rows and pages by subject — G5. The new read's limit is a small
    constant; a FULL page is a fault, not an answer: W6 `held:db_unavailable`.)
  - **P2 — erased.** `member_fields_ciphertext IS NULL`, or the lifecycle state is `anonymized` →
    `cancelled:member_erased`.
  - **P3 — membership ended.** The lifecycle state is `withdrawn` → `cancelled:member_withdrawn`. The
    moderation overlay (`member.moderation.getCurrentMemberModerationOverlay`) reads `terminated` →
    `cancelled:member_terminated`. A SUSPENDED member is still a member, and the lead is sent.
  - **P4 — frozen.** `listAccountFrozenMemberIds(db, [memberId], at)` contains the member, with `at` read from the
    database clock in the same transaction → `cancelled:account_frozen`.
  - **P5 — a death report stands (QE26 (A)).** `isDeathReportStanding(db, pariwarId, memberId)` →
    `cancelled:death_reported`. This is what still holds after the freeze LIFTS on a settled claim (G11).

  P4 reads the overlay and adds NO freeze source (I6), so `-147` cl.3 is not engaged by it. P5 neither writes nor
  widens the overlay, but it IS a second, durable death fact; QE26 weighs it. A lift does NOT revive a cancelled row. ⚠ A cancel
  is permanent for the member: one registration per offer (G1, QE21).
  The module's state is NOT one of these predicates; QE22 decides it.

- **QE8 — ANSWERED (A) — the send-time address and port policy (12.1's C7: SSRF / DNS rebinding).** In `partner-lead-client.ts`:
  - **(A, recommended)** Re-parse the stored URL and require the same 12.1 rules (defence in depth); a failure is W8
    `url_refused`. **Port: only the default (none written).** Any explicit port → W8 `port_refused`, with NO lookup and
    NO request. (A stored URL can never carry `:443` — G3 — so "explicit" means "not 443".)
    Resolve the host with `dns.lookup(host, { all: true, verbatim: true })`, raced against a 5 s timer (a failure or
    the timer is W6 `held:dns_unavailable`). Refuse the WHOLE send if ANY returned address is non-public. Build the
    table with `net.BlockList`, in ONE exported constant (a block list has no allow-range, so the IPv6 rule is written
    as its complement — `::/3`, `4000::/2`, `8000::/1` — plus the exclusions):
    - IPv4 blocked: 0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.0.2/24, 192.88.99/24,
      192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4, 255.255.255.255.
    - IPv6: allowed ONLY inside 2000::/3, minus 2001::/23, 2001:db8::/32, 2002::/16 and 3fff::/20. Everything else is
      blocked, which covers ::/128, ::1, ::/96, fc00::/7, fe80::/10, fec0::/10, ff00::/8, 100::/64, 64:ff9b::/96 and
      64:ff9b:1::/48. An IPv4-mapped address (`::ffff:a.b.c.d`, in dotted or hex form) is judged as its IPv4 — blocked or allowed as
      that address would be.

    A refusal is `address_refused`: a counted W4 (QE21 (C)), a W5 on attempt 7. NO request is made, and the authority
    joins the tick's `open` set.
    Connect to the FIRST IPv4 address, else the first IPv6, with `https.request({ host: <that address>, servername:
    <hostname>, headers: { host: <hostname> }, agent: false, signal })`. The connection goes to the address that was
    checked (closing DNS rebinding); no `lookup` option is passed, because none is consulted for an address literal.
    TLS verification stays ON and is judged against `servername`. NO redirects (a 3xx is W8 `http_3xx`). ONE
    wall-clock deadline of 10 s covers connect, write and the whole response (`AbortSignal.timeout`; `https.request`'s
    own `timeout` is idle-socket only and never trips on a slow drip). The OUTCOME is fixed by the status line: once the
    status and headers have arrived the outcome is known, the body is drained up to a 64 KiB cap for what is left of
    the deadline and then abandoned — a slow body never turns a 2xx into a timeout. (Resolve the outcome on the
    `response` event, and keep an `error` listener on the request and the response so an abort that comes later is
    swallowed.) The body is never parsed.
    Cost: a partner on `:8443` cannot receive leads, and the manifest is immutable, so the fix is re-authoring (C10).
    12.2's wizard does NOT yet refuse such a port at author time (K-6). There is no fallback to a second address in v1.
  - (B) Any port above 1023 as well. Cost: widens the reachable surface to arbitrary service ports on public hosts.
  - **The test seam.** `createPartnerLeadClient(options?)` takes ONE optional `testSeam: { lookup, allowAddresses,
    connectPort, ca, deadlineMs, dnsTimeoutMs }`. It is a constructor argument, NEVER an env var, and production boot
    passes NO argument (fence rule (e)). The pure policy functions (`classifyAddress`, the port rule) take no seam, so
    every range and port leg is a real test; the "no lookup was made" leg uses the seam's `lookup` as its spy. The seam only lets the
    live legs reach a local server: the real `https.request`, TLS and SNI still run.

- **QE9 — Secret resolution at send (12.2 QE11).**
  - Resolve per row through an injected `resolveSecret(name)`. Production wires `resolveSecretValue(name)`; tests
    inject a fake (G4). (`secrets.ts` builds a client per call and is not edited here; the per-tick cache below is
    what bounds the calls.)
  - Cache per tick and per name; NEVER across ticks, so a rotation is seen within one tick.
  - A resolution failure (NOT_FOUND or an outage — the `resolveSmsDltConfig` classification, G4) is a DEFINITE
    not-sent: W6 `held:signing_key_unavailable`, and the module joins the tick's `keyHeld` set, which the claim
    excludes (S3). After `MAX_HOLD_MS` of unbroken holds it is W7. The alarm says which of the two it was.
  - Never log, alarm or throw the secret's VALUE. The NAME may appear in an alarm (it is a pointer, 12.2).

- **QE10 — The detail vocabulary (`outcome_detail`).** Closed and grammar-checked (a named CHECK + a domain tuple):
  - `delivered:http_2xx:<3 digits>`
  - `released:http_5xx:<code>` · `released:http_408` · `released:http_429` · `released:timeout` · `released:network`
    · `released:http_401` · `released:http_403` · `released:http_404` · `released:address_refused`
  - `held:signing_key_unavailable` · `held:kms_unavailable` · `held:audit_unavailable` · `held:db_unavailable` ·
    `held:dns_unavailable`
  - `lapsed:lease_expired` · `requeued:manual`
  - `failed_delivery:http_4xx:<code>` · `failed_delivery:http_3xx:<code>` · `failed_delivery:port_refused` ·
    `failed_delivery:url_refused` · `failed_delivery:fields_unreadable` ·
    `failed_delivery:retries_exhausted` · `failed_delivery:outcome_unknown` ·
    `failed_delivery:hold_expired:(signing_key|kms|audit|db|dns)`
  - `cancelled:consent_revoked` · `cancelled:member_erased` · `cancelled:member_withdrawn` ·
    `cancelled:member_terminated` · `cancelled:account_frozen` · `cancelled:death_reported` ·
    `cancelled:module_withdrawn`

  NEVER an error message, a body, a header value, a hostname, an IP or a secret name.

- **QE11 — ANSWERED (A) — how the member fields are stored.**
  - **(A, recommended)** ONE Tier-1 envelope (`member_fields_ciphertext`, field class `module_lead_fields`) of the
    canonical JSON of the SEALED object `{ version: 1, nonce: <32 lower-case hex from randomBytes(16)>, …the QE5
    fields }`. `sealLeadMemberFields(encDeps, { pariwarId, leadId, fields })` validates the fields, mints the nonce
    and encrypts with `rowKey = leadId`, so a sealed string cannot be opened as another lead's — BEFORE 12.3 opens its
    transaction, so no KMS round trip runs while `submitModuleLead` holds the module row (G9). `recordLeadHandoff` takes
    the sealed string (it cannot read it; the sweep's decrypt under the same `rowKey` is the check). The sweep decrypts inside ONE audit line (`module.lead_handoff_fields_decrypted`) per attempt
    that reaches step S7, the 13.1b shape.
    Cost: one KMS encrypt per REQUEST that reaches the seal — a replay included — each with the API's own envelope
    audit line; and one audited decrypt per attempt that reaches S7 (≤ 7 counted attempts per pass, plus one per tick
    while a KMS or audit hold lasts, which is why such a hold ends the tick — QE13).
  - (B) Store nothing and re-read the member's fields at send. Cost: the partner would get what the member's record
    says at SEND time, NOT what the member CONFIRMED on the form, which breaks "member-consented data only". (The
    re-read still decrypts Tier-1 mobile, so the decrypt audit line stays.)
  - (C) Store in clear. Cost: refused by the house PII posture (mobile is Tier-1); listed only to be refused.

- **QE12 — The body (`LeadEnvelopeV1`, canonical JSON via `canonicalJsonStringify`).**
  `{ envelope_version: 1, lead_id, nonce, module_id, pariwar_id, partner_id, submitted_at (the row's `created_at`, ISO
  UTC — written in the event's own transaction, so it equals the event's `occurred_at` and the sweep never reads
  `events_log`), member: <the four QE5 fields>, attribution: { source: 'twt', pariwar_id, module_id, lead_id } }`.
  - `nonce` comes from the sealed object. It is what keeps the audit hash from being a guessable fingerprint of a
    name + a ten-digit mobile (QE14). It is NOT the dedupe key (that is `Idempotency-Key`).
  - The bytes are IDENTICAL on every attempt (nothing in the body depends on the attempt or the clock; `t` lives only
    in the signature header).
  - NO `member_id` (an internal id is NOT a partner's business; `lead_id` is the join key).
  - NO module text, NO commission terms, NO consent text.
  - Ids are lower-case, and the attribution header carries the same three ids as the body.
  - **Versioned per envelope**, and the partner contract names the version (architecture §3.7 "versioned
    per-partner": the envelope version IS the contract version in v1; a per-partner contract record is carried, K-4).

- **QE13 — The tick S1–S10 (the ONE copy), concurrency, breaker, fairness (§3.7 / §3.12).**
  The sweep is single-flight (`localConcurrency: 1`, its own `pg.Pool` with `max: 3`) and holds NO connection across a
  KMS, Secret Manager, DNS or HTTP call. It keeps two in-memory sets per tick: `keyHeld` (module ids) and `open` (URL
  authorities — `split_part(lead_handoff_url, '/', 3)`, exact because the stored URL is canonical).
  - **S1** The Row 26 guard (`rls_bound_role` → one alarm, end the tick).
  - **S2** Lapse (W10), then purge (W12, at most 100 rows) — each its own transaction.
  - **S3** Claim ONE row (W2): a MATERIALIZED CTE with `FOR UPDATE OF <the handoff alias> SKIP LOCKED` — never a lock
    on the module row, which `submitModuleLead` holds (NEVER an `IN (subquery LIMIT)` either —
    [[project_in_subquery_limit_skip_locked_overclaim]]), joined to `marketplace_modules`, `status = 'due' AND
    next_attempt_at <= clock`, EXCLUDING module ids in `keyHeld` and authorities in `open`, ordered `next_attempt_at,
    updated_at`. No row → the tick ends. Repeat S3–S10 until `TICK_BUDGET_MS = 45 s` has passed (a time budget, not a
    row count: a count caps throughput at a fixed number of leads a minute). The last pass may run past the minute;
    the 5-minute lease covers it, and the single-flight registration keeps ticks from overlapping.
  - **S4** Read the module (URL, secret name, `partner_id`, state, archive reason) with an explicit Pariwar predicate,
    and re-parse the URL and the port. **S4 and S5 only COMPUTE the partner-side verdict; they write NOTHING for the
    row.** The verdict is one of: ok · refuse (`url_refused`, `port_refused`) · withdrawn (the module is
    `trustee_archived` — QE22 (A)). "Withdrawn" outranks a refusal. If the module read itself throws → W6 `held:db_unavailable`,
    and the tick ends.
  - **S5** ONLY when S4's verdict is ok: resolve the secret (QE9), then DNS + the address check (QE8). The verdict may
    become: hold (`signing_key_unavailable`, `dns_unavailable`) · `address_refused`. A key hold adds the module to
    `keyHeld`; a DNS hold or an address refusal adds the authority to `open`.
  - **S6 — the member's side decides first, on EVERY attempt.** Run P0–P5 (QE7) in a scope transaction that commits.
    Then exactly one of, in this order:
    1. P0 false, P1's read returning a full page, or a predicate read throwing → W6 `held:db_unavailable` (or W7 when
       that hold has expired). The partner verdict is discarded. The first two are one row's problem; a throw ends the
       tick.
    2. A P1–P5 failure → W9 with that predicate's word.
    3. The verdict is "withdrawn" → W9 `cancelled:module_withdrawn`.
    4. The verdict is a refusal → W8; `address_refused` → W8 or a counted W4 / W5 (QE21); a hold → W6, or W7 when the
       hold has expired.
    5. The verdict is ok → S7.

    So no partner-side outcome — a hold, a refusal, a retry, or the final they lead to — is ever written for a row
    whose member-side check fails in that attempt. Two finals are written with the check absent or incomplete, both
    accepted and stated: W10's (a lapse means the attempt itself died) and a W7 `hold_expired:db` (the check could not
    be read for 24 h).
  - **S7** Decrypt inside ONE audit line. A retryable KMS fault → W6 `held:kms_unavailable`; the audit line failing →
    W6 `held:audit_unavailable` (each W7 when the hold has expired); an envelope that will not parse or authenticate, or fields that fail the schema → W8
    `fields_unreadable` (the 13.1b split in `field-worker/crypto.ts`).
  - ⚠ **A hold whose cause is global ENDS THE TICK** (the twin's rule): `kms_unavailable`, `audit_unavailable`, and
    `db_unavailable` when a query THREW — each further row would cost two audit lines under the global audit lock. A
    W7 for one of those words ends the tick too. P0 simply being false is one row's problem: that row is held and the
    tick goes on.
  - **S8** Build the body, sign it, POST it.
  - **S9** Write the `module.lead_handoff_attempted` line (QE14 (c)): up to 3 tries in all, `AUDIT_RETRY_PAUSE_MS =
    200` apart (a sweep option, so no test sleeps). If all three fail, write nothing more: the row stays `attempting`
    and lapses (at least once).
  - **S10** Settle: W3, W4 / W5, or W8. On a transient outcome add the authority to `open`.

  What this gives:
  - **Breaker (per tick, per authority).** After one transient failure, DNS hold or address refusal for an authority,
    its other rows are simply NOT CLAIMED this tick — no write, no hold, no budget spent. One flaky partner costs ONE request per tick and cannot
    starve the others. The cost is recorded as a variance from §3.7 ("opens after N consecutive failures; half-open
    after cooldown; closes after N consecutive successes"): NO cross-tick breaker state and NO open-circuit admin view
    (K-3, K-10).
  - The partner-side work (S4, S5) runs BEFORE the predicates and the decrypt, so a held row costs no audited
    decrypt, and the gap between the predicate commit (S6) and the request (S8) is as short as it can be (TR9).
  - Per-partner concurrency is 1 per jobs instance, by construction. A second jobs instance is safe: SKIP LOCKED at the claim, the token
    at every settle.

- **QE14 — Audit (G13).**
  - (a) **12.3's caller** wraps `submitModuleLead` + `recordConsent` + `recordLeadHandoff` in its own audit intents.
    12.5 documents that `recordLeadHandoff` takes the `auditId` of a `module.lead_handoff_recorded` intent line.
  - (b) **Per attempt that reaches S7**, the sweep writes ONE `module.lead_handoff_fields_decrypted` line through
    `withCompensatingAudit`, whose `mutate` is the decrypt and nothing else.
  - (c) **Per request made**, at S9 — AFTER the response (or the failure), BEFORE the settle — ONE bare
    `audit.writeAuditEntry` line: action `module.lead_handoff_attempted`, locator `module_lead/<lead_id>/attempt/<n>`,
    `requestPayloadHash = sha256(body)` (the epic's "full payload reference"), `responseStatus` = the HTTP status
    received, or the fixed synthetic `599` (timeout) / `598` (network) when none was. `outcome_detail` and
    `attempt_count` live on the ROW, not in the audit line (the line has no free payload). The line is NOT atomic with
    the settle and the story never claims it is; S9's order makes the line the earlier fact. After a requeue the
    attempt number restarts; the lines' own times order them.
  - The actor fields follow the 13.1b sweep's (`actorId: null`, `actorRole: 'system'`). NEVER a member field or the URL
    in any line.
  - The hash stays in a log erasure never scrubs. It is not a guessable fingerprint only because the body carries the
    nonce. Inside TWT the nonce exists only in the ciphertext, so once that is dropped (W9, W11, W12) TWT can no
    longer recompute the hash. The partner holds the body, nonce included.
  - ⚠ Variance from the epic's "every handoff is audit-logged … + delivery status": the line exists per REQUEST. An
    outcome with no request (a cancel, a refusal, a hold that expires) has no audit line of its own; the row records
    it and the alarm flags the failures. Recorded in the author-commit (QE20).

- **QE15 — The boundary, enforced (epic AC 2; I3, I4).**
  - (a) **No inbound partner path** — `apps/api/tests/integration/partner-boundary.spec.ts`, over
    `getCollectedRoutes(app)` (the `login-wall.spec.ts` precedent, so a path built at runtime is seen): every route
    with a body-accepting method (POST / PUT / PATCH / DELETE) whose URL matches
    `/partner|lead-outcome|lead_outcome|module-lead/i` MUST carry the admin or member session guard
    (the `hasSessionGuard` predicate, copied with its two guard symbols — it is not exported). A matching route
    without one is an inbound partner path and fails. 12.2's admin registry
    `POST …/modules/partners` passes because it is session-guarded; 12.3's member lead route will pass the same way.
    A planted unguarded route proves the leg bites.
  - (b) **Advisory only** — static: the column's names (`partner_reference`, `partnerReference`) may appear only in
    `schema/marketplace_lead_handoffs.ts`, `marketplace/lead-handoff.ts`, `apps/jobs/src/scheduler/module-lead-handoff.ts`
    and `apps/jobs/src/scheduler/partner-lead-client.ts` (an AST scan over `packages/domain/src`, `apps/api/src`,
    `apps/jobs/src`). `listFailedLeadHandoffs` may return it;
    `getLeadHandoffStatus` may not. A later admin view extends the list in its own story.
  - (c) **No authority import** — static: in `lead-handoff.ts`, `lead-envelope.ts` and the two jobs files, every use of
    the `member`, `consent`, `claim`, `contribution`, `pool` and `validityCache` namespaces (or a named import from
    their modules) must be on a (module, name) allow-list: `member.memberExists`, `member.getCurrentMemberState`,
    `member.listAccountFrozenMemberIds`, `member.moderation.getCurrentMemberModerationOverlay`,
    `claim.isDeathReportStanding`, `consent.listConsentsForArtifact` and
    `consent.resolveConsentById`. Anything else fails. In the jobs files the rule keys on the namespace (they import the `@twt/domain` barrel, so an import-graph
    scan cannot do this); in the two domain files it keys on the relative import path and the imported name.
  - (d) **The response body is never parsed** — static: no `JSON.parse` and no `.json()` in `partner-lead-client.ts`;
    only the status code and one header (`X-Partner-Reference`) are read.
  - (e) **No test seam in production** — static: every `createPartnerLeadClient(` call under `apps/jobs/src` has zero
    arguments.
  - Each rule has a planted violation that fails and a clean tree that passes.
  - ⚠ The fence's SEMANTIC limit is stated in its README: it proves the absence of the patterns it names, NOT that no
    future code path could launder partner data ([[feedback_gate_scope_semantic_coverage]]). The ADR names the review
    question every future inbound integration must answer.

- **QE16 — The erasure arm (W11).**
  - `member/anonymize.ts` gains ONE step in the same transaction, written as ONE drizzle `update(marketplaceLeadHandoffs)
    .set(…).where(…)` (the unit test's mock admits nothing else — G10): for the member's rows that still hold fields
    or are `due` (`WHERE … AND (member_fields_ciphertext IS NOT NULL OR status = 'due')`), `member_fields_ciphertext =
    NULL`; a `due` row also becomes `cancelled` with `cancelled:member_erased` (two `CASE` expressions on `status`).
    ⚠ The `WHERE` is load-bearing. Erasure is legal only for a withdrawn or terminated member, whose rows P3 has
    usually cancelled already with the fields gone; an unfiltered update would touch only `updated_at` on those final
    rows, and the guard refuses that — aborting the whole erasure.
    Import the schema table directly, never the `marketplace` barrel (a member ↔ marketplace init cycle —
    [[project_type_only_import_cycle_trap]]).
  - An `attempting` row keeps its status. If its request already went, the settle records the true outcome (QE6). If
    it lapses or is released, P2 cancels it at the NEXT attempt.
  - What erasure leaves on the row: `member_id`, `module_id`, `consent_id`, `partner_reference`, the status and the
    times. That is the same member↔offer link the retained event already holds (12.1's C8); the story does not claim
    erasure removes it (PQ3 (b) — RULED `-484` Q5 A: the bare fact of interest "is kept permanently, without their
    details", and the policy is to say so; counsel may still say whether the law permits it).
  - The table's UPDATE grant, its UPDATE policy and the guard's ciphertext rule exist AT BIRTH (G10).

- **QE17 — No production caller, and the cron.** `sealLeadMemberFields`, `recordLeadHandoff` and
  `requeueLeadHandoff` have NO production caller (I1; grep in Completion Notes). The sweep IS registered in `boot.ts` (the 12.2 activation
  precedent). With no rows it claims nothing. ⚠ Where the jobs login lacks grants on the new table, the tick's claim
  fails with 42501 every minute: the tick maps that to ONE `sweep_failed:<error name>` alarm per tick, and Row 54 (g)
  is the leg that ends it. Its go-live (the grant, Row 26; the secrets; the egress) is Row 54's.

- **QE18 — What 12.3 must do (the seam, written into K-1).**
  1. BEFORE the transaction: `sealLeadMemberFields(encDeps, { pariwarId, leadId, fields })` on what the member
     confirmed.
  2. In ONE READ COMMITTED transaction, after its own re-checks (12.1's C9): `submitModuleLead(client, …)` FIRST.
  3. If it returns `{ replayed: true }`: write NOTHING more and return the replay. (Recording the consent first would
     mint a second consent row on every replay — G5.)
  4. Otherwise `consent.recordConsent(db, { consentType: 'module_lead_handoff', consentArtifactRef: leadId, … })`, then
     `recordLeadHandoff(client, { pariwarId, leadId, moduleId, memberId, consentId, sealedFields, auditId })`.
  - `recordLeadHandoff` runs under a SAVEPOINT. A 23505 on `lead_id` or `consent_id` maps to
    `LeadHandoffAlreadyRecordedError`; with the order above it means a caller bug, not a replay.
  - The member's later "withdraw my interest" act revokes the consent rows whose `consent_artifact_ref = lead_id` (P1
    reads all of them). Building that act is 12.3's (K-1).
  - RVD2 (12.1 / `-433` QE21): the lead caller is where `submitModuleLead`'s retry loops on a drift. That is 12.3's
    caller-side decision. 12.5 adds NO module command and does NOT change the retry.

- **QE19 — ADR.** `ADR-NNNN-partner-lead-handoff-transport.md` (status `drafted`). It records:
  - the signing scheme, the rotation window and the receiver guide (QE3), with both §5.9 variances;
  - the delivery semantics and the W table (QE6);
  - the address policy (QE8);
  - the envelope v1 (QE12);
  - the variance from the architecture tree (no API surface here; the lead route is 12.3's);
  - the partners-as-downstream-consumers invariant: the epic's four prohibited patterns and its acceptable patterns,
    quoted; the philosophy in the epic's words; and the review question for any future inbound integration — "does any
    value this partner sends change what TWT believes about a member's lifecycle, validity, contributions or claims?"
    If yes, refused.

  It adds a row to `docs/knowledge-transfer/adr-index.md`.

- **QE20 — Records.** The author-commit decision (`2026-11-21-483`) recording QE1–QE26 (bar this one) and the twelve answers,
  committed ALONE (Task 0.3). It names, each by name:
  - what it AMENDS: `-427` QE10 (QE2 (A)); the `consent_records.ts` header's second sentence (QE2 (A));
  - what it SUPERSEDES for the lead transport: architecture §3.7 / §5.9's partner-JWT sentences and the
    secret-separation tier (QE3 (A));
  - its recorded VARIANCES: the epic's "via Story 1.12 keyed store" (QE6) and "every handoff is audit-logged … +
    delivery status" (QE14); §3.7's "TWT API generates … → POSTs" (a jobs sweep sends), its contract home
    (`packages/contracts/module-leads/` — none here), its breaker wording (QE13) and its "dead-letter to the
    partner-coordination admin queue" (an alarm and K-3 instead); the tree's `partner-leads/`;
  - what it DEFERS, leaving the source untouched: `-429` Consequence 3 (QE25);
  - what QE22 (A) adds to `-433` QE15's Withdraw (pending leads are cancelled).

  Then the records of Task 0.4, the Panel note and the counsel question (Task 0.5), and Row 54 (Task 0.6).

- **QE21 — ANSWERED (C) — what a failed handoff costs the member (G1: one registration per offer, ever).**
  Ways a lead ends `failed_delivery` that are nobody's intent: a secret pasted with a trailing newline (the partner
  answers 401 to every lead of that module); one wrong DNS answer; a key the jobs account cannot read for a day.
  - (A) Final is final. A 4xx other than 408 / 429, and `address_refused`, are permanent at once (W8); there is no
    requeue. Cost: every loss above stands, and the member cannot register again.
  - (B) A failure is recoverable by staff, and nothing else changes. `requeueLeadHandoff(client, { pariwarId, leadId
    })` — W13, the ONE edge out of `failed_delivery`, refused when the ciphertext is gone
    (`LeadHandoffFieldsGoneError`). It has NO production caller here (K-3's admin view is its caller, and pairs its own
    audit line), and every predicate runs again at the next attempt. Cost: one guard edge, one command, one more
    grant; I10's second sentence; nothing is recoverable until K-3 has a caller.
  - **(C, recommended)** (B), plus setup faults get time to be mended: 401, 403, 404 and `address_refused` are COUNTED
    TRANSIENT (W4) on the 32.6 h schedule, and the first one per module per tick raises the
    `module_lead_handoff_setup_fault` alarm, so the window is not silent. Every other 4xx stays permanent at once.
    Cost: (B)'s, plus a partner that truly rejects a lead with 404 is asked seven times; a variance from a strict
    reading of the epic's "permanent failure", recorded.
  - Whatever is chosen: `delivered` and `cancelled` stay final, a `cancelled` row is never revived, the alarm on every
    `failed_delivery` is built, and PQ4 tells the Panel. A requeue is a STAFF remedy with no caller until K-3, never
    something a member can ask for — so the Policy-meaning second sentence covers a failed delivery under every
    option.

- **QE22 — ANSWERED (A) — a lead whose offer was archived before it was sent (§0 edge 10).**
  - **(A, recommended)** Split by `archive_reason`. `trustee_archived` (the Trust itself withdrew the offer) → W9
    `cancelled:module_withdrawn` (S4's verdict, written at S6). `valid_until_reached` / `slot_capacity_exhausted` (the offer simply ended; the
    member registered while it was open) → DELIVERED. A withdrawal is the Trust's only stop switch, since the URL is
    immutable.
    Cost: (i) a member whose pending lead is cancelled by a withdrawal is not told by 12.5 (K-1). (ii) Withdraw needs
    NO step-up and any key holder may do it (`-433` QE15), so one admin finally cancels every pending lead of that
    offer. (iii) A correction IS a withdrawal plus a new module (`-427` QE11), so fixing a typo cancels the old
    offer's pending leads too; those members may register on the corrected offer, which is a new one. (iv) 12.2's
    shipped lead warning does not say any of this (K-11). (v) If 12.6 ever restores an archived module, the cancelled
    leads stay cancelled.
  - (B) Deliver always. Cost: after the Trust withdraws an offer — perhaps because of the partner — members' details
    keep going to that partner for up to 32.6 h, and nothing can stop it. That is the wide side of "to whom".
  - (C) Cancel on any archive. Cost: a member who registered on the last day silently loses the registered interest.
  - Whatever is chosen, 12.6's archive adds no handoff write of its own (K-2). In flight is in flight: an `attempting`
    row whose module is withdrawn after S4 is sent.

- **QE23 — ANSWERED (A) — a terminated member (P3).**
  - **(A, recommended)** The moderation overlay `terminated` cancels (`cancelled:member_terminated`). Niyamavali §8.4
    ends the membership on termination, and erasure is already legal for that member. It only narrows.
  - (B) Leave it out. Cost: a member the Trust has terminated still has details sent to a partner as "a TWT member's
    lead" for up to 32.6 h.
  - Recorded either way: suspension does NOT cancel. On the sibling branch `-477` Q6 A makes a fraud ban end every
    membership; if that lands as a termination it is covered by (A), and if it lands as a new state Task 0.1 adds it
    here.

- **QE24 — ANSWERED (A) — when what the member shared is dropped. The BEHAVIOUR is RULED `-484` Q4 A ("Removed at once
  if the send is stopped; removed 30 days after it is delivered or finally fails."); counsel may still change the
  number.**
  ⭐ A requeue (W13) means the earlier failure was not final: a requeued row that fails again starts its 30 days from
  that later failure (W12 judges `updated_at`). That matches "finally fails" — do NOT "fix" it to the first failure.
  - **(A, recommended)** `cancelled` → at once (W9, W11: nothing can need it again). `delivered` and `failed_delivery`
    → after `LEAD_FIELDS_RETENTION_DAYS = 30` (W12), a named constant. Cost: for 30 days the Trust can reproduce exactly
    what it sent, for a dispute; after that only the row, the audit hash and the partner's 2xx remain. A requeue
    is possible only inside the 30 days.
  - (B) Drop at every final status at once. Cost: no way to show what was sent, and no requeue at all.
  - (C) Keep indefinitely. Cost: the wide side; any finite answer to PQ3 (a) then needs new code.
  - Under (A) or (B), PQ3 (a) can only SHORTEN or lengthen a constant.
  - **Relation to `-423` Q1 (a)** (rulings table), stated and ⛔ decided. Its operative rule refuses an erasure
    REQUEST once a death is reported, and 12.5 MATCHES it: W11 runs only inside `anonymizeMember`, which that rule
    already gates. Against the author's reading stand the ruling's accepted cost — "Nobody — not the nominee, not the
    family — can have a dead member's record erased; it is kept indefinitely." — and its not-covered line, which
    leaves "the retention PERIOD and the legal basis for keeping a dead member's record" to counsel. This story treats
    its scheduled drop of a COPY of four fields (W9 on a death cancel, W12 later) as outside "a dead member's record".
    That reading is the AUTHOR'S, accepted by BigDev as PROPOSED (`-483`); PQ3 (a) put it to the Panel and counsel.
    `-484` Q4 A ratified the BEHAVIOUR "as put" (the note said the copy is removed on the same schedule "including a
    member whose death has since been reported") and gave no separate word on the reading: the reading stays the
    author's, ⛔ ratified, and `-423` is ⛔ amended. Counsel may still read it otherwise. If counsel reads the copy as
    inside the record, the change is small but not one line: any W9 for a member with a standing death report KEEPS the ciphertext, W12
    skips a member with a standing death report, the purge index and AC5's "ciphertext NULL" leg follow, and how long
    such a kept copy lives becomes counsel's retention answer.

- **QE25 — ANSWERED (A) — a partner whose endpoint needs a static token (`-429` Consequence 3).**
  - **(A, recommended)** NOT built in v1. The signature is the only authentication TWT offers; a partner that insists
    on a bearer token or an API key cannot be onboarded yet. Recorded as "Resolved via explicit deferral" on `-429`
    Consequence 3, with K-9's trigger. Cost: such a partner waits for a story.
  - (B) Build it: a second Secret Manager NAME per module, sent as `Authorization: Bearer …`. Cost: a new manifest
    column on an immutable table (12.1's C12 — the trigger chain), a 12.2 wizard field, and a second secret in every
    hold rule. Story sized, outside a PRIMITIVE.

- **QE26 — ANSWERED (A) — P5: does a standing death report stop the send after the freeze has lifted? (§0 edge 12)**
  The freeze lifts when a claim settles (G11). From then on P4 no longer sees the death.
  - **(A, recommended)** Build P5 now, on the narrow side, and ask the Panel without blocking (PQ6; Row 54 (a)).
    **RULED `-484` Q7 A**, as built: "Stop from the moment the death is reported, and stay stopped after the claim is
    settled." The Panel accepted cost (i) as put and chose the act the note called narrower than a wide reading of
    `-423`'s reason, so cost (iii) is answered.
    Cost: (i) the cancel is FINAL even if the report is later closed as false — a living member loses that place for
    good; (ii) it is a second, durable death fact, which 12.1's C4 reads as a new reason under `-147` cl.3 — Task 0.4
    annotates C4 and gives 12.4 the fact; (iii) `-423` Q1 (a)'s reason, as put, is about the agreement "the claim, the
    drive and the donors rely on"; read more widely (OUR reading, ⛔ the Panel's words) it would let a consented lead
    still go, and the Panel may say so.
    **The `-147` cl.3 re-examination, done here for the transport** (cl.3 makes it mandatory even when routing turns
    out not to be): (1) the directory exclusion predicate — untouched; P5 is read by the sweep only. (2) The ratified
    member-facing sentence (`-146`) — it is about the directory, and nothing a member sees there changes. Result: no
    directory change and no change to that sentence; P5 itself goes to the Panel as PQ6. 12.4's own re-examination
    for the shelf stays 12.4's.
  - (B) P4 only. Cost: once a claim has settled, nothing in the transport knows the member is dead: a failed lead
    requeued by staff is sent to the partner as a living member's interest.

## Invariants (I)

- **I1** — No production call site exists for `sealLeadMemberFields`, `recordLeadHandoff` or
  `requeueLeadHandoff`.
  With no rows, the sweep sends nothing. Proved by a grep in Completion Notes; 12.3 changes this.
- **I2** — Every attempt runs P0–P5 in a scope transaction that COMMITS before any partner-side outcome
  is written and before any request. NO request is made for a cancelled row, and no partner-side outcome is written
  for a row whose member-side check failed in that attempt. (A change that lands after that commit is TR9's window.)
- **I3** — Partner-provided data is advisory. Only `partner_reference` (≤ 64 safe characters) is stored, and nothing
  outside the four files of QE15 (b) names it.
- **I4** — No inbound partner route exists in `apps/api` (QE15 (a)). No handoff code uses a write entry point of
  member, consent, contribution, claim, pool or validity state (QE15 (c)).
- **I5** — The body holds only `LeadEnvelopeV1`. The member section is exactly the QE5 allow-list the member confirmed
  (decrypted from the row), NEVER a re-read of the member's record.
- **I6** — Nothing writes or widens the `account-frozen` overlay; `member/overlay.ts` and `claim/death-report.ts` are
  NOT edited. (P5 reads a separate, durable death fact; QE26 carries its `-147` cl.3 re-examination.)
- **I7** — `PERMISSION_CATALOG_VERSION`, roles and keys are unchanged. No new event TYPE on `events_log` (handoff
  facts live in the row and the audit log, NOT the event stream). 12.1's five events are untouched.
- **I8** — Nothing logged, alarmed, thrown or stored in `outcome_detail` carries a member field, the URL, a resolved
  address, a header value, a response body or a secret value.
- **I9** — A connection is made only to an address that passed QE8's check, on port 443, with TLS verified against the
  hostname, and with no redirect followed. Production passes no test seam.
- **I10** — A `delivered` or `cancelled` row never changes except by its ciphertext going NULL. A `failed_delivery` row
  changes only that way or by W13.
- **I11** — A settle or release writes only while it still owns the claim token. A request's recorded outcome is its
  true outcome. When it cannot be recorded (S9 or the settle failing), the row is left to its lease and ends at worst
  `failed_delivery:outcome_unknown` — never a false final.

## Acceptance Criteria

0. **AC0 — governance first.** QE1–QE26 and BigDev's twelve answers are in the author-commit (`2026-11-21-483`), committed
   ALONE before any code, and the story is amended to the recorded answers (Task 0.3). The Panel note is SENT and its
   ruling is recorded as `2026-11-21-484`, committed ALONE; the counsel question is WRITTEN. Row 54 exists with its (a)
   dated MET. The `deferred-work.md`, `epics.md`, architecture and docs records exist (Task 0.4), and so do the
   records `-484` makes owed (Task 0.7) — all before Task 1.
1. **AC1 — the schema.** Both migrations apply on a fresh DB (all files in one transaction) and on the current chain.
   `module_lead_handoff` is in the pgEnum and in `ConsentTypeSchema`; the lockstep test passes and
   `packages/contracts/tests/consent.test.ts` is amended to 14 values. `marketplace_lead_handoffs` has QE4's columns,
   named CHECKs, indexes, grants, FORCE RLS and per-command policies. The guard refuses each of:
   - a DELETE;
   - an immutable-column change;
   - a ciphertext change other than NOT NULL → NULL;
   - a status edge that is not a W row (including `due → due` and `due → failed_delivery`);
   - any change to a final row other than the ones I10 admits.

   Each refusal is a live-DB leg asserting the guard's own message. Every W row has a live-DB leg that passes.
2. **AC2 — the seam.**
   - `sealLeadMemberFields` refuses fields outside `LeadMemberFieldsV1` (`LeadHandoffFieldsInvalidError`), including a
     mobile `normalizeMobile` rejects, and seals a fresh nonce on every call. A string sealed for one `lead_id` does
     not decrypt as another's.
   - `recordLeadHandoff` refuses a consent that is not `module_lead_handoff`, is for another subject or Pariwar, is
     revoked, or whose `consent_artifact_ref` is not this `lead_id` (`LeadHandoffConsentInvalidError`).
   - A second call with the same `lead_id`, or with a `consent_id` already used, gives
     `LeadHandoffAlreadyRecordedError`, and the caller's transaction stays usable (the SAVEPOINT — 12.1 TR3).
   - It writes a `due` row with the sealed string, `attempt_count 0`, `outcome_detail` NULL and `next_attempt_at =
     now()`.
3. **AC3 — the envelope and the signature (QE3, QE12; I5).** For a fixed input, the body bytes and the
   header values equal frozen vectors. The body's keys are exactly `LeadEnvelopeV1`'s, and its member section is
   exactly the sealed fields. The bytes are identical across two attempts of one row. The signature verifies with a
   reference implementation in the test (an independent `createHmac` over `"<t>." + body`), and fails if the body
   changes by one byte or the timestamp changes. Exactly one `v1` is sent. The attribution header is exactly
   `pariwar=<id>, module=<id>, lead_id=<uuid>`.
4. **AC4 — the address policy (QE8; I9).**
   - Unit, on the pure functions (NO seam): a row for every blocked range, in v4, v6 and IPv4-mapped (dotted and hex)
     forms; a public v6 address outside 2000::/3 is refused; a host that resolves to one public and one private
     address is refused; with a v6 and a v4 answer the v4 is chosen. Through the seam's `lookup` as a spy: an explicit
     port is refused with NO lookup made.
   - Live, through the seam, against a local `https.createServer` with the committed fixture CA: the client connects to
     the checked address with SNI = the hostname; a certificate for a different name is refused; it follows NO
     redirect; a server that never answers AND a server that drips its HEADERS one byte at a time are both aborted at
     the wall-clock deadline; a server that sends a 2xx status line and then drips its BODY ends `delivered`; it
     discards the body past 64 KiB; it reads only the status and `X-Partner-Reference`; a DNS lookup that never
     returns ends as a hold (the seam's `dnsTimeoutMs`).
5. **AC5 — the cancel predicates (QE7).** For each of P1–P5 — P3's withdrawn AND terminated arms each
   with its own leg — and for QE22's withdrawn module, a live-DB leg sets the condition between `record` and the tick. The row ends `cancelled:<reason>` with its ciphertext NULL, the test
   server receives NO request, NO decrypt audit line is written — and a CONTROL row without the condition IS sent in
   the same tick, so "no request" cannot pass vacuously. Also:
   - P0: a member the scope read cannot see is HELD, not sent.
   - P1: a revoke on a second consent row for the same lead cancels.
   - P5: a member whose claim has settled (the freeze lifted, the death report standing) is cancelled as
     `death_reported`.
   - The order: a lapsed `attempting` row whose consent is revoked AND whose ciphertext is NULL reads
     `consent_revoked`. (A `due` row cannot show this: erasure cancels it first — QE16.)
   - A suspended member's lead is sent. A lead of a module archived by `valid_until_reached` is sent.
   - The member's side decides first (S6): a row with a revoked consent ends `cancelled:consent_revoked` when its URL
     carries an explicit port (not `port_refused`), when its key is missing (not held — on the FIRST such attempt),
     when its host resolves to a private address (not `address_refused`, and never `retries_exhausted`), and when its
     module was withdrawn (the member's word wins). Each with the fields dropped and no failure alarm.
   - P0 false with an explicit-port URL: the row is HELD (`held:db_unavailable`), not failed, and the tick goes on.
6. **AC6 — delivery outcomes (QE6, QE10, QE13; I11).** Against the test server, with the schedule and lease passed as
   options:
   - a 2xx → `delivered:http_2xx:<code>` with `delivered_at` and a sanitised `partner_reference` (an unsafe header
     value → NULL);
   - each transient class → `due` with the schedule's next time and the attempt counted;
   - the 7th transient failure → `failed_delivery:retries_exhausted`, and ONE `module_lead_handoff_failed` alarm;
   - a 4xx other than 401 / 403 / 404 / 408 / 429 → `failed_delivery` at once; a 3xx → permanent; an explicit-port URL →
     `port_refused`; a malformed stored URL → `url_refused`; a corrupt envelope → `fields_unreadable` — each with the
     alarm;
   - a 401 → `due`, counted, with ONE `module_lead_handoff_setup_fault` alarm for that module in the tick;
     a host that resolves to a private address → `due`, counted, the same alarm, NO request, and that authority's
     other row not claimed this tick;
   - a 409 to a replayed key → `failed_delivery:http_4xx:409` (QE6 cost (iii));
   - after a transient failure, a second due row for the same authority is NOT claimed in that tick (no request, no
     write, `attempt_count` and `updated_at` unchanged), while a row for another authority IS sent;
   - a lapse (the lease passed as an option) → `due`, counted, and the next tick re-sends with the SAME
     `Idempotency-Key` and the SAME body bytes; a lapse on attempt 7 → `failed_delivery:outcome_unknown`;
   - a stale worker (its row lapsed and was re-claimed) writes nothing and raises `stale_claim`;
   - a 2xx on a row erased mid-flight ends `delivered`;
   - `requeueLeadHandoff` moves a `failed_delivery` row to `due` and refuses one whose ciphertext
     is gone;
   - `getLeadHandoffStatus` returns QE6's mapping for each status and never a `partner_reference`;
   - the secret for one name is resolved ONCE in a tick that sends two rows of that module;
   - with `tickBudgetMs` passed as 0 the tick sends exactly one row.
7. **AC7 — holds (QE9, QE13).** A missing secret → `held:signing_key_unavailable`, the attempt NOT counted,
   `held_since` set, ONE `module_lead_handoff_held:signing_key_unavailable` alarm, and no other row of that module
   claimed this tick. A DNS fault holds the same way and its authority's other rows are not claimed this tick. A KMS
   fault, an audit-line fault and a predicate query that throws each hold the row and END THE TICK (a second due row
   is untouched). Each with NO request. A hold raised at S5 costs NO decrypt audit line. A row that already spent 30 h in ordinary retries and
   then meets a missing key is HELD, not failed. After `MAX_HOLD_MS` of unbroken holds (passed as an option) →
   `failed_delivery:hold_expired:<word>` with the failure alarm; one ordinary outcome OR a lapse in between clears
   `held_since`.
8. **AC8 — audit and silence (QE14; I8).** One decrypt line per attempt that reaches S7, and one attempted line per
   request made, whose `requestPayloadHash` equals the SHA-256 of the bytes the server received and whose locator ends
   in the attempt number. If the attempted line fails once and then succeeds, the row is settled with its true
   outcome; if all three tries fail, the row is NOT settled and lapses. No audit line, log line,
   alarm or `outcome_detail` carries a member field, the URL, a resolved address, a header value, a response body or
   the secret's value (a spy on `console.*` and the alarm sink, checked against the injected values).
9. **AC9 — erasure and purge (QE16, QE24).** `anonymizeMember` NULLs the ciphertext on every one of the member's
   handoff rows that holds one, in every status, cancels a `due` row (`cancelled:member_erased`), and leaves another
   member's rows untouched. It SUCCEEDS, and leaves them byte-unchanged, on the rows it will really meet: a `cancelled`
   row and a purged `delivered` row whose ciphertext is already NULL (seeded as W9 / W12 leave them). A tick afterwards sends nothing for that member. The purge NULLs a `delivered` and a `failed_delivery`
   row past the retention constant and no younger one. `rtbf-anonymize.test.ts`'s three pinned counts are raised by
   exactly this story's one step, and every other anonymize spec stays green.
10. **AC10 — the boundary fence (QE15).** `partner-boundary:test` covers rules (b)–(e), each with a planted violation
    that fails and a clean tree that passes. `partner-boundary:check` passes on the tree. It is wired into
    `package.json`, `scripts/ci-local.sh` and `.github/workflows/ci.yml` as its own job (41 jobs). Rule (a)'s spec
    passes on the tree and fails on a planted unguarded route. The README states the semantic limit.
11. **AC11 — the Row 26 guard and the tick.** Under an RLS-bound login the tick raises ONE `rls_bound_role` alarm and
    claims nothing. A throw in the lapse, the purge or the claim gives ONE `sweep_failed:<error name>` alarm and ends
    the tick. `registerModuleLeadHandoffCron` registers the queue and the per-minute cron; the sweep's own test pins
    `boot.ts`'s source text for the registration, the dedicated `max: 3` pool and both `…Pool.end()` sites (the
    `module-activation.test.ts` shape).
12. **AC12 — no production caller (I1), and the regressions.** The Completion Notes grep shows `sealLeadMemberFields`,
    `recordLeadHandoff` and `requeueLeadHandoff` called only from tests. The marketplace, consent, anonymize and
    data-export suites are green. `ci:local` passes with every job on a FRESH container
    ([[project_known_livedb_test_failures]] #18 — re-run the whole job).
13. **AC13 — the ADR and the docs (QE19, Task 8).** The ADR exists with every item of QE19, including the epic's
    prohibited and acceptable patterns quoted and the philosophy paragraph; `adr-index.md` has its row. The
    access-wrapper gate's comment and `docs/access-wrapper-invariants.md` carry this story's scope note (Task 7).

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (AC0). No code before 0.3 AND 0.7.**
  - [x] 0.1 (DONE 2026-11-21 by `bmad-dev-story` — see Debug Log References.) `git fetch origin`. Re-check the pin and `git diff --name-only 90535934..origin/main -- packages apps
        scripts`; re-derive every G fact by FUNCTION. Re-grep NUMBERS (decisions, migrations + `when`, ADR, ledger
        letter, roster row) on every ref AND in the live sibling worktrees, uncommitted files included. Confirm 12.3
        and 12.4 are still `backlog` (if 12.3 has started, read its seam
        first). Record `PERMISSION_CATALOG_VERSION`. Check whether `-477` Q6 A has landed and in what form (QE23).
  - [x] 0.2 BigDev answers the twelve ASKs (QE2, QE3, QE5, QE6, QE8, QE11, QE21, QE22, QE23, QE24, QE25, QE26), and
        accepts or amends the rest as a set — QE24's reading of `-423` put to him explicitly.
        **ANSWERED 2026-11-21, verbatim: "all as recommended, write the note".** So: QE2 (A), QE3 (A), QE5 (A), QE6 (A),
        QE8 (A), QE11 (A), QE21 (C), QE22 (A), QE23 (A), QE24 (A), QE25 (A), QE26 (A). What that answer did NOT cover, and
        Task 0.3 must still put to him before the author-commit: the non-ASK decisions "as a set", and QE24's reading of
        `-423` in terms (the Panel note's Q4 states it as our reading, not a ruling). **Both were then put to him and
        answered by selection, 2026-11-21:** the non-ASK set — "Accept as a set"; QE24's reading — "Record as proposed". Record the answers VERBATIM here.
  - [x] 0.3 (DONE 2026-11-21: Decision `2026-11-21-483`, committed alone at `24d930fc`; this file amended to the answers
        as v1.3. Every answer was the recommended one, so NO row of the rewrite map below was used; the map is kept as
        the record.) The author-commit, committed ALONE
        (`governance: Story 12.5 lead-handoff transport build decisions (Decision 2026-11-21-NNN)`), naming what it
        amends (QE20). Then amend THIS story to the recorded answers — every "AS PROPOSED", "(if QE21 …)", "(ONLY if
        QE26 (A))", "as answered" and conditional vocabulary word becomes the answered text — before Task 1. The
        **rewrite map** for a non-recommended answer was never used (every answer was the recommended one, and `-484`
        ratified the built answers it asked about). Its full text is kept in this file as of `97bc9c26` (v1.3).
  - [x] 0.4 (DONE 2026-11-21, eleven files, additive only. Two departures from the list below, both recorded in
        `deferred-work.md`'s 12-5 block: the bodies of `adr-0001-…` and `ADR-0044-…` are NOT annotated — an accepted
        ADR is not edited in place, and Task 8's ADR cross-references both; and no row was added to
        `docs/legal-counsel-engagement/review-artifact-roster.md` — a row is added there when the question is sent.)
        Records, written BEFORE code as dated "trigger MET — decided by `-NNN`" lines. Do NOT write "Closed by"
        here: those lines are Task 9.3's, after the code exists ([[feedback_record_unattested_no_backfill]],
        [[feedback_closure_language_precision]]).
        - `deferred-work.md`: a new "Deferred from: story 12-5-…" block with K-1 … K-11; dated lines on 12.1's C6, C7,
          C8 (a) / (b) / (c), C10 (12.5's half) and C13; on 12.2's "Secret Manager existence / resolution at send",
          "Partner endpoint / key on the partner entity", the §3.7 envelope item, the §3.7 contract-version item and
          RVD2 (12.5 adds no lead caller, so its half is unchanged); and on the D10-1.4 `partners/` leg. "C13" here
          is the operator-assisted-lead item (12.1 I11) — its line records that 12.5 adds no lead caller, so it is
          unchanged. If QE26 (A): a dated line on 12.1's C4 — the transport now keys on a durable death fact, and the
          re-examination C4 orders stays 12.4's. Grep every site that cites each item, not only its heading.
        - `packages/contracts/src/partners/README.md`: a dated note — its re-trigger ("Story 12.5's per-partner keys")
          was met and, under QE3 (A), keys stay per module.
        - `epics.md` "⭐ INHERITED FROM 12.5" under 12.3 (the seam, QE18; the withdraw-my-interest act; the
          member-facing status words; whether and how a member is told of a cancel or a failure; the export section),
          12.4 (the transport cancels on a death by itself, so 12.4 owns the shelf and the route, NOT the transport;
          the FACT for 12.4: the freeze lifts at settlement and `isDeathReportStanding` does not — what 12.4 does with
          that is its own re-examination under C4) and 12.6 (QE22 (A); an archive writes no handoff; a
          restore does not revive a cancelled lead).
        - Architecture: annotate in place EVERY sentence that `grep -n "JWT" architecture.md` returns about partners
          or leads (§3.7, §5.9's rotation line and the secret-separation list, "Provider authentication lifecycle", the
          directory tree's `partner/` entry, the integrations list) with "superseded for the lead transport by `-NNN`
          QE3". Never rewrite one. The same dated pointer goes on the partner-JWT text OUTSIDE the architecture:
          `docs/runbooks/secret-rotation.md` §2.3 (and its two mentions above it), `adr-index.md`'s reserved
          `ADR-NNNN-partner-jwt-signing-key-storage` row, `docs/adr/adr-0001-credential-escrow-mechanism.md`,
          `docs/escrow/README.md`, and ADR-0044's pointer to C7.
        - Docs that already name this story: `docs/runbooks/README.md` (the partner-coordination escalation row — a
          dated line pointing at K-10), `docs/escrow/credential-inventory.md` (the per-partner credentials row — Row 54
          (f)), `docs/knowledge-transfer/third-party-dependency-inventory.md` (the Panel ratifies the first partner
          contract — Row 54 (e)).
  - [x] 0.5 (WRITTEN 2026-11-21 on BigDev's "write the note", ahead of 0.3 / 0.4; Q1 revised before sending at
        `331541b6` / `35ff00e5`. **The note was SENT and RULED: Decision `2026-11-21-484`** (Trustee-ratified, DR + KB),
        verbatim "Q1 C, Q2 A, Q3 A, Q4 A, Q5 A, Q6 A, Q7 A," — committed ALONE `90e0f9ba`; the note's ruling block
        `a18a69ec`. The counsel question is WRITTEN and NOT recorded as sent. The note numbers its questions Q1–Q7:
        Q1 = PQ1 (a), Q2 = PQ1 (b), Q3 = PQ2, Q4 = PQ3 (a), Q5 = PQ3 (b), Q6 = PQ5, Q7 = PQ6, "Told" = PQ4. The PQ list
        below is the text AS ROUTED; read the answers in the rulings table, never here.)
        Write, and do NOT send, the Panel note from the template
        (`trustee-panel-routing-note-2026-11-21-12-5-partner-lead-data.md`; §0 passed per edges 1, 11 and 12) and the
        counsel question (`counsel-question-2026-11-21-12-5-partner-lead-transfer.md`, the
        `counsel-question-2026-11-01-14-3-…` shape). Read first, by absolute path in the main checkout, and cite by
        section or clause, never paste: the draft privacy policy §4.1 / §6 / §7 / §8; the trust deed's clauses on
        partner or commission income; PRD §4.9; OQ-4. The questions:
        Each question is written from the template: the plain question, the ONE fact that decides it, options with
        an honest cost on every option, evidence last.
        - **PQ1** (a) May the Trust send a member's details to a partner when the member asks, on the member's own
          consent for that one offer? (b) If a partner pays the Trust for leads, does that square with the draft
          policy's commitment not to sell personal data? Deciding fact: the draft policy's §6 (below). The policy edit
          before publication follows the answer.
        - **PQ2** Which details: the built four (QE5) for every partner — even one that needs fewer — or fewer, or none
          until counsel advises? Deciding fact: every partner receives the same four; nothing narrows per partner.
        - **PQ3** How long does the Trust keep (a) what the member shared — built: QE24's default, including for a
          member whose death has since been reported (is this copy inside `-423` Q1 (a)'s "never erased"?) — and (b)
          the record that the member asked (the event and the row's ids, which erasure does not remove — 12.1's C8)?
          Deciding fact: the draft policy's §8 has no row for a lead.
        - **PQ4** — TOLD, no choice carried: a sent lead cannot be recalled; the same lead can reach the partner up to
          7 times per pass if the partner does not dedupe (QE6 (A)); a member registers for each offer once,
          so a lead that is cancelled, or that fails and is not re-sent by staff inside the retention window (QE21 (C),
          QE24 (A) — and no staff screen can re-send yet, K-3), does not give the place back; what the transport withholds by itself (P1–P4, QE22 (A) and QE23
          (A)).
        - **PQ5** After a lead was delivered, if the member withdraws the agreement or is erased: does the Trust tell
          the partner, and does it ask the partner to delete? Deciding fact: nothing is built either way, and the
          partner agreement has no such clause yet.
        - **PQ6** (asked, not blocking the build — QE26 (A); RULED `-484` Q7 A) Once a member's death has been reported, the Trust
          stops passing that member's pending interest to a partner — also after the claim is settled, and for good
          even if the report later proves false. Confirm, or say otherwise. Deciding fact: `-423` Q1 (a)'s reason, as
          put, is that the member's agreement stands after death — said of the claim, the drive and the donors; whether
          it reaches a partner offer is exactly what is asked (the wider reading is OURS, and the note says so). State the
          relation to `-423` and `-424` in match / widen / narrow terms ([[feedback_panel_gate_read_ratified_verbatim]]).

        Counsel's half: how long the lead copy may be kept, including for a member whose death is reported (`-423`
        leaves "the retention PERIOD" to counsel); the controller-to-controller transfer (M-8); the partner
        data-handling agreement's minimum
        terms (purpose limit, dedupe by `Idempotency-Key`, deletion on request, breach notice — 14.3's Rule 7 duty, the
        processing location against the policy's §7); the paid-lead question; whether a health-camp partner's lead is
        sensitive by implication. ⭐ The note's "one fact that decides it": *the draft privacy policy, which members
        will accept at go-live, names no partner among those the Trust shares with, and says the Trust does not sell
        personal data.*
  - [x] 0.6 (DONE 2026-11-21: Row 54, eleven legs (a)–(k). Dated line `a18a69ec`: **(a) MET** by `-484`; (b)–(k)
        open; the row stays `open`. The legs below are the text as appended — the row's criteria are never edited,
        only dated.) Append Row 54 `partner-lead-handoff-live` to
        `docs/launch-gate-inventory/inventory-roster.md`
        (decision-authored). Its legs:
        - (a) the Panel's ruling on PQ1–PQ3, PQ5 and PQ6, recorded;
        - (b) counsel's return, recorded ([[feedback_record_unattested_no_backfill]]);
        - (c) the privacy policy §6 / §8 amended in `twt-legal` BEFORE publication, and §7 squared with where each
          partner processes;
        - (d) the consent copy approved, and the withdraw-my-interest act live (12.3);
        - (e) a signed partner data-handling agreement per partner, ratified as the third-party inventory requires,
          with the dedupe clause;
        - (f) each module's secret provisioned, shared securely, entered in the credential inventory, with the
          rotation window agreed;
        - (g) the jobs login grant on `marketplace_lead_handoffs` (Row 26);
        - (h) each partner endpoint on the production egress allow-list (the architecture's "Egress controls"), and
          the egress path can reach it over IPv4;
        - (i) 12.3 and 12.4 landed;
        - (j) someone sees a failed handoff: K-3's view is live, or the alarms have a named owner and the
          partner-coordination runbook exists (K-10);
        - (k) no live module carries an explicit port (K-6) — such a module fails every lead `port_refused`.
  - [x] 0.7 (DONE 2026-11-21, BigDev: "yes, commit and write the Task 0.7 records". `deferred-work.md`: dated lines on
        12.1's C6 and C8, on 12.2's field-list item, on 12.5's K-1, K-4, K-8 and K-12 (the sequencing superseded, the
        five owed steps), and the new item K-13; `epics.md`: one dated line at the end of 12.3's "INHERITED FROM 12.5"
        note; the counsel question revised to state the Panel's seven answers and to re-ask 3, 4 and 5 against them —
        still WRITTEN, NOT sent. No "Closed by" line anywhere.)
        **The records `-484` makes owed — additive, dated lines, BEFORE Task 1** (the sprint-status `al` entry lists
        them; a ledger comment does not reach the build, so they are tasks here). Write "RULED by `-484` Qn" — never
        "Closed by" (no code yet; counsel and the policy edit are open — [[feedback_closure_language_precision]]).
        - `deferred-work.md`: dated lines on 12.1's C6 and C8 (a) (the Panel's half ruled by Q1 C – Q5 A; counsel's
          half and the policy edit open); on 12.5's K-4 (Q3 A: the four for every partner — the per-module list's
          trigger "PQ2's answer" is MET and answered "no narrowing"), K-8 (the Panel half answered; counsel open) and
          K-12 (trigger MET by Q1 C; BigDev's "Build 12.5 now" SUPERSEDES its "before this story's Task 1" — quote the
          old sentence, never rewrite it — and the steps the correct-course owes, listed under K-12 below); and a NEW
          item K-13 (Q6 A's staff duty, below). Grep every site that cites each item, not only its heading.
        - `epics.md`: under the existing "INHERITED FROM 12.5" note for 12.3, a dated line: Q3 A's "The member sees all
          four on the form before agreeing", and the K-13 hook (12.3's withdraw act on a `delivered` lead). A dated
          note for the second route goes wherever the correct-course puts it — NOT invented here.
        - The counsel question: made current to `-484` (what the Panel ruled; what is left to counsel — the 30 days,
          whether a take-up commission is a sale, whether keeping the fact of interest is lawful, the notice wording
          of its question 10, and the second route's question 11). It stays WRITTEN until BigDev sends it.
        - The correct-course for the second route (K-12) is NOT 12.5's to run; it is recorded as owed, before 12.3.
- [x] **Task 1 — migrations (AC1).**
  - [x] 1.1 `NNNN_consent-type-module-lead-handoff.sql` — the single `ALTER TYPE "consent_type" ADD VALUE IF NOT EXISTS
        'module_lead_handoff';`, alone. The journal entry is hand-added. Then add the pgEnum value at the END of the
        `consent_records.ts` list (never reorder) with its comment and the dated header line (QE2), plus
        `ConsentTypeSchema` and the 14-value pin in `packages/contracts/tests/consent.test.ts`.
  - [x] 1.2 `NNNN+1_marketplace-lead-handoffs.sql` — the table, CHECKs, FKs, indexes, grants, FORCE RLS + policies, and
        the guard function + trigger (QE4, the W table), hand-authored (G16). It must not use the new enum literal
        anywhere (TR1). The Drizzle schema + RLS file are exported through the schema / policies barrels; the field
        class goes in `encryption/field-classes.ts` AND `encryption/index.ts`'s export list.
- [x] **Task 2 — pure modules (AC2 seal half, AC3, AC4 unit half).** `lead-member-fields.ts` (the QE5 schema + the
      sealed shape), then `lead-envelope.ts` (body, signature, attribution — QE3 / QE12), then the address table + the
      port rule (in `partner-lead-client.ts`'s pure half). Frozen vectors.
- [x] **Task 3 — domain commands (AC1 W legs, AC2, AC5–AC7 state half).** `consent/read.ts`: the ONE new read
      `listConsentsForArtifact` (P1). `lead-handoff.ts`: `sealLeadMemberFields`;
      `recordLeadHandoff`; `claimDueLeadHandoff` (S3); `readLeadHandoffPredicates` (P0–P5 in order);
      `settleLeadHandoffDelivered` / `releaseLeadHandoff` / `holdLeadHandoff` / `failLeadHandoff` / `cancelLeadHandoff`
      (all CAS) / `lapseLeadHandoffs` / `purgeLeadHandoffFields` / `requeueLeadHandoff`; reads
      `getLeadHandoffStatus` (QE6) and `listFailedLeadHandoffs` (admin shape, capped, `clampLimit` inline — 12.1 TR5).
      The errors go in `marketplace/errors.ts`. No function here calls the audit wrapper (G13).
- [x] **Task 4 — the egress client (AC4).** `partner-lead-client.ts` per QE8, with the ONE `testSeam` option. Commit
      the fixture CA and leaf under `apps/jobs/tests/fixtures/partner-lead/` (the `apps/api/tests/fixtures/kyc/` shape),
      with a note on how they were made.
- [x] **Task 5 — the sweep (AC5–AC8, AC9's purge half, AC11).** `module-lead-handoff.ts` in S1–S10's order. Register it in `boot.ts`, add
      `QUEUE_NAMES.MODULE_LEAD_HANDOFF`, give it its own pool, wire the secret resolver (QE9).
- [x] **Task 6 — erasure (AC9).** One step in `member/anonymize.ts` (QE16), with a comment in the file's own shape, and
      the three pinned counts in `rtbf-anonymize.test.ts`.
- [x] **Task 7 — the boundary fence (AC10, AC13).** `scripts/partner-boundary-invariant/` + the wiring + a README;
      `apps/api/tests/integration/partner-boundary.spec.ts`. Then the access-wrapper gate: correct the stale comment in
      `scripts/access-wrapper-invariants/check.ts` and add this story's scope note to
      `docs/access-wrapper-invariants.md` — the marketplace roots already cover the new domain files; the bare audit
      line is in `apps/jobs`, outside them, by design; the constant-time leg does not apply because TWT signs and
      never compares.
- [x] **Task 8 — ADR (AC13)** + the `adr-index.md` row.
- [x] **Task 9 — tests, `ci:local`, closure (AC1–AC13).**
  - [x] 9.1 Per Testing standards.
  - [x] 9.2 `ci:local` on a fresh container; the Completion Notes greps (I1, I6, I7).
  - [x] 9.3 Now, with the code committed, write the "Closed by `<sha>`" lines on the items this story's code closes
        (12.1's C7; C8 (c); 12.2's resolution-at-send item), and "Resolved via explicit deferral" with a re-trigger on
        the rest.

## Dev Notes

### Current state (what this story changes, what must be preserved)

- **`consent_records.ts`** — APPEND one pgEnum value at the end. Preserve every existing value, its comment and its
  order. Add the contracts lockstep and the second pin in the same commit.
- **`encryption/field-classes.ts`** + **`encryption/index.ts`** — ADD one constant and its named export.
- **`consent/read.ts`** — ADD one read (`listConsentsForArtifact`). No existing read changes.
- **`member/anonymize.ts`** — ADD one step, as one drizzle update. Preserve every other scrub and the transaction
  shape. The deceased-keyed scrubs (6.38) are NOT affected: a handoff is keyed by the MEMBER, so it is scrubbed only
  on that member's own erasure.
- **`apps/jobs/src/boot.ts`** — ADD one registration beside `registerModuleActivationCron`, with its own pool ended at
  both shutdown sites.
- **`packages/queue/src/index.ts`** — ADD one queue name.
- **`marketplace/filters.ts`** — at most, export `storableText` (QE5). Nothing else.
- **`docs/knowledge-transfer/adr-index.md`**, **`package.json`**, **`scripts/ci-local.sh`**,
  **`.github/workflows/ci.yml`**, **`scripts/access-wrapper-invariants/check.ts`** (a comment),
  **`docs/access-wrapper-invariants.md`** — one addition each.
- **Do NOT touch:**
  - `marketplace/commands.ts`, `project.ts`, `events.ts`, `state.ts` and the `marketplace_modules` trigger chain (I7;
    12.1's C12);
  - `member/overlay.ts`, `claim/death-report.ts` (I6);
  - `rbac/permissions.ts`;
  - `packages/events/src/registry.ts` (no new event type);
  - `domain/src/secrets.ts` (QE3 (A) needs no new resolver);
  - the data-export assemble sections (G14);
  - 12.2's wizard (K-6 is carried, NOT built).

### Traps (TR)

- **TR1 — `ADD VALUE` and the one-transaction migrator.** Drizzle applies all pending files in ONE transaction, and a
  value added in a transaction cannot be used until it commits (55P04). So the value gets its own file, AND `NNNN+1`
  must not mention `'module_lead_handoff'` as an enum in a CHECK, an index predicate or a seed. (Casting to text in an
  index predicate does not help: that cast is not immutable.)
- **TR2 — A per-subject consent check** passes the AC's words and fails its meaning (G6). Read through
  `consent_artifact_ref`.
- **TR3 — A 23505 aborts the caller's transaction.** `recordLeadHandoff` runs under a SAVEPOINT and rolls back to it
  before mapping (12.1 TR3).
- **TR4 — Global `fetch` cannot connect to a chosen address** without `undici`'s dispatcher (G8). Use `node:https` with
  `host` = the checked address and `servername` = the hostname. Connecting by hostname and only setting `servername`
  leaves DNS rebinding open.
- **TR5 — `IN (subquery LIMIT) … SKIP LOCKED` over-claims** — use a MATERIALIZED CTE.
- **TR6 — Ordering the claim by `created_at`** lets a failing head row block the queue. Order by `next_attempt_at,
  updated_at`.
- **TR7 — A decrypt inside the same wrapper as the send** writes a false `_rolled_back` when the SEND fails (13.1b TR2).
  The decrypt is the wrapper's only `mutate`.
- **TR8 — The jobs pool.** A transaction plus an audit line needs two connections. Use its own pool (`max: 3`), and
  hold NO connection across a KMS, Secret Manager, DNS or HTTP call.
- **TR9 — A send cannot be recalled.** A revoke or erasure that lands after S6's commit is NOT honoured for the
  attempt in flight: nothing re-checks between S6 and S8. It is honoured at the next attempt, if there is one. PQ4
  tells the Panel. Do NOT claim "revocation always cancels" in copy or tests.
- **TR10 — `now()` is the transaction start** (12.1 TR4). The sweep's writes use `clock_timestamp()`, and the lapse,
  the purge and each claim are separate transactions, as in the twin.
- **TR11 — The jobs pool bypasses RLS** (G12). A test that passes on a superuser connection proves nothing about
  tenant isolation: every sweep query carries `pariwar_id`, and the live-DB legs seed a second Pariwar whose rows must
  not move.
- **TR12 — Markdown in JSDoc.** `**…**/` closes a comment ([[project_markdown_emphasis_closes_jsdoc]]).
- **TR13 — Unicode test vectors** land raw ([[project_unicode_escapes_written_raw]]). Build Devanagari names in the
  fixtures with `String.fromCharCode`, and scan the added lines.
- **TR14 — The pre-push hook inherits `DATABASE_URL=:5432`** — prefix every `git push` with the story's port
  ([[project_prepush_hook_inherits_5432]]).
- **TR15 — `https.request`'s `timeout` is an idle-socket timer**, not a deadline. Use ONE `AbortSignal.timeout`, pass
  `agent: false` (Node 22's global agent keeps sockets alive), and race the DNS lookup against its own timer.
- **TR16 — A hold decrements a count the claim raised.** Write W6 / W7 as `attempt_count - 1` in the same UPDATE as
  the status, never as a separate statement.
- **TR17 — Copying the twin's guard or an older erasure arm** brings rules this story must not have (G2): the twin
  forbids a return to `due` after a lapse, and the 0143 / 0156 arm refuses a ciphertext going NULL.
- **TR18 — PG 16.16 RLS index quals** ([[project_pg1616_leakproof_cast_index_qual]]). The sweep runs on a login that
  bypasses RLS, but `getLeadHandoffStatus` and erasure run as `twt_app`: a cast on the outer side of a predicate turns
  an Index Cond into a Filter. Key those reads on `(pariwar_id, lead_id)` / `(pariwar_id, member_id)` with no cast.
- **TR19 — An unfiltered erasure update aborts the erasure** (QE16): it would touch only `updated_at` on rows that are
  already final with their fields gone, and the guard refuses that.

### Carried to sibling stories (K) — record in `deferred-work.md` "Deferred from: story 12-5-…" at Task 0.4

- **K-1 → 12.3:** the seam (QE18). Also: the member's withdraw-my-interest act (revoking by `consent_artifact_ref`);
  the member-facing words for `pending_retry` / `delivered` / `failed_delivery`, for a cancelled handoff, and for "one
  registration per offer"; the consent copy (Row 54 (d)); the data-export lead section (12.1's C8 (b)); RVD2's retry
  decision. Ratified for 12.3's form (`-484` Q3 A): "The member sees all four on the form before agreeing" — the
  fields 12.3 passes to `sealLeadMemberFields` are exactly what that form showed. ⚠ WHETHER a member is told that a lead was cancelled or failed, and in what words, goes through §0 at
  12.3's create-story — "is the person told" has been the Panel's before. 12.5 carries the question, not an answer.
- **K-2 → 12.6:** QE22 (A). An archive writes no handoff; the transport reads the archive reason itself. If
  12.6 restores modules, nothing in 12.5 changes, and a cancelled lead stays cancelled.
- **K-3 → no owner yet:** the partner-relationship admin view (the failed list, a requeue button calling
  `requeueLeadHandoff` and pairing its own audit line, an open-circuit view — §3.7 "helpdesk can resubmit via admin").
  12.5 builds the read, the command and the alarms only. ⭐ Trigger: the first
  `module_lead_handoff_failed` alarm in a non-test database, or the first live partner, whichever is first.
- **K-4 → no owner yet:** a per-module field allow-list ("scope-redacted … per FR-66 wizard") and a per-partner contract
  record (§3.7 "versioned per-partner"). ⭐ Trigger: the first partner whose contract needs fewer fields than QE5, a
  second envelope version, or PQ2's answer.
- **K-5 → no owner yet:** any inbound partner feedback (lead outcome, "not at this time" — PRD UJ-10). It must be
  advisory (ADR), persist + ack (§3.11), and re-open §0. ⭐ Trigger: the first partner offering an outcome callback.
- **K-6 → 12.2 (follow-up):** the wizard should refuse an explicit port at author time (QE8), so that an immutable
  manifest cannot be stranded. ⭐ Trigger: MET by `-483`; owner 12.2's follow-up.
- **K-7 → 12.4:** the transport's own death cancels (P4, P5) are NOT 12.4's suppression. 12.4 still owns the shelf and
  the lead route, and must know the freeze lifts at settlement.
- **K-8 → Panel / counsel (Row 54):** PQ1–PQ6 and the counsel question, as written at Task 0.5. The Panel half is
  RULED (`-484`; Row 54 (a) MET). Counsel's half is open (Row 54 (b)); the question was made current to `-484` at Task 0.7 and is NOT sent.
- **K-9 → no owner yet:** a partner auth header from Secret Manager (`-429` Consequence 3; QE25). ⭐ Trigger: the first
  partner that will not accept the signature alone.
- **K-10 → no owner yet:** the partner-coordination escalation runbook (`docs/runbooks/README.md` names this story as
  its candidate), a cross-tick breaker, and a second-address fallback. ⭐ Trigger: before Row 54 closes (its leg (j)
  names this runbook's owner).
- **K-12 → no owner yet (BigDev, 2026-11-21):** a second route — the partner's own form opened from the app in the
  phone's own browser (BigDev: no embedded web view), with tracking of where members give up. It is NOT part of this story: option B / C of the Panel note's Q1 and counsel's
  question 11. If the Panel or BigDev chooses it, Epic 12 needs a correct-course before this story's Task 1 (under B
  this transport is set aside; under C it is built beside the link). Details in `deferred-work.md`, 12.5's K-12.
  ⭐ **Trigger MET 2026-11-21: `-484` Q1 C** — both routes, offer by offer. **BigDev, 2026-11-21, by selection: "Build
  12.5 now"** — so the sentence above ("a correct-course before this story's Task 1") is SUPERSEDED for C: the
  transport is built as decided in `-483` (which `-484` says "stands"), and the correct-course comes before 12.3 and
  go-live instead. What the correct-course (or the story it mints) OWES, because nothing in 12.5 can do it yet:
  1. a per-module marker for which way the offer works (the manifest has none; every module has a NOT NULL
     `lead_handoff_url` and secret name — 12.1 I2 / C12's trigger chain);
  2. ⚠ `recordLeadHandoff` REFUSES a partner's-own-form module, and S4 CANCELS a row of one — the ratified promise for
     that route is "The Trust sends nothing", and a 12.3 bug would otherwise break it with no error;
  3. step totals or progress from a partner (the drop-off tracking) is INBOUND partner data: advisory only, under
     K-5's rules, the ADR's review question and the boundary fence — and member-by-member progress is NOT ruled;
  4. which offers go which way, and who chooses — NOT ruled; the second set of member wording;
  5. its own go-live row (Row 54's legs are the sending route's only).
  12.5 builds NONE of these, and no Task here may add a route column.
- **K-11 → 12.2 (follow-up):** the wizard's lead warning before Withdraw and before a corrected copy should say that
  pending leads will be cancelled for good (QE22 (A)). ⭐ Trigger: MET by `-483`; owner 12.2's follow-up.
- **K-13 → no owner yet (`-484` Q6 A):** after a lead was DELIVERED, if the member withdraws the agreement or is
  erased, "The Trust tells the partner and asks it to delete — a duty written into the partner agreement, carried out
  by staff." NOT ruled: who on staff, how staff learn of it, the clause's words. 12.5 builds NOTHING for it and adds no
  alarm or read for it. What already exists for whoever builds it: the handoff row survives erasure with `lead_id`,
  `module_id`, `member_id` and `status = 'delivered'` (QE16), so "which partners received this member's details" is a
  query on the `(pariwar_id, member_id)` index. The natural signals are 12.3's withdraw-my-interest act meeting a
  `delivered` lead, and `anonymizeMember` meeting a `delivered` row. The agreement clause is Row 54 (e)'s; so is Q2 A's
  "never per lead". ⭐ Trigger: the first partner agreement drafted, or 12.3's create-story, whichever is first.

### Testing standards

- **DB-free unit** (`packages/domain/tests/marketplace/`): `lead-member-fields.test.ts` (accept / reject per field,
  `.strict()`, the sealed shape), `lead-envelope.test.ts` (frozen bytes, signature vectors, the independent verifier,
  the attribution header). The address table and port rule are tested beside the client
  (`apps/jobs/tests/partner-lead-address-policy.test.ts`: every range × form; mixed answers; the port rule; the v4
  preference).
- **Live-DB** (`packages/domain/tests/integration/marketplace/`): `lead-handoff-schema.spec.ts` (AC1: every guard
  refusal by its message, every W row, RLS isolation from `PARIWAR_B`), `lead-handoff-commands.spec.ts` (AC2, P0–P5 and
  their order, the CAS), `lead-handoff-erasure.spec.ts` (AC9). Use `setupLiveDb` / `getTx`. A spec that commits uses
  its own pool and declares `hasDatabase` (12.1 TR11). Seed a state the commands cannot reach (a row on attempt 7, a
  `held_since` 25 h old) by a raw INSERT of a legal row — never by ALTERing the table or disabling the guard
  ([[project_test_only_ddl_use_pg_temp_clone]]).
- **Jobs** (`apps/jobs/tests/`): `module-lead-handoff.test.ts` against a local `https.createServer` with the committed
  fixture CA, through the client's `testSeam`. It covers AC4's live half, AC5–AC8 and AC11. Time is controlled only
  through the sweep's options (`leaseMs`, `retryScheduleMs`, `maxHoldMs`, `retentionDays`, `tickBudgetMs`,
  `auditRetryPauseMs`) — no fake
  timers around real sockets, no sleeping.
- Every "NO request" assertion sits beside a control that DID make a request in the same tick. Every "nothing
  survived" assertion names its reason and its control ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).
- **Contracts:** the `ConsentTypeSchema` lockstep test and `consent.test.ts`.
- **Fence:** `scripts/partner-boundary-invariant/lib.test.ts` and `apps/api/tests/integration/partner-boundary.spec.ts`.
- Run `ci:local` on a fresh container, DB named `twt_dev`, `DATABASE_URL` prefixed
  ([[project_known_livedb_test_failures]]).

### Project Structure Notes

- Everything domain-side lives in `packages/domain/src/marketplace/` (12.1 QE1), NEVER a `packages/marketplace`. NO
  contracts until a route exists.
- The jobs files follow `apps/jobs/src/scheduler/<name>.ts` + `<name>-client.ts` (the staff-email pair).
- New ADR files are named `ADR-NNNN-<slug>.md` (upper-case, the ADR-0042 … 0045 form).
- Variance from the architecture tree (`apps/api/.../partner-leads/`, `packages/contracts/module-leads/`): there is NO
  API surface in 12.5, and the lead route is 12.3's in `apps/api/src/modules/marketplace/`. Recorded in the ADR.

### References

- `_bmad-output/planning-artifacts/epics.md` — Epic 12, Story 12.5 + the INHERITED notes from 12.1 / 12.2.
- `_bmad-output/planning-artifacts/architecture.md` — §3.7, §3.11, §3.12, §5.9, "Replayable outbound dispatch",
  "Egress controls".
- `_bmad-output/implementation-artifacts/12-1-…md` — QE5, QE7, QE8, QE10, QE15, I9, I11, and its carried C6–C8, C10,
  C12, and the operator-assisted-lead item (its `deferred-work.md` C13).
- `_bmad-output/implementation-artifacts/12-2-…md` — QE11, Carried → 12.5.
- `.decision-log.md` — `-427` (QE10, Consequence 3), `-429` (A2 (iii), Consequence 3), `-433` (QE11), `-147` cl.3,
  `-146`, `-210` cl.2, `-366` decision 6, `-423` Q1 (a), `-424`, `-425`, `-469` item 3. Grep the bare number.
- `deferred-work.md` — "Deferred from: story 12-1-…", "… 12-2-…".
- `apps/jobs/src/scheduler/field-worker-code-sms.ts` + `packages/domain/src/field-worker/code-sms.ts` (the sweep
  twin), `staff-email-client.ts` (the client twin), `module-activation.ts` + its test (the registration twin).
- `packages/domain/src/consent/`, `secrets.ts`, `member/anonymize.ts`, `member/overlay.ts`, `member/read.ts`,
  `member/moderation/overlay.ts`, `member/rtbf-legality.ts`, `claim/death-report.ts`, `encryption/`, `audit/write.ts`.
- `apps/api/src/route-registry.ts`, `apps/api/tests/integration/login-wall.spec.ts` (the route-fence precedent).
- `docs/legal/` (MAIN checkout, git-ignored — cite by section, never paste), `docs/legal-corpus-location.md`.
- `trustee-panel-routing-note-TEMPLATE.md` (§0 first).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 12.5` on the story worktree.

### Debug Log References

- **Task 0.1 (2026-11-21).** `git fetch origin`: `origin/main` = `e5e13f92` (unchanged since the rebase) and an ancestor
  of HEAD; `git diff --name-only e5e13f92..origin/main -- packages apps scripts` is EMPTY, so every G fact stands as
  re-derived at the rebase. NUMBERS, re-grepped on every ref (heads and remotes) and in the five live sibling worktrees
  (uncommitted files included): migrations — highest anywhere is `0213` (`main`, `when` `1797998580000`); no sibling
  worktree has a file above `0212` ⇒ this story takes **`0214`** + **`0215`**, `when` > `1797998580000`. Decisions —
  highest is `-484` (this branch) ⇒ a later one is ≥ `-485`. ADRs — highest `ADR-0045` ⇒ **`ADR-0046`**. Roster — `Row
  54` is this story's; no sibling has a `Row 55`. Ledger — this branch's last is `an`; siblings' are `ac` (3-13), `ag`
  (3-15), `ae` (governance), `z` (6-39a) ⇒ the next is ≥ `ao`. `PERMISSION_CATALOG_VERSION` = **65** (recorded only;
  I7). Sprint rows: `12-3-…` and `12-4-…` are `backlog` (no seam to read first). QE23: `-477` Q6 A ("The ban ends every
  membership") has NOT landed in code — 6.22b (`done`) shipped only the death-certificate guard (0213) and adds no
  member state or moderation status ⇒ QE23 (A) stands as written; nothing added.
- **Live DB.** A story-owned container `twt-12-5-pg` on `:5455` (`postgres:16-alpine`, 16.14), DB `twt_dev`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (`bmad-create-story 12.5`,
  2026-11-21).
- **Built (`bmad-dev-story 12.5`, 2026-11-21), Tasks 1–9, on the story branch; ⛔ landed.** Commits: `2b2d1b83` (Task 0.1 record),
  `c16bcf75` (Tasks 1–3), `979d8035` (Task 4), `79723a77` (Task 5), `dbe6737e` (Task 6), `b8e17904` (Task 7), `8269daaf` (Task 8), then
  the records commit (9.3). Every decision is `-483`'s as answered; ⛔ new decision was taken.
- **Migrations `0214` + `0215`** (`when` `1797998640000` / `1797998700000`, above 0213's). `0214` is the `ADD VALUE` alone; `0215` never
  names the literal (TR1) — a fresh DB applies the whole chain in one transaction (verified twice by recreating the container).
- ⚠ **A CHECK bug found and fixed before commit, recorded:** the status↔detail CHECK as first written admitted a FINAL row with NO detail —
  `NULL LIKE …` is NULL and a CHECK that evaluates to NULL passes. Each final branch now says `IS NOT NULL` (SQL and the Drizzle twin);
  a schema-spec leg pins it.
- ⚠ **Node `net.BlockList` trap, recorded:** one list holding both families blocks EVERY IPv4 address — `check(v4, 'ipv4')` also tests
  the v4 address against IPv6 rules through its mapped form, and `::/3` covers `::ffff:0:0/96`. `NON_PUBLIC_ADDRESSES` is therefore ONE
  exported constant holding a list PER FAMILY (QE8's "one exported constant" kept). A unit leg pins why.
- **Dev picks the story left open, recorded:** (i) QE5's `storableText` is EXPORTED from `marketplace/filters.ts` (the one copy, ⛔ a
  lockstep twin). (ii) The name and district are kept byte for byte (⛔ trimmed) but refused when blank. (iii) A KMS `key_rejected` on
  the decrypt is `fields_unreadable` (W8) AND ends the tick — the 13.1b CB44 rule (a wrong key reference rejects every row). (iv) A
  module row that reads back as NULL at S4 (the composite FK makes that a broken read) is a NON-global `held:db_unavailable`; a THROW at
  S4 is global and ends the tick, as QE13 says. (v) An HTTP status outside 200–599 is `released:network`. (vi) An empty-string secret is
  treated as NOT_FOUND. (vii) `recordLeadHandoff` also refuses a sealed string that does not parse as an envelope
  (`LeadHandoffFieldsInvalidError(['sealedFields'])`) — it still cannot READ it. (viii) A consent with no `consent_artifact_ref` is
  `wrong_artifact`.
- **AC2's consent-id leg** cannot be reached through `recordLeadHandoff` (the artifact rule refuses first), so the 23505 mapping is proved
  with a raw-seeded row already naming the consent — stated in the spec.
- **AC6 "a stale worker"** is proved by a client double that lapses and re-claims the row DURING the request (the real domain commands);
  **AC7 audit / predicate faults** by a pool proxy that throws on the chosen statement only. Time moves ONLY through the sweep's options
  (zero schedules / holds, `tickBudgetMs: 0`, `leaseMs: 0`, `maxHoldMs: 0`, `retentionDays: 0`); ⛔ fake timers, ⛔ a frozen column
  edited.
- **Fixtures:** a test CA (its key DELETED after signing) and leaves for `partner.test` / `other.test`, valid to 2126 (⛔ a date bomb);
  the sweep's live test serves both names from one server by SNI.
- **Counts:** domain — schema spec 62, commands spec 41, erasure spec 4, unit 34 (+1 anonymize leg; the pinned counts 33 / 29 / 30 → 34 /
  30 / 31); jobs — address policy 103, client 10, sweep 48 (4 unit + 44 live); fence 12 + the api route spec 2; contracts consent 15
  (14 values). Regressions: every anonymize live spec + the marketplace / consent / member suites — 66 files, 1189 tests.
- **`ci:local` PASSED — 41 job(s) green** on a FRESH container (`twt-12-5-pg`, :5455, DB `twt_dev`) at `8269daaf` (the new
  `partner-boundary-invariant` job is the 41st; `ci.yml` has 41 jobs).
- **I1 grep:** `git grep -nE "\b(sealLeadMemberFields|recordLeadHandoff|requeueLeadHandoff)\(" -- 'apps/*/src' 'packages/*/src'`
  minus the three definitions ⇒ **0 hits** — every caller is a test. The sweep IS registered in `boot.ts` (QE17) and claims nothing while
  no row exists.
- **I6:** `git diff --stat e5e13f92 HEAD -- packages/domain/src/member/overlay.ts packages/domain/src/claim/death-report.ts` ⇒ empty.
  **I7:** ⛔ diff in `rbac/permissions.ts` (`PERMISSION_CATALOG_VERSION` still **65**), `packages/events/src/registry.ts`,
  `marketplace/{events,commands,project,state}.ts`, `secrets.ts` ⇒ 0 lines; ⛔ new event type.
- **9.3 records:** "Closed by" lines on 12.1's C7 (`c16bcf75` + `979d8035` + `79723a77`), C8 (c) (`c16bcf75` + `dbe6737e`) and 12.2's
  "Secret Manager existence / resolution at send" (`79723a77`) — each marked "⛔ landed yet". Every other routed item already carries its
  "Resolved via explicit deferral" or "RULED" line from Task 0.4 / 0.7, and the K items their triggers — ⛔ re-written.
- **Still OPEN, ⛔ 12.5's to close:** roster Row 54 (b)–(k) (go-live, ⛔ merge); the counsel question (WRITTEN, ⛔ sent); the Epic 12
  correct-course for K-12 (being run by a separate session on `correct-course/12-5-k12-partner-form-route`, cut from `8269daaf`, which takes
  decision ≥ `-485` and ledger ≥ `ap`); ADR-0046 ratification (⛔ claimed).

### File List

- `packages/domain/migrations/0214_consent-type-module-lead-handoff.sql` (new)
- `packages/domain/migrations/0215_marketplace-lead-handoffs.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/marketplace_lead_handoffs.ts` (new) · `schema/index.ts` · `schema/consent_records.ts`
- `packages/domain/src/policies/marketplace-lead-handoffs-rls.ts` (new) · `policies/index.ts`
- `packages/domain/src/encryption/field-classes.ts` · `encryption/index.ts`
- `packages/domain/src/consent/read.ts`
- `packages/domain/src/marketplace/lead-member-fields.ts` (new) · `lead-envelope.ts` (new) · `lead-handoff.ts` (new) · `errors.ts` ·
  `filters.ts` · `index.ts`
- `packages/domain/src/member/anonymize.ts`
- `packages/domain/tests/marketplace/lead-member-fields.test.ts` (new) · `lead-envelope.test.ts` (new)
- `packages/domain/tests/member/rtbf-anonymize.test.ts`
- `packages/domain/tests/integration/marketplace/_lead-handoff-fixtures.ts` (new) · `lead-handoff-schema.spec.ts` (new) ·
  `lead-handoff-commands.spec.ts` (new) · `lead-handoff-erasure.spec.ts` (new)
- `packages/contracts/src/consent/consent-record.ts` · `packages/contracts/tests/consent.test.ts`
- `packages/queue/src/index.ts`
- `apps/jobs/src/scheduler/partner-lead-client.ts` (new) · `module-lead-handoff.ts` (new) · `apps/jobs/src/boot.ts`
- `apps/jobs/tests/partner-lead-address-policy.test.ts` (new) · `partner-lead-client.test.ts` (new) · `module-lead-handoff.test.ts` (new)
- `apps/jobs/tests/fixtures/partner-lead/{README.md,ca-cert.pem,partner-cert.pem,partner-key.pem,other-cert.pem,other-key.pem}` (new)
- `apps/api/tests/integration/partner-boundary.spec.ts` (new)
- `scripts/partner-boundary-invariant/{lib.ts,check.ts,lib.test.ts,README.md}` (new)
- `scripts/access-wrapper-invariants/check.ts` (a comment) · `docs/access-wrapper-invariants.md`
- `package.json` · `scripts/ci-local.sh` · `.github/workflows/ci.yml`
- `docs/adr/ADR-0046-partner-lead-handoff-transport.md` (new) · `docs/knowledge-transfer/adr-index.md`
- `_bmad-output/implementation-artifacts/deferred-work.md` · `sprint-status.yaml` · this story file

### Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-21 | v1.0 | Created by `bmad-create-story 12.5` on its own worktree at `90535934`. Six ASKs open with BigDev (QE2, QE3, QE5, QE6, QE8, QE11); the Panel note and the counsel question are planned at Task 0.5 (written, not sent); NO code before Task 0.3. |
| 2026-11-21 | v1.1 | Validated by `bmad-create-story validate 12.5` (BigDev: "all"), re-derived at `90535934`. Corrected facts: G1 (one registration per offer), G2 (what the twin has), G4, G5, G7, G10, G11, G12, G13, G15; new G17. Design: the row's writes restated as ONE table W1–W13 with a claim token, holds that do not count, a defined lapse and `held_since`; the tick as S1–S10 with the breaker moved into the claim; predicates P0–P5 (a sound-read check, the consent read through the lead, the standing death report); the seal moved before the transaction and the seam re-ordered (submit first); the audit lines fitted to the audit writer and a body nonce added; one signature with a receiver-side rotation window; the client's wall-clock deadline, v6 allow-range and single test seam; the route leg of the fence moved to an `apps/api` spec keyed on the session guard. Governance: `-427` QE10 quoted and named as amended; the privacy policy treated as a draft, with its no-sale, cross-border and withdrawal sections routed; PQ5 added; legal text no longer pasted; Task 0.4's closure words moved after the code; the rewrite map completed; AC13 added. Six new ASKs: QE21 (a failed handoff), QE22 (a withdrawn offer), QE23 (a terminated member), QE24 (retention, and its relation to `-423`), QE25 (a partner token), QE26 (a standing death report — PQ6). Also changed from v1.0: the tick's 20-row cap became a 45 s budget; "a 4xx other than 408 / 429 is permanent" now sits inside QE21; the PG 16.16 trap is TR18. This story's carried items renamed K-1 … K-11. NUMBERS re-read at ~18:20. The rewrite was itself re-validated by fresh-context rounds before commit, and their findings are applied above: an erasure update the guard would refuse; a misquoted reason of `-423`; holds that did not end the tick; and a partner-side outcome outranking a member-side cancel — closed by making S6 decide first on every attempt. |
| 2026-11-21 | v1.2 | Task 0.2 answered by BigDev, verbatim "all as recommended, write the note" (the twelve ASKs as recommended; QE21 (C)). Task 0.5 done ahead of 0.3 / 0.4 on that instruction: the Panel note (Q1–Q7 + Told) and the counsel question (nine questions) are WRITTEN, not sent. Still owed before any code: the author-commit (Task 0.3, ≥ `-483`) with the story amended to the answers, the records (0.4) and Row 54 (0.6). |
| 2026-11-21 | v1.3 | Task 0.3: the author-commit is Decision `2026-11-21-483` (`24d930fc`, alone). BigDev's answers, verbatim: "all as recommended, write the note" (the twelve ASKs), "do it", then by selection "Accept as a set" (the fourteen non-ASK decisions) and "Record as proposed" (QE24's reading of `-423`). This file amended to the answers: every conditional on an ASK is now the answered text (QE21 (C): the requeue and the retried setup faults are built; `failed_delivery:address_refused` no longer exists), the ASK headings read ANSWERED, the rewrite map is kept unused. |
| 2026-11-21 | v1.4 | Tasks 0.4 and 0.6 done: `deferred-work.md` (the 12-5 block K-1 … K-11, and dated lines on 12.1's C4 / C6 / C7 / C8 / C10 / C13 and on 12.2's five items and the `partners/` leg), `epics.md` (notes under 12.3, 12.4, 12.5, 12.6), five architecture annotations, six docs notes, and roster Row 54 (eleven legs, all open). No "Closed by" line was written: that is Task 9.3's, after the code. Two ADR bodies were left unannotated, by design (carried to Task 8). The Panel note and the counsel question were made current (Decision `-483`, Row 54); both still NOT sent. Task 0 is complete except 0.1's re-check. |
| 2026-11-21 | v1.5 | Rebased onto `origin/main` `e5e13f92` (Story 6.22b landed), BigDev: "rebase". Every commit of the branch was re-written; the two SHAs this file cites are now the post-rebase ones (the author-commit `24d930fc`, the creation ledger entry `fc715af5`). No decision, AC or task changed. One cited code file moved on `main` since the pin (`member/anonymize.ts`, a comment only). |
| 2026-11-21 | v1.6 | On BigDev's direction, before the note is sent: the Panel note's Q1 revised (option A's cost corrected — the Trust answers for the sharing itself and its choice of partner, not for what the partner does afterwards; option B is now the partner's own form opened from the app; option C "both" added) and the counsel question extended (10: how far the Trust's responsibility runs and what the notice may say; 11: the second route and its tracking). K-12 added: the second route and its drop-off tracking are recorded, NOT decided and NOT part of this story. No decision, AC or task of this story changed. ⚠ If that route is chosen, a correct-course comes before Task 1. |
| 2026-11-21 | v1.7 | Validated by `bmad-create-story validate 12.5` (BigDev: "all"), after `git fetch origin` (`origin/main` = `e5e13f92`; no code moved since the rebase; pin an ancestor). The Panel ruled the note: Decision `2026-11-21-484` (Q1 C, Q2 A … Q7 A) — absorbed throughout: header, Names, Policy meaning (ratified acts; the sentences scoped to the sending route, with `-484`'s own sentence quoted; Q6 A beside "cannot be called back"; Q2 A on the no-sale line), the rulings table (seven rows + the Told list, verbatim), §0 edges 1 / 8 / 11 / 12, QE5, QE16, QE24 (the requeue's 30 days restated), QE26, AC0, Task 0.5, PQ6, Task 0.6 ((a) MET), K-1 (Q3 A's form), K-8. NO build decision changed: every built answer the note asked about was ratified as put. K-12's trigger is MET, and BigDev chose "Build 12.5 now": its "before this story's Task 1" is superseded for C, and the five things the correct-course owes are listed (incl. `recordLeadHandoff` refusing a partner's-own-form module). New: Task 0.7 (the records `-484` makes owed, before Task 1) and K-13 (Q6 A's staff duty, not built). NUMBERS: decision ≥ `-485`, ledger ≥ `am`, others' roster ≥ `Row 55`; a fifth sibling worktree (`3-15-…`) noted. The unused Task 0.3 rewrite map is collapsed to a pointer to `97bc9c26`. |
| 2026-11-21 | v1.8 | Task 0.7 done (BigDev: "yes, commit and write the Task 0.7 records"): `deferred-work.md` (dated lines on 12.1's C6 / C8, 12.2's field-list item, 12.5's K-1 / K-4 / K-8 / K-12; new K-13), `epics.md` (a dated line under 12.3's inherited note), the counsel question revised to `-484` (still not sent). Task 0 is complete except 0.1. No decision, AC or build task changed. |
| 2026-11-21 | v1.9 | `bmad-dev-story 12.5`: Task 0.1 re-check (nothing moved; 0214 / 0215 / ADR-0046 taken) and Tasks 1–9 BUILT on the story branch — migrations 0214 + 0215, the domain seam / W writes / P0–P5 / reads, the egress client, the sweep (registered in `boot.ts`), the W11 erasure step, the partner-boundary fence (41st CI job) and the api route spec, ADR-0046 + its index row. `ci:local` 41/41 on a fresh container. 9.3's three "Closed by" lines written. Status → `review`. ⛔ decision or AC changed. |
