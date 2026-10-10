---
baseline_commit: 9f4d684a
---

<!--
⭐ PINNED 2026-10-09 (`bmad-create-story 6.29`) to `main` at `9f4d684a` (PR #266 — Story 6.25, REBASE-merged; its branch → `main` SHA
map is at the top of the 6.25 story file). Every `file:NNN` below is AS OF `9f4d684a`, derived by three read-only research passes (the
6.24b notice substrate; the jobs-login privileges model, catalog-checked on :5433; the governance trail) and spot-checked by hand.

STATUS: `ready-for-dev`. ⛔ NO CODE until Task 0.3's author-commit is committed ALONE (RN1–RN10 below, answered by BigDev at Task 0.2)
([[feedback_governance_commits_precede_implementation]] — 6.25 round 3 broke this once and had to disclose it in `-300`).
⭐ SCOPE (BigDev, 2026-10-09, in session: *"1"*): this story is **0151 PARITY ONLY**. The jobs-login privileges gap the story KEY names
turned out to be SYSTEMIC (F15–F18) — it is ⛔ fixed here; it is recorded (deferred-work, 2026-10-09) and RN9 proposes its roster row.
The key keeps its name (the sprint row was created with it); ⚠ read "jobs-login grants" as "records the jobs-login gap".
⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): every RN strips to "the code should do X". A text the code used to GIVE UP
during a config hold is kept and sent once the hold clears, under the SAME locked re-check — it fulfils `-262` FQ7 B, `-291` Q2 B and
`-293` item 1 B and narrows none; `-295` §0 already classes the give-up as "a delivery failure, ⛔ not a policy narrowing". ⇒ ⛔ no routing
note owed. ⚠ It BECOMES the Panel's if this story (i) drops / merges / reroutes ANY RB18 skip alarm, or ADDS an alarm to RB13's skip
(`-296` Confirm 2 A ratified RB13 as "⛔ alarm is raised" and RB18 on its alarms — `-297` §1), (ii) changes WHO is texted, WHAT a
text says or WHEN it is due, or (iii) grants anything on the identity tables (ADR-0009 §5 / ADR-0040). Traps 1–3 fence all three.

GLYPH REGISTER, ADDRESSING RULE: as 6.24a / 6.24b / 6.25 — `⛔` negates the word it precedes · `⭐` = emphasis / action · `⚠` = hazard.
⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite the entry id / item / row).
LETTERS: `RN` = this story's build decisions (the author's); `F` = FOUND facts; `RB` = 6.24b's (`-295`); `RE` = 6.25's (`-299`).
-->

# Story 6.29: A Config Hold Never Burns a Suspicion Text — 0151 Gains 6.25's Hold, Give-Up Anchor and DB Backstops, Adapted to SMS `[PRIMITIVE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.24b's three SMS texts (the filing code / "could not go ahead" to the nominee in
> place at the death; the closure text after an allowed appeal; the appeal-date text to the refused person) are recorded in 0151
> `claim_suspicion_notices`, once ever per (claim, purpose). Today a row left `attempting` by a crash is GIVEN UP three IST days after its
> `created_at` — EVEN WHILE a config gap holds the sweep and ⛔ child can retry it (RB12's accepted edge (iii)) — and 0151 has ⛔ DB
> backstop: ⛔ `detail` CHECK at all (not even a length), ⛔ trigger keeping a finished row finished. Story 6.25 (rounds 3–5, `-300` /
> `-301`, migrations 0153 / 0154) built the fix for its own email table. This story **ADAPTS** it to SMS — ⛔ a copy: SMS holds are per
> purpose / per Pariwar / global (⛔ one channel-wide hold), ⛔ provider pre-flight exists, the sweep is DAILY with a 10-minute lease, and
> `detail` today embeds RAW gateway codes. ⛔ Who is texted, what a text says, and when it is due do ⛔ change.

> ⭐ **What already ships and this story READS — rebuild ⛔ none of it:** 0151 (`packages/domain/migrations/0151_claim-suspicion-notices.sql`);
> the domain half `packages/domain/src/claim/suspicion-notice.ts`; the sweep / child `apps/jobs/src/scheduler/claim-suspicion-notices.ts`;
> the send core `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`; the gateway client `packages/channels/src/providers/sms-app.ts`; and —
> as the DESIGN REFERENCE, ⛔ to be edited — 6.25's 0153 / 0154 and `packages/domain/src/claim/suspicion-staff-email.ts`
> (`parkHeldSuspicionStaffEmails`, `expireExhaustedSuspicionStaffEmails`, the re-claim credit, `isSuspicionStaffEmailDetail`).

## Story

As the **Trust**,
I want **a suspicion text that a configuration fault paused to be kept and sent once the fault is fixed — and the record of every such
text to be protected by the database itself**,
so that **a nominee or a refused person is ⛔ silently denied a text the Trust owes them because sending was switched off for a while,
and ⛔ provider message text (which can carry a phone number) can ever be stored**.

## The rulings this story builds

| Ruling | Key (verbatim, abridged) | Status |
|---|---|---|
| `-262` FQ7 B · `-291` Q2 B · `-293` item 1 B | the three texts — WHO, WHAT, WHEN | Trustee-ratified — ⛔ moved |
| `-292` RF11 | 0151 created; "invent ⛔ no vocabulary" | author-commit |
| `-295` RB2 | 0151's vocabulary — 0138's eight outcomes, `attempting_claimed_check`, the `claimed_at` partial index | author-commit — EXTENDED here |
| `-295` RB3 | *"given up only after THREE IST calendar days from `created_at`"*; at-least-once recorded | author-commit — ⚠ SUPERSEDED in part (RN3) |
| `-295` RB10 + `-297` §2 | the ONE locked re-check; ANY existing `attempting` row that fails it ⇒ `error` + alarm | ⛔ moved |
| `-295` RB12 | a config gap ⇒ ⛔ enqueue, ⛔ row; accepted edge (iii): *"a crash-left row whose claim meets a gap lasting three days ⇒ RB3's give-up"* | author-commit — ⚠ SUPERSEDED in part (RN2) |
| `-296` Confirm 2 A | RB13's skip confirmed SILENT (⛔ alarm); RB18's skips confirmed on their alarms to staff | Trustee-ratified — ⛔ moved (Trap 1) |
| `-298` | a `no_target` finish with `attempt_count > 1` also alarms "may have sent" | ⛔ moved |
| `-299` RE5 / RE11 · `-300` · `-301` | 6.25's design — 0152 ONLY; `-300` Consequence 3: *"0151 … has the same two backstop gaps and the same give-up shape — ⛔ moved here"* | the TEMPLATE |

## ⭐ THE INVARIANTS

1. **WHO / WHAT / WHEN do ⛔ move.** ⛔ Recipient rule (RB7 / RB15 / RB18), ⛔ copy key or DLT template, ⛔ selector predicate or due rule
   (RB10 / RB13) changes. Only WHETHER a held text is eventually sent changes — and always behind the SAME locked re-check.
2. **Every RB18 skip alarm stays** — ⛔ dropped, merged or rerouted; and RB13's skip stays SILENT (⛔ alarm added) — `-296` Confirm 2 A
   ratified both as they are (`-297` §1).
3. **"Once ever" for FINISHED rows** — now ALSO enforced by the database (a trigger), ⛔ only by every writer's `outcome = 'attempting'`.
4. **At-least-once is RECORDED, ⛔ hidden** (RB3) — `attempt_count`, `first_detail`, the `-297` §2 / `-298` alarms — unchanged.
5. **⛔ PII and ⛔ provider free text in `detail` / `first_detail`** — a fixed grammar, built by ONE builder, asserted by the writers,
   CHECKed by the database.
6. **A park never strands a row** — a row is parked only past the 10-minute lease; ⚠ a child between pg-boss backoffs can be silent
   for up to ~16 min (60 s × 4, backoff — 6.25 chose a 30-min lease for this), so a LIVE child's row CAN be parked; that is benign: the
   re-claim admits the `'sweep:held'` holder, so the live child simply re-takes its row (RN7).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ and changes ⛔ predicate that gates a member's access to a benefit.** The selectors and the locked re-check that
decide WHETHER a text is owed are untouched (Invariant 1). What changes is how long the system keeps trying to deliver a text it already
owes. In the member's terms: *"a text the Trust owes you is no longer thrown away because sending was paused by a configuration fault;
it is sent once the fault is fixed, if — when it is sent — you are still owed it."* Checked against the Niyamavali: ⛔ applicable — the
Niyamavali does not speak to notice delivery; the governing texts are `-262` FQ7 B / `-291` Q2 B / `-293` item 1 B, none of which sets a
delivery deadline (governance research, 2026-10-09). ⚠ A late appeal-date text (purpose (c)) still passes `not_filed` under the lock, so
it is never FALSE — but it may arrive with less of the 90 days left (RN10, recorded).

## ⭐ FOUND FACTS (each ⇒ the RN it feeds)

**0151 today (`packages/domain/migrations/0151_claim-suspicion-notices.sql`):**
- **F1 — ⛔ `detail` / `first_detail` CHECK at all** — not even 0152's `char_length <= 200` (0151 `:17-33`, `:38-42`) ⇒ RN5.
- **F2 — ⛔ trigger, ⛔ `may_have_sent`, ⛔ `aging_since`, ⛔ `parked_at`** (0151 `:17-33`; ⛔ trigger in the file) ⇒ RN3, RN6.
- **F3 — the open 6.24b round-3 defers on 0151:** `attempting_claimed_check` = `outcome <> 'attempting' OR claimed_at IS NOT NULL` — ⛔
  `claimed_by_job` (`:42`); `GRANT SELECT, INSERT` table-wide, INSERT ⛔ column-narrowed (`:43`); the partial index is `(claimed_at)` only
  and ⛔ asserted (`:55`); `recipient_version_id` FK single-column (`:36`) — 6.24b story file, Review Findings ROUND 3 ⇒ RN8.
- **F4 — UPDATE grant** (`twt_app`, column-narrowed): `outcome, provider_message_id, detail, first_detail, recipient_version_id,
  recipient_number_hash, attempt_count, claimed_at, claimed_by_job, updated_at` (`:46`). RLS ENABLE + FORCE, three per-command policies
  (`:47-51`).

**The domain half (`packages/domain/src/claim/suspicion-notice.ts`):**
- **F5 — the give-up** `expireExhaustedSuspicionNotices` (`:233-249`): `WHERE outcome='attempting' AND created_at < $1 AND claimed_at < $3`
  (`$3` = now − `CORRECTION_SEND_LEASE_MS`, 10 min — `correction-reminder-record.ts:59`, shared with 6.19b / 6.19d); cutoff = 00:00 IST of
  today − 2 (`:210-212`); ⛔ claim-row lock ⇒ RN3.
- **F6 — the re-claim UPDATE** (`:595-604`) does ⛔ re-check the lease or the holder; ⛔ clears `detail` (the old detail stays). The
  `expired` (`:542-549`) and `no_target` (`:565-573`) UPDATEs guard only `outcome='attempting'`. ⚠ Today this is SAFE: nothing changes
  `claimed_at` / `claimed_by_job` outside `begin`'s claim-row lock — the transient note does ⛔ refresh `claimed_at` (`:669-683`). ⚠ A
  lock-free PARK (RN2) changes that ⇒ RN7.
- **F7 — ⛔ `detail` builder.** Domain literals: `exhausted:attempting_three_days` (`:241`), `exhausted:recheck_<reason>` (`:542`; reasons
  `not_standing`, `not_closed_by_appeal`, `appeal_time_limit_passed`, `appeal_open`, `appeal_upheld_final` — `:467-489`,
  `suspicion-refusal.ts:138`), `no_target:closed_no_determination`, `excluded:claimant_discarded_version` (`:430-433`) ⇒ RN5.
- **F8 — the writers** `finaliseSuspicionNotice` (`:634-662`, CAS on `outcome='attempting' AND claimed_by_job=jobId`, `detail = input.detail
  ?? null`, ⛔ assertion) and `noteSuspicionNoticeTransient` (`:669-683`, `detail` + `updated_at` only) ⇒ RN5.

**The sweep / child (`apps/jobs/src/scheduler/claim-suspicion-notices.ts`):**
- **F9 — the give-up runs FIRST and unconditionally** (`:177-188`), before any config check; DAILY at `'0 10 * * *'` IST (`:416, :450`).
- **F10 — "held" is CONFIG ONLY and touches ⛔ row** — `purposeConfigGap` (`:120-128`: `config:sms_gateway_unconfigured` when ⛔
  `isConfigured()` — the ONLY truly global gap; `config:secret_manager` for the ONE key whose read failed (`:123-124`) — i.e. PER PURPOSE;
  `config:dlt_template_id_missing:<locale>`, both locales for `appeal_notice` — `:90-94`); `helplineGap` (`:131-136`) PER PARIWAR
  (a Secret Manager fault there is per Pariwar too — `:133`), resolved LAZILY as selector pages reveal Pariwars (`:213-217`). A held claim is skipped — ⛔ enqueued, ⛔ written (`:218-221`);
  ONE end-of-run alarm (`:251-259`). The child repeats the check as a race guard BEFORE `begin` (`:299-303`) ⇒ RN2.
- **F11 — ⛔ provider pre-flight** — `isConfigured()` never touches the network (`packages/channels/src/providers/sms-app.ts:63-71`,
  `:190-192`) ⇒ RN2 (⛔ a `-301` §1 (b) short-hold edge here).
- **F12 — the send classification** (`claim-dlt-sms-send.ts:69-133`): transient (throw) — `config_unavailable:secret_manager`,
  `rate_limited:<code>`, `api_unavailable:<code>`, `api_unavailable:timeout`; FINAL `error` + alarm — `config:secret_manager_<grpc name>`,
  `config:dlt_template_id_missing`, `config:helpline_number_missing`, `config:sms_gateway_unconfigured`, `dlt_template_not_approved:<code>`,
  `auth:<code>`, `unknown:<code>`, `unknown:NO_DETAIL`, `config:sms_messaging_unavailable`; final, ⛔ alarm — `invalid_number:<code>` ⇒
  `rejected_invalid_number`, `carrier_reject:<code>` ⇒ `rejected_unreachable`. Child-written details: `no_target:not_effective`,
  `no_target:no_contact_record`, `name:none`, `name:erased`, `name:unresolvable`, `no_target:no_sendable_number`, `decrypt_failed:kyc`,
  `decrypt_failed:tier1`, `hash_failed:tier1` (`:357-386`) ⇒ RN4, RN5.
- **F13 — ⚠ `<code>` is the RAW gateway string** — `extractGatewayCode` returns any non-blank string, untrimmed, unsanitised
  (`sms-app.ts:148-163`, `:155`), else `http_<n>` / `unknown` (`sms-errors.ts:92`). ⇒ a 0153-style CHECK applied as-is would make
  `finaliseSuspicionNotice` FAIL after a successful send ⇒ a pg-boss retry ⇒ a likely DUPLICATE text ⇒ RN5 (Trap 4).
- **F14 — `-297` §2 and `-298` are already built** (`suspicion-notice.ts:539-552`; `claim-suspicion-notices.ts:321-325`, `:349-353`); an
  `accepted` finish on a re-claimed row raises ⛔ alarm (`:399-410`) — 6.24b has ⛔ `may_have_sent` ⇒ RN6.

**The jobs login — FOUND systemic, ⛔ fixed here (BigDev's scope call):**
- **F15 — ONE jobs pool** from `SERVICE_DATABASE_URL` (`apps/jobs/src/boot.ts:271`, `:278`); in production a BYPASSRLS login inheriting
  `twt_service` (0007 DD-3, `0007_audit-log-entries-rls.sql:38-48`); `withPariwarScope` sets only `app.pariwar_id`, ⛔ role
  (`packages/domain/src/db.ts:117, :161-180`). ⛔ Runtime `SET ROLE twt_app` exists in `apps/jobs`.
- **F16 — `twt_service` holds privileges on 12 of 133 public tables** (catalog, :5433 — `information_schema.role_table_grants`); ⛔
  `claims`, ⛔ claim-family, nominee, KYC or identity table. BYPASSRLS waives policies, ⛔ GRANTs (0013 `:20-33`, 0036 `:46-58`).
- **F17 — every jobs sweep that touches those tables would 42501 in production** — 6.19b/c/d, shepherd, pools, alerts, data export, 6.24b,
  6.25. ⛔ Test runs jobs code as `twt_service` (all as superuser); Terraform provisions ⛔ jobs login (`infra/gcp/modules/cloud-sql/main.tf:97-101`).
- **F18 — committed texts that wrongly say jobs runs as `twt_app`:** ADR-0040 `:38-40`, `:95-96`; `staff-email-identity-read.ts:5`;
  `suspicion-notice.ts:135-136`; 0097 `:37-38`; 0109 `:27-34`, `:44`; `apps/jobs/src/data-export.ts:48`, `:243` ⇒ RN9.

## ⚖️ Build decisions RN1–RN10 — ⚠ the author's; PROPOSED, ⛔ not committed until Task 0.3

> ✅ **COMMITTED by [`-302`](../../.decision-log.md#decision-2026-10-10-302) (2026-10-10, `208772d9`)** — BigDev at Task 0.2: *"Accept all
> recommended"* (RN1 as stated, RN2 A, RN3 as stated, RN4 A, RN5 (b), RN6 A, RN7 A, RN8–RN10 as stated). The RN text below is kept as
> written. ⚠ **2026-10-10 (`-302` §2 RN3):** RN3's *"the give-up … SKIPS a parked row"* is ⛔ taken — RN2's / RN3's bound sentence's /
> AC2's credited-anchor judgement governs (a skip never fires under alternating held / un-held daily runs).

**RN1 — Scope: 0151 parity, by ONE new migration 0155; the jobs DB role is OUT.** ⛔ Change to 0152–0154, to 6.25's code, to who / what /
when any text is owed, to any copy key or DLT template, or to `CORRECTION_SEND_LEASE_MS` (shared with 6.19b / 6.19d). The jobs DB role
(F15–F18) is recorded and gated (RN9), ⛔ fixed. ⭐ Recommended: **as stated** (BigDev's scope answer, 2026-10-09).

**RN2 — What "held" means for the SMS sweep, and what a hold does to an in-flight row.** "Held" is EXACTLY the current code's
derivation (F10): a (purpose, Pariwar) scope is held when its purpose gap OR its Pariwar's helpline gap is non-null (the gateway being
unconfigured holds every purpose); ⛔ new global flag. The sweep decides holds BEFORE the give-up (F9 inverted, as 6.25's `-300` §2 (i)):
a new cross-tenant READ `listStalledSuspicionNoticeScopes(q, { now, allow })` returns the DISTINCT `(purpose, pariwar_id)` of every
`attempting` row past the lease (crash-left rows only — a small set; its own DELIBERATE family-9 block, `allow`); the sweep resolves the
helpline gap for exactly those Pariwars (reusing the SAME memo the main loop uses, so one run never both parks and enqueues a Pariwar);
then:
- every past-lease `attempting` row in a HELD scope is PARKED (`claimed_by_job = 'sweep:held'`, `parked_at` = the run's instant;
  ⛔ `detail` / `claimed_at` touched) — EVERY such row, ⛔ only give-up candidates (6.25's `parkHeldSuspicionStaffEmails` shape; a row
  parked only once it is a candidate would keep NO budget after the hold — validation H1);
- the give-up runs over UN-held scopes only, and judges a parked row by its CREDITED anchor `aging_since + (now − parked_at)` (the time
  it sat parked does ⛔ count — so ALTERNATING held / un-held days still converge: each un-held day ages it a day, each held day ⛔);
- a held scope's rows are ⛔ given up that run.
Options:
- **A — scoped park, as above.** ⛔ Rows of an un-held scope are frozen. Cost: the helpline lookups for stalled Pariwars run before the
  give-up (a bounded number of Secret Manager reads per day); a lookup that FAILS is a hold (fail-safe — that is what `helplineGap`
  already returns).
- **B — park only when the GATEWAY is unconfigured** (every purpose held); per-purpose and per-Pariwar gaps keep RB12 (iii)'s edge.
- **C — ⛔ park** (RB12 as committed); port only the backstops (RN5, RN6). The edge stays.
⚠ RB12's own mechanism note records parking was TRIED for SMS and rejected — *"parking `attempting` rows stranded them and let a config
note mask a possible send"* (6.24b story, RB12). 6.25's design answers both: (i) ⛔ stranding — the selector returns EVERY `attempting`
row regardless of predicate (`suspicion-notice.ts:180-187`), so the first un-held run's child re-claims a parked row; (ii) ⛔ masking —
the park writes ⛔ `detail` (only `claimed_by_job` / `parked_at`), and `-297` §2 makes ANY failed re-check of an existing row an `error`
+ "may have sent" alarm. ⭐ Recommended: **A** — it SUPERSEDES RB12 accepted edge (iii) for held scopes only.

**RN3 — The give-up anchor: `aging_since`, credited ONLY the parked time (`-301`'s rule).** 0155 adds `aging_since` (backfilled from
`created_at`, DEFAULT `clock_timestamp()`, NOT NULL) and `parked_at` (CHECK: an `attempting` row is parked ⟺ it carries `parked_at`);
the give-up counts its three IST days from `aging_since` and SKIPS a parked row; re-claiming a parked row moves `aging_since` FORWARD by
(now − `parked_at`), clears `parked_at`; the partial index moves to `(aging_since, claimed_at)`. ⛔ Change to the DAILY cadence or the
10-minute lease (RN1). Supersedes RB3's *"from `created_at`"*. ⚠ Daily granularity: a park is credited whole days of hold — expected.
The bound: three IST days of NON-parked time, judged by the credited anchor even BEFORE the re-claim (RN2) — so it holds under a
daily cadence with alternating holds. ⭐ Recommended: **as stated** (the 6.25 round-5 lesson: a RESET to now is unbounded under flapping
holds — `-301` §1 (a)).

**RN4 — Provider-side config faults stay FINAL.** `dlt_template_not_approved`, `auth`, `unknown` (F12) stay final `error` + alarm (RB12
accepted edge (ii)), ⛔ a held class like 6.25's RE6. Options: **A — keep final** (⛔ change; the gateway gives ⛔ pre-flight to tell a
paused account from a bad request) · **B — HELD** (retry until the three-day give-up; one alarm per distinct fault). ⭐ Recommended: **A**
— scope discipline; record as a known difference from 6.25.

**RN5 — ONE `detail` builder, a sanitised gateway code, a grammar CHECK.** A new `suspicionNoticeDetail(input)` builder (domain) is
the ONLY way a 0151 `detail` is made; a gateway `<code>` is sanitised to `[A-Za-z0-9_.-]{1,64}` AND ⛔ a run of 7+ digits (a bare phone
number — `extractGatewayCode` stringifies numeric codes, `sms-app.ts:156`; real gateway codes are short), else `unknown` (F13); the
grammar is ONE TS constant (schema file) that the 0155 CHECKs on `detail` / `first_detail` mirror (+ `char_length <= 200` + `!~
'[0-9]{7}'`), and both writers assert it BEFORE their UPDATE (⛔ value echoed). The grammar covers EVERY value in F7 and F12 (a test
iterates exported `as const` arrays — 6.25 round-4 P4). WHERE the sanitiser sits — options:
- **(a) in the shared send core** `claim-dlt-sms-send.ts` — ⚠ that core is RB4's, shared with 6.19b/c/d (`claim-correction-reminders.ts:221`):
  it would change the details stored in 0128 / 0138 too ⇒ RB4 amended in `-302`, 6.19b/c/d listed in RN1 / AC7, and
  `claim-correction-send.test.ts` run.
- **(b) in the suspicion CHILD only**, through `suspicionNoticeDetail()` — the core stays untouched; the child's alarms and thrown-error
  text use the BUILT detail, ⛔ `result.detail` (`claim-suspicion-notices.ts:344-345`, `:401`).
⚠ Existing rows are checked on :5432 / :5433 BEFORE the CHECK is added; a non-conforming row ⇒ STOP and report (⛔ NOT VALID, ⛔ rewrite
— [[feedback_record_unattested_no_backfill]]). ⭐ Recommended: **(b)** — scope discipline; 6.19b/c/d's records are ⛔ this story's.

**RN6 — Freeze finished rows; ⛔ `may_have_sent`.** 0155's BEFORE UPDATE trigger refuses ANY update of a row whose outcome is ⛔
`attempting`, and ANY change of `aging_since` except FORWARD on a parked re-claim (0154's arm). ⛔ `may_have_sent` column. Options:
**A — freeze only** · **B — also `may_have_sent`** with 6.25's semantics (set on a timeout / ambiguous send / a re-claim of a NULL-`detail`
row; ANY finish on such a row alarms — EXTENDS `-298` to `accepted`; and the re-claim must then CLEAR `detail`, which changes F6's
recorded double). ⭐ Recommended: **A** — B changes 6.24b's alarm semantics beyond `-297` / `-298`; record it as a known difference.

**RN7 — The take-over re-checks its lease — DEFENSIVE.** The re-claim UPDATE gains `AND (claimed_by_job = $job OR claimed_by_job =
'sweep:held' OR claimed_at < $leaseCutoff)`; 0 rows ⇒ re-read ⇒ `held_by_other` / `already_final` (6.25's P6). ⚠ In 6.24b ⛔ real writer
can trip it today (the transient note does ⛔ refresh `claimed_at` — F6; a holder's retry needs the claim lock the taker holds; the park's
`'sweep:held'` is admitted by the arm) — it guards a FUTURE refresher. Options: **A — add it (defensive, parity)** · **B — drop it**.
⭐ Recommended: **A**; its AC5 leg PLANTS the refresh with a raw UPDATE.

**RN8 — Close three of 6.24b's 0151 defers in 0155.** (a) `attempting_claimed_check` also requires `claimed_by_job`; (b) the INSERT grant
becomes column-narrowed to EXACTLY `pariwar_id, claim_case_id, purpose, outcome, detail, claimed_at, claimed_by_job` (the writers'
union — `suspicion-notice.ts:576`, `:608`; ⛔ `notice_id`, `created_at`, `aging_since`, `parked_at`), asserted positive AND negative
— ⚠ it binds `twt_app` (and the tests) only: in production jobs writes as the `twt_service`-inheriting login, which holds ⛔ grant on
0151 at all (F15–F17) — the CHECKs and the trigger are the backstops that bind EVERY role; (c) the partial index is asserted by name in the policy spec. ⛔ (d): the
single-column `recipient_version_id` FK stays deferred (a composite FK needs a `(pariwar_id, version_id)` key on `member_nominee_versions`
— ⛔ checked here). Each closed defer is marked "Closed by Story 6.29 / 0155" in the 6.24b story and `deferred-work.md`
([[feedback_closure_language_precision]]). ⭐ Recommended: **as stated**.

**RN9 — The jobs DB role: a NEW roster row, ⛔ a fix.** Task 0.4 adds launch-gate roster **Row 26 `jobs-db-role`** (status `open`):
closes when (a) a decision states the production jobs login's role posture (e.g. a member of `twt_app` with `withPariwarScope`
`SET LOCAL ROLE twt_app`, + `twt_service` grants for the cross-tenant reads — OR broad `twt_service` grants), (b) that login is
provisioned (D3-1.10 / Terraform), (c) at least one jobs sweep is exercised AS that login in CI, (d) the F18 texts are corrected. ⚠ Any
grant on the identity tables stays inside ADR-0040's ratification (Row 24 (a)) — ⛔ this row. ⭐ Recommended: **as stated**.

**RN10 — Alarms and recorded costs.** The park adds ONE end-of-run line ("N in-flight text(s) newly parked — ⛔ given up while held",
ids only); ⛔ RB13 / RB18 alarm is touched. Costs recorded: a text may now go days or weeks after its first attempt (always re-checked);
a late purpose-(c) text has less of the 90 days left; at-least-once is bounded by three IST days of NON-parked time (`-301` Cost). ⚠
The new park line is a `claim-suspicion-notice` alarm, so roster Row 22 (d) (`-297` §1) must route it too.
⭐ Recommended: **as stated**.

## Acceptance Criteria

### AC0 — Governance before code (Task 0)
`-302` (or the next free id) — the author-commit answering RN1–RN10 — is committed ALONE before any migration or code; a second
governance commit adds the `epics.md` `### Story 6.29` entry, roster Row 26, the dated `⚠ AMENDED by -302` lines on 6.24b's RB3 / RB12,
and the `deferred-work.md` closure marks.

### AC1 — A hold parks, ⛔ burns (RN2 — as answered)
Given an `attempting` row past the lease, when the sweep runs with that row's (purpose, Pariwar) HELD (each of: the gateway
unconfigured; that purpose's template-id read failing in Secret Manager; that purpose's template id missing in either locale; that
Pariwar's helpline missing; that Pariwar's helpline lookup failing) ⇒ the row is PARKED (whether or not it is past three days) (`claimed_by_job = 'sweep:held'`, `parked_at` set, ⛔ `detail` / `claimed_at`
touched), ⛔ given up, and the end-of-run alarm counts it; a row of an UN-held purpose / Pariwar in the SAME run is given up as today; once
the hold clears, the next run's child re-claims the parked row at once and — if the locked re-check still holds — sends.

### AC2 — The give-up anchor (RN3)
Three IST days count from `aging_since`; a parked row's re-claim credits exactly (now − `parked_at`); FLAPPING holds (three one-day parks)
credit three days and the row IS given up once its non-parked time passes three days; ⭐ ALTERNATING held / un-held DAILY runs (held day
3, un-held day 4 with a failing child, held day 5, …) ⇒ the row IS given up once its un-held days pass three (the give-up judges a
parked row by `aging_since + (now − parked_at)`, BEFORE any re-claim); a child-INSERTed row takes the DEFAULT and is given
up by it; the trigger refuses a backward or non-parked `aging_since` change.

### AC3 — `detail` is a fixed grammar (RN5)
Every value the builder emits passes the grammar (iterated from the exported arrays); a raw gateway code with a space, a `+`, `+91…`, a
BARE 10-digit number (`9876543210`) or > 64 chars is stored as `unknown`; the child's alarms and thrown text carry the BUILT detail; a writer given a non-grammar `detail` throws BEFORE its UPDATE; the CHECK refuses it at the
DB (named); a REAL send path (each F12 class through `sendClaimDltSms` with a fake gateway) finalises cleanly — ⛔ a successful send can
fail its finalise (Trap 4).

### AC4 — Finished rows are frozen (RN6)
ANY update of a non-`attempting` row is refused (even the superuser); the claim's DELETE cascade still removes rows; every existing writer
(give-up, park, re-claim, `-297` §2, RB15 / RB18 `no_target`, finalise, note) still passes.

### AC5 — The take-over re-checks its lease (RN7)
Two connections: a PLANTED raw UPDATE refreshing `claimed_at` (standing in for a future refresher — ⛔ 6.24b writer does it today)
commits WHILE a taker waits in its re-claim UPDATE ⇒ the taker reports `held_by_other`; the park racing a re-claim resolves to exactly one
holder (the park's own lease predicate).

### AC6 — Three 0151 defers closed (RN8)
`attempting` without `claimed_by_job` refused; INSERT of a non-writer column denied (42501); the partial index asserted by name and
definition.

### AC7 — Nothing else moves (Invariants 1–2; RN1)
`git diff` shows ⛔ change to 0152–0154, `suspicion-staff-email.ts`, `claim-suspicion-staff-emails.ts`, `claim-dlt-sms-send.ts` (RN5 (b)),
any `suspicion_sms.*` copy key, any DLT template id, `CORRECTION_SEND_LEASE_MS`, or any RB18 alarm call, and ⛔ alarm added to RB13's skip;
`dlt_template_not_approved` / `auth` / `unknown` still finish `error` + alarm (RN4 A); the jobs no-decision fence (`claim-suspicion-notice-no-decision.test.ts`)
still passes (+ any new module added to its list).

### AC8 — The proof
Every load-bearing leg red-checked (Debug Log: plant, red, revert); 0155 applied to :5432 AND :5433 by the migrator AND proven on a
scratch database migrated from zero; `pnpm ci:local` green.

## Tasks / Subtasks

- [x] **Task 0 — Governance (AC0).**
  - [x] 0.1 `git fetch origin`; confirm `main` = `9f4d684a` (or re-pin); grep `.decision-log.md` for entries after `-301` touching
        `-295` RB2 / RB3 / RB10 / RB12; re-locate every `file:NNN` above that moved.
  - [x] 0.2 Put RN1–RN10 to BigDev as short option summaries with the recommendations; quote each answer AS GIVEN in the Debug Log.
  - [x] 0.3 Draft the author-commit (header shape of `-300` / `-301`: type, status, §0 gate, Occasion, §1 FOUND, §2 DECIDED, Cost,
        Consequences, References) in the scratchpad; one fresh-context check until ⛔ BLOCKER / HIGH; insert above the newest
        `### Decision` (if refused, ask once — [[project_decision_log_writes_user_inserted]]); commit ALONE:
        `governance(6.29): <date>-302 — …` (the id's date is the day it is committed).
  - [x] 0.4 Second governance commit: `epics.md` `### Story 6.29` after 6.25 (6.25's entry shape — a dated "Added … (Story 6.29, Task
        0.4)" source line, ⛔ a merge fence); roster Row 26 (RN9 — if answered); dated `⚠ AMENDED by -302` lines on the 6.24b story's RB3 /
        RB12 (their text kept; RB3's line BESIDE 6.24b's existing "AS BUILT, 2026-10-09" narrowing line); on the 6.24b story's ROUND 3
        defers (they have ⛔ `deferred-work.md` entry) — "TO BE closed by 6.29 (0155, `-302` RN8)"; `deferred-work.md` — the 2026-10-09
        jobs-DB-role item pointed at Row 26. Task 6 flips "TO BE closed" to "Closed by 6.29 / 0155 (<sha>)".
  - [x] 0.5 Record the answers in this file's RN block (`✅ committed by -302`); never edit RN text after commit.
- [x] **Task 1 — Migration 0155 + schema (AC1–AC4, AC6; RN3, RN5, RN6, RN8).**
  - [x] 1.1 BEFORE writing the CHECKs, on :5432 AND :5433: every distinct `detail` / `first_detail` against the grammar (+ the
        7-digit rule), AND every `outcome='attempting' AND claimed_by_job IS NULL` row (RN8 (a)); any hit ⇒ STOP and report.
  - [x] 1.2 Hand-author `packages/domain/migrations/0155_claim-suspicion-notice-backstops.sql` + journal idx 155 (`when` > 0154's):
        `aging_since` (ADD, backfill = `created_at`, DEFAULT, NOT NULL) and `parked_at` + the parked ⟺ `parked_at` CHECK, BEFORE the
        trigger; the `detail` / `first_detail` length + grammar CHECKs (length named BEFORE grammar — PG checks in name order);
        `attempting_claimed_check` replaced to require `claimed_by_job` (RN8 a); the INSERT grant REVOKEd and re-granted column-narrowed
        (RN8 b); UPDATE grants on `aging_since`, `parked_at`; the partial index moved to `(aging_since, claimed_at)`; the trigger (0153 +
        0154's arms, adapted: ⛔ `may_have_sent` arm). ⛔ `db:generate`.
  - [x] 1.3 `src/schema/claim_suspicion_notices.ts`: the two columns, the checks, the index, `SUSPICION_NOTICE_DETAIL_PATTERN`.
  - [x] 1.4 Apply with the migrator to :5433 AND :5432; migrate a SCRATCH database from zero and drop it.
- [x] **Task 2 — The `detail` builder (AC3; RN5).** `suspicionNoticeDetail()` + `isSuspicionNoticeDetail()` + the exported reason arrays in
      `suspicion-notice.ts`; the gateway-code sanitiser where RN5 is answered ((b): the child maps `result.detail` through the builder;
      ⛔ in `sms-app.ts` — the gateway client stays raw); every domain literal (F7) and every child literal (F12) routed through the builder;
      both writers assert. ⚠ `claim/index.ts:104,107` re-exports BOTH `suspicion-notice.ts` and `suspicion-staff-email.ts` — every new name
      must differ from 6.25's (⛔ `sanitizeProviderErrorName`, ⛔ `SUSPICION_STAFF_EMAIL_PARKED_BY`; e.g. `SUSPICION_NOTICE_PARKED_BY`).
- [x] **Task 3 — The domain half (AC1, AC2, AC5; RN2, RN3, RN7).** `listStalledSuspicionNoticeScopes(q, { now, allow })` (distinct
      `(purpose, pariwar_id)` of past-lease `attempting` rows; DELIBERATE block); `parkHeldSuspicionNotices(q, { now, allow, held })` (held =
      a SET of (purpose, Pariwar); DELIBERATE block — `parkHeldSuspicionStaffEmails`'s, adapted); the give-up over UN-held scopes only,
      keyed on `aging_since` and judging a parked row by `aging_since + (now − parked_at)`; the re-claim credit + `parked_at = NULL` + the
      lease predicate (`$2::timestamptz` — Trap 6).
- [x] **Task 4 — The sweep (AC1; RN2, RN10).** Purpose gaps, then `listStalledSuspicionNoticeScopes`, then the helpline gap for those
      Pariwars (the main loop's memo), BEFORE the give-up; park; give up the rest; the end-of-run alarm (reword its "⛔ nothing was enqueued
      or written" — `:256-257` — a held run now parks) + the park count; update the header comments (`claim-suspicion-notices.ts:11-17`,
      `suspicion-notice.ts:26-29`). ⛔ Touch the child's race guard or any RB18 alarm; ⛔ add an RB13 alarm.
- [x] **Task 5 — Tests (AC1–AC7).** Update the tests F-listed in Dev Notes; add: the policy legs (CHECKs by name, trigger, parked CHECK,
      grants exact, index); the domain legs (park scope, give-up skip, credit, flapping, DEFAULT); a two-connection lease race; the jobs
      live legs (each hold kind × a crash-left row; an un-held purpose in the same run; the post-hold re-claim; every F12 class finalising).
- [x] **Task 6 — Proof (AC7, AC8).** Red-checks logged; `git diff --stat` against AC7's list; `pnpm ci:local` green; story records.

### Review Findings

> Code review 2026-10-10 (`bmad-code-review`, full diff `9f4d684a..fc017bdc`; three layers — Blind Hunter diff-only, Edge Case Hunter
> diff+read, Acceptance Auditor diff+spec+checklist — in PARALLEL, read-only throughout). Triage: **0 decision-needed, 5 patch, 1 defer,
> 7 dismissed**. Acceptance Auditor: all 8 ACs (AC0–AC8) satisfied with direct evidence; zero REAL GAP on every touched load-bearing-
> invariant family (1, 2, 5, 6, 8, 9, 10, 11, 12 touched and covered; 3, 4, 7, 13 untouched, skipped silently). §0 gate: ⛔ nothing here
> is the Panel's — every finding is "the code should do X," ⛔ change to who is texted, what a text says, or when it is due. Dismissed
> (each re-traced against the actual code and types, ⛔ taken on a layer's word): a `detail!` non-null assertion flagged as unsafe —
> `result.detail` is null ONLY when `kind==='final' && outcome==='accepted'` (the shared send core's own discriminated union), excluded
> at both assertion sites by their own enclosing branch; the recheck-expiry path's missing `assertDetail` — `check.reason`'s type is a
> closed 3-member literal union derived from `SuspicionRefusalAppealPosition`, so an out-of-grammar value is unrepresentable at compile
> time, unlike the two asserted writers, which accept untrusted `string` from the gateway; roster Row 22(d) ⛔ edited — its wording
> already reads "every `claim-suspicion-notice` alarm," a category match the new PARK alarm (same alarm prefix) falls under without an
> edit; a given-up parked row keeping its stale `parked_at` / `claimed_by_job='sweep:held'` — explicitly documented as intended in 0155's
> own comment ("a finished row may keep it — the trigger freezes it anyway"), harmless since any reader must already gate on
> `outcome='attempting'` before the fields mean "currently parked"; no down-migration for 0155 — matches all 154 other migrations in this
> package, none of which ship one; the `claimCaseId as string` cast — ordinary branded-ID widening needed for `Set<string>` /
> `sampleIds(list: readonly string[])`; REVOKE-then-GRANT transaction-wrapping "unverified" — Drizzle's migrator wraps each migration
> file's statements in one transaction by default, so no window exists where `twt_app` holds zero INSERT privilege.

- [x] [Review][Patch] ✅ **Fixed 2026-10-10.** **0155's finished-row trigger lets a hypothetical combined "finish + advance `aging_since`" UPDATE through** — the
  forward-move exemption (`claim_suspicion_notices_guard_update()`) checks only `OLD.claimed_by_job = 'sweep:held'`, ⛔ that `NEW.outcome`
  also stays `'attempting'`; no current write path combines the two (the re-claim UPDATE never touches `outcome`, the finalise UPDATE
  never touches `aging_since`), but the trigger's own guard is looser than RN6's stated invariant ("ANY change of `aging_since` except
  FORWARD on a parked re-claim"). Fix: added `OR NEW.outcome <> 'attempting'` to the exemption's RAISE condition
  [packages/domain/migrations/0155_claim-suspicion-notice-backstops.sql:55-61]; reapplied via `CREATE OR REPLACE FUNCTION` directly to
  :5432 and :5433 (0155 was already applied — the migrator would skip the edited file, so this went straight to both live instances,
  ⛔ a fresh migration, pre-merge); a regression test proving the old gap is closed (and the legitimate re-claim shape still accepted)
  added at `packages/domain/tests/integration/rls/claim-suspicion-notice-policy-regression.spec.ts`.
- [x] [Review][Patch] ✅ **Fixed 2026-10-10.** **`SUSPICION_NOTICE_PARKED_BY` ('sweep:held') is duplicated in four places with no lockstep test** — the 0155
  trigger function, the `parked_check` CHECK (migration SQL and the Drizzle `check()` call), and the JS export — unlike the `detail`
  grammar, which has a dedicated test pinning the SQL CHECK pattern to `SUSPICION_NOTICE_DETAIL_PATTERN`. A future rename of the JS
  constant would silently desync from the (immutable, already-applied) migration. Fix: a new LOCKSTEP test asserting the `parked_check`
  CHECK definition and the trigger function's source both carry the exact quoted `SUSPICION_NOTICE_PARKED_BY` literal
  [packages/domain/tests/integration/rls/claim-suspicion-notice-policy-regression.spec.ts].
  [packages/domain/src/claim/suspicion-notice.ts:84; packages/domain/migrations/0155_claim-suspicion-notice-backstops.sql:34,57]
- [x] [Review][Patch] ✅ **Fixed 2026-10-10.** **`SUSPICION_NOTICE_SMS_ERROR_CLASSES` has no lockstep test against `@twt/channels`'s `SmsErrorClass`** — the two
  lists match exactly today (the same 7 members), but nothing pins them equal; a future gateway error class added to
  `packages/channels/src/providers/sms-errors.ts` without a matching update here would silently degrade through `sendDetail()` to
  `unknown:unknown`, discarding diagnostic content with no test to catch the drift. Fix: a pinned-snapshot test (`suspicion-notice.spec.ts`)
  asserting the exact 7-member array, plus a strengthened comment — ⛔ a live cross-package import is possible here (`@twt/channels`
  depends on `@twt/domain`, ⛔ the reverse; importing it would cycle the workspace graph), so the other half stays a by-hand cross-check,
  called out explicitly in both the code comment and the test name. [packages/domain/src/claim/suspicion-notice.ts:126-134,159-169]
- [x] [Review][Patch] ✅ **Fixed 2026-10-10.** **The park phase's per-Pariwar Secret Manager lookups (`helplineGap` via `gapOf`) have no budget/timeout guard**,
  unlike the main enqueue loop which checks `budgetMs` on every iteration (`:239`) — a run with many distinct stalled (purpose, Pariwar)
  scopes could spend unbounded time/cost in the park phase before the give-up or enqueue loop even starts. Low severity: the design's
  own comment calls the stalled set "a small set" (crash-left rows past the lease only). Fix: the same `budgetMs` check now runs inside
  the park-phase scope loop too; exhausting it there skips the rest of that run's enqueue loop as well (reported via the existing
  "ran out of its N-minute budget" alarm). [apps/jobs/src/scheduler/claim-suspicion-notices.ts:191-198]
- [x] [Review][Patch] ✅ **Fixed 2026-10-10.** **The new "newly PARKED" alarm loses the per-purpose/per-Pariwar breakdown the sibling HELD alarm has** — it is a
  flat count plus a dedup'd claim-id list (`:199-204`), while the HELD alarm groups by purpose (`:279-284`). An on-call reader of the
  PARK alarm can't tell which purpose/Pariwar is affected without querying the database. Fix: the PARK alarm now groups by purpose,
  mirroring the HELD alarm's shape exactly. [apps/jobs/src/scheduler/claim-suspicion-notices.ts:199-205]
- [x] [Review][Defer] **A send that succeeds just as the park takes the row underneath it can cause a resend (duplicate SMS) on the
  next un-held sweep's re-claim** — `finaliseSuspicionNotice`'s compare-and-set loses (`claimed_by_job` is now `'sweep:held'`, ⛔ the
  sender's `jobId`), alarms *"moved on before its finalise,"* and the row stays `attempting`; the next re-claim's child does ⛔ know the
  gateway already accepted the send and resends. This is the SAME at-least-once race the project already accepts for lease-expiry
  redelivery (RB3's documented, recorded cost) — the park path is one more door onto it, ⛔ a new race. Invariant 6's "benign" framing
  covers stranding (a parked row is always eventually retried), ⛔ this resend angle explicitly. Not actionable inside this story's
  scope (RN1 puts the shared send core and provider pre-flight out of bounds) — deferred, pre-existing risk class.
  [packages/domain/src/claim/suspicion-notice.ts:634-662 (`finaliseSuspicionNotice`); apps/jobs/src/scheduler/claim-suspicion-notices.ts:191-205]

> **Round 2** (2026-10-10, narrowed diff — the 5 files round 1's patches touched, 162 diff lines; three layers in PARALLEL, read-only).
> Triage: **0 decision-needed, 4 patch, 0 defer, 2 dismissed**. Acceptance Auditor independently re-verified all 5 round-1 fixes against
> BOTH live DBs and the actual write paths — all 5 confirmed genuine, no new AC/RN violation. Dismissed: the shared `budgetExhausted`
> flag zeroing the whole enqueue loop when the park phase alone exhausts the budget — confirmed INTENTIONAL (a single run-wide budget
> across phases was the point of round 1's fix, not a side effect); a suspected duplicate import path in the policy-regression spec —
> verified the two import paths are genuinely different files.

- [x] [Review][Patch] ✅ **Fixed 2026-10-10 (round 2).** **The round-1 trigger fix was still incomplete** — two merged issues: (a) `NEW.outcome <> 'attempting'`
  is NULL-unsafe (Postgres `<>` against NULL yields NULL, not TRUE, so the `IF` would not raise — inconsistent with the `IS DISTINCT
  FROM` used two lines above it for the same reason); (b) more seriously, the guard never required the row actually be UN-parked —
  an UPDATE that only credits `aging_since` forward while leaving `claimed_by_job = 'sweep:held'` / `parked_at` untouched still passed,
  letting a row's give-up clock be pushed out repeatedly without a real re-claim. Not exploited by any current write path (the real
  re-claim UPDATE always clears `parked_at` in the same statement), but the same class of latent gap as round 1's finding, just not
  fully closed. Fix: `<>` → `IS DISTINCT FROM` throughout, and `OR NEW.parked_at IS NOT NULL` added to the RAISE condition; reapplied
  via `CREATE OR REPLACE FUNCTION` to :5432 + :5433 a third time; the regression test extended with the un-parked-credit case.
  [packages/domain/migrations/0155_claim-suspicion-notice-backstops.sql:55-63]
- [x] [Review][Patch] ✅ **Fixed 2026-10-10 (round 2).** **The end-of-run "ran out of budget" alarm was misleading when the PARK phase (not the enqueue
  loop) consumed the whole budget** — it read "...after 0 claim(s)," which reads as "nothing was due," not "we never got to look."
  Fix: a `budgetExhaustedDuringScopeScan` flag distinguishes the two cases; the park-phase exhaustion now alarms its own, accurate
  message ("ran out of its N-minute budget scanning stalled scopes (park phase) — the enqueue scan did ⛔ run today").
  [apps/jobs/src/scheduler/claim-suspicion-notices.ts:195,199-202,297-302]
- [x] [Review][Patch] ✅ **Fixed 2026-10-10 (round 2).** **The round-1 SQL lockstep test's `.toContain('sweep:held')` matched anywhere in the trigger's
  FULL `pg_get_functiondef` text, including its `--` comments** — would still pass if the real comparison literal changed but an
  unrelated comment still said "sweep:held" (this file's comments are prose-heavy and already mention the literal by name). Fix: the
  trigger half now anchors to the actual code via `/claimed_by_job\s+IS\s+DISTINCT\s+FROM\s+('[^']*')/`, immune to comment text.
  [packages/domain/tests/integration/rls/claim-suspicion-notice-policy-regression.spec.ts:366-381]
- [x] [Review][Patch] ✅ **Fixed 2026-10-10 (round 2).** **The round-1 SMS-error-class test's name overstated what it verifies** ("LOCKSTEP... is EXACTLY
  `SmsErrorClass`") — it is a one-sided pin against a hand-copied snapshot, structurally incapable of catching drift from
  `@twt/channels`'s side (confirmed again this round: the one-way `channels→domain` dependency really does block a live cross-import).
  Fix: reworded to "PINNED... this test fails if OUR array drifts, ⛔ if THEIRS does" — accurate about the one-sided guarantee.
  [packages/domain/tests/integration/claim/suspicion-notice.spec.ts:709]

## Dev Notes

### Traps
1. **⛔ Touch an RB18 skip alarm, ⛔ add one to RB13** — `-296` Confirm 2 A ratified both as they are; either sends Confirm 2 back to the
   Panel (`-297` §1).
2. **⛔ Change WHO / WHAT / WHEN** — recipients, copy keys, DLT templates, selectors, the locked re-check (Invariant 1).
3. **⛔ Grant anything on the identity tables, and ⛔ fix the jobs DB role here** — RN1 / RN9; ADR-0009 §5 / ADR-0040.
4. **A grammar CHECK BEFORE the sanitiser = duplicate texts.** A raw gateway code reaching `finaliseSuspicionNotice` after a successful
   send would throw ⇒ pg-boss retries ⇒ a second text (F13). Sanitise in the send core FIRST; assert in the writers; the CHECK last.
5. **A JS template literal in SQL** — ⛔ backticks inside an SQL comment in a template string (6.25 round 4 split its SQL that way).
6. **Parameter typing** — `$2::timestamptz - parked_at` (an untyped `$2` in an arithmetic expression may not infer).
7. **The backfill must precede the trigger** in 0155; a database that ran an earlier 0155 needs the hand delta wrapped in DISABLE /
   ENABLE TRIGGER (0153's header note).
8. **`CORRECTION_SEND_LEASE_MS` is shared** with 6.19b / 6.19d — ⛔ change it; ⛔ change the daily cron.
9. **The helpline hold is lazy today** (F10) — the give-up must know held Pariwars BEFORE it runs; a lookup failure = held (fail-safe).
10. **Tests seed `created_at` for give-up legs** — they must ALSO seed `aging_since` (and `parked_at` for a parked seed — the CHECK).
11. **Existing rows on :5432** — Task 1.1 BEFORE the CHECK ([[project_live_db_test_gotchas]]: apply to BOTH; ⛔ regenerate an applied migration).
12. **⛔ `may_have_sent`** (RN6 A) — ⛔ port 6.25's "clear `detail` on re-claim", which only makes sense with it (F6).

### The existing code each change touches (UPDATE files)
- `packages/domain/migrations/0151_*` — ⛔ edited (0155 alters it). `packages/domain/src/schema/claim_suspicion_notices.ts` (`:21`, `:28`,
  `:31-79`) — columns, checks, index, the pattern.
- `packages/domain/src/claim/suspicion-notice.ts` — the give-up (`:233-249`), `beginSuspicionNotice` re-claim (`:595-604`), the literals
  (F7), the writers (`:634-683`); a new park function and builder. Preserve: the selector (`:140-205`), the re-check (`:467-489`), `-297`
  §2 (`:539-552`), RB15 / RB18 (`:556-581`).
- `apps/jobs/src/scheduler/claim-suspicion-notices.ts` — the sweep order (`:177-259`); preserve the child's race guard (`:299-303`), the
  `-297` / `-298` alarms (`:321-353`), every RB13 / RB18 skip alarm.
- `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` (`:69-133`) — route details through the builder + sanitiser; preserve the CLASSES (RN4 A).
- Tests (F-listed by research — each needs care): `packages/domain/tests/integration/rls/claim-suspicion-notice-policy-regression.spec.ts`
  (`seedNotice` inserts `accepted` rows — `:21-31`; `:149-150` and `:204-217` UPDATE them ⇒ the trigger refuses; seed IN-FLIGHT rows, as
  6.25's spec does; `:210` writes `detail = 'd'`, `first_detail = 'f'` ⇒ the grammar refuses; `:233-234` ACCEPTS an `attempting` row with
  ⛔ `claimed_by_job` ⇒ RN8 (a) refuses it; the "ONE positive UPDATE of every granted column" leg must cover `aging_since` / `parked_at`
  from a PARKED seed (`claimed_by_job='sweep:held'`, `parked_at` set) updated to a job id, `parked_at = NULL`, `aging_since` moved
  FORWARD — the parked CHECK and the trigger arm allow ⛔ other shape); `…/claim/suspicion-notice.spec.ts` (`attemptingRow` `:94-100` — free-text `detail`s at `:399`, `:422`, `:448`; `:434`
  note with `detail: 'x'`; give-up seeds `:448-451`); `…/claim/suspicion-notice-concurrency.spec.ts` (`crashLeftRow` `:201-207`; the
  statement-prefix regexes `:309`, `:329` must still match); `apps/jobs/tests/claim-suspicion-notices-live.test.ts` (RB3 day+1 / day+3 leg
  `:739-762`).

### Testing standards
Live DB on :5433 (`DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable`); own-committing two-connection
races wait on `pg_stat_activity` lock waits (⛔ sleeps); per-test ROLLBACK elsewhere; every instant compared is set EXPLICITLY
([[project_db_clock_ordering_tests_tie]]); every AC leg present before its Task is ticked; each load-bearing leg red-checked and logged.

### Project Structure Notes
Domain under `packages/domain/src/claim/`, migrations hand-authored under `packages/domain/migrations/` with `meta/_journal.json`; jobs
under `apps/jobs/src/scheduler/`. ⛔ New package ([[feedback_no_premature_package]]). The gateway client (`packages/channels`) stays RAW —
sanitising is the send core's job (it owns the `detail` mapping).

### References
- 6.25 design reference: `packages/domain/migrations/0153_claim-suspicion-staff-email-backstops.sql`, `0154_claim-suspicion-staff-email-parked-at.sql`;
  `packages/domain/src/claim/suspicion-staff-email.ts` (park, give-up, re-claim credit, builder + assert); the 6.25 story's Review Findings
  ROUND 3–5 (the park → reset → credit history); decisions `-300`, `-301`.
- 6.24b: its story file (RB2, RB3, RB10, RB12 + its mechanism note, RB13, RB15, RB18; Review Findings ROUND 3 defers); `-295`, `-297`, `-298`.
- Memory: [[project_staff_email_substrate]], [[feedback_governance_commits_precede_implementation]], [[feedback_supersede_never_reinterpret]].

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.29`, 2026-10-10.

### Debug Log References

- **Task 0.1** — `git fetch origin`: `origin/main` = `9f4d684a` (the pin holds); ⛔ decision after `-301` (none touching `-295` RB2 /
  RB3 / RB10 / RB12); the branch's two commits above `main` are docs only ⇒ every `file:NNN` in this file still holds.
- **Task 0.2 — BigDev's answer, AS GIVEN:** *"Accept all recommended"* (one option covering RN1 as stated, RN2 A, RN3 as stated, RN4 A,
  RN5 (b), RN6 A, RN7 A, RN8–RN10 as stated).
- **Task 0.3** — `-302` drafted in the scratchpad; ONE fresh-context check: 0 BLOCKER / 0 HIGH / 4 MEDIUM / 5 LOW — all applied (RN3's
  *"SKIPS a parked row"* text recorded as ⛔ taken; RB12's *"⛔ no row is written"* superseded for held scopes; RN5 (b)'s built-detail
  alarms; the §0 basis — ⛔ delivery deadline in the three rulings + RB12's answered policy; RB2 extension incl. RN3; `-295` §1 RB2;
  "every writer through the builder"; the parked CHECK named; Consequence 3 vs RN10). Inserted above the newest `### Decision` (passed
  first try), additive 39 / 0 = the draft's 39 lines; committed ALONE `208772d9`. Task 0.4 committed `0a3b643d`.
- **Task 1.1** — :5432 AND :5433: `claim_suspicion_notices` holds **0 rows** on both ⇒ ⛔ `detail` / `first_detail` to check, ⛔
  `attempting` row without `claimed_by_job`. The grammar was checked to read the same in PG (ARE, the `(?!.*[0-9]{7})` lookahead) and
  in a JS `RegExp` before it was written into 0155.
- **Task 1.4** — the migrator applied 0155 to :5433 and :5432 (PG 16.14 / 18.3; PG 18 lists NOT NULLs as `n` constraints — the `c` /
  `f` / `p` sets equal); a scratch database `twt_scratch_629` migrated from ZERO (155 migrations, the nine CHECKs by name) and dropped.
  After the DB-level red-checks, :5432 and :5433 hash-equal on every constraint definition and grant (`md5` of the catalog dump).
- **Red-checks (AC8 — plant, red, revert; code plants restored from a scratchpad copy, ⛔ `git checkout`):**
  #1 the sanitiser returns the raw code ⇒ 4 jobs legs + 1 domain leg RED (Trap 4: the finalise hits the CHECK after a send) ·
  #2 `finaliseSuspicionNotice` without its assert ⇒ the writer leg RED · #3 the re-claim's RN7 lease predicate dropped ⇒ the PLANTED
  refresh race RED · #4 the give-up SKIPS a parked row (RN3's text) ⇒ the ALTERNATING leg RED (never given up) · #5 the give-up ignores
  the parked credit ⇒ the credited-anchor leg RED · #6 the re-claim credit removed ⇒ the credit + FLAPPING legs RED · #7 the park
  re-parks a parked row ⇒ the park leg RED · #8 the sweep gives up HELD scopes too ⇒ ⚠ first GREEN (a freshly crashed row is
  protected by the park itself) ⇒ a leg added (a held-scope row ALREADY past three days when the hold's first sweep runs) ⇒ 5 RED ·
  #9 the sweep never parks ⇒ 5 RED · #10 the child stores the core's RAW detail ⇒ 4 RED · DB (:5433, restored after each):
  #11 the trigger DISABLED ⇒ the frozen + arm legs RED · #12 the detail vocabulary CHECK dropped ⇒ 3 RED · #13
  `attempting_claimed_check` back to 0151's ⇒ the RN8 (a) leg RED · #14 the INSERT grant table-wide again ⇒ both RN8 (b) legs RED.
- **`ci:local` run 1 — RED (2 jobs: `test (unit)`, `integration-tests`), ONE test:** `nominee-name-no-comparison-fence.test.ts` (6.24b
  RB8) asserted the bare word `decrypt` ⛔ in `suspicion-notice.ts` — the module now OWNS the `detail` vocabulary, which names the
  child's `decrypt_failed:*` step (RN5 / Task 2 place the builder there). ⛔ Decrypt call exists. The fence was narrowed to 6.25's
  sibling form (RE8): a decrypt CALL `/decrypt\w*\s*\(/i`, ⛔ KMS, ⛔ `encryption`, ⛔ `getMemberNominees`, ⛔ `nameCiphertext` — ⛔
  weaker than the sibling's. Red-check #15: a planted `decryptKycField(x)` export ⇒ RED; restored.
- Test-expectation fixes during the build (⛔ code changes): the park leg's second run a day on DOES park the once-live row (now past
  its lease); the hold leg for `appeal_notice` sees the claim's OTHER purpose sent too (never held) ⇒ count the held purpose's texts.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-09, `bmad-create-story 6.29`). Three
  read-only research passes (6.24b notice substrate; jobs-login privileges model, catalog-checked; governance trail). BigDev's scope call
  (*"1"*): 0151 parity only; the systemic jobs-login gap recorded (deferred-work 2026-10-09) and proposed as roster Row 26 (RN9).
- ⭐ **Built (2026-10-10, `bmad-dev-story 6.29`):** governance FIRST — `-302` (RN1–RN10, BigDev *"Accept all recommended"*) committed
  alone, then epics `### Story 6.29`, roster Row 26 `jobs-db-role` (`open`), `⚠ AMENDED by -302` lines on 6.24b's RB3 / RB12 and the
  "TO BE closed" marks. **Migration 0155** (hand-authored; :5432 + :5433 + a scratch DB from zero): `aging_since` (backfilled, DEFAULT,
  NOT NULL) + `parked_at` + the parked CHECK; `detail` / `first_detail` length + grammar CHECKs (`SUSPICION_NOTICE_DETAIL_PATTERN`, a
  7-digit lookahead — ⛔ a phone number); `attempting_claimed_check` requires `claimed_by_job`; the INSERT grant column-narrowed to the
  writers' union; UPDATE on the two new columns; the partial index on `(aging_since, claimed_at)` (same name); the trigger
  `claim_suspicion_notices_guard_update` (a finished row frozen; `aging_since` only forward, only on a parked re-claim; ⛔
  `may_have_sent` — RN6 A). **Domain** (`suspicion-notice.ts`): `suspicionNoticeDetail` / `isSuspicionNoticeDetail` /
  `sanitizeSmsGatewayCode` + the six exported vocabularies; every domain detail built; `finalise` / `note` assert;
  `listStalledSuspicionNoticeScopes`, `parkHeldSuspicionNotices` (DELIBERATE blocks); the give-up takes the UN-held `scopes` and judges
  a parked row by its credited anchor; the re-claim credits (now − `parked_at`), clears it, and re-checks its lease (RN7 — 0 rows ⇒
  re-read ⇒ `held_by_other` / `already_final`); the parked arm in the pre-check. **Jobs** (`claim-suspicion-notices.ts`): the purpose
  gaps and the stalled Pariwars' helplines FIRST (one memo shared with the main loop), the park + ONE "newly PARKED" alarm, then the
  give-up over un-held scopes; the held alarm reworded; `parkedForConfig` on the result; every child detail built — the core's raw
  `result.detail` ⛔ stored, alarmed or thrown (RN5 (b)). ⛔ Touched (AC7): 0152–0154, 6.25's code, `claim-dlt-sms-send.ts`, the
  gateway client, any copy key / DLT id, `CORRECTION_SEND_LEASE_MS`, the cron, any RB13 / RB18 alarm call.
- **Tests:** policy spec 24 (EXACT grants, every constraint + the index by name, the grammar incl. `+91…` / a bare 10-digit number,
  the pattern lockstep, the trigger + cascade, the DEFAULT, the parked CHECK both ways, the arm); domain spec +11 (the builder over the
  exported arrays, sanitising, the writers' assert, stalled scopes, the scoped park, the give-up over un-held scopes and by the credited
  anchor, the re-claim credit, the skewed parked row, FLAPPING, ALTERNATING, the DEFAULT); concurrency spec +3 (the PLANTED refresh,
  the park racing a re-claim in both orders — ONE holder); jobs live +15 (five hold kinds × a fresh + an already-aged crash row, an
  un-held scope given up in the same runs, the post-hold send; seven gateway classes finalising with the built detail + RN4's alarms;
  a non-gateway throw; a timeout; three transient classes — the thrown error carries the built detail, ⛔ a number).
- ⚠ **Known differences from 6.25, recorded (`-302`):** ⛔ `may_have_sent` (RN6 A); provider-side faults stay FINAL (RN4 A); holds are
  per (purpose, Pariwar), ⛔ channel-wide; the lease is 10 min (shared) — a live child between pg-boss backoffs CAN be parked (benign).
  ⚠ The single-column `recipient_version_id` FK stays deferred (RN8 (d)). ⚠ Roster Row 22 (d) must route the new park alarm (RN10).

### File List

- `.decision-log.md` — `2026-10-10-302` (governance commit `208772d9`)
- `_bmad-output/planning-artifacts/epics.md` — `### Story 6.29` (governance commit `0a3b643d`)
- `docs/launch-gate-inventory/inventory-roster.md` — Row 26 `jobs-db-role` (`0a3b643d`)
- `_bmad-output/implementation-artifacts/6-24b-filing-code-and-texts-to-the-nominee-in-place-at-the-death.md` — `⚠ AMENDED by -302` on RB3 / RB12; ROUND 3 defer marks (`0a3b643d`), flipped to "Closed by 6.29 / 0155 (`d61af613`)" in Task 6
- `_bmad-output/implementation-artifacts/deferred-work.md` — the 2026-10-09 jobs-login item → Row 26 (`0a3b643d`)
- `packages/domain/migrations/0155_claim-suspicion-notice-backstops.sql` — NEW
- `packages/domain/migrations/meta/_journal.json` — idx 155
- `packages/domain/src/schema/claim_suspicion_notices.ts`
- `packages/domain/src/claim/suspicion-notice.ts`
- `apps/jobs/src/scheduler/claim-suspicion-notices.ts`
- `packages/domain/tests/integration/rls/claim-suspicion-notice-policy-regression.spec.ts`
- `packages/domain/tests/integration/claim/suspicion-notice.spec.ts`
- `packages/domain/tests/integration/claim/suspicion-notice-concurrency.spec.ts`
- `apps/jobs/tests/claim-suspicion-notices-live.test.ts`
- `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` — RB8's no-decrypt arm narrowed to a decrypt CALL (6.25's form)
- `_bmad-output/implementation-artifacts/6-29-suspicion-notice-parity-and-jobs-login-grants.md` — this file
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — row 6-29 + ledger

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.2 | 2026-10-10 | ⭐ **Developed (`bmad-dev-story 6.29`) ⇒ `review`.** Governance FIRST: `-302` (RN1–RN10, *"Accept all recommended"*; one fresh-context check 0 / 0 / 4 M / 5 L, all applied) committed alone `208772d9`; records `0a3b643d` (epics, roster Row 26, AMENDED lines on 6.24b RB3 / RB12, defer marks, deferred-work → Row 26). Migration 0155 (:5432 + :5433 + scratch-from-zero); the builder + grammar; the stalled scopes, the scoped park, the give-up over un-held scopes by the credited anchor, the re-claim credit + RN7 lease re-check; the sweep reordered (holds → park → give-up) + the park alarm; every child detail built. Tests: policy 24, domain +11, concurrency +3, jobs live +15. Red-checks #1–#15 (all RED once planted; #8 first GREEN ⇒ a leg added). `ci:local` run 1 RED on ONE fence (RB8's bare-word `decrypt` vs the new `decrypt_failed:*` vocabulary) ⇒ narrowed to a decrypt CALL (6.25's form) ⇒ run 2 GREEN (34 jobs). |
| 1.1 | 2026-10-09 | Validated (one fresh-context read-only verifier against the checklist): 0 BLOCKER, 3 HIGH, 8 MEDIUM, 8 LOW — all applied. HIGH: RN2 now parks EVERY past-lease row of a held scope and the give-up judges a parked row by its CREDITED anchor (a daily sweep with alternating holds was otherwise unbounded, and candidate-only parking left ⛔ budget after a hold); RN5 makes the sanitiser's placement an explicit choice ((a) the shared RB4 core — would change 6.19b/c/d; (b) the suspicion child only — recommended); the sanitiser also refuses a 7+-digit run (a bare phone number passed). Also: "held" defined as the code's per-purpose / per-Pariwar derivation (⛔ global Secret Manager hold); `listStalledSuspicionNoticeScopes` named; RN7 marked DEFENSIVE (AC5 plants the refresh); policy-spec breakages listed; Task 1.1 also checks `attempting` rows with ⛔ `claimed_by_job`; closure marks written as "TO BE closed" at Task 0.4 and flipped in Task 6 (the 0151 defers have ⛔ `deferred-work.md` entry); RN8 (b) binds `twt_app` only; the INSERT column set listed; RB13's skip is SILENT (⛔ alarm to keep — ⛔ add one); name collisions; `<date>-302`; RN4 leg in AC7; Row 22 (d) routes the park alarm. |
| 1.0 | 2026-10-09 | Created (`bmad-create-story 6.29`) on `story/6-29-…` (first commit: the 6.25 SHA map, `6a223e7a`). Pinned `9f4d684a`. F1–F18 found; RN1–RN10 PROPOSED (author-commit owed at Task 0.3). Scope narrowed by BigDev to 0151 parity; the jobs DB role (F15–F18, systemic) recorded, ⛔ fixed. |
